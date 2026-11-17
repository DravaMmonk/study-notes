import { partStages } from 'circuit'
import { symbolFor } from './symbols.js'
import { unasciiOf } from './formula.js'

// Sentence-strip reference works consume the formula symbols they construct.
export const symbolGrant = {
  type: 'logic/symbol',
  used(work, objects = {}) {
    if (!['logic:translate', 'logic:query'].includes(work?.kind)) return []
    const text = unasciiOf(work.target)
    const seen = new Set()
    return [...partStages(objects).values()].flatMap(entry => {
      const mark = symbolFor[entry.definition.mark]
      const key = JSON.stringify([entry.part, mark])
      if (!mark || !text.includes(mark) || seen.has(key)) return []
      seen.add(key)
      return [entry.id]
    })
  },
}
