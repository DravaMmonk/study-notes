import { EyeOff } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { L, tr } from './i18n.js'

/**
 * A level on a desktop, the same in every game and every kind of level.
 *
 *   left       the task and the level's own choices (brief)
 *   middle     what the level is played on (stage): a board that fills it (a circuit), or one that scrolls (`scroll`: a
 *              table, a sentence, rows to fill in); over a board, the parts as one row of icons (parts)
 *   strip      a header with the tests and how they stand (tests, status), when the level has them; then the results
 *              (what a run or check gives: outputs, the test board, the verdict; `resultsTitle`, `resultsAside` head
 *              it) and, in a narrow column at the bottom right, the run bar (dock)
 *
 * `results` left out: the level has no results pane (the run bar alone, at the right); null: the pane is there, empty
 * until there is something to show. The line along the strip's top drags it taller or shorter, and the height is
 * remembered for every game.
 */
export default function Workbench({ rootRef: given, className = '', brief, parts, stage, scroll = false, tests, status, results, resultsTitle, resultsAside, dock }) {
  const own = useRef(null)
  const rootRef = given ?? own
  const pane = results !== undefined
  return (
    <div ref={rootRef} className={`level ${className}`}>
      <aside className="brief">{brief}</aside>
      <div className={`stage-pane ${scroll ? 'is-scroll' : 'is-board'}`}>
        {parts && <div className="wb-toolbar" aria-label={tr('元件', 'Parts')}>{parts}</div>}
        <div className="wb-stage">{stage}</div>
      </div>
      {(pane || dock || tests || status) && (
        <section className="wb-strip">
          {pane && <WorldHandle rootRef={rootRef} />}
          {(tests || status) && (
            <header className="wb-strip-head">
              <div className="wb-tests">{tests}</div>
              {status}
            </header>
          )}
          <div className="wb-strip-body">
            {pane && (
              <section className="wb-pane wb-results">
                {(resultsTitle || resultsAside) && <header className="wb-pane-head"><span>{resultsTitle}</span>{resultsAside}</header>}
                <div className="wb-pane-body">{results}</div>
              </section>
            )}
            {dock && <div className="wb-actions"><footer className="run-foot">{dock}</footer></div>}
          </div>
        </section>
      )}
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
    <div className={`wb-status ${ran && passed === states.length ? 'is-pass' : ''}`} aria-label={tr(`${passed} / ${states.length} 通过`, `${passed} / ${states.length} passed`)}>
      <span className="wb-dots" aria-hidden="true">{states.map((s, k) => <i key={k} className={s ? `is-${s}` : ''} />)}</span>
      <b>{ran ? passed : '–'}/{states.length}</b>
      {hidden?.count > 0 && (
        <span className={`wb-hidden ${hidden.failed ? 'is-fail' : ''}`} title={L(hidden.note)}>
          <EyeOff size={13} aria-hidden="true" />
          {hidden.failed ? tr(`${hidden.failed} 个未通过`, `${hidden.failed} failed`) : `+${hidden.count}`}
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
  // The strip's height when it just fits what it holds (read with the dragged height taken off for a moment).
  const natural = (el) => {
    const world = el.querySelector('.wb-strip')
    const h = el.style.getPropertyValue('--world-h')
    const max = el.style.getPropertyValue('--world-max')
    el.style.removeProperty('--world-h')
    el.style.removeProperty('--world-max')
    const fit = world.getBoundingClientRect().height
    if (h) el.style.setProperty('--world-h', h)
    if (max) el.style.setProperty('--world-max', max)
    return fit
  }
  // A drag goes no shorter than the strip's least height, or than what it holds when that is less: it never jumps
  // taller on being touched, and can always be brought back to its fitting height.
  const size = (h) => {
    const el = rootRef.current
    if (!el) return null
    const top = el.getBoundingClientRect().top
    const least = Math.min(parseFloat(getComputedStyle(el).getPropertyValue('--world-min')) || 270, natural(el))
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
    keep(size(rootRef.current.querySelector('.wb-strip').getBoundingClientRect().height + step))
  }
  return <div className="wb-resize" role="separator" aria-orientation="horizontal" aria-label={tr('拖动调整结果区高度，双击恢复自动高度', 'Drag to resize the results area; double-click to fit it again')} title={tr('拖动调整高度 · 双击恢复自动高度', 'Drag to resize · double-click to fit')} tabIndex={0} onPointerDown={down} onDoubleClick={fit} onKeyDown={key} />
}
