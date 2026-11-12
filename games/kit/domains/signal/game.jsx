// A signal game on the circuit base's game (../../shell/circuit-game.js), its levels played on the domain's circuit
// level (ui/Screen.jsx).
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   values.js     the values on the wires: a number, and a wave (a grid of one row)
//   ops.js        the engine resources a game's parts.json calls
//   board.js      a board, and a board read from and written as blueprint text
//   run.js        a board on a test, traced card by card
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   ui/           the circuit level and the card catalog
//   validate.js   every level's reference board and built part (npm run check); signal.test.js the parts and
//                 boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { AudioWaveform } from 'lucide-react'
import './ui/signal.css'
import { definedGame } from '../../shell/circuit-game.js'
import Screen from './ui/Screen.jsx'
import { signalCourse } from './course.js'
import { OPS } from './ops.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, levels, glossary, partDefs }. */
export default (content) => definedGame(content, signalCourse(content), { kind: { id: 'circuit', icon: AudioWaveform, label: { zh: '电路', en: 'Circuit' } }, Screen, ops: OPS })
