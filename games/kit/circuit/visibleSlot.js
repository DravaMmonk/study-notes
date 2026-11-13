// Pick the topmost, leftmost visible slot that can take the part, including slots inside frames.
export function visibleSlot(slots, bounds, accepts = () => true) {
  if (bounds.top >= bounds.bottom || bounds.left >= bounds.right) return undefined
  return slots.filter((s) => s.bottom > bounds.top && s.top < bounds.bottom && s.right > bounds.left && s.left < bounds.right)
    .sort((a, b) => a.top - b.top || a.left - b.left).find(accepts)
}
