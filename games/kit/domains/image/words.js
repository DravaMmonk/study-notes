// What each part of the image domain does, in a line (games/DESIGN.md 4: a description says only what a part does),
// and the names of a level's input cards: for the parts list, the components box and the cards (ui/), and for a blind
// session (play.js).
import { L } from '../../shell/i18n.js'

/** Names for the cards of a level with several inputs, unless the level names them itself. */
export const INPUT_LABELS = {
  left: { zh: '左图', en: 'Left image' },
  right: { zh: '右图', en: 'Right image' },
  scene: { zh: '现场', en: 'Scene' },
  empty: { zh: '空场', en: 'Empty scene' },
}

const DESCRIPTIONS = {
  shift: { zh: '整张图平移一格；从边界移入的格子补 0', en: 'Shifts the whole picture by one pixel; cells shifted in from the border are 0' },
  invert: { zh: '每个像素变成 1 − 自己：亮的变暗，暗的变亮', en: 'Every pixel becomes 1 − itself: light turns dark and dark turns light' },
  add: { zh: '两张图逐像素相加：a + b', en: 'Adds two pictures pixel by pixel: a + b' },
  sub: { zh: '两张图逐像素相减：a − b', en: 'Subtracts two pictures pixel by pixel: a − b' },
  mul: { zh: '两张图逐像素相乘：a × b', en: 'Multiplies two pictures pixel by pixel: a × b' },
  softmax: { zh: '把三个分数转成总和为 1 的概率，每个输入对应一个输出。', en: 'Turns three scores into probabilities that sum to 1, one output per input.' },
  arith: { zh: '两张图逐像素相加、相减、相乘或相除。可将左侧或右侧设为常数，另一侧接线输入', en: 'Adds, subtracts, multiplies or divides two pictures pixel by pixel. Either side can be set to a constant; the other receives a wire' },
  merge: { zh: '有三个输入口，将接入的图逐像素相加；空置的输入口不计入', en: 'Has three inputs and adds the pictures wired into them pixel by pixel; an empty input is skipped' },
  const: { zh: '始终输出同一个数。与图相加或相乘时，这个数作用于每一格', en: 'Always outputs the same number. Added to or multiplied with a picture, it applies to every cell' },
  threshold: { zh: '大于阈值输出 1，否则输出 0', en: '1 above the threshold, 0 otherwise' },
  square: { zh: '每个像素平方', en: 'Squares every pixel' },
  sqrt: { zh: '每个像素开方', en: 'Square root of every pixel' },
  relu: { zh: '负数变 0，正数不变', en: 'Negatives become 0, positives stay' },
  globalMax: { zh: '用整张图的最大值填满每一格', en: 'Fills every cell with the maximum of the picture' },
  blur3h: { zh: '每格换成它和左右两个邻居的平均', en: 'Each cell becomes the average of itself and its left and right neighbours' },
  box3: { zh: '每格换成它周围 3×3 九个格子的平均', en: 'Each cell becomes the average of the nine cells in the 3×3 block around it' },
  gauss: { zh: '高斯模糊，σ 可调', en: 'Gaussian blur, adjustable σ' },
  diffx: { zh: '右边邻居 − 自己', en: 'Right neighbour − itself' },
  sobelx: { zh: '横向求导、纵向平滑', en: 'Differentiates across, smooths down' },
  sobely: { zh: '纵向求导、横向平滑', en: 'Differentiates down, smooths across' },
  kernel3: { zh: '任意 3×3 核（按“互相关”读权重）', en: 'Any 3×3 kernel (weights read as cross-correlation)' },
  learn3: { zh: '3×3 核，权重由训练决定', en: '3×3 kernel whose weights are set by training' },
  harris: { zh: 'Harris 角点响应：两个方向都在变的地方是正的大数，直边上是负的', en: 'Harris corner response: large and positive where the picture changes in both directions, negative along straight edges' },
  downsample: { zh: '每隔一个像素取一个，尺寸减半', en: 'Keeps every other pixel, halving the size' },
  zeroUp: { zh: '尺寸翻倍：每个像素放在 2×2 的左上角，其余三格补 0', en: 'Doubles the size: each pixel goes in the top left of a 2×2 block, the other three are 0' },
  maxpool: { zh: '每个 2×2 块取最大值，尺寸减半', en: 'Takes the maximum of each 2×2 block, halving the size' },
  gradmag: '√(Gx² + Gy²)',
  argmin4: { zh: '逐像素比较几张代价图，输出最小者的编号', en: 'Compares cost maps pixel by pixel and outputs the index of the smallest' },
  disparity: { zh: '左右图逐行匹配，输出视差，窗口可选', en: 'Matches the left and right images row by row and outputs disparity; window size selectable' },
}

/** What a part of a course's part table (`types`, engine/kit.js) does, as a { zh, en } pair (the parts box). */
export const descriptionOf = (types, type) => DESCRIPTIONS[type] ?? types[type]?.description
// The same, resolved in the current language.
export const describe = (types, type) => L(descriptionOf(types, type) ?? '')
