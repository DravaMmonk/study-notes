// A data game's files opened for operations (./operations.js): the game selector, its course (course.json), its
// package's configuration, glossary.json, levels/<id>.json, tags/relations/layouts/<id>.json, pieces.json (when present), the game's
// own texts over its package's (overrides/<lang>.json) and the course blueprint (blueprint.json, when the game has one
// or an operation writes one) as values an operation replaces (never mutates), the text each file had, and the hub's
// level count for the game (games/games.js). Nothing reaches the disk until write(); diff() previews it.
//
// The studio opens it as one of two workspaces (games/DESIGN.md 6.7): `scope` 'package' plays the package's own texts
// and runs only the package's operations; 'game' runs only the course's and the game's own texts. Without a scope
// (the CLI, the MCP server) every operation runs, and the content reads as the game plays it.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { assemble, combineConfiguration, configurationFiles, courseLevelCount, deepFreeze, overlayTexts, overridesOf } from '../content.js'
import { PROJECT_DIR, contentVocabulary, catalogFiles, configPaths, gameDirectory, objectFiles, gameDeclarationProblems, levelFiles, splitGameConfig } from '../content-node.js'
import { catalogReader, sourceValue } from '../catalogs.js'
import { catalogsOf, normalizeText } from '../content-text.js'
import { GLOSSARY } from '../vocabulary.js'
import { OBJECT_SCHEMAS } from '../objects.js'
import { PARTS_FILE } from '../parts/schema.js'
import { BLUEPRINT } from '../../pipeline/blueprint.js'
import { writeJson } from './json.js'
import { unified } from './diff.js'

const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null)
const parse = (text, file) => {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`${file}: ${error.message}`)
  }
}

const HUB = 'games/games.js'
const COURSE_I18N = 'i18n'
const PACKAGE_I18N = 'package/i18n'
const OVERRIDES = 'overrides'
const hubEntry = (id) => new RegExp(`(id: '${id.replace(/[-]/g, '\\-')}'[\\s\\S]*?\\blevels: )(\\d+)`)
/** How many levels the hub's list (games.js) says game `id` has, or null when it does not list it. */
export const hubCount = (text, id) => (text?.match(hubEntry(id)) ? Number(text.match(hubEntry(id))[2]) : null)
const CONFIG = ['game.json', 'package.json', 'course.json']
const inGame = (file) => file === 'game.json' || file === 'course.json' || file === 'blueprint.json'

