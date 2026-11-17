import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { runtimeOf } from '../../../games/kit/engine/resolver.js'
import { readStarter } from '../../../games/kit/engine/ops/fixture.js'
import { find } from 'kernel'
import { contentVocabulary } from '../../../games/kit/studio/editors.js'
import { boardPaths, cellText, cellValue, formOf, gridRows, gridValue, tableOf, tableValue, textsOf, tickValue, tickValues } from '../../../games/kit/studio/form.js'
const STARTERS = ['circuit']
const starter = () => readStarter(resolve(import.meta.dirname, '../../circuit/test'))
test('every level of every starter reads as a form: each text a text pair, each board a board, where the schema has it', async () => {
  assert.ok(STARTERS.length > 0)
  for (const game of STARTERS) {
    const content = starter(game)
    const runtime = await runtimeOf(content)
    const vocabulary = contentVocabulary(runtime.vocabulary, content)
    const levels = content.levels.map((l) => l.id)
    for (const { id, ...level } of content.levels) {
      const kinds = new Map()
      const walk = (f) => {
        kinds.set(JSON.stringify(f.path), f.kind)
        for (const x of f.items ?? []) walk(x)
        for (const e of f.entries ?? []) walk(e.field)
        for (const x of f.fields ?? []) if (x.field) walk(x.field)
        if (f.params) walk(f.params)
      }
      walk(formOf(vocabulary.level, level, { vocabulary, levels }))
      for (const { path } of textsOf(vocabulary.level, level, vocabulary)) assert.equal(kinds.get(JSON.stringify(path)), 'text', `${game} ${id} ${path.join('.')}`)
      for (const path of boardPaths(vocabulary, level)) assert.equal(kinds.get(JSON.stringify(path)), 'board', `${game} ${id} ${path.join('.')}`)
    }
  }
})

/** Every field of a form, depth first. */
function* fieldsIn(f) {
  yield f
  for (const x of f.items ?? []) yield* fieldsIn(x)
  for (const e of f.entries ?? []) yield* fieldsIn(e.field)
  for (const x of f.fields ?? []) if (x.field) yield* fieldsIn(x.field)
  if (f.params) yield* fieldsIn(f.params)
}

/** The control a hinted schema asks for (form.js), or null: a grid, ticks (a string of bits too), a wave of ticks. */
const hinted = (s) => (s.view === 'grid' ? 'grid' : s.view === 'ticks' ? (s.type === 'map' ? 'wave' : 'ticks') : null)

test('on every starter: each value a schema hint names gets its control, and each cell control gives back the value it shows', async () => {
  const counts = {}
  for (const game of STARTERS) {
    const content = starter(game)
    const runtime = await runtimeOf(content)
    const vocabulary = contentVocabulary(runtime.vocabulary, content)
    const levels = content.levels.map((l) => l.id)
    for (const { id, ...level } of content.levels) {
      const kinds = new Map()
      for (const f of fieldsIn(formOf(vocabulary.level, level, { vocabulary, levels }))) {
        const where = `${game} ${id} ${f.path.join('.')}`
        kinds.set(f.path.join('.'), f.kind)
        counts[f.kind] = (counts[f.kind] ?? 0) + 1
        if (f.kind === 'grid') assert.deepEqual(gridValue(f, gridRows(f)), f.value, where)
        if (f.kind === 'ticks') assert.deepEqual(tickValue(f, tickValues(f)), f.value, where)
        if (f.kind === 'table') {
          const t = tableOf(f)
          assert.deepEqual(tableValue(f, t, t.rows), f.value, where)
        }
        if (f.kind === 'wave') for (const v of Object.values(f.value)) assert.ok(Array.isArray(v), where)
        // Every cell a control shows types back to itself.
        const cells = f.kind === 'grid' ? gridRows(f).flat() : f.kind === 'ticks' ? tickValues(f) : f.kind === 'numbers' ? f.value : f.kind === 'wave' ? Object.values(f.value).flat() : []
        for (const v of cells) assert.deepEqual(cellValue(f.cell, cellText(v)), v, `${where} cell ${v}`)
      }
      // Every value whose schema carries a view hint (found through the schema, whatever its type) gets that control.
      for (const type of ['list', 'map', 'str']) {
        for (const { path, schema } of find(vocabulary.level, level, type, { vocabulary })) {
          const want = hinted(schema)
          if (!want) continue
          assert.equal(kinds.get(path.join('.')), want, `${game} ${id} ${path.join('.')}`)
        }
      }
    }
  }
  // What the package-owned test examples still exercise; chips, choices and calls are covered on hand-written
  // schemas, now that the image and table starters moved into their packages.
  for (const k of ['text', 'board', 'list']) assert.ok(counts[k] > 0, `some field is ${k}`)
})
