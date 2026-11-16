// The package's pieces in the build workspace's left column. The kernel supplies creation options.
import { L, tr } from '../shell/i18n.js'
import { iconOf } from '../shell/parts/icons.js'
import GroupedList from './GroupedList.jsx'
import { GROUPINGS } from './list-groups.js'
import { shownName } from './objects-edit.js'
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

/**
 * The package's pieces (games/DESIGN.md 6.7), in the order the course first gives them, grouped by their tags, the
 * trays or the relations that gather them (GroupedList.jsx); a new piece from the kernel's creation options.
 */
export default function PartsList({ content, vocabulary, namespace, game, levelOptions, order = [], earned = new Map(), at, found, by, onBy, heading, onHeading, newOptions, onNew, onSelect, onOps }) {
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
  const items = pieceGroups(parts.map(([id]) => id), { at: (type) => earned.get(type) ?? null, order, primitives: content.primitives ?? [] })[0]?.types ?? []

  const row = (type) => {
    const def = file.parts[type]
    const Icon = iconOf(def.icon ?? (def.inside ? 'CircuitBoard' : null))
    const n = found(type)
    return (
      <button key={type} type="button" className={`parts-row ${at?.part === type ? 'is-on' : ''}`} onClick={() => onSelect({ part: type })} title={L(def.desc ?? '')}>
        <i className="family-chip" data-family={def.family}>{Icon && <Icon size={12} aria-hidden="true" />}</i>
        <span>{L(def.name)}</span>
        <code>{shownName(namespace, type)}</code>
        {n > 0 && <b className="row-found">{n}</b>}
      </button>
    )
  }
  return (
    <GroupedList kind="piece" content={content} namespace={namespace} game={game} items={items} label={(id) => L(file.parts[id]?.name)} row={row}
      groupings={GROUPINGS.piece} by={by} onBy={onBy} heading={heading} onHeading={onHeading} newOptions={newOptions} onNew={onNew}
      addOptions={choices} addLabel={tr('新的件', 'New piece')} onAdd={create} />
  )
}
