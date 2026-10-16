# 6 马尔可夫决策过程
---
## 马尔可夫决策过程

用于基于模型的强化学习的通用环境模拟器

---
### 马尔可夫过程

一个*无记忆的*随机过程 

- **无记忆**（memoryless）：状态具有马尔可夫性
- 通过概率转移 $P$ 引入非确定性

$$
M = \langle S, P \rangle
$$

其中

- $S$ - 有限的状态集合
- $P$ - 表示状态转移概率的***矩阵***
	- $P(s \to s') = P(s' \mid s), \forall s, s' \in S$
	- $P$ 的每一行/列之和为 1

---
### 马尔可夫奖励过程（MRP）

带有奖励值的马尔可夫链：

$$
M = \langle S, P, R, \gamma \rangle
$$

其中

- $R$ - 奖励函数
	- $R(s) = \mathbb{E}[R' \mid s]$
- $\gamma$ - 折扣因子

---
### 马尔可夫决策过程（MDP）

通过动作引入**能动性**（agency）：

$$
M = \langle S, A, P, R, \gamma \rangle
$$
	
- $A$ - 有限的动作集合
- $P(s \to s) = P(s' \mid s)$
- $R(s) = \mathbb{E}[R' \mid s]$

---
### 部分可观测 MDP（POMDP）

**假设**

- 马尔可夫性质
- **有限**可观测

**组成部分** *（与 MDP 的区别）*

- 引入**传感器模型**（sensor model，基于**概率分布**）

$$
\mathrm{b}(s_t) = P(s_t \mid \text{historical actions and observations})
$$

- 初始/目标状态 → 信念状态（belief states）$\mathrm{b}(s_0)$ 和 $\mathrm{b}(g)$

**结果**

- 把信念状态映射为动作
- 如果从 $\mathrm{b}(s_0)$ 到 $\mathrm{b}(g)$ 的总期望代价最小，则为**最优**


---
## 贪婪最优策略

给出状态-动作价值 $maximum$（最大）的策略

**最优状态价值函数**

$$
V^\ast(s) = \max_\pi V_\pi(s)
$$

**最优状态-动作价值函数**

$$
Q^\ast(s,a) = \max_\pi Q_\pi(s,a)
$$

**最优策略**

$$
a=\arg\max_a Q^\ast(s,a)
$$

---
#### 贝尔曼最优方程 

由贝尔曼方程推导而来，我们可以用"即时奖励 + 下一状态的折扣回报"来表示期望回报：

**最优状态价值函数**

$$
\begin{align}
V^\ast(s)
&= \max_a \; \mathbb{E}\!\left[\, r + \gamma V^\ast(s') \,\right] \\[6pt]
&= \max_a \; \sum_{s'} P(s' \mid s,a)\left[\, r + \gamma V^\ast(s') \,\right]
\end{align}
$$

**最优状态-动作价值函数**

选择能使下一状态的状态-动作价值达到 $maximum$（最大）的动作：

$$
\begin{align}
Q^\ast(s,a)
&= \mathbb{E} \left[\, r + \gamma \max_{a'} Q^\ast(s',a') \,\right] \\[6pt]
&= \sum_{s',r} P(s',r\mid s,a)\left[\, r + \gamma \max_{a'} Q^\ast(s',a') \,\right]
\end{align}
$$

??? note "如何求解贝尔曼最优方程 "
	- 没有闭式解
	- 价值迭代（value iteration）
	- 策略迭代（policy iteration）
	- SARSA
	- Q-learning

---
### 示例 - 迷宫

![[assets/6_1_maze.png|300]]
**环境**：

- $S$ - 智能体可能的位置
- $A$ - 移动方向 $\mathtt{N, E, S, W}$
- $P$ - 映射 $s, a \to s'$
- $R$ - 每个时间步 $-1$（鼓励找到短路径的解）

**智能体**：

- $V(s)$ - 从每个 $s$ 出发遵循该策略的期望回报 
	- 离 $g$ 越近 - $V(s)$ ⤴
	- 离得越远 - $V(S)$ ⤵
- $\pi(s)$ - 最优策略 = 最佳的 $V(s')$

---