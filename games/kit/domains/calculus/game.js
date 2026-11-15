// A calculus game on the circuit base's game (../../shell/circuit-game.js), its levels played a term a tick on the
// domain's screen (ui/screen.js), its map drawn with a difference engine (ui/Hero.jsx).
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   ops.js        the engine resources a game's parts.json computes with
//   board.js      a board, and a board read from and written as blueprint text
//   run.js        a board run a term a tick (../../engine/ticks.js), checked term by term
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   play.js       a level and an attempt as a blind player meets them (../../engine/play/)
//   ui/           the board screen, its terms' chart and the map's illustration
//   validate.js   every level's reference board and built part (npm run check); calculus.test.js the parts, a board
//                 keeping a register and boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { Sigma } from 'lucide-react'
import './ui/calculus.css'
import { definedGame } from '../../shell/circuit-game.js'
import { screen } from './ui/screen.js'
import Hero from './ui/Hero.jsx'
import { OPS } from './ops.js'
import { calculusCourse } from './course.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, levels, glossary }. */
export default (content) => definedGame(content, calculusCourse(content), { ops: OPS, kind: { id: 'sequence', icon: Sigma, label: { zh: '数列', en: 'Sequence' } }, screen, Hero })
