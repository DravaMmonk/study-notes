import { useEffect, useMemo, useRef, useState } from 'react'
import { Brief, PhonePage, Workbench } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { timeWords } from '../engine/grammar.js'
import { drillItem } from '../engine/drill.js'

// A drill level (engine/drill.js): its items one at a time, each a situation and a sentence with the verb group to
// pick. A right pick moves on by itself; a wrong one shows the reason, the questions behind the time meant, and waits.
// A missed item comes round again a few items later, until every item has been got right once. The score is the misses
// on first sight; the ones missed lead the next round. Number keys pick, Enter moves on.

const AGAIN = 3 // a missed item comes back after this many others
const PAUSE = 650 // how long a right pick stays on screen

export default function Drill({ game, level, saved, save, solve, phone }) {
  const { lex } = game.syntax
  const spec = level.source
  const items = useMemo(() => spec.items.map((item) => ({ ...item, view: drillItem(lex, item) })), [spec, lex])
  const start = () => {
    const missed = (saved?.missed ?? []).filter((k) => k < items.length)
    return [...missed, ...items.map((_, k) => k).filter((k) => !missed.includes(k))]
  }
  const [queue, setQueue] = useState(start)
  const [at, setAt] = useState(0)
  const [first, setFirst] = useState({}) // item → right on first sight
  const [picked, setPicked] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const done = at >= queue.length
  const index = queue[at]
  const item = items[index]
  const misses = Object.values(first).filter((ok) => !ok).length

  const next = () => {
    clearTimeout(timer.current)
    setPicked(null)
    setAt((a) => a + 1)
  }
  const pick = (key) => {
    if (picked || done) return
    const right = key === item.answer
    setPicked(key)
    const seen = index in first
    const record = seen ? first : { ...first, [index]: right }
    if (!seen) setFirst(record)
    if (!right) setQueue((q) => [...q.slice(0, at + 1 + AGAIN), index, ...q.slice(at + 1 + AGAIN)])
    // The round ends when the last item in the queue is got right.
    if (right && at === queue.length - 1) {
      const missed = Object.entries(record).filter(([, ok]) => !ok).map(([k]) => Number(k))
      save({ missed })
      solve({ misses: missed.length, star: missed.length === 0 })
    }
    if (right) timer.current = setTimeout(next, PAUSE)
  }
  const again = () => {
    setQueue(start())
    setFirst({})
    setAt(0)
    setPicked(null)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea')) return
      if (!done && !picked && /^[1-9]$/.test(e.key)) {
        const option = item.view.options[Number(e.key) - 1]
        if (option) pick(option.key)
      } else if (picked && picked !== item?.answer && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const brief = <Brief game={game} level={level} hint={spec.hint} />
  const stage = (
    <div className="sx-stage sx-drill">
      <div className="sx-drill-head">
        <span className="sx-drill-move">{L(spec.move)}</span>
        <span className="sx-drill-count">
          {done ? tr(`完成 · 首次答错 ${misses} 题`, `Done · ${misses} missed on first sight`) : tr(`第 ${at + 1} / ${queue.length} 题`, `${at + 1} of ${queue.length}`)}
        </span>
      </div>
      <div className="sx-drill-bar" aria-hidden="true"><span style={{ width: `${(Math.min(at, queue.length) / queue.length) * 100}%` }} /></div>
      {done ? (
        <section className="sx-drill-card is-done">
          <p className="sx-drill-summary">{misses
            ? tr(`这一轮有 ${misses} 题第一次没答对，下一轮它们会排在最前面。`, `${misses} item${misses === 1 ? '' : 's'} missed on first sight; they lead the next round.`)
            : tr('这一轮每一题第一次就答对了。', 'Every item right on first sight this round.')}</p>
          <button type="button" className="sx-drill-next" onClick={again}>{tr('再来一轮', 'Another round')}</button>
        </section>
      ) : (
        <section className="sx-drill-card" key={`${at}-${index}`}>
          <p className="sx-drill-context" dangerouslySetInnerHTML={{ __html: L(item.context) }} />
          <p className="sx-drill-sentence">
            {item.view.before && <span>{item.view.before} </span>}
            <span className={`sx-drill-gap ${picked ? (picked === item.answer ? 'is-right' : 'is-wrong') : ''}`}>
              {picked ? item.view.options.find((o) => o.key === item.answer).text : '______'}
            </span>
            <span>{item.view.after === '.' ? '.' : ` ${item.view.after}`}</span>
          </p>
          <div className="sx-drill-options">
            {item.view.options.map((o, k) => (
              <button
                key={o.key}
                type="button"
                className={`sx-drill-option ${picked && o.key === item.answer ? 'is-right' : ''} ${picked === o.key && o.key !== item.answer ? 'is-wrong' : ''}`}
                disabled={Boolean(picked)}
                onClick={() => pick(o.key)}
              >
                {!phone && <kbd>{k + 1}</kbd>}{o.text}
              </button>
            ))}
          </div>
          {picked && picked !== item.answer && (
            <div className="sx-drill-why" role="status">
              <p dangerouslySetInnerHTML={{ __html: L(item.why[picked]) }} />
              <p className="sx-drill-behind">{tr('这里：', 'Here: ')}{L(timeWords(item.answer))}</p>
              <button type="button" className="sx-drill-next" onClick={next}>{tr('下一题', 'Next')}{!phone && <kbd>Enter</kbd>}</button>
            </div>
          )}
        </section>
      )}
    </div>
  )
  if (phone) return <PhonePage brief={brief} className="sx-level">{stage}</PhonePage>
  return <Workbench className="sx-level" brief={brief} stage={stage} scroll />
}
