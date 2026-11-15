import { test } from 'node:test'
import assert from 'node:assert/strict'
import { playOf } from './plays.js'
import { bindPlays } from '../shell/plays.js'

test('a task can select a play distinct from its content kind', () => {
  const plays = { rules: {}, audit: {} }
  assert.equal(playOf(plays, { kind: 'rules' }), plays.rules)
  assert.equal(playOf(plays, { kind: 'rules', playId: 'audit' }), plays.audit)
  assert.throws(() => playOf(plays, { kind: 'rules', playId: 'missing', key: 'second' }), /missing.*second/)
})

test('a headless declaration binds to the named renderer and icon', () => {
  const rows = () => null
  const icon = () => null
  const rule = { view: 'rows', icon: 'rule', sections: ['editor'] }
  const { declare } = bindPlays({ declare: rule }, { rows }, { rule: icon })
  assert.equal(declare.Screen, rows)
  assert.equal(declare.icon, icon)
  assert.deepEqual(declare.sections, ['editor'])
  assert.equal(rule.icon, 'rule')
  assert.throws(() => bindPlays({ declare: rule }, {}, { rule: icon }), /declare.*rows/)
})
