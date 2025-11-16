# 3 Complexity
---
## Complexity of a Problem

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
## *STRIPS*

*STRIPS* = "STanford Research Institute Problem Solver", which designed a language for:

- **Specification** - concise model description
- **Computation** - reveal useful information/structure for heuristics

All problems in following format can be solved by *STRIPS*:

$$
P = \langle P,A,I,G \rangle
$$

where

- $P$ - All Possible Predicates
- $A$ - Actions
- $I$ - Initial States: Predicates initially to be `TRUE`
- $G$ - Goal Conditions: Predicates Finally need to be `TRUE`

**Actions**

$$
a \in A, a = \langle Pre(a), Add(a), Del(a) \rangle
$$

where

- $Pre(a)$ - Preconditions need to be `TRUE` before executing the action
- $Add(a)$ - Add Effects: Preconditions set to be`TRUE` after execution
- $Del(a)$ - Delete Effects: Preconditions set to be `FALSE` after execution

**Result Function (Application/Transition Function)**

$$
Result(s, a) = (s - Del(a)) \cup Add(a)
$$

**Goal of *STRIPS***

Find a list of actions $[a_1,a_2,a_3,\ldots]$ which satisfies:

$$
Result(Result(\ldots Result(I,a_1​) \ldots ,a_n−1​),a_n​) \models G
$$

> [!NOTE] Outcomes: *STRIPS*
> 
> It turns "Solving a problem" into "Search for solutions".
> 
> Still _PSPACE-complete_, but problem is now more concise and intuitive:
> 	- Explicit Search
> 		- e.g. Blind/Heuristic search
> 		- Optimal Solution Guarantee✅; Not effective❌
> 
> And "***approximation***" is now able to be applied as well:
> 	- Near Decomposition
> 		- e.g. Relaxation
> 		- Effective✅; Maybe fail❌
