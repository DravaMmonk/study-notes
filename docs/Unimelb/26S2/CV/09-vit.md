# COMP90086 Lecture 9 - Vision Transformers

来源：`lecture/COMP90086-09-ViT.pdf` 与 `transcript/COMP90086_2026_SM2 Week-05-W-transcript.txt`（原下载名 `W-transcript-4.txt`，按讲课主题确认是 Week 5 ViT）。正文以 PPT 为主，原话放在对应概念旁；原有 Week 5 论文简介属于可选延伸。

先记住：**Vision Transformer（ViT）把图片切成许多小块，把每个小块当成一个 token（序列中的一个处理单元），再用自注意力学习任意两个图像区域之间的关系。** CNN 天生优先处理局部邻域；ViT 第一层就能比较相距很远的图块，但通常需要更多数据来学会 CNN 已经写进结构里的图像规律。

学习路线：[图块与位置](#topic-1) → [注意力怎样传递信息](#topic-2) → [编码块与分类](#topic-3) → [数据、细节与计算量](#topic-4)。

重点：图块、位置、Q/K/V 和分类 token。难点：注意力矩阵的行列含义。易错：全局可见不等于已经学懂关系，小图块会大幅增加成本。

<a id="topic-1"></a>
## 1. 输入表示：图块与位置

### 归纳偏置：模型在看数据前已经相信什么

**Inductive bias（归纳偏置）** 是模型在训练前就带有的假设或限制。它会让学习算法优先选择某些解，而不是把所有可能的解都同等对待。

这不是“错误的偏见”。当训练数据有限时，合理的归纳偏置可以缩小搜索范围，让模型更容易学到能够泛化的规律。

例如，一张 $224\times224\times3$ 图片有 $150{,}528$ 个数值。如果允许模型任意组合所有像素，可能的关系多得无法穷举。CNN 通过结构提前加入两个重要假设：

- **Locality（局部性）**：相邻像素更可能共同组成有意义的特征，例如边缘或纹理。
- **Translation equivariance（平移等变性）**：同一个滤波器在整张图片上共享，所以同一特征移到别处时，特征图中的响应也跟着移动。

![Slide 6 - Inductive biases of CNNs](assets/09-vit/slide-06.png)

一个 $3\times3$ 卷积的单个输出只能直接看到 $3\times3$ 范围。连续堆叠、步幅都为 1 时，感受野才逐层变大：

$$
r_L = 1 + 2L.
$$

这里 $L$ 是 $3\times3$ 卷积的层数。1 层看到 $3\times3$ ，2 层看到 $5\times5$ ，3 层看到 $7\times7$ 。因此 CNN 不是完全看不到远距离关系，而是要经过多层，先组合局部信息，再逐渐形成更大范围的特征。

自注意力不同：一个 token 在第一层就可以读取所有其他 token，所以它一开始就有全局感受野。它没有被强制要求“先看附近，再看远处”。这给了模型更大的自由，也减少了 CNN 的局部性假设。

> **老师原话**：“it's using the same weights on every patch”
>
> **理解**：这里谈的是 CNN 在各位置重复使用同一套权重，是结构自带的约束，不是训练后碰巧得到相同权重。

### 为什么把图片看成一串 token

Transformer 最早是为文字序列设计的。句子已经自然地分成词语，但图片没有现成的词语边界，所以 ViT 使用一个简单规则：把图片切成固定大小、互不重叠的 **图块**。

![Slide 14 - Image patches become a token sequence](assets/09-vit/slide-14.png)

假设输入图片大小为 $H\times W\times C$ ：

- $H$ ：高度；
- $W$ ：宽度；
- $C$ ：通道，RGB 图片通常为 3；
- 每个图块的大小为 $P\times P$ 。

如果 $H$ 和 $W$ 都能被 $P$ 整除，图块数量是：

$$
N=\frac{H}{P}\times\frac{W}{P}=\frac{HW}{P^2}.
$$

例如 $224\times224$ 图片使用 $16\times16$ 图块：

$$
N=\frac{224}{16}\times\frac{224}{16}=14\times14=196.
$$

每个 RGB 图块原本有 $P\times P\times3$ 个数。把它展平后， $16\times16$ 图块会变成长度 $16\times16\times3=768$ 的向量。接着通过一个可学习的线性层，把它转换成长度为 $D$ 的 **图块嵌入向量**：

$$
z_i = x_iE+b,
$$

其中 $x_i$ 是第 $i$ 个展平后的图块；投影矩阵和偏置分别记为 $E,b$ ，它们都是训练学到的参数。输出 $z_i\in\mathbb{R}^{D}$ 。这一步不是在预测类别，而是在把每个图块转成 Transformer 能统一处理的 token 表示。

### 位置：为什么只给图块还不够

如果只把图块嵌入向量交给自注意力，模型知道“有哪些图块”，却不知道它们原来位于图片的哪里。把图块打乱后，注意力的输出也只会跟着打乱；它本身不会因为“左上角”或“右下角”而改变计算规则。

但视觉关系经常依赖位置：两只眼睛在鼻子上方可能组成脸，同样的局部特征换一种排列就可能不是脸。因此 ViT 给每个图块加上 **位置编码**：

$$
\tilde z_i=z_i+p_i,
$$

其中 $p_i$ 表示第 $i$ 个位置。这里是逐元素相加，不是把两个向量首尾拼起来。

![Slide 19 - Positional encoding](assets/09-vit/slide-19.png)

可以把 $p_i$ 想成图块随身携带的“地址标签”。即使 token 顺序被重新排列，地址仍跟着对应图块，模型仍有机会推断原来的空间布局。

<a id="topic-2"></a>
## 2. 重点：注意力怎样传递信息

### 自注意力到底在算什么

自注意力的核心问题是：**对于当前图块，我应该从其他哪些图块读取多少信息？**

#### Query、Key、Value 的直觉

![Slide 15 - Queries, keys and values](assets/09-vit/slide-15.png)

同一个输入 token $x_i$ 会经过三个不同的学习得到的线性变换：

$$
q_i=x_iW_Q,\qquad k_i=x_iW_K,\qquad v_i=x_iW_V.
$$

- **Query（Q）**：当前 token 正在寻找什么。
- **Key（K）**：每个 token 用什么特征说明“我可能与你有关”。
- **Value（V）**：如果另一个 token 注意到我，我实际提供什么信息。

一个直观比喻是查资料：查询是检索词，键是每份资料的索引，数值是资料正文。检索词和某个索引越匹配，就从那份正文中读取越多内容。

Q、K、V 都来自输入 token，但使用不同参数矩阵，所以它们能学成不同用途的表示。训练不会人工指定“这个注意力头找眼睛、那个注意力头找轮廓”；这些参数由最终任务的损失通过反向传播一起更新。

#### 从相似度变成加权平均

把所有查询、键、数值分别堆成矩阵 $Q,K,V$ ，标准缩放点积注意力写成：

$$
\operatorname{Attention}(Q,K,V)
=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V.
$$

这里 $d_k$ 是每个查询／键向量的维度； $N$ 是参与注意力计算的 token 数。按顺序拆开：

1. $QK^\top$ 比较每一个查询和每一个键，得到一个 $N\times N$ 的分数矩阵。
2. 除以 $\sqrt{d_k}$ ，避免向量维度增大时点积过大，导致 softmax 太接近 0 或 1、梯度很小。
3. softmax 把每一行变成和为 1 的权重。
4. 用这些权重对所有数值 vectors 做加权平均，得到每个 token 的新表示。

![Slide 16 - One attention head](assets/09-vit/slide-16.png)

以第 6 个图块为例，它的查询 $q_6$ 会与所有键比较，而不是只比较相邻图块。假如它与第 4、10 个键最匹配，那么输出 $y_6$ 会主要吸收 $v_4$ 和 $v_{10}$ 的信息。

所以注意力不是“选中一个图块后复制它”，而是产生一组连续权重，再对所有数值做加权组合。

### 多头注意力：为什么需要多个注意力头

一个注意力头只有一组 $W_Q,W_K,W_V$ ，因此只有一种学习到的匹配规则。**多头注意力** 并行运行多个注意力头，让模型能够同时寻找不同类型的关系。

例如，某些注意力头可能更关注颜色相似性，另一些可能更关注物体远距离部件的组合。这里只是帮助理解的可能情况，不代表每个注意力头一定能被人类清楚命名。

把嵌入向量宽度和注意力头 count 分别记为 $D,h$ ，常见做法是让每个注意力头的宽度为：

$$
d_k=d_v=\frac{D}{h}.
$$

各注意力头的输出先拼接回宽度 $D$ ，再通过输出矩阵 $W_O$ 混合。这样增加注意力头不一定按比例增加总参数量，因为每个注意力头同时变窄了。

<!-- figure: attention-switchboard -->

<a id="topic-3"></a>
## 3. 完整网络：编码块与分类

### 一个 Transformer 编码器块做两件事

![Slide 21 - Transformer encoder block](assets/09-vit/slide-21.png)

每个编码器块交替做两种处理：

1. **Multi-注意力头自注意力**：在 token 之间传递信息。只有这一步会让一个图块直接读取其他图块。
2. **MLP**：对每个 token 独立做非线性变换。不同 token 使用同一组 MLP 参数，但这一小步不会互相读取。

讲义中的先做归一化的编码块可以写成：

$$
X'=X+\operatorname{MSA}(\operatorname{LN}(X)),
$$

$$
Y=X'+\operatorname{MLP}(\operatorname{LN}(X')).
$$

