// The engine's side of the circuit board, and the robot's window. The board itself is the shared circuit editor
// (../../../kit/circuit, through board.js); these keep the engine's rules (wires and their types, slots) and draw
// what the robot reads: its view, the facts about its own cell, its arm.
// Port ids: sources are '<nodeId>', a reader's '<nodeId>#<sensor>' or a sensor wired straight in, 'tap:<id>'; sinks
// are '<nodeId>:<k>' or 'out:<id>'.

import { typeError, picksOf, splitSrc, isInput, layerOf, hasValue, valueDefault } from './components.js';
import { wouldCycle } from '../../../graph.js';
import { ICONS } from './glyphs.js';
import { tr } from '../i18n.js';
import { markIcon, markOf } from '../svg.js';

export const isSink = p => p.startsWith('out:') || (!p.startsWith('tap:') && p.includes(':'));
const nodeOf = p => p.split(':')[0];
const HUES = 6; // read sensors take the theme tokens --w0…--w5, in level order (board.js colours readers the same)
const iconSVG = kind => `<svg class="glyph" viewBox="0 0 48 32" aria-hidden="true">${ICONS[kind]}</svg>`;

/** Try to wire two ports in either order. Returns { circ } on success, { same } for two ports on one side, or { msg }. */
export function connect(circ, io, a, b) {
  if (isSink(a) === isSink(b)) return { same: true };
  const [from, to] = isSink(a) ? [b, a] : [a, b];
  const edges = circ.wires.filter(w => !w.to.startsWith('out:')).map(w => [splitSrc(w.from)[0], nodeOf(w.to)]);
  if (!to.startsWith('out:') && wouldCycle(edges, splitSrc(from)[0], nodeOf(to))) return { msg: tr('这样会绕成一个圈：元件要等自己算完，才能算自己。', 'That would make a loop: a component would have to wait for its own result before it could compute it.') };
  const next = { ...circ, wires: [...circ.wires.filter(w => w.to !== to), { from, to }] }, msg = typeError(next, io);
  return msg ? { msg } : { circ: next };
}

/** The sensors the circuit's readers read on the robot's own layer (what the robot's view marks as read). */
export const readsOf = circ => [...new Set(circ.nodes.filter(n => isInput(n.kind) && layerOf(n) === 'self').flatMap(picksOf))];

/** Sensors wired straight in: the ones a bench lit, plus any that already carries a wire. */
export const litOf = circ => [...new Set([...(circ.lit || []), ...circ.wires.filter(w => w.from.startsWith('tap:')).map(w => w.from.slice(4))])];

/**
 * Component slots on a two-column board: every component keeps its saved slot (circ.at) while that slot is free;
 * the rest take the first free slots in the order they were added. The board always ends with an empty row. The
 * input cards take no slot: they stand above the board (as kit/circuit/model.js placement has it).
 */
export function placement(circ) {
  const cell = {}, used = new Set(), at = circ.at || {}, parts = circ.nodes.filter(n => !isInput(n.kind));
  parts.forEach(n => { const a = at[n.id]; if (Number.isInteger(a) && a >= 0 && !used.has(a)) { cell[n.id] = a; used.add(a); } });
  parts.forEach(n => { if (cell[n.id] === undefined) { let a = 0; while (used.has(a)) a++; cell[n.id] = a; used.add(a); } });
  const even = v => v + (v % 2), size = even(Math.max(-1, ...used) + 1) + 2;
  return { cell, size, free: Array.from({ length: size }, (_, a) => a).filter(a => !used.has(a)) };
}

export function placeNode(circ, kind, at, value) {
  // Presets may name their components freely ('m', 'b1'…); new ones are n1, n2… after the highest n-number.
  const id = `n${Math.max(0, ...circ.nodes.map(n => /^n(\d+)$/.exec(n.id)).filter(Boolean).map(m => +m[1])) + 1}`;
  return { ...circ, nodes: [...circ.nodes, { id, kind, ...(hasValue(kind) ? { value: valueDefault(kind) } : value !== undefined ? { value } : {}) }], at: { ...placement(circ).cell, [id]: at } };
}

export function removeNode(circ, id) {
  const at = { ...placement(circ).cell };
  delete at[id];
  return { ...circ, nodes: circ.nodes.filter(n => n.id !== id), wires: circ.wires.filter(w => splitSrc(w.from)[0] !== id && nodeOf(w.to) !== id), at };
}

/** A read sensor's colour: one palette, in level order. */
const sourceColor = (ui, src) => `var(--w${ui.avail.filter(id => ui.lit.includes(id)).indexOf(src.slice(4)) % HUES})`;

/**
 * What the robot reads: the board around it, the facts about its own cell, its arm. A sensor the circuit reads
 * (ui.lit) is marked; the robot's own cell is framed red. Values follow the test board or the run. It only shows.
 * ui = { sensors, avail, lit, win: { robot, wins: [{ label, n, cells }], arm, facts }, pickable? } — with `pickable`,
 * whatever the robot can read is a button that adds or removes its output on the input card. `part` draws one card's
 * share alone (on a phone, inside that card): 'view' the window and the arm, 'facts' the cell's facts.
 */
