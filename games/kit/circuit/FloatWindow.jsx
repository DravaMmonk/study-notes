import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'

// A small window floating over the desktop board (the parts, a robot's view…): drag it by its title bar, fold it to
// its title, and it stays where the player left it (per window `id`, in this browser). It keeps inside the board.
const read = (key) => {
  try {
    return JSON.parse(window.localStorage.getItem(key)) ?? null
  } catch {
    return null
  }
}

/**
 * @param id        remembers the window's place and fold under `kit.float.<id>`
 * @param title     its title ({ zh, en } or text)
 * @param at        where it starts: { left | right, top | bottom } in px from the board's edges
 */
export default function FloatWindow({ id, title, at, className = '', children }) {
  const key = `kit.float.${id}`
  const [state, setState] = useState(() => read(key) ?? { pos: null, folded: false })
  const box = useRef(null)
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // The place still holds for this visit.
    }
  }, [key, state])

  const drag = (event) => {
    if (event.button > 0 || event.target.closest('button')) return
    event.preventDefault()
    event.stopPropagation()
    const el = box.current
    const parent = el.offsetParent.getBoundingClientRect()
    const start = el.getBoundingClientRect()
    const [dx, dy] = [event.clientX - start.left, event.clientY - start.top]
    const move = (e) => {
      const x = Math.min(Math.max(0, e.clientX - dx - parent.left), parent.width - start.width)
      const y = Math.min(Math.max(0, e.clientY - dy - parent.top), parent.height - 36)
      setState((s) => ({ ...s, pos: { x: Math.round(x), y: Math.round(y) } }))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const place = state.pos ? { left: state.pos.x, top: state.pos.y } : at
  return (
    <section ref={box} className={`float-window ${state.folded ? 'is-folded' : ''} ${className}`} style={place} onPointerDown={(e) => e.stopPropagation()} aria-label={L(title)}>
      <header className="float-head" onPointerDown={drag} title={tr('拖动标题栏移动窗口', 'Drag the title bar to move the window')}>
        <GripHorizontal size={13} aria-hidden="true" />
        <span>{L(title)}</span>
        <button type="button" onClick={() => setState((s) => ({ ...s, folded: !s.folded }))} aria-expanded={!state.folded} aria-label={state.folded ? tr('展开', 'Expand') : tr('收起', 'Fold')}>
          {state.folded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </header>
      <div className="float-body" hidden={state.folded}>{children}</div>
    </section>
  )
}
