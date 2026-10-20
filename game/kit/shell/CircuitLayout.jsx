import { EyeOff } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { L, tr } from './i18n.js'

/**
 * A circuit level on a desktop, the same in every game, laid out the way the signal flows.
 *
 *   left bar   the task and the level's own choices
 *   middle     the parts as one row of icons (what each does in a tooltip) over the circuit board, full width; a game
 *              may float a window over the board (the robot's view) through its canvas
 *   strip      a header with the tests and how they stand; then one pane with the test's inputs and what the circuit
 *              gives against what was expected, and the actions in a narrow column at the end (单步 and 清空 over Run)
 *
 * The line along the strip's top drags it taller or shorter, and the height is remembered for every game.
 *
 * brief, parts, canvas, tests (the chips), status (TestStatus), outputs (+ outputsTitle, outputsAside: a note at
 * the pane head's end), actions (the run bar: a footer.run-foot)
 */
export default function CircuitLayout({ rootRef: given, className = '', brief, parts, canvas, tests, status, outputs, outputsTitle, outputsAside, actions }) {
  const own = useRef(null)
  const rootRef = given ?? own
  return (
    <div ref={rootRef} className={`level kit-circuit ${className}`}>
      <aside className="brief">{brief}</aside>
      <div className="stage-pane kc-stage">
        {parts && <div className="kc-toolbar" aria-label={tr('元件', 'Parts')}>{parts}</div>}
        <div className="kc-canvas">{canvas}</div>
      </div>
      <section className="kc-world" aria-label={tr('测试', 'Tests')}>
        <WorldHandle rootRef={rootRef} />
        <header className="kc-strip-head">
          <div className="kc-tests">{tests}</div>
          {status}
        </header>
        <div className="kc-strip-body">
          <section className="kc-pane kc-outputs" aria-label={tr('输入和输出', 'Inputs and outputs')}>
            <header className="kc-pane-head"><span>{outputsTitle ?? tr('输出', 'Outputs')}</span>{outputsAside}</header>
            <div className="kc-pane-body">{outputs}</div>
          </section>
          <div className="kc-actions">{actions}</div>
        </div>
      </section>
    </div>
  )
}

/**
 * How the tests stand, at the end of the strip's header: a dot for each (passed, failed, running or not run), the
 * count passed, and the hidden tests behind an eye (red when one of them fails).
 * states: ['pass' | 'fail' | 'run' | null]   hidden: { count, failed?, note? }
 */
export function TestStatus({ states, hidden }) {
  const passed = states.filter((s) => s === 'pass').length
  const ran = states.some((s) => s === 'pass' || s === 'fail')
  return (
    <div className={`kc-status ${ran && passed === states.length ? 'is-pass' : ''}`} aria-label={tr(`${passed} / ${states.length} 通过`, `${passed} / ${states.length} passed`)}>
      <span className="kc-dots" aria-hidden="true">{states.map((s, k) => <i key={k} className={s ? `is-${s}` : ''} />)}</span>
      <b>{ran ? passed : '–'}/{states.length}</b>
      {hidden?.count > 0 && (
        <span className={`kc-hidden ${hidden.failed ? 'is-fail' : ''}`} title={L(hidden.note)}>
          <EyeOff size={13} aria-hidden="true" />
          {hidden.failed ? tr(`${hidden.failed} 个没过`, `${hidden.failed} fail`) : `+${hidden.count}`}
        </span>
      )}
    </div>
  )
}

const WORLD_KEY = 'kit.world-h'

// The strip fits what it holds until the player drags its edge; that height is kept (for every level and game), and a
// double click on the edge goes back to fitting.
const setHeight = (el, h) => {
  el.style.setProperty('--world-h', `${h}px`)
  el.style.setProperty('--world-max', 'none')
}

function WorldHandle({ rootRef }) {
  useLayoutEffect(() => {
    let h = null
    try { h = Number(localStorage.getItem(WORLD_KEY)) || null } catch { /* storage may be off */ }
    if (h && rootRef.current) setHeight(rootRef.current, h)
  }, [rootRef])
  const size = (h) => {
    const el = rootRef.current
    if (!el) return null
    const top = el.getBoundingClientRect().top
    const least = parseFloat(getComputedStyle(el).getPropertyValue('--world-min')) || 270
    const next = Math.round(Math.min(Math.max(h, least), (window.innerHeight - top) * 0.78))
    setHeight(el, next)
    return next
  }
  const keep = (h) => {
    try { if (h) localStorage.setItem(WORLD_KEY, String(h)) } catch { /* storage may be off */ }
  }
  const down = (event) => {
    event.preventDefault()
    const bottom = rootRef.current.getBoundingClientRect().bottom
    let last = null
    const move = (e) => { last = size(bottom - e.clientY) }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      keep(last)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const fit = () => {
    rootRef.current?.style.removeProperty('--world-h')
    rootRef.current?.style.removeProperty('--world-max')
    try { localStorage.removeItem(WORLD_KEY) } catch { /* storage may be off */ }
  }
  const key = (event) => {
    const step = event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0
    if (!step) return
    event.preventDefault()
    keep(size(rootRef.current.querySelector('.kc-world').getBoundingClientRect().height + step))
  }
  return <div className="kc-resize" role="separator" aria-orientation="horizontal" aria-label={tr('拖动调整测试区高度，双击恢复自动高度', 'Drag to resize the test area; double-click to fit it again')} title={tr('拖动调整高度 · 双击恢复自动', 'Drag to resize · double-click to fit')} tabIndex={0} onPointerDown={down} onDoubleClick={fit} onKeyDown={key} />
}
