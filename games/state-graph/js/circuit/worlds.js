// Worlds the circuit runs in. A world walks its table cell by cell; on each cell the robot reads inputs,
// runs the circuit, and writes the circuit's outputs back into the table.
//
// Every world lays its table out on a board (rows × columns, one board per layer). The robot stands at
// here(cell) and any board cell within reach can be lit as an input, so most inputs are just offsets.
//
// World interface (built with world()):
//   taps: { id: { label, short, type, icon?, off? } }   off = [layer, dr, dc] for a cell near the robot
//   facts: tap ids that describe the robot's own cell   armTaps?: taps read by the telescopic arm
//   shown?(L, dr, dc) → true for an offset the robot sees but cannot light (e.g. a fact drawn on the board)
//   outs: [[id, label, [layer, dr, dc]]]               the cells the robot writes
//   here(t, cell) → [[r, c] per layer]   keyAt(t, layer, r, c) → table key | null   mark?(t, key) → { corner, cls }
//   fact(t, cell, id, get) → value of a non-offset tap  arm?(t, cell) → { label, cells: [{ tap, key, label }] }
//   base(t, o) → [[key, value]]   order(t, o) → [cell]   keys(t, cell) → { outId: key }
//   answer(t, table, o)   where(cell) / name(key) / label(t) / orderText(o)   inspect?: false when cells cannot be tapped
//   sample(t, o) → cell   where the robot waits before a run   cellOf(t, key, o) → cell the robot can stand on
//   scene(t, view, o) → board scene (with `robot` on the cell being computed)

import { E, W } from '../svg.js';
import { T, tr, lazy } from '../i18n.js';
import { signal } from '../util.js';
import { ORDERS, rcName } from '../algo.js';
import { evaluate } from './components.js';

const cell = (label, short, off) => ({ label, short, type: 'num', off });
const num = (label, short, icon) => ({ label, short, type: 'num', icon });
const yes = (label, short, icon) => ({ label, short, type: 'bool', icon });

const THIS_CELL = T('本格', 'this cell'), VALUE = T('物品价值', 'item value'), UPPER = T('上层', 'Upper'), LOWER = T('下层', 'Lower');

/** How far any robot can see; a robot's vision (1 or 2) picks the taps it can use. */
const REACH = 2;
/** Names of the cells around the robot: [label, short tag, arrow]. */
const DIR = {
  ul: [T('左上', 'up-left'), T('左上', '↖')], up: [T('上面', 'up'), T('上', 'up')], ur: [T('右上', 'up-right'), T('右上', '↗')], left: [T('左边', 'left'), T('左', 'left')],
  right: [T('右边', 'right'), T('右', 'right')], dl: [T('左下', 'down-left'), T('左下', '↙')], down: [T('下面', 'down'), T('下', 'down')], dr: [T('右下', 'down-right'), T('右下', '↘')],
};
const RING = { '-1,-1': [...DIR.ul, '↖'], '-1,0': [...DIR.up, '↑'], '-1,1': [...DIR.ur, '↗'], '0,-1': [...DIR.left, '←'], '0,1': [...DIR.right, '→'], '1,-1': [...DIR.dl, '↙'], '1,0': [...DIR.down, '↓'], '1,1': [...DIR.dr, '↘'] };
function dirName(dr, dc) {
  if (RING[`${dr},${dc}`]) return RING[`${dr},${dc}`];
  const v = dr ? `${dr < 0 ? '上' : '下'}${Math.abs(dr)}` : '', h = dc ? `${dc < 0 ? '左' : '右'}${Math.abs(dc)}` : '';
  const ve = dr ? `${dr < 0 ? 'up' : 'down'} ${Math.abs(dr)}` : '', he = dc ? `${dc < 0 ? 'left' : 'right'} ${Math.abs(dc)}` : '';
  const arrows = `${dr ? `${dr < 0 ? '↑' : '↓'}${Math.abs(dr)}` : ''}${dc ? `${dc < 0 ? '←' : '→'}${Math.abs(dc)}` : ''}`;
  return [T(v + h, [ve, he].filter(Boolean).join(' ')), T(v + h, arrows), T(v + h, arrows)];
}

/** Complete a world: one tap for every board cell within REACH of the robot that the world has not named. */
function world(def) {
  const layers = def.layers || [''], taps = { ...def.taps }, tapAt = {}, outAt = new Set(def.outs.map(o => o[2].join(',')));
  Object.entries(def.taps).forEach(([id, m]) => { if (m.off) tapAt[m.off.join(',')] = id; });
  layers.forEach((ln, L) => {
    for (let dr = -REACH; dr <= REACH; dr++) for (let dc = -REACH; dc <= REACH; dc++) {
      const k = `${L},${dr},${dc}`;
      if (tapAt[k] || outAt.has(k) || (!dr && !dc) || (def.shown && def.shown(L, dr, dc))) continue;
      const [label, short, arrow] = dirName(dr, dc);
      taps[`o${L}_${dr}_${dc}`] = layers.length > 1 ? cell(lazy(() => `${ln}·${label}`), lazy(() => String(ln)[0] + arrow), [L, dr, dc]) : cell(label, short, [L, dr, dc]);
      tapAt[k] = `o${L}_${dr}_${dc}`;
    }
  });
  /** The robot's cell for a board cell the player tapped, or null when the robot cannot stand there. */
  const cellOf = (t, key, o) => def.order(t, o).find(c => Object.values(def.keys(t, c)).includes(key)) || null;
  return { cellOf, ...def, layers, taps, tapAt };
}

