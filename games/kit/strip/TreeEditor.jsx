import { forwardRef, useImperativeHandle, useMemo } from 'react'
import { L, tr } from '../shell/i18n.js'
import { useHistory } from '../circuit/useHistory.js'
import { Chips, Strip } from './Strip.jsx'
import { StripTools } from './StripTools.jsx'
import { useStrip } from './useStrip.js'
import { treeKey, treePath } from './tree.js'

/** Edit a work on a strip. The language describes its tree, pieces, accepted holes and text. */
const TreeEditor = forwardRef(function TreeEditor({ tree, onChange, chips, language, scope }, ref) {
  const { nodeAt, setAt, holesOf, joinsOnto, complete } = language
  const byKey = useMemo(() => new Map(chips.map((chip) => [chip.key, chip])), [chips])
  const history = useHistory(tree, onChange, scope, 0)
  const accepts = (hole, chip) => (language.accepts?.(hole, chip) ?? true) && !language.refuse?.(tree, hole.path, chip)
  const strip = useStrip({
    put: (slot, key) => {
      const path = treePath(slot)
      const chip = byKey.get(key)
      const refused = language.refuse?.(tree, path, chip)
      if (refused) return refused
      const made = chip.make(tree)
      const last = nodeAt(tree, path)
      onChange(setAt(tree, path, last ? setAt(made, [0], last) : made))
      return null
    },
    take: (slot) => onChange(setAt(tree, treePath(slot), null)),
    target: (key) => {
      const chip = byKey.get(key)
      const hole = holesOf(tree).find((hole) => accepts(hole, chip))
      const path = hole?.path ?? (chip.leads ? joinsOnto(tree, key) : null)
      return path ? treeKey(path) : null
    },
    filled: (slot) => nodeAt(tree, treePath(slot)) !== null,
    fixed: () => false,
  })
  useImperativeHandle(ref, () => ({ clearSelection: strip.clearSelection }), [strip])
  const first = holesOf(tree)[0]
  const next = strip.selected ?? (first ? treeKey(first.path) : complete(tree) ? 'end' : null)
  const groups = language.groups.map(([key, label]) => ({
    key, label,
    chips: chips.filter((chip) => chip.group === key).map((chip) => ({
      key: chip.key, family: key, text: language.chipText?.(chip) ?? chip.text, sub: chip.sub,
    })),
  })).filter((group) => group.chips.length)
  const problem = language.problem?.(tree)
  const note = strip.note ?? (problem ? { text: problem, bad: true } : null)
  return (
    <>
      <StripTools history={history} onClear={() => onChange(null)} empty={!tree} />
      <Strip line={language.line(tree)} label={language.label} next={next} selected={strip.selected} flash={strip.flash} onSlot={strip.onSlot} />
      {note ? <p className={`ks-note ${note.bad ? 'is-bad' : ''}`} role="status">{L(note.text)}</p> : <p className="ks-note">{tr('点击文字可以删除。')}</p>}
      <Chips groups={groups} onChip={strip.onChip} />
    </>
  )
})

export default TreeEditor
