// Chapter 3, second half · Declarations: the kernel has Apply and the box, and no "and", "or" or "contradiction";
// definitions only name what those two prove, so a connective has to come in another way. It comes in by a
// declaration: its ways to make it, each a rule written with assumption cards from the tray (iso.js). Chained cards are
// one way that needs both; cards each into a way of their own are separate ways; no card wired is no way at all. Each
// situation tests the declaration against what the connective means. `sentences` are what an assumption card may pick.
//
// What takes it apart is not written: the ways in are all the ways there are, so its elimination rule is made from
// them (iso.js declaredRules), as Lean and Isabelle make it, and the pass text says so. Passing a declaration brings in
// its ways in and its elimination rule as proof-board parts (`adds`), which chapter 4 puts to work. Chapter 12 has the
// player build the machine that makes it (the elimination rule generator).
import { isoBoard } from '../../kit/domains/logic/iso.js'
import { TERM_WORDS } from './words.js'
import { machine } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })
const declare = (level) => ({ kind: 'iso', ...level })
// The generator's tests: declarations, their letters metavariables, each its sentence, its ways in and the
// elimination rule they make, which concludes any ?R (elimgen.js).
const DECLS = {
  and: { it: '?A ∧ ?B', ways: ['⟦?A; ?B⟧ ⟹ ?A ∧ ?B'], elim: ['?A ∧ ?B', '⟦?A; ?B⟧ ⟹ ?R'] },
  three: { it: '?A ∧ (?B ∧ ?C)', ways: ['⟦?A; ?B; ?C⟧ ⟹ ?A ∧ (?B ∧ ?C)'], elim: ['?A ∧ (?B ∧ ?C)', '⟦?A; ?B; ?C⟧ ⟹ ?R'] },
  iff: { it: '?A ↔ ?B', ways: ['⟦?A → ?B; ?B → ?A⟧ ⟹ ?A ↔ ?B'], elim: ['?A ↔ ?B', '⟦?A → ?B; ?B → ?A⟧ ⟹ ?R'] },
  truth: { it: 'Truth', ways: ['Truth'], elim: ['Truth', '?R'] },
  or: { it: '?A ∨ ?B', ways: ['⟦?A⟧ ⟹ ?A ∨ ?B', '⟦?B⟧ ⟹ ?A ∨ ?B'], elim: ['?A ∨ ?B', '⟦?A⟧ ⟹ ?R', '⟦?B⟧ ⟹ ?R'] },
  oneOfThree: { it: '?A ∨ (?B ∨ ?C)', ways: ['⟦?A⟧ ⟹ ?A ∨ (?B ∨ ?C)', '⟦?B⟧ ⟹ ?A ∨ (?B ∨ ?C)', '⟦?C⟧ ⟹ ?A ∨ (?B ∨ ?C)'], elim: ['?A ∨ (?B ∨ ?C)', '⟦?A⟧ ⟹ ?R', '⟦?B⟧ ⟹ ?R', '⟦?C⟧ ⟹ ?R'] },
  bot: { it: '⊥', ways: [], elim: ['⊥'] },
  ex: { it: '∃y. ?P(y)', ways: ['⋀x. ⟦?P(x)⟧ ⟹ ∃y. ?P(y)'], elim: ['∃y. ?P(y)', '⋀x. ⟦?P(x)⟧ ⟹ ?R'] },
  nat: { it: 'Nat', ways: ['Nat', '⟦Nat⟧ ⟹ Nat'], elim: ['Nat', '?R', '⟦Nat⟧ ⟹ ?R'] },
  two: { it: 'Motion', ways: ['⟦AnnYes; BoYes⟧ ⟹ Motion', '⟦BoYes; CyYes⟧ ⟹ Motion', '⟦AnnYes; CyYes⟧ ⟹ Motion'], elim: ['Motion', '⟦AnnYes; BoYes⟧ ⟹ ?R', '⟦BoYes; CyYes⟧ ⟹ ?R', '⟦AnnYes; CyYes⟧ ⟹ ?R'] },
}
const RULECRAFT = ['anyR', 'swapConcl', 'consFront', 'mkRule']
const generator = (level) => ({
  kind: 'machine',
  want: 'elim',
  inputs: [{ name: 'it', label: T('它', 'It') }, { name: 'ways', label: level.single ? T('引入规则', 'Intro rule') : T('引入规则（一串）', 'Intro rules (a list)') }],
  ...level,
})
// The generator for a list of ways in: each one's conclusion put as ?R, inside For each; the declared sentence first.
const GENERATOR = machine({ r: ['anyR'], e: ['eachOf'], s: ['swapConcl', {}, 'e'], c: ['consFront'], m: ['mkRule'] }, ['ways>e.in', 'e#body>s.rule', 'r>s.to', 's>e.body', 'it>c.first', 'e>c.rest', 'c>m.premises', 'r>m.conclusion', 'm>out'], { inputs: ['it', 'ways'] })

