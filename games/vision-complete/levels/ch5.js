// 第 5 章 · 全局视野 (lectures 9–10, ViT and representation learning). The steps build attention from two patches
// and stretch it (patch size, two heads, position); a fixed query is the challenge; the series ends in a photo
// album that merges copies of the same picture.
// The attention maths lives in kit/domains/image (engine/attention.js); the contrastive bench's workings are in
// benches/contrast.js, and verify() below proves its lesson.
import { attention, attentionWeights } from '../../kit/domains/image/engine/attention.js'
import { GLYPHS, addNoise, fromFn, image, patterns as P, shift, zip } from '../../kit/domains/image/engine/image.js'
import { features } from '../../kit/domains/image/engine/parts/global.js'
import { contrastBench } from '../../kit/domains/image/benches/contrast.js'
import { build, test } from '../../kit/domains/image/build.js'

// ---------------- parts ----------------

// The contrastive encoder the bench unlocks: what training such an encoder gives, fixed. A picture becomes 64
// features (blurred, halved twice, centred, scaled to length 1), so a brightness or contrast change, a pixel of shift
// or a little noise moves it little, and the cosine of two pictures is 64 × the average of their product.


// ---------------- 5-1 两块谁更像 ----------------
// Two 4×4 patches. Patch a asks; each patch answers with a score q·k/√16 = 4 × the average of a × it; the scores
// become weights e^score / Σ e^score; the output is the patches averaged with those weights.

const TILES = {
  X: ['#..#', '.##.', '.##.', '#..#'],
  C: ['####', '#...', '#...', '#...'],
  P: ['.#..', '####', '.#..', '.#..'],
  K: ['##..', '##..', '..##', '..##'],
  R: ['.##.', '#..#', '#..#', '.##.'],
  S: ['#...', '##..', '###.', '####'],
}

// items: [tile, row, col, erased [u, v] pixels]
const tiled = (items) =>
  fromFn(16, 16, (x, y) => {
    for (const [name, row, col, erased = []] of items) {
      if (Math.floor(x / 4) !== col || Math.floor(y / 4) !== row) continue
      const u = x % 4
      const v = y % 4
      if (erased.some(([eu, ev]) => eu === u && ev === v)) return 0
      return TILES[name][v][u] === '#' ? 1 : 0
    }
    return 0
  })

const repaired = (items) => tiled(items.map(([name, row, col]) => [name, row, col]))

const CORNERS = [
  [{ zh: '左上缺', en: 'Top left erased' }, [['X', 0, 0, [[0, 0], [1, 1], [3, 3]]], ['X', 3, 3], ['C', 0, 3], ['P', 2, 1]]],
  [{ zh: '右下缺', en: 'Bottom right erased' }, [['R', 0, 0], ['R', 3, 3, [[1, 0], [0, 1], [3, 2]]], ['K', 1, 2], ['S', 3, 0]]],
  [{ zh: '右上缺', en: 'Top right erased' }, [['S', 0, 3, [[0, 3], [1, 3], [2, 2]]], ['S', 3, 0], ['X', 1, 1], ['R', 2, 3]]],
  [{ zh: '两对都缺', en: 'Both pairs erased' }, [['C', 0, 0, [[0, 0], [3, 0]]], ['C', 3, 3], ['K', 0, 3], ['K', 3, 0, [[0, 1], [3, 3], [2, 2]]]]],
  [{ zh: '没缺', en: 'Nothing erased' }, [['P', 0, 0], ['P', 3, 3], ['R', 1, 2], ['C', 2, 0]]],
]

// Held back: the anti-diagonal pair erased at the bottom left, and a scene with all four corners
// filled so the erased tile has neighbours to mistake for its twin.
const CORNERS_HIDDEN = [
  [{ zh: '左下缺', en: 'Bottom left erased' }, [['K', 3, 0, [[0, 0], [1, 1], [2, 2]]], ['K', 0, 3], ['R', 1, 1], ['C', 2, 2]]],
  [{ zh: '四角都有', en: 'All four corners filled' }, [['P', 0, 3, [[1, 1], [1, 3]]], ['P', 3, 0], ['X', 0, 0], ['S', 3, 3], ['C', 1, 2]]],
]

// ---------------- 5-1 两块谁更像 ----------------

