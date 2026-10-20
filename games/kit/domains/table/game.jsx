// A table game on the shared shell (../../shell): its spec becomes the shell's game description, with the table
// domain's screen (every level played through its mode), its parts box by robot and its intro pictures.
import { Cable, Grid3x3 } from 'lucide-react'
import './table.css'
import { defineGame } from '../../shell/index.js'
import { eraLevels, pathLevels } from '../../course.js'
import ModeScreen from './screen.jsx'
import Hero from './hero.jsx'
import { sceneSVG } from './svg.js'
import PartDemo from './circuit/PartDemo.jsx'
import { lookIcon } from './circuit/looks.js'
import { ROBOTS } from './circuit/robots.js'

function IntroFigure({ fig }) {
  return <div className="fig" dangerouslySetInnerHTML={{ __html: sceneSVG(fig, { pad: 12, maxScale: 1.3 }) }} />
}

/**
 * spec: { id, title, kicker, lede: (count) → { zh, en }, eras, table (tableCourse's result), glossary, legacy?() an
 * old save to start from, borrow: { part: level id } the level whose board a part that is an idea is tried on }
 */
export function defineTableGame(spec) {
  const { LEVELS, REQUIRES, TRACKS, CHAPTERS, LABELS, PARTS } = spec.table
  const ERAS = spec.eras
  const levels = LEVELS.map((L, index) => ({
    id: L.id,
    index,
    source: L,
    chapter: L.ch,
    // Opens once these are solved: the era's foundation in order, then its topics side by side (levels/eras.js).
    requires: REQUIRES.get(L.id) ?? [],
    title: L.title,
    kind: L.mode === 'circuit' ? 'circuit' : 'board',
    unlocks: L.unlock ? [L.unlock] : [],
    afterTitle: L.debrief.title,
    after: L.debrief.body,
    note: L.debrief.note,
  }))

  // Saves from before the shell, under spec.legacyKey as { done, seen, data, all }.
  function legacy() {
    if (!spec.legacyKey) return null
    try {
      const old = JSON.parse(window.localStorage.getItem(spec.legacyKey))
      if (!old) return null
      const done = LEVELS.filter((L) => old.done?.[L.id])
      return { version: 1, solved: done.map((L) => L.id), flags: done.filter((L) => L.unlock).map((L) => L.unlock), data: old.data ?? {}, introSeen: old.seen ?? {}, all: Boolean(old.all), seenPower: true }
    } catch {
      return null
    }
  }

  // The components box by robot: a robot can use every part earned in its era and the eras before it (parts carry over,
  // games/DESIGN.md 2.1). It joins the box once the first level of its era is passed.
  const eraOf = new Map(ERAS.flatMap((era, e) => eraLevels(era).map((id) => [id, e])))
  const robotFilters = (progress) => ERAS.flatMap((era, e) => {
    if (!era.machine) return []
    const first = pathLevels(era.foundation)[0]
    const keys = new Set(LEVELS.filter((L) => L.unlock && eraOf.get(L.id) <= e).map((L) => L.unlock))
    const robot = ROBOTS[era.machine]
    return [{ key: era.machine, name: robot.name, icon: robot.look, keys, lock: progress.all || progress.solved.includes(first) ? null : LABELS.get(first) }]
  })

  const game = defineGame({
    id: spec.id,
    glossary: spec.glossary,
    title: spec.title,
    kicker: spec.kicker,
    lede: spec.lede(LEVELS.length),
    Hero,
    html: true,
    chapters: CHAPTERS.map((chapter, id) => ({ id, kicker: chapter.kicker, title: chapter.name, question: chapter.desc, track: TRACKS.get(chapter.era) })),
    levels,
    progress: { version: 1, legacy },
    // Numbered as in CURRICULUM.md: 1-4 on an era's main path, S2 in a topic, C1 for a challenge.
    levelLabel: (level) => LABELS.get(level.id) ?? String(level.index + 1),
    intro: (level) => level.source.intro,
    IntroFigure,
    kinds: {
      circuit: { Screen: ModeScreen, icon: Cable, label: { zh: '电路板', en: 'Circuit board' } },
      board: { Screen: ModeScreen, icon: Grid3x3, label: { zh: '棋盘', en: 'Board' } },
    },
    unlocked: (level) => level.unlocks.map((k) => ({ label: PARTS[k].name })),
    parts: {
      // Only parts a level that is played unlocks (a retired level's card would never be earned).
      all: Object.entries(PARTS).filter(([key]) => LEVELS.some((L) => L.unlock === key)).map(([key, part]) => ({ key, name: part.name, desc: part.desc, icon: lookIcon(key) })),
      earned: (progress) => progress.flags,
      // The part on a bench: its level's board, with inputs, constants and models to change and a Run button.
      demo: (part, { phone }) => <PartDemo key={part.key} partKey={part.key} phone={phone} levels={LEVELS} borrow={spec.borrow ?? {}} />,
      filters: robotFilters,
    },
  })
  game.table = spec.table
  return game
}
