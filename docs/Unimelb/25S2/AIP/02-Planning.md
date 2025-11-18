# 2 Planning
---
## AI Solver

> [!note]- 3-level Solver Ambitions
> 
> **Ambition**: Write one program to solve all classical search problems
> 
> - **Ambition 1.0** (Problem Solving) Write one program to solve a problem
> - **Ambition 2.0** (Problem Generation) Write one program to solve a large class of problems
> - **Ambition 3.0** (Meta Problem Solving) Write one program to solve a large class of problems **effectively**

Programming-Based:

- Use static programs designed by the programmer
- e.g. Pac-man

Learning-Based:

- Unsupervised/Reinforced Learning: Use reward & penalise
- Supervised: Use labelled data
- Evolutionary: Use original controllers to mutate and recombine to build better controller
- e.g. OpenAI-Five

Model-Based (Planning):

- Construct a model for one specific class of problems
- Different models yield different types of **controllers**

![Planning Process](assets/3_1_planning_process.png)

> [!NOTE] Pros & Cons
> 
> Programming-Based
> 
> - Domain-knowledge easy to express✅
> - Less Flexible☹️ 
> - Can’t deal with no anticipation of programmer❌
> 
> Learning-Based
> 
> - Dose not require much knowledge in principle✅
> - Slower; Hard to know which features to learn☹️
> 
> Model-Based
> 
> - Powerful; Quick; Flexible; Clear; Intelligent; Domain-independent✅
> - Need a model (sometimes very hard); Efficiency loss☹️

> [!tip]
> To design a good solver, always balance between “Automatic and General” vs. “Manual but Effective”

---
## Models for Planning
### Classical Planning Model 

The most basic model for describing the environment, the goal output is a sequence of actions map $I$ to $G$.

$$
M = \langle S, A, T, I, G \rangle
$$

where

- $S$ - State spaces 
- $A(s)$ - Actions applicable for $s \in S$
- $T$ - Deterministic Transition Function: $s’ = T(A(s), s)$ shows one successor $s’$ of $s$
- $I$ - Initial state
- $G$ - Goal states
- Uniform action costs $c(A(s), s) = 1$

> [!NOTE] Properties of Classical Planning Model
> 
> - Simple; Intuitive✅
> - **Very strict assumptions**❗️❗️
> 	- Deterministic
> 	- Fully Observable
> 	- Static World
> 	- Discrete Time & Finite Actions
> 	- Uniform Cost

---
### Conformant Planning Model

Derived from Brute Force, implement the ability to handle stochasticity：

- Initial State → A set of possible initial states
- Deterministic Transition Function → **Non**-deterministic


> [!NOTE] Outcomes: Conformant
> - **Goal Guarantee** ✅
> - **No Observation** - No new info; must pre-planning⚠️
> - **Rarely optimal** ⚠️
> 	- Must map any possible $s_0$ to $g$, too much unnecessary work
> 	- Sensitive to Worst/Special case 


---
## Languages for Planning
### *STRIPS*

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
