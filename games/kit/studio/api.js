// The studio's one way to the games: a tool of the kernel (../engine/ops/tools.js) over the dev server's bridge
// (../app/studio.js). A tool that cannot run throws its error.
import { circuitVocabulary } from '../../../packages/circuit/core/index.js'
import { vocabularyFor } from '../engine/kernel.js'
import { withKindDeclarations } from '../engine/plugin-kinds.js'

// Tools that only read. The same read asked again while the first is on its way (a view opened twice, an effect run
// twice in development) waits for the first instead of queueing behind it on the bridge.
const READS = new Set(['games', 'packages', 'vocabulary', 'preview', 'names', 'objects', 'overrides', 'deps', 'flow', 'history', 'log', 'search', 'audit', 'package_compatibility'])
const inFlight = new Map()

export function call(tool, args) {
  if (!READS.has(tool)) return send(tool, args)
  const key = `${tool} ${JSON.stringify(args ?? {})}`
  if (!inFlight.has(key)) inFlight.set(key, send(tool, args, 2).finally(() => inFlight.delete(key)))
  return inFlight.get(key)
}

/** One call over the bridge; a read whose connection drops before an answer (the network, not the tool) is asked again. */
async function send(tool, args, retries = 0) {
  let res
  try {
    res = await fetch(`/studio/api/${tool}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
  } catch (error) {
    if (retries > 0) return send(tool, args, retries - 1)
    throw error
  }
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? `${tool}: ${res.status}`)
  return tool === 'vocabulary' ? { ...body, vocabulary: browserVocabulary(body) } : body
}

/** The vocabulary the server checked against, rebuilt with its schemas: kernel modules plus declared object types. */
export function browserVocabulary({ legacyModules, packageCode, objectKinds }) {
  const layers = Object.entries(objectKinds).map(([name, value]) => ({ id: name.split('/')[0], resolved: true, objects: [{ kind: 'kind', name: name.split('/').slice(1).join('/'), value }] }))
  return withKindDeclarations(circuitVocabulary(vocabularyFor(legacyModules)), layers, packageCode)
}
