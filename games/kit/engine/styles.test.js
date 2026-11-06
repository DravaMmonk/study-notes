// node --test (npm test) — no domain writes out more font sizes or colours than it did when the tokens became the rule
// (styles.js): each domain and template has its ceilings, lowered as its styles move onto the tokens and never
// raised; a new domain starts at none.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { measure, rawStyles } from './styles.js'

const CEILING = {
  agent: { sizes: 26, colours: 0 },
  can: { sizes: 0, colours: 3 },
  image: { sizes: 95, colours: 24 },
  logic: { sizes: 69, colours: 24 },
  net: { sizes: 0, colours: 3 },
  syntax: { sizes: 6, colours: 14 },
  table: { sizes: 97, colours: 5 },
  vision: { sizes: 67, colours: 98 },
}

test('a size written in pixels counts in a style sheet; a colour written out counts in a style sheet or a string in code', () => {
  const dir = mkdtempSync(join(tmpdir(), 'styles-'))
  mkdirSync(join(dir, 'ui'))
  writeFileSync(join(dir, 'ui', 'a.css'), '.a { font-size: 12px; color: #3f7fb5; }\n.b { font: 600 var(--fs-ui) var(--mono); background: rgba(0, 0, 0, .1); }\n.c { font: 11px var(--mono); }')
  writeFileSync(join(dir, 'ui', 'A.jsx'), "const fill = '#e0e8e5' // #abc in a comment\nconst id = `${a}#${b}`")
  assert.deepEqual(rawStyles(dir), { sizes: 2, colours: 3 })
})

test('no domain writes out more sizes or colours than its ceiling', () => {
  const over = Object.entries(measure(resolve(import.meta.dirname, '..'))).flatMap(([key, got]) => ['sizes', 'colours'].filter((k) => got[k] > (CEILING[key]?.[k] ?? 0)).map((k) => `${key}: ${got[k]} ${k} (at most ${CEILING[key]?.[k] ?? 0})`))
  assert.deepEqual(over, [])
})
