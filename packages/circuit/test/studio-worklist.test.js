import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterItems, itemOf, ruleOf, stepIn, tally } from '../../../games/kit/studio/worklist.js'
import { registerPlugins } from '../../../games/kit/engine/plugins.js'
import { installStudioPlugins } from '../../../games/kit/studio/editors.js'
import * as core from '../core/index.js'
installStudioPlugins(await registerPlugins([{ id: 'circuit', core }]))

test('the check’s lines as a worklist: severity, rule, levels; filtered and stepped through', () => {
  assert.equal(ruleOf('content: levels/a.json.title: is not a text'), 'content')
  assert.equal(ruleOf('text levels.1.hint[0] has no English'), 'copy')
  assert.equal(ruleOf('course: on a tray, and no level brings it in or builds it (1): x@a'), 'tray-unmet')
  assert.equal(ruleOf("OPEN course: offered before the level that builds it (2, on the game's work list): x@a"), 'built-later')
  assert.equal(ruleOf('course: left open in game.json, but met now (not-built): drop x@a'), 'not-built')
  assert.equal(ruleOf('REPORT difficulty-spike: a costs 3.0 attempts'), 'difficulty-spike')
  assert.equal(ruleOf('a links the entry x, which opens later (at b)'), 'links')
  assert.equal(ruleOf('a 甲: answer PASS (2 tests)'), 'domain')
  const items = [
    { text: 'a 甲: answer PASS', levels: ['a'] },
    { fail: true, text: 'b: the answer fails test 1', levels: ['b'] },
    { text: 'REPORT difficulty-spike: a costs 3.0 attempts', levels: ['a'] },
    { fail: true, text: 'content: levels/a.json.n: not an integer', levels: ['a'] },
    { text: 'OPEN course: offered, but no level builds it and it is not a primitive (1): x@b', levels: ['b'] },
  ].map(itemOf)
  assert.deepEqual(filterItems(items).map((it) => it.severity), ['fail', 'fail', 'open', 'report', 'pass'], 'failures first')
  assert.deepEqual(filterItems(items, { severities: ['fail'], level: 'a' }).map((it) => it.rule), ['content'])
  assert.deepEqual(filterItems(items, { rules: ['not-built'] }).map((it) => it.levels), [['b']])
  assert.deepEqual(filterItems(items, { query: 'SPIKE' }).length, 1)
  assert.deepEqual([...tally(items).severities], [['pass', 1], ['fail', 2], ['report', 1], ['open', 1]])
  assert.deepEqual([stepIn(3, -1, 1), stepIn(3, -1, -1), stepIn(3, 2, 1), stepIn(3, 0, -1), stepIn(0, -1, 1)], [0, 2, 0, 2, -1])
})
