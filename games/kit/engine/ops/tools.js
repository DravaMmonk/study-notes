/* global process */
// What an agent can do to a game, as functions of plain data: the tools the MCP server (mcp.js) offers, each a thin
// layer over the kernel (the checks, the operation set, the dependency graph, the vocabulary). None has logic of its
// own: a change is always a changeset (changeset.js). params: each argument's JSON type, '?' when it may be left out.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { GAMES } from '../../../games.js'
import { find } from '../schema.js'
import { describe } from '../vocabulary.js'
import { checkGame } from '../checks.js'
import { GAMES_DIR, domainOf, readContent } from '../content-node.js'
import { drawDeps } from '../deps.js'
import { boardSvg } from '../../circuit/svg.js'
import { getAt, parsePath, showPath } from './edit.js'
import { OPERATIONS } from './operations.js'
import { hubCount, openGame } from './workspace.js'
import { lastUndoable, readLog, runChangeset, undo } from './changeset.js'

/** The arguments a call to `tool` lacks. */
export const lacking = (tool, args) => Object.entries(tool.params).filter(([k, spec]) => !spec.endsWith('?') && args?.[k] === undefined).map(([k]) => k)

// The games folder the tools work on: the repository's, or GAMES_ROOT (a copy, for trying changes out).
const ROOT = process.env.GAMES_ROOT ?? GAMES_DIR
const listed = (id) => hubCount(readFileSync(resolve(ROOT, 'games.js'), 'utf8'), id)
const known = (game) => {
  if (!GAMES.some((g) => g.id === game)) throw new Error(`no game ${game}; the games are ${GAMES.map((g) => g.id).join(', ')}`)
  return game
}
const levelIn = (content, level) => content.levels.find((l) => l.id === level) ?? (() => { throw new Error(`${content.id} has no level ${level}`) })()
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The lines of a check that are about one level (its id first, then a space, a colon or a slash). */
const about = (lines, level) => lines.filter((l) => new RegExp(`^${escape(level)}[ :/]`).test(l.text))

/**
 * The levels a line of the check is about (`ids`: the levels in play order, as the check's paths count them): the
 * level a domain names, the level file a content problem is in, the level a copy problem's path counts to, the levels
 * a course finding lists (`part@level`), or the level the line starts with.
 */
export function levelsOfLine(line, ids) {
  if (line.level) return [line.level]
  const { text } = line
  const file = /^content: levels\/(.+?)\.json/.exec(text)
  if (file) return [file[1]]
  const copy = /^text levels\.(\d+)\b/.exec(text)
  if (copy) return ids[Number(copy[1])] ? [ids[Number(copy[1])]] : []
  if (/^(OPEN )?course: /.test(text)) return [...new Set([...text.matchAll(/@([^\s,)]+)/g)].map((m) => m[1]).filter((id) => ids.includes(id)))]
  const head = [...ids].sort((a, b) => b.length - a.length).find((id) => new RegExp(`^${escape(id)}[ :/]`).test(text))
  return head ? [head] : []
}

/** A game opened under ROOT, with the change its log would undo next. */
const logOf = (game) => {
  const ws = openGame(known(game), ROOT)
  return { log: readLog(ws), undoable: lastUndoable(ws)?.seq ?? null }
}

/** Every board (blueprint text) a level holds: [{ path, text }]. */
async function boardsOf(content, level) {
  const { vocabulary } = await domainOf(content)
  const { id: _, ...value } = levelIn(content, level)
  return find(vocabulary.level, value, 'board', { vocabulary }).map((b) => ({ path: showPath(b.path), text: b.value.join('\n') }))
}

