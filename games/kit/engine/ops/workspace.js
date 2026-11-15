// A data game's files opened for operations (./operations.js): the game selector, its course and package configuration,
// glossary.json, levels/<id>.json, pieces.json (when present), and the
// course blueprint (blueprint.json, when the game has one or an operation writes one) as values an operation replaces
// (never mutates), the text each file had, and the hub's level count for the game
// (games/games.js). Nothing reaches the disk until write(); diff() previews it.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { assemble, combineConfiguration, configurationFiles, courseLevelCount, deepFreeze } from '../content.js'
import { PROJECT_DIR, catalogFiles, gameDirectory, levelFiles, packageConfigPaths, splitGameConfig } from '../content-node.js'
import { catalogReader, sourceValue } from '../catalogs.js'
import { catalogsOf, normalizeText } from '../content-text.js'
import { GLOSSARY } from '../vocabulary.js'
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
const hubEntry = (id) => new RegExp(`(id: '${id.replace(/[-]/g, '\\-')}'[\\s\\S]*?\\blevels: )(\\d+)`)
/** How many levels the hub's list (games.js) says game `id` has, or null when it does not list it. */
export const hubCount = (text, id) => (text?.match(hubEntry(id)) ? Number(text.match(hubEntry(id))[2]) : null)

/** Open a course and its package for author operations. */
export function openGame(id, root = PROJECT_DIR) {
  const dir = gameDirectory(id, root)
  const config = resolve(dir, 'game.json')
  if (!existsSync(config)) throw new Error(`no data game ${id} in ${root}`)
  const original = new Map([['game.json', read(config)]])
  const { game, packageId, packageDir, courseId } = splitGameConfig(parse(original.get('game.json'), config), root)
  const packagePaths = packageConfigPaths(packageDir, courseId)
  const pathFor = (file) => {
    if (file.startsWith(`${PACKAGE_I18N}/`)) return relative(root, resolve(packageDir, file.slice('package/'.length)))
    if (Object.hasOwn(packagePaths, file)) return relative(root, packagePaths[file])
    const inPackage = file.startsWith('levels/') || file === 'pieces.json' || file === 'glossary.json'
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
  const localeFiles = () => [
    ...catalogFiles(resolve(dir, COURSE_I18N)).map(([lang]) => `${COURSE_I18N}/${lang}.json`),
    ...catalogFiles(resolve(packageDir, 'i18n')).map(([lang]) => `${PACKAGE_I18N}/${lang}.json`),
  ]
  const catalog = (prefix) => Object.fromEntries(localeFiles().filter((file) => file.startsWith(`${prefix}/`))
    .map((file) => [file.slice(prefix.length + 1, -'.json'.length), load(file)]))
  const courseCatalog = catalog(COURSE_I18N)
  const packageCatalog = catalog(PACKAGE_I18N)
  const readers = {
    course: catalogReader(courseCatalog, resolve(dir, COURSE_I18N)),
    package: catalogReader(packageCatalog, resolve(packageDir, 'i18n')),
  }
  const keyed = (catalogs) => new Set(Object.values(catalogs).flatMap(Object.keys))
  const gameConfig = combineConfiguration({
    'game.json': readers.course(game, pathFor('game.json')),
    ...Object.fromEntries(Object.keys(packagePaths).map((file) => [
      file, readers.package(load(file, file === 'trays.json'), pathFor(file)),
    ])),
  })
  const ws = {
    id,
    root,
    dir,
    packageId,
    packageDir,
    courseId,
    pathFor,
    game: gameConfig,
    glossary: readers.package(load('glossary.json'), pathFor('glossary.json')),
    blueprint: readers.course(load('blueprint.json', true), pathFor('blueprint.json')),
    partDefs: readers.package(load('pieces.json', true), pathFor('pieces.json')),
    levels: new Map(levels().map((levelId) => {
      const file = `levels/${levelId}.json`
      return [levelId, readers.package(load(file), pathFor(file))]
    })),
    reservations: { course: keyed(courseCatalog), package: keyed(packageCatalog) },
    original,
    // A file that takes over another's content (a level renamed) is laid out like the text it came from.
    basis: new Map(),
    hub: read(resolve(root, HUB)),
  }
  // A package may hold several courses. Keep translations owned by its other courses.
  ws.packageCatalog = packageCatalog
  ws.activePackageKeys = keyed(catalogsOf(PACKAGE_I18N, ...packageValues(ws)))
  return Object.assign(ws, {
    /** The game as one content (../content.js), frozen: the operations put new values in, nothing writes into one. */
    content: () => deepFreeze(assemble({ id, game: ws.game, glossary: ws.glossary, partDefs: ws.partDefs, levels: [...ws.levels], blueprint: ws.blueprint, fromDisk: true })),
    /** What the files hold now, by name; a removed level file is null. */
    snapshot: () => ({ game: ws.game, glossary: ws.glossary, partDefs: ws.partDefs, blueprint: ws.blueprint, levels: new Map(ws.levels), basis: new Map(ws.basis), reservations: ws.reservations }),
    restore: (s) => Object.assign(ws, { game: s.game, glossary: s.glossary, partDefs: s.partDefs, blueprint: s.blueprint, levels: new Map(s.levels), basis: new Map(s.basis), reservations: s.reservations }),
    normalize: (vocabulary, previous) => normalize(ws, vocabulary, previous),
    /** Every file whose text changes: [{ file, before, after }] (before null: a new file; after null: removed). */
    changes: () => changes(ws),
    /** The changes as a unified diff. */
    diff: () => ws.changes().map((c) => unified(c.file, c.before, c.after)).join('\n'),
    write: () => write(ws, localeFiles),
    /** The course and package files, keyed by their project-relative paths. */
    onDisk: () => new Map([...new Set([...fileNames(levels()), ...localeFiles(), ...ws.original.keys()])]
      .map((file) => [pathFor(file), onDisk(file)])),
  })
}

const fileNames = (levels) => ['game.json', 'package.json', 'course.json', 'trays.json', 'glossary.json', 'pieces.json', 'blueprint.json', ...[...levels].map((id) => `levels/${id}.json`)]

function packageValues(ws) {
  const { 'game.json': _, ...packaged } = configurationFiles(ws.game)
  return [...Object.values(packaged), ws.glossary, ws.partDefs, ...ws.levels.values()]
}

function normalize(ws, vocabulary, previous) {
  const reservations = { ...ws.reservations }
  const keyOf = (scope) => reservations[scope] === ws.reservations[scope] ? (reservations[scope] = new Set(reservations[scope])) : reservations[scope]
  function assign(value, was, schema, prefix, scope) {
    return value === was ? value : normalizeText(value, schema, prefix, { previous: was, vocabulary, reserved: keyOf(scope) })
  }
  if (ws.game !== previous.game) {
    const files = configurationFiles(ws.game), before = configurationFiles(previous.game)
    const prefixes = { 'game.json': 'game', 'package.json': 'package', 'course.json': `course.${ws.courseId}`, 'trays.json': 'tray' }
    for (const [file, value] of Object.entries(files)) {
      const trays = file === 'trays.json'
      const scope = file === 'game.json' ? 'course' : 'package'
      files[file] = trays
        ? assign({ trays: value }, { trays: before[file] }, vocabulary.game, prefixes[file], scope).trays
        : assign(value, before[file], vocabulary.game, prefixes[file], scope)
    }
    ws.game = combineConfiguration(files)
  }
  ws.blueprint = assign(ws.blueprint, previous.blueprint, BLUEPRINT, 'blueprint', 'course')
  ws.glossary = assign(ws.glossary, previous.glossary, GLOSSARY, 'glossary', 'package')
  ws.partDefs = assign(ws.partDefs, previous.partDefs, PARTS_FILE, 'pieces', 'package')
  for (const [level, value] of ws.levels) ws.levels.set(level, assign(value, previous.levels.get(level), vocabulary.level, `level.${level}`, 'package'))
  ws.reservations = reservations
}

const localizationFiles = (prefix, catalogs) => Object.entries(catalogs).map(([lang, entries]) => [`${prefix}/${lang}.json`, entries])

function changes(ws) {
  const out = []
  const files = configurationFiles(ws.game)
  const configuration = new Map([...Object.entries(files),
    ['game.json', { package: ws.packageId, course: ws.courseId, ...files['game.json'] }],
    ['glossary.json', ws.glossary], ...(ws.partDefs === undefined ? [] : [['pieces.json', ws.partDefs]]),
    ...(ws.blueprint === undefined ? [] : [['blueprint.json', ws.blueprint]]), ...[...ws.levels].map(([id, level]) => [`levels/${id}.json`, level]),
  ])
  const active = catalogsOf(PACKAGE_I18N, ...packageValues(ws))
  const packageCatalog = Object.fromEntries([...new Set([...Object.keys(ws.packageCatalog), ...Object.keys(active)])].sort()
    .flatMap((lang) => {
      const entries = { ...Object.fromEntries(Object.entries(ws.packageCatalog[lang] ?? {}).filter(([key]) => !ws.activePackageKeys.has(key))), ...active[lang] }
      return Object.keys(entries).length ? [[lang, Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))]] : []
    }))
  const now = new Map([
    ...[...configuration].map(([file, value]) => [file, sourceValue(value)]),
    ...localizationFiles(COURSE_I18N, catalogsOf(COURSE_I18N, files['game.json'], ws.blueprint)),
    ...localizationFiles(PACKAGE_I18N, packageCatalog),
  ])
  for (const [file, value] of now) {
    const before = ws.original.get(file) ?? null
    const after = writeJson(value, before ?? ws.basis.get(file) ?? null)
    if (after !== before) out.push({ file: ws.pathFor(file), before, after })
  }
  for (const [file, before] of ws.original) if (!now.has(file) && before !== null) out.push({ file: ws.pathFor(file), before, after: null })
  const listed = hubCount(ws.hub, ws.id)
  const count = courseLevelCount(ws.game, ws.levels.size)
  if (listed !== null && listed !== count) out.push({ file: HUB, before: ws.hub, after: ws.hub.replace(hubEntry(ws.id), `$1${count}`) })
  return out
}

function write(ws, localeFiles) {
  const done = ws.changes()
  // Catalog edits depend on every reference in the course and package, including files this edit did not touch.
  const currentNames = fileNames(levelFiles(ws.packageDir).map(([id]) => id))
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
  ws.original = new Map([...fileNames(ws.levels.keys()), ...localeFiles()]
    .map((file) => [file, read(resolve(ws.root, ws.pathFor(file)))]))
  ws.packageCatalog = Object.fromEntries(localeFiles().filter((file) => file.startsWith(`${PACKAGE_I18N}/`))
    .map((file) => [file.slice(PACKAGE_I18N.length + 1, -'.json'.length), parse(ws.original.get(file), ws.pathFor(file))]))
  ws.activePackageKeys = new Set(Object.values(catalogsOf(PACKAGE_I18N, ...packageValues(ws))).flatMap(Object.keys))
  ws.hub = read(resolve(ws.root, HUB))
  return done.map((c) => c.file)
}
