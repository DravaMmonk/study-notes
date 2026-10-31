// Defined rather than declared, the topics of chapter 6. Connectives without declaring them (after For any): “and” and “or” defined with → and a ∀ over
// sentences. A ∧ B is ∀R. (A → B → R) → R and A ∨ B is ∀R. (A → R) → (B → R) → R: R is any sentence at all, taken by
// the for-any box naming R (proof.js allI) and put in by choosing an instance (allE), the parts of chapter 6.
// Each definition is the elimination rule the declaration gave, and the rules that make and use the connective are
// proved from it with Apply, the box and K: the way of Isabelle/HOL. Equality without declaring it (after Declaring
// equality): a = b is ∀P. P(a) → P(b), P any property (proof.js allE puts in a sentence about x for it), and
// reflexivity, substitution and symmetry are proved from it. Optional proofs.
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
    after: T('R 能换成任何一句话，连「A 并且 B」这句正在定义的话本身也行。允许这样做，这种定义才写得出来。Isabelle/HOL 走的就是这条路：「并且」「或者」不声明，而是这样用 → 和 ∀ 定义出来，规则再从定义证出。', 'R may be any sentence, even the very “A and B” being defined. Only because that is allowed can the definition be written at all. Isabelle/HOL takes this road: “and” and “or” are not declared but defined this way, with → and ∀, and their rules proved from the definitions.'),
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

// a = b defined as ∀P. P(a) → P(b): whatever holds of a holds of b. P is any property, a sentence about x.
const LEIB = '∀P. P(phos) → P(hesp)'
const STAR = { consts: ['phos', 'hesp'] }

export const leibniz = [
  {
    id: 'h-eq-refl',
    kind: 'proof',
    title: T('定义相等：自反', 'Defining equality: reflexivity'),
    ...STAR,
    tests: [{ premises: {}, goal: '∀P. P(phos) → P(phos)' }],
    cases: [],
    brief: T('不用任何已知，证明：对任何性质 P，晨星有 P，晨星就有 P。', 'From nothing, prove: for every property P, if the Morning Star has P, the Morning Star has P.'),
    hint: [
      T('任取框取的名字选 P：框里 P 是任意一种性质。', 'Take the name P in the for-any box: inside, P is any property at all.'),
      T('框里是一个假设框：它的假设就是它要的结论。', 'Inside goes an assumption box whose assumption is just the conclusion it wants.'),
    ],
    solution: proof({ s: ['allI', { x: 'P' }], f: ['impI', { A: 'P(phos)' }, 's'] }, ['f#body>f.body', 'f>s.body', 's>goal']),
    intro: [
      { t: T('<level-ref to="decl-eq"></level-ref>把相等声明进了证明核。也可以不声明，用量词定义它：「a = b」就是「a 有的性质，b 都有」，写成 ∀P. P(a) → P(b)。', '<level-ref to="decl-eq"></level-ref> declared equality into the kernel. It can also be defined with a quantifier instead: “a = b” is “every property a has, b has”, written ∀P. P(a) → P(b).') },
      { t: T('这里的 ∀ 管的是性质：P(x) 是一句说 x 的话。<part-ref to="part:allI"></part-ref>取大写的 P。按这个定义，晨星 = 晨星 写出来就是这一关的目标。', 'This ∀ ranges over properties: P(x) is a sentence about x. The <part-ref to="part:allI"></part-ref> takes the upper-case P. By this definition, the Morning Star = the Morning Star is this level’s goal.') },
    ],
    after: T('声明给出的自反律，在定义下是一条证出来的结论。', 'The reflexivity a declaration gives is, under the definition, a conclusion proved.'),
  },
  {
    id: 'h-eq-subst',
    kind: 'proof',
    title: T('定义相等：代换', 'Defining equality: substitution'),
    ...STAR,
    tests: [{ premises: { e: LEIB, p: 'B(phos)' }, goal: 'B(hesp)' }],
    cases: [{ B: 'Bright' }, { B: 'Seen' }],
    hint: [
      T('<part-ref to="part:allE"></part-ref>里选的是一种性质：「B(x)」，把 P 换掉。', 'In <part-ref to="part:allE"></part-ref> choose a property: “B(x)”, to put in for P.'),
      T('得到「B(晨星) → B(昏星)」，再套用。', 'That gives “B(the Morning Star) → B(the Evening Star)”; then Apply.'),
    ],
    solution: proof({ i: ['allE', { t: 'B(x)' }], m: ['mp'] }, ['e>i.all', 'i>m.imp', 'p>m.a', 'm>goal'], { premises: ['e', 'p'] }),
    intro: [{ t: T('已知晨星 = 昏星，按定义写出来。<part-ref to="part:allE"></part-ref>换掉 P 的是一句说 x 的话，每个 P(t) 都换成这句话，x 处填 t。', 'Given the Morning Star = the Evening Star, written out by the definition. <part-ref to="part:allE"></part-ref> puts in a sentence about x for P: each P(t) becomes that sentence with t in place of x.') }],
    after: T('这就是<part-ref to="part:rewrite"></part-ref>：定义直接写下了相等的消去规则。', 'This is <part-ref to="part:rewrite"></part-ref>: the definition writes down equality’s elimination rule directly.'),
  },
  {
    id: 'h-eq-sym',
    kind: 'proof',
    title: T('定义相等：对称', 'Defining equality: symmetry'),
    ...STAR,
    tests: [{ premises: { e: LEIB }, goal: '∀Q. Q(hesp) → Q(phos)' }],
    cases: [],
    brief: T('已知晨星 = 昏星（按定义写出），证明昏星 = 晨星（也按定义写出）。', 'Given the Morning Star = the Evening Star (by the definition), prove the Evening Star = the Morning Star (by the definition too).'),
    hint: [
      T('任取框取 Q。框里，从已知选定一例，性质选「Q(x) → Q(晨星)」。', 'A for-any box takes Q. Inside, choose an instance of the given with the property “Q(x) → Q(the Morning Star)”.'),
      T('得到「(Q(晨星) → Q(晨星)) → (Q(昏星) → Q(晨星))」：前一半正是<level-ref to="h-eq-refl"></level-ref>证过的样子，用一个假设框给出，再套用。', 'That gives “(Q(the Morning Star) → Q(the Morning Star)) → (Q(the Evening Star) → Q(the Morning Star))”: the first half is what <level-ref to="h-eq-refl"></level-ref> proved; give it with an assumption box, then Apply.'),
    ],
    solution: proof({ s: ['allI', { x: 'Q' }], i: ['allE', { t: 'Q(x) → Q(phos)' }, 's'], f: ['impI', { A: 'Q(phos)' }, 's'], m: ['mp', {}, 's'] }, ['e>i.all', 'f#body>f.body', 'i>m.imp', 'f>m.a', 'm>s.body', 's>goal'], { premises: ['e'] }),
    intro: [{ t: T('定义只说了一个方向：晨星有的，昏星都有。反过来也成立，要选一个巧妙的性质。', 'The definition says one direction only: what the Morning Star has, the Evening Star has. The other way holds too, with a well-chosen property.') }],
    after: T('声明相等时，对称要用自反律和等量代换证出来；定义相等时，自反和代换由定义得来，对称也就跟着有了。两种做法给出同样的规则。', 'With equality declared, symmetry is proved from reflexivity and substitution; with it defined, reflexivity and substitution come from the definition, and symmetry with them. Both ways give the same rules.'),
  },
]
