// The check's lines as a worklist (the studio's audit panel and the tree's marks): each line with its severity, the
// rule it is about and the levels it names; filtered by rule, level and severity; and what the tree marks on each
// level at a glance — findings, how the domain's checks (its reference and naive answers) do, how many tests it has,
// what blind play cost on it. Pure: no page, no network.
import { RULE_TEXT } from '../course.js'
import { find } from '../engine/schema.js'

export const SEVERITIES = ['fail', 'open', 'report', 'pass']

/** A line's rule: the check that wrote it. */
export function ruleOf(text) {
  const body = text.replace(/^(OPEN|REPORT) /, '')
  if (body.startsWith('content: ')) return 'content'
  if (body.startsWith('text ')) return 'copy'
  if (body.startsWith('hub: ')) return 'hub'
  if (body.startsWith('game.json.open: ')) return 'open'
  const report = /^([\w-]+): /.exec(body)
  if (text.startsWith('REPORT ') && report) return report[1]
  const course = /^course: (.*)$/.exec(body)
  if (course) {
    const left = /^left open in game\.json, but met now \(([\w-]+)\)/.exec(course[1])
    if (left) return left[1]
    return Object.entries(RULE_TEXT).find(([, says]) => course[1].startsWith(says))?.[0] ?? 'course'
  }
  if (/ links the (entry|part) /.test(body)) return 'links'
  if (/: (duplicate id|requires missing level)/.test(body)) return 'levels'
  return 'domain'
}

/** A line of the check as a worklist item: { text, severity, rule, levels }. */
export function itemOf(line) {
  const severity = line.fail ? 'fail' : line.text.startsWith('OPEN ') ? 'open' : line.text.startsWith('REPORT ') ? 'report' : 'pass'
  return { text: line.text, severity, rule: ruleOf(line.text), levels: line.levels ?? [] }
}

/**
 * The items that pass a filter: { severities: [..] (all when empty), rules: [..] (all when empty), level (only
 * lines naming it), query (words in the line) }. The order: failures first, then open, reported, passing; within each,
 * as the check wrote them.
 */
export function filterItems(items, { severities = [], rules = [], level = null, query = '' } = {}) {
  const q = query.trim().toLowerCase()
  return items
    .filter((it) => (!severities.length || severities.includes(it.severity)) && (!rules.length || rules.includes(it.rule)) && (!level || it.levels.includes(level)) && (!q || it.text.toLowerCase().includes(q)))
    .map((it, k) => [it, k])
    .sort(([a, i], [b, j]) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || i - j)
    .map(([it]) => it)
}

/** How many items there are of each rule and each severity: { rules: Map(rule → n), severities: Map }. */
export function tally(items) {
  const rules = new Map()
  const severities = new Map()
  for (const it of items) {
    rules.set(it.rule, (rules.get(it.rule) ?? 0) + 1)
    severities.set(it.severity, (severities.get(it.severity) ?? 0) + 1)
  }
  return { rules, severities }
}

/** The index of the next (step 1) or previous (step -1) item from `at` (-1: none yet), wrapping round. */
export const stepIn = (length, at, step) => (length ? (at < 0 ? (step > 0 ? 0 : length - 1) : (at + step + length) % length) : -1)

/** How many tests a level holds: the items of every list its schema puts in the tests section (hidden ones too). */
export function testsOf(schema, level, vocabulary) {
  return find(schema, level, 'list', { vocabulary }).filter((f) => f.schema?.section === 'tests').reduce((n, f) => n + f.value.length, 0)
}

/**
 * The marks of every level: Map(id → { fails, open, domain: 'pass' | 'fail' | null, tests, cost }). fails: failing
 * lines naming it; open: open or reported ones; domain: how its domain's lines do (fail when one fails, pass when one
 * passes, or when the whole check is in and none fails — a domain that reports a level only when it fails); cost:
 * blind play's (null without sessions).
 */
export function marksOf(content, vocabulary, items, checked) {
  const out = new Map()
  for (const { id, ...level } of content.levels) out.set(id, { fails: 0, open: 0, domain: null, tests: testsOf(vocabulary.level, level, vocabulary) })
  for (const it of items) for (const id of it.levels) {
    const m = out.get(id)
    if (!m) continue
    if (it.severity === 'fail') m.fails += 1
    if (it.severity === 'open' || it.severity === 'report') m.open += 1
    if (it.rule === 'domain') m.domain = it.severity === 'fail' || m.domain === 'fail' ? 'fail' : 'pass'
  }
  if (checked) for (const m of out.values()) m.domain ??= 'pass'
  return out
}
