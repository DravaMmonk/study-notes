import { test } from 'node:test'
import assert from 'node:assert/strict'
import { termRegistry, termUsage } from './terminology.js'
import { GLOSSARY } from './vocabulary.js'
import { validate } from './schema.js'

const t = (zh, en = zh) => ({ zh, en })
const entry = (id, fields = {}) => ({ id, group: 'g', title: t('光轴', 'Optical axis'), body: [t('穿过小孔、垂直像平面的直线。', 'The line through the hole perpendicular to the image plane.')], ...fields })
const registry = (...entries) => termRegistry({ entries })
const place = (text, fields = {}) => ({ at: 'task.intro.zh', side: 'zh', text, ...fields })
const ref = (id) => `<wiki-ref to="${id}"></wiki-ref>`
const rules = (xs) => xs.map((f) => f.rule)

test('the existing entry body is the definition; bilingual and neutral aliases share its id', () => {
  const e = entry('axis', { aliases: [t('相机轴', 'Camera axis'), 'OA'] })
  const r = registry(e)
  assert.deepEqual(r.failures, [])
  assert.equal(r.entries.get('axis').body, e.body)
  assert.equal(r.names.zh.get('相机轴'), 'axis')
  assert.equal(r.names.en.get('camera axis'), 'axis')
  assert.equal(r.names.en.get('oa'), 'axis')
  assert.deepEqual(validate(GLOSSARY, { groups: [{ id: 'g', title: 'G' }], entries: [e] }), [])
  assert.ok(validate(GLOSSARY, { groups: [], entries: [entry('axis', { aliases: ['OA'], summary: 'a second definition' })] }).some((p) => p.at.endsWith('summary')))
})

test('empty names, empty/reference-only definitions and conflicting term names fail', () => {
  assert.ok(rules(registry(entry('axis', { title: t('', 'Axis'), aliases: [t('别名', '')], body: [t(ref('other'), '<b> </b>')] })).failures).includes('term-definition'))
  assert.ok(rules(registry(entry('axis', { title: t('', 'Axis') })).failures).includes('term-name'))
  assert.ok(rules(registry(entry('axis'), entry('axis')).failures).includes('term-id'))
  const r = registry(entry('a', { aliases: [t('相机轴', '  Camera   AXIS ')] }), entry('b', { title: t('相机轴', 'camera axis') }))
  assert.deepEqual(rules(r.failures), ['term-name-conflict', 'term-name-conflict'])
})

test('explanations follow actual prerequisites, including parallel routes and optional branches', () => {
  const r = registry(entry('axis', { at: 'left' }), entry('extra', { title: 'Extra', at: 'optional' }), entry('open', { title: 'Open' }))
  const before = (a, b) => ({ left: ['start'], right: ['start'], join: ['start', 'left', 'right'] }[b] ?? []).includes(a)
  const use = (id, level) => termUsage(r, [place(ref(id), { level })], before)
  assert.deepEqual(use('axis', 'left').failures, [])
  assert.deepEqual(use('axis', 'join').failures, [])
  assert.deepEqual(rules(use('axis', 'right').failures), ['term-unavailable'])
  assert.deepEqual(rules(use('extra', 'join').failures), ['term-unavailable'])
  assert.deepEqual(rules(use('axis', undefined).failures), ['term-unavailable'])
  assert.deepEqual(use('open', undefined).failures, [])
  assert.deepEqual(rules(use('unknown', 'join').failures), ['term-reference'])
})

test('bad reference markup fails; either language is checked without mistaking part refs for terms', () => {
  const r = registry(entry('axis'))
  for (const text of ['<wiki-ref to="axis"/>', '<wiki-ref to="axis">axis</wiki-ref>', '<wiki-ref to=""></wiki-ref>']) {
    assert.ok(rules(termUsage(r, [place(text, { side: 'en' })], () => false).failures).includes('term-reference-format'))
  }
  assert.deepEqual(termUsage(r, [place('<part-ref to="unknown"></part-ref>')], () => false).failures, [])
  assert.deepEqual(rules(termUsage(r, [place(ref('missing'), { side: 'en', at: 'task.hint.en' })], () => false).failures), ['term-reference'])
})

test('bare names are candidates: longest match, Latin boundaries, literal symbols and whitespace', () => {
  const r = registry(entry('axis', { aliases: ['OA'] }), entry('net', { title: 'Net' }), entry('language', { title: 'C++' }), entry('camera', { title: t('相机', 'Optical') }))
  const use = (text, side = 'en', extra = {}) => termUsage(r, [place(text, { side, ...extra })], () => false)
  assert.equal(use('The OPTICAL\nAXIS moves.').reports.length, 1, 'longer term wins over Optical')
  assert.equal(use('Network is different.').reports.length, 0, 'Net is not inside Network')
  assert.equal(use('Net and C++').reports.length, 2)
  assert.equal(use('C and OA').reports.length, 1, 'C++ is literal, not a regex quantifier')
  assert.equal(use('沿光轴移动。', 'zh').reports.length, 1)
  assert.equal(use(ref('axis')).reports.length, 0)
  assert.equal(use(`${ref('axis')} is the optical axis.`).reports.length, 0, 'one accessible tag serves repeated mentions in the same text field')
  assert.equal(use(`${ref('axis')} and Net`).reports.length, 1, 'another unlinked term still needs review')
  assert.equal(use('<b title="Optical axis">different</b>').reports.length, 0)
  assert.equal(use('Optical axis', 'en', { entry: 'axis' }).reports.length, 0, 'self definition need not link itself')
  assert.equal(use('Optical axis', 'en', { label: true }).reports.length, 0, 'concise labels may use registered names')
  assert.deepEqual(use('An unknown technical phrase.').failures, [], 'unknown prose needs semantic extraction, not fake NLP')
  assert.ok(use('Optical axis').reports.every((f) => f.report === true))
})

test('component descriptions use plain terminology while learning prose retains annotation checks', () => {
  const r = registry(entry('axis'))
  const desc = (text) => termUsage(r, [place(text, { description: true })], () => false)
  assert.deepEqual(desc('沿光轴移动。'), { failures: [], reports: [] })
  assert.deepEqual(rules(desc(ref('axis')).failures), ['part-description-reference'])
  assert.deepEqual(rules(desc('<part-ref to="camera"></part-ref>').failures), ['part-description-reference'])
  assert.equal(termUsage(r, [place('沿光轴移动。')], () => false).reports.length, 1)
})
