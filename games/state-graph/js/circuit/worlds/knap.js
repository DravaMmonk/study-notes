// Knapsack tables: a full table, and one row rewritten in place.

import { E, W } from '../../svg.js';
import { T, tr } from '../../i18n.js';
import { signal } from '../../util.js';
import { world, look, cell, num, THIS_CELL } from '../world.js';

const VALUE = T('物品价值', 'item value');

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

export { knap, roll };