- **LayerNorm（LN）** 帮助稳定每个 token 内部特征 dimensions 的尺度。
- **Residual connection** 把输入直接加回输出。注意力或 MLP 学的是对原表示的修正，不必每层重新建立全部信息。
- **MLP** 通常包含两个线性层和中间的非线性激活。

这些块会重复 $L$ 次。位置信息在进入第一层前加入一次，然后和 token 表示一起沿网络传递。

### 完整 ViT 如何得到分类结果

![Slide 22 - Complete Vision Transformer](assets/09-vit/slide-22.png)

完整流程可以按下面一条线理解：

$$
\text{image}
\rightarrow \text{patches}
\rightarrow \text{patch embeddings + positions}
\rightarrow L\text{ encoder blocks}
\rightarrow \text{classification head}.
$$

ViT 还在图块 sequence 前加入一个可学习的 **分类 token**，常写为 `[CLS]`。它不是图片中真实存在的图块，而是一个专门用来汇总全图信息的额外 token。

因为 `[CLS]` 也参加每层自注意力，它可以不断从所有图块 token 读取信息。经过最后一个编码器块后，模型把 `[CLS]` 的表示送入 MLP 注意力头，输出类别分数。

> **老师原话**：“It generates keys and queries and values just like all the others, and it participates in this information sharing process.”
>
> **理解**：主语是分类 token：它不是等所有图块算完才取平均，而是从第一层起就参与交换信息。

