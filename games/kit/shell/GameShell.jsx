import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookMarked, BookOpen, PanelLeft, Settings } from 'lucide-react'
import { applyTheme } from '../theme.js'
import { currentLang } from '../lang.js'
import { L, tr } from './i18n.js'
import { PHONE, useMedia } from './useMedia.js'
import { Dialog, FailDialog, SolvedDialog, TaskDoneDialog } from './Dialogs.jsx'
import Encyclopedia, { useWiki } from './Encyclopedia.jsx'
import PartsBook, { levelOf, useParts } from './PartsBook.jsx'
import IntroSheet from './IntroSheet.jsx'
import LevelMap from './LevelMap.jsx'
import LevelDrawer from './LevelDrawer.jsx'
import { setRefs } from './refs.js'
import { firstTask as openTask, flagsIn, passed, saved as savedAt, taskKey, taskOpen, taskPassed } from './progress.js'
import { addSlot, dropSlot, openSlot, renameSlot, runKey, slotsOf } from './slots.js'
import { SlotsContext } from '../circuit/SaveSlots.jsx'
import { playFrame } from './viewport.js'
import { EditContext, same } from './edit.js'
import { SettingsContext } from './useSetting.js'
import SettingsPanel from './SettingsPanel.jsx'
import { settings } from './settings.js'

// Each game links back to its parent hub, on the standalone site and the local dev server.
const SITE = { games: '../index.html' }

/**
 * The game shell shared by every game: the top bar, the level map, the level drawer, a level's introduction, the first-run
 * dialog, the passed and failed dialogs, the components box and encyclopedia, settings and saved progress. A game (see
 * defineGame) brings only its content: chapters, levels, intro figures and, for each kind of level, the screen
 * that plays it. A level screen gets
 *
 *   { game, level, saved, save(data, { quiet }), solved, solve(score?), fail(info), lastRun, keepRun(mark), flags,
 *     progress, theme, phone }
 *
 * `lastRun` is how the screen marked its board's last run (per task and slot, while the level stays open), or
 * undefined: the screen replays that run on the board when it opens, so a run outlives another task or slot, but not
 * leaving the level.
 * `keepRun(mark)` keeps a new mark (null: none, as once the board changes).
 *
 * The screen lays itself out with Workbench / PhonePage and Brief from Layout.jsx.
 *
 * A level is one or more tasks done in order (`tasks: [{ key, kind, step, … }]`, each what that task changes of the
 * level: its screen's kind, its name `step`, its brief, its `after`…). Each task is played as a level of its own kind: a task opens once the one before it is passed, passing it says what it taught and
 * goes on, and passing the last passes the level. Which tasks are passed and what each task's screen keeps (its board,
 * its other boards) go by the task's key, its id, so a task moved keeps them (progress.js). A task marked `carries` goes on with what
 * the task before it made: it opens on that task's board. A task holds the flags the tasks before it open (`opens`),
 * before the level unlocks them. A task may bring introduction pages of its own (`intro`): they open the first time the task is
 * played (the first task's after the level's), so its brief need only say what it asks.
 *
 * A task may keep several boards (slots.js): the board's editor switches between them (SaveSlots, through
 * SlotsContext), and the screen starts over on the one chosen, as it does when the level is entered.
 *
 * `store` is where the player's progress is kept (progress.js createProgress, made by the page for the content it
 * read). `author` is the studio playing the game it edits (../studio/play.jsx): { level, take: { label, use(text) } } puts a
 * button beside the board switcher of that level that hands the board on screen to the studio as blueprint text;
 * `go` { task, n } goes to that task of the level played (again whenever n changes, or once the level has it); `edit` { picked, pick(mark), add(mark), onTask(level, task) } makes the page the
 * studio's editor (edit.js): the fields on screen are marked and picked by a click, introductions open only when asked
 * (a level without one offers to add one), and the studio hears which task is played.
 */
