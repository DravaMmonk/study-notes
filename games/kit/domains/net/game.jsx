// A game on the net domain (《从一根线开始》) on the circuit base's game (../../shell/circuit-game.js), its levels
// played tick by tick on the domain's screen (ui/Screen.jsx).
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
import { Activity } from 'lucide-react'
import './ui/net.css'
import { circuitGame } from '../../shell/circuit-game.js'
import Screen from './ui/Screen.jsx'
import { CARDS } from './ui/catalog.js'
import { netCourse } from './course.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, saves: migration steps
 *  (../../shell/saves.js), levels, glossary }. */
export default (content) => circuitGame(content, netCourse(content), { kind: { id: 'tick', icon: Activity, label: { zh: '逐拍', en: 'Tick by tick' } }, Screen, cards: CARDS })
