# 9. Function Approximation



## Policy Function Approximation
### Policy Gradient
- Maintain a set of parameters $\theta$ for $maximising$ future rewards
	$$
	J(\theta) = \mathbb{E}(G) = \sum_{\tau} P(\tau \mid \theta) \, G(\tau)
	$$

	- $\tau$ - A full path from initial state to the goal

$$
\begin{aligned}
\nabla J(\theta)
&= \sum_{\tau} \nabla P(\tau \mid \theta) \, G(\tau)
&& \text{(definition of expected return)} \\[4pt]
&= \sum_{\tau} P(\tau \mid \theta) \, \nabla \log P(\tau \mid \theta) \, G(\tau)
&& \text{(apply log-derivative trick)} \\[4pt]
&= \mathbb{E}_{\tau \sim P(\tau \mid \theta)} \big[ \nabla \log P(\tau \mid \theta) \, G(\tau) \big]
&& \text{(convert sum to expectation)} \\[4pt]
&= \mathbb{E}_{\pi_\theta} \big[ \nabla \log \pi_\theta(a \mid s) \, G(\tau) \big]
&& \text{(expand trajectory likelihood)}
\end{aligned}
$$

---
### Balance Exploration & Exploitation
- **Exploitation** - select currently-known best action
- **Exploration** - try a new action
- Balance Strategies
	- ε-greedy 
		- most time exploitation ($P = 1 - \varepsilon$), little time exploration ($\varepsilon$)
	- softmax 
		- set a probability to each action and a temperature $\tau$ to control randomising
			$$
			P(a) = \frac{\exp(Q(a) / \tau)}{\sum_{a'} \exp(Q(a') / \tau)}
			$$

	- Upper Confidence Bound (UCB) 
		- exploitation + exploration bonus
			$$
			a = \arg\max_a \left( Q(a) + c \sqrt{\frac{\ln t}{N(a)}} \right)
			$$

		
			- $c$ - importance of exploration (**parameter**)
			- $\ln{t}$ - explore more when time goes
			- $N(a)$ - not try too many times on one same action
