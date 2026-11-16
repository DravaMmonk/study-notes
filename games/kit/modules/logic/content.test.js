import { resolve } from 'node:path'
import { starterPieces } from '../../engine/ops/fixture.js'
// The logic domain on its content: boards as blueprint text both ways, a course's data read into its levels (test
// cases, words), and the parts the player builds running the player's board; on a course written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runBoard } from '../../engine/boards.js'
import { logicWorks } from './work.js'
import { fixedTray } from '../../course.js'
import { chipsOf } from './formulaTree.js'
import { parse } from './formula.js'
import { render } from './notation.js'
import { printLines } from '../../circuit/text.js'
import { primitivesOnly } from '../../engine/board-cards.js'
import { PROOF_BOARD, runProof, startProof } from './proof.js'
import { GATE_BOARD, checkGates, gateParts, rowsFor, startGates } from './gates.js'
import { deepFreeze } from '../../engine/content.js'
import { readStarter } from '../../engine/content-node.js'
import { trayDisplay } from '../../engine/trays.js'
import domain from './runtime.js'

const L = (zh, en = zh) => ({ zh, en })
// A level of one task (its id the level's): what it says once, then the task.
const ONCE = ['title', 'intro', 'after', 'adds', 'fold', 'without']
const one = ({ id, ...fields }) => ({
  id,
  ...Object.fromEntries(Object.entries(fields).filter(([k]) => ONCE.includes(k))),
  tasks: [{ id, ...Object.fromEntries(Object.entries(fields).filter(([k]) => !ONCE.includes(k))) }],
})
const proofLevel = (id, fields) => one({ id, kind: 'logic:proof', title: L(id), ...fields })
const box = (head, body, out) => [`${head} {`, '  body {', ...body.map((l) => `    ${l}`), '  }', '}', `goal <- ${out}`]
// A course of every shape this file reads: a gate built on a truth circuit, a lemma built and used, a lemma of two
// shapes built by a level of two tasks and used by another, first-order levels with names and properties, a proposition
// quantified, a level whose letters read through symbolicWords, and a machine.
const GATE = { kind: 'logic:gates', target: 'Rain ∨ Wind', solution: ['n1 = gNot(Rain)', 'n2 = gNot(Wind)', 'a = gAnd(n1, n2)', 'n3 = gNot(a)', 'out <- n3'] }
const CHAIN = { kind: 'logic:proof', tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C' }],
  solution: box('f = impI[A=A](body: m2)', ["m1 = mp(p, f.body)", "m2 = mp(q, m1)"], 'f') }
