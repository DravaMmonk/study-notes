// The command palette (Ctrl/⌘+K): one box to go anywhere in the game and run any studio action (palette.js ranks
// the items). ↑↓ to choose, Enter to go, Escape to leave. An action that needs a word more (a new level's id) asks for
// it in the same box.
import { useMemo, useState } from 'react'
import { tr } from '../shell/i18n.js'
import { useOverlayKeys } from '../shell/useOverlayKeys.js'
import { rankPalette } from './palette.js'
import { useListCursor } from './useListCursor.js'

const KIND = { recent: ['最近', 'Recent'], action: ['操作', 'Actions'], level: ['关卡', 'Levels'], era: ['章', 'Eras'], field: ['字段', 'Fields'], entry: ['百科', 'Encyclopedia'], finding: ['检查', 'Findings'] }
const SHOWN = 80

export default function Palette({ items, onRun, onClose }) {
  const [typed, setTyped] = useState('')
  const [asking, setAsking] = useState(null) // an action waiting for its word
  const overlay = useOverlayKeys(() => {
    if (asking) {
      setAsking(null)
      setTyped('')
    } else onClose()
  })
  const shown = useMemo(() => (asking ? [] : rankPalette(items, typed).slice(0, SHOWN)), [items, typed, asking])
  const run = (item) => {
    if (item.ask && !asking) {
      setAsking(item)
      setTyped(item.ask.value ?? '')
      return
    }
    onClose()
    onRun(item, asking ? typed.trim() : undefined)
  }
  const { at, setAt, list, onKeyDown } = useListCursor(shown, {
    reset: typed,
    onConfirm: (item) => {
      if (asking) {
        if (typed.trim()) run(asking)
      } else if (item) run(item)
    },
  })
  let group = null
  return (
    <div ref={overlay} className="palette-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={tr('命令面板')}>
        <input
          className="palette-input" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={onKeyDown} spellCheck={false}
          placeholder={asking ? asking.ask.placeholder : tr('关卡、字段、百科、检查……  > 操作  @ 字段')}
          aria-label={asking ? asking.ask.placeholder : tr('搜索')}
        />
        {asking ? <p className="palette-ask">{asking.label}</p> : <ul className="palette-list" ref={list} role="listbox">
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
        </ul>}
      </div>
    </div>
  )
}
