import { creationChoices, blank, getAt, showPath, shapeAt } from 'kernel/view'
import { PARTS_FILE } from '../../core/index.js'
import { DEFAULT_VIEWS } from '../parts/PartFace.jsx'

export function onPartPage(m, { content, ops, shown, edit, pickField, vocabulary, playOrder }) {
  const base = ['parts', m.part]
  const def = getAt(content?.partDefs, base)
  if (!def) return undefined
  const [key, face] = m.path
  if (key === 'views' && face) {
    const path = [...base, 'views', face]
    const pending = [...ops].reverse().find((op) => op.op === 'parts.set' && !shown?.ops.includes(op) && showPath(op.path) === showPath(path))
    const existing = pending?.value ?? def.views?.[face]
    const list = existing ?? DEFAULT_VIEWS[face]
    const write = (value) => edit({ op: 'parts.set', path, value })
    if (!existing) write(list)
    return pickField(m.type === 'pick' ? [...base, ...m.path] : path, m.type === 'pick', list)
  }
  if (m.type === 'pick' || (m.part !== undefined && key === 'settings' && m.path.length === 1)) {
    return pickField([...base, ...m.path], true)
  }
  // An item added to a list of the part: blank as its schema has it (a rule and a check, one that already reads).
  const path = [...base, ...m.path]
  const schema = shapeAt(PARTS_FILE, content.partDefs, path, { vocabulary: vocabulary })
  if (schema?.type !== 'list') return undefined
  if (creationChoices(schema.of, { vocabulary: vocabulary }).length > 1) return pickField(path)
  const list = getAt(content.partDefs, path) ?? []
  const blankOf = { rules: { set: {} }, checks: { holds: 'circuit:eq(1, 1)', say: { en: '' } } }
  edit({ op: 'parts.set', path, value: [...list, (m.path.length === 1 && blankOf[key]) || blank(schema.of, { vocabulary: vocabulary, levels: playOrder })] })
  return pickField([...path, list.length], true)
}
