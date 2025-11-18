# 11 Integrating Learning and Planning
---
## Model-free → Integrated Architectures

**Model-free**

- No model
- Learn Value/Policy from experience

> [!note] Outcome
> - Cannot look ahead❌
> - Sample may be expensive⚠️
> - May fall into sub-optimal

**Integrated Architectures**

- Learn Model from experience
- Learn and plan Value/Policy from real and simulated experience

> [!note] Outcome
> - Sample is efficient✅ (directly from simulators)
> - Avoid model error✅ (Beyond Model-based)
> - Supervised Learning methods can be used in model training✅
> - Uncertainty can be learned in model training✅
> - Modelling is hard❌
> 	- Need environment to be model-learnable⚠️
> 	- Compounding model bias❌ (experience is from model)
> - High computation cost❌

---
## Simulation-based Search

Model-based RL + Model-free RL backup

1. Collect the current state $s_t$ from real world
2. For each $a \in A$, simulate $K$ episodes from $s_t$:
	- Use a model of MDP to look ahead
	- Use *Forward Search* methods (e.g. BFS, DFS) to select action
	- Terminate after running $T-t$ steps

$$
\{ s_t^k, A_t^k, R_{t+1}^k, \ldots, S_T^k \}_{k=1}^K \;\sim\; \mathcal{M}_\nu
$$

3. Take each episode as a experience for Model-free update
4. Select the action in real world based on optimal policy from Model-free RL

---
### Simple Monte-Carlo Search

Derive from MC, update $q$ value by **mean return** of all episodes, select the optimal action with $maximum$ $q$.

---
### Monte-Carlo Tree Search

- Build a search tree containing visited states and actions
- Update $q$ by mean return of episodes *starting from each $(s,a)$*

$$
q(s,a)
= \frac{1}{N(s,a)} \sum_{k=1}^K \sum_{u=t}^T
\mathbf{1}(S_u, A_u = s,a) \, G_u
$$

> [!note] MCTS is Off-policy
> 
> - Behaviour policy: rollout/simulation policy
> - Target policy: greedy w.r.t search Q(s,a)
> 
