// Dependency ordering, override composition and provenance shared by readers and author operations.
import { expandNames, fullName, OBJECT_KINDS } from './names.js'
import { qualifyObject, OBJECT_SCHEMAS } from './objects.js'
import { PARTS_FILE } from './parts/schema.js'
import { GLOSSARY } from './vocabulary.js'
import { catalogReader, sourceValue } from './catalogs.js'
import { mergePatch } from './ops/edit.js'

export const folders = { level: 'levels', piece: 'pieces', setting: 'settings', entry: 'entries', tag: 'tags', relation: 'relations', layout: 'layouts' }
export const kindForFolder = Object.fromEntries(Object.entries(folders).map(([kind, folder]) => [folder, kind]))
export const schemaForKind = (kind, schemas) => ({ level: schemas.level, piece: PARTS_FILE.fields.parts.of, setting: PARTS_FILE.fields.settings.of, entry: GLOSSARY.fields.entries.of, ...Object.fromEntries(Object.entries(OBJECT_SCHEMAS).map(([folder, schema]) => [kindForFolder[folder], schema])) })[kind]

/** The game must explicitly select the complete dependency closure. */
export function orderPackages(packages) {
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
  if (kind !== 'tag' && kind !== 'relation') return $merge ? mergePatch(before, data) : data
  const field = kind === 'tag' ? 'values' : 'edges'
  const values = kind === 'tag' ? (v) => v.values ?? [] : edges
  const result = [...(replace ? [] : values(before)).filter((v) => !remove.some((r) => kind === 'tag' ? r === v : Object.entries(r).every(([key, value]) => v[key] === value))), ...values(data)]
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
  const allowed = new Set([layer.id, ...(layer.id.startsWith('@') ? layers.filter((l) => !l.id.startsWith('@')).map((l) => l.id) : layer.config.uses ?? [])])
  const name = (v) => {
    const qualified = fullName(layer.id, v)
    if (typeof qualified === 'string' && qualified.includes('/') && !allowed.has(qualified.split('/')[0])) throw new Error(`${layer.id}: undeclared dependency in ${qualified}`)
    return qualified
  }
  const pieces = new Set(layer.objects.filter((o) => o.kind === 'piece').map((o) => o.name))
  const pieceRules = new Set(layer.objects.filter((o) => o.kind === 'piece' && o.value.inside && ['logic:family-lemma', 'logic:family-rule'].includes(o.value.family)).map((o) => o.name))
  const qualify = (value, schema, context = '') => expandNames(value, layer.id, { pieces, pieceRules, schema, vocabulary: schemas, context, resolve: name })
  return { name, pieces, qualify }
}

