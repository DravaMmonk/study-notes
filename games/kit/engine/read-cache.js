// Read-only author requests share resolution work until any input's metadata changes.
import { AsyncLocalStorage } from 'node:async_hooks'
import { existsSync, readdirSync, lstatSync } from 'node:fs'
import { resolve } from 'node:path'
import { releaseDirectory } from './release-store.js'

const requests = new AsyncLocalStorage()
const generations = new Map()
const excluded = new Set(['node_modules', '.git', '.DS_Store', 'changes.lock'])
const stamp = path => {
  if (!existsSync(path)) return [path, null]
  const stat = lstatSync(path, { bigint: true })
  if (stat.isDirectory()) return [path, readdirSync(path).sort().filter(name => !excluded.has(name)).map(name => stamp(resolve(path, name)))]
  return [path, String(stat.mtimeNs), String(stat.ctimeNs), String(stat.size), String(stat.ino)]
}
// Registration functions retain identity; all mutable data belongs to the caller.
const copy = value => {
  if (Array.isArray(value)) return value.map(copy)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copy(child)]))
  return value
}

export function withReadCache(root, run) {
  const inputs = [...new Set([resolve(root, 'packages'), resolve(root, 'games'), resolve(import.meta.dirname, '..'), releaseDirectory(root)])]
  const signature = JSON.stringify([process.env.GAMES_DEPENDENCY_PROBE, ...inputs.filter(path => !inputs.some(other => other !== path && path.startsWith(`${other}/`))).map(stamp)])
  let generation = generations.get(root)
  if (generation?.signature !== signature) {
    generation = { signature, values: new Map() }
    generations.set(root, generation)
  }
  return requests.run(generation.values, run)
}

export function memoResolution(key, run, { shared = false } = {}) {
  const values = requests.getStore()
  if (!values) return run()
  if (!values.has(key)) values.set(key, run())
  return shared ? values.get(key) : copy(values.get(key))
}
