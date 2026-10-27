// 第 11 章 · 看它在看哪 (lecture 23, the revision lecture). Of its worked examples, the one no earlier chapter plays:
// a classifier calls a picture "car"; does it look at the car or at the road? The classifier here is linear, a weight
// for every cell (its score is the sum of weight × brightness), so every test can hand over its weights as a picture.
// Steps: what each cell adds to the score, and what blacking out a block takes away (occlusion sensitivity), with a
// grey block (packed as the occlusion map) and a larger one; how much of the score comes from inside the object; and
// for a ViT, how much of the class token's attention falls on it. Series: a check-up that turns the occlusion map
// into a verdict.
import { attention } from '../../kit/domains/image/engine/attention.js'
import { fromFn, image } from '../../kit/domains/image/engine/image.js'
import { build, test } from '../../kit/domains/image/build.js'

const num = (v) => image(1, 1, v)
const at = (img, x, y) => (x < 0 || y < 0 || x >= img.w || y >= img.h ? null : img.data[y * img.w + x])
const sum = (img) => img.data.reduce((s, v) => s + v, 0)
const times = (a, b) => fromFn(a.w, a.h, (x, y) => at(a, x, y) * at(b, x, y))

// ---------------- the street, the classifiers and the object ----------------
// A car (body 0.9, wheels 0.05) on a bright road (0.75, lane marks 0.95) under a dark sky (0.2), with a house (0.5)
// beside it in some streets. The car is 6 cells wide and 4 tall from (cx, 7); the road starts at row 11.

const street = ({ cx = 5, house = null, sky = 0.2 } = {}) =>
  fromFn(16, 16, (x, y) => {
    if (y === 11 && (x === cx + 1 || x === cx + 4)) return 0.05
    if (y >= 7 && y <= 10 && x >= cx && x < cx + 6) return 0.9
    if (y >= 11) return y === 13 && x % 4 < 2 ? 0.95 : 0.75
    if (house !== null && x >= house && x < house + 3 && y >= 6) return 0.5
    return sky
  })
const carMask = ({ cx = 5 } = {}) => fromFn(16, 16, (x, y) => ((y >= 7 && y <= 10 && x >= cx && x < cx + 6) || (y === 11 && (x === cx + 1 || x === cx + 4)) ? 1 : 0))

// Weights a classifier might have learnt. An honest one weighs the car where cars were in its training pictures; a
// cheat weighs the road (every car photo had road in it); others weigh both, or the wheels.
const WEIGHTS = {
  car: fromFn(16, 16, (x, y) => (y >= 7 && y <= 10 && x >= 5 && x < 11 ? 0.3 : 0)),
  road: fromFn(16, 16, (x, y) => (y >= 12 ? 0.25 : 0)),
  both: fromFn(16, 16, (x, y) => (y >= 7 && y <= 10 && x >= 4 && x < 12 ? 0.2 : y >= 13 ? 0.15 : 0)),
  wheels: fromFn(16, 16, (x, y) => (y === 11 ? -0.4 : y === 10 && x >= 4 && x < 12 ? 0.2 : 0)),
  sky: fromFn(16, 16, (x, y) => (y < 6 ? -0.2 : y >= 7 && y <= 10 && x >= 5 && x < 11 ? 0.25 : 0)),
  shadow: fromFn(16, 16, (x, y) => (y >= 11 && y <= 12 && x >= 4 && x < 12 ? 0.3 : y === 10 && x >= 5 && x < 11 ? 0.1 : 0)),
  wide: fromFn(16, 16, (x, y) => (y >= 6 && y <= 11 && x >= 3 && x < 13 ? 0.2 : 0)),
}
const W_LABEL = { in: { zh: '照片', en: 'Photo' }, w: { zh: '权重', en: 'Weights' }, m: { zh: '车的掩膜', en: 'Car mask' } }

