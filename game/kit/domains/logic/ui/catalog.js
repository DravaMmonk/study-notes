// What the logic domain's parts are called and how they look on a board (《证明完毕》): each rule's name, what it does
// and its ports, written with letters for any sentence (a part is a pattern), the settings on its
// card and a box's regions, and the editor's description of a node (../../../circuit/model.js parts, frames.js).
import { ArrowRightFromLine, Box, Flag, GitFork, Puzzle, Split } from 'lucide-react'
import { RULES, rulesOf } from '../proof.js'

const T = (zh, en) => ({ zh, en })

/** Every rule: name, what it does, port labels, setting labels and the regions of a box (`frames`). */
export const RULE_TEXT = {
  mp: { name: T('套用', 'Apply'), desc: T('由 A → B 和 A 得到 B：接进一句「若…，则…」和它的前一半，得到后一半。', 'From A → B and A, B: wire in an “if …, then …” and its “if” part; out comes the “then” part.'), ports: { imp: 'A → B', a: 'A' } },
  impI: { name: T('假设框', 'Assumption box'), desc: T('框里假设 A、证出 B，框外得到 A → B。', 'Assume A inside the box and prove B; outside you get A → B.'), params: { A: T('假设', 'Assume') }, frames: { body: T('框里', 'Inside') } },
  andI: { name: T('拼成 ∧', 'Join ∧'), desc: T('由 A 和 B 得到 A ∧ B。', 'From A and B, A ∧ B.'), ports: { a: 'A', b: 'B' } },
  andE: { name: T('拆开 ∧', 'Split ∧'), desc: T('由 A ∧ B 得到 A，也得到 B。A ↔ B 就是 (A → B) ∧ (B → A)，也能这样拆。', 'From A ∧ B, A, and also B. A ↔ B is (A → B) ∧ (B → A), and splits the same way.'), ports: { ab: 'A ∧ B' }, outs: { left: ['A', 'A'], right: ['B', 'B'] } },
  orI: { name: T('引入 ∨', 'Bring in ∨'), desc: T('由 A 得到 A ∨ B（或 B ∨ A），另一边 B 和放在哪边在卡片上选。', 'From A, A ∨ B (or B ∨ A); choose B and its side on the card.'), ports: { a: 'A' }, params: { other: T('另一边', 'Other side') } },
  orE: { name: T('分情况', 'Case by case'), desc: T('一块有两个框的元件。输入口接 A ∨ B；「情况一」的框假设 A，「情况二」的框假设 B。两个框都证出同一句 C、接到各自的「结论」，卡片就输出 C：不知道是哪一种，就每一种都证一遍。', 'A part with two boxes. Wire A ∨ B into its input; the box Case one assumes A, the box Case two assumes B. When both prove the same C, wired to their own “Conclusion”, the card gives C: not knowing which case it is, prove it in each.'), ports: { ab: 'A ∨ B' }, frames: { left: T('情况一', 'Case one'), right: T('情况二', 'Case two') } },
  botE: { name: T('矛盾推出一切', 'From contradiction'), desc: T('由矛盾 ⊥ 得到卡片上选的任何一句。', 'From the contradiction ⊥, whatever is chosen on the card.'), ports: { bot: '⊥' }, params: { C: T('得出', 'Conclude') } },
  raa: { name: T('反证法', 'By contradiction'), desc: T('由 ¬¬A 得到 A。', 'From ¬¬A, A.'), ports: { nna: '¬¬A' } },
  allI: { name: T('任取', 'For any'), desc: T('一个框：框里的 x 是随便取的一样东西（卡片上给它起名，不能出现在还开着的假设里）。框里证出 P(x)，框外得 ∀x. P(x)。', 'A box: inside it x is any thing at all (named on the card, and in no hypothesis still open). Prove P(x) inside; outside you get ∀x. P(x).'), params: { x: T('变量', 'Variable') }, frames: { body: T('框里', 'Inside') } },
  allE: { name: T('取一个', 'Take one'), desc: T('接进 ∀x. P(x)，在卡片上选一样东西 t，得到 P(t)。', 'Wire in ∀x. P(x) and choose a thing t on the card; out comes P(t).'), ports: { all: '∀x. P(x)' }, params: { t: T('项', 'Term') } },
  exI: { name: T('举例', 'Example'), desc: T('接进 P(t)，卡片上选好要得出的 ∃x. P(x) 和例子 t，就得到它。', 'Wire in P(t), choose on the card the ∃x. P(x) to conclude and the example t; out it comes.'), ports: { a: 'P(t)' }, params: { target: T('要得出', 'Conclude'), t: T('项', 'Term') } },
  exE: { name: T('拿出那一个', 'Take the one there is'), desc: T('接进 ∃x. P(x)：框里那一样东西叫 y（卡片上起名），假设 P(y) 证出 C，框外就得 C。C 里不能有 y。', 'Wire in ∃x. P(x): inside the box that thing is y (named on the card); assuming P(y) proves C, and outside you get C. C may not mention y.'), ports: { ex: '∃x. P(x)' }, params: { x: T('见证', 'Witness') }, frames: { body: T('框里', 'Inside') } },
  refl: { name: T('自反', 'Reflexivity'), desc: T('卡片上选一样东西 t，直接给出 t = t。', 'Choose a thing t on the card; it gives t = t at once.'), params: { t: T('项', 'Term') } },
  rewrite: { name: T('等量代换', 'Rewrite'), desc: T('接进 s = t 和一句提到 s 的话；卡片上的样式里 □ 标出要换的地方，那里的 s 换成 t。', 'Wire in s = t and a sentence about s; the card’s pattern marks with □ where s is to be replaced by t.'), ports: { eq: 's = t', p: 'φ(s)' }, params: { pattern: T('样式', 'Pattern') } },
  res: { name: T('归结', 'Resolve'), desc: T('接进两条子句：一条里有 A，另一条里有 ¬A，消掉这一对，剩下的用「或」连起来；什么都不剩就是矛盾 ⊥。一次只消一对。', 'Wire in two clauses, one holding A and the other ¬A: cancel that pair and join what is left with or; nothing left is the contradiction ⊥. One pair at a time.'), ports: { a: 'A ∨ B', b: '¬A ∨ C' } },
}

