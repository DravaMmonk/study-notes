# COMP90086 Lecture 10 - Representation Learning

来源：`lecture/COMP90086-10-representations.pdf`（44 页，Week 5 Lecture 2）与 `transcript/COMP90086_2026_SM2 Week-05-F-transcript.txt`（原文件 `F-transcript-4.txt`）。Workshop 补充来自 `workshop/week-05/worksheet05_solution.ipynb`。PDF 封面写 Semester 2, 2025；这里按课程归档、Week 标题及 transcript 主题归入 2026 Week 5，保留原文件。下文页码均为 PDF 页码；截图里的交互按钮是静态画面。

本讲接着 [ViT](09-vit.md) 往下走：**不急着让网络回答“这是什么类别”，而是先把图像变成好用的表示，再检查这种表示保留了什么。** 主线是对比学习 → CLIP → 模型解释 → 泛化的边界。

## 1. PPT 5：什么是 representation 与 self-supervised learning

![PPT 5 - Self-supervised learning](assets/10-representations/slide-05.png)

**Representation（表示）** 是用一组数描述输入。**Encoder（编码器）** 是把图片转换成这组数的网络。把 CNN 最后的分类层去掉，前一层的输出就能作为表示；ViT 最终的 class token 也可以承担这个角色。这正是老师开头连接上一讲的方式。

**Embedding（嵌入向量）** 可以理解为图像在特征空间中的坐标。它通常还不是类别概率。好的表示应让任务相关的信息容易比较，而不是只保留原始像素。

PPT 区分三种学习信号：

- **Supervised learning（监督学习）**：人工给出图像及正确类别，用预测错误更新网络。
- **Unsupervised learning（无监督学习）**：没有类别标签，例如按数据结构聚类。
- **Self-supervised learning（自监督学习）**：从数据本身制造训练目标。没有人工类别标签，仍然有可以计算的 loss。

PPT 的两个例子分别是遮掉一块图片、预测缺失内容，以及生成同一张图的两个 views、判断它们是否配对。这里的 **view** 可以只是裁剪或翻转后的图，不一定是另一台相机拍摄的照片。**Proxy task（代理任务）** 是为了学表示而设置的中间任务；本讲主要研究配对。

## 2. PPT 6–7：把“学表示”变成一道选择题

![PPT 6 - Four images and their second views](assets/10-representations/slide-06.png)

沿着 PPT 的四张图片依次看：

1. 取一个 **mini-batch（小批次）**，里面有 4 张原图。
2. 对每张图裁剪、缩放或翻转，得到第二个 view。我们知道它来自哪张原图，因此自动知道正确配对。
3. Encoder 分别输出向量  $z_i$  与  $z'_j$ ，下标  $i,j$  表示图片编号。
4. 比较每个原图表示和每个第二 view，得到  $4\times4$  的相似度矩阵。
5. 对角线是同一原图的配对，即 **positive pairs（正对）**；其余在这个训练设计里被当作 **negative pairs（负对）**。
6. 每一行做 softmax，把四个分数变成和为 1 的选择概率，再提高正确列的概率。

这里的“类别”暂时就是这批候选 views，并非猫、狗等固定语义类别。**Vocabulary（候选词表）** 在这里借指要从中选择的候选集合；下一批数据可以换一套候选。

> **老师原话**：“the vocabulary is made from the data, that's the key.”

沿用 PPT 的第一行，正确配对占 98%，其他候选总共占 2%；模型已经能把正确 view 与其他图片分开。第二行正确项只有 74%，还有一个错误项占约 25%，意味着这一对还比较容易混淆。训练要改变 encoder 的参数，使这些配对更容易分开。

## 3. PPT 8：逐项读懂 contrastive loss

![PPT 8 - Contrastive loss and SimCLR candidates](assets/10-representations/slide-08.png)

**Contrastive learning（对比学习）** 的目标，是相对于候选负对，让正对更相似。PPT 使用 **cosine similarity（余弦相似度）**：

$$
\operatorname{sim}(a,b)=\frac{a^\top b}{\|a\|_2\|b\|_2}.
$$

 $a,b$  是非零特征向量， $a^\top b$  是点积， $\|a\|_2$  是向量长度。它比较向量方向，方向一致时为 1；不要把“相似度越大越像”误记成“距离越大越像”。Transcript 在这段交替使用 distance/similarity，笔记按 PPT 的 similarity 公式统一。

