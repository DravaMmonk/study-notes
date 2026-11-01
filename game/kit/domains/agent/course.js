// An agent game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and level tree from its eras (../../course.js layout), each level with its machine, its fixed
// cards, its tests read from the world and its reference answers, and the course the shared audit checks.
//
// A level's machine is its era's (game.json machines: its window, and the turns of a loop), the level's own window and
// turns over it; the model asks back in a loop and writes all it knows at once in one call, and in a hand session as
// the level's `mode` says. A board level's fixed cards follow from its machine (board.js fixedOf). A level names only
// the primitives it brings in (`adds`); everything met before carries.
//
// Returns { LEVELS, CHAPTERS, course, offerIn(level, flags), filesIn(level), blueprints, wrong }: `wrong`, what reading the content
// found that its schema cannot say (an issue or a repository that is not there, a board that does not read).
import { defineCourse, eraLevels, layout, offer } from '../../course.js'
import { fixedOf, fromText, toText } from './board.js'
import { opOf } from './hand.js'
import { filesOf } from './world.js'

export function agentCourse(content) {
  const { eras, machines, repos, issues, primitives, levels } = content
  const wrong = []
  const say = (level, text) => wrong.push(`${level}: ${text}`)
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) say(l.id, 'the level is in no era')
  for (const [id, issue] of Object.entries(issues)) if (!repos[issue.repo]) say(id, `the issue is on ${issue.repo}, which is no repository`)
  // A test as the machine runs it: the repository and issue themselves.
  const resolve = (id) => (t) => {
    const issue = issues[t.issue]
    if (!issue) say(id, `no issue ${t.issue}`)
    return { ...t, issue: { id: t.issue, ...issue }, repo: repos[issue?.repo] ?? { files: {} } }
  }
  // Every board the content writes as blueprint text, with how it reads back on its level (domain.js blueprints).
  const blueprints = []
  const board = (L, text, naive = false) => {
    try {
      const b = fromText(text, L)
      blueprints.push({ level: L.id, board: b, write: toText, read: (lines) => fromText(lines, L), ...(naive ? { naive } : {}) })
      return b
    } catch (e) {
      say(L.id, e.en ?? String(e))
      return { nodes: [], wires: [] }
    }
  }
  const LEVELS = plan.order.filter((id) => {
    if (!given.has(id)) say(id, 'an era names a level that does not exist')
    return given.has(id)
  }).map((id) => {
    const level = given.get(id)
    const era = eraOf.get(id)
    if ((level.kind === 'hand') !== (era.machine === 'hand')) say(id, `a ${level.kind} level on the machine ${era.machine}`)
    const own = machines[era.machine] ?? {}
    const machine = {
      mode: era.machine === 'hand' ? level.mode : era.machine,
      window: level.window ?? own.window,
      ...(era.machine === 'loop' ? { turns: level.turns ?? own.turns } : {}),
    }
    const out = { ...level, era: era.id, machineId: era.machine, machine, requires: plan.requires.get(id) ?? [], adds: level.adds ?? [] }
    if (level.kind === 'hand') return { ...out, test: resolve(id)(level.test), solution: level.solution.map(opOf) }
    const tests = level.tests.map(resolve(id))
    const L = { ...out, tests, hidden: (level.hidden ?? []).map(resolve(id)), fixed: fixedOf(machine.mode, tests) }
    L.solution = board(L, level.solution)
    if (level.naive) L.naive = board(L, level.naive, true)
    return L
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  const byId = new Map(LEVELS.map((L) => [L.id, L]))
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: [] })),
    eras,
    primitives,
    adds: (level) => byId.get(level.id)?.adds ?? [],
    needs: () => null,
    builds: () => [],
    machine: (level) => eraOf.get(level.id)?.machine ?? null,
    needed: (level) => {
      const L = byId.get(level.id)
      return L?.kind === 'board' ? [...new Set(L.solution.nodes.map((n) => n.type).filter((t) => primitives.includes(t)))] : null
    },
    boards: (level) => (byId.get(level.id)?.kind === 'board' ? [byId.get(level.id).solution] : []),
    showcase: (level) => byId.get(level.id)?.showcase ?? null,
    abstraction: true,
  })
  return {
    LEVELS,
    CHAPTERS,
    course,
    wrong,
    blueprints,
    offerIn: (level, flags) => offer(course, { id: level.id }, new Set(flags)),
    filesIn: (level) => filesOf([...(level.tests ?? [level.test]), ...(level.hidden ?? [])].map((t) => t.repo)),
  }
}
