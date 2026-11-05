// A __name__ game on the circuit base's game (../../shell/circuit-game.js), its levels played tick by tick on the
// domain's screen (ui/Screen.jsx).
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   line.js       the world: the line's rule and the world's node
//   parts.js      the cards of a board and what each computes
//   board.js      a board, and a board read from and written as blueprint text
//   wants.js      what a level's outputs (and what it says) must be, tick by tick
//   run.js        a board on the line tick by tick (../../engine/ticks.js), checked tick by tick
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   play.js       a level and an attempt as a blind player meets them (../../engine/play/)
//   ui/           the board screen and the card catalog
//   validate.js   every level's reference board and built part (npm run check); __name__.test.js the line, the wants
//                 and boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { Activity } from 'lucide-react'
import './ui/__name__.css'
import { circuitGame } from '../../shell/circuit-game.js'
import Screen from './ui/Screen.jsx'
import { CARDS } from './ui/catalog.js'
import { __name__Course } from './course.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, saves: migration steps
 *  (../../shell/saves.js), levels, glossary }. */
export default (content) => circuitGame(content, __name__Course(content), { kind: { id: 'tick', icon: Activity, label: { zh: '逐拍', en: 'Tick by tick' } }, Screen, cards: CARDS })
