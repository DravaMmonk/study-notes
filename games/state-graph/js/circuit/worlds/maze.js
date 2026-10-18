// Mazes with keys and doors, as tables stacked in layers.

import { ORDERS, rcName } from '../../algo.js';
import { W } from '../../svg.js';
import { T, tr, lazy } from '../../i18n.js';
import { world, look, cell, yes, cat, DIR } from '../world.js';
import { inGrid } from './grid.js';

/**
 * How a board of several layers lays them out: as many side by side as fit `width` px (cells no smaller than READABLE
 * px), then wrapped into rows that hold the same number where they can (8 layers with room for 5 → 4 + 4). Without a
 * width (a phone, a figure), a compact block: rows of two, rows of four from 8 layers up.
 */
const READABLE = 34;
export function layerGrid(n, layerW, cellW, width) {
  const fit = width ? Math.floor(width / (layerW * READABLE / cellW)) : n <= 2 ? n : n <= 4 ? 2 : 4;
  const rows = Math.ceil(n / Math.max(1, Math.min(n, fit)));
  return Math.ceil(n / rows);
}

export const KEY_COLORS = { red: { n: T('红', 'red'), cls: 'kred' }, blue: { n: T('蓝', 'blue'), cls: 'kblue' }, green: { n: T('绿', 'green'), cls: 'kgreen' } };

/* ---------- layers the player builds: 千层 on a table of as many layers as the circuit asks for ---------- */

/** A maze test in one shape: one key and its doors ({ key, doors: [[r, c]] }) becomes a 'plain' key and plain doors. */
const asKeys = t => (t.keys ? t : { ...t, keys: { plain: t.key }, doors: t.doors.map(at => ({ at, color: 'plain' })) });
const PLAIN = { n: T('', ''), cls: '' };
const COLOR_CATS = Object.entries(KEY_COLORS).map(([c, { n }]) => [c, n]);
const colorOf = c => KEY_COLORS[c] || PLAIN;
/** Facts about the robot's own cell: plain ones for a maze with one key, one pair per colour for a maze with several. */
const keyFacts = () => {
  const f = { key: yes(T('这格有钥匙', 'key here'), T('钥', 'key'), 'key'), door: yes(T('这格是门', 'door here'), T('门', 'door'), 'door') };
  Object.entries(KEY_COLORS).forEach(([c, { n }]) => {
    f[`key_${c}`] = yes(lazy(() => tr(`这格有${n}钥匙`, `${n} key here`)), lazy(() => tr(`${n}钥`, `${n} K`)), 'key');
    f[`door_${c}`] = yes(lazy(() => tr(`这格是${n}门`, `${n} door here`)), lazy(() => tr(`${n}门`, `${n} D`)), 'door');
  });
  return f;
};
const layerCount = o => Math.max(1, Math.min(o.maxLayers || 8, o.layers || 1));
const END = t => `${t.R - 1},${t.C - 1}`;
/** The layers ticked on the board: the answer is their end cells added up (layer 0 until the player ticks others). */
const picksOf = o => [...new Set(o.answerLayers || [0])].filter(m => Number.isInteger(m) && m >= 0 && m < layerCount(o)).sort((a, b) => a - b);

/**
 * A maze of keys and doors on a table the player stacks in layers. Nothing about a layer is built in: the circuit
 * runs on every layer of every cell (row by row; on each cell layer 0, then 1, …), knows which layer it is on
 * (本层号), and reads any layer through layered view readers. What a layer means is up to the circuit. The player ticks, on the
 * board, the layers whose end cells add up to the answer (o.answerLayers).
 * t = { R, C, keys: { color: [r, c] }, doors: [{ at: [r, c], color }] }, or { R, C, key: [r, c], doors: [[r, c]] }.
 */
