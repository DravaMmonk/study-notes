// A proof level (《证明完毕》, ../proof.js) as the kernel's circuit screen plays it (../../../shell/CircuitScreen.jsx): its
// premises down the left, the goal on the right, the rules and the lemmas as parts (a game's parts.json, the lemmas
// registered by the course), a box's regions on the same board. Every test is checked at once; the results show each
// test's premises, the goal and what reaches it. A card holds the schema's letters and shows them as the test's
// sentences: its sentences are built in the language of the level's own (choices.js), its choices worked out by the
// domain's resources on the test on view.
import { L, T } from '../../../shell/i18n.js'
import { parse, replaceAtoms, same } from '../formula.js'
import { say } from '../notation.js'
import { choicesOf } from '../choices.js'
import { vocabulary } from '../fol.js'
import { sentencePicker } from '../sentenceLanguage.js'
import { printTerm } from '../pterm.js'
import { scriptLines } from '../script.js'
import { LOGIC_TESTS } from '../proof.js'

// The words a test reads in: its last test (the bare letters) in the letters' own words.
const wordsOf = (task, test) => (test?.symbolic ? { ...task.notation, words: task.symbolicWords ?? null, propertyWords: false } : task.notation)
const textOf = (task, test) => (f) => L(say(f, wordsOf(task, test)))
const both = (zh, en) => ({ zh, en })

/** A value in words: a formula, or a proved judgment (with its proof term from chapter 7 on, else what it rests on). */
function show(v, { task, test }) {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'string') return v
  const said = (f) => say(f, wordsOf(task, test))
  if (!v.formula) return said(v)
  const f = said(v.formula)
  if (task.terms && v.term) return both(`${f.zh} · ${printTerm(v.term)}`, `${f.en} · ${printTerm(v.term)}`)
  // What it rests on, but for itself (a premise or an assumption rests on just that).
  const hyps = [...v.hyps.values()].filter((h) => !same(h, v.formula)).map(said)
  return hyps.length ? both(`${f.zh}（依赖 ${hyps.map((h) => h.zh).join('；')}）`, `${f.en} (from ${hyps.map((h) => h.en).join('; ')})`) : f
}

/** Every test run: its values, and why the goal does not stand, if it does not. */
const runLevel = (task, circuit) => ({
  runs: task.tests.map((test) => {
    const run = LOGIC_TESTS.runTest(task, circuit, test)
    const [check] = LOGIC_TESTS.check(task, test, run.outputs)
    return { ...run, trace: [], ...(check.pass ? {} : { fail: { why: check.reason } }) }
  }),
})

/** What the results show of a test: its premises, and the goal against what reaches it. */
const entries = ({ task, test, run }) => {
  const consts = task.consts ?? []
  return [
    ...Object.entries(test?.premises ?? {}).map(([name, text], k, all) => ({ of: name, label: all.length > 1 ? T(`已知 ${k + 1}`, `Given ${k + 1}`) : T('已知', 'Given'), shape: 'scalar', given: parse(text, { consts }) })),
    ...(test ? [{ of: 'goal', label: T('目标', 'Goal'), shape: 'scalar', want: parse(test.goal, { consts }), got: run?.outputs?.goal?.formula }] : []),
  ]
}

/** The language a card's sentence is built in: the pieces of the level's sentences, each letter read as the test's. */
function language(task, test) {
  const offer = choicesOf(task)
  const consts = task.consts ?? []
  const text = textOf(task, test)
  const arity = new Map(vocabulary(offer.formula).preds)
  const lettered = Object.entries(test?.subst ?? {}).map(([letter, to]) => [letter, arity.get(letter) > 0 && to.op === 'atom' && task.notation.words?.[to.pred] ? task.notation.words[to.pred] : both(text(to), text(to))])
  const notation = { ...task.notation, words: { ...task.notation.words, ...Object.fromEntries(lettered) } }
  const read = (value) => parse(value, { consts })
  return sentencePicker(offer.formula, { read, consts, notation, text: (value) => text(replaceAtoms(read(value), test?.subst ?? {})) })
}

export const proofScreen = {
  course: (game) => game.logic.proofBoards,
  play: { runLevel, show, entries },
  judged: true,
  language,
  context: (task, test) => ({ task, text: textOf(task, test) }),
  // A script the proof follows (chapter 15), a line each, indented as its blocks are.
  told: (task, test) => (task.script ? scriptLines(task.script, (t) => textOf(task, test)(parse(t, { consts: [...(task.consts ?? []), ...(task.things ?? [])] }))).map(([depth, text]) => ({ text: `${'  '.repeat(depth)}${text}` })) : []),
  score: (task, circuit) => LOGIC_TESTS.score(task, circuit),
  readouts: (task, circuit) => [{ value: LOGIC_TESTS.score(task, circuit).steps, label: T('步数') }],
  says: { done: T('证明完毕') },
  canvas: { height: 150, emptyNote: T('从上方元件栏选择规则放到板上，再把元件右侧的圆点连到另一元件左侧的圆点。') },
}
