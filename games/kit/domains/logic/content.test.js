// The logic domain on its content: boards as blueprint text both ways, the save migrations content names, the
// courses of 《证明完毕》 read from its data (test cases, words, save history), and the parts the player builds
// running the player's board.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { runBoard } from '../../engine/boards.js'
import { migrations } from '../../shell/saves.js'
import { logicCourse } from './course.js'
import { parse } from './formula.js'
import { render } from './notation.js'
import { fromLines, gateShape, machineShape, proofShape, toLines } from './blueprint.js'
import { startProof } from './proof.js'
import { checkGates, gateParts, rowsFor, startGates } from './gates.js'
import { migration, savesOf } from './items/migrations.js'
import { syncOwn } from './built.js'

const QED = readContent('qed')
const course = logicCourse(QED)
const level = (id) => course.LEVELS.find((l) => l.id === id)

test('a proof reads from blueprint text and prints back the same', () => {
  const lines = ['f = impI[A=B](body: g) {', '  body {', '    g = impI[A=C](body: p)', '  }', '}', 'goal <- f']
  const one = { tests: [{ premises: { p: 'A' }, goal: 'B → (C → A)' }] }
  const shape = proofShape()
  const board = fromLines(lines, startProof(one), shape, Object.keys(shape.rules))
  assert.deepEqual(board.nodes.find((n) => n.id === 'g'), { ...board.nodes.find((n) => n.id === 'g'), type: 'impI', params: { A: 'C' }, in: 'f/body' })
  assert.deepEqual(toLines(board, shape), lines)
  // A sentence on a card is written in ASCII and read back in the game's symbols.
  const and = fromLines(['f = impI[A="A & B"](body: p)', 'goal <- f'], startProof(one), shape, Object.keys(shape.rules))
  assert.equal(and.nodes.find((n) => n.id === 'f').params.A, 'A ∧ B')
})

test('blueprint text that does not fit the board says which line', () => {
  const one = { tests: [{ premises: { p: 'A' }, goal: 'A' }] }
  const shape = proofShape()
  assert.throws(() => fromLines(['m = mp(p, nope)', 'goal <- m'], startProof(one), shape, Object.keys(shape.rules)), /Line 1/)
})

test('every reference answer of the course prints back as the text it was read from', () => {
  for (const l of course.LEVELS) {
    for (const one of l.tasks ?? [l]) {
      const raw = (QED.levels.find((x) => x.id === l.id).tasks?.[one.task] ?? QED.levels.find((x) => x.id === l.id)).solution
      const shape = one.kind === 'proof' ? proofShape(one.lemmas) : one.kind === 'machine' ? machineShape(one) : one.kind === 'gates' ? gateShape(one.gates) : null
      if (shape) assert.deepEqual(toLines(one.solution, shape), raw, `${l.id} ${one.task ?? ''}`)
    }
  }
})

test('proof tasks offer a concrete default and a symbolic final case', () => {
  for (const entry of course.LEVELS) for (const one of entry.tasks ?? [entry]) {
    if (one.kind !== 'proof') continue
    assert.ok(one.tests.length >= 2, entry.id)
    assert.notEqual(one.tests[0].symbolic, true, entry.id)
    assert.equal(one.tests.at(-1).symbolic, true, entry.id)
    assert.equal(one.tests.at(-1).label.zh, '字母', entry.id)
  }
})

test('equality cases use object names by default and letters in the symbolic case', () => {
  const l = level('h-eq-sym')
  const [concrete, symbolic] = l.tests
  const formula = (one) => parse(one.goal, { consts: l.consts })
  assert.match(render(formula(concrete), l.notation, 'zh'), /任意性质.*昏星.*晨星/)
  assert.doesNotMatch(render(formula(concrete), l.notation, 'zh'), /[PQ]/)
  assert.match(render(formula(concrete), l.notation, 'en'), /every property.*Evening Star.*Morning Star/)
  assert.match(render(formula(symbolic), { ...l.notation, words: null }, 'zh'), /Q\(j\).*Q\(i\)/)
  assert.match(symbolic.caseBrief.zh, /Q\(j\).*Q\(i\)/)
})

