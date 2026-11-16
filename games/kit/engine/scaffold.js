/* global process */
// Create a game from an installed module starter, or arrange an existing package.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PROJECT_DIR, gameDirectory, readContent, readPackage, contentVocabulary } from './content-node.js'
import { runtimeIds } from './runtime.js'
import { expandNames } from './names.js'
import { firstText } from './i18n.js'
import { courseLevelCount } from './content.js'
import { writeJson } from './ops/json.js'

const TEMPLATES = (root) => resolve(root, 'games/kit/templates')

/** The mechanisms the scaffold has a template for (games/DESIGN.md 6.5 says what each suits). */
export const templates = (root = PROJECT_DIR) => readdirSync(TEMPLATES(root)).filter(name => existsSync(resolve(TEMPLATES(root), name, 'starter/package.json')))

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

/** Copy a template into an independent package. Templates are never dependencies. */
export function newPackage({ root = PROJECT_DIR, id, template, title = id }) {
  if (!/^[a-z][a-z0-9-]*$/.test(id ?? '')) fail(`a package id is lowercase letters, digits and dashes: ${id}`)
  if (!templates(root).includes(template)) fail(`no template ${template} in kit/templates`)
  const starter = resolve(TEMPLATES(root), template, 'starter')
  const packageDir = resolve(root, 'packages', id)
  if (existsSync(packageDir)) fail(`packages/${id} is there already`)
  mkdirSync(packageDir, { recursive: true })
  const words = { 'starter/': `${id}/`, __title__: JSON.stringify(title).slice(1, -1) }
  for (const name of readdirSync(starter)) if (!['game.json', 'course.json', 'i18n'].includes(name)) fill(resolve(starter, name), resolve(packageDir, name), words)
  const locales = resolve(starter, 'i18n/package')
  if (existsSync(locales)) fill(locales, resolve(packageDir, 'i18n'), words)
  return packageDir
}

/** Create a game and its independent package from the same template. */
export function newGame({ root = PROJECT_DIR, id, template, title = id }) {
  const refused = gameRefused(root, id)
  if (refused) fail(refused)
  newPackage({ root, id, template, title })
  const starter = resolve(TEMPLATES(root), template, 'starter')
  const dir = gameDirectory(id, root)
  mkdirSync(dir, { recursive: true })
  const words = { 'starter/': `${id}/`, __title__: JSON.stringify(title).slice(1, -1) }
  const game = JSON.parse(readFileSync(resolve(starter, 'game.json'), 'utf8').replaceAll('__title__', () => words.__title__))
  const source = JSON.parse(readFileSync(resolve(starter, 'course.json'), 'utf8').replaceAll('starter/', `${id}/`))
  // Template-local selections belong to the copied package, while chapter wording belongs to the game.
  for (const kind of ['power', 'box']) if (source[kind]) source[kind] = `${id}/${source[kind]}`
  const contentPackage = readPackage(id, root)
  const vocabulary = contentVocabulary(runtimeIds(contentPackage))
  const pieces = new Set(Object.keys(contentPackage.partDefs.parts).map(name => name.split('/')[1]))
  const course = expandNames(source, id, { pieces, vocabulary, schema: vocabulary.game, context: 'configuration', textKeys: false })
  writeFileSync(resolve(dir, 'course.json'), writeJson(course, null))
  if (existsSync(resolve(starter, 'i18n/course'))) fill(resolve(starter, 'i18n/course'), resolve(dir, 'i18n'), words)
  writeFileSync(resolve(dir, 'game.json'), writeJson({ packages: [id], ...game }, null))
  const content = readContent(id, root)
  register(root, id, { title: content.title, lede: content.lede, levels: courseLevelCount(content, content.levels.length) })
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
  const { levels: _, rows: __, ...chapter } = chapters[0] ?? { id: 1 }
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

/** `node scaffold.js game <id> --template <name> [--title <title>]`. */
function cli([what, name, ...rest]) {
  const opt = (key) => {
    const k = rest.indexOf(`--${key}`)
    return k >= 0 ? rest[k + 1] : undefined
  }
  if (what === 'game') {
    console.log(`made ${newGame({ root: process.env.GAMES_ROOT ?? PROJECT_DIR, id: name, template: opt('template'), title: opt('title') ?? name })}\nnext: npm run check -- ${name}`)
  } else if (what === 'package') {
    console.log(`made ${newPackage({ root: process.env.GAMES_ROOT ?? PROJECT_DIR, id: name, template: opt('template') })}\nnext: npm run check -- --package ${name}`)
  } else fail('usage: scaffold.js <game|package> <id> --template <name>')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    cli(process.argv.slice(2))
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
