// Pick the topmost, leftmost root-board slot intersecting the visible area.
export function visibleSlot(slots, bounds) {
  if (bounds.top >= bounds.bottom || bounds.left >= bounds.right) return undefined
  return slots.filter((s) => s.bottom > bounds.top && s.top < bounds.bottom && s.right > bounds.left && s.left < bounds.right)
    .sort((a, b) => a.top - b.top || a.left - b.left)[0]?.slot
}
