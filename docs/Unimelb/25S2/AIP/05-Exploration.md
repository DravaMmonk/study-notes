# 5 Exploration 
---
## Balancing the Exploitation & Exploration

**Exploitation**: Trusting your heuristic function


- State-based Satisfying Planning has multiple reliances ⚠️
	- heuristics derived from problem
	- plugged into Greedy Best-First Search (GBFS)  
	- extensions (e.g. helpful actions and landmarks)  
- Often gets stuck in local minima ❌
	- poly + sub-optimal or optimal + NP-hard

**Exploration**: Searching for Novelty

- Novelty leads to much better performance in practice ✅
- Can be **model-free** (No Reliance/Assumption) ✅
- Required for optimal behaviour (in RL and MTCS) ⚠️

!!! tip "Notes"
	A good agent needs to balance between Exploration and Exploitation

---
## Novelty 

**Novelty**: The size of the smallest **subset** of facts $P \subseteq s$, where such $s$ is the first state that makes $P$ `TRUE` during the search

**Width**: The size of the smallest subset of **$P$** needed to be considered to achieve the goal

##### EXAMPLE
$$
p \to (p, q) \to (q, r) \to (p, r) \to (p, q, r)
$$

| Current State | Smallest New Subset | Novelty |
|:-------------:|:-------------------:|:-------:|
|      $p$      |         $p$         |    1    |
|    $p, q$     |         $q$         |    1    |
|    $q, r$     |         $r$         |    1    |
|    $p, r$     |       $p, r$        |    2    |
|   $p, q, r$   |       $p, q$        |    2    |

---
## Width-Based Planning
### Iterated Width (IW)

**$IW(k)$** 

- BFS on $(Q \; \backslash \; s), \mathrm{novelty}(s) > k$
- $IW(1) =$ There is new $p$ appearing in every step in search

**$IW$ Algorithm**

- A sequence of calls $IW(k), k=1,2,3,\ldots$, until the problem solved or $k > len(\bigcup P)$ (return `unsolvable`). 
- The $minimum$ $k$ is the $\text{Width}$ of the problem

??? note "Outcomes of IW"
	- Simple and Blind
		- No heuristic
	- However performs pretty well in practice
		- $IW(k \le 2)$ can solve 88.3% IPC problems with single goal.
		- _Most classical problem (e.g. Blocks, Logistics, Gripper, n-puzzle) have a bounded width independent of problem size and initial situation_
	- **Fast** $\mathrm{O}(n^k)$✅
	- **Optimal** if in uniform cost✅
	- **Complete**✅

---
### Serialised Iterated Width (SIW)

Use $IW$ for decomposing multi-goals problem and solving sub-problems (with single goal) individually.

```
def SIW(s, G):
    state = s
    plan = []
    for g in serialize(G):
        subplan = IW(state, goal=g)
        plan += subplan
        state = Result(subplan, state)
    return plan
```

??? note "Outcomes of SIW"
	- Better performance in *Joint Goals* problem *(Multi goals but similar approaches)*.
	- Goals need to be easy to serialise and have low width.

---
### Best-First Width Search (BFWS)

BFWS is a **Framework**:

- **Framework**: Get communication across researchers and to build on each others’ work
- BFWS can be used as a framework to implement different measures

#### BFWS($f$)

Apply BFS (Priority Queue) on a sequence of measures:

$$
BFWS(f) \text{ for } f= \langle w,f_1,f_2,\ldots \rangle
$$

where

- $w$ - Novelty-Measure
- $f_i$ - tie breakers

---
#### Classical BFWS

$$
f = \langle w, h \rangle
$$

where

- $h = h_{add} \text{ or } h_{FF}$ 
- $w = w_h(s) =$  $s'$ which has smallest novelty and $h(s') = h(s)$

??? note "Outcomes"
	- Simple but practical✅
	- Able to be implemented as a simulator

---
## Model → Simulator

**Model**

Describe problems in a compact form. (e.g. STRIPS, PDDL)

??? note "Outcomes of Model"
	- Powerful with help of declarative programming:
		- Expressive language features easily supported
		- Development of external development tools
		- **Fully-Black-Box** procedures for higher-level abstraction and decomposing problems
	- However, they also have downsides:
		- **Model $\ne$ Language**
			- Many problems fit Classical Planning model, but hard to express in STRIPS or PDDL
		- **Declarative $\ne$ Practical**
			- Simulation platforms may be black-boxes as well, they need for planners that work without complete declarative representations

**Simulator**

A model but no $pre(a)$ and $add(a)$ for presenting $a$.

??? note "Outcomes of Simulator"
	- At the same level of efficiency as classic models
	- Open up exciting possibilities for modelling beyond PDDL (Model-free RL)

---
### Simulated BFWS

Implement BFWS($f$) algorithm to plan for simulators:

- Instead of using Transition Function in PDDL or STRIPS, run the simulator and record such transitions:

$$
s' = \text{Simulator.step}(s,a)
$$

- Choose the best action based on $BFWS(\langle w_h(s), h(s) \rangle)$

??? note "**Challenges** of Width-Based Planning over Simulators"
	- Non-linear dynamics  
	- Perturbation in flight controls  
	- Partial observability  
	- Uncertainty about opponent strategy

---
### Arcade Learning Environment

A simple object-oriented framework to develop AI agents for Atari 2600 games

- Deterministic
- Initial state fully known

Performance of $IW(1)$ 

- better in _34/54_ games than 2BFS
- better in _31/54_ games than UCT
- better in _45/49_ games than DeepMind (RL method)

---
## Plan & Goal Recognition

### Motivation

**Folk Psychology**

!!! info "Folk Psychology"
	Humans can explain and predict behaviour and mental state of others.

To solve hard problems, we may need our planners recognise the "intention" and "motivation" behind the problem and environment.

**Common Sense**

Common sense makes human's initiative possible.

!!! info "A Theory of Common Sense"
	- We always assume that others are rational.
	- We speculate beliefs, goals, reasons of others' actions.
	- We use practical reasoning to assess what others' will do next.

Planners can also use such formalised reasoning system as well.

---
### Planning → Plan & Goal Recognition

**Planning**

Given a set of goals, find a possible plan to achieve all goals from the current state.

**Plan & Goal Recognition** (PR/GR)

Given a list of actions, find most possible goals accounting for such partially observed plan.

 > PR/GR = Planning in reverse

---
### Formalising GR

1. **Input**: Partially Observed Actions + Domain Model
2. For every potential goals $g_i$
	- Use classical planner to generate a plan from $s_0$ to $g_i$
	- Check if such plan accounting for input actions
3. **Output**: Select the most reasonable goals and/or in probabilistic distribution form

??? note "Probabilistic Goals"
	Derive from Bayes' Rule
	
	$$
	P(G \mid O)
	= \alpha \, P(O \mid G)\, P(G),
	$$
	
	where
	
	$$
	P(O \mid G)
	= \mathrm{exp}\!\left(
	- \big(c^{*}(P'[\neg O \mid G]) - c^{*}(P'[O \mid G])\big)
	\right).
	$$
	
	- $c^{*}(P'[\neg O \mid G])$ gives the optimal cost to $G$ **NOT** accounting for the partial observations $O$
	- $c^{*}(P'[O \mid G])$ gives the optimal cost to $G$ accounting for $O$

---