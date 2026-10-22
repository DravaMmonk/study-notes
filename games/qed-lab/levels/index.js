// 《证明完毕》试做's levels as one course (kit/domains/logic/course.js): the eras, every level, and the lemmas the
// player proves along the way. The sentences are the main course's (../../qed/levels/words.js).
import { logicCourse } from '../../kit/domains/logic/course.js'
import { WORDS } from '../../qed/levels/words.js'
import { ERAS } from './eras.js'
import { ground } from './ground.js'
import { connectives } from './connectives.js'

const T = (zh, en) => ({ zh, en })

// The lemmas the player proves; a part is a pattern, so its description and ports use letters.
export const LEMMAS = {
  K: { name: T('K', 'K'), desc: T('卡片上选 A 和 B，直接给出 A → (B → A)：已经成立的事，加上什么条件都还成立。', 'Choose A and B on the card; it gives A → (B → A) at once: what holds still holds under any condition.'), statement: 'A → (B → A)', metas: ['A', 'B'], ports: [] },
  S: { name: T('S', 'S'), desc: T('卡片上选 A、B、C，直接给出 (A → (B → C)) → ((A → B) → (A → C))：在条件 A 下也能套用。', 'Choose A, B and C on the card; it gives (A → (B → C)) → ((A → B) → (A → C)) at once: Apply works under a condition A too.'), statement: '(A → (B → C)) → ((A → B) → (A → C))', metas: ['A', 'B', 'C'], ports: [] },
  chain: { name: T('串联', 'Chain'), desc: T('接进 A → B 和 B → C，直接给出 A → C。', 'Wire in A → B and B → C; it gives A → C at once.'), statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'], ports: ['A → B', 'B → C'] },
  fst: { name: T('拆出左边', 'Take the left'), desc: T('接进 A ∧ B，给出 A。', 'Wire in A ∧ B; it gives A.'), statement: 'A', premises: ['A ∧ B'], metas: ['A', 'B'], ports: ['A ∧ B'] },
}

export const LOGIC = logicCourse({
  eras: ERAS,
  levels: [...ground, ...connectives],
  words: WORDS,
  lemmas: LEMMAS,
  primitives: ['app', 'impI', 'andIn0', 'andCases', 'orIn0', 'orIn1', 'orCases', 'botCases'],
  // The ways to make ∨ are one idea.
  concept: { orIn0: 'orIn', orIn1: 'orIn' },
})
