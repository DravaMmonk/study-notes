// Era 1 · 小句 (the clause): one subject, one verb, its objects, one head that sets the time and agrees. Only level
// specs: the meaning to say, the words on offer, the reference answer and the traps the level must turn down. How a
// board is read, wired and checked is the syntax domain's (games/kit/domains/syntax).

const T = (zh, en) => ({ zh, en })
const role = (ent, number, label, note) => ({ ent, number, label, ...(note ? { note } : {}) })

const PAST = T('过去某个时候发生，已经结束', 'happened at some point in the past, and is over')
const AS_A_RULE = T('一贯如此：现在的习惯或常态', 'as a rule: a habit or a standing fact now')
const UP_TO_NOW = T('已经发生，结果延续到现在', 'has happened, and its result holds now')
const IN_PROGRESS_THEN = T('过去某一刻正在进行', 'was in progress at a moment in the past')
const BEFORE_THEN = T('在过去另一时刻之前已经完成', 'was done before another moment in the past')
const LATER = T('将来会发生', 'will happen')

export const levels = [
  {
    id: '1-1',
    title: T('主语', 'Subject'),
    brief: T('让板子说出这张语义图的意思：谁、发生了什么、什么时候。', 'Make the board say what the meaning graph above says: who, what happened, and when.'),
    intro: [
      { t: T('在这里，句子是一台机器。<b>词</b>是元件，<b>句子</b>是最后的输出卡片。短语顺着连线往上汇，汇到句子卡片上，就念出一整句话。', 'Here a sentence is a machine. <b>Words</b> are its parts and the <b>sentence</b> is the output card at the end. Phrases flow up along the wires; when they reach the sentence card, it reads out a whole sentence.') },
      { t: T('每一关的目标是一张<b>语义图</b>：中间是发生的事，连出去的是参与的人和物，下面写着时间。语义图只说意思，不说用哪个词、怎么接。', 'Each level’s goal is a <b>meaning graph</b>: what happens in the middle, the people and things taking part around it, and the time below. A meaning graph only gives the meaning, never which words to use or how to wire them.') },
      { t: T('<b>主语</b>是句子说的那个人或物。它是一个<b>名词短语</b>，比如 <i>the proposal</i>。', 'The <b>subject</b> is who or what the sentence is about. It is a <b>noun phrase</b>, such as <i>the proposal</i>.') },
    ],
    hint: [
      T('先读语义图：参与者是哪个、单数还是复数。', 'Read the meaning graph first: which participant it is, and whether it is singular or plural.'),
      T('板子上有一个口还空着，它只收名词短语。', 'One port on the board is still empty, and it only takes a noun phrase.'),
    ],
    meaning: { pred: 'fail', tense: 'past', aspect: 'simple', gloss: PAST, roles: { THEME: role('proposal', 'sg', T('提案', 'proposal')) } },
    palette: { np: ['proposals', 'proposal'] },
    preset: { infl: 'ed', verb: 'fail' },
    answer: { infl: 'ed', subj: 'proposal', verb: 'fail' },
    traps: [{ answer: { infl: 'ed', subj: 'proposals', verb: 'fail' }, fails: 'role' }],
    debrief: {
      title: T('The proposal failed.', 'The proposal failed.'),
      body: [T('名词短语接进主语口，句子卡片就念出了整句。<i>the proposals</i> 也能接上，但语义图要的是一个提案：接得上，不等于意思对。', 'The noun phrase went into the subject port and the sentence card read out the whole sentence. <i>the proposals</i> would have wired in too, but the graph wants one proposal: a wire that fits is not yet the right meaning.')],
      note: T('能接上靠语法，说得对靠意思；两样都要。', 'Wiring is grammar; saying the right thing is meaning. You need both.'),
    },
  },
  {
    id: '1-2',
    title: T('谓语', 'Predicate'),
    brief: T('让板子说出语义图的意思。这一次，动词也要你来选。', 'Make the board say what the meaning graph says. This time the verb is yours to choose too.'),
    intro: [
      { t: T('<b>动词</b>说发生了什么。它连同后面跟着的东西，组成<b>动词短语</b>，接进小句的<b>谓语</b>口。', 'A <b>verb</b> says what happens. Together with whatever follows it, it makes a <b>verb phrase</b>, which goes into the clause’s <b>predicate</b> port.') },
      { t: T('这一关的动词都是<b>不及物</b>的：只要一个主语，后面什么也不跟，所以卡片上没有输入口。', 'The verbs in this level are all <b>intransitive</b>: they need only a subject and take nothing after them, so their cards have no input ports.') },
    ],
    hint: [T('语义图中间那个词，就是要说的事。', 'The word in the middle of the meaning graph is what has to be said.')],
    meaning: { pred: 'resign', tense: 'past', aspect: 'simple', gloss: PAST, roles: { AGENT: role('chair', 'sg', T('主席', 'chair')) } },
    palette: { np: ['proposal', 'chairs', 'chair'], verb: ['fail', 'resign'] },
    preset: { infl: 'ed' },
    answer: { infl: 'ed', subj: 'chair', verb: 'resign' },
    traps: [{ answer: { infl: 'ed', subj: 'chair', verb: 'fail' }, fails: 'pred' }, { answer: { infl: 'ed', subj: 'proposal', verb: 'resign' }, fails: 'role' }],
    debrief: {
      title: T('The chair resigned.', 'The chair resigned.'),
      body: [T('小句有两个口：主语收名词短语，谓语收动词短语。<i>-ed</i> 卡片把 <i>resign</i> 变成了 <i>resigned</i>：动词用什么形式，由小句的头来定。', 'A clause has two ports: the subject takes a noun phrase, the predicate a verb phrase. The <i>-ed</i> card turned <i>resign</i> into <i>resigned</i>: the form a verb takes is decided by the head of the clause.')],
      note: T('小句 = 主语 + 谓语；动词的形式由小句的头决定。', 'A clause = subject + predicate; the head of the clause decides the verb’s form.'),
    },
  },
  {
    id: '1-3',
    title: T('时与一致', 'Tense and agreement'),
    brief: T('让板子说出语义图的意思。这一次，小句的头也要你来选。', 'Make the board say what the meaning graph says. This time the head of the clause is yours to choose too.'),
    intro: [
      { t: T('小句的<b>头</b>（INFL）定下时间：<i>-s</i> 和 <i>∅</i> 是现在，<i>-ed</i> 是过去，<i>will</i> 是将来。它决定动词念成什么形式。', 'The <b>head</b> of a clause (INFL) sets the time: <i>-s</i> and <i>∅</i> are present, <i>-ed</i> is past, <i>will</i> is future. It decides what form the verb is said in.') },
      { t: T('头还带着<b>一致</b>的要求：有的头只接某几种主语。卡片底下写着它要什么样的主语，接错了，线会接不上，并说明原因。', 'A head also carries an <b>agreement</b> requirement: some heads take only certain subjects. The line under each card says what subject it needs; a wrong one will not wire in, and you are told why.') },
    ],
    hint: [
      T('语义图下面写着时间。', 'The time is written under the meaning graph.'),
      T('现在时有两个头，它们要的主语不一样。', 'There are two present-tense heads, and they need different subjects.'),
    ],
    meaning: { pred: 'meet', tense: 'present', aspect: 'simple', gloss: AS_A_RULE, roles: { AGENT: role('committee', 'pl', T('委员会', 'committee'), T('不止一个', 'more than one')) } },
    palette: { np: ['committee', 'committees'], verb: ['resign', 'meet'], infl: ['ed', 's', 'will', 'zero'] },
    answer: { infl: 'zero', subj: 'committees', verb: 'meet' },
    traps: [
      { answer: { infl: 's', subj: 'committees', verb: 'meet' }, fails: 'wire' },
      { answer: { infl: 's', subj: 'committee', verb: 'meet' }, fails: 'role' },
      { answer: { infl: 'ed', subj: 'committees', verb: 'meet' }, fails: 'time' },
    ],
    debrief: {
      title: T('The committees meet.', 'The committees meet.'),
      body: [T('英语的现在时要和主语<b>一致</b>：第三人称单数用 <i>-s</i>（<i>the committee meets</i>），其余用不加词尾的形式。这条规则不是贴在动词上的，而是小句的头和主语之间的约定。', 'The English present has to <b>agree</b> with its subject: third-person singular takes <i>-s</i> (<i>the committee meets</i>), everything else the bare form. The rule is not stuck on the verb; it is an agreement between the head of the clause and its subject.')],
      note: T('一致：小句的头和主语，在人称和数上要对得上。', 'Agreement: the head of the clause and its subject must match in person and number.'),
    },
  },
  {
    id: '1-4',
    title: T('宾语', 'Object'),
    brief: T('让板子说出语义图的意思。', 'Make the board say what the meaning graph says.'),
    intro: [
      { t: T('<b>及物动词</b>后面要跟一个<b>宾语</b>：动作落到的那个人或物。所以它的卡片上有一个宾语口。', 'A <b>transitive verb</b> needs an <b>object</b> after it: who or what the action lands on. So its card has an object port.') },
      { t: T('动词的<b>框架</b>说它开几个口、每个口是哪个角色。卡片底下的 <i>V NP</i> 就是框架：动词后面跟一个名词短语。', 'A verb’s <b>frame</b> says how many ports it opens and which role each fills. The <i>V NP</i> under a card is its frame: the verb followed by one noun phrase.') },
    ],
    hint: [T('语义图里有两个参与者，各自是什么角色？', 'The meaning graph has two participants. What role does each play?')],
    meaning: { pred: 'approve', tense: 'past', aspect: 'simple', gloss: PAST, roles: { AGENT: role('committee', 'sg', T('委员会', 'committee')), THEME: role('budget', 'sg', T('预算', 'budget')) } },
    palette: { np: ['budgets', 'committee', 'budget'], verb: ['resign', 'approve'], infl: ['s', 'ed', 'will'] },
    answer: { infl: 'ed', subj: 'committee', verb: 'approve', OBJ: 'budget' },
    traps: [
      { answer: { infl: 'ed', subj: 'budget', verb: 'approve', OBJ: 'committee' }, fails: 'role' },
      { answer: { infl: 'ed', subj: 'committee', verb: 'resign' }, fails: 'pred' },
    ],
    debrief: {
      title: T('The committee approved the budget.', 'The committee approved the budget.'),
      body: [T('同样两个名词短语，接进主语口还是宾语口，意思就完全不同：英语靠<b>位置</b>分出谁做、做给谁。', 'The same two noun phrases mean quite different things depending on whether they go into the subject port or the object port: English tells the doer from the done-to by <b>position</b>.')],
      note: T('及物动词开一个宾语口；谁是施事、谁是客体，由接进哪个口决定。', 'A transitive verb opens an object port; which port a phrase goes into decides whether it is the agent or the theme.'),
    },
  },
  {
    id: '1-5',
    title: T('完成体', 'Perfect'),
    brief: T('让板子说出语义图的意思。注意语义图下面的时间。', 'Make the board say what the meaning graph says. Mind the time under the graph.'),
    intro: [
      { t: T('时间不止过去、现在、将来。<b>体</b>说的是事情从哪个角度看：<b>完成体</b>说一件事已经做完，而且它的结果还在。', 'Time is more than past, present and future. <b>Aspect</b> is the angle an event is seen from: the <b>perfect</b> says an event is done and its result still stands.') },
      { t: T('完成体的头带着一个助动词，并要求动词用<b>过去分词</b>（<i>-en</i> 形式，如 <i>approved</i>、<i>taken</i>）。', 'A perfect head brings an auxiliary and asks for the verb’s <b>past participle</b> (its <i>-en</i> form, as in <i>approved</i>, <i>taken</i>).') },
    ],
    hint: [
      T('“结果延续到现在”和“过去某个时候、已经结束”不是一回事。', '“Its result holds now” is not the same as “at some point in the past, and over”.'),
      T('committee 是一个整体。', 'A committee is one body.'),
    ],
    meaning: { pred: 'approve', tense: 'present', aspect: 'perfect', gloss: UP_TO_NOW, roles: { AGENT: role('committee', 'sg', T('委员会', 'committee'), T('一个整体', 'one body')), THEME: role('budget', 'sg', T('预算', 'budget')) } },
    palette: { np: ['budget', 'committees', 'committee'], verb: ['reject', 'approve'], infl: ['have', 'ed', 'has'] },
    answer: { infl: 'has', subj: 'committee', verb: 'approve', OBJ: 'budget' },
    traps: [
      { answer: { infl: 'have', subj: 'committee', verb: 'approve', OBJ: 'budget' }, fails: 'wire' },
      { answer: { infl: 'ed', subj: 'committee', verb: 'approve', OBJ: 'budget' }, fails: 'time' },
      { answer: { infl: 'have', subj: 'committees', verb: 'approve', OBJ: 'budget' }, fails: 'role' },
    ],
    debrief: {
      title: T('The committee has approved the budget.', 'The committee has approved the budget.'),
      body: [T('<i>approved</i> 和 <i>has approved</i> 都发生在过去，区别在于说话人站在哪：一般过去时只讲那时，现在完成时讲的是“现在，预算已经批了”。', 'Both <i>approved</i> and <i>has approved</i> happened in the past; what differs is where the speaker stands. The simple past talks about then; the present perfect says “now, the budget is approved”.'), T('委员会在这里按一个整体算，所以用 <i>has</i>。英式英语有时把它当复数，这个游戏按美式英语判。', 'The committee counts as one body here, so it takes <i>has</i>. British English sometimes treats it as plural; this game goes by American usage.')],
      note: T('完成体 = 助动词 have + 过去分词；看的是结果还在不在。', 'Perfect = auxiliary have + past participle; it looks at whether the result still stands.'),
    },
  },
  {
    id: '1-6',
    title: T('格', 'Case'),
    brief: T('让板子说出语义图的意思。两个参与者前文都已经提过，用代词说。', 'Make the board say what the meaning graph says. Both participants have been mentioned already, so say them with pronouns.'),
    intro: [
      { t: T('名词短语换成<b>代词</b>，就多了一样东西：<b>格</b>。<i>she</i>、<i>they</i> 是主格，只能当主语；<i>her</i>、<i>them</i> 是宾格，只能当宾语。', 'Swap a noun phrase for a <b>pronoun</b> and one more thing appears: <b>case</b>. <i>she</i> and <i>they</i> are nominative and can only be subjects; <i>her</i> and <i>them</i> are accusative and can only be objects.') },
      { t: T('名词短语没有格的区别，接哪都行；代词接错了口，线会接不上。', 'Noun phrases show no case and go anywhere; a pronoun in the wrong port will not wire in.') },
    ],
    hint: [T('先定每个代词指谁、单数还是复数，再看它能接哪个口。', 'First settle whom each pronoun names and whether it is singular or plural, then which port it can take.')],
    meaning: {
      pred: 'review', tense: 'past', aspect: 'simple', gloss: PAST,
      roles: { AGENT: role('reviewer', 'sg', T('审稿人', 'reviewer'), T('前文已提及，女性', 'mentioned earlier; a woman')), THEME: role('manuscript', 'pl', T('稿件', 'manuscripts'), T('前文已提及', 'mentioned earlier')) },
    },
    refer: { she: 'reviewer', her: 'reviewer', they: 'manuscript', them: 'manuscript', it: 'manuscript' },
    palette: { np: ['her', 'they', 'it', 'she', 'them'], verb: ['submit', 'review'], infl: ['s', 'ed', 'will'] },
    answer: { infl: 'ed', subj: 'she', verb: 'review', OBJ: 'them' },
    traps: [
      { answer: { infl: 'ed', subj: 'her', verb: 'review', OBJ: 'them' }, fails: 'wire' },
      { answer: { infl: 'ed', subj: 'she', verb: 'review', OBJ: 'they' }, fails: 'wire' },
      { answer: { infl: 'ed', subj: 'she', verb: 'review', OBJ: 'it' }, fails: 'role' },
    ],
    debrief: {
      title: T('She reviewed them.', 'She reviewed them.'),
      body: [T('名词在英语里早就丢了格的词尾，只有代词还留着：<i>she / her</i>、<i>they / them</i>。所以代词放错位置，母语者一听就觉得别扭。', 'English nouns lost their case endings long ago; only pronouns keep them: <i>she / her</i>, <i>they / them</i>. That is why a pronoun in the wrong place jars on a native ear at once.')],
      note: T('代词有格：主格当主语，宾格当宾语。', 'Pronouns have case: nominative for subjects, accusative for objects.'),
    },
  },
  {
    id: '1-7',
    title: T('进行体', 'Progressive'),
    brief: T('让板子说出语义图的意思。', 'Make the board say what the meaning graph says.'),
    intro: [
      { t: T('<b>进行体</b>把一件事放在它进行到一半的那一刻来看。它的头带着 <i>be</i> 的某个形式，并要求动词用 <i>-ing</i> 形式。', 'The <b>progressive</b> looks at an event in the middle of happening. Its head brings a form of <i>be</i> and asks for the verb’s <i>-ing</i> form.') },
      { t: T('<i>be</i> 的形式最多：<i>am / is / are</i>，<i>was / were</i>。每个都有自己的一致要求。', '<i>be</i> has the most forms of all: <i>am / is / are</i>, <i>was / were</i>. Each has its own agreement requirement.') },
    ],
    hint: [T('这件事发生在过去，而且当时正在进行。', 'This happened in the past, and was going on at the time.')],
    meaning: { pred: 'review', tense: 'past', aspect: 'progressive', gloss: IN_PROGRESS_THEN, roles: { AGENT: role('auditor', 'pl', T('审计师', 'auditors'), T('不止一个', 'more than one')), THEME: role('claim', 'pl', T('索赔申请', 'claims'), T('不止一份', 'more than one')) } },
    palette: { np: ['claims', 'auditor', 'claim', 'auditors'], verb: ['reject', 'review'], infl: ['ed', 'is', 'was', 'are', 'were'] },
    answer: { infl: 'were', subj: 'auditors', verb: 'review', OBJ: 'claims' },
    traps: [
      { answer: { infl: 'was', subj: 'auditors', verb: 'review', OBJ: 'claims' }, fails: 'wire' },
      { answer: { infl: 'are', subj: 'auditors', verb: 'review', OBJ: 'claims' }, fails: 'time' },
      { answer: { infl: 'ed', subj: 'auditors', verb: 'review', OBJ: 'claims' }, fails: 'time' },
    ],
    debrief: {
      title: T('The auditors were reviewing the claims.', 'The auditors were reviewing the claims.'),
      body: [T('<i>reviewed</i> 说事情做了，<i>were reviewing</i> 说那时正在做，至于做没做完，句子没说。写报告时，这正是“已完成”和“当时在处理”的区别。', '<i>reviewed</i> says the work was done; <i>were reviewing</i> says it was under way then, and leaves open whether it was finished. In a report, that is the difference between “completed” and “in hand at the time”.')],
      note: T('进行体 = be + -ing；看的是事情进行到一半的那一刻。', 'Progressive = be + -ing; it looks at an event midway.'),
    },
  },
  {
    id: '1-8',
    title: T('三个口', 'Three ports'),
    brief: T('让板子说出语义图的意思。能过关的接法不止一种，用的词越少越好。', 'Make the board say what the meaning graph says. More than one wiring passes; the fewer words, the better.'),
    intro: [
      { t: T('有的动词带两个宾语：给谁（<b>接收方</b>），给什么（<b>客体</b>）。<i>send</i> 就是这样的动词。', 'Some verbs take two objects: to whom (the <b>recipient</b>) and what (the <b>theme</b>). <i>send</i> is one of them.') },
      { t: T('同一个动词可以有不止一种<b>框架</b>。卡片底下写着它的框架：<i>V NP NP</i> 是两个名词短语紧挨着，<i>V NP to NP</i> 是接收方放在 <i>to</i> 后面。', 'One verb can have more than one <b>frame</b>. The line under a card gives it: <i>V NP NP</i> is two noun phrases side by side; <i>V NP to NP</i> puts the recipient after <i>to</i>.') },
    ],
    hint: [
      T('两种框架都能说出这个意思。数一数各要几个词。', 'Both frames can say this meaning. Count the words each takes.'),
      T('在 V NP NP 里，接收方在前。', 'In V NP NP the recipient comes first.'),
    ],
    meaning: { pred: 'send', tense: 'future', aspect: 'simple', gloss: LATER, roles: { AGENT: role('firm', 'sg', T('公司', 'firm')), RECIPIENT: role('client', 'sg', T('客户', 'client')), THEME: role('invoice', 'sg', T('发票', 'invoice')) } },
    target: 8,
    palette: { np: ['invoices', 'client', 'firm', 'clients', 'invoice'], verb: ['submit', 'send-to', 'send'], infl: ['ed', 's', 'will'] },
    answer: { infl: 'will', subj: 'firm', verb: 'send', IOBJ: 'client', OBJ: 'invoice' },
    traps: [
      { answer: { infl: 'will', subj: 'firm', verb: 'send-to', OBJ: 'invoice', TO: 'client' }, fails: 'star' },
      { answer: { infl: 'will', subj: 'firm', verb: 'send', IOBJ: 'invoice', OBJ: 'client' }, fails: 'role' },
    ],
    debrief: {
      title: T('The firm will send the client the invoice.', 'The firm will send the client the invoice.'),
      body: [T('<i>send the client the invoice</i> 和 <i>send the invoice to the client</i> 意思一样，前者省一个词。但它们不总能互换：接收方是长短语、或者要强调时，<i>to</i> 的说法更顺。后面的章节会回到这件事。', '<i>send the client the invoice</i> and <i>send the invoice to the client</i> mean the same, and the first saves a word. They do not always swap freely, though: with a long recipient, or one you want to stress, the <i>to</i> version reads better. Later chapters come back to this.')],
      note: T('双宾语动词有两种框架：V NP NP（接收方在前）和 V NP to NP。', 'Two-object verbs have two frames: V NP NP (recipient first) and V NP to NP.'),
    },
  },
  {
    id: '1-9',
    title: T('过去的过去', 'Before then'),
    brief: T('让板子说出语义图的意思。', 'Make the board say what the meaning graph says.'),
    hint: [
      T('时间是过去，体是完成。', 'The tense is past, and the aspect is perfect.'),
      T('完成体的助动词也有过去时。', 'The perfect’s auxiliary has a past tense too.'),
    ],
    meaning: { pred: 'reject', tense: 'past', aspect: 'perfect', gloss: BEFORE_THEN, roles: { AGENT: role('auditor', 'pl', T('审计师', 'auditors'), T('不止一个', 'more than one')), THEME: role('claim', 'sg', T('索赔申请', 'claim')) } },
    palette: { np: ['claims', 'auditor', 'claim', 'auditors'], verb: ['approve', 'reject', 'review'], infl: ['ed', 'has', 'were', 'had', 'have'] },
    answer: { infl: 'had', subj: 'auditors', verb: 'reject', OBJ: 'claim' },
    traps: [
      { answer: { infl: 'ed', subj: 'auditors', verb: 'reject', OBJ: 'claim' }, fails: 'time' },
      { answer: { infl: 'have', subj: 'auditors', verb: 'reject', OBJ: 'claim' }, fails: 'time' },
      { answer: { infl: 'has', subj: 'auditors', verb: 'reject', OBJ: 'claim' }, fails: 'wire' },
    ],
    debrief: {
      title: T('The auditors had rejected the claim.', 'The auditors had rejected the claim.'),
      body: [T('过去完成时要有一个“过去的那时”作参照：<i>By the time the client called, the auditors had rejected the claim.</i> 单独一句时，那个参照藏在上下文里。等有了从句（第二章），就能把它说出来。', 'The past perfect needs a “then” in the past to look back from: <i>By the time the client called, the auditors had rejected the claim.</i> On its own, that reference point lives in the context; once there are subordinate clauses (era 2), you can say it outright.')],
      note: T('过去完成 = had + 过去分词：站在过去某一刻往回看。', 'Past perfect = had + past participle: looking back from a moment in the past.'),
    },
  },
  {
    id: '1-10',
    title: T('寄给谁', 'Sent to whom'),
    brief: T('以公司的名义说出语义图的意思：“我们”就是公司，“他们”就是客户。用的词越少越好。', 'Say what the meaning graph says on the firm’s behalf: “we” is the firm and “they” are the clients. The fewer words, the better.'),
    hint: [
      T('三件事要同时对：代词的格、完成体的一致、接收方的位置。', 'Three things have to be right at once: the pronouns’ case, the perfect’s agreement and where the recipient goes.'),
    ],
    meaning: {
      pred: 'send', tense: 'present', aspect: 'perfect', gloss: UP_TO_NOW,
      roles: { AGENT: role('firm', 'pl', T('我们（公司一方）', 'we (the firm)'), T('说话人', 'the speakers')), RECIPIENT: role('client', 'pl', T('客户', 'clients'), T('前文已提及', 'mentioned earlier')), THEME: role('invoice', 'pl', T('发票', 'invoices')) },
    },
    refer: { we: 'firm', us: 'firm', they: 'client', them: 'client' },
    target: 6,
    palette: { np: ['us', 'invoices', 'they', 'we', 'invoice', 'them'], verb: ['send-to', 'send'], infl: ['has', 'have', 'ed'] },
    answer: { infl: 'have', subj: 'we', verb: 'send', IOBJ: 'them', OBJ: 'invoices' },
    traps: [
      { answer: { infl: 'has', subj: 'we', verb: 'send', IOBJ: 'them', OBJ: 'invoices' }, fails: 'wire' },
      { answer: { infl: 'have', subj: 'we', verb: 'send', IOBJ: 'they', OBJ: 'invoices' }, fails: 'wire' },
      { answer: { infl: 'have', subj: 'we', verb: 'send-to', OBJ: 'invoices', TO: 'them' }, fails: 'star' },
    ],
    debrief: {
      title: T('We have sent them the invoices.', 'We have sent them the invoices.'),
      body: [T('商务邮件里最常见的一句。主语 <i>we</i> 是复数，所以是 <i>have</i>；<i>them</i> 在动词后面，所以是宾格。', 'One of the commonest lines in business email. The subject <i>we</i> is plural, so it takes <i>have</i>; <i>them</i> comes after the verb, so it is accusative.')],
      note: T('一句话里，一致、格和框架各管各的，但必须同时成立。', 'In one sentence, agreement, case and frame each do their own job, and all must hold at once.'),
    },
  },
  // Topic · 催款 (chasing a payment): one exchange with one client, growing to the final notice.
  {
    id: '1-S1',
    title: T('收到了吗', 'Received?'),
    brief: T('催款的第一步：确认对方已经收到发票。让板子说出语义图的意思。', 'Chasing a payment, step one: confirm the client has the invoice. Make the board say what the meaning graph says.'),
    intro: [
      { t: T('这一组关卡是一次催款：先确认对方收到了发票，再发提醒，最后发最后通知。每一句都会比上一句多用一样东西。', 'This series is one round of chasing a payment: confirm the client has the invoice, send a reminder, then a final notice. Each sentence uses one thing more than the one before.') },
    ],
    hint: [T('“已经收到、现在手里有”是哪种体？', 'Which aspect says “received, and has it now”?')],
    meaning: { pred: 'receive', tense: 'present', aspect: 'perfect', gloss: UP_TO_NOW, roles: { AGENT: role('client', 'sg', T('客户', 'client')), THEME: role('invoice', 'sg', T('发票', 'invoice')) } },
    palette: { np: ['invoices', 'clients', 'client', 'invoice'], verb: ['send', 'receive'], infl: ['ed', 'have', 'has'] },
    answer: { infl: 'has', subj: 'client', verb: 'receive', OBJ: 'invoice' },
    traps: [{ answer: { infl: 'have', subj: 'client', verb: 'receive', OBJ: 'invoice' }, fails: 'wire' }, { answer: { infl: 'ed', subj: 'client', verb: 'receive', OBJ: 'invoice' }, fails: 'time' }],
    debrief: {
      title: T('The client has received the invoice.', 'The client has received the invoice.'),
      body: [T('在催款邮件里，这一句是要对方确认的事实，所以用完成体：重点是现在发票在他手里。', 'In a payment chaser this is the fact you want confirmed, so it is perfect: the point is that the invoice is in their hands now.')],
      note: T('完成体常用来摆出“现在已经成立”的事实。', 'The perfect is the usual way to set out a fact that holds now.'),
    },
  },
  {
    id: '1-S2',
    title: T('发提醒', 'A reminder'),
    brief: T('以公司的名义说出语义图的意思（“我们”就是公司）。用的词越少越好。', 'Say what the meaning graph says on the firm’s behalf (“we” is the firm). The fewer words, the better.'),
    hint: [T('主语是“我们”，接收方放在哪最省词？', 'The subject is “we”. Where does the recipient go to save words?')],
    meaning: { pred: 'send', tense: 'past', aspect: 'simple', gloss: PAST, roles: { AGENT: role('firm', 'pl', T('我们（公司一方）', 'we (the firm)'), T('说话人', 'the speakers')), RECIPIENT: role('client', 'sg', T('客户', 'client')), THEME: role('reminder', 'sg', T('催款提醒', 'reminder')) } },
    refer: { we: 'firm', us: 'firm' },
    target: 6,
    palette: { np: ['reminders', 'us', 'client', 'we', 'reminder'], verb: ['send-to', 'send'], infl: ['will', 'ed', 's'] },
    answer: { infl: 'ed', subj: 'we', verb: 'send', IOBJ: 'client', OBJ: 'reminder' },
    traps: [
      { answer: { infl: 'ed', subj: 'us', verb: 'send', IOBJ: 'client', OBJ: 'reminder' }, fails: 'wire' },
      { answer: { infl: 'ed', subj: 'we', verb: 'send-to', OBJ: 'reminder', TO: 'client' }, fails: 'star' },
    ],
    debrief: {
      title: T('We sent the client a reminder.', 'We sent the client a reminder.'),
      body: [T('<i>a reminder</i> 是不定冠词：对方还不知道是哪一份。到了下一关，最后通知同样是新信息。', '<i>a reminder</i> takes the indefinite article: the client does not yet know which one. In the next level, the final notice is new information too.')],
      note: T('第一次提到的东西用 a，已经知道的用 the。', 'Something mentioned for the first time takes a; something already known takes the.'),
    },
  },
  {
    id: '1-S3',
    title: T('最后通知', 'Final notice'),
    brief: T('以公司的名义说出语义图的意思：“我们”是公司，“他们”是客户。用的词越少越好。', 'Say what the meaning graph says on the firm’s behalf: “we” is the firm, “they” are the clients. The fewer words, the better.'),
    hint: [T('接收方用代词，它在动词后面。', 'The recipient is a pronoun, and it comes after the verb.')],
    meaning: {
      pred: 'send', tense: 'future', aspect: 'simple', gloss: LATER,
      roles: { AGENT: role('firm', 'pl', T('我们（公司一方）', 'we (the firm)'), T('说话人', 'the speakers')), RECIPIENT: role('client', 'pl', T('客户', 'clients'), T('前文已提及', 'mentioned earlier')), THEME: role('notice', 'sg', T('最后通知', 'final notice')) },
    },
    refer: { we: 'firm', us: 'firm', they: 'client', them: 'client' },
    target: 7,
    palette: { np: ['they', 'notices', 'us', 'we', 'them', 'notice'], verb: ['send-to', 'send'], infl: ['ed', 's', 'will'] },
    answer: { infl: 'will', subj: 'we', verb: 'send', IOBJ: 'them', OBJ: 'notice' },
    traps: [
      { answer: { infl: 'will', subj: 'we', verb: 'send', IOBJ: 'they', OBJ: 'notice' }, fails: 'wire' },
      { answer: { infl: 'will', subj: 'we', verb: 'send-to', OBJ: 'notice', TO: 'them' }, fails: 'star' },
      { answer: { infl: 'ed', subj: 'we', verb: 'send', IOBJ: 'them', OBJ: 'notice' }, fails: 'time' },
    ],
    debrief: {
      title: T('We will send them a final notice.', 'We will send them a final notice.'),
      body: [T('三句合起来就是一封催款邮件的骨架。它们还是三句各自独立的话；第二章的从句会把它们连起来：<i>Since you have received the invoice, …</i>', 'Together the three sentences are the skeleton of a payment chaser. They are still three separate sentences; the subordinate clauses of era 2 will join them up: <i>Since you have received the invoice, …</i>')],
      note: T('将来时 will 不和主语一致：任何主语都一样。', 'Future will does not agree with its subject: it is the same for every subject.'),
    },
  },
]
