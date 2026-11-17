import { ROBOTS } from './robots.js'
import { T } from 'table'
export { N, E, gridScene, circuitFig, windowFig } from 'table'
/** Words drawn on boards by several figures and worlds. */
export const W = {
  key: T('钥匙', 'key'), door: T('门', 'door'), start: T('起', 'S'), end: T('终', 'E'), empty: T('空', '∅'),
  capacity: T('容量', 'capacity'),
};

/** A robot model standing in the middle of its field of view. */
export function visionFig(model) {
  const r = ROBOTS[model], n = 2 * r.vision + 1, sp = n === 3 ? 62 : 48, sz = sp - 8, cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const self = x === r.vision && y === r.vision;
    cells.push({ id: self ? 'self' : `${y},${x}`, x: x * sp, y: y * sp, w: sz, h: sz, value: '', cls: self ? 'self' : 'on' });
  }
  return { cells, edges: [], robot: 'self', look: r.look };
}
