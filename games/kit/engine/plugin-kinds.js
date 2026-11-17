import { BUILTIN_POLICIES } from './kind-policy.js'
import { CHAPTER } from './course-schema.js'
import { catalogReader, sourceValue } from './catalogs.js'
// Data declarations extend an assembly, never process-wide content registries.
import { S, validate } from './schema.js'
import { mergeFields } from './collections.js'
import { contentKindSchemas } from './content-kinds.js'

export const BUILTIN_KIND_NAMES = ['level', 'task', 'entry', 'tag', 'relation', 'section', 'kind', 'chapter', 'game', ...Object.keys(contentKindSchemas)]

export const KIND_DECLARATION = S.obj({
  folder: S.opt(S.str({ pattern: '^[a-z][a-z0-9-]*$' })),
  schema: S.opt(S.any()), extends: S.opt(S.oneOf(['level', 'task'])),
  fields: S.opt(S.map(S.any())), play: S.opt(S.str({ reference: 'play' })), references: S.opt(S.list(S.str())),
  relations: S.opt(S.map(S.obj({ from: S.str(), to: S.str() }))),
  declares: S.oneOf(['package', 'game']),
  overrides: S.map(S.list(S.str()), { keys: '^(package|game)$' }),
  text: S.opt(S.list(S.str())),
  studio: S.opt(S.obj({ name: S.text(), icon: S.str(), group: S.opt(S.text()) })),
})
export const kindSchemas = schemas => ({ ...contentKindSchemas, chapter: CHAPTER, kind: KIND_DECLARATION,
  ...Object.fromEntries(Object.entries(schemas?.objectKinds ?? {}).filter(([, d]) => !d.extends).map(([name, d]) => [name, d.schema])) })

const extend = (schema, fields) => {
  if (schema.type === 'either') return { ...schema, of: schema.of.map(s => extend(s, fields)) }
  if (schema.type === 'by') return { ...schema, cases: Object.fromEntries(Object.entries(schema.cases).map(([k, s]) => [k, extend(s, fields)])) }
  if (schema.type !== 'obj') throw new Error('field extension needs object branches')
  for (const key of Object.keys(fields)) if (schema.fields[key]) throw new Error(`field extension cannot redefine ${key}`)
  return { ...schema, fields: { ...schema.fields, ...fields } }
}
/** Expand shared fields in declaration discriminator trees once, before consumers read their schemas. */
function declarationSchema(source) {
  const schema = { ...source }
  if (schema.fields) schema.fields = Object.fromEntries(Object.entries(schema.fields).map(([key, field]) => [key, declarationSchema(field)]))
  if (schema.of) schema.of = Array.isArray(schema.of) ? schema.of.map(declarationSchema) : declarationSchema(schema.of)
  if (schema.key) schema.key = declarationSchema(schema.key)
  if (schema.cases) schema.cases = Object.fromEntries(Object.entries(schema.cases).map(([key, branch]) => [key, declarationSchema(branch)]))
  if (schema.type === 'by' && schema.fields) {
    const fields = schema.fields
    delete schema.fields
    schema.cases = Object.fromEntries(Object.entries(schema.cases).map(([key, branch]) => [key, extend(branch, fields)]))
  }
  return schema
}