/** Taps a robot with this vision can light: the cells it sees, in board order. */
export const visibleTaps = (V, vision) => Object.keys(V.taps).filter(id => { const o = V.taps[id].off; return o && Math.abs(o[1]) <= vision && Math.abs(o[2]) <= vision; });

/** Read one tap on one cell. `get(key)` reads the table (and throws on a cell not computed yet). */
export function readTap(V, t, c, id, get) {
  const m = V.taps[id];
  if (!m.off) return V.fact(t, c, id, get);
  const [L, dr, dc] = m.off, [r, col] = V.here(t, c)[L], key = V.keyAt(t, L, r + dr, col + dc);
  return key === null ? null : get(key);
}

/** The robot's window: (2·vision + 1)² board cells around it, one window per layer, plus the arm's cells. */
export function windowOf(V, t, c, vision) {
  const n = 2 * vision + 1;
  const wins = V.here(t, c).map(([r, col], L) => {
    const cells = [];
    for (let dr = -vision; dr <= vision; dr++) for (let dc = -vision; dc <= vision; dc++) {
      const key = V.keyAt(t, L, r + dr, col + dc), out = V.outs.find(o => o[2].join(',') === `${L},${dr},${dc}`);
      cells.push({ r: dr + vision, c: dc + vision, key, tap: V.tapAt[`${L},${dr},${dc}`] || null, out: out ? out[0] : null, ...(key !== null && V.mark ? V.mark(t, key) : {}) });
    }
    return { label: V.layers.length > 1 ? V.layers[L] : '', n, cells };
  });
  return { wins, arm: V.arm ? V.arm(t, c) : null };
}

/** Run a circuit over one test. Stops at the first read of a cell that is not computed yet. */
export function runCircuit(V, t, circ, o = {}) {
  const base = V.base ? V.base(t, o) : [], table = new Map(base), steps = [], outs = V.outs.map(x => x[0]);
  for (const c of V.order(t, o)) {
    const keys = V.keys(t, c), at = Object.values(keys), reads = [], probe = {};
    const get = key => { reads.push(key); if (!table.has(key)) throw { empty: key }; return table.get(key); };
    try {
      const { out } = evaluate(circ, id => readTap(V, t, c, id, get), outs, probe);
      const writes = Object.entries(keys).map(([id, key]) => [key, out[id]]);
      writes.forEach(([key, v]) => table.set(key, v));
      steps.push({ cell: c, at, reads, probe, writes });
    } catch (e) {
      if (!e || e.empty === undefined) throw e;
      steps.push({ cell: c, at, reads, probe, empty: e.empty });
      return { error: { cell: c, key: e.empty }, steps, base, table };
    }
  }
  return { value: V.answer(t, table, o), steps, base, table };
}

/* ---------- board marking shared by every world ---------- */

/**
 * view = { res, k, end, halt, pass, focus }: k steps are shown; `halt` marks a stop at a wrong step;
 * `focus` is a step the player tapped to inspect after the run.
 * bench (no view): the board as a sandbox = { cell, at, shown, reads, empty, typed, sel } — the robot stands on `cell`,
 * `shown` holds the typed numbers plus the robot's live output; `empty` are read cells that hold nothing.
 */