/** Open a game, its course and its package for author operations. */
export function openGame(id, root = PROJECT_DIR, { scope = null, vocabulary = null } = {}) {
  const dir = gameDirectory(id, root)
  const config = resolve(dir, 'game.json')
  if (!existsSync(config)) throw new Error(`no data game ${id} in ${root}`)
  const original = new Map([['game.json', read(config)]])
  const { game, packageId, packageDir } = splitGameConfig(parse(original.get('game.json'), config), root)
  const paths = configPaths(dir, packageDir)
  const pathFor = (file) => {
    if (file.startsWith(`${PACKAGE_I18N}/`)) return relative(root, resolve(packageDir, file.slice('package/'.length)))
    if (Object.hasOwn(paths, file)) return relative(root, paths[file])
    const inPackage = /^(levels|tags|relations|layouts)\//.test(file) || file === 'pieces.json' || file === 'glossary.json'
    return relative(root, resolve(inPackage ? packageDir : dir, file))
  }
  const onDisk = (file) => read(resolve(root, pathFor(file)))
  const load = (file, optional = false) => {
    const text = onDisk(file)
    if (text === null && optional) return undefined
    original.set(file, text)
    return parse(text, pathFor(file))
  }
  const levels = () => levelFiles(packageDir).map(([levelId]) => levelId).sort()
  const objectPaths = () => ['tags', 'relations', 'layouts'].flatMap((kind) => [
    ...objectFiles(packageDir, kind).map(([name]) => `${kind}/${name}.json`),
  ])
  const localeFiles = () => [
    ...catalogFiles(resolve(dir, COURSE_I18N)).map(([lang]) => `${COURSE_I18N}/${lang}.json`),
    ...catalogFiles(resolve(packageDir, 'i18n')).map(([lang]) => `${PACKAGE_I18N}/${lang}.json`),
    ...catalogFiles(resolve(dir, OVERRIDES)).map(([lang]) => `${OVERRIDES}/${lang}.json`),
  ]
  const catalog = (prefix) => Object.fromEntries(localeFiles().filter((file) => file.startsWith(`${prefix}/`))
    .map((file) => [file.slice(prefix.length + 1, -'.json'.length), load(file)]))
  const courseCatalog = catalog(COURSE_I18N)
  const packageCatalog = catalog(PACKAGE_I18N)
  const readers = {
    course: catalogReader(courseCatalog, resolve(dir, COURSE_I18N)),
    package: catalogReader(packageCatalog, resolve(packageDir, 'i18n')),
  }
  const schemas = vocabulary ?? contentVocabulary(load('package.json').domain)
  const keyed = (catalogs) => new Set(Object.values(catalogs).flatMap(Object.keys))
  const gameConfig = combineConfiguration({
    'game.json': readers.course(game, pathFor('game.json'), schemas.game, schemas),
    ...Object.fromEntries(Object.keys(paths).map((file) => [
      file, readers[inGame(file) ? 'course' : 'package'](load(file), pathFor(file), schemas.game, schemas),
    ])),
  })
  const ws = {
    id,
    root,
    dir,
    scope,
    packageId,
    schemas,
    packageDir,
    pathFor,
    objectPaths,
    game: gameConfig,
    glossary: readers.package(load('glossary.json'), pathFor('glossary.json'), GLOSSARY, schemas),
    blueprint: readers.course(load('blueprint.json', true), pathFor('blueprint.json'), BLUEPRINT, schemas),
    partDefs: readers.package(load('pieces.json', true), pathFor('pieces.json'), PARTS_FILE, schemas),
    levels: new Map(levels().map((levelId) => {
      const file = `levels/${levelId}.json`
      return [levelId, readers.package(load(file), pathFor(file), schemas.level, schemas)]
    })),
    ...Object.fromEntries(Object.keys(OBJECT_SCHEMAS).map((kind) => [kind, new Map(objectPaths().filter((p) => p.startsWith(`${kind}/`)).map((file) => [file.split('/').at(-1).slice(0, -5), readers.package(load(file), pathFor(file), OBJECT_SCHEMAS[kind], schemas)]))])),
    declarationProblems: gameDeclarationProblems(dir),
    overrides: catalog(OVERRIDES),
    reservations: { course: keyed(courseCatalog), package: keyed(packageCatalog) },
    original,
    // A file that takes over another's content (a level renamed) is laid out like the text it came from.
    basis: new Map(),
    hub: read(resolve(root, HUB)),
  }
  // Several games may share a package: keep the translations of texts this game does not read.
  ws.packageCatalog = packageCatalog
  ws.activePackageKeys = keyed(catalogsOf(PACKAGE_I18N, ...packageValues(ws)))
  return Object.assign(ws, {
    /** The game as one content (../content.js), frozen: the operations put new values in, nothing writes into one. */
    content: () => deepFreeze(contentOf(ws)),
    /** What the files hold now, by name; a removed level file is null. */
    snapshot: () => ({ game: ws.game, glossary: ws.glossary, partDefs: ws.partDefs, blueprint: ws.blueprint, levels: new Map(ws.levels), ...objectSnapshot(ws), overrides: ws.overrides, basis: new Map(ws.basis), reservations: ws.reservations }),
    restore: (s) => Object.assign(ws, { game: s.game, glossary: s.glossary, partDefs: s.partDefs, blueprint: s.blueprint, levels: new Map(s.levels), ...objectSnapshot(s), overrides: s.overrides, basis: new Map(s.basis), reservations: s.reservations }),
    normalize: (vocabulary, previous) => normalize(ws, vocabulary, previous),
    /** Every file whose text changes: [{ file, before, after }] (before null: a new file; after null: removed). */
    changes: () => changes(ws),
    /** The changes as a unified diff. */
    diff: () => ws.changes().map((c) => unified(c.file, c.before, c.after)).join('\n'),
    write: () => write(ws, localeFiles),
    /** The course and package files, keyed by their project-relative paths. */
    onDisk: () => new Map([...new Set([...fileNames(levels(), objectPaths()), ...localeFiles(), ...ws.original.keys()])]
      .map((file) => [pathFor(file), onDisk(file)])),
  })
}

