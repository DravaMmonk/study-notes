// A table board, the same object everywhere: saved in progress, drawn by the shared circuit editor
// (../../../circuit), run by the shared engine (../../../engine/circuit.js), written as blueprint text in content.
//
//   { nodes: [{ id, type, params?, x?, y?, slot? }], wires: [{ from, to, port }] }
//
// The level gives every board its sources and sinks (parts.js CARDS): 视野 ('view') and 本格信息 ('facts') with the
// sensors they read in params.picks, a port input for each port of a part the level builds that reads no sensor, and
// an output node for each cell the robot writes (type 'out', its id the output's: 'cell'). Every other node is a part
// the player placed: a primitive or a built part (parts.js), its settings in params ({ value } for a constant). A
// wire runs from a source ('view#up', 'facts#start', a part's id) into a port: '0', '1', … of a part, 'in' of an output.
// x, y (the desktop board) and slot (the phone's grid) are layout only and never reach the engine.

import { parse } from '../../../circuit/text.js';
import { isCard, isGiven } from './parts.js';
import { tr } from '../lang.js';

export const blank = () => ({ nodes: [], wires: [] });
export const clone = b => JSON.parse(JSON.stringify(b));

/** A wire's source as [node id, sensor]: 'view#up' → ['view', 'up']; a part's output → ['m', null]. */
export const splitSrc = src => { const k = src.indexOf('#'); return k < 0 ? [src, null] : [src.slice(0, k), src.slice(k + 1)]; };
/** The sensors a card reads. */
export const picksOf = n => n?.params?.picks ?? [];
export const withPicks = (n, picks) => ({ ...n, params: { ...n.params, picks } });

/** The sensors the board's cards read. */
export const readsOf = b => b.nodes.filter(n => isCard(n.type)).flatMap(picksOf);
/** Whether the board reads sensor `id` and wires it on. */
export const usesSensor = (b, id) => b.wires.some(w => splitSrc(w.from)[1] === id && isCard(b.nodes.find(n => n.id === splitSrc(w.from)[0])?.type));
/** The parts of a type on the board (with this value, when one is given). */
export const partsOfType = (b, type, value) => b.nodes.filter(n => n.type === type && (value === undefined || n.params?.value === value));
/** The parts the player placed. */
export const placed = b => b.nodes.filter(n => !isGiven(n.type));

/**
 * What a stage's board is given (course.js stages): the cards with what they may read ({ view: [sensor], facts:
 * [sensor] }; a card with nothing to offer is left off), the port inputs of the part it builds ([id]) and the world's
 * outputs ([id]).
 */
export const givenOf = ({ offers, inputs = [], outs }) => [
  ...['view', 'facts'].filter(card => offers[card].length).map(card => ({ id: card, type: card })),
  ...inputs.map(id => ({ id, type: 'port' })),
  ...outs.map(id => ({ id, type: 'out' })),
];

/**
 * The board fitted to what its stage gives: each given node there once (keeping where it sat), no given node the stage
 * lacks, each sensor read on the card that offers it (in the order the card offers them, its wires moving with it),
 * none the stage does not offer, and no wire to or from something gone.
 */
export function fitted(b, given) {
  const want = givenOf(given);
  const old = new Map(b.nodes.map(n => [n.id, n]));
  const offers = given.offers;
  const read = new Set(b.nodes.filter(n => isCard(n.type)).flatMap(picksOf));
  const cardFor = pick => ['view', 'facts'].find(card => offers[card].includes(pick));
  const nodes = [
    ...want.map(g => {
      const had = old.get(g.id);
      const keep = had && had.type === g.type ? { ...had } : { ...g };
      return isCard(g.type) ? withPicks(keep, offers[g.type].filter(p => read.has(p))) : keep;
    }),
    ...b.nodes.filter(n => !isGiven(n.type)),
  ];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const wires = b.wires.map(w => {
    const [from, pick] = splitSrc(w.from);
    return isCard(old.get(from)?.type) && cardFor(pick) ? { ...w, from: `${cardFor(pick)}#${pick}` } : w;
  }).filter(w => {
    const [from, pick] = splitSrc(w.from), src = byId.get(from);
    return src && byId.has(w.to) && (!isCard(src.type) || picksOf(src).includes(pick));
  });
  return { ...b, nodes, wires };
}

/**
 * Why a board cannot become the part its level builds: it must read exactly the part's ports, each sensor and port
 * input once, so the part does what the board did. `ports` as a stage has them (course.js). null when it can.
 */
export function portsProblem(board, ports) {
  const want = new Set(ports.map(p => p.sensor ?? p.input));
  const read = new Set(board.wires.map(w => splitSrc(w.from)).filter(([id]) => isCard(board.nodes.find(n => n.id === id)?.type)).map(([, pick]) => pick));
  for (const w of board.wires) if (board.nodes.find(n => n.id === w.from)?.type === 'port') read.add(w.from);
  const extra = [...read].filter(x => !want.has(x)), missing = [...want].filter(x => !read.has(x));
  const name = id => String(ports.find(p => (p.sensor ?? p.input) === id)?.label ?? id);
  if (extra.length) return tr(`这块电路板要做成元件，它的输入只能是元件的口；它还读了：${extra.join('、')}。`, `This board becomes a part, so it may read only the part’s ports; it also reads: ${extra.join(', ')}.`);
  if (missing.length) return tr(`这块电路板要做成元件，元件的每个口都要接进电路；还没接的：${missing.map(name).join('、')}。`, `This board becomes a part, so every port of the part must be wired in; not yet: ${missing.map(name).join(', ')}.`);
  return null;
}

