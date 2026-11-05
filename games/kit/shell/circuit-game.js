// A game on a circuit domain (../engine/circuit-domain.js) on the shared shell, from its content (games/DESIGN.md 6.3):
// the course read becomes the shell's game description, every level played by the domain's screen (CircuitScreen.jsx)
// and the parts box holding the game's primitives and the parts its levels build. The course read is `game.circuit`.
//
//   circuitGame(content, circuit, { kind: { id, icon, label }, Screen, cards })
//     cards  { type: { name, desc, icon } } the domain's cards, as the parts box shows a primitive
import { CircuitBoard } from 'lucide-react'
import { introductions, isCore, levelLabels } from '../course.js'
import { defineGame } from './index.js'
import { migrations } from './saves.js'

/** The fields of an object that hold something. */
const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

export function circuitGame(content, circuit, { kind, Screen, cards }) {
  const { LEVELS, CHAPTERS, course } = circuit
  const primitives = [...introductions(course)].map(([type, at]) => ({ key: `part:${type}`, name: cards[type].name, desc: cards[type].desc, icon: cards[type].icon, at }))
  const built = LEVELS.filter((L) => L.builds).map((L) => ({ key: L.builds.type, name: L.builds.name, desc: L.builds.desc, icon: CircuitBoard }))
  const labels = levelLabels(content.eras)
  const game = defineGame({
    id: content.id,
    title: content.title,
    kicker: content.kicker,
    lede: content.lede,
    glossary: content.glossary,
    chapters: CHAPTERS,
    core: (level) => isCore(course, level),
    levelLabel: (level) => labels.get(level.id) ?? level.id,
    // A level is its tasks (../engine/tasks.js): the shell plays each as the level with the task's fields over it,
    // its screen reading the task as the course read it (`source`).
    levels: LEVELS.map((L, index) => ({
      id: L.id,
      index,
      fresh: L.adds,
      chapter: L.era,
      requires: L.requires,
      title: L.title,
      kind: kind.id,
      unlocks: L.builds ? [L.builds.type] : [],
      keeps: Boolean(L.builds) || circuit.carried.has(L.id),
      intro: L.intro,
      after: L.after,
      note: L.note,
      tasks: circuit.played.get(L.id).map((T, k) => {
        const { step, brief, hint, intro, after, carries } = L.tasks[k]
        return { key: T.taskId, ...defined({ step, brief, hint, intro, after, carries }), source: T }
      }),
    })),
    progress: migrations(content.saves),
    intro: (level) => level.intro,
    kinds: { [kind.id]: { Screen, icon: kind.icon, label: kind.label } },
    parts: { all: [...primitives, ...built] },
    unlocked: (level) => built.filter((b) => level.unlocks.includes(b.key)).map((b) => ({ label: b.name, icon: b.icon })),
  })
  game.circuit = circuit
  return game
}
