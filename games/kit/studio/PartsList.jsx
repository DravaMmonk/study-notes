// The game's pieces, grouped by tray and sorted by when the course gives them. The kernel supplies creation options.
import { L, tr } from '../shell/i18n.js'
import { iconOf } from '../shell/parts/icons.js'
import { useState } from 'react'
import SidebarListTools from './SidebarListTools.jsx'
import { alphabetic, bySidebarName, sidebarSearch } from './sidebar-list.js'
import { usePref } from './prefs.js'
import { taskOptionsOf } from './form.js'
import { pieceGroups } from './pieces.js'
import { builtPart, pieceCreationOptions } from '../engine/parts/schema.js'

/** A name for a new piece not taken yet. */
export const freeName = (taken, stem) => {
  let k = 1
  while (taken.includes(`${stem}${k}`)) k += 1
  return `${stem}${k}`
}

export default function PartsList({ content, vocabulary, levelOptions, order = [], earned = new Map(), at, found, onSelect, onEdit }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = usePref('piece-list-sort', 'tray')
  const file = content.partDefs ?? { parts: {} }
  const parts = Object.entries(file.parts ?? {})
  const tasks = levelOptions ? taskOptionsOf(levelOptions) : []
  const choices = pieceCreationOptions(vocabulary, tasks).map((option) => ({
    ...option, label: L(option.label),
    ...(option.value === 'task' && { children: tasks.map((task) => ({ ...task, value: `task:${task.value}` })) }),
  }))
  const add = (data) => {
    const type = freeName(parts.map(([t]) => t), 'part')
    onEdit({ op: 'piece.add', piece: type, data })
    onSelect({ part: type })
  }
  const create = (value) => {
    if (value.startsWith('task:')) {
      const task = tasks.find((option) => option.value === value.slice('task:'.length))
      add(builtPart(task.value, task.title && L(task.title)))
    } else {
      add(choices.find((option) => option.value === value).data)
    }
  }
  const matches = sidebarSearch(query)
  const shown = parts.filter(([id, def]) => matches(id, L(def.name))).map(([id]) => id)
  const groups = sort === 'alphabetic'
    ? [{ tray: null, types: bySidebarName(shown, (id) => L(file.parts[id].name)) }]
    : pieceGroups(shown, { trays: content.trays, at: (type) => earned.get(type) ?? null, order, primitives: content.primitives ?? [] })

  const row = (type) => {
    const def = file.parts[type]
    const Icon = iconOf(def.icon ?? (def.inside ? 'CircuitBoard' : null))
    const n = found(type)
    return (
      <button key={type} type="button" className={`parts-row ${at?.part === type ? 'is-on' : ''}`} onClick={() => onSelect({ part: type })} title={L(def.desc ?? '')}>
        <i className="family-chip" data-family={def.family}>{Icon && <Icon size={12} aria-hidden="true" />}</i>
        <span>{L(def.name)}</span>
        <code>{type}</code>
        {n > 0 && <b className="row-found">{n}</b>}
      </button>
    )
  }
  return (
    <nav className="parts-list" aria-label={tr('件', 'Pieces')}>
      <SidebarListTools addOptions={choices} onAdd={create} query={query} onQuery={setQuery}
        sortOptions={[{ value: 'tray', label: tr('按托盘', 'By tray') }, alphabetic()]} sort={sort} onSort={setSort} />
      {groups.map((g) => (
        <section key={g.tray ?? ''} className="parts-group">
          {g.tray ? <span className="parts-tray">{g.tray}</span> : groups.length > 1 && <hr className="parts-rule" />}
          {g.types.map(row)}
        </section>
      ))}
    </nav>
  )
}
