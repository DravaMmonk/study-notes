#  1. Search
---
## Search Space
- A set of search states
- Forward Search (Progression)
	- search space = world space (represents the current real world)
- Backward Search (Regression)
	- search space = a sets of world spaces (represents all predications of sub-goals)
###### EXAMPLE
In a robot delivery scene:
```
world_state_of_a_robot = {
    "position": (3, 5),
    "direction": "North",
    "battery": 80,
    "carrying_package": True
}
```

- Progression: 搜索树上的每个节点就是机器人在某个位置、朝向、能量、负载的组合状态。
- Regression:  搜索树上的每个节点共同组成“我们想要所有满足一个条件的世界状态集合”。

```
subgoals = {"position": (5, 8), "carrying_package": True}
```

Common Functions: 

- $s$ = search states
- $\mathrm{is}\_\mathrm{start}(s)$ return if the state is the start state of the search space
- $\mathrm{is}\_\mathrm{target}(s)$ mark if the state is the goal state of the search space
- $\mathrm{succ}(s)$ return a list of successors/next states of $s$
- Search nodes: 
	- $\mathrm{state}(\sigma)$
	- $\mathrm{parent}(\sigma)$ where $\sigma$ was reached
	- $\mathrm{action}(\sigma)$ leads from $\mathrm{state}(\mathrm{parent}(\sigma))$ to $\mathrm{state}(\sigma)$
	- $g(\sigma)$ denotes cost of path from the **root** to $\sigma$
	- The **root**’s $\mathrm{parent}(\cdot)$ and $\mathrm{action}(\cdot)$ are undefined

---
## Search Methods

### Blind Search vs. Informed Search
- Blind search not require any input beyond the problem
- No additional work but rarely effective
- Informed search requires function $h(x)$ mapping states to estimates their goal distance
- Effective but lots of work to construct $h(x)$

### Blind Systematic Search Algorithms
- **Breadth-First Search**
- **Depth-First Search**
- **Iterative Deepening Search**
	- Do DLS(DFS with depth limited) with continuously increasing depth limited by 1.
- Blind Search: *Completeness* 100%, but *poor efficient* when doing hard work

---
## Heuristic Functions
- $h(n)$ - Estimated remaining cost (from current state to goal state)
- $h^*(n)$ - Real remaining cost
- **proficiency** of $h(n)$ 
	- $h = h^{\ast}$ perfectly informed, $h(n) = h^{\ast}(n) - \textbf{optimal } A^{\ast}$
	- $h = 0$ no information at all - uniform cost search

| Properties | Description                                            |
| ---------- | ------------------------------------------------------ |
| Safe       | $h(n) = \infty$ iff $h^{\ast}(n) = \infty$             |
| Goal-Aware | $h(\text{goal}) = 0$                                   |
| Admissible | $h(n) \le h^*(n)$                                      |
| Consistent | $h(n) \le c(n,n’) + h(n’)$ for all possible $c(n, n’)$ |

#### Relations of properties
- **Consistent** & **Goal-aware** $\to$ **Admissible**
- **Admissible** $\to$ **Safe** & **Goal-aware**

## Informed Systematic Search Algorithms
### Greedy Best-First Search (with duplicate detection)
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

- Use **priority queue** to sort $h(n)$ of each node in ascending order
	- If $h(n) = 0$, it becomes what fully depends on how we break ties
- Completeness✅for safe heuristics; Optimal❌

---
### A* (with duplicate detection and re-opening)
```
def a_star:
    frontier = priority queue ordered by f(n) = g(n) + h(n)
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
✏️            frontier.add(cost(new_path) + h(current), current, new_path)
    return unsolvable
```

- **Only difference between greedy and A\*** $h(n) \rightarrow f(n) = g(n) + h(n)$
- **Re-opening** if a node is closed but we find a better cost(n), then we can re-visit and extend this node

---
### Weighted A*
$$
f_W(n) = g(n) + W \cdot h(n)
$$

| Weight         |       Algorithm        |
|:-------------- |:----------------------:|
| $W \to 0$      |   Digkstra Algorithm   |
| $W \to 1$      |           A*           |
| $W > 1$        | Bounded sub-optimal A* |
| $W \to \infty$ |          GBFS          |

- If $h$ is admissible, $f_W(n) \le W \cdot h(n)$

---
### Hill-Climbing
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
- Local Search: Can only find local maxima
- Make sense only if $h(n) > 0$ for all non-goal states

---
### Enforced Hill-Climbing
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
- Local Search: Do small range BFS when find local optimal
- Can across small gap between local best and global best

---
### Iterative Deepening $A^*$
- IDS + $A^*$: Use f(n) instead of depth to limit IDS
	- In First Search:  f(n) = f(start) = 0 + h(start)
	- Following Searches: f(n) = min_out_of_bound_excess
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
- Dealing with one of $A^*$’s problem: large queue/closed_set

---
## Evaluation of Search Methods
### Guarantees
- **Completeness** sure to find a solution if there is one
- **Optimality** solutions sure be optimal
### Complexity
- Time/Space (Measured in generated states/states cost)
- Typical **state space features** governing complexity
	- **Branching factor** $b$ how many successors
	- **Goal depth** $d$ number of actions to reach shallowest goal state
### Summary
|          |     DFS     | BrFS  |     IDS     |  A*   |    HC    |    IDA*     |
|:-------- |:-----------:|:-----:|:-----------:|:-----:|:--------:|:-----------:|
| Complete |     ❌      |  ✅   |     ✅      |  ✅   |    ❌    |     ✅      |
| Optimal  |     ❌      |  ✅*  |     ✅      |  ✅*  |    ❌    |     ✅*     |
| Time     |  $\infty$   | $b^d$ |    $b^d$    | $b^d$ | $\infty$ |    $b^d$    |
| Space    | $b \cdot d$ | $b^d$ | $b \cdot d$ | $b^d$ |   $b$    | $b \cdot d$ |

- $b$ - Branching Factor: sum of number of child nodes of each node
- $d$ - Solution Depth: *$minimum$* depth among all goal nodes
- DFS cannot handle cyclic graph
- BFS is optimal only when uniform costs are applied 
- $A^*$ / Iterative Deepening $A^*$ is optimal only when $h$ is admissible ($h \le h^*$)
