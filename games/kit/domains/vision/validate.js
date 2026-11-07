// The vision domain's checks for `npm run check` (../../engine/checks.js): what reading the content found wrong, then
// level by level, task by task —
//   board    the checks every board gets (../../engine/circuit-domain.js checkCircuitTasks), each test run once
//            (run.js); and the course's settings: a task introduces only values its parts take and only parts its
//            answer uses, every part it holds has some value of each setting introduced, and its boards use only values
//            introduced by then; the answer gives every output on its sample, where there is one
//   grid     the answer the ask works out passes; the answer the player starts from does not; the naive answer fails
//   choice   in every round the judge's own answer passes and an empty answer fails; the naive picks fail a round
//   bench    the model's data fit it (its verify), and the lesson holds (benches/lesson.js): each step's start fails and
//            some setting passes, every naive setting fails, every setting that passes meets `holds`
import { checkCircuitTasks } from '../../engine/circuit-domain.js'
import { entries, runLevel, runTest } from './run.js'
import { gridCheck, gridReference, gridStart } from './grid.js'
import { judgeOf, naiveRound } from './judges.js'
import { blankProbe, filterProbeProblems, probeOf } from './probe.js'
import { lessonProblems } from './benches/lesson.js'

/** What a board task does wrong with the settings its course introduces, and with its sample. */
function settingsSaid(task, held, { partOf, settingsIn, defs, BUILT }) {
  const problems = []
  for (const [setting, values] of Object.entries(task.configurations ?? {})) {
    const [type, key, ...rest] = setting.split('.')
    const candidates = type === '*' ? [...Object.keys(defs), ...Object.keys(BUILT)].map(partOf) : [partOf(type)]
    const supported = candidates.flatMap((part) => part?.settings?.[key] ?? [])
    if (rest.length || !supported.length || values.some((value) => !supported.includes(value))) problems.push(`invalid configuration introduction ${setting}`)
  }
  for (const type of task.fresh) if (!task.solution.nodes.some((n) => n.type === type)) problems.push(`introduces ${type}, which its answer does not use`)
  for (const type of held) for (const key of Object.keys(partOf(type)?.settings ?? {})) if (!settingsIn(task, type, key)?.length) problems.push(`holds ${type} with no ${type}.${key} introduced`)
  for (const [name, board] of [['answer', task.solution], ['starter', task.starter], ['naive', task.naive]]) for (const node of board?.nodes ?? []) {
    for (const key of Object.keys(partOf(node.type)?.settings ?? {})) {
      const allowed = settingsIn(task, node.type, key)
      if (!allowed?.length || node.params?.[key] !== undefined && !allowed.includes(node.params[key])) problems.push(`${name} uses ${node.type}.${key}=${node.params?.[key] ?? 'default'} before its task introduction`)
    }
  }
  if (task.sample) {
    const { outputs, errors } = runTest({ ...task, outputs: [] }, task.solution, { ...task.sample, expect: {} }, partOf)
    const why = [...errors.values()].find((e) => e?.en)
    for (const o of task.outputs) if (outputs[o.name] === undefined) problems.push(`the answer gives no ${o.name} on the sample${why ? `: ${why.en}` : ''}`)
  }
  return problems
}

function gridSaid(task) {
  const problems = []
  const why = gridCheck(task, gridReference(task))
  if (why) problems.push(`its own answer fails: ${why.en}`)
  if (!gridCheck(task, gridStart(task))) problems.push('the answer it starts from passes')
  if (task.naive && !gridCheck(task, task.naive.answer)) problems.push('the naive answer passes')
  return { problems, ok: `grid PASS${task.naive ? ', naive fails' : ''}` }
}

function choiceSaid(task) {
  const { judge, params } = judgeOf(task.judge)
  const problems = []
  task.rounds.forEach((round, r) => {
    const wrong = judge.check(round, judge.reference(round, params), params)
    if (wrong.length) problems.push(`round ${r + 1}: its own answer fails: ${wrong[0].why.en}`)
    if (!judge.check(round, round.items.map(() => []), params).length) problems.push(`round ${r + 1}: answering nothing passes`)
  })
  const naive = task.naive && naiveRound(task)
  if (task.naive && naive === null) problems.push(task.naive.picks.length !== task.rounds.length ? `the naive answer has picks for ${task.naive.picks.length} rounds, the task ${task.rounds.length}` : 'the naive answer passes every round')
  return { problems, ok: `choice PASS (${task.rounds.length} round${task.rounds.length > 1 ? 's' : ''}${naive !== null && task.naive ? `, naive fails round ${naive + 1}` : ''})` }
}

function benchSaid(task) {
  if (!task.made) return { problems: ['its bench does not read'] }
  const why = task.made.verify()
  return { problems: why ? [why] : lessonProblems(task, task.made.model.view), ok: `bench ${task.bench.model} PASS (${task.naive.length} naive failing${task.holds ? ', holds on every pass' : ''})` }
}

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]. */
export function validate({ circuit }) {
  return checkCircuitTasks(circuit, {
    run: runLevel,
    entries,
    failure: (r) => (r.fail ? `(${r.fail.why.en})` : ''),
    more: (task, _k, _tasks, held) => settingsSaid(task, held, circuit),
    kinds: { probe: (task) => {
      const model = probeOf(task)
      const reference = model.reference()
      const problems = [...filterProbeProblems(task), ...model.questions.flatMap((question, index) => [
        ...(model.check(question, reference[index]) ? ['reference evidence fails'] : []),
        ...(!model.check(question, model.insufficient()) ? ['insufficient evidence passes'] : []),
      ])]
      if ((task.experiment ?? 'blur') === 'blur') {
        const [support, gain] = model.questions
        const flat = blankProbe().map(row => row.map(() => 0.25))
        if (!model.check(support, { answer: support.answer, rows: flat })) problems.push('a flat image passes the support question')
        if (model.check(gain, { answer: gain.answer, rows: flat })) problems.push('a nonzero flat image fails the gain question')
      }
      return { problems, ok: 'probe PASS' }
    }, grid: gridSaid, choice: choiceSaid, bench: benchSaid },
  })
}
