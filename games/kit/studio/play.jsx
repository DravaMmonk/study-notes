// The game as the studio plays and edits it (games/DESIGN.md 6.7): the page studio.html?play inside the studio's
// iframe. The studio posts it the content it edits — as the pending changeset leaves it, not as the files hold it — and
// the level to open; this page hands that content to its domain's game.js and plays it in the shell, as the game's own
// page does. Its saves are its own (saved as the game `studio.<game>`), every level open. It may open a level on one of its boards
// (the save the seed tool gives), and while the studio edits a board it puts a button by the board that sends the board
// on screen back as blueprint text. In edit mode the page is the studio's editor (../shell/edit.js): a click on a
// field on screen picks it, a + adds an item, and the studio hears which task is played.
//
//   studio → page  { type: 'load', content, level, task, seed?: { data, task }, take?: { path, label }, theme, lang }
//                    a level opened afresh, at that task;  { type: 'look', theme, lang } the studio's theme and language;
//                  { type: 'content', content } the content edited, the level staying open as it is;
//                  { type: 'edit', on, picked } edit mode and the field picked;  { type: 'go', task } go to a task;
//                  { type: 'part', content, part } a part of parts.json shown (../shell/parts/PartPreview.jsx; a built
//                  piece, the board it runs: the game's parts.demo)
//   page → studio  { type: 'ready' } once it listens; { type: 'take', level, path, text };
//                  { type: 'pick' | 'add', level, task, at, scope, index? }; { type: 'task', level, task };
//                  { type: 'start', level, task, port, view } the view a port's value starts in, switched on the page;
//                  { type: 'pick' | 'add', part, path } a field of a part picked, an item added to one
import '../wires.css'
import '../shell/shell.css'
import '../views/views.css'
import '../circuit/circuit.css'
import { useEffect, useMemo, useState } from 'react'
import { GameShell } from '../shell/index.js'
import { createProgress, openAt, saved } from '../shell/progress.js'
import { applyLang } from '../lang.js'
import { localized } from '../engine/i18n.js'
import { DOMAINS } from 'virtual:studio-domains'
import PartPreview from '../shell/parts/PartPreview.jsx'

const say = (message) => window.parent.postMessage(message, window.location.origin)

/** The studio's theme and language. */
function look({ theme, lang }) {
  if (theme) document.documentElement.dataset.theme = theme
  if (lang && lang !== (document.documentElement.lang === 'en' ? 'en' : 'zh')) applyLang(lang)
}

/** The game the shell plays, made of `content`, with saves of its own, kept across the author's edits (a board an
 *  edit no longer fits opens as the level's start); `stamp` tells one content from the next. */
async function gameOf(content, stamp) {
  const [{ default: defineGame }, { vocabulary }] = await DOMAINS[content.domain]()
  const game = defineGame(localized(content, vocabulary))
  game.store = createProgress({ id: `studio.${content.id}` })
  game.stamp = stamp
  return game
}

/** A save with every level open and `level` opened on a board (a level of tasks: at its task). */
function seeded(game, level, seed) {
  const p = { ...game.store.load(), all: true, seenPower: true }
  const at = game.byId[level]
  if (!seed || !at) return game.store.save(p)
  if (seed.task === null) return game.store.save(saved(p, at, 0, seed.data))
  return game.store.save(saved(openAt(game, p, level, seed.task), at, seed.task, seed.data))
}

export default function Play() {
  const [shown, setShown] = useState(null) // { game, level, take, no }
  const [edit, setEdit] = useState({ on: false, picked: null })
  const [go, setGo] = useState(null) // { task, n }
  const [part, setPart] = useState(null) // { game, type }: a part shown instead of a level
  useEffect(() => {
    let no = 0
    let stamp = 0
    const onMessage = async (event) => {
      if (event.source !== window.parent) return
      const m = event.data
      if (m?.type === 'edit') return setEdit({ on: m.on, picked: m.picked ?? null })
      if (m?.type === 'go') return setGo((g) => ({ task: m.task, n: (g?.n ?? 0) + 1 }))
      if (m?.type === 'look') return look(m)
      if (m?.type === 'content') {
        const game = await gameOf(m.content, ++stamp)
        setPart((p) => (p ? { ...p, game } : p))
        return setShown((s) => (s ? { ...s, game } : s))
      }
      if (m?.type === 'part') {
        const game = await gameOf(m.content, ++stamp)
        look(m)
        return setPart({ game, type: m.part })
      }
      if (m?.type !== 'load') return
      const { content, level, task = 0, seed = null, take = null } = m
      const game = await gameOf(content, ++stamp)
      look(m)
      setPart(null)
      if (level) seeded(game, level, seed)
      const url = new URL(window.location.href)
      if (level) url.searchParams.set('level', level)
      else url.searchParams.delete('level')
      window.history.replaceState({}, '', url)
      no += 1
      setGo(task ? { task, n: no } : null)
      setShown({ game, level, take, no })
    }
    window.addEventListener('message', onMessage)
    say({ type: 'ready' })
    return () => window.removeEventListener('message', onMessage)
  }, [])
  const level = shown?.level
  const take = shown?.take
  const editing = useMemo(() => (edit.on ? {
    picked: edit.picked,
    pick: (mark) => say({ type: 'pick', ...mark }),
    add: (mark) => say({ type: 'add', ...mark }),
    start: (mark) => say({ type: 'start', ...mark }),
    onTask: (at, task) => say({ type: 'task', level: at, task }),
  } : null), [edit])
  const author = useMemo(() => ({
    level,
    take: take && { label: take.label, use: (text) => say({ type: 'take', level, path: take.path, text }) },
    edit: editing,
    go,
  }), [level, take, editing, go])
  if (part) {
    const parts = edit.on ? { picked: edit.picked, pick: (path) => say({ type: 'pick', part: part.type, path }), add: (path) => say({ type: 'add', part: part.type, path }) } : null
    if (part.game.defined?.of(part.type)) return <PartPreview game={part.game} type={part.type} edit={parts} />
    // A built piece shows the board it runs, as the parts box does.
    const piece = part.game.parts?.all.find((p) => p.piece === part.type) ?? { key: part.type, piece: part.type }
    return part.game.parts?.demo?.(piece, { progress: {} }) ?? null
  }
  if (!shown) return null
  return <GameShell key={shown.no} game={shown.game} store={shown.game.store} author={author} />
}
