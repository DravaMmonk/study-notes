# 1 搜索
---
## 搜索空间

**搜索空间**（search space）- 搜索或规划算法必须考虑的所有可能状态与转移的集合

###### 示例

在一个机器人送货场景中：

```
world_state_of_a_robot = {
    "position": (3, 5),
    "direction": "North",
    "battery": 80,
    "carrying_package": True
}

subgoals = {"position": (5, 8), "carrying_package": True}
```

> [!info]- 常用函数
> 搜索状态：
> 
> - $\mathrm{is}\_\mathrm{start}(s)$ 返回该状态是否为搜索空间的起始状态
> - $\mathrm{is}\_\mathrm{target}(s)$ 标记该状态是否为搜索空间的目标状态
> - $\mathrm{succ}(s)$ 返回 $s$ 的后继/下一状态列表
> 
> 搜索节点（search node）：
> 
> - $\mathrm{state}(\sigma)$
> - $\mathrm{parent}(\sigma)$ 即到达 $\sigma$ 的那个节点
> - $\mathrm{action}(\sigma)$ 从 $\mathrm{state}(\mathrm{parent}(\sigma))$ 通向 $\mathrm{state}(\sigma)$
> - $g(\sigma)$ 表示从**根节点**到 $\sigma$ 的路径代价
> - **根节点**的 $\mathrm{parent}(\cdot)$ 和 $\mathrm{action}(\cdot)$ 没有定义

---
## 搜索方法

### 前向搜索 vs. 后向搜索
- 前向搜索（forward search，又称前进，progression）
	- 搜索空间 = 世界空间（表示当前的真实世界）
	- BFS、DFS、A*、MDP
- 后向搜索（backward search，又称回归，regression）
	- 搜索空间 = 世界空间的集合（表示子目标的所有谓词）

### 盲目搜索 vs. 启发式搜索
- 盲目搜索（blind search）除问题本身之外不需要任何输入
- 无需额外工作，但很少有效
- 启发式搜索（informed search）需要一个函数 $h(x)$，把状态映射为对其到目标距离的估计
- 有效，但构造 $h(x)$ 需要大量工作

---
## 盲目系统搜索

- **广度优先搜索**（Breadth-First Search）
- **深度优先搜索**（Depth-First Search）
- **迭代加深搜索**（Iterative Deepening Search）
	- 执行 DLS（深度受限的 DFS），并将深度限制不断加 1。

> [!info]- 性质
> 
> - *完备性* 100%✅ 
> - 规模扩大时*效率*非常*低*☹️

---
## 启发式系统搜索
### 启发函数

- $h(n)$ - 估计的剩余代价（从当前状态到目标状态）
- $h^*(n)$ - 实际的剩余代价

$h(n)$ 的**信息充分程度**（proficiency）：

- $h = h^{\ast}$ 信息完全充分，$h(n) = h^{\ast}(n) - \textbf{optimal } A^{\ast}$
- $h = 0$ 完全没有信息 - 一致代价搜索（uniform cost search）

| 性质 | 描述                                            |
| ---------- | ------------------------------------------------------ |
| 安全（Safe）       | $h(n) = \infty$ 当且仅当 $h^{\ast}(n) = \infty$             |
| 目标感知（Goal-Aware） | $h(\text{goal}) = 0$                                   |
| 可采纳（Admissible） | $h(n) \le h^*(n)$                                      |
| 一致（Consistent） | 对所有可能的 $c(n, n’)$ 都有 $h(n) \le c(n,n’) + h(n’)$ |

> [!tip] 关系
> 
> - 一致 & 目标感知 → 可采纳
> - 可采纳 → 安全 & 目标感知

---
### 贪婪最佳优先搜索（GBFS）
- 使用**优先队列**（priority queue）将各节点的 $h(n)$ 按升序排列
	- 如果 $h(n) = 0$，它就完全取决于我们如何打破平局（break ties）

```
def greedy_BFS:
    frontier = priority queue ordered by h(n)
    explored = set
    path = list
    frontier.add(start, h(start), path)
    
    while frontier:
        current = frontier.pop()
        if current == goal:
            return path
        if current in explored:
            continue
        explored.add(current)
        for successor in succ(current):
            new_path = path + action(current, successor)
            frontier.add(h(current), current, new_path)
    return unsolvable
```

> 对安全的启发函数具有完备性✅；最优性❌

---
### A*
- 与 GBFS 的唯一区别：
	- $h(n) \rightarrow f(n) = g(n) + h(n)$

