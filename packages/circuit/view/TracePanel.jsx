import { Fragment } from 'react'
import { L } from 'kernel/view'
import { Markup } from 'kernel/view'

/** A trace spelled out as highlighted values or as contrasting histories. */
export default function TracePanel({ panel }) {
  if (!panel) return null
  if (panel.histories) return (
    <div className="cx">
      <div className="kicker bad">{L(panel.title)}</div>
      <p className="cx-p"><Markup text={L(panel.lead)} /></p>
      {panel.histories.map((row, k) => <div className="cx-row" key={k}>
        <header><b>{L(row.name)}</b><span>{L(row.description)}</span></header>
        <div className="houses">
          {row.cells.map((cell, i) => <Fragment key={i}>
            {cell.next && <span className="arrow">→</span>}
            <span className={`hs${cell.active ? ' on' : ''}${cell.next ? ' ask' : ''}`}>{L(cell.value)}<small>{L(cell.label)}</small></span>
          </Fragment>)}
        </div>
        <span className={`verdict ${row.pass ? 'yes' : 'no'}`}>{L(row.result)}</span>
      </div>)}
      <p className="cx-p"><Markup text={L(panel.caption)} /></p>
    </div>
  )
  return (
    <div className="afterbox">
      <span className="eyebrow">{L(panel.title)}</span>
      {panel.rows.map((row, k) => <div className="diff" key={k}>
        {row.map(({ text, note, tone, strike }, i) => <span className={tone ? `dt ${tone}` : 'dt'} key={i}>
          {strike ? <s>{L(text)}</s> : L(text)}
          {note !== undefined && <small>{L(note)}</small>}
        </span>)}
      </div>)}
      {panel.caption && <p className="cap"><Markup text={L(panel.caption)} /></p>}
    </div>
  )
}
