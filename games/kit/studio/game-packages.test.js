import { test } from 'node:test'
import assert from 'node:assert/strict'
import { missingDependencies, packageAddOps, packageRemoveOps } from './game-packages.js'

const packages = [{ id: 'base', version: '1.0.0', uses: {  } }, { id: 'mid', version: '1.0.0', uses: { 'base': '^1.0.0' } }, { id: 'top', version: '1.0.0', uses: { 'mid': '^1.0.0', 'base': '^1.0.0' } }, { id: 'side', version: '1.0.0', uses: {  } }]

test('a package goes into a game after the dependencies it lacks, deepest first', () => {
  assert.deepEqual(missingDependencies(packages, [], 'top'), ['base', 'mid'])
  assert.deepEqual(missingDependencies(packages, ['base'], 'top'), ['mid'])
  assert.deepEqual(missingDependencies(packages, [], 'side'), [])
  assert.deepEqual(packageAddOps(packages, ['base'], 'top'), [{ op: 'game.package.add', package: 'mid', range: '^1.0.0' }, { op: 'game.package.add', package: 'top', range: '^1.0.0' }])
  assert.deepEqual(packageRemoveOps('side'), [{ op: 'game.package.remove', package: 'side' }])
})
