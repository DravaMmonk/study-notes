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
import { WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })

// The lemmas the player proves; a part is a pattern, so its description and ports use letters.
export const LEMMAS = {
  axK: { name: T('K', 'K'), desc: T('卡片上选两句 A、B，直接给出 A → (B → A)：已经成立的事，加上什么条件都还成立。', 'Choose two sentences A and B on the card; it gives A → (B → A) at once: what holds still holds under any condition.'), statement: 'A → (B → A)', metas: ['A', 'B'], ports: [], params: { A: T('第一句', 'First'), B: T('第二句', 'Second') } },
  axS: { name: T('S', 'S'), desc: T('卡片上选三句 A、B、C，直接给出 (A → (B → C)) → ((A → B) → (A → C))：在条件 A 下也能套用。', 'Choose three sentences A, B and C on the card; it gives (A → (B → C)) → ((A → B) → (A → C)) at once: Apply works under a condition A too.'), statement: '(A → (B → C)) → ((A → B) → (A → C))', metas: ['A', 'B', 'C'], ports: [], params: { A: T('第一句', 'First'), B: T('第二句', 'Second'), C: T('第三句', 'Third') } },
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
  nnlem: { name: T('排中不可否定', 'Undeniable middle'), desc: T('卡片上选一句 A，直接给出 ¬¬(A ∨ ¬A)。', 'Choose a sentence A on the card; it gives ¬¬(A ∨ ¬A) at once.'), statement: '¬¬(A ∨ ¬A)', metas: ['A'], ports: [] },
  lem: { name: T('排中律', 'Excluded middle'), desc: T('卡片上选一句 A，直接给出 A ∨ ¬A：要么成立，要么不成立。', 'Choose a sentence A on the card; it gives A ∨ ¬A: it holds or it does not.'), statement: 'A ∨ ¬A', metas: ['A'], ports: [] },
}

// How parts' descriptions grow as the course goes on: from the level `at` on, the description reads this way.
const REVISIONS = {
  // De Morgan grows a shape with each law proved; its card switches between the shapes it has.
  dm: [
    { by: 'dmBack', forms: ['andNot'], desc: T('德摩根律：否定穿过「或者」，变成两个否定的「并且」，反过来也行。卡片上切换形状：¬(A ∨ B) 和 ¬A ∧ ¬B 互相转换。', 'De Morgan’s law: a negation passing through “or” becomes an “and” of two negations, and back. Switch the shape on the card: ¬(A ∨ B) and ¬A ∧ ¬B each give the other.') },
    { by: 'dmOr', forms: ['orNot'], desc: T('德摩根律：否定穿过「或者」「并且」时互相转换。卡片上切换形状：¬(A ∨ B) 和 ¬A ∧ ¬B 互相转换；¬A ∨ ¬B 给出 ¬(A ∧ B)。', 'De Morgan’s law: a negation passing through “or” and “and” turns one into the other. Switch the shape on the card: ¬(A ∨ B) and ¬A ∧ ¬B each give the other; ¬A ∨ ¬B gives ¬(A ∧ B).') },
    { by: 'dmAnd', forms: ['notAnd'], desc: T('德摩根律：否定穿过「或者」「并且」时互相转换，四个方向都有了。卡片上切换形状。', 'De Morgan’s law: a negation passing through “or” and “and” turns one into the other, all four ways now. Switch the shape on the card.') },
    { by: 'q-notEx', forms: ['notEx', 'allNot'], desc: T('德摩根律：否定穿过「或者」「并且」时互相转换；穿过量词也一样，¬∃ 和 ∀¬ 互相转换（∃ 像一个很长的「或者」，∀ 像一个很长的「并且」）。卡片上切换形状。', 'De Morgan’s law: a negation passing through “or” and “and” turns one into the other; through a quantifier too, ¬∃ and ∀¬ each give the other (∃ is like a long “or”, ∀ a long “and”). Switch the shape on the card.') },
    { by: 'q-exNot', forms: ['exNot'], desc: T('德摩根律：否定穿过「或者」「并且」时互相转换；穿过量词也一样：¬∃ 和 ∀¬ 互相转换，∃¬ 给出 ¬∀。卡片上切换形状。', 'De Morgan’s law: a negation passing through “or” and “and” turns one into the other; through a quantifier too: ¬∃ and ∀¬ each give the other, and ∃¬ gives ¬∀. Switch the shape on the card.') },
    { by: 'q-notAll', forms: ['notAll'], desc: T('德摩根律：否定穿过「或者」「并且」「存在」「对所有」时互相转换，八个方向都有了。卡片上切换形状。', 'De Morgan’s law: a negation passing through “or”, “and”, “there is” and “for all” turns one into the other, all eight ways now. Switch the shape on the card.') },
  ],
  // 矛盾 brings in ¬A as A → ⊥, so Apply takes ¬A and A to ⊥.
  mp: [{ at: 'bot', desc: T('由 A → B 和 A 得到 B：接进一句「若…，则…」和它的前一半，得到后一半。¬A 也可以写作 A → ⊥，所以接进 ¬A 和 A，就得到矛盾 ⊥。', 'From A → B and A, B: wire in an “if …, then …” and its “if” part; out comes the “then” part. ¬A can be written A → ⊥, so wire in ¬A and A and out comes the contradiction ⊥.') }],
  // ↔ comes into proofs on the main path with 两个方向: Split ∧ takes it apart.
  andE: [{ at: 'iffUse', desc: T('由 A ∧ B 得到 A，也得到 B。A ↔ B 就是 (A → B) ∧ (B → A)，也能这样拆。', 'From A ∧ B, A, and also B. A ↔ B is (A → B) ∧ (B → A), and splits the same way.') }],
}

export const LOGIC = logicCourse({
  eras: ERAS,
  levels: [...era0, ...circuits, ...era1, ...era2, ...quantifiers, ...rules, ...terms],
  words: WORDS,
  lemmas: LEMMAS,
  gates: GATES,
  // The machine-board parts the player builds: law cards, normal forms, resolution and the saturator.
  revisions: REVISIONS,
  machines: [],
  primitives: ['gNot', 'gAnd', 'mp', 'impI', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'allE', 'allI', 'exI', 'exE', 'rewrite', 'refl', 'normalize', 'exact'],
  // Joining and splitting ∧ come together, as one idea; so do rewrite and reflexivity.
  concept: { andI: 'and', andE: 'and', rewrite: 'eq', refl: 'eq' },
})
