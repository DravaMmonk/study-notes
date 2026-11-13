// The geometry of a grid of two rows read as arrows in the plane (games/DESIGN.md 6.9): each column a vector. Three
// views read it, each named by content (../../engine/views.js): `plane` every column an arrow from the origin;
// `carried` two columns as a 2 × 2 matrix, the landing places of the two unit arrows; `chain` the columns walked one
// after another, each arrow from the tip of the one before, and their sum from the origin.
//
// One frame holds every reading of a value: square, centred on the origin, reaching the columns and their running
// sums, at least two units from the origin; grid lines one unit apart until there would be too many, then every few.

const MIN_REACH = 2
const LINES = 8

/** The columns of a two-row grid, as [x, y] pairs. */
export const columns = (g) => Array.from({ length: g.w }, (_, j) => [g.data[j], g.data[g.w + j]])

/** Where each column ends when they are walked one after another: the running sums. */
export const tips = (cols) => {
  let [x, y] = [0, 0]
  return cols.map(([dx, dy]) => [(x += dx), (y += dy)])
}

/** How far from the origin the values reach, in any reading. */
export function extentOf(grids) {
  let far = 0
  for (const g of grids) {
    const cols = columns(g)
    for (const [x, y] of [...cols, ...tips(cols)]) far = Math.max(far, Math.abs(x), Math.abs(y))
  }
  return far
}

/** The frame that reaches `far`: how far it goes from the origin, and the step between its grid lines. */
export function frameOf(far) {
  const reach = Math.max(MIN_REACH, Math.ceil(far * 1.15))
  const step = Math.max(1, Math.ceil(reach / LINES))
  return { reach: Math.ceil(reach / step) * step, step }
}
