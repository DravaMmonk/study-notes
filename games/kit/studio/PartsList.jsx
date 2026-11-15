// The game's pieces, grouped by tray and sorted by when the course gives them. The kernel supplies creation options.
import { L, tr } from '../shell/i18n.js'
import { iconOf } from '../shell/parts/icons.js'
import { useState } from 'react'
import SidebarListTools from './SidebarListTools.jsx'
import SidebarSection, { useSidebarFolds } from './SidebarSection.jsx'
import { sidebarSearch, sidebarSortOptions, sortSidebarIds } from './sidebar-list.js'
import { usePref } from './prefs.js'
import { taskOptionsOf } from './form.js'
import { pieceGroups } from './pieces.js'
import { builtPart, pieceCreationOptions } from '../engine/parts/schema.js'
import { findTask } from '../engine/tasks.js'
import { pieceReference } from '../engine/pieces.js'

/** A name for a new piece not taken yet. */
export const freeName = (taken, stem) => {
  let k = 1
  while (taken.includes(`${stem}${k}`)) k += 1
  return `${stem}${k}`
}

export default function PartsList({ content, vocabulary, levelOptions, order = [], earned = new Map(), at, activeTray, found, onSelect, onTray, onOps }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = usePref('piece-list-sort', 'tray')
  const { folded, toggle } = useSidebarFolds('folded-trays', content.id)
  const filtering = Boolean(query.trim())
  const file = content.partDefs ?? { parts: {} }
  const parts = Object.entries(file.parts ?? {})
  const tasks = levelOptions ? taskOptionsOf(levelOptions) : []
  const choices = pieceCreationOptions(vocabulary, tasks).map((option) => ({
    ...option, label: L(option.label),
    ...(option.value === 'task' && { children: tasks.map((task) => ({ ...task, value: `task:${task.value}` })) }),
  }))
  const create = (value) => {
    const type = freeName(parts.map(([id]) => id), 'part')
    if (value.startsWith('task:')) {
      const option = tasks.find((task) => task.value === value.slice('task:'.length))
      const found = findTask(content.levels, option.value)
      if (!found) return
      const level = content.levels.find(({ id }) => id === found.level)
      const task = level.tasks[found.at]
      const data = builtPart(pieceReference({ ...level, ...task }), option.title && L(option.title))
      onOps([
        { op: 'piece.add', piece: type, data },
        { op: 'level.set', level: found.level, path: ['tasks', found.at, 'publishes'],
          value: [...(task.publishes ?? []), { piece: type, variant: data.inside[0].id }] },
      ])
    } else {
      onOps([{ op: 'piece.add', piece: type, data: choices.find((option) => option.value === value).data }])
    }
    onSelect({ part: type })
  }
  const matches = sidebarSearch(query)
  const shown = parts.filter(([id, def]) => matches(id, L(def.name))).map(([id]) => id)
  const groups = sort === 'tray'
    ? pieceGroups(shown, { trays: content.trays, at: (type) => earned.get(type) ?? null, order, primitives: content.primitives ?? [] })
      .filter(({ types }) => !filtering || types.length)
    : [{ tray: null, types: sortSidebarIds(shown, sort, (id) => L(file.parts[id].name)) }]

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
        sortOptions={[{ value: 'tray', label: tr('按托盘', 'By tray') }, ...sidebarSortOptions()]} sort={sort} onSort={setSort} />
      {groups.map(({ tray, types }) => tray === null ? (
        <div key="loose" className="parts-group">
          {groups.length > 1 && <hr className="parts-rule" />}
          {types.map(row)}
        </div>
      ) : (
        <SidebarSection key={`tray:${tray}`} title={tray} name={tray} active={activeTray === tray} collapsed={!filtering && folded.has(tray)}
          onSelect={() => onTray(tray)} onToggle={() => toggle(tray)}>
          {types.map(row)}
        </SidebarSection>
      ))}
    </nav>
  )
}
