// Chapter 3, second half · Declarations: the kernel has Apply and the box, and no "and", "or" or "contradiction".
// A connective comes in by a declaration, the way Lean declares one (`structure And`, `inductive Or`, `inductive
// False`): its ways to make it, each a rule written with assumption cards from the tray (iso.js). Chained cards are
// one way that needs both; cards each into a way of their own are separate ways; no card wired is no way at all. The
// kernel makes a case to take it apart for every way, and each situation tests the declaration against what the
// connective means. `sentences` are what an assumption card may pick.
import { isoBoard } from '../../kit/domains/logic/iso.js'

const T = (zh, en) => ({ zh, en })
const declare = (level) => ({ kind: 'iso', ...level })

export const declarations = [
  declare({
    id: 'decl-and',
    title: T('声明「并且」', 'Declaring “and”'),
    declare: T('并且', 'and'),
    target: 'Rain ∧ Wind',
    sentences: ['Rain', 'Wind'],
    tests: [
      { have: { Rain: 1, Wind: 2 }, make: true },
      { have: { Rain: 3 }, make: false },
      { have: { Wind: 4 }, make: false },
      { have: {}, make: false },
    ],
    intro: [
      { t: T('证明核里只有套用和假设框，没有「并且」。一个新的连接词要先<wiki-ref to="declaration"></wiki-ref>：写出它有哪几种造法。每种造法是一条新规则，用假设来写：「假设下雨，再假设刮风，就得到『下雨并且刮风』」，写成规则是 ⟦下雨; 刮风⟧ ⟹ 下雨 ∧ 刮风（<wiki-ref to="rule-arrow"></wiki-ref>）。', 'The kernel has only Apply and the assumption box; there is no “and”. A new connective first needs a <wiki-ref to="declaration"></wiki-ref>: its ways to make it, written out. Each way is a new rule, written with assumptions: “assume it rains, then assume it is windy, and you have ‘it rains and it is windy’”, as a rule ⟦it rains; it is windy⟧ ⟹ it rains ∧ it is windy (<wiki-ref to="rule-arrow"></wiki-ref>).') },
      { t: T('一张假设接进另一张的「先假设」，是同一种造法要两样，顺着线先假设前一句、再假设后一句；两张假设各接一个造法口，是两种造法。造法接进连接词以后，核替每一种造法生成一个拆法，拆法取回那种造法交进去的证明。', 'An assumption wired into another’s “assumed first” is one way that needs both, assumed along the wire; two assumptions each in a way of their own are two ways. Once a way goes into the connective, the kernel makes a case for it, which gets back the proofs that way took.') },
    ],
    brief: T('「下雨，并且刮风」：两份证明都在手里，才证得出。写出它的声明。', '“It rains and it is windy”: proved only with both proofs at hand. Write its declaration.'),
    hint: [
      T('只有一种造法，要两样：拿两张假设，一张选「下雨」，一张选「刮风」，把「下雨」接进「刮风」的「先假设」。', 'One way, needing both: take two assumptions, one of “it rains” and one of “it is windy”, and wire “it rains” into the “assumed first” of “it is windy”.'),
      T('再把「刮风」接进「并且」的造法 1。', 'Then wire “it is windy” into way 1 of “and”.'),
    ],
    solution: isoBoard(['Rain>Wind', 'Wind>1']),
    naive: isoBoard(['Rain>1', 'Wind>2']),
    after: T('这一种造法就是 Lean 的 <code>And.intro</code>，拆法就是 Isabelle 的 <code>conjE</code>。拆法取回交进去的两份证明；两份不全，它就证不出。这条规则不是证出来的：「并且」原本不存在，它是新的规则本身。写成证明，它就是两层假设框，只是框里不用证，结论由声明直接给出。', 'This one way is Lean’s <code>And.intro</code>, and its case Isabelle’s <code>conjE</code>. The case gets back the two proofs handed in; without both, it is not proved. This rule was not proved: “and” did not exist before, so the rule is new in itself. Written as a proof it would be two assumption boxes, with nothing to prove inside: the declaration gives the conclusion.'),
  }),
  declare({
    id: 'decl-or',
    title: T('声明「或者」', 'Declaring “or”'),
    declare: T('或者', 'or'),
    target: 'Sat ∨ Sun',
    sentences: ['Sat', 'Sun'],
    tests: [
      { have: { Sat: 1 }, make: true },
      { have: { Sun: 2 }, make: true },
      { have: { Sat: 3, Sun: 4 }, make: true },
      { have: {}, make: false },
    ],
    brief: T('「今天是周六，或者今天是周日」：手里有其中一份证明就证得出，两份都有也行。写出它的声明。', '“Today is Saturday or today is Sunday”: proved with either proof at hand, and with both. Write its declaration.'),
    hint: [T('两种造法，各要一样：两张假设不串，各接一个造法口。', 'Two ways, each needing one: no chain, each assumption into a way of its own.')],
    solution: isoBoard(['Sat>1', 'Sun>2']),
    naive: isoBoard(['Sat>Sun', 'Sun>1']),
    after: T('两种造法，就有两个拆法：Lean 的 <code>Or.inl</code>、<code>Or.inr</code>。拿到一份「或者」的证明，不知道是哪种造法造的，只好两个拆法都准备好，看实际是哪一种就走哪一个：这就是分情况。', 'Two ways, so two cases: Lean’s <code>Or.inl</code> and <code>Or.inr</code>. Holding a proof of “or”, you do not know which way made it, so both cases stand ready, and the one it was made by is taken: that is “case by case”.'),
  }),
  declare({
    id: 'decl-bot',
    title: T('声明 ⊥', 'Declaring ⊥'),
    declare: T('矛盾', 'contradiction'),
    symbols: ['⊥'],
    target: '⊥',
    sentences: ['Rain'],
    tests: [
      { have: { Rain: 1 }, make: false },
      { have: {}, make: false },
    ],
    brief: T('矛盾 ⊥：一句不管手里有什么，都证不出来的话。写出它的声明。', 'The contradiction ⊥: a sentence that cannot be proved whatever is at hand. Write its declaration.'),
    hint: [T('怎样都证不出，就是一种造法都没有。', 'Never proved means no way to make it.')],
    solution: isoBoard([]),
    naive: isoBoard(['Rain>1']),
    after: T('一种造法都没有，就一个拆法都没有（Lean 的 <code>inductive False</code>）。用它的时候，要对每一种造法各准备一个办法，可一种都没有，所以什么都不用准备：有了矛盾，想要什么都行。至于「非」，¬A 只是「A → ⊥」的名字，是一个<wiki-ref to="definition"></wiki-ref>，不用另外声明。', 'No way to make it, so no case to take it apart (Lean’s <code>inductive False</code>). Using it means readying one move for each way, and there are none, so there is nothing to ready: from a contradiction, anything follows. As for “not”, ¬A is only a name for “A → ⊥”, a <wiki-ref to="definition"></wiki-ref>, with nothing more to declare.'),
  }),
]

