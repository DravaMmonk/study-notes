import { useEffect, useId, useState } from 'react'

/** A hovered or pinned cell, optionally owned by the shared results readout. */
export function useInspection(root, source, inspection, mode = 'pixels') {
  const id = useId()
  const local = useState(null)
  const [point, setPoint] = inspection ?? local
  const active = point?.id === id && point.x < source.w && point.y < source.h ? point : null
  const ownsPoint = Boolean(active)
  useEffect(() => {
    if (!ownsPoint) return
    const dismiss = (event) => {
      if (!root.current?.contains(event.target)) setPoint((p) => p?.id === id ? null : p)
    }
    document.addEventListener('pointerdown', dismiss, true)
    return () => document.removeEventListener('pointerdown', dismiss, true)
  }, [ownsPoint, id, root, setPoint])

  return {
    active,
    select(x, y, pinned, { toggle = true, scan } = {}) {
      setPoint((p) => {
        if (!pinned && p?.pinned) return p
        if (toggle && pinned && p?.pinned && p.id === id && p.x === x && p.y === y) return null
        return { id, x, y, pinned, source, mode, scan }
      })
    },
    leave: () => setPoint((p) => p?.id === id && !p.pinned ? null : p),
  }
}

/** Locate a cell in a drawing scaled by its container. */
export function pointerCell(grid, box, { clientX, clientY }) {
  const x = Math.floor((clientX - box.left) * grid.w / box.width)
  const y = Math.floor((clientY - box.top) * grid.h / box.height)
  return x >= 0 && y >= 0 && x < grid.w && y < grid.h ? { x, y } : null
}
