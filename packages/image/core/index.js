import { startValues, benchRun } from './bench.js'
export { GLYPHS, addNoise, approximateNormal, correlate, downsample, fromFn, gaussianKernel, image, map, maxPool, patterns, random, row, shift, zip } from './engine/image.js'
export { affineFit, cross3, distanceToLine, homographyDLT, houghAccumulate, houghPeaks, invert3, lineGap, lineThrough, pointAlongLine, polarLine, project, ransacLine } from './engine/match.js'
export { LETTER, TILES, picture } from './items/pictures.js'
export { attention, attentionWeights } from './engine/attention.js'
export { highpass } from './engine/fourier.js'
export { boxBlur3, gradientMagnitude, horizontalDifference, peaksOf, sobelGradient, squaredGradient } from './engine/filters.js'
export { CURVES, lambertShade, sensorReading } from './engine/parts/light.js'
export { compose } from './engine/colour.js'
export { houghGrid, pairsOf, warp } from './engine/parts/matching.js'
export { blob, blobAt, encodeBlobCentre, gaussian } from './engine/parts/generative.js'
export { piText } from './engine/pi.js'
export { aliasOf, cosine, maxDiff, sampleAt, sinusoid, throughSamples } from './engine/waves.js'

import { registeredOperations, registeredValueTypes, withHidden, taskModule, runtimeWorks } from 'kernel'
import { IMAGE_OPS } from './engine/definitions.js'
import { meaning } from './catalog.js'
import runtime from './runtime.js'
import { imageWorks } from './work.js'
import { imageBoards } from './engine/board-view.js'
import { startBoard } from './engine/board.js'
import { play } from './play.js'

export { extendVocabulary } from './catalog.js'
export { imageWorks, prepareImageWorks } from './work.js'
export { imageBoards } from './engine/board-view.js'
export { default as runtime } from './runtime.js'

const scopedWorks = new WeakMap()

export function imageContext({ content, task, progress }) {
  const imageOnly = content.levels.every(level => level.tasks.every(task => taskModule(task) === 'image'))
  if (!imageOnly && !scopedWorks.has(content)) scopedWorks.set(content, runtimeWorks(content, [{ id: 'image', runtime }]).works[0])
  const works = imageOnly ? imageWorks(content) : scopedWorks.get(content)
  if (progress) works.syncOwn(progress.built)
  const name = task.taskId ?? task.id
  const prepared = works.LEVELS.flatMap(level => level.tasks).find(task => task.taskId === name || task.key === name)
  if (!prepared) throw new Error(`unknown image task ${name}`)
  return { task: prepared, works }
}

export const graphPlay = {
  initial(context) { return startBoard(imageContext(context).task) },
  read(work, context) { const { task, works } = imageContext(context); return Array.isArray(work) ? works.kit.fromText(work, task) : work },
  write: work => work,
  normalize: work => work,
  run(work, context) { const { task, works } = imageContext(context); return works.kit.runLevel(withHidden(task), work) },
  judge: report => ({ pass: report.pass, score: report.score }),
  runtime,
}
export const benchPlay = {
  initial(context) { return startValues(imageContext(context).task.bench) },
  read: work => work, write: work => work, normalize: work => work,
  run(work, context) { const { task } = imageContext(context); return benchRun(task.bench, task.model, work) },
  judge: report => ({ pass: report.pass, score: report.pass ? 1 : 0 }), runtime,
}
export const probePlay = {
  initial: () => null,
  read: work => work, write: work => work, normalize: work => work,
  run(work, context) { const { task } = imageContext(context); return { pass: task.probe.judge(work) } },
  judge: report => ({ pass: report.pass, score: report.pass ? 1 : 0 }), runtime,
}
export function register(kernel) {
  Object.assign(registeredOperations, IMAGE_OPS)
  registeredValueTypes['image:image'] = { about: { en: 'An image or scalar image with named colour channels', zh: '带颜色通道的图像或标量图像' } }
  kernel.kind('image:level', meaning)
  kernel.play('image:graph', graphPlay)
  kernel.play('image:board', benchPlay)
  kernel.play('image:probe', probePlay)
  kernel.check('image:levels', ({ content }) => content.levels.some(level => level.tasks.some(task => taskModule(task) === 'image')) ? runtime.validate(runtime.spec(content)) : [])
  for (const name of ['image:graph', 'image:board', 'image:probe']) kernel.agent(name, {
    observe: context => play.open(textContext(context)),
    act: (context, work) => play.attempt(textContext(context), work),
  })
}
function textContext(context) {
  const { task, works } = imageContext(context)
  return { game: { image: works, circuit: imageBoards(works), parts: { all: Object.entries(works.kit.types).map(([type, spec]) => ({ key: `part:${type}`, part: type, name: spec.label, desc: spec.desc })) } }, level: { ...task, source: task }, flags: context.flags ?? new Set(context.progress?.flags ?? []), progress: context.progress ?? {} }
}

export * from './bench.js'
