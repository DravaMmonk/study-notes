// 第 2 代 · 二号：假设框。演绎定理成了身体的一部分：在框里假设 A，证出 B，框外就得到 A → B。
import { box, proof } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })

// 2-6: A ∧ B → B ∧ A, one box around the swap.
const swapBox = box({ e: ['andE'], i: ['andI'] }, ['assume>e.ab', 'e#right>i.a', 'e#left>i.b', 'i>out'])
// 2-7: (A → B) → (¬B → ¬A), three boxes deep.
const contra = proof({
  f: ['impI', { A: 'A → B' }, {
    body: box({
      g: ['impI', { A: '¬B' }, {
        body: box({
          h: ['impI', { A: 'A' }, { body: box({ m1: ['mp'], m2: ['mp'] }, ['f/body>m1.imp', 'assume>m1.a', 'g/body>m2.imp', 'm1>m2.a', 'm2>out'], { sees: ['f/body', 'g/body'] }) }],
        }, ['h>out'], { sees: ['f/body'] }),
      }],
    }, ['g>out']),
  }],
}, ['f>goal'])
// 2-8: ¬(A ∨ B) → ¬A ∧ ¬B.
const notEither = (side, other) => ['impI', { A: side }, { body: box({ i: ['orI', { other, side: side === 'A' ? 'right' : 'left' }], m: ['mp'] }, ['assume>i.a', 'f/body>m.imp', 'i>m.a', 'm>out'], { sees: ['f/body'] }) }]
const deMorgan = proof({
  f: ['impI', { A: '¬(A ∨ B)' }, { body: box({ na: notEither('A', 'B'), nb: notEither('B', 'A'), c: ['andI'] }, ['na>c.a', 'nb>c.b', 'c>out']) }],
}, ['f>goal'])

// The knights and knaves topic: A means “a is a knight” (a knight always tells the truth, a knave always lies).
// K1: A ↔ ¬A ⊢ ⊥. From the left: A gives ¬A, so not A; from the right, then, A.
const k1 = proof({
  e: ['iffE'],
  n: ['impI', { A: 'A' }, { body: box({ m1: ['mp'], m2: ['mp'] }, ['in1>m1.imp', 'assume>m1.a', 'm1>m2.imp', 'assume>m2.a', 'm2>out'], { sees: ['in1'] }) }],
  m3: ['mp'],
  m4: ['mp'],
}, ['p>e.iff', 'e#ltr>n.in1', 'e#rtl>m3.imp', 'n>m3.a', 'n>m4.imp', 'm3>m4.a', 'm4>goal'], { premises: ['p'] })

