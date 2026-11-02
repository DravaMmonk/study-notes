// A game's course on the net domain, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says
// what may be in it): the play order and level tree from its eras (../../course.js layout); each level's tasks
// (../../engine/tasks.js), each read with its tests — what arrives on each wire in (wire.js: the sender's segments,
// the wire's delay, the flips), the inputs, the queue — and what its outputs and wires out must be (wants.js), its
// hidden tests likewise, its reference board and naive board; the parts the levels build (each running the board the
// player passed its level's last task with: a packed part that keeps its own registers, its ports that task's wires,
// inputs and outputs), and the course the shared audit checks.
//
// A test runs for `ticks` ticks, by default until two ticks after the last thing it gives arrives.
// Returns { LEVELS, played, CHAPTERS, course, partOf, BUILT, offerIn(level, flags), syncOwn(built), blueprints, wrong }:
// LEVELS, the levels as content writes them with their place in the course; played: level id → its tasks read, each
// the level with the task's fields (and `task`, its index); `wrong`, what reading the content found that its schema
// cannot say (a board that does not read, an output with nothing wanted).
import { packed } from '../../engine/boards.js'
import { defineCourse, eraLevels, layout, offer } from '../../course.js'
import { taskLevels } from '../../engine/tasks.js'
import { arrived, said } from './wire.js'
import { carriedOnto, fits, fromText, portsIn, portsOut, startBoard, toText } from './board.js'
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

/** A test as content writes it, run out: what arrives on each wire in, tick by tick, and how many ticks it runs. */
function testOf(level, t) {
  const sent = Object.fromEntries((level.wires?.in ?? []).map((w) => [w.name, said(t.wires?.[w.name]?.send ?? [])]))
  const delay = (name) => level.wires.in.find((w) => w.name === name).delay ?? 0
  const longest = Math.max(0, ...Object.entries(sent).map(([name, bits]) => bits.length + delay(name)), ...Object.values(t.inputs ?? {}).map((v) => v.length))
  const ticks = t.ticks ?? longest + 2
  const wires = Object.fromEntries(Object.entries(sent).map(([name, bits]) => [name, arrived(bits, { delay: delay(name), flips: t.wires?.[name]?.flips ?? [] }, ticks)]))
  return { ...t, ticks, wires, inputs: t.inputs ?? {}, queue: t.queue ?? [] }
}

export function netCourse(content) {
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
  // Each level's tasks, read: the level with the task's ports, tests, wants and boards (../../engine/tasks.js).
  const played = new Map()
  /** Task k of level `id` read; `where` names it in what reading it finds. */
  const readTask = (id, task, where) => {
    const names = portsOut(task).map((o) => o.name)
    const pulled = task.pulls ? [task.pulls.input, task.pulls.last].filter(Boolean) : []
    const all = [...portsIn(task).map((p) => p.name), ...names]
    for (const name of all) if (all.indexOf(name) !== all.lastIndexOf(name)) say(where, `two of its wires, inputs and outputs are called ${name}`)
    if (task.pulls) {
      for (const name of pulled) if (!(task.inputs ?? []).some((i) => i.name === name)) say(where, `it pulls into ${name}, which is no input`)
      if (!(task.outputs ?? []).some((o) => o.name === task.pulls.next)) say(where, `it asks for the next byte on ${task.pulls.next}, which is no output`)
    }
    if (!names.length) say(where, 'it has no wire out and no output: nothing is checked')
    for (const name of names) if (!task.want[name] && name !== task.pulls?.next) say(where, `nothing is wanted of ${name}`)
    for (const name of Object.keys(task.want)) if (!names.includes(name)) say(where, `wants ${name}, which is no output and no wire out`)
    for (const t of [...task.tests, ...(task.hidden ?? [])]) {
      for (const i of task.inputs ?? []) if (!pulled.includes(i.name) && !t.inputs?.[i.name]) say(where, `a test gives nothing on the input ${i.name}`)
      for (const name of Object.keys(t.wires ?? {})) if (!(task.wires?.in ?? []).some((w) => w.name === name)) say(where, `a test sends on ${name}, which is no wire in`)
      if (task.pulls && !t.queue) say(where, 'a test gives the board no queue to pull from')
    }
    const out = {
      ...task,
      id,
      era: eraOf.get(id).id,
      requires: plan.requires.get(id) ?? [],
      adds: task.adds ?? [],
      tests: task.tests.map((t) => testOf(task, t)),
      hidden: (task.hidden ?? []).map((t) => testOf(task, t)),
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
        inputs: portsIn(last).map((i) => i.name),
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
    replaces: (part) => builderOf.get(part)?.builds.replaces ?? [],
    abstraction: true,
  })
  return {
    LEVELS,
    played,
    // The task whose board a built part runs: the last of the level that builds it.
    builtBy: (type) => builderOf.has(type) ? played.get(builderOf.get(type).id).at(-1) : null,
    CHAPTERS,
    course,
    partOf,
    BUILT,
    wrong,
    blueprints,
    offerIn: (level, flags) => offer(course, { id: level.id }, new Set(flags)),
    // The levels a task carries on from: passing them keeps the board (progress.built).
    carried: new Set(LEVELS.flatMap((L) => played.get(L.id).map((T) => T.carry)).filter(Boolean)),
    // The board a task opens on (`task`, a task read): the board of the level it carries on from (the player's, else
    // its last task's reference), or its fixed cards alone.
    opening: (task, built = {}) => {
      if (!task.carry) return startBoard(task)
      const board = lastBoard(built[task.carry], played.get(task.carry)?.at(-1).taskId) ?? played.get(task.carry)?.at(-1).solution
      return board ? carriedOnto(task, board) : startBoard(task)
    },
    // The table's rule in this domain: a task that carries on from a board requires the level it comes from.
    audit: () => LEVELS.flatMap((L) => played.get(L.id).filter((T) => T.carry && !course.before(T.carry, L.id)).map((T) => ({ rule: 'carry-unseen', level: L.id, part: T.carry }))),
    syncOwn: (built = {}) => {
      OWN.clear()
      for (const [id, kept] of Object.entries(built)) {
        const board = lastBoard(kept, played.get(id)?.at(-1).taskId)
        if (board) OWN.set(id, board)
      }
    },
  }
}
