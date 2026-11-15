import { useMemo, useState } from 'react'
import { ArrowLeft, ListOrdered, Save, Trash2 } from 'lucide-react'
import { eraLevels, layout } from '../course.js'
import { L, tr } from '../shell/i18n.js'
import { Picker } from './Picker.jsx'
import ArrangementBoard from './ArrangementBoard.jsx'
import { linkKey, wiringBoard, wiringRefusal } from './arrangement.js'

const nameOf = (era) => L(era.title ?? era.chapter?.title) ?? String(era.id)
const message = (reason) => ({
  self: tr('关卡不能接到自己。', 'A level cannot depend on itself.'),
  duplicate: tr('这条连线已存在。', 'This wire already exists.'),
  cycle: tr('这条连线会形成循环依赖。', 'This wire would create a cycle.'),
})[reason]

export default function Arrangement({ content, groups, at, options, pending, save, onSelect, onEdit, onMove }) {
  const { eras } = content
  const notes = content.mode === 'notes'
  const { place, requires } = useMemo(() => layout(eras), [eras])
  const levels = useMemo(() => new Map(options.map((option) => [option.value, option])), [options])
  const links = useMemo(() => eras.flatMap((era) => era.links ?? []), [eras])
  const indices = useMemo(() => new Map(eras.map((era, index) => [era.id, index])), [eras])
  const index = indices.get(place.get(at?.level)?.era) ?? at?.era ?? 0
  const era = eras[index] ?? eras[0]
  const selected = place.has(at?.level) ? at.level : null
  const [scope, setScope] = useState(null)
  const [armed, setArmed] = useState(null)
  const [highlight, setHighlight] = useState(null)
  const [notice, setNotice] = useState('')
  const group = groups.find(({ id }) => id === scope?.group)
  const pins = group || scope?.era === era?.id ? scope?.pins : null
  const board = useMemo(() => era && wiringBoard(group ? group.levels.filter((id) => place.has(id)) : eraLevels(era), pins ?? [], requires, links), [era, group, place, pins, requires, links])
  if (!era) return <p className="studio-loading">{tr('没有章节', 'No chapters')}</p>
  const picked = board.hosted.has(armed) ? armed : null
  const wire = board.edges.find((edge) => linkKey(edge) === highlight)
  const describe = (id) => {
    const title = L(levels.get(id)?.title)
    return title ? `${id} ${title}` : id
  }
  const label = (id) => <><code>{id}</code><span>{L(levels.get(id)?.title)}</span>{place.get(id)?.optional && <small>{tr('可选', 'Optional')}</small>}</>
  const resetWire = () => { setArmed(null); setHighlight(null); setNotice('') }
  const open = (group = null) => {
    resetWire()
    setScope({ era: era.id, group, pins: [] })
  }
  const setField = (path, values) => onEdit(values.length ? { op: 'game.set', path, value: values } : { op: 'game.unset', path })
  const updateLink = (link, value) => {
    const destination = indices.get(place.get(link.to).era)
    const old = eras[destination].links ?? []
    const key = linkKey(link)
    const next = old.some((item) => linkKey(item) === key)
      ? old.flatMap((item) => linkKey(item) === key ? value ? [value] : [] : [item])
      : [...old, value]
    setField(['eras', destination, 'links'], next)
  }
  const connect = (from, to) => {
    if (pending) return
    const problem = wiringRefusal(requires, from, to)
    if (problem) { setNotice(message(problem)); return }
    const edge = { from, to }
    updateLink(edge, edge)
    setArmed(null)
    setNotice('')
    setHighlight(linkKey(edge))
  }
  const chooseWire = (edge) => { resetWire(); setHighlight(linkKey(edge)) }
  const removeWire = () => {
    if (!wire || pending) return
    updateLink(wire, null)
    resetWire()
  }
  const groupOptions = groups.map(({ id, title, code }) => ({ value: id, label: code ?? L(title), ...(code && { title }) }))
  const outside = options.filter(({ value }) => place.has(value) && !board.hosted.has(value))
    .map(({ value, title, group }) => ({ value, label: value, title, group }))

  return (
    <article className="arrange" onKeyDown={(event) => {
      if (event.key === 'Delete' && wire && !event.target.matches('input, textarea, select, [contenteditable]')) {
        event.preventDefault()
        removeWire()
      }
    }}>
      <header className="arrange-bar">
        <select className="studio-game" value={index} aria-label={tr('章节', 'Chapter')}
          onChange={(e) => { resetWire(); setScope(null); onSelect({ era: Number(e.target.value) }) }}>
          {eras.map((chapter, i) => <option key={chapter.id} value={i}>{nameOf(chapter)}</option>)}
        </select>
        {group && (
          <button type="button" className="kit-btn is-label" onClick={() => open()}>
            <ArrowLeft size={13} aria-hidden="true" />{tr('返回章节', 'Back to chapter')}
          </button>
        )}
        {groups.length > 0 && <Picker options={groupOptions} value={group?.id} label={tr('按分组筛选', 'Filter by group')} placeholder={tr('按分组筛选', 'Filter by group')} onPick={open} />}
        {outside.length > 0 && <Picker options={outside} label={tr('添加外部端口', 'Add external ports')} placeholder={tr('外部端口', 'External ports')}
          onPick={(id) => setScope({ era: era.id, group: group?.id, pins: [...(pins ?? []), id] })} />}
        <span className="kit-spacer" />
        <button type="button" className="kit-btn is-label arrange-save" disabled={!save.ready} onClick={save.apply}>
          <Save size={14} aria-hidden="true" />{save.saving ? tr('正在保存', 'Saving') : tr('保存变更', 'Save changes')}
        </button>
      </header>
      <div className="arrange-actions">
        {wire ? <>
          <strong>{describe(wire.from)} → {describe(wire.to)}</strong>
          {place.get(wire.from)?.optional && <label>
            <input type="checkbox" checked={wire.required ?? false} disabled={pending} onChange={(e) => {
              updateLink(wire, { from: wire.from, to: wire.to, ...(e.target.checked && { required: true }) })
            }} />
            {tr('须完成可选前置', 'Require this optional level')}
          </label>}
          <button type="button" className="kit-btn is-label" disabled={pending} onClick={removeWire}>
            <Trash2 size={13} aria-hidden="true" />{tr('断开连线', 'Disconnect')}
          </button>
        </> : selected ? <>
          <strong>{describe(selected)}</strong>
          <label>
            <input type="checkbox" checked={place.get(selected).optional} disabled={pending} onChange={(e) => {
              const chapter = indices.get(place.get(selected).era)
              const levelIndex = eras[chapter].levels.findIndex(({ id }) => id === selected)
              const path = ['eras', chapter, 'levels', levelIndex, 'optional']
              onEdit(e.target.checked ? { op: 'game.set', path, value: true } : { op: 'game.unset', path })
            }} />
            {tr('可选', 'Optional')}
          </label>
          <button type="button" className="kit-btn is-label" disabled={pending} onClick={() => onMove(selected)}>
            <ListOrdered size={13} aria-hidden="true" />{tr('调整课程顺序', 'Reorder level')}
          </button>
        </> : null}
        <p className={notice ? 'is-error' : ''} role="status">{notice || (picked
          ? tr(`从 ${describe(picked)} 接出，选择目标输入。`, `Choose the target input for ${describe(picked)}.`)
          : notes ? tr('笔记模式试玩时直接开放所有关。', 'Notes mode opens every level during play.')
          : !wire && !selected ? tr('拖动关卡调整视图，从输出接到输入添加依赖。', 'Drag levels to arrange the view. Connect an output to an input to add a prerequisite.') : '')}</p>
      </div>
      {save.dirty && <p className={`arrange-saved ${save.problems.length ? 'is-error' : ''}`} role="status">
        {save.problems[0] ?? tr('保存后编排变更才会生效。', 'Save to apply course changes.')}
      </p>}
      {save.said && <p className={`arrange-saved ${save.said.ok ? '' : 'is-error'}`} role="status">
        {save.said.ok ? tr('已保存到 game.json。', 'Saved to game.json.') : save.said.text}
      </p>}
      <ArrangementBoard key={group?.id ?? era.id} board={board} label={label} describe={describe} active={selected} picked={picked} wire={highlight} pending={pending}
        onLevel={(level) => { resetWire(); onSelect({ level }) }} onWire={chooseWire}
        onPick={(id) => { resetWire(); setArmed(picked === id ? null : id) }} onConnect={connect} onCancel={resetWire} />
    </article>
  )
}
