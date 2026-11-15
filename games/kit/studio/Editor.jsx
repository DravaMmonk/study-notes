// The fields of what the studio edits, as rows (Rows.jsx), each opening its control in the side panel
// (Inspector.jsx): a level (its file), in sections — what the player reads, the puzzle, its tests, its answers, its
// place in the course, its tasks (form.js sectionOf), Alt+1… to jump, each folding away (remembered per viewer); several
// levels picked in the tree, as a bulk edit (Bulk.jsx); an era (its place in game.json, and the copy table of its
// levels: every text in play order, to read a chapter's copy through and fix it in place); or the rest of game.json.
// The level's own actions are operations: level.rename, level.add (a copy after it), level.remove, and moving it in
// the tree. A row says how many findings of the check are on its field and whether the pending changes touched it. A
// part of pieces.json (and a setting definition) is a file of its own here: its fields as rows, and its own actions —
// piece.rename, piece.add (a copy after it), piece.remove.
import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, ChevronRight, Copy, Play, CirclePlay, Trash2 } from 'lucide-react'
import { L, getLang, tr } from '../shell/i18n.js'
import { useWorkspaceKeys } from '../shell/useOverlay.js'
import { copyWithoutTextKeys } from '../engine/catalogs.js'
import { getAt, showPath } from '../engine/ops/edit.js'
import { copyLevelData, fieldAt, fileForm, formOf, gameFields, opFor, placeFindings, sectionsOf } from './form.js'
import { holdsLevels } from '../engine/schema.js'
import { settingReferences } from '../engine/pieces.js'
import { NAME as PART_NAME } from '../engine/parts/schema.js'
import { freeName } from './PartsList.jsx'
import { Field, FieldTags } from './Fields.jsx'
import Rows from './Rows.jsx'
import { textField } from './copy.js'
import Bulk from './Bulk.jsx'
import { usePref } from './prefs.js'
import { confirmDelete } from './delete.js'
import { MOD } from './Shortcuts.jsx'

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
const PIECE_ID = new RegExp(PART_NAME.pattern)
const SECTION = {
  read: ['文案', 'Copy'], puzzle: ['谜题', 'Puzzle'], tests: ['测试', 'Tests'], answers: ['答案', 'Answers'], course: ['课程', 'Course'], tasks: ['任务', 'Tasks'],
}
export default function Editor({ content, base, vocab, at, picked, field, places, names, levelOptions, playOrder, onEdit, onOps, onSelect, onPick, onPlay, onMove, onRemoveLevel, onCopy }) {
  const { vocabulary } = vocab
  const order = useMemo(() => content.levels.map((l) => l.id), [content])
  const common = { vocabulary, order, names, levelOptions, onEdit, onSelect, onPick, field: field?.path ? showPath(field.path) : null }
  if (at?.part !== undefined || at?.setting !== undefined) return <PartEditor {...common} content={content} base={base} at={at} places={places} onPlay={onPlay} />
  if (picked.length > 1) return <Bulk content={content} vocabulary={vocabulary} ids={picked} ctx={ctxOf(common)} onAdd={onOps} onMove={onMove} onSelect={onSelect} />
  if (at?.level && content.levels.some((l) => l.id === at.level)) return <LevelEditor key={at.level} {...common} {...{ content, base, id: at.level, places, onPlay, onMove, onRemoveLevel }} />
  if (at?.era !== undefined && content.eras?.[at.era]) return <EraEditor {...common} content={content} e={at.era} onCopy={onCopy} />
  return <GameEditor {...common} content={content} base={base} />
}

const ctxOf = ({ vocabulary, order, names, levelOptions }, extra = {}) => ({ vocabulary, levels: order, names, levelOptions, textField, ...extra })
/** The edit of a field in `file` as its operation. */
const editIn = (file, onEdit) => (path, edit, type) => onEdit(opFor(file, path, edit, type))
/** An optional field added blank in `file`, and opened in the side panel. */
const addIn = (file, onEdit, onPick) => (path, schema, value) => {
  onEdit(opFor(file, path, { set: value }, schema.type))
  onPick(path)
}
/** A field's value before the pending changes, in `value` (undefined: nothing before, a new file): [had, value]. */
const beforeIn = (value) => (path) => {
  if (value === undefined) return [false, undefined]
  const v = getAt(value, path)
  return [v !== undefined, v]
}

