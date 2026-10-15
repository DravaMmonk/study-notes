// Worlds the circuit runs in. A world walks its table cell by cell, feeds the cell's facts into the
// circuit's input taps, and writes the circuit's outputs back into the table.
//
// World interface:
//   taps: { id: { label, short, type } }        outs: [[id, label]]
//   base(t, o) → [[key, value]]                 order(t, o) → [cell]
//   keys(t, cell) → { outId: key }              tap(t, cell, id, get) → value (get throws on an empty key)
//   answer(t, table, o)   where(cell) / name(key) / label(t) / orderText(o)   inspect?: false when cells cannot be tapped
//   scene(t, view, o) → board scene

import { E } from '../svg.js';
import { signal } from '../util.js';
import { ORDERS, rcName } from '../algo.js';
import { evaluate } from './components.js';

const num = (label, short) => ({ label, short, type: 'num' });
const yes = (label, short) => ({ label, short, type: 'bool' });

/** Run a circuit over one test. Stops at the first read of a cell that is not computed yet. */
export function runCircuit(V, t, c, o = {}) {
  const base = V.base ? V.base(t, o) : [], table = new Map(base), steps = [], outs = V.outs.map(x => x[0]);
  for (const cell of V.order(t, o)) {
    const keys = V.keys(t, cell), at = Object.values(keys), reads = [], probe = {};
    const get = key => { reads.push(key); if (!table.has(key)) throw { empty: key }; return table.get(key); };
    try {
      const { out } = evaluate(c, id => V.tap(t, cell, id, get), outs, probe);
      const writes = Object.entries(keys).map(([id, key]) => [key, out[id]]);
      writes.forEach(([key, v]) => table.set(key, v));
      steps.push({ cell, at, reads, probe, writes });
    } catch (e) {
      if (!e || e.empty === undefined) throw e;
      steps.push({ cell, at, reads, probe, empty: e.empty });
      return { error: { cell, key: e.empty }, steps, base, table };
    }
  }
  return { value: V.answer(t, table, o), steps, base, table };
}

/* ---------- board marking shared by every world ---------- */

/**
 * view = { res, k, end, halt, pass, focus }: k steps are shown; `halt` marks a stop at a wrong step;
 * `focus` is a step the player tapped to inspect after the run.
 */
function look(view, answerKeys) {
  if (!view) return { shown: new Map(), act: null, reads: new Set(), cls: () => '', val: () => '', arrows: () => [] };
  const { res, k } = view, shown = new Map(res.base);
  res.steps.slice(0, k).forEach(s => (s.writes || []).forEach(([key, v]) => shown.set(key, v)));
  const focused = view.focus !== null && view.focus !== undefined;
  const ai = focused ? view.focus : view.halt || !view.end ? k - 1 : -1, act = ai >= 0 ? res.steps[ai] : null;
  const actCls = focused ? 'sel' : view.halt ? 'bad' : 'hot', reads = new Set(act ? act.reads : []), done = view.end && !view.halt;
  return {
    shown, act, reads,
    val: key => (shown.has(key) ? signal(shown.get(key)) : ''),
    cls(key) {
      const on = act && act.at.includes(key);
      return [on ? actCls : '', reads.has(key) ? (act.empty === key ? 'bad' : 'pred') : '', shown.has(key) && !on ? 'lit' : '', done && answerKeys.includes(key) ? (view.pass ? 'ok' : 'bad') : ''].filter(Boolean).join(' ');
    },
    /** Arrows from every cell read in the focused step to the cell it fed. */
    arrows(to = () => act.at[0], bend = () => 0) {
      if (!act) return [];
      return [...reads].map(r => E(r, to(r), act.empty === r ? 'bad' : actCls === 'sel' ? 'sel' : 'hot', bend(r)));
    },
  };
}
const inspectable = (view, key) => !!view && view.end && view.res.steps.some(s => s.at.includes(key));

