import { useMemo, useState } from 'react'
import { Brief, PhonePage, RunDock, Workbench, useKeptVerdict } from '../../../shell/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { Chips, Strip, StripTools, useStrip } from '../../../strip/index.js'
import { useHistory } from '../../../circuit/useHistory.js'
import { freeVars, parse } from '../formula.js'
import { difference, extent, structureOf } from '../fol.js'
import { chipsOf, complete, holesOf, joinsOnto, kindAt, kidsOf, nodeAt, setAt, straysOf } from '../formulaTree.js'
import { WorldText, thingName } from './WorldScreens.jsx'

// Translate and query tasks (《证明完毕》 chapter 5): one sentence said in words, built as a formula from chips on the
// shared strip (games/kit/strip, as 《句法之图》 builds a clause), which writes it out as it reads, a box for each
// empty place. A
// translation passes when it means the same as the sentence in every small world, and shows a world where it does
// not otherwise; a query (x left free) passes when it picks out the right things in each of the level's worlds.
//
//   level  { kind: 'translate' | 'query', say: { zh, en }, target: formula text, decoys?: [formula text] }

const T = (zh, en) => ({ zh, en })
const PLACES = ['①', '②', '③']
const STRAY = T('还不是一句完整的话', 'Not a whole sentence yet')
const GROUPS = [['pred', T('谓词', 'Predicates')], ['name', T('名字', 'Names')], ['var', T('变量', 'Variables')], ['quant', T('量词', 'Quantifiers')], ['conn', T('连接词', 'Connectives')]]
const keyOf = (path) => ['r', ...path].join('.')
const pathOf = (key) => key.split('.').slice(1).map(Number)

/** A predicate's words with its places numbered: ①是②的父母 (on its chip). */
const placesOf = (notation, pred) => (notation.words?.[pred] ? L(notation.words[pred]).replace(/\{(\d)\}/g, (_, k) => PLACES[Number(k)]) : pred)

/**
 * The formula as it reads, for the strip: each piece its own words, with a box for every empty place, so the line
 * reads as the formula does (∀x. x是人 → x会死). A whole ∀, ∃ or connective inside a connective keeps its brackets.
 */
function segmentOf(node, path, kind, notation, bracket = false) {
  const key = keyOf(path)
  if (!node) return { hole: key, label: kind === 'term' ? T('谁', 'who') : T('一句话', 'a sentence') }
  const piece = (family, parts) => ({ piece: key, family, parts: bracket ? ['(', ...parts, ')'] : parts })
  // A thing where a sentence goes is marked: it is not a sentence yet.
  if (node.t) return { ...piece(node.t === 'var' ? 'var' : 'name', [node.t === 'var' ? node.name : L(notation.words?.[node.f] ?? T(node.f, node.f))]), bad: kind === 'formula' }
  const kid = (k, inner) => {
    const { value, kind: takes } = kidsOf(node)[k]
    return segmentOf(value, [...path, k], takes, notation, inner && Boolean(value) && !value.t && value.op !== 'atom' && value.op !== '¬')
  }
  switch (node.op) {
    case 'atom': {
      const words = notation.words?.[node.pred] ? L(notation.words[node.pred]) : `${node.pred}(${node.args.map((_, k) => `{${k}}`).join(', ')})`
      return piece('pred', words.split(/(\{\d\})/).filter(Boolean).map((w) => (/^\{\d\}$/.test(w) ? kid(Number(w[1])) : w)))
    }
    case '¬': return piece('conn', ['¬', kid(0, true)])
    case '∀': case '∃': return piece('quant', [`${node.op}${node.v}. `, kid(0)])
    default: return piece('conn', [kid(0, true), ` ${node.op} `, kid(1, true)])
  }
}