function LevelEditor({ content, base, vocabulary, order, names, levelOptions, id, places, field, onEdit, onSelect, onPick, onPlay, onMove, onRemoveLevel }) {
  const [folded, setFolded] = usePref('folded-sections', [])
  const { id: _, ...value } = content.levels.find((l) => l.id === id)
  const was = base?.levels.find((l) => l.id === id)
  const form = formOf(vocabulary.level, value, { vocabulary, levels: order })
  const { at: findings, rest } = placeFindings(form, places.filter((p) => p.level === id))
  const ctx = ctxOf({ vocabulary, order, names, levelOptions }, { lang: getLang() })
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
    const level = `${id}-${k}`
    onEdit({ op: 'level.add', level, data: copyLevelData(value, level, content.levels), to: { after: id } })
    onSelect({ level: `${id}-${k}` })
  }
  // Alt+1… jumps to a section.
  useWorkspaceKeys((e) => {
    if (!e.altKey || !/^Digit[1-6]$/.test(e.code) || !sections) return
    const s = sections[Number(e.code.slice(5)) - 1]
    if (!s) return
    e.preventDefault()
    jump(s.section, true)
  })
  const edit = editIn({ level: id }, onEdit)
  const fold = (section) => setFolded((f) => (f.includes(section) ? f.filter((x) => x !== section) : [...f, section]))
  const jump = (section, focus = false) => {
    if (folded.includes(section)) fold(section)
    window.setTimeout(() => {
      const el = document.getElementById(`section-${section}`)
      el?.scrollIntoView({ block: 'start' })
      if (focus) el?.querySelector('.field input, .field textarea, .field select, [contenteditable="true"], .field button')?.focus({ preventScroll: true })
    })
  }
  return (
    <article className="editor">
      <header className="editor-head">
        <input className="editor-id" value={name} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} aria-label={tr('关卡 id')} size={Math.max(3, name.length)} />
        <h1>{L(value.title)}</h1>
        {form.tags && <FieldTags tags={form.tags} />}
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
          <button type="button" className="kit-btn" onClick={() => onRemoveLevel(id)} title={tr('删除', 'Remove')} aria-label={tr('删除', 'Remove')}><Trash2 size={14} aria-hidden="true" /></button>
        </span>
      </header>
      {rest.length > 0 && <ul className="field-findings is-level">{rest.map((f) => <li key={f}>{f}</li>)}</ul>}
      {sections ? sections.map((s) => {
        const shut = folded.includes(s.section)
        return (
          <section key={s.section} id={`section-${s.section}`} className={`editor-section is-${s.section} ${shut ? 'is-folded' : ''}`}>
            <button type="button" className="editor-fold" onClick={() => fold(s.section)} aria-expanded={!shut}>
              <ChevronRight size={11} aria-hidden="true" />{tr(...SECTION[s.section])}
              {shut && <small>{s.fields.filter((f) => f.field).map((f) => f.key).join(' · ')}</small>}
            </button>
            {!shut && <Rows form={form} ctx={ctx} keys={s.fields.map((f) => f.key)} picked={field} findings={findings} before={before} onPick={onPick} onAdd={addIn({ level: id }, onEdit, onPick)} />}
          </section>
        )
      }) : <Field field={form} label={null} onEdit={edit} ctx={{ ...ctx, findings, before }} />}
    </article>
  )
}

