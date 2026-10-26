// 第 5 章各关的引入。格式见 ./index.js。
export default {
  '5-1': [
    {
      t: {
        zh: '到目前为止的元件都只看自己周围一小圈：3×3 平均、Sobel 都是这样。如果要补的东西，线索在图的另一头，它们要走多少步才够得着？',
        en: 'Every part so far only looks at a small ring around itself: 3×3 average and Sobel both work that way. If the clue for what needs filling in sits at the other end of the image, how many steps would they need to reach it?',
      },
    },
    {
      t: {
        zh: '人看图时常拿远处作参照：一排窗户少了一扇，你会照着别的窗户把它想出来。2020 年的 ViT 把图切成小块，让每块直接和所有块比较，按「像不像」决定从谁那里取多少。这叫<b>注意力</b>。',
        en: 'When people look at a picture they often use distant parts as a reference: if a row of windows is missing one, you imagine it from the others. ViT (2020) cuts the image into small patches and lets each patch compare itself directly with every other, taking more from the ones it looks more like. This is called <b>attention</b>.',
      },
    },
    {
      t: {
        zh: '先只做两块的版本。图块 a 是提问的一方，它给 a、b 各打一个分，分数换成权重，再按权重把两块混在一起。说明里写清了打分和换算的规则。',
        en: 'Start with just two patches. Patch a does the asking: it gives a score to a and to b, the scores become weights, and the two patches are mixed by those weights. The brief spells out the rules for the scores and the weights.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：照着规则，用乘、平均、exp 和除，算出 a 问完两块之后得到的那一块。',
        en: 'Your task in this level: following the rules, use multiply, average, exp and divide to work out the patch a gets back after asking both.',
      },
      fig: { test: 0, caption: { zh: '第一组：X 问 C', en: 'Set 1: X asks C' } },
    },
  ],
  '5-2': [
    {
      t: {
        zh: '托盘里的「注意力」把 16×16 的图切成 16 个 4×4 的图块，每块都向所有图块提问。参数「q 放大」把分数一起放大：放得越大，越只看最像的几块。',
        en: 'The Attention in the tray cuts the 16×16 image into 16 patches of 4×4, and every patch asks every patch. The "q scale" parameter scales up all the scores: the larger it is, the more each patch looks only at the few most alike.',
      },
    },
    {
      t: {
        zh: '测试图的一对对角上本是同一个小图案，其中一个被擦掉几格；也有一组什么都没擦。这一关最多 3 个节点。要想的是：被擦掉的格子，图里哪里还留着它的样子？',
        en: 'In each test image, two opposite corners hold the same small pattern, but one has had a few pixels erased; one set has nothing erased. This level allows at most 3 nodes. The question is: where else in the image does an erased pixel still show what it looked like?',
      },
      fig: { test: 0, caption: { zh: '第一组：左上角的图案缺了几格', en: 'Set 1: the top-left pattern is missing a few pixels' } },
    },
  ],
  '5-3': [
    {
      t: {
        zh: '注意力里，每一格都要把所有图块加一遍。图块切得越小，图块就越多，要算的也越多。',
        en: 'In attention, every cell adds up over all the patches. The smaller the patches, the more of them there are, and the more there is to compute.',
      },
    },
    {
      t: {
        zh: '「注意力」多了一个设置：图块边长 P，可以是 2、4 或 8。',
        en: 'Attention has gained a setting: the patch size P, which can be 2, 4 or 8.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：图案变成了 8×8 的，一张图四个，还是补全对角；计算量有上限。',
        en: 'Your task in this level: the patterns are now 8×8, four to a picture, and it is mending across the diagonal again; the cost has a limit.',
      },
      fig: { test: 0, caption: { zh: '第一组：左上角的图案缺了几块', en: 'Set 1: the top-left pattern is missing a few blocks' } },
    },
  ],
  '5-4': [
    {
      t: {
        zh: '一个注意力按一种「像」去找：Q 和 K 从哪张图来，它就按那张图比。',
        en: 'One attention looks for one kind of likeness: whichever picture Q and K come from, that is the picture it compares by.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：两张图各有一个图案被擦掉几格，孪生图案在各自图里的别处。两个输出分别补好两张图。',
        en: 'Your task in this level: each of two pictures has a pattern with a few pixels erased, and its twin is elsewhere in the same picture. The two outputs are the two pictures mended.',
      },
      fig: { test: 0, caption: { zh: '第一组', en: 'Set 1' } },
    },
  ],
  '5-5': [
    {
      t: {
        zh: '「狗咬人」和「人咬狗」用的是同样的字，意思却相反，差别全在顺序。图也一样：左边亮右边暗，和反过来，是两张不同的图。',
        en: '"Dog bites man" and "man bites dog" use the same words but mean opposite things; the difference is all in the order. Images are the same: bright on the left and dark on the right is a different image from the reverse.',
      },
    },
    {
      t: {
        zh: '<level-ref to="5-1"></level-ref>的注意力按「长得像不像」分配权重，它清楚每个图块是什么样子。可它知道这块排在第几吗？先想一想：把两个图块对调，注意力的输出会怎样？',
        en: 'The attention from <level-ref to="5-1"></level-ref> shares out its weights by how alike patches look, so it knows what each patch looks like. But does it know where a patch comes in the order? Think first: if you swap two patches, what happens to the attention output?',
      },
    },
    {
      t: {
        zh: '这一关多了一个输入：每一格所在图块的编号，按阅读顺序从 0 数到 15。',
        en: 'This level has an extra input: the number of the patch each cell is in, counting 0 to 15 in reading order.',
      },
    },
    {
      t: {
        zh: '测试图是一片灰，里面有一块亮、一块暗。按先左后右、再从上到下的顺序，亮块在前就整张输出 1，否则输出 0。测试是成对的：同样两块，只换了位置。',
        en: 'Each test image is grey with one bright patch and one dark patch. Reading left to right, then top to bottom, output 1 everywhere if the bright patch comes first, otherwise 0. The tests come in pairs: the same two patches with their positions swapped.',
      },
      fig: {
        test: 0,
        caption: { zh: '亮块是第 2 块，暗块是第 3 块：亮在前，期望全是 1', en: 'The bright patch is number 2 and the dark one number 3: bright comes first, so expect all 1s' },
      },
    },
  ],
  '5-6': [
    {
      t: {
        zh: '自注意力里，每个图块都用自己去提问，所以各问各的。',
        en: 'In self-attention every patch asks with itself, so each asks its own question.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：每个图块都换成全图最亮的那个图块，也就是各格加起来最大的那一块。',
        en: 'Your task in this level: replace every patch with the brightest patch in the picture, the one whose cells add up to the most.',
      },
      fig: { test: 0, caption: { zh: '第一组', en: 'Set 1' } },
    },
  ],
  '5-7': [
    {
      t: {
        zh: '前几章的训练都靠标签：每张图配一个人写的答案。可现实里绝大多数照片没有标签，给上百万张图逐一标注又贵又慢。没有答案，还能学吗？',
        en: 'Training in earlier chapters relied on labels: every image came with an answer written by a person. But in the real world almost no photos have labels, and labelling millions of images one by one is slow and expensive. Can a model still learn without answers?',
      },
    },
    {
      t: {
        zh: '一个办法：把一张图做成两个变形版本，挪一点、调亮暗、加点噪声。两个版本一定来自同一张图，这件事本身就能当答案用。很多图像模型先这样在大量没标签的图上练过。',
        en: 'One way: make two altered versions of an image, shifted a little, brighter or darker, with some noise added. The two versions are certain to come from the same image, and that fact alone can serve as the answer. Many image models are first trained like this on huge numbers of unlabelled images.',
      },
    },
    {
      t: {
        zh: '台上的编码器把每个视图变成一个方向，画成圆上的一个点；同一张图的两个视图连着线，叫一对搭档。测验时，每个视图要在所有点里挑出自己的搭档。',
        en: 'The encoder on the bench turns each view into a direction, drawn as a point on a circle; the two views of the same image are joined by a line and called a pair of partners. In the quiz, each view has to pick out its own partner from all the points.',
      },
    },
    {
      t: {
        zh: '损失公式分两项：一项把搭档拉近，一项把同一批里的其他视图推开，第二项可以开关。这一关你要训练编码器。动手前先想：一个好的编码器，点在圆上应该是什么样子？',
        en: 'The loss has two terms: one pulls partners together, the other pushes away the other views in the same batch, and the second can be switched on or off. In this level you train the encoder. Before you start, think: with a good encoder, what should the points on the circle look like?',
      },
    },
  ],
  '5-8': [
    {
      t: {
        zh: '托盘里的「对比编码器」把一张图变成一组特征，同一张图的各种变形得到的特征很接近。',
        en: 'The Contrastive encoder in the tray turns a picture into a set of features, and different versions of the same picture get features close to each other.',
      },
    },
    {
      t: {
        zh: '两组特征有多像，可以用余弦相似度来量：长度为 1 的两组特征，对应相乘再加起来。',
        en: 'How alike two sets of features are can be measured by cosine similarity: for two sets of features of length 1, multiply them pair by pair and add up.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：三张候选里找出和要找的照片是同一张的那一张。',
        en: 'Your task in this level: among three candidates, find the one that is the same photo as the one you are looking for.',
      },
      fig: { test: 0, caption: { zh: '第一组：T 找 T', en: 'Set 1: T finds T' } },
    },
  ],
  '5-9': [
    {
      t: {
        zh: '相册里常有同一张照片的好几个版本：裁过的、调过色的、压缩出噪点的。整理相册时要把它们并成一张，不同的照片却不能并。',
        en: 'An album often holds several versions of the same photo: cropped, recoloured, noisy from compression. Tidying the album means merging them into one, but different photos must not be merged.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：两张照片是同一张就输出 1，否则输出 0。',
        en: 'Your task in this level: output 1 if the two photos are the same photo, otherwise 0.',
      },
      fig: { test: 0, caption: { zh: '第一组：挪了一格', en: 'Set 1: shifted a pixel' } },
    },
  ],
}
