// A game on the net domain (《从一根线开始》) on the shared shell (../../shell), from its content (games/DESIGN.md 6.3):
// the course (course.js) becomes the shell's game description, with the domain's tick-by-tick board screen
// (ui/Screen.jsx) and its parts box.
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   wire.js       the world: point-to-point wires, their delay and flips, the formats the far ends speak
//   parts.js      the cards of a board and what each computes
//   board.js      a board, and a board read from and written as blueprint text
//   wants.js      what a level's outputs and wires out must be, tick by tick or in order
//   run.js        a board on its wires tick by tick (../../engine/ticks.js registers), checked as it goes and at the end
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   play.js       a level and an attempt as a blind player meets them (../../engine/play/)
//   ui/           the board screen and the card catalog
//   validate.js   every level's reference board and built part (npm run check); net.test.js the formats, the wants
//                 and boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { Activity, CircuitBoard } from 'lucide-react'
import './ui/net.css'
import { defineGame } from '../../shell/index.js'
import { introductions, isCore } from '../../course.js'
import { migrations } from '../../shell/saves.js'
import Screen from './ui/Screen.jsx'
import { CARDS } from './ui/catalog.js'
import { netCourse } from './course.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, saves: migration steps
 *  (../../shell/saves.js), levels, glossary }. */
export default function netGame(content) {
  const net = netCourse(content)
  const { LEVELS, CHAPTERS, course } = net
  const primitives = [...introductions(course)].map(([type, at]) => ({ key: `part:${type}`, name: CARDS[type].name, desc: CARDS[type].desc, icon: CARDS[type].icon, at }))
  const built = LEVELS.filter((L) => L.builds).map((L) => ({ key: L.builds.type, name: L.builds.name, desc: L.builds.desc, icon: CircuitBoard }))
  const game = defineGame({
    id: content.id,
    title: content.title,
    kicker: content.kicker,
    lede: content.lede,
    html: true,
    glossary: content.glossary,
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
      kind: 'tick',
      unlocks: L.builds ? [L.builds.type] : [],
      keeps: Boolean(L.builds) || net.carried.has(L.id),
      brief: L.brief,
      hint: L.hint,
      after: L.after,
      note: L.note,
    })),
    progress: migrations(content.saves),
    intro: (level) => level.source.intro,
    kinds: { tick: { Screen, icon: Activity, label: { zh: '逐拍', en: 'Tick by tick' } } },
    parts: { all: [...primitives, ...built] },
    unlocked: (level) => built.filter((b) => level.unlocks.includes(b.key)).map((b) => ({ label: b.name, icon: b.icon })),
  })
  game.net = net
  return game
}
