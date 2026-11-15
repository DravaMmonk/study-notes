// A market game on the circuit base's game (../../shell/circuit-game.js), its levels played a tick at a time on the
// domain's screen (ui/screen.js) against a street that answers the board's prices.
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   world.js      a street of shops: who buys at a price, one tick of trade
//   ops.js        the engine resources a game's pieces.json computes with
//   board.js      a board, and a board read from and written as blueprint text
//   run.js        a board run against a street that answers it (../../engine/ticks.js reacting), judged by what the
//                 street earns
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   ui/           the board screen and the street's chart
//   validate.js   every level's reference board and built part (npm run check); market.test.js the street, a board
//                 that follows it and boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { Store } from 'lucide-react'
import './ui/market.css'
import { definedGame } from '../../shell/circuit-game.js'
import { screen } from './ui/screen.js'
import { OPS } from './ops.js'
import { marketCourse } from './course.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, levels, glossary }. */
export default (content) => definedGame(content, marketCourse(content), { ops: OPS, kind: { id: 'street', icon: Store, label: { zh: '街市', en: 'Street' } }, screen })