export default function FormulaScreen({ game, level: entry, saved, save, solve, lastRun, keepRun, phone }) {
  const level = entry.source
  const { notation } = level
  const consts = level.vocab.names
  const target = useMemo(() => parse(level.target, { consts }), [level, consts])
  const chips = useMemo(() => chipsOf(level), [level])
  const byKey = useMemo(() => new Map(chips.map((c) => [c.key, c])), [chips])
  const [tree, setTree] = useState(() => saved?.tree ?? null)
  const change = (next) => {
    setTree(next)
    save({ tree: next })
    setVerdict(null)
  }
  const history = useHistory(tree, change, `${entry.id}:${level.task ?? 0}`, 0)
  const strip = useStrip({
    put: (slot, key) => {
      const path = pathOf(slot)
      const chip = byKey.get(key)
      // A thing may stand where a sentence goes (marked until a predicate takes it); a sentence never where a thing goes.
      if (chip.kind === 'formula' && kindAt(tree, path) === 'term') return T('这里要放一样东西：一个名字或一个变量。', 'This place takes a thing: a name or a variable.')
      // Onto what the line ends with (see target): it becomes the piece's first part.
      const last = nodeAt(tree, path)
      change(setAt(tree, path, last ? setAt(chip.make(), [0], last) : chip.make()))
      return null
    },
    take: (slot) => change(setAt(tree, pathOf(slot), null)),
    // The first box that takes it (a thing goes in any box); with no box left, a connective joins on after the last
    // sentence, and a predicate takes a thing the line ends with as its first place.
    target: (key) => {
      const hole = holesOf(tree).find((h) => byKey.get(key).kind === 'term' || h.kind === 'formula')
      if (hole) return keyOf(hole.path)
      const last = byKey.get(key).leads && joinsOnto(tree, key)
      return last ? keyOf(last) : null
    },
    filled: (slot) => nodeAt(tree, pathOf(slot)) !== null,
    fixed: () => false,
  })
  const strays = straysOf(tree)
  const whole = complete(tree) && !strays.length
  // Where the next piece goes, always marked: the box picked, else the first box, else after the whole sentence.
  const first = holesOf(tree)[0]
  const next = strip.selected ?? (first ? keyOf(first.path) : complete(tree) ? 'end' : null)

  // A whole sentence, held against the one asked for.
  const compare = () => {
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
  const judge = () => (strays.length ? { pass: false, body: <p className="lg-error">{L(STRAY)}</p> } : whole ? compare() : { pass: false, body: <p className="lg-error">{tr('还有空位没填：一句话要每个位置都填上。', 'Some places are still empty: every place must be filled.')}</p> })
  const [verdict, setVerdict] = useKeptVerdict({ lastRun, keepRun }, judge)
  const check = () => {
    strip.clearSelection()
    const v = judge()
    setVerdict(v)
    if (v.pass) solve(null)
  }

  const groups = GROUPS
    .map(([group, label]) => ({ key: group, label, chips: chips.filter((c) => c.group === group).map((c) => ({ key: c.key, family: group, text: c.group === 'pred' ? placesOf(notation, c.pred) : c.group === 'name' ? L(notation.words?.[c.name] ?? T(c.name, c.name)) : c.text })) }))
    .filter((g) => g.chips.length)
  const note = strip.note
    ? <p className={`ks-note ${strip.note.bad ? 'is-bad' : ''}`} role="status">{L(strip.note.text)}</p>
    : strays.length ? <p className="ks-note is-bad" role="status">{L(STRAY)}</p>
    : <p className="ks-note">{tr('点击文字可以删除。', 'Tap words to delete them.')}</p>
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
      <StripTools history={history} onClear={() => change(null)} empty={!tree} />
      <Strip line={[segmentOf(tree, [], 'formula', notation)]} label={T('公式', 'formula')} next={next} selected={strip.selected} flash={strip.flash} onSlot={strip.onSlot} />
      {note}
      {verdict && (verdict.pass ? <p className="lg-verdict is-pass" role="status">{level.kind === 'query' ? tr('每一家都选对了。', 'Right in every family.') : tr('在每个小世界里，都和原句一样真假。', 'True and false with the sentence in every small world.')}</p> : verdict.body)}
      <Chips groups={groups} onChip={strip.onChip} />
      <footer className="run-foot">
        <RunDock
          go={{ label: verdict?.pass ? tr('对了', 'Right') : tr('检查', 'Check'), pass: Boolean(verdict?.pass), onClick: check }}
        />
      </footer>
    </div>
  )
  const brief = <Brief game={game} level={entry} hint={level.hint} phone={phone} />
  if (phone) return <PhonePage brief={brief} className="fo-level">{stage}</PhonePage>
  return <Workbench className="fo-level" brief={brief} stage={stage} scroll />
}
