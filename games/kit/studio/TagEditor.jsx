// The tag editor of the package workspace (games/PACKAGES.md 3.2, 8): one tag at a time, an unordered set of one kind
// of object. Its title, its members (an object by its name and title; a nested tag as a link to it, unfolded to what
// it holds), members added from what the kind offers and taken out, nested tags refused when they would close a ring;
// for an item tag, whether it is a concept. Another layer's tags are read only. The list of tags is the left column's
// (ObjectLists.jsx); its file the right's.
import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, GripVertical, Layers, Trash2, X } from 'lucide-react'
import { L, getLang, tr } from '../shell/i18n.js'
import { Picker } from './Picker.jsx'
import { TextField } from './TextField.jsx'
import { confirmDelete } from './delete.js'
import { localName, namespaceOf, shownName, tagCandidates, tagMembers } from './objects-edit.js'
import { tagKindWord } from './ObjectLists.jsx'
import { canOrder, memberOrderName, memberOrderOps, reordered, valuesInOrder } from './tag-order.js'
import { useDragOrder } from './useDragOrder.js'
import SourceMark from './SourceMark.jsx'
import { overridesIt, tagOverrideOps } from './override-edit.js'
import { memberKnown, memberTitle, tagValuesOp, textWith, withConcept, withMember, withoutMember } from './tag-edit.js'

const refusal = (reason) => ({
  duplicate: tr('标签里已经有它了。', 'The tag already holds it.'),
  self: tr('标签不能装自己。', 'A tag cannot hold itself.'),
  kind: tr('只能装同一种对象的标签。', 'Only a tag of the same kind can go in.'),
  cycle: tr('这样嵌套会形成循环。', 'This nesting would create a cycle.'),
})[reason] ?? ''

/** The tag `full` (picked in the left list, TagList); `onSelect(full)` opens another, `onPick(path)` shows a field of its file on the right. */
export default function TagEditor({ content, namespace, full, pending, onSelect, onEdit, onOps, onPick }) {
  const tag = content?.registries?.tag?.[full]
  if (!tag) return <article className="arrange" />
  const own = namespaceOf(full) === namespace
  const remove = () => {
    if (!own || pending || !confirmDelete(localName(namespace, full))) return
    onEdit({ op: 'tag.remove', tag: localName(namespace, full) })
    onSelect(null)
  }
  return (
    <article className="arrange">
      <OneTag key={full} full={full} tag={tag} own={own} content={content} namespace={namespace} pending={pending} onSelect={onSelect} onEdit={onEdit} onOps={onOps} onPick={onPick} onRemove={own ? remove : null} />
    </article>
  )
}