export const declarations = [
  declare({
    id: 'decl-and',
    // What declaring it gives: its way to make it and the elimination rule made from it, parts of the proof board from
    // here on.
    adds: ['andI', 'andE'],
    title: T('声明「并且」', 'Declaring “and”'),
    declare: T('并且', 'and'),
    target: 'Rain ∧ Wind',
    sentences: ['Rain', 'Wind'],
    tests: [
      { have: { Rain: 1, Wind: 2 }, make: true },
      { have: { Rain: 3 }, make: false },
      { have: { Wind: 4 }, make: false },
      { have: {}, make: false },
      { get: 'Rain', make: true },
      { get: 'Wind', make: true },
      { get: 'Wet', make: false },
      { holds: ['Rain → (Wind → Wet)'], get: 'Wet', make: true },
    ],
    intro: [
      { t: T("串联、交换、合并、K 和 S 都是用已有规则证明并封装的<wiki-ref to=\"definition\"></wiki-ref>。展开这些封装即可回到原来的证明。现在要表达「下雨并且刮风」，证明核还需要认识新的连接词及其规则。", "Chain, Swap, Merge, K and S are named <wiki-ref to=\"definition\"></wiki-ref>s of proofs built from existing rules. Unfolding them recovers those proofs. To express “it rains and it is windy”, the kernel needs to recognize a new connective and its rules.") },
      { t: T("要引入「并且」，先建立一项<wiki-ref to=\"declaration\"></wiki-ref>，说明何时能证明合取：分别有「下雨」和「刮风」的证明时，可得到「下雨 ∧ 刮风」。将这条<b>引入规则</b>写作 ⟦下雨; 刮风⟧ ⟹ 下雨 ∧ 刮风（<wiki-ref to=\"rule-arrow\"></wiki-ref>）。", "To introduce “and”, first make a <wiki-ref to=\"declaration\"></wiki-ref> specifying when a conjunction can be proved: proofs of “it rains” and “it is windy” yield “it rains ∧ it is windy”. Write this <b>introduction rule</b> as ⟦it rains; it is windy⟧ ⟹ it rains ∧ it is windy (<wiki-ref to=\"rule-arrow\"></wiki-ref>).") },
      { t: T("从托盘放置假设卡，并在每张卡上选择命题。需要两个前提时，将两张卡通过「先假设」连接，再接到引入规则端口。下方第一张表格展示不同的可用证明组合，供你检查声明；第二张表格是用它：手里有「下雨 ∧ 刮风」时推得出什么，地湿代表任意别的一句话。", "Place assumption cards from the tray and select a proposition on each. When a rule has two premises, connect the cards through “Assumed first”, then connect them to the introduction-rule port. The first table below shows combinations of available proofs for checking the declaration; the second uses it: what follows with “it rains ∧ it is windy” at hand, the ground being wet standing for any other sentence.") },
    ],
    brief: T('「下雨，并且刮风」：两份证明都在手里，才证得出。写出它的声明。', '“It rains and it is windy”: proved only with both proofs at hand. Write its declaration.'),
    hint: [
      T('只有一条引入规则，要两样：拿两张假设，一张选「下雨」，一张选「刮风」，把「下雨」接进「刮风」的「先假设」。', 'One way, needing both: take two assumptions, one of “it rains” and one of “it is windy”, and wire “it rains” into the “assumed first” of “it is windy”.'),
      T('再把「刮风」接进「并且」的引入规则 1。', 'Then wire “it is windy” into way 1 of “and”.'),
    ],
    solution: isoBoard(['Rain>Wind', 'Wind>1']),
    naive: isoBoard(['Rain>1', 'Wind>2']),
    after: T('声明好了：一条引入规则，要两样。拿到「下雨 ∧ 刮风」以后能做什么，不用另写：引入规则就是造出它的全部办法，所以它的证明里一定装着交进去的那两份。用掉它的<wiki-ref to="elim-rule"></wiki-ref>因此能由引入规则自动生成：每条引入规则一种情况，收到那条引入规则交进去的东西，拿去推任意一句 ?R。生成它的机器，后面的章节里你会亲手搭出来。两条规则都不是证出来的：「并且」原本不存在，声明让证明核从此认得它。', 'Declared: one way to make it, needing two. What to do with “it rains ∧ it is windy” need not be written: the ways in are all the ways to make it, so its proof must hold the two proofs handed in. Its <wiki-ref to="elim-rule"></wiki-ref> can therefore be made from the ways in: one case for each, receiving what that way handed in, to reach any sentence ?R with. A later chapter has you build the machine that makes it. Neither rule was proved: “and” did not exist before, and the declaration is what makes the kernel know it.'),
  }),
  declare({
    id: 'decl-or',
    adds: ['orI', 'orE'],
    title: T('声明「或者」', 'Declaring “or”'),
    declare: T('或者', 'or'),
    target: 'Sat ∨ Sun',
    sentences: ['Sat', 'Sun'],
    tests: [
      { have: { Sat: 1 }, make: true },
      { have: { Sun: 2 }, make: true },
      { have: { Sat: 3, Sun: 4 }, make: true },
      { have: {}, make: false },
      { get: 'Sat', make: false },
      { holds: ['Sat → Rest', 'Sun → Rest'], get: 'Rest', make: true },
      { holds: ['Sat → Rest'], get: 'Rest', make: false },
    ],
    intro: [{ t: T("合取的引入规则需要两个前提。析取「今天是周六，或者今天是周日」则在任一命题有证明时即可引入，两者都有证明也可以。请用引入规则表达这两种情况。", "Conjunction introduction requires two premises. The disjunction “today is Saturday or today is Sunday” can be introduced from a proof of either proposition, including when both are proved. Express the two cases as introduction rules.") }],
    brief: T('「今天是周六，或者今天是周日」：手里有其中一份证明就证得出，两份都有也行。写出它的声明。', '“Today is Saturday or today is Sunday”: proved with either proof at hand, and with both. Write its declaration.'),
    hint: [T('两条引入规则，各要一样：两张假设不串，各接一个引入规则口。', 'Two ways, each needing one: no chain, each assumption into a way of its own.')],
    solution: isoBoard(['Sat>1', 'Sun>2']),
    naive: isoBoard(['Sat>Sun', 'Sun>1']),
    after: T('两条引入规则，各要一样：有一份就够，两份都有也行。消去规则照样自动生成，两条引入规则就是两种情况：拿到一份「周六 ∨ 周日」，并不知道是哪一条造的，只好两种情况都准备好，实际是哪一种就走哪一种。这就是分情况：「或者」推得出的，正好是两条来路都推得出的那些。', 'Two ways, each needing one: one proof is enough, and both will do. Its elimination rule is made from them as well, two ways in, two cases: holding a proof of “Saturday ∨ Sunday”, you do not know which way made it, so both stand ready, and the one it was made by is taken. That is “case by case”: what “or” gives is exactly what both ways in give.'),
  }),
  declare({
    id: 'decl-bot',
    title: T('声明 ⊥', 'Declaring ⊥'),
    adds: ['botE'],
    declare: T('矛盾', 'contradiction'),
    symbols: ['⊥'],
    target: '⊥',
    sentences: ['Rain'],
    tests: [
      { have: { Rain: 1 }, make: false },
      { have: {}, make: false },
      { get: 'Wet', make: true },
    ],
    intro: [{ t: T("否定还没有进入证明核。在本游戏中，¬A 定义为 A → ⊥，因此先声明表示矛盾的 ⊥：它没有引入规则。", "Negation has not yet entered the kernel. In this game, ¬A is defined as A → ⊥, so first declare ⊥, the proposition representing contradiction: it has no introduction rules.") }],
    brief: T('矛盾 ⊥：手里有什么，都没有哪一条引入规则造得出它。写出它的声明。', 'The contradiction ⊥: whatever is at hand, no way makes it. Write its declaration.'),
    hint: [T('怎样都证不出，就是一条引入规则都没有。', 'Never proved means no way to make it.')],
    solution: isoBoard([]),
    naive: isoBoard(['Rain>1']),
    after: T('一条引入规则都没有：手里有什么，都证不出 ⊥。生成的消去规则也就一种情况都没有，只剩 ⟦⊥⟧ ⟹ ?R：有了矛盾，想要什么都行。「非」不用另外声明：¬A 就是「A → ⊥」的名字，是一个<wiki-ref to="definition"></wiki-ref>。', 'No way to make it at all: whatever is at hand, ⊥ is not proved. So the elimination rule made from its ways has no case at all, and is just ⟦⊥⟧ ⟹ ?R: from a contradiction, anything follows. “Not” needs no declaration of its own: ¬A is a name for “A → ⊥”, a <wiki-ref to="definition"></wiki-ref>.'),
  }),
]

