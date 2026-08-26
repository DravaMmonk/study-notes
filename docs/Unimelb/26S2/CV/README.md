# COMP90086 Computer Vision

这些笔记帮助只有高等数学、计算机与机器学习基础概念的学生跟随课堂逐步学习。主体采用重点 PPT 页展示与紧邻页面批注，按课堂顺序解释概念、公式和原有例子；老师原话和 workshop 原始设计作为相关主题旁的次级补充。Readings & Links 只作可选折叠延伸，超出课件、课堂原话与 workshop 的补充明确标记为“延伸内容”。

## Notes map

- [01 Introduction](01-introduction.md)
- [02 Imaging Basics](02-basics.md)
- [03 Filters](03-filters.md)
- [04 Fourier](04-fourier.md)
- [05 Image Formation II](05-image-formation-ii.md)
- [06 Convolutional Neural Networks I](06-cnns-i.md)
- [07 Convolutional Neural Networks II](07-cnns-ii.md)
- [08 Convolutional Neural Networks III](08-cnns-iii.md)
- [09 Vision Transformers](09-vit.md)
- [10 Representation Learning](10-representations.md)
- [11 Local Features](11-features.md)
- [12 Feature Matching](12-feature-matching.md)

## Workshop 2 solution

`workshop/week-02/workshop02_solution.ipynb` 补充了 Week 2 exercise solution，覆盖 bicubic resize、center crop、BGR/RGB channel handling、deep copy、subplot visualisation，以及由 sensor 尺寸和投影比例计算 focal length。相关实践要点已并入 [02 Imaging Basics](02-basics.md)。

## Workshop 4 solution

`workshop/week-04/worksheet04_solution.ipynb` 包含颜色空间转换、颜色 manipulation、Lambertian image-formation 问题，以及在 MNIST 上比较 MLP 和 CNN 的完整参考实现。重点包括输入归一化、增加 channel 维度、softmax/cross-entropy、Keras model summary、参数数量计算，以及 CNN 的 weight sharing 如何减少参数。原始 `worksheet04.ipynb`、solution 和 `cannyimg.png`/`kodim23.png` 保存在本地 materials 目录中。

## Workshop 5

`workshop/week-05/worksheet05.ipynb` 与 `worksheet05_solution.ipynb` 继续练习 CNN parameter counting、VGG16 filters 和 feature maps、depthwise separable convolution，以及使用 pretrained ResNet50 的中间层提取 features。`harry.png` 与 `wallaby.jpeg` 是 Notebook 使用的本地图片。原题参数计算已补入 [CNNs II](07-cnns-ii.md)，separable CNN 补入 [CNNs III](08-cnns-iii.md)，可视化和特征提取补入 [Representation Learning](10-representations.md)。这份 workshop 作为 CNN baseline，与 [09 Vision Transformers](09-vit.md) 中的 CNN/ViT 比较相衔接。

## Readings & links

以下是课程页面列出的可选资源；它们用于延伸阅读，不是本仓库要执行的作业指令。

### Week 3

