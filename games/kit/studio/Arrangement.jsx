// Route topology and group membership are edited independently on the pending course.
import { Fragment, useMemo, useRef, useState } from 'react'
import { ArrowRight, ArrowRightLeft, GitBranch, Pencil, Plus } from 'lucide-react'
import { layout, levelLabels } from '../course.js'
import { locate } from '../engine/ops/place.js'
import { L, tr } from '../shell/i18n.js'
import { Chips } from './Picker.jsx'
import { courseTree, stays } from './tree.js'

const chapterName = (era) => L(era.title ?? era.chapter?.title) ?? String(era.id)
const branchName = (i) => tr(`支线 ${i + 1}`, `Side route ${i + 1}`)

export default function Arrangement({ content, at, options, pending, onSelect, onConfigure, onEdit, onMove }) {
  const { eras } = content
  const notes = content.mode === 'notes'
  const tree = useMemo(() => courseTree(eras), [eras])
  const { place, requires, required } = useMemo(() => layout(eras, { notes }), [eras, notes])
  const labels = useMemo(() => levelLabels(eras), [eras])
  const levels = useMemo(() => new Map(options.map((option) => [option.value, option])), [options])
  const selected = at?.level
  const position = selected ? locate(eras, selected) : null
  const panel = useRef(null)
  const [move, setMove] = useState(null)
  const moving = move?.level === selected && move
  const chapter = tree.eras[moving?.era ?? position?.era ?? at?.era] ?? tree.eras[0]
  if (!chapter) return <p className="studio-loading">{tr('没有章节', 'No chapters')}</p>
  const { era, at: index, items, slots, branches } = chapter
  const before = required.get(selected) ?? []
  const after = [...required].filter(([, ids]) => ids.includes(selected)).map(([id]) => id)
  const config = ['eras', index]
  const side = position?.kind === 'branch' ? eras[position.era].branches[position.branch] : null
  const isOptional = place.get(selected)?.optional
  const selectLevel = (level) => {
    setMove(null)
    onSelect({ level })
    panel.current?.scrollIntoView({ block: 'start', inline: 'nearest' })
  }
  const selectChapter = (e) => {
    const next = Number(e.target.value)
    if (moving) setMove({ ...moving, era: next })
    else onSelect({ era: next })
  }
  const slot = (to, label) => {
    if (!moving || stays(tree, selected, to)) return null
    return (
      <button type="button" className="arrange-slot" disabled={pending} aria-label={`${tr('移到', 'Move to')} ${label}`}
        onClick={() => { onMove(selected, to); setMove(null) }}>
        <Plus size={13} aria-hidden="true" />
      </button>
    )
  }
  const node = (id) => (
    <button type="button" className="arrange-node" aria-current={id === selected ? 'true' : undefined} onClick={() => selectLevel(id)} title={id}>
      <code>{labels.get(id) ?? id}</code><span>{L(levels.get(id)?.title)}</span>
      {place.get(id)?.optional && <small>{tr('可选', 'Optional')}</small>}
    </button>
  )
  const chain = (entries, targets, label, render) => (
    <div className="arrange-chain">
      {slot(targets[0], `${label} · ${tr('开头', 'Start')}`)}
      {entries.map((item, i) => {
        const ids = typeof item === 'string' ? [item] : item.level ? [item.level] : item.parallel.flatMap((lane) => lane.levels)
        return (
          <Fragment key={ids[0]}>
            <div className="arrange-step">
              {i > 0 && !notes && !moving && <ArrowRight className="arrange-arrow" size={13} aria-hidden="true" />}
              {render(item, i)}
            </div>
            {slot(targets[i + 1], `${label} · ${tr('之后', 'After')} ${ids.join(' / ')}`)}
          </Fragment>
        )
      })}
    </div>
  )
  const configure = (path, label) => (
    <button type="button" className="kit-btn" title={label} aria-label={label} onClick={() => { setMove(null); onConfigure(index, path) }}>
      <Pencil size={13} aria-hidden="true" />
    </button>
  )
  const setList = (path, values) => onEdit(values.length ? { op: 'game.set', path, value: values } : { op: 'game.unset', path })
  const main = tr('主路线', 'Main route')
  const hang = side?.after
  return (
    <article className="arrange" ref={panel}>
      <header className="arrange-bar">
        <select className="studio-game" value={index} onChange={selectChapter} aria-label={tr('章节', 'Chapter')}>
          {eras.map((value, i) => <option key={value.id} value={i}>{chapterName(value)}</option>)}
        </select>
        {configure(config, tr('配置章节', 'Configure chapter'))}
        {moving && <>
          <span role="status">{tr(`选择 ${selected} 的新位置`, `Choose a new position for ${selected}`)}</span>
          <button type="button" className="kit-btn is-label" onClick={() => setMove(null)}>{tr('取消', 'Cancel')}</button>
        </>}
      </header>
      {notes && <p className="arrange-note">{tr('笔记模式下，所有关卡直接开放。', 'In notes mode, every level opens immediately.')}</p>}
      {position && !moving && (
        <section className="arrange-focus" aria-label={tr('关卡依赖', 'Level dependencies')}>
          <div className="arrange-focus-head">
            <h2><code>{labels.get(selected) ?? selected}</code> {L(levels.get(selected)?.title)}</h2>
            <label>
              <input type="checkbox" checked={isOptional} disabled={pending}
                onChange={(e) => setList([...config, 'optional'], e.target.checked ? [...(era.optional ?? []), selected] : era.optional.filter((id) => id !== selected))} />
              {tr('可选', 'Optional')}
            </label>
            <button type="button" className="kit-btn is-label" disabled={pending} onClick={() => setMove({ level: selected, era: index })}>
              <ArrowRightLeft size={13} aria-hidden="true" />{tr('移动关卡', 'Move level')}
            </button>
          </div>
          {!notes && <div className="arrange-links">
            <div><h3>{tr('直接前置', 'Direct prerequisites')}</h3>{before.length ? before.map((id) => <Fragment key={id}>{node(id)}</Fragment>) : '—'}</div>
            <div><h3>{tr('直接后续', 'Direct successors')}</h3>{after.length ? after.map((id) => <Fragment key={id}>{node(id)}</Fragment>) : '—'}</div>
          </div>}
          {!notes && side && (
            <fieldset className="arrange-config" disabled={pending}>
              <legend>{tr('支线前置关卡', 'Side route prerequisites')}</legend>
              <div>
                <Chips label={tr('支线前置关卡', 'Side route prerequisites')} options={options.filter(({ value }) => requires.has(value) && !side.levels.includes(value))}
                  values={hang ?? []} onSet={(values) => setList([...config, 'branches', position.branch, 'after'], values)} />
                {hang === undefined && <small>{tr('默认接在本章主路线末尾', 'Defaults to the end of this chapter’s main route')}</small>}
              </div>
            </fieldset>
          )}
        </section>
      )}
      <section className="arrange-section">
        <header><h2>{main}</h2>{configure([...config, 'path'], tr('配置主路线', 'Configure main route'))}</header>
        {chain(items, slots, main, (item) => item.level ? node(item.level) : (
          <div className="arrange-parallel" aria-label={tr('并行路线', 'Parallel routes')}>
            <GitBranch size={14} aria-hidden="true" />
            <div>{item.parallel.map(({ levels: ids, slots: laneSlots }, i) => (
              <div className="arrange-branch" key={ids[0]}>
                {chain(ids, laneSlots, tr(`并行路线 ${i + 1}`, `Parallel lane ${i + 1}`), node)}
              </div>
            ))}</div>
          </div>
        ))}
      </section>
      <section className="arrange-section">
        <header><h2>{tr('支线', 'Side routes')}</h2>{configure([...config, 'branches'], tr('配置支线', 'Configure side routes'))}</header>
        {branches.map(({ levels: ids, slots: branchSlots }, i) => (
          <div className="arrange-branch" key={ids[0]}>
            {chain(ids, branchSlots, branchName(i), node)}
          </div>
        ))}
        {slot({ era: era.id, on: 'branch', ...(hang !== undefined && { hang }) }, tr('新支线', 'New side route'))}
      </section>
      {!moving && <section className="arrange-section">
        <header><h2>{tr('分组', 'Groups')}</h2>{configure([...config, 'groups'], tr('配置分组', 'Configure groups'))}</header>
        {(era.groups ?? []).map((group, i) => (
          <div className="arrange-branch" key={i}>
            <button type="button" className="arrange-branch-name" onClick={() => onConfigure(index, [...config, 'groups', i])}>
              {group.code && <code>{group.code} · </code>}{L(group.title)}
            </button>
            <div className="arrange-chain">{group.levels.map((id) => <Fragment key={id}>{node(id)}</Fragment>)}</div>
          </div>
        ))}
      </section>}
    </article>
  )
}
