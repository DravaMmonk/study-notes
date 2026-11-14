// A game on a circuit domain (../engine/circuit-preset.js) on the shared shell, from its content (games/DESIGN.md 6.3):
// the course read becomes the shell's game description, every level played by the domain's screen (CircuitScreen.jsx)
// and the parts box holding the game's primitives and the parts its levels build. The course read is `game.circuit`.
//
//   circuitGame(content, circuit, { kind: { id, icon, label }, screen, cards, Hero?, kinds?, IntroFigure? })
//     screen       what the domain declares of its screen (its ui/screen.js; CircuitScreen.jsx circuitScreen): the
//                  kit draws it, the domain writes no component
//     cards        { type: { name, desc, icon, revisions? } } the domain's cards, as the parts box shows a primitive
//     Hero         the map's illustration, when the game draws one
//     kinds        { kind: { Screen, icon, label } } the screens of the tasks that are no board (the course read's
//                  kinds); a level's kind is its last task's
//     IntroFigure  what draws an introduction page's figure (index.js)
//   definedGame(content, circuit, { ops, …circuitGame's but cards })   the game of a domain whose games define their
//     own parts: its screen says what a failed run gives as its reason and the room a card's picture takes, so the
//     domain declares only its run.js (`screen: { play }`) and what it adds;
//     own parts (parts.json, the course read's `defs`): its cards are those parts, and `game.defined` is what draws
//     them, on its screens (CircuitScreen `defined`) and in the studio (parts/PartPreview.jsx)
import { CircuitBoard } from 'lucide-react'
import { introductions, isCore, levelLabels } from '../course.js'
import { circuitScreen } from './CircuitScreen.jsx'
import { defineGame } from './index.js'
import { iconOf } from './parts/icons.js'

/** The fields of an object that hold something. */
const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

export function circuitGame(content, circuit, { kind, screen, cards, Hero, kinds = {}, IntroFigure }) {
  const Screen = circuitScreen({ ...screen, cards, course: (game) => game.circuit })
  const { LEVELS, CHAPTERS, course } = circuit
  const primitives = [...introductions(course)].map(([type, at]) => {
    const { name, desc, icon, revisions } = cards[type]
    return { key: `part:${type}`, name, desc, ...defined({ revisions }), icon, at, atTasks: at.flatMap((id) => circuit.introductions(type, id)) }
  })
  const built = [...new Map(LEVELS.filter((L) => L.builds).map((L) => [L.builds.type, { key: L.builds.type, name: L.builds.name, desc: L.builds.desc, icon: CircuitBoard }])).values()]
  const labels = levelLabels(content.eras, { notes: course.notes })
  const kindOf = (T) => (kinds[T.kind] ? T.kind : kind.id)
  const game = defineGame({
    id: content.id,
    title: content.title,
    kicker: content.kicker,
    lede: content.lede,
    glossary: content.glossary,
    views: content.views,
    course,
    Hero,
    notes: course.notes,
    chapters: CHAPTERS,
    core: (level) => isCore(course, level),
    levelLabel: (level) => labels.get(level.id) ?? level.id,
    // A level is its tasks (../engine/tasks.js): the shell plays each as the level with the task's fields over it,
    // its screen reading the task as the course read it (`source`).
    levels: LEVELS.map((L, index) => {
      const tasks = circuit.played.get(L.id)
      return {
        id: L.id,
        index,
        fresh: L.adds,
        chapter: L.era,
        requires: L.requires,
        title: L.title,
        kind: kindOf(tasks.at(-1)),
        unlocks: L.builds ? [L.builds.type] : [],
        keeps: Boolean(L.builds) || circuit.carried.has(L.id),
        intro: L.intro,
        after: L.after,
        afterShow: L.afterShow,
        note: L.note,
        tasks: tasks.map((T, k) => {
          const { step, brief, hint, intro, after, carries } = L.tasks[k]
          return { key: T.taskId, kind: kindOf(T), ...defined({ step, brief, hint, intro, after, carries }), fresh: T.fresh, source: T }
        }),
      }
    }),
    intro: (level) => level.intro,
    IntroFigure,
    kinds: { [kind.id]: { Screen, icon: kind.icon, label: kind.label }, ...kinds },
    parts: { all: [...primitives, ...built] },
    unlocked: (level) => built.filter((b) => level.unlocks.includes(b.key)).map((b) => ({ label: b.name, icon: b.icon })),
  })
  game.circuit = circuit
  game.workReferences = (entry, built) => {
    circuit.syncOwn(built)
    return circuit.workReferences(entry.task, entry.work)
  }
  return game
}

export function definedGame(content, circuit, { ops, ...own }) {
  const cards = Object.fromEntries(Object.entries(circuit.defs).map(([type, d]) => [type, { name: d.name, desc: d.desc, icon: iconOf(d.icon) }]))
  const screen = { canvas: { height: 96 }, ...own.screen }
  return Object.assign(circuitGame(content, circuit, { ...own, screen, cards }), { defined: { of: (type) => circuit.defs[type] ?? null, defaults: circuit.defaultsOf, ops } })
}
