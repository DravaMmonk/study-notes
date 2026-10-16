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
    { t: { zh: '胶片相机的底片上，明暗是反的：天空发黑，白衬衫发暗。冲印时再反一次，才变回正常。医生看 X 光片时，也常在正片和负片之间切换。', en: 'On a film camera\'s negative, light and dark are reversed: the sky looks black and a white shirt looks dark. Printing reverses them again to bring the picture back to normal. Doctors reading X-rays also often switch between positive and negative.' } },
    { t: { zh: '在数字图里，反相就是把每格的数换掉：0 变 1，1 变 0，0.3 变 0.7。照片还是那张照片，只是明暗颠倒。', en: 'In a digital image, inverting means replacing the number in every cell: 0 becomes 1, 1 becomes 0, 0.3 becomes 0.7. The photo is still the same photo, just with light and dark swapped.' } },
    { t: { zh: '这一关的元件都很朴素：「乘系数」把每格乘同一个数，「加常数」给每格加同一个数，还有两张图逐格相加、相减。', en: 'The parts in this level are all simple: "Scale" multiplies every cell by the same number, "Add constant" adds the same number to every cell, and two images can be added or subtracted cell by cell.' }, fig: { part: 'scale', params: { k: 0.5 }, input: 'square', caption: { zh: '乘系数 ×0.5：每格减半，整张图变暗', en: 'Scale ×0.5: every cell is halved, so the whole image gets darker' } } },
    { t: { zh: '这一关你要做的：只用这些乘和加，凑出「1 减去输入」。', en: 'Your task in this level: using only these multiplications and additions, make "1 minus the input".' }, fig: { test: 0, caption: { zh: '第一组测试：方块和它的底片', en: 'Set 1: a square and its negative' } } },
  ],
  '0-4': [
    { t: { zh: '商店监控、路口车流统计、停车场的空位提示，常要回答同一个问题：画面里多了什么？摄像头不动，背景几乎不变，变的只是闯进来的东西。', en: 'Shop security cameras, traffic counters at junctions and free-space signs in car parks often have to answer the same question: what is new in the picture? The camera does not move and the background barely changes; the only thing that changes is whatever comes in.' } },
    { t: { zh: '这一关有两个输入：「现场」是现在拍的，「空场」是没人时拍的参照。输出是一张只有 0 和 1 的图，叫<b>掩膜</b>：1 标出闯入者占的格子，其余是 0。', en: 'This level has two inputs: "Scene" is taken now, and "Empty scene" is a reference taken when nobody was there. The output is an image of only 0s and 1s, called a <b>mask</b>: 1 marks the cells the intruder covers, and everything else is 0.' } },
    { t: { zh: '新元件「阈值」：大于 t 的格子变 1，其余变 0。它把深浅不一的灰，变成「是」或「否」的判断。', en: 'New part, "Threshold": cells greater than t become 1, the rest become 0. It turns shades of grey into a "yes" or "no" decision.' }, fig: { part: 'threshold', params: { t: 0.5 }, input: 'rampX', caption: { zh: '阈值 t = 0.5：一条从暗到亮的斜坡，变成一半黑一半白', en: 'Threshold t = 0.5: a ramp from dark to bright becomes half black, half white' } } },
    { t: { zh: '这一关你要做的：四组测试里，闯入者的位置各不相同。输出要把它圈出来，一格不多，一格不少。', en: 'Your task in this level: the intruder is in a different place in each of the four tests. Your output must mark it out exactly, not one cell more or less.' }, fig: { test: 0, caption: { zh: '第一组：现场、空场和期望的掩膜', en: 'Set 1: scene, empty scene and the expected mask' } } },
  ],
  '0-5': [
    { t: { zh: '两千多年前，《墨经》就记下过：暗室的墙上开个小孔，屋外的景物会在对面墙上成一个倒立的像。这叫小孔成像，开孔的暗室叫暗箱，它是相机最早的样子。', en: 'More than two thousand years ago, the Mohist Canon recorded that if you open a small hole in the wall of a dark room, the scene outside forms an upside-down image on the opposite wall. This is the pinhole camera; the dark room with the hole is called a camera obscura, the earliest form of the camera.' } },
    { t: { zh: '台上从左到右是一支箭头、一块开孔的板和一块屏幕。Z 是箭头到孔板的距离，f 是孔板到屏幕的距离，孔的直径叫 D，有几种可换。另有一块小图，画的是从正面看屏幕上的像。', en: 'On the bench, from left to right, are an arrow, a board with a hole in it and a screen. Z is the distance from the arrow to the board, f is the distance from the board to the screen, and the hole\'s diameter is D, with a few sizes to choose from. A small extra picture shows the image on the screen as seen from the front.' } },
    { t: { zh: '要想的问题有两个：屏上的像有多大，由什么决定？孔开大或开小，像会变成什么样？', en: 'Two things to think about: what decides how big the image on the screen is? And what happens to the image when the hole is made bigger or smaller?' } },
    { t: { zh: '这一关你要做的：让屏上的像满足台边列出的几项要求。每一项达到与否，台上都会实时标出。', en: 'Your task in this level: make the image on the screen meet the requirements listed beside the bench. The bench shows live whether each one is met.' } },
  ],
}
