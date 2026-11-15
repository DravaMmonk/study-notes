import { Fragment, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { L, tr } from '../i18n.js'
import RunDock from '../RunDock.jsx'
import { checkAction } from '../useCheckOnce.js'
import PlayLayout from './PlayLayout.jsx'
import { inspectWork, useCheckedWork } from './useWork.js'
import WorkGoal from './WorkGoal.jsx'

function Slot({ slot, write }) {
  const { value, locked, options, groups, label, prefix, blank } = slot
  if (slot.kind === 'toggle') return (
    <span className="fr-toggles">
      <span className="fr-keyword">{L(label)}</span>
      {options.map((item) => {
        const on = value.includes(item.value)
        return (
          <button key={item.value} type="button" disabled={locked} aria-pressed={on} onClick={(event) => {
            event.stopPropagation()
            write(on ? value.filter((name) => name !== item.value) : [...value, item.value])
          }}>{L(item.text)}</button>
        )
      })}
    </span>
  )
  const choice = (item) => <option key={item.value} value={item.value}>{L(item.text)}</option>
  const select = (
    <select className={prefix ? undefined : 'fr-slot'} disabled={locked} value={value ?? ''} onChange={(e) => write(e.target.value)} aria-label={L(label)}>
      <option value="">{L(blank) ?? '…'}</option>
      {options.map(choice)}
      {groups?.map((group) => <optgroup key={L(group.label)} label={L(group.label)}>{group.options.map(choice)}</optgroup>)}
    </select>
  )
  return prefix ? <label className="fr-prefixed"><span className="fr-keyword">{L(prefix)}</span>{select}</label> : select
}

export default function FieldRows({ screen, resource, play }) {
  const [at, setAt] = useState(null)
  const { work: rows, verdict, check, change } = useCheckedWork(screen, {
    read: (saved) => saved?.rows ?? resource.initial,
    write: (rows) => ({ rows }),
  }, inspectWork(play, resource.judge))
  const put = (i, key, value) => change(rows.map((row, k) => i === k ? { ...row, [key]: value } : row))
  const add = (make) => {
    const where = at === null ? rows.length : at + 1
    change([...rows.slice(0, where), make(), ...rows.slice(where)])
    setAt(where)
  }
  const remove = (i) => {
    change(rows.filter((_, k) => i !== k))
    setAt(null)
  }
  const locked = resource.locked
  const stage = (
    <div className={play.stage}>
      <WorkGoal premises={resource.premises} goal={resource.goal} />
      <ol className="fr-rows">
        {resource.describe(rows).map(({ label, name, depth, opens, closes, slots }, i) => {
          const why = verdict?.failure?.at?.row === i ? verdict.failure.why : null
          return (
            <Fragment key={i}>
              <li className={`fr-row ${at === i ? 'is-on' : ''} ${why ? 'is-fail' : ''}`} style={{ '--depth': depth }} onClick={() => !locked && setAt(i)}>
                <div className="fr-line">
                  <b className="fr-keyword">{label}</b>
                  {name && <code className="fr-name">{name}</code>}
                  {slots.map((slot) => <Slot key={slot.key} slot={slot} write={(value) => put(i, slot.key, value)} />)}
                  {!locked && <button type="button" className="fr-remove" aria-label={tr('删除这一行', 'Remove this row')} onClick={(event) => { event.stopPropagation(); remove(i) }}><X size={14} /></button>}
                </div>
                {why && <p className="fr-error">{L(why)}</p>}
              </li>
              {opens && <li className="fr-region" style={{ '--depth': depth }}>proof</li>}
              {closes.map((at) => <li key={at} className="fr-region" style={{ '--depth': at }}>qed</li>)}
            </Fragment>
          )
        })}
      </ol>
      {!locked && <div className="fr-add">{resource.add.map(({ label, make }) => <button key={label} type="button" onClick={() => add(make)}><Plus size={13} />{label}</button>)}</div>}
    </div>
  )
  const pass = Boolean(verdict?.pass)
  const results = verdict && <p className={`lg-verdict ${pass ? 'is-pass' : 'is-fail'}`} role="status">{L(pass ? resource.passed : verdict.failure.why)}</p>
  const dock = <RunDock go={checkAction(check, pass)} />
  return <PlayLayout screen={screen} play={play} stage={stage} results={results} dock={dock} />
}
