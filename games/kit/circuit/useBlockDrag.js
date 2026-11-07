import { useEffect, useRef } from 'react'
import { translateBlock } from './blocks.js'

// Preview every member together; commit one layout edit when released, or restore it on cancellation.
export default function useBlockDrag({ graph, parts, layer, zoom, onChange, redraw, positions }) {
  const cancel = useRef(null)
  useEffect(() => () => cancel.current?.(), [])
  return (event, block) => {
    if (event.button > 0) return
    event.preventDefault()
    event.stopPropagation()
    cancel.current?.()
    const root = layer.current, members = new Set(block.nodes), pointer = event.pointerId
    const start = [event.clientX, event.clientY]
    const nodes = [...root.querySelectorAll('[data-piece]')].filter(el => el.closest('.board-layer') === root && members.has(el.dataset.piece))
    const section = [...root.querySelectorAll('[data-block]')].find(el => el.closest('.board-layer') === root && el.dataset.block === block.id)
    const elements = [...nodes, section].filter(Boolean)
    const transforms = elements.map(el => el.style.transform)
    const origin = block.view === 'hidden' ? new Map() : positions
    let dx = 0, dy = 0
    const move = e => {
      if (e.pointerId !== pointer) return
      dx = Math.round((e.clientX - start[0]) / zoom)
      dy = Math.round((e.clientY - start[1]) / zoom)
      elements.forEach((el, i) => { el.style.transform = `${transforms[i]} translate(${dx}px,${dy}px)` })
      redraw()
    }
    const finish = commit => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', abort)
      window.removeEventListener('keydown', key)
      elements.forEach((el, i) => { el.style.transform = transforms[i] })
      cancel.current = null
      if (commit && (dx || dy)) onChange(translateBlock(graph, parts, block.id, dx, dy, origin), { keep: true })
      redraw()
    }
    const up = e => { if (e.pointerId === pointer) finish(true) }
    const abort = () => finish(false)
    const key = e => { if (e.key === 'Escape') abort() }
    cancel.current = abort
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', abort)
    window.addEventListener('keydown', key)
  }
}
