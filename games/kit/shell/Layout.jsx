import { Fragment, createElement, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Lightbulb, Lock } from 'lucide-react'
import { L, tr } from './i18n.js'
import { refParts } from './refs.js'
import { RunDrawer } from './RunDock.jsx'
import { useEdit, useMark } from './edit.js'
import { AddMark } from './EditMarks.jsx'
import Workbench from './Workbench.jsx'

// The level screen's frame on a phone (PhonePage; on a desktop, Workbench.jsx), and what goes in it in every game:
// the brief, the text it is written in.

/** A level's text: plain, or the game's own markup when the game says its text is HTML (defineGame `html`). `mark`:
 *  the props marking it as a field of the content while the studio edits (edit.js). */
export function Text({ game, as: Tag = 'p', className, text, onClick, mark = {} }) {
  const value = String(L(text) ?? '')
  return game?.html ? <Tag className={className} onClick={onClick} {...mark} dangerouslySetInnerHTML={{ __html: value }} /> : <Tag className={className} onClick={onClick} {...mark}><Plain text={value} /></Tag>
}

/** Plain text, with its references to levels, parts and encyclopedia entries (refs.js) as links. */
export function Plain({ text }) {
  return refParts(text).map((part, i) => (typeof part === 'string' ? <Fragment key={i}>{part}</Fragment> : createElement(`${part.kind}-ref`, { key: i, to: part.ref })))
}

/** A level whose stage is the same on both: the phone page or the desktop workbench (a stage that scrolls), each given
 * the rest of the props it takes. */
export function Level({ phone, stage, ...props }) {
  return phone ? <PhonePage {...props}>{stage}</PhonePage> : <Workbench {...props} stage={stage} scroll />
}

/**
 * A level on a phone, the same in every game: one page. The tests (their tabs) pinned at the top; in between, what
 * scrolls: the task in its foldable 任务 card, then the play area; at the bottom the tray (parts to place), the results
 * drawer and the run bar, pinned. The drawer holds what a run or check gives (`results`): folded away until the run
 * bar's first button opens it, or a run or check does (RunDock); with nothing in it (null), there is no such button.
 * `results` left out: the level has no drawer.
 */
export function PhonePage({ rootRef, scrollRef, onScroll, className = '', brief, tests, children, tray, results, dock }) {
  const [open, setOpen] = useState(false)
  const has = Boolean(results)
  const drawer = useMemo(() => ({ has, open: has && open, toggle: () => setOpen((o) => !o), show: () => setOpen(true) }), [has, open])
  return (
    <div ref={rootRef} className={`level-phone ${className}`}>
      {tests}
      <div ref={scrollRef} className="pl-scroll" onScroll={onScroll}>
        <TaskCard>{brief}</TaskCard>
        {children}
      </div>
      {tray}
      {/* Kept in the page while folded, so what a game paints into it stays painted. */}
      {results !== undefined && (
        <section className={`pl-drawer ${drawer.open ? 'is-open' : ''}`} inert={!drawer.open} aria-label={tr('结果', 'Results')}>
          <div className="pl-drawer-body">{results}</div>
        </section>
      )}
      {dock && <footer className="run-foot"><RunDrawer.Provider value={drawer}>{dock}</RunDrawer.Provider></footer>}
    </div>
  )
}

/** The task on a phone, the same in every game: a card headed 任务 that folds away to leave room for the level. */
export function TaskCard({ children }) {
  const [open, setOpen] = useState(true)
  return (
    <section className={`task-card ${open ? 'is-open' : ''}`}>
      <button type="button" className="task-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{tr('任务', 'Task')}</span>
        <ChevronDown size={16} />
      </button>
      {open && <div className="task-body">{children}</div>}
    </section>
  )
}

/**
 * A level's brief, the same in every game: its label and title, its tasks when it has several (TaskSteps), the task
 * (one text, or several paragraphs), an
 * optional tip, the hints behind a 提示 button (several are shown one at a time), then whatever the level adds below
 * (parts, score…). On a phone the page wraps it in the 任务 card (PhonePage) and the top bar carries the title.
 */
