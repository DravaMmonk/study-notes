// The studio's one way to the games: a tool of the kernel (../engine/ops/tools.js) over the dev server's bridge
// (../app/studio.js). A tool that cannot run throws its error.
import { selectCourseVocabulary } from '../engine/capabilities.js'

export async function call(tool, args) {
  const res = await fetch(`/studio/api/${tool}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? `${tool}: ${res.status}`)
  return tool === 'vocabulary' ? { ...body, vocabulary: selectCourseVocabulary(body.vocabulary, body.domain) } : body
}
