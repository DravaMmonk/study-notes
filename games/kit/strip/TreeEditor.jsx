import { forwardRef, useImperativeHandle, useMemo } from 'react'
import { useHistory } from '../circuit/useHistory.js'
import { L, tr } from '../shell/i18n.js'
import { Chips, Strip, StripTools, useStrip } from './index.js'

const keyOf = (path) => ['r', ...path].join('.')
const pathOf = (key) => key.split('.').slice(1).map(Number)

// A language supplies tree operations, how to write the tree, and where its chips fit.
const TreeEditor = forwardRef(function TreeEditor({
  tree, onChange, chips, groups, scope, label, model, warning,
}, ref) {
  const byKey = useMemo(() => new Map(chips.map((chip) => [chip.key, chip])), [chips])
  const history = useHistory(tree, onChange, scope, 0)
  const holes = model.holesOf(tree)
  const strip = useStrip({
    put: (slot, key) => {
      const path = pathOf(slot)
      const chip = byKey.get(key)
      const refusal = model.refuse?.(tree, path, chip)
      if (refusal) return refusal
      const previous = model.nodeAt(tree, path)
      const piece = chip.make(tree)
      onChange(model.setAt(tree, path, previous ? model.setAt(piece, [0], previous) : piece))
      return null
    },
    take: (slot) => onChange(model.setAt(tree, pathOf(slot), null)),
    target: (key) => {
      const chip = byKey.get(key)
      const hole = holes.find((item) => model.accepts?.(item, chip) ?? true)
      const path = hole?.path ?? (chip.leads ? model.joinsOnto(tree, key) : null)
      return path ? keyOf(path) : null
    },
    filled: (slot) => model.nodeAt(tree, pathOf(slot)) !== null,
    fixed: () => false,
  })
  useImperativeHandle(ref, () => ({ clearSelection: strip.clearSelection }), [strip])
  const next = strip.selected ?? (holes[0] ? keyOf(holes[0].path) : model.complete(tree) ? 'end' : null)
  const note = strip.note ?? (warning ? { bad: true, text: warning } : null)
  return <>
    <StripTools history={history} onClear={() => onChange(null)} empty={!tree} />
    <Strip line={[model.segment(tree)]} label={label} next={next} selected={strip.selected} flash={strip.flash} onSlot={strip.onSlot} />
    {note
      ? <p className={`ks-note ${note.bad ? 'is-bad' : ''}`} role="status">{L(note.text)}</p>
      : <p className="ks-note">{tr('点击文字可以删除。')}</p>}
    <Chips groups={groups} onChip={strip.onChip} />
  </>
})

export default TreeEditor
