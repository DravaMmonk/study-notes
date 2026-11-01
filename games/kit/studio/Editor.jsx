// What the studio edits, as forms from the schemas (Fields.jsx, form.js): a level (its file), in sections — what the
// player reads, the puzzle, its tests, its answers, its place in the course (form.js sectionOf), Alt+1… to jump; an
// era (its place in game.json, and every text of its levels in play order, to read a chapter's copy through and fix it
// in place); or the rest of game.json. Each edit becomes the operation that makes it (form.js opFor); the level's own
// actions are operations too: level.rename, level.add (a copy after it), level.remove, and moving it in the tree.
// The check's findings show on the field they are about (form.js placesOf, placeFindings); a field changed by the
// pending changeset can be put back as it was.
import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Copy, Play, Trash2 } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { getAt, showPath } from '../engine/ops/edit.js'
import { eraLevels } from '../course.js'
import { formOf, holdsLevels, opFor, placeFindings, sectionsOf, textsOf } from './form.js'
import { Field, ObjField, Shapes, TagChoice, TextField } from './Fields.jsx'

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
// What the game form leaves out: what is not game.json's own schema, the course (the tree and the eras edit it) and
// the save migrations (written by the operation set).
const NOT_FORM = ['id', 'levels', 'glossary', 'domain', 'vocabulary', 'open', 'eras', 'saves']
const SECTION = {
  read: ['文案', 'Copy'], puzzle: ['谜题', 'Puzzle'], tests: ['测试', 'Tests'], answers: ['答案', 'Answers'], course: ['课程', 'Course'], tasks: ['任务', 'Tasks'],
}
/** The copy rule a level's text is held to: the field it is (a task's own field for a task's text). */
const textField = (path) => String(path[0] === 'tasks' ? path[2] ?? '' : path[0] ?? '')

export default function Editor({ content, base, vocab, at, scene, places, names, levelOptions, tests, onEdit, onSelect, onPlay, onMove, onBoard }) {
  const { vocabulary } = vocab
  const order = useMemo(() => content.levels.map((l) => l.id), [content])
  const common = { vocabulary, order, names, levelOptions, onEdit, onSelect }
  if (at?.level && content.levels.some((l) => l.id === at.level)) return <LevelEditor key={at.level} {...common} {...{ content, base, id: at.level, scene, places, tests, onPlay, onMove, onBoard }} />
  if (at?.era !== undefined && content.eras?.[at.era]) return <EraEditor {...common} content={content} e={at.era} />
  return <GameEditor {...common} content={content} base={base} />
}

const ctxOf = ({ vocabulary, order, names, levelOptions }, extra = {}) => ({ vocabulary, levels: order, names, levelOptions, textField, ...extra })
/** The edit of a field in `file` as its operation. */
const editIn = (file, onEdit) => (path, edit, type) => onEdit(opFor(file, path, edit, type))
/** A field's value before the pending changes, in `value` (undefined: nothing before, a new file): [had, value]. */
const beforeIn = (value) => (path) => {
  if (value === undefined) return [false, undefined]
  const v = getAt(value, path)
  return [v !== undefined, v]
}

