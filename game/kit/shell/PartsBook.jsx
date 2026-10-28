import { createElement, useEffect, useState } from 'react'
import { L, tr } from './i18n.js'
import { Lock } from 'lucide-react'
import Library, { store, useSeen } from './Library.jsx'

// The components box (元件箱), laid out like the encyclopedia: every part the game has, in the order it is earned,
// each with what it does and a bench to try it on. A game's `parts` brings
// { all: [{ key, name, desc?, icon?, family?, rules? }], demo?(part, { phone }) → React node,
//   filters?(progress) → [{ key, name, icon?, lock?, keys }] }: the demo is a small circuit with the part at its
// centre that the player can change and run (games/kit/circuit DemoBench), on the desktop board or, on a phone, the
// phone one. A filter narrows the box to `keys` (a Set), such as the parts one robot can use; `icon` is SVG markup
// for a 32 × 32 box, and `lock` the label of the level that opens it (null once open). The level that earns a part is the
// one whose `unlocks` lists its key, or for a primitive the first level that brings it in (`at`). `rules` lists what a
// part gives as rules ([{ text, form? }], a game whose parts are rules), in a table of their own; a row with a `form`
// shows once the part's text has that form (revisions' `forms`).

/** Which parts are earned and which are new, for the components box and its button. */
export function useParts(game, progress) {
  const { seen, markSeen } = useSeen(`${game.id}.parts.seen`)
  const earned = new Set(game.parts?.earned(progress) ?? [])
  // A part's text as far as the player has got (defineGame textFor: a revision once its level is open).
  const all = (game.parts?.all ?? []).map((part) => game.textFor(part, progress))
  const unread = all.filter((part) => earned.has(part.key) && !seen.has(part.key))
  const filters = game.parts?.filters?.(progress) ?? []
  return { all, earned, seen, markSeen, unread, filters }
}

/** The level that earns a part: the one that unlocks it, or for a primitive the first that brings it in. */
export const levelOf = (game, part) => game.levels.find((level) => level.unlocks?.includes(part.key) || part.at?.includes(level.id))

export default function PartsBook({ game, box, phone, start, onClose }) {
  const { all: every, earned, seen, markSeen, filters } = box
  const lastKey = `${game.id}.parts.last`
  const filterKey = `${game.id}.parts.filter`
  // Opened at a part (a reference in a text): no filter that would hide it.
  const [filter, setFilter] = useState(() => (start ? null : filters.find((f) => f.key === store.read(filterKey, null) && !f.lock)?.key ?? null))
  const narrow = filters.find((f) => f.key === filter)
  const all = narrow ? every.filter((part) => narrow.keys.has(part.key)) : every
  const pickFilter = (key) => {
    setFilter(key)
    store.write(filterKey, key)
  }
  const [current, setCurrent] = useState(() => {
    const open = all.filter((part) => earned.has(part.key))
    return (open.find((part) => part.key === start?.id) ?? open.find((part) => !seen.has(part.key)) ?? open.find((part) => part.key === store.read(lastKey, null)) ?? open[0])?.key ?? null
  })
  const [shownOnce, setShownOnce] = useState(!phone)
  useEffect(() => {
    if (current === null || !shownOnce) return
    markSeen(current)
    store.write(lastKey, current)
  }, [current, shownOnce]) // eslint-disable-line react-hooks/exhaustive-deps
  // A reference clicked inside the box (a part's description) moves to that part.
  useEffect(() => {
    if (!start) return
    setFilter(null)
    setCurrent(start.id)
    setShownOnce(true)
  }, [start])
  const pick = (key) => {
    setCurrent(key)
    setShownOnce(true)
  }

  const chip = (part, size) => part.icon && <i className="family-chip" data-family={part.family}>{createElement(part.icon, { size, strokeWidth: 1.7 })}</i>
  // One group per chapter, headed as on the map, each in the order its parts are earned.
  const order = (part) => game.levels.indexOf(levelOf(game, part))
  const heading = (chapter) => {
    const kicker = (lang) => (chapter.kicker ? chapter.kicker[lang] ?? chapter.kicker : lang === 'zh' ? `第 ${chapter.number ?? chapter.id} 章` : `Chapter ${chapter.number ?? chapter.id}`)
    return { zh: `${kicker('zh')} · ${chapter.title?.zh ?? chapter.title}`, en: `${kicker('en')} · ${chapter.title?.en ?? chapter.title}` }
  }
  const groups = game.chapters.map((chapter) => ({
    id: String(chapter.id),
    title: heading(chapter),
    items: all.filter((part) => levelOf(game, part)?.chapter === chapter.id).sort((a, b) => order(a) - order(b)).map((part) => {
      const level = levelOf(game, part)
      return { id: part.key, title: part.name, lead: chip(part, 13), open: earned.has(part.key), unread: !seen.has(part.key), lock: level ? game.levelLabel(level) : null }
    }),
  })).filter((group) => group.items.length)

  const article = (key, back) => {
    const part = all.find((p) => p.key === key)
    const level = levelOf(game, part)
    const demo = game.parts.demo?.(part, { phone })
    // A rule a shape gives shows once the part has that shape.
    const rules = (part.rules ?? []).filter((r) => !r.form || part.forms?.includes(r.form))
    return (
      <article className="wiki-article parts-article" key={key} data-family={part.family}>
        {back}
        {level && <span className="panel-label">{tr(`第 ${game.levelLabel(level)} 关 · ${L(level.title)}`, `Level ${game.levelLabel(level)} · ${L(level.title)}`)}</span>}
        <h2>{chip(part, 18)}{L(part.name)}</h2>
        {part.desc && <p dangerouslySetInnerHTML={{ __html: String(L(part.desc)) }} />}
        {rules.length > 0 && (
          <section className="parts-rules">
            <h3>{tr('给出的规则', 'Rules it gives')}</h3>
            <table><tbody>{rules.map((r) => <tr key={r.text}><td><code>{r.text}</code></td></tr>)}</tbody></table>
          </section>
        )}
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
      start={start}
    />
  )
}

// The box narrowed to what one robot (or other filter) can use; a filter still locked shows where it opens.
function Filters({ filters, current, onPick }) {
  const chip = (key, name, icon, lock) => (
    <button key={key ?? 'all'} type="button" className="parts-filter" aria-pressed={current === key} disabled={Boolean(lock)} onClick={() => onPick(key)}
      title={lock ? tr(`玩到第 ${lock} 关时解锁`, `Opens at level ${lock}`) : undefined}>
      {lock ? <Lock size={12} aria-hidden="true" /> : icon && <svg className="parts-filter-icon" viewBox="0 0 32 32" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} />}
      <span>{lock ? tr('？？？', '???') : L(name)}</span>
      {lock && <small>{lock}</small>}
    </button>
  )
  return (
    <div className="parts-filters" role="group" aria-label={tr('按机器人筛选', 'Filter by robot')}>
      {chip(null, { zh: '全部', en: 'All' })}
      {filters.map((f) => chip(f.key, f.name, f.icon, f.lock))}
    </div>
  )
}
