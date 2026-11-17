import { qualifyVocabulary } from 'kernel'
// The image domain's vocabulary (games/DESIGN.md 6.2): every thing an image game's content may name, each with what
// it is and the schema of its parameters, and the schemas of game.json and of one level. Content is these items and
// their parameters, and nothing else: whatever a level needs that is not here is a new item, written in this domain.
//
// The items are implemented next to their schemas: parts in engine/nodes.js and engine/parts/, pictures, scenes,
// targets, budgets, bench models and bench displays in items/.
import { defineVocabulary } from 'kernel'
import { displayItems } from './bench.js'
import { NODE_TYPES } from './engine/nodes.js'
import { IMAGE_OPS } from './engine/definitions.js'
import { PICTURES } from './items/pictures.js'
import { SCENES } from './items/scenes/index.js'
import { TARGETS } from './items/targets.js'
import { CONSTRAINTS } from './items/constraints.js'
import { BENCH_MODELS } from './items/benches.js'
import { DISPLAYS } from './items/displays.js'
import { T as t } from 'kernel'

/** A kind's items as the vocabulary prints them: what each is, and its parameters. */
const items = (all) => Object.fromEntries(Object.entries(all).map(([name, it]) => [name, { about: it.about, ...(it.params ? { params: it.params } : {}) }]))

/* ---------- the parts, what levels unlock, how a picture is drawn ---------- */

const PARTS = Object.fromEntries(Object.entries(NODE_TYPES).filter(([, spec]) => !spec.fixed && !spec.kit).map(([type, spec]) => [type, { about: spec.label, inputs: spec.inputs.map((name) => ({ name, type: 'image:image' })), outputType: 'image:image' }]))
// What a level may unlock: a part (its flag), one of a part's settings, or one option of a setting.
const FLAGS = new Map()
for (const spec of Object.values(NODE_TYPES)) {
  if (spec.unlock) FLAGS.set(spec.unlock, spec.label)

}
const UNLOCKS = Object.fromEntries([...FLAGS].map(([flag, about]) => [flag, { about }]))
// The ways a picture can be shown by the shared view system.
const VIEWS = {
  pixels: { about: t('像素：亮度显示为灰度') },
  terrain: { about: t('地形：亮度显示为高度') },
  slope: { about: t('坡度：等高线和指向变亮最快方向的箭头') },
  profile: { about: t('剖面：一行像素的亮度曲线') },
  spectrum: { about: t('频谱：各频率分量的强度') },
}

export const vocabulary = qualifyVocabulary('image', defineVocabulary({
  module: 'image',
  version: 1,
  kinds: {
    valueType: { 'image:image': { about: { en: 'An image or scalar image with named colour channels', zh: '带颜色通道的图像或标量图像' } } },
    part: PARTS,
    kind: {
      graph: { about: t('图像电路', 'Image circuit') },
      probe: { about: t('探针', 'Probe') },
      board: { about: t('参数台', 'Parameter bench') },
    },
    op: Object.fromEntries(Object.entries(IMAGE_OPS).map(([name, { about, args, returns, params }]) => [name, { about, args, returns, params }])),
    family: {
      pixel: { about: t('逐像素', 'Per-pixel') },
      neighbour: { about: t('看邻居', 'Neighbours') },
      size: { about: t('改尺寸', 'Resize') },
      search: { about: t('搜索与比较', 'Search and compare') },
      frequency: { about: t('频率', 'Frequency') },
      global: { about: t('看全局', 'Global') },
      learned: { about: t('可学习', 'Learnable') },
      other: { about: t('元件', 'Parts') },
    },
    widget: { imageKernel: { about: t('图像运算的权重表', 'Weight grid for image operations') } },
    unlock: UNLOCKS,
    view: VIEWS,
    picture: items(PICTURES),
    scene: Object.fromEntries(Object.entries(SCENES).map(([name, s]) => [name, { about: s.about, ...(s.setup ? { params: s.setup } : {}), test: s.test }])),
    target: items(TARGETS),
    constraint: items(CONSTRAINTS),
    benchModel: Object.fromEntries(Object.entries(BENCH_MODELS).map(([name, m]) => [name, { about: m.about, ...(m.setup ? { params: m.setup } : {}), ...(m.stage ? { stage: m.stage } : {}), ...(m.case ? { case: m.case } : {}) }])),
    display: Object.fromEntries(Object.entries(displayItems(DISPLAYS))),
  },

  // A level is a list of tasks (../../engine/tasks.js), each by its kind, and a circuit task by its scene too.

}), { bareKinds: ['part'], categories: { part: 'primitive' } })
