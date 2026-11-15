/** Map a value to a vertical plot coordinate, clipping it to the displayed axis. */
export function plotY(lo, hi, top, bottom) {
  return (value) => top + (1 - (Math.min(hi, Math.max(lo, value)) - lo) / (hi - lo || 1)) * (bottom - top)
}

/** Draw finite samples as a continuous SVG path, lifting the pen at missing samples. */
export function linePath(values, x, y) {
  let path = ''
  let pen = false
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]
    if (!Number.isFinite(value)) {
      pen = false
      continue
    }
    path += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(value).toFixed(1)}`
    pen = true
  }
  return path
}