// What blacking out (or greying out) a block takes from the score: the score before, less the score with every cell of
// the r×r block round a cell set to v. Cells beyond the picture are not there to cover.
const score = (x, w) => sum(times(x, w))
function occlusion(x, w, { v = 0, r = 3 } = {}) {
  const base = score(x, w)
  const half = (r - 1) / 2
  return fromFn(16, 16, (px, py) => {
    const covered = fromFn(16, 16, (x0, y0) => (Math.abs(x0 - px) <= half && Math.abs(y0 - py) <= half ? v : at(x, x0, y0)))
    return base - score(covered, w)
  })
}
// The share of a map that lies on the object.
const share = (map, m) => sum(times(map, m)) / sum(map)

const SCENES = [
  [{ zh: '老实的分类器', en: 'An honest classifier' }, { cx: 5 }, 'car'],
  [{ zh: '只看路的分类器', en: 'A classifier that looks at the road' }, { cx: 5 }, 'road'],
  [{ zh: '车停在路边的房子旁', en: 'A car by a house' }, { cx: 3, house: 11 }, 'both'],
  [{ zh: '看车轮的分类器', en: 'A classifier that looks at the wheels' }, { cx: 6 }, 'wheels'],
]
const SCENES_HIDDEN = [
  [{ zh: '车开到了左边', en: 'The car has moved left' }, { cx: 1 }, 'car'],
  [{ zh: '黑天也扣分的分类器', en: 'A classifier that marks down a dark sky' }, { cx: 5, house: 0 }, 'sky'],
]
// The fraction of a score or a map on the car only reads plainly when every weight is for the class, none against it:
// these classifiers have none below 0.
const FAIR = [
  [{ zh: '老实的分类器', en: 'An honest classifier' }, { cx: 5 }, 'car'],
  [{ zh: '只看路的分类器', en: 'A classifier that looks at the road' }, { cx: 5 }, 'road'],
  [{ zh: '车和路都看', en: 'Looking at the car and the road' }, { cx: 4, house: 12 }, 'both'],
  [{ zh: '看车底下的分类器', en: 'A classifier that looks under the car' }, { cx: 5 }, 'shadow'],
]
const FAIR_HIDDEN = [
  [{ zh: '车开到了左边', en: 'The car has moved left' }, { cx: 1 }, 'car'],
  [{ zh: '看得宽一点', en: 'A wider look' }, { cx: 6, house: 0 }, 'wide'],
]
const ins = ({ cx, house }, weights, extra = {}) => ({ in: street({ cx, house }), w: WEIGHTS[weights], ...extra })
const sceneTests = (cases, out, extra = () => ({})) => cases.map(([label, scene, weights]) => test(label, ins(scene, weights, extra(scene)), out(street(scene), WEIGHTS[weights], carMask(scene))))
const XW = { inputs: ['in', 'w'] }
const XWM = { inputs: ['in', 'w', 'm'] }

// Circuits. contrib: weight × brightness; boxSum: the 3×3 block sum, nine times the 3×3 average.
const contribNodes = { c: ['arith', { op: 'mul' }] }
const contribWires = ['in>c.a', 'w>c.b']
const greyNodes = { g: ['const', { c: 0.5 }], d: ['arith', { op: 'sub' }], c: ['arith', { op: 'mul' }] }
const greyWires = ['in>d.a', 'g>d.b', 'd>c.a', 'w>c.b']
const box9 = (from, to) => ({ nodes: { b: 'box3', n: ['const', { c: 9 }], k: ['arith', { op: 'mul' }] }, wires: [`${from}>b`, 'b>k.a', 'n>k.b', `k>${to}`] })
const occludeGraph = (grey) => {
  const sumUp = box9('c', 'out')
  return build({ ...(grey ? greyNodes : contribNodes), ...sumUp.nodes }, [...(grey ? greyWires : contribWires), ...sumUp.wires], XW)
}

// ---------------- 11-1 遮住一块 (two tasks) ----------------

