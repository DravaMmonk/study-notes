// 第 10 章各关的引入。格式见 ./index.js。
export default {
  '10-1': [
    {
      t: {
        zh: '检测器不光要说出「有一只狗」，还要用一个框圈出它在哪。框得准不准，要和人标注的框比。',
        en: 'A detector must not only say "there is a dog" but draw a box round where it is. How good the box is gets judged against a box a person labelled.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：两个框画成掩膜，输出它们的交并比，公式在说明里。',
        en: 'Your task in this level: two boxes drawn as masks; output their intersection over union, with the formula in the brief.',
      },
      fig: { test: 0, caption: { zh: '第一组：错开一点', en: 'Set 1: slightly off' } },
    },
  ],
  '10-2': [
    {
      t: {
        zh: '托盘里的「IoU」输出两个框掩膜的交并比：重叠面积除以合起来的面积。',
        en: 'The IoU in the tray outputs the intersection over union of two box masks: the overlap divided by the area they cover together.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：IoU 够大就算找对了，输出 1。',
        en: 'Your task in this level: if the IoU is large enough the detection counts as right; output 1.',
      },
      fig: { test: 3, caption: { zh: '差不多', en: 'Nearly the same' } },
    },
  ],
  '10-3': [
    {
      t: {
        zh: '检测器给出一串框，每个带一个分数。按分数排好，逐个看是对是错，就能给检测器打一个总分。',
        en: 'A detector gives a list of boxes, each with a score. Sort them by score, check each in turn for right or wrong, and the detector can be given an overall mark.',
      },
    },
    {
      t: {
        zh: '这一关的输入是排好的对错（一行 16 个 0 或 1）、名次 1 到 16，和一共标注了几个。',
        en: 'The inputs of this level are the sorted rights and wrongs (a row of sixteen 0s and 1s), the ranks 1 to 16, and how many were labelled in all.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：按说明里的公式算出 AP。',
        en: 'Your task in this level: work out AP by the formula in the brief.',
      },
      fig: { test: 1, caption: { zh: '对错交替', en: 'Right and wrong in turn' } },
    },
  ],
  '10-4': [
    {
      t: {
        zh: '托盘里的「AP 计」读按分数排好的对错、名次和标注数 G，输出 AP。',
        en: 'The AP meter in the tray reads right or wrong in score order, the ranks and the number labelled G, and outputs the AP.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：两类各有一张排名表，输出两类 AP 的平均。',
        en: 'Your task in this level: each of two classes has its own ranking; output the average of their APs.',
      },
      fig: { test: 0, caption: { zh: '一好一差', en: 'One good, one poor' } },
    },
  ],
  '10-5': [
    {
      t: {
        zh: '检测器不是凭空画框：它先在每个位置放几个固定大小的锚框，再估计该把锚框挪多少、拉多大。',
        en: 'A detector does not draw boxes out of nothing: it first places a few anchors of fixed size at every position, then estimates how far to move them and how much to stretch them.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：按说明里的公式，由锚框和四个修正算出框。',
        en: 'Your task in this level: by the formula in the brief, work out the box from the anchor and the four corrections.',
      },
      fig: { test: 0, caption: { zh: '往右挪', en: 'Nudged right' } },
    },
  ],
  '10-6': [
    {
      t: {
        zh: '同一个位置常放好几个锚框，大小不同。',
        en: 'Several anchors of different sizes often sit at the same position.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：同一组修正作用到一排锚框上，输出一排框。',
        en: 'Your task in this level: apply the same corrections to a row of anchors and output a row of boxes.',
      },
      fig: { test: 0, caption: { zh: '往右挪', en: 'Nudged right' } },
    },
  ],
  '10-7': [
    {
      t: {
        zh: '最直接的检测办法：拿一个模板在图上一格一格挪过去，每到一处打个分，看像不像。',
        en: 'The most direct way to detect: move a template over the picture cell by cell, scoring at each place how alike it looks.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：货架上的箱子贴着 X 或 O 的记号，只在 X 的正中间输出 1。',
        en: 'Your task in this level: the boxes on the shelf carry X or O marks; output 1 only at the centre of each X.',
      },
      fig: { test: 0, caption: { zh: '第一组', en: 'Set 1' } },
    },
  ],
  '10-8': [
    {
      t: {
        zh: '一只狗占好几个像素，附近好几个位置都像狗。检测器常常给同一只狗画出好几个框。',
        en: 'A dog covers several pixels, and several nearby positions all look like a dog. A detector often draws several boxes for one dog.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：每只狗只输出一个点。',
        en: 'Your task in this level: output a single point for each dog.',
      },
      fig: { test: 0, view: 'terrain', caption: { zh: '第一组：两只狗', en: 'Set 1: two dogs' } },
    },
  ],
  '10-9': [
    {
      t: {
        zh: '仓库的机器人要盘点货架：找出所有贴了 X 的箱子。照片有噪点。',
        en: 'A warehouse robot has to take stock of a shelf: find every box marked X. The photo is grainy.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：只在每个 X 的正中间输出 1。',
        en: 'Your task in this level: output 1 only at the centre of each X.',
      },
      fig: { test: 0, caption: { zh: '一层货架', en: 'One shelf' } },
    },
  ],
  '10-10': [
    {
      t: {
        zh: '货架上的箱子有小有大，大箱子的记号也大一倍。',
        en: 'Some boxes on the shelf are small and some large, and the large boxes have marks twice the size.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：小 X 标一个点，大 X 标一个 2×2 的小块。',
        en: 'Your task in this level: mark a small X with a point and a large X with a 2×2 block.',
      },
      fig: { test: 0, caption: { zh: '一大一小', en: 'One large, one small' } },
    },
  ],
  '10-11': [
    {
      t: {
        zh: '真实的照片有噪点，也有点糊，大小箱子混在一起。',
        en: 'A real photo is grainy and a little blurred, with large and small boxes mixed.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：每个 X 恰好标一处。',
        en: 'Your task in this level: mark each X exactly once.',
      },
      fig: { test: 0, caption: { zh: '一大一小', en: 'One large, one small' } },
    },
  ],
}
