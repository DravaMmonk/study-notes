import { playOf } from '../../engine/plays.js'
import { checkDefine } from './define.js'
import { checkGates } from './gates.js'
import { checkIso, judgeCases, sentenceOf } from './iso.js'
import { MACHINE_TESTS } from './machine.js'
import { say } from './notation.js'
import { plays, playIdOf } from './plays.js'
import { LOGIC_TESTS } from './proof.js'
import { checkDeclaration } from './ruleLines.js'

const wordsOf = (level) => (sentence) => say(sentenceOf(level, sentence), level.notation)
const declaration = (level) => checkIso(level, wordsOf(level))

export const playOfTask = (task) => playOf(plays, { playId: playIdOf(task), id: task.id })

const circuitTests = { proof: LOGIC_TESTS, machine: MACHINE_TESTS }
export const circuitTestsOf = (task) => circuitTests[playOfTask(task).judge]

const rows = { declaration: checkDeclaration, definition: checkDefine }
export const rowJudgeOf = (task) => rows[playOfTask(task).judge](task)

const reference = { declaration, declarationAudit: declaration, definition: checkDefine }
export const referenceJudgeOf = (task) => reference[playOfTask(task).judge](task)

const cases = { declarationAudit: (task, work) => judgeCases(task, work, wordsOf(task)) }
export const checkCasesOf = (task, work) => cases[playOfTask(task).judge](task, work)

const reports = { gates: checkGates }
export const checkCircuitOf = (task, work) => reports[playOfTask(task).judge](task, work)
