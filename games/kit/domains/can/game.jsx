// A bus game on the shared shell (../../shell): its spec becomes the shell's game description, with the can domain's
// board screen, its parts box and its map art.
//
//   bus.js      the bus: wired-AND, CAN frames (stuffing, CRC-15), the world's nodes
//   parts.js    the cards of a board and what each computes
//   run.js      a board on the bus tick by tick (../../engine/ticks.js), checked tick by tick
//   course.js   a spec read into levels, play order, the parts the levels build and the course the audit checks
//   build.js    boards written compactly in a spec
//   ui/         the board screen and the card catalog
//   validate.js every level's reference board (npm run check); can.test.js the bus (npm test)
import { Activity, CircuitBoard } from 'lucide-react'
import './ui/can.css'
import { defineGame } from '../../shell/index.js'
import { introductions, isCore } from '../../course.js'
import { migrations } from '../../shell/saves.js'
import BusScreen from './ui/BusScreen.jsx'
import Hero from './ui/Hero.jsx'
import { CARDS } from './ui/catalog.js'

/** spec: { id, title, kicker, lede, bus (busCourse's result), glossary, saves: migration steps (../../shell/saves.js) } */
export function defineBusGame(spec) {
  const { LEVELS, CHAPTERS, course } = spec.bus
  const primitives = [...introductions(course)].map(([type, at]) => ({ key: `part:${type}`, name: CARDS[type].name, desc: CARDS[type].desc, icon: CARDS[type].icon, at }))
  const built = LEVELS.filter((L) => L.builds).map((L) => ({ key: L.builds.type, name: L.builds.name, desc: L.builds.desc, icon: CircuitBoard }))
  const game = defineGame({
    id: spec.id,
    title: spec.title,
    kicker: spec.kicker,
    lede: spec.lede,
    Hero,
    html: true,
    glossary: spec.glossary,
    chapters: CHAPTERS,
    core: (level) => isCore(course, level),
    levels: LEVELS.map((L, index) => ({
      id: L.id,
      index,
      source: L,
      fresh: L.adds,
      chapter: L.era,
      requires: L.requires,
      title: L.title,
      kind: 'bus',
      unlocks: L.builds ? [L.builds.type] : [],
      brief: L.brief,
      hint: L.hint,
      after: L.after,
      note: L.note,
    })),
    progress: migrations(spec.saves ?? []),
    intro: (level) => level.source.intro,
    kinds: { bus: { Screen: BusScreen, icon: Activity, label: { zh: '总线', en: 'Bus' } } },
    parts: { all: [...primitives, ...built] },
    unlocked: (level) => built.filter((b) => level.unlocks.includes(b.key)).map((b) => ({ label: b.name, icon: b.icon })),
  })
  game.bus = spec.bus
  return game
}
