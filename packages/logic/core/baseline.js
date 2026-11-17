import { withHidden } from 'kernel'
import { runProof } from './proof.js'
import { runMachine } from './machine.js'
import { runGates, gateTests } from './gates.js'
import { truth } from './truthValues.js'
import { checkDefine } from './define.js'
import { checkDeclaration, readRuleRows } from './ruleLines.js'
import { checkIso, sentenceOf } from './iso.js'
import { runAudit } from './audit-cases.js'
import { translation, query } from './formulaWork.js'
import { worldCheck } from './worldValues.js'
import { scriptJudge, checkScript } from './script.js'
import { parse } from './formula.js'
import { say } from './notation.js'

const judged = (judge, work) => { const fail = judge(work); return { pass: !fail, fail, steps: [{ pass: !fail, fail }] } }
const examples = (task, run, reference = task.solution ?? task.answer, naive = task.naive) => ({
  reference: reference === undefined ? { absent: true } : { work: reference, report: run(reference) },
  naive: naive == null ? { absent: true } : { work: naive, report: run(naive) },
})

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

export function logicReports({ spec }) {
  if (!spec.logic) return null
  return spec.levels.flatMap(level => (spec.logic.played?.get(level.id) ?? level.tasks).map(task => ({ level: level.id, task: task.taskId ?? task.key ?? task.id, kind: task.mode ?? task.kind, report: logicReport(task) })))
}