const halfOf = (form, goal) => ({
  kind: 'logic:proof', tests: [{ premises: { p: 'A ∧ B' }, goal }], solution: ["e = andE(p)", `goal <- e.${form}`],
})
const CONTENT = {
  words: ['everyday'],
  registries: { wordset: {
    everyday: { Rain: L('下雨', 'it rains'), Wind: L('刮风', 'it is windy'), Wet: L('地湿', 'the ground is wet'), Slip: L('路滑', 'the road is slippery'), Bright: L('{0}很亮', '{0} is bright'), Seen: L('{0}看得见', '{0} can be seen'), i: L('安', 'Ann'), j: L('博', 'Bo') },
    stars: { a: L('晨星', 'the Morning Star'), b: L('昏星', 'the Evening Star'), i: L('晨星', 'the Morning Star'), j: L('昏星', 'the Evening Star') },
    properties: { P: L('{0}具有该性质', '{0} has that property'), Q: L('{0}具有该性质', '{0} has that property') },
  } },
  primitives: ['gNot', 'gAnd', 'mp', 'impI', 'andI', 'andE', 'allE', 'allI', 'rewrite'],
  // The parts the starter defines (its pieces/<name>.json: the gates and the proof rules), and the pieces built here: a gate,
  // a lemma, and a lemma of two shapes, each shape the proof of a task.
  partDefs: { parts: {
    ...Object.fromEntries(Object.entries(starterPieces(new URL('../../templates/logic/', import.meta.url).pathname).parts).filter(([, p]) => !p.inside)),
    gOr: { name: L('或', 'Or'), desc: L('d'), family: 'logic:family-gate', inside: [{ id: 'base', reference: GATE }] },
    chain: { name: L('串联', 'Chain'), desc: L('d'), family: 'logic:family-lemma', settings: Object.fromEntries(['A', 'B', 'C'].map((key) => [key, { control: 'tree' }])), inside: [{ id: 'base', reference: CHAIN }] },
    half: { name: L('取一半', 'Half'), desc: L('d'), family: 'logic:family-lemma', settings: Object.fromEntries(['A', 'B'].map((key) => [key, { control: 'tree' }])), inside: [{ id: 'left', form: 'left', label: 'A ∧ B ⟹ A', reference: halfOf('left', 'A') }, { id: 'right', form: 'right', label: 'A ∧ B ⟹ B', reference: halfOf('right', 'B') }] },
  } },
  eras: [{ id: 'one', machine: null, levels: [{ id: 'or' }, { id: 'chain' }, { id: 'useChain' }, { id: 'half' }, { id: 'useHalf' }, { id: 'eqSym' }, { id: 'andDef' }, { id: 'eqUse' }, { id: 'eqTerm' }, { id: 'rows' }, { id: 'negate' }], links: [{ from: 'or', to: 'chain' }, { from: 'chain', to: 'useChain' }, { from: 'useChain', to: 'half' }, { from: 'half', to: 'useHalf' }, { from: 'useHalf', to: 'eqSym' }, { from: 'eqSym', to: 'andDef' }, { from: 'andDef', to: 'eqUse' }, { from: 'eqUse', to: 'eqTerm' }, { from: 'eqTerm', to: 'rows' }, { from: 'rows', to: 'negate' }], chapter: { title: L('c'), question: L('q') } }],
  levels: [
    one({ id: 'or', publishes: [{ piece: 'gOr', variant: 'base' }], kind: 'logic:gates', adds: ['formulaOr'], title: L('or'), target: 'Rain ∨ Wind', brief: L('b'), solution: ['n1 = gNot(Rain)', 'n2 = gNot(Wind)', 'a = gAnd(n1, n2)', 'n3 = gNot(a)', 'out <- n3'] }),
    proofLevel('chain', { publishes: [{ piece: 'chain', variant: 'base' }], title: L('接起来', 'Join them'), adds: ['formulaImplies', 'formulaAnd', 'formulaForall'], tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C' }], cases: [{ A: 'Rain', B: 'Wet', C: 'Slip' }],
      solution: box('f = impI[A=A](body: m2)', ["m1 = mp(p, f.body)", "m2 = mp(q, m1)"], 'f') }),
    proofLevel('useChain', { tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C' }], cases: [{ A: 'Wind', B: 'Wet', C: 'Slip' }], solution: ['c = chain(p, q)', 'goal <- c'] }),
    { id: 'half', title: L('half'), tasks: [
      { id: 'half_l', publishes: [{ piece: 'half', variant: 'left' }], kind: 'logic:proof', step: L('l'), tests: [{ premises: { p: 'A ∧ B' }, goal: 'A' }], cases: [{ A: 'Rain', B: 'Wet' }], solution: ["e = andE(p)", 'goal <- e.left'] },
      { id: 'half_r', publishes: [{ piece: 'half', variant: 'right' }], kind: 'logic:proof', step: L('r'), tests: [{ premises: { p: 'A ∧ B' }, goal: 'B' }], cases: [{ A: 'Rain', B: 'Wet' }], solution: ["e = andE(p)", 'goal <- e.right'] },
    ] },
    { id: 'useHalf', title: L('useHalf'), tasks: [
      { id: 'useHalf_l', kind: 'logic:proof', step: L('l'), tests: [{ premises: { p: 'A ∧ B' }, goal: 'A ∧ A' }], cases: [{ A: 'Rain', B: 'Wet' }], solution: ['h = half(p)', "c = andI(h, h)", 'goal <- c'] },
      { id: 'useHalf_r', kind: 'logic:proof', step: L('r'), tests: [{ premises: { p: 'A ∧ B' }, goal: 'B ∧ B' }], cases: [{ A: 'Rain', B: 'Wet' }], solution: ['h = half[form=right](p)', "c = andI(h, h)", 'goal <- c'] },
    ] },
    proofLevel('eqSym', { consts: ['i', 'j'], propertyWords: true, words: ['everyday', 'stars', 'properties'], tests: [{ premises: { e: '∀P. P(i) → P(j)' }, goal: '∀Q. Q(j) → Q(i)' }], cases: [], brief: L('b'),
      solution: ['s = allI[x=Q](body: m) {', '  body {', '    f = impI[A="Q(i)"](body: f.body)', '    i = allE[t="Q(x) -> Q(i)"](e)', "    m = mp(i, f)", '  }', '}', 'goal <- s'] }),
    { id: 'andDef', title: L('andDef'), tasks: [
      { id: 'andDef_s', kind: 'logic:proof', step: L('s'), tests: [{ premises: { p: 'A', q: 'B' }, goal: '∀R. (A → (B → R)) → R' }], cases: [{ A: 'Rain', B: 'Wind' }],
        solution: ['s = allI[x=R](body: f) {', '  body {', '    f = impI[A="A -> B -> R"](body: m2) {', '      body {', "        m1 = mp(f.body, p)", "        m2 = mp(m1, q)", '      }', '    }', '  }', '}', 'goal <- s'] },
      { id: 'andDef_t', kind: 'logic:proof', step: L('t'), tests: [{ premises: { p: 'A ∧ B' }, goal: 'A' }], cases: [{ A: 'Rain', B: 'Wind' }], solution: ["e = andE(p)", 'goal <- e.left'] },
    ] },
    proofLevel('eqUse', { words: ['everyday', 'stars'], consts: ['a', 'b'], tests: [{ premises: { p: 'a = b', q: 'P(a)', t: '∀x. P(x) → Q(x)' }, goal: 'Q(b)' }], cases: [{ P: 'Bright', Q: 'Seen' }],
      solution: ['r = rewrite[at=[0]](p, q)', 'e = allE[t=b](t)', "m = mp(e, r)", 'goal <- m'] }),
    { id: 'eqTerm', title: L('eqTerm'), words: ['everyday', 'stars'], symbolicWords: { Bright: L('P({0})') }, consts: ['i', 'j'], tasks: [
      { id: 'eqTerm_w', kind: 'logic:proof', step: L('w'), tests: [{ premises: { p: 'i = j', q: 'Bright(i)' }, goal: 'Bright(j)' }], cases: [], brief: L('b'), solution: ['w = rewrite[at=[0]](p, q)', 'goal <- w'] },
      { id: 'eqTerm_x', kind: 'logic:proof', step: L('x'), tests: [{ premises: { p: 'i = j', q: 'Bright(i)' }, goal: 'Bright(j)' }], cases: [], brief: L('b'), solution: ['w = rewrite[at=[0]](p, q)', 'goal <- w'] },
    ] },
    proofLevel('rows', { symbolicWords: { Rain: L('A'), Wet: L('B'), Slip: L('C') }, cases: [], brief: L('b'), tests: [{ premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Wet ∧ Slip' }],
      solution: box('f = impI[A=Rain](body: c)', ["m1 = mp(p, f.body)", "m2 = mp(q, m1)", "c = andI(m1, m2)"], 'f') }),
    one({ id: 'negate', kind: 'logic:machine', title: L('negate'), adds: ['raa', 'impI', 'rule'], want: 'logic:want-becomes', inputs: [{ name: 'in', label: L('目标', 'Goal') }], backtrack: true, brief: L('b'),
      tests: [{ goal: 'Wet', hyps: ['Rain → Wet', 'Rain'], becomes: [['Rain → Wet; Rain; ¬Wet ⊢ ⊥']] }],
      solution: ["c0r0 = raa()", "c1r0 = impI()", "c0 = rule(in, c0r0)", "c1 = rule(c0, c1r0)", 'out <- c1'] }),
  ],
}
const course = logicWorks(CONTENT)
const syncOwn = course.syncOwn
const level = (id) => course.LEVELS.find((l) => l.id === id)
// A level of one task, as read.
const only = (id) => level(id).tasks[0]

test('the course written here reads without fault', () => {
  assert.deepEqual(course.wrong, [])
})

test('machine text play and author checks run hidden cases without showing their inputs to the player', async () => {
  const content = structuredClone(CONTENT)
  content.glossary = { entries: [] }
  const source = content.levels.find(({ id }) => id === 'negate').tasks[0]
  source.hidden = [{ ...source.tests[0], goal: 'Slip' }]
  const spec = domain.spec(content)
  const { logic } = spec
  const task = spec.levels.find(({ id }) => id === 'negate').tasks[0]
  const game = { logic, circuit: { forTask: (task) => logic.circuitFor(task).forTask(task) }, defined: { of: (type) => logic.defs[type] } }
  const ctx = { game, level: { kind: 'logic:machine', source: task }, flags: new Set(), progress: { built: {}, all: true, passed: [], solved: [] } }
  const opened = domain.play.open(ctx)
  assert.equal(opened.tests.length, 1)
  assert.equal(opened.notes.length, 1)
  const verdict = domain.play.attempt(ctx, source.solution.join('\n'))
  assert.equal(verdict.pass, false)
  assert.deepEqual(verdict.tests.map(({ pass }) => pass), [true])
  assert.deepEqual([verdict.hidden.count, verdict.hidden.failed], [1, 1])
  const lines = await domain.validate(spec)
  assert.ok(lines.some(({ level, fail, text }) => level === 'negate' && fail && text.includes('machine FAIL')))
})

test('a proof reads from blueprint text and prints back the same', () => {
  const lines = ['f = impI[A=B](body: g) {', '  body {', '    g = impI[A=C](body: p)', '  }', '}', 'goal <- f']
  const one = { tests: [{ premises: { p: 'A' }, goal: 'B → (C → A)' }] }
  const circuit = primitivesOnly(PROOF_BOARD, only('chain').parts)
  const board = PROOF_BOARD.fromText(lines, one, circuit)
  assert.deepEqual(board.nodes.find((n) => n.id === 'g'), { ...board.nodes.find((n) => n.id === 'g'), type: 'impI', params: { A: 'C' }, in: 'f/body' })
  assert.deepEqual(PROOF_BOARD.toText(board, one, circuit), lines)
  // A sentence on a card is written in ASCII and read back in the game's symbols.
  const and = PROOF_BOARD.fromText(['f = impI[A="A & B"](body: p)', 'goal <- f'], one, circuit)
  assert.equal(and.nodes.find((n) => n.id === 'f').params.A, 'A ∧ B')
})

test('blueprint text that does not fit the board says which line', () => {
  const one = { tests: [{ premises: { p: 'A' }, goal: 'A' }] }
  const circuit = primitivesOnly(PROOF_BOARD, only('chain').parts)
  assert.throws(() => PROOF_BOARD.fromText(["m = mp(p, nope)", 'goal <- unknown'], one, circuit), (error) => {
    assert.equal(error.line, 1)
    assert.match(error.en, /nope/)
    assert.deepEqual(error.errors.map(({ line }) => line), [1, 2])
    return true
  })
})

test('every reference answer prints back as the text it was read from: proofs, a lemma used, a gate, a machine', () => {
  const kinds = new Set()
  for (const l of course.LEVELS) {
    for (const t of l.tasks) {
      const raw = CONTENT.levels.find((x) => x.id === l.id).tasks[t.task].solution
      kinds.add(t.kind)
      const circuit = course.circuitFor(t).forTask(t)
      const parts = circuit.board.wiring(t, circuit)
      const authored = course.blueprints.find((entry) => entry.key === t.taskId && !entry.naive)
      assert.deepEqual(authored.write(authored.read(raw)), raw, `${l.id} ${t.task}`)
      assert.deepEqual(printLines(t.solution, parts), raw, `${l.id} ${t.task} in play`)
    }
  }
  assert.deepEqual([...kinds].sort(), ['logic:gates', 'logic:machine', 'logic:proof'])
})

test('proof tasks offer a concrete default and a symbolic final case', () => {
  for (const entry of course.LEVELS) for (const t of entry.tasks) {
    if (t.kind !== 'logic:proof') continue
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
  const primitives = primitivesOnly(GATE_BOARD, { gNot: gates.gNot, gAnd: gates.gAnd })
  const or = (board) => {
    syncOwn(board ? { or: board } : {})
    const alone = { nodes: [...startGates(builder).nodes, { id: 'x', type: 'gOr', params: {} }], wires: [{ from: 'Rain', to: 'x', port: 'a' }, { from: 'Wind', to: 'x', port: 'b' }, { from: 'x', to: 'out', port: 'in' }] }
    return rowsFor(builder).rows.map(({ row }) => runBoard(alone, { parts: gateParts(gates), bind: row }).outputs.out)
  }
  const truth = rowsFor(builder).rows.map((r) => r.want)
  assert.deepEqual(or(null), truth)
  // The player's own board (another way to wire or) is what the gate runs: its inside is that board.
  const own = GATE_BOARD.fromText(['a = gNot(Wind)', 'b = gNot(Rain)', 'c = gAnd(b, a)', 'd = gNot(c)', 'out <- d'], builder, primitives)
  assert.equal(checkGates(builder, own).pass, true)
  assert.deepEqual(or(own), truth)
  assert.ok(gates.gOr.opens().circuit.nodes.some((n) => n.id === 'c'))
  // A board changed after passing (it now gives "and") is not the gate.
  const broken = GATE_BOARD.fromText(['c = gAnd(Rain, Wind)', 'out <- c'], builder, primitives)
  assert.deepEqual(or(broken), truth)
  assert.ok(gates.gOr.opens().circuit.nodes.some((n) => n.id === 'n3'))
  syncOwn({})
})

test('a lemma runs the proof the player passed its level with, a level of tasks one shape a task', () => {
  const run = (id, task) => {
    const t = level(id).tasks[task]
    return runProof(t, t.solution)
  }
  const chain = only('chain')
  const circuit = primitivesOnly(PROOF_BOARD, chain.parts)
  const read = (lines, one) => PROOF_BOARD.fromText(lines, one, circuit)
  // The player's own proof of chain, a detour through ∧: the lemma runs it, and the level built on chain still passes.
  const own = read(['f = impI[A=A](body: m2) {', '  body {', "    m1 = mp(p, f.body)", "    b = andI(m1, m1)", "    e = andE(b)", "    m2 = mp(q, e.left)", '  }', '}', 'goal <- f'], chain)
  assert.equal(runProof(chain, own).pass, true)
  syncOwn({ chain: own })
  assert.equal(course.proofs.chain[''].board(), own)
  // Another read of the same content (another game of the domain in this process) keeps its own boards.
  const other = logicWorks(CONTENT)
  assert.notEqual(other.proofs.chain[''].board(), own)
  assert.equal(run('useChain', 0).pass, true)
  syncOwn({ chain: { ...own, wires: [...own.wires, { from: 'missing', to: 'goal', port: 'in' }] } })
  assert.equal(course.proofs.chain[''].board(), chain.pieceSolution)
  // A kept proof that does not prove chain's statement: the level built on it cannot pass, and says why.
  syncOwn({ chain: read(['f = impI[A=A](body: m1) {', '  body {', "    m1 = mp(p, f.body)", '  }', '}', 'goal <- f'], chain) })
  const broken = run('useChain', 0)
  assert.equal(broken.pass, false)
  assert.match(broken.runs[0].errors.get('c').zh, /^「串联」照「接起来」一关的证明来证，在这里证不出/)
  // Half's two shapes are the two tasks of the level that builds it: useHalf's first task runs the first one's board
  // alone.
  const empty = (one) => ({ nodes: startProof(one).nodes, wires: [] })
  const [left, right] = level('half').tasks
  const [useLeft, useRight] = level('useHalf').tasks
  const selected = (task, work = task.solution) => course.proofBoards.runtimeReferences(task, work)
  const brokenRight = empty(right)
  syncOwn({ half_r: brokenRight })
  assert.equal(course.proofs.half.left.board(), left.pieceSolution)
  assert.deepEqual(selected(useLeft), [{ key: 'half_l', task: left, work: left.pieceSolution }])
  assert.deepEqual(selected(useRight), [{ key: 'half_r', task: right, work: brokenRight }])
  assert.deepEqual(course.workReferences(useRight, useRight.solution), selected(useRight))
  const obsolete = { ...useRight.solution, nodes: useRight.solution.nodes.map((n) => n.type === 'half' ? { ...n, params: { ...n.params, form: 'obsolete' } } : n) }
  assert.deepEqual(selected(useRight, obsolete), selected(useLeft))
  assert.equal(run('useHalf', 0).pass, true)
  assert.equal(run('useHalf', 1).pass, false)
  syncOwn({ half_l: empty(left) })
  assert.equal(run('useHalf', 0).pass, false)
  assert.equal(run('useHalf', 1).pass, true)
  syncOwn({})
})

test('reading a game on the domain never writes into its content', () => {
  const spec = domain.spec(deepFreeze(readStarter(resolve(import.meta.dirname, '../../templates', import.meta.dirname.split('/').at(-1)))))
  assert.deepEqual(spec.logic.wrong, [])
  // The parts the player builds run the boards kept for them, or their levels' reference boards.
  spec.syncOwn({})
  for (const shapes of Object.values(spec.logic.proofs)) for (const { board } of Object.values(shapes)) assert.ok(board().nodes)
  for (const gate of Object.values(spec.logic.gates)) assert.ok(gate.opens().circuit.nodes)
})


test('formula chips use the registered pieces and keep contextual names', () => {
  const content = readStarter(resolve(import.meta.dirname, '../../templates', import.meta.dirname.split('/').at(-1)))
  const level = logicWorks(content).LEVELS.at(-1).tasks.at(-1)
  const chips = chipsOf({
    kind: 'logic:translate', notation: level.notation, vocab: { preds: [['Rain', 0]], consts: [] },
  })
  const not = chips.find((chip) => chip.key === '¬')
  const rain = chips.find((chip) => chip.key === 'P:Rain')
  assert.equal(not.piece.type, 'starter/formulaNot')
  assert.equal(not.make().op, '¬')
  assert.equal(rain.make().pred, 'Rain')
  assert.ok(level.notation.symbols.includes('∨'))
})

test('formula and circuit groups share a task, combining in order and respecting unlocks', () => {
  const content = readStarter(resolve(import.meta.dirname, '../../templates', import.meta.dirname.split('/').at(-1)))
  content.trays = {
    gates: { name: 'Gates', desc: 'Logic gates', items: ['starter/gNot', 'starter/gAnd'] },
    basic: { name: 'Basic', desc: 'Basic symbols', items: ['starter/formulaAnd', 'starter/formulaNot'] },
    extended: { name: 'Extended', desc: 'Additional symbols', items: ['starter/formulaOr', 'starter/formulaNot'] },
  }
  const levels = content.levels
  const first = levels.find(({ id }) => id === 'starter/g-not')
  first.tray = ['gates', 'basic', 'extended']
  const last = levels.find(({ id }) => id === 'starter/g-use')
  last.tray = ['gates', 'extended', 'basic']
  last.without = ['starter/formulaNot']
  const logic = logicWorks(content)
  const read = (id) => logic.LEVELS.find((level) => level.id === id).tasks[0]
  const chips = (id) => chipsOf({
    kind: 'logic:translate', notation: read(id).notation, vocab: { preds: [['Rain', 0]], consts: [] },
  }).map(({ key }) => key)

  assert.deepEqual(chips('starter/g-not'), ['P:Rain', '¬'])
  assert.deepEqual(chips('starter/g-use'), ['P:Rain', '∨', '∧'])
  assert.deepEqual(fixedTray(logic.course, read('starter/g-use')), ['starter/gNot', 'starter/gAnd', 'starter/formulaOr', 'starter/formulaNot', 'starter/formulaAnd'])
  const { shown, folded, types } = logic.offerIn(read('starter/g-use'), new Set())
  assert.deepEqual(types, [...shown, ...folded])
  assert.ok(types.every((type) => ['starter/gNot', 'starter/gAnd'].includes(type)))
})

test('a proof tray groups disjunction rules and leaves truth gates off the proof board', () => {
  const content = structuredClone(CONTENT)
  content.trays = { proof: { name: 'Proof', desc: '', items: [{ id: 'or', title: 'Or', items: ['orI', 'orE'] }] } }
  content.levels[0].tray = 'proof'
  const logic = logicWorks(content)
  const task = logic.LEVELS[0].tasks[0]
  const display = trayDisplay(logic.course.trays, ['proof'], [{ type: 'orI' }, { type: 'orE' }], [])
  assert.equal(display.items[0].label, 'Or')
  assert.deepEqual(display.items[0].children.map(({ type }) => type), ['orI', 'orE'])
  assert.ok(!logic.proofBoards.forTask(task).offerIn(task, new Set()).types.includes('gOr'))
})

test('a machine reference can use rule cards granted by its task', () => {
  const content = structuredClone(CONTENT)
  const level = content.levels.at(-1)
  level.tasks[0].rules = { own: { name: L('Own rule'), premises: [], conclusion: 'A' } }
  const logic = logicWorks(content)
  const task = logic.LEVELS.at(-1).tasks[0]
  assert.ok(logic.course.gives(task).includes('own'))
})
