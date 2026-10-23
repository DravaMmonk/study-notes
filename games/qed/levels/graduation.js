// Chapter 10 · Graduation: the whole prover turned on the theory of computation. On the machine board, a DFA is
// defined by equations (its transitions, the run over a string, which states accept) and proved about: running in two
// parts, strings that reach the same state stay together, and the product automaton. On the proof board, the
// undecidability topic grows the liar of K1 into the diagonal argument: the barber, Cantor, the self-rejecting language
// L_s and the halting problem. The challenge is the fooling set of 0ⁿ1ⁿ, for every n and m at once.
import { machine, proof } from '../../kit/domains/logic/build.js'
import { LIST, THEORY_WORDS } from './theory.js'

const T = (zh, en) => ({ zh, en })
const chain = (cards) => machine(Object.fromEntries(cards.map((c, k) => [`c${k}`, [c]])), ['in>c0.in', ...cards.slice(1).map((_, k) => `c${k}>c${k + 1}.in`), `c${cards.length - 1}>out`])
const words = {
  ...THEORY_WORDS,
  q0: T('q₀', 'q₀'),
  q1: T('q₁', 'q₁'),
  c0: T('0', '0'),
  c1: T('1', '1'),
  delta: T('δ({0}, {1})', 'δ({0}, {1})'),
  run: T('run {0} {1}', 'run {0} {1}'),
  acc: T('acc {0}', 'acc {0}'),
  delta2: T('δ′({0}, {1})', 'δ′({0}, {1})'),
  run2: T('run′ {0} {1}', 'run′ {0} {1}'),
  pair: T('⟨{0}, {1}⟩', '⟨{0}, {1}⟩'),
  deltaP: T('δ×({0}, {1})', 'δ×({0}, {1})'),
  runP: T('run× {0} {1}', 'run× {0} {1}'),
}
// The automaton of the foundation: it accepts the strings with an even number of 1s.
const RUN = ['run(q, nil) = q', 'run(q, cons(c, w)) = run(delta(q, c), w)']
const EVEN = ['delta(q0, c0) = q0', 'delta(q0, c1) = q1', 'delta(q1, c0) = q1', 'delta(q1, c1) = q0', ...RUN, 'acc(q0) = tt', 'acc(q1) = ff']
const PRODUCT = [
  ...RUN, 'run2(q, nil) = q', 'run2(q, cons(c, w)) = run2(delta2(q, c), w)',
  'runP(r, nil) = r', 'runP(r, cons(c, w)) = runP(deltaP(r, c), w)', 'deltaP(pair(p, q), c) = pair(delta(p, c), delta2(q, c))',
]
const dfa = (level) => ({ kind: 'machine', want: 'proved', words, ...level })
const str = (cs) => cs.reduceRight((w, c) => `cons(c${c}, ${w})`, 'nil')

// The liar made bigger: from X ↔ Y and Y ↔ ¬X, the liar X ↔ ¬X, then ⊥. Its cards go in `region`.
const liarOf = (two, region) => ({
  nodes: {
    s1: ['andE', {}, region], s2: ['andE', {}, region],
    c1: ['chain', {}, region], c2: ['chain', {}, region],
    j: ['andI', {}, region], l: ['liar', {}, region],
  },
  wires: [`${two[0]}>s1.ab`, `${two[1]}>s2.ab`, 's1#left>c1.p0', 's2#left>c1.p1', 's2#right>c2.p0', 's1#right>c2.p1', 'c1>j.a', 'c2>j.b', 'j>l.p0'],
})

