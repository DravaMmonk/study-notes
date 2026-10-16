// 第 7 章各关的引入。格式见 ./index.js。
export default {
  '7-1': [
    {
      t: {
        zh: '伸出一根手指放在眼前，轮流闭上左眼和右眼：手指和远处的墙，哪个跳得更厉害？同一样东西在两只眼里错开的距离，叫<b>视差</b>。',
        en: 'Hold a finger up in front of your eyes and close your left and right eye in turn: which jumps more, your finger or the far wall? The distance by which the same thing is offset between your two eyes is called <b>disparity</b>.',
      },
    },
    {
      t: {
        zh: '机器人和汽车上的双目相机也靠视差判断远近。这一关的两张图都是随机噪点，单看哪张都没有形状；心理学家 Julesz 在 1960 年用这种图证明，人不认出任何物体也能看出立体。',
        en: 'The stereo cameras on robots and cars also use disparity to judge distance. Both images in this level are random dots, and neither shows any shape on its own; in 1960 the psychologist Julesz used images like these to show that people can see depth without recognising any object.',
      },
    },
    {
      t: {
        zh: '新给的两个元件：「平方」把每格的数平方；「取最小者编号」接四张图，逐格看哪一张最小，输出它的编号 0–3。',
        en: 'Two new parts: "Square" squares every pixel; "Index of minimum" takes four images, checks pixel by pixel which one is smallest, and outputs its index, 0–3.',
      },
    },
    {
      t: {
        zh: '输出是一张视差图：每格填 0 到 3，表示那里的东西在两张图之间错开了几格，少数格子出错可以接受。要想的是：怎样判断右图的某一格和左图的这一格是同一处？',
        en: 'The output is a disparity map: each pixel holds 0 to 3, the number of pixels by which the thing there is offset between the two images. A few wrong pixels are fine. The question is: how can you tell that a pixel in the right image is the same spot as this pixel in the left image?',
      },
      fig: { test: 0, caption: { zh: '左图、右图 → 每格的视差', en: 'Left image, right image → disparity at each pixel' } },
    },
  ],
  '7-2': [
    {
      t: {
        zh: '上一关搭的匹配，现在打包成了元件「视差搜索」。它只有一个参数：窗口，也就是比较时围着每格取多大一块，两张图按整块来比。',
        en: 'The matching you built in the last level is now packed into the "Disparity search" part. It has a single parameter: the window, which is how big a patch to take around each pixel when comparing; the two images are compared patch by patch.',
      },
    },
    {
      t: {
        zh: '真实的立体相机也要挑这个大小。街景里有大片的墙，也有细细的电线杆和栏杆；光线暗时，照片上满是噪点。同一台相机，要对付所有这些。',
        en: 'Real stereo cameras have to pick this size too. A street scene has large stretches of wall, but also thin power poles and railings; in dim light the photos are full of noise. The same camera has to cope with all of it.',
      },
    },
    {
      t: {
        zh: '三组测试：有噪声的方块、一根细柱、一个更近的噪声方块。同一个窗口要三组都算对：和真实视差差不超过 1，错的格子不多。',
        en: 'Three test sets: a noisy square, a thin pillar, and a closer noisy square. A single window must get all three right: within 1 of the true disparity, with only a few wrong pixels.',
      },
      fig: { test: 1, caption: { zh: '细柱：视差图里也只是一根细柱', en: 'The thin pillar: in the disparity map it is still just a thin pillar' } },
    },
    {
      t: {
        zh: '这一关只给这一个元件，你要定的是窗口。动手前想一想：窗口变大，比较时多得到了什么，又丢掉了什么？',
        en: 'This level gives you only this one part; what you decide is the window. Before you start, think: when the window grows, what does the comparison gain, and what does it lose?',
      },
      fig: { test: 0, caption: { zh: '有噪声的方块', en: 'The noisy square' } },
    },
  ],
  '7-3': [
    {
      t: {
        zh: '知道了视差，还要换成米。距离、视差、镜头焦距 f、两台相机的间距 b（叫基线）之间有一个固定的关系，它和第 0 章的小孔成像是同一个道理。',
        en: 'Once you know the disparity, you still need to turn it into metres. Distance, disparity, the lens focal length f and the spacing b between the two cameras (called the baseline) are tied by a fixed relationship, and it follows from the same idea as the pinhole camera in Chapter 0.',
      },
    },
    {
      t: {
        zh: '机器人靠双目相机躲障碍。视差只能按像素算，差一个像素，报出的距离就差一截；视差太大，又会超出相机能搜索的范围，那就配不上了。',
        en: 'A robot uses stereo cameras to avoid obstacles. Disparity can only be measured in whole pixels, so being off by one pixel puts the reported distance off by a fair amount; and if the disparity is too large, it falls outside the range the camera can search, so no match is found.',
      },
    },
    {
      t: {
        zh: '台上是俯视图：一对相机，前面三个障碍物。你能选镜头 f 和基线 b。每个障碍物旁的竖条是视差差 1 像素时深度的范围，色块是要求的精度。',
        en: 'The bench shows a top-down view: a pair of cameras with three obstacles in front. You can choose the lens f and the baseline b. The bar beside each obstacle is the range of depths covered by a 1-pixel change in disparity, and the coloured block is the accuracy required.',
      },
    },
    {
      t: {
        zh: '这一关要选出 f 和 b，让三个障碍物都配得上，又测得够准。先想想：基线加宽，对近处和远处的障碍物各有什么影响？',
        en: 'In this level you choose f and b so that all three obstacles can be matched and measured accurately enough. Think first: what does widening the baseline do to near obstacles, and what does it do to far ones?',
      },
    },
  ],
  '7-4': [
    {
      t: {
        zh: '前几关的两台相机摆得很正，同一点总在同一行，只要左右找。真实的相机很难摆得这么正，稍微一转，同一点就跑到了别的行。',
        en: 'In the last few levels the two cameras were set up perfectly straight, so the same point was always on the same row and you only had to search left and right. Real cameras are hard to align that well; turn one slightly and the same point moves to a different row.',
      },
    },
    {
      t: {
        zh: '那就整张右图逐点比？一张照片有几十万个点，每个点都这样找，太慢了。这一关给每个点的比较次数设了上限。',
        en: 'So compare against every point in the whole right image? A photo has hundreds of thousands of points, and searching like that for each one is far too slow. This level caps the number of comparisons per point.',
      },
    },
    {
      t: {
        zh: '好在两台相机的相对位置可以事先标定，记成一个 3×3 的矩阵 F，叫基础矩阵，台上已经给出。台上还有几种找法，每种要花的比较次数不同。',
        en: 'Luckily, the relative position of the two cameras can be calibrated in advance and stored as a 3×3 matrix F, called the fundamental matrix; the bench already gives it to you. The bench also offers several ways to search, each costing a different number of comparisons.',
      },
    },
    {
      t: {
        zh: '这一关要在右图找到 3 个点。想一想：左图的一个点，到了右图可能出现在哪些地方？真的是哪里都有可能吗？',
        en: 'In this level you must find 3 points in the right image. Think: where in the right image could a point from the left image turn up? Could it really be anywhere?',
      },
    },
  ],
}
