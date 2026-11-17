import { circuitVocabulary } from '../../../packages/circuit/core/index.js'
import { validateConfig, kernelIdentity, readJSON, dependencyProblem, satisfies } from './release-data.js'
import { layerManifest, viewRegistrations } from './manifests.js'
import { chooseRelease, releaseSource, releaseIndex } from './release-store.js'
import { existenceProblems, publicSurfaces } from './existence.js'
import { createRequire } from 'node:module'
import { installPackageImports, registerPackageLocation } from './plugin-boundaries.js'
import { createPluginKernel } from './plugins.js'
import { tagName } from './tag-identity.js'
// Read the game configuration and its content package for the build and author tools.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { assemble, combineConfiguration, contentRoots } from './content.js'
import { ENTRY } from './vocabulary.js'
import { PARTS_FILE } from '../../../packages/circuit/core/index.js'
import { OBJECT_SCHEMAS } from './objects.js'
import { BLUEPRINT } from '../pipeline/blueprint.js'
import { composeLayers, orderPackages, folders, kindForFolder } from './layers.js'
import { catalogReader } from './catalogs.js'
import { runtimeIds } from './runtime.js'
import { contentKindSchemas } from './content-kinds.js'
import { withKindDeclarations, kindSchemas } from './plugin-kinds.js'
import { vocabularyFor, modules } from './kernel.js'

/** Content locations belong exclusively to the workspace resolver. */
export function contentRoot(root) {
  if (root) return resolve(root)
  if (process.env.GAMES_ROOT) return resolve(process.env.GAMES_ROOT)
  let dir = process.cwd()
  if (dir.endsWith('/trace-viewer')) dir = dirname(dir)
  return dir
}
export const packageDirectory = (id = '', root) => resolve(contentRoot(root), 'packages', id)
export const gameDirectory = (id = '', root) => resolve(contentRoot(root), 'games', id)

export const contentVocabulary = (modules) => vocabularyFor(modules)
export const layerVocabulary = (layers) => {
  const levels = layers.flatMap(layer => [...layer.objects, ...(layer.overrides ?? [])].filter(o => o.kind === 'level').map(o => o.value))
  const legacy = levels.flatMap(level => (level.tasks ?? []).filter(task => !task.play || !layers.some(layer => layer.hasCore && task.play.startsWith(`${layer.id}:`))).map(task => ({ ...level, tasks: [task] })))
  const entries = kind => Object.fromEntries(layers.flatMap(layer => [...layer.objects, ...(layer.overrides ?? [])].filter(o => o.kind === kind).map(o => [o.name.includes('/') ? o.name : `${layer.id}/${o.name}`, o.value])))
  const ids = runtimeIds({ levels: legacy, registries: { symbol: entries('symbol') }, partDefs: { parts: entries('circuit/part') } })
  const legacyModules = ids.filter(id => modules.some(module => module.id === id) && (id === 'circuit' || !layers.some(layer => layer.id === id && layer.hasCore)))
  const packageCode = layers.some(layer => layer.hasCore) || levels.some(level => level.tasks?.some(task => task.play))
  return { ...withKindDeclarations(circuitVocabulary(vocabularyFor(legacyModules)), layers, packageCode), legacyModules, packageCode }
}

const json = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new Error(`${file}: ${error.message}`)
  }
}


/** Whether a game has its own course configuration. */
export const isDataGame = (id, root = contentRoot()) => existsSync(resolve(gameDirectory(id, root), 'game.json'))

const selector = (id, label) => {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new Error(`game.json needs a ${label} ID with lowercase letters, digits and dashes`)
  }
  return id
}

/** Keep the package selector separate from the game's presentation. */
export function splitGameConfig({ packages, ...game }, root = contentRoot()) {
  validateConfig({ packages, ...game }, true)
  const ids = Object.keys(packages)
  ids.forEach((id) => selector(id, 'package'))
  const packageId = ids[0]
  const packageDir = packageDirectory(selector(packageId, 'package'), root)
  return { packageId, packageDir, packageIds: ids, packageRanges: packages, game }
}

