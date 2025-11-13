<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [WEEK 7 Introduce to Reinforced Learning](#week-7-introduce-to-reinforced-learning)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# WEEK 7 Introduce to Reinforced Learning
- Map Situations to Actions - so as to $maximise$ the Rewards

**Different from Automated Planning**
- Outcomes of actions are non-deterministic
- Use probabilistic presentation on environment & policy

**Different from Other ML**
- Sequential Data - Time Series (non-i.i.d)
- Trial-and-error Search - No supervisor, only signal from environment
- Delayed Reward - credit assignment matters

**Scenario**
- Environment is initially **unknown**
- Agent **interacts** with environment
- Agent improves its policy through prediction, planning, control and approximation

**Components of the environment**

**State**

- Ⓐ State is Markov
- **State = f(History)** 

- Markov property 𝑃(𝘴’ | 𝘴+𝐻(𝘴), 𝑎) = 𝑃(𝘴’ | 𝘴, 𝑎)
- Once S is known, H can be thrown away


**Rewards** 

- A scalar feedback signal
- Indicates how well agent is doing at one step
- **Reward** **Hypothesis** _All_ goals can be described by the maximisation of expected cumulative reward.

  

  

**Components of an RL Agent**

**Two Key Problems  of RL**

- **Prediction**

- Evaluate the future rewards of state-actions → Value Function

- **Control**

- Find the optimal policy → Policy Function

  

**Model**

- Simulator of the environment based on observations of the agent
- Not necessary → Model-based/Model-free
- **Probability Function** 

- 𝓟(𝘴, 𝑎, 𝘴’) = 𝑃(𝘴’ | 𝘴, 𝑎)

- **Reward Function**

- 𝓡(𝑎, 𝘴)  =  𝔼[𝘙’ | 𝘴, 𝑎]

  

**Value Function** 

- Not necessary → Value-based/Policy-based
- Define and predict value of the state and future reward

- 𝑉(𝘴) = 𝔼[𝐺 | 𝘴]  
- Value of State = The Expect of future rewards 𝐺
- **Bellman Equation** O(n³)

- 𝐺 = 𝘙 + 𝛾𝐺’
- 𝛾 = discount factor

- → 𝑉 = 𝓡 + 𝛾𝓟𝑉 → 𝑉 = (𝐼 - 𝛾𝓟)⁻¹𝓡

  

**Policy Function**

- **Output:** agent’s behaviour = next step action 𝑎
- **No Policy - Brute Force**

- 𝑎 = 𝐚𝐫𝐠 𝐦𝐚𝐱 𝑄(𝘴, 𝑎) = 𝐚𝐫𝐠 𝐦𝐚𝐱 𝚺 𝓟(𝘴, 𝑎, 𝘴’) · 𝑉(𝘴’)
- Compare expectations of all valid actions

- **Deterministic policy** 

- 𝝅(𝘴) = 𝑎 

- **Stochastic Policy** 

- 𝝅(𝑎 | 𝘴) = 𝑃(𝑎 | 𝘴)
- Choose the optimal action or random one with a small probability
- + Ability of exploration; Robustness

- **Policy Gradient**

- 𝐉(𝜃) = 𝔼[𝐺] = 𝚺 𝑃(𝜏 | 𝜃)𝐺(𝜏)

- 𝜏 = A full path from initial state to the goal

- ∇𝐉(𝜃) = 𝚺 ∇𝑃(𝜏 | 𝜃)𝐺(𝜏)

- ← ∇𝑃(𝜏 | 𝜃) = 𝑃(𝜏 | 𝜃)∇㏒𝑃(𝜏 | 𝜃) (score function trick)
- = 𝔼[∇㏒𝑃(𝜏 | 𝜃)𝐺(𝜏)]
- ← 𝑃(𝜏 | 𝜃)𝐺(𝜏) = 𝚺 𝜋(𝑎 | 𝘴)𝐺
- = 𝔼[∇㏒𝜋(𝑎 | 𝘴)𝐺]

- Maintain a set of parameters for maximising future rewards

  

**Learning Process**

Environment → State, Reward → Agent → Update the previous policy → Make the  Decision → Environment

  

  

**Categorise of RL agents**

- **Model Based** - Simulate environment to gain first experience 
- **Model Free** - Gain experience from real interaction directly

  

- **Value Based** - No Policy
- **Policy Based** - No Value Function = Policy Gradient
- **Actor-Critic** - Policy Based 演员 + Value Based 评论家

  

  

**Exploration vs Exploitation Trade-off**

- **Exploitation** - select currently-known best action
- **Exploration** - try a new action

**Trade-off Strategies**

- **ε-greedy** all most all time (1-ε) exploitation (ε is very small)
- **softmax** set a probability to each action and a temperature τ to control 

- P(a) = exp(Q_a/τ)/Σexp(Q_others/τ)

- **Upper Confidence Bound (UCB)** exploitation + exploration bonus

- a= argmax(Q̂(a) + c√(ln t/N(a)))
- **c** importance of exploration (**parameter**)
- **ln t** explore more when time goes
- **N(a)** not try too many times on same action