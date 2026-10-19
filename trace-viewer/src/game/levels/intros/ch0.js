// 第 0 章各关的引入。格式见 ./index.js。
export default {
  '0-1': [
    { t: { zh: '相机拍下的照片，在电脑里不是一幅画，而是一张数字表：画面切成许多小方格，叫<b>像素</b>，每格记一个亮度。这个游戏里 0 是黑，1 是白，中间是深浅不同的灰。', en: 'Inside a computer, a photo is not a picture but a table of numbers: the image is cut into many small squares called <b>pixels</b>, and each one records a brightness. In this game 0 is black, 1 is white, and in between are shades of grey.' } },
    { t: { zh: '计算机视觉做的事，就是从这张数字表里算出有用的信息：哪里有边、画面里有没有人、东西离多远。这门课里的每个方法，说到底都是对这些数字做运算。', en: 'Computer vision works out useful information from this table of numbers: where the edges are, whether there is a person in the picture, how far away things are. Every method in this course comes down to arithmetic on these numbers.' } },
    { t: { zh: '这一关先熟悉工作台：「输入」是相机给的图，「输出」是你交出去的图，中间用线连起元件，就是电路。每组测试都拿你的输出和期望逐格比对。', en: 'This level gets you used to the workbench: "Input" is the image from the camera, "Output" is the image you hand in, and the parts you wire up in between form a circuit. Each test compares your output with the expected one, cell by cell.' }, fig: { test: 0, caption: { zh: '第一组测试：输入和期望', en: 'Set 1: input and expected' } } },
  ],
  '0-2': [
    { t: { zh: '拿到一个不认识的工具，最可靠的办法是试：给它不同的东西，看它还回来什么。研究黑箱、排查电路，都是这样做的：先实验，再下结论。', en: 'When you are handed a tool you do not know, the most reliable thing to do is try it: give it different things and see what comes back. That is how people study black boxes and debug circuits: experiment first, conclude later.' } },
    { t: { zh: '这一关的元件就是一个黑箱，看不到它里面怎么算。台上有几张测试图，挑一张喂进去，对比进去前和出来后的样子，然后回答它做了什么。', en: 'The part in this level is a black box: you cannot see how it works inside. There are a few test images on the bench. Pick one to feed in, compare what goes in with what comes out, then say what the part did.' } },
    { t: { zh: '要想的问题：什么样的图案，能让变化一眼就看出来？一张图看不准，就多换几张，看结论是否一致。这个元件过关后就归你了。', en: 'Something to think about: what kind of pattern makes the change obvious at a glance? If one image leaves you unsure, try a few more and check that they agree. Once you pass, this part is yours.' } },
  ],
  '0-3': [
    { t: { zh: '平移元件每次只把图挪一格。可要挪的，常常不止一格。', en: 'The shift part only ever moves the picture by one pixel. But things often need to move further than that.' } },
    { t: { zh: '一个元件的输出，可以接到另一个元件的输入上：前一个算完，后一个接着算。', en: 'The output of one part can be wired into the input of another: when the first is done, the next carries on.' } },
    { t: { zh: '这一关你要做的：把整张图往右挪两格、往下挪两格。', en: 'Your task in this level: move the whole picture two pixels right and two pixels down.' }, fig: { test: 0, caption: { zh: '第一组测试：方块和挪过的方块', en: 'Set 1: a square and the square moved' } } },
  ],
  '0-4': [
    { t: { zh: '胶片相机的底片上，明暗是反的：天空发黑，白衬衫发暗。冲印时再反一次，才变回正常。医生看 X 光片时，也常在正片和负片之间切换。', en: 'On a film camera\'s negative, light and dark are reversed: the sky looks black and a white shirt looks dark. Printing reverses them again to bring the picture back to normal. Doctors reading X-rays also often switch between positive and negative.' } },
    { t: { zh: '在数字图里，反相就是把每格的数换掉：0 变 1，1 变 0，0.3 变 0.7。照片还是那张照片，只是明暗颠倒。', en: 'In a digital image, inverting means replacing the number in every cell: 0 becomes 1, 1 becomes 0, 0.3 becomes 0.7. The photo is still the same photo, just with light and dark swapped.' } },
    { t: { zh: '为什么是「1 减去输入」？亮度都在 0 到 1 之间。只把每格乘 −1，暗的 0.3 会变成 −0.3，亮的 0.9 会变成 −0.9：明暗是反过来了，可所有的数都掉到了 0 以下，比黑还黑。再给每格加上 1，整张图就抬回 0 到 1 之间：−0.3 + 1 = 0.7，−0.9 + 1 = 0.1。所以「乘 −1 再加 1」就是 1 − 输入：原来越亮，现在越暗。', en: 'Why "1 minus the input"? Brightness always lies between 0 and 1. Multiply each cell by −1 alone and a dark 0.3 becomes −0.3 while a bright 0.9 becomes −0.9: light and dark are swapped, but every number has dropped below 0, darker than black. Add 1 to every cell and the whole picture is lifted back into 0 … 1: −0.3 + 1 = 0.7 and −0.9 + 1 = 0.1. So "multiply by −1, then add 1" is 1 − input: what was brighter is now darker.' } },
    { t: { zh: '这一关的元件都很朴素：「常数」一直输出同一个数；「相乘」「相加」把两样东西逐格乘起来、加起来。一个数和一张图相乘、相加时，这个数用在每一格上。', en: 'The parts in this level are all simple: "Constant" always outputs the same number; "Multiply" and "Add" multiply and add two things cell by cell. When a number meets a picture, the number applies to every cell.' } },
    { t: { zh: '这一关你要做的：只用这些乘和加，凑出「1 减去输入」。', en: 'Your task in this level: using only these multiplications and additions, make "1 minus the input".' }, fig: { test: 0, caption: { zh: '第一组测试：方块和它的底片', en: 'Set 1: a square and its negative' } } },
  ],
  '0-5': [
    { t: { zh: '阴天、起雾，或者镜头上有一层灰，拍出来的照片就灰蒙蒙的：最暗的地方不够黑，最亮的地方不够白，所有亮度都挤在中间一小段里。', en: 'On an overcast or foggy day, or with dust on the lens, photos come out washed out: the darkest parts are not black enough, the brightest not white enough, and every brightness is squeezed into a narrow band in the middle.' } },
    { t: { zh: '这一关的照片，亮度都挤在 0.25 到 0.75 之间。修图软件里的「色阶」能把它拉回 0 到 1。', en: 'In this level\'s photos, every brightness is squeezed between 0.25 and 0.75. The "levels" tool in a photo editor can stretch it back out to 0 … 1.' } },
    { t: { zh: '这一关你要做的：让 0.25 变成 0、0.75 变成 1，中间的亮度按比例拉开。要想的问题：先乘还是先加，结果一样吗？', en: 'Your task in this level: turn 0.25 into 0 and 0.75 into 1, stretching the brightnesses in between in proportion. Something to think about: does it matter whether you multiply or add first?' }, fig: { test: 0, caption: { zh: '第一组测试：灰蒙蒙的方块和拉开后的方块', en: 'Set 1: a washed-out square and the square stretched' } } },
  ],
  '0-6': [
    { t: { zh: '很多问题要的答案只有「是」或「否」：这一格是不是路面？这里有没有人？深浅不一的灰，得变成 0 和 1。', en: 'Many questions want a yes or a no: is this cell road? Is anyone here? Shades of grey have to become 0s and 1s.' } },
    { t: { zh: '台上是一个黑箱，它只会输出 0 和 1。喂它不同的测试图，看哪些格子变成了 1，哪些变成了 0。', en: 'There is a black box on the bench, and it only ever outputs 0 or 1. Feed it different test pictures and see which cells become 1 and which become 0.' } },
    { t: { zh: '要想的问题：哪张测试图最容易读出它的规则？点一下格子（电脑上把鼠标停在上面），可以读出它原来的亮度。这个元件过关后也归你。', en: 'Something to think about: which test picture reveals its rule most easily? Tap a cell (or point at it on a computer) to read its original brightness. Once you pass, this part is yours too.' } },
  ],
  '0-7': [
    { t: { zh: '商店监控、路口车流统计、停车场的空位提示，常要回答同一个问题：画面里多了什么？摄像头不动，背景几乎不变，变的只是闯进来的东西。', en: 'Shop security cameras, traffic counters at junctions and free-space signs in car parks often have to answer the same question: what is new in the picture? The camera does not move and the background barely changes; the only thing that changes is whatever comes in.' } },
    { t: { zh: '这一关有两个输入：「现场」是现在拍的，「空场」是没人时拍的参照。输出是一张只有 0 和 1 的图，叫<b>掩膜</b>：1 标出闯入者占的格子，其余是 0。', en: 'This level has two inputs: "Scene" is taken now, and "Empty scene" is a reference taken when nobody was there. The output is an image of only 0s and 1s, called a <b>mask</b>: 1 marks the cells the intruder covers, and everything else is 0.' } },
    { t: { zh: '这是第一关有两张输入图。新元件「相减」和「相加」把两张图逐格相减、相加：a − b 的每一格，就是 a 的这一格减去 b 的这一格。', en: 'This is the first level with two input pictures. The new parts "Subtract" and "Add" subtract and add two pictures cell by cell: each cell of a − b is that cell of a minus that cell of b.' } },
    { t: { zh: '这一关你要做的：四组测试里，闯入者的位置各不相同。输出要把它圈出来，一格不多，一格不少。', en: 'Your task in this level: the intruder is in a different place in each of the four tests. Your output must mark it out exactly, not one cell more or less.' }, fig: { test: 0, caption: { zh: '第一组：现场、空场和期望的掩膜', en: 'Set 1: scene, empty scene and the expected mask' } } },
  ],
  '0-8': [
    { t: { zh: '两千多年前，《墨经》就记下过：暗室的墙上开个小孔，屋外的景物会在对面墙上成一个倒立的像。这叫小孔成像，开孔的暗室叫暗箱，它是相机最早的样子。', en: 'More than two thousand years ago, the Mohist Canon recorded that if you open a small hole in the wall of a dark room, the scene outside forms an upside-down image on the opposite wall. This is the pinhole camera; the dark room with the hole is called a camera obscura, the earliest form of the camera.' } },
    { t: { zh: '台上从左到右是一支箭头、一块开孔的板和一块屏幕。Z 是箭头到孔板的距离，f 是孔板到屏幕的距离，孔的直径叫 D，有几种可换。另有一块小图，画的是从正面看屏幕上的像。', en: 'On the bench, from left to right, are an arrow, a board with a hole in it and a screen. Z is the distance from the arrow to the board, f is the distance from the board to the screen, and the hole\'s diameter is D, with a few sizes to choose from. A small extra picture shows the image on the screen as seen from the front.' } },
    { t: { zh: '要想的问题有两个：屏上的像有多大，由什么决定？孔开大或开小，像会变成什么样？', en: 'Two things to think about: what decides how big the image on the screen is? And what happens to the image when the hole is made bigger or smaller?' } },
    { t: { zh: '这一关你要做的：让屏上的像满足台边列出的几项要求。每一项达到与否，台上都会实时标出。', en: 'Your task in this level: make the image on the screen meet the requirements listed beside the bench. The bench shows live whether each one is met.' } },
  ],
  '0-9': [
    { t: { zh: '这是一道挑战关，可以跳过。它不需要新元件，只要把手里的平移、加减和阈值用得更巧。', en: 'This is a challenge level, and you can skip it. It needs no new parts, only a cleverer use of the shifts, sums and threshold you already have.' } },
    { t: { zh: '监控画面上常给闯入者描一圈边，让人一眼看到它的轮廓，又不挡住它本身。', en: 'Security footage often draws an outline round an intruder, so its shape stands out at a glance without hiding it.' } },
    { t: { zh: '这一关你要做的：只标出闯入者的外圈，也就是闯入者身上、上下左右至少挨着一格地面的格子。要想的问题：外圈的格子和里面的格子，差别在哪里？', en: 'Your task in this level: mark only the intruder\'s outer ring, that is, the intruder cells that touch at least one floor cell above, below, left or right. Something to think about: what makes a cell on the ring different from one further in?' }, fig: { test: 2, caption: { zh: '第三组测试：十字形的闯入者和它的外圈', en: 'Set 3: a cross-shaped intruder and its outer ring' } } },
  ],
  '0-10': [
    { t: { zh: '工厂的流水线上，相机给每个零件拍一张照，和合格零件的照片比一比，挑出有缺陷的。这一章最后三关，就在这样一台质检台上。', en: 'On a factory line, a camera photographs every part and compares it with a photo of a good one, picking out the faulty ones. The last three levels of this chapter take place at such an inspection station.' } },
    { t: { zh: '两个输入：「标准件」是合格零件的照片，「实物」是传送带上这一件，位置已经对齐。零件本身就有亮有暗。', en: 'Two inputs: the "Reference" is a photo of a good part, and the "Part" is the one on the belt, already lined up. The part itself has light and dark areas.' } },
    { t: { zh: '这一关你要做的：实物上的凹坑比标准件暗，在凹坑处输出 1，其余输出 0。', en: 'Your task in this level: dents on the part are darker than on the reference. Output 1 on the dents and 0 everywhere else.' }, fig: { test: 0, caption: { zh: '第一组：标准件、实物和期望', en: 'Set 1: reference, part and the expected mask' } } },
  ],
  '0-11': [
    { t: { zh: '质检台的灯用久了会变暗。现在拍的实物，只有当初拍标准件时 80% 的亮度。', en: 'The station\'s lamp grows dimmer with use. Parts photographed now get only 80% of the light the reference was photographed under.' } },
    { t: { zh: '灯暗了，实物处处都比标准件暗，可零件并没有问题。质检台不能因此到处报警。', en: 'With the lamp dimmer, the part is darker than the reference everywhere, yet nothing is wrong with it. The station must not raise alarms all over because of that.' } },
    { t: { zh: '这一关你要做的：还是只标出凹坑。要想的问题：灯暗了 20%，亮的地方和暗的地方，各暗了多少？', en: 'Your task in this level: again, mark only the dents. Something to think about: with the lamp 20% dimmer, how much darker does a bright area get, and how much a dark one?' }, fig: { test: 2, caption: { zh: '第三组：格板，亮格和暗格都变暗了', en: 'Set 3: a tile board, bright and dark tiles both dimmer' } } },
  ],
  '0-12': [
    { t: { zh: '质检台要正式上线了。除了凹坑，零件表面还会有划痕：划痕反光，比标准件更亮。', en: 'The inspection station is about to go live. Besides dents, parts may have scratches, which catch the light and look brighter than the reference.' } },
    { t: { zh: '这一关你要做的：灯还是只有 80%，凹坑和划痕都标 1，其余标 0。合格的零件，输出应该全是 0。', en: 'Your task in this level: the lamp is still at 80%. Mark both dents and scratches with 1 and everything else with 0. For a good part the output should be all 0.' }, fig: { test: 0, caption: { zh: '第一组：一个凹坑和一道划痕', en: 'Set 1: one dent and one scratch' } } },
  ],
}