const objectSnapshot = (ws) => Object.fromEntries(Object.keys(OBJECT_SCHEMAS).map((kind) => [kind, new Map(ws[kind])]))
const objectFile = (kind, name) => `${kind}/${name}.json`
const objectEntries = (ws) => Object.keys(OBJECT_SCHEMAS).flatMap((kind) => [...ws[kind]].map(([name, value]) => [objectFile(kind, name), value]))
const objectPathsOf = (ws) => objectEntries(ws).map(([file]) => file)

/** The package's texts with what the game puts over them, unless the package is what is being edited. */
function contentOf(ws) {
  const own = ws.scope === 'package' ? {} : liveOverrides(ws)
  const over = (value) => (Object.keys(own).length ? overlayTexts(value, own) : value)
  const game = Object.fromEntries(Object.entries(configurationFiles(ws.game)).flatMap(([file, value]) => {
    const shown = inGame(file) ? value : over(value)
    return Object.entries(shown)
  }))
  const packaged = catalogsOf(PACKAGE_I18N, ...packageValues(ws))
  return assemble({
    id: ws.id, packageId: ws.packageId, schemas: ws.schemas, game, glossary: over(ws.glossary), partDefs: over(ws.partDefs), blueprint: ws.blueprint,
    levels: [...ws.levels].map(([id, level]) => [id, over(level)]),
    ...Object.fromEntries(Object.keys(OBJECT_SCHEMAS).map((kind) => [kind, [...ws[kind]].map(([name, value]) => [name, over(value), ws.packageId])])),
    declarationProblems: ws.declarationProblems,
    overridden: overridesOf(packaged, own), fromDisk: true,
  })
}

/** The game's own texts over keys the package still has (one whose text has gone goes with it). */
function liveOverrides(ws) {
  const keys = new Set(Object.values(catalogsOf(PACKAGE_I18N, ...packageValues(ws))).flatMap((entries) => Object.keys(entries)))
  return Object.fromEntries(Object.entries(ws.overrides).map(([lang, entries]) => [lang, Object.fromEntries(Object.entries(entries).filter(([key]) => keys.has(key)))]).filter(([, entries]) => Object.keys(entries).length))
}

const fileNames = (levels, objects) => [...CONFIG, 'glossary.json', 'pieces.json', 'blueprint.json', ...[...levels].map((id) => `levels/${id}.json`), ...objects]

function packageValues(ws) {
  const { 'game.json': _, 'course.json': __, ...packaged } = configurationFiles(ws.game)
  return [...Object.values(packaged), ws.glossary, ws.partDefs, ...ws.levels.values(), ...objectEntries(ws).map(([, value]) => value)]
}

function normalize(ws, vocabulary, previous) {
  const reservations = { ...ws.reservations }
  const keyOf = (scope) => reservations[scope] === ws.reservations[scope] ? (reservations[scope] = new Set(reservations[scope])) : reservations[scope]
  function assign(value, was, schema, prefix, scope) {
    return value === was ? value : normalizeText(value, schema, prefix, { previous: was, vocabulary, reserved: keyOf(scope) })
  }
  if (ws.game !== previous.game) {
    const files = configurationFiles(ws.game), before = configurationFiles(previous.game)
    const prefixes = { 'game.json': 'game', 'package.json': 'package', 'course.json': 'course' }
    for (const [file, value] of Object.entries(files)) {
      const scope = inGame(file) ? 'course' : 'package'
      files[file] = assign(value, before[file], vocabulary.game, prefixes[file], scope)
    }
    ws.game = combineConfiguration(files)
  }
  ws.blueprint = assign(ws.blueprint, previous.blueprint, BLUEPRINT, 'blueprint', 'course')
  ws.glossary = assign(ws.glossary, previous.glossary, GLOSSARY, 'glossary', 'package')
  ws.partDefs = assign(ws.partDefs, previous.partDefs, PARTS_FILE, 'pieces', 'package')
  for (const [level, value] of ws.levels) ws.levels.set(level, assign(value, previous.levels.get(level), vocabulary.level, `level.${level}`, 'package'))
  for (const [kind, schema] of Object.entries(OBJECT_SCHEMAS)) for (const [name, value] of ws[kind]) ws[kind].set(name, assign(value, previous[kind].get(name), schema, `${kind}.${name.split('/').at(-1)}`, 'package'))
  ws.reservations = reservations
}

