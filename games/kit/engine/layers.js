import { meaningsOf } from './kind-meanings.js'
// Dependency ordering, override composition and provenance shared by readers and author operations.
import { dependencyIds, validateConfig } from './semver.js'
import { tagKey, tagName, kernelTags } from './tag-identity.js'
import { kindSchemas, BUILTIN_KIND_NAMES } from './plugin-kinds.js'
import { CONTENT_KINDS, contentKindSchemas } from './content-kinds.js'
import { expandNames, fullName, OBJECT_KINDS } from './names.js'
import { qualifyObject, OBJECT_SCHEMAS } from './objects.js'
import { ENTRY } from './vocabulary.js'
import { catalogReader, sourceValue } from './catalogs.js'
import { mergePatch } from './ops/edit.js'

export const folders = { level: 'levels', entry: 'entries', tag: 'tags', relation: 'relations', section: 'sections', ...Object.fromEntries(Object.keys(contentKindSchemas).map(kind => [kind, CONTENT_KINDS[kind].folder ?? kind])) }
export const kindForFolder = Object.fromEntries(Object.entries(folders).map(([kind, folder]) => [folder, kind]))
export const schemaForKind = (kind, schemas) => ({ level: schemas.level, entry: ENTRY, ...kindSchemas(schemas), ...Object.fromEntries(Object.entries(OBJECT_SCHEMAS).map(([folder, schema]) => [kindForFolder[folder], schema])) })[kind]

/** The game must explicitly select the complete dependency closure. */
export function orderPackages(packages) {
  if (packages.some(p => p.id === 'kernel')) throw new Error('kernel is a reserved namespace')
  const byId = new Map(packages.map((p) => [p.id, p]))
  if (byId.size !== packages.length) throw new Error('duplicate package selection')
  for (const p of packages) {
    if (!p.missing) validateConfig(p.config)
  }
  const out = [], remaining = new Set(byId.keys())
  while (remaining.size) {
    const next = [...remaining].sort().find((id) => dependencyIds(byId.get(id).config).every((dep) => !remaining.has(dep)))
    if (!next) throw new Error(`circular package dependencies: ${[...remaining].sort().join(', ')}`)
    remaining.delete(next); out.push(byId.get(next))
  }
  return out
}

const edges = (value) => [...(value.edges ?? []), ...(value.sequence ?? []).slice(1).map((to, i) => ({ from: value.sequence[i], to }))]
const same = (a, b) => typeof a === 'string' ? a === b : Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([key, value]) => b[key] === value)

/** Apply the override rules without retaining patch control fields in objects. */
export function applyOverride(kind, before, patch, schemas) {
  const meaning = meaningsOf(schemas).find(meaning => meaning.type === kind && meaning.override)
  if (meaning) return meaning.override(before, patch)
  const { $merge, replace, remove = [], ...data } = patch
  if (!['tag', 'relation', 'section'].includes(kind)) return $merge ? mergePatch(before, data) : data
  before ??= {}
  if (kind === 'tag' && before.kind && data.kind && data.kind !== before.kind) throw new Error('a tag override cannot change its member kind')
  const field = kind === 'relation' ? 'edges' : 'values'
  const values = kind === 'relation' ? edges : (v) => v.values ?? []
  const result = [...(replace ? [] : values(before)).filter((v) => !remove.some((r) => kind !== 'relation' ? r === v : Object.entries(r).every(([key, value]) => v[key] === value))), ...values(data)]
  const { sequence: _sequence, ...merged } = { ...before, ...data }
  return { ...merged, [field]: result.filter((v, i) => result.findIndex((other) => same(v, other)) === i) }
}

/** Visible override events in load order. Object snapshots retain @key references; i18n snapshots are literal text. */
export function visibleOverrides(content, layer = content.layerOrder?.at(-1)) {
  if (!content.layerOrder?.includes(layer)) throw new Error(`unknown layer ${layer}`)
  const visible = new Set()
  const visit = (id) => { if (visible.has(id)) return; visible.add(id); for (const dep of content.layerUses?.[id] ?? []) visit(dep) }
  visit(layer)
  return (content.overrideHistory ?? []).filter((event) => visible.has(event.layer)).sort((a, b) => content.layerOrder.indexOf(a.layer) - content.layerOrder.indexOf(b.layer)).map((event) => structuredClone(event))
}

function contextFor(layer, layers, schemas) {
  const name = v => fullName(layer.id, v)
  const objects = Object.fromEntries([...new Set(layer.objects.map(object => object.kind))].map(kind => [kind, Object.fromEntries(layer.objects.filter(object => object.kind === kind).map(object => [object.name, object.value]))]))
  const qualify = (value, schema, context = '') => expandNames(value, layer.id, { objects, schema, vocabulary: schemas, context, resolve: name })
  return { name, objects, qualify }
}