export const layerMaze = world({
  sensors: {
    up: cell(...DIR.up, [-1, 0]), left: cell(...DIR.left, [0, -1]),
    start: yes(T('是起点', 'is start'), T('起', 'start'), 'flag'), end: yes(T('是终点', 'is end'), T('终', 'end'), 'goal'),
    layer: { label: T('本层号', 'this layer’s number'), short: T('层', 'L'), type: 'num', icon: 'layers' },
    ...keyFacts(),
    // The colour of this cell's key or door as one reading, however many colours there are (「—」 for none).
    keyColor: cat(T('这格钥匙的颜色', 'colour of the key here'), T('钥色', 'K col'), COLOR_CATS, 'key'),
    doorColor: cat(T('这格门的颜色', 'colour of the door here'), T('门色', 'D col'), COLOR_CATS, 'door'),
  },
  facts: ['start', 'end', 'layer', 'key', 'door'],
  outs: [['cell', T('本层本格', 'this cell'), [0, 0, 0]]],
  layered: true,
  here: (t, { r, c }) => [r, c],
  keyAt: (t, r, c, x) => (inGrid(t, r, c) ? `${x ? x.m : 0}:${r},${c}` : null),
  winLabel: (t, x) => tr(`层 ${x.m}`, `layer ${x.m}`),
  mark(t, key) {
    t = asKeys(t);
    const [r, c] = key.split(':')[1].split(',').map(Number), k = keyAtCell(t, r, c), d = doorAtCell(t, r, c);
    if (k) return { cls: `key ${colorOf(k).cls}`, mark: 'key', label: lazy(() => tr(`${colorOf(k).n}钥匙`, `${colorOf(k).n} key`)) };
    if (d) return { cls: `door ${colorOf(d).cls}`, mark: 'door', label: lazy(() => tr(`${colorOf(d).n}门`, `${colorOf(d).n} door`)) };
    return { mark: r === 0 && c === 0 ? 'start' : `${r},${c}` === END(t) ? 'end' : null };
  },
  sense(t, x, id) {
    t = asKeys(t);
    const k = keyAtCell(t, x.r, x.c), d = doorAtCell(t, x.r, x.c);
    if (id === 'start') return x.r === 0 && x.c === 0;
    if (id === 'end') return `${x.r},${x.c}` === END(t);
    if (id === 'layer') return x.m;
    if (id === 'key') return !!k;
    if (id === 'door') return !!d;
    if (id.startsWith('key_')) return k === id.slice(4);
    if (id.startsWith('door_')) return d === id.slice(5);
    if (id === 'keyColor') return k && k !== 'plain' ? { cat: k, label: colorOf(k).n } : null;
    if (id === 'doorColor') return d && d !== 'plain' ? { cat: d, label: colorOf(d).n } : null;
    return null;
  },
  /** A board cell around the robot on its own layer ('self') or on layer `layer`; 「—」 off the board or the table. */
  view(t, x, layer, dr, dc, get, o) {
    if (layer === 'self') layer = x.m;
    if (!Number.isInteger(layer) || layer < 0 || layer >= layerCount(o)) return null;
    const r = x.r + dr, c = x.c + dc;
    return inGrid(t, r, c) ? get(`${layer}:${r},${c}`) : null;
  },
  order(t, o) {
    const n = layerCount(o), cells = [];
    for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) for (let m = 0; m < n; m++) cells.push({ r, c, m, id: `${m}:${r},${c}` });
    return cells;
  },
  keys: (t, x) => ({ cell: x.id }),
  where: x => tr(`层 ${x.m} 的${rcName(`${x.r},${x.c}`)}`, `${rcName(`${x.r},${x.c}`)} on layer ${x.m}`),
  answerKeys: (t, o) => picksOf(o).map(m => `${m}:${END(t)}`),
  answer(t, table, o) { const picks = picksOf(o); return picks.length ? picks.reduce((sum, m) => sum + (table.get(`${m}:${END(t)}`) ?? 0), 0) : null; },
  name: key => { const [m, rc] = key.split(':'); return tr(`层 ${m} 的${rcName(rc)}`, `${rcName(rc)} on layer ${m}`); },
  label: t => { t = asKeys(t); return tr(`${t.R}×${t.C} · ${t.doors.length} 扇门`, `${t.R}×${t.C} · ${t.doors.length} door${t.doors.length > 1 ? 's' : ''}`); },
  orderText: () => tr('逐行，每一格把每一层都算一遍', 'row by row, working out every layer of each cell'),
  sample: () => ({ r: 1, c: 1, m: 0, id: '0:1,1' }),
  cellOf(t, key, o) { return this.order(t, o).find(x => x.id === key) || null; },
  scene(t, view, o = {}) {
    const n = layerCount(o), picks = picksOf(o);
    const g = look(view, picks.map(m => `${m}:${END(t)}`), [], o.bench), sp = 46, sz = 40;
    const pw = t.C * sp + 34, ph = t.R * sp + 44, cols = layerGrid(n, pw, sz, o.boardWidth), cells = [], texts = [];
    for (let m = 0; m < n; m++) {
      const x0 = (m % cols) * pw, y0 = Math.floor(m / cols) * ph, y = y0 - sz / 2 - 12;
      texts.push({ x: x0 - sz / 2, y, t: lazy(() => tr(`层 ${m}`, `layer ${m}`)), anchor: 'start', cls: 'hd' });
      // A tick box at the heading's right end: the ticked layers' end cells add up to the answer.
      if (n > 1) texts.push({ tick: true, x: x0 + (t.C - 1) * sp + sz / 2 - 13, y, act: 'answer', v: m, on: picks.includes(m), aria: lazy(() => tr(`层 ${m} 的终点算进答案`, `Count layer ${m}’s end cell in the answer`)) });
      for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
        const id = `${m}:${r},${c}`, mk = this.mark(t, id);
        cells.push({ id, x: x0 + c * sp, y: y0 + r * sp, w: sz, h: sz, value: g.val(id), mark: mk.mark, cls: `${mk.cls || ''} ${g.cls(id)}`, tap: g.tap(id), aria: this.name(id) });
      }
    }
    return { cells, edges: g.arrows(), texts, robot: g.robot };
  },
});
const keyAtCell = (t, r, c) => Object.keys(t.keys).find(k => t.keys[k][0] === r && t.keys[k][1] === c) || null;
const doorAtCell = (t, r, c) => { const d = t.doors.find(x => x.at[0] === r && x.at[1] === c); return d ? d.color : null; };

