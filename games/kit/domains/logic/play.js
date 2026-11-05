// The logic domain's play hook for a blind session (../../engine/play/): a truth-circuit level of 《证明完毕》 as its
// screen (ui/GatesScreen.jsx) shows it, in words — a card for each letter, the sentence's output, the gates the level
// holds, the sentence's truth table (without the target column on a level that hides it, without the sentence on a
// blind one) — and an attempt run down the table row by row as the screen runs it, stopping on the first wrong row,
// then held to the level's gate budget.
//
// Not covered yet: the truth tables of era 0 (each row ticked by hand), the proof board and the machine board (a
// board of rules whose settings are sentences: their text spells sentences in ASCII, parts.text, and a blind player
// needs the notation and the frame regions written out), and the rule board, definitions, translations, worlds, proof
// terms and scripts (each a screen of its own).
import { circuitPlay, untilFail } from '../../engine/play/circuit.js'
import { gateShape } from './blueprint.js'
import { syncOwn } from './built.js'
import { parse } from './formula.js'
import { checkGates, gatesOf, rowsFor, startGates } from './gates.js'
import { say } from './notation.js'
import { T } from '../../shell/i18n.js'

const TF = (v, lang) => (v === undefined ? '—' : v ? (lang === 'en' ? 'T' : '真') : (lang === 'en' ? 'F' : '假'))
const pick = (v, lang) => (v && typeof v === 'object' ? v[lang] : v)

/** The sentence's truth table, a row a line, as the strip shows it. */
function table(level, lang) {
  const { letters, rows } = rowsFor(level)
  const word = (l) => pick(say(parse(l), level.notation), lang)
  const hide = level.blind || level.hideTarget
  const head = [...letters.map((l) => `${l} (${word(l)})`), ...(hide ? [] : [lang === 'en' ? 'target' : '目标真值'])]
  return [head.join(' | '), ...rows.map((r, k) => `${lang === 'en' ? 'row' : '行'} ${k + 1}: ${[...letters.map((l) => TF(r.row[l], lang)), ...(hide ? [] : [TF(r.want, lang)])].join(' | ')}`)].join('\n')
}

const gates = circuitPlay({
  board: ({ game, level, flags, progress }) => {
    syncOwn(progress.built)
    const L = level.source
    const shape = gateShape(L.gates)
    const all = gatesOf(L.gates)
    const { shown, folded } = game.logic.offerIn(L, flags)
    return { start: startGates(L), parts: shape, types: [...shown, ...folded].filter((t) => all[t]) }
  },
  part: ({ level }, type) => gatesOf(level.source.gates)[type],
  given: ({ level: { source: L } }) => {
    const { letters } = rowsFor(L)
    const words = (lang) => letters.map((l) => `${l}: ${lang === 'en' ? 'input' : '输入'} “${pick(say(parse(l), L.notation), lang)}”`).join('\n')
    const sentence = (lang) => (L.blind ? '' : `\nout: ${lang === 'en' ? 'the sentence' : '这句话'} ${pick(say(parse(L.target), L.notation), lang)}`)
    const budget = (lang) => (L.budget !== undefined ? `\n${lang === 'en' ? `At most ${L.budget} gates.` : `最多 ${L.budget} 个门。`}` : '')
    return T(words('zh') + sentence('zh') + budget('zh'), words('en') + sentence('en') + budget('en'))
  },
  tests: ({ level: { source: L } }) => [{ label: T('真值表', 'Truth table'), text: T(table(L, 'zh'), table(L, 'en')) }],
  run: ({ level: { source: L } }, graph) => {
    const checked = checkGates(L, graph)
    const { letters } = rowsFor(L)
    const rowText = (r, lang) => letters.map((l) => `${l}=${TF(r.row[l], lang)}`).join(', ')
    const tests = untilFail(checked.results.map((r, k) => ({
      label: T(`第 ${k + 1} 行（${rowText(r, 'zh')}）`, `Row ${k + 1} (${rowText(r, 'en')})`),
      pass: r.pass,
      says: r.pass ? null : T(`这一行的结果错误：电路输出 ${TF(r.got, 'zh')}${L.blind || L.hideTarget ? '' : `，应当是 ${TF(r.want, 'zh')}`}。`, `This row is wrong: the circuit outputs ${TF(r.got, 'en')}${L.blind || L.hideTarget ? '' : `; it should be ${TF(r.want, 'en')}`}.`),
    })))
    const over = checked.results.every((r) => r.pass) && checked.overBudget
    return {
      tests,
      says: over ? [T(`每一行都正确，但用了 ${checked.gates} 个门，这一关最多允许 ${L.budget} 个。`, `Every row is correct, but it uses ${checked.gates} gates; this level allows ${L.budget}.`)] : checked.pass ? [T('每一行都正确：这块电路算出了这句话的完整真值表。', 'Every row is correct: this circuit computes the sentence’s full truth table.')] : [],
      pass: checked.pass,
      score: { steps: checked.gates },
    }
  },
})

const NOT_COVERED = {
  truth: T('真值表（逐行手填或勾选），harness 还不支持', 'a truth table (rows ticked by hand); the harness does not cover it yet'),
  proof: T('证明板（元件的设置是句子），harness 还不支持', 'a proof board (parts set with sentences); the harness does not cover it yet'),
  machine: T('证明助手板，harness 还不支持', 'a proof-assistant board; the harness does not cover it yet'),
}
const why = (kind) => NOT_COVERED[kind] ?? T(`「${kind}」玩法，harness 还不支持`, `a “${kind}” play; the harness does not cover it yet`)

export const play = {
  open: (ctx) => (ctx.level.kind === 'gates' ? gates.open(ctx) : { covered: false, why: why(ctx.level.kind) }),
  attempt: (ctx, text) => gates.attempt(ctx, text),
}
