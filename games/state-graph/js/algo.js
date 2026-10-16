// Pure algorithms shared by the hand-played levels, the figures and the answer checks.

import { T, tr } from './i18n.js';

export function evalGraph(cells, edges) {
  const ids = cells.map(c => c.id), indeg = {}, out = {};
  ids.forEach(i => { indeg[i] = 0; out[i] = []; });
  edges.forEach(([a, b]) => { indeg[b]++; out[a].push(b); });
  const queue = ids.filter(i => indeg[i] === 0), order = [];
  while (queue.length) { const v = queue.shift(); order.push(v); out[v].forEach(w => { if (--indeg[w] === 0) queue.push(w); }); }
  if (order.length < ids.length) return { cycle: ids.filter(i => !order.includes(i)) };
  const by = Object.fromEntries(cells.map(c => [c.id, c])), val = {}, steps = [];
  for (const v of order) {
    const ins = edges.filter(e => e[1] === v);
    val[v] = by[v].fixed !== undefined ? by[v].fixed : ins.reduce((s, [a]) => s + val[a], 0);
    steps.push({ id: v, ins, v: val[v] });
  }
  return { val, steps, order };
}

export function allRoutes(start, end, edges) {
  const out = {}, res = [];
  edges.forEach(([a, b]) => (out[a] = out[a] || []).push(b));
  (function go(v, path) { if (v === end) { res.push(path); return; } (out[v] || []).forEach(w => go(w, [...path, w])); })(start, [start]);
  return res;
}

/** Scan orders for a grid: each returns [[row, col], ...]. */
export const ORDERS = {
  rowTL: { l: T('逐行，从左上开始', 'row by row, from the top left'), list: (R, C) => { const o = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) o.push([r, c]); return o; } },
  rowBR: { l: T('逐行，从右下开始', 'row by row, from the bottom right'), list: (R, C) => ORDERS.rowTL.list(R, C).reverse() },
  colL: { l: T('逐列，从左往右', 'column by column, left to right'), list: (R, C) => { const o = []; for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) o.push([r, c]); return o; } },
  colR: { l: T('逐列，从右往左', 'column by column, right to left'), list: (R, C) => { const o = []; for (let c = C - 1; c >= 0; c--) for (let r = 0; r < R; r++) o.push([r, c]); return o; } },
};

/** Route counts on an R×C right/down grid, filled in the given scan order. */
export function routeSteps(R, C, order = 'rowTL') {
  const val = new Map(), steps = [];
  for (const [r, c] of ORDERS[order].list(R, C)) {
    const v = r === 0 && c === 0 ? 1 : (val.get(`${r - 1},${c}`) || 0) + (val.get(`${r},${c - 1}`) || 0);
    val.set(`${r},${c}`, v);
    steps.push({ id: `${r},${c}`, v });
  }
  return steps;
}

/** Minimum path cost to every cell (right/down moves, the cell's own cost included). */
export function minCostTable(costs) {
  const val = new Map();
  costs.forEach((row, r) => row.forEach((cost, c) => {
    const from = [val.get(`${r - 1},${c}`), val.get(`${r},${c - 1}`)].filter(v => v !== undefined);
    val.set(`${r},${c}`, cost + (from.length ? Math.min(...from) : 0));
  }));
  return val;
}

export function askCalls(n) { const c = [1, 2]; for (let i = 2; i <= n; i++) c[i] = 1 + c[i - 1] + c[i - 2]; return c[n]; }

export function buildTree(n) {
  const nodes = [];
  let leaf = 0, depth = 0;
  (function rec(i, d, parent) {
    const nd = { i, d, parent, x: 0 };
    nodes.push(nd);
    depth = Math.max(depth, d);
    const kids = [i - 1, i - 2].filter(j => j >= 0 && i > 0).map(j => rec(j, d + 1, nd));
    nd.x = kids.length ? (kids[0].x + kids[kids.length - 1].x) / 2 : leaf++;
    return nd;
  })(n, 0, null);
  return { nodes, leaves: leaf, depth };
}

