/* global process */
// What an agent can do to a game, as functions of plain data: the tools the MCP server (mcp.js) offers, each a thin
// layer over the kernel (the checks, the operation set, the dependency graph, the vocabulary). None has logic of its
// own: a change is always a changeset (changeset.js). params: each argument's JSON type, '?' when it may be left out.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GAMES } from '../../../games.js'
import { find } from '../schema.js'
import { describe } from '../vocabulary.js'
import { checkGame } from '../checks.js'
import { GAMES_DIR, domainOf, readContent } from '../content-node.js'
import { drawDeps } from '../deps.js'
import { getAt, parsePath, showPath } from './edit.js'
import { OPERATIONS } from './operations.js'
import { hubCount, openGame } from './workspace.js'
import { runChangeset } from './changeset.js'

// The games folder the tools work on: the repository's, or GAMES_ROOT (a copy, for trying changes out).
const ROOT = process.env.GAMES_ROOT ?? GAMES_DIR
const listed = (id) => hubCount(readFileSync(resolve(ROOT, 'games.js'), 'utf8'), id)
const known = (game) => {
  if (!GAMES.some((g) => g.id === game)) throw new Error(`no game ${game}; the games are ${GAMES.map((g) => g.id).join(', ')}`)
  return game
}
const levelIn = (content, level) => content.levels.find((l) => l.id === level) ?? (() => { throw new Error(`${content.id} has no level ${level}`) })()
/** The lines of a check that are about one level (its id first, then a space, a colon or a slash). */
const about = (lines, level) => lines.filter((l) => new RegExp(`^${level.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ :/]`).test(l.text))

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
    about: 'A level (or one board of it) as text: what the player is given and asked, and its boards as blueprint text. SVG and PNG are not drawn headlessly: say so.',
    params: { game: 'string', level: 'string', path: 'string?', format: 'string?' },
    async run({ game, level, path, format = 'text' }) {
      if (format !== 'text') return { rendered: false, note: `${format}: boards and levels are drawn by the browser (React, kit/circuit and the domain’s ui); nothing draws them headlessly yet. Build the game (npm run build:games) and open the level, or ask for format text.` }
      const content = readContent(known(game), ROOT)
      const value = levelIn(content, level)
      const boards = await boardsOf(content, level)
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
