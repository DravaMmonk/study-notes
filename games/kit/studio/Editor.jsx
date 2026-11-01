// What the studio edits, as forms from the schemas (Fields.jsx, form.js): a level (its file); an era (its place in
// game.json, and every text of its levels in play order, to read a chapter's copy through and fix it in place); or
// the rest of game.json. Each edit becomes the operation that makes it (form.js opFor); the level's own actions are
// operations too: level.rename, level.add (a copy after it), level.remove, and moving it in the tree.
import { useMemo, useState } from 'react'
import { ArrowRightLeft, Copy, Play, Trash2 } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { showPath } from '../engine/ops/edit.js'
import { eraLevels } from '../course.js'
import { formOf, opFor, textsOf } from './form.js'
import { Field, TextPair } from './Fields.jsx'

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
// What the game form leaves out: what is not game.json's own schema, the course (the tree and the eras edit it) and
// the save migrations (written by the operation set).
const NOT_FORM = ['id', 'levels', 'glossary', 'domain', 'vocabulary', 'open', 'eras', 'saves']

export default function Editor({ content, vocab, at, lines, onEdit, onSelect, onPlay, onMove }) {
  const { vocabulary } = vocab
  const order = useMemo(() => content.levels.map((l) => l.id), [content])
  if (at?.level && content.levels.some((l) => l.id === at.level)) return <LevelEditor key={at.level} {...{ content, vocabulary, id: at.level, lines, onEdit, onSelect, onPlay, onMove, order }} />
  if (at?.era !== undefined && content.eras?.[at.era]) return <EraEditor {...{ content, vocabulary, e: at.era, onEdit, onSelect, order }} />
  return <GameEditor {...{ content, vocabulary, onEdit, order }} />
}

const ctxOf = (vocabulary, order, extra = {}) => ({ vocabulary, levels: order, ...extra })
/** The edit of a field in `file` as its operation. */
const editIn = (file, onEdit) => (path, edit, type) => onEdit(opFor(file, path, edit, type))

function LevelEditor({ content, vocabulary, id, onEdit, onSelect, onPlay, onMove, order }) {
  const { id: _, ...value } = content.levels.find((l) => l.id === id)
  const ctx = ctxOf(vocabulary, order, { onBoard: (path) => onPlay(id, showPath(path), true) })
  const form = formOf(vocabulary.level, value, ctx)
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
  return (
    <article className="editor">
      <header className="editor-head">
        <input className="editor-id" value={name} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} aria-label={tr('关卡 id', 'Level id')} size={Math.max(3, name.length)} />
        <h1>{L(value.title)}</h1>
        <span className="kit-spacer" />
        <button type="button" className="kit-btn is-label is-solid" onClick={() => onPlay(id)}><Play size={14} aria-hidden="true" />{tr('试玩', 'Play')}</button>
        <button type="button" className="kit-btn is-label" onClick={() => onMove(id)}><ArrowRightLeft size={14} aria-hidden="true" />{tr('移动', 'Move')}</button>
        <button type="button" className="kit-btn is-label" onClick={copy}><Copy size={14} aria-hidden="true" />{tr('复制', 'Copy')}</button>
        <button type="button" className="kit-btn is-label" onClick={() => { onEdit({ op: 'level.remove', level: id }); onSelect(null) }}><Trash2 size={14} aria-hidden="true" />{tr('删除', 'Remove')}</button>
      </header>
      <Field field={form} label={null} onEdit={editIn({ level: id }, onEdit)} ctx={ctx} />
    </article>
  )
}

function EraEditor({ content, vocabulary, e, onEdit, onSelect, order }) {
  const era = content.eras[e]
  const ctx = ctxOf(vocabulary, order)
  const eraSchema = vocabulary.game.fields.eras.of
  const form = formOf(eraSchema, era, ctx, ['eras', e])
  const ids = new Set(eraLevels(era))
  return (
    <article className="editor">
      <header className="editor-head">
        <span className="editor-id is-static">{era.id}</span>
        <h1>{L(era.title ?? era.chapter?.title) ?? ''}</h1>
      </header>
      <Field field={form} label={null} onEdit={editIn({ game: true }, onEdit)} ctx={ctx} />
      <section className="copy">
        {order.filter((id) => ids.has(id)).map((id) => {
          const { id: _, ...value } = content.levels.find((l) => l.id === id)
          return (
            <div key={id} className="copy-level">
              <button type="button" className="copy-head" onClick={() => onSelect({ level: id })}><b>{id}</b> {L(value.title)}</button>
              {textsOf(vocabulary.level, value, vocabulary).map(({ path, value: text }) => (
                <div key={showPath(path)} className="copy-row">
                  <span className="field-key">{showPath(path)}</span>
                  <TextPair value={text} label={`${id} ${showPath(path)}`} onSet={(next) => onEdit(opFor({ level: id }, path, { set: next }, 'text'))} />
                </div>
              ))}
            </div>
          )
        })}
      </section>
    </article>
  )
}

function GameEditor({ content, vocabulary, onEdit, order }) {
  const { domain, vocabulary: version, open } = content
  const game = Object.fromEntries(Object.entries(content).filter(([k]) => !NOT_FORM.includes(k)))
  const schema = { ...vocabulary.game, fields: Object.fromEntries(Object.entries(vocabulary.game.fields).filter(([k]) => k !== 'eras' && k !== 'saves')) }
  const ctx = ctxOf(vocabulary, order)
  return (
    <article className="editor">
      <header className="editor-head">
        <span className="editor-id is-static">{domain} · v{version}</span>
        <h1>{L(content.title)}</h1>
      </header>
      <Field field={formOf(schema, game, ctx)} label={null} onEdit={editIn({ game: true }, onEdit)} ctx={ctx} />
      {open && <pre className="editor-open">{JSON.stringify(open, null, 1)}</pre>}
    </article>
  )
}
