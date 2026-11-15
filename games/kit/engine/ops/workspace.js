// A data game's files opened for operations (./operations.js): game.json, glossary.json, levels/<id>.json, pieces.json
// (when the game has one; a domain that defines parts as data always gives one) and the
// course blueprint (blueprint.json, when the game has one or an operation writes one) as values an operation replaces
// (never mutates), the text each file had, and the hub's level count for the game
// (games/games.js). Nothing reaches the disk until write(); diff() previews it.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { assemble, deepFreeze } from '../content.js'
import { PROJECT_DIR, gameDirectory, levelFiles, splitGameConfig } from '../content-node.js'
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
const hubEntry = (id) => new RegExp(`(id: '${id.replace(/[-]/g, '\\-')}'[\\s\\S]*?\\blevels: )(\\d+)`)
/** How many levels the hub's list (games.js) says game `id` has, or null when it does not list it. */
export const hubCount = (text, id) => (text?.match(hubEntry(id)) ? Number(text.match(hubEntry(id))[2]) : null)

/** Open a course and its package for author operations. */
export function openGame(id, root = PROJECT_DIR) {
  const dir = gameDirectory(id, root)
  const config = resolve(dir, 'game.json')
  if (!existsSync(config)) throw new Error(`no data game ${id} in ${root}`)
  const original = new Map([['game.json', read(config)]])
  const { game, packageId, packageDir } = splitGameConfig(parse(original.get('game.json'), config), root)
  const pathFor = (file) => {
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
  const ws = {
    id,
    root,
    dir,
    packageId,
    packageDir,
    pathFor,
    game,
    glossary: load('glossary.json'),
    blueprint: load('blueprint.json', true),
    partDefs: load('pieces.json', true),
    levels: new Map(levels().map((levelId) => [levelId, load(`levels/${levelId}.json`)])),
    original,
    // A file that takes over another's content (a level renamed) is laid out like the text it came from.
    basis: new Map(),
    hub: read(resolve(root, HUB)),
  }
  return Object.assign(ws, {
    /** The game as one content (../content.js), frozen: the operations put new values in, nothing writes into one. */
    content: () => deepFreeze(assemble({ id, game: ws.game, glossary: ws.glossary, partDefs: ws.partDefs, levels: [...ws.levels], blueprint: ws.blueprint })),
    /** What the files hold now, by name; a removed level file is null. */
    snapshot: () => ({ game: ws.game, glossary: ws.glossary, partDefs: ws.partDefs, blueprint: ws.blueprint, levels: new Map(ws.levels), basis: new Map(ws.basis) }),
    restore: (s) => Object.assign(ws, { game: s.game, glossary: s.glossary, partDefs: s.partDefs, blueprint: s.blueprint, levels: new Map(s.levels), basis: new Map(s.basis) }),
    /** Every file whose text changes: [{ file, before, after }] (before null: a new file; after null: removed). */
    changes: () => changes(ws),
    /** The changes as a unified diff. */
    diff: () => ws.changes().map((c) => unified(c.file, c.before, c.after)).join('\n'),
    write: () => write(ws),
    /** The course and package files, keyed by their project-relative paths. */
    onDisk: () => new Map([...new Set([...fileNames(levels()), ...ws.original.keys()])]
      .map((file) => [pathFor(file), onDisk(file)])),
  })
}

const fileNames = (levels) => ['game.json', 'glossary.json', 'pieces.json', 'blueprint.json', ...[...levels].map((id) => `levels/${id}.json`)]

function changes(ws) {
  const out = []
  const now = new Map([['game.json', { package: ws.packageId, ...ws.game }], ['glossary.json', ws.glossary], ...(ws.partDefs === undefined ? [] : [['pieces.json', ws.partDefs]]), ...(ws.blueprint === undefined ? [] : [['blueprint.json', ws.blueprint]]), ...[...ws.levels].map(([id, level]) => [`levels/${id}.json`, level])])
  for (const [file, value] of now) {
    const before = ws.original.get(file) ?? null
    const after = writeJson(value, before ?? ws.basis.get(file) ?? null)
    if (after !== before) out.push({ file: ws.pathFor(file), before, after })
  }
  for (const [file, before] of ws.original) if (!now.has(file) && before !== null) out.push({ file: ws.pathFor(file), before, after: null })
  const listed = hubCount(ws.hub, ws.id)
  if (listed !== null && listed !== ws.levels.size) out.push({ file: HUB, before: ws.hub, after: ws.hub.replace(hubEntry(ws.id), `$1${ws.levels.size}`) })
  return out
}

function write(ws) {
  const done = ws.changes()
  // A file changed on disk since it was opened is not written over: the change was made against another text.
  const config = ws.pathFor('game.json')
  const expected = new Map([[config, ws.original.get('game.json')], ...done.map(({ file, before }) => [file, before])])
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
  ws.original = new Map(fileNames(ws.levels.keys()).map((file) => [file, read(resolve(ws.root, ws.pathFor(file)))]))
  ws.hub = read(resolve(ws.root, HUB))
  return done.map((c) => c.file)
}
