/* global process */
// npm run words [-- --check] — the words the kit's own code says (games/DESIGN.md 6.10). Code writes a word in the base
// language alone, tr('清空') or T('清空') (../shell/i18n.js); how it reads in another language is the catalog's,
// ../i18n/<lang>.js, keyed by the base text like a game's overlay. This command keeps the two together:
//
//   npm run words            moves the English of every tr('中', 'en') / T('中', 'en') written with two plain strings
//                            into the catalog and leaves the call with its base text (a text that would need two
//                            different translations keeps both in the code, and so does a sentence put together
//                            from values: `第 ${n} 关`)
//   npm run words -- --check fails when a call names a base text the catalog has no entry for
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { createRequire } from 'node:module'

const KIT = resolve(import.meta.dirname, '..')
// The parser comes with the page's build tools (trace-viewer/node_modules, as ./games.mjs finds vite).
const require = createRequire(resolve(KIT, '../../trace-viewer/package.json'))
const { parse } = require('@babel/parser')
const traverse = require('@babel/traverse').default
const CATALOG = resolve(KIT, 'i18n/en.js')
const I18N = resolve(KIT, 'shell/i18n.js')

const sources = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = resolve(dir, entry.name)
  if (entry.isDirectory()) return ['node_modules', 'versions', 'starter'].includes(entry.name) ? [] : sources(file)
  return /\.(js|jsx|mjs)$/.test(entry.name) && !entry.name.endsWith('.test.js') && file !== CATALOG ? [file] : []
})

/** A plain string an argument writes (a literal, or a template with nothing put into it), or null. */
const plain = (node) => (node?.type === 'StringLiteral' ? node.value : node?.type === 'TemplateLiteral' && !node.expressions.length ? node.quasis[0].value.cooked : null)

/** Every call of the kit's tr or T in a file: [{ zh, en?, cut?: [from, to] }] (cut: the span of its second argument). */
function callsIn(file, text) {
  const out = []
  const ast = parse(text, { sourceType: 'module', plugins: ['jsx'] })
  traverse(ast, {
    CallExpression(path) {
      const { callee, arguments: args } = path.node
      if (callee.type !== 'Identifier') return
      const binding = path.scope.getBinding(callee.name)
      const from = binding?.path.parent
      if (binding?.kind !== 'module' || from?.type !== 'ImportDeclaration' || resolve(file, '..', from.source.value) !== I18N) return
      if (!['T', 'tr'].includes(binding.path.node.imported?.name)) return
      const zh = plain(args[0])
      if (zh === null) return
      if (args.length === 1) out.push({ zh })
      else if (args.length === 2 && plain(args[1]) !== null) out.push({ zh, en: plain(args[1]), cut: [args[0].end, args[1].end] })
    },
  })
  return out
}

const files = sources(KIT).map((file) => ({ file, text: readFileSync(file, 'utf8') })).map((f) => ({ ...f, calls: callsIn(f.file, f.text) }))
const catalog = (await import(CATALOG)).default
const check = process.argv.includes('--check')

if (check) {
  const missing = files.flatMap((f) => f.calls.filter((c) => c.en === undefined && !(c.zh in catalog)).map((c) => `${relative(KIT, f.file)}: ${c.zh}`))
  for (const m of missing) console.log(`no entry in i18n/en.js: ${m}`)
  console.log(missing.length ? `${missing.length} word(s) without a translation` : `${Object.keys(catalog).length} words, every one the code says translated`)
  process.exit(missing.length ? 1 : 0)
}

// A base text written with two different translations stays in the code with both.
const said = new Map(Object.entries(catalog).map(([zh, en]) => [zh, new Set([en])]))
for (const f of files) for (const c of f.calls) if (c.en !== undefined) said.set(c.zh, (said.get(c.zh) ?? new Set()).add(c.en))
const next = { ...catalog }
let moved = 0
for (const f of files) {
  const cuts = f.calls.filter((c) => c.cut && said.get(c.zh).size === 1).sort((a, b) => b.cut[0] - a.cut[0])
  if (!cuts.length) continue
  let text = f.text
  for (const c of cuts) {
    next[c.zh] = c.en
    text = text.slice(0, c.cut[0]) + text.slice(c.cut[1])
  }
  writeFileSync(f.file, text)
  moved += cuts.length
}
const body = Object.keys(next).sort().map((zh) => `  ${JSON.stringify(zh)}: ${JSON.stringify(next[zh])},`).join('\n')
writeFileSync(CATALOG, `// The English of the words the kit's own code says, by the base text (npm run words keeps it; games/DESIGN.md 6.10).\nexport default {\n${body}\n}\n`)
const kept = [...said.values()].filter((s) => s.size > 1).length
console.log(`${moved} call(s) moved; ${Object.keys(next).length} words in the catalog; ${kept} text(s) keep two translations in the code`)
