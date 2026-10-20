// 第 2 代 · 二号：假设框。演绎定理成了身体的一部分：在框里假设 X，证出 Y，框外就得到 X → Y。每个连接词一关一个，
// 先用天气、出行这些具体的话上手，再回到字母；骑士与无赖的专题讲岛上的人。
import { box, proof } from '../../kit/domains/logic/build.js'
import { ISLAND, WORDS } from './words.js'

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
    title: T('假设下雨', 'Suppose it rains'),
    words: WORDS,
    tests: [{ premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Slip' }],
    palette: ['impI', 'mp'],
    brief: T('已知「下雨 → 地湿」和「地湿 → 路滑」，用假设框证出「下雨 → 路滑」。', 'Given “it rains → the ground is wet” and “the ground is wet → the road is slippery”, prove “it rains → the road is slippery” with an assumption box.'),
    hint: [
      T('框的「假设」选「下雨」，再打开框。', 'Set the box’s assumption to “it rains”, then open the box.'),
      T('框里用两次分离，从「下雨」走到「路滑」，接到「结论」。回到外面，把框接到目标。', 'Inside, Detach twice to get from “it rains” to “the road is slippery” and wire it to “Conclusion”. Back outside, wire the box to the goal.'),
    ],
    intro: [
      { t: T('还记得「接起来」吗？同样的前提、同样的目标，初号用了 5 步，还得想好怎么摆 K 和 S。可人是这样想的：「<b>假设</b>下雨。那地就湿，那路就滑。所以，下雨的话路就滑。」', 'Remember “Join them”? Same premises, same goal: Mark I took 5 steps and some thought about where K and S go. A person thinks: “<b>Suppose</b> it rains. Then the ground is wet, then the road is slippery. So if it rains, the road is slippery.”') },
      { t: T('证明机<b>二号</b>就会这样想。它多了<b>假设框</b>：在框卡片上选要假设的话，点「打开框」走进去，里面多一张「假设」卡片；在框里证出的东西接到「结论」，回到外面，框就给出「假设 → 结论」。', 'The proof machine <b>Mark II</b> thinks that way. It has an <b>assumption box</b>: choose on the box card what to assume and press “Open box” to step inside. There you find an extra “Assume” card; wire what you prove to “Conclusion”, and back outside the box gives “assumption → conclusion”.') },
      { t: T('这正是上个专题的演绎定理，二号把它做成了身体的一部分。框里看得见外面的前提，用法和外面一样。', 'This is the deduction theorem from the last topic, built into Mark II’s body. Inside the box the premises are visible and work just as they do outside.') },
    ],
    solution: proof({ f: ['impI', { A: 'Rain' }, { body: box({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'assume>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>out'], { sees: ['p', 'q'] }) }] }, ['f>goal'], { premises: ['p', 'q'] }),
    after: T('3 步，和脑子里的推理一模一样。框里的假设只在框里有效：框一关，它就成了结论里 → 的左边，不再算「已知」。', 'Three steps, exactly as you would reason it out. The assumption only holds inside the box: once the box closes it becomes the left side of the conclusion’s →, and no longer counts as known.'),
  },
  {
    id: 'and',
    kind: 'proof',
    title: T('两个都要', 'Both of them'),
    words: WORDS,
    symbols: ['∧'],
    tests: [{ premises: { p: 'Rain ∧ Wind' }, goal: 'Wind ∧ Rain' }],
    palette: ['impI', 'mp', 'andI', 'andE'],
    brief: T('已知「下雨 ∧ 刮风」，证出「刮风 ∧ 下雨」。', 'Given “it rains ∧ it is windy”, prove “it is windy ∧ it rains”.'),
    hint: [T('先拆开，再按新的顺序拼起来。', 'Take it apart, then put it back together in the new order.')],
    intro: [
      { t: T('0-2 关里见过「并且」：两件事都发生，整句才真。从这一关起，「X 并且 Y」写成 <b>X ∧ Y</b>。', 'You met “and” in level 0-2: the whole is true only when both happen. From this level on, “X and Y” is written <b>X ∧ Y</b>.') },
      { t: T('二号的规则成对出现：一条造出它，一条用掉它。<b>拼成 ∧</b>：有了 X，又有了 Y，就有 X ∧ Y。<b>拆开 ∧</b>：从 X ∧ Y 拆出 X，也拆出 Y，它有两个输出口。', 'Mark II’s rules come in pairs: one makes a connective, one uses it up. <b>Join ∧</b>: from X and Y, X ∧ Y. <b>Split ∧</b>: from X ∧ Y, X, and also Y; it has two outputs.') },
      { t: T('这一关不用框。', 'No box needed this time.') },
    ],
    solution: proof({ e: ['andE'], i: ['andI'] }, ['p>e.ab', 'e#right>i.a', 'e#left>i.b', 'i>goal'], { premises: ['p'] }),
    after: T('先拆后拼，换了个顺序。每个连接词都有一条造它的规则、一条用它的规则：这样的规则体系叫<b>自然演绎</b>。', 'Split, then join in the other order. Every connective has a rule that makes it and a rule that uses it: a system like that is called <b>natural deduction</b>.'),
  },
  {
    id: 'or',
    kind: 'proof',
    title: T('二选一', 'One of two'),
    words: WORDS,
    symbols: ['∨'],
    tests: [{ premises: { p: 'Sat' }, goal: 'Sun ∨ Sat' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI'],
    brief: T('已知「今天是周六」，证出「今天是周日 ∨ 今天是周六」。', 'Given “today is Saturday”, prove “today is Sunday ∨ today is Saturday”.'),
    hint: [T('卡片上选另一边是什么，再选它放在左边还是右边。', 'On the card, choose what the other side is and whether it goes on the left or the right.')],
    intro: [
      { t: T('「今天是周末」的意思是：今天是周六，<b>或者</b>今天是周日。至少一个成立就行。从这一关起，「X 或者 Y」写成 <b>X ∨ Y</b>。', '“It is the weekend” means: today is Saturday, <b>or</b> today is Sunday. At least one is enough. From this level on, “X or Y” is written <b>X ∨ Y</b>.') },
      { t: T('<b>引入 ∨</b>：有了 X，「X ∨ 随便什么」就成立。在卡片上选另一边是哪句话，再选它放左边还是右边。', '<b>Bring in ∨</b>: from X, “X ∨ anything at all” holds. On the card, choose the other side and whether it goes left or right.') },
    ],
    solution: proof({ i: ['orI', { other: 'Sun', side: 'left' }] }, ['p>i.a', 'i>goal'], { premises: ['p'] }),
    after: T('知道是周六，就知道「周日或周六」。反过来不行：只知道「周六或周日」，并不知道是哪一天。要用掉一个 ∨，就得分情况，下一关讲。', 'Knowing it is Saturday, you know “Sunday or Saturday”. Not the other way round: “Saturday or Sunday” does not say which day it is. Using up an ∨ takes a case split: next level.'),
  },
  {
    id: 'cases',
    kind: 'proof',
    title: T('分情况', 'Case by case'),
    words: WORDS,
    tests: [{ premises: { p: 'Bus ∨ Bike', q: 'Bus → OnTime', r: 'Bike → OnTime' }, goal: 'OnTime' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE'],
    brief: T('明天我坐公交 ∨ 骑车；坐公交能准时到，骑车也能准时到。证出「我准时到」。', 'Tomorrow I take the bus ∨ cycle; by bus I arrive on time, and by bike too. Prove “I arrive on time”.'),
    hint: [
      T('把「我坐公交 ∨ 我骑车」接进分情况。', 'Wire “I take the bus ∨ I cycle” into Case by case.'),
      T('「情况一」里假设的是坐公交，「情况二」里是骑车。两个框都要证出「我准时到」。', 'Case one assumes the bus, case two the bike. Both boxes must prove “I arrive on time”.'),
    ],
    intro: [
      { t: T('明天我要么坐公交，要么骑车，还没决定。坐公交能准时到，骑车也能准时到。所以不管怎样，我都会准时到。', 'Tomorrow I will take the bus or cycle; I have not decided. By bus I arrive on time; by bike too. So either way, I arrive on time.') },
      { t: T('<b>分情况</b>是一块有两个框的元件。接进一个 X ∨ Y：「情况一」假设 X，「情况二」假设 Y。两个框证出同一件事 Z，外面就得到 Z。', '<b>Case by case</b> is a part with two boxes. Wire in an X ∨ Y: case one assumes X, case two assumes Y. When both boxes prove the same Z, outside you get Z.') },
      { t: T('分别打开两个框，各证一遍。', 'Open each box and prove it in each.') },
    ],
    solution: proof({
      e: ['orE', {}, {
        left: box({ m: ['mp'] }, ['q>m.imp', 'assume>m.a', 'm>out'], { sees: ['q'] }),
        right: box({ m: ['mp'] }, ['r>m.imp', 'assume>m.a', 'm>out'], { sees: ['r'] }),
      }],
    }, ['p>e.ab', 'e>goal'], { premises: ['p', 'q', 'r'] }),
    after: T('不知道是哪一种，就每一种都证一遍。这就是用掉 ∨ 的规则：证明里的「分类讨论」。', 'Not knowing which, prove it for each. That is the rule that uses up an ∨: the “case analysis” of every proof.'),
  },
  {
    id: 'bot',
    kind: 'proof',
    title: T('矛盾', 'Contradiction'),
    words: WORDS,
    symbols: ['¬', '⊥'],
    tests: [{ premises: { p: 'Locked', q: '¬Locked' }, goal: 'Moon' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE'],
    brief: T('证人说「门锁着」，又说「¬门锁着」。由这两句证出「月亮是奶酪做的」。', 'A witness says “the door is locked”, and also “¬the door is locked”. From the two, prove “the moon is made of cheese”.'),
    hint: [
      T('在二号眼里，¬门锁着 就是「门锁着 → ⊥」。它能接分离的哪个口？', 'To Mark II, ¬the door is locked is “the door is locked → ⊥”. Which input of Detach can it go into?'),
      T('得到 ⊥ 以后，用「矛盾推出一切」，卡片上选月亮那句。', 'Once you have ⊥, use “From contradiction” and choose the moon on its card.'),
    ],
    intro: [
      { t: T('一个证人先说「门锁着」，又说「门没锁」。两句不可能都对。', 'A witness says “the door was locked”, then “the door was not locked”. Both cannot be true.') },
      { t: T('<b>⊥</b> 代表矛盾：一句永远是假的话。「并非 X」写成 <b>¬X</b>，二号把它当成 X → ⊥：「X 一成立就矛盾」。所以 ¬X 配上 X，用分离就得到 ⊥。', '<b>⊥</b> stands for contradiction: a statement that is always false. “Not X” is written <b>¬X</b>, and Mark II reads it as X → ⊥: “if X held, that would be a contradiction”. So ¬X with X gives ⊥ by Detach.') },
      { t: T('<b>矛盾推出一切</b>：有了 ⊥，卡片上选什么，就能证出什么。', '<b>From contradiction, anything</b>: from ⊥, prove whatever is chosen on the card.') },
    ],
    solution: proof({ m: ['mp'], b: ['botE', { C: 'Moon' }] }, ['q>m.imp', 'p>m.a', 'm>b.bot', 'b>goal'], { premises: ['p', 'q'] }),
    after: T('证词自相矛盾，就什么都能「证」出来，连月亮是奶酪做的也行。一组前提一旦矛盾就毫无用处：这是逻辑拼命要避开矛盾的原因。', 'Contradictory testimony “proves” anything, even that the moon is made of cheese. A set of premises that contradicts itself is useless: that is why logic works so hard to avoid contradiction.'),
  },
  {
    id: 'swap',
    kind: 'proof',
    title: T('交换律', 'Commuting'),
    tests: [{ goal: 'A ∧ B → B ∧ A' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE'],
    brief: T('不用前提，证出 A ∧ B → B ∧ A。', 'With no premise, prove A ∧ B → B ∧ A.'),
    hint: [T('「两个都要」那关的证明，可以整个搬进一个框里。', 'The proof from “Both of them” can move into a box whole.')],
    intro: [
      { t: T('回到字母。「两个都要」证的是：已知下雨 ∧ 刮风，就有刮风 ∧ 下雨。换成任何两句话 A、B，都是一样的证法。', 'Back to letters. “Both of them” showed that from “it rains ∧ it is windy” you get “it is windy ∧ it rains”. With any two sentences A and B, the proof is the same.') },
      { t: T('这一次连前提都没有，要证的 A ∧ B → B ∧ A 是一句永远成立的话。目标是一个 →，那就开一个框。', 'This time there is no premise at all: A ∧ B → B ∧ A is a sentence that always holds. The goal is an →, so open a box.') },
    ],
    solution: proof({ f: ['impI', { A: 'A ∧ B' }, { body: swapBox }] }, ['f>goal']),
    after: T('有前提的证明，放进框里，就成了不要前提的<b>定理</b>：真值表上的永真式，在这里是证出来的。', 'A proof from premises, put in a box, becomes a <b>theorem</b> that needs none: a tautology from the truth tables, now proved.'),
  },
  {
    id: 'contra',
    kind: 'proof',
    title: T('逆否', 'Contrapositive'),
    tests: [{ goal: '(A → B) → (¬B → ¬A)' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE'],
    brief: T('证出 (A → B) → (¬B → ¬A)。', 'Prove (A → B) → (¬B → ¬A).'),
    hint: [
      T('三个 →，三个框，一个套一个。', 'Three →s, three boxes, one inside another.'),
      T('最里面的框假设 A，要证 ⊥。它能看见外面两个框的假设 A → B 和 ¬B。', 'The innermost box assumes A and must prove ⊥. It can see the outer boxes’ assumptions A → B and ¬B.'),
    ],
    intro: [
      { t: T('「下雨地就湿」，那么「地不湿，就没下雨」。这叫<b>逆否</b>，和 0-3 关那个错误推理不一样，它永远成立。用字母写：(A → B) → (¬B → ¬A)。', '“Rain makes the ground wet”, so “if the ground is not wet, it did not rain”. This is the <b>contrapositive</b>, and unlike the bad reasoning in level 0-3 it always holds. In letters: (A → B) → (¬B → ¬A).') },
      { t: T('框里可以再开框。里面的框看得见外面所有框的假设，像外面的前提一样用。', 'A box can open another box inside. An inner box sees the assumptions of every box around it and uses them like premises.') },
      { t: T('记住 ¬A 就是 A → ⊥：要证 ¬A，就假设 A，推出矛盾。', 'Remember ¬A is A → ⊥: to prove ¬A, assume A and reach a contradiction.') },
    ],
    solution: contra,
    after: T('三层框，5 步。「假设它，推出矛盾，所以它不成立」：这是证明里最常用的招数之一。', 'Three boxes, 5 steps. “Assume it, reach a contradiction, so it fails”: one of the most used moves in proofs.'),
  },
  {
    id: 'demorgan',
    kind: 'proof',
    title: T('德摩根', 'De Morgan'),
    tests: [{ goal: '¬(A ∨ B) → ¬A ∧ ¬B' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE'],
    brief: T('证出 ¬(A ∨ B) → ¬A ∧ ¬B。', 'Prove ¬(A ∨ B) → ¬A ∧ ¬B.'),
    hint: [T('¬A 怎么来？假设 A，看它怎样和 ¬(A ∨ B) 撞出矛盾。¬B 同理。', 'Where does ¬A come from? Assume A and see how it clashes with ¬(A ∨ B). ¬B the same way.')],
    intro: [
      { t: T('「不是周六也不是周日」和「并非（周六或周日）」说的是一回事吗？用字母写，一半是：¬(A ∨ B) → ¬A ∧ ¬B。', 'Do “neither Saturday nor Sunday” and “not (Saturday or Sunday)” say the same thing? Half of it, in letters: ¬(A ∨ B) → ¬A ∧ ¬B.') },
      { t: T('外面一个框假设 ¬(A ∨ B)；里面要拼出 ¬A ∧ ¬B，就各开一个框去证 ¬A 和 ¬B。', 'One box outside assumes ¬(A ∨ B); inside it, to build ¬A ∧ ¬B, open a box each for ¬A and ¬B.') },
    ],
    solution: deMorgan,
    after: T('这个方向不用任何花招。反过来的另一条德摩根律 ¬(A ∧ B) → ¬A ∨ ¬B，二号证不出来：要证一个 ∨，就得说出是哪一边不成立，而前提没说。', 'This direction takes no tricks. The other De Morgan law, ¬(A ∧ B) → ¬A ∨ ¬B, cannot be proved on Mark II: proving an ∨ means saying which side fails, and the premise does not say.'),
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
      T('假设 ¬(A ∨ ¬A)，然后把这个假设用两次。', 'Assume ¬(A ∨ ¬A), and then use that assumption twice.'),
    ],
    intro: [
      { t: T('A ∨ ¬A：「要么 A，要么不 A」。真值表上它每一行都真。可二号证 ∨ 只有一条路：先证出其中一边。A 和 ¬A，你一个也证不出。', 'A ∨ ¬A: “either A or not A”. It is true on every row of its table. But Mark II proves an ∨ only one way: by proving one side first, and you can prove neither A nor ¬A.') },
      { t: T('退一步：证明「否认它会导致矛盾」，也就是 ¬¬(A ∨ ¬A)。', 'Step back and prove that denying it leads to a contradiction: ¬¬(A ∨ ¬A).') },
    ],
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
    after: T('假设 ¬(A ∨ ¬A)：先由它得出 ¬A，再由 ¬A 得出 A ∨ ¬A，和它自己矛盾。二号证不出 A ∨ ¬A，却证得出「否认它会矛盾」：真值表上永真的话，二号不一定证得出。', 'Assume ¬(A ∨ ¬A): it gives ¬A, and ¬A gives A ∨ ¬A, which contradicts it. Mark II cannot prove A ∨ ¬A, but it can prove that denying it is a contradiction: not everything true on every row is provable on Mark II.'),
  },
  {
    id: 'raa',
    kind: 'proof',
    title: T('反证法', 'By contradiction'),
    tests: [{ premises: { p: '¬¬A' }, goal: 'A' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa'],
    brief: T('由 ¬¬A 证出 A。', 'From ¬¬A, prove A.'),
    hint: [T('新元件正是做这件事的。', 'The new part does exactly this.')],
    intro: [
      { t: T('上一关停在 ¬¬(A ∨ ¬A)：离 A ∨ ¬A 只差去掉两个 ¬。数学家天天这样推理：「假设它不成立，推出矛盾，所以它成立。」', 'The last level stopped at ¬¬(A ∨ ¬A): two ¬s short of A ∨ ¬A. Mathematicians reason this way every day: “suppose it fails; that is a contradiction; so it holds.”') },
      { t: T('<b>反证法</b>：由 ¬¬A 得 A。二号原本没有这条规则，现在加上它。', '<b>By contradiction</b>: from ¬¬A, A. Mark II did not have this rule; now it does.') },
    ],
    solution: proof({ r: ['raa'] }, ['p>r.nna', 'r>goal'], { premises: ['p'] }),
    after: T('不用反证法的逻辑叫<b>直觉主义逻辑</b>：每个「或」都要说出是哪一边。加上反证法就是<b>经典逻辑</b>：真值表上每一行都真的话，都证得出来。', 'Logic without proof by contradiction is called <b>intuitionistic</b>: every “or” must say which side. Add it and you have <b>classical</b> logic, where everything true on every row can be proved.'),
  },
  // Knights and knaves (a topic): on an island everyone is a knight (always tells the truth) or a knave (always lies).
  // A means “a is a knight”; what islander a says gives the premise A ↔ (what a says).
  {
    id: 'kk-one',
    kind: 'proof',
    title: T('一个岛民', 'One islander'),
    words: ISLAND,
    symbols: ['↔'],
    tests: [{ premises: { p: 'A ↔ ¬A' }, goal: '⊥' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'iffE'],
    brief: T('岛民 a 说：「我是无赖。」证明这句话不可能有人说：由「a 是骑士 ↔ ¬a 是骑士」证出 ⊥。', 'Islander a says: “I am a knave.” Prove nobody can say that: from “a is a knight ↔ ¬a is a knight”, prove ⊥.'),
    hint: [
      T('先证 ¬a 是骑士：假设 a 是骑士，会怎样？', 'Prove ¬a is a knight first: what happens if you assume a is a knight?'),
      T('框里要用「拆开 ↔」给出的 →，就从框卡片的「带进 1」口接进去。', 'To use the → that Split ↔ gives inside the box, wire it into the box card’s “in 1” port.'),
    ],
    intro: [
      { t: T('岛上的人要么是<b>骑士</b>，永远说真话；要么是<b>无赖</b>，永远说假话。', 'Everyone on the island is a <b>knight</b>, who always tells the truth, or a <b>knave</b>, who always lies.') },
      { t: T('a 说了一句话 S，就有：a 是骑士，<b>当且仅当</b> S 是真的。写成 <b>X ↔ Y</b>，意思是两个方向的 → 都成立。<b>拆开 ↔</b> 给出这两个 →。', 'If a says S, then a is a knight <b>if and only if</b> S is true. That is written <b>X ↔ Y</b>: the → holds both ways. <b>Split ↔</b> gives the two →s.') },
      { t: T('框里看得见前提和外面框的假设，可看不见外面板上别的卡片证出的东西。要用它们，从框卡片的<b>带进</b>口（带进 1、2、3）接进去，框里就多一张同名卡片。', 'Inside a box you see the premises and the outer boxes’ assumptions, but not what other cards on the outer board prove. To use those, wire them into the box card’s <b>in</b> ports (in 1, 2, 3); a card of the same name appears inside.') },
    ],
    solution: k1,
    after: T('谁都说不出「我是无赖」：骑士说不出假话，无赖说不出真话。', 'Nobody can say “I am a knave”: a knight cannot say something false, and a knave cannot say something true.'),
  },
  {
    id: 'kk-two',
    kind: 'proof',
    title: T('两个岛民', 'Two islanders'),
    words: ISLAND,
    tests: [{ premises: { p: 'A ↔ ¬A ∧ ¬B' }, goal: '¬A ∧ B' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'iffE'],
    brief: T('a 说：「我们俩都是无赖。」证出 a 是无赖、b 是骑士。', 'a says: “We are both knaves.” Prove that a is a knave and b a knight.'),
    hint: [
      T('¬a 是骑士，和上一关一样来。', '¬a is a knight comes the way it did last level.'),
      T('b 是骑士要用反证法：假设 ¬b 是骑士，a 那句话就凑齐了。', 'b being a knight takes proof by contradiction: assume ¬b is a knight, and a’s statement is complete.'),
    ],
    intro: [{ t: T('b 什么也没说。可 a 的话里提到了 b，就够推出 b 是什么人了。', 'b says nothing. But a’s statement mentions b, and that is enough to work out what b is.') }],
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
    words: ISLAND,
    tests: [{ premises: { p: 'A ↔ ¬A ∨ B' }, goal: 'A ∧ B' }],
    palette: ['impI', 'mp', 'andI', 'andE', 'orI', 'orE', 'botE', 'raa', 'iffE'],
    brief: T('a 说：「我是无赖，或者 b 是骑士。」两个人各是什么？证出「a 是骑士 ∧ b 是骑士」。', 'a says: “I am a knave, or b is a knight.” What is each of them? Prove “a is a knight ∧ b is a knight”.'),
    hint: [
      T('先证 a 是骑士：假设 ¬a 是骑士，a 的话就成了真话。', 'Prove a is a knight first: assume ¬a is a knight, and a’s statement comes true.'),
      T('有了 a 是骑士，a 的话就是真的；分情况看是哪一半。', 'With a a knight, his statement is true; split on which half of it holds.'),
    ],
    intro: [{ t: T('这一次，先自己想清楚答案，再把它证出来。', 'This time, work out the answer yourself first, then prove it.') }],
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
    after: T('两个都是骑士。如果 a 是无赖，他的话就成了真话，无赖说不出真话；所以 a 是骑士，他的话是真的，而「我是无赖」那一半是假的，只能是 b 是骑士。', 'Both are knights. If a were a knave his statement would be true, and a knave cannot say something true; so a is a knight, his statement is true, and since “I am a knave” is false, b must be a knight.'),
  },
]
