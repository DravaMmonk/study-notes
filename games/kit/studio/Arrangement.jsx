import { useEffect, useMemo, useState } from 'react'
import { ListOrdered, Save, Trash2 } from 'lucide-react'
import { eraLevels } from '../course.js'
import { courseLayout } from '../engine/course-dependencies.js'
import { L, tr } from '../shell/i18n.js'
import { Picker } from './Picker.jsx'
import ArrangementBoard from './ArrangementBoard.jsx'
import { externalPort, implicitWireChanges, linkKey, projectWires, wiringBoard, wiringRefusal } from './arrangement.js'
import { call } from './api.js'
import { confirmDelete } from './delete.js'

const nameOf = (era) => L(era.title ?? era.chapter?.title) ?? String(era.id)
const message = (reason) => ({
  self: tr('关卡不能接到自己。', 'A level cannot depend on itself.'),
  duplicate: tr('这条连线已存在。', 'This wire already exists.'),
  cycle: tr('这条连线会形成循环依赖。', 'This wire would create a cycle.'),
})[reason]

export default function Arrangement({ content, base, at, options, pending, save, onSelect, onEdit, onMove }) {
  const { eras } = content
  const notes = content.mode === 'notes'
  const { place, dependencyLinks } = useMemo(() => courseLayout(content), [content])
  const [catalog, setCatalog] = useState([])
  const [catalogError, setCatalogError] = useState('')
  useEffect(() => {
    let active = true
    call('course_catalog', { game: content.id }).then(
      (result) => { if (active) setCatalog(result) },
      (error) => { if (active) setCatalogError(error.message) },
    )
    return () => { active = false }
  }, [content.id])
  const external = useMemo(() => new Map(catalog.flatMap(({ game, title, levels }) =>
    levels.map(({ id, title: name }) => [externalPort(game, id), { game, id, title: name, group: title ?? game }]))), [catalog])
  const levels = useMemo(() => new Map(options.map((option) => [option.value, option])), [options])
  const links = useMemo(() => projectWires(dependencyLinks), [dependencyLinks])
  const savedLinks = useMemo(() => base && projectWires(courseLayout(base).dependencyLinks), [base])
  const wireChanges = useMemo(() => base?.id === content.id && save.dirty && savedLinks
    ? implicitWireChanges(savedLinks, links) : null, [base?.id, content.id, save.dirty, savedLinks, links])
  const requires = useMemo(() => {
    const map = new Map([...place.keys()].map((id) => [id, []]))
    for (const { from, to } of links) map.get(to)?.push(from)
    return map
  }, [place, links])
  const indices = useMemo(() => new Map(eras.map((era, index) => [era.id, index])), [eras])
  const index = indices.get(place.get(at?.level)?.era) ?? at?.era ?? 0
  const era = eras[index] ?? eras[0]
  const selected = place.has(at?.level) ? at.level : null
  const [scope, setScope] = useState(null)
  const [armed, setArmed] = useState(null)
  const [highlight, setHighlight] = useState(null)
  const [notice, setNotice] = useState('')
  const pins = scope?.era === era?.id ? scope?.pins : null
  const board = useMemo(() => era && wiringBoard(eraLevels(era), pins ?? [], requires, links), [era, pins, requires, links])
  if (!era) return <p className="studio-loading">{tr('没有章节', 'No chapters')}</p>
  const picked = board.hosted.has(armed) ? armed : null
  const wire = board.edges.find((edge) => linkKey(edge) === highlight)
  const nameOfLevel = (id) => L((levels.get(id) ?? external.get(id))?.title)
  const describe = (id) => {
    const title = nameOfLevel(id)
    return title ? `${id} ${title}` : id
  }
  const label = (id) => <><code>{id}</code><span>{nameOfLevel(id)}</span>{place.get(id)?.optional && <small>{tr('可选', 'Optional')}</small>}{place.get(id)?.skippable && <small>{tr('可跳过', 'Skippable')}</small>}</>
  const resetWire = () => { setArmed(null); setHighlight(null); setNotice('') }
  const setField = (path, values) => onEdit(values.length ? { op: 'game.set', path, value: values } : { op: 'game.unset', path })
  const updateLink = (link, value) => {
    const destination = indices.get(place.get(link.to).era)
    const old = eras[destination].links ?? []
    const key = linkKey(link)
    const keyOf = (item) => linkKey({ ...item, from: item.fromGame ? externalPort(item.fromGame, item.from) : item.from })
    const next = old.some((item) => keyOf(item) === key)
      ? old.flatMap((item) => keyOf(item) === key ? value ? [value] : [] : [item])
      : [...old, value]
    setField(['eras', destination, 'links'], next)
  }
  const connect = (from, to) => {
    if (pending || !place.has(to)) return
    const problem = wiringRefusal(requires, from, to)
    if (problem) { setNotice(message(problem)); return }
    const edge = { from, to }
    const split = from.indexOf(':')
    updateLink(edge, split < 0 ? edge : { fromGame: from.slice(0, split), from: from.slice(split + 1), to })
    setArmed(null)
    setNotice('')
    setHighlight(linkKey(edge))
  }
  const chooseWire = (edge) => { resetWire(); setHighlight(linkKey(edge)) }
  const setLevelTag = (tag, checked) => {
    const chapter = indices.get(place.get(selected).era)
    const levelIndex = eras[chapter].levels.findIndex(({ id }) => id === selected)
    const path = ['eras', chapter, 'levels', levelIndex, tag]
    onEdit(checked ? { op: 'game.set', path, value: true } : { op: 'game.unset', path })
  }
  const removeWire = () => {
    if (wire?.source !== 'course' || pending || !confirmDelete(`${wire.from} → ${wire.to}`)) return
    updateLink(wire, null)
    resetWire()
  }
  const outside = [
    ...options.filter(({ value }) => place.has(value)).map(({ value, title, group }) => ({ value, label: value, title, group })),
    ...[...external].map(([value, { title, group }]) => ({ value, label: value, title, group })),
  ].filter(({ value }) => !board.hosted.has(value))
  const reasons = wire?.causes.filter(({ source }) => source !== 'course').map(({ source, detail }) => {
    const label = source === 'knowledge' ? tr('知识前置', 'Knowledge prerequisite') : tr('由参考解推导', 'Inferred from reference')
    return detail ? `${label} · ${detail}` : label
  }) ?? []
  const isExternal = (id) => !place.has(id)
  const pinWire = (edge) => updateLink(edge, { from: edge.fromLevel ?? edge.from, to: edge.to,
    ...(edge.fromGame && { fromGame: edge.fromGame }), ...(edge.required && { required: true }) })

  return (
    <article className="arrange" onKeyDown={(event) => {
      if (event.key === 'Delete' && !event.repeat && wire && !event.target.matches('input, textarea, select, [contenteditable]')) {
        event.preventDefault()
        removeWire()
      }
    }}>
      <header className="arrange-bar">
        <select className="studio-game" value={index} aria-label={tr('章节', 'Chapter')}
          onChange={(e) => { resetWire(); setScope(null); onSelect({ era: Number(e.target.value) }) }}>
          {eras.map((chapter, i) => <option key={chapter.id} value={i}>{nameOf(chapter)}</option>)}
        </select>
        {outside.length > 0 && <Picker options={outside} label={tr('添加外部端口', 'Add external ports')} placeholder={tr('外部端口', 'External ports')}
          onPick={(id) => setScope({ era: era.id, pins: [...(pins ?? []), id] })} />}
        <span className="kit-spacer" />
        <button type="button" className="kit-btn is-label arrange-save" disabled={!save.ready} onClick={save.apply}>
          <Save size={14} aria-hidden="true" />{save.saving ? tr('正在保存', 'Saving') : tr('保存变更', 'Save changes')}
        </button>
      </header>
      {catalogError && <p className="arrange-saved is-error" role="status">{catalogError}</p>}
      <div className="arrange-actions">
        {wire ? <>
          <strong>{describe(wire.from)} → {describe(wire.to)}</strong>
          {reasons.length > 0 && <span>{reasons.join(' / ')}</span>}
          {wire.source === 'course' && reasons.length === 0 && place.get(wire.from)?.skippable && <label>
            <input type="checkbox" checked={wire.required ?? false} disabled={pending} onChange={(e) => {
              updateLink(wire, { from: wire.from, to: wire.to, ...(e.target.checked && { required: true }) })
            }} />
            {tr('须通过这个前置', 'Require a pass on this prerequisite')}
          </label>}
          {wire.source === 'course'
            ? <button type="button" className="kit-btn is-label" disabled={pending} onClick={removeWire}>
              <Trash2 size={13} aria-hidden="true" />{tr('断开连线', 'Disconnect')}
            </button>
            : <button type="button" className="kit-btn is-label" disabled={pending} onClick={() => pinWire(wire)}>
              {tr('保存为显式前置', 'Keep as explicit prerequisite')}
            </button>}
        </> : selected ? <>
          <strong>{describe(selected)}</strong>
          <label>
            <input type="checkbox" checked={place.get(selected).optional} disabled={pending} onChange={(e) => setLevelTag('optional', e.target.checked)} />
            {tr('可选', 'Optional')}
          </label>
          <label>
            <input type="checkbox" checked={place.get(selected).skippable} disabled={pending} onChange={(e) => setLevelTag('skippable', e.target.checked)} />
            {tr('可跳过', 'Skippable')}
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
      {wireChanges && (wireChanges.added.length > 0 || wireChanges.removed.length > 0) && (
        <details className="arrange-saved">
          <summary>{tr(`推导前置新增 ${wireChanges.added.length} 条，移除 ${wireChanges.removed.length} 条`,
            `Inferred prerequisites · ${wireChanges.added.length} added, ${wireChanges.removed.length} removed`)}</summary>
          <ul>
            {wireChanges.added.map((edge) => <li key={`add:${linkKey(edge)}`}>+ {describe(edge.from)} → {describe(edge.to)}</li>)}
            {wireChanges.removed.map((edge) => <li key={`remove:${linkKey(edge)}`}>− {describe(edge.from)} → {describe(edge.to)}</li>)}
          </ul>
        </details>
      )}
      {save.said && <p className={`arrange-saved ${save.said.ok ? '' : 'is-error'}`} role="status">
        {save.said.ok ? tr('已保存到 game.json。', 'Saved to game.json.') : save.said.text}
      </p>}
      <ArrangementBoard key={era.id} board={board} label={label} describe={describe} active={selected} picked={picked} wire={highlight} pending={pending} isExternal={isExternal}
        onLevel={(level) => { resetWire(); if (isExternal(level)) setArmed(level); else onSelect({ level }) }} onWire={chooseWire}
        onPick={(id) => { resetWire(); setArmed(picked === id ? null : id) }} onConnect={connect} onCancel={resetWire} />
    </article>
  )
}
