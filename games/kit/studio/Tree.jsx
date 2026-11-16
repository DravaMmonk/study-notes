// The package workspace's tree: level groups, each its levels in its order and their tasks, then the levels in no
// group. Dragging a level puts it at a place in a group (group.place); dragging a task moves it in or between levels.
import { Fragment, useMemo, useState } from 'react'
import { L, tr } from '../shell/i18n.js'
import { groupTree, stays } from './groups.js'
import SidebarListTools from './SidebarListTools.jsx'
import SidebarSection, { useSidebarFolds } from './SidebarSection.jsx'
import { sidebarSearch, sidebarSortOptions, sortSidebarIds } from './sidebar-list.js'
import { usePref } from './prefs.js'

export default function Tree({ game, content, order: playOrder = [], at, selectedTask, picked, setPicked, onSelect, moving, setMoving, onMove, labels = null, onTask, onTaskMove, addOptions, onAdd }) {
  const [taskDrag, setTaskDrag] = useState(null) // the id of the task being dragged
  const [taskOver, setTaskOver] = useState(null)
  const tree = useMemo(() => groupTree(content, playOrder), [content, playOrder])
  const [query, setQuery] = useState('')
  const [sort, setSort] = usePref('package-list-sort', 'group')
  const sortOptions = [{ value: 'group', label: tr('按分组', 'By group') }, ...sidebarSortOptions()]
  const view = !moving && sortOptions.some(({ value }) => value === sort) ? sort : 'group'
  const filtering = !moving && Boolean(query.trim())
  const ids = (section) => section.levels.map(({ id }) => id)
  const order = useMemo(() => tree.sections.flatMap(ids), [tree])
  const placements = useMemo(() => new Map(tree.sections.flatMap(({ levels }) => levels.map((entry) => [entry.id, entry]))), [tree])
  const byId = useMemo(() => new Map(content.levels.map((l) => [l.id, l])), [content])
  const labelOf = useMemo(() => new Map((labels ?? []).map((l) => [l.id, l.label])), [labels])
  const { folded, toggle: fold } = useSidebarFolds('folded-groups', game)
  const [over, setOver] = useState(null)

  const matches = sidebarSearch(filtering ? query : '')
  const visible = new Set(order.filter((id) => {
    const level = byId.get(id)
    return matches(id, labelOf.get(id), L(level?.title)) ||
      level?.tasks?.some((task) => matches(task.id, L(task.step)))
  }))
  const flat = view !== 'group'
  const rows = flat ? sortSidebarIds(visible, view, (id) => L(byId.get(id)?.title))
    : tree.sections.flatMap((section) => !filtering && !moving && folded.has(section.key) ? [] : ids(section).filter((id) => visible.has(id)))

  /** Pick by a click or a key: one level, one more (toggle), or the run from the level selected to it. */
  const pick = (id, how) => {
    if (how === 'toggle') {
      const next = new Set(picked.size ? picked : at?.level ? [at.level] : [])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setPicked(next)
      if (next.has(id)) onSelect({ level: id }, true)
      return
    }
    if (how === 'range' && rows.includes(at?.level)) {
      const [a, b] = [rows.indexOf(at.level), rows.indexOf(id)].sort((x, y) => x - y)
      setPicked(new Set(rows.slice(a, b + 1)))
      return
    }
    setPicked(new Set([id]))
    onSelect({ level: id })
  }
  const dragging = (id) => (picked.size > 1 && picked.has(id) ? rows.filter((r) => picked.has(r)) : [id])

  const showsTasks = (id) => (byId.get(id)?.tasks?.length ?? 0) > 1

  const level = (id) => (
    <button
      key={id}
      type="button"
      draggable
      data-level={id}
      className={`tree-level ${at?.level === id && (selectedTask === null || !showsTasks(id)) ? 'is-on' : ''} ${picked.size > 1 && picked.has(id) ? 'is-picked' : ''} ${moving?.includes(id) ? 'is-moving' : ''}`}
      title={labelOf.get(id) ?? id}
      onClick={(e) => pick(id, e.metaKey || e.ctrlKey ? 'toggle' : e.shiftKey ? 'range' : 'one')}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        event.preventDefault()
        const all = [...event.currentTarget.closest('.tree').querySelectorAll('.tree-level')]
        const next = all[all.indexOf(event.currentTarget) + (event.key === 'ArrowDown' ? 1 : -1)]
        if (!next) return
        next.focus()
        if (event.shiftKey) setPicked(new Set([...(picked.size ? picked : [id]), next.dataset.level]))
        else pick(next.dataset.level, 'one')
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', id)
        event.dataTransfer.effectAllowed = 'move'
        const ids = dragging(id)
        // After the drag has started: changing the page inside dragstart makes the browser drop the drag.
        window.setTimeout(() => setMoving(ids))
      }}
      onDragEnd={() => setMoving(null)}
      {...(taskDrag && taskTarget(id, { level: id }))}
    >
      <code className="tree-level-id" title={id}>{id}</code>
      <span>{L(byId.get(id)?.title)}</span>
      {placements.get(id)?.optional && <small className="tree-optional">{tr('可选')}</small>}
      {placements.get(id)?.skippable && <small className="tree-optional">{tr('可跳过', 'Skippable')}</small>}
    </button>
  )
  /** What makes a row a place a dragged task goes. */
  const taskTarget = (key, to) => ({
    'data-over': taskOver === key ? '' : undefined,
    onDragOver: (event) => { event.preventDefault(); setTaskOver(key) },
    onDragLeave: () => setTaskOver(null),
    onDrop: (event) => {
      event.preventDefault()
      event.stopPropagation()
      setTaskOver(null)
      if (to.after !== taskDrag) onTaskMove(taskDrag, to)
      setTaskDrag(null)
    },
  })
  const tasksOf = (id) => {
    if (!showsTasks(id)) return null
    const tasks = byId.get(id).tasks
    return (
      <div className="tree-tasks">
        {tasks.map((task, k) => (
          <button
            key={task.id} type="button" draggable className={`tree-task ${at?.level === id && selectedTask === k ? 'is-on' : ''} ${taskDrag === task.id ? 'is-moving' : ''}`} title={task.id}
            onClick={() => onTask(task.id)}
            onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData('text/plain', task.id); event.dataTransfer.effectAllowed = 'move'; window.setTimeout(() => setTaskDrag(task.id)) }}
            onDragEnd={() => { setTaskDrag(null); setTaskOver(null) }}
            {...(taskDrag && taskTarget(task.id, { level: id, after: task.id }))}
          >
            <span>{L(task.step) ?? tr(`任务 ${k + 1}`, `Task ${k + 1}`)}</span>
            {task.optional && <small className="tree-optional">{tr('可选')}</small>}
          </button>
        ))}
      </div>
    )
  }
  const slot = (to, destination) => {
    if (!to || !moving || (moving.length === 1 && stays(tree, moving[0], to))) return null
    const key = JSON.stringify(to)
    return (
      <button
        key={key}
        type="button"
        className={`tree-slot ${over === key ? 'is-over' : ''}`}
        title={destination}
        aria-label={`${tr('放到这里')} · ${destination}`}
        onClick={() => onMove(moving, to)}
        onDragOver={(event) => { event.preventDefault(); setOver(key) }}
        onDragLeave={() => setOver(null)}
        onDrop={(event) => { event.preventDefault(); setOver(null); onMove(moving, to) }}
      />
    )
  }
  const row = (id) => (
    <div key={id} className="tree-run">
      {level(id)}
      {tasksOf(id)}
    </div>
  )
  const list = (levels, slots, destination) => (
    <>
      {slot(slots[0], destination)}
      {levels.map((id, k) => (
        <Fragment key={id}>
          {row(id)}
          {slot(slots[k + 1], destination)}
        </Fragment>
      ))}
    </>
  )

  return (
    <nav className="tree" aria-label={tr('关卡分组', 'Level groups')}>
      <SidebarListTools addOptions={addOptions} onAdd={onAdd} query={query} onQuery={setQuery}
        sortOptions={sortOptions} sort={view} onSort={setSort} />
      {flat ? <div className="tree-levels">{rows.map(row)}</div>
        : tree.sections.map((section) => {
        const levels = ids(section).filter((id) => visible.has(id))
        if ((filtering || section.group === null) && !levels.length && !moving) return null
        const shut = folded.has(section.key) && !filtering && !moving
        const title = section.group === null ? tr('未分组', 'Ungrouped') : L(content.groups[section.group].title) || section.group
        return (
          <SidebarSection key={section.key} title={title} name={section.group ?? ''} active={section.group !== null && at?.group === section.group} collapsed={shut}
            onSelect={section.group === null ? undefined : () => onSelect({ group: section.group })} onToggle={() => fold(section.key)}>
            {list(ids(section), section.slots, title)}
          </SidebarSection>
        )
      })}
    </nav>
  )
}
