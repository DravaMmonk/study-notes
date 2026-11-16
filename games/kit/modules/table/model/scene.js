// Board scenes as data: { cells, edges, texts?, paths?, robot? } in board units (ui/svg.js draws them). The worlds draw
// their tables with these, and the intro figures (../items/figures.js) are built from them.

import { ROBOTS } from './robots.js';
import { T } from '../lang.js';

/** Words drawn on boards by several figures and worlds. */
export const W = {
  key: T('钥匙', 'key'), door: T('门', 'door'), start: T('起', 'S'), end: T('终', 'E'), empty: T('空', '∅'),
  capacity: T('容量', 'capacity'),
};

export const N = (id, x, y, o = {}) => ({ id, x, y, w: o.w || 84, h: o.h || 64, label: o.label, value: o.value ?? '', corner: o.corner, sub: o.sub, cls: o.cls || '' });
export const E = (a, b, cls = 'idle', bend = 0, off = 0) => ({ a, b, cls, bend, off });

/* ---------- shapes the intro figures use ---------- */

export function gridScene(R, C, opt = {}) {
  const sp = opt.sp || 66, sz = opt.sz || 56, cells = [], edges = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const id = `${r},${c}`, o = (opt.cell && opt.cell(r, c)) || {};
    cells.push({ id, x: c * sp, y: r * sp, w: sz, h: sz, value: o.value ?? '', corner: o.corner, label: o.label, cls: o.cls || '' });
    if (opt.arrows !== false) {
      if (c + 1 < C) edges.push(E(id, `${r},${c + 1}`, (opt.edge && opt.edge(id, `${r},${c + 1}`)) || 'dim'));
      if (r + 1 < R) edges.push(E(id, `${r + 1},${c}`, (opt.edge && opt.edge(id, `${r + 1},${c}`)) || 'dim'));
    }
  }
  return { cells, edges };
}


/**
 * A small circuit diagram for intro pages: probes on top, components in rows, outputs at the bottom.
 * spec = { taps: [[id, label, kind?, glyph?]], parts: [[id, name, tag?, row?]], outs: [[id, label, glyph?]], wires: [[from, to, kind?]] }
 */
export function circuitFig(spec) {
  const colW = 118, rowH = 104, cells = [], partRows = Math.max(1, ...spec.parts.map(p => (p[3] || 0) + 1));
  const place = (list, y, mk) => list.forEach((it, k) => cells.push(mk(it, (k - (list.length - 1) / 2) * colW, y)));
  place(spec.taps, 0, ([id, l, kind, icon], x, y) => ({ id, x, y, w: 100, h: icon ? 72 : 40, value: l, icon, cls: `ctap${kind === 'bool' ? ' bool' : ''}` }));
  for (let r = 0; r < partRows; r++) {
    place(spec.parts.filter(p => (p[3] || 0) === r), rowH * (r + 1), ([id, name, tag], x, y) => ({ id, x, y, w: 104, h: tag ? 58 : 48, label: name, sub: tag, cls: 'cpartf' }));
  }
  place(spec.outs, rowH * (partRows + 1), ([id, l, icon], x, y) => ({ id, x, y, w: 100, h: icon ? 72 : 40, value: l, icon, cls: 'coutf' }));
  return { cells, edges: spec.wires.map(([a, b, kind]) => E(a, b, kind === 'bool' ? 'sel' : kind === 'off' ? 'dim' : 'hot')) };
}



const AROUND = [['ul', 'up', 'ur'], ['left', 'self', 'right'], ['dl', 'down', 'dr']];

/** The robot's 3×3 window: `vals` by position name, `on` lists the lit (input) cells; the center is the robot's cell. */
export function windowFig(vals = {}, on = []) {
  const cells = [];
  AROUND.forEach((row, r) => row.forEach((k, c) => cells.push({ id: k, x: c * 62, y: r * 62, w: 54, h: 54, value: vals[k] ?? '', cls: k === 'self' ? 'self' : on.includes(k) ? 'on' : 'dimc' })));
  return { cells, edges: [], robot: 'self' };
}

/** A robot model standing in the middle of its field of view. */
export function visionFig(model) {
  const r = ROBOTS[model], n = 2 * r.vision + 1, sp = n === 3 ? 62 : 48, sz = sp - 8, cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const self = x === r.vision && y === r.vision;
    cells.push({ id: self ? 'self' : `${y},${x}`, x: x * sp, y: y * sp, w: sz, h: sz, value: '', cls: self ? 'self' : 'on' });
  }
  return { cells, edges: [], robot: 'self', look: r.look };
}