/** Locations of the configuration, keyed by the logical filenames: the course in the game, the rest in its package. */
export const configPaths = (gameDir, packageDir) => ({
  'package.json': resolve(packageDir, 'package.json'),
  'course.json': resolve(gameDir, 'course.json'),
})

function configuration(paths) {
  return Object.fromEntries(Object.entries(paths).map(([file, path]) => [file, json(path)]))
}

export function readGameConfig(id, root = contentRoot()) {
  const gameDir = gameDirectory(id, root)
  const { game: meta, ...location } = splitGameConfig(json(resolve(gameDir, 'game.json')), root)
  const files = { 'game.json': meta, 'course.json': json(resolve(gameDir, 'course.json')) }
  return { ...location, files, game: combineConfiguration(files) }
}

/** Named objects declared by a package or game layer, [[name, path]]. */
export function objectFiles(dir, kind) {
  const folder = resolve(dir, kind)
  if (kind === 'tags' || kind === 'tag') {
    if (!existsSync(folder)) return []
    const children = readdirSync(folder, { withFileTypes: true })
    if (children.some((entry) => entry.isFile() && entry.name.endsWith('.json'))) throw new Error(`${folder}: tags belong in <kind>/<name>.json`)
    const walk = (path, prefix = '') => readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => entry.isDirectory() ? walk(resolve(path, entry.name), `${prefix}${entry.name}/`) : entry.name.endsWith('.json') ? [[`${prefix}${entry.name.slice(0, -5)}`, resolve(path, entry.name)]] : [])
    return walk(folder)
  }
  return existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.json')).sort().map((f) => [f.slice(0, -5), resolve(folder, f)]) : []
}

/** Tag kind belongs to the path; source files never duplicate it. */
export function tagValue(name, value) {
  if (Object.hasOwn(value, 'kind')) throw new Error(`tags/${name}: kind belongs in the path, not the object`)
  return { ...value, kind: name.slice(0, name.lastIndexOf('/')) }
}

/** Entry identity and membership belong to filenames and tags. */
export function entryValue(name, value) {
  if (Object.hasOwn(value, 'id') || Object.hasOwn(value, 'group')) throw new Error(`entries/${name}: identity belongs in the filename and membership in entry tags`)
  return value
}

/** Games arrange package objects and cannot declare objects of their own. */
export function gameDeclarationProblems(gameDir, schemas) {
  return [...new Set(['kinds', 'symbols', 'core', 'view', ...Object.values(schemas?.objectKinds ?? {}).filter(d => !d.extends).map(d => d.folder), 'levels', 'parts', 'parts.json', 'settings', 'settings.json', 'glossary.json', 'entries', 'entries.json', 'tags', 'relations', 'sections', 'trays', 'groups', 'trays.json', ...Object.keys(contentKindSchemas).map(kind => folders[kind])])]
    .filter((name) => existsSync(resolve(gameDir, name)))
    .map((name) => ({ at: name, says: 'games cannot declare objects; declare them in a package' }))
}

/** The level files of a content package, [[id, path]]. */
export function levelFiles(packageDir) {
  const folder = resolve(packageDir, 'levels')
  return (existsSync(folder) ? readdirSync(folder) : []).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -'.json'.length), resolve(folder, f)])
}

/** The locale files of a course or package, [[locale, path]]. */
export function catalogFiles(dir) {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => [f.slice(0, -'.json'.length), resolve(dir, f)]) : []
}

export const readCatalogs = (dir) => Object.fromEntries(catalogFiles(dir).map(([lang, path]) => [lang, json(path)]))

/** The blind sessions played on a course. */
export function readPlaytests(id, dir = gameDirectory()) {
  const folder = resolve(dir, id, 'playtests')
  return existsSync(folder) ? readdirSync(folder).filter((f) => f.endsWith('.json')).sort().map((f) => json(resolve(folder, f))) : []
}

