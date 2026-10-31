import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import Sheet from '../../../shell/Sheet.jsx'
import { show } from '../formula.js'
import { complete, straysOf } from '../formulaTree.js'
import { say } from '../notation.js'
import SentenceEditor from './SentenceEditor.jsx'

// Where a sentence is filled in (《证明完毕》: a test case's premises and goal, a proof card's setting), it is built on the
// strip in a sheet (SentenceEditor.jsx), as a premise on the rule table is: a button shows the sentence, and opens the
// sheet to build or change it. As in the other sheets a change holds at once: each time the sentence is whole it is
// the value; one never finished leaves the value as it was.
//
//   value  sentence text ('' none)      onChange(text)      build  { chips, notation, read(text) → formula, say?(formula) }
//   title  the sheet's      placeholder  what the button says with no sentence      scope  the history's

const whole = (tree) => Boolean(tree) && complete(tree) && !straysOf(tree).length
// A sentence in words: the build's own way (`say`, a proof card's: each letter as this test's sentence), else the level's.
const words = (build, text) => (build.say ? build.say(build.read(text)) : L(say(build.read(text), build.notation)))

/** The sheet that builds one sentence; `onWhole(text)` each time it is whole. */
function SentenceSheet({ start, build, title, scope, onWhole, onClose }) {
  const [tree, setTree] = useState(start)
  const change = (next) => {
    setTree(next)
    if (whole(next)) onWhole(show(next))
  }
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="lg-rt-sheet">
        <SentenceEditor tree={tree} onChange={change} chips={build.chips} notation={build.notation} scope={scope} />
      </div>
    </Sheet>
  )
}

/** One sentence: a button that shows it and opens the sheet; `clearable`, a × beside it empties it again. */
export function SentenceButton({ value, onChange, build, title, placeholder, scope, disabled = false, clearable = false }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span className="lg-pick-item">
        <button type="button" className={`lg-pick-sentence ${value ? '' : 'is-empty'}`} disabled={disabled} onClick={() => setOpen(true)}>
          {value ? words(build, value) : L(placeholder)}
        </button>
        {clearable && value && !disabled && <button type="button" className="lg-pick-drop" onClick={() => onChange('')} aria-label={tr('清空', 'Clear')}><X size={12} /></button>}
      </span>
      {open && <SentenceSheet start={value ? build.read(value) : null} build={build} title={L(title)} scope={scope} onWhole={onChange} onClose={() => setOpen(false)} />}
    </>
  )
}

/** A list of sentences: each opens the sheet, × takes it off, the last button adds one; `kept` ones stay as they are. */
export function SentenceList({ value, onChange, build, title, addLabel, scope, kept = [] }) {
  const [at, setAt] = useState(null) // the sentence being built: its index, or value.length for a new one
  const put = (text) => {
    const next = value.map((s, k) => (k === at ? text : s))
    onChange(at === value.length ? [...value, text] : next)
  }
  return (
    <span className="lg-pick-list">
      {value.map((s, k) => (
        <span key={`${k}:${s}`} className="lg-pick-item">
          <button type="button" className="lg-pick-sentence" disabled={kept.includes(s)} onClick={() => setAt(k)}>{words(build, s)}</button>
          {!kept.includes(s) && <button type="button" className="lg-pick-drop" onClick={() => onChange(value.filter((_, j) => j !== k))} aria-label={tr(`去掉「${words(build, s)}」`, `Take off “${words(build, s)}”`)}><X size={12} /></button>}
        </span>
      ))}
      <button type="button" className="lg-pick-add" onClick={() => setAt(value.length)}><Plus size={13} />{L(addLabel)}</button>
      {at !== null && <SentenceSheet start={value[at] ? build.read(value[at]) : null} build={build} title={L(title)} scope={`${scope}:${at}`} onWhole={put} onClose={() => setAt(null)} />}
    </span>
  )
}
