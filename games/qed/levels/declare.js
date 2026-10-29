// Chapter 3, second half · Declarations: the kernel has Apply and the box, and no "and", "or" or "contradiction";
// definitions only name what those two prove, so a connective has to come in another way. It comes in by a
// declaration: its ways to make it, each a rule written with assumption cards from the tray (iso.js). Chained cards are
// one way that needs both; cards each into a way of their own are separate ways; no card wired is no way at all. Each
// situation tests the declaration against what the connective means. `sentences` are what an assumption card may pick.
//
// What takes it apart is written by hand too, in the declaration's second task (take.js): an elimination rule card,
// each chain into it a case; the check lets it through when it gives no more than each way in handed in, and no less
// than every way in gives. Passing a declaration brings in its way in and its elimination rule as proof-board parts
// (`adds`), which chapter 4 puts to work. The elimination rule generator (chapter 12) makes the same rules from the
// ways in, once many have been written by hand.
import { isoBoard, waysIn } from '../../kit/domains/logic/iso.js'
import { ANY, takeBoard } from '../../kit/domains/logic/take.js'
import { machine } from '../../kit/domains/logic/build.js'

const T = (zh, en) => ({ zh, en })
const declare = (level) => ({ kind: 'iso', ...level })
// What both tasks of a declaration read: its sentence and words, and the tray of cards.
const SHARED = ['declare', 'symbols', 'target', 'sentences', 'things', 'binder', 'tray']
/**
 * A declaration in two tasks: its ways in on the declaration board (the level's fields, `after` that task's), then its
 * elimination rule by hand (`take`), checked against those ways. `summary` is the level's own pass text.
 */
