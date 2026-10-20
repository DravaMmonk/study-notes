import { tr } from '../../../shell/i18n.js'

// The sentence the strip says, once every slot is filled, with its word count against the level's target (the ★)
// and the best so far.

export default function Sentence({ run, target, best }) {
  return (
    <p className="sx-sentence">
      {run.complete ? <q>{run.sentence}</q> : <span className="sx-pending">{tr('句子还没填完', 'The sentence is not finished')}</span>}
      <span className="sx-count">
        {run.complete ? tr(`${run.words} 个词`, `${run.words} words`) : null}
        {target ? tr(` · ★ 不超过 ${target} 个词`, ` · ★ at most ${target} words`) : null}
        {best ? tr(` · 最好 ${best.words} 个词${target && best.star ? ' ★' : ''}`, ` · best ${best.words} words${target && best.star ? ' ★' : ''}`) : null}
      </span>
    </p>
  )
}
