# COMP90086 Lecture 9 - Vision Transformers

来源：`lecture/COMP90086-09-ViT.pdf` 与 `transcript/COMP90086_2026_SM2 Week-05-W-transcript.txt`（原下载名 `W-transcript-4.txt`，按讲课主题确认是 Week 5 ViT）。正文以 PPT 为主，原话放在对应概念旁；原有 Week 5 论文简介属于可选延伸。

先记住：**Vision Transformer（ViT）把图片切成许多小块，把每个小块当成一个 token，再用 self-attention 学习任意两个图像区域之间的关系。** CNN 天生优先处理局部邻域；ViT 第一层就能比较相距很远的 patches，但通常需要更多数据来学会 CNN 已经写进结构里的图像规律。

## 1. Inductive bias：模型在看数据前已经相信什么

**Inductive bias（归纳偏置）** 是模型在训练前就带有的假设或限制。它会让学习算法优先选择某些解，而不是把所有可能的解都同等对待。

这不是“错误的偏见”。当训练数据有限时，合理的 inductive bias 可以缩小搜索范围，让模型更容易学到能够 generalise 的规律。

例如，一张  $224\times224\times3$  图片有  $150{,}528$  个数值。如果允许模型任意组合所有 pixels，可能的关系多得无法穷举。CNN 通过结构提前加入两个重要假设：

- **Locality（局部性）**：相邻 pixels 更可能共同组成有意义的 feature，例如 edge 或 texture。
- **Translation equivariance（平移等变性）**：同一个 filter 在整张图片上共享，所以同一 feature 移到别处时，feature map 中的响应也跟着移动。

![Slide 6 - Inductive biases of CNNs](assets/09-vit/slide-06.png)

一个  $3\times3$  convolution 的单个输出只能直接看到  $3\times3$  范围。连续堆叠、stride 都为 1 时，receptive field 才逐层变大：

$$
r_L = 1 + 2L.
$$

这里  $L$  是  $3\times3$  convolution 的层数。1 层看到  $3\times3$ ，2 层看到  $5\times5$ ，3 层看到  $7\times7$ 。因此 CNN 不是完全看不到远距离关系，而是要经过多层，先组合局部信息，再逐渐形成更大范围的 feature。

Self-attention 不同：一个 token 在第一层就可以读取所有其他 tokens，所以它一开始就有全局 receptive field。它没有被强制要求“先看附近，再看远处”。这给了模型更大的自由，也减少了 CNN 的 locality bias。

> **老师原话**：“it's using the same weights on every patch”

## 2. 为什么把图片看成一串 tokens

Transformer 最早是为文字序列设计的。句子已经自然地分成 words，但图片没有现成的 word boundary，所以 ViT 使用一个简单规则：把图片切成固定大小、互不重叠的 **patches**。

![Slide 14 - Image patches become a token sequence](assets/09-vit/slide-14.png)

假设输入图片大小为  $H\times W\times C$ ：

-  $H$ ：height；
-  $W$ ：width；
-  $C$ ：channels，RGB 图片通常为 3；
- 每个 patch 的大小为  $P\times P$ 。

如果  $H$  和  $W$  都能被  $P$  整除，patch 数量是：

$$
N=\frac{H}{P}\times\frac{W}{P}=\frac{HW}{P^2}.
$$

例如  $224\times224$  图片使用  $16\times16$  patches：

$$
N=\frac{224}{16}\times\frac{224}{16}=14\times14=196.
$$

每个 RGB patch 原本有  $P\times P\times3$  个数。把它 flatten 后， $16\times16$  patch 会变成长度  $16\times16\times3=768$  的向量。接着通过一个 learned linear layer，把它转换成长度为  $D$  的 **patch embedding**：

$$
z_i = x_iE+b,
$$

其中  $x_i$  是第  $i$  个 flattened patch；projection matrix 和 bias 分别记为  $E,b$ ，它们都是训练学到的参数。输出  $z_i\in\mathbb{R}^{D}$ 。这一步不是在预测类别，而是在把每个 patch 转成 Transformer 能统一处理的 token representation。

## 3. Position：为什么只给 patches 还不够

如果只把 patch embeddings 交给 self-attention，模型知道“有哪些 patches”，却不知道它们原来位于图片的哪里。把 patches 打乱后，attention 的输出也只会跟着打乱；它本身不会因为“左上角”或“右下角”而改变计算规则。

