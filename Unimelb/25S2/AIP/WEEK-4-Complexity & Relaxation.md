## Planners
To make a 
- **Satisficing Planning**
	- **Output Required** A plan (or ‘unsolvable’ if no plan exists) 
	- **_PlanEx_** := Existence of a plan
- **Optimal Planning**
	- **Output Required** An optimal plan (or ‘unsolvable’ if no plan exists)
	- **_PlanLen_** < B := Existence of a plan and length of it is at most B

- Techniques successful for either one of these are almost disjoint
- Satisficing planning is much more effective in practice

#### Turing Machine
- Tape (A set of tape cells) $\gets$ RAM
- Movable R/W head $\gets$ Action
- Internal States $\gets$ Variable & Condition
- Transition Rules Table $\gets$ Function

#### Non-deterministic Polynomial time problem (NP)
- Can be solve on a non-deterministic Turing machine in polynomial time

##### Deterministic Turing Machine DTM
- Assign the only action to one condition
##### Non-deterministic Turing Machine NTM
- Assign any possible actions to one specific condition
- Just a theoretical model
##### NTM vs. DTM
- NTM is not stronger than DTM
- The only difference is whether or not **effective**
- **TC of solving NP in NTM is same as TC of solving P in DTM**
	- **NPSPACE = PSPACE**

_PlanEx_ and _PlanLen_ is **PSPACE-complete**
- At least hard as **any** Polynomial time problem

In practice, optimal planning is almost never easy

#### STRIPS planning problem
- **Planning Language** is designed to deal with:
	- **Specification** concise model description
	- **Computation** reveal useful information/structure for heuristics
- Solution
	- Explicit search
		- Blind/Heuristic search
		- Not effective
	- Near decomposition
		- Similar to Decrease/Divide & Conquer
		- Maybe fail
- PSPACE-complete
## Relaxation 
* 问题松弛
- Define a transformation to simplify the problem
- Use the solution of the problem as $h(n)$
#### Definition 
- State concisely what are the relevant distinction lines in practice
###### Components $\mathcal{R} = (\mathcal{P'}, r, h'^*)$
- $\mathcal{P}'$: the class of the simpler problem 
- $r$: transformer turning the original problem into a simpler one
- $h'^*(n)$: perfect heuristic function of simpler problem 
###### Properties
- **Native** if $\mathcal{P'} \subseteq \mathcal{P}$ and  $h'^*(n) = h(n)$
- **Efficiently constructible** if a polynomial $r$ exists
- **Efficiently computable** if a polynomial $h’(n)$ exists

##### Examples
###### Route-Finding
- Relaxation: Route-find as a bird
- Manhattan distance, Euclidean distance, etc.
- Native❌ Efficiently constructible✅ Efficiently computable✅
###### Goal-counting
- Relaxation: Empty preconditions & deletes(actions)
- Admissible; still NP-hard
- Native✅ Efficiently constructible✅ Efficiently computable❌

#### How to deal with not efficiently computable
- Approximate h’*
- Re-design h’* in a way so that it will typically be feasible