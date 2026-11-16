// Pure edits of a tag for the tag editor (games/DESIGN.md 6.1): an unordered set of one kind of object, members by
// full name, nested tags as `#<full name>`. Registries hold full names; a layer writes its own by their short names.
import { pieceStages } from '../engine/piece-stages.js'
import { referenceResolver } from '../engine/objects.js'
import { textEntries, textKey } from '../engine/i18n.js'
import { freeObjectName, localName, ownNames } from './objects-edit.js'

export const TAG_KINDS = ['level', 'piece', 'entry']

/** How `namespace` writes a full name (or `#` tag reference): short when it is its own, full otherwise. */
export const writtenName = (namespace, full) => localName(namespace, full) ?? full

/** The registry an object of a tag's kind is in, and its id there (an item's piece for `piece.key=value`). */
const objectOf = (content, kind, id) => {
  const registries = content?.registries ?? {}
  if (kind === 'piece') return pieceStages(registries.piece).get(id)?.definition
  return registries[kind]?.[id]
}

/** Does the registry of a tag's kind hold `member` (a `#` reference: is there such a tag)? */
export const memberKnown = (content, kind, member) => member.startsWith('#') ? Boolean(content?.registries?.tag?.[member.slice(1)]) : Boolean(objectOf(content, kind, member))

/** What a member is called besides its name: a level's or entry's title, a piece's name, a tag's title. */
export function memberTitle(content, kind, member) {
  if (member.startsWith('#')) return content?.registries?.tag?.[member.slice(1)]?.title ?? null
  const object = objectOf(content, kind, member)
  return (kind === 'piece' ? object?.name : object?.title) ?? null
}

/** Would `member` (a `#` reference) inside the tag `full` close a ring of tags? Asked of the kernel's resolver. */
export function tagCycle(content, full, member) {
  if (!member.startsWith('#')) return false
  if (member.slice(1) === full) return true
  const tags = content?.registries?.tag ?? {}
  const tag = tags[full]
  if (!tag) return false
  const problems = []
  const registries = { level: {}, piece: {}, entry: {}, ...content.registries, tag: { ...tags, [full]: { ...tag, values: [...tag.values, member] } } }
  referenceResolver(registries, problems)(`#${full}`, tag.kind)
  return problems.some(({ says }) => says.startsWith('circular tags'))
}

/**
 * The tag `full`'s values with `member` added, or a refusal: `duplicate` (it is there), `self` (the tag itself),
 * `kind` (a tag of another kind), `cycle` (a ring of nested tags).
 */
export function withMember(content, full, member) {
  const tag = content?.registries?.tag?.[full]
  if (!tag) return { refusal: 'unknown' }
  if (tag.values.includes(member)) return { refusal: 'duplicate' }
  if (member === `#${full}`) return { refusal: 'self' }
  if (member.startsWith('#') && content.registries.tag[member.slice(1)]?.kind !== tag.kind) return { refusal: 'kind' }
  if (tagCycle(content, full, member)) return { refusal: 'cycle' }
  return { values: [...tag.values, member] }
}

/** The tag `full`'s values without `member`. */
export const withoutMember = (content, full, member) => (content?.registries?.tag?.[full]?.values ?? []).filter((v) => v !== member)

/** The operation writing `values` (full names) into the layer's own tag `full`. */
export const tagValuesOp = (namespace, full, values) => ({ op: 'tag.set', tag: localName(namespace, full), path: 'values', value: values.map((v) => writtenName(namespace, v)) })

/** A text with `lang` set to `text`, keeping its other languages and its message key (the layer's own key short). */
export function textWith(namespace, old, lang, text) {
  const base = old && typeof old === 'object' ? Object.fromEntries(textEntries(old)) : typeof old === 'string' && old ? { [lang]: old } : {}
  const key = old && typeof old === 'object' ? textKey(old) : undefined
  return ownText(namespace, key ? { ...base, [lang]: text, $key: key } : { ...base, [lang]: text })
}

/** A text as its layer writes it: the layer's own message key short. */
export function ownText(namespace, text) {
  const key = text && typeof text === 'object' ? textKey(text) : undefined
  return key ? { ...text, $key: localName(namespace, key) ?? key } : text
}

/** The tag as its layer writes it in a tag.put: members and message keys of its own by their short names. */
export function ownTagData(namespace, tag) {
  const { title, desc, ...rest } = tag
  return { ...rest, ...(title !== undefined && { title: ownText(namespace, title) }), ...(desc !== undefined && { desc: ownText(namespace, desc) }), values: tag.values.map((v) => writtenName(namespace, v)) }
}


/** A new empty tag of `kind` in `namespace`: its short name (free among the layer's tags) and the operation. */
export function newTag(content, namespace, kind) {
  const name = freeObjectName(ownNames(content, 'tag', namespace), `new-${kind}`)
  return { name, full: `${namespace}/${name}`, op: { op: 'tag.put', tag: name, data: { kind, values: [] } } }
}
