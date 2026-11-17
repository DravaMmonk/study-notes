import { Fragment, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { CheckIcon, Dock, SkipIcon } from '../RunControls.jsx'
import TestTabs from '../TestTabs.jsx'
import InteractiveDrawing from '../InteractiveDrawing.jsx'
import { Brief, PhonePage, TaskNavigation } from '../Layout.jsx'
import { Markup } from '../Markup.jsx'
import { default as Workbench } from '../Workbench.jsx'
import { L } from '../i18n.js'
import { useToast } from '../useInteraction.jsx'

const icons = { check: CheckIcon, skip: SkipIcon, trash: Trash2 }

function Lines({ text }) {
  const lines = Array.isArray(text) ? text : [text]
  return lines.map((line, i) => <Fragment key={i}>{i > 0 && <br />}<Markup text={line} /></Fragment>)
}

function PlayCard({ title, badge, rule, body, choices, list, tokens, action, feedback, footnote }) {
  return (
    <div className="pcard">
      <h3>{L(title)}{badge != null && <small>{L(badge)}</small>}</h3>
      {rule && <div className="rule"><Lines text={rule} /></div>}
      {body && <p><Lines text={body} /></p>}
      {choices && (
        <div className="chips two" role={choices.label ? 'radiogroup' : undefined} aria-label={L(choices.label)}>
          {choices.items.map(({ label, select, current, className }) => (
            <button key={L(label)} className={`chip ${className ?? ''}`} type="button"
              role={choices.label ? 'radio' : undefined} aria-checked={current} onClick={select}>{L(label)}</button>
          ))}
        </div>
      )}
      {list && <div className="routes">{list.map(({ text, tone }, i) => <div key={i} className={`route ${tone ?? ''}`}>{L(text)}</div>)}</div>}
      {tokens && (
        <div className="diff">
          {tokens.items.length ? tokens.items.map((item, i) => <span key={i} className="dt ins">{item}</span>) : <span className="opthint">{L(tokens.empty)}</span>}
        </div>
      )}
      {action && <button className="sec-btn" type="button" disabled={action.disabled} onClick={action.run}>{L(action.label)}</button>}
      {feedback && <div className={`msg ${feedback.cls}`}><Lines text={feedback.body()} /></div>}
      {footnote && <p className="opthint"><Markup text={footnote} /></p>}
    </div>
  )
}

function CapacityBoard({ totals, capacityLabel, choices, remaining, onToggle }) {
  return (
    <div className="board sg-board">
      <div className="pack">
        <div className="bag">
          <div className="bag-meta">{totals.map(({ label, hit }, i) => <span key={i} className={hit ? 'hit' : undefined}><Markup text={label} /></span>)}</div>
          <div className="bag-bar" role="img" aria-label={capacityLabel}>
            {choices.filter(({ selected }) => selected).map(({ id, label, size, color }) => (
              <i key={id} style={{ flex: size, background: color }}><span>{label}</span></i>
            ))}
            {remaining > 0 && <i className="free" style={{ flex: remaining }} />}
          </div>
        </div>
        <div className="items">
          {choices.map(({ id, label, score, size, sizeLabel, sizeHint, color, selected }) => (
            <button key={id} className="itm" type="button" aria-pressed={selected} style={{ '--c': color }} onClick={() => onToggle(id)}>
              <span className="itm-top"><b>{label}</b><span className="v">{score}</span></span>
              <span className="kg" aria-label={sizeLabel}>{Array.from({ length: size }, (_, i) => <i key={i} />)}<em>{sizeHint}</em></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Comparison({ title, figures, caption }) {
  return (
    <div className="afterbox">
      <span className="eyebrow">{L(title)}</span>
      <div className="orders thumbs">
        {figures.map(({ label, drawing }) => (
          <figure key={L(label)}>
            <InteractiveDrawing {...drawing} />
            <figcaption>{L(label)}</figcaption>
          </figure>
        ))}
      </div>
      <p className="cap">{L(caption)}</p>
    </div>
  )
}

function withIcon(action) {
  const Icon = icons[action?.icon]
  return Icon ? { ...action, icon: <Icon size={16} /> } : action
}

/** The board shell receives drawing targets, player actions and feedback from the bound resource. */
export default function ManualBoardPlay({ screen, play, resource: { useBoard, briefOf } }) {
  const { game, level, phone } = screen
  const { layout } = play
  const { text, hint } = briefOf(level.source)
  const [toast, toastEl] = useToast()
  const boardRef = useRef(null)
  const scrollRef = useRef(null)
  const revealBoard = () => {
    const page = scrollRef.current
    if (phone && page && boardRef.current) page.scrollTop += boardRef.current.getBoundingClientRect().top - page.getBoundingClientRect().top - 8
  }
  const { drawing, capacity, note, cards, dock, tests, states, ti, onTest, comparison } = useBoard({ ...screen, play, toast, revealBoard })
  const panel = <div className={layout.panelClass}>{cards.map((card, i) => <PlayCard key={i} {...card} />)}</div>
  const brief = <Brief game={game} level={level} text={text} hint={hint} sections={play.taskBoard}>{!phone && panel}</Brief>
  const taskNav = <TaskNavigation level={level} />
  const board = (
    <section ref={boardRef} className={layout.cardClass} aria-label={L(layout.boardLabel)}>
      {tests && <TestTabs tests={tests} states={states} index={ti} onSelect={onTest} phone={phone} inline />}
      {capacity ? <CapacityBoard {...capacity} /> : <InteractiveDrawing {...drawing} />}
      <p className={layout.noteClass}>{L(note)}</p>
      <div className={layout.afterClass}>{comparison && <Comparison {...comparison} />}</div>
    </section>
  )
  const bar = <Dock {...dock} meta={<Markup text={dock.meta} />} go={withIcon(dock.go)} secondary={withIcon(dock.secondary)} />
  return phone ? (
    <PhonePage scrollRef={scrollRef} brief={brief} taskNav={taskNav} className={layout.phoneClass} dock={bar}>
      {board}{panel}{toastEl}
    </PhonePage>
  ) : (
    <>
      <Workbench className={layout.desktopClass} brief={brief} taskNav={taskNav} stage={board} scroll dock={bar} />
      {toastEl}
    </>
  )
}
