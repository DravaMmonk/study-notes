// node --test games/kit/domains/syntax — sentence analysis: tokens and spans, folding and its refusals, the check of an
// analysis against the answer, the order folds can be made in, and the level checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { check, fold, foldRefusal, mark, order, resolve, say, skeleton, standing, targetRefusal, tokenize, units, unfold } from './engine/sentence.js'
import { sentenceProblems } from './validate.js'

const T = (zh, en) => ({ zh, en })
const spec = {
  sentence: 'A small change in the weights of the first layer causes a large change in the output.',
  folds: [
    { span: 'of the first layer', type: 'pp', to: 'weights' },
    { span: 'in the weights of the first layer', type: 'pp', to: 'change#1', misread: { causes: T('动作', 'the action') } },
    { span: 'in the output', type: 'pp', to: 'change#2' },
  ],
  roles: { subj: 'A small change', verb: 'causes', obj: 'a large change' },
  misrole: { subj: { 'the first layer': T('层', 'the layer') } },
}
const gold = resolve(spec)
const at = (phrase) => {
  const words = tokenize(phrase).map((t) => t.text)
  const i = gold.tokens.findIndex((_, k) => words.every((w, n) => gold.tokens[k + n]?.text === w))
  return [i, i + words.length - 1]
}
const empty = { folds: [], roles: {} }

test('a sentence is tokens, and an answer written in words becomes indices', () => {
  assert.deepEqual(tokenize('Our model, which runs, wins.').map((t) => t.text), ['Our', 'model', ',', 'which', 'runs', ',', 'wins', '.'])
  assert.equal(say(tokenize('Our model, which runs, wins.'), 0, 7), 'Our model, which runs, wins.')
  assert.deepEqual(gold.problems, [])
  assert.equal(gold.folds.length, 3)
  assert.equal(gold.tokens[gold.folds[1].to].text, 'change')
  assert.equal(gold.folds[2].to, at('large change')[1])
  assert.match(resolve({ ...spec, folds: [{ span: 'change', type: 'pp', to: 'causes' }] }).problems[0], /occurs 2 times/)
  assert.match(resolve({ ...spec, roles: { subj: 'no such words' } }).problems[0], /not in the sentence/)
})

test('folds stand for their words, nest, and never cross', () => {
  let a = fold(empty, ...at('of the first layer'), 'pp', at('weights')[0])
  const [x, y] = at('in the weights of the first layer')
  a = fold(a, x, y, 'pp', at('change')[0])
  assert.deepEqual(units(gold.tokens, a.folds).filter((u) => u.kind === 'fold').map((u) => [u.a, u.b]), [[x, y]])
  assert.ok(foldRefusal(a, x, y)) // folded already
  assert.ok(foldRefusal(a, at('weights')[0], at('causes')[0])) // would cut through a fold
  assert.equal(foldRefusal(a, x, at('causes')[0]), null)
  assert.ok(targetRefusal(gold.tokens, a, x, y, at('weights')[0])) // inside itself
  assert.ok(targetRefusal(gold.tokens, a, ...at('in the output'), at('first')[0])) // folded away
  assert.ok(targetRefusal(gold.tokens, a, ...at('in the output'), gold.tokens.length - 1)) // the full stop
  // Unfolding the outer piece leaves the inner one.
  assert.equal(unfold(a, a.folds[1]).folds.length, 1)
  assert.deepEqual(standing(gold.tokens, a.folds, [0, 4]), [0, 1, 2])
})

test('the answer passes; what is wrong is said, and missing folds are only counted', () => {
  assert.ok(check(gold, { folds: gold.folds, roles: gold.roles }).pass)
  const half = { folds: [gold.folds[0]], roles: gold.roles }
  const r = check(gold, half)
  assert.equal(r.pass, false)
  assert.ok(r.findings.some((f) => /2 modifiers/.test(f.en)))
  // A fold on the wrong word: the level's misreading, or a plain one.
  const wrong = { ...gold.folds[1], to: at('causes')[0] }
  assert.equal(check(gold, { folds: [gold.folds[0], wrong, gold.folds[2]], roles: gold.roles }).findings[0].en, 'the action')
  const plain = { ...gold.folds[2], to: at('causes')[0] }
  assert.match(check(gold, { folds: [gold.folds[0], gold.folds[1], plain], roles: gold.roles }).findings[0].en, /tells about “causes”/)
  // The wrong construction, wrong edges, a piece that is no modifier.
  assert.match(check(gold, { folds: [{ ...gold.folds[0], type: 'rel' }], roles: {} }).findings[0].en, /not a relative clause/)
  const [o, p] = at('in the output')
  assert.match(check(gold, { folds: [{ a: o, b: p - 1, type: 'pp', to: at('large change')[1] }], roles: {} }).findings[0].en, /wrong edges/)
  assert.match(check(gold, { folds: [{ a: at('causes')[0], b: at('causes')[0], type: 'pp', to: 0 }], roles: {} }).findings[0].en, /not one whole modifier/)
})

