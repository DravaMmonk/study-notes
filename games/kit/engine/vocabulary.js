import { meaningsOf, derivedFields } from './kind-meanings.js'
import { contentExistenceProblems } from './existence.js'
import { shapeAt } from './schema.js'
import { kindSchemas } from './plugin-kinds.js'
// A domain's vocabulary: everything content may name (games/DESIGN.md 6.2). Content is data made of the vocabulary's
// items and their parameters, and nothing else; whatever it needs that the vocabulary lacks is a new item, written in
// the domain (code, under review), never worked around in the content.
//
// defineVocabulary({
//   domain    the domain's id ('table')
//   kinds     { kind: { item: { about, params? } } }   about: what the item is, { zh, en }; params: its schema
//             (schema.js), absent for an item that takes none
//   game      the schema of a game's game.json
//   level     the schema of one level (levels/<id>.json; its id is the file's name)
//   languages { lang: { about } }   the small languages content writes in (S.syntax(lang)); the domain module reads
//             them (its `languages`: { lang: (text) → why it cannot be read, or null }, never throwing on bad text)
// })
//
import { S, validate } from './schema.js'
import { dependencyCycle, eraLevels, layout } from '../course.js'
import { courseDependencies } from './course-dependencies.js'
import { BLUEPRINT } from '../pipeline/blueprint.js'
import { taskIdProblems } from './tasks.js'

import { contentSchemas, configurationFiles, contentFileFor, hasCatalogSource } from './content.js'
import { catalogTextProblems } from './content-text.js'
import { OBJECT_SCHEMAS, referenceResolver, expandReferences } from './objects.js'

/** Authored entries have identity in their filename and membership in entry tags. */
export { ENTRY, GLOSSARY, OPEN, defineVocabulary, describe } from './content-schemas.js'
import { ENTRY, GLOSSARY, OPEN } from './content-schemas.js'

/**
 * Every place a game's content (content.js assemble) does not fit its domain's vocabulary, as [{ at, says }]: the
 * file and the path in it. `domain`: the domain module, its vocabulary and the readers of its languages. A course blueprint (blueprint.json) is the kernel's, the same in every domain; so is the rule
 * that task ids are unique in a game and never another level's (tasks.js).
 */
