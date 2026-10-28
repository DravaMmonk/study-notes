// 《证明完毕》's course: one machine, the prover the player builds, module by module (one chapter each; the plan is
// games/qed/DESIGN.md §3). Chapter 0 has no machine: a sentence is checked by its truth table by hand. Truth circuits
// compute a sentence's value on every row; the kernel proves from two parts, Apply and the assumption box; then the
// connectives, the quantifiers' language and rules, rules with metavariables, tactics, classical logic, the
// simplifier, and proofs as programs. Everything built earlier stays in the prover. A mechanism comes where it is
// first needed: excluded middle when auto runs into it, and the equivalences, most of which need it, right after.
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
    practice: [series('kinds', '三种句子', 'Three kinds of sentence', ['g-always', 'g-iff'])],
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
      branches(['apply', '套用', 'Apply', ['mp', 'pick', 'nested']], ['assume', '假设框', 'Assumption box', ['assume']]),
      'box',
      // K and S, each proved with boxes and built as a part, need nothing from each other.
      branches(['k', 'K', 'K', ['k']], ['s', 'S', 'S', ['s']]),
    ],
    // Without the box: K, S and Apply alone, the way a prover with only axioms works, harder each time, once K and S
    // are both in hand (a level's `without` holds back the box and the parts built with it): a condition, Apply under a
    // condition, then Chain (compiling a box away, the deduction theorem) and Swap, Identity and Merge, each from K
    // and S alone.
    // It splits in two after X2: Chain then Swap on one branch, Identity then Merge on the other.
    topics: [
      { id: 'nobox', code: 'X', after: ['k', 's'], levels: ['x-k'], title: T('拆掉框', 'Without the box') },
      { id: 'nobox-chain', code: 'X', after: 'x-k', levels: ['x-chain', 'x-swap'], title: T('拆掉框：接起来与换顺序', 'Without the box: joining and reordering') },
      { id: 'nobox-merge', code: 'X', after: 'x-k', levels: ['x-merge'], title: T('拆掉框：恒等与说一遍', 'Without the box: identity and once') },
    ],
    chapter: { title: T('证明核', 'The kernel'), question: T('只靠套用和假设框，能证出什么？', 'What can Apply and the assumption box prove?') },
  },
  {
    id: 'packing', machine: 'prover',
    // The kernel's two parts carry on. First definitions: proofs given a name (Chain, Swap, Merge) on two lines, then
    // three levels with them. Then declarations: "and", "or" and the contradiction come into the kernel by their ways to
    // make them, each written as a rule with assumption cards (declare.js); an optional topic declares more (D).
    keeps: 'all',
    foundation: [
      // Chain, Swap and Merge, each built with boxes alone, on two lines that need nothing from each other; then the
      // three together, harder each time.
      branches(['chain', '串联', 'Chain', ['chain', 'swap']], ['merge', '合并', 'Merge', ['twice']]),
      'mergeLong', 'mergeBoth',
      'decl-and', 'decl-or', 'decl-bot',
    ],
    topics: [{ id: 'declare-more', code: 'D', after: 'decl-bot', levels: ['decl-three', 'decl-order', 'decl-two', 'decl-true', 'decl-iff'], title: T('更多声明', 'More declarations') }],
    chapter: { title: T('定义和声明', 'Definitions and declarations'), question: T('怎样把「与」「或」「非」引入证明核？', 'How do “and”, “or” and “not” come into the kernel?') },
  },
  {
    id: 'boxes', machine: 'prover',
    // The kernel extended: Apply, the box and the lemmas built with the kernel carry on.
    keeps: 'all',
    foundation: [
      // And, or and not each need only the box; the mixed problems wait for all three.
      branches(
        ['and', '并且', 'And', ['and', 'curry', 'iffUse']],
        ['or', '或者', 'Or', ['or', 'cases', 'orSwap']],
        ['not', '矛盾与否定', 'Contradiction and not', ['bot', 'notI', 'mt', 'denyAnte']],
      ),
      series('mix', '组合', 'Together', ['dist', 'dsyll']),
    ],
    // The connectives defined with → alone instead of declared, after the chapter's last level: optional proofs.
    topics: [{ id: 'hol', code: 'H', after: 'dsyll', levels: ['h-and-make', 'h-or-make'], title: T('不声明的连接词', 'Connectives without declaring') }],
    chapter: { title: T('连接词的运用', 'Using the connectives'), question: T('有了声明出来的「与」「或」「非」，能证出些什么？', 'With “and”, “or” and “not” declared, what can be proved?') },
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
        ['exists', '存在', 'There is', ['decl-ex', 'q-exI', 'q-exE', 'q-witness']],
      ),
      // With both in hand: quantifiers swapped and moved, and equality, its own mechanism; neither needs the other.
      branches(
        ['moving', '换序与挪动', 'Swapping and moving', ['q-swap', 'q-move', 'q-ancestor', 'q-bigger']],
        ['equality', '相等', 'Equality', ['decl-eq', 'q-eq', 'q-sym', 'q-trans']],
      ),
    ],
    topics: [{ id: 'carroll', code: 'S', after: 'q-move', levels: ['s-barbara', 's-darii', 's-carroll'], title: T('卡罗尔的推理题', 'Carroll’s puzzles') }],
    chapter: { title: T('量词规则', 'Quantifier rules'), question: T('怎样证明一句话在所有世界里都成立？', 'How do you prove a sentence holds in every world?') },
  },
  {
    id: 'metavars', machine: 'prover', keeps: 'all',
    foundation: [
      // The machine that unifies: splitting, all the way down in the repeat frame, then a rule of unification a level,
      // each going round with the others; all six make the unifier.
      series('unify', '合一', 'Unification', ['r-match', 'r-deep', 'r-delete', 'r-clash', 'r-twice', 'r-both', 'r-occurs', 'r-unifier']),
      // With the unifier, two lines need nothing from each other: on proof states, a goal replaced by a rule's premises,
      // ?-letters settled later, lemmas as rules, and elimination rules (a rule and Assumption, built into one part);
      // on equations, patterns ?P(x).
      branches(
        ['backward', '倒着用规则', 'Rules backwards', ['r-rule', 'r-subgoals', 'r-assumption', 'r-meta', 'r-lemma', 'r-elim', 'r-cases', 'r-false', 'r-dist']],
        ['pattern', '模式', 'Patterns', ['r-pattern', 'r-patterns']],
      ),
      // The quantifier rules need both: backwards, forwards (Have and a rule on a given, built into one part).
      series('quant', '量词的规则', 'Quantifier rules', ['r-allI', 'r-exI', 'r-drule', 'r-frule', 'r-exE']),
    ],
    challenges: [{ level: 'r-order', after: 'r-exE' }],
    chapter: { title: T('规则与元变量', 'Rules and metavariables'), question: T('元件能不能自己从目标里读出该填的句子？', 'Can a part read off the goal what to fill in?') },
  },
  {
    id: 'tactics', machine: 'prover', keeps: 'all',
    foundation: [
      // Combinators on proof states (repeat, alternatives, both, try, every goal) and backtracking (which goal settles a
      // ?-letter, every result) need nothing from each other.
      branches(
        ['combine', '组合', 'Combining', ['s-repeat', 's-orelse', 's-mix', 's-try', 's-each']],
        ['backtrack', '回溯', 'Backtracking', ['s-defer', 's-results']],
      ),
      // With both: alternatives keeping every way and depth-first search; every introduction and every elimination
      // rule as one part each.
      branches(
        ['search', '搜索', 'Search', ['s-append', 's-search']],
        ['shapes', '按形状', 'By shape', ['s-intro', 's-elim']],
      ),
      // The player's own auto.
      's-auto',
    ],
    // Prolog is rule resolution and depth-first search: it goes on from chapter 5's family tree.
    topics: [{ id: 'prolog', code: 'P', after: ['s-search', 'q-grand'], levels: ['pl-grand', 'pl-anc', 'pl-order'], title: T('用规则推族谱', 'A family tree by rules') }],
    challenges: [{ level: 's-loop', after: 's-search' }],
    chapter: { title: T('策略', 'Tactics'), question: T('能不能让证明助手自己去试该用哪条规则？', 'Can the proof assistant try for itself which rule to use?') },
  },
  {
    id: 'classical', machine: 'prover', keeps: 'all',
    foundation: [
      // auto runs into the wall; proof by contradiction comes in, and excluded middle with it.
      'c-wall', 'raa',
      // Proof by contradiction, excluded middle with cases, and proof by contradiction on the machine need nothing
      // from each other.
      branches(
        ['contra', '反证法', 'By contradiction', ['byContra', 'c-contra']],
        ['lem', '排中律', 'Excluded middle', ['lemCases', 'c-either']],
        ['machine', '证明助手上的反证法', 'By contradiction on the proof assistant', ['s-lem']],
      ),
      // Equivalences, the laws the simplifier will rewrite with: proved both ways, most by contradiction or excluded
      // middle, so after both.
      branches(
        ['laws', '等价律', 'Equivalences', ['c-dneg', 'c-arrow', 'c-dist']],
        ['demorgan', '德摩根', 'De Morgan', ['demorgan', 'q-dm']],
      ),
    ],
    // The islanders go on from the truth-circuit chapter's puzzles: its topic comes first.
    topics: [{ id: 'knights', code: 'K', after: ['e-three', 'lemCases'], levels: ['kk-one', 'kk-two', 'kk-three'], title: T('骑士与无赖', 'Knights and knaves') }],
    challenges: [{ level: 'peirce', after: 'lemCases' }, { level: 'drinker', after: 'q-dm' }],
    chapter: { title: T('经典逻辑', 'Classical logic'), question: T('真值表上每一行都真的话，证明器都证得出吗？', 'Does the prover prove everything true on every row?') },
  },
  {
    id: 'simplifier', machine: 'prover', keeps: 'all',
    foundation: [
      // The rewrite card, with double negation, proved both ways last chapter.
      'sp-rw',
      // More rewrite rules, De Morgan's and rewriting itself need nothing from each other.
      branches(
        ['laws', '更多改写规则', 'More rewrite rules', ['sp-laws']],
        ['demorgan', '推进否定', 'Negation pushed in', ['sp-dm', 'sp-back']],
        ['rewrite', '改写一处', 'One place', ['sp-where', 'sp-repeat']],
      ),
      // simp, built of rewrites in a repeat frame; then normal forms.
      'sp-simp',
      series('forms', '范式', 'Normal forms', ['sp-nnf', 'sp-cnf', 'sp-order']),
    ],
    chapter: { title: T('化简器', 'The simplifier'), question: T('「把否定推进去」这样的目标，能交给证明助手一路改下去吗？', 'Can a goal like “push the negation in” be left to a proof assistant that rewrites all the way?') },
  },
  {
    id: 'automation', machine: 'prover', keeps: 'all',
    foundation: [
      // Clause form, on proof states: by contradiction, ↔ out, the hypotheses to CNF, ∃ out, split.
      series('clause', '子句形式', 'Clause form', ['au-negate', 'au-iff', 'au-hyps', 'au-skolem', 'au-clauses']),
      // Resolution proved, done by hand, one pair at a time, and saturated.
      series('resolve', '归结', 'Resolution', ['au-resolve', 'au-refute', 'au-onepair', 'au-saturate']),
      'au-sledge',
      // Certificates: by hand, by the kernel, and someone else's prover caught out.
      series('cert', '证书', 'Certificates', ['au-cert', 'au-replay', 'au-wrong']),
    ],
    practice: [series('use', '交给证明助手', 'Handed to the proof assistant', ['au-adder', 'au-machine'])],
    topics: [
      { id: 'islanders-more', code: 'N', after: ['au-replay', 'kk-three'], levels: ['is-three', 'is-silent', 'is-ten'], title: T('岛民变多', 'More islanders') },
      { id: 'bounds', code: 'U', after: ['au-machine', 'kk-one'], levels: ['u-barber', 'u-cantor', 'u-ls', 'u-halt'], title: T('机器做不到的事', 'What no machine can do') },
    ],
    challenges: [{ level: 'au-horn', after: 'au-saturate' }],
    chapter: { title: T('自动化与证书', 'Automation and certificates'), question: T('证明能交给证明助手去找吗？证明助手找到的，凭什么信？', 'Can a proof assistant be left to find proofs, and why believe what it finds?') },
  },
  {
    id: 'inductive', machine: 'prover', keeps: 'all',
    foundation: [
      // Sums worked out by hand on the proof board, then by simp with the definitions: lists, conditions, a given,
      // under ∀.
      series('defs', '定义当规则', 'Definitions as rules', ['nl-plus', 'sp-compute', 'sp-lists', 'sp-cond', 'sp-hyp', 'sp-under']),
      // The rules a declaration gives, ending with induction (by hand, then on the machine).
      series('decl', '声明给出的规则', 'What a declaration gives', ['decl-nat', 'in-distinct', 'in-inject', 'in-cases', 'in-zero']),
      // Numbers, lists and why a definition must stop need nothing from each other.
      branches(
        ['nat', '数', 'Numbers', ['in-succ', 'in-comm', 'in-assoc']],
        ['list', '列表', 'Lists', ['in-appnil', 'in-appassoc', 'in-revapp']],
        ['stop', '为什么要停', 'Why it must stop', ['in-noteq', 'in-loop']],
      ),
    ],
    practice: [series('both', '数和列表', 'Numbers and lists', ['in-len', 'in-revrev', 'in-itsum'])],
    topics: [
      { id: 'sort', code: 'I', after: 'in-appnil', levels: ['sort-ins', 'sort-run', 'sort-insLen', 'sort-len'], title: T('插入排序', 'Insertion sort') },
      { id: 'goedel', code: 'G', after: ['in-itsum', 'u-halt'], levels: ['gd-true', 'gd-con', 'gd-second'], title: T('真的，却证不出', 'True, yet unprovable') },
    ],
    challenges: [{ level: 'in-circle', after: 'in-comm' }],
    chapter: { title: T('数与列表', 'Numbers and lists'), question: T('数和列表怎么算、从哪里来？对每一个数都成立的事，怎么证？', 'How are numbers and lists worked out, and where do they come from? How is something proved for every number?') },
  },
  {
    id: 'terms', machine: 'prover', keeps: 'all',
    foundation: [
      // Reading terms: functions, then the data the other connectives' proofs are.
      series('read', '读证明项', 'Reading proof terms', ['t-app', 't-lam', 't-pair']),
      // Once terms can be read, their detours and the quantifiers' terms need nothing from each other.
      branches(
        ['detour', '弯路', 'Detours', ['t-beta', 't-lemma']],
        ['quant', '量词的证明项', 'Quantifiers’ proof terms', ['t-all']],
      ),
      // Then the terms written, of every part wired before: functions (and lemmas), data, quantifiers; the kernel.
      series('write', '写证明项', 'Writing proof terms', ['t-wapp', 't-wpair', 't-wquant', 't-kernel']),
    ],
    challenges: [{ level: 't-dneg', after: 't-wpair' }],
    chapter: { title: T('证明即程序', 'Proofs are programs'), question: T('接出来的证明本身是什么？', 'What is a wired proof, itself?') },
  },
  {
    id: 'equality', machine: 'prover', keeps: 'all',
    foundation: [
      // An equation is a type: its one way in (rfl), its one way out (▸, the rewrite card), and the motive.
      series('eqtype', '相等是类型', 'An equation is a type', ['eq-rfl', 'eq-rec', 'eq-symm', 'eq-trans', 'eq-motive']),
      // What the kernel computes, and types depending on a value, need nothing from each other.
      branches(
        ['kinds', '两种相等', 'Two kinds of equality', ['eq-defeq', 'rf-eval', 'rf-decide', 'rf-false', 'eq-propeq']],
        ['dep', '依赖类型', 'Dependent types', ['dt-vec', 'dt-head']],
      ),
    ],
    practice: [series('both', '两样一起', 'Both together', ['dt-app', 'dt-transport'])],
    challenges: [{ level: 'dt-snoc', after: 'dt-transport' }],
    chapter: { title: T('依赖类型与相等', 'Dependent types and equality'), question: T('等式本身是什么？类型能依赖一个值吗？', 'What is an equation itself, and can a type depend on a value?') },
  },
  {
    id: 'structured', machine: 'prover', keeps: 'all',
    foundation: [
      // Reading scripts: each row's by, then the same proof wired.
      series('read', '读脚本', 'Reading scripts', ['sc-rows', 'sc-block', 'sc-tactic']),
      // Writing them: a missing have, one row by a machine.
      series('write', '写脚本', 'Writing scripts', ['sc-have', 'sc-show']),
      // For any and take the one there is, as blocks, need nothing from each other.
      branches(
        ['fix', 'fix', 'fix', ['sc-fix']],
        ['obtain', 'obtain', 'obtain', ['sc-obtain']],
      ),
    ],
    practice: [series('whole', '整段脚本', 'Whole scripts', ['sc-knights', 'sc-revrev', 'sc-barber'])],
    chapter: { title: T('结构化证明', 'Structured proofs'), question: T('证明写成什么样，人读得懂，核也查得了？', 'How is a proof written so people can read it and the kernel can check it?') },
  },
]