function readFiles(id, files, { packageDir, gameDir, courseLocales, packageLocales, vocabulary, courseNamespace, packageId = packageDir.split('/').at(-1) }) {
  const blueprint = resolve(gameDir, 'blueprint.json')
  const parts = objectFiles(packageDir, 'parts')
  const courseText = catalogReader(readCatalogs(courseLocales), courseLocales)
  const packageCatalogs = readCatalogs(packageLocales)
  const packageText = catalogReader(packageCatalogs, packageLocales)
  const schemas = vocabulary ?? layerVocabulary([...packageLayers('circuit'), readLayer(packageId, packageDir)])
  const read = (reader, path, schema) => reader(json(path), path, schema, schemas)
  const ownText = (file) => (file === 'game.json' || file === 'course.json' ? courseText : packageText)
  return assemble({
    id, packageId, courseNamespace, schemas,
    game: combineConfiguration(Object.fromEntries(Object.entries(files).map(([file, value]) => [file, ownText(file)(value, file, schemas.game, schemas)]))),
    levels: levelFiles(packageDir).map(([levelId, file]) => [levelId, read(packageText, file, schemas.level)]),
    ...Object.fromEntries(['tags', 'relations', 'sections'].map((kind) => [kind, [
      ...objectFiles(packageDir, folders[kind] ?? kind).map(([name, file]) => [kind === 'tags' ? name.split('/').at(-1) : name, { ...read(packageText, file, OBJECT_SCHEMAS[kind]), ...(kind === 'tags' && { kind: name.slice(0, name.lastIndexOf('/')) }) }, packageId]),
    ]])),
    contentObjects: Object.fromEntries(Object.entries(contentKindSchemas).map(([kind, schema]) => [kind, Object.fromEntries(objectFiles(packageDir, folders[kind] ?? kind).map(([name, file]) => [name, read(packageText, file, schema)]))])),
    declarationProblems: gameDir === packageDir ? [] : gameDeclarationProblems(gameDir),
    glossary: { groups: [], entries: objectFiles(packageDir, 'entries').map(([id, file]) => ({ id, ...read(packageText, file, ENTRY) })) },
    partDefs: { parts: Object.fromEntries(parts.map(([name, file]) => [name, read(packageText, file, PARTS_FILE.fields.parts.of)])) },
    blueprint: existsSync(blueprint) ? read(courseText, blueprint, BLUEPRINT) : undefined,
    fromDisk: true,
  })
}

