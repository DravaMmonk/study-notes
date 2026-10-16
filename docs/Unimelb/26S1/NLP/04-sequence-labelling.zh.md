# 04 序列标注：词性标注与 HMM

## 词性标注基础

- 词性标注 (part-of-speech tagging, POS tagging) 为序列中的每个词元分配一个句法类别。
<!-- Sources: L5 p.2, p.12-14 -->
- 词性信息可用于形态分析、按类别检索、分类特征、词义消歧 (word-sense disambiguation) 以及更大的句法结构。
<!-- Sources: L5 p.22 -->

## 标注集与歧义

- 开放类 (open class) 包括名词、动词、形容词和副词。
<!-- Sources: L5 p.5-6 -->
- 封闭类 (closed class) 包括限定词、介词、代词、小品词及相关的功能词类别。
<!-- Sources: L5 p.7-8 -->
- Penn Treebank 标注集是一个紧凑的英语标签集，包含 `NN`、`VB`、`JJ`、`RB`、`DT`、`IN` 和 `PRP` 等类别。
<!-- Sources: L5 p.13-18 -->
- 同一个表层词在不同上下文中可能得到不同的标签。
<!-- Sources: L5 p.10-11 -->

## 基线标注器

| 方法 | 核心思想 |
| --- | --- |
| 基于规则 | 从词汇的可能标签出发，用手写规则加以约束 |
| 一元 (unigram) | 为每个词型分配其最常见的观测标签 |
| 基于分类器 | 根据局部词汇特征和之前的标签决策预测每个标签 |
| HMM | 用转移概率和发射概率对整个标签序列建模 |
<!-- Sources: L5 p.23-27 -->

- 一元标注器是一个很强的基线，据介绍可以达到约 90% 的准确率。
<!-- Sources: L5 p.25 -->
- 局部的基于分类器的标注器可能受到错误传播 (error propagation) 的影响。
<!-- Sources: L5 p.26; L6 p.2-3 -->

## 未登录词

- 在形态丰富的语言中，未登录词 (unknown word) 尤其困难。
<!-- Sources: L5 p.28 -->
- 只出现一次的词 (hapax legomena) 以及子词或词缀信息可以改善对未见形式的猜测。
<!-- Sources: L5 p.28 -->

## HMM 分解

$$
\hat{t}_{1:n}=\arg\max_{t_{1:n}} P(t_{1:n}\mid w_{1:n})
=
\arg\max_{t_{1:n}} P(w_{1:n}\mid t_{1:n})P(t_{1:n})
$$
<!-- Sources: L6 p.4 -->

$$
P(w_{1:n}\mid t_{1:n})=\prod_{i=1}^{n} P(w_i \mid t_i)
\qquad
P(t_{1:n})=\prod_{i=1}^{n} P(t_i \mid t_{i-1})
$$
<!-- Sources: L6 p.5 -->

- 输出独立性假设 (output-independence assumption) 使每个观测词只依赖于其当前的隐藏标签。
<!-- Sources: L6 p.5; Wk4 p.12-14 -->
- 在一阶模型中，马尔可夫假设 (Markov assumption) 使每个当前标签只依赖于前一个标签。
<!-- Sources: L6 p.5; Wk4 p.12-14 -->

## 训练 HMM 标注器

- 训练过程根据已标注语料库的计数，估计初始状态分布、转移矩阵 (transition matrix) 和发射矩阵 (emission matrix)。
<!-- Sources: L6 p.6-9; Wk4 p.15 -->
- 像 `<s>` 这样的句首符号提供了第一个标签的概率。
<!-- Sources: L6 p.7 -->
- 未出现过的词-标签和标签-标签组合需要平滑。
<!-- Sources: L6 p.7 -->

## Viterbi 解码

$$
\mathrm{dp}[i,t]
=
\max_{t'}
\mathrm{dp}[i-1,t'] \cdot P(t \mid t') \cdot P(w_i \mid t)
$$
<!-- Sources: L6 p.11-13, p.39-40 -->

- Viterbi 是一种动态规划 (dynamic programming) 算法：它在每个位置为每个标签保留最佳的部分得分，最后通过存储的前驱进行回溯。
<!-- Sources: L6 p.11-13, p.33-36 -->
- 从左到右的贪心解码并不够，因为局部最佳的标签不一定属于全局最佳的序列。
<!-- Sources: L6 p.10-11 -->
- 一阶 Viterbi 解码的复杂度为 `O(T^2 N)`。
<!-- Sources: L6 p.39; Wk4 p.22 -->

## 高阶模型与比较

- 三元 HMM 以前两个标签为条件，提高了对上下文的敏感度。
<!-- Sources: L6 p.41 -->
- 三元解码使搜索代价增加到 `O(T^3 N)`，并加剧了稀疏性的压力。
<!-- Sources: L6 p.41 -->
- MEMM、CRF 以及深度 CRF 变体被介绍为更强但相关的序列标注模型。
<!-- Sources: L6 p.43-44 -->

## 主要结论

- HMM 仍然是快速、概念清晰且具有竞争力的序列标注基线模型。
<!-- Sources: L6 p.45 -->