function look(view, answerKeys, base = [], bench = null) {
  if (!view && !bench) {
    const shown = new Map(base);
    return { shown, act: null, robot: null, reads: new Set(), cls: key => (shown.has(key) ? 'lit' : ''), val: key => (shown.has(key) ? signal(shown.get(key)) : ''), arrows: () => [], tap: () => false };
  }
  let shown, act, actCls, done = false, last = null;
  if (view) {
    const { res, k } = view, focused = view.focus !== null && view.focus !== undefined;
    shown = new Map(res.base);
    res.steps.slice(0, k).forEach(s => (s.writes || []).forEach(([key, v]) => shown.set(key, v)));
    const ai = focused ? view.focus : view.halt || !view.end ? k - 1 : -1;
    act = ai >= 0 ? res.steps[ai] : null;
    last = res.steps[k - 1];
    actCls = focused ? 'sel' : view.halt ? 'bad' : 'hot';
    done = view.end && !view.halt;
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
      return [on ? actCls : '', reads.has(key) ? (bad(key) ? 'bad' : 'pred') : '', shown.has(key) && !on ? 'lit' : '', done && answerKeys.includes(key) ? (view.pass ? 'ok' : 'bad') : '', bench && bench.typed.has(key) ? 'typed' : '', bench && bench.sel === key ? 'sel' : ''].filter(Boolean).join(' ');
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

/* ---------- grid: right/down street map ---------- */

const inGrid = (t, r, c) => r >= 0 && r < t.R && c >= 0 && c < t.C;

const grid = world({
  taps: {
    ul: cell(...DIR.ul, [0, -1, -1]), up: cell(...DIR.up, [0, -1, 0]), ur: cell(...DIR.ur, [0, -1, 1]), left: cell(...DIR.left, [0, 0, -1]),
    right: cell(...DIR.right, [0, 0, 1]), dl: cell(...DIR.dl, [0, 1, -1]), down: cell(...DIR.down, [0, 1, 0]), dr: cell(...DIR.dr, [0, 1, 1]),
    start: yes(T('是起点', 'is start'), T('起', 'start'), 'flag'), end: yes(T('是终点', 'is end'), T('终', 'end'), 'goal'), rock: yes(T('是石头', 'is rock'), T('石', 'rock'), 'rock'), cost: num(T('本格体力', 'cell energy'), T('体', 'nrg'), 'bolt'),
  },
  facts: ['start', 'end', 'rock', 'cost'],
  outs: [['cell', THIS_CELL, [0, 0, 0]]],
  here: (t, { r, c }) => [[r, c]],
  keyAt: (t, L, r, c) => (inGrid(t, r, c) ? `${r},${c}` : null),
  mark(t, key) {
    const [r, c] = key.split(',').map(Number);
    return { corner: t.costs ? t.costs[r][c] : key === '0,0' ? W.start : r === t.R - 1 && c === t.C - 1 ? W.end : '', cls: (t.rocks || []).some(p => p[0] === r && p[1] === c) ? 'rock' : '' };
  },
  fact(t, { r, c }, id) {
    switch (id) {
      case 'start': return r === 0 && c === 0;
      case 'end': return r === t.R - 1 && c === t.C - 1;
      case 'rock': return (t.rocks || []).some(p => p[0] === r && p[1] === c);
      case 'cost': return t.costs[r][c];
    }
    return null;
  },
  /** t.given: cells written before the robot starts, e.g. { '0,0': 1 }; the robot skips them. */
  base: t => Object.entries(t.given || {}),
  order: (t, o) => ORDERS[o.scan || 'rowTL'].list(t.R, t.C).map(([r, c]) => ({ r, c, id: `${r},${c}` })).filter(x => !(x.id in (t.given || {}))),
  keys: (t, x) => ({ cell: x.id }),
  where: x => rcName(x.id),
  answerKey: (t, o) => (o.answerAt === 'start' ? '0,0' : `${t.R - 1},${t.C - 1}`),
  answer: (t, table, o) => table.get(grid.answerKey(t, o)),
  name: key => rcName(key),
  label: t => `${t.R}×${t.C}${t.rocks ? tr(` · ${t.rocks.length} 块石头`, ` · ${t.rocks.length} rock${t.rocks.length > 1 ? 's' : ''}`) : ''}`,
  orderText: o => ORDERS[o.scan || 'rowTL'].l,
  sample: t => { const r = Math.min(1, t.R - 1), c = Math.min(1, t.C - 1); return { r, c, id: `${r},${c}` }; },
  scene(t, view, o) {
    const g = look(view, [grid.answerKey(t, o)], grid.base(t), o.bench), cells = [];
    for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
      const id = `${r},${c}`, m = grid.mark(t, id);
      cells.push({ id, x: c * 64, y: r * 64, w: 56, h: 56, value: g.val(id), corner: m.corner, cls: `${m.cls} ${g.cls(id)}`, tap: g.tap(id), aria: rcName(id) });
    }
    return { cells, edges: g.arrows(), robot: g.robot };
  },
});

/* ---------- strip: a staircase laid out in one row, step 0 is the ground ---------- */

const strip = world({
  taps: { m2: cell(T('前 2 级', '2 steps down'), '−2', [0, 0, -2]), m1: cell(T('前 1 级', '1 step down'), '−1', [0, 0, -1]), p1: cell(T('后 1 级', '1 step up'), '+1', [0, 0, 1]), ground: yes(T('是地面', 'is ground'), T('地', 'gnd'), 'ground') },
  facts: ['ground'],
  outs: [['cell', T('本级', 'this step'), [0, 0, 0]]],
  here: (t, { i }) => [[0, i]],
  keyAt: (t, L, r, c) => (r === 0 && c >= 0 && c <= t.n ? String(c) : null),
  mark: (t, key) => ({ corner: key }),
  fact: (t, { i }) => i === 0,
  order: t => Array.from({ length: t.n + 1 }, (_, i) => ({ i, id: String(i) })),
  keys: (t, x) => ({ cell: x.id }),
  where: x => tr(`第 ${x.i} 级`, `step ${x.i}`),
  answer: (t, table) => table.get(String(t.n)),
  name: key => tr(`第 ${key} 级`, `step ${key}`),
  label: t => tr(`第 ${t.n} 级`, `step ${t.n}`),
  orderText: () => tr('从第 0 级往上', 'from step 0 upward'),
  sample: t => ({ i: Math.min(3, t.n), id: String(Math.min(3, t.n)) }),
  scene(t, view, o = {}) {
    const g = look(view, [String(t.n)], [], o.bench);
    const cells = Array.from({ length: t.n + 1 }, (_, i) => ({ id: String(i), x: i * 58, y: 0, w: 50, h: 50, value: g.val(String(i)), corner: i, cls: g.cls(String(i)), tap: g.tap(String(i)), aria: tr(`第 ${i} 级`, `step ${i}`) }));
    const d = r => Math.abs(+r - +g.act.at[0]);
    return { cells, edges: g.arrows(undefined, r => (d(r) > 1 ? -(16 + 16 * d(r)) : 0)), robot: g.robot };
  },
});

/* ---------- street of houses: the houses on top, then one row, or three rows once the state remembers "robbed or not" ---------- */

function robPlan(a) {
  const n = a.length, no = [0], rb = [-Infinity];
  for (let i = 1; i <= n; i++) { no[i] = Math.max(no[i - 1], rb[i - 1]); rb[i] = no[i - 1] + a[i - 1]; }
  const plan = [];
  for (let i = n, s = rb[n] > no[n] ? 1 : 0; i >= 1; i--) { if (s) { plan.push(i); s = 0; } else s = rb[i - 1] > no[i - 1] ? 1 : 0; }
  return plan;
}

/** rows: [[outId, label, value before house 1]]; the robot stands on the middle row of its column.
 *  The houses' money is drawn on the board's top row but is read only as the fact 「这家的钱」. */
const street = (rows, taps) => {
  const mid = Math.floor((rows.length - 1) / 2), V = world({
    taps: { ...taps, money: num(T('这家的钱', "this house's money"), T('钱', '$'), 'coin') },
    facts: ['money'],
    shown: (L, dr) => dr === -1 - mid,
    outs: rows.map(([id, label], r) => [id, label, [0, r - mid, 0]]),
    here: (t, { i }) => [[1 + mid, i]],
    keyAt: (t, L, r, c) => (r === 0 ? (c >= 1 && c <= t.a.length ? `h:${c}` : null) : r <= rows.length && c >= 0 && c <= t.a.length ? `${r - 1}:${c}` : null),
    mark: (t, key) => (key.startsWith('h:') ? { cls: 'house', corner: tr(`${key.slice(2)}号`, `#${key.slice(2)}`) } : {}),
    fact: (t, { i }) => t.a[i - 1],
    base: t => [...rows.map(([, , v], r) => [`${r}:0`, v]), ...t.a.map((x, j) => [`h:${j + 1}`, x])],
    order: t => t.a.map((_, k) => ({ i: k + 1 })),
    keys: (t, { i }) => Object.fromEntries(rows.map(([id], r) => [id, `${r}:${i}`])),
    where: x => tr(`${x.i} 号`, `house ${x.i}`),
    answerKey: t => `${rows.length - 1}:${t.a.length}`,
    answer: (t, table) => table.get(`${rows.length - 1}:${t.a.length}`),
    name: key => (key.startsWith('h:') ? tr(`${key.slice(2)} 号的钱`, `house ${key.slice(2)}'s money`) : tr(`${key.split(':')[1]} 号的「${rows[key.split(':')[0]][1]}」格`, `the “${rows[key.split(':')[0]][1]}” cell of house ${key.split(':')[1]}`)),
    label: t => tr(`${t.a.length} 户人家`, `${t.a.length} houses`),
    orderText: () => tr('从 1 号往后', 'from house 1 onward'),
    sample: t => ({ i: Math.min(2, t.a.length) }),
    scene(t, view, o = {}) {
      const g = look(view, [V.answerKey(t)], V.base(t), o.bench), n = t.a.length, sp = 60, sz = 50, y0 = 92;
      const plan = view && view.end && view.pass && rows.length > 1 ? robPlan(t.a) : [];
      const cells = t.a.map((x, j) => ({ id: `h:${j + 1}`, x: (j + 1) * sp, y: 0, w: sz, h: 58, label: tr(`${j + 1}号`, `#${j + 1}`), value: x, cls: `house${plan.includes(j + 1) ? ' hot' : g.reads.has(`h:${j + 1}`) ? ' pred' : ''}` }));
      const texts = [{ x: -sz / 2 - 10, y: 5, t: tr('每家的钱', 'money'), anchor: 'end' }];
      rows.forEach(([, label], r) => {
        texts.push({ x: -sz / 2 - 10, y: y0 + r * sp + 5, t: label, anchor: 'end', cls: 'hd' });
        for (let i = 0; i <= n; i++) {
          const id = `${r}:${i}`;
          cells.push({ id, x: i * sp, y: y0 + r * sp, w: sz, h: sz, value: g.val(id), corner: r === 0 ? i : '', cls: g.cls(id), tap: g.tap(id), aria: V.name(id) });
        }
      });
      return { cells, edges: g.arrows(rk => (rk.startsWith('h:') ? `0:${g.act.cell.i}` : `${rk.split(':')[0]}:${g.act.cell.i}`)), texts, robot: g.robot };
    },
  });
  return V;
};

const BEST = T('最多偷到', 'most so far');
const rob1 = street([['cell', BEST, 0]], { prev: cell(T('上一格', 'previous'), T('上格', 'prev'), [0, 0, -1]) });
const rob2 = street([['no', T('这家没偷', 'skipped'), 0], ['yes', T('这家偷了', 'robbed'), null], ['best', BEST, 0]], {
  pn: cell(T('上家没偷', 'prev skipped'), T('没偷', 'skip'), [0, -1, -1]), pr: cell(T('上家偷了', 'prev robbed'), T('偷了', 'rob'), [0, 0, -1]),
});

/* ---------- two-layer maze: top layer without the key, bottom layer with it ---------- */

const keyMaze = world({
  layers: [UPPER, LOWER],
  taps: {
    tu: cell(T('上层·上面', 'upper·up'), T('上↑', 'U↑'), [0, -1, 0]), tl: cell(T('上层·左边', 'upper·left'), T('上←', 'U←'), [0, 0, -1]),
    bu: cell(T('下层·上面', 'lower·up'), T('下↑', 'L↑'), [1, -1, 0]), bl: cell(T('下层·左边', 'lower·left'), T('下←', 'L←'), [1, 0, -1]),
    start: yes(T('是起点', 'is start'), T('起', 'start'), 'flag'), key: yes(T('是钥匙格', 'is key'), T('钥', 'key'), 'key'), door: yes(T('是门', 'is door'), T('门', 'door'), 'door'),
  },
  facts: ['start', 'key', 'door'],
  outs: [['top', UPPER, [0, 0, 0]], ['bot', LOWER, [1, 0, 0]]],
  here: (t, { r, c }) => [[r, c], [r, c]],
  keyAt: (t, L, r, c) => (inGrid(t, r, c) ? `${L}:${r},${c}` : null),
  mark(t, key) {
    const id = key.slice(2), isKey = id === t.key.join(','), door = t.doors.some(d => d.join(',') === id);
    return { corner: isKey ? tr('钥', 'K') : door ? tr('门', 'D') : id === '0,0' ? W.start : id === `${t.R - 1},${t.C - 1}` ? W.end : '', cls: isKey ? 'key' : door ? 'door' : '' };
  },
  fact(t, { r, c }, id) {
    switch (id) {
      case 'start': return r === 0 && c === 0;
      case 'key': return t.key[0] === r && t.key[1] === c;
      case 'door': return t.doors.some(d => d[0] === r && d[1] === c);
    }
    return null;
  },
  order: t => ORDERS.rowTL.list(t.R, t.C).map(([r, c]) => ({ r, c, id: `${r},${c}` })),
  keys: (t, x) => ({ top: `0:${x.id}`, bot: `1:${x.id}` }),
  where: x => rcName(x.id),
  answerKey: t => [`0:${t.R - 1},${t.C - 1}`, `1:${t.R - 1},${t.C - 1}`],
  answer: (t, table) => keyMaze.answerKey(t).reduce((s, k) => s + (table.get(k) ?? 0), 0),
  name: key => { const [L, id] = key.split(':'); return tr(`${L === '1' ? '下层' : '上层'}的${rcName(id)}`, `${rcName(id)} on the ${L === '1' ? 'lower' : 'upper'} layer`); },
  label: t => tr(`${t.R}×${t.C} · ${t.doors.length} 扇门`, `${t.R}×${t.C} · ${t.doors.length} door${t.doors.length > 1 ? 's' : ''}`),
  orderText: () => ORDERS.rowTL.l,
  sample: () => ({ r: 1, c: 1, id: '1,1' }),
  scene(t, view, o = {}) {
    const g = look(view, keyMaze.answerKey(t), [], o.bench), sp = 62, sz = 54, gap = 82, layerY = L => L * (t.R * sp + gap);
    const cells = [], texts = [];
    [0, 1].forEach(L => {
      texts.push({ x: -sz / 2, y: layerY(L) - sz / 2 - 14, t: L ? W.lower : W.upper, anchor: 'start', cls: 'hd' });
      for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
        const key = `${L}:${r},${c}`, m = keyMaze.mark(t, key);
        cells.push({ id: key, x: c * sp, y: layerY(L) + r * sp, w: sz, h: sz, value: g.val(key), label: m.cls === 'key' ? W.key : m.cls === 'door' ? W.door : '', corner: m.cls ? '' : m.corner, cls: `${m.cls} ${g.cls(key)}`, tap: g.tap(key), aria: keyMaze.name(key) });
      }
    });
    return { cells, edges: g.arrows(rk => `${rk[0]}:${g.act.cell.id}`), texts, robot: g.robot ? [g.robot, `1${g.robot.slice(1)}`] : null };
  },
});