test('higher-order propositions use words only in the concrete case', () => {
  const one = level('h-and-make').tasks[0]
  assert.match(render(parse(one.tests[0].goal), one.notation, 'zh'), /任意命题.*该命题/)
  assert.match(render(parse(one.tests.at(-1).goal), { ...one.notation, words: null }, 'zh'), /∀R/)
})

test('the task brief is symbolic while concrete cases remain concrete', () => {
  const l = level('q-eq')
  assert.match(l.tests.at(-1).caseBrief.zh, /a = b.*P\(a\).*Q\(b\)/)
  assert.doesNotMatch(l.tests.at(-1).caseBrief.zh, /晨星|昏星/)
  assert.match(render(parse(l.tests[0].goal, { consts: l.consts }), l.notation, 'zh'), /昏星/)
  assert.match(level('eq-rec').tasks[0].tests.at(-1).caseBrief.zh, /P\(i\).*P\(j\)/)
  assert.match(level('sc-rows').tasks[1].tests.at(-1).caseBrief.zh, /A → B.*B → C/)
})

test('a level reads its letters in the word sets it names, merged in order', () => {
  // 一阶的相等: the everyday words, the stars' names over the people's, and the properties P, Q.
  const words = level('h-eq-sym').notation.words
  assert.equal(words.Rain.zh, '下雨')
  assert.equal(words.i.zh, '晨星')
  assert.match(words.P.zh, /具有该性质/)
})

test('save migrations: reshaping a level’s task boards, renaming things, counting tasks passed', () => {
  const reshape = migration({ reshape: { a: { list: [null, { slice: [1] }], one: [null, 'it'] }, b: { list: { at: 0, or: 'drop' } } } })
  assert.deepEqual(reshape([1, 2, 3], 'a'), [null, 2, 3])
  assert.deepEqual(reshape({ nodes: [] }, 'a'), [null, { nodes: [] }])
  assert.equal(reshape([null], 'b'), undefined)
  assert.deepEqual(reshape([1], 'c'), [1])
  const names = migration({ objectNames: { names: { ann: 'i', phos: 'i' }, at: { eq: { phos: 'a' } } } })
  assert.deepEqual(names({ nodes: [{ params: { t: 'phos', f: 'Parent(ann, x)' } }], consts: { ann: 0 }, unchanged: 'announce' }, 'other'), { nodes: [{ params: { t: 'i', f: 'Parent(i, x)' } }], consts: { i: 0 }, unchanged: 'announce' })
  assert.deepEqual(names({ t: 'phos' }, 'eq'), { t: 'a' })
  const [{ ops: [{ tasks }] }] = savesOf([{ version: 2, ops: [{ tasks: { passed: { a: { less: 2 }, b: 0, c: { most: 1 } } } }] }])
  assert.deepEqual([tasks(3, 'a'), tasks(1, 'a'), tasks(2, 'b'), tasks(3, 'c'), tasks(3, 'd')], [1, 0, 0, 1, 3])
})

test('an old save migrates through the whole history and keeps its progress', () => {
  const { migrate, version } = migrations(savesOf(QED.saves))
  const old = { version: 77, solved: ['q-eq', 'g-or'], data: { 'q-eq': { nodes: [{ params: { t: 'hesp' } }] }, 'g-or': { nodes: [{ id: 'x', type: 'gNot' }], wires: [] } }, built: { 'q-sym': { nodes: [{ params: { t: 'phos' } }] } }, slots: { 'q-eq': { list: [{ data: { nodes: [{ params: { t: 'phos' } }] } }] } } }
  const saved = migrate(old)
  assert.equal(version, Math.max(...QED.saves.map((s) => s.version)))
  assert.deepEqual(saved.solved, ['q-eq', 'g-or'])
  assert.equal(saved.data['q-eq'].nodes[0].params.t, 'b')
  assert.equal(saved.built['q-sym'].nodes[0].params.t, 'i')
  assert.equal(saved.slots['q-eq'].list[0].data.nodes[0].params.t, 'a')
  // A gate solved before gates ran the player's board: its board is the gate's now.
  assert.deepEqual(saved.built['g-or'], old.data['g-or'])
})

test('a gate the player built runs the board it passed with; one that no longer passes leaves the reference', () => {
  const builder = level('g-or')
  const gates = builder.gates
  const or = (board) => {
    syncOwn(board ? { 'g-or': board } : {})
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
