// Chapter 15 · Structured proofs (graduation): a proof written for people to read, as Isar writes it, have … show,
// each row one card of the proof board. No new rule: by after a row is a card (a rule, a lemma) or a tactic built
// before (auto, simp, metis, induction), and a block (proof … qed) is a box: assume for an assumption box, fix for For
// any, obtain for Take the one there is. Reading first (each row's by chosen, then the same proof wired), then writing
// (a missing have, a whole proof in one line, fix, obtain), then whole proofs written from nothing.
import { proof } from '../../kit/domains/logic/build.js'
import { TERM_WORDS } from './words.js'

const T = (zh, en) => ({ zh, en })
// A script task: the rows of `given` to start from; `locked`: only each row's by may change.
const script = (task) => ({ kind: 'script', ...task })
const read = (task) => script({ step: T('读', 'Read'), locked: true, brief: T('这段脚本每一句后面的 by 还空着：选出每一句用的是哪一条规则。', 'Each row’s by is still empty in this script: choose the rule each row uses.'), ...task })
const wire = (task) => ({ kind: 'proof', step: T('接线', 'Wire'), cases: [], brief: T('照着这段脚本，在证明板上接出同一个证明。', 'Wire the same proof on the proof board, following this script.'), ...task })
const WRITE = T('写一段脚本，证明要证的那句。', 'Write a script that proves the sentence.')
const ADDER = { s: 'Sum ↔ (InA ∨ InB) ∧ ¬(InA ∧ InB)', c: 'Carry ↔ InA ∧ InB' }
const LIST_T = { list: 'nil | cons(elem, list)' }
const REV = ['app(nil, ys) = ys', 'app(cons(x, xs), ys) = cons(x, app(xs, ys))', 'rev(nil) = nil', 'rev(cons(x, xs)) = app(rev(xs), cons(x, nil))']
const NAT = ['plus(zero, y) = y', 'plus(s(x), y) = s(plus(x, y))']

// Rain makes it wet, and wet makes it slip: the opening script, and its proof wired.
const CHAIN = [
  { k: 'show', stmt: 'Rain → Wet ∧ Slip', by: 'proof' },
  { k: 'assume', stmt: 'Rain' },
  { k: 'have', stmt: 'Wet', using: ['p', 'a1'], by: 'rule:mp' },
  { k: 'have', stmt: 'Slip', using: ['q', 'h1'], by: 'rule:mp' },
  { k: 'show', stmt: 'Wet ∧ Slip', using: ['h1', 'h2'], by: 'rule:conjI' },
]
const blank = (rows) => rows.map((r) => (r.by && r.by !== 'proof' ? { ...r, by: '' } : r))
const BOXES = [
  { k: 'show', stmt: 'Rain → (Wind → Wet)', by: 'proof' },
  { k: 'assume', stmt: 'Rain' },
  { k: 'show', stmt: 'Wind → Wet', by: 'proof' },
  { k: 'assume', stmt: 'Wind' },
  { k: 'have', stmt: 'Rain ∧ Wind', using: ['a1', 'a2'], by: 'rule:conjI' },
  { k: 'show', stmt: 'Wet', using: ['p', 'h1'], by: 'rule:mp' },
]

