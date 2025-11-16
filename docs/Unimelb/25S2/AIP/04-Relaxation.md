# 4 Relaxation
---
## Relaxation 

A transformation for **simplifying** the heuristic value computation.

### Components 

$$
\mathcal{R} = (\mathcal{P'}, r, h'^*)
$$

where

- $\mathcal{P}'$ - the class of the simpler problem 
- $r$ - transformer turning the original problem into a simplified one
- $h'^*(n)$ - Perfect heuristic function of the simplified problem 

??? note "Properties of Relaxation"
	The relaxation is:
	
	- **Native** - if $\mathcal{P'} \subseteq \mathcal{P}$ and  $h'^*(n) = h(n)$
	- **Efficiently Constructible** - if a polynomial $r$ exists
	- **Efficiently Computable** - if a polynomial $h’(n)$ exists

##### Examples

1. Route-Finding
	- Relaxation
		- Route-find as a bird (ignoring the road)
	- Outcome
		- Road Distance → Manhattan distance, Euclidean distance, etc.
	- Native❌ Efficiently constructible✅ Efficiently computable✅

2. Goal-Counting
	- Relaxation
		- Assume we can achieve each goal directly
	- Outcome
		- Tasks ← No precondition and delete
	- Admissible but still *NP-hard*
	- Native✅ Efficiently constructible✅ Efficiently computable❌

### Still Inefficiency?

- Approximate $h’^*$
- Re-design $h’^*$ in a way so that it will typically be feasible
	- Critical path heuristics
	- **Delete relaxation** ← wide-spread for satisficing planning
	- Abstractions
	- Landmarks

---
## Delete Relaxation

 Apply $Del(a) = \emptyset, \forall a \in A$
 
> Facts once be `TRUE` will remain `TRUE` "forever"

### Dominance 

$s' \supseteq s$ - $s'$ dominate $s$

!!! note "Key properties of Dominance"
	- If $s$ is a goal state, then $s'$ must be a goal state.
	- If $a^+$ is applicable in $s$, then $a^+$ must be applicable in $s'$.
	- $Result(s, a^+)$ dominates both $s$ and $Result(s, a)$

---
## Optimal Delete Relaxation Heuristic ($h^+$)

Apply delete relaxation on heuristic computation.

```
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

??? note "Outcomes of $h^+$"
	- **Native relaxation**✅
	- Safe✅, goal-aware✅, admissible guarantee✅
	- Efficiently constructible✅ Polytime
	- Efficiently computable❌
		- $\mathrm{PlanOpt^+} = \sum h^+$ still *NP-hard*

---
### Bellman-Ford Algorithm

A extension planning algorithm based on $h^+$

1. Initially set $d[s_0] = 0$; other $d[s] = \infty$.
2. Relax every edge
	- For each edge $\langle u, r, v \rangle$:
		- If $d[u] + w < d[v]$, update $d[v] \gets d[u] + w$ 
	- Repeat $|V| - 1$ times to ensure all shortest paths are propagated
3. Check all edges again, if any relaxable edges still exist, there are negative cycles in the graph

??? note "Outcomes of Bellman-Ford"
	Find all shortest path to every node at most $|V| - 1$ steps.✅
	Able to detect negative circles

###### Example

A→B(+4); A→C(+5); B→C(-2)

| Vertex | Initialisation | Round 1 |   Round 2   |
|:------ |:--------------:|:-------:|:-----------:|
| A      |       0        |    0    |      0      |
| B      |       ∞        |    4    |      4      |
| C      |       ∞        |    5    | 2 (= 4 - 2) |

---
## $h^+$-Approximation Methods

> $h^+$ may be still too hard to get.

### Relaxed Plan Existence  ($\mathrm{PlanEx}^+$)

Continuously expand the current state by BrFS until it covers all goal states.

> Derive from Fast Forward Heuristic ($h_{FF}$)

```
def is_plan_existence(s, G, A):
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

??? note "Outcomes of $\mathrm{PlanEx}^+$"
	- Sound, complete, Terminates in *polytime*✅
		- $\mathrm{PlanEx}^+$ now becomes a *polytime* problem
	- Safe✅, goal-aware✅, admissible❌ (Existence Check Only, usually far from optimal)

---
### Additive Heuristic ($h^{add}$)

Take the **sum** of heuristic values to all goals from the current state.

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

??? note "Outcomes of $h^{add}$"
	- Efficient Computable✅ *Polytime*
	- **Pessimistic** Estimation: admissible❌ informative✅ 
	- **Overcounts** by ignoring positive interactions, i.e. shared sub-plans
		- May result in $dramatic$ over-estimates of $h^*$

---
### Max Heuristic ($h^{max}$)

Only take the $highest$ heuristic value to such goal from the current state.

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

??? note "Outcomes of $h^{max}$"
	- Efficient Computable✅ *Polytime*
		- However, sometimes maybe too optimistic⚠️
	- **Optimistic** Estimation: admissible✅

---

## Relaxed Plans
### Best Supporter Function $bs(p)$

**Input**: A predication $p$.

**Output**: The $cheapest$ action $a$ which supports $p$ as a fact.

**Prerequisites**：

- $p \in add(a)$ iff $bs(p) = a$
- $bs(\cdot)$ is closed
	- $bs(p)$ is defined for every $p \in (P \backslash s)$ that has a path to a goal $g \in G$
- $bs(\cdot)$ is well-bounded
	- Support Graph is *acyclic* 

!!! note "Properties of $bs(p)$"
	- If a relaxed plan exists, the closed well-founded $bs(\cdot)$ definitely exists.
	- There is a relaxed path from $I$ to $G$
	- Every $g$ has at least one supporter, so as its subgoals

---
### Helpful Actions

An action is helpful iff:

- it is applicable in the current state ($pre(a) \subseteq s$)
- it is contained in the final plan

> Expanding only helpful actions does not guarantee ***completeness***.

---
### Relaxed Plan Heuristic ($h_{FF}$)

Fast Forward Expansion + *Greedy Backward Extraction*

- For each goal state $g \in G$:
	- Find the cheapest $a = bs(g)$
	- Add this action to the plan
	- repeat on $bs(pre(a))$

```
def h_FF(I, G, A):
	if G in I:
		return 0
	
	# Forward Expansion - BFS
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

??? note "Outcome of $h_{FF}$"
	Same theoretical properties as $h^{add}$ but better in practice

	- Overcount sub-plans shared by different sub-goals
	- Best Supporter is greedily chosen and sub-optimal
	- In practice, $h_{FF}$ typically does not over-estimate $h^*$, or not by a large amount.