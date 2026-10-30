// Era 3 · 定语从句 (relative clauses): a whole clause after a noun, with its own subject and verb, folded into one
// piece like a prepositional phrase; with that or which, set off by commas, with its relative word left out, and
// standing for a whole clause. Only level specs, as in era 1.

const T = (zh, en) => ({ zh, en })
const w = (id) => `<wiki-ref to="${id}"></wiki-ref>`

export const levels = [
  {
    id: '3-1',
    title: T('两个动词', 'Two verbs'),
    brief: T('标出主干，把修饰成分折起来。', 'Mark the skeleton, folding the modifier away.'),
    adds: ['rel'],
    intro: [
      { t: T('这句话里有两个动词，可主干只有一个谓语。另一个动词有它自己的主语，它们合起来说明前面的一个名词。', 'This sentence has two verbs, but a skeleton has only one. The other verb comes with its own subject, and together they tell about a noun before them.') },
      { t: T(`这样一个跟在名词后面、自带主语和谓语的小句，叫${w('relative-clause')}，通常由 <i>that</i>、<i>which</i>、<i>who</i> 这类${w('relative-word')}开头。它和介词短语一样整块折起来，挂到它修饰的名词上。`, `Such a clause after a noun, with a subject and verb of its own, is a ${w('relative-clause')}, usually opened by a ${w('relative-word')} such as <i>that</i>, <i>which</i> or <i>who</i>. Like a prepositional phrase, it is folded whole and hung on the noun it modifies.`) },
    ],
    hint: [T('<i>that</i> 后面的 <i>we propose</i> 说的是哪个名词？', 'Which noun is <i>we propose</i>, after <i>that</i>, about?')],
    sentence: 'The method that we propose requires no labeled data.',
    folds: [{ span: 'that we propose', type: 'rel', to: 'method' }],
    roles: { subj: 'The method', verb: 'requires', obj: 'no labeled data' },
    misrole: {
      verb: { propose: T('<i>propose</i> 是从句里的动词：<i>that we propose</i> 只说明是哪种方法。主干的谓语在从句后面。', '<i>propose</i> is the clause’s verb: <i>that we propose</i> only says which method. The skeleton’s verb comes after the clause.') },
      subj: { we: T('<i>we</i> 是从句的主语。主干说的是方法。', '<i>we</i> is the clause’s subject. The skeleton is about the method.') },
    },
    debrief: {
      title: T('The method that we propose requires no labeled data.', 'The method that we propose requires no labeled data.'),
      body: [T('<i>that we propose</i> 折起来，主干是 <i>The method requires no labeled data</i>：我们提出的方法不需要标注数据。', 'With <i>that we propose</i> folded, the skeleton is <i>The method requires no labeled data</i>: the method we propose needs no labeled data.')],
      note: T('两个动词时，一个在定语从句里；折掉它，剩下的才是谓语。', 'With two verbs, one is in a relative clause; fold it, and the other is the verb.'),
    },
  },
  {
    id: '3-2',
    title: T('逗号里的 which', 'A which between commas'),
    brief: T('标出主干，把修饰成分折起来。', 'Mark the skeleton, folding the modifiers away.'),
    intro: [{ t: T(`用逗号隔开的 <i>which</i> 从句叫${w('nonrestrictive')}：它补充说明一个已经确定的名词，不用来区分是哪一个。折法一样。`, `A <i>which</i> clause between commas is a ${w('nonrestrictive')}: it adds something about a noun already pinned down, rather than saying which one. It folds the same way.`) }],
    hint: [T('把两个逗号之间的那一块拿掉，句子还剩什么？', 'Take out what lies between the commas: what is left?')],
    sentence: 'Our model, which has seven billion parameters, runs on a single GPU.',
    folds: [
      { span: 'which has seven billion parameters', type: 'rel', to: 'model' },
      { span: 'on a single GPU', type: 'pp', to: 'runs', misread: { parameters: T('这一块在逗号外面，修饰不到从句里的 <i>parameters</i>：在一块 GPU 上运行的是模型。', 'It lies outside the commas and cannot reach <i>parameters</i> inside the clause: what runs on one GPU is the model.') } },
    ],
    roles: { subj: 'Our model', verb: 'runs' },
    misrole: { verb: { has: T('<i>has</i> 在逗号里的从句中。主干的谓语在第二个逗号后面。', '<i>has</i> is inside the clause between the commas. The skeleton’s verb comes after the second comma.') } },
    debrief: {
      title: T('Our model, which has seven billion parameters, runs on a single GPU.', 'Our model, which has seven billion parameters, runs on a single GPU.'),
      body: [T('主干 <i>Our model runs</i>；逗号里补充“它有七十亿参数”，<i>on a single GPU</i> 挂在 <i>runs</i> 上。我们的模型有七十亿参数，能在一块 GPU 上运行。', 'The skeleton is <i>Our model runs</i>; the commas add that it has seven billion parameters, and <i>on a single GPU</i> hangs on <i>runs</i>.')],
      note: T('两个逗号夹着的从句，拿掉后主干完整。', 'Take out a clause between commas, and the skeleton stands whole.'),
    },
  },
  {
    id: '3-3',
    title: T('没有 that', 'No that'),
    brief: T('标出主干，把修饰成分折起来。', 'Mark the skeleton, folding the modifiers away.'),
    intro: [{ t: T(`关系词有时被省掉：名词后面直接跟着另一个主语和动词。这叫${w('zero-relative')}。`, `The relative word is sometimes left out: the noun is followed straight away by another subject and verb. This is a ${w('zero-relative')}.`) }],
    hint: [T('<i>features</i> 后面紧跟着 <i>we extract</i>：中间省掉了什么？', '<i>features</i> is followed straight away by <i>we extract</i>: what has been left out?')],
    sentence: 'The features we extract are invariant to rotation.',
    folds: [
      { span: 'we extract', type: 'rel', to: 'features' },
      { span: 'to rotation', type: 'pp', to: 'invariant' },
    ],
    roles: { subj: 'The features', verb: 'are', comp: 'invariant' },
    misrole: {
      subj: { we: T('<i>we</i> 是被省掉 <i>that</i> 的从句的主语。谓语 <i>are</i> 说的是特征。', '<i>we</i> is the subject of the clause whose <i>that</i> is left out. The verb <i>are</i> is about the features.') },
      verb: { extract: T('<i>extract</i> 是从句的动词：<i>(that) we extract</i> 说明是哪些特征。', '<i>extract</i> is the clause’s verb: <i>(that) we extract</i> says which features.') },
    },
    debrief: {
      title: T('The features we extract are invariant to rotation.', 'The features we extract are invariant to rotation.'),
      body: [T('<i>The features (that) we extract</i>：省掉了 <i>that</i>。主干 <i>The features are invariant</i>，<i>to rotation</i> 挂在 <i>invariant</i> 上。我们提取的特征对旋转不变。', '<i>The features (that) we extract</i>: the <i>that</i> is left out. The skeleton is <i>The features are invariant</i>, with <i>to rotation</i> on <i>invariant</i>. The features we extract do not change under rotation.')],
      note: T('名词后面直接跟着“主语 + 动词”，多半是省了关系词的定语从句。', 'A noun followed straight away by a subject and verb is mostly a relative clause without its relative word.'),
    },
  },
  {
    id: '3-4',
    title: T('从句里也有修饰', 'Modifiers inside'),
    brief: T('标出主干，把修饰成分一层层折起来。', 'Mark the skeleton, folding the modifiers layer by layer.'),
    intro: [{ t: T('定语从句里也会有自己的修饰成分；主干的主语和宾语都可以带着一个从句。', 'A relative clause can have modifiers of its own, and both the subject and the object may carry a clause.') }],
    hint: [T('<i>in Section 4</i> 说明的是从句里的哪个词？', 'Which word inside the clause does <i>in Section 4</i> tell about?')],
    sentence: 'The approach that we describe in Section 4 reduces the memory that the attention layer requires.',
    folds: [
      { span: 'in Section 4', type: 'pp', to: 'describe' },
      { span: 'that we describe in Section 4', type: 'rel', to: 'approach' },
      { span: 'that the attention layer requires', type: 'rel', to: 'memory' },
    ],
    roles: { subj: 'The approach', verb: 'reduces', obj: 'the memory' },
    debrief: {
      title: T('The approach that we describe in Section 4 reduces the memory that the attention layer requires.', 'The approach that we describe in Section 4 reduces the memory that the attention layer requires.'),
      body: [T('主干 <i>The approach reduces the memory</i>。主语带着 <i>that we describe in Section 4</i>（里面 <i>in Section 4</i> 挂在 <i>describe</i> 上），宾语带着 <i>that the attention layer requires</i>。我们在第 4 节介绍的方法减少了注意力层所需的内存。', 'The skeleton is <i>The approach reduces the memory</i>. The subject carries <i>that we describe in Section 4</i> (with <i>in Section 4</i> on <i>describe</i>), the object <i>that the attention layer requires</i>.')],
      note: T('从句里的修饰成分挂在从句里的词上，先折。', 'A modifier inside a clause hangs on a word inside it; fold it first.'),
    },
  },
  {
    id: '3-5',
    title: T('挂哪个名词', 'Which noun'),
    brief: T('标出主干，把修饰成分一层层折起来。', 'Mark the skeleton, folding the modifiers layer by layer.'),
    intro: [{ t: T('一个定语从句前面有两个名词时，它修饰哪一个？从句里的动词是单数还是复数，常常给出答案。', 'With two nouns before a relative clause, which does it modify? Whether the clause’s verb is singular or plural often tells.') }],
    hint: [T('从句里是 <i>were</i>：和它一致的是单数名词，还是复数名词？', 'The clause has <i>were</i>: does it agree with a singular noun or a plural one?')],
    sentence: 'We report the accuracy of the models that were trained on ImageNet.',
    folds: [
      { span: 'on ImageNet', type: 'pp', to: 'trained' },
      { span: 'that were trained on ImageNet', type: 'rel', to: 'models', misread: { accuracy: T('从句里是 <i>were</i>，复数；<i>accuracy</i> 是单数。和 <i>were</i> 一致的是 <i>models</i>：在 ImageNet 上训练的是模型。', 'The clause has <i>were</i>, plural; <i>accuracy</i> is singular. <i>were</i> agrees with <i>models</i>: what was trained on ImageNet is the models.') } },
      { span: 'of the models that were trained on ImageNet', type: 'pp', to: 'accuracy' },
    ],
    roles: { subj: 'We', verb: 'report', obj: 'the accuracy' },
    debrief: {
      title: T('We report the accuracy of the models that were trained on ImageNet.', 'We report the accuracy of the models that were trained on ImageNet.'),
      body: [T('<i>that were trained on ImageNet</i> 挂在 <i>models</i> 上，所以它和 <i>models</i> 一起折进 <i>of …</i> 那一块。我们报告在 ImageNet 上训练的那些模型的准确率。', '<i>that were trained on ImageNet</i> hangs on <i>models</i>, so it folds into the <i>of …</i> piece along with <i>models</i>. We report the accuracy of the models trained on ImageNet.')],
      note: T('修饰成分跟着它修饰的词走：词折进哪一块，它也折进哪一块。', 'A modifier goes with its word: wherever the word is folded, so is it.'),
    },
  },
  {
    id: '3-6',
    title: T('指整件事的 which', 'A which for the whole'),
    brief: T('标出主干，把修饰成分折起来。', 'Mark the skeleton, folding the modifiers away.'),
    intro: [{ t: T(`逗号后面的 <i>which</i> 有时不指哪个名词，而指前面说的整件事。这叫${w('sentential-which')}，折起来以后挂在主干的谓语上。`, `A <i>which</i> after a comma sometimes refers to no noun but to the whole event just told. This is a ${w('sentential-which')}; folded, it hangs on the skeleton’s verb.`) }],
    hint: [T('暗示过拟合的，是“十个周期”，还是“损失在十个周期后上升”这件事？', 'What suggests overfitting: ten epochs, or the loss rising after ten epochs?')],
    sentence: 'The training loss increases after ten epochs, which suggests overfitting.',
    folds: [
      { span: 'after ten epochs', type: 'pp', to: 'increases' },
      { span: 'which suggests overfitting', type: 'rel', to: 'increases', misread: { epochs: T('<i>which</i> 若指 <i>ten epochs</i>，就成了“十个周期暗示过拟合”。暗示过拟合的是前面整件事：损失在上升。', 'If <i>which</i> meant <i>ten epochs</i>, ten epochs would suggest overfitting. What suggests it is the whole event before: the loss going up.'), loss: T('<i>which</i> 若只指 <i>loss</i>，就成了“损失本身暗示过拟合”。暗示过拟合的是损失在十个周期后上升这件事。', 'If <i>which</i> meant only <i>loss</i>, the loss itself would suggest overfitting. What does is the loss rising after ten epochs.') } },
    ],
    roles: { subj: 'The training loss', verb: 'increases' },
    debrief: {
      title: T('The training loss increases after ten epochs, which suggests overfitting.', 'The training loss increases after ten epochs, which suggests overfitting.'),
      body: [T('<i>which suggests overfitting</i> 说的是前面整件事：训练损失在十个周期后上升，这说明出现了过拟合。论文里报告现象再下判断，常用这个句式。', '<i>which suggests overfitting</i> is about the whole event before it: the training loss rising after ten epochs points to overfitting. Papers often report an observation and judge it in just this shape.')],
      note: T('逗号后的 which 可以指前面整件事。', 'A which after a comma can stand for the whole event before it.'),
    },
  },
  {
    id: '3-7',
    title: T('藏起来的从句', 'A hidden clause'),
    brief: T('标出主干，把修饰成分折起来。', 'Mark the skeleton, folding the modifiers away.'),
    intro: [{ t: T('关系词省掉了，介词又被留在了从句的末尾。', 'The relative word is left out, and a preposition is left behind at the clause’s end.') }],
    hint: [T('<i>data</i> 后面直接跟着 <i>the model was trained on</i>：模型是在什么上训练的？', '<i>data</i> is followed straight away by <i>the model was trained on</i>: trained on what?'), T('这句话里有两个谓语样子的动词，主干的是哪一个？', 'Two verbs look like the main one: which belongs to the skeleton?')],
    sentence: 'The data the model was trained on came from three hospitals.',
    folds: [
      { span: 'the model was trained on', type: 'rel', to: 'data' },
      { span: 'from three hospitals', type: 'pp', to: 'came' },
    ],
    roles: { subj: 'The data', verb: 'came' },
    misrole: {
      verb: { 'was trained': T('<i>was trained</i> 在从句里：<i>(that) the model was trained on</i> 说明是哪些数据，即模型训练所用的数据。主干的谓语是后面的动词。', '<i>was trained</i> is inside the clause: <i>(that) the model was trained on</i> says which data, the data the model was trained on. The skeleton’s verb comes later.') },
      subj: { 'the model': T('<i>the model</i> 是从句的主语。从三家医院来的不是模型，是数据。', '<i>the model</i> is the clause’s subject. What came from three hospitals is not the model but the data.') },
    },
    debrief: {
      title: T('The data the model was trained on came from three hospitals.', 'The data the model was trained on came from three hospitals.'),
      body: [T('<i>The data (that) the model was trained on</i>：省掉了 <i>that</i>，<i>on</i> 留在末尾，等于 <i>the data on which the model was trained</i>。主干 <i>The data came</i>：模型的训练数据来自三家医院。', '<i>The data (that) the model was trained on</i>: <i>that</i> is left out and <i>on</i> stays at the end, as in <i>the data on which the model was trained</i>. The skeleton is <i>The data came</i>: the training data came from three hospitals.')],
      note: T('名词后面紧跟一整句、末尾还挂着介词：多半是省了关系词的定语从句。', 'A noun followed by a whole clause ending in a preposition: mostly a relative clause without its relative word.'),
    },
  },
  {
    id: '3-8',
    title: T('一句数据集说明', 'A dataset statement'),
    brief: T('标出主干，把所有修饰成分折起来。', 'Mark the skeleton, folding every modifier away.'),
    intro: [{ t: T('论文里描述数据集的一句：主语和宾语各带一个从句，从句里又有介词短语。', 'A line describing a dataset: the subject and the object each carry a clause, and the clauses carry prepositional phrases.') }],
    hint: [T('<i>from public sources</i> 和 <i>in 2023</i> 说明的都是从句里的哪个动作？', 'Which action inside a clause do <i>from public sources</i> and <i>in 2023</i> tell about?')],
    sentence: 'The dataset that we release with this paper contains images that were collected from public sources in 2023.',
    folds: [
      { span: 'with this paper', type: 'pp', to: 'release' },
      { span: 'that we release with this paper', type: 'rel', to: 'dataset' },
      { span: 'from public sources', type: 'pp', to: 'collected' },
      { span: 'in 2023', type: 'pp', to: 'collected', misread: { sources: T('“2023 年里的公开来源”说不通：2023 年说的是收集的时间。', '“Public sources in 2023” is not the point: 2023 is when the images were collected.') } },
      { span: 'that were collected from public sources in 2023', type: 'rel', to: 'images' },
    ],
    roles: { subj: 'The dataset', verb: 'contains', obj: 'images' },
    debrief: {
      title: T('The dataset that we release with this paper contains images that were collected from public sources in 2023.', 'The dataset that we release with this paper contains images that were collected from public sources in 2023.'),
      body: [T('主干只有 <i>The dataset contains images</i>。我们随本文发布的数据集，收录了 2023 年从公开来源收集的图像。', 'The skeleton is just <i>The dataset contains images</i>. The dataset we release with this paper holds images gathered from public sources in 2023.')],
      note: T('每个从句都有自己的小主干；折起来，大句的主干就清楚了。', 'Every clause has a little skeleton of its own; fold them, and the sentence’s shows.'),
    },
  },
]
