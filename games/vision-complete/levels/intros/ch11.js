// 第 11 章各关的引入。格式见 ./index.js。
export default {
  '11-1': [
    {
      t: {
        zh: '十章下来，你的电路能找边、认字母、量距离、框出东西。可一个分类器说「这是车」的时候，你怎么知道它是看着车说的？训练照片里的车都停在路上，只认路也能把它们全分对。',
        en: 'Ten chapters on, your circuits find edges, read letters, measure distance and box things in. But when a classifier says "this is a car", how do you know it said so looking at the car? Every car in the training photos stood on a road, and recognising the road alone would sort them all correctly.',
      },
    },
    {
      t: {
        zh: '这一章检查一个最简单的分类器：每一格一个权重，分数是每格亮度乘权重的总和。每组测试除了照片，还把它的权重画成一张图送进来。',
        en: 'This chapter examines the simplest classifier: one weight for every cell, its score the sum of every cell\'s brightness times its weight. Besides the photo, each test sends its weights in, drawn as a picture.',
      },
      fig: { task: 0, test: 1, caption: { zh: '一个只看路的分类器：权重全在路上', en: 'A classifier that looks at the road: all its weight is on the road' } },
    },
    {
      t: {
        zh: '这一关分两个任务。先输出每一格给分数加了多少；再输出：把一格周围 3×3 涂黑，分数掉多少。要想的问题：涂黑一块，丢掉的是哪些格子的分？',
        en: 'This level has two tasks. First output how much each cell adds to the score; then output how far the score drops when the 3×3 round a cell is blacked out. Something to think about: blacking out a block loses which cells\' contributions?',
      },
      fig: { task: 1, test: 0, view: 'terrain', caption: { zh: '第二个任务的第一组：老实的分类器', en: 'Task 2, set 1: an honest classifier' } },
    },
  ],
  '11-2': [
    {
      t: {
        zh: '<level-ref to="11-1"></level-ref>的挡板是黑的。可黑本身也是一种颜色：亮路上的一块黑斑，模型也许会当成车轮或者影子。',
        en: 'The patch in <level-ref to="11-1"></level-ref> was black. But black is a colour in its own right: a dark blotch on a bright road might look to the model like a wheel or a shadow.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：挡板换成灰的（0.5），输出每个位置挡住 3×3 以后分数掉多少。要想的问题：比灰还暗的格子被挡住，分数会怎样？',
        en: 'Your task in this level: the patch becomes grey (0.5); output how far the score drops with the 3×3 at each place covered. Something to think about: what happens to the score when a cell darker than grey is covered?',
      },
      fig: { test: 3, view: 'terrain', caption: { zh: '第四组：看车轮的分类器', en: 'Set 4: a classifier that looks at the wheels' } },
    },
  ],
  '11-3': [
    {
      t: {
        zh: '<part-ref to="own-11-2"></part-ref>用的挡板是 3×3。挡板该多大，没有一定之规：太小，盖不住模型认的那个部件；太大，热图糊成一片。',
        en: 'The <part-ref to="own-11-2"></part-ref> uses a 3×3 patch. There is no fixed rule for the patch size: too small and it never covers the part the model recognises; too large and the heat map blurs into one blob.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：换成 5×5 的灰色挡板，输出每个位置分数掉多少。',
        en: 'Your task in this level: use a 5×5 grey patch, and output how far the score drops at each place.',
      },
      fig: { test: 0, view: 'terrain', caption: { zh: '第一组：老实的分类器，5×5 挡板', en: 'Set 1: an honest classifier, a 5×5 patch' } },
    },
  ],
  '11-4': [
    {
      t: {
        zh: '一张热图要人去看。要是有一千个模型、一万张照片，就得有一个数来回答「它认的是车还是路」。',
        en: 'A heat map needs a person to look at it. With a thousand models and ten thousand photos, one number has to answer "does it see the car or the road?"',
      },
    },
    {
      t: {
        zh: '这一关多给一张车的掩膜：车身和车轮上是 1，别处是 0。你要做的：输出分数里有多大比例来自车上。',
        en: 'This level adds a mask of the car: 1 on the body and wheels, 0 elsewhere. Your task: output what fraction of the score comes from the car.',
      },
      fig: { test: 1, caption: { zh: '第二组：只看路的分类器', en: 'Set 2: a classifier that looks at the road' } },
    },
  ],
  '11-5': [
    {
      t: {
        zh: 'ViT 不是每格一个权重：它把照片切成图块，最前面多放一个类别 token，分类只读它的输出。类别 token 拿自己的查询去问每一个图块，按回答分配注意力。',
        en: 'A ViT has no weight per cell: it cuts the photo into patches and puts an extra class token in front, and only that token\'s output is read to classify. The class token asks every patch with its own query and shares out its attention by the answers.',
      },
    },
    {
      t: {
        zh: '托盘里的<part-ref to="attention"></part-ref>又回来了。这一关的掩膜按 4×4 图块画：车所在的图块是 1。你要做的：输出类别 token 的注意力有多大比例落在车上。',
        en: 'The <part-ref to="attention"></part-ref> is back in the tray. This level\'s mask is drawn by 4×4 patch: 1 on the patches with the car. Your task: output what fraction of the class token\'s attention falls on the car.',
      },
      fig: { test: 0, caption: { zh: '第一组：问「亮不亮」', en: 'Set 1: asking "is it bright?"' } },
    },
  ],
  '11-6': [
    {
      t: {
        zh: '<level-ref to="11-4"></level-ref>的比例是从分数里直接量的，只有每格一个权重的模型才能这样拆。遮挡实验对哪种模型都能做，所以体检用遮挡图来量。',
        en: 'The fraction in <level-ref to="11-4"></level-ref> was measured straight from the score, which only a model with one weight per cell can be taken apart into. The occlusion experiment works on any model, so the check-up measures on the occlusion map.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：输出灰块遮挡图（3×3）有多大比例落在车上。',
        en: 'Your task in this level: output what fraction of the grey 3×3 occlusion map lies on the car.',
      },
      fig: { test: 2, caption: { zh: '第三组：房子旁的车', en: 'Set 3: a car by a house' } },
    },
  ],
  '11-7': [
    {
      t: {
        zh: '最后把检查做成一份报告：一张热图给人看，一个数给流水线判断要不要拦下这个模型。',
        en: 'Finally the check becomes a report: a heat map for people to look at, and a number for the pipeline to decide whether to hold the model back.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：两个输出，热图是灰块遮挡图（3×3）；热图落在车上的比例不到一半就输出 1，否则输出 0。',
        en: 'Your task in this level: two outputs; the heat map is the grey 3×3 occlusion map, and the number is 1 if less than half of it lies on the car, 0 otherwise.',
      },
      fig: { test: 1, caption: { zh: '第二组：只看路的分类器', en: 'Set 2: a classifier that looks at the road' } },
    },
  ],
}