export const era2 = [
  {
    id: 'box',
    kind: 'proof',
    title: T('打开一个框', 'Open a box'),
    tests: [{ goal: 'A → A' }],
    palette: ['impI', 'mp'],
    brief: T('用二号的「假设框」证出 A → A。', 'Prove A → A with Mark II’s assumption box.'),
    hint: [T('框外要 A → A：框里假设什么，又要证出什么？', 'Outside the box you want A → A: what does the box assume, and what must it prove?')],
    intro: [
      { t: T('这是证明机「二号」。它多了<b>假设框</b>：卡片上填 A，打开框，框里多一张「假设 A」卡片；框里证出的东西接到框的结论上，框外就得到 A → 它。', 'This is the proof machine Mark II. It has an <b>assumption box</b>: fill in A on the card and open the box; inside there is an extra card, “assume A”. Whatever you prove inside goes to the box’s conclusion, and outside you get A → it.') },
      { t: T('上一代你亲手证明了这件事（演绎定理）。二号把它做成了身体的一部分。', 'Last era you proved this yourself (the deduction theorem). Mark II makes it part of its body.') },
      { t: T('框里看得见外面的前提和外面各个框的假设。外面证出的别的东西，从框卡片的「带进」口接进去。', 'Inside a box you can see the premises and the assumptions of the boxes around it. Anything else proved outside comes in through the box card’s “bring in” ports.') },
    ],
    solution: proof({ f: ['impI', { A: 'A' }, { body: box({}, ['assume>out']) }] }, ['f>goal']),
    after: T('初号要 5 步，二号一个框。框里的假设只在框里有效：框一关，它就成了结论里「→」的左边。', 'Mark I took 5 steps; Mark II one box. The assumption only holds inside the box: once the box closes, it becomes the left side of the conclusion’s →.'),
  },
  {
    id: 'and',
    kind: 'proof',
    title: T('两个都要', 'Both of them'),
    tests: [{ premises: { p: 'A ∧ B' }, goal: 'B ∧ A' }],
    palette: ['impI', 'mp', 'andI', 'andE'],
    brief: T('由 A ∧ B 证出 B ∧ A。', 'From A ∧ B, prove B ∧ A.'),
    hint: [T('先拆开，再按新的顺序拼起来。', 'Take it apart, then put it together in the new order.')],
    intro: [{ t: T('<b>拆开 ∧</b>：A ∧ B 的两个输出口分别给出 A 和 B。<b>拼成 ∧</b>：有了 A 和 B，就有 A ∧ B。', '<b>Split ∧</b>: the two outputs of A ∧ B give A and B. <b>Join ∧</b>: from A and B, A ∧ B.') }],
    solution: proof({ e: ['andE'], i: ['andI'] }, ['p>e.ab', 'e#right>i.a', 'e#left>i.b', 'i>goal'], { premises: ['p'] }),
    after: T('每个连接词都有一条引入它的规则，一条用掉它的规则。', 'Every connective has a rule that brings it in and a rule that uses it up.'),
  },
  {
    id: 'or',
    kind: 'proof',
    title: T('二选一', 'One of two'),
    tests: [{ premises: { p: 'A' }, goal: 'B ∨ A' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI'],
    brief: T('由 A 证出 B ∨ A。', 'From A, prove B ∨ A.'),
    hint: [T('卡片上填另一边是什么，再选它放左边还是右边。', 'Fill in what the other side is on the card, and choose whether it goes on the left or the right.')],
    intro: [{ t: T('<b>引入 ∨</b>：有了 A，「A 或随便什么」就成立。', '<b>Bring in ∨</b>: from A, “A or anything at all” holds.') }],
    solution: proof({ i: ['orI', { other: 'B', side: 'left' }] }, ['p>i.a', 'i>goal'], { premises: ['p'] }),
    after: T('A ∨ B 只说两个里至少有一个成立，不说是哪一个。所以从 A ∨ B 出发要分情况。', 'A ∨ B only says at least one of the two holds, not which. So starting from A ∨ B means splitting into cases.'),
  },
  {
    id: 'cases',
    kind: 'proof',
    title: T('分情况', 'Case by case'),
    tests: [{ premises: { p: 'A ∨ B' }, goal: 'B ∨ A' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE'],
    brief: T('由 A ∨ B 证出 B ∨ A。', 'From A ∨ B, prove B ∨ A.'),
    hint: [T('分情况有两个框：一个假设 A，一个假设 B。两个框要证出同一个东西。', 'Case by case has two boxes: one assumes A, the other B. Both must prove the same thing.')],
    intro: [{ t: T('<b>分情况</b>：接进 A ∨ B。假设 A 能证出 C，假设 B 也能证出 C，那么 C。', '<b>Case by case</b>: wire in A ∨ B. If assuming A proves C, and assuming B proves C too, then C.') }],
    solution: proof({
      e: ['orE', {}, {
        left: box({ i: ['orI', { other: 'B', side: 'left' }] }, ['assume>i.a', 'i>out']),
        right: box({ i: ['orI', { other: 'A', side: 'right' }] }, ['assume>i.a', 'i>out']),
      }],
    }, ['p>e.ab', 'e>goal'], { premises: ['p'] }),
    after: T('不知道是哪一个，就每一个都证一遍。', 'Not knowing which one, prove it for each.'),
  },
  {
    id: 'bot',
    kind: 'proof',
    title: T('矛盾', 'Contradiction'),
    tests: [{ premises: { p: 'A', q: '¬A' }, goal: 'B' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE'],
    brief: T('由 A 和 ¬A 证出 B。', 'From A and ¬A, prove B.'),
    hint: [T('¬A 在二号眼里就是 A → ⊥。', 'To Mark II, ¬A is just A → ⊥.')],
    intro: [
      { t: T('⊥ 是「矛盾」，一句永远假的话。<b>¬A</b> 就是 A → ⊥：「A 一成立就矛盾」。', '⊥ is “contradiction”, a statement that is always false. <b>¬A</b> is A → ⊥: “if A held, that would be a contradiction”.') },
      { t: T('<b>矛盾推出一切</b>：有了 ⊥，卡片上填什么就能证出什么。', '<b>From contradiction, anything</b>: from ⊥, prove whatever is filled in on the card.') },
    ],
    solution: proof({ m: ['mp'], b: ['botE', { C: 'B' }] }, ['q>m.imp', 'p>m.a', 'm>b.bot', 'b>goal'], { premises: ['p', 'q'] }),
    after: T('一个自相矛盾的前提集，什么都证得出：这正是要避开它的原因。', 'A set of premises that contradicts itself proves everything: which is exactly why it must be avoided.'),
  },
  {
    id: 'swap',
    kind: 'proof',
    title: T('交换律', 'Commuting'),
    tests: [{ goal: 'A ∧ B → B ∧ A' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE'],
    brief: T('不用前提，证出 A ∧ B → B ∧ A。', 'With no premise, prove A ∧ B → B ∧ A.'),
    hint: [T('「两个都要」那一关的证明，可以整个搬进一个框里。', 'The proof from “Both of them” can move into a box whole.')],
    intro: [{ t: T('目标是一个「若…则…」，没有前提。', 'The goal is an “if … then …”, with no premise.') }],
    solution: proof({ f: ['impI', { A: 'A ∧ B' }, { body: swapBox }] }, ['f>goal']),
    after: T('有前提的证明，放进框里就成了不要前提的定理。', 'A proof from premises, put in a box, becomes a theorem with none.'),
  },
  {
    id: 'contra',
    kind: 'proof',
    title: T('逆否', 'Contrapositive'),
    tests: [{ goal: '(A → B) → (¬B → ¬A)' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE'],
    brief: T('证出 (A → B) → (¬B → ¬A)。', 'Prove (A → B) → (¬B → ¬A).'),
    hint: [T('三个 →，三个框，一个套一个。最里面的框能用外面两个框的假设。', 'Three →s, three boxes, one inside another. The innermost box can use the assumptions of the two outside it.')],
    intro: [{ t: T('框里可以再开框。里面的框看得见外面所有框的假设和前提。', 'A box can open another box inside. An inner box sees every assumption and premise outside it.') }],
    solution: contra,
    after: T('¬A 就是 A → ⊥，所以证 ¬A 就是假设 A、推出矛盾。', '¬A is A → ⊥, so proving ¬A is assuming A and reaching a contradiction.'),
  },
  {
    id: 'demorgan',
    kind: 'proof',
    title: T('德摩根', 'De Morgan'),
    tests: [{ goal: '¬(A ∨ B) → ¬A ∧ ¬B' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE'],
    brief: T('证出 ¬(A ∨ B) → ¬A ∧ ¬B。', 'Prove ¬(A ∨ B) → ¬A ∧ ¬B.'),
    hint: [T('¬A 怎么来？假设 A，看能不能和 ¬(A ∨ B) 撞出矛盾。', 'Where does ¬A come from? Assume A and see whether it clashes with ¬(A ∨ B).')],
    intro: [{ t: T('两个都不成立，和「两个里有一个成立」不成立，是一回事吗？', 'Is “neither holds” the same as “not (one of them holds)”?') }],
    solution: deMorgan,
    after: T('这个方向不用任何花招。反过来的另一条德摩根律 ¬(A ∧ B) → ¬A ∨ ¬B，在二号上证不出来：它要先知道是哪一个不成立。', 'This direction needs no tricks. The other De Morgan law, ¬(A ∧ B) → ¬A ∨ ¬B, cannot be proved on Mark II: it needs to know which one fails.'),
  },
  {
    id: 'notnotlem',
    kind: 'proof',
    title: T('排中律不可否定', 'You cannot deny the excluded middle'),
    tests: [{ goal: '¬¬(A ∨ ¬A)' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE'],
    brief: T('证出 ¬¬(A ∨ ¬A)。', 'Prove ¬¬(A ∨ ¬A).'),
    hint: [
      T('直接证 A ∨ ¬A 是不行的：你不知道该选哪一边。', 'Proving A ∨ ¬A directly will not work: you do not know which side to choose.'),
      T('假设 ¬(A ∨ ¬A)，再把这个假设用两次。', 'Assume ¬(A ∨ ¬A), and then use that assumption twice.'),
    ],
    intro: [{ t: T('A ∨ ¬A 每一行都真，可二号证不出它。它的「不可否定」却证得出。', 'A ∨ ¬A is true on every row, yet Mark II cannot prove it. That it cannot be denied, though, it can.') }],
    solution: proof({
      f: ['impI', { A: '¬(A ∨ ¬A)' }, {
        body: box({
          na: ['impI', { A: 'A' }, { body: box({ i: ['orI', { other: '¬A', side: 'right' }], m: ['mp'] }, ['assume>i.a', 'f/body>m.imp', 'i>m.a', 'm>out'], { sees: ['f/body'] }) }],
          i2: ['orI', { other: 'A', side: 'left' }],
          m2: ['mp'],
        }, ['na>i2.a', 'assume>m2.imp', 'i2>m2.a', 'm2>out']),
      }],
    }, ['f>goal']),
    naive: proof({ f: ['impI', { A: '¬(A ∨ ¬A)' }, { body: box({ i: ['orI', { other: '¬A', side: 'right' }] }, ['assume>i.a', 'i>out']) }] }, ['f>goal']),
    after: T('假设 ¬(A ∨ ¬A)：先由它得出 ¬A，再由 ¬A 得出 A ∨ ¬A，和它自己矛盾。二号证不出 A ∨ ¬A，却证得出「否认它会矛盾」。', 'Assume ¬(A ∨ ¬A): from it get ¬A, then from ¬A get A ∨ ¬A, which contradicts it. Mark II cannot prove A ∨ ¬A, but it can prove that denying it is a contradiction.'),
  },
  {
    id: 'raa',
    kind: 'proof',
    title: T('反证法', 'By contradiction'),
    tests: [{ premises: { p: '¬¬A' }, goal: 'A' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa'],
    brief: T('由 ¬¬A 证出 A。', 'From ¬¬A, prove A.'),
    hint: [T('新元件正是做这件事的。', 'The new part does exactly this.')],
    intro: [{ t: T('<b>反证法</b>：「A 不成立会矛盾」，所以 A。二号原来没有这条规则；加上它，就能证出 A ∨ ¬A 这样的命题了。', '<b>By contradiction</b>: “A failing would be a contradiction”, so A. Mark II did not have this rule; with it, propositions like A ∨ ¬A become provable.') }],
    solution: proof({ r: ['raa'] }, ['p>r.nna', 'r>goal'], { premises: ['p'] }),
    after: T('不用反证法的逻辑叫直觉主义逻辑：每个「存在」都要给出例子，每个「或」都要说出是哪一边。加上反证法，就是经典逻辑。', 'Logic without proof by contradiction is called intuitionistic: every “there is” must show an example, every “or” must say which side. Add proof by contradiction and it is classical logic.'),
  },
  // Knights and knaves (a topic): on an island every islander is a knight (always tells the truth) or a knave (always
  // lies). A says “a is a knight”; what islander a says, a premise A ↔ (what a says).
  {
    id: 'kk-one',
    kind: 'proof',
    title: T('一个岛民', 'One islander'),
    tests: [{ premises: { p: 'A ↔ ¬A' }, goal: '⊥' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'iffE'],
    brief: T('岛民 a 说：「我是无赖。」证明这不可能：由 A ↔ ¬A 证出 ⊥。', 'Islander a says: “I am a knave.” Prove this cannot happen: from A ↔ ¬A, prove ⊥.'),
    hint: [T('先证 ¬A：假设 A 会怎样？', 'Prove ¬A first: what happens if you assume A?')],
    intro: [
      { t: T('岛上的人要么是骑士，永远说真话；要么是无赖，永远说假话。A 表示「a 是骑士」。', 'Everyone on the island is a knight, who always tells the truth, or a knave, who always lies. A means “a is a knight”.') },
      { t: T('a 说了一句话 S，就有 A ↔ S：a 是骑士，当且仅当 S 是真的。<b>拆开 ↔</b> 给出两个方向的 →。', 'If a says S, then A ↔ S: a is a knight exactly when S is true. <b>Split ↔</b> gives the → in each direction.') },
    ],
    solution: k1,
    after: T('谁都不能说「我是无赖」：骑士说不出假话，无赖说不出真话。', 'Nobody can say “I am a knave”: a knight cannot say something false, a knave cannot say something true.'),
  },
  {
    id: 'kk-two',
    kind: 'proof',
    title: T('两个岛民', 'Two islanders'),
    tests: [{ premises: { p: 'A ↔ ¬A ∧ ¬B' }, goal: '¬A ∧ B' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'iffE'],
    brief: T('a 说：「我们俩都是无赖。」证出 a 是无赖、b 是骑士。', 'a says: “We are both knaves.” Prove that a is a knave and b a knight.'),
    hint: [
      T('¬A 和上一关一样来。', '¬A comes the way it did last level.'),
      T('B 要用反证法：假设 ¬B，就凑齐了 a 那句话。', 'B takes proof by contradiction: assume ¬B, and a’s statement is complete.'),
    ],
    intro: [{ t: T('B 表示「b 是骑士」。b 什么也没说。', 'B means “b is a knight”. b says nothing.') }],
    solution: proof({
      e: ['iffE'],
      na: ['impI', { A: 'A' }, { body: box({ m1: ['mp'], s: ['andE'], m2: ['mp'] }, ['in1>m1.imp', 'assume>m1.a', 'm1>s.ab', 's#left>m2.imp', 'assume>m2.a', 'm2>out'], { sees: ['in1'] }) }],
      nnb: ['impI', { A: '¬B' }, { body: box({ c: ['andI'], m3: ['mp'], m4: ['mp'] }, ['in1>c.a', 'assume>c.b', 'in2>m3.imp', 'c>m3.a', 'in1>m4.imp', 'm3>m4.a', 'm4>out'], { sees: ['in1', 'in2'] }) }],
      b: ['raa'],
      both: ['andI'],
    }, ['p>e.iff', 'e#ltr>na.in1', 'na>nnb.in1', 'e#rtl>nnb.in2', 'nnb>b.nna', 'na>both.a', 'b>both.b', 'both>goal'], { premises: ['p'] }),
    after: T('a 不能是骑士（那他就说了假话），所以是无赖；无赖的话是假的，所以「两个都是无赖」不成立：b 是骑士。', 'a cannot be a knight (he would have said something false), so he is a knave; a knave’s words are false, so “both are knaves” fails: b is a knight.'),
  },
  {
    id: 'kk-three',
    kind: 'proof',
    title: T('骑士与无赖', 'Knights and knaves'),
    tests: [{ premises: { p: 'A ↔ ¬A ∨ B' }, goal: 'A ∧ B' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'iffE'],
    brief: T('a 说：「我是无赖，或者 b 是骑士。」两个人各是什么？证出 A ∧ B。', 'a says: “I am a knave, or b is a knight.” What is each of them? Prove A ∧ B.'),
    hint: [
      T('先证 A：假设 ¬A，a 的话就成真了。', 'Prove A first: assume ¬A, and a’s statement comes true.'),
      T('有了 A，a 的话也成立；分情况看它是哪一半。', 'With A, a’s statement holds too; split on which half of it.'),
    ],
    intro: [{ t: T('这一次你要自己弄清楚答案是什么，再把它证出来。', 'This time you have to work out the answer yourself, then prove it.') }],
    solution: proof({
      e: ['iffE'],
      nna: ['impI', { A: '¬A' }, { body: box({ i: ['orI', { other: 'B', side: 'right' }], m1: ['mp'], m2: ['mp'] }, ['assume>i.a', 'in1>m1.imp', 'i>m1.a', 'assume>m2.imp', 'm1>m2.a', 'm2>out'], { sees: ['in1'] }) }],
      a: ['raa'],
      says: ['mp'],
      c: ['orE', {}, {
        left: box({ m: ['mp'], f: ['botE', { C: 'B' }] }, ['assume>m.imp', 'in1>m.a', 'm>f.bot', 'f>out'], { sees: ['in1'] }),
        right: box({}, ['assume>out']),
      }],
      both: ['andI'],
    }, ['p>e.iff', 'e#rtl>nna.in1', 'nna>a.nna', 'a>c.in1', 'e#ltr>says.imp', 'a>says.a', 'says>c.ab', 'a>both.a', 'c>both.b', 'both>goal'], { premises: ['p'] }),
    after: T('两个都是骑士。如果 a 是无赖，他的话就是真的，无赖说不出真话；所以 a 是骑士，他的话为真，而「我是无赖」那一半是假的，只能是 b 是骑士。', 'Both are knights. If a were a knave, his statement would be true, and a knave cannot say something true; so a is a knight, his statement is true, and since “I am a knave” is false, b must be a knight.'),
  },
]