/* ---------- grid: right/down street map ---------- */

const grid = {
  taps: {
    up: num('上面', '上'), left: num('左边', '左'), right: num('右边', '右'), down: num('下面', '下'),
    start: yes('是起点', '起'), end: yes('是终点', '终'), rock: yes('是石头', '石'), cost: num('本格体力', '体'),
  },
  outs: [['cell', '本格']],
  order: (t, o) => ORDERS[o.scan || 'rowTL'].list(t.R, t.C).map(([r, c]) => ({ r, c, id: `${r},${c}` })),
  keys: (t, cell) => ({ cell: cell.id }),
  where: cell => rcName(cell.id),
  tap(t, { r, c }, id, get) {
    const at = (y, x) => (y >= 0 && y < t.R && x >= 0 && x < t.C ? get(`${y},${x}`) : null);
    switch (id) {
      case 'up': return at(r - 1, c);
      case 'left': return at(r, c - 1);
      case 'right': return at(r, c + 1);
      case 'down': return at(r + 1, c);
      case 'start': return r === 0 && c === 0;
      case 'end': return r === t.R - 1 && c === t.C - 1;
      case 'rock': return (t.rocks || []).some(p => p[0] === r && p[1] === c);
      case 'cost': return t.costs[r][c];
    }
    return null;
  },
  answerKey: (t, o) => (o.answerAt === 'start' ? '0,0' : `${t.R - 1},${t.C - 1}`),
  answer: (t, table, o) => table.get(grid.answerKey(t, o)),
  name: key => rcName(key),
  label: t => `${t.R}×${t.C}${t.rocks ? ` · ${t.rocks.length} 块石头` : ''}`,
  orderText: o => ORDERS[o.scan || 'rowTL'].l,
  scene(t, view, o) {
    const g = look(view, [grid.answerKey(t, o)]), rocks = new Set((t.rocks || []).map(p => p.join(','))), cells = [];
    for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
      const id = `${r},${c}`, corner = t.costs ? t.costs[r][c] : id === '0,0' ? '起' : r === t.R - 1 && c === t.C - 1 ? '终' : '';
      cells.push({ id, x: c * 64, y: r * 64, w: 56, h: 56, value: g.val(id), corner, cls: `${rocks.has(id) ? 'rock ' : ''}${g.cls(id)}`, tap: inspectable(view, id), aria: rcName(id) });
    }
    return { cells, edges: g.arrows() };
  },
};

/* ---------- strip: a staircase, step 0 is the ground ---------- */

const strip = {
  taps: { m3: num('前 3 级', '−3'), m2: num('前 2 级', '−2'), m1: num('前 1 级', '−1'), p1: num('后 1 级', '+1'), ground: yes('是地面', '地') },
  outs: [['cell', '本级']],
  order: t => Array.from({ length: t.n + 1 }, (_, i) => ({ i, id: String(i) })),
  keys: (t, cell) => ({ cell: cell.id }),
  where: cell => `第 ${cell.i} 级`,
  tap(t, { i }, id, get) {
    if (id === 'ground') return i === 0;
    const j = i + { m3: -3, m2: -2, m1: -1, p1: 1 }[id];
    return j >= 0 && j <= t.n ? get(String(j)) : null;
  },
  answerKey: t => String(t.n),
  answer: (t, table) => table.get(String(t.n)),
  name: key => `第 ${key} 级`,
  label: t => `第 ${t.n} 级`,
  orderText: () => '从第 0 级往上',
  scene(t, view) {
    const g = look(view, [String(t.n)]);
    const cells = Array.from({ length: t.n + 1 }, (_, i) => ({ id: String(i), x: i * 58, y: 0, w: 50, h: 50, value: g.val(String(i)), corner: i, cls: g.cls(String(i)), tap: inspectable(view, String(i)), aria: `第 ${i} 级` }));
    const d = r => Math.abs(+r - +g.act.at[0]);
    return { cells, edges: g.arrows(undefined, r => (d(r) > 1 ? -(16 + 16 * d(r)) : 0)) };
  },
};

