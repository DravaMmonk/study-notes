// How much of its own interface each domain still writes as components: the kit draws a game (shell, views, circuit),
// a domain says what its world is (parts, runs, the scene of a test as plain data), a game's content says what is
// played. A domain's own component is the third way to fit a game, after its content and a part of the kit
// (games/DESIGN.md 6.3), and each is a piece no other game shares. This counts them.
//
//   components(kit) → { 'domains/market': 0, 'domains/agent': 324, … }   lines of .jsx a domain or a template holds,
//     its map's illustration (Hero.jsx, hero.jsx: a drawing,
//     one a game) left out
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const OWN = /^hero\.jsx$/i

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? files(path) : name.endsWith('.jsx') && !OWN.test(name) ? [path] : []
})

const lines = (path) => readFileSync(path, 'utf8').split('\n').filter((line) => line.trim()).length

export function components(kit) {
  return Object.fromEntries(['domains', 'scaffold'].flatMap((group) => readdirSync(join(kit, group)).map((name) => {
    const dir = join(kit, group, name)
    return [`${group}/${name}`, statSync(dir).isDirectory() ? files(dir).reduce((n, path) => n + lines(path), 0) : 0]
  })))
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(components(join(import.meta.dirname, '..')), null, 2))
