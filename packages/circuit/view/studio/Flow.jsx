import { L, tr, call } from 'kernel/view'
// A part's way through the course, under its page in the studio (games/DESIGN.md 6.7): read-only, from the course
// (the tool `flow`, ../engine/flow.js), one tick a level in course order, each event a mark on it — at hand from the
// start, brought in (+), given there only (↑), withheld (−), superseded (⇢), a step of its chains (■, its form). A tick
// opens the level, at the task and on the field that says it.
import { useEffect, useState } from 'react'

const MARK = { start: '○', adds: '+', gives: '↑', withholds: '−', replaced: '⇢', step: '■' }
const SAYS = {
  start: () => tr('一开始就在手上', 'at hand from the start'),
  adds: () => tr('这一关带来', 'brought in here'),
  gives: () => tr('只在这里给', 'given here only'),
  withholds: () => tr('这里扣下', 'withheld here'),
  replaced: (e) => tr(`${e.by} 取代它`, `${e.by} supersedes it`),
  step: (e) => tr(`里面跑这个任务的作品${e.form ? `（${e.form}）` : ''}`, `runs this task’s work inside${e.form ? ` (${e.form})` : ''}`),
}

export default function Flow({ target, part, changeset, label, onOpen }) {
  const [events, setEvents] = useState([])
  const key = JSON.stringify(changeset.ops)
  useEffect(() => {
    let live = true
    const timer = window.setTimeout(() => call('flow', { ...target, part, changeset }).then((r) => live && setEvents(r.events)).catch(() => live && setEvents([])), 300)
    return () => { live = false; window.clearTimeout(timer) }
  }, [target, part, key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!events.length) return null
  // One tick a level (the start its own), its events in order.
  const ticks = []
  for (const e of events) {
    const last = ticks.at(-1)
    if (last && last.level === e.level) last.events.push(e)
    else ticks.push({ level: e.level, events: [e] })
  }
  return (
    <ol className="flow" aria-label={tr('在课程里的流转')}>
      {ticks.map((t, k) => (
        <li key={`${t.level}-${k}`}>
          <button type="button" className="flow-tick" disabled={t.level === null} onClick={() => onOpen(t.events[0])} title={t.events.map((e) => SAYS[e.kind](e)).join('\n')}>
            <span className="flow-marks">{t.events.map((e, j) => <i key={j} className={`is-${e.kind}`}>{MARK[e.kind]}</i>)}</span>
            <span className="flow-level">{t.level === null ? '' : label(t.level)}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}

export const levelLabel = (names) => (id) => {
  const l = names?.level.get(id)
  return l ? `${l.label}${l.title ? ` ${L(l.title)}` : ''}` : id
}
