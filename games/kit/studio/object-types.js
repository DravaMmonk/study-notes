// The object types the build workspace's left column lists (games/MODULES.md 5.3, 5.4): the kernel's own (levels,
// parts, symbols, entries and the content kinds it still carries) and every type a package declares in kinds/. Which
// are listed by default comes from the packages' `studio-left` tags (members: object types); each author can choose
// their own on top (kept in the browser, never in a package). The tool lists — capabilities, overrides, search — come
// after them, search last. Templates are the members of a type's `templates` tag: any object can be one.
import { contentKindSchemas } from '../engine/content-kinds.js'
import { tagMembers } from './objects-edit.js'

/** The lists the kernel's own types have always had (their keys stay, so saved choices and addresses keep working). */
export const BUILT_IN_LISTS = { level: 'tree', part: 'parts', symbol: 'symbols', entry: 'entries' }
/** The lists that are not one object type's, after the type lists; search always last. */
export const TOOL_LISTS = ['kernel', 'overrides', 'search']

// The kernel's content kinds still waiting to move into their packages, by the names they show.
const CONTENT_NAMES = { wordset: ['词组', 'Word sets'], quote: ['引语', 'Quotes'], power: ['开机画面', 'Power-on'], box: ['实验盒', 'Boxes'] }
const BUILT_IN_NAMES = { level: ['关卡', 'Levels'], part: ['元件', 'Parts'], symbol: ['符号', 'Symbols'], entry: ['词条', 'Entries'] }

/** The list an object type is shown in, and back. */
export const listOfType = (type) => BUILT_IN_LISTS[type] ?? `type:${type}`
export const typeOfList = (list) => Object.keys(BUILT_IN_LISTS).find((type) => BUILT_IN_LISTS[type] === list) ?? (list?.startsWith('type:') ? list.slice(5) : null)
export const isTypeList = (list) => typeOfList(list) !== null

/** A package's declared object type (not a field extension), or null. */
const declared = (content, type) => {
  const d = content?.objectKinds?.[type]
  return d && !d.extends ? d : null
}

/**
 * Every object type the content can list: { type, name: [zh, en] | text, icon? } — the kernel's own first, then the
 * declared ones by full name.
 */
export function objectTypes(content) {
  const own = Object.keys(BUILT_IN_NAMES).map((type) => ({ type, name: BUILT_IN_NAMES[type] }))
  const kinds = Object.keys(contentKindSchemas).filter((type) => !BUILT_IN_NAMES[type])
    .map((type) => ({ type, name: CONTENT_NAMES[type] ?? [type, type] }))
  const packages = Object.keys(content?.objectKinds ?? {}).filter((type) => declared(content, type)).sort()
    .map((type) => ({ type, name: declared(content, type).studio?.name ?? [type, type], icon: declared(content, type).studio?.icon }))
  return [...own, ...kinds, ...packages]
}

/** The objects of a type, by full name. */
export const objectsOfType = (content, type) => Object.keys(content?.registries?.[type] ?? {})

/** Whether a type has anything to list in this content (what is listed when no package says). */
export function hasObjects(content, type) {
  if (type === 'level') return true
  if (type === 'part') return Boolean(content?.partDefs)
  if (type === 'entry') return Boolean(content?.glossary?.entries?.length)
  return objectsOfType(content, type).length > 0
}

/** The tags of a member type named `name` in any loaded layer, the deepest dependency's first. */
function conventionTags(content, kind, name) {
  const order = content?.layerOrder ?? []
  const rank = (full) => { const i = order.indexOf(full.split('/')[0]); return i < 0 ? order.length : i }
  return Object.entries(content?.registries?.tag ?? {})
    .filter(([full, tag]) => tag.kind === kind && full.slice(full.indexOf('/') + 1) === name)
    .map(([full]) => full).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

/** The members of every `name` tag of member type `kind`, merged in layer order, each once. */
function conventionMembers(content, kind, name) {
  return [...new Set(conventionTags(content, kind, name).flatMap((full) => tagMembers(content, full)))]
}

/** The types the packages list by default (their `studio-left` tags merged), or null when none says. */
export function studioLeft(content) {
  const known = new Set(objectTypes(content).map(({ type }) => type))
  const members = conventionMembers(content, 'kind', 'studio-left').filter((type) => known.has(type))
  return conventionTags(content, 'kind', 'studio-left').length ? members : null
}

/** The types listed by default: what the packages say, else every type with something to list. */
export const defaultTypes = (content) => studioLeft(content) ?? objectTypes(content).filter(({ type }) => hasObjects(content, type)).map(({ type }) => type)

/** The left column's lists: the chosen types (the author's own choice, else the default), then the tools. */
export function leftLists(content, chosen = null) {
  const known = new Set(objectTypes(content).map(({ type }) => type))
  const types = (chosen ?? defaultTypes(content)).filter((type) => known.has(type))
  return [...types.map(listOfType), ...TOOL_LISTS]
}

/** The templates of a type: the members of its `templates` tags in the loaded layers, the deepest dependency's first. */
export const templatesOf = (content, type) => conventionMembers(content, type, 'templates')

/** The `templates` tag of a type in `namespace`'s own package (its full name), or null when it has none yet. */
export const ownTemplatesTag = (content, type, namespace) => conventionTags(content, type, 'templates').find((full) => full.startsWith(`${namespace}/`)) ?? null
