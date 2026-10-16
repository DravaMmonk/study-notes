// Mazes with keys and doors, as tables stacked in layers.

import { ORDERS, rcName } from '../../algo.js';
import { world, look, cell, yes } from '../world.js';
import { inGrid } from './grid.js';

/* ---------- two-layer maze: top layer without the key, bottom layer with it ---------- */

const keyMaze = world({
  layers: ['上层', '下层'],
  taps: {
    tu: cell('上层·上面', '上↑', [0, -1, 0]), tl: cell('上层·左边', '上←', [0, 0, -1]), bu: cell('下层·上面', '下↑', [1, -1, 0]), bl: cell('下层·左边', '下←', [1, 0, -1]),
    start: yes('是起点', '起', 'flag'), key: yes('是钥匙格', '钥', 'key'), door: yes('是门', '门', 'door'),
  },
  facts: ['start', 'key', 'door'],
  outs: [['top', '上层', [0, 0, 0]], ['bot', '下层', [1, 0, 0]]],
  here: (t, { r, c }) => [[r, c], [r, c]],
  keyAt: (t, L, r, c) => (inGrid(t, r, c) ? `${L}:${r},${c}` : null),
  mark(t, key) {
    const id = key.slice(2), isKey = id === t.key.join(','), door = t.doors.some(d => d.join(',') === id);
    return { corner: isKey ? '钥' : door ? '门' : id === '0,0' ? '起' : id === `${t.R - 1},${t.C - 1}` ? '终' : '', cls: isKey ? 'key' : door ? 'door' : '' };
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
  name: key => { const [L, id] = key.split(':'); return `${L === '1' ? '下层' : '上层'}的${rcName(id)}`; },
  label: t => `${t.R}×${t.C} · ${t.doors.length} 扇门`,
  orderText: () => ORDERS.rowTL.l,
  sample: () => ({ r: 1, c: 1, id: '1,1' }),
  scene(t, view, o = {}) {
    const g = look(view, keyMaze.answerKey(t), [], o.bench), sp = 62, sz = 54, gap = 82, layerY = L => L * (t.R * sp + gap);
    const cells = [], texts = [];
    [0, 1].forEach(L => {
      texts.push({ x: -sz / 2, y: layerY(L) - sz / 2 - 14, t: L ? '下层 · 有钥匙' : '上层 · 没钥匙', anchor: 'start', cls: 'hd' });
      for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
        const key = `${L}:${r},${c}`, m = keyMaze.mark(t, key);
        cells.push({ id: key, x: c * sp, y: layerY(L) + r * sp, w: sz, h: sz, value: g.val(key), label: m.cls === 'key' ? '钥匙' : m.cls === 'door' ? '门' : '', corner: m.cls ? '' : m.corner, cls: `${m.cls} ${g.cls(key)}`, tap: g.tap(key), aria: keyMaze.name(key) });
      }
    });
    return { cells, edges: g.arrows(rk => `${rk[0]}:${g.act.cell.id}`), texts, robot: g.robot ? [g.robot, `1${g.robot.slice(1)}`] : null };
  },
});

export { keyMaze };

/* ---------- many keys: one layer for every set of keys the state remembers ---------- */

export const KEY_COLORS = { red: { n: '红', cls: 'kred' }, blue: { n: '蓝', cls: 'kblue' }, green: { n: '绿', cls: 'kgreen' } };
const ORDER = Object.keys(KEY_COLORS);

/** Every set of the remembered colors, smallest first: the layers of the table. */
export function keyLayers(remember = []) {
  const cs = ORDER.filter(c => remember.includes(c)), sets = [];
  for (let m = 0; m < 1 << cs.length; m++) sets.push(cs.filter((_, k) => (m >> k) & 1));
  return sets.sort((a, b) => a.length - b.length);
}
export const layerName = set => (set.length ? set.map(c => KEY_COLORS[c].n).join('·') : '无钥匙');
const keyAtCell = (t, r, c) => Object.keys(t.keys).find(k => t.keys[k][0] === r && t.keys[k][1] === c) || null;
const doorAtCell = (t, r, c) => { const d = t.doors.find(x => x.at[0] === r && x.at[1] === c); return d ? d.color : null; };

/**
 * A maze with keys and doors of several colors. The state remembers a set of colors (o.remember); the table has one
 * layer for every set of remembered keys a route could hold. A door of a color the state forgets cannot be checked,
 * so it lets every route through; a key the state forgets is just a floor tile.
 * t = { R, C, keys: { color: [r, c] }, doors: [{ at: [r, c], color }] }; cells are { r, c, m } with m the layer.
 */
