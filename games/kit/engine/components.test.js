// node --test (npm test) — how much of its own interface each domain still writes as components (components.js). A
// domain on the circuit base writes none: it declares its screen (ui/screen.js) and the kit draws it. The domains
// written before the base (image, logic, table, agent, syntax) hold their own screens; their numbers go down as
// screens move onto the kit.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { components } from './components.js'

const CEILING = {
  'domains/agent': 324,
  'domains/image': 2870,
  'domains/logic': 2039,
  'domains/syntax': 159,
  'domains/table': 2413,
}

test('no domain writes more components of its own than it did, and a domain on the circuit base writes none', () => {
  const over = Object.entries(components(resolve(import.meta.dirname, '..'))).filter(([domain, lines]) => lines > (CEILING[domain] ?? 0))
  assert.deepEqual(over, [], 'a domain declares its screen (ui/screen.js); a part every game could use goes in the kit')
})

test('a ceiling comes down with the components it counted', () => {
  const now = components(resolve(import.meta.dirname, '..'))
  const slack = Object.entries(CEILING).filter(([domain, most]) => (now[domain] ?? 0) < most)
  assert.deepEqual(slack, [], 'lower the ceiling to what the domain holds now')
})
