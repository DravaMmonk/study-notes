import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { fits, fromText, toText } from './board.js'
import { migrateInputGroups } from './input-groups.js'
import { runLevel } from './run.js'
import domain from './domain.js'

test('grouped weights retain saved wiring, alternate boards and reusable packed behaviour', () => {
  const content = readContent('vision-lab')
  const vision = domain.spec(content).vision
  const task = vision.builtBy('weightedLine')
  const raw = content.levels.find((level) => level.id === '1-1').tasks.find((entry) => entry.id === task.taskId)
  const old = fromText(raw.solution, { ...task, inputGroups: undefined }, vision.partOf)
  const saved = { data: { [task.taskId]: old }, built: { [task.taskId]: old }, slots: { [task.taskId]: { boards: [old, old], at: 1 } }, passed: [task.taskId] }
  const migrated = migrateInputGroups(saved, [task])
  for (const board of [migrated.data[task.taskId], migrated.built[task.taskId], ...migrated.slots[task.taskId].boards]) {
    assert.equal(board.wires.length, old.wires.length)
    assert.equal(board.nodes.filter((node) => node.type === 'in').length, 2)
    assert.ok(fits(board, task, vision.partOf))
    assert.ok(runLevel({ ...task, tests: [...task.tests, ...task.hidden] }, board, vision.partOf).pass)
    const edges = (value) => value.wires.map((wire) => JSON.stringify(wire)).sort()
    assert.deepEqual(edges(fromText(toText(board, vision.partOf), task, vision.partOf)), edges(board))
  }
  assert.deepEqual(migrateInputGroups(migrated, [task]), migrated)
  assert.equal(saved.data[task.taskId], old)
  assert.deepEqual(migrated.passed, saved.passed)
  vision.syncOwn(migrated.built)
  const next = vision.played.get('1-2')[0]
  assert.ok(runLevel({ ...next, tests: [...next.tests, ...next.hidden] }, next.solution, vision.partOf).pass)
})

test('input groups reject missing and duplicate logical inputs', () => {
  const content = readContent('vision-lab')
  const task = content.levels.find((level) => level.id === '1-1').tasks[0]
  task.inputGroups[0].inputs = ['left', 'left', 'missing']
  assert.ok(domain.spec(content).vision.wrong.some((message) => message.includes('grouped input')))
})
