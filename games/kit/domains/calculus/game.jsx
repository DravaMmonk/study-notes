// A calculus game on the circuit base's game (../../shell/circuit-game.js), its levels played a term a tick on the
// domain's screen (ui/Screen.jsx), its map drawn with a difference engine (ui/Hero.jsx).
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   parts.js      the cards of a board and what each computes
//   board.js      a board, and a board read from and written as blueprint text
//   run.js        a board run a term a tick (../../engine/ticks.js), checked term by term
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   play.js       a level and an attempt as a blind player meets them (../../engine/play/)
//   ui/           the board screen, the card catalog and the map's illustration
//   validate.js   every level's reference board and built part (npm run check); calculus.test.js the parts, a board
//                 keeping a register and boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { Sigma } from 'lucide-react'
import './ui/calculus.css'
import { circuitGame } from '../../shell/circuit-game.js'
import Screen from './ui/Screen.jsx'
import Hero from './ui/Hero.jsx'
import { CARDS } from './ui/catalog.js'
import { calculusCourse } from './course.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, levels, glossary }. */
export default (content) => circuitGame(content, calculusCourse(content), { kind: { id: 'sequence', icon: Sigma, label: { zh: '数列', en: 'Sequence' } }, Screen, cards: CARDS, Hero })
