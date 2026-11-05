// A __name__ game on the circuit base's game (../../shell/circuit-game.js), its levels played on the domain's circuit
// level (ui/Screen.jsx).
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   ops.js        the engine resources a game's parts.json calls
//   board.js      a board, and a board read from and written as blueprint text
//   run.js        a board on a test, traced card by card
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   ui/           the circuit level and the card catalog
//   validate.js   every level's reference board and built part (npm run check); __name__.test.js the parts and
//                 boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { Binary } from 'lucide-react'
import './ui/__name__.css'
import { circuitGame } from '../../shell/circuit-game.js'
import { iconOf } from '../../shell/parts/icons.js'
import Screen from './ui/Screen.jsx'
import { __name__Course } from './course.js'
import { OPS } from './ops.js'

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, saves: migration steps
 *  (../../shell/saves.js), levels, glossary, partDefs }. */
export default function __name__Game(content) {
  const __name__ = __name__Course(content)
  const cards = Object.fromEntries(Object.entries(__name__.defs).map(([type, d]) => [type, { name: d.name, desc: d.desc, icon: iconOf(d.icon) }]))
  const game = circuitGame(content, __name__, { kind: { id: 'circuit', icon: Binary, label: { zh: '电路', en: 'Circuit' } }, Screen, cards })
  // The game's own parts as the studio shows them (../../shell/parts/PartPreview.jsx).
  game.defined = { of: (type) => __name__.defs[type] ?? null, defaults: __name__.defaultsOf, ops: OPS }
  return game
}
