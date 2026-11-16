/* global process */
// The scaffold (games/DESIGN.md 6.3): a new domain from a mechanism's template, and a new data game on a domain.
//
//   npm run new-domain -- <name> --mechanism <mechanism> [--game <id>]   kit/domains/<name>/ from kit/scaffold/<mechanism>/,
//                                                                         and its starter game as games/<id> (default <name>)
//   npm run new-game -- <id> --domain <domain> [--title <title>]         games/<id>/ (its course) and packages/<id>/ from the domain's starter/
//
// A template is a working domain whose files say `__name__` where the domain's name goes (in their text and their
// names) and whose starter game says `__title__` for its title; the result passes the domain contract (contract.js),
// `npm run check`, `npm test` and builds. gameOnPackage makes a game on an existing package (the studio's game
// workspace): its own course, no package of its own. A new game is registered in the hub's list (games.js) as hidden and in
// development, so it builds and plays at its address before it is shown. Both run on `root`, the project directory.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PROJECT_DIR, gameDirectory, readCatalogs, readGameConfig } from './content-node.js'
import { catalogReader } from './catalogs.js'
import { firstText } from './i18n.js'
import { courseLevelCount } from './content.js'
import { writeJson } from './ops/json.js'

const TEMPLATES = (root) => resolve(root, 'games/kit/scaffold')

/** The mechanisms the scaffold has a template for (games/DESIGN.md 6.5 says what each suits). */
export const mechanisms = (root = PROJECT_DIR) => readdirSync(TEMPLATES(root)).filter((m) => statSync(resolve(TEMPLATES(root), m)).isDirectory())

const fail = (text) => {
  throw new Error(text)
}

/** A folder copied with `__name__` and `__title__` filled in, in file names and in text. */
function fill(from, to, words) {
  const put = (s) => Object.entries(words).reduce((t, [k, v]) => t.replaceAll(k, () => v), s)
  if (statSync(from).isFile()) {
    writeFileSync(to, put(readFileSync(from, 'utf8')))
    return
  }
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) fill(resolve(from, name), resolve(to, put(name)), words)
}

/** The hub entry of a game (../../games.js): hidden and in development until it is ready to show. */
const gameText = (value, lang) => value?.[lang] ?? firstText(value)

function register(root, id, content) {
  const file = resolve(root, 'games', 'games.js')
  const text = readFileSync(file, 'utf8')
  const end = text.lastIndexOf('];')
  if (end < 0) fail(`${file} has no list of games to add to`)
  const q = (s) => JSON.stringify(s).replaceAll('"', "'")
  const en = gameText(content.title, 'en')
  const title = gameText(content.title, 'zh')
  const entry = [
    '  {',
    `    id: ${q(id)}, href: ${q(`${id}/index.html`)}, title: ${q(title)}, en: ${q(en)}, topic: { zh: ${q(title)}, en: ${q(en)} },`,
    `    desc: { zh: ${q(gameText(content.lede, 'zh'))}, en: ${q(gameText(content.lede, 'en'))} },`,
    `    levels: ${content.levels}, dev: true, hidden: true,`,
    `    page: { icon: 'M16 32h32M32 16v32', description: ${q(`${title} ${en}`)} },`,
    '  },',
    '',
  ].join('\n')
  writeFileSync(file, `${text.slice(0, end)}${entry}${text.slice(end)}`)
}

// A game's folder may hold its design docs before it holds a game: anything
// else in it is a game there already.
const isDocs = (name) => name.endsWith('.md')

/** Why game `id` cannot be made under `root`, or nothing. */
function gameRefused(root, id) {
  if (!/^[a-z][a-z0-9-]*$/.test(id ?? '')) return `a game id is lowercase letters, digits and dashes: ${id}`
  const dir = gameDirectory(id, root)
  if (existsSync(dir) && readdirSync(dir).some((name) => !isDocs(name))) return `games/${id} is there already`
  if (existsSync(resolve(root, 'packages', id))) return `packages/${id} is there already`
  if (readFileSync(resolve(root, 'games', 'games.js'), 'utf8').includes(`id: '${id}'`)) return `games.js lists ${id} already`
  return null
}

/** games/<id>/ from the starter game of `domain`, registered on the hub. Returns the folder. */
export function newGame({ root = PROJECT_DIR, id, domain, title = id }) {
  const starter = resolve(root, 'games/kit/domains', domain ?? '', 'starter')
  if (!domain || !existsSync(resolve(root, 'games/kit/domains', domain, 'domain.js'))) fail(`no domain ${domain} in kit/domains`)
  if (!existsSync(starter)) fail(`the domain ${domain} has no starter game (kit/domains/${domain}/starter/) to copy`)
  const refused = gameRefused(root, id)
  if (refused) fail(refused)
  const dir = gameDirectory(id, root)
  const packageDir = resolve(root, 'packages', id)
  const words = { __title__: JSON.stringify(title).slice(1, -1) }
  const game = JSON.parse(readFileSync(resolve(starter, 'game.json'), 'utf8').replaceAll('__title__', () => words.__title__))
  mkdirSync(dir, { recursive: true })
  mkdirSync(packageDir, { recursive: true })
  // The course is the game's; everything else of the starter is its package.
  for (const name of readdirSync(starter)) {
    if (name === 'course.json') fill(resolve(starter, name), resolve(dir, name), words)
    else if (name !== 'game.json' && name !== 'i18n') fill(resolve(starter, name), resolve(packageDir, name), words)
  }
  for (const [scope, target] of [['course', dir], ['package', packageDir]]) {
    const source = resolve(starter, 'i18n', scope)
    if (existsSync(source)) fill(source, resolve(target, 'i18n'), words)
  }
  writeFileSync(resolve(dir, 'game.json'), `${JSON.stringify({ package: id, ...game }, null, 2)}\n`)
  const { title: gameTitle, lede } = catalogReader(readCatalogs(resolve(dir, 'i18n')))(game)
  const files = readdirSync(resolve(packageDir, 'levels')).filter((f) => f.endsWith('.json'))
  register(root, id, { title: gameTitle, lede, levels: courseLevelCount(readGameConfig(id, root).game, files.length) })
  return dir
}

