# 02 N-gram 语言模型

## 语言模型做什么

- 语言模型 (language model) 为文本序列分配概率，使更通顺的候选得到更高的分数。
<!-- Sources: L3 p.2 -->
- 常见应用包括语音识别、查询补全、OCR、机器翻译、摘要、对话系统和文本生成。
<!-- Sources: L3 p.2-4 -->

## 链式法则与 n-gram 近似

$$
P(w_1,\dots,w_m)=\prod_{i=1}^{m} P(w_i \mid w_1,\dots,w_{i-1})
$$
<!-- Sources: L3 p.6 -->

$$
P(w_i \mid w_1,\dots,w_{i-1}) \approx P(w_i \mid w_{i-n+1},\dots,w_{i-1})
$$
<!-- Sources: L3 p.7 -->

- 一元 (unigram)、二元 (bigram) 和三元 (trigram) 模型是这一近似的前三种特例。
<!-- Sources: L3 p.7 -->
- `<s>` 和 `</s>` 这样的句子边界符号让句子的开头和结尾也成为所建模分布的一部分。
<!-- Sources: L3 p.9 -->

## 最大似然估计

$$
P(w_i)=\frac{C(w_i)}{M}
\qquad
P(w_i \mid w_{i-n+1},\dots,w_{i-1})=\frac{C(w_{i-n+1},\dots,w_i)}{C(w_{i-n+1},\dots,w_{i-1})}
$$
<!-- Sources: L3 p.8 -->

- 一个由两句话组成的 `wood chuck` 语料库在演算示例中把词例数 `M` 和词表大小 `V` 明确地体现出来。
<!-- Sources: Wk3 p.17 -->
- 在研讨课的计算中，起始符号用作上下文，但不计入普通词表的统计。
<!-- Sources: Wk3 p.17 -->

## 主要局限

- 固定宽度的上下文无法捕捉长距离依赖。
<!-- Sources: L3 p.16 -->
- 连乘许多很小的概率在实践中会导致数值下溢 (underflow)。
<!-- Sources: L3 p.16 -->
- 未出现过的 n-gram 会产生零概率，而只要有一个因子为零，整个序列的概率就会坍缩为零。
<!-- Sources: L3 p.16 -->

## 平滑方法家族

| 方法 | 核心思想 |
| --- | --- |
| 加一 (add-one) | 假装每个 n-gram 都多出现了一次 |
| 加 k (add-k) | 加上一个更小的分数常数 |
| 绝对折扣 (absolute discounting) | 从已见事件中减去固定的概率质量并重新分配 |
| 回退 (backoff) | 当高阶事件未出现时改用低阶模型 |
| Kneser-Ney | 用“接续”行为来构造低阶分布 |
| 插值 (interpolation) | 同时组合多个阶数的 n-gram |
<!-- Sources: L3 p.18-29 -->

## 加一与加 k 平滑

- 加一平滑甚至能给未出现过的二元组（例如 `P(ate | cheese)`）分配非零概率。
<!-- Sources: L3 p.19-20 -->
- 加 k 平滑（又称 Lidstone 平滑）把 `1` 换成更小的常数 `k`，从而推广了加一平滑。
<!-- Sources: L3 p.21-22 -->
- 在同一个玩具语料库上，可以直接比较未平滑和拉普拉斯平滑 (Laplacian smoothing) 下的一元、二元和三元概率。
<!-- Sources: Wk3 p.18-23 -->

## 绝对折扣、回退与 Kneser-Ney

- 绝对折扣从观测计数中减去固定数量，并把这部分质量留给未见事件。
<!-- Sources: L3 p.23-24 -->
- 当高阶 n-gram 未出现时，Katz 回退 (Katz backoff) 利用低阶模型重新分配剩余的概率质量。
<!-- Sources: L3 p.25 -->
- 原始的一元频率作为低阶信号可能较弱，因为高频词在特定上下文中未必是好的接续词。
<!-- Sources: L3 p.26 -->
- Kneser-Ney 的解决办法是奖励出现在许多不同上下文中的词，而不仅仅是原始频率高的词。
<!-- Sources: L3 p.27-28; Wk3 p.24-25 -->

## 插值

$$
P_{\mathrm{IN}}(w_i \mid w_{i-2},w_{i-1})
=
\lambda_3 P_3(w_i \mid w_{i-2},w_{i-1})
+ \lambda_2 P_2(w_i \mid w_{i-1})
+ \lambda_1 P_1(w_i)
$$
<!-- Sources: L3 p.29 -->

- 插值总是混合多个阶数，而回退只在需要时才降到低阶。
<!-- Sources: L3 p.29; Wk3 p.27 -->

## 实践要点

- 更高的 n-gram 阶数提高了对上下文的敏感度，但也加剧了稀疏性。
<!-- Sources: Wk3 p.18-27 -->
- N-gram 模型是简单、无监督且可扩展的经典基线，但对更强泛化能力的需求推动了之后向神经语言模型的转变。
<!-- Sources: L3 p.30 -->
