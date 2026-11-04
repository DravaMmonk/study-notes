// A vision game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read by its kind — a circuit with its tests (numbers and images), its reference board
// and naive board; a grid task with its image and what it asks; a choice task with its rounds and judge; a bench with
// its model made — the parts the levels build (each running the board the player passed its level's last task with,
// a packed part) and the course the shared audit checks.
//
// Returns { LEVELS, played, builtBy(type), CHAPTERS, course, partOf, BUILT, offerIn(level, flags), syncOwn(built),
// blueprints, wrong }: LEVELS, the levels as content writes them with their place in the course; played: level id →
// its tasks read, each the level with the task's fields (and `task`, its index); `wrong`, what reading the content
// found that its schema cannot say (a board that does not read, a pick outside the image, scenes that should look
// alike and do not).
import { packed, withSettings } from '../../engine/boards.js'
import { defineCourse, eraLevels, layout, offer } from '../../course.js'
import { taskLevels } from '../../engine/tasks.js'
import { fits, fromText, toText } from './board.js'
import { PARTS } from './parts.js'
import { introducedParts } from './tooling.js'
import { BORDERS } from './construction.js'
import { readTest } from './run.js'
import { configurationPolicy } from './configurations.js'
import { fromRows, isPoint } from './image.js'
import { askOf, gridCheck } from './grid.js'
import { windowResult } from './filter-window.js'
import { calculationResult } from './calculation.js'
import { judgeOf, optionsOf, verdictOf } from './judges.js'
import { revealing, sameImage } from './scene.js'
import { benchOf } from './benches/index.js'

/** A list's last item (no Array.prototype.at: older iOS Safari lacks it). */
const lastOf = (list) => list[list.length - 1]

/** The boards the player passed the building levels with, by level id (the shell's progress.built). */
const OWN = new Map()

