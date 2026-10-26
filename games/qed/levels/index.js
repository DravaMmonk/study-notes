// 《证明完毕》's levels as one course (kit/domains/logic/course.js): the eras, every level, and the lemmas the player
// proves along the way.
import { logicCourse } from '../../kit/domains/logic/course.js'
import { ERAS } from './eras.js'
import { era0 } from './era0.js'
import { era1 } from './era1.js'
import { era2 } from './era2.js'
import { WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })

// The lemmas the player proves; a part is a pattern, so its description and ports use letters.
export const LEMMAS = {
  id: { name: T('恒等', 'Identity'), desc: T('选择命题 A，得到 A → A，无须输入前提。', 'Choose a sentence A on the card; it gives A → A at once.'), statement: 'A → A', metas: ['A'], ports: [] },
  chain: { name: T('串联', 'Chain'), desc: T('由 A → B 和 B → C 推出 A → C，表示蕴含的传递性。', 'Wire in A → B and B → C; it gives A → C at once.'), statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'], ports: ['A → B', 'B → C'] },
  swap: { name: T('交换', 'Swap'), desc: T('由 A → (B → C) 推出 B → (A → C)，交换嵌套条件的顺序。', 'Wire in A → (B → C); it gives B → (A → C): the two conditions swapped.'), statement: 'B → (A → C)', premises: ['A → (B → C)'], metas: ['A', 'B', 'C'], ports: ['A → (B → C)'] },
  merge: { name: T('合并', 'Merge'), desc: T('由 A → (A → B) 推出 A → B，合并重复的条件。', 'Wire in A → (A → B); it gives A → B: a condition stated twice, stated once.'), statement: 'A → B', premises: ['A → (A → B)'], metas: ['A', 'B'], ports: ['A → (A → B)'] },
  mt: { name: T('否定后件', 'Modus tollens'), desc: T('由 A → B 和 ¬B 推出 ¬A：条件命题成立而后件不成立，则前件也不成立。', 'Wire in A → B and ¬B; it gives ¬A: no effect, no cause.'), statement: '¬A', premises: ['A → B', '¬B'], metas: ['A', 'B'], ports: ['A → B', '¬B'] },
  dni: { name: T('双重否定引入', 'Double negation'), desc: T('由 A 推出 ¬¬A；这里只引入双重否定，不提供逆向推理。', 'Wire in A; it gives ¬¬A.'), statement: '¬¬A', premises: ['A'], metas: ['A'], ports: ['A'] },
  dm: { name: T('德摩根律', 'De Morgan'), desc: T('由 ¬(A ∨ B) 推出 ¬A ∧ ¬B，即两个析取项均不成立。', 'Wire in ¬(A ∨ B); it gives ¬A ∧ ¬B: neither holds.'), statement: '¬A ∧ ¬B', premises: ['¬(A ∨ B)'], metas: ['A', 'B'], ports: ['¬(A ∨ B)'] },
  nnlem: { name: T('排中律双重否定', 'Undeniable middle'), desc: T('选择命题 A，得到 ¬¬(A ∨ ¬A)，即排中律的双重否定。', 'Choose a sentence A on the card; it gives ¬¬(A ∨ ¬A) at once.'), statement: '¬¬(A ∨ ¬A)', metas: ['A'], ports: [] },
  lem: { name: T('排中律', 'Excluded middle'), desc: T('选择命题 A，得到 A ∨ ¬A：A 成立或其否定成立。', 'Choose a sentence A on the card; it gives A ∨ ¬A: it holds or it does not.'), statement: 'A ∨ ¬A', metas: ['A'], ports: [] },
}

export const LOGIC = logicCourse({
  eras: ERAS,
  levels: [...era0, ...era1, ...era2],
  words: WORDS,
  lemmas: LEMMAS,
  primitives: ['mp', 'axK', 'axS', 'impI', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'iffE'],
  // Joining and splitting ∧ come together, as one idea.
  concept: { andI: 'and', andE: 'and' },
})
