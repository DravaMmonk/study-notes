import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookMarked, BookOpen, PanelLeft } from 'lucide-react'
import { applyTheme } from '../theme.js'
import { currentLang } from '../lang.js'
import { mountBarMenus } from '../menu.js'
import { L, tr } from './i18n.js'
import { preference } from './progress.js'
import { PHONE, useMedia } from './useMedia.js'
import { Dialog, FailDialog, SolvedDialog } from './Dialogs.jsx'
import Encyclopedia, { useWiki } from './Encyclopedia.jsx'
import PartsBook, { useParts } from './PartsBook.jsx'
import IntroSheet from './IntroSheet.jsx'
import LevelMap from './LevelMap.jsx'
import LevelRail from './LevelRail.jsx'

// Every game sits at game/<id>/index.html, under the games hub (game/index.html): on the published site, and on the
// dev server too (trace-viewer/vite.config.js).
const SITE = { games: '../index.html' }

/**
 * The game shell shared by every game: the top bar, the level map, the level rail, a level's 引入, the first-run
 * dialog, the passed and failed dialogs, the components box and encyclopedia, settings and saved progress. A game (see
 * defineGame) brings only its content: chapters, levels, intro figures and, for each kind of level, the screen
 * that plays it. A level screen gets
 *
 *   { game, level, saved, save(data, { quiet }), solved, solve(score?), fail(info), flags, progress, theme, phone }
 *
 * and lays itself out with Workbench / PhonePage and Brief from Layout.jsx.
 */
