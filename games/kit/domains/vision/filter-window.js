/** The three samples addressed by a positional 1D kernel, for inspection and automatic arithmetic. */
export function filterWindow(rows, { weights, axis }, x, y) {
  return [-1, 0, 1].map((offset, i) => {
    const sx = x + (axis === 'row' ? offset : 0)
    const sy = y + (axis === 'column' ? offset : 0)
    const outside = sy < 0 || sy >= rows.length || sx < 0 || sx >= rows[0].length
    return { x: sx, y: sy, outside, value: outside ? 0 : rows[sy][sx], weight: weights[i] }
  })
}

/** The complete stencil output used by content validation. */
export function windowResult(rows, window) {
  const margin = window.padding === 'valid' ? 1 : 0
  const row = window.axis === 'row'
  const width = rows[0].length - (row ? 2 * margin : 0)
  const height = rows.length - (row ? 0 : 2 * margin)
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) =>
    filterWindow(rows, window, x + (row ? margin : 0), y + (row ? 0 : margin)).reduce((sum, f) => sum + f.value * f.weight, 0)))
}