export const graduation = [
  dfa({
    id: 'dfa-run',
    title: T('跑一跑自动机', 'Running an automaton'),
    defs: EVEN,
    tests: [
      { eq: `acc(run(q0, ${str([1, 0, 1])})) = tt` },
      { eq: `acc(run(q0, ${str([1, 1, 1])})) = ff` },
      { eq: `run(q0, ${str([0, 1, 0])}) = q1` },
    ],
    brief: T('这台自动机有两个状态 q₀、q₁，读到 1 就换一个状态，读到 0 不动；停在 q₀ 就接受。接一台机器，把每一句算出来。', 'This automaton has two states, q₀ and q₁; reading 1 it switches, reading 0 it stays; it accepts when it ends in q₀. Wire a machine that works each out.'),
    hint: [T('化简：run 按串的样子一个字一个字地定义。', 'Simp: run is defined letter by letter, by the shape of the string.')],
    intro: [
      { t: T('最后一章，用整台证明器去证明计算理论里的事。先是<b>确定有穷自动机</b>（DFA）：状态、转移 δ、起点、哪些状态接受。', 'The last chapter: the whole prover, turned on the theory of computation. First the <b>deterministic finite automaton</b> (DFA): states, a transition δ, a start, and which states accept.') },
      { t: T('在这里，DFA 不是要搭的电路，而是用等式<b>定义</b>的对象：δ 是一张表，run q w 从 q 出发读完串 w，串就是第 9 章的列表。', 'Here a DFA is not a circuit to build but an object <b>defined</b> by equations: δ is a table, run q w reads the string w from q, and a string is a list from chapter 9.') },
    ],
    solution: chain(['simp']),
    after: T('读一个串，就是按定义化简。可「这台自动机接受的恰好是有偶数个 1 的串」说的是所有串，要证明。', 'Reading a string is simplifying by the definition. But “this automaton accepts exactly the strings with an even number of 1s” is about every string, and needs a proof.'),
  }),
  dfa({
    id: 'dfa-runApp',
    title: T('分两段跑', 'Running in two parts'),
    builds: 'runApp',
    proves: true,
    defs: [...RUN, ...LIST],
    tests: [{ eq: '∀w. ∀u. ∀q. run(q, app(w, u)) = run(run(q, w), u)' }],
    brief: T('证明读 w ++ u，就是先读 w、停在哪，再从那里读 u。这对任何 DFA 都成立：δ 是什么都行。', 'Prove that reading w ++ u is reading w first and then u from wherever that ends. This holds for any DFA, whatever δ is.'),
    hint: [T('对 w 归纳，u 和 q 都留在「对所有」里：每读一个字，起点就变了。', 'Induct on w and leave u and q under their “for all”: the start changes with each letter read.')],
    solution: chain(['induct', 'simp', 'simp']),
    naive: chain(['simp']),
    after: T('这就是 MoC 里扩展转移函数 δ̂ 的那条性质，现在是元件<b>分两段跑</b>。证明里没提 δ 是哪张表，所以对每一台 DFA 都成立。', 'This is the property of the extended transition function δ̂ from MoC, now the part <b>run in two parts</b>. The proof never said which table δ is, so it holds for every DFA.'),
  }),
  dfa({
    id: 'dfa-same',
    title: T('到了同一个状态', 'The same state'),
    defs: RUN,
    tests: [
      { eq: '∀w. run(q0, app(u, w)) = run(q0, app(v, w))', hyps: ['run(q0, u) = run(q0, v)'] },
      { eq: '∀w. run(q, app(u, w)) = run(q, app(v, w))', hyps: ['run(q, u) = run(q, v)'] },
    ],
    brief: T('两个串 u、v 读完停在同一个状态。证明之后不管再读什么 w，它们还停在同一个状态。', 'Two strings u and v end in the same state. Prove that whatever w is read next, they still end in the same state.'),
    hint: [T('先把读 u ++ w 拆成两段，已知就用得上了。', 'Split reading u ++ w in two first; then what is known applies.')],
    solution: chain(['runApp', 'simp']),
    naive: chain(['simp']),
    after: T('反过来读：只要有一个 w，让 uw 被接受、vw 不被接受，u 和 v 就一定停在不同的状态。这样的 u、v 叫<b>可区分</b>的，愚弄集就靠它。', 'Read it backwards: if some w makes uw accepted and vw not, u and v must end in different states. Such u and v are <b>distinguishable</b>, and fooling sets rest on it.'),
  }),
  dfa({
    id: 'dfa-product',
    title: T('两台一起跑', 'Two at once'),
    defs: PRODUCT,
    tests: [{ eq: '∀w. ∀p. ∀q. runP(pair(p, q), w) = pair(run(p, w), run2(q, w))' }],
    brief: T('积自动机的状态是一对 ⟨p, q⟩，两台 DFA 各走各的。证明它读完一个串，停在两台各自停下的那一对上。', 'The product automaton’s states are pairs ⟨p, q⟩, each DFA moving on its own. Prove that after a string it ends on the pair of where each of the two ends.'),
    hint: [T('对 w 归纳，p 和 q 都留着。', 'Induct on w, leaving both p and q.')],
    solution: chain(['induct', 'simp', 'simp']),
    naive: chain(['simp']),
    after: T('接受集取「两个都接受」，积自动机接受的就是两个语言的交：正则语言对交封闭。取「至少一个接受」，就是并。', 'Take “both accept” as accepting, and the product accepts the intersection of the two languages: regular languages are closed under intersection. Take “at least one accepts” for the union.'),
  }),
  // Topic: undecidability, the liar of K1 grown into the diagonal argument.
  {
    id: 'u-barber',
    kind: 'proof',
    title: T('理发师', 'The barber'),
    tests: [{ premises: { p: '∃x. ∀y. R(x, y) ↔ ¬R(y, y)' }, goal: '⊥' }],
    cases: [{ R: 'Shaves' }, { R: 'Teaches' }],
    brief: T('村里的理发师说：「我给且只给不给自己刮胡子的人刮胡子。」实现一个证明器，从「有这么一个人 x：对所有 y，x 给 y 刮胡子 ↔ y 不给自己刮」证明出矛盾 ⊥。', 'The village barber says: “I shave exactly those who do not shave themselves.” Build a prover that, from “there is an x such that for every y, x shaves y ↔ y does not shave himself”, proves the contradiction ⊥.'),
    hint: [
      T('拿出那个理发师，再问：他给不给自己刮？', 'Take the barber out, then ask: does he shave himself?'),
      T('把 y 取成理发师自己，就是<level-ref to="kk-one"></level-ref>的说谎者。', 'Take y to be the barber himself, and it is the liar of <level-ref to="kk-one"></level-ref>.'),
    ],
    intro: [{ t: T('<level-ref to="kk-one"></level-ref>里，岛民说「我是无赖」，推出了矛盾，造出了<b>说谎者</b>。这个专题把它一步步长大，最后长成停机问题。', 'In <level-ref to="kk-one"></level-ref> an islander said “I am a knave” and it gave a contradiction: the <b>liar</b>. This topic grows it step by step into the halting problem.') }],
    solution: proof({ f: ['exE', { x: 'z' }], a: ['allE', { t: 'z' }, 'f'], l: ['liar', {}, 'f'] }, ['p>f.ex', 'f#body>a.all', 'a>l.p0', 'l>f.body', 'f>goal'], { premises: ['p'] }),
    after: T('「对所有 y」里的 y 取成 x 自己，叫<b>对角线</b>：一张 x 对 y 的表，只看 x 对 x 的那条斜线。理发师说的话套到自己身上，就成了说谎者。', 'Taking the y of “for every y” to be x itself is the <b>diagonal</b>: in a table of x against y, look only at the line of x against x. Turned on himself, the barber’s rule is the liar.'),
  },
  {
    id: 'u-cantor',
    kind: 'proof',
    title: T('康托尔', 'Cantor'),
    tests: [{ premises: { s: '∀z. ∃x. ∀y. P(y, f(x)) ↔ P(y, z)', d: '∃z. ∀y. P(y, z) ↔ ¬P(y, f(y))' }, goal: '⊥' }],
    cases: [{ P: 'In' }],
    brief: T('f 给每个 x 配一个集合 f(x)。已知每个集合都是某个 f(x)（f 是满射）；又有一个集合 z，装的正好是不属于 f(y) 的那些 y。实现一个证明器，推出矛盾 ⊥。', 'f gives each x a set f(x). Every set is some f(x) (f is onto); and there is a set z holding exactly the y not in f(y). Build a prover that gets the contradiction ⊥.'),
    hint: [
      T('先拿出 z，再拿出那个让 f(x) 和 z 一样的 x，然后都取 y = x。', 'Take out z, then the x whose f(x) is z, then take y = x in both.'),
      T('得到 X ↔ Y 和 Y ↔ ¬X：两个都拆开，用串联接成 X → ¬X 和 ¬X → X，再拼起来就是说谎者。', 'You get X ↔ Y and Y ↔ ¬X: split both, chain them into X → ¬X and ¬X → X, and joined that is the liar.'),
    ],
    solution: (() => {
      const l = liarOf(['a2', 'a3'], 'e2')
      return proof({
        e1: ['exE', { x: 'z' }], a1: ['allE', { t: 'z' }, 'e1'], e2: ['exE', { x: 'x' }, 'e1'],
        a2: ['allE', { t: 'x' }, 'e2'], a3: ['allE', { t: 'x' }, 'e2'], ...l.nodes,
      }, ['d>e1.ex', 's>a1.all', 'a1>e2.ex', 'e2#body>a2.all', 'e1#body>a3.all', ...l.wires, 'l>e2.body', 'e2>e1.body', 'e1>goal'], { premises: ['s', 'd'] })
    })(),
    naive: proof({ e1: ['exE', { x: 'z' }], a3: ['allE', { t: 'z' }, 'e1'], l: ['liar', {}, 'e1'] }, ['d>e1.ex', 'e1#body>a3.all', 'a3>l.p0', 'l>e1.body', 'e1>goal'], { premises: ['s', 'd'] }),
    after: T('没有一个 f 能把一个集合的元素和它的所有子集一一对上：子集总是更多。这是康托尔的定理，对角线用在了函数上。', 'No f can match the elements of a set with all its subsets: there are always more subsets. That is Cantor’s theorem, the diagonal turned on functions.'),
  },
  {
    id: 'u-ls',
    kind: 'proof',
    title: T('不接受自己的程序', 'Programs that reject themselves'),
    tests: [{ premises: { r: '∃x. ∀y. M(x, c(y)) ↔ L(c(y))', ls: '∀y. L(c(y)) ↔ ¬M(y, c(y))' }, goal: '⊥' }],
    cases: [{ M: 'Accepts', L: 'Ls' }],
    brief: T('⟨y⟩ 是图灵机 y 的编码。L_s 装的是不接受自己编码的机器的编码。实现一个证明器：假设有一台机器 x 识别 L_s，推出矛盾 ⊥。', '⟨y⟩ is the code of the Turing machine y. L_s holds the codes of machines that do not accept their own code. Build a prover: supposing some machine x recognises L_s, get the contradiction ⊥.'),
    hint: [T('还是对角线：让 x 读它自己的编码。', 'The diagonal again: let x read its own code.')],
    solution: (() => {
      const l = liarOf(['a1', 'a2'], 'e')
      return proof({ e: ['exE', { x: 'z' }], a1: ['allE', { t: 'z' }, 'e'], a2: ['allE', { t: 'z' }, 'e'], ...l.nodes }, ['r>e.ex', 'e#body>a1.all', 'ls>a2.all', ...l.wires, 'l>e.body', 'e>goal'], { premises: ['r', 'ls'] })
    })(),
    after: T('程序可以把程序当输入，所以对角线也能用在程序上：L_s 连识别都识别不了（MoC 12）。', 'Programs can take programs as input, so the diagonal works on programs too: L_s cannot even be recognised (MoC 12).'),
  },
  {
    id: 'u-halt',
    kind: 'proof',
    title: T('停机问题', 'The halting problem'),
    tests: [{ premises: { con: '(∃x. H(x)) → ∃x. ∀y. T(x, c(y)) ↔ ¬T(y, c(y))', red: '(∃x. G(x)) → ∃x. H(x)' }, goal: '¬∃x. G(x)' }],
    cases: [{ H: 'DecH', G: 'DecA', T: 'Halts' }],
    brief: T('已知：要是有判定停机的机器，就能造出一台 x，它在 ⟨y⟩ 上停机恰好当 y 在 ⟨y⟩ 上不停机；要是有判定 A_TM 的机器，就能造出判定停机的机器。实现一个证明器，证明没有机器判定 A_TM。', 'Given: if some machine decides halting, a machine x can be built that halts on ⟨y⟩ exactly when y does not halt on ⟨y⟩; and if some machine decides A_TM, one deciding halting can be built. Build a prover that proves no machine decides A_TM.'),
    hint: [
      T('假设有判定 A_TM 的机器，一路套用到造出那台 x。', 'Assume a machine deciding A_TM, and apply all the way to the machine x.'),
      T('拿出 x，让它读自己的编码。', 'Take out x and let it read its own code.'),
    ],
    solution: proof({
      h: ['impI', { A: '∃x. G(x)' }], m1: ['mp', {}, 'h'], m2: ['mp', {}, 'h'],
      e: ['exE', { x: 'z' }, 'h'], a: ['allE', { t: 'z' }, 'e'], l: ['liar', {}, 'e'],
    }, ['red>m1.imp', 'h#body>m1.a', 'con>m2.imp', 'm1>m2.a', 'm2>e.ex', 'e#body>a.all', 'a>l.p0', 'l>e.body', 'e>h.body', 'h>goal'], { premises: ['con', 'red'] }),
    after: T('假设判定器存在，造出一台和它作对的机器，让它读自己：对角线。再用<b>归约</b>把一个问题的不可判定，传给另一个。从「我是无赖」走到这里，用的一直是同一个说谎者。', 'Suppose a decider exists, build a machine that defies it, and let it read itself: the diagonal. Then a <b>reduction</b> passes undecidability from one problem to another. From “I am a knave” to here, it was the same liar all along.'),
  },
  // Challenge: a fooling set for 0ⁿ1ⁿ, every pair at once.
  {
    id: 'fooling',
    kind: 'proof',
    title: T('愚弄集', 'A fooling set'),
    tests: [{
      premises: {
        a: '∀u. ∀v. ∀w. S(u, v) → S(cat(u, w), cat(v, w))',
        b: '∀u. ∀v. S(u, v) → K(u) → K(v)',
        c: '∀n. K(cat(zs(n), os(n)))',
        d: '∀n. ∀m. L(n, m) → ¬K(cat(zs(m), os(n)))',
      },
      goal: '∀n. ∀m. L(n, m) → ¬S(zs(n), zs(m))',
    }],
    cases: [{ S: 'Same', K: 'Acc', L: 'Less' }],
    brief: T('一台 DFA 认 0ⁿ1ⁿ。已知：停在同一个状态的串，接上同一个尾巴还停在一起（<level-ref to="dfa-same"></level-ref>）；停在同一个状态，接受就一起接受；0ⁿ1ⁿ 被接受；n < m 时 0ᵐ1ⁿ 不被接受。证明对所有 n < m，0ⁿ 和 0ᵐ 停在不同的状态。', 'A DFA recognises 0ⁿ1ⁿ. Given: strings ending in the same state stay together after the same tail (<level-ref to="dfa-same"></level-ref>); in the same state, one is accepted when the other is; 0ⁿ1ⁿ is accepted; and with n < m, 0ᵐ1ⁿ is not. Prove that for all n < m, 0ⁿ and 0ᵐ end in different states.'),
    hint: [
      T('先任取 n、m，假设 n < m，再假设 0ⁿ 和 0ᵐ 停在一起，推出矛盾。', 'For any n and m, assume n < m, then assume 0ⁿ and 0ᵐ end together, and get a contradiction.'),
      T('尾巴取 1ⁿ。', 'Take 1ⁿ as the tail.'),
    ],
    solution: proof({
      g1: ['allI', { x: 'n' }], g2: ['allI', { x: 'm' }, 'g1'], h1: ['impI', { A: 'L(n, m)' }, 'g2'], h2: ['impI', { A: 'S(zs(n), zs(m))' }, 'h1'],
      a1: ['allE', { t: 'zs(n)' }, 'h2'], a2: ['allE', { t: 'zs(m)' }, 'h2'], a3: ['allE', { t: 'os(n)' }, 'h2'], m1: ['mp', {}, 'h2'],
      b1: ['allE', { t: 'cat(zs(n), os(n))' }, 'h2'], b2: ['allE', { t: 'cat(zs(m), os(n))' }, 'h2'], m2: ['mp', {}, 'h2'],
      c1: ['allE', { t: 'n' }, 'h2'], m3: ['mp', {}, 'h2'],
      d1: ['allE', { t: 'n' }, 'h2'], d2: ['allE', { t: 'm' }, 'h2'], m4: ['mp', {}, 'h2'], m5: ['mp', {}, 'h2'],
    }, [
      'a>a1.all', 'a1>a2.all', 'a2>a3.all', 'a3>m1.imp', 'h2#body>m1.a',
      'b>b1.all', 'b1>b2.all', 'b2>m2.imp', 'm1>m2.a',
      'c>c1.all', 'm2>m3.imp', 'c1>m3.a',
      'd>d1.all', 'd1>d2.all', 'd2>m4.imp', 'h1#body>m4.a', 'm4>m5.imp', 'm3>m5.a',
      'm5>h2.body', 'h2>h1.body', 'h1>g2.body', 'g2>g1.body', 'g1>goal',
    ], { premises: ['a', 'b', 'c', 'd'] }),
    // The argument for one n and m, never taken for all of them.
    naive: proof({
      h1: ['impI', { A: 'L(n, m)' }], h2: ['impI', { A: 'S(zs(n), zs(m))' }, 'h1'],
      a1: ['allE', { t: 'zs(n)' }, 'h2'], a2: ['allE', { t: 'zs(m)' }, 'h2'], a3: ['allE', { t: 'os(n)' }, 'h2'], m1: ['mp', {}, 'h2'],
      b1: ['allE', { t: 'cat(zs(n), os(n))' }, 'h2'], b2: ['allE', { t: 'cat(zs(m), os(n))' }, 'h2'], m2: ['mp', {}, 'h2'],
      c1: ['allE', { t: 'n' }, 'h2'], m3: ['mp', {}, 'h2'],
      d1: ['allE', { t: 'n' }, 'h2'], d2: ['allE', { t: 'm' }, 'h2'], m4: ['mp', {}, 'h2'], m5: ['mp', {}, 'h2'],
    }, [
      'a>a1.all', 'a1>a2.all', 'a2>a3.all', 'a3>m1.imp', 'h2#body>m1.a',
      'b>b1.all', 'b1>b2.all', 'b2>m2.imp', 'm1>m2.a',
      'c>c1.all', 'm2>m3.imp', 'c1>m3.a',
      'd>d1.all', 'd1>d2.all', 'd2>m4.imp', 'h1#body>m4.a', 'm4>m5.imp', 'm3>m5.a',
      'm5>h2.body', 'h2>h1.body', 'h1>goal',
    ], { premises: ['a', 'b', 'c', 'd'] }),
    after: T('0、00、000…… 两两停在不同的状态，所以状态要无穷多个：没有 DFA 认得出 0ⁿ1ⁿ，它不是正则语言。只证一对是不够的：两个状态的 DFA 也能把一对分开。', '0, 00, 000 … all end in different states from one another, so infinitely many states are needed: no DFA recognises 0ⁿ1ⁿ, and it is not regular. One pair is not enough: a two-state DFA can tell one pair apart.'),
  },
]
