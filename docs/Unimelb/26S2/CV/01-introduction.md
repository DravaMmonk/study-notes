# COMP90086 Lecture 1 - Introduction

来源：`lecture/COMP90086-01-Introduction.pdf` 与 `transcript/COMP90086_2026_SM2 Week-01-W-transcript.txt`。

这篇先不急着记算法。它要回答一个最基本的问题：**computer vision 到底要让电脑从图像中知道什么，并进一步做什么？**

## 1. Computer vision 是什么

![Slide 6 - Computer vision](assets/01-introduction/slide-06.png)

最简单的定义是：

> 把图像或视频交给电脑，让电脑从中得到有用的理解，并据此做出判断或动作。

所以 computer vision 不只是“认出这是一只猫”。它也可以回答：

- 图像里有什么？
- 每个物体在哪里？
- 物体的边界和形状是什么？
- 相机在哪里、场景有多远？
- 机器人下一步应该抓哪个物体？

“vision” 是输入形式，“understanding” 是我们希望得到的结果。输入可以来自普通相机、医学扫描、深度相机或多张照片；输出可以是类别、位置、三维结构、导航方向或动作。

> **老师原话**：“Anything where image-based information goes into a computer and it does something intelligent with it.”

### 一个医学成像例子

老师提到：X-ray 比 CT 更便宜、辐射通常更低，也更容易获得；但 CT 包含更完整的三维信息。一个生成模型可以尝试根据一组 X-rays 生成与它们一致的 CT。这个例子说明 computer vision 可以和医学、生成模型结合，而不是只处理普通照片。

## 2. 先分清几种常见任务

![Slide 7 - Computer vision tasks](assets/01-introduction/slide-07.png)

同一张图可以提出不同问题。问题不同，答案的形式也不同。

| 任务 | 它回答什么 | 输出例子 |
| --- | --- | --- |
| Recognition / classification | 整张图主要是什么类别？ | `dog` |
| Detection | 哪些物体在哪里？ | 类别 + bounding box |
| Semantic segmentation | 每个 pixel 属于哪一类？ | road、sky、person |
| Instance segmentation | 每个 pixel 属于哪一个具体物体？ | person-1、person-2 |
| 3D recovery | 场景的三维形状和深度是什么？ | depth、surface points |
| Visual navigation | 我在哪里，应该往哪里走？ | camera pose、movement |
| Visually guided action | 看完之后要做什么？ | robot grasp、避障 |

一个容易混淆的地方是：**classification 只给一个或少量类别标签；detection 还要给位置；segmentation 要把答案细化到 pixel。**

> **老师原话**：“Not just classification.”

## 3. Computer vision 和 computer graphics 的方向相反

![Slide 8 - Related fields](assets/01-introduction/slide-08.png)

可以把两者想成一条箭头的两端：

- **Computer graphics**：已知物体、材质、灯光和 camera，向前生成一张 image。
- **Computer vision**：已知 image，反过来推测物体、材质、灯光和 camera。

因此 graphics 是 **forward problem**，vision 是 **inverse problem**。反问题通常更难，因为不同的三维场景可能产生很相似的二维图像。

实际系统常把两者放在一起：先根据当前估计渲染一张预测图，再把预测图和真实图比较，用差异修正估计。这就是“render and compare”的基本想法。

> **老师原话**：“Computer vision equals computer graphics to the power minus one.”

这是帮助记忆的比喻，不是严格的数学公式。

## 4. 课程会怎样展开

![Slide 12 - Subject content](assets/01-introduction/slide-12.png)

课程大致从底层到高层推进：

1. **Image formation**：图像是怎样由光、物体和相机形成的；
2. **Digital images and filtering**：pixel、channel、kernel 和频率；
3. **Recognition and representation learning**：如何从图像学习有用特征；
4. **3D perception**：深度、相机运动和三维结构；
5. **Generative models**：生成与图像有关的新内容；
6. **Segmentation and detection**：让输出更细、更接近实际应用。

这条顺序很重要。后面的 CNN、生成模型和 detection 仍然依赖前面关于坐标、图像形成和 filtering 的基础。

