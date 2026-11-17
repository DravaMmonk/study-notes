import { catalogReader, sourceValue } from './catalogs.js'
// Data declarations extend an assembly, never process-wide content registries.
import { S, validate } from './schema.js'
import { mergePatch } from './ops/edit.js'
import { contentKindSchemas } from './content-kinds.js'

export const BUILTIN_KIND_NAMES = ['level', 'task', 'entry', 'tag', 'relation', 'section', 'kind', ...Object.keys(contentKindSchemas)]

export const KIND_DECLARATION = S.obj({
  folder: S.opt(S.str({ pattern: '^[a-z][a-z0-9-]*$' })),
  schema: S.opt(S.any()), extends: S.opt(S.oneOf(['level', 'task'])),
  fields: S.opt(S.map(S.any())), references: S.opt(S.list(S.str())),
  relations: S.opt(S.map(S.obj({ from: S.str(), to: S.str() }))),
  override: S.opt(S.oneOf(['replace', 'append'])),
  text: S.opt(S.list(S.str())),
  studio: S.opt(S.obj({ name: S.text(), icon: S.str(), group: S.opt(S.text()) })),
})
export const kindSchemas = schemas => ({ ...contentKindSchemas, kind: KIND_DECLARATION,
  ...Object.fromEntries(Object.entries(schemas?.objectKinds ?? {}).filter(([, d]) => !d.extends).map(([name, d]) => [name, d.schema])) })

const extend = (schema, fields) => {
  if (schema.type === 'either') return { ...schema, of: schema.of.map(s => extend(s, fields)) }
  if (schema.type === 'by') return { ...schema, cases: Object.fromEntries(Object.entries(schema.cases).map(([k, s]) => [k, extend(s, fields)])) }
  for (const key of Object.keys(fields)) if (schema.fields[key]) throw new Error(`field extension cannot redefine ${key}`)
  return { ...schema, fields: { ...schema.fields, ...fields } }
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
      const { $merge, ...value } = read(object)
      raw[object.name] = $merge ? mergePatch(raw[object.name], value) : value
    }
  }
  for (const [name, d] of Object.entries(raw)) {
    const errors = validate(KIND_DECLARATION, d)
    if (errors.length) throw new Error(`${name}: ${JSON.stringify(errors)}`)
    if (d.extends ? !d.fields || d.schema || d.folder : !d.schema || !d.folder || d.fields) throw new Error(`${name}: declare folder + schema, or extends + fields`)
    if (!d.extends && Object.values(definitions).some(other => other.folder === d.folder)) throw new Error(`${name}: duplicate object folder ${d.folder}`)
    if (!d.extends && ['levels', 'tasks', 'entries', 'tags', 'relations', 'sections', 'kinds', 'symbols', 'core', 'view', 'i18n', 'overrides', ...Object.keys(contentKindSchemas)].includes(d.folder)) throw new Error(`${name}: reserved object folder ${d.folder}`)
    if (d.override === 'append' && d.schema?.fields?.values?.type !== 'list') throw new Error(`${name}: append overrides require a values list`)
    const inspect = schema => {
      const types = ['any', 'bool', 'num', 'int', 'str', 'text', 'oneOf', 'list', 'map', 'obj', 'either', 'by', 'ref', 'name', 'level', 'task', 'board', 'syntax', 'call']
      if (!schema || !types.includes(schema.type)) throw new Error(`${name}: invalid field schema`)
      if (schema.type === 'obj') Object.values(schema.fields ?? {}).forEach(inspect)
      if (['list', 'map'].includes(schema.type)) inspect(schema.of)
      if (schema.type === 'either') schema.of.forEach(inspect)
      if (schema.type === 'by') Object.values(schema.cases).forEach(inspect)
    }
    if (d.extends) Object.values(d.fields).forEach(inspect)
    else inspect(d.schema)
    const definition = structuredClone(d)
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
  for (const d of Object.values(definitions).filter(d => d.extends)) {
    if (d.extends === 'level') level = extend(level, d.fields)
    else {
      const tasks = s => s.type === 'either' ? { ...s, of: s.of.map(tasks) } : !s.fields.tasks ? s : { ...s, fields: { ...s.fields, tasks: { ...s.fields.tasks, of: extend(s.fields.tasks.of, d.fields) } } }
      level = tasks(level)
    }
  }
  return { ...vocabulary, level, objectKinds: definitions }
}
