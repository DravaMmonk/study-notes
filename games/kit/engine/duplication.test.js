// node --test (npm test) — what the domains on the circuit base still write out the same (duplication.js): for each
// kind of file, at most as many lines of one domain's file stand word for word in three domains' as the kind allows.
// What is left is the calls into the base (`return checkCircuitTasks(circuit, {`, `export const runLevel = runTests(runTest)`)
// and the head of a hook the base calls
// (`export const entries = ({ task, test, run }) => [`); a line more is a piece of the base written out again, to be
// moved into it. Two kinds of file hold more that is no piece of the base: a vocabulary's
// shape (`const PARTS = {`, `kinds: { part: PARTS, want: WANTS }`…), and what the tick domains' own register and
// constant cards are called and do, words each game keeps for its own parts (in vocabulary.js and ui/catalog.js; one
// line more of them reads the same since their English moved to the catalog, ../i18n/en.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { FILES, duplicated, measure } from './duplication.js'

const CEILING = { 'board.js': 2, 'course.js': 2, 'run.js': 2, 'validate.js': 3, 'vocabulary.js': 16, 'domain.js': 0, 'play.js': 2, 'game.jsx': 0, 'ui/Screen.jsx': 1, 'ui/catalog.js': 5 }

test('a line counts as written out again when three domains have it, their names aside, comments and imports left out', () => {
  const file = (name, text) => ({ key: name, name, text })
  const got = duplicated([
    file('one', "import { x } from './x.js'\nexport const oneBoard = makeBoard('one') // one\nconst onlyHere = 1234567"),
    file('two', "import { x } from './x.js'\nexport const twoBoard = makeBoard('two')\n/* two */ const onlyThere = 1234567"),
    file('six', "export const sixBoard = makeBoard('six')\nconst sixteen = 16"),
  ])
  assert.deepEqual(got, { one: { lines: 2, shared: 1 }, two: { lines: 2, shared: 1 }, six: { lines: 2, shared: 1 } })
})

test('the domains on the circuit base write out no more of the same code than their kind of file allows', () => {
  assert.deepEqual(Object.keys(CEILING).sort(), [...FILES].sort())
  const over = Object.entries(measure(resolve(import.meta.dirname, '..'), FILES)).flatMap(([file, by]) => Object.entries(by).filter(([, { shared }]) => shared > CEILING[file]).map(([key, { shared }]) => `${key}/${file}: ${shared} lines (at most ${CEILING[file]})`))
  assert.deepEqual(over, [])
})
