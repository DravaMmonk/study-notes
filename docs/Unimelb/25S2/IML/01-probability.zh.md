# 1 概率
---
## 概率论

**概率论 (probability theory)** 是机器学习的*理论与数学基础*。

> [!faq] 什么是概率？
> 
> - 一种用来描述和量化**不确定性 (uncertainty)** 的*语言*
> - 一个设计机器学习**模型**的*框架*
> 	- 分布 (distribution)
> 	- 预测 (prediction)
> 	- 优化 (optimisation)
> 	- 泛化 (generalisation)
> 	- 评估 (evaluation)

### 样本空间

定义一组彼此**互斥 (exclusive)** 且**穷尽 (exhaustive)** 的可能事件。

$$
\Omega = \{ \omega_1, \omega_2, \ldots \}
$$

**互斥**：不同事件不会同时发生。

$$
P(\omega_i \cap \omega_j) = 0, \forall (\omega_i, \omega_j )\in A
$$

**穷尽**：列出的事件恰好就是所有可能的事件。

$$
P(\Omega)=1
$$

> [!example]- 硬币与骰子的样本空间
> 
> $$
> \Omega_\text{Coin} = \{\text{heads}, \text{tails}\}
> $$
> 
> $$
> \Omega_\text{D6} = \{1,2,3,4,5,6\}
> $$

---
### 随机变量

一个把样本空间中的结果映射为数值的函数。

$$
X: \Omega \to E
$$

> [!example]- 硬币的随机变量
> 
> 用 $Y$ 来建模押正面且押中时硬币的收益：
> 
> $$
> Y(\omega) = 
> \begin{cases}
> 1, &\text{if}\; \omega = \text{heads} \\
> 0, &\text{if}\; \omega = \text{tails}
> \end{cases}
> $$
> 

---
## 贝叶斯法则

$$
P(A \mid B) = \frac{P(B \mid A) \cdot P(A)}{P(B)}
$$

其中

- $P(A \mid B)$ - 已知 $B$ 时对 $A$ 的*信念 (belief)*
- $P(A)$ - 没有任何知识时对 $A$ 的*信念*
- $P(B \mid A)$ - $B$ 对 $A$ 提供的支持
- $P(B)$ - 用于归一化的常数

---

## 熵

### 信息量 (IG)

结果 $x$ 的信息量 (information content)：

$$
I(x) = -\log_2 P(x)
$$

- 必然事件 → 携带零信息
- 常见事件 → 携带的信息很少
- 罕见事件 → 携带的信息很多
- 不可能事件 → 携带无穷大的信息

> [!faq] 为什么*信息量*要这样定义？
> 
> 把*概率*（范围 $[0, 1]$）映射为*信息量*的量化分数（范围 $[0, +\infty)$ ）。
> 

---

### 熵

从一个随机变量中获得的期望*信息量*，即熵 (entropy)。

$$
H(X) = \mathbb{E}[I(X)] = -\sum_x P(x)\, \log_2 P(x)
$$

其中

- $X$ - 一个可能取值为 $x$ 的随机变量
- $P(x)$ - 结果 $x$ 的概率（权重）
- $-\log_2 P(x)$ - 结果 $x$ 携带的信息量

- $X$ 的值 100% 是 $a$ → $H(X) = 0$
- $X$ 的值几乎确定 → 低熵
- $X$ 的值高度不确定 → 高熵
- $X$ 的值 50% 是 $a$、50% 是 $b$ → $H(X) = 1 \text{bit}$

