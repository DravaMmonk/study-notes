# 9 价值函数近似
---
## 表格表示 → 函数表示

表格表示 (tabular representation)：

- 所有价值/策略都是离散的，存放在一张表中
- 通过直接修改表项来更新价值

函数表示 (function representation)：

- 构造一个函数来拟合价值的分布
- 通过调整函数的参数来更新价值

| 方面               | 表格                                | 函数近似                                              |
| -------------------- | -------------------------------------- | ------------------------------------------------------------- |
| **可解释性 (interpretability)** | ✅直观                             | ❌难以解释                                            |
| **可扩展性 (scalability)**      | ❌难以处理大规模/连续空间 | ✅所需内存少得多                                 |
| **泛化能力 (generalisability)** | ❌差                                  | ✅能从见过的情形泛化到没见过的情形        |
| **偏差 (bias)**             | ✅状态空间小时很精确    | ⚠️**有偏** \- 状态价值无法被精确表示 |

---
## 函数近似

通过构造一个新函数并调整参数 $w$ 来近似价值函数。

- *而不是用一张离散值的（$s$-$a$）表（表格法）*

$$
\begin{align}
\hat{v}(s, {\color{red}{\mathbf{w}}})\; & {\color{red}{\approx}}\; v_{\pi}(s)\\[0pt]
\;\;\;\hat{q}(s, a, {\color{red}{\mathbf{w}}})\; & {\color{red}{\approx}}\; q_{\pi}(s, a)
\end{align}
$$

---
## 目标函数

目标：$minimise$ 近似函数与真实价值函数之间的*均方误差 (MSE)*。

$$
J(\mathbf{w}) = \mathbb{E}_\pi \left[ (v_\pi(S) - \hat{v}(S, \mathbf{w}))^2 \right]
$$

其中 $S \in \mathcal{S}$ - 状态是一个服从某种概率分布的*随机变量 (random variable)*，例如：

- **均匀分布 (uniform distribution)**
	- 所有状态概率相同
	- $S = \frac{1}{|\mathcal{S}|}$
	- ❌过于简单；不实用
- **平稳分布 (stationary distribution)**
	- 描述马尔可夫过程的长期行为
		- $d_\pi(s) \approx \frac{N(s)}{\sum_{s \in \mathcal{S}} N(s)}$
	- 也可以利用模型（MDP）中的 $P$ 来预测
		- $d_\pi = d_\pi P$
	- ✅平稳；可以学习得到

---
## 优化目标函数

使用梯度下降 (gradient descent)：

$$
w_{k+1} = w_k - \alpha \nabla J(w_k)
$$

$\nabla J(w_k)$ 的计算方式：

- **真梯度下降 (true gradient descent)**
	- 需要计算期望（收集全部 $N$ 个样本），不实用❌

$$
\begin{align}
\nabla J(w)
& = \nabla \mathbb{E} \left[ (v_\pi(S) - \hat{v}(S, w))^2 \right] \\[0pt]
& \propto \mathbb{E}[(v_\pi(S)-\hat{v}(S,w))\,\nabla\hat{v}(S,w)]
\end{align}
$$

- **随机梯度下降 (stochastic gradient descent)**
	- 只用 1 个样本 $s_t$ 
	- 在线更新，泛化更好✅

$$
\nabla J(w) \approx
\bigl(v_\pi(s_t) - \hat{v}(s_t,w_t)\bigr) \,
\nabla \hat{v}(s_t,w_t)
$$

剩下的两项：

- $\nabla\hat{v}(s_t,w_t)$ ← 特征向量（线性）
- $v_\pi(s_t)$ ← 价值函数近似

---
## 近似价值函数
### 特征向量

用特征向量 (feature vector) $\mathbf{x}(s)$ 来表示状态，于是在**线性情形**下：

- 状态价值的梯度：

$$
\nabla\hat{v}(s,w) = \frac{\partial \hat v(s)}{\partial w} = \mathbf{x}(s)
$$

- 状态-动作价值的梯度：

$$
\nabla \hat q(s,a,w) = \mathbf{x}(s,a)
$$

- 直观；易于实现；可解释性高✅
- 难以选出合适的特征向量⚠️

---
### 状态价值近似器

#### 由蒙特卡洛导出

用 $g_t$（从 $s_t$ 开始的折扣回报）来近似：

$$
v_\pi(s_t) = g_t
$$

- 即便是*非线性*近似，也会收敛到局部最优

---
#### 由时序差分导出

在每一步用 $r_{t+1} + \gamma \hat v(s_{t+1}, w_t) - \hat{v}(s_t, w_t)$（TD 误差）来更新近似器：

$$
v_\pi(s_t) = r_{t+1} + \gamma \hat v(s_{t+1}, w_t)
$$

- 线性 TD(0) 会收敛到全局最优附近

---
#### 由 TD(λ) 导出

- 前向视角：

$$
v_\pi(s_t) = g_t^\lambda
$$

- 后向视角： 

