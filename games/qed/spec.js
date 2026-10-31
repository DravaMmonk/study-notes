// 证明完毕 Q.E.D.: formal proof as a Turing Complete style game, on the logic domain (kit/domains/logic). Everything
// here is the course; the game it makes is game.js.
import { GLOSSARY, GLOSSARY_GROUPS } from './glossary.js'
import { ERAS } from './levels/eras.js'
import { LEMMAS, LOGIC } from './levels/index.js'

// The declarations that had a second task, their elimination rule by hand (save versions 48 to 49).
// The levels that gained definition tasks before their machine (version 52), and how many.
// The levels that build a world (chapters 5 and 6), for version 67's migration.
const WORLD_LEVELS = ['m-world', 'm-make', 'm-counter', 'm-order', 'p-split', 'p-exAnd', 'q-capture', 'q-witness', 'q-swap']
const DEFINED = { 'in-revapp': 1, 'in-itsum': 2, 'sort-ins': 3 }
const DECLARED = ['decl-and', 'decl-or', 'decl-bot', 'decl-two', 'decl-true', 'decl-iff', 'decl-ex']

// A saved machine board (or a level's list of them) with each card as version 28 has it.
const CARD = (n) => {
  if (n.type === 'orElse') return { ...n, type: 'append' }
  if (n.type === 'drule') return { ...n, type: 'frule', params: { rule: n.params?.rule } }
  if (n.type === 'rule' && n.params?.rule === 'intro') return { ...n, type: 'introRules', params: {} }
  if (n.type === 'erule' && n.params?.rule === 'elim') return { ...n, type: 'elimRules', params: {} }
  return n
}
const machineCards = (value) => (Array.isArray(value) ? value.map(machineCards) : value?.nodes ? { ...value, nodes: value.nodes.map(CARD) } : value)
// A saved board (or a level's list of them) with each rule part's choice a list, as version 39 has it.
const ticked = (value) => (Array.isArray(value) ? value.map(ticked) : value?.nodes ? { ...value, nodes: value.nodes.map((n) => (typeof n.params?.use === 'string' ? { ...n, params: { ...n.params, use: [n.params.use] } } : n)) } : value)
// A saved board that uses a rule of numbers or lists as a part of its own (before version 40), dropped.
const NUMBER_PARTS = /^(def_|nat_|list_|bool_)|^(addZero|addSucc|addComm|addAssoc|appNil|appAssoc|revApp|succNeq|insLen)$/
const unbooked = (board) => (board?.nodes?.some((n) => NUMBER_PARTS.test(n.type)) ? null : board)
// A saved board that names a rule on a card (before version 37), dropped: its level starts it afresh.
const unruled = (board) => (board?.nodes?.some((n) => ['rule', 'rewrite', 'rewrites'].some((k) => n.params?.[k])) ? null : board)

