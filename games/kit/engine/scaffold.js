/* global process */
// The scaffold (games/DESIGN.md 6.3): a new domain from a mechanism's template, and a new data game on a domain.
//
//   npm run new-domain -- <name> --mechanism <mechanism> [--game <id>]   kit/domains/<name>/ from kit/scaffold/<mechanism>/,
//                                                                         and its starter game as games/<id> (default <name>)
//   npm run new-game -- <id> --domain <domain> [--title <title>]         games/<id>/ and packages/<id>/ from the domain's starter/
//
// A template is a working domain whose files say `__name__` where the domain's name goes (in their text and their
// names) and whose starter game says `__title__` for its title; the result passes the domain contract (contract.js),
// `npm run check`, `npm test` and builds. A new game is registered in the hub's list (games.js) as hidden and in
// development, so it builds and plays at its address before it is shown. Both run on `root`, the project directory.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PROJECT_DIR, gameDirectory } from './content-node.js'
import { firstText } from './i18n.js'

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
  for (const name of readdirSync(starter)) {
    if (name !== 'game.json') fill(resolve(starter, name), resolve(packageDir, name), words)
  }
  writeFileSync(resolve(dir, 'game.json'), `${JSON.stringify({ package: id, ...game }, null, 2)}\n`)
  register(root, id, { title: game.title, lede: game.lede, levels: readdirSync(resolve(packageDir, 'levels')).filter((f) => f.endsWith('.json')).length })
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
