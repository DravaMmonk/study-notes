// The course tree in the studio: each era as the map lays it out (tree.js) — its main path, its parallel branches one
// under another, its topics and challenges — a row a level, with what the check, the domain, the tests and blind play
// say of it as small marks (worklist.js marksOf): failing findings (a count), open or reported ones (a dot), the
// domain's answers (a square: passing, failing, not checked yet), the tests it holds, blind play's cost (a bar). An
// era folds away (remembered per viewer). A click selects a level; Ctrl/⌘-click picks several, Shift-click a run of
// them, for a bulk edit. Dragging a level (or the levels picked) onto a slot between two others, or Move and then a
// slot, is a level.move each; its save migration shows in the changes before it is applied. ↑ and ↓ go from level to
// level, with Shift picking as they go. A level of several tasks with ids (../engine/tasks.js) lists them under it: a
// click opens the task in the side panel, and dragging one onto another level puts it after that level's tasks, onto
// another task after that task (task.move; what players kept of it follows its id).
import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { courseTree, stays } from './tree.js'
import { usePref } from './prefs.js'

const COST_TOP = 6 // the cost a full bar stands for

/** The levels of a tree in the order its rows show them. */
export function rowsOf(tree) {
  const out = []
  for (const era of tree.eras) {
    for (const p of era.paths) for (const item of p.items) out.push(...(item.level ? [item.level] : item.parallel.flatMap((b) => b.levels)))
    for (const t of era.topics) out.push(...t.levels)
    out.push(...era.challenges)
  }
  return out
}

function Marks({ mark }) {
  if (!mark) return null
  const says = [
    mark.fails ? tr(`${mark.fails} 处不过`, `${mark.fails} failing`) : null,
    mark.open ? tr(`${mark.open} 处待办`, `${mark.open} open`) : null,
    mark.domain ? tr(`答案${mark.domain === 'pass' ? '通过' : '不过'}`, `answers ${mark.domain === 'pass' ? 'pass' : 'fail'}`) : null,
    tr(`${mark.tests} 个测试`, `${mark.tests} tests`),
    mark.cost !== null ? tr(`盲玩代价 ${mark.cost.toFixed(1)}`, `blind cost ${mark.cost.toFixed(1)}`) : null,
  ].filter(Boolean).join(' · ')
  return (
    <span className="mk" title={says}>
      {mark.fails > 0 ? <i className="mk-fail">{mark.fails}</i> : mark.open > 0 ? <i className="mk-open" /> : null}
      <i className={`mk-ref is-${mark.domain ?? 'none'}`} />
      <i className="mk-n">{mark.tests || ''}</i>
      <i className="mk-cost" style={{ '--cost': mark.cost === null ? 0 : Math.min(1, mark.cost / COST_TOP) }} data-high={mark.cost >= 2 ? '' : undefined} />
    </span>
  )
}