/* ---------- alignment table: one word on top, one on the left ---------- */

const align = world({
  taps: {
    ul: cell(...DIR.ul, [0, -1, -1]), up: cell(...DIR.up, [0, -1, 0]), left: cell(...DIR.left, [0, 0, -1]),
    same: yes(T('两字相同', 'letters match'), T('同', '='), 'eq'), start: yes(T('是起点', 'is start'), T('起', 'start'), 'flag'),
  },
  facts: ['same', 'start'],
  outs: [['cell', THIS_CELL, [0, 0, 0]]],
  here: (t, { i, j }) => [[i, j]],
  keyAt: (t, L, i, j) => (i >= 0 && i <= t.left.length && j >= 0 && j <= t.top.length ? `${i},${j}` : null),
  mark(t, key) { const [i, j] = key.split(',').map(Number); return i && j && t.left[i - 1] === t.top[j - 1] ? { corner: '=', cls: 'eq' } : {}; },
  fact: (t, { i, j }, id) => (id === 'same' ? !!(i && j && t.left[i - 1] === t.top[j - 1]) : !i && !j),
  base: (t, o) => {
    if (!o.border0) return [];
    const b = [];
    for (let i = 0; i <= t.left.length; i++) for (let j = 0; j <= t.top.length; j++) if (!i || !j) b.push([`${i},${j}`, 0]);
    return b;
  },
  order(t, o) {
    const cells = [];
    for (let i = 0; i <= t.left.length; i++) for (let j = 0; j <= t.top.length; j++) if (!o.border0 || (i && j)) cells.push({ i, j, id: `${i},${j}` });
    return cells;
  },
  keys: (t, x) => ({ cell: x.id }),
  where: x => tr(`第 ${x.i} 行第 ${x.j} 列`, `row ${x.i}, column ${x.j}`),
  answerKey: t => `${t.left.length},${t.top.length}`,
  answer: (t, table) => table.get(align.answerKey(t)),
  name: key => { const [i, j] = key.split(','); return tr(`第 ${i} 行第 ${j} 列`, `row ${i}, column ${j}`); },
  label: t => `${t.top} / ${t.left}`,
  orderText: () => ORDERS.rowTL.l,
  sample: t => { const i = Math.min(2, t.left.length), j = Math.min(2, t.top.length); return { i, j, id: `${i},${j}` }; },
  /** o.path: cells of a traced answer; o.okTop / o.okLeft: matched letters to highlight. */
  scene(t, view, o = {}) {
    const g = look(view, [align.answerKey(t)], align.base(t, o), o.bench), sp = 52, sz = 44, cells = [], path = new Set(o.path || []);
    const okT = o.okTop || new Set(), okL = o.okLeft || new Set();
    for (let j = 0; j <= t.top.length; j++) cells.push({ id: `t${j}`, x: j * sp, y: -sp + 10, w: sz, h: 32, value: j ? t.top[j - 1] : W.empty, cls: `axis${j ? '' : ' axis0'}${okT.has(j - 1) ? ' ok' : ''}` });
    for (let i = 0; i <= t.left.length; i++) cells.push({ id: `l${i}`, x: -sp + 8, y: i * sp, w: 32, h: sz, value: i ? t.left[i - 1] : W.empty, cls: `axis${i ? '' : ' axis0'}${okL.has(i - 1) ? ' ok' : ''}` });
    for (let i = 0; i <= t.left.length; i++) for (let j = 0; j <= t.top.length; j++) {
      const id = `${i},${j}`, m = align.mark(t, id);
      cells.push({ id, x: j * sp, y: i * sp, w: sz, h: sz, value: g.val(id), corner: m.corner || '', cls: [m.cls, g.cls(id), path.has(id) ? 'path' : ''].filter(Boolean).join(' '), tap: g.tap(id), aria: align.name(id) });
    }
    const edges = g.arrows();
    for (let q = 0; q + 1 < (o.path || []).length; q++) edges.push(E(o.path[q + 1], o.path[q], 'good'));
    return { cells, edges, robot: g.robot };
  },
});

