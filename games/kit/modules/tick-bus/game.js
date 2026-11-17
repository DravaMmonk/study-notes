import { loadDisplays } from '../../engine/displays.js'
// A tick-bus game on the circuit base's game (../../shell/circuit-game.js), its levels played tick by tick on the
// domain's screen (ui/screen.js).
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   line.js       the world: the line's rule and the world's node
//   board.js      a board, and a board read from and written as blueprint text
//   wants.js      what a level's outputs (and what it says) must be, tick by tick
//   run.js        a board on the line tick by tick (../../engine/ticks.js), checked tick by tick
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   play.js       a level and an attempt as a blind player meets them (../../engine/play/)
//   ui/           the board screen and its fixed cards
//   validate.js   every level's reference board and built part (npm run check); tick-bus.test.js the line, the wants
//                 and boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { Activity } from 'lucide-react'
import { definedGame } from '../../../../packages/circuit/view/index.jsx'
import { tickBusWorks } from './work.js'

const ui = await loadDisplays(['tick-bus:screen', 'tick-bus:catalog'])

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, levels, glossary }. */
export default (content, works = tickBusWorks(content)) => definedGame(content, works, { ops: {}, kind: { id: 'tick', icon: Activity, label: { zh: '逐拍', en: 'Tick by tick' } }, screen: ui['tick-bus:screen'], cards: ui['tick-bus:catalog'] })
