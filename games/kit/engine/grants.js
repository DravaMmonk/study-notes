// One registry and resolver for grantable object types. Providers own their work readers.
import { holds, usable } from '../course.js'
import { partStages } from './part-stages.js'
import { partGrant } from '../modules/circuit/grants.js'
import { symbolGrant } from '../modules/logic/grants.js'

export const grants = {
  types: new Map(),
  register({ type, used }) {
    if (this.types.has(type)) throw new Error(`duplicate grantable type ${type}`)
    if (typeof used !== 'function') throw new Error(`grantable type ${type} needs used(work)`)
    this.types.set(type, { type, used })
  },
}
grants.register(partGrant)
grants.register(symbolGrant)

/** Index every grantable base and stage, rejecting identities shared across types. */
export function grantIndex(registries = {}) {
  const index = new Map()
  for (const type of grants.types.keys()) for (const [id, entry] of partStages(registries[type])) {
    if (index.has(id)) throw new Error(`ambiguous grant ${id}: ${index.get(id).type}, ${type}`)
    index.set(id, { ...entry, type, object: registries[type][entry.part] })
  }
  return index
}

export const grantObjects = (content) => {
  const registries = { ...content.registries, part: content.partDefs?.parts ?? content.registries?.part }
  grantIndex(registries)
  return Object.assign({}, ...[...grants.types.keys()].map(type => registries[type] ?? {}))
}

/** Resolve a full object or stage name only among registered grantable types. */
export function resolveGrant(index, name) {
  const entry = index.get(name)
  if (!entry) throw new Error(`unknown grantable object ${name}`)
  return entry
}

/** Add runtime objects atomically after a work reader has resolved its declarations. */
export function extendGrantIndex(index, type, objects) {
  if (!grants.types.has(type)) throw new Error(`unregistered grantable type ${type}`)
  const added = grantIndex({ [type]: objects })
  for (const [id] of added) {
    const previous = index.get(id)
    if (previous && previous.type !== type) throw new Error(`ambiguous grant ${id}: ${previous.type}, ${type}`)
  }
  for (const [id, entry] of added) index.set(id, entry)
}

/** Availability is handed to plays in separate object-type maps. */
export function grantState(course, at, flags, types = [...grants.types.keys()]) {
  return Object.fromEntries(types.map(type => {
    const context = { ...at, grantType: type }
    const holding = holds(course, context, flags)
    const objects = {}
    for (const id of usable(course, context, flags).filter(id => course.grantIndex.get(id)?.type === type)) {
      // Tray filtering only needs identities. Resolve definitions when a play reads an object.
      Object.defineProperty(objects, id, { enumerable: true, get: () => holding.definition(id) })
    }
    return [type, objects]
  }))
}

/** Check reference work through each provider's own reader and the shared availability model. */
export function unavailableGrants(course, work, at, flags) {
  const holding = holds(course, at, flags)
  const given = new Set(course.available ? course.gives(at).map(course.partOf) : [])
  return [...grants.types].flatMap(([type, { used }]) => {
    const objects = Object.fromEntries([...course.grantIndex].filter(([, entry]) => entry.type === type && entry.index === 0)
      .map(([name, entry]) => [name, entry.object]))
    return used(work, objects).flatMap(name => {
      const entry = course.grantIndex.get(name)
      if (!entry || entry.type !== type) return [`unknown ${type} ${name} in the reference work`]
      return !holding(name) && !given.has(course.partOf(name)) ? [`${type} ${name} is unavailable to the reference work`] : []
    })
  })
}
