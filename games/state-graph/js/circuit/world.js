// Worlds the circuit runs in. A world walks its table cell by cell; on each cell the robot reads inputs,
// runs the circuit, and writes the circuit's outputs back into the table.
//
// Every world lays its table out on a board (rows × columns, one board per layer). The robot stands at
// here(cell) and any board cell within reach can be lit as an input, so most inputs are just offsets.
//
// World interface (built with world()):
//   taps: { id: { label, short, type, icon?, off? } }   off = [layer, dr, dc] for a cell near the robot
//   cellType?: 'bool' when the table holds 是 / 否 rather than numbers (the cell taps and the outputs follow it)
//   facts: tap ids that describe the robot's own cell   armTaps?: taps read by the telescopic arm
//   shown?(L, dr, dc) → true for an offset the robot sees but cannot light (e.g. a fact drawn on the board)
//   outs: [[id, label, [layer, dr, dc]]]               the cells the robot writes
//   here(t, cell) → [[r, c] per layer]   keyAt(t, layer, r, c) → table key | null   mark?(t, key) → { corner, cls }
//   fact(t, cell, id, get, o) → value of a non-offset tap
//   arm?(t, cell, o) → { label, cells: [{ tap, key, label }] } for a telescopic arm, or { label, sweeps: [{ tap, label,
//     cells: [{ key, label, out? }] }], filters? } for a sweeping arm, whose taps read the swept cells as one segment
//   base(t, o) → [[key, value]]   order(t, o) → [cell]   keys(t, cell) → { outId: key }
//   answer(t, table, o)   where(cell) / name(key) / label(t) / orderText(o)   inspect?: false when cells cannot be tapped
//   sample(t, o) → cell   where the robot waits before a run   cellOf(t, key, o) → cell the robot can stand on
//   scene(t, view, o) → board scene (with `robot` on the cell being computed)
// o: the stage's options plus the player's settings: dirs, scan (a scan-order dial), filter (the sweeping arm's filter),
//   rounds (scan again and again until the table stops changing).

import { E } from '../svg.js';
import { signal } from '../util.js';
import { evaluate } from './components.js';

export const cell = (label, short, off, type = 'num') => ({ label, short, type, off });
export const num = (label, short, icon) => ({ label, short, type: 'num', icon });
export const yes = (label, short, icon) => ({ label, short, type: 'bool', icon });
export const seg = (label, short, type = 'nums') => ({ label, short, type });

/** How far any robot can see; a robot's vision (1 or 2) picks the taps it can use. */
const REACH = 2;
const RING = { '-1,-1': ['左上', '左上', '↖'], '-1,0': ['上面', '上', '↑'], '-1,1': ['右上', '右上', '↗'], '0,-1': ['左边', '左', '←'], '0,1': ['右边', '右', '→'], '1,-1': ['左下', '左下', '↙'], '1,0': ['下面', '下', '↓'], '1,1': ['右下', '右下', '↘'] };
function dirName(dr, dc) {
  if (RING[`${dr},${dc}`]) return RING[`${dr},${dc}`];
  const v = dr ? `${dr < 0 ? '上' : '下'}${Math.abs(dr)}` : '', h = dc ? `${dc < 0 ? '左' : '右'}${Math.abs(dc)}` : '';
  return [v + h, v + h, v + h];
}

