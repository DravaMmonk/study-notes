// What the logic domain's parts are called and how they look on a board (《证明完毕》): each rule's name, what it does,
// its ports and the settings on its card, and the editor's description of a node (../../../circuit/model.js parts).
import { ArrowRightFromLine, Box, Flag, GitFork, Puzzle, Sigma, Split } from 'lucide-react'
import { L } from '../../../shell/i18n.js'
import { CARRY, RULES, rulesOf } from '../proof.js'

const T = (zh, en) => ({ zh, en })

/** Every rule: name, what it does, port labels, setting labels and the boards a box opens. */
export const RULE_TEXT = {
  mp: { name: T('分离', 'Detach'), desc: T('接进「如果 X，那么 Y」和 X，得到 Y。', 'Wire in “if X then Y” and X; out comes Y.'), ports: { imp: T('如果…那么…', 'if … then …'), a: T('前一半', 'its “if” part') } },
  axK: { name: T('公理 K', 'Axiom K'), desc: T('X → (Y → X)：X、Y 在卡片上选。', 'X → (Y → X), with X and Y chosen on the card.'), params: { A: 'X', B: 'Y' } },
  axS: { name: T('公理 S', 'Axiom S'), desc: T('(X → (Y → Z)) → ((X → Y) → (X → Z))：X、Y、Z 在卡片上选。', '(X → (Y → Z)) → ((X → Y) → (X → Z)), with X, Y and Z chosen on the card.'), params: { A: 'X', B: 'Y', C: 'Z' } },
  impI: { name: T('假设框', 'Assumption box'), desc: T('框里假设 X、证出 Y，框外得到 X → Y。', 'Assume X inside the box and prove Y; outside you get X → Y.'), params: { A: T('假设', 'Assume') }, boards: { body: T('框里', 'Inside') } },
  andI: { name: T('拼成 ∧', 'Join ∧'), desc: T('由 X 和 Y 得 X ∧ Y。', 'From X and Y, X ∧ Y.'), ports: { a: 'X', b: 'Y' } },
  andE: { name: T('拆开 ∧', 'Split ∧'), desc: T('由 X ∧ Y 得 X，也得 Y。', 'From X ∧ Y, X, and also Y.'), ports: { ab: 'X ∧ Y' }, outs: { left: ['X', T('左', 'L')], right: ['Y', T('右', 'R')] } },
  orI: { name: T('引入 ∨', 'Bring in ∨'), desc: T('由 X 得 X ∨ Y（或 Y ∨ X），另一边在卡片上选。', 'From X, X ∨ Y (or Y ∨ X), with the other side chosen on the card.'), ports: { a: 'X' }, params: { other: T('另一边', 'Other side') } },
  orE: { name: T('分情况', 'Case by case'), desc: T('接进 X ∨ Y；假设 X 证出 Z，假设 Y 也证出 Z，就得到 Z。', 'Wire in X ∨ Y; if assuming X proves Z and assuming Y proves Z, then Z.'), ports: { ab: 'X ∨ Y' }, boards: { left: T('情况一', 'Case one'), right: T('情况二', 'Case two') } },
  botE: { name: T('矛盾推出一切', 'From contradiction'), desc: T('由 ⊥ 得到卡片上选的任何一句。', 'From ⊥, whatever is chosen on the card.'), ports: { bot: '⊥' }, params: { C: T('得出', 'Conclude') } },
  raa: { name: T('反证法', 'By contradiction'), desc: T('由 ¬¬X 得 X。', 'From ¬¬X, X.'), ports: { nna: '¬¬X' } },
  iffE: { name: T('拆开 ↔', 'Split ↔'), desc: T('由 X ↔ Y 得 X → Y，也得 Y → X。', 'From X ↔ Y, X → Y, and also Y → X.'), ports: { iff: 'X ↔ Y' }, outs: { ltr: ['X → Y', '→'], rtl: ['Y → X', '←'] } },
  allI: { name: T('任取', 'For any'), desc: T('框里对一个新变量 x 证出 P(x)，框外得 ∀x. P(x)。', 'Prove P(x) inside the box for a new variable x; outside you get ∀x. P(x).'), params: { x: T('变量', 'Variable') }, boards: { body: T('框里', 'Inside') } },
  allE: { name: T('代入', 'Instantiate'), desc: T('由 ∀x. P(x) 得 P(t)。', 'From ∀x. P(x), P(t).'), ports: { all: '∀x. P(x)' }, params: { t: T('项', 'Term') } },
  exI: { name: T('举例', 'Example'), desc: T('由 P(t) 得 ∃x. P(x)。', 'From P(t), ∃x. P(x).'), ports: { a: 'P(t)' }, params: { target: T('要得出', 'Conclude'), t: T('项', 'Term') } },
  exE: { name: T('取一个', 'Take one'), desc: T('接进 ∃x. P(x)；框里假设 P(y) 证出 C，就得 C。', 'Wire in ∃x. P(x); if assuming P(y) proves C inside the box, then C.'), ports: { ex: '∃x. P(x)' }, params: { x: T('见证', 'Witness') }, boards: { body: T('框里', 'Inside') } },
  refl: { name: T('自反', 'Reflexivity'), desc: T('t = t。', 't = t.'), params: { t: T('项', 'Term') } },
  rewrite: { name: T('等量代换', 'Rewrite'), desc: T('由 s = t 和 φ(s) 得 φ(t)。', 'From s = t and φ(s), φ(t).'), ports: { eq: 's = t', p: 'φ(s)' }, params: { pattern: T('样式', 'Pattern') } },
}