/* ---------- 千层: one layer for every set of keys the level's state remembers ---------- */

const ORDER = Object.keys(KEY_COLORS);
/** A maze with one key and its doors ({ key, doors: [[r, c]] }) is a red key with red doors. */
const asColored = t => (t.keys ? t : { ...t, keys: { red: t.key }, doors: t.doors.map(at => ({ at, color: 'red' })) });
/** Every set of the remembered colours, smallest first: the layers of the table. */
export function keyLayers(remember = []) {
  const cs = ORDER.filter(c => remember.includes(c)), sets = [];
  for (let m = 0; m < 1 << cs.length; m++) sets.push(cs.filter((_, k) => (m >> k) & 1));
  return sets.sort((a, b) => a.length - b.length);
}
export const layerName = set => (set.length ? set.map(c => KEY_COLORS[c].n).join('·') : tr('无钥匙', 'no keys'));
/** The layer a route on layer `set` came from when it picked up key `k`: the same keys, minus that one. */
const fromLayer = (rem, set, k) => keyLayers(rem).findIndex(s => s.length === set.length - 1 && s.every(c => set.includes(c)) && !s.includes(k));

/**
 * A maze with keys and doors of several colours, on 千层. The level fixes which keys the state remembers
 * (o.remember); the table has one layer for every set of remembered keys a route could hold. The robot reads its own
 * layer's 3×3, facts about its cell (picks up a key here, routes move on from here, the door is shut), and, where it
 * picks up a key, its arm probes two cells of the layer the routes come from: up and left there. A door of a colour
 * the state does not remember lets every route through; a key it does not remember is just floor.
 * t = { R, C, keys: { colour: [r, c] }, doors: [{ at: [r, c], colour }] } (or one key: { R, C, key, doors }).
 */
