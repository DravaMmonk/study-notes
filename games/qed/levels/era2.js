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
    tasks: [
      {
        kind: 'proof',
        step: T('两个都要', 'Both of them'),
        tests: [{ premises: { p: 'A ∧ B' }, goal: 'B ∧ A' }],
        cases: [{ A: 'Rain', B: 'Wind' }, { A: 'Hungry', B: 'Late' }],
        hint: [T('先拆开，再按新的顺序拼起来。', 'Take it apart, then put it back together in the new order.')],
        solution: proof({ e: ['andE'], i: ['andI'] }, ['p>e.ab', 'e#right>i.a', 'e#left>i.b', 'i>goal'], { premises: ['p'] }),
      },
      {
        kind: 'proof',
        step: T('搬进框里', 'Into a box'),
        tests: [{ goal: 'A ∧ B → B ∧ A' }],
        cases: [{ A: 'Rain', B: 'Wind' }, { A: 'Hungry', B: 'Late' }],
        hint: [T('刚才的证明可以整个搬进一个框里：框的假设选「下雨 ∧ 刮风」。', 'The proof you just made can move into a box whole: assume “it rains ∧ it is windy”.')],
        intro: [
          { t: T('这一次没有已知：「下雨 ∧ 刮风 → 刮风 ∧ 下雨」是一句永远成立的话。', 'This time nothing is given: “it rains ∧ it is windy → it is windy ∧ it rains” always holds.') },
        ],
        solution: andSwap,
      },
    ],
    intro: [
      { t: T('证明器里的「下雨 ∧ 刮风」和<level-ref to="g-and"></level-ref>里的<part-ref to="part:gAnd"></part-ref>门同义：下雨，并且刮风。', 'In the prover, “it rains ∧ it is windy” means what the <part-ref to="part:gAnd"></part-ref> gate of <level-ref to="g-and"></level-ref> does: it rains, and it is windy.') },
      { t: T('<level-ref to="decl-and"></level-ref>声明了「并且」，证明板上随之多了两块元件：<part-ref to="part:andI"></part-ref>是它唯一的引入规则；<part-ref to="part:andE"></part-ref>是由它生成的消去规则，两个输出口分别给出左边和右边。每个连接词都有一组引入规则和一组消去规则，这样组织的规则体系叫<wiki-ref to="natural"></wiki-ref>。', '<level-ref to="decl-and"></level-ref> declared “and”, and the proof board gained two parts: <part-ref to="part:andI"></part-ref>, its one introduction rule, and <part-ref to="part:andE"></part-ref>, the elimination rule made from it, whose two outputs give the left and the right. Every connective has its introduction and elimination rules; a system of rules organised this way is called <wiki-ref to="natural"></wiki-ref>.') },
    ],
    after: T('不依赖任何已知证出的话叫<wiki-ref to="theorem"></wiki-ref>：真值表上的永真式，在这里是证出来的。', 'A sentence proved from no givens is a <wiki-ref to="theorem"></wiki-ref>: a tautology of the truth tables, here proved.'),
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
        hint: [
          T('目标里有两层「若…则…」。', 'The goal has two “if … then …”s, one inside the other.'),
          T('两个框依次假设「下雨」和「刮风」；在里面把两句假设拼成一句 ∧，交给已知。', 'Two boxes assume “it rains” and “it is windy” in turn; inside, join the two assumptions into one ∧ and hand it to the given.'),
        ],
        solution: proof({ f: ['impI', { A: 'A' }], g: ['impI', { A: 'B' }, 'f'], c: ['andI', {}, 'g'], m: ['mp', {}, 'g'] }, ['f#body>c.a', 'g#body>c.b', 'p>m.imp', 'c>m.a', 'm>g.body', 'g>f.body', 'f>goal'], { premises: ['p'] }),
      },
      {
        kind: 'proof',
        step: T('合成一个条件', 'One condition from two'),
        tests: [{ premises: { p: 'A → (B → C)' }, goal: 'A ∧ B → C' }],
        cases: [{ A: 'Sat', B: 'Rain', C: 'Rest' }, { A: 'Alarm', B: 'Coffee', C: 'Awake' }],
        hint: [T('一个框就够：假设「今天是周六 ∧ 下雨」，拆开以后套用两次。', 'One box will do: assume “today is Saturday ∧ it rains”, split it, then Apply twice.')],
        solution: proof({ f: ['impI', { A: 'A ∧ B' }], e: ['andE', {}, 'f'], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['f#body>e.ab', 'p>m1.imp', 'e#left>m1.a', 'm1>m2.imp', 'e#right>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p'] }),
      },
    ],
    intro: [{ t: T('「下雨并且刮风，地就湿」和「下雨的话，只要再刮风，地就湿」说的是一回事。', '“If it rains and it is windy, the ground is wet” and “if it rains, then if it is also windy, the ground is wet” say the same.') }],
  },
  {
    id: 'iffUse',
    title: T('两个方向', 'Both directions'),
    tasks: [
      prove({
        step: T('一个方向', 'One direction'),
        tests: [{ premises: { p: 'A ↔ B', q: 'A' }, goal: 'B' }],
        cases: [{ A: 'Sat', B: 'Rest' }, { A: 'Coffee', B: 'Awake' }],
        hint: [T('<part-ref to="part:andE"></part-ref>也能拆 ↔：拆出两个方向的「若…则…」，用对的那一个。', '<part-ref to="part:andE"></part-ref> splits ↔ too: into the two “if … then …”s; use the right one.')],
        solution: proof({ e: ['andE'], m: ['mp'] }, ['p>e.ab', 'e#left>m.imp', 'q>m.a', 'm>goal'], { premises: ['p', 'q'] }),
      }),
      prove({
        step: T('另一个方向', 'The other direction'),
        tests: [{ premises: { p: 'A ↔ B', q: '¬A' }, goal: '¬B' }],
        cases: [{ A: 'Sat', B: 'Rest' }, { A: 'Coffee', B: 'Awake' }],
        brief: T('从「今天是周六 ↔ 我休息」和「¬今天是周六」，证明「¬我休息」。', 'From “today is Saturday ↔ I rest” and “¬today is Saturday”, prove “¬I rest”.'),
        hint: [T('这回要用另一个方向：假设「我休息」，看能不能撞出矛盾。', 'This time it takes the other direction: assume “I rest” and see whether it runs into a contradiction.')],
        solution: proof({ e: ['andE'], f: ['impI', { A: 'B' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'] }, ['p>e.ab', 'e#right>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>f.body', 'f>goal'], { premises: ['p', 'q'] }),
      }),
    ],
    intro: [{ t: T('在真值电路里，<level-ref to="g-iff"></level-ref>的 ↔ 表示同真同假。在证明核里，A ↔ B 就是「(A → B) ∧ (B → A)」：两个方向的 → 都成立。', 'In the truth circuits, the ↔ of <level-ref to="g-iff"></level-ref> meant true together and false together. In the kernel, A ↔ B is “(A → B) ∧ (B → A)”: the → holds both ways.') }],
  },
  {
    id: 'or',
    kind: 'proof',
    // K and S, built in the last chapter's optional topics, are not this level's business.
    fold: ['axK', 'axS'],
    title: T('二选一', 'One of two'),
    tests: [{ premises: { p: 'A' }, goal: 'B ∨ (A ∨ B)' }],
    cases: [{ A: 'Sat', B: 'Sun' }, { A: 'Bus', B: 'Bike' }],
    hint: [
      T('从里往外拼。', 'Build it from the inside out.'),
      T('先引入「今天是周六 ∨ 今天是周日」（另一边放右边），再把它放到一句 ∨ 的右边。', 'First bring in “today is Saturday ∨ today is Sunday” (the other side on the right), then put that on the right of another ∨.'),
    ],
    intro: [
      { t: T('「今天是周末」的意思是：今天是周六，<b>或者</b>今天是周日。至少一个成立，两个都成立也算：正是<level-ref to="g-or"></level-ref>里的<part-ref to="lemma:gOr"></part-ref>门。', '“It is the weekend” means: today is Saturday, <b>or</b> today is Sunday. At least one holds, and both count too: the <part-ref to="lemma:gOr"></part-ref> gate of <level-ref to="g-or"></level-ref>.') },
      { t: T('<level-ref to="decl-or"></level-ref>声明了「或者」，随之有了<part-ref to="part:orI"></part-ref>：有了一句话，「它 ∨ 任意一句」就成立。在元件上选它放在左边还是右边，就是选两条引入规则中的哪一条；另一边是哪句话，也在元件上选。', '<level-ref to="decl-or"></level-ref> declared “or”, and with it came <part-ref to="part:orI"></part-ref>: from a sentence, “it ∨ any other” holds. Choosing on the part whether it goes left or right chooses one of the two introduction rules; the other side is chosen on the part too.') },
    ],
    solution: proof({ i: ['orI', { other: 'B', side: 'right' }], j: ['orI', { other: 'B', side: 'left' }] }, ['p>i.a', 'i>j.a', 'j>goal'], { premises: ['p'] }),
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
      { t: T('要么我坐公交，要么我骑车，不知道是哪一个。坐公交，我准时到；骑车，我也准时到。', 'Either I take the bus or I cycle; which, you do not know. By bus I arrive on time; by bike I arrive on time too.') },
      { t: T('光有「我坐公交 ∨ 我骑车」，拆不出「我坐公交」：说不定是骑车。', 'From “I take the bus ∨ I cycle” alone you cannot take out “I take the bus”: perhaps I cycled.') },
      { t: T('「或者」生成的消去规则是<b>分情况</b>：一条引入规则一种情况。<part-ref to="part:orE"></part-ref>像一个假设框，只是有两个框：情况一假设左边，情况二假设右边；两个框证出<b>同一句话</b>，它就给出这句话。', 'The elimination rule made for “or” goes <b>case by case</b>: one case for each introduction rule. <part-ref to="part:orE"></part-ref> is like an assumption box, but with two boxes: case one assumes the left, case two the right; when both prove the <b>same sentence</b>, it gives that sentence.') },
    ],
    solution: proof({ e: ['orE'], m: ['mp', {}, 'e/left'], m2: ['mp', {}, 'e/right'] }, ['p>e.ab', 'q>m.imp', 'e#left>m.a', 'm>e.left', 'r>m2.imp', 'e#right>m2.a', 'm2>e.right', 'e>goal'], { premises: ['p', 'q', 'r'] }),
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
      },
      {
        kind: 'proof',
        step: T('不管哪一种', 'Whichever it is'),
        tests: [{ premises: { p: 'A → C', q: 'B → C' }, goal: 'A ∨ B → C' }],
        cases: [{ A: 'Bus', B: 'Bike', C: 'OnTime' }, { A: 'Sat', B: 'Sun', C: 'Rest' }],
        hint: [T('目标是「若…则…」，先开一个假设框；框里有了一句 ∨，再分情况。', 'The goal is an “if … then …”: open an assumption box first; with an ∨ inside it, split into cases.')],
        intro: [{ t: T('在<level-ref to="cases"></level-ref>里，「我坐公交 ∨ 我骑车」是已知；这回它在要证的「若…则…」里。', 'In <level-ref to="cases"></level-ref>, “I take the bus ∨ I cycle” was given; now it sits inside the “if … then …” to be proved.') }],
        solution: proof({ f: ['impI', { A: 'A ∨ B' }], e: ['orE', {}, 'f'], m1: ['mp', {}, 'e/left'], m2: ['mp', {}, 'e/right'] }, ['f#body>e.ab', 'p>m1.imp', 'e#left>m1.a', 'm1>e.left', 'q>m2.imp', 'e#right>m2.a', 'm2>e.right', 'e>f.body', 'f>goal'], { premises: ['p', 'q'] }),
      },
    ],
  },
  {
    id: 'dist',
    kind: 'proof',
    title: T('分配律', 'Distribute'),
    tests: [{ premises: { p: 'A ∧ (B ∨ C)' }, goal: '(A ∧ B) ∨ (A ∧ C)' }],
    cases: [{ A: 'Sat', B: 'Rain', C: 'Wind' }, { A: 'Exam', B: 'Coffee', C: 'Tea' }],
    hint: [
      T('先消去 ∧，再对拆出来的「下雨 ∨ 刮风」分情况。', 'Split the ∧ first, then take cases on the “it rains ∨ it is windy” it gives.'),
      T('每种情况里，把「今天是周六」和这一情况的假设拼起来，再放进 ∨ 的对应一边。', 'In each case, join “today is Saturday” with that case’s assumption, then put it on the matching side of the ∨.'),
    ],
    solution: proof({ s: ['andE'], e: ['orE'], l1: ['andI', {}, 'e/left'], o1: ['orI', { other: 'A ∧ C', side: 'right' }, 'e/left'], l2: ['andI', {}, 'e/right'], o2: ['orI', { other: 'A ∧ B', side: 'left' }, 'e/right'] }, ['p>s.ab', 's#right>e.ab', 's#left>l1.a', 'e#left>l1.b', 'l1>o1.a', 'o1>e.left', 's#left>l2.a', 'e#right>l2.b', 'l2>o2.a', 'o2>e.right', 'e>goal'], { premises: ['p'] }),
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
      },
      {
        kind: 'proof',
        step: T('假前提推出一切', 'A false premise gives anything'),
        tests: [{ premises: { p: '¬A' }, goal: 'A → B' }],
        cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Locked', B: 'Moon' }],
        hint: [T('目标是「若…则…」：假设「下雨」。框里它和已知撞出 ⊥。', 'The goal is an “if … then …”: assume “it rains”. Inside the box it clashes with the given and gives ⊥.')],
        intro: [{ t: T('真值表里，「若…则…」的前件为假，整句就为真。这一回用规则证出它的一个例子。', 'In a truth table, an “if … then …” is true whenever its “if” part is false. Here the rules prove one instance of it.') }],
        solution: proof({ f: ['impI', { A: 'A' }], m: ['mp', {}, 'f'], b: ['botE', { C: 'B' }, 'f'] }, ['p>m.imp', 'f#body>m.a', 'm>b.bot', 'b>f.body', 'f>goal'], { premises: ['p'] }),
      },
    ],
    intro: [
      { t: T('一个证人先说「门锁着」，又说「门没锁」。两句不可能都对。', 'A witness says “the door is locked”, then “the door is not locked”. Both cannot be true.') },
      { t: T('<level-ref to="g-always"></level-ref>里见过<wiki-ref to="contradiction"></wiki-ref>：每一行都假的句子，写作 <b>⊥</b>。', 'You met the <wiki-ref to="contradiction"></wiki-ref> in <level-ref to="g-always"></level-ref>: a sentence false on every row, written <b>⊥</b>.') },
      { t: T('<part-ref to="part:botE"></part-ref>是 ⊥ 的消去规则：有了 ⊥，元件上选哪句，就证出哪句。这是<wiki-ref to="explosion"></wiki-ref>。', '<part-ref to="part:botE"></part-ref> is the elimination rule of ⊥: from ⊥ it proves whichever sentence is chosen on the part. This is <wiki-ref to="explosion"></wiki-ref>.') },
    ],
    after: T('一组已知一旦自相矛盾，就什么都证得出，也就分不清真假了。', 'Once the givens contradict each other, everything can be proved, and true can no longer be told from false.'),
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
    intro: [{ t: T('下雨地就湿，下雨地又不湿：那就不可能在下雨。', 'If rain makes the ground wet and also makes it not wet, it cannot be raining.') }],
    after: T('反方向，由「¬¬下雨」得到「下雨」，这些规则做不到。', 'The other way, from “¬¬it rains” to “it rains”, is beyond these rules.'),
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
          { t: T('「下雨，地就湿」，那么「地不湿，就没下雨」。这叫<wiki-ref to="contrapositive"></wiki-ref>。和<level-ref to="onerow"></level-ref>里那个错误的推理不同，它永远成立：「(下雨 → 地湿) → (¬地湿 → ¬下雨)」。', '“If it rains, the ground is wet”, so “if the ground is not wet, it did not rain”. This is the <wiki-ref to="contrapositive"></wiki-ref>, and unlike the bad reasoning of <level-ref to="onerow"></level-ref> it always holds: “(it rains → the ground is wet) → (¬the ground is wet → ¬it rains)”.') },
        ],
        solution: contra,
      },
      {
        kind: 'truth',
        step: T('否定前件', 'Denying the antecedent'),
        ask: 'counter',
        formulas: ['(Rain → Wet) → (¬Rain → ¬Wet)'],
        brief: T('找出让「(下雨 → 地湿) → (¬下雨 → ¬地湿)」为假的一行。', 'Find a row that makes “(it rains → the ground is wet) → (¬it rains → ¬the ground is wet)” false.'),
        hint: [
          T('整句为假，前件就得为真、后件为假。', 'For the whole to be false, its “if” part must be true and its “then” part false.'),
          T('没下雨，地却湿了，可能吗？', 'Could it not rain, and the ground still be wet?'),
        ],
        intro: [{ t: T('「下雨地就湿，所以没下雨，地就不湿。」它也把两边都否定了，只是没有调换位置。证得出吗？先找反例。', '“Rain makes the ground wet, so no rain, no wet ground.” This too negates both sides, only without swapping them. Does it follow? Look for a counterexample first.') }],
      },
    ],
    intro: [{ t: T('下雨地就湿，地湿路就滑；可路不滑，所以没下雨。', 'Rain wets the ground, a wet ground is slippery; the road is not slippery, so it did not rain.') }],
  },
  {
    id: 'dsyll',
    kind: 'proof',
    title: T('排除一个，剩下那个', 'Rule one out, the other remains'),
    tests: [{ premises: { p: 'A ∨ B', q: '¬A' }, goal: 'B' }],
    cases: [{ A: 'Bus', B: 'Bike' }, { A: 'Coffee', B: 'Tea' }],
    hint: [T('分情况。「我坐公交」那一边撞上「¬我坐公交」，得到 ⊥；矛盾推出一切。', 'Take cases. On the “I take the bus” side it runs into “¬I take the bus” and gives ⊥; from a contradiction, anything.')],
    intro: [{ t: T('要么坐公交，要么骑车；没坐公交，那就是骑车。', 'Bus or bike; not the bus, so the bike.') }],
    solution: proof({ e: ['orE'], m: ['mp', {}, 'e/left'], b: ['botE', { C: 'B' }, 'e/left'] }, ['p>e.ab', 'q>m.imp', 'e#left>m.a', 'm>b.bot', 'b>e.left', 'e#right>e.right', 'e>goal'], { premises: ['p', 'q'] }),
    after: T('这叫<wiki-ref to="dsyll"></wiki-ref>，「排除法」靠的就是它。', 'This is the <wiki-ref to="dsyll"></wiki-ref>, the logic behind every process of elimination.'),
  },
]