/** Qualify declarations before composing, so short references retain their author's namespace. */
export function composeLayers(layers, schemas) {
  layers = [...orderPackages(layers.filter((layer) => !layer.id.startsWith('@'))), ...layers.filter((layer) => layer.id.startsWith('@'))]
  const registries = Object.fromEntries([...OBJECT_KINDS, 'i18n'].map((kind) => [kind, {}]))
  const sources = Object.fromEntries(Object.keys(registries).map((kind) => [kind, {}]))
  const history = [], catalogs = {}, configurations = [], groups = []
  const dependencies = new Map(layers.map((layer) => [layer.id, layer.config?.uses ?? []]))
  const depends = (a, b, seen = new Set()) => {
    if (seen.has(a)) return false
    seen.add(a)
    return (dependencies.get(a) ?? []).some((dep) => dep === b || depends(dep, b, seen))
  }
  const record = (kind, name, value, layer, override) => {
    const before = registries[kind][name]
    if (override && before === undefined && !(kind === 'i18n' && Object.keys(registries.i18n).some((key) => key.slice(key.indexOf(':') + 1) === name.slice(name.indexOf(':') + 1)))) throw new Error(`${layer.id}: cannot override unknown ${kind} ${name}`)
    if (!override && before !== undefined) throw new Error(`duplicate ${kind} ${name}`)
    if (override) {
      sources[kind][name] ??= { declaration: name.slice(name.indexOf(':') + 1).split('/')[0], overrides: [] }
      for (const previous of sources[kind][name].overrides) if (!previous.startsWith('@') && !layer.id.startsWith('@') && !depends(layer.id, previous) && !depends(previous, layer.id)) throw new Error(`conflicting overrides of ${kind} ${name}: ${previous}, ${layer.id}`)
      history.push({ kind, name, layer: layer.id, before: structuredClone(kind === 'i18n' ? before : sourceValue(before)), after: structuredClone(kind === 'i18n' ? value : sourceValue(value)) })
      sources[kind][name].overrides.push(layer.id)
    } else sources[kind][name] = { declaration: layer.id, overrides: [] }
    registries[kind][name] = value
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
    const { name, pieces, qualify } = contextFor(layer, layers, schemas)
    const texts = (value, schema, context = '') => readText(sourceValue(qualify(value, schema, context)), layer.id, schema, schemas)
    const object = (kind, value) => {
      const schema = schemaForKind(kind, schemas)
      let qualified = qualify(value, schema)
      const endpoint = [...(value.edges ?? []).flatMap((e) => [e.from, e.to]), ...(value.sequence ?? [])][0]
      const endpointTag = typeof endpoint === 'string' && endpoint.startsWith('#') ? registries.tag[fullName(layer.id, endpoint.slice(1))] ?? layer.objects.find((o) => o.kind === 'tag' && o.name === endpoint.slice(1))?.value : null
      const item = kind === 'tag' && value.kind === 'item' || kind === 'relation' && (value.kind === 'replaces' || value.kind === 'order' && (value.of === 'item' || endpointTag?.kind === 'item' || schemas.kinds?.part?.[endpoint]))
      const objectName = (v) => item && typeof v === 'string' && !v.includes('/') && !v.startsWith('#') && schemas.kinds?.part?.[v.split('.')[0]] && !pieces.has(v.split('.')[0]) ? v : typeof v === 'string' && v.startsWith('#') ? `#${name(v.slice(1))}` : name(v)
      if (['tag', 'relation', 'layout'].includes(kind)) qualified = qualifyObject(folders[kind], qualified, layer.id, (v) => qualify(v, { type: 'text' }), (_ns, v) => objectName(v))
      return readText(sourceValue(qualified), layer.id, schema, schemas)
    }
    configurations.push(texts(layer.config ?? {}, schemas.game, 'configuration'))
    if (layer.glossary) groups.push(...texts({ ...layer.glossary, entries: [] }, GLOSSARY).groups)
    for (const { kind, name: id, value } of layer.objects) {
      if (id.includes('/') && !id.startsWith(`${layer.id}/`)) throw new Error(`${layer.id}: declare foreign object ${id} in overrides`)
      record(kind, fullName(layer.id, id), object(kind, value), layer, false)
    }
    for (const { kind, name: id, value } of layer.overrides ?? []) {
      name(id)
      const before = registries[kind]?.[id]
      if (before === undefined) throw new Error(`${layer.id}: cannot override unknown ${kind} ${id}`)
      const after = applyOverride(kind, before, object(kind, value))
      const levelRelation = (value) => ['requires', 'order'].includes(value.kind) && (!value.of || value.of === 'level') && edges(value).every((edge) => [edge.from, edge.to].every((ref) => ref.startsWith('#') ? registries.tag[ref.slice(1)]?.kind === 'level' : Boolean(registries.level[ref]) || Boolean(edge.game && ref === edge.from)))
      if (layer.id.startsWith('@') && !(kind === 'layout' || kind === 'relation' && levelRelation(before) && levelRelation(after))) throw new Error(`${layer.id}: games cannot override ${kind} ${id}`)
      record(kind, id, after, layer, true)
    }
  }
  return { registries, sources, overrideHistory: history, layerOrder: layers.map((l) => l.id), layerUses: Object.fromEntries(layers.map((l) => [l.id, l.id.startsWith('@') ? layers.filter((p) => !p.id.startsWith('@')).map((p) => p.id) : l.config.uses ?? []])), configurations, catalogs, groups }
}
