# 3 松弛
---
## 复杂度

- **P**：问题可以在多项式时间（polytime）内求解
- **NP**：问题可以在非确定性多项式时间内求解
- **PSPACE**：问题可以在多项式空间内求解
- **EXP**：问题可以在指数时间内求解


$$
P \subseteq NP \subseteq PSPACE \subseteq EXP
$$

> [!info] 萨维奇定理（Savitch’s Theorem） 
> 
> ***NPSPACE = PSPACE***
> - 非确定性不会让问题变得更难，也不会让求解器变得更强大。

一个判定问题 $L$ 是 ***PSPACE 完全***（PSPACE-complete）的，当且仅当：

1. $L \in$ ***PSPACE***
	- $L$ 可以在多项式空间内求解
2. $L$ 是 ***PSPACE 难***（PSPACE-hard）的
	- ***PSPACE*** 中的每个问题都可以在多项式时间内归约到 $L$

---
## 目标的定义

$\mathrm{PlanEx}(P)$

- 用于进行**满意**（satisficing）规划
- $\mathrm{PlanEx}(P) =$ `TRUE` - 问题 $P$ 存在一个规划。


**$\mathrm{PlanLen}(P)$**  

- 用于进行**最优**（optimal）规划
-  $mathrm{PlanLen}(P) \le B$ - 存在一个长度至多为 $B$ 的规划。

> [!note] 注意
> $\mathrm{PlanEx}$ 和 $\mathrm{PlanLen}$ 都是 _PSPACE 完全_的。
> - *在实践中，最优规划几乎从来都不容易*

---
## 松弛 

一种用于**简化**启发值计算的变换。

