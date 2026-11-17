import { dependencyCycle } from '../../course.js'
import { parse } from '../../circuit/text.js'

/** The executable references of a packaged part can only depend on an acyclic graph of other parts. */
export function implementationProblems(parts) {
  const entries = Object.entries(parts?.parts ?? {})
  const known = new Set(entries.map(([id]) => id))
  const problems = []
  const graph = new Map(entries.map(([id, part]) => {
    const uses = new Set()
    for (const [index, variant] of (part.inside ?? []).entries()) {
      const lines = variant.reference?.solution
      if (!lines) continue
      try {
        for (const { type } of parse(lines.join('\n')).statements) if (known.has(type)) uses.add(type)
      } catch (error) {
        if (!error?.en) throw error
        problems.push({ at: `parts/${id}.json.inside[${index}].reference.solution`,
          says: `line ${error.line}: ${error.en}` })
      }
    }
    return [id, [...uses]]
  }))
  const cycle = dependencyCycle(graph)
  if (cycle) problems.push({ at: 'parts', says: `circular part implementations: ${cycle.join(' → ')}` })
  return problems
}
