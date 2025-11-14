# 07. Model-based Reinforced Learning

## Markov Decision Process (MDP)
- General Simulator of the environment for Model-based RL

---
### Markov process
- A _memoryless_ random process 
	$$
	M = \langle S, P \rangle
	$$
	
	- $S$ - a finite set of states
	- $P$ - a state transition probability ***matrix***, which maps every two states in $S$
		- $P(s \to s) = P(s' \mid s)$
		- Each row of $P$ sums to 1
		- 🅄 For showing actions validations and non-deterministic

---
### Markov Reward Processes
- A Markov chain with reward values:
	$$
	M = \langle S, P, R, \gamma \rangle
	$$
	
	- $R$ - the reward function
		- $R(s) = \mathbb{E}[R' \mid s]$
	- $\gamma$ - discount factor

---
### Markov Decision Process
- Introduce **agency** 能动性 in terms of actions:
	$$
	M = \langle S, A, P, R, \gamma \rangle
	$$
	
	- $A$ - a finite set of actions
	- $P(s \to s) = P(s' \mid s)$
	- $R(s) = \mathbb{E}[R' \mid s]$

---
## Optimal Policy
- Give a policy based on value function
	- = Find an action with $maximum$ state-action-value
	- = Optimise the Value Function
- Optimal State-value Function
	$$
	V^\ast(s) = \max_\pi V_\pi(s)
	$$

- Optimal State-action-value Function
	$$
	Q^\ast(s,a) = \max_\pi Q_\pi(s,a)
	$$

- Optimal Policy
	$$
	a=\arg\max_a Q^\ast(s,a)
	$$

---
#### Bellman Optimality Equation 
- Optimal State-value Function (Deriving BEE)

	$$
	\begin{align}
	v_\ast(s)
	&= \max_a \; \mathbb{E}\!\left[\, r + \gamma v_\ast(s') \,\right] \\[6pt]
	&= \max_a \; \sum_{s'} P(s' \mid s,a)\left[\, R(s,a,s') + \gamma v_\ast(s') \,\right]
	\end{align}
	$$

- Optimal State-action-value Function (Deriving BEE)

	$$
	\begin{align}
	q_\ast(s,a)
	&= \mathbb{E} \left[\, r + \gamma \max_{a'} q_\ast(s',a') \,\right] \\[6pt]
	&= \sum_{s',r} p(s',r\mid s,a)\left[\, r + \gamma \max_{a'} q_\ast(s',a') \,\right]
	\end{align}
	$$

- Solving the BOE
	- No closed form solution
	- Value Iteration
	- Policy Iteration
	- Q-learning
	- SARSA
