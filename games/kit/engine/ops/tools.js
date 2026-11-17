import { tagName } from '../tag-identity.js'
import { packageLevel, packageLevelOrder } from '../package-play.js'
import { runtimeIds } from '../runtime.js'
// What an agent can do to a game, as functions of plain data: the tools the MCP server (mcp.js) offers, each a thin
// layer over the kernel (the checks, the operation set, the dependency graph, the vocabulary). None has logic of its
// own: a change is always a changeset (changeset.js). params: each argument's JSON type, '?' when it may be left out.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, relative, resolve } from 'node:path'
import { find, shapeAt } from '../schema.js'
import { describe } from '../vocabulary.js'
import { checkGame } from '../checks.js'
import { checkCache } from '../check-cache.js'
import { catalogReader } from '../catalogs.js'
import { visibleOverrides } from '../layers.js'
import { workspaceCheckCache, contentRoot, runtimeOf, isDataGame, readContent, readPackage, packageIds, resolveLayers, contentTargets, gameDirectory } from '../resolver.js'
import { gameOnPackage } from '../scaffold.js'
import { gameOf } from '../games.mjs'
import { partFlow } from '../flow.js'
import { fresh } from '../../shell/progress.js'
import { taskContext } from '../../shell/played-task.js'
import { drawDeps } from '../deps.js'
import { boardSvg } from '../../circuit/svg.js'
import { getAt, parsePath, showPath } from './edit.js'
import { objectOf, courseRoute } from '../objects.js'
import { OPERATIONS } from './operations.js'
import { hubCount, openGame, openPackage } from './workspace.js'
import { adopt, lastUndoable, readLog, runChangeset, undo } from './changeset.js'
import { driftOf, headOf } from './log.js'
import { replaceOps, searchContent } from './search.js'

/** The arguments a call to `tool` lacks. */
export const lacking = (tool, args) => [
  ...Object.entries(tool.params).filter(([k, spec]) => !spec.endsWith('?') && args?.[k] === undefined).map(([k]) => k),
  ...(tool.params.package && !args?.game && !args?.package ? ['game or package'] : []),
]

