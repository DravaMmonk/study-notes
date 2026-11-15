// How the kit writes a number wherever a player reads one (games/DESIGN.md 6.9): rounded to a few decimals, trailing
// zeros dropped, never the noise of its binary form — 0.1 + 0.1 + 0.1 reads 0.3, not 0.30000000000000004 — and −0
// reads 0. NaN and the infinities are written as they are.
export function numberText(v, digits = 4) {
  if (!Number.isFinite(v)) return String(v)
  const r = Number(v.toFixed(digits))
  return String(Object.is(r, -0) ? 0 : r)
}

/** Bounds of the finite numbers across rows or series, or null when there are none. */
export function finiteExtent(series) {
  let lo = Infinity
  let hi = -Infinity
  for (const row of series) {
    for (const value of row ?? []) {
      if (!Number.isFinite(value)) continue
      if (value < lo) lo = value
      if (value > hi) hi = value
    }
  }
  return lo <= hi ? { lo, hi } : null
}

/** A numeric reading differs by an unbounded amount if either value is invalid. */
export const numberError = (a, b) => Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) : Infinity

/** Tests include the tolerance boundary; invalid readings never match. */
export const withinTolerance = (error, tolerance = 0) => Number.isFinite(error) && error <= tolerance
