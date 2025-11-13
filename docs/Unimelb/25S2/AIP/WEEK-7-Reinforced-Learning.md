# WEEK 7 Reinforced Learning
---
## Reinforced Learning
- Map Situations $s$ → Actions $A$ - so as to $maximise$ the Rewards $R$

### Planning vs Learning

| Dimension                         | **Planning**                                                      | **Learning**                                                                                |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Environment Model**             | Model is **known**                                                | Model is **unknown**                                                                        |
| **Learning Mode**                 | Offline computation                                               | Online trial-and-error                                                                      |
| **Agent–Environment Interaction** | No interaction with the real environment; uses internal simulator | Must act in the real environment to gather experience                                       |
| **Policy Improvement**            | Through search, deliberation,  planning and introspection         | Through reward-driven learning                                                              |
| **Suitable Scenarios**            | A precise model exists and simulation is cheap                    | The model is unknown or hard to specify                                                     |
| **Advantages**                    | Safe, interpretable, no real-world risk                           | Adaptive, risky working in complex/unknown environments                                     |
| **Disadvantages**                 | Requires accurate model; modeling may be expensive                | Requires exploration; may be costly or risky                                                |
| Example - Atari Game              | Agent can query emulator for perfect model (source code)          | Agent can only sees pixels and scores on the screen → trial-and-error gameplay is necessary |


### RL vs. Planning vs. Other ML

| Dimension                      | Reinforcement Learning                                            | Automated Planning                             | Other ML                                                     |
| :----------------------------- | :---------------------------------------------------------------- | :--------------------------------------------- | :----------------------------------------------------------- |
| **Action Outcomes**            | **Non-deterministic** — actions lead to probabilistic transitions | Deterministic — outcome fully known from model | Usually not modelled as sequential decisions                 |
| **Environment Representation** | **Probabilistic model** of states, transitions, and rewards       | Symbolic or logical model (e.g., STRIPS)       | No explicit environment                                      |
| **Learning Signal**            | **Reward Signal** - Feedback from environment                     | Predefined goal or planner objective           | Labels or self-structures                                    |
| **Data Structure**             | **Sequential / Time series** (non-i.i.d.)                         | Discrete steps in a planning domain            | Often i.i.d. samples (independent & identically distributed) |
| **Search & Optimisation**      | Trail-and-error search + Reward-driven                            | state-space search + Predefined policy         | Gradient-based or statistical fitting                        |
| **Credit Assignment**          | **Required** — reward may be delayed over time                    | Not relevant — goal known a priori             | **Not Required** - no delay                                  |
|                                |                                                                   |                                                |                                                              |

##### Example - Common Applications
- Making a humanoid robot walk
- Fine tuning LLMs using human/AI feedback
- Optimising operating system routines
- Controlling a power station
- Managing an investment portfolio

---
## Reinforced Learning Process

```mermaid
flowchart LR
    subgraph Env[Environment]
        S[(State)]
        R[(Reward)]
    end

    subgraph Agent[Agent]
        P["Policy π(a|s)"]
        V["Value Function V(s)"]
    end

    S -->|"(1) Input State"| P
    P -->|"(2) Action a"| Env
    Env -->|"(3) Reward r, Next State s'"| V
    V -->|"(4) Update Policy"| P

```

---
## Environments

### Markov Decision Process
- MDP - General Simulator of the environment for Model-based RL
- _Almost all RL problems can be formalised as MDPs_

### General Assumption - $S, P$
- State is Markov
	$$
	P(s' \mid s + H(s), a) = P(s' \mid s, a)
	$$
	
	- Once $S$ is known, $H$ can be thrown away

---
### Reward - $R$
- A scalar feedback signal
- Indicates how well agent is doing at one step
- **Reward Hypothesis**
	- _All_ goals can be described by the $maximisation$ of expected cumulative reward

---
### Discount Factor - $\gamma$

| Gamma ($\gamma \ge 0$) | Behaviour                                    |
| ---------------------- | -------------------------------------------- |
| $\gamma = 0$           | Greedy                                       |
| $\gamma \to 0$         | Myopic                                       |
| $\gamma \to 1$         | Far-sighted                                  |
| $\gamma = 1$           | **Guarantee** only if all sequence terminate |

#### Why Discounting is Used in MDPs

- **Technical Reasons**
  - Makes modelling and computation easier (Bellman equations converge cleanly)
  - Prevents infinite returns in cyclic Markov processes
  - Reflects uncertainty about far-future outcomes

- **Realistic Reasons**
  - In financial settings, immediate rewards can be reinvested (time value of money)
  - Human and animal behaviour shows preference for immediate rewards over delayed rewards

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
## Agents

- **Prediction**: Evaluate the future rewards of state-actions
	- → *Value Function*
- **Control**: Find the optimal policy
	- → *Policy Function*

---
### Model

- Predicts what the environment will do next
	- → Probability Function + Reward Function
- Simulation is **NOT** necessary for RL 
	- → Model-based/Model-free

---
### Value Function - $V(s)$

- Define and predict value of the state and future reward
	$$
	V(s) = \mathbb{E}(G \mid s)
	$$
	
	- $\mathbb{E}(G \mid s)$ - Expect of future rewards

- **Bellman Equation** 
		- $G = R + \gamma G'$
		- $\to V = R + \gamma PV \to V = (I - \gamma P)^{-1}R$
		- $O(n^3)$
		
- Value function is **NOT** necessary for RL 
	- → Value-based Model/ Policy-based Model

---
### Policy - $\pi(a \mid s)$
- Fully defines agent's behaviour
- **Stationary** (Time-independent) - Only relies on the current state

#### No Policy
$$
a = \arg\max_{a} Q(s, a) = \arg\max_{a} \sum^{s'} P(s,a,s') \cdot V(s')
$$

- Compare expectations of all valid actions $\approx$ Brute Force

#### Deterministic Policy 
$$
\pi(s) = a
$$

- MRP = MDP + restricted by the deterministic policy

 #### Stochastic Policy 
$$
\pi(a \mid s) = P(a \mid s)
$$

- Choose the optimal action or random one with a small probability
- Ability of exploration; Robustness✅

#### Policy Gradient
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
### Categorise of RL agents
- Model
	- **Model Based** - Simulate environment to gain first experience 
	- **Model Free** - Gain experience from real interaction directly
- Value-Policy
	- **Value Based** - No Policy
	- **Policy Based** - No Value Function = Policy Gradient
	- **Actor-Critic** - Policy Based 演员 + Value Based 评论家

---
## Balance Exploration & Exploitation in RL
- **Exploitation** - select currently-known best action
- **Exploration** - try a new action
- **Trade-off Strategies**
	- **ε-greedy** 
		- most time exploitation ($P = 1 - \varepsilon$), little time exploration ($\varepsilon$)
	- **softmax** 
		- set a probability to each action and a temperature $\tau$ to control randomising
			$$
			P(a) = \frac{\exp(\hat{Q}(a) / \tau)}{\sum_{a'} \exp(\hat{Q}(a') / \tau)}
			$$

	
	- **Upper Confidence Bound (UCB)** 
		- exploitation + exploration bonus
			$$
			a = \arg\max_a \left( \hat{Q}(a) + c \sqrt{\frac{\ln t}{N(a)}} \right)
			$$

		
			- $c$ - importance of exploration (**parameter**)
			- $\ln{t}$ - explore more when time goes
			- $N(a)$ - not try too many times on one same action