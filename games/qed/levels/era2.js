// Chapter 4 · Using the connectives: the prover, Apply and the box and the lemmas built before (Identity, Chain,
// Swap, Merge) with it, uses ∧, ∨, ⊥ and ¬, whose parts the declarations of chapter 3 made. Three lines that need
// nothing from each other (and, or, contradiction and not), each practised from a few angles, then combined; then an
// optional topic defining “and” and “or” with → alone instead of declaring them. Only what needs no proof by contradiction
// is here: excluded middle waits for the chapter where auto runs into it, De Morgan for the simplifier. Each level is
// a pattern plus test cases (see era1.js).
import { proof } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })

// 交换律: A ∧ B → B ∧ A, the swap inside one box.
const andSwap = proof({ f: ['impI', { A: 'A ∧ B' }], e: ['andE', {}, 'f'], i: ['andI', {}, 'f'] }, ['f#body>e.ab', 'e#right>i.a', 'e#left>i.b', 'i>f.body', 'f>goal'])
// 逆否: (A → B) → (¬B → ¬A), two boxes and a Chain (¬B is B → ⊥).
const contra = proof({ f: ['impI', { A: 'A → B' }], g: ['impI', { A: '¬B' }, 'f'], t: ['chain', {}, 'g'] }, ['f#body>t.p0', 'g#body>t.p1', 't>g.body', 'g>f.body', 'f>goal'])
const prove = (task) => ({ kind: 'proof', step: T('证明', 'Prove'), ...task })

