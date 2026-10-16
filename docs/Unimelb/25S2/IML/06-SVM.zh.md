# 6 支持向量机
---
## 基线模型

### 线性分类器

$$
y = \theta^\top X + b
$$

- $\theta$ 决定决策边界的**方向 (orientation)**  
- $b$ 是**偏置/偏移 (bias/offset)**，通过平移边界增加灵活性

决策边界：

$$
\theta^\top X + b = 0
$$

> [!note] 分类与回归的区别
> 
> - 回归近似的是**数值**
> - 分类是用边界把**类别**分开。
> 
> **逻辑回归**
> 
> - 预测一个**连续值**  
> - 通过**对概率设阈值**来决定标签
> - 通过 $maximising$ **对数似然**或 $minimising$ **交叉熵**来训练
>
> **线性分类**
> 
> - 直接预测一个**离散标签**用于决策
> - 没有概率输出
> - 基于间隔训练（SVM），或用梯度下降类方法更新（神经网络）

---

## 间隔

对于带标签的样本 $(x_i, y_i)$，其中 $y_i \in \{-1, +1\}$：

**函数间隔 (functional margin)：**
$$
\gamma_i^{(f)} = y_i(\theta^\top x_i + b)
$$

**几何间隔 (geometric margin)（归一化）：**
$$
\gamma_i = \frac{y_i(\theta^\top x_i + b)}{\|\theta\|}
$$

解释：
- $\gamma_i$ 大 → 点离边界远 → 鲁棒  
- $\gamma_i$ 小 → 点靠近边界 → 敏感 / 容易出错  

**整体几何间隔：**
$$
\gamma = \min_i \gamma_i
$$

---
## 支持向量机

目标：找到 $(\theta, b)$，使得：

- 所有点都被正确分类  
- 间隔被**最大化**

从下式出发：
$$
\max_{\theta} \frac{1}{\|\theta\|} \quad 
\text{s.t. } y_i \frac{\theta^\top x_i}{\|\theta\|} \ge \frac{1}{\|\theta\|}
$$

通过要求下式来固定间隔的尺度：

$$
y_i(\theta^\top x_i) \ge 1
$$

**优化**：

$$
\min_\theta \frac{1}{2}\|\theta\|^2
\quad \text{s.t. } y_i(\theta^\top x_i) \ge 1
$$

> [!note] SVM 的特点
> 
> 解只依赖于**支持向量 (support vectors)**：
> 
> - 少数几个点“支撑”着边界
> 	- 有些点构成两条间距最小的直线
> 	- 边界恰好是这段间隔区域的*平分线*
> - 其他点的**贡献为零**
> 	- → 解是**稀疏的 (sparse)**
> 
> **优点**：
> 
> - 计算高效  
> - 简单、可解释的几何模型  
> - 泛化能力强  
> 
> **缺点**：
> 
> - 需要足够的数据  
> - 对离群点敏感  
> - 不用核函数就无法建模非线性划分（例如 XOR） 

---
## SVM 的变体
### 软间隔 SVM

用松弛变量 (slack variables) $\xi_i$ 允许违反间隔：

**优化**：
$$
\min_{\theta, \xi} \frac{1}{2}\|\theta\|^2 + C\sum_i \xi_i
$$

约束条件：
$$
y_i (\theta^\top x_i + b) \ge 1 - \xi_i, \quad \xi_i \ge 0
$$

$\xi_i$ 的含义：

- $\xi_i = 0$：分类正确且位于间隔之外  
- $0 < \xi_i < 1$：分类正确但位于间隔之内  
- $\xi_i > 1$：分类错误  

$C$ 的作用：

- $C$ 大 → 严厉惩罚违反间隔 → 有过拟合风险  
- $C$ 小 → 允许更多松弛 → 有欠拟合风险  

---

### 多分类 SVM

学习 $K$ 个分类器：

$$
\theta_1, \ldots, \theta_K
$$

预测：

$$
\hat{y} = \arg\max_k \theta_k^\top x
$$

---

### 用于有序回归的 SVM

用于评分预测（有序标签）：

令各边界满足：
$$
b_1 < b_2 < \cdots < b_{K-1}
$$

约束：
$$
b_{y_i-1} < w^\top x_i < b_{y_i}
$$

**目标**：

- 学习 $w$ 和有序的阈值  
- 输出离散的有序结果  

---

### 排序 SVM

用下式为用户 $x$ 对候选项 $y$ 排序：

$$
f(x, y; \theta) = \theta^\top \Phi(x, y)
$$

其中

- $\Phi(x, y)$ 对用户–候选项对做变换  
- 输出的分数决定排序  

用于推荐和排序任务。

---

### 核 SVM

线性 SVM 无法解决非线性问题（例如 XOR），而核函数 (kernel function) 能把数据隐式地映射到更高维空间：

$$
x' = \Phi(x)
$$

但我们借助**核技巧 (kernel trick)** 避免显式地计算 $\Phi(x)$：

$$
K(x, x') = \Phi(x)^\top \Phi(x')
$$

例子：

- 多项式核 (polynomial kernel)  
- RBF/高斯核 (RBF/Gaussian kernel)  
- Sigmoid 核 (sigmoid kernel)  

好处：

- 能解决复杂的非线性分类问题  
- 不需要显式的高维变换  

---