## 5. 为什么 recognition 很难

![Slide 28 - Difficulties](assets/01-introduction/slide-28.png)

假设我们要识别“鸟”。同一类鸟的照片可能有不同：

- 大小和距离不同；
- 角度和姿态不同；
- 光照不同；
- 背景不同；
- 物体被遮挡；
- 图像中还有很多无关物体。

同时，不同类别也可能长得很像。于是模型不能只记住某几个 pixel，而要学习较稳定的 **representation**（表示）。

一个好的 representation 要同时满足两件事：

1. 不同类别要能被分开；
2. 同一类别的无关变化不要让表示完全改变。

这里的“invariant” 不一定意味着完全不变。很多系统只要求对小变化保持 **tolerant**，也就是结果不要大幅恶化。

## 6. Biological vision 给出的直觉

![Slide 29 - Visual encoding](assets/01-introduction/slide-29.png)

老师用 biological vision 说明：视觉处理不一定是一条简单的直线。快速路径可能先给出一个猜测，后面的循环连接再检查并修正它。这个直觉后来会出现在 neural network 的多层 representation 中：早期层看简单局部模式，后面层组合它们。

> **老师原话**：“Sometimes the fast straight-through path will give you some guess ... looping mechanisms will then refine that estimate.”

![Slide 30 - Beyond classification](assets/01-introduction/slide-30.png)

所以 computer vision 的输出不只包括 global label，还可能包括：

- 每个 object 的位置；
- 每个 pixel 的语义；
- object parts，例如 head、torso、legs；
- surface normal，即表面朝向；
- saliency，即哪些区域最值得关注。

记忆方法：classification 主要回答“**是什么**”；detection 还回答“**在哪里**”；3D 和 action 还要回答“**结构怎样、下一步做什么**”。

## 7. 多张照片如何帮助三维理解

![Slide 31 - Rome in a day](assets/01-introduction/slide-31.png)

一张照片丢失了部分深度信息。若有很多不同位置拍摄的照片，可以寻找照片之间的共同点，估计每个 camera 的位置，再把多条 viewing rays 交汇起来。

图中的黑色 prism 可以理解为 camera 的 viewing frustum：尖端是 camera 位置，四个侧面表示它看到的范围。系统通过许多照片估计这些 frustums 的关系，逐渐恢复城市的三维结构。

## 8. 三个应用例子

### Augmented reality

![Slide 32 - AR stormtrooper](assets/01-introduction/slide-32.png)

AR 不是把一张图片简单贴到屏幕上。系统需要估计房间的 floor、墙面和 camera pose，才能把虚拟物体放到正确的三维位置，并产生看起来合理的 shadow。

### Tracking、rendering 和 interaction

![Slide 33 - Sliding-block T-shirt](assets/01-introduction/slide-33.png)

一个看似简单的 T-shirt AR app，实际上要完成四件事：找到 T-shirt、持续跟踪它、在它上面渲染内容、处理用户触摸。这说明真实应用通常把多个 vision task 组合起来。

### Robot grasping

![Slide 34 - Robot vision](assets/01-introduction/slide-34.png)

机器人相机看到 tray 里的物体后，不只是输出“这是杯子”。它还要估计物体位置和姿态，选择抓取方式，并考虑 robot 自身的误差。好的 vision output 必须足够支持后续 action。

### GAN 与 diffusion

![Slide 35 - GANs](assets/01-introduction/slide-35.png)

GAN 例子用于说明生成模型的历史路线：模型先生成图像，再逐步提高分辨率。老师提醒，这类方法是课程背景的一部分；现在还需要理解 diffusion models，因为它们在许多生成任务上已经成为重要方法。

## 9. 本讲复习

1. Computer vision 是从图像信息得到理解或动作，不等于 classification。
2. Recognition、detection、segmentation、3D recovery 和 navigation 的输出形式不同。
3. Graphics 是从世界生成图像；vision 是从图像反推世界。
4. Recognition 难在同类变化很大、异类可能相似，还会受到遮挡和背景干扰。
5. 后续学习的 filtering、CNN 和三维方法，都建立在 image formation、坐标和 representation 之上。
