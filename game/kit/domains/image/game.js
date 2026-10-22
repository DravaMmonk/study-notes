// An image game on the shared shell (../../shell): its spec becomes the shell's game description, with the image
// domain's level screens (circuits, benches, the probe), its parts box and its intro figures.
import { createElement } from 'react'
import '../../../../trace-viewer/src/index.css'
import './image.css'
import './ui/boards/kit.css'
import { FlaskConical, Workflow } from 'lucide-react'
import { defineGame } from '../../shell/index.js'
import { introductions, isCore } from '../../course.js'
import { migrations } from '../../shell/saves.js'
import { NODE_TYPES } from './engine/nodes.js'
import LevelScreen from './ui/LevelScreen.jsx'
import PartDemo from './ui/PartDemo.jsx'
import Hero from './ui/Hero.jsx'
import IntroFigure from './ui/IntroFigure.jsx'
import { descriptionOf, familyOf, iconOf } from './ui/catalog.js'

// Unlock flags → the part (or option) they give, for the passed dialog and the parts box.
const partOfFlag = () => {
  const map = Object.fromEntries(Object.entries(NODE_TYPES).filter(([, spec]) => spec.unlock).map(([type, spec]) => [spec.unlock, type]))
  return { ...map, shift: 'shift', invert: 'invert' }
}
// What a setting (not a part of its own) does, for the parts box.
const OPTION_DESCRIPTIONS = {
  'edge-pad': { zh: '平移元件的「边界」设置多了「复制边缘」：图外缺的值，用离它最近的边上像素代替，不再补 0，图边就不会冒出一道假的黑框。', en: 'The Shift part’s “Border” setting gains “Replicate edge”: a value missing beyond the picture takes the nearest pixel on the edge instead of 0, so no false black frame appears round the picture.' },
  'edge-filter': { zh: '3×3 平均、高斯、Sobel 这些滤波元件的「边界」设置多了「复制边缘」，边上一圈不会因为补 0 而发黑。', en: 'The “Border” setting on filters such as the 3×3 average, the Gaussian and Sobel gains “Replicate edge”, so the border no longer darkens from padding with 0.' },
}
const OPTION_NAMES = {
  'edge-pad': { zh: '平移补边：复制边缘', en: 'Shift padding: replicate edge' },
  'edge-filter': { zh: '滤波补边：复制边缘', en: 'Filter padding: replicate edge' },
  shift: { zh: '平移', en: 'Shift' },
  invert: { zh: '反相', en: 'Invert' },
}

/**
 * spec: { id, title, kicker, lede, power, chapters (imageCourse's CHAPTERS), levels (its LEVELS), image (the whole
 * imageCourse result), intros: { level id: pages }, glossary: { groups, entries }, saves: migration steps
 * (../../shell/saves.js), box: { sample, inSolution, rewrite } how the parts box tries a part (ui/PartDemo.jsx) }
 */
export function defineImageGame(spec) {
  const PART_OF_FLAG = partOfFlag()
  const unlockOf = (flag) => {
    const type = PART_OF_FLAG[flag]
    if (type && NODE_TYPES[type]) return { key: flag, label: NODE_TYPES[type].label, name: NODE_TYPES[type].label, desc: descriptionOf(type), family: familyOf(type), icon: iconOf(type) }
    return { key: flag, label: OPTION_NAMES[flag] ?? flag, name: OPTION_NAMES[flag] ?? flag, desc: OPTION_DESCRIPTIONS[flag] }
  }
  const allFlags = [...new Set(spec.levels.flatMap((level) => level.unlocks ?? []))]
  const { course } = spec.image
  // The primitives, each from the levels that bring it in.
  const primitives = [...introductions(course)].map(([type, at]) => ({ key: `part:${type}`, type, label: NODE_TYPES[type].label, name: NODE_TYPES[type].label, desc: descriptionOf(type), family: familyOf(type), icon: iconOf(type), at }))
  // A part on a bench in the parts box shows every setting, whatever the player has unlocked so far.
  const allFlagSet = new Set(allFlags)
  const game = defineGame({
    id: spec.id,
    glossary: spec.glossary,
    title: spec.title,
    kicker: spec.kicker,
    lede: spec.lede,
    Hero,
    power: spec.power,
    chapters: spec.chapters.map((chapter) => ({ ...chapter, label: chapter.lecture })),
    levels: spec.levels,
    progress: migrations(spec.saves ?? []),
    intro: (level) => spec.intros[level.id],
    IntroFigure,
    kinds: {
      graph: { Screen: LevelScreen, icon: Workflow, label: { zh: '搭电路', en: 'Build a circuit' } },
      board: { Screen: LevelScreen, icon: FlaskConical, label: { zh: '机关台', en: 'Bench' } },
      probe: { Screen: LevelScreen, icon: FlaskConical, label: { zh: '机关台', en: 'Bench' } },
    },
    unlocked: (level) => (level.unlocks ?? []).map(unlockOf),
    core: (level) => isCore(course, level),
    parts: { all: [...primitives, ...allFlags.map(unlockOf)], demo: (part, { phone }) => createElement(PartDemo, { key: part.key, flag: part.key, type: part.type ?? PART_OF_FLAG[part.key], home: part.at?.[0], flags: allFlagSet, phone, levels: spec.levels, box: spec.box }) },
    // A better circuit costs less, or as much with fewer parts.
    better: (score, best) => !best || score.cost < best.cost || (score.cost === best.cost && score.nodes < best.nodes),
    bestLabel: (best) => `${best.nodes} · ${best.cost}`,
  })
  game.image = spec.image
  return game
}
