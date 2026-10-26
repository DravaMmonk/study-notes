// 第 2 章各关的引入。格式见 ./index.js。
export default {
  '2-1': [
    { t: { zh: '前面一直在看邻居：一个像素和旁边的像素差多少。这一章换个角度，把一张图看成许多道波叠在一起。先从最简单的一道波开始。', en: 'So far we have looked at neighbours: how much a pixel differs from the ones beside it. This chapter takes another view and sees a picture as many waves added together. It starts with the simplest thing: one wave.' } },
    { t: { zh: '一道波就是明暗规律起伏的条纹，像斑马线，像百叶窗透进来的光。一行里出现几次「暗—亮—暗」，就说它走了几个周期；周期越多，条纹越密，频率越高。', en: 'A wave is stripes of light and dark that rise and fall regularly, like a zebra crossing or light through a blind. The number of times "dark—light—dark" appears along a row is the number of cycles; the more cycles, the denser the stripes and the higher the frequency.' } },
    { t: { zh: '这一关你要做的：在操作台上转动旋钮，让你的波和目标重合。每一步只开放一个旋钮。要想的问题：每个旋钮改变了波的什么？', en: 'Your task in this level: turn the knobs on the bench until your wave lies on the target. Each step opens one knob. Something to think about: what does each knob change about the wave?' } },
  ],
  '2-2': [
    { t: { zh: '<level-ref to="2-1"></level-ref>的条纹都是一道干净的波。可真实的图里有方块、字母、边缘，没有一样长得像波。把几道不同频率的波加在一起，能拼出什么样的形状？', en: '<level-ref to="2-1"></level-ref>\'s stripes were a single clean wave. But real pictures have squares, letters and edges, and none of them looks like a wave. What shapes can you make by adding waves of different frequencies together?' } },
    { t: { zh: '声音里也有同样的事：钢琴和小提琴弹同一个音，听起来却不同，因为里面混着的高低不同的波，比例不一样。', en: 'Sound works the same way: a piano and a violin playing the same note sound different, because the waves of different pitch mixed in them come in different proportions.' } },
    { t: { zh: '台上频率 1 到 8 各有一道正弦波，就是<part-ref to="wave"></part-ref>元件选 sin 时的样子。每道波只有一个旋钮：它的振幅。', en: 'The bench has a sine wave for each frequency from 1 to 8, just like the <part-ref to="wave"></part-ref> part set to sin. Each wave has one knob: its amplitude.' }, fig: { part: 'fqWave', params: { k: 2, form: 'sin' }, inputs: [], caption: { zh: '<part-ref to="wave"></part-ref>元件：k = 2 的 sin', en: 'The <part-ref to="wave"></part-ref> part: sin with k = 2' } } },
    { t: { zh: '这一关你要做的：调各个频率的振幅，先叠出由两道波组成的目标，再叠出一条接近方波的曲线。要想的问题：光滑的波能拼出一道陡边吗？', en: 'Your task in this level: set the amplitude of each frequency, first to stack up a target made of two waves, then a curve close to a square wave. Something to think about: can smooth waves make a steep edge?' } },
  ],
  '2-3': [
    { t: { zh: '<level-ref to="2-2"></level-ref>的波是你自己叠的，当然知道每道波有多强。反过来，拿到一条已经叠好的曲线，怎么知道里面有多少 k = 3 的波？调音器认出你弹的是哪个音，做的就是这类事。', en: 'In <level-ref to="2-2"></level-ref> you stacked the waves yourself, so you knew how strong each one was. The other way round: given a curve already stacked, how do you find how much k = 3 wave is in it? A tuner recognising which note you play does this kind of thing.' } },
    { t: { zh: '这一关你要做的：在台上转动探针的频率，先找出让乘积的平均不为 0 的那一个，再读出混合曲线里一道波的振幅。要想的问题：乘积什么时候会整体偏到一边？', en: 'Your task in this level: turn the probe\'s frequency on the bench, first to find the one whose product does not average to 0, then to read one wave\'s amplitude out of a mixed curve. Something to think about: when does the product lean to one side overall?' } },
  ],
  '2-4': [
    { t: { zh: '<level-ref to="2-3"></level-ref>的输入都和探针对得整整齐齐。可真实的曲线里，一道波不一定从最亮处开始，它可能左右错开。', en: '<level-ref to="2-3"></level-ref>\'s inputs all lined up neatly with the probe. In a real curve, though, a wave need not start at its brightest: it may be shifted sideways.' } },
    { t: { zh: '这一关你要做的：把输入错开，看探针还量不量得准；再找出一种不管错开多少都读得准的读法。', en: 'Your task in this level: shift the input and see whether the probe still measures it, then find a way of reading that is right however far the wave is shifted.' } },
  ],
  '2-5': [
    { t: { zh: '<level-ref to="2-3"></level-ref>和<level-ref to="2-4"></level-ref>在台上看过探针怎么工作。这一关要把它搭成电路：输入一条混着几道波、有的还错开的曲线，读出频率 3 那道波的振幅。', en: '<level-ref to="2-3"></level-ref> and <level-ref to="2-4"></level-ref> showed on the bench how a probe works. This level builds it as a circuit: the input is a curve of several waves mixed, some of them shifted, and you read off the amplitude of the frequency-3 wave.' } },
    { t: { zh: '这一关的电路不处理图像，处理的是一行 32 个点的波形，输出一个数。<part-ref to="mean"></part-ref>把一行数变成一个数。', en: 'This level\'s circuit does not process an image but a waveform of 32 points, and outputs a single number. <part-ref to="mean"></part-ref> turns a row of numbers into one number.' } },
    {
      t: {
        zh: '这一关你要做的：读出输入里 k = 3 那道波的振幅，也就是它最亮处比它自己的平均高出多少。五条测试波形都要读准。',
        en: 'In this level: read off the amplitude of the k = 3 wave in the input, that is, how far its brightest point rises above its own average. Get all five test waveforms right.',
      },
      fig: { test: 0, caption: { zh: '波形 A：输入的一行，和期望读出的数', en: 'Waveform A: the input row and the expected reading' } },
    },
  ],
  '2-6': [
    { t: { zh: '<level-ref to="2-5"></level-ref>的探针量一行里的一个频率。图像是二维的，波可以横着、竖着、斜着走。对每一种方向和疏密都做一次探针，读数排成一张图，就是<part-ref to="spectrum"></part-ref>：正中心是平均亮度，越往外的格子代表变化越快的波。', en: '<level-ref to="2-5"></level-ref>\'s probe measured one frequency in a row. Images are 2-D, so waves run across, down or at a slant. Run the probe for every direction and density and lay the readings out as a picture, and you have the <part-ref to="spectrum"></part-ref>: the centre is the average brightness, and cells further out stand for faster-changing waves.' }, fig: { part: 'fqSpectrum', input: 'test', caption: { zh: '第一组测试照片的频谱', en: 'The spectrum of the first test photo' } } },
    { t: { zh: '相机自动对焦时，要一边挪镜头一边判断：现在这张清楚吗？', en: 'When a camera focuses itself, it moves the lens and keeps asking: is this shot sharp now?' } },
    { t: { zh: '新画法<part-ref to="spectrum"></part-ref>：画出每个频率的波有多强，中心是频率 (0, 0)，越往外频率越高。', en: 'A new way of drawing, <part-ref to="spectrum"></part-ref>: how strong the wave at each frequency is, with frequency (0, 0) at the centre and higher frequencies further out.' } },
    { t: { zh: '这一关你要做的：按说明里的规则，给每张照片算一个清晰度分。「频率半径」是一张和频谱一样大的图，每格写着它离中心多远。要想的问题：糊掉的照片，频谱哪里变暗了？', en: 'Your task in this level: score each photo for sharpness by the rule in the brief. "Frequency radius" is a picture the size of the spectrum, each cell holding its distance from the centre. Something to think about: where does the spectrum of a blurred photo get darker?' } },
  ],
  '2-7': [
    { t: { zh: '音响里常有「均衡器」：一排推杆，每根管一段音高，可以把低音推高、把刺耳的高音拉低。图像也可以这样：直接给每个频率调音量，叫<b>增益</b>，1 是原样保留，0 是完全去掉。', en: 'Stereos often have an "equaliser": a row of sliders, each in charge of a range of pitch, so you can push up the bass and pull down a harsh treble. Pictures can be treated the same way: give each frequency a volume, called a <b>gain</b>, where 1 keeps it as it is and 0 removes it entirely.' } },
    { t: { zh: '新元件<part-ref to="part:fqApply"></part-ref>：把图变到频域，每个频率乘上增益图里对应格子的数，再变回来。增益图和频谱的画法一样，中心是频率 (0, 0)。', en: 'The new part <part-ref to="part:fqApply"></part-ref>: takes a picture into the frequency domain, multiplies each frequency by the number in the matching cell of a gain picture, and comes back. The gain picture is laid out like a spectrum, with frequency (0, 0) at the centre.' } },
    { t: { zh: '之前的 3×3 平均、高斯，是在图上让每个像素和邻居混一混。这一关从频率那边下手，结果也是一种模糊。要想的问题：这两种做法是什么关系？', en: 'The 3×3 average and the Gaussian worked on the picture, mixing each pixel with its neighbours. This level works from the frequency side, and the result is a blur too. Something to think about: how are the two approaches related?' } },
    { t: { zh: '这一关你要做的：用「频率半径」做出一张增益图，让输出和期望一样柔和，没有波纹。', en: 'Your task in this level: make a gain picture from "Frequency radius" so the output is as soft as the expected one, with no ripples.' }, fig: { test: 0, caption: { zh: '第一组：带噪点的方块和期望', en: 'Set 1: a noisy square and the expected output' } } },
  ],
  '2-8': [
    {
      t: {
        zh: '手机夜景、老照片的扫描件里，常有一层细密的噪点。颗粒越细，变化越快，在频谱上就离中心越远；图里大块的形状变化慢，落在中心附近。',
        en: 'Night shots on a phone and scans of old photos often have a layer of fine noise. The finer the grain, the faster it changes, and the farther from the centre it sits in the spectrum. Large shapes in the image change slowly and sit near the centre.',
      },
      fig: { part: 'fqSpectrum', input: 'test', caption: { zh: '第一组测试输入的频谱', en: 'Spectrum of the first test input' } },
    },
    { t: { zh: '<level-ref to="2-7"></level-ref>搭的东西现在是<part-ref to="freq-filter"></part-ref>元件：以中心为圆心留下一块频率。它有两个设置：掩膜形状（硬圆盘或高斯）和半径 R。<part-ref to="spectrum"></part-ref>元件可以看任何结果的频谱。', en: 'What you built in <level-ref to="2-7"></level-ref> is now the <part-ref to="freq-filter"></part-ref> part: it keeps a disc of frequencies around the centre. It has two settings: the mask shape (hard disc or Gaussian) and the radius R. The <part-ref to="spectrum"></part-ref> part shows the spectrum of any result.' } },
    {
      t: {
        zh: '这一关你要做的：去掉照片里的噪点，输出要和期望一样干净、柔和。四组测试是方块、圆盘、字母和横条，误差图会告诉你差在哪里。',
        en: 'In this level: remove the noise from the photos. The output must be as clean and soft as expected. The four test sets are a square, a disc, a letter and horizontal bars; the error map shows you where you are off.',
      },
      fig: { test: 0, caption: { zh: '方块：带噪点的输入和期望', en: 'Square: the noisy input and the expected output' } },
    },
  ],
  '2-9': [
    { t: { zh: '翻拍印刷的照片，或者扫描报纸上的图，常常带上一层规则的网纹：印刷时的网点和相机的像素格子叠在一起，浮出原来没有的条纹。', en: 'Photographing a printed photo, or scanning a picture from a newspaper, often adds a regular screen of stripes: the printing dots and the camera\'s pixel grid overlap and stripes appear that were never there.' } },
    { t: { zh: '一组规则的条纹，在频谱里是什么样子？照片本身的内容又在频谱的哪里？', en: 'What does a regular set of stripes look like in a spectrum? And where in the spectrum is the photo\'s own content?' }, fig: { part: 'fqSpectrum', input: 'test', caption: { zh: '第一组测试照片的频谱', en: 'The spectrum of the first test photo' } } },
    { t: { zh: '这一关你要做的：按说明里的规则去掉网纹。每张照片的网纹方向和疏密都不一样。', en: 'Your task in this level: remove the screen by the rule in the brief. Each photo\'s screen has a different direction and spacing.' }, fig: { test: 0, caption: { zh: '第一组：竖网纹', en: 'Set 1: a vertical screen' } } },
  ],
  '2-10': [
    {
      t: {
        zh: '有一种有名的图：近看是一个人，退到几米外再看，变成了另一个人。它叫<b>混合图像</b>，是研究人员 2006 年做出来的，靠的就是这一章讲的频率。',
        en: 'There is a famous kind of picture: up close it shows one person, but step back a few metres and it becomes someone else. It is called a <b>hybrid image</b>, created by researchers in 2006, and it relies on exactly the frequencies this chapter is about.',
      },
    },
    {
      t: {
        zh: '离得远或眯起眼时，细小的线条分辨不出来，眼睛只看得到大块的明暗；凑近了，细节最抢眼。一张图如果大块明暗来自一张、细节来自另一张，远近看就会不同。',
        en: 'From far away, or when you squint, fine lines can\'t be made out and your eyes only see large areas of light and dark; up close, the detail stands out most. If an image takes its large light and dark areas from one picture and its detail from another, it looks different near and far.',
      },
    },
    {
      t: {
        zh: '这一关有两个输入 A 和 B。输出要 A 的大轮廓（低频）加上 B 的细节（高频）。A 那一半你已经会做；B 那一半怎么拿到，是这一关要想的。',
        en: 'This level has two inputs, A and B. The output should be A\'s broad outline (low frequencies) plus B\'s detail (high frequencies). You already know how to get A\'s half; how to get B\'s half is the puzzle here.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：搭出混合图像，两处都用半径 3 的高斯掩膜。三组测试里，A 是圆盘、方块这样的大形状，B 是字母、棋盘这样的细纹。',
        en: 'In this level: build the hybrid image, using a Gaussian mask of radius 3 in both places. In the three test sets, A is a large shape such as a disc or a square, and B is fine detail such as a letter or a checkerboard.',
      },
      fig: { test: 0, caption: { zh: '圆盘 + X：两个输入和期望', en: 'Disc + X: the two inputs and the expected output' } },
    },
  ],
  '2-11': [
    {
      t: {
        zh: '相机拍照、扫描仪扫图，都是把连续变化的景物变成一格格的数。这叫<b>采样</b>：只在一些位置记下值，用这些值代表整条曲线。',
        en: 'A camera taking a photo and a scanner scanning a page both turn a continuously varying scene into a grid of numbers. This is called <b>sampling</b>: recording values at only some positions and letting them stand for the whole curve.',
      },
    },
    {
      t: {
        zh: '采样会出怪事。视频里飞转的车轮有时像在倒着转；用手机拍电脑屏幕，屏幕上会浮出一圈圈原来没有的波纹。这些花纹是从哪来的？',
        en: 'Sampling can do strange things. A fast-spinning wheel in a video sometimes seems to turn backwards; photograph a computer screen with your phone and rippling patterns appear that were never there. Where do these patterns come from?',
      },
    },
    {
      t: {
        zh: '机关台上画着一条真实的波、采到的点，以及只看这些点时它像什么。三个小实验各问一件事：一道波能被别的波冒充吗？最少几个点才认得出它？采之前能做什么？',
        en: 'The bench draws a real wave, the samples taken from it, and what it looks like if you only see those samples. Three small experiments each ask one thing: can one wave pose as another? How few samples can you get away with and still recognise it? What can you do before sampling?',
      },
    },
    {
      t: {
        zh: '这一关你要做的：完成三个实验，每个只有一个可调的量。每次都比一比：从点上看起来的样子，和真实的波差在哪里。',
        en: 'In this level: complete the three experiments, each with just one thing to adjust. Each time, compare what the samples suggest with the real wave, and see where they differ.',
      },
    },
  ],
  '2-12': [
    { t: { zh: '这是一道挑战关，可以跳过。它不需要新元件。', en: 'This is a challenge level, and you can skip it. It needs no new parts.' } },
    { t: { zh: '频域的元件很贵，一个就要 40 的计算量。混合图像要两处低通，这一关只准用一个频域元件。', en: 'Frequency-domain parts are expensive: each one costs 40. A hybrid image needs two low-passes, and this level allows only one frequency-domain part.' }, fig: { test: 0, caption: { zh: '第一组：圆盘 + X', en: 'Set 1: disc + X' } } },
  ],
  '2-13': [
    { t: { zh: '相册要给每张照片做缩略图。这一章最后四关，就来搭这样一个缩略图服务：缩小照片，不出莫尔纹，还要算得快。', en: 'A photo album wants a thumbnail for every photo. The last four levels of this chapter build that thumbnail service: shrink photos with no moiré, and do it quickly.' } },
    { t: { zh: '最直接的办法是隔一个点留一个：32×32 的图，每行每列只留一半，就成了 16×16。', en: 'The most direct way is to keep every other pixel: keep half of every row and column of a 32×32 picture and it becomes 16×16.' } },
    { t: { zh: '<part-ref to="downsample"></part-ref>做的就是这件事。对粗大的图案，它的效果很好：一张大格子的棋盘，缩小以后还是棋盘。', en: '<part-ref to="downsample"></part-ref> does exactly this. On large patterns it works well: a checkerboard of big squares is still a checkerboard after shrinking.' }, fig: { part: 'downsample', input: 'checker', caption: { zh: '隔点取样：大格子棋盘缩成一半', en: 'Downsample: a large-square checkerboard shrunk to half' } } },
    {
      t: {
        zh: '可测试里还有斑马板（一圈圈越往外越细的环）和细条纹。采样台上一维的实验，在这里换成了二维的图。它们缩小以后，还是原来的样子吗？',
        en: 'But the tests also include a zone plate (rings that get finer towards the outside) and fine stripes. The 1D experiments from the sampling bench now become 2D images. Do these still look the same after shrinking?',
      },
    },
    {
      t: {
        zh: '这一关你要做的：把 32×32 的图缩成 16×16，看起来要和原图一样，只是小了一号。',
        en: 'In this level: shrink a 32×32 image to 16×16 so that it looks like the original, just one size smaller.',
      },
      fig: { test: 0, caption: { zh: '斑马板：输入和期望', en: 'Zone plate: input and expected output' } },
    },
  ],
  '2-14': [
    { t: { zh: '图标要更小。这一关从 32×32 缩成 8×8，每个方向只留四分之一。', en: 'Icons need to be smaller. This level shrinks 32×32 to 8×8, keeping a quarter in each direction.' } },
    { t: { zh: '这一关你要做的：缩小四倍，看起来要和原图一样，只是小了。要想的问题：缩得更狠，能留下的频率是更高还是更低？', en: 'Your task in this level: shrink four times so it looks like the original, only smaller. Something to think about: shrinking harder, are the frequencies that can survive higher or lower?' }, fig: { test: 0, caption: { zh: '第一组：斑马板', en: 'Set 1: a zone plate' } } },
  ],
  '2-15': [
    { t: { zh: '服务器每天要做成千上万张缩略图，计算量就是电费。这一关开始有预算。', en: 'The server makes thousands of thumbnails a day, and the cost is the electricity bill. From this level on there is a budget.' } },
    { t: { zh: '计算量按输出的每个像素算：同一个元件放在只有四分之一大的图上，只花四分之一。', en: 'Cost is counted per output pixel: the same part working on a picture a quarter of the size costs a quarter as much.' } },
    { t: { zh: '这一关你要做的：还是 32×32 缩成 8×8，计算量不超过 18。要想的问题：大的模糊为什么贵？', en: 'Your task in this level: again shrink 32×32 to 8×8, with a cost of no more than 18. Something to think about: why is a big blur expensive?' }, fig: { test: 0, caption: { zh: '第一组：斑马板', en: 'Set 1: a zone plate' } } },
  ],
  '2-16': [
    { t: { zh: '缩略图服务正式上线：相册要 4×4 的小图标，照片里有斑马板、布纹、细条纹和文字。', en: 'The thumbnail service goes live: the album wants 4×4 icons, and the photos include zone plates, fabric, fine stripes and text.' } },
    { t: { zh: '这一关你要做的：从 32×32 缩成 4×4，不出莫尔纹，计算量不超过 19。', en: 'Your task in this level: shrink 32×32 to 4×4 with no moiré and a cost of no more than 19.' }, fig: { test: 0, caption: { zh: '第一组：斑马板', en: 'Set 1: a zone plate' } } },
  ],
}
