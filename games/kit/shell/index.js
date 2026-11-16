import { earnedUnlocks, passedLevelIn, taskOpen } from './progress.js'
import { holds } from '../course.js'
import { stageDefinition } from '../engine/piece-stages.js'
import { editorOf } from '../engine/pieces.js'
// The game shell shared by every game in the study notes (React). A game is content on top of it: see defineGame.

export { default as GameShell } from './GameShell.jsx'
export { Brief, Level, PhonePage, PinnedPlay, TaskCard, Text } from './Layout.jsx'
export { Dialog } from './Dialogs.jsx'
export { default as Workbench, TestStatus } from './Workbench.jsx'
export { default as CircuitLevel, useLevelBoard, useLevelRun } from './CircuitLevel.jsx'
export { default as RunDock } from './RunDock.jsx'
export { default as StepLog } from './StepLog.jsx'
export { default as Timeline } from './Timeline.jsx'
export { usePlayback } from './usePlayback.jsx'
export { default as TestTabs } from './TestTabs.jsx'
export { default as Sheet } from './Sheet.jsx'
export { default as Popover } from './Popover.jsx'
export { default as RowTable } from './RowTable.jsx'
export { default as RuleRows } from './RuleRows.jsx'
export { default as Verdict } from './Verdict.jsx'
export { default as NamedLines } from './NamedLines.jsx'
export { ChoiceField, Field, InlineChoice } from './FormFields.jsx'
export { default as Entries, EntriesSize } from './Entries.jsx'
export { L, getLang, isPair, keyOf, tr } from './i18n.js'
export { useLang } from './useLang.js'
export { PHONE, useMedia } from './useMedia.js'

/**
 * Describe a game for GameShell. Required: id, title, kicker, lede ({ zh, en } pairs), chapters
 * ([{ id, title, track, label?, question?, number?, kicker? }], track: the chapter's level tree from kit/course.js
 * layout), levels ([{ id, chapter, title, kind, tasks: [{ key, kind?, step?, brief?, hint?, intro?, after?, carries?,
 * opens? … }], requires?, unlocks?, keeps?, after?, note? … }], in play order, every level one task or more;
 * `keeps`: whether passing a task keeps the board it passed with in progress.built, for a part that runs it, by default
 * when the level unlocks something) and kinds ({ [kind]: { Screen, icon?, label? } }).
 * Optional:
 *
 *   Hero          the map's illustration ({ theme })
 *   power         a first-run dialog { title, lines }
 *   intro(level)  a level's introduction pages [{ t, fig?, show? }]; IntroFigure draws a page's fig ({ fig, level,
 *                 theme }), the kit a value it shows (show: ../engine/views.js SHOW); a level's afterShow is the value
 *                 its pass text shows
 *   parts         the components box (元件箱) { all: [{ key, name, desc?, icon?, family?, at? }] (a built part's key is
 *                 the flag earning it; a primitive has `at`, the levels that bring it in, and is earned once one is open),
 *                 preview?(part, { progress }) → { sample?, experiment?, inside? } for the editor (../circuit/preview.jsx),
 *                 filters?(progress) → [{ key, name, icon?, lock?, keys }] to narrow the box, such as by robot }
 *   unlocked(level)  what passing a level awards [{ piece?, label, icon?, family? }]
 *   extraPieces   introduced pieces used outside the components box, in its same record format
 *   passed(level)    more for the passed dialog, after the level's key idea: { label, lines } or null, such as the
 *                    rules a level declared
 *   core(level)   whether the map draws a level full size (a milestone: ../course.js isCore) or smaller
 *   note(level)   the level's key idea, shown when it is passed (default: level.note ?? level.after)
 *   glossary      the encyclopedia: { groups: [{ id, title }], entries: [{ id, group, title, body, at?, see? }] }
 *   views         the views each shape is drawn in by default (game.json `views`, ../engine/views.js)
 *   levelLabel(level), isOpen(level, solved, all), better(score, best), bestLabel(best)
 *   notes         a notes edition (games/DESIGN.md 12): every level open, each chapter listed in order on the map
 *
 * Piece descriptions and available forms follow the same named stages as the circuit cards.
 */
