// 第 2 章各关的引入。格式见 ./index.js。
export default {
  '2-1': [
    {
      t: {
        zh: '前面一直在看邻居：一个像素和旁边的像素差多少。这一章换个角度，把一张图看成许多道<b>波</b>叠在一起。先从最简单的一道波开始。',
        en: 'So far you have kept looking at neighbours: how much a pixel differs from the pixels next to it. This chapter takes a different view and sees an image as many <b>waves</b> stacked together. Let\'s start with the simplest: a single wave.',
      },
    },
    {
      t: {
        zh: '一道波就是明暗规律起伏的条纹，像斑马线，像百叶窗透进来的光。一行里出现几次「暗—亮—暗」，就说它走了几个周期；周期越多，条纹越密，频率越高。',
        en: 'A wave is a set of stripes that rise and fall between dark and light in a regular way, like a zebra crossing or light through Venetian blinds. However many times "dark–light–dark" appears in a row, that is how many cycles it goes through. The more cycles, the denser the stripes and the higher the frequency.',
      },
      fig: { part: 'fqWave', params: { k: 4 }, inputs: [], caption: { zh: '一道波：整行走了 4 个周期', en: 'One wave: 4 cycles across the row' } },
    },
    {
      t: {
        zh: '可两道一样密的条纹，看起来也可能不一样。一道波到底由哪几件事决定？图像是二维的，斜着走的条纹，又要多说清楚什么？',
        en: 'Yet two sets of stripes that are equally dense can still look different. What exactly determines a wave? And since images are 2D, what more do you need to say about stripes that run diagonally?',
      },
    },
    {
      t: {
        zh: '机关台上有一排旋钮，拨一下，你的波就跟着变；后面的目标会开放新的旋钮。这一关你要做的：把你的波调到和四条目标条纹逐一重合，弄清每个旋钮管什么。',
        en: 'The bench has a row of knobs: turn one and your wave changes with it. Later targets unlock new knobs. In this level: tune your wave to match each of the four target stripe patterns in turn, and work out what each knob controls.',
      },
    },
  ],
  '2-2': [
    {
      t: {
        zh: '上一关的条纹都是一道干净的波。可真实的图里有方块、字母、边缘，没有一样长得像波。把几道不同频率的波加在一起，能拼出什么样的形状？',
        en: 'The stripes in the last level were each a single clean wave. But real images contain squares, letters and edges, and none of them looks like a wave. Add together several waves of different frequencies: what shapes can you build?',
      },
    },
    {
      t: {
        zh: '声音里也有同样的事：钢琴和小提琴弹同一个音，听起来却不同，因为里面混着的高低不同的波，比例不一样。一条亮度曲线，也可以问里面各有多少道什么频率的波。',
        en: 'Sound works the same way: a piano and a violin playing the same note sound different, because the higher and lower waves mixed into each come in different proportions. For a brightness curve, too, you can ask how much of each frequency it contains.',
      },
    },
    {
      t: {
        zh: '台上九根推杆：一根管平均亮度，其余八根各管一道正弦波（最光滑的那种波）有多强。台上同时画着目标、你叠出来的曲线，以及两者之差。',
        en: 'The bench has nine sliders: one sets the average brightness, and each of the other eight sets the strength of one sine wave (the smoothest kind of wave). The bench also draws the target, the curve you have built, and the difference between them.',
      },
    },
    {
      t: {
        zh: '三条目标里有一条是方波：一半亮、一半暗，中间的边陡直。光滑的波能拼出一道陡边吗？这一关你要做的：推动推杆，让叠出来的曲线一条条贴上目标。',
        en: 'One of the three targets is a square wave: half light, half dark, with a sheer edge in between. Can smooth waves build a sheer edge? In this level: move the sliders so that your curve fits each target in turn.',
      },
    },
  ],
  '2-3': [
    {
      t: {
        zh: '上一关推杆是你自己推的，当然知道每道波有多强。反过来，拿到一条已经叠好的曲线，怎么知道里面有多少 k = 3 的波？调音器认出你弹的是哪个音，做的就是这类事。',
        en: 'Last level you moved the sliders yourself, so of course you knew how strong each wave was. Now the other way round: given a curve that is already summed, how do you tell how much k = 3 wave it contains? A tuner recognising which note you play does exactly this kind of thing.',
      },
    },
    {
      t: {
        zh: '这一关的电路不处理图像，处理的是一行 32 个点的波形，输出一个数。新元件「波」造出一道指定频率的标准波（cos 或 sin），「求平均」把一行数变成一个数。',
        en: 'The circuit in this level doesn\'t process images; it processes a waveform of 32 samples in a row and outputs a single number. The new part "Wave" produces a reference wave (cos or sin) at a chosen frequency, and "Average" turns a row of numbers into one number.',
      },
      fig: { part: 'fqWave', params: { k: 2 }, inputs: [], caption: { zh: '「波」元件：k = 2 的 cos', en: 'The "Wave" part: cos with k = 2' } },
    },
    {
      t: {
        zh: '几道波混在一起，加起来已经分不出谁是谁。手里的标准波，能不能拿来当一把只认 k = 3 的尺子？',
        en: 'Once several waves are mixed and summed, you can no longer tell which is which. Could the reference waves you have be used as a ruler that only responds to k = 3?',
      },
    },
    {
      t: {
        zh: '这一关你要做的：读出输入里 k = 3 那道波的振幅，也就是它最亮处比它自己的平均高出多少。五条测试波形都要读准。',
        en: 'In this level: read off the amplitude of the k = 3 wave in the input, that is, how far its brightest point rises above its own average. Get all five test waveforms right.',
      },
      fig: { test: 0, caption: { zh: '波形 A：输入的一行，和期望读出的数', en: 'Waveform A: the input row and the expected reading' } },
    },
  ],
  '2-4': [
    {
      t: {
        zh: '2-3 量的是一行里某一个频率的波。图像是二维的，波可以横着、竖着、斜着走。把每一种方向和疏密都量一遍，结果排成一张图，就是<b>频谱</b>。',
        en: 'In 2-3 you measured a single frequency in a row. Images are 2D, so waves can run horizontally, vertically or diagonally. Measure every direction and every density, lay the results out as an image, and you have the <b>spectrum</b>.',
      },
    },
    {
      t: {
        zh: '频谱上每一格代表一道波：位置说明它朝哪个方向、有多密，亮度说明图里这道波有多强。正中心一格是平均亮度。频谱和原图长得一点都不像，要学着读。',
        en: 'Each cell of the spectrum stands for one wave: its position tells you which way the wave runs and how dense it is; its brightness tells you how strong that wave is in the image. The cell right at the centre is the average brightness. A spectrum looks nothing like the original image, so you have to learn to read it.',
      },
      fig: { part: 'fqSpectrum', input: ['blank', 0.5], caption: { zh: '一张全灰的图：频谱上只有中心一点', en: 'A plain grey image: only the centre of the spectrum is lit' } },
    },
    {
      t: {
        zh: '为什么要换这种看法？有些事在原图里不显眼，在频谱里一眼就能看出：图里有没有细节，纹理朝哪个方向。',
        en: 'Why look at it this way? Some things that are hard to spot in the image jump out in the spectrum: whether the image has fine detail, and which way its textures run.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：台上有六张图和打乱了的六张频谱，把它们配成对。旁边有一个试验台，可以随意改一组条纹，看它的频谱怎样跟着变。',
        en: 'In this level: the bench has six images and six shuffled spectra; pair them up. Next to it is a test bench where you can change a set of stripes freely and watch how its spectrum changes.',
      },
    },
  ],
  '2-5': [
    {
      t: {
        zh: '音响和音乐软件里常有「均衡器」：一排推杆，每根管一段音高，可以把低音推高、把刺耳的高音拉低。这一关把同样的想法用在一行像素上：直接给每个频率调音量。',
        en: 'Stereos and music apps often have an "equaliser": a row of sliders, each controlling a band of pitches, so you can boost the bass or cut harsh treble. This level applies the same idea to a row of pixels: set the volume of each frequency directly.',
      },
    },
    {
      t: {
        zh: '之前的 3×3 平均、高斯，是在空间里让每个像素和邻居混一混。这一关从频率那边下手：留下哪些、压掉哪些，结果也会是某种模糊。这两种做法是什么关系？',
        en: 'The 3×3 average and the Gaussian you built work in space, mixing each pixel with its neighbours. This level works from the frequency side: choose which frequencies to keep and which to suppress, and the result is also a kind of blur. How are the two approaches related?',
      },
    },
    {
      t: {
        zh: '台上是一行像素：一块亮条，混着细密的噪点。你给每个频率一个增益，1 是原样保留，0 是完全去掉。台上还会画出这套增益相当于用哪个核在处理，即「等效的核」。',
        en: 'On the bench is a row of pixels: a bright bar mixed with fine noise. You give each frequency a gain: 1 keeps it as it is, 0 removes it completely. The bench also draws which kernel this set of gains amounts to, the "equivalent kernel".',
      },
    },
    {
      t: {
        zh: '这一关你要做的：调出一组增益，让输出和目标重合。目标既干净，边缘又柔和，两样都要对上。',
        en: 'In this level: find a set of gains that makes the output match the target. The target is both clean and soft-edged, and you need to match both.',
      },
    },
  ],
  '2-6': [
    {
      t: {
        zh: '手机夜景、老照片的扫描件里，常有一层细密的噪点。颗粒越细，变化越快，在频谱上就离中心越远；图里大块的形状变化慢，落在中心附近。',
        en: 'Night shots on a phone and scans of old photos often have a layer of fine noise. The finer the grain, the faster it changes, and the farther from the centre it sits in the spectrum. Large shapes in the image change slowly and sit near the centre.',
      },
      fig: { part: 'fqSpectrum', input: 'test', caption: { zh: '第一组测试输入的频谱', en: 'Spectrum of the first test input' } },
    },
    {
      t: {
        zh: '新元件「频域低通」把调音台做成了二维：把图变到频谱，以中心为圆心留下一块，再变回图像。它有两个设置：掩膜形状（硬圆盘或高斯）和半径 R。「频谱」元件可以看任何结果的频谱。',
        en: 'The new part "Frequency low-pass" makes the mixing desk 2D: it turns the image into its spectrum, keeps a region around the centre, then turns it back into an image. It has two settings: the mask shape (hard disc or Gaussian) and the radius R. The "Spectrum" part lets you see the spectrum of any result.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：去掉照片里的噪点，输出要和期望一样干净、柔和。四组测试是方块、圆盘、字母和横条，误差图会告诉你差在哪里。',
        en: 'In this level: remove the noise from the photos. The output must be as clean and soft as expected. The four test sets are a square, a disc, a letter and horizontal bars; the error map shows you where you are off.',
      },
      fig: { test: 0, caption: { zh: '方块：带噪点的输入和期望', en: 'Square: the noisy input and the expected output' } },
    },
  ],
  '2-7': [
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
  '2-8': [
    {
      t: {
        zh: '手机相册的缩略图、网页上缩小显示的照片，都要把大图变小。最直接的办法是隔一个点留一个：32×32 的图，每行每列只留一半，就成了 16×16。',
        en: 'Thumbnails in your phone\'s gallery and photos shown smaller on web pages both need a large image made small. The most direct way is to keep every other pixel: keep half of each row and column of a 32×32 image and you get 16×16.',
      },
    },
    {
      t: {
        zh: '新元件「隔点取样」做的就是这件事。对粗大的图案，它的效果很好：一张大格子的棋盘，缩小以后还是棋盘。',
        en: 'The new part "Downsample" does exactly that. On coarse patterns it works well: a checkerboard with large squares is still a checkerboard after shrinking.',
      },
      fig: { part: 'downsample', input: 'checker', caption: { zh: '隔点取样：大格子棋盘缩成一半', en: 'Downsample: a large-square checkerboard shrunk to half size' } },
    },
    {
      t: {
        zh: '可测试里还有斑马板（一圈圈越往外越细的环）和细条纹。上一关一维的采样实验，在这里换成了二维的图。它们缩小以后，还是原来的样子吗？',
        en: 'But the tests also include a zone plate (rings that get finer towards the outside) and fine stripes. The 1D sampling experiments from the last level now become 2D images. Do these still look the same after shrinking?',
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
  '2-9': [
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
        zh: '这一关有两个输入 A 和 B。输出要 A 的大轮廓（低频）加上 B 的细节（高频）。A 那一半，前面几关已经做过；B 那一半怎么拿到，是这一关要想的。',
        en: 'This level has two inputs, A and B. The output should be A\'s broad outline (low frequencies) plus B\'s detail (high frequencies). You have already done A\'s half in earlier levels; how to get B\'s half is the puzzle here.',
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
}
