// The lists of the studio's left column (games/PACKAGES.md 8): whatever is picked from is listed on the left, one kind
// at a time, a switcher above choosing which; the middle shows what is picked, the right its raw JSON. The lists of the
// level views (the course tree, the pieces with their settings, the encyclopedia, search) leave the middle on the level view;
// the object lists (tags, relations, layouts, the kernel's capabilities, the overrides) put the object picked there.
// What each object list has open is kept in the address, so a reload comes back to it.

/** The package workspace's lists, by the kind of what they list; search always last. */
export const PACKAGE_LISTS = ['tree', 'parts', 'entries', 'tags', 'relations', 'layouts', 'kernel', 'overrides', 'search']
/** The game workspace's lists. */
export const GAME_LISTS = ['chapters', 'overrides']

/** The object lists, each with the address parameter that keeps what it has open. */
export const OBJECT_LISTS = { tags: 'tag', relations: 'relation', layouts: 'layout', kernel: 'capability', overrides: 'override' }
export const isObjectList = (list) => Object.hasOwn(OBJECT_LISTS, list)
/** The object list of an object kind (tag, relation, layout). */
export const listOfKind = (kind) => Object.keys(OBJECT_LISTS).find((list) => OBJECT_LISTS[list] === kind) ?? null

// The old top-bar tabs that only switched to one of these lists.
const OLD_TABS = { arrange: 'tags', overrides: 'overrides', kernel: 'kernel' }

/**
 * What the address opens: { list, open } — `list` the object list it names (or null), `open` what each object list has
 * open ({ tag, relation, layout, capability, override }). A parameter names its list; an old tab its list too.
 */
export function readOpen(query, lists = PACKAGE_LISTS) {
  const open = {}
  let list = null
  for (const [name, param] of Object.entries(OBJECT_LISTS)) {
    const value = query.get(param)
    if (value === null || !lists.includes(name)) continue
    open[param] = value
    list ??= name
  }
  const old = OLD_TABS[query.get('tab')]
  if (!list && old && lists.includes(old)) list = old
  return { list, open }
}

/** The address parameters of the list shown: [param, value] when it is an object list with something open. */
export function openParams(list, open) {
  const param = OBJECT_LISTS[list]
  return param && open?.[param] ? [[param, open[param]]] : []
}

/** What a list of [key, value] entries has current: the one `selected` names, else the first, else null. */
export const currentOf = (entries, selected) => entries.find(([key]) => key === selected) ?? entries[0] ?? null

/** A capability by its kind and `<module>:<name>`, one string for the address; and back. */
export const capabilityKey = (kind, name) => `${kind}/${name}`
export function capabilityOf(key) {
  if (typeof key !== 'string' || !key.includes('/')) return null
  const at = key.indexOf('/')
  return { kind: key.slice(0, at), name: key.slice(at + 1) }
}

/** An override event's key: its layer, the kind overridden and the object's name. */
export const overrideKey = (event) => `${event.layer} ${event.kind} ${event.name}`
