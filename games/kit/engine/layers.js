// Dependency ordering, override composition and provenance shared by readers and author operations.
import { tagKey, tagName, kernelTags } from './tag-identity.js'
import { kindSchemas, BUILTIN_KIND_NAMES } from './plugin-kinds.js'
import { CONTENT_KINDS, contentKindSchemas } from './content-kinds.js'
import { expandNames, fullName, OBJECT_KINDS } from './names.js'
import { qualifyObject, OBJECT_SCHEMAS } from './objects.js'
import { PARTS_FILE } from './parts/schema.js'
import { ENTRY } from './vocabulary.js'
import { catalogReader, sourceValue } from './catalogs.js'
import { mergePatch } from './ops/edit.js'

export const folders = { level: 'levels', part: 'parts', entry: 'entries', tag: 'tags', relation: 'relations', section: 'sections', tray: 'trays', ...Object.fromEntries(Object.keys(contentKindSchemas).map(kind => [kind, CONTENT_KINDS[kind].folder ?? kind])) }
export const kindForFolder = Object.fromEntries(Object.entries(folders).map(([kind, folder]) => [folder, kind]))
export const schemaForKind = (kind, schemas) => ({ level: schemas.level, part: PARTS_FILE.fields.parts.of, entry: ENTRY, ...kindSchemas(schemas), ...Object.fromEntries(Object.entries(OBJECT_SCHEMAS).map(([folder, schema]) => [kindForFolder[folder], schema])) })[kind]

/** The game must explicitly select the complete dependency closure. */
export function orderPackages(packages) {
  if (packages.some(p => p.id === 'kernel')) throw new Error('kernel is a reserved namespace')
  const byId = new Map(packages.map((p) => [p.id, p]))
  if (byId.size !== packages.length) throw new Error('duplicate package selection')
  for (const p of packages) {
    if (!Array.isArray(p.config.uses ?? [])) throw new Error(`${p.id}: uses must be an array`)
    for (const dep of p.config.uses ?? []) if (!byId.has(dep)) throw new Error(`${p.id}: missing dependency ${dep} in game packages`)
  }
  const out = [], remaining = new Set(byId.keys())
  while (remaining.size) {
    const next = [...remaining].sort().find((id) => (byId.get(id).config.uses ?? []).every((dep) => !remaining.has(dep)))
    if (!next) throw new Error(`circular package dependencies: ${[...remaining].sort().join(', ')}`)
    remaining.delete(next); out.push(byId.get(next))
  }
  return out
}

const edges = (value) => [...(value.edges ?? []), ...(value.sequence ?? []).slice(1).map((to, i) => ({ from: value.sequence[i], to }))]
const same = (a, b) => typeof a === 'string' ? a === b : Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([key, value]) => b[key] === value)

/** Apply the override rules without retaining patch control fields in objects. */
export function applyOverride(kind, before, patch) {
  const { $merge, replace, remove = [], ...data } = patch
  if (!['tag', 'relation', 'tray', 'section'].includes(kind)) return $merge ? mergePatch(before, data) : data
  if (kind === 'tag' && data.kind && data.kind !== before.kind) throw new Error('a tag override cannot change its member kind')
  const field = kind === 'relation' ? 'edges' : 'values'
  const values = kind === 'relation' ? edges : (v) => v.values ?? []
  const result = [...(replace ? [] : values(before)).filter((v) => !remove.some((r) => kind !== 'relation' ? r === v : Object.entries(r).every(([key, value]) => v[key] === value))), ...values(data)]
  const { sequence: _sequence, ...merged } = { ...before, ...data }
  if (kind === 'tray') {
    const menus = new Map((replace ? [] : before.menus ?? []).filter(menu => !remove.includes(menu.id)).map(menu => [menu.id, menu]))
    for (const menu of data.menus ?? []) {
      const old = menus.get(menu.id)
      menus.set(menu.id, { ...old, ...menu, values: [...new Set([...(old?.values ?? []).filter(value => !remove.includes(value)), ...menu.values])] })
    }
    merged.menus = [...menus.values()]
  }
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
  const allowed = new Set(['kernel', layer.id, ...(layer.id.startsWith('@') ? layers.filter((l) => !l.id.startsWith('@')).map((l) => l.id) : layer.config.uses ?? [])])
  const name = (v) => {
    const qualified = fullName(layer.id, v)
    if (typeof qualified === 'string' && qualified.includes('/') && !allowed.has(qualified.split('/')[0])) throw new Error(`${layer.id}: undeclared dependency in ${qualified}`)
    return qualified
  }
  const parts = new Set(layer.objects.filter((o) => o.kind === 'part').map((o) => o.name))
  const partRules = new Set(layer.objects.filter((o) => o.kind === 'part' && o.value.inside && ['logic:family-lemma', 'logic:family-rule'].includes(o.value.family)).map((o) => o.name))
  const qualify = (value, schema, context = '') => expandNames(value, layer.id, { parts, partRules, schema, vocabulary: schemas, context, resolve: name })
  return { name, parts, qualify }
}