/* ---------- knapsack table: rows are items, columns are capacities ---------- */

const knap = world({
  taps: { up: cell(T('正上方', 'right above'), T('上', 'up'), [0, -1, 0]), upk: num(T('上一行·左移重量', 'row above · back by weight'), T('上移', 'U−w')), rowk: num(T('同一行·左移重量', 'this row · back by weight'), T('本移', 'R−w')), value: num(VALUE, T('价', 'val'), 'gem') },
  facts: ['value'],
  armTaps: ['upk', 'rowk'],
  outs: [['cell', THIS_CELL, [0, 0, 0]]],
  here: (t, { i, w }) => [[i, w]],
  keyAt: (t, L, i, w) => (i >= 0 && i <= t.items.length && w >= 0 && w <= t.W ? `${i},${w}` : null),
  mark: (t, key) => ({ corner: key.split(',')[1] }),
  fact(t, { i, w }, id, get) {
    const wt = t.items[i - 1].w;
    if (id === 'value') return t.items[i - 1].v;
    return w >= wt ? get(`${id === 'upk' ? i - 1 : i},${w - wt}`) : null;
  },
  /** The arm reaches back by this item's weight, on the row above and on this row. */
  arm(t, { i, w }) {
    const k = w - t.items[i - 1].w, key = y => (k >= 0 ? `${y},${k}` : null);
    return { label: tr(`往左 ${t.items[i - 1].w} 格`, `${t.items[i - 1].w} left`), cells: [{ tap: 'upk', key: key(i - 1), label: tr('上行', 'above') }, { tap: 'rowk', key: key(i), label: tr('本行', 'this row') }] };
  },
  base: t => Array.from({ length: t.W + 1 }, (_, w) => [`0,${w}`, 0]),
  order(t) {
    const cells = [];
    t.items.forEach((_, k) => { for (let w = 0; w <= t.W; w++) cells.push({ i: k + 1, w, id: `${k + 1},${w}` }); });
    return cells;
  },
  keys: (t, x) => ({ cell: x.id }),
  where: x => tr(`第 ${x.i} 行、容量 ${x.w}`, `row ${x.i}, capacity ${x.w}`),
  answerKey: t => `${t.items.length},${t.W}`,
  answer: (t, table) => table.get(knap.answerKey(t)),
  name: key => { const [i, w] = key.split(','); return tr(`第 ${i} 行、容量 ${w}`, `row ${i}, capacity ${w}`); },
  label: t => tr(`${t.W} kg · ${t.items.length} 件`, `${t.W} kg · ${t.items.length} items`),
  orderText: () => tr('逐行，从左往右', 'row by row, left to right'),
  sample: t => ({ i: 1, w: t.W, id: `1,${t.W}` }),
  /** o.path: cells of the traced packing. */
  scene(t, view, o = {}) {
    const g = look(view, [knap.answerKey(t)], knap.base(t), o.bench), sp = 50, sz = 44, cells = [], path = new Set(o.path || []);
    const texts = [{ x: -sz / 2 - 10, y: -sp + 19, t: W.capacity, anchor: 'end' }];
    for (let w = 0; w <= t.W; w++) cells.push({ id: `ax${w}`, x: w * sp, y: -sp + 14, w: sz, h: 26, value: w, cls: 'axis' });
    [tr('不放东西', 'nothing'), ...t.items.map(it => `${it.n} ${it.w}kg · ${it.v}`)].forEach((lb, i) => {
      texts.push({ x: -sz / 2 - 10, y: i * sp + 5, t: lb, anchor: 'end', cls: g.act && g.act.cell.i === i ? 'hd' : '' });
      for (let w = 0; w <= t.W; w++) {
        const id = `${i},${w}`;
        cells.push({ id, x: w * sp, y: i * sp, w: sz, h: sz, value: g.val(id), cls: [g.cls(id), path.has(id) ? 'path' : ''].filter(Boolean).join(' '), tap: g.tap(id), aria: knap.name(id) });
      }
    });
    return { cells, edges: g.arrows(undefined, r => (+r.split(',')[0] === g.act.cell.i ? -34 : 0)), texts, robot: g.robot };
  },
});

