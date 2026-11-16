// The tag editor of the package workspace (games/PACKAGES.md 3.2, 8): one tag at a time, an unordered set of one kind
// of object. Its title, its members (an object by its name and title; a nested tag as a link to it, unfolded to what
// it holds), members added from what the kind offers and taken out, nested tags refused when they would close a ring;
// for an item tag, whether it is a concept. Another layer's tags are read only.
import { useState } from 'react'
import { ChevronDown, ChevronRight, Layers, Plus, Trash2, X } from 'lucide-react'
import { L, getLang, tr } from '../shell/i18n.js'
import { Picker } from './Picker.jsx'
import { TextField } from './TextField.jsx'
import { confirmDelete } from './delete.js'
import { localName, namespaceOf, objectsOf, shownName, tagCandidates, tagMembers } from './objects-edit.js'
import { TAG_KINDS, memberKnown, memberTitle, newTag, tagValuesOp, textWith, withConcept, withMember, withoutMember } from './tag-edit.js'

const KIND_WORDS = { level: ['关卡', 'Levels'], item: ['项', 'Items'], entry: ['词条', 'Entries'], setting: ['设置', 'Settings'] }
const kindWord = (kind) => (KIND_WORDS[kind] ? tr(...KIND_WORDS[kind]) : kind)
const refusal = (reason) => ({
  duplicate: tr('标签里已经有它了。', 'The tag already holds it.'),
  self: tr('标签不能装自己。', 'A tag cannot hold itself.'),
  kind: tr('只能装同一种对象的标签。', 'Only a tag of the same kind can go in.'),
  cycle: tr('这样嵌套会形成循环。', 'This nesting would create a cycle.'),
})[reason] ?? ''

export default function TagEditor({ content, namespace, selected, pending, onSelect, onEdit, onOps }) {
  const [kind, setKind] = useState('')
  const all = objectsOf(content, 'tag', namespace)
  const shown = all.filter(([full, tag]) => !kind || tag.kind === kind || full === selected)
  const current = all.find(([full]) => full === selected) ?? shown[0] ?? null
  const kinds = TAG_KINDS.filter((k) => all.some(([, tag]) => tag.kind === k))
  const namespaces = [...new Set(shown.map(([full]) => namespaceOf(full)))]
  const create = (k) => {
    if (pending) return
    const { full, op } = newTag(content, namespace, k)
    onEdit(op)
    onSelect(full)
  }
  const remove = () => {
    const [full, , own] = current
    if (!own || pending || !confirmDelete(localName(namespace, full))) return
    onEdit({ op: 'tag.remove', tag: localName(namespace, full) })
    onSelect(null)
  }
  return (
    <article className="arrange">
      <header className="arrange-bar">
        {kinds.length > 1 && <select className="studio-game" value={kind} aria-label={tr('种类', 'Kind')} onChange={(e) => setKind(e.target.value)}>
          <option value="">{tr('全部', 'All')}</option>
          {kinds.map((k) => <option key={k} value={k}>{kindWord(k)}</option>)}
        </select>}
        {shown.length > 0 && <select className="studio-game" value={current?.[0] ?? ''} aria-label={tr('标签', 'Tag')} onChange={(e) => onSelect(e.target.value)}>
          {namespaces.map((ns) => <optgroup key={ns} label={ns}>
            {shown.filter(([full]) => namespaceOf(full) === ns).map(([full]) => <option key={full} value={full}>{shownName(namespace, full)}</option>)}
          </optgroup>)}
        </select>}
        <Picker options={TAG_KINDS.map((k) => ({ value: k, label: kindWord(k) }))} icon={Plus} label={tr('新的标签', 'New tag')} searchable={false} onPick={create} />
        {current?.[2] && <button type="button" className="kit-btn editor-tool" disabled={pending} title={tr('删除标签', 'Delete the tag')} aria-label={tr('删除标签', 'Delete the tag')} onClick={remove}><Trash2 size={14} aria-hidden="true" /></button>}
      </header>
      {current && <OneTag key={current[0]} full={current[0]} tag={current[1]} own={current[2]} content={content} namespace={namespace} pending={pending} onSelect={onSelect} onEdit={onEdit} onOps={onOps} />}
    </article>
  )
}

