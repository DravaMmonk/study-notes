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
  id: { name: T('恒等', 'Identity'), desc: T('卡片上选一句 A，直接给出 A → A。', 'Choose a sentence A on the card; it gives A → A at once.'), statement: 'A → A', metas: ['A'], ports: [] },
  chain: { name: T('串联', 'Chain'), desc: T('接进 A → B 和 B → C，直接给出 A → C。', 'Wire in A → B and B → C; it gives A → C at once.'), statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'], ports: ['A → B', 'B → C'] },
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
