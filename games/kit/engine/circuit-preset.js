// The circuit preset (games/DESIGN.md 6.3, games/DIRECTION.md decision 24): a way to play made of the kernel's
// pieces — the board of fixed cards (./board-cards.js), the course read with its built parts (./board-course.js), the
// level's schema (./level-schema.js) and the author checks below over the judge (./authoring.js, ./judge.js). A domain
// on it gives its vocabulary, its course and how a task runs, and gets its domain module:
//
//   circuitDomain(domain, { vocabulary, course, run, entries, failure?, more?, kinds?, …extensions }) → domain.js's
//     { vocabulary, names, spec, validate, …extensions }
//       course(content) → the course read (circuitCourse / definedCourse); the rest as checkCircuitTasks takes them
//   circuitNames(content), circuitSpec(domain, courseOf)   a game's part names and its spec, the course read as `circuit`
//     (validate({ circuit }), the screen's game.circuit: ../shell/circuit-game.js)
//   checkCircuitTasks(circuit, { run, entries, failure?, more?, kinds?, memo? }) → the domain's lines for npm run check
//       run(task, board) → { runs: [{ fail?, error? }], pass }; entries({ task, test, run, sample }) what the results
//       area can show of a test (../shell/CircuitScreen.jsx); failure(run) the words for a run that fails;
//       kinds { kind: check(task) → { problems, ok } } the domain's checks of a task that is no board
import { withHidden } from './tests.js'
import { partNames } from './trays.js'
import { builtPieces } from './pieces.js'
import { holds as holding, usable } from '../course.js'
import { rowProblems, showProblems, viewsProblems } from './views.js'
import { keyOf } from '../shell/i18n.js'
import { mutationScore } from './mutate.js'
import { checkWorks, scoreWorks } from './authoring.js'
import { cases } from './judge.js'

/** A domain module on the preset: the kernel's spec and checks over the domain's course and runs. */
export function circuitDomain(domain, { vocabulary, course, run, entries, failure, more, kinds, ...extensions }) {
  return {
    vocabulary,
    names: circuitNames,
    spec: circuitSpec(domain, course),
    validate: ({ circuit, memo }) => checkCircuitTasks(circuit, { run, entries, failure, more, kinds, memo }),
    ...extensions,
  }
}

/** A circuit game's part names (domain.js names): its built pieces. */
export const circuitNames = (content) => partNames(Object.keys(builtPieces(content.partDefs)))

export const circuitSpec = (domain, courseOf) => (content) => {
  const circuit = courseOf(content)
  return {
    id: content.id,
    domain,
    title: content.title,
    course: circuit.course,
    levels: circuit.LEVELS,
    circuit,
    blueprints: circuit.blueprints,
    syncOwn: circuit.syncOwn,
    texts: { chapters: circuit.CHAPTERS, glossary: content.glossary.entries },
  }
}

/* ---------- the checks ---------- */

/**
 * Level by level, task by task: the reference board passes every test and hidden test and uses only the parts the
 * level holds; the empty board fails them; so does the board a task carries on from, and every board that only wires
 * one card on the left straight to everything on the right; the naive board, where there is one, fails; a part a level
 * builds, placed alone and wired to the task's cards, passes them; and the rows the task lays out its results in
 * (`results`, ./views.js) show what it offers, in views that draw it. `more(task, k, tasks, held)` adds a domain's
 * own problems (held: the parts the task holds); a task of another kind is the domain's to check (`kinds`). A tick
 * board's line says how many ticks the reference ran.
 */
