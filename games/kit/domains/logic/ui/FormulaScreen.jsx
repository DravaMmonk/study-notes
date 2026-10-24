import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Brief, PhonePage, RunDock, Workbench } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { Chips, Strip, useStrip } from '../../../strip/index.js'
import { freeVars, parse } from '../formula.js'
import { say } from '../notation.js'
import { difference, extent, structureOf } from '../fol.js'
import { chipsOf, complete, holesOf, kindAt, kidsOf, nodeAt, setAt } from '../formulaTree.js'
import { WorldText, thingName } from './WorldScreens.jsx'

// Translate and query tasks (《证明完毕》 chapter 4): one sentence said in words, built as a formula from chips on the
// shared strip (games/kit/strip, as 《句法之图》 builds a clause), and read back in words once it is whole. A
// translation passes when it means the same as the sentence in every small world, and shows a world where it does
// not otherwise; a query (x left free) passes when it picks out the right things in each of the level's worlds.
//
//   level  { kind: 'translate' | 'query', say: { zh, en }, target: formula text, decoys?: [formula text] }

const T = (zh, en) => ({ zh, en })
const PLACES = ['①', '②', '③']
const GROUPS = [['pred', T('谓词', 'Predicates')], ['name', T('名字', 'Names')], ['var', T('变量', 'Variables')], ['quant', T('量词', 'Quantifiers')], ['conn', T('连接词', 'Connectives')]]
const JOINS = { '∧': T('并且', 'and'), '∨': T('或者', 'or'), '→': T('若…则…', 'if … then …') }
const keyOf = (path) => ['r', ...path].join('.')
const pathOf = (key) => key.split('.').slice(1).map(Number)

/** A predicate's words with its places numbered: ①是②的父母. */
const placesOf = (notation, pred) => (notation.words?.[pred] ? L(notation.words[pred]).replace(/\{(\d)\}/g, (_, k) => PLACES[Number(k)]) : pred)

/** The formula as the strip's tree of slots: each piece a group of its own slot and its children's. */
function stripOf(node, path, kind, notation) {
  const key = keyOf(path)
  if (!node) return { key, label: kind === 'term' ? T('一样东西', 'a thing') : T('一句话', 'a sentence') }
  if (node.t) return { key, label: node.t === 'var' ? T('变量', 'variable') : T('名字', 'name'), value: { text: node.t === 'var' ? node.name : L(notation.words?.[node.f] ?? T(node.f, node.f)), family: node.t === 'var' ? 'var' : 'name' } }
  const kids = kidsOf(node).map((kid, k) => stripOf(kid.value, [...path, k], kid.kind, notation))
  const head = (text, label, family) => ({ key, label, value: { text, family } })
  switch (node.op) {
    case 'atom': return { key: `${key}g`, items: [head(placesOf(notation, node.pred), T('谓词', 'predicate'), 'pred'), ...kids.map((k, i) => (k.value ? { ...k, label: T(PLACES[i], PLACES[i]) } : { ...k, label: T(`${PLACES[i]} 是谁`, `who is ${PLACES[i]}`) }))] }
    case '¬': return { key: `${key}g`, label: T('并非', 'not'), items: [head('¬', T('连接词', 'connective'), 'conn'), ...kids] }
    case '∀': case '∃': return { key: `${key}g`, label: node.op === '∀' ? T(`对所有 ${node.v}`, `for every ${node.v}`) : T(`有一个 ${node.v}`, `some ${node.v}`), items: [head(`${node.op}${node.v}.`, T('量词', 'quantifier'), 'quant'), ...kids] }
    default: return { key: `${key}g`, label: JOINS[node.op], items: [kids[0], head(node.op, T('连接词', 'connective'), 'conn'), kids[1]] }
  }
}

