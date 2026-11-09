import { createElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { L, tr } from './i18n.js'
import { PHONE, useMedia } from './useMedia.js'
import { firstTask, flagsIn, inheritedBoard, passed, saved as savedAt, taskKey, taskOpen, taskPassed } from './progress.js'
import { runKey, slotsOf } from './slots.js'
import { setRefs } from './refs.js'
import { SettingsContext } from './useSetting.js'
import { EmbedContext } from './embed.js'
import { settings } from './settings.js'

const THEME_KEY = 'fieldnotes.theme'
const HEIGHT = 'kit-embed-height'

/**
 * One level of a notes edition, embedded in a page of the notes (games/DESIGN.md 12.1): the page's paragraph before it
 * is its introduction and the one after its pass text, so the embed has no title, map, intro sheet or dialogs. The
 * level's screen is the game's own; the shared layouts read EmbedContext and lay it out as a block in the page's flow.
 * Progress is the game's (`store`, the same saves as its page), one board per task (no switcher). A task passed stays
 * on screen with its results; the next opens from the task steps. The theme follows the page (the stored choice, as it
 * changes); the page sets the language. The embed tells its parent how tall it is (`{ kit: 'kit-embed-height',
 * height }`), and a corner link opens the level on the game's own page.
 */
export default function EmbedShell({ game, store, levelId }) {
  const root = useRef(null)
  const [progress, setProgress] = useState(() => store.load())
  const level = game.byId[levelId] ?? null
  const [taskAt, setTaskAt] = useState(() => (level ? firstTask(game, progress, level.id) : 0))
  const [runs, setRuns] = useState({})
  const phone = useMedia(PHONE)
  const theme = useStoredTheme()

  useEffect(() => store.save(progress), [store, progress])
  useEffect(() => { window.addEventListener('storage', settings.notify); return () => window.removeEventListener('storage', settings.notify) }, [])
  useLayoutEffect(() => {
    const el = root.current
    if (!el || window.parent === window) return undefined
    const tell = () => window.parent.postMessage({ kit: HEIGHT, height: Math.ceil(el.getBoundingClientRect().height) }, '*')
    const observer = new ResizeObserver(tell)
    observer.observe(el)
    tell()
    return () => observer.disconnect()
  }, [])
  // A link in the level's text names its target; following one is for the game's own page.
  useEffect(() => setRefs({
    name: (kind, id) => (kind === 'level' && game.byId[id] ? { label: game.levelLabel(game.byId[id]), title: L(game.byId[id].title) } : null),
    open: () => {},
  }))
  const flags = useMemo(() => (level ? flagsIn(game, progress, level, taskAt) : new Set()), [game, progress, level, taskAt])

  if (!level) return <div ref={root} className="game is-embed"><div className="board-loading">{tr(`没有「${levelId}」这一关。`, `There is no level “${levelId}”.`)}</div></div>

  const tasks = level.tasks
  const key = taskKey(level, taskAt)
  const isPassed = (k) => taskPassed(game, progress, level.id, k)
  const go = (k) => setTaskAt(k)
  const played = { ...level, ...tasks[taskAt], steps: { names: tasks.map((t) => t.step), optional: tasks.map((t) => Boolean(t.optional)), at: taskAt, passed: tasks.map((_, k) => isPassed(k)), open: tasks.map((_, k) => taskOpen(game, progress, level.id, k)), go, skip: (k) => go(k + 1) } }
  const kept = progress.data[key] ?? (tasks[taskAt].carries && taskAt > 0 ? inheritedBoard(progress, { ...tasks[taskAt - 1], id: level.id }) : undefined)
  const slots = slotsOf(progress, key)
  const runAt = runKey(key, slots.list[slots.at].no)
  const keepRun = (mark) => setRuns((had) => {
    if (JSON.stringify(had[runAt] ?? null) === JSON.stringify(mark ?? null)) return had
    const next = { ...had }
    if (mark == null) delete next[runAt]
    else next[runAt] = mark
    return next
  })
  const kind = game.kinds[played.kind]
  const page = new URL(window.location.href)
  page.search = new URLSearchParams({ level: level.id }).toString()

  return (
    <SettingsContext.Provider value={game}>
      <EmbedContext.Provider value>
        <div ref={root} className="game is-embed" data-game={game.id}>
          <a className="embed-open" href={page.href} target="_blank" rel="noopener" title={tr('在游戏里打开', 'Open in the game')} aria-label={tr('在游戏里打开', 'Open in the game')}><Maximize2 size={14} /></a>
          {kind
            ? createElement(kind.Screen, {
              key: `${level.id}#${runAt}#${game.stamp ?? ''}`,
              game,
              level: played,
              saved: kept,
              save: (data) => setProgress((p) => savedAt(p, level, taskAt, data)),
              solved: progress.solved.includes(level.id) || isPassed(taskAt),
              solve: (score) => setProgress((p) => passed(game, p, level, taskAt, score)),
              fail: () => {},
              lastRun: runs[runAt],
              keepRun,
              flags,
              progress,
              theme,
              phone,
            })
            : <div className="board-loading">{tr('这类关卡尚在制作中。', 'This kind of level is still being made.')}</div>}
        </div>
      </EmbedContext.Provider>
    </SettingsContext.Provider>
  )
}

/** The theme the notes chose, following it as it changes in another page of the site. */
function useStoredTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme)
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== THEME_KEY || !event.newValue) return
      document.documentElement.dataset.theme = event.newValue
      setTheme(event.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return theme
}