const tile = (name, hi = 1) => fromFn(4, 4, (x, y) => (TILES[name][y][x] === '#' ? hi : 0))
// What patch a gets back: both patches, weighted by softmax of their scores 4 × mean(a × patch) = q·k/√16.
const asked = (a, b) => {
  const [wa, wb] = attentionWeights(a.data, [a.data, b.data], 1)
  return zip(a, b, (x, y) => wa * x + wb * y)
}
const pairs = (cases) => cases.map(([label, a, b]) => test(label, { a, b }, { out: asked(a, b) }))
const pairGraph = ({ exp = true } = {}) =>
  build(
    {
      aa: ['arith', { op: 'mul' }], ab: ['arith', { op: 'mul' }], ma: 'fqMean', mb: 'fqMean', k: ['const', { c: 4 }],
      sa: ['arith', { op: 'mul' }], sb: ['arith', { op: 'mul' }], ...(exp ? { ea: 'exp', eb: 'exp' } : {}),
      wa: ['arith', { op: 'mul' }], wb: ['arith', { op: 'mul' }], num: 'merge', den: 'merge', q: ['arith', { op: 'div' }],
    },
    [
      'a>aa.a', 'a>aa.b', 'a>ab.a', 'b>ab.b', 'aa>ma', 'ab>mb', 'ma>sa.a', 'k>sa.b', 'mb>sb.a', 'k>sb.b',
      ...(exp ? ['sa>ea', 'sb>eb', 'ea>wa.a', 'eb>wb.a', 'ea>den.a', 'eb>den.b'] : ['sa>wa.a', 'sb>wb.a', 'sa>den.a', 'sb>den.b']),
      'a>wa.b', 'b>wb.b', 'wa>num.a', 'wb>num.b', 'num>q.a', 'den>q.b', 'q>out',
    ],
    { inputs: ['a', 'b'] },
  )

const twoPatches = {
  id: '5-1',
  chapter: 5,
  title: { zh: '两块谁更像', en: 'Which patch is more alike' },
  inputs: ['a', 'b'],
  inputLabels: { a: { zh: '图块 a（提问）', en: 'Patch a (asking)' }, b: { zh: '图块 b', en: 'Patch b' } },
  brief: {
    zh: '图块 a 向 a、b 两块提问。每块的分数 = 4 × 平均(a × 这一块)；权重 = e^分数 ÷ 两个 e^分数之和；输出 = 两块按权重的加权平均。',
    en: 'Patch a asks patches a and b. Each patch scores 4 × average(a × that patch); its weight is e^score ÷ the sum of both e^score; the output is the two patches averaged with those weights.',
  },
  hint: { zh: '一个数和一整块相乘时，这个数用在每一格上。先把两个分数算出来。', en: 'When a single number multiplies a whole patch, it applies to every cell. Work out the two scores first.' },
  after: {
    zh: '分数是点积 q·k 除以 √d（这里 d = 16）；取 e 的指数再归一化叫 softmax，权重都是正的，加起来是 1，最像的那块分得最多。让图里的每个图块都向所有图块这样提问，就是注意力，现在是现成的元件「注意力」。',
    en: 'The score is the dot product q·k divided by √d (here d = 16); taking e to the power and normalising is called softmax, so the weights are positive, add up to 1, and the most alike patch gets the most. Let every patch of a picture ask every patch like this and you have attention, now a ready-made part, "Attention".',
  },
  unlocks: ['attention'],
  palette: ['arith', 'merge', 'const', 'fqMean', 'exp'],
  tests: pairs([
    [{ zh: 'X 问 C', en: 'X asks C' }, tile('X'), tile('C')],
    [{ zh: 'P 问 K', en: 'P asks K' }, tile('P'), tile('K')],
    [{ zh: 'R 问 S', en: 'R asks S' }, tile('R'), tile('S')],
    [{ zh: '淡的 S 问 X', en: 'A faint S asks X' }, tile('S', 0.5), tile('X')],
  ]),
  hidden: pairs([
    [{ zh: 'K 问 R', en: 'K asks R' }, tile('K'), tile('R')],
    [{ zh: 'C 问淡的 P', en: 'C asks a faint P' }, tile('C'), tile('P', 0.6)],
  ]),
  solution: pairGraph(),
  naive: build({}, ['a>out'], { inputs: ['a', 'b'] }),
  // Scores used as weights straight away, without e^: not a softmax.
  alsoFails: [pairGraph({ exp: false })],
}

// ---------------- 5-2 补全对角 ----------------

