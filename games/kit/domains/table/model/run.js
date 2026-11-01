// Running a table board: on one cell (the shared engine, ../../../engine/circuit.js, over the board as it is), over a
// whole test (the shared machine walk, ../../../engine/machine.js), and the signal types that say which wire fits.

import { Halt, evaluate as engineEvaluate } from '../../../engine/circuit.js';
import { sink } from '../../../engine/boards.js';
import { MAX_ROUNDS, walk } from '../../../engine/machine.js';
import { wouldCycle } from '../../../graph.js';
import { tr } from '../lang.js';
import { BUILT, def, isCard } from './parts.js';
import { picksOf, splitSrc } from './board.js';

/** What an unconnected input of this port type reads. */
const idle = type => (type.startsWith('bool') ? false : null);

/**
 * A sensor read inside a board: on a level's board from the robot (ctx.sense); inside a built part (a packed board,
 * course.js) from the part's port that stands for that sensor (ctx.bind, by ctx.ports).
 */
const read = (ctx, id) => (ctx.bind ? ctx.bind[ctx.ports?.[id]] ?? null : ctx.sense ? ctx.sense(id, 'self') : null);

const CARD = { inputs: [], outputs: node => picksOf(node), eval: (_, node, ctx, pick) => read(ctx, pick) };
const PORT = { inputs: [], eval: (_, node, ctx) => (ctx.bind ? ctx.bind[ctx.ports?.[node.id]] ?? null : null) };
const TAP = { inputs: [], eval: (_, node, ctx) => read(ctx, node.params.sensor) };
const OUT = sink();
const engineParts = new Map();
/** The engine's part for a node type. */
export function partOf(type) {
  if (isCard(type)) return CARD;
  if (type === 'port') return PORT;
  if (type === 'tap') return TAP;
  if (type === 'out') return OUT;
  const d = def(type);
  if (!d) return null;
  if (BUILT[type]) return BUILT[type].part;
  if (!engineParts.has(type)) {
    engineParts.set(type, {
      inputs: d.ins.map((_, k) => String(k)),
      params: d.params ?? [],
      idle: port => idle(d.ins[+port]),
      eval: (ins, node) => d.f(d.ins.map((_, k) => ins[k]), node),
    });
  }
  return engineParts.get(type);
}

/** Evaluate every output once. `sense(id, layer)` reads a sensor, lazily: only what is wired. `probe` collects every
 *  signal computed, by source, and each output as 'out:<id>'. A Halt from a sensor (a robot reading a cell not
 *  computed yet) stops it; a part that cannot compute is an error. */
export function evaluate(board, sense, outs, probe = {}) {
  const record = values => { for (const [src, v] of values) probe[src] = v; };
  let run;
  try {
    run = engineEvaluate(board, { parts: partOf, ctx: { sense }, targets: outs });
  } catch (e) {
    if (e instanceof Halt) record(e.values);
    throw e;
  }
  const { values, errors } = run;
  record(values);
  const out = {};
  for (const o of outs) { out[o] = values.get(o) ?? null; probe[`out:${o}`] = out[o]; }
  if (errors.size) throw new Error(`a part cannot compute: ${[...errors.keys()].join(', ')}`);
  return { out, probe };
}

/**
 * Run a board over one test: the engine's walk over the world's cells, the board run on each. Stops at the first read
 * of a cell that is not computed yet. With o.rounds the robot scans the table again and again until a whole round
 * changes nothing; a cell not computed yet then reads as 「—」 (or as its starting value), and each step records its
 * round and whether it changed the cell.
 */
export function runCircuit(V, t, board, o = {}) {
  const outs = V.outs.map(x => x[0]);
  return walk({
    order: V.order(t, o),
    keys: c => V.keys(t, c),
    base: V.base ? V.base(t, o) : [],
    rounds: !!o.rounds,
    answer: (table, steps) => V.answer(t, table, o, steps),
    step: (c, get) => {
      const probe = {};
      try {
        return evaluate(board, (id, layer) => V.read(t, c, id, get, o, layer), outs, probe);
      } catch (e) {
        if (e instanceof Halt) e.probe = probe;
        throw e;
      }
    },
  });
}
export { MAX_ROUNDS };

