// A bus game (《车在说话》) on the circuit base's game (../../shell/circuit-game.js), its levels played tick by tick on
// the domain's screen (ui/Screen.jsx), its map drawn with controllers on one bus (ui/Hero.jsx).
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   bus.js        the bus: wired-AND, CAN frames (stuffing, CRC-15), the world's nodes
//   parts.js      the cards of a board and what each computes
//   board.js      a board, and a board read from and written as blueprint text
//   wants.js      what a task's outputs must be, tick by tick
//   run.js        a board on the bus tick by tick (../../engine/ticks.js), checked tick by tick
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   play.js       a level and an attempt as a blind player meets them (../../engine/play/)
//   scene.js      a level's buses drawn without a browser
//   ui/           the board screen, the card catalog and the map's illustration
//   validate.js   every level's reference board and built part (npm run check); can.test.js the bus, the wants and
//                 boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { Activity } from 'lucide-react'
import './ui/can.css'
import { circuitGame } from '../../shell/circuit-game.js'
import Screen from './ui/Screen.jsx'
import Hero from './ui/Hero.jsx'
import { CARDS } from './ui/catalog.js'
import { canCourse } from './course.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, saves: migration steps
 *  (../../shell/saves.js), levels, glossary }. */
export default function canGame(content) {
  const game = circuitGame(content, canCourse(content), { kind: { id: 'bus', icon: Activity, label: { zh: '总线', en: 'Bus' } }, Screen, cards: CARDS })
  // The map's illustration, which the base's game does not draw.
  game.Hero = Hero
  return game
}
