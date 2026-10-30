import { useEffect, useRef } from 'react'
import { L, tr } from './i18n.js'

// The steps of a run so far, in a box beside the board (usePlayback shown): each step's number, what ran (a card's
// name, a round) and what it gave, the current one marked and kept in view, a failed one marked. The box and each
// result have a greatest height and scroll, so a long clause set or sentence never pushes the page about.
//
// steps: [{ label: { zh, en } | string, value: node, failed?: { zh, en } }]   at: the current step's index, or −1

export default function StepLog({ steps, at }) {
  const box = useRef(null)
  useEffect(() => {
    const el = box.current
    const on = el?.querySelector('.step-log-item.is-on') ?? el?.lastElementChild
    // Scroll the box only, never the page.
    if (!el || !on) return
    // The box is positioned, so a step's offsetTop is measured from the box's top.
    if (on.offsetTop < el.scrollTop) el.scrollTop = on.offsetTop
    else if (on.offsetTop + on.offsetHeight > el.scrollTop + el.clientHeight) el.scrollTop = on.offsetTop + on.offsetHeight - el.clientHeight
  }, [steps.length, at])
  if (!steps.length) return null
  return (
    <ol className="step-log" ref={box} aria-label={tr('运行步骤', 'Steps of the run')}>
      {steps.map((s, k) => (
        <li key={k} className={`step-log-item ${k === at ? 'is-on' : ''} ${s.failed ? 'is-fail' : ''}`}>
          <span className="step-log-head"><b>{k + 1}</b>{L(s.label)}</span>
          <div className="step-log-value">{s.value}</div>
          {s.failed && <span className="step-log-why">{L(s.failed)}</span>}
        </li>
      ))}
    </ol>
  )
}