**易错**：前面数的是图块，输入编码块时还应加上分类 token：

$$
N=196+1=197,
$$

多出来的 1 就是分类 token。

<a id="topic-4"></a>
## 4. 取舍：数据、细节与计算量

### CNN 与 ViT 的关键区别

| 问题 | CNN | ViT |
| --- | --- | --- |
| 第一层能直接看多远 | 小卷积核的局部邻域 | 每个 token 可注意所有 token |
| 空间结构如何进入模型 | 卷积的局部连接与权重共享 | 图块划分加位置嵌入 |
| 平移相关假设 | 网络结构中较强 | 不像 CNN 那样直接写入结构 |
| 学远距离关系 | 需堆叠多层扩大感受野 | 第一层自注意力就可建立 |
| 小数据上的倾向 | 归纳偏置通常更有帮助 | 更容易因自由度大而过拟合 |
| token/特征数量的代价 | 依卷积特征图而定 | 标准注意力对 token 数是二次成本 |

讲义的结论需要谨慎理解：不是“Transformer 永远优于 CNN”，也不是“ViT 没有归纳偏置”。ViT 仍然假设固定图块网格、图块尺度和某种位置表示。更准确的说法是：**ViT 使用了与 CNN 不同、较弱的局部性和平移偏置。**

![Slide 27 - Data scale and inductive bias](assets/09-vit/slide-27.png)

原始 ViT 工作强调大规模预训练后再迁移到较小数据集。讲义也提醒，CNN/ViT 的比较会受训练设置、数据规模和计算预算影响，不能只看网络结构名字就判断谁更好。

### 图块大小为什么不能无限变小

更小的图块能保留更细的空间 detail，但会迅速增加 token 数。

对固定图片大小，图块边长从 $P$ 减半到 $P/2$ 时：

$$
N'=\frac{HW}{(P/2)^2}=4N.
$$

标准自注意力需要比较所有 token 对，主要注意力分数成本随 $N^2$ 增长。因此 token 数变为 4 倍时，这部分成本约变为：

$$
(4N)^2=16N^2.
$$

![Slide 32 - Patch size and quadratic attention cost](assets/09-vit/slide-32.png)

大图块较便宜，却可能把小物体或边界粗暴切开；小图块更精细，却更贵。Swin Transformer 等后续方法让注意力先在局部窗口中计算，并在下一层移动窗口，使信息仍能跨越原来的边界。

![Slide 33 - Shifted local windows](assets/09-vit/slide-33.png)

这可以看成把一部分局部性假设加回 Transformer，以更低成本处理更细的视觉结构。

> **老师原话**：“we've got this quadratic computational cost with the number of patches.”
>
> **理解**：做模型设置时先数图块，再估计两两比较成本；别只看图像边长增加了多少。

<details>
<summary>补充：阅读与练习</summary>

课程论文链接见 [Week 5 阅读索引](READING-LINKS.md)。CLIP 的概念集中讲在 [下一讲](10-representations.md)；本周 CNN 参数练习见 [CNNs II](07-cnns-ii.md)。先掌握本讲的信息流，再阅读论文。

</details>

### Workshop 6：全局可见之后，模型实际看多远

来源：`workshop/week-06/worksheet06.ipynb`。原练习用预训练 ViT 分类，再计算各层各个 head 的平均注意距离：用注意力权重加权图块之间的空间距离。它让你检查“结构允许看远处”是否真的变成“这张图上关注远处”。换图后再比较，不能把单张图的结果当成所有输入的固定规律。本次未重新运行模型。

## 本讲自测

1. 224×224 图像用 16×16 图块时，有多少图块及分类 token？
2. 注意力矩阵的一行在比较什么，又对什么做加权？
3. 图块边长减半后，图块数量与两两比较成本各变成几倍？