先看 PPT 上方的简化版本：

$$
\ell_i=-\log\frac{\exp(\operatorname{sim}(z_i,z'_i)/\tau)}{\sum_{j=1}^{N}\exp(\operatorname{sim}(z_i,z'_j)/\tau)}.
$$

 $N$  是原图数量；分子是第  $i$  张图的正确配对；分母遍历第二组的全部  $N$  个候选； $\exp$  把分数转成正数；比值就是正确列的 softmax 概率。最后取负对数，正确概率越接近 1，loss 越接近 0。并不是把所有候选相似度一起提高就算成功，而是要让正确项在同一行中胜出。

**Temperature（温度）**  $\tau>0$  控制分布的尖锐程度：固定相似度时，较小的  $\tau$  放大分数差异，较大的  $\tau$  使概率更平。PPT 将温度调大后，四个候选逐渐接近 25%。小温度不会自动让“正确项”获胜；它突出的是当前分数最高的项。

接着看下方的 SimCLR 版本。每张图做两个 views，共  $2N$  个 views。选择一个 view  $i$  为 **anchor（当前比较基准）**，它的正确伙伴为  $j$ ：

$$
\ell_{i,j}=-\log\frac{\exp(\operatorname{sim}(z_i,z_j)/\tau)}{\sum_{k=1}^{2N}\mathbf{1}_{[k\ne i]}\exp(\operatorname{sim}(z_i,z_k)/\tau)}.
$$

 $\mathbf{1}_{[k\ne i]}$  是指示函数：条件成立为 1，否则为 0。它排除 anchor 自己，不排除正对。因此候选是  $2N-1$  个：1 个正对、 $2(N-1)$  个负对。沿用四张原图，此时共有 8 个 views，一个 anchor 比较 7 个候选，其中 1 个正对、6 个负对。与上方四列示意图的区别只是候选集合扩大了。

## 4. PPT 11–13：CLIP 把另一条轴换成文字

![PPT 12 - CLIP image and text encoders](assets/10-representations/slide-12.png)

**CLIP** 是 Contrastive Language–Image Pretraining。原先两边都是图像，现在一边是图片，另一边是对应的 **caption（文字描述）**。Image encoder 与 text encoder 把两种输入变成可比较的向量；图文不需要拥有相同网络结构，但最终向量要能在同一空间中比较。

一个 batch 有  $N$  组图文，对应  $N^2$  种配法，其中  $N$  个原始配对在对角线上， $N^2-N$  个非配对项作为负例。图中双向比较的含义是既用图片找文字，也用文字找图片。

PPT 13 给出的训练规模是原始 CLIP 的 4 亿图文对。它减少的是专门逐张标注固定类别的需求，训练仍依赖已有图文对应关系。**共享 embedding space** 的价值在于：文字不必变成固定分类层的一列权重，也可以作为比较对象。

## 5. PPT 14–17：为什么它能 zero-shot 分类

![PPT 14 - Using class names as text prompts](assets/10-representations/slide-14.png)

按照 PPT 的例子，把类别名称写进 “A photo of a …” 这样的 **prompt（输入文字模板）**，用 text encoder 编成向量，再与待分类图像的向量比较，选择最相似的候选文字。

**Zero-shot（零样本）** 在这里指不针对这个下游分类任务重新训练模型。它不表示模型从未预训练，也不表示它能可靠识别任意概念。候选标签仍由使用者提供，模型是在这些候选中选择。

PPT 15–16 展示特定评测中 zero-shot CLIP 与训练过的 ResNet-50 的比较，以及数据分布变化时的表现。应读作这些实验的结果，不把它扩写成“CLIP 在所有任务上都更稳健”。PPT 17 还指出共享图文表示可以支持图文筛选、伪标签和向其他模型提供图像特征。**Pseudo-label（伪标签）** 是模型自动给出的标签，不能等同人工核验过的真值。

## 6. PPT 20–23：表示空间里，哪些图像靠近

![PPT 21 - Neighbours in feature space](assets/10-representations/slide-21.png)

