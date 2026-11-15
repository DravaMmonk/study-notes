import { forwardRef } from 'react'
import { L, T } from '../../../shell/i18n.js'
import TreeEditor from '../../../strip/TreeEditor.jsx'
import { complete, holesOf, joinsOnto, kindAt, kidsOf, nodeAt, setAt, straysOf } from '../formulaTree.js'

// A sentence built from chips on the shared strip (games/kit/strip, as 《句法之图》 builds a clause), which writes it
// out as it reads, a box for each empty place: the translate and query tasks' (FormulaScreen.jsx), and a premise's on
// the rule table (RuleTable.jsx). Tools over it (clear, undo, redo), the chips under it, by kind. Its ref
// clears the place picked.
//
//   tree  the sentence (formulaTree.js; null: nothing yet)      onChange(tree)      chips  formulaTree.js chipsOf
//   notation  the level's words      scope  the history's
//   root  'term' for a thing built alone (a right side on the definition board, formulaTree.js termChips)

const PLACES = ['①', '②', '③']
export const STRAY = T('还不是完整的句子')
const TERM = T('式子', 'Expression')
const GROUPS = [['pred', T('谓词')], ['name', T('名字', 'Names')], ['var', T('变量')], ['quant', T('量词')], ['conn', T('连接词')]]
const keyOf = (path) => ['r', ...path].join('.')

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
  const kid = (k, inner) => {
    const { value, kind: takes } = kidsOf(node)[k]
    return segmentOf(value, [...path, k], takes, notation, inner && Boolean(value) && !value.t && value.op !== 'atom' && value.op !== '¬')
  }
  // A thing where a sentence goes is marked: it is not a sentence yet. A function (s, plus) has a box for each thing.
  if (node.t === 'fn' && node.args.length) return { ...piece('name', template(L(notation.words?.[node.f] ?? T('')) || `${node.f}(${node.args.map((_, k) => `{${k}}`).join(', ')})`, (k) => kid(k))), bad: kind === 'formula' }
  if (node.t) return { ...piece(node.t === 'var' ? 'var' : 'name', [node.t === 'var' ? node.name : L(notation.words?.[node.f] ?? T(node.f, node.f))]), bad: kind === 'formula' }
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

const SentenceEditor = forwardRef(function SentenceEditor({ tree, onChange, chips, notation, scope, root = 'formula' }, ref) {
  const model = {
    complete, holesOf, joinsOnto, nodeAt, setAt,
    segment: (value) => segmentOf(value, [], root, notation),
    accepts: (hole, chip) => chip.kind === 'term' || hole.kind === 'formula',
    refuse: (value, path, chip) => (chip.kind === 'formula' && kindAt(value, path) === 'term' ? T('这里须填入一样东西：名字或变量。') : null),
  }
  const groups = GROUPS
    .map(([group, label]) => ({ key: group, label, chips: chips.filter((c) => c.group === group).map((c) => ({ key: c.key, family: group, text: c.group === 'pred' ? placesOf(notation, c.pred, c.places) : c.places ? placesOf(notation, c.name, c.places) : c.group === 'name' ? L(notation.words?.[c.name] ?? T(c.name, c.name)) : c.text })) }))
    .filter((g) => g.chips.length)
  return <TreeEditor
    ref={ref}
    tree={tree}
    onChange={onChange}
    chips={chips}
    groups={groups}
    scope={scope}
    label={root === 'term' ? TERM : T('公式')}
    model={model}
    warning={root === 'formula' && straysOf(tree).length ? STRAY : null}
  />
})
export default SentenceEditor