/** The board without a node and its wires. */
export const removeNode = (b, id) => ({ ...b, nodes: b.nodes.filter(n => n.id !== id), wires: b.wires.filter(w => splitSrc(w.from)[0] !== id && w.to !== id) });

/**
 * Phone slots on a two-column board: every placed part keeps its slot while that slot is free; the rest take the first
 * free slots in the order they were added. The board always ends with an empty row. Given nodes take no slot.
 */
export function placement(b) {
  const cell = {}, used = new Set(), parts = placed(b);
  parts.forEach(n => { const a = n.slot; if (Number.isInteger(a) && a >= 0 && !used.has(a)) { cell[n.id] = a; used.add(a); } });
  parts.forEach(n => { if (cell[n.id] === undefined) { let a = 0; while (used.has(a)) a++; cell[n.id] = a; used.add(a); } });
  const even = v => v + (v % 2), size = even(Math.max(-1, ...used) + 1) + 2;
  return { cell, size, free: Array.from({ length: size }, (_, a) => a).filter(a => !used.has(a)) };
}

/* ---------- as blueprint text (../../../circuit/text.js) ---------- */

const WORD = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const name = s => (WORD.test(s) && !['true', 'false', 'null', '_'].includes(s) ? s : JSON.stringify(s));
const source = from => { const [id, pick] = splitSrc(from); return pick === null ? name(id) : `${name(id)}.${name(pick)}`; };
const setting = v => (typeof v === 'string' ? name(v) : Array.isArray(v) ? `[${v.map(setting).join(', ')}]` : JSON.stringify(v));

/**
 * A board as blueprint lines (content writes reference boards this way): each placed part in an order where it comes
 * after what it reads, `id = type[settings](its inputs in order, _ for an open one)`; then the wires into the outputs,
 * `cell <- m`. A card's picks are not written: they are what is wired from it.
 */
export function toText(b) {
  const parts = placed(b), into = id => b.wires.filter(w => w.to === id), done = new Set(b.nodes.filter(n => isGiven(n.type)).map(n => n.id)), lines = [];
  while (lines.length < parts.length) {
    const ready = parts.filter(n => !done.has(n.id) && into(n.id).every(w => done.has(splitSrc(w.from)[0])));
    for (const n of ready.length ? ready : parts.filter(x => !done.has(x.id)).slice(0, 1)) {
      const ins = new Map(into(n.id).map(w => [Number(w.port), w.from])), last = Math.max(-1, ...ins.keys());
      const args = Array.from({ length: last + 1 }, (_, k) => (ins.has(k) ? source(ins.get(k)) : '_'));
      const set = Object.entries(n.params ?? {}).map(([k, v]) => `${name(k)}=${setting(v)}`);
      lines.push(`${name(n.id)} = ${name(n.type)}${set.length ? `[${set.join(', ')}]` : ''}(${args.join(', ')})`);
      done.add(n.id);
    }
  }
  const ids = new Set(parts.map(n => n.id));
  for (const w of b.wires.filter(x => !ids.has(x.to))) lines.push(`${name(w.to)} <- ${source(w.from)}`);
  return lines;
}

/**
 * The board blueprint lines describe, on what its stage gives (`given`, as for fitted): a statement with a type is a
 * part (its settings its params, its inputs by position); a wire into a given node is written `cell <- m`. Each card
 * reads the sensors wired from it (and any it names: `view[picks=[up]]()`). Throws a { line, zh, en } on text it cannot
 * read or a source it does not know.
 */
export function fromText(lines, given) {
  const { statements, wires } = parse(lines.join('\n'));
  const nodes = givenOf(given).map(n => (isCard(n.type) ? withPicks(n, []) : n));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const fail = (line, zh, en) => { throw { line, zh: `第 ${line} 行：${zh}`, en: `Line ${line}: ${en}` }; };
  for (const st of statements) {
    if (st.type === undefined) {
      const card = byId.get(st.id);
      if (!card || !isCard(card.type)) fail(st.line, `「${st.id}」不是这一关给的输入元件。`, `“${st.id}” is no input card of this level.`);
      if (st.settings.picks) card.params.picks = [...st.settings.picks];
      continue;
    }
    if (byId.has(st.id)) fail(st.line, `「${st.id}」写了两次。`, `“${st.id}” is written twice.`);
    const node = { id: st.id, type: st.type, ...(Object.keys(st.settings).length ? { params: { ...st.settings } } : {}) };
    nodes.push(node);
    byId.set(st.id, node);
  }
  const out = [];
  for (const w of wires) {
    const [from, pick] = splitSrc(w.from), src = byId.get(from), to = byId.get(w.to);
    if (!src) fail(w.line, `没有叫「${from}」的元件。`, `There is no node called “${from}”.`);
    if (!to) fail(w.line, `没有叫「${w.to}」的元件。`, `There is no node called “${w.to}”.`);
    if (isCard(src.type)) {
      if (!given.offers[src.type].includes(pick)) fail(w.line, `「${from}」读不到「${pick}」。`, `“${from}” cannot read “${pick}”.`);
      if (!picksOf(src).includes(pick)) src.params.picks = [...picksOf(src), pick];
    }
    out.push({ from: w.from, to: w.to, port: to.type === 'out' ? 'in' : String(w.port) });
  }
  for (const n of nodes) if (isCard(n.type)) n.params.picks = given.offers[n.type].filter(p => picksOf(n).includes(p));
  return { nodes, wires: out };
}
