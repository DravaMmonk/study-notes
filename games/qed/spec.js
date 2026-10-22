// 证明完毕 Q.E.D.: formal proof as a Turing Complete style game, on the logic domain (kit/domains/logic). Everything
// here is the course; the game it makes is game.js.
import { GLOSSARY, GLOSSARY_GROUPS } from './glossary.js'
import { ERAS } from './levels/eras.js'
import { LEMMAS, LOGIC } from './levels/index.js'

export default {
  id: 'qed',
  domain: 'logic',
  title: { zh: '证明完毕', en: 'Q.E.D.' },
  // Still in development: the demo has chapters 0-3 of the course in DESIGN.md.
  kicker: { zh: '开发中 · 把推理搭成电路的解谜', en: 'In development · Puzzles that wire reasoning into circuits' },
  lede: { zh: '不需要任何逻辑学基础。从真值表开始，把推理规则当成元件，一块一块搭出证明，学会假设、分情况和反证；最后能亲手证出逻辑定律，在岛上分辨骑士和无赖，并看清「证明」到底是什么。', en: 'No logic background needed. Starting from truth tables, you wire up proofs with rules of inference as parts and learn to assume, to split into cases and to argue by contradiction; in the end you prove the laws of logic yourself, sort the knights from the knaves on an island, and see what a proof really is.' },
  eras: ERAS,
  logic: LOGIC,
  levels: LOGIC.LEVELS,
  course: LOGIC.course,
  glossary: { groups: GLOSSARY_GROUPS, entries: GLOSSARY },
  // Version 2 dropped the levels that rebuilt the kernel's lemmas with boxes (the lemmas now stay in the prover), and put
  // the truth circuits before the kernel: whoever had reached the kernel has the circuits' main path, and its gates.
  saves: [{ version: 2, ops: [
    { rename: { chain2: null, swap2: null, merge2: null } },
    { solve: ['copy', ['g-not', 'g-and', 'g-tree', 'g-or', 'g-imp', 'g-always', 'g-never', 'g-iff']] },
    { grant: ['copy', 'lemma:gOr'] },
    { grant: ['copy', 'lemma:gImp'] },
  ] },
  // Version 3 put a translation level before the islanders' first puzzle.
  { version: 3, ops: [{ solve: ['e-one', ['e-words']] }] },
  // Version 4 put a level on translating “a says X” before it.
  { version: 4, ops: [{ solve: ['e-one', ['e-says']] }] },
  // Version 5 made “Both ways round” build the Same truth gate.
  { version: 5, ops: [{ grant: ['g-iff', 'lemma:gIff'] }] },
  // Version 6 added practice with Merge and with Chain and Merge before the levels that now follow them.
  { version: 6, ops: [{ solve: ['mergeUse', ['thrice']] }, { solve: ['wrongChain', ['mergeLong', 'mergeBoth']] }] },
  // Version 7 dropped the deduction-theorem topic: the assumption box introduces assumptions instead.
  { version: 7, ops: [{ rename: { 'dt-mp': null, 'dt-whole': null } }] },
  // Version 8 moved the assumption box into the kernel, beside Apply: K and S are proved with boxes and become parts,
  // and the levels that proved them in the boxes chapter are gone. Whoever had passed K has passed the box's first
  // levels and holds the parts K and S stood for.
  { version: 8, ops: [
    { solve: ['k', ['assume', 'box']] },
    { grant: ['k', 'lemma:axK'] },
    { grant: ['s', 'lemma:axS'] },
    { rename: { nest: null, sbox: null, chainUse: null } },
  ] },
  // Version 9 dropped the Identity levels, which the box now does in one step.
  { version: 9, ops: [{ rename: { short: null, self: null } }] },
  // Version 10 dropped 先推出来，再加条件.
  { version: 10, ops: [{ rename: { kmp: null } }] },
  // Version 11 gathered the levels a box or K and S both solve into the topic without the box (第三句也可以长 is now
  // its second level), and dropped 啰嗦的规定 and 串联本身, which the box makes too easy.
  { version: 11, ops: [{ rename: { s2: 'x-s', thrice: null, hs: null } }] }],
  // Level titles that are also the names of parts or ideas: a text may quote them as such.
  quotes: ['套用'],
  texts: { chapters: LOGIC.CHAPTERS, lemmas: LEMMAS, glossary: GLOSSARY },
}
