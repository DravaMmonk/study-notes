// The games on the hub page. To add a game, put it in its own folder under games/ and add an entry here.
// progress() reads the game's own save in this browser (all games share the site's origin) and returns
// how many levels are done; a game without a save reads as 0.
// `title` is the Chinese name and `en` the English one; topic and desc are { zh, en } pairs (hub.js picks one).
// `page` is the game's own page (games/kit/app): the path drawn on its tab icon and its description for search engines.
// `dev` marks a game still in development: its card says so. `hidden` keeps a page off the hub (a trial reached by
// its address alone); it is still built and published like any game.

const read = key => { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } };

export const GAMES = [
  {
    id: 'vision-complete', href: 'vision-complete/index.html', title: '视觉完备', en: 'Vision Complete', topic: { zh: 'COMP90086 · 计算机视觉', en: 'COMP90086 · Computer Vision' },
    desc: {
      zh: '没有讲解，只有元件、测试和一组输入输出。从“把图挪一格”开始，自己搭出模糊、边缘、角点和视差，最后让机器学会看。',
      en: 'No lectures, just components, tests and a set of inputs and outputs. Start from “shift the image by one pixel”, build blur, edges, corners and disparity yourself, and end up teaching the machine to see.',
    },
    levels: 58, art: 'pipeline',
    page: { icon: 'M14 20h10v10H14zM40 34h10v10H40zM24 25h16v14', description: '视觉完备 Vision Complete：把计算机视觉课程做成一套解谜关卡。A computer vision course turned into a set of puzzle levels.' },
    progress: () => (read('vision-complete.v1')?.solved || []).length,
  },
  {
    id: 'state-graph', href: 'state-graph/index.html', title: '状态之图', en: 'State Graph', topic: { zh: '从零开始 · 动态规划', en: 'From scratch · Dynamic Programming' },
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
    id: 'qed', href: 'qed/index.html', title: '证明完毕', en: 'Q.E.D.', topic: { zh: '从零开始 · 形式化证明', en: 'From scratch · Formal proof' },
    desc: {
      zh: '不需要任何逻辑学基础。从真值表开始，把推理规则当成元件，一块一块搭出证明；造出假设框，再去岛上分辨骑士和无赖。',
      en: 'No logic background needed. Starting from truth tables, wire up proofs with rules of inference as parts; get an assumption box, then sort the knights from the knaves on an island.',
    },
    levels: 27, art: 'detach', dev: true,
    page: { icon: 'M14 16h14v10H14zM36 38h14v10H36zM28 21h15v17', description: '证明完毕 Q.E.D.：把形式化证明做成一套解谜关卡。Formal proof as a set of puzzle levels.' },
    progress: () => (read('qed.v1')?.solved || []).length,
  },
  {
    id: 'qed-lab', href: 'qed-lab/index.html', title: '证明完毕 · 试做', en: 'Q.E.D. · Trial', topic: { zh: '试做 · 形式化证明', en: 'Trial · Formal proof' },
    desc: {
      zh: '从套用和假设框两块元件搭起证明器，用框证出公理 K 和 S，再拿掉框，只靠公理证明。',
      en: 'Build a prover from two parts, Apply and the assumption box, prove the axioms K and S with boxes, then take the box away and prove with the axioms alone.',
    },
    levels: 9, art: 'detach', dev: true, hidden: true,
    page: { icon: 'M14 16h14v10H14zM36 38h14v10H36zM28 21h15v17', description: '证明完毕 试做：从两块元件搭起证明器。Q.E.D. trial: a prover built from two parts.' },
    progress: () => (read('qed-lab.v1')?.solved || []).length,
  },
  {
    id: 'syntax-graph', href: 'syntax-graph/index.html', title: '句法之图', en: 'Syntax Graph', topic: { zh: '英语语法 · 计算机学术写作', en: 'English grammar · academic writing in computer science' },
    desc: {
      zh: '读一张语义图，把名词短语、时体和动词按语序放进一句论文里的英语。放错位置会被语法拒绝，说错意思会在语义图上标红。从最短的一句起步，一路写到母语作者也会写错的句子。',
      en: 'Read a meaning graph and put noun phrases, tenses and verbs in order into a sentence from a paper. A word in the wrong place is refused by the grammar; a wrong meaning is marked red on the graph. Start from the shortest sentence and work up to the ones native authors get wrong.',
    },
    levels: 13, art: 'stick', dev: true,
    page: { icon: 'M32 14v14M32 28 17 48M32 28l15 20', description: '句法之图 Syntax Graph：计算机学术英语的语法解谜游戏。Grammar puzzles for academic writing in computer science.' },
    progress: () => (read('syntax-graph.v1')?.solved || []).length,
  },
];
