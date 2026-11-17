import { unavailableGrants } from './grants.js'
import { RULE_TEXT, againstOpen, audit } from './course.js'

function referenceGrantChecks(spec) {
  const lines = []
  for (const fragment of spec.specs ?? [spec]) {
    const course = fragment.course
    const works = fragment.logic ?? fragment.circuit ?? fragment.image ?? fragment.table
    for (const level of fragment.levels) for (const [index, task] of (level.tasks ?? []).entries()) {
      const at = { id: level.id, task: task.task ?? index }
      const flags = new Set(course.levels.filter(prior => course.before(prior.id, level.id)).flatMap(prior => prior.unlocks ?? []))
      const runtimeTask = works?.LEVELS?.find(entry => entry.id === level.id)?.tasks[index] ?? task
      for (const work of [runtimeTask, ...course.boards(at)]) for (const text of unavailableGrants(course, work, at, flags)) {
        lines.push({ fail: true, level: level.id, text: `${level.id}: ${text}` })
      }
    }
  }
  return lines
}

export function courseChecks({ spec, content }) {
  const lines = referenceGrantChecks(spec)
  if (content.packageTarget) return lines
  const fail = text => lines.push({ fail: true, text })
  // A notes course is no machine growing level by level: its course is not audited (games/DESIGN.md 12.1).
  // Trays are the package's: whether something on them is ever brought in is judged on a game placing the whole package.
  const whole = spec.levels.length >= content.levels.length
  const findings = spec.course.notes ? [] : [...audit(spec.course), ...(spec.audit?.() ?? [])].filter((f) => whole || f.rule !== 'tray-unmet')
  for (const { rule, fresh, left, gone } of againstOpen(findings, content.open ?? {})) {
    const text = RULE_TEXT[rule]
    if (!text) { fail(`game.json.open: ${rule} is no rule of the audit`); continue }
    if (fresh.length) fail(`course: ${text} (${fresh.length}): ${fresh.join('  ')}`)
    if (gone.length) fail(`course: left open in game.json, but met now (${rule}): drop ${gone.join('  ')}`)
    if (left.length) lines.push({ text: `OPEN course: ${text} (${left.length}, on the game's work list): ${left.join('  ')}` })
  }

  return lines
}

export function referenceChecks({ game, levelLinks, opensBy }) {
  const lines = []
  const fail = text => lines.push({ fail: true, text })
  // A part likewise: linked in the level that earns it or one after (that level's own intro may name what it builds).
  const earnedAt = (part) => game.levels.find((l) => l.unlocks?.includes(part.key) || part.at?.includes(l.id))?.id
  const partsByKey = new Map((game.parts?.all ?? []).map((p) => [p.key, p]))
  for (const [id, links] of levelLinks('part')) for (const key of links) if (partsByKey.has(key) && !opensBy(earnedAt(partsByKey.get(key)), id)) fail(`${id} links the part ${key}, earned later (at ${earnedAt(partsByKey.get(key))})`)
  return lines
}
