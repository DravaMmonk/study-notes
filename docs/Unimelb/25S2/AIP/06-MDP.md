# 6 Markov Decision Process
---
## Markov Decision Process

General Simulator of the environment for Model-based RL

---
### Markov process

A _memoryless_ random process 

- **Memoryless**: the state is Markov
- Introduce non-deterministic in terms of probabilistic transition $P$

$$
M = \langle S, P \rangle
$$

where

- $S$ - a finite set of states
- $P$ - a ***matrix*** showing state transition probability
	- $P(s \to s') = P(s' \mid s), \forall s, s' \in S$
	- Each row/column of $P$ sums to 1

---
### Markov Reward Processes (MRP)

A Markov chain with reward values:

$$
M = \langle S, P, R, \gamma \rangle
$$

where

- $R$ - the reward function
	- $R(s) = \mathbb{E}[R' \mid s]$
- $\gamma$ - discount factor

---
### Markov Decision Process (MDP)

Introduce **agency** in terms of actions:

$$
M = \langle S, A, P, R, \gamma \rangle
$$
	
- $A$ - a finite set of actions
- $P(s \to s) = P(s' \mid s)$
- $R(s) = \mathbb{E}[R' \mid s]$

---
### Partially Observable MDP (POMDP)

**Assumption**

- Markov Property
- **Limited** Observable

**Components** *(Diff with MDP)*

- Introduce **Sensor Model** (based on **Probability Distribution**)

$$
\mathrm{b}(s_t) = P(s_t \mid \text{historical actions and observations})
$$

- Initial/Goal States → Belief States $\mathrm{b}(s_0)$ and $\mathrm{b}(g)$

**Outcomes**

- Map belief states into actions
- **Optimal** if total expected cost from $\mathrm{b}(s_0)$ to $\mathrm{b}(g)$ is minimum


---
## Greedy Optimal Policy

Give a policy with $maximum$ state-action-value

**Optimal State-value Function**

$$
V^\ast(s) = \max_\pi V_\pi(s)
$$

**Optimal State-action-value Function**

$$
Q^\ast(s,a) = \max_\pi Q_\pi(s,a)
$$

**Optimal Policy**

$$
a=\arg\max_a Q^\ast(s,a)
$$

---
#### Bellman Optimality Equation 

Derived from the Bellman Equation, we can use "immediate reward + discounted return of next state" to express the expected return:

**Optimal State-value Function**

$$
\begin{align}
V^\ast(s)
&= \max_a \; \mathbb{E}\!\left[\, r + \gamma V^\ast(s') \,\right] \\[6pt]
&= \max_a \; \sum_{s'} P(s' \mid s,a)\left[\, r + \gamma V^\ast(s') \,\right]
\end{align}
$$

**Optimal State-action-value Function**

Select the action leading to $maximum$ state-action-value of the next state:

$$
\begin{align}
Q^\ast(s,a)
&= \mathbb{E} \left[\, r + \gamma \max_{a'} Q^\ast(s',a') \,\right] \\[6pt]
&= \sum_{s',r} P(s',r\mid s,a)\left[\, r + \gamma \max_{a'} Q^\ast(s',a') \,\right]
\end{align}
$$

??? note "How to solve the Bellman Optimality Equation "
	- No closed form solution
	- Value Iteration
	- Policy Iteration
	- SARSA
	- Q-learning

---
### Example - MAZE

![[assets/6_1_maze.png|300]]
**Environment**:

- $S$ - Agent's possible locations
- $A$ - Step directions $\mathtt{N, E, S, W}$
- $P$ - Map $s, a \to s'$
- $R$ - $-1$ per time-step (encourage short-path solution)

**Agent**:

- $V(s)$ - the expected return of following the policy from each $s$ 
	- closer to $g$ - $V(s)$ ⤴
	- Farther away - $V(S)$ ⤵
- $\pi(s)$ - Optimal Policy = Best $V(s')$

---