// The optional topic after the three: more shapes a declaration takes. A way that needs three, and three ways; the
// order a way takes its proofs in, which the situations cannot see (`ways`); three ways of two each, a new proposition
// and not a connective (and why "exactly one" cannot be declared); a way that needs nothing (True); a way whose
// assumptions are sentences with → in them (if and only if).
const VOTE = { a1: 'AnnYes', b1: 'BoYes', b2: 'BoYes', c2: 'CyYes', a3: 'AnnYes', c3: 'CyYes' }
const IFF = { f: 'Rain → Wet', g: 'Wet → Rain' }

export const moreDeclarations = [
  {
    id: 'decl-three',
    title: T('三样', 'Three of them'),
    tasks: [
      declare({
        step: T('三样都要', 'All three'),
        declare: T('三样都要', 'all three'),
        target: 'Rain ∧ (Wind ∧ Wet)',
        sentences: ['Rain', 'Wind', 'Wet'],
        tests: [
          { have: { Rain: 1, Wind: 2, Wet: 3 }, make: true },
          { have: { Rain: 4, Wind: 5 }, make: false },
          { have: { Rain: 6, Wet: 7 }, make: false },
          { have: { Wind: 8, Wet: 9 }, make: false },
          { get: 'Wind', make: true },
          { get: 'Slip', make: false },
          { holds: ['Wet → Slip'], get: 'Slip', make: true },
        ],
        brief: T('「下雨、刮风、地湿，三样都要」：三份证明都在手里才证得出。写出它的声明。', '“It rains, it is windy, the ground is wet: all three”: proved only with all three proofs at hand. Write its declaration.'),
        hint: [T('一条引入规则，三张假设串成一串。', 'One way: three assumptions in one chain.')],
        solution: isoBoard(['Rain>Wind', 'Wind>Wet', 'Wet>1']),
        naive: isoBoard(['Rain>Wind', 'Wind>1', 'Wet>2']),
        after: T('一条引入规则串三张假设。平常写的「下雨 ∧ 刮风 ∧ 地湿」却不必另外声明：它读作「下雨 ∧ (刮风 ∧ 地湿)」，两层「并且」，拆的时候也拆两层。', 'One way, three assumptions in a chain. The usual “it rains ∧ it is windy ∧ the ground is wet” needs no declaration of its own, though: it reads “it rains ∧ (it is windy ∧ the ground is wet)”, two “and”s, taken apart twice.'),
      }),
      declare({
        step: T('三选一', 'One of three'),
        declare: T('三选一', 'one of three'),
        target: 'Sat ∨ (Sun ∨ Holiday)',
        sentences: ['Sat', 'Sun', 'Holiday'],
        tests: [
          { have: { Sat: 1 }, make: true },
          { have: { Sun: 2 }, make: true },
          { have: { Holiday: 3 }, make: true },
          { have: {}, make: false },
          { get: 'Sat', make: false },
          { holds: ['Sat → Rest', 'Sun → Rest', 'Holiday → Rest'], get: 'Rest', make: true },
          { holds: ['Sat → Rest', 'Sun → Rest'], get: 'Rest', make: false },
        ],
        brief: T('「今天是周六、周日，或者放假」：手里有其中任何一份证明就证得出。写出它的声明。', '“Today is Saturday, Sunday, or a holiday”: proved with any one of the three proofs at hand. Write its declaration.'),
        hint: [T('三条引入规则，各要一样，引入规则口正好用满。', 'Three ways, each needing one: every way in is used.')],
        solution: isoBoard(['Sat>1', 'Sun>2', 'Holiday>3']),
        naive: isoBoard(['Sat>1', 'Sun>2']),
      }),
    ],
    intro: [{ t: T('「并且」「或者」都只说两句话。换成三句：一条引入规则要三样，或者三条引入规则各要一样。', '“And” and “or” speak of two sentences. Make it three: one way needing three, or three ways needing one each.') }],
    after: T('三条引入规则，消去规则就分三种情况：拿到它的证明，要对三种情况各准备一个办法。引入规则有几条，分情况就分几支。', 'Three ways, so its case splits in three: holding its proof, you ready one move for each. As many ways as there are, so many branches has case by case.'),
  },
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
      { get: 'Rain', make: true },
      { get: 'Wet', make: false },
    ],
    intro: [{ t: T('你声明的「并且」，引入规则先要「下雨」、再要「刮风」。反过来写行不行？表格分得出来吗？', 'The “and” you declared takes “it rains” first, then “it is windy”. Would the other order do? Can the table tell?') }],
    brief: T('写一个先要「刮风」、再要「下雨」的「并且」。', 'Write an “and” that takes “it is windy” first, then “it rains”.'),
    hint: [T('把「刮风」接进「下雨」的「先假设」。', 'Wire “it is windy” into the “assumed first” of “it rains”.')],
    solution: isoBoard(['Wind>Rain', 'Rain>1']),
    naive: isoBoard(['Rain>Wind', 'Wind>1']),
    after: T('两种顺序，每种情况下都一样证得出，表格分不出来。可规则不一样：用它造「并且」时，交证明的顺序跟着变。证明核只认写下来的那一条。', 'In every situation the two orders prove it alike, and the table cannot tell them apart. The rules differ, though: making “and” with it, the proofs go in the other order. The kernel keeps to the rule written down.'),
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
      { get: 'AnnYes', make: false },
      { holds: ['AnnYes → Happy', 'BoYes → Happy'], get: 'Happy', make: true },
      { holds: ['AnnYes → Happy'], get: 'Happy', make: false },
    ],
    intro: [{ t: T('声明出来的不一定是连接词。一件事怎样才算成立，只要说得出有哪几条引入规则，就能声明。', 'What is declared need not be a connective. Whatever counts as holding in a few ways to make it can be declared.') }],
    brief: T('安、博、赛三人投票，至少两人同意，提案就通过。写出「提案通过」的声明。', 'Ann, Bo and Cy vote; with at least two agreeing, the motion passes. Write the declaration of “the motion passes”.'),
    hint: [T('三条引入规则，每种是两个人同意，两张假设串起来。同一句可以拿好几张假设。', 'Three ways, each two people agreeing, two assumptions in a chain. One sentence may be on several cards.')],
    solution: isoBoard(['a1>b1', 'b1>1', 'b2>c2', 'c2>2', 'a3>c3', 'c3>3'], VOTE),
    naive: isoBoard(['a1>b1', 'b1>1', 'b2>c2', 'c2>2'], VOTE),
    after: T('三条引入规则，各要两个人，消去规则就是三种情况：知道提案通过，只知道三种两人组合里有一种同意了，连安有没有同意都不知道。可换成「恰好一人同意」就写不出来了：引入规则只能说「有了什么就造得出」，说不了「有了什么就造不出」。', 'Three ways, two people each, so its elimination rule has three cases: knowing the motion passed, you know one of the three pairs agreed, not which, not even whether Ann did. “Exactly one agrees” cannot be written, though: a way can only say what makes it, never what stops it.'),
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
      { get: 'Moon', make: false },
      { holds: ['Rain', 'Rain → Wet'], get: 'Wet', make: true },
    ],
    intro: [{ t: T('⊥ 一条引入规则都没有。反过来，一句什么都不要、总证得出的话，该怎么声明？托盘里多了一张「不用假设」。', '⊥ has no way to make it. The other way round: how to declare a sentence that needs nothing and is always proved? The tray has a new card, “assume nothing”.') }],
    brief: T('「真」：不管手里有什么，甚至什么都没有，都证得出。写出它的声明。', 'True: proved whatever is at hand, even nothing at all. Write its declaration.'),
    hint: [T('一条引入规则，什么都不用：把「不用假设」接进引入规则 1。', 'One way that needs nothing: wire “assume nothing” into way 1.')],
    solution: isoBoard(['∅>1']),
    naive: isoBoard(['Rain>1']),
    after: T('一种空引入规则，常写成 ⊤。和 ⊥ 正好相反：⊥ 一条引入规则都没有，怎样都证不出，消去规则没有情况，什么都推得出；「真」有一种空引入规则，怎样都证得出，消去规则一种空情况，知道它什么都没多知道。', 'One empty way in, often written ⊤. The very opposite of ⊥: ⊥ has no way in, is never proved, and its elimination rule, with no case, gives anything; True has an empty one, is always proved, and its elimination rule, one empty case, tells you nothing more.'),
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
      { get: 'Rain → Wet', make: true },
      { holds: ['Wet'], get: 'Rain', make: true },
      { get: 'Rain', make: false },
    ],
    intro: [{ t: T('引入规则要的不必是一个字母。真值电路里的 ↔ 是两个方向都对：它要的是两句「若…则…」。', 'What a way takes need not be one letter. The ↔ of the truth circuits holds both ways round: it takes two “if … then …”s.') }],
    brief: T('「下雨当且仅当地湿」：两个方向的「若…则…」都在手里才证得出。写出它的声明。', '“It rains if and only if the ground is wet”: proved only with both “if … then …”s at hand. Write its declaration.'),
    hint: [T('两张假设分别假设两个方向，串成一条引入规则。', 'Two assumptions, one for each direction, chained into one way.')],
    solution: isoBoard(['f>g', 'g>1'], IFF),
    naive: isoBoard(['f>1', 'g>2'], IFF),
    after: T('一条引入规则，要两个方向，消去规则就一起交还两个方向：它和两个方向的「并且」一样。', 'One way in, taking both directions, so the elimination rule hands both back together: it is an “and” of the two directions.'),
  }),
]