export const CARRY_LABEL = (port) => T(`带进 ${port.slice(2)}`, `in ${port.slice(2)}`)
const FIXED = { premise: 'source', assume: 'source', goal: 'sink', out: 'sink' }

/** The card's settings: [{ key, label }] (orI's side is a switch of its own). */
export const settingsOf = (parts, type) => (parts[type]?.params ?? []).map((key) => ({ key, label: RULE_TEXT[type]?.params?.[key] ?? key }))

/** A rule's or lemma's name and what it does. */
export const nameOf = (lemmas, type) => lemmas[type]?.name ?? RULE_TEXT[type]?.name ?? type
export const descOf = (lemmas, type) => lemmas[type]?.desc ?? RULE_TEXT[type]?.desc
export const familyOf = (lemmas, type) => (lemmas[type] ? 'lemma' : RULES[type]?.boards ? 'box' : type === 'axK' || type === 'axS' ? 'axiom' : 'rule')
const ICONS = { lemma: Puzzle, box: Box, axiom: Sigma, rule: GitFork }
export const iconOf = (lemmas, type) => ICONS[familyOf(lemmas, type)] ?? Split

// What a fixed source card is: a premise, this box's assumption, an assumption of a box around it, or brought in.
function sourceLabel(node) {
  const name = node.params.name
  if (node.type === 'assume') return T('假设', 'Assume')
  if (CARRY.includes(name)) return CARRY_LABEL(name)
  if (name.includes('/')) return T('外层的假设', 'Outer assumption')
  return T(`前提 ${name}`, `Premise ${name}`)
}

/** The editor's description of a proof's nodes (model.js), for a level's lemmas. */
export function partsFor(lemmas = {}) {
  const parts = rulesOf(lemmas)
  return {
    inputs: (node) => (FIXED[node.type] ? (FIXED[node.type] === 'sink' ? ['in'] : []) : parts[node.type]?.inputs ?? []),
    role: (node) => (FIXED[node.type] ? FIXED[node.type] : 'part'),
    label: (node) => {
      if (node.type === 'goal') return T('目标', 'Goal')
      if (node.type === 'out') return T('结论', 'Conclusion')
      if (FIXED[node.type]) return sourceLabel(node)
      return nameOf(lemmas, node.type)
    },
    portLabel: (node, port) => {
      if (CARRY.includes(port)) return CARRY_LABEL(port)
      const l = lemmas[node.type]
      if (l) return l.premises[Number(port.slice(1))]
      return RULE_TEXT[node.type]?.ports?.[port] ?? ''
    },
    family: (node) => (FIXED[node.type] ? (FIXED[node.type] === 'sink' ? 'end' : node.type === 'premise' && !node.params.name.includes('/') && !CARRY.includes(node.params.name) ? 'given' : 'hyp') : familyOf(lemmas, node.type)),
    icon: (node) => (node.type === 'goal' || node.type === 'out' ? Flag : FIXED[node.type] ? ArrowRightFromLine : iconOf(lemmas, node.type)),
    outputs: (node) => {
      const outs = RULE_TEXT[node.type]?.outs
      return outs ? Object.entries(outs).map(([key, [label, short]]) => ({ key, label, short })) : null
    },
    cardWidth: (node) => (parts[node.type]?.boards ? 190 : FIXED[node.type] ? 170 : 160),
    boards: (node) => (parts[node.type]?.boards?.(node) ?? []).map((b) => ({ ...b, label: L(RULE_TEXT[node.type]?.boards?.[b.name] ?? b.name) })),
    rules: parts,
  }
}