export function defineGame(def) {
  const plan = def.course?.plan
  const levels = plan ? def.levels.map((level) => {
    const place = plan.place.get(level.id)
    return { ...level, optional: place?.optional ?? false, skippable: place?.skippable ?? false }
  }) : def.levels
  const byId = Object.fromEntries(levels.map((level) => [level.id, level]))
  const index = new Map(levels.map((level, i) => [level.id, i]))
  // Without `requires`, a level opens once the one before it is passed.
  const requiresOf = (level) => level.requires ?? (index.get(level.id) > 0 ? [levels[index.get(level.id) - 1].id] : [])
  const required = (level) => plan?.required.get(level.id) ?? requiresOf(level)
  const external = (id) => plan?.external?.get(id) ?? []
  const pendingExternal = (id) => external(id).filter(({ game, level }) => !passedLevelIn(game, level))
  const isOpen = def.isOpen ?? ((level, solved, all = false) => all || (
    required(level).every((id) => solved.has(id)) && pendingExternal(level.id).length === 0
  ))
  // Every level `level` comes after: what it requires, and what those require in turn.
  const ancestorsOf = (direct) => {
    const before = new Map()
    const ancestors = (level) => {
      if (!before.has(level.id)) before.set(level.id, new Set(direct(level).filter((id) => byId[id]).flatMap((id) => [id, ...ancestors(byId[id])])))
      return before.get(level.id)
    }
    return ancestors
  }
  const ancestors = ancestorsOf(requiresOf)
  const gates = ancestorsOf(required)
  const awardedStages = new WeakMap()
  const stageFlags = progress => {
    if (!def.course) return []
    if (!awardedStages.has(progress)) {
      const passed = new Set(progress.passed)
      const stages = levels.flatMap(level => [
        ...(progress.solved.includes(level.id) ? def.course.awards(level) : []),
        ...(level.tasks ?? []).flatMap((task, index) => passed.has(task.key) ? def.course.awards({ id: level.id, task: index + 1 }) : []),
      ])
      awardedStages.set(progress, [...new Set(stages)])
    }
    return awardedStages.get(progress)
  }
  const game = {
    levelLabel: (level) => level.id,
    intro: () => null,
    unlocked: () => [],
    passed: () => null,
    core: () => true,
    note: (level) => level.note ?? level.after,
    better: (score, best) => !best,
    ...def,
    levels,
    byId,
    isOpen,
    missing: (level, solved) => required(level).filter((id) => !solved.has(id)).map((id) => byId[id]),
    // Every level still to pass before `level` opens: the unsolved ones among all it comes after.
    needed: (level, solved) => [...gates(level)].filter((id) => !solved.has(id)).map((id) => byId[id]),
    externalNeeded: (level, solved) => [...new Map([level.id, ...[...gates(level)].filter((id) => !solved.has(id))]
      .flatMap(pendingExternal).map((gate) => [`${gate.game}:${gate.level}`, gate])).values()],
    // Everything a player has unlocked by the time `level` opens: the unlocks of every level it comes after.
    unlocksBefore: (level) => [...ancestors(level)].flatMap((id) => byId[id].unlocks ?? []),
    // What a player has unlocked: every solved level's unlocks (so a level that has since come to unlock something gives
    // it to whoever solved it already), and the flags the save holds.
    /** Is level `id` the level `at`, or one that comes after it? */
    after: (id, at) => id === at || (byId[id] ? ancestors(byId[id]).has(at) : false),
    flagsOf: (progress) => [...new Set([...progress.flags, ...stageFlags(progress), ...progress.solved.flatMap((id) => byId[id] ? earnedUnlocks(byId[id], progress) : [])])],
  }
  const stageTexts = new WeakMap()
  const stagedText = (text, entry) => {
    if (!entry) return text
    if (stageTexts.get(text)?.has(entry.id)) return stageTexts.get(text).get(entry.id)
    const definition = stageDefinition(entry)
    const result = { ...text, stage: entry.id, name: definition.name ?? text.name, desc: definition.desc ?? text.desc,
      forms: definition.setting.form?.options?.map(option => option.value) ?? text.forms }
    if (!stageTexts.has(text)) stageTexts.set(text, new Map())
    stageTexts.get(text).set(entry.id, result)
    return result
  }
  game.textAt = (text, id, piece = text?.piece) => {
    if (!def.course || !piece) return text
    const has = holds(def.course, { id, task: 0 }, new Set())
    return stagedText(text, def.course.stages.get(has.stage(piece)))
  }
  const progressStages = new WeakMap()
  game.textFor = (text, progress) => {
    const course = def.course, piece = text?.piece
    if (!course || !piece) return text
    if (!progressStages.has(progress)) {
      const selected = new Map()
      const consider = entry => {
        if (entry && entry.index > (selected.get(entry.piece)?.index ?? -1)) selected.set(entry.piece, entry)
      }
      for (const id of course.startStages) consider(course.stages.get(id))
      if (progress.all) for (const entry of course.stages.values()) consider(entry)
      else {
        const solved = new Set(progress.solved)
        const passed = new Set(progress.passed)
        for (const level of levels) {
          if (!isOpen(level, solved)) continue
          for (let task = 0; task < (level.tasks?.length ?? 1); task++) {
            const at = { id: level.id, task }
            if (taskOpen(game, progress, level.id, task)) for (const id of course.opens(at)) {
              if (!course.local(id, at)) consider(course.stages.get(id))
            }
            if (passed.has(level.tasks?.[task]?.key)) for (const id of course.awards({ id: level.id, task: task + 1 })) {
              if (!course.local(id, at)) consider(course.stages.get(id))
            }
          }
          if (solved.has(level.id)) for (const id of course.awards(level)) consider(course.stages.get(id))
        }
      }
      progressStages.set(progress, selected)
    }
    return stagedText(text, progressStages.get(progress).get(piece) ?? course.stages.get(piece))
  }
  // The primitives a level brings in, for the map.
  game.introduced = (level) => (def.parts?.all ?? []).filter((part) => part.at?.includes(level.id))
  game.isCircuitPiece = (type) => Boolean(type && editorOf(game.partDefs?.parts?.[type] ?? {}) === 'circuit')
  // A built part is earned by solving its level; a primitive when its introducing task becomes available.
  // With every level unlocked, the components box is full too (the encyclopedia opens every entry the same way).
  const earned = (progress, parts) => {
    if (progress.all) return parts.map((part) => part.key)
    const solved = new Set(progress.solved)
    const introduced = (part, id) => {
      const level = byId[id]
      if (!level || !isOpen(level, solved)) return false
      if (!part.atTasks) return true
      return level.tasks?.some((task, k) => part.atTasks.includes(task.key) && taskOpen(game, progress, id, k))
    }
    return [...game.flagsOf(progress), ...parts.filter((part) => part.at?.some((id) => introduced(part, id))).map((part) => part.key)]
  }
  const pieces = [...(def.parts?.all ?? []), ...(def.extraPieces ?? [])].filter(({ piece }) => piece)
  game.earnedPieces = (progress) => {
    const keys = new Set(earned(progress, pieces))
    return pieces.filter(({ key }) => keys.has(key))
  }
  if (def.parts) {
    game.parts = { ...def.parts, earned: (progress) => earned(progress, def.parts.all) }
  }
  return game
}
