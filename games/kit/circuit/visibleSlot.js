// Pick a root-board slot in reading order, preferring the visible scroll area over what follows it.
export function visibleSlot(slots, top, bottom, append) {
  const ordered = [...slots].sort((a, b) => a.top - b.top || a.slot - b.slot)
  return (ordered.find((s) => s.bottom > top && s.top < bottom)
    ?? ordered.find((s) => s.top >= bottom))?.slot ?? append
}