const blackOut = {
  id: '11-1',
  chapter: 11,
  title: { zh: '遮住一块', en: 'Cover a block' },
  inputs: ['in', 'w'],
  inputLabels: W_LABEL,
  views: { in: 'pixels', out: 'terrain', mid: 'terrain' },
  tasks: [
    {
      step: { zh: '每格出了多少分', en: 'What each cell adds' },
      brief: { zh: '分类器的分数，是每一格的亮度乘它的权重，全部加起来。输出每一格给分数加了多少。', en: 'The classifier\'s score is every cell\'s brightness times its weight, all added up. Output how much each cell adds to the score.' },
      after: { zh: '这张图叫贡献图：亮的格子是分数的来源。对这种一格一个权重的分类器，它也是分数对每格亮度的梯度乘上亮度（梯度 × 输入）。', en: 'This is a contribution map: the bright cells are where the score comes from. For a classifier with one weight a cell like this one, it is also the gradient of the score with respect to each cell\'s brightness, times that brightness (gradient × input).' },
      tests: sceneTests(SCENES, (x, w) => ({ out: times(x, w) })),
      hidden: sceneTests(SCENES_HIDDEN, (x, w) => ({ out: times(x, w) })),
      solution: build(contribNodes, [...contribWires, 'c>out'], XW),
      naive: build({}, ['in>out'], XW),
      alsoFails: [build({}, ['w>out'], XW)],
    },
    {
      step: { zh: '遮住一块', en: 'Cover a block' },
      carries: true,
      brief: { zh: '把一格周围 3×3 的一块涂黑（亮度变 0），分数会掉一些。在每一格输出：涂黑以它为中心的那一块，分数掉多少。', en: 'Black out the 3×3 block round a cell (brightness 0) and the score drops a little. At every cell, output how much the score drops when the block centred on it is blacked out.' },
      hint: { zh: '涂黑一块，分数丢掉的正是那一块里每一格原来出的分。', en: 'Blacking out a block loses exactly what each cell in the block used to add.' },
      after: { zh: '这就是遮挡实验：拿一块挡板在图上逐格移动，看分数掉多少，掉得多的地方就是模型在看的地方。它不用知道模型里面是什么，对 CNN、ViT 都能做，只是每个位置都要把模型重跑一遍。', en: 'This is the occlusion experiment: slide a patch over the picture cell by cell and watch how far the score drops; where it drops most is where the model is looking. It needs nothing from inside the model and works on a CNN or a ViT alike, at the price of running the model again for every position.' },
      tests: sceneTests(SCENES, (x, w) => ({ out: occlusion(x, w) })),
      hidden: sceneTests(SCENES_HIDDEN, (x, w) => ({ out: occlusion(x, w) })),
      solution: occludeGraph(false),
      naive: build(contribNodes, [...contribWires, 'c>out'], XW),
      alsoFails: [build({ ...contribNodes, b: 'box3' }, [...contribWires, 'c>b', 'b>out'], XW), build({ b: 'box3', n: ['const', { c: 9 }], k: ['arith', { op: 'mul' }] }, ['in>b', 'b>k.a', 'n>k.b', 'k>out'], XW)],
    },
  ],
  unlocks: [],
}

// ---------------- 11-2 灰色挡板 ----------------

const greyOut = {
  id: '11-2',
  chapter: 11,
  title: { zh: '灰色挡板', en: 'A grey patch' },
  inputs: ['in', 'w'],
  inputLabels: W_LABEL,
  views: { in: 'pixels', out: 'terrain', mid: 'terrain' },
  brief: { zh: '这次挡板是灰的：被挡住的格子亮度变成 0.5。在每一格输出：用灰块挡住以它为中心的 3×3，分数掉多少。', en: 'This time the patch is grey: the cells it covers become 0.5. At every cell, output how much the score drops when a grey block covers the 3×3 centred on it.' },
  hint: { zh: '一格被换成 0.5 以后，它出的分变了多少？', en: 'Once a cell is replaced by 0.5, how much does what it adds change?' },
  after: { zh: '黑挡板本身就是一种很强的信号：在亮的路上，一块黑斑也会改变分数。灰挡板（常用整个数据集的平均色）离「什么也没有」更近，比暗的地方能看出负数：挡住它反而让分数变高，说明模型把那里当作反面证据。', en: 'A black patch is a strong signal in itself: on a bright road, a dark blotch changes the score too. A grey one (often the average colour of the whole dataset) is closer to "nothing there", and it shows negative values where things are darker: covering them raises the score, so the model takes them as evidence against.' },
  packs: { name: { zh: '遮挡图', en: 'Occlusion map' }, desc: { zh: '用灰块（0.5）挡住每一格周围的 3×3，输出分类器的分数掉了多少。照片接 in，权重接 w。', en: 'Covers the 3×3 round every cell with a grey (0.5) block and outputs how far the classifier\'s score drops. The photo goes into in, the weights into w.' } },
  unlocks: [],
  tests: sceneTests(SCENES, (x, w) => ({ out: occlusion(x, w, { v: 0.5 }) })),
  hidden: sceneTests(SCENES_HIDDEN, (x, w) => ({ out: occlusion(x, w, { v: 0.5 }) })),
  solution: occludeGraph(true),
  naive: occludeGraph(false),
}

