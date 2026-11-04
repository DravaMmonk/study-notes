import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fits, fromText, toText } from './board.js'
import { migrateInputGroups } from './input-groups.js'
import { runLevel } from './run.js'
import domain from './domain.js'
import { builds, circuit, game, level } from './fixture.js'

// G weights three neighbours with grouped weights and builds a part; H reuses that part with its weights ungrouped.
const weights = { left: 0.25, centre: 0.5, right: 0.25 }
const groups = [{ name: 'weights', label: { zh: 'w', en: 'w' }, inputs: ['left', 'centre', 'right'] }]
const grouped = () => game({ levels: [
  level('G', circuit('g_line', {
    inputs: ['image', 'left', 'centre', 'right', { name: 'd', type: 'vector' }], inputGroups: groups, adds: ['const', 'shift', 'arithmetic'],
    configurations: { 'arithmetic.op': ['add', 'mul'], '*.outside': ['zero'] },
    tests: [{ inputs: { image: [[0, 0, 1, 0, 0]], ...weights, d: {x:1,y:0} }, expect: { out: [[0, 0.25, 0.5, 0.25, 0]] } }],
    hidden: [{ inputs: { image: [[1, 3]], left: 1, centre: 0, right: -1, d: {x:1,y:0} }, expect: { out: [[-3, 1]] } }],
    solution: ['minus = const[value=-1]()', 'negative = arithmetic[op=mul](d,minus)', 'l = shift(image,negative)', 'r = shift(image,d)', 'a = arithmetic[op=mul](l,left)', 'b = arithmetic[op=mul](image,centre)', 'c = arithmetic[op=mul](r,right)', 'ab = arithmetic[op=add](a,b)', 'total = arithmetic[op=add](ab,c)', 'out <- total'],
  }), { builds: builds('weightedLine') }),
  level('H', circuit('h_twice', {
    inputs: ['image', 'left', 'centre', 'right', { name: 'd', type: 'vector' }],
    tests: [{ inputs: { image: [[0, 0, 1, 0, 0]], ...weights, d: {x:1,y:0} }, expect: { out: [[0.0625, 0.25, 0.375, 0.25, 0.0625]] } }],
    solution: ['p = weightedLine(image,left,centre,right,d)', 'q = weightedLine(p,left,centre,right,d)', 'out <- q'],
  })),
] })

test('grouped weights retain saved wiring, alternate boards and reusable packed behaviour', () => {
  const content = grouped()
  const vision = domain.spec(content).vision
  assert.deepEqual(vision.wrong, [])
  const task = vision.builtBy('weightedLine')
  const raw = content.levels[0].tasks[0]
  const old = fromText(raw.solution, { ...task, inputGroups: undefined }, vision.partOf)
  assert.equal(old.nodes.filter((node) => node.type === 'in').length, 5, 'a board saved before grouping has one source an input')
  const saved = { data: { [task.taskId]: old }, built: { [task.taskId]: old }, slots: { [task.taskId]: { boards: [old, old], at: 1 } }, passed: [task.taskId] }
  const migrated = migrateInputGroups(saved, [task])
  for (const board of [migrated.data[task.taskId], migrated.built[task.taskId], ...migrated.slots[task.taskId].boards]) {
    assert.equal(board.wires.length, old.wires.length)
    assert.equal(board.nodes.filter((node) => node.type === 'in').length, 3)
    assert.ok(fits(board, task, vision.partOf))
    assert.ok(runLevel({ ...task, tests: [...task.tests, ...task.hidden] }, board, vision.partOf).pass)
    const edges = (value) => value.wires.map((wire) => JSON.stringify(wire)).sort()
    assert.deepEqual(edges(fromText(toText(board, vision.partOf), task, vision.partOf)), edges(board))
  }
  assert.deepEqual(migrateInputGroups(migrated, [task]), migrated)
  assert.equal(saved.data[task.taskId], old)
  assert.deepEqual(migrated.passed, saved.passed)
  vision.syncOwn(migrated.built)
  const next = vision.played.get('H')[0]
  assert.ok(runLevel({ ...next, tests: [...next.tests, ...next.hidden] }, next.solution, vision.partOf).pass, 'the packed part keeps its ungrouped signature')
  vision.syncOwn()
})

test('input groups reject missing and duplicate logical inputs', () => {
  const content = grouped()
  content.levels[0].tasks[0].inputGroups[0].inputs = ['left', 'left', 'missing']
  assert.ok(domain.spec(content).vision.wrong.some((message) => message.includes('grouped input')))
  const clash = grouped()
  clash.levels[0].tasks[0].inputGroups[0].name = 'image'
  assert.ok(domain.spec(clash).vision.wrong.some((message) => message.includes('duplicate input group name')))
})
