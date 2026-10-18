// Worlds the circuit runs in. A world walks its table cell by cell; on each cell the robot reads its sensors,
// runs the circuit, and writes the circuit's outputs back into the table.
//
// Sensors are everything the robot can read on a cell, one value each (the kit's sensor shape, kit/circuit/sensors.js).
// A world names them in `sensors` ({ id: { label, short, type, icon?, off? } }) and world() completes them to
// { id, label, type, family, short, icon?, at?, cats? }:
//   family 'view'  a board cell near the robot, at = [dr, dc]; every cell within REACH has one (named or not)
//          'here'  a fact about the robot's own cell (num(), yes(), cat())
//          'arm'   what the robot's arm brings in (listed in armSensors; seg() for a whole segment)
//   type   'num' | 'bool' | 'nums' | 'bools' | 'cat' (one of `cats`: [[value, label]], say a key's colour)
// The circuit reads sensors through reader parts (components.js); a level offers some of them (its facts, the robot's
// vision and arm). W.read(t, cell, id, get, o, layer) reads one; on a table the player stacks in layers (`layered`),
// a view sensor can be read on another layer too (layer: 'self' or a layer number).
//
// World interface (built with world()):
//   sensors, armSensors?, facts: the 'here' sensors a level offers by default
//   cellType?: 'bool' when the table holds 是 / 否 rather than numbers (the view sensors and the outputs follow it)
//   shown?(L, dr, dc) → true for an offset the robot sees but cannot read (e.g. a fact drawn on the board)
//   outs: [[id, label, [layer, dr, dc] | null]]        the cells the robot writes (null: an output that writes no cell,
//                                                      read by answer(t, table, o, steps) from the steps' `out`)
//   here(t, cell) → [r, c] on the board   keyAt(t, r, c, cell) → table key | null   mark?(t, key) → { corner, cls }
//   view?(t, cell, layer, dr, dc, get, o) → a board cell on any layer, for a layered world
//   sense(t, cell, id, get, o) → value of a 'here' or 'arm' sensor
//   winLabel?(t, cell) → a caption for the robot's window (e.g. which layer it stands on)
//   arm?(t, cell, o) → { label, cells: [{ sensor, key, label }] } for a telescopic arm, or { label, sweeps: [{ sensor,
//     label, cells: [{ key, label, out? }] }] } for a sweeping arm, whose sensor reads the swept cells as one segment
//   base(t, o) → [[key, value]]   order(t, o) → [cell]   keys(t, cell) → { outId: key }
//   answer(t, table, o)   where(cell) / name(key) / label(t) / orderText(o)   inspect?: false when cells cannot be tapped
//   sample(t, o) → cell   where the robot waits before a run   cellOf(t, key, o) → cell the robot can stand on
//   scene(t, view, o) → board scene (with `robot` on the cell being computed)
// o: the stage's options plus the player's settings: dirs, scan (a scan-order dial), filter (the sweeping arm's filter),
//   rounds (scan again and again until the table stops changing), layers (how many a layered table has).

import { E } from '../svg.js';
import { T } from '../i18n.js';
import { signal } from '../util.js';
import { evaluate } from './components.js';
import { sensor } from '../../../kit/circuit/sensors.js';

/** A board cell near the robot (off = [dr, dc]), a number or yes / no about its own cell, a whole segment, a category. */
export const cell = (label, short, off, type = 'num') => ({ label, short, type, off });
export const num = (label, short, icon) => ({ label, short, type: 'num', icon });
export const yes = (label, short, icon) => ({ label, short, type: 'bool', icon });
export const seg = (label, short, type = 'nums') => ({ label, short, type });
export const cat = (label, short, cats, icon) => ({ label, short, type: 'cat', cats, icon });

/** How far any robot can see; a robot's vision (1 or 2) picks the view sensors it can use. */
const REACH = 2;
/** Names of the cells around the robot: [label, short tag]; the tag, an output's name on a card, is an arrow. */
export const DIR = {
  ul: [T('左上', 'up-left'), '↖'], up: [T('上面', 'up'), '↑'], ur: [T('右上', 'up-right'), '↗'], left: [T('左边', 'left'), '←'],
  right: [T('右边', 'right'), '→'], dl: [T('左下', 'down-left'), '↙'], down: [T('下面', 'down'), '↓'], dr: [T('右下', 'down-right'), '↘'],
};
/** The robot's own cell, as an output label. */
export const THIS_CELL = T('本格', 'this cell');
const RING = { '-1,-1': DIR.ul, '-1,0': DIR.up, '-1,1': DIR.ur, '0,-1': DIR.left, '0,1': DIR.right, '1,-1': DIR.dl, '1,0': DIR.down, '1,1': DIR.dr, '0,0': [THIS_CELL, THIS_CELL] };
function dirName(dr, dc) {
  if (RING[`${dr},${dc}`]) return RING[`${dr},${dc}`];
  const v = dr ? `${dr < 0 ? '上' : '下'}${Math.abs(dr)}` : '', h = dc ? `${dc < 0 ? '左' : '右'}${Math.abs(dc)}` : '';
  const ve = dr ? `${dr < 0 ? 'up' : 'down'} ${Math.abs(dr)}` : '', he = dc ? `${dc < 0 ? 'left' : 'right'} ${Math.abs(dc)}` : '';
  const arrows = `${dr ? `${dr < 0 ? '↑' : '↓'}${Math.abs(dr)}` : ''}${dc ? `${dc < 0 ? '←' : '→'}${Math.abs(dc)}` : ''}`;
  return [T(v + h, [ve, he].filter(Boolean).join(' ')), arrows];
}

