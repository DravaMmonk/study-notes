// 《证明完毕》试做: the Lean-style prover in two chapters, tried on a page of its own before the main course changes.
// The foundation is Apply and the box; K and S are proved with boxes, and a topic does without the box. Then the
// player declares connectives by designing their rules against their truth tables.
const T = (zh, en) => ({ zh, en })

const branch = ([id, zh, en, levels]) => ({ id, title: T(zh, en), levels })
const series = (id, zh, en, levels) => ({ parallel: [branch([id, zh, en, levels])] })
const branches = (...list) => ({ parallel: list.map(branch) })

export const ERAS = [
  {
    id: 'ground', machine: 'prover',
    foundation: [
      series('base', '地基', 'Foundation', ['copy', 'apply', 'box']),
      series('axioms', '公理成了元件', 'Axioms as parts', ['k', 's']),
      'chain',
    ],
    topics: [{ id: 'nobox', code: 'X', after: 's', levels: ['x-k', 'x-self', 'x-chain'], title: T('拆掉框', 'Without the box') }],
    chapter: { title: T('地基', 'The foundation'), question: T('只靠套用和假设框，能搭出什么？', 'What can be built from Apply and the assumption box alone?') },
  },
  {
    id: 'connectives', machine: 'prover',
    // The prover extended: the foundation and its parts carry on.
    keeps: 'all',
    foundation: [
      // And, or and false each need only the foundation; mixing them waits for all three.
      branches(
        ['and', '与', 'And', ['and-in', 'and-out', 'and-swap', 'and-left', 'and-use']],
        ['or', '或', 'Or', ['or-in', 'or-out', 'or-swap', 'or-imp']],
        ['bot', '假', 'False', ['bot-in', 'bot-out', 'bot-use', 'not-intro', 'mt']],
      ),
      'dist',
    ],
    chapter: { title: T('连接词', 'Connectives'), question: T('证明器只认识「如果…那么…」，怎样教会它「与」「或」「假」？', 'The prover knows only “if … then …”: how do you teach it “and”, “or” and “false”?') },
  },
]
