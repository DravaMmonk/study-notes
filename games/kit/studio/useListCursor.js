import { useEffect, useRef, useState } from 'react'

/** Navigate a filtered list while focus remains in its search field. */
export function useListCursor(items, { initial = 0, reset = items, onConfirm }) {
  const [cursor, setAt] = useState(initial)
  const list = useRef(null)
  const at = Math.min(cursor, items.length - 1)
  const active = items[at]

  useEffect(() => setAt(initial), [reset, initial])
  useEffect(() => {
    if (active) list.current?.querySelector('.is-at')?.scrollIntoView({ block: 'nearest' })
  }, [active, at])

  const onKeyDown = (event) => {
    if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault()
        if (items.length) {
          const step = event.key === 'ArrowDown' ? 1 : -1
          setAt(Math.max(0, Math.min(items.length - 1, at + step)))
        }
        break
      case 'Enter':
        event.preventDefault()
        onConfirm(active)
        break
      default:
        break
    }
  }

  return { at, setAt, list, onKeyDown }
}
