import { stageDefinition } from '../../../../packages/circuit/core/index.js'
import { loadDisplays, benchDisplays } from '../../engine/displays.js'
// An image game on the shared shell (../../shell), from its content (games/DESIGN.md 6.3): the course (course.js)
// becomes the shell's game description, with the image domain's play resources, its
// parts box and its intro figures.
import { FlaskConical, Workflow } from 'lucide-react'
import { defineGame } from '../../../../packages/circuit/view/index.jsx'
import { levelLabels } from '../../course.js'
import { introductions, isCore } from '../../../../packages/circuit/core/index.js'
import { imageWorks } from './work.js'
import { playKinds } from '../../shell/plays/Play.jsx'
import { plays } from './plays.js'
import { partsFor } from '../../../../packages/circuit/view/index.jsx'
import { imageBoards } from './engine/board-view.js'
import { imagePreview } from './engine/preview.js'
import { descriptionOf } from './words.js'

const ui = await loadDisplays(['image:hero', 'image:introduction', 'image:circuit', 'image:widget-imageKernel', 'image:catalog', 'image:probe'])
const { familyOf, iconOf } = ui['image:catalog']
const parameters = ({ bench, model }) => ({ bench, model, displays: benchDisplays(bench.layout) })

// Unlock flags → the part (or option) they give in a course's part table, for the passed dialog and the parts box.
const partOfFlag = (types) => {
  const map = Object.fromEntries(Object.entries(types).filter(([, spec]) => spec.unlock).map(([type, spec]) => [spec.unlock, type]))
  return map
}
/**
 * content (../../engine/content.js): { id, title, kicker, lede, power, eras, primitives, concept, replaces, views,
 * levels, glossary }.
 */
export default function imageGame(content, image = imageWorks(content)) {
  const { CHAPTERS, LEVELS, course, kit } = image
  const { types } = kit
  const PART_OF_FLAG = partOfFlag(types)
  const unlockOf = (flag) => {
    const type = PART_OF_FLAG[flag]
    if (type && types[type]) return { key: flag, part: type, label: types[type].label, name: types[type].label, desc: descriptionOf(types, type), family: familyOf(type, types), icon: iconOf(type, types) }
    return { key: flag, label: flag, name: flag }
  }
  // A level of several tasks shows what it unlocks as one: a flag an earlier task opens on the way (the Shift part's
  // replicate edge, before the filters') is part of what the level unlocks, not an item of its own.
  const shownUnlocks = (level) => level.unlocks.filter((flag) => !level.tasks.slice(0, -1).some((task) => task.opens.includes(flag)))
  const allFlags = [...new Set(LEVELS.flatMap(shownUnlocks))]
  // The primitives, each from the levels that bring it in.
  const primitives = [...introductions(course)].filter(([type]) => types[type]).map(([type, at]) => ({ key: `part:${type}`, type, part: type, label: types[type].label, name: types[type].label, desc: descriptionOf(types, type), family: familyOf(type, types), icon: iconOf(type, types), at }))
  const boards = imageBoards(image)
  const cards = Object.fromEntries(Object.keys(types).map((type) => [type, {
    name: types[type].label, desc: descriptionOf(types, type), family: familyOf(type, types), icon: iconOf(type, types),
  }]))
  const levels = LEVELS.map((level) => ({ ...level, tasks: level.tasks.map((task) => ({ ...task, source: task })) }))
  const labels = levelLabels(content.eras)
  const game = defineGame({
    id: content.id,
    course,
    notes: course.notes,
    glossary: content.glossary,
    title: content.title,
    kicker: content.kicker,
    lede: content.lede,
    Hero: ui['image:hero'],
    power: content.registries.power[content.power],
    chapters: CHAPTERS,
    levels,
    intro: (level) => image.intros[level.id],
    IntroFigure: (props) => ui['image:introduction']({ ...props, types }),
    kinds: playKinds(plays, { imageCircuit: ui['image:circuit'](image, cards), parameters, probe: ui['image:probe'] }, {
      'image:graph': { icon: Workflow, label: { zh: '搭电路', en: 'Build a circuit' } },
      'image:board': { icon: FlaskConical, label: { zh: '机关台', en: 'Bench' } },
      'image:probe': { icon: FlaskConical, label: { zh: '机关台', en: 'Bench' } },
    }),
    unlocked: (level) => [...shownUnlocks(level).map(unlockOf), ...course.awards({ id: level.id }).map(id => {
      const stage = course.stages.get(id)
      return { part: stage.part, label: stage.definition.name, icon: iconOf(stage.part, types) }
    })],
    core: (level) => isCore(course, level),
    levelLabel: (level) => labels.get(level.id) ?? level.id,
    parts: {
      all: [...primitives, ...allFlags.map(unlockOf)],
      settings: (part, progress) => {
        const staged = game.textFor(part, progress)
        const stage = course.stages.get(staged.stage ?? part.part)
        const definition = stage && stageDefinition(stage)
        return (definition?.settings ?? []).filter(setting => !setting.fixed).map(setting => ({
          key: setting.key, label: setting.label ?? setting.key,
          values: (setting.options ?? []).map(option => ({ value: option.value, label: option.label ?? option.value })),
        }))
      },
      preview: (part, { progress }) => {
        image.syncOwn(progress?.built)
        const made = imagePreview(image, content.registries.box[content.box], part)
        return {
          sample: made && { ...made, parts: partsFor(made.task, boards.forTask(made.task), { cards, portLabels: {}, defined: game.defined }) },
          inside: boards.BUILT[part.part] && { course: boards, cards },
        }
      },
    },
    // A better circuit costs less, or as much with fewer parts.
    better: (score, best) => !best || score.cost < best.cost || (score.cost === best.cost && score.nodes < best.nodes),
    bestLabel: (best) => `${best.nodes} · ${best.cost}`,
  })
  game.circuit = boards
  game.image = image
  game.defined = { of: (type) => kit.defs[type] ?? null, defaults: kit.defaultParams, ops: kit.ops, widgets: { 'image:widget-imageKernel': ui['image:widget-imageKernel'] } }
  return game
}
