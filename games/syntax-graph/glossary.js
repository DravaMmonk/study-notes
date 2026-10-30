// 句法之图's encyclopedia (the shell's 百科): how a sentence is taken apart, then the parts of a sentence and the
// constructions met on the way. An entry opens once the level `at` is reached (no `at`: from the start).

const T = (zh, en) => ({ zh, en })
const w = (id) => `<wiki-ref to="${id}"></wiki-ref>`

export const groups = [
  { id: 'play', title: T('玩法', 'How to play') },
  { id: 'parts', title: T('句子成分', 'Parts of a sentence') },
  { id: 'constructions', title: T('结构', 'Constructions') },
]

export const entries = [
  {
    id: 'taking-apart', group: 'play', title: T('拆句', 'Taking a sentence apart'),
    body: [
      T('点一个词开始选一段，再点另一个词结束；只要一个词或一块折好的成分，就点它一下。选好以后，把它标成主干的一个成分，或者折成一种结构：折的时候再点它修饰的那个词，它就收成一块，挂在那个词上。', 'Tap a word to start a stretch and another to end it; for one word or one folded piece, tap it once. Then mark it as a part of the skeleton, or fold it as a construction: tap the word it modifies, and it becomes one piece hung on that word.'),
      T('点一块折好的成分再选「拆开」，它就展开回原来的词，里面折好的还留着。对照时，挂错的地方会告诉你那样挂是什么意思；没折的修饰成分只报个数。', 'Tap a folded piece and choose Unfold to open it back into its words; anything folded inside it stays folded. When you check, a piece hung on the wrong word tells you what that would mean; modifiers not yet folded are only counted.'),
    ],
    see: ['skeleton', 'modifier'],
  },
  {
    id: 'skeleton', group: 'parts', title: T('主干', 'skeleton'), at: '1-1',
    body: [T(`一句话去掉所有修饰成分以后剩下的部分：${w('subject')}、${w('verb')}，再加上${w('object')}或表语。读长句，先找主干。`, `What a sentence leaves once every modifier is taken away: the ${w('subject')}, the ${w('verb')}, and an ${w('object')} or a complement. To read a long sentence, find its skeleton first.`)],
  },
  {
    id: 'subject', group: 'parts', title: T('主语', 'subject'), at: '1-1',
    body: [T('句子说的是谁、是什么，通常是谓语前面的名词短语。英语的主语几乎不能省。', 'Who or what the sentence is about, usually the noun phrase before the verb. English hardly ever leaves it out.')],
  },
  {
    id: 'verb', group: 'parts', title: T('谓语', 'verb'), at: '1-1',
    body: [T('主语做什么、怎么样：整个动词词组，连同助动词（<i>has been shown</i>）。一个句子的主干只有一个谓语；别的动词都在从句或修饰成分里。', 'What the subject does or is: the whole verb group, auxiliaries included (<i>has been shown</i>). A sentence’s skeleton has one verb; every other verb is inside a clause or a modifier.')],
  },
  {
    id: 'object', group: 'parts', title: T('宾语', 'object'), at: '1-1',
    body: [T('动作落到的东西，跟在谓语后面的名词短语。', 'What the action lands on: the noun phrase after the verb.')],
  },
  {
    id: 'modifier', group: 'parts', title: T('修饰成分', 'modifier'), at: '1-2',
    body: [T(`说明另一个词的一串词。英语的修饰成分大多跟在被修饰的词后面，所以名词后面常拖着长长一串。它说明的那个词是它的${w('head')}。`, `A run of words telling about another word. In English most modifiers follow the word they modify, which is why nouns often trail long runs of words. The word it tells about is its ${w('head')}.`)],
    see: ['pp'],
  },
  {
    id: 'head', group: 'parts', title: T('中心词', 'head'), at: '1-2',
    body: [T('一个短语里被修饰的那个词：<i>the running time of the algorithm</i> 的中心词是 <i>time</i>。主语和谓语在单复数上要和中心词一致。', 'The word a phrase is built around: in <i>the running time of the algorithm</i> it is <i>time</i>. Agreement goes by the head.')],
  },
  {
    id: 'pp', group: 'constructions', title: T('介词短语', 'prepositional phrase'), at: '1-2',
    body: [T('一个介词带着后面的一串词：<i>of the model</i>、<i>on a single GPU</i>、<i>for image classification</i>。它可以修饰名词，也可以修饰动作。', 'A preposition and the words after it: <i>of the model</i>, <i>on a single GPU</i>, <i>for image classification</i>. It can tell about a noun or about the action.')],
    see: ['attributive', 'adverbial'],
  },
  {
    id: 'linking-verb', group: 'parts', title: T('系动词', 'linking verb'), at: '1-5',
    body: [T('<i>be</i>、<i>become</i>、<i>remain</i>、<i>seem</i> 这类动词：不表示动作，只把主语和后面的表语连起来。', 'Verbs such as <i>be</i>, <i>become</i>, <i>remain</i>, <i>seem</i>: no action, only a link between the subject and the complement after it.')],
  },
  {
    id: 'complement', group: 'parts', title: T('表语', 'complement'), at: '1-5',
    body: [T('系动词后面、说明主语是什么或怎么样的成分：<i>The contribution is <b>a new loss function</b></i>；<i>The features are <b>invariant</b></i>。', 'What follows a linking verb, saying what the subject is or what it is like: <i>The contribution is <b>a new loss function</b></i>; <i>The features are <b>invariant</b></i>.')],
  },
  {
    id: 'agreement', group: 'parts', title: T('主谓一致', 'agreement'), at: '1-6',
    body: [T('谓语和主语在人称、单复数上对得上：<i>The output … is</i>，<i>The weights … are</i>。读长句时反过来用：谓语是单数还是复数，能指出哪个名词才是主语。', 'The verb matches its subject in person and number: <i>The output … is</i>, <i>The weights … are</i>. In a long sentence, use it the other way round: the verb’s number points to the noun that is the subject.')],
  },
  {
    id: 'attributive', group: 'parts', title: T('定语', 'attributive'), at: '2-1',
    body: [T('修饰名词的成分，说明“什么样的”“谁的”“哪一个”：<i>an algorithm <b>with linear running time</b></i>。', 'A modifier of a noun, telling what kind, whose or which: <i>an algorithm <b>with linear running time</b></i>.')],
  },
  {
    id: 'adverbial', group: 'parts', title: T('状语', 'adverbial'), at: '2-1',
    body: [T('修饰动作或整件事的成分，说明在哪里、什么时候、怎么做、做到什么程度：<i>We train the model <b>on a single GPU</b></i>。放在句首、用逗号隔开的，一般管整句。', 'A modifier of the action or the whole event, telling where, when, how or how much: <i>We train the model <b>on a single GPU</b></i>. One up front, set off by a comma, usually covers the whole sentence.')],
  },
  {
    id: 'relative-clause', group: 'constructions', title: T('定语从句', 'relative clause'), at: '3-1',
    body: [T(`跟在名词后面、自带主语和谓语的小句，修饰这个名词：<i>the method <b>that we propose</b></i>。通常由${w('relative-word')}开头。`, `A clause with its own subject and verb after a noun, modifying it: <i>the method <b>that we propose</b></i>. Usually opened by a ${w('relative-word')}.`)],
    see: ['nonrestrictive'],
  },
  {
    id: 'relative-word', group: 'constructions', title: T('关系词', 'relative word'), at: '3-1',
    body: [T('开头引出定语从句的词：<i>that</i>、<i>which</i>、<i>who</i>、<i>whom</i>、<i>whose</i>，以及 <i>where</i>、<i>when</i>。它在从句里还占一个位置（主语、宾语……）。', 'The word that opens a relative clause: <i>that</i>, <i>which</i>, <i>who</i>, <i>whom</i>, <i>whose</i>, and <i>where</i>, <i>when</i>. It also fills a place inside the clause (its subject, its object…).')],
  },
  {
    id: 'nonrestrictive', group: 'constructions', title: T('非限制性定语从句', 'non-restrictive clause'), at: '3-2',
    body: [T('用逗号隔开的定语从句（多用 <i>which</i>，不用 <i>that</i>），给一个已经确定的名词补充信息；拿掉它，主干的意思不变。', 'A relative clause set off by commas (with <i>which</i>, not <i>that</i>), adding to a noun already pinned down; take it out and the skeleton means the same.')],
  },
  {
    id: 'zero-relative', group: 'constructions', title: T('省略关系词', 'zero relative'), at: '3-3',
    body: [T('关系词在从句里作宾语时可以省掉：<i>the features (that) we extract</i>、<i>the data (that) the model was trained on</i>。标志是名词后面直接跟着另一个主语和动词。', 'A relative word can be left out when it is the clause’s object: <i>the features (that) we extract</i>, <i>the data (that) the model was trained on</i>. The sign is a noun followed straight away by another subject and verb.')],
  },
  {
    id: 'sentential-which', group: 'constructions', title: T('指整句的 which', 'sentential which'), at: '3-6',
    body: [T('逗号后面、指前面整件事的 <i>which</i>：<i>The loss increases, <b>which suggests overfitting</b></i>。它不修饰哪个名词，挂在主干的谓语上。', 'A <i>which</i> after a comma that stands for the whole event before it: <i>The loss increases, <b>which suggests overfitting</b></i>. It modifies no noun and hangs on the skeleton’s verb.')],
  },
]
