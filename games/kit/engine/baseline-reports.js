// Migration observations call the production runners and judges, never a second implementation.
import { withHidden } from './tests.js'
import { baselineValue } from './baseline-value.js'
import { startValues, benchRun, openKnobs } from './bench.js'
const { handExamples, judgeHand } = await import('../modules/table/model/hand-verdict.js')
const { robotReport } = await import('../modules/table/model/verdict.js')
const { runProof } = await import('../modules/logic/proof.js')
const { runMachine } = await import('../modules/logic/machine.js')
const { runGates, gateTests } = await import('../modules/logic/gates.js')
const { truth } = await import('../modules/logic/truthValues.js')
const { checkDefine } = await import('../modules/logic/define.js')
const { checkDeclaration, readRuleRows } = await import('../modules/logic/ruleLines.js')
const { checkIso, sentenceOf } = await import('../modules/logic/iso.js')
const { runAudit } = await import('../modules/logic/audit-cases.js')
const { translation, query } = await import('../modules/logic/formulaWork.js')
const { worldCheck } = await import('../modules/logic/worldValues.js')
const { scriptJudge, checkScript } = await import('../modules/logic/script.js')
const { parse } = await import('../modules/logic/formula.js')
const { say } = await import('../modules/logic/notation.js')

const judged = (judge, work) => { const fail = judge(work); return { pass: !fail, fail, steps: [{ pass: !fail, fail }] } }
const examples = (task, run, reference = task.solution ?? task.answer, naive = task.naive) => ({
  reference: reference === undefined ? { absent: true } : { work: reference, report: run(reference) },
  naive: naive == null ? { absent: true } : { work: naive, report: run(naive) },
})

function benchReport(task) {
  const { bench, model } = task
  return {
    verify: task.verify(),
    coverage: 'stage starts and authored action sequences; no authored reference/naive works',
    stages: (bench.stages ?? [null]).map((stage, stageIndex) => {
      let values = startValues(bench, stage), process = model.start?.() ?? null
      const snapshot = () => baselineValue({ values, process, report: benchRun(bench, model, values, { stageIndex, process }) })
      const steps = [{ action: 'start', ...snapshot() }]
      for (const action of bench.actions ?? []) {
        if (action.reset) for (const key of action.reset) values = { ...values, [key]: startValues(bench, stage)[key] }
        else if (model.act) for (let n = 0; n < (action.repeat ?? 1); n++) {
          process = model.act(process, action.act, values, action.arg)
          steps.push({ action: action.act, repetition: n, ...snapshot() })
        }
        if (action.reset) steps.push({ action: 'reset', ...snapshot() })
      }
      return { open: openKnobs(bench, stage), steps }
    }),
  }
}

function logicReport(task) {
  const words = sentence => say(sentenceOf(task, sentence), task.notation)
  switch (task.kind) {
    case 'logic:proof': return examples(task, work => runProof(withHidden(task), work, { traced: true }))
    case 'logic:machine': return examples(task, work => runMachine(withHidden(task), work, { traced: true }))
    case 'logic:gates': return examples(task, work => runGates({ ...task, tests: gateTests(task) }, work, null, { traced: true }))
    case 'logic:define': return examples(task, work => judged(checkDefine(task), work))
    case 'logic:script': return examples(task, work => ({ ...judged(scriptJudge(task), work), run: checkScript(task, work) }), task.answer)
    case 'logic:model': return examples(task, work => ({ ...judged(worldCheck(task).judge, work), run: worldCheck(task).run(work) }), task.answer)
    case 'logic:translate': case 'logic:query': {
      const judge = (task.kind === 'logic:query' ? query : translation)(task).judge
      return examples(task, work => judged(judge, typeof work === 'string' ? parse(work, { consts: task.vocab.names }) : work), task.target)
    }
    case 'logic:iso': {
      const audit = task.play === 'logic:audit'
      const naiveRules = !audit && task.naive?.every(rule => rule.needs) ? task.naive : null
      const declaration = examples(task, work => judged(audit ? checkIso(task, words) : rules => checkDeclaration(task)(readRuleRows(task, rules)), work), task.solution, naiveRules)
      return task.play === 'logic:audit' ? { declaration, cases: examples(task, work => runAudit(task, work, words), task.answer) } : declaration
    }
    case 'logic:truth': {
      const view = truth(task)
      const reference = { fill: view.tables[0].rows.map(r => r.value), marks: view.tables.map(t => t.rows.every(r => r.value)), tried: Object.fromEntries(view.tables.flatMap((t, f) => t.rows.flatMap((r, k) => r.value === (task.ask === 'sat') ? [[`${f}:${k}`, true]] : []))) }
      const naive = { fill: reference.fill.map(v => !v), marks: reference.marks.map(v => !v), tried: {} }
      return { tables: view.tables, ...examples(task, work => view.judge(work), reference, naive) }
    }
    default: throw new Error(`unobserved logic play ${task.kind}`)
  }
}

export async function taskReports(spec, providers = []) {
  for (const provider of providers) {
    const records = provider.baselineReports?.({ spec })
    if (records) return records.map(baselineValue)
  }
  const works = spec.table ?? spec.image ?? spec.logic ?? {}
  const tasks = spec.levels.flatMap(level => (works.played?.get(level.id) ?? level.tasks).map(task => ({ level: level.id, task })))
  const records = []
  for (const { level, task } of tasks) {
    const kind = task.mode ?? task.kind
    let report
    if (spec.table) report = kind === 'table:circuit' ? examples(task, work => robotReport(works.model.runCircuit, task, work, { traced: true })) : (() => {
      const sample = handExamples(task)
      return examples(task, work => judgeHand(task, work), sample.reference, sample.naive)
    })()
    else if (spec.kit) report = kind === 'image:graph' ? { ...examples(task, work => spec.kit.runLevel(withHidden(task), work, { traced: true })), alsoFails: (task.alsoFails ?? []).map(work => spec.kit.runLevel(withHidden(task), work, { traced: true })) }
      : kind === 'image:board' ? benchReport(task) : {
        verify: task.verify(), examples: task.probe.examples.map(example => ({ ...example, output: task.probe.run(example.input) })),
        choices: task.probe.answers.map(choice => ({ choice, pass: task.probe.judge(choice) })),
      }
    else if (spec.logic) report = logicReport(task)
    else {
      const { runLevel } = await import(`../modules/${kind?.split(':')[0]}/run.js`)
      report = examples(task, work => runLevel(withHidden(task), work, works.forTask(task).partOf, { traced: true }))
    }
    records.push(baselineValue({ level, task: task.taskId ?? task.key ?? task.id, kind, report }))
  }
  return records
}
