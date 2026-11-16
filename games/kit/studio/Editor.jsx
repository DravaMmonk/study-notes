// The fields of what the studio edits, as rows (Rows.jsx), each opening its control in the side panel
// (Inspector.jsx): a level (its file), in sections — what the player reads, the puzzle, its tests, its answers, its
// place in the course, its tasks (form.js sectionOf), Alt+1… to jump, each folding away (remembered per viewer); several
// levels picked in the tree, as a bulk edit (Bulk.jsx); an era (its place in game.json, and the copy table of its
// levels: every text in play order, to read a chapter's copy through and fix it in place); or the rest of game.json.
// The level's own actions are operations: level.add (a copy after it), level.remove, and moving it in the tree; its
// id never changes (games/DESIGN.md 6.1). A row says how many findings of the check are on its field and whether the pending changes touched it. A
// part of pieces/<name>.json  is a file of its own here: its fields as rows, and its own actions —
// piece.add (a copy after it), piece.remove.
import { useMemo } from 'react'
import { ArrowRightLeft, ChevronRight, Copy, Play, CirclePlay, Trash2 } from 'lucide-react'
import { L, getLang, tr } from '../shell/i18n.js'
import { useWorkspaceKeys } from '../shell/useOverlay.js'
import { copyWithoutTextKeys } from '../engine/catalogs.js'
import { getAt, showPath } from '../engine/ops/edit.js'
import { copyLevelData, fieldAt, fileForm, formOf, gameFields, opFor, placeFindings, sectionsOf } from './form.js'
import { holdsLevels } from '../engine/schema.js'
import { contentFileFor } from '../engine/content.js'
import { freeName } from './PartsList.jsx'
import { Field, FieldTags } from './Fields.jsx'
import Rows from './Rows.jsx'
import { textField } from './copy.js'
import Bulk from './Bulk.jsx'
import { usePref } from './prefs.js'
import { confirmDelete } from './delete.js'
import { MOD } from './Shortcuts.jsx'

const SECTION = {
  read: ['文案', 'Copy'], puzzle: ['谜题', 'Puzzle'], tests: ['测试', 'Tests'], answers: ['答案', 'Answers'], course: ['课程', 'Course'], tasks: ['任务', 'Tasks'],
}
export default function Editor({ side, content, base, vocab, at, picked, field, places, names, levelOptions, playOrder, onEdit, onOps, onSelect, onPick, onPlay, onMove, onRemoveLevel, onCopy }) {
  const { vocabulary } = vocab
  const order = useMemo(() => content.levels.map((l) => l.id), [content])
  const common = { vocabulary, order, names, levelOptions, onEdit, onSelect, onPick, field: field?.path ? showPath(field.path) : null }
  if (at?.part !== undefined) return <PartEditor {...common} content={content} base={base} at={at} places={places} onPlay={onPlay} />
  if (picked.length > 1) return <Bulk content={content} vocabulary={vocabulary} ids={picked} ctx={ctxOf(common)} onAdd={onOps} onMove={onMove} onSelect={onSelect} />
  if (at?.level && content.levels.some((l) => l.id === at.level)) return <LevelEditor key={at.level} {...common} {...{ content, base, id: at.level, places, onPlay, onMove, onRemoveLevel }} />
  if (at?.era !== undefined && content.chapters?.[at.era]) return <EraEditor {...common} content={content} e={at.era} onCopy={onCopy} />
  return <GameEditor {...common} side={side} content={content} base={base} />
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
  // The id is shown by the package's short name; the level is a full name everywhere else.
  const short = id.slice(id.indexOf('/') + 1)
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
        <code className="editor-id is-static" title={id}>{short}</code>
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
  const era = content.chapters[e]
  const ctx = ctxOf({ vocabulary, order, names, levelOptions })
  const eraSchema = vocabulary.game.fields.chapters.of
  // The era's own fields, with the course placement folded away.
  const part = (course) => formOf({ ...eraSchema, fields: Object.fromEntries(Object.entries(eraSchema.fields).filter(([, s]) => holdsLevels(s) === course)) }, era, { vocabulary, levels: order }, ['chapters', e])
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
      {onCopy && <button type="button" className="kit-btn is-label" onClick={() => onCopy(e)}>{tr('文案表')}</button>}
    </article>
  )
}

