// A market game on the circuit base's game (../../shell/circuit-game.js), its levels played a tick at a time on the
// domain's screen (ui/Screen.jsx) against a street that answers the board's prices.
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   world.js      a street of shops: who buys at a price, one tick of trade
//   parts.js      the cards of a board and what each computes
//   board.js      a board, and a board read from and written as blueprint text
//   run.js        a board run against a street that answers it (../../engine/ticks.js reacting), judged by what the
//                 street earns
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   ui/           the board screen and the card catalog
//   validate.js   every level's reference board and built part (npm run check); market.test.js the street, a board
//                 that follows it and boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { Store } from 'lucide-react'
import './ui/market.css'
import { circuitGame } from '../../shell/circuit-game.js'
import Screen from './ui/Screen.jsx'
import { CARDS } from './ui/catalog.js'
import { marketCourse } from './course.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, levels, glossary }. */
export default (content) => circuitGame(content, marketCourse(content), { kind: { id: 'street', icon: Store, label: { zh: '街市', en: 'Street' } }, Screen, cards: CARDS })
