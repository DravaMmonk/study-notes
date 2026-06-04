---
course: COMP90042 Natural Language Processing
semester: 2026S1
topic: Training LMs with Human Feedback
source_type: lecture+reading
status: draft
review_priority: high
---

# 13 RLHF and Alignment

## Big Picture

Training with human feedback addresses the gap between next-token prediction and the user-facing objective of producing responses that are helpful, honest, and harmless. Instruction tuning teaches a model to follow instructions, but human preference training is used when correctness alone is not enough to capture tone, usefulness, safety, and social expectations.
<!-- Sources: L17-L18 p.3-12; Ouyang 2022 abstract, Sec.1 -->

The lecture presents two preference-learning routes: reinforcement learning from human feedback, which trains an explicit reward model and then optimises a policy with PPO, and direct preference optimisation, which learns directly from chosen/rejected responses without a separate reward model or reinforcement-learning loop.
<!-- Sources: L17-L18 p.20-59, p.1561-1625; Ouyang 2022 abstract, Sec.3 -->

## Learning Map

- Prerequisite ideas: instruction tuning, supervised fine-tuning, language-model probabilities, reinforcement learning, and transformer hidden states.
<!-- Sources: L17-L18 p.3-20; Ouyang 2022 Sec.1, Sec.3 -->
- Core concepts: helpful-honest-harmless alignment, SFT, preference pairs, reward models, Bradley-Terry probability, PPO, KL penalty, PPO-ptx, and DPO.
<!-- Sources: L17-L18 p.11-59, p.313-1510, p.1561-1625; Ouyang 2022 Sec.3 -->
- Main procedures: collect demonstrations, train an SFT model, collect ranked responses, train a reward model, update the policy with PPO, or bypass the reward model with DPO.
<!-- Sources: L17-L18 p.259-313, p.313-905, p.905-1510, p.1561-1625; Ouyang 2022 Sec.3 -->
- Tutorial skills: explain why a reward model is not enough to update an LM, compute the intuition of clipped PPO updates, and diagnose reward-model overfitting to superficial preference cues.
<!-- Sources: L17-L18 p.905-1438, p.0 case study after p.1561 -->
- Common traps: assuming human feedback represents universal human values, treating PPO clipping as always using only the clipped term, or forgetting that reward models can be gamed.
<!-- Sources: L17-L18 p.1293-1479, p.1450-1479; Ouyang 2022 Sec.1, Sec.5 -->

## Core Concepts

### Alignment problem

Large LMs can produce technically correct text that is blunt, unhelpful, unsafe, or socially misaligned. The lecture frames preference learning as teaching the model how humans want to communicate, not just how to predict likely text.
<!-- Sources: L17-L18 p.7-12 -->

The three target qualities are helpfulness, honesty, and harmlessness: the model should solve the user's task, avoid unsupported certainty or falsehood, and avoid causing harm.
<!-- Sources: L17-L18 p.11-12; Ouyang 2022 Sec.1 -->

### Supervised fine-tuning

The first RLHF stage collects prompts and ideal answers, then fine-tunes a pretrained model on those demonstrations. In the InstructGPT pipeline, the lecture describes high-quality data collection by humans, including experts and crowdworkers, followed by supervised fine-tuning.
<!-- Sources: L17-L18 p.259-298; Ouyang 2022 Sec.3 -->

SFT is instruction tuning in this pipeline: it teaches the model to imitate desired answers, but it does not by itself optimise nuanced human preference trade-offs.
<!-- Sources: L17-L18 p.298-313; Ouyang 2022 Sec.3 -->

### Reward model

The reward-model stage samples several outputs from the SFT model for the same prompt, asks human labelers to rank or compare those outputs, and trains a model that maps a prompt-response pair to a scalar reward.
<!-- Sources: L17-L18 p.313-343; Ouyang 2022 Sec.3 -->

Pairwise preference data can be represented as a context, a chosen response, and a rejected response. The reward model is trained so the chosen response receives a higher score than the rejected response.
<!-- Sources: L17-L18 p.343-609; Ouyang 2022 Sec.3 -->

The lecture uses the Bradley-Terry formulation to turn two reward scores into the probability that the chosen response is preferred. Lower loss means the reward model is more aligned with the observed human preference pair.
<!-- Sources: L17-L18 p.609-845 -->

### PPO policy optimisation

A reward model scores outputs but does not tell the language model exactly how to change token probabilities. PPO supplies a constrained policy-optimisation step that updates the SFT model toward higher-reward outputs.
<!-- Sources: L17-L18 p.845-957; Ouyang 2022 Sec.3 -->

PPO uses a probability ratio between the current and old policy and an advantage estimate based on reward relative to a baseline. Clipping prevents overly large updates, so the policy is nudged in the preferred direction without changing too much in one step.
<!-- Sources: L17-L18 p.957-1293 -->

The unclipped objective remains necessary because the minimum of clipped and unclipped terms depends on the sign and scale of the advantage; using only the clipped term would not correctly represent all update cases.
<!-- Sources: L17-L18 p.0 PPO question after p.1561 -->

