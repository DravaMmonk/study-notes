// 《证明完毕》试做: the Lean-style foundation, tried on a page of its own before the main course changes. The prover
// starts from Apply and the box; K and S are proved with boxes, and a topic does without the box.
const T = (zh, en) => ({ zh, en })

const branch = ([id, zh, en, levels]) => ({ id, title: T(zh, en), levels })
const series = (id, zh, en, levels) => ({ parallel: [branch([id, zh, en, levels])] })

export const ERAS = [
  {
    id: 'ground', machine: 'prover',
    foundation: [
      series('base', '地基', 'Foundation', ['copy', 'apply', 'box']),
      series('axioms', '公理成了元件', 'Axioms as parts', ['k', 's']),
      'chain',
    ],
    topics: [{ id: 'nobox', code: 'X', after: 'chain', levels: ['x-k', 'x-self', 'x-chain'], title: T('拆掉框', 'Without the box') }],
    chapter: { title: T('地基', 'The foundation'), question: T('只靠套用和假设框，能搭出什么？', 'What can be built from Apply and the assumption box alone?') },
  },
]
