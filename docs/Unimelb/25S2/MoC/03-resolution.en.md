# COMP30026 Lectures 4–5 - Resolution: Mechanical Proof for Propositional Logic

Sources: `lecture/04.pdf`, `lecture/05.pdf` pages 1–54 (review); Apple Notes: CS/25S2/MoC — "★1 Resolution & Refutation".

This lecture asks: **a truth table has $2^n$ rows and quickly becomes infeasible; is there a purely mechanical rewriting method that decides satisfiability and checks whether a conclusion follows?**

Learning path: [Either-or reasoning and the resolution rule](#topic-1) → [Refutation: proving with resolution](#topic-2) → [Conjunctive normal form and the satisfiability algorithm](#topic-3) → [Clausal form and the two kinds of "empty"](#topic-4) → [Review: encoding and three resolution runs](#topic-5).

Key points: each resolution step cancels exactly one complementary pair, proving $F\models G$ by refutation, and the steps to CNF. Hard parts: distributing $\lor$ over $\land$ , and what the empty clause and the empty clause set mean. Common mistakes: cancelling two variables at once; reading "cannot derive $\bot$ " as "the derivation went wrong".

<a id="topic-1"></a>
## 1. Either-or reasoning and the resolution rule

### Why a new method

Propositional logic is decidable: a truth table tells us whether a formula is valid, contingent or unsatisfiable. But the table has $2^n$ rows ( $n$ = number of variables) — finite, yet possibly far too large.

<!-- Sources: L04 p.3 -->

### From everyday reasoning to the resolution rule

![L04 slide 8 - Resolution rule](assets/03-resolution/slide-l04-08.png)

Before this page the slides start from everyday reasoning: "If it is raining, I will bring an umbrella; if it is not raining, I will have ice cream." Either way, "I will either bring an umbrella or have ice cream." Symbolically: from $P\to F$ and $\lnot P\to G$ conclude $F\lor G$ .

This page rewrites $\to$ with $\lnot,\lor$ ( $P\to F\equiv\lnot P\lor F$ , $\lnot P\to G\equiv P\lor G$ ); the left column is the **resolution** rule: the two premises above the line, the conclusion below.

$$
\frac{\lnot P\lor F \qquad P\lor G}{F\lor G}
$$

<!-- Sources: L04 p.4-8; Apple Notes ★1 -->

One premise contains $P$ , the other $\lnot P$ (complementary literals). Whether $P$ is true or false, the "rest" of one premise must be true, so $F\lor G$ holds — which answers the slide's exercise "check this is sound". The right column is the special case $F=G=\bot$ : from $\lnot P$ and $P$ we derive $\bot$ , a contradiction.

<!-- Sources: L04 p.6-8 -->

<a id="topic-2"></a>
## 2. Refutation: proving with resolution

### Resolution graphs

![L04 slide 14 - Resolution graph](assets/03-resolution/slide-l04-14.png)

This graph refutes $(B\lor\lnot A)\land(B\lor A)\land\lnot B$ . The top row holds the three original clauses; each pair of lines meeting below means "these two clauses resolve to this one": $B\lor A$ and $\lnot B$ cancel $B$ to give $A$ ; $A$ and $B\lor\lnot A$ cancel $A$ to give $B$ ; $B$ and $\lnot B$ give $\bot$ . Reaching $\bot$ shows the formula is unsatisfiable.

<!-- Sources: L04 p.9-14 -->

### The idea of refutation

![L04 slide 16 - How to use refutations](assets/03-resolution/slide-l04-16.png)

Resolution works by **refutation**: to prove something, assume it is false and derive $\bot$ . The two theorem boxes give the two uses:

$$
\models F \iff \lnot F\models\bot, \qquad F\models G \iff F\land\lnot G\models\bot .
$$

<!-- Sources: L04 p.16; Apple Notes ★1 -->

So: to prove $F$ valid, refute $\lnot F$ ; to prove $F\models G$ , turn $F$ and $\lnot G$ together into clauses and resolve until the empty clause appears.

**Worked example (from the student notes)**: prove $(P\to Q)\land P\models Q$ . Add the negated conclusion $\lnot Q$ , giving clauses $\{\lnot P,Q\},\{P\},\{\lnot Q\}$ ; $\{P\}$ and $\{\lnot P,Q\}$ resolve to $\{Q\}$ , which with $\{\lnot Q\}$ gives the empty clause, so the consequence holds — modus ponens proved by refutation.

<!-- Sources: Apple Notes ★1 -->

### Two exercises: refuting and deriving

![L04 slide 20 - Resolution refutation exercise](assets/03-resolution/slide-l04-20.png)

The clauses are $P\lor\lnot Q$ , $\lnot P$ , $Q\lor\lnot R$ , $Q\lor R\lor S$ , $\lnot S$ . Read the two branches: on the left, $P\lor\lnot Q$ and $\lnot P$ give $\lnot Q$ ; on the right, $Q\lor R\lor S$ and $\lnot S$ give $Q\lor R$ , which with $Q\lor\lnot R$ gives $Q$ ; the branches meet at the bottom, where $\lnot Q$ and $Q$ give $\bot$ .

<!-- Sources: L04 p.17-20 -->

![L04 slide 22 - Deriving R by resolution](assets/03-resolution/slide-l04-22.png)

Resolution can also **derive** a conclusion directly: from $P\lor Q$ , $\lnot P\lor R$ , $\lnot Q\lor R$ , $S$ , the first two give $Q\lor R$ , which with $\lnot Q\lor R$ gives $R\lor R$ , i.e. $R$ . Note that premise $S$ has no lines: premises irrelevant to the conclusion need not be used.

<!-- Sources: L04 p.21-22 -->

### Only one pair at a time

![L04 slide 25 - Do not cancel multiple variables](assets/03-resolution/slide-l04-25.png)

**Common mistake**: never cancel several variables at once! $(P\lor Q)\land(\lnot P\lor\lnot Q)$ is satisfiable (take $P=1,Q=0$ ); cancelling $P$ and $Q$ together would wrongly yield $\bot$ , which is unsound. Resolve on exactly **one** complementary pair per step. Cancelling $P$ gives $Q\lor\lnot Q$ and cancelling $Q$ gives $P\lor\lnot P$ — both tautologies, useless; that nothing else can be derived shows precisely that the clauses are not contradictory.

<!-- Sources: L04 p.23-25; Apple Notes ★1 -->

### Formal definition and soundness

![L04 slide 27 - Resolution proof formally](assets/03-resolution/slide-l04-27.png)

A **resolution proof** of $C_m$ from wffs $P_1,\dots,P_n$ is a string

$$
P_1,\dots,P_n\vdash C_1,\dots,C_m ,
$$

where each $C_i$ is either a copy of some $P_j$ or follows by resolution from two formulas **earlier** in the string. The three examples at the bottom: " $P\vdash P$ " is just a copy; " $P,\lnot P\vdash\bot$ " reaches a contradiction in one step; " $(P\lor Q),\lnot P\vdash Q$ " reaches the conclusion in one step.

<!-- Sources: L04 p.26-27; Apple Notes ★1 -->

![L04 slide 30 - Soundness](assets/03-resolution/slide-l04-30.png)

$\Sigma\vdash_R F$ means "there is a resolution proof of $F$ from the premise set $\Sigma$ ". **Soundness**: if $\Sigma\vdash_R F$ then $\Sigma\models F$ — resolution never derives a false conclusion. The proof sketch: take any model $v$ of $\Sigma$ and show by induction along the proof string that $v$ satisfies each $C_i$ — a copied $C_i$ is satisfied already, and a resolvent is satisfied by the either-or argument of Section 1.

<!-- Sources: L04 p.28-30; Apple Notes ★1 -->

<a id="topic-3"></a>
## 3. Conjunctive normal form and the satisfiability algorithm

Resolution works only on disjunctions, so every formula must first be brought into a uniform shape.

### Literals, clauses and CNF

![L04 slide 33 - Conjunctive normal form](assets/03-resolution/slide-l04-33.png)

- **Literal**: an atom or its negation, e.g. $P$ , $\lnot Q$ ;
- **(Disjunctive) clause**: a disjunction of literals, e.g. $B\lor C\lor D$ ;
- **Conjunctive normal form (CNF)**: a conjunction of clauses, e.g. the example box's $(A\lor\lnot B)\land(B\lor C\lor D)\land A$ . The lone $A$ is also a clause (with one literal).

Theorem box: every propositional formula has an **equivalent** CNF.

<!-- Sources: L04 p.31-33; Apple Notes ★1 -->

### NNF first, then distribute

![L04 slide 36 - NNF to CNF](assets/03-resolution/slide-l04-36.png)

First reach **negation normal form (NNF)** — only $\lnot,\land,\lor$ , with $\lnot$ only directly in front of variables. The example box is already in NNF but not yet in CNF (its outermost connective is $\lor$ ). The four steps on the page:

1. eliminate $\leftrightarrow$ (rewrite with $\to$ and $\land$ );
2. eliminate $\to$ (rewrite with $\lor$ and $\lnot$ );
3. push $\lnot$ inward with De Morgan's laws;
4. eliminate $\lnot\lnot$ .

Last line: then distribute $\lor$ over $\land$ to get CNF: $A\lor(B\land C)\equiv(A\lor B)\land(A\lor C)$ .

<!-- Sources: L04 p.34-36; Apple Notes ★1 -->

### A complete example

![L04 slide 45 - Example conversion to CNF](assets/03-resolution/slide-l04-45.png)

This is the last frame of the animation: grey lines are steps already taken, the black line is the final CNF; the number in brackets on each line is the step number from the previous page, with (5) meaning distribution. Step by step:

| Step | Result |
| --- | --- |
| eliminate $\leftrightarrow$ | $((\lnot P\land(\lnot Q\to R))\to S)\land(S\to(\lnot P\land(\lnot Q\to R)))$ |
| eliminate $\to$ | $(\lnot(\lnot P\land(\lnot\lnot Q\lor R))\lor S)\land(\lnot S\lor(\lnot P\land(\lnot\lnot Q\lor R)))$ |
| push $\lnot$ in | $((\lnot\lnot P\lor(\lnot\lnot\lnot Q\land\lnot R))\lor S)\land(\lnot S\lor(\lnot P\land(\lnot\lnot Q\lor R)))$ |
| eliminate $\lnot\lnot$ | $((P\lor(\lnot Q\land\lnot R))\lor S)\land(\lnot S\lor(\lnot P\land(Q\lor R)))$ |
| distribute | $(P\lor\lnot Q\lor S)\land(P\lor\lnot R\lor S)\land(\lnot S\lor\lnot P)\land(\lnot S\lor Q\lor R)$ |

<!-- Sources: L04 p.37-45; Apple Notes ★1 -->

**Hard part**: the last step distributes twice: the left half $(P\lor(\lnot Q\land\lnot R))\lor S$ first expands to $(P\lor\lnot Q)\land(P\lor\lnot R)$ and then absorbs $S$ ; the right half $\lnot S\lor(\lnot P\land(Q\lor R))$ expands into two clauses.

### Refutation completeness and the satisfiability algorithm

![L04 slide 46 - Refutation completeness](assets/03-resolution/slide-l04-46.png)

**Refutation completeness**: every unsatisfiable set of clauses has a resolution refutation, i.e. if the clause set $\Sigma\models\bot$ then $\Sigma\vdash_R\bot$ . Side by side with soundness from the previous section:

| Theorem | Statement | Intuition |
| --- | --- | --- |
| Soundness | if $\Sigma\vdash_R F$ then $\Sigma\models F$ | resolution never derives a false conclusion |
| Refutation completeness | if the clause set $\Sigma\models\bot$ then $\Sigma\vdash_R\bot$ | every unsatisfiable clause set has a resolution refutation |

<!-- Sources: L04 p.30, p.46; Apple Notes ★1 -->

**Common mistake**: completeness is only about deriving $\bot$ . Resolution cannot necessarily derive every consequence directly (from $P$ it cannot derive $P\lor Q$ , since there is no complementary pair to cancel), but it can refute every contradiction — which is why proving $F\models G$ always goes through refuting $F\land\lnot G$ .

<!-- Sources: L04 p.30, p.46 -->

![L04 slide 47 - Satisfiability algorithm](assets/03-resolution/slide-l04-47.png)

Soundness plus completeness give an algorithm:

1. convert the formula into a suitable form (clausal form);
2. apply resolution repeatedly;
3. derive $\bot$ → report "unsatisfiable"; nothing new can be derived → report "satisfiable".

<!-- Sources: L04 p.47; Apple Notes ★1 -->

In propositional logic there are only finitely many possible clauses (each variable occurs positively, negatively or not at all), so the process always terminates.

### Simplifying CNF

![L04 slide 50 - Simplifying CNF](assets/03-resolution/slide-l04-50.png)

The page lists three common redundancies:

| Redundancy | Example | Treatment |
| --- | --- | --- |
| duplicate literal | $P\lor P$ | merge to $P$ |
| tautological clause | $P\lor\lnot P\lor Q$ | always true, delete the whole clause |
| subsumption | $(P\lor\lnot Q\lor R)\land(P\lor R)$ | whenever the shorter $P\lor R$ holds so does the longer one; delete the longer |

<!-- Sources: L04 p.48-50; Apple Notes ★1 -->

The exercise on the page: simplify $(P\lor\lnot P\lor Q)\land(P\lor\lnot Q\lor R)\land(P\lor R)\land(P\lor P)$ . Delete the tautology; $P\lor P$ becomes $P$ ; the unit clause $P$ subsumes the other two, leaving just $P$ . The last line warns that CNF is **not unique**: the formula before and after simplification are both valid CNFs.

<!-- Sources: L04 p.50 -->

<a id="topic-4"></a>
## 4. Clausal form and the two kinds of "empty"

### Clausal form

![L04 slide 51 - Clausal form](assets/03-resolution/slide-l04-51.png)

Writing a CNF as a "set of sets" gives **clausal form**: each element of the outer set is a clause, and each clause is a set of literals. The example box turns the CNF from the previous section into four sets, one per clause:

$$
(P\lor\lnot Q\lor S)\land(P\lor\lnot R\lor S)\land(\lnot S\lor\lnot P)\land(\lnot S\lor Q\lor R)
\;\leadsto\;
\{\{P,S,\lnot Q\},\{P,S,\lnot R\},\{\lnot P,\lnot S\},\{Q,R,\lnot S\}\}
$$

<!-- Sources: L04 p.51; Apple Notes ★1 -->

The page asks "why?" and answers "simplifies reasoning": sets have no order and no duplicates, so commutativity, associativity and duplicate literals are handled automatically.

### The empty clause and the empty clause set

![L04 slide 55 - Empty disjunction](assets/03-resolution/slide-l04-55.png)

![L04 slide 58 - Empty conjunction](assets/03-resolution/slide-l04-58.png)

Read the two pages together; they ask the same question: what do braces with nothing inside represent? The key is **which level** is empty:

| Notation | Represents | Why |
| --- | --- | --- |
| empty clause $\{\}$ | $\bot$ | a disjunction is true iff at least one disjunct is true; with none it can never be true |
| empty clause set $\{\}$ | $\top$ | a conjunction is true iff every conjunct is true; with none it is vacuously satisfied |

<!-- Sources: L04 p.52-60; Apple Notes ★1 -->

Hence (the summary on the next slide): the empty set of clauses is valid; **a clause set containing the empty clause is unsatisfiable** — exactly what resolution aims for. $\{\{\}\}$ (containing one empty clause) and $\{\}$ (the empty clause set) differ by one pair of braces but mean opposite things.

<!-- Sources: L04 p.60 -->

### The resolution rule in clausal form

![L04 slide 61 - Resolution for clausal form](assets/03-resolution/slide-l04-61.png)

In clausal form the rule reads: if $C_1,C_2$ contain neither $P$ nor $\lnot P$ ,

$$
\frac{C_1\cup\{P\}\qquad C_2\cup\{\lnot P\}}{C_1\cup C_2}
$$

<!-- Sources: L04 p.61 -->

This is the rule of Section 1 with union in place of $\lor$ . When $C_1,C_2$ are both empty, $\{P\}$ and $\{\lnot P\}$ resolve to the empty clause $\{\}$ , i.e. $\bot$ .

<a id="topic-5"></a>
## 5. Review: encoding and three resolution runs

The first half of Lecture 5 reviews the previous lectures, tying the whole pipeline together with a circuit and three resolution exercises.

### Encoding a circuit as a propositional formula

![L05 slide 8 - Encoding a circuit](assets/03-resolution/slide-l05-08.png)

The circuit takes inputs $x,y,z$ through NOT gates $n_i$ , AND gates $a_i$ and OR gates $o_i$ to the output $o$ . The red formula introduces one new variable per gate and states with $\leftrightarrow$ what it equals (e.g. $n_1\leftrightarrow\lnot x$ , $a_1\leftrightarrow n_1\land y$ ); the lone $o$ at the front demands that the output be 1.

$$
o\land(o\leftrightarrow o_1\lor o_2)\land(o_1\leftrightarrow a_1\lor a_2)\land(o_2\leftrightarrow a_3\lor a_4)\land(a_1\leftrightarrow n_1\land y)\land\dots\land(n_1\leftrightarrow\lnot x)\land\dots
$$

<!-- Sources: L05 p.2-8 -->

Each $\leftrightarrow$ involves only a few variables, so converting to CNF does not blow up through distribution. The whole formula is satisfiable iff some input makes the output 1.

### Reviewing a CNF conversion

![L05 slide 15 - CNF recap](assets/03-resolution/slide-l05-15.png)

Each line from top to bottom is one step: $\leftrightarrow$ splits into two $\to$ , which are rewritten with $\lor$ ; De Morgan pushes the outer $\lnot$ in; finally $(\lnot P\land\lnot Q)\lor(P\land\lnot R)$ is distributed. Two conjuncts on the left times two on the right gives exactly four clauses.

**Note**: the first clause of the last line, $\lnot P\lor P$ , is a tautology and can be deleted by the [simplification rules](#topic-3); keeping it does not affect equivalence.

<!-- Sources: L05 p.9-15 -->

### An unsatisfiable example

![L05 slide 23 - Resolution recap 1](assets/03-resolution/slide-l05-23.png)

The formula is $(\lnot p\lor\lnot q\lor r)\land(p\lor r)\land(q\lor r)\land\lnot r$ . Number the four clauses 1–4; each later line records "which two clauses, on which variable": 1 and 2 on $p$ give 5 $\{\lnot q,r\}$ ; 3 and 5 on $q$ give 6 $\{r\}$ ; 4 and 6 on $r$ give $\bot$ . This "number + origin" layout scales better than drawing a graph.

<!-- Sources: L05 p.16-23 -->

### A longer unsatisfiable example

![L05 slide 43 - Resolution recap 2](assets/03-resolution/slide-l05-43.png)

The green formula first becomes the 8 clauses 1–8: for example $p\to((q\lor r)\land\lnot(q\land r))$ yields 2 $\{\lnot p,q,r\}$ and 3 $\{\lnot p,\lnot q,\lnot r\}$ ("exactly one of $q,r$ "). The strategy is to use the unit clause 1 $\{p\}$ to remove $\lnot p$ (9–11), then reach unit clauses 13 $\{s\}$ , 14 $\{\lnot t\}$ , 15 $\{r\}$ , 16 $\{\lnot r\}$ , and finally 15 and 16 give $\bot$ .

**Insight**: resolving with unit clauses first only ever shortens clauses, so it heads most directly to the empty clause.

<!-- Sources: L05 p.24-43 -->

### A satisfiable example

![L05 slide 54 - Resolution recap 3](assets/03-resolution/slide-l05-54.png)

The formula is $(p\lor q)\land(\lnot p\lor\lnot r)\land(\lnot q\lor s)\land(p\lor\lnot r)\land(r\lor\lnot s)$ . The three columns hold 26 clauses (including the 5 originals); the unit clauses $\{\lnot r\}$ , $\{\lnot s\}$ , $\{p\}$ , $\{\lnot q\}$ are in red. Once every possible resolution has been made, no empty clause has appeared and nothing new can be derived ("no further steps"), so the formula is satisfiable.

The unit clauses also give a model: $p=1,q=0,r=0,s=0$ , which makes all five original clauses true. Clauses 23 $\{q,\lnot q\}$ and 24 $\{p,\lnot p\}$ are tautologies and can be skipped in practice.

<!-- Sources: L05 p.44-54 -->

## Self-check

1. Put $\lnot(P\to(Q\land R))$ into clausal form.
2. Prove $P\to Q,\ Q\to R\models P\to R$ by resolution: write the clause set to refute and every step.
3. Why is a clause set containing the empty clause unsatisfiable, while the empty clause set is valid?
4. What can the clauses $\{P,Q\}$ and $\{\lnot P,\lnot Q\}$ resolve to? Does that show they are contradictory?
5. Run the satisfiability algorithm on the clause set $\{P,Q\},\{\lnot P,R\},\{\lnot Q,R\},\{\lnot R\}$ and report the result.
