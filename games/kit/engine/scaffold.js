/* global process */
// The scaffold (games/DESIGN.md 6.3): a new domain from a mechanism's template, and a new data game on a domain.
//
//   npm run new-domain -- <name> --mechanism <mechanism> [--game <id>]   kit/domains/<name>/ from kit/scaffold/<mechanism>/,
//                                                                         and its starter game as games/<id> (default <name>)
//   npm run new-game -- <id> --domain <domain> [--title <title>]         games/<id>/ from the domain's starter/
//
// A template is a working domain whose files say `__name__` where the domain's name goes (in their text and their
// names) and whose starter game says `__title__` for its title; the result passes the domain contract (contract.js),
// `npm run check`, `npm test` and builds. A new game is registered in the hub's list (games.js) as hidden and in
// development, so it builds and plays at its address before it is shown. Both run on `root`, the games folder.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { translationAt } from './i18n.js'

export const GAMES_ROOT = resolve(import.meta.dirname, '../..')
const TEMPLATES = (root) => resolve(root, 'kit/scaffold')

/** The mechanisms the scaffold has a template for (games/DESIGN.md 6.5 says what each suits). */
export const mechanisms = (root = GAMES_ROOT) => readdirSync(TEMPLATES(root)).filter((m) => statSync(resolve(TEMPLATES(root), m)).isDirectory())

const fail = (text) => {
  throw new Error(text)
}

/** A folder copied with `__name__` and `__title__` filled in, in file names and in text. */
function fill(from, to, words) {
  const put = (s) => Object.entries(words).reduce((t, [k, v]) => t.replaceAll(k, v), s)
  mkdirSync(to, { recursive: true })
  for (const name of readdirSync(from)) {
    const src = resolve(from, name)
    const dest = resolve(to, put(name))
    if (statSync(src).isDirectory()) fill(src, dest, words)
    else writeFileSync(dest, put(readFileSync(src, 'utf8')))
  }
}

/** The hub entry of a game (../../games.js): hidden and in development until it is ready to show. */
function register(root, id, content) {
  const file = resolve(root, 'games.js')
  const text = readFileSync(file, 'utf8')
  const end = text.lastIndexOf('];')
  if (end < 0) fail(`${file} has no list of games to add to`)
  const q = (s) => JSON.stringify(s).replaceAll('"', "'")
  const title = content.title.zh ?? content.title
  // The hub lists a game in both languages: its English comes from its overlay (./i18n.js), where it has one.
  const english = (text, kind) => translationAt(content.en?.[text.zh ?? text], kind) ?? text.zh ?? text
  const en = english(content.title, 'gameTitle')
  const entry = [
    '  {',
    `    id: ${q(id)}, href: ${q(`${id}/index.html`)}, title: ${q(title)}, en: ${q(en)}, topic: { zh: ${q(title)}, en: ${q(en)} },`,
    `    desc: { zh: ${q(content.lede.zh)}, en: ${q(english(content.lede))} },`,
    `    levels: ${content.levels}, dev: true, hidden: true,`,
    `    page: { icon: 'M16 32h32M32 16v32', description: ${q(`${title} ${en}`)} },`,
    '  },',
    '',
  ].join('\n')
  writeFileSync(file, `${text.slice(0, end)}${entry}${text.slice(end)}`)
}

// A game's folder may hold its design docs before it holds a game (a topic sketched first, games/network): anything
// else in it is a game there already.
const isDocs = (name) => name.endsWith('.md')

/** Why game `id` cannot be made under `root`, or nothing. */
function gameRefused(root, id) {
  if (!/^[a-z][a-z0-9-]*$/.test(id ?? '')) return `a game id is lowercase letters, digits and dashes: ${id}`
  const dir = resolve(root, id)
  if (existsSync(dir) && readdirSync(dir).some((name) => !isDocs(name))) return `games/${id} is there already`
  if (readFileSync(resolve(root, 'games.js'), 'utf8').includes(`id: '${id}'`)) return `games.js lists ${id} already`
  return null
}

/** games/<id>/ from the starter game of `domain`, registered on the hub. Returns the folder. */
export function newGame({ root = GAMES_ROOT, id, domain, title = id }) {
  const starter = resolve(root, 'kit/domains', domain ?? '', 'starter')
  if (!domain || !existsSync(resolve(root, 'kit/domains', domain, 'domain.js'))) fail(`no domain ${domain} in kit/domains`)
  if (!existsSync(starter)) fail(`the domain ${domain} has no starter game (kit/domains/${domain}/starter/) to copy`)
  const refused = gameRefused(root, id)
  if (refused) fail(refused)
  const dir = resolve(root, id)
  fill(starter, dir, { __title__: title })
  const game = JSON.parse(readFileSync(resolve(dir, 'game.json'), 'utf8'))
  const overlay = resolve(dir, 'i18n/en.json')
  register(root, id, { title: game.title, lede: game.lede, en: existsSync(overlay) ? JSON.parse(readFileSync(overlay, 'utf8')) : {}, levels: readdirSync(resolve(dir, 'levels')).filter((f) => f.endsWith('.json')).length })
  return dir
}

/** kit/domains/<name>/ from the template of `mechanism`, and its starter game as games/<game>. Returns both folders. */
export function newDomain({ root = GAMES_ROOT, name, mechanism, game = name }) {
  if (!/^[a-z][a-z0-9]*$/.test(name ?? '')) fail(`a domain name is lowercase letters and digits, a word: ${name}`)
  const known = mechanisms(root)
  if (!known.includes(mechanism)) fail(`no template for the mechanism ${mechanism}; the scaffold has ${known.join(', ')} (games/DESIGN.md 6.5 says what the others lack)`)
  const dir = resolve(root, 'kit/domains', name)
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
