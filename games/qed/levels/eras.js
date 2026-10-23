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
        ['and', '并且', 'And', ['and', 'andSwap', 'curry', 'uncurry', 'andImp']],
        ['or', '或者', 'Or', ['or', 'cases', 'orSwap', 'orImp']],
        ['not', '矛盾与否定', 'Contradiction and not', ['bot', 'exFalso', 'notI', 'mt', 'dni', 'contra', 'denyAnte']],
      ),
      series('mix', '组合', 'Together', ['dist', 'dsyll', 'demorgan', 'dmUse']),
      series('classical', '反证法', 'By contradiction', ['notnotlem', 'raa', 'byContra', 'lemCases']),
    ],
    // The islanders go on from the truth-circuit chapter's puzzles: its topic comes first.
    topics: [{ id: 'knights', code: 'K', after: ['e-three', 'lemCases'], levels: ['kk-one', 'kk-two', 'kk-three'], title: T('骑士与无赖', 'Knights and knaves') }],
    challenges: [{ level: 'peirce', after: 'lemCases' }],
    chapter: { title: T('连接词', 'Connectives'), question: T('有了「与」「或」「非」，证明器还要哪些规则？', 'With “and”, “or” and “not”, what more rules does the prover need?') },
  },
  {
    id: 'resolution', machine: 'prover',
    // The prover keeps every module; each board shows the parts it runs.
    keeps: 'all',
    foundation: [
      // Rewriting and clauses need nothing from each other; refutation needs both.
      branches(
        ['rewrite', '改写', 'Rewriting', ['law-dneg', 'subst', 'law-imp', 'law-dm', 'nnf', 'law-dist', 'cnf']],
        ['clauses', '子句与归结', 'Clauses and resolution', ['resolve', 'refute', 'onePair', 'repeat', 'satisfiable']],
      ),
      series('refutation', '反驳', 'Refutation', ['entail', 'valid', 'manyKnown', 'circuit']),
    ],
    // The islanders again, after the connectives chapter's.
    topics: [{ id: 'islanders-more', code: 'R', after: ['kk-three', 'entail'], levels: ['r-three', 'r-silent', 'r-ten'], title: T('岛民变多', 'More islanders') }],
    chapter: { title: T('归结', 'Resolution'), question: T('证明器能不能自己找证明？', 'Can the prover find proofs by itself?') },
  },
  {
    id: 'quantifiers', machine: 'prover', keeps: 'all',
    foundation: [
      // Saying first-order sentences and building worlds for them need nothing from each other.
      branches(
        ['translate', '翻译', 'Translating', ['fo-atoms', 'fo-all', 'fo-some', 'fo-nested']],
        ['worlds', '造世界', 'Building worlds', ['m-world', 'm-make', 'm-counter', 'm-order']],
      ),
      'finite',
    ],
    practice: [series('splitting', '量词怎么拆', 'Taking quantifiers apart', ['p-only', 'p-split', 'p-exAnd'])],
    topics: [{ id: 'family', code: 'F', after: 'finite', levels: ['q-children', 'q-grand', 'q-none', 'q-school'], title: T('查族谱', 'Asking a family tree') }],
    chapter: { title: T('量词与模型', 'Quantifiers and models'), question: T('「每一个」「有一个」怎么说，什么时候为真？', 'How do you say “every” and “some”, and when are they true?') },
  },
  {
    id: 'qrules', machine: 'prover', keeps: 'all',
    foundation: [
      // ∀ and ∃ each need only the proof board; equality comes once both are in hand.
      branches(
        ['forall', '对所有', 'For all', ['q-allE', 'q-allI', 'q-rename', 'q-allAnd', 'q-capture']],
        ['exists', '存在', 'There is', ['q-exI', 'q-exE', 'q-witness']],
      ),
      series('equality', '相等', 'Equality', ['q-eq', 'q-sym', 'q-trans']),
    ],
    practice: [series('moving', '换序与挪动', 'Swapping and moving', ['q-swap', 'q-move', 'q-ancestor', 'q-bigger'])],
    topics: [{ id: 'carroll', code: 'S', after: 'q-trans', levels: ['s-barbara', 's-darii', 's-carroll'], title: T('卡罗尔的推理题', 'Carroll’s puzzles') }],
    challenges: [{ level: 'drinker', after: 'q-swap' }],
    chapter: { title: T('量词规则', 'Quantifier rules'), question: T('怎样证明一句话在所有世界里都成立？', 'How do you prove a sentence holds in every world?') },
  },
  {
    id: 'unification', machine: 'prover', keeps: 'all',
    foundation: [
      // Solving equations and putting formulas into clause form need nothing from each other; resolution needs both.
      branches(
        ['unify', '合一', 'Unification', ['u-decompose', 'u-conflict', 'u-swap', 'u-eliminate', 'u-unifier']],
        ['clauseform', '子句形式', 'Clause form', ['c-prenex', 'c-skolem', 'c-clauseForm']],
      ),
      series('foResolution', '一阶归结', 'First-order resolution', ['f-resolve', 'f-factor', 'f-refute']),
    ],
    challenges: [{ level: 'u-occurs', after: 'u-eliminate' }],
    chapter: { title: T('合一', 'Unification'), question: T('子句里有变量时，怎样归结？', 'How do you resolve clauses with variables?') },
  },
  {
    id: 'tactics', machine: 'prover', keeps: 'all',
    foundation: [
      series('backward', '倒着证', 'Proving backwards', ['tac-intro', 'tac-steps', 'tac-and', 'tac-elim', 'tac-twoWays']),
      series('combinators', '组合子', 'Combinators', ['tac-repeat', 'tac-orelse', 'tac-auto']),
    ],
    practice: ['tac-lem'],
    // The family trees again, after chapter 5's queries.
    topics: [{ id: 'prolog', code: 'P', after: ['q-school', 'tac-intro'], levels: ['p-grand', 'p-anc', 'p-order'], title: T('用规则推族谱', 'Rules over a family tree') }],
    chapter: { title: T('策略', 'Tactics'), question: T('证明器能不能自己证明？', 'Can the prover prove by itself?') },
  },
  {
    id: 'theory', machine: 'prover', keeps: 'all',
    foundation: [
      series('simp', '化简', 'Simplification', ['th-compute', 'th-lists']),
      // Numbers and lists are inducted on alike; each line's lemmas stand on the ones before.
      branches(
        ['natInduction', '数的归纳', 'Induction on numbers', ['th-zero', 'th-succ', 'th-comm', 'th-assoc']],
        ['listInduction', '列表的归纳', 'Induction on lists', ['th-appNil', 'th-appAssoc', 'th-revApp']],
      ),
    ],
    practice: ['th-len', 'th-revrev'],
    topics: [{ id: 'sorting', code: 'I', after: 'th-appNil', levels: ['sort-ins', 'sort-run', 'sort-insLen', 'sort-len'], title: T('插入排序', 'Insertion sort') }],
    challenges: [{ level: 'tail-sum', after: 'th-assoc' }, { level: 'loop', after: 'th-comm' }],
    chapter: { title: T('理论', 'Theories'), question: T('数和列表的事，怎样让机器来证？', 'How does a machine prove things about numbers and lists?') },
  },
  {
    id: 'graduation', machine: 'prover', keeps: 'all',
    foundation: [series('automata', '自动机', 'Automata', ['dfa-run', 'dfa-runApp', 'dfa-same'])],
    practice: ['dfa-product'],
    // The liar of chapter 3's islanders grows into the diagonal argument: its topic comes first.
    topics: [{ id: 'undecidable', code: 'U', after: ['kk-one', 'dfa-run'], levels: ['u-barber', 'u-cantor', 'u-ls', 'u-halt'], title: T('不可判定', 'Undecidable') }],
    challenges: [{ level: 'fooling', after: 'dfa-same' }],
    chapter: { title: T('毕业', 'Graduation'), question: T('用整台证明器，能证明计算的极限吗？', 'Can the whole prover prove the limits of computation?') },
  },
]
