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
// A domain whose kinds hold engine resources (`op`, run by its ops.js) defines its parts as data: each of its games
// has a parts/<name>.json (parts/schema.js), and content's S.ref('part') names a part of it (parts/define.js withParts). Such
// a vocabulary also gives the families parts are coloured by (`family`), and may give widgets (`widget`): settings or
// displays the kernel's controls cannot draw.
import { S, validate } from './schema.js'
import { dependencyCycle, eraLevels, layout } from '../course.js'
import { courseDependencies } from './course-dependencies.js'
import { BLUEPRINT } from '../pipeline/blueprint.js'
import { taskIdProblems, taskIdsOf } from './tasks.js'
import { partProblems, withParts } from './parts/define.js'
import { implementationProblems } from './parts/dependencies.js'
import { makesParts, PARTS_FILE } from './parts/schema.js'
import { configurationFiles, contentFileFor, hasCatalogSource } from './content.js'
import { catalogTextProblems } from './content-text.js'
import { OBJECT_SCHEMAS, referenceResolver, expandReferences } from './objects.js'

/** Authored entries have identity in their filename and membership in entry tags. */
export const ENTRY = S.obj({ title: S.text(), aliases: S.opt(S.list(S.text(), { min: 1 })), body: S.list(S.text()), at: S.opt(S.level()), see: S.opt(S.list(S.name('entry'))) })

/** A game's encyclopedia (the shell's glossary): groups, and entries opening at a level (`at`) and linking others. */
export const GLOSSARY = S.obj({
  englishNamesInChinese: S.opt(S.bool()),
  groupByChapter: S.opt(S.bool()),
  groups: S.list(S.obj({ id: S.str(), title: S.text(), values: S.opt(S.list(S.name('entry'))) })),
  entries: S.list(S.obj({ id: S.str(), group: S.opt(S.name('group')), title: S.text(), aliases: S.opt(S.list(S.text(), { min: 1 })), body: S.list(S.text()), at: S.opt(S.level()), see: S.opt(S.list(S.name('entry'))) })),
})

/**
 * The audit findings a game.json leaves open (`open`): { rule: ['part@level'] }, the findings of the course audit
 * (../course.js) its curriculum has not met yet, each on the work list in the game's design doc. npm run check lists them
 * without failing, and fails on any other finding and on one listed that is gone.
 */
export const OPEN = S.map(S.list(S.str({ pattern: '^(?:@?[a-z][a-z0-9-]*/)?[^@]*@(?:@?[a-z][a-z0-9-]*/)?[^@]+$' })))


export function defineVocabulary({ module, kinds, game, level, languages = {} }) {
  return { module, kinds, game, level, languages }
}

/** The vocabulary as plain data: its kinds and items with what they are and their parameters, and the content schemas. */
export const describe = (vocabulary) => JSON.parse(JSON.stringify(vocabulary.description ?? vocabulary))

/**
 * Every place a game's content (content.js assemble) does not fit its domain's vocabulary, as [{ at, says }]: the
 * file and the path in it. `domain`: the domain module, its vocabulary and the readers of its languages. A course blueprint (blueprint.json) is the kernel's, the same in every domain; so is the rule
 * that task ids are unique in a game and never another level's (tasks.js).
 */
export function checkContent({ vocabulary: domainVocabulary, languages = null, names: domainNames = () => ({}) }, content) {
  const out = []
  const baseVocabulary = withParts(domainVocabulary, content.partDefs)
  const vocabulary = { ...baseVocabulary, kinds: { ...baseVocabulary.kinds, ...Object.fromEntries(Object.entries(domainVocabulary.objectKinds ?? {}).filter(([, definition]) => !definition.extends).map(([kind]) => [kind, content.registries?.[kind] ?? {}])) } }
  const add = (problems, file) => out.push(...problems.map((p) => ({ at: `${file}${p.at === '(root)' ? '' : p.at}`, says: p.says })))
  // Audit findings remain optional. Chapters retain their authored tag references.
  const { objectKinds: _objectKinds, packageTarget, id: ID, levels, glossary, vocabulary: _version, open, blueprint, partDefs: parts, tags = {}, relations = {}, sections = {}, relationEdges: _edges, objectProblems = [], sourceChapters, eras, trays: _trays, replaces: _replaces, overridden = {}, registries: _registries, sources: _sources, overrideHistory: _history, layerOrder: _layerOrder, layerUses: _layerUses, ...played } = content
  const game = sourceChapters ? { ...played, chapters: sourceChapters } : played
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
    for (const [name, part] of Object.entries(parts?.parts ?? {})) out.push(...catalogTextProblems(part, PARTS_FILE.fields.parts.of, `parts/${name}.json`, vocabulary, packageKeys))
    for (const level of levels) out.push(...catalogTextProblems(level, vocabulary.level, `levels/${level.id}.json`, vocabulary, packageKeys))
    for (const [id, tag] of Object.entries(tags)) out.push(...catalogTextProblems(tag, OBJECT_SCHEMAS.tags, `tags/${id}.json`, vocabulary, id.startsWith('@') ? courseKeys : packageKeys))
  }
  for (const [key, was] of Object.entries(overridden)) if (was === null) out.push({ at: 'overrides', says: `${key} stands over no text of the package` })
  const ids = new Set(levels.map((l) => l.id))
  // Registry names and domain-specific configuration names used by S.name.
  const names = { ...Object.fromEntries(Object.keys(kindSchemas(domainVocabulary)).map(kind => [kind, new Set(Object.keys(content.registries?.[kind] ?? {}))])), entry: new Set((glossary?.entries ?? []).map((e) => e.id)), tray: new Set(Object.keys(content.registries?.tray ?? {})), group: new Set((glossary?.groups ?? []).map((g) => g.id)), tag: new Set(Object.keys(tags)), section: new Set(Object.keys(sections)), relation: new Set(Object.keys(relations)), ...domainNames(content) }
  for (const [kind, schema] of Object.entries(kindSchemas(domainVocabulary))) for (const [name, object] of Object.entries(content.registries?.[kind] ?? {})) {
    if (kind === 'kind' && !content.objectKinds?.[name]) continue
    add(validate(schema, object, { vocabulary, levels: ids, languages, names }), `${kind}/${name}.json`)
    if (hasCatalogSource(content)) out.push(...catalogTextProblems(object, schema, `${kind}/${name}.json`, vocabulary, packageKeys))
  }
  const expand = referenceResolver(content.registries ?? { level: Object.fromEntries(levels.map((l) => [l.id, l])), part: parts?.parts ?? {}, entry: {}, tag: tags }, out)
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
  for (const [kind, objects] of Object.entries({ tags, relations, sections, trays: content.registries?.tray ?? {} })) for (const [name, object] of Object.entries(objects)) {
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
  if (parts !== undefined) {
    const problems = partProblems(parts, domainVocabulary, { tasks: taskIdsOf(levels) })
    out.push(...(problems.length ? problems : implementationProblems(parts)))
  }
  else if (makesParts(domainVocabulary) && !domainVocabulary.kinds.part) out.push({ at: 'parts', says: `the ${domainVocabulary.module} module's parts are data: the game needs parts` })
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
