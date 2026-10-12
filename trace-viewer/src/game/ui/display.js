// How to map values to grey: plain 0…1 images as they are, signed images around mid-grey,
// larger values (like disparities) scaled by their maximum.
export function rangeOf(img) {
  if (!img) return { lo: 0, hi: 1 }
  let min = Infinity
  let max = -Infinity
  for (const v of img.data) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min >= -0.02 && max <= 1.02) return { lo: 0, hi: 1 }
  if (min < -0.02) {
    const m = Math.max(Math.abs(min), Math.abs(max), 1e-6)
    return { lo: -m, hi: m }
  }
  return { lo: 0, hi: Math.max(max, 1e-6) }
}
