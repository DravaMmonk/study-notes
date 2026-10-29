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
        briefNote: T('证明项要是 p q r。', 'Its proof term must be p q r.'),
        hint: [T('p q r 是 (p q) r：先把 p 用在 q 上，得到的再用在 r 上。', 'p q r is (p q) r: first p used on q, then what that gives used on r.')],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'q>m1.a', 'm1>m2.imp', 'r>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      }),
      prove({
        step: T('括号', 'Brackets'),
        tests: [{ premises: { p: 'A → B', q: 'B → C', r: 'A' }, goal: 'C', term: 'q (p r)' }],
        cases: CHAIN,
        brief: T('再从已知 p：「下雨 → 地湿」、q：「地湿 → 路滑」、r：「下雨」证明出「路滑」，证明项要是 q (p r)。', 'Now from p: “it rains → the ground is wet”, q: “the ground is wet → the road is slippery” and r: “it rains”, prove “the road is slippery”, with the term q (p r).'),
        hint: [T('括号里的先算：p r 是一次套用，q 再用在它上面。', 'What is in brackets comes first: p r is one Apply, and q is used on that.')],
        solution: proof({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'r>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>goal'], { premises: ['p', 'q', 'r'] }),
      }),
    ],
    intro: [
      { t: T("此前证明板显示命题是否已经证明。本章进一步观察证明本身：将推导表示为<wiki-ref to=\"proof-term\"></wiki-ref>，并通过类型检查验证它。这里借鉴<wiki-ref to=\"lean\"></wiki-ref>的证明项表示；从本关起，证明板上的元件也显示其证明项。", "The proof board has so far shown whether a proposition is proved. This chapter examines the proof itself: a derivation is represented by a <wiki-ref to=\"proof-term\"></wiki-ref> and checked against its type. The presentation follows the proof-term approach of <wiki-ref to=\"lean\"></wiki-ref>; proof parts now display their terms.") },
      { t: T("每条已知都有一个名称，对应其证明项。A → B 的证明可看作一个<b>函数</b>：给它 A 的证明，就得到 B 的证明。因此套用对应<b>函数应用</b>，写作 p q。", "Each given has a name that denotes its proof term. A proof of A → B can be viewed as a <b>function</b>: given a proof of A, it yields a proof of B. Apply therefore corresponds to <b>function application</b>, written p q.") },
      { t: T("目标元件显示所要求的证明项。先阅读它的结构，再搭建对应证明。", "The goal part shows the required proof term. Read its structure before building the corresponding proof.") },
    ],
    after: T('套用就是函数应用；p q r 是先 p q、再用在 r 上，括号改变的是先算哪一个。一个有两个条件的「若…则…」，就是一个一次吃一个参数的函数。', 'Apply is function application; p q r is p q first, then used on r, and brackets change which comes first. An “if … then …” with two conditions is a function that takes its arguments one at a time.'),
  },
  {
    id: 't-lam',
    title: T('框就是 λ', 'The box is λ'),
    tasks: [
      prove({
        step: T('一个框', 'One box'),
        tests: [{ premises: { p: 'A → (B → C)', q: 'B' }, goal: 'A → C', term: 'fun h => p h q' }],
        cases: RAIN,
        briefNote: T('证明项要是 fun h => p h q。', 'Its proof term must be fun h => p h q.'),
        hint: [T('fun h => … 是一个框，h 是框里假设的那一句；箭头后面是框里要接出的东西。', 'fun h => … is a box, h the sentence it assumes; after the arrow is what is wired inside it.')],
        solution: proof({ f: ['impI', { A: 'A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'm1>m2.imp', 'q>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        step: T('外层的假设', 'The outer assumption'),
        tests: [{ goal: 'A → (A → A)', term: 'fun a b => a' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        brief: T('不需要任何已知，证明出「下雨 → (下雨 → 下雨)」，证明项要是 fun a b => a。', 'From nothing given, prove “it rains → (it rains → it rains)”, with the term fun a b => a.'),
        hint: [T('fun a b => … 是 fun a => fun b => … 的简写：两层框，外层假设 a，里层假设 b。', 'fun a b => … is short for fun a => fun b => …: two boxes, the outer assuming a, the inner b.')],
        solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: 'A' }, 'f'] }, ['f#body>g.body', 'g>f.body', 'f>goal']),
      }),
      prove({
        step: T('里层的假设', 'The inner assumption'),
        tests: [{ goal: 'A → (A → A)', term: 'fun a b => b' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        brief: T('同一句，证明项要是 fun a b => b。', 'The same sentence, with the term fun a b => b.'),
        hint: [T('这回要的是里层框的那个假设。', 'This time the one wanted is the inner box’s assumption.')],
        solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: 'A' }, 'f'] }, ['g#body>g.body', 'g>f.body', 'f>goal']),
      }),
    ],
    intro: [
      { t: T('套用把一个函数用在证明上。那函数从哪来？证明板上，「若…则…」是假设框造出来的。要造一个函数，就写 <b>fun h => …</b>：「拿到一个 h，就给出 …」。假设框做的正是这件事：框里假设的那一句有了一个名字 h，框里证出的东西用到 h，框外得到的是一个等着 h 的函数。这就是<wiki-ref to="lambda"></wiki-ref>（也可以写成 λ h => …）。', 'Apply uses a function on a proof. Where does the function come from? On the proof board, an “if … then …” is made by the assumption box. To make a function, write <b>fun h => …</b>: “given an h, give …”. The assumption box does just that: the sentence it assumes gets a name h, what is proved inside uses h, and outside you get a function waiting for an h. This is <wiki-ref to="lambda"></wiki-ref> (it may also be written λ h => …).') },
      { t: T('框里的假设在元件上叫 h1；框套框时，里面一层叫 h2。名字只是记号：fun h => h 和 fun x => x 是同一个证明项。', 'A box’s assumption is called h1 on the part; a box inside it calls its own h2. The names are only labels: fun h => h and fun x => x are the same term.') },
    ],
    after: T('假设框就是 λ：框里的假设是参数，框里的证明是函数体。后两段证的是同一句，证明项却不同：真值表只说一句话真不真，证明项还记得它<b>为什么</b>真，就像同一个类型可以有不同的程序。', 'The assumption box is λ: its assumption is the parameter, its proof the body. The last two prove the same sentence with different terms: a truth table only says whether a sentence is true, a proof term also remembers <b>why</b>, as one type can have different programs.'),
  },
  {
    id: 't-pair',
    title: T('其余的连接词是数据', 'The other connectives are data'),
    tasks: [
      prove({
        step: T('∧ 是一对', '∧ is a pair'),
        tests: [{ premises: { p: 'A ∧ B' }, goal: 'B ∧ A', term: 'p.elim (fun a b => ⟨b, a⟩)' }],
        cases: TWO,
        briefNote: T('证明项要是 p.elim (fun a b => ⟨b, a⟩)。', 'Its proof term must be p.elim (fun a b => ⟨b, a⟩).'),
        hint: [T('⟨a, b⟩ 是拼成的一对；p.elim (fun a b => …) 把 p 拆成两半，a 是左一半，b 是右一半。', '⟨a, b⟩ is a pair joined; p.elim (fun a b => …) takes p apart, a its left half and b its right.')],
        solution: proof({ e: ['andCases'], i: ['andI', {}, 'e'] }, ['p>e.ab', 'e#right>i.a', 'e#left>i.b', 'e>goal', 'i>e.body'], { premises: ['p'] }),
      }),
      prove({
        step: T('∨ 带着标签', '∨ carries a tag'),
        tests: [{ premises: { p: 'A ∨ B' }, goal: 'B ∨ A', term: 'p.elim (fun a => Or.inr a) (fun b => Or.inl b)' }],
        cases: TWO,
        brief: T('从已知 p：「下雨 ∨ 今天是周六」证明出「今天是周六 ∨ 下雨」，证明项要是 p.elim (fun a => Or.inr a) (fun b => Or.inl b)。', 'From p: “it rains ∨ today is Saturday”, prove “today is Saturday ∨ it rains”, with the term p.elim (fun a => Or.inr a) (fun b => Or.inl b).'),
        hint: [T('Or.inl、Or.inr 是贴上「左边」「右边」的标签；p.elim 后面的两个 fun 是分情况的两个格子。', 'Or.inl and Or.inr put on the tags “left” and “right”; the two funs after p.elim are the two compartments of Cases.')],
        solution: proof({ e: ['orE'], l: ['orI', { other: 'B', side: 'left' }, 'e/left'], r: ['orI', { other: 'A', side: 'right' }, 'e/right'] }, ['p>e.ab', 'e#left>l.a', 'l>e.left', 'e#right>r.a', 'r>e.right', 'e>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('⊥ 是空的', '⊥ is empty'),
        tests: [{ premises: { p: 'A', q: '¬A' }, goal: 'B', term: 'False.elim (q p)' }],
        cases: TWO,
        brief: T('从已知 p：「下雨」、q：「¬下雨」证明出「今天是周六」，证明项要是 False.elim (q p)。', 'From p: “it rains” and q: “¬it rains”, prove “today is Saturday”, with the term False.elim (q p).'),
        hint: [T('¬下雨 就是 下雨 → ⊥，所以 q p 是矛盾；False.elim 把矛盾变成想要的任何一句。', '¬it rains is it rains → ⊥, so q p is the contradiction; False.elim turns it into any sentence wanted.')],
        solution: proof({ m: ['mp'], b: ['botE', { C: 'B' }] }, ['q>m.imp', 'p>m.a', 'm>b.bot', 'b>goal'], { premises: ['p', 'q'] }),
      }),
    ],
    intro: [
      { t: T('「若…则…」的证明是函数。别的连接词，证明是各种<b>数据</b>：「A ∧ B」的证明是一<b>对</b>，写作 ⟨a, b⟩；消去 ∧ 写成 p.elim (fun a b => …)，把这一对拆成两半交给框里（只要一半时，也可以写成 p.1、p.2）。「A ∨ B」只有一边成立，证明带着<b>标签</b>：Or.inl a 说「是左边，证明是 a」，Or.inr b 说「是右边」；分情况写成 p.elim f g，看标签决定用 f 还是 g。', 'A proof of an “if … then …” is a function. The other connectives’ proofs are kinds of <b>data</b>: a proof of “A ∧ B” is a <b>pair</b>, written ⟨a, b⟩; ∧ elim is p.elim (fun a b => …), handing its two halves into the box (or, for one half alone, p.1 or p.2). In “A ∨ B” only one side holds, and its proof carries a <b>tag</b>: Or.inl a says “the left one, proved by a”, Or.inr b “the right one”; Cases is written p.elim f g, the tag deciding whether f or g is used.') },
      { t: T('否定不用新东西：¬A 就是 A → ⊥，它的证明是一个函数，给它 A 的证明，还你一个矛盾。⊥ 没有证明，像一个没有任何值的类型；万一手里有了一个，<b>False.elim</b> 就把它当成任何一句的证明。', 'Negation needs nothing new: ¬A is A → ⊥, and its proof is a function that, given a proof of A, gives back a contradiction. ⊥ has no proof, like a type with no values; should you hold one, <b>False.elim</b> makes it a proof of any sentence.') },
    ],
    after: T('引入 ∧ 是造一对，消去 ∧ 是取出分量；∨ 是带标签的值，分情况是按标签分支，程序里的 match；矛盾推出一切，在程序里是「这一支走不到」。证明板上的每一条规则，都是造一种值或者用一种值。', 'Joining ∧ makes a pair and splitting it takes a component; ∨ is a tagged value and Cases branches on the tag, a match in a program; from a contradiction anything, in a program, is “this branch is never reached”. Every rule on the proof board makes a kind of value or uses one.'),
  },

  // ---------- writing terms ----------
  {
    id: 't-wapp',
    title: T('写函数', 'Write functions'),
    tasks: write([
      { premises: { p: 'Rain → (Wind → Wet)', q: 'Rain', r: 'Wind' }, goal: 'Wet', answer: 'p q r', hint: [T('套用写成「□ □」：前一个框放函数，后一个框放用在它上面的证明。p q r 是 (p q) r。', 'Apply is “□ □”: the function in the first box, the proof it is used on in the second. p q r is (p q) r.')] },
      { premises: { p: 'Rain → Wet', q: 'Wet → Slip', r: 'Rain' }, goal: 'Slip', answer: 'q (p r)', hint: [T('最后用的是 q，它要的「地湿」从哪来？', 'The last one used is q; where does the “ground is wet” it needs come from?')] },
      { premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Slip', answer: 'fun a => q (p a)', hint: [T('假设框写成「fun _ => □」：拿到 a，先用 p，再用 q。', 'The assumption box is “fun _ => □”: given a, use p, then q.')] },
      { premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Slip', uses: ['chain'], answer: 'chain p q', hint: [T('串联这条引理是一个函数，吃它的两条前提。', 'The lemma Chain is a function taking its two premises.')] },
      { premises: { p: 'Rain → (Wind → Wet)' }, goal: 'Wind → (Rain → Wet)', answer: 'fun a b => p b a', hint: [T('两层 fun：a 证的是刮风，b 证的是下雨。p 先要哪一个？', 'Two funs: a proves it is windy, b that it rains. Which does p want first?')] },
    ]),
    intro: [{ t: T('前面每一关都在接线，证明项是元件写出来的：套用写成应用，假设框写成 fun，证出的引理写成它的名字。现在反过来，自己写证明项，交给证明助手去查。新的板：<b>证明项板</b>。不接线了，用下面的块把证明项拼出来：块填进去就写成字，它自己要填的地方留成框，再往框里填别的块。拼完了，证明助手检查这个证明项的类型是不是要证的那句话。', 'Every level so far was wired, and the parts wrote the terms: Apply as application, the assumption box as fun, a lemma proved as its name. Now the other way round: write the term yourself and let the proof assistant check it. A new board: the <b>term board</b>. No wiring now: build the proof term from the pieces below. A piece put in is written out, with a box for each place it leaves to fill, and other pieces go in those boxes. When it is whole, the proof assistant checks that the term’s type is the sentence to prove.') }],
    after: T("证明助手检查拼出的证明项及其类型。在函数应用中，函数的输入类型必须与参数的类型匹配。本组任务分别比较展开的证明、引用引理以及嵌套假设对应的函数。", "The proof assistant checks the constructed proof term and its type. In a function application, the function’s input type must match the argument’s type. These tasks compare an expanded proof, a lemma reference, and functions corresponding to nested assumptions."),
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
    intro: [{ t: T('其余连接词的元件也都写成证明项：引入 ∧ 是 ⟨a, b⟩，消去 ∧ 是 p.elim (fun a b => …)；引入 ∨ 是 Or.inl、Or.inr，分情况是 p.elim；矛盾推出一切是 False.elim。', 'The other connectives’ parts are written as terms too: ∧ intro is ⟨a, b⟩, ∧ elim p.elim (fun a b => …); ∨ intro is Or.inl or Or.inr, Cases is p.elim; from contradiction, anything, is False.elim.') }],
    after: T('前两题一来一回：吃一对的函数和一个一个吃的函数可以互相改写，这叫<wiki-ref to="currying"></wiki-ref>（Curry），<wiki-ref to="curry-howard"></wiki-ref>里的 Curry 也是他。连接词的元件，到这里都写过了。', 'The first two go there and back: a function taking a pair and one taking its arguments one at a time can each be rewritten as the other. This is <wiki-ref to="currying"></wiki-ref>, after Haskell Curry, the Curry of the <wiki-ref to="curry-howard"></wiki-ref>. Every connective’s part has been written now.'),
  },
  {
    id: 't-wquant',
    consts: ['ann'],
    title: T('写量词', 'Write quantifiers'),
    tasks: write([
      { premises: { p: '∀x. Human(x) → Mortal(x)', q: 'Human(ann)' }, goal: 'Mortal(ann)', answer: 'p ann q', hint: [T('取一个写成应用，参数是那样东西：p 用在安上，再用在 q 上。', 'Take one is an application whose argument is a thing: p used on Ann, then on q.')] },
      { premises: {}, goal: '∀x. Human(x) → Human(x)', answer: 'fun a b => b', hint: [T('任取也是 fun，拿到的 a 是一样东西。', 'For any is a fun too, and the a it gets is a thing.')] },
      { premises: { p: 'Human(ann)' }, goal: '∃x. Human(x)', answer: '⟨ann, p⟩', hint: [T('举例写成一对：左边是例子，右边是它满足的证明。', 'Example is a pair: the example on the left, the proof that it fits on the right.')] },
      { premises: { p: '∃x. Human(x) ∧ Mortal(x)' }, goal: '∃x. Mortal(x)', answer: 'p.elim (fun a b => ⟨a, b.2⟩)', hint: [T('拿出那一个写成「□.elim (fun _ _ => □)」：a 是那样东西，b 是它满足的那句。', 'Take the one there is is “□.elim (fun _ _ => □)”: a is the thing, b the sentence it fits.')] },
    ]),
    intro: [{ t: T('量词的元件也一样：取一个是把一样东西交给 ∀ 的证明，任取是 fun，举例是一对，拿出那一个是 p.elim (fun a h => …)。安这样的名字，也在下面的块里。', 'The quantifiers’ parts too: Take one hands a thing to a proof of ∀, For any is fun, Example is a pair, Take the one there is is p.elim (fun a h => …). A name of a thing such as Ann is among the pieces below.') }],
    after: T('证明板上的每一种元件，现在都能写成证明项。写的时候没有框可以拖、没有线可以接，只剩每一处的类型对不对得上。', 'Every kind of part on the proof board can now be written as a term. Writing, there is no box to drag and no wire to draw; all that is left is whether every type fits.'),
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
    intro: [{ t: T('写证明项时，每一处都是证明助手在查：查证明项的，就是证明器的核。这几个证明项是别人写的，都说证出了要证的那句。先点检查，看核怎么说，再把它们改对。核不管证明项是谁写的、怎么想出来的，只查每一处的类型对不对得上。', 'While you wrote terms, the proof assistant checked every place: what checks terms is the prover’s kernel. These proof terms were written by someone else, each claiming to prove its sentence. Check first and see what the kernel says, then mend them. The kernel does not care who wrote a proof term or how they found it; it only checks that every type fits.') }],
    after: T('核只认类型：写错一处，它就指出错在哪。证明项留了下来，谁都可以拿去再查一遍，不必相信写它的人，也不必相信想出它的那段自动化。检查证明的核可以做得很小，所以可信。', 'The kernel goes by types alone: one mistake and it says where. The proof term stays, and anyone can check it again, trusting neither whoever wrote it nor the automation that found it. The kernel that checks proofs can be small, and that is why it can be trusted.'),
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
        briefNote: T('证明项要是 (fun h => ⟨h, h⟩) p。', 'Its proof term must be (fun h => ⟨h, h⟩) p.'),
        hint: [T('一个框，框外马上套用在 p 上。', 'A box, applied to p right outside it.')],
        solution: pairBox,
      }),
      prove({
        step: T('标签刚贴上就拆', 'A tag read at once'),
        tests: [{ premises: { p: 'A', q: 'A → C', r: 'B → C' }, goal: 'C', term: '(Or.inl p).elim (fun a => q a) (fun b => r b)' }],
        cases: [{ A: 'Rain', B: 'Sat', C: 'Rest' }, { A: 'Coffee', B: 'Tea', C: 'Awake' }],
        brief: T('从已知 p：「下雨」、q：「下雨 → 我休息」、r：「今天是周六 → 我休息」证明出「我休息」，证明项要是 (Or.inl p).elim (fun a => q a) (fun b => r b)。', 'From p: “it rains”, q: “it rains → I rest” and r: “today is Saturday → I rest”, prove “I rest”, with the term (Or.inl p).elim (fun a => q a) (fun b => r b).'),
        hint: [T('先给 p 贴上「左边」的标签，变成一句「或者」，再分情况。', 'First tag p as “the left one”, making an “or”, then take cases.')],
        solution: proof(orDetour, [...orDetourWires, 'e>goal'], { premises: ['p', 'q', 'r'] }),
      }),
      prove({
        step: T('没有弯路的那一个', 'The one with no detour'),
        tests: [{ premises: { p: 'A' }, goal: 'A ∧ A', term: '⟨p, p⟩' }],
        cases: [{ A: 'Rain' }, { A: 'Sat' }],
        brief: T('还是从「下雨」证明出「下雨 ∧ 下雨」，证明项要是 ⟨p, p⟩。', 'Again from “it rains” prove “it rains ∧ it rains”, now with the term ⟨p, p⟩.'),
        hint: [T('第一段的框，算下来是什么？', 'What does the box of the first task work out to?')],
        solution: proof({ c: ['andI'] }, ['p>c.a', 'p>c.b', 'c>goal'], { premises: ['p'] }),
        naive: pairBox,
      }),
      prove({
        step: T('只走标签那一支', 'Only the tagged branch'),
        tests: [{ premises: { p: 'A', q: 'A → C', r: 'B → C' }, goal: 'C', term: 'q p' }],
        cases: [{ A: 'Rain', B: 'Sat', C: 'Rest' }, { A: 'Coffee', B: 'Tea', C: 'Awake' }],
        brief: T('还是证明出「我休息」，证明项要是 q p。', 'Again prove “I rest”, now with the term q p.'),
        hint: [T('标签是「左边」，分情况只会走左边那一支。', 'The tag says “the left one”, so the case split only takes the left branch.')],
        solution: proof({ m: ['mp'] }, ['q>m.imp', 'p>m.a', 'm>goal'], { premises: ['p', 'q', 'r'] }),
        naive: proof(orDetour, [...orDetourWires, 'e>goal'], { premises: ['p', 'q', 'r'] }),
      }),
    ],
    intro: [
      { t: T('同一句话可以有好几个证明项，有的绕了远路：先造出一样东西，马上又把它用掉。⟨p, q⟩.1 先拼又拆，算下来就是 p；一个框造出函数，马上又用在 p 上，算下来是框里的证明，把 h 都换成 p。前两段先接出两条弯路。', 'One sentence can have several terms, and some take the long way round: make something and use it up at once. ⟨p, q⟩.1 joins and splits, and works out to just p; a box makes a function used on p at once, and works out to the proof inside with every h replaced by p. The first two tasks wire two such detours.') },
      { t: T('拿掉弯路是一次计算：每一种弯路，证明核都有一条<b>计算规则</b>，把它换成算下来的样子。后两段证同样的两句，接出算下来的那一个。', 'Taking a detour out is a computation: for each kind of detour the kernel has a <b>computation rule</b> that puts what it works out to in its place. The last two tasks prove the same two sentences and wire what they work out to.') },
    ],
    after: T('(fun h => b) a 算成 b 里的 h 换成 a，这一步叫<wiki-ref to="beta"></wiki-ref>，就是调用一个函数；对刚贴上标签的值分情况，只会走标签那一支。把弯路一处处算掉，直到一处都不剩，得到<wiki-ref to="normal-form"></wiki-ref>：证的还是同一句，证明项却短得多，每个证明项都算得到这样一个。', '(fun h => b) a works out to b with h replaced by a: <wiki-ref to="beta"></wiki-ref>, calling a function; cases on a value just tagged only take the tagged branch. Computing the detours away one by one until none is left gives the <wiki-ref to="normal-form"></wiki-ref>: the same sentence proved by a far shorter term, and every proof term can be brought to one.'),
  },
  {
    id: 't-lemma',
    title: T('引理也是证明项', 'A lemma is a term too'),
    tasks: [
      prove({
        step: T('用串联', 'With Chain'),
        tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C', term: 'chain p q' }],
        cases: CHAIN,
        briefNote: T('证明项要是 chain p q。', 'Its proof term must be chain p q.'),
        hint: [T('一张串联就够。', 'One Chain is enough.')],
        solution: proof({ c: ['chain'] }, ['p>c.p0', 'q>c.p1', 'c>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        step: T('不用串联', 'Without Chain'),
        without: ['chain'],
        tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C', term: 'fun h => q (p h)' }],
        cases: CHAIN,
        brief: T('再证一次，不用串联，证明项要是 fun h => q (p h)。', 'Prove it again without Chain, with the term fun h => q (p h).'),
        hint: [T('当初证串联时接的是什么？', 'What did you wire when you proved Chain?')],
        solution: proof({ f: ['impI', { A: 'A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
      }),
    ],
    intro: [{ t: T('证过的引理在证明项里写成它的名字：用串联，证明项里就是 chain p q。名字背后，是证它的那个证明项。', 'A lemma you proved appears in a term by its name: use Chain, and the term says chain p q. Behind the name is the term that proved it.') }],
    after: T('chain 自己的证明项是 fun p q h => q (p h)：先做 p 再做 q，函数的<b>复合</b>。把它用在 p、q 上，再做两次<wiki-ref to="beta"></wiki-ref>，就是第二段直接接出的 fun h => q (p h)。引理只是给证明项起的名字，展开以后，整个证明是一个只用最初规则的证明项，谁都可以拿去独立复查。检查证明的核可以很小，证明本身可以交给别人重新检查。', 'Chain’s own term is fun p q h => q (p h): p, then q, function <b>composition</b>. Applied to p and q, with two steps of <wiki-ref to="beta"></wiki-ref>, it is the fun h => q (p h) wired directly in the second task. A lemma is only a name given to a term; unfolded, the whole proof is a term using only the first rules, which anyone can check again on their own. The kernel that checks proofs can be small, and a proof can be handed to someone else to check again.'),
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
        briefNote: T('证明项要是 p ann q。', 'Its proof term must be p ann q.'),
        hint: [T('p ann：把安交给 p，得到的是关于安的那句话。', 'p ann: hand Ann to p, and out comes the sentence about Ann.')],
        solution: proof({ e: ['allE', { t: 'ann' }], m: ['mp'] }, ['p>e.all', 'e>m.imp', 'q>m.a', 'm>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        step: T('任取是 fun', 'For any is fun'),
        tests: [{ goal: '∀x. P(x) → P(x)', term: 'fun a h => h' }],
        cases: PERSON,
        brief: T('不需要任何已知，证明出「∀x. x是人 → x是人」，证明项要是 fun a h => h。', 'From nothing given, prove “∀x. x is human → x is human”, with the term fun a h => h.'),
        hint: [T('fun a 是任取框（a 是任取的那一样），fun h 是假设框。', 'fun a is the for-any box (a the thing taken), fun h the assumption box.')],
        solution: proof({ g: ['allI', { x: 'a' }], h: ['impI', { A: 'P(a)' }, 'g'] }, ['h#body>h.body', 'h>g.body', 'g>goal']),
      }),
      prove({
        step: T('∃ 是一对', '∃ is a pair'),
        tests: [{ premises: { p: 'P(ann)' }, goal: '∃x. P(x)', term: '⟨ann, p⟩' }],
        cases: PERSON,
        brief: T('从已知 p：「安是人」证明出「∃x. x是人」，证明项要是 ⟨ann, p⟩。', 'From p: “Ann is human”, prove “∃x. x is human”, with the term ⟨ann, p⟩.'),
        hint: [T('一对的左边是例子，右边是例子满足它的证明。', 'The pair’s left is the example, its right the proof that the example fits.')],
        solution: proof({ i: ['exI'] }, ['p>i.a', 'i>goal'], { premises: ['p'] }),
      }),
      prove({
        step: T('拿出那一个', 'Taking it out'),
        tests: [{ premises: { p: '∃x. P(x) ∧ Q(x)' }, goal: '∃x. P(x)', term: 'p.elim (fun a h => h.elim (fun x y => ⟨a, x⟩))' }],
        cases: PERSON,
        brief: T('从已知 p：「∃x. x是人 ∧ x会死」证明出「∃x. x是人」，证明项要是 p.elim (fun a h => h.elim (fun x y => ⟨a, x⟩))。', 'From p: “∃x. x is human ∧ x is mortal”, prove “∃x. x is human”, with the term p.elim (fun a h => h.elim (fun x y => ⟨a, x⟩)).'),
        hint: [T('fun a h 是拿出那一个的框：a 是那样东西，h 是它满足的那句。', 'fun a h is the take-the-one box: a is the thing, h the sentence it fits.')],
        solution: proof({ f: ['exE', { x: 'a' }], s: ['andCases', {}, 'f'], i: ['exI', {}, 's'] }, ['p>f.ex', 'f#body>s.ab', 's#left>i.a', 's>f.body', 'f>goal', 'i>s.body'], { premises: ['p'] }),
      }),
    ],
    intro: [{ t: T('量词的证明也是证明项。「∀x. …」的证明是函数，只是参数不是证明，而是一样东西：给它 t，它还你关于 t 的那句话的证明，这叫<wiki-ref to="dep-function"></wiki-ref>，取一个写成 p ann。「∃x. …」的证明是一<b>对</b>：一样东西（见证），和它满足那句话的证明；用它写 p.elim (fun a h => …)。', 'Proofs with quantifiers are terms too. A proof of “∀x. …” is a function whose argument is not a proof but a thing: given t, it gives back a proof of the sentence about t, a <wiki-ref to="dep-function"></wiki-ref>, and Take one is p ann. A proof of “∃x. …” is a <b>pair</b>: a thing (the witness) and a proof that it fits; using one is p.elim (fun a h => …).') }],
    after: T('∀ 像 → 是函数，∃ 像 ∧ 是一对，只是这回的一半是东西。任取框是 fun x，假设框是 fun h，写起来一模一样：→ 只是不依赖参数的 ∀。拿出那一个的框里，a 逃不出框：外面不知道它是谁。', '∀ is a function like →, ∃ a pair like ∧, only now one half is a thing. The for-any box is fun x and the assumption box fun h, written exactly alike: → is just a ∀ that does not depend on its argument. In the take-the-one box, a may not escape: outside nobody knows which it is.'),
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
    intro: [{ t: T('把每个 ¬ 都换成「→ ⊥」，再读要证的句子。', 'Turn every ¬ into “→ ⊥”, then read the sentence to prove.') }],
    after: T('A → ¬¬A 是 fun a b => b a：拿着 a，等别人给一个「A 就矛盾」的 b，把 a 交给它。反过来的 ¬¬A → A 写不出证明项：没有程序能从「A 不会不成立」里变出 A 的证明。所以反证法没有对应的程序，要用它，只能当作一条公理另外加上。可三重否定能化成一重，第二题的证明项正是这样。', 'A → ¬¬A is fun a b => b a: holding a, wait for a b saying “A gives a contradiction”, and hand a to it. The other way, ¬¬A → A, has no term: no program can conjure a proof of A out of “A cannot fail”. So proof by contradiction has no program behind it: to use it, it must be added as an axiom of its own. Yet three negations do come down to one, which is what the second term does.'),
  },
]
