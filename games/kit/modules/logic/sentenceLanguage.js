import { L, T } from '../../shell/i18n.js'
import { treeKey as keyOf } from '../../strip/tree.js'
import { show } from './formula.js'
import { say } from './notation.js'
import { bindsAt, chipsFrom, complete, holesOf, joinsOnto, kindAt, kidsOf, nodeAt, setAt, straysOf } from './formulaTree.js'

export const OUTSIDE = T('这个名字只在它绑定的区域里可用。', 'This name is only available inside the region that binds it.')

const PLACES = ['①', '②', '③']
export const STRAY = T('还不是完整的句子')
const GROUPS = [['pred', T('谓词')], ['name', T('名字', 'Names')], ['var', T('变量')], ['quant', T('量词')], ['conn', T('连接词')]]

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
    case '∀': case '∃': return piece('quant', [`${node.op}${node.v}. `, { region: [kid(0)] }])
    default: return piece('conn', [kid(0, true), ` ${node.op} `, kid(1, true)])
  }
}

/** A whole sentence on a strip that cannot be changed (a sentence a level shows), its pieces keyed under `key`. */
export function fixedLine(f, notation, key) {
  const fix = (part) => typeof part === 'string' || part.hole ? part : part.region ? { region: part.region.map(fix) } : { ...part, fixed: true, parts: part.parts.map(fix) }
  return [fix(segmentOf(f, [key], 'formula', notation))]
}

export function sentenceLanguage(notation, root = 'formula', free) {
  return {
    nodeAt, setAt, holesOf, complete, joinsOnto,
    label: root === 'term' ? T('式子', 'Expression') : T('公式'),
    line: (tree) => [segmentOf(tree, [], root, notation)],
    refuse: (tree, path, chip) => {
      if (chip.kind === 'formula' && kindAt(tree, path) === 'term') return T('这里须填入一样东西：名字或变量。')
      if (root === 'formula' && chip.group === 'var' && !(free?.includes(chip.text) ?? chip.free) && !bindsAt(tree, path, chip.text)) return OUTSIDE
      return null
    },
    accepts: (hole, chip) => chip.kind === 'term' || hole.kind === 'formula',
    problem: (tree) => root === 'term' || !straysOf(tree).length ? null : STRAY,
    groups: GROUPS,
    chipText: (chip) => chip.group === 'pred' ? placesOf(notation, chip.pred, chip.places)
      : chip.places ? placesOf(notation, chip.name, chip.places)
        : chip.group === 'name' ? L(notation.words?.[chip.name] ?? T(chip.name, chip.name)) : chip.text,
  }
}


/** Read and write sentence values on a strip, with the display used when the editor is closed. */
export function sentencePicker(formulas, { read, consts = [], notation, text = (value) => say(read(value), notation) }) {
  return {
    read, text, write: show,
    ready: (tree) => Boolean(tree) && complete(tree) && !straysOf(tree).length,
    chips: chipsFrom(formulas, { consts, notation }),
    language: sentenceLanguage(notation),
  }
}
