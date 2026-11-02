// The command palette (Ctrl/⌘+K): one box to go anywhere in the game and run any studio action (palette.js ranks
// the items). ↑↓ to choose, Enter to go, Escape to leave. An action that needs a word more (a new level's id) asks for
// it in the same box.
import { useEffect, useMemo, useRef, useState } from 'react'
import { tr } from '../shell/i18n.js'
import { rankPalette } from './palette.js'

const KIND = { recent: ['最近', 'Recent'], action: ['操作', 'Actions'], level: ['关卡', 'Levels'], era: ['章', 'Eras'], field: ['字段', 'Fields'], entry: ['百科', 'Encyclopedia'], finding: ['检查', 'Findings'] }
const SHOWN = 80

export default function Palette({ items, onRun, onClose }) {
  const [typed, setTyped] = useState('')
  const [at, setAt] = useState(0)
  const [asking, setAsking] = useState(null) // an action waiting for its word
  const list = useRef(null)
  const shown = useMemo(() => (asking ? [] : rankPalette(items, typed).slice(0, SHOWN)), [items, typed, asking])
  useEffect(() => setAt(0), [typed])
  useEffect(() => { list.current?.querySelector('.is-at')?.scrollIntoView({ block: 'nearest' }) }, [at])
  const run = (item) => {
    if (item.ask && !asking) {
      setAsking(item)
      setTyped(item.ask.value ?? '')
      return
    }
    onClose()
    onRun(item, asking ? typed.trim() : undefined)
  }
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAt((k) => Math.min(shown.length - 1, k + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAt((k) => Math.max(0, k - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (asking) { if (typed.trim()) run(asking) } else if (shown[at]) run(shown[at]) }
    else if (e.key === 'Escape') { e.preventDefault(); if (asking) { setAsking(null); setTyped('') } else onClose() }
  }
  let group = null
  return (
    <div className="palette-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="palette" role="dialog" aria-label={tr('命令面板', 'Command palette')}>
        <input
          className="palette-input" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={key} spellCheck={false}
          placeholder={asking ? asking.ask.placeholder : tr('关卡、字段、百科、检查……  > 操作  @ 字段', 'Levels, fields, entries, findings…  > actions  @ fields')}
          aria-label={asking ? asking.ask.placeholder : tr('搜索', 'Search')}
        />
        {asking && <p className="palette-ask">{asking.label}</p>}
        <ul className="palette-list" ref={list} role="listbox">
          {shown.map((item, k) => {
            const heading = item.kind !== group ? <li key={`g ${item.kind}`} className="palette-group">{tr(...KIND[item.kind])}</li> : null
            group = item.kind
            return [heading, (
              <li key={item.key} role="option" aria-selected={k === at} className={`palette-item is-${item.kind} ${k === at ? 'is-at' : ''}`} onPointerDown={(e) => { e.preventDefault(); run(item) }} onPointerEnter={() => setAt(k)}>
                <span>{item.label}</span>
                {item.detail && <small>{item.detail}</small>}
              </li>
            )]
          })}
        </ul>
      </div>
    </div>
  )
}
