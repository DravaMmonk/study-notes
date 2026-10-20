// 句法之图's encyclopedia (the shell's 百科): how the game is played, then the grammar it teaches. An entry opens once
// the level `at` is reached (no `at`: from the start).

const T = (zh, en) => ({ zh, en })

export const groups = [
  { id: 'play', title: T('玩法', 'How to play') },
  { id: 'grammar', title: T('语法', 'Grammar') },
]

export const entries = [
  {
    id: 'meaning', group: 'play', title: T('语义图', 'Meaning graph'),
    body: [
      T('每一关的目标是一张语义图：中间是发生的事，连出去的是参与者和它们的<b>角色</b>，下面是时间。它只说意思，不说用哪个词。', 'Each level’s goal is a meaning graph: what happens in the middle, the participants and their <b>roles</b> around it, and the time below. It gives only the meaning, never the words.'),
      T('运行后，语义图上每一处都会标出对不对；不对的地方写着你的句子说成了什么。', 'After a run, every part of the graph is marked right or wrong; where it is wrong, it says what your sentence said instead.'),
    ],
    see: ['wiring', 'role'],
  },
  {
    id: 'wiring', group: 'play', title: T('接线与拒绝', 'Wiring and refusals'),
    body: [
      T('元件的输出口接到另一块的输入口上，短语就进了句子。每个输入口只收一种短语，接错了线会接不上，并且告诉你是哪条规则不允许。', 'Wire a part’s output into another part’s input and the phrase joins the sentence. Each input takes one kind of phrase; a wrong wire will not go in, and you are told which rule forbids it.'),
      T('一个短语在句子里只占一个位置：同一张卡片不能同时接到两个口上。', 'A phrase has one place in a sentence: the same card cannot feed two ports at once.'),
      T('能过关的接法常常不止一种。有的关给出词数目标，用更少的词拿到 ★。', 'There is often more than one passing wiring. Some levels set a word target: hit it to earn the ★.'),
    ],
    see: ['meaning', 'agreement'],
  },
  {
    id: 'clause', group: 'grammar', title: T('小句', 'Clause'), at: '1-2',
    body: [T('小句是最小的完整句子：一个主语（名词短语）加一个谓语（动词短语），由小句的头（INFL）把它们咬合在一起。', 'A clause is the smallest complete sentence: a subject (a noun phrase) plus a predicate (a verb phrase), locked together by the head of the clause (INFL).')],
    see: ['infl'],
  },
  {
    id: 'infl', group: 'grammar', title: T('小句的头（INFL）', 'Head of the clause (INFL)'), at: '1-3',
    body: [
      T('INFL 定下时和体，说出助动词，并决定动词用哪个形式：原形、-s、过去式、过去分词（-en）或 -ing。', 'INFL sets tense and aspect, says the auxiliaries and decides the verb’s form: bare, -s, past, past participle (-en) or -ing.'),
      T('“∅” 表示什么也不加：<i>they meet</i> 里的 <i>meet</i> 就是 ∅ 形式。', '“∅” means nothing is added: the <i>meet</i> in <i>they meet</i> is the ∅ form.'),
    ],
    see: ['agreement', 'aspect'],
  },
  {
    id: 'agreement', group: 'grammar', title: T('一致', 'Agreement'), at: '1-3',
    body: [
      T('小句的头和主语要在人称和数上对得上。英语只在少数地方标出一致：现在时的 -s、<i>has / have</i>、<i>am / is / are</i>、<i>was / were</i>。', 'The head of a clause and its subject must match in person and number. English marks agreement in only a few places: the present -s, <i>has / have</i>, <i>am / is / are</i>, <i>was / were</i>.'),
      T('-ed、<i>had</i> 和 <i>will</i> 不标一致，任何主语都行。', '-ed, <i>had</i> and <i>will</i> mark no agreement and take any subject.'),
    ],
  },
  {
    id: 'frame', group: 'grammar', title: T('动词框架', 'Verb frames'), at: '1-4',
    body: [
      T('动词的框架说它开几个口、每个口是什么角色：不及物 <i>V</i>，及物 <i>V NP</i>，双宾 <i>V NP NP</i>，以及介词版本 <i>V NP to NP</i>。', 'A verb’s frame says how many ports it opens and what role each fills: intransitive <i>V</i>, transitive <i>V NP</i>, two-object <i>V NP NP</i>, and the prepositional <i>V NP to NP</i>.'),
    ],
    see: ['role'],
  },
  {
    id: 'role', group: 'grammar', title: T('语义角色', 'Semantic roles'), at: '1-4',
    body: [T('<b>施事</b>是做事的一方，<b>客体</b>是事情落到的东西，<b>接收方</b>是东西给到的一方。英语主要靠位置分出角色：同样的词，换个口，意思就变了。', 'The <b>agent</b> does the thing, the <b>theme</b> is what it lands on, and the <b>recipient</b> is who gets something. English tells roles apart mostly by position: the same words in another port mean something else.')],
  },
  {
    id: 'aspect', group: 'grammar', title: T('时与体', 'Tense and aspect'), at: '1-5',
    body: [
      T('<b>时</b>说事情在什么时候：过去、现在、将来。<b>体</b>说从哪个角度看：一般（整件事）、完成（做完了，结果还在）、进行（正在做的那一刻）。', '<b>Tense</b> says when: past, present, future. <b>Aspect</b> says from what angle: simple (the whole event), perfect (done, with the result standing), progressive (at a moment while it is going on).'),
      T('完成体 = have + 过去分词；进行体 = be + -ing。两者的助动词都会随时和一致变化。', 'Perfect = have + past participle; progressive = be + -ing. Both auxiliaries change with tense and agreement.'),
    ],
  },
  {
    id: 'case', group: 'grammar', title: T('格', 'Case'), at: '1-6',
    body: [T('代词有主格（<i>I, we, she, they</i>）和宾格（<i>me, us, her, them</i>）。主格当主语，宾格当宾语，包括 <i>to</i> 后面。<i>it</i> 和 <i>you</i> 两格同形。', 'Pronouns have a nominative (<i>I, we, she, they</i>) and an accusative (<i>me, us, her, them</i>). Nominative for subjects, accusative for objects, including after <i>to</i>. <i>it</i> and <i>you</i> look the same in both.')],
  },
]
