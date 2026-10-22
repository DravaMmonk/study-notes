# COMP30026 Lecture 1 - Introduction: Why Study Models of Computation

Sources: `lecture/01.pdf`; Apple Notes: CS/25S2/MoC — "Lec01-02 Basic Concepts".

This lecture asks: **why does computer science depend on mathematical "models"? What do we gain by writing a problem down as a logical formula?**

Learning path: [Three opening problems](#topic-1) → [The two threads of the subject](#topic-2) → [Mathematical language and basic symbols](#topic-3) → [Encoding puzzles as formulas](#topic-4) → [How to study and assessment](#topic-5).

Key points: translate a problem into a propositional formula, then ask whether it can be satisfied. Hard parts: abstracting Boolean variables and constraints from a concrete puzzle. Common mistakes: reading "the formula is satisfiable" as "the formula is always true".

<a id="topic-1"></a>
## 1. Opening: three problems logic can handle

### Sudoku: handing a hard problem to a solver

![Slide 4 - Sudoku as a hard algorithmic problem](assets/01-introduction/slide-04.png)

On the left is an ordinary Sudoku. The two bullets on the right carry the main thread of this lecture: once the rules are written down as a **logical encoding**, we quickly get an efficient solver, and many similar "hard" tasks can be handled the same way. How to encode it comes later: [section 4](#topic-4) returns to this puzzle with the full method.

### Printer manager: asking about every execution path

![Slide 7 - Printer manager](assets/01-introduction/slide-07.png)

This is the state diagram of a printer manager shared by two users. Each circle is a **state** named by two parts: $I_i$ means user $i$ is idle, $R_i$ means user $i$ has made a print request, and $P_i$ means a document is printing for user $i$. For example, $R_A I_B$ means A is waiting to print and B is idle. The arrow with no source at the top points to the initial state $I_A I_B$ ; the other arrows show which state the system can move to next.

The bottom right asks two questions:

1. Is every $P_i$ (printing) preceded by an $R_i$ (request)? — a "nothing bad happens" question;
2. Is every $R_i$ **eventually** followed by a $P_i$ ? — a "something good eventually happens" question.

<!-- Sources: L01 p.5-7 -->

Running the program a few times cannot settle such questions, because paths may be infinitely long; we must turn the system into a mathematical object and reason about **all** paths. The two questions also differ in difficulty: the first is refuted by a single finite path on which $P_i$ appears before any $R_i$ ; a counterexample to the second is an infinite execution that "never gets to print", so no finite piece of a run can settle it. Finite automata, later in the subject, are exactly this kind of "states + transitions" model.

### Colouring a map

![Slide 8 - Coloring a map](assets/01-introduction/slide-08.png)

The US map uses only four colours, yet every two neighbouring states differ in colour. "Neighbouring regions get different colours" is, like the Sudoku rules, a set of local constraints, and the encoding of [section 4](#topic-4) carries over directly: one Boolean variable for "region $r$ has colour $c$ ", and one "different colour" clause per pair of neighbouring regions.

<!-- Sources: L01 p.8 -->

<a id="topic-2"></a>
## 2. The two threads of the subject

### Where theory sits in computer science

![Slide 17 - What do we need all this theory for](assets/01-introduction/slide-17.png)

Computer science grew out of mathematics, and many of its core questions still need precise mathematical language. Read the blue labels in the left column from top to bottom: syntax (which programs are well-formed), type systems (which programs are well-typed), semantics (what happens when a program runs), specification (what the program is supposed to do), verification (prove the program never crashes and meets its specification), complexity (how much time and memory it needs); the last line adds algorithm design, cryptography, program analysis and synthesis. The bottom line stresses that all of these are used in industry and are active research areas.

<!-- Sources: L01 p.9-17 -->

### Automata theory and formal language theory

![Slide 18 - Automata theory](assets/01-introduction/slide-18.png)

**Automata theory** studies idealised computing machines: how they work, what they can compute (computability), and how to prove their basic properties.

![Slide 19 - Formal language theory](assets/01-introduction/slide-19.png)

**Formal language theory** studies sets of strings and is closely tied to automata theory. The question on the last line — which kind of grammar corresponds to which kind of automaton — is the main thread of the second half: regular expressions correspond to finite automata, context-free grammars to pushdown automata.

<!-- Sources: L01 p.18-19 -->

The first half of the subject covers **logic** (propositional logic, predicate logic, automated reasoning); the second half covers **automata and computability** (finite automata, regular expressions, context-free languages, Turing machines, undecidability).

<a id="topic-3"></a>
## 3. Mathematical language and basic symbols

### Why we need mathematical vocabulary

![Slide 24 - Basic mathematical vocabulary](assets/01-introduction/slide-24.png)

Natural language is bulky and often ambiguous. To speak **precisely**, mathematics has its own vocabulary, built around **definitions** and **proofs**. Learning it is like learning a new language: it feels strange at first, and the only way to learn it is to use it.

<!-- Sources: L01 p.21-24 -->

The student notes add a few common words:

| English | Chinese | Meaning |
| --- | --- | --- |
| axiom | 公理 | a starting point accepted without proof |
| theorem | 定理 | an important proved result |
| corollary | 推论 | a result that follows quickly from a theorem |

<!-- Sources: Apple Notes Lec01-02 -->

### Four basic symbols

![Slide 25 - Basic symbols](assets/01-introduction/slide-25.png)

This lecture introduces four symbols: $\land$ is read "and" (conjunction), $\lor$ "or" (disjunction), $\to$ "implies" (implication) and $\lnot$ "not" (negation). The next lecture gives their full definitions and truth tables, and adds $\bot$ , $\top$ and $\leftrightarrow$ .

<!-- Sources: L01 p.25 -->

Common inference rules (such as modus ponens) are collected in [the semantic consequence part of note 2](02-propositional-logic.en.md#topic-3).

<a id="topic-4"></a>
## 4. Encoding puzzles as formulas

### The Boolean encoding of Sudoku

![Slide 32 - Sudoku encoding](assets/01-introduction/slide-32.png)

The left grid numbers each cell $ij$ (row $i$, column $j$); the right grid is the puzzle. The encoding introduces Boolean variables:

$$
x_{ijd} = \text{true} \iff \text{cell } (i,j) \text{ holds digit } d .
$$

<!-- Sources: L01 p.26 -->

The formula in the blue box is built up step by step. The earlier builds first write one concrete clause: cell $11$ holds at least one digit, i.e. $x_{111}\lor x_{112}\lor\dots\lor x_{119}$ ; then one such clause for cells $12$ , $13$ , …, joined with $\land$ . The final build abbreviates the same thing as $\bigwedge\{\text{at-least-one}(\dots)\mid i,j\in D\}$ , where $D=\{1,\dots,9\}$ . The full set of constraints:

- every cell has **at least one** digit (at-least-one);
- every cell has **at most one** digit (at-most-one);
- no digit repeats in a row, a column or a $3\times 3$ box ("rows, columns, ..." on the slide);
- every given digit becomes a variable fixed to true.

Joining all constraints with $\land$ gives one big formula. The bottom line is the key fact:

$$
\text{the formula is satisfiable (some values of } x_{ijd} \text{ make it true)} \iff \text{the puzzle is solvable}.
$$

<!-- Sources: L01 p.27-32 -->

**Common mistake**: satisfiable only asks that **some** assignment makes the formula true, and that assignment is a solution of the puzzle; it does not say the formula is true under every assignment.

**Illustrative example (our own)**: "at most one of $a,b,c$ is true" can be written as "no two are true together": $(\lnot a\lor\lnot b)\land(\lnot a\lor\lnot c)\land(\lnot b\lor\lnot c)$ . If any two are true, the matching bracket becomes false.

### The Pythagorean triples colouring problem

![Slide 34 - Pythagorean triples colouring encoding](assets/01-introduction/slide-34.png)

Problem: can the natural numbers $1,\dots,n$ be coloured with two colours so that no triple $(x,y,z)$ with $x^2+y^2=z^2$ is monochromatic? (For example $3^2+4^2=5^2$ and $5^2+12^2=13^2$ .)

The blue box is the encoding: variable $x_i$ is true when number $i$ is coloured red (with only two colours, false means the other colour). For each triple $a^2+b^2=c^2$ add two clauses:

$$
(x_a\lor x_b\lor x_c)\land(\lnot x_a\lor\lnot x_b\lor\lnot x_c).
$$

The first clause rules out "none of the three is red"; the second rules out "all three are red"; together they say exactly "not all the same colour".

<!-- Sources: L01 p.33-34 -->

### The result: a 200 TB proof

![Slide 38 - Solution of the triples problem](assets/01-introduction/slide-38.png)

The red NO: the colouring is impossible exactly when $n\ge 7825$ . In 2016 this took about 2 days on a supercomputer with 800 processors and produced a proof of unsatisfiability of about 200 TB. Note that "cannot be coloured" corresponds to the formula being **unsatisfiable**: the solver must show that every assignment fails rather than exhibit one solution, which is why the proof is so large.

<!-- Sources: L01 p.35-38 -->

**Key point**: the idea "encode the problem as a propositional formula → ask whether it is satisfiable" returns in [propositional logic](02-propositional-logic.en.md) and [resolution](03-resolution.en.md).

<a id="topic-5"></a>
## 5. How to study and assessment

The last three slides are logistics: teaching materials are posted on the LMS every week, and questions can be asked in class, on the Ed forum, or at the Friday consultation; watching lectures alone does not teach problem-solving, deliberate practice does, and tutorials start in week 1.

<details markdown="1"><summary>Note: assessment (2025 S2)</summary>

- a 3-hour end-of-semester exam, 70%;
- two assignments (due around weeks 6 and 11), 12% each;
- 12 weekly worksheets, best 9 of 12 count; no extensions and no supplementary worksheets.

</details>

<!-- Sources: L01 p.39-41 -->

## Self-check

1. Using the $x_{ijd}$ notation, write the clause "digit 5 appears at least once in row 1".
2. If the triples problem used three colours instead, how would you choose the variables, and which clauses express "the three numbers are not all the same colour"?
3. Two neighbouring regions $u,v$ may only be red or blue, and variables $r_u$ , $r_v$ mean "is red". Write the clauses for "$u$ and $v$ have different colours".
4. Is "the Sudoku formula is satisfiable" the same as "the Sudoku has a unique solution"?