export function withKindDeclarations(vocabulary, layers, plugin = false) {
  const definitions = {}, raw = {}
  for (const layer of layers) {
    const catalogs = Object.fromEntries(Object.entries(layer.catalogs ?? {}).map(([lang, entries]) => [lang, {
      ...Object.fromEntries(Object.entries(entries).map(([key, text]) => [key.includes('/') ? key : `${layer.id}/${key}`, text])), ...entries,
    }]))
    const reader = catalogReader(catalogs)
    const read = object => layer.resolved ? object.value : reader(sourceValue(object.value), `kinds/${object.name}.json`, KIND_DECLARATION, vocabulary)
    for (const object of layer.objects.filter(o => o.kind === 'kind')) raw[object.name.includes('/') ? object.name : `${layer.id}/${object.name}`] = read(object)
    for (const object of (layer.overrides ?? []).filter(o => o.kind === 'kind')) {
      if (!raw[object.name]) continue
      raw[object.name] = mergeFields(raw[object.name], read(object), KIND_DECLARATION)
    }
  }
  for (const [name, d] of Object.entries(raw)) {
    const errors = validate(KIND_DECLARATION, d)
    if (errors.length) throw new Error(`${name}: ${JSON.stringify(errors)}`)
    if (d.play && d.extends !== 'task') throw new Error(`${name}: play scopes a task extension`)
    if (d.extends ? !d.fields || d.folder || d.schema && !d.play : !d.schema || !d.folder || d.fields) throw new Error(`${name}: declare folder + schema, or extends + fields`)
    if (!d.extends && Object.values(definitions).some(other => other.folder === d.folder)) throw new Error(`${name}: duplicate object folder ${d.folder}`)
    if (!d.extends && ['levels', 'tasks', 'entries', 'tags', 'relations', 'sections', 'chapters', 'kinds', 'symbols', 'core', 'view', 'i18n', 'overrides', ...Object.keys(contentKindSchemas)].includes(d.folder)) throw new Error(`${name}: reserved object folder ${d.folder}`)
    const inspect = schema => {
      const types = ['any', 'bool', 'num', 'int', 'str', 'text', 'oneOf', 'list', 'set', 'edges', 'map', 'obj', 'either', 'by', 'ref', 'name', 'level', 'task', 'board', 'syntax', 'call']
      if (!schema || !types.includes(schema.type)) throw new Error(`${name}: invalid field schema`)
      if (schema.type === 'obj' || schema.type === 'by') Object.values(schema.fields ?? {}).forEach(inspect)
      if (['list', 'set', 'edges', 'map'].includes(schema.type)) inspect(schema.of)
      if (schema.type === 'either') schema.of.forEach(inspect)
      if (schema.type === 'by') Object.values(schema.cases).forEach(inspect)
    }
    if (d.extends) { Object.values(d.fields).forEach(inspect); if (d.schema) inspect(d.schema) }
    else inspect(d.schema)
    const definition = structuredClone(d)
    if (definition.schema) definition.schema = declarationSchema(definition.schema)
    if (definition.fields) definition.fields = Object.fromEntries(Object.entries(definition.fields).map(([key, field]) => [key, declarationSchema(field)]))
    for (const path of d.text ?? []) {
      let field = definition.schema
      for (const key of path.split('.')) field = key === '*' ? field?.of : field?.fields?.[key]
      if (!field) throw new Error(`${name}: unknown text field ${path}`)
      Object.assign(field, { type: 'text' })
    }
    definitions[name] = definition
  }
  let level = vocabulary.level
  if (plugin) {
    const task = S.obj({ id: S.task(), step: S.opt(S.text()), brief: S.text(), play: S.str({ reference: 'play' }), after: S.opt(S.text()) })
    const generic = S.obj({ title: S.text(), intro: S.opt(S.list(S.obj({ t: S.text() }))), after: S.opt(S.text()), requires: S.opt(S.list(S.level())), tasks: S.list(task, { min: 1 }) })
    if (!level) level = generic
    else level = S.obj({ ...generic.fields, ...level.fields, tasks: S.list(S.either(level.fields.tasks.of, task), { min: 1 }) })
  }
  const extensions = Object.values(definitions).filter(d => d.extends)
  for (const d of extensions.filter(d => !d.play)) {
    if (d.extends === 'level') level = extend(level, d.fields)
    else {
      const tasks = s => s.type === 'either' ? { ...s, of: s.of.map(tasks) } : !s.fields.tasks ? s : { ...s, fields: { ...s.fields, tasks: { ...s.fields.tasks, of: extend(s.fields.tasks.of, d.fields) } } }
      level = tasks(level)
    }
  }
  // Scoped task fields form their own play branch, so unrelated plays may use the same field name.
  for (const d of extensions.filter(d => d.play)) {
    const tasks = s => {
      if (s.type === 'either') return { ...s, of: s.of.map(tasks) }
      if (!s.fields.tasks) return s
      const shape = s.fields.tasks.of
      const alternatives = schema => schema.type === 'either' ? schema.of.flatMap(alternatives) : [schema]
      const branches = alternatives(shape)
      const generic = branches.find(branch => branch.fields?.play?.type === 'str')
      if (!generic) throw new Error(`${d.play}: task extension needs a generic play task`)
      const base = { ...generic.fields, play: S.oneOf([d.play], { reference: 'play' }) }
      const own = d.schema ? extend(extend(d.schema, d.fields), base) : extend({ ...generic, fields: base }, d.fields)
      return { ...s, fields: { ...s.fields, tasks: { ...s.fields.tasks, of: S.either(...branches, own) } } }
    }
    level = tasks(level)
  }

  const scoped = extensions.filter(d => d.play).map(d => d.play)
  if (scoped.length) {
    const exclude = schema => {
      if (schema.type === 'either') return { ...schema, of: schema.of.map(exclude) }
      if (schema.fields?.play?.type === 'str') return { ...schema, fields: { ...schema.fields, play: { ...schema.fields.play, pattern: `^(?!(?:${scoped.join('|')})$).+` } } }
      if (!schema.fields?.tasks) return schema
      return { ...schema, fields: { ...schema.fields, tasks: { ...schema.fields.tasks, of: exclude(schema.fields.tasks.of) } } }
    }
    level = exclude(level)
  }

  return { ...vocabulary, level, kindPolicies: { ...BUILTIN_POLICIES, ...definitions }, objectKinds: definitions }
}
