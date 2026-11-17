import test from 'node:test'
import assert from 'node:assert/strict'
import { rawStyles } from '../../../games/kit/engine/styles.js'

test('extracted table styles preserve the native size and colour ceilings', () => {
  // The generated mascot was outside the native table style audit and remains separate.
  const paths = ['../core', '../view/ui', '../view/game.js', '../../table/core', '../../table/view']
    .map(path => new URL(path, import.meta.url).pathname)
  const counts = rawStyles(paths)
  for (const [key, maximum] of Object.entries({ sizes: 95, colours: 5, spacing: 0, radii: 0 })) {
    assert.ok(counts[key] <= maximum, `${key}: ${counts[key]} (at most ${maximum})`)
  }
})
