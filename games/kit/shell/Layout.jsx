import { Fragment, createElement, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Lightbulb, Lock } from 'lucide-react'
import { L, tr } from './i18n.js'
import { refParts } from './refs.js'

// The level screen's frame, the same in every game. On a desktop it is a workbench: the brief on the left, the
// stage (the board, a bench, a circuit) in the middle and, when the level has one, a side column (tests, a panel,
// a dock). On a phone it is one scrolling page: the brief, then the play area.

/** A level's text: plain, or the game's own markup when the game says its text is HTML (defineGame `html`). */
export function Text({ game, as: Tag = 'p', className, text, onClick }) {
  const value = String(L(text) ?? '')
  return game?.html ? <Tag className={className} onClick={onClick} dangerouslySetInnerHTML={{ __html: value }} /> : <Tag className={className} onClick={onClick}><Plain text={value} /></Tag>
}

/** Plain text, with its references to levels, parts and encyclopedia entries (refs.js) as links. */
export function Plain({ text }) {
  return refParts(text).map((part, i) => (typeof part === 'string' ? <Fragment key={i}>{part}</Fragment> : createElement(`${part.kind}-ref`, { key: i, to: part.ref })))
}

/** Desktop workbench: brief | stage | side. The side (optional) is the level's own column element; `scroll` makes
 * the stage scroll on its own (a bench taller than the screen). */
export function Workbench({ brief, stage, side, scroll, className = '', rootRef }) {
  return (
    <div ref={rootRef} className={`level ${side ? 'has-side' : ''} ${className}`}>
      <aside className="brief">{brief}</aside>
      <div className={`stage-pane ${scroll ? 'is-scroll' : ''}`}>{stage}</div>
      {side}
    </div>
  )
}

/** Phone page: the brief, in its foldable 任务 card, then the play area. */
export function PhonePage({ brief, children, className = '', rootRef }) {
  return (
    <div ref={rootRef} className={`level-phone ${className}`}>
      <section className="pl-brief"><TaskCard>{brief}</TaskCard></section>
      {children}
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
  const body = text ?? level.brief
  const paragraphs = (Array.isArray(body) ? body : [body]).filter(Boolean)
  const hints = (Array.isArray(hint) ? hint : [hint]).filter(Boolean)
  const more = shown < hints.length
  return (
    <>
      <header className="brief-head">
        <span className="brief-id">{game.levelLabel(level)}</span>
        <h1>{L(level.title)}</h1>
      </header>
      {level.steps && <TaskSteps steps={level.steps} />}
      {paragraphs.map((p, k) => <Text key={k} game={game} className="brief-text" text={p} />)}
      {tip && <Text game={game} className="brief-tip" text={tip} />}
      {hints.length > 0 && (
        <div className="hint-block">
          {hints.slice(0, shown).map((h, k) => <Text key={k} game={game} className="hint" text={h} />)}
          <button className="hint-toggle" onClick={() => setShown(more ? shown + 1 : 0)} aria-expanded={shown > 0}>
            <Lightbulb size={14} />
            {more ? (shown ? tr(`再给一个提示（${shown + 1}/${hints.length}）`, `Another hint (${shown + 1}/${hints.length})`) : tr('提示', 'Hint')) : tr('收起提示', 'Hide hints')}
          </button>
        </div>
      )}
      {children}
    </>
  )
}

/**
 * A level's tasks in order (GameShell tasks): the one played, the ones passed, and the ones still locked behind the
 * task before them. Any task open can be gone back to.
 */
function TaskSteps({ steps }) {
  return (
    <ol className="task-steps">
      {steps.names.map((name, k) => {
        const open = k <= steps.done
        return (
          <li key={k}>
            <button type="button" className={`${k === steps.at ? 'is-on' : ''} ${k < steps.done ? 'is-done' : ''}`} disabled={!open} aria-current={k === steps.at ? 'step' : undefined} onClick={() => k !== steps.at && steps.go(k)} title={open ? undefined : tr('先完成上一个任务', 'Finish the task before it first')}>
              <i>{k < steps.done ? <Check size={12} strokeWidth={2.6} /> : open ? k + 1 : <Lock size={11} strokeWidth={2.2} />}</i>
              <span>{L(name)}</span>
            </button>
          </li>
        )
      })}
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