export function checkContent({ vocabulary: suppliedVocabulary, languages = null, names: domainNames = () => ({}) }, content) {
  const out = []
  const domainVocabulary = { ...suppliedVocabulary, meanings: contentSchemas.get(content)?.meanings ?? suppliedVocabulary.meanings }
  const baseVocabulary = meaningsOf(domainVocabulary).reduce((vocabulary, meaning) => meaning.validationVocabulary?.({ vocabulary, content }) ?? vocabulary, domainVocabulary)
  const vocabulary = { ...baseVocabulary, kinds: { ...baseVocabulary.kinds, ...Object.fromEntries(Object.entries(domainVocabulary.objectKinds ?? {}).filter(([, definition]) => !definition.extends).map(([kind]) => [kind, content.registries?.[kind] ?? {}])) } }
  const add = (problems, file) => out.push(...problems.map((p) => ({ at: `${file}${p.at === '(root)' ? '' : p.at}`, says: p.says })))
  // Audit findings remain optional. Chapters retain their authored tag references.
  const { objectKinds: _objectKinds, packageTarget, id: ID, levels, glossary, vocabulary: _version, open, blueprint, tags = {}, relations = {}, sections = {}, relationEdges: _edges, objectProblems = [], sourceChapters, eras, overridden = {}, registries: _registries, sources: _sources, overrideHistory: _history, layerOrder: _layerOrder, layerUses: _layerUses, ...played } = content
  const configuration = Object.fromEntries(Object.entries(played).filter(([key]) => !derivedFields(domainVocabulary).includes(key)))
  const game = sourceChapters ? { ...configuration, chapters: sourceChapters } : configuration
  out.push(...objectProblems.filter(problem => problem.rule !== 'exists'), ...contentExistenceProblems(content, vocabulary))
  if (out.some(problem => problem.rule === 'exists')) return out
  const courseKeys = new Map(), packageKeys = new Map()
  if (hasCatalogSource(content)) {
    for (const [file, value] of Object.entries(configurationFiles(game))) {
      if (packageTarget && ['game.json', 'course.json'].includes(file)) continue
      out.push(...catalogTextProblems(value, vocabulary.game, file, vocabulary, file === 'game.json' || file === 'course.json' ? courseKeys : packageKeys))
    }
    out.push(...catalogTextProblems(blueprint, BLUEPRINT, 'blueprint.json', vocabulary, courseKeys))
    for (const { id, group: _group, ...entry } of glossary?.entries ?? []) out.push(...catalogTextProblems(entry, ENTRY, `entries/${id}.json`, vocabulary, packageKeys))
    for (const level of levels) out.push(...catalogTextProblems(level, vocabulary.level, `levels/${level.id}.json`, vocabulary, packageKeys))
    for (const [id, tag] of Object.entries(tags)) out.push(...catalogTextProblems(tag, OBJECT_SCHEMAS.tags, `tags/${id}.json`, vocabulary, id.startsWith('@') ? courseKeys : packageKeys))
  }
  for (const [key, was] of Object.entries(overridden)) if (was === null) out.push({ at: 'overrides', says: `${key} stands over no text of the package` })
  const ids = new Set(levels.map((l) => l.id))
  // Registry names and domain-specific configuration names used by S.name.
  const names = { ...Object.fromEntries(Object.keys(kindSchemas(domainVocabulary)).map(kind => [kind, new Set(Object.keys(content.registries?.[kind] ?? {}))])), entry: new Set((glossary?.entries ?? []).map(entry => entry.id)), group: new Set((glossary?.groups ?? []).map(group => group.id)), tag: new Set(Object.keys(tags)), section: new Set(Object.keys(sections)), relation: new Set(Object.keys(relations)), ...domainNames(content), ...Object.assign({}, ...meaningsOf(domainVocabulary).map(meaning => meaning.validationNames?.({ content }))) }
  for (const [kind, schema] of Object.entries(kindSchemas(domainVocabulary)).filter(([kind]) => !meaningsOf(domainVocabulary).some(meaning => meaning.type === kind && meaning.validate))) for (const [name, object] of Object.entries(content.registries?.[kind] ?? {})) {
    if (kind === 'kind' && !content.objectKinds?.[name] || name.includes(':')) continue
    add(validate(schema, object, { vocabulary, levels: ids, languages, names }), `${kind}/${name}.json`)
    if (hasCatalogSource(content)) out.push(...catalogTextProblems(object, schema, `${kind}/${name}.json`, vocabulary, packageKeys))
  }
  const expand = referenceResolver(content.registries ?? { level: Object.fromEntries(levels.map((l) => [l.id, l])), entry: {}, tag: tags }, out)
  const inspectReferences = (schema, value, from, at) => {
    if (!schema || value == null) return
    if (schema.type === 'either') return inspectReferences(shapeAt(schema, value, [], { vocabulary }), value, from, at)
    if (schema.type === 'by') return inspectReferences(schema.cases[value[schema.field]], value, from, at)
    const target = schema.reference ?? (['name', 'ref'].includes(schema.type) ? schema.kind : null)
    const definition = vocabulary.objectKinds?.[target]
    if (definition?.references && !definition.references.includes(from)) out.push({ at, says: `${from} cannot reference ${target}` })
    if (Array.isArray(value)) value.forEach((item, i) => inspectReferences(schema.of, item, from, `${at}[${i}]`))
    else if (typeof value === 'object' && schema.type !== 'text') for (const [key, item] of Object.entries(value)) inspectReferences(schema.type === 'map' ? schema.of : schema.fields?.[key], item, from, `${at}.${key}`)
  }
  for (const [kind, schema] of Object.entries(kindSchemas(vocabulary))) if (kind !== 'kind') for (const [name, value] of Object.entries(content.registries?.[kind] ?? {})) inspectReferences(schema, value, kind, `${kind}/${name}`)
  for (const level of levels) {
    const { tasks: _tasks, ...own } = level
    inspectReferences(vocabulary.level, own, 'level', level.id)
    for (const task of level.tasks ?? []) inspectReferences(vocabulary.level.fields?.tasks?.of, task, 'task', task.id)
  }
  const resolvedGame = expandReferences(game, vocabulary.game, expand, vocabulary)
  for (const [kind, objects] of Object.entries({ tags, relations, sections })) for (const [name, object] of Object.entries(objects)) {
    add(validate(OBJECT_SCHEMAS[kind], object, { vocabulary, levels: ids, languages, names }), `${kind}/${name}.json`)
    if (kind !== 'tags' && hasCatalogSource(content)) out.push(...catalogTextProblems(object, OBJECT_SCHEMAS[kind], `${kind}/${name}.json`, vocabulary, packageKeys))
  }
  // Packages validate their authored configuration without requiring game or course fields.
  const packageFields = packageTarget?.fields ?? []
  const gameSchema = packageTarget ? S.obj(Object.fromEntries(Object.entries(vocabulary.game.fields).filter(([key]) => contentFileFor([key]) === 'package.json').map(([key, schema]) => [key, { ...schema, optional: true }]))) : vocabulary.game
  const gameValue = packageTarget ? Object.fromEntries(packageFields.map((key) => [key, resolvedGame[key]])) : resolvedGame
  const gameProblems = validate(gameSchema, gameValue, { vocabulary, levels: ids, languages, names })
  add(gameProblems, packageTarget ? 'package.json' : 'game.json')
  if (eras) {
    out.push(...courseProblems(eras))
    const dependencies = courseDependencies(content)
    out.push(...dependencies.problems)
    const cycle = dependencyCycle(layout(eras, { links: dependencies.links }).requires)
    if (cycle) out.push({ at: 'game.json.eras', says: `circular prerequisites: ${cycle.join(' → ')}` })
  }
  if (open !== undefined) add(validate(OPEN, open, { vocabulary }), 'game.json.open')
  for (const { id: levelId, ...level } of levels) add(validate(vocabulary.level, level, { vocabulary, levels: ids, languages, names }), `levels/${levelId}.json`)
  out.push(...taskIdProblems(levels))
  for (const { id, ...entry } of Object.values(content.registries?.entry ?? Object.fromEntries((glossary?.entries ?? []).map(({ group: _group, ...entry }) => [entry.id, entry])))) add(validate(ENTRY, entry, { vocabulary, levels: ids, names }), `entries/${id}.json`)
  if (blueprint !== undefined) add(validate(BLUEPRINT, blueprint, { vocabulary }), 'blueprint.json')
  for (const meaning of meaningsOf(domainVocabulary)) out.push(...(meaning.validate?.({ content, vocabulary: domainVocabulary }) ?? []))
  return out
}

/**
 * Validate selected sections after projecting them onto their chapters.
 */
function courseProblems(played) {
  const out = []
  const plan = layout(played)
  for (const [e, era] of played.entries()) {
    const own = new Set(eraLevels(era)), drawn = new Map()
    for (const [r, row] of (Array.isArray(era.rows) ? era.rows : []).entries()) {
      if (!Array.isArray(row)) continue
      const at = `game.json.eras[${e}].rows[${r}]`
      if (row.length > 3) out.push({ at, says: `a row of the map has at most three places, not ${row.length}` })
      for (const id of row) if (id !== null) {
        if (!own.has(id)) out.push({ at, says: `${id} is not in this chapter` })
        else if (drawn.has(id)) out.push({ at, says: `${id} is on the map twice` })
        else drawn.set(id, r)
      }
    }
    for (const [id, r] of drawn) for (const from of plan.requires.get(id) ?? []) {
      if (drawn.has(from) && drawn.get(from) >= r) out.push({ at: `game.json.eras[${e}].rows[${r}]`, says: `${id} is drawn on a row no lower than its prerequisite ${from}` })
    }
  }
  return out
}