export default function Tree({ game, content, marks, at, picked, setPicked, onSelect, moving, setMoving, onMove, labels = null, tasked = false, onTask, onTaskMove }) {
  const [taskDrag, setTaskDrag] = useState(null) // the id of the task being dragged
  const [taskOver, setTaskOver] = useState(null)
  const tree = useMemo(() => courseTree(content.eras ?? []), [content])
  const rows = useMemo(() => rowsOf(tree), [tree])
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
  useEffect(() => {
    if (!moving) return undefined
    const key = (event) => event.key === 'Escape' && setMoving(null)
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [moving, setMoving])

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

  const level = (id) => (
    <button
      key={id}
      type="button"
      draggable
      data-level={id}
      className={`tree-level ${at?.level === id ? 'is-on' : ''} ${picked.size > 1 && picked.has(id) ? 'is-picked' : ''} ${moving?.includes(id) ? 'is-moving' : ''}`}
      title={labelOf.get(id)}
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
      <b>{id}</b>
      <span>{L(byId.get(id)?.title) ?? ''}</span>
      <Marks mark={marks?.get(id)} />
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
  // The tasks of a level of several, under it.
  const tasksOf = (id) => {
    const tasks = byId.get(id)?.tasks
    if (!tasked || !Array.isArray(tasks) || tasks.length < 2) return null
    return (
      <div className="tree-tasks">
        {tasks.map((task, k) => (
          <button
            key={task.id} type="button" draggable className={`tree-task ${taskDrag === task.id ? 'is-moving' : ''}`} title={task.id}
            onClick={() => onTask(id, k)}
            onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData('text/plain', task.id); event.dataTransfer.effectAllowed = 'move'; window.setTimeout(() => setTaskDrag(task.id)) }}
            onDragEnd={() => { setTaskDrag(null); setTaskOver(null) }}
            {...(taskDrag && taskTarget(task.id, { level: id, after: task.id }))}
          >
            <i>{k + 1}</i>
            <span>{task.step ? L(task.step) : task.id}</span>
          </button>
        ))}
      </div>
    )
  }
  const slot = (to) => {
    if (!moving || (moving.length === 1 && stays(tree, moving[0], to))) return <div key={JSON.stringify(to)} className="tree-gap" />
    const key = JSON.stringify(to)
    return (
      <button
        key={key}
        type="button"
        className={`tree-slot ${over === key ? 'is-over' : ''}`}
        aria-label={tr('放到这里', 'Move here')}
        onClick={() => onMove(moving, to)}
        onDragOver={(event) => { event.preventDefault(); setOver(key) }}
        onDragLeave={() => setOver(null)}
        onDrop={(event) => { event.preventDefault(); setOver(null); onMove(moving, to) }}
      />
    )
  }
  const list = (levels, slots) => (
    <>
      {slot(slots[0])}
      {levels.map((id, k) => (
        <div key={id} className="tree-run">
          {level(id)}
          {tasksOf(id)}
          {slot(slots[k + 1])}
        </div>
      ))}
    </>
  )
  const eraFails = (era) => [...eraIds(era)].reduce((n, id) => n + (marks?.get(id)?.fails ?? 0), 0)

  return (
    <nav className="tree" aria-label={tr('课程', 'Course')}>
      <button type="button" className={`tree-game ${at?.game ? 'is-on' : ''}`} onClick={() => onSelect({ game: true })}>{L(content.title)}</button>
      {tree.eras.map((era) => {
        const { era: value, at: e, paths, topics, challenges, challengeSlot } = era
        const shut = folded.has(String(value.id)) && !moving
        const fails = eraFails(era)
        return (
          <section key={e} className={`tree-era ${shut ? 'is-folded' : ''}`}>
            <div className={`tree-era-head ${at?.era === e ? 'is-on' : ''}`}>
              <button type="button" className="tree-fold" onClick={() => fold(String(value.id))} aria-expanded={!shut} aria-label={tr('折叠', 'Fold')}><ChevronRight size={12} aria-hidden="true" /></button>
              <button type="button" className="tree-era-name" onClick={() => onSelect({ era: e })}>
                <small>{value.id}</small>
                <span>{L(value.title ?? value.chapter?.title) ?? ''}</span>
              </button>
              {fails > 0 && <i className="mk-fail">{fails}</i>}
            </div>
            {!shut && paths.map(({ path, items, slots }) => (
              <div key={path} className={`tree-path is-${path}`}>
                {path !== 'foundation' && <small className="tree-role">{path}</small>}
                {slot(slots[0])}
                {items.map((item, k) => (
                  <div key={item.level ?? item.parallel.map((b) => b.branch.id).join('+')} className="tree-run">
                    {item.level ? <>{level(item.level)}{tasksOf(item.level)}</> : (
                      <div className="tree-set">
                        {item.parallel.map(({ branch, levels, slots: bs }) => (
                          <div key={branch.id} className="tree-branch">
                            <small className="tree-role">{L(branch.title) ?? branch.id}</small>
                            {list(levels, bs)}
                          </div>
                        ))}
                      </div>
                    )}
                    {slot(slots[k + 1])}
                  </div>
                ))}
              </div>
            ))}
            {!shut && topics.map(({ topic, levels, slots }) => (
              <div key={topic.id} className="tree-side is-topic">
                <small className="tree-role">{L(topic.title) ?? topic.id}</small>
                {list(levels, slots)}
              </div>
            ))}
            {!shut && (challenges.length > 0 || moving) && (
              <div className="tree-side is-challenge">
                <small className="tree-role">{tr('挑战', 'challenges')}</small>
                {challenges.map(level)}
                {slot(challengeSlot)}
              </div>
            )}
          </section>
        )
      })}
    </nav>
  )
}

/** The levels of one era of the tree. */
function eraIds(era) {
  return rowsOf({ eras: [era] })
}
