import { useLayoutEffect, useRef } from 'react'

/** A trusted domain drawing. Marked targets delegate pointer and keyboard activation to the editor. */
export default function InteractiveDrawing({ markup, className, onPick, variant, target = 'cell' }) {
  const box = useRef(null)
  const focused = useRef(null)
  useLayoutEffect(() => {
    if (focused.current === null) return
    box.current.querySelector(`[data-${target}="${CSS.escape(focused.current)}"]`)?.focus({ preventScroll: true })
    focused.current = null
  })
  const activate = (event, key = false) => {
    const node = event.target.closest(`[data-${target}]`)
    if (!node || !onPick) return
    event.stopPropagation()
    if (key) {
      event.preventDefault()
      focused.current = node.dataset[target]
    }
    onPick(node.dataset[target])
  }
  return <div ref={box} className={className} data-drawing={variant} onPointerDown={(event) => { if (onPick && event.target.closest(`[data-${target}]`)) event.stopPropagation() }} onClick={(event) => activate(event)} onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') activate(event, true)
  }} dangerouslySetInnerHTML={{ __html: markup }} />
}
