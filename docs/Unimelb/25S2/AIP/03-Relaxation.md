# 3 Relaxation
---
## Complexity

- **P**: Problem can be solved using polytime
- **NP**: Problem can be solved using non-deterministic polytime
- **PSPACE**: Problem can be solved using polynomial space
- **EXP**: Problem can be solved using exponential time


$$
P \subseteq NP \subseteq PSPACE \subseteq EXP
$$

> [!info] Savitch’s Theorem 
> 
> ***NPSPACE = PSPACE***
> - Non-determinism won't make problems to be harder or solvers to be more powerful.

A decision problem $L$ is ***PSPACE-complete*** iff:

1. $L \in$ ***PSPACE***
	- $L$ can be solved using polynomial space
2. $L$ is ***PSPACE-hard***
	- every problem in ***PSPACE*** can be polynomial-time reduced to $L$

---
## Goals Definition

$\mathrm{PlanEx}(P)$

- for making a **Satisficing** planning
- $\mathrm{PlanEx}(P) =$ `TRUE` - Existence of a plan for problem $P$.


**$\mathrm{PlanLen}(P)$**  

- for making a **Optimal** planning
-  $mathrm{PlanLen}(P) \le B$ - Existence of a plan which length is at most $B$.

> [!note] Note
> Both $\mathrm{PlanEx}$ and $\mathrm{PlanLen}$ are _PSPACE-complete_.
> - *In practice, optimal planning is almost never easy*

---
## Relaxation 

A transformation for **simplifying** the heuristic value computation.

