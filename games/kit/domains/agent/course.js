// An agent game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and level tree from its eras (../../course.js layout), each level's tasks with their machine,
// their fixed cards, their tests read from the world and their reference answers, and the course the shared audit
// checks.
//
// A task's machine is its era's (game.json machines: its window, and the turns of a loop), the task's own window and
// turns over it; the model asks back in a loop and writes all it knows at once in one call, and in a hand session as
// the task's `mode` says. A board task's fixed cards follow from its machine (board.js fixedOf). A level names only
// the primitives it brings in (`adds`); everything met before carries.
//
// Returns { LEVELS, played, CHAPTERS, course, offerIn(task, flags), filesIn(task), blueprints, wrong }: LEVELS, the
// levels as content writes them with their place in the course; played, level id → its tasks as read (each the level
// with the task over it, ../../engine/tasks.js taskLevels); `wrong`, what reading the content found that its schema
// cannot say (an issue or a repository that is not there, a board that does not read). Nothing read is written back
// into the content.
import { defineCourse, eraLevels, layout, offer } from '../../course.js'
import { taskLevels } from '../../engine/tasks.js'
import { fixedOf, fromText, toText } from './board.js'
import { opOf } from './hand.js'
import { filesOf } from './world.js'

export function agentCourse(content) {
  const { eras, machines, repos, issues, primitives, levels } = content
  const wrong = []
  const say = (where, text) => wrong.push(`${where}: ${text}`)
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) say(l.id, 'the level is in no era')
  for (const [id, issue] of Object.entries(issues)) if (!repos[issue.repo]) say(id, `the issue is on ${issue.repo}, which is no repository`)
  // Every board the content writes as blueprint text, with how it reads back on its task (domain.js blueprints).
  const blueprints = []

  const readTask = (id, task, where) => {
    const era = eraOf.get(id)
    // A test as the machine runs it: the repository and issue themselves.
    const resolve = (t) => {
      const issue = issues[t.issue]
      if (!issue) say(where, `no issue ${t.issue}`)
      return { ...t, issue: { id: t.issue, ...issue }, repo: repos[issue?.repo] ?? { files: {} } }
    }
    if ((task.kind === 'hand') !== (era.machine === 'hand')) say(where, `a ${task.kind} task on the machine ${era.machine}`)
    const own = machines[era.machine] ?? {}
    const machine = {
      mode: era.machine === 'hand' ? task.mode : era.machine,
      window: task.window ?? own.window,
      ...(era.machine === 'loop' ? { turns: task.turns ?? own.turns } : {}),
    }
    const out = { ...task, era: era.id, machineId: era.machine, machine, requires: plan.requires.get(id) ?? [], adds: task.adds ?? [] }
    if (task.kind === 'hand') return { ...out, test: resolve(task.test), solution: task.solution.map(opOf) }
    const tests = task.tests.map(resolve)
    const T = { ...out, tests, hidden: (task.hidden ?? []).map(resolve), fixed: fixedOf(machine.mode, tests) }
    const boardOf = (text, naive = false) => {
      try {
        const b = fromText(text, T)
        blueprints.push({ level: id, task: task.task, key: task.taskId, board: b, write: toText, read: (lines) => fromText(lines, T), ...(naive ? { naive } : {}) })
        return b
      } catch (e) {
        say(where, e.en ?? String(e))
        return { nodes: [], wires: [] }
      }
    }
    return { ...T, solution: boardOf(task.solution), ...(task.naive ? { naive: boardOf(task.naive, true) } : {}) }
  }

  const played = new Map()
  const LEVELS = plan.order.filter((id) => {
    if (!given.has(id)) say(id, 'an era names a level that does not exist')
    return given.has(id)
  }).map((id) => {
    const level = given.get(id)
    const tasks = taskLevels(level)
    played.set(id, tasks.map((task) => readTask(id, task, tasks.length > 1 ? `${id} task ${task.taskId}` : id)))
    return { ...level, era: eraOf.get(id).id, requires: plan.requires.get(id) ?? [], adds: level.adds ?? [] }
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  const byId = new Map(LEVELS.map((L) => [L.id, L]))
  // The reference boards of a level's board tasks.
  const solutions = (id) => (played.get(id) ?? []).filter((T) => T.kind === 'board').map((T) => T.solution)
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: [] })),
    eras,
    primitives,
    adds: (level) => byId.get(level.id)?.adds ?? [],
    needs: () => null,
    builds: () => [],
    machine: (level) => eraOf.get(level.id)?.machine ?? null,
    needed: (level) => (played.get(level.id)?.some((T) => T.kind === 'board') ? [...new Set(solutions(level.id).flatMap((b) => b.nodes).map((n) => n.type).filter((t) => primitives.includes(t)))] : null),
    boards: (level) => solutions(level.id),
    showcase: (level) => byId.get(level.id)?.showcase ?? null,
    abstraction: true,
  })
  return {
    LEVELS,
    played,
    CHAPTERS,
    course,
    wrong,
    blueprints,
    offerIn: (task, flags) => offer(course, { id: task.id }, new Set(flags)),
    filesIn: (task) => filesOf([...(task.tests ?? [task.test]), ...(task.hidden ?? [])].map((t) => t.repo)),
  }
}