export default function GameShell({ game, store, author = null }) {
  const viewportRoot = useRef(null)
  const [progress, setProgress] = useState(() => store.load())
  const [levelId, setLevelId] = useState(() => new URLSearchParams(window.location.search).get('level'))
  // The tasks of a level passed so far (all of them once it is solved), and the one played: the first not yet passed.
  const firstTask = (id) => openTask(game, progress, id)
  const [taskAt, setTaskAt] = useState(() => (levelId && game.byId[levelId] ? firstTask(levelId) : 0))
  const [taskWon, setTaskWon] = useState(null) // the task just passed, on a level with several
  // A level's introduction opens by itself the first time the level is entered (after the game's first-run dialog), a task's
  // the first time the task is played, and either again whenever the player asks for it from the bar.
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
  // Safari's software keyboard resizes the visual viewport without resizing the layout viewport.
  useEffect(() => {
    const viewport = window.visualViewport
    const root = viewportRoot.current
    if (!phone || !levelId || !viewport) return undefined
    document.documentElement.classList.add('is-game-playing')
    window.scrollTo(0, 0)
    const update = () => {
      const editing = document.activeElement?.matches('input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')
      const frame = playFrame(viewport, Math.max(window.innerHeight, document.documentElement.clientHeight), editing)
      root.style.setProperty('--play-height', `${frame.height}px`)
      root.style.setProperty('--play-top', `${frame.top}px`)
    }
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
      document.documentElement.classList.remove('is-game-playing')
      root.style.removeProperty('--play-height')
      root.style.removeProperty('--play-top')
    }
  }, [phone, levelId])
  const solved = useMemo(() => new Set(progress.solved), [progress.solved])
  const [won, setWon] = useState(null) // the level just passed
  const [failure, setFailure] = useState(null) // { info, fails } of the last run that missed
  const [fails, setFails] = useState(0) // misses on the current level this visit
  const [sheet, setSheet] = useState(null) // 'parts' | 'wiki'

  // The level drawer, pulled out from the left over a level.
  const [drawer, setDrawer] = useState(false)

  useEffect(() => store.save(progress), [store, progress])
  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
    document.title = tr(`${game.title.zh} — ${game.title.en}`, `${game.title.en} — ${game.title.zh}`)
  }, [game, lang])
  // Escape closes the level drawer; dialogs and sheets close themselves (Dialogs.jsx useEscape).
  useEffect(() => {
    if (!drawer) return undefined
    const onKey = (event) => event.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  const [left, setLeft] = useState(null) // the level last left for the map, which the map opens at
  // How each board of the level played last ran ('<task>#<slot no>' → its screen's mark): kept while the level is
  // open, from task to task and slot to slot, and gone once it is left.
  const [runs, setRuns] = useState({})
  const open = (id) => {
    if (!id) setLeft(levelId)
    setRuns({})
    setLevelId(id)
    setTaskAt(id && game.byId[id] ? firstTask(id) : 0)
    setTaskWon(null)
    setWon(null)
    setFailure(null)
    setFails(0)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('level', id)
    else url.searchParams.delete('level')
    window.history.replaceState({}, '', url)
    if (id || !levelId) window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const level = levelId ? game.byId[levelId] : null
  const chapter = level ? game.chapters.find((c) => c.id === level.chapter) : null
  const wiki = useWiki(game, progress, solved, level)
  const box = useParts(game, progress)

  // The task played, as a level of its own: the level with what the task changes, and its steps for the brief.
  const tasks = level?.tasks ?? []
  const isPassed = (k) => taskPassed(game, progress, level.id, k)
  const goTask = (k) => {
    setTaskAt(k)
    setTaskWon(null)
    setFailure(null)
    setFails(0)
  }
  const played = level && { ...level, ...tasks[taskAt], steps: { names: tasks.map((t) => t.step), at: taskAt, passed: tasks.map((_, k) => isPassed(k)), open: tasks.map((_, k) => taskOpen(game, progress, level.id, k)), go: goTask } }
  // A task that goes on from the one before (`carries`) opens on that task's board until it has one of its own.
  const key = level ? taskKey(level, taskAt) : null
  const kept = () => progress.data[key] ?? (tasks[taskAt].carries && taskAt > 0 ? progress.data[taskKey(level, taskAt - 1)] : undefined)

  // What a level screen can do to the shell.
  const save = (data) => setProgress((p) => savedAt(p, level, taskAt, data))
  // Keep each passed board; out-of-order play can finish a level on any task.
  const solve = (score) => {
    setProgress((p) => passed(game, p, level, taskAt, score))
    setFailure(null)
    const next = tasks.findIndex((_, k) => k !== taskAt && !isPassed(k))
    if (next >= 0) setTaskWon({ index: taskAt, next })
    else setWon(level.id)
  }
  const fail = (info) => {
    const count = fails + 1
    setFails(count)
    setFailure({ info, fails: count })
  }
  // A level (or the task played) may withhold a flag the player already has, when its puzzle is to build that very
  // thing by hand. A task holds what the tasks before it in the level opened (`opens`).
  const flags = useMemo(() => (level ? flagsIn(game, progress, level, taskAt) : new Set()), [game, progress, level, taskAt])
  // A reference in any text (refs.js): a level shows its number and title and asks before going there; a part or an
  // encyclopedia entry opens the box or the encyclopedia at it, or says where it opens while it is still locked.
  const [goTo, setGoTo] = useState(null)
  const [sheetAt, setSheetAt] = useState(null) // { id } the box or the encyclopedia opens at
  const [locked, setLocked] = useState(null) // { title, at } a part or entry the player cannot open yet
  const partOf = (key) => game.parts?.all.find((p) => p.key === key)
  const entryOf = (id) => game.glossary?.entries.find((e) => e.id === id)
  const refName = (kind, id) => {
    if (kind === 'level') return game.byId[id] ? { label: game.levelLabel(game.byId[id]), title: L(game.byId[id].title) } : null
    const it = kind === 'part' ? partOf(id) : entryOf(id)
    return it ? { title: L(kind === 'part' ? it.name : it.title) } : null
  }
  const refOpen = (kind, id) => {
    if (kind === 'level') return game.byId[id] && setGoTo(id)
    const it = kind === 'part' ? partOf(id) : entryOf(id)
    if (!it) return
    const open = kind === 'part' ? box.earned.has(id) : wiki.isOpen(it)
    if (!open) {
      const at = kind === 'part' ? levelOf(game, it) : game.byId[it.at]
      return setLocked({ title: L(kind === 'part' ? it.name : it.title), at })
    }
    setSheetAt({ id })
    setSheet(kind === 'part' ? 'parts' : 'wiki')
  }
  useEffect(() => setRefs({ name: refName, open: refOpen }))
  const target = goTo && game.byId[goTo]
  const go = () => {
    setGoTo(null)
    setSheet(null)
    setIntroFor(null)
    setDrawer(false)
    open(target.id)
  }

  // The task's saved boards. Choosing another starts the screen over on it, with nothing left of the last run.
  const slots = level ? slotsOf(progress, key) : null
  const slotted = (f) => (...args) => {
    setProgress((p) => f(p, key, ...args))
    setWon(null)
    setFailure(null)
    setFails(0)
  }
  // The last run of the board played (see above).
  const runAt = slots && runKey(key, slots.list[slots.at].no)
  const lastRun = level ? runs[runAt] : undefined
  const keepRun = (mark) => setRuns((kept) => {
    if (JSON.stringify(kept[runAt] ?? null) === JSON.stringify(mark ?? null)) return kept
    const next = { ...kept }
    if (mark == null) delete next[runAt]
    else next[runAt] = mark
    return next
  })
  const slotsCtl = slots && {
    ...slots,
    game: game.id,
    level: level.id,
    open: slotted(openSlot),
    add: slotted(addSlot),
    rename: (k, name) => setProgress((p) => renameSlot(p, key, k, name)),
    take: author?.level === level.id ? author.take : null,
    // A slot dropped takes its runs with it: a slot added later may take its number.
    drop: (k) => {
      const no = slots.list[k].no
      setRuns((kept) => Object.fromEntries(Object.entries(kept).filter(([key]) => !key.endsWith(`#${no}`))))
      slotted(dropSlot)(k)
    },
  }

  // The introduction of what is played: the level's and its first task's, or a later task's own; seen once per task.
  const own = !level ? [] : taskAt === 0 ? game.intro(level) ?? [] : []
  const pages = !level ? [] : [...own, ...(tasks[taskAt].intro ?? [])]
  // Each page's field, for the studio: the level's pages, then the task's own.
  const pageMarks = pages.map((_, k) => (k < own.length ? { at: `intro[${k}]`, scope: 'level' } : { at: `intro[${k - own.length}]`, scope: 'task' }))
  const introKey = level && (taskAt === 0 ? level.id : key)
  const intro = pages.length > 0
  const kind = level && game.kinds[played.kind]

  // The studio's editor: what is picked, and every pick or + said with the level and the task played.
  const authoring = author?.edit ?? null
  const edit = useMemo(() => (authoring && level ? {
    level: level.id,
    task: taskAt,
    picked: authoring.picked?.level === level.id ? authoring.picked : null,
    pick: (mark) => authoring.pick({ ...mark, level: level.id, task: taskAt }),
    add: (mark) => authoring.add({ ...mark, level: level.id, task: taskAt }),
  } : null), [authoring, level, taskAt])
  useEffect(() => {
    if (authoring && level) authoring.onTask?.(level.id, taskAt)
  }, [authoring, level?.id, taskAt]) // eslint-disable-line react-hooks/exhaustive-deps
  // The studio's `go`: taken once, as soon as the level has the task.
  const wanted = author?.go
  const [gone, setGone] = useState(null)
  if (wanted && wanted.task < tasks.length && wanted.n !== gone) {
    setGone(wanted.n)
    if (wanted.task !== taskAt) goTask(wanted.task)
  }
  const [settingsAnchor, setSettingsAnchor] = useState(null)
  useEffect(() => { window.addEventListener('storage', settings.notify); return () => window.removeEventListener('storage', settings.notify) }, [])
  const titleMark = edit ? { 'data-edit': 'title', ...(same(edit, 'title', 'level') && { 'data-picked': '' }), onClickCapture: (e) => { e.stopPropagation(); edit.pick({ at: 'title', scope: 'level' }) } } : {}

  return (
    <SettingsContext.Provider value={game}>
      <div ref={viewportRoot} className={`game ${level ? 'is-playing' : 'is-mapping'}`} data-game={game.id}>
        {/* The kit's top bar (games/kit/ui.css), the same on every page of the notes and games. */}
        <header className="kit-bar game-bar">
          {level ? (
            <>
              <button className="kit-btn is-label bar-button" onClick={() => open(null)} aria-label={tr('返回关卡地图', 'Back to the level map')}><ArrowLeft size={16} /><span>{tr('地图', 'Map')}</span></button>
              <button className={`kit-btn is-label bar-button drawer-toggle ${drawer ? 'is-on' : ''}`} onClick={() => setDrawer(!drawer)} aria-pressed={drawer} aria-label={tr('关卡', 'Levels')}><PanelLeft size={16} /><span>{tr('关卡', 'Levels')}</span></button>
            </>
          ) : (
            <a className="kit-btn is-label bar-button" href={SITE.games} aria-label={tr('返回游戏列表', 'Back to the games')}><ArrowLeft size={16} /><span>{tr('游戏', 'Games')}</span></a>
          )}
          <span className="kit-brand game-brand"><i className="kit-chip" aria-hidden="true" /><span>{L(game.title)}</span></span>
          {level && (
            <span className="game-level-title">
              <b>{game.levelLabel(level)}</b>
              <span {...titleMark}>{L(level.title)}</span>
              {chapter && <small>{L(chapter.title)}</small>}
            </span>
          )}
          {intro && <button className="kit-btn is-label bar-button intro-button" onClick={() => setIntroFor(introKey)} aria-label={tr('引言', 'Intro')}><BookOpen size={16} /><span>{tr('引言', 'Intro')}</span></button>}
          {edit && !intro && <button className="kit-btn is-label bar-button intro-button" onClick={() => edit.add({ at: 'intro', scope: taskAt === 0 ? 'level' : 'task' })}><BookOpen size={16} /><span>{tr('+ 引言', '+ Intro')}</span></button>}
          {level && game.glossary && (
            <button className="kit-btn is-label bar-button notes-button wiki-button" onClick={() => setSheet('wiki')} aria-label={tr(`百科${wiki.unread.length ? `（${wiki.unread.length} 条未读）` : ''}`, `Encyclopedia${wiki.unread.length ? ` (${wiki.unread.length} unread)` : ''}`)}>
              <BookMarked size={16} /><span>{tr('百科', 'Encyclopedia')}</span>{wiki.unread.length > 0 && <i className="wiki-dot" />}
            </button>
          )}
          <button type="button" className="kit-btn" aria-label={tr('设置', 'Settings')} aria-expanded={Boolean(settingsAnchor)} onClick={(e) => setSettingsAnchor(settingsAnchor ? null : e.currentTarget)}><Settings size={16} /></button>
        </header>

        {!level && (
          <LevelMap
            game={game}
            progress={progress}
            solved={solved}
            onAll={() => setProgress((p) => ({ ...p, all: true }))}
            onOpen={open}
            focus={left}
            onReset={() => setProgress((p) => ({ ...store.blank(), all: p.all }))}
            onParts={game.parts && (() => setSheet('parts'))}
            partsNew={box.unread.length}
            onWiki={game.glossary && (() => setSheet('wiki'))}
            unread={wiki.unread.length}
            theme={theme}
          />
        )}
        {level && (
          <div className="level-shell">
            {drawer && <div className="drawer-scrim" onClick={() => setDrawer(false)} />}
            {drawer && (
              <LevelDrawer
                game={game}
                current={level.id}
                solved={solved}
                all={progress.all}
                onClose={() => setDrawer(false)}
                onOpen={(id) => {
                  open(id)
                  setDrawer(false)
                }}
              />
            )}
            <EditContext.Provider value={edit}>
              {kind
                ? <SlotsContext.Provider value={slotsCtl}>{createElement(kind.Screen, { key: `${level.id}#${runAt}#${game.stamp ?? ''}`, game, level: played, saved: kept(), save, solved: solved.has(level.id) || isPassed(taskAt), solve, fail, lastRun, keepRun, flags, progress, theme, phone })}</SlotsContext.Provider>
                : <div className="board-loading">{tr('这类关卡尚在制作中。', 'This kind of level is still being made.')}</div>}
            </EditContext.Provider>
          </div>
        )}
        {intro && (introFor === introKey || (!edit && (progress.seenPower || !game.power) && !progress.introSeen?.[introKey])) && (
          <EditContext.Provider value={edit}>
          <IntroSheet
            key={introKey}
            game={game}
            level={level}
            pages={pages}
            marks={pageMarks}
            step={taskAt > 0 ? tasks[taskAt].step : null}
            theme={theme}
            onClose={() => {
              setIntroFor(null)
              setProgress((p) => ({ ...p, introSeen: { ...p.introSeen, [introKey]: true } }))
            }}
          />
          </EditContext.Provider>
        )}
        {taskWon !== null && (
          <TaskDoneDialog game={game} level={level} task={tasks[taskWon.index]} index={taskWon.index} next={tasks[taskWon.next]} onStay={() => setTaskWon(null)} onNext={() => goTask(taskWon.next)} />
        )}
        {won && level && won === level.id && (
          <SolvedDialog game={game} level={level} onStay={() => setWon(null)} onExit={() => open(null)} />
        )}
        {failure && level && <FailDialog fail={failure.info} fails={failure.fails} onClose={() => setFailure(null)} />}
        {settingsAnchor && <SettingsPanel game={game} theme={theme} onTheme={setTheme} anchor={settingsAnchor} onClose={() => setSettingsAnchor(null)} />}
        {sheet === 'parts' && <PartsBook game={game} box={box} phone={phone} start={sheetAt} onClose={() => { setSheet(null); setSheetAt(null) }} />}
        {sheet === 'wiki' && <Encyclopedia game={game} wiki={wiki} level={level} phone={phone} start={sheetAt} onClose={() => { setSheet(null); setSheetAt(null) }} />}
        {locked && <Dialog top title={tr(`「${locked.title}」尚未解锁`, `“${locked.title}” is still locked`)} lines={[locked.at && locked.at.id === level?.id ? tr('通过这一关后解锁。', 'Unlocked by passing this level.') : locked.at ? tr(`进行到 ${game.levelLabel(locked.at)}「${L(locked.at.title)}」时解锁。`, `Unlocks at ${game.levelLabel(locked.at)} “${L(locked.at.title)}”.`) : tr('继续推进后解锁。', 'Unlocks later in the game.')]} actions={[[tr('确定', 'OK'), () => setLocked(null)]]} onClose={() => setLocked(null)} />}
        {target && (game.isOpen(target, solved, progress.all)
          ? <Dialog top title={tr(`前往 ${game.levelLabel(target)}「${L(target.title)}」？`, `Go to ${game.levelLabel(target)} “${L(target.title)}”?`)} lines={[target.id === level?.id ? tr('你正在这一关。', 'You are on this level.') : tr('这一关的电路和进度都会保存，可以随时返回。', 'This level’s board and progress are kept; you can return at any time.')]} actions={target.id === level?.id ? [[tr('确定', 'OK'), () => setGoTo(null)]] : [[tr('取消', 'Cancel'), () => setGoTo(null)], [tr('前往', 'Go'), go]]} onClose={() => setGoTo(null)} />
          : <Dialog top title={tr(`${game.levelLabel(target)}「${L(target.title)}」尚未解锁`, `${game.levelLabel(target)} “${L(target.title)}” is still locked`)} lines={[tr('请先通过它的前置关卡。', 'Pass the levels that lead to it first.')]} actions={[[tr('确定', 'OK'), () => setGoTo(null)]]} onClose={() => setGoTo(null)} />)}
        {game.power && !progress.seenPower && (
          <Dialog title={L(game.power.title)} lines={game.power.lines.map(L)} actions={[[tr('开始', 'Start'), () => setProgress((p) => ({ ...p, seenPower: true }))]]} intro />
        )}
      </div>
    </SettingsContext.Provider>
  )
}

// Switches the reading language for this game and every other page. It shows the language it switches to.
