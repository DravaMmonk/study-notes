// A game on the vision domain (games/DESIGN.md 6.8) on the circuit base's game (../../shell/circuit-game.js), from
// its content: its boards played on the domain's circuit level (ui/Screen.jsx), its grids, choices and benches each on
// a screen of its own.
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   image.js      the values: numbers and images (grey or colour), read from rows and compared
//   ops.js        the engine resources a game's parts.json calls, value by value over whole images
//   board.js      a board's cards: the task's inputs (one alone or a group on one card) and outputs
//   run.js        a board on a test, traced card by card
//   grid.js       the grid asks (copy, fill, pick, locate, set)
//   scene.js      the scene model: boxes under a camera and a light, rendered, and the facts claims are judged on
//   judges.js     the choice judges and the claims about a scene
//   benches/      the bench models (pinhole, thin lens)
//   course.js     content read into levels and tasks, each by its kind, and the settings built parts take
//   configurations.js, tooling.js   the setting values a task offers, and a board held to them
//   play.js       a task and an attempt as a blind player meets them (../../engine/play/)
//   ui/           a screen for each kind of task, the card catalog, images drawn, the benches' pictures
//   validate.js   every task by its kind (npm run check); vision.test.js the parts, boards, asks, judges, scenes and
//                 benches on the course specification's cases (npm test)
//   starter/      the smallest game on the domain, one task of each kind (npm run new-game copies it)
import { CircuitBoard, Grid3x3, ListChecks, SlidersHorizontal } from 'lucide-react'
import './ui/vision.css'
import { circuitGame } from '../../shell/circuit-game.js'
import { iconOf } from '../../shell/parts/icons.js'
import Screen from './ui/Screen.jsx'
import GridScreen from './ui/GridScreen.jsx'
import ChoiceScreen from './ui/ChoiceScreen.jsx'
import BenchScreen from './ui/BenchScreen.jsx'
import IntroFigure from './ui/IntroFigure.jsx'
import { visionCourse } from './course.js'
import { optionText } from './configurations.js'
import { OPS } from './ops.js'

const KINDS = {
  grid: { Screen: GridScreen, icon: Grid3x3, label: { zh: '读图', en: 'Grid' } },
  choice: { Screen: ChoiceScreen, icon: ListChecks, label: { zh: '判断', en: 'Choice' } },
  bench: { Screen: BenchScreen, icon: SlidersHorizontal, label: { zh: '实验台', en: 'Bench' } },
}

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, saves: migration steps
 *  (../../shell/saves.js), levels, glossary, partDefs }. */
export default function visionGame(content) {
  const vision = visionCourse(content)
  // A part's description grows with the options its settings open, level by level.
  const cards = Object.fromEntries(Object.entries(vision.defs).map(([type, d]) => [type, { name: d.name, ...optionText(vision.LEVELS, d), icon: iconOf(d.icon) }]))
  const game = circuitGame(content, vision, { kind: { id: 'circuit', icon: CircuitBoard, label: { zh: '电路', en: 'Circuit' } }, Screen, cards, kinds: KINDS, IntroFigure })
  // The game's own parts as the studio shows them (../../shell/parts/PartPreview.jsx).
  game.defined = { of: (type) => vision.defs[type] ?? null, defaults: vision.defaultsOf, ops: OPS }
  return game
}
