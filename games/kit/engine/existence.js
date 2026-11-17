import { dependencyIds } from './semver.js'
// One existence check over public identities, independent of source files or future manifests.
import { textKey } from './i18n.js'
import { shapeAt } from './schema.js'
import { meaningsOf, kindMatches } from './kind-meanings.js'
import { tagKey, tagName, kernelTags } from './tag-identity.js'
import { BUILTIN_KIND_NAMES } from './plugin-kinds.js'
import { schemaForKind } from './layers.js'

const ownerOf = name => name.replace(/^#/, '').split(/[/:]/)[0]
const uniqueProblems = problems => [...new Map(problems.map(problem => [JSON.stringify([problem.layer, problem.object, problem.path, problem.kind, problem.target, problem.member]), problem])).values()]
const fieldAt = (at, key) => at ? `${at}.${key}` : key
const identity = (kind, name, member) => `${kind}:${kind === 'tag' ? tagKey(member, name) : name}`

/** This projection will be supplied by manifests when releases are introduced. Overrides never declare identities. */
export function publicSurfaces(layers, schemas) {
  const surfaces = new Map()
  const add = (owner, kind, name, value = {}) => {
    const surface = surfaces.get(owner) ?? new Map()
    surfaces.set(owner, surface)
    surface.set(identity(kind, name, value.kind), { kind, name, member: value.kind })
    for (const task of kind === 'level' ? value.tasks ?? [] : []) add(owner, 'task', task.id, task)
    for (const meaning of meaningsOf(schemas)) for (const entry of meaning.identities?.({ kind, value }) ?? []) add(owner, entry.kind, entry.name, entry.value)
  }
  for (const name of BUILTIN_KIND_NAMES) add('kernel', 'kind', name)
  for (const [key, reader] of kernelTags) { void key; add('kernel', 'tag', reader.name, { kind: reader.member }) }
  for (const [kind, values] of Object.entries(schemas.kinds ?? {})) for (const name of Object.keys(values)) add(ownerOf(name), meaningsOf(schemas).find(meaning => meaning.capability === kind)?.type ?? kind, name)
  for (const layer of layers) {
    if (layer.missing) continue
    if (layer.manifest) {
      for (const entry of Object.values(layer.manifest.surface)) add(layer.id, entry.kind, entry.name, { kind: entry.member })
      continue
    }
    add(layer.id, 'package', layer.id)
    if (layer.id.startsWith('@')) add(layer.id, 'game', `${layer.id}/config`)
    for (const object of [...layer.objects, ...(layer.codeObjects ?? [])]) add(layer.id, object.kind, object.name, object.value)
    for (const reader of layer.tagReaders ?? []) add(layer.id, 'tag', reader.name, { kind: reader.member })
    for (const entries of Object.values(layer.catalogs ?? {})) for (const key of Object.keys(entries)) add(layer.id, 'i18n', key.includes('/') ? key : `${layer.id}/${key}`)
  }
  return surfaces
}

/** Walk reference types, including map keys and branch schemas; field spelling does not imply a reference. */
export function collectReferences(value, schema, schemas, emit, at) {
  if (!schema || value == null) return
  if (schema.type === 'either') return collectReferences(value, shapeAt(schema, value, [], { vocabulary: schemas }), schemas, emit, at)
  if (schema.type === 'by') return collectReferences(value, schema.cases[value[schema.field]], schemas, emit, at)
  const itemSchema = schema.type === 'edges' ? { ...schema.of, externalFrom: 'game' } : schema.of
  if (['set', 'list', 'edges'].includes(schema.type) && !Array.isArray(value) && typeof value === 'object') {
    for (const [key, items] of Object.entries(value)) {
      if (key === 'insert') for (const [i, item] of items.entries()) {
        for (const side of ['before', 'after']) if (item[side]) collectReferences(item[side], schema.of, schemas, emit, `${at}.insert[${i}].${side}`)
        item.values.forEach((child, j) => collectReferences(child, schema.of, schemas, emit, `${at}.insert[${i}].values[${j}]`))
      }
      else items.forEach((child, i) => collectReferences(child, itemSchema, schemas, emit, `${at}.${key}[${i}]`))
    }
    return
  }

  const kind = schema.reference ?? (schema.type === 'level' ? 'level' : schema.type === 'task' ? 'task' : ['ref', 'name', 'call'].includes(schema.type) ? schema.kind : null)
  if (kind && typeof value === 'string') emit(kind, value, at, schema.members)
  if (schema.type === 'text') {
    const key = textKey(value) ?? (typeof value === 'string' && value.startsWith('@') ? value.slice(1) : null)
    if (key) emit('i18n', key, at)
    return
  }
  if (Array.isArray(value)) value.forEach((child, index) => collectReferences(child, itemSchema, schemas, emit, `${at}[${index}]`))
  else if (typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (schema.key) collectReferences(key, schema.key, schemas, emit, fieldAt(at, key))
    if (schema.type === 'call') {
      emit(schema.kind, key, fieldAt(at, key))
      collectReferences(child, schemas.kinds?.[schema.kind]?.[key]?.params, schemas, emit, fieldAt(at, key))
    } else if (!(schema.externalFrom && value[schema.externalFrom] && key === 'from')) collectReferences(child, schema.type === 'map' ? schema.of : schema.fields?.[key], schemas, emit, fieldAt(at, key))
  }
}

export function existenceProblems(layers, schemas, surfaces = publicSurfaces(layers, schemas)) {
  const targets = []
  for (const layer of layers) {
    const emitter = (object, base) => (kind, target, path, member) => {
      if (typeof target !== 'string') return
      if (target.startsWith('#')) { member = kind === 'tag' ? member : kind; kind = 'tag'; target = target.slice(1) }
      targets.push({ layer: layer.id, object, path, kind, target, at: path ? fieldAt(base, path) : base, ...(member && { member }) })
    }
    const emit = emitter({ kind: 'package', name: layer.id }, `${layer.id}/configuration`)
    const dependencies = layer.config.uses ? 'uses' : 'packages'
    const dependency = emitter({ kind: 'package', name: layer.id }, `${layer.id}/${layer.id.startsWith('@') ? 'game.json' : 'package.json'}`)
    for (const name of dependencyIds(layer.config)) dependency('package', name, `${dependencies}.${name}`)
    for (const object of layer.codeObjects ?? []) if (object.value.type) emitter({ kind: object.kind, name: object.name }, `${layer.id}/code/${object.kind}/${object.name}`)('kind', object.value.type, 'type')
    collectReferences(layer.config, schemas.game, schemas, emit, '')
    for (const [override, objects] of [[false, layer.objects], [true, layer.overrides ?? []]]) for (const object of objects) {
      const { kind, name, value } = object
      const at = `${layer.id}/${override ? 'overrides/' : ''}${kind}/${name}`
      const emit = emitter({ kind, name, ...(kind === 'tag' && { member: value.kind }), ...(override && { override: true }) }, at)
      if (override) emit(kind, name, '', value.kind)
      if (kind.includes('/')) emit('kind', kind, '')
      if (kind === 'relation' && (value.member ?? value.of) && !['any', 'tag'].includes(value.member ?? value.of)) emit('kind', value.member ?? value.of, value.member ? 'member' : 'of')
      collectReferences(value, schemaForKind(kind, schemas, value), schemas, emit, '')
      if (kind === 'tag') emit('kind', value.kind, 'kind')
    }
    for (const { namespace, lang, entries } of layer.textOverrides ?? []) for (const key of Object.keys(entries)) {
      const name = key.includes('/') ? key : `${namespace}/${key}`
      emitter({ kind: 'i18n', name, override: true }, `${layer.id}/overrides/${namespace}/i18n/${lang}.json.${key}`)('i18n', name, '')
    }
  }
  const entries = [...new Map([...surfaces.values()].flatMap(surface => [...surface.values()]).map(entry => [identity(entry.kind, entry.name, entry.member), entry])).values()]
  const problems = []
  for (const ref of targets) {
    const { kind, target, member, layer, at, object, path } = ref
    const matches = entries.filter(entry => entry.name === target && (kind === 'tag' ? entry.kind === 'tag' && (!member || kindMatches(schemas, member, entry.member)) : entry.kind !== 'tag' && kindMatches(schemas, kind, entry.kind)))
    // Menu identities are valid untyped order endpoints.
    const owner = ownerOf(target)
    const author = layers.find(item => item.id === layer)
    const foreign = target.includes('/') || kind === 'package' || layers.some(item => item.id === owner)
    const allowed = owner === layer || owner === 'kernel' || layer.startsWith('@') && dependencyIds(author.config).includes(owner) || dependencyIds(author.config).includes(owner)
    const reason = !matches.length ? 'missing' : matches.length > 1 ? 'ambiguous' : foreign && !allowed ? 'undeclared dependency' : null
    if (reason) problems.push({ at, object, path, says: `${reason} target ${kind} ${target}${member ? ` (member ${member})` : ''}`, rule: 'exists', layer, kind, target, ...(member && { member }), reason })
  }
  return uniqueProblems(problems)
}

/** Recheck pending assembled values as well as unexpanded contribution targets. */
export function contentExistenceProblems(content, schemas) {
  const context = content.resolvedDependencies
  if (!context) return (content.objectProblems ?? []).filter(problem => problem.rule === 'exists')
  const { layers, surfaces } = context
  const current = layers.map(layer => ({ ...layer, objects: [], overrides: [], textOverrides: [], config: {} }))
  for (const [kind, values] of Object.entries(content.registries)) {
    if (['level', 'game'].includes(kind) || !schemaForKind(kind, schemas)) continue
    for (const [name, value] of Object.entries(values)) {
      const fullName = kind === 'tag' ? tagName(name) : name
      const owner = ownerOf(fullName)
      current.find(layer => layer.id === owner)?.objects.push({ kind, name: fullName, value })
    }
  }
  for (const value of content.levels) current.find(layer => layer.id === ownerOf(value.id))?.objects.push({ kind: 'level', name: value.id, value })
  const gameLayer = current.find(layer => layer.id === `@${content.id}`)
  if (gameLayer) gameLayer.config = content
  const authored = existenceProblems(layers, schemas, surfaces)
  // Assembly may shift collection indices or expand tags. Keep the authored
  // locations for references already checked there; only pending assembled references are new.
  const pending = existenceProblems(current, schemas, surfaces).filter(problem => problem.reason !== 'undeclared dependency' && !authored.some(other =>
    other.object.kind === problem.object.kind && other.object.name === problem.object.name && other.object.member === problem.object.member &&
    other.kind === problem.kind && other.target === problem.target && other.member === problem.member &&
    (other.path === problem.path || ['tag', 'relation', 'section'].includes(problem.object.kind) || schemaForKind(problem.object.kind, schemas)?.fields?.values)))
  return uniqueProblems([...authored, ...pending])
}

/** Core/view registration references use the same identity check as authored content. */
export function registrationProblems(content, kernel) {
  const layers = (content.layerOrder ?? []).filter(id => !id.startsWith('@')).map(id => ({ id, config: { uses: Object.fromEntries((content.layerUses?.[id] ?? []).map(name => [name, '^1.0.0'])) }, objects: Object.keys(content.registries.kind ?? {}).filter(name => name.startsWith(`${id}/`)).map(name => ({ kind: 'kind', name, value: {} })), codeObjects: ['kind', 'editor'].flatMap(kind => [...kernel.tables[kind]].filter(([name]) => name.startsWith(`${id}:`)).map(([name, value]) => ({ kind, name, value: { type: value.type } }))) }))
  return existenceProblems(layers, { kinds: {} })
}
