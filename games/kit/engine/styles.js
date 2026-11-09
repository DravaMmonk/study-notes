/* global process */
// npm run styles — how far the kit's styles still write sizes, colours, spacing and corners out instead of taking the
// tokens (../tokens.css, games/DESIGN.md 6.10): in style sheets, every font size written in pixels (`font-size: 13px`,
// or in a `font:` shorthand), every padding, margin or gap written in pixels (`padding: 10px`) and every corner radius
// written in pixels; in style sheets and screens, every colour written out (`#3f7fb5`, `rgb(…)`). A `var(--…)`
// fallback counts too: the token is what a style names. A hairline nudge of 1px or less is not spacing, and a custom
// property (`--tool-h: 32px`) is a named structural size, not a count.
//
//   rawStyles(paths) → { sizes, colours, spacing, radii }   counted over the .css, .jsx and .js files at `paths`
//                                                           (files, or directories walked whole)
//   measure(kit) → { key: counts }   the kit's own sheets (key `kit`), each shared part of the interface (`shell`,
//                                    `circuit`, `views`, `strip`), every domain (domains/<name>) and template
//                                    (scaffold/<name>). The studio keeps its own denser scale (DESIGN.md 6.7).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const SIZE = /font(?:-size)?\s*:[^;{}]*?\d+(?:\.\d+)?px/g
const COLOUR = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b|rgba?\(/g
const SPACING = /(?<![-\w])(?:(?:padding|margin|scroll-padding|scroll-margin)(?:-[a-z-]+)?|gap|row-gap|column-gap)\s*:\s*([^;{}]+)/g
const RADIUS = /(?<![-\w])border(?:-[a-z]+)*-radius\s*:\s*([^;{}]+)/g
const SHARED = ['shell', 'circuit', 'views', 'strip']

function files(path) {
  if (!statSync(path).isDirectory()) return [path]
  return readdirSync(path).flatMap((name) => {
    const inner = join(path, name)
    if (statSync(inner).isDirectory()) return name === 'versions' || name === 'node_modules' ? [] : files(inner)
    return /\.(css|jsx?)$/.test(name) && !/\.test\.js$/.test(name) ? [inner] : []
  })
}

// Declarations of `pattern` whose value writes out more than a hairline in pixels.
const written = (text, pattern) => [...text.matchAll(pattern)].filter(([, value]) => [...value.matchAll(/(\d*\.?\d+)px/g)].some(([, n]) => Number(n) > 1)).length

export function rawStyles(paths) {
  const counts = { sizes: 0, colours: 0, spacing: 0, radii: 0 }
  for (const path of [paths].flat().flatMap(files)) {
    const text = readFileSync(path, 'utf8')
    if (path.endsWith('.css')) {
      counts.sizes += text.match(SIZE)?.length ?? 0
      counts.spacing += written(text, SPACING)
      counts.radii += written(text, RADIUS)
    }
    // In code, a colour is a string: '#…', "#…", `…#…`.
    counts.colours += (path.endsWith('.css') ? text : (text.match(/(['"`])(?:(?!\1).)*\1/g) ?? []).join('\n')).match(COLOUR)?.length ?? 0
  }
  return counts
}

export function measure(kit) {
  const dirs = (top) => readdirSync(resolve(kit, top)).filter((name) => statSync(resolve(kit, top, name)).isDirectory())
  const areas = [
    ['kit', readdirSync(kit).filter((name) => name.endsWith('.css') && name !== 'tokens.css').map((name) => resolve(kit, name))],
    ...SHARED.filter((name) => existsSync(resolve(kit, name))).map((name) => [name, resolve(kit, name)]),
    ...dirs('domains').map((name) => [name, resolve(kit, 'domains', name)]),
    ...dirs('scaffold').map((name) => [`scaffold/${name}`, resolve(kit, 'scaffold', name)]),
  ]
  return Object.fromEntries(areas.map(([key, paths]) => [key, rawStyles(paths)]))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const [key, counts] of Object.entries(measure(resolve(import.meta.dirname, '..')))) {
    console.log(`${key.padEnd(18)}${Object.entries(counts).map(([k, n]) => `${k} ${String(n).padStart(4)}`).join('   ')}`)
  }
}
