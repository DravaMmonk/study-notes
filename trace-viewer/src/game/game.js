import { createElement } from 'react'
import { FlaskConical, Workflow } from 'lucide-react'
import { defineGame } from '../../../games/kit/shell/index.js'
import { NODE_TYPES } from './engine/nodes.js'
import { GLOSSARY, GLOSSARY_GROUPS } from './glossary.js'
import { CHAPTERS, LEVELS } from './levels/index.js'
import { INTROS } from './levels/intros/index.js'
import { PLANNED } from './levels/planned.js'
import LevelScreen from './screens.jsx'
import PartDemo from './ui/PartDemo.jsx'
import Hero from './ui/Hero.jsx'
import IntroFigure from './ui/IntroFigure.jsx'
import { descriptionOf, familyOf, iconOf } from './ui/catalog.js'

// Vision Complete as content on the shared game shell (games/kit/shell): its chapters and levels, the figures in
// its 引入, its parts, and the screens that play its three kinds of level.

// Unlock flags → the part (or option) they give, for the passed dialog and the parts box.
const PART_OF_FLAG = Object.fromEntries(Object.entries(NODE_TYPES).filter(([, spec]) => spec.unlock).map(([type, spec]) => [spec.unlock, type]))
PART_OF_FLAG.shift = 'shift'
PART_OF_FLAG.invert = 'invert'
// What a setting (not a part of its own) does, for the parts box.
const OPTION_DESCRIPTIONS = {
  'edge-pad': { zh: '元件的「边界」设置多了「复制边缘」：图外缺的值，用离它最近的边上像素代替，不再补 0，图边就不会冒出一道假的黑框。', en: 'A component’s “Border” setting gains “Replicate edge”: a value missing beyond the picture takes the nearest pixel on the edge instead of 0, so no false black frame appears round the picture.' },
}
const OPTION_NAMES = {
  'edge-pad': { zh: '补边方式：复制边缘', en: 'Padding: replicate edge' },
  shift: { zh: '平移', en: 'Shift' },
  invert: { zh: '反相', en: 'Invert' },
}
const unlockOf = (flag) => {
  const type = PART_OF_FLAG[flag]
  if (type && NODE_TYPES[type]) return { key: flag, label: NODE_TYPES[type].label, name: NODE_TYPES[type].label, desc: descriptionOf(type), family: familyOf(type), icon: iconOf(type) }
  return { key: flag, label: OPTION_NAMES[flag] ?? flag, name: OPTION_NAMES[flag] ?? flag, desc: OPTION_DESCRIPTIONS[flag] }
}
const ALL_FLAGS = [...new Set(LEVELS.flatMap((level) => level.unlocks ?? []))]
// A part on a bench in the parts box shows every setting, whatever the player has unlocked so far.
const ALL_FLAG_SET = new Set(ALL_FLAGS)

// Saves before the shell: versions 1–6 renamed level ids as chapters were rebuilt (null drops a level's state);
// version 7 is the shell's shape (boards → data, seenIntro → seenPower).
const RENUMBERED = {
  2: { '2-1': '2-8', '2-2': '2-4', '2-3': '2-6', '2-4': '2-9' },
  3: { '3-1': '3-5', '3-2': '3-7' },
  4: { '3-2': '3-4', '3-3': null, '3-4': '3-5', '3-5': '3-6', '3-6': '3-7', '3-7': '3-8' },
  5: { '4-1': '4-2', '4-2': '4-4', '4-3': '4-6', '4-4': '4-7', '4-5': '4-8', '4-6': '4-9', '4-7': '4-11' },
  6: { '1-7': '1-8', '1-8': '1-9' },
}
function migrate(saved) {
  let out = saved
  for (let version = (saved.version ?? 1) + 1; version <= 6; version++) {
    const moved = RENUMBERED[version] ?? {}
    const to = (id) => (id in moved ? moved[id] : id)
    const rename = (record) => Object.fromEntries(Object.entries(record).map(([id, value]) => [to(id), value]).filter(([id]) => id !== null))
    out = { ...out, solved: (out.solved ?? []).map(to).filter((id) => id !== null), boards: rename(out.boards ?? {}), best: rename(out.best ?? {}), introSeen: rename(out.introSeen ?? {}) }
  }
  if ((saved.version ?? 1) < 7) {
    const { boards, seenIntro, ...rest } = out
    out = { ...rest, data: boards ?? {}, seenPower: Boolean(seenIntro) }
  }
  return out
}

export default defineGame({
  id: 'vision-complete',
  glossary: { groups: GLOSSARY_GROUPS, entries: GLOSSARY },
  title: { zh: '视觉完备', en: 'Vision Complete' },
  kicker: { zh: 'COMP90086 · 计算机视觉', en: 'COMP90086 · Computer Vision' },
  lede: { zh: '没有讲解，只有元件、测试和一组输入输出。从“把图挪一格”开始，自己搭出模糊、边缘、角点和视差，最后让机器学会看。', en: 'No lectures: just parts, tests and a set of inputs and outputs. Start from “move the picture one pixel”, build blur, edges, corners and disparity yourself, and finally teach the machine to see.' },
  Hero,
  power: {
    title: { zh: '上电', en: 'Power on' },
    lines: [
      { zh: '探测器 V-0，视觉芯片已上电。', en: 'Probe V-0, vision chip powered on.' },
      { zh: '传感器把世界变成一格格数字，可你还看不懂它们。', en: 'Your sensor turns the world into a grid of numbers, but you cannot read them yet.' },
      { zh: '母舰会给你一系列测试。每通过一个，你就多一个可以用的元件。', en: 'The mothership will send you a series of tests. Each one you pass gives you a new part to use.' },
      { zh: '没有说明书。动手试，看测试图，读数字。', en: 'There is no manual. Try things, look at the test pictures, read the numbers.' },
    ],
  },
  chapters: CHAPTERS.map((chapter) => ({ ...chapter, label: chapter.lecture })),
  levels: LEVELS,
  planned: PLANNED,
  progress: { version: 7, migrate },
  intro: (level) => INTROS[level.id],
  IntroFigure,
  kinds: {
    graph: { Screen: LevelScreen, icon: Workflow, label: { zh: '搭电路', en: 'Build a circuit' } },
    board: { Screen: LevelScreen, icon: FlaskConical, label: { zh: '机关台', en: 'Bench' } },
    probe: { Screen: LevelScreen, icon: FlaskConical, label: { zh: '机关台', en: 'Bench' } },
  },
  unlocked: (level) => (level.unlocks ?? []).map(unlockOf),
  parts: { all: ALL_FLAGS.map(unlockOf), earned: (progress) => progress.flags, demo: (part, { phone }) => createElement(PartDemo, { key: part.key, flag: part.key, type: PART_OF_FLAG[part.key], flags: ALL_FLAG_SET, phone }) },
  // A better circuit costs less, or as much with fewer parts.
  better: (score, best) => !best || score.cost < best.cost || (score.cost === best.cost && score.nodes < best.nodes),
  bestLabel: (best) => `${best.nodes} · ${best.cost}`,
})
