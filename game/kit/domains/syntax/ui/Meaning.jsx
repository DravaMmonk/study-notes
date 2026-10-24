import { Check, X } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import { ASPECT_NAME, ROLE_NAME, TENSE_NAME } from '../engine/grammar.js'

// A level's goal: the situation the sentence is said in, then the meaning graph: the time on top (it is settled first),
// then the predicate, and an edge from it to each participant with its role. The graph never names the time and the
// viewpoint: the player reads them off the situation, and a run shows the one meant. After a run (`run`, sentence.js
// check) each piece is marked: a tick, or a cross and why it is not what is meant there.

const Mark = ({ result }) => {
  if (!result) return null
  return result.ok
    ? <span className="sx-mark is-ok"><Check size={13} />{tr('对上了', 'Matches')}</span>
    : <span className="sx-mark is-no"><X size={13} /><span dangerouslySetInnerHTML={{ __html: L(result.why) }} /></span>
}
const state = (result) => (!result ? '' : result.ok ? 'is-ok' : 'is-no')

export default function Meaning({ context, meaning, sense, run }) {
  const checked = run?.complete ? run : null
  const roles = Object.entries(meaning.roles)
  return (
    <figure className="sx-meaning" aria-label={tr('语义图', 'Meaning graph')}>
      {context?.length > 0 && (
        <div className="sx-context">
          <span className="sx-context-label">{tr('情境', 'Situation')}</span>
          {context.map((line, k) => <p key={k} dangerouslySetInnerHTML={{ __html: L(line) }} />)}
        </div>
      )}
      <div className={`sx-time ${state(checked?.time)}`}>
        <b>{tr('时间和视角', 'Time and viewpoint')}</b>
        {checked
          ? <span>{tr(`这里要的是${TENSE_NAME[meaning.tense].zh} · ${ASPECT_NAME[meaning.aspect].zh}`, `Meant here: ${TENSE_NAME[meaning.tense].en} ${ASPECT_NAME[meaning.aspect].en}`)}</span>
          : <span>{tr('从情境里判断', 'Judge it from the situation')}</span>}
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
