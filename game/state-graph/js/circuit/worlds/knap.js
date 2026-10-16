// Knapsack tables: a full table, and one row rewritten in place.

import { E } from '../../svg.js';
import { signal } from '../../util.js';
import { world, look, cell, num } from '../world.js';

/* ---------- knapsack table: rows are items, columns are capacities ---------- */

const knap = world({
  taps: { up: cell('正上方', '上', [0, -1, 0]), upk: num('上一行·左移重量', '上移'), rowk: num('同一行·左移重量', '本移'), value: num('物品价值', '价', 'gem') },
  facts: ['value'],
  armTaps: ['upk', 'rowk'],
  outs: [['cell', '本格', [0, 0, 0]]],
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
    return { label: `往左 ${t.items[i - 1].w} 格`, cells: [{ tap: 'upk', key: key(i - 1), label: '上行' }, { tap: 'rowk', key: key(i), label: '本行' }] };
  },
  base: t => Array.from({ length: t.W + 1 }, (_, w) => [`0,${w}`, 0]),
  order(t) {
    const cells = [];
    t.items.forEach((_, k) => { for (let w = 0; w <= t.W; w++) cells.push({ i: k + 1, w, id: `${k + 1},${w}` }); });
    return cells;
  },
  keys: (t, x) => ({ cell: x.id }),
  where: x => `第 ${x.i} 行、容量 ${x.w}`,
  answerKey: t => `${t.items.length},${t.W}`,
  answer: (t, table) => table.get(knap.answerKey(t)),
  name: key => { const [i, w] = key.split(','); return `第 ${i} 行、容量 ${w}`; },
  label: t => `${t.W} kg · ${t.items.length} 件`,
  orderText: () => '逐行，从左往右',
  sample: t => ({ i: 1, w: t.W, id: `1,${t.W}` }),
  /** o.path: cells of the traced packing. */
  scene(t, view, o = {}) {
    const g = look(view, [knap.answerKey(t)], knap.base(t), o.bench), sp = 50, sz = 44, cells = [], path = new Set(o.path || []);
    const texts = [{ x: -sz / 2 - 10, y: -sp + 19, t: '容量', anchor: 'end' }];
    for (let w = 0; w <= t.W; w++) cells.push({ id: `ax${w}`, x: w * sp, y: -sp + 14, w: sz, h: 26, value: w, cls: 'axis' });
    ['不放东西', ...t.items.map(it => `${it.n} ${it.w}kg · ${it.v}`)].forEach((lb, i) => {
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
  taps: { old: cell('旧的 dp[w]', '旧', [0, 0, 0]), src: num('dp[w − 重量]', '移'), value: num('物品价值', '价', 'gem') },
  facts: ['value'],
  armTaps: ['src'],
  outs: [['cell', '新的 dp[w]', [0, 0, 0]]],
  here: (t, { w }) => [[0, w]],
  keyAt: (t, L, r, c) => (r === 0 && c >= 0 && c <= t.W ? String(c) : null),
  mark: (t, key) => ({ corner: key }),
  fact: (t, x, id, get) => (id === 'src' ? get(String(x.src)) : t.items[x.item].v),
  arm: (t, { item, src }) => ({ label: `往左 ${t.items[item].w} 格`, cells: [{ tap: 'src', key: src >= 0 ? String(src) : null, label: 'dp' }] }),
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
  scene(t, view, o = {}) {
    const W = t.W, sp = 50, sz = 44, rowH = 60, cells = [], edges = [], texts = [{ x: -sz / 2 - 10, y: -sp + 19, t: '容量 w', anchor: 'end' }];
    for (let w = 0; w <= W; w++) cells.push({ id: `ax${w}`, x: w * sp, y: -sp + 14, w: sz, h: 26, value: w, cls: 'axis' });
    const b = o.bench;
    if (!view && b) {
      texts.push({ x: -sz / 2 - 10, y: 5, t: 'dp · 测试', anchor: 'end', cls: 'hd' });
      for (let w = 0; w <= W; w++) {
        const id = String(w), self = b.at.includes(id);
        const cls = [self ? 'self' : b.shown.has(id) ? 'lit' : '', b.reads.has(id) && !self ? (b.empty.has(id) ? 'bad' : 'pred') : '', b.typed.has(id) ? 'typed' : '', b.sel === id ? 'sel' : ''];
        cells.push({ id, x: w * sp, y: 0, w: sz, h: sz, value: b.shown.has(id) ? signal(b.shown.get(id)) : '', cls: cls.filter(Boolean).join(' '), tap: true, aria: `dp[${w}]` });
      }
      [...b.reads].filter(r => !b.at.includes(r)).forEach(r => edges.push(E(r, b.at[0], b.empty.has(r) ? 'bad' : 'hot', -36)));
      return { cells, edges, texts, robot: b.at[0] };
    }
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
    // Keep room for the longest row label from the start, so the board does not shift when a label changes.
    const longest = t.items.reduce((a, it) => (it.n.length > a.length ? it.n : a), '');
    texts.push({ x: -sz / 2 - 10, y: 5, t: `正在处理${longest}`, anchor: 'end', cls: 'reserve' });
    const live = rows.find(row => row.arrow);
    return { cells, edges, texts, robot: live ? `${rows.indexOf(live)}:${live.arrow[1]}` : null };
  },
});

export { knap, roll };
