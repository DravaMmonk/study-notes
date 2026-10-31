// Chapter 5 · The language of quantifiers and counterexamples: what first-order sentences say and when they are true,
// before any proof. Each quantifier is said first (names and predicates, every, some, one inside another), then found
// out wrong by a world (what nitpick looks for): someone's translation of a requirement, or a lemma that does not
// follow. The family topic asks a world questions.

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
const BRIEF = T('用下面的元件，把这句话拼成公式。', 'Build this sentence as a formula from the parts below.')
// A world level, in two stages of one level: first build the sentence (`say`, its formula `target`; or, for a piece of
// reasoning, one sentence of it, `translate`) as a formula, then show with a world (what nitpick looks for) that
// someone's translation of it is wrong (`wrong`, against `target` meant), or that the reasoning does not follow
// (`given`, `goal`): each of `counters` a task.
const COUNTER = T('造反例', 'Counterexample')
const COUNTER_BRIEF = {
  translation: T('上一段你把这句话拼成了公式；这是别人拼的。造一个世界，让两份译文真假不同。', 'You built this sentence as a formula; this is someone else’s. Build a world where the two differ in truth.'),
  lemma: T('这段推理写成了引理。造一个反例：前提都成立，结论不成立。', 'The reasoning is written as a lemma. Build a counterexample: every premise holds and the goal fails.'),
}
const world = ({ say, target, hint, translate, counters, ...level }) => ({
  consts,
  ...level,
  say,
  tasks: [
    { kind: 'translate', step: T('翻译', 'Translate'), brief: BRIEF, ...(translate ?? { say, target, hint }), decoys: [...(translate?.decoys ?? []), ...counters.flatMap((c) => (c.wrong ? [c.wrong] : []))] },
    ...counters.map((c) => ({ kind: 'model', step: COUNTER, say, ...(c.wrong ? { meant: target, brief: COUNTER_BRIEF.translation } : { brief: COUNTER_BRIEF.lemma }), ...c })),
  ],
})

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
      { t: T('命题逻辑里，一个字母代表一整句话：要说每个人会不会死，每人就得用一个字母；「每个人」「有一个人」根本说不出来。', 'In propositional logic a letter stands for a whole sentence: saying whether each person is mortal takes a letter per person, and “everyone” or “someone” cannot be said at all.') },
      { t: T('<wiki-ref to="fol"></wiki-ref>把句子拆开：<b>名字</b>指一样东西，<wiki-ref to="predicate"></wiki-ref>说一样东西是什么，或几样东西之间是什么关系。「苏格拉底是人」写作 Human(soc)。', '<wiki-ref to="fol"></wiki-ref> takes sentences apart: a <b>name</b> stands for a thing, and a <wiki-ref to="predicate"></wiki-ref> says what a thing is or how things relate. “Socrates is human” is written Human(soc).') },
      { t: T('这一章先不证明，只学怎样说一句话，怎样判断它在一个世界里的真假。公式用下面的元件拼，元件上空着的位置可以再放进别的元件。', 'No proofs in this chapter yet: first how to say a sentence, and how to tell whether it is true in a world. Formulas are built from the parts below; an empty place in a part takes another part.') },
    ],
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
      { t: T('全称<wiki-ref to="quantifier"></wiki-ref> <b>∀</b> 读作「对所有」：∀x. P(x) 说的是，世上每一样东西 x 都满足 P。', 'The universal <wiki-ref to="quantifier"></wiki-ref> <b>∀</b> reads “for all”: ∀x. P(x) says every thing x in the world satisfies P.') },
      { t: T('拼错时，检查器可能给出一个小世界：在那里，你拼的公式和目标真假不同。', 'When a formula is wrong, the checker may show a small world where it and the target differ.') },
    ],
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
    intro: [
      { t: T('新符号 <b>∃</b> 读作「存在」：∃x. P(x) 说的是，世上至少有一样东西 x 满足 P。', 'A new symbol, <b>∃</b>, reads “there exists”: ∃x. P(x) says at least one thing x in the world satisfies P.') },
      { t: T('拼错时，检查器可能给出一个小世界：在那里，你拼的公式和目标真假不同。', 'When a formula is wrong, the checker may show a small world where it and the target differ.') },
    ],
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
    intro: [{ t: T('量词里面还可以有量词。每个量词有自己的变量，管到它后面的整段：∀x. … ∃y. … 里，x 和 y 各指各的。量词管着的变量是<wiki-ref to="bound"></wiki-ref>；没有量词管着的是<wiki-ref to="free"></wiki-ref>，句子就说不清在讲谁。', 'A quantifier may hold another. Each has its own variable and reaches over everything after it: in ∀x. … ∃y. …, x and y each stand for their own thing. A variable some quantifier covers is a <wiki-ref to="bound"></wiki-ref>; one no quantifier covers is a <wiki-ref to="free"></wiki-ref>, and then the sentence does not say whom it means.') }],
  },
  world({
    id: 'm-world',
    title: T('真假看世界', 'True in one world'),
    say: T('人都会死。', 'Every human is mortal.'),
    target: '∀x. Human(x) → Mortal(x)',
    hint: [T('对每一样东西 x，如果 x 是人，那么 x 会死。', 'For every thing x, if x is human then x is mortal.')],
    intro: [{ t: T('先把上面这句话拼成公式；下一段，别人也译了这句话，要用一个世界说明他译错了。', 'First build the sentence above as a formula; next, someone else has translated it too, and a world is to show their translation wrong.') }],
    counters: [
      {
        step: T('用了「并且」', 'With “and”'),
        wrong: '∀x. Human(x) ∧ Mortal(x)',
        answer: { size: 1, preds: {} },
        hint: [T('点一样东西，它就「是人」；再点一下，就不是。', 'Tap a thing to make it human; tap again to undo.'), T('这份译文说每样东西都怎样？世界里有一样不是人的东西呢？', 'What does this translation say of every thing? What if the world holds a thing that is not human?')],
        intro: [
          { t: T('命题逻辑里，一句话的真假看真值表的哪一行。一阶逻辑里，看的是<wiki-ref to="world"></wiki-ref>：世界里有几样东西，每样东西是什么、和别的东西是什么关系。', 'In propositional logic, whether a sentence is true depends on the row of the truth table. In first-order logic it depends on the <wiki-ref to="world"></wiki-ref>: how many things there are, what each is and how they relate.') },
          { t: T('上方是你的译文，和别人的译文。要说明别人的错了，就造一个世界，让两份译文一真一假。', 'Above are your translation and someone else’s. To show theirs is wrong, build a world where the two differ: one true, the other false.') },
          { t: T('在下面造一个世界：选好有几样东西，再点出每样东西有哪些性质。运行时，上方标出两份译文在这个世界里的真假。', 'Build a world below: choose how many things there are, then tap what holds of each. A run marks above whether each translation is true in this world.') },
        ],
      },
      {
        step: T('条件写反了', 'The condition reversed'),
        wrong: '∀x. Mortal(x) → Human(x)',
        answer: { size: 1, preds: { Human: ['0'] } },
        hint: [T('一个不会死的人。', 'A human who is not mortal.')],
      },
    ],
    after: T('一句话永远成立，是说它在所有世界里都真；世界有无穷多个，大小不限。', 'A sentence that always holds is true in every world, and there are infinitely many worlds, of any size.'),
  }),
  world({
    id: 'm-make',
    title: T('一个也没有', 'Not a single one'),
    say: T('有会飞的鸟。', 'Some bird flies.'),
    target: '∃x. Bird(x) ∧ Flies(x)',
    hint: [T('有一样东西 x，x 是鸟，并且 x 会飞。', 'There is a thing x that is a bird and flies.')],
    counters: [{
      wrong: '∃x. Bird(x) → Flies(x)',
      answer: { size: 1, preds: {} },
      intro: [{ t: T('上方是你的译文，和别人的译文。要说明别人的错了，就造一个世界，让两份译文一真一假：在下面选好有几样东西，再点出每样东西有哪些性质。运行时，上方标出两份译文在这个世界里的真假。', 'Above are your translation and someone else’s. To show theirs is wrong, build a world where the two differ: choose below how many things there are, then tap what holds of each. A run marks above whether each translation is true in this world.') }],
      hint: [T('世界里要是一只鸟也没有呢？', 'What if the world holds no bird at all?')],
    }],
  }),
  world({
    id: 'm-counter',
    title: T('推不出', 'Does not follow'),
    say: T('人都会死，苏格拉底会死，所以苏格拉底是人。', 'Every human is mortal, Socrates is mortal, so Socrates is human.'),
    translate: { say: T('人都会死。', 'Every human is mortal.'), target: '∀x. Human(x) → Mortal(x)', decoys: ['Mortal(soc)', 'Human(soc)'], hint: [T('「人都会死」：对每一样东西 x，如果 x 是人，那么 x 会死。', '“Every human is mortal”: for every thing x, if x is human then x is mortal.')] },
    intro: [{ t: T('先把这段推理的第一句拼成公式；下一段，看这段推理推不推得出。', 'First build the first sentence of the reasoning as a formula; next, see whether the reasoning follows.') }],
    counters: [{
      given: ['∀x. Human(x) → Mortal(x)', 'Mortal(soc)'],
      goal: 'Human(soc)',
      answer: { size: 1, preds: { Mortal: ['0'] }, consts: { soc: 0 } },
      hint: [T('苏格拉底也可以是一条会死的狗。', 'Socrates could be a mortal dog.')],
      intro: [
        { t: T('上方是这段推理写成的引理：横线上是前提，横线下是结论，它说前提都成立时，结论也成立。造一个前提都成立、结论不成立的世界，就说明它推错了。', 'Above is the reasoning written as a lemma: the premises over the line, the goal under it; it says the goal holds whenever the premises do. A world where the premises hold and the goal fails shows it is wrong.') },
        { t: T('名字也要在世界里指一样东西：选好「苏格拉底」是哪一样。', 'A name must stand for a thing in the world too: choose which thing is Socrates.') },
      ],
    }],
    after: T('前提都真、结论为假的世界，叫<wiki-ref to="countermodel"></wiki-ref>。', 'A world where the premises hold and the conclusion fails is a <wiki-ref to="countermodel"></wiki-ref>.'),
  }),
  world({
    id: 'm-order',
    title: T('先说谁', 'Which comes first'),
    say: T('每样东西都喜欢某样东西。', 'Everything likes something.'),
    target: '∀x. ∃y. Likes(x, y)',
    hint: [T('外面是对所有 x，里面是有一个 y。', 'Outside, every x; inside, some y.')],
    counters: [{
      wrong: '∃y. ∀x. Likes(x, y)',
      answer: { size: 2, preds: { Likes: ['0,0', '1,1'] } },
      hint: [
        T('把它想成一个游戏：∀ 由对手挑，∃ 由你挑。第一句是对手先挑 x，你再挑 y；第二句是你先挑 y，对手再挑 x。', 'Think of it as a game: the opponent picks for ∀, you pick for ∃. In the first, the opponent picks x first, then you pick y; in the second you pick y first, then the opponent picks x.'),
        T('每样东西各喜欢自己就行。', 'Let each thing like itself.'),
      ],
    }],
  }),
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
  },
  world({
    id: 'p-split',
    title: T('∀ 不能随便拆', 'Splitting ∀'),
    say: T('要是什么都是鸟，那什么都会飞；所以鸟都会飞。', 'If everything is a bird, then everything flies; so every bird flies.'),
    translate: { say: T('要是什么都是鸟，那什么都会飞。', 'If everything is a bird, then everything flies.'), target: '(∀x. Bird(x)) → (∀x. Flies(x))', decoys: ['∀x. Bird(x) → Flies(x)'], hint: [T('最外面是「如果……那么……」，两边各是一句 ∀。', 'The outermost piece is “if … then …”, with a ∀ sentence on each side.')] },
    counters: [{
      given: ['(∀x. Bird(x)) → (∀x. Flies(x))'],
      goal: '∀x. Bird(x) → Flies(x)',
      answer: { size: 2, preds: { Bird: ['0'] } },
      hint: [T('第二句的条件「什么都是鸟」，只要有一样东西不是鸟，就不成立。', 'The second sentence’s condition, “everything is a bird”, fails as soon as one thing is not a bird.')],
    }],
  }),
  world({
    id: 'p-exAnd',
    title: T('∃ 也不能随便拆', 'Splitting ∃'),
    say: T('有鸟，也有会飞的东西，所以有会飞的鸟。', 'There is a bird, and something flies, so some bird flies.'),
    translate: { say: T('有鸟，也有会飞的东西。', 'There is a bird, and something flies.'), target: '(∃x. Bird(x)) ∧ (∃x. Flies(x))', decoys: ['∃x. Bird(x) ∧ Flies(x)'], hint: [T('两句各有自己的 ∃，用「并且」连起来。', 'Two sentences, each with its own ∃, joined by “and”.')] },
    counters: [{
      given: ['(∃x. Bird(x)) ∧ (∃x. Flies(x))'],
      goal: '∃x. Bird(x) ∧ Flies(x)',
      answer: { size: 2, preds: { Bird: ['0'], Flies: ['1'] } },
      hint: [T('两个 ∃ 可以指两样不同的东西。', 'The two ∃s may point at two different things.')],
    }],
  }),
  // Topic: asking a family tree questions. One sentence with a free x is a query; the world answers with what it picks.
  query({
    id: 'q-children',
    title: T('谁是安的孩子', 'Who are Ann’s children'),
    say: T('x 是安的孩子。', 'x is a child of Ann.'), target: 'Parent(ann, x)',
    decoys: ['School(x)'],
    brief: T('拼一句带着 x 的话，在每一家里，让它正好选中安的孩子。', 'Build a sentence with x in it that picks out exactly Ann’s children in each family.'),
    hint: [T('「安是 x 的父母」。', '“Ann is a parent of x”.')],
    intro: [
      { t: T('一句话里留一个自由的 x，就成了<wiki-ref to="query"></wiki-ref>：世界里哪些东西代入 x 能让这句话成立，哪些就是答案。数据库的查询语言 SQL，核心就是这样的一阶逻辑。', 'A sentence with one x left free is a <wiki-ref to="query"></wiki-ref>: the things of a world that make it true when put in for x are the answer. At its core, SQL, the language of databases, is first-order logic like this.') },
      { t: T('这里有两家人。同一句查询要在两家里都选对，靠记名字不行。', 'There are two families here. One query must be right in both, so remembering names will not do.') },
    ],
  }),
  query({
    id: 'q-grand',
    title: T('谁当了祖父母', 'Who are grandparents'),
    say: T('x 是某个人的祖父母。', 'x is a grandparent of someone.'), target: '∃y. ∃z. Parent(x, y) ∧ Parent(y, z)',
    decoys: ['School(x)'],
    brief: T('拼一句带着 x 的话，在每一家里，让它正好选中当了祖父母的人。', 'Build a sentence with x in it that picks out exactly the grandparents in each family.'),
    hint: [T('x 是 y 的父母，y 又是 z 的父母。y 和 z 是谁？存在就行。', 'x is a parent of y, and y of z. Who are y and z? Some, that is all.')],
  }),
  query({
    id: 'q-none',
    title: T('谁没有孩子', 'Who has no children'),
    say: T('x 没有孩子。', 'x has no children.'), target: '¬∃y. Parent(x, y)',
    decoys: ['School(x)'],
    brief: T('拼一句带着 x 的话，在每一家里，让它正好选中没有孩子的人。', 'Build a sentence with x in it that picks out exactly those with no children in each family.'),
    hint: [T('「x 有孩子」是什么？在它前面加个 ¬。', 'What is “x has a child”? Put a ¬ in front.')],
  }),
  query({
    id: 'q-school',
    title: T('孩子都在上学的家长', 'Parents whose children all go to school'),
    say: T('x 有孩子，而且 x 的孩子都在上学。', 'x has children, and all of x’s children go to school.'), target: '(∃y. Parent(x, y)) ∧ ∀y. Parent(x, y) → School(y)',
    brief: T('拼一句带着 x 的话，在每一家里，让它正好选中「有孩子、孩子又都在上学」的人。', 'Build a sentence with x in it that picks out exactly those who have children, all of whom go to school.'),
    hint: [
      T('两件事用 ∧ 连起来：「有孩子」用 ∃，「孩子都在上学」用 ∀。', 'Join two things with ∧: “has children” with ∃, “all children at school” with ∀.'),
      T('只写「孩子都在上学」，没有孩子的人也会被选中：对他们，这句话什么都不用查就成立，叫<wiki-ref to="vacuous"></wiki-ref>。', 'With only “all children at school”, those with no children are picked too: for them it holds with nothing to check, a <wiki-ref to="vacuous"></wiki-ref>.'),
    ],
  }),
]
