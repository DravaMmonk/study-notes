// 状态之图's encyclopedia (the shell's 百科, games/kit/shell): how the game is played, then the ideas it teaches.
// Each entry opens once the level `at` is reached (no `at`: from the start); `see` links related entries.

export const GLOSSARY_GROUPS = [
  { id: 'play', title: { zh: '玩法', en: 'How to play' } },
  { id: 'basics', title: { zh: '基本概念', en: 'Core ideas' } },
  { id: 'order', title: { zh: '计算顺序', en: 'Order of computation' } },
  { id: 'classic', title: { zh: '经典问题', en: 'Classic problems' } },
  { id: 'further', title: { zh: '更远的地方', en: 'Further afield' } },
];

export const GLOSSARY = [
  /* ---------- 玩法 ---------- */
  {
    id: 'map', group: 'play', title: { zh: '关卡地图', en: 'Level map' },
    body: [
      { zh: '关卡按章节排在地图上，每一章回答一个问题。通过一关，接在它后面的关卡就会打开；分成几路时，先走哪一路都行，几路都通过才继续。', en: 'The levels sit on the map in chapters, and each chapter answers one question. Pass a level and the levels after it open; where the path splits, take the branches in any order, and pass them all to go on.' },
      { zh: '不想按顺序玩，可以打开「全部解锁」：任意一关都能直接玩，进度照常记录。地图上还有「元件箱」和这本「百科」。', en: 'If you would rather not go in order, turn on “Unlock all”: any level can be played straight away, and your progress is still recorded. The map also has your Parts and this Encyclopedia.' },
    ],
    see: ['brief', 'part'],
  },
  {
    id: 'brief', group: 'play', title: { zh: '引入、目标与怎么玩', en: 'Intro, goal and how to play' },
    body: [
      { zh: '第一次进入一关时，会先打开几页<b>引入</b>，讲清这一关的新问题和新东西。想再看一遍，点顶栏的「引入」；在电脑上可以用 ← 和 → 翻页。', en: 'The first time you enter a level, a few pages of <b>Intro</b> open first, explaining the level’s new problem and anything new in it. To read them again, click “Intro” in the top bar; on a computer, ← and → turn the pages.' },
      { zh: '关卡的说明里，<b>目标</b>写着这一关要算出什么，<b>怎么玩</b>写着要动手做什么。卡住的时候，先回去把目标读一遍。', en: 'In the level’s brief, the <b>Goal</b> says what the level wants worked out, and <b>How to play</b> says what you have to do. When you are stuck, read the goal again first.' },
      { zh: '有的关分成几个<b>阶段</b>，同一张地图接连问几个问题；有的阶段会把电路板留给下一阶段。', en: 'Some levels come in several <b>stages</b>, asking a few questions in a row about the same map; some stages hand their circuit board on to the next.' },
      { zh: '不是每一关都要拼电路：有的关在棋盘上亲手连箭头、填数或画路线，「怎么玩」会说清楚。', en: 'Not every level needs a circuit: in some you draw arrows, fill in numbers or trace routes on the board by hand, and “How to play” says which.' },
    ],
    see: ['map', 'testBoard'],
  },
  {
    id: 'cells', group: 'play', title: { zh: '格子与箭头', en: 'Cells and arrows' },
    body: [
      { zh: '一开始，你只有两样东西：<b>格子</b>和<b>箭头</b>。格子里装着一个数；箭头把起点格子里的数，送进终点格子。', en: 'To begin with you have just two things: <b>cells</b> and <b>arrows</b>. A cell holds a number; an arrow carries the number in the cell it starts from into the cell it ends at.' },
      { zh: '好几根箭头指向同一个格子时，格子会把收到的数<b>全部加起来</b>；没有箭头指向的格子，里面就是 0。', en: 'When several arrows point at the same cell, the cell <b>adds up</b> everything it receives; a cell no arrow points at holds 0.' },
      { zh: '连箭头：先点一个格子，再点另一个；对同样两个格子再连一次，箭头就拆掉了。一个格子要等所有指向它的箭头都送到才算得出来，所以箭头不能绕成圈。', en: 'To draw an arrow, click one cell and then another; connect the same two cells again and the arrow is removed. A cell can only be worked out once every arrow pointing at it has delivered, so arrows must never loop round.' },
    ],
    see: ['dag', 'brief'],
  },
  {
    id: 'robot', group: 'play', title: { zh: '机器人与视野', en: 'The robot and its view' }, at: 'copy',
    body: [
      { zh: '在电路板关卡里，计算交给一个<b>机器人</b>。它一格一格地走过整张表，在每一格上运行同一块电路板，把结果写进脚下这一格。', en: 'In circuit-board levels the computing is done by a <b>robot</b>. It walks the whole table cell by cell, runs the same circuit board on every cell, and writes the result into the cell it stands on.' },
      { zh: '<b>机器人视野</b>中间的红框，是它脚下的格子。电路板要读视野里的一格，就在视野里点它，电路板左边的「视野」元件上就多一个读它的输出口；被读的格子在视野里带蓝框。表外面的格子显示「界外」，送来的是「—」。', en: 'The red frame in the middle of the <b>robot’s view</b> is the cell it stands on. For the circuit board to read a cell in view, click it in the view: the “View” part on the left of the circuit board gains an output that reads it, and a cell being read has a blue frame in the view. Cells beyond the table show “out”, and what they send is “—”.' },
      { zh: '视野下面的<b>本格信息</b>，是关于这一格的事实。点一条，「本格信息」元件上就多一个读它的输出口。', en: 'The <b>This cell</b> panel under the view lists facts about the cell. Click one, and the “This cell” part gains an output that reads it.' },
    ],
    see: ['board', 'testBoard', 'models'],
  },
  {
    id: 'board', group: 'play', title: { zh: '电路板', en: 'Circuit board' }, at: 'copy',
    body: [
      { zh: '<b>电路板</b>写的是一格的规则：只写一次，机器人在每一格上都照着它算。「视野」和「本格信息」两个元件是它的输入，红框的「本格」是它的输出，中间放元件。', en: 'A <b>circuit board</b> is the rule for one cell: you write it once, and the robot follows it on every cell. The “View” and “This cell” parts are its inputs, the red-framed “this cell” is its output, and components go in between.' },
      { zh: '线总是从一个<b>输出圆点</b>接到一个<b>输入圆点</b>：从圆点拖过去，或者先点一个圆点、再点另一个。一个输入口只接一根线，新接的会替换旧的；一个输出可以接给好几个口。', en: 'A wire always runs from an <b>output dot</b> to an <b>input dot</b>: drag from one dot to the other, or click one dot and then the other. An input takes one wire, so a new one replaces the old; an output can feed several inputs.' },
      { zh: '接不上的线会被拒绝，并告诉你原因，比如信号对不上，或者线会绕成一个圈。在电脑上，点选一个元件或一根线，按 Delete 就能删掉；拖动空白处可以挪动电路板。', en: 'A wire that cannot go in is refused, with the reason: the signals do not match, say, or the wire would make a loop. On a computer, click a part or a wire to select it and press Delete to remove it; drag the empty background to move the board around.' },
      { zh: '在手机上，电路板有一个接线显示按钮，可以在「全部接线」「隐藏输入接线」「隐藏接线」之间切换，线多的时候看得清楚些。', en: 'On a phone, the board has a wire display button that switches between “All wires”, “No input wires” and “No wires”, so a busy board is easier to read.' },
    ],
    see: ['component', 'robot', 'part'],
  },
  {
    id: 'testBoard', group: 'play', title: { zh: '测试棋盘', en: 'Test board' }, at: 'copy',
    body: [
      { zh: '运行之前，<b>测试棋盘</b>是一块试验田：点一个格子可以填一个数，或者让机器人站过去，红框里马上显示电路板在那一格的答案。电脑上也可以直接敲数字，回车确认，Esc 收起数字键盘。', en: 'Before a run, the <b>test board</b> is a place to try things out: click a cell to type a number into it, or to send the robot there, and the red frame shows the circuit board’s answer for that cell straight away. On a computer you can type the digits, press Enter to confirm and Esc to put the keypad away.' },
      { zh: '点<b>运行测试</b>，棋盘会清空，机器人从头按扫描顺序走一遍，测试一个接一个地跑。没通过时，机器人停在出错的格子上：视野和电路板上的数，就是它在那一格看到和算出的。', en: 'Click <b>Run tests</b> and the board is cleared; the robot starts again and walks it in the scan order, one test after another. If a test fails, the robot stops on the cell that went wrong: the numbers in the view and on the circuit board are what it saw and worked out there.' },
      { zh: '跑完以后，点棋盘上算过的格子，可以查看机器在那一格算出的值，再点一次取消；点「回到棋盘测试」就回到试验田。有的关只看答案那一格，有的关会检查整张表，「怎么玩」里会写明。', en: 'After a run, click any computed cell to see what the machine worked out there, and click again to leave it; “Back to the test board” takes you back to trying things out. Some levels only check the answer cell and some check the whole table; “How to play” says which.' },
    ],
    see: ['robot', 'board', 'dial'],
  },
  {
    id: 'component', group: 'play', title: { zh: '元件', en: 'Components' }, at: 'confluence',
    body: [
      { zh: '<b>元件</b>是电路板上的小机器：从输入圆点收信号，从输出圆点送出结果。在电脑上，点「元件」窗里的一项就放上电路板；在手机上，点托盘里的一项，或按住拖到空格上，拖回托盘就拿掉了。点放好的元件，可以改它的设置。', en: '<b>Components</b> are little machines on the circuit board: they take signals at their input dots and send a result from their output dot. On a computer, click one in the Parts window to put it on the board; on a phone, tap one in the tray or hold and drag it onto a slot, and drag it back to the tray to remove it. Click a placed component to change its settings.' },
      { zh: '信号可以是一个数，也可以是「—」，意思是「这里没有路」或「什么也没有」。没接线的输入口，读到的是「—」。', en: 'A signal can be a number, or “—”, which means “there is no road here”, or simply nothing. An input with no wire reads “—”.' },
      { zh: '<part-ref to="part:msum"></part-ref>把接进来的几个数加起来；它会跳过「—」，全是「—」时才输出「—」。', en: 'A <part-ref to="part:msum"></part-ref> adds up the numbers wired into it; it skips “—”, and only outputs “—” when every input is “—”.' },
    ],
    see: ['board', 'part', 'countOpt'],
  },
  {
    id: 'part', group: 'play', title: { zh: '零件与元件箱', en: 'Parts and the components box' }, at: 'stamp',
    body: [
      { zh: '有的关通过以后，你拼好的电路板会变成一个<b>零件</b>：托盘里多了一个新元件，放上去、接好线就能用，里面不用再拼一遍。', en: 'After some levels, the circuit board you built becomes a <b>part</b>: a new component in the tray. Put it on the board and wire it up, and it works without being built again.' },
      { zh: '零件口上的名字，只是它当初的用法。零件只认结构，不认名字：你把什么接给它，它就算什么。', en: 'The names on a part’s inputs only say how it was first used. A part cares about structure, not names: whatever you wire into it is what it works on.' },
      { zh: '地图上的<b>元件箱</b>收着你一路拿到的零件。', en: 'Your <b>Parts</b>, on the map, keep every part you have collected along the way.' },
    ],
    see: ['component', 'board', 'stairs'],
  },
  {
    id: 'models', group: 'play', title: { zh: '机器人型号', en: 'Robot models' }, at: 'stairs',
    body: [
      { zh: '每一关用哪个型号的机器人，是关卡定的。第一次遇到新型号时，引入会先介绍它。', en: 'Each level decides which robot model it uses. The first time a new model turns up, the Intro introduces it.' },
      { zh: '型号之间最大的不同是<b>视野</b>。「小方」看得见身边一圈，3×3；「远望」看得见两圈，5×5。电路板只能读视野里的格子，所以要读得更远，就得换型号。', en: 'The biggest difference between models is their <b>vision</b>. Boxy sees the ring of cells around it, 3×3; Farsight sees two rings, 5×5. A circuit board can only read cells in view, so reading further takes a different model.' },
    ],
    see: ['robot', 'arms'],
  },
  {
    id: 'arms', group: 'play', title: { zh: '伸缩臂', en: 'Telescopic arm' }, at: 'frog',
    body: [
      { zh: '「长臂」有一条<b>伸缩臂</b>：它伸多远，由这一格的数据决定，比如往左伸出「这件物品的重量」那么多格，读到视野外面的格子。', en: 'Longarm has a <b>telescopic arm</b>: how far it reaches depends on the cell’s own data, such as reaching left by as many cells as “this item’s weight”, so it can read cells outside its view.' },
      { zh: '视野下面有伸缩臂一栏，它够得着的格子都在那里；点一格，「视野」元件上就多一个读它的输出口。', en: 'Under the view is the arm’s own row, showing the cells it can reach; click one, and the “View” part gains an output that reads it.' },
    ],
    see: ['models', 'sweep'],
  },
  {
    id: 'dirs', group: 'play', title: { zh: '改写方向', en: 'Rewrite direction' }, at: 'roll',
    body: [
      { zh: '只留一行、原地改写的关里，机器按一个<b>改写方向</b>改写这一行：每件最多拿一次时从右往左，每件可以拿很多次时从左往右。', en: 'In levels that keep a single row and rewrite it in place, the machine rewrites that row in one <b>rewrite direction</b>: right to left when each item can be taken at most once, left to right when each can be taken many times.' },
      { zh: '运行时，黄色是正在改写的格子；红色表示这一格读到了这一轮刚改过的值。方向不同，读到的就是旧值还是新值：含义也就不同。', en: 'During a run, yellow marks the cell being rewritten, and red means a cell read a value that was rewritten earlier in the same pass. The direction decides whether a cell reads an old value or a new one, and so what the row means.' },
    ],
    see: ['rolling'],
  },
  {
    id: 'sweep', group: 'play', title: { zh: '扫描臂', en: 'Sweep arm' }, at: 'prefix',
    body: [
      { zh: '「扫帚」有一条<b>扫描臂</b>：一次扫过一整段格子，把整段的数一起送进电路板，段里有几格都行。', en: 'Broom has a <b>sweep arm</b>: it sweeps a whole run of cells in one go and feeds every number in the run into the circuit board, however many cells the run has.' },
      { zh: '一整段的线会画得更粗。汇合器、加法器和乘法器都能直接吃下一整段，段里的每个数都参与；闸门却不接一整段。', en: 'A wire carrying a whole segment is drawn thicker. Mergers, Adders and Multipliers take a whole segment directly, and every number in it takes part; gates do not take segments.' },
    ],
    see: ['arms', 'manyWays'],
  },
  {
    id: 'dial', group: 'play', title: { zh: '扫描顺序', en: 'Scan order' }, at: 'order',
    body: [
      { zh: '机器人按一定的<b>扫描顺序</b>走过表格：逐行从左上开始、逐行从右下开始……关卡的介绍里会讲它怎么走。', en: 'The robot walks the table in a <b>scan order</b>: row by row from the top left, row by row from the bottom right… Each level’s introduction tells you how it walks.' },
      { zh: '顺序要跟着电路走：<b>被读的格子，必须排在读它的格子前面</b>。电路读右边和下面，就得从右下开始。', en: 'The order has to follow the circuit: <b>a cell that is read must come before the cell that reads it</b>. A circuit that reads right and down has to start from the bottom right.' },
    ],
    see: ['topo', 'testBoard'],
  },
  {
    id: 'memory', group: 'play', title: { zh: '状态记住什么', en: 'What the state remembers' }, at: 'twokeys',
    body: [
      { zh: '有的关里，表叠成好几层：状态除了「在哪一格」，还记着别的事，比如手里有哪几把钥匙。每多记一件，层数就翻一倍。', en: 'In some levels the table is stacked in several layers: besides “which cell”, the state remembers other things too, such as which keys are in hand. Every extra thing remembered doubles the layers.' },
      { zh: '机器人「千层」在每一层的同一格上各算一次，所有的层共用同一块电路板；本格信息会告诉它这一层的情况。', en: 'Layercake works once on the same cell of every layer, and every layer shares the same circuit board; the This cell panel tells it how things stand on that layer.' },
      { zh: '记得太少，答案会错；记得太多，表会爆炸。好的状态<b>刚好够用</b>：只记会影响未来的事。', en: 'Remember too little and the answers go wrong; remember too much and the table explodes. A good state is <b>just enough</b>: it remembers only what affects the future.' },
    ],
    see: ['layers', 'stateSize'],
  },

  /* ---------- 基本概念 ---------- */
  {
    id: 'dag', group: 'basics', title: { zh: '依赖图', en: 'Dependency graph' }, at: 'lastStep',
    body: [
      { zh: '把每个格子看成一个小问题，把箭头看成「这个问题要用到那个答案」，就得到一张<b>依赖图</b>。箭头起点的格子，总要比终点的格子先算。', en: 'Think of each cell as a small question and each arrow as “this question needs that answer”, and you have a <b>dependency graph</b>. The cell an arrow starts from must always be worked out before the cell it ends at.' },
      { zh: '这张图不能有圈：A 等着 B，B 又等着 A，谁也算不出来。箭头有方向、又绕不成圈的图，叫<b>有向无环图</b>（DAG）。', en: 'The graph must have no loops: if A waits for B while B waits for A, neither can ever be worked out. A graph whose arrows have a direction and never loop round is called a <b>directed acyclic graph</b> (DAG).' },
      { zh: '一张表的背后，也是这样一张图：每一格是一个状态，箭头从它要读的格子指过来。游戏名里的「状态之图」，说的就是它。', en: 'Behind a table there is a graph like this too: each cell is a state, and arrows point into it from the cells it reads. That is the “state graph” in the game’s name.' },
    ],
    see: ['dp', 'topo', 'state'],
  },
  {
    id: 'dp', group: 'basics', title: { zh: '动态规划', en: 'Dynamic programming' }, at: 'lastStep',
    body: [
      { zh: '<b>动态规划</b>是一种解题办法：把大问题拆成小问题，先算小的，把答案记在表里，再用这些答案拼出大问题的答案。', en: '<b>Dynamic programming</b> is a way of solving problems: break a big problem into small ones, solve the small ones first and write their answers in a table, then build the big answer out of them.' },
      { zh: '这些小问题叫<b>子问题</b>。「到学校有几条路线」可以拆成「到学校的上一站各有几条路线」，它们又能再往下拆，一直拆到起点。', en: 'The small problems are called <b>subproblems</b>. “How many routes lead to school?” breaks down into “how many routes lead to each stop just before school?”, and those break down again, all the way back to the start.' },
      { zh: '名字听起来很玄，做起来其实就是填表：每一格只算一次，算好就记下来，后面的格子直接拿来用。', en: 'The name sounds grand, but the doing is just filling in a table: each cell is worked out once, written down, and simply looked up by the cells that come after it.' },
    ],
    see: ['recurrence', 'dag', 'overlap'],
  },
  {
    id: 'recurrence', group: 'basics', title: { zh: '状态转移（递推式）', en: 'Transition (recurrence)' }, at: 'copy',
    body: [
      { zh: '一格的答案怎么从别的格子算出来，这条规则叫<b>状态转移</b>；写成式子，就是<b>递推式</b>，比如「这个路口 = 上面 + 左边」。', en: 'The rule for working out a cell from other cells is called the <b>transition</b>; written as a formula it is a <b>recurrence</b>, such as “this crossing = up + left”.' },
      { zh: '找规则的老办法是<b>只看最后一步</b>：到这里之前，最后一步可能从哪里来？每种可能对应一格已经算好的答案，把它们合起来就行。', en: 'The trusty way to find the rule is to <b>look only at the last step</b>: just before arriving here, where could the last step have come from? Each possibility matches a cell that has already been worked out, and you combine them.' },
      { zh: '在游戏里，电路板就是状态转移：只写一次，机器人在每一格上都照着它算。', en: 'In the game, the circuit board is the transition: written once, and followed by the robot on every cell.' },
    ],
    see: ['base', 'dp', 'board'],
  },
  {
    id: 'base', group: 'basics', title: { zh: '边界与起点', en: 'Base cases' }, at: 'stamp',
    body: [
      { zh: '规则总要从某处开始。像起点这样不用再拆的小问题，答案是直接定下的，叫<b>边界条件</b>：比如站在起点，算 1 条路线。', en: 'A rule has to start somewhere. Small problems that need no further breaking down, like the start, have answers that are simply given; these are the <b>base cases</b>. Standing at the start, for instance, counts as 1 route.' },
      { zh: '表的边上，有的来路落在表外，那里没有路，用「—」表示。规则要能对付这些「—」，边上的格子才不会算错。', en: 'Along the edges of the table, some ways in fall outside it; there is no road there, and that shows as “—”. The rule has to cope with these “—”s, or the edge cells come out wrong.' },
      { zh: '边界一错，后面的每一格都会跟着错。没通过的时候，先看看起点和边上的格子。', en: 'Get a base case wrong and every cell after it goes wrong too. When a test fails, look at the start and the edge cells first.' },
    ],
    see: ['recurrence', 'component'],
  },
  {
    id: 'countOpt', group: 'basics', title: { zh: '计数与求最优', en: 'Counting and optimising' }, at: 'cheapest',
    body: [
      { zh: '同一副骨架能回答不同的问题。问<b>有几种</b>，就把所有来路加起来；问<b>最好是多少</b>，就在来路里挑最好的一个，再算上这一格自己的代价。', en: 'The same skeleton answers different questions. To ask <b>how many</b>, add up all the ways in; to ask <b>what is best</b>, pick the best of the ways in, then count in this cell’s own cost.' },
      { zh: '在电路板上，这往往只差一个汇合器的操作：「加起来」数个数，「取较小」找最少，「取较大」找最多。', en: 'On the circuit board, the difference is often just the Merger’s operation: “sum” counts, “min” finds the fewest, “max” finds the most.' },
      { zh: '求最优之所以能这样拆，是因为最好的路线上，每一段也都是到那一段终点最好的走法。这叫<b>最优子结构</b>。', en: 'Optimising can be broken down like this because every stretch of a best route is itself the best way to reach the end of that stretch. This is called <b>optimal substructure</b>.' },
    ],
    see: ['backtrack', 'recurrence'],
  },
  {
    id: 'backtrack', group: 'basics', title: { zh: '回溯', en: 'Backtracking' }, at: 'seam',
    body: [
      { zh: '表告诉你最好的结果是多少，却没直接说该怎么走。不过每一格的数，都是从某一条来路算出来的：<b>表里也存下了每一步的选择</b>。', en: 'The table tells you what the best result is, but not straight out how to get it. Yet every cell’s number came from one of its ways in: <b>the table has also kept every choice</b>.' },
      { zh: '从终点出发，问「这一格的数是从哪条来路来的」，退到那一格，再问同样的问题，一直退回起点，就还原出了整条路线。这个倒推的过程叫<b>回溯</b>。', en: 'Start at the end and ask “which way in did this cell’s number come from?”, step back to that cell, and ask again, all the way back to the start: you have recovered the whole route. Working backwards like this is called <b>backtracking</b>.' },
    ],
    see: ['countOpt', 'viterbi', 'seam'],
  },
  {
    id: 'overlap', group: 'basics', title: { zh: '重叠子问题', en: 'Overlapping subproblems' }, at: 'robber',
    body: [
      { zh: '直接「问路」：想知道第 n 级台阶有几种走法，就去问第 n − 1 级和第 n − 2 级，它们再往下问……同一个小问题会被问上一遍又一遍。这叫<b>重叠子问题</b>。', en: 'Ask your way down: to know how many ways lead to step n, ask step n − 1 and step n − 2, which ask further down in turn… and the same small question gets asked again and again. These are <b>overlapping subproblems</b>.' },
      { zh: '办法很简单：算过的答案<b>记下来</b>，下次直接拿，不再重算。填表时每一格只算一次，就是这个道理。', en: 'The fix is simple: <b>write down</b> every answer you work out, and next time just look it up instead of working it out again. That is why filling the table computes each cell only once.' },
    ],
    see: ['speed', 'memo', 'dp'],
  },
  {
    id: 'speed', group: 'basics', title: { zh: '指数与多项式', en: 'Exponential and polynomial' }, at: 'robber',
    body: [
      { zh: '问路法里，台阶每多一级，提问次数就要乘上一个固定的倍数。这种越滚越大的增长叫<b>指数增长</b>：台阶稍微多一些，就再也问不完了。', en: 'With the asking method, every extra step multiplies the number of questions by a fixed factor. Growth that snowballs like this is <b>exponential</b>: add a few more steps and the asking never finishes.' },
      { zh: '填表法的计算次数，大约就是表的格子数：台阶多一级，只多算一格。随问题规模按 n、n² 这样增长的，叫<b>多项式</b>时间。', en: 'Filling the table takes about as many computations as the table has cells: one more step is just one more cell. Growth like n or n² as the problem gets bigger is called <b>polynomial</b> time.' },
      { zh: '动态规划快，不是因为哪一步算得巧，而是因为<b>不重复</b>：指数多的路线，被压进了多项式多的格子里。', en: 'Dynamic programming is fast not because any one step is clever, but because <b>nothing is repeated</b>: an exponential number of routes is squeezed into a polynomial number of cells.' },
    ],
    see: ['overlap', 'stateSize'],
  },
  {
    id: 'state', group: 'basics', title: { zh: '状态', en: 'State' }, at: 'robber',
    body: [
      { zh: '表里一格代表的那种情况，叫一个<b>状态</b>，比如「站在这个路口」或「看完了前几家」。格子里的数，就是这个状态的答案。', en: 'The situation a cell of the table stands for is called a <b>state</b>, such as “standing at this crossing” or “having seen the first few houses”. The number in the cell is that state’s answer.' },
      { zh: '好的状态，要记住<b>所有会影响未来的信息</b>。如果两段不同的经历落进了同一格，往后能做的事却不一样，这一格就记不准了。', en: 'A good state remembers <b>everything that affects the future</b>. If two different histories land in the same cell but can go on to do different things, that cell cannot keep an accurate answer.' },
      { zh: '设计状态，是动态规划里最难、也最要紧的一步：先想清楚每一格记着什么，规则才写得出来。', en: 'Designing the state is the hardest and most important step in dynamic programming: only once you know what each cell holds can you write its rule.' },
    ],
    see: ['layers', 'counterexample', 'dag'],
  },
  {
    id: 'layers', group: 'basics', title: { zh: '分层（扩展状态）', en: 'Layers (extending the state)' }, at: 'robber',
    body: [
      { zh: '状态少记了一件事，就让它多记一件：把表复制成几层，每层代表一种情况。这叫给状态<b>加一维</b>。', en: 'If the state forgets something, make it remember one more thing: copy the table into several layers, one per situation. This is called <b>adding a dimension</b> to the state.' },
      { zh: '然后规定层与层之间怎么走。「几种情况，加上它们之间怎么切换」，这种结构叫<b>状态机</b>。', en: 'Then lay down how to move between layers. A set of situations plus the rules for switching between them is called a <b>state machine</b>.' },
    ],
    see: ['state', 'stateSize', 'memory'],
  },
  {
    id: 'counterexample', group: 'basics', title: { zh: '反例', en: 'Counterexample' }, at: 'breach',
    body: [
      { zh: '想证明一种状态设计不够用，只要找到一个<b>反例</b>：两段历史落进了同一个状态，未来却不一样。', en: 'To prove a state design falls short, you only need one <b>counterexample</b>: two histories that land in the same state but have different futures.' },
      { zh: '反例不光能说明哪里错了，还指出了该怎么修：两段历史差在哪件事上，状态就该多记那件事。', en: 'A counterexample does more than show something is wrong; it points to the fix: whatever the two histories differ in is what the state should also remember.' },
    ],
    see: ['state', 'layers'],
  },
  {
    id: 'stateSize', group: 'basics', title: { zh: '状态数与状态爆炸', en: 'Counting states, and state explosion' }, at: 'twokeys',
    body: [
      { zh: '表有多少格，机器就要算多少次。状态的每一维大小相乘，就是格子数：比如两个词，一个几个字、一个几个字，对齐表的格子数就大约是两个长度相乘。', en: 'The machine computes once per cell, however many cells the table has. Multiply the sizes of the state’s dimensions and you get the number of cells: two words, for instance, give an alignment table of roughly one length times the other cells.' },
      { zh: '每多记一件「是 / 否」的事，层数就翻一倍：记 k 件，就有 2 的 k 次方层。记得越多越保险，表却越来越大，这叫<b>状态爆炸</b>。', en: 'Each extra yes-or-no thing remembered doubles the layers: remember k things and there are 2 to the power k layers. Remembering more feels safer, but the table keeps growing; this is called <b>state explosion</b>.' },
      { zh: '所以好的状态要<b>刚好够用</b>：会影响未来的事一件不漏，不影响的一件也不多记。', en: 'So a good state is <b>just enough</b>: it leaves out nothing that affects the future, and remembers nothing that does not.' },
    ],
    see: ['layers', 'memory', 'speed'],
  },
  {
    id: 'recognise', group: 'basics', title: { zh: '认出动态规划', en: 'Recognising dynamic programming' }, at: 'ice',
    body: [
      { zh: '真实的问题不会写着<wiki-ref to="dp"></wiki-ref>。遇到一个新问题，可以先问三句：<b>最后一步有几种可能？小问题的答案能不能拼出大问题？状态要记住什么？</b>', en: 'Real problems never say <wiki-ref to="dp"></wiki-ref> on them. Faced with a new one, start with three questions: <b>how many possibilities are there for the last step? Can the answers to small problems build the big one? What must the state remember?</b>' },
      { zh: '也有的问题根本用不着它：如果没有可以拆开、再拼回去的小问题，简单地从头看到尾就够了。', en: 'Some problems do not need it at all: if there are no smaller problems to break off and build back up, simply looking through from start to finish is enough.' },
    ],
    see: ['dp', 'state', 'recurrence'],
  },

  /* ---------- 计算顺序 ---------- */
  {
    id: 'topo', group: 'order', title: { zh: '计算顺序与拓扑序', en: 'Computing order and topological order' }, at: 'order',
    body: [
      { zh: '机器按某个<b>计算顺序</b>一格一格地算。一格要读的格子必须先算好，所以合法的顺序只有一条要求：<b>每一格都排在它要读的格子之后</b>。满足这个要求的顺序，叫<b>拓扑序</b>。', en: 'The machine works through the cells in some <b>computing order</b>. The cells a cell reads must be ready first, so a legal order has just one requirement: <b>every cell comes after the cells it reads</b>. An order that meets it is called a <b>topological order</b>.' },
      { zh: '顺序和电路是一对：电路决定每一格读谁，也就决定了哪些顺序合法；换一个顺序，电路能读的格子也跟着变。', en: 'The order and the circuit go together: the circuit decides which cells each cell reads, and so which orders are legal; change the order, and the cells the circuit can read change with it.' },
    ],
    see: ['dag', 'dial', 'topdown'],
  },
  {
    id: 'topdown', group: 'order', title: { zh: '自底向上与自顶向下', en: 'Bottom-up and top-down' }, at: 'city',
    body: [
      { zh: '先排好顺序，从小问题一格一格填到大问题，叫<b>自底向上</b>。到这里为止的表，都是这么填的。', en: 'Settling an order first and filling in cell by cell, from small problems up to the big one, is called <b>bottom-up</b>. Every table up to this point was filled in that way.' },
      { zh: '反过来，从要问的那个大问题出发，需要谁就去问谁，叫<b>自顶向下</b>，写成程序就是<b>递归</b>。它不用事先排顺序；可如果不记下问过的答案，同一个问题会被问上很多遍。', en: 'The other way round, starting from the big question and asking whichever cells it needs, is called <b>top-down</b>; in a program it is <b>recursion</b>. It needs no order worked out in advance, but unless the answers are written down, the same question gets asked many times.' },
    ],
    see: ['memo', 'overlap', 'topo'],
  },
  {
    id: 'memo', group: 'order', title: { zh: '记忆化（备忘递归）', en: 'Memoisation' }, at: 'city',
    body: [
      { zh: '自顶向下地问，再把每个问出的答案<b>记下来</b>，下次被问到时直接拿：这叫<b>记忆化</b>，也叫备忘递归。这样，每一格只真正算一次。', en: 'Ask top-down, but <b>write down</b> every answer you get and look it up the next time it is asked: this is called <b>memoisation</b>, or memoised recursion. That way each cell is really worked out only once.' },
      { zh: '自底向上和备忘递归，走的是同一张依赖图，只是走法不同：一个先排好顺序再填，一个边问边算。', en: 'Bottom-up filling and memoised recursion walk the same dependency graph, just in different ways: one settles the order and then fills in, the other works things out as it asks.' },
    ],
    see: ['topdown', 'overlap', 'dag'],
  },
  {
    id: 'fixedPoint', group: 'order', title: { zh: '扫到不再变', en: 'Scanning until it settles' }, at: 'loop',
    body: [
      { zh: '箭头绕成圈的时候，没有哪个顺序能保证「读到的都已经算好」。办法是<b>一轮一轮地扫</b>：还没算到的格子先读「—」或上一轮留下的值，每扫一轮，答案就离真相近一步。运行时，黄框标出这一轮里变了的格子。', en: 'When the arrows loop round, no order can promise that everything read is already computed. The answer is to <b>scan in rounds</b>: cells not reached yet read “—” or what the last round left, and every round brings the answers a step closer to the truth. During a run, yellow frames mark the cells that changed this round.' },
      { zh: '哪一轮一格都没变，就停下来：这时每一格都已满足自己的规则，叫<b>不动点</b>；这样反复算到不再变，叫<b>迭代到收敛</b>。如果规则让数越算越大、永远停不下来，机器会告诉你表一直不稳定。', en: 'When a round changes nothing, it stops: every cell now satisfies its own rule, which is called a <b>fixed point</b>, and repeating until nothing changes is called <b>iterating to convergence</b>. If the rule keeps making the numbers bigger and never settles, the machine tells you the table never settles.' },
      { zh: '求最短路时这样一轮一轮地改进答案，叫 <b>Bellman-Ford 算法</b>。网络里的路由器互相交换「到各处有多远」，用的就是这种办法。', en: 'Improving shortest-route answers round after round like this is the <b>Bellman-Ford algorithm</b>. Routers on a network swapping notes on “how far it is to everywhere” work the same way.' },
    ],
    see: ['topo', 'valueIter'],
  },

  /* ---------- 经典问题 ---------- */
  {
    id: 'stairs', group: 'classic', title: { zh: '爬楼梯', en: 'Climbing stairs' }, at: 'stairs',
    body: [
      { zh: '每次迈 1 级或 2 级，爬到第 n 级有几种走法？这是动态规划最常见的入门题。', en: 'Climbing 1 or 2 steps at a time, how many ways are there to reach step n? It is the most common first problem in dynamic programming.' },
      { zh: '它表面上和数路线毫无关系。可只看最后一步，就会认出熟悉的结构：每一格的答案，来自几个更早的格子，再加上一个起点。认出相同的结构，旧零件就能直接拿来用。', en: 'On the surface it has nothing to do with counting routes. But look only at the last step and a familiar structure appears: each cell’s answer comes from a few earlier cells, plus a start. Spot the same structure and an old part can be used as it is.' },
    ],
    see: ['recurrence', 'part'],
  },
  {
    id: 'lcs', group: 'classic', title: { zh: '最长公共子序列', en: 'Longest common subsequence' }, at: 'link',
    body: [
      { zh: '两串字里，<b>按顺序</b>都出现过的一串字，叫它们的<b>公共子序列</b>，中间可以跳过一些字。最长的那一串，就是<b>最长公共子序列</b>。', en: 'A string of letters that appears <b>in order</b> in both of two strings, with letters skipped in between allowed, is a <b>common subsequence</b>. The longest one is the <b>longest common subsequence</b>.' },
      { zh: '比较两份文件改了哪里、比对两段 DNA 有多像、判断两份作业是不是抄的，用的都是它。', en: 'Finding what changed between two files, comparing how alike two stretches of DNA are, telling whether one piece of homework was copied from another: they all use it.' },
    ],
    see: ['edit', 'local', 'stateSize'],
  },
  {
    id: 'edit', group: 'classic', title: { zh: '编辑距离', en: 'Edit distance' }, at: 'edit',
    body: [
      { zh: '把一个词改成另一个词，每一步只能删掉、插入或替换一个字，最少要几步？这个步数叫<b>编辑距离</b>。', en: 'Changing one word into another, deleting, inserting or replacing one letter per step, what is the fewest number of steps? That number is the <b>edit distance</b>.' },
      { zh: '它也用对齐表。每一格的几条来路各对应一种改法，每条来路带着自己的<b>代价</b>，在里面挑最省的那条。同一张表，换一块电路板，就回答了另一个问题。', en: 'It uses the alignment table too. Each of a cell’s ways in stands for one kind of change, and each carries its own <b>cost</b>; pick the cheapest. The same table with a different circuit board answers a different question.' },
      { zh: '输入法纠错、搜索框里的「你是不是要找」，都是拿你打出的词和候选词一一算编辑距离，挑最近的那个。', en: 'Spelling correction and the search box’s “did you mean…?” both work out the edit distance from what you typed to each candidate word and pick the closest.' },
    ],
    see: ['lcs', 'countOpt', 'local'],
  },
  {
    id: 'greedy', group: 'classic', title: { zh: '贪心', en: 'Greedy' }, at: 'pack',
    body: [
      { zh: '每一步都挑眼前看起来最好的，叫<b>贪心</b>，比如装背包时「最贵的先放」或「最划算的先放」。', en: 'Picking whatever looks best right now at every step is called <b>greedy</b>, like packing a backpack “most valuable first” or “best value per kilo first”.' },
      { zh: '贪心又快又简单，却不一定得到最好的结果：眼前最好的一步，可能挡住了后面更好的组合。动态规划在表里把每种可能都比过，才不会漏掉。', en: 'Greedy is quick and simple, but it does not always give the best result: the step that looks best now can block a better combination later. Dynamic programming compares every possibility in its table, so nothing is missed.' },
    ],
    see: ['knap01', 'recognise'],
  },
  {
    id: 'knap01', group: 'classic', title: { zh: '0/1 背包', en: '0/1 knapsack' }, at: 'knaptable',
    body: [
      { zh: '背包有容量上限，每件物品有重量和价值，<b>每件最多拿一次</b>，怎么装价值最大？这叫 <b>0/1 背包</b>：每件物品不是 0 个，就是 1 个。', en: 'A backpack has a weight limit, every item has a weight and a value, and <b>each item can be taken at most once</b>: how do you pack the most value? This is the <b>0/1 knapsack</b>: each item is taken 0 times or 1 time.' },
      { zh: '背包表的行是物品，列是容量：格子记着「只从前几件里挑、容量是多少时，最多能装多少价值」。只看最后一件，它只有两种命运：拿，或者不拿。', en: 'In the knapsack table the rows are items and the columns are capacities: a cell holds “the most value you can pack choosing only from the first few items, with this much room”. Look only at the last item, and it has just two fates: taken, or left.' },
      { zh: '选课、做预算、装货柜、给服务器分配任务，背后都是它。', en: 'Choosing courses, setting a budget, loading a container, handing out jobs to servers: it is behind all of them.' },
    ],
    see: ['greedy', 'rolling', 'arms'],
  },
  {
    id: 'rolling', group: 'classic', title: { zh: '滚动数组与完全背包', en: 'Rolling arrays and the unbounded knapsack' }, at: 'roll',
    body: [
      { zh: '如果每一行只用到上一行，就不必留着整张表：只留一行，原地改写。这叫<part-ref to="roll"></part-ref>，能把几千行的表压成一行。', en: 'If each row only uses the row above it, there is no need to keep the whole table: keep a single row and rewrite it in place. This is a <part-ref to="roll"></part-ref>, and it can squash a table of thousands of rows into one.' },
      { zh: '原地改写有个风险：改一格时要读的那一格，可能这一轮已经改过了，读到的就是「已经拿过这件物品」的值。<b>改写的方向</b>决定了读到的是旧值还是新值。', en: 'Rewriting in place has a catch: the cell you read while rewriting another may already have been rewritten in this pass, and then it holds a value where this item has already been taken. <b>The direction you rewrite in</b> decides whether you read the old value or the new one.' },
      { zh: '每种物品可以拿很多次的背包，叫<b>完全背包</b>。同一块电路板，只换一个改写方向，就能在两种背包之间切换。', en: 'A backpack where each item can be taken many times is the <b>unbounded knapsack</b>. The same circuit board, with only the rewrite direction changed, switches between the two kinds.' },
    ],
    see: ['knap01', 'dirs'],
  },
  {
    id: 'games', group: 'classic', title: { zh: '必胜态与必败态', en: 'Winning and losing positions' }, at: 'nim',
    body: [
      { zh: '格子里不一定要存数，也可以存「是 / 否」，回答「能不能」一类的问题。两个人轮流走的游戏也能这样填表：每一格是一个局面，记着「轮到的人能不能赢」。', en: 'A cell need not hold a number; it can hold “yes / no” and answer “can it be done?” questions. Games where two players take turns fill a table this way too: each cell is a position, holding “can the player whose turn it is win?”.' },
      { zh: '你走完一步，就轮到对手面对新的局面。所以一个局面的输赢，取决于你能把对手送进什么样的局面。轮到谁谁就能赢的局面叫<b>必胜态</b>，怎么走都会输的叫<b>必败态</b>。', en: 'Once you move, your opponent faces the new position. So whether a position wins depends on which positions you can send your opponent into. A position the player to move can always win is a <b>winning position</b>; one where every move loses is a <b>losing position</b>.' },
    ],
    see: ['countOpt', 'state'],
  },
  {
    id: 'manyWays', group: 'classic', title: { zh: '不定长的来路', en: 'Ways in of any number' }, at: 'prefix',
    body: [
      { zh: '有的表，一格的来路是固定的几格；可有的问题，来路是<b>前面一整段</b>，有几格还要看数据。', en: 'In some tables a cell has a fixed few ways in; in other problems the ways in are <b>a whole run of earlier cells</b>, and how many depends on the data.' },
      { zh: '最简单的例子是<b>前缀和</b>：从头到这里一共有多少。', en: 'The simplest example is the <b>prefix sum</b>: how much there is in all from the start up to here.' },
      { zh: '只要来路都在前面、都已经算好，来路再多、再不固定，表也照样能填。', en: 'As long as the ways in are all earlier and already computed, the table can be filled however many there are and however they vary.' },
    ],
    see: ['sweep', 'lis', 'coin', 'wordBreak'],
  },
  {
    id: 'lis', group: 'classic', title: { zh: '最长上升子序列', en: 'Longest increasing subsequence' }, at: 'rising',
    body: [
      { zh: '从一排数里从左往右挑出几个，要<b>一个比一个大</b>，中间可以跳过，最多能挑几个？这叫<b>最长上升子序列</b>。', en: 'From a row of numbers, pick some from left to right, <b>each bigger than the last</b>, skipping any you like: how many can you pick? This is the <b>longest increasing subsequence</b>.' },
      { zh: '关键在状态：每一格记「以这一个结尾」的答案，整排的答案就是所有格子里最大的那个。一串股价里最多有几天一天比一天高，用的就是它。', en: 'The key is the state: each cell holds the answer “ending with this one”, and the answer for the whole row is the largest of them. How many days in a run of share prices can be picked, each higher than the one before, is the same problem.' },
    ],
    see: ['manyWays', 'state'],
  },
  {
    id: 'coin', group: 'classic', title: { zh: '凑零钱', en: 'Making change' }, at: 'change',
    body: [
      { zh: '用几种面值的硬币凑出一个金额，最少要几枚？又有几种付法？格子 i 记着凑出 i 元的答案。', en: 'Making up an amount from coins of a few values, what is the fewest number of coins? And how many ways are there to pay? Cell i holds the answer for i.' },
      { zh: '只看最后一枚硬币：它可能是任何一种面值，所以来路是「每种硬币各退一枚」。同一张表，能回答「最少几枚」和「几种付法」两个问题。', en: 'Look only at the last coin: it could be any of the values, so the ways in are “one coin of each kind taken back”. The same table answers both “the fewest coins” and “how many ways to pay”.' },
      { zh: '这张表只记「凑到了多少」，不记用过哪些硬币，所以数出的付法会把付硬币的先后也算进去。', en: 'The table only records how much has been made up, not which coins were used, so the ways it counts treat a different order of paying as a different way.' },
    ],
    see: ['manyWays', 'countOpt', 'knap01'],
  },
  {
    id: 'wordBreak', group: 'classic', title: { zh: '切词', en: 'Word break' }, at: 'wordbreak',
    body: [
      { zh: '一串没有空格的字母，能不能切成词典里的词？格子 i 记着「前 i 个字母能不能切开」，里面存「是 / 否」。', en: 'Can a string of letters with no spaces be split into words from a dictionary? Cell i holds “can the first i letters be split?”, as a “yes / no”.' },
      { zh: '只看最后一个词：它从前面某个位置开始，到这里结束。搜索引擎遇到没有空格的网址、输入法遇到一长串拼音，都要先这样切词。', en: 'Look only at the last word: it starts at some earlier position and ends here. A search engine facing a web address with no spaces, or a keyboard app facing a long run of pinyin, has to split it like this first.' },
    ],
    see: ['manyWays', 'games'],
  },
  {
    id: 'interval', group: 'classic', title: { zh: '区间动态规划', en: 'Interval DP' }, at: 'palin',
    body: [
      { zh: '有的问题，子问题是原来那一串里的<b>一段</b>：从第 i 个到第 j 个。把这些段排成一张<b>区间表</b>，格子 (i, j) 记着这一段的答案，只用到一半，因为一段的开头总在结尾前面。', en: 'In some problems the subproblems are <b>stretches</b> of the original string: from item i to item j. Lay them out as an <b>interval table</b>, where cell (i, j) holds that stretch’s answer; only half the table is used, since a stretch always starts before it ends.' },
      { zh: '每一段都靠<b>更短的段</b>算出来：去掉一端，或者去掉两端。所以只要短的段先算好，表就能填。', en: 'Every stretch is worked out from <b>shorter stretches</b>: drop one end, or drop both. So as long as shorter stretches are done first, the table can be filled.' },
      { zh: '最长回文子序列、矩阵连乘的最佳顺序，都是区间表。', en: 'The longest palindromic subsequence and the best order to multiply a chain of matrices: they are both interval tables.' },
    ],
    see: ['topo', 'parse'],
  },

  /* ---------- 更远的地方 ---------- */
  {
    id: 'valueIter', group: 'further', title: { zh: '价值迭代', en: 'Value iteration' }, at: 'value',
    body: [
      { zh: '在一张有奖励、有惩罚的地图上，问「站在每一格有多好」。一格的价值，取决于从这里能走到的邻居有多好，每远一步，再<b>打个折</b>。', en: 'On a map with rewards and penalties, ask “how good is it to stand on each cell?”. A cell’s value depends on how good the neighbours it can reach are, with a <b>discount</b> for every step further away.' },
      { zh: '「价值 = 下一步能到的最好结果，打个折」这样的规则，叫<b>贝尔曼方程</b>。从全是 0 开始，一轮一轮地扫到不再变，就得到每一格的价值，这叫<b>价值迭代</b>。', en: 'A rule like “value = the best result one step away, discounted” is called the <b>Bellman equation</b>. Start with every cell at 0 and scan round after round until nothing changes, and you have every cell’s value: this is <b>value iteration</b>.' },
      { zh: '它是<b>强化学习</b>最早的基石之一：下棋的程序、学走路的机器人，都要先学会估计「站在这里有多好」。', en: 'It is one of the oldest foundations of <b>reinforcement learning</b>: game-playing programs and robots learning to walk all have to learn to judge “how good is it to be here?”.' },
    ],
    see: ['fixedPoint', 'policy', 'expectation'],
  },
  {
    id: 'policy', group: 'further', title: { zh: '策略', en: 'Policy' }, at: 'arrows',
    body: [
      { zh: '价值算好以后，怎么走就简单了：每一步都走向价值最大的邻居。每一格「到了这里该做什么」合在一起，叫一个<b>策略</b>。', en: 'Once the values are known, choosing a move is easy: always step to the neighbour with the highest value. Taken together, “what to do here” for every cell is called a <b>policy</b>.' },
      { zh: '每一格只看自己的邻居，拼起来却是一张完整的导航图。<b>先估价值，再顺着价值走</b>，策略就自己长出来了。', en: 'Each cell looks only at its own neighbours, yet together they make a complete map for finding the way. <b>Judge the values first, then follow them</b>, and the policy grows by itself.' },
    ],
    see: ['valueIter', 'expectation'],
  },
  {
    id: 'expectation', group: 'further', title: { zh: '期望与马尔可夫决策过程', en: 'Expectation and Markov decision processes' }, at: 'slip',
    body: [
      { zh: '结果不确定时，一个动作的价值，是它每种可能结果<b>按可能性加权</b>加起来，叫<part-ref to="expect"></part-ref>。比如 80% 到右边、20% 到下面，就是 0.8 × 右边 + 0.2 × 下面。', en: 'When the outcome is uncertain, an action’s value is the sum of its possible outcomes, each <b>weighted by how likely it is</b>; this is the <part-ref to="expect"></part-ref>. With an 80% chance of going right and 20% of going down, say, it is 0.8 × right + 0.2 × down.' },
      { zh: '每一步都带着不确定性做决定的问题，叫<b>马尔可夫决策过程</b>，它是强化学习的数学骨架。规则还是老一套：每个动作算期望，挑最好的，打折，扫到不再变。', en: 'Problems where every decision is made under uncertainty are called <b>Markov decision processes</b>, the mathematical skeleton of reinforcement learning. The rule is the familiar one: work out each action’s expectation, pick the best, discount it, and scan until it settles.' },
    ],
    see: ['valueIter', 'policy'],
  },
  {
    id: 'viterbi', group: 'further', title: { zh: '维特比算法', en: 'The Viterbi algorithm' }, at: 'tagging',
    body: [
      { zh: '一句话里每个词是什么词性？把词排成列，把词性排成行，每一格记着「前面的词都标好、这个词标成这种词性时，最省的解释要多少代价」。', en: 'Which part of speech is each word in a sentence? Put the words in columns and the parts of speech in rows; each cell holds “the cheapest explanation so far, with the earlier words tagged and this word tagged this way”.' },
      { zh: '每一列只看上一列。最后一列里最好的那一格，就是整句最好的标法，再回溯就能读出每个词的词性。这叫<b>维特比算法</b>。', en: 'Each column only looks at the one before it. The best cell in the last column is the best tagging of the whole sentence, and backtracking reads off each word’s tag. This is the <b>Viterbi algorithm</b>.' },
      { zh: '语音识别把声音变成字、输入法把拼音变成词，用的都是这种表：一列一个时刻，一行一种可能。', en: 'Speech recognition turning sound into words, and keyboard apps turning pinyin into characters, use tables like this: one column per moment, one row per possibility.' },
    ],
    see: ['forward', 'backtrack'],
  },
  {
    id: 'forward', group: 'further', title: { zh: '前向算法', en: 'The forward algorithm' }, at: 'forward',
    body: [
      { zh: '维特比只要最好的那一种解释。如果想把<b>所有</b>解释都算上，问这句话一共有多可能，就用<b>前向算法</b>。', en: 'Viterbi only wants the single best explanation. To count in <b>every</b> explanation and ask how likely the sentence is altogether, use the <b>forward algorithm</b>.' },
      { zh: '表的形状、每一格的来路都和维特比一样，只是换了几个元件：同一副骨架，又回答了另一个问题。', en: 'The shape of the table and every cell’s ways in are the same as in Viterbi; only a few components change. The same skeleton answers yet another question.' },
    ],
    see: ['viterbi', 'countOpt'],
  },
  {
    id: 'parse', group: 'further', title: { zh: '句法分析', en: 'Parsing' }, at: 'parse',
    body: [
      { zh: '同一串词，两两合并成短语的方式不同，意思就不同。把合并的过程画出来，就是一棵<b>句法树</b>。', en: 'The same string of words means different things depending on how it is merged, two at a time, into phrases. Draw the merging and you get a <b>parse tree</b>.' },
      { zh: '一串词有多少种合并方式，还是用区间表算：最后一次合并，在某个切分点把左右两段合起来。这串方式数叫<b>卡特兰数</b>，词一多就飞快地变大。', en: 'How many ways a string of words can be merged is worked out in an interval table again: the last merge joins a left part and a right part at some split point. These counts are the <b>Catalan numbers</b>, which shoot up as the words grow in number.' },
      { zh: '真正的句法分析叫 <b>CKY 算法</b>（也写作 CYK），它还要查语法规则：哪两段能合并、合成什么。表的形状一模一样。', en: 'Real parsing uses the <b>CKY algorithm</b> (also written CYK), which also checks grammar rules: which two parts can merge, and into what. The table has exactly the same shape.' },
    ],
    see: ['interval'],
  },
  {
    id: 'local', group: 'further', title: { zh: '局部对齐', en: 'Local alignment' }, at: 'localalign',
    body: [
      { zh: '两段长长的 DNA 整体并不像，中间却可能藏着一小段非常像的片段。从头比到尾的叫<b>整体对齐</b>（Needleman-Wunsch 算法），只找最像的一段的叫<b>局部对齐</b>（Smith-Waterman 算法）。', en: 'Two long stretches of DNA may not be alike overall, yet hide a short piece that is very alike. Comparing from end to end is <b>global alignment</b> (the Needleman-Wunsch algorithm); looking only for the most alike piece is <b>local alignment</b> (the Smith-Waterman algorithm).' },
      { zh: '局部对齐的关键一步：分数一旦低于 0，就截成 0，从这里重新开始。所以最像的一段可能在表里任何地方，答案是整张表里最大的那一格。', en: 'The key step in local alignment: once a score drops below 0 it is cut to 0, starting afresh from there. So the most alike piece can be anywhere in the table, and the answer is the largest cell in it.' },
      { zh: '生物学家在基因库里找相似的片段，用的就是它。', en: 'Biologists searching gene databases for similar pieces use exactly this.' },
    ],
    see: ['lcs', 'edit'],
  },
  {
    id: 'seam', group: 'further', title: { zh: '接缝裁剪', en: 'Seam carving' }, at: 'seam',
    body: [
      { zh: '想把一张图片变窄，又不想把里面的东西挤变形，可以找一条从顶到底、每行一个像素的<b>缝</b>，把它剪掉。', en: 'To make a picture narrower without squashing what is in it, find a <b>seam</b> running from top to bottom, one pixel per row, and cut it out.' },
      { zh: '每个像素有一个<b>能量</b>：和邻居差得越多，能量越高，比如字母的边缘。能量最小的缝，就是一条最省的路线，用的还是找最省路线那一套，只是走的方向换了。', en: 'Every pixel has an <b>energy</b>: the more it differs from its neighbours, the higher it is, as on the edges of letters. The seam with the least energy is a cheapest route, found the same way as any cheapest route, only heading in a different direction.' },
      { zh: '剪掉一条缝，重新算，再剪下一条：这叫<b>内容感知缩放</b>。修图软件把横幅照片改成竖屏时，用的就是它。', en: 'Cut one seam, work it out again, cut the next: this is <b>content-aware resizing</b>. Photo editors use it to turn a wide photo into a tall one.' },
    ],
    see: ['countOpt', 'backtrack'],
  },
];
