<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [WEEK 5 Relaxation](#week-5-relaxation)
  - [Relaxation](#relaxation)
    - [Components](#components)
    - [Properties - The Relaxation is](#properties---the-relaxation-is)
        - [Examples](#examples)
    - [Still Unsatisfactory Efficiency?](#still-unsatisfactory-efficiency)
  - [Delete Relaxation](#delete-relaxation)
    - [Dominance](#dominance)
  - [Optimal Delete Relaxation Heuristic ($h^+$)](#optimal-delete-relaxation-heuristic-h%5E)
    - [Instance of $h^+$ - Bellman-Ford Algorithm](#instance-of-h%5E---bellman-ford-algorithm)
          - [Example](#example)
  - [$h^+$ Approximation Methods](#h%5E-approximation-methods)
    - [Plan Existence Checking based on Fast Forward Heuristic ($h_{FF}$)](#plan-existence-checking-based-on-fast-forward-heuristic-h_ff)
    - [Max Heuristic ($h^{max}$)](#max-heuristic-h%5Emax)
    - [Additive Heuristic ($h^{add}$)](#additive-heuristic-h%5Eadd)
  - [Relaxed Plans](#relaxed-plans)
    - [**Best Supporter Function** $bs(p)$](#best-supporter-function-bsp)
    - [Plan Extraction Process - Backward Extraction](#plan-extraction-process---backward-extraction)
    - [Relaxed Plan Heuristic ($h_{FF}$)](#relaxed-plan-heuristic-h_ff)
    - [Helpful Actions](#helpful-actions)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# WEEK 5 Relaxation

## Relaxation 
- A method to compute heuristic functions $h(n)$
	- Defines a transformation for **simplifying** the _STRIPS_ problem
### Components 
$$
\mathcal{R} = (\mathcal{P'}, r, h'^*)
$$
- $\mathcal{P}'$ - the class of the simpler problem 
- $r$ - transformer turning the original problem into a simplified one
- $h'^*(n)$ - Perfect heuristic function of the simplified problem 
### Properties - The Relaxation is
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
### Still Unsatisfactory Efficiency?
- Approximate $h’^*$
- Re-design $h’^*$ in a way so that it will typically be feasible
	- Critical path heuristics
	- Delete relaxation ← wide-spread for satisficing planning
	- Abstractions
	- Landmarks

## Delete Relaxation
 - Apply:
 $$
 Del(a) = \emptyset, \forall a \in A
 $$
	- which makes "once"  `TRUE` _predications_ remain `TRUE` "forever"
- $a^+$ - Actions after delete relaxation
- **Optimal** Delete Relaxation is **Admissible** $h^+(n) \le h^*(n)$
	- *(but find an optimal solution is still NP-hard)*
### Dominance 
* $s' \supseteq s$ - $s'$ dominate $s$
	- If $s$ is a goal state, then $s'$ must be a goal state.
	- If $a^+$ is applicable in $s$, then $a^+$ must be applicable in $s'$.
- $Result(s, a^+)$ dominates both $s$ and $Result(s, a)$

## Optimal Delete Relaxation Heuristic ($h^+$)
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
- **Native relaxation**✅
- Safe✅, goal-aware✅, admissible guarantee✅
- Efficiently constructible✅ Polytime
- Efficiently computable❌
	- $\mathrm{PlanOpt^+} = \sum h^+$ still *NP-hard*
---
### Instance of $h^+$ - Bellman-Ford Algorithm
1. Distance estimate during the iterations in using shortest-distance algorithm
2. Initially set start point $= 0$; others $= \infty$.
3. Relax every edge (One iteration = all neighbour unexplored edges from one point)
4. Use a table to note estimate length of shortest path from start to current point
###### Example
* A→B(+4); A→C(+5); B→C(-2)

| Vertex | Initialisation | Round 1 |   Round 2   |
|:------ |:--------------:|:-------:|:-----------:|
| A      |       0        |    0    |      0      |
| B      |       ∞        |    4    |      4      |
| C      |       ∞        |    5    | 2 (= 4 - 2) |

## $h^+$ Approximation Methods
### Plan Existence Checking based on Fast Forward Heuristic ($h_{FF}$)
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
- Sound, complete, Terminates in *polytime*✅
	- $\mathrm{PlanEx}^+$ now becomes a *polytime* problem
- Safe✅, goal-aware✅, admissible❌ (Existence Check Only, usually far from optimal)
---
### Max Heuristic ($h^{max}$)
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
- Efficient Computable✅ *Polytime*
	- However, sometimes maybe too optimistic⚠️
- **Optimistic** Estimation: admissible✅
---
### Additive Heuristic ($h^{add}$)
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
- Efficient Computable✅ *Polytime*
- **Pessimistic** Estimation: admissible❌ informative✅ 
- **Overcounts** by ignoring positive interactions, i.e. shared sub-plans
	- May result in $dramatic$ over-estimates of $h^*$

## Relaxed Plans
### **Best Supporter Function** $bs(p)$
- Input: A predication $p$
- Output: The $cheapest$ action $a$ which make this predication `TRUE`
- Prerequisites
	- $p \in add(a)$ iff $bs(p) = a$
	- $bs(\cdot)$ is closed
		- $bs(p)$ is defined for every $p \in (P \; \backslash \; s)$ that has a path to a goal $g \in G$
	- $bs(\cdot)$ is well-bounded
		- Support Graph is *acyclic* 
- If a relaxed plan exists, the closed well-founded $bs(\cdot)$ definitely exists.
	- There is a relaxed path from $I$ to $G$
	- Every $g$ has at least one supporter, so as its subgoals
### Plan Extraction Process - Backward Extraction
- For each goal state $g \in G$:
	- Find the cheapest $a = bs(g)$
	- Add this action to the plan
	- repeat on $bs(pre(a))$
### Relaxed Plan Heuristic ($h_{FF}$)
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
- Same theoretical properties as $h^{add}$ but better in practice
	- Overcount sub-plans shared by different sub-goals
	- Best Supporter is greedily chosen and sub-optimal
	- In practice, $h_{FF}$ typically does not over-estimate $h^*$, or not by a large amount.
---
### Helpful Actions
- An action is helpful iff:
	- it is applicable in the current state ($pre(a) \subseteq s$)
	- it is contained in the final plan
- Expanding only helpful actions does not guarantee completeness.