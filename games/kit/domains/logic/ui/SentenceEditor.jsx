import { forwardRef, useImperativeHandle, useMemo } from 'react'
import { L, tr, T } from '../../../shell/i18n.js'
import { Chips, Strip, StripTools, useStrip } from '../../../strip/index.js'
import { useHistory } from '../../../circuit/useHistory.js'
import { complete, holesOf, joinsOnto, kindAt, kidsOf, nodeAt, setAt, straysOf } from '../formulaTree.js'

// A sentence built from chips on the shared strip (games/kit/strip, as 《句法之图》 builds a clause), which writes it
// out as it reads, a box for each empty place: the translate and query tasks' (FormulaScreen.jsx), and a premise's on
// the rule table (RuleTable.jsx). Tools over it (clear, undo, redo), the chips under it, by kind. Its ref
// clears the place picked.
//
//   tree  the sentence (formulaTree.js; null: nothing yet)      onChange(tree)      chips  formulaTree.js chipsOf
//   notation  the level's words      scope  the history's

const PLACES = ['①', '②', '③']
export const STRAY = T('还不是完整的句子')
const GROUPS = [['pred', T('谓词')], ['name', T('名字', 'Names')], ['var', T('变量')], ['quant', T('量词')], ['conn', T('连接词')]]
const keyOf = (path) => ['r', ...path].join('.')
const pathOf = (key) => key.split('.').slice(1).map(Number)

/** A predicate's words with its places numbered: ①是②的父母 (on its chip). */
const placesOf = (notation, pred, places = 0) => (notation.words?.[pred] ? L(notation.words[pred]) : pred === '=' ? '{0} = {1}' : places ? `${pred}(${Array.from({ length: places }, (_, k) => `{${k}}`).join(', ')})` : pred).replace(/\{(\d)\}/g, (_, k) => PLACES[Number(k)])

// Words with numbered places ({0}), each place the segment `at(k)`.
const template = (words, at) => words.split(/(\{\d\})/).filter(Boolean).map((w) => (/^\{\d\}$/.test(w) ? at(Number(w[1])) : w))

/**
 * The formula as it reads, for the strip: each piece its own words, with a box for every empty place, so the line
 * reads as the formula does (∀x. x是人 → x会死). A whole ∀, ∃ or connective inside a connective keeps its brackets.
 */
function segmentOf(node, path, kind, notation, bracket = false) {
  const key = keyOf(path)
  if (!node) return { hole: key, label: kind === 'term' ? T('东西') : T('句子', 'sentence') }
  const piece = (family, parts) => ({ piece: key, family, parts: bracket ? ['(', ...parts, ')'] : parts })
  // A thing where a sentence goes is marked: it is not a sentence yet. A function (s, plus) has a box for each thing.
  if (node.t === 'fn' && node.args.length) return { ...piece('name', template(L(notation.words?.[node.f] ?? T('')) || `${node.f}(${node.args.map((_, k) => `{${k}}`).join(', ')})`, (k) => kid(k))), bad: kind === 'formula' }
  if (node.t) return { ...piece(node.t === 'var' ? 'var' : 'name', [node.t === 'var' ? node.name : L(notation.words?.[node.f] ?? T(node.f, node.f))]), bad: kind === 'formula' }
  const kid = (k, inner) => {
    const { value, kind: takes } = kidsOf(node)[k]
    return segmentOf(value, [...path, k], takes, notation, inner && Boolean(value) && !value.t && value.op !== 'atom' && value.op !== '¬')
  }
  switch (node.op) {
    case 'atom': {
      const words = notation.words?.[node.pred] ? L(notation.words[node.pred]) : node.pred === '=' ? '{0} = {1}' : `${node.pred}(${node.args.map((_, k) => `{${k}}`).join(', ')})`
      return piece('pred', template(words, (k) => kid(k)))
    }
    case '⊥': return piece('conn', ['⊥'])
    case '¬': return piece('conn', ['¬', kid(0, true)])
    case '∀': case '∃': return piece('quant', [`${node.op}${node.v}. `, kid(0)])
    default: return piece('conn', [kid(0, true), ` ${node.op} `, kid(1, true)])
  }
}

/** A whole sentence on a strip that cannot be changed (a sentence a level shows), its pieces keyed under `key`. */
export function fixedLine(f, notation, key) {
  const fix = (part) => (typeof part === 'string' || part.hole ? part : { ...part, fixed: true, parts: part.parts.map(fix) })
  return [fix(segmentOf(f, [key], 'formula', notation))]
}

const SentenceEditor = forwardRef(function SentenceEditor({ tree, onChange, chips, notation, scope }, ref) {
  const byKey = useMemo(() => new Map(chips.map((c) => [c.key, c])), [chips])
  const change = onChange
  const history = useHistory(tree, change, scope, 0)
  const strip = useStrip({
    put: (slot, key) => {
      const path = pathOf(slot)
      const chip = byKey.get(key)
      // A thing may stand where a sentence goes (marked until a predicate takes it); a sentence never where a thing goes.
      if (chip.kind === 'formula' && kindAt(tree, path) === 'term') return T('这里须填入一样东西：名字或变量。')
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
  useImperativeHandle(ref, () => ({ clearSelection: strip.clearSelection }), [strip])
  const strays = straysOf(tree)
  // Where the next piece goes, always marked: the box picked, else the first box, else after the whole sentence.
  const first = holesOf(tree)[0]
  const next = strip.selected ?? (first ? keyOf(first.path) : complete(tree) ? 'end' : null)
  const groups = GROUPS
    .map(([group, label]) => ({ key: group, label, chips: chips.filter((c) => c.group === group).map((c) => ({ key: c.key, family: group, text: c.group === 'pred' ? placesOf(notation, c.pred, c.places) : c.places ? placesOf(notation, c.name, c.places) : c.group === 'name' ? L(notation.words?.[c.name] ?? T(c.name, c.name)) : c.text })) }))
    .filter((g) => g.chips.length)
  const note = strip.note
    ? <p className={`ks-note ${strip.note.bad ? 'is-bad' : ''}`} role="status">{L(strip.note.text)}</p>
    : strays.length ? <p className="ks-note is-bad" role="status">{L(STRAY)}</p>
    : <p className="ks-note">{tr('点击文字可以删除。')}</p>
  return (
    <>
      <StripTools history={history} onClear={() => change(null)} empty={!tree} />
      <Strip line={[segmentOf(tree, [], 'formula', notation)]} label={T('公式')} next={next} selected={strip.selected} flash={strip.flash} onSlot={strip.onSlot} />
      {note}
      <Chips groups={groups} onChip={strip.onChip} />
    </>
  )
})
export default SentenceEditor