const declared = ({ id, title, adds, intro, summary, take, ...ways }) => ({
  id, title, adds, intro, after: summary,
  ...Object.fromEntries(SHARED.filter((k) => k in ways).map((k) => [k, ways[k]])),
  tasks: [
    declare({ step: T('写引入规则', 'Its ways in'), ...Object.fromEntries(Object.entries(ways).filter(([k]) => !SHARED.includes(k))) }),
    { kind: 'take', step: T('写消去规则', 'Its elimination rule'), intros: waysIn(ways.solution), ...take },
  ],
})
// The check's words, for every elimination rule card's brief.
const CHECK = T('不多给，不少给', 'no more, no less')

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
  declared({
    id: 'decl-and',
    // What declaring it gives: its way to make it and the elimination rule written for it, parts of the proof board
    // from here on.
    adds: ['andI', 'andCases'],
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
      { t: T('串联、交换、合并、K、S，都是用套用和假设框证出来、再起了名字的<wiki-ref to="definition"></wiki-ref>。名字起得再多，能证的还是那些：它们都能换回原来的电路。可有一类话，证明核根本说不出来：「下雨，并且刮风」。没有哪块元件造得出一句「并且」，也没有哪块元件用得掉它。', 'Chain, Swap, Merge, K and S are <wiki-ref to="definition"></wiki-ref>s: proofs from Apply and the box, given a name. However many names you give, what can be proved stays the same, since each name swaps back for its circuit. But there is a kind of sentence the kernel cannot say at all: “it rains and it is windy”. No part makes an “and”, and no part uses one up.') },
      { t: T('要让证明核认识「并且」，得先<wiki-ref to="declaration"></wiki-ref>：说清楚它怎样才算证出来。「下雨并且刮风」什么时候证得出？两份证明都在手里的时候。把这句话写成一条规则：假设下雨，再假设刮风，就得到「下雨 ∧ 刮风」，写作 ⟦下雨; 刮风⟧ ⟹ 下雨 ∧ 刮风（<wiki-ref to="rule-arrow"></wiki-ref>）。这是它的一种<b>引入规则</b>。', 'For the kernel to know “and”, it needs a <wiki-ref to="declaration"></wiki-ref>: when does it count as proved? “It rains and it is windy” is proved when both proofs are at hand. As a rule: assume it rains, then assume it is windy, and you have “it rains ∧ it is windy”, written ⟦it rains; it is windy⟧ ⟹ it rains ∧ it is windy (<wiki-ref to="rule-arrow"></wiki-ref>). That is one <b>way to make</b> it.') },
      { t: T('假设卡从托盘拿，卡上选它假设哪一句。一条引入规则要两样，就把一张接进另一张的「先假设」，顺着线先假设前一句、再假设后一句；串好接进「并且」的引入规则口，就是一条引入规则。下面的表格是几种情况：手里有哪些证明，这时该不该证得出。', 'On the declaration board, take assumption cards from the tray and pick on each the sentence it assumes. A card wired into another’s “assumed first” is one way that needs both, assumed along the wire; a card wired into a way of “and” is one way to make it. The table below lists situations: which proofs are at hand, and whether it should then be proved.') },
    ],
    brief: T('「下雨，并且刮风」：两份证明都在手里，才证得出。写出它的声明。', '“It rains and it is windy”: proved only with both proofs at hand. Write its declaration.'),
    hint: [
      T('只有一条引入规则，要两样：拿两张假设，一张选「下雨」，一张选「刮风」，把「下雨」接进「刮风」的「先假设」。', 'One way, needing both: take two assumptions, one of “it rains” and one of “it is windy”, and wire “it rains” into the “assumed first” of “it is windy”.'),
      T('再把「刮风」接进「并且」的引入规则 1。', 'Then wire “it is windy” into way 1 of “and”.'),
    ],
    solution: isoBoard(['Rain>Wind', 'Wind>1']),
    naive: isoBoard(['Rain>1', 'Wind>2']),
    after: T('声明好了。表格最后一栏，是拿到一份「下雨 ∧ 刮风」以后能取回什么：只有这一条引入规则，它的证明里一定装着交进去的那两份。', 'Declared. The table’s last column is what a proof of “it rains ∧ it is windy” gives back: there is only this way to make it, so its proof must hold the two proofs handed in.'),
    take: {
      intro: [
        { t: T('「并且」声明好了，证明板上却还用不了「下雨 ∧ 刮风」：证明核只知道怎样造出它，不知道拿到它以后能做什么。用掉它的那条规则叫<wiki-ref to="elim-rule"></wiki-ref>，这一段把它写出来。', '“And” is declared, yet the proof board cannot use “it rains ∧ it is windy”: the kernel knows how to make it, not what to do once it has it. The rule that uses it up is its <wiki-ref to="elim-rule"></wiki-ref>, and this task writes it.') },
        { t: T('消去规则卡的第一条前提就是「下雨 ∧ 刮风」。接进卡里的每一串假设是一种情况：假设这一串，推出结论；结论在卡上选，?R 是任意一句话。写出来的规则要过检查：用每一种造法造出的证明，它都不能得出交进去的东西推不出的（不多给）；每一种造法交进去的东西都推得出的，它也都要推得出（不少给）。', 'The elimination rule card’s first premise is “it rains ∧ it is windy”. Each chain of assumptions wired into it is a case: assume the chain, reach the conclusion; the conclusion is picked on the card, ?R being any sentence at all. What is written must pass a check: from a proof made either way, it may give nothing that what was handed in does not give (no more); and whatever every way’s proofs give, it must give too (no less).') },
      ],
      brief: T(`写出「下雨，并且刮风」的消去规则：${CHECK.zh}。`, `Write the elimination rule of “it rains and it is windy”: ${CHECK.en}.`),
      hint: [
        T('拿到「下雨 ∧ 刮风」，就知道交进去的是哪两份证明。', 'Holding “it rains ∧ it is windy”, you know which two proofs went in.'),
        T('一种情况：假设下雨，再假设刮风，结论选 ?R。', 'One case: assume it rains, then it is windy, and pick ?R as the conclusion.'),
      ],
      solution: takeBoard([{ to: ANY, wires: ['Rain>Wind', 'Wind>1'] }]),
      // Less: the left side only. More: anything at all, with no case to earn it.
      naives: [takeBoard([{ to: 'Rain' }]), takeBoard([{ to: ANY }])],
      after: T('拿到「下雨 ∧ 刮风」，就能假设下雨、又假设刮风，去推任何一句：交进去的两份，一份不多、一份不少地交还。写成两条也行：一条结论选下雨，一条选刮风，合起来一样强。', 'Holding “it rains ∧ it is windy”, you may assume it rains and it is windy and reach any sentence: the two proofs handed in come back, none more and none fewer. Two rules will do too, one concluding it rains and one it is windy: together they are as strong.'),
    },
    summary: T('声明写出了怎样造它，消去规则写出了拿到它能做什么，两样对得上，「并且」才进了证明核。这两条规则都不是证出来的：「并且」原本不存在，声明让证明核从此认得它。', 'The declaration says how it is made, the elimination rule what it gives, and only with the two in harmony is “and” in the kernel. Neither rule was proved: “and” did not exist before, and the declaration is what makes the kernel know it.'),
  }),
  declared({
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
    ],
    intro: [{ t: T('「并且」只有一条引入规则，要两样。「或者」呢？「今天是周六，或者今天是周日」：有一份就够，两份都有也行。一条引入规则说不出「有一份就够」。', '“And” has one way to make it, needing two things. And “or”? “Today is Saturday or today is Sunday”: one proof is enough, and both will do. One way cannot say “one is enough”.') }],
    brief: T('「今天是周六，或者今天是周日」：手里有其中一份证明就证得出，两份都有也行。写出它的声明。', '“Today is Saturday or today is Sunday”: proved with either proof at hand, and with both. Write its declaration.'),
    hint: [T('两条引入规则，各要一样：两张假设不串，各接一个引入规则口。', 'Two ways, each needing one: no chain, each assumption into a way of its own.')],
    solution: isoBoard(['Sat>1', 'Sun>2']),
    naive: isoBoard(['Sat>Sun', 'Sun>1']),
    after: T('两条引入规则，各要一样：有一份就够，两份都有也行。', 'Two ways, each needing one: one proof is enough, and both will do.'),
    take: {
      intro: [{ t: T('「或者」有两条引入规则。拿到一份「周六 ∨ 周日」，并不知道它是哪一条造的。它的消去规则该怎么写？', '“Or” has two ways to make it. Holding a proof of “Saturday ∨ Sunday”, you do not know which way made it. How is its elimination rule written?') }],
      brief: T(`写出「今天是周六，或者今天是周日」的消去规则：${CHECK.zh}。`, `Write the elimination rule of “today is Saturday or today is Sunday”: ${CHECK.en}.`),
      hint: [
        T('不知道是哪一条造的，就每一条都准备一个办法。', 'Not knowing which way made it, ready a move for each.'),
        T('两种情况：一种假设周六，一种假设周日，结论都选 ?R。', 'Two cases: one assumes Saturday, the other Sunday, and the conclusion is ?R.'),
      ],
      solution: takeBoard([{ to: ANY, wires: ['Sat>1', 'Sun>2'] }]),
      // More: one case wanting both; one case for one way only.
      naives: [takeBoard([{ to: ANY, wires: ['Sat>Sun', 'Sun>1'] }]), takeBoard([{ to: ANY, wires: ['Sat>1'] }])],
      after: T('两条引入规则，消去规则就分两种情况。拿到一份「或者」的证明，并不知道它是哪条引入规则造的，只好两种情况都准备好，实际是哪一种就走哪一种：这就是分情况。只准备一种，就多给了：用另一条造的，交不出那种情况要的东西。', 'Two ways, so its elimination rule splits in two. Holding a proof of “or”, you do not know which way made it, so both stand ready, and the one it was made by is taken: that is “case by case”. Ready only one, and it gives more: made the other way, it cannot hand that case what it needs.'),
    },
    summary: T('「或者」推得出的，正好是两条来路都推得出的那些：消去规则把这句话写成了规则。', 'What “or” gives is exactly what both ways in give: its elimination rule writes that as a rule.'),
  }),
  declared({
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
    ],
    intro: [{ t: T('还差「非」。「不下雨」说的是：要是下雨，就出了矛盾。所以先声明矛盾本身，写作 ⊥：没有哪一条引入规则造得出它。', '“Not” is left. “It does not rain” says: if it rains, that is a contradiction. So first declare the contradiction itself, written ⊥: no way at all makes it.') }],
    brief: T('矛盾 ⊥：手里有什么，都没有哪一条引入规则造得出它。写出它的声明。', 'The contradiction ⊥: whatever is at hand, no way makes it. Write its declaration.'),
    hint: [T('怎样都证不出，就是一条引入规则都没有。', 'Never proved means no way to make it.')],
    solution: isoBoard([]),
    naive: isoBoard(['Rain>1']),
    after: T('一条引入规则都没有：手里有什么，都证不出 ⊥。', 'No way to make it at all: whatever is at hand, ⊥ is not proved.'),
    take: {
      intro: [{ t: T('⊥ 一条引入规则都没有。它的消去规则要准备几种情况？', '⊥ has no way to make it. How many cases does its elimination rule need?') }],
      brief: T(`写出矛盾 ⊥ 的消去规则：${CHECK.zh}。`, `Write the elimination rule of the contradiction ⊥: ${CHECK.en}.`),
      hint: [T('有几条引入规则，就有几种情况。', 'As many ways to make it, so many cases.')],
      solution: takeBoard([{ to: ANY }]),
      // Less: a case no way in can reach.
      naives: [takeBoard([{ to: ANY, wires: ['Rain>1'] }])],
    },
    summary: T('一条引入规则都没有，消去规则一种情况都不用写，只剩 ⟦⊥⟧ ⟹ ?R：有了矛盾，想要什么都行。检查里也没有「不多给」那几行：没有哪一种造法要比。「非」不用另外声明：¬A 就是「A → ⊥」的名字，是一个<wiki-ref to="definition"></wiki-ref>。', 'No way to make it, so its elimination rule needs no case at all, and is just ⟦⊥⟧ ⟹ ?R: from a contradiction, anything follows. Nor has the check any “no more” line: there is no way in to compare with. “Not” needs no declaration of its own: ¬A is a name for “A → ⊥”, a <wiki-ref to="definition"></wiki-ref>.'),
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
    ],
    intro: [{ t: T('你声明的「并且」，引入规则先要「下雨」、再要「刮风」。反过来写行不行？表格分得出来吗？', 'The “and” you declared takes “it rains” first, then “it is windy”. Would the other order do? Can the table tell?') }],
    brief: T('写一个先要「刮风」、再要「下雨」的「并且」。', 'Write an “and” that takes “it is windy” first, then “it rains”.'),
    hint: [T('把「刮风」接进「下雨」的「先假设」。', 'Wire “it is windy” into the “assumed first” of “it rains”.')],
    solution: isoBoard(['Wind>Rain', 'Rain>1']),
    naive: isoBoard(['Rain>Wind', 'Wind>1']),
    after: T('两种顺序，每种情况下都一样证得出，表格分不出来。可规则不一样：用它造「并且」时，交证明的顺序跟着变。证明核只认写下来的那一条。', 'In every situation the two orders prove it alike, and the table cannot tell them apart. The rules differ, though: making “and” with it, the proofs go in the other order. The kernel keeps to the rule written down.'),
  }),
  declared({
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
    intro: [{ t: T('声明出来的不一定是连接词。一件事怎样才算成立，只要说得出有哪几条引入规则，就能声明。', 'What is declared need not be a connective. Whatever counts as holding in a few ways to make it can be declared.') }],
    brief: T('安、博、赛三人投票，至少两人同意，提案就通过。写出「提案通过」的声明。', 'Ann, Bo and Cy vote; with at least two agreeing, the motion passes. Write the declaration of “the motion passes”.'),
    hint: [T('三条引入规则，每种是两个人同意，两张假设串起来。同一句可以拿好几张假设。', 'Three ways, each two people agreeing, two assumptions in a chain. One sentence may be on several cards.')],
    solution: isoBoard(['a1>b1', 'b1>1', 'b2>c2', 'c2>2', 'a3>c3', 'c3>3'], VOTE),
    naive: isoBoard(['a1>b1', 'b1>1', 'b2>c2', 'c2>2'], VOTE),
    after: T('三条引入规则，各要两个人。可换成「恰好一人同意」就写不出来了：引入规则只能说「有了什么就造得出」，说不了「有了什么就造不出」。', 'Three ways, two people each. “Exactly one agrees” cannot be written, though: a way can only say what makes it, never what stops it.'),
    take: {
      intro: [{ t: T('三条引入规则，各要两个人同意。拿到「提案通过」，又知道些什么？', 'Three ways in, two people agreeing in each. Holding “the motion passes”, what else do you know?') }],
      brief: T(`写出「提案通过」的消去规则：${CHECK.zh}。`, `Write the elimination rule of “the motion passes”: ${CHECK.en}.`),
      hint: [T('三种情况，各假设两个人同意，和三条引入规则一一对应。', 'Three cases, each assuming two people agree, one for each way in.')],
      solution: takeBoard([{ to: ANY, wires: ['a1>b1', 'b1>1', 'b2>c2', 'c2>2', 'a3>c3', 'c3>3'] }], VOTE),
      // Less: a case for each of the first two ways only. More: Ann agreeing, as if every way had her.
      naives: [takeBoard([{ to: ANY, wires: ['a1>b1', 'b1>1', 'b2>c2', 'c2>2'] }], VOTE), takeBoard([{ to: 'AnnYes' }])],
      after: T('知道提案通过，只知道三种两人组合里有一种同意了，却不知道是哪一种：连安有没有同意都不知道。', 'Knowing the motion passed, you know one of the three pairs agreed, not which: not even whether Ann did.'),
    },
    summary: T('一份新命题的引入规则和消去规则，和连接词的写法一样：几条来路，就是几种情况。', 'A new proposition’s ways in and its elimination rule are written as a connective’s are: as many ways in, so many cases.'),
  }),
  declared({
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
    intro: [{ t: T('⊥ 一条引入规则都没有。反过来，一句什么都不要、总证得出的话，该怎么声明？托盘里多了一张「不用假设」。', '⊥ has no way to make it. The other way round: how to declare a sentence that needs nothing and is always proved? The tray has a new card, “assume nothing”.') }],
    brief: T('「真」：不管手里有什么，甚至什么都没有，都证得出。写出它的声明。', 'True: proved whatever is at hand, even nothing at all. Write its declaration.'),
    hint: [T('一条引入规则，什么都不用：把「不用假设」接进引入规则 1。', 'One way that needs nothing: wire “assume nothing” into way 1.')],
    solution: isoBoard(['∅>1']),
    naive: isoBoard(['Rain>1']),
    after: T('一种空引入规则，常写成 ⊤。和 ⊥ 正好相反：⊥ 一条引入规则都没有，所以怎样都证不出；「真」有一种空引入规则，所以怎样都证得出。', 'One empty way in, often written ⊤. The very opposite of ⊥: ⊥ has no way in, so it is never proved; True has an empty one, so it always is.'),
    take: {
      intro: [{ t: T('「真」有一条空的引入规则。它的消去规则能拿回什么？', 'True has one way in that needs nothing. What does its elimination rule give back?') }],
      brief: T(`写出「真」的消去规则：${CHECK.zh}。`, `Write the elimination rule of True: ${CHECK.en}.`),
      hint: [T('一种情况，什么都不用假设：把「不用假设」接进情况 1。', 'One case that assumes nothing: wire “assume nothing” into case 1.')],
      solution: takeBoard([{ to: ANY, wires: ['∅>1'] }]),
      // More: ?R with no case to earn it.
      naives: [takeBoard([{ to: ANY }])],
      after: T('一种情况，什么都不假设：要从「真」推出 ?R，得先不靠任何东西推出 ?R。知道「真」，什么都没多知道。', 'One case assuming nothing: to get ?R from True, you must first get ?R from nothing at all. Knowing True, you know nothing more.'),
    },
    summary: T('⊥ 一条引入规则都没有，消去规则一种情况都不用写，什么都推得出；「真」一条空引入规则，消去规则就要一种空情况，什么都推不出。', '⊥: no way in, no case, anything follows. True: one empty way in, one empty case, nothing follows.'),
  }),
  declared({
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
    intro: [{ t: T('引入规则要的不必是一个字母。真值电路里的 ↔ 是两个方向都对：它要的是两句「若…则…」。', 'What a way takes need not be one letter. The ↔ of the truth circuits holds both ways round: it takes two “if … then …”s.') }],
    brief: T('「下雨当且仅当地湿」：两个方向的「若…则…」都在手里才证得出。写出它的声明。', '“It rains if and only if the ground is wet”: proved only with both “if … then …”s at hand. Write its declaration.'),
    hint: [T('两张假设分别假设两个方向，串成一条引入规则。', 'Two assumptions, one for each direction, chained into one way.')],
    solution: isoBoard(['f>g', 'g>1'], IFF),
    naive: isoBoard(['f>1', 'g>2'], IFF),
    after: T('一条引入规则，要两个方向。', 'One way in, taking both directions.'),
    take: {
      intro: [{ t: T('「当且仅当」一条引入规则要两句「若…则…」。它的消去规则拿回什么？', '“If and only if” has one way in, taking two “if … then …”s. What does its elimination rule give back?') }],
      brief: T(`写出「下雨当且仅当地湿」的消去规则：${CHECK.zh}。`, `Write the elimination rule of “it rains if and only if the ground is wet”: ${CHECK.en}.`),
      hint: [T('和「并且」一样：一种情况，假设那两句「若…则…」。', 'As for “and”: one case, assuming the two “if … then …”s.')],
      solution: takeBoard([{ to: ANY, wires: ['f>g', 'g>1'] }], IFF),
      // Less: one direction only.
      naives: [takeBoard([{ to: 'Rain → Wet' }])],
    },
    summary: T('一条引入规则，要两个方向，消去规则就一起交还两个方向：它和两个方向的「并且」一样。', 'One way in taking both directions, so the elimination rule hands both back together: it is an “and” of the two directions.'),
  }),
]

