// The logic domain on its content: boards as blueprint text both ways, a course's data read into its levels (test
// cases, words), and the parts the player builds running the player's board; on a course written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runBoard } from '../../engine/boards.js'
import { logicCourse } from './course.js'
import { parse } from './formula.js'
import { render } from './notation.js'
import { fromLines, gateShape, machineShape, proofShape, toLines } from './blueprint.js'
import { LOGIC_TESTS, startProof } from './proof.js'
import { runOutputTests } from '../../engine/test-run.js'
import { checkGates, gateParts, rowsFor, startGates } from './gates.js'
import { deepFreeze } from '../../engine/content.js'
import { readContent } from '../../engine/content-node.js'
import domain from './domain.js'

const L = (zh, en = zh) => ({ zh, en })
// A level of one task (its id the level's): what it says once, then the task.
const ONCE = ['title', 'intro', 'after', 'adds', 'fold', 'without', 'showcase', 'builds', 'fact', 'symbols']
const one = ({ id, ...fields }) => ({
  id,
  ...Object.fromEntries(Object.entries(fields).filter(([k]) => ONCE.includes(k))),
  tasks: [{ id, ...Object.fromEntries(Object.entries(fields).filter(([k]) => !ONCE.includes(k))) }],
})
const proofLevel = (id, fields) => one({ id, kind: 'proof', title: L(id), ...fields })
const box = (head, body, out) => [`${head} {`, '  body {', ...body.map((l) => `    ${l}`), '  }', '}', `goal <- ${out}`]
// A course of every shape this file reads: a gate built on a truth circuit, a lemma built and used, a lemma of two
// shapes built by a level of two tasks and used by another, first-order levels with names and properties, a proposition
// quantified, a level whose letters read through symbolicWords, and a machine.
const CONTENT = {
  words: ['everyday'],
  wordSets: {
    everyday: { Rain: L('下雨', 'it rains'), Wind: L('刮风', 'it is windy'), Wet: L('地湿', 'the ground is wet'), Slip: L('路滑', 'the road is slippery'), Bright: L('{0}很亮', '{0} is bright'), Seen: L('{0}看得见', '{0} can be seen'), i: L('安', 'Ann'), j: L('博', 'Bo') },
    stars: { a: L('晨星', 'the Morning Star'), b: L('昏星', 'the Evening Star'), i: L('晨星', 'the Morning Star'), j: L('昏星', 'the Evening Star') },
    properties: { P: L('{0}具有该性质', '{0} has that property'), Q: L('{0}具有该性质', '{0} has that property') },
  },
  primitives: ['gNot', 'gAnd', 'mp', 'impI', 'andI', 'andE', 'allE', 'allI', 'rewrite'],
  lemmas: {
    chain: { name: L('串联', 'Chain'), desc: L('d'), statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'], ports: ['A → B', 'B → C'] },
    half: { name: L('取一半', 'Half'), desc: L('d'), metas: ['A', 'B'], ports: ['A ∧ B'], forms: [
      { key: 'left', label: 'A ∧ B ⟹ A', statement: 'A', premises: ['A ∧ B'] },
      { key: 'right', label: 'A ∧ B ⟹ B', statement: 'B', premises: ['A ∧ B'] },
    ] },
  },
  gates: { gOr: { name: L('或', 'Or'), desc: L('d'), ports: ['a', 'b'] } },
  // The parts the starter defines (its parts.json): the gates and the proof rules.
  partDefs: readContent('starter', import.meta.dirname).partDefs,
  revisions: { half: [{ by: 'half', forms: ['right'] }] },
  eras: [{ id: 'one', machine: null, foundation: ['or', 'chain', 'useChain', 'half', 'useHalf', 'eqSym', 'andDef', 'eqUse', 'eqTerm', 'rows', 'negate'], chapter: { title: L('c'), question: L('q') } }],
  levels: [
    one({ id: 'or', kind: 'gates', symbols: ['∨'], title: L('or'), target: 'Rain ∨ Wind', builds: 'gOr', brief: L('b'), solution: ['n1 = gNot(Rain)', 'n2 = gNot(Wind)', 'a = gAnd(n1, n2)', 'n3 = gNot(a)', 'out <- n3'] }),
    proofLevel('chain', { title: L('接起来', 'Join them'), symbols: ['→', '∧', '∀'], builds: 'chain', tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C' }], cases: [{ A: 'Rain', B: 'Wet', C: 'Slip' }],
      solution: box('f = impI[A=A](body: m2)', ['m1 = mp(p, f.body)', 'm2 = mp(q, m1)'], 'f') }),
    proofLevel('useChain', { tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C' }], cases: [{ A: 'Wind', B: 'Wet', C: 'Slip' }], solution: ['c = chain(p, q)', 'goal <- c'] }),
    { id: 'half', title: L('half'), builds: 'half', tasks: [
      { id: 'half_l', kind: 'proof', step: L('l'), tests: [{ premises: { p: 'A ∧ B' }, goal: 'A' }], cases: [{ A: 'Rain', B: 'Wet' }], solution: ['e = andE(p)', 'goal <- e.left'] },
      { id: 'half_r', kind: 'proof', step: L('r'), tests: [{ premises: { p: 'A ∧ B' }, goal: 'B' }], cases: [{ A: 'Rain', B: 'Wet' }], solution: ['e = andE(p)', 'goal <- e.right'] },
    ] },
    { id: 'useHalf', title: L('useHalf'), tasks: [
      { id: 'useHalf_l', kind: 'proof', step: L('l'), tests: [{ premises: { p: 'A ∧ B' }, goal: 'A ∧ A' }], cases: [{ A: 'Rain', B: 'Wet' }], solution: ['h = half(p)', 'c = andI(h, h)', 'goal <- c'] },
      { id: 'useHalf_r', kind: 'proof', step: L('r'), tests: [{ premises: { p: 'A ∧ B' }, goal: 'B ∧ B' }], cases: [{ A: 'Rain', B: 'Wet' }], solution: ['h = half[form=right](p)', 'c = andI(h, h)', 'goal <- c'] },
    ] },
    proofLevel('eqSym', { consts: ['i', 'j'], propertyWords: true, words: ['everyday', 'stars', 'properties'], tests: [{ premises: { e: '∀P. P(i) → P(j)' }, goal: '∀Q. Q(j) → Q(i)' }], cases: [], brief: L('b'),
      solution: ['s = allI[x=Q](body: m) {', '  body {', '    f = impI[A="Q(i)"](body: f.body)', '    i = allE[t="Q(x) -> Q(i)"](e)', '    m = mp(i, f)', '  }', '}', 'goal <- s'] }),
    { id: 'andDef', title: L('andDef'), tasks: [
      { id: 'andDef_s', kind: 'proof', step: L('s'), tests: [{ premises: { p: 'A', q: 'B' }, goal: '∀R. (A → (B → R)) → R' }], cases: [{ A: 'Rain', B: 'Wind' }],
        solution: ['s = allI[x=R](body: f) {', '  body {', '    f = impI[A="A -> B -> R"](body: m2) {', '      body {', '        m1 = mp(f.body, p)', '        m2 = mp(m1, q)', '      }', '    }', '  }', '}', 'goal <- s'] },
      { id: 'andDef_t', kind: 'proof', step: L('t'), tests: [{ premises: { p: 'A ∧ B' }, goal: 'A' }], cases: [{ A: 'Rain', B: 'Wind' }], solution: ['e = andE(p)', 'goal <- e.left'] },
    ] },
    proofLevel('eqUse', { words: ['everyday', 'stars'], consts: ['a', 'b'], tests: [{ premises: { p: 'a = b', q: 'P(a)', t: '∀x. P(x) → Q(x)' }, goal: 'Q(b)' }], cases: [{ P: 'Bright', Q: 'Seen' }],
      solution: ['r = rewrite[at=[0]](p, q)', 'e = allE[t=b](t)', 'm = mp(e, r)', 'goal <- m'] }),
    { id: 'eqTerm', title: L('eqTerm'), words: ['everyday', 'stars'], symbolicWords: { Bright: L('P({0})') }, consts: ['i', 'j'], tasks: [
      { id: 'eqTerm_w', kind: 'proof', step: L('w'), tests: [{ premises: { p: 'i = j', q: 'Bright(i)' }, goal: 'Bright(j)' }], cases: [], brief: L('b'), solution: ['w = rewrite[at=[0]](p, q)', 'goal <- w'] },
      { id: 'eqTerm_x', kind: 'proof', step: L('x'), tests: [{ premises: { p: 'i = j', q: 'Bright(i)' }, goal: 'Bright(j)' }], cases: [], brief: L('b'), solution: ['w = rewrite[at=[0]](p, q)', 'goal <- w'] },
    ] },
    proofLevel('rows', { symbolicWords: { Rain: L('A'), Wet: L('B'), Slip: L('C') }, cases: [], brief: L('b'), tests: [{ premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Wet ∧ Slip' }],
      solution: box('f = impI[A=Rain](body: c)', ['m1 = mp(p, f.body)', 'm2 = mp(q, m1)', 'c = andI(m1, m2)'], 'f') }),
    one({ id: 'negate', kind: 'machine', title: L('negate'), adds: ['raa', 'impI', 'rule'], want: 'becomes', inputs: [{ name: 'in', label: L('目标', 'Goal') }], backtrack: true, brief: L('b'),
      tests: [{ goal: 'Wet', hyps: ['Rain → Wet', 'Rain'], becomes: [['Rain → Wet; Rain; ¬Wet ⊢ ⊥']] }],
      solution: ['c0r0 = raa()', 'c1r0 = impI()', 'c0 = rule(in, c0r0)', 'c1 = rule(c0, c1r0)', 'out <- c1'] }),
  ],
}
const course = logicCourse(CONTENT)
const syncOwn = course.syncOwn
const level = (id) => course.LEVELS.find((l) => l.id === id)
// A level of one task, as read.
const only = (id) => level(id).tasks[0]

test('the course written here reads without fault', () => {
  assert.deepEqual(course.wrong, [])
})

test('a proof reads from blueprint text and prints back the same', () => {
  const lines = ['f = impI[A=B](body: g) {', '  body {', '    g = impI[A=C](body: p)', '  }', '}', 'goal <- f']
  const one = { tests: [{ premises: { p: 'A' }, goal: 'B → (C → A)' }] }
  const shape = proofShape(only('chain').parts)
  const board = fromLines(lines, startProof(one), shape, Object.keys(only('chain').parts))
  assert.deepEqual(board.nodes.find((n) => n.id === 'g'), { ...board.nodes.find((n) => n.id === 'g'), type: 'impI', params: { A: 'C' }, in: 'f/body' })
  assert.deepEqual(toLines(board, shape), lines)
  // A sentence on a card is written in ASCII and read back in the game's symbols.
  const and = fromLines(['f = impI[A="A & B"](body: p)', 'goal <- f'], startProof(one), shape, Object.keys(only('chain').parts))
  assert.equal(and.nodes.find((n) => n.id === 'f').params.A, 'A ∧ B')
})

test('blueprint text that does not fit the board says which line', () => {
  const one = { tests: [{ premises: { p: 'A' }, goal: 'A' }] }
  const shape = proofShape(only('chain').parts)
  assert.throws(() => fromLines(['m = mp(p, nope)', 'goal <- m'], startProof(one), shape, Object.keys(only('chain').parts)), /Line 1/)
})

test('every reference answer prints back as the text it was read from: proofs, a lemma used, a gate, a machine', () => {
  const kinds = new Set()
  for (const l of course.LEVELS) {
    for (const t of l.tasks) {
      const raw = CONTENT.levels.find((x) => x.id === l.id).tasks[t.task].solution
      kinds.add(t.kind)
      const shape = t.kind === 'proof' ? proofShape(t.parts) : t.kind === 'machine' ? machineShape(t) : t.kind === 'gates' ? gateShape(t.gates) : null
      if (shape) assert.deepEqual(toLines(t.solution, shape), raw, `${l.id} ${t.task}`)
    }
  }
  assert.deepEqual([...kinds].sort(), ['gates', 'machine', 'proof'])
})

test('proof tasks offer a concrete default and a symbolic final case', () => {
  for (const entry of course.LEVELS) for (const t of entry.tasks) {
    if (t.kind !== 'proof') continue
    assert.ok(t.tests.length >= 2, entry.id)
    assert.notEqual(t.tests[0].symbolic, true, entry.id)
    assert.equal(t.tests.at(-1).symbolic, true, entry.id)
    assert.equal(t.tests.at(-1).label.zh, '字母', entry.id)
  }
})

test('equality cases use object names by default and letters in the symbolic case', () => {
  const l = only('eqSym')
  const [concrete, symbolic] = l.tests
  const formula = (one) => parse(one.goal, { consts: l.consts })
  assert.match(render(formula(concrete), l.notation, 'zh'), /任意性质.*昏星.*晨星/)
  assert.doesNotMatch(render(formula(concrete), l.notation, 'zh'), /[PQ]/)
  assert.match(render(formula(concrete), l.notation, 'en'), /every property.*Evening Star.*Morning Star/)
  assert.match(render(formula(symbolic), { ...l.notation, words: null }, 'zh'), /Q\(j\).*Q\(i\)/)
  assert.match(symbolic.caseBrief.zh, /Q\(j\).*Q\(i\)/)
})

test('higher-order propositions use words only in the concrete case', () => {
  const t = level('andDef').tasks[0]
  assert.match(render(parse(t.tests[0].goal), t.notation, 'zh'), /任意命题.*该命题/)
  assert.match(render(parse(t.tests.at(-1).goal), { ...t.notation, words: null }, 'zh'), /∀R/)
})

test('the task brief is symbolic while concrete cases remain concrete', () => {
  const l = only('eqUse')
  assert.match(l.tests.at(-1).caseBrief.zh, /a = b.*P\(a\).*Q\(b\)/)
  assert.doesNotMatch(l.tests.at(-1).caseBrief.zh, /晨星|昏星/)
  assert.match(render(parse(l.tests[0].goal, { consts: l.consts }), l.notation, 'zh'), /昏星/)
  assert.match(level('eqTerm').tasks[0].tests.at(-1).caseBrief.zh, /P\(i\).*P\(j\)/)
  assert.match(only('rows').tests.at(-1).caseBrief.zh, /A → B.*B → C/)
})

test('a level reads its letters in the word sets it names, merged in order', () => {
  // The everyday words, the stars' names over the people's, and the properties P, Q.
  const words = only('eqSym').notation.words
  assert.equal(words.Rain.zh, '下雨')
  assert.equal(words.i.zh, '晨星')
  assert.match(words.P.zh, /具有该性质/)
})

test('a gate the player built runs the board it passed with; one that no longer passes leaves the reference', () => {
  const builder = only('or')
  const gates = builder.gates
  const or = (board) => {
    syncOwn(board ? { or: board } : {})
    const alone = { nodes: [...startGates(builder).nodes, { id: 'x', type: 'gOr', params: {} }], wires: [{ from: 'Rain', to: 'x', port: 'a' }, { from: 'Wind', to: 'x', port: 'b' }, { from: 'x', to: 'out', port: 'in' }] }
    return rowsFor(builder).rows.map(({ row }) => runBoard(alone, { parts: gateParts(gates), bind: row }).outputs.out)
  }
  const truth = rowsFor(builder).rows.map((r) => r.want)
  assert.deepEqual(or(null), truth)
  // The player's own board (another way to wire or) is what the gate runs: its inside is that board.
  const own = fromLines(['a = gNot(Wind)', 'b = gNot(Rain)', 'c = gAnd(b, a)', 'd = gNot(c)', 'out <- d'], startGates(builder), gateShape(gates), ['gNot', 'gAnd'])
  assert.equal(checkGates(builder, own).pass, true)
  assert.deepEqual(or(own), truth)
  assert.ok(gates.gOr.opens().circuit.nodes.some((n) => n.id === 'c'))
  // A board changed after passing (it now gives "and") is not the gate.
  const broken = fromLines(['c = gAnd(Rain, Wind)', 'out <- c'], startGates(builder), gateShape(gates), ['gNot', 'gAnd'])
  assert.deepEqual(or(broken), truth)
  assert.ok(gates.gOr.opens().circuit.nodes.some((n) => n.id === 'n3'))
  syncOwn({})
})

test('a lemma runs the proof the player passed its level with, a level of tasks one shape a task', () => {
  const run = (id, task) => {
    const t = level(id).tasks[task]
    return runOutputTests(LOGIC_TESTS, t, t.solution)
  }
  const chain = only('chain')
  const shape = proofShape(chain.parts)
  const read = (lines, one) => fromLines(lines, startProof(one), shape, Object.keys(chain.parts))
  // The player's own proof of chain, a detour through ∧: the lemma runs it, and the level built on chain still passes.
  const own = read(['f = impI[A=A](body: m2) {', '  body {', '    m1 = mp(p, f.body)', '    b = andI(m1, m1)', '    e = andE(b)', '    m2 = mp(q, e.left)', '  }', '}', 'goal <- f'], chain)
  assert.equal(runOutputTests(LOGIC_TESTS, chain, own).pass, true)
  syncOwn({ chain: own })
  assert.equal(course.proofs.chain[''].board(), own)
  // Another read of the same content (another game of the domain in this process) keeps its own boards.
  const other = logicCourse(CONTENT)
  assert.notEqual(other.proofs.chain[''].board(), own)
  assert.equal(run('useChain', 0).pass, true)
  // A kept proof that does not prove chain's statement: the level built on it cannot pass, and says why.
  syncOwn({ chain: read(['f = impI[A=A](body: m1) {', '  body {', '    m1 = mp(p, f.body)', '  }', '}', 'goal <- f'], chain) })
  const broken = run('useChain', 0)
  assert.equal(broken.pass, false)
  assert.match(broken.results[0].errors.get('c').zh, /^「串联」照「接起来」一关的证明来证，在这里证不出/)
  // Half's two shapes are the two tasks of the level that builds it: useHalf's first task runs the first one's board
  // alone.
  const empty = (one) => ({ nodes: startProof(one).nodes, wires: [] })
  const [left, right] = level('half').tasks
  syncOwn({ half_r: empty(right) })
  assert.equal(course.proofs.half.left.board(), left.solution)
  assert.equal(run('useHalf', 0).pass, true)
  assert.equal(run('useHalf', 1).pass, false)
  syncOwn({ half_l: empty(left) })
  assert.equal(run('useHalf', 0).pass, false)
  assert.equal(run('useHalf', 1).pass, true)
  syncOwn({})
})

test('reading a game on the domain never writes into its content', () => {
  const spec = domain.spec(deepFreeze(readContent('starter', import.meta.dirname)))
  assert.deepEqual(spec.logic.wrong, [])
  // The parts the player builds run the boards kept for them, or their levels' reference boards.
  spec.syncOwn({})
  for (const shapes of Object.values(spec.logic.proofs)) for (const { board } of Object.values(shapes)) assert.ok(board().nodes)
  for (const gate of Object.values(spec.logic.gates)) assert.ok(gate.opens().circuit.nodes)
})
