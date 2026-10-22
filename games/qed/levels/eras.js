// 《证明完毕》's course: one machine, the prover the player builds, module by module (one chapter each). Chapter 0 has
// no machine: a sentence is checked by its truth table by hand. Truth circuits compute a sentence's value on every
// row; the kernel proves from Detach and two axioms alone; its topic rewrites a proof under a hypothesis into one
// without it (the deduction theorem), which the assumption box then makes a single part, taking the place of K and S.
// Everything built earlier stays in the prover.
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
    id: 'circuits', machine: 'prover',
    foundation: [
      series('gates', '门', 'Gates', ['g-not', 'g-and', 'g-tree']),
      series('build', '造门', 'Building gates', ['g-or', 'g-imp']),
    ],
    practice: [series('kinds', '三种句子', 'Three kinds of sentence', ['g-always', 'g-never', 'g-iff'])],
    topics: [{ id: 'islanders', code: 'E', after: 'g-iff', levels: ['e-words', 'e-one', 'e-two', 'e-three'], title: T('把谜题接成电路', 'A puzzle as a circuit') }],
    challenges: [{ level: 'g-xor', after: 'g-or' }],
    chapter: { title: T('真值电路', 'Truth circuits'), question: T('一句话在每一种情况下是真是假，能交给电路去算吗？', 'Can a circuit work out whether a sentence is true in every case?') },
  },
  {
    id: 'kernel', machine: 'prover',
    foundation: [
      series('detach', '分离', 'Detach', ['copy', 'mp', 'pick', 'nested', 'cond']),
      // K and S need nothing from each other; what joins them waits for both.
      branches(['k', '公理 K', 'Axiom K', ['k', 'k2', 'kmp']], ['s', '公理 S', 'Axiom S', ['s', 's2']]),
      series('ks', 'K 和 S 一起', 'K and S together', ['chain', 'short', 'self']),
    ],
    practice: [
      branches(['swap', '交换', 'Swap', ['long', 'swap', 'swapUse']], ['merge', '合并', 'Merge', ['twice', 'mergeUse']]),
      'wrongChain',
    ],
    topics: [{ id: 'deduction', code: 'D', after: 'self', levels: ['dt-mp', 'dt-whole'], title: T('演绎定理', 'The deduction theorem') }],
    challenges: [{ level: 'hs', after: 'swap' }],
    chapter: { title: T('证明核', 'The kernel'), question: T('只靠一条规则和两条公理，能证出什么？', 'What can one rule and two axioms prove?') },
  },
  {
    id: 'boxes', machine: 'prover',
    foundation: [
      'box',
      series('axioms', '公理成了定理', 'Axioms as theorems', ['nest', 'sbox']),
      'chainUse',
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
    chapter: { title: T('假设框', 'Assumption boxes'), question: T('先假设，再证明：框里的推理怎样变成框外的定理？', 'Assume, then prove: how does reasoning inside a box become a theorem outside it?') },
  },
]
