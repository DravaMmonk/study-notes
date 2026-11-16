// A domain's vocabulary: everything content may name (games/DESIGN.md 6.2). Content is data made of the vocabulary's
// items and their parameters, and nothing else; whatever it needs that the vocabulary lacks is a new item, written in
// the domain (code, under review), never worked around in the content.
//
// defineVocabulary({
//   domain    the domain's id ('table')
//   version   raised whenever something is added; each version's printing (describe) is kept beside the domain as
//             versions/<n>.json, and a version only adds to the one before (additionProblems: nothing goes or
//             changes, a field added to an object is optional), so content written for an older version still fits
//   removes?  [{ at, why }]   what this version takes away or changes, and why: `at` a path of the vocabulary as its
//             problems are said, without `vocabulary.` and `.fields` ('level.builds'). Only the version that removes
//             something declares it, and the official games are migrated to it through the operation set
//   kinds     { kind: { item: { about, params? } } }   about: what the item is, { zh, en }; params: its schema
//             (schema.js), absent for an item that takes none
//   game      the schema of a game's game.json
//   level     the schema of one level (levels/<id>.json; its id is the file's name)
//   languages { lang: { about } }   the small languages content writes in (S.syntax(lang)); the domain module reads
//             them (its `languages`: { lang: (text) → why it cannot be read, or null }, never throwing on bad text)
// })
//
// A domain whose kinds hold engine resources (`op`, run by its ops.js) defines its parts as data: each of its games
// has a pieces.json (parts/schema.js), and content's S.ref('part') names a part of it (parts/define.js withParts). Such
// a vocabulary also gives the families parts are coloured by (`family`), and may give widgets (`widget`): settings or
// displays the kernel's controls cannot draw.
import { S, validate } from './schema.js'
import { dependencyCycle, eraLevels, layout } from '../course.js'
import { courseDependencies } from './course-dependencies.js'
import { BLUEPRINT } from '../pipeline/blueprint.js'
import { taskIdProblems, taskIdsOf } from './tasks.js'
import { partProblems, withParts } from './parts/define.js'
import { implementationProblems } from './parts/dependencies.js'
import { makesPieces, PARTS_FILE } from './parts/schema.js'
import { configurationFiles, contentFileFor, hasCatalogSource } from './content.js'
import { catalogTextProblems } from './content-text.js'
import { OBJECT_SCHEMAS, referenceResolver, expandReferences } from './objects.js'
import { canonicalJson } from './json-value.js'

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


export function defineVocabulary({ domain, version, kinds, game, level, languages = {}, removes }) {
  return { domain, version, kinds, game, level, languages, ...(removes ? { removes } : {}) }
}

/** The vocabulary as plain data: its kinds and items with what they are and their parameters, and the content schemas. */
export const describe = (vocabulary) => JSON.parse(JSON.stringify(vocabulary))

/**
 * A version's printing as it is kept (versions/<n>.json): describe(vocabulary) with every subtree that recurs (the
 * same field schema under many cases) written once in `shared` and named { $: index } where it stands. Text, one
 * shared subtree a line.
 */
export function snapshotText(vocabulary) {
  const shared = []
  const index = new Map()
  const pack = (v) => {
    if (!v || typeof v !== 'object') return v
    const out = Array.isArray(v) ? v.map(pack) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, pack(x)]))
    const key = canonicalJson(out)
    if (key.length <= 80) return out
    if (!index.has(key)) { index.set(key, shared.length); shared.push(out) }
    return { $: index.get(key) }
  }
  const root = pack(describe(vocabulary))
  return `{"root": ${JSON.stringify(root)},\n"shared": [\n${shared.map((x) => JSON.stringify(x)).join(',\n')}\n]}\n`
}

/** A kept version (snapshotText, parsed) as describe printed it. */
export function fromSnapshot({ root, shared }) {
  const open = (v) => (Array.isArray(v) ? v.map(open) : v && typeof v === 'object' ? ('$' in v && Object.keys(v).length === 1 ? open(shared[v.$]) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, open(x)]))) : v)
  return open(root)
}

/**
 * Where vocabulary `after` (printed, describe) does more than add to `before`: something gone or changed, or a new
 * field of an object that content written for `before` would lack (not optional), unless `after` declares it removed
 * (`removes`); and a removal it declares that removes nothing. [string], each with its path.
 */
