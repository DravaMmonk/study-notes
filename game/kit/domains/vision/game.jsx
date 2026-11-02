// A game on the vision domain (games/DESIGN.md 6.8) on the shared shell (../../shell), from its content: the course
// (course.js) becomes the shell's game description, each task played on the screen of its kind.
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   image.js      the values: numbers and images (grey or colour), read from rows and compared
//   parts.js      the cards of a board and what each computes, value by value over whole images
//   board.js      a board, and a board read from and written as blueprint text
//   run.js        a board on a test, traced card by card
//   grid.js       the grid asks (copy, fill, pick, locate, set)
//   scene.js      the scene model: boxes under a camera and a light, rendered, and the facts claims are judged on
//   judges.js     the choice judges and the claims about a scene
//   benches/      the bench models (pinhole, thin lens)
//   course.js     content read into levels and tasks, play order, the parts the levels build and the course audited
//   play.js       a task and an attempt as a blind player meets them (../../engine/play/)
//   ui/           a screen for each kind of task, the card catalog, images drawn, the benches' pictures
//   validate.js   every task by its kind (npm run check); vision.test.js the parts, boards, asks, judges, scenes and
//                 benches on the course specification's cases (npm test)
//   starter/      the smallest game on the domain, one task of each kind (npm run new-game copies it)
import { CircuitBoard, Grid3x3, ListChecks, SlidersHorizontal } from 'lucide-react'
import './ui/vision.css'
import { defineGame } from '../../shell/index.js'
import { introductions, isCore, levelLabels } from '../../course.js'
import { migrations } from '../../shell/saves.js'
import Screen from './ui/Screen.jsx'
import GridScreen from './ui/GridScreen.jsx'
import ChoiceScreen from './ui/ChoiceScreen.jsx'
import BenchScreen from './ui/BenchScreen.jsx'
import { CARDS } from './ui/catalog.js'
import { visionCourse } from './course.js'

/** The fields of an object that hold something. */
const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

const KINDS = {
  circuit: { Screen, icon: CircuitBoard, label: { zh: '电路', en: 'Circuit' } },
  grid: { Screen: GridScreen, icon: Grid3x3, label: { zh: '读图', en: 'Grid' } },
  choice: { Screen: ChoiceScreen, icon: ListChecks, label: { zh: '判断', en: 'Choice' } },
  bench: { Screen: BenchScreen, icon: SlidersHorizontal, label: { zh: '实验台', en: 'Bench' } },
}

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, saves: migration steps
 *  (../../shell/saves.js), levels, glossary }. */
export default function visionGame(content) {
  const vision = visionCourse(content)
  const { LEVELS, CHAPTERS, course } = vision
  const primitives = [...introductions(course)].map(([type, at]) => ({ key: `part:${type}`, name: CARDS[type].name, desc: CARDS[type].desc, icon: CARDS[type].icon, at }))
  // A part upgraded by later levels is one part in the components box, as its last upgrade names and describes it.
  const built = [...new Map(LEVELS.filter((L) => L.builds).map((L) => [L.builds.type, { key: L.builds.type, name: L.builds.name, desc: L.builds.desc, icon: CircuitBoard }])).values()]
  const labels = levelLabels(content.eras)
  const game = defineGame({
    id: content.id,
    title: content.title,
    kicker: content.kicker,
    lede: content.lede,
    html: true,
    glossary: content.glossary,
    chapters: CHAPTERS,
    core: (level) => isCore(course, level),
    levelLabel: (level) => labels.get(level.id) ?? level.id,
    // A level is its tasks (../../engine/tasks.js), each played on the screen of its kind, reading the task as the
    // course read it (`source`); the level's kind is its last task's.
    levels: LEVELS.map((L, index) => {
      const tasks = vision.played.get(L.id)
      return {
        id: L.id,
        index,
        fresh: L.adds,
        chapter: L.era,
        requires: L.requires,
        title: L.title,
        kind: tasks[tasks.length - 1].kind,
        unlocks: L.builds ? [L.builds.type] : [],
        intro: L.intro,
        after: L.after,
        note: L.note,
        tasks: tasks.map((T, k) => {
          const { step, brief, hint, intro, after, carries } = L.tasks[k]
          return { key: T.taskId, kind: T.kind, ...defined({ step, brief, hint, intro, after, carries }), source: T }
        }),
      }
    }),
    progress: migrations(content.saves),
    intro: (level) => level.intro,
    kinds: KINDS,
    parts: { all: [...primitives, ...built] },
    unlocked: (level) => built.filter((b) => level.unlocks.includes(b.key)).map((b) => ({ label: b.name, icon: b.icon })),
  })
  game.vision = vision
  return game
}
