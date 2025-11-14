# 05. Exploration 
---
## Novelty
- The size of the smallest **subset** of $P \subseteq s$, such that $s$ is the first state that makes $P$ `TRUE` during the search
- **Width**: The size of the smallest subset of **$P$** needed to be considered to achieve the goal

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
- $IW(k) =$ BFS on $(Q \; \backslash \; s), \mathrm{novelty}(s) > k$
	- $IW(1) =$ There is new $p$ appearing in every step in search
- $IW$ Algorithm
	- A sequence of calls $IW(k), k=1,2,3,\ldots$, until the problem solved or $k > len(\bigcup P)$ (return `unsolvable`). 
	- The $minimum$ $k$ is the $\text{Width}$ of the problem
- Outcomes
	- Simple and Blind
		- Even don't need to know $G$ 
	- However performs pretty well in practice
		- $IW(k \le 2)$ can solve 88.3% IPC problems with single goals.
		- _Most classical problem (e.g. Blocks, Logistics, Gripper, n-puzzle) have a bounded width independent of problem size and initial situation_
	- **Fast** $\mathrm{O}(n^k)$
	- **Optimal** if in uniform cost
	- **Complete**

---
### Serialised Iterated Width (SIW)
- Use $IW$ for decomposing problem and solving sub-problems individually
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

- Better performance in *Joint Goals* problem
	- *(Multi goals but similar approaches)*
- Ⓛ Goals should be easy to serialise and have low width

---
## Balancing Exploration & Exploitation
- **Exploitation**: Trusting your heuristic function
	- State-based Satisfying Planning Often Rely on:
		- heuristics derived from problem
		- plugged into Greedy Best-First Search (GBFS)  
		- extensions (e.g. helpful actions and landmarks)  
	- Often gets stuck in local minima
		- poly + sub-optimal or optimal + NP-hard
- **Exploration**: Searching for Novelty
	- Novelty leads to much better performance in practice
	- Can be **model-free** (No Rely/Assumption)
	- Required for optimal behaviour (in RL and MTCS)
- A good agent need to balance the Exploration and Exploitation
### Best-First Width Search (BFWS)
- Do BFS (Priority Queue) on a sequence of measures:
	$$
	BFWS(f) \text{ for } f= \langle w,f_1,f_2,\ldots \rangle
	$$
	- $w$ - Novelty-Measure
	- $f_i$ - tie breaker
- Much more efficient than GBFS

---
## Models to Simulators
### Models
- Nowadays, models become more powerful with helps of declarative programming
	- Expressive language features easily supported
	- Development of external development tools
	- **Fully-Black-Box** procedures for higher-level abstraction and decomposing problems
- However, Declarative Languages also have their downsides:
	- Model $\ne$ Language
		- Many problems fit Classical Planning model, but hard to express in PDDL
- We need for planners that work without complete declarative representations

---
### Simulators
- = Models but no $pre(a)$ and $add(a)$ for presenting $a$
- Outcomes
	- At the same level of efficiency as classic models
	- Open up exciting possibilities for modelling beyond PDDL

---
### Simulated BFWS Framework
- Framework
	- Get communication across researchers and to build on each others’ work
-  Approaches
	- Get "states" from the simulator
	- The optimal combination is $BFWS(\langle w_h(s), h(s) \rangle)$ 
		- $w_h(s) =$  $s'$ which has smallest novelty and $h(s') = h(s)$
- BFWS is the first planners using simulators
- Challenges of Width-Based Planning over Simulators
	- Non-linear dynamics  
	- Perturbation in flight controls  
	- Partial observability  
	- Uncertainty about opponent strategy

---
### Arcade Learning Environment
- A simple object-oriented framework to develop AI agents for Atari 2600 games
	- Deterministic
	- Initial state fully known
- Performance of $IW(1)$ 
	- better in _34/54_ games than 2BFS
	- better in _31/54_ games than UCT
	- better in _45/49_ games than DeepMind (RL method)


