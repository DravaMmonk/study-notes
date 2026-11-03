# COMP90086 Lecture 17 - Diffusion Models

来源：`lecture/COMP90086-17-Diffusion.pdf`（36 页）；`transcript/COMP90086_2026_SM2 Week-09-W-transcript.txt`（2026-09-23，开头先补充 GAN 条件生成）；Week 10 扩散练习及答案。2026-11-03 依据本地归档复核。页码指 PDF 页码。

本讲回答：**怎样从一张随机噪声图，逐步生成有结构的图像？** 训练时先主动给真实图加噪声，让网络学习恢复线索；生成时从噪声开始，反复调用网络。

学习路线：[加噪](#topic-1) → [训练与生成](#topic-2) → [潜空间与条件](#topic-3)。重点是区分已知的加噪过程与需要学习的去噪过程，难点是时间步和噪声系数。

<a id="topic-1"></a>
## 1. 重点：先学会怎样破坏图像

![PDF 11 - Forward diffusion](assets/17-diffusion/slide-11.png)

沿狗的照片从左往右看：轮廓逐渐消失，噪声逐渐占主导。这里的每张小图是一整个图像样本，不是某个像素的运动轨迹。

$$
x_t=\sqrt{1-\beta_t}\,x_{t-1}+\sqrt{\beta_t}\,\epsilon_t,
\qquad \epsilon_t\sim\mathcal N(0,I).
$$

 $x_{t-1}$ 是上一步图像， $x_t$ 是加噪后的图像； $\beta_t$ 控制这一步噪声的量， $\epsilon_t$ 是各位置独立采样的标准高斯噪声。两个平方根分别控制保留多少旧图，以及混入多少噪声。 $t$ 表示破坏程度对应的步骤，不是视频帧号。

### 阶梯起点：为什么噪声系数要开平方

第 13 页合并噪声的依据是**独立噪声的方差相加**。若两份标准高斯噪声独立，乘以 a、b 再相加，方差为 a²+b²，不是 a+b。一步公式中的噪声标准差为 $\sqrt{\beta_t}$，因此噪声方差是 $\beta_t$。把图像的“强度系数”和高斯分布的“方差”分清，后面的累计公式才有意义。

理解用例（自拟）：两份独立标准噪声各乘 $1/\sqrt{2}$ 后相加，方差仍为 1；若复用同一份噪声，独立性不成立，不能用这个结果。这个起点安排为 [独立关卡](encyclopedia/05-generation.md#gaussian-noise)。

### 难点：不用一步步计算所有中间图

![PDF 13 - Combining noising steps](assets/17-diffusion/slide-13.png)

图里长推导的作用是把前面很多步合成一次计算。重点看最后一行：

$$
\bar\alpha_t=\prod_{i=1}^{t}(1-\beta_i),\qquad
x_t=\sqrt{\bar\alpha_t}\,x_0+\sqrt{1-\bar\alpha_t}\,\epsilon.
$$

 $x_0$ 是原图；乘积 $\bar\alpha_t$ 记录经过多步后还保留多少原始信号。这样训练时选定任意一个 $t$ ，就能直接采样对应的带噪图。这里的 $\epsilon$ 是合并后的等效高斯噪声，**不是把同一份噪声反复加上去**。

<a id="topic-2"></a>
## 2. 训练学什么，生成又做什么

| 阶段 | 网络拿到什么 | 要做什么 |
| --- | --- | --- |
| 训练 | 带噪图 $x_t$ 和时间步 $t$ | 估计加入的噪声，或估计原图 |
| 生成 | 初始随机噪声，随后是上一步的估计结果 | 反复向较少噪声的状态推进 |

课件第 19–28 页用 U-Net 实现估计器。训练中原图和人为加入的噪声都已知，因此可以把预测噪声与真实噪声做均方误差比较。告诉网络 $t$ ，是让它知道这张图现在被破坏到什么程度；U-Net 的结构见 [分割第二讲](20-segmentation-ii.md#topic-3)。

**易错**：从纯噪声生成时，没有某张待恢复原图作为答案。网络利用训练中学到的图像规律生成新样本。课件展示的是逐步估计的思路，具体采样器的更新公式和步数应以对应实现为准。

**Workshop 应用（可选）**：[1000 步实现实验](encyclopedia/08-optional.md#diffusion-schedule-practice) 核对加噪系数、训练与反向生成。练习中的步数不作为所有扩散方法的固定要求，本次未运行或训练模型。

### 难点：从预测噪声走到下一状态

课件第 22–24 页允许预测原图或噪声，两者由同一加噪关系联系：

$$
\hat x_0=\frac{x_t-\sqrt{1-\bar\alpha_t}\hat\epsilon}{\sqrt{\bar\alpha_t}}.
$$

这是由已知系数和网络预测得到的**原图估计**，不保证等于某张真实原图。第 27 页再用估计的原图与噪声构造较低噪声状态：

$$
\hat x_{t-1}=\sqrt{\bar\alpha_{t-1}}\hat x_0+
\sqrt{1-\bar\alpha_{t-1}}\hat\epsilon.
$$

这说明为什么同一网络能反复调用，也说明预测误差会进入后续输入。不要把“下一步仍含噪声”误解成“网络每一步都必须直接输出干净图像”。这里只按讲义解释更新示意，不把它当作所有采样器通用公式。讲义 p.21 用均值／标准差记高斯；若采用均值／协方差记法，该步协方差应为 $\beta_t I$，阅读不同记法时需核对。

<a id="topic-3"></a>
## 3. 怎样减少计算，怎样指定生成内容

![PDF 30 - Latent diffusion](assets/17-diffusion/slide-30.png)

图中的 $E$ 先把图像压缩成表示 $z$ ， $D$ 再把表示还原为图像。潜空间扩散把加噪、去噪放在较小的 $z$ 上进行，最后才解码回像素。这里复用了 [自编码器](15-generation.md) 的思想，通常可以减少去噪网络处理的数据量。

条件生成再给网络一条线索，例如类别、文本表示或另一张图。输入不再只有 $x_t,t$ ，还包括“希望生成什么”的条件。课件第 31–34 页展示文本条件和图像补全；条件引导结果，但不意味着输入一句话就会得到唯一图像。

## 本讲自测

1. 已知 $x_0$ 和时间步 $t$ ，为什么可以直接构造 $x_t$ ？
2. 训练时可以使用真实噪声计算误差，生成时为什么不行？
3. 潜空间扩散把哪一步从像素空间移走了？

<details>
<summary>延伸内容（可选）</summary>

原始论文和课程推荐的博客统一保存在 [Week 9 Reading Links](READING-LINKS.md#week-9-diffusion-models)。阅读时先核对其预测目标和采样过程，不把课件中的示意更新式当成所有扩散模型的通用实现。

</details>

## 词条与学习任务

本讲按概念拆分的独立词条如下；出处、直接依赖和关卡／任务目标见各词条。应用实验单列在 [可选专题](encyclopedia/08-optional.md)。

[高斯噪声与方差相加](encyclopedia/05-generation.md#gaussian-noise) · [前向扩散与累计信号](encyclopedia/05-generation.md#forward-diffusion) · [时间条件与噪声预测训练](encyclopedia/05-generation.md#noise-prediction) · [反向生成与采样器边界](encyclopedia/05-generation.md#reverse-diffusion) · [潜空间扩散](encyclopedia/05-generation.md#latent-diffusion) · [条件扩散与补全](encyclopedia/05-generation.md#conditional-diffusion) · [生成模型的质量与采样成本](encyclopedia/05-generation.md#generation-cost)
