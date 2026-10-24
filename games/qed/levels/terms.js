// Chapter 6 · Proofs are programs (Curry–Howard): every card on the proof board now shows its proof term too, the
// way Lean writes it (the chapter carries over Lean's idea; the names stay in the encyclopedia). Reading terms first: Apply is application, the box is λ, Chain is composition, and one sentence
// can have two different proofs; then the data: ∧ is a pair, ∨ carries a tag, ¬ is a function, ⊥ gives anything. Then
// the term board, where the player writes short terms and the machine checks their type. Detours (a pair taken apart,
// a box applied at once) bring in the Normalize card, which also unfolds a lemma into its own term; ∀ is a function
// taking a thing, ∃ a pair of a witness and a proof. The challenge is the term of double negation.
import { proof } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })
// A term level: one problem per task (TermScreen.jsx).
const PROBLEMS = [T('第一题', 'Problem 1'), T('第二题', 'Problem 2'), T('第三题', 'Problem 3'), T('第四题', 'Problem 4')]
const WRITE = T('用下面的块，拼出这句话的证明项。', 'Build the proof term of this sentence from the pieces below.')
const write = (list) => list.map((task, k) => ({ kind: 'term', step: PROBLEMS[k], brief: WRITE, ...task }))
const prove = (task) => ({ kind: 'proof', terms: true, step: T('证明', 'Prove'), ...task })
const RAIN = [{ A: 'Rain', B: 'Wind', C: 'Wet' }, { A: 'Alarm', B: 'Coffee', C: 'Awake' }]
const CHAIN = [{ A: 'Rain', B: 'Wet', C: 'Slip' }, { A: 'Alarm', B: 'Up', C: 'OnTime' }]
const TWO = [{ A: 'Rain', B: 'Sat' }, { A: 'Coffee', B: 'Late' }]
const PERSON = [{ P: 'Human', Q: 'Mortal' }, { P: 'Student', Q: 'School' }]

