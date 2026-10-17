import { useEffect, useMemo, useState } from 'react'
import { L, tr } from './i18n.js'
import Library, { store, useSeen } from './Library.jsx'

// The encyclopedia (百科), the same in every game, after the one in Turing Complete: not one level's walkthrough but
// the game's big ideas, grouped: how the game is played, then the terms of the subject it teaches. A game brings
// `glossary: { groups: [{ id, title }], entries: [{ id, group, title, body: [paragraph…], at?, see? }] }`; an entry
// opens once the player reaches level `at` (none: from the start), or with every level unlocked. Entries not read
// yet carry a dot, here and on the buttons that open it.

/**
 * Which entries are open and which are unread, for the encyclopedia and its buttons.
 * @param game, progress, solved   the shell's game and progress
 * @param level                    the level being played, if any (its own entries open with it)
 */
export function useWiki(game, progress, solved, level) {
  const { seen, markSeen } = useSeen(`${game.id}.wiki.seen`)
  const entries = useMemo(() => game.glossary?.entries ?? [], [game])
  const reached = (id) => {
    const at = game.byId[id]
    return !at || progress.all || solved.has(id) || id === level?.id || game.isOpen(at, solved, progress.all)
  }
  const isOpen = (entry) => !entry.at || reached(entry.at)
  const unread = entries.filter((entry) => isOpen(entry) && !seen.has(entry.id))
  return { entries, isOpen, unread, seen, markSeen }
}

export default function Encyclopedia({ game, wiki, level, phone, onClose }) {
  const { groups = [] } = game.glossary ?? {}
  const { entries, isOpen, seen, markSeen } = wiki
  const lastKey = `${game.id}.wiki.last`
  // Opening inside a level shows what that level brings in; otherwise what was read last, or the first entry.
  const [current, setCurrent] = useState(() => {
    const open = entries.filter(isOpen)
    const here = level && open.filter((entry) => entry.at === level.id)
    return (here?.find((entry) => !seen.has(entry.id)) ?? here?.[0] ?? open.find((entry) => entry.id === store.read(lastKey, null)) ?? open[0])?.id ?? null
  })
  const [shownOnce, setShownOnce] = useState(!phone)
  useEffect(() => {
    if (current === null || !shownOnce) return
    markSeen(current)
    store.write(lastKey, current)
  }, [current, shownOnce]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id) => {
    setCurrent(id)
    setShownOnce(true)
  }
  const list = groups.map((group) => ({
    id: group.id,
    title: group.title,
    items: entries.filter((e) => e.group === group.id).map((e) => ({ id: e.id, title: e.title, open: isOpen(e), unread: !seen.has(e.id), lock: e.at && game.byId[e.at] ? game.levelLabel(game.byId[e.at]) : null })),
  }))

  const article = (id, back) => {
    const entry = entries.find((e) => e.id === id)
    const group = groups.find((g) => g.id === entry.group)
    return (
      <article className="wiki-article" key={entry.id}>
        {back}
        {group && <span className="panel-label">{L(group.title)}</span>}
        <h2>{L(entry.title)}</h2>
        {entry.body.map((paragraph, k) => <p key={k} dangerouslySetInnerHTML={{ __html: String(L(paragraph)) }} />)}
        {entry.see?.length > 0 && (
          <footer className="wiki-see">
            <span className="panel-label">{tr('相关词条', 'See also')}</span>
            <div>
              {entry.see.map((other) => entries.find((e) => e.id === other)).filter(Boolean).map((e) =>
                isOpen(e)
                  ? <button key={e.id} type="button" className="wiki-chip" onClick={() => pick(e.id)}>{L(e.title)}</button>
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
    />
  )
}