/** Complete a world: one tap for every board cell within REACH of the robot that the world has not named. */
export function world(def) {
  const layers = def.layers || [''], type = def.cellType || 'num', tapAt = {}, outAt = new Set(def.outs.map(o => o[2].join(',')));
  const taps = Object.fromEntries(Object.entries(def.taps).map(([id, m]) => [id, m.off ? { ...m, type } : m]));
  const outs = def.outs.map(([id, label, off]) => [id, label, off, type]);
  Object.entries(def.taps).forEach(([id, m]) => { if (m.off) tapAt[m.off.join(',')] = id; });
  layers.forEach((ln, L) => {
    for (let dr = -REACH; dr <= REACH; dr++) for (let dc = -REACH; dc <= REACH; dc++) {
      const k = `${L},${dr},${dc}`;
      if (tapAt[k] || outAt.has(k) || (!dr && !dc) || (def.shown && def.shown(L, dr, dc))) continue;
      const [label, short, arrow] = dirName(dr, dc);
      taps[`o${L}_${dr}_${dc}`] = layers.length > 1 ? cell(`${ln}·${label}`, ln[0] + arrow, [L, dr, dc], type) : cell(label, short, [L, dr, dc], type);
      tapAt[k] = `o${L}_${dr}_${dc}`;
    }
  });
  /** The robot's cell for a board cell the player tapped, or null when the robot cannot stand there. */
  const cellOf = (t, key, o) => def.order(t, o).find(c => Object.values(def.keys(t, c)).includes(key)) || null;
  return { cellOf, ...def, layers, taps, tapAt, outs };
}

/** Taps a robot with this vision can light: the cells it sees, in board order. */
export const visibleTaps = (V, vision) => Object.keys(V.taps).filter(id => { const o = V.taps[id].off; return o && Math.abs(o[1]) <= vision && Math.abs(o[2]) <= vision; });

/** Read one tap on one cell. `get(key)` reads the table (and throws on a cell not computed yet). */
export function readTap(V, t, c, id, get, o = {}) {
  const m = V.taps[id];
  if (!m.off) return V.fact(t, c, id, get, o);
  const [L, dr, dc] = m.off, [r, col] = V.here(t, c)[L], key = V.keyAt(t, L, r + dr, col + dc);
  return key === null ? null : get(key);
}

/** The robot's window: (2·vision + 1)² board cells around it, one window per layer, plus the arm's cells. */
export function windowOf(V, t, c, vision, o = {}) {
  const n = 2 * vision + 1;
  const wins = V.here(t, c).map(([r, col], L) => {
    const cells = [];
    for (let dr = -vision; dr <= vision; dr++) for (let dc = -vision; dc <= vision; dc++) {
      const key = V.keyAt(t, L, r + dr, col + dc), out = V.outs.find(o => o[2].join(',') === `${L},${dr},${dc}`);
      cells.push({ r: dr + vision, c: dc + vision, key, tap: V.tapAt[`${L},${dr},${dc}`] || null, out: out ? out[0] : null, ...(key !== null && V.mark ? V.mark(t, key) : {}) });
    }
    return { label: V.layers.length > 1 ? V.layers[L] : '', n, cells };
  });
  return { wins, arm: V.arm ? V.arm(t, c, o) : null };
}

/** How many times a scan may repeat before the table counts as never settling. */
export const MAX_ROUNDS = 50;

/**
 * Run a circuit over one test. Stops at the first read of a cell that is not computed yet.
 * With o.rounds the robot scans the table again and again until a whole round changes nothing; a cell not computed
 * yet then reads as 「—」 (or as its starting value), and each step records its round and whether it changed the cell.
 */
export function runCircuit(V, t, circ, o = {}) {
  const base = V.base ? V.base(t, o) : [], table = new Map(base), steps = [], outs = V.outs.map(x => x[0]);
  for (let round = 1; round <= (o.rounds ? MAX_ROUNDS : 1); round++) {
    let moved = false;
    for (const c of V.order(t, o)) {
      const keys = V.keys(t, c), at = Object.values(keys), reads = [], probe = {};
      const get = key => { reads.push(key); if (table.has(key)) return table.get(key); if (o.rounds) return null; throw { empty: key }; };
      try {
        const { out } = evaluate(circ, id => readTap(V, t, c, id, get, o), outs, probe);
        const writes = Object.entries(keys).map(([id, key]) => [key, out[id]]);
        const changed = writes.some(([key, v]) => !table.has(key) || table.get(key) !== v);
        writes.forEach(([key, v]) => table.set(key, v));
        moved = moved || changed;
        steps.push({ cell: c, at, reads, probe, writes, round, changed });
      } catch (e) {
        if (!e || e.empty === undefined) throw e;
        steps.push({ cell: c, at, reads, probe, empty: e.empty, round });
        return { error: { cell: c, key: e.empty }, steps, base, table };
      }
    }
    if (o.rounds && !moved) return { value: V.answer(t, table, o), steps, base, table, rounds: round };
  }
  if (o.rounds) return { error: { diverge: true }, value: V.answer(t, table, o), steps, base, table, rounds: MAX_ROUNDS };
  return { value: V.answer(t, table, o), steps, base, table };
}

