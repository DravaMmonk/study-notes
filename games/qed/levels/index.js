// 《证明完毕》's levels as one course (kit/domains/logic/course.js): the eras, every level, and the lemmas the player
// proves along the way.
import { logicCourse } from '../../kit/domains/logic/course.js'
import { ERAS } from './eras.js'
import { era0 } from './era0.js'
import { era1 } from './era1.js'
import { era2 } from './era2.js'
import { WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })

// The lemmas the player proves, with what their cards say in words (their statements are schemas, never shown).
export const LEMMAS = {
  id: { name: T('恒等', 'Identity'), desc: T('卡片上选一句话，直接给出「如果它，那么它」。', 'Choose a sentence on the card; it gives “if it, then it” at once.'), statement: 'A → A', metas: ['A'], ports: [] },
  chain: { name: T('串联', 'Chain'), desc: T('接进两段首尾相接的「如果…那么…」，直接给出从头到尾的那一段。', 'Wire in two “if … then …”s that meet end to end; it gives the one from start to finish at once.'), statement: 'A → C', premises: ['A → B', 'B → C'], metas: ['A', 'B', 'C'], ports: [T('前一段', 'first'), T('后一段', 'second')] },
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
