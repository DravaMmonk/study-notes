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
  lede: { zh: '证明器的地基只有两块元件：套用和假设框。你用它们证出公理 K 和 S，再拿掉框，看只靠公理的证明器有多费劲，以及为什么框能换成公理。', en: 'The prover’s foundation is two parts: Apply and the assumption box. With them you prove the axioms K and S, then take the box away to see how hard a prover with only axioms works, and why a box can always be traded for them.' },
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
