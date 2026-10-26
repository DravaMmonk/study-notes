// What the logic domain's parts are called and how they look on a board (《证明完毕》): each rule's name, what it does
// and its ports, written with letters for any sentence (a part is a pattern), the settings on its
// card and a box's regions, and the editor's description of a node (../../../circuit/model.js parts, frames.js).
import { ArrowRightFromLine, Box, Flag, GitFork, Puzzle, Sigma, Split } from 'lucide-react'
import { RULES, rulesOf } from '../proof.js'

const T = (zh, en) => ({ zh, en })

/** Every rule: name, what it does, port labels, setting labels and the regions of a box (`frames`). */
export const RULE_TEXT = {
  mp: { name: T('分离规则', 'Detach'), desc: T('由 A → B 和 A 推出 B，也称肯定前件式。A 是条件命题的前件，B 是后件。', 'From A → B and A, B: wire in an “if …, then …” and its “if” part; out comes the “then” part.'), ports: { imp: 'A → B', a: 'A' } },
  axK: { name: T('公理 K', 'Axiom K'), desc: T('A → (B → A)：已成立的命题 A，在附加条件 B 后仍然成立。在卡片上选择 A、B，得到公理模式 K 的一个实例。', 'A → (B → A): what holds still holds under any condition. Choose the first sentence A and the second B on the card.'), params: { A: T('命题 A', 'First'), B: T('命题 B', 'Second') } },
  axS: { name: T('公理 S', 'Axiom S'), desc: T('(A → (B → C)) → ((A → B) → (A → C))：在共同条件 A 下组合分离推理。在卡片上选择 A、B、C，得到一个公理实例。', '(A → (B → C)) → ((A → B) → (A → C)): Detach works under a condition A too. Choose A, B and C on the card.'), params: { A: T('命题 A', 'First'), B: T('命题 B', 'Second'), C: T('命题 C', 'Third') } },
  impI: { name: T('假设框', 'Assumption box'), desc: T('蕴含引入：在临时假设 A 下推出 B，解除该假设后得到 A → B，其他前提仍然保留。', 'Assume A inside the box and prove B; outside you get A → B.'), params: { A: T('假设', 'Assume') }, frames: { body: T('框内', 'Inside') } },
  andI: { name: T('合取引入 ∧', 'Join ∧'), desc: T('由 A 和 B 得到 A ∧ B。', 'From A and B, A ∧ B.'), ports: { a: 'A', b: 'B' } },
  andE: { name: T('合取消去 ∧', 'Split ∧'), desc: T('由 A ∧ B 得到 A，也得到 B。', 'From A ∧ B, A, and also B.'), ports: { ab: 'A ∧ B' }, outs: { left: ['A', 'A'], right: ['B', 'B'] } },
  orI: { name: T('析取引入 ∨', 'Bring in ∨'), desc: T('由 A 推出 A ∨ B 或 B ∨ A。在卡片上选择新增的析取项 B 及其位置。', 'From A, A ∨ B (or B ∨ A); choose B and its side on the card.'), ports: { a: 'A' }, params: { other: T('新增析取项', 'Other side') } },
  orE: { name: T('析取消去 ∨', 'Case by case'), desc: T('分类讨论：由 A ∨ B 出发，在假设 A 和假设 B 的两个分支中分别推出 C，解除分支假设后得到 C。', 'Wire in A ∨ B: if assuming A proves C and assuming B proves C, then C.'), ports: { ab: 'A ∨ B' }, frames: { left: T('情况一', 'Case one'), right: T('情况二', 'Case two') } },
  botE: { name: T('矛盾消去 ⊥', 'From contradiction'), desc: T('由矛盾 ⊥ 推出任意命题，也称爆炸原理。在卡片上选择目标命题。', 'From the contradiction ⊥, whatever is chosen on the card.'), ports: { bot: '⊥' }, params: { C: T('目标命题', 'Conclude') } },
  raa: { name: T('双重否定消去', 'By contradiction'), desc: T('由 ¬¬A 推出 A。这是一条经典规则；结合否定引入，可以实现反证法。', 'From ¬¬A, A.'), ports: { nna: '¬¬A' } },
  iffE: { name: T('双条件消去 ↔', 'Split ↔'), desc: T('由 A ↔ B 得到 A → B，也得到 B → A。', 'From A ↔ B, A → B, and also B → A.'), ports: { iff: 'A ↔ B' }, outs: { ltr: ['A → B', '→'], rtl: ['B → A', '←'] } },
  allI: { name: T('全称引入 ∀', 'For any'), desc: T('对任意变量 x 证明 P(x)，得到 ∀x. P(x)。x 不能自由出现于结论仍依赖的任何假设中。', 'Prove P(x) inside the box for a new variable x; outside you get ∀x. P(x).'), params: { x: T('变量', 'Variable') }, frames: { body: T('框内', 'Inside') } },
  allE: { name: T('全称消去 ∀', 'Instantiate'), desc: T('由 ∀x. P(x)，用项 t 代入 x，得到 P(t)。', 'From ∀x. P(x), P(t).'), ports: { all: '∀x. P(x)' }, params: { t: T('项', 'Term') } },
  exI: { name: T('存在引入 ∃', 'Example'), desc: T('由一个见证项 t 的性质 P(t)，推出 ∃x. P(x)。', 'From P(t), ∃x. P(x).'), ports: { a: 'P(t)' }, params: { target: T('目标命题', 'Conclude'), t: T('项', 'Term') } },
  exE: { name: T('存在消去 ∃', 'Take one'), desc: T('由 ∃x. P(x)，临时假设 P(y) 并推出 C。y 不能自由出现于 C 或其他未解除的假设中；解除 P(y) 后得到 C。', 'Wire in ∃x. P(x); if assuming P(y) proves C inside the box, then C.'), ports: { ex: '∃x. P(x)' }, params: { x: T('见证变量', 'Witness') }, frames: { body: T('框内', 'Inside') } },
  refl: { name: T('等式自反性', 'Reflexivity'), desc: T('任意项 t 都满足 t = t。', 't = t.'), params: { t: T('项', 'Term') } },
  rewrite: { name: T('等式代换', 'Rewrite'), desc: T('由 s = t 和 φ(s)，将指定位置的 s 替换为 t，得到 φ(t)。', 'From s = t and φ(s), φ(t).'), ports: { eq: 's = t', p: 'φ(s)' }, params: { pattern: T('公式模式', 'Pattern') } },
}

