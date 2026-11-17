import { meaningsOf } from './kind-meanings.js'
import { sourceValue } from './catalogs.js'
// Public identities are collected from the same qualified layers as existence checking.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { publicSurfaces } from './existence.js'
import { fileHashes, contentHash, hash, stableJSON, kitDirectory } from './release-data.js'

const require = createRequire(resolve(kitDirectory, '../../trace-viewer/package.json'))
export function exportedNames(file, seen = new Set()) {
  if (!file || seen.has(file)) return []
  seen.add(file)
  const { parse } = require('espree')
  const ast = parse(readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } })
  const names = []
  for (const node of ast.body) {
    if (node.type === 'ExportDefaultDeclaration') names.push('default')
    if (node.type === 'ExportAllDeclaration') names.push(...exportedNames(resolve(file, '..', node.source.value), seen))
    if (node.type === 'ExportNamedDeclaration') {
      names.push(...node.specifiers.map(specifier => specifier.exported.name))
      if (node.declaration?.id) names.push(node.declaration.id.name)
      for (const declaration of node.declaration?.declarations ?? []) {
        if (declaration.id.type === 'Identifier') names.push(declaration.id.name)
        else for (const property of declaration.id.properties ?? []) names.push(property.value.name)
      }
    }
  }
  return [...new Set(names)].sort()
}
/** Read view registration identities without loading browser modules during headless checks. */
export function viewRegistrations(file) {
  if (!file) return []
  const { parse } = require('espree')
  const ast = parse(readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } })
  const constants = new Map()
  const literal = node => node?.type === 'Literal' ? node.value : node?.type === 'Identifier' ? constants.get(node.name) : node?.type === 'TemplateLiteral' && node.expressions.length === 0 ? node.quasis[0].value.cooked : undefined
  const registrations = []
  const visit = node => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') constants.set(node.id.name, literal(node.init))
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && ['play', 'editor', 'display'].includes(node.callee.property.name)) {
      const name = literal(node.arguments[0])
      if (typeof name === 'string' && /^[a-z][a-z0-9-]*:[A-Za-z][A-Za-z0-9_-]*$/.test(name)) {
        const type = literal(node.arguments[1]?.properties?.find(property => property.key.name === 'type')?.value)
        registrations.push({ kind: node.callee.property.name === 'play' ? 'playView' : node.callee.property.name, name, value: type ? { type } : {} })
      }
    }
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value)
  }
  visit(ast)
  return registrations
}
export function layerManifest(layer, layers, schemas, dir) {
  const bare = layers.map(item => ({ ...item, manifest: undefined }))
  const entries = publicSurfaces(bare, schemas).get(layer.id) ?? new Map()
  const values = new Map([...layer.objects, ...(layer.codeObjects ?? [])].map(object => [`${object.kind}:${object.kind === 'tag' ? `${object.value.kind}:` : ''}${object.name}`, object.value]))
  for (const object of layer.objects) {
    for (const task of object.kind === 'level' ? object.value.tasks ?? [] : []) values.set(`task:${task.id}`, task)
    for (const meaning of meaningsOf(schemas)) for (const entry of meaning.identities?.(object) ?? []) values.set(`${entry.kind}:${entry.name}`, entry.value)
  }
  for (const [lang, entries] of Object.entries(layer.catalogs ?? {})) for (const [name, value] of Object.entries(entries)) {
    const key = `i18n:${name.includes('/') ? name : `${layer.id}/${name}`}`
    values.set(key, { ...values.get(key), [lang]: value })
  }
  const surface = Object.fromEntries([...entries].map(([key, entry]) => {
    const value = sourceValue(values.get(key) ?? {})
    return [key, { ...entry, hash: hash(stableJSON(value)), value }]
  }))
  const exports = Object.fromEntries(Object.entries(layer.entryPaths ?? {}).map(([side, file]) => [side, exportedNames(file)]))
  for (const [side, names] of Object.entries(exports)) for (const name of names) surface[`export:${side}/${name}`] = { kind: 'export', name: `${layer.id}/${side}/${name}`, hash: hash(name), value: name }
  const files = fileHashes(dir)
  return { id: layer.id, version: layer.config.version, kernel: layer.config.kernel, uses: layer.config.uses, surface, exports, files, hash: contentHash(files) }
}
