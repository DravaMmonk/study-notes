// The game as the studio plays it (games/DESIGN.md 6.6): the page studio.html?play inside the studio's iframe. The
// studio posts it the content it edits — as the pending changeset leaves it, not as the files hold it — and the level
// to open; this page hands that content to its domain's game.jsx and plays it in the shell, as the game's own page
// does. Its saves are its own (`studio.<game>.v1`), every level open. It may open a level on one of its boards (the
// save the seed tool gives), and while the studio edits a board it puts a button by the board that sends the board
// on screen back as blueprint text.
//
//   studio → page  { type: 'load', content, level, seed?: { data, task }, take?: { path, label }, theme, lang }
//   page → studio  { type: 'ready' } once it listens; { type: 'take', level, path, text }
import '../wires.css'
import '../shell/shell.css'
import '../circuit/circuit.css'
import { useEffect, useState } from 'react'
import { GameShell } from '../shell/index.js'
import { createProgress } from '../shell/progress.js'
import { applyLang } from '../lang.js'
import { DOMAINS } from 'virtual:studio-domains'

/** The game the shell plays, made of `content`, with saves of its own. */
async function gameOf(content) {
  const defineGame = (await DOMAINS[content.domain]()).default
  const game = defineGame(content)
  game.store = createProgress({ id: `studio.${content.id}`, ...(game.progress ?? {}) })
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
  useEffect(() => {
    let no = 0
    const onMessage = async (event) => {
      if (event.source !== window.parent || event.data?.type !== 'load') return
      const { content, level, seed = null, take = null, theme, lang } = event.data
      const game = await gameOf(content)
      if (theme) document.documentElement.dataset.theme = theme
      if (lang && lang !== (document.documentElement.lang === 'en' ? 'en' : 'zh')) applyLang(lang)
      if (level) seeded(game, level, seed)
      const url = new URL(window.location.href)
      if (level) url.searchParams.set('level', level)
      else url.searchParams.delete('level')
      window.history.replaceState({}, '', url)
      no += 1
      setShown({ game, level, take, no })
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])
  if (!shown) return null
  const { game, level, take, no } = shown
  const author = take && { level, take: { label: take.label, use: (text) => window.parent.postMessage({ type: 'take', level, path: take.path, text }, window.location.origin) } }
  return <GameShell key={no} game={game} author={author} />
}