const localizationFiles = (prefix, catalogs) => Object.entries(catalogs).map(([lang, entries]) => [`${prefix}/${lang}.json`, entries])
const sortedKeys = (entries) => Object.fromEntries(Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))

function changes(ws) {
  const out = []
  const files = configurationFiles(ws.game)
  const configuration = new Map([...Object.entries(files),
    ['game.json', { package: ws.packageId, ...files['game.json'] }],
    ['glossary.json', ws.glossary], ...(ws.partDefs === undefined ? [] : [['pieces.json', ws.partDefs]]),
    ...(ws.blueprint === undefined ? [] : [['blueprint.json', ws.blueprint]]), ...[...ws.levels].map(([id, level]) => [`levels/${id}.json`, level]),
    ...objectEntries(ws),
  ])
  const active = catalogsOf(PACKAGE_I18N, ...packageValues(ws))
  const packageCatalog = Object.fromEntries([...new Set([...Object.keys(ws.packageCatalog), ...Object.keys(active)])].sort()
    .flatMap((lang) => {
      const entries = { ...Object.fromEntries(Object.entries(ws.packageCatalog[lang] ?? {}).filter(([key]) => !ws.activePackageKeys.has(key))), ...active[lang] }
      return Object.keys(entries).length ? [[lang, sortedKeys(entries)]] : []
    }))
  const now = new Map([
    ...[...configuration].map(([file, value]) => [file, sourceValue(value)]),
    ...localizationFiles(COURSE_I18N, catalogsOf(COURSE_I18N, files['game.json'], files['course.json'], ws.blueprint)),
    ...localizationFiles(PACKAGE_I18N, packageCatalog),
    ...localizationFiles(OVERRIDES, Object.fromEntries(Object.entries(liveOverrides(ws)).map(([lang, entries]) => [lang, sortedKeys(entries)]))),
  ])
  for (const [file, value] of now) {
    const before = ws.original.get(file) ?? null
    const after = writeJson(value, before ?? ws.basis.get(file) ?? null)
    if (after !== before) out.push({ file: ws.pathFor(file), before, after })
  }
  for (const [file, before] of ws.original) if (!now.has(file) && before !== null) out.push({ file: ws.pathFor(file), before, after: null })
  const listed = hubCount(ws.hub, ws.id)
  const count = courseLevelCount(contentOf(ws), ws.levels.size)
  if (listed !== null && listed !== count) out.push({ file: HUB, before: ws.hub, after: ws.hub.replace(hubEntry(ws.id), `$1${count}`) })
  return out
}

function write(ws, localeFiles) {
  const done = ws.changes()
  // Catalog edits depend on every reference in the course and package, including files this edit did not touch.
  const currentNames = fileNames(levelFiles(ws.packageDir).map(([id]) => id), ws.objectPaths())
  const expected = new Map([...new Set([...ws.original.keys(), ...currentNames, ...localeFiles()])]
    .map((file) => [ws.pathFor(file), ws.original.get(file) ?? null]))
  for (const { file, before } of done) expected.set(file, before)
  const moved = [...expected].filter(([file, before]) => read(resolve(ws.root, file)) !== before).map(([file]) => file)
  if (moved.length) throw new Error(`changed on disk since the game was opened: ${moved.join(', ')}; open it again`)
  for (const { file, after } of done) {
    const path = resolve(ws.root, file)
    if (after === null) rmSync(path)
    else {
      mkdirSync(dirname(path), { recursive: true })
      // Written next to the file and moved over it, so a file is never left half written.
      writeFileSync(`${path}.tmp`, after)
      renameSync(`${path}.tmp`, path)
    }
  }
  // What was written is what the files hold now.
  ws.original = new Map([...fileNames(ws.levels.keys(), objectPathsOf(ws)), ...localeFiles()]
    .map((file) => [file, read(resolve(ws.root, ws.pathFor(file)))]))
  ws.packageCatalog = Object.fromEntries(localeFiles().filter((file) => file.startsWith(`${PACKAGE_I18N}/`))
    .map((file) => [file.slice(PACKAGE_I18N.length + 1, -'.json'.length), parse(ws.original.get(file), ws.pathFor(file))]))
  ws.activePackageKeys = new Set(Object.values(catalogsOf(PACKAGE_I18N, ...packageValues(ws))).flatMap(Object.keys))
  ws.hub = read(resolve(ws.root, HUB))
  return done.map((c) => c.file)
}
