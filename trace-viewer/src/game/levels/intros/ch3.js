// 第 3 章各关的引入。格式见 ./index.js。
export default {
  '3-1': [
    {
      t: {
        zh: '照片里每个像素只是一个亮度数。可这个数从哪来？同一面白墙，正对窗户和侧对窗户，拍出来就不一样亮。这一章先回到拍照的那一刻，看光怎样变成明暗。',
        en: 'Each pixel in a photo is just a brightness number. But where does that number come from? The same white wall looks brighter facing the window than turned away from it. This chapter goes back to the moment the photo is taken, to see how light turns into light and dark.',
      },
    },
    {
      t: {
        zh: '光从灯出发，落到表面上，再弹进相机。表面会弹回多少光，叫<b>反射率</b>：白漆接近 1，黑漆接近 0。手机修图里的「补光」、游戏里的光照，算的都是这一路。',
        en: 'Light leaves the lamp, lands on a surface and bounces into the camera. How much light a surface sends back is its <b>reflectance</b>: close to 1 for white paint, close to 0 for black. The "fill light" in a photo-editing app and the lighting in a video game both compute this path.',
      },
    },
    {
      t: {
        zh: '要想的问题：灯没变弱，也没被挡住，只是换了个角度照过来，表面为什么会变暗？反过来，照片里一块地方暗，你能说出是哪个原因吗？',
        en: 'Something to think about: the lamp is no weaker and nothing blocks it, it just shines from a different angle. Why does the surface get darker? And the other way round: when a patch of a photo is dark, can you tell which cause it was?',
      },
    },
    {
      t: {
        zh: '这一关你要做的：机关台上有一块瓷砖、一盏能绕着它转的灯，还有一张侧视图。用灯的角度、灯的强度、漆的反射率三个旋钮，弄清它们怎样一起决定亮度。',
        en: 'Your task: the bench has a tile, a lamp that swings around it, and a side view. Use three knobs — lamp angle, lamp strength and paint reflectance — to work out how they decide the brightness together.',
      },
    },
  ],
  '3-2': [
    {
      t: {
        zh: '上一关的亮度只是一个数。彩色照片每个像素有三个数：R、G、B，红、绿、蓝各有多少。可现实里的光不止三种，而是像彩虹那样一整条，从紫到红连成一片。',
        en: 'In the last level brightness was a single number. A colour photo has three numbers per pixel: R, G and B, how much red, green and blue. But real light comes in more than three kinds: it is a whole band like a rainbow, running continuously from violet to red.',
      },
    },
    {
      t: {
        zh: '这一整条叫<b>光谱</b>：每种波长的光各有多少。波长短的看起来偏紫，长的偏红。相机和人眼一样，只有三种感光元件，各自对一段波长敏感。',
        en: 'That whole band is the <b>spectrum</b>: how much light there is at each wavelength. Short wavelengths look violet, long ones look red. A camera, like the human eye, has only three kinds of light sensor, each sensitive to one stretch of wavelengths.',
      },
    },
    {
      t: {
        zh: '找红灯、分开天空和草地，都要用到颜色。要想的问题：一整条光谱只记成三个数，一定会丢掉一些东西。丢掉的是什么？什么时候会因此看走眼？',
        en: 'Spotting a red light or telling sky from grass both rely on colour. Something to think about: recording a whole spectrum as just three numbers must lose something. What is lost? When does that make you see things wrong?',
      },
    },
    {
      t: {
        zh: '这一关你要做的：机关台上每根推杆是一种波长的光有多少，下面三条曲线是三种感光元件的灵敏度，旁边是相机读到的三个数。用推杆调配光谱，对上目标颜色。',
        en: 'Your task: on the bench each slider is how much light there is at one wavelength. The three curves below are the sensitivities of the three sensors, and beside them are the three numbers the camera reads. Mix a spectrum with the sliders to match the target colour.',
      },
    },
  ],
  '3-3': [
    {
      t: {
        zh: '3-1 是从表面算亮度：知道灯、漆和朝向，就知道多亮。这一关反过来：只看到照片里有多亮，能不能推出表面朝哪个方向？',
        en: 'In 3-1 you went from surface to brightness: know the lamp, the paint and which way the surface faces, and you know how bright it is. This level goes the other way: seeing only how bright it is in the photo, can you work out which way the surface faces?',
      },
    },
    {
      t: {
        zh: '人看一张照片，单凭明暗就觉得鼻梁是凸的、眼窝是凹的。机器要是也能做到，一张照片就能变成立体模型。表面的朝向，可以想成从表面正中竖起的一根小杆，杆指向哪，表面就朝哪。',
        en: 'Looking at a photo, people judge from shading alone that the bridge of the nose sticks out and the eye sockets sink in. If a machine could do the same, one photo could become a 3D model. Think of a surface\'s orientation as a little stick standing up from its centre: wherever the stick points, the surface faces.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：机关台上的「朝向盘」是从正上方看所有朝向，中心脸朝天，越往外越歪。表面是白的，灯也已知。要回答的问题：照片里的这一个亮度，能确定唯一的朝向吗？',
        en: 'Your task: the "orientation disc" on the bench shows every orientation seen from directly above. The centre faces straight up, and the further out, the more it tilts. The surface is white and the lamp is known. The question to answer: does this one brightness in the photo pin down a single orientation?',
      },
    },
  ],
  '3-4': [
    {
      t: {
        zh: '前几关看的都是一块表面。真实照片里，表面本来的颜色和照到的光混在一起：白墙在阴影里是灰的，深色地砖在太阳底下也可能很亮。',
        en: 'The last few levels looked at a single surface. In a real photo, a surface\'s own colour and the light falling on it are mixed together: a white wall in shadow looks grey, and dark floor tiles in sunlight can look very bright.',
      },
    },
    {
      t: {
        zh: '后面找物体，靠的是照片里明暗突变的地方。阴影也会造出明暗突变。要想的问题：照片里一条明暗分界线，一定是物体的边吗？手机扫描文件时去掉纸上的阴影，碰到的就是这件事。',
        en: 'Finding objects later on relies on places where brightness jumps. Shadows make brightness jumps too. Something to think about: is a line between light and dark in a photo always the edge of an object? A phone app removing the shadow from a scanned page runs into exactly this.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：两个输入，一张照片和一张光照图（每一点照到多少光，1 是满光）。输出表面本来的颜色，阴影和明暗都要去掉。',
        en: 'Your task: two inputs, a photo and a lighting map (how much light reaches each point; 1 is full light). Output the surface\'s own colour, with the shadows and shading removed.',
      },
      fig: { test: 0, caption: { zh: '第一组测试：照片、光照 → 期望', en: 'Set 1: photo, lighting → expected' } },
    },
  ],
  '3-5': [
    {
      t: {
        zh: '前四关讲明暗从哪来，从这一关起开始找边。边就是明暗变化很快的地方。要找它，先得说清「这里变得有多快」，往哪个方向变。',
        en: 'The first four levels were about where light and dark come from. From this level on, you look for edges. An edge is where brightness changes quickly. To find one, you first need to say how fast it changes here, and in which direction.',
      },
    },
    {
      t: {
        zh: '坡度就是每走一格，亮度变多少。往右走和往下走，坡度可以不一样：一面斜坡可能往右越来越亮，往下越来越暗。两个坡度合起来，才说得清这一点陡不陡、朝哪边陡。',
        en: 'The slope is how much the brightness changes per pixel you move. Moving right and moving down can give different slopes: a ramp might get brighter to the right and darker going down. Only the two slopes together tell you how steep a point is and which way it is steep.',
      },
    },
    {
      t: {
        zh: '要想的问题：站在一座小山的山坡上，箭头会指向哪？站在一条边上，箭头和这条边是什么关系？先在心里猜一猜，再去量。',
        en: 'Something to think about: standing on the side of a small hill, where does the arrow point? Standing on an edge, how does the arrow relate to the edge? Make a guess first, then measure.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：机关台上有一张图和一个十字，下面是穿过十字的横、竖两条剖面，也就是把那一行、那一列的亮度画成曲线。用两个旋钮量出十字处往右和往下的坡度。',
        en: 'Your task: the bench has an image with a crosshair, and below it two cross-sections through the crosshair, horizontal and vertical — the brightness along that row and that column drawn as curves. Use the two knobs to measure the slope to the right and the slope downwards at the crosshair.',
      },
    },
  ],
  '3-6': [
    {
      t: {
        zh: '上一关你在一个点上量了坡度。真要找边，得在每个像素都量，再画成一张图：越陡越亮。这张图叫边缘强度图，后面找角点、找直线，几乎都从它开始。',
        en: 'In the last level you measured the slope at one point. To really find edges you measure it at every pixel and draw the result as an image: the steeper, the brighter. This is the edge strength map, and almost everything later, finding corners or finding lines, starts from it.',
      },
    },
    {
      t: {
        zh: '难处在方向。物体的边有横有竖有斜，只量一个方向的坡度会漏掉另一些边。一个好的边缘强度，不该因为边转了个方向就变弱。',
        en: 'The hard part is direction. Object edges can be horizontal, vertical or diagonal, and measuring the slope in only one direction misses some of them. A good edge strength should not get weaker just because the edge turns.',
      },
      fig: {
        part: 'sobelx',
        input: 'disk',
        caption: { zh: 'Sobel x 处理圆盘：左右两侧反应强，上下几乎没有', en: 'Sobel x on a disk: strong response on the left and right, almost none at the top and bottom' },
      },
    },
    {
      t: {
        zh: '这一关你要做的：输入一张图，输出每个像素的坡度有多大。测试里有方块、圆盘、字母 X 和一个角，边朝着各个方向。新元件「平方」把每个像素的数乘以它自己。',
        en: 'Your task: take an image and output how big the slope is at each pixel. The tests include a square, a disk, the letter X and a corner, with edges facing every direction. The new "Square" part multiplies each pixel\'s value by itself.',
      },
      fig: { test: 0, caption: { zh: '第一组测试：方块 → 期望', en: 'Set 1: square → expected' } },
    },
  ],
  '3-7': [
    {
      t: {
        zh: '上一关的边缘强度图离「边」还差一步：定一个门槛，坡度超过它的像素才算边。门槛太低，表面的细纹也算进来；太高，真正的边又会漏掉。',
        en: 'The edge strength map from the last level is one step short of edges: set a threshold, and only pixels whose slope exceeds it count as edges. Too low, and fine surface texture gets counted; too high, and real edges get missed.',
      },
      fig: {
        part: 'gradmag',
        input: 'glyph:F',
        caption: { zh: '梯度幅值处理字母 F：每条边都亮起来', en: 'Gradient magnitude on the letter F: every edge lights up' },
      },
    },
    {
      t: {
        zh: '麻烦在灯光。车上的摄像头中午和傍晚都要认出同一条路沿，不可能每换一次光就重调一次门槛。同一个场景换了灯，坡度会跟着变吗？',
        en: 'The trouble is lighting. A car\'s camera has to pick out the same kerb at noon and at dusk; it cannot retune the threshold every time the light changes. When the same scene gets different lighting, do the slopes change with it?',
      },
    },
    {
      t: {
        zh: '灯光变化大致有两种：每个像素都加上同一个数（整体加亮），或每个像素都乘上同一个数（灯变强或变暗）。要想的问题：把图像当成地形，这两种变化各自对坡度做了什么？',
        en: 'Lighting changes come in roughly two kinds: adding the same number to every pixel (brightening everything), or multiplying every pixel by the same number (the lamp getting stronger or weaker). Something to think about: treating the image as a landscape, what does each of these do to the slopes?',
      },
    },
    {
      t: {
        zh: '这一关你要做的：机关台上是同一个字母 F 在四种灯光下的照片，表面带一点细纹。你来定门槛，看一个门槛能不能让每张照片都只标出 F 的轮廓。',
        en: 'Your task: the bench shows photos of the same letter F under four kinds of lighting, with a little fine texture on the surface. You set the threshold, and see whether one threshold can mark only the outline of the F in every photo.',
      },
    },
  ],
  '3-8': [
    {
      t: {
        zh: '上一关在机关台上手动调门槛。这一关要把它做成电路：照片在什么灯光下拍的，没人告诉电路，它也要每次标出同一组边。',
        en: 'In the last level you tuned the threshold by hand on the bench. This level turns it into a circuit: nobody tells the circuit what lighting the photo was taken in, and it still has to mark the same edges every time.',
      },
    },
    {
      t: {
        zh: '真正的识别系统天天碰到这件事：同一张脸在室内和室外，同一块路牌在晴天和阴天，像素数值差得很远，该给的答案却一样。',
        en: 'Real recognition systems face this every day: the same face indoors and outdoors, the same road sign on a sunny day and a cloudy one. The pixel values are far apart, but the answer should be the same.',
      },
      fig: { test: 1, caption: { zh: '同一个 F，灯暗了，期望的边不变', en: 'The same F with a dimmer lamp: the expected edges stay the same' } },
    },
    {
      t: {
        zh: '这一关新出现的元件是「全图最大值」：找出输入里最大的那个数，输出一张处处都是这个数的图。',
        en: 'The new part in this level is "Global max": it finds the largest value in the input and outputs an image with that value everywhere.',
      },
    },
    {
      t: {
        zh: '这一关你要做的：输入是同一个物体在不同灯光下的照片，有的整体变亮，有的变暗。输出它的边：是边的像素为 1，其余为 0，四组测试的期望完全一样。',
        en: 'Your task: the input is a photo of the same object under different lighting, some brighter overall, some darker. Output its edges: 1 for edge pixels, 0 everywhere else. The expected output is exactly the same in all four test sets.',
      },
      fig: { test: 0, caption: { zh: '第一组测试：原来的灯光 → 期望', en: 'Set 1: the original lighting → expected' } },
    },
  ],
}
