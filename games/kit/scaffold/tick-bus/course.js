// A __name__ game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests on the line its world says and what its outputs must be
// (wants.js), its hidden tests likewise, its reference board and naive board; the parts the levels build (each running
// the board the player passed its level's last task with: a packed part that keeps its own registers), and the course
// the shared audit checks.
//
// A task's tests run as long as their line; its inputs give one value a tick.
// Returns { LEVELS, played, builtBy(type), CHAPTERS, course, partOf, BUILT, offerIn(level, flags), syncOwn(built),
// blueprints, wrong }: LEVELS, the levels as content writes them with their place in the course; played: level id →
// its tasks read, each the level with the task's fields (and `task`, its index); `wrong`, what reading the content
// found that its schema cannot say (a board that does not read, an output with nothing wanted).
import { packed } from '../../engine/boards.js'
import { defineCourse, eraLevels, layout, offer } from '../../course.js'
import { taskLevels } from '../../engine/tasks.js'
import { bitsOf } from './line.js'
import { fits, fromText, portsOut, toText } from './board.js'
import { PARTS } from './parts.js'
import { wantOf } from './wants.js'

/** The boards the player passed the building levels with, by level id (the shell's progress.built). */
const OWN = new Map()

/** The board a level keeps for its part (a level of tasks keeps one by task id, ../../shell/progress.js): its last
 *  task's (`last`, that task's id). */
const lastBoard = (kept, last) => {
  const board = kept?.nodes ? kept : kept?.[last]
  return board?.nodes ? board : null
}

/** A test as content writes it, its line read into values. */
const testOf = (t) => ({ ...t, line: bitsOf(t.line) })

export function __name__Course(content) {
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
  /** A task read; `where` names it in what reading it finds. */
  const readTask = (id, task, where) => {
    const names = portsOut(task).map((o) => o.name)
    if (!names.length) say(where, 'it neither talks nor has an output: nothing is checked')
    for (const name of names) if (!task.want[name]) say(where, `nothing is wanted of ${name}`)
    for (const name of Object.keys(task.want)) if (!names.includes(name)) say(where, `wants ${name}, which is no output`)
    for (const t of [...task.tests, ...(task.hidden ?? [])]) {
      for (const i of task.inputs ?? []) if (!t.inputs?.[i.name]) say(where, `a test gives nothing on the input ${i.name}`)
    }
    const out = {
      ...task,
      id,
      era: eraOf.get(id).id,
      requires: plan.requires.get(id) ?? [],
      adds: task.adds ?? [],
      tests: task.tests.map(testOf),
      hidden: (task.hidden ?? []).map(testOf),
      want: wantOf(task.want),
    }
    const read = (lines, what, naive = false) => {
      try {
        const board = fromText(lines, out, partOf)
        blueprints.push({ level: id, task: task.task, board, write: (b) => toText(b, partOf), read: (text) => fromText(text, out, partOf), ...(naive ? { naive } : {}) })
        return board
      } catch (e) {
        say(where, `${what}: ${e.en ?? String(e)}`)
        return { nodes: [], wires: [] }
      }
    }
    out.solution = read(task.solution, 'the answer')
    if (task.naive) out.naive = read(task.naive, 'the naive answer', true)
    return out
  }
  const LEVELS = plan.order.filter((id) => {
    if (!given.has(id)) say(id, 'an era names a level that does not exist')
    return given.has(id)
  }).map((id) => {
    const level = given.get(id)
    const tasks = taskLevels(level)
    const read = tasks.map((task) => readTask(id, task, tasks.length > 1 ? `${id} task ${task.taskId}` : id))
    played.set(id, read)
    // The part a level builds runs its last task's board: the player's, while it fits, else the reference.
    const last = read.at(-1)
    if (level.builds) {
      const fitting = new WeakMap()
      const own = () => {
        const b = OWN.get(id)
        if (!b) return last.solution
        if (!fitting.has(b)) fitting.set(b, fits(b, last, partOf))
        return fitting.get(b) ? b : last.solution
      }
      BUILT[level.builds.type] = packed({
        circuit: own,
        inputs: (last.inputs ?? []).map((i) => i.name),
        outputs: portsOut(last).map((o) => o.name),
        holds: true,
        built: level.builds,
        // What the part runs, opened on a board: the player's board (or the reference) and the task that builds it.
        opens: () => ({ circuit: own(), level: last }),
      })
    }
    return { ...level, id, era: eraOf.get(id).id, requires: plan.requires.get(id) ?? [], adds: level.adds ?? [] }
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  const byId = new Map(LEVELS.map((L) => [L.id, L]))
  const builderOf = new Map(LEVELS.filter((L) => L.builds).map((L) => [L.builds.type, L]))
  const solutions = (id) => played.get(id).map((T) => T.solution)
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: L.builds ? [L.builds.type] : [] })),
    eras,
    primitives,
    adds: (level) => byId.get(level.id)?.adds ?? [],
    needs: (part) => (builderOf.has(part) ? part : null),
    builds: (level) => (byId.get(level.id)?.builds ? [byId.get(level.id).builds.type] : []),
    concept: (part) => concept[part] ?? part,
    naive: (level) => played.get(level.id)?.some((T) => T.naive) ?? false,
    needed: (level) => [...new Set(solutions(level.id).flatMap((b) => b.nodes).map((n) => n.type).filter((t) => !PARTS[t] || primitives.includes(t)))],
    boards: (level) => solutions(level.id),
    showcase: (level) => byId.get(level.id)?.showcase ?? null,
    abstraction: true,
  })
  return {
    LEVELS,
    played,
    // The task whose board a built part runs: the last of the level that builds it.
    builtBy: (type) => (builderOf.has(type) ? played.get(builderOf.get(type).id).at(-1) : null),
    CHAPTERS,
    course,
    partOf,
    BUILT,
    wrong,
    blueprints,
    offerIn: (level, flags) => offer(course, { id: level.id }, new Set(flags)),
    syncOwn: (built = {}) => {
      OWN.clear()
      for (const [id, kept] of Object.entries(built)) {
        const board = lastBoard(kept, played.get(id)?.at(-1).taskId)
        if (board) OWN.set(id, board)
      }
    },
  }
}