但视觉关系经常依赖位置：两只眼睛在鼻子上方可能组成脸，同样的局部 features 换一种排列就可能不是脸。因此 ViT 给每个 patch 加上 **positional embedding/encoding**：

$$
\tilde z_i=z_i+p_i,
$$

其中  $p_i$  表示第  $i$  个位置。这里是逐元素相加，不是把两个向量首尾拼起来。

![Slide 19 - Positional encoding](assets/09-vit/slide-19.png)

可以把  $p_i$  想成 patch 随身携带的“地址标签”。即使 token 顺序被重新排列，地址仍跟着对应 patch，模型仍有机会推断原来的空间布局。

## 4. Self-attention 到底在算什么

Self-attention 的核心问题是：**对于当前 patch，我应该从其他哪些 patches 读取多少信息？**

### 4.1 Query、Key、Value 的直觉

![Slide 15 - Queries, keys and values](assets/09-vit/slide-15.png)

同一个输入 token  $x_i$  会经过三个不同的 learned linear transformations：

$$
q_i=x_iW_Q,\qquad k_i=x_iW_K,\qquad v_i=x_iW_V.
$$

- **Query（Q）**：当前 token 正在寻找什么。
- **Key（K）**：每个 token 用什么特征说明“我可能与你有关”。
- **Value（V）**：如果另一个 token 注意到我，我实际提供什么信息。

一个直观比喻是查资料：query 是检索词，key 是每份资料的索引，value 是资料正文。检索词和某个索引越匹配，就从那份正文中读取越多内容。

Q、K、V 都来自输入 tokens，但使用不同参数矩阵，所以它们能学成不同用途的表示。训练不会人工指定“这个 head 找眼睛、那个 head 找轮廓”；这些参数由最终任务的 loss 通过 backpropagation 一起更新。

### 4.2 从相似度变成加权平均

把所有 queries、keys、values 分别堆成矩阵  $Q,K,V$ ，标准 scaled dot-product attention 写成：

$$
\operatorname{Attention}(Q,K,V)
=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V.
$$

按顺序拆开：

1.  $QK^\top$  比较每一个 query 和每一个 key，得到一个  $N\times N$  的 score matrix。
2. 除以  $\sqrt{d_k}$ ，避免向量维度增大时 dot product 过大，导致 softmax 太接近 0 或 1、gradient 很小。
3. softmax 把每一行变成和为 1 的 weights。
4. 用这些 weights 对所有 value vectors 做加权平均，得到每个 token 的新表示。

![Slide 16 - One attention head](assets/09-vit/slide-16.png)

以第 6 个 patch 为例，它的 query  $q_6$  会与所有 keys 比较，而不是只比较相邻 patches。假如它与第 4、10 个 keys 最匹配，那么输出  $y_6$  会主要吸收  $v_4$  和  $v_{10}$  的信息。

所以 attention 不是“选中一个 patch 后复制它”，而是产生一组连续 weights，再对所有 values 做加权组合。

## 5. Multi-head attention：为什么需要多个 heads

一个 attention head 只有一组  $W_Q,W_K,W_V$ ，因此只有一种 learned matching rule。**Multi-head attention** 并行运行多个 heads，让模型能够同时寻找不同类型的关系。

例如，某些 heads 可能更关注颜色相似性，另一些可能更关注物体远距离部件的组合。这里只是帮助理解的可能情况，不代表每个 head 一定能被人类清楚命名。

把 embedding width 和 head count 分别记为  $D,h$ ，常见做法是让每个 head 的宽度为：

$$
d_k=d_v=\frac{D}{h}.
$$

各 heads 的输出先 concatenate 回宽度  $D$ ，再通过输出矩阵  $W_O$  混合。这样增加 heads 不一定按比例增加总参数量，因为每个 head 同时变窄了。

## 6. 一个 Transformer encoder block 做两件事

![Slide 21 - Transformer encoder block](assets/09-vit/slide-21.png)

每个 encoder block 交替做两种 processing：

1. **Multi-head self-attention**：在 tokens 之间传递信息。只有这一步会让一个 patch 直接读取其他 patches。
2. **MLP**：对每个 token 独立做非线性变换。不同 tokens 使用同一组 MLP 参数，但这一小步不会互相读取。

slides 中的 pre-norm block 可以写成：

