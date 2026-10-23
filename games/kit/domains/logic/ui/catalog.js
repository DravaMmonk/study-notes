// What the logic domain's parts are called and how they look on a board (《证明完毕》): each rule's name, what it does
// and its ports, written with letters for any sentence (a part is a pattern), the settings on its
// card and a box's regions, and the editor's description of a node (../../../circuit/model.js parts, frames.js).
import { ArrowRightFromLine, Box, Flag, GitFork, Puzzle, Split } from 'lucide-react'
import { RULES, rulesOf } from '../proof.js'

const T = (zh, en) => ({ zh, en })

/** Every rule: name, what it does, port labels, setting labels and the regions of a box (`frames`). */
export const RULE_TEXT = {
  mp: { name: T('套用', 'Apply'), desc: T('由 A → B 和 A 得到 B：接进一句「如果…，那么…」和它的前一半，得到后一半。', 'From A → B and A, B: wire in an “if …, then …” and its “if” part; out comes the “then” part.'), ports: { imp: 'A → B', a: 'A' } },
  impI: { name: T('假设框', 'Assumption box'), desc: T('框里假设 A、证出 B，框外得到 A → B。', 'Assume A inside the box and prove B; outside you get A → B.'), params: { A: T('假设', 'Assume') }, frames: { body: T('框里', 'Inside') } },
  andI: { name: T('拼成 ∧', 'Join ∧'), desc: T('由 A 和 B 得到 A ∧ B。', 'From A and B, A ∧ B.'), ports: { a: 'A', b: 'B' } },
  andE: { name: T('拆开 ∧', 'Split ∧'), desc: T('由 A ∧ B 得到 A，也得到 B。A ↔ B 就是 (A → B) ∧ (B → A)，也能这样拆。', 'From A ∧ B, A, and also B. A ↔ B is (A → B) ∧ (B → A), and splits the same way.'), ports: { ab: 'A ∧ B' }, outs: { left: ['A', 'A'], right: ['B', 'B'] } },
  orI: { name: T('引入 ∨', 'Bring in ∨'), desc: T('由 A 得到 A ∨ B（或 B ∨ A），另一边 B 和放在哪边在卡片上选。', 'From A, A ∨ B (or B ∨ A); choose B and its side on the card.'), ports: { a: 'A' }, params: { other: T('另一边', 'Other side') } },
  orE: { name: T('分情况', 'Case by case'), desc: T('一块有两个框的元件。输入口接 A ∨ B；「情况一」的框假设 A，「情况二」的框假设 B。两个框都证出同一句 C、接到各自的「结论」，卡片就输出 C：不知道是哪一种，就每一种都证一遍。', 'A part with two boxes. Wire A ∨ B into its input; the box Case one assumes A, the box Case two assumes B. When both prove the same C, wired to their own “Conclusion”, the card gives C: not knowing which case it is, prove it in each.'), ports: { ab: 'A ∨ B' }, frames: { left: T('情况一', 'Case one'), right: T('情况二', 'Case two') } },
  botE: { name: T('矛盾推出一切', 'From contradiction'), desc: T('由矛盾 ⊥ 得到卡片上选的任何一句。', 'From the contradiction ⊥, whatever is chosen on the card.'), ports: { bot: '⊥' }, params: { C: T('得出', 'Conclude') } },
  raa: { name: T('反证法', 'By contradiction'), desc: T('由 ¬¬A 得到 A。', 'From ¬¬A, A.'), ports: { nna: '¬¬A' } },
  allI: { name: T('任取', 'For any'), desc: T('框里对一个新变量 x 证出 P(x)，框外得 ∀x. P(x)。', 'Prove P(x) inside the box for a new variable x; outside you get ∀x. P(x).'), params: { x: T('变量', 'Variable') }, frames: { body: T('框里', 'Inside') } },
  allE: { name: T('代入', 'Instantiate'), desc: T('由 ∀x. P(x) 得 P(t)。', 'From ∀x. P(x), P(t).'), ports: { all: '∀x. P(x)' }, params: { t: T('项', 'Term') } },
  exI: { name: T('举例', 'Example'), desc: T('由 P(t) 得 ∃x. P(x)。', 'From P(t), ∃x. P(x).'), ports: { a: 'P(t)' }, params: { target: T('要得出', 'Conclude'), t: T('项', 'Term') } },
  exE: { name: T('取一个', 'Take one'), desc: T('接进 ∃x. P(x)；框里假设 P(y) 证出 C，就得 C。', 'Wire in ∃x. P(x); if assuming P(y) proves C inside the box, then C.'), ports: { ex: '∃x. P(x)' }, params: { x: T('见证', 'Witness') }, frames: { body: T('框里', 'Inside') } },
  refl: { name: T('自反', 'Reflexivity'), desc: T('t = t。', 't = t.'), params: { t: T('项', 'Term') } },
  rewrite: { name: T('等量代换', 'Rewrite'), desc: T('由 s = t 和 φ(s) 得 φ(t)。', 'From s = t and φ(s), φ(t).'), ports: { eq: 's = t', p: 'φ(s)' }, params: { pattern: T('样式', 'Pattern') } },
}