$$
\begin{align}
\delta_t & = r_{t+1} + \gamma \hat v(s_{t+1}, w_t)-\hat{v}(s_t, w_t) \\[4pt]
E_t & = \gamma \lambda E_{t-1} + \nabla\hat{v}(s_t,w_t) \\[4pt]
w_{k+1} &= w_k - \alpha \, \delta_t \, E_t
\end{align}
$$

---
### 动作-状态价值近似器

总体上把 $v$ 换成 $q$：

$$
w_{k+1} = w_k 
- \alpha\,
\bigl(q_\pi(s_t,a_t)-\hat{q}(s_t,a_t,w_t)\bigr)\,
\nabla \hat{q}(s_t,a_t,w_t)
$$

#### 由蒙特卡洛导出

$$
q_\pi(s_t,a_t) = g_t
$$

#### 由 Sarsa 导出

$$
q_\pi(s_t,a_t) = r_{t+1} + \gamma \hat{q} (s_{t+1}, a_{t+1}, w_t)
$$

#### 由 TD(λ) 导出

- 前向视角：

$$
q_\pi(s_t, a_t) = g_t^\lambda
$$

- 后向视角： 

$$
\begin{align}
\delta_t & = r_{t+1} + \gamma \hat q(s_{t+1}, a_{t+1}, w_t)-\hat{q}(s_t, a_t, w_t) \\[4pt]
E_t & = \gamma \lambda E_{t-1} + \nabla\hat{q}(s_t,a_t,w_t) \\[4pt]
w_{k+1} &= w_k - \alpha \, \delta_t \, E_t
\end{align}
$$

#### 由 Q 学习导出

$$
q_\pi(s_t,a_t) = r_{t+1} + \gamma \max_{a \in \mathcal{A}(s_{t+1})}\hat{q} (s_{t+1}, a, w_t)
$$

---
## 批量

**受限环境 (restricted environment)**：算法只能从有限且静态的样本中学习

$$
\mathcal{D} = \{\langle s_1, v^\pi_1 \rangle, \ldots, \langle s_n, v^\pi_n \rangle\}
$$

**分布偏移 (distribution shift)**：这些样本可能是由次优策略生成的，因此：
- 数据可能超出分布 (out of distribution)
- Q 值可能被高估
- 过拟合

**可能适用的方法：**
- 函数近似 → 泛化能力
- 离策略方法（例如 Q 学习）→ 静态样本集
- 监督学习方法（例如神经网络）→ 静态样本集

---
##### 示例 - 批量下的 MC 与 TD

![AB 示例](assets/10_1_ab.svg)

采样得到的幕：8 个样本（有限）

$$
\begin{align}
A \to 0, B \to 0 \\
B \to 1 \\
B \to 1 \\
B \to 1 \\
B \to 1 \\
B \to 1 \\
B \to 1 \\
B \to 0
\end{align}
$$

MC 更新：

- $v(B) = 6/8 = 0.75$
- $v(A) = 0 / 1 = 0$

TD 更新：

- $v(B) \to 0.75$
- $v(A) = 0 + v(B) \to 0.75$

---
## 批量方法

### 最小二乘解

通过 $minimising$ 近似值与真实值之间的*误差平方和 (SSE)*：

$$
LS(w_i) = \mathbb{E} \left[ (v^\pi(S) - \hat{v}(S, w))^2 \right]
$$

- 真实值可以用回报（MC）或时序差分（TD）来近似
- 一次性使用所有样本
- 复杂度 $O(n^3)$，或借助 “Sherman-Morrison” 降到 $O(n^2)$

---
### 随机梯度下降

从 $\mathcal{D}$ 中随机抽取一个小批量 (mini-batch) 样本：

$$
\mathcal{B} = \{\langle s_1, v^\pi_1 \rangle, \ldots, \langle s_k, v^\pi_k \rangle\}
$$

然后用梯度下降进行更新：

$$
w_{k+1} = w_k - \alpha\,
\frac{1}{m} \sum_{\langle s_i, v^\pi_i \rangle \in \mathcal{B}}
\bigl( v^\pi_i(s_i) - \hat{v}(s_i, w_i) \bigr)
\nabla \hat{v}(s_i, w_i)
$$

---
### 深度 Q 学习

使用 Q 学习 + 神经网络（$minimise$ MSE $\mathbf{Loss}(\cdot)$）： 

$$
\mathbf{Loss}(w_i)
=\underbrace{\mathbb{E}_{(s,a,r,s')\sim \mathcal{D}_i}}_{\text{sampled from}\;D_i}
\Big[
\big(
\underbrace{r+\gamma \max_{a'} Q(s',a';w_i^-)}_{\text{TD target }}
-
\underbrace{Q(s,a;w_i)}_{\text{Q estimate}}
\big)^2
\Big]
$$

- 经验回放 (experience replay)： 
	- 从非独立同分布 (non-i.i.d) 的数据中随机采样 → 单个样本/小批量
	- ✅用于去相关（接近 i.i.d）
- 固定 Q 目标 (fixed Q-targets)： 
	- $w_i^-$ 只在运行一段时间后（比如 1000 步）才用 $w_i$（实时更新的参数）来更新
	- ✅降低方差