// Declarations further on, each just before the parts it brings are put to work. "There is", with the quantifiers: one
// way taking a thing and a proof about it; its case is Take the one there is. Equality: one way taking a thing alone,
// a = a; what takes it apart is rewriting, which is not the plain cases (= is a family of sentences indexed by things),
// so the level gives it. The numbers, before induction: 0 needs nothing, the next number needs a number; what takes
// a number apart, with the conclusion already used on the number it was made from, is induction.
export const thingDeclarations = [
  declare({
    id: 'decl-ex',
    adds: ['exI', 'exE'],
    title: T('声明「存在」', 'Declaring “there is”'),
    declare: T('存在', 'there is'),
    target: '∃y. Human(y)',
    sentences: ['Human(x)', 'Mortal(x)'],
    things: ['soc', 'ann'],
    tray: ['thing', 'hyp'],
    tests: [
      { have: { 'Human(soc)': 1 }, make: true },
      { have: { 'Human(ann)': 2 }, make: true },
      { have: { 'Mortal(soc)': 3 }, make: false },
      { have: {}, make: false },
      { get: 'Human(soc)', make: false },
      { holds: ['∀x. Human(x) → Mortal(x)'], get: '∃y. Mortal(y)', make: true },
      { holds: ['∀x. Human(x) → Mortal(x)'], get: 'Mortal(soc)', make: false },
    ],
    intro: [
      { t: T('「对所有」不用声明：任取一样东西证出来，就是对所有东西证出来，这件事证明核本来就会。「存在」不一样：「∃y. y是人」怎样才算证出来？得有某一样东西，再有它是人的证明，比如「苏格拉底是人」。', '“For all” needs no declaration: proved for any thing taken, it is proved for all, and the kernel can do that already. “There is” is different: when is “∃y. y is human” proved? There has to be some thing, and a proof that it is human, such as “Socrates is human”.') },
      { t: T('托盘里多了一张「任取一样东西」：它取一样东西，叫它 x；接在它后面的假设可以提到 x。', 'The tray has a new card, “any thing”: it takes a thing and calls it x; the assumptions after it may mention x.') },
    ],
    brief: T('「存在一个人」：手里有某一样东西是人的证明，就证得出。写出它的声明。', '“There is a human”: proved with a proof that some thing is human at hand. Write its declaration.'),
    hint: [T('一条引入规则：先取一样东西，再接一张假设，选「x是人」，接进引入规则 1。', 'One way: take a thing first, then an assumption choosing “x is human”, into way 1.')],
    solution: isoBoard(['⋀x>h', 'h>1'], { h: 'Human(x)' }),
    naive: isoBoard(['h>1'], { h: 'Human(x)' }),
    after: T('一条引入规则要两样：一样东西，和它是人的证明。消去规则就收到任取的一样东西和它是人的证明：交进去的是苏格拉底还是安，消去的时候不知道，所以那一样东西要起一个新名字。证明板上从此有了举例（引入规则）和拿出那一个（消去规则）。', 'One way in taking two things: a thing, and a proof that it is human. So the elimination rule receives any thing taken and a proof that it is human: whether Socrates or Ann went in, eliminating cannot tell, so that thing gets a new name. The proof board now has Example (the way in) and Take the one there is (the elimination rule).'),
  }),
  declare({
    id: 'decl-eq',
    adds: ['rewrite', 'refl'],
    title: T('声明相等', 'Declaring equality'),
    declare: T('相等', 'equal'),
    target: 'a = a',
    binder: 'a',
    sentences: [],
    things: ['phos', 'hesp'],
    tray: ['thing'],
    tests: [
      { goal: 'phos = phos', have: {}, make: true },
      { goal: 'hesp = hesp', have: {}, make: true },
      { goal: 'phos = hesp', have: {}, make: false },
    ],
    take: { premises: ['?a = ?b', '?P(?a)'], conclusion: '?P(?b)' },
    intro: [{ t: T('晨星和昏星是不是同一颗星？要说两样东西相等，先声明相等。凭空能证出哪些「s = t」？只有一种：每样东西都等于它自己。两个名字不一样的，凭空证不出来。', 'Are the Morning Star and the Evening Star one star? To say two things are equal, declare equality first. Which “s = t” can be proved from nothing? Only one kind: each thing equals itself. Two different names, from nothing, cannot be.') }],
    brief: T('相等：任何东西都等于它自己；凭空证不出两个不同名字相等。写出它的声明。', 'Equality: everything equals itself; two different names cannot be proved equal from nothing. Write its declaration.'),
    hint: [T('一条引入规则，只要取一样东西 a，什么都不用假设。', 'One way that takes a thing a and assumes nothing.')],
    solution: isoBoard(['⋀a>1']),
    naive: isoBoard(['∅>1']),
    after: T('一条引入规则，只取一样东西：每样东西等于它自己，这就是自反律。它的消去规则有点特别：「a = b」只可能是从「a = a」造出来的，所以 b 其实就是 a，关于 a 说的话对 b 也成立。这就是等量代换。证明板上从此有了这两块元件。', 'One way, taking one thing: everything equals itself, which is reflexivity. Its case is a little special: “a = b” can only have been made as “a = a”, so b is really a, and what is said of a holds of b. That is rewriting. The proof board now has both parts.'),
  }),
]