/* ---------- rolling array: one row rewritten in place, item by item ---------- */

const roll = world({
  taps: { old: cell(T('旧的 dp[w]', 'old dp[w]'), T('旧', 'old'), [0, 0, 0]), src: num(T('dp[w − 重量]', 'dp[w − weight]'), T('移', '−w')), value: num(VALUE, T('价', 'val'), 'gem') },
  facts: ['value'],
  armTaps: ['src'],
  outs: [['cell', T('新的 dp[w]', 'new dp[w]'), [0, 0, 0]]],
  here: (t, { w }) => [[0, w]],
  keyAt: (t, L, r, c) => (r === 0 && c >= 0 && c <= t.W ? String(c) : null),
  mark: (t, key) => ({ corner: key }),
  fact: (t, x, id, get) => (id === 'src' ? get(String(x.src)) : t.items[x.item].v),
  arm: (t, { item, src }) => ({ label: tr(`往左 ${t.items[item].w} 格`, `${t.items[item].w} left`), cells: [{ tap: 'src', key: src >= 0 ? String(src) : null, label: 'dp' }] }),
  base: t => Array.from({ length: t.W + 1 }, (_, w) => [String(w), 0]),
  order(t, o) {
    const cells = [];
    t.items.forEach((it, item) => {
      const ws = [];
      for (let w = it.w; w <= t.W; w++) ws.push(w);
      if (o.dirs[t.kind] === 'desc') ws.reverse();
      ws.forEach(w => cells.push({ item, w, src: w - it.w, id: String(w) }));
    });
    return cells;
  },
  keys: (t, x) => ({ cell: x.id }),
  where: x => `dp[${x.w}]`,
  answer: (t, table) => table.get(String(t.W)),
  name: key => `dp[${key}]`,
  inspect: false,
  sample: t => ({ item: 0, w: t.W, src: t.W - t.items[0].w, id: String(t.W) }),
  label: t => `${t.kind === '01' ? tr('每件一次', 'once each') : tr('每件无限', 'unlimited')} · ${t.W} kg`,
  orderText: o => tr(`每件一次${o.dirs['01'] === 'asc' ? '从左往右' : '从右往左'}，每件无限${o.dirs.inf === 'asc' ? '从左往右' : '从右往左'}`, `once each ${o.dirs['01'] === 'asc' ? 'left to right' : 'right to left'}, unlimited ${o.dirs.inf === 'asc' ? 'left to right' : 'right to left'}`),
  /** Replay the in-place writes: one ghost row per finished item, plus the row being rewritten. */
  replay(t, view) {
    const row = Array(t.W + 1).fill(0), snaps = [row.slice()], steps = view.res.steps.slice(0, view.k);
    let item = 0, touched = new Set(), reused = false;
    steps.forEach((s, q) => {
      while (s.cell.item > item) { snaps.push(row.slice()); item++; touched = new Set(); }
      if (q === steps.length - 1) reused = touched.has(s.cell.src);
      (s.writes || []).forEach(([key, v]) => { row[+key] = v; });
      touched.add(s.cell.w);
    });
    return { row, snaps, item, touched, reused };
  },
  scene(t, view, o = {}) {
    const W = t.W, sp = 50, sz = 44, rowH = 60, cells = [], edges = [], texts = [{ x: -sz / 2 - 10, y: -sp + 19, t: tr('容量 w', 'capacity w'), anchor: 'end' }];
    for (let w = 0; w <= W; w++) cells.push({ id: `ax${w}`, x: w * sp, y: -sp + 14, w: sz, h: 26, value: w, cls: 'axis' });
    const b = o.bench;
    if (!view && b) {
      texts.push({ x: -sz / 2 - 10, y: 5, t: tr('dp · 测试', 'dp · test'), anchor: 'end', cls: 'hd' });
      for (let w = 0; w <= W; w++) {
        const id = String(w), self = b.at.includes(id);
        const cls = [self ? 'self' : b.shown.has(id) ? 'lit' : '', b.reads.has(id) && !self ? (b.empty.has(id) ? 'bad' : 'pred') : '', b.typed.has(id) ? 'typed' : '', b.sel === id ? 'sel' : ''];
        cells.push({ id, x: w * sp, y: 0, w: sz, h: sz, value: b.shown.has(id) ? signal(b.shown.get(id)) : '', cls: cls.filter(Boolean).join(' '), tap: true, aria: `dp[${w}]` });
      }
      [...b.reads].filter(r => !b.at.includes(r)).forEach(r => edges.push(E(r, b.at[0], b.empty.has(r) ? 'bad' : 'hot', -36)));
      return { cells, edges, texts, robot: b.at[0] };
    }
    const rows = [];
    if (!view || !view.k) rows.push({ lb: tr('dp · 初始', 'dp · start'), vals: Array(W + 1).fill(0), cls: () => 'lit' });
    else {
      const rp = roll.replay(t, view), s = view.res.steps[view.k - 1], live = !view.end;
      rp.snaps.forEach((vals, j) => rows.push({ lb: j ? tr(`拿完${t.items[j - 1].n}`, `after ${t.items[j - 1].n}`) : tr('初始', 'start'), vals, cls: () => 'ghost' }));
      rows.push({
        lb: live ? tr(`正在处理${t.items[rp.item].n}`, `packing ${t.items[rp.item].n}`) : tr(`拿完${t.items[rp.item].n}`, `after ${t.items[rp.item].n}`), vals: rp.row, head: true,
        cls: w => (!live ? (w === W ? (view.pass ? 'ok' : 'bad') : 'lit') : w === s.cell.w ? 'hot' : w === s.cell.src ? (rp.reused ? 'bad' : 'pred') : rp.touched.has(w) ? 'lit' : ''),
        arrow: live ? [s.cell.src, s.cell.w, rp.reused] : null,
      });
    }
    rows.forEach((row, r) => {
      texts.push({ x: -sz / 2 - 10, y: r * rowH + 5, t: row.lb, anchor: 'end', cls: row.head ? 'hd' : '' });
      row.vals.forEach((v, w) => cells.push({ id: `${r}:${w}`, x: w * sp, y: r * rowH, w: sz, h: sz, value: signal(v), cls: row.cls(w) }));
      if (row.arrow) edges.push(E(`${r}:${row.arrow[0]}`, `${r}:${row.arrow[1]}`, row.arrow[2] ? 'bad' : 'hot', -36));
    });
    // Keep room for the longest row label from the start, so the board does not shift when a label changes.
    const longest = t.items.map(it => String(it.n)).reduce((a, n) => (n.length > a.length ? n : a), '');
    texts.push({ x: -sz / 2 - 10, y: 5, t: tr(`正在处理${longest}`, `packing ${longest}`), anchor: 'end', cls: 'reserve' });
    const live = rows.find(row => row.arrow);
    return { cells, edges, texts, robot: live ? `${rows.indexOf(live)}:${live.arrow[1]}` : null };
  },
});

export const WORLDS = { grid, strip, rob1, rob2, key: keyMaze, align, knap, roll };
