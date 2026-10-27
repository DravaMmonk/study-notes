// A course of agent levels, from a game's spec (《软件工厂》): the play order and level tree from its eras
// (../../course.js layout), each level with its machine, its fixed cards and its tests read from the world, and the
// course the shared audit checks.
//
// agentCourse({ eras, machines, repos, issues, levels })
//   eras      [{ id, machine, title, question?, keeps?, foundation, practice?, topics?, challenges? }]
//   machines  { id: { mode: 'hand' | 'once' | 'loop', window, turns? } }   what a level is played on
//   repos     { name: { files: { path: { tokens, segs } } } }              (world.js)
//   issues    { id: { repo, title, text, tokens?, pasted?, symptom?, edits } }
//   levels    in any order:
//     hand    { id, kind: 'hand', title, brief, hint?, intro?, after, note?, mode?, window?, test: { issue },
//               solution: [op] }   (a hand level may set the model's mode: one call at a time, or asking back)
//     board   { id, kind: 'board', title, brief, hint?, intro?, after, note?, window?, turns?, adds?: [part],
//               tests: [{ issue, code? }], hidden?, solution, naive?, budget?: { tokens?, turns? } }
//             A board level's fixed cards follow from its machine: the issue and the repository in one call (and the
//             code card when its tests bring code); the issue, the history, the repository, the output and stop in a
//             loop. A level names only the primitives it brings in (`adds`); everything met before carries.
// Returns { LEVELS, CHAPTERS, course, offerIn(level, flags), filesIn(level) }.
import { defineCourse, eraLevels, layout, offer } from '../../course.js'
import { PRIMITIVES } from './parts.js'
import { filesOf } from './world.js'

const fixedOf = (mode, tests) => (mode === 'loop' ? ['issue', 'history', 'repo', 'out', 'stop'] : ['issue', ...(tests.some((t) => t.code) ? ['code'] : []), 'repo'])

export function agentCourse({ eras, machines, repos, issues, levels }) {
  const plan = layout(eras)
  const given = new Map(levels.map((l) => [l.id, l]))
  const eraOf = new Map(eras.flatMap((era) => eraLevels(era).map((id) => [id, era])))
  for (const l of levels) if (!eraOf.has(l.id)) throw new Error(`level ${l.id} is in no era`)
  // A test as the machine runs it: the repository and issue themselves.
  const resolve = (t) => {
    const issue = issues[t.issue]
    if (!issue) throw new Error(`no issue ${t.issue}`)
    return { ...t, issue: { id: t.issue, ...issue }, repo: repos[issue.repo] }
  }
  const LEVELS = plan.order.map((id) => {
    const level = given.get(id)
    if (!level) throw new Error(`an era names a level that does not exist: ${id}`)
    const era = eraOf.get(id)
    const machine = { ...machines[era.machine], ...Object.fromEntries(['mode', 'window', 'turns'].filter((k) => level[k]).map((k) => [k, level[k]])) }
    const out = { ...level, era: era.id, machineId: era.machine, machine, requires: plan.requires.get(id) ?? [], adds: level.adds ?? [] }
    if (level.kind === 'hand') return { ...out, test: resolve(level.test) }
    const tests = level.tests.map(resolve)
    return { ...out, tests, hidden: (level.hidden ?? []).map(resolve), fixed: fixedOf(machine.mode, tests) }
  })
  const CHAPTERS = eras.map((era) => ({ id: era.id, title: era.title, question: era.question, track: plan.tracks.get(era.id) }))
  const byId = new Map(LEVELS.map((L) => [L.id, L]))
  const course = defineCourse({
    levels: LEVELS.map((L) => ({ id: L.id, unlocks: [] })),
    eras,
    primitives: PRIMITIVES,
    adds: (level) => byId.get(level.id)?.adds ?? [],
    needs: () => null,
    builds: () => [],
    machine: (level) => eraOf.get(level.id)?.machine ?? null,
    needed: (level) => {
      const L = byId.get(level.id)
      return L?.solution?.nodes ? [...new Set(L.solution.nodes.map((n) => n.type).filter((t) => PRIMITIVES.includes(t)))] : null
    },
  })
  return {
    LEVELS,
    CHAPTERS,
    course,
    offerIn: (level, flags) => offer(course, { id: level.id }, new Set(flags)),
    filesIn: (level) => filesOf([...(level.tests ?? [level.test]), ...(level.hidden ?? [])].map((t) => t.repo)),
  }
}
