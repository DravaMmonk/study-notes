/* global process */
// npm run duplication — how much the domains on the circuit preset (circuit-preset.js) still write out the same code:
// for each kind of file a domain has (course.js, ui/screen.js…), the lines of each file that stand word for word in
// at least three of the domains' files of that kind. A line is compared without comments or indentation, with the
// domain's own name made the same in every domain (`net`, `__name__`), and only when it is longer than 8 characters
// (a brace, `})` say nothing); imports are left out, since they only name what a file uses.
//
//   duplicated([{ key, name, text }]) → { key: { lines, shared } }   one kind of file, each a domain's (`name`)
//   baseDomains(kit) → [{ key, name, dir }]   the domains on the base: every domain whose course reads through
//                                              circuitCourse (or definedCourse, which reads through it), and the
//                                              scaffold's templates
//   measure(kit, files) → { file: { key: { lines, shared } } }
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const NAME = '__domain__'

/** A file's lines as they are compared. */
export function linesOf(text, name) {
  // The name alone, or at the head of a word (`netCourse`).
  const words = new RegExp(`\\b${name}(?=[A-Z]|\\b)`, 'g')
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/(^|[^:'"`\\])\/\/.*$/, '$1').trim().replace(words, NAME))
    .filter((line) => line.length > 8 && !line.startsWith('import '))
}

export function duplicated(files, { at = 3 } = {}) {
  const lines = Object.fromEntries(files.map(({ key, name, text }) => [key, linesOf(text, name)]))
  const count = new Map()
  for (const list of Object.values(lines)) for (const line of new Set(list)) count.set(line, (count.get(line) ?? 0) + 1)
  return Object.fromEntries(Object.entries(lines).map(([name, list]) => [name, { lines: list.length, shared: list.filter((line) => count.get(line) >= at).length }]))
}

export function baseDomains(kit) {
  const domains = readdirSync(resolve(kit, 'domains'))
    .map((name) => ({ key: name, name, dir: resolve(kit, 'domains', name) }))
    .filter(({ dir }) => existsSync(resolve(dir, 'course.js')) && /\b(circuit|defined)Course\(/.test(readFileSync(resolve(dir, 'course.js'), 'utf8')))
  const templates = readdirSync(resolve(kit, 'scaffold')).map((name) => ({ key: `scaffold/${name}`, name: '__name__', dir: resolve(kit, 'scaffold', name) }))
  return [...domains, ...templates]
}

export function measure(kit, files) {
  const domains = baseDomains(kit)
  return Object.fromEntries(files.map((file) => [file, duplicated(domains.filter(({ dir }) => existsSync(resolve(dir, file))).map(({ key, name, dir }) => ({ key, name, text: readFileSync(resolve(dir, file), 'utf8') })))]))
}

/** The kinds of file a domain on the base has. */
export const FILES = ['board.js', 'course.js', 'run.js', 'vocabulary.js', 'domain.js', 'play.js', 'game.js', 'ui/screen.js', 'ui/catalog.js']

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const [file, by] of Object.entries(measure(resolve(import.meta.dirname, '..'), FILES))) {
    console.log(`${file.padEnd(16)} ${Object.entries(by).map(([key, { lines, shared }]) => `${key} ${shared}/${lines}`).join('   ')}`)
  }
}
