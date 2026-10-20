// What the logic domain's parts are called and how they look on a board (《证明完毕》): each rule's name, what it does
// (a description may use letters for any sentence; the board itself never shows one), its ports and the settings on
// its card, and the editor's description of a node (../../../circuit/model.js parts).
import { ArrowRightFromLine, Box, Flag, GitFork, Puzzle, Sigma, Split } from 'lucide-react'
import { L } from '../../../shell/i18n.js'
import { CARRY, RULES, rulesOf } from '../proof.js'

const T = (zh, en) => ({ zh, en })

/** Every rule: name, what it does, port labels, setting labels and the boards a box opens. */
export const RULE_TEXT = {
  mp: { name: T('分离', 'Detach'), desc: T('由 A → B 和 A 得到 B：接进一句「如果…，那么…」和它的前一半，得到后一半。', 'From A → B and A, B: wire in an “if …, then …” and its “if” part; out comes the “then” part.'), ports: { imp: T('如果…那么…', 'if … then …'), a: T('前一半', 'its “if” part') } },
  axK: { name: T('公理 K', 'Axiom K'), desc: T('A → (B → A)：已经成立的事，加上什么条件都还成立。第一句 A、第二句 B 在卡片上选。', 'A → (B → A): what holds still holds under any condition. Choose the first sentence A and the second B on the card.'), params: { A: T('第一句', 'First'), B: T('第二句', 'Second') } },
  axS: { name: T('公理 S', 'Axiom S'), desc: T('(A → (B → C)) → ((A → B) → (A → C))：在条件 A 下也能分离。三句 A、B、C 在卡片上选。', '(A → (B → C)) → ((A → B) → (A → C)): Detach works under a condition A too. Choose A, B and C on the card.'), params: { A: T('第一句', 'First'), B: T('第二句', 'Second'), C: T('第三句', 'Third') } },
  impI: { name: T('假设框', 'Assumption box'), desc: T('框里假设 A、证出 B，框外得到 A → B。', 'Assume A inside the box and prove B; outside you get A → B.'), params: { A: T('假设', 'Assume') }, boards: { body: T('框里', 'Inside') } },
  andI: { name: T('拼成 ∧', 'Join ∧'), desc: T('由 A 和 B 得到 A ∧ B。', 'From A and B, A ∧ B.'), ports: { a: T('左边', 'left'), b: T('右边', 'right') } },
  andE: { name: T('拆开 ∧', 'Split ∧'), desc: T('由 A ∧ B 得到 A，也得到 B。', 'From A ∧ B, A, and also B.'), ports: { ab: T('…∧…', '… ∧ …') }, outs: { left: [T('左边', 'left'), T('左', 'L')], right: [T('右边', 'right'), T('右', 'R')] } },
  orI: { name: T('引入 ∨', 'Bring in ∨'), desc: T('由 A 得到 A ∨ B（或 B ∨ A），另一边 B 和放在哪边在卡片上选。', 'From A, A ∨ B (or B ∨ A); choose B and its side on the card.'), ports: { a: T('一句', 'a sentence') }, params: { other: T('另一边', 'Other side') } },
  orE: { name: T('分情况', 'Case by case'), desc: T('接进 A ∨ B：假设 A 证出 C，假设 B 也证出 C，就得到 C。', 'Wire in A ∨ B: if assuming A proves C and assuming B proves C, then C.'), ports: { ab: T('…∨…', '… ∨ …') }, boards: { left: T('情况一', 'Case one'), right: T('情况二', 'Case two') } },
  botE: { name: T('矛盾推出一切', 'From contradiction'), desc: T('由矛盾 ⊥ 得到卡片上选的任何一句。', 'From the contradiction ⊥, whatever is chosen on the card.'), ports: { bot: '⊥' }, params: { C: T('得出', 'Conclude') } },
  raa: { name: T('反证法', 'By contradiction'), desc: T('由 ¬¬A 得到 A。', 'From ¬¬A, A.'), ports: { nna: T('¬¬…', '¬¬…') } },
  iffE: { name: T('拆开 ↔', 'Split ↔'), desc: T('由 A ↔ B 得到 A → B，也得到 B → A。', 'From A ↔ B, A → B, and also B → A.'), ports: { iff: T('…↔…', '… ↔ …') }, outs: { ltr: [T('从左到右', 'left to right'), '→'], rtl: [T('从右到左', 'right to left'), '←'] } },
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
function sourceLabel(node, premises) {
  const name = node.params.name
  if (node.type === 'assume') return T('假设', 'Assume')
  if (CARRY.includes(name)) return CARRY_LABEL(name)
  if (name.includes('/')) return T('外层的假设', 'Outer assumption')
  return premises.length > 1 ? T(`已知 ${premises.indexOf(name) + 1}`, `Given ${premises.indexOf(name) + 1}`) : T('已知', 'Given')
}

/** The editor's description of a proof's nodes (model.js), for a level's lemmas and premise names (in order). */
export function partsFor(lemmas = {}, premises = []) {
  const parts = rulesOf(lemmas)
  return {
    inputs: (node) => (FIXED[node.type] ? (FIXED[node.type] === 'sink' ? ['in'] : []) : parts[node.type]?.inputs ?? []),
    role: (node) => (FIXED[node.type] ? FIXED[node.type] : 'part'),
    label: (node) => {
      if (node.type === 'goal') return T('目标', 'Goal')
      if (node.type === 'out') return T('结论', 'Conclusion')
      if (FIXED[node.type]) return sourceLabel(node, premises)
      return nameOf(lemmas, node.type)
    },
    portLabel: (node, port) => {
      if (CARRY.includes(port)) return CARRY_LABEL(port)
      const l = lemmas[node.type]
      if (l) return l.ports[Number(port.slice(1))]
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

