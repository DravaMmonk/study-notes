import { passedLevelIn } from './progress.js'
// The game shell shared by every game in the study notes (React). A game is content on top of it: see defineGame.

export { default as GameShell } from './GameShell.jsx'
export { Brief, Level, PhonePage, PinnedPlay, TaskCard, Text } from './Layout.jsx'
export { Dialog } from './Dialogs.jsx'
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
  }
  game.textAt = text => text
  game.textFor = text => text
  game.introduced = () => []
  return game
}