test('roles: a noun phrase may leave out its little words, the verb group may not, and a mixed-in modifier is named', () => {
  const folded = { folds: gold.folds, roles: {} }
  const withRoles = (roles) => check(gold, { ...folded, roles: { verb: gold.roles.verb, obj: gold.roles.obj, ...roles } })
  assert.ok(withRoles({ subj: at('small change') }).pass)
  assert.equal(withRoles({ subj: at('A small') }).pass, false) // no head word
  const unfolded = check(gold, { folds: [gold.folds[2]], roles: { ...gold.roles, subj: [0, at('layer')[0]] } })
  assert.ok(unfolded.findings.some((f) => /mixed in/.test(f.en)))
  // A stretch the level has a word for (keyed by its standing words), marked before the modifiers are folded.
  const early = check(gold, { folds: [gold.folds[2]], roles: { ...gold.roles, subj: at('the first layer') } })
  assert.ok(early.findings.some((f) => f.en === 'the layer'))
  assert.ok(check(gold, { ...folded, roles: { ...gold.roles, comp: at('the output') } }).findings.some((f) => /no complement/.test(f.en)))
  assert.ok(check(gold, { ...folded, roles: { subj: gold.roles.subj } }).findings.some((f) => /verb is not marked/.test(f.en)))
  assert.ok(check(gold, folded).findings.some((f) => /skeleton is not marked/.test(f.en)))
  // Marking the same stretch again takes the mark off.
  assert.deepEqual(mark(mark(empty, 'subj', 0, 2), 'subj', 0, 2).roles, {})
  assert.equal(skeleton(gold), 'A small change causes a large change.')
})

test('folds are made inner first, and before a fold that would hide their word', () => {
  const made = order(gold.folds)
  assert.ok(made.indexOf(gold.folds[0]) < made.indexOf(gold.folds[1]))
  // A modifier goes with its word: folded apart from the piece that holds that word, it is refused and reported.
  const ok = ['pp', 'role:subj', 'role:verb']
  const zoo = (outer) => resolve({ sentence: 'The size of models in the zoo grows.', folds: [{ span: outer, type: 'pp', to: 'size' }, { span: 'in the zoo', type: 'pp', to: 'models' }], roles: { subj: 'The size', verb: 'grows' } })
  assert.deepEqual(sentenceProblems(zoo('of models in the zoo'), ok), [])
  assert.ok(sentenceProblems(zoo('of models'), ok).some((p) => /lies outside it/.test(p)))
  const inner = zoo('of models in the zoo').folds[1]
  assert.ok(foldRefusal({ folds: [inner], roles: {} }, 2, 3)) // 'of models' alone, leaving 'in the zoo' outside
})

test('the level checks catch a bad answer', () => {
  const ok = ['pp', 'role:subj', 'role:verb', 'role:obj']
  assert.deepEqual(sentenceProblems(gold, ok), [])
  assert.ok(sentenceProblems(gold, ['pp', 'role:subj', 'role:verb']).some((p) => /obj is not reached/.test(p)))
  const self = resolve({ ...spec, folds: [{ span: 'in the output', type: 'pp', to: 'output' }] })
  assert.ok(sentenceProblems(self, ok).some((p) => /inside itself/.test(p)))
  const crossed = resolve({ ...spec, folds: [{ span: 'the weights of', type: 'pp', to: 'causes' }, { span: 'of the first layer', type: 'pp', to: 'weights' }] })
  assert.ok(sentenceProblems(crossed, ok).some((p) => /cross/.test(p)))
})
