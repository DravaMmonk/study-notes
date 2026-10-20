import { L, tr } from '../../../shell/i18n.js'
import { PORT_LABEL } from '../engine/grammar.js'

// What the board says right now, word group by word group, each coloured by the port it fills; a port still open is
// a dashed gap named after it. Under it, the word count against the level's target (the ★).

const PORT_CLASS = { SUBJ: 'is-subj', VP: 'is-vp', OBJ: 'is-obj', IOBJ: 'is-rec', TO: 'is-rec' }

export default function Sentence({ run, target, best }) {
  const groups = run.groups
  return (
    <div className="sx-sentence">
      <p className="sx-words" aria-live="polite">
        {groups.map((g, k) => (g.gap
          ? <span key={k} className="sx-gap">{L(PORT_LABEL[g.port])}</span>
          : <span key={k} className={`${PORT_CLASS[g.port] ?? ''} ${g.partial ? 'is-partial' : ''}`}>{k === 0 ? g.text.charAt(0).toUpperCase() + g.text.slice(1) : g.text}</span>
        )).reduce((out, el, k) => (k ? [...out, ' ', el] : [el]), [])}
        {run.complete && '.'}
      </p>
      <p className="sx-count">
        {run.complete ? tr(`${run.words} 个词`, `${run.words} words`) : tr('还有口空着', 'Some ports are still open')}
        {target ? <span>{tr(` · ★ 不超过 ${target} 个词`, ` · ★ at most ${target} words`)}</span> : null}
        {best ? <span>{tr(` · 最好 ${best.words} 个词${target && best.star ? ' ★' : ''}`, ` · best ${best.words} words${target && best.star ? ' ★' : ''}`)}</span> : null}
      </p>
    </div>
  )
}
