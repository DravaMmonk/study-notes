// 第 4 章各关的引入。格式见 ./index.js。
export default {
  '4-1': [
    { t: { zh: '前几章，元件的参数都是你亲手定的：模糊多少、阈值多高。可手机相册认人脸、语音输入听写，背后的模型有成千上万个数，没人能一个个拧。机器得自己调。', en: 'In earlier chapters you set every part\'s parameters by hand: how much blur, how high a threshold. But the models behind face recognition in your photo app or voice typing have thousands upon thousands of numbers, and nobody can turn them one by one. The machine has to tune itself.' } },
    { t: { zh: '要自己调，先得知道「现在调得有多差」。这个分数叫<b>误差</b>：模型的输出离样本的正确答案有多远，平方后取平均。误差越小越好。', en: 'To tune itself, it first needs to know how badly tuned it is right now. That score is the <b>error</b>: how far the model\'s outputs are from the samples\' correct answers, squared and averaged. The smaller the error, the better.' } },
    { t: { zh: '新元件「可学习常数」是一个数，这个数不用你填，把它和输入相乘就是 w × 输入。电路里有可学习的元件时，面板里会出现「训练」：每按一步，机器摸一摸误差往哪边下坡，就把旋钮往那边挪一点。', en: 'The new part "Learnable constant" is a number you do not fill in; multiply the input by it and you have w × input. When a circuit has learnable parts, "Training" appears in the panel: at every step the machine feels which way the error slopes down and nudges the knob that way.' } },
    { t: { zh: '这一关你要做的：每组测试是一个样本，让机器自己找出那个数。要想的问题：每一步该迈多大？迈得太小、太大，各会怎样？', en: 'Your task in this level: each test is one sample; let the machine find the number itself. Something to think about: how big should each step be? What happens if the steps are too small, or too big?' }, fig: { test: 0, caption: { zh: '第一个样本：x = 0.2', en: 'The first sample: x = 0.2' } } },
  ],
  '4-2': [
    { t: { zh: '上一关只有一个旋钮。这一关的规律多了一项：输出 = w × 输入 + b，两个旋钮要一起调。', en: 'Last level had a single knob. This level\'s rule has one more term: output = w × input + b, and the two knobs must be tuned together.' } },
    { t: { zh: 'w 和 b 各用一个「可学习常数」。', en: 'Use one "Learnable constant" for w and another for b.' } },
    { t: { zh: '这一关你要做的：让机器自己找到 w 和 b。要想的问题：两个旋钮时，「往下坡走」指的是往哪个方向走？', en: 'Your task in this level: let the machine find w and b itself. Something to think about: with two knobs, which direction does "walking downhill" mean?' }, fig: { test: 0, caption: { zh: '第一个样本：x = 0.2', en: 'The first sample: x = 0.2' } } },
  ],
  '4-3': [
    {
      t: {
        zh: '「猜核」里，你看着输入和输出，一格格拧出了一个 3×3 核。那个核的数字很整齐，猜得出来。要是九个数乱七八糟、毫无规律呢？',
        en: 'In "Guess the kernel" you looked at the input and output and worked out a 3×3 kernel cell by cell. Its numbers were tidy enough to guess. What if the nine numbers are a jumble with no pattern at all?',
      },
    },
    {
      t: {
        zh: '新元件「可学习 3×3 核」：和 3×3 核一样拿九个权重去压图，只是权重不用你填，它会照着测试的期望自己调。上一关只有一两个旋钮，这次是九个。',
        en: 'The new part is the "Learnable 3×3 kernel": like the 3×3 kernel, it presses nine weights over the image, but you do not fill in the weights; it tunes them itself to match the tests\' expected outputs. Last level had one or two knobs; this time there are nine.',
      },
    },
    {
      t: {
        zh: '这一关的输入是一片随机噪点，期望是某个没人告诉你的核压过它的结果。你要做的：让输出和期望对上。',
        en: 'The input in this level is random noise, and the expected output is what you get by pressing some kernel nobody tells you about over it. Your task: make the output match the expected.',
      },
      fig: { test: 0, caption: { zh: '第一组测试：噪点 → 某个未知的核压过之后', en: 'Set 1: noise → after an unknown kernel is pressed over it' } },
    },
  ],
  '4-4': [
    { t: { zh: '相机按快门时手一抖，照片就糊了一下。每台相机抖的样子都差不多，可没人知道具体是什么样。', en: 'If the hand shakes as the shutter clicks, the photo blurs a little. Each camera shakes in much the same way, but nobody knows exactly how.' } },
    { t: { zh: '这一关给你几对照片：清楚的原图和这台相机拍出来的样子。最后两组是「新照片」：它们不参加训练，只用来检查学到的东西对没见过的照片管不管用。训练面板会多画一条新样本的误差线。', en: 'This level gives you a few pairs of photos: the sharp original and what this camera captured. The last two sets are "new photos": they take no part in training and only check whether what was learned works on photos it has never seen. The training panel draws an extra error line for the new samples.' }, fig: { test: 0, caption: { zh: '第一组：字母 F 和抖过的样子', en: 'Set 1: the letter F and how it came out shaken' } } },
    { t: { zh: '这一关你要做的：训练一个可学习核，学会这台相机的抖。', en: 'Your task in this level: train a learnable kernel to learn this camera\'s shake.' } },
  ],
  '4-5': [
    { t: { zh: '「神经网络」的名字来自大脑：神经细胞收到许多信号，合起来够强就兴奋。计算机里的神经元是它的简化版，一个只做一件小事的计算单元。', en: 'The name "neural network" comes from the brain: a nerve cell receives many signals and fires when together they are strong enough. A neuron in a computer is a simplified version, a computing unit that does one small thing.' } },
    { t: { zh: '每组测试是一张字母图，已经缩成两个数：斜笔画多少、弯笔画多少。于是一张图就是平面上的一个点，神经元要给每个点打一个分。', en: 'Each test is a letter picture already reduced to two numbers: how much diagonal stroke and how much curved stroke. So a picture is a point in the plane, and the neuron gives each point a score.' } },
    { t: { zh: '新元件 exp 把每个数 x 换成 e 的 x 次方：x 越大越大，x 是负数时接近 0，但永远是正的。', en: 'The new part exp replaces each number x with e to the power x: the bigger x, the bigger it gets; for negative x it approaches 0 but stays positive.' }, fig: { part: 'exp', input: 'rampX', caption: { zh: 'exp 处理一条从 0 到 1 的斜坡', en: 'exp on a ramp from 0 to 1' } } },
    { t: { zh: '这一关你要做的：按说明搭出神经元，训练它分开 X 和 O。要想的问题：只靠这三个可学习的数，它能分开哪些点，又分不开哪些？', en: 'Your task in this level: build the neuron as the brief describes and train it to separate X from O. Something to think about: with only these three learnable numbers, which points can it separate, and which can it not?' } },
  ],
  '4-6': [
    { t: { zh: '上一关的 X 和 O 在平面上各占一边。这一关换了规则：X 是「只有一种笔画」，O 是「两种都有，或者都没有」。', en: 'Last level\'s X and O each sat on one side of the plane. This level changes the rule: X means "only one kind of stroke", O means "both kinds, or neither".' } },
    { t: { zh: '上一关搭的 1 / (1 + e^(−z)) 现在是现成的「Sigmoid」元件。', en: 'The 1 / (1 + e^(−z)) you built last level is now the ready-made "Sigmoid" part.' } },
    { t: { zh: '这一关你要做的：X 输出大于 0.6，O 小于 0.4。要想的问题：一个神经元是一条分界线，这些点能被一条直线分开吗？', en: 'Your task in this level: above 0.6 for X, below 0.4 for O. Something to think about: one neuron is one dividing line; can these points be split by a straight line?' } },
  ],
  '4-7': [
    { t: { zh: '你用差分找过台阶：暗→亮是正，亮→暗是负，符号还能告诉你边朝哪边。可很多时候只关心「这里有没有边」，不在乎方向。', en: 'You found steps with a difference: dark→bright is positive, bright→dark negative, and the sign even tells you which way the edge faces. But often all that matters is "is there an edge here", whatever its direction.' } },
    {
      t: {
        zh: '回忆一下横向差分：一个亮方块的左右两条边，一条是正的，一条是负的。这一关要两条都变成正的强度。',
        en: 'Recall the horizontal difference: of a bright square\'s left and right edges, one comes out positive and the other negative. In this level both have to become positive strengths.',
      },
      fig: {
        part: 'diffx',
        input: 'square',
        caption: { zh: '横向差分处理亮方块：两侧一正一负', en: 'Horizontal difference on a bright square: one side positive, the other negative' },
      },
    },
    {
      t: {
        zh: '这一关你要做的：不管是变亮还是变暗，每条竖边都输出它的强度。先看清第一组的输入和期望。',
        en: 'Your task: for every vertical edge, whether it goes brighter or darker, output its strength. Look carefully at the input and expected output of Set 1 first.',
      },
      fig: { test: 0, caption: { zh: '第一组测试：亮方块 → 两条边都是正的', en: 'Set 1: bright square → both edges positive' } },
    },
  ],
  '4-8': [
    { t: { zh: '上一关搭出的「负数变 0、正数不变」现在是现成的元件 ReLU。', en: 'The "negatives become 0, positives stay" you built last level is now the ready-made part ReLU.' } },
    { t: { zh: '这一关你要做的：两张图逐格比较，每格输出较大的那个。要想的问题：a 比 b 大多少？这个差什么时候是正的？', en: 'Your task in this level: compare two pictures cell by cell and output the larger value in each. Something to think about: how much bigger is a than b? When is that difference positive?' }, fig: { test: 0, caption: { zh: '第一组：方块和圆盘', en: 'Set 1: a square and a disc' } } },
  ],
  '4-9': [
    { t: { zh: '到现在为止，元件的输出都和输入一样大。真正的卷积网络里，图往往一层层变小：一张照片几百万个像素，缩小之后，后面的层才算得动。', en: 'So far every part\'s output has been as big as its input. In a real convolutional network the picture usually shrinks layer by layer: a photo has millions of pixels, and only after shrinking can the later layers keep up.' } },
    { t: { zh: '卷积层的窗口就是你熟悉的 3×3 核：停在图上一处，算出一个数，再挪到下一处。每次挪几格，叫<b>步幅</b>。', en: 'A convolution layer\'s window is the familiar 3×3 kernel: it stops at one place, works out a number, then moves on. How far it moves each time is the <b>stride</b>.' } },
    { t: { zh: '这一关你要做的：做出一层步幅为 2 的卷积，权重由训练找出来。测试图有两种大小。要想的问题：图变大时，这一层要学的数会不会跟着变多？', en: 'Your task in this level: make a convolution layer with stride 2, with its weights found by training. The test pictures come in two sizes. Something to think about: when the picture gets bigger, does this layer have more numbers to learn?' }, fig: { test: 0, caption: { zh: '第一组：字母 F，输出只有一半大', en: 'Set 1: the letter F, with an output half the size' } } },
  ],
  '4-10': [
    {
      t: {
        zh: '3×3 的元件只看得见自己和身边一圈，一共 9 格。可一张脸、一个车轮，在图上远比 3×3 大。网络怎样认出大的东西？',
        en: 'A 3×3 part only sees its own pixel and the ring around it, 9 cells in all. But a face or a wheel is far bigger than 3×3 in an image. How does a network recognise big things?',
      },
    },
    {
      t: {
        zh: '这一关要判断：一个格子周围 7×7 的范围是不是全亮。测试里特意放了小一些的方块、长条，还有缺了一个角的 7×7。',
        en: 'This level asks: is the 7×7 area around a cell entirely bright? The tests deliberately include smaller squares, long bars, and a 7×7 square with one corner missing.',
      },
      fig: { test: 1, caption: { zh: '另一组：一个 5×5、一个 3×3 的方块', en: 'Another set: a 5×5 square and a 3×3 square' } },
    },
    {
      t: {
        zh: '这一关你要做的：手里只有看 3×3 的元件，做出看 7×7 的判断。要想的问题：「7×7」能从哪里来？',
        en: 'Your task: using only parts that look at 3×3, make a judgement about 7×7. Something to think about: where can "7×7" come from?',
      },
      fig: { test: 0, caption: { zh: '第一组：7×7 的亮方块', en: 'Set 1: a bright 7×7 square' } },
    },
  ],
  '4-11': [
    {
      t: {
        zh: '同一个东西拍两次，总会差一点：手一抖，它就往旁边偏了一两个像素。可它还是那个东西，识别的结果不该跟着变。',
        en: 'Photograph the same thing twice and the shots always differ a little: your hand shakes and it moves a pixel or two to the side. But it is still the same thing, and what it is recognised as should not change.',
      },
    },
    {
      t: {
        zh: '网络还要不断把图缩小。这一关的输入是几个亮的特征点，要把 16×16 缩成 8×8。',
        en: 'A network also keeps shrinking the image. The input in this level is a few bright feature points, and you have to shrink 16×16 down to 8×8.',
      },
      fig: { test: 0, caption: { zh: '第一组：特征点在原位', en: 'Set 1: the feature points in their original place' } },
    },
    { t: { zh: '有时特征点会整体偏一格。这一关的要求是：偏了一格，缩小后的结果也要和原位时完全一样。上一关的「取较大」现在是现成的元件。', en: 'Sometimes all the feature points are off by one pixel. This level\'s requirement: off by one pixel, the shrunk result must be exactly the same as in place. Last level\'s "Larger" is now a ready-made part.' }, fig: { test: 1, caption: { zh: '另一组：整体偏到右下，期望不变', en: 'Another set: everything shifted down and to the right, same expected output' } } },
  ],
  '4-12': [
    {
      t: {
        zh: '手写数字识别、拍照认花、相册按人脸分组，问的都是「这是什么」。这类问题叫分类，是视觉里最常见的任务。这一关做最小的一个：只有两类，X 或 O。',
        en: 'Reading handwritten digits, identifying a flower from a photo, grouping an album by face: they all ask "what is this?". This kind of problem is called classification, the most common task in vision. This level does the smallest one: just two classes, X or O.',
      },
    },
    {
      t: {
        zh: '「一个神经元」里的神经元拿到的是现成的两个数：斜笔画多少、弯笔画多少。这一关没人替你算，网络只拿到像素，字母还会挪位置、变深浅、带噪点。',
        en: 'The neuron in "One neuron" was handed two ready-made numbers: how many diagonal strokes, how many curved strokes. This time nobody computes them for you. The network gets only pixels, and the letters move around, get lighter or darker, and carry noise.',
      },
      fig: { test: 2, caption: { zh: '一组测试：挪了位置、带噪点的 O', en: 'One test set: an O that has moved and has noise' } },
    },
    { t: { zh: '手里的元件：「卷积层」是从很小的随机数开始的可学习 3×3 核；「求平均」把整张图变成一个数；「全连接」和「Sigmoid」是你在前面搭出来的。', en: 'The parts to hand: "Conv layer" is a learnable 3×3 kernel that starts from very small random numbers; "Average" turns a whole picture into one number; "Dense" and "Sigmoid" are what you built earlier.' } },
    {
      t: {
        zh: '这一关你要做的：输出一个数，X 大于 0.6，O 小于 0.4。要想的问题：X 和 O 到底差在哪里，什么信息该留下？',
        en: 'Your task: output one number, above 0.6 for X and below 0.4 for O. Something to think about: what really is the difference between X and O, and which information should be kept?',
      },
      fig: { test: 1, caption: { zh: '一组 X：期望 1', en: 'A set with X: expected 1' } },
    },
  ],
  '4-13': [
    {
      t: {
        zh: '彩色照片其实是三张图叠在一起：红、绿、蓝各一张，每格记着这种颜色有多亮。到现在为止，电路只处理过一张灰度图。',
        en: 'A colour photo is really three images stacked together: one each for red, green and blue, each cell recording how bright that colour is. So far your circuits have only handled a single greyscale image.',
      },
    },
    {
      t: {
        zh: '有些边只有颜色在变，亮度不变，比如一样亮的红和绿挨在一起。色盲检测图就是这样画的：只看明暗的眼睛，看不出里面的数字。',
        en: 'Some edges change only in colour, not in brightness, such as equally bright red and green side by side. Colour-blindness test plates are drawn this way: an eye that only sees light and dark cannot make out the number inside.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：只描出红和绿的交界，单纯变亮变暗、或只有蓝色在变的地方都要是 0。要想的问题：三张图各自看得到什么，看不到什么？',
        en: 'Your task: trace only the boundary between red and green. Places that just get brighter or darker, or where only blue changes, must be 0. Something to think about: what can each of the three images see, and what can it not?',
      },
      fig: { test: 0, caption: { zh: '第一组：红绿对半，一样亮', en: 'Set 1: half red, half green, equally bright' } },
    },
  ],
  '4-14': [
    { t: { zh: '上一关一个核横跨三个通道，学会了看颜色的对比。这一关在街景里找红灯：红灯又亮又红，可街上还有暗处的红车、白色的路灯和绿灯。', en: 'Last level one kernel spanned three channels and learned to see colour contrast. This level looks for red lights in street scenes: a red light is bright and red, but the street also has red cars in the shade, white street lamps and green lights.' } },
    { t: { zh: '这一关你要做的：只标出红灯。要想的问题：「亮」和「红」，各要看哪几个通道？', en: 'Your task in this level: mark only the red lights. Something to think about: which channels does "bright" need, and which does "red"?' }, fig: { test: 0, caption: { zh: '第一组：路口', en: 'Set 1: a crossing' } } },
  ],
  '4-15': [
    {
      t: {
        zh: '网络越深（层越多），能表达的东西越复杂，今天认图的网络动辄几十上百层。可早年人们发现，层数一多，有时反而训不出来。',
        en: 'The deeper a network (the more layers it has), the more complex the things it can express; today\'s image-recognition networks often have dozens or even hundreds of layers. But early on, people found that with many layers, sometimes training failed altogether.',
      },
    },
    { t: { zh: '这一关的任务是轻微锐化：输出 = 原图 + 0.25 ×（原图 − 3×3 平均）。不同的是这次不手搭，而是把至少 6 个卷积层串成一条路，让训练自己找到它。每个卷积层都从很小的随机数开始。', en: 'This level\'s task is a light sharpen: output = image + 0.25 × (image − 3×3 average). The difference is that you do not build it by hand; you chain at least 6 conv layers into one path and let training find it. Every conv layer starts from very small random numbers.' } },
    {
      t: {
        zh: '这一关你要做的：让 6 层以上的网络训练成功。先照最直接的样子搭一次，按训练，看损失曲线怎么走，再想为什么。',
        en: 'Your task: get a network of 6 or more layers to train successfully. First build it the most straightforward way, press Train, watch how the loss curve goes, then think about why.',
      },
      fig: { test: 0, caption: { zh: '第一组测试：字母 X → 轻微锐化', en: 'Set 1: the letter X → slightly sharpened' } },
    },
  ],
  '4-16': [
    { t: { zh: '这是一道挑战关，可以跳过。它不需要新元件。', en: 'This is a challenge level, and you can skip it. It needs no new parts.' } },
    { t: { zh: '手机上的网络要省电。这一关要两张输出，都由三个通道各自做过 3×3 平均之后混出来。两个多通道核要花 58 的计算量，这一关只给 30。', en: 'Networks on phones must save power. This level wants two outputs, both mixed from the three channels after each has had a 3×3 average. Two multichannel kernels cost 58, and this level allows only 30.' }, fig: { test: 0, caption: { zh: '第一组：红绿对半', en: 'Set 1: half red, half green' } } },
  ],
  '4-17': [
    {
      t: {
        zh: '考试前把往年题连答案一起背下来，旧题全对，新题照样不会。模型也会这样：它在训练样本上越来越准，不等于它在新样本上也准。',
        en: 'Memorise past exam papers with their answers before a test and you get every old question right, but still cannot do the new ones. Models do this too: getting more and more accurate on the training samples does not mean being accurate on new samples.',
      },
    },
    {
      t: {
        zh: '所以要留一些模型从没见过的样本，专门拿来检查。台上的实心点是训练样本，空心点是新样本；样本都带一点随机的偏差（噪声），真实规律是一条平滑的曲线。',
        en: 'So you keep back some samples the model has never seen, just for checking. On the bench the filled dots are training samples and the hollow dots are new samples. Every sample carries a little random deviation (noise); the true pattern is a smooth curve.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：决定训练到哪一步该停，再试另一种管住模型的办法。要想的问题：训练误差越来越小时，模型在新样本上是不是也越来越好？',
        en: 'Your task: decide at which step training should stop, then try another way of keeping the model in check. Something to think about: as the training error keeps shrinking, does the model keep getting better on new samples too?',
      },
    },
  ],
  '4-18': [
    { t: { zh: '这一章最后三关，要搭一台零件分拣机：传送带上有 X、O、+ 三种零件，相机拍一张，机器说是哪一种。上一关看到，模型要在新样本上也准才算数。', en: 'The last three levels of this chapter build a parts sorter: X, O and + parts ride the belt, the camera takes a picture and the machine says which kind it is. The last level showed that a model only counts if it is right on new samples too.' } },
    { t: { zh: '三选一时，网络先给每一类打一个分。可分数可正可负，加起来也不是 1，不能直接当成「有多大把握」。', en: 'Choosing one of three, the network first gives each class a score. But scores can be positive or negative and do not add up to 1, so they cannot be read as "how sure" directly.' } },
    { t: { zh: '这一关你要做的：把三个分变成三个概率，规则在说明里。要想的问题：负的分该怎么办？', en: 'Your task in this level: turn the three scores into three probabilities, by the rule in the brief. Something to think about: what should happen to a negative score?' }, fig: { test: 0, caption: { zh: '第一组：分数 (2, 0, −1)', en: 'Set 1: scores (2, 0, −1)' } } },
  ],
  '4-19': [
    { t: { zh: '分拣机正式上线：零件的位置、深浅都不一样，有的带噪点。最后几组是「新零件」，不参加训练，只用来检查。', en: 'The sorter goes live: parts sit in different places, at different strengths, some with noise. The last few sets are "new parts" that take no part in training and are only checked.' }, fig: { test: 0, caption: { zh: '第一组：一个 X', en: 'Set 1: an X' } } },
    { t: { zh: '这一关你要做的：输出三个概率，正确那一类大于 0.55，另两类小于 0.45。要想的问题：三类零件靠哪些笔画区分？网络要看出几种笔画？', en: 'Your task in this level: output three probabilities, above 0.55 for the right class and below 0.45 for the other two. Something to think about: which strokes tell the three kinds apart? How many kinds of stroke must the network see?' } },
  ],
}