export function additionProblems(before, after) {
  const removes = after?.removes ?? []
  const found = changes(before, after)
  const covers = (r, problem) => {
    const path = problem.split(/[ :]/)[0].replace(/^vocabulary\./, '').replace(/\.fields(?=[.[]|$)/g, '')
    return path === r.at || path.startsWith(`${r.at}.`) || path.startsWith(`${r.at}[`)
  }
  return [
    ...found.filter((p) => !removes.some((r) => covers(r, p))),
    ...removes.filter((r) => !found.some((p) => covers(r, p))).map((r) => `vocabulary.removes: ${r.at} is declared removed, and nothing there goes or changes`),
  ]
}

function changes(before, after, at = 'vocabulary') {
  if (Array.isArray(before)) {
    if (!Array.isArray(after)) return [`${at}: was a list`]
    const has = (x) => after.some((y) => changes(x, y).length === 0)
    return before.flatMap((x, k) => (has(x) ? [] : [`${at}[${k}]: ${JSON.stringify(x).slice(0, 60)} is gone`]))
  }
  if (before && typeof before === 'object') {
    // Adding an alternative preserves every value accepted by an existing schema.
    if (before.type && before.type !== 'either' && after?.type === 'either' && after.of.some((choice) => changes(before, choice, at).length === 0)) return []
    if (!after || typeof after !== 'object' || Array.isArray(after)) return [`${at}: was an object`]
    // The number of the version itself is what changes, and what a version removes is said by that version alone.
    const out = Object.entries(before).filter(([k]) => !(at === 'vocabulary' && (k === 'version' || k === 'removes'))).flatMap(([k, v]) => (k in after ? changes(v, after[k], `${at}.${k}`) : [`${at}.${k} is gone`]))
    // A schema object's new field is one old content lacks: it must be optional.
    if (before.type === 'obj' && after.type === 'obj') for (const [k, f] of Object.entries(after.fields ?? {})) if (!(k in (before.fields ?? {})) && !f.optional) out.push(`${at}.fields.${k} is new and not optional`)
    // A bound a schema gains narrows what old content may be.
    if ('type' in before) for (const k of ['min', 'max', 'pattern', 'keys', 'key']) if (k in after && !(k in before)) out.push(`${at}.${k} is a new bound`)
    return out
  }
  return before === after ? [] : [`${at}: ${JSON.stringify(before)} became ${JSON.stringify(after)}`]
}

/**
 * Every place a game's content (content.js assemble) does not fit its domain's vocabulary, as [{ at, says }]: the
 * file and the path in it. `domain`: the domain module, its vocabulary and the readers of its languages. A course blueprint (blueprint.json) is the kernel's, the same in every domain; so is the rule
 * that task ids are unique in a game and never another level's (tasks.js).
 */
export function checkContent({ vocabulary: domainVocabulary, languages = null, names: domainNames = () => ({}) }, content) {
  const out = []
  const vocabulary = withParts(domainVocabulary, content.partDefs)
  const add = (problems, file) => out.push(...problems.map((p) => ({ at: `${file}${p.at === '(root)' ? '' : p.at}`, says: p.says })))
  // The fields every game.json has: which domain plays it and the version of its vocabulary it was written for; and
  // the one it may have: the audit findings it leaves open. Chapters retain their authored tag references.
  const { packagePreview, id: ID, levels, glossary, domain, vocabulary: version, open, blueprint, partDefs: parts, tags = {}, relations = {}, layouts = {}, relationEdges: _edges, objectProblems = [], sourceChapters, eras, trays: _trays, replaces: _replaces, overridden = {}, registries: _registries, sources: _sources, overrideHistory: _history, layerOrder: _layerOrder, layerUses: _layerUses, ...played } = content
  const game = sourceChapters ? { ...played, chapters: sourceChapters } : played
  out.push(...objectProblems)
  if (hasCatalogSource(content)) {
    const courseKeys = new Map(), packageKeys = new Map()
    for (const [file, value] of Object.entries(configurationFiles(game))) {
      if (packagePreview && ['game.json', 'course.json'].includes(file)) continue
      out.push(...catalogTextProblems(value, vocabulary.game, file, vocabulary, file === 'game.json' || file === 'course.json' ? courseKeys : packageKeys))
    }
    out.push(...catalogTextProblems(blueprint, BLUEPRINT, 'blueprint.json', vocabulary, courseKeys))
    for (const { id, group: _group, ...entry } of glossary?.entries ?? []) out.push(...catalogTextProblems(entry, ENTRY, `entries/${id}.json`, vocabulary, packageKeys))
    out.push(...catalogTextProblems(parts, PARTS_FILE, 'pieces.json', vocabulary, packageKeys))
    for (const level of levels) out.push(...catalogTextProblems(level, vocabulary.level, `levels/${level.id}.json`, vocabulary, packageKeys))
    for (const [id, tag] of Object.entries(tags)) out.push(...catalogTextProblems(tag, OBJECT_SCHEMAS.tags, `tags/${id}.json`, vocabulary, id.startsWith('@') ? courseKeys : packageKeys))
  }
  for (const [key, was] of Object.entries(overridden)) if (was === null) out.push({ at: 'overrides', says: `${key} stands over no text of the package` })
  const ids = new Set(levels.map((l) => l.id))
  // Registry names and domain-specific configuration names used by S.name.
  const names = { entry: new Set((glossary?.entries ?? []).map((e) => e.id)), group: new Set((glossary?.groups ?? []).map((g) => g.id)), tag: new Set(Object.keys(tags)), layout: new Set(Object.keys(layouts)), relation: new Set(Object.keys(relations)), ...domainNames(content) }
  const expand = referenceResolver(content.registries ?? { level: Object.fromEntries(levels.map((l) => [l.id, l])), piece: parts?.parts ?? {}, setting: parts?.settings ?? {}, entry: {}, tag: tags }, out)
  const resolvedGame = expandReferences(game, vocabulary.game, expand, vocabulary)
  for (const [kind, objects] of Object.entries({ tags, relations, layouts })) for (const [name, object] of Object.entries(objects)) add(validate(OBJECT_SCHEMAS[kind], object, { vocabulary, levels: ids, languages, names }), `${kind}/${name}.json`)
  if (domain !== vocabulary.domain) out.push({ at: 'game.json.domain', says: `the vocabulary is ${vocabulary.domain}'s, not ${domain}'s` })
  if (!Number.isInteger(version) || version < 1 || version > vocabulary.version) out.push({ at: 'game.json.vocabulary', says: `written for version ${version}; the domain's vocabulary has versions 1 to ${vocabulary.version}` })
  // Generated courses have no authored game configuration. Validate the fields actually supplied by packages.
  const packageFields = packagePreview?.fields ?? []
  const gameSchema = packagePreview ? S.obj(Object.fromEntries(Object.entries(vocabulary.game.fields).filter(([key]) => contentFileFor([key]) === 'package.json').map(([key, schema]) => [key, { ...schema, optional: true }]))) : vocabulary.game
  const gameValue = packagePreview ? Object.fromEntries(packageFields.map((key) => [key, resolvedGame[key]])) : resolvedGame
  const gameProblems = validate(gameSchema, gameValue, { vocabulary, levels: ids, languages, names })
  add(gameProblems, packagePreview ? 'package.json' : 'game.json')
  if (!gameProblems.length && eras) {
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
  else if (makesPieces(domainVocabulary) && !domainVocabulary.kinds.part) out.push({ at: 'pieces.json', says: `the ${domainVocabulary.domain} domain's pieces are data: the game needs a pieces.json` })
  for (const [name, map] of Object.entries(layouts)) {
    const own = new Set(expand(map.of, 'level'))
    const drawn = new Map()
    for (const [r, row] of (map.rows ?? []).entries()) for (const id of row) if (id !== null) {
      if (!own.has(id)) out.push({ at: `layouts/${name}`, says: `${id} is not in ${map.of}` })
      if (drawn.has(id)) out.push({ at: `layouts/${name}`, says: `${id} is on the map twice` })
      drawn.set(id, r)
    }
    for (const edge of content.relationEdges?.requires ?? []) if (!edge.game && drawn.has(edge.from) && drawn.has(edge.to) && drawn.get(edge.from) >= drawn.get(edge.to)) out.push({ at: `layouts/${name}`, says: `${edge.to} is drawn on a row no lower than its prerequisite ${edge.from}` })
  }
  return out
}

/**
 * Validate selected layouts after projecting them onto their chapters.
 */
function courseProblems(played) {
  const out = []
  const plan = layout(played)
  for (const [e, era] of played.entries()) {
    const own = new Set(eraLevels(era)), drawn = new Map()
    for (const [r, row] of (era.rows ?? []).entries()) {
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