/** Read a layer in file shape; workspaces can replace this layer before assembling. */
function readLayer(id, dir, config = json(resolve(dir, 'package.json')), declarations = {}) {
  if (id === 'kernel') throw new Error('kernel is a reserved namespace')
  if (existsSync(resolve(dir, 'settings')) || existsSync(resolve(dir, 'settings.json'))) throw new Error(`${dir}: settings belong inside parts/`)
  if (existsSync(resolve(dir, 'glossary.json'))) throw new Error(`${dir}: glossary.json has been replaced by entries/ and tags/entry/`)
  const tagReaders = []
  const kernel = createPluginKernel()
  const core = resolve(dir, 'core/index.js')
  if (!id.startsWith('@') && existsSync(core)) {
    installPackageImports()
    const api = kernel.forPackage(id, 'core')
    const registration = createRequire(import.meta.url)(core)
    const result = registration.register({ ...api, tag(name, member) {
      api.tag(name, member)
      tagReaders.push({ name, member, reader: id })
    } })
    if (result?.then) throw new Error(`${id}: register(kernel) must register declarations synchronously`)
  }
  const objects = levelFiles(dir).map(([name, file]) => ({ kind: 'level', name, value: json(file) }))
  for (const folder of ['tags', 'relations', 'sections']) for (const [name, file] of objectFiles(dir, folder)) objects.push({ kind: kindForFolder[folder], name: folder === 'tags' ? name.split('/').at(-1) : name, value: folder === 'tags' ? tagValue(name, json(file)) : json(file) })
  if (existsSync(resolve(dir, 'parts.json'))) throw new Error(`${dir}: parts.json has been replaced by parts/`)
  for (const [name, file] of objectFiles(dir, 'entries')) objects.push({ kind: 'entry', name, value: entryValue(name, json(file)) })
  for (const kind of Object.keys(contentKindSchemas)) for (const [name, file] of objectFiles(dir, folders[kind])) objects.push({ kind, name, value: json(file) })
  for (const [name, file] of objectFiles(dir, 'kinds')) objects.push({ kind: 'kind', name, value: json(file) })
  for (const [kind, definition] of Object.entries(declarations)) if (!definition.extends) for (const [name, file] of objectFiles(dir, definition.folder)) objects.push({ kind, name, value: json(file) })
  const overrides = [], textOverrides = []
  const overrideDir = resolve(dir, 'overrides')
  for (const namespace of existsSync(overrideDir) ? readdirSync(overrideDir) : []) {
    for (const [kind, folder] of Object.entries({ ...folders, kind: 'kinds', ...Object.fromEntries(Object.entries(declarations).filter(([, d]) => !d.extends).map(([k, d]) => [k, d.folder])) })) for (const [name, file] of objectFiles(resolve(overrideDir, namespace), folder)) overrides.push({ kind, name: `${namespace}/${kind === 'tag' ? name.split('/').at(-1) : name}`, value: kind === 'tag' ? tagValue(name, json(file)) : json(file) })
    for (const [lang, entries] of Object.entries(readCatalogs(resolve(overrideDir, namespace, 'i18n')))) textOverrides.push({ namespace, lang, entries })
  }
  return { id, config, entryPaths: Object.fromEntries([['core', 'core/index.js'], ['view', 'view/index.jsx']].filter(([, path]) => existsSync(resolve(dir, path))).map(([side, path]) => [side, resolve(dir, path)])), tagReaders, codeObjects: [...viewRegistrations(existsSync(resolve(dir, 'view/index.jsx')) ? resolve(dir, 'view/index.jsx') : null), ...kernel.objects, ...Object.entries(kernel.tables).filter(([kind]) => kind !== 'tag').flatMap(([kind, table]) => [...table].map(([name, value]) => ({ kind, name, value: value?.type ? { type: value.type } : {} })))], objects, overrides, textOverrides, hasCore: existsSync(resolve(dir, 'core/index.js')), hasView: existsSync(resolve(dir, 'view/index.jsx')), catalogs: readCatalogs(resolve(dir, 'i18n')) }
}

