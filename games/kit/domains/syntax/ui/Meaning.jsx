import { Check, X } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import { ASPECT_NAME, ROLE_NAME, TENSE_NAME } from '../engine/grammar.js'

// A level's meaning graph, the goal of every syntax level: the time on top (it is settled first), then the predicate,
// and an edge from it to each participant with its role. After a run (`run`, sentence.js check) each piece is marked: a tick, or a cross
// and what the sentence said there instead.

const Mark = ({ result }) => {
  if (!result) return null
  return result.ok
    ? <span className="sx-mark is-ok"><Check size={13} />{tr('对上了', 'Matches')}</span>
    : <span className="sx-mark is-no"><X size={13} />{L(result.why)}</span>
}
const state = (result) => (!result ? '' : result.ok ? 'is-ok' : 'is-no')

export default function Meaning({ meaning, sense, run }) {
  const checked = run?.complete ? run : null
  const roles = Object.entries(meaning.roles)
  return (
    <figure className="sx-meaning" aria-label={tr('语义图', 'Meaning graph')}>
      <div className={`sx-time ${state(checked?.time)}`}>
        <b>{tr(`${TENSE_NAME[meaning.tense].zh} · ${ASPECT_NAME[meaning.aspect].zh}`, `${TENSE_NAME[meaning.tense].en} ${ASPECT_NAME[meaning.aspect].en}`)}</b>
        <span>{L(meaning.gloss)}</span>
        <Mark result={checked?.time} />
      </div>
      <div className={`sx-pred ${state(checked?.pred)}`}>
        <b>{L(sense)}</b>
        {checked?.pred ? <Mark result={checked.pred} /> : <small>{tr('发生的事', 'what happens')}</small>}
      </div>
      <div className="sx-edges" style={{ '--n': roles.length }}>
        {roles.map(([role, thing]) => (
          <div key={role} className={`sx-edge ${state(checked?.roles[role])}`} data-role={role}>
            <span className="sx-role">{L(ROLE_NAME[role])}</span>
            <span className="sx-thing">
              <b>{L(thing.label)}</b>
              <small>{thing.number === 'sg' ? tr('单数', 'singular') : tr('复数', 'plural')}{thing.note ? ` · ${L(thing.note)}` : ''}</small>
            </span>
            <Mark result={checked?.roles[role]} />
          </div>
        ))}
      </div>
      {checked?.extra.length > 0 && (
        <p className="sx-mark is-no sx-extra"><X size={13} />{tr(`句子里多出了${checked.extra.map((r) => ROLE_NAME[r].zh).join('、')}`, `The sentence has an extra ${checked.extra.map((r) => ROLE_NAME[r].en).join(', ')}`)}</p>
      )}
    </figure>
  )
}
