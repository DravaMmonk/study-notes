// Chapter 3, second half · Declarations: the kernel has Apply and the box, and no "and", "or" or "contradiction".
// A connective comes in by a declaration, the way Lean declares one (`structure And`, `inductive Or`, `inductive
// False`): its ways to make it, each a rule written with the assumption cards (iso.js). Chained cards are one way that
// needs both; cards each into a way of their own are separate ways; no card wired is no way at all. The kernel makes a case to take it apart
// for every way, and each situation tests the declaration against what the connective means.
import { isoBoard } from '../../kit/domains/logic/iso.js'

const T = (zh, en) => ({ zh, en })
const declare = (level) => ({ kind: 'iso', ...level })
const AND = { letters: ['Rain', 'Wind'] }
const OR = { letters: ['Sat', 'Sun'] }
const BOT = { letters: ['Rain'] }

export const declarations = [
  declare({
    id: 'decl-and',
    title: T('声明「并且」', 'Declaring “and”'),
    declare: T('并且', 'and'),
    target: 'Rain ∧ Wind',
    ...AND,
    tests: [
      { have: { Rain: 1, Wind: 2 }, make: true },
      { have: { Rain: 3 }, make: false },
      { have: { Wind: 4 }, make: false },
      { have: {}, make: false },
    ],
    intro: [
      { t: T('证明核里只有套用和假设框，没有「并且」。一个新的连接词要先<wiki-ref to="declaration"></wiki-ref>：写出它有哪几种造法。每种造法是一条新规则，用假设来写：「假设下雨，再假设刮风，就得到『下雨并且刮风』」。', 'The kernel has only Apply and the assumption box; there is no “and”. A new connective first needs a <wiki-ref to="declaration"></wiki-ref>: its ways to make it, written out. Each way is a new rule, written with assumptions: “assume it rains, then assume it is windy, and you have ‘it rains and it is windy’”.') },
      { t: T('一张假设接进另一张的「再假设」，是同一种造法要两样；两张假设各接一个造法口，是两种造法。造法接进连接词以后，核替每一种造法生成一个拆法，拆法取回那种造法交进去的证明。', 'An assumption wired into another’s “then assume” is one way that needs both; two assumptions each in a way of their own are two ways. Once a way goes into the connective, the kernel makes a case for it, which gets back the proofs that way took.') },
    ],
    brief: T('「下雨，并且刮风」：两份证明都在手里，才证得出。写出它的声明。', '“It rains and it is windy”: proved only with both proofs at hand. Write its declaration.'),
    hint: [
      T('只有一种造法，要两样：把「刮风」接进「下雨」的「再假设」。', 'One way, needing both: wire “it is windy” into the “then assume” of “it rains”.'),
      T('再把「下雨」接进「并且」的造法 ①。', 'Then wire “it rains” into way ① of “and”.'),
    ],
    solution: isoBoard(['Wind>Rain', 'Rain>1'], AND),
    naive: isoBoard(['Rain>1', 'Wind>2'], AND),
    after: T('一种造法：下雨 → 刮风 → 下雨并且刮风，就是 Lean 的 <code>And.intro</code>。核为它生成了一个拆法，取回交进去的两份证明；两份不全，它就证不出。这条规则不是证出来的：「并且」原本不存在，它是新的规则本身。写成证明，它就是两层假设框，只是框里不用证，结论由声明直接给出。', 'One way: it rains → it is windy → it rains and it is windy, Lean’s <code>And.intro</code>. The kernel made one case for it, which gets back the two proofs handed in; without both, it is not proved. This rule was not proved: “and” did not exist before, so the rule is new in itself. Written as a proof it would be two assumption boxes, with nothing to prove inside: the declaration gives the conclusion.'),
  }),
  declare({
    id: 'decl-or',
    title: T('声明「或者」', 'Declaring “or”'),
    declare: T('或者', 'or'),
    target: 'Sat ∨ Sun',
    ...OR,
    tests: [
      { have: { Sat: 1 }, make: true },
      { have: { Sun: 2 }, make: true },
      { have: { Sat: 3, Sun: 4 }, make: true },
      { have: {}, make: false },
    ],
    brief: T('「今天是周六，或者今天是周日」：手里有其中一份证明就证得出，两份都有也行。写出它的声明。', '“Today is Saturday or today is Sunday”: proved with either proof at hand, and with both. Write its declaration.'),
    hint: [T('两种造法，各要一样：两张假设不串，各接一个造法口。', 'Two ways, each needing one: no chain, each assumption into a way of its own.')],
    solution: isoBoard(['Sat>1', 'Sun>2'], OR),
    naive: isoBoard(['Sun>Sat', 'Sat>1'], OR),
    after: T('两种造法，就有两个拆法：Lean 的 <code>Or.inl</code>、<code>Or.inr</code>。拿到一份「或者」的证明，不知道是哪种造法造的，只好两个拆法都准备好，看实际是哪一种就走哪一个：这就是分情况。', 'Two ways, so two cases: Lean’s <code>Or.inl</code> and <code>Or.inr</code>. Holding a proof of “or”, you do not know which way made it, so both cases stand ready, and the one it was made by is taken: that is “case by case”.'),
  }),
  declare({
    id: 'decl-bot',
    title: T('声明 ⊥', 'Declaring ⊥'),
    declare: T('矛盾', 'contradiction'),
    symbols: ['⊥'],
    target: '⊥',
    ...BOT,
    tests: [
      { have: { Rain: 1 }, make: false },
      { have: {}, make: false },
    ],
    brief: T('矛盾 ⊥：一句不管手里有什么，都证不出来的话。写出它的声明。', 'The contradiction ⊥: a sentence that cannot be proved whatever is at hand. Write its declaration.'),
    hint: [T('怎样都证不出，就是一种造法都没有。', 'Never proved means no way to make it.')],
    solution: isoBoard([], BOT),
    naive: isoBoard(['Rain>1'], BOT),
    after: T('一种造法都没有，就一个拆法都没有（Lean 的 <code>inductive False</code>）。用它的时候，要对每一种造法各准备一个办法，可一种都没有，所以什么都不用准备：有了矛盾，想要什么都行。至于「非」，¬A 只是「A → ⊥」的名字，是一个<wiki-ref to="definition"></wiki-ref>，不用另外声明。', 'No way to make it, so no case to take it apart (Lean’s <code>inductive False</code>). Using it means readying one move for each way, and there are none, so there is nothing to ready: from a contradiction, anything follows. As for “not”, ¬A is only a name for “A → ⊥”, a <wiki-ref to="definition"></wiki-ref>, with nothing more to declare.'),
  }),
]