$$
\mathcal{R} = (\mathcal{P'}, r, h'^*)
$$

其中

- $\mathcal{P}'$ - 更简单问题所属的类 
- $r$ - 把原问题转化为简化问题的变换器
- $h'^*(n)$ - 简化问题的完美启发函数 

> [!NOTE] 松弛的性质
> 
> 一个松弛（relaxation）是：
> 
> - **原生的**（native）- 如果 $\mathcal{P'} \subseteq \mathcal{P}$ 且  $h'^*(n) = h(n)$
> - **可高效构造的**（efficiently constructible）- 如果存在多项式时间的 $r$
> - **可高效计算的**（efficiently computable）- 如果存在多项式时间的 $h’(n)$

> [!NOTE]- 松弛的应用
> 
> 1. 寻路（route-finding）
> 	- 松弛
> 		- 像鸟一样寻路（忽略道路）
> 	- 结果
> 		- 道路距离 → 曼哈顿距离、欧氏距离等
> 	- 原生❌ 可高效构造✅ 可高效计算✅
> 
> 2. 目标计数（goal-counting）
> 	- 松弛
> 		- 假设我们可以直接达成每个目标
> 	- 结果
> 		- 任务 ← 没有前提条件和删除效果
> 	- 可采纳，但仍然是 *NP 难*的
> 	- 原生✅ 可高效构造✅ 可高效计算❌

> [!tip] 仍然低效？
> 
> - 近似 $h’^*$
> - 重新设计 $h’^*$，使其通常是可行的
> 	- 关键路径启发函数（critical path heuristics）
> 	- **删除松弛**（delete relaxation）← 在满意规划中广泛使用
> 	- 抽象（abstractions）
> 	- 地标（landmarks）

---
## 删除松弛

 令 $Del(a) = \emptyset, \forall a \in A$。
 
- 事实一旦为 `TRUE`，就会"永远"保持 `TRUE`

### 支配 

$s' \supseteq s$ - $s'$ 支配（dominate）$s$

> [!NOTE] 支配的性质
> 
> - 如果 $s$ 是目标状态，那么 $s'$ 一定是目标状态。
> - 如果 $a^+$ 在 $s$ 中可用，那么 $a^+$ 在 $s'$ 中一定可用。
> - $Result(s, a^+)$ 同时支配 $s$ 和 $Result(s, a)$

---
## 最优删除松弛启发函数（$h^+$）

在启发值计算中应用删除松弛。

```pseudo
def h_plus(s, G, A):
	if G in s:
		return 0

	open = [s]
	cost[s] = 0
	cost[others] = inf
	best = inf

	while open:
		cur_state = pop(open)
		if G in cur_state:
			best = min(best, cost[cur_state])
			continue

		for a in A:
			if pre(a) in current:
				next_state = current + add(a)
				if cost[next_state] > cost[cur_state] + 1:
					cost[next_state] = cost[current] + 1
					push(open, next_state)
	
	if best == inf:
		return unsolvable
	else:
		return best
```


> [!NOTE] 效果：$h^+$
> 
> - **原生松弛**✅
> - 安全✅、目标感知✅、保证可采纳✅
> - 可高效构造✅ 多项式时间
> - 可高效计算❌
> 	- $\mathrm{PlanOpt^+} = \sum h^+$ 仍然是 *NP 难*的

---
### Bellman-Ford 算法

一种基于 $h^+$ 的扩展规划算法。

1. 初始时令 $d[s_0] = 0$；其他 $d[s] = \infty$。
2. 松弛每条边：
	- 对每条边 $\langle u, r, v \rangle$：
		- 若 $d[u] + w < d[v]$，则更新 $d[v] \gets d[u] + w$ 
	- 重复 $|V| - 1$ 次，以确保所有最短路径都被传播
3. 再次检查所有边，如果仍存在可松弛的边，则图中存在负环

> [!NOTE] 效果：Bellman-Ford
> 
> - 至多用 $|V| - 1$ 步找到到达每个节点的所有最短路径 ✅
> - 能够检测负环

%% 
示例
A→B(+4); A→C(+5); B→C(-2)
| 顶点 | 初始化 | 第 1 轮 |   第 2 轮   |
| :----- | :------------: | :-----: | :---------: |
| A      |       0        |    0    |      0      |
| B      |       ∞        |    4    |      4      |
| C      |       ∞        |    5    | 2 (= 4 - 2) |
%%

---
## 加性启发函数（$h^{add}$）

取从当前状态到所有目标的启发值之**和**。

```
def h_sum(s, G, A):
	for p in P:
		if p in s:
			cost[p] = 0
		else:
			cost[p] = inf

	changed = True
	while changed:
		changed = false
		for a in A:
			if cost[q] < inf for all q in pre(a):
✏️	            new_cost = 1 + sum(cost[q] for q in pre(a))
				for p in add(a):
					if new_cost < cost[p]:
						cost[p] = new_cost
						changed = true

✏️	return sum(cost[g] for g in G)
```

> [!NOTE] $h^{add}$ 的效果
> - 可高效计算✅ *多项式时间*
> - **悲观**估计：可采纳❌ 信息量大✅ 
> - 由于忽略了正向交互（即共享的子规划）而**重复计数**
> 	- 可能导致对 $h^*$ 的 $dramatic$（剧烈）高估

---
## 最大启发函数（$h^{max}$）

只取从当前状态到这些目标中 $highest$（最高）的启发值。

```
def h_max(s, G, A):
	for p in P:
		if p in s:
			cost[p] = 0
		else:
			cost[p] = inf

	changed = True
	while changed:
		changed = false
		for a in A:
			if cost[q] < inf for all q in pre(a):
				# a is reachable
				new_cost = 1 + max(cost[q] for q in pre(a))
				for p in add(a):
					if new_cost < cost[p]:
						cost[p] = new_cost
						changed = true

	return max(cost[g] for g in G)
```

> [!NOTE] $h^{max}$ 的效果
> - 可高效计算✅ *多项式时间*
> 	- 然而，有时可能过于乐观⚠️
> - **乐观**估计：可采纳✅

---
## 松弛规划的存在性（$\mathrm{PlanEx}^+$）

通过*快速前向扩展*检查是否存在规划。

- **快速前向扩展**（fast forward expansion）：用 BrFS 不断扩展初始状态的*事实集合*，直到它支配所有目标状态。

```
def plan_exists(s, G, A):
	if G in s:
		return TRUE
	
	reached = s
	while G not in reached:
		new_facts = reached
		for a in A:
			if pre(a) in reached:
				new_facts += add(a)
		if new_facts == reached:
			return FALSE
		reached = new_facts
	
	return TRUE
```

> [!NOTE] $\mathrm{PlanEx}^+$ 的效果
> 
> - 可靠（sound）、完备，并在*多项式时间*内终止✅
> 	- $\mathrm{PlanEx}^+$ 现在变成了一个*多项式时间*问题
> - 安全✅、目标感知✅、可采纳❌
> - **只能**用来检查**松弛**规划是否存在 ⚠️

---
### 有用动作

一个动作是有用的（helpful），当且仅当：

- 它在当前状态中可用（$pre(a) \subseteq s$）
- 它包含在由**快速前向扩展**给出的松弛规划中

> [!warning] 只扩展有用动作并不能保证*完备性*。
> 
> 有用动作是一种基于启发的**剪枝**（pruning），一些必要但不直观的动作可能无法被选到

---
## 松弛规划启发函数（$h_{FF}$）

在快速前向扩展的基础上，我们可以进一步执行*贪婪后向提取*，以找到**最优**的松弛规划。

- **贪婪后向提取**（greedy backward extraction）：基于*最佳支持者函数*找到代价最低的*有用动作*。

---
### 最佳支持者函数 $bs(p)$

输出满足 $add(a) \supseteq p$ 的 $cheapest$（代价最低的）动作 $a$。

> [!tip] 有效的 $bs(\cdot)$ 的前提条件
> 
> **$bs(\cdot)$ 是封闭的**（closed）
> 
> - 回归过程中可能出现的每个谓词都必须有定义好的回归（没有遗漏的情况）。
> - 保证后向搜索不会因为未定义的子目标而卡住。✅
> 
> **$bs(\cdot)$ 是良有界的**（well-bounded）
> 
> - 子目标的依赖/支持图是无环的。
> - 确保回归不会绕回之前的子目标，从而防止无限递归。✅


通过执行快速前向扩展，**如果存在松弛规划，那么一定存在一个封闭且良基（well-founded）的 $bs(\cdot)$**，这意味着：

- 存在一条从 $I$ 到 $G$ 的松弛路径
- 每个 $g$ 至少有一个支持者，其子目标也是如此

---
### 算法：$h_{FF}$

- 执行快速前向扩展
- 对每个目标状态 $g \in G$：
	- 找到代价最低的 $a = bs(g)$
	- 把这个动作加入规划
	- 对 $bs(pre(a))$ 重复以上步骤

```
def h_FF(I, G, A):
	if G in I:
		return 0
	
	# Forward Expansion - BrFS
	reached = I
	while G not in reached:
		new_facts = reached
		for a in A:
			if pre(a) in reached:
				new_facts += add(a)
		if new_facts == reached:
			return unsolvable
		reached = new_facts
	
	# Backward Extraction - Greedy
	plan = []
	subgoals = G
	while subgoals not in I:
		new_subgoals = []
		for g in subgoals:
			pick a s.t. g in add(a) and pre(a) in reached
			plan += {a}
			new_subgoals += pre(a)
		subgoals = new_subgoals
	
	return len(plan)
```

> [!NOTE] $h_{FF}$ 的效果
> 
> - 与 $h^{add}$ 具有相同的理论性质：
> 	- 可能重复计数被不同子目标共享的子规划 ⚠️
> - 最佳支持者是贪婪选择的，因而是次优的 ⚠️
> 
> 然而在实践中，$h_{FF}$ 通常不会高估 $h^*$，或者高估的幅度不大。💭