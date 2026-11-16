// A data game's files opened for operations (./operations.js): the game selector, its course (course.json), its
// package's configuration, glossary.json, levels/<id>.json, tags/relations/layouts/<id>.json, pieces.json (when present), the game's
// own texts over its package's (overrides/<namespace>/i18n/<lang>.json) and the course blueprint (blueprint.json, when the game has one
// or an operation writes one) as values an operation replaces (never mutates), the text each file had, and the hub's
// level count for the game (games/games.js). Nothing reaches the disk until write(); diff() previews it.
//
// Every workspace writes one layer and keeps its log there. Other layers are read-only inputs.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { combineConfiguration, configurationFiles, courseLevelCount, deepFreeze } from '../content.js'
import { PROJECT_DIR, readPackageLayers, packageLayers as loadPackageLayers, assembleLayers, contentVocabulary, catalogFiles, configPaths, gameDirectory, objectFiles, gameDeclarationProblems, levelFiles, splitGameConfig } from '../content-node.js'
import { catalogReader, sourceValue } from '../catalogs.js'
import { catalogsOf, normalizeText } from '../content-text.js'
import { orderPackages } from '../layers.js'
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
const overridePaths = (dir, prefix = '') => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? overridePaths(resolve(dir, entry.name), `${prefix}${entry.name}/`) : entry.name.endsWith('.json') ? [`${prefix}${entry.name}`] : []) : []
const hubEntry = (id) => new RegExp(`(id: '${id.replace(/[-]/g, '\\-')}'[\\s\\S]*?\\blevels: )(\\d+)`)
/** How many levels the hub's list (games.js) says game `id` has, or null when it does not list it. */
export const hubCount = (text, id) => (text?.match(hubEntry(id)) ? Number(text.match(hubEntry(id))[2]) : null)
const CONFIG = ['game.json', 'package.json', 'course.json']
const inGame = (file) => file === 'game.json' || file === 'course.json' || file === 'blueprint.json'

/** Open exactly one game layer. Package selectors open an independent package workspace. */
export function openGame(id, root = PROJECT_DIR, options = {}) {
  if (options.scope === 'package' || options.layer && !options.layer.startsWith('@')) {
    const { packageIds } = splitGameConfig(parse(read(resolve(gameDirectory(id, root), 'game.json')), 'game.json'), root)
    return openPackage(options.layer ?? packageIds[0], root, options)
  }
  return openWorkspace(id, root, options, false)
}

/** Open one package and read its dependencies without making them writable. */
export function openPackage(id, root = PROJECT_DIR, options = {}) {
  return openWorkspace(id, root, options, true)
}

