import { registeredOperations, registeredValueTypes, S, withHidden, taskModule, runtimeWorks } from 'kernel'
import { grants } from 'circuit'
import { registry, meaning } from './catalog.js'
import { symbolGrant } from './grants.js'
import runtime from './runtime.js'
import { logicWorks } from './work.js'
import { plays } from './plays.js'
import { play } from './play.js'
import { startProof, runProof } from './proof.js'
import { startGates, checkGates } from './gates.js'
import { startMachine, runMachine } from './machine.js'
import { truth } from './truthValues.js'
import { translation, query } from './formulaWork.js'
import { worldCheck } from './worldValues.js'
import { scriptJudge } from './script.js'
import { checkDefine } from './define.js'
import { checkDeclaration, readRuleRows, blankRule } from './ruleLines.js'
import { sentenceOf } from './iso.js'
import { say } from './notation.js'
import { runAudit, restoreAuditCases } from './audit-cases.js'
import { parse } from './formula.js'

export { logicWorks, prepareLogicWorks } from './work.js'
export { default as runtime } from './runtime.js'
export { SYMBOL } from './content.js'
export { default as module } from './module.js'

const scopedWorks = new WeakMap()

export function logicContext({ content, task, progress }) {
  const onlyLogic = content.levels.every(level => level.tasks.every(task => taskModule(task) === 'logic'))
  if (!onlyLogic && !scopedWorks.has(content)) scopedWorks.set(content, runtimeWorks(content, [{ id: 'logic', runtime }]).works[0])
  const works = onlyLogic ? logicWorks(content) : scopedWorks.get(content)
  if (progress) works.syncOwn(progress.built)
  const name = task.taskId ?? task.id
  const prepared = works.LEVELS.flatMap(level => level.tasks).find(task => task.taskId === name || task.key === name)
  if (!prepared) throw new Error(`unknown logic task ${name}`)
  return { task: prepared, works }
}

const boards = { 'logic:proof': startProof, 'logic:gates': startGates, 'logic:machine': startMachine }
const identity = value => value
const judged = (judge, work) => { const fail = judge(work); return { pass: !fail, fail } }

export function register(kernel) {
  if (!grants.types.has(symbolGrant.type)) grants.register(symbolGrant)
  Object.assign(registeredOperations, registry.operations)
  Object.assign(registeredValueTypes, registry.tables.valueType)
  kernel.kind('logic:level', meaning)
  kernel.kind('logic:symbol', {
    type: 'logic/symbol', read: value => value, selector: 'symbol', selectors: ['symbol'], textPrefix: 'symbol',
    textParameters: { symbol: S.opt(S.str()) },
    search({ content, texts }) {
      for (const [symbol, value] of Object.entries(content.registries['logic/symbol'] ?? {})) texts(value, content.objectKinds['logic/symbol'].schema, { file: `symbols/${symbol}.json`, selector: { symbol } })
    },
    textTarget({ workspace, args, vocabulary }) {
      const objects = workspace.contentObjects['logic/symbol']
      return args.symbol === undefined ? [] : [{ id: args.symbol, value: objects.get(args.symbol), schema: vocabulary.objectKinds['logic/symbol'].schema, selector: { symbol: args.symbol }, set: value => objects.set(args.symbol, value) }]
    },
    operationTargets: ({ workspace, args, vocabulary }) => ({ symbol: [vocabulary.objectKinds['logic/symbol']?.schema, workspace.contentObjects['logic/symbol']?.get(args.symbol)] }),
  })
  for (const name of Object.keys(plays)) {
    kernel.play(name, {
      runtime,
      initial(context) {
        const { task } = logicContext(context)
        if (boards[name]) return boards[name](task)
        if (name === 'logic:iso') return { rules: [blankRule()] }
        if (name === 'logic:audit') return restoreAuditCases(task)
        if (name === 'logic:define') return task.rows.map(() => null)
        if (name === 'logic:truth') return { fill: [], marks: [], tried: {} }
        if (name === 'logic:script') return task.given ?? []
        if (name === 'logic:model') return worldCheck(task).initial
        return null
      },
      read(work, context) {
        const { task, works } = logicContext(context)
        if (boards[name] && Array.isArray(work)) { const view = works.circuitFor(task).forTask(task); return view.board.fromText(work, task, { ...view, types: () => Object.keys(works.defs) }) }
        if (['logic:translate', 'logic:query'].includes(name) && typeof work === 'string') return parse(work, { consts: task.vocab.names })
        return work
      },
      write: identity, normalize: identity,
      run(work, context) {
        const { task } = logicContext(context)
        switch (name) {
          case 'logic:proof': return runProof(withHidden(task), work)
          case 'logic:gates': return checkGates(withHidden(task), work)
          case 'logic:machine': return runMachine(withHidden(task), work)
          case 'logic:truth': return truth(task).judge(work)
          case 'logic:translate': return judged(translation(task).judge, work)
          case 'logic:query': return judged(query(task).judge, work)
          case 'logic:model': return judged(worldCheck(task).judge, work)
          case 'logic:script': return judged(scriptJudge(task), work)
          case 'logic:define': return judged(checkDefine(task), work)
          case 'logic:iso': return judged(checkDeclaration(task), readRuleRows(task, work.rules ?? work))
          case 'logic:audit': return runAudit(task, work, sentence => say(sentenceOf(task, sentence), task.notation))
          default: throw new Error(`unknown logic play ${name}`)
        }
      },
      judge: report => ({ pass: report.pass, score: report.score ?? (report.pass ? 1 : 0) }),
    })
    kernel.agent(name, {
      observe: context => play.open(textContext(context)),
      act: (context, work) => play.attempt(textContext(context), work),
    })
  }
  kernel.check('logic:levels', ({ content }) => content.levels.some(level => level.tasks.some(task => taskModule(task) === 'logic')) ? runtime.validate(runtime.spec(content)) : [])
}
function textContext(context) {
  const { task, works } = logicContext(context)
  return { game: { logic: works, circuit: { forTask: task => works.circuitFor(task)?.forTask(task) }, defined: { of: type => works.defs[type] ?? works.symbols[type] }, parts: { all: Object.entries(works.defs).map(([part, spec]) => ({ key: `part:${part}`, part, name: spec.name, desc: spec.desc })) } }, level: { ...task, source: task }, flags: context.flags ?? new Set(context.progress?.flags ?? []), progress: context.progress ?? { built: {}, passed: [], data: {}, solved: [] } }
}
