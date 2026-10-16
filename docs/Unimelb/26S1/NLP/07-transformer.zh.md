# 07 Transformer

## 为什么 Transformer 取代了循环模型

- 去掉位置之间的循环状态传递，使序列处理更容易并行化。
<!-- Sources: L9 p.2-4 -->
- Transformer 成为大规模语言建模中占主导地位的现代架构。
<!-- Sources: L9 p.34; Manning 2022 p.130 -->

## 自注意力

- 自注意力 (self-attention) 通过把每个词元与同一序列中的其他词元进行比较，为它构建新的表示。
<!-- Sources: L9 p.8-14 -->
- 查询 (query)、键 (key) 和值 (value) 是由嵌入投影得到的向量。
<!-- Sources: L9 p.11 -->

$$
\mathrm{SelfAttention}(Q,K,V)=\mathrm{softmax}\left(\frac{QK^{T}}{\sqrt{d_k}}\right)V
$$
<!-- Sources: L9 p.13 -->

- 得到的向量是上下文表示 (contextual representation)，因为它们依赖于句子上下文，而不仅仅取决于词本身。
<!-- Sources: L9 p.14 -->

## 多头注意力

- 不同的头可以专门关注不同的关系，例如句法、语义或篇章指代。
<!-- Sources: L9 p.15-16 -->
- 因此，多头注意力 (multi-head attention) 会先执行若干次相互独立的注意力计算，再把它们重新组合。
<!-- Sources: L9 p.15-16; JM3 Ch.8 multi-head attention -->

## Transformer 块

| 组件 | 作用 |
| --- | --- |
| 自注意力 | 利用整个序列为每个词元引入上下文 |
| 前馈子层 | 施加逐位置的非线性变换 |
| 残差连接 (residual connection) | 保留低层信息并改善优化 |
| 层归一化 (layer norm) | 用学习得到的缩放和偏移对向量流做归一化 |
<!-- Sources: L9 p.19-25 -->

- 前馈层先扩大隐藏维度，再把它压缩回来。
<!-- Sources: L9 p.21 -->
- 残差连接把低层信息直接加到高层输出上。
<!-- Sources: L9 p.22 -->
- 层归一化执行按向量的归一化，类似于 z 分数 (z-score)，并带有学习得到的增益和偏置。
<!-- Sources: L9 p.23 -->

## 位置嵌入

- 纯注意力对排列不敏感，因此必须单独注入顺序信息。
<!-- Sources: L9 p.27 -->
- 位置嵌入 (positional embedding) 加到词元嵌入上，用来表示序列顺序。
<!-- Sources: L9 p.28 -->
- 正弦函数是计算这些位置向量的一种方式。
<!-- Sources: L9 p.29 -->

## 自回归训练

- 语言模型头 (language-model head) 把最终的隐藏状态投影回词表空间，用于预测下一个词元。
<!-- Sources: L9 p.31 -->
- 在这种语言模型设置下，训练仍是自回归的，因此每个目标只关注左侧上下文。
<!-- Sources: L9 p.31-32 -->
- 可用的上下文窗口仍然有限，但比经典 n-gram 模型大得多。
<!-- Sources: L9 p.33 -->

## 主要结论

- 随着层数加深和注意力头增多，Transformer 的性能提升良好。
<!-- Sources: L9 p.34 -->
- 可并行的基于注意力的建模，是 Transformer 促成大语言模型和生成式 AI 的一个主要原因。
<!-- Sources: L9 p.34; Manning 2022 p.130 -->