// ---------------- 11-3 挡板多大 ----------------

// A 5×5 block sum: across, the cell with its neighbours one and two away (Shift's Steps), then down the same way.
const sum5 = (p, from, back, fore) => ({
  nodes: { [`${p}1`]: ['shift', { dir: back }], [`${p}2`]: ['shift', { dir: fore }], [`${p}3`]: ['shift', { dir: back, n: 2 }], [`${p}4`]: ['shift', { dir: fore, n: 2 }], [`${p}m`]: 'merge', [`${p}n`]: 'merge' },
  wires: [`${from}>${p}1`, `${from}>${p}2`, `${from}>${p}3`, `${from}>${p}4`, `${from}>${p}m.a`, `${p}1>${p}m.b`, `${p}2>${p}m.c`, `${p}m>${p}n.a`, `${p}3>${p}n.b`, `${p}4>${p}n.c`],
  out: `${p}n`,
})
const bigBlockGraph = () => {
  const across = sum5('h', 'c', 'left', 'right')
  const down = sum5('v', across.out, 'up', 'down')
  return build({ ...greyNodes, ...across.nodes, ...down.nodes }, [...greyWires, ...across.wires, ...down.wires, `${down.out}>out`], XW)
}
const bigBlock = {
  id: '11-3',
  chapter: 11,
  title: { zh: '挡板多大', en: 'How big a patch' },
  inputs: ['in', 'w'],
  inputLabels: W_LABEL,
  views: { in: 'pixels', out: 'terrain', mid: 'terrain' },
  brief: { zh: '换一块 5×5 的灰色挡板。在每一格输出：挡住以它为中心的 5×5，分数掉多少。', en: 'Use a 5×5 grey patch instead. At every cell, output how much the score drops when it covers the 5×5 centred there.' },
  hint: { zh: '3×3 的块和是邻居一格以内的格子加起来；5×5 是两格以内。平移可以一次挪好几格。', en: 'A 3×3 block sum adds the cells up to one away; a 5×5 one, up to two away. Shift can move several cells at once.' },
  after: { zh: '挡板越大，热图越平滑、越粗：一块挡板盖住的地方多，分到每格的就模糊了。挡板太小，又可能一块也盖不住模型认的那个部件。实际做遮挡实验，挡板大小要跟物体的部件差不多大。', en: 'The bigger the patch, the smoother and coarser the heat map: each patch covers more, so what it finds is smeared over more cells. Too small a patch, though, may never cover the whole part the model recognises. In practice the patch is chosen about the size of the object\'s parts.' },
  unlocks: [],
  tests: sceneTests(SCENES, (x, w) => ({ out: occlusion(x, w, { v: 0.5, r: 5 }) })),
  hidden: sceneTests(SCENES_HIDDEN, (x, w) => ({ out: occlusion(x, w, { v: 0.5, r: 5 }) })),
  solution: bigBlockGraph(),
  naive: occludeGraph(true),
}

// ---------------- 11-4 看车还是看路 ----------------

