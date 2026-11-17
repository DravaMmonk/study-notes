// The object types the build workspace's left column lists (games/MODULES.md 5.3, 5.4): the kernel's own (levels,
// parts, symbols, entries and the content kinds it still carries) and every type a package declares in kinds/. Which
// are listed by default comes from the tag `kernel/studio-left` (members: object types), which packages add to; each author can choose
// their own on top (kept in the browser, never in a package). The tool lists — capabilities, overrides, search — come
// after them, search last.
import { contentKindSchemas } from '../engine/content-kinds.js'
import { tagKey, tagMembers } from './objects-edit.js'

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

/** The types the packages list by default: the members every package added to `kernel/studio-left`, or null when none did. */
export function studioLeft(content) {
  const key = tagKey('kind', 'kernel/studio-left')
  const known = new Set(objectTypes(content).map(({ type }) => type))
  const members = tagMembers(content, key)
  return members.length ? members.filter((type) => known.has(type)) : null
}

/** The types listed by default: what the packages say, else every type with something to list. */
export const defaultTypes = (content) => studioLeft(content) ?? objectTypes(content).filter(({ type }) => hasObjects(content, type)).map(({ type }) => type)

/** The left column's lists: the chosen types (the author's own choice, else the default), then the tools. */
export function leftLists(content, chosen = null) {
  const known = new Set(objectTypes(content).map(({ type }) => type))
  const types = (chosen ?? defaultTypes(content)).filter((type) => known.has(type))
  return [...types.map(listOfType), ...TOOL_LISTS]
}