/** Qualify declarations before composing, so short references retain their author's namespace. */
export function composeLayers(layers, schemas) {
  layers = [...orderPackages(layers.filter((layer) => !layer.id.startsWith('@'))), ...layers.filter((layer) => layer.id.startsWith('@'))]
  const registries = Object.fromEntries([...new Set([...OBJECT_KINDS, ...Object.keys(kindSchemas(schemas)), ...layers.flatMap(layer => layer.objects.map(object => object.kind)), 'i18n'])].map((kind) => [kind, {}]))
  const sources = Object.fromEntries(Object.keys(registries).map((kind) => [kind, {}]))
  const history = [], catalogs = {}, configurations = [], qualifiedLayers = []
  const readers = new Map([...kernelTags, ...layers.flatMap(layer => (layer.tagReaders ?? []).map(reader => [tagKey(reader.member, reader.name), reader]))])
  for (const layer of layers) for (const object of layer.codeObjects ?? []) {
    if (object.kind === 'tag') continue
    registries[object.kind] ??= {}
    sources[object.kind] ??= {}
    registries[object.kind][object.name] = object.value
    sources[object.kind][object.name] = { declaration: layer.id, overrides: [], reader: layer.id }
  }
  for (const [key, reader] of readers) {
    registries.tag[key] = { kind: reader.member, values: [] }
    sources.tag[key] = { declaration: null, reader: reader.reader, overrides: [], members: {} }
  }
  const identity = (kind, name, value) => kind === 'tag' ? tagKey(value.kind, name) : name
  const dependencies = new Map(layers.map((layer) => [layer.id, dependencyIds(layer.config ?? {})]))
  const depends = (a, b, seen = new Set()) => {
    if (seen.has(a)) return false
    seen.add(a)
    return (dependencies.get(a) ?? []).some((dep) => dep === b || depends(dep, b, seen))
  }
  const record = (kind, name, value, layer, override, contribution) => {
    const key = identity(kind, name, value)
    const before = registries[kind][key]
    if (!override && before !== undefined && !(sources[kind][key]?.declaration === undefined || sources[kind][key]?.declaration === null)) throw new Error(`duplicate ${kind} ${name}`)
    if (override) {
      sources[kind][key] ??= { declaration: null, overrides: [] }
      for (const previous of kind === 'tag' ? [] : sources[kind][key].overrides) if (!previous.startsWith('@') && !layer.id.startsWith('@') && !depends(layer.id, previous) && !depends(previous, layer.id)) throw new Error(`conflicting overrides of ${kind} ${name}: ${previous}, ${layer.id}`)
      history.push({ kind, name, ...(kind === 'tag' && { member: value.kind }), layer: layer.id, before: structuredClone(kind === 'i18n' ? before : sourceValue(before)), after: structuredClone(kind === 'i18n' ? value : sourceValue(value)) })
      sources[kind][key].overrides.push(layer.id)
    } else sources[kind][key] = { ...sources[kind][key], declaration: layer.id, overrides: [] }
    if (kind === 'tag') {
      const previous = sources.tag[key].members ?? {}
      sources.tag[key].members = Object.fromEntries(value.values.map(member => {
        const retained = !contribution?.replace && !contribution?.remove?.includes(member) && before?.values.includes(member)
        const added = !override || contribution?.values?.includes(member)
        return [member, [...new Set([...(retained ? previous[member] ?? [] : []), ...(added ? [layer.id] : [])])]]
      }))
    }
    registries[kind][key] = value
  }
  // Text is composed first, then references resolve against the catalog visible to the whole assembly.
  for (const layer of layers) {
    const { qualify } = contextFor(layer, layers, schemas)
    const words = (text) => qualify({ en: text }, { type: 'text' }).en
    for (const [lang, entries] of Object.entries(layer.catalogs ?? {})) for (const [key, text] of Object.entries(entries)) {
      if (key.includes('/') && !key.startsWith(`${layer.id}/`)) throw new Error(`${layer.id}: declare foreign wording ${key} in overrides`)
      record('i18n', `${lang}:${fullName(layer.id, key)}`, words(text), layer, false)
    }
    for (const { namespace, lang, entries } of layer.textOverrides ?? []) {
      for (const [key, text] of Object.entries(entries)) {
        if (key.includes('/') && !key.startsWith(`${namespace}/`)) throw new Error(`${layer.id}: ${key} is outside override namespace ${namespace}`)
        record('i18n', `${lang}:${fullName(namespace, key)}`, words(text), layer, true)
      }
    }
  }
  for (const [name, text] of Object.entries(registries.i18n)) { const i = name.indexOf(':'); (catalogs[name.slice(0, i)] ??= {})[name.slice(i + 1)] = text }
  const readText = catalogReader(catalogs, 'i18n', { allowMissing: true })
  for (const layer of layers) {
    const { name, objects, qualify } = contextFor(layer, layers, schemas)
    const texts = (value, schema, context = '') => readText(sourceValue(qualify(value, schema, context)), layer.id, schema, schemas)
    const object = (kind, value) => {
      if (kind === 'entry' && (Object.hasOwn(value, 'id') || Object.hasOwn(value, 'group'))) throw new Error('entry identity belongs in its name and membership in entry tags')
      const schema = schemaForKind(kind, schemas)
      let qualified = qualify(value, schema)
      const endpoint = [...(value.edges ?? []).flatMap((e) => [e.from, e.to]), ...(value.sequence ?? [])][0]
      const expectedMember = value.member ?? value.of
      const endpointTags = typeof endpoint === 'string' && endpoint.startsWith('#') ? [
        ...Object.entries(registries.tag).filter(([key]) => tagName(key) === fullName(layer.id, endpoint.slice(1))).map(([, tag]) => tag),
        ...layer.objects.filter(o => o.kind === 'tag' && fullName(layer.id, o.name) === fullName(layer.id, endpoint.slice(1))).map(o => o.value),
      ].filter(tag => !expectedMember || tag.kind === expectedMember) : []
      const endpointKinds = [...new Set(endpointTags.map(tag => tag.kind))]
      const endpointTag = endpointKinds.length === 1 ? endpointTags[0] : null
      const definition = Object.values(schemas.objectKinds ?? {}).map(d => d.relations?.[value.kind]).find(Boolean)
      const expected = kind === 'tag' ? value.kind : definition?.from ?? value.of ?? endpointTag?.kind ?? 'any'
      const objectName = v => expected === 'kind' && BUILTIN_KIND_NAMES.includes(v) ? v : expandNames(v, layer.id, { schema: { type: 'str', reference: expected }, vocabulary: schemas, objects })
      if (['tag', 'relation', 'section'].includes(kind)) qualified = qualifyObject(folders[kind], qualified, layer.id, (v) => qualify(v, { type: 'text' }), (_ns, v) => objectName(v))
      return readText(sourceValue(qualified), layer.id, schema, schemas)
    }
    if (!layer.id.startsWith('@') && !layer.missing) {
      for (const key of Object.keys(layer.config)) if (!['uses', 'kernel', 'version'].includes(key)) throw new Error(`${layer.id}/package.json: unknown field ${key}`)
      validateConfig(layer.config)
    }
    const qualifiedLayer = { ...layer, config: texts(layer.config ?? {}, schemas.game, 'configuration'), objects: [], overrides: [] }
    qualifiedLayers.push(qualifiedLayer)
    configurations.push(Object.fromEntries(Object.entries(qualifiedLayer.config).filter(([key]) => !['version', 'kernel', 'uses', 'packages'].includes(key))))
    for (const { kind, name: id, value } of layer.objects) {
      if (id.includes('/') && !id.startsWith(`${layer.id}/`)) throw new Error(`${layer.id}: declare foreign object ${id} in overrides`)
      const full = fullName(layer.id, id)
      const qualified = object(kind, value)
      qualifiedLayer.objects.push({ kind, name: full, value: qualified })
      record(kind, full, kind === 'tag' ? applyOverride('tag', { kind: value.kind, values: [] }, qualified) : qualified, layer, false)
    }
    for (const { kind, name: id, value } of layer.overrides ?? []) {
      name(id)
      const before = registries[kind]?.[identity(kind, id, value)]
      qualifiedLayer.overrides.push({ kind, name: id, value: object(kind, value) })
      const after = applyOverride(meaningsOf(schemas).some(meaning => meaning.type === kind && meaning.override) ? kind : schemas.objectKinds?.[kind]?.override === 'append' ? 'tag' : kind, before, object(kind, value), schemas)
      const levelRelation = (value = {}) => ['requires', 'order'].includes(value.kind) && (!value.of || value.of === 'level') && edges(value).every((edge) => [edge.from, edge.to].every((ref) => ref.startsWith('#') ? Boolean(registries.tag[tagKey('level', ref.slice(1))]) : Boolean(registries.level[ref]) || Boolean(edge.game && ref === edge.from)))
      if (before !== undefined && layer.id.startsWith('@') && !(kind === 'relation' && (!before || levelRelation(before)) && levelRelation(after))) throw new Error(`${layer.id}: games cannot override ${kind} ${id}`)
      record(kind, id, after, layer, true, object(kind, value))
    }
  }
  return { registries, qualifiedLayers, sources, overrideHistory: history, layerOrder: layers.map((l) => l.id), layerUses: Object.fromEntries(layers.map((l) => [l.id, l.id.startsWith('@') ? layers.filter((p) => !p.id.startsWith('@')).map((p) => p.id) : dependencyIds(l.config)])), configurations, catalogs }
}
