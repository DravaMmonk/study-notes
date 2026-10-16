# 10 策略函数近似
---
## 基于价值 → 基于策略

在**基于价值 (value-based)** 的算法中：

- 如果一个策略能 $maximise$ 每个状态的价值，它就是最优策略

$$
\pi^\ast = \arg\max_\pi v_\pi(S)
$$

- 我们把不同 $\pi$ 下的所有 $v_\pi(S)$ 存在一张表里，从中挑出最好的策略。

在**基于策略 (policy-based)** 的算法中：

- 我们为 $\pi$ 构造一个模型，并通过调整其参数 $\theta$ 来优化。

$$
\pi^\ast = \pi(a\mid S,\theta)
$$

> [!note] 基于策略方法的特点
> 
> **优点**
> 
> - 高层次的函数近似  
> - 空间效率高得多（不需要巨大的表，只需一个带特征/变量的函数）  ⭐️
> - 在大规模/连续状态空间上泛化更好 ✅ 
> - 天然支持**随机策略 (stochastic policies)** ✅
> 
> **缺点**
> 
> - 可能只收敛到**局部最优**  ⚠️
> - 策略评估存在**高方差**问题 ⚠️
>   - 蒙特卡洛回报需要采样完整轨迹 → **效率低**  
> - 难以用于**离策略 (off-policy)** ❌
>   - 更新 $\theta$ 会改变策略 → 进而改变数据分布  
>   - 需要在新策略下重新采样（旧数据无法复用）

---
## 策略梯度

1. 用一个目标函数来定义最优策略：$J(\theta$)
2. 用基于梯度的优化方法搜索最优策略

$$
\theta_{t+1} = \theta + \alpha \nabla J(\theta_t)
$$

---
## 目标函数

目标：$maximise$ 该策略下的**期望长期回报 (expected long-term return)**：

$$
J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta}\left[\, G(\tau) \,\right],
$$

其中

- $\tau$ 表示遵循该策略所生成的轨迹 (trajectory)

---
##  优化目标函数

使用梯度下降：

$$
\theta_{k+1} = \theta_k - \alpha \nabla J(\theta_k)
$$
$\nabla J(\theta_k)$ 的计算方式：

- **有限差分 (finite difference)**
	- 在 $\theta_k$ 上运行一幕，得到 $J(\theta_k)$
	- 把 $\theta_k$ 稍微改成 $\theta_k + \epsilon \vec{e}_k$
		- 其中 $\epsilon \vec{e}_k$ 是一个小噪声（向量形式）
	- 在 $\theta_k + \epsilon \vec{e}_k$ 上再运行一幕，得到 $J(\theta_k + \epsilon \vec{e}_k)$
	- 用有限差分估计梯度：

$$
\nabla J(\theta) \approx 
\frac{J(\theta + \epsilon e_i) - J(\theta)}{\epsilon}
$$

- **真梯度下降**（梯度上升算法 (gradient-ascent algorithm)）

$$
\begin{aligned}
\nabla J(\theta)
&= \sum_{\tau} \nabla P(\tau \mid \theta) \, G(\tau)
&& \text{(definition of expected return)} \\[4pt]
&= \sum_{\tau} P(\tau \mid \theta) \, \nabla \log P(\tau \mid \theta) \, G(\tau)
&& \text{(apply log-derivative trick)} \\[4pt]
&= \mathbb{E}_{\tau \sim P(\tau \mid \theta)} \big[ \nabla \log P(\tau \mid \theta) \, G(\tau) \big]
&& \text{(convert sum to expectation)} \\[4pt]
&= \mathbb{E}_{\pi_\theta} \big[ \nabla \log \pi_\theta(A \mid S) \, G(\tau) \big]
&& \text{(expand trajectory likelihood)}
\end{aligned}
$$

- **随机梯度下降**

$$
\nabla J(\theta) \approx \nabla \log \pi_\theta (a_t \mid s_t) \, G(\tau)
$$

其中

- $\nabla \log \pi_\theta(a \mid s)$ 也称为**得分函数 (score function)**

> 为了计算得分函数，我们不能再用确定性的/非线性的/不可微的 $\{0,1\}$ 来描述策略。
> 
> 因此我们引入一些**软策略 (soft policy)** 方法，让策略的输出是概率性的。