const shareNodes = { c: ['arith', { op: 'mul' }], cm: ['arith', { op: 'mul' }], a: 'fqMean', b: 'fqMean', q: ['arith', { op: 'div' }] }
const shareWires = (from) => [`${from}>cm.a`, 'm>cm.b', 'cm>a', `${from}>b`, 'a>q.a', 'b>q.b']
const scoreShare = build(shareNodes, ['in>c.a', 'w>c.b', ...shareWires('c'), 'q>out'], XWM)
const carOrRoad = {
  id: '11-4',
  chapter: 11,
  title: { zh: '看车还是看路', en: 'The car or the road' },
  inputs: ['in', 'w', 'm'],
  inputLabels: W_LABEL,
  brief: { zh: '第三个输入是车的掩膜（车上是 1）。输出一个数：分类器的分数里，有多大比例来自车上的格子。', en: 'The third input is the car\'s mask (1 on the car). Output one number: what fraction of the classifier\'s score comes from the cells on the car.' },
  hint: { zh: '<part-ref to="mean"></part-ref>算出的平均都差同一个倍数，两个相除，倍数就消掉了。', en: 'Averages from <part-ref to="mean"></part-ref> are all off by the same factor; divide one by another and the factor cancels.' },
  after: { zh: '比例接近 1，分类器认的是车；接近 0，它认的是路。训练集里每辆车都停在路上，只看路也能把训练集分对，这种捷径要这样查出来。比例是负数时，车上的格子在给分数扣分。', en: 'Near 1, the classifier recognises the car; near 0, the road. Every car in the training set stood on a road, so looking at the road alone sorts the training set correctly; a shortcut like that is found this way. A negative fraction means the car\'s cells are pulling the score down.' },
  unlocks: [],
  check: { tolerance: 0.01 },
  tests: sceneTests(FAIR, (x, w, m) => ({ out: num(share(times(x, w), m)) }), (scene) => ({ m: carMask(scene) })),
  hidden: sceneTests(FAIR_HIDDEN, (x, w, m) => ({ out: num(share(times(x, w), m)) }), (scene) => ({ m: carMask(scene) })),
  solution: scoreShare,
  naive: build({ a: 'fqMean' }, ['m>a', 'a>out'], XWM),
  alsoFails: [build(shareNodes, ['in>c.a', 'in>c.b', ...shareWires('in'), 'q>out'], XWM)],
}

// ---------------- 11-5 注意力落在哪 ----------------
// A ViT's class token asks every 4×4 patch with its query; the share of its attention on the car is the attention
// part with the car's mask as the values (each patch's value is 1 on the car, 0 off it), averaged. The mask here is
// drawn patch by patch.

