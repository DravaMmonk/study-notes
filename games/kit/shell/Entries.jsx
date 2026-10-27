import { createContext, useContext } from 'react'

// A value of many entries (a clause set, a proof state's goals, a context's entries…), shown the same in every game:
// the entries in a window that scrolls, and under it, fixed, a last row saying how many there are. A shorter list makes
// a shorter window.
//
//   <Entries count="共 8 条子句" head={<b>…</b>} lines={5} max={20}>{entries as elements}</Entries>
//
// lines  the rows the whole thing takes at most, the count's row included
// max    how many entries it lists at most
// Both come from where it is shown unless given: EntriesSize says so for everything inside it. The board's default is
// BOARD; a sheet (Sheet.jsx) gives SHEET. A domain whose rows are taller than 12px lines sets --entry-row (shell.css).

export const BOARD = { lines: 5, max: 20 }
export const SHEET = { lines: 13, max: 50 }
export const EntriesSize = createContext(BOARD)

export default function Entries({ head, count, lines, max, className = '', children }) {
  const size = useContext(EntriesSize)
  const list = [].concat(children ?? []).filter(Boolean).slice(0, max ?? size.max)
  return (
    <span className={`entries ${className}`} style={{ '--entry-lines': (lines ?? size.lines) - (count ? 1 : 0) }}>
      <span className="entries-list">
        {head}
        {list}
      </span>
      {count && <small className="entries-count">{count}</small>}
    </span>
  )
}