export function Brief({ game, level, text, tip, hint, children }) {
  const [shown, setShown] = useState(0) // how many hints are open
  const edit = useEdit()
  const mark = useMark()
  const body = text ?? level.brief
  const many = Array.isArray(body)
  const paragraphs = (many ? body : [body]).filter(Boolean)
  const hints = (Array.isArray(hint) ? hint : [hint]).filter(Boolean)
  const hintAt = (k) => (Array.isArray(hint) ? `hint[${k}]` : 'hint')
  // While the studio edits, every hint shows, each a field to pick.
  const open = edit ? hints.length : shown
  const more = shown < hints.length
  return (
    <>
      <header className="brief-head">
        <span className="brief-id">{game.levelLabel(level)}</span>
        <h1 {...mark('title', 'level')}>{L(level.title)}</h1>
      </header>
      {level.steps && (edit || level.steps.names.length > 1) && <TaskSteps steps={level.steps} />}
      {paragraphs.map((p, k) => <Text key={k} game={game} className="brief-text" text={p} mark={mark(many ? `brief[${k}]` : 'brief')} />)}
      {tip && <Text game={game} className="brief-tip" text={tip} mark={mark('tip')} />}
      {(hints.length > 0 || edit) && (
        <div className="hint-block">
          {hints.slice(0, open).map((h, k) => <Text key={k} game={game} className="hint" text={h} mark={mark(hintAt(k))} />)}
          {edit ? <AddMark at="hint" label={{ zh: '提示', en: 'a hint' }} /> : (
            <button className="hint-toggle" onClick={() => setShown(more ? shown + 1 : 0)} aria-expanded={shown > 0}>
              <Lightbulb size={14} />
              {more ? (shown ? tr(`下一条提示（${shown + 1}/${hints.length}）`, `Next hint (${shown + 1}/${hints.length})`) : tr('提示', 'Hint')) : tr('收起提示', 'Hide hints')}
            </button>
          )}
        </div>
      )}
      {children}
    </>
  )
}

/**
 * A level's tasks in order (GameShell tasks): the one played, the ones passed, and the ones still locked behind the
 * task before them. Any task open can be gone back to. While the studio edits, every task is open, the one played
 * names a field (its name), and a + adds a task after the last.
 */
function TaskSteps({ steps }) {
  const edit = useEdit()
  const mark = useMark()
  return (
    <ol className="task-steps">
      {steps.names.map((name, k) => {
        const open = edit || k <= steps.done
        return (
          <li key={k}>
            <button type="button" {...(k === steps.at ? mark('step') : {})} className={`${k === steps.at ? 'is-on' : ''} ${k < steps.done ? 'is-done' : ''}`} disabled={!open} aria-current={k === steps.at ? 'step' : undefined} onClick={() => k !== steps.at && steps.go(k)} title={open ? undefined : tr('请先完成前一个任务', 'Complete the previous task first')}>
              <i>{k < steps.done ? <Check size={12} strokeWidth={2.6} /> : open ? k + 1 : <Lock size={11} strokeWidth={2.2} />}</i>
              <span>{name ? L(name) : tr(`任务 ${k + 1}`, `Task ${k + 1}`)}</span>
            </button>
          </li>
        )
      })}
      {edit && <li><AddMark at="tasks" scope="level" label={{ zh: '任务', en: 'a task' }} /></li>}
    </ol>
  )
}

// A play area's first block (its main visual) is pinned at the top of the phone page while the rest scrolls, but
// only when it fits in a little over half the screen; a taller one would hide its own controls.
export function PinnedPlay({ children, first = '.bk > .bk-split > :first-child' }) {
  const box = useRef(null)
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    const el = box.current
    const check = () => {
      const block = el?.querySelector(first)
      setPinned(Boolean(block) && block.scrollHeight <= window.innerHeight * 0.56)
    }
    const observer = new ResizeObserver(() => requestAnimationFrame(check))
    observer.observe(el)
    return () => observer.disconnect()
  }, [first])
  return <div ref={box} className={`pl-play ${pinned ? 'is-pinned' : ''}`}>{children}</div>
}