/* ---------- board marking shared by every world ---------- */

/**
 * view = { res, k, end, halt, pass, focus }: k steps are shown; `halt` marks a stop at a wrong step;
 * `focus` is a step the player tapped to inspect after the run.
 * bench (no view): the board as a sandbox = { cell, at, shown, reads, empty, typed, sel } — the robot stands on `cell`,
 * `shown` holds the typed numbers plus the robot's live output; `empty` are read cells that hold nothing.
 */
export function look(view, answerKeys, base = [], bench = null) {
  if (!view && !bench) {
    const shown = new Map(base);
    return { shown, act: null, robot: null, reads: new Set(), cls: key => (shown.has(key) ? 'lit' : ''), val: key => (shown.has(key) ? signal(shown.get(key)) : ''), arrows: () => [], tap: () => false };
  }
  let shown, act, actCls, done = false, last = null;
  const chg = new Set();
  if (view) {
    const { res, k } = view, focused = view.focus !== null && view.focus !== undefined;
    shown = new Map(res.base);
    res.steps.slice(0, k).forEach(s => (s.writes || []).forEach(([key, v]) => shown.set(key, v)));
    const ai = focused ? view.focus : view.halt || !view.end ? k - 1 : -1;
    act = ai >= 0 ? res.steps[ai] : null;
    last = res.steps[k - 1];
    actCls = focused ? 'sel' : view.halt ? 'bad' : 'hot';
    done = view.end && !view.halt;
    // Scanning in rounds: the cells this round has changed so far.
    if (last && last.round && !view.end) res.steps.slice(0, k).forEach(s => { if (s.round === last.round && s.changed) s.at.forEach(a => chg.add(a)); });
  } else {
    shown = bench.shown;
    act = { cell: bench.cell, at: bench.at, reads: [...bench.reads], empty: null };
    actCls = 'self';
  }
  const reads = new Set(act ? act.reads : []), bad = key => (act && act.empty === key) || (bench && bench.empty.has(key));
  return {
    shown, act, reads, robot: act ? act.at[0] : last ? last.at[0] : null,
    val: key => (shown.has(key) ? signal(shown.get(key)) : ''),
    cls(key) {
      const on = act && act.at.includes(key);
      const v = shown.get(key), yn = typeof v === 'boolean' && !on ? (v ? 'yes' : 'no') : '';
      return [on ? actCls : '', reads.has(key) ? (bad(key) ? 'bad' : 'pred') : '', shown.has(key) && !on ? 'lit' : '', yn, chg.has(key) && !on ? 'chg' : '', view && view.badKey === key ? 'bad' : '', done && answerKeys.includes(key) ? (view.pass ? 'ok' : 'bad') : '', bench && bench.typed.has(key) ? 'typed' : '', bench && bench.sel === key ? 'sel' : ''].filter(Boolean).join(' ');
    },
    /** Arrows from every cell read in the focused step to the cell it fed. */
    arrows(to = () => act.at[0], bend = () => 0) {
      if (!act) return [];
      return [...reads].filter(r => !act.at.includes(r)).map(r => E(r, to(r), bad(r) ? 'bad' : actCls === 'sel' ? 'sel' : 'hot', bend(r)));
    },
    /** Cells can be tapped to inspect after a run, or to edit while the board is a sandbox. */
    tap: key => (view ? inspectable(view, key) : true),
  };
}
const inspectable = (view, key) => !!view && view.end && view.res.steps.some(s => s.at.includes(key));
