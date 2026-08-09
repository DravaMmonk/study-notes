# COMP90086 Computer Vision

这些笔记把关键 slide 截图、slides 的核心内容，以及 transcript 中老师补充的解释合并在一起。现在统一按初学者阅读顺序组织：先给一句话结论，再解释术语、公式和例子，最后列出容易混淆的地方与复习清单。老师原话直接放在它所对应的 PPT 概念讲解之后，帮助把中文解释与课堂表达逐项对应，而不是集中堆在文章末尾。

## Notes map

- [01 Introduction](01-introduction.md)
- [02 Imaging Basics](02-basics.md)
- [03 Filters](03-filters.md)
- [04 Fourier](04-fourier.md)
- [05 Image Formation II](05-image-formation-ii.md)
- [06 Convolutional Neural Networks I](06-cnns-i.md)
- [07 Convolutional Neural Networks II](07-cnns-ii.md)
- [08 Convolutional Neural Networks III](08-cnns-iii.md)

## Workshop 2 solution

`workshop/week-02/workshop02_solution.ipynb` 补充了 Week 2 exercise solution，覆盖 bicubic resize、center crop、BGR/RGB channel handling、deep copy、subplot visualisation，以及由 sensor 尺寸和投影比例计算 focal length。相关实践要点已并入 [02 Imaging Basics](02-basics.md)。

## Workshop 4 solution

`workshop/week-04/worksheet04_solution.ipynb` 包含颜色空间转换、颜色 manipulation、Lambertian image-formation 问题，以及在 MNIST 上比较 MLP 和 CNN 的完整参考实现。重点包括输入归一化、增加 channel 维度、softmax/cross-entropy、Keras model summary、参数数量计算，以及 CNN 的 weight sharing 如何减少参数。原始 `worksheet04.ipynb`、solution 和 `cannyimg.png`/`kodim23.png` 保存在本地 materials 目录中。

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
