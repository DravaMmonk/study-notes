import { useEffect, useMemo, useState } from 'react'
import { L, T, tr, isPair } from './i18n.js'
import Library, { store, useSeen } from './Library.jsx'
import { Markup } from './Markup.jsx'

// The encyclopedia (百科), the same in every game, after the one in Turing Complete: not one level's walkthrough but
// the game's big ideas, grouped: how the game is played, then the terms of the subject it teaches. A game brings
// `glossary: { groups: [{ id, title }], entries: [{ id, group, title, body: [paragraph…], at?, see? }] }`; an entry
// opens once the player reaches level `at` (none: from the start), or with every level unlocked. Entries not read
// yet carry a dot, here and on the buttons that open it.

function glossaryLayout(game) {
  const { groups = [], entries = [], groupByChapter } = game.glossary ?? {}
  if (!groupByChapter) return { groups, entries }
  const order = new Map(game.levels.map((level, index) => [level.id, index]))
  const chapters = (game.chapters ?? []).map(({ id, number, title }) => ({
    chapter: id,
    id: `chapter:${id}`,
    title: T(`第 ${number ?? id} 章 · ${isPair(title) ? title.zh : title}`, `Chapter ${number ?? id} · ${isPair(title) ? title.en ?? title.zh : title}`),
  }))
  const groupOf = new Map(chapters.map(({ chapter, id }) => [chapter, id]))
  const grouped = entries.map(entry => ({
    ...entry,
    group: groupOf.get(game.byId[entry.at]?.chapter) ?? entry.group,
  })).sort((a, b) => (order.get(a.at) ?? Infinity) - (order.get(b.at) ?? Infinity))
  const used = new Set(grouped.map(entry => entry.group))
  return { groups: [...chapters, ...groups].filter(group => used.has(group.id)), entries: grouped }
}

/**
 * Which entries are open and which are unread, for the encyclopedia and its buttons.
 * @param game, progress, solved   the shell's game and progress
 * @param level                    the level being played, if any (its own entries open with it)
 */
export function useWiki(game, progress, solved, level) {
  const { seen, markSeen } = useSeen(`${game.id}.wiki.seen`)
  const { groups, entries } = useMemo(() => glossaryLayout(game), [game])
  const reached = (id) => {
    const at = game.byId[id]
    return !at || progress.all || solved.has(id) || id === level?.id || game.isOpen(at, solved, progress.all)
  }
  const isOpen = (entry) => !entry.at || reached(entry.at)
  const unread = entries.filter((entry) => isOpen(entry) && !seen.has(entry.id))
  return { groups, entries, isOpen, unread, seen, markSeen }
}

export default function Encyclopedia({ game, wiki, level, phone, start, onClose }) {
  const { englishNamesInChinese = false } = game.glossary ?? {}
  const titleOf = ({ title }) => englishNamesInChinese && isPair(title) && title.en && title.zh !== title.en
    ? { ...title, zh: `${title.zh}（${title.en}）` } : title
  const { groups, entries, isOpen, seen, markSeen } = wiki
  const lastKey = `${game.id}.wiki.last`
  // Opening inside a level shows what that level brings in; otherwise what was read last, or the first entry.
  const [current, setCurrent] = useState(() => {
    const open = entries.filter(isOpen)
    const here = level && open.filter((entry) => entry.at === level.id)
    return (open.find((entry) => entry.id === start?.id) ?? here?.find((entry) => !seen.has(entry.id)) ?? here?.[0] ?? open.find((entry) => entry.id === store.read(lastKey, null)) ?? open[0])?.id ?? null
  })
  const [shownOnce, setShownOnce] = useState(!phone)
  useEffect(() => {
    if (current === null || !shownOnce) return
    markSeen(current)
    store.write(lastKey, current)
  }, [current, shownOnce]) // eslint-disable-line react-hooks/exhaustive-deps

  // A reference clicked inside the encyclopedia moves to that entry.
  useEffect(() => {
    if (!start) return
    setCurrent(start.id)
    setShownOnce(true)
  }, [start])
  const pick = (id) => {
    setCurrent(id)
    setShownOnce(true)
  }
  const list = groups.map((group) => ({
    id: group.id,
    title: group.title,
    items: entries.filter((e) => e.group === group.id).map((e) => ({ id: e.id, title: titleOf(e), open: isOpen(e), unread: !seen.has(e.id), lock: e.at && game.byId[e.at] ? game.levelLabel(game.byId[e.at]) : null })),
  }))

  const article = (id, back) => {
    const entry = entries.find((e) => e.id === id)
    const group = groups.find((g) => g.id === entry.group)
    return (
      <article className="wiki-article" key={entry.id}>
        {back}
        {group && <span className="panel-label">{L(group.title)}</span>}
        <h2>{L(titleOf(entry))}</h2>
        {entry.body.map((paragraph, k) => <p key={k}><Markup text={paragraph} /></p>)}
        {entry.see?.length > 0 && (
          <footer className="wiki-see">
            <span className="panel-label">{tr('相关词条', 'See also')}</span>
            <div>
              {entry.see.map((other) => entries.find((e) => e.id === other)).filter(Boolean).map((e) =>
                isOpen(e)
                  ? <button key={e.id} type="button" className="wiki-chip" onClick={() => pick(e.id)}><span>{L(titleOf(e))}</span></button>
                  : <span key={e.id} className="wiki-chip is-locked">{tr('？？？', '???')}</span>,
              )}
            </div>
          </footer>
        )}
      </article>
    )
  }

  return (
    <Library
      title={tr('百科', 'Encyclopedia')}
      subtitle={L(game.title)}
      label={tr('词条', 'Entries')}
      searchLabel={tr('查找词条', 'Find an entry')}
      groups={list}
      current={current}
      onPick={pick}
      article={article}
      phone={phone}
      onClose={onClose}
      start={start}
    />
  )
}
