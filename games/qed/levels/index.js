// 《证明完毕》's levels as one course (kit/domains/logic/course.js): the eras, every level, and the lemmas the player
// proves along the way.
import { logicCourse } from '../../kit/domains/logic/course.js'
import { ERAS } from './eras.js'
import { era0 } from './era0.js'
import { circuits, GATES } from './circuits.js'
import { era1 } from './era1.js'
import { era2 } from './era2.js'
import { resolution } from './resolution.js'
import { quantifiers } from './quantifiers.js'
import { rules } from './rules.js'
import { unification } from './unification.js'
import { tactics } from './tactics.js'
import { WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })

// The lemmas the player proves; a part is a pattern, so its description and ports use letters.
export const LEMMAS = {
  axK: { name: T('K', 'K'), desc: T('卡片上选两句 A、B，直接给出 A → (B → A)：已经成立的事，加上什么条件都还成立。', 'Choose two sentences A and B on the card; it gives A → (B → A) at once: what holds still holds under any condition.'), statement: 'A → (B → A)', metas: ['A', 'B'], ports: [], params: { A: T('第一句', 'First'), B: T('第二句', 'Second') } },
  axS: { name: T('S', 'S'), desc: T('卡片上选三句 A、B、C，直接给出 (A → (B → C)) → ((A → B) → (A → C))：在条件 A 下也能套用。', 'Choose three sentences A, B and C on the card; it gives (A → (B → C)) → ((A → B) → (A → C)) at once: Apply works under a condition A too.'), statement: '(A → (B → C)) → ((A → B) → (A → C))', metas: ['A', 'B', 'C'], ports: [], params: { A: T('第一句', 'First'), B: T('第二句', 'Second'), C: T('第三句', 'Third') } },
  chain: { name: T('串联', 'Chain'), desc: T('接进 A → B 和 B → C，直接给出 A → C。', 'Wire in A → B and B → C; it gives A → C at once.'), statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'], ports: ['A → B', 'B → C'] },
  swap: { name: T('交换', 'Swap'), desc: T('接进 A → (B → C)，给出 B → (A → C)：两个条件换个顺序。', 'Wire in A → (B → C); it gives B → (A → C): the two conditions swapped.'), statement: 'B → (A → C)', premises: ['A → (B → C)'], metas: ['A', 'B', 'C'], ports: ['A → (B → C)'] },
  merge: { name: T('合并', 'Merge'), desc: T('接进 A → (A → B)，给出 A → B：说了两遍的条件并成一遍。', 'Wire in A → (A → B); it gives A → B: a condition stated twice, stated once.'), statement: 'A → B', premises: ['A → (A → B)'], metas: ['A', 'B'], ports: ['A → (A → B)'] },
  dm: { name: T('德摩根', 'De Morgan'), desc: T('接进 ¬(A ∨ B)，给出 ¬A ∧ ¬B：两个都不成立。', 'Wire in ¬(A ∨ B); it gives ¬A ∧ ¬B: neither holds.'), statement: '¬A ∧ ¬B', premises: ['¬(A ∨ B)'], metas: ['A', 'B'], ports: ['¬(A ∨ B)'] },
  nnlem: { name: T('排中不可否定', 'Undeniable middle'), desc: T('卡片上选一句 A，直接给出 ¬¬(A ∨ ¬A)。', 'Choose a sentence A on the card; it gives ¬¬(A ∨ ¬A) at once.'), statement: '¬¬(A ∨ ¬A)', metas: ['A'], ports: [] },
  lem: { name: T('排中律', 'Excluded middle'), desc: T('卡片上选一句 A，直接给出 A ∨ ¬A：要么成立，要么不成立。', 'Choose a sentence A on the card; it gives A ∨ ¬A: it holds or it does not.'), statement: 'A ∨ ¬A', metas: ['A'], ports: [] },
}

export const LOGIC = logicCourse({
  eras: ERAS,
  levels: [...era0, ...circuits, ...era1, ...era2, ...resolution, ...quantifiers, ...rules, ...unification, ...tactics],
  words: WORDS,
  lemmas: LEMMAS,
  gates: GATES,
  // The machine-board parts the player builds: law cards, normal forms, resolution and the saturator.
  machines: ['dneg', 'impOr', 'dmLaw', 'dist', 'nnf', 'cnf', 'res', 'saturate', 'unifier', 'clauseForm', 'fores', 'auto'],
  primitives: ['gNot', 'gAnd', 'mp', 'impI', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'repeat', 'neg', 'conj', 'toClauses', 'allE', 'allI', 'exI', 'exE', 'rewrite', 'refl', 'uDecompose', 'uDelete', 'uConflict', 'uSwap', 'uEliminate', 'uCheck', 'prenex', 'skolem', 'factor', 'intro', 'assumption', 'elim', 'orElse'],
  // Joining and splitting ∧ come together, as one idea; so do the three cards that set a refutation up.
  concept: { andI: 'and', andE: 'and', neg: 'refute', conj: 'refute', toClauses: 'refute', rewrite: 'eq', refl: 'eq', uDecompose: 'unify', uDelete: 'unify', uConflict: 'unify', uSwap: 'unify', uEliminate: 'unify', uCheck: 'unify', intro: 'tactic', assumption: 'tactic', elim: 'tactic' },
})
