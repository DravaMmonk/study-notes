import { playId } from '../engine/plays.js'
import { workshopTrayNames } from '../engine/trays.js'
import { createElement, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, BookMarked, BookOpen, PanelLeft } from 'lucide-react'
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
import { earnedUnlocks, firstTask as openTask, nextRequiredTask, taskOpen } from './progress.js'
import { playedTask, taskContext } from './played-task.js'
import { addSlot, dropSlot, openSlot, renameSlot, slotsOf } from './slots.js'
import { SlotsContext } from '../circuit/SaveSlots.jsx'
import { isTextField, playFrame } from './viewport.js'
import { SheetHost } from './Sheet.jsx'
import { EditContext, same } from './edit.js'
import { SettingsContext } from './useSetting.js'
import { useLevelRuns } from './useLevelRuns.js'
import TopBar from './TopBar.jsx'
import { settings } from './settings.js'

// Each game links back to its parent hub, on the standalone site and the local dev server.
const SITE = { games: '../index.html' }

/**
 * The game shell shared by every game: the top bar, the level map, the level drawer, a level's introduction, the first-run
 * dialog, the passed and failed dialogs, the components box and encyclopedia, settings and saved progress. A game (see
 * defineGame) brings only its content: chapters, levels, intro figures and, for each kind of level, the screen
 * that plays it. A level screen gets
 *
 *   { game, level, saved, save(data, { quiet }), solved, solve(score?, work?), fail(info), lastRun, keepRun(mark), flags,
 *     progress, theme, phone }
 *
 * `lastRun` is how the screen marked its board's last run (per task and slot, while the level stays open), or
 * undefined: the screen replays that run on the board when it opens, so a run outlives another task or slot, but not
 * leaving the level.
 * Screens bind those marks to their judged work through useRunHistory before saving or restoring them.
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
 * `go` { task, n } goes to that task of the level played (again whenever n changes, or once the level has it); `edit` { picked, pick(mark), add(mark), start(mark), onTask(level, task) } makes the page
 * the studio's editor (edit.js): the fields on screen are marked and picked by a click, introductions open only when
 * asked (a level without one offers to add one), a port's view switched is the view it starts in, and the studio hears
 * which task is played.
 */