function OneTag({ full, tag, own, content, namespace, pending, onSelect, onEdit, onOps, onPick, onRemove }) {
  const [open, setOpen] = useState(() => new Set())
  const [notice, setNotice] = useState('')
  const lang = getLang()
  const name = localName(namespace, full)
  const [overriding, setOverriding] = useState(() => overridesIt(content, namespace, 'tag', full))
  const editable = own || overriding
  const locked = pending || !editable
  const count = tagMembers(content, full).length
  const titleOf = (member) => L(memberTitle(content, tag.kind, member))
  const known = (member) => memberKnown(content, tag.kind, member)
  const write = (values) => (own ? onEdit(tagValuesOp(namespace, full, values)) : onOps(tagOverrideOps(content, namespace, full, values)))
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
  // The members' order is the relation <tag>-order (games/PACKAGES.md 3.2): dragged, or moved with Alt+↑/↓.
  const ordered = valuesInOrder(content, full)
  const movable = !pending && canOrder(content, namespace, memberOrderName(full), full, overriding)
  const moveMember = (member, to) => {
    const ops = memberOrderOps(content, namespace, full, reordered(ordered, [member], to), overriding)
    if (ops?.length) onOps(ops)
  }
  const { item } = useDragOrder({ ids: ordered, onMove: moveMember, disabled: !movable })
  const movesAt = movable && ordered.length > 1
  const grip = movesAt && <span className="member-grip" aria-hidden="true"><GripVertical size={12} /></span>
  const mover = (member) => movesAt && (
    <span className="member-move">
      <button type="button" className="kit-btn editor-tool" disabled={ordered[0] === member} aria-label={tr('上移', 'Move up')} title={tr('上移', 'Move up') + ' (Alt+↑)'}
        onClick={(e) => { e.stopPropagation(); moveMember(member, { before: ordered[ordered.indexOf(member) - 1] }) }}><ArrowUp size={12} aria-hidden="true" /></button>
      <button type="button" className="kit-btn editor-tool" disabled={ordered.at(-1) === member} aria-label={tr('下移', 'Move down')} title={tr('下移', 'Move down') + ' (Alt+↓)'}
        onClick={(e) => { e.stopPropagation(); moveMember(member, { after: ordered[ordered.indexOf(member) + 1] }) }}><ArrowDown size={12} aria-hidden="true" /></button>
    </span>
  )
  const options = tagCandidates(content, tag.kind, full).filter((v) => !tag.values.includes(v)).map((v) => ({
    value: v, label: shownName(namespace, v), title: titleOf(v) ?? undefined, group: v.startsWith('#') ? tr('标签', 'Tags') : tagKindWord(tag.kind),
  }))
  return (
    <div className="tag-editor">
      <div className="object-head">
        <code className="editor-id is-static">{shownName(namespace, full)}</code>
        <span className="object-kind">{tagKindWord(tag.kind)}</span>
        <span className="object-count" title={tr('展开后的成员数', 'Members once expanded')}>{count}</span>
        <SourceMark content={content} kind="tag" full={full} own={own} overriding={overriding} pending={pending} onOverride={() => setOverriding(true)} />
        {tag.kind === 'piece' && <label className="object-flag">
          <input type="checkbox" className="field-check" checked={tag.concept ?? false} disabled={locked}
            onChange={(e) => onEdit({ op: 'tag.put', tag: name, data: withConcept(namespace, tag, e.target.checked) })} />
          {tr('概念', 'Concept')}
        </label>}
        <span className="kit-spacer" />
        {onRemove && <button type="button" className="kit-btn editor-tool" disabled={pending} title={tr('删除标签', 'Delete the tag')} aria-label={tr('删除标签', 'Delete the tag')} onClick={onRemove}><Trash2 size={14} aria-hidden="true" /></button>}
      </div>
      <div className="object-title" onFocus={() => onPick?.(['title'])} onClick={() => onPick?.(['title'])}>
        {own
          ? <TextField key={lang} lang={lang} value={tag.title} label={tr('标题', 'Title')} placeholder={tr('标题', 'Title')} compact
            onSet={(text) => { if (!pending) onEdit({ op: 'tag.set', tag: name, path: 'title', value: textWith(namespace, tag.title, lang, text) }) }} />
          : <span>{L(tag.title)}</span>}
      </div>
      <div className="arrange-actions">
        {editable && options.length > 0 && <Picker options={options} add label={tr('加入成员', 'Add a member')} placeholder={tr('加入成员', 'Add a member')} onPick={add} />}
        {notice && <p className="is-error" role="status">{notice}</p>}
      </div>
      <ul className="tag-members" aria-label={tr('成员', 'Members')}>
        {ordered.map((member) => [member, tag.values.indexOf(member)]).map(([member, k]) => member.startsWith('#')
          ? <li key={member} {...item(member)}>
            <div className={`tag-member is-tag ${known(member) ? '' : 'is-unknown'}`}>
              {grip}
              <button type="button" className="kit-btn editor-tool" aria-expanded={open.has(member)} aria-label={tr('展开', 'Expand')} onClick={() => toggle(member)}>
                {open.has(member) ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
              </button>
              <button type="button" className="tag-link" onClick={() => { onPick?.(['values', k]); onSelect(member.slice(1)) }}>
                <Layers size={13} aria-hidden="true" /><code>{shownName(namespace, member)}</code><span>{titleOf(member)}</span>
                <small className="object-count">{tagMembers(content, member.slice(1)).length}</small>
              </button>
              {mover(member)}
              {editable && <button type="button" className="kit-btn editor-tool" disabled={pending} aria-label={tr('去掉')} title={tr('去掉')} onClick={() => drop(member)}><X size={12} aria-hidden="true" /></button>}
            </div>
            {open.has(member) && <ul className="tag-members">
              {tagMembers(content, member.slice(1)).map((id) => <li key={id} className="tag-member is-nested">
                <code>{shownName(namespace, id)}</code><span>{titleOf(id)}</span>
              </li>)}
            </ul>}
          </li>
          : <li key={member} className={`tag-member ${known(member) ? '' : 'is-unknown'}`} onClick={() => onPick?.(['values', k])} {...item(member)}>
            {grip}
            <code>{shownName(namespace, member)}</code><span>{titleOf(member)}</span>
            {mover(member)}
            {editable && <button type="button" className="kit-btn editor-tool" disabled={pending} aria-label={tr('去掉')} title={tr('去掉')} onClick={() => drop(member)}><X size={12} aria-hidden="true" /></button>}
          </li>)}
      </ul>
    </div>
  )
}