/** Qualify declarations before composing, so short references retain their author's namespace. */
export function composeLayers(layers, schemas) {
  layers = [...orderPackages(layers.filter((layer) => !layer.id.startsWith('@'))), ...layers.filter((layer) => layer.id.startsWith('@'))]
  const registries = Object.fromEntries([...new Set([...OBJECT_KINDS, ...Object.keys(kindSchemas(schemas)), 'i18n'])].map((kind) => [kind, {}]))
  const sources = Object.fromEntries(Object.keys(registries).map((kind) => [kind, {}]))
  const history = [], catalogs = {}, configurations = []
  const readers = new Map([...kernelTags, ...layers.flatMap(layer => (layer.tagReaders ?? []).map(reader => [tagKey(reader.member, reader.name), reader]))])
  for (const [key, reader] of readers) {
    registries.tag[key] = { kind: reader.member, values: [] }
    sources.tag[key] = { declaration: null, reader: reader.reader, overrides: [], members: {} }
  }
  const identity = (kind, name, value) => kind === 'tag' ? tagKey(value.kind, name) : name
  const dependencies = new Map(layers.map((layer) => [layer.id, layer.config?.uses ?? []]))
  const depends = (a, b, seen = new Set()) => {
    if (seen.has(a)) return false
    seen.add(a)
    return (dependencies.get(a) ?? []).some((dep) => dep === b || depends(dep, b, seen))
  }
  const record = (kind, name, value, layer, override, contribution) => {
    const key = identity(kind, name, value)
    const before = registries[kind][key]
    if (override && before === undefined && !(kind === 'i18n' && Object.keys(registries.i18n).some((key) => key.slice(key.indexOf(':') + 1) === name.slice(name.indexOf(':') + 1)))) throw new Error(`${layer.id}: cannot override unknown ${kind} ${name}`)
    if (!override && before !== undefined && !(kind === 'tag' && !sources.tag[key]?.declaration)) throw new Error(`duplicate ${kind} ${name}`)
    if (override) {
      sources[kind][key] ??= { declaration: name.slice(name.indexOf(':') + 1).split('/')[0], overrides: [] }
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
      if (namespace !== layer.id && !layer.id.startsWith('@') && !(layer.config.uses ?? []).includes(namespace)) throw new Error(`${layer.id}: undeclared dependency ${namespace}`)
      for (const [key, text] of Object.entries(entries)) {
        if (key.includes('/') && !key.startsWith(`${namespace}/`)) throw new Error(`${layer.id}: ${key} is outside override namespace ${namespace}`)
        record('i18n', `${lang}:${fullName(namespace, key)}`, words(text), layer, true)
      }
    }
  }
  for (const [name, text] of Object.entries(registries.i18n)) { const i = name.indexOf(':'); (catalogs[name.slice(0, i)] ??= {})[name.slice(i + 1)] = text }
  const readText = catalogReader(catalogs)
  for (const layer of layers) {
    const { name, parts, qualify } = contextFor(layer, layers, schemas)
    const texts = (value, schema, context = '') => readText(sourceValue(qualify(value, schema, context)), layer.id, schema, schemas)
    const object = (kind, value) => {
      if (kind === 'entry' && (Object.hasOwn(value, 'id') || Object.hasOwn(value, 'group'))) throw new Error('entry identity belongs in its name and membership in entry tags')
      const direct = owner => owner === layer.id || layer.id.startsWith('@') || (layer.config.uses ?? []).includes(owner)
      const memberType = kind === 'tag' ? value.kind : kind === 'relation' ? value.member ?? value.of : null
      if (memberType?.includes('/') && !direct(memberType.split('/')[0])) throw new Error(`${layer.id}: undeclared object type dependency ${memberType}`)
      if (kind === 'level') for (const task of value.tasks ?? []) {
        const owner = task.play?.split(':')[0]
        if (owner && layers.some(other => other.id === owner && other.hasCore) && !direct(owner)) throw new Error(`${layer.id}: undeclared play dependency ${task.play}`)
      }
      if (kind.includes('/') && kind.split('/')[0] !== layer.id && !(layer.config.uses ?? []).includes(kind.split('/')[0])) throw new Error(`${layer.id}: undeclared object kind dependency ${kind}`)
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
      const item = kind === 'tag' && value.kind === 'part' || kind === 'relation' && (value.kind === 'replaces' || value.kind === 'order' && (value.of === 'part' || endpointTag?.kind === 'part' || schemas.kinds?.part?.[endpoint]))
      const objectName = (v) => kind === 'tag' && value.kind === 'kind' && BUILTIN_KIND_NAMES.includes(v) ? v : item && typeof v === 'string' && !v.includes('/') && !v.startsWith('#') && schemas.kinds?.part?.[v.split('.')[0]] && !parts.has(v.split('.')[0]) ? v : typeof v === 'string' && v.startsWith('#') ? `#${name(v.slice(1))}` : name(v)
      if (['tag', 'relation', 'section', 'tray'].includes(kind)) qualified = qualifyObject(folders[kind], qualified, layer.id, (v) => qualify(v, { type: 'text' }), (_ns, v) => objectName(v))
      return readText(sourceValue(qualified), layer.id, schema, schemas)
    }
    if (!layer.id.startsWith('@')) {
      for (const key of Object.keys(layer.config)) if (!['uses', 'vocabulary'].includes(key)) throw new Error(`${layer.id}/package.json: unknown field ${key}`)
      const version = layer.config.vocabulary
      if (!Number.isInteger(version) || version < 1 || version > schemas.version) throw new Error(`${layer.id}/package.json: vocabulary ${version} exceeds or falls outside kernel versions 1 to ${schemas.version}`)
    }
    configurations.push(texts(layer.config ?? {}, schemas.game, 'configuration'))
    for (const { kind, name: id, value } of layer.objects) {
      if (id.includes('/') && !id.startsWith(`${layer.id}/`)) throw new Error(`${layer.id}: declare foreign object ${id} in overrides`)
      const full = fullName(layer.id, id)
      const qualified = object(kind, value)
      record(kind, full, kind === 'tag' ? applyOverride('tag', { kind: value.kind, values: [] }, qualified) : qualified, layer, false)
    }
    for (const { kind, name: id, value } of layer.overrides ?? []) {
      name(id)
      const before = registries[kind]?.[identity(kind, id, value)]
      if (before === undefined) throw new Error(`${layer.id}: cannot override unknown ${kind} ${id}`)
      const after = applyOverride(schemas.objectKinds?.[kind]?.override === 'append' ? 'tag' : kind, before, object(kind, value))
      const levelRelation = (value) => ['requires', 'order'].includes(value.kind) && (!value.of || value.of === 'level') && edges(value).every((edge) => [edge.from, edge.to].every((ref) => ref.startsWith('#') ? Boolean(registries.tag[tagKey('level', ref.slice(1))]) : Boolean(registries.level[ref]) || Boolean(edge.game && ref === edge.from)))
      if (layer.id.startsWith('@') && !(kind === 'relation' && levelRelation(before) && levelRelation(after))) throw new Error(`${layer.id}: games cannot override ${kind} ${id}`)
      record(kind, id, after, layer, true, object(kind, value))
    }
  }
  return { registries, sources, overrideHistory: history, layerOrder: layers.map((l) => l.id), layerUses: Object.fromEntries(layers.map((l) => [l.id, l.id.startsWith('@') ? layers.filter((p) => !p.id.startsWith('@')).map((p) => p.id) : l.config.uses ?? []])), configurations, catalogs }
}