---
## 确定性策略 → 随机策略
### 确定性/近确定性策略 

直接给出最优动作：

$$
\pi(a \mid s) = \mathbf{1}\{\, a = a^*(s) \,\}
$$

或者使用软策略做少量探索：

#### ε-贪心 

大部分时间利用（$P = 1 - \varepsilon$），少部分时间探索（$\varepsilon$）：

$$
\pi(a \mid s) =
\begin{cases}
1 - \varepsilon + \dfrac{\varepsilon}{|\mathcal{A}|}, & \text{if } a = \arg\max_{a'} Q(s,a') \\
\dfrac{\varepsilon}{|\mathcal{A}|}, & \text{otherwise}
\end{cases}
$$

#### 上置信界 (Upper Confidence Bound, UCB) 

利用 + 探索奖励 (exploration bonus)：

$$
a = \arg\max_a \left( Q(a) + c \sqrt{\frac{\ln t}{N(a)}} \right)
$$

其中

- $c$ - 探索的重要程度（**参数**）
- $\ln{t}$ - 随时间推移增加探索
- $N(a)$ - 避免在同一个动作上尝试太多次

> 之前所有强化学习方法的输出都可以是确定性的（即最优动作），不需要**可微**的概率。

---
### 随机策略 

给出每个动作的概率：
$$
\pi(a \mid s) = P(a \mid s)
$$
- 具备探索能力；鲁棒性好✅


#### softmax 

$$
\pi(a \mid s)
= \frac{\exp\!\left(h_\theta(s,a)\right)}
       {\sum_{a' \in \mathcal{A}} \exp\!\left(h_\theta(s,a')\right)}
$$

其中 $h(\cdot)$ 是另一个特征函数

#### 高斯

动作空间需要是连续的：

$$
\pi(a \mid s)
= \frac{1}{\sqrt{2\pi\sigma_\theta^2(s)}}
  \exp\!\left(
    -\frac{\left(a-\mu_\theta(s)\right)^2}{2\sigma_\theta^2(s)}
  \right).
$$

---
## 求解得分函数

使用 Softmax 时：

$$
\begin{align}
\nabla \log \pi_\theta(a \mid s)
&= \nabla h(a) - \mathbb{E}_{a' \sim \pi_\theta}[\nabla h(a')]
\end{align}
$$
****
使用高斯（假设 $\sigma$ 固定）时：

$$
\nabla \log \pi_\theta(a \mid s) = \frac{a - \mu_\theta(s)}{\sigma^2}\nabla \mu_\theta(s)
$$

> [!warning] ε-贪心**不能**用于求解得分函数
> 
> 得分函数估计量需要一个**可微**的随机策略，这样对数概率的梯度才有定义。
> 
> 然而 ε-贪心中的 $\arg\max Q(s,a)$ 步骤是离散的，因此**不可微**，不满足这一要求。

---
## 近似期望回报
### 平均状态价值

通过 $maximise$ 所有状态价值的加权平均：

$$
J(\theta) 
= \sum_{s \in S}d^{\pi_\theta}(s)v^{\pi_\theta}(s)
$$

其中

- $d^{\pi_\theta}(s)$ 是每个状态的权重（重要性）

---
### 起始状态价值

在分幕式环境中，我们可能只关心起始状态的价值：

$$
J(\theta) 
= v^{\pi_\theta}(s_0)
$$

---
### 平均单步奖励

通过 $maximise$ 所有即时奖励的加权平均：

$$
J(\theta) 
= \sum_{s \in S}d^{\pi_\theta}(s) 
\sum_{a \in A} \pi_\theta(a \mid s) \, R^a_s
$$

---
### 策略梯度定理

平均状态价值与平均单步奖励是**等价**的：

$$
\bar{R}_\pi = (1 - \gamma) \, \bar{v}_\pi
$$

写成梯度形式：

$$
\nabla \bar{R}_\pi \simeq { \mathbb{E}_{\pi_{\theta}} \bigl[ \nabla_{\theta} \log \pi_{\theta}(a \mid s) \; q_{\pi_{\theta}}(s,a) \bigr]}
$$

$$
\nabla \bar{v}_\pi = \frac{1}{1 - \gamma} \nabla \bar{R}_\pi
$$

