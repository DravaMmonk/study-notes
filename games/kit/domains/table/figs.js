// Intro figures shared by circuit levels.

import { ROBOTS } from './circuit/robots.js';

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
