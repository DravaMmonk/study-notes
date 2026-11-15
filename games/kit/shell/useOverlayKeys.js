import { useEffect, useEffectEvent, useLayoutEffect, useRef } from 'react'
import { registerOverlay, topOverlay } from '../overlay-keys.js'

/** Put the returned ref on the positioned overlay so its layer also sets its keyboard order. */
export function useOverlayKeys(onClose, { active = true, onKey } = {}) {
  const root = useRef(null)
  const keys = useRef(null)
  keys.current = { onClose, onKey }
  useLayoutEffect(() => {
    const node = root.current
    if (active && node) return registerOverlay(node, () => keys.current)
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
