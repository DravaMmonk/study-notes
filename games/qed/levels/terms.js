// Chapter 13 · Proofs are programs (Curry–Howard): every part on the proof board now shows its proof term too, the
// way Lean writes it. No new rule of reasoning: the proofs are the kind wired in chapters 2 and 4, read a new way, so
// each level gathers its small tasks. Reading terms: Apply is application, the box is λ (one sentence, two proofs),
// the other connectives are data (a pair, a tagged value, ⊥ that gives anything). Then two lines that need nothing
// from each other: detours, wired and then wired again as what the kernel's computation rules work them out to, and a
// lemma as the name of its own term; ∀ as a function of a thing and ∃ as a pair. Then writing terms on the term
// board, every part wired before. The challenge is the term of double negation.
import { proof } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })
// A term level: one problem per task (TermScreen.jsx).
const PROBLEMS = [T('第一题', 'Problem 1'), T('第二题', 'Problem 2'), T('第三题', 'Problem 3'), T('第四题', 'Problem 4'), T('第五题', 'Problem 5')]
const WRITE = T('用下面的块，拼出这句话的证明项。', 'Build the proof term of this sentence from the pieces below.')
const write = (list) => list.map((task, k) => ({ kind: 'term', step: PROBLEMS[k], brief: WRITE, ...task }))
const prove = (task) => ({ kind: 'proof', terms: true, step: T('证明', 'Prove'), ...task })
const RAIN = [{ A: 'Rain', B: 'Wind', C: 'Wet' }, { A: 'Alarm', B: 'Coffee', C: 'Awake' }]
const CHAIN = [{ A: 'Rain', B: 'Wet', C: 'Slip' }, { A: 'Alarm', B: 'Up', C: 'OnTime' }]
const TWO = [{ A: 'Rain', B: 'Sat' }, { A: 'Coffee', B: 'Late' }]
const PERSON = [{ P: 'Human', Q: 'Mortal' }, { P: 'Student', Q: 'School' }]

const pairBox = proof({ f: ['impI', { A: 'A' }], c: ['andI', {}, 'f'], m: ['mp'] }, ['f#body>c.a', 'f#body>c.b', 'c>f.body', 'f>m.imp', 'p>m.a', 'm>goal'], { premises: ['p'] })
const orDetour = { e: ['orE'], i: ['orI', { other: 'B', side: 'right' }], m1: ['mp', {}, 'e/left'], m2: ['mp', {}, 'e/right'] }
const orDetourWires = ['p>i.a', 'i>e.ab', 'q>m1.imp', 'e#left>m1.a', 'm1>e.left', 'r>m2.imp', 'e#right>m2.a', 'm2>e.right']

