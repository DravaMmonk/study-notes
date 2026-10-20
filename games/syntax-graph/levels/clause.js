// Era 1 · 小句 (the clause): one subject, one verb, its objects, one tense that sets the time and agrees, in the
// world of a computer science paper and its review. Only level specs: the meaning to say, the words on offer, the
// reference answer and the traps the level must turn down. How a clause is filled and checked is the syntax domain's
// (games/kit/domains/syntax).

const T = (zh, en) => ({ zh, en })
const role = (ent, number, label, note) => ({ ent, number, label, ...(note ? { note } : {}) })

const PAST = T('过去某个时候发生，已经结束', 'happened at some point in the past, and is over')
const AS_A_RULE = T('一般成立：性质、规律或结论', 'holds in general: a property, a rule or a finding')
const UP_TO_NOW = T('已经发生，结果延续到现在', 'has happened, and its result holds now')
const IN_PROGRESS_THEN = T('过去某一刻正在进行', 'was in progress at a moment in the past')
const BEFORE_THEN = T('在过去另一时刻之前已经完成', 'was done before another moment in the past')
const LATER = T('将来会发生', 'will happen')
const WE = role('author', 'pl', T('我们（作者）', 'we (the authors)'), T('说话人', 'the speakers'))

export const levels = [
  {
    id: '1-1',
    title: T('主语', 'Subject'),
    brief: T('让句子说出这张语义图的意思：谁、发生了什么、什么时候。', 'Make the sentence say what the meaning graph says: who, what happened, and when.'),
    intro: [
      { t: T('在这里，一句话是一排按顺序排好的<b>位置</b>，每个位置只收一种词。词放进去，句子就念出来。', 'Here a sentence is a row of <b>places</b> in order, and each place takes one kind of word. Put words in, and the sentence reads itself out.') },
      { t: T('每一关的目标是一张<b>语义图</b>：中间是发生的事，连出去的是参与的人和物，下面写着时间。语义图只说意思，不说用哪个词。', 'Each level’s goal is a <b>meaning graph</b>: what happens in the middle, the people and things taking part around it, and the time below. It gives only the meaning, never the words.') },
      { t: T('<b>主语</b>是句子说的那个人或物，放在最前面。它是一个<b>名词短语</b>，比如 <i>the model</i>。', 'The <b>subject</b> is who or what the sentence is about, and it comes first. It is a <b>noun phrase</b>, such as <i>the model</i>.') },
    ],
    hint: [T('先读语义图：参与者是哪个、单数还是复数。', 'Read the meaning graph first: which participant it is, and whether it is singular or plural.')],
    meaning: { pred: 'converge', tense: 'past', aspect: 'simple', gloss: PAST, roles: { THEME: role('model', 'sg', T('模型', 'model')) } },
    palette: { np: ['models', 'model'] },
    preset: { INFL: 'ed', V: 'converge' },
    answer: { SUBJ: 'model', INFL: 'ed', V: 'converge' },
    traps: [{ answer: { SUBJ: 'models', INFL: 'ed', V: 'converge' }, fails: 'role' }],
    debrief: {
      title: T('The model converged.', 'The model converged.'),
      body: [T('<i>the models</i> 也放得进主语的位置，但语义图要的是一个模型：放得进，不等于意思对。', '<i>the models</i> fits the subject place too, but the graph wants one model: fitting is not yet saying the right thing.')],
      note: T('放得进靠语法，说得对靠意思；两样都要。', 'Fitting is grammar; saying the right thing is meaning. You need both.'),
    },
  },
  {
    id: '1-2',
    title: T('谓语', 'Predicate'),
    brief: T('让句子说出语义图的意思。这一次，动词也要你来选。', 'Make the sentence say what the meaning graph says. This time the verb is yours to choose too.'),
    intro: [
      { t: T('主语后面是<b>谓语</b>：说主语怎么了。谓语的核心是<b>动词</b>。', 'After the subject comes the <b>predicate</b>: what happens to the subject. Its core is the <b>verb</b>.') },
      { t: T('这一关的动词都是<b>不及物</b>的：后面什么也不跟，句子到动词就完整了。', 'The verbs in this level are all <b>intransitive</b>: nothing follows them, and the sentence is complete at the verb.') },
    ],
    hint: [T('语义图中间那个词，就是要说的事。', 'The word in the middle of the meaning graph is what has to be said.')],
    meaning: { pred: 'fail', tense: 'past', aspect: 'simple', gloss: PAST, roles: { THEME: role('experiment', 'sg', T('实验', 'experiment')) } },
    palette: { np: ['algorithm', 'experiments', 'experiment'], verb: ['converge', 'fail'] },
    preset: { INFL: 'ed' },
    answer: { SUBJ: 'experiment', INFL: 'ed', V: 'fail' },
    traps: [{ answer: { SUBJ: 'experiment', INFL: 'ed', V: 'converge' }, fails: 'pred' }, { answer: { SUBJ: 'algorithm', INFL: 'ed', V: 'fail' }, fails: 'role' }],
    debrief: {
      title: T('The experiment failed.', 'The experiment failed.'),
      body: [T('谓语里的 <i>-ed</i> 把 <i>fail</i> 变成了 <i>failed</i>：动词念成什么形式，由它前面的时体来定。', 'The <i>-ed</i> in the predicate turned <i>fail</i> into <i>failed</i>: the form a verb takes is decided by the tense in front of it.')],
      note: T('小句 = 主语 + 谓语；动词的形式由时体决定。', 'A clause = subject + predicate; the tense decides the verb’s form.'),
    },
  },
  {
    id: '1-3',
    title: T('时与一致', 'Tense and agreement'),
    brief: T('让句子说出语义图的意思。这一次，时体也要你来选。', 'Make the sentence say what the meaning graph says. This time the tense is yours to choose too.'),
    intro: [
      { t: T('谓语开头的<b>时体</b>（INFL）定下时间：<i>-s</i> 和 <i>∅</i> 是现在，<i>-ed</i> 是过去，<i>will</i> 是将来。论文里说算法、定理的性质，用一般现在时。', 'The <b>tense</b> (INFL) at the start of the predicate sets the time: <i>-s</i> and <i>∅</i> are present, <i>-ed</i> is past, <i>will</i> is future. A paper states properties of algorithms and theorems in the simple present.') },
      { t: T('时体还带着<b>一致</b>的要求：有的只接某几种主语。词块下面写着它要什么样的主语；放不进去时，会告诉你为什么。', 'A tense also carries an <b>agreement</b> requirement: some take only certain subjects. The line under each word says what subject it needs; when it will not go in, you are told why.') },
    ],
    hint: [T('现在时有两个：<i>-s</i> 和 <i>∅</i>，它们要的主语不一样。', 'There are two present tenses, <i>-s</i> and <i>∅</i>, and they need different subjects.')],
    meaning: { pred: 'terminate', tense: 'present', aspect: 'simple', gloss: AS_A_RULE, roles: { THEME: role('algorithm', 'pl', T('算法', 'algorithms'), T('不止一个', 'more than one')) } },
    palette: { np: ['algorithm', 'algorithms'], verb: ['fail', 'terminate'], infl: ['ed', 's', 'will', 'zero'] },
    answer: { SUBJ: 'algorithms', INFL: 'zero', V: 'terminate' },
    traps: [
      { answer: { SUBJ: 'algorithms', INFL: 's', V: 'terminate' }, fails: 'grammar' },
      { answer: { SUBJ: 'algorithm', INFL: 's', V: 'terminate' }, fails: 'role' },
      { answer: { SUBJ: 'algorithms', INFL: 'ed', V: 'terminate' }, fails: 'time' },
    ],
    debrief: {
      title: T('The algorithms terminate.', 'The algorithms terminate.'),
      body: [T('英语的现在时要和主语<b>一致</b>：第三人称单数用 <i>-s</i>（<i>the algorithm terminates</i>），其余用不加词尾的形式。论文里最常见的主谓不一致，就出在长主语之后忘了它是单数还是复数。', 'The English present has to <b>agree</b> with its subject: third-person singular takes <i>-s</i> (<i>the algorithm terminates</i>), everything else the bare form. The commonest agreement slip in papers comes after a long subject, when the writer loses track of its number.')],
      note: T('一致：时体和主语，在人称和数上要对得上。', 'Agreement: the tense and the subject must match in person and number.'),
    },
  },
  {
    id: '1-4',
    title: T('宾语', 'Object'),
    brief: T('让句子说出语义图的意思。', 'Make the sentence say what the meaning graph says.'),
    intro: [
      { t: T('<b>及物动词</b>后面要跟一个<b>宾语</b>：动作落到的那个东西。选了及物动词，它后面就会多出一个宾语的位置。', 'A <b>transitive verb</b> needs an <b>object</b> after it: what the action lands on. Pick a transitive verb, and an object place appears after it.') },
      { t: T('动词的<b>框架</b>说它后面开几个位置。词块下面的 <i>V NP</i> 就是框架：动词后面跟一个名词短语。', 'A verb’s <b>frame</b> says how many places it opens after it. The <i>V NP</i> under a word is its frame: the verb followed by one noun phrase.') },
    ],
    hint: [T('语义图里有两个参与者，谁比谁好？', 'The meaning graph has two participants. Which one beats which?')],
    meaning: { pred: 'outperform', tense: 'present', aspect: 'simple', gloss: AS_A_RULE, roles: { AGENT: role('method', 'sg', T('方法', 'method'), T('本文提出的', 'the one this paper proposes')), THEME: role('baseline', 'sg', T('基线', 'baseline')) } },
    palette: { np: ['baselines', 'method', 'baseline'], verb: ['converge', 'outperform'], infl: ['ed', 's', 'will'] },
    answer: { SUBJ: 'method', INFL: 's', V: 'outperform', OBJ: 'baseline' },
    traps: [
      { answer: { SUBJ: 'baseline', INFL: 's', V: 'outperform', OBJ: 'method' }, fails: 'role' },
      { answer: { SUBJ: 'method', INFL: 'ed', V: 'outperform', OBJ: 'baseline' }, fails: 'time' },
      { answer: { SUBJ: 'method', INFL: 's', V: 'converge' }, fails: 'pred' },
    ],
    debrief: {
      title: T('The method outperforms the baseline.', 'The method outperforms the baseline.'),
      body: [T('同样两个名词短语，放在主语还是宾语，意思就反过来：英语靠<b>位置</b>分出谁做、做给谁。', 'The same two noun phrases mean the opposite depending on whether they sit as subject or object: English tells the doer from the done-to by <b>position</b>.'), T('报告实验结论时，论文通常用一般现在时：这是一条成立的结论，不只是一段经过。', 'Papers usually report a finding in the simple present: it is a result that holds, not just something that happened once.')],
      note: T('及物动词后面开一个宾语位置；谁是施事、谁是客体，由位置决定。', 'A transitive verb opens an object place after it; position decides which is the agent and which the theme.'),
    },
  },
  {
    id: '1-5',
    title: T('完成体', 'Perfect'),
    brief: T('让句子说出语义图的意思。注意语义图下面的时间。', 'Make the sentence say what the meaning graph says. Mind the time under the graph.'),
    intro: [
      { t: T('时间不止过去、现在、将来。<b>体</b>说的是从哪个角度看一件事：<b>完成体</b>说它已经做完，而且结果还在。', 'Time is more than past, present and future. <b>Aspect</b> is the angle an event is seen from: the <b>perfect</b> says it is done and its result still stands.') },
      { t: T('完成体的时体带着一个助动词，并要求动词用<b>过去分词</b>（<i>-en</i> 形式，如 <i>accepted</i>、<i>withdrawn</i>）。', 'A perfect tense brings an auxiliary and asks for the verb’s <b>past participle</b> (its <i>-en</i> form, as in <i>accepted</i>, <i>withdrawn</i>).') },
    ],
    hint: [
      T('“结果延续到现在”和“过去某个时候、已经结束”不是一回事。', '“Its result holds now” is not the same as “at some point in the past, and over”.'),
      T('程序委员会是一个整体。', 'A programme committee is one body.'),
    ],
    meaning: { pred: 'accept', tense: 'present', aspect: 'perfect', gloss: UP_TO_NOW, roles: { AGENT: role('committee', 'sg', T('程序委员会', 'programme committee'), T('一个整体', 'one body')), THEME: role('paper', 'sg', T('论文', 'paper')) } },
    palette: { np: ['paper', 'committees', 'committee'], verb: ['reject', 'accept'], infl: ['have', 'ed', 'has'] },
    answer: { SUBJ: 'committee', INFL: 'has', V: 'accept', OBJ: 'paper' },
    traps: [
      { answer: { SUBJ: 'committee', INFL: 'have', V: 'accept', OBJ: 'paper' }, fails: 'grammar' },
      { answer: { SUBJ: 'committee', INFL: 'ed', V: 'accept', OBJ: 'paper' }, fails: 'time' },
      { answer: { SUBJ: 'committees', INFL: 'have', V: 'accept', OBJ: 'paper' }, fails: 'role' },
    ],
    debrief: {
      title: T('The committee has accepted the paper.', 'The committee has accepted the paper.'),
      body: [T('<i>accepted</i> 和 <i>has accepted</i> 都发生在过去，区别在于说话人站在哪：一般过去时只讲那时，现在完成时讲的是“现在，论文已经被录用”。', 'Both <i>accepted</i> and <i>has accepted</i> happened in the past; what differs is where the speaker stands. The simple past talks about then; the present perfect says “now, the paper is in”.'), T('委员会在这里按一个整体算，所以用 <i>has</i>。英式英语有时把它当复数，这个游戏按美式英语判。', 'The committee counts as one body here, so it takes <i>has</i>. British English sometimes treats it as plural; this game goes by American usage.')],
      note: T('完成体 = 助动词 have + 过去分词；看的是结果还在不在。', 'Perfect = auxiliary have + past participle; it looks at whether the result still stands.'),
    },
  },
  {
    id: '1-6',
    title: T('格', 'Case'),
    brief: T('以作者的口吻说出语义图的意思。两个参与者前文都已提过，用代词说。', 'Say what the meaning graph says in the authors’ voice. Both participants have been mentioned already, so use pronouns.'),
    intro: [
      { t: T('论文正文里，作者自称 <i>we</i>；前面提过的东西，用代词指回去。', 'In the body of a paper the authors call themselves <i>we</i>, and point back to things already mentioned with pronouns.') },
      { t: T('代词有<b>格</b>：<i>we</i>、<i>they</i> 是主格，只能当主语；<i>us</i>、<i>them</i> 是宾格，只能当宾语。名词短语没有这个区别。', 'Pronouns have <b>case</b>: <i>we</i> and <i>they</i> are nominative and can only be subjects; <i>us</i> and <i>them</i> are accusative and can only be objects. Noun phrases show no such difference.') },
    ],
    hint: [T('先定每个代词指谁、单数还是复数，再看它能放在哪个位置。', 'First settle whom each pronoun names and whether it is singular or plural, then which place it can take.')],
    meaning: { pred: 'evaluate', tense: 'past', aspect: 'simple', gloss: PAST, roles: { AGENT: WE, THEME: role('model', 'pl', T('模型', 'models'), T('前文已提及', 'mentioned earlier')) } },
    refer: { we: 'author', us: 'author', they: 'model', them: 'model', it: 'model' },
    palette: { np: ['us', 'they', 'it', 'we', 'them'], verb: ['submit', 'evaluate'], infl: ['s', 'ed', 'will'] },
    answer: { SUBJ: 'we', INFL: 'ed', V: 'evaluate', OBJ: 'them' },
    traps: [
      { answer: { SUBJ: 'us', INFL: 'ed', V: 'evaluate', OBJ: 'them' }, fails: 'grammar' },
      { answer: { SUBJ: 'we', INFL: 'ed', V: 'evaluate', OBJ: 'they' }, fails: 'grammar' },
      { answer: { SUBJ: 'we', INFL: 'ed', V: 'evaluate', OBJ: 'it' }, fails: 'role' },
    ],
    debrief: {
      title: T('We evaluated them.', 'We evaluated them.'),
      body: [T('名词在英语里早就丢了格的词尾，只有代词还留着：<i>we / us</i>、<i>they / them</i>。所以代词放错位置，审稿人一眼就能看出来。', 'English nouns lost their case endings long ago; only pronouns keep them: <i>we / us</i>, <i>they / them</i>. That is why a pronoun in the wrong place jumps out at a reviewer.'), T('<i>it</i> 也放得进宾语位置，但它是单数，而前面提到的模型不止一个。', '<i>it</i> fits the object place too, but it is singular, and the models mentioned earlier are more than one.')],
      note: T('代词有格：主格当主语，宾格当宾语。', 'Pronouns have case: nominative for subjects, accusative for objects.'),
    },
  },
  {
    id: '1-7',
    title: T('进行体', 'Progressive'),
    brief: T('让句子说出语义图的意思。', 'Make the sentence say what the meaning graph says.'),
    intro: [
      { t: T('<b>进行体</b>把一件事放在它进行到一半的那一刻来看。它的时体带着 <i>be</i> 的某个形式，并要求动词用 <i>-ing</i> 形式。', 'The <b>progressive</b> looks at an event in the middle of happening. Its tense brings a form of <i>be</i> and asks for the verb’s <i>-ing</i> form.') },
      { t: T('<i>be</i> 的形式最多：<i>am / is / are</i>，<i>was / were</i>。每个都有自己的一致要求。', '<i>be</i> has the most forms of all: <i>am / is / are</i>, <i>was / were</i>. Each has its own agreement requirement.') },
    ],
    hint: [T('这件事发生在过去，而且当时正在进行。', 'This happened in the past, and was going on at the time.')],
    meaning: { pred: 'check', tense: 'past', aspect: 'progressive', gloss: IN_PROGRESS_THEN, roles: { AGENT: role('reviewer', 'pl', T('审稿人', 'reviewers'), T('不止一位', 'more than one')), THEME: role('proof', 'sg', T('证明', 'proof')) } },
    palette: { np: ['proofs', 'reviewer', 'proof', 'reviewers'], verb: ['reject', 'check'], infl: ['ed', 'is', 'was', 'are', 'were'] },
    answer: { SUBJ: 'reviewers', INFL: 'were', V: 'check', OBJ: 'proof' },
    traps: [
      { answer: { SUBJ: 'reviewers', INFL: 'was', V: 'check', OBJ: 'proof' }, fails: 'grammar' },
      { answer: { SUBJ: 'reviewers', INFL: 'are', V: 'check', OBJ: 'proof' }, fails: 'time' },
      { answer: { SUBJ: 'reviewers', INFL: 'ed', V: 'check', OBJ: 'proof' }, fails: 'time' },
    ],
    debrief: {
      title: T('The reviewers were checking the proof.', 'The reviewers were checking the proof.'),
      body: [T('<i>checked</i> 说核查做完了，<i>were checking</i> 说那时正在核查，至于有没有查完，句子没说。写审稿回复时，这正是“已核实”和“当时在核”的区别。', '<i>checked</i> says the check was done; <i>were checking</i> says it was under way then, and leaves open whether it finished. In a response to reviewers, that is the difference between “verified” and “being verified at the time”.')],
      note: T('进行体 = be + -ing；看的是事情进行到一半的那一刻。', 'Progressive = be + -ing; it looks at an event midway.'),
    },
  },
  {
    id: '1-8',
    title: T('三个位置', 'Three places'),
    brief: T('让句子说出语义图的意思。能过关的说法不止一种，用的词越少越好。', 'Make the sentence say what the meaning graph says. More than one way passes; the fewer words, the better.'),
    intro: [
      { t: T('有的动词带两个宾语：给谁（<b>接收方</b>），给什么（<b>客体</b>）。<i>grant</i> 就是这样的动词。', 'Some verbs take two objects: to whom (the <b>recipient</b>) and what (the <b>theme</b>). <i>grant</i> is one of them.') },
      { t: T('同一个动词可以有不止一种<b>框架</b>：<i>V NP NP</i> 是两个名词短语紧挨着，<i>V NP to NP</i> 是接收方放在 <i>to</i> 后面。选哪个，动词后面就开出哪几个位置。', 'One verb can have more than one <b>frame</b>: <i>V NP NP</i> puts two noun phrases side by side; <i>V NP to NP</i> puts the recipient after <i>to</i>. Whichever you pick decides the places that follow the verb.') },
    ],
    hint: [
      T('两种框架都能说出这个意思。数一数各要几个词。', 'Both frames can say this meaning. Count the words each takes.'),
      T('在 V NP NP 里，接收方在前。', 'In V NP NP the recipient comes first.'),
    ],
    meaning: { pred: 'grant', tense: 'future', aspect: 'simple', gloss: LATER, roles: { AGENT: role('committee', 'sg', T('程序委员会', 'programme committee')), RECIPIENT: role('author', 'pl', T('作者', 'authors')), THEME: role('extension', 'sg', T('延期', 'extension'), T('一次', 'one')) } },
    target: 8,
    palette: { np: ['extensions', 'authors', 'committee', 'author', 'extension'], verb: ['submit', 'grant-to', 'grant'], infl: ['ed', 's', 'will'] },
    answer: { SUBJ: 'committee', INFL: 'will', V: 'grant', IOBJ: 'authors', OBJ: 'extension' },
    traps: [
      { answer: { SUBJ: 'committee', INFL: 'will', V: 'grant-to', OBJ: 'extension', TO: 'authors' }, fails: 'star' },
      { answer: { SUBJ: 'committee', INFL: 'will', V: 'grant', IOBJ: 'extension', OBJ: 'authors' }, fails: 'role' },
    ],
    debrief: {
      title: T('The committee will grant the authors an extension.', 'The committee will grant the authors an extension.'),
      body: [T('<i>grant the authors an extension</i> 和 <i>grant an extension to the authors</i> 意思一样，前者省一个词。但它们不总能互换：接收方是长短语、或者要强调时，<i>to</i> 的说法更顺。后面的章节会回到这件事。', '<i>grant the authors an extension</i> and <i>grant an extension to the authors</i> mean the same, and the first saves a word. They do not always swap freely, though: with a long recipient, or one you want to stress, the <i>to</i> version reads better. Later chapters come back to this.')],
      note: T('双宾语动词有两种框架：V NP NP（接收方在前）和 V NP to NP。', 'Two-object verbs have two frames: V NP NP (recipient first) and V NP to NP.'),
    },
  },
  {
    id: '1-9',
    title: T('过去的过去', 'Before then'),
    brief: T('让句子说出语义图的意思。', 'Make the sentence say what the meaning graph says.'),
    hint: [
      T('时间是过去，体是完成。', 'The tense is past, and the aspect is perfect.'),
      T('完成体的助动词也有过去时。', 'The perfect’s auxiliary has a past tense too.'),
    ],
    meaning: { pred: 'withdraw', tense: 'past', aspect: 'perfect', gloss: BEFORE_THEN, roles: { AGENT: role('author', 'pl', T('作者', 'authors')), THEME: role('paper', 'sg', T('论文', 'paper')) } },
    palette: { np: ['papers', 'author', 'paper', 'authors'], verb: ['accept', 'withdraw', 'submit'], infl: ['ed', 'has', 'were', 'had', 'have'] },
    answer: { SUBJ: 'authors', INFL: 'had', V: 'withdraw', OBJ: 'paper' },
    traps: [
      { answer: { SUBJ: 'authors', INFL: 'ed', V: 'withdraw', OBJ: 'paper' }, fails: 'time' },
      { answer: { SUBJ: 'authors', INFL: 'have', V: 'withdraw', OBJ: 'paper' }, fails: 'time' },
      { answer: { SUBJ: 'authors', INFL: 'has', V: 'withdraw', OBJ: 'paper' }, fails: 'grammar' },
    ],
    debrief: {
      title: T('The authors had withdrawn the paper.', 'The authors had withdrawn the paper.'),
      body: [T('过去完成时要有一个“过去的那时”作参照：<i>By the time the reviews arrived, the authors had withdrawn the paper.</i> 单独一句时，参照藏在上下文里；等有了从句（第二章），就能把它说出来。', 'The past perfect needs a “then” in the past to look back from: <i>By the time the reviews arrived, the authors had withdrawn the paper.</i> On its own, that reference point lives in the context; once there are subordinate clauses (era 2), you can say it outright.'), T('<i>withdraw</i> 是不规则动词：过去式 <i>withdrew</i>，过去分词 <i>withdrawn</i>。', '<i>withdraw</i> is irregular: past <i>withdrew</i>, past participle <i>withdrawn</i>.')],
      note: T('过去完成 = had + 过去分词：站在过去某一刻往回看。', 'Past perfect = had + past participle: looking back from a moment in the past.'),
    },
  },
  {
    id: '1-10',
    title: T('代码给谁', 'Code for whom'),
    brief: T('以作者的口吻说出语义图的意思：审稿人前文已提过。用的词越少越好。', 'Say what the meaning graph says in the authors’ voice; the reviewers were mentioned earlier. The fewer words, the better.'),
    hint: [T('三件事要同时对：代词的格、完成体的一致、接收方的位置。', 'Three things have to be right at once: the pronouns’ case, the perfect’s agreement and where the recipient goes.')],
    meaning: {
      pred: 'send', tense: 'present', aspect: 'perfect', gloss: UP_TO_NOW,
      roles: { AGENT: WE, RECIPIENT: role('reviewer', 'pl', T('审稿人', 'reviewers'), T('前文已提及', 'mentioned earlier')), THEME: role('code', 'sg', T('代码', 'code')) },
    },
    refer: { we: 'author', us: 'author', they: 'reviewer', them: 'reviewer' },
    target: 6,
    palette: { np: ['us', 'code', 'they', 'we', 'them'], verb: ['send-to', 'send'], infl: ['has', 'have', 'ed'] },
    answer: { SUBJ: 'we', INFL: 'have', V: 'send', IOBJ: 'them', OBJ: 'code' },
    traps: [
      { answer: { SUBJ: 'we', INFL: 'has', V: 'send', IOBJ: 'them', OBJ: 'code' }, fails: 'grammar' },
      { answer: { SUBJ: 'we', INFL: 'have', V: 'send', IOBJ: 'they', OBJ: 'code' }, fails: 'grammar' },
      { answer: { SUBJ: 'we', INFL: 'have', V: 'send-to', OBJ: 'code', TO: 'them' }, fails: 'star' },
    ],
    debrief: {
      title: T('We have sent them the code.', 'We have sent them the code.'),
      body: [T('答复审稿意见时常见的一句。主语 <i>we</i> 是复数，所以是 <i>have</i>；<i>them</i> 在动词后面，所以是宾格。', 'A common line in a response to reviewers. The subject <i>we</i> is plural, so it takes <i>have</i>; <i>them</i> comes after the verb, so it is accusative.')],
      note: T('一句话里，一致、格和框架各管各的，但必须同时成立。', 'In one sentence, agreement, case and frame each do their own job, and all must hold at once.'),
    },
  },
  // Topic · 投稿 (submitting a paper): one round of review, growing to the final version.
  {
    id: '1-S1',
    title: T('读过了吗', 'Read?'),
    brief: T('投稿之后的第一句：审稿人已经读过论文。让句子说出语义图的意思。', 'After submission, the first line: the reviewers have read the paper. Make the sentence say what the meaning graph says.'),
    intro: [
      { t: T('这一组关卡是一轮审稿：审稿人读过论文，作者递交答辩意见，最后发出终稿。每一句都会比上一句多用一样东西。', 'This series is one round of review: the reviewers read the paper, the authors send a rebuttal, and the final version goes out. Each sentence uses one thing more than the one before.') },
    ],
    hint: [T('“已经读过、现在读完了”是哪种体？', 'Which aspect says “has read, and is done reading now”?')],
    meaning: { pred: 'read', tense: 'present', aspect: 'perfect', gloss: UP_TO_NOW, roles: { AGENT: role('reviewer', 'pl', T('审稿人', 'reviewers')), THEME: role('paper', 'sg', T('论文', 'paper')) } },
    palette: { np: ['papers', 'reviewer', 'reviewers', 'paper'], verb: ['submit', 'read'], infl: ['ed', 'have', 'has'] },
    answer: { SUBJ: 'reviewers', INFL: 'have', V: 'read', OBJ: 'paper' },
    traps: [{ answer: { SUBJ: 'reviewers', INFL: 'has', V: 'read', OBJ: 'paper' }, fails: 'grammar' }, { answer: { SUBJ: 'reviewers', INFL: 'ed', V: 'read', OBJ: 'paper' }, fails: 'time' }],
    debrief: {
      title: T('The reviewers have read the paper.', 'The reviewers have read the paper.'),
      body: [T('<i>read</i> 的过去式和过去分词都写作 <i>read</i>（读作 /red/）：只看字面，分不出它是一般过去还是完成，要靠前面的 <i>have</i>。', 'The past and the past participle of <i>read</i> are both spelled <i>read</i> (said /red/): the word alone cannot tell simple past from perfect; the <i>have</i> in front does.')],
      note: T('完成体常用来摆出“现在已经成立”的事实。', 'The perfect is the usual way to set out a fact that holds now.'),
    },
  },
  {
    id: '1-S2',
    title: T('答辩', 'Rebuttal'),
    brief: T('以作者的口吻说出语义图的意思。用的词越少越好。', 'Say what the meaning graph says in the authors’ voice. The fewer words, the better.'),
    hint: [T('主语是“我们”，接收方放在哪最省词？', 'The subject is “we”. Where does the recipient go to save words?')],
    meaning: { pred: 'send', tense: 'past', aspect: 'simple', gloss: PAST, roles: { AGENT: WE, RECIPIENT: role('editor', 'sg', T('编辑', 'editor')), THEME: role('rebuttal', 'sg', T('答辩意见', 'rebuttal'), T('一份', 'one')) } },
    refer: { we: 'author', us: 'author' },
    target: 6,
    palette: { np: ['rebuttals', 'us', 'editor', 'we', 'rebuttal'], verb: ['send-to', 'send'], infl: ['will', 'ed', 's'] },
    answer: { SUBJ: 'we', INFL: 'ed', V: 'send', IOBJ: 'editor', OBJ: 'rebuttal' },
    traps: [
      { answer: { SUBJ: 'us', INFL: 'ed', V: 'send', IOBJ: 'editor', OBJ: 'rebuttal' }, fails: 'grammar' },
      { answer: { SUBJ: 'we', INFL: 'ed', V: 'send-to', OBJ: 'rebuttal', TO: 'editor' }, fails: 'star' },
    ],
    debrief: {
      title: T('We sent the editor a rebuttal.', 'We sent the editor a rebuttal.'),
      body: [T('<i>a rebuttal</i> 用不定冠词：编辑之前没见过这一份。下一关的终稿则是双方都知道的那一份，所以是 <i>the final version</i>。', '<i>a rebuttal</i> takes the indefinite article: the editor has not seen this one before. The final version in the next level is the one both sides know, so it is <i>the final version</i>.')],
      note: T('第一次提到的东西用 a，双方都知道的用 the。', 'Something new to the reader takes a; something both sides know takes the.'),
    },
  },
  {
    id: '1-S3',
    title: T('终稿', 'Final version'),
    brief: T('以作者的口吻说出语义图的意思：审稿人前文已提过。用的词越少越好。', 'Say what the meaning graph says in the authors’ voice; the reviewers were mentioned earlier. The fewer words, the better.'),
    hint: [T('接收方用代词，它在动词后面。', 'The recipient is a pronoun, and it comes after the verb.')],
    meaning: {
      pred: 'send', tense: 'future', aspect: 'simple', gloss: LATER,
      roles: { AGENT: WE, RECIPIENT: role('reviewer', 'pl', T('审稿人', 'reviewers'), T('前文已提及', 'mentioned earlier')), THEME: role('version', 'sg', T('终稿', 'final version')) },
    },
    refer: { we: 'author', us: 'author', they: 'reviewer', them: 'reviewer' },
    target: 7,
    palette: { np: ['they', 'versions', 'us', 'we', 'them', 'version'], verb: ['send-to', 'send'], infl: ['ed', 's', 'will'] },
    answer: { SUBJ: 'we', INFL: 'will', V: 'send', IOBJ: 'them', OBJ: 'version' },
    traps: [
      { answer: { SUBJ: 'we', INFL: 'will', V: 'send', IOBJ: 'they', OBJ: 'version' }, fails: 'grammar' },
      { answer: { SUBJ: 'we', INFL: 'will', V: 'send-to', OBJ: 'version', TO: 'them' }, fails: 'star' },
      { answer: { SUBJ: 'we', INFL: 'ed', V: 'send', IOBJ: 'them', OBJ: 'version' }, fails: 'time' },
    ],
    debrief: {
      title: T('We will send them the final version.', 'We will send them the final version.'),
      body: [T('三句合起来就是一轮审稿往来的骨架。它们还是三句各自独立的话；第二章的从句会把它们连起来：<i>Since the reviewers have read the paper, …</i>', 'Together the three sentences are the skeleton of a round of review. They are still three separate sentences; the subordinate clauses of era 2 will join them up: <i>Since the reviewers have read the paper, …</i>')],
      note: T('将来时 will 不和主语一致：任何主语都一样。', 'Future will does not agree with its subject: it is the same for every subject.'),
    },
  },
]
