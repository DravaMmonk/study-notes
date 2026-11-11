// The games on the hub page. To add a game, put it in its own folder under games/ and add an entry here.
// `title` is the Chinese name and `en` the English one; topic and desc are { zh, en } pairs (hub.js picks one).
// `levels` is how many levels the game has, as its spec lists them; `npm run check` fails when the two differ.
// `page` is the game's own page (games/kit/app): the path drawn on its tab icon and its description for search engines.
// `dev` marks a game still in development: its card says so. `hidden` keeps a page off the hub (a trial reached by
// its address alone); it is still built and published like any game.

export const GAMES = [
  {
    id: 'vision-complete', href: 'vision-complete/index.html', title: '视觉完备', en: 'Vision Complete', topic: { zh: '计算机视觉', en: 'Computer Vision' },
    desc: {
      zh: '没有讲解，只有元件、测试和一组输入输出。从“把图挪一格”开始，自己搭出模糊、边缘、角点和视差，最后让机器学会看。',
      en: 'No lectures, just components, tests and a set of inputs and outputs. Start from “shift the image by one pixel”, build blur, edges, corners and disparity yourself, and end up teaching the machine to see.',
    },
    levels: 151, art: 'pipeline',
    page: { icon: 'M14 20h10v10H14zM40 34h10v10H40zM24 25h16v14', description: '视觉完备 Vision Complete：把计算机视觉课程做成一套解谜关卡。A computer vision course turned into a set of puzzle levels.' },
  },
  {
    id: 'state-graph', href: 'state-graph/index.html', title: '状态之图', en: 'State Graph', topic: { zh: '动态规划', en: 'Dynamic Programming' },
    desc: {
      zh: '不需要任何编程或算法基础。从格子和箭头出发，让一个小机器人在棋盘上一格一格地算，拼出数路线、比文字、装背包的电路板，再用到博弈、语言、图片和强化学习上。',
      en: 'No programming or algorithms background needed. Starting from cells and arrows, a little robot works across a board cell by cell while you wire up the circuit boards that count routes, compare words and pack a backpack, then carry them over to games, language, pictures and reinforcement learning.',
    },
    levels: 69, art: 'grid',
    page: { icon: 'M14 14h10v10H14zM40 40h10v10H40zM24 19h21v21', description: '状态之图 State Graph：零基础动态规划解谜游戏。Dynamic programming puzzles for complete beginners.' },
  },
  {
    id: 'qed', href: 'qed/index.html', title: '证明完毕', en: 'Q.E.D.', topic: { zh: '形式化证明', en: 'Formal Proof' },
    desc: {
      zh: '不需要任何逻辑学基础。从真值表开始，把推理规则当成元件，一块一块搭出证明；造出假设框，再去岛上分辨骑士和无赖。',
      en: 'No logic background needed. Starting from truth tables, wire up proofs with rules of inference as parts; get an assumption box, then sort the knights from the knaves on an island.',
    },
    levels: 266, art: 'detach', dev: true,
    page: { icon: 'M14 16h14v10H14zM36 38h14v10H36zM28 21h15v17', description: '证明完毕 Q.E.D.：把形式化证明做成一套解谜关卡。Formal proof as a set of puzzle levels.' },
  },
  {
    id: 'syntax-graph', href: 'syntax-graph/index.html', title: '句法之图', en: 'Syntax Graph', topic: { zh: '计算机论文长难句', en: 'Long Sentences in Computer Science Papers' },
    desc: {
      zh: '把计算机论文里的长难句拆开：每个修饰成分折成一块，挂到它修饰的词上，直到主干露出来。从三个词的主干起步，一路拆到母语读者也要读两遍的句子。',
      en: 'Take apart the long sentences of computer science papers: fold each modifier into one piece and hang it on the word it modifies, until the skeleton shows. Start from a three-word skeleton and work up to sentences native readers have to read twice.',
    },
    levels: 21, art: 'stick', dev: true,
    page: { icon: 'M32 14v14M32 28 17 48M32 28l15 20', description: '句法之图 Syntax Graph：拆开计算机论文里的长难句。Taking apart the long sentences of computer science papers.' },
  },
  {
    id: 'factory', href: 'factory/index.html', title: '软件工厂', en: 'Software Factory', topic: { zh: '编码 agent', en: 'Coding Agents' },
    desc: {
      zh: '从一次模型调用开始，亲手决定它看到什么、能做什么、什么时候算做完：先替它拿文件，再让它自己读、自己找、改到测试通过，搭出一个自己修 issue 的编码 agent。',
      en: 'Starting from one model call, decide what it sees, what it may do and when it is done: fetch its files for it, then let it read and look for itself until the tests pass, and build a coding agent that fixes issues on its own.',
    },
    levels: 16, art: 'loop', dev: true,
    page: { icon: 'M20 22a12 12 0 1 1 0 20M20 22l-4 6M20 22l7 2', description: '软件工厂 Software Factory：从一次模型调用搭起编码 agent。A coding agent built up from one model call.' },
  },
  {
    id: 'bus', href: 'bus/index.html', title: '车在说话', en: 'The Car Talks', topic: { zh: '车载总线与诊断', en: 'In-Vehicle Bus and Diagnostics' },
    desc: {
      zh: '车上几十个控制器共用一根线说话。从“每一拍线上有一位”开始，亲手搭出听懂它们的探针，再长成能读故障码、能刷写软件的诊断仪。',
      en: 'The dozens of controllers in a car talk over one shared line. Starting from “one bit on the line each tick”, build a probe that understands them, and grow it into a tester that reads fault codes and reflashes software.',
    },
    levels: 117, art: 'wave', dev: true,
    page: { icon: 'M10 30h44M18 30v12M32 30v12M46 30v12M14 20h8v-6h8v6h8v-6h8', description: '车在说话 The Car Talks：车载 CAN 总线与诊断的解谜关卡。The in-vehicle CAN bus and diagnostics as puzzle levels.' },
  },
  {
    id: 'network', href: 'network/index.html', title: '从一根线开始', en: 'From One Wire', topic: { zh: '计算机网络', en: 'Computer Networks' },
    desc: { zh: '一根线，一拍一位，还会出错。从传一位话开始，一层层搭出自己的网卡。', en: 'One wire, one bit a tick, and some bits go wrong. Start by passing a bit on, and build a network adapter of your own, layer by layer.' },
    levels: 34, art: 'wave', dev: true,
    page: { icon: 'M10 32h14l4-10 8 20 4-10h14', description: '从一根线开始 From One Wire：从一根会出错的线搭起计算机网络。Computer networking built up from one wire that gets bits wrong.' },
  },
  {
    id: 'comp90086', href: 'comp90086/index.html', title: '计算机视觉笔记', en: 'Computer Vision Notes', topic: { zh: 'COMP90086 笔记版', en: 'COMP90086 notes edition' },
    desc: { zh: '嵌在 COMP90086 笔记里的交互：每个知识点动手一次，先预测，再看结果。', en: 'The interactions inside the COMP90086 notes: try each idea once, predicting first and then seeing what happens.' },
    levels: 3, art: 'pipeline', hidden: true,
    page: { icon: 'M16 32h32M32 16v32', description: '计算机视觉笔记 Computer Vision Notes：COMP90086 笔记里的交互。The interactions inside the COMP90086 notes.' },
  },
  {
    id: 'calculus', href: 'calculus/index.html', title: '差分机', en: 'The Difference Engine', topic: { zh: '高等数学', en: 'Calculus' },
    desc: {
      zh: '只会加和乘的机器，一拍算出数列的一项。亲手接出计数、求和与差分，看它们互相撤销；再一步步取极限，走到导数和积分。',
      en: 'A machine that can only add and multiply computes a term of a sequence each tick. Wire up counting, summing and differencing yourself and watch them undo each other; then take limits, step by step, up to derivatives and integrals.',
    },
    levels: 33, art: 'engine', dev: true,
    page: { icon: 'M12 46h40M18 46V34M28 46V26M38 46V20M48 46V16', description: '差分机 The Difference Engine：从一拍一项的数列机器搭起微积分。Calculus built up from a machine that computes a term a tick.' },
  },
  {
    id: 'linear', href: 'linear/index.html', title: '线性之格', en: 'The Linear Grid', topic: { zh: '线性代数', en: 'Linear Algebra' },
    desc: {
      zh: '不需要线性代数基础。从相加和伸缩两个动作开始，亲手搭出矩阵、矩阵乘法、行列式和解方程的元件，看每个矩阵怎样推动整张格子。',
      en: 'No linear algebra needed. Starting from adding and stretching arrows, build the parts for matrices, the matrix product, determinants and solving equations yourself, and watch how every matrix carries the whole grid along.',
    },
    levels: 18, art: 'shear', dev: true,
    page: { icon: 'M14 44l10-24h26l-10 24zM19 32h26M37 20l-10 24', description: '线性之格 The Linear Grid：从箭头搭起线性代数的解谜关卡。Linear algebra built up from arrows, as puzzle levels.' },
  },
  {
    id: 'market', href: 'market/index.html', title: '看不见的手', en: 'The Invisible Hand', topic: { zh: '经济学', en: 'Economics' },
    desc: {
      zh: '一家小店，每天进货，定一个价。先亲手试出合适的价格，再搭一台替你调价的机器，看它在行情变化的街上自己找到价格。',
      en: 'A small shop takes in stock every day and sets a price. Find the right price by hand, then build the machine that finds it for you, and watch it follow a street whose trade keeps changing.',
    },
    levels: 5, dev: true,
    page: { icon: 'M16 44V24l16-8 16 8v20M26 44V32h12v12', description: '看不见的手 The Invisible Hand：先手做，再搭出替你做的机器。Price a shop by hand, then build the machine that does it.' },
  },
];
