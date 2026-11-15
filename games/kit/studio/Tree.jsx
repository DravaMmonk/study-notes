// The studio's three-level course tree. Course placement still supplies drop targets for moving levels and tasks.
import { Fragment, useMemo, useState } from 'react'
import { ChevronRight, Group, ListOrdered } from 'lucide-react'
import { eraLevels } from '../course.js'
import { L, tr } from '../shell/i18n.js'
import { courseGroups, courseTree, stays } from './tree.js'
import { usePref } from './prefs.js'

export default function Tree({ game, content, entries, at, selectedTask, picked, setPicked, onSelect, moving, setMoving, onMove, labels = null, onTask, onTaskMove }) {
  const [taskDrag, setTaskDrag] = useState(null) // the id of the task being dragged
  const [taskOver, setTaskOver] = useState(null)
  const tree = useMemo(() => courseTree(content.eras ?? []), [content])
  const [grouped, setGrouped] = usePref('course-by-group', false)
  const groupView = grouped && !moving
  const order = useMemo(() => tree.eras.flatMap(({ era }) => eraLevels(era)), [tree])
  const groups = useMemo(() => courseGroups(order, entries), [order, entries])
  const [groupFolds, setGroupFolds] = usePref('folded-course-groups', {})
  const foldedGroups = new Set(groupFolds[game] ?? [])
  const toggleGroup = (id) => {
    if (foldedGroups.has(id)) foldedGroups.delete(id)
    else foldedGroups.add(id)
    setGroupFolds((old) => ({ ...old, [game]: [...foldedGroups] }))
  }
  const rows = groupView ? groups.flatMap(({ id, levels }) => foldedGroups.has(id ?? '') ? [] : levels) : order
  const optional = useMemo(() => new Set(tree.eras.flatMap(({ era }) =>
    era.levels.filter((entry) => entry.optional).map(({ id }) => id))), [tree])
  const byId = useMemo(() => new Map(content.levels.map((l) => [l.id, l])), [content])
  const labelOf = useMemo(() => new Map((labels ?? []).map((l) => [l.id, l.label])), [labels])
  const [folds, setFolds] = usePref('folded-eras', {})
  const folded = new Set(folds[game] ?? [])
  const fold = (id) => setFolds((f) => {
    const mine = new Set(f[game] ?? [])
    if (mine.has(id)) mine.delete(id)
    else mine.add(id)
    return { ...f, [game]: [...mine] }
  })
  const [over, setOver] = useState(null)

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
    if (how === 'range' && at?.level) {
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
      {optional.has(id) && <small className="tree-optional">{tr('可选')}</small>}
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
    if (!moving || (moving.length === 1 && stays(tree, moving[0], to))) return null
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
    <nav className="tree" aria-label={tr('课程')}>
      <button type="button" className="kit-btn is-label tree-sort" aria-pressed={grouped}
        title={grouped ? tr('切换到课程顺序', 'Switch to course order') : tr('切换到按组排列', 'Switch to groups')}
        onClick={() => setGrouped(!grouped)}>
        {grouped ? <Group size={13} aria-hidden="true" /> : <ListOrdered size={13} aria-hidden="true" />}
        {grouped ? tr('按分组', 'By group') : tr('课程顺序', 'Course order')}
      </button>
      {groupView ? groups.map(({ id = '', title, code, levels }) => {
        const shut = foldedGroups.has(id)
        return (
          <section className={`tree-group tree-era ${shut ? 'is-folded' : ''}`} key={id}>
            <button type="button" className="tree-group-head" aria-expanded={!shut} onClick={() => toggleGroup(id)}>
              <span className="tree-fold"><ChevronRight size={12} aria-hidden="true" /></span>
              {code && <code>{code}</code>}{L(title) ?? tr('未分组', 'Ungrouped')}
            </button>
            {!shut && <div className="tree-levels">{levels.map(row)}</div>}
          </section>
        )
      }) : tree.eras.map(({ era: value, at: e, slots }) => {
        const shut = folded.has(String(value.id)) && !moving
        const title = L(value.title ?? value.chapter?.title) ?? String(value.id)
        return (
          <section key={value.id} className={`tree-era ${shut ? 'is-folded' : ''}`}>
            <div className={`tree-era-head ${at?.era === e ? 'is-on' : ''}`}>
              <button type="button" className="tree-fold" onClick={() => fold(String(value.id))} aria-expanded={!shut} aria-label={tr('折叠', 'Fold')}><ChevronRight size={12} aria-hidden="true" /></button>
              <button type="button" className="tree-era-name" onClick={() => onSelect({ era: e })} title={String(value.id)}>
                <span>{title}</span>
              </button>
            </div>
            {!shut && (
              <div className="tree-levels">
                {list(eraLevels(value), slots, title)}
              </div>
            )}
          </section>
        )
      })}
    </nav>
  )
}