// The optional topic after the three: more shapes of a declaration, each one Lean has. A way that needs three; three
// ways; the order a way takes its proofs in, which the situations cannot see (`ways`); three ways of two each, a new
// proposition and not a connective (and why "exactly one" cannot be declared); a way that needs nothing (True); a way
// whose assumptions are sentences with → in them (Iff).
const VOTE = { a1: 'AnnYes', b1: 'BoYes', b2: 'BoYes', c2: 'CyYes', a3: 'AnnYes', c3: 'CyYes' }
const IFF = { f: 'Rain → Wet', g: 'Wet → Rain' }

export const moreDeclarations = [
  declare({
    id: 'decl-three',
    title: T('三样都要', 'All three'),
    declare: T('三样都要', 'all three'),
    target: 'Rain ∧ (Wind ∧ Wet)',
    sentences: ['Rain', 'Wind', 'Wet'],
    tests: [
      { have: { Rain: 1, Wind: 2, Wet: 3 }, make: true },
      { have: { Rain: 4, Wind: 5 }, make: false },
      { have: { Rain: 6, Wet: 7 }, make: false },
      { have: { Wind: 8, Wet: 9 }, make: false },
    ],
    brief: T('「下雨、刮风、地湿，三样都要」：三份证明都在手里才证得出。写出它的声明。', '“It rains, it is windy, the ground is wet: all three”: proved only with all three proofs at hand. Write its declaration.'),
    hint: [T('一种造法，三张假设串成一串。', 'One way: three assumptions in one chain.')],
    solution: isoBoard(['Rain>Wind', 'Wind>Wet', 'Wet>1']),
    naive: isoBoard(['Rain>Wind', 'Wind>1', 'Wet>2']),
    after: T('一种造法要三样，就是 Lean 里有三个字段的 <code>structure</code>。Lean 的 <code>A ∧ B ∧ C</code> 却不另外声明：它读作 <code>A ∧ (B ∧ C)</code>，两层「并且」，拆的时候也拆两层。', 'One way needing three is a Lean <code>structure</code> with three fields. Lean’s <code>A ∧ B ∧ C</code> is not declared anew, though: it reads <code>A ∧ (B ∧ C)</code>, two “and”s, taken apart twice.'),
  }),
  declare({
    id: 'decl-or3',
    title: T('三选一', 'One of three'),
    declare: T('三选一', 'one of three'),
    target: 'Sat ∨ (Sun ∨ Holiday)',
    sentences: ['Sat', 'Sun', 'Holiday'],
    tests: [
      { have: { Sat: 1 }, make: true },
      { have: { Sun: 2 }, make: true },
      { have: { Holiday: 3 }, make: true },
      { have: {}, make: false },
    ],
    brief: T('「今天是周六、周日，或者放假」：手里有其中任何一份证明就证得出。写出它的声明。', '“Today is Saturday, Sunday, or a holiday”: proved with any one of the three proofs at hand. Write its declaration.'),
    hint: [T('三种造法，各要一样，造法口正好用满。', 'Three ways, each needing one: every way in is used.')],
    solution: isoBoard(['Sat>1', 'Sun>2', 'Holiday>3']),
    naive: isoBoard(['Sat>1', 'Sun>2']),
    after: T('三种造法，三个拆法：拿到它的证明，要对三种情况各准备一个办法。Lean 的 <code>inductive</code> 有几个构造子都行，分情况就分几支。', 'Three ways, three cases: holding its proof, you ready one move for each of the three. A Lean <code>inductive</code> may have as many constructors as it likes, and case by case splits into as many.'),
  }),
  declare({
    id: 'decl-order',
    title: T('换个顺序', 'The other order'),
    declare: T('并且', 'and'),
    target: 'Rain ∧ Wind',
    sentences: ['Rain', 'Wind'],
    ways: [['Wind', 'Rain']],
    tests: [
      { have: { Rain: 1, Wind: 2 }, make: true },
      { have: { Rain: 3 }, make: false },
      { have: { Wind: 4 }, make: false },
    ],
    brief: T('Lean 的 <code>And.intro</code> 先要「下雨」的证明，再要「刮风」的。这一关反过来，写一个先要「刮风」、再要「下雨」的声明。', 'Lean’s <code>And.intro</code> takes the proof of “it rains” first, then that of “it is windy”. Here, the other way round: write a declaration that takes “it is windy” first, then “it rains”.'),
    hint: [T('把「刮风」接进「下雨」的「先假设」。', 'Wire “it is windy” into the “assumed first” of “it rains”.')],
    solution: isoBoard(['Wind>Rain', 'Rain>1']),
    naive: isoBoard(['Rain>Wind', 'Wind>1']),
    after: T('两种顺序，每种情况下都一样证得出，所以光看情况分不出来。可规则不一样：用它造「并且」时，交证明的顺序跟着变。证明器只认写下来的那一条。', 'In every situation the two orders prove it alike, so the situations cannot tell them apart. The rules differ, though: making “and” with it, the proofs go in the other order. The prover keeps to the rule written down.'),
  }),
  declare({
    id: 'decl-two',
    title: T('至少两样', 'At least two'),
    declare: T('提案通过', 'the motion passes'),
    target: 'Motion',
    sentences: ['AnnYes', 'BoYes', 'CyYes'],
    tests: [
      { have: { AnnYes: 1, BoYes: 2 }, make: true },
      { have: { BoYes: 3, CyYes: 4 }, make: true },
      { have: { AnnYes: 5, CyYes: 6 }, make: true },
      { have: { AnnYes: 7, BoYes: 8, CyYes: 9 }, make: true },
      { have: { AnnYes: 10 }, make: false },
      { have: { CyYes: 11 }, make: false },
    ],
    brief: T('安、博、赛三人投票，至少两人同意，提案就通过。写出「提案通过」的声明。', 'Ann, Bo and Cy vote; with at least two agreeing, the motion passes. Write the declaration of “the motion passes”.'),
    hint: [T('三种造法，每种是两个人同意，两张假设串起来。同一句可以拿好几张假设。', 'Three ways, each two people agreeing, two assumptions in a chain. One sentence may be on several cards.')],
    solution: isoBoard(['a1>b1', 'b1>1', 'b2>c2', 'c2>2', 'a3>c3', 'c3>3'], VOTE),
    naive: isoBoard(['a1>b1', 'b1>1', 'b2>c2', 'c2>2'], VOTE),
    after: T('声明出来的不一定是连接词：这里是一个新命题，Lean 的 <code>inductive</code> 一样能写。换成「恰好一人同意」就写不出来了：造法只能说「有了什么就造得出」，说不了「有了什么就造不出」。', 'What is declared need not be a connective: here it is a new proposition, which a Lean <code>inductive</code> writes just as well. “Exactly one agrees” cannot be written, though: a way can only say what makes it, never what stops it.'),
  }),
  declare({
    id: 'decl-true',
    title: T('声明「真」', 'Declaring True'),
    declare: T('真', 'True'),
    target: 'Truth',
    sentences: ['Rain'],
    tray: ['hyp', 'none'],
    tests: [
      { have: {}, make: true },
      { have: { Rain: 1 }, make: true },
    ],
    brief: T('「真」：不管手里有什么，甚至什么都没有，都证得出。写出它的声明。', 'True: proved whatever is at hand, even nothing at all. Write its declaration.'),
    hint: [T('一种造法，什么都不用：把「不用假设」接进造法 1。', 'One way that needs nothing: wire “assume nothing” into way 1.')],
    solution: isoBoard(['∅>1']),
    naive: isoBoard(['Rain>1']),
    after: T('一种造法，什么都不要，就是 Lean 的 <code>True.intro</code>，常写成 ⊤。和 ⊥ 正好相反：⊥ 一种造法都没有，所以怎样都证不出；「真」有一种空造法，所以怎样都证得出。它的拆法什么都取不回：知道「真」，什么也没多知道。', 'One way needing nothing is Lean’s <code>True.intro</code>, often written ⊤. Just the opposite of ⊥: ⊥ has no way, so it is never proved; True has one empty way, so it is always proved. Its case gets nothing back: knowing True, you know nothing more.'),
  }),
  declare({
    id: 'decl-iff',
    title: T('声明「当且仅当」', 'Declaring “if and only if”'),
    declare: T('当且仅当', 'if and only if'),
    target: 'Rain ↔ Wet',
    sentences: ['Rain → Wet', 'Wet → Rain'],
    tray: ['hyp', 'none'],
    tests: [
      { have: { 'Rain → Wet': 1, 'Wet → Rain': 2 }, make: true },
      { have: { 'Rain → Wet': 3 }, make: false },
      { have: { 'Wet → Rain': 4 }, make: false },
      { have: {}, make: false },
    ],
    brief: T('「下雨当且仅当地湿」：两个方向的「若…则…」都在手里才证得出。写出它的声明。', '“It rains if and only if the ground is wet”: proved only with both “if … then …”s at hand. Write its declaration.'),
    hint: [T('假设的不必是一个字母：两张假设分别假设两个方向，串成一种造法。', 'An assumption need not be one letter: two assumptions, one for each direction, chained into one way.')],
    solution: isoBoard(['f>g', 'g>1'], IFF),
    naive: isoBoard(['f>1', 'g>2'], IFF),
    after: T('这就是 Lean 的 <code>Iff.intro</code>：先要 A → B，再要 B → A。造法的原料可以是任何句子，包括别的规则。', 'This is Lean’s <code>Iff.intro</code>: A → B first, then B → A. What a way takes may be any sentence, other rules included.'),
  }),
]