$$
\nabla v_\pi(s_0) = { \mathbb{E}_{\pi_{\theta}} \bigl[ \nabla_{\theta} \log \pi_{\theta}(a \mid s_0) \; q_{\pi_{\theta}}(s_0,a) \bigr]}
$$


总之，上述方法的梯度形式都可以化简为同一个公式：

$$
\nabla_{\theta} J(\theta) 
= { \mathbb{E}_{\pi_{\theta}} \bigl[ \nabla_{\theta} \log \pi_{\theta}(a \mid s) \; q_{\pi_{\theta}}(s, a) \bigr]}
$$

> 然后就可以用熟悉的价值近似器（MC/TD）来求 $q_{\pi_{\theta}}(s, a)$。

---
### REINFORCE

由 MC 导出，可以用回报 $v_t$ 作为 $q_{\pi_{\theta}}(s,a)$ 的无偏样本：

$$
q_{\pi_{\theta}}(s,a) = v_t
$$

---
### 演员-评论家

#### QAC

由 TD 导出，可以用一个价值函数近似器来估计动作价值函数：

$$
q_{\pi_{\theta}}(s,a) = q(s,a, w)
$$

|            | 演员 (Actor)                              | 评论家 (Critic)                             |
| ---------- | ---------------------------------- | ---------------------------------- |
| **角色**   | 策略                             | 策略评估（价值函数） |
| **输入**  | 评分                              | 状态、奖励、动作              |
| **任务**   | 用策略梯度更新 $\theta$ | 用价值学习更新 $w$       |
| **输出** | 策略选出的动作        | 评分（价值 / 优势）          |

---
#### A2C - 优势演员-评论家

引入一个基线 (baseline)，在不改变期望的前提下降低方差[^1]：

$$
\begin{align}
\nabla_{\theta} J(\theta) 
&= { \mathbb{E}_{\pi_{\theta}} 
\bigl[ \nabla_{\theta} \log \pi_{\theta}(a \mid s) \;
q_{\pi_{\theta}}(s, a) \bigr]} \\[4pt]
&= { \mathbb{E}_{\pi_{\theta}} 
\bigl[ \nabla_{\theta} \log \pi_{\theta}(a \mid s) \; 
\left[ q_{\pi_{\theta}}(s, a) - B(s) \right] \bigr]}
\end{align}
$$

- 一个好的（**次优的**）基线是状态价值函数 $v_{\pi_\theta}(s)$

代入后得到**优势函数 (advantage function)**：

$$
A_{\pi_{\theta}}(s,a) =q_{\pi_{\theta}}(s, a) - v_{\pi_\theta}(s)
$$

于是，

$$
\nabla_{\theta} J(\theta) 
= { \mathbb{E}_{\pi_{\theta}} \bigl[ \nabla_{\theta} \log \pi_{\theta}(a \mid s) \; A_{\pi_{\theta}}(s,a) \bigr]}
$$

由 TD 导出，可以用 **TD 误差**来**无偏**地估计这个函数

$$
\delta_{\pi_{\theta}} = r + \gamma v_{\pi_{\theta}}(s') - v_{\pi_{\theta}}(s)
$$

$$
\begin{align}
\mathbb{E}_{\pi_{\theta}}[\delta_{\pi_{\theta}} \mid s,a]
&= \mathbb{E}_{\pi_{\theta}}[r + \gamma v_{\pi_{\theta}}(s') \mid s,a] - v_{\pi_{\theta}}(s) \\[2pt]
&= q^{\pi_{\theta}}(s,a) - v^{\pi_{\theta}}(s) \\[2pt]
&= A^{\pi_{\theta}}(s,a)
\end{align}
$$

最终，我们实际上只需用 **TD 误差**来计算策略梯度：

$$
\nabla_{\theta} J(\theta)
= {\mathbb{E}_{\pi_{\theta}} \big[ \nabla_{\theta} \log \pi_{\theta}(s,a)\; \delta_{\pi_{\theta}} \big]}
$$

[^1]: 【第10课-Actor-Critic方法（Part2-Advantage Actor-Critic (A2C)）【强化学习的数学原理】-哔哩哔哩】 https://b23.tv/SlGApOj
