import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import Popover from '../../../shell/Popover.jsx'
import { show } from '../formula.js'
import { complete, straysOf } from '../formulaTree.js'
import { say } from '../notation.js'
import SentenceEditor from './SentenceEditor.jsx'

// Where a sentence is filled in (《证明完毕》: a test case's premises and goal, a proof card's setting), it is built on the
// strip (SentenceEditor.jsx), as a premise on the rule table is: a button shows the sentence, and opens the editor to
// build or change it, beside the button on a desktop and in a sheet on a phone (Popover.jsx). A change holds at once:
// each time the sentence is whole it is the value; one never finished leaves the value as it was.
//
//   value  sentence text ('' none)      onChange(text)      build  { chips, notation, read(text) → formula, say?(formula) }
//   title  the sheet's      placeholder  what the button says with no sentence      scope  the history's

const whole = (tree) => Boolean(tree) && complete(tree) && !straysOf(tree).length
// A sentence in words: the build's own way (`say`, a proof card's: each letter as this test's sentence), else the level's.
const words = (build, text) => (build.say ? build.say(build.read(text)) : L(say(build.read(text), build.notation)))

/** The editor of one sentence, by the button `anchor`; `onWhole(text)` each time it is whole. */
function SentenceBox({ anchor, start, build, title, scope, onWhole, onClose }) {
  const [tree, setTree] = useState(start)
  const change = (next) => {
    setTree(next)
    if (whole(next)) onWhole(show(next))
  }
  return (
    <Popover anchor={anchor} title={title} onClose={onClose}>
      <div className="lg-sentence-box">
        <SentenceEditor tree={tree} onChange={change} chips={build.chips} notation={build.notation} scope={scope} />
      </div>
    </Popover>
  )
}

/** One sentence: a button that shows it and opens the editor; `clearable`, a × beside it empties it again. */
export function SentenceButton({ value, onChange, build, title, placeholder, scope, disabled = false, clearable = false }) {
  const [anchor, setAnchor] = useState(null)
  return (
    <>
      <span className="lg-pick-item">
        <button type="button" className={`lg-pick-sentence ${value ? '' : 'is-empty'}`} aria-expanded={Boolean(anchor)} disabled={disabled} onClick={(event) => setAnchor(event.currentTarget)}>
          {value ? words(build, value) : L(placeholder)}
        </button>
        {clearable && value && !disabled && <button type="button" className="lg-pick-drop" onClick={() => onChange('')} aria-label={tr('清空', 'Clear')}><X size={12} /></button>}
      </span>
      {anchor && <SentenceBox anchor={anchor} start={value ? build.read(value) : null} build={build} title={L(title)} scope={scope} onWhole={onChange} onClose={() => setAnchor(null)} />}
    </>
  )
}

/** A list of sentences: each opens the editor, × takes it off, the last button adds one; `kept` ones stay as they are. */
export function SentenceList({ value, onChange, build, title, addLabel, scope, kept = [] }) {
  const [open, setOpen] = useState(null) // { at, anchor }: the sentence being built (its index, or value.length for a new one) and its button
  const put = (text) => {
    const next = value.map((s, k) => (k === open.at ? text : s))
    onChange(open.at === value.length ? [...value, text] : next)
  }
  const pick = (at) => (event) => setOpen({ at, anchor: event.currentTarget })
  return (
    <span className="lg-pick-list">
      {value.map((s, k) => (
        <span key={k} className="lg-pick-item">
          <button type="button" className="lg-pick-sentence" aria-expanded={open?.at === k} disabled={kept.includes(s)} onClick={pick(k)}>{words(build, s)}</button>
          {!kept.includes(s) && <button type="button" className="lg-pick-drop" onClick={() => onChange(value.filter((_, j) => j !== k))} aria-label={tr(`去掉「${words(build, s)}」`, `Take off “${words(build, s)}”`)}><X size={12} /></button>}
        </span>
      ))}
      <button type="button" className="lg-pick-add" aria-expanded={open?.at === value.length} onClick={pick(value.length)}><Plus size={13} />{L(addLabel)}</button>
      {open && <SentenceBox key={open.at} anchor={open.anchor} start={value[open.at] ? build.read(value[open.at]) : null} build={build} title={L(title)} scope={`${scope}:${open.at}`} onWhole={put} onClose={() => setOpen(null)} />}
    </span>
  )
}