function openWorkspace(id, root, { vocabulary = null, layer = null } = {}, packaged) {
  const dir = packaged ? resolve(root, 'packages', id) : gameDirectory(id, root)
  const config = resolve(dir, packaged ? 'package.json' : 'game.json')
  if (!existsSync(config)) throw new Error(`no ${packaged ? 'package' : 'data game'} ${id} in ${root}`)
  const original = new Map(packaged ? [] : [['game.json', read(config)]])
  const { game, packageIds } = packaged ? { game: {}, packageIds: loadPackageLayers(id, root).map((layer) => layer.id) } : splitGameConfig(parse(original.get('game.json'), config), root)
  const packageId = packaged ? id : packageIds[0]
  if (layer && layer !== (packaged ? id : `@${id}`)) throw new Error(`unknown layer ${layer}`)
  const scope = packaged ? 'package' : 'game'
  layer = packaged ? id : `@${id}`
  const packageDir = resolve(root, 'packages', packageId)
  const packageDirs = packageIds.map((id) => resolve(root, 'packages', id))
  const dependencyFiles = new Map(packageDirs.filter((path) => path !== packageDir).flatMap((dir) => overridePaths(dir).map((file) => [resolve(dir, file), read(resolve(dir, file))])))
  const packageLayers = readPackageLayers(packageIds, root)
  const paths = packaged ? { 'package.json': resolve(packageDir, 'package.json') } : configPaths(dir, packageDir)
  const pathFor = (file) => {
    if (file.startsWith('package/overrides/')) return relative(root, resolve(packageDir, file.slice('package/'.length)))
    if (file.startsWith(`${PACKAGE_I18N}/`)) return relative(root, resolve(packageDir, file.slice('package/'.length)))
    if (Object.hasOwn(paths, file)) return relative(root, paths[file])
    const inPackage = /^(levels|tags|relations|layouts)\//.test(file) || file === 'pieces.json' || file === 'glossary.json'
    return relative(root, resolve(inPackage ? packageDir : dir, file))
  }
  const onDisk = (file) => packaged && ['game.json', 'course.json', 'blueprint.json'].includes(file) ? null : read(resolve(root, pathFor(file)))
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
    ...(packaged ? [] : catalogFiles(resolve(dir, COURSE_I18N))).map(([lang]) => `${COURSE_I18N}/${lang}.json`),
    ...catalogFiles(resolve(packageDir, 'i18n')).map(([lang]) => `${PACKAGE_I18N}/${lang}.json`),
  ]
  const extraOverridePaths = () => [...overridePaths(resolve(packageDir, OVERRIDES)).map((file) => `package/overrides/${file}`), ...(packaged ? [] : overridePaths(resolve(dir, OVERRIDES)).map((file) => `overrides/${file}`))]
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
    packaged,
    owns: (file) => packaged ? file.startsWith(`packages/${id}/`) : file === HUB || file.startsWith(`games/${id}/`),
    packageId, packageIds, packageLayers,
    schemas,
    packageDir, packageDirs, dependencyFiles,
    pathFor,
    objectPaths,
    game: gameConfig,
    glossary: readers.package(load('glossary.json', true) ?? { groups: [], entries: [] }, pathFor('glossary.json'), GLOSSARY, schemas),
    blueprint: readers.course(packaged ? undefined : load('blueprint.json', true), pathFor('blueprint.json'), BLUEPRINT, schemas),
    partDefs: readers.package(load('pieces.json', true), pathFor('pieces.json'), PARTS_FILE, schemas),
    levels: new Map(levels().map((levelId) => {
      const file = `levels/${levelId}.json`
      return [levelId, readers.package(load(file), pathFor(file), schemas.level, schemas)]
    })),
    ...Object.fromEntries(Object.keys(OBJECT_SCHEMAS).map((kind) => [kind, new Map(objectPaths().filter((p) => p.startsWith(`${kind}/`)).map((file) => [file.split('/').at(-1).slice(0, -5), readers.package(load(file), pathFor(file), OBJECT_SCHEMAS[kind], schemas)]))])),
    declarationProblems: packaged ? [] : gameDeclarationProblems(dir),
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
    snapshot: () => ({ game: ws.game, glossary: ws.glossary, partDefs: ws.partDefs, blueprint: ws.blueprint, levels: new Map(ws.levels), ...objectSnapshot(ws), overrideFiles: new Map(ws.overrideFiles), basis: new Map(ws.basis), reservations: ws.reservations }),
    restore: (s) => Object.assign(ws, { game: s.game, glossary: s.glossary, partDefs: s.partDefs, blueprint: s.blueprint, levels: new Map(s.levels), ...objectSnapshot(s), overrideFiles: new Map(s.overrideFiles), basis: new Map(s.basis), reservations: s.reservations }),
    normalize: (vocabulary, previous) => normalize(ws, vocabulary, previous),
    /** Every file whose text changes: [{ file, before, after }] (before null: a new file; after null: removed). */
    changes: () => changes(ws),
    /** The changes as a unified diff. */
    diff: () => ws.changes().map((c) => unified(c.file, c.before, c.after)).join('\n'),
    write: () => write(ws, localeFiles),
    /** The course and package files, keyed by their project-relative paths. */
    onDisk: () => new Map([...new Set([...fileNames(levels(), objectPaths(), ws.packaged), ...localeFiles(), ...extraOverridePaths(), ...ws.original.keys()])]
      .map((file) => [pathFor(file), onDisk(file)]).filter(([file]) => ws.owns(file))),
  })
}

const objectSnapshot = (ws) => Object.fromEntries(Object.keys(OBJECT_SCHEMAS).map((kind) => [kind, new Map(ws[kind])]))
const objectFile = (kind, name) => `${kind}/${name}.json`
const objectEntries = (ws) => Object.keys(OBJECT_SCHEMAS).flatMap((kind) => [...ws[kind]].map(([name, value]) => [objectFile(kind, name), value]))
const objectPathsOf = (ws) => objectEntries(ws).map(([file]) => file)

