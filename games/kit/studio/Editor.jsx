// The fields of what the studio edits, as rows (Rows.jsx), each opening its control in the side panel
// (Inspector.jsx): a level (its file), in sections — what the player reads, the puzzle, its tests, its answers, its
// place in the course, its tasks (form.js sectionOf), Alt+1… to jump, each folding away (remembered per viewer); several
// levels picked in the tree, as a bulk edit (Bulk.jsx); an era (its place in game.json, and the copy table of its
// levels: every text in play order, to read a chapter's copy through and fix it in place); or the rest of game.json.
// The level's own actions are operations: level.rename, level.add (a copy after it), level.remove, and moving it in
// the tree. A row says how many findings of the check are on its field and whether the pending changes touched it. A
// part of parts.json (and a setting preset) is a file of its own here: its fields as rows, and its own actions —
// part.rename, part.add (a copy after it), part.remove.
import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, ChevronRight, Copy, Play, CirclePlay, Trash2 } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { getAt, showPath } from '../engine/ops/edit.js'
import { blank, fieldAt, fileForm, formOf, gameFields, opFor, placeFindings, sectionsOf } from './form.js'
import { holdsLevels } from '../engine/schema.js'
import { freeName } from './PartsList.jsx'
import { Field, Shapes, TagChoice } from './Fields.jsx'
import Rows from './Rows.jsx'
import CopyTable from './CopyTable.jsx'
import { textField } from './copy.js'
import Bulk from './Bulk.jsx'
import { usePref } from './prefs.js'
import { MOD } from './Shortcuts.jsx'

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
const SECTION = {
  read: ['文案', 'Copy'], puzzle: ['谜题', 'Puzzle'], tests: ['测试', 'Tests'], answers: ['答案', 'Answers'], course: ['课程', 'Course'], tasks: ['任务', 'Tasks'],
}
export default function Editor({ content, base, vocab, at, picked, field, scene, places, names, levelOptions, playOrder, onEdit, onOps, onSelect, onPick, onPlay, onMove, onJump }) {
  const { vocabulary } = vocab
  const order = useMemo(() => content.levels.map((l) => l.id), [content])
  const common = { vocabulary, order, names, levelOptions, onEdit, onSelect, onPick, field: field?.path ? showPath(field.path) : null }
  if (at?.part !== undefined || at?.preset !== undefined) return <PartEditor {...common} content={content} base={base} at={at} places={places} onPlay={onPlay} />
  if (picked.length > 1) return <Bulk content={content} vocabulary={vocabulary} ids={picked} ctx={ctxOf(common)} onAdd={onOps} onMove={onMove} onSelect={onSelect} />
  if (at?.level && content.levels.some((l) => l.id === at.level)) return <LevelEditor key={at.level} {...common} {...{ content, base, id: at.level, scene, places, onPlay, onMove }} />
  if (at?.era !== undefined && content.eras?.[at.era]) return <EraEditor {...common} content={content} e={at.era} places={places} playOrder={playOrder} onJump={onJump} />
  return <GameEditor {...common} content={content} base={base} />
}

const ctxOf = ({ vocabulary, order, names, levelOptions }, extra = {}) => ({ vocabulary, levels: order, names, levelOptions, textField, ...extra })
/** The edit of a field in `file` as its operation. */
const editIn = (file, onEdit) => (path, edit, type) => onEdit(opFor(file, path, edit, type))
/** An optional field added blank in `file`, and opened in the side panel. */
const addIn = (file, onEdit, onPick, ctx) => (path, schema) => {
  onEdit(opFor(file, path, { set: blank(schema, ctx) }, schema.type))
  onPick(path)
}
/** A field's value before the pending changes, in `value` (undefined: nothing before, a new file): [had, value]. */
const beforeIn = (value) => (path) => {
  if (value === undefined) return [false, undefined]
  const v = getAt(value, path)
  return [v !== undefined, v]
}

