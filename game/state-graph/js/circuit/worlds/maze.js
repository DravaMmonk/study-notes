// Mazes with keys and doors, as tables stacked in layers.

import { ORDERS, rcName } from '../../algo.js';
import { W } from '../../svg.js';
import { T, tr } from '../../i18n.js';
import { world, look, cell, yes } from '../world.js';
import { inGrid } from './grid.js';

/* ---------- two-layer maze: top layer without the key, bottom layer with it ---------- */

const UPPER = T('上层', 'Upper'), LOWER = T('下层', 'Lower'), START = yes(T('是起点', 'is start'), T('起', 'start'), 'flag');

const keyMaze = world({
  layers: [UPPER, LOWER],
  taps: {
    tu: cell(T('上层·上面', 'upper·up'), T('上↑', 'U↑'), [0, -1, 0]), tl: cell(T('上层·左边', 'upper·left'), T('上←', 'U←'), [0, 0, -1]),
    bu: cell(T('下层·上面', 'lower·up'), T('下↑', 'L↑'), [1, -1, 0]), bl: cell(T('下层·左边', 'lower·left'), T('下←', 'L←'), [1, 0, -1]),
    start: START, key: yes(T('是钥匙格', 'is key'), T('钥', 'key'), 'key'), door: yes(T('是门', 'is door'), T('门', 'door'), 'door'),
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

export { keyMaze };

/* ---------- many keys: one layer for every set of keys the state remembers ---------- */

export const KEY_COLORS = { red: { n: T('红', 'red'), cls: 'kred' }, blue: { n: T('蓝', 'blue'), cls: 'kblue' }, green: { n: T('绿', 'green'), cls: 'kgreen' } };
const ORDER = Object.keys(KEY_COLORS);

/** Every set of the remembered colors, smallest first: the layers of the table. */
export function keyLayers(remember = []) {
  const cs = ORDER.filter(c => remember.includes(c)), sets = [];
  for (let m = 0; m < 1 << cs.length; m++) sets.push(cs.filter((_, k) => (m >> k) & 1));
  return sets.sort((a, b) => a.length - b.length);
}
export const layerName = set => (set.length ? set.map(c => KEY_COLORS[c].n).join('·') : tr('无钥匙', 'no keys'));
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
    up: cell(T('本层·上面', 'this layer·up'), T('上', 'up'), [0, -1, 0]), left: cell(T('本层·左边', 'this layer·left'), T('左', 'left'), [0, 0, -1]),
    start: START, gain: yes(T('捡到钥匙', 'picks up key'), T('捡', 'pick'), 'key'), lose: yes(T('路线被带走', 'routes move on'), T('走', 'gone'), 'key'), shut: yes(T('门关着', 'door shut'), T('关', 'shut'), 'door'),
    upPrev: cell(T('那层·上面', 'that layer·up'), T('那↑', 'that↑')), leftPrev: cell(T('那层·左边', 'that layer·left'), T('那←', 'that←')),
  },
  facts: ['start', 'gain', 'lose', 'shut'],
  armTaps: ['upPrev', 'leftPrev'],
  outs: [['cell', T('本层本格', 'this cell'), [0, 0, 0]]],
  here: (t, { r, c }) => [[r, c]],
  keyAt: (t, L, r, c, x) => (inGrid(t, r, c) ? `${x ? x.m : 0}:${r},${c}` : null),
  winLabel: (t, x) => tr(`${layerName(x.set)}这一层`, `layer: ${layerName(x.set)}`),
  mark(t, key) {
    const [r, c] = key.split(':')[1].split(',').map(Number), k = keyAtCell(t, r, c), d = doorAtCell(t, r, c);
    if (k) return { cls: `key ${KEY_COLORS[k].cls}`, label: tr(`${KEY_COLORS[k].n}钥匙`, `${KEY_COLORS[k].n} key`), tag: tr(`${KEY_COLORS[k].n}钥`, 'K') };
    if (d) return { cls: `door ${KEY_COLORS[d].cls}`, label: tr(`${KEY_COLORS[d].n}门`, `${KEY_COLORS[d].n} door`), tag: tr(`${KEY_COLORS[d].n}门`, 'D') };
    return { corner: r === 0 && c === 0 ? W.start : r === t.R - 1 && c === t.C - 1 ? W.end : '' };
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
    return { label: on ? tr(`少一把${KEY_COLORS[k].n}钥匙的那层`, `the layer with no ${KEY_COLORS[k].n} key`) : tr('只在捡钥匙的格子上才有', 'only on cells where a key is picked up'), cells: [{ tap: 'upPrev', key: at(x.r - 1, x.c), label: tr('上面', 'up') }, { tap: 'leftPrev', key: at(x.r, x.c - 1), label: tr('左边', 'left') }] };
  },
  order(t, o) {
    const sets = keyLayers(o.remember), cells = [];
    for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) sets.forEach((set, m) => cells.push({ r, c, m, set, id: `${m}:${r},${c}` }));
    return cells;
  },
  keys: (t, x) => ({ cell: x.id }),
  where: x => tr(`${layerName(x.set)}层的${rcName(`${x.r},${x.c}`)}`, `${rcName(`${x.r},${x.c}`)} on the ${layerName(x.set)} layer`),
  answerKeys: (t, o) => keyLayers(o.remember).map((_, m) => `${m}:${t.R - 1},${t.C - 1}`),
  answer(t, table, o) { return this.answerKeys(t, o).reduce((s, k) => s + (table.get(k) ?? 0), 0); },
  name: key => { const [m, rc] = key.split(':'); return tr(`第 ${+m + 1} 层的${rcName(rc)}`, `${rcName(rc)} on layer ${+m + 1}`); },
  label: t => tr(`${t.R}×${t.C} · ${Object.keys(t.keys).length} 把钥匙`, `${t.R}×${t.C} · ${Object.keys(t.keys).length} keys`),
  orderText: () => tr('逐行，每一格把每一层都算一遍', 'row by row, working out every layer of each cell'),
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
        cells.push({ id, x: x0 + c * sp, y: y0 + r * sp, w: sz, h: sz, value: g.val(id), label: mk.tag || '', corner: mk.corner || '', cls: `${mk.cls || ''} ${g.cls(id)}`, tap: g.tap(id), aria: this.name(id) });
      }
    });
    return { cells, edges: g.arrows(), texts, robot: g.robot };
  },
});