// The tools use the repository layout, or a copy with games/ and packages/ under GAMES_ROOT.
const ROOT = contentRoot()
const listed = (id) => typeof id === 'object' ? null : hubCount(readFileSync(resolve(gameDirectory('', ROOT), 'games.js'), 'utf8'), id)
// The repository's games keep their checks between calls (../check-cache.js); a copy of them (GAMES_ROOT) is checked afresh.
const kept = (id) => (!workspaceCheckCache() || typeof id === 'object' ? null : checkCache(id))
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
// A game the studio's game workspace makes is known at once: it is read off the folder, not off the list loaded at start.
const dataGames = () => contentTargets([], ROOT, { game: true }).map(target => target.id)
const known = (game) => {
  if (typeof game === 'object' && game.package) {
    if (!packageIds(ROOT).includes(game.package)) throw new Error(`no package ${game.package}`)
    return game
  }
  if (!isDataGame(game, ROOT)) throw new Error(`no game ${game}; the games are ${dataGames().join(', ')}`)
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
const logOf = (game, scope, layer) => {
  const ws = open(game, scope, layer)
  return { log: readLog(ws), head: headOf(ws), undoable: lastUndoable(ws)?.seq ?? null, drift: driftOf(ws, ws.onDisk()) }
}

// A game target edits its game layer. A package target reads objects and edits only its package layer.
const SCOPES = ['package', 'game']
const scoped = (scope) => {
  if (scope !== undefined && !SCOPES.includes(scope)) throw new Error(`scope is ${SCOPES.join(' or ')}, not ${scope}`)
  return scope ?? null
}
const open = (game, scope, layer) => {
  const selected = scoped(scope)
  if (typeof known(game) !== 'object') return openGame(game, ROOT, { scope: selected, layer })
  if (selected === 'game') throw new Error('a package target uses the package workspace')
  return openPackage(game.package, ROOT, { layer })
}
const readTarget = (game) => typeof known(game) === 'object' ? readPackage(game.package, ROOT) : readContent(game, ROOT)
const readAs = (game, scope) => scoped(scope) === 'package' ? open(game, scope).content() : readTarget(game)

/** A game's content as a changeset would leave it (nothing written; an operation that fails throws its problem). */
async function contentAfter(game, changeset, scope, layer) {
  if (!changeset && !layer) return readAs(game, scope)
  const r = await runChangeset(open(game, scope, layer), changeset ?? { ops: [] }, { write: false, check: false })
  if (!r.content) throw new Error(r.problems.join('; '))
  return r.content
}

/** The board at a content path and the task whose rules it uses. */
function boardAt(content, level, path, vocabulary) {
  const value = levelIn(content, level)
  const keys = parsePath(path)
  if (shapeAt(vocabulary.level, value, keys, { vocabulary })?.type !== 'board') return null
  const lines = getAt(value, keys)
  if (!Array.isArray(lines) || !lines.every((line) => typeof line === 'string')) return null
  return { lines, task: keys[0] === 'tasks' ? Number(keys[1]) : 0 }
}

/** Every board (blueprint text) a level holds: [{ path, text }]. */
async function boardsOf(content, level) {
  const { vocabulary } = await runtimeOf(content)
  const { id: _, ...value } = levelIn(content, level)
  return find(vocabulary.level, value, 'board', { vocabulary }).map((b) => ({ path: showPath(b.path), text: b.value.join('\n') }))
}

const tools = {
  packages: {
    about: 'List installed packages and their direct dependencies, including libraries without games.',
    params: {},
    async run() {
      return Promise.all(packageIds(ROOT).map(async (id) => {
        const resolved = resolveLayers({ package: id, closure: true, root: ROOT })
        const layer = resolved.layers.find(layer => layer.id === id)
        const { packageCompatibility } = await import('../releases.js')
        return { id, ...layer.config, manifest: layer.manifest, lock: resolved.lock, lockStatus: resolved.lockStatus, compatibility: packageCompatibility(id, ROOT) }
      }))
    },
  },
  overrides: {
    about: 'List every override visible at a layer, with object kind, full name, author and before/after values, optionally after a pending changeset.',
    params: { game: 'string', layer: 'string?', changeset: 'object?' },
    async run({ game, layer, changeset = null }) {
      const content = await contentAfter(game, changeset, null, layer)
      return { overrides: visibleOverrides(content, layer), sources: content.sources }
    },
  },
  objects: {
    about: 'Read registered tags, relations or sections and the expanded course route, optionally after a pending changeset.',
    params: { game: 'string', kind: 'string?', name: 'string?', member: 'string?', changeset: 'object?', scope: 'string?' },
    async run({ game, kind, name, member, changeset = null, scope }) {
      const content = await contentAfter(game, changeset, scope)
      if (kind && !Object.hasOwn(content.registries, kind)) throw new Error(`unknown object kind ${kind}`)
      return { objects: name ? objectOf(content, kind, name, member) : kind ? content.registries[kind] : content.registries, route: courseRoute(content) }
    },
  },
  games: {
    about: 'The data games: each one’s id, title and the content package it plays (several may play one package).',
    params: {},
    async run() {
      return dataGames().map((id) => {
        const content = readContent(id, ROOT)
        const resolved = resolveLayers({ game: id, root: ROOT })
        return { id, title: content.title, package: resolved.packageId, kernel: resolved.files['game.json'].kernel, packages: resolved.packageRanges, lock: resolved.lock, lockStatus: resolved.lockStatus }
      })
    },
  },
  create_game: {
    about: 'Make a new game on the package an existing game (`from`) plays: games/<id>/ with its own course, keeping from’s course settings and starting with one empty chapter shaped like its first, registered on the hub as hidden and in development.',
    params: { id: 'string', from: 'string', title: 'object' },
    async run({ id, from, title }) {
      gameOnPackage({ root: ROOT, id, from: known(from), title })
      return { id, ...logOf(id) }
    },
  },
  audit: {
    about: 'Check a game as npm run check does: content against its vocabulary, the course audit, copy, and its domain’s checks (reference answers pass, naive ones fail). mutants: also, for each circuit task, how many small mistakes made to its reference answer the tests catch, and those they let pass (slow; a mutant left alive is a board the tests do not rule out, or another right answer).',
    params: { game: 'string', mutants: 'boolean?' },
    async run({ game, mutants = false }) {
      const content = readTarget(game)
      const lines = await checkGame(content, { domain: await runtimeOf(content), listed: listed(game), mutants, cache: kept(game), root: ROOT })
      return { ok: !lines.some((l) => l.fail), failures: lines.filter((l) => l.fail).map((l) => l.text), lines: lines.map((l) => `${l.fail ? 'FAIL ' : ''}${l.text}`) }
    },
  },
  modify: {
    about: 'Apply a changeset { why?, by?, ops: [{ op, …args }] } to a game (by: who makes it, e.g. agent:<step>:<model>; the change log keeps it): every op checked and run, the whole game checked; written only when nothing fails (dryRun: preview only). base: the seq of the log’s last entry the caller saw (preview and log give it as head): refused when the game has changed since. The operations and their arguments: the vocabulary tool.',
    params: { game: 'string', changeset: 'object', dryRun: 'boolean?', base: 'number?', scope: 'string?', layer: 'string?' },
    async run({ game, changeset, dryRun = false, base = null, scope, layer }) {
      const r = await runChangeset(open(game, scope, layer), changeset, { write: !dryRun, base, cache: kept(game) })
      return { ok: r.ok, written: r.ok && !dryRun, says: r.says, problems: r.problems, files: r.files, diff: r.diff, undo: r.inverse }
    },
  },
  run_reference: {
    about: 'Run a level’s reference and naive answers against its tests through its domain’s checks; the lines that name the level, and whether any fails.',
    params: { game: 'string', level: 'string' },
    async run({ game, level }) {
      const source = readTarget(game)
      const content = source.packageTarget ? packageLevel(source, level) : source
      levelIn(content, level)
      const domain = await runtimeOf(content)
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
        const boards = await boardsOf(readTarget(game), level)
        return path === undefined ? { boards } : boards.find((b) => b.path === showPath(parsePath(path))) ?? { note: `${level} has no board at ${path}`, boards: boards.map((b) => b.path) }
      }
      return TOOLS.modify.run({ game, dryRun, changeset: { ops: [{ op: 'level.blueprint', level, ...(path !== undefined && { path }), text }] } })
    },
  },
  render: {
    about: 'A level (or one board of it) as text: what the player is given and asked, and its boards as blueprint text; format svg: its boards drawn (../../circuit/svg.js), changeset: as a changeset would leave it. PNG is not drawn.',
    params: { game: 'string', level: 'string', path: 'string?', format: 'string?', changeset: 'object?' },
    async run({ game, level, path, format = 'text', changeset = null }) {
      if (format !== 'text' && format !== 'svg') return { rendered: false, note: `${format}: only text and svg are drawn headlessly; for a picture of the level as played, build the game (npm run build:games) and open it.` }
      const content = await contentAfter(game, changeset)
      const value = levelIn(content, level)
      const boards = await boardsOf(content, level)
      if (format === 'svg') {
        if (path !== undefined) {
          const board = boards.find((b) => b.path === showPath(parsePath(path)))
          return board ? { svg: boardSvg(board.text, { title: `${level} ${board.path}` }) } : { note: `${level} has no board at ${path}`, boards: boards.map((b) => b.path) }
        }
        return { boards: boards.map((b) => ({ path: b.path, svg: boardSvg(b.text, { title: `${level} ${b.path}` }) })) }
      }
      if (path !== undefined) {
        const board = boards.find((b) => b.path === showPath(parsePath(path)))
        return board ? { text: board.text } : { text: JSON.stringify(getAt(value, path), null, 2) }
      }
      const pick = (v) => (v && typeof v === 'object' && 'en' in v ? v.en : v)
      // What sort of level it is: its fields that pick one of a few (its kind or mode, its world, its robot…), by its schema.
      const { vocabulary } = await runtimeOf(content)
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
      const content = readTarget(game)
      if (content.packageTarget) throw new Error('a package has no course dependency graph; read its relations with objects')
      return { text: await drawDeps(content, { dot, levels }) }
    },
  },
  play_level: {
    about: 'Open one package level without chapters, prerequisites or progress. Returns runtime shell content for GameFrame; never checked as a course.',
    params: { package: 'string', level: 'string', changeset: 'object?' },
    async run({ package: id, level, changeset = null }) {
      const source = await contentAfter({ package: id }, changeset)
      return { content: packageLevel(source, level) }
    },
  },
  preview: {
    about: 'A game as a changeset would leave it, nothing written: its content, every line of the check with the levels it is about, each file changed (its text before and after), the operation that failed if one did, and the change log (check false: the content checked against its vocabulary only, which is quick; the whole check runs the domain’s). The studio shows a game through it.',
    params: { game: 'string', changeset: 'object?', check: 'boolean?', scope: 'string?', layer: 'string?' },
    async run({ game, changeset = { ops: [] }, check = true, scope, layer }) {
      const r = await runChangeset(open(game, scope, layer), changeset, { write: false, check, cache: kept(game) })
      const { content } = r
      // Copy problems count levels in play order, which only a content that fits its vocabulary has (and only the whole
      // check reports them: a quick preview does without the order).
      const ids = !content ? [] : content.packageTarget ? packageLevelOrder(content) : !check || r.lines.some((l) => l.text.startsWith('content: ')) ? content.levels.map((l) => l.id) : (await runtimeOf(content)).spec(content).levels.map((l) => l.id)
      return {
        ok: r.ok, says: r.says, problems: r.problems, failed: r.failed, content, order: ids,
        lines: r.lines.map((l) => ({ ...l, levels: levelsOfLine(l, ids) })),
        changes: r.changes, ...logOf(game, scope, layer),
      }
    },
  },
  flow: {
    about: 'A part’s way through a game’s course (as a changeset would leave it), read off the course, in course order: where it is at hand from the start, where a level brings it in, where a level or one of its tasks gives it there only or withholds it, where a part superseding it arrives, and each step of its upgrade chains (the task whose work runs inside it, with its form). Each event names the level, the task (an index) and the path of the field in the level’s content that says it (null: none).',
    params: { game: 'string', part: 'string', changeset: 'object?', scope: 'string?' },
    async run({ game, part, changeset = null, scope }) {
      const content = await contentAfter(game, changeset, scope)
      if (content.packageTarget) return { events: [] }
      const domain = await runtimeOf(content)
      return { events: partFlow(domain.spec(content).course, content, part) }
    },
  },
  names: {
    about: 'What a game’s links show, as a changeset would leave it: each level’s label (its number on the map) and title, each part’s name in the components box (with the part it is and the level that first gives it), each encyclopedia entry’s title; and the names copy may quote rather than link.',
    params: { game: 'string', changeset: 'object?', scope: 'string?' },
    async run({ game, changeset = null, scope }) {
      const content = await contentAfter(game, changeset, scope)
      const tags = Object.entries(content.registries.tag).map(([key, tag]) => ({ key, name: tagName(key), member: tag.kind }))
      if (content.packageTarget) return {
        tags,
        levels: packageLevelOrder(content).map(id => ({ id, label: id, title: levelIn(content, id).title })),
        parts: Object.entries(content.partDefs?.parts ?? {}).map(([key, p]) => ({ key, name: p.name, part: key, at: null })),
        entries: content.glossary.entries.map(e => ({ id: e.id, title: e.title })), quotes: [],
      }
      const shown = await gameOf(content)
      const domain = await runtimeOf(content)
      return {
        tags,
        levels: shown.levels.map((l) => ({ id: l.id, label: String(shown.levelLabel(l)), title: l.title })),
        // Each with the part it is (its type in parts/<name>.json) and the level that first gives it: a primitive's first level
        // bringing it in, a built one's level earning its flag.
        parts: (shown.parts?.all ?? []).map((p) => ({ key: p.key, name: p.name, part: p.part ?? (p.key.startsWith('part:') ? p.key.slice(5) : p.key), at: p.at?.[0] ?? shown.levels.find((l) => (l.unlocks ?? []).includes(p.key))?.id ?? null })),
        entries: (shown.glossary?.entries ?? []).map((e) => ({ id: e.id, title: e.title })),
        quotes: domain.spec(content).quotes ?? [],
      }
    },
  },
  run_tests: {
    about: 'Run one of a level’s boards (path, default its first task’s reference) on its visible and hidden tests as the level’s screen runs them, through its domain’s play hook (as a changeset would leave it): each test as the screen shows it (what it gives and expects), whether it passes and what the screen says. A level whose play the hook does not cover says why.',
    params: { game: 'string', level: 'string', path: 'string?', changeset: 'object?', scope: 'string?' },
    async run({ game, level, path = 'tasks[0].solution', changeset = null, scope }) {
      const source = await contentAfter(game, changeset, scope)
      const content = source.packageTarget ? packageLevel(source, level) : source
      const domain = await runtimeOf(content)
      if (!domain.play) return { covered: false, why: 'the selected runtime gives no play hook' }
      const board = boardAt(content, level, path, domain.vocabulary)
      if (!board) return { covered: false, why: `${level} has no board at ${path}` }
      const { lines, task } = board
      const shown = await gameOf(content)
      const at = shown.byId[level]
      // Every part met before the level is in the tray, as the studio's game plays it (unlock all).
      const progress = { ...fresh(), all: true }
      const ctx = taskContext(shown, progress, at, task)
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
    params: { game: 'string', level: 'string', path: 'string?', changeset: 'object?', scope: 'string?' },
    async run({ game, level, path = 'tasks[0].solution', changeset = null, scope }) {
      const source = await contentAfter(game, changeset, scope)
      const content = source.packageTarget ? packageLevel(source, level) : source
      const domain = await runtimeOf(content)
      const board = boardAt(content, level, path, domain.vocabulary)
      if (!board) return { note: `${level} has no board at ${path}` }
      const { lines, task } = board
      const blueprint = domain.spec(content).blueprints?.find((entry) => entry.level === level && entry.task === task)
      if (!blueprint) return { note: `${level} task ${task + 1} has no blueprint reader` }
      try {
        return { data: blueprint.read(lines), task }
      } catch (error) {
        throw new Error(`${level} ${path}: ${error.en ?? error.message}`, { cause: error })
      }
    },
  },
  search: {
    about: 'Find text across a game (as a changeset would leave it): every language’s text outside link tags, every board line, and the ids of levels and entries. query: { find, regex?, caseSensitive?, word?, kinds?: [text, board, id] }. The hits in play order, each with its file, level, path and the spans matched.',
    params: { game: 'string', query: 'object', changeset: 'object?', scope: 'string?' },
    async run({ game, query, changeset = null, scope }) {
      const content = await contentAfter(game, changeset, scope)
      const hits = searchContent(content, (await runtimeOf(content)).vocabulary, query)
      return { count: hits.length, hits }
    },
  },
  replace: {
    about: 'Replace across a game as operations, nothing written: the changeset ({ why, ops }: text.set for each text, level.blueprint for each board) that replaces the query’s matches with `with` ($1… for a regex’s groups), each change before and after, and the ids found and left alone (ids cannot change; create a new object, then delete the old one). Run it with modify (dryRun first). pick: only these hits (file|path|side or line).',
    params: { game: 'string', query: 'object', with: 'string', pick: 'array?', changeset: 'object?', scope: 'string?' },
    async run({ game, query, with: replacement, pick = null, changeset = null, scope }) {
      const content = await contentAfter(game, changeset, scope)
      const { ops, changes, skipped } = replaceOps(content, (await runtimeOf(content)).vocabulary, query, replacement, pick)
      return { changeset: { why: `replace ${JSON.stringify(query.find)} with ${JSON.stringify(replacement)}`, ops }, changes, skipped: skipped.map((h) => ({ file: h.file, path: showPath(h.path), text: h.text })) }
    },
  },
  history: {
    about: 'Read a course or package file from git at a revision (default HEAD). Pass a level ID or a file name relative to the course or its package.',
    params: { game: 'string', level: 'string?', file: 'string?', rev: 'string?' },
    async run({ game, level, file, rev = 'HEAD' }) {
      const ws = open(game)
      const name = level !== undefined ? `levels/${level.replace(`${ws.packageId}/`, '')}.json` : file ?? (ws.packaged ? 'package.json' : 'game.json')
      const fileName = relative(ws.dir, resolve(ws.dir, name))
      if (fileName.startsWith('..')) throw new Error(`${name} is outside ${game}`)
      const path = ws.pathFor(fileName)
      try {
        const tree = git('rev-parse', '--verify', '--end-of-options', `${rev}^{tree}`).trim()
        const text = git('show', `${tree}:${path}`)
        if (!name.endsWith('.json')) return { found: true, rev, file: name, text }
        let value = JSON.parse(text)
        const isObject = /^(levels|parts|entries|tags|relations|sections|trays)\//.test(fileName)
        if (isObject || ['game.json', 'blueprint.json'].includes(fileName)) {
          const scope = join(isObject ? path.slice(0, -fileName.length) : dirname(path), 'i18n')
          const files = git('ls-tree', '-r', '--name-only', '-z', tree, '--', `${scope}/`).split('\0').filter((file) => file.endsWith('.json'))
          const catalogs = Object.fromEntries(files.map((file) => [file.slice(scope.length + 1, -'.json'.length), JSON.parse(git('show', `${tree}:${file}`))]))
          value = catalogReader(catalogs, scope)(value, path)
        }
        return { found: true, rev, file: name, text, value }
      } catch (error) {
        return { found: false, rev, file: name, why: String(error.stderr ?? error.message).trim().split('\n')[0] }
      }
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
      const ws = open(game)
      return { seq: adopt(ws, why), ...logOf(game) }
    },
  },
  undo: {
    about: 'Undo the last change of a game’s log not undone yet: its inverse run as a changeset, checked, and logged as an undo (dryRun: preview only). seq: the change the caller means (log gives it as undoable): refused when that is no longer the one undo would undo.',
    params: { game: 'string', dryRun: 'boolean?', seq: 'number?' },
    async run({ game, dryRun = false, seq = null }) {
      const r = await undo(open(game), { write: !dryRun, seq })
      return { ok: r.ok, written: r.ok && !dryRun, says: r.says, problems: r.problems, files: r.files, diff: r.diff }
    },
  },
  vocabulary: {
    about: 'What content may be made of: a game’s domain vocabulary as data (kinds, items, schemas of game.json and a level), and the operations with their arguments.',
    params: { game: 'string' },
    async run({ game }) {
      const content = readTarget(game)
      const { vocabulary } = await runtimeOf(content)
      return {
        modules: runtimeIds(content),
        // What the studio needs to rebuild the same vocabulary in the browser: the kernel's modules still in use and
        // the object types packages declare (kinds/).
        legacyModules: vocabulary.legacyModules ?? runtimeIds(content), packageCode: Boolean(vocabulary.packageCode),
        objectKinds: vocabulary.objectKinds ?? {},
        vocabulary: describe(vocabulary),
        operations: Object.fromEntries(Object.entries(OPERATIONS).map(([name, op]) => [name, { about: op.about, params: op.params }])),
      }
    },
  },
}


// Headless plugin play never loads a view or discloses authored reference/wrong answers.
tools.play_task = {
  about: 'Observe a game or package plugin task, or submit work through its registered blind-play agent.',
  params: { game: 'string', level: 'string', task: 'string?', work: 'any?' },
  async run({ game, level: name, task: key, work }) {
    const content = await contentAfter(game)
    const level = content.levels.find(level => level.id === name)
    if (!level) throw new Error(`unknown level ${name}`)
    const task = key ? level.tasks.find(task => task.id === key) : level.tasks[0]
    if (!task) throw new Error(`unknown task ${key}`)
    const runtime = await runtimeOf(content)
    const context = { content, level: { source: { ...level, ...task, taskId: task.id } }, progress: { passed: [] } }
    return work === undefined ? runtime.play.open(context) : runtime.play.attempt(context, work)
  },
}

/** The same tools accept exactly one explicit target. Package calls share no game state or game log. */
export const TOOLS = Object.fromEntries(Object.entries(tools).map(([name, tool]) => {
  if (!tool.params.game || name === 'create_game') return [name, tool]
  return [name, {
    ...tool,
    params: { ...tool.params, game: 'string?', package: 'string?' },
    run(args) {
      if (args.game && args.package) throw new Error('choose one target: game or package')
      if (!args.game && !args.package) throw new Error('name a game or package')
      return tool.run({ ...args, game: args.package ? { package: args.package } : args.game })
    },
  }]
}))
