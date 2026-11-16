/** The occupied cells of a slot grid, including every cell a wide or tall card covers. */
export function slotGrid(columns) {
  const used = new Set()
  let last = -1
  const cellsOf = (at, [width, height]) => {
    const column = at % columns
    if (column + width > columns) return null
    return Array.from({ length: width * height }, (_, index) => at + Math.floor(index / width) * columns + index % width)
  }
  const fits = (at, span) => cellsOf(at, span)?.every((cell) => !used.has(cell))
  const take = (at, span) => {
    for (const cell of cellsOf(at, span)) {
      used.add(cell)
      last = Math.max(last, cell)
    }
  }
  const firstFree = (span, start = 0) => {
    let at = start
    while (!fits(at, span)) at += 1
    return at
  }
  return { fits, take, firstFree, has: (at) => used.has(at), get last() { return last } }
}
