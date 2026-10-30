// Era 2 · 挂在哪 (where it hangs): a prepositional phrase tells about a noun (what kind) or about the action (where,
// how, when), and only the meaning says which. Only level specs, as in era 1.

const T = (zh, en) => ({ zh, en })
const w = (id) => `<wiki-ref to="${id}"></wiki-ref>`

export const levels = [
  {
    id: '2-1',
    title: T('修饰动作', 'Telling about the action'),
    brief: T('标出主干，把修饰成分折起来，挂到它修饰的词上。', 'Mark the skeleton and fold the modifier onto the word it modifies.'),
    intro: [
      { t: T(`到这里，折起来的介词短语都挂在名词上，说明“什么样的”“谁的”，这样的修饰成分叫${w('attributive')}。`, `So far every folded phrase has hung on a noun, telling what kind or whose; such a modifier is an ${w('attributive')}.`) },
      { t: T(`介词短语也可以说明动作本身：在哪里做、用什么做、什么时候做。这时它挂在谓语的动词上，叫${w('adverbial')}。同一个介词短语挂在哪，只能看意思。`, `A prepositional phrase can also tell about the action itself: where, with what, when it is done. Then it hangs on the verb, and is an ${w('adverbial')}. Where a phrase hangs is told only by the meaning.`) },
    ],
    hint: [T('在一块 GPU 上的，是模型，还是训练这件事？', 'What is on a single GPU: the model, or the training?')],
    sentence: 'We train the model on a single GPU.',
    folds: [{ span: 'on a single GPU', type: 'pp', to: 'train', misread: { model: T('挂在 <i>model</i> 上，意思是“装在一块 GPU 上的那个模型”。这里说的是训练在一块 GPU 上进行。', 'Hung on <i>model</i>, it means the model that sits on one GPU. What happens on one GPU here is the training.') } }],
    roles: { subj: 'We', verb: 'train', obj: 'the model' },
    debrief: {
      title: T('We train the model on a single GPU.', 'We train the model on a single GPU.'),
      body: [T('<i>on a single GPU</i> 挂在 <i>train</i> 上：在一块 GPU 上训练模型。它紧跟着 <i>the model</i>，说明的却是动作。', '<i>on a single GPU</i> hangs on <i>train</i>: the training happens on one GPU. It follows <i>the model</i> but tells about the action.')],
      note: T('说明“什么样的”挂名词，说明“在哪、怎么做”挂动词。', 'What kind: on the noun. Where or how: on the verb.'),
    },
  },
  {
    id: '2-2',
    title: T('句首的介词短语', 'A phrase up front'),
    brief: T('标出主干，把修饰成分折起来，挂到它修饰的词上。', 'Mark the skeleton and fold the modifier onto the word it modifies.'),
    intro: [{ t: T('介词短语也会放在句首，用逗号和主干隔开。', 'A prepositional phrase can also open the sentence, set off from the skeleton by a comma.') }],
    hint: [T('“在这篇论文里”说明的是哪件事？', 'What is it that happens “in this paper”?')],
    sentence: 'In this paper, we propose a new attention mechanism.',
    folds: [{ span: 'In this paper', type: 'pp', to: 'propose', misread: { mechanism: T('句首带逗号的介词短语说的是整件事在哪里发生：“在这篇论文里，我们提出……”。它和 <i>mechanism</i> 之间隔着整个主干。', 'A phrase up front with a comma says where the whole thing happens: in this paper, we propose. The whole skeleton stands between it and <i>mechanism</i>.') } }],
    roles: { subj: 'we', verb: 'propose', obj: 'a new attention mechanism' },
    debrief: {
      title: T('In this paper, we propose a new attention mechanism.', 'In this paper, we propose a new attention mechanism.'),
      body: [T('句首的 <i>In this paper</i> 挂在谓语 <i>propose</i> 上，管的是整件事。论文里大量句子都这样开头：<i>In this section</i>、<i>In contrast</i>、<i>In practice</i>。', 'The opening <i>In this paper</i> hangs on the verb <i>propose</i>, covering the whole event. Countless sentences in papers open like this: <i>In this section</i>, <i>In contrast</i>, <i>In practice</i>.')],
      note: T('句首、带逗号的介词短语，通常挂在谓语上。', 'A phrase up front with a comma usually hangs on the verb.'),
    },
  },
  {
    id: '2-3',
    title: T('一句里两个方向', 'Both ways in one sentence'),
    brief: T('标出主干，把修饰成分折起来，挂到它修饰的词上。', 'Mark the skeleton and fold each modifier onto the word it modifies.'),
    intro: [{ t: T('这一句里有两个介词短语，一个说明名词，一个说明动作，而且一个套在另一个里面。', 'This sentence has two prepositional phrases, one telling about a noun and one about the action, one inside the other.') }],
    hint: [T('“用于图像分类”说的是什么样的东西？', '“For image classification” tells what kind of thing?'), T('在三个基准上做的是什么？', 'What is done on three benchmarks?')],
    sentence: 'We evaluate the method on three benchmarks for image classification.',
    folds: [
      { span: 'for image classification', type: 'pp', to: 'benchmarks', misread: { evaluate: T('挂在 <i>evaluate</i> 上，就成了“为了图像分类去评估”。这里 <i>for</i> 说明的是哪一类基准。', 'Hung on <i>evaluate</i>, it means evaluating for the sake of image classification. Here <i>for</i> says which kind of benchmarks.') } },
      { span: 'on three benchmarks for image classification', type: 'pp', to: 'evaluate', misread: { method: T('“在三个基准上的方法”说不通：在基准上进行的是评估。', '“The method on three benchmarks” makes no sense: what happens on the benchmarks is the evaluation.') } },
    ],
    roles: { subj: 'We', verb: 'evaluate', obj: 'the method' },
    debrief: {
      title: T('We evaluate the method on three benchmarks for image classification.', 'We evaluate the method on three benchmarks for image classification.'),
      body: [T('<i>for image classification</i> 挂在 <i>benchmarks</i> 上（图像分类的基准），整块 <i>on three benchmarks …</i> 挂在 <i>evaluate</i> 上（在这些基准上评估）。我们在三个图像分类基准上评估这个方法。', '<i>for image classification</i> hangs on <i>benchmarks</i> (image-classification benchmarks), and the whole <i>on three benchmarks …</i> on <i>evaluate</i> (evaluating on them). We evaluate the method on three image-classification benchmarks.')],
      note: T('里面那块挂名词，外面那块挂动词：一层层看意思。', 'The inner piece on a noun, the outer on the verb: read the meaning layer by layer.'),
    },
  },
  {
    id: '2-4',
    title: T('看意思挂', 'Hang it by the meaning'),
    brief: T('两句话，同一个 <i>with</i>。每句标出主干，把修饰成分挂到它修饰的词上。', 'Two sentences, the same <i>with</i>. In each, mark the skeleton and hang the modifier on the word it modifies.'),
    intro: [{ t: T('两句话长得几乎一样，<i>with</i> 短语却挂在不同的词上。', 'Two sentences that look almost the same, with the <i>with</i> phrase hanging on different words.') }],
    tasks: [
      {
        step: T('不同深度', 'Different depths'),
        brief: T('标出主干，把 <i>with</i> 短语挂到它修饰的词上。', 'Mark the skeleton and hang the <i>with</i> phrase on the word it modifies.'),
        hint: [T('“深度不同”说的是谁？', 'What is it that has different depths?')],
        sentence: 'We compare models with different depths.',
        folds: [{ span: 'with different depths', type: 'pp', to: 'models', misread: { compare: T('挂在 <i>compare</i> 上，就成了“拿不同的深度去和模型比较”。这里比较的是几个深度不同的模型。', 'Hung on <i>compare</i>, it means comparing models against different depths. What is compared here is models that differ in depth.') } }],
        roles: { subj: 'We', verb: 'compare', obj: 'models' },
        after: [T('<i>with different depths</i> 挂在 <i>models</i> 上：比较的是深度不同的几个模型。', '<i>with different depths</i> hangs on <i>models</i>: the models compared differ in depth.')],
      },
      {
        step: T('和基线比', 'Against the baseline'),
        brief: T('标出主干，把 <i>with</i> 短语挂到它修饰的词上。', 'Mark the skeleton and hang the <i>with</i> phrase on the word it modifies.'),
        hint: [T('<i>compare A with B</i> 里，B 是什么？', 'In <i>compare A with B</i>, what is B?')],
        sentence: 'We compare our model with the baseline.',
        folds: [{ span: 'with the baseline', type: 'pp', to: 'compare', misread: { model: T('挂在 <i>model</i> 上，就成了“带着基线的那个模型”。<i>compare A with B</i> 是拿 A 和 B 比。', 'Hung on <i>model</i>, it means our model that has a baseline with it. <i>compare A with B</i> sets A against B.') } }],
        roles: { subj: 'We', verb: 'compare', obj: 'our model' },
      },
    ],
    debrief: {
      title: T('We compare our model with the baseline.', 'We compare our model with the baseline.'),
      body: [T('同一个 <i>with</i>：<i>models with different depths</i> 是“深度不同的模型”，挂名词；<i>compare our model with the baseline</i> 是“拿我们的模型和基线比”，挂动词。动词自己要什么（<i>compare … with …</i>），常常决定了介词短语挂在哪。', 'The same <i>with</i>: <i>models with different depths</i> are models that differ in depth, on the noun; <i>compare our model with the baseline</i> sets the model against the baseline, on the verb. What a verb asks for (<i>compare … with …</i>) often decides where a phrase hangs.')],
      note: T('形状一样，挂法不一样：看动词要什么，再看意思。', 'Same shape, different hanging: see what the verb asks for, then the meaning.'),
    },
  },
  {
    id: '2-5',
    title: T('不是最近的那个', 'Not the nearest'),
    brief: T('标出主干，把修饰成分折起来，挂到它修饰的词上。', 'Mark the skeleton and fold each modifier onto the word it modifies.'),
    intro: [{ t: T('一个介词短语前面有好几个名词时，它不一定挂在最近的那个上。', 'With several nouns before a prepositional phrase, it does not always hang on the nearest.') }],
    hint: [T('<i>over</i>：比谁快？什么东西“比参考代码”？', '<i>over</i>: faster than what? What is it that is “over the reference code”?')],
    sentence: 'We report the speedup of our implementation over the reference code.',
    folds: [
      { span: 'of our implementation', type: 'pp', to: 'speedup' },
      { span: 'over the reference code', type: 'pp', to: 'speedup', misread: { implementation: T('“比参考代码更……的实现”说不通。<i>over</i> 跟着 <i>speedup</i>：比参考代码快了多少。', '“Our implementation over the reference code” makes no sense. <i>over</i> goes with <i>speedup</i>: how much faster than the reference code.'), report: T('“越过参考代码去报告”说不通。<i>over</i> 说的是加速比相对于谁。', '“Reporting over the reference code” makes no sense. <i>over</i> says what the speedup is measured against.') } },
    ],
    roles: { subj: 'We', verb: 'report', obj: 'the speedup' },
    debrief: {
      title: T('We report the speedup of our implementation over the reference code.', 'We report the speedup of our implementation over the reference code.'),
      body: [T('两个介词短语都挂在 <i>speedup</i> 上：谁的加速（<i>of our implementation</i>），相对谁（<i>over the reference code</i>）。我们报告自己的实现相对参考代码的加速比。', 'Both phrases hang on <i>speedup</i>: whose (<i>of our implementation</i>) and over what (<i>over the reference code</i>). We report how much faster our implementation is than the reference code.')],
      note: T('有的名词自己带着固定的介词（<i>speedup over</i>、<i>improvement on</i>）。', 'Some nouns come with their own preposition (<i>speedup over</i>, <i>improvement on</i>).'),
    },
  },
  {
    id: '2-6',
    title: T('挂哪都有', 'Hanging everywhere'),
    brief: T('标出主干，把所有修饰成分折起来，挂到它们修饰的词上。', 'Mark the skeleton and fold every modifier onto the word it modifies.'),
    intro: [{ t: T('句首、主语后面、谓语后面，都有介词短语。', 'Prepositional phrases up front, after the subject and after the verb.') }],
    hint: [T('谓语是 <i>has grown</i>。从 2019 年起、增长了多少倍，说的都是什么？', 'The verb is <i>has grown</i>. Since 2019, by how much: what do they tell about?')],
    sentence: 'Since 2019, the size of language models has grown by a factor of a thousand.',
    folds: [
      { span: 'Since 2019', type: 'pp', to: 'grown' },
      { span: 'of language models', type: 'pp', to: 'size' },
      { span: 'of a thousand', type: 'pp', to: 'factor' },
      { span: 'by a factor of a thousand', type: 'pp', to: 'grown' },
    ],
    roles: { subj: 'the size', verb: 'has grown' },
    misrole: { subj: { 'language models': T('主语若是 <i>language models</i>，谓语该是 <i>have grown</i>。<i>has</i> 是单数：增长的是规模。', 'With <i>language models</i> as the subject, the verb would be <i>have grown</i>. <i>has</i> is singular: what has grown is the size.') } },
    debrief: {
      title: T('Since 2019, the size of language models has grown by a factor of a thousand.', 'Since 2019, the size of language models has grown by a factor of a thousand.'),
      body: [T('主干 <i>the size has grown</i>；<i>Since 2019</i> 和 <i>by a factor of a thousand</i> 都挂在 <i>grown</i> 上（什么时候起、长了多少），<i>of language models</i> 挂在 <i>size</i> 上。自 2019 年以来，语言模型的规模增长了一千倍。', 'The skeleton is <i>the size has grown</i>; <i>Since 2019</i> and <i>by a factor of a thousand</i> hang on <i>grown</i> (since when, by how much), and <i>of language models</i> on <i>size</i>. Language models have grown a thousandfold since 2019.')],
      note: T('一个动词可以挂好几个状语，一个名词也可以挂好几个定语。', 'A verb can take several adverbials, and a noun several attributives.'),
    },
  },
]
