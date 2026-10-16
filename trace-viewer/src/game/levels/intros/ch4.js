// 第 4 章各关的引入。格式见 ./index.js。
export default {
  '4-1': [
    {
      t: {
        zh: '前几章，元件的参数都是你亲手定的：模糊多少、阈值多高。可手机相册认人脸、语音输入听写，背后的模型有成千上万个数，没人能一个个拧。机器得自己调。',
        en: 'In earlier chapters you set every part\'s parameters by hand: how much blur, how high a threshold. But the models behind face recognition in your photo app or voice typing have thousands upon thousands of numbers, and nobody can turn them one by one. The machine has to tune itself.',
      },
    },
    {
      t: {
        zh: '要自己调，先得知道「现在调得有多差」。这个分数叫<b>误差</b>：模型的输出离样本的正确答案有多远，平方后取平均。误差越小越好。',
        en: 'To tune itself, it first needs to know how badly tuned it is right now. That score is the <b>error</b>: how far the model\'s outputs are from the samples\' correct answers, squared and averaged. The smaller the error, the better.',
      },
    },
    {
      t: {
        zh: '麻烦在于，机器看不到所有旋钮位置的误差，只能像蒙着眼睛下山的人，摸一摸脚下的坡。台上的小球就是模型此刻的位置。',
        en: 'The catch is that the machine cannot see the error at every knob setting. Like someone walking downhill blindfolded, it can only feel the slope under its feet. The ball on the bench is where the model is right now.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：先自己转旋钮找最低点，再看机器怎样一步步走，最后旋钮变成两个。要想的问题：每一步该迈多大？迈得太小、太大，各会怎样？',
        en: 'Your task: first turn the knob yourself to find the lowest point, then watch how the machine walks there step by step, and finally there are two knobs. Something to think about: how big should each step be? What happens if the steps are too small, or too big?',
      },
    },
  ],
  '4-2': [
    {
      t: {
        zh: '1-6「猜核」里，你看着输入和输出，一格格拧出了一个 3×3 核。那个核的数字很整齐，猜得出来。要是九个数乱七八糟、毫无规律呢？',
        en: 'In 1-6, "Guess the kernel", you looked at the input and output and worked out a 3×3 kernel cell by cell. Its numbers were tidy enough to guess. What if the nine numbers are a jumble with no pattern at all?',
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
  '4-3': [
    {
      t: {
        zh: '「神经网络」的名字来自大脑：神经细胞收到许多信号，合起来够强就兴奋。计算机里的神经元是它的简化版，一个只做一件小事的计算单元。',
        en: 'The name "neural network" comes from the brain: a nerve cell receives many signals and fires when together they are strong enough. A neuron in a computer is a simplified version, a computing unit that does just one small thing.',
      },
    },
    {
      t: {
        zh: '上一关的核是「乘权重、再相加」。神经元也是这样，只多一步：把结果压成 0 到 1 之间的分数，可以读成「有多大把握」。',
        en: 'The kernel in the last level was "multiply by weights, then add up". A neuron does the same, with one extra step: it squashes the result into a score between 0 and 1, which you can read as "how sure it is".',
      },
    },
    {
      t: {
        zh: '台上每张字母图被缩成两个数：斜笔画有多少、弯笔画有多少。于是一张图就是平面上的一个点，神经元要给每个点打分。',
        en: 'On the bench each letter image is boiled down to two numbers: how many diagonal strokes and how many curved strokes it has. So each image is a point on a plane, and the neuron has to give every point a score.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：亲手调权重和偏置，让 X 和 O 的分数落到两边。要想的问题：只靠这三个数，它能分开哪些点，又分不开哪些？',
        en: 'Your task: tune the weights and the bias by hand so the scores for X and O land on opposite sides. Something to think about: with only these three numbers, which points can it separate, and which can it not?',
      },
    },
  ],
  '4-4': [
    {
      t: {
        zh: '1-4 里你用差分找过台阶：暗→亮是正，亮→暗是负，符号还能告诉你边朝哪边。可很多时候只关心「这里有没有边」，不在乎方向。',
        en: 'In 1-4 you used a difference to find steps: dark→bright is positive, bright→dark is negative, and the sign even tells you which way the edge faces. But often all you care about is whether there is an edge here, not its direction.',
      },
    },
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
        zh: '新元件 ReLU：负数变成 0，正数原样通过。它的样子很简单，却是神经网络里用得最多的元件之一。',
        en: 'The new part is ReLU: negative numbers become 0, positive numbers pass through unchanged. It is very simple, yet it is one of the most used parts in neural networks.',
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
  '4-5': [
    {
      t: {
        zh: '到现在为止，元件的输出都和输入一样大。真正的卷积网络里，图往往一层层变小：一张照片几百万个像素，缩小之后，后面的层才算得动。',
        en: 'So far every part\'s output has been the same size as its input. In a real convolutional network the image usually shrinks layer by layer: a photo has millions of pixels, and only after shrinking it can the later layers keep up with the computation.',
      },
    },
    {
      t: {
        zh: '卷积层的「窗口」就是你熟悉的 3×3 核：停在图上一处，算出一个数，再挪到下一处。新问题是：它能停几处、每次挪多远、能不能伸到图外？',
        en: 'A convolution layer\'s "window" is the 3×3 kernel you already know: it stops at one place on the image, computes a number, then moves to the next. The new questions: how many places can it stop at, how far does it move each time, and can it reach past the edge of the image?',
      },
    },
    {
      t: {
        zh: '另一个要数的是参数：一层里有多少个要学的数。它决定训练要调多少个旋钮，也决定模型占多少内存。要想：图变大时，这个数会不会跟着变大？',
        en: 'The other thing to count is parameters: how many numbers a layer has to learn. That decides how many knobs training has to tune, and how much memory the model takes. Think about it: when the image gets bigger, does this number grow too?',
      },
    },
    {
      t: {
        zh: '这一关你要做的：让一层的输出变成要求的大小，再数清这一层有多少个要学的数。点输出的任意一格，能看到它来自输入的哪一块。',
        en: 'Your task: make a layer\'s output the required size, then count exactly how many numbers that layer has to learn. Click any cell of the output to see which patch of the input it comes from.',
      },
    },
  ],
  '4-6': [
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
    {
      t: {
        zh: '有时特征点会整体偏一格。这一关的要求是：偏了一格，缩小后的结果也要和原位时完全一样。元件栏里有几种缩小的办法，看看哪种经得起这一格。',
        en: 'Sometimes the feature points all shift by one pixel. This level requires that after a one-pixel shift, the shrunk result is exactly the same as in the original place. The parts bar has several ways to shrink an image; see which one survives that one pixel.',
      },
      fig: { test: 1, caption: { zh: '另一组：整体偏到右下，期望不变', en: 'Another set: everything shifted down and to the right, same expected output' } },
    },
  ],
  '4-7': [
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
  '4-8': [
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
  '4-9': [
    {
      t: {
        zh: '手写数字识别、拍照认花、相册按人脸分组，问的都是「这是什么」。这类问题叫分类，是视觉里最常见的任务。这一关做最小的一个：只有两类，X 或 O。',
        en: 'Reading handwritten digits, identifying a flower from a photo, grouping an album by face: they all ask "what is this?". This kind of problem is called classification, the most common task in vision. This level does the smallest one: just two classes, X or O.',
      },
    },
    {
      t: {
        zh: '4-3 的神经元拿到的是现成的两个数：斜笔画多少、弯笔画多少。这一关没人替你算，网络只拿到像素，字母还会挪位置、变深浅、带噪点。',
        en: 'The neuron in 4-3 was handed two ready-made numbers: how many diagonal strokes, how many curved strokes. This time nobody computes them for you. The network gets only pixels, and the letters move around, get lighter or darker, and carry noise.',
      },
      fig: { test: 2, caption: { zh: '一组测试：挪了位置、带噪点的 O', en: 'One test set: an O that has moved and has noise' } },
    },
    {
      t: {
        zh: '几个新元件：全局平均把整张图变成一个数；Sigmoid 把任何数压到 0 到 1；卷积层是从很小的随机数开始的可学习 3×3 核；全连接乘一个权重、加一个偏置，也可以学。',
        en: 'A few new parts: "Global average" turns the whole image into one number; Sigmoid squashes any number into 0 to 1; "Conv layer" is a learnable 3×3 kernel that starts from tiny random numbers; "Dense" multiplies by a weight and adds a bias, both of which can also be learned.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：输出一个数，X 大于 0.6，O 小于 0.4。要想的问题：X 和 O 到底差在哪里，什么信息该留下？',
        en: 'Your task: output one number, above 0.6 for X and below 0.4 for O. Something to think about: what really is the difference between X and O, and which information should be kept?',
      },
      fig: { test: 1, caption: { zh: '一组 X：期望 1', en: 'A set with X: expected 1' } },
    },
  ],
  '4-10': [
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
  '4-11': [
    {
      t: {
        zh: '网络越深（层越多），能表达的东西越复杂，今天认图的网络动辄几十上百层。可早年人们发现，层数一多，有时反而训不出来。',
        en: 'The deeper a network (the more layers it has), the more complex the things it can express; today\'s image-recognition networks often have dozens or even hundreds of layers. But early on, people found that with many layers, sometimes training failed altogether.',
      },
    },
    {
      t: {
        zh: '这一关的任务你在 1-9 见过：轻微锐化。不同的是这次不手搭，而是把至少 6 个卷积层串成一条路，让训练自己找到它。每个卷积层都从很小的随机数开始。',
        en: 'You saw this level\'s task in 1-9: a slight sharpen. The difference is that this time you do not build it by hand; you chain at least 6 conv layers into one path and let training find it. Every conv layer starts from tiny random numbers.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：让 6 层以上的网络训练成功。先照最直接的样子搭一次，按训练，看损失曲线怎么走，再想为什么。',
        en: 'Your task: get a network of 6 or more layers to train successfully. First build it the most straightforward way, press Train, watch how the loss curve goes, then think about why.',
      },
      fig: { test: 0, caption: { zh: '第一组测试：字母 X → 轻微锐化', en: 'Set 1: the letter X → slightly sharpened' } },
    },
  ],
}
