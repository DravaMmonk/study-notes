// 《证明完毕》试做's encyclopedia: how the page is played, and the idea it tries out.
const T = (zh, en) => ({ zh, en })

export const GLOSSARY_GROUPS = [
  { id: 'play', title: T('玩法', 'How to play') },
  { id: 'logic', title: T('逻辑', 'Logic') },
]

export const GLOSSARY = [
  {
    id: 'lab', group: 'play', title: T('这是试做', 'This is a trial'),
    body: [
      T('这一页试做《证明完毕》的一种新路线：证明器的地基只有套用和假设框，公理 K、S 是用框证出来的元件。它和正式关卡分开存档，互不影响。', 'This page tries out a new route for Q.E.D.: the prover’s foundation is just Apply and the assumption box, and the axioms K and S are parts proved with boxes. Its saves are separate from the main levels’.'),
    ],
  },
  {
    id: 'foundation', group: 'logic', title: T('地基', 'The foundation'), at: 'box',
    body: [
      T('套用用掉一句「如果…那么…」，假设框造出一句。真实的证明器 Lean 的内核也从这一对开始：框是 λ 抽象，套用是函数应用。证明器只检查这两块元件用得对不对，其余的元件都是证出来的。', 'Apply uses an “if … then …” up; the assumption box makes one. The kernel of Lean, a real prover, starts from this pair too: the box is λ-abstraction, Apply is function application. The prover checks only that these two are used right; every other part is proved.'),
    ],
  },
]
