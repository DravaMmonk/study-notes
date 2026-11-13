// A linear game on the circuit base's game (../../shell/circuit-game.js), its levels played on the domain's circuit
// level (run.js), its map drawn with a shear rack (ui/Hero.jsx).
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   ops.js        the engine resources a game's parts.json calls
//   board.js      a board, and a board read from and written as blueprint text
//   run.js        a board on a test, traced card by card
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   ui/           the circuit level and the card catalog
//   validate.js   every level's reference board and built part (npm run check); linear.test.js the parts and
//                 boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { Grid3x3 } from 'lucide-react'
import './ui/linear.css'
import { definedGame } from '../../shell/circuit-game.js'
import * as play from './run.js'
import Hero from './ui/Hero.jsx'
import { linearCourse } from './course.js'
import { OPS } from './ops.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, levels, glossary, partDefs }. */
export default (content) => definedGame(content, linearCourse(content), { kind: { id: 'circuit', icon: Grid3x3, label: { zh: '电路', en: 'Circuit' } }, screen: { play, judged: true }, Hero, ops: OPS })
