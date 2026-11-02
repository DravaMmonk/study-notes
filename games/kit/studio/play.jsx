// The game as the studio plays and edits it (games/DESIGN.md 6.7): the page studio.html?play inside the studio's
// iframe. The studio posts it the content it edits — as the pending changeset leaves it, not as the files hold it — and
// the level to open; this page hands that content to its domain's game.jsx and plays it in the shell, as the game's own
// page does. Its saves are its own (`studio.<game>.v1`), every level open. It may open a level on one of its boards
// (the save the seed tool gives), and while the studio edits a board it puts a button by the board that sends the board
// on screen back as blueprint text. In edit mode the page is the studio's editor (../shell/edit.js): a click on a
// field on screen picks it, a + adds an item, and the studio hears which task is played.
//
//   studio → page  { type: 'load', content, level, task, seed?: { data, task }, take?: { path, label }, theme, lang }
//                    a level opened afresh, at that task;  { type: 'look', theme, lang } the studio's theme and language;
//                  { type: 'content', content } the content edited, the level staying open as it is;
//                  { type: 'edit', on, picked } edit mode and the field picked;  { type: 'go', task } go to a task
//   page → studio  { type: 'ready' } once it listens; { type: 'take', level, path, text };
//                  { type: 'pick' | 'add', level, task, at, scope, index? }; { type: 'task', level, task }
import '../wires.css'
import '../shell/shell.css'
import '../circuit/circuit.css'
import { useEffect, useMemo, useState } from 'react'
import { GameShell } from '../shell/index.js'
import { createProgress } from '../shell/progress.js'
import { applyLang } from '../lang.js'
import { DOMAINS } from 'virtual:studio-domains'

const say = (message) => window.parent.postMessage(message, window.location.origin)

/** The studio's theme and language. */
function look({ theme, lang }) {
  if (theme) document.documentElement.dataset.theme = theme
  if (lang && lang !== (document.documentElement.lang === 'en' ? 'en' : 'zh')) applyLang(lang)
}

/** The game the shell plays, made of `content`, with saves of its own; `stamp` tells one content from the next. */
async function gameOf(content, stamp) {
  const defineGame = (await DOMAINS[content.domain]()).default
  const game = defineGame(content)
  game.store = createProgress({ id: `studio.${content.id}`, ...(game.progress ?? {}) })
  game.stamp = stamp
  return game
}

/** A save with every level open and `level` opened on a board (a level of tasks: at its task). */
function seeded(game, level, seed) {
  const p = game.store.load()
  const next = { ...p, all: true, seenPower: true }
  if (seed) {
    if (seed.task === null) next.data = { ...p.data, [level]: seed.data }
    else {
      const list = Array.isArray(p.data[level]) ? [...p.data[level]] : []
      list[seed.task] = seed.data
      next.data = { ...p.data, [level]: list }
      next.tasks = { ...p.tasks, [level]: seed.task }
      next.solved = p.solved.filter((id) => id !== level)
    }
  }
  game.store.save(next)
}

export default function Play() {
  const [shown, setShown] = useState(null) // { game, level, take, no }
  const [edit, setEdit] = useState({ on: false, picked: null })
  const [go, setGo] = useState(null) // { task, n }
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
        return setShown((s) => (s ? { ...s, game } : s))
      }
      if (m?.type !== 'load') return
      const { content, level, task = 0, seed = null, take = null } = m
      const game = await gameOf(content, ++stamp)
      look(m)
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
    onTask: (at, task) => say({ type: 'task', level: at, task }),
  } : null), [edit])
  const author = useMemo(() => ({
    level,
    take: take && { label: take.label, use: (text) => say({ type: 'take', level, path: take.path, text }) },
    edit: editing,
    go,
  }), [level, take, editing, go])
  if (!shown) return null
  return <GameShell key={shown.no} game={shown.game} author={author} />
}
