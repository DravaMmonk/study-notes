import { parseVersion } from './semver.js'
export { parseVersion, compareVersions, satisfies, dependencyIds, validateConfig, dependencyProblem } from './semver.js'
// Version ranges and reproducible release metadata shared by tools and the resolver.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const kitDirectory = resolve(import.meta.dirname, '..')
export const readJSON = file => JSON.parse(readFileSync(file, 'utf8'))
export const stableJSON = value => JSON.stringify(value, (_, v) => v && !Array.isArray(v) && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b, 'en'))) : v)
export const hash = value => createHash('sha256').update(value).digest('hex')
// Mutable author logs and generated metadata are outside a package's content identity.
const excluded = new Set(['.DS_Store', 'node_modules', '.git', 'changes.lock', 'manifest.json'])
export function fileHashes(dir, prefix = '') {
  if (!existsSync(dir)) return {}
  return Object.fromEntries(readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    if (excluded.has(entry.name)) return []
    if (entry.isSymbolicLink()) throw new Error(`release cannot contain symlinks: ${prefix}${entry.name}`)
    const path = resolve(dir, entry.name), name = `${prefix}${entry.name}`
    return entry.isDirectory() ? Object.entries(fileHashes(path, `${name}/`)) : [[name, hash(readFileSync(path))]]
  }))
}
export const contentHash = files => hash(stableJSON(Object.fromEntries(Object.entries(files).filter(([name]) => name !== 'changes.jsonl'))))
export const kernelIdentity = () => ({ version: readJSON(resolve(kitDirectory, 'platform.json')).version, hash: contentHash(fileHashes(kitDirectory)) })

export function structureProblems(before, after, at = 'surface') {
  if (Array.isArray(before)) {
    if (!Array.isArray(after)) return [`${at}: was a list`]
    const has = (x) => after.some((y) => structureProblems(x, y).length === 0)
    return before.flatMap((x, k) => (has(x) ? [] : [`${at}[${k}]: ${JSON.stringify(x).slice(0, 60)} is gone`]))
  }
  if (before && typeof before === 'object') {
    // Adding an alternative preserves every value accepted by an existing schema.
    if (before.type && before.type !== 'either' && after?.type === 'either' && after.of.some((choice) => structureProblems(before, choice, at).length === 0)) return []
    if (!after || typeof after !== 'object' || Array.isArray(after)) return [`${at}: was an object`]
    const out = Object.entries(before).flatMap(([k, v]) => (k in after ? structureProblems(v, after[k], `${at}.${k}`) : [`${at}.${k} is gone`]))
    // A schema object's new field is one old content lacks: it must be optional.
    if (before.type === 'obj' && after.type === 'obj') for (const [k, f] of Object.entries(after.fields ?? {})) if (!(k in (before.fields ?? {})) && !f.optional) out.push(`${at}.fields.${k} is new and not optional`)
    // A bound a schema gains narrows what old content may be.
    if ('type' in before) for (const k of ['min', 'max', 'pattern', 'keys', 'key']) if (k in after && !(k in before)) out.push(`${at}.${k} is a new bound`)
    return out
  }
  return before === after ? [] : [`${at}: ${JSON.stringify(before)} became ${JSON.stringify(after)}`]
}


export function compatibility(before, after, behavior = []) {
  const changes = []
  for (const [key, value] of Object.entries(before?.surface ?? {})) {
    const next = after.surface[key]
    if (!next || value.hash !== next.hash && structureProblems(value.value, next.value).length > 0) changes.push(key)
  }
  const added = Object.keys(after.surface).filter(key => !Object.hasOwn(before?.surface ?? {}, key))
  const changed = Object.keys(after.surface).filter(key => before?.surface?.[key] && before.surface[key].hash !== after.surface[key].hash)
  return { type: changes.length ? 'breaking' : behavior.length ? 'behavior' : added.length || changed.length ? 'additive' : 'unchanged', changes, added, behavior }
}
export function nextVersion(previous, result) {
  if (!previous) return '1.0.0'
  const [major, minor, patch] = parseVersion(previous)
  if (['breaking', 'behavior'].includes(result.type)) return `${major + 1}.0.0`
  return result.type === 'additive' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`
}