export const keysMaze = world({
  sensors: {
    up: cell(...DIR.up, [-1, 0]), left: cell(...DIR.left, [0, -1]),
    start: yes(T('是起点', 'is start'), T('起', 'start'), 'flag'), gain: yes(T('捡到钥匙', 'picks up key'), T('捡', 'pick'), 'key'), lose: yes(T('路线被带走', 'routes move on'), T('走', 'gone'), 'key'), shut: yes(T('门关着', 'door shut'), T('关', 'shut'), 'door'),
    upPrev: cell(T('那层·上面', 'that layer·up'), T('那↑', 'that↑')), leftPrev: cell(T('那层·左边', 'that layer·left'), T('那←', 'that←')),
  },
  facts: ['start', 'gain', 'lose', 'shut'],
  armSensors: ['upPrev', 'leftPrev'],
  outs: [['cell', T('本层本格', 'this cell'), [0, 0, 0]]],
  here: (t, { r, c }) => [r, c],
  keyAt: (t, r, c, x) => (inGrid(t, r, c) ? `${x ? x.m : 0}:${r},${c}` : null),
  winLabel: (t, x) => tr(`${layerName(x.set)}这一层`, `layer: ${layerName(x.set)}`),
  mark(t, key) {
    t = asColored(t);
    const [r, c] = key.split(':')[1].split(',').map(Number), k = keyAtCell(t, r, c), d = doorAtCell(t, r, c);
    if (k) return { cls: `key ${KEY_COLORS[k].cls}`, mark: 'key', label: lazy(() => tr(`${KEY_COLORS[k].n}钥匙`, `${KEY_COLORS[k].n} key`)) };
    if (d) return { cls: `door ${KEY_COLORS[d].cls}`, mark: 'door', label: lazy(() => tr(`${KEY_COLORS[d].n}门`, `${KEY_COLORS[d].n} door`)) };
    return { mark: r === 0 && c === 0 ? 'start' : r === t.R - 1 && c === t.C - 1 ? 'end' : null };
  },
  sense(t, x, id, get, o) {
    t = asColored(t);
    const rem = o.remember || [], k = keyAtCell(t, x.r, x.c), d = doorAtCell(t, x.r, x.c), mine = k && rem.includes(k);
    switch (id) {
      case 'start': return x.r === 0 && x.c === 0 && !x.set.length;
      case 'gain': return !!mine && x.set.includes(k);
      case 'lose': return !!mine && !x.set.includes(k);
      case 'shut': return !!d && rem.includes(d) && !x.set.includes(d);
    }
    if (!mine || !x.set.includes(k)) return null;
    const [r, c] = id === 'upPrev' ? [x.r - 1, x.c] : [x.r, x.c - 1];
    return inGrid(t, r, c) ? get(`${fromLayer(rem, x.set, k)}:${r},${c}`) : null;
  },
  arm(t, x, o) {
    t = asColored(t);
    const rem = o.remember || [], k = keyAtCell(t, x.r, x.c), on = k && rem.includes(k) && x.set.includes(k), from = on ? fromLayer(rem, x.set, k) : -1;
    const at = (r, c) => (on && inGrid(t, r, c) ? `${from}:${r},${c}` : null);
    return { label: on ? tr(`少一把${KEY_COLORS[k].n}钥匙的那层`, `the layer with no ${KEY_COLORS[k].n} key`) : tr('只在捡钥匙的格子上才有', 'only on cells where a key is picked up'), cells: [{ sensor: 'upPrev', key: at(x.r - 1, x.c), label: tr('上面', 'up') }, { sensor: 'leftPrev', key: at(x.r, x.c - 1), label: tr('左边', 'left') }] };
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
  label: t => { t = asColored(t); return tr(`${t.R}×${t.C} · ${Object.keys(t.keys).length} 把钥匙 · ${t.doors.length} 扇门`, `${t.R}×${t.C} · ${Object.keys(t.keys).length} key${Object.keys(t.keys).length > 1 ? 's' : ''} · ${t.doors.length} door${t.doors.length > 1 ? 's' : ''}`); },
  orderText: () => tr('逐行，每一格把每一层都算一遍', 'row by row, working out every layer of each cell'),
  sample: () => ({ r: 1, c: 1, m: 0, set: [], id: '0:1,1' }),
  cellOf(t, key, o) { return this.order(t, o).find(x => x.id === key) || null; },
  scene(t, view, o = {}) {
    const sets = keyLayers(o.remember), g = look(view, this.answerKeys(t, o), [], o.bench), sp = 46, sz = 40;
    const pw = t.C * sp + 34, ph = t.R * sp + 44, cols = layerGrid(sets.length, pw, sz, o.boardWidth), cells = [], texts = [];
    sets.forEach((set, m) => {
      const x0 = (m % cols) * pw, y0 = Math.floor(m / cols) * ph;
      texts.push({ x: x0 - sz / 2, y: y0 - sz / 2 - 12, t: layerName(set), anchor: 'start', cls: 'hd' });
      for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
        const id = `${m}:${r},${c}`, mk = this.mark(t, id);
        cells.push({ id, x: x0 + c * sp, y: y0 + r * sp, w: sz, h: sz, value: g.val(id), mark: mk.mark, cls: `${mk.cls || ''} ${g.cls(id)}`, tap: g.tap(id), aria: this.name(id) });
      }
    });
    return { cells, edges: g.arrows(), texts, robot: g.robot };
  },
});
