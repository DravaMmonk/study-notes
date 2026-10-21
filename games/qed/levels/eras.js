// 《证明完毕》's course by era (games/DESIGN.md): one proof machine per era. Era 0 has none: a proposition is checked
// by its truth table. Mark I proves everything from Detach and two axioms, slowly; its topic rewrites a proof under a
// hypothesis into one without it (the deduction theorem), which Mark II then has built in as the assumption box.
// Parts go with the machine: Mark II keeps only Detach, leaves K, S and the lemmas built from them behind, and
// rebuilds the ones it needs with its boxes.
const T = (zh, en) => ({ zh, en })

// A named stretch of the main path (one branch of a `parallel` set): each new rule, then practice with it.
const series = (id, zh, en, levels) => ({ parallel: [{ id, title: T(zh, en), levels }] })

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
      series('k', '公理 K', 'Axiom K', ['k', 'k2', 'kmp']),
      series('s', '公理 S', 'Axiom S', ['s', 'chain', 'short', 'self']),
    ],
    practice: [series('library', '用元件', 'Using your parts', ['long', 'swap', 'swapUse', 'twice', 'mergeUse', 'wrongChain'])],
    topics: [{ id: 'deduction', code: 'D', after: 'self', levels: ['dt-mp', 'dt-whole'], title: T('演绎定理', 'The deduction theorem') }],
    challenges: [{ level: 'hs', after: 'swap' }],
    chapter: { title: T('初号', 'Mark I'), question: T('只靠一条规则和两条公理，能证出什么？', 'What can one rule and two axioms prove?') },
  },
  {
    id: 'mk2', machine: 'mk2', keeps: ['mp'],
    foundation: [
      series('box', '假设框', 'The assumption box', ['box', 'chain2', 'nest', 'swap2', 'merge2', 'sbox', 'chainUse']),
      series('and', '并且', 'And', ['and', 'andSwap', 'curry', 'uncurry', 'andImp']),
      series('or', '或者', 'Or', ['or', 'cases', 'orSwap', 'orImp', 'dist']),
      series('not', '矛盾与否定', 'Contradiction and not', ['bot', 'notI', 'mt', 'dni', 'contra', 'demorgan', 'dmUse', 'denyAnte']),
      series('classical', '反证法', 'By contradiction', ['notnotlem', 'raa', 'byContra', 'lemCases']),
    ],
    topics: [{ id: 'knights', code: 'K', after: 'lemCases', levels: ['kk-one', 'kk-two', 'kk-three'], title: T('骑士与无赖', 'Knights and knaves') }],
    challenges: [{ level: 'peirce', after: 'lemCases' }],
    chapter: { title: T('二号', 'Mark II'), question: T('先假设，再证明：框里的推理怎样变成框外的定理？', 'Assume, then prove: how does reasoning inside a box become a theorem outside it?') },
  },
]