export const terms = [
  // ---------- reading terms ----------
  {
    id: 't-app',
    title: T('套用就是应用', 'Apply is application'),
    tasks: [
      prove({
        step: T('两次应用', 'Two applications'),
        tests: [{ premises: { p: 'A → (B → C)', q: 'A', r: 'B' }, goal: 'C', term: 'p q r' }],
        cases: RAIN,
        briefNote: T('证明项须为 p q r。', 'Its proof term must be p q r.'),
        hint: [T('p q r 是 (p q) r：先把 p 用在 q 上，得到的再用在 r 上。', 'p q r is (p q) r: first p used on q, then what that gives used on r.')],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'q>m1.a', 'm1>m2.imp', 'r>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      }),
      prove({
        step: T('括号', 'Brackets'),
        tests: [{ premises: { p: 'A → B', q: 'B → C', r: 'A' }, goal: 'C', term: 'q (p r)' }],
        cases: CHAIN,
        brief: T('从已知 p：「下雨 → 地湿」、q：「地湿 → 路滑」、r：「下雨」证出「路滑」，证明项须为 q (p r)。', 'From p: “it rains → the ground is wet”, q: “the ground is wet → the road is slippery” and r: “it rains”, prove “the road is slippery” with the term q (p r).'),
        hint: [T('括号里的先算：p r 是一次套用，q 再用在它上面。', 'What is in brackets comes first: p r is one Apply, and q is used on that.')],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'r>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      }),
    ],
    intro: [
      { t: T('到这里为止，证明板只显示一句话证出了没有。这一章看证明本身：它可以写成一个式子，叫<wiki-ref to="proof-term"></wiki-ref>，写法照<wiki-ref to="lean"></wiki-ref>。从这一关起，证明板上的元件都显示自己的证明项。', 'Until now the proof board has only shown whether a sentence is proved. This chapter looks at the proof itself: it can be written as an expression, a <wiki-ref to="proof-term"></wiki-ref>, written as in <wiki-ref to="lean"></wiki-ref>. From this level on, every part on the proof board shows its proof term.') },
      { t: T('每条已知的名字就是它的证明项。A → B 的证明可以看成一个<b>函数</b>：给它 A 的证明，它还你 B 的证明。所以套用就是<b>函数应用</b>，写作 p q。一句话是一个类型，它的证明是这个类型的程序：这叫<wiki-ref to="curry-howard"></wiki-ref>。', 'The name of each given is its proof term. A proof of A → B can be seen as a <b>function</b>: give it a proof of A and it gives back a proof of B. So Apply is <b>function application</b>, written p q. A sentence is a type, and its proof a program of that type: this is the <wiki-ref to="curry-howard"></wiki-ref>.') },
    ],
  },
  {
    id: 't-lam',
    title: T('框就是 λ', 'The box is λ'),
    tasks: [
      prove({
        step: T('一个框', 'One box'),
        tests: [{ premises: { p: 'A → (B → C)', q: 'B' }, goal: 'A → C', term: 'fun h => p h q' }],
        cases: RAIN,
        briefNote: T('证明项须为 fun h => p h q。', 'Its proof term must be fun h => p h q.'),
        hint: [T('fun h => … 是一个框，h 是框里假设的那一句；箭头后面是框里要接出的东西。', 'fun h => … is a box, h the sentence it assumes; after the arrow is what is wired inside it.')],
        solution: proof({ f: ['impI', { A: 'A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'm1>m2.imp', 'q>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        step: T('外层的假设', 'The outer assumption'),
        tests: [{ goal: 'A → (A → A)', term: 'fun a b => a' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        brief: T('不用任何已知，证出「下雨 → (下雨 → 下雨)」，证明项须为 fun a b => a。', 'From nothing given, prove “it rains → (it rains → it rains)” with the term fun a b => a.'),
        hint: [T('fun a b => … 是 fun a => fun b => … 的简写：两层框，外层假设 a，里层假设 b。', 'fun a b => … is short for fun a => fun b => …: two boxes, the outer assuming a, the inner b.')],
        solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: 'A' }, 'f'] }, ['f#body>g.body', 'g>f.body', 'f>goal']),
      }),
      prove({
        step: T('里层的假设', 'The inner assumption'),
        tests: [{ goal: 'A → (A → A)', term: 'fun a b => b' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        brief: T('还是这一句，证明项须为 fun a b => b。', 'The same sentence, with the term fun a b => b.'),
        hint: [T('这回要的是里层框的那个假设。', 'This time the one wanted is the inner box’s assumption.')],
        solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: 'A' }, 'f'] }, ['g#body>g.body', 'g>f.body', 'f>goal']),
      }),
    ],
    intro: [
      { t: T('套用把函数用在证明上；函数则由假设框造出。造函数写作 <b>fun h => …</b>，意思是「拿到 h，就给出 …」：框里假设的那一句名叫 h，框里的证明可以用它，框外得到一个等着 h 的函数。这叫<wiki-ref to="lambda"></wiki-ref>，也写作 λ h => …。', 'Apply uses a function on a proof; the function is made by the assumption box. A function is written <b>fun h => …</b>, “given h, give …”: the sentence the box assumes is named h, the proof inside may use it, and outside comes a function waiting for an h. This is <wiki-ref to="lambda"></wiki-ref>, also written λ h => ….') },
      { t: T('元件上，框里的假设叫 h1，里面一层框的叫 h2。名字只是记号：fun h => h 和 fun x => x 是同一个证明项。', 'On the parts, a box’s assumption is h1 and the one of a box inside it h2. Names are only labels: fun h => h and fun x => x are the same term.') },
    ],
    after: T('真值表只说一句话真不真，证明项还记得它<b>为什么</b>真：同一个类型可以有不同的程序。', 'A truth table only says whether a sentence is true; a proof term also remembers <b>why</b>. One type can have different programs.'),
  },
  {
    id: 't-pair',
    title: T('其余的连接词是数据', 'The other connectives are data'),
    tasks: [
      prove({
        step: T('∧ 是一对', '∧ is a pair'),
        tests: [{ premises: { p: 'A ∧ B' }, goal: 'B ∧ A', term: '⟨p.2, p.1⟩' }],
        cases: TWO,
        briefNote: T('证明项须为 ⟨p.2, p.1⟩。', 'Its proof term must be ⟨p.2, p.1⟩.'),
        hint: [T('⟨a, b⟩ 是拼成的一对；p.1 是 p 的左一半，p.2 是右一半。', '⟨a, b⟩ is a pair joined; p.1 is the left half of p, p.2 the right.')],
        solution: proof({ e: ['andE'], i: ['andI'] }, ['p>e.ab', 'e#right>i.a', 'e#left>i.b', 'i>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('∨ 带着标签', '∨ carries a tag'),
        tests: [{ premises: { p: 'A ∨ B' }, goal: 'B ∨ A', term: 'p.elim (fun a => Or.inr a) (fun b => Or.inl b)' }],
        cases: TWO,
        brief: T('从已知 p：「下雨 ∨ 今天是周六」证出「今天是周六 ∨ 下雨」，证明项须为 p.elim (fun a => Or.inr a) (fun b => Or.inl b)。', 'From p: “it rains ∨ today is Saturday”, prove “today is Saturday ∨ it rains” with the term p.elim (fun a => Or.inr a) (fun b => Or.inl b).'),
        hint: [T('Or.inl、Or.inr 是贴上「左边」「右边」的标签；p.elim 后面的两个 fun 是分情况的两个格子。', 'Or.inl and Or.inr put on the tags “left” and “right”; the two funs after p.elim are the two compartments of Cases.')],
        solution: proof({ e: ['orE'], l: ['orI', { other: 'B', side: 'left' }, 'e/left'], r: ['orI', { other: 'A', side: 'right' }, 'e/right'] }, ['p>e.ab', 'e#left>l.a', 'l>e.left', 'e#right>r.a', 'r>e.right', 'e>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('⊥ 是空的', '⊥ is empty'),
        tests: [{ premises: { p: 'A', q: '¬A' }, goal: 'B', term: 'False.elim (q p)' }],
        cases: TWO,
        brief: T('从已知 p：「下雨」、q：「¬下雨」证出「今天是周六」，证明项须为 False.elim (q p)。', 'From p: “it rains” and q: “¬it rains”, prove “today is Saturday” with the term False.elim (q p).'),
        hint: [T('¬下雨 就是 下雨 → ⊥，所以 q p 是矛盾；False.elim 把矛盾变成想要的任何一句。', '¬it rains is it rains → ⊥, so q p is the contradiction; False.elim turns it into any sentence wanted.')],
        solution: proof({ m: ['mp'], b: ['botE', { C: 'B' }] }, ['q>m.imp', 'p>m.a', 'm>b.bot', 'b>goal'], { premises: ['p', 'q'] }),
      }),
    ],
    intro: [
      { t: T('「若…则…」的证明是函数，别的连接词的证明是<b>数据</b>。「A ∧ B」的证明是一<b>对</b>，写作 ⟨a, b⟩，p.1、p.2 取出它的两半。「A ∨ B」只有一边成立，证明带着<b>标签</b>：Or.inl a 是「左边，证明是 a」，Or.inr b 是「右边」；分情况写作 p.elim f g，按标签决定用 f 还是 g。', 'A proof of an “if … then …” is a function; the other connectives’ proofs are <b>data</b>. A proof of “A ∧ B” is a <b>pair</b>, written ⟨a, b⟩, and p.1 and p.2 take out its halves. In “A ∨ B” only one side holds, so its proof carries a <b>tag</b>: Or.inl a means “the left one, proved by a”, Or.inr b “the right one”; Cases is written p.elim f g, and the tag decides whether f or g is used.') },
      { t: T('否定不需要新东西：¬A 就是 A → ⊥。⊥ 没有证明，像一个没有值的类型；万一有了一个，<b>False.elim</b> 把它当作任何一句的证明。', 'Negation needs nothing new: ¬A is A → ⊥. ⊥ has no proof, like a type with no values; should one turn up, <b>False.elim</b> makes it a proof of any sentence.') },
    ],
    after: T('证明板上的每条规则，不是造一种值，就是用一种值。', 'Every rule on the proof board either makes a kind of value or uses one.'),
  },

  // ---------- writing terms ----------
  {
    id: 't-wapp',
    title: T('写函数', 'Write functions'),
    tasks: write([
      { premises: { p: 'Rain → (Wind → Wet)', q: 'Rain', r: 'Wind' }, goal: 'Wet', answer: 'p q r', hint: [T('套用写成「□ □」：前一个框放函数，后一个框放用在它上面的证明。p q r 是 (p q) r。', 'Apply is “□ □”: the function in the first box, the proof it is used on in the second. p q r is (p q) r.')] },
      { premises: { p: 'Rain → Wet', q: 'Wet → Slip', r: 'Rain' }, goal: 'Slip', answer: 'q (p r)', hint: [T('最后用的是 q，它要的「地湿」从哪来？', 'The last one used is q; where does the “ground is wet” it needs come from?')] },
      { premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Slip', answer: 'fun a => q (p a)', hint: [T('假设框写作「fun _ => □」。拿到下雨的证明 a 以后，先交给谁？', 'The assumption box is “fun _ => □”. Once a proves it rains, who gets it first?')] },
      { premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Slip', uses: ['chain'], answer: 'chain p q', hint: [T('<part-ref to="lemma:chain"></part-ref>这条引理是一个函数，吃它的两条前提。', 'The lemma <part-ref to="lemma:chain"></part-ref> is a function taking its two premises.')] },
      { premises: { p: 'Rain → (Wind → Wet)' }, goal: 'Wind → (Rain → Wet)', answer: 'fun a b => p b a', hint: [T('两层 fun：a 证的是刮风，b 证的是下雨。p 先要哪一个？', 'Two funs: a proves it is windy, b that it rains. Which does p want first?')] },
    ]),
    intro: [{ t: T('到这里为止，证明项都由元件写出。现在反过来：自己写证明项，交给证明助手检查。新的板叫<b>证明项板</b>，不接线，用下面的块拼出证明项：放进去的块写成字，它要填的地方留成框，框里再放别的块。拼完后，证明助手检查证明项的类型是不是要证的那句话。', 'So far the parts have written the terms. Now the other way round: write the term yourself and let the proof assistant check it. The new board is the <b>term board</b>. No wiring: build the term from the pieces below. A piece put in is written out, with a box for each place it leaves open, and other pieces go in those boxes. When it is whole, the proof assistant checks that the term’s type is the sentence to prove.') }],
  },
  {
    id: 't-wpair',
    title: T('写数据', 'Write data'),
    tasks: write([
      { premises: { p: 'Rain ∧ Wind → Wet' }, goal: 'Rain → (Wind → Wet)', answer: 'fun a b => p ⟨a, b⟩', hint: [T('引入 ∧ 写成「⟨□, □⟩」：拿到 a 和 b，拼成一对交给 p。', '∧ intro is “⟨□, □⟩”: given a and b, make a pair and give it to p.')] },
      { premises: { p: 'Rain → (Wind → Wet)' }, goal: 'Rain ∧ Wind → Wet', answer: 'fun a => p a.1 a.2', hint: [T('消去 ∧ 写成「□.1」「□.2」：拿到的 a 是一对，p 要的却是一个一个。', '∧ elim is “□.1” and “□.2”: the a you get is a pair, but p wants them one at a time.')] },
      { premises: { p: 'Rain ∨ Sat' }, goal: 'Sat ∨ Rain', answer: 'p.elim (fun a => Or.inr a) (fun b => Or.inl b)', hint: [T('分情况写成「□.elim (fun _ => □) (fun _ => □)」，引入 ∨ 写成 Or.inl、Or.inr：每种情况各贴到新「或者」的哪一边？', 'Cases is “□.elim (fun _ => □) (fun _ => □)”, ∨ intro is Or.inl or Or.inr: in the new “or”, which side does each case go?')] },
      { premises: { p: 'Rain', q: '¬Rain' }, goal: 'Rest', answer: 'False.elim (q p)', hint: [T('矛盾推出一切写成「False.elim □」；q 用在 p 上是矛盾。', 'From contradiction is “False.elim □”; q used on p is the contradiction.')] },
    ]),
    after: T('A ∧ B → C 和 A → (B → C) 可以互相改写，这叫<wiki-ref to="currying"></wiki-ref>。', 'A ∧ B → C and A → (B → C) can each be rewritten as the other. This is <wiki-ref to="currying"></wiki-ref>.'),
  },
  {
    id: 't-wquant',
    consts: ['ann'],
    title: T('写量词', 'Write quantifiers'),
    tasks: write([
      { premises: { p: '∀x. Human(x) → Mortal(x)', q: 'Human(ann)' }, goal: 'Mortal(ann)', answer: 'p ann q', hint: [T('<part-ref to="part:allE"></part-ref>写成应用，参数是那样东西：p 用在安上，再用在 q 上。', '<part-ref to="part:allE"></part-ref> is an application whose argument is a thing: p used on Ann, then on q.')] },
      { premises: {}, goal: '∀x. Human(x) → Human(x)', answer: 'fun a b => b', hint: [T('<part-ref to="part:allI"></part-ref>也是 fun，拿到的 a 是一样东西。', '<part-ref to="part:allI"></part-ref> is a fun too, and the a it gets is a thing.')] },
      { premises: { p: 'Human(ann)' }, goal: '∃x. Human(x)', answer: '⟨ann, p⟩', hint: [T('<part-ref to="part:exI"></part-ref>写成一对：左边是例子，右边是它满足的证明。', '<part-ref to="part:exI"></part-ref> is a pair: the example on the left, the proof that it fits on the right.')] },
      { premises: { p: '∃x. Human(x) ∧ Mortal(x)' }, goal: '∃x. Mortal(x)', answer: 'p.elim (fun a b => ⟨a, b.2⟩)', hint: [T('<part-ref to="part:exE"></part-ref>写成「□.elim (fun _ _ => □)」：a 是那样东西，b 是它满足的那句。', '<part-ref to="part:exE"></part-ref> is “□.elim (fun _ _ => □)”: a is the thing, b the sentence it fits.')] },
    ]),
    intro: [{ t: T('安这样表示东西的名字，也在下面的块里。', 'Names of things, such as Ann, are among the pieces below.') }],
  },
  {
    id: 't-kernel',
    title: T('核来把关', 'The kernel checks'),
    tasks: write([
      { premises: { p: 'Rain → Wet', q: 'Rain' }, goal: 'Wet', given: 'q p', answer: 'p q', hint: [T('先点检查，看核说什么：谁是函数，谁是参数？', 'Check first and see what the kernel says: which is the function, which the argument?')] },
      { premises: { p: 'Rain ∧ Wind' }, goal: 'Wind ∧ Rain', given: '⟨p.1, p.2⟩', answer: '⟨p.2, p.1⟩', hint: [T('要证的这一对，左边该是哪一半？', 'In the pair to prove, which half goes on the left?')] },
      { premises: { p: 'Rain ∨ Sat' }, goal: 'Sat ∨ Rain', given: 'p.elim (fun a => Or.inl a) (fun b => Or.inr b)', answer: 'p.elim (fun a => Or.inr a) (fun b => Or.inl b)', hint: [T('a 证的是下雨，在「今天是周六 ∨ 下雨」里，下雨在哪一边？', 'a proves it rains; in “today is Saturday ∨ it rains”, which side is that?')] },
      { premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Slip', given: 'fun a => p (q a)', answer: 'fun a => q (p a)', hint: [T('拿到的 a 证的是下雨，先该交给谁？', 'The a you get proves it rains: who should get it first?')] },
    ]),
    intro: [{ t: T('检查证明项的，是证明器的核。这几个证明项是别人写的，都声称证出了要证的那句。先点检查，看核怎么说，再把它们改对。', 'What checks a proof term is the prover’s kernel. These terms were written by someone else, each claiming to prove its sentence. Check first and see what the kernel says, then put them right.') }],
    after: T('核只看类型，不管证明项是谁写的、怎样找到的。证明项留下来，谁都能再查一遍。', 'The kernel looks only at types, not at who wrote a term or how it was found. A proof term kept can be checked again by anyone.'),
  },

  // ---------- detours ----------
  {
    id: 't-beta',
    title: T('算掉弯路', 'Computing detours away'),
    tasks: [
      prove({
        step: T('套用一个框', 'Applying a box'),
        tests: [{ premises: { p: 'A' }, goal: 'A ∧ A', term: '(fun h => ⟨h, h⟩) p' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        briefNote: T('证明项须为 (fun h => ⟨h, h⟩) p。', 'Its proof term must be (fun h => ⟨h, h⟩) p.'),
        hint: [T('一个框，框外马上套用在 p 上。', 'A box, applied to p right outside it.')],
        solution: pairBox,
      }),
      prove({
        step: T('标签刚贴上就拆', 'A tag read at once'),
        tests: [{ premises: { p: 'A', q: 'A → C', r: 'B → C' }, goal: 'C', term: '(Or.inl p).elim (fun a => q a) (fun b => r b)' }],
        cases: [{ A: 'Rain', B: 'Sat', C: 'Rest' }, { A: 'Coffee', B: 'Tea', C: 'Awake' }],
        brief: T('从已知 p：「下雨」、q：「下雨 → 我休息」、r：「今天是周六 → 我休息」证出「我休息」，证明项须为 (Or.inl p).elim (fun a => q a) (fun b => r b)。', 'From p: “it rains”, q: “it rains → I rest” and r: “today is Saturday → I rest”, prove “I rest” with the term (Or.inl p).elim (fun a => q a) (fun b => r b).'),
        hint: [T('先给 p 贴上「左边」的标签，变成一句「或者」，再分情况。', 'First tag p as “the left one”, making an “or”, then take cases.')],
        solution: proof(orDetour, [...orDetourWires, 'e>goal'], { premises: ['p', 'q', 'r'] }),
      }),
      prove({
        step: T('没有弯路的那一个', 'The one with no detour'),
        tests: [{ premises: { p: 'A' }, goal: 'A ∧ A', term: '⟨p, p⟩' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        brief: T('还是从「下雨」证出「下雨 ∧ 下雨」，证明项须为 ⟨p, p⟩。', 'Again from “it rains” prove “it rains ∧ it rains”, now with the term ⟨p, p⟩.'),
        hint: [T('第一段的框，算下来是什么？', 'What does the box of the first task work out to?')],
        solution: proof({ c: ['andI'] }, ['p>c.a', 'p>c.b', 'c>goal'], { premises: ['p'] }),
        naive: pairBox,
      }),
      prove({
        step: T('只走标签那一支', 'Only the tagged branch'),
        tests: [{ premises: { p: 'A', q: 'A → C', r: 'B → C' }, goal: 'C', term: 'q p' }],
        cases: [{ A: 'Rain', B: 'Sat', C: 'Rest' }, { A: 'Coffee', B: 'Tea', C: 'Awake' }],
        brief: T('还是证出「我休息」，证明项须为 q p。', 'Again prove “I rest”, now with the term q p.'),
        hint: [T('标签是「左边」，分情况只会走左边那一支。', 'The tag says “the left one”, so the case split only takes the left branch.')],
        solution: proof({ m: ['mp'] }, ['q>m.imp', 'p>m.a', 'm>goal'], { premises: ['p', 'q', 'r'] }),
        naive: proof(orDetour, [...orDetourWires, 'e>goal'], { premises: ['p', 'q', 'r'] }),
      }),
    ],
    intro: [
      { t: T('同一句话可以有好几个证明项，有的绕了远路：刚造出一样东西，马上又用掉。⟨p, q⟩.1 先拼后拆，算下来就是 p；框造出的函数马上用在 p 上，算下来是框里的证明，其中的 h 都换成 p。前两段先接出两条这样的弯路。', 'One sentence can have several terms, and some go the long way round: something made and at once used up. ⟨p, q⟩.1 joins and splits, and works out to p; a function from a box used on p at once works out to the proof inside, with every h replaced by p. The first two tasks wire two such detours.') },
      { t: T('拿掉弯路是一次计算：每一种弯路，核都有一条<b>计算规则</b>，把它换成算下来的样子。后两段证同样的两句，接出算下来的那一个。', 'Taking a detour out is a computation: for each kind of detour the kernel has a <b>computation rule</b> that puts what it works out to in its place. The last two tasks prove the same two sentences, wired as what they work out to.') },
    ],
    after: T('算掉框的这一步叫<wiki-ref to="beta"></wiki-ref>；弯路一处不剩的证明项，叫<wiki-ref to="normal-form"></wiki-ref>。', 'Computing a box away is <wiki-ref to="beta"></wiki-ref>; a term with no detour left is in <wiki-ref to="normal-form"></wiki-ref>.'),
  },
  {
    id: 't-lemma',
    title: T('引理也是证明项', 'A lemma is a term too'),
    tasks: [
      prove({
        step: T('用串联', 'With Chain'),
        tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C', term: 'chain p q' }],
        cases: CHAIN,
        briefNote: T('证明项须为 chain p q。', 'Its proof term must be chain p q.'),
        hint: [T('一张<part-ref to="lemma:chain"></part-ref>就够。', 'One <part-ref to="lemma:chain"></part-ref> is enough.')],
        solution: proof({ c: ['chain'] }, ['p>c.p0', 'q>c.p1', 'c>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        step: T('不用串联', 'Without Chain'),
        without: ['chain'],
        tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C', term: 'fun h => q (p h)' }],
        cases: CHAIN,
        brief: T('不用<part-ref to="lemma:chain"></part-ref>再证一次，证明项须为 fun h => q (p h)。', 'Prove it again without <part-ref to="lemma:chain"></part-ref>, with the term fun h => q (p h).'),
        hint: [T('当初证<part-ref to="lemma:chain"></part-ref>时接的是什么？', 'What did you wire when you proved <part-ref to="lemma:chain"></part-ref>?')],
        solution: proof({ f: ['impI', { A: 'A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
      }),
    ],
    intro: [{ t: T('证过的引理在证明项里写成它的名字：用了<part-ref to="lemma:chain"></part-ref>，证明项里就是 chain p q。名字背后是证出它的那个证明项。', 'A lemma you proved appears in a term by its name: use <part-ref to="lemma:chain"></part-ref>, and the term says chain p q. Behind the name is the term that proved it.') }],
  },

  // ---------- quantifiers ----------
  {
    id: 't-all',
    consts: ['ann'],
    title: T('量词的证明项', 'Quantifiers’ proof terms'),
    tasks: [
      prove({
        step: T('∀ 是函数', '∀ is a function'),
        tests: [{ premises: { p: '∀x. P(x) → Q(x)', q: 'P(ann)' }, goal: 'Q(ann)', term: 'p ann q' }],
        cases: PERSON,
        briefNote: T('证明项须为 p ann q。', 'Its proof term must be p ann q.'),
        hint: [T('p ann：把安交给 p，得到的是关于安的那句话。', 'p ann: hand Ann to p, and out comes the sentence about Ann.')],
        solution: proof({ e: ['allE', { t: 'ann' }], m: ['mp'] }, ['p>e.all', 'e>m.imp', 'q>m.a', 'm>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        step: T('全称概括是 fun', 'For any is fun'),
        tests: [{ goal: '∀x. P(x) → P(x)', term: 'fun a h => h' }],
        cases: PERSON,
        brief: T('不用任何已知，证出「∀x. x是人 → x是人」，证明项须为 fun a h => h。', 'From nothing given, prove “∀x. x is human → x is human” with the term fun a h => h.'),
        hint: [T('fun a 是全称概括的框（a 是任取的那一样），fun h 是假设框。', 'fun a is the for-any box (a the thing taken), fun h the assumption box.')],
        solution: proof({ g: ['allI', { x: 'a' }], h: ['impI', { A: 'P(a)' }, 'g'] }, ['h#body>h.body', 'h>g.body', 'g>goal']),
      }),
      prove({
        step: T('∃ 是一对', '∃ is a pair'),
        tests: [{ premises: { p: 'P(ann)' }, goal: '∃x. P(x)', term: '⟨ann, p⟩' }],
        cases: PERSON,
        brief: T('从已知 p：「安是人」证出「∃x. x是人」，证明项须为 ⟨ann, p⟩。', 'From p: “Ann is human”, prove “∃x. x is human” with the term ⟨ann, p⟩.'),
        hint: [T('一对的左边是例子，右边是例子满足它的证明。', 'The pair’s left is the example, its right the proof that the example fits.')],
        solution: proof({ i: ['exI'] }, ['p>i.a', 'i>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('存在实例化', 'Taking it out'),
        tests: [{ premises: { p: '∃x. P(x) ∧ Q(x)' }, goal: '∃x. P(x)', term: 'p.elim (fun a h => ⟨a, h.1⟩)' }],
        cases: PERSON,
        brief: T('从已知 p：「∃x. x是人 ∧ x会死」证出「∃x. x是人」，证明项须为 p.elim (fun a h => ⟨a, h.1⟩)。', 'From p: “∃x. x is human ∧ x is mortal”, prove “∃x. x is human” with the term p.elim (fun a h => ⟨a, h.1⟩).'),
        hint: [T('fun a h 是存在实例化的框：a 是那样东西，h 是它满足的那句。', 'fun a h is the take-the-one box: a is the thing, h the sentence it fits.')],
        solution: proof({ f: ['exE', { x: 'a' }], s: ['andE', {}, 'f'], i: ['exI', {}, 'f'] }, ['p>f.ex', 'f#body>s.ab', 's#left>i.a', 'i>f.body', 'f>goal'], { premises: ['p'] }),
      }),
    ],
    intro: [{ t: T('「∀x. …」的证明也是函数，只是参数不是证明，而是一样东西：给它 t，它还你关于 t 的那句话的证明。这叫<wiki-ref to="dep-function"></wiki-ref>，<part-ref to="part:allE"></part-ref>写作 p ann。「∃x. …」的证明是一<b>对</b>：一样东西（见证）和它满足那句话的证明；用它时写 p.elim (fun a h => …)。', 'A proof of “∀x. …” is a function too, but its argument is a thing, not a proof: given t, it gives back a proof of the sentence about t. This is a <wiki-ref to="dep-function"></wiki-ref>, and <part-ref to="part:allE"></part-ref> is written p ann. A proof of “∃x. …” is a <b>pair</b>: a thing (the witness) and a proof that it fits; using one is written p.elim (fun a h => …).') }],
    after: T('→ 就是不依赖参数的 ∀。', '→ is just a ∀ that does not depend on its argument.'),
  },

  // ---------- challenge ----------
  {
    id: 't-dneg',
    title: T('双重否定的证明项', 'The term of double negation'),
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
    intro: [{ t: T('先把每个 ¬ 换成「→ ⊥」，再读要证的句子。', 'Turn every ¬ into “→ ⊥”, then read the sentence to prove.') }],
    after: T('反方向的 ¬¬A → A 写不出证明项：没有程序能从「A 不会不成立」变出 A 的证明。反证法要用，只能作为公理另外加上。', 'The other way, ¬¬A → A, has no term: no program can conjure a proof of A out of “A cannot fail”. Proof by contradiction can only come in as an axiom of its own.'),
  },
]
