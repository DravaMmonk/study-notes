// The studio's one way to the games: a tool of the kernel (../engine/ops/tools.js) over the dev server's bridge
// (../app/studio.js). A tool that cannot run throws its error.
export async function call(tool, args) {
  const res = await fetch(`/studio/api/${tool}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? `${tool}: ${res.status}`)
  return body
}
