import { useEffect, useEffectEvent, useLayoutEffect, useRef } from 'react'
import { registerOverlay, topOverlay } from '../overlays.js'

/** Put the ref on the positioned overlay. Its optional anchor is also inside for pointer dismissal. */
export function useOverlay(onClose, { active = true, onKey, onOutside, anchor } = {}) {
  const root = useRef(null)
  const controls = useRef(null)
  controls.current = { onClose, onKey, onOutside, anchor }
  useLayoutEffect(() => {
    const node = root.current
    if (active && node) return registerOverlay(node, () => controls.current)
  }, [active])
  return root
}

/** Workspace shortcuts pause behind an overlay unless the caller explicitly owns that key there. */
export function useWorkspaceKeys(onKey, { allowOverlay } = {}) {
  const send = useEffectEvent((event) => {
    if (event.defaultPrevented || event.isComposing || (event.key === 'Escape' && event.repeat)) return
    const overlay = topOverlay()
    if (!overlay || allowOverlay?.(event, overlay)) onKey(event)
  })
  useEffect(() => {
    const key = (event) => send(event)
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
}
