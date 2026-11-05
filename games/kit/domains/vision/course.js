// A vision game's course, from its content (games/<id>/: game.json, levels, glossary, parts.json; vocabulary.js says
// what may be in it), read by the circuit base (../../engine/circuit-domain.js circuitCourse): the play order and the
// level tree, each level's tasks, the parts the levels build and the course the shared audit checks. What is the
// domain's own is how a task of each kind reads — a board with its tests (numbers and images) and its sample; a grid
// task with its image and what it asks; a choice task with its rounds and judge; a bench with its model made — and
// the settings a built part takes from the parts.json presets its level names.
//
// Returns the course read (LEVELS, played: level id → its tasks read, …) with defs and presets, the game's parts and
// shared settings as its parts.json defines them (../../engine/parts/define.js), defaultsOf(type) a new card's
// settings, and settingsIn(task, type, key) the values of a setting a task offers (configurations.js); `wrong` says
// what reading the content found that its schema cannot say (a board that does not read, a pick outside the image,
// scenes that should look alike and do not).
import { circuitCourse } from '../../engine/circuit-domain.js'
import { defineParts, defaultOf, resolveSetting } from '../../engine/parts/define.js'
import { board } from './board.js'
import { OPS } from './ops.js'
import { readTest } from './run.js'
import { readSample } from './sample.js'
import { configurationPolicy } from './configurations.js'
import { fromRows, isVector } from './image.js'
import { askOf, gridCheck } from './grid.js'
import { windowResult } from './filter-window.js'
import { calculationResult } from './calculation.js'
import { judgeOf, optionsOf, verdictOf } from './judges.js'
import { revealing, sameImage } from './scene.js'
import { benchOf } from './benches/index.js'

/** A board task read: its groups of inputs, and its sample. */
function readBoard(task, say) {
  const grouped = new Set()
  const sourceNames = new Set([...task.inputs, ...task.outputs].map((p) => p.name))
  for (const group of task.inputGroups ?? []) {
    if (sourceNames.has(group.name)) say(`duplicate input group name ${group.name}`)
    sourceNames.add(group.name)
    for (const name of group.inputs) {
      if (!task.inputs.some((input) => input.name === name) || grouped.has(name)) say(`invalid or repeated grouped input ${name}`)
      grouped.add(name)
    }
  }
  for (const k of Object.keys(task.sample?.inputs ?? {})) if (!task.inputs.some((i) => i.name === k)) say(`the sample gives ${k}, which is no input`)
  return { ...task, ...(task.sample ? { sample: readSample(task, task.sample) } : {}) }
}

/** A test of a board task read: its values (numbers, images, vectors), given on every input and expected of every output. */
function readBoardTest(t, task, say) {
  for (const o of task.outputs) if (!(o.name in t.expect)) say(`a test expects nothing of the output ${o.name}`)
  for (const i of task.inputs) if (!(i.name in t.inputs)) say(`a test gives nothing on the input ${i.name}`)
  for (const i of task.inputs) if ((i.type === 'vector') !== isVector(t.inputs[i.name])) say(`input ${i.name}: vector values { x, y } go with a vector input, and only there`)
  for (const [k, v] of [...Object.entries(t.inputs), ...Object.entries(t.expect)]) if (Array.isArray(v) && !fromRows(v)) say(`${k}: its rows do not make an image (uneven rows, or not grey or RGB)`)
  return readTest(t)
}

/** A grid task read: its image. */
function readGrid(task, say) {
  const img = fromRows(task.image)
  if (!img) {
    say('its image rows do not make an image')
    return { ...task }
  }
  const { name, params } = askOf(task)
  if (task.calculation) {
    try {
      if (name !== 'fill' || gridCheck(task, calculationResult(task))) say('the calculation aid does not produce the requested output')
    } catch (error) { say(`invalid calculation aid: ${error.message}`) }
  }
  if (task.window) {
    const span = task.window.axis === 'row' ? img.w : img.h
    if (name !== 'fill' || img.c !== 1 || task.window.weights.length !== 3 || (task.window.padding === 'valid' && span < 3)) say('a filter window needs a greyscale fill task, three weights and at least three samples for valid padding')
    else if (gridCheck(task, windowResult(task.image, task.window))) say('the displayed window weights do not produce the requested output')
  }
  if (['pick', 'locate', 'set'].includes(name) && (params.x >= img.w || params.y >= img.h)) say(`(${params.x}, ${params.y}) is outside the ${img.w} × ${img.h} image`)
  if (name === 'set' && (Array.isArray(params.value) ? img.c !== 3 || params.value.length !== 3 : img.c !== 1)) say('the value to set is not a pixel of this image (a number for grey, [R, G, B] for colour)')
  if (name === 'fill' && !fromRows(params.rows)) say('the rows to fill do not make a grid')
  return { ...task, img }
}

