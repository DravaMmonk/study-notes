import { sameJson } from '../engine/json-value.js'
import { getAt, setAt } from '../engine/ops/edit.js'
import { PARTS_FILE } from '../engine/parts/schema.js'
import { validate } from '../engine/schema.js'
import { GLOSSARY } from '../engine/vocabulary.js'
import { tr } from '../shell/i18n.js'
import { changesType, opFor, taskListOps } from './form.js'

const changedKeys = (before, after) => [...new Set([...Object.keys(before), ...Object.keys(after)])]
  .filter((key) => !sameJson(before[key], after[key]))

/** Plan an edit against the current preview while keeping definition and task identity operations intact. */
export function sourceOps(file, before, path, value, vocabulary, levels) {
  const after = setAt(before, path, value)
  if (sameJson(before, after)) return []
  const schema = file.level ? vocabulary.level : file.parts ? PARTS_FILE : file.glossary ? GLOSSARY : vocabulary.game
  if (changesType(schema, before, after, vocabulary)) {
    throw new Error(tr('已有配置的类型不能直接更改。请删除旧项后新增。', 'Delete the existing configuration and add a new one to change its type.'))
  }
  const existing = new Set(validate(schema, before, { vocabulary }).map(({ at, says }) => `${at}: ${says}`))
  const invalid = validate(schema, after, { vocabulary }).find(({ at, says }) => !existing.has(`${at}: ${says}`))
  if (invalid) throw new Error(`${invalid.at}: ${invalid.says}`)
  const op = (keys, next) => opFor(file, keys, next === undefined ? { unset: true } : { set: next })

  if (file.glossary) return [{ op: 'glossary.replace', data: after }]
  if (file.parts) {
    const edits = []
    for (const group of ['parts', 'settings']) {
      const old = before[group] ?? {}
      const next = after[group] ?? {}
      for (const id of changedKeys(old, next)) {
        if (!Object.hasOwn(old, id) || !Object.hasOwn(next, id)) {
          throw new Error(tr('请用列表中的新增或删除按钮管理件和设置。', 'Use the list controls to add or delete pieces and settings.'))
        }
        for (const key of changedKeys(old[id], next[id])) edits.push(op([group, id, key], next[id][key]))
      }
    }
    return edits
  }
  if (file.level && path[0] === 'tasks' && path.length > 1) {
    const idPath = [...path.slice(0, 2), 'id']
    const oldId = getAt(before, idPath)
    const newId = getAt(after, idPath)
    if (oldId !== newId) {
      const rename = { op: 'task.rename', task: oldId, to: newId }
      return path.length === 2 ? [rename, op(path, value)] : [rename]
    }
  }
  if (file.level && path.length === 1 && path[0] === 'tasks') return taskListOps(file.level, before.tasks ?? [], after.tasks, levels)
  if (path.length) return [op(path, value)]
  return changedKeys(before, after).flatMap((key) => file.level && key === 'tasks'
    ? taskListOps(file.level, before.tasks ?? [], after.tasks, levels)
    : [op([key], after[key])])
}
