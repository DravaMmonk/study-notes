import { useState } from 'react'
import { X } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import { Chips, StripTools, useStrip } from '../../../strip/index.js'
import { useHistory } from '../../../circuit/useHistory.js'
import { say } from '../notation.js'
import { declaredRules, sentenceOf, wayRule } from '../iso.js'
import { ruleText } from '../schematic.js'
import { blankLine, problemsOf } from '../ruleLines.js'

// A declaration's intro rules (../ruleLines.js), each a numbered card that says the rule in words: for any thing x,
// once these are proved, the declared sentence may be concluded; a premise with premises of its own reads "assuming
// these, we can show that". Under the words, the rule as the book writes it, ⋀x. ⟦A; B⟧ ⟹ C, small. Written, the
// blocks are the level's sentences, a premise with premises (tray 'under', only right in a rule's own premises) and
// taking any thing (tray 'thing'); a block goes where it is put, or, none picked, on in reading order from the last one
// put (nextSlot), a lighter ＋ showing where; tapping a card or a premise box picks it. Read only, for someone's
// declaration. Under the cards, the elimination rule made from them, said the same way.
//
//   level  the declaration level      lines  [line]      onChange(lines) | null (read only)      scope  the history's

const T = (zh, en) => ({ zh, en })
const NEST = 'nest'
const BIND = 'bind'

// A path down the lines: [line, index …], the indices of items down to a list or an item.
const pathOf = (key) => key.slice(2).split('.').map(Number)
const keyOf = (path) => path.join('.')
function listAt(lines, path) {
  let items = lines[path[0]]?.needs
  for (const k of path.slice(1)) items = items?.[k]?.under
  return items
}
function withList(lines, path, f) {
  const [line, ...rest] = path
  const inside = (items, at) => (at.length ? items.map((item, k) => (k === at[0] ? { ...item, under: inside(item.under, at.slice(1)) } : item)) : f(items))
  return lines.map((l, k) => (k === line ? { ...l, needs: inside(l.needs, rest) } : l))
}
const withItem = (lines, path, f) => withList(lines, path.slice(0, -1), (items) => items.map((item, k) => (k === path[path.length - 1] ? f(item) : item)))
const without = (lines, path) => withList(lines, path.slice(0, -1), (items) => items.filter((_, k) => k !== path[path.length - 1]))

