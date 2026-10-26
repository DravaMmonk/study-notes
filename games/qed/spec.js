// 证明完毕 Q.E.D.: formal proof as a Turing Complete style game, on the logic domain (kit/domains/logic). Everything
// here is the course; the game it makes is game.js.
import { GLOSSARY, GLOSSARY_GROUPS } from './glossary.js'
import { ERAS } from './levels/eras.js'
import { LEMMAS, LOGIC } from './levels/index.js'

export default {
  id: 'qed',
  domain: 'logic',
  title: { zh: '证明完毕', en: 'Q.E.D.' },
  // Still in development: the demo has eras 0-2 of the course in DESIGN.md.
  kicker: { zh: '开发中 · 用电路构建形式化证明', en: 'In development · Puzzles that wire reasoning into circuits' },
  lede: (count) => ({ zh: `无需逻辑学基础。从真值表开始，在 ${count} 个关卡中逐步学习推理规则、构建证明电路，并用假设框处理临时假设，理解形式化证明的基本方法。`, en: `No logic background needed. Starting from truth tables, over ${count} levels you build proofs rule by rule, get an assumption box, and see what a proof really is.` }),
  eras: ERAS,
  logic: LOGIC,
  levels: LOGIC.LEVELS,
  course: LOGIC.course,
  glossary: { groups: GLOSSARY_GROUPS, entries: GLOSSARY },
  texts: { chapters: LOGIC.CHAPTERS, lemmas: LEMMAS, glossary: GLOSSARY },
}
