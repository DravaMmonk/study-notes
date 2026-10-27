// The levels of 《软件工厂》 chapters 0–2 (games/factory/DESIGN.md 4). Chapter 0 is played by hand; chapters 1 and 2
// are boards (kit/domains/agent/build.js writes them). Only specs: the model, the repository and the machine are the
// agent domain's.
import { board } from '../kit/domains/agent/build.js'

const T = (zh, en) => ({ zh, en })

// The loop board every level of chapter 2 grows: the issue and the history into the model, its write to the
// repository, what the tools give back kept for the next turn.
const LOOP_IN = ['issue>k.a', 'history>k.b', 'k>m', 'm>repo']
// The full loop of chapter 2: read, list, test, kept; stop when the tests pass.
const FULL = board(
  { k: 'concat', m: 'model', r: 'read', l: 'list', t: 'test', keep: 'concat' },
  [...LOOP_IN, 'm>r.ask', 'm>l.ask', 'm>t.when', 'r>keep.a', 'l>keep.b', 't#out>keep.c', 'keep>out', 't#green>stop'],
)
// Stopping when the model says it is done.
const TRUSTING = board(
  { k: 'concat', m: 'model', r: 'read', l: 'list', keep: 'concat' },
  [...LOOP_IN, 'm>r.ask', 'm>l.ask', 'r>keep.a', 'l>keep.b', 'keep>out', 'm>stop'],
)

