// 第 1 代 · 初号：只有一条规则「分离」和两条公理 K、S。什么都能证，但很费劲。前半段讲下雨和地湿，到「自己推出自己」
// 换成字母 A、B、C：那一关要证的是对任何一句话都成立的事。
import { proof } from '../../kit/domains/logic/build.js'
import { WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })
const HILBERT = ['mp', 'axK', 'axS']
// A → A from K and S (1-4).
const identity = (A) => proof({
  s: ['axS', { A, B: `${A} → ${A}`, C: A }],
  k1: ['axK', { A, B: `${A} → ${A}` }],
  m1: ['mp'],
  k2: ['axK', { A, B: A }],
  m2: ['mp'],
}, ['s>m1.imp', 'k1>m1.a', 'm1>m2.imp', 'k2>m2.a', 'm2>goal'])

export const era1 = [
  {
    id: 'copy',
    kind: 'proof',
    title: T('照抄', 'Copy'),
    words: WORDS,
    tests: [{ premises: { p: 'Rain' }, goal: 'Rain' }],
    palette: [],
    solution: proof({}, ['p>goal'], { premises: ['p'] }),
    brief: T('已知「下雨」，证出「下雨」。', 'Given “it rains”, prove “it rains”.'),
    hint: [T('从前提卡片右边的圆点，连到目标卡片左边的圆点。', 'Wire the dot on the right of the premise card to the dot on the left of the goal card.')],
    intro: [
      { t: T('真值表一行一行地验，行数一多就验不完。证明换一个思路：从已经知道的事出发，一步一步推出想要的结论。每一步都按规则走，只看句子的形状，不看天气。', 'A truth table checks row by row, and with many rows it never ends. Proof works the other way: start from what you know and reach the conclusion step by step. Each step follows a rule that looks only at the shape of sentences, never at the weather.') },
      { t: T('这是证明机<b>初号</b>。左边的卡片是<b>前提</b>：已经知道的事。右边是<b>目标</b>：要证的事。板上的一根线，意思是「这件事已经证出来了」。', 'This is the proof machine <b>Mark I</b>. The cards on the left are <b>premises</b>: what you already know. The one on the right is the <b>goal</b>: what you must prove. A wire on the board means “this has been proved”.') },
      { t: T('第一关最简单：已经知道下雨了，要证的也是下雨。', 'The first level is the simplest: you know it rains, and what you must prove is that it rains.') },
    ],
    after: T('知道的事本身就是一个证明。接下来，每一块元件都是一条<b>推理规则</b>：输入口接它需要的东西，输出口给出它推出的结论。', 'What you know is already a proof. From now on each part is a <b>rule of inference</b>: its inputs take what it needs, its output gives what it concludes.'),
  },
  {
    id: 'mp',
    kind: 'proof',
    title: T('分离', 'Detach'),
    words: WORDS,
    tests: [{ premises: { p: 'Rain → Wet', q: 'Rain' }, goal: 'Wet' }],
    palette: ['mp'],
    brief: T('已知「下雨 → 地湿」和「下雨」，证出「地湿」。', 'Given “it rains → the ground is wet” and “it rains”, prove “the ground is wet”.'),
    hint: [T('分离的「如果…那么…」口接哪张前提？「前一半」口接哪张？', 'Which premise goes into Detach’s “if … then …” input, and which into its “if” part?')],
    intro: [
      { t: T('已知下雨就地湿，又知道现在下雨了。不用想也知道：地湿。证明机要把这一步变成一条规则，才能照着做。', 'You know rain makes the ground wet, and you know it is raining. Without thinking: the ground is wet. The proof machine needs this step as a rule it can follow.') },
      { t: T('<b>分离</b>：一个输入口接「如果 X，那么 Y」，另一个接它的前一半 X，输出口给出后一半 Y。这是初号唯一的推理规则。', '<b>Detach</b>: one input takes “if X, then Y”, the other its “if” part X, and out comes Y. It is Mark I’s only rule of inference.') },
      { t: T('从上面的元件栏放一块分离，把两张前提接进去，再接到目标。接错了，卡片会说它要什么、接进来的是什么。', 'Place a Detach from the row of parts above, wire both premises in, then wire it to the goal. Wire it wrong and the card says what it wanted and what it got.') },
    ],
    solution: proof({ m: ['mp'] }, ['p>m.imp', 'q>m.a', 'm>goal'], { premises: ['p', 'q'] }),
    after: T('分离把「下雨 → 地湿」里的「地湿」分了出来。它只认形状：前提要是写着「下雨 → 月亮掉下来」，它也照样分离。所以证明靠得住，前提也得靠得住。', 'Detach split “the ground is wet” off “it rains → the ground is wet”. It only looks at shape: had the premise said “it rains → the moon falls”, it would detach that just the same. A proof is only as good as its premises.'),
  },
  {
    id: 'k',
    kind: 'proof',
    title: T('多一个条件也无妨', 'An extra condition'),
    words: WORDS,
    tests: [{ premises: { p: 'Rain' }, goal: 'Wind → Rain' }],
    palette: ['mp', 'axK'],
    brief: T('已知「下雨」，证出「刮风 → 下雨」。', 'Given “it rains”, prove “it is windy → it rains”.'),
    hint: [
      T('K 的卡片上，X 选「下雨」，Y 选「刮风」。', 'On K’s card, choose “it rains” for X and “it is windy” for Y.'),
      T('然后把 K 接到分离的「如果…那么…」口，前提接「前一半」口。', 'Then wire K into Detach’s “if … then …” input and the premise into its “if” part.'),
    ],
    intro: [
      { t: T('已知下雨了。那「如果刮风，那么下雨」对不对？对：刮不刮风，雨都在下。0-2 关里你见过这个形状：「下雨 → (刮风 → 下雨)」每一行都真。', 'You know it rains. Is “if it is windy, then it rains” true? Yes: windy or not, it is raining. You met this shape in level 0-2: “it rains → (it is windy → it rains)” is true on every row.') },
      { t: T('初号把这个形状做成了<b>公理 K</b>：X → (Y → X)。公理是不用证的出发点：K 没有输入口，X、Y 换成哪句话都成立。在卡片上选出这一次的 X 和 Y。', 'Mark I makes that shape <b>axiom K</b>: X → (Y → X). An axiom is a starting point that needs no proof: K has no inputs, and it holds whatever sentences X and Y are. Choose this time’s X and Y on its card.') },
      { t: T('用 K 得到「下雨 → (刮风 → 下雨)」，再用分离把已知的「下雨」接上。', 'Use K to get “it rains → (it is windy → it rains)”, then Detach it with the “it rains” you know.') },
    ],
    solution: proof({ k: ['axK', { A: 'Rain', B: 'Wind' }], m: ['mp'] }, ['k>m.imp', 'p>m.a', 'm>goal'], { premises: ['p'] }),
    after: T('K 说的是：已经成立的事，加上什么条件都还成立。初号一共只有两条公理，下一关见第二条。', 'K says: what already holds still holds under any extra condition. Mark I has just two axioms; the next level brings the second.'),
  },
  {
    id: 'identity',
    kind: 'proof',
    title: T('自己推出自己', 'Itself from itself'),
    tests: [{ goal: 'A → A' }],
    palette: HILBERT,
    builds: 'id',
    brief: T('没有任何前提，证出 A → A。', 'With no premise at all, prove A → A.'),
    hint: [
      T('S 的结论形如 (X → Y) → (X → Z)。Y、Z 填什么，能让它最后剩下 A → A？', 'S concludes something shaped like (X → Y) → (X → Z). What Y and Z leave A → A at the end?'),
      T('试试 S 的 X 填 A，Y 填 A → A，Z 填 A；再用两次 K 喂给它。', 'Try X = A, Y = A → A, Z = A on S; then feed it with K twice.'),
    ],
    intro: [
      { t: T('0-2 关里，「下雨 → 下雨」不管天气都对；换成任何一句话也一样。要说的既然是「任何一句话」，就不再写下雨刮风，而用字母：<b>A、B、C 代表随便哪一句话</b>。', 'In level 0-2, “it rains → it rains” held whatever the weather, and it would with any sentence at all. Since this is about “any sentence”, the rain goes and letters come in: <b>A, B, C stand for any sentence you like</b>.') },
      { t: T('那就来证 A → A。看着最简单，可初号手里只有分离、K，和第二条公理 <b>S</b>：(X → (Y → Z)) → ((X → Y) → (X → Z))。S 说的是：在条件 X 之下，也能做分离。', 'So prove A → A. It looks the simplest of all, but Mark I has only Detach, K, and its second axiom <b>S</b>: (X → (Y → Z)) → ((X → Y) → (X → Z)). S says: Detach works under a condition X too.') },
      { t: T('这一关没有前提，只能从公理出发，用分离一步步凑出 A → A。公式直接在卡片上打，-> 会变成 →。', 'There is no premise: start from the axioms and Detach your way to A → A. Type formulas on the cards; -> turns into →.') },
    ],
    solution: identity('A'),
    after: T('一句一眼就对的话，要 5 步。这就是初号：规则少，什么都能证，但很费劲。好在证过一次就不必再证：你的证明现在是一块元件<b>恒等</b>，卡片上填好 A，它直接给出 A → A。', 'An obvious statement took 5 steps. That is Mark I: few rules, everything provable, all of it hard work. But a proof done once need not be done again: yours is now a part, <b>Identity</b>. Fill in A on its card and it gives A → A at once.'),
  },
  {
    id: 'chain',
    kind: 'proof',
    title: T('接起来', 'Join them'),
    words: WORDS,
    tests: [{ premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Slip' }],
    palette: HILBERT,
    builds: 'chain',
    brief: T('已知「下雨 → 地湿」和「地湿 → 路滑」，证出「下雨 → 路滑」。', 'Given “it rains → the ground is wet” and “the ground is wet → the road is slippery”, prove “it rains → the road is slippery”.'),
    hint: [
      T('K 能把「地湿 → 路滑」变成「下雨 → (地湿 → 路滑)」。', 'K can turn “the ground is wet → the road is slippery” into “it rains → (the ground is wet → the road is slippery)”.'),
      T('S 的 X、Y、Z 选下雨、地湿、路滑，它会把上一步变成「(下雨 → 地湿) → (下雨 → 路滑)」，再分离两次。', 'With X, Y, Z set to rain, wet ground and slippery road, S turns that into “(it rains → the ground is wet) → (it rains → the road is slippery)”; then Detach twice.'),
    ],
    intro: [
      { t: T('回到下雨天：下雨地就湿，地湿路就滑，所以下雨路就滑。两段「如果…那么…」首尾相接，凭直觉一步就到。', 'Back to the rain: rain makes the ground wet, a wet ground makes the road slippery, so rain makes the road slippery. Two “if … then …”s joined end to end: one step, by instinct.') },
      { t: T('可初号没有「首尾相接」这条规则，只有分离、K、S。办法是先让「地湿 → 路滑」也带上条件「下雨」，再用 S 在这个条件下做分离。', 'But Mark I has no “join end to end” rule, only Detach, K and S. The way through: first put “the ground is wet → the road is slippery” under the condition “it rains”, then let S Detach under that condition.') },
      { t: T('证出来以后，这块电路会变成元件<b>串联</b>：以后接进任何「X → Y」和「Y → Z」，它都直接给出「X → Z」。', 'Once proved, this circuit becomes the part <b>Chain</b>: wire in any “X → Y” and “Y → Z” and it gives “X → Z” at once.') },
    ],
    solution: proof({
      k: ['axK', { A: 'Wet → Slip', B: 'Rain' }],
      m1: ['mp'],
      s: ['axS', { A: 'Rain', B: 'Wet', C: 'Slip' }],
      m2: ['mp'],
      m3: ['mp'],
    }, ['k>m1.imp', 'q>m1.a', 's>m2.imp', 'm1>m2.a', 'm2>m3.imp', 'p>m3.a', 'm3>goal'], { premises: ['p', 'q'] }),
    after: T('又是 5 步。现在你有了<b>串联</b>。证过一次、之后当规则用的命题，叫<b>引理</b>。', 'Five steps again. Now you have <b>Chain</b>. A statement proved once and used as a rule from then on is a <b>lemma</b>.'),
  },
  {
    id: 'long',
    kind: 'proof',
    title: T('一长串', 'A long chain'),
    words: WORDS,
    tests: [{ premises: { p: 'Rain → Wet', q: 'Wet → Slip', r: 'Slip → Fall' }, goal: 'Rain → Fall' }],
    palette: [...HILBERT, 'id', 'chain'],
    brief: T('已知下雨地湿、地湿路滑、路滑有人摔跤，证出「下雨 → 有人摔跤」。', 'Given that rain wets the ground, a wet ground makes the road slippery and a slippery road makes someone fall, prove “it rains → someone falls”.'),
    hint: [T('你已经有串联了，用两次。', 'You already have Chain. Use it twice.')],
    intro: [
      { t: T('下雨、地湿、路滑、摔跤，一环扣一环。只用分离和公理，这要十几步。', 'Rain, wet ground, slippery road, a fall: link after link. With Detach and the axioms alone, that takes over a dozen steps.') },
      { t: T('可你已经证过「接起来」了。证过的引理就是元件，拿来就用。', 'But you have already proved how to join them. A proved lemma is a part, ready to use.') },
    ],
    solution: proof({ c1: ['chain'], c2: ['chain'] }, ['p>c1.p0', 'q>c1.p1', 'c1>c2.p0', 'r>c2.p1', 'c2>goal'], { premises: ['p', 'q', 'r'] }),
    after: T('两次串联，2 步。数学家写证明也是这样：先证几条引理，再把它们拼起来。', 'Chain twice: 2 steps. Mathematicians write proofs the same way: prove some lemmas first, then put them together.'),
  },
  {
    id: 'twice',
    kind: 'proof',
    title: T('同一个前提用两次', 'The same premise twice'),
    tests: [{ premises: { p: 'A → (A → B)' }, goal: 'A → B' }],
    palette: [...HILBERT, 'id'],
    brief: T('由 A → (A → B) 证出 A → B。', 'From A → (A → B), prove A → B.'),
    hint: [T('S 能把 A → (A → B) 变成 (A → A) → (A → B)。', 'S can turn A → (A → B) into (A → A) → (A → B).')],
    intro: [
      { t: T('「如果 A，那么（如果 A，那么 B）」：条件 A 说了两遍。直觉上，说一遍就够了。', '“If A, then (if A, then B)”: the condition A is stated twice. Surely once is enough.') },
      { t: T('能不能用分离把前提接到它自己身上？试试看，再想想 S 和恒等。', 'Can Detach feed the premise into itself? Try it, then think about S and Identity.') },
    ],
    solution: proof({ s: ['axS', { A: 'A', B: 'A', C: 'B' }], m1: ['mp'], i: ['id', { A: 'A' }], m2: ['mp'] }, ['s>m1.imp', 'p>m1.a', 'm1>m2.imp', 'i>m2.a', 'm2>goal'], { premises: ['p'] }),
    naive: proof({ m: ['mp'] }, ['p>m.imp', 'p>m.a', 'm>goal'], { premises: ['p'] }),
    after: T('前提接到自己身上不行：分离的「前一半」要的是 A，不是 A → (A → B)。S 把两个 A 合成一个，剩下的 A → A 交给恒等。', 'Feeding the premise into itself fails: Detach’s “if” part wants A, not A → (A → B). S merges the two As into one, and Identity supplies the A → A left over.'),
  },
  // The deduction theorem (a topic): a proof of C made under the hypothesis A becomes a proof of A → C, step by step.
  {
    id: 'dt-mp',
    kind: 'proof',
    title: T('这一步是分离', 'This step is Detach'),
    tests: [{ premises: { p: 'A → B', q: 'A → (B → C)' }, goal: 'A → C' }],
    palette: [...HILBERT, 'id', 'chain'],
    brief: T('在假设 A 下，有 B，也有 B → C，分离就得 C。把这一步改写成不用假设的证明：由 A → B 和 A → (B → C) 证出 A → C。', 'Under the hypothesis A there is B, and B → C, so Detach gives C. Rewrite that step without the hypothesis: from A → B and A → (B → C), prove A → C.'),
    hint: [T('在 A 之下做一次分离，从外面看就是用一次 S。', 'A Detach under A, seen from outside, is one use of S.')],
    intro: [
      { t: T('回头看「接起来」：人会说「假设下雨，那地就湿，那路就滑」。初号没有「假设」，只好让每一步都背着「下雨 →」，再用 K 和 S 一步步接。每次都这样手工搬运，太累了。', 'Look back at “Join them”: a person says “suppose it rains; then the ground is wet; then the road is slippery”. Mark I has no “suppose”, so every step has to carry “it rains →”, joined by hand with K and S. Doing that every time is exhausting.') },
      { t: T('这个专题要找一个固定的套路：任何一个在<b>假设 A</b> 下推出 C 的证明，都能一步一步改写成一个不用假设、证出 A → C 的证明。', 'This topic looks for a fixed recipe: any proof that reaches C <b>assuming A</b> can be rewritten, step by step, into a proof of A → C with no assumption.') },
      { t: T('先看一种步：分离。设想在假设 A 下已经有了 B 和 B → C，分离得 C。改写以后，B 和 B → C 都背着「A →」，结论要的是 A → C。', 'Start with one kind of step: Detach. Under the assumption A you already have B and B → C, and Detach gives C. Rewritten, B and B → C both carry “A →”, and the conclusion must be A → C.') },
    ],
    solution: proof({ s: ['axS', { A: 'A', B: 'B', C: 'C' }], m1: ['mp'], m2: ['mp'] }, ['s>m1.imp', 'q>m1.a', 'm1>m2.imp', 'p>m2.a', 'm2>goal'], { premises: ['p', 'q'] }),
    after: T('假设下的一次分离，改写成 S 加两次分离。下一关看整个证明。', 'One Detach under the hypothesis becomes S and two Detaches. Next, a whole proof.'),
  },
  {
    id: 'dt-whole',
    kind: 'proof',
    title: T('改写整个证明', 'Rewrite a whole proof'),
    tests: [{ premises: { p: 'A → (B → C)', q: 'B' }, goal: 'A → C' }],
    palette: [...HILBERT, 'id', 'chain'],
    brief: T('在假设 A 下：A → (B → C) 配上 A 得 B → C；B 是已知的；再分离得 C。把这整个证明改写成 A → C 的证明。', 'Under A: A → (B → C) with A gives B → C; B is known; Detach again gives C. Rewrite this whole proof into a proof of A → C.'),
    hint: [
      T('B 和假设 A 无关。和 A 无关的东西，怎样背上「A →」？想想 K。', 'B has nothing to do with the hypothesis A. How does something unrelated to A get an “A →” in front? Think of K.'),
      T('然后就是上一关的分离改写。', 'Then it is last level’s Detach rewrite.'),
    ],
    intro: [
      { t: T('一个证明里不只有分离，还有和假设无关的已知事实，比如这里的 B。', 'A proof has more than Detaches: it also uses known facts that have nothing to do with the hypothesis, like B here.') },
      { t: T('改写时，每一步都要背上「A →」。和 A 无关的步怎么背？分离步用上一关的办法。', 'When rewriting, every step must carry “A →”. How does a step unrelated to A carry it? The Detach steps go the way of last level.') },
    ],
    solution: proof({ k: ['axK', { A: 'B', B: 'A' }], m0: ['mp'], s: ['axS', { A: 'A', B: 'B', C: 'C' }], m1: ['mp'], m2: ['mp'] }, ['k>m0.imp', 'q>m0.a', 's>m1.imp', 'p>m1.a', 'm1>m2.imp', 'm0>m2.a', 'm2>goal'], { premises: ['p', 'q'] }),
    after: T('每一种步都有固定的改写：假设本身换成恒等，和它无关的步用 K 包一层，分离用 S。所以，能在假设 A 下推出 C，就一定能证出 A → C：这就是<b>演绎定理</b>。下一台证明机把它做成了身体的一部分。', 'Each kind of step has a fixed rewrite: the hypothesis itself becomes Identity, an unrelated step is wrapped in K, Detach goes through S. So whatever follows from the hypothesis A gives a proof of A → C: the <b>deduction theorem</b>. The next proof machine has it built in.'),
  },
]