const FIXED = { premise: 'source', goal: 'sink' }
// What a box's region gives at its left edge, and what goes into the dot at its right.
const OPENS = T('假设', 'Assume')
const CLOSES = T('结论', 'Conclusion')
const GIVES = T('得出', 'Result')

/** The card's settings: [{ key, label }] (orI's side is a switch of its own); a lemma may name its own (`params`). */
export const settingsOf = (parts, type, lemmas = {}) => (parts[type]?.params ?? []).map((key) => ({ key, label: lemmas[type]?.params?.[key] ?? RULE_TEXT[type]?.params?.[key] ?? key }))

/** A rule's or lemma's name and what it does. */
export const nameOf = (lemmas, type) => lemmas[type]?.name ?? RULE_TEXT[type]?.name ?? type
export const descOf = (lemmas, type) => lemmas[type]?.desc ?? RULE_TEXT[type]?.desc
export const familyOf = (lemmas, type) => (lemmas[type] ? 'lemma' : RULES[type]?.frames ? 'box' : 'rule')
const ICONS = { lemma: Puzzle, box: Box, rule: GitFork }
export const iconOf = (lemmas, type) => ICONS[familyOf(lemmas, type)] ?? Split

/** The editor's description of a proof's nodes (model.js), for a level's lemmas and premise names (in order). */
export function partsFor(lemmas = {}, premises = []) {
  const parts = rulesOf(lemmas)
  return {
    inputs: (node) => (FIXED[node.type] ? (FIXED[node.type] === 'sink' ? ['in'] : []) : parts[node.type]?.inputs ?? []),
    role: (node) => (FIXED[node.type] ? FIXED[node.type] : 'part'),
    label: (node) => {
      if (node.type === 'goal') return T('目标', 'Goal')
      if (node.type === 'premise') return premises.length > 1 ? T(`已知 ${premises.indexOf(node.params.name) + 1}`, `Given ${premises.indexOf(node.params.name) + 1}`) : T('已知', 'Given')
      return nameOf(lemmas, node.type)
    },
    portLabel: (node, port) => {
      if (RULE_TEXT[node.type]?.frames?.[port]) return CLOSES
      const l = lemmas[node.type]
      if (l) return l.ports[Number(port.slice(1))]
      return RULE_TEXT[node.type]?.ports?.[port] ?? ''
    },
    family: (node) => (node.type === 'goal' ? 'end' : node.type === 'premise' ? 'given' : familyOf(lemmas, node.type)),
    icon: (node) => (node.type === 'goal' ? Flag : node.type === 'premise' ? ArrowRightFromLine : iconOf(lemmas, node.type)),
    // A box gives its conclusion, and inside each region the assumption it makes.
    outputs: (node) => {
      const outs = RULE_TEXT[node.type]?.outs
      if (outs) return Object.entries(outs).map(([key, [label, short]]) => ({ key, label, short }))
      const opens = (parts[node.type]?.frames?.(node) ?? []).filter((r) => r.opens)
      return opens.length ? [{ key: null, label: GIVES, short: GIVES }, ...opens.map((r) => ({ key: r.name, label: OPENS, short: OPENS }))] : null
    },
    cardWidth: (node) => (parts[node.type]?.frames ? 240 : FIXED[node.type] ? 170 : 160),
    frames: (node) => (parts[node.type]?.frames?.(node) ?? []).map((r) => ({ ...r, label: RULE_TEXT[node.type]?.frames?.[r.name] ?? r.name })),
    rules: parts,
  }
}

