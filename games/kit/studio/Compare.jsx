// Comparing a level, field by field (diff.js, DiffView.jsx): with another level side by side (the one to copy from,
// or its sibling in a parallel branch), with itself before the pending changeset, or with itself as git holds it at
// a revision (the history tool: the last commit by default). A field's path goes to that field of the level. Another
// file picked (`file`: a tag, relation or layout's) is compared with itself before the pending changeset or in git.
import { useEffect, useMemo, useState } from 'react'
import { tr } from '../shell/i18n.js'
import { call } from './api.js'
import { fieldDiff } from './diff.js'
import { DiffFields } from './DiffView.jsx'
import { Picker } from './Picker.jsx'

const bare = (level) => (level ? (({ id: _, ...v }) => v)(level) : undefined)

/**
 * `file`: { name (its path in the package), now, before (its value as written, undefined when new), git: whether git can
 * hold it } — a file other than a level's, compared instead; `onFilePath(path)` goes to a field of it.
 */
export default function Compare({ target, content, base, at, levelOptions, onJump, file = null, onFilePath }) {
  if (file) return <FileCompare target={target} file={file} onPath={onFilePath} />
  const [left, setLeft] = useState(at?.level ?? content.levels[0]?.id)
  const [right, setRight] = useState({ kind: 'base' }) // { kind: 'level', id } | { kind: 'base' } | { kind: 'rev', rev }
  const [rev, setRev] = useState('HEAD')
  const [held, setHeld] = useState(null) // what git holds: { found, value | why }
  useEffect(() => { if (at?.level) setLeft(at.level) }, [at])
  useEffect(() => {
    if (right.kind !== 'rev') return undefined
    let live = true
    setHeld(null)
    call('history', { ...target, level: left, rev: right.rev }).then((r) => live && setHeld(r)).catch((error) => live && setHeld({ found: false, why: error.message }))
    return () => { live = false }
  }, [target, left, right])
  const mine = bare(content.levels.find((l) => l.id === left))
  const theirs = right.kind === 'level' ? bare(content.levels.find((l) => l.id === right.id)) : right.kind === 'base' ? bare(base?.levels.find((l) => l.id === left)) : held?.found ? held.value : undefined
  const rows = useMemo(() => (mine && theirs ? fieldDiff(theirs, mine) : []), [mine, theirs])
  const options = levelOptions ?? content.levels.map((l) => ({ value: l.id }))
  return (
    <article className="compare">
      <div className="compare-bar">
        <Picker options={options} value={right.kind === 'level' ? right.id : undefined} onPick={(id) => setRight({ kind: 'level', id })} label={tr('和哪一关比')} />
        <div className="seg">
          <button type="button" className={right.kind === 'base' ? 'is-on' : ''} onClick={() => setRight({ kind: 'base' })}>{tr('改前')}</button>
          <button type="button" className={right.kind === 'rev' ? 'is-on' : ''} onClick={() => setRight({ kind: 'rev', rev })}>git</button>
        </div>
        {right.kind === 'rev' && <input className="field-input compare-rev" value={rev} onChange={(e) => setRev(e.target.value)} onBlur={() => setRight({ kind: 'rev', rev })} onKeyDown={(e) => e.key === 'Enter' && setRight({ kind: 'rev', rev })} aria-label="git rev" spellCheck={false} />}
        <span className="kit-spacer" />
        <Picker options={options} value={left} onPick={setLeft} label={tr('这一关')} />
      </div>
      {right.kind === 'rev' && held && !held.found && <p className="review-said is-fail">{held.why}</p>}
      {right.kind === 'base' && !theirs && mine && <p className="review-empty">{tr('这一关是待定变更集新加的。')}</p>}
      {mine && theirs && !rows.length && <p className="review-empty">{tr('一样。')}</p>}
      <DiffFields rows={rows} onPath={(path) => onJump(left, path)} />
    </article>
  )
}

/** A file compared with itself before the pending changeset, or as git holds it at a revision. */
function FileCompare({ target, file, onPath }) {
  const [right, setRight] = useState({ kind: 'base' })
  const [rev, setRev] = useState('HEAD')
  const [held, setHeld] = useState(null)
  useEffect(() => {
    if (right.kind !== 'rev') return undefined
    let live = true
    setHeld(null)
    call('history', { ...target, file: file.name, rev: right.rev }).then((r) => live && setHeld(r)).catch((error) => live && setHeld({ found: false, why: error.message }))
    return () => { live = false }
  }, [target, file.name, right])
  const theirs = right.kind === 'base' ? file.before : held?.found ? held.value : undefined
  const rows = useMemo(() => (file.now && theirs ? fieldDiff(theirs, file.now) : []), [file.now, theirs])
  return (
    <article className="compare">
      <div className="compare-bar">
        <div className="seg">
          <button type="button" className={right.kind === 'base' ? 'is-on' : ''} onClick={() => setRight({ kind: 'base' })}>{tr('改前')}</button>
          {file.git && <button type="button" className={right.kind === 'rev' ? 'is-on' : ''} onClick={() => setRight({ kind: 'rev', rev })}>git</button>}
        </div>
        {right.kind === 'rev' && <input className="field-input compare-rev" value={rev} onChange={(e) => setRev(e.target.value)} onBlur={() => setRight({ kind: 'rev', rev })} onKeyDown={(e) => e.key === 'Enter' && setRight({ kind: 'rev', rev })} aria-label="git rev" spellCheck={false} />}
        <span className="kit-spacer" />
        <code>{file.name}</code>
      </div>
      {right.kind === 'rev' && held && !held.found && <p className="review-said is-fail">{held.why}</p>}
      {right.kind === 'base' && !theirs && file.now && <p className="review-empty">{tr('这个文件是待定变更集新加的。', 'The pending changeset adds this file.')}</p>}
      {file.now && theirs && !rows.length && <p className="review-empty">{tr('一样。')}</p>}
      <DiffFields rows={rows} onPath={onPath} />
    </article>
  )
}