$$
X'=X+\operatorname{MSA}(\operatorname{LN}(X)),
$$

$$
Y=X'+\operatorname{MLP}(\operatorname{LN}(X')).
$$

- **LayerNorm（LN）** 帮助稳定每个 token 内部 feature dimensions 的尺度。
- **Residual connection** 把输入直接加回输出。attention 或 MLP 学的是对原表示的修正，不必每层重新建立全部信息。
- **MLP** 通常包含两个 linear layers 和中间的 non-linear activation。

这些 blocks 会重复  $L$  次。position information 在进入第一层前加入一次，然后和 token representation 一起沿网络传递。

## 7. 完整 ViT 如何得到分类结果

![Slide 22 - Complete Vision Transformer](assets/09-vit/slide-22.png)

完整流程可以按下面一条线理解：

$$
\text{image}
\rightarrow \text{patches}
\rightarrow \text{patch embeddings + positions}
\rightarrow L\text{ encoder blocks}
\rightarrow \text{classification head}.
$$

ViT 还在 patch sequence 前加入一个可学习的 **class token**，常写为 `[CLS]`。它不是图片中真实存在的 patch，而是一个专门用来汇总全图信息的额外 token。

因为 `[CLS]` 也参加每层 self-attention，它可以不断从所有 patch tokens 读取信息。经过最后一个 encoder block 后，模型把 `[CLS]` 的 representation 送入 MLP head，输出类别分数。

> **老师原话**：“It generates keys and queries and values just like all the others, and it participates in this information sharing process.”

因此  $224\times224$ 、patch size 16 的 ViT 不只是 196 个 tokens，而是：

$$
N=196+1=197,
$$

多出来的 1 就是 class token。

## 8. CNN 与 ViT 的关键区别

| 问题 | CNN | ViT |
| --- | --- | --- |
| 第一层能直接看多远 | 小 kernel 的局部邻域 | 每个 token 可注意所有 tokens |
| 空间结构如何进入模型 | convolution 的局部连接与 weight sharing | patch 划分加 positional embedding |
| 平移相关假设 | architecture 中较强 | 不像 CNN 那样直接写入结构 |
| 学远距离关系 | 需堆叠多层扩大 receptive field | 第一层 self-attention 就可建立 |
| 小数据上的倾向 | inductive bias 通常更有帮助 | 更容易因自由度大而 overfit |
| token/feature 数量的代价 | 依 convolution feature maps 而定 | 标准 attention 对 token 数是二次成本 |

slides 的结论需要谨慎理解：不是“Transformer 永远优于 CNN”，也不是“ViT 没有 inductive bias”。ViT 仍然假设固定 patch grid、patch scale 和某种 position representation。更准确的说法是：**ViT 使用了与 CNN 不同、较弱的 locality 和 translation bias。**

![Slide 27 - Data scale and inductive bias](assets/09-vit/slide-27.png)

原始 ViT 工作强调 large-scale pretraining 后再 transfer 到较小数据集。slides 也提醒，CNN/ViT 的比较会受 training recipe、data scale 和 compute budget 影响，不能只看 architecture 名字就判断谁更好。

## 9. Patch size 为什么不能无限变小

更小的 patch 能保留更细的 spatial detail，但会迅速增加 token 数。

对固定图片大小，patch 边长从  $P$  减半到  $P/2$  时：

$$
N'=\frac{HW}{(P/2)^2}=4N.
$$

标准 self-attention 需要比较所有 token pairs，主要 attention score 成本随  $N^2$  增长。因此 token 数变为 4 倍时，这部分成本约变为：

$$
(4N)^2=16N^2.
$$

![Slide 32 - Patch size and quadratic attention cost](assets/09-vit/slide-32.png)

大 patch 较便宜，却可能把小物体或边界粗暴切开；小 patch 更精细，却更贵。Swin Transformer 等后续方法让 attention 先在 local windows 中计算，并在下一层移动窗口，使信息仍能跨越原来的边界。

![Slide 33 - Shifted local windows](assets/09-vit/slide-33.png)

这可以看成把一部分 locality bias 加回 Transformer，以更低成本处理更细的视觉结构。

> **老师原话**：“we've got this quadratic computational cost with the number of patches.”

## 10. Week 5 扩展阅读

<details markdown="1">
<summary>延伸内容（可选）：ViT 与 CLIP 原论文</summary>


这些资源是课程列出的 optional readings，不是作业要求。

