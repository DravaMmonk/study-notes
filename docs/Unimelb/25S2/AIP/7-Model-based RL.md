# 7. Model-based Reinforced Learning

### Markov Decision Process
- MDP - General Simulator of the environment for Model-based RL
- _Almost all RL problems can be formalised as MDPs_

---
#### Markov process
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
#### Markov Reward Processes
- A Markov chain with reward values:
	$$
	M = \langle S, P, R, \gamma \rangle
	$$
	
	- $R$ - the reward function
		- $R(s) = \mathbb{E}[R' \mid s]$
	- $\gamma$ - discount factor

---
#### Markov Decision Process
- Introduce **agency** 能动性 in terms of actions:
	$$
	M = \langle S, A, P, R, \gamma \rangle
	$$
	
	- $A$ - a finite set of actions
	- $P(s \to s) = P(s' \mid s)$
	- $R(s) = \mathbb{E}[R' \mid s]$

---
## Solving a MDP Problem
- Solve MDP
- = Give a policy to find the best behaviour of the current state
- = Find an action with $maximum$ action-value
- = Optimise the Value Function

---
### Optimal Value Function - $v_\ast(s)$, $q_\ast(s, a)$
- Optimal State-value Function
$$
v_\ast(s) = \max_\pi v_\pi(s)
$$

- Optimal State-action-value Function
$$
q_\ast(s,a) = \max_\pi q_\pi(s,a)
$$

---
### Bellman Equation 
- A method for recursively handling with $v(s)$ evaluation and optimisation
		$$ G_t = R_{t+1} + \gamma G_{t+1} $$
	
	- Based on "*look-ahead then back-up*" computational mechanism
		- **Look-ahead**: to the next step → $r, s'$
		- **Back-up**: to the current state → $v(s) = f(r,s')$

| Categories  |                                                   Formula                                                   |
| :---------- | :---------------------------------------------------------------------------------------------------------: |
| Expectation |                        $$ v_\pi(s) = \mathbb{E}\left[r + \gamma v_\pi(s')\right] $$                         |
|             |          $$ q_\pi(s,a) = \mathbb{E}\left[r + \gamma\mathbb{E} \left[q_\pi(s',a')\right]\right] $$           |
| Expended    |       $$ v_\pi(s) = \sum_a \pi(a\mid s)\sum_{s',r} p(s',r\mid s,a)\bigl[r + \gamma v_\pi(s')\bigr] $$       |
|             | $$ q_\pi(s,a) = \sum_{s',r} p(s',r\mid s,a)\left[r + \gamma \sum_{a'} \pi(a'\mid s') q_\pi(s',a')\right] $$ |
| Optimality  |                 $$ v_\ast(s) = \max_a \mathbb{E}\left[\, r + \gamma v_\ast(s') \,\right] $$                 |
|             |                $$ q_\ast(s,a) = \mathbb{E}\left[r + \gamma \max_{a'} q_\ast(s',a')\right] $$                |
| Expended    |       $$ v_\ast(s) = \max_{a} \sum_{s'} P(s' \mid s,a)\left[ R(s,a,s') + \gamma v_\ast(s') \right] $$       |
|             |       $$ q_\ast(s,a) = \sum_{s',r} p(s',r\mid s,a)\left[r + \gamma \max_{a'} q_\ast(s',a')\right] $$        |

#### Solving the Bellman Equation
- Solving the Bellman Expectation Equation
	- Directly Compute $O(n^3)$
$$
v = R + \gamma Pv \to v = (I - \gamma P)^{-1}R
$$

		- only possible for small $P$ matrix

	- Dynamic Programming
	- Monte-Carlo Evaluation
	- Temporal-Difference Learning

- Solving the Bellman Optimality Equation
	- No closed form solution
	- Value Iteration
	- Policy Iteration
	- Q-learning
	- SARSA

