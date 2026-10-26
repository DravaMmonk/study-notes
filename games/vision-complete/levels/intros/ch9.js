// 第 9 章各关的引入。格式见 ./index.js。
export default {
  '9-1': [
    {
      t: {
        zh: '前几章的网络越往后图越小：池化、隔点取样一层层把 16×16 缩成几个数，最后回答「这是什么」。可要是问「每个像素是什么」，答案得和原图一样大。',
        en: 'The networks of earlier chapters make the picture smaller and smaller: pooling and downsampling shrink 16×16 to a few numbers that answer "what is this?". But to ask "what is every pixel?", the answer has to be as big as the original.',
      },
    },
    {
      t: {
        zh: '新原件「补零放大」把图放大一倍：每个像素放在 2×2 的左上角，另外三格补 0。',
        en: 'The new primitive "Zero upsample" doubles the size: each pixel goes in the top left of a 2×2 block, and the other three cells are 0.',
      },
      fig: { part: 'zeroUp', input: 'impulse', caption: { zh: '一个亮点补零放大', en: 'A bright dot, zero-upsampled' } },
    },
    {
      t: {
        zh: '这一关你要做的：把 8×8 的图放大成 16×16，每个像素变成一样的 2×2 一块。',
        en: 'Your task in this level: enlarge an 8×8 picture to 16×16, every pixel becoming a 2×2 block of the same value.',
      },
      fig: { test: 0, caption: { zh: '第一组：方块', en: 'Set 1: square' } },
    },
  ],
  '9-2': [
    {
      t: {
        zh: '托盘里的「转置卷积」先补零放大一倍，再用一个 3×3 的核走一遍，核可以自己填。',
        en: 'The Transposed convolution in the tray zero-upsamples to twice the size, then runs a 3×3 kernel over it; you fill in the kernel yourself.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：放大得平滑一些，规则在说明里。',
        en: 'Your task in this level: enlarge more smoothly; the rule is in the brief.',
      },
      fig: { test: 2, caption: { zh: '斜坡', en: 'Ramp' } },
    },
  ],
  '9-3': [
    {
      t: {
        zh: '最大池化留下每个 2×2 块里最大的那个数，却没记下它在块里的哪一格。放大回来时，它该放在哪？',
        en: 'Max pooling keeps the largest number of each 2×2 block, but does not record which cell of the block it was in. When enlarging back, where should it go?',
      },
    },
    {
      t: {
        zh: '这一关你要做的：把池化后的值放回它原来的那一格，块里其余格子是 0。池化前的图也给你。',
        en: 'Your task in this level: put each pooled value back in the cell it came from, with the rest of the block 0. The picture before pooling is given too.',
      },
      fig: { test: 0, caption: { zh: '第一组', en: 'Set 1' } },
    },
  ],
  '9-4': [
    {
      t: {
        zh: '托盘里的「反池化」把池化后的每个值放回池化前它所在的那一格，其余格子为 0。',
        en: 'The Unpool in the tray puts each pooled value back in the cell it came from before pooling; every other cell is 0.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：池化一张亮点图再放大回来，每个亮点要回到原处。',
        en: 'Your task in this level: pool a picture of bright dots and enlarge it back, with every dot returning to its place.',
      },
      fig: { test: 0, caption: { zh: '第一组：三个点', en: 'Set 1: three dots' } },
    },
  ],
  '9-5': [
    {
      t: {
        zh: '没有人告诉机器哪些是前景、哪些是背景时，它能不能自己把像素分成几堆？',
        en: 'When nobody tells the machine what is foreground and what is background, can it split the pixels into heaps by itself?',
      },
    },
    {
      t: {
        zh: '一个办法：先随便定一条亮度分界，按它把像素分成两类，看看两类各自的平均，再挪分界。',
        en: 'One way: draw a boundary in brightness anywhere, split the pixels into two classes by it, look at each class\'s average, then move the boundary.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：按说明里的规则，算出挪一次以后的新分界。',
        en: 'Your task in this level: by the rule in the brief, work out the new boundary after one move.',
      },
      fig: { test: 0, caption: { zh: '第一组：圆斑', en: 'Set 1: a round patch' } },
    },
  ],
  '9-6': [
    {
      t: {
        zh: '托盘里的「k 均值一步」按分界 m 把值分成两类，输出两类平均值的正中间。',
        en: 'The One k-means step in the tray splits the values into two classes at the boundary m and outputs halfway between the two class averages.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：从起始分界出发走三步，再把每个像素分成两类。',
        en: 'Your task in this level: take three steps from the starting boundary, then split every pixel into two classes.',
      },
      fig: { test: 1, caption: { zh: '第二组：右边一条', en: 'Set 2: a strip on the right' } },
    },
  ],
  '9-7': [
    {
      t: {
        zh: '显微镜下数细胞、量细胞，第一步是标出每个像素是不是细胞。可切片上满是噪点。',
        en: 'To count and measure cells under a microscope, the first step is marking whether every pixel is a cell. But the slide is full of grain.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：标出细胞（1）和背景（0）。',
        en: 'Your task in this level: mark the cells (1) and the background (0).',
      },
      fig: { test: 0, caption: { zh: '第一组：两个细胞', en: 'Set 1: two cells' } },
    },
  ],
  '9-8': [
    {
      t: {
        zh: '细胞常常挤在一起，中间只隔一条极细的缝。数细胞时，缝丢了，两个就算成一个。',
        en: 'Cells often crowd together with only a very thin gap between them. When counting, lose the gap and two count as one.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：标出细胞，细胞之间的缝要留着。',
        en: 'Your task in this level: mark the cells, keeping the gaps between them.',
      },
      fig: { test: 0, caption: { zh: '第一组：两个挨着', en: 'Set 1: two touching' } },
    },
  ],
  '9-9': [
    {
      t: {
        zh: '一批切片来自不同的显微镜、不同的染色，有的整体暗，有的整体亮。',
        en: 'A batch of slides comes from different microscopes and stains: some dark overall, some bright.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：每张切片都标出细胞，缝要留着。',
        en: 'Your task in this level: mark the cells on every slide, keeping the gaps.',
      },
      fig: { test: 1, caption: { zh: '第二组：亮的切片', en: 'Set 2: a bright slide' } },
    },
  ],
}
