// How the kit writes a number wherever a player reads one (games/DESIGN.md 6.10): rounded to a few decimals, trailing
// zeros dropped, never the noise of its binary form — 0.1 + 0.1 + 0.1 reads 0.3, not 0.30000000000000004 — and −0
// reads 0. NaN and the infinities are written as they are.
export function numberText(v, digits = 4) {
  if (!Number.isFinite(v)) return String(v)
  const r = Number(v.toFixed(digits))
  return String(Object.is(r, -0) ? 0 : r)
}
