// Chapter 5 · The language of quantifiers and counterexamples: what first-order sentences say and when they are true,
// before any proof. Two lines: translating (names and predicates, every, some, one inside another) and worlds (true in
// one, false in another; a world where the given holds and the claim fails, which is what nitpick looks for; which
// quantifier comes first). The family topic asks a world questions.

const T = (zh, en) => ({ zh, en })
const consts = ['soc', 'ann', 'bo', 'cy', 'dee', 'en', 'fay']

// Two families, for the queries: who is whose parent, and who goes to school.
const FAMILY_ONE = {
  title: T('第一家', 'The first family'),
  things: ['ann', 'bo', 'cy', 'dee', 'en'],
  preds: { Parent: [['ann', 'bo'], ['ann', 'cy'], ['bo', 'dee'], ['cy', 'en']], School: ['dee'] },
}
const FAMILY_TWO = {
  title: T('第二家', 'The second family'),
  things: ['ann', 'bo', 'cy', 'dee', 'en', 'fay'],
  preds: { Parent: [['bo', 'ann'], ['ann', 'cy'], ['ann', 'dee'], ['cy', 'en'], ['dee', 'fay']], School: ['cy', 'dee', 'en', 'fay'] },
}
export const families = [FAMILY_ONE, FAMILY_TWO]
const query = (level) => ({ kind: 'query', consts, worlds: families, ...level })
// A translation level: one sentence per task, each built from the same chips (every sentence's words, and the decoys).
const STEPS = [T('第一句', 'Sentence 1'), T('第二句', 'Sentence 2'), T('第三句', 'Sentence 3')]
const sentences = (list, decoys = []) => list.map((task, k) => ({ kind: 'translate', step: STEPS[k], decoys: [...list.filter((_, j) => j !== k).map((t) => t.target), ...decoys], ...task }))
const BRIEF = T('用下面的块，把这句话拼成公式。', 'Build this sentence as a formula from the pieces below.')

