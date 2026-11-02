// A __name__ game on the shared shell (../../shell), from its content (games/DESIGN.md 6.3): the course (course.js)
// becomes the shell's game description, with the domain's tick-by-tick board screen (ui/Screen.jsx) and its parts box.
//
//   vocabulary.js what content may name; domain.js the checks' side of the domain (npm run check)
//   line.js       the world: the line's rule and the world's node
//   parts.js      the cards of a board and what each computes
//   board.js      a board, and a board read from and written as blueprint text
//   wants.js      what a level's outputs (and what it says) must be, tick by tick
//   run.js        a board on the line tick by tick (../../engine/ticks.js), checked tick by tick
//   course.js     content read into levels, play order, the parts the levels build and the course the audit checks
//   play.js       a level and an attempt as a blind player meets them (../../engine/play/)
//   ui/           the board screen and the card catalog
//   validate.js   every level's reference board and built part (npm run check); __name__.test.js the line, the wants
//                 and boards as text (npm test)
//   starter/      the smallest game on the domain (npm run new-game copies it)
import { Activity, CircuitBoard } from 'lucide-react'
import './ui/__name__.css'
import { defineGame } from '../../shell/index.js'
import { introductions, isCore, levelLabels } from '../../course.js'
import { migrations } from '../../shell/saves.js'
import Screen from './ui/Screen.jsx'
import { CARDS } from './ui/catalog.js'
import { __name__Course } from './course.js'

/** The fields of an object that hold something. */
const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

/** content (../../engine/content.js): { id, title, kicker, lede, primitives, concept, eras, saves: migration steps
 *  (../../shell/saves.js), levels, glossary }. */
export default function __name__Game(content) {
  const __name__ = __name__Course(content)
  const { LEVELS, CHAPTERS, course } = __name__
  const primitives = [...introductions(course)].map(([type, at]) => ({ key: `part:${type}`, name: CARDS[type].name, desc: CARDS[type].desc, icon: CARDS[type].icon, at }))
  const built = LEVELS.filter((L) => L.builds).map((L) => ({ key: L.builds.type, name: L.builds.name, desc: L.builds.desc, icon: CircuitBoard }))
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
    // A level is its tasks (../../engine/tasks.js): the shell plays each as the level with the task's fields over it,
    // its screen reading the task as the course read it (`source`).
    levels: LEVELS.map((L, index) => ({
      id: L.id,
      index,
      fresh: L.adds,
      chapter: L.era,
      requires: L.requires,
      title: L.title,
      kind: 'tick',
      unlocks: L.builds ? [L.builds.type] : [],
      intro: L.intro,
      after: L.after,
      note: L.note,
      tasks: __name__.played.get(L.id).map((T, k) => {
        const { step, brief, hint, intro, after } = L.tasks[k]
        return { key: T.taskId, ...defined({ step, brief, hint, intro, after }), source: T }
      }),
    })),
    progress: migrations(content.saves),
    intro: (level) => level.intro,
    kinds: { tick: { Screen, icon: Activity, label: { zh: '逐拍', en: 'Tick by tick' } } },
    parts: { all: [...primitives, ...built] },
    unlocked: (level) => built.filter((b) => level.unlocks.includes(b.key)).map((b) => ({ label: b.name, icon: b.icon })),
  })
  game.__name__ = __name__
  return game
}
