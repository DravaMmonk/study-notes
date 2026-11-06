/* global process */
// npm run styles — how far each domain's styles still write sizes and colours out instead of taking the kit's tokens
// (../tokens.css, games/DESIGN.md 6.10): in its style sheets, every font size written in pixels (`font-size: 13px`, or
// in a `font:` shorthand), and in its style sheets and screens every colour written out (`#3f7fb5`, `rgb(…)`).
// A `var(--…)` fallback counts too: the token is what a domain names.
//
//   rawStyles(dir) → { sizes, colours }   counted over every .css, .jsx and .js file under `dir`
//   measure(kit) → { key: { sizes, colours } }   every domain (domains/<name>) and template (scaffold/<name>)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const SIZE = /font(?:-size)?\s*:[^;{}]*?\d+(?:\.\d+)?px/g
const COLOUR = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b|rgba?\(/g

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'versions' || name === 'node_modules' ? [] : files(path)
    return /\.(css|jsx?)$/.test(name) && !/\.test\.js$/.test(name) ? [path] : []
  })
}

export function rawStyles(dir) {
  let sizes = 0
  let colours = 0
  for (const path of files(dir)) {
    const text = readFileSync(path, 'utf8')
    if (path.endsWith('.css')) sizes += text.match(SIZE)?.length ?? 0
    // In code, a colour is a string: '#…', "#…", `…#…`.
    colours += (path.endsWith('.css') ? text : (text.match(/(['"`])(?:(?!\1).)*\1/g) ?? []).join('\n')).match(COLOUR)?.length ?? 0
  }
  return { sizes, colours }
}

export function measure(kit) {
  return Object.fromEntries(['domains', 'scaffold'].flatMap((top) => readdirSync(resolve(kit, top)).filter((name) => existsSync(resolve(kit, top, name)) && statSync(resolve(kit, top, name)).isDirectory()).map((name) => [top === 'domains' ? name : `scaffold/${name}`, rawStyles(resolve(kit, top, name))])))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const [key, { sizes, colours }] of Object.entries(measure(resolve(import.meta.dirname, '..')))) console.log(`${key.padEnd(18)} sizes ${String(sizes).padStart(4)}   colours ${String(colours).padStart(4)}`)
}
