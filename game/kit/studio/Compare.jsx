// Comparing a level, field by field (diff.js, DiffView.jsx): with another level side by side (the one to copy from,
// or its sibling in a parallel branch), with itself before the pending changeset, or with itself as git holds it at
// a revision (the history tool: the last commit by default). A field's path goes to that field of the level.
import { useEffect, useMemo, useState } from 'react'
import { tr } from '../shell/i18n.js'
import { call } from './api.js'
import { fieldDiff } from './diff.js'
import { DiffFields } from './DiffView.jsx'
import { Picker } from './Picker.jsx'

const bare = (level) => (level ? (({ id: _, ...v }) => v)(level) : undefined)

export default function Compare({ game, content, base, at, levelOptions, onJump }) {
  const [left, setLeft] = useState(at?.level ?? content.levels[0]?.id)
  const [right, setRight] = useState({ kind: 'base' }) // { kind: 'level', id } | { kind: 'base' } | { kind: 'rev', rev }
  const [rev, setRev] = useState('HEAD')
  const [held, setHeld] = useState(null) // what git holds: { found, value | why }
  useEffect(() => { if (at?.level) setLeft(at.level) }, [at])
  useEffect(() => {
    if (right.kind !== 'rev') return undefined
    let live = true
    setHeld(null)
    call('history', { game, level: left, rev: right.rev }).then((r) => live && setHeld(r)).catch((error) => live && setHeld({ found: false, why: error.message }))
    return () => { live = false }
  }, [game, left, right])
  const mine = bare(content.levels.find((l) => l.id === left))
  const theirs = right.kind === 'level' ? bare(content.levels.find((l) => l.id === right.id)) : right.kind === 'base' ? bare(base?.levels.find((l) => l.id === left)) : held?.found ? held.value : undefined
  const rows = useMemo(() => (mine && theirs ? fieldDiff(theirs, mine) : []), [mine, theirs])
  const options = levelOptions ?? content.levels.map((l) => ({ value: l.id }))
  return (
    <article className="compare">
      <div className="compare-bar">
        <Picker options={options} value={right.kind === 'level' ? right.id : undefined} onPick={(id) => setRight({ kind: 'level', id })} label={tr('和哪一关比', 'Compare with')} />
        <div className="seg">
          <button type="button" className={right.kind === 'base' ? 'is-on' : ''} onClick={() => setRight({ kind: 'base' })}>{tr('改前', 'Before changes')}</button>
          <button type="button" className={right.kind === 'rev' ? 'is-on' : ''} onClick={() => setRight({ kind: 'rev', rev })}>git</button>
        </div>
        {right.kind === 'rev' && <input className="field-input compare-rev" value={rev} onChange={(e) => setRev(e.target.value)} onBlur={() => setRight({ kind: 'rev', rev })} onKeyDown={(e) => e.key === 'Enter' && setRight({ kind: 'rev', rev })} aria-label="git rev" spellCheck={false} />}
        <span className="kit-spacer" />
        <Picker options={options} value={left} onPick={setLeft} label={tr('这一关', 'This level')} />
      </div>
      {right.kind === 'rev' && held && !held.found && <p className="review-said is-fail">{held.why}</p>}
      {right.kind === 'base' && !theirs && mine && <p className="review-empty">{tr('这一关是待定变更集新加的。', 'The pending changeset adds this level.')}</p>}
      {mine && theirs && !rows.length && <p className="review-empty">{tr('一样。', 'The same.')}</p>}
      <DiffFields rows={rows} onPath={(path) => onJump(left, path)} />
    </article>
  )
}
