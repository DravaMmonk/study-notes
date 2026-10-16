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
        zh: '人看图时常拿远处作参照：一排窗户少了一扇，你会照着别的窗户把它想出来。2020 年的 ViT 把图切成小块，让每块直接和所有块比较，这叫<b>注意力</b>。',
        en: 'When people look at a picture they often use distant parts as a reference: if a row of windows is missing one, you imagine it from the others. ViT (2020) cuts the image into small patches and lets each patch compare itself directly with every other patch. This is called <b>attention</b>.',
      },
    },
    {
      t: {
        zh: '新元件「注意力」把 16×16 的图切成 16 个 4×4 的图块，每块按「像不像」给所有图块打分，再按分数取一份加权平均。参数「q 放大」可以拧着看输出怎么变。',
        en: 'The new "Attention" part cuts the 16×16 image into 16 patches of 4×4. Each patch scores every patch by how similar it looks, then takes a weighted average using those scores. Turn the "q scale" parameter to see how the output changes.',
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
  '5-2': [
    {
      t: {
        zh: '「狗咬人」和「人咬狗」用的是同样的字，意思却相反，差别全在顺序。图也一样：左边亮右边暗，和反过来，是两张不同的图。',
        en: '"Dog bites man" and "man bites dog" use the same words but mean opposite things; the difference is all in the order. Images are the same: bright on the left and dark on the right is a different image from the reverse.',
      },
    },
    {
      t: {
        zh: '上一关的注意力按「长得像不像」分配权重，它清楚每个图块是什么样子。可它知道这块排在第几吗？先想一想：把两个图块对调，注意力的输出会怎样？',
        en: 'The attention from the last level shares out its weights by how alike patches look, so it knows what each patch looks like. But does it know where a patch comes in the order? Think first: if you swap two patches, what happens to the attention output?',
      },
    },
    {
      t: {
        zh: '新元件「位置编码」按阅读顺序给第 i 个图块的每格加上 g·i：第 1 块加得最少，第 16 块最多，像给每块贴上门牌号。',
        en: 'The new "Positional encoding" part adds g·i to every pixel of the i-th patch in reading order: patch 1 gets the least, patch 16 the most, like putting a house number on each patch.',
      },
      fig: {
        part: 'posenc',
        input: 'blank',
        caption: { zh: '一张全黑的图加上位置编码：越靠后的图块越亮', en: 'An all-black image plus positional encoding: the later the patch, the brighter it is' },
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
  '5-3': [
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
}