export default function RuleLines({ level, lines, onChange = null, scope = null }) {
  const editable = Boolean(onChange)
  const binder = level.binder ?? 'x'
  const tray = level.tray ?? ['hyp']
  const words = (s) => L(say(sentenceOf(level, s), level.notation))
  const conclusion = words(level.target)
  const problems = problemsOf(level, lines)
  const strays = new Set(problems.filter((p) => p.why === 'stray').map((p) => keyOf([p.line, ...p.path])))
  // The brackets a block goes into when none is picked: the last ones put into, while they are still there.
  const [last, setLast] = useState('0')
  const lastList = listAt(lines, pathOf(`L:${last}`)) ? last : String(Math.max(0, lines.length - 1))
  // Where the next sentence goes, in reading order: inside a premise with premises of its own, first its brackets
  // (while empty), then its conclusion; once that is filled, the brackets around it again.
  const itemAt = (path) => listAt(lines, path.slice(0, -1))?.[path[path.length - 1]]
  const nextSlot = () => {
    let path = pathOf(`L:${lastList}`)
    while (path.length > 1) {
      const item = itemAt(path)
      if (!item.need) return item.under.length ? `C:${keyOf(path)}` : `L:${keyOf(path)}`
      path = path.slice(0, -1)
    }
    return `L:${keyOf(path)}`
  }
  const history = useHistory(lines, onChange ?? (() => {}), scope, 0)
  const strip = useStrip({
    target: (chip) => (chip === BIND || chip === NEST ? `L:${lastList.split('.')[0]}` : nextSlot()),
    filled: (slot) => /^[INBF]:/.test(slot),
    fixed: (slot) => slot.startsWith('F:'),
    take: (slot) => {
      const path = pathOf(slot)
      if (slot.startsWith('I:')) {
        onChange(without(lines, path))
        setLast(keyOf(path.slice(0, -1)))
      } else if (slot.startsWith('N:')) onChange(withItem(lines, path, (item) => ({ ...item, need: null })))
      else if (slot.startsWith('B:')) onChange(lines.map((l, k) => (k === path[0] ? { ...l, binds: [] } : l)))
    },
    put: (slot, chip) => {
      const path = pathOf(slot)
      if (chip === BIND) {
        if (lines[path[0]].binds.length) return T(`这条规则已经任取了 ${binder}。`, `This rule already takes ${binder}.`)
        onChange(lines.map((l, k) => (k === path[0] ? { ...l, binds: [binder] } : l)))
        return null
      }
      if (slot.startsWith('C:')) {
        if (chip === NEST) return T('结论只能放一句话。', 'Only a sentence goes in a conclusion.')
        onChange(withItem(lines, path, (item) => ({ ...item, need: chip.slice(2) })))
        setLast(keyOf(path))
        return null
      }
      if (chip === NEST && path.length > 1) return T('「假设…时，能证出…」只能直接放进规则的前提里。', 'An “assuming …, we can show …” goes straight into a rule’s premises.')
      const items = listAt(lines, path)
      onChange(withList(lines, path, (list) => [...list, chip === NEST ? { need: null, under: [] } : chip.slice(2)]))
      setLast(chip === NEST ? keyOf([...path, items.length]) : keyOf(path))
      return null
    },
  })
  const next = editable ? nextSlot() : null

  // A rule as a card: its premises (a sentence, or { binds, premises, concl } said "assuming …, we can show …"), its
  // conclusion, and the keys of the strip's slots (useStrip) for a tap to take a block out or pick a place.
  const nodeOf = (item, path) => {
    const key = keyOf(path)
    if (typeof item === 'string') return { text: words(item), key: `I:${key}`, bad: strays.has(key) }
    return {
      key: `I:${key}`,
      bad: strays.has(key),
      premises: item.under.map((u, k) => nodeOf(u, [...path, k])),
      list: `L:${key}`,
      concl: item.need ? { text: words(item.need), key: `N:${key}` } : { hole: `C:${key}` },
    }
  }
  const book = (f) => L(say(f, level.notation))
  const formal = (line, k) => (problems.some((p) => p.line === k) ? null
    : `${line.binds.length ? `⋀${line.binds.join(' ')}. ` : ''}${ruleText(wayRule(line, level), book)}`)
  const ruleOf = (line, k) => ({
    binds: line.binds,
    bindKey: `B:${k}`,
    premises: line.needs.map((item, j) => nodeOf(item, [k, j])),
    list: `L:${k}`,
    concl: { text: conclusion },
    formal: formal(line, k),
  })
  // The elimination rule made from them, once they are a declaration, said the same way.
  const take = !problems.length && lines.length ? declaredRules(level, lines, (f) => f).take : null
  const text = (f) => L(say(f, level.notation))
  // A premise of a rule (schematic.js): a sentence, or one under premises (and things) of its own.
  const premiseNode = (p) => (!p.show ? { text: text(p) }
    : p.hyps.length || p.fixes.length ? { binds: p.fixes, premises: p.hyps.map(premiseNode), concl: { text: text(p.show) } }
    : { text: text(p.show) })
  const elim = take && { premises: take.premises.map(premiseNode), concl: { text: text(take.conclusion) }, formal: ruleText(take, book) }
  const view = { editable, next, selected: strip.selected, flash: strip.flash, onSlot: strip.onSlot }

  const chips = [
    { key: 'sentences', label: T('句子', 'Sentences'), chips: (tray.includes('hyp') ? level.sentences : []).map((s) => ({ key: `s:${s}`, family: 'pred', text: words(s) })) },
    { key: 'shapes', label: T('结构', 'Structure'), chips: [
      ...(tray.includes('under') ? [{ key: NEST, family: 'conn', text: '⟦ □ ⟧ ⟹ □', sub: T('假设…时，能证出…', 'Assuming …, we can show …') }] : []),
      ...(tray.includes('thing') ? [{ key: BIND, family: 'quant', text: `⋀${binder}.`, sub: T('任取一样东西', 'Any thing') }] : []),
    ] },
  ].filter((g) => g.chips.length)

  return (
    <div className="lg-rules-lines">
      {editable && <StripTools history={history} onClear={() => { onChange([blankLine()]); setLast('0') }} empty={lines.length === 1 && !lines[0].needs.length && !lines[0].binds.length} />}
      {lines.map((line, k) => (
        <div key={k} className="lg-rule-line">
          <span className="lg-rule-no">{k + 1}</span>
          <RuleCard node={ruleOf(line, k)} view={view} />
          {editable && lines.length > 1 && (
            <button type="button" className="lg-rule-drop" onClick={() => onChange(lines.filter((_, j) => j !== k))} aria-label={tr(`删除引入规则 ${k + 1}`, `Delete intro rule ${k + 1}`)}><X size={14} /></button>
          )}
        </div>
      ))}
      {!lines.length && <p className="lg-mark">{tr('没有引入规则。', 'No intro rule.')}</p>}
      {editable && <button type="button" className="lg-rule-add" onClick={() => { onChange([...lines, blankLine()]); setLast(String(lines.length)) }}>{tr('添加引入规则', 'Add an intro rule')}</button>}
      {elim && (
        <div className="lg-rule-line is-elim">
          <span className="lg-rule-no">{tr('消去', 'Elim')}</span>
          <RuleCard node={elim} view={{ editable: false }} />
        </div>
      )}
      {editable && strip.note && <p className={`ks-note ${strip.note.bad ? 'is-bad' : ''}`} role="status">{L(strip.note.text)}</p>}
      {editable && <Chips groups={chips} onChip={strip.onChip} />}
    </div>
  )
}

