// 《证明完毕》's course: one machine, the prover the player builds, module by module (one chapter each). Chapter 0 has
// no machine: a sentence is checked by its truth table by hand. Truth circuits compute a sentence's value on every
// row; the kernel proves from two parts, Apply and the assumption box, and proves K and S with them; its challenges
// hold the box back and prove with K and S alone. The next chapter adds the other connectives. Everything built
// earlier stays in the prover.
const T = (zh, en) => ({ zh, en })

// A named stretch of the main path (one branch of a `parallel` set): each new rule, then practice with it. Branches
// are stretches that need nothing from each other, played in any order, all of them before the path goes on.
const branch = ([id, zh, en, levels]) => ({ id, title: T(zh, en), levels })
const series = (id, zh, en, levels) => ({ parallel: [branch([id, zh, en, levels])] })
const branches = (...list) => ({ parallel: list.map(branch) })

export const ERAS = [
  {
    id: 'paper', machine: null,
    foundation: ['table', 'always', 'onerow'],
    chapter: { title: T('纸笔', 'Pen and paper'), question: T('一句话什么时候永远成立？', 'When does a statement always hold?') },
  },
  {
    id: 'circuits', machine: 'prover', keeps: 'all',
    foundation: [
      series('gates', '门', 'Gates', ['g-not', 'g-and', 'g-tree']),
      series('build', '造门', 'Building gates', ['g-or', 'g-imp']),
    ],
    practice: [series('kinds', '三种句子', 'Three kinds of sentence', ['g-always', 'g-never', 'g-iff'])],
    topics: [{ id: 'islanders', code: 'E', after: 'g-iff', levels: ['e-words', 'e-says', 'e-one', 'e-two', 'e-three'], title: T('把谜题接成电路', 'A puzzle as a circuit') }],
    challenges: [{ level: 'g-xor', after: 'g-or' }],
    chapter: { title: T('真值电路', 'Truth circuits'), question: T('一句话在每一种情况下是真是假，能交给电路去算吗？', 'Can a circuit work out whether a sentence is true in every case?') },
  },
  {
    id: 'kernel', machine: 'prover',
    // A new topic: proof by rules, not truth by circuits. The gates stay behind with the truth circuits.
    keeps: [],
    foundation: [
      'copy',
      // The kernel's two parts, each on its own line: Apply uses an “if … then …” up, the box makes one. Build a
      // prover then uses both parts together.
      branches(['apply', '套用', 'Apply', ['mp', 'pick', 'nested', 'cond']], ['assume', '假设框', 'Assumption box', ['assume', 'k2']]),
      'box',
      // Chain, Swap and Merge, each built with boxes alone, on two lines that need nothing from each other; then the
      // three together, harder each time.
      branches(['chain', '串联', 'Chain', ['chain', 'swap']], ['merge', '合并', 'Merge', ['twice']]),
      'mergeUse', 'mergeLong', 'mergeBoth',
      // K and S, each proved with boxes and built as a part, need nothing from each other.
      branches(['k', 'K', 'K', ['ident', 'k']], ['s', 'S', 'S', ['s']]),
    ],
    // Without the box: K, S and Apply alone, the way a prover with only axioms works, harder each time, once K and S
    // are both in hand (a level's `without` holds back the box and the parts built with it): a condition, Apply under a
    // condition, then Chain (compiling a box away, the deduction theorem) and Swap, Identity and Merge, each from K
    // and S alone.
    // It splits in two after X2: Chain then Swap on one branch, Identity then Merge on the other.
    topics: [
      { id: 'nobox', code: 'X', after: ['k', 's'], levels: ['x-k', 'x-s'], title: T('拆掉框', 'Without the box') },
      { id: 'nobox-chain', code: 'X', after: 'x-s', levels: ['x-chain', 'x-swap'], title: T('拆掉框：串联与交换', 'Without the box: Chain and Swap') },
      { id: 'nobox-merge', code: 'X', after: 'x-s', levels: ['x-self', 'x-merge'], title: T('拆掉框：恒等与合并', 'Without the box: Identity and Merge') },
    ],
    chapter: { title: T('证明核', 'The kernel'), question: T('只靠套用和假设框，能证出什么？', 'What can Apply and the assumption box prove?') },
  },
  {
    id: 'boxes', machine: 'prover',
    // The kernel extended: Apply, the box and the lemmas built with the kernel carry on.
    keeps: 'all',
    foundation: [
      // And, or and not each need only the box; the mixed problems wait for all three.
      branches(
        ['and', '并且', 'And', ['and', 'andSwap', 'curry', 'uncurry', 'andImp', 'iffUse']],
        ['or', '或者', 'Or', ['or', 'cases', 'orSwap', 'orImp']],
        ['not', '矛盾与否定', 'Contradiction and not', ['bot', 'exFalso', 'notI', 'mt', 'dni', 'contra', 'denyAnte']],
      ),
      series('mix', '组合', 'Together', ['dist', 'dsyll', 'demorgan', 'dmBack', 'dmUse', 'dmOr']),
      series('classical', '反证法', 'By contradiction', ['notnotlem', 'raa', 'byContra', 'lemCases', 'dmAnd']),
    ],
    // The islanders go on from the truth-circuit chapter's puzzles: its topic comes first.
    topics: [{ id: 'knights', code: 'K', after: ['e-three', 'lemCases'], levels: ['kk-one', 'kk-two', 'kk-three'], title: T('骑士与无赖', 'Knights and knaves') }],
    challenges: [{ level: 'peirce', after: 'lemCases' }],
    chapter: { title: T('连接词', 'Connectives'), question: T('有了「与」「或」「非」，证明器还要哪些规则？', 'With “and”, “or” and “not”, what more rules does the prover need?') },
  },
  {
    id: 'quantifiers', machine: 'prover', keeps: 'all',
    foundation: [
      // Saying first-order sentences and building worlds for them need nothing from each other.
      branches(
        ['translate', '翻译', 'Translating', ['fo-atoms', 'fo-all', 'fo-some', 'fo-nested']],
        ['worlds', '造世界', 'Building worlds', ['m-world', 'm-make', 'm-counter', 'm-order']],
      ),
    ],
    practice: [series('splitting', '量词怎么拆', 'Taking quantifiers apart', ['p-only', 'p-split', 'p-exAnd'])],
    topics: [{ id: 'family', code: 'F', after: ['fo-nested', 'm-order'], levels: ['q-children', 'q-grand', 'q-none', 'q-school'], title: T('查族谱', 'Asking a family tree') }],
    chapter: { title: T('量词的语言与反例', 'Quantifiers and counterexamples'), question: T('「每一个」「有一个」怎么说，证不出时怎样找反例？', 'How do you say “every” and “some”, and find a counterexample when no proof comes?') },
  },
  {
    id: 'qrules', machine: 'prover', keeps: 'all',
    foundation: [
      // ∀ and ∃ each need only the proof board.
      branches(
        ['forall', '对所有', 'For all', ['q-allE', 'q-allI', 'q-rename', 'q-allAnd', 'q-capture']],
        ['exists', '存在', 'There is', ['q-exI', 'q-exE', 'q-witness']],
      ),
      // With both in hand: quantifiers swapped and moved, and quantifiers negated (the last needs proof by
      // contradiction and becomes a part); neither needs the other.
      branches(
        ['moving', '换序与挪动', 'Swapping and moving', ['q-swap', 'q-move', 'q-ancestor', 'q-bigger']],
        ['negation', '量词的否定', 'Negating quantifiers', ['q-notEx', 'q-exNot', 'q-notAll']],
      ),
      // Equality is a new mechanism of its own, last: nothing before it in the chapter needs it.
      series('equality', '相等', 'Equality', ['q-eq', 'q-sym', 'q-trans']),
    ],
    topics: [{ id: 'carroll', code: 'S', after: 'q-move', levels: ['s-barbara', 's-darii', 's-carroll'], title: T('卡罗尔的推理题', 'Carroll’s puzzles') }],
    challenges: [{ level: 'drinker', after: 'q-notAll' }],
    chapter: { title: T('量词规则', 'Quantifier rules'), question: T('怎样证明一句话在所有世界里都成立？', 'How do you prove a sentence holds in every world?') },
  },
  {
    id: 'terms', machine: 'prover', keeps: 'all',
    foundation: [
      // Reading terms: functions first, then the data each connective's proofs are.
      series('fn', '读证明项 · 函数', 'Reading proof terms: functions', ['t-app', 't-lam', 't-chain', 't-two']),
      series('data', '读证明项 · 数据', 'Reading proof terms: data', ['t-pair', 't-curry', 't-or', 't-mt', 't-absurd']),
      series('write', '写证明项', 'Writing proof terms', ['t-wapp', 't-wlam', 't-wpair', 't-wcases', 't-kernel', 't-exact']),
      // Detours and the quantifiers' terms need nothing from each other.
      branches(
        ['detour', '弯路', 'Detours', ['t-detour', 't-beta', 't-casedetour', 't-lemma']],
        ['quant', '量词的证明项', 'Quantifiers’ proof terms', ['t-all', 't-ex']],
      ),
    ],
    challenges: [{ level: 't-dneg', after: 't-wcases' }],
    chapter: { title: T('证明即程序', 'Proofs are programs'), question: T('接出来的证明本身是什么？', 'What is a wired proof, itself?') },
  },
  {
    id: 'metavars', machine: 'prover', keeps: 'all',
    foundation: [
      // The machine that unifies, a rule of unification a level, then the repeat frame runs them: the unifier.
      series('unify', '合一', 'Unification', ['r-match', 'r-delete', 'r-clash', 'r-twice', 'r-both', 'r-occurs', 'r-unifier']),
      // On proof states: a goal replaced by a rule's premises, ?-letters settled later, lemmas as rules.
      series('backward', '倒着用规则', 'Rules backwards', ['r-rule', 'r-subgoals', 'r-assumption', 'r-meta', 'r-lemma']),
      // Elimination rules use a given up.
      series('elim', '用掉已知', 'Using givens up', ['r-elim', 'r-cases', 'r-false', 'r-dist']),
      // Patterns ?P(x), and the quantifier rules: backwards, forwards, kept.
      series('quant', '量词与模式', 'Quantifiers and patterns', ['r-pattern', 'r-allI', 'r-exI', 'r-drule', 'r-frule', 'r-exE']),
    ],
    challenges: [{ level: 'r-order', after: 'r-exE' }],
    chapter: { title: T('规则与元变量', 'Rules and metavariables'), question: T('卡片能不能自己从目标里读出该填的句子？', 'Can a card read off the goal what to fill in?') },
  },
  {
    id: 'tactics', machine: 'prover', keeps: 'all',
    foundation: [
      // Combinators on proof states: or else, repeat, both, try, every goal.
      series('combine', '组合', 'Combining', ['s-orelse', 's-repeat', 's-mix', 's-try', 's-each']),
      // Which goal settles a ?-letter; every result, append, depth-first search.
      series('backtrack', '回溯', 'Backtracking', ['s-defer', 's-results', 's-append', 's-search']),
      // Rule sets: the player's own auto, and what it leaves out.
      series('auto', '自己的 auto', 'Your own auto', ['s-intro', 's-elim', 's-auto', 's-lem']),
    ],
    // Prolog is rule resolution and depth-first search: it goes on from chapter 4's family tree.
    topics: [{ id: 'prolog', code: 'P', after: ['s-search', 'q-grand'], levels: ['pl-grand', 'pl-anc', 'pl-order'], title: T('用规则推族谱', 'A family tree by rules') }],
    challenges: [{ level: 's-loop', after: 's-search' }],
    chapter: { title: T('策略', 'Tactics'), question: T('能不能让机器自己去试该用哪条规则？', 'Can the machine try for itself which rule to use?') },
  },
  // Chapter 9 on are being rebuilt around Isabelle's and Lean's mechanisms (games/qed/DESIGN.md §3); their old levels
  // wait in levels/ (resolution, clauseform, theory, graduation) until each is rebuilt.
]