export const structured = [
  // ---------- reading scripts ----------
  {
    id: 'sc-rows',
    title: T('一句一张卡片', 'A row is a card'),
    tasks: [
      read({
        premises: { p: 'Rain → Wet', q: 'Wet → Slip' },
        goal: 'Rain → Wet ∧ Slip',
        given: blank(CHAIN),
        answer: CHAIN,
        naive: CHAIN.map((r, k) => (k === 2 ? { ...r, by: 'rule:conjI' } : r)),
        hint: [T('「下雨」和「下雨 → 地湿」得出「地湿」，是哪一张卡片？', '“It rains” and “it rains → the ground is wet” give “the ground is wet”: which card is that?')],
      }),
      wire({
        tests: [{ premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Wet ∧ Slip' }],
        script: CHAIN,
        hint: [T('proof 到 qed 是一个假设框，assume 是框里的假设。', 'proof to qed is an assumption box, and assume is what the box assumes.')],
        solution: proof({ f: ['impI', { A: 'Rain' }], m1: ['mp', {}, 'f'], m2: ['mp', {}, 'f'], c: ['andI', {}, 'f'] }, ['p>m1.imp', 'f#body>m1.a', 'q>m2.imp', 'm1>m2.a', 'm1>c.a', 'm2>c.b', 'c>f.body', 'f>goal'], { premises: ['p', 'q'] }),
      }),
    ],
    intro: [
      { t: T('在<wiki-ref to="provers"></wiki-ref>里真正写下的证明，是一段给人读的脚本，叫<wiki-ref to="scripts"></wiki-ref>。Isabelle 的 Isar 这样写：have 先证一句，show 证出要证的那句，每一句后面 by 说它怎么来；一句话要整块来证，就写 proof … qed。', 'The proofs actually written in a <wiki-ref to="provers"></wiki-ref> are scripts for people to read: a <wiki-ref to="scripts"></wiki-ref>. Isabelle’s Isar writes them so: have proves a sentence on the way, show proves the one wanted, and by after each row says where it comes from; a sentence proved by a whole block is written proof … qed.') },
      { t: T('脚本的每一句，都是证明板上的一张卡片：using 后面是接进来的线，by 后面是哪一张卡片。', 'Each row of a script is a card of the proof board: after using are the wires coming in, after by is which card it is.') },
    ],
    after: T('by (rule mp) 就是一张套用，using 的 p、a1 是接进它的两根线；proof … qed 是一个框，assume 是框里的假设，框里最后一句 show 接到框的出口。脚本和电路是同一个证明的两种写法。', 'by (rule mp) is one Apply card, and the p and a1 after using are its two wires in; proof … qed is a box, assume what it assumes, and the show at its end goes to the box’s exit. A script and a circuit are two ways of writing one proof.'),
  },
  {
    id: 'sc-block',
    title: T('块套着块', 'Blocks in blocks'),
    tasks: [
      read({
        premises: { p: 'Rain ∧ Wind → Wet' },
        goal: 'Rain → (Wind → Wet)',
        given: blank(BOXES),
        answer: BOXES,
        naive: BOXES.map((r, k) => (k === 4 ? { ...r, by: 'rule:mp' } : r)),
        hint: [T('有了「下雨」和「刮风」，要「下雨 ∧ 刮风」。', 'With “it rains” and “it is windy”, “it rains ∧ it is windy” is wanted.')],
      }),
      wire({
        tests: [{ premises: { p: 'Rain ∧ Wind → Wet' }, goal: 'Rain → (Wind → Wet)' }],
        script: BOXES,
        hint: [T('两个框，一个套在另一个里面。', 'Two boxes, one inside the other.')],
        solution: proof({ f: ['impI', { A: 'Rain' }], g: ['impI', { A: 'Wind' }, 'f'], c: ['andI', {}, 'g'], m: ['mp', {}, 'g'] }, ['f#body>c.a', 'g#body>c.b', 'p>m.imp', 'c>m.a', 'm>g.body', 'g>f.body', 'f>goal'], { premises: ['p'] }),
      }),
    ],
    intro: [{ t: T('一个块里还能有块：块的深浅，就是框套着框。', 'A block may hold blocks: how deep a block sits is how boxes nest.') }],
    after: T('脚本往里缩一层，证明板上就多套一层框；a1 在里面那一块也能用，就像外面的框开出的线能接进里面的框。这是<level-ref to="t-lam"></level-ref>里两层 fun 的另一种写法。', 'One step further in on the script is one box further in on the board; a1 is usable inside the inner block, as a wire the outer box opens may go into the inner one. It is another way of writing the two funs of <level-ref to="t-lam"></level-ref>.'),
  },
  script({
    id: 'sc-tactic',
    title: T('by 后面是一个证明助手', 'A proof assistant after by'),
    locked: true,
    premises: ADDER,
    goal: '¬(Sum ∧ Carry)',
    given: blank([
      { k: 'show', stmt: '¬(Sum ∧ Carry)', by: 'proof' },
      { k: 'assume', stmt: 'Sum ∧ Carry' },
      { k: 'have', stmt: 'Carry', using: ['a1'], by: 'rule:conjunct2' },
      { k: 'have', stmt: 'InA ∧ InB', using: ['c', 'h1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['s', 'a1', 'h2'], by: 'metis' },
    ]),
    answer: [
      { k: 'show', stmt: '¬(Sum ∧ Carry)', by: 'proof' },
      { k: 'assume', stmt: 'Sum ∧ Carry' },
      { k: 'have', stmt: 'Carry', using: ['a1'], by: 'rule:conjunct2' },
      { k: 'have', stmt: 'InA ∧ InB', using: ['c', 'h1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['s', 'a1', 'h2'], by: 'metis' },
    ],
    naive: [
      { k: 'show', stmt: '¬(Sum ∧ Carry)', by: 'proof' },
      { k: 'assume', stmt: 'Sum ∧ Carry' },
      { k: 'have', stmt: 'Carry', using: ['a1'], by: 'rule:conjunct2' },
      { k: 'have', stmt: 'InA ∧ InB', using: ['c', 'h1'], by: 'rule:mp' },
      { k: 'show', stmt: '⊥', using: ['s', 'a1', 'h2'], by: 'rule:mp' },
    ],
    brief: T('选出每一句的 by。', 'Choose each row’s by.'),
    hint: [
      T('由等价和「进位是 1」得出两个输入都是 1，要拆开等价再套用：一张卡片不够。', 'From the equivalence and “the carry is 1” to both inputs being 1 takes splitting the equivalence, then applying: one card is not enough.'),
      T('最后一句要从三句里找矛盾。', 'The last row looks for a contradiction among three sentences.'),
    ],
    intro: [{ t: T('一句话用一张卡片证不完时，by 后面可以是一个造好的证明助手：自己的 auto、化简、重建器。它们只用规则，所以这一句照样是核证出来的。', 'When one card cannot prove a row, by may be followed by a proof assistant already built: your own auto, Simp, the reconstructor. They only use rules, so the row is proved by the kernel all the same.') }],
    after: T('结构由人写：先假设、拆出哪一半、要用哪几句；小步交给证明助手：拆等价、找矛盾。真正的证明大多是这样分工的。', 'People write the structure: what to assume, which half to take out, which facts to use; proof assistants do the small steps: taking the equivalence apart, finding the contradiction. Real proofs are mostly shared out like this.'),
  }),

  // ---------- writing scripts ----------
  {
    id: 'sc-have',
    title: T('补一句 have', 'A missing have'),
    tasks: [
      script({
        step: T('第一题', 'Problem 1'),
        brief: T('这段脚本少了一句。补上它。', 'This script is a row short. Put it in.'),
        premises: { p: 'Rain → Wet', q: 'Wet → Slip', r: 'Rain' },
        goal: 'Slip',
        given: [{ k: 'show', stmt: 'Slip', using: ['q', 'h1'], by: 'rule:mp' }],
        answer: [{ k: 'have', stmt: 'Wet', using: ['p', 'r'], by: 'rule:mp' }, { k: 'show', stmt: 'Slip', using: ['q', 'h1'], by: 'rule:mp' }],
        hint: [T('show 用的 h1 还没有。先选中第一行，再加的一行会排在它后面；要排在它前面，就把它删掉重写。', 'The h1 that show uses is not there yet. A new row goes after the row selected; to put one in front, remove the row and write it again.')],
      }),
      script({
        step: T('第二题', 'Problem 2'),
        brief: T('这段脚本少了两句。补上它们。', 'This script is two rows short. Put them in.'),
        premises: { p: 'Rain ∧ Wind', q: 'Wind → Wet', r: 'Rain → Bus' },
        goal: 'Wet ∧ Bus',
        given: [{ k: 'show', stmt: 'Wet ∧ Bus', using: ['h3', 'h4'], by: 'rule:conjI' }],
        answer: [
          { k: 'have', stmt: 'Rain', using: ['p'], by: 'rule:conjunct1' },
          { k: 'have', stmt: 'Wind', using: ['p'], by: 'rule:conjunct2' },
          { k: 'have', stmt: 'Wet', using: ['q', 'h2'], by: 'rule:mp' },
          { k: 'have', stmt: 'Bus', using: ['r', 'h1'], by: 'rule:mp' },
          { k: 'show', stmt: 'Wet ∧ Bus', using: ['h3', 'h4'], by: 'rule:conjI' },
        ],
        hint: [T('先把「下雨 ∧ 刮风」拆成两句。', 'First split “it rains ∧ it is windy” into two.')],
      }),
    ],
    intro: [{ t: T('写脚本的时候，常常先写出最后一句 show，再往前补：它要用的事实，一句一句 have 出来。', 'Writing a script, one often writes the last show first and fills in backwards: the facts it uses, one have at a time.') }],
    after: T('从要证的那句倒着往回想，正是<level-ref to="s-intro"></level-ref>里拆目标的想法；写成脚本，顺序却是正着的：先 have，后 show。', 'Thinking back from what is to be proved is the idea of taking goals apart in <level-ref to="s-intro"></level-ref>; written as a script, the order runs forward: have first, show last.'),
  },
  {
    id: 'sc-show',
    title: T('一行就够', 'One row is enough'),
    tasks: [
      script({ step: T('第一题', 'Problem 1'), brief: WRITE, premises: { p: 'Rain → Wet', q: 'Wet → Slip' }, goal: 'Rain → Slip', answer: [{ k: 'show', stmt: 'Rain → Slip', using: ['p', 'q'], by: 'auto' }], naive: [{ k: 'show', stmt: 'Rain → Slip', using: ['p', 'q'], by: 'rule:mp' }], hint: [T('用到的事实都写在 using 里，剩下的交给 auto。', 'Put the facts used after using, and leave the rest to auto.')] }),
      script({ step: T('第二题', 'Problem 2'), brief: WRITE, premises: {}, goal: '((Rain → Wet) → Rain) → Rain', answer: [{ k: 'show', stmt: '((Rain → Wet) → Rain) → Rain', by: 'metis' }], naive: [{ k: 'show', stmt: '((Rain → Wet) → Rain) → Rain', by: 'auto' }], hint: [T('<level-ref to="peirce"></level-ref>：auto 证不出来的。', '<level-ref to="peirce"></level-ref>: auto cannot prove it.')] }),
      script({ step: T('第三题', 'Problem 3'), brief: WRITE, premises: {}, goal: 'plus(s(zero), s(zero)) = s(s(zero))', consts: ['zero'], words: TERM_WORDS, defs: NAT, simp: ['def.0', 'def.1'], answer: [{ k: 'show', stmt: 'plus(s(zero), s(zero)) = s(s(zero))', by: 'simp' }], naive: [{ k: 'show', stmt: 'plus(s(zero), s(zero)) = s(s(zero))', by: 'rule:refl' }], hint: [T('这一关的化简会按加法的定义算。', 'This level’s Simp works by the definition of addition.')] }),
    ],
    intro: [{ t: T('一句话，你造的证明助手证得完，脚本里就只写这一行：show … by auto。', 'When a proof assistant you built proves a sentence outright, the script holds just that one row: show … by auto.') }],
    after: T('真正的脚本里，大半的行都是这样一行：by auto、by simp、by metis。人只在证明助手证不下去的地方，把结构写出来。', 'In real scripts most rows are one row like this: by auto, by simp, by metis. People write out structure only where the proof assistants cannot get through.'),
  },
  script({
    id: 'sc-fix',
    title: T('fix 是任取', 'fix is For any'),
    brief: WRITE,
    premises: { p: '∀x. Student(x) → Human(x)', q: '∀x. Human(x) → Mortal(x)' },
    goal: '∀x. Student(x) → Mortal(x)',
    things: ['a'],
    sentences: ['Student(a)', 'Human(a)', 'Mortal(a)', 'Student(a) → Mortal(a)'],
    answer: [
      { k: 'show', stmt: '∀x. Student(x) → Mortal(x)', by: 'proof' },
      { k: 'fix', thing: 'a' },
      { k: 'assume', stmt: 'Student(a)' },
      { k: 'have', stmt: 'Human(a)', using: ['p', 'a1'], by: 'auto' },
      { k: 'show', stmt: 'Mortal(a)', using: ['q', 'h1'], by: 'auto' },
    ],
    naive: [
      { k: 'show', stmt: '∀x. Student(x) → Mortal(x)', by: 'proof' },
      { k: 'assume', stmt: 'Student(a)' },
      { k: 'show', stmt: 'Mortal(a)', using: ['p', 'q', 'a1'], by: 'auto' },
    ],
    hint: [T('块里先 fix 一样东西，再 assume 它是学生。', 'In the block, fix a thing first, then assume it is a student.')],
    intro: [{ t: T('要证「对所有 x」，块的第一句是 fix：任取一样东西，给它起个名字。', 'To prove “for all x”, the block starts with fix: take any thing and give it a name.') }],
    after: T('fix 就是<part-ref to="part:allI"></part-ref>：块里证出的，对取来的这一样成立，它又是任取的，所以对所有的都成立。', 'fix is <part-ref to="part:allI"></part-ref>: what the block proves holds of the thing taken, and as it was taken at random, it holds of all.'),
  }),
  script({
    id: 'sc-obtain',
    title: T('obtain 拆开 ∃', 'obtain takes ∃ apart'),
    brief: WRITE,
    premises: { p: '∀x. Bird(x) → Flies(x)' },
    goal: '¬∃x. Bird(x) ∧ ¬Flies(x)',
    things: ['b'],
    sentences: ['Bird(b) ∧ ¬Flies(b)', 'Flies(b)'],
    answer: [
      { k: 'show', stmt: '¬∃x. Bird(x) ∧ ¬Flies(x)', by: 'proof' },
      { k: 'assume', stmt: '∃x. Bird(x) ∧ ¬Flies(x)' },
      { k: 'obtain', thing: 'b', stmt: 'Bird(b) ∧ ¬Flies(b)', using: ['a1'] },
      { k: 'have', stmt: 'Flies(b)', using: ['p', 'o1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['o1', 'h1'], by: 'auto' },
    ],
    naive: [
      { k: 'show', stmt: '¬∃x. Bird(x) ∧ ¬Flies(x)', by: 'proof' },
      { k: 'assume', stmt: '∃x. Bird(x) ∧ ¬Flies(x)' },
      { k: 'have', stmt: 'Flies(b)', using: ['p', 'a1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['a1', 'h1'], by: 'auto' },
    ],
    hint: [T('假设有这样一只鸟，obtain 把它拿出来，叫它 b。', 'Assume there is such a bird; obtain takes it out and calls it b.')],
    intro: [{ t: T('已知一句「存在」，obtain 把那一样东西拿出来起个名字，后面的句子都能用它。', 'Given a “there is”, obtain takes that thing out and names it, and the rows after it can use it.') }],
    after: T('obtain 就是<part-ref to="part:exE"></part-ref>：拿出来的 b 是新的名字，块的结论里不能有它。', 'obtain is <part-ref to="part:exE"></part-ref>: the b taken out is a new name, and the block’s conclusion may not mention it.'),
  }),

  // ---------- whole proofs ----------
  script({
    id: 'sc-knights',
    title: T('骑士与无赖，写成脚本', 'Knights and knaves, as a script'),
    brief: T('a 说：「b 是无赖。」c 说：「a 和 b 是同一种人。」写一段脚本，证明 c 是无赖。', 'a says: “b is a knave.” c says: “a and b are the same kind.” Write a script that proves c is a knave.'),
    premises: { a: 'KA ↔ ¬KB', c: 'KC ↔ (KA ↔ KB)' },
    goal: '¬KC',
    answer: [
      { k: 'show', stmt: '¬KC', by: 'proof' },
      { k: 'assume', stmt: 'KC' },
      { k: 'have', stmt: 'KA ↔ KB', using: ['c', 'a1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['a', 'h1'], by: 'metis' },
    ],
    naive: [{ k: 'show', stmt: '¬KC', using: ['a', 'c'], by: 'auto' }],
    hint: [
      T('假设 c 是骑士，他的话就成立。', 'Suppose c is a knight: then what he says holds.'),
      T('a 和 b 是同一种人，又一个说另一个是无赖：这个矛盾交给重建器。', 'a and b the same kind, and one calling the other a knave: hand that contradiction to the reconstructor.'),
    ],
    intro: [{ t: T('把证明写给人看：先说假设了什么，推出什么，最后矛盾在哪里；每一步交给合适的证明助手。', 'Write the proof for people: what is supposed, what follows, and where the contradiction lies; each step handed to the right proof assistant.') }],
    after: T('<level-ref to="is-silent"></level-ref>里，证明助手一行证完了它，可读不出为什么。这段脚本说出了为什么：c 要是骑士，a 和 b 就是同一种人，可 a 说 b 是无赖。', 'In <level-ref to="is-silent"></level-ref> the proof assistant proved this in one row, without saying why. This script says why: were c a knight, a and b would be the same kind, yet a calls b a knave.'),
  }),
  script({
    id: 'sc-revrev',
    title: T('倒两次，写成脚本', 'Reversed twice, as a script'),
    brief: WRITE,
    premises: {},
    goal: '∀xs. rev(rev(xs)) = xs',
    datatypes: LIST_T,
    defs: REV,
    words: TERM_WORDS,
    simp: ['def.0', 'def.1', 'def.2', 'def.3', 'revApp'],
    answer: [{ k: 'show', stmt: '∀xs. rev(rev(xs)) = xs', by: 'induct' }],
    naive: [{ k: 'show', stmt: '∀xs. rev(rev(xs)) = xs', by: 'simp' }],
    hint: [T('对 xs 归纳，每种情况化简。', 'Induction on xs, and Simp on each case.')],
    intro: [{ t: T('这一关的化简集合里有列表的定义和「倒过拼接」。', 'This level’s simp set holds the definitions of lists and “Reverse of an append”.') }],
    after: T('by (induction) simp：对 xs 归纳，每种情况化简。<level-ref to="in-revrev"></level-ref>里那个证明助手，在脚本里只占一行；它下面垫着的引理，都在化简集合里。', 'by (induction) simp: induction on xs, and Simp on each case. The proof assistant of <level-ref to="in-revrev"></level-ref> takes one row in a script; the lemmas under it are in the simp set.'),
  }),
  script({
    id: 'sc-barber',
    title: T('毕业：理发师', 'Graduation: the barber'),
    brief: T('「有一个人，给且只给不给自己刮胡子的人刮胡子。」写一段脚本，证明没有这样的人。', '“There is someone who shaves exactly those who do not shave themselves.” Write a script that proves there is no such person.'),
    premises: {},
    goal: '¬∃x. ∀y. Shaves(x, y) ↔ ¬Shaves(y, y)',
    things: ['b'],
    sentences: ['∀y. Shaves(b, y) ↔ ¬Shaves(y, y)', 'Shaves(b, b) ↔ ¬Shaves(b, b)'],
    answer: [
      { k: 'show', stmt: '¬∃x. ∀y. Shaves(x, y) ↔ ¬Shaves(y, y)', by: 'proof' },
      { k: 'assume', stmt: '∃x. ∀y. Shaves(x, y) ↔ ¬Shaves(y, y)' },
      { k: 'obtain', thing: 'b', stmt: '∀y. Shaves(b, y) ↔ ¬Shaves(y, y)', using: ['a1'] },
      { k: 'have', stmt: 'Shaves(b, b) ↔ ¬Shaves(b, b)', using: ['o1'], by: 'auto' },
      { k: 'show', stmt: '⊥', using: ['h1'], by: 'metis' },
    ],
    naive: [
      { k: 'show', stmt: '¬∃x. ∀y. Shaves(x, y) ↔ ¬Shaves(y, y)', by: 'proof' },
      { k: 'assume', stmt: '∃x. ∀y. Shaves(x, y) ↔ ¬Shaves(y, y)' },
      { k: 'show', stmt: '⊥', using: ['a1'], by: 'metis' },
    ],
    hint: [
      T('假设有这么一个人，把他拿出来，叫他 b。', 'Suppose there is such a person; take him out and call him b.'),
      T('b 给不给自己刮？', 'Does b shave himself?'),
    ],
    intro: [{ t: T('最后一段脚本，用上这台证明器的每一层：框、拿出那一个、取一个、自己的 auto、重建器。', 'A last script, using every layer of this prover: the box, take the one there is, take one, your own auto, the reconstructor.') }],
    after: T('四行脚本，每一行都落到核规则上：框是假设，obtain 拿出那一个，auto 取一个，metis 找出说谎者的矛盾。证明器从两块元件长到这里，没有一步是核不认的。', 'Four rows, each down to kernel rules: the box assumes, obtain takes the one there is, auto takes one, metis finds the liar’s contradiction. The prover grew from two parts to this, and not one step was one the kernel would not take.'),
  }),
]
