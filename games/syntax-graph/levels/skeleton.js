// Era 1 · 主干 (the skeleton): a sentence's subject, verb and object (or complement), found by folding the modifiers
// that stand between them onto the nouns they modify. Only level specs: the sentence, its answer in words, what a
// wrong fold or a wrong mark would mean, and the texts. How a sentence is taken apart and checked is the syntax
// domain's (games/kit/domains/syntax).

const T = (zh, en) => ({ zh, en })
const w = (id) => `<wiki-ref to="${id}"></wiki-ref>`

export const levels = [
  {
    id: '1-1',
    title: T('主干', 'The skeleton'),
    brief: T('标出这句话的主语、谓语和宾语。', 'Mark the subject, the verb and the object of this sentence.'),
    adds: ['role:subj', 'role:verb', 'role:obj'],
    showcase: 'marking: a stretch is chosen with two taps and then marked as a role',
    intro: [
      { t: T(`论文里的长句读不下去，多半是因为找不到它的${w('skeleton')}：谁、做了什么、对什么。在这里，你把一句话拆开，直到主干露出来。`, `A long sentence in a paper is hard going mostly because its ${w('skeleton')} is hard to find: who, does what, to what. Here you take a sentence apart until the skeleton shows.`) },
      { t: T('点一个词开始选一段，再点另一个词结束，中间的词就都选上了；只要一个词，就点它一下。选好以后，在下面把它标成主干的一个成分。', 'Tap a word to start a stretch and another to end it, and every word between is chosen; for one word, tap it once. Then mark it below as a part of the skeleton.') },
      { t: T(`${w('subject')}和${w('object')}标整个名词短语，比如 <i>Our method</i>；${w('verb')}标整个动词词组。`, `The ${w('subject')} and the ${w('object')} are marked as whole noun phrases, such as <i>Our method</i>; the ${w('verb')} as the whole verb group.`) },
    ],
    hint: [T('先找动词：哪个词说的是“做了什么”？', 'Find the verb first: which word says what is done?')],
    sentence: 'Our method outperforms all existing baselines.',
    roles: { subj: 'Our method', verb: 'outperforms', obj: 'all existing baselines' },
    debrief: {
      title: T('Our method outperforms all existing baselines.', 'Our method outperforms all existing baselines.'),
      body: [T('主语 <i>Our method</i>，谓语 <i>outperforms</i>，宾语 <i>all existing baselines</i>：这就是整句的主干。句子再长，主干也只有这几块，其余的词都挂在它们身上。', 'Subject <i>Our method</i>, verb <i>outperforms</i>, object <i>all existing baselines</i>: that is the whole skeleton. However long a sentence gets, its skeleton is these few pieces; every other word hangs on them.')],
      note: T('主干 = 谁 + 做什么 + 对什么。', 'Skeleton = who + does what + to what.'),
    },
  },
  {
    id: '1-2',
    title: T('折起来', 'Fold it away'),
    brief: T('标出主干。挡在中间的修饰成分，先折起来。', 'Mark the skeleton. Fold away the modifier that stands in the way first.'),
    adds: ['pp'],
    intro: [
      { t: T(`主语和谓语之间常常隔着一串词，它们都在说明前面的一个名词。这样的一串叫${w('modifier')}，被它说明的那个词叫${w('head')}。`, `Between the subject and the verb there is often a run of words, all telling about a noun before them. Such a run is a ${w('modifier')}, and the word it tells about is its ${w('head')}.`) },
      { t: T(`最常见的修饰成分是${w('pp')}：一个介词带着后面的一串词。选中这一串，折成介词短语，再点它修饰的那个词，它就收成一块，挂在那个词上。`, `The commonest modifier is a ${w('pp')}: a preposition and the words after it. Choose the run, fold it as a prepositional phrase, then tap the word it modifies: it becomes one piece hung on that word.`) },
      { t: T('修饰成分折干净以后，剩下的就是主干。不属于主干的词（比如说明程度的副词）留在原处，不用标。', 'Once the modifiers are folded away, what is left is the skeleton. Words outside it (an adverb of degree, say) stay where they are, unmarked.') },
    ],
    hint: [T('动词是哪个？在它前面，是什么在变？', 'Which word is the verb? Before it, what is it that changes?'), T('“of …”这一串说明的是前面哪个名词？', 'Which noun before it does the run “of …” tell about?')],
    sentence: 'The running time of the algorithm grows quadratically.',
    folds: [{ span: 'of the algorithm', type: 'pp', to: 'time' }],
    roles: { subj: 'The running time', verb: 'grows' },
    misrole: { subj: { 'the algorithm': T('主语若是 <i>the algorithm</i>，句子说的就是“算法在长大”。按平方增长的是运行时间；<i>of the algorithm</i> 只说明是谁的运行时间。', 'With <i>the algorithm</i> as the subject, the sentence says the algorithm grows. What grows quadratically is the running time; <i>of the algorithm</i> only says whose.') } },
    debrief: {
      title: T('The running time of the algorithm grows quadratically.', 'The running time of the algorithm grows quadratically.'),
      body: [T('<i>of the algorithm</i> 折起来以后，主干是 <i>The running time grows</i>：算法的运行时间按平方增长。<i>of</i> 短语只回答“谁的”。', 'With <i>of the algorithm</i> folded, the skeleton is <i>The running time grows</i>: the algorithm’s running time grows quadratically. The <i>of</i> phrase only answers “whose”.')],
      note: T('先把修饰成分折到它的中心词上，主干就露出来了。', 'Fold each modifier onto its head, and the skeleton shows.'),
    },
  },
  {
    id: '1-3',
    title: T('宾语后面', 'After the object'),
    brief: T('标出主干，把修饰成分折起来。', 'Mark the skeleton, folding the modifier away.'),
    intro: [{ t: T('修饰成分也跟在宾语后面。这时它不挡路，但同样不属于主干。', 'A modifier can follow the object too. There it is in nobody’s way, but it is still no part of the skeleton.') }],
    hint: [T('<i>with linear running time</i> 说的是什么东西的性质？', 'What is <i>with linear running time</i> a property of?')],
    sentence: 'We describe an algorithm with linear running time.',
    folds: [{ span: 'with linear running time', type: 'pp', to: 'algorithm', misread: { describe: T('挂在 <i>describe</i> 上，意思就成了“用线性的运行时间去描述”。<i>with</i> 在这里说的是算法本身的性质。', 'Hung on <i>describe</i>, it would mean describing by means of linear running time. Here <i>with</i> gives a property of the algorithm itself.') } }],
    roles: { subj: 'We', verb: 'describe', obj: 'an algorithm' },
    debrief: {
      title: T('We describe an algorithm with linear running time.', 'We describe an algorithm with linear running time.'),
      body: [T('主干 <i>We describe an algorithm</i>；<i>with linear running time</i> 说明是什么样的算法：运行时间为线性的算法。', 'The skeleton is <i>We describe an algorithm</i>; <i>with linear running time</i> says what kind: an algorithm that runs in linear time.')],
      note: T('宾语的修饰成分也折到宾语的中心词上。', 'An object’s modifiers fold onto the object’s head too.'),
    },
  },
  {
    id: '1-4',
    title: T('一串套一串', 'One inside another'),
    brief: T('标出主干，把修饰成分一层层折起来。', 'Mark the skeleton, folding the modifiers layer by layer.'),
    intro: [{ t: T('一个修饰成分里面还可以有修饰成分：<i>of the A of the B</i>，后一个说明前一个里的名词。从最里面那一块折起，一层层往外。', 'A modifier can hold modifiers of its own: in <i>of the A of the B</i>, the second tells about the noun in the first. Fold from the innermost piece outwards.') }],
    hint: [T('最后一个介词短语，说明的是紧挨在它前面的那个名词吗？', 'Does the last prepositional phrase tell about the noun just before it?'), T('谓语 <i>are initialized</i> 是复数：被初始化的是什么？', 'The verb <i>are initialized</i> is plural: what is initialized?')],
    sentence: 'The weights of the last layer of the decoder in our model are initialized randomly.',
    folds: [
      { span: 'in our model', type: 'pp', to: 'decoder' },
      { span: 'of the decoder in our model', type: 'pp', to: 'layer' },
      { span: 'of the last layer of the decoder in our model', type: 'pp', to: 'weights' },
    ],
    roles: { subj: 'The weights', verb: 'are initialized' },
    misrole: { subj: { 'the last layer': T('<i>layer</i> 是单数，谓语却是 <i>are</i>。被初始化的是权重：<i>of the last layer</i> 说明是哪一层的权重。', '<i>layer</i> is singular, but the verb is <i>are</i>. What is initialized is the weights: <i>of the last layer</i> says which layer’s.') } },
    debrief: {
      title: T('The weights of the last layer of the decoder in our model are initialized randomly.', 'The weights of the last layer of the decoder in our model are initialized randomly.'),
      body: [T('三层折完，主干是 <i>The weights are initialized randomly</i>：我们模型里解码器最后一层的权重是随机初始化的。一串介词短语里，每一个通常说明紧挨在它前面的名词。', 'Three layers folded, the skeleton is <i>The weights are initialized randomly</i>: the weights of the last layer of the decoder in our model start at random. In a chain of prepositional phrases, each usually tells about the noun just before it.')],
      note: T('从里往外折：每一块挂在它前面最近、说得通的那个名词上。', 'Fold from the inside out: each piece on the nearest noun before it that makes sense.'),
    },
  },
  {
    id: '1-5',
    title: T('是什么', 'What it is'),
    brief: T('标出主干，把修饰成分折起来。', 'Mark the skeleton, folding the modifiers away.'),
    adds: ['role:comp'],
    intro: [
      { t: T(`这句话的谓语是 <i>is</i>。它不是一个动作，后面也没有动作落到的东西；它只是把主语和后面那一块连起来，说主语是什么。这样的动词叫${w('linking-verb')}。`, `This sentence’s verb is <i>is</i>. It is no action, and nothing after it is acted on; it only links the subject to what follows, saying what the subject is. Such a verb is a ${w('linking-verb')}.`) },
      { t: T(`系动词后面那一块叫${w('complement')}。主干是主语、谓语、表语。`, `What follows a linking verb is its ${w('complement')}. The skeleton is then subject, verb, complement.`) },
    ],
    hint: [T('<i>is</i> 后面那一块，是在说主语是什么吗？', 'Is what follows <i>is</i> saying what the subject is?')],
    sentence: 'The main contribution of this paper is a new loss function for imbalanced data.',
    folds: [
      { span: 'of this paper', type: 'pp', to: 'contribution' },
      { span: 'for imbalanced data', type: 'pp', to: 'function' },
    ],
    roles: { subj: 'The main contribution', verb: 'is', comp: 'a new loss function' },
    misrole: { obj: { '*': T('<i>is</i> 后面跟的不是宾语：它不说动作落在什么上，而是说主语是什么。', 'What follows <i>is</i> is no object: it does not say what is acted on, but what the subject is.') } },
    debrief: {
      title: T('The main contribution of this paper is a new loss function for imbalanced data.', 'The main contribution of this paper is a new loss function for imbalanced data.'),
      body: [T('主干 <i>The main contribution is a new loss function</i>：本文的主要贡献是一个用于不平衡数据的新损失函数。论文里交代贡献、定义、结论，常常就是这样一个“主语 is 表语”。', 'The skeleton is <i>The main contribution is a new loss function</i>. Papers state contributions, definitions and findings in just this shape: subject, <i>is</i>, complement.')],
      note: T('系动词后面是表语，说明主语是什么。', 'After a linking verb comes a complement: what the subject is.'),
    },
  },
  {
    id: '1-6',
    title: T('最近的不是主语', 'The nearest is not the subject'),
    brief: T('标出主干，把修饰成分折起来。', 'Mark the skeleton, folding the modifiers away.'),
    intro: [{ t: T(`动词前面紧挨着的那个名词，常常只是修饰成分里的一个词。谓语的单复数能帮你认出真正的主语：英语的谓语和主语在单复数上要对得上，这叫${w('agreement')}。`, `The noun just before the verb is often only a word inside a modifier. The verb’s number helps pick out the real subject: in English the verb matches its subject in number, which is called ${w('agreement')}.`) }],
    hint: [T('<i>is</i> 是单数。它前面哪个名词是单数？', '<i>is</i> is singular. Which noun before it is?')],
    sentence: 'The output of the attention layers is a weighted sum of the values.',
    folds: [
      { span: 'of the attention layers', type: 'pp', to: 'output' },
      { span: 'of the values', type: 'pp', to: 'sum' },
    ],
    roles: { subj: 'The output', verb: 'is', comp: 'a weighted sum' },
    misrole: { subj: { 'the attention layers': T('主语若是 <i>the attention layers</i>（复数），谓语就该是 <i>are</i>。<i>is</i> 是单数，和它一致的是 <i>output</i>。', 'With <i>the attention layers</i> (plural) as the subject, the verb would be <i>are</i>. <i>is</i> is singular, and agrees with <i>output</i>.') } },
    debrief: {
      title: T('The output of the attention layers is a weighted sum of the values.', 'The output of the attention layers is a weighted sum of the values.'),
      body: [T('主干 <i>The output is a weighted sum</i>：注意力层的输出是值的加权和。<i>layers</i> 离 <i>is</i> 最近，却在修饰成分里；<i>is</i> 的单数指向了真正的主语。', 'The skeleton is <i>The output is a weighted sum</i>. <i>layers</i> sits nearest to <i>is</i> but inside a modifier; the singular <i>is</i> points to the real subject.')],
      note: T('拿不准主语时，看谓语的单复数。', 'Unsure of the subject? Look at the verb’s number.'),
    },
  },
  {
    id: '1-7',
    title: T('两头都长', 'Long at both ends'),
    brief: T('标出主干，把所有修饰成分折起来。', 'Mark the skeleton, folding every modifier away.'),
    intro: [{ t: T('这一次，主语和宾语后面都跟着一串套一串的修饰成分。', 'This time both the subject and the object trail chains of modifiers, one inside another.') }],
    hint: [T('句子里有两个 <i>change</i>。各自后面的修饰成分，分别挂在哪一个上？', 'The sentence has two <i>change</i>s. Which one does each chain hang on?')],
    sentence: 'A small change in the weights of the first layer causes a large change in the output of the network.',
    folds: [
      { span: 'of the first layer', type: 'pp', to: 'weights' },
      { span: 'in the weights of the first layer', type: 'pp', to: 'change#1' },
      { span: 'of the network', type: 'pp', to: 'output' },
      { span: 'in the output of the network', type: 'pp', to: 'change#2' },
    ],
    roles: { subj: 'A small change', verb: 'causes', obj: 'a large change' },
    debrief: {
      title: T('A small change in the weights of the first layer causes a large change in the output of the network.', 'A small change in the weights of the first layer causes a large change in the output of the network.'),
      body: [T('主干只有五个词：<i>A small change causes a large change</i>。第一层权重的一点小变化，会让网络输出发生很大的变化。长句的长，几乎都长在修饰成分上。', 'The skeleton is five words: <i>A small change causes a large change</i>. A small change in the first layer’s weights makes a large change in the network’s output. A long sentence is long almost entirely in its modifiers.')],
      note: T('先折修饰成分，再读主干。', 'Fold the modifiers first, then read the skeleton.'),
    },
  },
]
