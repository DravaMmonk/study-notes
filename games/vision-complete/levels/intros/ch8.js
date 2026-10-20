// 第 8 章各关的引入。格式见 ./index.js。
export default {
  '8-1': [
    {
      t: {
        zh: '这一章要让机器画出没见过的图。第一步是学会用很少的数描述一张图。一张 16×16 的图有 256 个数；如果这些图都只是同一个斑点换了位置，真的要 256 个数吗？',
        en: 'This chapter teaches a machine to draw images it has never seen. The first step is learning to describe an image with very few numbers. A 16×16 image has 256 numbers; if all the images are just the same blob in different places, do you really need 256?',
      },
    },
    {
      t: {
        zh: '新元件「编码器」把整张图压成一行几个数，「解码器」再由这几个数画回一张图。中间这几个数就像寄信只写地址，不用附上整栋房子的照片。',
        en: 'The new "Encoder" part squeezes the whole image into a short row of numbers, and the "Decoder" draws an image back from those numbers. The few numbers in the middle are like writing just the address on a letter, with no need to enclose a photo of the whole house.',
      },
    },
    {
      t: {
        zh: '两个元件的权重都靠训练：按下训练，机器自己一点点调。编码器可以选压成 1、2 或 3 个数。压缩、去噪都从这一步开始。',
        en: 'Both parts get their weights from training: press Train and the machine adjusts them bit by bit on its own. You can choose whether the encoder squeezes to 1, 2 or 3 numbers. Compression and denoising both start from this step.',
      },
    },
    {
      t: {
        zh: '测试是十六个位置不同的斑点，期望输出和输入一模一样。用的数越少越好，所以要找的是：最少几个数还够用？',
        en: 'The tests are sixteen blobs in different positions, and the expected output is identical to the input. The fewer numbers you use the better, so what you are looking for is: what is the smallest number that still works?',
      },
      fig: { test: 0, caption: { zh: '斑点进去，同一个斑点出来', en: 'A blob goes in, the same blob comes out' } },
    },
  ],
  '8-2': [
    {
      t: {
        zh: '上一关训练好的一对编码器、解码器，现在是现成的元件：编码器把一个斑点变成两个数，解码器把两个数画成斑点。',
        en: 'The encoder and decoder you trained last level are now ready-made parts: the encoder turns a blob into two numbers, and the decoder draws two numbers as a blob.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：画出从斑点 a 往斑点 b 走了 t 的那个斑点。',
        en: 'Your task in this level: draw the blob that is t of the way from blob a to blob b.',
      },
      fig: { test: 0, caption: { zh: '第一组：一半', en: 'Set 1: halfway' } },
    },
  ],
  '8-3': [
    {
      t: {
        zh: '拍出来的照片总带着噪点。一张图压成两个数，再画回来，噪点会怎样？',
        en: 'Photos always come with grain. Squeeze a picture into two numbers and draw it back: what happens to the grain?',
      },
    },
    {
      t: {
        zh: '这一关你要做的：输入的斑点带着噪声，输出干净的斑点。',
        en: 'Your task in this level: the blobs come in noisy; output clean blobs.',
      },
      fig: { test: 0, caption: { zh: '第一组', en: 'Set 1' } },
    },
  ],
  '8-4': [
    {
      t: {
        zh: '上一关的解码器能把两个数画成斑点。要是这两个数随机抽，就能画出没见过的斑点，这就是生成。随机不是乱来：数从正态分布里抽，大多落在中心 μ 附近，σ 越大越散。',
        en: 'The decoder from the last level can turn two numbers into a blob. If those two numbers are drawn at random, it can draw blobs it has never seen: that is generation. Random does not mean anything goes: the numbers are drawn from a normal distribution, so most land near the centre μ, and the larger σ is, the more they spread out.',
      },
    },
    {
      t: {
        zh: '训练就是把参数拧一点，看结果变好还是变坏，再往好的方向调；能算出该往哪拧，叫求导。可 μ、σ 和画出的图之间夹着一步随机抽样，这种调法还行得通吗？',
        en: 'Training means nudging the parameters a little, seeing whether the result gets better or worse, and adjusting in the better direction; working out which way to nudge is called differentiating. But there is a random sampling step between μ, σ and the image that gets drawn. Can this kind of adjustment still work?',
      },
    },
    {
      t: {
        zh: '这一关的元件：μ、σ 各是两个可训练的数；「采样」每算一次都抽一个新的随机数；「解码器（已训练）」把两个数画成斑点，一个管左右，一个管上下。',
        en: 'The parts in this level: μ and σ are each two trainable numbers; "Sample" draws a fresh random number every time it runs; "Decoder (trained)" turns two numbers into a blob, one controlling left-right and the other up-down.',
      },
    },
    {
      t: {
        zh: '老师画每张图用的随机数 ε，测试都给了你。你要学出老师的 μ 和 σ，用同样的 ε 画出同样的斑点。Stable Diffusion 里压缩、还原图的部分，训练时也要过这一关。',
        en: 'The tests give you the random numbers ε the teacher used to draw each image. You must learn the teacher\'s μ and σ so that the same ε draws the same blob. The part of Stable Diffusion that compresses and restores images has to clear this same hurdle in training.',
      },
      fig: { test: 0, caption: { zh: '一组噪声 ε → 老师用它画出的斑点', en: 'A set of noise ε → the blob the teacher drew with it' } },
    },
  ],
  '8-5': [
    {
      t: {
        zh: '上一关的「重参数化」现在是现成的元件：μ、σ、ε 进去，出来 μ + σ·ε。',
        en: 'Last level\'s "Reparameterization" is now a ready-made part: μ, σ and ε go in, μ + σ·ε comes out.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：用输入的 μ、σ 和噪声 ε 抽一个 z，画出它的斑点。',
        en: 'Your task in this level: draw a z from the μ, σ and noise ε in the input, and draw its blob.',
      },
      fig: { test: 0, caption: { zh: '第一次抽', en: 'The first draw' } },
    },
  ],
  '8-6': [
    {
      t: {
        zh: '另一种生成办法是让两个模型对练：生成器画假样本，鉴定员判断真假。鉴定员越会认，生成器就得画得越像。这叫生成对抗网络（GAN），网上那些「不存在的人脸」就是这样画的。',
        en: 'Another way to generate is to have two models spar: a generator draws fake samples and a judge decides which are real. The better the judge gets at telling, the more convincing the generator has to be. This is called a generative adversarial network (GAN), and the "faces of people who don\'t exist" you see online are drawn this way.',
      },
    },
    {
      t: {
        zh: '台上的真实数据是两堆点。生成器有两支笔，每支在一处落笔。鉴定员是一条曲线 D(x)：越高的地方，它越相信那里的点是真的。',
        en: 'The real data on the bench is two clusters of points. The generator has two pens, each drawing in one spot. The judge is a curve D(x): the higher it is, the more the judge believes a point there is real.',
      },
    },
    {
      t: {
        zh: '两边轮流训练。你能定每回合鉴定员练几步、生成器练几步，以及生成器每步走多远。',
        en: 'The two sides train in turns. You decide how many steps the judge trains each round, how many the generator trains, and how far the generator moves with each step.',
      },
    },
    {
      t: {
        zh: '这一关要让两堆都画到，鉴定员只能瞎猜，准确率回到一半。动手前想想：两边谁练得多、谁走得快，会带来什么不同？',
        en: 'In this level both clusters must be drawn, leaving the judge only able to guess, with its accuracy back at one half. Before you start, think: what difference does it make which side trains more, and which moves faster?',
      },
    },
  ],
  '8-7': [
    {
      t: {
        zh: '现在最好的图像生成模型叫扩散模型。它的训练从反方向开始：先把一张图一点点加噪，直到只剩噪声。',
        en: 'The best image generators today are called diffusion models. Their training starts the other way round: noise is added to a picture little by little until only noise is left.',
      },
    },
    {
      t: {
        zh: '加到哪一步，用一个数 ᾱ 表示图还剩多少：1 是原图，0 是纯噪声。',
        en: 'How far it has gone is given by one number, ᾱ, how much of the picture is left: 1 is the original, 0 is pure noise.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：按说明里的公式，一步算出加到第 t 步的图。',
        en: 'Your task in this level: by the formula in the brief, work out in one step the picture after noise is added up to step t.',
      },
      fig: { test: 1, caption: { zh: '第二组：一半', en: 'Set 2: half and half' } },
    },
  ],
  '8-8': [
    {
      t: {
        zh: '上一关搭的「加噪」现在是现成的元件。',
        en: 'The "Add noise" you built last level is now a ready-made part.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：加两次噪，输出加完两次的图。',
        en: 'Your task in this level: add noise twice and output the picture after both.',
      },
      fig: { test: 0, caption: { zh: '第一组：两小步', en: 'Set 1: two small steps' } },
    },
  ],
  '8-9': [
    {
      t: {
        zh: '生成器画出来的东西是随机的。要让它按要求画，得多告诉它一点什么。',
        en: 'What a generator draws is random. To make it draw what is asked for, it has to be told something more.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：c = 0 时在左边那一带画斑点，c = 1 时在右边。',
        en: 'Your task in this level: when c = 0, draw the blob in the region on the left; when c = 1, on the right.',
      },
      fig: { test: 0, caption: { zh: '第一组：左边', en: 'Set 1: left' } },
    },
  ],
  '8-10': [
    {
      t: {
        zh: '加噪是往前走。生成一张图要往回走：从噪声里把图找回来。',
        en: 'Adding noise goes forwards. Generating a picture goes backwards: finding the picture again in the noise.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：知道当初加的是哪份噪声，把原图还原出来。',
        en: 'Your task in this level: knowing which noise was added, get the original picture back.',
      },
      fig: { test: 1, caption: { zh: '第二组：一半', en: 'Set 2: half and half' } },
    },
  ],
  '8-11': [
    {
      t: {
        zh: '上一关搭的「还原」现在是现成的元件。可真要用的时候，没人告诉你噪声是什么。',
        en: 'The "Restore" you built last level is now a ready-made part. But when it is actually needed, nobody tells you what the noise was.',
      },
    },
    {
      t: {
        zh: '「可学习 3×3 核」可以训练：按训练，它自己调权重。',
        en: 'The "Learnable 3×3 kernel" can be trained: press Train and it adjusts its own weights.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：修好一张满是噪点的旧照片，再标出字的笔画。',
        en: 'Your task in this level: mend an old photo full of grain, then mark the strokes of the letter.',
      },
      fig: { test: 0, caption: { zh: '第一组：字母 T', en: 'Set 1: letter T' } },
    },
  ],
}
