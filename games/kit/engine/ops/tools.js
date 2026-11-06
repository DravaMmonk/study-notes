/* global process */
// What an agent can do to a game, as functions of plain data: the tools the MCP server (mcp.js) offers, each a thin
// layer over the kernel (the checks, the operation set, the dependency graph, the vocabulary). None has logic of its
// own: a change is always a changeset (changeset.js). params: each argument's JSON type, '?' when it may be left out.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { find, shapeAt } from '../schema.js'
import { describe } from '../vocabulary.js'
import { checkGame } from '../checks.js'
import { GAMES_DIR, domainOf, readContent } from '../content-node.js'
import { gameOf } from '../games.mjs'
import { flagsIn, fresh } from '../../shell/progress.js'
import { drawDeps } from '../deps.js'
import { boardSvg } from '../../circuit/svg.js'
import { getAt, parsePath, showPath } from './edit.js'
import { OPERATIONS } from './operations.js'
import { hubCount, openGame } from './workspace.js'
import { adopt, lastUndoable, readLog, runChangeset, undo } from './changeset.js'
import { driftOf, headOf } from './log.js'
import { replaceOps, searchContent } from './search.js'

/** The arguments a call to `tool` lacks. */
export const lacking = (tool, args) => Object.entries(tool.params).filter(([k, spec]) => !spec.endsWith('?') && args?.[k] === undefined).map(([k]) => k)

// The games folder the tools work on: the repository's, or GAMES_ROOT (a copy, for trying changes out), and the games
// its hub list (games.js) names.
const ROOT = process.env.GAMES_ROOT ?? GAMES_DIR
const { GAMES } = await import(pathToFileURL(resolve(ROOT, 'games.js')).href)
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
 * level a domain names, the level file a content problem is in, the level a copy problem's path counts to, the level
 * a blind-play report is on, the levels a course finding lists (`part@level`), or the level the line starts with.
 */
export function levelsOfLine(line, ids) {
  if (line.level) return [line.level]
  const { text } = line
  const file = /^content: levels\/(.+?)\.json/.exec(text)
  if (file) return [file[1]]
  const copy = /^text levels\.(\d+)\b/.exec(text)
  if (copy) return ids[Number(copy[1])] ? [ids[Number(copy[1])]] : []
  const report = /^REPORT [\w-]+: (\S+) /.exec(text)
  if (report) return ids.includes(report[1]) ? [report[1]] : []
  if (/^(OPEN )?course: /.test(text)) return [...new Set([...text.matchAll(/@([^\s,)]+)/g)].map((m) => m[1]).filter((id) => ids.includes(id)))]
  const head = [...ids].sort((a, b) => b.length - a.length).find((id) => new RegExp(`^${escape(id)}[ :/]`).test(text))
  return head ? [head] : []
}

/** A game opened under ROOT: its log, the seq of its last entry (what modify's base names), the change undo would undo next, and the files changed outside the log. */
const logOf = (game) => {
  const ws = openGame(known(game), ROOT)
  return { log: readLog(ws), head: headOf(ws), undoable: lastUndoable(ws)?.seq ?? null, drift: driftOf(ws, ws.onDisk()) }
}