/** The machine board's parts (../machine.js): name, what each does, and the regions of a frame. */
export const MACHINE_TEXT = {
  dneg: { name: T('双重否定', 'Double negation'), desc: T('把公式里每一处 ¬¬A 都换成 A，换到一处都不剩。', 'Turns every ¬¬A in the formula into A, until none is left.') },
  impOr: { name: T('箭头化或', 'Arrows to or'), desc: T('把每一处 A → B 换成 ¬A ∨ B，每一处 A ↔ B 换成 (¬A ∨ B) ∧ (¬B ∨ A)。', 'Turns every A → B into ¬A ∨ B, and every A ↔ B into (¬A ∨ B) ∧ (¬B ∨ A).') },
  dm: { name: T('德摩根', 'De Morgan'), desc: T('把每一处 ¬(A ∧ B) 换成 ¬A ∨ ¬B，每一处 ¬(A ∨ B) 换成 ¬A ∧ ¬B，换到一处都不剩。', 'Turns every ¬(A ∧ B) into ¬A ∨ ¬B and every ¬(A ∨ B) into ¬A ∧ ¬B, until none is left.') },
  dist: { name: T('分配', 'Distribute'), desc: T('把每一处 A ∨ (B ∧ C) 换成 (A ∨ B) ∧ (A ∨ C)（∧ 在左边也一样），换到一处都不剩。', 'Turns every A ∨ (B ∧ C) into (A ∨ B) ∧ (A ∨ C) (with the ∧ on the left too), until none is left.') },
  nnf: { name: T('化否定范式', 'To NNF'), desc: T('把公式改成和它等价、没有 → 和 ↔、¬ 只在字母上的样子。', 'Rewrites a formula into an equivalent one with no → or ↔ and ¬ only on letters.') },
  cnf: { name: T('化合取范式', 'To CNF'), desc: T('把公式改成和它等价的合取范式：几串「或」，用「与」连起来。', 'Rewrites a formula into an equivalent CNF: ors, joined by ands.') },
  neg: { name: T('否定', 'Negate'), desc: T('在接进来的公式前面加一个 ¬。', 'Puts a ¬ in front of the formula wired in.') },
  conj: { name: T('并起来', 'Join'), desc: T('把接进来的两句用 ∧ 连成一句。', 'Joins the two formulas wired in with ∧.'), ports: { a: 'A', b: 'B' } },
  toClauses: { name: T('拆成子句', 'Into clauses'), desc: T('把一句合取范式拆开：每一串「或」是一条子句。', 'Splits a CNF formula: each or-chain is one clause.') },
  res: { name: T('归结', 'Resolve'), desc: T('子句集里每一对能消的子句都归结一次，新得到的子句加进来；永真的子句不要。', 'Resolves every pair of clauses in the set that cancels, and adds the new clauses; tautologies are dropped.') },
  repeat: { name: T('重复框', 'Repeat frame'), desc: T('框开出它收到的东西，框里接出新的东西送回「结果」；框把结果再送进去，一圈一圈地做，直到不再变化（或推出 ⊥），送出最后一圈的结果。', 'The frame opens with what it receives; what is made inside goes back into “result”; the frame feeds it in again, round after round, until it stops changing (or ⊥ appears), and gives the last round.'), frames: { body: T('每一圈', 'Each round') } },
  saturate: { name: T('饱和器', 'Saturator'), desc: T('一直归结，直到推出 ⊥，或者再也推不出新子句。', 'Keeps resolving until ⊥ appears or no new clause does.') },
}

const FIXED = { premise: 'source', goal: 'sink' }
// What a box's region gives at its left edge, and what goes into the dot at its right.
const OPENS = T('假设', 'Assume')
const CLOSES = T('结论', 'Conclusion')
const GIVES = T('得出', 'Result')

// What a setting picks, when not a sentence: a term (a name or a variable), a new variable, or a rewrite's pattern.
const KINDS = { allI: { x: 'var' }, exE: { x: 'var' }, allE: { t: 'term' }, exI: { t: 'term' }, refl: { t: 'term' }, rewrite: { pattern: 'pattern' } }

/**
 * The card's settings: [{ key, label, kind }] (orI's side is a switch of its own); a lemma may name its own (`params`).
 * kind: 'formula' (a sentence), 'term', 'var' or 'pattern'.
 */
export const settingsOf = (parts, type, lemmas = {}) => (parts[type]?.params ?? []).map((key) => ({ key, label: lemmas[type]?.params?.[key] ?? RULE_TEXT[type]?.params?.[key] ?? key, kind: KINDS[type]?.[key] ?? 'formula' }))

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

