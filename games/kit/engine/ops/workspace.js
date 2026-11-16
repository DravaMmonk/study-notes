// A data game's files opened for operations (./operations.js): the game selector, its course (course.json), its
// package's configuration, entries/<id>.json, levels/<id>.json, tags/<kind>/<id>.json, relations/layouts/<id>.json, pieces.json (when present), the game's
// own texts over its package's (overrides/<namespace>/i18n/<lang>.json) and the course blueprint (blueprint.json, when the game has one
// or an operation writes one) as values an operation replaces (never mutates), the text each file had, and the hub's
// level count for the game (games/games.js). Nothing reaches the disk until write(); diff() previews it.
//
// The studio opens it as one of two workspaces (games/DESIGN.md 6.7): `scope` 'package' plays the package's own texts
// and runs only the package's operations; 'game' runs only the course's and the game's own texts. Without a scope
// (the CLI, the MCP server) every operation runs, and the content reads as the game plays it.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { combineConfiguration, configurationFiles, courseLevelCount, deepFreeze } from '../content.js'
import { PROJECT_DIR, readPackageLayers, assembleLayers, contentVocabulary, catalogFiles, configPaths, gameDirectory, objectFiles, gameDeclarationProblems, levelFiles, splitGameConfig } from '../content-node.js'
import { catalogReader, sourceValue } from '../catalogs.js'
import { catalogsOf, normalizeText } from '../content-text.js'
import { orderPackages } from '../layers.js'
import { ENTRY } from '../vocabulary.js'
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
const overridePaths = (dir, prefix = '') => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? overridePaths(resolve(dir, entry.name), `${prefix}${entry.name}/`) : entry.name.endsWith('.json') ? [`${prefix}${entry.name}`] : []) : []
const hubEntry = (id) => new RegExp(`(id: '${id.replace(/[-]/g, '\\-')}'[\\s\\S]*?\\blevels: )(\\d+)`)
/** How many levels the hub's list (games.js) says game `id` has, or null when it does not list it. */
export const hubCount = (text, id) => (text?.match(hubEntry(id)) ? Number(text.match(hubEntry(id))[2]) : null)
const CONFIG = ['game.json', 'package.json', 'course.json']
const inGame = (file) => file === 'game.json' || file === 'course.json' || file === 'blueprint.json'

