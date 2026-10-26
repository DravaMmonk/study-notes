// 《证明完毕》's levels as one course (kit/domains/logic/course.js): the eras, every level, and the lemmas the player
// proves along the way.
import { logicCourse } from '../../kit/domains/logic/course.js'
import { ERAS } from './eras.js'
import { era0 } from './era0.js'
import { circuits, GATES } from './circuits.js'
import { era1 } from './era1.js'
import { era2 } from './era2.js'
import { quantifiers } from './quantifiers.js'
import { rules } from './rules.js'
import { terms } from './terms.js'
import { metavars } from './metavars.js'
import { strategies } from './strategies.js'
import { WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })

// The lemmas the player proves; a part is a pattern, so its description and ports use letters.
export const LEMMAS = {
  axK: { name: T('K', 'K'), desc: T('元件上选两句 A、B，直接给出 A → (B → A)：已经成立的事，加上什么条件都还成立。', 'Choose two sentences A and B on the part; it gives A → (B → A) at once: what holds still holds under any condition.'), statement: 'A → (B → A)', metas: ['A', 'B'], ports: [], params: { A: T('第一句', 'First'), B: T('第二句', 'Second') } },
  axS: { name: T('S', 'S'), desc: T('元件上选三句 A、B、C，直接给出 (A → (B → C)) → ((A → B) → (A → C))：在条件 A 下也能套用。', 'Choose three sentences A, B and C on the part; it gives (A → (B → C)) → ((A → B) → (A → C)) at once: Apply works under a condition A too.'), statement: '(A → (B → C)) → ((A → B) → (A → C))', metas: ['A', 'B', 'C'], ports: [], params: { A: T('第一句', 'First'), B: T('第二句', 'Second'), C: T('第三句', 'Third') } },
  chain: { name: T('串联', 'Chain'), desc: T('接进 A → B 和 B → C，直接给出 A → C。', 'Wire in A → B and B → C; it gives A → C at once.'), statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'], ports: ['A → B', 'B → C'] },
  swap: { name: T('交换', 'Swap'), desc: T('接进 A → (B → C)，给出 B → (A → C)：两个条件换个顺序。', 'Wire in A → (B → C); it gives B → (A → C): the two conditions swapped.'), statement: 'B → (A → C)', premises: ['A → (B → C)'], metas: ['A', 'B', 'C'], ports: ['A → (B → C)'] },
  merge: { name: T('合并', 'Merge'), desc: T('接进 A → (A → B)，给出 A → B：说了两遍的条件并成一遍。', 'Wire in A → (A → B); it gives A → B: a condition stated twice, stated once.'), statement: 'A → B', premises: ['A → (A → B)'], metas: ['A', 'B'], ports: ['A → (A → B)'] },
  // De Morgan's laws, one card: each shape is earned by the level that proves it (REVISIONS), and switched on the card.
  dm: {
    name: T('德摩根', 'De Morgan'),
    desc: T('接进 ¬(A ∨ B)，给出 ¬A ∧ ¬B：两个都不成立。', 'Wire in ¬(A ∨ B); it gives ¬A ∧ ¬B: neither holds.'),
    metas: ['A', 'B', 'P'],
    forms: [
      { key: 'notOr', label: '¬(A ∨ B) → ¬A ∧ ¬B', statement: '¬A ∧ ¬B', premises: ['¬(A ∨ B)'] },
      { key: 'andNot', label: '¬A ∧ ¬B → ¬(A ∨ B)', statement: '¬(A ∨ B)', premises: ['¬A ∧ ¬B'] },
      { key: 'orNot', label: '¬A ∨ ¬B → ¬(A ∧ B)', statement: '¬(A ∧ B)', premises: ['¬A ∨ ¬B'] },
      { key: 'notAnd', label: '¬(A ∧ B) → ¬A ∨ ¬B', statement: '¬A ∨ ¬B', premises: ['¬(A ∧ B)'] },
      { key: 'notEx', label: '¬∃x. P → ∀x. ¬P', statement: '∀x. ¬P', premises: ['¬∃x. P'] },
      { key: 'allNot', label: '∀x. ¬P → ¬∃x. P', statement: '¬∃x. P', premises: ['∀x. ¬P'] },
      { key: 'exNot', label: '∃x. ¬P → ¬∀x. P', statement: '¬∀x. P', premises: ['∃x. ¬P'] },
      { key: 'notAll', label: '¬∀x. P → ∃x. ¬P', statement: '∃x. ¬P', premises: ['¬∀x. P'] },
    ],
    ports: ['¬(A ∨ B)'],
  },
  nnlem: { name: T('排中不可否定', 'Undeniable middle'), desc: T('元件上选一句 A，直接给出 ¬¬(A ∨ ¬A)。', 'Choose a sentence A on the part; it gives ¬¬(A ∨ ¬A) at once.'), statement: '¬¬(A ∨ ¬A)', metas: ['A'], ports: [] },
  lem: { name: T('排中律', 'Excluded middle'), desc: T('元件上选一句 A，直接给出 A ∨ ¬A：要么成立，要么不成立。', 'Choose a sentence A on the part; it gives A ∨ ¬A: it holds or it does not.'), statement: 'A ∨ ¬A', metas: ['A'], ports: [] },
}

// How parts' descriptions grow as the course goes on: from the level `at` on, the description reads this way.
const REVISIONS = {
  // De Morgan grows a shape with each law proved; its card switches between the shapes it has.
  dm: [
    { by: 'dmBack', forms: ['andNot'], desc: T('德摩根律：否定穿过「或者」，变成两个否定的「并且」，反过来也行。元件上切换形状：¬(A ∨ B) 和 ¬A ∧ ¬B 互相转换。', 'De Morgan’s law: a negation passing through “or” becomes an “and” of two negations, and back. Switch the shape on the part: ¬(A ∨ B) and ¬A ∧ ¬B each give the other.') },
    { by: 'dmOr', forms: ['orNot'], desc: T('德摩根律：否定穿过「或者」「并且」时互相转换。元件上切换形状：¬(A ∨ B) 和 ¬A ∧ ¬B 互相转换；¬A ∨ ¬B 给出 ¬(A ∧ B)。', 'De Morgan’s law: a negation passing through “or” and “and” turns one into the other. Switch the shape on the part: ¬(A ∨ B) and ¬A ∧ ¬B each give the other; ¬A ∨ ¬B gives ¬(A ∧ B).') },
    { by: 'dmAnd', forms: ['notAnd'], desc: T('德摩根律：否定穿过「或者」「并且」时互相转换，四个方向都有了。元件上切换形状。', 'De Morgan’s law: a negation passing through “or” and “and” turns one into the other, all four ways now. Switch the shape on the part.') },
    { by: 'q-notEx', forms: ['notEx', 'allNot'], desc: T('德摩根律：否定穿过「或者」「并且」时互相转换；穿过量词也一样，¬∃ 和 ∀¬ 互相转换（∃ 像一个很长的「或者」，∀ 像一个很长的「并且」）。元件上切换形状。', 'De Morgan’s law: a negation passing through “or” and “and” turns one into the other; through a quantifier too, ¬∃ and ∀¬ each give the other (∃ is like a long “or”, ∀ a long “and”). Switch the shape on the part.') },
    { by: 'q-exNot', forms: ['exNot'], desc: T('德摩根律：否定穿过「或者」「并且」时互相转换；穿过量词也一样：¬∃ 和 ∀¬ 互相转换，∃¬ 给出 ¬∀。元件上切换形状。', 'De Morgan’s law: a negation passing through “or” and “and” turns one into the other; through a quantifier too: ¬∃ and ∀¬ each give the other, and ∃¬ gives ¬∀. Switch the shape on the part.') },
    { by: 'q-notAll', forms: ['notAll'], desc: T('德摩根律：否定穿过「或者」「并且」「存在」「对所有」时互相转换，八个方向都有了。元件上切换形状。', 'De Morgan’s law: a negation passing through “or”, “and”, “there is” and “for all” turns one into the other, all eight ways now. Switch the shape on the part.') },
  ],
  // 矛盾 brings in ¬A as A → ⊥, so Apply takes ¬A and A to ⊥.
  mp: [{ at: 'bot', desc: T('由 A → B 和 A 得到 B：接进一句「若…，则…」和它的前一半，得到后一半。¬A 也可以写作 A → ⊥，所以接进 ¬A 和 A，就得到矛盾 ⊥。', 'From A → B and A, B: wire in an “if …, then …” and its “if” part; out comes the “then” part. ¬A can be written A → ⊥, so wire in ¬A and A and out comes the contradiction ⊥.') }],
  // ↔ comes into proofs on the main path with 两个方向: Split ∧ takes it apart.
  andE: [{ at: 'iffUse', desc: T('由 A ∧ B 得到 A，也得到 B。A ↔ B 就是 (A → B) ∧ (B → A)，也能这样拆。', 'From A ∧ B, A, and also B. A ↔ B is (A → B) ∧ (B → A), and splits the same way.') }],

  // The machine parts grow along chapters 7 and 8: quantifiers taken apart and patterns (做成函数), the kept form of
  // Forward, every result once the cards backtrack (一串结果), rule sets (按形状拆).
  uDecompose: [{ at: 'r-pattern', desc: T('找到一个两边样子相同的等式，拆成各部分对各部分的几个等式。两边都是「对所有」（或都是「存在」）时，拆出两边的身体，让它们用同一个变量，等式前面记上 ⋀x：x 是量词管着的。', 'Finds an equation with the same shape on both sides and splits it into an equation for each pair of parts. When both sides are “for all” (or both “there is”), it takes out the two bodies, with one variable for both, and marks the equation ⋀x: x is bound by a quantifier.') }],
  uCheck: [{ at: 'r-pattern', desc: T('找到一个 ?A ≐ t，?A 不能是 t，就宣布失败：t 里面又有 ?A；或者 t 里有前面 ⋀ 管着的变量（?A 不能把它带出量词）。', 'Finds ?A ≐ t where ?A cannot be t and declares failure: ?A occurs inside t, or t has a variable bound by the ⋀ in front (?A cannot take it out of its quantifier).') }],
  unifier: [{ at: 'r-pattern', desc: T('把一组等式解到底：每个等式左边是一个 ?，右边里没有这些 ?（最一般合一子）；合一不了就宣布失败。?P(x) 这样的等式它不会解，原样留下。', 'Solves a set of equations to the end: each with a ?-letter on the left and none of those letters on any right (the most general unifier); failure if there is none. An equation like ?P(x) it cannot solve, and leaves as it is.') }],
  drule: [{ at: 'r-frule', forms: ['frule'], desc: T('元件上选一条规则：它的第一条前提和一条已知合一，加进规则的结论；元件上切换：那条已知换掉，还是留着（留着就还能再用）。规则剩下的前提各成一个目标，排在前面。', 'Choose a rule on the part: its first premise is unified with a hypothesis, and the rule’s conclusion is added; switch on the part whether that hypothesis is replaced or kept (kept, it can be used again). Each other premise of the rule is a goal, in front.') }],
  repeat: [{ at: 's-results', desc: T('框开出它收到的东西，框里接出新的东西送回「结果」；框把结果再送进去，一圈一圈地做，直到不再变化或者失败（停在失败前的一圈），送出最后一圈的结果。有几种结果时，它只顺着第一种往下做。', 'The frame opens with what it receives; what is made inside goes back into “result”; the frame feeds it in again, round after round, until it stops changing or fails (stopping at the round before), and gives the last round. With several results, it follows only the first.') }],
  rule: [{ at: 's-intro', desc: T('元件上选一条规则，或者一组规则（一组：每一条都试，对上的每一条都是一种结果）。第一个目标和规则的结论合一，换成规则的前提；没对上的 ? 留在目标里。', 'Choose a rule on the part, or a set of rules (a set: each is tried, and each that fits is a result). The first goal is unified with the rule’s conclusion and replaced by its premises; a ?-letter left open stays in the goals.') }],
  assumption: [{ at: 's-results', desc: T('第一个目标和它的一条已知合一：对上了，这个目标就证完了。每一条对上的已知都是一种结果，按从上往下的顺序。', 'The first goal is unified with one of its hypotheses: when one fits, that goal is done. Each hypothesis that fits is a result, in order from the top.') }],
  erule: [{ at: 's-results', desc: T('元件上选一条规则（或一组）：它的结论和第一个目标合一，它的第一条前提和一条已知合一，那条已知用掉；剩下的前提各成一个目标。每一条对上的已知都是一种结果。', 'Choose a rule (or a set) on the part: its conclusion is unified with the first goal and its first premise with a hypothesis, which is used up; each other premise is a goal. Each hypothesis that fits is a result.') }],
}

export const LOGIC = logicCourse({
  eras: ERAS,
  levels: [...era0, ...circuits, ...era1, ...era2, ...quantifiers, ...rules, ...terms, ...metavars, ...strategies],
  words: WORDS,
  lemmas: LEMMAS,
  gates: GATES,
  revisions: REVISIONS,
  // The machine-board parts the player builds: the unifier and auto.
  machines: ['unifier', 'auto'],
  primitives: ['gNot', 'gAnd', 'mp', 'impI', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'allE', 'allI', 'exI', 'exE', 'rewrite', 'refl', 'normalize', 'exact',
    'uDecompose', 'uDelete', 'uConflict', 'uEliminate', 'uSwap', 'uCheck', 'repeat', 'uPattern', 'rule', 'assumption', 'erule', 'drule',
    'orElse', 'each', 'defer', 'append', 'search'],
  // Joining and splitting ∧ come together, as one idea; so do rewrite and reflexivity.
  concept: { andI: 'and', andE: 'and', rewrite: 'eq', refl: 'eq' },
})
