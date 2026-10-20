import { useEffect, useState } from 'react'

const buzz = (pattern = 8) => navigator.vibrate?.(pattern)

/**
 * How a strip is edited, the same everywhere: tap a chip and it goes into the selected slot, or into the first empty
 * slot that takes it; tap an empty slot to select it (again to let go); tap a filled slot to take its chip out. A
 * refused placement leaves the strip as it was, shakes the slot and says why.
 *
 * @param put(slot, chip) → null, or a { zh, en } reason it is refused (the game changes its own state when it is not)
 * @param take(slot)        empty a slot
 * @param target(chip)      the slot a chip goes to when none is selected, or null
 * @param filled(slot), fixed(slot)
 * @returns { selected, flash, note, onSlot, onChip, say }
 */
export function useStrip({ put, take, target, filled, fixed }) {
  const [selected, setSelected] = useState(null)
  const [flash, setFlash] = useState([])
  const [note, setNote] = useState(null) // { text: { zh, en }, bad }
  useEffect(() => {
    if (!note) return undefined
    const timer = setTimeout(() => setNote(null), 4200)
    return () => clearTimeout(timer)
  }, [note])
  useEffect(() => {
    if (!flash.length) return undefined
    const timer = setTimeout(() => setFlash([]), 500)
    return () => clearTimeout(timer)
  }, [flash])

  const refuse = (slot, why) => {
    buzz(20)
    setFlash([slot])
    setNote({ text: why, bad: true })
  }
  const onSlot = (slot) => {
    if (filled(slot)) {
      if (fixed(slot)) return setNote({ text: { zh: '这一格是这一关给定的。', en: 'This one is given by the level.' } })
      buzz([6, 30, 6])
      take(slot)
      setNote(null)
      return setSelected(slot)
    }
    setSelected(selected === slot ? null : slot)
  }
  const onChip = (chip) => {
    const slot = selected ?? target(chip)
    if (!slot) return setNote({ text: { zh: '没有空位能放它。先点一个位置，或拿掉占着的那一块。', en: 'No empty place takes it. Tap a place first, or take out the one in the way.' }, bad: true })
    if (filled(slot) && fixed(slot)) return refuse(slot, { zh: '这一格是这一关给定的。', en: 'This one is given by the level.' })
    const why = put(slot, chip)
    if (why) return refuse(slot, why)
    buzz()
    setNote(null)
    setSelected(null)
  }
  return { selected, flash, note, onSlot, onChip, say: (text, bad = false) => setNote(text ? { text, bad } : null), clearSelection: () => setSelected(null) }
}
