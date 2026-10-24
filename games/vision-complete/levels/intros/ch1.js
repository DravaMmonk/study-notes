// 第 1 章各关的引入。格式见 ./index.js。
export default {
  '1-1': [
    { t: { zh: '到目前为止，输出的每一格只看输入里同一位置的那一格。这一章换个思路：算一格时，也看看它周围的邻居。', en: 'So far, each output cell has looked only at the cell in the same position in the input. This chapter changes that: when computing a cell, also look at the neighbours around it.' } },
    { t: { zh: '最简单的例子是取平均。把一格换成它和邻居的平均，孤零零的亮点会被摊开，忽亮忽暗的毛刺会被抹平。手机夜景模式压噪点，用的就是同类的办法。', en: 'The simplest example is averaging. Replace a cell with the average of itself and its neighbours, and a lone bright dot gets spread out while flickering specks get smoothed away. A phone\'s night mode uses the same kind of trick to suppress noise.' } },
    { t: { zh: '从这一章起，相加、相减、相乘合成一个元件「四则运算」：在元件上选 +、−、× 或 ÷。÷ 是新的：a ÷ b 把 a 的每一格除以 b 的同一格。还有一个新元件「汇合器」：它有三个输入口，把接进来的图逐格加起来，空着的口不算。', en: 'From this chapter on, add, subtract and multiply are one part, Arithmetic: choose +, −, × or ÷ on the part. ÷ is new: a ÷ b divides each cell of a by the same cell of b. There is also a new part, the Merger: it has three inputs and adds the pictures wired into them cell by cell; an empty input is skipped.' } },
    { t: { zh: '新画法「剖面」：把图上一行的亮度画成一条曲线，在图上拖动就换一行。卡片和测试区的画法按钮里都能切到它。', en: 'A new way of drawing, "Profile": the brightness along one row of the picture as a curve; drag on the picture to change row. Switch to it with the drawing buttons on a card or in the test area.' } },
    { t: { zh: '这一关你要做的：每一格换成它自己和左右两个邻居的平均。看看下面的期望：方块左右两条边多出一圈灰，上下两条边却没变。', en: 'Your task in this level: replace each cell with the average of itself and its left and right neighbours. Look at the expected output below: the square\'s left and right edges gain a band of grey, but its top and bottom edges do not change.' }, fig: { test: 0, caption: { zh: '第一组测试：方块', en: 'Set 1: square' } } },
  ],
  '1-2': [
    { t: { zh: '<level-ref to="1-1"></level-ref>的三点平均只看左右。噪点和毛刺可不只在横着的方向上。', en: 'The three-point average from <level-ref to="1-1"></level-ref> only looks left and right. Noise and specks are not only spread out sideways.' } },
    { t: { zh: '这一关你要做的：每一格换成它自己和上下两个邻居的平均。', en: 'Your task in this level: replace each cell with the average of itself and its neighbours above and below.' }, fig: { test: 0, caption: { zh: '第一组测试：方块的上下两条边多出一圈灰', en: 'Set 1: the square\'s top and bottom edges gain a grey band' } } },
  ],
  '1-3': [
    { t: { zh: '<level-ref to="1-1"></level-ref>和<level-ref to="1-2"></level-ref>只看左右或上下，这一关看一整圈：每格换成它周围 3×3 九个格子的平均。横竖一视同仁，叫方块模糊。你搭的横向三点平均，现在成了现成的元件。', en: '<level-ref to="1-1"></level-ref> and <level-ref to="1-2"></level-ref> looked only left and right, or up and down; this one looks all the way round: each cell becomes the average of the nine cells in the 3×3 block around it. Horizontal and vertical are treated alike, and this is called a box blur. The horizontal three-point average you built is now a ready-made part.' } },
    { t: { zh: '这一关多了一项限制：<b>计算量</b>，数的是每算出一个输出格子要做几次乘法和加法。一张手机照片有上千万个像素，视频每秒几十张，每格省一次，总数就省下很多。', en: 'This level adds a limit: the <b>cost</b>, which counts how many multiplications and additions it takes to compute one output cell. A phone photo has over ten million pixels and video runs at dozens of frames a second, so saving one operation per cell adds up to a lot.' } },
    { t: { zh: '这一关你要做的：做出 3×3 平均，计算量不超过 6。最直接的搭法会超标，你得找一种更省的算法。', en: 'Your task in this level: make a 3×3 average with a cost of no more than 6. The most direct circuit goes over the limit, so you need to find a cheaper method.' }, fig: { test: 4, caption: { zh: '一个亮点，期望是被摊成 3×3 的一小块', en: 'A bright dot: the expected output spreads it into a small 3×3 block' } } },
  ],
  '1-4': [
    { t: { zh: '方块模糊有个毛病：它把一个亮点摊成一块平顶的方墩，有硬边，也有角。镜头失焦拍出的光点却是圆的，从中心往外慢慢变淡。', en: 'Box blur has a flaw: it spreads a bright dot into a flat-topped square block, with hard edges and corners. But a point of light shot through an out-of-focus lens is round, fading gradually outwards from the centre.' }, fig: { part: 'box3', input: 'impulse', view: 'terrain', caption: { zh: '3×3 平均处理一个亮点，用地形画法看', en: 'A 3×3 average applied to a bright dot, in terrain view' } } },
    { t: { zh: '这种柔和的模糊叫<b>高斯模糊</b>：中心权重最大，越远越小，切开看像一口钟。σ 越大，钟越宽，图越糊。修图软件里最常用的模糊就是它。', en: 'This soft blur is called a <b>Gaussian blur</b>: the weight is largest at the centre and smaller further out, and a slice through it looks like a bell. The larger σ, the wider the bell and the blurrier the image. It is the blur photo editors use most.' } },
    { t: { zh: '新画法「地形」：把亮度当成高度，亮的地方是山，暗的地方是谷。', en: 'A new way of drawing, "Terrain": brightness becomes height, so bright places are hills and dark places are valleys.' } },
    { t: { zh: '这一关你要做的：手里没有高斯，只有 3×3 平均，却要做出和目标几乎一样的结果。用地形画法看，亮点的期望是一座圆滑的小山。', en: 'Your task in this level: you have no Gaussian, only the 3×3 average, yet you must produce almost exactly the target result. In terrain view, the expected output for a bright dot is a smooth little hill.' }, fig: { test: 0, view: 'terrain', caption: { zh: '第一组测试：亮点', en: 'Set 1: bright dot' } } },
  ],
  '1-5': [
    { t: { zh: '暗房时代的摄影师有个怪招：把一张故意洗模糊的底片和原底片叠在一起印，照片反而更清楚。修图软件里的「USM 锐化」（unsharp mask）就源自这个做法。', en: 'Darkroom photographers had an odd trick: print the original negative stacked with a deliberately blurred copy, and the photo comes out clearer. The "USM sharpening" (unsharp mask) in photo editors comes from this technique.' } },
    { t: { zh: '「高斯模糊」是你在<level-ref to="1-4"></level-ref>里得到的元件，σ 控制模糊得多宽。', en: '"Gaussian blur" is the part you earned in <level-ref to="1-4"></level-ref>. σ controls how wide the blur is.' }, fig: { part: 'gauss', params: { sigma: 1 }, input: 'square', caption: { zh: '高斯模糊，σ = 1', en: 'Gaussian blur, σ = 1' } } },
    { t: { zh: '要想的问题：「原图 − 模糊图」这张差图里，留下的是什么？为什么把它加回原图，图就显得更锐利？', en: 'Something to think about: what is left in the difference image "original − blurred"? Why does adding it back to the original make the image look sharper?' } },
    { t: { zh: '这一关你要做的：按公式搭出锐化。用地形画法看期望，每道台阶的边上都多出了一道凸起和一道凹陷。', en: 'Your task in this level: build the sharpening from the formula. In terrain view, the expected output has an extra ridge and an extra dip beside every step.' }, fig: { test: 0, view: 'terrain', caption: { zh: '第一组测试：方块，用地形画法看', en: 'Set 1: square, in terrain view' } } },
  ],
  '1-6': [
    { t: { zh: '看一幅画，最先注意到的是轮廓：物体和背景的分界、衣服的褶、文字的笔画。在数字图里，这些地方的共同点是：亮度在很短的距离内突然变了。这就是<b>边缘</b>。', en: 'When you look at a picture, the first thing you notice is outlines: where an object meets the background, the folds in clothing, the strokes of letters. In a digital image, what these places have in common is that the brightness changes suddenly over a very short distance. That is an <b>edge</b>.' } },
    { t: { zh: '找边缘是视觉里最基础的一步。扫描软件靠它找纸张的四边，车道保持系统靠它找车道线。', en: 'Finding edges is the most basic step in vision. Scanning apps use it to find the four sides of a sheet of paper, and lane-keeping systems use it to find lane markings.' } },
    { t: { zh: '这一关你要做的：每一格输出「右边邻居 − 自己」。结果可以是负数，看灰度不直观，用地形画法看起伏更清楚。', en: 'Your task in this level: for every cell, output "right neighbour − self". The result can be negative, which is hard to read in greyscale; terrain view shows the rises and falls more clearly.' }, fig: { test: 0, view: 'terrain', caption: { zh: '第一组测试：台阶，用地形画法看', en: 'Set 1: a step, in terrain view' } } },
  ],
  '1-7': [
    { t: { zh: '真实的照片都带着<b>噪声</b>：光线暗时，传感器收到的光少，每格的数会随机地偏高或偏低一点。把夜里拍的照片放大，看到的颗粒就是它。', en: 'Real photos always carry <b>noise</b>: in dim light the sensor receives little light, and each cell\'s number comes out randomly a little too high or too low. Zoom into a photo taken at night and the grain you see is noise.' } },
    { t: { zh: '<level-ref to="1-6"></level-ref>的边缘检测在干净的图上很准。这一关的图里，每一格都在微微抖动，台阶两边本该平坦的地方也到处是小起伏。', en: 'The edge detection from <level-ref to="1-6"></level-ref> was accurate on clean images. In this level every cell jitters slightly, and the areas on either side of the step that should be flat are full of small bumps.' } },
    { t: { zh: '要想的问题：一个真正的台阶，和噪声造成的抖动，区别在哪里？你搭的「右边邻居 − 自己」和「下边邻居 − 自己」现在是现成的元件「横向差分」「纵向差分」。', en: 'Something to think about: how does a real step differ from the jitter caused by noise? The "right neighbour − self" and "neighbour below − self" you built are now ready-made parts: "Horizontal difference" and "Vertical difference".' } },
    { t: { zh: '这一关你要做的：只在真正的台阶处输出 1，其余输出 0。每组测试的台阶位置不同，都是左暗右亮。', en: 'Your task in this level: output 1 only at the real step and 0 everywhere else. Each test has its step in a different place, always dark on the left and bright on the right.' }, fig: { test: 0, caption: { zh: '第一组测试：带噪声的台阶', en: 'Set 1: a noisy step' } } },
  ],
  '1-8': [
    { t: { zh: '三点平均、方块模糊、差分，都是把挪了位置的几份原图乘上系数再加起来。换一组挪法和系数，就是另一种效果。', en: 'The three-point average, the box blur and the differences all add up a few shifted copies of the picture, each multiplied by a number. A different set of shifts and numbers gives a different effect.' } },
    { t: { zh: '有人用这样一组挪法和系数处理了几张图，你只看得到输入和输出。第一组测试只有一个亮点。', en: 'Someone processed a few pictures with such a set of shifts and numbers, and you can only see the inputs and outputs. The first test is a single bright dot.' }, fig: { test: 0, caption: { zh: '第一组测试：一个亮点进去', en: 'Set 1: one bright dot goes in' } } },
    { t: { zh: '这一关你要做的：用平移、常数和四则运算，搭出同样的处理。要想的问题：一个亮点经过处理，变成了什么？', en: 'Your task in this level: build the same processing out of shifts, constants, multiplications and additions. Something to think about: what does a single bright dot turn into?' } },
  ],
  '1-9': [
    { t: { zh: '<level-ref to="1-8"></level-ref>得到的「3×3 核」：九个权重由你来填。默认只有正中间是 1，输出和输入一模一样。', en: 'The "3×3 kernel" you earned in <level-ref to="1-8"></level-ref>: you fill in the nine weights. By default only the centre is 1, so the output is identical to the input.' }, fig: { part: 'kernel3', input: 'glyph:F', caption: { zh: '默认的核：原样输出', en: 'The default kernel: output unchanged' } } },
    { t: { zh: '修图软件的滤镜、相机里的锐化，背后常常就是一个核。这一关反过来：别人用一个核处理了几张图，你只看得到输入和输出，要把那个核找出来。', en: 'Behind photo-editor filters and in-camera sharpening there is often just a kernel. This level turns that around: someone has processed a few images with a kernel, and from only the inputs and outputs you must find that kernel.' } },
    { t: { zh: '这一关你要做的：把你的核拧成和它一样，让三组测试全部通过。', en: 'Your task in this level: dial your kernel in until it matches, so that all three tests pass.' }, fig: { test: 2, caption: { zh: '第三组测试：字母 F', en: 'Set 3: letter F' } } },
  ],
  '1-10': [
    { t: { zh: '这一章的平均、高斯、差分、锐化，连同把图挪一格的平移，都能写成一个 3×3 核。熟练以后，看一眼处理前后的图，就该猜得出用了什么核。', en: 'This chapter\'s average, Gaussian, difference and sharpen, along with the shift that moves an image by one pixel, can all be written as a 3×3 kernel. With practice, one look at an image before and after should tell you which kernel was used.' }, fig: { figure: 'conv-press', caption: { zh: '核压过整张图', en: 'A kernel passing over the whole image' } } },
    { t: { zh: '台上每轮给一张输入和一张输出，下面四张卡片各是一个核，数字按「3×3 核」元件的读法排列。选出做出这张输出的那一个。', en: 'Each round, the bench shows an input and an output. Each of the four cards below is a kernel, with its numbers laid out the way the "3×3 kernel" part reads them. Pick the one that made this output.' } },
    { t: { zh: '一共十轮，对八轮过关，越往后给的时间越短，也可以关掉计时先练。要想的问题：不逐格去算，只扫一眼核里的数，你靠什么认出它？', en: 'There are ten rounds, and eight right answers pass. Later rounds give you less time, and you can switch the timer off to practise first. Something to think about: without working it out cell by cell, just glancing at the numbers in a kernel, how do you recognise it?' } },
  ],
  '1-11': [
    { t: { zh: '平移一格时，最边上那一列的数要从图外取。图外没有数据，平移元件一直补 0，也就是黑色。可拍到的东西不会在图边突然变黑，这一列是假的。', en: 'When you shift by one pixel, the numbers for the outermost column have to come from outside the image. There is no data out there, so the Shift part has always padded with 0, which is black. But what a camera captures does not suddenly turn black at the image border: that column is fake.' }, fig: { part: 'shift', params: { dir: 'right' }, input: ['stepX', 4, 0.85, 0.2], caption: { zh: '补 0 的平移：最左一列变成了黑的', en: 'Zero-padded shift: the leftmost column turns black' } } },
    { t: { zh: '更自然的补法是照抄：图外缺的那一格，就当它和离它最近的边上像素一样。这叫<b>复制边缘</b>。修图软件放大、模糊照片时，图边就是这样处理的。', en: 'A more natural way to pad is to copy: treat each missing cell outside the image as equal to the nearest pixel on the edge. This is called <b>replicate edge</b>. Photo editors handle the image border this way when they enlarge or blur a photo.' } },
    { t: { zh: '这一关没有现成的设置可选，要你用平移、常数和加减乘这些元件，自己拼出来。拼成之后，它会变成平移元件「边界」设置里的一个选项。', en: 'This level has no ready-made setting to pick: you build it yourself from parts such as Shift, Constant, Add, Subtract and Multiply. Once you have built it, it becomes an option in the Shift part\'s "Border" setting.' } },
    { t: { zh: '这一关你要做的：向右平移一格，最左一列照抄原图的最左一列。测试图都在左边贴着东西。', en: 'Your task in this level: shift right by one pixel, with the leftmost column copied from the original\'s leftmost column. Every test image has something touching its left edge.' }, fig: { test: 0, caption: { zh: '第一组测试：亮条贴着左边', en: 'Set 1: a bright bar on the left edge' } } },
  ],
  '1-12': [
    { t: { zh: '算最边上一格的平均时，有几个邻居落在图外面。图外没有数据，元件只能自己补上一些值。补什么，直接决定了边上一圈的结果。', en: 'When averaging a cell at the very edge, some of its neighbours fall outside the image. There is no data there, so the part has to fill in some values itself. What it fills in directly decides the result all round the border.' } },
    { t: { zh: '在暗背景上看不出问题，换成亮背景，毛病就露出来了。拍一张天空再模糊，照片四周多出一圈暗边，像加了一个本来不存在的相框。', en: 'On a dark background you cannot see the problem; switch to a bright one and it shows. Blur a photo of the sky and a dark ring appears round the edges, like a frame that was never there.' }, fig: { part: 'box3', input: 'test', caption: { zh: '亮底图直接做 3×3 平均', en: 'A plain 3×3 average of an image on a bright background' } } },
    { t: { zh: '3×3 平均元件只会在图外补 0。这一关要你自己拼出一个边上不发黑的 3×3 平均。', en: 'The 3×3 average part can only pad with 0 outside the image. In this level you build a 3×3 average that does not darken at the border yourself.' } },
    { t: { zh: '这一关你要做的：在亮底图上做 3×3 平均，输出和输入一样大，边上一圈不能发黑。', en: 'Your task in this level: take a 3×3 average of images on a bright background, with the output the same size as the input and no dark ring round the border.' }, fig: { test: 0, caption: { zh: '第一组测试：亮底方块', en: 'Set 1: square on bright background' } } },
  ],
  '1-13': [
    { t: { zh: '这是一道挑战关，可以跳过。它不需要新元件。', en: 'This is a challenge level, and you can skip it. It needs no new parts.' } },
    { t: { zh: '5×5 的平均要把 25 格加起来。像方块模糊那样先横后竖，计算量是 10，这一关只给 8。测试图四周都留着一圈黑边。', en: 'A 5×5 average adds up 25 cells. Splitting it into across and down, as with the box blur, costs 10, and this level allows only 8. Every test picture has a dark margin all round.' } },
    { t: { zh: '要想的问题：平移不花计算量，只有加法和乘法才花。', en: 'Something to think about: shifting costs nothing; only additions and multiplications do.' }, fig: { test: 0, caption: { zh: '第一组测试：方块和它的 5×5 平均', en: 'Set 1: a square and its 5×5 average' } } },
  ],
  '1-14': [
    { t: { zh: '扫描 App 拍下一张纸，要先找出纸的四边，才能把它裁下来、拉正。这一章最后三关，就来搭这样一台扫描仪。', en: 'A scanning app that photographs a sheet of paper must first find the sheet\'s four sides before it can crop and straighten it. The last three levels of this chapter build such a scanner.' } },
    { t: { zh: '真实的扫描件有三个麻烦：传感器的噪点、纸上的字，还有超出扫描范围的纸。先对付第一个。', en: 'Real scans bring three problems: sensor noise, the text on the paper, and paper that runs off the edge of the scan. First, the noise.' } },
    { t: { zh: '这一关你要做的：把带颗粒的扫描件变成期望里那样干净、柔和的图。', en: 'Your task in this level: turn the grainy scan into a clean, soft image like the expected one.' }, fig: { test: 1, caption: { zh: '第二组测试：纸贴着上边', en: 'Set 2: paper against the top' } } },
  ],
  '1-15': [
    { t: { zh: '纸常常比扫描范围大，一直铺到图边。图边是扫描仪看到的尽头，不是纸的边。', en: 'The paper is often bigger than the scan and runs right up to the image border. The border is where the scanner\'s view ends, not where the paper ends.' } },
    { t: { zh: '这一关没有噪声，也没有字。纸边用 x、y 两个方向的 Sobel 来找：两个响应各自平方再相加，大于 0.04 的地方输出 1。', en: 'This level has no noise and no text. Find the paper\'s edges with Sobel in both directions: square each response, add them, and output 1 wherever the sum is above 0.04.' } },
    { t: { zh: '这一关你要做的：输出纸的边。图边不能被当成纸边。', en: 'Your task in this level: output the paper\'s edges. The image border must not count as one.' }, fig: { test: 1, caption: { zh: '第二组测试：纸出了右边', en: 'Set 2: paper running off the right' } } },
  ],
  '1-16': [
    { t: { zh: '扫描仪的最后一关：噪声、字、超出范围的纸，全都会遇到。', en: 'The scanner\'s final level: noise, text and paper running off the scan, all at once.' } },
    { t: { zh: '纸上的字也有边，而且很多：每一笔都是一条暗线，两侧各有一道边。扫描仪要找的却只是纸的四边。', en: 'The text on the paper has edges too, lots of them: every stroke is a dark line with an edge on each side. But the scanner only wants the paper\'s four sides.' } },
    { t: { zh: '这一关你要做的：输出纸张的边，和期望一样。要想的问题：字的笔画和纸边，大小差了多少？', en: 'Your task in this level: output the paper\'s edges, matching the expected image. Something to think about: how different in size are a stroke of text and a paper edge?' }, fig: { test: 0, caption: { zh: '第一组测试：一页带噪声的字', en: 'Set 1: a noisy page of text' } } },
  ],
}