// The configuration a workspace edits (games/DESIGN.md 6.7): the package's (package.json, its trays), or the game's
// (game.json, its course's settings; the chapters have their own board).
const SIDE_FILES = { package: ['package.json'], game: ['game.json', 'course.json'] }

function GameEditor({ side, content, base, vocabulary, order, names, levelOptions, field, onEdit, onPick }) {
  const { vocabulary: version, open } = content
  const shows = (k) => k !== 'chapters' && SIDE_FILES[side].includes(contentFileFor([k]))
  const strip = (c) => Object.fromEntries(Object.entries(gameFields(c)).filter(([k]) => shows(k)))
  const schema = { ...vocabulary.game, fields: Object.fromEntries(Object.entries(vocabulary.game.fields).filter(([k]) => shows(k))) }
  const ctx = ctxOf({ vocabulary, order, names, levelOptions })
  return (
    <article className="editor">
      <header className="editor-head">
        <span className="editor-id is-static">v{version}</span>
        <h1>{L(content.title)}</h1>
      </header>
      <Rows form={formOf(schema, strip(content), { vocabulary, levels: order })} ctx={ctx} picked={field} before={beforeIn(base && strip(base))} onPick={onPick} onAdd={addIn({ game: true }, onEdit, onPick)} />
      {open && side === 'game' && <pre className="editor-open">{JSON.stringify(open, null, 1)}</pre>}
    </article>
  )
}

/** An independently selected piece , with its fields and definition actions. */
function PartEditor({ content, base, vocabulary, order, names, levelOptions, at, places, field, onEdit, onSelect, onPick }) {
  const file = { parts: true }
  const ctx = ctxOf({ vocabulary, order, names, levelOptions }, { partDefs: content.partDefs })
  const shown = fileForm(content, vocabulary, file, order)
  const selected = at.part
  const path = ['parts', selected]
  const hit = fieldAt(shown.form, path)
  const taken = Object.keys(content.partDefs?.[path[0]] ?? {})
  if (!hit?.field) return <article className="editor"><p className="editor-note">{tr('这一项已经不在了。')}</p></article>
  const { at: findings } = placeFindings(shown.form, places.filter((p) => p.file === 'parts'))
  const copy = () => {
    const to = freeName(taken, `${selected}_`)
    const data = copyWithoutTextKeys(hit.field.value)
    onEdit({ op: 'piece.add', piece: to, data, after: selected })
    onSelect({ part: to })
  }
  const definition = hit.field.value
  const remove = () => {
    if (!confirmDelete(selected)) return
    onEdit({ op: 'piece.remove', piece: selected })
    onSelect(null)
  }
  return (
    <article className="editor">
      <header className="editor-head">
        <code className="editor-id is-static" title={selected}>{selected.slice(selected.indexOf('/') + 1)}</code>
        <h1>{L(definition.name) || selected}</h1>
        <span className="kit-spacer" />
        <span className="editor-tools">
          <button type="button" className="kit-btn editor-tool" onClick={copy} title={tr('复制成新的件')}><Copy size={14} /></button>
          <button type="button" className="kit-btn editor-tool" onClick={remove} title={tr('删掉这个件（还有地方用到它时拒绝）')}><Trash2 size={14} /></button>
        </span>
      </header>
      <Rows form={hit.field} ctx={ctx} picked={field} findings={findings} before={beforeIn(base?.partDefs)} onPick={onPick} onAdd={addIn(file, onEdit, onPick)} />
    </article>
  )
}
