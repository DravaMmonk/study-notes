// 回环's new levels (CURRICULUM.md, 第 6 代): the treasure-map topic opens on a map you can only cross right or down,
// and ends on one where some of the floor is ice, with a chance to slip that varies from cell to cell.

import { circ, hasKind, usesSensor } from '../../kit/domains/table/circuit/components.js';
import { T, tr } from '../../kit/domains/table/i18n.js';

/** A map's bottom row and right column: the cliffs along its edge. */
const rim = (R, C) => [...Array.from({ length: C }, (_, c) => [R - 1, c]), ...Array.from({ length: R - 1 }, (_, r) => [r, C - 1])];

export const loopLevels = [
  {
    id: 'treasure', ch: 15, title: T('往右往下找宝藏', 'Treasure, right or down'), short: T('两个方向，打个九折', 'Two directions, then a discount'), mode: 'circuit', robot: 'loop',
    intro: [
      { t: T('一张新地图：机器人只能往<b>右</b>或往<b>下</b>走。宝藏 10，地图边上一圈是悬崖，−10。', 'A new map: the robot can only go <b>right</b> or <b>down</b>. The treasure is worth 10, and the edge of the map is a ring of cliffs at −10.') },
      { t: T('每一格的价值 = 往右、往下两格里较好的那个，<b>打个九折</b>。', 'Each cell’s value = the better of the cells to the right and below, <b>discounted to 90%</b>.') },
    ],
    mission: { goal: T('算出每一格的价值：往右、往下两格里较好的那个 × 0.9。', 'Work out the value of every cell: the better of right and down × 0.9.'), how: T('机器人一轮一轮地扫，直到表不再变。答案看起点那一格。', 'The robot scans in rounds until the table stops changing. The answer is the start cell.') },
    world: 'vgrid', facts: [], consts: [0, 0.5, 0.8, 0.9, 1], rounds: true, arrows: true,
    tests: [{ R: 5, C: 6, gold: [3, 4], cliffs: [...rim(5, 6), [1, 2]], rd: true }, { R: 4, C: 5, gold: [2, 3], cliffs: rim(4, 5), rd: true }],
    solution: circ([['d', 'bp:value', 0.9]], ['tap:right>d:0', 'tap:down>d:1', 'd>out:cell']),
    hints: [T('只能往右或往下：右边、下面接进「取较大」，再乘 0.9。', 'Right or down only: wire right and down into a max, then multiply by 0.9.')],
    diagnose: c => (usesSensor(c, 'up') || usesSensor(c, 'left') ? tr('这张地图上只能往右或往下走：上面和左边走不过去。', 'On this map you only move right or down: up and left can’t be reached.') : null),
    debrief: { title: T('格子世界的简化版', 'The grid world, simplified'), body: [T('只有两个方向，每一格都只看右边和下面。', 'With two directions, every cell looks only right and down.')] },
  },
  {
    id: 'ice', ch: 15, title: T('有冰有地', 'Ice and ground'), short: T('每一格滑得不一样', 'Every cell slips its own way'), mode: 'circuit', robot: 'loop',
    intro: [
      { t: T('这张地图上有的格子是冰，有的是地。地上不会滑；冰上每一格滑得不一样，角上写着打滑的可能。', 'Some cells on this map are ice and some are ground. Ground doesn’t slip; each cell of ice slips its own way, with its chance written in the corner.') },
      { t: T('本格信息里有<b>打滑的可能</b>和<b>站稳的可能</b>（两个加起来是 1）。往右 = 站稳 × 右边 + 打滑 × 下面；往下反过来。', 'This cell’s facts include its <b>chance to slip</b> and its <b>chance to hold</b> (they add up to 1). Going right = hold × right + slip × down; going down is the other way round.') },
    ],
    mission: { goal: T('算出每一格的价值：两个动作里较好的那个 × 0.9，每个动作按这一格的打滑可能加权。', 'Work out every cell’s value: the better of the two moves × 0.9, each move weighted by this cell’s chance to slip.'), how: T('打滑的可能因格子而异：读本格信息，别用常数。', 'The chance to slip changes from cell to cell: read it from the cell’s facts, not from a Constant.') },
    world: 'vgrid', facts: ['slip', 'grip'], consts: [0, 0.5, 0.8, 0.9, 1], rounds: true, arrows: true,
    tests: [
      { R: 5, C: 6, gold: [3, 4], cliffs: rim(5, 6), ice: [[0, 2, 0.3], [1, 1, 0.4], [2, 4, 0.3], [3, 3, 0.2], [3, 2, 0.5]] },
      { R: 5, C: 5, gold: [2, 3], cliffs: [...rim(5, 5), [1, 3]], ice: [[0, 1, 0.2], [1, 1, 0.4], [1, 2, 0.4], [2, 2, 0.3], [3, 1, 0.5]] },
    ],
    // The topic's board: each move weighted by this cell's own chances. On firm ground (V1) it is right-or-down; with
    // one chance everywhere (V2) it is the slippery floor.
    solution: circ([['a', 'mul'], ['b', 'mul'], ['c', 'mul'], ['d', 'mul'], ['p', 'add'], ['q', 'add'], ['x', 'bp:value', 0.9]], [
      'tap:grip>a:0', 'tap:right>a:1', 'tap:slip>b:0', 'tap:down>b:1', 'a>p:0', 'b>p:1',
      'tap:grip>c:0', 'tap:down>c:1', 'tap:slip>d:0', 'tap:right>d:1', 'c>q:0', 'd>q:1',
      'p>x:0', 'q>x:1', 'x>out:cell',
    ]),
    hints: [
      T('和<level-ref to="slip"></level-ref>一样，只是 0.8 和 0.2 换成了本格的「站稳的可能」和「打滑的可能」。', 'As in <level-ref to="slip"></level-ref>, with 0.8 and 0.2 swapped for this cell’s “chance to hold” and “chance to slip”.'),
    ],
    diagnose: c => (!usesSensor(c, 'slip') || !usesSensor(c, 'grip') ? tr('每一格滑得不一样：打滑和站稳的可能都要从本格信息里读。', 'Every cell slips its own way: read both chances from the cell’s facts.') : !hasKind(c, 'mul') ? tr('按可能性加权要用乘法器。', 'Weighting by chance takes Multipliers.') : null),
    debrief: { title: T('一块板，三张地图', 'One board, three maps'), body: [T('这块电路板读本格的可能。地上都是 0，它就是<level-ref to="treasure"></level-ref>；处处一样，它就是<level-ref to="slip"></level-ref>。', 'This board reads each cell’s own chances. With 0 everywhere it is <level-ref to="treasure"></level-ref>; with the same chance everywhere it is <level-ref to="slip"></level-ref>.'), T('现实里的强化学习也是这样：环境的不确定性因状态而异，价值就按每个状态自己的可能性加权。', 'Real reinforcement learning works the same way: the uncertainty differs from state to state, and each value is weighted by that state’s own chances.')] },
  },
];
