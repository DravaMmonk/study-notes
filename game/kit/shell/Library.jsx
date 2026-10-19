import { useState } from 'react'
import { ArrowLeft, Lock, Search, X } from 'lucide-react'
import { L, tr } from './i18n.js'
import { useEscape } from './Dialogs.jsx'

// A book of entries, after the encyclopedia in Turing Complete: entries by group on the left, the open entry on the
// right; on a phone, the list and then one entry at a time. The encyclopedia and the components box are both one.
//
// groups: [{ id, title?, items: [{ id, title, open, unread?, lock? }] }]   lock: what opens it (a level label)
// article(id, back): the open entry (back is the phone's way to the list, or null)
// filters: optional controls shown under the search box (the components box's robot filter)

const read = (key, fallback) => {
  try {
    return JSON.parse(window.localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
export const store = {
  read,
  write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Still holds for this visit.
    }
  },
}

/** Entries read so far, remembered under `key` in this browser. */
export function useSeen(key) {
  const [seen, setSeen] = useState(() => new Set(read(key, [])))
  const markSeen = (id) => {
    if (seen.has(id)) return
    const next = new Set(seen).add(id)
    setSeen(next)
    store.write(key, [...next])
  }
  return { seen, markSeen }
}

export default function Library({ title, subtitle, label, groups, current, onPick, article, phone, onClose, searchLabel, filters }) {
  const [query, setQuery] = useState('')
  const [reading, setReading] = useState(!phone && current !== null)
  useEscape(onClose)

  const show = (id) => {
    onPick(id)
    setReading(true)
  }
  const q = query.trim().toLowerCase()
  const titleText = (item) => (typeof item.title === 'object' && item.title && 'zh' in item.title ? `${item.title.zh} ${item.title.en}` : String(L(item.title)))
  const shown = groups
    .map((group) => ({ ...group, items: group.items.filter((item) => !q || (item.open && titleText(item).toLowerCase().includes(q))) }))
    .filter((group) => group.items.length)

  const list = (
    <nav className="wiki-nav" aria-label={label}>
      <label className="wiki-search">
        <Search size={14} aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchLabel} aria-label={searchLabel} />
      </label>
      {filters}
      {shown.map((group) => (
        <section key={group.id} className="wiki-group">
          {group.title && <h3 className="panel-label">{L(group.title)}</h3>}
          <ul>
            {group.items.map((item) => (
              <li key={item.id}>
                {item.open ? (
                  <button type="button" className={`wiki-item ${item.id === current && (reading || !phone) ? 'is-current' : ''}`} onClick={() => show(item.id)} aria-current={item.id === current ? 'true' : undefined}>
                    {item.lead}
                    <span>{L(item.title)}</span>
                    {item.unread && <i className="wiki-dot" aria-label={tr('未读', 'Unread')} />}
                  </button>
                ) : (
                  <span className="wiki-item is-locked" title={item.lock ? tr(`玩到第 ${item.lock} 关时解锁`, `Opens at level ${item.lock}`) : undefined}>
                    <Lock size={12} aria-hidden="true" />
                    <span>{tr('？？？', '???')}</span>
                    {item.lock && <small>{item.lock}</small>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!shown.length && <p className="panel-note">{tr('没有找到。', 'Nothing by that name.')}</p>}
    </nav>
  )

  const back = phone ? <button type="button" className="kit-btn is-label wiki-back" onClick={() => setReading(false)}><ArrowLeft size={15} /><span>{tr('返回列表', 'Back to the list')}</span></button> : null
  return (
    <div className="ph-scrim wiki-scrim" onClick={onClose}>
      <div className={`wiki ${phone ? 'is-phone' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className="wiki-head">
          <h2>{title}{subtitle && <small>{subtitle}</small>}</h2>
          <button className="ph-icon" onClick={onClose} aria-label={tr('关闭', 'Close')}><X size={18} /></button>
        </header>
        <div className="wiki-body">
          {(!phone || !reading) && list}
          {(!phone || reading) && (current !== null ? article(current, back) : <p className="panel-note wiki-empty">{tr('从左边选一项。', 'Pick one on the left.')}</p>)}
        </div>
      </div>
    </div>
  )
}
