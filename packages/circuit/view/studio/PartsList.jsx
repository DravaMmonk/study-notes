import { L, tr, GroupedList, groupingsFor, shownName, taskOptionsOf, findTask } from 'kernel/view'
import { freeName } from 'kernel/view'
// The package's parts in the build workspace's left column. The kernel supplies creation options.

import { iconOf } from '../parts/icons.js'

import { partGroups } from '../../core/studio-parts.js'
import { builtPart, partCreationOptions } from '../../core/index.js'

import { partReference } from '../../core/index.js'

/**
 * The package's parts (games/DESIGN.md 6.7), in the order the course first gives them, grouped by their tags, the
 * trays or the relations that gather them (GroupedList.jsx); a new part from the kernel's creation options.
 */
export default function PartsList({ content, vocabulary, namespace, game, levelOptions, order = [], earned = new Map(), at, found, by, onBy, heading, onHeading, newOptions, onNew, onSelect, onOps }) {
  const file = content.partDefs ?? { parts: {} }
  const parts = Object.entries(file.parts ?? {})
  const tasks = levelOptions ? taskOptionsOf(levelOptions) : []
  const choices = partCreationOptions(vocabulary, tasks).map((option) => ({
    ...option, label: L(option.label),
    ...(option.value === 'task' && { children: tasks.map((task) => ({ ...task, value: `task:${task.value}` })) }),
  }))
  const create = (value) => {
    const type = freeName(parts.map(([id]) => id), 'circuit/part')
    if (value.startsWith('task:')) {
      const option = tasks.find((task) => task.value === value.slice('task:'.length))
      const found = findTask(content.levels, option.value)
      if (!found) return
      const level = content.levels.find(({ id }) => id === found.level)
      const task = level.tasks[found.at]
      const data = builtPart(partReference({ ...level, ...task }), option.title && L(option.title))
      onOps([
        { op: 'part.add', part: type, data },
        { op: 'level.set', level: found.level, path: ['tasks', found.at, 'publishes'],
          value: [...(task.publishes ?? []), { part: type, variant: data.inside[0].id }] },
      ])
    } else {
      onOps([{ op: 'part.add', part: type, data: choices.find((option) => option.value === value).data }])
    }
    onSelect({ part: type })
  }
  const items = partGroups(parts.map(([id]) => id), { at: (type) => earned.get(type) ?? null, order, primitives: content.primitives ?? [] })[0]?.types ?? []

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
    <GroupedList kind="circuit/part" content={content} namespace={namespace} game={game} items={items} label={(id) => L(file.parts[id]?.name)} row={row}
      groupings={groupingsFor('circuit/part')} by={by} onBy={onBy} heading={heading} onHeading={onHeading} newOptions={newOptions} onNew={onNew}
      addOptions={choices} addLabel={tr('新的元件', 'New part')} onAdd={create} />
  )
}
