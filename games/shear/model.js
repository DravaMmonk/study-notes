// The shear rack's motion, shared by build.mjs (the poses it proves) and the live page (inlined into shear.js). The
// grid's rows are bars on ledges, one above another; a fence hinged at the bottom row leans by an angle θ and pushes
// each bar along by its height above that row times k = tan θ, so the rack carries out x' = x + k·y, the matrix
// [[1, k], [0, 1]]: the bottom row (the x-axis) stays put and the line the bars' marks make leans over as ĵ does.
// The turntable under the rack turns the whole sheared grid as one, a rotation after the shear.

export const PITCH = 9;
export const ROWS = 5;
export const KMAX = 0.36;

// Every group's value for a turntable angle (degrees) and a shear k in [0, KMAX].
export function pose(turn, k) {
  const out = { table: turn, fence: (Math.atan(k) * 180) / Math.PI };
  for (let i = 1; i < ROWS; i++) out[`row.${i}`] = i * PITCH * k;
  return out;
}

// The tour, in seconds: lean the fence, turn the table once round with the grid sheared, stand the fence up again.
export const PERIOD = 13;
const smooth = (x) => x * x * (3 - 2 * x);
const span = (t, a, b) => smooth(Math.min(1, Math.max(0, (t - a) / (b - a))));
export const tourAt = (t) => {
  const loop = Math.floor(t / PERIOD);
  const s = t - loop * PERIOD;
  return { turn: 360 * (loop + span(s, 3.4, 9.4)), k: KMAX * (span(s, 0.8, 2.6) - span(s, 10.2, 12)) };
};
