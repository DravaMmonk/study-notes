// The course tree in the studio: each era as the map lays it out (tree.js), its levels to select, and to move by
// dragging one onto a slot between two others (or, without a mouse, by picking Move on the level and tapping a slot).
// A move is a level.move operation; its save migration shows in the changes before it is applied. ↑ and ↓ go from
// level to level; each shows its id, its title, and (on hover) its number on the map.
import { useEffect, useMemo, useState } from 'react'
import { L, tr } from '../shell/i18n.js'
import { courseTree, stays } from './tree.js'

export default function Tree({ content, lines, at, onSelect, moving, setMoving, onMove, labels = null }) {
  const tree = useMemo(() => courseTree(content.eras ?? []), [content])
  const byId = useMemo(() => new Map(content.levels.map((l) => [l.id, l])), [content])
  const labelOf = useMemo(() => new Map((labels ?? []).map((l) => [l.id, l.label])), [labels])
  const failing = useMemo(() => new Set(lines.filter((l) => l.fail).flatMap((l) => l.levels)), [lines])
  const [over, setOver] = useState(null)
  useEffect(() => {
    if (!moving) return undefined
    const key = (event) => event.key === 'Escape' && setMoving(null)
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [moving, setMoving])

  const level = (id) => (
    <button
      key={id}
      type="button"
      draggable
      className={`tree-level ${at?.level === id ? 'is-on' : ''} ${failing.has(id) ? 'is-fail' : ''} ${moving === id ? 'is-moving' : ''}`}
      title={labelOf.get(id)}
      onClick={() => onSelect({ level: id })}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        event.preventDefault()
        const all = [...event.currentTarget.closest('.tree').querySelectorAll('.tree-level')]
        const next = all[all.indexOf(event.currentTarget) + (event.key === 'ArrowDown' ? 1 : -1)]
        if (next) { next.focus(); next.click() }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', id)
        event.dataTransfer.effectAllowed = 'move'
        // After the drag has started: changing the page inside dragstart makes the browser drop the drag.
        window.setTimeout(() => setMoving(id))
      }}
      onDragEnd={() => setMoving(null)}
    >
      <b>{id}</b>
      <span>{L(byId.get(id)?.title) ?? ''}</span>
    </button>
  )
  const slot = (to) => {
    if (!moving || stays(tree, moving, to)) return <div key={JSON.stringify(to)} className="tree-gap" />
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
          {slot(slots[k + 1])}
        </div>
      ))}
    </>
  )

  return (
    <nav className="tree" aria-label={tr('课程', 'Course')}>
      <button type="button" className={`tree-game ${at?.game ? 'is-on' : ''}`} onClick={() => onSelect({ game: true })}>{L(content.title)}</button>
      {tree.eras.map(({ era, at: e, paths, topics, challenges, challengeSlot }) => (
        <section key={e} className="tree-era">
          <button type="button" className={`tree-era-head ${at?.era === e ? 'is-on' : ''}`} onClick={() => onSelect({ era: e })}>
            <small>{era.id}</small>
            <span>{L(era.title ?? era.chapter?.title) ?? ''}</span>
          </button>
          {paths.map(({ path, items, slots }) => (
            <div key={path} className={`tree-path is-${path}`}>
              {path !== 'foundation' && <small className="tree-role">{path}</small>}
              {slot(slots[0])}
              {items.map((item, k) => (
                <div key={item.level ?? item.parallel.map((b) => b.branch.id).join('+')} className="tree-run">
                  {item.level ? level(item.level) : (
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
          {topics.map(({ topic, levels, slots }) => (
            <div key={topic.id} className="tree-side is-topic">
              <small className="tree-role">{L(topic.title) ?? topic.id}</small>
              {list(levels, slots)}
            </div>
          ))}
          {(challenges.length > 0 || moving) && (
            <div className="tree-side is-challenge">
              <small className="tree-role">{tr('挑战', 'challenges')}</small>
              {challenges.map(level)}
              {slot(challengeSlot)}
            </div>
          )}
        </section>
      ))}
    </nav>
  )
}