/** Resolve locked dependencies into a single layer representation for every consumer. */
export function resolveLayers({ game, package: packageId, packages, closure = false, root = contentRoot(), unlocked = false, pins, versionChoices = {}, attempted = [] }) {
  unlocked ||= process.env.GAMES_DEPENDENCY_PROBE === '1'
  const selected = game ? readGameConfig(game, root) : null
  const ids = selected?.packageIds ?? packages ?? [packageId]
  const owner = game ? `@${game}` : packageId
  const ownerDir = game ? gameDirectory(game, root) : packageId ? packageDirectory(packageId, root) : null
  const lockFile = ownerDir && resolve(ownerDir, 'lock.json')
  let lock = pins ?? (lockFile && existsSync(lockFile) ? readJSON(lockFile) : null)
  const found = new Map(), locations = new Map(), ranges = new Map(), problems = []
  const requireRange = (id, range, layer) => {
    const requests = ranges.get(id) ?? []
    requests.push({ range, layer }); ranges.set(id, requests)
  }
  if (game) for (const [id, range] of Object.entries(selected.packageRanges)) requireRange(id, range, owner)
  const visit = id => {
    selector(id, 'package')
    if (found.has(id)) return
    let dir = packageDirectory(id, root), released = false
    if (!existsSync(resolve(dir, 'package.json'))) {
      const pinned = unlocked ? pins?.dependencies?.[id] : lock?.dependencies?.[id]
      const entry = pinned ? chooseRelease(id, [], root, pinned) : versionChoices[id] ?? chooseRelease(id, (ranges.get(id) ?? []).map(request => request.range), root)
      if (entry) { dir = releaseSource(id, entry, root); released = true }
    }
    locations.set(id, dir)
    registerPackageLocation(id, dir, root)
    const present = existsSync(resolve(dir, 'package.json'))
    const config = present ? json(resolve(dir, 'package.json')) : {}
    found.set(id, { id, config })
    for (const [dep, range] of Object.entries(config.uses ?? {})) {
      requireRange(dep, range, id)
      if (closure || ids.includes(dep)) visit(dep)
    }
    const layer = present ? readLayer(id, dir, config) : { id, missing: true, entryPaths: {}, config, objects: [], overrides: [], catalogs: {} }
    layer.source = released ? 'archive' : 'workspace'
    found.set(id, layer)
  }
  ids.forEach(visit)
  const choices = { ...versionChoices }
  let retry = false
  for (const [id, requests] of ranges) {
    const layer = found.get(id)
    if (layer?.source !== 'archive' || (unlocked ? pins : lock)?.dependencies?.[id] || requests.every(request => satisfies(layer.config.version, request.range))) continue
    const entry = chooseRelease(id, requests.map(request => request.range), root)
    if (entry && entry.version !== layer.config.version) { choices[id] = entry; retry = true }
  }
  if (retry) {
    const signature = JSON.stringify(choices)
    if (attempted.includes(signature)) throw new Error('incompatible dependency version graph')
    return resolveLayers({ game, package: packageId, packages, closure, root, unlocked, pins, versionChoices: choices, attempted: [...attempted, signature] })
  }
  if (!game && packageId && !lock && found.get(packageId)?.source === 'archive') lock = readJSON(resolve(locations.get(packageId), 'lock.json'))
  const initial = orderPackages([...found.values()])
  const definitions = layerVocabulary(initial).objectKinds
  const layers = initial.map(layer => layer.missing ? layer : { ...readLayer(layer.id, locations.get(layer.id), layer.config, definitions), source: layer.source })
  const schemas = layerVocabulary(layers)
  const qualified = composeLayers(layers, schemas).qualifiedLayers
  for (const layer of layers) if (!layer.missing) layer.manifest = layerManifest(qualified.find(item => item.id === layer.id), qualified, schemas, locations.get(layer.id))
  const platform = kernelIdentity()
  const config = game ? { ...selected.files['game.json'], packages: selected.packageRanges } : found.get(packageId)?.config
  for (const layer of layers) if (!layer.missing) requireRange('kernel', layer.config.kernel, layer.id)
  if (game) requireRange('kernel', config.kernel, owner)
  const identities = { kernel: platform, ...Object.fromEntries(layers.filter(layer => !layer.missing && layer.id !== packageId).map(layer => [layer.id, { version: layer.config.version, hash: layer.manifest.hash }])) }
  for (const [id, requests] of ranges) {
    const identity = id === 'kernel' ? platform : layers.find(layer => layer.id === id)?.manifest
    if (identity) for (const { range, layer } of requests) if (!satisfies(identity.version, range)) problems.push(dependencyProblem(layer, id, `version ${identity.version} outside ${range}`, `${id === 'kernel' ? 'kernel' : 'dependencies'}.${id}`))
  }
  if (owner && !unlocked) {
    if (!lock) problems.push(dependencyProblem(owner, owner, 'missing lock'))
    else {
      if (lock.target !== owner) problems.push(dependencyProblem(owner, owner, 'lock target mismatch'))
      for (const id of new Set([...Object.keys(identities), ...Object.keys(lock.dependencies ?? {})])) {
        const actual = identities[id], pinned = lock.dependencies?.[id]
        if (!actual || !pinned || (id !== 'kernel' && layers.find(layer => layer.id === id)?.source === 'archive' && (actual.version !== pinned.version || actual.hash !== pinned.hash))) problems.push(dependencyProblem(owner, id, 'lock version or content hash mismatch'))
      }
    }
  }
  if (game) layers.push(readLayer(`@${game}`, gameDirectory(game, root), { ...config, ...selected.files['course.json'] }, definitions))
  if (owner && problems.length && layers.length) layers.at(-1).dependencyProblems = problems
  return { layers, lock, lockStatus: { valid: !problems.length, problems }, identities, ...(selected ?? {}) }
}