const FIXED = { premise: 'source', goal: 'sink' }
// What a box's region gives at its left edge, and what goes into the dot at its right.
const OPENS = T('假设', 'Assume')
const CLOSES = T('结论', 'Conclusion')
const GIVES = T('得出', 'Result')

/** The card's settings: [{ key, label }] (orI's side is a switch of its own). */
export const settingsOf = (parts, type) => (parts[type]?.params ?? []).map((key) => ({ key, label: RULE_TEXT[type]?.params?.[key] ?? key }))

/** A rule's or lemma's name and what it does. */
export const nameOf = (lemmas, type) => lemmas[type]?.name ?? RULE_TEXT[type]?.name ?? type
export const descOf = (lemmas, type) => lemmas[type]?.desc ?? RULE_TEXT[type]?.desc
export const familyOf = (lemmas, type) => (lemmas[type] ? 'lemma' : RULES[type]?.frames ? 'box' : type === 'axK' || type === 'axS' ? 'axiom' : 'rule')
const ICONS = { lemma: Puzzle, box: Box, axiom: Sigma, rule: GitFork }
export const iconOf = (lemmas, type) => ICONS[familyOf(lemmas, type)] ?? Split

/** The editor's description of a proof's nodes (model.js), for a level's lemmas and premise names (in order). */
export function partsFor(lemmas = {}, premises = []) {
  const parts = rulesOf(lemmas)
  return {
    inputs: (node) => (FIXED[node.type] ? (FIXED[node.type] === 'sink' ? ['in'] : []) : parts[node.type]?.inputs ?? []),
    role: (node) => (FIXED[node.type] ? FIXED[node.type] : 'part'),
    label: (node) => {
      if (node.type === 'goal') return T('目标', 'Goal')
      if (node.type === 'premise') return premises.length > 1 ? T(`前提 ${premises.indexOf(node.params.name) + 1}`, `Given ${premises.indexOf(node.params.name) + 1}`) : T('前提', 'Given')
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