export const TOOLS = {
  audit: {
    about: 'Check a game as npm run check does: content against its vocabulary, the course audit, copy, and its domain’s checks (reference answers pass, naive ones fail).',
    params: { game: 'string' },
    async run({ game }) {
      const content = readContent(known(game), ROOT)
      const lines = await checkGame(content, { domain: await domainOf(content), listed: listed(game) })
      return { ok: !lines.some((l) => l.fail), failures: lines.filter((l) => l.fail).map((l) => l.text), lines: lines.map((l) => `${l.fail ? 'FAIL ' : ''}${l.text}`) }
    },
  },
  modify: {
    about: 'Apply a changeset { why?, ops: [{ op, …args }] } to a game: every op checked and run, the save migration generated, the whole game checked; written only when nothing fails (dryRun: preview only). The operations and their arguments: the vocabulary tool.',
    params: { game: 'string', changeset: 'object', dryRun: 'boolean?' },
    async run({ game, changeset, dryRun = false }) {
      const r = await runChangeset(openGame(known(game), ROOT), changeset, { write: !dryRun })
      return { ok: r.ok, written: r.ok && !dryRun, says: r.says, problems: r.problems, migration: r.step, files: r.files, diff: r.diff, undo: r.inverse, notes: r.notes }
    },
  },
  run_reference: {
    about: 'Run a level’s reference and naive answers against its tests through its domain’s checks; the lines that name the level, and whether any fails.',
    params: { game: 'string', level: 'string' },
    async run({ game, level }) {
      const content = readContent(known(game), ROOT)
      levelIn(content, level)
      const domain = await domainOf(content)
      const lines = await domain.validate(domain.spec(content))
      const mine = about(lines, level)
      return { ok: !mine.some((l) => l.fail), lines: mine.map((l) => `${l.fail ? 'FAIL ' : ''}${l.text}`), ...(mine.length ? {} : { note: 'no line names this level: this domain reports a level only when it fails' }) }
    },
  },
  blueprint: {
    about: 'Read a level’s boards (its reference answer, naive answer, presets…) as blueprint text; with text, write the board at path (default solution) through the level.blueprint operation (dryRun: preview only).',
    params: { game: 'string', level: 'string', path: 'string?', text: 'string?', dryRun: 'boolean?' },
    async run({ game, level, path, text, dryRun = false }) {
      if (text === undefined) {
        const boards = await boardsOf(readContent(known(game), ROOT), level)
        return path === undefined ? { boards } : boards.find((b) => b.path === showPath(parsePath(path))) ?? { note: `${level} has no board at ${path}`, boards: boards.map((b) => b.path) }
      }
      return TOOLS.modify.run({ game, dryRun, changeset: { ops: [{ op: 'level.blueprint', level, ...(path !== undefined && { path }), text }] } })
    },
  },
  render: {
    about: 'A level (or one board of it) as text: what the player is given and asked, and its boards as blueprint text; format svg: its boards drawn (../../circuit/svg.js), and its scene where its domain draws one headlessly. PNG is not drawn.',
    params: { game: 'string', level: 'string', path: 'string?', format: 'string?' },
    async run({ game, level, path, format = 'text' }) {
      if (format !== 'text' && format !== 'svg') return { rendered: false, note: `${format}: only text and svg are drawn headlessly; for a picture of the level as played, build the game (npm run build:games) and open it.` }
      const content = readContent(known(game), ROOT)
      const value = levelIn(content, level)
      const boards = await boardsOf(content, level)
      if (format === 'svg') {
        if (path !== undefined) {
          const board = boards.find((b) => b.path === showPath(parsePath(path)))
          return board ? { svg: boardSvg(board.text, { title: `${level} ${board.path}` }) } : { note: `${level} has no board at ${path}`, boards: boards.map((b) => b.path) }
        }
        const domain = await domainOf(content)
        return { scene: domain.scene?.(domain.spec(content), level) ?? null, boards: boards.map((b) => ({ path: b.path, svg: boardSvg(b.text, { title: `${level} ${b.path}` }) })) }
      }
      if (path !== undefined) {
        const board = boards.find((b) => b.path === showPath(parsePath(path)))
        return board ? { text: board.text } : { text: JSON.stringify(getAt(value, path), null, 2) }
      }
      const pick = (v) => (v && typeof v === 'object' && 'en' in v ? v.en : v)
      const rows = [
        `${level} · ${pick(value.title)}`,
        ...['kind', 'mode', 'world', 'robot'].filter((k) => value[k] !== undefined).map((k) => `${k}: ${JSON.stringify(value[k])}`),
        ...(value.brief ? [`brief: ${pick(value.brief)}`] : []),
        ...(value.adds ? [`brings in: ${value.adds.join(', ')}`] : []),
        ...(value.tests ? [`tests: ${JSON.stringify(value.tests).slice(0, 600)}`] : []),
        ...(value.tasks ? value.tasks.map((task, k) => `task ${k + 1}: ${pick(task.step) ?? ''} ${task.brief ? `— ${pick(task.brief)}` : ''}`) : []),
        ...boards.flatMap((b) => ['', `${b.path}:`, ...b.text.split('\n').map((l) => `  ${l}`)]),
      ]
      return { text: rows.join('\n') }
    },
  },
  deps: {
    about: 'A game’s part dependency graph as Mermaid (dot: DOT), drawn from its course data; levels: draw the levels too.',
    params: { game: 'string', dot: 'boolean?', levels: 'boolean?' },
    async run({ game, dot = false, levels = false }) {
      return { text: await drawDeps(readContent(known(game), ROOT), { dot, levels }) }
    },
  },
  migrate_diff: {
    about: 'The save migration step a changeset would add to game.json (nothing is written, the game is not checked as a whole).',
    params: { game: 'string', changeset: 'object' },
    async run({ game, changeset }) {
      const r = await runChangeset(openGame(known(game), ROOT), changeset, { write: false, check: false })
      return { migration: r.step, says: r.says, problems: r.problems, notes: r.notes }
    },
  },
  preview: {
    about: 'A game as a changeset would leave it, nothing written: its content, every line of the check with the levels it is about, the save step, each file changed (its text before and after), the operation that failed if one did, and the change log. The studio shows a game through it.',
    params: { game: 'string', changeset: 'object?' },
    async run({ game, changeset = { ops: [] } }) {
      const r = await runChangeset(openGame(known(game), ROOT), changeset, { write: false })
      const { content } = r
      // Copy problems count levels in play order, which only a content that fits its vocabulary has.
      const ids = !content ? [] : r.lines.some((l) => l.text.startsWith('content: ')) ? content.levels.map((l) => l.id) : (await domainOf(content)).spec(content).levels.map((l) => l.id)
      return {
        ok: r.ok, says: r.says, problems: r.problems, failed: r.failed, content, order: ids,
        lines: r.lines.map((l) => ({ ...l, levels: levelsOfLine(l, ids) })),
        migration: r.step, changes: r.changes, notes: r.notes, ...logOf(game),
      }
    },
  },
  seed: {
    about: 'What a level’s screen keeps of one of its boards (path, default solution), as a changeset would leave it: put data in a save’s progress.data[level] (a level of tasks: at index task) and the level opens on that board.',
    params: { game: 'string', level: 'string', path: 'string?', changeset: 'object?' },
    async run({ game, level, path = 'solution', changeset = { ops: [] } }) {
      const r = await runChangeset(openGame(known(game), ROOT), changeset, { write: false, check: false })
      if (!r.content) return { problems: r.problems }
      const keys = parsePath(path)
      const lines = getAt(levelIn(r.content, level), keys)
      const domain = await domainOf(r.content)
      const read = (domain.spec(r.content).blueprints ?? []).filter((b) => b.level === level)
      // The board the domain read from these very lines, else these lines read as the level reads its reference.
      const bp = read.find((b) => JSON.stringify(b.write(b.board)) === JSON.stringify(lines))
      const reference = read.filter((b) => !b.naive).at(-1)
      if (!bp && !reference) return { note: `${level} has no board its domain reads` }
      const board = bp ? bp.board : reference.read(lines)
      return { data: ((bp ?? reference).save ?? ((b) => b))(board), task: keys[0] === 'tasks' ? keys[1] : null }
    },
  },
  log: {
    about: 'A game’s change log (changes.jsonl), oldest first, and the change undo would undo next.',
    params: { game: 'string' },
    async run({ game }) {
      return logOf(game)
    },
  },
  undo: {
    about: 'Undo the last change of a game’s log not undone yet: its inverse run as a changeset, checked, and logged as an undo (dryRun: preview only).',
    params: { game: 'string', dryRun: 'boolean?' },
    async run({ game, dryRun = false }) {
      const r = await undo(openGame(known(game), ROOT), { write: !dryRun })
      return { ok: r.ok, written: r.ok && !dryRun, says: r.says, problems: r.problems, migration: r.step, files: r.files, diff: r.diff, notes: r.notes }
    },
  },
  playtests: {
    about: 'A game’s blind-play records (games/<game>/playtests/*.json), as written.',
    params: { game: 'string' },
    async run({ game }) {
      const dir = resolve(ROOT, known(game), 'playtests')
      const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []
      return { records: files.map((file) => ({ file, ...JSON.parse(readFileSync(resolve(dir, file), 'utf8')) })) }
    },
  },
  vocabulary: {
    about: 'What content may be made of: a game’s domain vocabulary as data (kinds, items, schemas of game.json and a level), and the operations with their arguments.',
    params: { game: 'string' },
    async run({ game }) {
      const content = readContent(known(game), ROOT)
      return {
        domain: content.domain,
        vocabulary: describe((await domainOf(content)).vocabulary),
        operations: Object.fromEntries(Object.entries(OPERATIONS).map(([name, op]) => [name, { about: op.about, params: op.params }])),
      }
    },
  },
}
