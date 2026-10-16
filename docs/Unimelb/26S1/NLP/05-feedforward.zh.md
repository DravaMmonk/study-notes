# 05 前馈网络

## 核心架构

- 前馈神经网络 (feedforward neural network) 也称为多层感知机 (multilayer perceptron)。
<!-- Sources: L7 p.4 -->
- 它由带权连接、非线性隐藏层以及产生任务预测的输出层组成。
<!-- Sources: L7 p.4-7 -->

$$
h_i=\tanh\left(\sum_j w_{ij}x_j+b_i\right)
\qquad
h=\tanh(Wx+b)
$$
<!-- Sources: L7 p.6 -->

## 输出层

- 二分类通常使用 sigmoid（逻辑）函数。
<!-- Sources: L7 p.7 -->
- 多分类通常使用 softmax，使各类别概率为正且总和为一。
<!-- Sources: L7 p.7 -->

## 训练与正则化

- 训练的目标是最大化正确输出的概率，等价地，最小化负对数似然 (negative log-likelihood)。
<!-- Sources: L7 p.8 -->
- 使用梯度下降 (gradient descent) 进行优化。
<!-- Sources: L7 p.8 -->
- L1、L2 和 dropout 被介绍为标准的正则化策略。
<!-- Sources: L7 p.9 -->

## Dropout

- Dropout 在训练期间随机地把一部分激活值置为零，通常作用于隐藏层。
<!-- Sources: L7 p.10 -->
- 它降低了对特定神经元的依赖，惩罚过大的权重，并向模型中注入噪声。
<!-- Sources: L7 p.11 -->

## 用于 NLP 的前馈模型

- 文档分类是一个直接的应用：文档特征输入到一个预测类别的网络中。
<!-- Sources: L7 p.12-16 -->
- 语言建模可以表述为：根据固定的上下文窗口对下一个词进行分类。
<!-- Sources: L7 p.17-19 -->

$$
x = v_{w_{i-3}} \oplus v_{w_{i-2}} \oplus v_{w_{i-1}},
\qquad
h=\tanh(W_2 x+b_1),
\qquad
y=\mathrm{softmax}(W_3 h)
$$
<!-- Sources: L7 p.22-24 -->

- 前馈神经语言模型使用学习得到的嵌入 (embedding)，而不是稀疏的计数表。
<!-- Sources: L7 p.19-24 -->
- 该架构中使用相互独立的输入嵌入矩阵和输出嵌入矩阵。
<!-- Sources: L7 p.24 -->

## 为什么前馈神经语言模型优于计数表

- 基于计数的 n-gram 模型训练成本低，但受稀疏性困扰，无法直接在 `film` 和 `movie` 这样的相似词之间共享统计强度。
<!-- Sources: L7 p.26 -->
- 前馈神经语言模型学习分布式的词属性，因此能给出更鲁棒的估计。
<!-- Sources: L7 p.26 -->

## 用前馈网络做词性标注

- 词性标注也可以表述为对当前标签的分类。
<!-- Sources: L7 p.27 -->
- 讲座中的一种架构以最近几个词的嵌入加上最近几个标签的嵌入作为输入，并通过 softmax 输出预测当前标签。
<!-- Sources: L7 p.28 -->

## 实践权衡

| 优点 | 缺点 |
| --- | --- |
| 性能强 | 比经典机器学习模型慢 |
| 所需手工特征更少 | 由词表带来大量参数 |
| 可灵活设计面向任务的架构 | 没有预训练时需要大量数据 |
<!-- Sources: L7 p.29; Wk5 p.10-15 -->
