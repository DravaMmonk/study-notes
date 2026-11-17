// Pure edits of a relation's edges for the relation board (games/DESIGN.md 6.1). A relation is written either as
// `edges` or, for order, as a `sequence`; the board always writes `edges`.
import { linkKey } from './arrangement.js'
import { localName } from './objects-edit.js'

/** A relation's declared edges, a sequence read as one edge between each neighbouring pair. */
export function declaredEdges(relation) {
  const edges = (relation?.edges ?? []).map((edge) => ({ ...edge }))
  const seq = relation?.sequence ?? []
  for (let k = 1; k < seq.length; k++) edges.push({ from: seq[k - 1], to: seq[k] })
  return edges
}

/** The endpoints a relation's edges name, in first-seen order, and the extra ones the author placed on the board. */
export function endpointsOf(edges, placed = []) {
  return [...new Set([...edges.flatMap(({ from, to }) => [from, to]), ...placed])]
}

/** The edges with a new one from → to; null when it is there already. */
export function withEdge(edges, from, to) {
  if (edges.some((edge) => edge.from === from && edge.to === to)) return null
  return [...edges, { from, to }]
}

/** The edges without the one keyed `key` (arrangement.js linkKey). */
export const withoutEdge = (edges, key) => edges.filter((edge) => linkKey(edge) !== key)

/** The edges with `required` set or cleared on the one keyed `key`. */
export const withRequired = (edges, key, required) => edges.map((edge) => {
  if (linkKey(edge) !== key) return edge
  const { required: _, ...rest } = edge
  return required ? { ...rest, required: true } : rest
})

/** The edges without any that touch `endpoint`. */
export const withoutEndpoint = (edges, endpoint) => edges.filter(({ from, to }) => from !== endpoint && to !== endpoint)

/** What a relation's endpoints are: levels for requires, parts for replaces, the relation's `of` (or levels) for order. */
export const endpointKind = (relation) => relation?.kind === 'replaces' ? 'part' : relation?.kind === 'requires' ? 'level' : relation?.of ?? 'level'

/** The ops writing `edges` back into the relation `name` (a short name) of `namespace`: the layer's own endpoints
 * by their short names, edges replacing a sequence. */
export function writeEdges(namespace, name, relation, edges) {
  const local = (id) => localName(namespace, id) ?? id
  const written = edges.map((edge) => ({ ...edge, from: edge.game ? edge.from : local(edge.from), to: local(edge.to) }))
  if (relation.sequence) return [{ op: 'relation.put', relation: name, data: { ...withoutSequence(relation), edges: written } }]
  return [{ op: 'relation.set', relation: name, path: 'edges', value: written }]
}

const withoutSequence = ({ sequence: _, ...rest }) => rest