const corners = {
  id: '5-2',
  chapter: 5,
  title: { zh: '补全对角', en: 'Mend across the diagonal' },
  brief: {
    zh: '一对对角上本是同一个图案，其中一个被擦掉了几格。把它补回来，其余不变；最多 3 个节点。',
    en: 'Two opposite corners hold the same pattern, but a few pixels of one copy have been erased. Restore them and leave everything else unchanged; at most 3 nodes.',
  },
  hint: {
    zh: '3×3 的元件一次只看一格远。注意力让每个图块和所有图块比；q 放大越大，越只看最像的几块。',
    en: 'A 3×3 part only sees one pixel away at a time. Attention lets each patch compare itself with every patch; the larger the q scale, the more it looks only at the few most similar ones.',
  },
  after: {
    zh: '被擦的那块和远处的孪生块最像，于是一步就从对角取回了缺的格子。这就是自注意力：每个图块（token）用 q·k/√d 和所有图块打分，softmax 把分数变成和为 1 的权重，再对 v 加权平均。3×3 卷积叠 L 层也只看到 (2L+1)×(2L+1)。',
    en: 'The erased patch looks most like its far-off twin, so in one step it fetched the missing pixels from the opposite corner. That is self-attention: each patch (token) scores every patch with q·k/√d, softmax turns the scores into weights that sum to 1, and the v are averaged with those weights. Stack L layers of 3×3 convolution and you still only see (2L+1)×(2L+1).',
  },
  unlocks: [],
  palette: ['attention', 'shift', 'box3', 'arith', 'merge', 'const', 'threshold'],
  constraint: (score) => (score.nodes > 3 ? { zh: `用了 ${score.nodes} 个节点，最多 3 个`, en: `${score.nodes} nodes used; at most 3` } : ''),
  tests: CORNERS.map(([label, items]) => test(label, { in: tiled(items) }, { out: repaired(items) })),
  hidden: CORNERS_HIDDEN.map(([label, items]) => test(label, { in: tiled(items) }, { out: repaired(items) })),
  solution: build({ a: ['attention', { s: 8 }], t: ['threshold', { t: 0.3 }] }, ['in>a.Q', 'a>t', 't>out']),
  naive: build({ b: 'box3', c: 'box3', t: ['threshold', { t: 0.2 }] }, ['in>b', 'b>c', 'c>t', 't>out']),
  alsoFails: [
    // q·k too flat: every patch averages the whole image.
    build({ a: ['attention', { s: 1 }], t: ['threshold', { t: 0.3 }] }, ['in>a.Q', 'a>t', 't>out']),
    // The erased pixels come back at exactly one half; a 0.5 threshold throws them away again.
    build({ a: ['attention', { s: 8 }], t: ['threshold', { t: 0.5 }] }, ['in>a.Q', 'a>t', 't>out']),
    build({ t: ['threshold', { t: 0.5 }] }, ['in>t', 't>out']),
  ],
}

// ---------------- 5-3 切多大 ----------------
// The same mending on 8×8 patterns, four to a picture. Patches of 8 still see whole patterns, and cost an eighth of
// patches of 4; patches of 2 cost four times more again.

const quad = (items) =>
  fromFn(16, 16, (x, y) => {
    for (const [name, row, col, erased = []] of items) {
      if (Math.floor(x / 8) !== col || Math.floor(y / 8) !== row) continue
      const u = (x % 8) >> 1
      const v = (y % 8) >> 1
      if (erased.some(([eu, ev]) => eu === u && ev === v)) return 0
      return TILES[name][v][u] === '#' ? 1 : 0
    }
    return 0
  })
const QUADS = [
  [{ zh: '左上缺', en: 'Top left erased' }, [['X', 0, 0, [[0, 0], [1, 1]]], ['X', 1, 1], ['C', 0, 1], ['P', 1, 0]]],
  [{ zh: '右上缺', en: 'Top right erased' }, [['S', 0, 1, [[3, 3], [2, 3], [3, 1]]], ['S', 1, 0], ['K', 0, 0], ['R', 1, 1]]],
  [{ zh: '右下缺', en: 'Bottom right erased' }, [['R', 0, 0], ['R', 1, 1, [[1, 0], [0, 1]]], ['X', 0, 1], ['C', 1, 0]]],
]
const QUADS_HIDDEN = [
  [{ zh: '左下缺', en: 'Bottom left erased' }, [['K', 1, 0, [[0, 0], [1, 1], [3, 3]]], ['K', 0, 1], ['S', 0, 0], ['P', 1, 1]]],
  [{ zh: '没缺', en: 'Nothing erased' }, [['C', 0, 0], ['C', 1, 1], ['R', 0, 1], ['X', 1, 0]]],
]
const mendWith = (P, s) => build({ a: ['attention', { s, P }], t: ['threshold', { t: 0.3 }] }, ['in>a.Q', 'a>t', 't>out'])
const COST_CAP = 10

const patchSize = {
  id: '5-3',
  chapter: 5,
  title: { zh: '切多大', en: 'How big a patch' },
  brief: {
    zh: `还是补全对角，这次图案是 8×8 的，一张图四个。计算量不能超过 ${COST_CAP}。`,
    en: `Mending across the diagonal again, this time with 8×8 patterns, four to a picture. The cost must not exceed ${COST_CAP}.`,
  },
  hint: { zh: '注意力的每一格都要把所有图块加一遍。图块越大，图块越少。', en: "Each cell of attention adds up over every patch. The bigger the patches, the fewer there are." },
  after: {
    zh: '图块数 = 像素数 ÷ P²，注意力的计算量跟着图块数涨；图块大了，每块又粗得只能认出大结构。ViT 把 224×224 的图切成 16×16 的图块，正好是 196 个：在计算量和细节之间取的一个折中。',
    en: 'The number of patches is the number of pixels ÷ P², and the cost of attention grows with it; but bigger patches are too coarse to see anything but large structure. ViT cuts a 224×224 image into 16×16 patches, exactly 196 of them: a compromise between cost and detail.',
  },
  unlocks: [],
  palette: ['attention', 'threshold', 'arith', 'merge', 'const', 'box3'],
  constraint: (score) => (score.cost > COST_CAP ? { zh: `计算量 ${score.cost}，超过 ${COST_CAP}`, en: `Cost ${score.cost}, over ${COST_CAP}` } : ''),
  tests: QUADS.map(([label, items]) => test(label, { in: quad(items) }, { out: quad(items.map(([name, row, col]) => [name, row, col])) })),
  hidden: QUADS_HIDDEN.map(([label, items]) => test(label, { in: quad(items) }, { out: quad(items.map(([name, row, col]) => [name, row, col])) })),
  solution: mendWith(8, 8),
  naive: mendWith(4, 8),
  alsoFails: [mendWith(2, 8)],
}