const patchMask = (patches) => fromFn(16, 16, (x, y) => (patches.some(([px, py]) => px === Math.floor(x / 4) && py === Math.floor(y / 4)) ? 1 : 0))
const tile = (paint) => fromFn(16, 16, (x, y) => paint(x % 4, y % 4))
const QUERIES = {
  bright: tile(() => 1.5),
  stripe: tile((x, y) => (y === 1 ? (x < 2 ? 10 : -10) : 0)),
  dark: tile(() => -1.5),
}
const VIT = [
  [{ zh: '问「亮不亮」', en: 'Asking "is it bright?"' }, { cx: 4 }, 'bright', [[1, 2], [2, 2]]],
  [{ zh: '问「左亮右暗」', en: 'Asking "bright on the left, dark on the right?"' }, { cx: 4 }, 'stripe', [[1, 2], [2, 2]]],
  [{ zh: '问「暗不暗」', en: 'Asking "is it dark?"' }, { cx: 8 }, 'dark', [[2, 2], [3, 2]]],
]
const VIT_HIDDEN = [[{ zh: '车在左边', en: 'The car on the left' }, { cx: 0, house: 10 }, 'bright', [[0, 2], [1, 2]]]]
const QM_LABEL = { in: { zh: '照片', en: 'Photo' }, q: { zh: '类别 token 的查询', en: 'Class token query' }, m: { zh: '车所在的图块', en: 'Patches with the car' } }
const vitTests = (cases) => cases.map(([label, scene, query, patches]) => {
  const x = street(scene)
  const m = patchMask(patches)
  return test(label, { in: x, q: QUERIES[query], m }, { out: num(sum(attention(QUERIES[query], x, m)) / 256) })
})
const QKM = { inputs: ['in', 'q', 'm'] }
const lookAt = {
  id: '11-5',
  chapter: 11,
  title: { zh: '注意力落在哪', en: 'Where the attention falls' },
  inputs: ['in', 'q', 'm'],
  inputLabels: QM_LABEL,
  brief: { zh: '这回的分类器是 ViT：类别 token 拿它的查询 q 去问照片的每一个 4×4 图块。第三个输入在车所在的图块上是 1。输出一个数：类别 token 的注意力有多大比例落在车上。', en: 'This time the classifier is a ViT: the class token asks every 4×4 patch of the photo with its query q. The third input is 1 on the patches with the car. Output one number: what fraction of the class token\'s attention falls on the car.' },
  hint: { zh: 'Q、K 决定看谁，V 决定看完带回什么。要是带回的就是「这块是不是车」呢？', en: 'Q and K decide whom to look at; V decides what comes back. What if what comes back is "is this patch the car"?' },
  after: { zh: 'V 换成掩膜，注意力加权平均出来的就是落在车上的权重之和。真的 ViT 有十几层、每层好几个头，要把各层的注意力连乘起来（attention rollout）或者看对分类贡献大的头；只看一个头，很容易被骗。', en: 'With the mask as V, the weighted average attention gives is the total weight on the car. A real ViT has a dozen layers of several heads each, so the attention of every layer is multiplied through (attention rollout), or only the heads that matter for the class are read; one head alone is easy to be fooled by.' },
  unlocks: [],
  check: { tolerance: 0.01 },
  tests: vitTests(VIT),
  hidden: vitTests(VIT_HIDDEN),
  solution: build({ a: 'attention', s: 'fqMean' }, ['q>a.Q', 'in>a.K', 'm>a.V', 'a>s', 's>out'], QKM),
  naive: build({ s: 'fqMean' }, ['m>s', 's>out'], QKM),
  alsoFails: [build({ a: 'attention', s: 'fqMean' }, ['q>a.Q', 'in>a.K', 'in>a.V', 'a>s', 's>out'], QKM), build({ a: 'attention', s: 'fqMean' }, ['in>a.Q', 'in>a.K', 'm>a.V', 'a>s', 's>out'], QKM)],
}

// ---------------- 11-6 热图里的车 · 11-7 体检 (series) ----------------
// The check-up of a classifier from its occlusion map: how much of the map lies on the car, then a verdict.

const MORE = [
  [{ zh: '车停得靠右', en: 'A car further right' }, { cx: 6 }, 'car'],
  [{ zh: '房子旁边的车', en: 'A car by a house' }, { cx: 4, house: 12 }, 'road'],
]
// Only where covering lowers the score counts: the map with its negative cells set to 0 (ReLU, as Grad-CAM does).
const positive = (img) => fromFn(img.w, img.h, (x, y) => Math.max(0, at(img, x, y)))
const heatShare = (x, w, m) => share(positive(occlusion(x, w, { v: 0.5 })), m)
const heatShareGraph = build({ h: 'own-11-2', r: 'relu', ...shareNodes }, ['in>h.in', 'w>h.w', 'h>r', ...shareWires('r'), 'q>out'], XWM)
const heatOnCar = {
  id: '11-6',
  chapter: 11,
  title: { zh: '热图里的车', en: 'The car in the heat map' },
  inputs: ['in', 'w', 'm'],
  inputLabels: W_LABEL,
  brief: { zh: '只算挡住以后分数变低的地方：灰块遮挡图（3×3）里大于 0 的部分，有多大比例落在车上。输出这个比例。', en: 'Count only where covering lowers the score: of the part of the grey 3×3 occlusion map above 0, what fraction lies on the car? Output that fraction.' },
  hint: { zh: '<level-ref to="11-4"></level-ref>量的是分数，这次量的是热图。热图里的负数要先去掉。', en: '<level-ref to="11-4"></level-ref> measured the score; this time measure the heat map, its negative cells taken out first.' },
  after: { zh: '遮挡图比贡献图宽一圈：挡板压在车边上时也盖住了一部分车，所以车周围也热起来。负数是反面证据，混进来会让比例变得没有意义，所以先截掉。Grad-CAM 最后也有一个 ReLU，道理相同：热图只画支持这个类别的地方。', en: 'The occlusion map is a ring wider than the contribution map: a patch on the edge of the car covers some of the car too, so the cells round it warm up as well. Negative cells are evidence against, and mixed in they make the fraction meaningless, so they are cut off first. Grad-CAM ends in a ReLU for the same reason: the heat map only shows what supports the class.' },
  unlocks: [],
  check: { tolerance: 0.01 },
  tests: sceneTests([...FAIR.slice(0, 3), MORE[0]], (x, w, m) => ({ out: num(heatShare(x, w, m)) }), (scene) => ({ m: carMask(scene) })),
  hidden: sceneTests(FAIR_HIDDEN, (x, w, m) => ({ out: num(heatShare(x, w, m)) }), (scene) => ({ m: carMask(scene) })),
  solution: heatShareGraph,
  naive: scoreShare,
  alsoFails: [build({ h: 'own-11-2', ...shareNodes }, ['in>h.in', 'w>h.w', ...shareWires('h'), 'q>out'], XWM)],
}