**Nearest neighbours（最近邻）** 是找特征向量最接近的图片。PPT 左侧提醒像素空间的相似未必等于语义相似；右侧同一行的花、大象、船可以有不同姿态与背景，特征空间仍可能把它们放近。

要检查的是“网络认为哪些样本相似”，而不是只看最终分类对了几张。这能帮助发现表示究竟关注物体、纹理还是背景。

![PPT 22 - PCA and t-SNE](assets/10-representations/slide-22.png)

高维向量不能直接画在二维纸上，所以要 **dimensionality reduction（降维）**。**PCA（主成分分析）** 选择变化较大的方向来投影；**t-SNE** 尽量让高维近邻在二维或三维图上仍靠近。

PPT 特别强调 t-SNE 的局部解释：可以观察哪些点形成邻近的小群，不能把两团之间的距离当成可靠的原空间距离。PPT 23 的 Birds200／Cars196 图展示未参与训练的类别也能聚在一起；这说明该实验学到的表示可以迁移，不能据此保证任意新类别都会分开。

## 7. PPT 24–26：遮住哪里，分类最受影响

![PPT 25 - Elephant occlusion experiment](assets/10-representations/slide-25.png)

**Occlusion（遮挡）** 在此是一个检查方法：先记录原图对某个类别的分数，再用遮挡块盖住不同位置，重新预测。

沿用 PPT 的大象例子：原分数 0.98；盖住旁边背景变成 0.96，下降 0.02；盖住头部变成 0.70，下降 0.28。说明在这个输入和遮挡设置下，头部区域更影响该类别得分。PPT 明确把这些数字标为示意分数，不是本次运行实验的输出。

把遮挡窗口逐点移动，就能画出位置与分数下降的关系。PPT 26 的 go-kart 例子中，赛道背景也会影响预测：模型可能同时利用物体和上下文。

> **老师原话**：“which pixels if I removed them? Harm the classification the most.”

## 8. PPT 27–29：CAM 与 Grad-CAM 怎样产生位置图

![PPT 27 - Class Activation Mapping](assets/10-representations/slide-27.png)

**Feature map（特征图）** 保留每个位置的网络响应。**Global average pooling（GAP，全局平均池化）** 在每个 channel 内对所有空间位置取平均，把一张特征图变成一个数。分类层再对这些数加权。

**CAM（Class Activation Mapping）** 把分类权重重新用于对应的空间特征图：某个 channel 对目标类别越重要，它响应强的位置就获得越大贡献。图中的彩色热区显示该类别相关的区域。同一张图换一个目标类别，权重会变，热区也可能变。

![PPT 29 - Grad-CAM for cat and dog](assets/10-representations/slide-29.png)

**Gradient（梯度）** 描述类别分数对某个中间响应的敏感程度。**Grad-CAM** 使用这种梯度来估计各特征图对类别的作用，因此不必为 CAM 特意改成 GAP 接分类层的结构。看 PPT 猫狗同框的例子：询问 cat 和 dog，会突出不同区域。

这三种方法分别是遮挡后重新预测、使用分类层权重、使用类别分数的梯度。先理解它们如何得到图，不需要在本讲之外补学完整实现。

### Workshop 5 补充：filters 与 feature maps 不是同一件事

Notebook 原设计先加载预训练 VGG16，再查看第一层前六个 filters 的三个输入 channels，随后将 `harry.png` 输入网络，显示第一层的 64 张 feature maps。

**Filter** 是训练得到的权重；**feature map** 是这些权重作用于某张图的结果。换输入图片会改变 feature maps，不会因此改掉已经加载的 filters。原练习第一层输出是  $224\times224\times64$ ；64 张空间图按  $8\times8$  排列只是为了显示。

Workshop 最后一部分加载 ResNet50，设置 `include_top=False`，取 `conv3_block4_out` 作为输出，并对 `wallaby.jpeg` 提取特征。**Residual connection（残差连接）** 将输入加到学到的变换上，帮助网络学习修正量。这些是 notebook 的原始任务，本次没有重新训练或运行模型，也没有把中间 feature map 称为类别预测。

## 9. PPT 30–33：一个 attention head 在贡献什么