function EraEditor({ content, vocabulary, order, names, levelOptions, e, field, onEdit, onPick, onCopy }) {
  const era = content.eras[e]
  const ctx = ctxOf({ vocabulary, order, names, levelOptions })
  const eraSchema = vocabulary.game.fields.eras.of
  // The era's own fields, with the course placement folded away.
  const part = (course) => formOf({ ...eraSchema, fields: Object.fromEntries(Object.entries(eraSchema.fields).filter(([, s]) => holdsLevels(s) === course)) }, era, { vocabulary, levels: order }, ['eras', e])
  return (
    <article className="editor">
      <header className="editor-head">
        <span className="editor-id is-static">{era.id}</span>
        <h1>{L(era.title ?? era.chapter?.title) ?? ''}</h1>
      </header>
      <Rows form={part(false)} ctx={ctx} picked={field} onPick={onPick} onAdd={addIn({ game: true }, onEdit, onPick)} />
      <details className="editor-course">
        <summary>{tr('关卡的位置')}</summary>
        <Rows form={part(true)} ctx={ctx} picked={field} onPick={onPick} onAdd={addIn({ game: true }, onEdit, onPick)} />
      </details>
      <button type="button" className="kit-btn is-label" onClick={() => onCopy(e)}>{tr('文案表')}</button>
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
      <Rows form={formOf(schema, strip(content), { vocabulary, levels: order })} ctx={ctx} picked={field} before={beforeIn(base && strip(base))} onPick={onPick} onAdd={addIn({ game: true }, onEdit, onPick)} />
      {open && <pre className="editor-open">{JSON.stringify(open, null, 1)}</pre>}
    </article>
  )
}

/** An independently selected piece or setting definition, with its fields and definition actions. */
function PartEditor({ content, base, vocabulary, order, names, levelOptions, at, places, field, onEdit, onSelect, onPick }) {
  const file = { parts: true }
  const ctx = ctxOf({ vocabulary, order, names, levelOptions }, { partDefs: content.partDefs })
  const shown = fileForm(content, vocabulary, file, order)
  const kind = at.part !== undefined ? 'part' : 'setting'
  const isPiece = kind === 'part'
  const selected = at[kind]
  const path = [`${kind}s`, selected]
  const hit = fieldAt(shown.form, path)
  const taken = Object.keys(content.partDefs?.[path[0]] ?? {})
  const [id, setId] = useState(selected)
  useEffect(() => setId(selected), [selected])
  if (!hit?.field) return <article className="editor"><p className="editor-note">{tr('这一项已经不在了。')}</p></article>
  const { at: findings } = placeFindings(shown.form, places.filter((p) => p.file === 'parts'))
  const rename = () => {
    if (id === selected || !PIECE_ID.test(id) || taken.includes(id)) return
    onEdit(isPiece ? { op: 'piece.rename', piece: selected, to: id } : { op: 'setting.rename', setting: selected, to: id })
    onSelect({ [kind]: id })
  }
  const copy = () => {
    const to = freeName(taken, `${selected}_`)
    const data = copyWithoutTextKeys(hit.field.value)
    onEdit(isPiece ? { op: 'piece.add', piece: to, data, after: selected } : { op: 'setting.add', setting: to, data })
    onSelect({ [kind]: to })
  }
  const definition = hit.field.value
  const inUse = !isPiece && settingReferences(content.partDefs, selected).length > 0
  const remove = () => {
    if (!confirmDelete(selected)) return
    onEdit(isPiece ? { op: 'piece.remove', piece: selected } : { op: 'setting.remove', setting: selected })
    onSelect(null)
  }
  return (
    <article className="editor">
      <header className="editor-head">
        <input className="editor-id" value={id} onChange={(e) => setId(e.target.value)} onBlur={rename} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          aria-label={isPiece ? tr('件的类型名') : tr('设置 ID', 'Setting ID')} spellCheck={false} />
        <h1>{L(isPiece ? definition.name : definition.label) || selected}</h1>
        <span className="kit-spacer" />
        <span className="editor-tools">
          <button type="button" className="kit-btn editor-tool" onClick={copy} title={isPiece ? tr('复制成新的件') : tr('复制设置', 'Duplicate setting')}><Copy size={14} /></button>
          <button type="button" className="kit-btn editor-tool" onClick={remove} disabled={inUse} title={isPiece
            ? tr('删掉这个件（还有地方用到它时拒绝）')
            : inUse ? tr('仍有件引用这项设置', 'This setting is still used by pieces') : tr('删除设置', 'Delete setting')}><Trash2 size={14} /></button>
        </span>
      </header>
      <Rows form={hit.field} ctx={ctx} picked={field} findings={findings} before={beforeIn(base?.partDefs)} onPick={onPick} onAdd={addIn(file, onEdit, onPick)} />
    </article>
  )
}
