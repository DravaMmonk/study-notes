import { find, textEntries, workspaceFiles } from 'kernel'
const texts = value => typeof value === 'string' ? [{ path: [], value }] : textEntries(value).map(([lang, text]) => ({ path: [lang], value: text }))

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const partLink = (type, namespace) => new RegExp(`(<part-ref to="(?:${namespace}/)?)${escape(type)}("></part-ref>)`, 'g')
// A board line placing the part: `x = type(…)` or `x = type[settings](…)`.
const placing = (type) => new RegExp(`(=\\s*)${escape(type)}(?=\\s*[[(])`, 'g')

/** Typed item fields include references to a part's settings and individual values. */
const itemHits = (schema, value, vocabulary) => [
  ...find(schema, value, 'ref', { vocabulary }), ...find(schema, value, 'name', { vocabulary }),
  ...find(schema, value, 'str', { vocabulary }).filter((hit) => ['circuit/part', 'grant'].includes(hit.schema.reference)),
].filter((hit) => hit.schema.kind === 'circuit/part' || ['circuit/part', 'grant'].includes(hit.schema.reference))

const namesItem = (value, name, namespace) => [name, `${namespace}/${name}`].some((base) => value === base)

/**
 * Every place naming part `type` (parts/<name>.json, ../parts/): [{ file, path, how: 'field' | 'link' | 'board' | 'open' }] —
 * a field (or a map's key) its domain's schema types as a part (S.ref('part', { reference: 'circuit/part' })), a <part-ref> link in a text, a board
 * placing it, an audit finding game.json leaves open ('part@level').
 */
export function partRefs(ws, vocabulary, type) {
  const out = []
  const names = [type, ...(ws.partDefs?.parts[type]?.stages ?? []).map(stage => stage.id)]
  for (const [file, value, schema] of workspaceFiles(ws, vocabulary)) {
    for (const hit of itemHits(schema, value, vocabulary)) if (names.some(name => namesItem(hit.value, name, ws.packageId))) out.push({ file, path: hit.path, how: 'field' })
    for (const t of find(schema, value, 'text', { vocabulary })) for (const s of texts(t.value)) if (partLink(type, ws.packageId).test(s.value)) out.push({ file, path: [...t.path, ...s.path], how: 'link' })
    for (const b of find(schema, value, 'board', { vocabulary })) b.value.forEach((line, k) => { if (placing(type).test(line)) out.push({ file, path: [...b.path, k], how: 'board' }) })
  }
  for (const [rule, list] of Object.entries(ws.game.open ?? {})) list.forEach((f, k) => { if (f.startsWith(`${type}@`)) out.push({ file: 'game.json', path: ['open', rule, k], how: 'open' }) })
  return out
}
