// Circuit tasks as editable blueprints with the cases and verdicts the screen shows.
import { circuitPlay, definedSettings, untilFail } from '../../engine/play/circuit.js'
import { runTestGroups, splitTests, TEST_WORDS } from '../../engine/tests.js'
import { reportedFailure } from '../../engine/failure-text.js'
import { failureOf } from '../../engine/test-run.js'
import { playFor } from '../../engine/plays.js'
import { parse } from './formula.js'
import { checkGates, rowsFor } from './gates.js'
import { gatesPlayFor, plays } from './plays.js'
import { say } from './notation.js'
import { runProof } from './proof.js'
import { runMachine } from './machine.js'
import { machineReadout, proofReadout } from './circuit-readouts.js'
import { L, T } from '../../shell/i18n.js'

const TF = (v, lang) => (v === undefined ? '—' : v ? (lang === 'en' ? 'T' : '真') : (lang === 'en' ? 'F' : '假'))
const pick = (v, lang) => (v && typeof v === 'object' ? v[lang] : v)

/** A truth table's visible cases, in the same order as the gate runner. */
function rowLabel(letters, row, k) {
  const values = (lang) => letters.map((letter) => `${letter}=${TF(row[letter], lang)}`).join(', ')
  return T(`第 ${k + 1} 行（${values('zh')}）`, `Row ${k + 1} (${values('en')})`)
}

function visibleRows(level) {
  const { letters, rows } = rowsFor(level)
  const showTarget = gatesPlayFor(level).target === 'shown'
  const text = ({ row, want }, lang) => {
    const inputs = letters.map((letter) => `${letter} (${pick(say(parse(letter), level.notation), lang)}): ${TF(row[letter], lang)}`)
    if (showTarget) inputs.push(`${lang === 'en' ? 'Target' : '目标真值'}: ${TF(want, lang)}`)
    return inputs.join(' | ')
  }
  return rows.map((row, k) => ({ label: rowLabel(letters, row.row, k), text: T(text(row, 'zh'), text(row, 'en')) }))
}

const gates = circuitPlay({
  part: ({ level }, type) => level.source.gates[type],
  given: ({ level: { source: L } }) => {
    const { letters } = rowsFor(L)
    const words = (lang) => letters.map((l) => `${l}: ${lang === 'en' ? 'input' : '输入'} “${pick(say(parse(l), L.notation), lang)}”`).join('\n')
    const sentence = (lang) => (L.blind ? '' : `\nout: ${lang === 'en' ? 'the sentence' : '这句话'} ${pick(say(parse(L.target), L.notation), lang)}`)
    const budget = (lang) => (L.budget !== undefined ? `\n${lang === 'en' ? `At most ${L.budget} gates.` : `最多 ${L.budget} 个门。`}` : '')
    return T(words('zh') + sentence('zh') + budget('zh'), words('en') + sentence('en') + budget('en'))
  },
  tests: ({ level: { source: L } }) => visibleRows(L),
  run: ({ level: { source: L } }, graph) => {
    const checked = checkGates(L, graph)
    const showTarget = gatesPlayFor(L).target === 'shown'
    const { letters } = rowsFor(L)
    const tests = untilFail(checked.runs.map((r, k) => ({
      label: rowLabel(letters, r.row, k),
      pass: r.pass,
      says: r.pass ? null : T(`这一行的结果错误：电路输出 ${TF(r.got, 'zh')}${showTarget ? `，应当是 ${TF(r.want, 'zh')}` : ''}。`, `This row is wrong: the circuit outputs ${TF(r.got, 'en')}${showTarget ? `; it should be ${TF(r.want, 'en')}` : ''}.`),
    })))
    const over = checked.runs.every((r) => r.pass) && checked.constraint
    return {
      tests,
      says: over ? [checked.constraint] : checked.pass ? [T('每一行都正确：这块电路算出了这句话的完整真值表。')] : [],
      pass: checked.pass,
      score: checked.score,
    }
  },
})

const testLabel = (test, at) => test.label ?? TEST_WORDS.label(at)
const partDefinition = ({ game, level }, type) => game.circuit.forTask(level.source).defined?.of(type) ?? game.defined.of(type)

function derivationPlay(readout, run) {
  return circuitPlay({
    part: (ctx, type) => partDefinition(ctx, type) ?? ctx.game.logic.pieces[type],
    settings: (ctx, type) => {
      const def = partDefinition(ctx, type)
      return def ? definedSettings(def) : []
    },
    tests: ({ level: { source: task }, solved }) => splitTests(task, solved).shown.map((test, at) => {
      const entries = readout.entries({ task, test }).filter((entry) => 'given' in entry || 'want' in entry)
      const text = entries.map(({ label, of, given, want }) => `${L(label ?? of)}: ${L(readout.show(given ?? want, { task, test }))}`).join('\n')
      return { label: testLabel(test, at), text }
    }),
    notes: ({ level: { source: task }, solved }) => {
      const { hiddenCount } = splitTests(task, solved)
      return hiddenCount ? [TEST_WORDS.note(hiddenCount)] : []
    },
    run: ({ level: { source: task }, solved }, board) => {
      const { shown, checked, hidden, pass } = runTestGroups(task, solved, (all) => run(all, board))
      const cases = checked.runs.map((row, at) => ({ label: testLabel(shown[at], at), pass: !failureOf(row), says: reportedFailure(row) }))
      const tests = playFor(plays, task).judge === 'steps' ? untilFail(cases) : cases
      const constraint = checked.constraint
      return {
        tests, pass, score: checked.score, constraint,
        says: constraint && cases.every((row) => row.pass) ? [constraint] : [],
        hidden: hidden && { ...hidden, says: TEST_WORDS.failed(hidden.failed, hidden.count) },
      }
    },
  })
}

const circuits = { 'logic:gates': gates, 'logic:proof': derivationPlay(proofReadout, runProof), 'logic:machine': derivationPlay(machineReadout, runMachine) }
const notCovered = (kind) => ({
  covered: false,
  why: kind === 'logic:truth' ? T('真值表（逐行手填或勾选），harness 还不支持') : T(`「${kind}」玩法，harness 还不支持`, `a “${kind}” play; the harness does not cover it yet`),
})

export const play = {
  open: (ctx) => circuits[ctx.level.kind]?.open(ctx) ?? notCovered(ctx.level.kind),
  attempt: (ctx, text) => circuits[ctx.level.kind]?.attempt(ctx, text) ?? notCovered(ctx.level.kind),
}