export const readPackageLayers = (packages, root) => resolveLayers({ packages, root }).layers

/** Assemble qualified layers once, after every override has been composed. */
export function assembleLayers(id, layers, schemas, { blueprint, declarationProblems = [], packageId = null } = {}) {
  const result = composeLayers(layers, schemas)
  declarationProblems = [...declarationProblems, ...layers.flatMap(layer => layer.dependencyProblems ?? []), ...existenceProblems(result.qualifiedLayers, schemas)]
  const { registries: r, configurations, sources, overrideHistory, layerOrder, layerUses } = result
  const game = Object.assign({}, ...configurations)
  delete game.uses
  delete game.packages
  const packageFields = Object.keys(game).filter((key) => key !== 'vocabulary')
  const entries = (kind) => Object.entries(r[kind] ?? {}).map(([name, value]) => [kind === 'tag' ? tagName(name) : name, value, (kind === 'tag' ? tagName(name) : name).split('/')[0]])
  const overridden = {}
  for (const event of overrideHistory) if (event.kind === 'i18n') {
    const [lang, key] = event.name.split(':')
    const values = overridden[key] ??= {}
    values[lang] = event.before
  }
  const content = assemble({ id, schemas, packageId: packageId ?? layers[0].id, game, qualified: true,
    levels: entries('level'), tags: entries('tag'), relations: entries('relation'), sections: entries('section'), trays: entries('circuit/tray'),
    contentObjects: Object.fromEntries(Object.keys(kindSchemas(schemas)).map(kind => [kind, r[kind]])), partDefs: { parts: r['circuit/part'] }, glossary: { groups: [], entries: Object.entries(r.entry).map(([id, value]) => ({ id, ...value })) },
    blueprint, declarationProblems, existenceChecked: true, overridden, fromDisk: true, objectKinds: schemas.objectKinds, ...(packageId && { packageTarget: { id: packageId, fields: packageFields } }), provenance: { sources, overrideHistory, layerOrder, layerUses },
  })
  Object.defineProperty(content, 'resolvedDependencies', { value: { layers: result.qualifiedLayers, surfaces: publicSurfaces(result.qualifiedLayers, schemas) } })
  return content
}

export function readContent(id, root = contentRoot(), { overrides = true, vocabulary } = {}) {
  const { layers: resolved } = resolveLayers({ game: id, root })
  const own = resolved.at(-1), layers = resolved.slice(0, -1)
  const gameDir = gameDirectory(id, root)
  if (!overrides) { own.overrides = []; own.textOverrides = [] }
  own.objects = []
  const schemas = vocabulary ?? layerVocabulary(layers)
  const blueprintPath = resolve(gameDir, 'blueprint.json')
  const blueprint = existsSync(blueprintPath) ? catalogReader(own.catalogs)(json(blueprintPath), blueprintPath, BLUEPRINT, schemas) : undefined
  const content = assembleLayers(id, [...layers, own], schemas, { blueprint, declarationProblems: gameDeclarationProblems(gameDir, schemas) })
  contentRoots.set(content, root)
  return content
}

/** Installed packages, including libraries with no game. */
export function packageIds(root = contentRoot()) {
  const dir = packageDirectory('', root)
  return [...new Set([...(existsSync(dir) ? readdirSync(dir).filter(id => existsSync(resolve(dir, id, 'package.json'))) : []), ...Object.keys(releaseIndex(root).packages)])].sort()
}

/** Open a package with its complete dependency closure, without requiring a game. */
export const packageLayers = (id, root) => resolveLayers({ package: id, closure: true, root }).layers

