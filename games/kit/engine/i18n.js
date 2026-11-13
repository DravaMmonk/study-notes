// Translation, apart from the making of a game (games/DIRECTION.md, decision 20). A game's content is written in one
// language, the base: every text in it is { zh: '…' } (or a plain string, which reads the same in every language).
// Another language is an overlay beside the content, games/<id>/i18n/<lang>.json:
//
// A key is the base text. Its value is a translation, or an object with a default and overrides by schema field kind.
// Moving text within a kind preserves its translation. A game plays localized content; authoring reads the base.
import { markupOf } from './markup.js'
import { REF } from './text.js'
import { find, S, TEXT_KINDS } from './schema.js'
import { PARTS_FILE } from './parts/schema.js'

export const TRANSLATION = S.either(S.str(), S.map(S.str(), { keys: `^(?:${['default', ...TEXT_KINDS].join('|')})$` }))
export const OVERLAY = S.map(TRANSLATION)

/** The language content is written in. */
export const BASE = 'zh'

/** Whether `v` is a text as content writes it: { zh } alone. */
export const isBaseText = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && typeof v[BASE] === 'string' && Object.keys(v).length === 1

/** Every base text in `value`, in order, repeats included. */
export function textsIn(value, out = []) {
  if (isBaseText(value)) out.push(value[BASE])
  else if (value && typeof value === 'object') for (const inner of Object.values(value)) textsIn(inner, out)
  return out
}

const shape = (text) => [...String(text).matchAll(REF)].map((m) => `${m[1]}:${m[2]}`).sort().join(' ')

/** Why a translation cannot stand for its base text (null when it can): its markup is broken, or its links differ. */
export function mistranslated(from, to) {
  if (typeof to !== 'string' || !to.trim()) return 'is empty'
  const broken = markupOf(to).problems[0]
  if (broken) return broken
  return shape(from) === shape(to) ? null : `links ${shape(to) || 'nothing'}, its text ${shape(from) || 'nothing'}`
}

/** Return the entries stored for a base text, including the default under its own key. */
export const translationEntries = (entry) => typeof entry === 'string' ? { default: entry } : entry ?? {}

export function translationAt(entry, kind) {
  const variants = translationEntries(entry)
  return (kind === undefined ? undefined : variants[kind]) ?? variants.default
}

/** A root title is typed by the schema of its document; other fields declare their kind directly. */
function titleFields(schema, kind) {
  if (!schema) return null
  if (schema.type === 'obj' && schema.fields.title?.type === 'text') {
    return { ...schema, fields: { ...schema.fields, title: { ...schema.fields.title, textKind: kind } } }
  }
  if (schema.type === 'by') return { ...schema, cases: Object.fromEntries(Object.entries(schema.cases).map(([name, child]) => [name, titleFields(child, kind)])) }
  if (schema.type === 'either') return { ...schema, of: schema.of.map((child) => titleFields(child, kind)) }
  return schema
}

function typedPaths(content, vocabulary) {
  const paths = new Map()
  const add = (schema, value, prefix) => {
    if (!schema) return
    for (const { path, schema: field } of find(schema, value, 'text', { vocabulary })) {
      if (field.textKind) paths.set(JSON.stringify([...prefix, ...path]), field.textKind)
    }
  }
  const game = titleFields(vocabulary?.game, 'gameTitle')
  const level = titleFields(vocabulary?.level, 'levelTitle')
  const { id: _, domain: _domain, vocabulary: _version, open: _open, levels, glossary: _glossary, partDefs, blueprint: _blueprint, i18n: _i18n, ...config } = content
  add(game, config, [])
  levels?.forEach(({ id: _, ...config }, k) => add(level, config, ['levels', k]))
  add(PARTS_FILE, partDefs, ['partDefs'])
  return paths
}

/** The field kinds in which each distinct base text is read. Undefined denotes the default context. */
export function translationContexts(content, vocabulary) {
  const paths = typedPaths(content, vocabulary)
  const contexts = new Map()
  const walk = (value, path) => {
    if (isBaseText(value)) {
      const from = value[BASE]
      if (!contexts.has(from)) contexts.set(from, new Set())
      contexts.get(from).add(paths.get(JSON.stringify(path)))
    } else if (Array.isArray(value)) value.forEach((child, k) => walk(child, [...path, k]))
    else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) walk(child, [...path, key])
  }
  const { i18n: _, blueprint: _blueprint, ...readable } = content
  walk(readable, [])
  return contexts
}

/** Count base texts once. A text is translated when every field where it appears has a sound translation. */
export function translationState(content, vocabulary) {
  const contexts = translationContexts(content, vocabulary)
  return Object.entries(content.i18n ?? {}).map(([lang, memory]) => {
    const wrong = []
    let translated = 0
    let unused = 0
    for (const [from, kinds] of contexts) {
      const variants = translationEntries(memory[from])
      const needed = new Set([...kinds].map((kind) => kind !== undefined && Object.hasOwn(variants, kind) ? kind : 'default'))
      let complete = true
      for (const kind of needed) {
        const to = variants[kind]
        if (to === undefined) {
          complete = false
          continue
        }
        const why = mistranslated(from, to)
        if (why) {
          complete = false
          wrong.push({ from, why, ...(kind === 'default' ? {} : { kind }) })
        }
      }
      if (complete) translated += 1
      unused += Object.keys(variants).filter((kind) => !needed.has(kind)).length
    }
    for (const [from, entry] of Object.entries(memory)) if (!contexts.has(from)) unused += Object.keys(translationEntries(entry)).length
    return { lang, texts: contexts.size, translated, wrong, unused }
  })
}

/** Lay sound translations over the base text, selected by the text field's schema. */
export function localized(content, vocabulary) {
  const { i18n = {}, ...rest } = content
  const langs = Object.entries(i18n)
  if (!langs.length) return rest
  const paths = typedPaths(rest, vocabulary)
  const walk = (value, path) => {
    if (isBaseText(value)) {
      const from = value[BASE]
      const kind = paths.get(JSON.stringify(path))
      const sides = langs.flatMap(([lang, memory]) => {
        const to = translationAt(memory[from], kind)
        return mistranslated(from, to) ? [] : [[lang, to]]
      })
      return { [BASE]: from, ...Object.fromEntries(sides) }
    }
    if (Array.isArray(value)) return value.map((child, k) => walk(child, [...path, k]))
    return value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, walk(child, [...path, key])]))
      : value
  }
  return walk(rest, [])
}
