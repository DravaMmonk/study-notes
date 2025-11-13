<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [WEEK 4 Complexity](#week-4-complexity)
  - [Savitch’s Theorem](#savitchs-theorem)
  - [Goals Definition](#goals-definition)
  - [STRIPS planning problem](#strips-planning-problem)
    - [*STRIPS* = STanford Research Institute Problem Solver](#strips--stanford-research-institute-problem-solver)
    - [**Components**](#components)
      - [Action](#action)
      - [Result of the Action](#result-of-the-action)
      - [Goal](#goal)
    - [Properties](#properties)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# WEEK 4 Complexity

## Savitch’s Theorem 
- NPSPACE = PSPACE
	- Non-determinism won't make solvers more powerful.
- PSPACE-complete
	- The problem is at least hard as **any** Polynomial time problem

## Goals Definition
- To make a **Satisficing** planning:
	- $\mathrm{PlanEx}(P) = 1$ - Existence of a plan for problem $P$.
- To make a **Optimal** planning:
	- **$\mathrm{PlanLen}(P) \le B$**  - Existence of a plan which length is at most $B$.
- $\mathrm{PlanEx}$ and $\mathrm{PlanLen}$ is _PSPACE-complete_
	- *In practice, optimal planning is almost never easy*

## STRIPS planning problem
### *STRIPS* = STanford Research Institute Problem Solver
- Design Goals:
	- **Specification** - concise model description
	- **Computation** - reveal useful information/structure for heuristics
### **Components**
$$
P = \langle P,A,I,G \rangle
$$
where
- $P$ - All Possible Predicates
- $A$ - Actions
- $I$ - Initial States: Predicates initially to be `TRUE`
- $G$ - Goal Conditions: Predicates Finally need to be `TRUE`
#### Action
$$
a \in A, a = \langle Pre(a), Add(a), Del(a) \rangle
$$
where
- $Pre(a)$ - Preconditions need to be `TRUE` before executing the action
- $Add(a)$ - Add Effects: Preconditions set to be`TRUE` after execution
- $Del(a)$ - Delete Effects: Preconditions set to be `FALSE` after execution
#### Result of the Action
$$
Result(s, a) = (s - Del(a)) \cup Add(a)
$$
*which could also be seemed as a transition function*
#### Goal
Find a list of actions $[a_1,a_2,a_3,\ldots]$ which satisfies:
$$
Result(Result(\ldots Result(I,a_1​) \ldots ,a_n−1​),a_n​) \models G
$$
### Properties
- It turns a "solving" problem into a "search" problem
- Still _PSPACE-complete_, but "approximation" is able to be applied
	- Explicit Search 显式搜索
		- e.g. Blind/Heuristic search
		- Not effective
	- Near Decomposition 近似分解
		- e.g. Relaxation: similar to Decrease/Divide & Conquer
		- Maybe fail