/* ---------- street of houses: one row, or three rows once the state remembers "robbed or not" ---------- */

function robPlan(a) {
  const n = a.length, no = [0], rb = [-Infinity];
  for (let i = 1; i <= n; i++) { no[i] = Math.max(no[i - 1], rb[i - 1]); rb[i] = no[i - 1] + a[i - 1]; }
  const plan = [];
  for (let i = n, s = rb[n] > no[n] ? 1 : 0; i >= 1; i--) { if (s) { plan.push(i); s = 0; } else s = rb[i - 1] > no[i - 1] ? 1 : 0; }
  return plan;
}

const street = rows => ({
  outs: rows.map(([id, label]) => [id, label]),
  base: () => rows.map(([, , v], r) => [`${r}:0`, v]),
  order: t => t.a.map((_, k) => ({ i: k + 1 })),
  keys: (t, { i }) => Object.fromEntries(rows.map(([id], r) => [id, `${r}:${i}`])),
  where: cell => `${cell.i} 号`,
  answerKey: t => `${rows.length - 1}:${t.a.length}`,
  answer: (t, table) => table.get(`${rows.length - 1}:${t.a.length}`),
  name: key => { const [r, i] = key.split(':'); return `${i} 号的「${rows[r][1]}」格`; },
  label: t => `${t.a.length} 户人家`,
  orderText: () => '从 1 号往后',
  scene(t, view) {
    const g = look(view, [this.answerKey(t)]), n = t.a.length, sp = 60, sz = 50, y0 = 92;
    const plan = view && view.end && view.pass && rows.length > 1 ? robPlan(t.a) : [];
    const cells = t.a.map((x, j) => ({ id: `h${j + 1}`, x: (j + 1) * sp, y: 0, w: sz, h: 58, label: `${j + 1}号`, value: x, cls: `house${plan.includes(j + 1) ? ' hot' : ''}` }));
    const texts = [{ x: -sz / 2 - 10, y: 5, t: '每家的钱', anchor: 'end' }];
    rows.forEach(([, label], r) => {
      texts.push({ x: -sz / 2 - 10, y: y0 + r * sp + 5, t: label, anchor: 'end', cls: 'hd' });
      for (let i = 0; i <= n; i++) {
        const id = `${r}:${i}`;
        cells.push({ id, x: i * sp, y: y0 + r * sp, w: sz, h: sz, value: g.val(id), corner: r === 0 ? i : '', cls: g.cls(id), tap: inspectable(view, id), aria: this.name(id) });
      }
    });
    return { cells, edges: g.arrows(rk => `${rk.split(':')[0]}:${g.act.cell.i}`), texts };
  },
});

const streetTap = (t, { i }, id, get) => (id === 'money' ? t.a[i - 1] : get(`${{ prev: 0, pn: 0, pr: 1 }[id]}:${i - 1}`));

const rob1 = { ...street([['cell', '最多偷到', 0]]), taps: { prev: num('上一格', '上一格'), money: num('这家的钱', '钱') }, tap: streetTap };
const rob2 = {
  ...street([['no', '这家没偷', 0], ['yes', '这家偷了', null], ['best', '最多偷到', 0]]),
  taps: { pn: num('上家没偷', '没偷'), pr: num('上家偷了', '偷了'), money: num('这家的钱', '钱') },
  tap: streetTap,
};

/* ---------- two-layer maze: top layer without the key, bottom layer with it ---------- */

