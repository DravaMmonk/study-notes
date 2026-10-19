// 第 3 章各关的引入。格式见 ./index.js。
export default {
  '3-1': [
    { t: { zh: '照片里每个像素只是一个亮度数。可这个数从哪来？同一面白墙，正对窗户和侧对窗户，拍出来就不一样亮。这一章先回到拍照的那一刻，看光怎样变成明暗。', en: 'Each pixel in a photo is just a brightness. But where does that number come from? The same white wall photographs brighter facing the window than turned away from it. This chapter goes back to the moment a photo is taken, to see how light becomes light and shade.' } },
    { t: { zh: '表面朝哪个方向，用一根从表面正中竖起的小杆来表示，叫<b>法线</b>：它的长度是 1，有 x、y、z 三个分量。表面会弹回多少光，叫<b>反射率</b>：白漆接近 1，黑漆接近 0。', en: 'Which way a surface faces is shown by a little rod standing straight up from it, called the <b>normal</b>: it has length 1 and three components, x, y and z. How much light a surface bounces back is its <b>reflectance</b>: close to 1 for white paint, close to 0 for black.' } },
    { t: { zh: '哑光的表面正对着灯时最亮，越斜越暗。要想的问题：灯没变弱，也没被挡住，只是斜着照过来，表面为什么会变暗？', en: 'A matte surface is brightest when it faces the lamp, and darker the more it turns away. Something to think about: the lamp is no weaker and nothing blocks it; it just shines at a slant. Why does the surface get darker?' } },
    { t: { zh: '这一关你要做的：输入是每一点的法线和反射率，灯的方向在说明里。画出相机拍到的样子。', en: 'Your task in this level: the inputs are each point\'s normal and reflectance, and the lamp direction is in the brief. Draw what the camera sees.' }, fig: { test: 0, caption: { zh: '第一组测试：一个白球', en: 'Set 1: a white ball' } } },
  ],
  '3-2': [
    { t: { zh: '摄影棚里很少只用一盏灯：主灯之外，还会在另一侧放一盏弱一些的补光，让暗面不至于漆黑。', en: 'Studios rarely use a single lamp: besides the key light, a weaker fill light goes on the other side so the dark side is not pitch black.' } },
    { t: { zh: '上一关的电路现在是「朗伯着色」元件：给它法线和反射率，设好灯的方向，它就画出这盏灯下的样子。', en: 'Last level\'s circuit is now the "Lambert shading" part: give it the normals and the reflectance, set the lamp direction, and it draws the surface under that lamp.' } },
    { t: { zh: '这一关你要做的：主灯不变，再加一盏从左边低处照来的补光，强度是主灯的一半。要想的问题：背对补光的那一面，补光给它的亮度是多少？', en: 'Your task in this level: keep the key light and add a fill light low on the left at half its strength. Something to think about: on the side facing away from the fill light, how much brightness does the fill light give?' }, fig: { test: 0, caption: { zh: '第一组测试：一个高鼓包', en: 'Set 1: a tall bump' } } },
  ],
  '3-3': [
    { t: { zh: '彩色照片每个像素有三个数：R、G、B。可现实里的光不止三种，而是像彩虹那样一整条，从紫到红连成一片，叫<b>光谱</b>。', en: 'Each pixel of a colour photo has three numbers: R, G and B. But real light is not three kinds; it is a whole band like a rainbow, from violet to red, called a <b>spectrum</b>.' } },
    { t: { zh: '相机和人眼一样，只有三种感光元件，各自对一段波长敏感。每种元件对每个波长有多敏感，画出来是一条灵敏度曲线。', en: 'A camera, like the human eye, has only three kinds of sensor, each sensitive to a range of wavelengths. How sensitive each is at each wavelength, drawn out, is its sensitivity curve.' }, fig: { test: 0, caption: { zh: '第一组测试：日光的光谱和三条灵敏度曲线', en: 'Set 1: the daylight spectrum and the three sensitivity curves' } } },
    { t: { zh: '这一关的输入都是波形：一条光谱和三条灵敏度曲线，每条 10 个点，从紫到红。「求平均」把一行数平均成一个数。', en: 'This level\'s inputs are all waveforms: a spectrum and three sensitivity curves, 10 points each, from violet to red. "Average" turns a row of numbers into one number.' } },
    { t: { zh: '这一关你要做的：输出相机读到的 R、G、B 三个数。要想的问题：一整条光谱只记成三个数，丢掉了什么？', en: 'Your task in this level: output the three numbers the camera reads, R, G and B. Something to think about: when a whole spectrum is kept as three numbers, what is thrown away?' } },
  ],
  '3-4': [
    { t: { zh: '布是什么颜色，要看它把每个波长的光反射回来多少，这也是一条曲线。照到布上的光 × 布的反射，才是进到相机里的光谱。', en: 'What colour a cloth is depends on how much light it reflects at each wavelength, which is another curve. The light falling on the cloth × the cloth\'s reflectance is the spectrum that enters the camera.' } },
    { t: { zh: '上一关的电路现在是「感光」元件：选 R、G 或 B，它就按那条灵敏度曲线读一条光谱。', en: 'Last level\'s circuit is now the "Sensor" part: choose R, G or B and it reads a spectrum with that sensitivity curve.' } },
    { t: { zh: '这一关有两块布，在日光下相机读到的 R、G、B 一模一样。这一关你要做的：在各种灯下，输出相机读到的布 A 减去布 B。要想的问题：两块布的光谱明明不同，为什么日光下分不出来？', en: 'This level has two cloths whose R, G and B readings are exactly the same in daylight. Your task in this level: under various lamps, output what the camera reads for cloth A minus cloth B. Something to think about: the two cloths\' spectra are plainly different, so why can daylight not tell them apart?' }, fig: { test: 1, caption: { zh: '第二组测试：暖白灯下的两块布', en: 'Set 2: the two cloths under a warm white lamp' } } },
  ],
  '3-5': [
    {
      t: {
        zh: '前几关看的都是一块表面。真实照片里，表面本来的颜色和照到的光混在一起：白墙在阴影里是灰的，深色地砖在太阳底下也可能很亮。',
        en: 'The last few levels looked at a single surface. In a real photo, a surface\'s own colour and the light falling on it are mixed together: a white wall in shadow looks grey, and dark floor tiles in sunlight can look very bright.',
      },
    },
    {
      t: {
        zh: '找物体，常靠照片里明暗突变的地方。阴影也会造出明暗突变。要想的问题：照片里一条明暗分界线，一定是物体的边吗？手机扫描文件时去掉纸上的阴影，碰到的就是这件事。',
        en: 'Finding objects often relies on places where brightness jumps. Shadows make brightness jumps too. Something to think about: is a line between light and dark in a photo always the edge of an object? A phone app removing the shadow from a scanned page runs into exactly this.',
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
  '3-6': [
    { t: { zh: '找红灯、分开天空和草地，都要靠颜色。可一个红苹果在阴影里，R 很小；一张白纸在阳光下，R 却很大。', en: 'Finding red lights, telling sky from grass: these rely on colour. Yet a red apple in the shade has a small R, while a sheet of white paper in the sun has a big one.' } },
    { t: { zh: '这一关的输入是同一个场景的 R、G、B 三张图，光照有明有暗。', en: 'This level\'s inputs are the R, G and B images of one scene, with light and shade across it.' }, fig: { test: 0, caption: { zh: '第一组测试：窗边的苹果', en: 'Set 1: apples by a window' } } },
    { t: { zh: '这一关你要做的：标出红色的东西，亮处的、阴影里的都要；白纸、黄花不算。要想的问题：光照变强变弱，R、G、B 三个数之间有什么不变？', en: 'Your task in this level: mark the red things, in light and in shade alike; white paper and yellow flowers do not count. Something to think about: as the light gets stronger or weaker, what stays the same among R, G and B?' } },
  ],
  '3-7': [
    { t: { zh: '前几关讲明暗从哪来，这一关转向<b>边</b>：明暗变化很快的地方。要找它，先得说清每一点「变得有多快」。', en: 'The last few levels were about where light and shade come from. This one turns to <b>edges</b>: places where brightness changes fast. To find them, first say how fast the brightness changes at each point.' } },
    { t: { zh: '坡度有两个分量：往右走亮度变多少（gx），往下走变多少（gy），两个合起来是一个箭头，叫<b>梯度</b>。Sobel x 在每个像素量 gx，Sobel y 量 gy。', en: 'A slope has two components: how much the brightness changes going right (gx), and going down (gy). Together they make an arrow called the <b>gradient</b>. Sobel x measures gx at every pixel, and Sobel y measures gy.' }, fig: { part: 'sobelx', params: {}, input: 'disk', caption: { zh: 'Sobel x 处理圆盘：左右两侧反应强，上下几乎没有', en: 'Sobel x on a disc: strong on the left and right, almost nothing at the top and bottom' } } },
    { t: { zh: '难处在方向。物体的边有横有竖有斜，只量一个方向的坡度会漏掉另一些边。一个好的边缘强度，不该因为边转了个方向就变弱。', en: 'The difficulty is direction. Object edges run horizontally, vertically and diagonally; measuring the slope in one direction only misses some of them. A good edge strength should not get weaker just because an edge turns.' } },
    { t: { zh: '新画法「坡度」：画出等高线，再在各处画一个箭头，指向变亮最快的方向。', en: 'A new way of drawing, "Slope": contour lines, with an arrow at each place pointing where the picture brightens fastest.' } },
    { t: { zh: '这一关你要做的：在每个像素输出梯度箭头有多长。测试里有方块、圆盘、字母 X 和一个角，边朝着各个方向。', en: 'Your task in this level: at every pixel, output how long the gradient arrow is. The tests have a square, a disc, a letter X and a corner, with edges facing every way.' }, fig: { test: 0, caption: { zh: '第一组测试：方块 → 期望', en: 'Set 1: square → expected' } } },
  ],
  '3-8': [
    { t: { zh: '找边还差一步：定一个门槛，梯度超过它的像素才算边。门槛太低，表面的细纹也算进来；太高，真正的边又会漏掉。', en: 'Finding edges needs one more step: a threshold, so that only pixels whose gradient exceeds it count as edges. Too low, and fine texture counts too; too high, and real edges are missed.' } },
    { t: { zh: '麻烦在灯光。车上的摄像头中午和傍晚都要认出同一条路沿，不可能每换一次光就重调一次门槛。同一张脸在室内和室外，像素数值差得很远，该给的答案却一样。', en: 'The trouble is lighting. A car\'s camera must recognise the same kerb at noon and at dusk; it cannot retune the threshold every time the light changes. The same face indoors and outdoors gives very different pixel values, yet the answer should be the same.' }, fig: { test: 1, caption: { zh: '同一个 F，灯暗了，期望的边不变', en: 'The same F with a dimmer lamp: the expected edges stay the same' } } },
    { t: { zh: '这一关新出现的元件是「全图最大值」：找出输入里最大的那个数，输出一张处处都是这个数的图。', en: 'New in this level is the part "Global max": it finds the largest number in its input and outputs a picture filled with that number everywhere.' } },
    { t: { zh: '这一关你要做的：输入是同一个物体在不同灯光下的照片，有的整体变亮，有的变暗。输出它的边，四组测试的期望完全一样。', en: 'Your task in this level: the inputs are photos of the same object under different lighting, some brighter overall, some dimmer. Output its edges; all four tests expect exactly the same answer.' }, fig: { test: 0, caption: { zh: '第一组测试：原来的灯光 → 期望', en: 'Set 1: the original lighting → expected' } } },
  ],
  '3-9': [
    { t: { zh: '这是一道挑战关，可以跳过。它不需要新元件。', en: 'This is a challenge level, and you can skip it. It needs no new parts.' } },
    { t: { zh: '在偏黄的灯下拍照，白纸会发黄，整张照片都带着灯的颜色。人眼会自动纠正，相机得靠「白平衡」。', en: 'Photographed under a yellowish lamp, white paper looks yellow and the whole picture takes on the lamp\'s colour. Your eyes correct for it automatically; a camera needs "white balance".' }, fig: { test: 0, caption: { zh: '第一组测试：黄灯下的书桌', en: 'Set 1: a desk under a yellow lamp' } } },
    { t: { zh: '这一关你要做的：每张照片里都有一块白纸，它在 R、G、B 里都是最亮的。让白纸变回纯白，其余颜色跟着还原。', en: 'Your task in this level: every photo has a patch of white paper, the brightest thing in each of R, G and B. Make the paper pure white again and let every other colour be restored with it.' } },
  ],
  '3-10': [
    { t: { zh: '产线上的金属板刷了漆，要检查有没有磕出的凹坑和划痕。坑和划痕改变的是表面的朝向，可漆色深浅不一，单看一张照片里的明暗，分不清是漆还是坑。这一章最后三关，就来搭这台检测仪。', en: 'Painted metal sheets on a line must be checked for dents and scratches. These change which way the surface faces, but the paint is uneven, so the shading in a single photo cannot tell paint from dent. The last three levels of this chapter build this inspection machine.' } },
    { t: { zh: '每块板在三盏灯下各拍一张：右灯、下灯和正面灯，方向都在说明里。三张照片里，漆色是一样的，变的只是灯。', en: 'Each sheet is photographed under three lamps: from the right, from below and from the front, with their directions in the brief. The paint is the same in all three photos; only the lamp changes.' }, fig: { test: 0, caption: { zh: '第一组测试：一个鼓包，三张照片', en: 'Set 1: a bump, three photos' } } },
    { t: { zh: '这一关你要做的：标出表面朝右倾斜的地方。要想的问题：一张照片里的暗，可能是什么造成的？两张照片之间的什么关系，和漆色无关？', en: 'Your task in this level: mark where the surface leans to the right. Something to think about: what could make a spot dark in one photo? What relation between two photos has nothing to do with the paint?' } },
  ],
  '3-11': [
    { t: { zh: '上一关只问了朝右还是朝左。三盏灯其实能告诉你更多：每一点的漆色和朝向，都能解出来。', en: 'The last level only asked left or right. Three lamps can tell you more: the paint and the facing at every point can both be solved.' } },
    { t: { zh: '这一关你要做的：同样的三张照片，输出漆色本身，也就是每一点的反射率，和表面朝哪边无关。', en: 'Your task in this level: from the same three photos, output the paint itself, the reflectance at every point, whichever way the surface faces.' }, fig: { test: 0, caption: { zh: '第一组测试：鼓包上的漆', en: 'Set 1: the paint on a bump' } } },
  ],
  '3-12': [
    { t: { zh: '检测仪的最后一关。金属板本该是平的，允许它轻微弯曲；磕出的坑和划痕会让表面明显倾斜。', en: 'The inspection machine\'s final level. A sheet should be flat, though a slight bend is allowed; dents and scratches make the surface tilt clearly.' } },
    { t: { zh: '这一关你要做的：标出坡度超过 0.3 的地方，漆色深浅不能误报。', en: 'Your task in this level: mark where the slope is above 0.3; uneven paint must not raise an alarm.' }, fig: { test: 2, caption: { zh: '第三组测试：一个坑和一道划痕', en: 'Set 3: a dent and a scratch' } } },
  ],
}
