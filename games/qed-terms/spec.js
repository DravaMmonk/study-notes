// 《证明完毕》 · 证明项分支: a trial branch of Q.E.D. on a page of its own (the game itself stays as it is). From chapter 7
// on, a proof state builds its proof term as it goes, Lean's way: a goal is a hole in the term, a rule fills it with
// its own term over new holes, Assumption with a given's term; a finished proof counts only when chapter 6's kernel
// accepts the term. The course is Q.E.D.'s (../qed/levels), with the changes in levels/branch.js.
import { GLOSSARY, GLOSSARY_GROUPS } from '../qed/glossary.js'
import { LEMMAS } from '../qed/levels/index.js'
import { ERAS, LOGIC } from './levels/branch.js'

export default {
  id: 'qed-terms',
  domain: 'logic',
  title: { zh: '证明完毕 · 证明项分支', en: 'Q.E.D. · Proof-term branch' },
  kicker: { zh: '试做分支 · 倒着证的时候，证明项一点点填出来', en: 'Trial branch · Proving backwards fills in the proof term bit by bit' },
  lede: { zh: '《证明完毕》的一个试做分支：从第 7 章起，每个还没证完的目标都是证明项里一个还没填的洞，机器证完以后，第 6 章的核再把整个证明项查一遍。', en: 'A trial branch of Q.E.D.: from chapter 7 on, every goal still open is a hole in the proof term, and once the machine is done, chapter 6’s kernel checks the whole term again.' },
  eras: ERAS,
  logic: LOGIC,
  levels: LOGIC.LEVELS,
  course: LOGIC.course,
  glossary: { groups: GLOSSARY_GROUPS, entries: GLOSSARY },
  // Version 2 gathered chapter 6's small tasks into fewer levels, as Q.E.D.'s version 30 did.
  saves: [{ version: 2, ops: [
    { data: (value, id) => (['t-lam', 't-pair', 't-wapp', 't-wpair', 't-beta', 't-all'].includes(id) ? undefined : value) },
    { rename: { 't-chain': null, 't-two': null, 't-curry': null, 't-or': null, 't-mt': null, 't-absurd': null, 't-wlam': null, 't-wcases': null, 't-detour': null, 't-casedetour': null, 't-ex': null } },
  ] },
  // Version 3: the term writing after the wiring, as Q.E.D.'s version 31.
  { version: 3, ops: [
    { data: (value, id) => (['t-wapp', 't-wpair'].includes(id) ? undefined : value) },
    { solve: ['t-kernel', ['t-wquant']] },
  ] }],
  // Names a text may quote rather than link: a level, part or entry name used for something else (a phrase, a button).
  quotes: ['任取'],
  texts: { chapters: LOGIC.CHAPTERS, lemmas: LEMMAS, glossary: GLOSSARY },
}