const keyMaze = {
  taps: {
    tu: num('上层·上面', '上'), tl: num('上层·左边', '左'), bu: num('下层·上面', '上'), bl: num('下层·左边', '左'),
    start: yes('是起点', '起'), key: yes('是钥匙格', '钥'), door: yes('是门', '门'),
  },
  outs: [['top', '上层'], ['bot', '下层']],
  order: t => ORDERS.rowTL.list(t.R, t.C).map(([r, c]) => ({ r, c, id: `${r},${c}` })),
  keys: (t, cell) => ({ top: `0:${cell.id}`, bot: `1:${cell.id}` }),
  where: cell => rcName(cell.id),
  tap(t, { r, c }, id, get) {
    const at = (L, y, x) => (y >= 0 && x >= 0 ? get(`${L}:${y},${x}`) : null);
    switch (id) {
      case 'tu': return at(0, r - 1, c);
      case 'tl': return at(0, r, c - 1);
      case 'bu': return at(1, r - 1, c);
      case 'bl': return at(1, r, c - 1);
      case 'start': return r === 0 && c === 0;
      case 'key': return t.key[0] === r && t.key[1] === c;
      case 'door': return t.doors.some(d => d[0] === r && d[1] === c);
    }
    return null;
  },
  answerKey: t => [`0:${t.R - 1},${t.C - 1}`, `1:${t.R - 1},${t.C - 1}`],
  answer: (t, table) => keyMaze.answerKey(t).reduce((s, k) => s + (table.get(k) ?? 0), 0),
  name: key => { const [L, id] = key.split(':'); return `${L === '1' ? '下层' : '上层'}的${rcName(id)}`; },
  label: t => `${t.R}×${t.C} · ${t.doors.length} 扇门`,
  orderText: () => ORDERS.rowTL.l,
  scene(t, view) {
    const g = look(view, keyMaze.answerKey(t)), sp = 62, sz = 54, gap = 82, layerY = L => L * (t.R * sp + gap), end = `${t.R - 1},${t.C - 1}`;
    const kid = t.key.join(','), doors = new Set(t.doors.map(d => d.join(','))), cells = [], texts = [];
    [0, 1].forEach(L => {
      texts.push({ x: -sz / 2, y: layerY(L) - sz / 2 - 14, t: L ? '下层 · 有钥匙' : '上层 · 没钥匙', anchor: 'start', cls: 'hd' });
      for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
        const id = `${r},${c}`, key = `${L}:${id}`;
        cells.push({ id: key, x: c * sp, y: layerY(L) + r * sp, w: sz, h: sz, value: g.val(key), label: id === kid ? '钥匙' : doors.has(id) ? '门' : '', corner: id === '0,0' ? '起' : id === end ? '终' : '', cls: [id === kid ? 'key' : '', doors.has(id) ? 'door' : '', g.cls(key)].filter(Boolean).join(' '), tap: inspectable(view, key), aria: keyMaze.name(key) });
      }
    });
    return { cells, edges: g.arrows(rk => `${rk[0]}:${g.act.cell.id}`), texts };
  },
};

/* ---------- alignment table: one word on top, one on the left ---------- */

