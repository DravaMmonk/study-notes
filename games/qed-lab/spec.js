// 《证明完毕》试做: a trial of the Lean-style route for Q.E.D. on a page of its own, on the logic domain
// (kit/domains/logic). Everything here is the course; the game it makes is game.js.
import { GLOSSARY, GLOSSARY_GROUPS } from './glossary.js'
import { ERAS } from './levels/eras.js'
import { LEMMAS, LOGIC } from './levels/index.js'

export default {
  id: 'qed-lab',
  domain: 'logic',
  title: { zh: '证明完毕 · 试做', en: 'Q.E.D. · Trial' },
  kicker: { zh: '试做 · 从两块元件搭起证明器', en: 'Trial · A prover from two parts' },
  lede: { zh: '证明器的地基只有两块元件：套用和假设框。你先用它们证出公理 K 和 S，再给证明器加上「与」「或」「假」：每个连接词的规则都由你对着它的真值表设计出来。', en: 'The prover’s foundation is two parts: Apply and the assumption box. With them you first prove the axioms K and S, then add “and”, “or” and “false” to the prover, designing each connective’s rules yourself against its truth table.' },
  eras: ERAS,
  logic: LOGIC,
  levels: LOGIC.LEVELS,
  course: LOGIC.course,
  glossary: { groups: GLOSSARY_GROUPS, entries: GLOSSARY },
  saves: [],
  // Level titles that are also the names of parts or ideas: a text may quote them as such.
  quotes: ['套用'],
  texts: { chapters: LOGIC.CHAPTERS, lemmas: LEMMAS, glossary: GLOSSARY },
}