function LevelEditor({ content, base, vocabulary, order, names, levelOptions, id, scene, places, field, onEdit, onSelect, onPick, onPlay, onMove }) {
  const [folded, setFolded] = usePref('folded-sections', [])
  const { id: _, ...value } = content.levels.find((l) => l.id === id)
  const was = base?.levels.find((l) => l.id === id)
  const form = formOf(vocabulary.level, value, { vocabulary, levels: order })
  const { at: findings, rest } = placeFindings(form, places.filter((p) => p.level === id))
  const ctx = ctxOf({ vocabulary, order, names, levelOptions })
  const before = beforeIn(was && (({ id: __, ...v }) => v)(was))
  const sections = form.kind === 'obj' ? sectionsOf(form) : null
  const [name, setName] = useState(id)
  const rename = () => {
    if (name === id || !ID.test(name) || order.includes(name)) return setName(id)
    onEdit({ op: 'level.rename', level: id, to: name })
    onSelect({ level: name })
  }
  const copy = () => {
    let k = 2
    while (order.includes(`${id}-${k}`)) k += 1
    onEdit({ op: 'level.add', level: `${id}-${k}`, data: value, to: { after: id } })
    onSelect({ level: `${id}-${k}` })
  }
  // Alt+1… jumps to a section.
  useEffect(() => {
    const key = (e) => {
      if (!e.altKey || !/^Digit[1-6]$/.test(e.code) || !sections) return
      const s = sections[Number(e.code.slice(5)) - 1]
      if (!s) return
      e.preventDefault()
      setFolded((f) => f.filter((x) => x !== s.section))
      window.setTimeout(() => {
        const el = document.getElementById(`section-${s.section}`)
        el?.scrollIntoView({ block: 'start' })
        el?.querySelector('.field input, .field textarea, .field select, [contenteditable="true"], .field button')?.focus({ preventScroll: true })
      })
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [sections, setFolded])
  const edit = editIn({ level: id }, onEdit)
  const fold = (section) => setFolded((f) => (f.includes(section) ? f.filter((x) => x !== section) : [...f, section]))
  const jump = (section) => {
    if (folded.includes(section)) fold(section)
    window.setTimeout(() => document.getElementById(`section-${section}`)?.scrollIntoView({ block: 'start' }))
  }
  return (
    <article className="editor">
      <header className="editor-head">
        <input className="editor-id" value={name} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} aria-label={tr('关卡 id')} size={Math.max(3, name.length)} />
        <h1>{L(value.title)}</h1>
        {form.tags && <TagChoice field={form} onEdit={edit} ctx={ctx} />}
        {form.shapes?.length > 1 && <Shapes field={form} onEdit={edit} ctx={ctx} />}
        {sections && (
          <nav className="editor-sections" aria-label={tr('分区', 'Sections')}>
            {sections.map((s, k) => (
              <a key={s.section} href={`#section-${s.section}`} title={`Alt+${k + 1}`} className={folded.includes(s.section) ? 'is-folded' : ''} onClick={(e) => { e.preventDefault(); jump(s.section) }}>{tr(...SECTION[s.section])}</a>
            ))}
          </nav>
        )}
        <span className="kit-spacer" />
        <span className="editor-tools">
          <button type="button" className="kit-btn" onClick={() => onPlay(id, false)} title={tr('试玩')} aria-label={tr('试玩')}><Play size={14} aria-hidden="true" /></button>
          <button type="button" className="kit-btn" onClick={() => onPlay(id, true)} title={tr(`载入参考解试玩（${MOD}+Enter）`, `Play with the reference (${MOD}+Enter)`)} aria-label={tr('载入参考解试玩')}><CirclePlay size={14} aria-hidden="true" /></button>
          <button type="button" className="kit-btn" onClick={() => onMove([id])} title={tr('移动')} aria-label={tr('移动')}><ArrowRightLeft size={14} aria-hidden="true" /></button>
          <button type="button" className="kit-btn" onClick={copy} title={tr('复制成新的一关')} aria-label={tr('复制', 'Duplicate')}><Copy size={14} aria-hidden="true" /></button>
          <button type="button" className="kit-btn" onClick={() => { onEdit({ op: 'level.remove', level: id }); onSelect(null) }} title={tr('删除', 'Remove')} aria-label={tr('删除', 'Remove')}><Trash2 size={14} aria-hidden="true" /></button>
        </span>
      </header>
      {rest.length > 0 && <ul className="field-findings is-level">{rest.map((f) => <li key={f}>{f}</li>)}</ul>}
      {scene && <div className="board-svg editor-scene" dangerouslySetInnerHTML={{ __html: scene }} />}
      {sections ? sections.map((s) => {
        const shut = folded.includes(s.section)
        return (
          <section key={s.section} id={`section-${s.section}`} className={`editor-section is-${s.section} ${shut ? 'is-folded' : ''}`}>
            <button type="button" className="editor-fold" onClick={() => fold(s.section)} aria-expanded={!shut}>
              <ChevronRight size={11} aria-hidden="true" />{tr(...SECTION[s.section])}
              {shut && <small>{s.fields.filter((f) => f.field).map((f) => f.key).join(' · ')}</small>}
            </button>
            {!shut && <Rows form={form} keys={s.fields.map((f) => f.key)} picked={field} findings={findings} before={before} onPick={onPick} onAdd={addIn({ level: id }, onEdit, onPick, ctx)} />}
          </section>
        )
      }) : <Field field={form} label={null} onEdit={edit} ctx={{ ...ctx, findings, before }} />}
    </article>
  )
}

function EraEditor({ content, vocabulary, order, names, levelOptions, e, places, playOrder, field, onEdit, onPick, onJump }) {
  const era = content.eras[e]
  const ctx = ctxOf({ vocabulary, order, names, levelOptions })
  const eraSchema = vocabulary.game.fields.eras.of
  // The era's own fields but its texts (in the copy table below); where its levels go (the tree edits that) folded away.
  const part = (course) => formOf({ ...eraSchema, fields: Object.fromEntries(Object.entries(eraSchema.fields).filter(([, s]) => holdsLevels(s) === course && (course || s.type !== 'text'))) }, era, { vocabulary, levels: order }, ['eras', e])
  return (
    <article className="editor">
      <header className="editor-head">
        <span className="editor-id is-static">{era.id}</span>
        <h1>{L(era.title ?? era.chapter?.title) ?? ''}</h1>
      </header>
      <Rows form={part(false)} picked={field} onPick={onPick} onAdd={addIn({ game: true }, onEdit, onPick, ctx)} />
      <details className="editor-course">
        <summary>{tr('关卡的位置')}</summary>
        <Rows form={part(true)} picked={field} onPick={onPick} onAdd={addIn({ game: true }, onEdit, onPick, ctx)} />
      </details>
      <CopyTable content={content} vocabulary={vocabulary} scope={e} order={playOrder} names={names} places={places} onEdit={onEdit} onJump={onJump} />
    </article>
  )
}

function GameEditor({ content, base, vocabulary, order, names, levelOptions, field, onEdit, onPick }) {
  const { domain, vocabulary: version, open } = content
  const strip = (c) => Object.fromEntries(Object.entries(gameFields(c)).filter(([k]) => k !== 'eras'))
  const schema = { ...vocabulary.game, fields: Object.fromEntries(Object.entries(vocabulary.game.fields).filter(([k]) => k !== 'eras')) }
  const ctx = ctxOf({ vocabulary, order, names, levelOptions })
  return (
    <article className="editor">
      <header className="editor-head">
        <span className="editor-id is-static">{domain} · v{version}</span>
        <h1>{L(content.title)}</h1>
      </header>
      <Rows form={formOf(schema, strip(content), { vocabulary, levels: order })} picked={field} before={beforeIn(base && strip(base))} onPick={onPick} onAdd={addIn({ game: true }, onEdit, onPick, ctx)} />
      {open && <pre className="editor-open">{JSON.stringify(open, null, 1)}</pre>}
    </article>
  )
}

/** A part of parts.json, or one of its setting presets: its fields as rows, and the part's own actions. */
function PartEditor({ content, base, vocabulary, order, names, levelOptions, at, places, field, onEdit, onSelect, onPick }) {
  const file = { parts: true }
  const ctx = ctxOf({ vocabulary, order, names, levelOptions }, { partDefs: content.partDefs })
  const shown = fileForm(content, vocabulary, file, order)
  const path = at.part !== undefined ? ['parts', at.part] : ['presets', at.preset]
  const hit = fieldAt(shown.form, path)
  const types = Object.keys(content.partDefs?.parts ?? {})
  const [id, setId] = useState(at.part ?? '')
  useEffect(() => setId(at.part ?? ''), [at.part])
  if (!hit?.field) return <article className="editor"><p className="editor-note">{tr('这一项已经不在了。')}</p></article>
  const { at: findings } = placeFindings(shown.form, places.filter((p) => p.file === 'parts'))
  const rename = () => {
    if (id === at.part || !ID.test(id) || types.includes(id)) return
    onEdit({ op: 'part.rename', part: at.part, to: id })
    onSelect({ part: id })
  }
  const copy = () => {
    const to = freeName(types, `${at.part}_`)
    onEdit({ op: 'part.add', part: to, data: JSON.parse(JSON.stringify(hit.field.value)), after: at.part })
    onSelect({ part: to })
  }
  return (
    <article className="editor">
      <header className="editor-head">
        {at.part !== undefined ? (
          <>
            <input className="editor-id" value={id} onChange={(e) => setId(e.target.value)} onBlur={rename} onKeyDown={(e) => e.key === 'Enter' && rename()} aria-label={tr('元件的类型名')} spellCheck={false} />
            <h1>{L(hit.field.value.name)}</h1>
            <span className="kit-spacer" />
            <span className="editor-tools">
            <button type="button" className="kit-btn editor-tool" onClick={copy} title={tr('复制成新的元件')}><Copy size={14} /></button>
            <button type="button" className="kit-btn editor-tool" onClick={() => { onEdit({ op: 'part.remove', part: at.part }); onSelect(null) }} title={tr('删掉这个元件（还有地方用到它时拒绝）')}><Trash2 size={14} /></button>
            </span>
          </>
        ) : (
          <>
            <span className="editor-id is-static">{at.preset}</span>
            <h1>{hit.field.value.label ? L(hit.field.value.label) : at.preset}</h1>
            <span className="kit-spacer" />
            <span className="editor-tools"><button type="button" className="kit-btn editor-tool" onClick={() => { onEdit({ op: 'parts.unset', path }); onSelect(null) }} title={tr('删掉这份预设')}><Trash2 size={14} /></button></span>
          </>
        )}
      </header>
      <Rows form={hit.field} picked={field} findings={findings} before={beforeIn(base?.partDefs)} onPick={onPick} onAdd={addIn(file, onEdit, onPick, ctx)} />
    </article>
  )
}