![PPT 31 - Decomposing the class token](assets/10-representations/slide-31.png)

回忆 ViT 的 class token：它通过各层 attention 与 MLP 不断吸收信息。PPT 的表达式将最终 class token 写成初始 token、各 attention contributions 与各 MLP contributions 的相加。

图中  $L$  是层数， $H$  是每层 head 数， $N$  是参与分解的 patch 数； $y_{i,h,l}$  表示第  $l$  层、第  $h$  个 head 中来自第  $i$  个 patch 的贡献。 $Q,K,V$  仍是上一讲的 query、key、value， $W_O$  是输出投影， $D$  是缩放使用的维度。沿 patch、head、layer 分组求和，就能分别问“哪个位置”“哪个 head”贡献了什么。

CLIP 的文字和图像处于可比较空间，因此课件展示用文字描述这些贡献，例如 pyramid 与 camel。这是 PPT 中的特定解释方法；并不是每个 head 都被预先指定了一个人类词语。先读懂“总和可以按来源拆开”即可。

## 10. PPT 35–40：分类准确，不代表按人的方式理解形状

![PPT 36 - BagNet local patches](assets/10-representations/slide-36.png)

**Invariance（不变性）** 指输入某方面改变，所关心的输出仍不变；实际实验常只能证明 **tolerance（容忍度）**。本讲依次讨论光照、平移、平面旋转、尺度和三维姿态变化。三维姿态改变可能露出新表面，不能仅当成二维图片旋转。

**BagNet** 用独立的小 patches 作判断再汇总，仍能在 PPT 所示分类任务上取得较好结果。图中狗的局部区域已能提供类别线索；分类不一定需要完整全局形状。

![PPT 37 - Texture versus silhouette and edges](assets/10-representations/slide-37.png)

沿 PPT 的猫图比较：原图、灰度图、纯剪影、边缘图、纹理图保留了不同信息。**Texture（纹理）** 是局部重复或细碎的外观模式；**shape（形状）** 是整体轮廓或布局。图中的 CNN 在只剩剪影、边缘时明显退步，而保留纹理时仍容易识别。

PPT 38 的特定 VGG-16 实验中，纹理化图片打乱布局后准确率由 90% 变成 79%。这个例子说明局部线索可以承担很大一部分判断，不代表所有视觉任务都能忽略布局；下一讲做几何匹配就需要精确位置。

![PPT 40 - Training distortion and test distortion](assets/10-representations/slide-40.png)

读这类矩阵时，一条轴表示训练时使用的扰动，另一条表示测试时使用的扰动。**Distortion（失真／扰动）** 包括灰度、对比度、滤波和噪声等改变。模型在一种扰动上训练后改善，不保证改善其他扰动。要检查实际要面对的变化，不能把“做过数据增强”当作获得了所有不变性。

## 11. PPT 41–43：训练分布并不等于整个世界

![PPT 41 - Geographic distribution of images](assets/10-representations/slide-41.png)

**Distribution（分布）** 在这里包括图片来自哪里、展示什么物体、以什么条件拍摄。地图显示训练图片来源不均衡。如果常见训练外观只覆盖一部分环境，新环境的物体可能难以识别。

![PPT 42 - Household appearance and recognition](assets/10-representations/slide-42.png)

PPT 用不同家庭环境下的同类物体说明：功能或类别相同，不等于像素外观相同。课堂的核心提醒是评价模型时看清数据来源，以及准确率差异落在哪些样本上。

> **老师原话**：“you should be worried about where your data comes from.”

## 本讲复习

1. Representation 是网络提取的表示，不一定是类别概率；self-supervision 从数据构造训练目标。
2. 对比学习将正对与负对放在一起比较；softmax loss 要提高正确候选的相对概率。
3. SimCLR 的一个 anchor 有  $2N-1$  个候选，包括一个正对。
4. CLIP 将图像与文字对齐；zero-shot 使用候选文字分类，不需要为该任务重新训练。
5. 最近邻／PCA／t-SNE 看表示空间；occlusion／CAM／Grad-CAM 看图像位置；head 分解看组件贡献。
6. 纹理、噪声和数据来源实验提醒我们：测试准确率不能证明模型具备普遍不变性。