function OneTag({ full, tag, own, content, namespace, pending, onSelect, onEdit }) {
  const [open, setOpen] = useState(() => new Set())
  const [notice, setNotice] = useState('')
  const lang = getLang()
  const name = localName(namespace, full)
  const locked = pending || !own
  const count = tagMembers(content, full).length
  const titleOf = (member) => L(memberTitle(content, tag.kind, member))
  const known = (member) => memberKnown(content, tag.kind, member)
  const write = (values) => onEdit(tagValuesOp(namespace, full, values))
  const add = (member) => {
    if (locked) return
    const { values, refusal: reason } = withMember(content, full, member)
    if (!values) { setNotice(refusal(reason)); return }
    setNotice('')
    write(values)
  }
  const drop = (member) => {
    if (locked || !confirmDelete(shownName(namespace, member))) return
    setNotice('')
    write(withoutMember(content, full, member))
  }
  const toggle = (member) => setOpen((was) => {
    const next = new Set(was)
    if (next.has(member)) next.delete(member); else next.add(member)
    return next
  })
  const options = tagCandidates(content, tag.kind, full).filter((v) => !tag.values.includes(v)).map((v) => ({
    value: v, label: shownName(namespace, v), title: titleOf(v) ?? undefined, group: v.startsWith('#') ? tr('标签', 'Tags') : kindWord(tag.kind),
  }))
  return (
    <div className="tag-editor">
      <div className="object-head">
        <code className="editor-id is-static">{shownName(namespace, full)}</code>
        <span className="object-kind">{kindWord(tag.kind)}</span>
        <span className="object-count" title={tr('展开后的成员数', 'Members once expanded')}>{count}</span>
        {tag.kind === 'item' && <label className="object-flag">
          <input type="checkbox" className="field-check" checked={tag.concept ?? false} disabled={locked}
            onChange={(e) => onEdit({ op: 'tag.put', tag: name, data: withConcept(namespace, tag, e.target.checked) })} />
          {tr('概念', 'Concept')}
        </label>}
      </div>
      <div className="object-title">
        {own
          ? <TextField key={lang} lang={lang} value={tag.title} label={tr('标题', 'Title')} placeholder={tr('标题', 'Title')} compact
            onSet={(text) => { if (!pending) onEdit({ op: 'tag.set', tag: name, path: 'title', value: textWith(namespace, tag.title, lang, text) }) }} />
          : <span>{L(tag.title)}</span>}
      </div>
      <div className="arrange-actions">
        {own && options.length > 0 && <Picker options={options} add label={tr('加入成员', 'Add a member')} placeholder={tr('加入成员', 'Add a member')} onPick={add} />}
        {notice && <p className="is-error" role="status">{notice}</p>}
      </div>
      <ul className="tag-members" aria-label={tr('成员', 'Members')}>
        {tag.values.map((member) => member.startsWith('#')
          ? <li key={member}>
            <div className={`tag-member is-tag ${known(member) ? '' : 'is-unknown'}`}>
              <button type="button" className="kit-btn editor-tool" aria-expanded={open.has(member)} aria-label={tr('展开', 'Expand')} onClick={() => toggle(member)}>
                {open.has(member) ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
              </button>
              <button type="button" className="tag-link" onClick={() => onSelect(member.slice(1))}>
                <Layers size={13} aria-hidden="true" /><code>{shownName(namespace, member)}</code><span>{titleOf(member)}</span>
                <small className="object-count">{tagMembers(content, member.slice(1)).length}</small>
              </button>
              {own && <button type="button" className="kit-btn editor-tool" disabled={pending} aria-label={tr('去掉')} title={tr('去掉')} onClick={() => drop(member)}><X size={12} aria-hidden="true" /></button>}
            </div>
            {open.has(member) && <ul className="tag-members">
              {tagMembers(content, member.slice(1)).map((id) => <li key={id} className="tag-member is-nested">
                <code>{shownName(namespace, id)}</code><span>{titleOf(id)}</span>
              </li>)}
            </ul>}
          </li>
          : <li key={member} className={`tag-member ${known(member) ? '' : 'is-unknown'}`}>
            <code>{shownName(namespace, member)}</code><span>{titleOf(member)}</span>
            {own && <button type="button" className="kit-btn editor-tool" disabled={pending} aria-label={tr('去掉')} title={tr('去掉')} onClick={() => drop(member)}><X size={12} aria-hidden="true" /></button>}
          </li>)}
      </ul>
    </div>
  )
}
