import { createElement, useEffect, useState } from 'react'
import { L, tr } from './i18n.js'
import { Lock } from 'lucide-react'
import Library, { store, useSeen } from './Library.jsx'

// The components box (元件箱), laid out like the encyclopedia: every part the game has, in the order it is earned,
// each with what it does and a bench to try it on. A game's `parts` brings
// { all: [{ key, name, desc?, icon?, family? }], earned(progress) → [key], demo?(part, { phone }) → React node,
//   filters?(progress) → [{ key, name, icon?, lock?, keys }] }: the demo is a small circuit with the part at its
// centre that the player can change and run (games/kit/circuit DemoBench), on the desktop board or, on a phone, the
// phone one. A filter narrows the box to `keys` (a Set), such as the parts one robot can use; `icon` is SVG markup
// for a 32 × 32 box, and `lock` the title of the level that opens it (null once open). The level that earns a part is the
// one whose `unlocks` lists its key.

/** Which parts are earned and which are new, for the components box and its button. */
export function useParts(game, progress) {
  const { seen, markSeen } = useSeen(`${game.id}.parts.seen`)
  const earned = new Set(game.parts?.earned(progress) ?? [])
  const all = game.parts?.all ?? []
  const unread = all.filter((part) => earned.has(part.key) && !seen.has(part.key))
  const filters = game.parts?.filters?.(progress) ?? []
  return { all, earned, seen, markSeen, unread, filters }
}

const levelOf = (game, key) => game.levels.find((level) => level.unlocks?.includes(key))

export default function PartsBook({ game, box, phone, onClose }) {
  const { all: every, earned, seen, markSeen, filters } = box
  const lastKey = `${game.id}.parts.last`
  const filterKey = `${game.id}.parts.filter`
  const [filter, setFilter] = useState(() => filters.find((f) => f.key === store.read(filterKey, null) && !f.lock)?.key ?? null)
  const narrow = filters.find((f) => f.key === filter)
  const all = narrow ? every.filter((part) => narrow.keys.has(part.key)) : every
  const pickFilter = (key) => {
    setFilter(key)
    store.write(filterKey, key)
  }
  const [current, setCurrent] = useState(() => {
    const open = all.filter((part) => earned.has(part.key))
    return (open.find((part) => !seen.has(part.key)) ?? open.find((part) => part.key === store.read(lastKey, null)) ?? open[0])?.key ?? null
  })
  const [shownOnce, setShownOnce] = useState(!phone)
  useEffect(() => {
    if (current === null || !shownOnce) return
    markSeen(current)
    store.write(lastKey, current)
  }, [current, shownOnce]) // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (key) => {
    setCurrent(key)
    setShownOnce(true)
  }

  const chip = (part, size) => part.icon && <i className="family-chip" data-family={part.family}>{createElement(part.icon, { size, strokeWidth: 1.7 })}</i>
  // One list in the order the parts are earned, without chapter headings.
  const groups = [{
    id: 'parts',
    items: game.chapters.flatMap((chapter) => all.filter((part) => levelOf(game, part.key)?.chapter === chapter.id)).map((part) => {
      const level = levelOf(game, part.key)
      return { id: part.key, title: part.name, lead: chip(part, 13), open: earned.has(part.key), unread: !seen.has(part.key), lock: level ? L(level.title) : null }
    }),
  }].filter((group) => group.items.length)

  const article = (key, back) => {
    const part = all.find((p) => p.key === key)
    const level = levelOf(game, key)
    const demo = game.parts.demo?.(part, { phone })
    return (
      <article className="wiki-article parts-article" key={key} data-family={part.family}>
        {back}
        {level && <span className="panel-label">{tr(`来自「${L(level.title)}」`, `From “${L(level.title)}”`)}</span>}
        <h2>{chip(part, 18)}{L(part.name)}</h2>
        {part.desc && <p dangerouslySetInnerHTML={{ __html: String(L(part.desc)) }} />}
        {demo}
      </article>
    )
  }

  return (
    <Library
      title={tr('元件箱', 'Components')}
      subtitle={tr(`${all.filter((part) => earned.has(part.key)).length} / ${all.length} 个元件`, `${all.filter((part) => earned.has(part.key)).length} of ${all.length} components`)}
      label={tr('元件', 'Components')}
      searchLabel={tr('查找元件', 'Find a component')}
      filters={filters.length > 0 && <Filters filters={filters} current={filter} onPick={pickFilter} />}
      groups={groups}
      current={current}
      onPick={pick}
      article={article}
      phone={phone}
      onClose={onClose}
    />
  )
}

// The box narrowed to what one robot (or other filter) can use; a filter still locked shows where it opens.
function Filters({ filters, current, onPick }) {
  const chip = (key, name, icon, lock) => (
    <button key={key ?? 'all'} type="button" className="parts-filter" aria-pressed={current === key} disabled={Boolean(lock)} onClick={() => onPick(key)}
      title={lock ? tr(`玩到「${L(lock)}」时解锁`, `Opens at “${L(lock)}”`) : undefined}>
      {lock ? <Lock size={12} aria-hidden="true" /> : icon && <svg className="parts-filter-icon" viewBox="0 0 32 32" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} />}
      <span>{lock ? tr('？？？', '???') : L(name)}</span>
      {lock && <small>{L(lock)}</small>}
    </button>
  )
  return (
    <div className="parts-filters" role="group" aria-label={tr('按机器人筛选', 'Filter by robot')}>
      {chip(null, { zh: '全部', en: 'All' })}
      {filters.map((f) => chip(f.key, f.name, f.icon, f.lock))}
    </div>
  )
}
