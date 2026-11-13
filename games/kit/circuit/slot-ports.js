/** Resolve overlapping touch targets by distance to the port centers, in board order on ties. */
export function slotPortAt(element, x, y) {
  const board = element?.closest('.pb-board')
  if (!board || element.closest('button:not([data-p]), a, input, select, textarea')) return null
  let nearest = null
  let distance = Infinity
  for (const port of board.querySelectorAll('.pb-dot[data-p]')) {
    const { left, right, top, bottom, width, height } = port.getBoundingClientRect()
    if (!width || !height || x < left || x >= right || y < top || y >= bottom) continue
    const squared = (x - left - width / 2) ** 2 + (y - top - height / 2) ** 2
    if (squared >= distance) continue
    distance = squared
    nearest = port
  }
  return nearest
}
