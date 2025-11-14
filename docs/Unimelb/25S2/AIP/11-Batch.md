
# 11 Batch
---
## Batch
**Restricted Environment**: Only limited and static samples can algorithms learn from

$$
\mathcal{D} = \{\langle s_1, v^\pi_1 \rangle, \ldots, \langle s_n, v^\pi_n \rangle,\}
$$

**Distribution Shift**: These samples may generate by a sub-optimal policy, so that:
- Data may be out of distribution
- Q-value may be over-estimated
- Overfitting

**Potential Suitable Methods:**
- Function Approximation → generalisability
- Off-policy (e.g. Q-Learning) → static sample set
- Supervised Learning Methods (e.g. Neural Network) → static sample set

---
##### Example - MC & TD In a Batch

 2-states: $A$, $B$

Reward Signal = $\{0, 1\}$

Sampled Episodes:
$$
A \to 0, B \to 0, B \to 1, B \to 1, B \to 1, B \to 1, B \to 1, B \to 1, B \to 0
$$

MC Update:

- $V(B) = 6/8 = 0.75$
- $V(A) = 0 / 1 = 0$

TD Update:

- $V(B) \to0.75$
- $V(A) \to V(B) \to 0.75$

---
## Batch Methods
###  Least Squares Temporal Difference

 By $minimising$ *SSE* between approximate and true values

$$
LS(\mathbf{w}) = \mathbb{E}_{s_i,v_i^\pi \sim \mathcal{D}} \left[ (v^\pi_i(s_i) - \hat{v}(s_i, \mathbf{w}))^2 \right]
$$

---
### Gradient Descent:

By using Stochastic Gradient Descent:

$$
w_{k+1} = w_k - \alpha\,
\bigl(v^\pi - \hat{v}(s,w)\bigr)\,
\nabla \hat{v}(s,w)
$$

---
### Deep Q-Learning

By using Q-Learning + Neural Network:

$$
L_i(\mathbf{w}_i)
=\underbrace{\mathbb{E}_{(s,a,r,s')\sim \mathcal{D}_i}}_{\text{sampled from}\;D_i}
\Big[
\big(
\underbrace{r+\gamma \max_{a'} Q(s',a';\mathbf{w}^{-}_i)}_{\text{TD target }}
-
\underbrace{Q(s,a;\mathbf{w}_i)}_{\text{Q estimate}}
\big)^2
\Big]
$$