export const quantifiers = [
  {
    id: 'fo-atoms',
    consts,
    title: T('谁是什么', 'Who is what'),
    tasks: sentences([
      { say: T('苏格拉底是人。', 'Socrates is human.'), target: 'Human(soc)', hint: [T('放上谓词「①是人」，再把苏格拉底放进 ①。', 'Put down the predicate “① is human”, then put Socrates in ①.')] },
      { say: T('安是博的父母。', 'Ann is a parent of Bo.'), target: 'Parent(ann, bo)', hint: [T('「①是②的父母」：谁是 ①，谁是 ②？', '“① is a parent of ②”: who is ①, and who is ②?')] },
      { say: T('博不喜欢安。', 'Bo does not like Ann.'), target: '¬Likes(bo, ann)', hint: [T('最外面是「并非」：先放 ¬，再在它里面放「喜欢」。', 'The outermost piece is “not”: put ¬ first, then “likes” inside it.')] },
    ], ['Mortal(soc)']),
    brief: BRIEF,
    intro: [
      { t: T("命题逻辑中的字母代表整个命题：若要分别表示每个人是否为骑士，需要为每个人使用不同字母。要表达「每个人」或「有一个人」，需要引入量词。", "A propositional letter represents a whole proposition: expressing whether each person is a knight requires a separate letter for each person. To express “everyone” or “someone”, we need quantifiers.") },
      { t: T("本章引入<wiki-ref to=\"fol\"></wiki-ref>：<b>名字</b>指称对象，<wiki-ref to=\"predicate\"></wiki-ref>表达对象的性质或关系。例如「苏格拉底是人」写作 Human(soc)。", "This chapter introduces <wiki-ref to=\"fol\"></wiki-ref>: a <b>name</b> denotes an object and a <wiki-ref to=\"predicate\"></wiki-ref> expresses a property or relation. For example, “Socrates is human” is written Human(soc).") },
      { t: T("本章先学习如何构造公式，以及如何在给定的世界中判断真假。请使用下方的块拼写公式；块中未填的位置可以继续放入其他块。", "This chapter first covers how to construct formulas and evaluate them in a given world. Build each formula using the blocks below; empty positions in a block can be filled with other blocks.") },
    ],
    after: T('一句话拆成了名字和谓词，同一个谓词可以说任何东西：Human(soc)、Human(ann)。谓词的位置有先后：Parent(ann, bo) 和 Parent(bo, ann) 是两回事。', 'A sentence comes apart into names and predicates, and one predicate can be said of anything: Human(soc), Human(ann). A predicate’s places have an order: Parent(ann, bo) and Parent(bo, ann) are different things.'),
  },
  {
    id: 'fo-all',
    consts,
    symbols: ['∀'],
    title: T('对所有 ∀', 'For all ∀'),
    tasks: sentences([
      {
        say: T('人都会死。', 'Every human is mortal.'),
        target: '∀x. Human(x) → Mortal(x)',
        hint: [
          T('「人都会死」：对每一样东西 x，如果 x 是人，那么 x 会死。', '“Every human is mortal”: for every thing x, if x is human then x is mortal.'),
          T('写成「x 是人 ∧ x 会死」，说的是世上每一样东西都是人。', 'Writing “x is human ∧ x is mortal” says every thing in the world is human.'),
        ],
      },
      { say: T('每个人都喜欢安。', 'Everyone likes Ann.'), target: '∀x. Human(x) → Likes(x, ann)', hint: [T('和「人都会死」一个形状：对所有 x，若 x 是人，则……', 'The same shape as “every human is mortal”: for every x, if x is human, then …')] },
      { say: T('安喜欢每一个人。', 'Ann likes everyone.'), target: '∀x. Human(x) → Likes(ann, x)', hint: [T('这回 x 是被喜欢的那一个：在「①喜欢②」里，它在哪个位置？', 'This time x is the one liked: in “① likes ②”, which place is it?')] },
    ]),
    brief: BRIEF,
    intro: [
      { t: T("全称<wiki-ref to=\"quantifier\"></wiki-ref> <b>∀</b>读作「对所有」：∀x. P(x) 表示论域中的每个对象 x 都满足 P。x 是受该量词约束的变量。", "The universal <wiki-ref to=\"quantifier\"></wiki-ref> <b>∀</b> is read “for all”: ∀x. P(x) states that every object x in the domain satisfies P. The variable x is bound by the quantifier.") },
      { t: T("如果公式写错，检查器可能给出一个小世界，显示你写的公式与目标在其中的真值不同。", "If the formula is wrong, the checker may find a small world where its truth value differs from the target.") },
    ],
    after: T('∀ 管的是世上所有的东西，不只是人，所以「人都会死」要带上条件：是人的，才会死。∀ 和 → 总是一起出现：这是一阶逻辑最常见的写法。', '∀ covers every thing in the world, not just people, so “every human is mortal” needs a condition: being human, it is mortal. ∀ and → come together: the most common pattern of first-order logic.'),
  },
  {
    id: 'fo-some',
    consts,
    symbols: ['∃'],
    title: T('存在 ∃', 'There exists ∃'),
    tasks: sentences([
      {
        say: T('有的鸟不会飞。', 'Some bird does not fly.'),
        target: '∃x. Bird(x) ∧ ¬Flies(x)',
        hint: [
          T('「有的鸟不会飞」：有一样东西 x，x 是鸟，并且 x 不会飞。', '“Some bird does not fly”: there is a thing x that is a bird and does not fly.'),
          T('写成「x 是鸟 → x 不会飞」，只要世上有一样不是鸟的东西，这句就成立了。', 'Writing “x is a bird → x does not fly” is made true by anything at all that is not a bird.'),
        ],
      },
      { say: T('有人喜欢安。', 'Someone likes Ann.'), target: '∃x. Human(x) ∧ Likes(x, ann)', hint: [T('有一样东西 x，x 是人，并且……', 'There is a thing x that is human, and …')] },
      { say: T('没有人喜欢博。', 'Nobody likes Bo.'), target: '¬∃x. Human(x) ∧ Likes(x, bo)', hint: [T('「没有人」就是「并非有一个人」：最外面先放 ¬。', '“Nobody” is “not someone”: put ¬ outermost first.')] },
    ]),
    brief: BRIEF,
    intro: [{ t: T('新符号 <b>∃</b>，读作「存在」：∃x. P(x) 说的是，世上至少有一样东西 x，P(x) 成立。', 'A new symbol, <b>∃</b>, read “there exists”: ∃x. P(x) says there is at least one thing x with P(x).') }],
    after: T('∃ 配 ∧，∀ 配 →，正好反过来。「没有人喜欢博」可以写成「¬∃x…」，也可以写成「∀x. x 是人 → ¬x 喜欢博」：两个写法在每个世界里都一样。', '∃ goes with ∧, ∀ with →: the other way round. “Nobody likes Bo” can be “¬∃x …” or “∀x. x is human → ¬x likes Bo”: the two agree in every world.'),
  },
  {
    id: 'fo-nested',
    consts,
    title: T('量词套量词', 'One inside another'),
    tasks: sentences([
      { say: T('每个人都有父母。', 'Everyone has a parent.'), target: '∀x. Human(x) → ∃y. Parent(y, x)', hint: [T('里面那个量词用另一个变量 y：x 的父母是谁？有一个就行。', 'The inner quantifier takes another variable, y: who is x’s parent? Some y, that is all.')] },
      { say: T('有个人喜欢任何人。', 'Someone likes everyone.'), target: '∃x. Human(x) ∧ ∀y. Human(y) → Likes(x, y)', hint: [T('外面是有一个 x，里面是对所有 y。', 'Outside, some x; inside, every y.')] },
      { say: T('每个人都喜欢某个人。', 'Everyone likes someone.'), target: '∀x. Human(x) → ∃y. Human(y) ∧ Likes(x, y)', hint: [T('外面是对所有 x，里面是有一个 y；y 也得是人。', 'Outside, every x; inside, some y, and y must be human too.')] },
    ]),
    brief: BRIEF,
    intro: [{ t: T('一个量词里面还可以有量词。每个量词有自己的变量，管到它后面的整段：∀x. … ∃y. … 里，x 和 y 各指各的。被某个量词管着的变量是<wiki-ref to="bound"></wiki-ref>；没有量词管着的是<wiki-ref to="free"></wiki-ref>，那句话就说不清在讲谁。', 'A quantifier may hold another. Each has its own variable and reaches over everything after it: in ∀x. … ∃y. …, x and y each stand for their own thing. A variable some quantifier covers is a <wiki-ref to="bound"></wiki-ref>; one no quantifier covers is a <wiki-ref to="free"></wiki-ref>, and then the sentence does not say whom it means.') }],
    after: T('「有个人喜欢任何人」和「每个人都喜欢某个人」只差量词的先后，意思却差得远：前一句是同一个人喜欢所有人，后一句是每人各有各喜欢的人。', '“Someone likes everyone” and “everyone likes someone” differ only in the order of quantifiers, yet mean very different things: one person who likes all, or each with someone of their own.'),
  },
  {
    id: 'm-world',
    consts,
    symbols: ['∀'],
    title: T('真假看世界', 'True in one world'),
    tasks: [
      {
        kind: 'model',
        step: T('让它为真', 'Make it true'),
        want: [{ f: '∀x. Human(x) → Mortal(x)', value: true }, { f: '∃x. Human(x)', value: true }],
        answer: { size: 2, preds: { Human: ['0'], Mortal: ['0'] } },
        brief: T('造一个世界：里面有人，而且人都会死。', 'Build a world with some human in it, where every human is mortal.'),
        hint: [T('点一样东西，它就「是人」；再点一下，就不是。', 'Tap a thing to make it human; tap again to undo.')],
      },
      {
        kind: 'model',
        step: T('让它为假', 'Make it false'),
        want: [{ f: '∀x. Human(x) → Mortal(x)', value: false }],
        answer: { size: 1, preds: { Human: ['0'] } },
        brief: T('再造一个世界，让「人都会死」为假。', 'Now build a world where “every human is mortal” is false.'),
        hint: [T('一样反例就够：一个不会死的人。', 'One counterexample is enough: a human who is not mortal.')],
        after: T('要让「对所有」为假，只要一样反例。', 'To make “for all” false takes just one counterexample.'),
      },
    ],
    intro: [
      { t: T('命题逻辑里，一句话的真假看真值表的哪一行。一阶逻辑里，看的是<wiki-ref to="world"></wiki-ref>：世界里有几样东西，每样东西是什么、和别的东西是什么关系。', 'In propositional logic, whether a sentence is true depends on the row of the truth table. In first-order logic it depends on the <wiki-ref to="world"></wiki-ref>: how many things there are, what each is and how they relate.') },
      { t: T('这一关自己造世界：选好有几样东西，再点出每样东西有哪些性质。下面列着要的句子，旁边是它在这个世界里的真假。', 'In this level you build worlds: choose how many things there are, then tap what holds of each. The sentences asked for are listed below, each with whether it is true in this world.') },
    ],
    after: T('同一句话，在一个世界里真，在另一个世界里假。一句话永远成立，就是在所有世界里都真，这样的世界有无穷多个，大小不限。', 'The same sentence is true in one world and false in another. A sentence that “always holds” is true in every world, and there are infinitely many of those, of any size.'),
  },
  {
    id: 'm-make',
    kind: 'model',
    consts,
    symbols: ['∃'],
    title: T('同时都对', 'All at once'),
    want: [
      { f: '∃x. Bird(x)', value: true },
      { f: '∀x. Bird(x) → Flies(x)', value: false },
      { f: '∃x. Flies(x) ∧ ¬Bird(x)', value: true },
    ],
    answer: { size: 2, preds: { Bird: ['0'], Flies: ['1'] } },
    brief: T('造一个世界，让三句话的真假都正合要求。', 'Build a world where all three sentences come out as asked.'),
    hint: [T('要有一只不会飞的鸟，还要有一样会飞、却不是鸟的东西。', 'You need a bird that does not fly, and something that flies but is not a bird.')],
    after: T('几句话能同时成立，就是有一个世界让它们都成立：这叫<wiki-ref to="satisfiable"></wiki-ref>。', 'Several sentences hold together when some world makes them all true; this is <wiki-ref to="satisfiable"></wiki-ref>.'),
  },
  {
    id: 'm-counter',
    kind: 'model',
    consts,
    title: T('推不出', 'Does not follow'),
    want: [
      { f: '∀x. Human(x) → Mortal(x)', value: true },
      { f: 'Mortal(soc)', value: true },
      { f: 'Human(soc)', value: false },
    ],
    answer: { size: 1, preds: { Mortal: ['0'] }, consts: { soc: 0 } },
    brief: T('「人都会死」「苏格拉底会死」，推得出「苏格拉底是人」吗？造一个世界：前两句真，第三句假。', 'From “every human is mortal” and “Socrates is mortal”, does “Socrates is human” follow? Build a world where the first two are true and the third false.'),
    hint: [T('苏格拉底也可以是一条会死的狗。', 'Socrates could be a mortal dog.')],
    intro: [{ t: T('名字也要在世界里指一样东西：选好「苏格拉底」是哪一样。', 'A name must stand for a thing in the world too: choose which thing is Socrates.') }],
    after: T('前提都真、结论为假的世界叫<wiki-ref to="countermodel"></wiki-ref>：有一个，就说明结论推不出来。证明器的反模型面板找的就是它；这一关你亲手造了一个。', 'A world where the premises hold and the conclusion fails is a <wiki-ref to="countermodel"></wiki-ref>: one is enough to show the conclusion does not follow. The prover’s countermodel panel looks for exactly this; here you built one by hand.'),
  },
  {
    id: 'm-order',
    kind: 'model',
    consts,
    title: T('先说谁', 'Which comes first'),
    want: [
      { f: '∀x. ∃y. Likes(x, y)', value: true },
      { f: '∃y. ∀x. Likes(x, y)', value: false },
    ],
    answer: { size: 2, preds: { Likes: ['0,0', '1,1'] } },
    brief: T('造一个世界：每样东西都喜欢某样东西，却没有一样东西被所有东西喜欢。', 'Build a world where everything likes something, yet nothing is liked by everything.'),
    hint: [
      T('把它想成一个游戏：∀ 由对手挑，∃ 由你挑。第一句是对手先挑 x，你再挑 y；第二句是你先挑 y，对手再挑 x。', 'Think of it as a game: the opponent picks for ∀, you pick for ∃. In the first, the opponent picks x first, then you pick y; in the second you pick y first, then the opponent picks x.'),
      T('每样东西各喜欢自己就行。', 'Let each thing like itself.'),
    ],
    after: T('∀x∃y：每个人各有喜欢的，可以各不相同。∃y∀x：有同一样东西，人人都喜欢。前一句推不出后一句；后一句推得出前一句。', '∀x∃y: each has something liked, possibly different. ∃y∀x: one and the same thing is liked by all. The first does not give the second; the second gives the first.'),
  },
  {
    id: 'p-only',
    consts,
    title: T('只有', 'Only'),
    tasks: sentences([
      { say: T('只有鸟会飞。', 'Only birds fly.'), target: '∀x. Flies(x) → Bird(x)', hint: [T('「只有鸟会飞」：会飞的，一定是鸟。哪边是条件？', '“Only birds fly”: whatever flies is a bird. Which side is the condition?')] },
      { say: T('不是所有鸟都会飞。', 'Not every bird flies.'), target: '¬∀x. Bird(x) → Flies(x)', hint: [T('最外面是 ¬，管着一整句「鸟都会飞」。', 'The outermost piece is ¬, over the whole of “every bird flies”.')] },
      { say: T('会飞的都不是人。', 'Nothing that flies is human.'), target: '∀x. Flies(x) → ¬Human(x)', hint: [T('对所有 x，若 x 会飞，则……', 'For every x, if x flies, then …')] },
    ]),
    brief: BRIEF,
    after: T('「只有鸟会飞」和「鸟都会飞」箭头方向相反，最容易译反。「不是所有鸟都会飞」和「有的鸟不会飞」在每个世界里都一样：¬∀ 就是 ∃¬。', '“Only birds fly” and “every bird flies” point the arrow opposite ways, and are the easiest to get backwards. “Not every bird flies” and “some bird does not fly” agree in every world: ¬∀ is ∃¬.'),
  },
  {
    id: 'p-split',
    kind: 'model',
    consts,
    title: T('∀ 不能随便拆', 'Splitting ∀'),
    want: [
      { f: '∀x. Bird(x) → Flies(x)', value: false },
      { f: '(∀x. Bird(x)) → (∀x. Flies(x))', value: true },
    ],
    answer: { size: 2, preds: { Bird: ['0'] } },
    brief: T('两句话看着像：「鸟都会飞」和「要是什么都是鸟，那什么都会飞」。造一个世界，让第一句假、第二句真。', 'Two sentences that look alike: “every bird flies” and “if everything is a bird, then everything flies”. Build a world where the first is false and the second true.'),
    hint: [T('第二句的条件「什么都是鸟」，只要有一样东西不是鸟，就不成立。', 'The second sentence’s condition, “everything is a bird”, fails as soon as one thing is not a bird.')],
    after: T('∀ 套在一整个「若…则…」外面，和分别套在两边，说的不一样。从前一句推得出后一句，反过来不行。', '∀ over a whole if…then and ∀ on each side say different things. The first gives the second; not the other way round.'),
  },
  {
    id: 'p-exAnd',
    kind: 'model',
    consts,
    title: T('∃ 也不能随便拆', 'Splitting ∃'),
    want: [
      { f: '(∃x. Bird(x)) ∧ (∃x. Flies(x))', value: true },
      { f: '∃x. Bird(x) ∧ Flies(x)', value: false },
    ],
    answer: { size: 2, preds: { Bird: ['0'], Flies: ['1'] } },
    brief: T('造一个世界：有鸟，也有会飞的东西，可是没有会飞的鸟。', 'Build a world with a bird and with something that flies, yet no bird that flies.'),
    hint: [T('两个 ∃ 可以指两样不同的东西。', 'The two ∃s may point at two different things.')],
    after: T("将两个存在命题分别合取时，它们的见证可以不同；将合取放在同一个存在量词下时，则要求同一个见证。量词能否分配还取决于连接词和推导方向。", "In a conjunction of two existential propositions, the witnesses may differ; an existential over a conjunction requires one common witness. Whether a quantifier distributes also depends on the connective and direction."),
  },
  // Topic: asking a family tree questions. One sentence with a free x is a query; the world answers with what it picks.
  query({
    id: 'q-children',
    title: T('谁是安的孩子', 'Who are Ann’s children'),
    say: T('x 是安的孩子。', 'x is a child of Ann.'), target: 'Parent(ann, x)',
    decoys: ['School(x)'],
    brief: T('拼一句带着 x 的话，在每一家里，让它正好选中安的孩子。', 'Build a sentence with x in it that picks out exactly Ann’s children in each family.'),
    hint: [T('「安是 x 的父母」。', '“Ann is a parent of x”.')],
    intro: [
      { t: T('一句话里留一个自由的 x，它就成了一个<wiki-ref to="query"></wiki-ref>：世界里哪些东西放进 x 能让这句话成立，就是查询的答案。数据库的查询语言 SQL，核心正是这样的一阶逻辑。', 'Leave one x free in a sentence and it becomes a <wiki-ref to="query"></wiki-ref>: the things of a world that make it true when put in for x are the answer. The core of SQL, the language of databases, is first-order logic like this.') },
      { t: T('这里有两家人。同一句查询要在两家里都选对，不能靠记名字。', 'There are two families here. One query must be right in both, so no remembering names.') },
    ],
    after: T('查询只看族谱里写着的关系：「安是 x 的父母」在第一家选出博和茜，在第二家选出茜和迪。', 'A query sees only the relations in the tree: “Ann is a parent of x” picks Bo and Cy in the first family, Cy and Dee in the second.'),
  }),
  query({
    id: 'q-grand',
    title: T('谁当了祖父母', 'Who are grandparents'),
    say: T('x 是某个人的祖父母。', 'x is a grandparent of someone.'), target: '∃y. ∃z. Parent(x, y) ∧ Parent(y, z)',
    decoys: ['School(x)'],
    brief: T('拼一句带着 x 的话，在每一家里，让它正好选中当了祖父母的人。', 'Build a sentence with x in it that picks out exactly the grandparents in each family.'),
    hint: [T('x 是 y 的父母，y 又是 z 的父母。y 和 z 是谁？存在就行。', 'x is a parent of y, and y of z. Who are y and z? Some, that is all.')],
    after: T('中间那一代 y 和孙辈 z 不在答案里，所以用 ∃ 把它们「藏」起来：查询只关心 x。', 'The middle generation y and the grandchild z are not part of the answer, so ∃ hides them: the query cares only about x.'),
  }),
  query({
    id: 'q-none',
    title: T('谁没有孩子', 'Who has no children'),
    say: T('x 没有孩子。', 'x has no children.'), target: '¬∃y. Parent(x, y)',
    decoys: ['School(x)'],
    brief: T('拼一句带着 x 的话，在每一家里，让它正好选中没有孩子的人。', 'Build a sentence with x in it that picks out exactly those with no children in each family.'),
    hint: [T('「x 有孩子」是什么？在它前面加个 ¬。', 'What is “x has a child”? Put a ¬ in front.')],
    after: T('「没有孩子」要看遍整家人才知道：查询里的 ¬∃ 就是「一个都找不到」。', '“No children” needs the whole family looked through: ¬∃ in a query is “none to be found”.'),
  }),
  query({
    id: 'q-school',
    title: T('孩子都在上学的家长', 'Parents whose children all go to school'),
    say: T('x 有孩子，而且 x 的孩子都在上学。', 'x has children, and all of x’s children go to school.'), target: '(∃y. Parent(x, y)) ∧ ∀y. Parent(x, y) → School(y)',
    brief: T('拼一句带着 x 的话，在每一家里，让它正好选中「有孩子、孩子又都在上学」的人。', 'Build a sentence with x in it that picks out exactly those who have children, all of whom go to school.'),
    hint: [
      T('两件事用 ∧ 连起来：「有孩子」用 ∃，「孩子都在上学」用 ∀。', 'Join two things with ∧: “has children” with ∃, “all children at school” with ∀.'),
      T('只写「孩子都在上学」，没有孩子的人也会被选中：没有孩子，这句话就空着成立。', 'With only “all children at school”, those with no children are picked too: with no children, it holds emptily.'),
    ],
    after: T('「孩子都在上学」对没有孩子的人也成立，什么都不用查就为真，叫<wiki-ref to="vacuous"></wiki-ref>。数据库查询里这个坑很常见，加一句「有孩子」就补上了。', '“All children at school” holds for those with no children, true without checking anything: a <wiki-ref to="vacuous"></wiki-ref>. It is a common trap in database queries, closed by adding “has children”.'),
  }),
]