const align = {
  taps: { ul: num('左上', '左上'), up: num('上面', '上'), left: num('左边', '左'), same: yes('两字相同', '同'), start: yes('是起点', '起') },
  outs: [['cell', '本格']],
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
  keys: (t, cell) => ({ cell: cell.id }),
  where: cell => `第 ${cell.i} 行第 ${cell.j} 列`,
  tap(t, { i, j }, id, get) {
    switch (id) {
      case 'ul': return i && j ? get(`${i - 1},${j - 1}`) : null;
      case 'up': return i ? get(`${i - 1},${j}`) : null;
      case 'left': return j ? get(`${i},${j - 1}`) : null;
      case 'same': return !!(i && j && t.left[i - 1] === t.top[j - 1]);
      case 'start': return !i && !j;
    }
    return null;
  },
  answerKey: t => `${t.left.length},${t.top.length}`,
  answer: (t, table) => table.get(align.answerKey(t)),
  name: key => { const [i, j] = key.split(','); return `第 ${i} 行第 ${j} 列`; },
  label: t => `${t.top} / ${t.left}`,
  orderText: () => ORDERS.rowTL.l,
  /** o.path: cells of a traced answer; o.okTop / o.okLeft: matched letters to highlight. */
  scene(t, view, o = {}) {
    const g = look(view, [align.answerKey(t)]), sp = 52, sz = 44, cells = [], path = new Set(o.path || []);
    const okT = o.okTop || new Set(), okL = o.okLeft || new Set();
    for (let j = 0; j <= t.top.length; j++) cells.push({ id: `t${j}`, x: j * sp, y: -sp + 10, w: sz, h: 32, value: j ? t.top[j - 1] : '空', cls: `axis${j ? '' : ' axis0'}${okT.has(j - 1) ? ' ok' : ''}` });
    for (let i = 0; i <= t.left.length; i++) cells.push({ id: `l${i}`, x: -sp + 8, y: i * sp, w: 32, h: sz, value: i ? t.left[i - 1] : '空', cls: `axis${i ? '' : ' axis0'}${okL.has(i - 1) ? ' ok' : ''}` });
    for (let i = 0; i <= t.left.length; i++) for (let j = 0; j <= t.top.length; j++) {
      const id = `${i},${j}`, eq = i && j && t.top[j - 1] === t.left[i - 1];
      cells.push({ id, x: j * sp, y: i * sp, w: sz, h: sz, value: g.val(id), corner: eq ? '=' : '', cls: [eq ? 'eq' : '', g.cls(id), path.has(id) ? 'path' : ''].filter(Boolean).join(' '), tap: inspectable(view, id), aria: align.name(id) });
    }
    const edges = g.arrows();
    for (let q = 0; q + 1 < (o.path || []).length; q++) edges.push(E(o.path[q + 1], o.path[q], 'good'));
    return { cells, edges };
  },
};

/* ---------- knapsack table: rows are items, columns are capacities ---------- */

const knap = {
  taps: { up: num('正上方', '上'), upk: num('上一行·左移重量', '上行左移'), rowk: num('同一行·左移重量', '本行左移'), value: num('物品价值', '价值') },
  outs: [['cell', '本格']],
  base: t => Array.from({ length: t.W + 1 }, (_, w) => [`0,${w}`, 0]),
  order(t) {
    const cells = [];
    t.items.forEach((_, k) => { for (let w = 0; w <= t.W; w++) cells.push({ i: k + 1, w, id: `${k + 1},${w}` }); });
    return cells;
  },
  keys: (t, cell) => ({ cell: cell.id }),
  where: cell => `第 ${cell.i} 行、容量 ${cell.w}`,
  tap(t, { i, w }, id, get) {
    const wt = t.items[i - 1].w;
    switch (id) {
      case 'up': return get(`${i - 1},${w}`);
      case 'upk': return w >= wt ? get(`${i - 1},${w - wt}`) : null;
      case 'rowk': return w >= wt ? get(`${i},${w - wt}`) : null;
      case 'value': return t.items[i - 1].v;
    }
    return null;
  },
  answerKey: t => `${t.items.length},${t.W}`,
  answer: (t, table) => table.get(knap.answerKey(t)),
  name: key => { const [i, w] = key.split(','); return `第 ${i} 行、容量 ${w}`; },
  label: t => `${t.W} kg · ${t.items.length} 件`,
  orderText: () => '逐行，从左往右',
  /** o.path: cells of the traced packing. */
  scene(t, view, o = {}) {
    const g = look(view, [knap.answerKey(t)]), sp = 50, sz = 44, cells = [], path = new Set(o.path || []);
    const texts = [{ x: -sz / 2 - 10, y: -sp + 19, t: '容量', anchor: 'end' }];
    for (let w = 0; w <= t.W; w++) cells.push({ id: `ax${w}`, x: w * sp, y: -sp + 14, w: sz, h: 26, value: w, cls: 'axis' });
    ['不放东西', ...t.items.map(it => `${it.n} ${it.w}kg · ${it.v}`)].forEach((lb, i) => {
      texts.push({ x: -sz / 2 - 10, y: i * sp + 5, t: lb, anchor: 'end', cls: g.act && g.act.cell.i === i ? 'hd' : '' });
      for (let w = 0; w <= t.W; w++) {
        const id = `${i},${w}`;
        cells.push({ id, x: w * sp, y: i * sp, w: sz, h: sz, value: g.val(id), cls: [g.cls(id), path.has(id) ? 'path' : ''].filter(Boolean).join(' '), tap: inspectable(view, id), aria: knap.name(id) });
      }
    });
    return { cells, edges: g.arrows(undefined, r => (+r.split(',')[0] === g.act.cell.i ? -34 : 0)), texts };
  },
};

