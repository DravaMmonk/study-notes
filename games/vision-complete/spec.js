// 视觉完备 Vision Complete: the computer vision course of COMP90086 as a Turing Complete style game, on the image
// domain (kit/domains/image). Everything here is the course; the game it makes is game.js.
import { shiftIds } from '../kit/shell/saves.js'
import { GLOSSARY, GLOSSARY_GROUPS } from './glossary.js'
import { IMAGE, LEVELS, course } from './levels/index.js'
import { INTROS } from './levels/intros/index.js'
import { RENAMED } from './levels/route.js'

// Saves from older versions. Versions 2–6 renamed level ids as chapters were rebuilt (null drops a level's state);
// version 7 is the shell's shape (boards → data, seenIntro → seenPower).
const RENUMBERED = {
  2: { '2-1': '2-8', '2-2': '2-4', '2-3': '2-6', '2-4': '2-9' },
  3: { '3-1': '3-5', '3-2': '3-7' },
  4: { '3-2': '3-4', '3-3': null, '3-4': '3-5', '3-5': '3-6', '3-6': '3-7', '3-7': '3-8' },
  5: { '4-1': '4-2', '4-2': '4-4', '4-3': '4-6', '4-4': '4-7', '4-5': '4-8', '4-6': '4-9', '4-7': '4-11' },
  6: { '1-7': '1-8', '1-8': '1-9' },
}
// Version 9 dropped 1-7 (the vertical difference now comes with 1-6) and moved the later chapter-1 levels up one.
const SHIFTED = { '1-7': null, ...Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`1-${i + 8}`, `1-${i + 7}`])) }
// Version 11 rebuilt chapter 5 as a loop: attention is built from two patches first.
const CH5 = { '5-1': '5-2', '5-2': '5-5', '5-3': '5-7' }
// Version 12 rebuilt chapters 6–8 as loops; benches that became circuits drop their state.
const CH6_8 = { '6-2': null, '6-3': '6-6', '6-4': '6-8', '6-5': '6-11', '7-3': null, '7-4': null, '8-2': '8-4', '8-3': '8-6' }
// Version 13 dropped 1-16 (the scanner finale covers it); the scanner moved up to 1-16.
const SCANNER = { '1-16': null, '1-17': '1-16' }
// Version 15 spells every key of a board in ASCII, so a board reads as plain text (kit/circuit/text.js): Shift's
// directions by name, the reparameterisation's ports as mu, sigma, eps.
const ARROWS = { '→': 'right', '←': 'left', '↓': 'down', '↑': 'up' }
const GREEK = { μ: 'mu', σ: 'sigma', ε: 'eps' }
const asciiCircuit = (c) => ({
  ...c,
  nodes: c.nodes.map((n) => (n.type === 'shift' && n.params?.dir in ARROWS ? { ...n, params: { ...n.params, dir: ARROWS[n.params.dir] } } : n)),
  wires: c.wires.map((w) => (w.port in GREEK ? { ...w, port: GREEK[w.port] } : w)),
})
// Version 16 made the two padding levels (1-11, 1-12) the two tasks of 1-11 and moved the rest of chapter 1 down one,
// and put two practice levels into chapter 4 (4-14 on the multichannel kernel, 4-17 on residual blocks), moving the
// levels after each up; whoever passed a level after one of them has passed it.
const PADDING = { '1-13': '1-12', '1-14': '1-13', '1-15': '1-14', '1-16': '1-15' }
const CH4 = { '4-14': '4-15', '4-15': '4-16', '4-16': '4-18', '4-17': '4-19', '4-18': '4-20', '4-19': '4-21' }
const asciiBoard = (board) => (board?.nodes ? { ...asciiCircuit(board), ...(board.passed && { passed: asciiCircuit(board.passed) }) } : board)
const SAVES = [
  ...Object.entries(RENUMBERED).map(([version, moved]) => ({ version: Number(version), ops: [{ rename: moved }] })),
  { version: 7, ops: [{ fields: { boards: 'data', seenIntro: 'seenPower' } }] },
  // Version 8 rebuilt chapters as loops and renumbered their levels.
  { version: 8, ops: [{ rename: RENAMED }] },
  { version: 9, ops: [{ rename: SHIFTED }, { grant: ['1-6', 'diffy'] }] },
  // Version 10 split replicate edge: Shift gets it from 1-11, the filters from 1-12, which used to unlock nothing.
  { version: 10, ops: [{ grant: ['1-12', 'edge-filter'] }] },
  { version: 11, ops: [{ rename: CH5 }] },
  { version: 12, ops: [{ rename: CH6_8 }] },
  { version: 13, ops: [{ rename: SCANNER }] },
  // Version 14 turned 2-2 into the stacking bench, which hands out the Average part, and opened the probe series with
  // two benches before the probe (2-3 → 2-5, and the rest of chapter 2 two on); whoever built the probe has met them.
  { version: 14, ops: [{ grant: ['2-2', 'mean'] }, { rename: shiftIds('2-', 3, 2) }, { solve: ['2-5', ['2-3', '2-4']] }] },
  { version: 15, ops: [{ data: asciiBoard }] },
  { version: 16, ops: [{ merge: ['1-11', ['1-11', '1-12']] }, { rename: PADDING }, { rename: CH4 }, { solve: ['4-15', ['4-14']] }, { solve: ['4-19', ['4-17']] }, { solve: ['5-1', ['4-17']] }] },
]

