// The game shell shared by every game in the study notes (React). A game is content on top of it: see defineGame.
import { createProgress } from './progress.js'

export { default as GameShell } from './GameShell.jsx'
export { Brief, PhonePage, PinnedPlay, TaskCard, Text, Workbench } from './Layout.jsx'
export { Dialog, useEscape } from './Dialogs.jsx'
export { default as CircuitLayout, TestStatus } from './CircuitLayout.jsx'
export { default as RunDock } from './RunDock.jsx'
export { default as StepLog } from './StepLog.jsx'
export { default as Timeline } from './Timeline.jsx'
export { usePlayback } from './usePlayback.jsx'
export { caseLabel, useBoardCases } from './useBoardCases.js'
export { useKeptVerdict } from './useKeptVerdict.js'
export { default as TestTabs } from './TestTabs.jsx'
export { default as Sheet } from './Sheet.jsx'
export { default as RowTable } from './RowTable.jsx'
export { AddMenu, ChoiceField, Field, InlineChoice, InlineList, InlineSelect, ListField, SelectField } from './FormFields.jsx'
export { default as Entries, EntriesSize } from './Entries.jsx'
export { L, getLang, isPair, keyOf, tr } from './i18n.js'
export { useLang } from './useLang.js'
export { PHONE, useMedia } from './useMedia.js'

/**
 * Describe a game for GameShell. Required: id, title, kicker, lede ({ zh, en } pairs), chapters
 * ([{ id, title, track, label?, question?, number?, kicker? }], track: the chapter's level tree from kit/course.js
 * layout), levels ([{ id, chapter, title, kind, requires?, unlocks?, brief?, hint?, after?, note? … }], in play order)
 * and kinds ({ [kind]: { Screen, icon?, label? } }). Optional:
 *
 *   Hero          the map's illustration ({ theme })
 *   power         a first-run dialog { title, lines }
 *   intro(level)  a level's 引入 pages [{ t, fig? }]; IntroFigure draws a page's fig ({ fig, level, theme })
 *   progress      { version, migrate(saved), legacy() } for saves from older versions or keys
 *   parts         the components box (元件箱) { all: [{ key, name, desc?, icon?, family?, at? }] (a built part's key is
 *                 the flag earning it; a primitive has `at`, the levels that bring it in, and is earned once one is open),
 *                 demo?(part, { phone }) → the part on a bench to try (React; games/kit/circuit DemoBench),
 *                 filters?(progress) → [{ key, name, icon?, lock?, keys }] to narrow the box, such as by robot }
 *   unlocked(level)  what passing a level unlocks [{ label, icon?, family? }] for the passed dialog
 *   passed(level)    more for the passed dialog, after the level's key idea (React), such as what the level built
 *   core(level)   whether the map draws a level full size (a milestone: ../course.js isCore) or smaller
 *   note(level)   the level's key idea, shown when it is passed (default: level.note ?? level.after)
 *   glossary      the encyclopedia: { groups: [{ id, title }], entries: [{ id, group, title, body, at?, see? }] }
 *   html          true when level text (brief, rows, intro, dialogs) is the game's own HTML markup
 *   levelLabel(level), isOpen(level, solved, all), better(score, best), bestLabel(best)
 *
 * Text that grows as the course goes on (a part's description, say) may carry `revisions: [{ at | by, …fields }]`:
 * from the level `at` on, or once the level `by` is passed (an upgrade the player earns there), those fields replace
 * the text's own. In a level, a revision counts when the level is `at` or comes after it, or comes after `by`
 * (textAt); in the components box, once `at` is open or `by` is solved (textFor). An upgrade may bring new abilities
 * as well as words: `forms` (engine/forms.js) adds to the forms a part's card offers, each revision's to the last's.
 */
export function defineGame(def) {
  const levels = def.levels
  const byId = Object.fromEntries(levels.map((level) => [level.id, level]))
  const index = new Map(levels.map((level, i) => [level.id, i]))
  // Without `requires`, a level opens once the one before it is passed.
  const requiresOf = (level) => level.requires ?? (index.get(level.id) > 0 ? [levels[index.get(level.id) - 1].id] : [])
  const isOpen = def.isOpen ?? ((level, solved, all = false) => all || requiresOf(level).every((id) => solved.has(id)))
  // Every level `level` comes after: what it requires, and what those require in turn.
  const before = new Map()
  const ancestors = (level) => {
    if (!before.has(level.id)) before.set(level.id, new Set(requiresOf(level).filter((id) => byId[id]).flatMap((id) => [id, ...ancestors(byId[id])])))
    return before.get(level.id)
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
    byId,
    isOpen,
    missing: (level, solved) => requiresOf(level).filter((id) => !solved.has(id)).map((id) => byId[id]),
    // Every level still to pass before `level` opens: the unsolved ones among all it comes after.
    needed: (level, solved) => [...ancestors(level)].filter((id) => !solved.has(id)).map((id) => byId[id]),
    // Everything a player has unlocked by the time `level` opens: the unlocks of every level it comes after.
    unlocksBefore: (level) => [...ancestors(level)].flatMap((id) => byId[id].unlocks ?? []),
    // What a player has unlocked: every solved level's unlocks (so a level that has since come to unlock something gives
    // it to whoever solved it already), and the flags the save holds.
    /** Is level `id` the level `at`, or one that comes after it? */
    after: (id, at) => id === at || (byId[id] ? ancestors(byId[id]).has(at) : false),
    flagsOf: (progress) => [...new Set([...progress.flags, ...progress.solved.flatMap((id) => byId[id]?.unlocks ?? [])])],
  }
  // A text as it reads in level `id`, and as it reads for a player's progress (every revision whose level is open).
  const revise = (text, applies) => {
    if (!text?.revisions) return text
    const later = text.revisions.filter(applies).sort((a, b) => index.get(a.at ?? a.by) - index.get(b.at ?? b.by))
    const { revisions: _, ...base } = text
    return later.reduce((t, { at: _at, by: _by, forms, ...fields }) => ({ ...t, ...fields, ...(forms ? { forms: [...new Set([...(t.forms ?? []), ...forms])] } : {}) }), base)
  }
  game.textAt = (text, id) => revise(text, (r) => (r.at ? game.after(id, r.at) : Boolean(byId[id]) && ancestors(byId[id]).has(r.by)))
  game.textFor = (text, progress) => revise(text, (r) => (r.at ? Boolean(byId[r.at]) && isOpen(byId[r.at], new Set(progress.solved), progress.all) : progress.all || progress.solved.includes(r.by)))
  // The primitives a level brings in, for the map.
  game.introduced = (level) => (def.parts?.all ?? []).filter((part) => part.at?.includes(level.id))
  // A built part is earned by solving its level; a primitive once a level that brings it in opens. With every level
  // unlocked, the components box is full too (the encyclopedia opens every entry the same way).
  if (def.parts) {
    game.parts = {
      ...def.parts,
      earned: (progress) => {
        if (progress.all) return def.parts.all.map((part) => part.key)
        const solved = new Set(progress.solved)
        const met = def.parts.all.filter((part) => part.at?.some((id) => byId[id] && isOpen(byId[id], solved)))
        return [...game.flagsOf(progress), ...met.map((part) => part.key)]
      },
    }
  }
  game.store = createProgress({ id: def.id, ...(def.progress ?? {}) })
  return game
}