function LevelEditor({ content, base, vocabulary, order, names, levelOptions, id, scene, places, tests, onEdit, onSelect, onPlay, onMove, onBoard }) {
  const { id: _, ...value } = content.levels.find((l) => l.id === id)
  const was = base?.levels.find((l) => l.id === id)
  const form = formOf(vocabulary.level, value, { vocabulary, levels: order })
  const { at: findings, rest } = placeFindings(form, places.filter((p) => p.level === id))
  const ctx = ctxOf({ vocabulary, order, names, levelOptions }, {
    onBoard: (path) => onBoard(id, showPath(path)),
    findings,
    before: beforeIn(was && (({ id: __, ...v }) => v)(was)),
    tests: { of: (path) => tests.of(id, path), run: (path) => tests.run(id, path) },
  })
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
      const el = document.getElementById(`section-${s.section}`)
      el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      el?.querySelector('input, textarea, select, [contenteditable="true"], button')?.focus({ preventScroll: true })
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [sections])
  const edit = editIn({ level: id }, onEdit)
  return (
    <article className="editor">
      <header className="editor-head">
        <input className="editor-id" value={name} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} aria-label={tr('关卡 id', 'Level id')} size={Math.max(3, name.length)} />
        <h1>{L(value.title)}</h1>
        <span className="kit-spacer" />
        <button type="button" className="kit-btn is-label is-solid" onClick={() => onPlay(id)}><Play size={14} aria-hidden="true" />{tr('试玩', 'Play')}</button>
        <button type="button" className="kit-btn is-label" onClick={() => onMove(id)} title={tr('移动', 'Move')}><ArrowRightLeft size={14} aria-hidden="true" /></button>
        <button type="button" className="kit-btn is-label" onClick={copy} title={tr('复制', 'Copy')}><Copy size={14} aria-hidden="true" /></button>
        <button type="button" className="kit-btn is-label" onClick={() => { onEdit({ op: 'level.remove', level: id }); onSelect(null) }} title={tr('删除', 'Remove')}><Trash2 size={14} aria-hidden="true" /></button>
        <div className="editor-row">
          {form.tags && <TagChoice field={form} onEdit={edit} ctx={ctx} />}
          {form.shapes?.length > 1 && <Shapes field={form} onEdit={edit} ctx={ctx} />}
          {sections && (
          <nav className="editor-sections" aria-label={tr('分区', 'Sections')}>
            {sections.map((s, k) => (
              <a key={s.section} href={`#section-${s.section}`} title={`Alt+${k + 1}`} onClick={(e) => { e.preventDefault(); document.getElementById(`section-${s.section}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }}>{tr(...SECTION[s.section])}</a>
            ))}
          </nav>
          )}
        </div>
      </header>
      {rest.length > 0 && <ul className="field-findings is-level">{rest.map((f) => <li key={f}>{f}</li>)}</ul>}
      {scene && <div className="board-svg editor-scene" dangerouslySetInnerHTML={{ __html: scene }} />}
      {sections ? sections.map((s) => (
        <section key={s.section} id={`section-${s.section}`} className={`editor-section is-${s.section}`}>
          <h2>{tr(...SECTION[s.section])}</h2>
          <ObjField field={form} onEdit={edit} ctx={ctx} keys={s.fields.map((f) => f.key)} />
        </section>
      )) : <Field field={form} label={null} onEdit={edit} ctx={ctx} />}
    </article>
  )
}

function EraEditor({ content, vocabulary, order, names, levelOptions, e, onEdit, onSelect }) {
  const era = content.eras[e]
  const ctx = ctxOf({ vocabulary, order, names, levelOptions })
  const eraSchema = vocabulary.game.fields.eras.of
  // The era's own fields; where its levels go (the tree edits that) folded away below them.
  const part = (course) => formOf({ ...eraSchema, fields: Object.fromEntries(Object.entries(eraSchema.fields).filter(([, s]) => holdsLevels(s) === course)) }, era, { vocabulary, levels: order }, ['eras', e])
  const ids = new Set(eraLevels(era))
  return (
    <article className="editor">
      <header className="editor-head">
        <span className="editor-id is-static">{era.id}</span>
        <h1>{L(era.title ?? era.chapter?.title) ?? ''}</h1>
      </header>
      <Field field={part(false)} label={null} onEdit={editIn({ game: true }, onEdit)} ctx={ctx} />
      <details className="editor-course">
        <summary>{tr('关卡的位置', 'Where the levels go')}</summary>
        <Field field={part(true)} label={null} onEdit={editIn({ game: true }, onEdit)} ctx={ctx} />
      </details>
      <section className="copy">
        {order.filter((id) => ids.has(id)).map((id) => {
          const { id: _, ...value } = content.levels.find((l) => l.id === id)
          return (
            <div key={id} className="copy-level">
              <button type="button" className="copy-head" onClick={() => onSelect({ level: id })}><b>{id}</b> {L(value.title)}</button>
              {textsOf(vocabulary.level, value, vocabulary).map(({ path, value: text }) => (
                <div key={showPath(path)} className="copy-row">
                  <span className="field-key">{showPath(path)}</span>
                  <TextField value={text} label={`${id} ${showPath(path)}`} field={textField(path)} names={names} onSet={(next) => onEdit(opFor({ level: id }, path, { set: next }, 'text'))} />
                </div>
              ))}
            </div>
          )
        })}
      </section>
    </article>
  )
}

function GameEditor({ content, base, vocabulary, order, names, levelOptions, onEdit }) {
  const { domain, vocabulary: version, open } = content
  const strip = (c) => Object.fromEntries(Object.entries(c).filter(([k]) => !NOT_FORM.includes(k)))
  const game = strip(content)
  const schema = { ...vocabulary.game, fields: Object.fromEntries(Object.entries(vocabulary.game.fields).filter(([k]) => k !== 'eras' && k !== 'saves')) }
  const ctx = ctxOf({ vocabulary, order, names, levelOptions }, { before: beforeIn(base && strip(base)) })
  return (
    <article className="editor">
      <header className="editor-head">
        <span className="editor-id is-static">{domain} · v{version}</span>
        <h1>{L(content.title)}</h1>
      </header>
      <Field field={formOf(schema, game, { vocabulary, levels: order })} label={null} onEdit={editIn({ game: true }, onEdit)} ctx={ctx} />
      {open && <pre className="editor-open">{JSON.stringify(open, null, 1)}</pre>}
    </article>
  )
}
