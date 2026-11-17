// Categorise and filter check results for the Studio audit panel.
import { RULE_TEXT } from '../course.js'

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

/** A line of the check as a worklist item: { text, severity, rule, levels, problem? } — `problem` the check's own
 * structured problem when it gives one (the existence check: { rule: 'exists', object, path, kind, target, reason }). */
export function itemOf(line) {
  const severity = line.fail ? 'fail' : line.text.startsWith('OPEN ') ? 'open' : line.text.startsWith('REPORT ') ? 'report' : 'pass'
  return { text: line.text, severity, rule: line.problem?.rule ?? ruleOf(line.text), levels: line.levels ?? [], ...(line.problem && { problem: line.problem }) }
}

/**
 * Where a structured problem is: the object that names the missing target and the field in it, as the check gives them
 * ({ object: { kind, name, member?, override? }, path }): { kind, full, path, override } — a tag's `full` its key
 * (`<member>:<name>`), as the studio knows tags; null for a problem outside any object (a package's `uses`).
 */
export function problemPlace(problem) {
  const object = problem?.object
  if (!object || object.kind === 'package') return null
  const full = object.kind === 'tag' && object.member ? `${object.member}:${object.name}` : object.name
  return { kind: object.kind, full, path: problem.path ?? '', override: Boolean(object.override) }
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
