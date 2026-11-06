import { test } from 'node:test'
import assert from 'node:assert/strict'
import { visionCourse } from './course.js'
import { game, level, circuit, builds } from './fixture.js'
import { runLevel } from './run.js'

const content = () => game({ levels: [
  level('base', circuit('double', { inputs: ['a'], adds: ['arithmetic', 'const'], solution: ['p = arithmetic[op=add](a,a)', 'out <- p'] }), { builds: builds('processor') }),
  level('upgrade', circuit('pair', { inputs: ['a', 'b'], outputs: ['sum', 'delta'], carry: 'base', solution: ['p = arithmetic[op=add](a,b)', 'd = arithmetic[op=sub](a,b)', 'sum <- p', 'delta <- d'] }), { builds: builds('processor') }),
  level('consumer', circuit('use', { inputs: ['a', 'b'], solution: ['p = processor(a,b)', 'out <- p.sum'] })),
] })
const task = (v, id) => v.played.get(id).at(-1)
const call = (v, type, inputs, outputs) => {
  const t = circuit('call', { inputs: Object.keys(inputs), outputs: Object.keys(outputs), tests: [{ inputs, expect: outputs }] })
  const result = v.board.fromText([`p = ${type}(${Object.keys(inputs).join(',')})`, ...Object.keys(outputs).map((o) => `${o} <- ${Object.keys(outputs).length > 1 ? `p.${o}` : 'p'}`)], t, v)
  return runLevel(t, result, v.partOf)
}

test('one part switches to the deepest passed revision, including its interface and edit destination', () => {
  const v = visionCourse(content())
  const first = task(v, 'base'), second = task(v, 'upgrade')
  const custom = v.board.fromText(['three = const[value=3]()', 'p = arithmetic[op=mul](a,three)', 'out <- p'], first, v)
  v.syncOwn({ double: custom })
  assert.equal(v.builtBy('processor'), first)
  assert.deepEqual(v.partOf('processor').inputs, ['a'])
  assert.equal(v.partOf('processor').opens().circuit, custom)
  assert.equal(call(v, 'processor', { a: 2 }, { out: 6 }).pass, true)
  v.syncOwn({ double: custom, pair: second.solution })
  assert.equal(v.builtBy('processor'), second)
  assert.deepEqual(v.partOf('processor').inputs, ['a', 'b'])
  assert.equal(v.partOf('processor').opens().level, second)
  assert.equal(call(v, 'processor', { a: 7, b: 2 }, { sum: 9, delta: 5 }).pass, true)
  // Replaying an earlier builder never imports the later revision's interface.
  const earlier = v.forTask(first)
  assert.equal(earlier.builtBy('processor'), first)
  assert.equal(call(earlier, 'processor', { a: 2 }, { out: 6 }).pass, true)
  assert.equal(v.forTask(first), earlier)
})

test('an upgrade starts from the published internal board and never offers its own assembly', () => {
  const c = content()
  c.levels[1].tasks[0].starter = ['extra = const[value=5]()']
  const v = visionCourse(c), first = task(v, 'base'), next = task(v, 'upgrade')
  const saved = { ...first.solution, nodes: first.solution.nodes.map((n) => n.id === 'p' ? { ...n, x: 377, y: 211 } : n) }
  const open = v.opening(next, { double: saved })
  assert.deepEqual(open.nodes.find((n) => n.id === 'p'), saved.nodes.find((n) => n.id === 'p'))
  assert.ok(open.wires.some((w) => w.from === 'a' && w.to === 'p'))
  assert.ok(open.nodes.some((n) => n.id === 'b'))
  assert.equal(open.nodes.find((n) => n.id === 'extra').params.value, '5')
  assert.ok(!open.nodes.some((n) => n.type === 'processor'))
  const offered = v.offerIn(next, ['processor'])
  assert.ok(![...offered.shown, ...offered.folded].includes('processor'))
  assert.ok(v.offerIn(task(v, 'consumer'), ['processor']).shown.includes('processor'))
})

test('an upgrade on another prerequisite branch is rejected', () => {
  const c = content()
  c.eras[0].foundation = [{ parallel: [{ id: 'a', levels: ['base'] }, { id: 'b', levels: ['upgrade'] }] }, 'consumer']
  assert.ok(visionCourse(c).wrong.some((s) => s.includes('must form a prerequisite chain')))
})


test('a consumer between revisions reads and round-trips the interface available on its path', () => {
  const c = content()
  c.levels.splice(1, 0, level('earlierUse', circuit('oldCall', { inputs: ['a'], solution: ['p = processor(a)', 'out <- p'] })))
  c.eras[0].foundation.splice(1, 0, 'earlierUse')
  const v = visionCourse(c)
  assert.deepEqual(v.wrong, [])
  const bp = v.blueprints.find((b) => b.key === 'oldCall')
  assert.deepEqual(bp.write(bp.read(bp.write(bp.board))), bp.write(bp.board))
  assert.deepEqual(v.forTask(task(v, 'earlierUse')).partOf('processor').inputs, ['a'])
})
