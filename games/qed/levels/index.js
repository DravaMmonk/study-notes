// 《证明完毕》's levels as one course (kit/domains/logic/course.js): the eras, every level, and the lemmas the player
// proves along the way.
import { logicCourse } from '../../kit/domains/logic/course.js'
import { ERAS } from './eras.js'
import { era0 } from './era0.js'
import { era1 } from './era1.js'
import { era2 } from './era2.js'

const T = (zh, en) => ({ zh, en })

export const LEMMAS = {
  id: { name: T('恒等', 'Identity'), desc: T('卡片上填 A，给出 A → A。', 'Fill in A on the card; it gives A → A.'), statement: 'A → A', metas: ['A'] },
  chain: { name: T('串联', 'Chain'), desc: T('接进 A → B 和 B → C，给出 A → C。', 'Wire in A → B and B → C; it gives A → C.'), statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'] },
}

export const LOGIC = logicCourse({
  eras: ERAS,
  levels: [...era0, ...era1, ...era2],
  lemmas: LEMMAS,
  primitives: ['mp', 'axK', 'axS', 'impI', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'iffE'],
  // Joining and splitting ∧ come together, as one idea.
  concept: { andI: 'and', andE: 'and' },
})