export default function FormulaScreen({ game, level: entry, saved, save, solve, phone }) {
  const level = entry.source
  const { notation } = level
  const consts = level.vocab.names
  const target = useMemo(() => parse(level.target, { consts }), [level, consts])
  const chips = useMemo(() => chipsOf(level), [level])
  const byKey = useMemo(() => new Map(chips.map((c) => [c.key, c])), [chips])
  const [tree, setTree] = useState(() => saved?.tree ?? null)
  const [verdict, setVerdict] = useState(null)
  const [armed, setArmed] = useState(false)
  const change = (next) => {
    setTree(next)
    save({ tree: next })
    setVerdict(null)
  }
  const strip = useStrip({
    put: (slot, key) => {
      const path = pathOf(slot)
      const chip = byKey.get(key)
      if (chip.kind !== kindAt(tree, path)) return chip.kind === 'term' ? T('这里要放一句话，不是一样东西。', 'This place takes a sentence, not a thing.') : T('这里要放一样东西：一个名字或一个变量。', 'This place takes a thing: a name or a variable.')
      change(setAt(tree, path, chip.make()))
      return null
    },
    take: (slot) => change(setAt(tree, pathOf(slot), null)),
    target: (key) => {
      const hole = holesOf(tree).find((h) => h.kind === byKey.get(key).kind)
      return hole ? keyOf(hole.path) : null
    },
    filled: (slot) => nodeAt(tree, pathOf(slot)) !== null,
    fixed: () => false,
  })
  const whole = complete(tree)

  const judge = () => {
    const want = level.kind === 'query' ? ['x'] : []
    const loose = [...freeVars(tree)].filter((v) => !want.includes(v))
    if (loose.length) return { pass: false, body: <p className="lg-error">{tr(`${loose.join('、')} 没有被 ∀ 或 ∃ 管着：它指的是谁？`, `${loose.join(', ')} is not bound by ∀ or ∃: who is it?`)}</p> }
    if (level.kind === 'query') {
      for (const world of level.worlds) {
        const m = structureOf(world, [tree, target])
        const [got, wanted] = [extent(tree, m), extent(target, m)]
        const name = thingName(notation, world)
        const extra = got.filter((d) => !wanted.includes(d)).map(name)
        const missing = wanted.filter((d) => !got.includes(d)).map(name)
        if (extra.length || missing.length) return { pass: false, body: <div className="fo-why"><p>{L(world.title)}{tr('：', ': ')}{extra.length > 0 && tr(`多选了 ${extra.join('、')}；`, `wrongly picks ${extra.join(', ')}; `)}{missing.length > 0 && tr(`漏掉了 ${missing.join('、')}。`, `misses ${missing.join(', ')}.`)}</p></div> }
      }
      return { pass: true }
    }
    const d = difference(tree, target)
    if (!d) return { pass: true }
    return {
      pass: false,
      body: (
        <div className="fo-why">
          <p>{d.first ? tr('在下面这个世界里，你写的为真，原来那句话却为假：', 'In this world what you wrote is true, while the sentence is false:') : tr('在下面这个世界里，原来那句话为真，你写的却为假：', 'In this world the sentence is true, while what you wrote is false:')}</p>
          <WorldText model={d.model} notation={notation} preds={level.vocab.preds} spell />
        </div>
      ),
    }
  }
  const check = () => {
    strip.clearSelection()
    const v = whole ? judge() : { pass: false, body: <p className="lg-error">{tr('还有空位没填：一句话要每个位置都填上。', 'Some places are still empty: every place must be filled.')}</p> }
    setVerdict(v)
    if (v.pass) solve(null)
  }
  const clear = () => {
    if (!armed) {
      setArmed(true)
      window.setTimeout(() => setArmed(false), 2600)
      return
    }
    setArmed(false)
    change(null)
  }

  const groups = GROUPS
    .map(([group, label]) => ({ key: group, label, chips: chips.filter((c) => c.group === group).map((c) => ({ key: c.key, family: group, text: c.group === 'pred' ? placesOf(notation, c.pred) : c.group === 'name' ? L(notation.words?.[c.name] ?? T(c.name, c.name)) : c.text })) }))
    .filter((g) => g.chips.length)
  const note = strip.note
    ? <p className={`ks-note ${strip.note.bad ? 'is-bad' : ''}`} role="status">{L(strip.note.text)}</p>
    : <p className="ks-note">{tree ? tr('点下面的块，它会进第一个能放它的空位；点已放的块把它连同里面的一起拿掉。', 'Tap a piece below and it goes into the first empty place that takes it; tap a placed piece to take it out with all inside it.') : tr('从最外面的那一块开始：整句话是什么形状？', 'Start with the outermost piece: what shape is the whole sentence?')}</p>
  const stage = (
    <div className="fo-stage">
      <p className="fo-say fo-prompt" dangerouslySetInnerHTML={{ __html: String(L(level.say)) }} />
      {level.kind === 'query' && (
        <div className="fo-worlds">
          {level.worlds.map((world, k) => (
            <details key={k} open={k === 0}>
              <summary>{L(world.title)}</summary>
              <WorldText model={structureOf(world, [target])} notation={notation} preds={level.vocab.preds} world={world} />
            </details>
          ))}
        </div>
      )}
      <Strip tree={{ key: 'top', label: T('公式', 'formula'), items: [stripOf(tree, [], 'formula', notation)] }} selected={strip.selected} flash={strip.flash} onSlot={strip.onSlot} />
      {note}
      <p className="fo-read">{whole ? <>{tr('读作：', 'Reads: ')}<b>{L(say(tree, notation))}</b></> : null}</p>
      {verdict && (verdict.pass ? <p className="lg-verdict is-pass" role="status">{level.kind === 'query' ? tr('每一家都选对了。', 'Right in every family.') : tr('在每个小世界里，都和原句一样真假。', 'True and false with the sentence in every small world.')}</p> : verdict.body)}
      <Chips groups={groups} onChip={strip.onChip} />
      <footer className="run-foot">
        <RunDock
          secondary={tree ? { label: armed ? tr('确认清空', 'Confirm clear') : tr('清空', 'Clear'), icon: <Trash2 size={16} />, armed, onClick: clear } : null}
          go={{ label: verdict?.pass ? tr('对了', 'Right') : tr('检查', 'Check'), pass: Boolean(verdict?.pass), onClick: check }}
        />
      </footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="fo-level">{stage}</PhonePage>
  return <Workbench className="fo-level" brief={brief} stage={stage} scroll />
}