export default {
  id: 'qed',
  domain: 'logic',
  title: { zh: '证明完毕', en: 'Q.E.D.' },
  // Still in development: the chapters in levels/eras.js are in; the rest of DESIGN.md's course is being built.
  kicker: { zh: '开发中 · 用电路构建证明与证明助手', en: 'In development · Build proofs and proof assistants as circuits' },
  lede: { zh: '无需逻辑学基础。从真值表出发，将推理规则连接成证明，逐步学习假设、分类讨论、量词与归纳，并搭建能够处理证明目标的证明助手。', en: 'No logic background is required. Start with truth tables, connect inference rules into proofs, and learn assumptions, case analysis, quantifiers and induction as you build a proof assistant.' },
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
  { version: 11, ops: [{ rename: { s2: 'x-s', thrice: null, hs: null } }] },
  // Version 12 dropped 一长串 and 先换，再套用.
  { version: 12, ops: [{ rename: { long: null, swapUse: null } }] },
  // Version 13 dropped 接反了.
  { version: 13, ops: [{ rename: { wrongChain: null } }] },
  // Version 14 added the Identity level: whoever had passed Merge has passed it.
  { version: 14, ops: [{ solve: ['twice', ['ident']] }] },
  // Version 15 put a level that reads ¬ as “→ ⊥” before 矛盾: whoever had passed that has passed it.
  { version: 15, ops: [{ solve: ['bot', ['notE']] }] },
  // Version 16 added practice with “from contradiction, anything”: whoever had passed the levels after has them.
  { version: 16, ops: [{ solve: ['notI', ['exFalso']] }, { solve: ['demorgan', ['dsyll']] }] },
  // Version 17 dropped the level that read ¬ as “→ ⊥” on its own; 矛盾 says it in its task.
  { version: 17, ops: [{ rename: { notE: null } }] },
  // Version 18: K1 builds the liar, and the De Morgan's laws card got a type of its own.
  { version: 18, ops: [{ grant: ['kk-one', 'lemma:liar'] }, { grant: ['law-dm', 'lemma:dmLaw'] }] },
  // Version 19 folded 没有 ⊥，也是答案 into 一圈又一圈 as its second and third tasks.
  { version: 19, ops: [{ rename: { satisfiable: null } }] },
  // Version 20 built translations and queries from chips, one sentence per task: what was typed before is dropped.
  { version: 20, ops: [{ data: (value, id) => (['fo-atoms', 'fo-all', 'fo-some', 'fo-nested', 'p-only', 'q-children', 'q-grand', 'q-none', 'q-school'].includes(id) ? undefined : value) }] },
  // Version 21 put 两个方向 (↔ split into its directions) at the end of the And line: whoever had passed the mixed
  // problems after it has passed it.
  { version: 21, ops: [{ solve: ['dist', ['iffUse']] }] },
  // Version 22 built proof terms from chips, one problem per task: what was typed before is dropped.
  { version: 22, ops: [{ data: (value, id) => (['t-wapp', 't-wlam', 't-wpair', 't-wcases', 't-dneg'].includes(id) ? undefined : value) }] },
  // Version 23 put the negated quantifiers (ending with the part Quantifier De Morgan) before the drinker paradox, which
  // now uses the part: whoever had passed the paradox has passed them and holds the part.
  { version: 23, ops: [{ solve: ['drinker', ['q-notEx', 'q-exNot', 'q-notAll']] }, { grant: ['drinker', 'lemma:qdm'] }] },
  // Version 24 folded Quantifier De Morgan into De Morgan, one card of several shapes, and added the De Morgan levels
  // 德摩根，反过来, 不是这个就是那个不 and 并非两个都: whoever had passed what follows each has passed it.
  { version: 24, ops: [{ solve: ['dmUse', ['dmBack']] }, { solve: ['notnotlem', ['dmOr']] }, { solve: ['fo-atoms', ['dmAnd']] }] },
  // Version 25 put 核来把关 and 证明项放回板上 at the end of the proof-term writing line: whoever had passed what follows
  // has passed them.
  { version: 25, ops: [{ solve: ['t-detour', ['t-kernel', 't-exact']] }, { solve: ['t-all', ['t-kernel', 't-exact']] }] },
  // Version 26 brought the repeat frame in right after the first unification level (拆到底): whoever had passed what
  // follows has passed it.
  { version: 26, ops: [{ solve: ['r-delete', ['r-deep']] }] },
  // Version 27 made 排中律不可否定 and 反证法 the two tasks of one level (反证法's id), so the part 排中不可否定 is gone.
  { version: 27, ops: [{ merge: ['raa', ['notnotlem', 'raa']] }] },
  // Version 28 kept the primitive tactics to Rule and Assumption: Or else became Alternatives, the Forward card (Use up
  // kept or replaced) became the built Forward, and the rule sets the built Goal apart and Use a given. 几个变量 came in
  // before the quantifier rules: whoever had passed them has passed it.
  { version: 28, ops: [{ data: (value) => machineCards(value) }, { solve: ['r-allI', ['r-patterns']] }] },
  // Version 29 dropped 证明项放回板上 and its part: every task of it could be wired without the part.
  { version: 29, ops: [{ rename: { 't-exact': null } }] },
  // Version 30 gathered chapter 6's small tasks into fewer levels: the levels that took in others start their boards
  // afresh, and the others are gone.
  { version: 30, ops: [
    { data: (value, id) => (['t-lam', 't-pair', 't-wapp', 't-wpair', 't-beta', 't-all'].includes(id) ? undefined : value) },
    { rename: { 't-chain': null, 't-two': null, 't-curry': null, 't-or': null, 't-mt': null, 't-absurd': null, 't-wlam': null, 't-wcases': null, 't-detour': null, 't-casedetour': null, 't-ex': null } },
  ] },
  // Version 31 put the term writing after the wiring of chapter 6, writing every part wired (a lemma, the quantifiers'
  // parts in a level of their own): whoever had passed 核来把关 has passed it.
  { version: 31, ops: [
    { data: (value, id) => (['t-wapp', 't-wpair'].includes(id) ? undefined : value) },
    { solve: ['t-kernel', ['t-wquant']] },
  ] },
  // Version 32 put each mechanism where it is first needed. Excluded middle went to classical logic, after a level
  // where auto runs into it, with two new practice levels; De Morgan went to the simplifier, its four propositional
  // laws one level of four tasks (一路否定回去 gone), its quantifier laws another (量词的德摩根, a new id). Whoever had
  // passed what follows each new level has passed it. Two levels of rules and metavariables lost their excluded
  // middle and De Morgan: their boards start afresh.
  { version: 32, ops: [
    { solve: ['raa', ['c-wall']] },
    { solve: ['byContra', ['c-contra']] },
    { solve: ['lemCases', ['c-either']] },
    { rename: { dmUse: null } },
    { merge: ['demorgan', ['demorgan', 'dmBack', 'dmOr', 'dmAnd']] },
    { merge: ['q-dm', ['q-notEx', 'q-notEx', 'q-exNot', 'q-notAll']] },
    { data: (value, id) => {
      if (id === 'q-dm' && Array.isArray(value)) return [value[0]?.[0] ?? null, value[1]?.[1] ?? null, value[2], value[3]]
      if (id === 'r-subgoals') return undefined
      if (id === 'r-lemma' && Array.isArray(value)) return [value[0], value[1], null]
      return value
    } },
  ] },
  // Version 33 built the simplifier around the laws: double negation and its rewrite card come before De Morgan, whose
  // levels gained a rewriting task. Whoever had passed De Morgan has passed double negation and holds its card.
  { version: 33, ops: [{ solve: ['demorgan', ['sp-dneg']] }, { grant: ['demorgan', 'lemma:dneg'] }] },
  // Version 34 made 化简弯路 build Normalize with Simp and the computation rules, on the machine board: its tasks that
  // used the part on the proof board are gone.
  { version: 34, ops: [
    { data: (value, id) => (id === 't-beta' && Array.isArray(value) ? [value[0], value[2] ?? null, null] : value) },
  ] },
  // The machine task of t-beta is gone, two proof-board tasks in its place.
  { version: 35, ops: [{ data: (value, id) => (id === 't-beta' && Array.isArray(value) ? [value[0], value[1] ?? null, null, null] : value) }] },
  // Numbers and lists became a chapter: 手算 1 + 1 comes before 算一算, and 0 加在右边 gained a proof-board task second.
  { version: 36, ops: [
    { solve: ['sp-compute', ['nl-plus']] },
    { data: (value, id) => (id === 'in-zero' && Array.isArray(value) ? [value[0] ?? null, null, value[1] ?? null] : value) },
  ] },
  // Version 37 made rules parts on the machine board, wired into the cards that use them: a board that chose a rule
  // on a card starts afresh.
  { version: 37, ops: [{ data: (value) => (Array.isArray(value) ? value.map(unruled) : unruled(value)) }] },
  // Version 38 proved the equivalences in classical logic (双重否定, 去掉箭头 and 分配 under new ids, 德摩根 and 量词的
  // 德摩根) and left their rewriting to the simplifier, in levels of its own: each law's last task is gone, and whoever
  // had passed a law has passed the rewriting that came with it.
  { version: 38, ops: [
    { rename: { 'sp-dneg': 'c-dneg', 'sp-arrow': 'c-arrow', 'sp-dist': 'c-dist' } },
    { data: (value, id) => (['c-dneg', 'c-arrow', 'c-dist', 'demorgan', 'q-dm'].includes(id) && Array.isArray(value) ? value.slice(0, -1) : value) },
    { solve: ['c-dneg', ['sp-rw']] },
    { solve: ['c-dist', ['sp-laws']] },
    { solve: ['q-dm', ['sp-dm']] },
  ] },
  // Version 39 let a rule part give several of its rules: the one it chose is now the one it ticks.
  { version: 39, ops: [{ data: ticked }] },
  // Version 40 gathered the rules of numbers and lists (a declaration's, a definition's, an equation proved) into one
  // part, the rule book of numbers: a board that used one of the parts it replaces starts afresh.
  { version: 40, ops: [{ data: (value) => (Array.isArray(value) ? value.map(unbooked) : unbooked(value)) }] },
  // Version 41 ran the parts the player built as the boards that built them: whoever solved a level has its board as
  // the part's. Rule on a given, Forward and Simp now take their rules at an input of their board, so a board saved
  // for those levels before does not fit and they are played again.
  { version: 41, ops: [{ built: ['r-unifier', 's-intro', 's-elim', 's-auto', 'au-clauses', 'au-saturate', 'au-replay'] }] },
  // Version 42 made 两个都要, 二选一 and 矛盾 declare their connective first (a declaration board), then prove with the
  // parts it makes: their proof boards move to the second task.
  { version: 42, ops: [{ data: (value, id) => (['and', 'or', 'bot'].includes(id) && value && !Array.isArray(value) ? [null, value] : value) }] },
  // Version 43 moved the declarations into chapter 3 as levels of their own (声明「并且」, 「或者」, 「矛盾」, by
  // assumption boxes): 两个都要, 二选一 and 矛盾 are one proof again, and whoever had passed one has passed its
  // declaration.
  { version: 43, ops: [
    { data: (value, id) => (['and', 'or', 'bot'].includes(id) && Array.isArray(value) ? value[1] ?? null : value) },
    { solve: ['and', ['decl-and']] },
    { solve: ['or', ['decl-or']] },
    { solve: ['bot', ['decl-bot']] },
  ] },
  // Chapters 1 to 4 tightened: short levels on one idea became the tasks of one level, and one level that only repeated
  // another (a condition, two results) went.
  { version: 44, ops: [
    { merge: ['g-always', ['g-always', 'g-never']] },
    { merge: ['mp', ['mp', 'pick']] },
    { merge: ['nested', ['nested', 'cond']] },
    { merge: ['assume', ['assume', 'k2']] },
    { merge: ['k', ['ident', 'k']] },
    { merge: ['x-k', ['x-k', 'x-s']] },
    { merge: ['x-merge', ['x-self', 'x-merge']] },
    { merge: ['mergeLong', ['mergeUse', 'mergeLong', 'mergeBoth']] },
    { merge: ['decl-three', ['decl-three', 'decl-or3']] },
    { rename: { andImp: null } },
    { merge: ['and', ['and', 'andSwap']] },
    { merge: ['curry', ['curry', 'uncurry']] },
    { merge: ['orSwap', ['orSwap', 'orImp']] },
    { merge: ['bot', ['bot', 'exFalso']] },
    { merge: ['notI', ['notI', 'dni']] },
    { merge: ['mt', ['mt', 'contra', 'denyAnte']] },
    { merge: ['h-and-make', ['h-and-make', 'h-and-use']] },
    { merge: ['h-or-make', ['h-or-make', 'h-or-use']] },
  ] },
  // "There is", equality and the numbers are declared before their parts are used: whoever has passed those levels has
  // passed the declarations.
  { version: 45, ops: [
    { solve: ['q-exI', ['decl-ex']] },
    { solve: ['q-eq', ['decl-eq']] },
    { solve: ['in-distinct', ['decl-nat']] },
  ] },
  // Version 46 split 不用框：恒等与说一遍 back into two levels, 不用框恒等 and 不用框合并.
  { version: 46, ops: [{ split: ['x-merge', ['x-self', 'x-merge']] }] },
  // Version 47 had the player build the elimination rule generator in chapter 3 (拆开它, 每一条, and a second task of
  // 声明 ⊥ that runs it), and prove 拆开 ∧ from the new ∧ elim in two tasks before 两个都要: whoever is past them has
  // passed them, and has the parts they build.
  { version: 47, ops: [
    { solve: ['decl-or', ['gen-one']] },
    { solve: ['decl-bot', ['gen-each']] },
    { grant: ['gen-each', 'lemma:elimGen'] },
    { grant: ['and', 'lemma:andE'] },
    { data: (value, id) => (id === 'decl-bot' && value && !Array.isArray(value) ? [value, null] : id === 'and' && Array.isArray(value) ? [null, null, ...value] : value) },
  ] },
  // Version 48 had elimination rules written by hand after each declaration (a second task), and moved the generator
  // to chapter 12: a declaration's board is its first task's, and 声明 ⊥'s generator task is gone.
  { version: 48, ops: [
    { data: (value, id) => (['decl-and', 'decl-or', 'decl-two', 'decl-true', 'decl-iff', 'decl-ex', 'decl-nat'].includes(id) && value && !Array.isArray(value) ? [value, null] : id === 'decl-bot' && Array.isArray(value) ? [value[0] ?? null, null] : value) },
  ] },
  // Version 49 makes the elimination rule from the ways in again: those declarations are one task, their board the
  // declaration board.
  { version: 49, ops: [
    { data: (value, id) => (DECLARED.includes(id) && Array.isArray(value) ? value[0] ?? null : value) },
  ] },
  // Version 50: ∧ elim is the two-output card again, given by 声明「并且」; 两个都要 loses the two tasks that built it
  // (the left side, the right side).
  { version: 50, ops: [
    { data: (value, id) => (id === 'and' && Array.isArray(value) ? value.slice(2) : value) },
    { tasks: (passed, id) => (id === 'and' ? Math.max(0, passed - 2) : passed) },
  ] },
  // Version 51: 声明自然数 is one task again (its generator task is the optional 生成器遇上自然数).
  { version: 51, ops: [
    { data: (value, id) => (id === 'decl-nat' && Array.isArray(value) ? value[0] ?? null : value) },
    { tasks: (passed, id) => (id === 'decl-nat' ? 0 : passed) },
  ] },
  // Version 52: chapter 12 declares its types and defines its functions. A level now opened by a type or definition
  // counts solved for whoever got past it; 一对一 is two new tasks (pred defined, then proved on the proof board), and
  // 倒过来拼, 累加器求和, 插进去 gained definition tasks before their machine.
  { version: 52, ops: [
    { solve: ['sp-compute', ['def-plus']] },
    { solve: ['sp-lists', ['decl-list', 'def-list']] },
    { solve: ['sp-cond', ['decl-bool', 'def-max']] },
    { solve: ['sort-insLen', ['sort-if']] },
    { data: (value, id) => (id === 'in-inject' ? null : value && !Array.isArray(value) && DEFINED[id] ? [...Array(DEFINED[id]).fill(null), value] : value) },
  ] },
  // Version 53: 拆开它 builds the elimination rule generator, which 每一条 then upgrades: whoever solved it holds the
  // part, running the board kept there until a later upgrade is passed.
  { version: 53, ops: [
    { grant: ['gen-one', 'lemma:elimGen'] },
    { built: ['gen-one'] },
  ] },
  // Version 54 gave 声明「并且」 a second task (finding the fault in someone's declaration by writing cases) and made
  // 声明「或者」 find the faults in two before putting one right: the kept board goes to the task that writes one.
  { version: 54, ops: [
    { data: (value, id) => (id === 'decl-and' && value && !Array.isArray(value) ? [value, null] : id === 'decl-or' && value && !Array.isArray(value) ? [null, value] : value) },
  ] },
  // Version 55 made those boards the test cases of the shared play of checking or correcting by the diagram: the
  // cases written are its work, and the board corrected is the first of its boards.
  { version: 55, ops: [
    { data: (value, id) => {
      if (!['decl-and', 'decl-or'].includes(id) || !Array.isArray(value)) return value
      const moved = (task) => (task?.cases ? { work: task.cases } : task?.nodes ? { boards: [task] } : task)
      return id === 'decl-and' ? [value[0], moved(value[1])] : [moved(value[0]), moved(value[1])]
    } },
  ] },
  // Version 56 wrote a test case as what is given, a goal and whether it is derivable: the cases written keep what they
  // held as given, the declared sentence their goal.
  { version: 56, ops: [
    { data: (value, id) => {
      const moved = (task) => (Array.isArray(task?.work) ? { work: task.work.map((c) => (c.have ? { given: c.have, make: c.make } : c)) } : task)
      return id === 'decl-and' && Array.isArray(value) ? [value[0], moved(value[1])] : id === 'decl-or' && Array.isArray(value) ? [moved(value[0]), value[1]] : value
    } },
  ] },
  // Version 57 put a task between 声明「或者」's two (test cases with the goal fixed to 我休息): the board corrected
  // moves to the third, and whoever had passed the first has the second still to do.
  { version: 57, ops: [
    { data: (value, id) => (id === 'decl-or' && Array.isArray(value) && value.length === 2 ? [value[0], null, value[1]] : value) },
    { tasks: (passed, id) => (id === 'decl-or' ? Math.min(passed, 1) : passed) },
  ] },
  // Version 58 set out a fixed number of cases in each audit, and gave 声明「并且」 a third task (a declaration too
  // strong) and 声明「或者」 one wrong declaration instead of two: the cases written and the board corrected start afresh.
  { version: 58, ops: [
    { data: (value, id) => (id === 'decl-and' && Array.isArray(value) ? [value[0] ?? null, null, null] : id === 'decl-or' && Array.isArray(value) ? [null, null, null] : value) },
    { tasks: (passed, id) => (id === 'decl-and' ? Math.min(passed, 1) : id === 'decl-or' ? 0 : passed) },
  ] },
  // Version 59 split 绕一大圈's three tasks back into three levels (接起来，再合并, 绕一大圈, 对不上的两句).
  { version: 59, ops: [{ split: ['mergeLong', ['mergeUse', 'mergeLong', 'mergeBoth']] }] },
  // Version 60 took K off the rules chapter (K and S became optional): its first three levels have new tasks, and the
  // boards kept for them start afresh.
  { version: 60, ops: [{ data: (value, id) => (['r-rule', 'r-assumption', 'r-subgoals'].includes(id) ? undefined : value) }] },
  // Version 61 wrote a declaration with premise cards, Join and wires (a card into another's port is a premise needed
  // under it) instead of cards chained by "premise before": the boards written the old way start afresh, and the new
  // first level, 声明「若…则…」, counts as passed for whoever passed 声明「并且」.
  { version: 61, ops: [
    { data: (value) => {
      const old = (b) => b?.wires?.some((w) => w.port === 'before') && b.nodes?.some((n) => n.id === 'decl')
      return Array.isArray(value) ? value.map((b) => (old(b) ? null : b)) : old(value) ? undefined : value
    } },
    { solve: ['decl-and', ['decl-imp']] },
  ] },
  // Version 62 gave 声明「若…则…」 a second task, correcting a wrong declaration: the board written is the first's.
  { version: 62, ops: [{ data: (value, id) => (id === 'decl-imp' && value && !Array.isArray(value) ? [value, null] : value) }] },
  // Version 63 took that second task out into a level of its own, 检验声明, after it: 声明「若…则…」 keeps the board
  // written, and whoever passed 声明「并且」 has passed the new level too.
  { version: 63, ops: [
    { data: (value, id) => (id === 'decl-imp' && Array.isArray(value) ? value[0] ?? undefined : value) },
    { tasks: (passed, id) => (id === 'decl-imp' ? 0 : passed) },
    { solve: ['decl-and', ['decl-check']] },
  ] },
  // Version 64 put 声明「并且」's two audits first and its declaration last, gave 声明「或者」's first audit a fixed goal
  // and made its last task a declaration from scratch: the declaration written moves to the end, the rest start afresh.
  { version: 64, ops: [
    { data: (value, id) => (!Array.isArray(value) ? value : id === 'decl-and' ? [null, null, value[0] ?? null] : id === 'decl-or' ? [null, value[1] ?? null, null] : value) },
    { tasks: (passed, id) => (['decl-and', 'decl-or'].includes(id) ? 0 : passed) },
  ] },
  // Version 65 took the longer proofs off the main path into the proof puzzles (topic P): 不管哪一种 and 逆否 are
  // levels of their own again, out of 或者，换个顺序 and 没有结果，就没有起因.
  { version: 65, ops: [
    { split: ['orSwap', ['orSwap', 'orImp']] },
    { split: ['mt', ['mt', 'contra', 'denyAnte']] },
    { merge: ['mt', ['mt', 'denyAnte']] },
  ] },
  // Version 66 began the later declarations with finding the fault in a wrong one: 三样's two declarations move to the
  // second task (三选一 became a table to fill in), and the declaration written of 换个顺序, 至少两样, 声明「真」,
  // 声明「当且仅当」 and 声明「存在」 to their second; their tasks start afresh.
  { version: 66, ops: [
    { data: (value, id) => (id === 'decl-three' && Array.isArray(value) ? [null, value[0] ?? null, null]
      : ['decl-order', 'decl-two', 'decl-true', 'decl-iff', 'decl-ex'].includes(id) && value && !Array.isArray(value) ? [null, value] : value) },
    { tasks: (passed, id) => (['decl-three', 'decl-order', 'decl-two', 'decl-true', 'decl-iff', 'decl-ex'].includes(id) ? 0 : passed) },
  ] },
  // Version 67 put a wrong inference on the board of every world level: the world built is the work against it.
  { version: 67, ops: [{ data: (value, id) => {
    const wrap = (w) => (w && typeof w === 'object' && 'size' in w ? { work: w } : w)
    return WORLD_LEVELS.includes(id) ? (Array.isArray(value) ? value.map(wrap) : wrap(value)) : value
  } }] },
  // Version 68 made 声明「真」 one table to fill in, as 声明 ⊥ is: its old tasks' boards are dropped.
  { version: 68, ops: [
    { data: (value, id) => (id === 'decl-true' ? undefined : value) },
    { tasks: (passed, id) => (id === 'decl-true' ? 0 : passed) },
  ] },
  // Version 69 put each world level after the translation level of its quantifier: whoever passed a level has passed
  // the ones now before it.
  { version: 69, ops: [
    { solve: ['m-order', ['fo-nested']] },
    { solve: ['fo-nested', ['m-make']] },
    { solve: ['m-make', ['fo-some']] },
    { solve: ['fo-some', ['m-world', 'm-counter']] },
    { solve: ['m-world', ['fo-atoms', 'fo-all']] },
  ] },
  // Version 70 took the declarations to write out of 三样, 换个顺序 and 至少两样, and put 声明「真」 and 声明「当且仅当」
  // before them: 三样 keeps its two tables, the other two are their table alone.
  { version: 70, ops: [
    { data: (value, id) => (!Array.isArray(value) ? value : id === 'decl-three' ? [value[0] ?? null, value[2] ?? null] : ['decl-order', 'decl-two'].includes(id) ? value[0] ?? undefined : value) },
    { tasks: (passed, id) => (id === 'decl-three' ? Math.min(passed, 1) : ['decl-order', 'decl-two'].includes(id) ? 0 : passed) },
    { solve: ['decl-three', ['decl-true', 'decl-iff']] },
  ] }],
  // Names a text may quote rather than link: a level, part or entry name used for something else (a phrase, a button,
  // a part that stays where it is brought, which has no box entry to link).
  quotes: ['任取', '等价', '相等', '假设', '我证不出', '交换', '归纳', '归结', '饱和器', '数理规则书', '定义'],
  texts: { chapters: LOGIC.CHAPTERS, lemmas: LEMMAS, glossary: GLOSSARY },
}