/**
 * Complete a world: every sensor gets its family, and every board cell within REACH of the robot that the world has
 * not named gets a view sensor of its own ('o0_<dr>_<dc>'). The robot's own cell is one only on a layered table,
 * where the other layers' own cells can be read.
 */
export function world(def) {
  const type = def.cellType || 'num', arm = def.armSensors || [], sensors = {}, sensorAt = {};
  const outAt = new Set(def.outs.filter(o => o[2]).map(o => o[2].slice(1).join(',')));
  const add = (id, m) => {
    const { off, label, type: own, ...rest } = m, at = off ? off.slice(-2) : null;
    sensors[id] = sensor(id, label, at ? type : own, { ...rest, family: at ? 'view' : arm.includes(id) ? 'arm' : 'here', ...(at ? { at } : {}) });
    if (at) sensorAt[at.join(',')] = id;
  };
  Object.entries(def.sensors).forEach(([id, m]) => add(id, m));
  for (let dr = -REACH; dr <= REACH; dr++) for (let dc = -REACH; dc <= REACH; dc++) {
    const k = `${dr},${dc}`, own = !dr && !dc;
    if (sensorAt[k] || (def.shown && def.shown(0, dr, dc)) || ((own || outAt.has(k)) && !def.layered)) continue;
    add(`o0_${dr}_${dc}`, cell(...dirName(dr, dc), [dr, dc]));
  }
  const outs = def.outs.map(([id, label, off]) => [id, label, off, type]);
  const W = { ...def, sensors, sensorAt, outs };
  /** The robot's cell for a board cell the player tapped, or null when the robot cannot stand there. */
  W.cellOf = def.cellOf || ((t, key, o) => W.order(t, o).find(c => Object.values(W.keys(t, c)).includes(key)) || null);
  /** A board cell around the robot, on its own layer (or, on a layered table, another one). */
  W.view = def.view ? def.view.bind(W) : (t, x, layer, dr, dc, get) => {
    if (layer !== 'self') return null;
    const [r, c] = W.here(t, x), key = W.keyAt(t, r + dr, c + dc, x);
    return key === null ? null : get(key);
  };
  /** Read sensor `id` on cell x. `get(key)` reads the table (and throws on a cell not computed yet). */
  W.read = (t, x, id, get, o = {}, layer = 'self') => {
    const s = sensors[id];
    if (!s) return null;
    return s.family === 'view' ? W.view(t, x, layer, s.at[0], s.at[1], get, o) : W.sense(t, x, id, get, o);
  };
  return W;
}

/** View sensors a robot with this vision can read: the cells it sees, in board order. */
export const visibleSensors = (V, vision) => Object.values(V.sensors).filter(s => s.family === 'view' && Math.abs(s.at[0]) <= vision && Math.abs(s.at[1]) <= vision).map(s => s.id);
/** The sensors of one family (the arm's, the facts about its own cell). */
export const sensorsOf = (V, family) => Object.values(V.sensors).filter(s => s.family === family).map(s => s.id);

/** The robot's window: (2·vision + 1)² board cells around it, plus the arm's cells. */
export function windowOf(V, t, c, vision, o = {}) {
  const n = 2 * vision + 1, [r, col] = V.here(t, c), cells = [];
  for (let dr = -vision; dr <= vision; dr++) for (let dc = -vision; dc <= vision; dc++) {
    const key = V.keyAt(t, r + dr, col + dc, c), out = V.outs.find(o => o[2] && o[2].join(',') === `0,${dr},${dc}`);
    cells.push({ r: dr + vision, c: dc + vision, key, sensor: V.sensorAt[`${dr},${dc}`] || null, out: out ? out[0] : null, ...(key !== null && V.mark ? V.mark(t, key) : {}) });
  }
  return { wins: [{ label: V.winLabel ? V.winLabel(t, c) : '', n, cells }], arm: V.arm ? V.arm(t, c, o) : null };
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
        const { out } = evaluate(circ, (id, layer) => V.read(t, c, id, get, o, layer), outs, probe);
        const writes = Object.entries(keys).map(([id, key]) => [key, out[id]]);
        const changed = writes.some(([key, v]) => !table.has(key) || table.get(key) !== v);
        writes.forEach(([key, v]) => table.set(key, v));
        moved = moved || changed;
        steps.push({ cell: c, at, reads, probe, writes, round, changed, out });
      } catch (e) {
        if (!e || e.empty === undefined) throw e;
        steps.push({ cell: c, at, reads, probe, empty: e.empty, round });
        return { error: { cell: c, key: e.empty }, steps, base, table };
      }
    }
    if (o.rounds && !moved) return { value: V.answer(t, table, o, steps), steps, base, table, rounds: round };
  }
  if (o.rounds) return { error: { diverge: true }, value: V.answer(t, table, o, steps), steps, base, table, rounds: MAX_ROUNDS };
  return { value: V.answer(t, table, o, steps), steps, base, table };
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
