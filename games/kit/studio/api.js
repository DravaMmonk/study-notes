// The studio's one way to the games: a tool of the kernel (../engine/ops/tools.js) over the dev server's bridge
// (../app/studio.js). A tool that cannot run throws its error.
import { vocabularyFor } from '../engine/kernel.js'
import { withKindDeclarations } from '../engine/plugin-kinds.js'

export async function call(tool, args) {
  const res = await fetch(`/studio/api/${tool}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? `${tool}: ${res.status}`)
  return tool === 'vocabulary' ? { ...body, vocabulary: browserVocabulary(body) } : body
}

/** The vocabulary the server checked against, rebuilt with its schemas: kernel modules plus declared object types. */
function browserVocabulary({ legacyModules, packageCode, objectKinds }) {
  const layers = Object.entries(objectKinds).map(([name, value]) => ({ id: name.split('/')[0], objects: [{ kind: 'kind', name: name.split('/').slice(1).join('/'), value }] }))
  return withKindDeclarations(vocabularyFor(legacyModules), layers, packageCode)
}