const chainByHand = proof({ f: ['impI', { A: 'A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] })
const pairBox = proof({ f: ['impI', { A: 'A' }], c: ['andI', {}, 'f'], m: ['mp'] }, ['f#body>c.a', 'f#body>c.b', 'c>f.body', 'f>m.imp', 'p>m.a', 'm>goal'], { premises: ['p'] })
const orDetour = { e: ['orE'], i: ['orI', { other: 'B', side: 'right' }], m1: ['mp', {}, 'e/left'], m2: ['mp', {}, 'e/right'] }
const orDetourWires = ['p>i.a', 'i>e.ab', 'q>m1.imp', 'e#left>m1.a', 'm1>e.left', 'r>m2.imp', 'e#right>m2.a', 'm2>e.right']

export const terms = [
  // ---------- reading terms: functions ----------
  {
    id: 't-app',
    title: T('套用就是应用', 'Apply is application'),
    tasks: [
      prove({
        tests: [{ premises: { p: 'A → (B → C)', q: 'A', r: 'B' }, goal: 'C', term: 'p q r' }],
        cases: RAIN,
        brief: T('实现一个证明器，可以从已知 p：「下雨 → (刮风 → 地湿)」、q：「下雨」、r：「刮风」证明出「地湿」，并且证明的项要是 p q r。', 'Build a prover that, from p: “it rains → (it is windy → the ground is wet)”, q: “it rains” and r: “it is windy”, proves “the ground is wet”, with the proof term p q r.'),
        hint: [T('p q r 是 (p q) r：先把 p 用在 q 上，得到的再用在 r 上。', 'p q r is (p q) r: first p used on q, then what that gives used on r.')],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'q>m1.a', 'm1>m2.imp', 'r>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      }),
      prove({
        tests: [{ premises: { p: 'A → B', q: 'B → C', r: 'A' }, goal: 'C', term: 'q (p r)' }],
        cases: CHAIN,
        brief: T('再从已知 p：「下雨 → 地湿」、q：「地湿 → 路滑」、r：「下雨」证明出「路滑」，项要是 q (p r)。', 'Now from p: “it rains → the ground is wet”, q: “the ground is wet → the road is slippery” and r: “it rains”, prove “the road is slippery”, with the term q (p r).'),
        hint: [T('括号里的先算：p r 是一次套用，q 再用在它上面。', 'What is in brackets comes first: p r is one Apply, and q is used on that.')],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'r>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      }),
    ],
    intro: [
      { t: T('前面接出的每一个证明，本身也是一样东西，可以写成一个<b>项</b>。这一章迁移的是 Lean 的思路：证明就是项，检查证明就是检查项的类型。从这一关起，证明板上每张卡片在它证出的那句下面，多一行它的项。', 'Every proof you have wired is itself a thing, and can be written as a <b>term</b>. This chapter carries over Lean’s idea: a proof is a term, and checking a proof is checking the term’s type. From this level on, every card on the proof board shows its term under the sentence it proves.') },
      { t: T('已知各有一个名字，名字就是它的项：p 证的是 p 那一句。一句「A → B」的证明是一个<b>函数</b>：给它一个 A 的证明，它还你一个 B 的证明。所以套用写成<b>应用</b>：p 用在 q 上，写作 p q，中间只隔一个空格。', 'Each given has a name, and the name is its term: p proves the sentence called p. A proof of “A → B” is a <b>function</b>: give it a proof of A and it gives back a proof of B. So Apply is written as <b>application</b>: p used on q is p q, with only a space between.') },
      { t: T('目标卡片上写着要的项。读懂它，就知道该怎么接。', 'The goal card shows the term wanted. Read it, and you know how to wire.') },
    ],
    after: T('套用就是函数应用；p q r 是先 p q、再用在 r 上，括号改变的是先算哪一个。一个有两个条件的「若…则…」，就是一个一次吃一个参数的函数。', 'Apply is function application; p q r is p q first, then used on r, and brackets change which comes first. An “if … then …” with two conditions is a function that takes its arguments one at a time.'),
  },
  {
    id: 't-lam',
    kind: 'proof',
    terms: true,
    title: T('框就是 λ', 'The box is λ'),
    tests: [{ premises: { p: 'A → (B → C)', q: 'B' }, goal: 'A → C', term: 'fun h => p h q' }],
    cases: RAIN,
    brief: T('实现一个证明器，可以从已知 p：「下雨 → (刮风 → 地湿)」、q：「刮风」证明出「下雨 → 地湿」，项要是 fun h => p h q。', 'Build a prover that, from p: “it rains → (it is windy → the ground is wet)” and q: “it is windy”, proves “it rains → the ground is wet”, with the term fun h => p h q.'),
    hint: [T('fun h => … 是一个框，h 是框里假设的那一句；箭头后面是框里要接出的东西。', 'fun h => … is a box, h the sentence it assumes; after the arrow is what is wired inside it.')],
    intro: [
      { t: T('要造一个函数，就写 <b>fun h => …</b>：「拿到一个 h，就给出 …」。假设框做的正是这件事：框里假设的那一句有了一个名字 h，框里证出的东西用到 h，框外得到的是一个等着 h 的函数。这就是 <b>λ</b>（也可以写成 λ h => …）。', 'To make a function, write <b>fun h => …</b>: “given an h, give …”. The assumption box does just that: the sentence it assumes gets a name h, what is proved inside uses h, and outside you get a function waiting for an h. This is <b>λ</b> (it may also be written λ h => …).') },
      { t: T('框里的假设在卡片上叫 h1；框套框时，里面一层叫 h2。名字只是记号：fun h => h 和 fun x => x 是同一个项。', 'A box’s assumption is called h1 on the card; a box inside it calls its own h2. The names are only labels: fun h => h and fun x => x are the same term.') },
    ],
    solution: proof({ f: ['impI', { A: 'A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'm1>m2.imp', 'q>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
    after: T('假设框就是 λ：框里的假设是参数，框里的证明是函数体。约束变量叫什么名字不要紧，只要不和别的撞名，这叫 <b>α 等价</b>。', 'The assumption box is λ: its assumption is the parameter, its proof the body. What a bound variable is called does not matter, as long as it clashes with nothing: this is <b>α-equivalence</b>.'),
  },
  {
    id: 't-chain',
    title: T('串联就是复合', 'Chain is composition'),
    tasks: [
      prove({
        tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C', term: 'chain p q' }],
        cases: CHAIN,
        brief: T('实现一个证明器，可以从已知 p：「下雨 → 地湿」、q：「地湿 → 路滑」证明出「下雨 → 路滑」，项要是 chain p q。', 'Build a prover that, from p: “it rains → the ground is wet” and q: “the ground is wet → the road is slippery”, proves “it rains → the road is slippery”, with the term chain p q.'),
        hint: [T('chain 是一个引理的名字：用它的元件，就是把它当函数用在 p 和 q 上。', 'chain is a lemma’s name: using its part is using it as a function on p and q.')],
        solution: proof({ c: ['chain'] }, ['p>c.p0', 'q>c.p1', 'c>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C', term: 'fun h => q (p h)' }],
        cases: CHAIN,
        brief: T('同一句，项要是 fun h => q (p h)。', 'The same sentence, with the term fun h => q (p h).'),
        hint: [T('读这个项：拿到一个 h，先用 p，再用 q。', 'Read the term: given an h, use p, then q.')],
        solution: chainByHand,
      }),
    ],
    intro: [{ t: T('证过的引理也有名字，它们的元件在项里就写成名字：用串联，项里就是 chain。', 'A lemma you proved has a name too, and its part appears in a term by that name: use Chain, and the term says chain.') }],
    after: T('fun h => q (p h) 先做 p 再做 q：这是函数的<b>复合</b>，数学里写作 q ∘ p。串联这条引理，就是复合这个函数。两个项证的是同一句，一个用了引理的名字，一个把它的做法写了出来。', 'fun h => q (p h) does p, then q: function <b>composition</b>, written q ∘ p in mathematics. The lemma Chain is composition. The two terms prove the same sentence; one uses the lemma’s name, the other writes out what it does.'),
  },
  {
    id: 't-two',
    title: T('同一句，两个证明', 'One sentence, two proofs'),
    tasks: [
      prove({
        tests: [{ goal: 'A → (A → A)', term: 'fun a b => a' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        brief: T('实现一个证明器，不需要任何已知，就能证明出「下雨 → (下雨 → 下雨)」，项要是 fun a b => a。', 'Build a prover that proves “it rains → (it rains → it rains)” from nothing given, with the term fun a b => a.'),
        hint: [T('fun a b => … 是两层框，外层假设 a，里层假设 b。', 'fun a b => … is two boxes, the outer assuming a, the inner b.')],
        solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: 'A' }, 'f'] }, ['f#body>g.body', 'g>f.body', 'f>goal']),
      }),
      prove({
        tests: [{ goal: 'A → (A → A)', term: 'fun a b => b' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        brief: T('同一句，项要是 fun a b => b。', 'The same sentence, with the term fun a b => b.'),
        hint: [T('这回要的是里层框的那个假设。', 'This time the one wanted is the inner box’s assumption.')],
        solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: 'A' }, 'f'] }, ['g#body>g.body', 'g>f.body', 'f>goal']),
      }),
    ],
    intro: [{ t: T('fun a b => … 是 fun a => fun b => … 的简写：两层框。', 'fun a b => … is short for fun a => fun b => …: two boxes.') }],
    after: T('真值表只说一句话真不真；证明项还记得它<b>为什么</b>真。同一句话可以有不同的证明，就像同一个类型可以有不同的程序：一个返回第一个参数，一个返回第二个。', 'A truth table only says whether a sentence is true; a proof term also remembers <b>why</b>. One sentence can have different proofs, as one type can have different programs: one returns its first argument, the other its second.'),
  },

  // ---------- reading terms: data ----------
  {
    id: 't-pair',
    kind: 'proof',
    terms: true,
    title: T('∧ 是一对', '∧ is a pair'),
    tests: [{ premises: { p: 'A ∧ B' }, goal: 'B ∧ A', term: '⟨p.2, p.1⟩' }],
    cases: TWO,
    brief: T('实现一个证明器，可以从已知 p：「下雨 ∧ 今天是周六」证明出「今天是周六 ∧ 下雨」，项要是 ⟨p.2, p.1⟩。', 'Build a prover that, from p: “it rains ∧ today is Saturday”, proves “today is Saturday ∧ it rains”, with the term ⟨p.2, p.1⟩.'),
    hint: [T('p.2 是 p 的右一半，p.1 是左一半。', 'p.2 is the right half of p, p.1 the left half.')],
    intro: [{ t: T('一句「A ∧ B」的证明是一<b>对</b>：一个 A 的证明和一个 B 的证明放在一起，写作 <b>⟨a, b⟩</b>。拆开 ∧ 就是取出一半：<b>p.1</b> 是左边那个，<b>p.2</b> 是右边那个。', 'A proof of “A ∧ B” is a <b>pair</b>: a proof of A and a proof of B together, written <b>⟨a, b⟩</b>. Splitting ∧ takes out one half: <b>p.1</b> is the left one, <b>p.2</b> the right.') }],
    solution: proof({ e: ['andE'], i: ['andI'] }, ['p>e.ab', 'e#right>i.a', 'e#left>i.b', 'i>goal'], { premises: ['p'] }),
    after: T('拼起来 ∧ 就是造一对，拆开 ∧ 就是取出一个分量。程序里这叫有序对或二元组。', 'Joining ∧ makes a pair; splitting it takes out a component. In programs this is an ordered pair, a tuple.'),
  },
  {
    id: 't-curry',
    kind: 'proof',
    terms: true,
    title: T('一对，还是一个一个', 'A pair, or one at a time'),
    tests: [{ premises: { p: 'A ∧ B → C' }, goal: 'A → (B → C)', term: 'fun a b => p ⟨a, b⟩' }],
    cases: RAIN,
    brief: T('实现一个证明器，可以从已知 p：「下雨 ∧ 刮风 → 地湿」证明出「下雨 → (刮风 → 地湿)」，项要是 fun a b => p ⟨a, b⟩。', 'Build a prover that, from p: “it rains ∧ it is windy → the ground is wet”, proves “it rains → (it is windy → the ground is wet)”, with the term fun a b => p ⟨a, b⟩.'),
    hint: [T('两层框各假设一个，在里面拼成一对，交给 p。', 'Two boxes, one assumption each; inside, make the pair and give it to p.')],
    solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: 'B' }, 'f'], c: ['andI', {}, 'g'], m: ['mp', {}, 'g'] }, ['f#body>c.a', 'g#body>c.b', 'p>m.imp', 'c>m.a', 'm>g.body', 'g>f.body', 'f>goal'], { premises: ['p'] }),
    after: T('吃一对的函数，变成一个一个吃的函数：这叫<b>柯里化</b>（Curry），名字来自逻辑学家 Haskell Curry，Curry–Howard 对应里的 Curry 也是他。', 'A function taking a pair becomes one taking its arguments one at a time: this is <b>currying</b>, after the logician Haskell Curry, the Curry of the Curry–Howard correspondence.'),
  },
  {
    id: 't-or',
    kind: 'proof',
    terms: true,
    title: T('∨ 带着标签', '∨ carries a tag'),
    tests: [{ premises: { p: 'A ∨ B' }, goal: 'B ∨ A', term: 'p.elim (fun a => Or.inr a) (fun b => Or.inl b)' }],
    cases: TWO,
    brief: T('实现一个证明器，可以从已知 p：「下雨 ∨ 今天是周六」证明出「今天是周六 ∨ 下雨」，项要是 p.elim (fun a => Or.inr a) (fun b => Or.inl b)。', 'Build a prover that, from p: “it rains ∨ today is Saturday”, proves “today is Saturday ∨ it rains”, with the term p.elim (fun a => Or.inr a) (fun b => Or.inl b).'),
    hint: [T('p.elim 后面的两个 fun 是分情况的两个格子：左格假设左边那句，右格假设右边那句。', 'The two funs after p.elim are the two compartments of Cases: the left assumes the left sentence, the right the right one.')],
    intro: [
      { t: T('一句「A ∨ B」的证明带着一个<b>标签</b>：Or.inl a 说「是左边，这是它的证明 a」，Or.inr b 说「是右边，证明是 b」。', 'A proof of “A ∨ B” carries a <b>tag</b>: Or.inl a says “the left one, and a proves it”, Or.inr b says “the right one, proved by b”.') },
      { t: T('分情况写成 <b>p.elim f g</b>：看 p 的标签，是左边就用 f，是右边就用 g。f 和 g 各是一个 fun，也就是分情况卡片上的两个格子。', 'Cases is written <b>p.elim f g</b>: look at p’s tag; left, use f; right, use g. f and g are each a fun: the two compartments on the Cases card.') },
    ],
    solution: proof({ e: ['orE'], l: ['orI', { other: 'B', side: 'left' }, 'e/left'], r: ['orI', { other: 'A', side: 'right' }, 'e/right'] }, ['p>e.ab', 'e#left>l.a', 'l>e.left', 'e#right>r.a', 'r>e.right', 'e>goal'], { premises: ['p'] }),
    after: T('∨ 的证明是带标签的值，分情况就是按标签分支：程序里的 match。两个分支给出同一种结果，分支外才能接着用。', 'A proof of ∨ is a tagged value, and Cases branches on the tag: a match in a program. Both branches give the same kind of result; only then can it be used outside.'),
  },
  {
    id: 't-mt',
    kind: 'proof',
    terms: true,
    title: T('否定是函数', 'Not is a function'),
    tests: [{ premises: { p: 'A → B', q: '¬B' }, goal: '¬A', term: 'fun a => q (p a)' }],
    cases: CHAIN,
    brief: T('实现一个证明器，可以从已知 p：「下雨 → 地湿」、q：「¬地湿」证明出「¬下雨」，项要是 fun a => q (p a)。', 'Build a prover that, from p: “it rains → the ground is wet” and q: “¬the ground is wet”, proves “¬it rains”, with the term fun a => q (p a).'),
    hint: [T('¬下雨 是 下雨 → ⊥：一个框，拿到下雨，就要给出矛盾。', '¬it rains is it rains → ⊥: a box that, given it rains, must give the contradiction.')],
    intro: [{ t: T('「¬A」就是「A → ⊥」，所以 ¬A 的证明也是一个函数：给它一个 A 的证明，它还你一个矛盾。q 证的是 ¬B，q 用在一个 B 的证明上，就得到 ⊥。', '“¬A” is “A → ⊥”, so a proof of ¬A is a function too: give it a proof of A and it gives back a contradiction. q proves ¬B; q used on a proof of B gives ⊥.') }],
    solution: proof({ f: ['impI', { A: 'A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
    after: T('看这个项：它和<level-ref to="t-chain"></level-ref>里的复合一模一样，只是最后那一句是 ⊥。否定后件，就是把 p 和 q 复合起来。', 'Look at the term: it is exactly the composition of <level-ref to="t-chain"></level-ref>, only the last sentence is ⊥. Denying the consequent is composing p and q.'),
  },
  {
    id: 't-absurd',
    title: T('⊥ 是空的', '⊥ is empty'),
    tasks: [
      prove({
        tests: [{ premises: { p: 'A', q: '¬A' }, goal: 'B', term: 'False.elim (q p)' }],
        cases: TWO,
        brief: T('实现一个证明器，可以从已知 p：「下雨」、q：「¬下雨」证明出「今天是周六」，项要是 False.elim (q p)。', 'Build a prover that, from p: “it rains” and q: “¬it rains”, proves “today is Saturday”, with the term False.elim (q p).'),
        hint: [T('q p 是矛盾；False.elim 把矛盾变成想要的任何一句。', 'q p is the contradiction; False.elim turns it into any sentence wanted.')],
        solution: proof({ m: ['mp'], b: ['botE', { C: 'B' }] }, ['q>m.imp', 'p>m.a', 'm>b.bot', 'b>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        tests: [{ goal: 'A ∨ B → (¬A → B)', term: 'fun h n => h.elim (fun a => False.elim (n a)) (fun b => b)' }],
        cases: TWO,
        brief: T('不需要任何已知，证明出「下雨 ∨ 今天是周六 → (¬下雨 → 今天是周六)」，项要是 fun h n => h.elim (fun a => False.elim (n a)) (fun b => b)。', 'From nothing given, prove “it rains ∨ today is Saturday → (¬it rains → today is Saturday)”, with the term fun h n => h.elim (fun a => False.elim (n a)) (fun b => b).'),
        hint: [T('两层框，里面分情况。左格里 n a 是矛盾；右格直接就是要的。', 'Two boxes with Cases inside. In the left compartment n a is a contradiction; the right one already has what is wanted.')],
        solution: proof({ f: ['impI', { A: 'A ∨ B' }], g: ['impI', { A: '¬A' }, 'f'], e: ['orE', {}, 'g'], m: ['mp', {}, 'e/left'], b: ['botE', { C: 'B' }, 'e/left'] }, ['f#body>e.ab', 'g#body>m.imp', 'e#left>m.a', 'm>b.bot', 'b>e.left', 'e#right>e.right', 'e>g.body', 'g>f.body', 'f>goal']),
      }),
    ],
    intro: [{ t: T('⊥ 没有证明，就像一个没有任何值的类型。万一手里有了一个，<b>False.elim</b> 就能把它当成任何一句的证明：反正这一步永远不会真的走到。', '⊥ has no proof, like a type with no values at all. Should you hold one, <b>False.elim</b> makes it a proof of any sentence: that step is never really reached anyway.') }],
    after: T('矛盾推出一切，在程序里是「这一支走不到」：一个空类型的值，可以当作任何类型的值用。选言三段论的项，就是一个分支用 False.elim 堵上的 match。', 'Ex falso, in a program, is “this branch is unreachable”: a value of an empty type can stand for a value of any type. The term of the disjunctive syllogism is a match with one branch closed by False.elim.'),
  },

  // ---------- writing terms ----------
  {
    id: 't-wapp',
    title: T('写一个应用', 'Write an application'),
    tasks: write([
      { premises: { p: 'Rain → Wet', q: 'Rain' }, goal: 'Wet', answer: 'p q', hint: [T('先放「□ □」：前一个框放函数，后一个框放用在它上面的证明。', 'Put down “□ □” first: the function in the first box, the proof it is used on in the second.')] },
      { premises: { p: 'Rain → (Wind → Wet)', q: 'Rain', r: 'Wind' }, goal: 'Wet', answer: 'p q r', hint: [T('p q r 是 (p q) r：最外面那次应用的函数，本身又是一次应用。', 'p q r is (p q) r: the function of the outermost application is itself an application.')] },
      { premises: { p: 'Rain → Wet', q: 'Wet → Slip', r: 'Rain' }, goal: 'Slip', answer: 'q (p r)', hint: [T('最后用的是 q，它要的「地湿」从哪来？', 'The last one used is q; where does the “ground is wet” it needs come from?')] },
    ]),
    intro: [{ t: T('新的板：<b>写项板</b>。不接线了，用下面的块把证明项拼出来：块填进去就写成字，它自己要填的地方留成框，再往框里填别的块。拼完了，机器检查这个项的类型是不是要证的那句话。', 'A new board: the <b>term board</b>. No wiring now: build the proof term from the pieces below. A piece put in is written out, with a box for each place it leaves to fill, and other pieces go in those boxes. When it is whole, the machine checks that the term’s type is the sentence to prove.') }],
    after: T('机器没有看你怎么想到的，只检查拼出的项：每一次应用，函数的前一半都要和参数对得上。证明器的核做的就是这件事：<b>证明检查就是类型检查</b>。', 'The machine does not look at how you found it, only at the term built: at every application, the function’s first half must match the argument. This is what a prover’s kernel does: <b>proof checking is type checking</b>.'),
  },
  {
    id: 't-wlam',
    title: T('写一个 λ', 'Write a λ'),
    tasks: write([
      { premises: {}, goal: 'Rain → Rain', answer: 'fun a => a', hint: [T('要证「若…则…」，先放「fun _ => □」：它给前一半起了个名字。', 'To prove an “if … then …”, put down “fun _ => □” first: it gives the first half a name.')] },
      { premises: { p: 'Wet' }, goal: 'Rain → Wet', answer: 'fun a => p', hint: [T('拿到的 a 不一定要用上。', 'The a you are given need not be used.')] },
      { premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Slip', answer: 'fun a => q (p a)', hint: [T('拿到 a，先用 p，再用 q。', 'Given a, use p, then q.')] },
      { premises: { p: 'Rain → (Wind → Wet)' }, goal: 'Wind → (Rain → Wet)', answer: 'fun a b => p b a', hint: [T('两层 fun：a 证的是刮风，b 证的是下雨。p 先要哪一个？', 'Two funs: a proves it is windy, b that it rains. Which does p want first?')] },
    ]),
    after: T('最后一题是<b>交换</b>：拿到 a 和 b，按 p 要的次序交出去。框的次序和参数的次序是同一件事。', 'The last one is <b>Swap</b>: given a and b, hand them on in the order p wants. The order of boxes and the order of arguments are one thing.'),
  },
  {
    id: 't-wpair',
    title: T('写一对', 'Write a pair'),
    tasks: write([
      { premises: { p: 'Rain', q: 'Wind' }, goal: 'Rain ∧ Wind', answer: '⟨p, q⟩', hint: [T('「…并且…」的证明是一对。', 'A proof of “… and …” is a pair.')] },
      { premises: { p: 'Rain ∧ Wind' }, goal: 'Wind ∧ Rain', answer: '⟨p.2, p.1⟩', hint: [T('p.1 是 p 的左一半，p.2 是右一半。', 'p.1 is the left half of p, p.2 the right.')] },
      { premises: { p: 'Rain ∧ Wind → Wet' }, goal: 'Rain → (Wind → Wet)', answer: 'fun a b => p ⟨a, b⟩', hint: [T('拿到 a 和 b，拼成一对交给 p。', 'Given a and b, make a pair and give it to p.')] },
      { premises: { p: 'Rain → (Wind → Wet)' }, goal: 'Rain ∧ Wind → Wet', answer: 'fun a => p a.1 a.2', hint: [T('拿到的 a 是一对，p 要的却是一个一个。', 'The a you get is a pair, but p wants them one at a time.')] },
    ]),
    after: T('第三、四题一来一回：柯里化，和它的反过来。两种函数可以互相改写，所以两句话互相推得出。', 'The third and fourth go there and back: currying and its reverse. Each kind of function can be rewritten as the other, so each sentence gives the other.'),
  },
  {
    id: 't-wcases',
    title: T('写分情况', 'Write cases'),
    tasks: write([
      { premises: { p: 'Rain' }, goal: 'Rain ∨ Sat', answer: 'Or.inl p', hint: [T('给 p 贴上标签：它是左边那句。', 'Tag p: it is the left one.')] },
      { premises: { p: 'Rain ∨ Sat' }, goal: 'Sat ∨ Rain', answer: 'p.elim (fun a => Or.inr a) (fun b => Or.inl b)', hint: [T('分情况：两个 fun 各处理一边，在新的「或者」里，它们各在哪一边？', 'Cases: each fun handles one side; in the new “or”, which side is each on?')] },
      { premises: { p: 'Rain ∨ Sat', q: 'Rain → Rest', r: 'Sat → Rest' }, goal: 'Rest', answer: 'p.elim (fun a => q a) (fun b => r b)', hint: [T('两种情况各要证出「我休息」。', 'Each case must prove “I rest”.')] },
      { premises: { p: 'Rain', q: '¬Rain' }, goal: 'Rest', answer: 'False.elim (q p)', hint: [T('q 用在 p 上是矛盾。', 'q used on p is the contradiction.')] },
    ]),
    after: T('∧、∨、→、¬、⊥，每个连接词都有它的项：一对、带标签的值、函数、到空类型的函数、空类型本身。证明板上的每一条规则，都是造一种值或者用一种值。', '∧, ∨, →, ¬, ⊥: each connective has its terms: a pair, a tagged value, a function, a function into the empty type, the empty type itself. Every rule on the proof board makes a kind of value or uses one.'),
  },

  // ---------- detours ----------
  {
    id: 't-detour',
    title: T('先拼又拆', 'Joined, then split'),
    tasks: [
      prove({
        tests: [{ premises: { p: 'A', q: 'B' }, goal: 'A', term: '⟨p, q⟩.1' }],
        cases: TWO,
        brief: T('实现一个证明器，可以从已知 p：「下雨」、q：「今天是周六」证明出「下雨」，项要是 ⟨p, q⟩.1。', 'Build a prover that, from p: “it rains” and q: “today is Saturday”, proves “it rains”, with the term ⟨p, q⟩.1.'),
        hint: [T('先把两句拼成一对，再取出左边那个。', 'Make the two into a pair first, then take out the left one.')],
        solution: proof({ c: ['andI'], e: ['andE'] }, ['p>c.a', 'q>c.b', 'c>e.ab', 'e#left>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        tests: [{ premises: { p: 'A', q: 'B' }, goal: 'A', term: 'p' }],
        cases: TWO,
        brief: T('同一句，项要是 p。', 'The same sentence, with the term p.'),
        hint: [T('要的已经在手里了。', 'What is wanted is already in hand.')],
        solution: proof({}, ['p>goal'], { premises: ['p'] }),
      }),
    ],
    after: T('⟨p, q⟩.1 先拼又拆，绕了一圈，算下来就是 p。证明里这样的<b>弯路</b>（先引入、马上又消去）总能拿掉，拿掉以后证的还是同一句。', '⟨p, q⟩.1 joins and then splits, going round in a circle, and works out to just p. A <b>detour</b> like this in a proof (introduced, then at once eliminated) can always be taken out, and what is left proves the same sentence.'),
  },
  {
    id: 't-beta',
    title: T('套用一个框', 'Applying a box'),
    tasks: [
      prove({
        tests: [{ premises: { p: 'A' }, goal: 'A ∧ A', term: '(fun h => ⟨h, h⟩) p' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        brief: T('实现一个证明器，可以从已知 p：「下雨」证明出「下雨 ∧ 下雨」，项要是 (fun h => ⟨h, h⟩) p。', 'Build a prover that, from p: “it rains”, proves “it rains ∧ it rains”, with the term (fun h => ⟨h, h⟩) p.'),
        hint: [T('一个框，框外马上套用在 p 上。', 'A box, applied to p right outside it.')],
        solution: pairBox,
      }),
      prove({
        adds: ['normalize'],
        tests: [{ premises: { p: 'A' }, goal: 'A ∧ A', term: '⟨p, p⟩' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        brief: T('把刚才的证明接进新元件<b>化简证明</b>，让项变成 ⟨p, p⟩。', 'Wire the proof you just made into the new part <b>Normalize</b>, so the term becomes ⟨p, p⟩.'),
        hint: [T('化简证明不改证出的那句，只改它的项。', 'Normalize leaves the sentence proved alone and changes only its term.')],
        solution: proof({ f: ['impI', { A: 'A' }], c: ['andI', {}, 'f'], m: ['mp'], n: ['normalize'] }, ['f#body>c.a', 'f#body>c.b', 'c>f.body', 'f>m.imp', 'p>m.a', 'm>n.a', 'n>goal'], { premises: ['p'] }),
      }),
    ],
    intro: [{ t: T('一个框造出函数，马上又用在 p 上：这也是弯路。它算下来是框里的证明，把 h 都换成 p。', 'A box makes a function and it is at once used on p: another detour. It works out to the proof inside the box with every h replaced by p.') }],
    after: T('(fun h => b) a 算成 b 里的 h 换成 a，这一步叫 <b>β 归约</b>，就是调用一个函数。化简证明把所有弯路一步步拿掉，得到的叫<b>正规形式</b>。证明论里这件事叫正规化：每个证明都能化成没有弯路的那一个。', '(fun h => b) a works out to b with h replaced by a: this step is <b>β-reduction</b>, calling a function. Normalize takes out every detour step by step, and what is left is the <b>normal form</b>. In proof theory this is normalization: every proof can be brought to one with no detours.'),
  },
  {
    id: 't-casedetour',
    title: T('标签刚贴上就拆', 'A tag read as soon as it is put on'),
    tasks: [
      prove({
        tests: [{ premises: { p: 'A', q: 'A → C', r: 'B → C' }, goal: 'C', term: '(Or.inl p).elim (fun a => q a) (fun b => r b)' }],
        cases: [{ A: 'Rain', B: 'Sat', C: 'Rest' }, { A: 'Coffee', B: 'Tea', C: 'Awake' }],
        brief: T('实现一个证明器，可以从已知 p：「下雨」、q：「下雨 → 我休息」、r：「今天是周六 → 我休息」证明出「我休息」，项要是 (Or.inl p).elim (fun a => q a) (fun b => r b)。', 'Build a prover that, from p: “it rains”, q: “it rains → I rest” and r: “today is Saturday → I rest”, proves “I rest”, with the term (Or.inl p).elim (fun a => q a) (fun b => r b).'),
        hint: [T('先给 p 贴上「左边」的标签，变成一句「或者」，再分情况。', 'First tag p as “the left one”, making an “or”, then take cases.')],
        solution: proof(orDetour, [...orDetourWires, 'e>goal'], { premises: ['p', 'q', 'r'] }),
      }),
      prove({
        tests: [{ premises: { p: 'A', q: 'A → C', r: 'B → C' }, goal: 'C', term: 'q p' }],
        cases: [{ A: 'Rain', B: 'Sat', C: 'Rest' }, { A: 'Coffee', B: 'Tea', C: 'Awake' }],
        brief: T('把它化简，项要是 q p。', 'Normalize it, with the term q p.'),
        hint: [T('标签是左边，分情况只会走左格。', 'The tag says left, so Cases only takes the left compartment.')],
        solution: proof({ ...orDetour, n: ['normalize'] }, [...orDetourWires, 'e>n.a', 'n>goal'], { premises: ['p', 'q', 'r'] }),
      }),
    ],
    after: T('对一个刚贴上标签的值分情况，只会走标签那一支：r 根本没用上。化简证明对 ∧、∨、→ 的弯路都一样处理：造出来马上用掉的，就直接用里面的东西。', 'Cases on a value just tagged only takes the tagged branch: r is never used. Normalize treats the detours of ∧, ∨ and → alike: what is made only to be used at once is replaced by what it was made from.'),
  },
  {
    id: 't-lemma',
    kind: 'proof',
    terms: true,
    title: T('引理也是项', 'A lemma is a term too'),
    without: ['impI'],
    tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C', term: 'fun h => q (p h)' }],
    cases: CHAIN,
    brief: T('实现一个证明器，不用假设框，可以从已知 p：「下雨 → 地湿」、q：「地湿 → 路滑」证明出「下雨 → 路滑」，项要是 fun h => q (p h)。', 'Build a prover that, without the assumption box, proves “it rains → the road is slippery” from p: “it rains → the ground is wet” and q: “the ground is wet → the road is slippery”, with the term fun h => q (p h).'),
    hint: [T('串联的项是 chain p q；chain 自己也有一个项，就是当初证它时接出来的那个。', 'Chain’s term is chain p q; chain itself has a term as well, the one wired when it was proved.')],
    intro: [{ t: T('一条引理的名字背后，是证它的那个项。化简证明遇到引理的名字，会把它展开成那个项，再接着化简。', 'Behind a lemma’s name is the term that proved it. When Normalize meets a lemma’s name it unfolds it into that term, then carries on.') }],
    solution: proof({ c: ['chain'], n: ['normalize'] }, ['p>c.p0', 'q>c.p1', 'c>n.a', 'n>goal'], { premises: ['p', 'q'] }),
    after: T('chain 是 fun p q h => q (p h)；用在 p、q 上再化简，就和直接接线的项一样了。引理只是给项起的名字，展开以后，整个证明是一个只用最初规则的项，谁都可以拿去独立复查。检查证明的核可以很小，证明本身可以交给别人重新检查。', 'chain is fun p q h => q (p h); applied to p and q and normalized, it is the same term as the one wired directly. A lemma is only a name given to a term; unfolded, the whole proof is a term using only the first rules, which anyone can check again on their own. The kernel that checks proofs can be small, and a proof can be handed to someone else to check again.'),
  },

  // ---------- quantifiers ----------
  {
    id: 't-all',
    consts: ['ann'],
    title: T('∀ 是依赖函数', '∀ is a dependent function'),
    tasks: [
      prove({
        tests: [{ premises: { p: '∀x. P(x) → Q(x)', q: 'P(ann)' }, goal: 'Q(ann)', term: 'p ann q' }],
        cases: PERSON,
        brief: T('实现一个证明器，可以从已知 p：「∀x. x是人 → x会死」、q：「安是人」证明出「安会死」，项要是 p ann q。', 'Build a prover that, from p: “∀x. x is human → x is mortal” and q: “Ann is human”, proves “Ann is mortal”, with the term p ann q.'),
        hint: [T('p ann：把安交给 p，得到的是关于安的那句话。', 'p ann: hand Ann to p, and out comes the sentence about Ann.')],
        solution: proof({ e: ['allE', { t: 'ann' }], m: ['mp'] }, ['p>e.all', 'e>m.imp', 'q>m.a', 'm>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        tests: [{ goal: '∀x. P(x) → P(x)', term: 'fun a h => h' }],
        cases: PERSON,
        brief: T('不需要任何已知，证明出「∀x. x是人 → x是人」，项要是 fun a h => h。', 'From nothing given, prove “∀x. x is human → x is human”, with the term fun a h => h.'),
        hint: [T('fun a 是任取框（a 是任取的那一样），fun h 是假设框。', 'fun a is the for-any box (a the thing taken), fun h the assumption box.')],
        solution: proof({ g: ['allI', { x: 'a' }], h: ['impI', { A: 'P(a)' }, 'g'] }, ['h#body>h.body', 'h>g.body', 'g>goal']),
      }),
    ],
    intro: [{ t: T('「∀x. …」的证明也是函数，只是参数不是证明，而是一样东西：给它一样东西 t，它还你关于 t 的那句话的证明。还回来的句子跟着 t 变，这叫<b>依赖函数</b>。取一个，写成把那样东西传进去：p ann。', 'A proof of “∀x. …” is a function too, but its argument is not a proof, it is a thing: give it a thing t and it gives back a proof of the sentence about t. The sentence given back depends on t, so this is a <b>dependent function</b>. Take one is written as passing the thing in: p ann.') }],
    after: T('任取框是 fun x，假设框是 fun h，写起来一模一样，区别只在参数是东西还是证明。两者本来就是同一种东西：→ 只是不依赖参数的 ∀。', 'The for-any box is fun x and the assumption box fun h, written exactly alike; the only difference is whether the argument is a thing or a proof. They are one and the same: → is just a ∀ that does not depend on its argument.'),
  },
  {
    id: 't-ex',
    consts: ['ann'],
    title: T('∃ 是一对', '∃ is a pair'),
    tasks: [
      prove({
        tests: [{ premises: { p: 'P(ann)' }, goal: '∃x. P(x)', term: '⟨ann, p⟩' }],
        cases: PERSON,
        brief: T('实现一个证明器，可以从已知 p：「安是人」证明出「∃x. x是人」，项要是 ⟨ann, p⟩。', 'Build a prover that, from p: “Ann is human”, proves “∃x. x is human”, with the term ⟨ann, p⟩.'),
        hint: [T('一对的左边是例子，右边是例子满足它的证明。', 'The pair’s left is the example, its right the proof that the example fits.')],
        solution: proof({ i: ['exI', { target: '∃x. P(x)', t: 'ann' }] }, ['p>i.a', 'i>goal'], { premises: ['p'] }),
      }),
      prove({
        tests: [{ premises: { p: '∃x. P(x) ∧ Q(x)' }, goal: '∃x. P(x)', term: 'p.elim (fun a h => ⟨a, h.1⟩)' }],
        cases: PERSON,
        brief: T('从已知 p：「∃x. x是人 ∧ x会死」证明出「∃x. x是人」，项要是 p.elim (fun a h => ⟨a, h.1⟩)。', 'From p: “∃x. x is human ∧ x is mortal”, prove “∃x. x is human”, with the term p.elim (fun a h => ⟨a, h.1⟩).'),
        hint: [T('fun a h 是拿出那一个的框：a 是那样东西，h 是它满足的那句。', 'fun a h is the take-the-one box: a is the thing, h the sentence it fits.')],
        solution: proof({ f: ['exE', { x: 'a' }], s: ['andE', {}, 'f'], i: ['exI', { target: '∃x. P(x)', t: 'a' }, 'f'] }, ['p>f.ex', 'f#body>s.ab', 's#left>i.a', 'i>f.body', 'f>goal'], { premises: ['p'] }),
      }),
    ],
    intro: [{ t: T('「∃x. …」的证明是一<b>对</b>：一样东西（见证），和它满足那句话的证明。用它要写 p.elim (fun a h => …)：拿出那样东西叫 a，证明叫 h。', 'A proof of “∃x. …” is a <b>pair</b>: a thing (the witness) and a proof that it fits. Using one is written p.elim (fun a h => …): the thing taken out is called a, its proof h.') }],
    after: T('∀ 是函数，∃ 是一对，正像 → 是函数、∧ 是一对，只是这回的一半是东西。拿出那一个的框里，a 不能逃出框：结果里不能提到它，因为外面不知道它是谁。', '∀ is a function and ∃ a pair, just as → is a function and ∧ a pair, only now one half is a thing. In the take-the-one box, a may not escape: the result may not mention it, since outside nobody knows which it is.'),
  },

  // ---------- challenge ----------
  {
    id: 't-dneg',
    title: T('双重否定的项', 'The term of double negation'),
    tasks: write([
      {
        premises: {},
        goal: 'Rain → ¬¬Rain',
        answer: 'fun a b => b a',
        naive: 'fun a b => a b',
        hint: [
          T('¬¬下雨 是 (下雨 → ⊥) → ⊥：它是一个函数，参数本身又是一个函数。', '¬¬it rains is (it rains → ⊥) → ⊥: a function whose argument is itself a function.'),
          T('拿到 a 和 b，谁能用在谁身上？b 等着一个下雨的证明。', 'Given a and b, which can be used on which? b waits for a proof that it rains.'),
        ],
      },
      {
        premises: {},
        goal: '¬¬¬Rain → ¬Rain',
        answer: 'fun a b => a (fun c => c b)',
        hint: [T('a 等着一个「¬¬下雨」，手里的 b 证的是下雨：第一题刚造过这样的东西。', 'a waits for a “¬¬it rains”, and the b in hand proves it rains: the first problem just made such a thing.')],
      },
    ]),
    intro: [{ t: T('把每个 ¬ 都换成「→ ⊥」，再读要证的句子。', 'Turn every ¬ into “→ ⊥”, then read the sentence to prove.') }],
    after: T('A → ¬¬A 是 fun a b => b a：拿着 a，等别人给一个「A 就矛盾」的 b，把 a 交给它。反过来的 ¬¬A → A 写不出项：没有程序能从「A 不会不成立」里变出 A 的证明。所以反证法没有对应的程序，要用它，只能当作一条公理另外加上。可三重否定能化成一重，第二题的项正是这样。', 'A → ¬¬A is fun a b => b a: holding a, wait for a b saying “A gives a contradiction”, and hand a to it. The other way, ¬¬A → A, has no term: no program can conjure a proof of A out of “A cannot fail”. So proof by contradiction has no program behind it: to use it, it must be added as an axiom of its own. Yet three negations do come down to one, which is what the second term does.'),
  },
]
