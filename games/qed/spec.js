// 证明完毕 Q.E.D.: formal proof as a Turing Complete style game, on the logic domain (kit/domains/logic). Everything
// here is the course; the game it makes is game.js.
import { GLOSSARY, GLOSSARY_GROUPS } from './glossary.js'
import { ERAS } from './levels/eras.js'
import { LEMMAS, LOGIC } from './levels/index.js'

export default {
  id: 'qed',
  domain: 'logic',
  title: { zh: '证明完毕', en: 'Q.E.D.' },
  kicker: { zh: '把推理搭成电路的解谜', en: 'Puzzles that wire reasoning into circuits' },
  lede: (count) => ({ zh: `不需要任何逻辑学基础。从真值表开始，${count} 关里，你会用推理规则一块一块搭出证明，造出假设框，最后看清「证明」到底是什么。`, en: `No logic background needed. Starting from truth tables, over ${count} levels you build proofs rule by rule, get an assumption box, and see what a proof really is.` }),
  eras: ERAS,
  logic: LOGIC,
  levels: LOGIC.LEVELS,
  course: LOGIC.course,
  glossary: { groups: GLOSSARY_GROUPS, entries: GLOSSARY },
  texts: { chapters: LOGIC.CHAPTERS, lemmas: LEMMAS, glossary: GLOSSARY },
}
