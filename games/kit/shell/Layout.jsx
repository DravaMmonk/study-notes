import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Lightbulb, Lock } from 'lucide-react'
import { L, tr } from './i18n.js'
import { Markup } from './Markup.jsx'
import { RunResults } from './RunDock.jsx'
import { useEdit, useMark } from './edit.js'
import { AddMark } from './EditMarks.jsx'
import { default as Workbench } from './Workbench.jsx'
import { useEmbed } from './embed.js'
import { TASK_BOARD_SECTIONS } from '../engine/plays.js'

// The level screen's frame on a phone (PhonePage; on a desktop, Workbench.jsx), and what goes in it in every game:
// the brief, the text it is written in.

/** A level's text with its markup (Markup.jsx). `mark`: the props marking it as a field of the content while the
 *  studio edits (edit.js). */
export function Text({ as: Tag = 'p', className, text, onClick, mark = {} }) {
  return <Tag className={className} onClick={onClick} {...mark}><Markup text={text ?? ''} /></Tag>
}

/** A level whose stage is the same on both: the phone page or the desktop workbench (a stage that scrolls), each given
 * the rest of the props it takes. */
export function Level({ phone, stage, ...props }) {
  return phone ? <PhonePage {...props}>{stage}</PhonePage> : <Workbench {...props} stage={stage} scroll />
}

/**
 * A level on a phone, the same in every game: one page. The tests (their tabs) pinned at the top; in between, what
 * scrolls: task navigation, the foldable 任务 card, the play area, and what a run or check gives (`results`); at the
 * bottom the tools and the run bar, pinned. A run, a step or a check brings the results into view
 * (RunDock). `results` null or left out: nothing below the play area; `brief` null: no task card.
 *
 * Embedded in a note (embed.js), the page is a block in the note's flow: nothing pinned and nothing scrolling of its
 * own, the task open above the play area, the tools and the run bar under the results.
 */
export function PhonePage({ rootRef, scrollRef, onScroll, className = '', brief, taskNav, tests, children, tools, results, dock }) {
  const box = useRef(null)
  const embed = useEmbed()
  const shown = useMemo(() => ({ show: () => requestAnimationFrame(() => box.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })) }), [])
  return (
    <div ref={rootRef} className={`level-phone ${embed ? 'is-embed' : ''} ${className}`}>
      {tests}
      <div ref={scrollRef} className="pl-scroll" onScroll={onScroll}>
        {taskNav}
        {brief && (embed ? <div className="task-body">{brief}</div> : <TaskCard>{brief}</TaskCard>)}
        {children}
        {results && <section ref={box} className="pl-results" aria-label={tr('结果', 'Results')}>{results}</section>}
      </div>
      {tools}
      {dock && <footer className="run-foot"><RunResults.Provider value={shown}>{dock}</RunResults.Provider></footer>}
    </div>
  )
}

/** The task on a phone, the same in every game: a card headed 任务 that folds away to leave room for the level. */
export function TaskCard({ children }) {
  const [open, setOpen] = useState(true)
  return (
    <section className={`task-card ${open ? 'is-open' : ''}`}>
      <button type="button" className="task-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{tr('任务')}</span>
        <ChevronDown size={16} />
      </button>
      {open && <div className="task-body">{children}</div>}
    </section>
  )
}

/**
 * The play selects the task board's content. Task switching and skipping remain available regardless of its content.
 * Hints open one at a time. On phones and in notes, the surrounding page supplies the level title.
 */
export function Brief({ game, level, sections = TASK_BOARD_SECTIONS, text, tip, hint, statement, readouts, children }) {
  const [shown, setShown] = useState(0) // how many hints are open
  const embed = useEmbed()
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
      {sections.includes('title') && !embed && (
        <header className="brief-head">
          <span className="brief-id">{game.levelLabel(level)}</span>
          <h1 {...mark('title', 'level')}>{L(level.title)}</h1>
        </header>
      )}
      {sections.includes('brief') && paragraphs.map((p, k) => <Text key={k} className="brief-text" text={p} mark={mark(many ? `brief[${k}]` : 'brief')} />)}
      {sections.includes('tip') && tip && <Text className="brief-tip" text={tip} mark={mark('tip')} />}
      {sections.includes('hints') && (hints.length > 0 || edit) && (
        <div className="hint-block">
          {hints.slice(0, open).map((h, k) => <Text key={k} className="hint" text={h} mark={mark(hintAt(k))} />)}
          {edit ? <AddMark at="hint" label={{ zh: '提示', en: 'a hint' }} /> : (
            <button className="hint-toggle" onClick={() => setShown(more ? shown + 1 : 0)} aria-expanded={shown > 0}>
              <Lightbulb size={14} />
              {more ? (shown ? tr(`下一条提示（${shown + 1}/${hints.length}）`, `Next hint (${shown + 1}/${hints.length})`) : tr('提示')) : tr('收起提示')}
            </button>
          )}
        </div>
      )}
      {sections.includes('statement') && statement}
      {sections.includes('readouts') && readouts}
      {sections.includes('extras') && children}
    </>
  )
}

export function TaskNavigation({ level }) {
  const edit = useEdit()
  const skip = level.skipLevel && !edit
  const steps = level.steps && (edit || level.steps.names.length > 1)
  if (!skip && !steps) return null
  return (
    <nav className="task-navigation" aria-label={tr('任务导航', 'Task navigation')}>
      {skip && <button type="button" className="brief-skip" onClick={level.skipLevel}>{tr('跳过此关')}</button>}
      {steps && <TaskSteps steps={level.steps} />}
    </nav>
  )
}

/**
 * A level's tasks in order (GameShell tasks): the one played, the ones passed, and the ones still locked behind the
 * task before them (`passed`: whether each is). Any task open can be gone back to. While the studio edits, every task is open, the one played
 * names a field (its name), and a + adds a task after the last.
 */
function TaskSteps({ steps }) {
  const edit = useEdit()
  const mark = useMark()
  return (
    <ol className="task-steps">
      {steps.names.map((name, k) => {
        const done = steps.passed[k]
        const open = edit || steps.open[k]
        return (
          <li key={k}>
            <button type="button" {...(k === steps.at ? mark('step') : {})} className={`${k === steps.at ? 'is-on' : ''} ${done ? 'is-done' : ''}`} disabled={!open} aria-current={k === steps.at ? 'step' : undefined} onClick={() => k !== steps.at && steps.go(k)} title={open ? undefined : tr('请先完成前一个任务')}>
              <i>{done ? <Check size={12} strokeWidth={2.6} /> : open ? k + 1 : <Lock size={11} strokeWidth={2.2} />}</i>
              <span>{name ? L(name) : tr(`任务 ${k + 1}`, `Task ${k + 1}`)}{steps.optional?.[k] && ` · ${tr('可选')}`}</span>
            </button>
          </li>
        )
      })}
      {!edit && steps.optional?.[steps.at] && !steps.passed[steps.at] && steps.at + 1 < steps.names.length && steps.open[steps.at + 1] && <li><button type="button" onClick={() => steps.skip(steps.at)}>{tr('跳过此任务')}</button></li>}
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