/** LCS table f[row over left][col over top]. */
export function lcsTable(top, left) {
  const f = Array.from({ length: left.length + 1 }, () => Array(top.length + 1).fill(0));
  for (let i = 1; i <= left.length; i++) for (let j = 1; j <= top.length; j++) f[i][j] = top[j - 1] === left[i - 1] ? f[i - 1][j - 1] + 1 : Math.max(f[i - 1][j], f[i][j - 1]);
  return f;
}
export const lcsLen = (a, b) => lcsTable(a, b)[b.length][a.length];

/** Edit-distance table f[row over left][col over top]: turning a prefix of `left` into a prefix of `top`. */
export function editTable(left, top) {
  const f = Array.from({ length: left.length + 1 }, (_, i) => Array.from({ length: top.length + 1 }, (_, j) => (i ? (j ? 0 : i) : j)));
  for (let i = 1; i <= left.length; i++) for (let j = 1; j <= top.length; j++) f[i][j] = Math.min(f[i - 1][j] + 1, f[i][j - 1] + 1, f[i - 1][j - 1] + (left[i - 1] === top[j - 1] ? 0 : 1));
  return f;
}

/** 0/1 knapsack table f[item][capacity] plus the items a traceback picks and the cells it walks. */
export function knapTrace(t) {
  const n = t.items.length, f = [Array(t.W + 1).fill(0)];
  t.items.forEach((it, k) => { f[k + 1] = f[k].map((v, w) => (w >= it.w ? Math.max(v, f[k][w - it.w] + it.v) : v)); });
  const picked = [], cells = [];
  for (let i = n, w = t.W; ; i--) {
    cells.push(`${i},${w}`);
    if (!i) break;
    if (f[i][w] !== f[i - 1][w]) { picked.unshift(i - 1); w -= t.items[i - 1].w; }
  }
  return { value: f[n][t.W], picked, cells };
}

export function knapBest(t) {
  let best = 0;
  const n = t.items.length;
  for (let m = 0; m < 1 << n; m++) {
    let w = 0, v = 0;
    for (let k = 0; k < n; k++) if ((m >> k) & 1) { w += t.items[k].w; v += t.items[k].v; }
    if (w <= t.W) best = Math.max(best, v);
  }
  return best;
}

/** Walk back through an LCS table f[row over left][col over top]; pairs are [topIndex, leftIndex]. */
export function lcsTrace(top, left, f) {
  let i = left.length, j = top.length;
  const pairs = [], cells = [[i, j]];
  while (i > 0 && j > 0) {
    if (top[j - 1] === left[i - 1] && f[i][j] === f[i - 1][j - 1] + 1) { pairs.push([j - 1, i - 1]); i--; j--; }
    else if (f[i - 1][j] >= f[i][j - 1]) i--;
    else j--;
    cells.push([i, j]);
  }
  return { pairs: pairs.reverse(), cells };
}

/** Walk back through an edit-distance table f[row over left][col over top]. */
export function editTrace(left, top, f) {
  let i = left.length, j = top.length, guard = 0;
  const ops = [], cells = [[i, j]];
  while ((i > 0 || j > 0) && guard++ < 200) {
    if (i && j && left[i - 1] === top[j - 1] && f[i][j] === f[i - 1][j - 1]) { ops.push({ k: 'keep', a: left[i - 1] }); i--; j--; }
    else if (i && j && f[i][j] === f[i - 1][j - 1] + 1) { ops.push({ k: 'rep', a: left[i - 1], b: top[j - 1] }); i--; j--; }
    else if (i && f[i][j] === f[i - 1][j] + 1) { ops.push({ k: 'del', a: left[i - 1] }); i--; }
    else { ops.push({ k: 'ins', b: top[j - 1] }); j--; }
    cells.push([i, j]);
  }
  return { ops: ops.reverse(), cells };
}

export const rcName = id => { const [r, c] = id.split(',').map(Number); return tr(`第 ${r + 1} 行第 ${c + 1} 列`, `row ${r + 1}, column ${c + 1}`); };
