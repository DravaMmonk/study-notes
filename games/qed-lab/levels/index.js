// 《证明完毕》试做's levels as one course (kit/domains/logic/course.js): the eras, every level, and the lemmas the
// player proves along the way. The sentences are the main course's (../../qed/levels/words.js).
import { logicCourse } from '../../kit/domains/logic/course.js'
import { WORDS } from '../../qed/levels/words.js'
import { ERAS } from './eras.js'
import { ground } from './ground.js'

const T = (zh, en) => ({ zh, en })

// The lemmas the player proves; a part is a pattern, so its description and ports use letters.
export const LEMMAS = {
  K: { name: T('K', 'K'), desc: T('卡片上选 A 和 B，直接给出 A → (B → A)：已经成立的事，加上什么条件都还成立。', 'Choose A and B on the card; it gives A → (B → A) at once: what holds still holds under any condition.'), statement: 'A → (B → A)', metas: ['A', 'B'], ports: [] },
  S: { name: T('S', 'S'), desc: T('卡片上选 A、B、C，直接给出 (A → (B → C)) → ((A → B) → (A → C))：在条件 A 下也能套用。', 'Choose A, B and C on the card; it gives (A → (B → C)) → ((A → B) → (A → C)) at once: Apply works under a condition A too.'), statement: '(A → (B → C)) → ((A → B) → (A → C))', metas: ['A', 'B', 'C'], ports: [] },
}

export const LOGIC = logicCourse({
  eras: ERAS,
  levels: ground,
  words: WORDS,
  lemmas: LEMMAS,
  primitives: ['app', 'impI'],
})
