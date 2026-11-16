// A proof level (《证明完毕》, ../proof.js) as the kernel's circuit screen plays it (../../../shell/CircuitScreen.jsx): its
// premises down the left, the goal on the right, the rules and the lemmas as parts (a game's pieces.json, the lemmas
// registered by the course), a box's regions on the same board. Each test provides the premises and goal.
// A card holds the schema's letters and shows them as the test's
// sentences: its sentences are built in the language of the level's own (choices.js), its choices worked out by the
// domain's resources on the test on view.
import { T } from '../../../shell/i18n.js'
import { parse, replaceAtoms } from '../formula.js'
import { choicesOf } from '../choices.js'
import { vocabulary } from '../fol.js'
import { sentencePicker } from '../sentenceLanguage.js'
import { scriptLines } from '../script.js'
import { runProof } from '../proof.js'
import { proofReadout, proofTextOf as textOf } from '../circuit-readouts.js'

/** The language a card's sentence is built in: the pieces of the level's sentences, each letter read as the test's. */
function language(task, test) {
  const offer = choicesOf(task)
  const consts = task.consts ?? []
  const text = textOf(task, test)
  const arity = new Map(vocabulary(offer.formula).preds)
  const lettered = Object.entries(test?.subst ?? {}).map(([letter, to]) => [letter, arity.get(letter) > 0 && to.op === 'atom' && task.notation.words?.[to.pred] ? task.notation.words[to.pred] : T(text(to), text(to))])
  const notation = { ...task.notation, words: { ...task.notation.words, ...Object.fromEntries(lettered) } }
  const read = (value) => parse(value, { consts })
  return sentencePicker(offer.formula, { read, consts, notation, text: (value) => text(replaceAtoms(read(value), test?.subst ?? {})) })
}

export const proofScreen = {
  course: (game) => game.logic.proofBoards,
  play: { ...proofReadout, runLevel: (task, board, _parts, options) => runProof(task, board, options) },
  language,
  context: (task, test) => ({ task, text: textOf(task, test) }),
  // A script the proof follows, a line each, indented as its blocks are.
  told: (task, test) => (task.script ? scriptLines(task.script, (t) => textOf(task, test)(parse(t, { consts: [...(task.consts ?? []), ...(task.things ?? [])] }))).map(([depth, text]) => ({ text: `${'  '.repeat(depth)}${text}` })) : []),
  readouts: (_task, _circuit, { score }) => [{ value: score.steps, label: T('步数') }],
  says: { done: T('证明完毕') },
  canvas: { height: 150, emptyNote: T('从上方元件栏选择规则放到板上，再把元件右侧的圆点连到另一元件左侧的圆点。') },
}
