# 图像生成

[词条索引与使用方法](README.md) · [专题主线与补充关](../LEARNING-PATHS.md)

每个词条注明来源与直接前置。下面的层级是学习设计，验收活动均为自拟，尚未接入游戏。

<a id="probability"></a>
## 概率密度与条件生成

- 编号：`probability`
- 分类：**讲义内容**
- 出处：[L15 PDF](../lecture/COMP90086-15-Generation.pdf)，PDF p.5–18；对照 `transcript/COMP90086_2026_SM2 Week-08-W-transcript.txt` 相应主题段。
- 依赖：[视觉任务与输出](01-image-formation.md#vision-task)
- 层级：**关卡**

判别模型预测 p(y|x)，条件生成模型描述 p(x|y)，无条件生成关注 p(x) 或从它采样。连续变量的密度值不等于单点概率；Bayes 关系不意味着分类器能直接反转成图像生成器。

**关卡验收（自拟）**：标明三种模型的输入输出，并解释仅有 p(y|x) 为何不足以直接画出类别 y 的图像。

<a id="autoencoder"></a>
## 自编码器与瓶颈

- 编号：`autoencoder`
- 分类：**讲义内容**
- 出处：[L15 PDF](../lecture/COMP90086-15-Generation.pdf)，PDF p.22–30；对照 `transcript/COMP90086_2026_SM2 Week-08-W-transcript.txt` 相应主题段。
- 依赖：[分类表示与神经网络](03-learning.md#recognition)、[Softmax 与交叉熵](03-learning.md#classification-loss)
- 层级：**关卡**

编码器把图像变成表示 z，解码器重建图像，以输入本身作为目标。瓶颈限制表示容量。重建学得好不保证任意随机 z 都落在有效区域，因此普通 AE 不自动成为可靠采样模型。

**关卡验收（自拟）**：分别画训练重建路径和随机潜变量生成路径，指出后者缺少何种分布约束。

<a id="vae"></a>
## VAE、重参数化与两项损失

- 编号：`vae`
- 分类：**讲义内容**
- 出处：[L15 PDF](../lecture/COMP90086-15-Generation.pdf)，PDF p.31–38；对照 `transcript/COMP90086_2026_SM2 Week-08-W-transcript.txt` 相应主题段。
- 依赖：[自编码器与瓶颈](05-generation.md#autoencoder)、[概率密度与条件生成](05-generation.md#probability)
- 层级：**关卡**

编码器输出潜变量分布参数而非单个点；以 z=μ+σ·ε、ε 来自标准高斯完成采样。重建项约束图像，KL 项约束后验与先验的接近程度。KL 不负责直接比较像素。

**关卡验收（自拟）**：追踪 μ、σ、ε 与 z，区分两项损失；生成时从先验采样而非要求先输入原图。

<a id="latent-sampling"></a>
## 潜空间采样与编辑

- 编号：`latent-sampling`
- 分类：**讲义内容**
- 出处：[L15 PDF](../lecture/COMP90086-15-Generation.pdf)，PDF p.39–46；对照 `transcript/COMP90086_2026_SM2 Week-08-W-transcript.txt` 相应主题段。
- 依赖：[VAE、重参数化与两项损失](05-generation.md#vae)
- 层级：**任务**

生成时先抽潜变量再解码；插值或改变坐标可观察表示学到了什么。某个坐标变化与属性相关，不表示每个维度天然只控制一个独立语义，生成质量仍需检查。

**任务验收（自拟）**：比较先验采样和两个编码点间插值，说明重建图、插值图和新样本的来源不同。

<a id="gan"></a>
## GAN 的生成器与判别器

- 编号：`gan`
- 分类：**讲义内容**
- 出处：[L16 PDF](../lecture/COMP90086-16-GANs.pdf)，PDF p.7–14；对照 `transcript/COMP90086_2026_SM2 Week-08-F-transcript.txt` 相应主题段。
- 依赖：[概率密度与条件生成](05-generation.md#probability)、[分类表示与神经网络](03-learning.md#recognition)
- 层级：**关卡**

生成器把随机潜变量映成图像，判别器区分真实与生成输入。两者优化不同参数并交替训练。GAN 是隐式生成模型：会采样不等于显式计算任意图像的概率密度。

**关卡验收（自拟）**：分别标记更新判别器和生成器时的参数与梯度路径，禁止把两者同时当成同方向最小化。

<a id="gan-stability"></a>
## 对抗平衡与模式坍塌

- 编号：`gan-stability`
- 分类：**讲义内容**
- 出处：[L16 PDF](../lecture/COMP90086-16-GANs.pdf)，PDF p.15、19、29–33；对照 `transcript/COMP90086_2026_SM2 Week-08-F-transcript.txt` 相应主题段。
- 依赖：[GAN 的生成器与判别器](05-generation.md#gan)
- 层级：**任务**

判别器过强或过弱都会影响生成器获得有用反馈。模式坍塌是只覆盖少数变化，不能仅凭一张逼真样本排除。训练达到某种平衡也不证明已经学到真实分布。

**任务验收（自拟）**：比较逼真但重复与多样但失真的样本集合，分别指出质量问题和覆盖问题。

<a id="generation-evaluation"></a>
## 记忆、逼真度与多样性

- 编号：`generation-evaluation`
- 分类：**讲义内容**
- 出处：[L16 PDF](../lecture/COMP90086-16-GANs.pdf)，PDF p.21–33；对照 `transcript/COMP90086_2026_SM2 Week-08-F-transcript.txt` 相应主题段。
- 依赖：[对抗平衡与模式坍塌](05-generation.md#gan-stability)、[训练、验证与测试](03-learning.md#train-split)
- 层级：**关卡**

生成评估要分别检查是否记忆训练样本、是否逼真、是否多样。Inception score 奖励单图分类明确和总体类别分散，却可能漏掉类内重复；高分不能单独证明没有记忆或没有伪影。

**关卡验收（自拟）**：审查一组每类反复生成同一图的样本，解释为何某种分数可能看好它，并提出训练邻居与重复检查。

<a id="conditional-gan"></a>
## 条件 GAN 与循环一致性

- 编号：`conditional-gan`
- 分类：**讲义内容**
- 出处：[L16 PDF](../lecture/COMP90086-16-GANs.pdf)，PDF p.35–40；对照 `transcript/COMP90086_2026_SM2 Week-08-F-transcript.txt` 相应主题段。
- 依赖：[GAN 的生成器与判别器](05-generation.md#gan)
- 层级：**任务**

条件 GAN 同时使用图像与条件来辨别配对是否真实。CycleGAN 用两个方向的映射、域判别和往返重建约束学习非配对转换；仍需两个域的数据，循环一致性也不保证目标语义唯一。

**任务验收（自拟）**：区分配对照片草图与非配对马斑马数据，画出两种训练信号及各自未保证的性质。

<a id="gaussian-noise"></a>
## 高斯噪声与方差相加

- 编号：`gaussian-noise`
- 分类：**讲义内容**
- 出处：[L17 PDF](../lecture/COMP90086-17-Diffusion.pdf)，PDF p.10–13；对照 `transcript/COMP90086_2026_SM2 Week-09-W-transcript.txt` 相应主题段。
- 依赖：[概率密度与条件生成](05-generation.md#probability)、[像素、坐标与通道](01-image-formation.md#pixels)
- 层级：**关卡**

扩散每步混合旧样本与独立高斯噪声。独立零均值噪声 aε₁+bε₂ 的方差是 a²+b²；标准差需要再开平方。因此公式里的噪声系数 √β 对应方差 β，不能把两者直接相加。

**关卡验收（自拟）**：手算两个独立噪声的混合方差；对比复用同一噪声时协方差不为零的情况。

<a id="forward-diffusion"></a>
## 前向扩散与累计信号

- 编号：`forward-diffusion`
- 分类：**讲义内容**
- 出处：[L17 PDF](../lecture/COMP90086-17-Diffusion.pdf)，PDF p.10–14；对照 `transcript/COMP90086_2026_SM2 Week-09-W-transcript.txt` 相应主题段。
- 依赖：[高斯噪声与方差相加](05-generation.md#gaussian-noise)
- 层级：**关卡**

每步 $x_t=\sqrt{1-\beta_t}x_{t-1}+\sqrt{\beta_t}\epsilon_t$。定义 $\bar\alpha_t=\prod_{i=1}^{t}(1-\beta_i)$，可直接抽样 $x_t=\sqrt{\bar\alpha_t}x_0+\sqrt{1-\bar\alpha_t}\epsilon$。等效噪声合并了独立随机项，不是重复使用同一噪声。

**关卡验收（自拟）**：算两步的累计信号与噪声方差，比较逐步采样和直接采样的分布；两种随机结果无需逐像素相等。

<a id="noise-prediction"></a>
## 时间条件与噪声预测训练

- 编号：`noise-prediction`
- 分类：**讲义内容**
- 出处：[L17 PDF](../lecture/COMP90086-17-Diffusion.pdf)，PDF p.19–24；对照 `transcript/COMP90086_2026_SM2 Week-09-W-transcript.txt` 相应主题段。
- 依赖：[前向扩散与累计信号](05-generation.md#forward-diffusion)、[分类表示与神经网络](03-learning.md#recognition)
- 层级：**关卡**

训练取原图、时间步和噪声，构造 $x_t$，让网络根据 $(x_t,t)$ 估计噪声或原图。噪声预测可用 MSE，真值来自人为加噪，未要求人工逐图标注。时间步让网络知道当前信噪比例。

**关卡验收（自拟）**：列出一次训练的已知量、网络输入、预测与目标，检查是否误把真实原图作为生成时输入。

<a id="reverse-diffusion"></a>
## 反向生成与采样器边界

- 编号：`reverse-diffusion`
- 分类：**讲义内容**
- 出处：[L17 PDF](../lecture/COMP90086-17-Diffusion.pdf)，PDF p.21–28；对照 `transcript/COMP90086_2026_SM2 Week-09-W-transcript.txt` 相应主题段。
- 依赖：[时间条件与噪声预测训练](05-generation.md#noise-prediction)
- 层级：**关卡**

由预测噪声可估计 $\hat x_0=(x_t-\sqrt{1-\bar\alpha_t}\hat\epsilon)/\sqrt{\bar\alpha_t}$。从纯噪声开始反复更新，网络预测会进入下一步输入。讲义 p.27 给出用预测原图和预测噪声构造较低噪声状态的示意；具体采样器仍需明确更新和随机项。

**关卡验收（自拟）**：按讲义的一步示意从预测噪声算原图估计和下一状态，注明系数；解释生成时为何不能拿真实噪声计算误差。

<a id="latent-diffusion"></a>
## 潜空间扩散

- 编号：`latent-diffusion`
- 分类：**讲义内容**
- 出处：[L17 PDF](../lecture/COMP90086-17-Diffusion.pdf)，PDF p.30、35；对照 `transcript/COMP90086_2026_SM2 Week-09-W-transcript.txt` 相应主题段。
- 依赖：[自编码器与瓶颈](05-generation.md#autoencoder)、[反向生成与采样器边界](05-generation.md#reverse-diffusion)
- 层级：**任务**

先用编码器把图像压缩成 z，再对 z 加噪并去噪，最终由解码器输出图像。它减少去噪网络处理的空间规模；不是只把像素数组换个名字，压缩和解码质量都会影响输出。

**任务验收（自拟）**：在流程图中标出像素空间与潜空间，指出训练或采样过程中哪些步骤需编码器和解码器。

<a id="conditional-diffusion"></a>
## 条件扩散与补全

- 编号：`conditional-diffusion`
- 分类：**讲义内容**
- 出处：[L17 PDF](../lecture/COMP90086-17-Diffusion.pdf)，PDF p.31–35；对照 `transcript/COMP90086_2026_SM2 Week-09-W-transcript.txt` 相应主题段。
- 依赖：[反向生成与采样器边界](05-generation.md#reverse-diffusion)、[CLIP 与零样本分类](03-learning.md#clip)
- 层级：**任务**

可以把类别、文本表示或另一幅图连同带噪输入交给网络。图像补全还需要掩码指定待生成区域。条件限定生成方向，但相同条件仍可产生多个样本；并非每种条件都必须使用 CLIP。

**任务验收（自拟）**：区分类别、文本、图像和掩码条件，画出补全时需保留与需生成的区域。

<a id="generation-cost"></a>
## 生成模型的质量与采样成本

- 编号：`generation-cost`
- 分类：**讲义内容**
- 出处：[L17 PDF](../lecture/COMP90086-17-Diffusion.pdf)，PDF p.36；对照 `transcript/COMP90086_2026_SM2 Week-09-W-transcript.txt` 相应主题段。
- 依赖：[记忆、逼真度与多样性](05-generation.md#generation-evaluation)、[反向生成与采样器边界](05-generation.md#reverse-diffusion)、[VAE、重参数化与两项损失](05-generation.md#vae)
- 层级：**纯文案**

讲义对比扩散的高质量样本与多步推理成本。约 1000 步是所讲基础流程的典型示意，不是所有扩散采样器的必需步数，也不能由这句话推出所有生成任务都优于 GAN 或 VAE。