// Declarations further on, each just before the parts it brings are put to work. "There is", with the quantifiers: one
// way taking a thing and a proof about it; its case is Take the one there is. Equality: one way taking a thing alone,
// a = a; what takes it apart is rewriting, which is not the plain cases (= is a family of sentences indexed by things),
// so the level gives it. The numbers, before induction: 0 needs nothing, the next number needs a number; what takes
// a number apart, with the conclusion already used on the number it was made from, is induction.
export const thingDeclarations = [
  declared({
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
    ],
    intro: [
      { t: T('「对所有」不用声明：任取一样东西证出来，就是对所有东西证出来，这件事证明核本来就会。「存在」不一样：「∃y. y是人」怎样才算证出来？得有某一样东西，再有它是人的证明，比如「苏格拉底是人」。', '“For all” needs no declaration: proved for any thing taken, it is proved for all, and the kernel can do that already. “There is” is different: when is “∃y. y is human” proved? There has to be some thing, and a proof that it is human, such as “Socrates is human”.') },
      { t: T('托盘里多了一张「任取一样东西」：它取一样东西，叫它 x；接在它后面的假设可以提到 x。', 'The tray has a new card, “any thing”: it takes a thing and calls it x; the assumptions after it may mention x.') },
    ],
    brief: T('「存在一个人」：手里有某一样东西是人的证明，就证得出。写出它的声明。', '“There is a human”: proved with a proof that some thing is human at hand. Write its declaration.'),
    hint: [T('一条引入规则：先取一样东西，再接一张假设，选「x是人」，接进引入规则 1。', 'One way: take a thing first, then an assumption choosing “x is human”, into way 1.')],
    solution: isoBoard(['⋀x>h', 'h>1'], { h: 'Human(x)' }),
    naive: isoBoard(['h>1'], { h: 'Human(x)' }),
    after: T('一条引入规则要两样：一样东西，和它是人的证明。', 'One way in taking two things: a thing, and a proof that it is human.'),
    take: {
      intro: [{ t: T('「存在」的引入规则取一样东西和它是人的证明。拿到「∃y. y是人」，知道的是哪一样东西吗？', 'The way in of “there is” takes a thing and a proof that it is human. Holding “∃y. y is human”, do you know which thing?') }],
      brief: T(`写出「存在一个人」的消去规则：${CHECK.zh}。`, `Write the elimination rule of “there is a human”: ${CHECK.en}.`),
      hint: [T('不知道是哪一样，就任取一样东西：一种情况，先任取一样东西，再假设它是人。', 'Not knowing which, take any thing: one case, any thing first, then assume it is human.')],
      solution: takeBoard([{ to: ANY, wires: ['⋀x>h', 'h>1'] }], { h: 'Human(x)' }),
      // More: a case that assumes a particular x was handed in.
      naives: [takeBoard([{ to: ANY, wires: ['h>1'] }], { h: 'Human(x)' })],
      after: T('交进去的是苏格拉底还是安，消去的时候不知道，所以那种情况只能对任取的一样东西成立：用「存在」时，那一样东西要起一个新名字。', 'Whether Socrates or Ann went in, eliminating cannot tell, so the case must hold for any thing taken: using “there is”, that thing gets a new name.'),
    },
    summary: T('证明板上从此有了举例（这条引入规则）和拿出那一个（这条消去规则）。', 'The proof board now has Example (this way in) and Take the one there is (this elimination rule).'),
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

// Chapter 12 · The elimination rule generator: every elimination rule written by hand so far has one shape, and each
// had to be checked. The player builds, on a machine board whose wires carry rules (elimgen.js), the piece of the
// kernel that makes it from the ways in: for one way in, then for a list of them (For each); the generator built, ⊥'s
// rule and "there is"'s come of it unchanged.
export const generators = [
  generator({
    id: 'gen-one',
    single: true,
    title: T('拆开它', 'Taking it apart'),
    // The parts that take rules apart and put them together.
    adds: RULECRAFT,
    tests: [DECLS.and, DECLS.three, DECLS.iff, DECLS.truth, DECLS.ex],
    intro: [
      { t: T('<level-ref to="decl-and"></level-ref>以来，你手写过好几条<wiki-ref to="elim-rule"></wiki-ref>，每一条都要过检查，写出来的形状却都一样。照着同一个办法做了这么多遍，就该把它交给证明助手：这一关在证明核里搭出由引入规则生成消去规则的那一块。', 'Since <level-ref to="decl-and"></level-ref> you have written several <wiki-ref to="elim-rule"></wiki-ref>s by hand, each through the check, all of one shape. Done the same way so many times, it is for the proof assistant to do: this level builds the piece of the kernel that makes an elimination rule from the ways in.') },
      { t: T('这块板上，线上传的是规则本身。两个输入：一个是声明的那句话，字母换成了 ?A、?B，因为生成的规则要对任何句子都成立；一个是声明写的那条<wiki-ref to="intro-rule"></wiki-ref>。托盘里的元件把规则拆开、拼起来。每组测试是一份只有一条引入规则的声明和它的消去规则，?R 是任意一句话。', 'On this board the wires carry rules themselves. Two inputs: the declared sentence, its letters turned into ?A and ?B, since the rule made must hold for any sentences; and the <wiki-ref to="intro-rule"></wiki-ref> the declaration wrote. The parts in the tray take rules apart and put them together. Each test is a declaration with one way in, and its elimination rule, ?R being any sentence at all.') },
    ],
    brief: T('设计一个证明助手：由只有一条引入规则的声明，生成它的消去规则。', 'Design a proof assistant that makes the elimination rule of a declaration with one way to make it.'),
    hint: [
      T('消去规则的第一条前提就是「它」，结论是 ?R。', 'The elimination rule’s first premise is “it”, and it concludes ?R.'),
      T('另一条前提，就是那条引入规则把结论换成 ?R。', 'Its other premise is the way in with its conclusion put as ?R.'),
      T('把「它」放在那条前提前面，再和 ?R 组成一条规则。', 'Put “it” in front of that premise, and make a rule of them with ?R.'),
    ],
    solution: machine({ r: ['anyR'], s: ['swapConcl'], c: ['consFront'], m: ['mkRule'] }, ['ways>s.rule', 'r>s.to', 'it>c.first', 's>c.rest', 'c>m.premises', 'r>m.conclusion', 'm>out'], { inputs: ['it', 'ways'] }),
    after: T('引入规则怎样把东西交进去，消去规则就怎样把它们交还：把引入规则的结论换成 ?R，就是一种情况。取东西的引入规则（⋀x）原样带进情况，一点不用改。', 'As the way in hands things over, the elimination rule hands them back: the way in with its conclusion put as ?R is a case. A way in that takes a thing (⋀x) goes into the case as it is, unchanged.'),
  }),
  generator({
    id: 'gen-each',
    title: T('每一条', 'One for each'),
    builds: 'elimGen',
    adds: [...RULECRAFT, 'eachOf'],
    tests: [DECLS.and, DECLS.or, DECLS.three, DECLS.oneOfThree, DECLS.iff, DECLS.truth, DECLS.ex, DECLS.bot],
    intro: [{ t: T('<level-ref to="gen-one"></level-ref>搭的电路只认一条引入规则。「或者」有两条，这一次输入的引入规则是一串，而「换结论」只接得下一条规则：一串里的每一条都要各做一遍。新元件「每条」是这样一个框：它开出一串里的一样，框里接出的东西送回「结果」；每一样各做一遍，结果按原来的次序排成一串。这台电路通过以后，就是证明核的消去规则生成器。', 'The board of <level-ref to="gen-one"></level-ref> takes one way in. “Or” has two, so this time the ways in come as a list, and Swap conclusion takes one rule only: each rule of the list must be done in turn. The new part For each is such a frame: it opens with one item of a list, and what is made inside goes back into “result”; each item in turn, the results a list in the same order. Once it passes, this board is the kernel’s elimination rule generator.') }],
    brief: T('设计一个证明助手：由一份声明的一串引入规则，生成它的消去规则。', 'Design a proof assistant that makes a declaration’s elimination rule from its list of ways in.'),
    hint: [
      T('每条引入规则都变成一条前提：把它的结论换成 ?R。', 'Every way in becomes a premise: its conclusion put as ?R.'),
      T('「换结论」放进「每条」框里；?R 从框外接进去也行。', 'Put Swap conclusion inside For each; ?R may come in from outside the frame.'),
    ],
    solution: GENERATOR,
    after: T('一条引入规则一种情况，一条不多，一条不少。⊥ 一条引入规则都没有，「每条」一次也不做，得出 ⟦⊥⟧ ⟹ ?R，电路一点不用改。这块电路现在是<part-ref to="lemma:elimGen"></part-ref>：Lean 的内核也是这样由每个构造子生成<wiki-ref to="recursor"></wiki-ref>的一种情况，所以它不让你手写消去规则，也就不用检查。', 'One case for each way in, none more, none fewer. ⊥ has no way in, so For each runs not once and the board gives ⟦⊥⟧ ⟹ ?R without a change. This board is now the <part-ref to="lemma:elimGen"></part-ref>: Lean’s kernel too makes one case of a <wiki-ref to="recursor"></wiki-ref> from each constructor, which is why it never lets you write an elimination rule, and has nothing to check.'),
  }),
]

export const natDeclaration = [
  {
    id: 'decl-nat',
    title: T('声明自然数', 'Declaring the numbers'),
    declare: T('自然数', 'a number'),
    target: 'Nat',
    sentences: ['Nat'],
    tray: ['hyp', 'none'],
    // Its elimination rule (mathematical induction) is still the level's own: the generator has no induction
    // hypothesis yet (games/qed/DESIGN.md, chapter 12's work list).
    take: { premises: ['?P(zero)', '⋀n. ⟦?P(n)⟧ ⟹ ?P(s(n))'], conclusion: '?P(?n)' },
    tasks: [
      declare({
        step: T('写引入规则', 'Its ways in'),
        tests: [
          { have: {}, make: true },
          { have: { Nat: 1 }, make: true, uses: ['Nat'] },
        ],
        brief: T('自然数：什么都没有，也造得出一个（0）；手里有一个数，就造得出它的下一个。写出它的声明。', 'A number: one can be made from nothing (0); with a number at hand, the next one can be made. Write its declaration.'),
        hint: [T('两条引入规则：一种什么都不用假设；另一种假设「自然数」，要的正是一个数。', 'Two ways: one assumes nothing; the other assumes “a number”, taking just a number.')],
        solution: isoBoard(['∅>1', 'Nat>2']),
        naive: isoBoard(['∅>1']),
        after: T('两条引入规则：0 什么都不要，S 要一个数，造出它的下一个，写作 nat = 0 | S nat。', 'Two ways: 0 takes nothing, S takes a number and makes the next, written nat = 0 | S nat.'),
      }),
      generator({
        step: T('交给生成器', 'To the generator'),
        tests: [DECLS.nat],
        intro: [{ t: T('自然数的消去规则，交给<part-ref to="lemma:elimGen"></part-ref>去生成，看它给出什么。', 'Hand the numbers’ elimination rule to the <part-ref to="lemma:elimGen"></part-ref> and see what it gives.') }],
        brief: T('设计一个证明助手：生成自然数的消去规则。', 'Design a proof assistant that makes the elimination rule of the numbers.'),
        hint: [T('放上消去规则生成器，把两个输入接进去。', 'Put down the elimination rule generator and wire both inputs into it.')],
        solution: machine({ g: ['elimGen'] }, ['it>g.it', 'ways>g.ways', 'g>out'], { inputs: ['it', 'ways'] }),
      }),
    ],
    intro: [{ t: T('化简器把 0、S 0 当现成的东西来算。它们从哪里来？和「并且」一样，靠声明：一个自然数有哪几条引入规则？', 'The simplifier works with 0 and S 0 as if they were just there. Where do they come from? As with “and”, from a declaration: what are the ways to make a number?') }],
    after: T('生成器给出的只是按情况分：拿到一个数，知道它是 0，或者是某一个数的下一个，却用不上那一个数。可第二条引入规则要的正是一个自然数，所以拆开一个数时，还能先对那个数用上要证的结论：这就是归纳假设。生成器还不会写它，这一次的消去规则由声明直接给出，就是数学归纳法，下面就用这个声明给出的规则。', 'The generator gives only cases: holding a number, you know it is 0 or the next of some number, but cannot use that number. Yet the second way takes a number itself, so taking a number apart may first use what is being proved on that number: the induction hypothesis. The generator cannot write that yet, so this time the elimination rule is the declaration’s own, mathematical induction, and what follows uses the rules this declaration gives.'),
  },
]