$$
\mathcal{R} = (\mathcal{P'}, r, h'^*)
$$

where

- $\mathcal{P}'$ - the class of the simpler problem 
- $r$ - transformer turning the original problem into a simplified one
- $h'^*(n)$ - Perfect heuristic function of the simplified problem 

> [!NOTE] Properties of a Relaxation
> 
> The relaxation is:
> 
> - **Native** - if $\mathcal{P'} \subseteq \mathcal{P}$ and  $h'^*(n) = h(n)$
> - **Efficiently Constructible** - if a polynomial $r$ exists
> - **Efficiently Computable** - if a polynomial $h’(n)$ exists

> [!NOTE]- Applications of Relaxation
> 
> 1. Route-Finding
> 	- Relaxation
> 		- Route-find as a bird (ignoring the road)
> 	- Outcome
> 		- Road Distance → Manhattan distance, Euclidean distance, etc.
> 	- Native❌ Efficiently constructible✅ Efficiently computable✅
> 
> 2. Goal-Counting
> 	- Relaxation
> 		- Assume we can achieve each goal directly
> 	- Outcome
> 		- Tasks ← No precondition and delete
> 	- Admissible but still *NP-hard*
> 	- Native✅ Efficiently constructible✅ Efficiently computable❌

> [!tip] Still inefficiency?
> 
> - Approximate $h’^*$
> - Re-design $h’^*$ in a way so that it will typically be feasible
> 	- Critical path heuristics
> 	- **Delete relaxation** ← wide-spread for satisficing planning
> 	- Abstractions
> 	- Landmarks

---
## Delete Relaxation

 Apply $Del(a) = \emptyset, \forall a \in A$.
 
- Facts once be `TRUE` will remain `TRUE` "forever"

### Dominance 

$s' \supseteq s$ - $s'$ dominate $s$

> [!NOTE] Properties of a Dominance
> 
> - If $s$ is a goal state, then $s'$ must be a goal state.
> - If $a^+$ is applicable in $s$, then $a^+$ must be applicable in $s'$.
> - $Result(s, a^+)$ dominates both $s$ and $Result(s, a)$

---
## Optimal Delete Relaxation Heuristic ($h^+$)

Apply delete relaxation on heuristic computation.

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


> [!NOTE] Outcomes: $h^+$
> 
> - **Native relaxation**✅
> - Safe✅, goal-aware✅, admissible guarantee✅
> - Efficiently constructible✅ Polytime
> - Efficiently computable❌
> 	- $\mathrm{PlanOpt^+} = \sum h^+$ still *NP-hard*

---
### Bellman-Ford Algorithm

A extension planning algorithm based on $h^+$.

1. Initially set $d[s_0] = 0$; other $d[s] = \infty$.
2. Relax every edge:
	- For each edge $\langle u, r, v \rangle$:
		- If $d[u] + w < d[v]$, update $d[v] \gets d[u] + w$ 
	- Repeat $|V| - 1$ times to ensure all shortest paths are propagated
3. Check all edges again, if any relaxable edges still exist, there are negative cycles in the graph

> [!NOTE] Outcomes: Bellman-Ford
> 
> - Find all shortest path to every node at most $|V| - 1$ steps ✅
> - Able to detect negative circles

%% 
Example
A→B(+4); A→C(+5); B→C(-2)
| Vertex | Initialisation | Round 1 |   Round 2   |
| :----- | :------------: | :-----: | :---------: |
| A      |       0        |    0    |      0      |
| B      |       ∞        |    4    |      4      |
| C      |       ∞        |    5    | 2 (= 4 - 2) |
%%

---
## Additive Heuristic ($h^{add}$)

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

> [!NOTE] Outcomes of $h^{add}$
> - Efficiently Computable✅ *Polytime*
> - **Pessimistic** Estimation: admissible❌ informative✅ 
> - **Overcounts** by ignoring positive interactions, i.e. shared sub-plans
> 	- May result in $dramatic$ over-estimates of $h^*$

---
## Max Heuristic ($h^{max}$)

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

> [!NOTE] Outcomes of $h^{max}$
> - Efficient Computable✅ *Polytime*
> 	- However, sometimes maybe too optimistic⚠️
> - **Optimistic** Estimation: admissible✅

---
## Relaxed Plan Existence  ($\mathrm{PlanEx}^+$)

Check if there exists a plan by *Fast Forward Expansion*.

- **Fast Forward Expansion**: Continuously expand *facts set* of the initial state by BrFS until it dominates all goal states.

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

> [!NOTE] Outcomes of $\mathrm{PlanEx}^+$
> 
> - Sound, complete, Terminates in *polytime*✅
> 	- $\mathrm{PlanEx}^+$ now becomes a *polytime* problem
> - Safe✅, goal-aware✅, admissible❌
> - Can ONLY be used to check existence of a **Relaxed** plan ⚠️

---
### Helpful Actions

An action is helpful iff:

- it is applicable in the current state ($pre(a) \subseteq s$)
- it is contained in the relaxed plan given by **Fast Forward Expansion**

> [!warning] Expanding only helpful actions does not guarantee *completeness*.
> 
> Helpful actions is a heuristic-based **pruning**, some necessary but non-intuitive might unachievable

---
## Relaxed Plan Heuristic ($h_{FF}$)

Derived from Fast Forward Expansion, we can further perform *Greedy Backward Extraction* for finding the **optimal** relaxed plan.

- **Greedy Backward Extraction**: Find the cheapest *helpful action* based on *Best Supporter Function*.

---
### Best Supporter Function $bs(p)$

Output the $cheapest$ action $a$ where $add(a) \supseteq p$.

> [!tip] Prerequisites of a valid $bs(\cdot)$
> 
> **$bs(\cdot)$ is closed**
> 
> - Every predicate that can appear during regression must have a defined regression (no missing cases).
> - Guarantees that backward search never gets stuck due to undefined subgoals.✅
> 
> **$bs(\cdot)$ is well-bounded**
> 
> - The dependency / support graph of subgoals is acyclic.
> - Ensures regression does not loop back to previous subgoals, preventing infinite recursion.✅


By performing Fast Forward Expansion, **if a relaxed plan exists, a closed well-founded $bs(\cdot)$ definitely exists**, which means:

- There is a relaxed path from $I$ to $G$
- Every $g$ has at least one supporter, so as its subgoals

---
### Algorithm: $h_{FF}$

- Perform Fast Forward Expansion
- For each goal states $g \in G$:
	- Find the cheapest $a = bs(g)$
	- Add this action to the plan
	- repeat on $bs(pre(a))$

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

> [!NOTE] Outcomes of $h_{FF}$
> 
> - Same theoretical properties as $h^{add}$:
> 	- May overcount sub-plans shared by different sub-goals ⚠️
> - Best Supporter is greedily selected and sub-optimal ⚠️
> 
> However in practice, $h_{FF}$ typically does not over-estimate $h^*$, or not by a large amount.💭