// ---------------- 5-4 两个头 ----------------
// Two pictures, each with one erased pattern whose twin sits somewhere else. The twins pair up differently in the
// two, so one head, looking by one picture, mends only that one.

const HEADS = [
  [{ zh: '第一组', en: 'Set 1' }, [['X', 0, 0, [[0, 0], [1, 1], [3, 3]]], ['X', 3, 3], ['C', 0, 3], ['P', 2, 1]], [['R', 1, 1], ['R', 2, 2, [[1, 0], [0, 1], [2, 3]]], ['K', 0, 2], ['S', 3, 1]]],
  [{ zh: '第二组', en: 'Set 2' }, [['S', 0, 3, [[0, 3], [1, 3], [2, 2]]], ['S', 3, 0], ['X', 1, 1], ['R', 2, 3]], [['C', 0, 0], ['C', 3, 3, [[0, 0], [3, 0]]], ['P', 1, 2], ['X', 2, 0]]],
  [{ zh: '第三组', en: 'Set 3' }, [['K', 1, 0], ['K', 2, 3, [[0, 1], [3, 3], [2, 2]]], ['R', 0, 0], ['C', 3, 2]], [['P', 0, 1, [[1, 1], [1, 3]]], ['P', 3, 2], ['S', 1, 3], ['K', 2, 0]]],
]
const HEADS_HIDDEN = [
  [{ zh: '第四组', en: 'Set 4' }, [['R', 0, 2, [[1, 0], [0, 1]]], ['R', 3, 1], ['P', 1, 0], ['S', 2, 2]], [['X', 1, 1], ['X', 2, 3, [[0, 0], [1, 1]]], ['C', 0, 3], ['K', 3, 0]]],
]
const heads = (cases) => cases.map(([label, shape, mark]) => test(label, { shape: tiled(shape), mark: tiled(mark) }, { so: repaired(shape), mo: repaired(mark) }))
const headsGraph = (two = true) =>
  build(
    { hs: ['attention', { s: 8 }], hm: ['attention', { s: 8 }], ts: ['threshold', { t: 0.3 }], tm: ['threshold', { t: 0.3 }] },
    ['shape>hs.Q', 'hs>ts', 'ts>so', two ? 'mark>hm.Q' : 'shape>hm.Q', ...(two ? [] : ['shape>hm.K', 'mark>hm.V']), 'hm>tm', 'tm>mo'],
    { inputs: ['shape', 'mark'], outputs: ['so', 'mo'] },
  )

const twoHeads = {
  id: '5-4',
  chapter: 5,
  title: { zh: '两个头', en: 'Two heads' },
  inputs: ['shape', 'mark'],
  outputs: ['so', 'mo'],
  inputLabels: { shape: { zh: '图一', en: 'Picture 1' }, mark: { zh: '图二', en: 'Picture 2' } },
  outputLabels: { so: { zh: '补好的图一', en: 'Picture 1 mended' }, mo: { zh: '补好的图二', en: 'Picture 2 mended' } },
  brief: {
    zh: '两张图各有一个图案被擦掉几格，它的孪生图案在同一张图的别处。两个输出分别是补好的两张图。',
    en: 'Each of two pictures has one pattern with a few pixels erased; its twin is elsewhere in the same picture. The two outputs are the two pictures mended.',
  },
  hint: { zh: '一个注意力只按一种「像」去找。两张图里的孪生关系一样吗？', en: 'One attention looks for one kind of likeness. Do the twins pair up the same way in both pictures?' },
  after: {
    zh: '每个注意力只能按一种相似去找。多头注意力并排放几个注意力，各自用自己的 Q、K 找一种关系，再把结果拼在一起。Transformer 的每一层都有好几个头。',
    en: 'Each attention can only look for one kind of likeness. Multi-head attention puts several side by side, each finding one kind of relation with its own Q and K, and then puts their results together. Every layer of a Transformer has several heads.',
  },
  unlocks: [],
  palette: ['attention', 'threshold', 'arith', 'merge', 'const'],
  tests: heads(HEADS),
  hidden: heads(HEADS_HIDDEN),
  solution: headsGraph(),
  naive: headsGraph(false),
}

// ---------------- 5-5 顺序盲 ----------------