/** Open a game, its course and its package for author operations. */
export function openGame(id, root = PROJECT_DIR, { scope = null, vocabulary = null, layer = null } = {}) {
  const dir = gameDirectory(id, root)
  const config = resolve(dir, 'game.json')
  if (!existsSync(config)) throw new Error(`no data game ${id} in ${root}`)
  const original = new Map([['game.json', read(config)]])
  const { game, packageIds } = splitGameConfig(parse(original.get('game.json'), config), root)
  const packageId = layer && !layer.startsWith('@') ? layer : packageIds[0]
  if (!packageIds.includes(packageId)) throw new Error(`package ${packageId} is not selected by ${id}`)
  if (layer?.startsWith('@') && layer !== `@${id}`) throw new Error(`unknown game layer ${layer}`)
  if (layer) scope = layer.startsWith('@') ? 'game' : 'package'
  const packageDir = resolve(root, 'packages', packageId)
  const packageLayers = readPackageLayers(packageIds, root)
  const packageDirs = packageIds.map((id) => resolve(root, 'packages', id))
  const dependencyFiles = new Map(packageDirs.filter((path) => path !== packageDir).flatMap((dir) => overridePaths(dir).map((file) => [resolve(dir, file), read(resolve(dir, file))])))
  const paths = configPaths(dir, packageDir)
  const pathFor = (file) => {
    if (file.startsWith('package/overrides/')) return relative(root, resolve(packageDir, file.slice('package/'.length)))
    if (file.startsWith(`${PACKAGE_I18N}/`)) return relative(root, resolve(packageDir, file.slice('package/'.length)))
    if (Object.hasOwn(paths, file)) return relative(root, paths[file])
    const inPackage = /^(levels|entries|tags|relations|layouts)\//.test(file) || file === 'pieces.json'
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
  const objectPaths = () => ['entries', 'tags', 'relations', 'layouts'].flatMap((kind) => [
    ...objectFiles(packageDir, kind).map(([name]) => `${kind}/${name}.json`),
  ])
  const localeFiles = () => [
    ...catalogFiles(resolve(dir, COURSE_I18N)).map(([lang]) => `${COURSE_I18N}/${lang}.json`),
    ...catalogFiles(resolve(packageDir, 'i18n')).map(([lang]) => `${PACKAGE_I18N}/${lang}.json`),
  ]
  const extraOverridePaths = () => [...overridePaths(resolve(packageDir, OVERRIDES)).map((file) => `package/overrides/${file}`), ...overridePaths(resolve(dir, OVERRIDES)).map((file) => `overrides/${file}`)]
  const catalog = (prefix) => Object.fromEntries(localeFiles().filter((file) => file.startsWith(`${prefix}/`))
    .map((file) => [file.slice(prefix.length + 1, -'.json'.length), load(file)]))
  const courseCatalog = catalog(COURSE_I18N)
  const packageCatalog = catalog(PACKAGE_I18N)
  const allCatalogs = (own) => {
    const catalogs = {}
    for (const layer of packageLayers) for (const [lang, entries] of Object.entries(layer.catalogs)) Object.assign(catalogs[lang] ??= {}, Object.fromEntries(Object.entries(entries).map(([key, value]) => [key.includes('/') ? key : `${layer.id}/${key}`, value])))
    for (const [lang, entries] of Object.entries(own)) Object.assign(catalogs[lang] ??= {}, entries)
    return catalogs
  }
  const readers = {
    course: catalogReader(allCatalogs(courseCatalog), resolve(dir, COURSE_I18N)),
    package: catalogReader(allCatalogs(packageCatalog), resolve(packageDir, 'i18n')),
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
    scope, layer,
    packageId, packageIds, packageLayers,
    schemas,
    packageDir, packageDirs, dependencyFiles,
    pathFor,
    objectPaths,
    game: gameConfig,
    entries: new Map(objectFiles(packageDir, 'entries').map(([id]) => [id, readers.package(load(`entries/${id}.json`), pathFor(`entries/${id}.json`), ENTRY, schemas)])),
    blueprint: readers.course(load('blueprint.json', true), pathFor('blueprint.json'), BLUEPRINT, schemas),
    partDefs: readers.package(load('pieces.json', true), pathFor('pieces.json'), PARTS_FILE, schemas),
    levels: new Map(levels().map((levelId) => {
      const file = `levels/${levelId}.json`
      return [levelId, readers.package(load(file), pathFor(file), schemas.level, schemas)]
    })),
    ...Object.fromEntries(Object.keys(OBJECT_SCHEMAS).map((kind) => [kind, new Map(objectPaths().filter((p) => p.startsWith(`${kind}/`)).map((file) => [file.split('/').at(-1).slice(0, -5), { ...readers.package(load(file), pathFor(file), OBJECT_SCHEMAS[kind], schemas), ...(kind === 'tags' && { kind: file.split('/')[1] }) }]))])),
    declarationProblems: gameDeclarationProblems(dir),
    overrideFiles: new Map(extraOverridePaths().map((file) => [file, load(file)])),
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
    snapshot: () => ({ game: ws.game, entries: new Map(ws.entries), partDefs: ws.partDefs, blueprint: ws.blueprint, levels: new Map(ws.levels), ...objectSnapshot(ws), overrideFiles: new Map(ws.overrideFiles), basis: new Map(ws.basis), reservations: ws.reservations }),
    restore: (s) => Object.assign(ws, { game: s.game, entries: new Map(s.entries), partDefs: s.partDefs, blueprint: s.blueprint, levels: new Map(s.levels), ...objectSnapshot(s), overrideFiles: new Map(s.overrideFiles), basis: new Map(s.basis), reservations: s.reservations }),
    normalize: (vocabulary, previous) => normalize(ws, vocabulary, previous),
    /** Every file whose text changes: [{ file, before, after }] (before null: a new file; after null: removed). */
    changes: () => changes(ws),
    /** The changes as a unified diff. */
    diff: () => ws.changes().map((c) => unified(c.file, c.before, c.after)).join('\n'),
    write: () => write(ws, localeFiles),
    /** The course and package files, keyed by their project-relative paths. */
    onDisk: () => new Map([...new Set([...fileNames(levels(), objectPaths()), ...localeFiles(), ...extraOverridePaths(), ...ws.original.keys()])]
      .map((file) => [pathFor(file), onDisk(file)])),
  })
}

