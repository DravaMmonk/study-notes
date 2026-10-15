// Intro figures shared by circuit levels.

const AROUND = [['ul', 'up', 'ur'], ['left', 'self', 'right'], ['dl', 'down', 'dr']];

/** The robot's 3×3 window: `vals` by position name, `on` lists the lit (input) cells; the center is the robot's cell. */
export function windowFig(vals = {}, on = []) {
  const cells = [];
  AROUND.forEach((row, r) => row.forEach((k, c) => cells.push({ id: k, x: c * 62, y: r * 62, w: 54, h: 54, value: vals[k] ?? '', cls: k === 'self' ? 'self' : on.includes(k) ? 'on' : 'dimc' })));
  return { cells, edges: [], robot: 'self' };
}