export const era2 = [
  {
    id: 'and',
    title: T('两个都要', 'Both of them'),
    fold: ['axK', 'axS'],
    builds: 'andE',
    tasks: [
      {
        kind: 'proof',
        step: T('取左', 'The left side'),
        tests: [{ premises: { p: 'A ∧ B' }, goal: 'A' }],
        cases: [{ A: 'Rain', B: 'Wind' }, { A: 'Hungry', B: 'Late' }],
        hint: [T('消去 ∧ 的框里，两边都是假设；只把左边交回去。', 'Inside ∧ elim’s box both sides are assumed; hand back the left one alone.')],
        solution: proof({ c: ['andCases'] }, ['p>c.ab', 'c#left>c.body', 'c>goal'], { premises: ['p'] }),
        after: T('框里假设了两边，只把左边交回去，就从「下雨 ∧ 刮风」得到「下雨」。', 'Both sides assumed in the box, the left one alone handed back: from “it rains ∧ it is windy”, “it rains”.'),
      },
      {
        kind: 'proof',
        step: T('取右', 'The right side'),
        tests: [{ premises: { p: 'A ∧ B' }, goal: 'B' }],
        cases: [{ A: 'Rain', B: 'Wind' }, { A: 'Hungry', B: 'Late' }],
        hint: [T('和取左一样，交回去的换成右边。', 'As for the left side, with the right one handed back.')],
        solution: proof({ c: ['andCases'] }, ['p>c.ab', 'c#right>c.body', 'c>goal'], { premises: ['p'] }),
      },
      {
        kind: 'proof',
        step: T('两个都要', 'Both of them'),
        intro: [{ t: T('取左、取右合成了一块元件<part-ref to="lemma:andE"></part-ref>：接进 A ∧ B，两个输出口各取一边，不用每次都开框。', 'The left and the right side make one part, <part-ref to="lemma:andE"></part-ref>: wire in A ∧ B, and its two outputs give a side each, with no box to open every time.') }],
        tests: [{ premises: { p: 'A ∧ B' }, goal: 'B ∧ A' }],
        cases: [{ A: 'Rain', B: 'Wind' }, { A: 'Hungry', B: 'Late' }],
        hint: [T('先拆开，再按新的顺序拼起来。', 'Take it apart, then put it back together in the new order.')],
        solution: proof({ e: ['andE'], i: ['andI'] }, ['p>e.ab', 'e#right>i.a', 'e#left>i.b', 'i>goal'], { premises: ['p'] }),
        after: T('先拆后拼，换了个顺序。每个<wiki-ref to="connective"></wiki-ref>都有造它的规则和用它的规则，用的规则由造的规则定：这样的规则体系叫<wiki-ref to="natural"></wiki-ref>。', 'Split, then join in the other order. Every <wiki-ref to="connective"></wiki-ref> has rules that make it and rules that use it, the using fixed by the making: a system like that is called <wiki-ref to="natural"></wiki-ref>.'),
      },
      {
        kind: 'proof',
        step: T('搬进框里', 'Into a box'),
        tests: [{ goal: 'A ∧ B → B ∧ A' }],
        cases: [{ A: 'Rain', B: 'Wind' }, { A: 'Hungry', B: 'Late' }],
        hint: [T('刚才的证明，可以整个搬进一个框里：框的假设选「下雨 ∧ 刮风」。', 'The proof you just made can move into a box whole: assume “it rains ∧ it is windy”.')],
        intro: [
          { t: T('刚才证的是：已知「下雨 ∧ 刮风」，就有「刮风 ∧ 下雨」。', 'You have just shown that from “it rains ∧ it is windy” you get “it is windy ∧ it rains”.') },
          { t: T('这一次连已知都没有，要证的「下雨 ∧ 刮风 → 刮风 ∧ 下雨」是一句永远成立的话。目标是一句「若…则…」，那就开一个框。', 'This time nothing is given: “it rains ∧ it is windy → it is windy ∧ it rains” is a sentence that always holds. The goal is an “if … then …”, so open a box.') },
        ],
        solution: andSwap,
      },
    ],
    intro: [
      { t: T('<level-ref to="g-and"></level-ref>里的<part-ref to="part:gAnd"></part-ref>门：两边都真，才输出真。证明器里的「下雨 ∧ 刮风」也是这个意思：下雨，并且刮风。', 'The <part-ref to="part:gAnd"></part-ref> gate of <level-ref to="g-and"></level-ref>: true only when both sides are. In the prover “it rains ∧ it is windy” means the same: it rains, and it is windy.') },
      { t: T('上一章你声明了「并且」，证明板上从此多了两块元件。<part-ref to="part:andI"></part-ref>就是那一条引入规则：有了左边，又有了右边，就有「左边 ∧ 右边」。<part-ref to="part:andCases"></part-ref>是由那条引入规则生成的消去规则，在证明板上写成一个框：同时假设左右两边，框里证出什么，它就给出什么。', 'Last chapter you declared “and”, and the proof board gained two parts. <part-ref to="part:andI"></part-ref> is its one way to make it: from a left and a right, “left ∧ right”. <part-ref to="part:andCases"></part-ref> is the elimination rule made from that way in, a box on the proof board: it assumes both sides at once, and whatever is proved inside, it gives.') },
      { t: T('很多时候只想要其中一边。先用它证出两条规则：由 A ∧ B 得 A，由 A ∧ B 得 B。', 'Often you want just one side. First prove two rules with it: from A ∧ B, A; from A ∧ B, B.') },
    ],
    after: T('有已知的证明，放进框里，就成了什么都不需要的<wiki-ref to="theorem"></wiki-ref>：真值表上的永真式，在这里是证出来的。', 'A proof from givens, put in a box, becomes a <wiki-ref to="theorem"></wiki-ref> that needs nothing: a tautology from the truth tables, now proved.'),
  },
  {
    id: 'curry',
    title: T('两个条件，一个条件', 'Two conditions, one condition'),
    tasks: [
      {
        kind: 'proof',
        step: T('拆成两个条件', 'Two conditions from one'),
        tests: [{ premises: { p: 'A ∧ B → C' }, goal: 'A → (B → C)' }],
        cases: [{ A: 'Rain', B: 'Wind', C: 'Wet' }, { A: 'Exam', B: 'Study', C: 'Pass' }],
        hint: [T('两个框依次假设「下雨」和「刮风」；在里面把两句假设拼成一句 ∧，交给已知。', 'Two boxes assume “it rains” and “it is windy” in turn; inside, join the two assumptions into one ∧ and hand it to the given.')],
        solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: 'B' }, 'f'], c: ['andI', {}, 'g'], m: ['mp', {}, 'g'] }, ['f#body>c.a', 'g#body>c.b', 'p>m.imp', 'c>m.a', 'm>g.body', 'g>f.body', 'f>goal'], { premises: ['p'] }),
        after: T('框给出条件，引入 ∧ 把两个条件交到一起。', 'The boxes supply the conditions, and ∧ intro hands them over together.'),
      },
      {
        kind: 'proof',
        step: T('合成一个条件', 'One condition from two'),
        tests: [{ premises: { p: 'A → (B → C)' }, goal: 'A ∧ B → C' }],
        cases: [{ A: 'Sat', B: 'Rain', C: 'Rest' }, { A: 'Alarm', B: 'Coffee', C: 'Awake' }],
        hint: [T('一个框就够：假设「今天是周六 ∧ 下雨」，拆开以后套用两次。', 'One box will do: assume “today is Saturday ∧ it rains”, split it, then Apply twice.')],
        intro: [{ t: T('反过来：两个条件合成一个「并且」。这次只要一个框。', 'The other way: two conditions become one “and”. This time one box is enough.') }],
        solution: proof({ f: ['impI', { A: 'A ∧ B' }], e: ['andE', {}, 'f'], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['f#body>e.ab', 'p>m1.imp', 'e#left>m1.a', 'm1>m2.imp', 'e#right>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p'] }),
      },
    ],
    intro: [{ t: T('「下雨并且刮风，就地湿」和「下雨的话，只要再刮风，就地湿」是一回事。从前者推出后者。', '“If it rains and it is windy, the ground is wet” and “if it rains, then if it is also windy, the ground is wet” say the same. Get the second from the first.') }],
    after: T('先拼，后拆。两种写法能互相推出，以后哪种顺手用哪种。', 'First joined, then split. Each form gives the other, so use whichever is handier.'),
  },
  {
    id: 'iffUse',
    title: T('两个方向', 'Both directions'),
    tasks: [
      prove({
        step: T('一个方向', 'One direction'),
        tests: [{ premises: { p: 'A ↔ B', q: 'A' }, goal: 'B' }],
        cases: [{ A: 'Sat', B: 'Rest' }, { A: 'Coffee', B: 'Awake' }],
        hint: [T('<part-ref to="lemma:andE"></part-ref>也能拆 ↔：拆出两个方向的「若…则…」，用对的那一个。', '<part-ref to="lemma:andE"></part-ref> splits ↔ too: into the two “if … then …”s; use the right one.')],
        solution: proof({ e: ['andE'], m: ['mp'] }, ['p>e.ab', 'e#left>m.imp', 'q>m.a', 'm>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        step: T('另一个方向', 'The other direction'),
        tests: [{ premises: { p: 'A ↔ B', q: '¬A' }, goal: '¬B' }],
        cases: [{ A: 'Sat', B: 'Rest' }, { A: 'Coffee', B: 'Awake' }],
        brief: T('再从「今天是周六 ↔ 我休息」和「¬今天是周六」，证明出「¬我休息」。', 'Now from “today is Saturday ↔ I rest” and “¬today is Saturday”, prove “¬I rest”.'),
        hint: [T('这回要用另一个方向：假设「我休息」，看能不能撞出矛盾。', 'This time it takes the other direction: assume “I rest” and see whether it runs into a contradiction.')],
        solution: proof({ e: ['andE'], f: ['impI', { A: 'B' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>e.ab', 'e#right>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
      }),
    ],
    intro: [{ t: T('真值电路里，<level-ref to="g-iff"></level-ref>的等价 ↔ 是同真同假。证明核里，A ↔ B 就是两个方向的 → 都成立：「(A → B) ∧ (B → A)」，所以它当成一句 ∧ 来拆。', 'In the truth circuits, the equivalence ↔ of <level-ref to="g-iff"></level-ref> meant true together and false together. In the kernel, A ↔ B is the → holding both ways, “(A → B) ∧ (B → A)”, so it is taken apart as an ∧.') }],
    after: T('等价能拆成两个方向，用哪个方向看手里有什么、要证什么。<part-ref to="lemma:andE"></part-ref>的说明里，从此多了这一句。', 'An equivalence splits into its two directions, and which one to use depends on what you hold and what you must prove. <part-ref to="lemma:andE"></part-ref>’s description now says so too.'),
  },
  {
    id: 'or',
    kind: 'proof',
    // K and S, built at the end of the last chapter, are not this level's business.
    fold: ['axK', 'axS'],
    title: T('二选一', 'One of two'),
    tests: [{ premises: { p: 'A' }, goal: 'B ∨ (A ∨ B)' }],
    cases: [{ A: 'Sat', B: 'Sun' }, { A: 'Bus', B: 'Bike' }],
    hint: [T('从里往外：先引入「今天是周六 ∨ 今天是周日」（另一边放右边），再把它放到一句 ∨ 的右边。', 'From the inside out: first bring in “today is Saturday ∨ today is Sunday” (the other side on the right), then put that on the right of another ∨.')],
    intro: [
      { t: T('「今天是周末」的意思是：今天是周六，<b>或者</b>今天是周日。至少一个成立就行，两个都成立也算：这就是<level-ref to="g-or"></level-ref>里的<part-ref to="lemma:gOr"></part-ref>门。', '“It is the weekend” means: today is Saturday, <b>or</b> today is Sunday. At least one is enough, and both count too: just the <part-ref to="lemma:gOr"></part-ref> gate of <level-ref to="g-or"></level-ref>.') },
      { t: T('上一章你声明了「或者」，随之而来的是<part-ref to="part:orI"></part-ref>：有了一句话，「它 ∨ 随便哪句」就成立。元件上选它放左边还是右边，就是选两条引入规则里的哪一种；再选另一边是哪句话。', 'Last chapter you declared “or”, and with it came <part-ref to="part:orI"></part-ref>: from a sentence, “it ∨ any other” holds. Choosing on the part whether it goes left or right chooses one of the two ways; then choose the other side.') },
    ],
    solution: proof({ i: ['orI', { other: 'B', side: 'right' }], j: ['orI', { other: 'B', side: 'left' }] }, ['p>i.a', 'i>j.a', 'j>goal'], { premises: ['p'] }),
    after: T("由「今天是周六」可以推出「今天是周日 ∨ 今天是周六」。反过来，单凭析取命题通常不能分别推出任一析取项。", "From “today is Saturday” we can infer “today is Sunday ∨ today is Saturday”. Conversely, a disjunction alone does not generally establish either disjunct separately."),
  },
  {
    id: 'cases',
    kind: 'proof',
    title: T('分情况', 'Case by case'),
    tests: [{ premises: { p: 'A ∨ B', q: 'A → C', r: 'B → C' }, goal: 'C' }],
    cases: [{ A: 'Bus', B: 'Bike', C: 'OnTime' }, { A: 'Sat', B: 'Sun', C: 'Rest' }],
    hint: [
      T('放一块消去 ∨，把已知「我坐公交 ∨ 我骑车」接进元件上标着「A ∨ B」的输入口。元件下半部分有两个框：情况一的「假设」是「我坐公交」，情况二的是「我骑车」。', 'Place an ∨ elim and wire the given “I take the bus ∨ I cycle” into the input marked “A ∨ B” on its part. The lower half of the part holds two boxes: case one’s “Assume” is “I take the bus”, case two’s “I cycle”.'),
      T('情况一的框里放一块套用：「我坐公交 → 我准时到」接「A → B」口，框左上角的「假设」接「A」口，结果接到这个框右上角的「结论」。情况二照样做。', 'In case one’s box put an Apply: “I take the bus → I arrive on time” into its “A → B” input, the box’s “Assume” at its top left into its “A” input, and the result into “Conclusion” at the box’s top right. Do the same in case two.'),
      T('两个框都证出「我准时到」以后，消去 ∨ 元件右上角的输出就是「我准时到」，接到目标。', 'Once both boxes prove “I arrive on time”, the output at the ∨ elim part’s top right gives “I arrive on time”: wire it to the goal.'),
    ],
    intro: [
      { t: T('要么我坐公交，要么我骑车，可还不知道是哪一个。坐公交的话，我准时到；骑车的话，我也准时到。所以不管是哪一个，我准时到。', 'Either I take the bus or I cycle, and you do not know which. If I take the bus, I arrive on time; if I cycle, I arrive on time too. So whichever it is, I arrive on time.') },
      { t: T('光有「我坐公交 ∨ 我骑车」，不能直接拆出「我坐公交」：说不定是骑车。办法是<b>每一种情况都试一遍</b>：先假设是左边那种，证出结论；再假设是右边那种，也证出同一个结论。两种都通，结论就成立。', 'From “I take the bus ∨ I cycle” alone you cannot take out “I take the bus”: perhaps I cycled. The way out is to <b>try every case</b>: assume the left one and prove the conclusion; assume the right one and prove the same conclusion. If both work, the conclusion holds.') },
      { t: T('「或者」生成的消去规则就是这样：一条引入规则一种情况。<part-ref to="part:orE"></part-ref>像一个假设框，只是<b>有两个框</b>：情况一假设左边，情况二假设右边；两个框证出<b>同一句话</b>，它就给出这句话。', 'The elimination rule made for “or” is just this: one case for each way to make it. <part-ref to="part:orE"></part-ref> is like an assumption box, but with <b>two boxes</b>: case one assumes the left, case two the right; when both prove the <b>same sentence</b>, it gives that sentence.') },
    ],
    solution: proof({ e: ['orE'], m: ['mp', {}, 'e/left'], m2: ['mp', {}, 'e/right'] }, ['p>e.ab', 'q>m.imp', 'e#left>m.a', 'm>e.left', 'r>m2.imp', 'e#right>m2.a', 'm2>e.right', 'e>goal'], { premises: ['p', 'q', 'r'] }),
    after: T("从析取前提出发，分别在两个分支中证明同一结论，再解除分支假设。这是析取消去，也称分类讨论。", "From a disjunction, prove the same conclusion in both branches and discharge the branch assumptions. This is disjunction elimination, also called reasoning by cases."),
  },
  {
    id: 'orSwap',
    title: T('或者，换个顺序', 'Or, the other way round'),
    tasks: [
      {
        kind: 'proof',
        step: T('或者，换个顺序', 'Or, the other way round'),
        tests: [{ premises: { p: 'A ∨ B' }, goal: 'B ∨ A' }],
        cases: [{ A: 'Bus', B: 'Bike' }, { A: 'Coffee', B: 'Tea' }],
        hint: [T('不知道是哪一边，就分情况。每种情况里，用引入 ∨ 换到对的位置。', 'Not knowing which side, split into cases. In each, ∨ intro puts it in the right place.')],
        solution: proof({ e: ['orE'], l: ['orI', { other: 'B', side: 'left' }, 'e/left'], r: ['orI', { other: 'A', side: 'right' }, 'e/right'] }, ['p>e.ab', 'e#left>l.a', 'l>e.left', 'e#right>r.a', 'r>e.right', 'e>goal'], { premises: ['p'] }),
        after: T("析取消去用于分类讨论，析取引入用于构造目标；本任务同时使用了两者。", "Disjunction elimination reasons by cases, while disjunction introduction constructs the goal; this task uses both."),
      },
      {
        kind: 'proof',
        step: T('不管哪一种', 'Whichever it is'),
        tests: [{ premises: { p: 'A → C', q: 'B → C' }, goal: 'A ∨ B → C' }],
        cases: [{ A: 'Bus', B: 'Bike', C: 'OnTime' }, { A: 'Sat', B: 'Sun', C: 'Rest' }],
        hint: [T('目标是「若…则…」，先开一个假设框；框里有了一句 ∨，再分情况。', 'The goal is an “if … then …”: open an assumption box first; with an ∨ inside it, split into cases.')],
        intro: [{ t: T('在<level-ref to="cases"></level-ref>里，「我坐公交 ∨ 我骑车」是已知。这回它成了要假设的条件：两种框套在一起。', 'In <level-ref to="cases"></level-ref>, “I take the bus ∨ I cycle” was given. Now it is a condition to assume: one kind of box inside the other.') }],
        solution: proof({ f: ['impI', { A: 'A ∨ B' }], e: ['orE', {}, 'f'], m1: ['mp', {}, 'e/left'], m2: ['mp', {}, 'e/right'] }, ['f#body>e.ab', 'p>m1.imp', 'e#left>m1.a', 'm1>e.left', 'q>m2.imp', 'e#right>m2.a', 'm2>e.right', 'e>f.body', 'f>goal'], { premises: ['p', 'q'] }),
      },
    ],
    intro: [{ t: T('一句 ∨ 拆不开：不知道是哪一边成立，就得分情况。', 'An ∨ will not split: not knowing which side holds, it takes cases.') }],
    after: T('假设框里套着消去 ∨：外面的框给出条件，里面的框分开讨论。', '∨ elim inside an assumption box: the outer box supplies the condition, the inner ones split it.'),
  },
  {
    id: 'dist',
    kind: 'proof',
    title: T('分配', 'Distribute'),
    tests: [{ premises: { p: 'A ∧ (B ∨ C)' }, goal: '(A ∧ B) ∨ (A ∧ C)' }],
    cases: [{ A: 'Sat', B: 'Rain', C: 'Wind' }, { A: 'Exam', B: 'Coffee', C: 'Tea' }],
    hint: [
      T('先消去 ∧，再对拆出来的「下雨 ∨ 刮风」分情况。', 'Split the ∧ first, then take cases on the “it rains ∨ it is windy” it gives.'),
      T('每种情况里，把「今天是周六」和这一情况的假设拼起来，再放进 ∨ 的对应一边。', 'In each case, join “today is Saturday” with that case’s assumption, then put it on the matching side of the ∨.'),
    ],
    intro: [{ t: T('两种连接词的四块元件一起上：消去 ∧、消去 ∨、引入 ∧、引入 ∨。', 'Two connectives, all four of their parts at once: ∧ elim, ∨ elim, ∧ intro, ∨ intro.') }],
    solution: proof({ s: ['andE'], e: ['orE'], l1: ['andI', {}, 'e/left'], o1: ['orI', { other: 'A ∧ C', side: 'right' }, 'e/left'], l2: ['andI', {}, 'e/right'], o2: ['orI', { other: 'A ∧ B', side: 'left' }, 'e/right'] }, ['p>s.ab', 's#right>e.ab', 's#left>l1.a', 'e#left>l1.b', 'l1>o1.a', 'o1>e.left', 's#left>l2.a', 'e#right>l2.b', 'l2>o2.a', 'o2>e.right', 'e>goal'], { premises: ['p'] }),
    after: T('消去 ∧ 给出的「今天是周六」在两种情况里都用上了：框外证出的东西，框里随便用。', 'The “today is Saturday” from ∧ elim served in both cases: what is proved outside a box is free to use inside.'),
  },
  {
    id: 'bot',
    title: T('矛盾', 'Contradiction'),
    fold: ['axK', 'axS'],
    symbols: ['⊥'],
    tasks: [
      {
        kind: 'proof',
        step: T('矛盾', 'Contradiction'),
        tests: [{ premises: { p: 'A', q: '¬A' }, goal: 'B' }],
        cases: [{ A: 'Locked', B: 'Moon' }, { A: 'Rain', B: 'Pigs' }],
        hint: [
          T('「¬门锁着」就是「门锁着 → ⊥」：把它接进套用的「A → B」口，「门锁着」接进「A」口，得到 ⊥。', '“¬the door is locked” is “the door is locked → ⊥”: wire it into Apply’s “A → B” input and “the door is locked” into its “A” input, and you get ⊥.'),
          T('得到 ⊥ 以后，用<part-ref to="part:botE"></part-ref>，元件上选「月亮是奶酪做的」。', 'Once you have ⊥, use <part-ref to="part:botE"></part-ref> and choose “the moon is made of cheese” on its part.'),
        ],
        solution: proof({ m: ['mp'], b: ['botE', { C: 'B' }] }, ['q>m.imp', 'p>m.a', 'm>b.bot', 'b>goal'], { premises: ['p', 'q'] }),
        after: T('证词自相矛盾，就什么都能「证」出来，连「月亮是奶酪做的」也行。一组已知一旦矛盾就毫无用处：这是逻辑拼命要避开矛盾的原因。', 'Contradictory testimony “proves” anything, even “the moon is made of cheese”. A set of givens that contradicts itself is useless: that is why logic works so hard to avoid contradiction.'),
      },
      {
        kind: 'proof',
        step: T('假前提推出一切', 'A false premise gives anything'),
        tests: [{ premises: { p: '¬A' }, goal: 'A → B' }],
        cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Locked', B: 'Moon' }],
        hint: [T('目标是「若…则…」：假设「下雨」。框里它和已知撞出 ⊥。', 'The goal is an “if … then …”: assume “it rains”. Inside the box it clashes with the given and gives ⊥.')],
        intro: [{ t: T("在经典真值表中，条件命题的前件为假时，整个命题为真。本任务用证明规则推导这一具体形式。", "In a classical truth table, a conditional is true whenever its antecedent is false. This task derives a specific instance using proof rules.") }],
        solution: proof({ f: ['impI', { A: 'A' }], m: ['mp', {}, 'f'], b: ['botE', { C: 'B' }, 'f'] }, ['p>m.imp', 'f#body>m.a', 'm>b.bot', 'b>f.body', 'f>goal'], { premises: ['p'] }),
      },
    ],
    intro: [
      { t: T('一个证人先说「门锁着」，又说「门没锁」。两句不可能都对。', 'A witness says “the door is locked”, then “the door is not locked”. Both cannot be true.') },
      { t: T('<level-ref to="g-always"></level-ref>里见过<wiki-ref to="contradiction"></wiki-ref>：每一行都假的话，写作 <b>⊥</b>。上一章声明 ⊥ 时说过：<br><b>¬门锁着　就是　门锁着 → ⊥</b><br>所以「¬门锁着」能直接接进要「若…则…」的口。', 'You met the <wiki-ref to="contradiction"></wiki-ref> in <level-ref to="g-always"></level-ref>: a sentence false on every row, written <b>⊥</b>. Declaring ⊥ last chapter said:<br><b>¬the door is locked　is　the door is locked → ⊥</b><br>so “¬the door is locked” goes straight into an input that wants an “if … then …”.') },
      { t: T('⊥ 一条引入规则都没有，它的消去规则<part-ref to="part:botE"></part-ref>也就一种情况都不用证：有了 ⊥，元件上选什么，就证出什么。这是<wiki-ref to="explosion"></wiki-ref>。', '⊥ has no way to make it, so its case, <part-ref to="part:botE"></part-ref>, has no case to prove: from ⊥, prove whatever is chosen on the part. This is <wiki-ref to="explosion"></wiki-ref>.') },
    ],
    after: T("假设「下雨」与已知「¬下雨」产生矛盾，由矛盾消去得到「地湿」。解除临时假设后，得到条件命题。", "Assuming “it rains” contradicts the given “¬it rains”; contradiction elimination yields “the ground is wet”. Discharging the temporary assumption gives the conditional."),
  },
  {
    id: 'notI',
    title: T('推出矛盾，就不成立', 'A contradiction, so not'),
    tasks: [
      {
        kind: 'proof',
        step: T('推出矛盾，就不成立', 'A contradiction means no'),
        tests: [{ premises: { p: 'A → B', q: 'A → ¬B' }, goal: '¬A' }],
        cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Exam', B: 'Study' }],
        hint: [T('「¬下雨」就是「下雨 → ⊥」：假设「下雨」，在框里推出 ⊥。', '“¬it rains” is “it rains → ⊥”: assume “it rains” and reach ⊥ inside the box.')],
        solution: proof({ f: ['impI', { A: 'A' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'], m3: ['mp', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'f#body>m2.a', 'm2>m3.imp', 'm1>m3.a', 'm3>f.body', 'f>goal'], { premises: ['p', 'q'] }),
        after: T('「假设它，推出矛盾，所以它不成立」：这是证明里最常用的招数之一。', '“Assume it, reach a contradiction, so it fails”: one of the most used moves in proofs.'),
      },
      {
        kind: 'proof',
        step: T('不可能不', 'It cannot be not'),
        tests: [{ premises: { p: 'A' }, goal: '¬¬A' }],
        cases: [{ A: 'Rain' }, { A: 'Locked' }],
        hint: [T('「¬¬下雨」是「¬下雨 → ⊥」。假设「¬下雨」，它和已知撞出矛盾。', '“¬¬it rains” is “¬it rains → ⊥”. Assume “¬it rains”; it clashes with the given.')],
        intro: [{ t: T('在下雨，那「没下雨」就不可能成立。', 'It is raining, so “it is not raining” cannot hold.') }],
        solution: proof({ f: ['impI', { A: '¬A' }], m: ['mp', {}, 'f'] }, ['f#body>m.imp', 'p>m.a', 'm>f.body', 'f>goal'], { premises: ['p'] }),
      },
    ],
    intro: [{ t: T('下雨就地湿，下雨又就不地湿，那就不可能在下雨。¬下雨 就是 下雨 → ⊥：要证它，开一个框假设「下雨」，推出矛盾。', 'If rain means wet and also means not wet, it cannot be raining. ¬it rains is it rains → ⊥: to prove it, open a box assuming “it rains” and reach a contradiction.') }],
    after: T('注意方向：由「下雨」得到「¬¬下雨」很容易；反过来，由「¬¬下雨」得到「下雨」，这些规则做不到。', 'Mind the direction: from “it rains” to “¬¬it rains” is easy; the other way, from “¬¬it rains” to “it rains”, these rules cannot go.'),
  },
  {
    id: 'mt',
    title: T('没有结果，就没有起因', 'No effect, no cause'),
    tasks: [
      {
        kind: 'proof',
        step: T('没有结果，就没有起因', 'No effect, no cause'),
        tests: [{ premises: { p: 'A → B', q: 'B → C', r: '¬C' }, goal: '¬A' }],
        cases: [{ A: 'Rain', B: 'Wet', C: 'Slip' }, { A: 'Alarm', B: 'Up', C: 'OnTime' }],
        hint: [T('「¬路滑」就是「路滑 → ⊥」，「¬下雨」就是「下雨 → ⊥」。三段首尾相接。', '“¬the road is slippery” is “slippery → ⊥”, and “¬it rains” is “it rains → ⊥”. Three pieces meet end to end.')],
        solution: proof({ c1: ['chain'], c2: ['chain'] }, ['p>c1.p0', 'q>c1.p1', 'c1>c2.p0', 'r>c2.p1', 'c2>goal'], { premises: ['p', 'q', 'r'] }),
        after: T('「¬」就是「→ ⊥」，所以「没有结果，就没有起因」（否定后件）根本不用新元件：把「⊥」当成链条的最后一环，串联就够了。', '“¬” is “→ ⊥”, so “no effect, no cause” (modus tollens) needs no new part: with “⊥” as the last link, Chain does it.'),
      },
      {
        kind: 'proof',
        step: T('逆否', 'Contrapositive'),
        tests: [{ goal: '(A → B) → (¬B → ¬A)' }],
        cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Exam', B: 'Study' }],
        hint: [
          T('两个 →，两个框，一个套一个。', 'Two →s, two boxes, one inside the other.'),
          T('里面的框看得见「下雨 → 地湿」和「¬地湿」，也就是「地湿 → ⊥」。', 'The inner box sees “it rains → the ground is wet” and “¬the ground is wet”, that is “wet → ⊥”.'),
        ],
        intro: [
          { t: T('「下雨，就地湿」，那么「没有地湿，就没有下雨」。这叫<wiki-ref to="contrapositive"></wiki-ref>，和<level-ref to="onerow"></level-ref>里那个错误推理不一样，它永远成立：「(下雨 → 地湿) → (¬地湿 → ¬下雨)」。', '“it rains gives the ground is wet”, so “no the ground is wet, no it rains”. This is the <wiki-ref to="contrapositive"></wiki-ref>, and unlike the bad reasoning in <level-ref to="onerow"></level-ref> it always holds: “(it rains → the ground is wet) → (¬the ground is wet → ¬it rains)”.') },
          { t: T('刚才靠的是已知。这回什么都没给：把要用的两句变成两个框的假设。', 'Just now the givens did it. Here nothing is given: turn the two sentences you need into the assumptions of two boxes.') },
        ],
        solution: contra,
        after: T('框里的串联证出了一句不需要任何已知的定理。逆否和原句永远同真同假：证明「若 P 则 Q」，也可以改证「若非 Q 则非 P」。', 'The Chain inside proves a theorem that needs nothing given. A sentence and its contrapositive always agree: to prove “if P then Q”, you may prove “if not Q then not P” instead.'),
      },
      {
        kind: 'truth',
        step: T('否定前件', 'Denying the antecedent'),
        ask: 'counter',
        formulas: ['(Rain → Wet) → (¬Rain → ¬Wet)'],
        brief: T('找出让「(下雨 → 地湿) → (¬下雨 → ¬地湿)」为假的一行。', 'Find a row that makes “(it rains → the ground is wet) → (¬it rains → ¬the ground is wet)” false.'),
        hint: [T('没下雨，地却湿了，可能吗？', 'Could it not rain, and the ground still be wet?')],
        intro: [{ t: T('「下雨就地湿，所以没下雨就不湿。」和逆否一样把两边都否定了，只是没换位置：证得出吗？动手证之前，先找反例。', '“Rain makes it wet, so no rain means dry.” Like the contrapositive it negates both sides, only without swapping them: can it be proved? Before proving, look for a counterexample.') }],
      },
    ],
    intro: [{ t: T('下雨就地湿，地湿就路滑，可路不滑，所以没下雨。想想「¬」在证明核眼里是什么。', 'Rain wets the ground, a wet ground is slippery, the road is not, so it did not rain. Think about what “¬” is to the kernel.') }],
    after: T('没下雨，地却湿了：「下雨 → 地湿」没错，「没下雨就不湿」错了。逆否把两边都否定、还换了位置；只否定不换位，就推不出来。', 'No rain, wet ground: “it rains → the ground is wet” holds, “no rain means dry” fails. The contrapositive negates both sides and swaps them; negating without swapping proves nothing.'),
  },
  {
    id: 'dsyll',
    kind: 'proof',
    title: T('排除一个，剩下那个', 'Rule one out, the other remains'),
    tests: [{ premises: { p: 'A ∨ B', q: '¬A' }, goal: 'B' }],
    cases: [{ A: 'Bus', B: 'Bike' }, { A: 'Coffee', B: 'Tea' }],
    hint: [T('分情况。「我坐公交」那一边撞上「¬我坐公交」，得到 ⊥；矛盾推出一切。', 'Take cases. On the “I take the bus” side it runs into “¬I take the bus” and gives ⊥; from a contradiction, anything.')],
    intro: [{ t: T('要么坐公交，要么骑车；没坐公交，那就是骑车。分情况要两边都证出「我骑车」：一边现成，另一边根本不可能发生。', 'Bus or bike; not the bus, so the bike. Cases need “I cycle” on both sides: one side has it already, and the other cannot happen at all.') }],
    solution: proof({ e: ['orE'], m: ['mp', {}, 'e/left'], b: ['botE', { C: 'B' }, 'e/left'] }, ['p>e.ab', 'q>m.imp', 'e#left>m.a', 'm>b.bot', 'b>e.left', 'e#right>e.right', 'e>goal'], { premises: ['p', 'q'] }),
    after: T('不可能的那一边，交给矛盾推出一切：它不会发生，所以要它证出什么都行。这叫<wiki-ref to="dsyll"></wiki-ref>，「排除法」做题靠的就是它。', 'The impossible side goes to “from contradiction, anything”: it never happens, so it may prove whatever is needed. This is the <wiki-ref to="dsyll"></wiki-ref>, the logic behind every “process of elimination”.'),
  },
]