const objectSnapshot = (ws) => Object.fromEntries(Object.keys(OBJECT_SCHEMAS).map((kind) => [kind, new Map(ws[kind])]))
const objectFile = (kind, name, value) => `${kind}/${kind === 'tags' ? `${value.kind}/` : ''}${name}.json`
const objectEntries = (ws) => Object.keys(OBJECT_SCHEMAS).flatMap((kind) => [...ws[kind]].map(([name, value]) => [objectFile(kind, name, value), value]))
const objectPathsOf = (ws) => [...objectEntries(ws).map(([file]) => file), ...[...ws.entries.keys()].map((id) => `entries/${id}.json`)]

/** The package's texts with what the game puts over them, unless the package is what is being edited. */
function contentOf(ws) {
  const files = configurationFiles(ws.game)
  const packaged = ownCatalogs(ws, catalogsOf(PACKAGE_I18N, ...packageValues(ws)))
  const own = {
    id: ws.packageId, config: files['package.json'], catalogs: { ...ws.packageCatalog, ...packaged },
    objects: [
      ...[...ws.levels].map(([name, value]) => ({ kind: 'level', name, value })),
      ...Object.entries(ws.partDefs?.parts ?? {}).map(([name, value]) => ({ kind: 'piece', name, value })),
      ...Object.entries(ws.partDefs?.settings ?? {}).map(([name, value]) => ({ kind: 'setting', name, value })),
      ...[...ws.entries].map(([name, value]) => ({ kind: 'entry', name, value })),
      ...Object.entries({ tag: 'tags', relation: 'relations', layout: 'layouts' }).flatMap(([kind, plural]) => [...ws[plural]].map(([name, value]) => ({ kind, name, value }))),
    ], overrides: [], textOverrides: [],
  }
  const game = { id: `@${ws.id}`, config: { ...files['game.json'], ...files['course.json'] }, objects: [], catalogs: catalogsOf(COURSE_I18N, files['game.json'], files['course.json'], ws.blueprint), overrides: [], textOverrides: [] }
  for (const [file, value] of activeOverrides(ws)) {
    const target = file.startsWith('package/') ? own : game
    const path = file.replace(/^package\//, '').split('/')
    const [, namespace, folder] = path
    const filename = path.at(-1)
    if (folder === 'i18n') target.textOverrides.push({ namespace, lang: filename.slice(0, -5), entries: value })
    else target.overrides.push({ kind: ({ levels: 'level', pieces: 'piece', settings: 'setting', entries: 'entry', relations: 'relation', layouts: 'layout', tag: 'tag' })[folder], name: `${namespace}/${filename.slice(0, -5)}`, value: { ...value, ...(folder === 'tag' && { kind: path[3] }) } })
  }
  if (ws.scope === 'package') { game.overrides = []; game.textOverrides = [] }
  const layers = orderPackages(ws.packageLayers.map((layer) => layer.id === ws.packageId ? own : layer))
  return assembleLayers(ws.id, [...layers, game], ws.schemas, { blueprint: ws.blueprint, declarationProblems: ws.declarationProblems })
}

/** Retire game wording keys whose declaration was deleted in the edited package. */
function activeOverrides(ws) {
  const prefix = `overrides/${ws.packageId}/i18n/`
  const keys = new Set(Object.values(catalogsOf(PACKAGE_I18N, ...packageValues(ws))).flatMap(Object.keys))
  return [...ws.overrideFiles].flatMap(([file, value]) => {
    if (!file.startsWith(prefix)) return [[file, value]]
    const entries = Object.fromEntries(Object.entries(value).filter(([key]) => keys.has(key) || !ws.activePackageKeys.has(key)))
    return Object.keys(entries).length ? [[file, entries]] : []
  })
}

const fileNames = (levels, objects) => [...CONFIG, 'pieces.json', 'blueprint.json', ...[...levels].map((id) => `levels/${id}.json`), ...objects]

const ownCatalogs = (ws, catalogs) => Object.fromEntries(Object.entries(catalogs).map(([lang, entries]) => [lang, Object.fromEntries(Object.entries(entries).filter(([key]) => !key.includes('/') || key.startsWith(`${ws.packageId}/`)))]))

function packageValues(ws) {
  const { 'game.json': _, 'course.json': __, ...packaged } = configurationFiles(ws.game)
  return [...Object.values(packaged), ...ws.entries.values(), ws.partDefs, ...ws.levels.values(), ...objectEntries(ws).map(([, value]) => value)]
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
  for (const [name, value] of ws.entries) ws.entries.set(name, assign(value, previous.entries.get(name), ENTRY, `entry.${name}`, 'package'))
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
    ['game.json', { packages: ws.packageIds, ...files['game.json'] }],
    ...[...ws.entries].map(([id, entry]) => [`entries/${id}.json`, entry]), ...(ws.partDefs === undefined ? [] : [['pieces.json', ws.partDefs]]),
    ...(ws.blueprint === undefined ? [] : [['blueprint.json', ws.blueprint]]), ...[...ws.levels].map(([id, level]) => [`levels/${id}.json`, level]),
    ...objectEntries(ws), ...activeOverrides(ws),
  ])
  const active = ownCatalogs(ws, catalogsOf(PACKAGE_I18N, ...packageValues(ws)))
  const packageCatalog = Object.fromEntries([...new Set([...Object.keys(ws.packageCatalog), ...Object.keys(active)])].sort()
    .flatMap((lang) => {
      const entries = { ...Object.fromEntries(Object.entries(ws.packageCatalog[lang] ?? {}).filter(([key]) => !ws.activePackageKeys.has(key))), ...active[lang] }
      return Object.keys(entries).length ? [[lang, sortedKeys(entries)]] : []
    }))
  const now = new Map([
    ...[...configuration].map(([file, value]) => [file, sourceValue(file.startsWith('tags/') ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'kind')) : value)]),
    ...localizationFiles(COURSE_I18N, catalogsOf(COURSE_I18N, files['game.json'], files['course.json'], ws.blueprint)),
    ...localizationFiles(PACKAGE_I18N, packageCatalog),
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
  const dependencyPaths = ws.packageDirs.filter((dir) => dir !== ws.packageDir).flatMap((dir) => overridePaths(dir).map((file) => resolve(dir, file)))
  for (const path of dependencyPaths) if (!ws.dependencyFiles.has(path)) throw new Error(`dependency changed on disk since the game was opened: ${relative(ws.root, path)}; open it again`)
  for (const [path, before] of ws.dependencyFiles) if (read(path) !== before) throw new Error(`dependency changed on disk since the game was opened: ${relative(ws.root, path)}; open it again`)
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
  ws.original = new Map([...fileNames(ws.levels.keys(), objectPathsOf(ws)), ...ws.overrideFiles.keys(), ...localeFiles()]
    .map((file) => [file, read(resolve(ws.root, ws.pathFor(file)))]))
  ws.packageCatalog = Object.fromEntries(localeFiles().filter((file) => file.startsWith(`${PACKAGE_I18N}/`))
    .map((file) => [file.slice(PACKAGE_I18N.length + 1, -'.json'.length), parse(ws.original.get(file), ws.pathFor(file))]))
  ws.activePackageKeys = new Set(Object.values(catalogsOf(PACKAGE_I18N, ...packageValues(ws))).flatMap(Object.keys))
  ws.overrideFiles = new Map(activeOverrides(ws))
  ws.hub = read(resolve(ws.root, HUB))
  return done.map((c) => c.file)
}