/* ---------- rolling array: one row rewritten in place, item by item ---------- */

const roll = {
  taps: { old: num('旧的 dp[w]', 'dp[w]'), src: num('dp[w − 重量]', 'dp[w−重]'), value: num('物品价值', '价值') },
  outs: [['cell', '新的 dp[w]']],
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
  keys: (t, cell) => ({ cell: cell.id }),
  where: cell => `dp[${cell.w}]`,
  tap(t, cell, id, get) { return id === 'old' ? get(String(cell.w)) : id === 'src' ? get(String(cell.src)) : t.items[cell.item].v; },
  answerKey: t => String(t.W),
  answer: (t, table) => table.get(String(t.W)),
  name: key => `dp[${key}]`,
  inspect: false,
  label: t => `${t.kind === '01' ? '每件一次' : '每件无限'} · ${t.W} kg`,
  orderText: o => `每件一次${o.dirs['01'] === 'asc' ? '从左往右' : '从右往左'}，每件无限${o.dirs.inf === 'asc' ? '从左往右' : '从右往左'}`,
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
  scene(t, view) {
    const W = t.W, sp = 50, sz = 44, rowH = 60, cells = [], edges = [], texts = [{ x: -sz / 2 - 10, y: -sp + 19, t: '容量 w', anchor: 'end' }];
    for (let w = 0; w <= W; w++) cells.push({ id: `ax${w}`, x: w * sp, y: -sp + 14, w: sz, h: 26, value: w, cls: 'axis' });
    const rows = [];
    if (!view || !view.k) rows.push({ lb: 'dp · 初始', vals: Array(W + 1).fill(0), cls: () => 'lit' });
    else {
      const rp = roll.replay(t, view), s = view.res.steps[view.k - 1], live = !view.end;
      rp.snaps.forEach((vals, j) => rows.push({ lb: j ? `拿完${t.items[j - 1].n}` : '初始', vals, cls: () => 'ghost' }));
      rows.push({
        lb: `${live ? '正在处理' : '拿完'}${t.items[rp.item].n}`, vals: rp.row, head: true,
        cls: w => (!live ? (w === W ? (view.pass ? 'ok' : 'bad') : 'lit') : w === s.cell.w ? 'hot' : w === s.cell.src ? (rp.reused ? 'bad' : 'pred') : rp.touched.has(w) ? 'lit' : ''),
        arrow: live ? [s.cell.src, s.cell.w, rp.reused] : null,
      });
    }
    rows.forEach((row, r) => {
      texts.push({ x: -sz / 2 - 10, y: r * rowH + 5, t: row.lb, anchor: 'end', cls: row.head ? 'hd' : '' });
      row.vals.forEach((v, w) => cells.push({ id: `${r}:${w}`, x: w * sp, y: r * rowH, w: sz, h: sz, value: signal(v), cls: row.cls(w) }));
      if (row.arrow) edges.push(E(`${r}:${row.arrow[0]}`, `${r}:${row.arrow[1]}`, row.arrow[2] ? 'bad' : 'hot', -36));
    });
    return { cells, edges, texts };
  },
};

export const WORLDS = { grid, strip, rob1, rob2, key: keyMaze, align, knap, roll };
