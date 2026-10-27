// 软件工厂's encyclopedia (the shell's 百科): the ideas behind a coding agent, and how this game stands in for a real
// model. An entry opens once the level `at` is reached (no `at`: from the start).

const T = (zh, en) => ({ zh, en })

export const groups = [
  { id: 'play', title: T('玩法', 'How to play') },
  { id: 'agent', title: T('编码 agent', 'Coding agents') },
]

export const entries = [
  {
    id: 'model', group: 'play', title: T('这里的模型', 'The model here'),
    body: [
      T('真实的大模型每次回答都可能不同，调用要花钱，也没法把所有情况测一遍，所以游戏里的模型是一个按规则行事的替身。它的规则写在元件说明里，每一条都对应真实模型的一种表现：只知道上下文里的东西，没看到的会编，窗口有限，第一次写容易错的地方会写错，写完就说做完了。', 'A real large model may answer differently each time, costs money to call, and cannot be tested on every case, so the model in this game is a stand-in that follows rules. Its rules are in its part description, and each is something real models do: it knows only what is in its context, makes up what it has not seen, has a limited window, gets tricky changes wrong on the first try, and says it is done once it has written what it meant to.'),
      T('游戏里的「代码」也是简化的：一个文件就是几个有名字的函数，改对、改错、编造各算一种结果。这里练的是模型外面那一层：给它看什么、让它做什么、怎么检查它。', 'The code is simplified too: a file is a few named functions, and a change is right, wrong or made up. What you practise here is the layer around the model: what it sees, what it may do, and how it is checked.'),
    ],
  },
  {
    id: 'context', group: 'agent', title: T('上下文', 'Context'), at: '0-1',
    body: [
      T('模型每次调用读进的那一段文字：任务、代码、之前发生的事。模型对世界的了解只有这么多；不在上下文里的东西，对它来说就不存在。', 'The text a model reads on each call: the task, the code, what happened before. That is all it knows of the world; whatever is not in its context does not exist for it.'),
      T('上下文按 token 计算长度，一个 token 大约是一个英文单词的四分之三，或者半个到一个汉字。每次调用，整段上下文都要重新读一遍，按 token 收费。', 'A context is measured in tokens; a token is about three quarters of an English word, or half to one Chinese character. Every call reads the whole context again, and is billed by the token.'),
    ],
    see: ['window', 'madeup'],
  },
  {
    id: 'madeup', group: 'agent', title: T('编造', 'Making things up'), at: '0-1',
    body: [T('模型被要求写它没看过的代码时，往往不会说「我没看到」，而是写出一段看起来合理的代码：调用一个名字很像、但并不存在的函数，或者猜错参数。这常被叫作「幻觉」。办法不是叮嘱它别编，而是把它需要的东西放进上下文，或者给它自己去拿的工具。', 'Asked to write code it has not seen, a model will seldom say so; it writes something that looks reasonable instead: a call to a function with a likely name that does not exist, or the wrong arguments. This is often called hallucination. The cure is not to tell it not to, but to put what it needs into its context, or to give it tools to fetch it.')],
  },
  {
    id: 'window', group: 'agent', title: T('窗口', 'Window'), at: '0-3',
    body: [
      T('一个模型一次能读的上下文有上限，叫上下文窗口。超出的部分要么被截掉，要么根本放不进去。在这个游戏里，超出窗口的条目从最早的开始丢掉，模型不会知道丢了什么。', 'The context a model can read at once has a limit, its context window. Whatever goes over is cut off or never gets in. In this game, entries over the window are dropped from the oldest on, and the model does not know what was lost.'),
      T('真实的窗口很大，但长上下文更贵、更慢，而且模型对中间部分的注意也会变差。所以挑选放进去的东西，在窗口很大时同样重要。', 'Real windows are large, but long contexts are dearer and slower, and models attend less well to the middle. Choosing what goes in matters even with a large window.'),
    ],
  },
  {
    id: 'loop', group: 'agent', title: T('agent 循环', 'The agent loop'), at: '0-2',
    body: [
      T('编码 agent 的核心是一个循环：把任务和之前的历史交给模型；模型给出一个动作（读文件、跑命令、改代码、宣布完成）；执行这个动作，把结果记进历史；再来一轮。直到模型说做完了，或者某个检查说可以停了。', 'At the heart of a coding agent is a loop: hand the model the task and the history so far; it gives one action (read a file, run a command, edit code, say it is done); carry the action out and record the result in the history; go round again. Until the model says it is done, or a check says it may stop.'),
      T('真实的 agent 程序只有几百行，大部分是在拼上下文、执行工具、处理结果。', 'A real agent program is a few hundred lines, most of them building the context, running tools and handling results.'),
    ],
    see: ['tools'],
  },
  {
    id: 'tools', group: 'agent', title: T('工具', 'Tools'), at: '2-1',
    body: [T('模型自己只能输出文字。工具是 agent 程序替它执行的动作：读文件、列目录、搜索、跑测试、改代码。模型说「我要读 src/cart.js」，程序去读，再把内容放进下一轮的上下文。有了工具，模型可以自己去拿它需要的东西，不用人事先猜好。', 'A model by itself only writes text. Tools are the actions the agent program carries out for it: read a file, list a directory, search, run the tests, edit the code. The model says “I want to read src/cart.js”; the program reads it and puts the content into the next turn’s context. With tools, the model fetches what it needs instead of someone guessing it beforehand.')],
  },
  {
    id: 'verify', group: 'agent', title: T('检查完成', 'Checking it is done'), at: '2-3',
    body: [T('模型说「做完了」只是它的判断。可靠的 agent 不把这句话当作结束的条件，而是用测试、类型检查、构建这样能自动判定的东西来决定能不能停，并把失败的结果交还给模型去改。', 'A model saying it is done is only its judgement. A reliable agent does not take that as the end; it lets something that can decide by itself (tests, a type check, a build) say whether to stop, and hands failures back to the model to fix.')],
  },
]
