// The package workspace's group board (games/DESIGN.md 2, 6.7): one level group at a time, its levels and the links
// between them, its recommended arrangement for whoever places the whole group in a course. A wire is dragged from a
// level's output to another's input; a level is added from the package, tagged optional or skippable, or taken out of
// the group; the group is named, renamed, made and removed here. Every change is a group operation.
import { useMemo, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { L, T, getLang, tr } from '../shell/i18n.js'
import { groupLevels } from '../engine/groups.js'
import { Picker } from './Picker.jsx'
import ArrangementBoard from './ArrangementBoard.jsx'
import { linkKey, wiringBoard, wiringRefusal } from './arrangement.js'
import { confirmDelete } from './delete.js'
import { freeName } from './PartsList.jsx'
import { groupOf } from './groups.js'
import { TextField } from './TextField.jsx'

const GROUP_ID = /^[a-z][a-z0-9-]*$/
const refusal = (reason) => ({
  self: tr('关卡不能接到自己。', 'A level cannot depend on itself.'),
  duplicate: tr('这条连线已存在。', 'This wire already exists.'),
  cycle: tr('这条连线会形成循环依赖。', 'This wire would create a cycle.'),
})[reason]

export default function GroupBoard({ content, at, options, pending, onSelect, onEdit }) {
  const ids = Object.keys(content.groups)
  const current = (at?.group !== undefined && content.groups[at.group] ? at.group : null) ?? (at?.level && groupOf(content, at.level)) ?? ids[0] ?? null
  const group = current ? content.groups[current] : null
  const levels = useMemo(() => new Map(options.map((option) => [option.value, option])), [options])
  const create = () => {
    const id = freeName([...ids, ...content.levels.map((level) => level.id)], 'group')
    onEdit({ op: 'group.add', group: id, data: { title: T('新的一组', 'New group'), levels: [] } })
    onSelect({ group: id })
  }
  const bar = (
    <header className="arrange-bar">
      {ids.length > 0 && <select className="studio-game" value={current ?? ''} aria-label={tr('关卡组', 'Level group')} onChange={(e) => onSelect({ group: e.target.value })}>
        {ids.map((id) => <option key={id} value={id}>{L(content.groups[id].title) || id}</option>)}
      </select>}
      <button type="button" className="kit-btn editor-tool" disabled={pending} onClick={create} title={tr('新建一组', 'New group')}><Plus size={14} /></button>
    </header>
  )
  if (!group) return <article className="arrange">{bar}</article>
  return <OneGroup key={current} id={current} group={group} content={content} at={at} levels={levels} options={options} pending={pending} bar={bar} onSelect={onSelect} onEdit={onEdit} />
}

function OneGroup({ id, group, content, at, levels, options, pending, bar, onSelect, onEdit }) {
  const members = groupLevels(group)
  const links = useMemo(() => (group.links ?? []).map((link) => ({ ...link, source: 'course' })), [group])
  const requires = useMemo(() => new Map(members.map((level) => [level, links.filter(({ to }) => to === level).map(({ from }) => from)])), [members, links])
  const board = useMemo(() => wiringBoard(members, [], requires, links), [members, requires, links])
  const [armed, setArmed] = useState(null)
  const [highlight, setHighlight] = useState(null)
  const [notice, setNotice] = useState('')
  const [name, setName] = useState(id)
  const selected = members.includes(at?.level) ? at.level : null
  const wire = links.find((link) => linkKey(link) === highlight)
  const entry = selected && group.levels.find((level) => level.id === selected)
  const describe = (level) => `${level} ${L(levels.get(level)?.title) ?? ''}`.trim()
  const label = (level) => {
    const own = group.levels.find((x) => x.id === level)
    return <><code>{level}</code><span>{L(levels.get(level)?.title)}</span>{own?.optional && <small>{tr('可选', 'Optional')}</small>}{own?.skippable && <small>{tr('可跳过', 'Skippable')}</small>}</>
  }
  const reset = () => { setArmed(null); setHighlight(null); setNotice('') }
  const setLinks = (next) => onEdit(next.length ? { op: 'group.set', group: id, path: ['links'], value: next } : { op: 'group.unset', group: id, path: ['links'] })
  const plain = (link) => ({ from: link.from, to: link.to, ...(link.required && { required: true }) })
  const connect = (from, to) => {
    if (pending || !members.includes(to)) return
    const problem = wiringRefusal(requires, from, to)
    if (problem) { setNotice(refusal(problem)); return }
    setLinks([...links.map(plain), { from, to }])
    reset()
    setHighlight(linkKey({ from, to }))
  }
  const removeWire = () => {
    if (!wire || pending || !confirmDelete(`${wire.from} → ${wire.to}`)) return
    setLinks(links.filter((link) => linkKey(link) !== highlight).map(plain))
    reset()
  }
  const tag = (key, checked) => {
    const k = group.levels.findIndex((level) => level.id === selected)
    onEdit(checked ? { op: 'group.set', group: id, path: ['levels', k, key], value: true } : { op: 'group.unset', group: id, path: ['levels', k, key] })
  }
  const rename = () => {
    if (name === id || !GROUP_ID.test(name) || content.groups[name] || levels.has(name)) { setName(id); return }
    onEdit({ op: 'group.rename', group: id, to: name })
    onSelect({ group: name })
  }
  const remove = () => {
    if (!confirmDelete(L(group.title) || id)) return
    onEdit({ op: 'group.remove', group: id })
    onSelect(null)
  }
  const outside = options.filter(({ value }) => !members.includes(value))
  return (
    <article className="arrange" onKeyDown={(event) => {
      if (event.key === 'Delete' && !event.repeat && wire && !event.target.matches('input, textarea, select, [contenteditable]')) {
        event.preventDefault()
        removeWire()
      }
    }}>
      {bar}
      <div className="arrange-group">
        <input className="editor-id" value={name} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          aria-label={tr('组的 id', 'Group id')} spellCheck={false} disabled={pending} />
        <div className="arrange-group-title">
          <TextField value={group.title} lang={getLang()} label={tr('组名', 'Group name')} field="title" compact
            onSet={(text) => onEdit({ op: 'text.set', group: id, path: ['title'], lang: getLang(), value: text })} />
        </div>
        {outside.length > 0 && <Picker options={outside} label={tr('加入关卡', 'Add a level')} placeholder={tr('加入关卡', 'Add a level')}
          onPick={(level) => onEdit({ op: 'group.place', level, to: { group: id } })} />}
        <button type="button" className="kit-btn editor-tool" disabled={pending} onClick={remove} title={tr('删掉这一组（关卡留在包里）', 'Remove the group (its levels stay in the package)')}><Trash2 size={14} /></button>
      </div>
      <div className="arrange-actions">
        {wire ? <>
          <strong>{describe(wire.from)} → {describe(wire.to)}</strong>
          {group.levels.find((level) => level.id === wire.from)?.skippable && <label>
            <input type="checkbox" checked={wire.required ?? false} disabled={pending} onChange={(e) => {
              setLinks(links.map((link) => (linkKey(link) === highlight ? { from: link.from, to: link.to, ...(e.target.checked && { required: true }) } : plain(link))))
            }} />
            {tr('须通过这个前置', 'Require a pass on this prerequisite')}
          </label>}
          <button type="button" className="kit-btn is-label" disabled={pending} onClick={removeWire}><Trash2 size={13} aria-hidden="true" />{tr('断开连线', 'Disconnect')}</button>
        </> : entry ? <>
          <strong>{describe(selected)}</strong>
          <label><input type="checkbox" checked={entry.optional ?? false} disabled={pending} onChange={(e) => tag('optional', e.target.checked)} />{tr('可选', 'Optional')}</label>
          <label><input type="checkbox" checked={entry.skippable ?? false} disabled={pending} onChange={(e) => tag('skippable', e.target.checked)} />{tr('可跳过', 'Skippable')}</label>
          <button type="button" className="kit-btn is-label" disabled={pending} onClick={() => onEdit({ op: 'group.place', level: selected })}><X size={13} aria-hidden="true" />{tr('移出这一组', 'Take out of the group')}</button>
        </> : null}
        {notice && <p className="is-error" role="status">{notice}</p>}
      </div>
      <ArrangementBoard key={id} board={board} label={label} describe={describe} active={selected} picked={board.hosted.has(armed) ? armed : null} wire={highlight} pending={pending} isExternal={() => false}
        onLevel={(level) => { reset(); onSelect({ level }) }} onWire={(edge) => { reset(); setHighlight(linkKey(edge)) }}
        onPick={(level) => { reset(); setArmed(armed === level ? null : level) }} onConnect={connect} onCancel={reset} />
    </article>
  )
}
