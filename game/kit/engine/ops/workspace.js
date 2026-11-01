// A data game's files opened for operations (./operations.js): game.json, glossary.json, levels/<id>.json and the
// course blueprint (blueprint.json, when the game has one or an operation writes one) as values an operation replaces
// (never mutates), the text each file had, and the hub's level count for the game
// (games/games.js). Nothing reaches the disk until write(); diff() previews it.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { assemble } from '../content.js'
import { GAMES_DIR, levelFiles } from '../content-node.js'
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

const HUB = 'games.js'
const hubEntry = (id) => new RegExp(`(id: '${id.replace(/[-]/g, '\\-')}'[\\s\\S]*?\\blevels: )(\\d+)`)
/** How many levels the hub's list (games.js) says game `id` has, or null when it does not list it. */
export const hubCount = (text, id) => (text?.match(hubEntry(id)) ? Number(text.match(hubEntry(id))[2]) : null)

/** Game `id` under `root` (the games folder) opened: { id, root, game, glossary, levels: Map, … }. */
export function openGame(id, root = GAMES_DIR) {
  const dir = resolve(root, id)
  if (!existsSync(resolve(dir, 'game.json'))) throw new Error(`no data game ${id} in ${root}`)
  const original = new Map()
  const load = (file) => {
    const text = read(resolve(dir, file))
    original.set(file, text)
    return parse(text, `${id}/${file}`)
  }
  const ws = {
    id,
    root,
    dir,
    game: load('game.json'),
    glossary: load('glossary.json'),
    blueprint: existsSync(resolve(dir, 'blueprint.json')) ? load('blueprint.json') : undefined,
    levels: new Map(levelFiles(id, root).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([levelId]) => [levelId, load(`levels/${levelId}.json`)])),
    original,
    // A file that takes over another's content (a level renamed) is laid out like the text it came from.
    basis: new Map(),
    hub: read(resolve(root, HUB)),
  }
  return Object.assign(ws, {
    /** The game as one content (../content.js). */
    content: () => assemble({ id, game: ws.game, glossary: ws.glossary, levels: [...ws.levels], blueprint: ws.blueprint }),
    /** What the files hold now, by name; a removed level file is null. */
    snapshot: () => ({ game: ws.game, glossary: ws.glossary, blueprint: ws.blueprint, levels: new Map(ws.levels), basis: new Map(ws.basis) }),
    restore: (s) => Object.assign(ws, { game: s.game, glossary: s.glossary, blueprint: s.blueprint, levels: new Map(s.levels), basis: new Map(s.basis) }),
    /** Every file whose text changes: [{ file, before, after }] (before null: a new file; after null: removed). */
    changes: () => changes(ws),
    /** The changes as a unified diff. */
    diff: () => ws.changes().map((c) => unified(c.file, c.before, c.after)).join('\n'),
    write: () => write(ws),
  })
}

const fileNames = (ws) => ['game.json', 'glossary.json', 'blueprint.json', ...[...ws.levels.keys()].map((id) => `levels/${id}.json`)]

function changes(ws) {
  const out = []
  const now = new Map([['game.json', ws.game], ['glossary.json', ws.glossary], ...(ws.blueprint === undefined ? [] : [['blueprint.json', ws.blueprint]]), ...[...ws.levels].map(([id, level]) => [`levels/${id}.json`, level])])
  for (const [file, value] of now) {
    const before = ws.original.get(file) ?? null
    const after = writeJson(value, before ?? ws.basis.get(file) ?? null)
    if (after !== before) out.push({ file: `${ws.id}/${file}`, before, after })
  }
  for (const [file, before] of ws.original) if (!now.has(file) && before !== null) out.push({ file: `${ws.id}/${file}`, before, after: null })
  const listed = hubCount(ws.hub, ws.id)
  if (listed !== null && listed !== ws.levels.size) out.push({ file: HUB, before: ws.hub, after: ws.hub.replace(hubEntry(ws.id), `$1${ws.levels.size}`) })
  return out
}

function write(ws) {
  const done = ws.changes()
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
  ws.original = new Map(fileNames(ws).map((file) => [file, read(resolve(ws.dir, file))]))
  ws.hub = read(resolve(ws.root, HUB))
  return done.map((c) => c.file)
}
