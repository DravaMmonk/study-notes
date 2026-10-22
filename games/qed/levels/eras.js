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
      branches(['chain', '串联', 'Chain', ['chain', 'swap']], ['merge', '合并', 'Merge', ['ident', 'twice']]),
      'mergeUse', 'mergeLong', 'mergeBoth',
      // K and S, each proved with boxes and built as a part, need nothing from each other.
      branches(['k', 'K', 'K', ['k']], ['s', 'S', 'S', ['s']]),
    ],
    // Without the box: K, S and Apply alone, the way a prover with only axioms works, harder each time, once K and S
    // are both in hand: a condition, Apply under a condition, then the parts built with boxes rebuilt without one, each
    // back among the parts once rebuilt (a level's `without`): Chain (compiling a box away, the deduction theorem),
    // Swap, Identity, Merge.
    topics: [{ id: 'nobox', code: 'X', after: ['k', 's'], levels: ['x-k', 'x-s', 'x-chain', 'x-swap', 'x-self', 'x-merge'], title: T('拆掉框', 'Without the box') }],
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
        ['not', '矛盾与否定', 'Contradiction and not', ['bot', 'notI', 'mt', 'dni', 'contra', 'denyAnte']],
      ),
      series('mix', '组合', 'Together', ['dist', 'demorgan', 'dmUse']),
      series('classical', '反证法', 'By contradiction', ['notnotlem', 'raa', 'byContra', 'lemCases']),
    ],
    topics: [{ id: 'knights', code: 'K', after: 'lemCases', levels: ['kk-one', 'kk-two', 'kk-three'], title: T('骑士与无赖', 'Knights and knaves') }],
    challenges: [{ level: 'peirce', after: 'lemCases' }],
    chapter: { title: T('连接词', 'Connectives'), question: T('有了「与」「或」「非」，证明器还要哪些规则？', 'With “and”, “or” and “not”, what more rules does the prover need?') },
  },
]
