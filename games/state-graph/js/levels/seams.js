// Chapter 18: the seam in a picture — the cheapest top-to-bottom path through a picture's energy, found with the same
// table as the cheapest route, then cut out so the picture narrows without squashing what stands out in it.

import { circ, usesSensor } from '../circuit/components.js';
import { seamPath, shade } from '../circuit/worlds/picture.js';
import { T, tr } from '../i18n.js';

const KIT = ['msum', 'mmin', 'mmax', 'add', 'const', 'pass', 'block'];
/** Letters from Vision Complete's test images (its engine/image.js GLYPHS), five pixels square. */
const GLYPHS = { T: ['#####', '..#..', '..#..', '..#..', '..#..'], L: ['#....', '#....', '#....', '#....', '#####'], O: ['.###.', '#...#', '#...#', '#...#', '.###.'], X: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'] };
/** A grey picture: a faintly grainy background (1–2) with bright letters (8) drawn on it. */
function picture(w, h, letters, seed = 7) {
  let s = seed;
  const grain = () => { s = (s * 1103515245 + 12345) % 2147483648; return s % 5 === 0 ? 2 : 1; };
  const img = Array.from({ length: h }, () => Array.from({ length: w }, grain));
  letters.forEach(([ch, x0, y0]) => GLYPHS[ch].forEach((row, y) => [...row].forEach((p, x) => { if (p === '#') img[y0 + y][x0 + x] = 8; })));
  return img;
}
const test = img => ({ img, R: img.length, C: img[0].length });
const thumb = (img, path = []) => {
  const on = new Set(path.map(p => p.join())), px = 14;
  return { cells: img.flatMap((row, r) => row.map((v, c) => ({ id: `${r},${c}`, x: c * px, y: r * px, w: px, h: px, rx: 1, value: '', fill: shade(v), cls: on.has(`${r},${c}`) ? 'cut' : 'px' }))), edges: [] };
};
const BIG = picture(22, 9, [['T', 3, 2], ['O', 13, 2]]);
const P1 = picture(9, 6, [['T', 2, 0]], 3), P2 = picture(10, 7, [['O', 4, 1]], 11);

const energies = e => ({ energy: e, R: e.length, C: e[0].length });

export const seams = [
  // The seam series (小方's topic, CURRICULUM.md): a picture one pixel wide, then a narrow one where a seam may slant,
  // then a real picture. The finale's board solves both: off the picture, up-left and up-right are “—”.
  {
    id: 'seamline', ch: 17, title: T('一根柱子', 'A single column'), short: T('能量一路加下来', 'Energy, added all the way down'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('一张图只有 1 像素宽。每个像素有一个<b>能量</b>，写在格子左上角：越显眼的像素能量越高。', 'A picture just 1 pixel wide. Every pixel has an <b>energy</b>, written in its cell’s top-left corner: the more it stands out, the higher its energy.') },
      { t: T('一条<b>缝</b>从顶走到底，每行经过一个像素。缝的能量是它经过的像素的能量之和。', 'A <b>seam</b> runs from the top to the bottom, through one pixel in each row. A seam’s energy is the total energy of the pixels it passes through.') },
    ],
    mission: { goal: T('这条缝从顶走到底，能量一共是多少？每格存「从顶走到这里的能量」。', 'What is the total energy of the seam from top to bottom? Each cell holds “the energy from the top down to here”.'), how: T('逐行，从顶行往下算。', 'Row by row, from the top down.') },
    world: 'pic', facts: ['energy', 'top'], palette: ['msum', 'mmin', 'add', 'const', 'pass'], checkAll: true,
    tests: [energies([[3], [1], [4], [1], [5]]), energies([[2], [7], [1], [8]]), energies([[6], [0], [2], [9], [1], [3]])],
    solution: circ([['m', 'msum'], ['z', 'const', 0], ['g', 'pass'], ['a', 'add']], ['tap:up>m:0', 'tap:top>g:0', 'z>g:1', 'g>m:1', 'm>a:0', 'tap:energy>a:1', 'a>out:cell']),
    hints: [T('到这一格的能量 = 到上一格的能量 + 这一格自己的能量。', 'The energy down to this cell = the energy down to the cell above + this cell’s own.'), T('顶行上面什么也没有：在顶行送一个 0 进去。', 'Above the top row there is nothing: feed a 0 in on the top row.')],
    debrief: { title: T('一路加下来', 'Added all the way down'), body: [T('一根柱子只有一条缝，表只是把能量一格格加下来。', 'A single column has only one seam, and the table just adds the energy down cell by cell.')] },
  },
  {
    id: 'seamslant', ch: 17, title: T('可以斜着走', 'It may slant'), short: T('从顶行任意一格出发', 'Start anywhere on the top row'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('现在图有好几列。缝从顶行<b>任意一个</b>像素出发，每一步走到正下方、左下方或右下方的像素，一直走到底行。', 'Now the picture has several columns. A seam starts at <b>any</b> pixel of the top row, and each step goes to the pixel right below, below-left or below-right, all the way to the bottom row.') },
    ],
    mission: { goal: T('能量最低的那条缝，能量是多少？答案是底行里最小的数。', 'What is the energy of the lowest-energy seam? The answer is the smallest number in the bottom row.'), how: T('逐行，从顶行往下算。', 'Row by row, from the top down.') },
    world: 'pic', facts: ['energy', 'top'], palette: KIT, checkAll: true,
    tests: [
      energies([[3, 1, 4], [1, 5, 9], [2, 6, 5], [3, 5, 8]]),
      energies([[9, 1, 9, 9], [9, 9, 1, 9], [1, 9, 9, 9], [9, 1, 9, 2]]),
      energies([[2, 8, 3, 7, 1], [6, 4, 9, 2, 5], [1, 7, 3, 8, 6], [5, 2, 6, 1, 9]]),
    ],
    solution: circ([['c', 'bp:cheapest']], ['tap:ul>c:0', 'tap:up>c:1', 'tap:top>c:2', 'tap:energy>c:3', 'tap:ur>c:4', 'c>out:cell']),
    hints: [T('到这一格之前，缝在上一行的哪几个像素上？', 'Before reaching this cell, which pixels of the row above could the seam be on?'), T('挑能量最低的那一个，再加上这一格自己的能量。', 'Pick the lowest of them, then add this cell’s own energy.')],
    diagnose: c => (!usesSensor(c, 'ul') || !usesSensor(c, 'ur') ? tr('缝每一步可以往左下、正下、右下走：上一行的左上、正上、右上都是来路。', 'Each step of a seam may go below-left, straight down or below-right: up-left, up and up-right on the row above are all ways in.') : null),
    debrief: { title: T('三条来路', 'Three ways in'), body: [T('和「最省力」是同一副骨架：取较小，再加上本格。只是来路从两条变成了上一行的三条，起点从一格变成了整个顶行。', 'The same skeleton as “Least effort”: take the min, then add this cell. Only the ways in grew from two to three on the row above, and the start from one cell to the whole top row.')] },
  },
  {
    id: 'seam', ch: 17, title: T('最不起眼的一条缝', 'The least noticeable seam'), short: T('图片上的最省路线', 'The cheapest route through a picture'), mode: 'circuit', robot: 'scout',
    intro: [
      { t: T('现在换成真正的<b>图片</b>。图片也是一张表，每一格是一个像素。这一章的图片来自《视觉完备》的测试图库：灰色的背景上，写着几个亮的字母。', 'Now for real <b>pictures</b>. A picture is a table too, with one pixel per cell. This chapter’s pictures come from Vision Complete’s test images: a few bright letters on a grey background.'), fig: thumb(BIG) },
      { t: T('想把图片变窄一点，又不想把字母挤变形。办法是找一条从顶行到底行的<b>缝</b>：每行一个像素，每一步走到正下、左下或右下。拿掉这条缝，图片就窄了一列。', 'You want to make the picture a little narrower without squashing the letters. The trick is to find a <b>seam</b> from the top row to the bottom row: one pixel per row, each step going straight down, down-left or down-right. Take that seam out and the picture is one column narrower.') },
      { t: T('拿掉哪条缝最不显眼？看<b>能量</b>：一个像素和左右、上下的邻居差得越多，能量越高（字母的边缘），平平的背景能量很低。《视觉完备》里算过的边缘，就是这里的能量。缝上的能量加起来越小越好。', 'Which seam is least noticeable to remove? Look at the <b>energy</b>: the more a pixel differs from its neighbours left and right, above and below, the higher its energy (the edges of letters), while flat background has very little. The edges you computed in Vision Complete are the energy here. The lower a seam’s total energy, the better.'), fig: thumb(BIG, seamPath(BIG)) },
      { t: T('这不就是「最省力」那一关吗？只是走法换成了从上往下，来路换成了<b>左上、正上、右上</b>三格。表里每一格记「从顶行到这里，最省的缝要花多少能量」；最底一行里最小的那一格，就是整条缝的能量。格子角上的小数字是这个像素自己的能量。', 'Isn’t this just the “Least effort” level? Only now you walk from top to bottom, and the ways in are the three cells <b>up-left, up and up-right</b>. Each cell of the table records “the least energy a seam from the top row to here can cost”; the smallest cell in the bottom row is the energy of the whole seam. The small number in a cell’s corner is that pixel’s own energy.') },
    ],
    mission: { goal: T('算出每张图片里能量最小的缝：从顶行到底行，每行一个像素，每一步走到正下、左下或右下；缝的能量是一路上像素能量之和。', 'Find the lowest-energy seam in each picture: from the top row to the bottom row, one pixel per row, each step going straight down, down-left or down-right; a seam’s energy is the sum of the pixel energies along it.'), how: T('这一关会检查整张表。通过后，左边的小图上会标出这条缝。', 'This level checks the whole table. Once you pass, the seam is marked on the small picture to the left.') },
    world: 'pic', facts: ['energy', 'top'], palette: KIT, checkAll: true,
    tests: [test(P1), test(P2)],
    solution: circ([['c', 'bp:cheapest']], ['tap:ul>c:0', 'tap:up>c:1', 'tap:top>c:2', 'tap:energy>c:3', 'tap:ur>c:4', 'c>out:cell']),
    hints: [T('三条来路：左上、正上、右上，取较小。', 'Three ways in: up-left, up and up-right. Take the min.'), T('再加上这个像素自己的能量。顶行上面什么都没有：用放行闸在顶行送一个 0 进去（和「最省力」的起点一样）。', 'Then add this pixel’s own energy. There is nothing above the top row: use a Pass gate to let a 0 in on the top row (just like the start in “Least effort”).')],
    diagnose: c => (usesSensor(c, 'up') && !usesSensor(c, 'ul') && !usesSensor(c, 'ur') ? tr('只看正上方，缝就只能是一根笔直的竖线，剪掉时会从字母中间切过去。缝每一步可以往左下或右下斜一格：左上、右上也是来路。', 'Looking only straight up, a seam can only be a dead-straight vertical line, and cutting it out would slice through the middle of a letter. At each step a seam may slant one cell down-left or down-right, so up-left and up-right are ways in too.') : null),
    trace: t => ({ path: seamPath(t.img).map(p => p.join()) }),
    boardOpt: { minScale: 0.5, maxScale: 1.05 },
    debrief: { title: T('缝也是一条最省的路线', 'A seam is a cheapest route too'), body: [T('每一格 = 本格能量 + 上面三格里最小的。和「最省力」那一关一样，只是来路换了方向。', 'Each cell = its own energy + the smallest of the three cells above. Just like the “Least effort” level, only with the ways in turned round.'), T('缝沿着背景走，绕开了字母的边缘：边缘的能量太高，经过它太「贵」。', 'The seam runs through the background and skirts the letters’ edges: their energy is too high, so crossing them is too “expensive”.')], note: T('缝：每一格 = 本格能量 + 左上、正上、右上三格里最小的。', 'Seam: each cell = its own energy + the smallest of up-left, up and up-right.') },
  },
  {
    id: 'carve', ch: 17, title: T('剪掉它', 'Cut it out'), short: T('图片窄了，字母没变形', 'A narrower picture, letters intact'), mode: 'seam', img: BIG, cuts: 8,
    intro: [
      { t: T('上一关你算出了缝表。这一关把缝真的剪掉。', 'Last level you worked out the seam table. This level you actually cut seams out.') },
      { t: T('第一条缝你来找：先点最底一行里最小的那一格，再一行一行往上倒推。上一行三个候选里，缝是从哪一格来的？', 'You find the first seam: click the smallest cell in the bottom row, then trace back up row by row. Of the three candidates on the row above, which one did the seam come from?') },
      { t: T('剪掉一条以后，图片窄了一列，能量和缝表都要重新算。后面的缝交给机器，一共剪掉 8 条。最后和「直接压扁」比一比。', 'Once a seam is cut, the picture is a column narrower, and the energy and seam table have to be worked out again. Leave the remaining seams to the machine, 8 in all. At the end, compare the result with simply squashing the picture.') },
    ],
    mission: { goal: T('找出能量最小的缝，把它剪掉。一共剪掉 8 条缝，让图片窄 8 列。', 'Find the lowest-energy seam and cut it out. Cut 8 seams in all, making the picture 8 columns narrower.'), how: T('第一条缝自己倒推：点最底一行最小的格子，再一行一行往上点。后面的缝可以让机器来剪。', 'Trace the first seam back yourself: click the smallest cell in the bottom row, then click your way up row by row. The machine can cut the rest.') },
    unlock: 'seam',
    debrief: { title: T('内容感知缩放', 'Content-aware resizing'), body: [T('图片窄了 8 列，两个字母一点没变形：缝都从不起眼的背景里穿过去了。直接压扁的话，每个字母都会被挤瘦。', 'The picture is 8 columns narrower, and neither letter is distorted at all: every seam slipped through unremarkable background. Squash the picture instead, and every letter gets squeezed thin.'), T('这叫<b>内容感知缩放</b>（seam carving）。修图软件把一张横幅照片改成竖屏时，用的就是它：一张缝表，加上一次倒推。', 'This is called <b>content-aware resizing</b> (seam carving). When photo-editing software turns a landscape photo into a portrait one, this is how: a seam table, plus one trace back.'), T('你在《视觉完备》里算出的边缘，在这里成了机器人的地形。两个游戏共用的不只是底层的代码，还有思路。', 'The edges you computed in Vision Complete became the robot’s terrain here. The two games share more than code underneath: they share ideas.')], note: T('剪缝：从缝表最底一行最小的格子倒推，剪掉这条缝，图片窄一列。', 'Seam carving: trace back from the smallest cell in the seam table’s bottom row, cut that seam out, and the picture is one column narrower.') },
  },
];
