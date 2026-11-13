import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import Popover from '../shell/Popover.jsx'
import TreeEditor from './TreeEditor.jsx'

// A single value or list of values edited as trees. A language supplies the chips, serialization and display.
function TreeBox({ anchor, start, build, title, scope, onWhole, onClose }) {
  const [tree, setTree] = useState(start)
  const change = (next) => {
    setTree(next)
    if (build.ready(next)) onWhole(build.write(next))
  }
  return (
    <Popover anchor={anchor} title={title} onClose={onClose}>
      <div className="ks-tree-box">
        <TreeEditor tree={tree} onChange={change} chips={build.chips} language={build.language} scope={scope} />
      </div>
    </Popover>
  )
}

/** One value: a button that shows it and opens the editor; `clearable`, a × beside it empties it again. */
export function TreeButton({ value, onChange, build, title, placeholder, scope, disabled = false, clearable = false }) {
  const [anchor, setAnchor] = useState(null)
  return (
    <>
      <span className="ks-pick-item">
        <button type="button" className={`ks-pick-sentence ${value ? '' : 'is-empty'}`} aria-expanded={Boolean(anchor)} disabled={disabled} onClick={(event) => setAnchor(event.currentTarget)}>
          {value ? L(build.text(value)) : L(placeholder)}
        </button>
        {clearable && value && !disabled && <button type="button" className="ks-pick-drop" onClick={() => onChange('')} aria-label={tr('清空')}><X size={12} /></button>}
      </span>
      {anchor && <TreeBox anchor={anchor} start={value ? build.read(value) : null} build={build} title={L(title)} scope={scope} onWhole={onChange} onClose={() => setAnchor(null)} />}
    </>
  )
}

/** A list of values: each opens the editor, × takes it off, the last button adds one; `kept` ones stay as they are. */
export function TreeList({ value, onChange, build, title, addLabel, scope, kept = [] }) {
  const [open, setOpen] = useState(null) // { at, anchor }: the sentence being built (its index, or value.length for a new one) and its button
  const put = (text) => {
    const next = value.map((s, k) => (k === open.at ? text : s))
    onChange(open.at === value.length ? [...value, text] : next)
  }
  const pick = (at) => (event) => setOpen({ at, anchor: event.currentTarget })
  return (
    <span className="ks-pick-list">
      {value.map((s, k) => (
        <span key={k} className="ks-pick-item">
          <button type="button" className="ks-pick-sentence" aria-expanded={open?.at === k} disabled={kept.includes(s)} onClick={pick(k)}>{L(build.text(s))}</button>
          {!kept.includes(s) && <button type="button" className="ks-pick-drop" onClick={() => onChange(value.filter((_, j) => j !== k))} aria-label={tr(`去掉「${L(build.text(s))}」`, `Take off “${L(build.text(s))}”`)}><X size={12} /></button>}
        </span>
      ))}
      <button type="button" className="ks-pick-add" aria-expanded={open?.at === value.length} onClick={pick(value.length)}><Plus size={13} />{L(addLabel)}</button>
      {open && <TreeBox key={open.at} anchor={open.anchor} start={value[open.at] ? build.read(value[open.at]) : null} build={build} title={L(title)} scope={`${scope}:${open.at}`} onWhole={put} onClose={() => setOpen(null)} />}
    </span>
  )
}
