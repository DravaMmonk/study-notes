import { createElement, useEffect, useState } from 'react'
import { L, tr } from './i18n.js'
import Library, { store, useSeen } from './Library.jsx'

// The parts box (零件箱), laid out like the encyclopedia: every part the game has, by the chapter that earns it, each
// with what it does, a bench to try it on, and what its level taught. A game's `parts` brings
// { all: [{ key, name, desc?, icon?, family? }], earned(progress) → [key], demo?(part, { phone }) → React node }: the
// demo is a small circuit with the part at its centre that the player can change and run (games/kit/circuit
// DemoBench), on the desktop board or, on a phone, the phone one. The
// level that earns a part is the one whose `unlocks` lists its key.

/** Which parts are earned and which are new, for the parts box and its button. */
export function useParts(game, progress) {
  const { seen, markSeen } = useSeen(`${game.id}.parts.seen`)
  const earned = new Set(game.parts?.earned(progress) ?? [])
  const all = game.parts?.all ?? []
  const unread = all.filter((part) => earned.has(part.key) && !seen.has(part.key))
  return { all, earned, seen, markSeen, unread }
}

const levelOf = (game, key) => game.levels.find((level) => level.unlocks?.includes(key))

export default function PartsBook({ game, box, phone, onClose }) {
  const { all, earned, seen, markSeen } = box
  const lastKey = `${game.id}.parts.last`
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
  const groups = game.chapters
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.label ? `${L(chapter.label)} · ${L(chapter.title)}` : chapter.title,
      items: all
        .filter((part) => levelOf(game, part.key)?.chapter === chapter.id)
        .map((part) => {
          const level = levelOf(game, part.key)
          return { id: part.key, title: part.name, lead: chip(part, 13), open: earned.has(part.key), unread: !seen.has(part.key), lock: level ? game.levelLabel(level) : null }
        }),
    }))
    .filter((group) => group.items.length)

  const article = (key, back) => {
    const part = all.find((p) => p.key === key)
    const level = levelOf(game, key)
    const note = level && game.note(level)
    const demo = game.parts.demo?.(part, { phone })
    return (
      <article className="wiki-article parts-article" key={key} data-family={part.family}>
        {back}
        {level && <span className="panel-label">{tr(`第 ${game.levelLabel(level)} 关 · ${L(level.title)}`, `Level ${game.levelLabel(level)} · ${L(level.title)}`)}</span>}
        <h2>{chip(part, 18)}{L(part.name)}</h2>
        {part.desc && <p dangerouslySetInnerHTML={{ __html: String(L(part.desc)) }} />}
        {demo}
        {note && note !== part.desc && (
          <section className="wiki-see">
            <span className="panel-label">{tr('这一关学到的', 'What its level taught')}</span>
            <p dangerouslySetInnerHTML={{ __html: String(L(note)) }} />
          </section>
        )}
      </article>
    )
  }

  return (
    <Library
      title={tr('零件箱', 'Parts')}
      subtitle={tr(`${earned.size} / ${all.length} 个零件`, `${earned.size} of ${all.length} parts`)}
      label={tr('零件', 'Parts')}
      searchLabel={tr('查找零件', 'Find a part')}
      groups={groups}
      current={current}
      onPick={pick}
      article={article}
      phone={phone}
      onClose={onClose}
    />
  )
}
