// 第 6 章各关的引入。格式见 ./index.js。
export default {
  '6-1': [
    {
      t: {
        zh: '手机拍全景时，要在相邻两张照片里认出同一个点，才能把它们拼齐。可不是每个点都好认：白墙上随便一点，换到墙上别处看起来也一样。',
        en: 'When a phone shoots a panorama, it has to recognise the same point in two neighbouring photos to line them up. But not every point is easy to recognise: any spot on a white wall looks just like any other spot on it.',
      },
    },
    {
      t: {
        zh: '这一章要回答：哪些点容易再找到？先比一比平坦处、直边、角这三种地方，想想各自是什么让它好认，或者难认。',
        en: 'This chapter asks: which points are easy to find again? Start by comparing three kinds of place, flat areas, straight edges and corners, and think about what makes each one easy or hard to recognise.',
      },
    },
    {
      t: {
        zh: 'Sobel x、Sobel y 你见过，分别量左右和上下方向的变化。「四则运算」选 ×，就把两张图逐格相乘。',
        en: 'You have met Sobel x and Sobel y: they measure change left-to-right and top-to-bottom. Set Arithmetic to × and it multiplies two images pixel by pixel.',
      },
      fig: { test: 2, caption: { zh: '直边那组：期望处处是 0', en: 'The straight-edge set: expect 0 everywhere' } },
    },
    {
      t: {
        zh: '测试有一个角、一个方块、一条直边和字母 L。角上输出 1，直边和平坦处都输出 0。少数格子出错可以接受。',
        en: 'The tests are a corner, a square, a straight edge and the letter L. Output 1 on corners and 0 on straight edges and flat areas. A few wrong pixels are fine.',
      },
      fig: { test: 0, caption: { zh: '一个角：只有拐角处是 1', en: 'A corner: only the corner itself is 1' } },
    },
  ],
  '6-2': [
    {
      t: {
        zh: '响应图一过门槛，留下的是一片一片：一个角附近有好几格都很强。可一个角只该是一个点。',
        en: 'Above a threshold a response map leaves patches: several cells near one corner are all strong. But a corner should be a single point.',
      },
    },
    {
      t: {
        zh: '一片里真正的位置是它的峰顶：比四周都高的那一格。',
        en: 'The true position in a patch is its top: the cell higher than everything around it.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：一张响应图上有几个鼓包，只在峰顶输出 1。',
        en: 'Your task in this level: a response map has a few bumps; output 1 only at their tops.',
      },
      fig: { test: 0, view: 'terrain', caption: { zh: '第一组：三个鼓包', en: 'Set 1: three bumps' } },
    },
  ],
  '6-3': [
    {
      t: {
        zh: '上一关搭的「找峰」现在是现成的元件。',
        en: 'The "Peak finder" you built last level is now a ready-made part.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：每个角只输出一个点。',
        en: 'Your task in this level: output a single point per corner.',
      },
      fig: { test: 1, caption: { zh: '字母 L', en: 'Letter L' } },
    },
  ],
  '6-4': [
    {
      t: {
        zh: '找到好认的点之后，下一步是配对：左图的这个点，是右图的哪一个？最直接的办法是比外观，拿它周围的一小块，到右图里找最像的一块。',
        en: 'Once you have points that are easy to recognise, the next step is pairing them up: which point in the right image is this point from the left image? The most direct way is to compare how they look: take a small patch around it and search the right image for the most similar patch.',
      },
    },
    {
      t: {
        zh: '像不像用距离 d 来量：两块逐格相减、平方、加起来再开方，d 越小越像。每个点在右图里最像的叫第一名，距离 d₁；其次是第二名，距离 d₂。',
        en: 'Similarity is measured by a distance d: subtract the two patches pixel by pixel, square, add up, then take the square root. The smaller d is, the more alike they are. For each point, the closest match in the right image is first place, at distance d₁; the next is second place, at distance d₂.',
      },
    },
    {
      t: {
        zh: '这一关把比较的结果直接交给你：每一格是一个关键点，三张图是它到三个候选的距离。最近的不一定可信：要是第二近的几乎一样近，这一对就可能是重复花纹配错了。',
        en: 'This level hands you the comparisons directly: each cell is a keypoint, and the three maps are its distances to three candidates. The nearest is not always to be trusted: if the second nearest is almost as near, the pair may be a mistake caused by repeated texture.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：按说明里的规则，输出每个关键点配上的候选编号，不可信的输出 0。',
        en: 'Your task in this level: following the rule in the brief, output the number of the candidate each keypoint matches, and 0 when the match cannot be trusted.',
      },
      fig: { test: 0, caption: { zh: '第一组', en: 'Set 1' } },
    },
  ],
  '6-5': [
    {
      t: {
        zh: '上一关搭的「匹配器」现在是现成的元件：接上三个距离，它给出配上的候选编号。',
        en: 'The "Matcher" you built last level is now a ready-made part: give it three distances and it returns the number of the matching candidate.',
      },
    },
    {
      t: {
        zh: '两张照片常常不是同时拍的，光线变了，同一处在右图里整体亮一截。',
        en: 'Two photos are often not taken at the same moment: the light changes, and the same place is brighter all over in the right one.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：找出哪个候选窗口和关键点的窗口是同一处，输出它的编号。',
        en: 'Your task in this level: find which candidate window shows the same place as the keypoint window, and output its number.',
      },
      fig: { test: 0, caption: { zh: '第一组', en: 'Set 1' } },
    },
  ],
  '6-6': [
    {
      t: {
        zh: '很多时候要找的是一条线：车道线、纸张的边、楼房的轮廓。边缘检测给的只是一堆零散的点，还夹着噪声和不相干的点。怎样从中认出直线？',
        en: 'Often what you are looking for is a line: a lane marking, the edge of a sheet of paper, the outline of a building. Edge detection only gives a scatter of loose points, mixed with noise and unrelated points. How do you pick out straight lines from that?',
      },
    },
    {
      t: {
        zh: 'Hough 变换让点来投票。一条直线可以用两个数记下：方向 θ，和它离中心的距离 ρ。每个点给所有穿过它的直线投票，真有的那条线会收到很多票。',
        en: 'The Hough transform lets the points vote. A straight line can be written down with two numbers: its direction θ and its distance ρ from the centre. Every point votes for all the lines passing through it, and a line that is really there collects lots of votes.',
      },
    },
    {
      t: {
        zh: '票要落进格子里才能数：(θ, ρ) 的平面被切成一格格，这叫分箱。台上右边就是这些格子，颜色越浓票越多，标出的 1、2 是票最多的两个峰。',
        en: 'Votes can only be counted once they land in cells: the (θ, ρ) plane is cut into a grid, which is called binning. These cells are on the right of the bench; the darker the colour, the more votes, and the marked 1 and 2 are the two peaks with the most votes.',
      },
    },
    {
      t: {
        zh: '这一关你要调分箱的大小，让三组图里票最多的两个峰正好是那两条线。动手前想想：格子的大小，会影响票怎样聚在一起？',
        en: 'In this level you tune the bin size so that, in all three sets, the two peaks with the most votes are exactly the two lines. Before you start, think: how does the cell size affect the way votes gather together?',
      },
    },
  ],
  '6-7': [
    {
      t: {
        zh: '投票台通关后，「Hough 累加器」是现成的元件：亮点进去，出来一张 (θ, ρ) 的票数图。',
        en: 'Now that the voting bench is done, "Hough accumulator" is a ready-made part: bright points go in, and a map of votes over (θ, ρ) comes out.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：路面上有两条车道线和几个亮点，在累加器里只标出这两条线。',
        en: 'Your task in this level: the road has two lane lines and a few bright specks; mark only these two lines in the accumulator.',
      },
      fig: { test: 0, caption: { zh: '第一组：两条车道', en: 'Set 1: two lanes' } },
    },
  ],
  '6-8': [
    {
      t: {
        zh: '配对、找线时总会混进错的点，叫外点；对的点叫内点。用一条线去贴合所有点，几个离得远的外点就能把线拽歪。全景拼接、车道识别都要先对付它们。',
        en: 'When matching points or finding lines, wrong points always creep in; these are called outliers, and the right ones inliers. If you fit one line to all the points, a few far-off outliers can drag it askew. Panorama stitching and lane detection both have to deal with them first.',
      },
    },
    {
      t: {
        zh: 'RANSAC 换了个思路：随机抽两个点连成线，数有多少点离它够近，算作支持；反复抽很多轮，留下支持最多的那条。',
        en: 'RANSAC takes a different approach: pick two points at random and join them with a line, then count how many points lie close enough to it to count as support. Repeat for many rounds and keep the line with the most support.',
      },
      fig: {
        figure: 'ransac-pegboard',
        caption: { zh: 'RANSAC 钉板：每轮抽两根钉，落在导轨之间的钉投票', en: 'RANSAC pegboard: each round draws two pegs, and the pegs between the rails vote' },
      },
    },
    {
      t: {
        zh: '台上要定两个数：抽几轮 k，以及离线多近才算支持 δ。每种设置都会跑 200 次试验，看找对的比例。外点比例有三种，每种的轮数都有上限。',
        en: 'On the bench you set two numbers: the number of rounds k, and δ, how close to the line a point must be to count as support. Each setting is run for 200 trials to see how often it finds the right line. There are three outlier ratios, and each has a cap on the number of rounds.',
      },
    },
    {
      t: {
        zh: '这一关你要为三种外点比例各选一个 k，再选一个共用的 δ，让成功率都达到 99%。要想的是：外点越多，轮数该怎样变？δ 又该由什么决定？',
        en: 'In this level you choose a k for each of the three outlier ratios, plus one shared δ, so that every success rate reaches 99%. The questions are: as outliers increase, how should the number of rounds change? And what should decide δ?',
      },
    },
  ],
  '6-9': [
    {
      t: {
        zh: '共识台通关后，「RANSAC 找直线」是现成的元件：轮数 k 和 δ 都能调。',
        en: 'Now that the consensus bench is done, "RANSAC line" is a ready-made part, with the rounds k and δ to set.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：边缘图里有一条直线和一堆杂点，把这条线画出来。',
        en: 'Your task in this level: an edge map holds one straight line and a heap of specks; draw the line.',
      },
      fig: { test: 1, caption: { zh: '杂点更多的那组', en: 'The set with more specks' } },
    },
  ],
  '6-10': [
    {
      t: {
        zh: '一个点光知道「在哪」还不够，还要记下它周围长什么样，才认得出。SIFT 的办法是数一数周围的边都朝哪个方向。',
        en: 'Knowing where a point is is not enough to recognise it; you also need to record what its surroundings look like. SIFT does it by counting which way the edges around it face.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：把每一格的梯度幅值分到上下左右四个方向，输出四个方向各自的平均。',
        en: 'Your task in this level: share each cell\'s gradient magnitude out to the four directions up, down, left and right, and output the average for each.',
      },
      fig: { test: 0, caption: { zh: '第一组：竖边', en: 'Set 1: a vertical edge' } },
    },
  ],
  '6-11': [
    {
      t: {
        zh: '用手机对着一本书拍，App 能认出是哪本书，还能把封面图贴回照片里，增强现实（AR）常这样做。难处在于书是斜着拍的，在照片里不再方方正正。',
        en: 'Point your phone at a book and an app can tell which book it is and even paste the cover image back into the photo; augmented reality (AR) often works like this. The hard part is that the book is shot at an angle, so in the photo it is no longer a neat rectangle.',
      },
    },
    {
      t: {
        zh: '把封面贴回照片，需要一个变换：它告诉封面上的每个点，落到照片的哪里。变换由几对对应点算出来，点对给得合适，就贴得准。',
        en: 'Pasting the cover back into the photo needs a transformation: it tells each point on the cover where it lands in the photo. The transformation is computed from a few pairs of corresponding points; choose the pairs well and the cover lands accurately.',
      },
    },
    {
      t: {
        zh: '台上左边是封面，右边是照片。从封面上的一个点连到照片里同一个点，游戏会用你给的点对算出变换，把封面贴上去，并显示平均误差。',
        en: 'On the bench the cover is on the left and the photo on the right. Connect a point on the cover to the same point in the photo; the game computes the transformation from your point pairs, pastes the cover on and shows the average error.',
      },
    },
    {
      t: {
        zh: '这一关要把封面贴准，平均误差小于 1.5 像素。动手前先看看照片里书的形状：和封面原来的长方形比，变了哪些？',
        en: 'In this level you must paste the cover accurately, with an average error under 1.5 pixels. Before you start, look at the shape of the book in the photo: compared with the cover\'s original rectangle, what has changed?',
      },
    },
  ],
  '6-12': [
    {
      t: {
        zh: '四个角那一关通关后，「求单应」是现成的元件：点对进去，出来 H 的 9 个数。这一关先不用它，H 直接给你。',
        en: 'Now that the four-corners bench is done, "Solve homography" is a ready-made part: pairs go in and the 9 numbers of H come out. This level does not need it yet: H is given.',
      },
    },
    {
      t: {
        zh: '新元件「单应变形」按 H 把一张图搬到另一张图上。',
        en: 'The new part "Homography warp" carries a picture onto another by H.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：把清楚的封面贴到照片里书的位置上。',
        en: 'Your task in this level: paste the crisp cover over the book in the photo.',
      },
      fig: { test: 0, caption: { zh: '第一组', en: 'Set 1' } },
    },
  ],
  '6-13': [
    {
      t: {
        zh: '真实的点对来自匹配器，桌面的花纹一格格重复，难免配错几对。',
        en: 'Real pairs come from the matcher, and with a desk pattern that repeats tile after tile, a few are bound to be wrong.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：用这些点对把封面贴回照片。',
        en: 'Your task in this level: paste the cover back onto the photo using these pairs.',
      },
      fig: { test: 0, caption: { zh: '第一组：两对错配', en: 'Set 1: two wrong matches' } },
    },
  ],
}
