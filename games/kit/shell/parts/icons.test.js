import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ICON_NAMES } from '../../engine/parts/icons.js'

// The shell's table imports lucide (resolved by the page's build, not under node): read it as text.
const source = readFileSync(new URL('./icons.js', import.meta.url), 'utf8')
const listed = (block) => block.split(/[\s,]+/).filter(Boolean)

test('the shell draws every icon the kernel’s table names, and no other', () => {
  const imported = listed(/import \{([^}]*)\}/.exec(source)[1])
  const table = listed(/export const ICONS = \{([^}]*)\}/.exec(source)[1])
  assert.deepEqual(imported.sort(), [...ICON_NAMES].sort())
  assert.deepEqual(table.sort(), [...ICON_NAMES].sort())
})