// How the parts box tries a part: a part from a level without tests on 1-1's pictures; the decoder and the
// reparameterisation inside 8-2's own circuit, where μ + σ·ε (a multiply and an add there) becomes one card.
const BOX = {
  sample: '1-1',
  inSolution: { 'dg-decoder': '8-2', 'dg-reparam': '8-2' },
  rewrite: {
    'dg-reparam': (g) => ({
      nodes: [...g.nodes.filter((n) => n.id !== 'x' && n.id !== 'a'), { id: 'r', type: 'dg_reparam', params: {}, x: g.nodes.find((n) => n.id === 'x').x, y: g.nodes.find((n) => n.id === 'x').y }],
      wires: [...g.wires.filter((w) => !['x', 'a'].includes(w.to) && !['x', 'a'].includes(w.from)), { from: 'm', to: 'r', port: 'μ' }, { from: 's', to: 'r', port: 'σ' }, { from: 'eps', to: 'r', port: 'ε' }, { from: 'r', to: 'd', port: 'in' }],
    }),
  },
}

export default {
  id: 'vision-complete',
  domain: 'image',
  title: { zh: '视觉完备', en: 'Vision Complete' },
  kicker: { zh: 'COMP90086 · 计算机视觉', en: 'COMP90086 · Computer Vision' },
  lede: { zh: '没有讲解，只有元件、测试和一组输入输出。从“把图挪一格”开始，自己搭出模糊、边缘、角点和视差，最后让机器学会看。', en: 'No lectures: just parts, tests and a set of inputs and outputs. Start from “move the picture one pixel”, build blur, edges, corners and disparity yourself, and finally teach the machine to see.' },
  power: {
    title: { zh: '上电', en: 'Power on' },
    lines: [
      { zh: '探测器 V-0，视觉芯片已上电。', en: 'Probe V-0, vision chip powered on.' },
      { zh: '传感器把世界变成一格格数字，可你还看不懂它们。', en: 'Your sensor turns the world into a grid of numbers, but you cannot read them yet.' },
      { zh: '母舰会给你一系列测试。每通过一个，你就多一个可以用的元件。', en: 'The mothership will send you a series of tests. Each one you pass gives you a new part to use.' },
      { zh: '没有说明书。动手试，看测试图，读数字。', en: 'There is no manual. Try things, look at the test pictures, read the numbers.' },
    ],
  },
  chapters: IMAGE.CHAPTERS,
  levels: LEVELS,
  image: IMAGE,
  course,
  intros: INTROS,
  glossary: { groups: GLOSSARY_GROUPS, entries: GLOSSARY },
  saves: SAVES,
  box: BOX,
  // Names a text may quote rather than link: a level, part or entry name used for something else (a phrase, a button).
  quotes: ['采样', '异或', '训练'],
  texts: { chapters: IMAGE.CHAPTERS, intros: INTROS, glossary: GLOSSARY },
}