const refs = (value, out = new Set()) => {
  if (typeof value === 'string' && value.startsWith('@')) out.add(value.slice(1))
  else if (value && typeof value === 'object') Object.values(value).forEach((child) => refs(child, out))
  return out
}

/**
 * A new game on an existing package (the studio's game workspace, games/DESIGN.md 6.7): games/<id>/ with its own course,
 * which keeps the course settings of `from` (a game on the same package) and starts with one empty chapter shaped
 * like its first; registered on the hub as hidden and in development. Returns the folder.
 */
export function gameOnPackage({ root = PROJECT_DIR, id, from, title }) {
  if (!/^[a-z][a-z0-9-]*$/.test(id ?? '')) fail(`a game id is lowercase letters, digits and dashes: ${id}`)
  const dir = gameDirectory(id, root)
  if (existsSync(resolve(dir, 'game.json'))) fail(`games/${id} is there already`)
  if (readFileSync(resolve(root, 'games', 'games.js'), 'utf8').includes(`id: '${id}'`)) fail(`games.js lists ${id} already`)
  const source = gameDirectory(from ?? '', root)
  if (!from || !existsSync(resolve(source, 'game.json'))) fail(`no game ${from} to take the course settings from`)
  const { package: packageId } = JSON.parse(readFileSync(resolve(source, 'game.json'), 'utf8'))
  const { eras = [], ...settings } = JSON.parse(readFileSync(resolve(source, 'course.json'), 'utf8'))
  const { levels: _, links: __, rows: ___, ...chapter } = eras[0] ?? { id: 1 }
  const course = { ...settings, eras: [{ ...chapter, levels: [] }] }
  const words = { zh: typeof title === 'string' ? title : title?.zh ?? id, en: typeof title === 'string' ? title : title?.en ?? id }
  mkdirSync(dir, { recursive: true })
  mkdirSync(resolve(dir, 'i18n'), { recursive: true })
  const keys = refs(course)
  for (const [lang, file] of readdirSync(resolve(source, 'i18n')).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), resolve(source, 'i18n', f)])) {
    const theirs = JSON.parse(readFileSync(file, 'utf8'))
    const own = Object.fromEntries([...keys].filter((key) => Object.hasOwn(theirs, key)).map((key) => [key, theirs[key]]))
    own['game.title'] = words[lang] ?? words.en
    own['game.kicker'] = lang === 'zh' ? '开发中' : 'In development'
    own['game.lede'] = words[lang] ?? words.en
    writeFileSync(resolve(dir, 'i18n', `${lang}.json`), writeJson(Object.fromEntries(Object.entries(own).sort(([a], [b]) => (a < b ? -1 : 1))), null))
  }
  writeFileSync(resolve(dir, 'game.json'), writeJson({ package: packageId, title: '@game.title', kicker: '@game.kicker', lede: '@game.lede' }, null))
  writeFileSync(resolve(dir, 'course.json'), writeJson(course, null))
  register(root, id, { title: words, lede: words, levels: 0 })
  return dir
}

/** kit/domains/<name>/ from the template of `mechanism`, and its starter game as games/<game>. Returns both folders. */
export function newDomain({ root = PROJECT_DIR, name, mechanism, game = name }) {
  if (!/^[a-z][a-z0-9]*$/.test(name ?? '')) fail(`a domain name is lowercase letters and digits, a word: ${name}`)
  const known = mechanisms(root)
  if (!known.includes(mechanism)) fail(`no template for the mechanism ${mechanism}; the scaffold has ${known.join(', ')} (games/DESIGN.md 6.5 says what the others lack)`)
  const dir = resolve(root, 'games/kit/domains', name)
  if (existsSync(dir)) fail(`kit/domains/${name} is there already`)
  // Nothing is written unless both the domain and its game can be.
  const refused = gameRefused(root, game)
  if (refused) fail(refused)
  fill(resolve(TEMPLATES(root), mechanism), dir, { __name__: name })
  return { domain: dir, game: newGame({ root, id: game, domain: name }) }
}

/** `node scaffold.js domain <name> --mechanism <m> [--game <id>]` or `node scaffold.js game <id> --domain <d> [--title <t>]`. */
function cli([what, name, ...rest]) {
  const opt = (key) => {
    const k = rest.indexOf(`--${key}`)
    return k >= 0 ? rest[k + 1] : undefined
  }
  if (what === 'domain') {
    const made = newDomain({ name, mechanism: opt('mechanism'), game: opt('game') ?? name })
    console.log(`made ${made.domain}\nmade ${made.game}\nnext: npm run check -- ${opt('game') ?? name}, npm test, GAME=${opt('game') ?? name} npm run build:game`)
  } else if (what === 'game') {
    console.log(`made ${newGame({ id: name, domain: opt('domain'), title: opt('title') ?? name })}\nnext: npm run check -- ${name}`)
  } else fail('usage: scaffold.js domain <name> --mechanism <mechanism> | scaffold.js game <id> --domain <domain>')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    cli(process.argv.slice(2))
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
