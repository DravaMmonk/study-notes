import { referenceKey, resolveReferences, sourceValue } from '../engine/catalogs.js'
import { isText, textKey } from '../engine/i18n.js'
import { sameJson } from '../engine/json-value.js'
import { getAt, showPath } from '../engine/ops/edit.js'
import { setAt } from '../engine/ops/identity.js'
import { PARTS_FILE } from '../engine/parts/schema.js'
import { find, validate } from '../engine/schema.js'
import { GLOSSARY } from '../engine/vocabulary.js'
import { tr } from '../shell/i18n.js'
import { changesType, gameFields, opFor, taskListOps } from './form.js'
import { objectSchema } from './object-file.js'

const changedKeys = (before, after) => [...new Set([...Object.keys(before), ...Object.keys(after)])]
  .filter((key) => !sameJson(before[key], after[key]))

/** Read raw configuration references against the pending preview's owning scope. */
function sourceTexts(file, content) {
  const texts = new Map()
  const visit = (value) => {
    const key = textKey(value)
    if (key) texts.set(key, value)
    else if (value && typeof value === 'object') Object.values(value).forEach(visit)
  }
  visit(file.game ? gameFields(content) : file.object ? content.registries : [content.levels, content.glossary, content.partDefs])
  return (key) => {
    if (!texts.has(key)) throw new Error(tr(`当前配置的语言文件里没有文案键 @${key}。`, `No text for @${key} in this configuration's language files.`))
    return texts.get(key)
  }
}

/** Plan a raw configuration edit while keeping catalog, definition, and task identities intact. */
export function sourceOps(file, before, path, value, vocabulary, content) {
  const source = sourceValue(before)
  const edited = setAt(source, path, value)
  if (sameJson(source, edited)) return []
  const schema = file.object ? objectSchema(file.object.kind, file.object) : file.level ? vocabulary.level : file.parts ? PARTS_FILE : file.glossary ? GLOSSARY : vocabulary.game
  const existingLiterals = new Set(find(schema, before, 'text', { vocabulary })
    .map(({ value }) => value).filter((value) => typeof value === 'string'))
  const inline = find(schema, edited, 'text', { vocabulary }).find(({ path, value }) =>
    isText(value) || (typeof value === 'string' && !referenceKey(value) && !existingLiterals.has(value) && typeof getAt(before, path) !== 'string'))
  if (inline) {
    const at = showPath(inline.path)
    throw new Error(tr(`${at}：请在文案页编辑各语言的文字。`, `${at}: edit language text in the Copy tab.`))
  }
  const after = resolveReferences(edited, sourceTexts(file, content))
  if (changesType(schema, before, after, vocabulary)) {
    throw new Error(tr('已有配置的类型不能直接更改。请删除旧项后新增。', 'Delete the existing configuration and add a new one to change its type.'))
  }
  const existing = new Set(validate(schema, before, { vocabulary }).map(({ at, says }) => `${at}: ${says}`))
  const invalid = validate(schema, after, { vocabulary }).find(({ at, says }) => !existing.has(`${at}: ${says}`))
  if (invalid) throw new Error(`${invalid.at}: ${invalid.says}`)
  const op = (keys, next) => opFor(file, keys, next === undefined ? { unset: true } : { set: next })

  if (file.glossary) {
    const old = Object.fromEntries(before.entries.map(({ id, group: _group, ...entry }) => [id, entry]))
    const next = Object.fromEntries(after.entries.map(({ id, group: _group, ...entry }) => [id, entry]))
    const ops = changedKeys(old, next).map((entry) => next[entry] === undefined ? { op: 'entry.remove', entry } : { op: 'entry.put', entry, data: next[entry] })
    const oldGroups = Object.fromEntries(before.groups.filter((g) => g.id).map((g) => [g.id, g]))
    const newGroups = Object.fromEntries(after.groups.filter((g) => g.id).map((g) => [g.id, g]))
    for (const tag of changedKeys(oldGroups, newGroups)) {
      const group = newGroups[tag]
      if (!group) ops.push({ op: 'tag.remove', tag })
      else ops.push({ op: 'tag.put', tag, data: { ...sourceValue(content.tags?.[tag]), kind: 'entry', title: group.title, values: group.values ?? after.entries.filter((e) => e.group === tag).map((e) => e.id) } })
    }
    if (after.entries.some((entry) => before.entries.find((old) => old.id === entry.id)?.group !== entry.group)) throw new Error(tr('请通过词条标签修改分组。', 'Edit encyclopedia membership through entry tags.'))
    return ops
  }
  if (file.parts) {
    const edits = []
    for (const group of ['parts', 'settings']) {
      const old = before[group] ?? {}
      const next = after[group] ?? {}
      for (const id of changedKeys(old, next)) {
        if (!Object.hasOwn(old, id) || !Object.hasOwn(next, id)) {
          throw new Error(tr('请用列表中的新增或删除按钮管理件和设置。', 'Use the list controls to add or delete parts and settings.'))
        }
        for (const key of changedKeys(old[id], next[id])) edits.push(op([group, id, key], next[id][key]))
      }
    }
    return edits
  }
  if (file.level && path.length === 1 && path[0] === 'tasks') return taskListOps(file.level, before.tasks ?? [], after.tasks, content.levels)
  if (path.length) return [op(path, getAt(after, path))]
  return changedKeys(before, after).flatMap((key) => file.level && key === 'tasks'
    ? taskListOps(file.level, before.tasks ?? [], after.tasks, content.levels)
    : [op([key], after[key])])
}
