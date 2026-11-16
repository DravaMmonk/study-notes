// What a layer writes when it overrides a package's object from the studio (games/PACKAGES.md 4, 5, 8). A game
// overrides only copy, level relations and layouts: a relation by the edges it adds and removes, a layout whole.
import { sameJson } from '../engine/json-value.js'

const sameEdge = (a, b) => a.from === b.from && a.to === b.to
const plain = ({ from, to, required, game }) => ({ from, to, ...(required && { required: true }), ...(game && { game }) })

/** This layer's override event of one object, if it has one: { before, after } (layers.js visibleOverrides). */
export const overrideEvent = (content, layer, kind, name) =>
  (content?.overrideHistory ?? []).find((event) => event.layer === layer && event.kind === kind && event.name === name) ?? null

/** An object as it stood before `layer` overrode it, or as it is when the layer has not. */
export const beforeLayer = (content, layer, kind, name) => overrideEvent(content, layer, kind, name)?.before ?? content?.registries?.[kind]?.[name] ?? null

/** A relation's declared edges, a sequence as one edge between each neighbouring pair. */
export const edgesOf = (relation) => [...(relation?.edges ?? []), ...(relation?.sequence ?? []).slice(1).map((to, i) => ({ from: relation.sequence[i], to }))]

/** The override patch that turns `before`'s edges into `wanted`: the edges added, and the ones taken out; null when
 * nothing differs (the override file goes). */
export function relationPatch(before, wanted) {
  const had = edgesOf(before).map(plain)
  const edges = wanted.map(plain).filter((edge) => !had.some((old) => sameJson(old, edge)))
  const remove = had.filter((old) => !wanted.some((edge) => sameJson(plain(edge), old))).map(({ from, to }) => ({ from, to }))
  if (!edges.length && !remove.length) return null
  return { ...(edges.length && { edges }), ...(remove.length && { remove }) }
}

/** The ops a layer writes so relation `name` ends with `wanted` edges. */
export function relationOverrideOps(content, layer, name, wanted) {
  const patch = relationPatch(beforeLayer(content, layer, 'relation', name), wanted)
  const had = overrideEvent(content, layer, 'relation', name)
  if (!patch) return had ? [{ op: 'override.remove', layer, kind: 'relation', name }] : []
  return [{ op: 'override.put', layer, kind: 'relation', name, data: patch }]
}

/** The requires relations whose declared edges are exactly from → to (not through a tag). */
export const relationsWithEdge = (content, from, to) => Object.entries(content?.registries?.relation ?? {})
  .filter(([, relation]) => relation.kind === 'requires' && edgesOf(relation).some((edge) => sameEdge(edge, { from, to })))
  .map(([name]) => name)

/** Where a game puts a new prerequisite of `to`: a requires relation that already leads into `to`, else one that
 * names a level of `to`'s package, else none. */
export function relationForEdge(content, to) {
  const requires = Object.entries(content?.registries?.relation ?? {}).filter(([, relation]) => relation.kind === 'requires')
  const into = requires.find(([, relation]) => edgesOf(relation).some((edge) => edge.to === to))
  if (into) return into[0]
  const namespace = to.slice(0, to.indexOf('/'))
  return requires.find(([name]) => name.startsWith(`${namespace}/`))?.[0] ?? null
}

/** The ops for a game adding the prerequisite from → to; null when no package relation can take it. */
export function addEdgeOps(content, layer, from, to) {
  const name = relationForEdge(content, to)
  if (!name) return null
  const relation = content.registries.relation[name]
  return relationOverrideOps(content, layer, name, [...edgesOf(relation), { from, to }])
}

/** The ops for a game taking out the prerequisite from → to; null when it comes through a tag, not a declared edge. */
export function removeEdgeOps(content, layer, from, to) {
  const names = relationsWithEdge(content, from, to)
  if (!names.length) return null
  return names.flatMap((name) => relationOverrideOps(content, layer, name, edgesOf(content.registries.relation[name]).filter((edge) => !sameEdge(edge, { from, to }))))
}

/** The ops for a game laying out layout `name` with `rows`; back to the package's when they are the same. */
export function layoutOverrideOps(content, layer, name, rows) {
  const before = beforeLayer(content, layer, 'layout', name)
  const had = overrideEvent(content, layer, 'layout', name)
  if (sameJson(before?.rows, rows)) return had ? [{ op: 'override.remove', layer, kind: 'layout', name }] : []
  return [{ op: 'override.put', layer, kind: 'layout', name, data: { ...before, rows } }]
}