export function checkCircuitTasks(circuit, { run, entries, failure = () => '', more = () => [], kinds = {}, memo = (_id, _name, f) => f() }) {
  const { LEVELS, course, board } = circuit
  const noted = (ref) => (board.ticks ? `, ${ref.runs.reduce((n, r) => n + (r.ticks?.length ?? 1), 0)} ticks` : '')
  const built = new Set(LEVELS.flatMap((L) => L.unlocks))
  const out = [...circuit.wrong, ...viewsProblems(circuit.views)].map((text) => ({ text, fail: true }))
  // The values a level's introduction pages and pass text show, its own and its tasks'.
  for (const level of LEVELS) {
    const shows = [...(level.intro ?? []).map((p, k) => [p.show, `intro[${k}].show`]), [level.afterShow, 'afterShow'], ...level.tasks.flatMap((task, j) => (task.intro ?? []).map((p, k) => [p.show, `tasks[${j}].intro[${k}].show`]))]
    for (const [show, where] of shows) if (show) out.push(...showProblems(show, `${level.id} ${where}`).map((text) => ({ level: level.id, text, fail: true })))
  }
  // A level's line, run or (memo, ./check-cache.js) read back from when nothing it reads had changed.
  for (const level of LEVELS) out.push(memo(level.id, 'tasks', () => {
    const tasks = circuit.played.get(level.id)
    const said = tasks.map((task, k) => {
      const here = circuit.forTask(task)
      const { partOf } = here
      const head = tasks.length > 1 ? `task ${task.taskId}: ` : ''
      if (kinds[task.kind]) {
        const own = kinds[task.kind](task)
        return { problems: own.problems, text: `${head}${own.problems.length ? own.problems.join('; ') : own.ok}` }
      }
      const held = new Set(usable(course, { id: level.id, task: k }, built))
      const problems = []
      const all = withHidden(task)
      const where = (j) => (j < task.tests.length ? `test ${j + 1}` : `hidden test ${j - task.tests.length + 1}`)
      const has = holding(course, { id: level.id, task: k }, built)
      // A card of a part the task does not hold, or set to a value of a setting it does not hold.
      const strays = (b, what) => b.nodes.filter((n) => !board.isFixed(n.type)).forEach((n) => {
        if (!held.has(n.type)) return problems.push(`${what} uses ${n.type}, which the level does not hold`)
        for (const key of Object.keys(partOf(n.type)?.settings ?? {})) {
          const value = n.params?.[key]
          if (value !== undefined && !has(n.type, key, String(value))) problems.push(`${what} sets ${n.type}’s ${key} to ${value}, which the level does not hold`)
        }
      })
      const inspect = (work) => run(all, work, partOf)
      const opening = board.startBoard(task)
      // The pieces this task publishes, each placed alone and wired to its cards.
      const publishes = level.builds.filter((b) => b.at === k)
      const outs = board.portsOut(task).map((o) => o.name)
      const box = ({ type, form }) => board.fromText([`p = ${type}${form ? `[form=${form}]` : ''}(${board.portsIn(task).map((i) => board.sourceOf(task, i.name).replace('#', '.')).join(', ')})`, ...outs.map((o) => `${o} <- ${outs.length > 1 ? `p.${o}` : 'p'}`)], task, here)
      const checked = checkWorks(inspect, {
        reference: task.solution, naive: task.naive,
        ...(task.starter ? { starter: opening } : { empty: opening }),
      })
      const ref = checked.reference
      strays(task.solution, 'the answer')
      if (task.starter) strays(task.starter, 'the starter')
      ref.runs.forEach((r, j) => {
        if (r.error || r.fail) problems.push(`the answer fails ${where(j)}${failure(r) ? ` ${failure(r)}` : ''}`)
      })
      const views = { ...circuit.views, ...task.views }
      problems.push(...viewsProblems(task.views), ...rowProblems(task.results, entries({ task, test: all.tests[0], run: ref.runs[0], sample: null }), views))
      if (checked.starter?.ok === false) problems.push('the board it opens on passes')
      if (checked.empty?.ok === false) problems.push('the empty board passes')
      if (task.carry && !checkWorks(inspect, { starter: circuit.opening(task) }).starter.ok) problems.push(`the board it carries on from (${task.carry}) passes as it is`)
      if (task.carries && tasks[k - 1]?.solution && !checkWorks(inspect, { starter: board.carriedOnto(task, tasks[k - 1].solution) }).starter.ok) problems.push('the task before’s board passes as it is')
      if (task.solution.nodes.some((n) => !board.isFixed(n.type))) {
        for (const name of board.portsIn(task).map((i) => i.name)) {
          const from = board.sourceOf(task, name)
          if (inspect({ nodes: board.fixedOf(task), wires: outs.map((to) => ({ from, to, port: 'in' })) }).pass) problems.push(`the board that only wires ${name} straight through passes`)
        }
      }
      problems.push(...more(task, k, tasks, held))
      const visible = (work) => run(task, work, partOf)
      for (const [k, work] of (task.works ?? []).entries()) {
        if (!checkWorks(visible, { naive: work.board }).naive.ok) problems.push(`work ${k + 1} passes every check the task holds`)
      }
      let naive = ''
      if (checked.naive) {
        strays(task.naive, 'the naive answer')
        if (!checked.naive.ok) problems.push('the naive answer passes')
        else naive = `, naive fails ${where(checked.naive.fail.check)}`
      }
      for (const piece of publishes) checkWorks(inspect, { built: box(piece) }).built.runs.forEach((r, j) => {
        if (r.fail || r.error) problems.push(`its part ${piece.type} alone fails ${where(j)}`)
      })
      // Asked for (`circuit.mutants`, npm run check -- --mutants): what the tests make of the answer's mutants
      // (./mutate.js), a report and never a failure. A mutant that lives is a
      // board the tests do not rule out, or another right answer.
      let mutated = ''
      if (circuit.mutants && !problems.length) {
        // One test at a time, stopping at the first a mutant fails: most die on the first.
        const judge = cases(all.tests, (work, test) => run({ ...all, tests: [test] }, work, partOf).fail)
        const score = scoreWorks(judge, task.solution, (reference, passes) => mutationScore(reference, passes, { partOf, isFixed: board.isFixed, held: [...held] }))
        if (score.undeclared.length) problems.push(`inputs declared symmetric are not (${score.undeclared.join('; ')})`)
        if (score.made) mutated = `, mutants ${score.killed}/${score.made}${score.survivors.length ? ` (alive: ${score.survivors.join('; ')})` : ''}`
      }
      const hidden = task.hidden.length ? ` + ${task.hidden.length} hidden` : ''
      return { problems, text: `${head}${problems.length ? problems.join('; ') : `answer PASS (${task.tests.length} tests${hidden}${noted(ref)})${naive}${mutated}${publishes.map((b) => `, part ${b.type} PASS`).join('')}`}` }
    })
    return { level: level.id, fail: said.some((x) => x.problems.length > 0), text: `${level.id} ${keyOf(level.title)}: ${said.map((x) => x.text).join(' · ')}` }
  }))
  return out
}
