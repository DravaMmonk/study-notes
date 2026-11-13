// node --test (npm test) — no part of the kit writes out more font sizes, colours, spacing or corner radii than it did
// when the tokens became the rule (styles.js): each area, domain and template has its ceilings, lowered as its styles
// move onto the tokens and never raised; a new domain starts at none, and spacing and radii are at none everywhere.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { measure, rawStyles } from './styles.js'

const CEILING = {
  kit: { sizes: 15, colours: 19 },
  shell: { sizes: 193, colours: 21 },
  circuit: { sizes: 70, colours: 20 },
  views: { sizes: 1, colours: 2 },
  strip: { sizes: 5, colours: 0 },
  agent: { sizes: 26, colours: 0 },
  image: { sizes: 67, colours: 24 },
  logic: { sizes: 55, colours: 22 },
  net: { sizes: 0, colours: 3 },
  syntax: { sizes: 6, colours: 14 },
  table: { sizes: 97, colours: 5 },
}

test('sizes, spacing and radii written in pixels count in a style sheet; a colour written out counts in a style sheet or a string in code', () => {
  const dir = mkdtempSync(join(tmpdir(), 'styles-'))
  mkdirSync(join(dir, 'ui'))
  writeFileSync(join(dir, 'ui', 'a.css'), '.a { font-size: 12px; color: #3f7fb5; padding: var(--sp-4) 10px; border-radius: 6px; }\n.b { font: 600 var(--fs-ui) var(--mono); background: rgba(0, 0, 0, .1); gap: var(--gap-group); margin-top: -1px; }\n.c { font: 11px var(--mono); --tool-h: 32px; border-radius: var(--r-md); margin: calc(var(--sp-5) * -1) 0; }')
  writeFileSync(join(dir, 'ui', 'A.jsx'), "const fill = '#e0e8e5' // #abc in a comment\nconst id = `${a}#${b}`")
  assert.deepEqual(rawStyles(dir), { sizes: 2, colours: 3, spacing: 1, radii: 1 })
})

test('no area writes out more sizes, colours, spacing or radii than its ceiling', () => {
  const over = Object.entries(measure(resolve(import.meta.dirname, '..'))).flatMap(([key, got]) => ['sizes', 'colours', 'spacing', 'radii'].filter((k) => got[k] > (CEILING[key]?.[k] ?? 0)).map((k) => `${key}: ${got[k]} ${k} (at most ${CEILING[key]?.[k] ?? 0})`))
  assert.deepEqual(over, [])
})