- *Computer Vision: Algorithms and Applications* (2nd ed.), chapters 2.3.2, 7.2, 13.1。
- [Metamers demo](https://csci1230.graphics/demos/metamers/index.html)

### Week 4

- *Deep Learning With Python*，Francois Chollet，chapters 2.4.3, 5.1。
- *Deep Learning*，Ian Goodfellow, Yoshua Bengio, Aaron Courville，chapters 9.2–9.3。
- *Pattern Recognition and Machine Learning*，Christopher Bishop，chapter 5.5.6。
- [ConvNetJS: Deep Learning in your browser](https://cs.stanford.edu/people/karpathy/convnetjs/)
- [TensorFlow Neural Network Playground](https://playground.tensorflow.org/)

### Week 5

- [An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale](https://arxiv.org/abs/2010.11929)
- [Learning Transferable Visual Models From Natural Language Supervision](https://arxiv.org/abs/2103.00020)

### Week 6

- *Computer Vision: Algorithms and Applications* (2nd ed.), sections 7.1, 7.4, 8.1（本次未提供教材正文）。
- [Hough Transform Demo](https://www.youtube.com/watch?v=ebfi7qOFLuo)（保留课程链接，视频内容未能读取）。
- [RANSAC demo](https://www.visual-experiments.com/demo/ransac.js/)（网页可读取，交互未实测）。
- 简短说明放在 [Feature Matching 的可选折叠栏](12-feature-matching.md)。

## Assignment 1

**Sampling, Aliasing, and Filtering**，截止时间为 **2026-08-23 23:59**，占总成绩 **6%**。本地 `assignment/A1/` 目录包含 specification、Jupyter Notebook template、`zoneplate.png` 和 `picket-fence.jpg`。

任务分为三组：naive downsampling 与 aliasing、Gaussian anti-aliasing、以及 direct 2D / separable 1D / FFT 三种 filtering 实现与运行时间比较。需要分别提交带输出的 Notebook 和书面 PDF report；第 1、2、3 部分各不超过 500 words。

## 证据范围

- `01 Introduction`：使用 `lecture/COMP90086-01-Introduction.pdf` + `transcript/COMP90086_2026_SM2 Week-01-W-transcript.txt`。
- `02 Imaging Basics`：使用 `lecture/COMP90086-02-Basics.pdf` + `transcript/COMP90086_2026_SM2 Week-01-F-transcript.txt`，并结合 `workshop02_solution.ipynb`。
- `03 Filters`：使用 `lecture/COMP90086-03-Filters.pdf` + `transcript/COMP90086_2026_SM2 Week-02-W-transcript.txt`。
- `04 Fourier`：使用 `lecture/COMP90086-04-Fourier.pdf` + `transcript/COMP90086_2026_SM2 Week-02-F-transcript.txt`。
- `05 Image Formation II`：使用 `lecture/COMP90086-05-ImageFormationII.pdf` + `transcript/COMP90086_2026_SM2 Week-03-W-transcript.txt`。
- `06 Convolutional Neural Networks I`：使用 `lecture/COMP90086-06-CNNsI.pdf` + `transcript/COMP90086_2026_SM2 Week-03-F-transcript.txt`。
- `07 Convolutional Neural Networks II`：使用 `lecture/COMP90086-07-CNNsII.pdf` + `transcript/COMP90086_2026_SM2 Week-04-W-transcript.txt`。
- `08 Convolutional Neural Networks III`：使用 `lecture/COMP90086-08-CNNsIII.pdf` + `transcript/COMP90086_2026_SM2 Week-04-F-transcript.txt`。
- `09 Vision Transformers`：使用 `lecture/COMP90086-09-ViT.pdf`，与 `transcript/COMP90086_2026_SM2 Week-05-W-transcript.txt`，ViT 与 CLIP 论文保留在可选扩展阅读中。

- `10 Representation Learning`：`lecture/COMP90086-10-representations.pdf` + `transcript/COMP90086_2026_SM2 Week-05-F-transcript.txt`，并结合 Workshop 5 的可视化与特征提取。
- `11 Local Features`：`lecture/COMP90086-11-features.pdf` + `transcript/COMP90086_2026_SM2 Week-06-W-transcript.txt`。
- `12 Feature Matching`：`lecture/COMP90086_12_feature-matching.pdf` + `transcript/COMP90086_2026_SM2 Week-06-F-transcript.txt`。

本次下载名中的 `W/F-transcript-4` 对应 Week 5，`W/F-transcript-5` 对应 Week 6；依据实际讲课主题与 PPT 的 Week 标题映射，不把下载编号当教学周次。Lecture 10、11 封面仍有 2025 字样，原文件保持不变。Workshop 5 solution 与已有副本 SHA-256 完全一致，未重复归档；本次只阅读并整理 notebook，没有重新训练或运行其中模型。

截图是从原始 PDF 按页渲染的 PNG，文件放在 `assets/` 中。笔记中的 slide 编号使用 PDF 页码。

## Local materials

原始课程材料保存在本地、不进版本库：

| 目录 | 内容 |
| --- | --- |
| `lecture/` | lecture slides PDF |
| `transcript/` | 按 Week/W/F 归档的 lecture transcripts |
| `workshop/week-01/` | `worksheet01.ipynb` |
| `workshop/week-02/` | `worksheet02.ipynb`、`workshop02_solution.ipynb` 与配套图片 |
| `workshop/week-04/` | `worksheet04.ipynb`、`worksheet04_solution.ipynb` 与 `cannyimg.png`、`kodim23.png` |
| `workshop/week-05/` | `worksheet05.ipynb`、`worksheet05_solution.ipynb` 与 `harry.png`、`wallaby.jpeg` |
| `assignment/A1/` | A1 specification、Notebook template 与两张 test images |
| `exam/` | practice exam 与 solution |
| `assets/` | 从 slides 按页渲染的 PNG 截图 |

## Note policy

这一科的笔记保留中文正文与 transcript 引用，未按仓库统一的 [Note Taking Guidelines](../../../NOTE_TAKING_GUIDELINES.md) 改写。英文术语在第一次出现时解释，后续保留英文是为了和 slides、代码及考试题目对应。

## New source checksums

这些 checksum 用于确认本地资源复制后没有改变；原始 Downloads 文件仍保留在原位置。

| 文件 | SHA-256 |
| --- | --- |
| `lecture/COMP90086-07-CNNsII.pdf` | `f0b7b1c69e304fd4432154c1913fe8165a97cd93d7a5784cefd3e96dec7c111f` |
| `lecture/COMP90086-08-CNNsIII.pdf` | `66d8c69473e3a638c7e42a721e36f3283f9205185a9ec5bc001e168f39aad708` |
| `transcript/COMP90086_2026_SM2 Week-04-W-transcript.txt` | `4a693ff5f06ed1ebe0bbfbab87c5d9eda5b7e61895cc91eabe3e3aa112b32d1c` |
| `transcript/COMP90086_2026_SM2 Week-04-F-transcript.txt` | `d1642b35484be4b0deb9c631d060a4418e3d544e56ed7e461e0ac677f6d0cd30` |
| `workshop/week-04/worksheet04_solution.ipynb` | `7e110f97c941e3c16d7d1e6bf38a896c8acac7188286a2edb2d5553753358911` |
| `lecture/COMP90086-09-ViT.pdf` | `b67b41d95d387a773a1384197331a9763fa1697d1046262433b27196a1989c9c` |
| `workshop/week-05/worksheet05.ipynb` | `44a36c0a5be46d2dcaedf7db546741a843e623929f61ce8b43ef5df64d95c3a7` |
| `workshop/week-05/worksheet05_solution.ipynb` | `95ebc30ab1c7cd2e3a6b0d1b2f8eadc442ece2ba7a8f0f92640d9b9aa5f1d184` |
| `workshop/week-05/harry.png` | `a5d89c8f938a45a79390f02c82b2ba3c67a5d723d0279d2bda8361b25dcbb49e` |
| `workshop/week-05/wallaby.jpeg` | `19c5f19e99e24161763e07f2568894cf334e2bb5dcf8c53cbb6fad5cda95c868` |


### Week 5–6 本次补充校验

| 文件 | SHA-256 |
| --- | --- |
| `lecture/COMP90086-10-representations.pdf` | `d21d1cecd7da6a49a98fb53abb487e06ca36f20738319f9496772fa665f3b0a3` |
| `lecture/COMP90086-11-features.pdf` | `d96b16d46b5f8d02715656e9072e9d9889553ca629d05fd6e0ae9462a37f70f2` |
| `lecture/COMP90086_12_feature-matching.pdf` | `6608997fb06674ba5ddedf9dc291abf81bf9b562ce3cda4e548163d3a4b5ba8c` |
| `transcript/COMP90086_2026_SM2 Week-05-W-transcript.txt` | `79050d0134a759b982be682e3bd1314b1e612bd5d45515909dfd8806a4e667a7` |
| `transcript/COMP90086_2026_SM2 Week-05-F-transcript.txt` | `f40e449e848a089faf4d105407c458a42b9a44e3b1c3efe2a77d2f82b8b6e22e` |
| `transcript/COMP90086_2026_SM2 Week-06-W-transcript.txt` | `c65b037a721dd53d78f95e278a9de0dc53e2583769a04cb9e4e0b9526859a528` |
| `transcript/COMP90086_2026_SM2 Week-06-F-transcript.txt` | `ffd6c4160aaf8df1fc38720e47b695cf526e106046709eaee26f18480dd14528` |
| `workshop/week-05/worksheet05_solution.ipynb` | `95ebc30ab1c7cd2e3a6b0d1b2f8eadc442ece2ba7a8f0f92640d9b9aa5f1d184` |