const GREY = 0.5
const orderScene = (bright, dark) => fromFn(16, 16, (x, y) => {
  const i = Math.floor(y / 4) * 4 + Math.floor(x / 4)
  return i === bright ? 0.9 : i === dark ? 0.1 : GREY
})
const ORDER_PAIRS = [[1, 2], [5, 9], [3, 12]]
// Each pixel's patch number in reading order, 0 … 15: the address a position code is made from.
const PATCH_NUMBER = fromFn(16, 16, (x, y) => Math.floor(y / 4) * 4 + Math.floor(x / 4))
const orderTest = ([bright, dark]) =>
  test({ zh: `亮 ${bright + 1} · 暗 ${dark + 1}`, en: `Bright ${bright + 1} · dark ${dark + 1}` }, { in: orderScene(bright, dark), pos: PATCH_NUMBER }, { out: fromFn(16, 16, () => (bright < dark ? 1 : 0)) })
const ORDER_TESTS = ORDER_PAIRS.flatMap(([a, b]) => [[a, b], [b, a]]).map(orderTest)
// Held back: neighbours across a row break (later column, earlier row), one directly above the
// other, and the two far corners, so reading columns only, or rows only, is caught.
const ORDER_HIDDEN = [[7, 8], [10, 6], [15, 0]].map(orderTest)

// Two heads: one whose Q·K finds the brightest patch, one (on the negative) the darkest. Both carry V
// with the position code in + 0.05 × patch number, so their difference is −0.8 + 0.05·(dark − bright).
const orderGraph = ({ position = 'v', s = 60 } = {}) => {
  const n = {
    inv: 'invert',
    hb: ['attention', { s }],
    hd: ['attention', { s }],
    d: ['arith', { op: 'sub' }],
    t: ['threshold', { t: -0.775 }],
  }
  const w = ['in>inv', 'hd>d.a', 'hb>d.b', 'd>t', 't>out']
  if (position === 'none') w.push('in>hb.Q', 'inv>hd.Q', 'in>hd.V')
  if (position !== 'none') {
    Object.assign(n, { pg: ['arith', { op: 'mul' }], pk: ['const', { c: 0.05 }], p: ['arith', { op: 'add' }] })
    w.push('pos>pg.a', 'pk>pg.b', 'in>p.a', 'pg>p.b')
  }
  if (position === 'v') w.push('in>hb.Q', 'p>hb.V', 'inv>hd.Q', 'p>hd.V')
  if (position === 'qk') {
    n.ip = 'invert'
    w.push('p>ip', 'p>hb.Q', 'in>hb.V', 'ip>hd.Q', 'in>hd.V')
  }
  return build(n, w, { inputs: ['in', 'pos'] })
}

const order = {
  id: '5-5',
  chapter: 5,
  title: { zh: '顺序盲', en: 'Blind to order' },
  inputs: ['in', 'pos'],
  inputLabels: { in: { zh: '图', en: 'Image' }, pos: { zh: '图块编号', en: 'Patch number' } },
  brief: {
    zh: '按阅读顺序（先左后右，再从上到下），亮块排在暗块前面就整张图输出 1，否则输出 0。第二个输入是每格所在图块的编号 0 … 15。',
    en: 'In reading order (left to right, then top to bottom), if the bright patch comes before the dark one, output 1 over the whole image; otherwise output 0. The second input is the number of the patch each pixel is in, 0 … 15.',
  },
  hint: {
    zh: 'Q、K 决定看谁，V 决定带回什么。要让结果知道亮块和暗块各在哪儿，位置该从哪一路进来？',
    en: 'Q and K decide whom to look at; V decides what comes back. For the result to know where the bright and dark patches sit, which input should carry the position?',
  },
  after: {
    zh: '没有位置时，把两个图块对调，注意力的输出也只是跟着对调：它看到的是一袋图块，不是一串。你给每个图块加上了它的编号乘一个小数：这叫位置编码 z̃ᵢ = zᵢ + pᵢ，每个图块带着自己的地址，顺序才进得了计算。它现在是现成的元件「位置编码」。ViT 在进入第一层之前就把位置加到每个图块上。',
    en: "Without position, swap two patches and attention's output just swaps with them: it sees a bag of patches, not a sequence. You added each patch's number times a small amount: this is a positional encoding z̃ᵢ = zᵢ + pᵢ, so every patch carries its own address and order can enter the computation. It is now a ready-made part, \"Positional encoding\". ViT adds the position to every patch before the first layer.",
  },
  unlocks: ['posenc'],
  palette: ['attention', 'invert', 'arith', 'merge', 'const', 'threshold'],
  tests: ORDER_TESTS,
  hidden: ORDER_HIDDEN,
  solution: orderGraph({ position: 'v' }),
  naive: orderGraph({ position: 'none' }),
  // The position only steers who is looked at; what comes back carries no address.
  alsoFails: [orderGraph({ position: 'qk' })],
}

// ---------------- 5-6 同一个问题 (challenge) ----------------
// Every patch should become the brightest patch. A query that is the same for every patch (all ones) scores each
// patch by its total, so all of them look at the same, brightest one; a learned query token works the same way.

const lit = (items) =>
  fromFn(16, 16, (x, y) => {
    for (const [name, row, col, hi] of items) if (Math.floor(x / 4) === col && Math.floor(y / 4) === row) return TILES[name][y % 4][x % 4] === '#' ? hi : 0
    return 0
  })
