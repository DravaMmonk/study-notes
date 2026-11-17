// A game on a circuit domain (../engine/circuit-preset.js) on the shared shell, from its content (games/DESIGN.md 6.3):
// the course read becomes the shell's game description, every level played by the domain's screen (CircuitScreen.jsx)
// and the parts box holding the game's primitives and its built parts (`part`: the parts.json entry; each opens on
// the board it runs). The course read is `game.circuit`.
//
//   circuitGame(content, circuit, { kind: { id, icon, label }, screen, cards, Hero?, IntroFigure? })
//     screen       what the domain declares of its screen (its ui/screen.js; CircuitScreen.jsx circuitScreen): the
//                  kit draws it, the domain writes no component
//     cards        { type: { name, desc, icon, revisions? } } the domain's cards, as the parts box shows a primitive
//     Hero         the map's illustration, when the game draws one
//     IntroFigure  what draws an introduction page's figure (index.js)
//   definedGame(content, circuit, { ops, cards?, …circuitGame's })   the game of a domain whose games define their
//     own parts: its screen says what a failed run gives as its reason and the room a card's picture takes, so the
//     domain declares only its run.js (`screen: { play }`) and what it adds;
//     own parts (parts.json, the course read's `defs`): its cards are those parts (and `cards`, its fixed cards drawn its
//     own way), and `game.defined` is what draws
//     them, on its screens (CircuitScreen `defined`) and as the circuit editor previews them (../circuit/preview.jsx)
import { CircuitBoard } from 'lucide-react'
import { levelLabels } from 'kernel/view'
import { fresh, introductions, isCore } from '../core/course.js'
import { definePlays } from 'kernel/view'

import { playKinds } from 'kernel/view'

import { defineGame } from './game-definition.js'

import { iconOf } from "./parts/icons.js"

/** The fields of an object that hold something. */
const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

export function circuitGame(content, circuit, { kind, screen, cards, Hero, IntroFigure }) {
  const plays = definePlays({ [kind.id]: { editor: 'circuit', judge: 'steps', resources: kind.id } })
  const resources = { [kind.id]: { ...screen, cards, course: (game) => game.circuit } }
  const { LEVELS, CHAPTERS, course } = circuit
  const primitives = [...introductions(course)].map(([type, at]) => {
    const { name, desc, icon } = cards[type]
    return { key: `part:${type}`, part: type, name, desc, icon, at, atTasks: at.flatMap((id) => circuit.introductions(type, id)) }
  })
  // The built parts, in the order the course builds them.
  const built = [...new Set(LEVELS.flatMap((L) => L.unlocks))].map((type) => ({ key: type, part: type, name: circuit.parts[type].name, desc: circuit.parts[type].desc, icon: CircuitBoard }))
  const labels = levelLabels(content.eras)
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
        fresh: [...fresh(course, L)].map(course.partOf),
        chapter: L.era,
        requires: L.requires,
        title: L.title,
        kind: kind.id,
        unlocks: L.unlocks,
        keeps: L.unlocks.length > 0 || circuit.carried.has(L.id),
        intro: L.intro,
        after: L.after,
        afterShow: L.afterShow,
        note: L.note,
        tasks: tasks.map((T, k) => {
          const { step, brief, hint, intro, after, carries } = L.tasks[k]
          return { key: T.taskId, ...defined({ step, brief, hint, intro, after, carries }), fresh: [...fresh(course, { id: L.id, task: k })].map(course.partOf), source: T }
        }),
      }
    }),
    intro: (level) => level.intro,
    IntroFigure,
    kinds: playKinds(plays, resources, { [kind.id]: kind }),
    parts: {
      all: [...primitives, ...built],
      // A built part shows the board it runs: the one the player passed its task with, else the reference.
      preview: (part, { progress }) => {
        if (!circuit.BUILT[part.part]) return null
        circuit.syncOwn(progress?.built)
        return { inside: { course: circuit, cards } }
      },
    },
    unlocked: (level) => built.filter((b) => level.unlocks.includes(b.key)).map((b) => ({ part: b.part, label: b.name, icon: b.icon })),
  })
  game.circuit = circuit
  return game
}

export function definedGame(content, circuit, { ops, ...own }) {
  const cards = { ...own.cards, ...Object.fromEntries(Object.entries(circuit.defs).map(([type, d]) => [type, { name: d.name, desc: d.desc, icon: iconOf(d.icon) }])) }
  const screen = { canvas: { height: 96 }, ...own.screen }
  return Object.assign(circuitGame(content, circuit, { ...own, screen, cards }), { defined: { of: (type) => circuit.defs[type] ?? null, defaults: circuit.defaultsOf, ops } })
}
