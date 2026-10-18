// Chapters 3–7: meet the robot, build the route counter step by step, reuse it in new worlds,
// change the scan order, switch to "take the smaller".

import { N, E, W, gridScene, treeScene, circuitFig } from '../svg.js';
import { circ, usesSensor, hasKind, isInput, partFn } from '../circuit/components.js';
import { windowFig } from './figs.js';
import { L12_COSTS } from './data.js';
import { T, tr } from '../i18n.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];

// Words used in the intro figures.
const UP = T('上面', 'up'), LEFT = T('左边', 'left'), UL = T('左上', 'up-left'), CELL = T('本格', 'this cell'), IS_START = T('是起点', 'is start');
const MERGER = T('汇合器', 'Merger'), SUM = T('加起来', 'sum'), MIN = T('取较小', 'min'), CONST = T('常数', 'Constant'), PASS = T('放行闸', 'Pass gate'), PASS_TAG = T('是 → 放行', 'yes → pass');


export const machines = [
  {
    id: 'copy', ch: 2, title: T('机器人传话', 'Robot relay'), short: T('点一格，接一根线', 'Click a cell, wire it in'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('从这一章起，计算交给一个<b>小机器人</b>。它会一格一格地走过整张表，在每一格上做同一件事。', 'From this chapter on, the computing is done by a <b>little robot</b>. It walks through the whole table cell by cell and does the same thing on every cell.') },
      { t: T('这一关只有一排格子，最左边那格已经写好了一个数。机器人从第 2 格出发往右走，<b>每到一格，就把左边那格的数抄过来</b>。', 'This level has a single row of cells, and the leftmost one already holds a number. The robot starts on cell 2 and walks right, and <b>on each cell it copies the number from the cell to its left</b>.'), fig: { ...gridScene(1, 5, { arrows: false, cell: (r, c) => (c < 2 ? { value: 7, cls: 'lit' } : c === 2 ? { value: '?', cls: 'hot' } : {}) }), robot: '0,2' } },
      { t: T('机器人怎么知道要抄左边？靠你接的电路板。输入栏里是机器人的<b>视野</b>：中间红框是它脚下的格子，结果就写在这里。电路板左边的<b>视野</b>卡片就是它：在视野里点「左边」那一格，卡片上就多一个输出口，把那一格的数送进电路板。', 'How does the robot know to copy from the left? From the circuit board you wire up. The inputs pane shows the robot’s <b>view</b>: the red frame in the middle is the cell it stands on, where the result is written. The <b>View</b> card on the left of the circuit board is that view: click the “left” cell, and the card gains an output that brings that cell’s number into the circuit.'), fig: windowFig({ left: 7, self: '?' }, ['left']) },
      { t: T('最后，从输入「左边」底部的圆点拖一根线，接到电路板最下面红框的「本格」。意思是：左边送来几，本格就写几。也可以先点一个圆点，再点另一个。', 'Finally, drag a wire from the dot under the “left” input to “this cell”, the red-framed output at the bottom of the board. It means: whatever comes from the left, write it in this cell. You can also click one dot and then the other.') },
    ],
    mission: { goal: T('让机器人把最左边格子里的数，一格一格抄到最右边：每一格都等于它左边那一格。', 'Have the robot copy the number in the leftmost cell, cell by cell, all the way to the right: every cell equals the cell to its left.'), how: T('在视野里点「左边」那一格，视野卡片上多出一个输出口，把它连到「本格」，然后点「运行测试」。', 'Click the “left” cell in the view: the View card gets an output for it. Wire that to “this cell”, then click “Run tests”.') },
    world: 'grid', facts: [], palette: [],
    guide: (c, lit) => (!lit.includes('left') ? tr('第 1 步：在视野里点「左边」那一格，「视野」卡片上就多一个输出口。', 'Step 1: click the “left” cell in the view, and the “View” card gains an output.') : !c.wires.length ? tr('第 2 步：从「视野」卡片右边的圆点拖一根线，接到「本格」。', 'Step 2: drag a wire from the dot on the “View” card’s right to “this cell”.') : tr('第 3 步：点「运行测试」，看机器人一格一格地抄过去。', 'Step 3: click “Run tests” and watch the robot copy its way along, cell by cell.')),
    tests: [{ R: 1, C: 5, given: { '0,0': 7 } }, { R: 1, C: 7, given: { '0,0': 3 } }],
    solution: circ([], ['tap:left>out:cell']),
    hints: [T('在视野里点「左边」，再把「视野」卡片上多出来的输出口连到「本格」。', 'Click “left” in the view, then wire the new output on the “View” card to “this cell”.')],
    diagnose: c => (usesSensor(c, 'right') ? tr('机器人从左往右走，到一格时它右边的格子还空着，不能读。', 'The robot walks from left to right, so when it reaches a cell, the cell to its right is still empty and can’t be read.') : null),
    debrief: { title: T('机器人学会了抄', 'The robot learned to copy'), body: [T('你只接了一根线，机器人就在每一格上照做了一遍。<b>电路板就是规则</b>：只写一次，机器人在每一格上都用它。', 'You drew a single wire, and the robot carried it out on every cell. <b>The circuit board is the rule</b>: you write it once, and the robot uses it on every cell.')], note: T('电路板描述一格的规则，机器人在每一格上运行它。', 'A circuit board describes the rule for one cell; the robot runs it on every cell.') },
  },
  {
    id: 'confluence', ch: 2, title: T('两路汇合', 'Two roads meet'), short: T('把两个数汇进一个元件', 'Merge two numbers in one component'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('回到棋盘城市：街道只能往右或往下走，每个路口的路线数 = 上面 + 左边。这一次，左上角的起点已经替你写好了 1，剩下的路口交给机器人。', 'Back to the grid city: streets only go right or down, and routes to each crossing = up + left. This time the start in the top-left corner already holds a 1 for you, and the robot takes care of the other crossings.'), fig: { ...gridScene(3, 4, { cell: (r, c) => (r === 0 && c === 0 ? { value: 1, cls: 'src' } : r === 1 && c === 1 ? { value: '?', cls: 'hot' } : {}) }), robot: '1,1' } },
      { t: T('一根线只能送一个数。要把上面和左边<b>加在一起</b>，需要一个<b>元件</b>：汇合器。它顶上有三个输入圆点，把接进来的数加起来，从底部的圆点送出去。', 'A wire carries just one number. To <b>add</b> up and left <b>together</b> you need a <b>component</b>: the Merger. It has three input dots on top; it adds up whatever is wired in and sends the result out of the dot at its bottom.'), fig: circuitFig({ taps: [['u', T('上面 · 3', 'up · 3')], ['l', T('左边 · 7', 'left · 7')]], parts: [['m', MERGER, SUM]], outs: [['o', T('本格 · 10', 'this cell · 10')]], wires: [['u', 'm'], ['l', 'm'], ['m', 'o']] }) },
      { t: T('第一行的格子，上面<b>没有格子</b>，视野里显示「界外」，送来的是「—」，意思是「这里没有路」。汇合器会跳过「—」，只加真正的数。', 'For cells in the top row there is <b>no cell above</b>: the view shows “out”, and what comes in is “—”, meaning “there is no road here”. The Merger skips “—” and adds up only real numbers.'), fig: circuitFig({ taps: [['u', T('上面 · —', 'up · —')], ['l', T('左边 · 1', 'left · 1')]], parts: [['m', MERGER, SUM]], outs: [['o', T('本格 · 1', 'this cell · 1')]], wires: [['u', 'm', 'off'], ['l', 'm'], ['m', 'o']] }) },
      { t: T('<b>怎么放元件：</b>把电路板下面托盘里的汇合器，拖到电路板的空格上（点一下也行）。按住它可以拖到别的格子，拖回托盘就拿掉了。', '<b>Placing a component:</b> drag the Merger from the tray under the board onto an empty slot of the board (a click works too). Hold it to drag it to another slot; drag it back to the tray to remove it.') },
    ],
    mission: { goal: T('街道只能往右或往下走，起点已经写好 1。让机器人算出每个路口的路线数：每个路口 = 上面 + 左边。', 'Streets only go right or down, and the start already holds 1. Have the robot work out the number of routes to every crossing: each crossing = up + left.'), how: T('在视野里点「上面」和「左边」两格，再放一个汇合器，把视野卡片的两个输出口接进去，再把汇合器接到「本格」。', 'Click the “up” and “left” cells in the view, place a Merger, wire both outputs of the View card into it, then wire the Merger to “this cell”.') },
    world: 'grid', facts: [], palette: ['msum'], fresh: ['msum'],
    guide: (c, lit) => (!(lit.includes('up') && lit.includes('left')) ? tr('第 1 步：在视野里点「上面」和「左边」，「视野」卡片就有了两个输出口。', 'Step 1: click “up” and “left” in the view: the “View” card then has two outputs.') : !c.nodes.some(n => !isInput(n.kind)) ? tr('第 2 步：把托盘里的「汇合器」拖到电路板的空格上，点一下也行。', 'Step 2: drag the “Merger” from the tray onto an empty slot of the board, or just click it.') : !c.wires.some(w => w.to.startsWith('out:')) ? tr('第 3 步：把视野的两个输出口各接到汇合器左边的一个圆点，再把汇合器右边的圆点接到「本格」。', 'Step 3: wire each of the View’s two outputs into a dot on the Merger’s left, then wire the Merger’s right-hand dot to “this cell”.') : null),
    tests: [{ R: 3, C: 4, given: { '0,0': 1 } }, { R: 4, C: 5, given: { '0,0': 1 } }],
    solution: circ([['m', 'msum']], ['tap:up>m:0', 'tap:left>m:1', 'm>out:cell']),
    hints: [T('每个路口 = 上面 + 左边：两个输入都接进同一个汇合器，汇合器再接到「本格」。', 'Each crossing = up + left: wire both inputs into the same Merger, and the Merger into “this cell”.')],
    debrief: { title: T('城市交给了机器人', 'The robot runs the city'), body: [T('第 6 关你亲手填了 12 个路口；现在你只接了三根线，机器人就把整座城市填满了。', 'In level 6 you filled in 12 crossings by hand; now you drew three wires and the robot filled in the whole city.'), T('不过，起点那个 1 是我们替它写好的。', 'But the 1 at the start was written in for it.')], note: T('汇合器把几根线送来的数加起来，「—」不参与。', 'A Merger adds up the numbers its wires bring; “—” is left out.') },
  },
  {
    id: 'origin', ch: 2, title: T('认出起点', 'Spot the start'), short: T('常数和放行闸', 'Constants and pass gates'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('如果起点没有预先写好，机器人走到起点时，上面和左边都是「界外」，汇合器什么也收不到，只能输出「—」。所以这一关专门练一件事：<b>只在起点写 1</b>。', 'If the start isn’t filled in beforehand, then when the robot reaches it, both up and left are “out”, the Merger receives nothing and can only output “—”. So this level practices just one thing: <b>write 1 on the start, and only there</b>.') },
      { t: T('视野下面有一栏<b>本格信息</b>。其中「是起点」只在机器人站在起点时是「是」，别的格子都是「否」。点它，电路板左边的<b>本格信息</b>卡片上就多一个输出口，送出的是「是 / 否」信号：菱形圆点，虚线。', 'Under the view there is a <b>This cell</b> panel. Its “is start” is “yes” only while the robot stands on the start, and “no” on every other cell. Click it, and the <b>This cell</b> card on the left of the circuit board gains an output sending a yes / no signal: a diamond dot and a dashed wire.') },
      { t: T('两个新元件：<b>常数</b>一直输出同一个数；<b>放行闸</b>只在条件口收到「是」时，才把数放过去，否则输出「—」。', 'Two new components: a <b>Constant</b> always outputs the same number; a <b>Pass gate</b> lets its number through only when its condition port receives “yes”, and otherwise outputs “—”.'), fig: circuitFig({ taps: [['s', T('是起点 · 是', 'is start · yes'), 'bool']], parts: [['k', CONST, '= 1'], ['g', PASS, PASS_TAG]], outs: [['o', T('本格 · 1', 'this cell · 1')]], wires: [['s', 'g', 'bool'], ['k', 'g'], ['g', 'o']] }) },
    ],
    mission: { goal: T('让机器人只在起点格写 1，其余每一格都写「—」（什么也不写）。这一关会检查整张表的每一格。', 'Have the robot write 1 on the start cell and “—” (nothing) on every other cell. This level checks every cell of the table.'), how: T('在输入窗口里点「是起点」，本格信息卡片上多出一个输出口。用它、常数和放行闸拼出结果，接到「本格」。', 'Click “is start” in the inputs window: the This cell card gets an output for it. Build the result from it, a Constant and a Pass gate, and wire it to “this cell”.') },
    world: 'grid', facts: ['start'], palette: ['const', 'pass', 'msum'], fresh: ['const', 'pass'], checkAll: true,
    guide: (c, lit) => (!lit.includes('start') ? tr('第 1 步：在本格信息里点「是起点」。', 'Step 1: click “is start” under This cell.') : !c.nodes.some(n => !isInput(n.kind)) ? tr('第 2 步：把托盘里的「常数」和「放行闸」拖到电路板上。', 'Step 2: drag a “Constant” and a “Pass gate” from the tray onto the board.') : null),
    tests: [{ R: 3, C: 4 }, { R: 2, C: 5 }],
    solution: circ([['k', 'const', 1], ['g', 'pass']], ['tap:start>g:0', 'k>g:1', 'g>out:cell']),
    hints: [T('常数一直输出 1；放行闸只在「是起点」为「是」时把它放过去。', 'The Constant always outputs 1; the Pass gate lets it through only when “is start” is “yes”.'), T('「是起点」接放行闸的「条件」口，常数接「数」口，放行闸接「本格」。', 'Wire “is start” into the Pass gate’s “if” port, the Constant into its “num” port, and the Pass gate into “this cell”.')],
    diagnose: c => (c.wires.some(w => w.to === 'out:cell' && c.nodes.some(n => n.id === w.from && n.kind === 'const')) ? tr('常数直接接到「本格」，每一格都会写 1。要用放行闸，只在起点放行。', 'With the Constant wired straight to “this cell”, every cell gets a 1. Use a Pass gate so it only goes through at the start.') : null),
    debrief: { title: T('机器人认得起点了', 'The robot knows the start'), body: [T('放行闸像一道门：条件是「是」时才开。机器人走到起点，门开了，1 写了进去；走到别的格子，门关着，什么也不写。', 'A Pass gate is like a door that opens only when its condition is “yes”. When the robot reaches the start, the door opens and a 1 is written; on any other cell the door stays shut and nothing is written.')], note: T('放行闸：条件是「是」才把数放过去，否则输出「—」。', 'Pass gate: lets the number through only when the condition is “yes”; otherwise outputs “—”.') },
  },
  {
    id: 'stamp', ch: 2, title: T('拼一台机器', 'Build a machine'), short: T('把前两关拼在一起', 'Combine the last two levels'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('前两关，你分别教会了机器人两件事：<b>把上面和左边加起来</b>，以及<b>只在起点写 1</b>。这一关，起点不再替你写好。', 'In the last two levels you taught the robot two things: <b>add up and left</b>, and <b>write 1 only on the start</b>. In this level, the start is no longer filled in for you.') },
      { t: T('把两块电路拼在一起：汇合器顶上有三个圆点，除了上面和左边，第三个圆点正好可以接放行闸。起点格的上面和左边都是「—」，汇合器只收到放行闸的 1；在别的格子，放行闸输出「—」，汇合器只加上面和左边。', 'Join the two circuits: the Merger has three dots on top, and besides up and left, the third one is free for the Pass gate. On the start cell, up and left are both “—”, so the Merger receives only the gate’s 1; on every other cell the gate outputs “—”, so the Merger adds only up and left.'), fig: circuitFig({ taps: [['u', UP], ['l', LEFT], ['s', IS_START, 'bool']], parts: [['k', CONST, '= 1', 0], ['g', PASS, PASS_TAG, 0], ['m', MERGER, SUM, 1]], outs: [['o', CELL]], wires: [['u', 'm'], ['l', 'm'], ['s', 'g', 'bool'], ['k', 'g'], ['g', 'm'], ['m', 'o']] }) },
      { t: T('拼好之后，机器人会在三座大小不同的城市里测试你的电路板。通过后，这块电路板会变成一个新元件。', 'Once it is built, the robot tests your board in three cities of different sizes. When it passes, the board becomes a new component.') },
    ],
    mission: { goal: T('只能往右或往下走，起点不再预先写好。拼一块电路板：起点写 1，其余每个路口 = 上面 + 左边，让机器人在三座城市里都算对路线数。', 'Only right or down, and the start is no longer filled in. Build one board: 1 on the start, and up + left on every other crossing, so the robot counts the routes correctly in all three cities.'), how: T('在输入窗口里点要读的格子和信息，再放元件、连线，然后点「运行测试」。没通过时，机器人会停在出错的格子，视野和电路板上的数，是它在这一格看到和算出的值。', 'Click the cells and facts you need in the inputs window, then place components, wire them, and click “Run tests”. If a test fails, the robot stops on the cell where it went wrong, and the numbers in the view and on the board are what it saw and computed there.') },
    world: 'grid', facts: ['start'], palette: ['msum', 'const', 'pass'], fresh: ['msum', 'const', 'pass'],
    tests: [{ R: 3, C: 4 }, { R: 4, C: 4 }, { R: 5, C: 6 }],
    solution: circ([['m', 'msum'], ['k', 'const', 1], ['g', 'pass']], ['tap:up>m:0', 'tap:left>m:1', 'tap:start>g:0', 'k>g:1', 'g>m:2', 'm>out:cell']),
    hints: [
      T('每个路口 = 上面 + 左边：在视野里点这两格，把它们接进同一个汇合器，再把汇合器接到「本格」。', 'Each crossing = up + left: click those two cells in the view, wire them into the same Merger, and wire the Merger to “this cell”.'),
      T('起点要输出 1：把本格信息的「是起点」接到放行闸的「条件」口；常数 1 接「数」口，再把放行闸也接进汇合器。', 'The start must output 1: wire This cell’s “is start” to a Pass gate’s “if” port; wire a Constant 1 into its “num” port, then wire the Pass gate into the Merger too.'),
    ],
    diagnose: c => (['right', 'down', 'ur', 'dl', 'dr'].some(id => usesSensor(c, id)) ? tr('机器人从左上往右下走，到一个格子时，它右边和下面的格子还空着，不能读。', 'The robot walks from the top left to the bottom right, so when it reaches a cell, the cells to its right and below are still empty and can’t be read.') : null),
    // As a part: up + left, and 1 on the start.
    unlock: 'counter', blueprint: { ports: ['up', 'left', 'start'], f: ([up, left, start]) => partFn('msum')([up, left, start ? 1 : null]) },
    debrief: { title: T('你拼出了第一台机器', 'Your first machine'), body: [T('它在 3×4、4×4、5×6 三座城市里都算对了。换成 100×100 的城市，同一块电路板也一样能算。', 'It got all three cities right: 3×4, 4×4 and 5×6. Give it a 100×100 city and the same board works just as well.'), T('每个格子的答案，都用前面格子的答案算出来，再记在表里。<strong>这种方法有一个正式的名字：动态规划</strong>。', 'Every cell’s answer is computed from the answers of earlier cells and then recorded in the table. <strong>This method has a proper name: dynamic programming</strong>.'), T('这块电路板存进了元件箱，名叫「路线计数器」。', 'This board has gone into your Parts as the “Route Counter”.')], note: T('把规则拼成电路，机器就能填满任意大的表。这就是动态规划。', 'Wire the rule into a circuit and the machine can fill a table of any size. That is dynamic programming.') },
  },
  {
    id: 'rocks', ch: 3, title: T('落石', 'Rockfall'), short: T('在零件外面加一道闸', 'Add a gate outside the part'), mode: 'circuit', robot: 'scout', uses: ['counter'],
    intro: [
      { t: T('山区的城市里，有些路口被落石堵住了（带斜纹的格子），<b>任何路线都不能经过它</b>。', 'In a mountain city, some crossings are blocked by fallen rocks (the hatched cells), and <b>no route may pass through them</b>.'), fig: gridScene(3, 3, { cell: (r, c) => (r === 1 && c === 1 ? { cls: 'rock' } : {}) }) },
      { t: T('上一关的电路板，已经变成了元件箱里的一个元件：<b>路线计数器</b>。它顶上有三个输入（上、左、起），底部一个输出。放上电路板、接好线就能用，里面不用再拼一遍。', 'The board from the last level is now a component in your Parts: the <b>Route Counter</b>. It has three inputs on top (up, left, start) and one output at the bottom. Put it on the board, wire it, and it works; there is no need to build its insides again.'), fig: circuitFig({ taps: [['u', UP], ['l', LEFT], ['s', IS_START, 'bool']], parts: [['c', T('路线计数器', 'Route Counter'), T('零件', 'part')]], outs: [['o', CELL]], wires: [['u', 'c'], ['l', 'c'], ['s', 'c', 'bool'], ['c', 'o']] }) },
      { t: T('这一关的「本格信息」里多了「是石头」，托盘里也多了一个新元件：<b>拦截闸</b>。它和放行闸正好相反：条件是「是」时，输出「—」；否则把数原样放过去。', 'This level’s This cell panel adds “is rock”, and the tray has a new component: the <b>Block gate</b>. It is the exact opposite of the Pass gate: when its condition is “yes” it outputs “—”; otherwise it lets the number through unchanged.'), fig: circuitFig({ taps: [['c', T('条件 · 是', 'if · yes'), 'bool'], ['v', T('数 · 6', 'num · 6')]], parts: [['b', T('拦截闸', 'Block gate'), T('是 → 拦下', 'yes → block')]], outs: [['o', T('输出 · —', 'output · —')]], wires: [['c', 'b', 'bool'], ['v', 'b'], ['b', 'o']] }) },
      { t: T('想一想：从起点走到石头格，有几条<b>真正走得通</b>的路线？石头格应该输出什么？', 'Think about it: how many routes from the start to a rock cell <b>can actually be traveled</b>? What should a rock cell output?') },
    ],
    mission: { goal: T('只能往右或往下走，任何路线都不能经过石头格（带斜纹）。让机器人在有落石的城市里也算对路线数。', 'Only right or down, and no route may pass through a rock cell (hatched). Have the robot count the routes correctly in cities with rockfalls too.'), how: T('路线计数器在托盘里，可以直接放上电路板。', 'The Route Counter is in the tray, ready to go on the board.') },
    world: 'grid', facts: ['start', 'rock'], palette: ['bp:stamp', 'block', 'msum', 'const', 'pass'], fresh: ['bp:stamp', 'block'],
    tests: [{ R: 4, C: 4, rocks: [[1, 1]] }, { R: 4, C: 5, rocks: [[1, 2], [2, 0]] }, { R: 5, C: 5, rocks: [[1, 3], [2, 1], [3, 3]] }],
    solution: circ([['c', 'bp:stamp'], ['b', 'block']], ['tap:up>c:0', 'tap:left>c:1', 'tap:start>c:2', 'tap:rock>b:0', 'c>b:1', 'b>out:cell']),
    hints: [
      T('路线不能经过石头。从起点走到石头格，有几条走得通的路线？', 'Routes can’t pass through rocks. How many routes from the start can actually get to a rock cell?'),
      T('放一个路线计数器和一个拦截闸：本格信息的「是石头」接拦截闸的条件口，数口接路线计数器，再把拦截闸接到「本格」。', 'Place a Route Counter and a Block gate: wire This cell’s “is rock” to the gate’s condition port and the Route Counter into its number port, then wire the Block gate to “this cell”.'),
    ],
    unlock: 'rock',
    debrief: { title: T('石头掐断了路线', 'The rocks cut the routes'), body: [T('石头格输出「—」之后，所有经过它的路线都被「掐断」了：汇合器会跳过「—」，它对后面的格子毫无贡献。', 'Once a rock cell outputs “—”, every route through it is cut off: Mergers skip “—”, so it adds nothing to the cells after it.'), T('<b>路线计数器里面一点都不用改。</b>你只是在它外面加了一道闸。造好的零件可以直接拿来用，再加一点新东西，去适应新情况。', '<b>Nothing inside the Route Counter had to change.</b> You just added a gate outside it. A finished part can be used as it is, with a little something new added to handle a new situation.')], note: T('走不通的格子输出「—」，经过它的路线就全被排除了。', 'A cell that can’t be passed outputs “—”, which rules out every route through it.') },
  },
  {
    id: 'slant', ch: 3, title: T('斜街', 'Slanted streets'), short: T('往右，或往右下', 'Right, or diagonally down-right'), mode: 'circuit', robot: 'scout', uses: ['counter'],
    intro: [
      { t: T('另一座城市的街道是斜的：每一步只能<b>往右</b>走一格，或者<b>往右下斜着</b>走一格。从左上角出发，到右下角一共有几条路线？', 'In another city the streets are slanted: each step goes one cell <b>right</b>, or one cell <b>diagonally down and right</b>. Starting from the top-left corner, how many routes reach the bottom-right corner?'), fig: { ...gridScene(3, 4, { arrows: false, cell: (r, c) => (r === 0 && c === 0 ? { corner: W.start } : r === 2 && c === 3 ? { corner: W.end } : {}) }), edges: [0, 1, 2].flatMap(r => [0, 1, 2].flatMap(c => [E(`${r},${c}`, `${r},${c + 1}`, 'dim'), ...(r < 2 ? [E(`${r},${c}`, `${r + 1},${c + 1}`, 'dim')] : [])])) } },
      { t: T('只看最后一步：到这个路口，要么是从<b>左边</b>走过来的，要么是从<b>左上</b>斜着过来的。从上面是走不过来的。', 'Look only at the last step: you reach this crossing either from the <b>left</b>, or diagonally from the <b>up-left</b>. You can’t get here from above.'), fig: { cells: [N('ul', 0, 0, { w: 56, h: 56, label: UL, cls: 'lit' }), N('u', 66, 0, { w: 56, h: 56, label: UP, cls: 'dimc' }), N('l', 0, 66, { w: 56, h: 56, label: LEFT, cls: 'lit' }), N('c', 66, 66, { w: 56, h: 56, value: '?', cls: 'sel' })], edges: [E('ul', 'c', 'hot'), E('l', 'c', 'hot')] } },
      { t: T('路线计数器的三个口上写着「上」「左」「起」，可它只管把前两个口的数加起来，起点算 1。<b>你把哪两个格子接给它，它就加哪两个。</b>', 'The Route Counter’s three ports are labeled “up”, “left” and “start”, but all it really does is add up the first two, with 1 at the start. <b>Whichever two cells you wire into it, those are the two it adds.</b>') },
    ],
    mission: { goal: T('每一步只能往右走一格，或往右下斜着走一格。算出从左上角到右下角有几条路线。', 'Each step goes one cell right, or one cell diagonally down and right. Work out how many routes lead from the top-left corner to the bottom-right corner.'), how: T('点出这一关需要的格子和信息，再放元件、连线。走不到的格子会是「—」。', 'Click the cells and facts this level needs, then place components and wire them. Cells that can’t be reached will be “—”.') },
    world: 'grid', facts: ['start'], palette: ['bp:stamp', 'msum', 'const', 'pass', 'block'],
    tests: [{ R: 3, C: 5 }, { R: 4, C: 6 }],
    solution: circ([['c', 'bp:stamp']], ['tap:left>c:0', 'tap:ul>c:1', 'tap:start>c:2', 'c>out:cell']),
    hints: [
      T('到一个路口的最后一步：从左边来（往右走了一格），或者从左上来（斜着走了一格）。', 'The last step into a crossing comes either from the left (one cell right) or from the up-left (one cell diagonally).'),
      T('把「左边」接到路线计数器的「上」口，「左上」接到「左」口，「是起点」接「起」口。口的名字不要紧，它只管把两个数加起来。', 'Wire “left” into the Route Counter’s “up” port, “up-left” into its “left” port, and “is start” into its “start” port. The port names don’t matter; it just adds two numbers.'),
    ],
    diagnose: c => (usesSensor(c, 'up') ? tr('这座城市不能往下直走，从上面是走不过来的。', 'In this city you can’t go straight down, so nothing arrives from above.') : null),
    debrief: { title: T('零件不在乎方向', 'Parts don’t care about direction'), body: [T('路线计数器的口上写着「上」「左」，可你接给它的是「左边」和「左上」，它照样算对了。', 'The Route Counter’s ports say “up” and “left”, yet you wired in “left” and “up-left”, and it still got the right answer.'), T('<b>零件只认结构，不认名字</b>：两个来源相加，起点算 1。只要新问题也是这个结构，旧零件就能直接拿来用。', '<b>A part cares about structure, not names</b>: add two sources, with 1 at the start. Whenever a new problem has this structure, the old part can be used as it is.')], note: T('零件只认结构：两个来源相加、起点算 1，换个方向照样能用。', 'A part cares only about structure: two sources added, 1 at the start. It works in any direction.') },
  },
  {
    id: 'stairs', ch: 3, title: T('爬楼梯', 'Climbing stairs'), short: T('换一种视野，同样的结构', 'A different view, the same structure'), mode: 'circuit', robot: 'ranger',
    intro: [
      { t: T('换个问题。爬楼梯时，<b>每次可以迈 1 级，也可以迈 2 级</b>。爬到第 n 级，一共有多少种不同的走法？', 'A different problem. When you climb stairs, <b>each stride can go up 1 step or 2 steps</b>. How many different ways are there to reach step n?') },
      { t: T('把每一级台阶当成一个格子，排成一行。第 0 级是地面。', 'Treat each step as a cell and lay them out in a row. Step 0 is the ground.'), fig: { cells: Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, x: i * 60, y: 0, w: 50, h: 50, value: '', corner: i })), edges: [] } },
      { t: T('站到第 5 级的最后一步，要么是<b>从第 4 级迈 1 级</b>上来，要么是<b>从第 3 级迈 2 级</b>上来。', 'The last stride onto step 5 is either <b>1 step up from step 4</b>, or <b>2 steps up from step 3</b>.'), fig: { cells: Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, x: i * 60, y: 0, w: 50, h: 50, value: i === 5 ? '?' : '', corner: i, cls: i === 5 ? 'sel' : i >= 3 ? 'lit' : '' })), edges: [E('s4', 's5', 'hot'), E('s3', 's5', 'hot', -46)] } },
      { t: T('机器人这次在台阶这一排上走，从地面（第 0 级）开始，一级一级往右。可是前 2 级离它有两格远，<b>3×3 的视野看不到</b>。所以这一关，你的机器人升级成了 5×5 视野的「远望」。「本格信息」里的「是地面」只在第 0 级是「是」。', 'This time the robot walks along the row of steps, starting from the ground (step 0) and moving right one step at a time. But the step 2 below is two cells away, <b>out of reach of a 3×3 view</b>. So for this level your robot is upgraded to Farsight, with a 5×5 view. In the This cell panel, “is ground” is “yes” only on step 0.') },
      { t: T('拼一块电路板吧。小方那几关你已经发现：零件只认结构，不认名字。爬楼梯的结构，你是不是在哪儿见过？', 'Build a board. With Boxy you found that parts care about structure, not names. Have you seen the structure of stair climbing somewhere before?') },
    ],
    mission: { goal: T('每次只能迈 1 级或 2 级台阶，从地面（第 0 级）出发。算出爬到第 4、6、9 级各有几种走法。', 'Each stride goes up 1 or 2 steps, starting from the ground (step 0). Work out how many ways there are to reach steps 4, 6 and 9.'), how: T('机器人从第 0 级（地面）往上，一级一级地走。站在地面上，算 1 种走法。视野里，红框左边一格是前 1 级，左边两格是前 2 级。', 'The robot goes up from step 0 (the ground), one step at a time. Standing on the ground counts as 1 way. In the view, one cell left of the red frame is 1 step down, and two cells left is 2 steps down.') },
    world: 'strip', facts: ['ground'], palette: ['msum', 'const', 'pass', 'block', 'bp:stamp'],
    tests: [{ n: 4 }, { n: 6 }, { n: 9 }],
    solution: circ([['m', 'msum'], ['k', 'const', 1], ['g', 'pass']], ['tap:m1>m:0', 'tap:m2>m:1', 'tap:ground>g:0', 'k>g:1', 'g>m:2', 'm>out:cell']),
    hints: [
      T('最后一步可能迈 1 级，也可能迈 2 级：把「前 1 级」和「前 2 级」加起来。', 'The last stride might be 1 step or 2 steps: add up “1 step down” and “2 steps down”.'),
      T('地面要算 1 种走法：「是地面」接放行闸的条件口，常数 1 接数口。', 'The ground counts as 1 way: wire “is ground” into a Pass gate’s condition port and a Constant 1 into its number port.'),
      T('也可以直接用路线计数器：前 1 级接它的「上」，前 2 级接「左」，是地面接「起」。', 'You can also use the Route Counter directly: 1 step down into its “up”, 2 steps down into “left”, and is ground into “start”.'),
    ],
    unlock: 'stairs', blueprint: { ports: ['m1', 'm2', 'ground'], f: ([m1, m2, ground]) => partFn('msum')([m1, m2, ground ? 1 : null]) },
    debrief: { title: T('5 种、13 种、55 种', '5, 13 and 55 ways'), body: [T('如果你把路线计数器拿来用了，你会发现：<b>它根本不知道自己在数楼梯</b>，可它算对了。', 'If you used the Route Counter, you’ll have noticed: <b>it has no idea it is counting stairs</b>, and yet it got them right.'), T('城市路口和楼梯，表面上毫无关系，但它们的结构一样：每个格子的答案，都来自几个更早的格子，再加上一个起点。看出这种结构，是学会动态规划最关键的一步。', 'City crossings and staircases look completely unrelated, but they share a structure: every cell’s answer comes from a few earlier cells, plus a starting point. Learning to see that structure is the most important step in learning dynamic programming.')], note: T('爬楼梯：第 i 级 = 第 i − 1 级 + 第 i − 2 级，地面算 1 种。', 'Climbing stairs: step i = step i − 1 + step i − 2, with the ground counting as 1 way.') },
  },
  {
    id: 'order', ch: 4, title: T('倒着算', 'Work backwards'), short: T('机器换了方向，电路也得跟着换', 'The machine turns round, so must the circuit'), mode: 'circuit', robot: 'ranger', uses: ['counter'],
    intro: [
      { t: T('之前机器总是从左上角开始，一行一行地算。<b>为什么不能随便从哪里开始？</b>', 'So far the machine has always started in the top-left corner and worked row by row. <b>Why can’t it just start anywhere?</b>') },
      { t: T('因为每个格子要读它上面和左边的格子。如果那些格子还空着，机器就算不下去了。', 'Because each cell reads the cells above it and to its left. If those are still empty, the machine can’t go on.'), fig: { cells: [N('a', 0, 0, { w: 56, h: 56, value: 1, cls: 'lit' }), N('b', 66, 0, { w: 56, h: 56, value: W.empty, cls: 'bad' }), N('c', 0, 66, { w: 56, h: 56, value: 1, cls: 'lit' }), N('d', 66, 66, { w: 56, h: 56, value: '?', cls: 'sel' })], edges: [E('b', 'd', 'bad'), E('c', 'd', 'hot')] } },
      { t: T('这一关的机器人装反了：它只会<b>从右下角出发，倒着一行一行地走</b>。格子角上的小数字，是它走到的先后顺序。', 'This level’s robot has been fitted backwards: it can only <b>start from the bottom-right corner and walk the rows in reverse</b>. The small number in each cell’s corner is the order in which it gets there.'), fig: gridScene(3, 4, { cell: (r, c) => ({ corner: 12 - (r * 4 + c), cls: r === 2 && c === 3 ? 'hot' : '' }) }) },
      { t: T('路线计数器要读上面和左边，可在这台机器上，那些格子总是还空着。换个想法：每一格里的数，能不能换一种意思？最后，答案要出现在起点。', 'The Route Counter reads up and left, but on this machine those cells are always still empty. Think of it differently: could the number in each cell mean something else? In the end, the answer has to appear on the start.') },
    ],
    mission: { goal: T('路线仍然只能往右或往下走，但机器人从右下角倒着走。拼一块电路板，让左上角的起点格算出从起点到终点的路线数。', 'Routes still only go right or down, but the robot walks backwards from the bottom-right corner. Build a board so that the start cell in the top-left corner ends up with the number of routes from start to end.'), how: T('「本格信息」里多了「是终点」。机器人读到还空着的格子，就会停下来。', 'The This cell panel adds “is end”. If the robot reads a cell that is still empty, it stops.') },
    world: 'grid', facts: ['start', 'end'], scan: 'rowBR', answerAt: 'start', palette: ['msum', 'const', 'pass', 'block', 'bp:stamp'],
    tests: [{ R: 4, C: 5 }, { R: 3, C: 6 }],
    solution: circ([['c', 'bp:stamp']], ['tap:right>c:0', 'tap:down>c:1', 'tap:end>c:2', 'c>out:cell']),
    hints: [
      T('这台机器上，能读的只有右边和下面。从这一格出发，第一步能往哪走？', 'On this machine, only right and down can be read. Leaving this cell, where can the first step go?'),
      T('终点到终点，算 1 条路线：「是终点」放行一个 1。', 'From the end to the end counts as 1 route: let a 1 through on “is end”.'),
      T('路线计数器也能用：右边接「上」，下面接「左」，是终点接「起」。', 'The Route Counter works too: right into “up”, down into “left”, and is end into “start”.'),
    ],
    diagnose: c => (['up', 'left', 'ul', 'ur', 'dl'].some(id => usesSensor(c, id)) ? tr('机器人从右下往左上走，到一个格子时，它上面和左边的格子还空着，不能读。', 'The robot walks from the bottom right to the top left, so when it reaches a cell, the cells above and to its left are still empty and can’t be read.') : usesSensor(c, 'start') ? tr('从这里数到终点的话，路线是从终点「数回来」的。该放行 1 的是终点，不是起点。', 'Counting from here to the end means counting back from the end. The 1 belongs on the end, not on the start.') : null),
    unlock: 'order',
    debrief: { title: T('顺序决定了能读谁', 'The order decides what can be read'), body: [T('机器从右下往左上算，每个格子被计算时，它右边和下面的格子都已经算好了，所以电路只能读这两个方向。', 'The machine works from the bottom right to the top left, so whenever a cell is computed, the cells to its right and below are already done. That is why the circuit can only read those two directions.'), T('<b>计算顺序和电路是一对</b>：先算被依赖的格子，再算依赖它们的格子。满足这个条件的顺序，程序员叫它「拓扑序」。', '<b>The order and the circuit go together</b>: compute the cells that others depend on before the cells that depend on them. Programmers call an order like that a “topological order”.'), T('起点格的答案和以前一样。从起点数到终点，和从终点数回起点，是同一个问题的两种问法。', 'The start cell’s answer is the same as before. Counting from the start to the end and counting back from the end to the start are two ways of asking the same question.')], note: T('合法的顺序：每个格子都排在它要读的格子之后。', 'A valid order: every cell comes after the cells it reads.') },
  },
  {
    id: 'cheapest', ch: 5, title: T('最省力', 'Least effort'), short: T('每个路口都要花体力', 'Every crossing costs energy'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('现在每个路口都要花一点体力才能通过，就是格子左上角的小数字。从左上走到右下，<b>最少要花多少体力？</b>', 'Now every crossing costs some energy to pass through: the small number in each cell’s top-left corner. Going from the top left to the bottom right, <b>what is the least energy you can spend?</b>'), fig: gridScene(3, 3, { cell: (r, c) => ({ corner: [[1, 3, 1], [1, 5, 1], [4, 2, 1]][r][c] }) }) },
      { t: T('还是只看最后一步：到这个路口，要么从上面来，要么从左边来。', 'Again, look only at the last step: you reach this crossing either from above or from the left.') },
      { t: T('数路线时，我们把两边<b>加起来</b>，因为两边的路线都算数。这次你只走一条路，两边该怎么处理？汇合器还有一个「取较小」的操作：比如 8 和 6，它输出 6。', 'When counting routes we <b>added</b> both sides, because routes from both sides count. This time you walk just one route: what should happen to the two sides? The Merger also has a “min” operation: given 8 and 6, it outputs 6.'), fig: { cells: [N('u', 66, 0, { w: 56, h: 56, value: 8, label: UP, cls: 'lit' }), N('l', 0, 66, { w: 56, h: 56, value: 6, label: LEFT, cls: 'lit' }), N('c', 66, 66, { w: 56, h: 56, value: 7, corner: 1, cls: 'sel' })], edges: [E('u', 'c', 'dim'), E('l', 'c', 'hot')] } },
      { t: T('最后还要<b>加上这个路口自己的体力</b>：6 + 1 = 7。这要用到<b>加法器</b>：它把 a、b 两个数相加。只要有一边是「—」，结果就是「—」，因为走不通的路，加多少都走不通。', 'Finally, <b>add this crossing’s own energy</b>: 6 + 1 = 7. That takes an <b>Adder</b>, which adds two numbers a and b. If either side is “—”, the result is “—”, because a dead end stays a dead end, whatever you add to it.'), fig: circuitFig({ taps: [['u', T('上面 · 8', 'up · 8')], ['l', T('左边 · 6', 'left · 6')], ['c', T('本格体力 · 1', 'cell energy · 1')]], parts: [['m', MERGER, MIN, 0], ['a', T('加法器', 'Adder'), 'a + b', 1]], outs: [['o', T('本格 · 7', 'this cell · 7')]], wires: [['u', 'm'], ['l', 'm'], ['m', 'a'], ['c', 'a'], ['a', 'o']] }) },
      { t: T('别忘了起点：起点的上面和左边都是「—」，可经过起点，也要花它自己的体力。', 'Don’t forget the start: up and left are both “—” there, but passing through the start still costs its own energy.') },
    ],
    mission: { goal: T('只能往右或往下走，每经过一个路口（包括起点和终点）都要花掉它左上角写的体力。算出从左上到右下最少要花多少体力。', 'Only right or down, and every crossing you pass through (start and end included) costs the energy written in its top-left corner. Work out the least energy needed to get from the top left to the bottom right.'), how: T('格子左上角的小数字是这一格的体力，在输入窗口里点「本格体力」就能读它。这一关解锁了「取较小」汇合器和加法器。', 'The small number in a cell’s top-left corner is its energy; click “cell energy” in the inputs window to read it. This level unlocks the “min” Merger and the Adder.') },
    world: 'grid', facts: ['start', 'cost'], palette: [...KIT, 'bp:stamp'], fresh: ['mmin', 'add'],
    tests: [{ R: 3, C: 3, costs: [[1, 3, 1], [1, 5, 1], [4, 2, 1]] }, { R: 2, C: 3, costs: [[1, 2, 3], [4, 5, 6]] }, { R: 4, C: 4, costs: L12_COSTS }],
    solution: circ([['m', 'mmin'], ['k', 'const', 0], ['g', 'pass'], ['a', 'add']], ['tap:up>m:0', 'tap:left>m:1', 'tap:start>g:0', 'k>g:1', 'g>m:2', 'm>a:0', 'tap:cost>a:1', 'a>out:cell']),
    hints: [
      T('只能走一条路：到这个路口，两边的花费都要算进去吗？', 'You walk only one route: do both sides’ costs really count towards this crossing?'),
      T('穿过这个路口本身也要花体力：取较小之后，用加法器加上「本格体力」。', 'Passing through this crossing costs energy too: after the min, use an Adder to add “cell energy”.'),
      T('起点的上面和左边都是「—」，取较小只能得到「—」，再加体力还是「—」。用放行闸在起点往汇合器里送一个 0（常数放上去后，点它可以改成 0）。', 'At the start, up and left are both “—”, so the min gives “—”, and adding energy still gives “—”. Use a Pass gate to send a 0 into the Merger at the start (once the Constant is on the board, click it to change it to 0).'),
    ],
    diagnose: c => (!hasKind(c, 'mmin') ? tr('只能走一条路，两边的花费不能加起来。用「取较小」汇合器。', 'You walk only one route, so the costs of the two sides can’t be added together. Use the “min” Merger.') : null),
    // As a part: the cheaper of up and left (0 at the start), plus this crossing's energy.
    unlock: 'min', blueprint: { ports: ['up', 'left', 'start', 'cost'], f: ([up, left, start, cost]) => partFn('add')([partFn('mmin')([up, left, start ? 0 : null]), cost]) },
    debrief: { title: T('从数路线到找最优', 'From counting to optimizing'), body: [T('电路的骨架没变，只是把「加起来」的汇合器换成了「取较小」，再加上本格的体力。机器就从「数有几条路」变成了「找最好的那条路」。', 'The circuit’s skeleton didn’t change: you just swapped the “sum” Merger for a “min” one and added the cell’s energy. And the machine went from “count how many routes there are” to “find the best route”.'), T('<b>动态规划既能计数，也能求最优。</b>它们共用同一个骨架：只看最后一步，用前面格子的答案算出这一格。', '<b>Dynamic programming can count, and it can optimize.</b> Both share the same skeleton: look only at the last step, and compute this cell from the answers of earlier cells.')], note: T('求最优时，用「取较小」代替「加起来」。', 'To optimize, use “min” in place of “sum”.') },
  },
  {
    id: 'back', ch: 5, title: T('原路找回', 'Retrace the route'), short: T('从表格里还原出具体路线', 'Recover the actual route from the table'), mode: 'back',
    intro: [
      { t: T('上一关机器告诉你「最少要花 16 点体力」，却没说<b>具体该怎么走</b>。', 'Last level the machine told you “the least energy is 16”, but not <b>which way to actually go</b>.') },
      { t: T('答案就藏在表格里。看终点：它的数是从上面来的，还是从左边来的？<b>哪边的数加上终点自己的体力，正好等于终点的数</b>，就是从哪边来的。', 'The answer is hidden in the table. Look at the end: did its number come from above, or from the left? <b>Whichever side’s number plus the end’s own energy equals exactly the end’s number</b> is the side it came from.'), fig: { cells: [N('u', 66, 0, { w: 56, h: 56, value: 15, label: UP, cls: 'bad' }), N('l', 0, 66, { w: 56, h: 56, value: 12, label: LEFT, cls: 'path' }), N('c', 66, 66, { w: 56, h: 56, value: 16, corner: 4, cls: 'sel' })], edges: [E('u', 'c', 'bad'), E('l', 'c', 'good')] } },
      { t: T('12 + 4 = 16，所以终点是从左边来的。然后站到左边那个格子上，再问同样的问题……一直退回起点。', '12 + 4 = 16, so the end was reached from the left. Then stand on that left cell and ask the same question again… all the way back to the start.') },
    ],
    mission: { goal: T('从终点出发，一步步退回起点，还原出最省力的路线。每一步只能退到上面或左边的格子。', 'Starting from the end, step back to the start one step at a time to recover the route with the least effort. Each step can only go back to the cell above or to the left.'), how: T('每次点当前格子上面或左边的一个格子，选对就会退过去。', 'Each time, click the cell above or to the left of the current one; pick the right one and you step back onto it.') },
    costs: L12_COSTS,
    unlock: 'back',
    debrief: { title: T('路线找回来了', 'Route recovered'), body: [T('倒着走回起点，你就还原出了最省力的那条路线。', 'Walking backwards to the start, you recovered the route with the least effort.'), T('表格不只存下了答案，<b>也存下了每一步的选择</b>。这个倒推的过程叫「回溯」。', 'The table stores not only the answer but also <b>the choice made at every step</b>. This process of working backwards is called “backtracking”.')], note: T('从终点倒推「是从哪来的」，就能还原出具体路线。', 'Work back from the end, asking “where did this come from?”, and you recover the actual route.') },
  },
  {
    id: 'why', ch: 6, title: T('问路还是填表', 'Ask, or fill the table?'), short: T('为什么动态规划这么快', 'Why dynamic programming is so fast'), mode: 'explode',
    intro: [
      { t: T('最后一个问题：<b>为什么填表这么快？</b>我们拿它和另一种算法比一比。', 'One last question: <b>why is filling the table so fast?</b> Let’s compare it with another method.') },
      { t: T('<b>问路法：</b>想知道第 n 级台阶有几种走法，就去问第 n − 1 级和第 n − 2 级；它们再去问更低的台阶……一直问到地面。下图是问第 4 级时发生的所有提问。', '<b>Asking:</b> to find out how many ways reach step n, ask step n − 1 and step n − 2; they in turn ask lower steps… all the way down to the ground. The picture shows every question asked for step 4.'), fig: treeScene(4) },
      { t: T('<b>填表法</b>就是你一直在做的：从第 0 级开始往上填，每一级只算一次。', '<b>Filling the table</b> is what you have been doing all along: fill upwards from step 0, computing each step only once.'), fig: { cells: Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, x: i * 60, y: 0, w: 50, h: 50, value: [1, 1, 2, 3, 5][i], corner: i, cls: 'lit' })), edges: Array.from({ length: 4 }, (_, i) => E(`s${i}`, `s${i + 1}`, 'dim')) } },
      { t: T('两种方法算出的答案一样。区别在于要算多少次。把台阶数拖到 <b>30 以上</b>看看。', 'Both methods get the same answer. The difference is how much work they do. Drag the number of steps <b>past 30</b> and see.') },
    ],
    mission: { goal: T('把台阶数调到 30 以上，比较两种方法要算多少次，然后回答问题。', 'Set the number of steps past 30, compare how much work each method does, then answer the question.'), how: T('拖动规则面板里的滑块。', 'Drag the slider in the side panel.') },
    question: { q: T('为什么问路法要算这么多次？', 'Why does asking take so much work?'), opts: [T('问路法会把同一级台阶问上很多很多遍，填表法每一级只算一次', 'Asking asks about the same step over and over again; filling the table computes each step only once'), T('问路法用的是乘法，填表法用的是加法', 'Asking uses multiplication; filling the table uses addition'), T('台阶越高，每一级就越难算', 'The higher the step, the harder each step is to compute')], a: 0 },
    unlock: 'memo',
    debrief: { title: T('记下来，不重复', 'Write it down, never repeat'), body: [T('在问路法的树里，同一个数字出现了一次又一次，每次都从头再算一遍。台阶每多一级，提问次数就大约乘以 1.6。', 'In the asking tree, the same number shows up again and again, and each time it is worked out from scratch. Every extra step multiplies the number of questions by about 1.6.'), T('填表法把算过的答案记在表里，<b>每个格子只算一次</b>。30 级台阶只要 31 次计算。', 'Filling the table records every answer it has computed, so <b>each cell is computed only once</b>. 30 steps take just 31 computations.'), T('<strong>你已经掌握了动态规划的骨架：</strong>只看最后一步，用小问题的答案拼出大问题，按顺序把答案记在表里，绝不重复计算。接下来几章，会把这副骨架用到更难的问题上。', '<strong>You now have the skeleton of dynamic programming:</strong> look only at the last step, build the big answer out of the small ones, record the answers in order in a table, and never compute anything twice. The chapters ahead put this skeleton to work on harder problems.')], note: T('记下算过的答案，不重复计算，这就是动态规划快的原因。', 'Record every answer and never compute it twice: that is why dynamic programming is fast.') },
  },
];