// Chapter 3, an optional branch beside the declarations · The elimination rule generator: the step that makes every
// declaration's elimination rule, built by hand on a machine board whose wires carry rules (elimgen.js). Two levels
// with little help: one way in, then a list of them; the tests are the declarations met so far, and hidden ones of
// shapes not met yet (a way that takes a thing, a new proposition), so passing shows the generator works for any
// declaration. What the generator cannot do yet (the induction hypothesis, an indexed family) waits in optional levels
// too, never on the main path.
export const generators = [
  generator({
    id: 'gen-one',
    single: true,
    title: T('拆开它', 'Taking it apart'),
    // The parts that take rules apart and put them together.
    adds: RULECRAFT,
    tests: [DECLS.and, DECLS.three, DECLS.iff, DECLS.truth],
    intro: [
      { t: T('每声明一样东西，证明核都替你由引入规则生成了它的<wiki-ref to="elim-rule"></wiki-ref>。这条可选的支线，把证明核里做这一步的那一块亲手搭出来。', 'Each time something is declared, the kernel makes its <wiki-ref to="elim-rule"></wiki-ref> for you from the ways in. This optional branch builds that piece of the kernel by hand.') },
      { t: T('这块板上，线上传的是规则本身。两个输入：声明的那句话（字母换成了 ?A、?B，生成的规则要对任何句子都成立），和它的<wiki-ref to="intro-rule"></wiki-ref>。托盘里的元件把规则拆开、拼起来。每组测试是一份只有一条引入规则的声明，和要生成的消去规则。', 'On this board the wires carry rules themselves. Two inputs: the declared sentence (its letters turned into ?A and ?B, since the rule made must hold for any sentences) and its <wiki-ref to="intro-rule"></wiki-ref>. The parts in the tray take rules apart and put them together. Each test is a declaration with one way in, and the elimination rule to make.') },
    ],
    brief: T('设计一个证明助手：由只有一条引入规则的声明，生成它的消去规则。', 'Design a proof assistant that makes the elimination rule of a declaration with one way to make it.'),
    hint: [T('比一比引入规则和要生成的消去规则：哪一部分原样搬过去了，哪一部分换掉了？', 'Compare the way in with the elimination rule to make: which part carries over as it is, and which is replaced?')],
    solution: machine({ r: ['anyR'], s: ['swapConcl'], c: ['consFront'], m: ['mkRule'] }, ['ways>s.rule', 'r>s.to', 'it>c.first', 's>c.rest', 'c>m.premises', 'r>m.conclusion', 'm>out'], { inputs: ['it', 'ways'] }),
    after: T('引入规则怎样把东西交进去，消去规则就怎样把它们交还：把引入规则的结论换成 ?R，就是一种情况；前面再放上声明的那句，结论是 ?R。', 'As the way in hands things over, the elimination rule hands them back: the way in with its conclusion put as ?R is a case; the declared sentence goes in front, and the conclusion is ?R.'),
  }),
  generator({
    id: 'gen-each',
    title: T('每一条', 'One for each'),
    builds: 'elimGen',
    adds: [...RULECRAFT, 'eachOf'],
    tests: [DECLS.and, DECLS.or, DECLS.three, DECLS.oneOfThree, DECLS.iff, DECLS.truth, DECLS.bot],
    // Shapes not met yet: a way that takes a thing ("there is"), and a new proposition of three ways.
    hidden: [DECLS.ex, DECLS.two],
    intro: [{ t: T('这一次输入的引入规则是一串，有几条都行，一条都没有也行。新元件「每条」是一个框：一串里的每一样各开一遍，框里接出的东西排成新的一串。', 'This time the ways in come as a list, of any length, even none. The new part For each is a frame: it opens once with each item of a list, and what is made inside makes a new list.') }],
    brief: T('设计一个证明助手：由一份声明的一串引入规则，生成它的消去规则。还有没见过的声明在隐藏测试里等着。', 'Design a proof assistant that makes a declaration’s elimination rule from its list of ways in. Declarations not met yet wait among the hidden tests.'),
    hint: [T('每条引入规则各变成一种情况；情况的个数和引入规则一样多。', 'Every way in becomes a case of its own: as many cases as ways.')],
    solution: GENERATOR,
    after: T('一条引入规则一种情况，一条不多，一条不少。⊥ 一条引入规则都没有，「每条」一次也不做，得出 ⟦⊥⟧ ⟹ ?R。隐藏测试里还有你没声明过的：取一样东西的「存在」，三条来路的「提案通过」，电路一点不用改也都对了。因为它从不看引入规则里面写的是什么，只把结论换成 ?R，所以对任何声明都成立。这块电路现在是<part-ref to="lemma:elimGen"></part-ref>：Lean 的内核也是这样由每个构造子生成<wiki-ref to="recursor"></wiki-ref>的一种情况，所以它不让你手写消去规则。', 'One case for each way in, none more, none fewer. ⊥ has no way in, so For each runs not once and the board gives ⟦⊥⟧ ⟹ ?R. The hidden tests held declarations you have not written: “there is”, whose way takes a thing, and “the motion passes”, with three ways; the board got them right unchanged. It never looks at what a way says inside, only puts its conclusion as ?R, so it works for any declaration. This board is now the <part-ref to="lemma:elimGen"></part-ref>: Lean’s kernel too makes one case of a <wiki-ref to="recursor"></wiki-ref> from each constructor, which is why it never lets you write an elimination rule.'),
  }),
]

