import { createContext, useContext } from 'react'

// A value of many entries (a clause set, a proof state's goals, a context's entries…), shown the same in every game:
// a window that scrolls, its last row saying how many there are. On the board a window is five rows and lists 20
// entries at most; in a sheet (Sheet.jsx, which says so through InSheet) it is thirteen rows and lists up to 50. A
// shorter list makes a shorter window. A domain whose rows are taller than 12px lines sets --entry-row (shell.css).
//
//   <Entries count="共 8 条子句" head={<b>…</b>}>{entries as elements}</Entries>

export const InSheet = createContext(false)

export const ENTRIES = { board: 20, sheet: 50 }

export default function Entries({ head, count, className = '', children }) {
  const cap = useContext(InSheet) ? ENTRIES.sheet : ENTRIES.board
  const list = [].concat(children ?? []).filter(Boolean)
  return (
    <span className={`entries ${className}`}>
      {head}
      {list.slice(0, cap)}
      {count && <small className="entries-count">{count}</small>}
    </span>
  )
}
