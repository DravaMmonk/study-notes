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
        zh: '新原件<part-ref to="part:argmin4"></part-ref>接四张图，逐格看哪一张最小，输出它的编号 0–3。',
        en: 'The new primitive <part-ref to="part:argmin4"></part-ref> takes four pictures and, cell by cell, outputs the number 0–3 of the one that is smallest.',
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
        zh: '<level-ref to="7-1"></level-ref>搭的匹配，现在打包成了元件<part-ref to="disparity"></part-ref>。它只有一个参数：窗口，也就是比较时围着每格取多大一块，两张图按整块来比。',
        en: 'The matching you built in <level-ref to="7-1"></level-ref> is now packed into the <part-ref to="disparity"></part-ref> part. It has a single parameter: the window, which is how big a patch to take around each pixel when comparing; the two images are compared patch by patch.',
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
        zh: '知道了视差，还要换成米。距离、视差、镜头焦距 f、两台相机的间距 b（叫基线）之间有一个固定的关系，它和小孔成像是同一个道理。',
        en: 'Once you know the disparity, you still need to turn it into metres. Distance, disparity, the lens focal length f and the spacing b between the two cameras (called the baseline) are tied by a fixed relationship, and it follows from the same idea as the pinhole camera.',
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
        zh: '这一关你要做的：把视差图换成距离图，公式在说明里。',
        en: 'Your task in this level: turn the disparity map into a distance map; the formula is in the brief.',
      },
      fig: { test: 0, view: 'terrain', caption: { zh: '第一组：一个箱子', en: 'Set 1: a box' } },
    },
  ],
  '7-4': [
    {
      t: {
        zh: '换一台双目相机，镜头和两台相机的间距都变了。',
        en: 'Switch to a different stereo camera: both the lens and the distance between the two cameras change.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：每组测试给出焦距 f 和基线 b，把视差图换成距离图。',
        en: 'Your task in this level: each test gives the focal length f and the baseline b; turn the disparity map into a distance map.',
      },
      fig: { test: 0, view: 'terrain', caption: { zh: '第一组：长焦', en: 'Set 1: a longer lens' } },
    },
  ],
  '7-5': [
    {
      t: {
        zh: '接下来几关，一个点、一条线都写成三个数，放在一行里：点 (x, y) 写成 (x, y, 1)，线 ax + by + c = 0 写成 (a, b, c)。这叫齐次坐标。',
        en: 'In the next few levels a point and a line are both written as three numbers in a row: the point (x, y) as (x, y, 1), and the line ax + by + c = 0 as (a, b, c). These are called homogeneous coordinates.',
      },
    },
    {
      t: {
        zh: '叉积把两组三个数变成新的三个数，和原来两个都垂直。',
        en: 'The cross product turns two sets of three numbers into a new three, perpendicular to both.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：按说明里的公式算出 a × b。',
        en: 'Your task in this level: work out a × b by the formula in the brief.',
      },
      fig: { test: 1, caption: { zh: '第二组：两个点', en: 'Set 2: two points' } },
    },
  ],
  '7-6': [
    {
      t: {
        zh: '托盘里的<part-ref to="own-7-5"></part-ref>输出两个三维向量的叉积 a × b。',
        en: 'The <part-ref to="own-7-5"></part-ref> in the tray outputs the cross product a × b of two 3-vectors.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：每条线给出它上面的两个点，输出两条线的交点。',
        en: 'Your task in this level: each line is given by two points on it; output where the two lines meet.',
      },
      fig: { test: 0, caption: { zh: '第一组：十字', en: 'Set 1: a cross' } },
    },
  ],
  '7-7': [
    {
      t: {
        zh: '到这里为止，两台相机都摆得很正，同一点总在同一行，只要左右找。真实的相机很难摆得这么正，稍微一转，同一点就跑到了别的行。',
        en: 'So far the two cameras have been set up perfectly straight, so the same point was always on the same row and you only had to search left and right. Real cameras are hard to align that well; turn one slightly and the same point moves to a different row.',
      },
    },
    {
      t: {
        zh: '好在两台相机的相对位置可以事先标定，记成一个 3×3 的矩阵 F，叫基础矩阵。有了它，左图的一个点在右图里不是哪里都可能出现。',
        en: 'Fortunately the relative position of the two cameras can be calibrated in advance and recorded as a 3×3 matrix F, the fundamental matrix. With it, a point in the left image cannot turn up just anywhere in the right one.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：算出左图一个点在右图对应的那条线 F·p，F 按列给出。',
        en: 'Your task in this level: work out the line F·p in the right image that corresponds to a point in the left image; F is given column by column.',
      },
      fig: { test: 0, caption: { zh: '第一组：点 (2, 3)', en: 'Set 1: point (2, 3)' } },
    },
  ],
  '7-8': [
    {
      t: {
        zh: '托盘里的<part-ref to="own-7-7"></part-ref>读 F 的三列和点 (x, y)，输出极线 F·p。',
        en: 'The <part-ref to="own-7-7"></part-ref> in the tray reads the three columns of F and a point (x, y), and outputs the epipolar line F·p.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：判断右图的点 q 能不能和左图的点 p 对应。',
        en: 'Your task in this level: decide whether the right point q can correspond to the left point p.',
      },
      fig: { test: 0, caption: { zh: '第一组：在线上', en: 'Set 1: on the line' } },
    },
  ],
  '7-9': [
    {
      t: {
        zh: '左图里不同的点，在右图里有不同的极线。把它们都画出来，会发现一件事：它们都交于同一点。',
        en: 'Different points in the left image have different epipolar lines in the right image. Draw them all and you notice something: they all pass through one point.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：只用 F 算出这一点，写成 (x, y, 1)。',
        en: 'Your task in this level: work this point out from F alone, written as (x, y, 1).',
      },
    },
  ],
  '7-10': [
    {
      t: {
        zh: '扫地机器人装了一对双目相机，要在撞上之前停下来。先要知道前面每个地方有多远。',
        en: 'A robot vacuum has a pair of stereo cameras and must stop before it bumps into things. First it needs to know how far away everything in front is.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：输出地面以上每个像素的距离。',
        en: 'Your task in this level: output the distance of every pixel above the floor.',
      },
      fig: { test: 0, view: 'terrain', caption: { zh: '第一组：一个箱子', en: 'Set 1: a box' } },
    },
  ],
  '7-11': [
    {
      t: {
        zh: '地板没有纹理，算出来的距离在那几行乱跳。机器人只关心地面以上、离得很近的东西。',
        en: 'The floor has no texture, so the distances worked out on those rows jump about. The robot only cares about things above the floor that are very close.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：标出地面以上、近到要停下的像素。',
        en: 'Your task in this level: mark the pixels above the floor that are close enough to stop for.',
      },
      fig: { test: 0, view: 'terrain', caption: { zh: '第一组：一个箱子', en: 'Set 1: a box' } },
    },
  ],
  '7-12': [
    {
      t: {
        zh: '把前面几关接起来：从两台相机的画面，一路算到要停下的区域。',
        en: 'Join the last few levels up: from the two cameras\' pictures all the way to the region to stop for.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：标出要停下的区域。',
        en: 'Your task in this level: mark the region to stop for.',
      },
      fig: { test: 0, caption: { zh: '第一组：一个箱子', en: 'Set 1: a box' } },
    },
  ],
}