export const levels = [
  // ── Chapter 0 · 纸笔 ───────────────────────────────────────────────────────────────────────────────────────────
  {
    id: '0-1',
    kind: 'hand',
    mode: 'once',
    title: T('它只知道你给它的', 'It knows what you give it'),
    brief: T('让模型修好这个 issue，再跑一次测试确认。', 'Get the model to fix this issue, then run the tests to make sure.'),
    intro: [
      { t: T('<wiki-ref to="model"></wiki-ref>就是编码 agent 里的那个大模型：读一段文字，给出一个动作。它读到的那段文字叫<b>上下文</b>。', '<wiki-ref to="model"></wiki-ref> is the large model inside a coding agent: it reads some text and gives one action. The text it reads is its <b>context</b>.') },
      { t: T('现在还没有任何机器替你跑它。你自己决定上下文里放什么，按下「调用」，看它做了什么，再自己跑测试。', 'No machine runs it for you yet. You decide what goes into the context, press Call, see what it did, and run the tests yourself.') },
    ],
    hint: [
      T('先不放文件，调用一次，看它写了什么，再跑测试。', 'Call it once with no file, see what it writes, and run the tests.'),
      T('issue 里写了要改的文件名。', 'The issue names the file to change.'),
    ],
    test: { issue: 'qty-zero' },
    solution: [['add', 'src/cart.js'], ['call'], ['test']],
    after: T('没看到 <code>addItem</code> 的代码，模型照样写了：它编了一个仓库里不存在的函数。把文件放进上下文，它就写对了。模型只知道上下文里的东西；上下文外面的，它会编。', 'Without the code of <code>addItem</code> the model wrote anyway: it made up a function the repository does not have. With the file in its context, it wrote it right. The model knows only what is in its context; what is outside, it makes up.'),
  },
  {
    id: '0-2',
    kind: 'hand',
    mode: 'loop',
    title: T('它要什么，你给什么', 'Give it what it asks for'),
    brief: T('这次模型会提要求：要目录、要文件。照着它的要求给，直到测试通过。', 'This time the model asks: for the file list, for a file. Give it what it asks for, until the tests pass.'),
    hint: [
      T('模型要目录时，按目录按钮，把仓库的文件列表放进上下文。', 'When the model asks for the files, press File list to put the repository’s list into its context.'),
      T('它说做完了，不一定真做完了。', 'It says it is done; that does not make it done.'),
    ],
    test: { issue: 'discount-cap' },
    solution: [['call'], ['list'], ['call'], ['add', 'src/price.js'], ['call'], ['test'], ['call'], ['test']],
    after: T('一轮一轮：模型提要求，你去拿，结果放回上下文，再调用。它第一次写的看起来对，测试却没过；把失败的测试报告放回上下文，它就改对了。刚才你做的，就是一个 <b>agent 循环</b>：每一轮调用一次模型，做它要的事，把结果接回去。', 'Turn after turn: the model asks, you fetch, the result goes back into its context, and you call again. Its first try looked right and failed the tests; with the failing report in its context, it got it right. What you just did is an <b>agent loop</b>: each turn, one model call, do what it asks, feed the result back.'),
  },
  {
    id: '0-3',
    kind: 'hand',
    mode: 'once',
    window: 700,
    title: T('窗口满了', 'The window is full'),
    brief: T('这个模型一次只能读 700 个 token。让它修好这个 issue。', 'This model reads at most 700 tokens at a time. Get it to fix this issue.'),
    hint: [
      T('上下文条上变灰的部分，模型看不到。', 'Whatever turns grey on the context bar, the model does not see.'),
      T('issue 只写了函数名。每个文件里有哪些函数，仓库那一栏里写着。', 'The issue names only the function. The repository panel shows which functions each file holds.'),
    ],
    test: { issue: 'slug-spaces' },
    solution: [['add', 'src/text.js'], ['call'], ['test']],
    after: T('上下文有上限，叫<b>窗口</b>。超出的部分从最早的开始丢掉，而最早放进去的往往就是 issue 本身：模型看不到任务，就以为没事可做。放进上下文的东西不是越多越好，要挑。', 'A context has a limit, its <b>window</b>. What goes over is dropped from the oldest on, and the oldest is often the issue itself: a model that cannot see its task thinks there is nothing to do. More in the context is not better; pick.'),
  },

  // ── Chapter 1 · 一问一答 ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: '1-1',
    kind: 'board',
    title: T('第一次调用', 'The first call'),
    adds: ['model'],
    brief: T('搭一块板：把 issue 交给模型，它写出的修改落进仓库。', 'Build a board: hand the issue to the model, and what it writes lands in the repository.'),
    intro: [
      { t: T('手动喂了几次模型以后，这一章开始搭机器。机器每次运行这块板一次：左边是它拿到的东西，右边是结果去的地方，中间由你接。', 'After feeding the model by hand, this chapter starts on the machine. It runs this board once: on the left what it is given, on the right where the results go; the middle is yours to wire.') },
      { t: T('这一章的模型只会被调用一次，不能回头要东西：它看到什么就写什么。这一关的 issue 自带了代码。', 'In this chapter the model is called once and cannot ask for anything: it writes from what it sees. This level’s issues come with their code.') },
    ],
    hint: [T('从 issue 右边的圆点连到模型，再从模型连到仓库。', 'Wire the dot on the right of the issue to the model, and the model to the repository.')],
    tests: [{ issue: 'pasted-total' }, { issue: 'pasted-tax' }],
    solution: board({ m: 'model' }, ['issue>m', 'm>repo']),
    after: T('issue 里贴了代码，模型就看得到要改的函数，一次写对。板上线里流的是上下文：一组条目，每条占一些 token；模型读进一段上下文，给出一个动作。', 'With the code pasted into the issue, the model can see the function to change and writes it right in one go. What runs on these wires is context: a list of entries, each taking some tokens; the model reads a context and gives one action.'),
  },
  {
    id: '1-2',
    kind: 'board',
    title: T('把代码贴上', 'Paste the code in'),
    adds: ['concat'],
    brief: T('这次 issue 没贴代码，代码单独给在左边。让模型两样都看到。', 'This time the issue has no code; the code comes separately on the left. Let the model see both.'),
    intro: [{ t: T('只接 issue 的板，在这里会编出不存在的函数：代码不在模型的上下文里。模型只有一个输入口，两样东西要先并成一段。', 'A board wired with the issue alone makes up functions here: the code is not in the model’s context. The model has one input, so the two have to become one context first.') }],
    tests: [{ issue: 'qty-zero', code: 'src/cart.js' }, { issue: 'tax-round', code: 'src/price.js' }],
    solution: board({ k: 'concat', m: 'model' }, ['issue>k.a', 'code>k.b', 'k>m', 'm>repo']),
    naive: board({ m: 'model' }, ['issue>m', 'm>repo']),
    after: T('拼接把几段上下文按顺序接成一段。现在由你决定模型看到什么、按什么顺序看到。', 'Concat joins contexts into one, in order. Now you decide what the model sees, and in what order.'),
  },
  {
    id: '1-3',
    kind: 'board',
    title: T('自己去读', 'Read it yourself'),
    adds: ['read'],
    brief: T('没有人替你贴代码了。从仓库里读出要改的文件，交给模型。', 'Nobody pastes the code for you now. Read the file to change from the repository and hand it to the model.'),
    intro: [{ t: T('这一关的 issue 只写了要改哪个文件，代码要从仓库里拿。读文件元件按它的设置读出一个文件，作为一段上下文。', 'This level’s issues only say which file to change; the code has to come from the repository. The read part reads the file its setting names, as a context.') }],
    tests: [{ issue: 'qty-zero' }, { issue: 'remove-missing' }],
    solution: board({ r: ['read', { file: 'src/cart.js' }], k: 'concat', m: 'model' }, ['issue>k.a', 'r>k.b', 'k>m', 'm>repo']),
    after: T('你替模型去仓库里拿了它要看的东西。哪个文件该读，现在是你在 issue 里找出来的。', 'You fetched from the repository what the model needed to see. Which file to read, you found in the issue yourself.'),
  },
  {
    id: '1-4',
    kind: 'board',
    title: T('两个文件', 'Two files'),
    brief: T('这次一个 issue 要改两个文件。', 'This time one issue changes two files.'),
    intro: [{ t: T('和<level-ref to="1-3"></level-ref>一样的事，多了一个维度：一处修改要看的文件多了一个。', 'The same as <level-ref to="1-3"></level-ref>, one dimension more: the change needs one more file in view.') }],
    tests: [{ issue: 'member-discount' }, { issue: 'coupon' }],
    solution: board({ a: ['read', { file: 'src/cart.js' }], b: ['read', { file: 'src/price.js' }], k: 'concat', m: 'model' }, ['issue>k.a', 'a>k.b', 'b>k.c', 'k>m', 'm>repo']),
    after: T('每处修改的代码都要在上下文里。少了一个文件，那一处就是编的。', 'Every change needs its code in the context. One file short, and that change is made up.'),
  },
  {
    id: '1-5',
    kind: 'board',
    window: 1000,
    title: T('读哪一个', 'Which one to read'),
    brief: T('这个仓库的文件都很长，模型的窗口是 1000 个 token。issue 只写了函数名。', 'This repository’s files are long, and the model’s window is 1000 tokens. The issues name only the function.'),
    intro: [{ t: T('全部读进去，窗口装不下：最早放进去的会被丢掉。要从函数名找到它所在的文件。', 'Read everything in and the window cannot hold it: the oldest entries are dropped. Find the file a function lives in from its name.') }],
    hint: [T('测试区里列着仓库的每个文件和它的函数。', 'The test area lists every file of the repository with its functions.')],
    tests: [{ issue: 'date-format' }, { issue: 'list-order' }],
    solution: board({ r: ['read', { file: 'src/posts.js' }], k: 'concat', m: 'model' }, ['issue>k.a', 'r>k.b', 'k>m', 'm>repo']),
    naive: board(
      { a: ['read', { file: 'src/posts.js' }], b: ['read', { file: 'src/text.js' }], c: ['read', { file: 'src/feed.js' }], d: ['read', { file: 'src/theme.css' }], k: 'concat', j: 'concat', m: 'model' },
      ['issue>k.a', 'a>k.b', 'b>k.c', 'k>j.a', 'c>j.b', 'd>j.c', 'j>m', 'm>repo'],
    ),
    after: T('窗口有限时，读对一个文件胜过读全部。上下文的顺序也算数：窗口从最早的那头开始丢。', 'With a limited window, the right file beats every file. The order counts too: the window drops from the oldest end.'),
  },
  {
    id: '1-6',
    kind: 'board',
    title: T('三处修改', 'Three changes'),
    brief: T('一个 issue，三处修改，两个文件。', 'One issue, three changes, two files.'),
    intro: [{ t: T('一次调用要写完三处：每一处的代码都要在它眼前。', 'One call has to write all three: each one’s code must be in front of it.') }],
    tests: [{ issue: 'checkout' }],
    solution: board({ a: ['read', { file: 'src/cart.js' }], b: ['read', { file: 'src/price.js' }], k: 'concat', m: 'model' }, ['issue>k.a', 'a>k.b', 'b>k.c', 'k>m', 'm>repo']),
    after: T('一次调用能写好几处，前提是要看的都在上下文里。到这里，挑文件、拼上下文的都是你：模型自己不能要东西。', 'One call can write several changes, as long as all it needs is in its context. So far, picking the files and building the context is all yours: the model cannot ask for anything itself.'),
  },

  // ── Chapter 2 · 循环 ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: '2-1',
    kind: 'board',
    title: T('让它自己读', 'Let it read'),
    brief: T('这次机器一轮一轮地跑这块板。让模型自己要文件、自己读，改完就停。', 'Now the machine runs this board turn after turn. Let the model ask for files and read them itself, and stop when it is done.'),
    intro: [
      { t: T('上一章的机器只调用一次模型，读哪个文件得你事先选好。这一章的机器每一轮都跑一遍这块板：模型这一轮给的动作，可以接到读文件元件上，读出来的东西接到「留到下一轮」，下一轮就出现在左边的「历史」里。', 'Last chapter’s machine called the model once, and you picked the file beforehand. This chapter’s machine runs the board every turn: the action the model gives this turn can go into the read part, what it reads goes into Keep for next turn, and next turn it shows up in History on the left.') },
      { t: T('机器会自己把模型每一轮的动作记进历史。模型的修改落进仓库；什么时候停，看接到「停」的是什么。', 'The machine records the model’s action each turn in the history itself. Its writes land in the repository; when to stop depends on what you wire into Stop.') },
    ],
    hint: [
      T('读文件元件的输入口接上模型的动作，它就读模型要的那个文件。', 'With the model’s action wired into the read part’s input, it reads the file the model asks for.'),
      T('模型下一轮要看到的东西：issue，还有之前每一轮发生的事。', 'What the model needs to see next turn: the issue, and what happened in every turn before.'),
    ],
    tests: [{ issue: 'qty-zero' }, { issue: 'tax-round' }],
    solution: board({ k: 'concat', m: 'model', r: 'read' }, [...LOOP_IN, 'm>r.ask', 'r>out', 'm>stop']),
    after: T('读哪个文件，由模型这一轮的动作决定，不再是板上写死的设置。issue、历史、模型、工具、留到下一轮：这就是 agent 循环的骨架，转起来的是机器。', 'Which file to read is now up to the model’s action this turn, not a setting fixed on the board. Issue, history, model, tools, keep for next turn: that is the skeleton of an agent loop, and the machine turns it.'),
  },
  {
    id: '2-2',
    kind: 'board',
    adds: ['list'],
    title: T('让它自己找', 'Let it look'),
    brief: T('这些 issue 只写了函数名。让模型自己找到它在哪个文件里。', 'These issues name only the function. Let the model find which file it is in.'),
    intro: [{ t: T('只会读文件的板，在这里卡住：模型不知道该读哪个，就要一份目录，可没有元件回应它。新元件<part-ref to="part:list"></part-ref>在模型要目录时，给出仓库的文件和每个文件里的函数。', 'A board that can only read gets stuck here: not knowing what to read, the model asks for the file list, and nothing answers. The new part <part-ref to="part:list"></part-ref> gives the repository’s files and the functions in each when the model asks for it.') }],
    tests: [{ issue: 'logout-session' }, { issue: 'login-case' }],
    solution: TRUSTING,
    after: T('模型先看目录，再读文件，再改：它用的工具越多，你要事先知道的越少。每个工具的结果都要接回去，它才看得到。', 'The model looked at the list, read the file, then changed it: the more tools it has, the less you need to know beforehand. Every tool’s result has to be fed back for it to see.'),
  },
  {
    id: '2-3',
    kind: 'board',
    adds: ['test'],
    title: T('测完再停', 'Stop when it passes'),
    brief: T('这两个 issue 的改法容易写错。让机器改到测试通过才停。', 'These two issues are easy to get wrong. Have the machine go on until the tests pass.'),
    intro: [{ t: T('模型写完自己以为该写的，就说「做完了」，不管测试。新元件<part-ref to="part:test"></part-ref>在模型说做完或要求测试时跑一遍测试：给出一份报告，和测试是否通过。', 'Once the model has written what it thinks it should, it says it is done, tests or not. The new part <part-ref to="part:test"></part-ref> runs the tests when the model says it is done or asks for them: it gives a report, and whether the tests pass.') }],
    hint: [
      T('先用之前的停法跑一次，看最后一轮测试是什么样。', 'Run it once with the old way of stopping, and look at the tests after the last turn.'),
      T('「停」也接受「是否通过」。', 'Stop also takes a pass flag.'),
    ],
    tests: [{ issue: 'discount-cap' }, { issue: 'empty-cart' }],
    solution: FULL,
    naive: TRUSTING,
    after: T('模型说做完了，不等于做完了。把「停」交给测试，模型的话就要被检查；失败的报告接回上下文，它下一轮就照着改。', 'The model saying it is done does not make it done. Hand Stop to the tests and its word gets checked; a failing report fed back into its context is what it fixes by next turn.'),
  },
  {
    id: '2-4',
    kind: 'board',
    title: T('两处陷阱', 'Two traps'),
    brief: T('一个 issue，两处容易写错的修改，在两个文件里。', 'One issue, two easy-to-get-wrong changes, in two files.'),
    intro: [{ t: T('和<level-ref to="2-3"></level-ref>一样的机器，多一层：要转更多轮，测试报告里一次失败两处。', 'The same machine as <level-ref to="2-3"></level-ref>, one level deeper: more turns, and a report that fails two changes at once.') }],
    tests: [{ issue: 'two-traps' }],
    solution: FULL,
    after: T('一份报告列出所有失败，模型每一轮修它看得到的那些。轮数多了，历史也跟着变长。', 'One report lists every failure, and each turn the model fixes the ones it can see. More turns, and a longer history.'),
  },
  {
    id: '2-5',
    kind: 'board',
    title: T('只说坏了', 'Only the symptom'),
    brief: T('这些 issue 只写了用户看到的问题，没说改哪里。', 'These issues describe only what users see, not what to change.'),
    intro: [{ t: T('少一层支架：issue 里没有函数名，也没有文件名。模型要先知道哪里坏了。', 'One support less: no function and no file in the issue. The model first has to find out what is broken.') }],
    hint: [T('模型不知道从哪改的时候，会先要求跑测试。', 'When the model does not know where to start, it asks for the tests first.')],
    tests: [{ issue: 'negative-total' }, { issue: 'stuck-session' }],
    solution: FULL,
    after: T('只有症状时，失败的测试就是线索：报告里写着哪里不对。同一块板，issue 写得越少，越靠工具把信息找回来。', 'With only a symptom, a failing test is the lead: the report says what is wrong where. On the same board, the less the issue says, the more the tools have to find.'),
  },
  {
    id: '2-6',
    kind: 'board',
    turns: 10,
    title: T('一起来', 'All together'),
    brief: T('三种 issue 混在一起，每个都要在 10 轮内改好并停下。', 'Three kinds of issue mixed, each fixed and stopped within 10 turns.'),
    intro: [{ t: T('只写函数名的、有陷阱的、只说症状的，一块板全部接住。', 'Named by function, with a trap, or only a symptom: one board takes them all.') }],
    tests: [{ issue: 'login-case' }, { issue: 'two-traps' }, { issue: 'stuck-session' }],
    solution: FULL,
    after: T('一块板接住了三种 issue：要目录、读文件、跑测试、改到通过。这就是一个完整的编码 agent：一个循环，一个上下文，几个工具，一道检查。', 'One board took all three kinds: list, read, test, fix until it passes. That is a whole coding agent: a loop, a context, a few tools and a check.'),
  },
  {
    id: '2-C',
    kind: 'board',
    title: T('大仓库', 'A big repository'),
    brief: T('三十多个包的仓库，光目录就很长。修好这个 issue，总共不超过 2000 个 token。', 'A repository of over thirty packages, whose file list alone is long. Fix this issue in 2000 tokens all told.'),
    hint: [T('模型的每次调用都要读一遍整个上下文。', 'Every call of the model reads its whole context again.')],
    tests: [{ issue: 'webhook-retry' }],
    budget: { tokens: 2000 },
    solution: board(
      { k: 'concat', m: 'model', r: 'read', t: 'test', keep: 'concat' },
      [...LOOP_IN, 'm>r.ask', 'm>t.when', 'r>keep.a', 't#out>keep.b', 'keep>out', 't#green>stop'],
    ),
    naive: FULL,
    after: T('目录一旦进了历史，之后每一轮都要再读一遍。没有元件回应它的要目录，模型就换一条路：跑测试，从失败报告里找到文件。给模型的工具少一个，有时反而更省。', 'Once the list is in the history, every later turn reads it again. With nothing to answer its ask for the list, the model takes another way: it runs the tests and finds the file in the failing report. One tool fewer is sometimes cheaper.'),
  },
]