// A rule card: "for any thing x, once we have: … we may conclude: …", then the rule as the book writes it. A node is
// { premises, concl: { text, key? }, binds?, bindKey?, list?, formal? }; a premise is a sentence { text, key?, bad? } or
// one with premises of its own, { premises, concl: { text, key? } | { hole }, binds?, list?, key?, bad? }.
function RuleCard({ node, view }) {
  const { editable } = view
  const state = slotState(view)
  const pick = pickOf(view, node.list)
  return (
    <div className={`lg-rule-body lg-card ${editable && node.list ? 'is-pickable' : ''} ${isTarget(view, node.list) ? 'is-target' : ''}`} onClick={pick}>
      {node.binds?.length > 0 && (
        <p className="lg-card-say">{tr('对任意一样东西', 'For any thing')} <Tok text={node.binds.join(' ')} family="quant" slot={node.bindKey} view={view} state={state} />{tr('，', ',')}</p>
      )}
      {(node.premises.length > 0 || isTarget(view, node.list)) ? (
        <>
          <p className="lg-card-say">{tr('只要已经证出：', 'once we have:')}</p>
          <ul className="lg-card-items">
            {node.premises.map((p, k) => <li key={k}><Premise node={p} view={view} /></li>)}
            {editable && isTarget(view, node.list) && <li><Plus list={node.list} view={view} state={state} /></li>}
          </ul>
          <p className="lg-card-say">{tr('就可以得出：', 'we may conclude:')}</p>
        </>
      ) : <p className="lg-card-say">{tr('什么都不需要，直接可以得出：', 'with nothing needed, we may conclude:')}</p>}
      <p className="lg-card-concl"><Tok text={node.concl.text} family="name" slot={node.concl.key} view={view} state={state} /></p>
      {node.formal && <code className="lg-card-formal">{node.formal}</code>}
    </div>
  )
}

// A premise on a card: a sentence, or "assuming …, we can show …" in a box of its own (tapped, it is picked: the next
// sentence goes among its assumptions).
function Premise({ node, view }) {
  const { editable } = view
  const state = slotState(view)
  const pick = pickOf(view, node.list)
  if (!node.premises) return <Tok text={node.text} family="pred" slot={node.key} view={view} state={state} bad={node.bad} />
  const glue = tr('、', ', ')
  // One holding a premise with premises of its own is a block, its assumptions one a line, so nesting reads as indents.
  const block = node.premises.some((p) => p.premises)
  return (
    <span className={`lg-card-nest ${block ? 'is-block' : ''} ${node.bad ? 'is-bad' : ''} ${editable && node.list ? 'is-pickable' : ''} ${isTarget(view, node.list) ? 'is-target' : ''} ${state(node.key)}`} onClick={pick}>
      {node.binds?.length > 0 && <>{tr('对任意一样东西', 'for any thing')} <Tok text={node.binds.join(' ')} family="quant" view={view} state={state} />{tr('，', ', ')}</>}
      {(node.premises.length > 0 || isTarget(view, node.list)) && (
        <>
          {tr('假设', 'assuming')}{block ? tr('：', ':') : ' '}
          {block
            ? <ul className="lg-card-items">{node.premises.map((p, k) => <li key={k}><Premise node={p} view={view} /></li>)}</ul>
            : node.premises.map((p, k) => <span key={k}>{k > 0 && glue}<Premise node={p} view={view} /></span>)}
          {editable && isTarget(view, node.list) && <>{node.premises.length > 0 && glue}<Plus list={node.list} view={view} state={state} /></>}
          {block ? tr('时，', 'then ') : tr(' 时，', ', ')}
        </>
      )}
      {tr('能证出', 'we can show')}{' '}
      {node.concl.hole
        ? <button type="button" className={`lg-slot ${state(node.concl.hole)}`} onClick={() => view.onSlot(node.concl.hole)}>{tr('结论', 'conclusion')}</button>
        : <Tok text={node.concl.text} family="pred" slot={node.concl.key} view={view} state={state} />}
      {editable && node.key && <button type="button" className="lg-card-drop" onClick={() => view.onSlot(node.key)} aria-label={tr('拿掉这个前提', 'Take this premise out')}><X size={12} /></button>}
    </span>
  )
}

// A block on a card: tapped while written, it comes out (as on the strip).
function Tok({ text, family, slot, view, state, bad = false }) {
  return <button type="button" className={`lg-tok ${bad ? 'is-bad' : ''} ${state(slot)}`} data-family={family} disabled={!view.editable || !slot} onClick={() => view.onSlot(slot)}>{text}</button>
}
const Plus = ({ list, view, state }) => <button type="button" className={`lg-slot is-soft ${state(list)}`} onClick={() => view.onSlot(list)} aria-label={tr('在这里再放一个', 'Put one more here')}>＋</button>
const isTarget = (view, list) => Boolean(list) && (view.next === list || view.selected === list)
const slotState = (view) => (key) => (!key ? '' : `${view.next === key ? 'is-next' : ''} ${view.selected === key ? 'is-selected' : ''} ${view.flash?.includes(key) ? 'is-refused' : ''}`)
// Tapping a card or a premise box where there is no block picks its list.
const pickOf = (view, list) => (event) => {
  if (!view.editable || !list || event.target.closest('button')) return
  event.stopPropagation()
  if (view.selected !== list) view.onSlot(list)
}