/** The package's texts with what the game puts over them, unless the package is what is being edited. */
function contentOf(ws) {
  const files = configurationFiles(ws.game)
  const packaged = ownCatalogs(ws, catalogsOf(PACKAGE_I18N, ...packageValues(ws)))
  const own = {
    id: ws.packageId, config: files['package.json'], catalogs: { ...ws.packageCatalog, ...packaged },
    glossary: ws.glossary,
    objects: [
      ...[...ws.levels].map(([name, value]) => ({ kind: 'level', name, value })),
      ...Object.entries(ws.partDefs?.parts ?? {}).map(([name, value]) => ({ kind: 'piece', name, value })),
      ...Object.entries(ws.partDefs?.settings ?? {}).map(([name, value]) => ({ kind: 'setting', name, value })),
      ...(ws.glossary?.entries ?? []).map(({ id: name, ...value }) => ({ kind: 'entry', name, value })),
      ...Object.entries({ tag: 'tags', relation: 'relations', layout: 'layouts' }).flatMap(([kind, plural]) => [...ws[plural]].map(([name, value]) => ({ kind, name, value }))),
    ], overrides: [], textOverrides: [],
  }
  const game = { id: `@${ws.id}`, config: { ...files['game.json'], ...files['course.json'] }, objects: [], catalogs: catalogsOf(COURSE_I18N, files['game.json'], files['course.json'], ws.blueprint), overrides: [], textOverrides: [] }
  for (const [file, value] of activeOverrides(ws)) {
    const target = file.startsWith('package/') ? own : game
    const path = file.replace(/^package\//, '').split('/')
    const [, namespace, folder, filename] = path
    if (folder === 'i18n') target.textOverrides.push({ namespace, lang: filename.slice(0, -5), entries: value })
    else target.overrides.push({ kind: ({ levels: 'level', pieces: 'piece', settings: 'setting', entries: 'entry', tags: 'tag', relations: 'relation', layouts: 'layout' })[folder], name: `${namespace}/${filename.slice(0, -5)}`, value })
  }
  const layers = orderPackages(ws.packageLayers.map((layer) => layer.id === ws.packageId ? own : layer))
  return assembleLayers(ws.id, ws.packaged ? layers : [...layers, game], ws.schemas, { blueprint: ws.blueprint, declarationProblems: ws.declarationProblems, ...(ws.packaged && { packageId: ws.packageId }) })
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

const fileNames = (levels, objects, packaged = false) => [...CONFIG, 'glossary.json', 'pieces.json', 'blueprint.json', ...[...levels].map((id) => `levels/${id}.json`), ...objects].filter((file) => !packaged || !inGame(file))

const ownCatalogs = (ws, catalogs) => Object.fromEntries(Object.entries(catalogs).map(([lang, entries]) => [lang, Object.fromEntries(Object.entries(entries).filter(([key]) => !key.includes('/') || key.startsWith(`${ws.packageId}/`)))]))

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
    ['game.json', { packages: ws.packageIds, ...files['game.json'] }],
    ...(ws.original.get('glossary.json') == null && !ws.glossary.entries.length && !ws.glossary.groups.length ? [] : [['glossary.json', ws.glossary]]), ...(ws.partDefs === undefined ? [] : [['pieces.json', ws.partDefs]]),
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
    ...[...configuration].map(([file, value]) => [file, sourceValue(value)]),
    ...localizationFiles(COURSE_I18N, catalogsOf(COURSE_I18N, files['game.json'], files['course.json'], ws.blueprint)),
    ...localizationFiles(PACKAGE_I18N, packageCatalog),
  ].filter(([file]) => !ws.packaged || !['game.json', 'course.json', 'blueprint.json'].includes(file)))
  for (const [file, value] of now) {
    const before = ws.original.get(file) ?? null
    const after = writeJson(value, before ?? ws.basis.get(file) ?? null)
    if (after !== before) out.push({ file: ws.pathFor(file), before, after })
  }
  for (const [file, before] of ws.original) if (!now.has(file) && before !== null) out.push({ file: ws.pathFor(file), before, after: null })
  const listed = ws.packaged ? null : hubCount(ws.hub, ws.id)
  const count = courseLevelCount(contentOf(ws), ws.levels.size)
  if (listed !== null && listed !== count) out.push({ file: HUB, before: ws.hub, after: ws.hub.replace(hubEntry(ws.id), `$1${count}`) })
  return out.filter(({ file }) => ws.owns(file))
}

function write(ws, localeFiles) {
  const done = ws.changes()
  // Catalog edits depend on every reference in the course and package, including files this edit did not touch.
  const currentNames = fileNames(levelFiles(ws.packageDir).map(([id]) => id), ws.objectPaths(), ws.packaged)
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
  ws.original = new Map([...fileNames(ws.levels.keys(), objectPathsOf(ws), ws.packaged), ...ws.overrideFiles.keys(), ...localeFiles()]
    .map((file) => [file, read(resolve(ws.root, ws.pathFor(file)))]))
  ws.packageCatalog = Object.fromEntries(localeFiles().filter((file) => file.startsWith(`${PACKAGE_I18N}/`))
    .map((file) => [file.slice(PACKAGE_I18N.length + 1, -'.json'.length), parse(ws.original.get(file), ws.pathFor(file))]))
  ws.activePackageKeys = new Set(Object.values(catalogsOf(PACKAGE_I18N, ...packageValues(ws))).flatMap(Object.keys))
  ws.overrideFiles = new Map(activeOverrides(ws))
  ws.hub = read(resolve(ws.root, HUB))
  return done.map((c) => c.file)
}