// Chapter 12 · Types are declared on the same board: a way is a constructor, an assumption of the type itself its
// argument of that type, a thing card an element (`datatype`, iso.js typeOf). Passing one puts the type in the course
// (course.js); the rules the kernel makes of it (cases, induction, the constructors all different) show when it is
// passed, and what makes them so is said there.
const TYPE = (level) => declare({ words: TERM_WORDS, ...level })
export const typeDeclarations = [
  TYPE({
    id: 'decl-nat',
    title: T('声明自然数', 'Declaring the numbers'),
    declare: T('自然数', 'a number'),
    target: 'Nat',
    sentences: ['Nat'],
    tray: ['hyp', 'none'],
    datatype: { type: 'nat', ctors: ['zero', 's'], args: { Nat: 'nat' } },
    tests: [
      { have: {}, make: true },
      { have: { Nat: 1 }, make: true, uses: ['Nat'] },
    ],
    intro: [
      { t: T('自动证明器在一堆句子里找矛盾，却多半不会归纳；化简器能改写，可「1 + 1 = 2」怎么证？数从哪里来？这一章把数和列表从头讲起，规则书里的每一条都由你声明出来。', 'An automatic prover hunts for a contradiction among sentences, yet mostly cannot do induction; Simp rewrites, but how is “1 + 1 = 2” proved? Where do numbers come from? This chapter builds numbers and lists from the start, and every rule in the book is declared by you.') },
      { t: T('和「并且」一样，数也靠声明：一个自然数有哪几条引入规则？这一次声明的是一种东西，引入规则叫<wiki-ref to="constructor"></wiki-ref>：每条造出一个数。', 'As with “and”, numbers come from a declaration: what are the ways to make a number? This time what is declared is a kind of thing, and its ways are called <wiki-ref to="constructor"></wiki-ref>s: each makes a number.') },
    ],
    brief: T('自然数：什么都没有，也造得出一个（0）；手里有一个数，就造得出它的下一个。写出它的声明。', 'A number: one can be made from nothing (0); with a number at hand, the next one can be made. Write its declaration.'),
    hint: [T('两条引入规则：一种什么都不用假设；另一种假设「自然数」，要的正是一个数。', 'Two ways: one assumes nothing; the other assumes “a number”, taking just a number.')],
    solution: isoBoard(['∅>1', 'Nat>2']),
    naive: isoBoard(['∅>1']),
    after: T('两条构造子：0 什么都不要，S 要一个数，造出它的下一个，写作 nat = 0 | S nat。证明核从声明生成三样规则：按情况分（第 3 章那样，一个构造子一种情况：一个数要么是 0，要么是某个数的下一个）；归纳（S 要的正是一个自然数，所以拆开一个数时，还能先对它前面那个数用上要证的结论：归纳假设）；互不相同（只有这两条来路，来路不同造出的就不同：0 不等于任何 S n）。S 是不是一对一（S x = S y 就有 x = y），声明不直接给，后面用定义证出来。', 'Two constructors: 0 takes nothing, S takes a number and makes the next, written nat = 0 | S nat. The kernel makes three kinds of rule of the declaration: cases (as in chapter 3, one case for each constructor: a number is 0 or the next of some number); induction (S takes a number itself, so taking a number apart may first use what is being proved on the number before it: the induction hypothesis); and all different (these are the only ways, and different ways make different numbers: 0 is no S n). Whether S is one-to-one (S x = S y gives x = y) the declaration does not say outright: it is proved later, from a definition.'),
  }),
  TYPE({
    id: 'decl-list',
    title: T('声明列表', 'Declaring lists'),
    declare: T('列表', 'a list'),
    target: 'List',
    sentences: ['List'],
    things: ['ann', 'bo'],
    tray: ['thing', 'hyp', 'none'],
    datatype: { type: 'list', ctors: ['nil', 'cons'], args: { List: 'list' } },
    ways: [[], ['⋀x', 'List']],
    tests: [
      { have: {}, make: true },
      { have: { List: 1 }, make: true, uses: ['List'] },
    ],
    intro: [{ t: T('一个列表是一串东西：空的 []，或者在一个列表前面再放一样东西 x :: xs。', 'A list is a row of things: the empty one [], or a thing x put in front of a list, x :: xs.') }],
    brief: T('列表：什么都没有，也造得出一个（空列表）；任取一样东西，再有一个列表，就造得出把它放在前面的列表。写出它的声明。', 'A list: one can be made from nothing (the empty list); taking any thing, with a list at hand, the list with it in front can be made. Write its declaration.'),
    hint: [T('两条引入规则：一条什么都不用假设；另一条先任取一样东西，再接一张假设「列表」。', 'Two ways: one assumes nothing; the other takes any thing first, then an assumption of “a list”.')],
    solution: isoBoard(['∅>1', '⋀x>l', 'l>2'], { l: 'List' }),
    naive: isoBoard(['∅>1', 'l>2'], { l: 'List' }),
    after: T('list = [] | x :: list。和数一样，生成的归纳规则在 x :: xs 那种情况里先对 xs 用上要证的结论；任取的那样东西只是元素，不是列表，所以对它没有归纳假设。', 'list = [] | x :: list. As with numbers, the induction rule made of it uses what is being proved on xs first in the case x :: xs; the thing taken is an element, not a list, so it gets no induction hypothesis.'),
  }),
  TYPE({
    id: 'decl-bool',
    title: T('声明真假', 'Declaring true and false'),
    declare: T('真假值', 'a truth value'),
    target: 'Bool',
    sentences: ['Bool'],
    tray: ['none'],
    datatype: { type: 'bool', ctors: ['tt', 'ff'], args: {} },
    ways: [[], []],
    tests: [{ have: {}, make: true }],
    intro: [{ t: T('比大小的结果不是一句话，而是一个值：真或者假。它们也是声明出来的一种东西。', 'The result of a comparison is not a sentence but a value: true or false. They too are a kind of thing that is declared.') }],
    brief: T('真假值：真什么都不要，假也什么都不要，是两样不同的东西。写出它的声明。', 'A truth value: true needs nothing, false needs nothing, and they are two different things. Write its declaration.'),
    hint: [T('两条引入规则，各接一张「不用假设」。', 'Two ways, each with an “assume nothing”.')],
    solution: isoBoard(['∅1>1', '∅2>2']),
    naive: isoBoard(['∅1>1']),
    after: T('bool = 真 | 假。两条什么都不要的构造子，情况表格分不出一条还是两条，规则本身分得出：按情况分有两种情况，互不相同说真不等于假。程序里的每一个「如果」，在证明里就是对它分一次情况。', 'bool = true | false. Two constructors that need nothing; the situations cannot tell one from two, the rules can: cases has two cases, and all different says true is not false. Every “if” in a program is a case split on it in a proof.'),
  }),
  // Optional, for whoever built the generator: what it makes of the numbers, cases with no induction hypothesis.
  generator({
    id: 'gen-nat',
    title: T('生成器遇上自然数', 'The generator meets the numbers'),
    tests: [DECLS.nat],
    intro: [{ t: T('把自然数的声明交给<part-ref to="lemma:elimGen"></part-ref>，看它生成什么，再和声明给出的数学归纳法比一比。', 'Hand the declaration of the numbers to the <part-ref to="lemma:elimGen"></part-ref>, see what it makes, and compare it with the mathematical induction the declaration gives.') }],
    brief: T('设计一个证明助手：生成自然数的消去规则。', 'Design a proof assistant that makes the elimination rule of the numbers.'),
    hint: [T('放上消去规则生成器，把两个输入接进去。', 'Put down the elimination rule generator and wire both inputs into it.')],
    solution: machine({ g: ['elimGen'] }, ['it>g.it', 'ways>g.ways', 'g>out'], { inputs: ['it', 'ways'] }),
    after: T('生成器给出的只是按情况分：⟦自然数; ?R; ⟦自然数⟧ ⟹ ?R⟧ ⟹ ?R，第二种情况拿到了那个数，却用不上要证的结论。数学归纳法多出来的，是对那个数先用上 ?R：归纳假设。生成器要学会这一步，得先看出哪条引入规则要的正是它自己。', 'The generator gives only cases: ⟦a number; ?R; ⟦a number⟧ ⟹ ?R⟧ ⟹ ?R; the second case gets the number, but not what is being proved of it. What induction adds is ?R used on that number first: the induction hypothesis. To learn it, the generator must first see which way takes the very thing being declared.'),
  }),
]
