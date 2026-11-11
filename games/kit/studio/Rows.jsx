// The fields of a file as rows (games/DESIGN.md 6.7): each field one line — its key, a summary of what it holds, a dot
// when the pending changes touched it, the number of findings on it — and a click opens it in the side panel
// (Inspector.jsx), where its control is. The fields that have no place on the game's screen (the course, the answers,
// game.json) are edited this way; so is anything else, for whoever would rather read a level as a list. A list of
// objects that is a level's tasks shows each task as a group of its own rows. An optional field not written yet is a
// + chip that adds it, blank, and opens it.
//
//   <Rows form keys? picked findings before onPick(path) onAdd(path, schema) />
//   findings: Map(showPath → [says]); before(path) → [had, value]
import { Plus } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { showPath } from '../engine/ops/edit.js'
import { summaryOf } from './form.js'

/** What a row says of its field: a list's length and first items, else the value in one line. */
function sumOf(field) {
  if (field.kind === 'list') return `${field.items.length} · ${field.items.map((i) => summaryOf(i.value, 40)).join(' | ')}`
  if (field.kind === 'board') return `${(field.value ?? []).length} ${tr('行')} · ${(field.value ?? []).join(' ; ')}`
  return summaryOf(field.value, 140)
}

/** The findings under a path (on it, or on a field inside it). */
const foundUnder = (findings, path) => {
  const key = showPath(path)
  let n = 0
  for (const [at, says] of findings ?? []) if (at === key || at.startsWith(`${key}.`) || at.startsWith(`${key}[`)) n += says.length
  return n
}

function Row({ name, field, about, picked, findings, before, onPick }) {
  const key = showPath(field.path)
  const [had, was] = before?.(field.path) ?? [false, undefined]
  const changed = before && JSON.stringify(had ? was : undefined) !== JSON.stringify(field.value)
  const found = foundUnder(findings, field.path)
  const on = picked === key || (picked?.startsWith(key) && /^[.[]/.test(picked.slice(key.length)))
  return (
    <button type="button" className={`row ${on ? 'is-on' : ''} ${found ? 'is-wrong' : ''}`} data-path={key} onClick={() => onPick(field.path)} title={about ? L(about) : undefined}>
      <span className="row-key">{name}{changed && <i className="row-dot" aria-label={tr('改过')} />}</span>
      <span className="row-sum">{sumOf(field) || '—'}</span>
      {found > 0 && <b className="row-found">{found}</b>}
    </button>
  )
}

/** A list of objects that holds a level's tasks: a group of rows each. */
const isTasks = (f) => f.field?.kind === 'list' && f.schema?.section === 'tasks' && f.field.items.every((i) => i.kind === 'obj')

export default function Rows({ form, keys = null, picked = null, findings, before, onPick, onAdd }) {
  const tags = new Set((form.tags ?? []).map((t) => t.key))
  const mine = form.fields.filter((f) => !tags.has(f.key) && (!keys || keys.includes(f.key)))
  const absent = mine.filter((f) => !f.field && f.optional)
  return (
    <div className="rows">
      {mine.filter((f) => f.field).map((f) => (isTasks(f) ? (
        <div key={f.key} className="rows-tasks">
          {f.field.items.map((task, k) => (
            <section key={k} className="rows-task">
              <button type="button" className={`row is-head ${picked === showPath(task.path) ? 'is-on' : ''}`} onClick={() => onPick(task.path)}>
                <span className="row-key">{tr(`任务 ${k + 1}`, `Task ${k + 1}`)}</span>
                <span className="row-sum">{[task.value.id, task.value.step && L(task.value.step)].filter(Boolean).join(' · ')}</span>
                {foundUnder(findings, task.path) > 0 && <b className="row-found">{foundUnder(findings, task.path)}</b>}
              </button>
              <Rows form={task} picked={picked} findings={findings} before={before} onPick={onPick} onAdd={onAdd} />
            </section>
          ))}
        </div>
      ) : <Row key={f.key} name={f.key} field={f.field} about={f.about ?? f.field.about} picked={picked} findings={findings} before={before} onPick={onPick} />))}
      {absent.length > 0 && (
        <div className="field-absent">
          {absent.map((f) => (
            <button key={f.key} type="button" title={f.about ? L(f.about) : undefined} onClick={() => onAdd([...form.path, f.key], f.schema)}>
              <Plus size={11} aria-hidden="true" />{f.key}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
