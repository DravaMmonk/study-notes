/* global process */
// Create a game from an installed module starter, or arrange an existing package.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PROJECT_DIR, gameDirectory, readCatalogs, readContent } from './content-node.js'
import { catalogReader } from './catalogs.js'
import { firstText } from './i18n.js'
import { expandNames } from './names.js'
import { contentVocabulary } from './content-node.js'
import { courseLevelCount } from './content.js'
import { writeJson } from './ops/json.js'

const TEMPLATES = (root) => resolve(root, 'games/kit/modules')

/** The mechanisms the scaffold has a template for (games/DESIGN.md 6.5 says what each suits). */
export const mechanisms = (root = PROJECT_DIR) => readdirSync(TEMPLATES(root)).filter((m) => ['circuit', 'rows', 'tick-bus'].includes(m))

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
  const starter = resolve(root, 'games/kit/modules', domain ?? '', 'starter')
  if (!domain || !existsSync(resolve(root, 'games/kit/modules', domain, 'domain.js'))) fail(`no domain ${domain} in kit/modules`)
  if (!existsSync(starter)) fail(`the domain ${domain} has no starter game (kit/modules/${domain}/starter/) to copy`)
  const refused = gameRefused(root, id)
  if (refused) fail(refused)
  const dir = gameDirectory(id, root)
  const packageDir = resolve(root, 'packages', id)
  const words = { 'starter/': `${id}/`, __title__: JSON.stringify(title).slice(1, -1) }
  const game = JSON.parse(readFileSync(resolve(starter, 'game.json'), 'utf8').replaceAll('__title__', () => words.__title__))
  mkdirSync(dir, { recursive: true })
  mkdirSync(packageDir, { recursive: true })
  // The course is the game's; everything else of the starter is its package.
  for (const name of readdirSync(starter)) {
    if (name === 'course.json') {
      const file = resolve(starter, name)
      const source = JSON.parse(readFileSync(file, 'utf8').replaceAll('starter/', `${id}/`))
      const packageConfig = JSON.parse(readFileSync(resolve(starter, 'package.json'), 'utf8'))
      const piecesFile = resolve(starter, 'pieces.json')
      const pieces = new Set(existsSync(piecesFile) ? Object.keys(JSON.parse(readFileSync(piecesFile, 'utf8')).parts) : [])
      const vocabulary = contentVocabulary(packageConfig.domain)
      writeFileSync(resolve(dir, name), writeJson(expandNames(source, id, { pieces, vocabulary, schema: vocabulary?.game, context: 'configuration', textKeys: false }), null))
    }
    else if (name !== 'game.json' && name !== 'i18n') fill(resolve(starter, name), resolve(packageDir, name), words)
  }
  for (const [scope, target] of [['course', dir], ['package', packageDir]]) {
    const source = resolve(starter, 'i18n', scope)
    if (existsSync(source)) fill(source, resolve(target, 'i18n'), words)
  }
  writeFileSync(resolve(dir, 'game.json'), `${JSON.stringify({ packages: [id], ...game }, null, 2)}\n`)
  const { title: gameTitle, lede } = catalogReader(readCatalogs(resolve(dir, 'i18n')))(game)
  const files = readdirSync(resolve(packageDir, 'levels')).filter((f) => f.endsWith('.json'))
  register(root, id, { title: gameTitle, lede, levels: courseLevelCount(readContent(id, root, { vocabulary: contentVocabulary(domain) }), files.length) })
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
  const { packages } = JSON.parse(readFileSync(resolve(source, 'game.json'), 'utf8'))
  const { chapters = [], optional: _optional, skippable: _skippable, ...settings } = JSON.parse(readFileSync(resolve(source, 'course.json'), 'utf8'))
  const { levels: _, layout: __, ...chapter } = chapters[0] ?? { id: 1 }
  const course = { ...settings, chapters: [{ ...chapter, levels: [] }] }
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
  writeFileSync(resolve(dir, 'game.json'), writeJson({ packages, title: '@game.title', kicker: '@game.kicker', lede: '@game.lede' }, null))
  writeFileSync(resolve(dir, 'course.json'), writeJson(course, null))
  register(root, id, { title: words, lede: words, levels: 0 })
  return dir
}

/** `node scaffold.js game <id> --domain <module> [--title <title>]`. */
function cli([what, name, ...rest]) {
  const opt = (key) => {
    const k = rest.indexOf(`--${key}`)
    return k >= 0 ? rest[k + 1] : undefined
  }
  if (what === 'game') {
    console.log(`made ${newGame({ id: name, domain: opt('domain'), title: opt('title') ?? name })}\nnext: npm run check -- ${name}`)
  } else fail('usage: scaffold.js game <id> --domain <domain>')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    cli(process.argv.slice(2))
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