export const keysMaze = world({
  taps: {
    up: cell('本层·上面', '上', [0, -1, 0]), left: cell('本层·左边', '左', [0, 0, -1]),
    start: yes('是起点', '起', 'flag'), gain: yes('捡到本层的钥匙', '捡', 'key'), lose: yes('钥匙会把路线带走', '走', 'key'), shut: yes('门对本层关着', '关', 'door'),
    upPrev: cell('那层·上面', '那↑'), leftPrev: cell('那层·左边', '那←'),
  },
  facts: ['start', 'gain', 'lose', 'shut'],
  armTaps: ['upPrev', 'leftPrev'],
  outs: [['cell', '本层本格', [0, 0, 0]]],
  here: (t, { r, c }) => [[r, c]],
  keyAt: (t, L, r, c, x) => (inGrid(t, r, c) ? `${x ? x.m : 0}:${r},${c}` : null),
  winLabel: (t, x) => `${layerName(x.set)}这一层`,
  mark(t, key) {
    const [r, c] = key.split(':')[1].split(',').map(Number), k = keyAtCell(t, r, c), d = doorAtCell(t, r, c);
    if (k) return { cls: `key ${KEY_COLORS[k].cls}`, label: `${KEY_COLORS[k].n}钥匙` };
    if (d) return { cls: `door ${KEY_COLORS[d].cls}`, label: `${KEY_COLORS[d].n}门` };
    return { corner: r === 0 && c === 0 ? '起' : r === t.R - 1 && c === t.C - 1 ? '终' : '' };
  },
  fact(t, x, id, get, o) {
    const rem = o.remember || [], k = keyAtCell(t, x.r, x.c), d = doorAtCell(t, x.r, x.c), mine = k && rem.includes(k);
    switch (id) {
      case 'start': return x.r === 0 && x.c === 0 && !x.set.length;
      case 'gain': return !!mine && x.set.includes(k);
      case 'lose': return !!mine && !x.set.includes(k);
      case 'shut': return !!d && rem.includes(d) && !x.set.includes(d);
    }
    // The layer a route came from when it picked up this cell's key: the same keys, minus this one.
    if (!mine || !x.set.includes(k)) return null;
    const from = keyLayers(rem).findIndex(s => s.length === x.set.length - 1 && s.every(c => x.set.includes(c)));
    const [r, c] = id === 'upPrev' ? [x.r - 1, x.c] : [x.r, x.c - 1];
    return inGrid(t, r, c) ? get(`${from}:${r},${c}`) : null;
  },
  arm(t, x, o) {
    const rem = o.remember || [], k = keyAtCell(t, x.r, x.c), on = k && rem.includes(k) && x.set.includes(k);
    const from = on ? keyLayers(rem).findIndex(s => s.length === x.set.length - 1 && s.every(c => x.set.includes(c))) : -1;
    const at = (r, c) => (on && inGrid(t, r, c) ? `${from}:${r},${c}` : null);
    return { label: on ? `少一把${KEY_COLORS[k].n}钥匙的那层` : '只在捡钥匙的格子上才有', cells: [{ tap: 'upPrev', key: at(x.r - 1, x.c), label: '上面' }, { tap: 'leftPrev', key: at(x.r, x.c - 1), label: '左边' }] };
  },
  order(t, o) {
    const sets = keyLayers(o.remember), cells = [];
    for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) sets.forEach((set, m) => cells.push({ r, c, m, set, id: `${m}:${r},${c}` }));
    return cells;
  },
  keys: (t, x) => ({ cell: x.id }),
  where: x => `${layerName(x.set)}层的${rcName(`${x.r},${x.c}`)}`,
  answerKeys: (t, o) => keyLayers(o.remember).map((_, m) => `${m}:${t.R - 1},${t.C - 1}`),
  answer(t, table, o) { return this.answerKeys(t, o).reduce((s, k) => s + (table.get(k) ?? 0), 0); },
  name: key => { const [m, rc] = key.split(':'); return `第 ${+m + 1} 层的${rcName(rc)}`; },
  label: t => `${t.R}×${t.C} · ${Object.keys(t.keys).length} 把钥匙`,
  orderText: () => '逐行，每一格把每一层都算一遍',
  sample: () => ({ r: 1, c: 1, m: 0, set: [], id: '0:1,1' }),
  cellOf(t, key, o) { return this.order(t, o).find(x => x.id === key) || null; },
  scene(t, view, o = {}) {
    const sets = keyLayers(o.remember), g = look(view, this.answerKeys(t, o), [], o.bench), sp = 46, sz = 40;
    const cols = sets.length <= 2 ? sets.length : sets.length <= 4 ? 2 : 4, pw = t.C * sp + 34, ph = t.R * sp + 44, cells = [], texts = [];
    sets.forEach((set, m) => {
      const x0 = (m % cols) * pw, y0 = Math.floor(m / cols) * ph;
      texts.push({ x: x0 - sz / 2, y: y0 - sz / 2 - 12, t: `${layerName(set)}`, anchor: 'start', cls: 'hd' });
      for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
        const id = `${m}:${r},${c}`, mk = this.mark(t, id);
        cells.push({ id, x: x0 + c * sp, y: y0 + r * sp, w: sz, h: sz, value: g.val(id), label: mk.label ? mk.label.slice(0, 2) : '', corner: mk.corner || '', cls: `${mk.cls || ''} ${g.cls(id)}`, tap: g.tap(id), aria: this.name(id) });
      }
    });
    return { cells, edges: g.arrows(), texts, robot: g.robot };
  },
});