/** A game's content as a changeset would leave it (nothing written; an operation that fails throws its problem). */
async function contentAfter(game, changeset) {
  const r = await runChangeset(openGame(known(game), ROOT), changeset, { write: false, check: false })
  if (!r.content) throw new Error(r.problems.join('; '))
  return r.content
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
    about: 'Apply a changeset { why?, ops: [{ op, …args }] } to a game: every op checked and run, the whole game checked; written only when nothing fails (dryRun: preview only). base: the seq of the log’s last entry the caller saw (preview and log give it as head): refused when the game has changed since. The operations and their arguments: the vocabulary tool.',
    params: { game: 'string', changeset: 'object', dryRun: 'boolean?', base: 'number?' },
    async run({ game, changeset, dryRun = false, base = null }) {
      const r = await runChangeset(openGame(known(game), ROOT), changeset, { write: !dryRun, base })
      return { ok: r.ok, written: r.ok && !dryRun, says: r.says, problems: r.problems, files: r.files, diff: r.diff, undo: r.inverse }
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
    about: 'A level (or one board of it) as text: what the player is given and asked, and its boards as blueprint text; format svg: its boards drawn (../../circuit/svg.js), and its scene where its domain draws one headlessly (draws: whether it does); changeset: as a changeset would leave it. PNG is not drawn.',
    params: { game: 'string', level: 'string', path: 'string?', format: 'string?', changeset: 'object?' },
    async run({ game, level, path, format = 'text', changeset = null }) {
      if (format !== 'text' && format !== 'svg') return { rendered: false, note: `${format}: only text and svg are drawn headlessly; for a picture of the level as played, build the game (npm run build:games) and open it.` }
      const content = changeset ? await contentAfter(game, changeset) : readContent(known(game), ROOT)
      const value = levelIn(content, level)
      const boards = await boardsOf(content, level)
      if (format === 'svg') {
        if (path !== undefined) {
          const board = boards.find((b) => b.path === showPath(parsePath(path)))
          return board ? { svg: boardSvg(board.text, { title: `${level} ${board.path}` }) } : { note: `${level} has no board at ${path}`, boards: boards.map((b) => b.path) }
        }
        const domain = await domainOf(content)
        if (!domain.scene) return { scene: null, draws: false, boards: boards.map((b) => ({ path: b.path, svg: boardSvg(b.text, { title: `${level} ${b.path}` }) })) }
        return { scene: domain.scene(domain.spec(content), level) ?? null, draws: true, boards: boards.map((b) => ({ path: b.path, svg: boardSvg(b.text, { title: `${level} ${b.path}` }) })) }
      }
      if (path !== undefined) {
        const board = boards.find((b) => b.path === showPath(parsePath(path)))
        return board ? { text: board.text } : { text: JSON.stringify(getAt(value, path), null, 2) }
      }
      const pick = (v) => (v && typeof v === 'object' && 'en' in v ? v.en : v)
      // What sort of level it is: its fields that pick one of a few (its kind or mode, its world, its robot…), by its schema.
      const { vocabulary } = await domainOf(content)
      const shape = shapeAt(vocabulary.level, value, [], { vocabulary })
      const picks = Object.entries(shape?.fields ?? {}).filter(([k, s]) => ['oneOf', 'ref'].includes(s.type) && value[k] !== undefined).map(([k]) => k)
      const rows = [
        `${level} · ${pick(value.title)}`,
        ...picks.map((k) => `${k}: ${JSON.stringify(value[k])}`),
        ...(value.brief ? [`brief: ${pick(value.brief)}`] : []),
        ...(value.adds ? [`brings in: ${value.adds.join(', ')}`] : []),
        ...(value.tests ? [`tests: ${JSON.stringify(value.tests).slice(0, 600)}`] : []),
        ...value.tasks.map((task, k) => `task ${k + 1} (${task.id}): ${pick(task.step) ?? ''} ${task.brief ? `— ${pick(task.brief)}` : ''}`),
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
  preview: {
    about: 'A game as a changeset would leave it, nothing written: its content, every line of the check with the levels it is about, each file changed (its text before and after), the operation that failed if one did, and the change log (check false: the content checked against its vocabulary only, which is quick; the whole check runs the domain’s). The studio shows a game through it.',
    params: { game: 'string', changeset: 'object?', check: 'boolean?' },
    async run({ game, changeset = { ops: [] }, check = true }) {
      const r = await runChangeset(openGame(known(game), ROOT), changeset, { write: false, check })
      const { content } = r
      // Copy problems count levels in play order, which only a content that fits its vocabulary has (and only the whole
      // check reports them: a quick preview does without the order).
      const ids = !content ? [] : !check || r.lines.some((l) => l.text.startsWith('content: ')) ? content.levels.map((l) => l.id) : (await domainOf(content)).spec(content).levels.map((l) => l.id)
      return {
        ok: r.ok, says: r.says, problems: r.problems, failed: r.failed, content, order: ids,
        lines: r.lines.map((l) => ({ ...l, levels: levelsOfLine(l, ids) })),
        changes: r.changes, ...logOf(game),
      }
    },
  },
  names: {
    about: 'What a game’s links show, as a changeset would leave it: each level’s label (its number on the map) and title, each part’s name in the components box, each encyclopedia entry’s title; and the names copy may quote rather than link.',
    params: { game: 'string', changeset: 'object?' },
    async run({ game, changeset = null }) {
      const content = changeset ? await contentAfter(game, changeset) : readContent(known(game), ROOT)
      const shown = await gameOf(content)
      const domain = await domainOf(content)
      return {
        levels: shown.levels.map((l) => ({ id: l.id, label: String(shown.levelLabel(l)), title: l.title })),
        parts: (shown.parts?.all ?? []).map((p) => ({ key: p.key, name: p.name })),
        entries: (shown.glossary?.entries ?? []).map((e) => ({ id: e.id, title: e.title })),
        quotes: domain.spec(content).quotes ?? [],
      }
    },
  },
  run_tests: {
    about: 'Run one of a level’s boards (path, default its first task’s reference) on its visible and hidden tests as the level’s screen runs them, through its domain’s play hook (as a changeset would leave it): each test as the screen shows it (what it gives and expects), whether it passes and what the screen says. A level whose play the hook does not cover says why.',
    params: { game: 'string', level: 'string', path: 'string?', changeset: 'object?' },
    async run({ game, level, path = 'tasks[0].solution', changeset = null }) {
      const content = changeset ? await contentAfter(game, changeset) : readContent(known(game), ROOT)
      const lines = getAt(levelIn(content, level), path)
      const domain = await domainOf(content)
      if (!domain.play) return { covered: false, why: `the ${content.domain} domain gives no play hook` }
      if (!Array.isArray(lines)) return { covered: false, why: `${level} has no board at ${path}` }
      const shown = await gameOf(content)
      const at = shown.byId[level]
      const keys = parsePath(path)
      const task = keys[0] === 'tasks' ? keys[1] : 0
      // Every part met before the level is in the tray, as the studio's game plays it (unlock all).
      const progress = { ...fresh(), all: true }
      const ctx = { game: shown, level: { ...at, ...at.tasks[task] }, flags: flagsIn(shown, progress, at, task), progress, solved: false, task, fails: 0 }
      // A hook that cannot open the level without the boards a played session would have built says so.
      let opened
      let r
      try {
        opened = domain.play.open(ctx)
        if (opened.covered === false) return { covered: false, why: opened.why }
        r = domain.play.attempt(ctx, lines.join('\n'))
      } catch (error) {
        return { covered: false, why: `the play hook fails on this level outside a session: ${error.message}` }
      }
      return {
        covered: true, task, pass: Boolean(r.pass), refused: r.refused ?? null, says: r.says ?? [], hidden: r.hidden ?? null,
        tests: (opened.tests ?? []).map((t, k) => ({ label: t.label, shows: t.text, pass: r.tests?.[k]?.pass ?? null, says: r.tests?.[k]?.says ?? null })),
      }
    },
  },
  seed: {
    about: 'What a level’s screen keeps of one of its boards (path, default its first task’s solution), as a changeset would leave it: put data in a save’s progress.data under that task’s id (task: its index in the level) and the level opens on that board.',
    params: { game: 'string', level: 'string', path: 'string?', changeset: 'object?' },
    async run({ game, level, path = 'tasks[0].solution', changeset = { ops: [] } }) {
      const content = await contentAfter(game, changeset)
      const keys = parsePath(path)
      const lines = getAt(levelIn(content, level), keys)
      const domain = await domainOf(content)
      const task = keys[0] === 'tasks' ? keys[1] : null
      const read = (domain.spec(content).blueprints ?? []).filter((b) => b.level === level)
      // The board the domain read from these very lines, else these lines read as the level (its task, where the
      // domain says which) reads its reference.
      const bp = read.find((b) => JSON.stringify(b.write(b.board)) === JSON.stringify(lines))
      const reference = read.filter((b) => !b.naive && (task === null || b.task === undefined || b.task === task)).at(-1)
      if (!bp && !reference) return { note: `${level} has no board its domain reads` }
      const board = bp ? bp.board : reference.read(lines)
      return { data: board, task }
    },
  },
  search: {
    about: 'Find text across a game (as a changeset would leave it): every text pair side by side (never inside a link tag), every board line, the ids of levels and entries. query: { find, regex?, caseSensitive?, word?, sides?: [zh, en], kinds?: [text, board, id] }. The hits in play order, each with its file, level, path and the spans matched.',
    params: { game: 'string', query: 'object', changeset: 'object?' },
    async run({ game, query, changeset = null }) {
      const content = changeset ? await contentAfter(game, changeset) : readContent(known(game), ROOT)
      const hits = searchContent(content, (await domainOf(content)).vocabulary, query)
      return { count: hits.length, hits }
    },
  },
  replace: {
    about: 'Replace across a game as operations, nothing written: the changeset ({ why, ops }: text.set for each text, level.blueprint for each board) that replaces the query’s matches with `with` ($1… for a regex’s groups), each change before and after, and the ids found and left alone (level.rename changes an id). Run it with modify (dryRun first). pick: only these hits (file|path|side or line).',
    params: { game: 'string', query: 'object', with: 'string', pick: 'array?', changeset: 'object?' },
    async run({ game, query, with: replacement, pick = null, changeset = null }) {
      const content = changeset ? await contentAfter(game, changeset) : readContent(known(game), ROOT)
      const { ops, changes, skipped } = replaceOps(content, (await domainOf(content)).vocabulary, query, replacement, pick)
      return { changeset: { why: `replace ${JSON.stringify(query.find)} with ${JSON.stringify(replacement)}`, ops }, changes, skipped: skipped.map((h) => ({ file: h.file, path: showPath(h.path), text: h.text })) }
    },
  },
  history: {
    about: 'A file of a game as git holds it at a revision (default HEAD): a level (level), game.json (file: game.json) or another file of the game folder, read from the repository the games folder is in. A games folder outside git (a GAMES_ROOT copy) says so.',
    params: { game: 'string', level: 'string?', file: 'string?', rev: 'string?' },
    async run({ game, level, file, rev = 'HEAD' }) {
      const dir = resolve(ROOT, known(game))
      const name = level !== undefined ? `levels/${level}.json` : file ?? 'game.json'
      const path = relative(dir, resolve(dir, name))
      if (path.startsWith('..')) throw new Error(`${name} is outside ${game}`)
      let text
      try {
        text = execFileSync('git', ['-C', dir, 'show', `${rev}:./${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      } catch (error) {
        return { found: false, rev, file: name, why: String(error.stderr ?? error.message).trim().split('\n')[0] }
      }
      return { found: true, rev, file: name, text, ...(name.endsWith('.json') && { value: JSON.parse(text) }) }
    },
  },
  log: {
    about: 'A game’s change log (changes.jsonl), oldest first, and the change undo would undo next.',
    params: { game: 'string' },
    async run({ game }) {
      return logOf(game)
    },
  },
  adopt: {
    about: 'Take a game’s files as they are now into its change log, after they were changed outside the operation set (by hand, by git): the log stops reporting them as drift, and an undo goes back no further than this.',
    params: { game: 'string', why: 'string' },
    async run({ game, why }) {
      const ws = openGame(known(game), ROOT)
      return { seq: adopt(ws, why), ...logOf(game) }
    },
  },
  undo: {
    about: 'Undo the last change of a game’s log not undone yet: its inverse run as a changeset, checked, and logged as an undo (dryRun: preview only).',
    params: { game: 'string', dryRun: 'boolean?' },
    async run({ game, dryRun = false }) {
      const r = await undo(openGame(known(game), ROOT), { write: !dryRun })
      return { ok: r.ok, written: r.ok && !dryRun, says: r.says, problems: r.problems, files: r.files, diff: r.diff }
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
