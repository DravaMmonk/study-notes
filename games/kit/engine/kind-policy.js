import { CONTENT_KINDS } from './content-kinds.js'
// All content layers are governed by the same declaration and override policy.
const packaged = { declares: 'package', overrides: { package: ['*'], game: ['$text'] } }
const game = { declares: 'game', overrides: { game: ['*'] } }
export const BUILTIN_POLICIES = {
  ...Object.fromEntries(Object.keys(CONTENT_KINDS).map(kind => [kind, packaged])),
  level: packaged, task: packaged, tag: packaged, relation: { ...packaged, variants: { requires: { overrides: { package: ['*'], game: ['edges', '$text'] } } } },
  entry: packaged, section: packaged, kind: packaged, i18n: { declares: 'package', overrides: { package: ['*'], game: ['*'] } }, chapter: game, game,
}
export const kindPolicy = (kind, schemas, value) => {
  const definition = schemas?.objectKinds?.[kind] ?? BUILTIN_POLICIES[kind] ?? packaged
  return { ...definition, ...definition.variants?.[value?.kind] }
}
const layerType = layer => layer.startsWith('@') ? 'game' : 'package'

/** Return structured layer violations using the registered type's two policy properties. */
export function layerProblems(layer, kind, name, value, schema, schemas, override = false, before) {
  const policy = kindPolicy(kind, schemas, before ?? value)
  const type = layerType(layer)
  const at = `${layer}/${override ? 'overrides/' : ''}${kind}/${name}`
  if (!override) return policy.declares === type ? [] : [{ rule: 'layer', at, layer, kind, target: name, says: `${kind} may only be declared by ${policy.declares}` }]
  const allowed = policy.overrides?.[type] ?? []
  const walk = (value, schema, path = '') => Object.entries(value ?? {}).flatMap(([key, child]) => {
    const field = schema?.fields?.[key]
    const next = path ? `${path}.${key}` : key
    if (key === 'kind' && value.kind === before?.kind) return []
    if (allowed.includes('*') || allowed.includes(next) || allowed.includes('$text') && field?.type === 'text') return []
    if (field?.type === 'obj') return walk(child, field, next)
    return [{ rule: 'layer', at: `${at}.${next}`, layer, kind, target: name, path: next, says: `${type} cannot override ${kind}.${next}` }]
  })
  return walk(value, schema)
}
