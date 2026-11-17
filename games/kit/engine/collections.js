import { shapeAt } from './schema.js'
// Collection composition is driven exclusively by field schemas.
import { dependencyCycle } from '../course.js'

export const collectionKey = value => {
  if (typeof value === 'string') return value
  if (value?.id !== undefined) return value.id
  if (value?.from !== undefined && value?.to !== undefined) return JSON.stringify([value.from, value.to, value.game ?? null])
  return JSON.stringify(value)
}
export const isCollection = schema => ['set', 'edges'].includes(schema?.type) || schema?.type === 'list' && Boolean(schema.of?.reference || ['name', 'level', 'task'].includes(schema.of?.type) || schema.of?.fields?.id)
const referenceType = schema => schema.reference ?? (['level', 'task'].includes(schema.type) ? schema.type : schema.kind)
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Independent layers can contribute collection patches without replacing shared scalar fields. */
export function collectionContribution(value, schema, before) {
  return isObject(value) && Object.entries(value).every(([key, child]) => {
    if (key === 'kind' && child === before?.kind) return true
    const field = schema?.fields?.[key]
    return isCollection(field) && isObject(child) || field?.type === 'obj' && collectionContribution(child, field, before?.[key])
  })
}

/** Ordinary arrays replace a field. A collection patch edits the retained value. */
export function mergeFields(before, patch, schema, audit, layer, path = '') {
  if (['either', 'by'].includes(schema?.type)) schema = shapeAt(schema, { ...before, ...patch }, [])
  if (isCollection(schema)) {
    const patched = isObject(patch)
    if (patched) {
      const allowed = schema.type === 'list' ? ['add', 'remove', 'insert'] : ['add', 'remove']
      for (const key of Object.keys(patch)) if (!allowed.includes(key)) throw new Error(`${path}: unknown collection patch field ${key}`)
    }
    let values = patched ? [...before ?? []] : [...patch]
    const removed = new Set((patched ? patch.remove ?? [] : []).map(collectionKey))
    values = values.filter(value => !removed.has(collectionKey(value)))
    const previous = audit?.[path] ?? {}
    const contributors = Object.fromEntries(values.map(value => [collectionKey(value), patched ? previous[collectionKey(value)] ?? [] : [layer]]))
    const add = (items, index = values.length) => {
      for (const value of items) {
        const key = collectionKey(value)
        const existing = values.findIndex(other => collectionKey(other) === key)
        if (existing < 0) values.splice(index++, 0, value)
        else if (isObject(value)) values[existing] = value
        contributors[key] = [...new Set([...(contributors[key] ?? []), layer])]
      }
    }
    if (patched) {
      add(patch.add ?? [])
      for (const insertion of patch.insert ?? []) {
        if (Object.hasOwn(insertion, 'before') === Object.hasOwn(insertion, 'after')) throw new Error(`${path}: insert needs exactly one of before or after`)
        const anchor = insertion.before ?? insertion.after
        const index = values.findIndex(value => collectionKey(value) === collectionKey(anchor))
        if (index < 0) throw new Error(`${path}: insert anchor ${collectionKey(anchor)} is absent`)
        add(insertion.values, index + (Object.hasOwn(insertion, 'after') ? 1 : 0))
      }
    }
    if (audit) {
      const nested = values.map(value => `${path}[${collectionKey(value)}]`)
      for (const key of Object.keys(audit)) if (key.startsWith(`${path}[`) && (!patched || !nested.some(prefix => key.startsWith(prefix)))) delete audit[key]
    }
    if (audit) audit[path] = Object.fromEntries(values.map(value => [collectionKey(value), contributors[collectionKey(value)]]))
    // Nested identified list values have the same recursive collection semantics.
    return values.map((value, index) => {
      const old = patched ? before?.find(other => collectionKey(other) === collectionKey(value)) : undefined
      const added = !patched || [...patch.add ?? [], ...(patch.insert ?? []).flatMap(item => item.values)].some(item => collectionKey(item) === collectionKey(value))
      if (!added) return value
      return isObject(value) ? mergeFields(old, value, schema.of, audit, layer, `${path}[${value.id ?? index}]`) : value
    })
  }
  if (!isObject(patch) || schema?.type === 'text') return patch
  const result = { ...before }
  for (const [key, value] of Object.entries(patch)) {
    const field = schema?.type === 'map' ? schema.of : schema?.fields?.[key]
    result[key] = mergeFields(before?.[key], value, field, audit, layer, path ? `${path}.${key}` : key)
  }
  return result
}

/** Report duplicates before tag expansion and cycles after typed endpoint expansion. */
export function collectionProblems(value, schema, expand, at = '') {
  const problems = []
  const walk = (value, schema, path) => {
    if (value == null || !schema) return
    if (['either', 'by'].includes(schema.type)) schema = shapeAt(schema, value, [])
    if (!schema) return
    if (isCollection(schema) && Array.isArray(value)) {
      if (schema.tags === false && value.some(member => typeof member === 'string' && member.startsWith('#'))) problems.push({ at: path, says: 'collection requires concrete object names, without tags' })
      const reference = schema.of?.reference ?? (schema.of?.type === 'level' ? 'level' : schema.of?.type === 'name' ? schema.of.kind : null)
      const expanded = schema.type === 'list' && reference ? value.flatMap(member => expand(member, reference, path)) : value
      const keys = expanded.map(collectionKey)
      if (new Set(keys).size !== keys.length) problems.push({ at: path, says: 'duplicate collection member' })
      if (schema.type === 'edges') {
        const edges = value.flatMap(edge => edge.game ? [] : expand(edge.from, referenceType(schema.of.fields.from), path).flatMap(from => expand(edge.to, referenceType(schema.of.fields.to), path).map(to => ({ from, to }))))
        const nodes = [...new Set(edges.flatMap(edge => [edge.from, edge.to]))]
        const cycle = dependencyCycle(new Map(nodes.map(id => [id, edges.filter(edge => edge.to === id).map(edge => edge.from)])))
        if (cycle) problems.push({ at: path, says: `circular edges: ${cycle.join(' → ')}` })
      }
    }
    if (Array.isArray(value)) value.forEach((child, index) => walk(child, schema.of, `${path}[${index}]`))
    else if (isObject(value)) for (const [key, child] of Object.entries(value)) walk(child, schema.type === 'map' ? schema.of : schema.fields?.[key], path ? `${path}.${key}` : key)
  }
  walk(value, schema, at)
  return problems
}