```pseudo
function A*(start, goal):
    open = priority queue
    open.push(start, f(start))

    while open is not empty:
        n = open.pop_min_f()

        if n == goal:
            return reconstruct_path(n)

        for each successor s of n:
            compute g(s) and f(s)
            open.push_or_update(s)
```
```

#### 重新打开

如果我们找到了更便宜的 $g(n)$，节点 $n$ 就可以被重新打开（re-opened）。

```
def a_star_with_re_opening:
    frontier = priority queue ordered by f(n) = g(n) + h(n)
    explored = set
	path = list
    frontier.add(h(start), start, path)
	
✏️	g = dict
✏️	g[start] = 0

	while frontier:
		_, current, path = frontier.pop()
		if current == goal:
			return path
		explored.add(current)
		for successor in succ(current):
			new_path = path + action(current, successor)
			new_g = cost(new_path)
			if successor not in g or new_g < g[successor]:
				[successor] = new_g
				f = g[successor] + h(successor)
				frontier.add(f, successor, f)
                
✏️				if successor in explored:     # Re-opening
✏️					explored.remove(successor)
	return unsolvable

```

若启发函数是一致的则不需要✅  $g$ 已经是最便宜的

---
### 加权 A*
$$
f_W(n) = g(n) + W \cdot h(n)
$$

| 权重         |       算法        |
|:-------------- |:----------------------:|
| $W \to 0$      |   Dijkstra 算法   |
| $W \to 1$      |           A*           |
| $W > 1$        | 有界次优 A*（bounded sub-optimal A*） |
| $W \to \infty$ |          GBFS          |

> 如果 $h$ 是可采纳的，则 $f_W(n) \le W \cdot h(n)$

---
### 爬山法

用暴力方式寻找贪婪意义上的最佳方向，进行启发式下降

```
def hill_climbing:
    path = list
    current = start
    while h(n) > 0:
        best = argmin_h(succ(current))
        if best and h(best) < h(current):
            current = n
            path += action(current, best)
        else:
            break    
    return path
```

> - 只能找到局部极大值
> - 仅当所有非目标状态都满足 $h(n) > 0$ 时可用

---
### 强制爬山法

在遇到局部最优时进行小范围的 BFS

```
def enforced_hill_climbing:
    path = list
    explored = set
    current = start
    while h(n) > 0:
        explored.add(current)
        best = argmin_h(succ(current))
        if best and h(best) < h(current):
            path += action(current, best)
        else:
            subs = n for n in neighbours_of(current) and not in explored
            best_sub = argmin_h(subs, goal=current)
            if best_sub and h(best_sub) < h(current):
                path -= action(parent, current)
                path += action(parent, best_sub)
                current = best_sub
            else:
                return unsolvable
    return path
```

> 能够跨越局部最优与全局最优之间的小间隙

---
### 迭代加深 A*

IDS + $A^*$：用 f(n) 而不是深度来限制 IDS
- 第一次搜索中：f(n) = f(start) = 0 + h(start)
- 之后的搜索中：f(n) = min_out_of_bound_excess
 
```
def ida_star:
    bound = f(start)
    while True:
        t = ids(start, bound)
        if t == goal:
            return solution
        if t == infinity:
            return unsolvable
        bound = t
```

 > 解决了 $A^*$ 的一个问题：队列/closed_set 过大
 

---
## 搜索方法的评估
### 保证

- **完备性**（completeness）只要存在解就一定能找到
- **最优性**（optimality）找到的解一定是最优的

### 复杂度

- 时间/空间（以生成的状态数/状态代价衡量）
- 决定复杂度的典型**状态空间特征**
	- **分支因子**（branching factor）$b$ 有多少个后继
	- **目标深度**（goal depth）$d$ 到达最浅目标状态所需的动作数

### 总结
|          |     DFS     | BrFS  |     IDS     |  A*   |    HC    |    IDA*     |
|:-------- |:-----------:|:-----:|:-----------:|:-----:|:--------:|:-----------:|
| 完备 |     ❌      |  ✅   |     ✅      |  ✅   |    ❌    |     ✅      |
| 最优  |     ❌      |  ✅*  |     ✅      |  ✅*  |    ❌    |     ✅*     |
| 时间     |  $\infty$   | $b^d$ |    $b^d$    | $b^d$ | $\infty$ |    $b^d$    |
| 空间    | $b \cdot d$ | $b^d$ | $b \cdot d$ | $b^d$ |   $b$    | $b \cdot d$ |

其中

- $b$ - 分支因子：每个节点的子节点数量之和
- $d$ - 解的深度：所有目标节点中的*$minimum$*（最小）深度
- DFS 无法处理有环图
- 只有在代价一致（uniform costs）时 BFS 才是最优的 
- 只有当 $h$ 是可采纳的（$h \le h^*$）时，$A^*$ / 迭代加深 $A^*$ 才是最优的

---