const brightest = (items) => {
  const best = items.reduce((a, b) => (TILES[b[0]].join('').split('#').length * b[3] > TILES[a[0]].join('').split('#').length * a[3] ? b : a))
  return fromFn(16, 16, (x, y) => (TILES[best[0]][y % 4][x % 4] === '#' ? best[3] : 0))
}
const ASK = [
  [{ zh: '第一组', en: 'Set 1' }, [['X', 0, 0, 0.9], ['C', 1, 2, 0.6], ['P', 3, 1, 0.5]]],
  [{ zh: '第二组', en: 'Set 2' }, [['K', 2, 3, 0.4], ['S', 0, 1, 0.8], ['R', 3, 3, 0.7]]],
  [{ zh: '第三组', en: 'Set 3' }, [['C', 1, 1, 0.9], ['X', 2, 2, 0.3], ['P', 0, 3, 0.6], ['R', 3, 0, 0.5]]],
]
const ASK_HIDDEN = [[{ zh: '第四组', en: 'Set 4' }, [['R', 0, 0, 0.5], ['S', 3, 2, 0.6], ['X', 1, 3, 0.9]]]]
const ask = (cases) => cases.map(([label, items]) => test(label, { in: lit(items) }, { out: brightest(items) }))

const sameQuestion = {
  id: '5-6',
  chapter: 5,
  title: { zh: '同一个问题', en: 'The same question' },
  brief: { zh: '每个图块都换成全图最亮（各格加起来最大）的那个图块。', en: 'Replace every patch with the brightest patch in the picture (the one whose cells add up to the most).' },
  hint: { zh: '自注意力里，每块用自己去提问。要是每块问的是同一个问题呢？', en: 'In self-attention, each patch asks with itself. What if every patch asked the same question?' },
  after: {
    zh: '所有图块用同一个查询（全 1）去问，分数就只看每块的总和，大家都看向同一块。ViT 在图块前面多放一个可学习的 [CLS] 图块，它的查询经过训练，专门替整张图提问，分类时只读它的输出。',
    en: 'When every patch asks with the same query (all ones), the score depends only on each patch\'s total, and they all look at the same patch. ViT puts an extra learnable [CLS] patch in front of the others; its query is trained to ask on behalf of the whole picture, and only its output is read to classify.',
  },
  unlocks: [],
  palette: ['attention', 'posenc', 'arith', 'merge', 'const', 'threshold', 'fqMean'],
  tests: ask(ASK),
  hidden: ask(ASK_HIDDEN),
  solution: build({ z: ['arith', { op: 'mul' }], zk: ['const', { c: 0 }], o: ['arith', { op: 'add' }], ok: ['const', { c: 1 }], a: ['attention', { s: 40 }] }, ['in>z.a', 'zk>z.b', 'z>o.a', 'ok>o.b', 'o>a.Q', 'in>a.K', 'in>a.V', 'a>out']),
  naive: build({ a: ['attention', { s: 40 }] }, ['in>a.Q', 'a>out']),
}

// ---------------- 5-7 拉近与推开 (bench) ----------------
// A linear encoder trained with InfoNCE (kit/domains/image/benches/contrast.js) on five letters.
const contrast = contrastBench({
  names: ['T', 'L', 'X', 'O', 'F'],
  base: ['T', 'L', 'X', 'O', 'F'].map((name) => P.glyph(GLYPHS[name], 0.1, 0.9)),
  tau: 0.2,
  rate: 0.5,
  goal: 0.5,
  collapse: 0.9,
  testSeeds: [901, 902, 903],
})

const verifyContrast = () => {
  if (contrast.evaluate(contrast.init()).pass) return 'the untrained encoder already passes'
  // InfoNCE reaches the goal within 200 steps (ten presses of 训练 20 步).
  let model = contrast.init()
  let reached = -1
  for (let t = 0; t < 200 && reached < 0; t += 20) {
    model = contrast.train(model, t, 20, true).model
    if (contrast.evaluate(model).pass) reached = t + 20
  }
  if (reached < 0) return 'InfoNCE does not reach the goal in 200 steps'
  // Pulling positives alone never passes and ends collapsed, even after twice as long.
  model = contrast.init()
  for (let t = 0; t < 400; t += 20) {
    model = contrast.train(model, t, 20, false).model
    if (contrast.evaluate(model).pass) return `pull-only passes at step ${t + 20}`
  }
  const end = contrast.evaluate(model)
  if (!end.collapsed) return `pull-only did not collapse (mean negative cosine ${end.negative.toFixed(2)})`
  return ''
}