/* ---------- signal types ---------- */

const ACCEPTS = { num: ['num'], bool: ['bool'], cat: ['cat'], any: ['num', 'bool', 'cat'], 'num*': ['num', 'nums'], 'bool*': ['bool', 'bools'] };

/** The signal a source carries. io = { sensors, outs } of the world the board runs in. */
export function srcType(board, io, src, seen = new Set()) {
  if (seen.has(src)) return 'any';
  seen.add(src);
  const [id, pick] = splitSrc(src), n = board.nodes.find(x => x.id === id);
  if (!n) return 'any';
  if (isCard(n.type)) return io.sensors[pick]?.type ?? 'any';
  if (n.type === 'tap') return io.sensors[n.params.sensor]?.type ?? 'any';
  if (n.type === 'port') return 'num';
  const d = def(n.type), from = k => board.wires.find(w => w.to === id && w.port === String(k));
  if (typeof d.out === 'string' && d.out !== 'lift') return d.out;
  if (d.out && d.out.copy !== undefined) { const w = from(d.out.copy); return w ? srcType(board, io, w.from, seen) : 'any'; }
  return d.ins.some((_, k) => { const w = from(k); return w && srcType(board, io, w.from, seen).endsWith('s'); }) ? 'nums' : 'num';
}

/** What a port takes: a part's input type, or the world's type for an output. */
export function sinkType(board, io, to, port) {
  const n = board.nodes.find(x => x.id === to);
  if (n.type === 'out') return io.outs.find(o => o[0] === to)?.[3] || 'num';
  return def(n.type).ins[+port];
}

export const fits = (sink, src) => src === 'any' || ACCEPTS[sink].includes(src);

/** Why a wire from a source of type `src` cannot go into a sink of type `sink`. */
function misfit(sink, src) {
  if (src.endsWith('s')) return tr('一整段只能接进汇合器、加法器或乘法器。', 'A whole segment can only go into a Merger, an Adder or a Multiplier.');
  if (src === 'cat' || sink === 'cat') return tr('「颜色」这类信号只能接进闸门的数口。', 'A kind (a colour, say) can only go into a gate’s value input.');
  if (src === 'bool') return tr('「是 / 否」信号只能接到闸门的条件口、「任一是」或「取反」。', 'A “yes / no” signal can only go into a gate’s condition input, “any yes” or “Not”.');
  return sink.startsWith('bool') ? tr('这个口只接「是 / 否」信号，比如「是起点」。', 'This input only takes a “yes / no” signal, such as “is start”.') : tr('这两个口的信号对不上。', 'The signals at these two ends do not match.');
}

/** The first wire whose source does not fit its port, as a message; null when every wire fits. */
export function typeError(board, io) {
  for (const w of board.wires) {
    const sink = sinkType(board, io, w.to, w.port), src = srcType(board, io, w.from);
    if (!fits(sink, src)) return misfit(sink, src);
  }
  return null;
}

/** Why a wire from `from` into port `port` of `to` may not go on the board, or null when it may (it then replaces
 *  whatever that port had). */
export function refusal(board, io, from, to, port) {
  const edges = board.wires.filter(w => board.nodes.find(n => n.id === w.to)?.type !== 'out').map(w => [splitSrc(w.from)[0], w.to]);
  if (board.nodes.find(n => n.id === to)?.type !== 'out' && wouldCycle(edges, splitSrc(from)[0], to)) return tr('这样会绕成一个圈：元件要等自己算完，才能算自己。', 'That would make a loop: a component would have to wait for its own result before it could compute it.');
  return typeError({ ...board, wires: [...board.wires.filter(w => !(w.to === to && w.port === port)), { from, to, port }] }, io);
}
