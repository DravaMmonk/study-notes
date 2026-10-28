// The games on the hub page. To add a game, put it in its own folder under games/ and add an entry here.
// progress() reads the game's own save in this browser (all games share the site's origin) and returns
// how many levels are done; a game without a save reads as 0.
// `title` is the Chinese name and `en` the English one; topic and desc are { zh, en } pairs (hub.js picks one).
// `levels` is how many levels the game has, as its spec lists them; `npm run check` fails when the two differ.
// `page` is the game's own page (games/kit/app): the path drawn on its tab icon and its description for search engines.
// `dev` marks a game still in development: its card says so. `hidden` keeps a page off the hub (a trial reached by
// its address alone); it is still built and published like any game.

const read = key => { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } };

export const GAMES = [
  {
    id: 'vision-complete', href: 'vision-complete/index.html', title: '视觉完备', en: 'Vision Complete', topic: { zh: '计算机视觉', en: 'Computer Vision' },
    desc: {
      zh: '没有讲解，只有元件、测试和一组输入输出。从“把图挪一格”开始，自己搭出模糊、边缘、角点和视差，最后让机器学会看。',
      en: 'No lectures, just components, tests and a set of inputs and outputs. Start from “shift the image by one pixel”, build blur, edges, corners and disparity yourself, and end up teaching the machine to see.',
    },
    levels: 148, art: 'pipeline',
    page: { icon: 'M14 20h10v10H14zM40 34h10v10H40zM24 25h16v14', description: '视觉完备 Vision Complete：把计算机视觉课程做成一套解谜关卡。A computer vision course turned into a set of puzzle levels.' },
    progress: () => (read('vision-complete.v1')?.solved || []).length,
  },
  {
    id: 'state-graph', href: 'state-graph/index.html', title: '状态之图', en: 'State Graph', topic: { zh: '动态规划', en: 'Dynamic Programming' },
    desc: {
      zh: '不需要任何编程或算法基础。从格子和箭头出发，让一个小机器人在棋盘上一格一格地算，拼出数路线、比文字、装背包的电路板，再用到博弈、语言、图片和强化学习上。',
      en: 'No programming or algorithms background needed. Starting from cells and arrows, a little robot works across a board cell by cell while you wire up the circuit boards that count routes, compare words and pack a backpack, then carry them over to games, language, pictures and reinforcement learning.',
    },
    levels: 69, art: 'grid',
    page: { icon: 'M14 14h10v10H14zM40 40h10v10H40zM24 19h21v21', description: '状态之图 State Graph：零基础动态规划解谜游戏。Dynamic programming puzzles for complete beginners.' },
    // Saved by the shared game shell under <id>.v1; saves from before it under state-graph-v2.
    progress: () => (read('state-graph.v1')?.solved || Object.keys(read('state-graph-v2')?.done || {})).length,
  },
  {
    id: 'qed', href: 'qed/index.html', title: '证明完毕', en: 'Q.E.D.', topic: { zh: '形式化证明', en: 'Formal Proof' },
    desc: {
      zh: '不需要任何逻辑学基础。从真值表开始，把推理规则当成元件，一块一块搭出证明；造出假设框，再去岛上分辨骑士和无赖。',
      en: 'No logic background needed. Starting from truth tables, wire up proofs with rules of inference as parts; get an assumption box, then sort the knights from the knaves on an island.',
    },
    levels: 261, art: 'detach', dev: true,
    page: { icon: 'M14 16h14v10H14zM36 38h14v10H36zM28 21h15v17', description: '证明完毕 Q.E.D.：把形式化证明做成一套解谜关卡。Formal proof as a set of puzzle levels.' },
    progress: () => (read('qed.v1')?.solved || []).length,
  },
  {
    id: 'qed-lab', href: 'qed-lab/index.html', title: '证明完毕 · 试做', en: 'Q.E.D. · Trial', topic: { zh: '形式化证明', en: 'Formal Proof' },
    desc: {
      zh: '从套用和假设框搭起证明器，加上与、或的规则，用框证出公理 K 和 S，再拿掉框，只靠公理证明。',
      en: 'Build a prover from Apply and the assumption box, add the rules of and and or, prove the axioms K and S with boxes, then take the box away and prove with the axioms alone.',
    },
    levels: 12, art: 'detach', dev: true, hidden: true,
    page: { icon: 'M14 16h14v10H14zM36 38h14v10H36zM28 21h15v17', description: '证明完毕 试做：从两块元件搭起证明器。Q.E.D. trial: a prover built from two parts.' },
    progress: () => (read('qed-lab.v1')?.solved || []).length,
  },
  {
    id: 'syntax-graph', href: 'syntax-graph/index.html', title: '句法之图', en: 'Syntax Graph', topic: { zh: '计算机学术写作', en: 'Academic Writing in Computer Science' },
    desc: {
      zh: '在论文和审稿的真实场合里，一题几秒地练出母语者“场合一出现，说法就跟着来”的直觉；选错了，告诉你母语者为什么不这么说。练熟了，就去走一次路线每回都不一样的投稿。',
      en: 'In the real situations of a paper and its review, a few seconds an item, train the native writer’s instinct that a situation calls up its wording; pick wrong and you are told why a native speaker would not say it. Then take a submission whose route is new every time.',
    },
    levels: 8, art: 'stick', dev: true,
    page: { icon: 'M32 14v14M32 28 17 48M32 28l15 20', description: '句法之图 Syntax Graph：按场合练出母语者的说法，计算机学术英语。Native wording by situation, for academic writing in computer science.' },
    progress: () => (read('syntax-graph.v1')?.solved || []).length,
  },
  {
    id: 'factory', href: 'factory/index.html', title: '软件工厂', en: 'Software Factory', topic: { zh: '编码 agent', en: 'Coding Agents' },
    desc: {
      zh: '从一次模型调用开始，亲手决定它看到什么、能做什么、什么时候算做完：先替它拿文件，再让它自己读、自己找、改到测试通过，搭出一个自己修 issue 的编码 agent。',
      en: 'Starting from one model call, decide what it sees, what it may do and when it is done: fetch its files for it, then let it read and look for itself until the tests pass, and build a coding agent that fixes issues on its own.',
    },
    levels: 16, art: 'loop', dev: true,
    page: { icon: 'M20 22a12 12 0 1 1 0 20M20 22l-4 6M20 22l7 2', description: '软件工厂 Software Factory：从一次模型调用搭起编码 agent。A coding agent built up from one model call.' },
    progress: () => (read('factory.v1')?.solved || []).length,
  },
];
