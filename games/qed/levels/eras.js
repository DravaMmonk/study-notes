// 《证明完毕》's course by era (games/DESIGN.md): one proof machine per era. Era 0 has none: a proposition is checked
// by its truth table. Mark I proves everything from Detach and two axioms, slowly; its topic rewrites a proof under a
// hypothesis into one without it (the deduction theorem), which Mark II then has built in as the assumption box.
// Parts go with the machine: Mark II keeps only Detach, leaves K, S and the lemmas built from them behind, and
// rebuilds the ones it needs with its boxes.
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
    id: 'mk1', machine: 'mk1',
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
    chapter: { title: T('初号', 'Mark I'), question: T('只靠一条规则和两条公理，能证出什么？', 'What can one rule and two axioms prove?') },
  },
  {
    id: 'mk2', machine: 'mk2', keeps: ['mp'],
    foundation: [
      'box',
      // Rebuilding Mark I's parts and proving its axioms both need only the box.
      branches(['rebuild', '重造元件', 'Rebuilding parts', ['chain2', 'swap2', 'merge2']], ['axioms', '公理成了定理', 'Axioms as theorems', ['nest', 'sbox']]),
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
    chapter: { title: T('二号', 'Mark II'), question: T('先假设，再证明：框里的推理怎样变成框外的定理？', 'Assume, then prove: how does reasoning inside a box become a theorem outside it?') },
  },
]