/** A choice task read: its rounds, each with its options, and where a claim splits the candidate scenes, a view that shows why. */
function readChoice(task, say) {
  const { judge, name, params } = judgeOf(task.judge)
  const rounds = task.rounds.map((round, r) => {
    const options = optionsOf(round, name)
    const at = (text) => say(`round ${r + 1}: ${text}`)
    const problems = [
      !options.length && `the ${name} judge needs options`,
      new Set(options.map((o) => o.id)).size !== options.length && 'two options share an id',
      name === 'claims' && !round.scenes?.length && 'a claims round needs its candidate scenes',
      name === 'claims' && round.items.some((it) => !it.claim) && 'every item of a claims round is a claim',
      name === 'same' && (!round.reference || options.some((o) => !o.scene)) && 'the same judge needs a reference scene and a scene on every option',
      name === 'fields' && round.items.some((it) => !it.needs) && 'every item of a fields round says what it needs',
      round.scenes?.slice(1).some((sc) => !sameImage(round.scenes[0], sc)) && 'its candidate scenes do not all give the same picture',
    ].filter(Boolean)
    // A claim true in one candidate scene and false in another is shown, when answered wrong, from a view that tells
    // the two apart: one there must be.
    const reveals = name === 'claims' && !problems.length ? round.items.map((it, k) => {
      const { verdict, truths } = verdictOf(it.claim, round.scenes)
      if (verdict !== 'undetermined') return null
      const scenes = [truths.indexOf(true), truths.indexOf(false)]
      const camera = revealing(round.scenes[scenes[0]], round.scenes[scenes[1]])
      if (!camera) problems.push(`item ${k + 1}: scenes ${scenes[0] + 1} and ${scenes[1] + 1} look alike from every view, so the player cannot be shown why it is undetermined`)
      return camera && { scenes, camera }
    }) : null
    for (const p of problems) at(p)
    const read = { ...round, options, ...(reveals ? { reveals } : {}) }
    if (!problems.length && !judge.multi && judge.reference(read, params).some((picks) => picks.length > 1)) at(`the ${name} judge takes one option an item, and an item has several right ones`)
    return read
  })
  return { ...task, rounds }
}

/** A bench task read: its model made. */
function readBench(task, say) {
  try {
    return { ...task, made: benchOf(task.bench) }
  } catch (e) {
    say(`its bench: ${e.message}`)
    return { ...task }
  }
}

export function visionCourse(content) {
  const { PARTS, defs } = defineParts(content.partDefs, OPS)
  const presets = content.partDefs?.presets ?? {}
  // A built part's settings are the presets they name, with the level's defaults over them.
  const pack = (builds, say) => {
    for (const key of builds.settings ?? []) if (!presets[key]) say(`its part's setting ${key} is no preset of parts.json`)
    const settings = (builds.settings ?? []).filter((key) => presets[key]).map((key) => resolveSetting({ key, use: key, ...(builds.defaults?.[key] !== undefined ? { default: builds.defaults[key] } : {}) }, presets))
    return {
      params: settings.map((s) => s.key),
      settings: Object.fromEntries(settings.map((s) => [s.key, s.options.map((o) => o.value)])),
      fields: settings,
      defaults: Object.fromEntries(settings.map((s) => [s.key, defaultOf(s)])),
    }
  }
  const circuit = circuitCourse(content, { board, parts: PARTS, read: readBoard, test: readBoardTest, kinds: { grid: readGrid, choice: readChoice, bench: readBench }, pack })
  return {
    ...circuit,
    defs,
    presets,
    /** A new node's settings: a defined part's, or the ones a built part exposes. */
    defaultsOf: (type) => circuit.partOf(type)?.defaults ?? {},
    settingsIn: configurationPolicy(circuit.LEVELS, circuit.course, circuit.partOf),
  }
}