export function viewHTML(circ, ui, part = null) {
  const lit = ui.lit, w = ui.win, vision = (w.wins[0].n - 1) / 2;
  const tag = id => `<span class="tag" style="--c:${sourceColor(ui, `tap:${id}`)}">${ui.sensors[id].short}</span>`;
  const cellHTML = (x, opts = {}) => {
    const can = !!x.sensor && ui.avail.includes(x.sensor), on = can && lit.includes(x.sensor);
    // World marks (key, door, rock…) and read states get a v- prefix, so page-wide rules such as the keypad's .key or
    // the empty-state .empty never reach a cell.
    const cls = ['vcell', ...String(x.cls || '').split(' ').filter(Boolean).map(c => `v-${c}`), x.key === null ? 'off' : '', on ? 'on' : '', x.out ? 'self' : '', x.state && `v-${x.state}`].filter(Boolean).join(' ');
    // A special cell (start, end, a key, a door…) carries its icon in the corner, like on the test board; the value
    // stays where every other cell has it.
    const mk = x.key !== null && markOf(x), corner = mk && !x.mark ? '' : x.corner;
    const v = x.key === null ? tr('界外', 'out') : x.value, inner = `${mk ? markIcon(mk) : ''}${corner !== '' && corner !== undefined && corner !== null && x.key !== null ? `<span class="vc">${corner}</span>` : ''}<span class="vv${String(v).length > 4 ? ' long' : ''}">${v}</span>${on ? tag(x.sensor) : ''}${opts.bot ? `<svg class="vbot" viewBox="0 0 32 32" aria-hidden="true">${w.robot.look}</svg>` : ''}${opts.label ? `<span class="vl">${opts.label}</span>` : ''}`;
    const style = opts.area ? ` style="grid-area:${opts.area}"` : '';
    // With `ui.pickable`, a cell the robot can read is a button: clicking it adds or removes its output on 视野.
    return ui.pickable && can
      ? `<button class="${cls} can" type="button" data-act="pick" data-v="${x.sensor}"${style} aria-pressed="${on}" title="${ui.sensors[x.sensor].label}">${inner}</button>`
      : `<span class="${cls}"${style}>${inner}</span>`;
  };
  const wins = w.wins.map((win, k) => `<div class="vblock">${win.label ? `<span class="vsub">${win.label}</span>` : ''}
    <div class="vwin n${win.n}">${win.cells.map(x => cellHTML(x, { area: `${x.r + 1}/${x.c + 1}`, bot: !k && x.r === vision && x.c === vision })).join('')}</div></div>`).join('');
  const arm = !w.arm ? '' : w.arm.sweeps ? sweepHTML(w.arm, ui, lit, tag) : `<div class="varm"><span class="vsub">${w.robot.armName} · ${w.arm.label}</span><div class="varm-row">${w.arm.cells.map(x => cellHTML(x, { label: x.label })).join('')}</div></div>`;
  // With `ui.pickable` a fact is a button too: clicking it adds or removes its output on 本格信息.
  const facts = w.facts.map(f => {
    const m = ui.sensors[f.id], on = lit.includes(f.id), inner = `${iconSVG(m.icon)}<span>${m.label}</span><span class="vv">${f.value}</span>${on ? tag(f.id) : ''}`;
    return ui.pickable
      ? `<button class="vfact${on ? ' on' : ''}" type="button" data-act="pick" data-v="${f.id}" aria-pressed="${on}">${inner}</button>`
      : `<span class="vfact${on ? ' on' : ''}">${inner}</span>`;
  }).join('');
  // The robot's window and the cell's facts side by side (both are tapped to light inputs), then the arm under them on
  // a phone and beside them in the strip under the board on a desktop.
  const factsHTML = facts ? `<div class="vpart vfacts"><span class="vsub">${tr('本格信息', 'This cell')}</span>${facts}</div>` : '';
  if (part === 'view') return `<div class="vpart vmain"><div class="vwins">${wins}</div></div>${arm ? `<div class="vpart vextra">${arm}</div>` : ''}`;
  if (part === 'facts') return `<div class="vpart vfacts">${facts}</div>`;
  return `<div class="vtop${facts ? ' has-facts' : ''}"><div class="vpart vmain"><div class="vwins">${wins}</div></div>${factsHTML}</div>${arm ? `<div class="vpart vextra">${arm}</div>` : ''}`;
}

/**
 * A sweeping arm: each sweep is one sensor, the whole strip of cells it passes over (dimmed where the level's filter
 * drops a cell).
 */
function sweepHTML(arm, ui, lit, tag) {
  const strip = sw => (sw.cells.length ? sw.cells.map(x => `<span class="vcell sm${x.out ? ' v-out' : ''}${x.state ? ` v-${x.state}` : ''}">${x.mark ? markIcon(x.mark) : ''}${x.label !== undefined ? `<span class="vc">${x.label}</span>` : ''}<span class="vv">${x.value}</span></span>`).join('') : `<em class="vnone">${tr('一格也没有', 'no cells at all')}</em>`);
  const sweeps = arm.sweeps.map(sw => {
    const can = ui.avail.includes(sw.sensor), on = can && lit.includes(sw.sensor), body = `<span class="vsl">${sw.label}</span><span class="vstrip">${strip(sw)}</span>${on ? tag(sw.sensor) : ''}`;
    return ui.pickable && can ? `<button class="vsweep${on ? ' on' : ''}" type="button" data-act="pick" data-v="${sw.sensor}" aria-pressed="${on}">${body}</button>` : `<span class="vsweep${on ? ' on' : ''}">${body}</span>`;
  }).join('');
  return `<div class="varm sweeps"><span class="vsub">${tr('扫描臂', 'Sweep arm')} · ${arm.label}</span>${sweeps}</div>`;
}
