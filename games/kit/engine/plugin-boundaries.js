// Import policy is shared by ESLint and the headless content checker.
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { dirname, extname, relative, resolve, sep } from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const KIT = resolve(import.meta.dirname, '..')
export const publicEntries = { kernel: resolve(KIT, 'engine/index.js'), 'kernel/view': resolve(KIT, 'app/view.jsx') }
export function exportPath(specifier, root) {
  if (publicEntries[specifier]) return publicEntries[specifier]
  if (!/^[a-z][a-z0-9-]*(?:\/view)?$/.test(specifier)) return null
  const [id, view] = specifier.split('/')
  const path = resolve(root, 'packages', id, view ? 'view/index.jsx' : 'core/index.js')
  return existsSync(path) ? path : null
}
export function importProblem(specifier, file, root, uses) {
  const parts = relative(resolve(root, 'packages'), file).split(sep)
  const [id, side] = parts
  if (!['core', 'view'].includes(side)) return null
  if (typeof specifier !== 'string') return 'computed imports are not allowed in package code'
  if (specifier.startsWith('.')) {
    const target = resolve(dirname(file), specifier)
    if (!target.startsWith(resolve(root, 'packages', id) + sep)) return 'packages may only import public kernel and dependency exports'
    const actual = existsSync(target) ? realpathSync(target) : target
    const allowed = [resolve(root, 'packages', id, side) + sep, ...(side === 'view' ? [resolve(root, 'packages', id, 'core') + sep] : [])]
    if (!allowed.some(path => actual.startsWith(path))) return `${side} cannot import ${specifier}`
    if (side === 'core' && !['.js', '.mjs', '.json'].includes(extname(target))) return 'core cannot import JSX, CSS or view assets'
    return null
  }
  if (specifier === 'kernel' || side === 'view' && ['kernel/view', 'react', 'react/jsx-runtime', 'react-dom', 'lucide-react'].includes(specifier)) return null
  const [owner, suffix, ...rest] = specifier.split('/')
  if (uses.includes(owner) && !rest.length && (!suffix || suffix === 'view' && side === 'view') && exportPath(specifier, root)) return null
  return `${side}: undeclared or private import ${specifier}`
}
const walkFiles = dir => !existsSync(dir) ? [] : readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walkFiles(resolve(dir, entry.name)) : [resolve(dir, entry.name)])
export function packageCodeProblems(id, root) {
  const dir = resolve(root, 'packages', id)
  const uses = JSON.parse(readFileSync(resolve(dir, 'package.json'))).uses ?? []
  const require = createRequire(resolve(KIT, '../../trace-viewer/package.json'))
  const { parse } = require('espree')
  const problems = []
  for (const side of ['core', 'view']) for (const file of walkFiles(resolve(dir, side))) {
    if (!/\.(js|jsx|mjs)$/.test(file)) { if (side === 'core' && /\.(css|tsx)$/.test(file)) problems.push({ at: file, says: 'core contains view code' }); continue }
    const add = says => problems.push({ at: relative(root, file), says })
    if (side === 'core' && extname(file) === '.jsx') add('core contains JSX')
    let ast
    try { ast = parse(readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: side === 'view' } }) }
    catch (error) { add(error.message); continue }
    const visit = node => {
      if (!node || typeof node !== 'object') return
      let source
      if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source) source = node.source
      if (node.type === 'ImportExpression') source = node.source
      if (node.type === 'CallExpression' && node.callee?.name === 'require') source = node.arguments[0] ?? {}
      if (source) { const issue = importProblem(source.type === 'Literal' ? source.value : null, file, root, uses); if (issue) add(issue) }
      for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value)
    }
    visit(ast)
  }
  return problems
}

// Node's hooks keep bare package names identical to the Vite public export map.
let installed = false
export function installPackageImports() {
  if (installed) return
  installed = true
  registerHooks({ resolve(specifier, context, next) {
    if (context.parentURL?.startsWith('file:')) {
      const parent = fileURLToPath(context.parentURL)
      const marker = `${sep}packages${sep}`, index = parent.lastIndexOf(marker)
      if (index >= 0) {
        const root = parent.slice(0, index)
        const path = exportPath(specifier, root)
        if (path) return next(pathToFileURL(path).href, context)
      }
    }
    return next(specifier, context)
  } })
}
