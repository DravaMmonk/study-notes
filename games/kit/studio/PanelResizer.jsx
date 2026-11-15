import { tr } from '../shell/i18n.js'
import { usePointerSession } from '../views/usePointerSession.js'

const SIZE = { tree: [180, 640], audit: [90, 900], side: [260, 900] }

/** A panel's separator previews a drag until release, and keeps keyboard nudges immediately. */
export default function PanelResizer({ side, size, open, dragging, previewResize, setLayout }) {
  const { track } = usePointerSession()
  const set = (patch) => setLayout((layout) => ({ ...layout, ...patch }))
  const across = side !== 'audit'
  const sign = side === 'tree' ? 1 : -1
  const [min, max] = SIZE[side]
  const clamp = (value) => Math.max(min, Math.min(max, value))
  const position = (event) => across ? event.clientX : event.clientY
  const toggle = () => set({ [`${side}Open`]: !open })
  const drag = (event) => {
    if (!open || dragging || event.button !== 0 || !event.isPrimary) return
    event.preventDefault()
    const start = position(event)
    const sizeAt = (next) => clamp(size + sign * (position(next) - start))
    previewResize({ side, size })
    track(event, {
      capture: true,
      escape: true,
      move(next) {
        previewResize({ side, size: sizeAt(next) })
      },
      finish(commit, release) {
        previewResize(null)
        if (!commit) return
        const value = sizeAt(release)
        if (value !== size) set({ [side]: value })
      },
    })
  }
  const key = (event) => {
    if (dragging) return
    if (event.key === 'Enter') {
      event.preventDefault()
      toggle()
      return
    }
    const delta = across ? { ArrowRight: 16, ArrowLeft: -16 }[event.key] : { ArrowDown: 16, ArrowUp: -16 }[event.key]
    if (!delta) return
    event.preventDefault()
    set({ [side]: clamp(size + sign * delta) })
  }
  return (
    <div
      className={`studio-resize is-${side} ${open ? '' : 'is-shut'}`} role="separator" aria-orientation={across ? 'vertical' : 'horizontal'} tabIndex={0} aria-label={tr('拖动改大小，双击收起')}
      onPointerDown={drag} onDoubleClick={toggle} onClick={() => !open && toggle()} onKeyDown={key}
    />
  )
}
