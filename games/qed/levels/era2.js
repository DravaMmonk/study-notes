// 第 2 代 · 二号：假设框。演绎定理成了身体的一部分：在框里假设一句话、证出另一句，框外就得到「如果…，那么…」。
// 每个连接词一关一个，符号到那一关才出现；骑士与无赖的专题讲岛上的人。每关是一个模式加几组测试案例（era1.js）。
import { box, proof } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })

// 交换律: A ∧ B → B ∧ A, one box around the swap.
const swapBox = box({ e: ['andE'], i: ['andI'] }, ['assume>e.ab', 'e#right>i.a', 'e#left>i.b', 'i>out'])
// 逆否: (A → B) → (¬B → ¬A), three boxes deep.
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
// 德摩根: ¬(A ∨ B) → ¬A ∧ ¬B.
const notEither = (side, other) => ['impI', { A: side }, { body: box({ i: ['orI', { other, side: side === 'A' ? 'right' : 'left' }], m: ['mp'] }, ['assume>i.a', 'f/body>m.imp', 'i>m.a', 'm>out'], { sees: ['f/body'] }) }]
const deMorgan = proof({
  f: ['impI', { A: '¬(A ∨ B)' }, { body: box({ na: notEither('A', 'B'), nb: notEither('B', 'A'), c: ['andI'] }, ['na>c.a', 'nb>c.b', 'c>out']) }],
}, ['f>goal'])
// Knights and knaves, one islander: A ↔ ¬A gives ⊥. From the left: A gives ¬A, so not A; from the right, then, A.
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
    title: T('假设一下', 'Suppose'),
    tests: [{ premises: { p: 'A → B', q: 'B → C' }, goal: 'A → C' }],
    cases: [{ A: 'Rain', B: 'Wet', C: 'Slip' }, { A: 'Alarm', B: 'Up', C: 'OnTime' }],
    hiddenCases: [{ A: 'Exam', B: 'Study', C: 'Pass' }],
    adds: ['impI'],
    brief: T('已知「下雨 → 地湿」和「地湿 → 路滑」，用假设框证出「下雨 → 路滑」。', 'Given “it rains → the ground is wet” and “the ground is wet → the road is slippery”, prove “it rains → the road is slippery” with an assumption box.'),
    hint: [
      T('框的「假设」选「下雨」，再打开框。', 'Set the box’s assumption to “it rains”, then open the box.'),
      T('框里用两次分离，从「下雨」走到「路滑」，接到「结论」。回到外面，把框接到目标。', 'Inside, Detach twice to get from “it rains” to “the road is slippery” and wire it to “Conclusion”. Back outside, wire the box to the goal.'),
    ],
    intro: [
      { t: T('还记得「接起来」吗？同样的已知、同样的目标，初号用了 5 步，还得想好怎么摆 K 和 S。可人是这样想的：「<b>假设</b>下雨。那就地湿，那就路滑。所以，下雨的话就路滑。」', 'Remember “Join them”? Same givens, same goal: Mark I took 5 steps and some thought about where K and S go. A person thinks: “<b>Suppose</b> it rains. Then the ground is wet, then the road is slippery. So if it rains, then the road is slippery.”') },
      { t: T('证明机<b>二号</b>就会这样想。它多了<b>假设框</b>：在框卡片上选要假设的话，点「打开框」走进去，里面多一张「假设」卡片；在框里证出的东西接到「结论」，回到外面，框就给出「如果 假设，那么 结论」。', 'The proof machine <b>Mark II</b> thinks that way. It has an <b>assumption box</b>: choose on the box card what to assume and press “Open box” to step inside. There you find an extra “Assume” card; wire what you prove to “Conclusion”, and back outside the box gives “if the assumption, then the conclusion”.') },
      { t: T('这正是上个专题的演绎定理，二号把它做成了身体的一部分。框里看得见外面的已知，用法和外面一样。', 'This is the deduction theorem from the last topic, built into Mark II’s body. Inside the box the givens are visible and work just as they do outside.') },
    ],
    solution: proof({ f: ['impI', { A: 'A' }, { body: box({ m1: ['mp'], m2: ['mp'] }, ['p>m1.imp', 'assume>m1.a', 'q>m2.imp', 'm1>m2.a', 'm2>out'], { sees: ['p', 'q'] }) }] }, ['f>goal'], { premises: ['p', 'q'] }),
    after: T('3 步，和脑子里的推理一模一样。框里的假设只在框里有效：框一关，它就成了结论里「如果」后面那半句，不再算已知。', 'Three steps, exactly as you would reason it out. The assumption only holds inside the box: once the box closes it becomes the “if” half of the conclusion, and no longer counts as given.'),
  },
  {
    id: 'and',
    kind: 'proof',
    title: T('两个都要', 'Both of them'),
    symbols: ['∧'],
    tests: [{ premises: { p: 'A ∧ B' }, goal: 'B ∧ A' }],
    cases: [{ A: 'Rain', B: 'Wind' }, { A: 'Hungry', B: 'Late' }],
    hiddenCases: [{ A: 'Sat', B: 'Coffee' }],
    adds: ['andI', 'andE'],
    brief: T('已知「下雨 ∧ 刮风」，证出「刮风 ∧ 下雨」。', 'Given “it rains ∧ it is windy”, prove “it is windy ∧ it rains”.'),
    hint: [T('先拆开，再按新的顺序拼起来。', 'Take it apart, then put it back together in the new order.')],
    intro: [
      { t: T('0-2 关里见过「并且」：两件事都发生，整句才真。从这一关起，「…并且…」写成 <b>∧</b>，比如「下雨 ∧ 刮风」。', 'You met “and” in level 0-2: the whole is true only when both happen. From this level on, “… and …” is written <b>∧</b>, as in “it rains ∧ it is windy”.') },
      { t: T('二号的规则成对出现：一条造出它，一条用掉它。<b>拼成 ∧</b>：有了左边，又有了右边，就有「左边 ∧ 右边」。<b>拆开 ∧</b>：从一句「… ∧ …」拆出左边，也拆出右边，它有两个输出口。', 'Mark II’s rules come in pairs: one makes a connective, one uses it up. <b>Join ∧</b>: from a left and a right, “left ∧ right”. <b>Split ∧</b>: from an “… ∧ …”, its left, and also its right; it has two outputs.') },
      { t: T('这一关不用框。', 'No box needed this time.') },
    ],
    solution: proof({ e: ['andE'], i: ['andI'] }, ['p>e.ab', 'e#right>i.a', 'e#left>i.b', 'i>goal'], { premises: ['p'] }),
    after: T('先拆后拼，换了个顺序。每个连接词都有一条造它的规则、一条用它的规则：这样的规则体系叫<b>自然演绎</b>。', 'Split, then join in the other order. Every connective has a rule that makes it and a rule that uses it: a system like that is called <b>natural deduction</b>.'),
  },
  {
    id: 'or',
    kind: 'proof',
    title: T('二选一', 'One of two'),
    symbols: ['∨'],
    tests: [{ premises: { p: 'A' }, goal: 'B ∨ A' }],
    cases: [{ A: 'Sat', B: 'Sun' }, { A: 'Bus', B: 'Bike' }],
    hiddenCases: [{ A: 'Rain', B: 'Wind' }],
    adds: ['orI'],
    brief: T('已知「今天是周六」，证出「今天是周日 ∨ 今天是周六」。', 'Given “today is Saturday”, prove “today is Sunday ∨ today is Saturday”.'),
    hint: [T('卡片上选另一边是「今天是周日」，再选它放在左边。', 'On the card, choose “today is Sunday” as the other side and put it on the left.')],
    intro: [
      { t: T('「今天是周末」的意思是：今天是周六，<b>或者</b>今天是周日。至少一个成立就行，两个都成立也算。从这一关起，「…或者…」写成 <b>∨</b>。', '“It is the weekend” means: today is Saturday, <b>or</b> today is Sunday. At least one is enough, and both count too. From this level on, “… or …” is written <b>∨</b>.') },
      { t: T('<b>引入 ∨</b>：有了一句话，「它 ∨ 随便哪句」就成立。在卡片上选另一边是哪句话，再选它放左边还是右边。', '<b>Bring in ∨</b>: from a sentence, “it ∨ any other” holds. On the card, choose the other side and whether it goes left or right.') },
    ],
    solution: proof({ i: ['orI', { other: 'B', side: 'left' }] }, ['p>i.a', 'i>goal'], { premises: ['p'] }),
    after: T('知道「今天是周六」，就知道「今天是周日 ∨ 今天是周六」。反过来不行：只知道「今天是周日 ∨ 今天是周六」，并不知道是哪一边。要用掉一个 ∨，就得分情况，下一关讲。', 'Knowing “today is Saturday”, you know “today is Sunday ∨ today is Saturday”. Not the other way round: “today is Sunday ∨ today is Saturday” does not say which side holds. Using up an ∨ takes a case split: next level.'),
  },
  {
    id: 'cases',
    kind: 'proof',
    title: T('分情况', 'Case by case'),
    tests: [{ premises: { p: 'A ∨ B', q: 'A → C', r: 'B → C' }, goal: 'C' }],
    cases: [{ A: 'Bus', B: 'Bike', C: 'OnTime' }, { A: 'Sat', B: 'Sun', C: 'Rest' }],
    hiddenCases: [{ A: 'Coffee', B: 'Tea', C: 'Awake' }],
    adds: ['orE'],
    brief: T('已知「我坐公交 ∨ 我骑车」「我坐公交 → 我准时到」「我骑车 → 我准时到」，证出「我准时到」。', 'Given “I take the bus ∨ I cycle”, “I take the bus → I arrive on time” and “I cycle → I arrive on time”, prove “I arrive on time”.'),
    hint: [
      T('把「我坐公交 ∨ 我骑车」接进分情况。', 'Wire “I take the bus ∨ I cycle” into Case by case.'),
      T('「情况一」里假设的是「我坐公交」，「情况二」里是「我骑车」。两个框都要证出「我准时到」。', 'Case one assumes “I take the bus”, case two “I cycle”. Both boxes must prove “I arrive on time”.'),
    ],
    intro: [
      { t: T('要么我坐公交，要么我骑车，还不知道是哪个。我坐公交的话，我准时到；我骑车的话，也我准时到。所以不管怎样，我准时到。', 'Either I take the bus or I cycle, and you do not know which. If I take the bus, I arrive on time; if I cycle, I arrive on time too. So either way, I arrive on time.') },
      { t: T('<b>分情况</b>是一块有两个框的元件。接进一句「… ∨ …」：「情况一」假设左边，「情况二」假设右边。两个框证出同一句话，外面就得到它。', '<b>Case by case</b> is a part with two boxes. Wire in an “… ∨ …”: case one assumes its left, case two its right. When both boxes prove the same sentence, outside you get it.') },
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
    symbols: ['¬', '⊥'],
    tests: [{ premises: { p: 'A', q: '¬A' }, goal: 'B' }],
    cases: [{ A: 'Locked', B: 'Moon' }, { A: 'Rain', B: 'Pigs' }],
    hiddenCases: [{ A: 'Bus', B: 'Moon' }],
    adds: ['botE'],
    brief: T('一个证人说「门锁着」，又说「¬门锁着」。由这两句证出「月亮是奶酪做的」。', 'A witness says “the door is locked”, and also “¬the door is locked”. From the two, prove “the moon is made of cheese”.'),
    hint: [
      T('在二号眼里，「¬门锁着」就是「门锁着 → ⊥」。它能接分离的哪个口？', 'To Mark II, “¬the door is locked” is “the door is locked → ⊥”. Which input of Detach can it go into?'),
      T('得到 ⊥ 以后，用「矛盾推出一切」，卡片上选「月亮是奶酪做的」。', 'Once you have ⊥, use “From contradiction” and choose “the moon is made of cheese” on its card.'),
    ],
    intro: [
      { t: T('一个证人先说「门锁着」，又说「并非门锁着」。两句不可能都对。', 'A witness says “the door is locked”, then “not the door is locked”. Both cannot be true.') },
      { t: T('<b>⊥</b> 代表矛盾：一句永远是假的话。「并非…」写成 <b>¬</b>，二号把「¬门锁着」当成「门锁着 → ⊥」：「门锁着一成立就矛盾」。所以它配上「门锁着」，用分离就得到 ⊥。', '<b>⊥</b> stands for contradiction: a statement that is always false. “Not …” is written <b>¬</b>, and Mark II reads “¬the door is locked” as “the door is locked → ⊥”: “if the door is locked held, that would be a contradiction”. So with “the door is locked” it gives ⊥ by Detach.') },
      { t: T('<b>矛盾推出一切</b>：有了 ⊥，卡片上选什么，就能证出什么。', '<b>From contradiction, anything</b>: from ⊥, prove whatever is chosen on the card.') },
    ],
    solution: proof({ m: ['mp'], b: ['botE', { C: 'B' }] }, ['q>m.imp', 'p>m.a', 'm>b.bot', 'b>goal'], { premises: ['p', 'q'] }),
    after: T('证词自相矛盾，就什么都能「证」出来，连「月亮是奶酪做的」也行。一组已知一旦矛盾就毫无用处：这是逻辑拼命要避开矛盾的原因。', 'Contradictory testimony “proves” anything, even “the moon is made of cheese”. A set of givens that contradicts itself is useless: that is why logic works so hard to avoid contradiction.'),
  },
  {
    id: 'swap',
    kind: 'proof',
    title: T('交换律', 'Commuting'),
    tests: [{ goal: 'A ∧ B → B ∧ A' }],
    cases: [{ A: 'Rain', B: 'Wind' }, { A: 'Hungry', B: 'Late' }],
    hiddenCases: [{ A: 'Sat', B: 'Coffee' }],
    brief: T('没有任何已知，证出「下雨 ∧ 刮风 → 刮风 ∧ 下雨」。', 'With nothing given, prove “it rains ∧ it is windy → it is windy ∧ it rains”.'),
    hint: [T('「两个都要」那关的证明，可以整个搬进一个框里：框的假设选「下雨 ∧ 刮风」。', 'The proof from “Both of them” can move into a box whole: assume “it rains ∧ it is windy”.')],
    intro: [
      { t: T('「两个都要」证的是：已知「下雨 ∧ 刮风」，就有「刮风 ∧ 下雨」。', '“Both of them” showed that from “it rains ∧ it is windy” you get “it is windy ∧ it rains”.') },
      { t: T('这一次连已知都没有，要证的「下雨 ∧ 刮风 → 刮风 ∧ 下雨」是一句永远成立的话。目标是一句「如果…那么…」，那就开一个框。', 'This time nothing is given: “it rains ∧ it is windy → it is windy ∧ it rains” is a sentence that always holds. The goal is an “if … then …”, so open a box.') },
    ],
    solution: proof({ f: ['impI', { A: 'A ∧ B' }, { body: swapBox }] }, ['f>goal']),
    after: T('有已知的证明，放进框里，就成了什么都不需要的<b>定理</b>：真值表上的永真式，在这里是证出来的。', 'A proof from givens, put in a box, becomes a <b>theorem</b> that needs nothing: a tautology from the truth tables, now proved.'),
  },
  {
    id: 'contra',
    kind: 'proof',
    title: T('逆否', 'Contrapositive'),
    tests: [{ goal: '(A → B) → (¬B → ¬A)' }],
    cases: [{ A: 'Rain', B: 'Wet' }, { A: 'Exam', B: 'Study' }],
    hiddenCases: [{ A: 'Alarm', B: 'Up' }],
    brief: T('证出「(下雨 → 地湿) → (¬地湿 → ¬下雨)」。', 'Prove “(it rains → the ground is wet) → (¬the ground is wet → ¬it rains)”.'),
    hint: [
      T('三个 →，三个框，一个套一个。', 'Three →s, three boxes, one inside another.'),
      T('最里面的框假设「下雨」，要证 ⊥。它看得见外面两个框的假设「下雨 → 地湿」和「¬地湿」。', 'The innermost box assumes “it rains” and must prove ⊥. It can see the outer boxes’ assumptions “it rains → the ground is wet” and “¬the ground is wet”.'),
    ],
    intro: [
      { t: T('「下雨，就地湿」，那么「没有地湿，就没有下雨」。这叫<b>逆否</b>，和 0-3 关那个错误推理不一样，它永远成立：「(下雨 → 地湿) → (¬地湿 → ¬下雨)」。', '“it rains gives the ground is wet”, so “no the ground is wet, no it rains”. This is the <b>contrapositive</b>, and unlike the bad reasoning in level 0-3 it always holds: “(it rains → the ground is wet) → (¬the ground is wet → ¬it rains)”.') },
      { t: T('框里可以再开框。里面的框看得见外面所有框的假设，像已知一样用。', 'A box can open another box inside. An inner box sees the assumptions of every box around it and uses them like givens.') },
      { t: T('记住「¬下雨」就是「下雨 → ⊥」：要证它，就假设「下雨」，推出矛盾。', 'Remember “¬it rains” is “it rains → ⊥”: to prove it, assume “it rains” and reach a contradiction.') },
    ],
    solution: contra,
    after: T('三层框，5 步。「假设它，推出矛盾，所以它不成立」：这是证明里最常用的招数之一。', 'Three boxes, 5 steps. “Assume it, reach a contradiction, so it fails”: one of the most used moves in proofs.'),
  },
  {
    id: 'demorgan',
    kind: 'proof',
    title: T('德摩根', 'De Morgan'),
    tests: [{ goal: '¬(A ∨ B) → ¬A ∧ ¬B' }],
    cases: [{ A: 'Sat', B: 'Sun' }, { A: 'Rain', B: 'Wind' }],
    hiddenCases: [{ A: 'Bus', B: 'Bike' }],
    brief: T('证出「¬(今天是周六 ∨ 今天是周日) → ¬今天是周六 ∧ ¬今天是周日」。', 'Prove “¬(today is Saturday ∨ today is Sunday) → ¬today is Saturday ∧ ¬today is Sunday”.'),
    hint: [T('「¬今天是周六」怎么来？假设「今天是周六」，看它怎样和「¬(今天是周六 ∨ 今天是周日)」撞出矛盾。「¬今天是周日」同理。', 'Where does “¬today is Saturday” come from? Assume “today is Saturday” and see how it clashes with “¬(today is Saturday ∨ today is Sunday)”. “¬today is Sunday” the same way.')],
    intro: [
      { t: T('「既不是今天是周六也不是今天是周日」和「并非（今天是周六或者今天是周日）」是一回事吗？一半是：「¬(今天是周六 ∨ 今天是周日) → ¬今天是周六 ∧ ¬今天是周日」。', 'Do “neither today is Saturday nor today is Sunday” and “not (today is Saturday or today is Sunday)” say the same thing? Half of it is: “¬(today is Saturday ∨ today is Sunday) → ¬today is Saturday ∧ ¬today is Sunday”.') },
      { t: T('外面一个框假设「¬(今天是周六 ∨ 今天是周日)」；里面要拼出「¬今天是周六 ∧ ¬今天是周日」，就各开一个框去证「¬今天是周六」和「¬今天是周日」。', 'One box outside assumes “¬(today is Saturday ∨ today is Sunday)”; inside it, to build “¬today is Saturday ∧ ¬today is Sunday”, open a box each for “¬today is Saturday” and “¬today is Sunday”.') },
    ],
    solution: deMorgan,
    after: T('这个方向不用任何花招。反过来的另一条德摩根律，从「并非（两个都）」到「这个不，或者那个不」，二号证不出来：要证一个 ∨，就得说出是哪一边不成立，而已知没说。', 'This direction takes no tricks. The other De Morgan law, from “not both” to “not this, or not that”, cannot be proved on Mark II: proving an ∨ means saying which side fails, and nothing given says.'),
  },
  {
    id: 'notnotlem',
    kind: 'proof',
    title: T('排中律不可否定', 'You cannot deny the excluded middle'),
    tests: [{ goal: '¬¬(A ∨ ¬A)' }],
    cases: [{ A: 'Rain' }, { A: 'Exam' }],
    hiddenCases: [{ A: 'Sat' }],
    brief: T('证出「¬¬(下雨 ∨ ¬下雨)」。', 'Prove “¬¬(it rains ∨ ¬it rains)”.'),
    hint: [
      T('直接证「下雨 ∨ ¬下雨」是不行的：你不知道该选哪一边。', 'Proving “it rains ∨ ¬it rains” directly will not work: you do not know which side to choose.'),
      T('假设「¬(下雨 ∨ ¬下雨)」，然后把这个假设用两次。', 'Assume “¬(it rains ∨ ¬it rains)”, and then use that assumption twice.'),
    ],
    intro: [
      { t: T('「下雨 ∨ ¬下雨」：要么下雨，要么没有。真值表上它每一行都真。可二号证 ∨ 只有一条路：先证出其中一边。「下雨」和「¬下雨」，你一个也证不出。', '“it rains ∨ ¬it rains”: either it rains or not. It is true on every row of its table. But Mark II proves an ∨ only one way: by proving one side first, and you can prove neither “it rains” nor “¬it rains”.') },
      { t: T('退一步：证明「否认它会导致矛盾」，也就是「¬¬(下雨 ∨ ¬下雨)」。', 'Step back and prove that denying it leads to a contradiction: “¬¬(it rains ∨ ¬it rains)”.') },
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
    after: T('假设「¬(下雨 ∨ ¬下雨)」：先由它得出「¬下雨」，再由「¬下雨」得出「下雨 ∨ ¬下雨」，和它自己矛盾。二号证不出「下雨 ∨ ¬下雨」，却证得出「否认它会矛盾」：真值表上永真的话，二号不一定证得出。', 'Assume “¬(it rains ∨ ¬it rains)”: it gives “¬it rains”, and “¬it rains” gives “it rains ∨ ¬it rains”, which contradicts it. Mark II cannot prove “it rains ∨ ¬it rains”, but it can prove that denying it is a contradiction: not everything true on every row is provable on Mark II.'),
  },
  {
    id: 'raa',
    kind: 'proof',
    title: T('反证法', 'By contradiction'),
    tests: [{ premises: { p: '¬¬A' }, goal: 'A' }],
    cases: [{ A: 'Locked' }, { A: 'Rain' }],
    hiddenCases: [{ A: 'Late' }],
    adds: ['raa'],
    brief: T('已知「¬¬门锁着」，证出「门锁着」。', 'Given “¬¬the door is locked”, prove “the door is locked”.'),
    hint: [T('新元件正是做这件事的。', 'The new part does exactly this.')],
    intro: [
      { t: T('上一关停在「否认它会矛盾」：离排中律只差去掉两个 ¬。数学家天天这样推理：「假设它不成立，推出矛盾，所以它成立。」', 'The last level stopped at “denying it is a contradiction”: two ¬s short of the excluded middle. Mathematicians reason this way every day: “suppose it fails; that is a contradiction; so it holds.”') },
      { t: T('<b>反证法</b>：由「并非并非 某句」得到那句。二号原本没有这条规则，现在加上它。', '<b>By contradiction</b>: from “not not a sentence”, the sentence. Mark II did not have this rule; now it does.') },
    ],
    solution: proof({ r: ['raa'] }, ['p>r.nna', 'r>goal'], { premises: ['p'] }),
    after: T('不用反证法的逻辑叫<b>直觉主义逻辑</b>：每个「或」都要说出是哪一边。加上反证法就是<b>经典逻辑</b>：真值表上每一行都真的话，都证得出来。', 'Logic without proof by contradiction is called <b>intuitionistic</b>: every “or” must say which side. Add it and you have <b>classical</b> logic, where everything true on every row can be proved.'),
  },
  // Knights and knaves (a topic): everyone on the island is a knight (always tells the truth) or a knave (always lies).
  // A letter is "this islander is a knight"; what an islander says gives the premise A ↔ (what is said).
  {
    id: 'kk-one',
    kind: 'proof',
    title: T('一个岛民', 'One islander'),
    symbols: ['↔'],
    tests: [{ premises: { p: 'A ↔ ¬A' }, goal: '⊥' }],
    cases: [{ A: 'KA' }, { A: 'KC' }],
    hiddenCases: [{ A: 'KB' }],
    adds: ['iffE'],
    brief: T('一个岛民说：「我是无赖。」证明这话不可能有人说：由「a 是骑士 ↔ ¬a 是骑士」证出矛盾 ⊥。', 'An islander says: “I am a knave.” Prove nobody can say that: from “a is a knight ↔ ¬a is a knight”, prove the contradiction ⊥.'),
    hint: [
      T('先证「¬a 是骑士」：假设「a 是骑士」，会怎样？', 'Prove “¬a is a knight” first: what happens if you assume “a is a knight”?'),
      T('框里要用「拆开 ↔」给出的「从左到右」，就从框卡片的「带进 1」口接进去。', 'To use the “left to right” that Split ↔ gives inside the box, wire it into the box card’s “in 1” port.'),
    ],
    intro: [
      { t: T('岛上的人要么是<b>骑士</b>，永远说真话；要么是<b>无赖</b>，永远说假话。', 'Everyone on the island is a <b>knight</b>, who always tells the truth, or a <b>knave</b>, who always lies.') },
      { t: T('一个岛民说了一句话，就有：「他是骑士」<b>当且仅当</b>他说的是真的。「…当且仅当…」写成 <b>↔</b>，意思是两个方向的 → 都成立。<b>拆开 ↔</b> 给出这两个 →。', 'If an islander says something, then “he is a knight” <b>if and only if</b> what he says is true. “… if and only if …” is written <b>↔</b>: the → holds both ways. <b>Split ↔</b> gives the two →s.') },
      { t: T('框里看得见已知和外面框的假设，可看不见外面板上别的卡片证出的东西。要用它们，从框卡片的<b>带进</b>口（带进 1、2、3）接进去，框里就多一张同名卡片。', 'Inside a box you see the givens and the outer boxes’ assumptions, but not what other cards on the outer board prove. To use those, wire them into the box card’s <b>in</b> ports (in 1, 2, 3); a card of the same name appears inside.') },
    ],
    solution: k1,
    after: T('谁都说不出「我是无赖」：骑士说不出假话，无赖说不出真话。', 'Nobody can say “I am a knave”: a knight cannot say something false, and a knave cannot say something true.'),
  },
  {
    id: 'kk-two',
    kind: 'proof',
    title: T('两个岛民', 'Two islanders'),
    tests: [{ premises: { p: 'A ↔ ¬A ∧ ¬B' }, goal: '¬A ∧ B' }],
    cases: [{ A: 'KA', B: 'KB' }, { A: 'KC', B: 'KD' }],
    hiddenCases: [{ A: 'KB', B: 'KA' }],
    brief: T('第一个岛民说：「我们俩都是无赖。」证出「¬a 是骑士 ∧ b 是骑士」。', 'The first islander says: “We are both knaves.” Prove “¬a is a knight ∧ b is a knight”.'),
    hint: [
      T('「¬a 是骑士」和上一关一样来。', '“¬a is a knight” comes the way it did last level.'),
      T('「b 是骑士」要用反证法：假设「¬b 是骑士」，第一个岛民那句话就凑齐了。', '“b is a knight” takes proof by contradiction: assume “¬b is a knight”, and the first islander’s statement is complete.'),
    ],
    intro: [{ t: T('第二个岛民什么也没说。可第一个人的话里提到了他，就够推出他是什么人了。', 'The second islander says nothing. But the first one’s statement mentions him, and that is enough to work out what he is.') }],
    solution: proof({
      e: ['iffE'],
      na: ['impI', { A: 'A' }, { body: box({ m1: ['mp'], s: ['andE'], m2: ['mp'] }, ['in1>m1.imp', 'assume>m1.a', 'm1>s.ab', 's#left>m2.imp', 'assume>m2.a', 'm2>out'], { sees: ['in1'] }) }],
      nnb: ['impI', { A: '¬B' }, { body: box({ c: ['andI'], m3: ['mp'], m4: ['mp'] }, ['in1>c.a', 'assume>c.b', 'in2>m3.imp', 'c>m3.a', 'in1>m4.imp', 'm3>m4.a', 'm4>out'], { sees: ['in1', 'in2'] }) }],
      b: ['raa'],
      both: ['andI'],
    }, ['p>e.iff', 'e#ltr>na.in1', 'na>nnb.in1', 'e#rtl>nnb.in2', 'nnb>b.nna', 'na>both.a', 'b>both.b', 'both>goal'], { premises: ['p'] }),
    after: T('第一个人不能是骑士（那他就说了假话），所以是无赖；无赖的话是假的，所以「两个都是无赖」不成立：第二个人是骑士。', 'The first cannot be a knight (he would have said something false), so he is a knave; a knave’s words are false, so “both are knaves” fails: the second is a knight.'),
  },
  {
    id: 'kk-three',
    kind: 'proof',
    title: T('骑士与无赖', 'Knights and knaves'),
    tests: [{ premises: { p: 'A ↔ ¬A ∨ B' }, goal: 'A ∧ B' }],
    cases: [{ A: 'KA', B: 'KB' }, { A: 'KC', B: 'KD' }],
    hiddenCases: [{ A: 'KD', B: 'KC' }],
    brief: T('第一个岛民说：「我是无赖，或者另一个人是骑士。」两个人各是什么？证出「a 是骑士 ∧ b 是骑士」。', 'The first islander says: “I am a knave, or the other one is a knight.” What is each of them? Prove “a is a knight ∧ b is a knight”.'),
    hint: [
      T('先证「a 是骑士」：假设「¬a 是骑士」，他的话就成了真话。', 'Prove “a is a knight” first: assume “¬a is a knight”, and his statement comes true.'),
      T('有了「a 是骑士」，他的话就是真的；分情况看是哪一半。', 'With “a is a knight”, his statement is true; split on which half of it holds.'),
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
    after: T('两个都是骑士。如果第一个人是无赖，他的话就成了真话，无赖说不出真话；所以他是骑士，他的话是真的，而「我是无赖」那一半是假的，只能是另一个人是骑士。', 'Both are knights. If the first were a knave his statement would be true, and a knave cannot say something true; so he is a knight, his statement is true, and since “I am a knave” is false, the other must be a knight.'),
  },
]
