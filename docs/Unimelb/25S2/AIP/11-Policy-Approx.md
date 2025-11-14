# 11 Policy Function Approximation
---
## Policy Gradient
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
