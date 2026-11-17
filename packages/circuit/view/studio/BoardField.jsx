import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { tr, Area, useDraft } from 'kernel/view'
import { boardSvg } from '../../core/index.js'

/** A board: its drawing (open it in the game's circuit editor, in place), and its blueprint text. */
export default function BoardField({ field, onSet, ctx, label }) {
  const lines = Array.isArray(field.value) ? field.value : []
  const [text, setText] = useState(false)
  const [draft, setDraft, bind] = useDraft(lines.join('\n'))
  let svg = null
  let wrong = null
  try {
    svg = boardSvg(lines)
  } catch (error) {
    wrong = tr(error.zh, error.en) ?? error.message
  }
  return (
    <div className="field-board">
      {svg && (
        <button type="button" className="board-svg is-thumb" onClick={() => ctx.onBoard?.(field.path)} aria-label={tr(`在电路编辑器里改 ${label}`, `Edit ${label} in the circuit editor`)} disabled={!ctx.onBoard}>
          <span dangerouslySetInnerHTML={{ __html: svg }} />
          {ctx.onBoard && <span className="board-edit"><Pencil size={13} aria-hidden="true" /></span>}
        </button>
      )}
      {wrong && <p className="field-bad">{wrong}</p>}
      <button type="button" className={`kit-btn is-label board-text ${text ? 'is-on' : ''}`} onClick={() => setText(!text)}>{tr('蓝图文本')}</button>
      {text && <Area className="is-code" value={draft} aria-label={label} spellCheck={false} bind={{ ...bind, onBlur: () => { bind.onBlur(); if (draft !== lines.join('\n')) onSet(draft.replace(/\n+$/, '').split('\n')) } }} onChange={setDraft} />}
    </div>
  )
}