export function visionCourse(content) {
  const { eras, primitives, levels, concept = {} } = content
  const wrong = []
  const say = (level, text) => wrong.push(`${level}: ${text}`)
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) say(l.id, 'the level is in no era')

  // Each built part runs the board its level was passed with (while it still fits the level), or the level's reference.
  const BUILT = {}
  const partOf = (type) => PARTS[type] ?? BUILT[type]
  // Every board the content writes as blueprint text, with how it reads back on its task (domain.js blueprints).
  const blueprints = []
  // Each level's tasks, read (../../engine/tasks.js).
  const played = new Map()

  const readCircuit = (id, task, out, where) => {
    const names = task.outputs.map((o) => o.name)
    const grouped = new Set()
    const sourceNames = new Set([...task.inputs, ...task.outputs].map((p) => p.name))
    for (const group of task.inputGroups ?? []) {
      if (sourceNames.has(group.name)) say(where, `duplicate input group name ${group.name}`)
      sourceNames.add(group.name)
      for (const name of group.inputs) {
        if (!task.inputs.some((input) => input.name === name) || grouped.has(name)) say(where, `invalid or repeated grouped input ${name}`)
        grouped.add(name)
      }
    }
    for (const t of [...task.tests, ...(task.hidden ?? [])]) {
      for (const o of names) if (!(o in t.expect)) say(where, `a test expects nothing of the output ${o}`)
      for (const i of task.inputs) if (!(i.name in t.inputs)) say(where, `a test gives nothing on the input ${i.name}`)
      for (const i of task.inputs) if ((i.type === 'point') !== isPoint(t.inputs[i.name])) say(where, `input ${i.name}: point values require a point input with numeric x and y`)
      for (const [k, v] of [...Object.entries(t.inputs), ...Object.entries(t.expect)]) if (Array.isArray(v) && !fromRows(v)) say(where, `${k}: its rows do not make an image (uneven rows, or not grey or RGB)`)
    }
    Object.assign(out, { tests: task.tests.map(readTest), hidden: (task.hidden ?? []).map(readTest) })
    const read = (lines, what, naive = false) => {
      try {
        const board = fromText(lines, out, partOf)
        blueprints.push({ level: id, task: task.task, key: task.taskId, board, write: (b) => toText(b, partOf), read: (text) => fromText(text, out, partOf), ...(naive ? { naive } : {}) })
        return board
      } catch (e) {
        say(where, `${what}: ${e.en ?? String(e)}`)
        return { nodes: [], wires: [] }
      }
    }
    out.solution = read(task.solution, 'the answer')
    if (task.starter) out.starter = read(task.starter, 'the starter')
    if (task.naive) out.naive = read(task.naive, 'the naive answer', true)
  }

  const readGrid = (task, out, where) => {
    const img = fromRows(task.image)
    if (!img) return say(where, 'its image rows do not make an image')
    const { name, params } = askOf(task)
    if (task.calculation) {
      try {
        if (name !== 'fill' || gridCheck(task, calculationResult(task))) say(where, 'the calculation aid does not produce the requested output')
      } catch (error) { say(where, `invalid calculation aid: ${error.message}`) }
    }
    if (task.window) {
      const span = task.window.axis === 'row' ? img.w : img.h
      if (name !== 'fill' || img.c !== 1 || task.window.weights.length !== 3 || (task.window.padding === 'valid' && span < 3)) say(where, 'a filter window needs a greyscale fill task, three weights and at least three samples for valid padding')
      else if (gridCheck(task, windowResult(task.image, task.window))) say(where, 'the displayed window weights do not produce the requested output')
    }
    if (['pick', 'locate', 'set'].includes(name) && (params.x >= img.w || params.y >= img.h)) say(where, `(${params.x}, ${params.y}) is outside the ${img.w} × ${img.h} image`)
    if (name === 'set' && (Array.isArray(params.value) ? img.c !== 3 || params.value.length !== 3 : img.c !== 1)) say(where, 'the value to set is not a pixel of this image (a number for grey, [R, G, B] for colour)')
    if (name === 'fill' && !fromRows(params.rows)) say(where, 'the rows to fill do not make a grid')
    out.img = img
  }

  const readChoice = (task, out, where) => {
    const { judge, name, params } = judgeOf(task.judge)
    out.rounds = task.rounds.map((round, r) => {
      const options = optionsOf(round, name)
      const at = `${where} round ${r + 1}`
      const problems = [
        !options.length && `the ${name} judge needs options`,
        new Set(options.map((o) => o.id)).size !== options.length && 'two options share an id',
        name === 'claims' && !round.scenes?.length && 'a claims round needs its candidate scenes',
        name === 'claims' && round.items.some((it) => !it.claim) && 'every item of a claims round is a claim',
        name === 'same' && (!round.reference || options.some((o) => !o.scene)) && 'the same judge needs a reference scene and a scene on every option',
        name === 'fields' && round.items.some((it) => !it.needs) && 'every item of a fields round says what it needs',
        round.scenes?.slice(1).some((sc) => !sameImage(round.scenes[0], sc)) && 'its candidate scenes do not all give the same picture',
      ].filter(Boolean)
      // A claim true in one candidate scene and false in another is shown, when answered wrong, from a view that tells
      // the two apart: one there must be.
      const reveals = name === 'claims' && !problems.length ? round.items.map((it, k) => {
        const { verdict, truths } = verdictOf(it.claim, round.scenes)
        if (verdict !== 'undetermined') return null
        const scenes = [truths.indexOf(true), truths.indexOf(false)]
        const camera = revealing(round.scenes[scenes[0]], round.scenes[scenes[1]])
        if (!camera) problems.push(`item ${k + 1}: scenes ${scenes[0] + 1} and ${scenes[1] + 1} look alike from every view, so the player cannot be shown why it is undetermined`)
        return camera && { scenes, camera }
      }) : null
      for (const p of problems) say(at, p)
      const read = { ...round, options, ...(reveals ? { reveals } : {}) }
      if (!problems.length && !judge.multi && judge.reference(read, params).some((picks) => picks.length > 1)) say(at, `the ${name} judge takes one option an item, and an item has several right ones`)
      return read
    })
  }

  const readTask = (id, task, where) => {
    const out = { ...task, id, era: eraOf.get(id).id, requires: plan.requires.get(id) ?? [], adds: task.adds ?? [] }
    if (task.kind === 'circuit') readCircuit(id, task, out, where)
    else if (task.kind === 'grid') readGrid(task, out, where)
    else if (task.kind === 'choice') readChoice(task, out, where)
    else if (task.kind === 'bench') {
      try {
        out.made = benchOf(task.bench)
      } catch (e) {
        say(where, `its bench: ${e.message}`)
      }
    }
    return out
  }

  const LEVELS = plan.order.filter((id) => {
    if (!given.has(id)) say(id, 'an era names a level that does not exist')
    return given.has(id)
  }).map((id) => {
    const level = given.get(id)
    const tasks = taskLevels(level).map((task, k) => ({ ...task, adds: [...new Set([...(level.adds ?? []), ...level.tasks.slice(0,k+1).flatMap((t) => t.adds ?? [])])], fresh: [...(k === 0 ? level.adds ?? [] : []), ...(level.tasks[k].adds ?? [])] }))
    const read = tasks.map((task) => readTask(id, task, tasks.length > 1 ? `${id} task ${task.taskId}` : id))
    played.set(id, read)
    // The part a level builds runs its last task's board: the player's, while it fits, else the reference.
    const last = read[read.length - 1]
    if (level.builds && last.kind !== 'circuit') say(id, 'it builds a part, and its last task is no circuit')
    else if (level.builds) {
      const fitting = new WeakMap()
      const own = () => {
        const b = OWN.get(id)
        if (!b) return last.solution
        if (!fitting.has(b)) fitting.set(b, fits(b, last, partOf))
        return fitting.get(b) ? b : last.solution
      }
      BUILT[level.builds.type] = packed({
        circuit: own,
        inputs: last.inputs.map((i) => i.name),
        outputs: last.outputs.map((o) => o.name),
        built: level.builds,
        params: level.builds.settings ?? [],
        settings: Object.fromEntries((level.builds.settings ?? []).map((key) => [key, key === 'axis' ? ['x', 'y'] : BORDERS])),
        // What the part runs, opened on a board: the player's board (or the reference) and the task that builds it.
        opens: (params = {}) => ({ circuit: withSettings(own(), params, partOf), level: last }),
      })
    }
    return { ...level, id, era: eraOf.get(id).id, requires: plan.requires.get(id) ?? [], adds: introducedParts(level) }
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  const byId = new Map(LEVELS.map((L) => [L.id, L]))
  const builderOf = new Map(LEVELS.filter((L) => L.builds).map((L) => [L.builds.type, L]))
  const solutions = (id, task) => played.get(id).filter((T) => T.kind === 'circuit' && (task === undefined || T.task === task)).map((T) => T.solution)
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: L.builds ? [L.builds.type] : [] })),
    eras,
    primitives,
    adds: (level) => level.task === undefined ? byId.get(level.id)?.adds ?? [] : played.get(level.id)?.[level.task]?.adds ?? [],
    needs: (part) => (builderOf.has(part) ? part : null),
    builds: (level) => (byId.get(level.id)?.builds ? [byId.get(level.id).builds.type] : []),
    concept: (part) => concept[part] ?? part,
    naive: (level) => played.get(level.id)?.some((T) => T.naive) ?? false,
    needed: (level) => [...new Set(solutions(level.id, level.task).flatMap((b) => b.nodes).map((n) => n.type).filter((t) => !PARTS[t] || primitives.includes(t)))],
    boards: (level) => solutions(level.id, level.task),
    showcase: (level) => byId.get(level.id)?.showcase ?? null,
    abstraction: true,
  })
  return {
    LEVELS,
    played,
    // The task whose board a built part runs: the last of the level that builds it.
    builtBy: (type) => (builderOf.has(type) ? lastOf(played.get(builderOf.get(type).id)) : null),
    CHAPTERS,
    course,
    partOf,
    BUILT,
    blueprints,
    wrong,
    settingsIn: configurationPolicy(LEVELS, course, partOf),
    introductions: (type, id) => (byId.get(id)?.tasks ?? []).flatMap((t, k) => (t.adds ?? []).includes(type) || k === 0 && (given.get(id)?.adds ?? []).includes(type) ? [t.id] : []),
    offerIn: (level, flags) => offer(course, level, new Set(flags)),
    syncOwn: (built = {}) => {
      OWN.clear()
      // The shell keeps boards by task (../../shell/progress.js): a level's part runs its last task's.
      for (const L of LEVELS) {
        const board = built[lastOf(played.get(L.id)).taskId]
        if (board?.nodes) OWN.set(L.id, board)
      }
    },
  }
}
