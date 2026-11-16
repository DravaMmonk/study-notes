import { loadDisplays } from '../../engine/displays.js'
// A table game on the shared shell (../../shell), from its content (games/DESIGN.md 6.3): the course (course.js)
// becomes the shell's game description, with the table domain's screen (every level played through its mode), its
// parts box by robot, and its intro pictures.
import { Cable, Grid3x3 } from 'lucide-react'
import { defineGame } from '../../shell/index.js'
import { taskOpen } from '../../shell/progress.js'
import { eraLevels, introductions, isCore } from '../../course.js'
import { plays } from './plays.js'
import { playKinds } from '../../shell/plays/Play.jsx'
import { robotCircuits } from './ui/circuitCourse.js'
import { PRIMITIVES, modelsOf } from './model/parts.js'
import { ROBOTS } from './model/robots.js'
import { T } from './lang.js'
import { tableCourse } from './course.js'

const ui = await loadDisplays(['table:hero', 'table:introduction', 'table:circuit', 'table:manual', 'table:catalog'])
const { pieceDemo, lookIcon } = ui['table:catalog']

const briefOf = ({ mission, hints }) => ({ text: [mission.goal, mission.how], hint: hints })
const hand = Object.fromEntries(Object.entries(ui['table:manual']).map(([name, useBoard]) => [name, { useBoard, briefOf }]))
const icons = Object.fromEntries(Object.entries(plays).map(([name, play]) => [name, { icon: play.editor === 'circuit' ? Cable : Grid3x3 }]))

/** A task's `done` as the shell's pass text of a task: its head in bold, then its paragraphs. */
const doneText = ({ head, body = [] }) => [...(head ? [T(`<b>${head.zh ?? head.en}</b>`, `<b>${head.en ?? head.zh}</b>`)] : []), ...body]

/**
 * content (../../engine/content.js): { id, title, kicker, lede, eras, primitives, partDefs (pieces.json: the parts and
 * ideas its levels unlock), borrow?: { part: level id }
 * the level whose board a part that is an idea is tried on, levels, glossary }.
 */
export default function tableGame(content) {
  const table = tableCourse(content)
  const { LEVELS, REQUIRES, TRACKS, ROWS, CHAPTERS, LABELS, PARTS, course, played } = table
  const ERAS = content.eras
  const borrow = content.borrow ?? {}
  // Every level's last task: the one whose board a part it builds runs, shown on the part's bench.
  const lastTasks = LEVELS.map((L) => played.get(L.id).at(-1))
  const levels = LEVELS.map((L, index) => ({
    id: L.id,
    index,
    chapter: L.ch,
    // The chapter route supplies direct prerequisites.
    requires: REQUIRES.get(L.id) ?? [],
    title: L.title,
    kind: played.get(L.id)[0].mode,
    unlocks: L.unlock ? [L.unlock] : [],
    intro: L.intro,
    afterTitle: L.debrief.title,
    after: L.debrief.body,
    note: L.debrief.note,
    // A level is its tasks (../../engine/tasks.js), each played by its mode's screen on the task as the course read it
    // (`source`); what passing a task says before the next (`done`) is its `after`.
    tasks: played.get(L.id).map((s) => ({ key: s.taskId, kind: s.mode, ...(s.done ? { after: doneText(s.done) } : {}), ...(s.carries ? { carries: true } : {}), source: s })),
  }))

  // The primitives in the components box, one card each (a merger's models are one card), from the level that brings
  // the card in. A card named like another says which one it is.
  const cardOf = (k) => modelsOf(k)?.[0] ?? k
  const cards = [...introductions(course, cardOf)]
  const nameOf = (k) => {
    const c = PRIMITIVES[k]
    const twin = !modelsOf(k) && cards.some(([o]) => o !== k && String(PRIMITIVES[o].name) === String(c.name))
    return twin ? T(`${c.name.zh} · ${c.tag.zh}`, `${c.name.en} · ${c.tag.en}`) : c.name
  }
  const descOf = (k) => (modelsOf(k) ? T('用所选模式把几个输入合并成一个值。', 'Combines the inputs into one value using the selected mode.') : PRIMITIVES[k].desc)
  const primitives = cards.map(([k, at]) => ({ key: `part:${k}`, piece: k, name: nameOf(k), desc: descOf(k), icon: lookIcon(k), at }))

  // The components box by robot: a robot can use every part earned in its era and the eras before it (parts carry over,
  // games/DESIGN.md 2.1). It joins the box once the first level of its era is passed.
  const eraOf = new Map(ERAS.flatMap((era, e) => eraLevels(era).map((id) => [id, e])))
  const robotFilters = (progress) => ERAS.flatMap((era, e) => {
    if (!era.machine) return []
    const first = era.levels[0]?.id
    const keys = new Set([...LEVELS.filter((L) => L.unlock && eraOf.get(L.id) <= e).map((L) => L.unlock), ...primitives.filter((p) => p.at.some((id) => eraOf.get(id) <= e)).map((p) => p.key)])
    const robot = ROBOTS[era.machine]
    return [{ key: era.machine, name: robot.name, icon: robot.look, keys, lock: progress.all || progress.solved.includes(first) ? null : LABELS.get(first) }]
  })

  const game = defineGame({
    id: content.id,
    course,
    glossary: content.glossary,
    title: content.title,
    kicker: content.kicker,
    lede: content.lede,
    Hero: ui['table:hero'],
    chapters: CHAPTERS.map((chapter, id) => ({ id, kicker: chapter.kicker, title: chapter.name, question: chapter.desc, track: TRACKS.get(chapter.era), rows: ROWS.get(chapter.era) })),
    levels,
    // Numbered as in CURRICULUM.md: 1-4 on an era's main path, S2 in a topic, C1 for a challenge.
    levelLabel: (level) => LABELS.get(level.id) ?? String(level.index + 1),
    intro: (level) => level.intro,
    IntroFigure: ui['table:introduction'],
    kinds: playKinds(plays, { ...hand, robot: ui['table:circuit'](table) }, icons),
    unlocked: (level) => level.unlocks.map((k) => ({ piece: k, label: PARTS[k].name })),
    core: (level) => isCore(course, level),
    parts: {
      // The primitives, and the parts a level that is played unlocks (a retired level's card would never be earned).
      all: [...primitives, ...Object.entries(PARTS).filter(([key]) => LEVELS.some((L) => L.unlock === key)).map(([key, part]) => ({ key, piece: key, name: part.name, desc: part.desc, icon: lookIcon(key) }))],
      // The part on a bench: its level's board (a primitive's, the level that brings it in), with inputs, constants and
      // models to change and a Run button. A built part runs, and opens to show, the board the player passed its level with.
      preview: (part, { progress }) => {
        table.syncOwn(progress.built)
        const key = part.key.replace(/^part:/, '')
        const spec = pieceDemo(table.model, game.circuit, lastTasks, part.at ? { [key]: part.at[0] } : borrow, key)
        return { experiment: spec }
      },
      filters: robotFilters,
      settings: (part, progress, scope) => {
        const solved = new Set(progress.solved)
        return table.settingsIn(part.piece ?? part.key.replace(/^part:/, ''), {
          scope,
          flags: new Set(game.flagsOf(progress)),
          open: (task) => game.isOpen(game.byId[task.id], solved, progress.all) && taskOpen(game, progress, task.id, task.task),
        })
      },
    },
  })
  game.table = table
  game.circuit = robotCircuits(table)
  return game
}