> [!example]- 低熵 vs. 高熵
> 
> $X = \{a, b\}$
> 
> - **低熵**（$P(X = a) = 0.99; P(X = b) = 0.01$）：
> 
> $$
> H(X) = - ((0.99 * \log_2 0.99) + (0.01 * \log_2 0.01) \approx 0.0807 \text{bits}
> $$
> 
> - **高熵**（$P(X = a) = 0.51; P(X = b) = 0.49$）：
> 
> $$
> H(X) = - ((0.51 * \log_2 0.51) + (0.49 * \log_2 0.49) \approx 0.9989 \text{bits}
> $$

---

### 联合熵

从多个变量联合获得的期望*信息量*，即联合熵 (joint entropy)。

$$
H(X, Y)
= -\sum_{x,y} P(x, y)\, \log_2 P(x, y)
$$

---

### 条件熵

已知一个变量时，从另一个变量获得的期望*信息量*，即条件熵 (conditional entropy)。

$$
H(X \mid Y) = H(X, Y) - H(Y)
$$

> [!NOTE]- 用链式法则推导
> 
> 已知  
> 
> $$
> P(x, y) = P(y)\, P(x \mid y),
> $$
> 
> 代入联合熵：
> 
> $$
> H(X, Y)
> = -\sum_{x,y} P(x, y)\, \log_2 \big[ P(y)\, P(x \mid y) \big]
> $$
> 
> 拆开对数：
> 
> $$
> H(X, Y)
> = -\sum_{x,y} P(x, y)\, \log_2 P(y)
>   - \sum_{x,y} P(x, y)\, \log_2 P(x \mid y)
> $$
> 
> 由于 $\sum_x P(x,y) = P(y)$：
> 
> $$
> H(X, Y)
> = -\sum_y P(y)\, \log_2 P(y)
>   - \sum_{y} P(y) \sum_x P(x \mid y)\, \log_2 P(x \mid y)
> $$
> 
> 因此：
> 
> $$
> H(X, Y) = H(Y) + H(X \mid Y)
> $$

---
## 互信息

如果我们获得了关于 $Y$ 的知识，能把关于 $X$ 的*不确定性*降低多少，即互信息 (mutual information)：

$$
\begin{align}
IG(X; Y) &= H(X) - H(X \mid Y) \\[4pt]
         &= H(Y) - H(Y \mid X)
\end{align}
$$

互信息也可以用联合概率表示：

$$
IG(X; Y)
= \sum_{x,y} P(x,y)\,
\log_2 \frac{P(x,y)}{P(x)\, P(y)}
$$

> [!tip]- 对数比
> 
> $$
> r = \log_2 \frac{P(x,y)}{P(x)P(y)}
> $$ 
> 
> -  $r = 0$ → 出现频率与独立假设下的预期一致 
> - $r > 0$ → 共同出现的次数多于预期 → 正相关 
> - $r < 0$ → 共同出现的次数少于预期 → 负相关
> 

---

## 概率论 → 数据分布

在机器学习中，我们把数据看作从一个**未知的潜在概率分布**中抽取的样本。

$$
x_1, x_2, \ldots, x_n \sim P(X)
$$

其中

- 数据点是随机变量 $X$ 的样本。
- 它的行为由分布 $P(X)$ 描述。
- 分布 $P(X)$ 是**未知的**。
- - 我们的数据集只是真实潜在分布的一个**有限快照**。

机器学习的**目标**是还原出关于这个分布的信息，这也称为**泛化 (generalisation)**。

- **泛化**：从潜在的数据分布中学习规律。

---
## 机器学习

根据可用的数据来源和问题的目标，*泛化*可以分为不同的范式。

| 学习范式              | 输入                                   | 数学目标                                                     | 实际目标                                 |
| ------------------------------ | --------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| **无监督学习 (unsupervised learning)**      | 只有不带标签的数据样本（$X$）  | 直接学习分布（$P(X)$）                                   | 发现数据中的结构                             |
| **监督学习 (supervised learning)**        | 带标签的样本对（$(X, Y)$）                | 学习条件分布（$P(Y \mid X)$）                         | 解决*分类*和*回归*问题 |
| **弱监督学习 (weakly-supervised learning)** | 不完整/有噪声的标签                 | 利用不完美或间接的监督学习一个近似的 $P(Y \mid X)$ | 降低标注成本；从有噪声/廉价的标签中学习 |
| **生成模型 (generative models)**          | 有标签或无标签                  | 与生成模型的输出相同                                        | *生成*新样本                              |
| **集成学习 (ensemble learning)**          | 在同一数据上训练的多个不同模型 | 与元模型 (meta model) 的输出相同。                                             | 提高准确率、稳定性和鲁棒性            |

---
## 模型

**监督学习**

- K 近邻 (K-Nearest Neighbours)
- 线性回归 (Linear Regression)
- 逻辑回归 (Logistic Regression)
- 朴素贝叶斯 (Naive Bayes)
- 决策树 (Decision Tree)
- 支持向量机 (Support Vector Machine)
- 感知机 (Perceptron)
- 多层感知机（神经网络）(Multilayer Perceptron (Neural Networks))

**无监督学习**

- 聚类 (Clustering)
- K 均值聚类 (K-Mean Clustering)
- 层次聚类 (Hierarchical Clustering)
- 凝聚式聚类 (Agglomerative Clustering)
- 分裂式聚类 (Divisive Clustering)

**弱监督学习**

- 自训练 (Self-training)
	- 自监督学习 (Self-supervised Learning)
	- 数据增强 (Data argumentation)
- 主动学习 (Active Learning)


**集成学习**

- 堆叠 (Stacking)
- 装袋 (Bagging)（RF）
- 提升 (Boosting)（AdaBoost）

---
