// An image game on the shared shell (../../shell), from its content (games/DESIGN.md 6.3): the course (course.js)
// becomes the shell's game description, with the image domain's level screens (circuits, benches, the probe), its
// parts box and its intro figures.
import { createElement } from 'react'
import '../../../../trace-viewer/src/index.css'
import './image.css'
import '../../shell/bench/bench.css'
import { FlaskConical, Workflow } from 'lucide-react'
import { defineGame } from '../../shell/index.js'
import { introductions, isCore, levelLabels } from '../../course.js'
import { imageCourse } from './course.js'
import LevelScreen from './ui/LevelScreen.jsx'
import PartDemo from './ui/PartDemo.jsx'
import Hero from './ui/Hero.jsx'
import IntroFigure from './ui/IntroFigure.jsx'
import { IMAGE_WIDGETS } from './ui/PartWidgets.jsx'
import { familyOf, iconOf } from './ui/catalog.js'
import { descriptionOf } from './words.js'

// Unlock flags → the part (or option) they give in a course's part table, for the passed dialog and the parts box.
const partOfFlag = (types) => {
  const map = Object.fromEntries(Object.entries(types).filter(([, spec]) => spec.unlock).map(([type, spec]) => [spec.unlock, type]))
  return { ...map, shift: 'shift', invert: 'invert' }
}
// What a setting (not a part of its own) does, for the parts box.
const OPTION_DESCRIPTIONS = {
  'edge-filter': { zh: '平移和 3×3 平均、高斯、Sobel 这些滤波元件的「边界」设置多了「复制边缘」：图外缺的值，用离它最近的边上像素代替，不再补 0，图边就不会冒出一道假的黑框。', en: 'The “Border” setting of Shift and of filters such as the 3×3 average, the Gaussian and Sobel gains “Replicate edge”: a value missing beyond the picture takes the nearest pixel on the edge instead of 0, so no false black frame appears round the picture.' },
}
const OPTION_NAMES = {
  'edge-filter': { zh: '补边：复制边缘', en: 'Padding: replicate edge' },
  shift: { zh: '平移', en: 'Shift' },
  invert: { zh: '反相', en: 'Invert' },
}

/**
 * content (../../engine/content.js): { id, title, kicker, lede, power, eras, primitives, concept, replaces, views,
 * box: { sample, inLevel,
 * boards } how the parts box tries a part (ui/PartDemo.jsx), levels, glossary }.
 */
export default function imageGame(content) {
  const image = imageCourse(content)
  const { CHAPTERS, LEVELS, course, kit } = image
  const { types } = kit
  const PART_OF_FLAG = partOfFlag(types)
  const unlockOf = (flag) => {
    const type = PART_OF_FLAG[flag]
    if (type && types[type]) return { key: flag, ...(image.pieces[type] ? { piece: type } : {}), label: types[type].label, name: types[type].label, desc: descriptionOf(types, type), family: familyOf(type, types), icon: iconOf(type, types) }
    return { key: flag, label: OPTION_NAMES[flag] ?? flag, name: OPTION_NAMES[flag] ?? flag, desc: OPTION_DESCRIPTIONS[flag] }
  }
  // A level of several tasks shows what it unlocks as one: a flag an earlier task opens on the way (the Shift part's
  // replicate edge, before the filters') is part of what the level unlocks, not an item of its own.
  const shownUnlocks = (level) => level.unlocks.filter((flag) => !level.tasks.slice(0, -1).some((task) => task.opens.includes(flag)))
  const allFlags = [...new Set(LEVELS.flatMap(shownUnlocks))]
  // The primitives, each from the levels that bring it in.
  const primitives = [...introductions(course)].map(([type, at]) => ({ key: `part:${type}`, type, label: types[type].label, name: types[type].label, desc: descriptionOf(types, type), family: familyOf(type, types), icon: iconOf(type, types), at }))
  // The boards the parts box tries a part on, where a level's own reference (its last task's) spells it out in smaller
  // parts.
  const box = {
    sample: content.box.sample,
    inLevel: content.box.inLevel,
    boards: Object.fromEntries(Object.entries(content.box.boards ?? {}).map(([flag, lines]) => [flag, kit.fromText(lines, image.levelById[content.box.inLevel[flag]].tasks.at(-1))])),
  }
  const labels = levelLabels(content.eras, { notes: course.notes })
  const game = defineGame({
    id: content.id,
    course,
    notes: course.notes,
    glossary: content.glossary,
    title: content.title,
    kicker: content.kicker,
    lede: content.lede,
    Hero,
    power: content.power,
    chapters: CHAPTERS.map((chapter) => ({ ...chapter, label: chapter.lecture })),
    levels: LEVELS,
    intro: (level) => image.intros[level.id],
    IntroFigure,
    kinds: {
      graph: { Screen: LevelScreen, icon: Workflow, label: { zh: '搭电路', en: 'Build a circuit' } },
      board: { Screen: LevelScreen, icon: FlaskConical, label: { zh: '机关台', en: 'Bench' } },
      probe: { Screen: LevelScreen, icon: FlaskConical, label: { zh: '机关台', en: 'Bench' } },
    },
    unlocked: (level) => shownUnlocks(level).map(unlockOf),
    core: (level) => isCore(course, level),
    levelLabel: (level) => labels.get(level.id) ?? level.id,
    parts: { all: [...primitives, ...allFlags.map(unlockOf)], demo: (part, { phone }) => createElement(PartDemo, { key: part.key, kit, flag: part.key, type: part.type ?? PART_OF_FLAG[part.key], home: part.at?.[0], phone, levels: LEVELS, box }) },
    // A better circuit costs less, or as much with fewer parts.
    better: (score, best) => !best || score.cost < best.cost || (score.cost === best.cost && score.nodes < best.nodes),
    bestLabel: (best) => `${best.nodes} · ${best.cost}`,
  })
  game.image = image
  game.defined = { of: (type) => kit.defs[type] ?? null, defaults: kit.defaultParams, ops: kit.ops, widgets: IMAGE_WIDGETS }
  return game
}
