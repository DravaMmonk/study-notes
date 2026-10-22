// 《证明完毕》试做's encyclopedia: how the page is played, and the two ideas it tries out.
const T = (zh, en) => ({ zh, en })

export const GLOSSARY_GROUPS = [
  { id: 'play', title: T('玩法', 'How to play') },
  { id: 'logic', title: T('逻辑', 'Logic') },
]

export const GLOSSARY = [
  {
    id: 'lab', group: 'play', title: T('这是试做', 'This is a trial'),
    body: [
      T('这一页试做《证明完毕》的一种新路线：证明器的地基只有套用和假设框，其余的连接词由你设计规则加上去。它和正式关卡分开存档，互不影响。', 'This page tries out a new route for Q.E.D.: the prover’s foundation is just Apply and the assumption box, and you add every other connective by designing its rules. Its saves are separate from the main levels’.'),
    ],
  },
  {
    id: 'foundation', group: 'logic', title: T('地基', 'The foundation'), at: 'box',
    body: [
      T('套用用掉一句「如果…那么…」，假设框造出一句。真实的证明器 Lean 的内核也从这一对开始：框是 λ 抽象，套用是函数应用。证明器只检查这两块元件用得对不对，其余的元件都是证出来的。', 'Apply uses an “if … then …” up; the assumption box makes one. The kernel of Lean, a real prover, starts from this pair too: the box is λ-abstraction, Apply is function application. The prover checks only that these two are used right; every other part is proved.'),
    ],
  },
  {
    id: 'inversion', group: 'logic', title: T('造法与用法', 'Making and using up'), at: 'and-out',
    body: [
      T('一个连接词有两类规则：<b>造法</b>说什么时候能断言它，<b>用法</b>说拿到它能做什么。造法从真值表为真的行读出；用法由造法决定：一种造法一个框，框里假设那种造法交出去的东西（反演原理）。', 'A connective has two kinds of rule: the <b>ways to make it</b> say when it may be claimed, the <b>way to use it up</b> what holding one gives. The ways to make it are read off the true rows of its table; using it up is fixed by them: one box per way, assuming what that way took (the inversion principle).'),
      T('Lean 声明一个归纳类型时，就是这样自动生成规则的：构造子是造法，递归子是用法。', 'When Lean declares an inductive type it generates its rules exactly so: the constructors are the ways to make it, the recursor the way to use it up.'),
    ],
  },
]