/** Bare names retain game precedence. Explicit package selection disambiguates a shared name. */
export function contentTargets(ids = [], root = contentRoot(), { package: asPackage = false, game: asGame = false } = {}) {
  if (asPackage && asGame) throw new Error('choose --package or --game')
  const dir = resolve(root, 'games')
  const games = existsSync(dir) ? readdirSync(dir).filter((id) => isDataGame(id, root)).sort() : []
  const packages = packageIds(root)
  const target = (id) => {
    if (!asPackage && games.includes(id)) return { id, kind: 'game' }
    if (!asGame && packages.includes(id)) return { id, kind: 'package' }
    throw new Error(`no ${asPackage ? 'package' : asGame ? 'game' : 'game or package'} ${id}`)
  }
  if (ids.length) return ids.map(target)
  if (asPackage) return packages.map((id) => ({ id, kind: 'package' }))
  const played = new Set(games.flatMap((id) => readGameConfig(id, root).packageIds))
  return [...games.map((id) => ({ id, kind: 'game' })), ...(asGame ? [] : packages.filter((id) => !played.has(id)).map((id) => ({ id, kind: 'package' })))]
}

export function readPackage(id, root = contentRoot(), { vocabulary } = {}) {
  const layers = packageLayers(id, root)
  const schemas = vocabulary ?? layerVocabulary(layers)
  const content = assembleLayers(id, layers, schemas, { packageId: id })
  contentRoots.set(content, root)
  return content
}

/** A domain's uninstalled starter keeps the course and package files together. */
export function readStarter(templateDir) {
  const dir = resolve(templateDir, 'starter')
  const files = { 'game.json': json(resolve(dir, 'game.json')), ...configuration(configPaths(dir, dir)) }
  return readFiles('starter', files, { vocabulary: layerVocabulary([...packageLayers('circuit'), readLayer('starter', dir)]), courseNamespace: 'starter', packageId: 'starter', packageDir: dir, gameDir: dir, courseLocales: resolve(dir, 'i18n/course'), packageLocales: resolve(dir, 'i18n/package') })
}

export { runtimeOf } from './runtime.js'

/** File-shaped public data for authoring. Consumers never open a dependency directory. */
export function publicLayerFiles(layer, schemas) {
  const paths = { ...folders, kind: 'kinds', ...Object.fromEntries(Object.entries(schemas.objectKinds ?? {}).filter(([, d]) => !d.extends).map(([kind, d]) => [kind, d.folder])) }
  const objectPath = object => `${paths[object.kind]}/${object.kind === 'tag' ? `${object.value.kind}/` : ''}${object.name.split('/').at(-1)}.json`
  const files = new Map([['package.json', JSON.stringify(layer.config)]])
  for (const object of layer.objects) files.set(objectPath(object), JSON.stringify(object.kind === 'tag' ? Object.fromEntries(Object.entries(object.value).filter(([key]) => key !== 'kind')) : object.value))
  for (const [lang, entries] of Object.entries(layer.catalogs ?? {})) files.set(`i18n/${lang}.json`, JSON.stringify(entries))
  for (const object of layer.overrides ?? []) files.set(`overrides/${object.name.split('/')[0]}/${objectPath(object)}`, JSON.stringify(object.kind === 'tag' ? Object.fromEntries(Object.entries(object.value).filter(([key]) => key !== 'kind')) : object.value))
  for (const { namespace, lang, entries } of layer.textOverrides ?? []) files.set(`overrides/${namespace}/i18n/${lang}.json`, JSON.stringify(entries))
  return files
}

export const packageConfig = (id, root) => {
  const file = resolve(packageDirectory(id, root), 'package.json')
  if (existsSync(file)) return json(file)
  const release = chooseRelease(id, [], contentRoot(root))
  if (!release) throw new Error(`no package ${id}`)
  return json(resolve(releaseSource(id, release, contentRoot(root)), 'package.json'))
}

export const workspaceCheckCache = () => !process.env.GAMES_ROOT

export const contentLayers = content => content.resolvedDependencies?.layers ?? []