### KL penalty and PPO-ptx

The lecture adds a per-token KL penalty from the frozen SFT model to reduce reward-model overoptimisation. This keeps the updated model close to a trusted baseline distribution instead of drifting into unnatural text that exploits the reward model.
<!-- Sources: L17-L18 p.1293-1410; Ouyang 2022 Sec.3 -->

PPO-ptx adds a pretraining loss during PPO to mitigate performance regressions on public NLP datasets.
<!-- Sources: L17-L18 p.1410-1438; Ouyang 2022 Sec.3, Sec.4 -->

### Direct preference optimisation

Direct preference optimisation removes the explicit reward model and reinforcement-learning stage. Instead, it uses model log-probabilities for preferred and rejected completions and applies a contrastive preference loss so the policy directly assigns higher probability to preferred outputs.
<!-- Sources: L17-L18 p.1561-1625 -->

DPO is presented as lower-complexity than RLHF because it avoids training separate SFT, reward, and policy components through multiple stages.
<!-- Sources: L17-L18 p.1561-1625 -->

## Methods and Workflows

### RLHF pipeline

1. Collect prompts.
2. Collect human-written ideal answers.
3. Train an SFT model.
4. Sample multiple outputs from the SFT model.
5. Collect human rankings or pairwise preferences.
6. Train a reward model on chosen/rejected responses.
7. Optimise the language-model policy with PPO using reward scores and constraints such as KL penalties.
<!-- Sources: L17-L18 p.259-1510; Ouyang 2022 Sec.3 -->

### DPO pipeline

1. Collect preference pairs for the same prompt.
2. Use the model's log-probabilities for the chosen and rejected responses.
3. Optimise a contrastive preference loss that increases preference for chosen responses.
4. Avoid a separately learned reward model and PPO loop.
<!-- Sources: L17-L18 p.1561-1625 -->

## Tutorial Patterns

| Pattern | What to Recognize | How to Solve | Common Mistake |
| --- | --- | --- | --- |
| Generic but correct assistant | response is factually acceptable but not empathetic or useful | diagnose preference/reward-model mismatch or superficial reward features | blaming only outdated pretraining data |
| Reward model construction | prompt plus multiple responses and human rankings | form chosen/rejected pairs and train scalar scoring model | treating scores as ground-truth correctness labels |
| PPO clipping question | probability ratio exceeds clip range | compare clipped and unclipped objectives under the advantage sign | saying the unclipped objective is never needed |
| DPO vs RLHF | asks whether reward model/RL are used | DPO directly optimises preference from log-probabilities | describing DPO as another reward-model training stage |
<!-- Sources: L17-L18 p.343-845, p.905-1438, p.1561-1625; L17-L18 case study and PPO question -->

## Key Comparisons

| Method | Reward model? | Reinforcement learning? | Main output signal | Training complexity |
| --- | --- | --- | --- | --- |
| RLHF with PPO | yes | yes | scalar reward plus policy advantage | high |
| DPO | no | no | log-probability preference contrast | lower |
<!-- Sources: L17-L18 p.1561-1625 -->

| Evaluation target | What it asks | Example evaluation direction |
| --- | --- | --- |
| Helpful | can the model solve tasks for users? | human preference judgments or task evaluations |
| Honest | are factual claims truthful and uncertainty expressed? | TruthfulQA-style truthfulness checks |
| Harmless | are toxicity, bias, and harmful outputs reduced? | RealToxicityPrompts, Winogender, CrowS-Pairs-style checks |
<!-- Sources: L17-L18 p.1479-1561; Ouyang 2022 Sec.4 -->

## Revision Checklist

- [ ] Can draw the full RLHF pipeline.
- [ ] Can explain what a preference pair is.
- [ ] Can explain why a reward model outputs a scalar.
- [ ] Can explain why PPO needs clipping and a KL penalty.
- [ ] Can distinguish RLHF from DPO.
<!-- Sources: L17-L18 p.259-1625; Ouyang 2022 Sec.3 -->

## Active Recall

1. Why does instruction tuning not fully solve alignment?
2. What is the role of the Bradley-Terry model in reward-model training?
3. Why can a reward model be overoptimised?
4. What does DPO remove from the RLHF pipeline?
5. Who is InstructGPT aligned to, according to the lecture?
<!-- Sources: L17-L18 p.7-12, p.609-845, p.1293-1479, p.1561-1625; Ouyang 2022 Sec.1 -->

## Glossary

| Term | Meaning |
| --- | --- |
| Alignment | Training behaviour to better match user intent and safety preferences. |
| SFT | Supervised fine-tuning on prompt-answer demonstrations. |
| Reward model | A model that scores prompt-response pairs according to learned human preferences. |
| Preference pair | A prompt with a chosen response and a rejected response. |
| PPO | Proximal policy optimisation, a constrained RL algorithm for policy updates. |
| KL penalty | A penalty for drifting too far from a baseline probability distribution. |
| DPO | Direct preference optimisation, preference learning without a separate reward model or RL loop. |
<!-- Sources: L17-L18 p.259-1625; Ouyang 2022 Sec.3 -->
