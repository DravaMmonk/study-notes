// The course editor uses the same placements as the tree and the same dependency graph as the game.
import { Fragment, useMemo, useRef, useState } from 'react'
import { ArrowRight, ArrowRightLeft, GitBranch, Pencil, Plus } from 'lucide-react'
import { layout } from '../course.js'
import { locate } from '../engine/ops/place.js'
import { L, tr } from '../shell/i18n.js'
import { Chips } from './Picker.jsx'
import { courseTree, stays } from './tree.js'

const chapterName = (era) => L(era.title ?? era.chapter?.title) ?? String(era.id)
const pathName = (path) => path === 'foundation' ? tr('地基', 'Foundation') : tr('练习', 'Practice')
const topicName = (topic) => L(topic.title) ?? topic.id

export default function Arrangement({ content, vocabulary, at, options, pending, onSelect, onConfigure, onEdit, onMove }) {
  const eras = content.eras
  const notes = content.mode === 'notes'
  const tree = useMemo(() => courseTree(eras), [eras])
  const { requires } = useMemo(() => layout(eras, { notes }), [eras, notes])
  const levels = useMemo(() => new Map(options.map((option) => [option.value, option])), [options])
  const optional = useMemo(() => new Set(content.levels.filter((level) => level.optional).map((level) => level.id)), [content.levels])
  const selected = at?.level
  const position = selected ? locate(eras, selected) : null
  const panel = useRef(null)
  const [move, setMove] = useState(null)
  const moving = move?.level === selected && move
  const chapter = tree.eras[moving?.era ?? position?.era ?? at?.era] ?? tree.eras[0]
  if (!chapter) return <p className="studio-loading">{tr('没有章节', 'No chapters')}</p>
  const { era, at: index, paths, topics, challenges, challengeSlot } = chapter
  const before = [...new Set(requires.get(selected) ?? [])]
  const after = [...requires].filter(([, ids]) => ids.includes(selected)).map(([id]) => id)
  const config = ['eras', index]
  const eraFields = vocabulary.game.fields.eras.of.fields
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
  const place = (to, label) => {
    if (!moving || to.before === selected || stays(tree, selected, to)) return null
    return (
      <button type="button" className="arrange-slot" disabled={pending} aria-label={`${tr('移到', 'Move to')} ${label}`}
        onClick={() => { onMove(selected, to); setMove(null) }}>
        <Plus size={13} aria-hidden="true" />
      </button>
    )
  }
  const node = (id) => (
    <button type="button" className="arrange-node" aria-current={id === selected ? 'true' : undefined} onClick={() => selectLevel(id)}>
      <code>{id}</code><span>{L(levels.get(id)?.title)}</span>
      {optional.has(id) && <small>{tr('可选', 'Optional')}</small>}
    </button>
  )
  const chain = (items, slots, label, render) => (
    <div className="arrange-chain">
      {slots && place(slots[0], `${label} · ${tr('开头', 'Start')}`)}
      {items.map((item, i) => {
        const ids = typeof item === 'string' ? [item] : item.level ? [item.level] : item.parallel.flatMap((branch) => branch.levels)
        return (
          <Fragment key={i}>
            <div className="arrange-step">
              {i > 0 && !notes && !moving && <ArrowRight className="arrange-arrow" size={13} aria-hidden="true" />}
              {render(item, i)}
            </div>
            {slots && place(slots[i + 1], `${label} · ${tr('之后', 'After')} ${ids.join(' / ')}`)}
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
  const editConfig = (path, values, scalar = false) => {
    const value = scalar && values.length === 1 ? values[0] : values
    onEdit(values.length ? { op: 'game.set', path, value } : { op: 'game.unset', path })
  }
  const source = eras[position?.era]
  const topic = position?.kind === 'topic' ? source.topics[position.topic] : null
  const challenge = position?.kind === 'challenge' ? source.challenges[position.k] : null
  const sideRoute = topic ?? challenge
  const routePath = topic ? [...config, 'topics', position.topic] : [...config, 'challenges', position?.k]
  const topicSchema = eraFields.topics?.of.fields
  const candidates = sideRoute ? options.filter((option) => requires.has(option.value) && !(topic?.levels ?? [selected]).includes(option.value)) : []
  const topicOptions = topic ? source.topics.filter((t) => t.id !== topic.id).map((t) => ({ value: t.id, label: t.id, title: t.title })) : []
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
            <h2><code>{selected}</code> {L(levels.get(selected)?.title)}</h2>
            <button type="button" className="kit-btn is-label" disabled={pending} onClick={() => setMove({ level: selected, era: index })}>
              <ArrowRightLeft size={13} aria-hidden="true" />{tr('移动关卡', 'Move level')}
            </button>
          </div>
          {!notes && <div className="arrange-links">
            <div><h3>{tr('直接前置', 'Direct prerequisites')}</h3>{before.length ? before.map((id) => <Fragment key={id}>{node(id)}</Fragment>) : '—'}</div>
            <div><h3>{tr('直接后续', 'Direct successors')}</h3>{after.length ? after.map((id) => <Fragment key={id}>{node(id)}</Fragment>) : '—'}</div>
          </div>}
          {!notes && sideRoute && (
            <fieldset className="arrange-config" disabled={pending}>
              <legend>{topic ? topicName(topic) : tr('挑战', 'Challenge')}</legend>
              <div>
                <h3>{tr('挂接关卡', 'Attach after')}</h3>
                <Chips label={tr('挂接关卡', 'Attach after')} options={candidates} values={[sideRoute.after ?? []].flat()} onSet={(values) => editConfig([...routePath, 'after'], values, true)} />
                {sideRoute.after === undefined && <small>{tr('默认挂在本章主线末尾', 'Defaults to the end of this chapter’s main path')}</small>}
              </div>
              {topic && topicSchema?.requires && <div>
                <h3>{tr('前置专题', 'Required topics')}</h3>
                <Chips label={tr('前置专题', 'Required topics')} options={topicOptions} values={topic.requires ?? []} onSet={(values) => editConfig([...routePath, 'requires'], values)} />
              </div>}
            </fieldset>
          )}
        </section>
      )}
      {paths.map(({ path, items, slots }) => (
        <section className="arrange-section" key={path}>
          <header><h2>{pathName(path)}</h2>{configure([...config, path], tr(`配置${pathName(path)}`, `Configure ${pathName(path)}`))}</header>
          {chain(items, slots, pathName(path), (item, i) => item.level ? node(item.level) : (
            <div className="arrange-parallel" aria-label={tr('并行分支', 'Parallel branches')}>
              <GitBranch size={14} aria-hidden="true" />
              <div>{item.parallel.map(({ branch, levels: ids, slots: branchSlots }, j) => (
                <div className="arrange-branch" key={branch.id}>
                  <button type="button" className="arrange-branch-name" onClick={() => { setMove(null); onConfigure(index, [...config, path, i, 'parallel', j]) }}>
                    {L(branch.title) ?? branch.id}
                  </button>
                  {chain(ids, branchSlots, L(branch.title) ?? branch.id, node)}
                </div>
              ))}</div>
            </div>
          ))}
        </section>
      ))}
      {eraFields.practice && !era.practice && (
        <section className="arrange-section">
          <header><h2>{pathName('practice')}</h2>{configure([...config, 'practice'], tr('配置练习', 'Configure practice'))}</header>
          {place({ era: era.id, path: 'practice', at: 0 }, pathName('practice'))}
        </section>
      )}
      {eraFields.topics && (
        <section className="arrange-section">
          <header><h2>{tr('专题', 'Topics')}</h2>{configure([...config, 'topics'], tr('配置专题', 'Configure topics'))}</header>
          {topics.map(({ topic, levels: ids, slots }, i) => (
            <div className="arrange-branch" key={topic.id}>
              <button type="button" className="arrange-branch-name" onClick={() => { setMove(null); onConfigure(index, [...config, 'topics', i]) }}>{topicName(topic)}</button>
              {chain(ids, slots, topicName(topic), node)}
            </div>
          ))}
        </section>
      )}
      {eraFields.challenges && (
        <section className="arrange-section">
          <header><h2>{tr('挑战', 'Challenges')}</h2>{configure([...config, 'challenges'], tr('配置挑战', 'Configure challenges'))}</header>
          <div className="arrange-chain">
            {challenges.map((id) => (
              <Fragment key={id}>
                {place({ before: id, ...(challenge?.after !== undefined && { hang: challenge.after }) }, `${tr('之前', 'Before')} ${id}`)}
                {node(id)}
              </Fragment>
            ))}
            {place({ ...challengeSlot, ...(challenge?.after !== undefined && { hang: challenge.after }) }, tr('挑战末尾', 'End of challenges'))}
          </div>
        </section>
      )}
    </article>
  )
}