const CHEAT = 0.5
const checkup = {
  id: '11-7',
  chapter: 11,
  title: { zh: '体检报告', en: 'The check-up' },
  inputs: ['in', 'w', 'm'],
  inputLabels: W_LABEL,
  outputs: ['heat', 'cheat'],
  outputLabels: { heat: { zh: '热图', en: 'Heat map' }, cheat: { zh: '靠背景', en: 'Leans on the background' } },
  views: { in: 'pixels', mid: 'terrain' },
  brief: { zh: `给每个分类器出一份报告：一张灰块遮挡图（3×3），和一个数——热图大于 0 的部分落在车上的不到 ${CHEAT}，就输出 1（它靠背景认车），否则输出 0。`, en: `Write a report on each classifier: a grey 3×3 occlusion map, and a number: 1 if less than ${CHEAT} of the heat map's part above 0 lies on the car (it recognises cars by the background), 0 otherwise.` },
  hint: { zh: '「不到」和<part-ref to="threshold"></part-ref>说的「超过」正好相反。', en: '"Less than" is the exact opposite of the "above" that <part-ref to="threshold"></part-ref> answers.' },
  after: { zh: '热图给人看，一个数给流水线用：上线前把每个模型在一批照片上跑一遍，比例低的先拦下来。这批照片里车和路总在一起，所以分数高不说明模型学对了，要看它为什么高。', en: 'The heat map is for people to look at, the number for the pipeline: before release, every model runs over a batch of photos, and the ones with a low fraction are held back. In these photos cars and roads always go together, so a high score does not show the model learnt the right thing; what matters is why it is high.' },
  unlocks: [],
  check: { tolerance: 0.02 },
  tests: sceneTests([...FAIR, ...MORE], (x, w, m) => ({ heat: occlusion(x, w, { v: 0.5 }), cheat: num(heatShare(x, w, m) < CHEAT ? 1 : 0) }), (scene) => ({ m: carMask(scene) })),
  hidden: sceneTests(FAIR_HIDDEN, (x, w, m) => ({ heat: occlusion(x, w, { v: 0.5 }), cheat: num(heatShare(x, w, m) < CHEAT ? 1 : 0) }), (scene) => ({ m: carMask(scene) })),
  solution: build({ h: 'own-11-2', r: 'relu', ...shareNodes, t: ['threshold', { t: CHEAT }], v: 'invert' }, ['in>h.in', 'w>h.w', 'h>heat', 'h>r', ...shareWires('r'), 'q>t', 't>v', 'v>cheat'], { ...XWM, outputs: ['heat', 'cheat'] }),
  naive: build({ h: 'own-11-2', r: 'relu', ...shareNodes, t: ['threshold', { t: CHEAT }] }, ['in>h.in', 'w>h.w', 'h>heat', 'h>r', ...shareWires('r'), 'q>t', 't>cheat'], { ...XWM, outputs: ['heat', 'cheat'] }),
}

export const levels = [blackOut, greyOut, bigBlock, carOrRoad, lookAt, heatOnCar, checkup]