### 10.1 ViT 原论文

[An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale](https://arxiv.org/abs/2010.11929)

它与本讲直接对应：把图片切成 fixed-size patches，对 flattened patches 做 linear embedding，再使用标准 Transformer encoder。论文重点不是声称“任何情况下 ViT 都最好”，而是展示 pure Transformer 在大量数据预训练并 transfer 后可以达到很强的 image-classification 结果。

建议带着三个问题阅读：

1. patch embedding 怎样把 2D image 变成 1D sequence；
2. data scale 增大时 ViT 与 CNN 的表现怎样变化；
3. pretrained model 怎样 fine-tune 到较小的 downstream dataset。

### 10.2 CLIP 原论文

[Learning Transferable Visual Models From Natural Language Supervision](https://arxiv.org/abs/2103.00020)

CLIP 不只是“另一种 ViT architecture”。它改变的是训练监督：同时训练 image encoder 和 text encoder，让正确的 image-caption pair 在 embedding space 中靠近，不匹配的 pairs 远离。训练完成后，可以把类别名称写成 text prompts，并比较 image embedding 与各 text embeddings，从而做 zero-shot classification。

它和本讲的联系是：ViT 可以作为 CLIP 的 image encoder；它和上一讲 transfer learning 的联系是：大规模预训练得到的 representation 可以迁移到下游任务。

</details>

## 11. Week 5 workshop 如何连接前几讲

本地 `workshop/week-05/` 保存了：

- `worksheet05.ipynb` 与 `worksheet05_solution.ipynb`；
- `harry.png` 与 `wallaby.jpeg` 两张练习图片。

workshop 的重点仍然是 CNN，而不是实现 ViT：

1. 手算 standard convolution、pooling 和 dense layer 的参数量；
2. 查看 VGG16 filters 与 feature maps；
3. 比较 standard convolution 和 depthwise separable convolution；
4. 使用 pretrained ResNet50 的中间层提取 features。

原始练习的参数计算补充见 [CNNs II](07-cnns-ii.md)，filters、feature maps 与 ResNet50 特征提取见 [Representation Learning](10-representations.md)。

它帮助你巩固前几讲的 CNN baseline。只有先理解 CNN 的 parameter sharing、feature hierarchy、separable convolution 和 pretrained features，才能具体比较 ViT 放弃了什么 bias、又通过 attention 获得了什么能力。

## 12. 容易混淆的地方

- **Patch 不是语义完整的 object part**：它只是按固定网格切下来的像素块，可能正好切断物体边界。
- **Embedding 不是 classification result**：它是给后续 layers 使用的 feature vector。
- **Self-attention 不是只关注一个位置**：softmax 通常给所有 tokens 分配不同大小的 weights。
- **Q、K、V 不是三份独立输入**：在 self-attention 中，它们都由同一组 input tokens 通过不同 learned matrices 得到。
- **Positional embedding 不是 attention 自动产生的**：位置必须以额外信息加入，否则模型没有图像原始顺序。
- **全局 receptive field 不等于已经理解全局关系**：ViT 结构允许第一层比较所有 patches，但有用的 attention patterns 仍要从训练数据中学到。
- **ViT 不是完全没有 inductive bias**：patch size、grid 和 position representation 本身都是设计假设。
- **更小 patch 不一定更好**：细节增加的同时，标准 attention 成本会快速上升。

## 13. 本讲复习

1. Inductive bias 是模型在看数据前就带有的假设；CNN 的重要 biases 包括 locality 和 translation equivariance。
2. ViT 把  $H\times W\times C$  图片切成  $N=HW/P^2$  个 patches，再把每个 patch 投影成  $D$  维 embedding。
3. Positional embedding 告诉模型每个 patch 的位置；class token 用于汇总全图并执行分类。
4. Self-attention 用 query-key similarity 产生 weights，再对 values 做加权平均。
5. Multi-head attention 让模型并行学习多种关系；MLP 则独立处理每个 token。
6. Encoder block 使用 LayerNorm、attention、MLP 和两条 residual connections，并重复  $L$  次。
7. ViT 可以在第一层建立远距离关系，但弱化了 CNN 的 locality bias，通常更依赖 data scale 和 pretraining。
8. 标准 attention 对 token 数量有  $O(N^2)$  成本，因此 patch size 是细节与计算量之间的取舍。
