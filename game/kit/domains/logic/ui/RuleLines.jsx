import { useState } from 'react'
import { X } from 'lucide-react'
import { L, tr } from '../../../shell/i18n.js'
import { Chips, Strip, StripTools, useStrip } from '../../../strip/index.js'
import { useHistory } from '../../../circuit/useHistory.js'
import { say } from '../notation.js'
import { declaredRules, sentenceOf, wayText } from '../iso.js'
import { blankLine, problemsOf } from '../ruleLines.js'

// A declaration's intro rules as lines on the shared strip (../ruleLines.js), one line a rule, numbered; or read only,
// for someone's declaration. Written, a rule's brackets end with a place for one more premise (drawn lighter: it may
// stay empty), a premise with premises of its own has a place for its conclusion, and the blocks are the level's
// sentences, a premise with premises (tray 'under') and taking any thing (tray 'thing'). A block goes where it is put,
// or, none picked, on in reading order from the last one put (nextSlot). Under the lines, the elimination rule made
// from them.
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
    target: (chip) => (chip === BIND ? `L:${lastList.split('.')[0]}` : chip === NEST ? nextSlot().replace(/^C:/, 'L:') : nextSlot()),
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
      const items = listAt(lines, path)
      onChange(withList(lines, path, (list) => [...list, chip === NEST ? { need: null, under: [] } : chip.slice(2)]))
      setLast(chip === NEST ? keyOf([...path, items.length]) : keyOf(path))
      return null
    },
  })
  const next = editable ? nextSlot() : null

  // A line as it reads: [⋀x.] ⟦ premises; … ⟧ ⟹ the declared sentence (read only, a rule that needs nothing is its
  // conclusion alone).
  const list = (items, path) => {
    const parts = items.flatMap((item, k) => [...(k ? ['; '] : []), piece(item, [...path, k])])
    return editable ? [...parts, ...(items.length ? [' '] : []), { hole: `L:${keyOf(path)}`, label: T('＋', '+'), soft: true }] : parts
  }
  const piece = (item, path) => {
    const key = keyOf(path)
    if (typeof item === 'string') return { piece: `I:${key}`, family: 'pred', bad: strays.has(key), fixed: !editable, parts: [words(item)] }
    const end = item.need ? { piece: `N:${key}`, family: 'pred', fixed: !editable, parts: [words(item.need)] } : { hole: `C:${key}`, label: T('结论', 'conclusion') }
    return { piece: `I:${key}`, family: 'conn', bad: strays.has(key), fixed: !editable, parts: ['⟦', ...list(item.under, path), '⟧ ⟹ ', end] }
  }
  const lineOf = (line, k) => [
    ...(line.binds.length ? [{ piece: `B:${k}`, family: 'quant', fixed: !editable, parts: [`⋀${line.binds.join(' ')}. `] }] : []),
    ...(editable || line.needs.length ? ['⟦', ...list(line.needs, [k]), '⟧ ⟹ '] : []),
    { piece: `F:${k}`, family: 'name', fixed: true, parts: [conclusion] },
  ]
  // The elimination rule made from them, once they are a declaration.
  const elim = !problems.length && lines.length ? wayText(declaredRules(level, lines, (f) => f).take, (f) => L(say(f, level.notation))) : null

  const chips = [
    { key: 'sentences', label: T('句子', 'Sentences'), chips: (tray.includes('hyp') ? level.sentences : []).map((s) => ({ key: `s:${s}`, family: 'pred', text: words(s) })) },
    { key: 'shapes', label: T('结构', 'Structure'), chips: [
      ...(tray.includes('under') ? [{ key: NEST, family: 'conn', text: '⟦ □ ⟧ ⟹ □', sub: T('带前提的前提', 'A premise with premises') }] : []),
      ...(tray.includes('thing') ? [{ key: BIND, family: 'quant', text: `⋀${binder}.`, sub: T('任取一样东西', 'Any thing') }] : []),
    ] },
  ].filter((g) => g.chips.length)

  return (
    <div className="lg-rules-lines">
      {editable && <StripTools history={history} onClear={() => { onChange([blankLine()]); setLast('0') }} empty={lines.length === 1 && !lines[0].needs.length && !lines[0].binds.length} />}
      {lines.map((line, k) => (
        <div key={k} className="lg-rule-line">
          <span className="lg-rule-no">{k + 1}</span>
          <Strip line={lineOf(line, k)} label={T(`引入规则 ${k + 1}`, `Intro rule ${k + 1}`)} next={next} selected={strip.selected} flash={strip.flash} onSlot={editable ? strip.onSlot : () => {}} />
          {editable && lines.length > 1 && (
            <button type="button" className="lg-rule-drop" onClick={() => onChange(lines.filter((_, j) => j !== k))} aria-label={tr(`删除引入规则 ${k + 1}`, `Delete intro rule ${k + 1}`)}><X size={14} /></button>
          )}
        </div>
      ))}
      {!lines.length && <p className="lg-mark">{tr('没有引入规则。', 'No intro rule.')}</p>}
      {editable && <button type="button" className="lg-rule-add" onClick={() => { onChange([...lines, blankLine()]); setLast(String(lines.length)) }}>{tr('添加引入规则', 'Add an intro rule')}</button>}
      {elim && <p className="lg-rule-elim"><span>{tr('消去规则', 'Elim rule')}</span><code>{elim}</code></p>}
      {editable && strip.note && <p className={`ks-note ${strip.note.bad ? 'is-bad' : ''}`} role="status">{L(strip.note.text)}</p>}
      {editable && <Chips groups={chips} onChip={strip.onChip} />}
    </div>
  )
}
