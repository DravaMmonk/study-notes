// Chapter 6's topic, after For any · Connectives without declaring them: “and” and “or” defined with → and a ∀ over
// sentences. A ∧ B is ∀R. (A → B → R) → R and A ∨ B is ∀R. (A → R) → (B → R) → R: R is any sentence at all, taken by
// the for-any box naming R (proof.js allI) and put in by choosing an instance (allE), the parts of chapter 6.
// Each definition is the elimination rule the declaration gave, and the rules that make and use the connective are
// proved from it with Apply, the box and K. Some provers define the connectives this way (the encyclopedia says
// which); the levels say only what the definition means. Optional proofs.
import { proof } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })
const prove = (level) => ({ kind: 'proof', ...level })
const AND = [{ A: 'Rain', B: 'Wind' }, { A: 'Sat', B: 'Sun' }]
const OR = [{ A: 'Bus', B: 'Bike', C: 'OnTime' }, { A: 'Sat', B: 'Sun', C: 'Rest' }]

export const hol = [
  {
    id: 'h-and-make',
    title: T('定义「并且」', 'Defining “and”'),
    tasks: [
      {
        kind: 'proof',
        step: T('造', 'Making it'),
        tests: [{ premises: { p: 'A', q: 'B' }, goal: '∀R. (A → (B → R)) → R' }],
        cases: AND,
        hint: [
          T('目标对任何一句话 R 都要成立：先放一个任取框，取的名字选 R。', 'The goal must hold for every sentence R: start with a for-any box, taking the name R.'),
          T('框里的目标是一句「若…则…」：假设「A → (B → R)」，套用两次。', 'Inside, the goal is an “if … then …”: assume “A → (B → R)” and Apply twice.'),
        ],
        solution: proof({ s: ['allI', { x: 'R' }], f: ['impI', { A: 'A → B → R' }, 's'], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['f#body>m1.imp', 'p>m1.a', 'm1>m2.imp', 'q>m2.a', 'm2>f.body', 'f>s.body', 's>goal'], { premises: ['p', 'q'] }),
      },
      {
        kind: 'proof',
        step: T('拆', 'Taking it apart'),
        tests: [{ premises: { p: '∀R. (A → (B → R)) → R' }, goal: 'A' }],
        cases: AND,
        intro: [{ t: T('定义对任何一句话 R 都成立，那就挑一句合用的：R 可以是 A 本身。', 'The definition holds for every sentence R, so pick one that serves: R may be A itself.') }],
        hint: [
          T('用选定一例把 R 换成「A」，得到「(A → (B → A)) → A」。', 'Choose an instance: put “A” in for R, to get “(A → (B → A)) → A”.'),
          T('要套用它，还缺「A → (B → A)」：<part-ref to="lemma:axK"></part-ref>给得出。', 'To apply it, “A → (B → A)” is missing: <part-ref to="lemma:axK"></part-ref> gives it.'),
        ],
        solution: proof({ e: ['allE', { t: 'A' }], k: ['axK', { A: 'A', B: 'B' }], m: ['mp'] }, ['p>e.all', 'e>m.imp', 'k>m.a', 'm>goal'], { premises: ['p'] }),
      },
    ],
    intro: [
      { t: T('<level-ref to="decl-and"></level-ref>用声明把「并且」引入证明核。另一种办法不声明，只用已有的 → 和量词：「A 并且 B」就是「对任何一句话 R，只要从 A 和 B 推得出 R，就有 R」，写成 ∀R. (A → (B → R)) → R。', '<level-ref to="decl-and"></level-ref> brought “and” into the kernel by a declaration. Another way declares nothing and uses the → and quantifier already there: “A and B” is “for every sentence R, if R follows from A and B, then R”, written ∀R. (A → (B → R)) → R.') },
      { t: T('这里的 ∀ 管的不是一样东西，而是一句话。还是那两块元件：<part-ref to="part:allI"></part-ref>取的名字选大写的 R，框里的 R 就是任意一句话；<part-ref to="part:allE"></part-ref>选的不是一样东西，而是一句话，换掉 R。', 'This ∀ ranges not over things but over sentences. The same two parts handle it: take the upper-case name R in the <part-ref to="part:allI"></part-ref>, and inside it R is any sentence at all; in <part-ref to="part:allE"></part-ref> choose not a thing but a sentence, to put in for R.') },
    ],
    after: T('R 能换成任何一句话，连「A 并且 B」这句正在定义的话本身也行。允许这样做，这种定义才写得出来；有的证明器正是这样只用 → 和 ∀ 定义连接词，而不声明它们。', 'R may be any sentence, even the very “A and B” being defined. Only because that is allowed can the definition be written at all; some provers define the connectives just this way, with → and ∀, instead of declaring them.'),
  },
  {
    id: 'h-or-make',
    title: T('定义「或者」', 'Defining “or”'),
    tasks: [
      {
        kind: 'proof',
        step: T('造', 'Making it'),
        tests: [{ premises: { p: 'A' }, goal: '∀R. (A → R) → ((B → R) → R)' }],
        cases: OR,
        hint: [T('任取框取 R；框里的目标有两层「若…则…」。', 'A for-any box takes R; inside, the goal has two layers of “if … then …”.')],
        solution: proof({ s: ['allI', { x: 'R' }], f: ['impI', { A: 'A → R' }, 's'], g: ['impI', { A: 'B → R' }, 'f'], m: ['mp', {}, 'g'] }, ['f#body>m.imp', 'p>m.a', 'm>g.body', 'g>f.body', 'f>s.body', 's>goal'], { premises: ['p'] }),
      },
      {
        kind: 'proof',
        step: T('用', 'Using it'),
        tests: [{ premises: { p: '∀R. (A → R) → ((B → R) → R)', q: 'A → C', r: 'B → C' }, goal: 'C' }],
        cases: OR,
        hint: [T('要的结论是 C：把 R 换成 C，再把两个办法依次交给它。', 'The conclusion wanted is C: put C in for R, then hand it the two moves in turn.')],
        solution: proof({ e: ['allE', { t: 'C' }], m1: ['mp'], m2: ['mp'] }, ['p>e.all', 'e>m1.imp', 'q>m1.a', 'm1>m2.imp', 'r>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      },
    ],
    intro: [{ t: T('「或者」也可以这样定义：「A 或者 B」就是「对任何一句话 R，只要从 A 推得出 R、从 B 也推得出 R，就有 R」，写成 ∀R. (A → R) → ((B → R) → R)。', '“Or” can be defined the same way: “A or B” is “for every sentence R, if R follows from A and R follows from B, then R”, written ∀R. (A → R) → ((B → R) → R).') }],
    after: T('声明给出引入规则，由它生成消去规则；这样的定义写下的是消去规则，引入规则要从它证出来。两条路得到的规则一样。', 'A declaration gives the intro rules and the elimination rule is made from them; a definition like this writes down the elimination rule, and the intro rules are proved from it. Both roads give the same rules.'),
  },
]
