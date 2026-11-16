import { test } from 'node:test'
import assert from 'node:assert/strict'
import { missingDependencies, packageAddOps, packageRemoveOps } from './game-packages.js'

const packages = [{ id: 'base', uses: [] }, { id: 'mid', uses: ['base'] }, { id: 'top', uses: ['mid', 'base'] }, { id: 'side', uses: [] }]

test('a package goes into a game after the dependencies it lacks, deepest first', () => {
  assert.deepEqual(missingDependencies(packages, [], 'top'), ['base', 'mid'])
  assert.deepEqual(missingDependencies(packages, ['base'], 'top'), ['mid'])
  assert.deepEqual(missingDependencies(packages, [], 'side'), [])
  assert.deepEqual(packageAddOps(packages, ['base'], 'top'), [{ op: 'game.package.add', package: 'mid' }, { op: 'game.package.add', package: 'top' }])
  assert.deepEqual(packageRemoveOps('side'), [{ op: 'game.package.remove', package: 'side' }])
})