const pullPush = {
  id: '5-7',
  kind: 'board',
  board: 'AttendContrast',
  chapter: 5,
  title: { zh: '拉近与推开', en: 'Pull close, push apart' },
  brief: {
    zh: '没有标签，只有每张图的两个变形版本。训练编码器，让测验里的每个视图都以 ≥ 50% 的概率认出自己的搭档。',
    en: 'No labels, only two altered versions of each image. Train the encoder so that every view in the quiz picks out its partner with probability ≥ 50%.',
  },
  hint: { zh: '只拉近搭档，最省事的办法是什么？看看所有点最后去了哪里。', en: 'If you only pull partners together, what is the laziest way to do it? Watch where all the dots end up.' },
  after: {
    zh: '只拉近正对时，把所有图都放到同一点就能让损失最小，却什么也分不出：这叫坍缩。InfoNCE 的分母把同一批里的其他视图当作负对推开，点才在圆上散开。变形本身提供了答案，不需要人工标签：这就是自监督的对比学习（SimCLR）。',
    en: "When only positive pairs are pulled together, putting every image at the same point minimises the loss but tells nothing apart: this is called collapse. InfoNCE's denominator treats the other views in the batch as negative pairs and pushes them away, so the dots spread out round the circle. The alterations themselves supply the answer, with no human labels: this is self-supervised contrastive learning (SimCLR).",
  },
  unlocks: ['embed'],
  model: contrast,
  verify: verifyContrast,
}

// ---------------- 5-8 找近邻 ----------------
// A photo and three candidates; one candidate is the same picture, cropped, recoloured or noisy. Pixel by pixel a
// brighter stranger looks closer; the encoder's features see through it.

const shot = (name, { dx = 0, dy = 0, lo = 0.1, hi = 0.9, seed = 0, amp = 0 } = {}) => {
  const img = P.glyph(GLYPHS[name], lo, hi, 3 + dx, 3 + dy)
  return seed ? addNoise(img, seed, amp) : img
}
const near = (cases) =>
  cases.map(([label, q, cands, which]) => test(label, { q, a: cands[0], b: cands[1], c: cands[2] }, { pa: image(1, 1, which === 0 ? 1 : 0), pb: image(1, 1, which === 1 ? 1 : 0), pc: image(1, 1, which === 2 ? 1 : 0) }))
const NEAR = [
  [{ zh: 'T 找 T', en: 'T finds T' }, shot('T'), [shot('L', { lo: 0.3, hi: 1 }), shot('T', { dx: 1, lo: 0.2, hi: 0.7 }), shot('F')], 1],
  [{ zh: 'X 找 X', en: 'X finds X' }, shot('X', { seed: 3, amp: 0.1 }), [shot('X', { dy: 1, hi: 0.6 }), shot('O', { lo: 0.2, hi: 1 }), shot('T')], 0],
  [{ zh: 'O 找 O', en: 'O finds O' }, shot('O', { dx: -1 }), [shot('F', { lo: 0.3, hi: 1 }), shot('L'), shot('O', { lo: 0.3, hi: 0.6, seed: 5, amp: 0.08 })], 2],
]
const NEAR_HIDDEN = [[{ zh: 'F 找 F', en: 'F finds F' }, shot('F', { lo: 0.2 }), [shot('T', { lo: 0.3, hi: 1 }), shot('F', { dx: 1, dy: 1, hi: 0.7 }), shot('X')], 1]]
const nearGraph = (encode = true) => {
  const n = {}
  const w = []
  for (const x of ['q', 'a', 'b', 'c']) {
    if (encode) {
      n[`e${x}`] = 'embed'
      w.push(`${x}>e${x}`)
    }
  }
  const e = (x) => (encode ? `e${x}` : x)
  for (const x of ['a', 'b', 'c']) {
    Object.assign(n, { [`m${x}`]: ['arith', { op: 'mul' }], [`s${x}`]: 'fqMean' })
    w.push(`${e('q')}>m${x}.a`, `${e(x)}>m${x}.b`, `m${x}>s${x}`)
  }
  for (const [x, y, z] of [['a', 'b', 'c'], ['b', 'a', 'c'], ['c', 'a', 'b']]) {
    Object.assign(n, { [`x${x}`]: 'max', [`d${x}`]: ['arith', { op: 'sub' }], [`t${x}`]: ['threshold', { t: 0 }] })
    w.push(`s${y}>x${x}.a`, `s${z}>x${x}.b`, `s${x}>d${x}.a`, `x${x}>d${x}.b`, `d${x}>t${x}`, `t${x}>p${x}`)
  }
  return build(n, w, { inputs: ['q', 'a', 'b', 'c'], outputs: ['pa', 'pb', 'pc'] })
}

