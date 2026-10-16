// The game shell shared by every game in the study notes (React). A game is content on top of it: see defineGame.
import { createProgress } from './progress.js'

export { default as GameShell } from './GameShell.jsx'
export { Brief, PhonePage, PinnedPlay, Text, Workbench } from './Layout.jsx'
export { Dialog, useEscape } from './Dialogs.jsx'
export { default as Sheet } from './Sheet.jsx'
export { L, getLang, isPair, keyOf, tr } from './i18n.js'
export { useLang } from './useLang.js'
export { PHONE, useMedia } from './useMedia.js'

/**
 * Describe a game for GameShell. Required: id, title, kicker, lede ({ zh, en } pairs), chapters
 * ([{ id, title, label?, question?, number? }]), levels ([{ id, chapter, title, kind, requires?, unlocks?, brief?,
 * hint?, after?, note? … }], in play order) and kinds ({ [kind]: { Screen, icon?, label? } }). Optional:
 *
 *   Hero          the map's illustration ({ theme })
 *   power         a first-run dialog { title, lines }
 *   intro(level)  a level's 引入 pages [{ t, fig? }]; IntroFigure draws a page's fig ({ fig, level, theme })
 *   progress      { version, migrate(saved), legacy() } for saves from older versions or keys
 *   parts         the parts box { all: [{ key, name, desc?, icon?, family? }], earned(progress) → [key] }
 *   unlocked(level)  what passing a level unlocks [{ label, icon?, family? }] for the passed dialog
 *   note(level)   the level's line in the notebook (default: level.note ?? level.after)
 *   html          true when level text (brief, rows, intro, dialogs) is the game's own HTML markup
 *   levelLabel(level), isOpen(level, solved, all), better(score, best), bestLabel(best), planned
 */
export function defineGame(def) {
  const levels = def.levels
  const byId = Object.fromEntries(levels.map((level) => [level.id, level]))
  const index = new Map(levels.map((level, i) => [level.id, i]))
  // Without `requires`, a level opens once the one before it is passed.
  const requiresOf = (level) => level.requires ?? (index.get(level.id) > 0 ? [levels[index.get(level.id) - 1].id] : [])
  const isOpen = def.isOpen ?? ((level, solved, all = false) => all || requiresOf(level).every((id) => solved.has(id)))
  const game = {
    levelLabel: (level) => level.id,
    intro: () => null,
    unlocked: () => [],
    note: (level) => level.note ?? level.after,
    better: (score, best) => !best,
    ...def,
    byId,
    isOpen,
    missing: (level, solved) => requiresOf(level).filter((id) => !solved.has(id)).map((id) => byId[id]),
    // Everything a player playing in order has unlocked by the time they reach `level`.
    unlocksBefore: (level) => levels.slice(0, Math.max(0, index.get(level.id))).flatMap((l) => l.unlocks ?? []),
    // The way on after passing `level`: the first open, unpassed level after it, else the first anywhere.
    nextAfter: (level, solved, all) => {
      const open = (l) => l.id !== level.id && !solved.has(l.id) && isOpen(l, solved, all)
      return levels.slice(index.get(level.id) + 1).find(open) ?? levels.find(open) ?? null
    },
  }
  game.store = createProgress({ id: def.id, ...(def.progress ?? {}) })
  return game
}