export default function GameShell({ game }) {
  const [progress, setProgress] = useState(() => game.store.load())
  const [levelId, setLevelId] = useState(() => new URLSearchParams(window.location.search).get('level'))
  // A level's 引入 opens by itself the first time the level is entered (after the game's first-run dialog), and
  // again whenever the player asks for it from the bar.
  const [introFor, setIntroFor] = useState(null)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme)
  // The reading language, shared with every other page (games/kit/lang.js). Changing it re-renders the whole game in
  // place: boards and progress live in state and storage that do not depend on it, so nothing is lost.
  const [lang, setLang] = useState(currentLang)
  useEffect(() => {
    const onLang = (event) => setLang(event.detail === 'en' ? 'en' : 'zh')
    window.addEventListener('langchange', onLang)
    return () => window.removeEventListener('langchange', onLang)
  }, [])
  const phone = useMedia(PHONE)
  const solved = useMemo(() => new Set(progress.solved), [progress.solved])
  const [won, setWon] = useState(null) // the level just passed
  const [failure, setFailure] = useState(null) // { info, fails } of the last run that missed
  const [fails, setFails] = useState(0) // misses on the current level this visit
  const [sheet, setSheet] = useState(null) // 'parts' | 'wiki'

  // The level list beside a level: docked on wide screens (remembered), a drawer on narrow ones.
  const narrow = useMedia('(max-width: 1180px)')
  const railPref = useMemo(() => preference(`${game.id}.rail`, () => window.innerWidth >= 1360), [game.id])
  const [rail, setRail] = useState(() => railPref.read())
  const [drawer, setDrawer] = useState(false)
  const showRail = narrow ? drawer : rail
  const toggleRail = () => {
    if (narrow) setDrawer((v) => !v)
    else {
      setRail(!rail)
      railPref.write(!rail)
    }
  }

  useEffect(() => game.store.save(progress), [game, progress])
  useEffect(() => applyTheme(theme), [theme])
  // The kit's language and theme menus (menu.js), the same as on every other page; a theme picked there comes back
  // here so the level screens redraw in it.
  const actions = useRef(null)
  useEffect(() => {
    const menus = mountBarMenus(actions.current, { onTheme: setTheme })
    return () => menus.destroy()
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
    document.title = tr(`${game.title.zh} — ${game.title.en}`, `${game.title.en} — ${game.title.zh}`)
  }, [game, lang])
  // Escape closes the rail when it is a drawer; dialogs and sheets close themselves (Dialogs.jsx useEscape).
  useEffect(() => {
    if (!(narrow && drawer)) return undefined
    const onKey = (event) => event.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [narrow, drawer])

  const [left, setLeft] = useState(null) // the level last left for the map, which the map opens at
  const open = (id) => {
    if (!id) setLeft(levelId)
    setLevelId(id)
    setWon(null)
    setFailure(null)
    setFails(0)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('level', id)
    else url.searchParams.delete('level')
    window.history.replaceState({}, '', url)
    if (id || !levelId) window.scrollTo({ top: 0 })
  }

  const level = levelId ? game.byId[levelId] : null
  const chapter = level ? game.chapters.find((c) => c.id === level.chapter) : null
  const wiki = useWiki(game, progress, solved, level)
  const box = useParts(game, progress)

  // What a level screen can do to the shell.
  const save = (data) => setProgress((p) => ({ ...p, data: { ...p.data, [level.id]: data } }))
  const solve = (score) => {
    setProgress((p) => {
      const best = p.best[level.id]
      return {
        ...p,
        solved: [...new Set([...p.solved, level.id])],
        flags: [...new Set([...p.flags, ...(level.unlocks ?? [])])],
        best: score && game.better(score, best) ? { ...p.best, [level.id]: score } : p.best,
      }
    })
    setWon(level.id)
    setFailure(null)
  }
  const fail = (info) => {
    const count = fails + 1
    setFails(count)
    setFailure({ info, fails: count })
  }
  // A level may withhold a flag the player already has, when its puzzle is to build that very thing by hand.
  const flags = useMemo(() => {
    if (!level) return new Set()
    const set = new Set([...progress.flags, ...(level.grants ?? []), ...(progress.all ? game.unlocksBefore(level) : [])])
    for (const flag of level.withhold ?? []) set.delete(flag)
    return set
  }, [game, progress.flags, progress.all, level])
  const intro = level && game.intro(level)?.length > 0
  const kind = level && game.kinds[level.kind]

  return (
    <div className={`game ${level ? 'is-playing' : 'is-mapping'}`} data-game={game.id}>
      {/* The kit's top bar (games/kit/ui.css), the same on every page of the notes and games. */}
      <header className="kit-bar game-bar">
        {level ? (
          <>
            <button className="kit-btn is-label bar-button" onClick={() => open(null)} aria-label={tr('回到关卡地图', 'Back to the level map')}><ArrowLeft size={16} /><span>{tr('地图', 'Map')}</span></button>
            <button className={`kit-btn is-label bar-button rail-toggle ${showRail ? 'is-on' : ''}`} onClick={toggleRail} aria-pressed={showRail} aria-label={tr('关卡列表', 'Level list')}><PanelLeft size={16} /><span>{tr('关卡', 'Levels')}</span></button>
          </>
        ) : (
          <a className="kit-btn is-label bar-button" href={SITE.games} aria-label={tr('回到游戏列表', 'Back to the games')}><ArrowLeft size={16} /><span>{tr('游戏', 'Games')}</span></a>
        )}
        <span className="kit-brand game-brand"><i className="kit-chip" aria-hidden="true" /><span>{L(game.title)}</span></span>
        {level && (
          <span className="game-level-title">
            <b>{game.levelLabel(level)}</b>
            <span>{L(level.title)}</span>
            {chapter && <small>{L(chapter.title)}</small>}
          </span>
        )}
        {intro && <button className="kit-btn is-label bar-button intro-button" onClick={() => setIntroFor(level.id)} aria-label={tr('引入', 'Intro')}><BookOpen size={16} /><span>{tr('引入', 'Intro')}</span></button>}
        {level && game.glossary && (
          <button className="kit-btn is-label bar-button notes-button wiki-button" onClick={() => setSheet('wiki')} aria-label={tr(`百科${wiki.unread.length ? `（${wiki.unread.length} 条未读）` : ''}`, `Encyclopedia${wiki.unread.length ? ` (${wiki.unread.length} unread)` : ''}`)}>
            <BookMarked size={16} /><span>{tr('百科', 'Encyclopedia')}</span>{wiki.unread.length > 0 && <i className="wiki-dot" />}
          </button>
        )}
        {/* Filled by menu.js: React leaves it empty. */}
        <div className="kit-actions" ref={actions} />
      </header>

      {!level && (
        <LevelMap
          game={game}
          progress={progress}
          solved={solved}
          onAll={(all) => setProgress((p) => ({ ...p, all }))}
          onOpen={open}
          focus={left}
          onReset={() => setProgress(game.store.blank())}
          onParts={game.parts && (() => setSheet('parts'))}
          partsNew={box.unread.length}
          onWiki={game.glossary && (() => setSheet('wiki'))}
          unread={wiki.unread.length}
          theme={theme}
        />
      )}
      {level && (
        <div className={`level-shell ${showRail && !narrow ? 'has-rail' : ''}`}>
          {showRail && narrow && <div className="rail-scrim" onClick={() => setDrawer(false)} />}
          {showRail && (
            <LevelRail
              game={game}
              current={level.id}
              solved={solved}
              all={progress.all}
              overlay={narrow}
              onClose={toggleRail}
              onOpen={(id) => {
                open(id)
                setDrawer(false)
              }}
            />
          )}
          {kind
            ? createElement(kind.Screen, { key: level.id, game, level, saved: progress.data[level.id], save, solved: solved.has(level.id), solve, fail, flags, progress, theme, phone })
            : <div className="board-loading">{tr('这种关卡还没做好。', 'This kind of level is not built yet.')}</div>}
        </div>
      )}
      {intro && (introFor === level.id || ((progress.seenPower || !game.power) && !progress.introSeen?.[level.id])) && (
        <IntroSheet
          key={level.id}
          game={game}
          level={level}
          theme={theme}
          onClose={() => {
            setIntroFor(null)
            setProgress((p) => ({ ...p, introSeen: { ...p.introSeen, [level.id]: true } }))
          }}
        />
      )}
      {won && level && won === level.id && (
        <SolvedDialog game={game} level={level} onStay={() => setWon(null)} onExit={() => open(null)} />
      )}
      {failure && level && <FailDialog fail={failure.info} fails={failure.fails} onClose={() => setFailure(null)} />}
      {sheet === 'parts' && <PartsBook game={game} box={box} phone={phone} onClose={() => setSheet(null)} />}
      {sheet === 'wiki' && <Encyclopedia game={game} wiki={wiki} level={level} phone={phone} onClose={() => setSheet(null)} />}
      {game.power && !progress.seenPower && (
        <Dialog title={L(game.power.title)} lines={game.power.lines.map(L)} actions={[[tr('开始', 'Start'), () => setProgress((p) => ({ ...p, seenPower: true }))]]} intro />
      )}
    </div>
  )
}

// Switches the reading language for this game and every other page. It shows the language it switches to.