const nearest = {
  id: '5-8',
  chapter: 5,
  title: { zh: '找近邻', en: 'Nearest neighbour' },
  inputs: ['q', 'a', 'b', 'c'],
  outputs: ['pa', 'pb', 'pc'],
  inputLabels: { q: { zh: '要找的照片', en: 'Photo to find' }, a: { zh: '候选 a', en: 'Candidate a' }, b: { zh: '候选 b', en: 'Candidate b' }, c: { zh: '候选 c', en: 'Candidate c' } },
  outputLabels: { pa: { zh: '是 a', en: 'Is a' }, pb: { zh: '是 b', en: 'Is b' }, pc: { zh: '是 c', en: 'Is c' } },
  brief: {
    zh: '三张候选里有一张和要找的是同一张照片，只是挪了一点、调了颜色或加了噪声。是它的那一路输出 1，其余输出 0。',
    en: 'One of the three candidates is the same photo as the one to find, only shifted a little, recoloured or noisy. Output 1 on its line and 0 on the others.',
  },
  hint: { zh: '逐像素比，亮的陌生人反而显得近。先把每张照片换成编码器的特征再比。', en: 'Compared pixel by pixel, a bright stranger looks closer. Turn every photo into the encoder\'s features before comparing.' },
  after: {
    zh: '编码器把同一张图的各种变形放到特征空间里相近的地方，再按余弦相似度找最近的一个：这就是以图搜图。对比学习练出来的编码器，正好适合这件事。',
    en: 'The encoder puts the different versions of one picture close together in feature space; then the nearest one by cosine similarity is found. This is image search, and an encoder trained by contrastive learning is just right for it.',
  },
  unlocks: [],
  palette: ['embed', 'arith', 'merge', 'const', 'fqMean', 'max', 'threshold'],
  tests: near(NEAR),
  hidden: near(NEAR_HIDDEN),
  solution: nearGraph(),
  naive: nearGraph(false),
}

// ---------------- 5-9 相册去重 (finale) ----------------

const SAME_AT = 0.8
const dup = (cases) => cases.map(([label, a, b, same]) => test(label, { a, b }, { same: image(1, 1, same ? 1 : 0) }))
const DUPS = [
  [{ zh: '挪了一格', en: 'Shifted a pixel' }, shot('T'), shot('T', { dx: 1 }), true],
  [{ zh: '调亮了', en: 'Brightened' }, shot('X'), shot('X', { lo: 0.4, hi: 1 }), true],
  [{ zh: '对比度低', en: 'Low contrast' }, shot('O', { dy: 1 }), shot('O', { lo: 0.4, hi: 0.6 }), true],
  [{ zh: '加了噪声', en: 'Noisy' }, shot('F'), shot('F', { seed: 7, amp: 0.15 }), true],
  [{ zh: 'T 和 L', en: 'T and L' }, shot('T'), shot('L'), false],
  [{ zh: 'O 和 X', en: 'O and X' }, shot('O', { lo: 0.3, hi: 1 }), shot('X'), false],
]
const DUPS_HIDDEN = [
  [{ zh: '挪了又调暗', en: 'Shifted and darkened' }, shot('L'), shot('L', { dx: -1, dy: 1, hi: 0.6 }), true],
  [{ zh: 'F 和 T', en: 'F and T' }, shot('F', { lo: 0.2, hi: 1 }), shot('T', { seed: 9, amp: 0.1 }), false],
]
const dupGraph = (encode = true) =>
  build(
    { ...(encode ? { ea: 'embed', eb: 'embed' } : {}), m: ['arith', { op: 'mul' }], s: 'fqMean', k: ['const', { c: 16 }], c: ['arith', { op: 'mul' }], t: ['threshold', { t: SAME_AT }] },
    [...(encode ? ['a>ea', 'b>eb', 'ea>m.a', 'eb>m.b'] : ['a>m.a', 'b>m.b']), 'm>s', 's>c.a', 'k>c.b', 'c>t', 't>same'],
    { inputs: ['a', 'b'], outputs: ['same'] },
  )

const album = {
  id: '5-9',
  chapter: 5,
  title: { zh: '相册去重', en: 'Album clean-up' },
  inputs: ['a', 'b'],
  outputs: ['same'],
  inputLabels: { a: { zh: '照片 a', en: 'Photo a' }, b: { zh: '照片 b', en: 'Photo b' } },
  outputLabels: { same: { zh: '同一张', en: 'Same photo' } },
  brief: {
    zh: '相册要合并重复的照片：挪了位置、调了颜色、加了噪声的同一张照片输出 1，不同的照片输出 0。',
    en: 'The album wants to merge duplicate photos: output 1 for the same photo, even shifted, recoloured or noisy, and 0 for different photos.',
  },
  hint: { zh: '找近邻时你比较过相似度。这次没有候选可比，要自己定一条线。', en: 'In nearest neighbour you compared similarities. This time there are no candidates to compare with, so you have to draw the line yourself.' },
  after: {
    zh: '编码、算余弦、过门槛：相册去重、以图搜图、人脸验证都是这条流水线，差别在编码器学的是哪种「同一个」。门槛定高了会漏掉重复，定低了会把不同的照片并在一起。',
    en: 'Encode, take the cosine, apply a threshold: album clean-up, image search and face verification are all this pipeline, differing in what kind of "same" the encoder has learnt. Set the threshold too high and duplicates slip through; too low and different photos get merged.',
  },
  unlocks: [],
  palette: ['embed', 'arith', 'merge', 'const', 'fqMean', 'max', 'threshold'],
  tests: dup(DUPS),
  hidden: dup(DUPS_HIDDEN),
  solution: dupGraph(),
  naive: dupGraph(false),
}

export const levels = [twoPatches, corners, patchSize, twoHeads, order, sameQuestion, pullPush, nearest, album]
