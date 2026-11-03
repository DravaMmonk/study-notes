// The read-only adapter from content/schema text locations to the game's term registry and course prerequisites.
import { searchable } from '../engine/ops/search.js'
import { termRegistry, termUsage } from '../engine/terminology.js'

export function reviewTerminology(content, spec, vocabulary) {
  const registry = termRegistry(content.glossary)
  const places = searchable(content, vocabulary, ['text']).map((p) => {
    const entry = p.in === 'glossary' && p.path[0] === 'entries' ? content.glossary.entries[p.path[1]] : null
    const path = p.path.join('.')
    return {
      at: `${p.file}:${path}.${p.side}`, side: p.side, text: p.text,
      level: entry ? entry.at : p.level, entry: entry?.id,
      label: p.path.some((k) => ['title', 'name', 'label', 'step', 'unit', 'aliases'].includes(k)),
    }
  })
  const usage = termUsage(registry, places, (a, b) => spec.course.before(a, b))
  return {
    terms: [...registry.entries.values()],
    failures: [...registry.failures, ...usage.failures], reports: usage.reports,
  }
}