export default function GameShell({ game, store, author = null }) {
  const [viewportRoot, setViewportRoot] = useState(null)
  const progress = useSyncExternalStore(store.subscribe, store.load)
  const update = store.update
  const [, refreshExternalPasses] = useState(0)
  const [levelId, setLevelId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('level')
    const level = game.byId[id]
    return level && (author || game.isOpen(level, new Set(progress.solved), progress.all)) ? id : null
  })
  // A tray name, an empty string for the default tray, or null when the workshop is closed.
  const [bench, setBench] = useState(() => {
    const asked = new URLSearchParams(window.location.search)
    return !levelId && !author ? asked.get('workshop') : null
  })
  const benchOpen = bench !== null
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
    const root = viewportRoot
    if (!phone || !(levelId || benchOpen) || !viewport || !root) return undefined
    document.documentElement.classList.add('is-game-playing')
    window.scrollTo(0, 0)
    const update = () => {
      const editing = isTextField(document.activeElement)
      const frame = playFrame(viewport, Math.max(window.innerHeight, document.documentElement.clientHeight), editing)
      root.style.setProperty('--play-height', frame ? `${frame.height}px` : '')
      root.style.setProperty('--play-top', frame ? `${frame.top}px` : '')
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
  }, [phone, levelId, benchOpen, viewportRoot])
  const solved = useMemo(() => new Set(progress.solved), [progress.solved])
  const [won, setWon] = useState(null) // the level just passed
  const [failure, setFailure] = useState(null) // { info, fails } of the last run that missed
  const [fails, setFails] = useState(0) // misses on the current level this visit
  const [sheet, setSheet] = useState(null) // 'parts' | 'wiki'

  // The level drawer, pulled out from the left over a level.
  const [drawer, setDrawer] = useState(false)

  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
    document.title = tr(`${game.title.zh} — ${game.title.en}`, `${game.title.en} — ${game.title.zh}`)
  }, [game, lang])
  const [left, setLeft] = useState(null) // the level last left for the map, which the map opens at
  const open = (id, task) => {
    if (!id) setLeft(levelId)
    if (id !== levelId) clearRuns()
    setLevelId(id)
    setTaskAt(id && game.byId[id] ? task ?? firstTask(id) : 0)
    setTaskWon(null)
    setWon(null)
    setFailure(null)
    setFails(0)
    setBench(null)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('level', id)
    else url.searchParams.delete('level')
    url.searchParams.delete('workshop')
    window.history.replaceState({}, '', url)
    if (id || !levelId) window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const openBench = (tray = '') => {
    setBench(tray)
    const url = new URL(window.location.href)
    url.searchParams.set('workshop', tray)
    window.history.replaceState({}, '', url)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const level = levelId ? game.byId[levelId] : null
  const chapter = level ? game.chapters.find((c) => c.id === level.chapter) : null
  const wiki = useWiki(game, progress, solved, level)
  const box = useParts(game, progress)

  // The task played, as a level of its own: the level with what the task changes, and its steps for the brief.
  const tasks = level?.tasks ?? []
  const goTask = (k) => {
    setTaskAt(k)
    setTaskWon(null)
    setFailure(null)
    setFails(0)
  }
  const context = useMemo(() => level && taskContext(game, progress, level, taskAt), [game, progress, level, taskAt])
  const task = context && playedTask(context, { go: goTask, update })
  const key = task?.key ?? null
  const played = task && { ...task.screen.level, optionalLevel: Boolean(level.optional), skipLevel: () => open(null) }

  // What a level screen can do to the shell.
  // Keep each passed board; out-of-order play can finish a level on any task.
  const solve = (score, work) => {
    const done = task.screen.solve(score, work)
    if (!done) return
    setFailure(null)
    if (done.solved.includes(level.id)) setWon(level.id)
    else setTaskWon({ index: taskAt, next: nextRequiredTask(game, done, level.id, taskAt) })
  }
  const fail = (info) => {
    const count = fails + 1
    setFails(count)
    setFailure({ info, fails: count })
  }
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
  const refOpen = (kind, id, task) => {
    if (kind === 'level') return game.byId[id] && setGoTo({ id, task })
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
  const target = goTo && game.byId[goTo.id]
  const atTarget = target?.id === level?.id && (goTo?.task === undefined || goTo.task === taskAt)
  const go = () => {
    setGoTo(null)
    setSheet(null)
    setIntroFor(null)
    setDrawer(false)
    open(target.id, goTo.task)
  }

  // The task's saved boards. Choosing one reopens the screen on its own board and last run.
  const slots = task?.slots
  const { runAt, run, dropRun, clearRuns } = useLevelRuns(key, task?.slot)
  const changeSlot = (change) => {
    update(change)
    setWon(null)
    setFailure(null)
    setFails(0)
  }
  const atSlot = (no, change, ...args) => (p) => {
    const index = slotsOf(p, key).list.findIndex((slot) => slot.no === no)
    return index < 0 ? p : change(p, key, index, ...args)
  }
  const slotsCtl = slots && {
    ...slots,
    game: game.id,
    level: level.id,
    open: (no) => changeSlot(atSlot(no, openSlot)),
    add: (options) => changeSlot((p) => addSlot(p, key, { ...options, from: task.slot })),
    rename: (no, name) => update(atSlot(no, renameSlot, name)),
    take: author?.level === level.id ? author.take : null,
    drop: (no) => {
      dropRun(no)
      changeSlot(atSlot(no, dropSlot))
    },
  }

  // The introduction of what is played: the level's and its first task's, or a later task's own; seen once per task.
  const own = !level ? [] : taskAt === 0 ? game.intro(level) ?? [] : []
  const pages = !level ? [] : [...own, ...(tasks[taskAt].intro ?? [])]
  // Each page's field, for the studio: the level's pages, then the task's own.
  const pageMarks = pages.map((_, k) => (k < own.length ? { at: `intro[${k}]`, scope: 'level' } : { at: `intro[${k - own.length}]`, scope: 'task' }))
  const introKey = level && (taskAt === 0 ? level.id : key)
  const intro = pages.length > 0
  const kind = level && game.kinds[playId(played)]

  // The studio's editor: what is picked, and every pick or + said with the level and the task played.
  const authoring = author?.edit ?? null
  const edit = useMemo(() => (authoring && level ? {
    level: level.id,
    task: taskAt,
    picked: authoring.picked?.level === level.id ? authoring.picked : null,
    pick: (mark) => authoring.pick({ ...mark, level: level.id, task: taskAt }),
    add: (mark) => authoring.add({ ...mark, level: level.id, task: taskAt }),
    start: (mark) => authoring.start({ ...mark, level: level.id, task: taskAt }),
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
  useEffect(() => {
    const refresh = (event) => {
      settings.notify(event)
      if (event.key?.endsWith('.v2') && event.key !== store.key) refreshExternalPasses((value) => value + 1)
    }
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [store.key])
  const workshopSources = useMemo(() => {
    if (level || author || !game.workshop) return []
    return game.levels.slice().reverse().flatMap((candidate) => {
      if (!game.isOpen(candidate, solved, progress.all)) return []
      return candidate.tasks.map((task, at) => ({ candidate, at, task, kind: game.kinds[playId(task)] }))
        .reverse().filter(({ at, kind }) => kind?.editor === 'circuit' && taskOpen(game, progress, candidate.id, at))
    })
  }, [game, level, author, progress, solved])
  // The workshop uses the latest unlocked circuit task that plays with the requested tray.
  const circuitTrays = useMemo(() => new Set(workshopTrayNames(game.course?.trays, game.partDefs?.parts)), [game])
  const workshopBoards = workshopSources.flatMap((source) => {
    const trays = game.course?.tray(source.task.source)?.filter((name) => circuitTrays.has(name)) ?? ['']
    return trays.length ? [{ ...source, trays }] : []
  })
  const workshop = (bench && workshopBoards.find(({ trays }) => trays.includes(bench))) || workshopBoards[0]
  const benchTask = benchOpen && workshop ? playedTask(taskContext(game, progress, workshop.candidate, workshop.at)) : null
  const benchTray = benchTask && (workshop.trays.includes(bench) ? bench : workshop.trays[0])
  const benchTrays = [...circuitTrays].filter((name) => workshopBoards.some(({ trays }) => trays.includes(name)))
  const titleMark = edit ? { 'data-edit': 'title', ...(same(edit, 'title', 'level') && { 'data-picked': '' }), onClickCapture: (e) => { e.stopPropagation(); edit.pick({ at: 'title', scope: 'level' }) } } : {}

  return (
    <SettingsContext.Provider value={game}><SheetHost.Provider value={level || benchTask ? viewportRoot : null}>
      <div ref={setViewportRoot} className={`game ${level || benchTask ? 'is-playing' : 'is-mapping'}`} data-game={game.id}>
        {/* The kit's top bar (games/kit/ui.css), the same on every page of the notes and games. */}
        <TopBar className="game-bar" game={game} theme={theme} onTheme={setTheme}>
          {level ? (
            <>
              <button className="kit-btn is-label bar-button" onClick={() => open(null)} aria-label={tr('返回关卡地图')}><ArrowLeft size={16} /><span>{tr('地图')}</span></button>
              <button className={`kit-btn is-label bar-button drawer-toggle ${drawer ? 'is-on' : ''}`} onClick={() => setDrawer(!drawer)} aria-pressed={drawer} aria-label={tr('关卡')}><PanelLeft size={16} /><span>{tr('关卡')}</span></button>
            </>
          ) : benchTask ? (
            <button className="kit-btn is-label bar-button" onClick={() => open(null)} aria-label={tr('离开元件工坊', 'Leave the workshop')}><ArrowLeft size={16} /><span>{tr('地图')}</span></button>
          ) : (
            <a className="kit-btn is-label bar-button" href={SITE.games} aria-label={tr('返回游戏列表')}><ArrowLeft size={16} /><span>{tr('游戏', 'Games')}</span></a>
          )}
          <span className="kit-brand game-brand"><i className="kit-chip" aria-hidden="true" /><span>{L(game.title)}</span></span>
          {level && (
            <span className="game-level-title">
              <b>{game.levelLabel(level)}</b>
              <span {...titleMark}>{L(level.title)}</span>
              {chapter && <small>{L(chapter.title)}</small>}
            </span>
          )}
          {benchTask && <span className="game-level-title bench-title"><span>{tr('元件工坊', 'Component workshop')}</span></span>}
          {intro && <button className="kit-btn is-label bar-button intro-button" onClick={() => setIntroFor(introKey)} aria-label={tr('引言')}><BookOpen size={16} /><span>{tr('引言')}</span></button>}
          {edit && !intro && <button className="kit-btn is-label bar-button intro-button" onClick={() => edit.add({ at: 'intro', scope: taskAt === 0 ? 'level' : 'task' })}><BookOpen size={16} /><span>{tr('+ 引言')}</span></button>}
          {level && game.glossary && (
            <button className="kit-btn is-label bar-button notes-button wiki-button" onClick={() => setSheet('wiki')} aria-label={tr(`百科${wiki.unread.length ? `（${wiki.unread.length} 条未读）` : ''}`, `Encyclopedia${wiki.unread.length ? ` (${wiki.unread.length} unread)` : ''}`)}>
              <BookMarked size={16} /><span>{tr('百科')}</span>{wiki.unread.length > 0 && <i className="wiki-dot" />}
            </button>
          )}
        </TopBar>

        {!level && !benchTask && (
          <LevelMap
            game={game}
            progress={progress}
            solved={solved}
            onAll={() => update((p) => ({ ...p, all: true }))}
            onOpen={open}
            focus={left}
            onReset={() => update(store.blank)}
            onParts={game.parts && (() => setSheet('parts'))}
            onWorkshop={workshop && (() => openBench())}
            partsNew={box.unread.length}
            onWiki={game.glossary && (() => setSheet('wiki'))}
            unread={wiki.unread.length}
            theme={theme}
            edit={authoring}
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
                ? <SlotsContext.Provider value={slotsCtl}>{createElement(kind.Screen, { ...task.screen, key: `${level.id}#${runAt}#${game.stamp ?? ''}`, level: played, solve, fail, ...run, theme, phone, workshop: !author && game.workshop })}</SlotsContext.Provider>
                : <div className="board-loading">{tr('这类关卡尚在制作中。')}</div>}
            </EditContext.Provider>
          </div>
        )}
        {benchTask && (
          <div className="level-shell">
            {createElement(workshop.kind.Screen, {
              ...benchTask.screen, key: `${benchTask.key}#${benchTray}`, phone, theme, workshop: game.workshop,
              workshopOnly: true, workshopTray: benchTray, workshopTrays: benchTrays, onWorkshopTray: openBench,
            })}
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
              update((p) => ({ ...p, introSeen: { ...p.introSeen, [introKey]: true } }))
            }}
          />
          </EditContext.Provider>
        )}
        {taskWon !== null && (
          <TaskDoneDialog game={game} level={level} task={tasks[taskWon.index]} index={taskWon.index} next={tasks[taskWon.next]} revisit={taskWon.next >= 0 && taskWon.next < taskWon.index} onStay={() => setTaskWon(null)} onNext={taskWon.next >= 0 ? () => goTask(taskWon.next) : () => open(null)} />
        )}
        {won && level && won === level.id && (
          <SolvedDialog game={game} level={{ ...level, unlocks: earnedUnlocks(level, progress) }} onStay={() => setWon(null)} onExit={() => open(null)} />
        )}
        {failure && level && <FailDialog fail={failure.info} fails={failure.fails} onClose={() => setFailure(null)} />}
        {sheet === 'parts' && <PartsBook game={game} box={box} phone={phone} start={sheetAt} onClose={() => { setSheet(null); setSheetAt(null) }} />}
        {sheet === 'wiki' && <Encyclopedia game={game} wiki={wiki} level={level} phone={phone} start={sheetAt} edit={authoring} onClose={() => { setSheet(null); setSheetAt(null) }} />}
        {locked && <Dialog top title={tr(`「${locked.title}」尚未解锁`, `“${locked.title}” is still locked`)} lines={[locked.at && locked.at.id === level?.id ? tr('通过这一关后解锁。') : locked.at ? tr(`进行到 ${game.levelLabel(locked.at)}「${L(locked.at.title)}」时解锁。`, `Unlocks at ${game.levelLabel(locked.at)} “${L(locked.at.title)}”.`) : tr('继续推进后解锁。')]} actions={[[tr('确定'), () => setLocked(null)]]} onClose={() => setLocked(null)} />}
        {target && (game.isOpen(target, solved, progress.all)
          ? <Dialog top title={tr(`前往 ${game.levelLabel(target)}「${L(target.title)}」？`, `Go to ${game.levelLabel(target)} “${L(target.title)}”?`)} lines={[atTarget ? tr('你正在这里。') : tr('这一关的电路和进度都会保存，可以随时返回。')]} actions={atTarget ? [[tr('确定'), () => setGoTo(null)]] : [[tr('取消'), () => setGoTo(null)], [tr('前往'), go]]} onClose={() => setGoTo(null)} />
          : <Dialog top title={tr(`${game.levelLabel(target)}「${L(target.title)}」尚未解锁`, `${game.levelLabel(target)} “${L(target.title)}” is still locked`)} lines={[tr('请先通过它的前置关卡。')]} actions={[[tr('确定'), () => setGoTo(null)]]} onClose={() => setGoTo(null)} />)}
        {game.power && !progress.seenPower && (
          <Dialog title={L(game.power.title)} lines={game.power.lines.map(L)} actions={[[tr('开始'), () => update((p) => ({ ...p, seenPower: true }))]]} intro />
        )}
      </div>
    </SheetHost.Provider></SettingsContext.Provider>
  )
}

// Switches the reading language for this game and every other page. It shows the language it switches to.
