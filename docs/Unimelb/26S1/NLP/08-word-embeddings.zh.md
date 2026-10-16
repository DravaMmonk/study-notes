# 08 词嵌入

## 分布假设

- 词的意义可以从其上下文分布中推断出来。
<!-- Sources: L10 p.2 -->
- 文档级上下文反映主题关联，而局部窗口上下文反映更细粒度的意义。
<!-- Sources: L10 p.2 -->

## 基于计数的向量

- 词-文档矩阵 (term-document matrix) 既可以用词来表示文档，也可以用文档来表示词。
<!-- Sources: L10 p.8-9 -->
- TF-IDF 会降低在许多文档中都出现的词的权重。
<!-- Sources: L10 p.11 -->
- 稀疏的计数矩阵促使我们进行降维，得到更短、更稠密的向量。
<!-- Sources: L10 p.12 -->

| 基于计数的步骤 | 目的 |
| --- | --- |
| 词-文档矩阵 | 收集文档级的共现计数 |
| TF-IDF 加权 | 对非常常见的词打折扣 |
| SVD / LSA | 把稀疏计数压缩为稠密的低维向量 |
<!-- Sources: L10 p.9-14 -->

## 词-上下文矩阵与 PMI

- 如果直接使用原始频率，词-窗口共现矩阵会被非常常见的词所主导。
<!-- Sources: L10 p.15 -->

$$
\mathrm{PMI}(x,y)=\log_2 \frac{P(x,y)}{P(x)P(y)}
$$
<!-- Sources: L10 p.16 -->

- 点互信息 (pointwise mutual information, PMI) 衡量实际共现偏离独立情形的程度。
<!-- Sources: L10 p.16 -->
- 在共现加权和矩阵分解 (matrix factorisation) 之后，同样可以得到稠密向量。
<!-- Sources: L10 p.19 -->

## 神经嵌入方法

- 神经方法可以直接学习嵌入，而不只是作为另一个任务的副产品。
<!-- Sources: L10 p.21-22 -->
- 期望具备的性质包括无监督学习和高效训练。
<!-- Sources: L10 p.22 -->

## Word2Vec

- Skip-gram 根据目标词预测周围的词，而 CBOW 根据周围的词预测目标词。
<!-- Sources: L10 p.24 -->

$$
P(c \mid w)
=
\frac{\exp(W_w \cdot C_c)}
{\sum_{u \in V} \exp(W_w \cdot C_u)}
$$
<!-- Sources: L10 p.25-26 -->

- Skip-gram 维护相互独立的目标词嵌入矩阵和上下文嵌入矩阵。
<!-- Sources: L10 p.26-27 -->

## 负采样

- 完整的 softmax 训练代价高昂，因为它要在整个词表上做归一化。
<!-- Sources: L10 p.28 -->
- 负采样 (negative sampling) 把学习重新表述为一个二分类问题：区分真实的词-上下文对和采样得到的噪声对。
<!-- Sources: L10 p.28-30 -->

$$
L(\theta)=
\sum_{(w,c)\in +}\log P(+ \mid w,c)
+
\sum_{(w,c)\in -}\log P(- \mid w,c)
$$
<!-- Sources: L10 p.30 -->

## 评估

| 评估方式 | 示例 |
| --- | --- |
| 词相似度 | 与 WordSim-353 或 SimLex-999 等人工评判的词对比较余弦相似度 |
| 词类比 | 向量运算，如 `woman - man + king` |
| 下游评估 | 把嵌入用作特征，或用于初始化更大的模型 |
<!-- Sources: L10 p.33-36 -->

$$
v(\text{queen}) \approx v(\text{woman}) - v(\text{man}) + v(\text{king})
$$
<!-- Sources: L10 p.34-35 -->

## 主要结论

- 在总结性比较中，神经嵌入方法总体上优于基于计数的方法。
<!-- Sources: L10 p.37 -->
- 预训练词向量是下游神经模型的有用初始化，并促成了之后向预训练整个模型的转变。
<!-- Sources: L10 p.36-37 -->
