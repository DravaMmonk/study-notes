# COMP30026 Lectures 2–3 - Propositional Logic: Syntax, Semantics and Consequence

Sources: `lecture/02.pdf` (L02), `lecture/03.pdf` (L03); Apple Notes: CS/25S2/MoC — "Lec01-02 Basic Concepts", "Lec03 Formula", "Equivalence Cheatsheet".

This lecture asks: **when is an expression built from "and, or, not, implies" well-formed? When is it true? How do we decide whether one formula follows from another?**

Learning path: [Syntax: how formulas are built](#topic-1) → [Semantics: truth values and assignments](#topic-2) → [Equivalence and semantic consequence](#topic-3) → [Valid, satisfiable and contradictory](#topic-4) → [Substitution and equivalence laws](#topic-5).

Key points: truth tables, the meaning of $\equiv$ and $\models$ , and the valid/satisfiable/unsatisfiable classification. Hard parts: the truth value of implication $\to$ , and which properties substitution preserves. Common mistakes: confusing the connective $\to$ inside a formula with the claim $\models$ about formulas.

Screenshot numbers are PDF page indices: `L02 slide N` is page N of `02.pdf`, `L03 slide N` is page N of `03.pdf`; the decks build up step by step, so page indices are larger than the footer numbers.

<a id="topic-1"></a>
## 1. Syntax: how formulas are built

### The opening puzzle

Propositional logic is also called Boolean logic: George Boole took an algebraic view of logic and revealed a deep connection between logic and arithmetic.

<!-- Sources: L02 p.3 -->

![L02 slide 4 - Intro puzzle](assets/02-propositional-logic/slide-l02-04.png)

Heidi, Dina and Louise, three children who never lie, each say one thing: Heidi says Dina and Louise share the blame equally, so if one is guilty so is the other; Dina says that if Heidi is guilty then so is she; Louise says she and Dina are not both guilty. The question: do these three statements decide who is guilty? Keep it in mind; [section 2](#topic-2) solves it once truth values and assignments are in place.

<!-- Sources: L02 p.4 -->

### The parts formulas are built from

![L02 slide 12 - Definition of propositional formulas](assets/02-propositional-logic/slide-l02-12.png)

The upper part lists the parts of a propositional formula: atoms $P,Q,R,P_1,\dots$ are indivisible propositions; bottom $\bot$ is always false and top $\top$ always true; then come the four connectives negation $\lnot$ , conjunction $\land$ , disjunction $\lor$ and implication $\to$ , with their readings in the right column.

<!-- Sources: L02 p.5-12 -->

The red line at the bottom is the grammar:

$$
\phi ::= P \mid \bot \mid \top \mid (\lnot\phi) \mid (\phi\land\phi) \mid (\phi\lor\phi) \mid (\phi\to\phi)
$$

<!-- Sources: L02 p.12 -->

How to read it: the bars $\mid$ separate alternatives, and a $\phi$ on the right stands for "any smaller formula". So a formula is either an atom, $\bot$ or $\top$ , or a smaller formula combined with a connective, and every combination comes with a pair of parentheses.

### Examples of well-formed formulas

![L02 slide 14 - Some well-formed formulas](assets/02-propositional-logic/slide-l02-14.png)

All six expressions can be built step by step from the grammar, so all are well-formed formulas. Note that (1) $P$ is legal without parentheses because an atom is itself a formula, and the nested parentheses of (6) match its three uses of $\to$ .

<!-- Sources: L02 p.14 -->

The quiz in the blue box asks: the grammar has no "if and only if" $\leftrightarrow$ ; can it be expressed? Yes: $P\leftrightarrow Q$ is $(P\to Q)\land(Q\to P)$ . Likewise, conjunction can be written with other connectives, e.g. $X\land Y\equiv\lnot(\lnot X\lor\lnot Y)\equiv\lnot(X\to\lnot Y)$ .

<!-- Sources: L02 p.14; Apple Notes Lec01-02 -->

### Conventions for dropping parentheses

![L02 slide 19 - Notational conventions](assets/02-propositional-logic/slide-l02-19.png)

Following the grammar strictly produces many parentheses, so the subject adopts four conventions:

- Outer parentheses may be omitted;
- $\lnot$ binds more tightly than $\land,\lor$ ;
- $\land,\lor$ bind more tightly than $\to$ ;
- $\to$ is right-associative: $P\to Q\to R$ means $P\to(Q\to R)$ .

**Common mistake**: the red warning — $P\land Q\lor R$ is ambiguous. The subject fixes no priority between $\land$ and $\lor$ , so parentheses are required.

<!-- Sources: L02 p.19 -->

### Parse trees

![L02 slide 26 - Parse trees](assets/02-propositional-logic/slide-l02-26.png)

On the left is the parse tree of $\lnot(\lnot(P\lor(Q\land\lnot P))\to R)$ ; the green tree on the right is $\lnot\lnot(P\lor Q)\land(\lnot P\to R)$ . The root is the connective applied **last**, the leaves are atoms; each $\lnot$ has one child and each binary connective has two. The two bottom lines are further formulas with parentheses dropped, useful for practice: first restore the parentheses by the conventions above, then draw the tree. Note that $\lnot\lnot P\lor Q\land\lnot P\to R$ puts $\lor$ next to $\land$ , which the conventions leave ambiguous; misreading the scope of a $\lnot$ also changes the whole tree.

<!-- Sources: L02 p.20-26 -->

<a id="topic-2"></a>
## 2. Semantics: truth values and assignments

### Truth tables of the connectives

![L02 slide 29 - Truth table of the connectives](assets/02-propositional-logic/slide-l02-29.png)

A truth function maps truth values to truth values. Truth values are written 1/0 (also t/f or $\top/\bot$ ). Each row of the table is one combination of values for $A,B$ , and the five columns on the right give each connective's result in that row:

- $\lnot A$ flips $A$ ;
- $A\land B$ is 1 only when both sides are 1;
- $A\lor B$ is 0 only when both sides are 0;
- $A\to B$ is 0 only in the third row ( $A=1,B=0$ );
- $A\leftrightarrow B$ is 1 when both sides agree.

<!-- Sources: L02 p.29 -->

### Why implication is "weird"

![L02 slide 40 - Implication is weird](assets/02-propositional-logic/slide-l02-40.png)

**Hard part**: the small table on the left stresses again that $A\to B$ is false only when the antecedent is true and the consequent false. The two sentences on the right show that no causality is required: sentence 2, "If Melbourne is in Queensland, then Brisbane is in Victoria", has a false antecedent, so the whole sentence is true even though the two facts are unrelated. A handy reminder: $P\to Q$ has the same truth table as $\lnot P\lor Q$ .

<!-- Sources: L02 p.39-40; Apple Notes Lec01-02 -->

### Truth assignments

![L02 slide 33 - Truth assignment](assets/02-propositional-logic/slide-l02-33.png)

Propositional letters are Boolean variables. A truth assignment is a function from propositional letters to truth values, usually written $v=\{P\mapsto 1, Q\mapsto 0\}$ . The bottom two lines state a convention: letters not listed default to 0, so here $v(Q)=v(R)=\dots=v(Z)=0$ .

<!-- Sources: L02 p.30-33 -->

### Truth of a formula under an assignment

![L02 slide 35 - Truth of a formula](assets/02-propositional-logic/slide-l02-35.png)

The red shorthand at the bottom gives the notation: $v\models\phi$ reads "$\phi$ is true under $v$", and we also say $v$ is a model of $\phi$ , or $v$ satisfies $\phi$ . When it does not, we write $v\not\models\phi$ .

<!-- Sources: L02 p.33-35; L03 p.4 -->

The poll evaluates each formula under $v=\{P\mapsto 1,Q\mapsto 0\}$ : 1. $P\land Q$ is false; 2. $(P\lor Q)\land(P\lor R)$ is true (both brackets are true because $P=1$ ; $R$ defaults to 0 and does not matter); 3. $P\to Q$ is false (true antecedent, false consequent); 4. $\lnot P\to\lnot Q$ is true (its antecedent $\lnot P$ is false).

<!-- Sources: L02 p.35 -->

### The truth table of a formula

![L02 slide 36 - Truth table for a formula](assets/02-propositional-logic/slide-l02-36.png)

A formula's truth table evaluates it under every assignment, row by row. The left three columns list all $2^3=8$ values of $P,Q,R$ ; on the right, the value of each subformula is written under its symbol, inner $\land$ first and outer $\lor$ second. The bold column sits under the connective applied **last** (the root of the parse tree), and it alone is the truth value of the whole formula $(P\land Q)\lor R$ . With $n$ variables there are $2^n$ rows.

<!-- Sources: L02 p.36 -->

### Solving the opening puzzle

**Illustrative example (our own)**: write $H,D,L$ for "is guilty". The three statements are $D\leftrightarrow L$ , $H\to D$ and $\lnot(D\land L)$ . By the first, $D$ and $L$ have the same value; by the third they cannot both be true, so $D=L=0$ . By the second, $H\to 0$ being true forces $H=0$ . The only assignment satisfying all three is that nobody is guilty, so the aunt does have enough information.

<a id="topic-3"></a>
## 3. Equivalence and semantic consequence

### Logical equivalence

![L03 slide 7 - Logical equivalence](assets/02-propositional-logic/slide-l03-07.png)

Two formulas are logically equivalent, written $F\equiv G$ , if they have the same truth value under **every** truth assignment. Equivalence means the final columns of their truth tables are identical. The poll on L02 page 37 asks exactly this for three pairs of formulas; the answers to its pairs 2 and 3 are revealed on the last page of L03 (see [the end of section 5](#topic-5)).

<!-- Sources: L02 p.38; L03 p.7 -->

The lower half of the slide: examples $P\to Q\equiv\lnot P\lor Q$ and $\lnot(P\land Q)\equiv\lnot P\lor\lnot Q$ ; non-examples $P\land Q\not\equiv P\lor Q$ ( $P=1,Q=0$ tells them apart) and $P\to Q\not\equiv R\to S$ — different letters, and with $P=1,Q=0$ , $R=S=0$ the left is false and the right true.

<!-- Sources: L03 p.7 -->

### Semantic consequence

![L03 slide 9 - Semantic consequence](assets/02-propositional-logic/slide-l03-09.png)

If every model of $F$ is also a model of $G$ , then $G$ is a semantic consequence of $F$ , written $F\models G$ and read "$F$ (semantically) entails $G$". The red note at the bottom says equivalence is consequence in both directions:

$$
F\equiv G \iff (F\models G \text{ and } G\models F).
$$

<!-- Sources: L03 p.9 -->

### Consequence and implication

![L03 slide 11 - Consequence and implication](assets/02-propositional-logic/slide-l03-11.png)

The two blue boxes link consequence with the implication connective:

$$
F\models G \iff \models F\to G, \qquad F\equiv G \iff \models F\leftrightarrow G .
$$

Here $\models H$ (nothing on the left) means $H$ is true under every assignment, i.e. valid ([section 4](#topic-4)). The line "models used before defined later?" at the top is an authoring note left on the slide, not content.

<!-- Sources: L03 p.11; Apple Notes Lec03 -->

**Common mistake:** $P\to Q$ is **a formula**, which can itself be true or false; $P\models Q$ and $P\equiv Q$ are **claims about two formulas**, about what happens under all assignments. The theorem above connects the two: "$G$ follows from $F$" is the same as "$F\to G$ is true with no premises at all".

<!-- Sources: L03 p.11; Apple Notes Lec03 -->

### Poll: which formulas entail an implication

![L03 slide 13 - Which formulas entail P implies Q](assets/02-propositional-logic/slide-l03-13.png)

The class poll has two parts; the working below is added by these notes. Part one, which formulas let us conclude $P\to Q$ : check whether $P\to Q$ is true in every row where the formula is true.

- They do: 2. $\lnot P$ , 3. $Q$ , 4. $P\to(Q\land R)$ , 5. $(P\lor R)\to Q$ , 6. $\lnot P\lor Q$ , 7. $\lnot Q\to\lnot P$ (6 and 7 are equivalent to $P\to Q$ ).
- They do not: 1. $P$ (take $Q=0$ ); 8. $P\to(Q\lor R)$ (take $P=1,Q=0,R=1$ ); 9. $(P\to Q)\lor R$ (take $P=1,Q=0,R=1$ ).

Part two reverses the direction, asking which formulas are consequences of $P\to Q$ : 6 and 7 (equivalence works both ways), and 8 and 9 (they are weaker than $P\to Q$ ). The rest are stronger than $P\to Q$ or unrelated; for example $P\to Q$ does not entail $P\to(Q\land R)$ (take $P=Q=1,R=0$ ).

<!-- Sources: L03 p.13 -->

### Sound inference rules

![L02 slide 41 - Modus ponens](assets/02-propositional-logic/slide-l02-41.png)

Premises are above the line, the conclusion below it. A rule is **sound** if every model of its premises is a model of its conclusion. The most basic one is modus ponens: from $P\to Q$ and $P$ conclude $Q$ . The slide leaves a challenge: prove it sound. The truth table needs only one row — both premises true requires $P=1$ , and with $P=1$ , $P\to Q$ true requires $Q=1$ , so the conclusion $Q$ is true as well.

<!-- Sources: L02 p.41 -->

The student's notes collect a set of common rules; each can be checked for soundness the same way:

| Name | Form | Intuition |
| --- | --- | --- |
| Modus ponens | $P\to Q,\ P\models Q$ | the condition holds and the antecedent holds, so the consequent holds |
| Modus tollens | $P\to Q,\ \lnot Q\models\lnot P$ | the consequent is false, so the antecedent is false |
| Hypothetical syllogism | $P\to Q,\ Q\to R\models P\to R$ | conditions chain |
| Disjunctive syllogism | $P\lor Q,\ \lnot P\models Q$ | one of two, and not the first |
| Constructive dilemma | $(P\to Q)\land(R\to S),\ P\lor R\models Q\lor S$ | each branch leads to its own result |
| Destructive dilemma | $(P\to Q)\land(R\to S),\ \lnot Q\lor\lnot S\models\lnot P\lor\lnot R$ | the previous rule used backwards |
| Simplification | $P\land Q\models P$ | take one part of a conjunction |
| Conjunction | $P,\ Q\models P\land Q$ | combine two facts |
| Addition | $P\models P\lor Q$ | a true statement may gain any disjunct |

<!-- Sources: Apple Notes Lec01-02 -->

<a id="topic-4"></a>
## 4. Valid, satisfiable and contradictory

### Tautologies

![L03 slide 15 - Tautology](assets/02-propositional-logic/slide-l03-15.png)

A tautology is a formula that is true under every assignment. Look at the bold column of the table: it sits under the main connective (the middle $\to$ ) and all 8 rows are 1, so $(\lnot P\land Q)\to(P\to R)$ is a tautology. The intuition: the antecedent requires $P=0$ , and when $P=0$ the consequent $P\to R$ is always true.

<!-- Sources: L03 p.14-15; Apple Notes Lec03 -->

### Contradictions and a quick check

![L03 slide 20 - Contradiction](assets/02-propositional-logic/slide-l03-20.png)

A contradiction is a formula that is false under every assignment, e.g. $Q\land\lnot Q$ . A full truth table is not needed to spot one. Take $P\land Q\land(\lnot Q\leftrightarrow(\lnot P\lor Q))$ : if $P$ or $Q$ is false, the outer $\land$ makes everything false; only the row $P=Q=1$ remains. The red 0 in the table is that row's result: there $\lnot Q=0$ but $\lnot P\lor Q=1$ , so the biimplication is false.

<!-- Sources: L03 p.20 -->

### Valid, satisfiable and contingent

![L03 slide 24 - Contradictions are unsatisfiable](assets/02-propositional-logic/slide-l03-24.png)

L03 pages 21–26 use three everyday sentences to introduce new names: "If the program works, then the program works" is true whatever the words mean, so it is **valid**, written $\models F$ — a tautology; the slide above, "the application is good and the application is not good", is false whatever the words mean, so it is **unsatisfiable** — a contradiction; "It is currently raining" is sometimes true and sometimes false, so it is **contingent**. A formula true under at least one assignment is **satisfiable**.

| Term | Meaning | Example |
| --- | --- | --- |
| Valid / tautology | true under every assignment, written $\models F$ | $(\lnot P\land Q)\to(P\to R)$ |
| Unsatisfiable / contradiction | false under every assignment | $Q\land\lnot Q$ |
| Satisfiable | true under at least one assignment | $P$ |
| Contingent | sometimes true, sometimes false | "It is currently raining" |

<!-- Sources: L03 p.22-26; Apple Notes Lec03 -->

Relationships: satisfiable = valid + contingent; non-valid (sometimes false) = contingent + unsatisfiable. Most everyday statements are contingent.

### Classification practice

![L03 slide 28 - Classification poll with answers](assets/02-propositional-logic/slide-l03-28.png)

The right column is the answer given in class. The two "valid" answers can be seen like this: 3. in $P\to(\lnot Q\lor P)$ , whenever the antecedent $P$ is true the $P$ in the consequent is true too, so "true antecedent, false consequent" never happens; 4. by De Morgan, $\lnot(P\land\lnot Q)\equiv\lnot P\lor Q$ , so the whole formula is $\lnot Q\lor\lnot P\lor Q$ , which contains $Q\lor\lnot Q$ and is always true. 2. $P\leftrightarrow\lnot P$ asks a value to equal its own negation, so it is always false.

<!-- Sources: L03 p.27-28 -->

**Common mistake**: negating a contradiction gives a tautology and vice versa (bottom of L03 slide 20); all tautologies are equivalent to each other (all equivalent to $\top$ , e.g. $A\lor\lnot A$ ), and all contradictions are equivalent to each other (all equivalent to $\bot$ ). But "not a contradiction" only means satisfiable; it does **not** mean "equivalent to a tautology" — contingent formulas are the counterexample.

<!-- Sources: L03 p.20, p.48; Apple Notes Lec03 -->

<a id="topic-5"></a>
## 5. Substitution and equivalence laws

### Substitution

![L03 slide 33 - Substitution](assets/02-propositional-logic/slide-l03-33.png)

Substitution replaces **every** occurrence of one propositional variable with the same formula. The green example: substituting $Q\land R$ for $P$ in $P\to P$ gives $(Q\land R)\to(Q\land R)$ . The red line at the bottom says substitution **preserves** validity; the black text beside it is an authoring note left on the slide. "Preserves" means: if the original formula has the property, the result of the substitution is guaranteed to have it too.

<!-- Sources: L03 p.33 -->

L03 pages 34–39 check the other properties with two polls; the results are summarised here:

| Property | Preserved by substitution? | Reason |
| --- | --- | --- |
| Valid | yes | the original is true for every value, so it stays true whatever formula is plugged in |
| Unsatisfiable | yes | the negation of a contradiction is a tautology, reducing to the row above |
| Satisfiable | **no** | $P$ is satisfiable, but $P:=Q\land\lnot Q$ makes it unsatisfiable |
| Contingent | **no** | the same counterexample |
| Logical equivalence | yes | if $F\equiv G$ then $F[P:=H]\equiv G[P:=H]$ |

<!-- Sources: L03 p.33-41; Apple Notes Lec03 -->

**Note**: a satisfiable or contingent formula can move in either direction under substitution: plugging in a contradiction can make it unsatisfiable (the counterexample in the table), and plugging in a tautology can make it valid. So substitution only carries over the two "every assignment" properties, validity and unsatisfiability.

### Substitution preserves equivalence

![L03 slide 41 - Substitution preserves equivalence](assets/02-propositional-logic/slide-l03-41.png)

The notation $F[A:=B]$ means replacing every $A$ in $F$ with $B$ ; for example $(P\to P)[P:=Q]$ is $Q\to Q$ . The theorem: if $F\equiv G$ then $F[P:=H]\equiv G[P:=H]$ . So the letters in an equivalence law may be replaced by any formulas; for example $P\to Q\equiv\lnot P\lor Q$ immediately gives $(R\land S)\to Q\equiv\lnot(R\land S)\lor Q$ .

### Interchange of equivalents

![L03 slide 45 - Interchange of equivalents](assets/02-propositional-logic/slide-l03-45.png)

**Interchange of equivalents**: if $F\equiv G$ and $H'$ is obtained by replacing one occurrence of $F$ in $H$ with $G$ , then $H\equiv H'$ . The result is equivalent and every semantic property is preserved, so formulas can be rewritten algebraically (the red "Rewrite formulas algebraically!").

<!-- Sources: L03 p.42-45 -->

**Common mistake**: substitution and interchange are different operations. Substitution replaces **every occurrence of one variable**, and the replacement can be any formula; interchange replaces **one occurrence of a subformula**, and only by something equivalent to it.

### Equivalence laws

![L03 slide 46 - Some equivalences](assets/02-propositional-logic/slide-l03-46.png)

The first page holds the familiar algebraic laws: commutativity, associativity, distributivity. Note that $\lor$ also distributes over $\land$ (the second distributive law), unlike arithmetic, where addition does not distribute over multiplication. **Common mistake**: the slide calls $P\land P\equiv P$ absorption; this kind of law is usually called idempotence, and in most textbooks absorption means $P\land(P\lor Q)\equiv P$ .

![L03 slide 47 - More equivalences](assets/02-propositional-logic/slide-l03-47.png)

The second page holds the laws used most when rewriting: double negation, De Morgan, implication, contraposition, biimplication. All three forms of contraposition follow from "implication + commutativity + double negation", for example $\lnot P\to\lnot Q\equiv\lnot\lnot P\lor\lnot Q\equiv\lnot Q\lor P\equiv Q\to P$ .

![L03 slide 48 - Last equivalences](assets/02-propositional-logic/slide-l03-48.png)

The third page deals with the constants $\top$ and $\bot$ . Remember the two lines at the top: $\bot$ is equivalent to every unsatisfiable formula, and $\top$ to every valid formula.

<!-- Sources: L03 p.48 -->

This table aligns the names on the three pages with the student's Equivalence Cheatsheet and adds the Chinese names (rules involving quantifiers are in the [predicate logic note](04-predicate-logic.en.md#topic-4)):

| Slide name | Chinese | Memory hook |
| --- | --- | --- |
| Absorption | 幂等律 | a repeated term equals one copy |
| Commutativity / Associativity | 交换律 / 结合律 | order and grouping of $\land$ , $\lor$ do not matter |
| Distributivity | 分配律 | $\land$ and $\lor$ distribute over each other |
| Double negation | 双重否定 | two $\lnot$ cancel |
| De Morgan | 德摩根律 | push the negation inside, swapping $\land$ and $\lor$ |
| Implication | 蕴含消去 | rewrite $\to$ as $\lnot\cdot\lor\cdot$ |
| Contraposition | 逆否 | swap antecedent and consequent and negate both |
| Biimplication | 双蕴含 | both sides true or both false |
| Duality | 对偶 | $\lnot\top$ and $\bot$ are interchangeable |
| Negation from absurdity | 归谬式否定 | implying a contradiction is negation |
| Identity / Dominance | 同一律 / 支配律 | a neutral element changes nothing, an absorbing element decides the result |
| Contradiction / Excluded middle | 矛盾律 / 排中律 | $P$ and $\lnot P$ are never both true, and one of them always is |

<!-- Sources: L03 p.46-48; Apple Notes Equivalence Cheatsheet -->

### The in-class claims

![L03 slide 50 - Which claims hold](assets/02-propositional-logic/slide-l03-50.png)

The answers to all three claims are on the right. Claim 3, "Yes, but not ≡", deserves a closer look: the left side entails the right, but not the other way round. Take $P=1,Q=0,R=0$ : the left $(P\to R)\land(Q\to R)$ is false because $P\to R$ is false, while the right $(P\land Q)\to R$ is true because its antecedent is false. This pair is also pair 3 of the L02 page 37 poll, so their truth tables differ.

<!-- Sources: L03 p.49-50 -->

**Note**: what the left side is really equivalent to is $(P\lor Q)\to R$ — "$P$ leads to $R$ and $Q$ leads to $R$" is the same as "$R$ holds as soon as $P$ or $Q$ does". Implication and distributivity verify it: $(\lnot P\lor R)\land(\lnot Q\lor R)\equiv(\lnot P\land\lnot Q)\lor R\equiv\lnot(P\lor Q)\lor R$ .

## Self-check

1. Draw the parse tree of $P\to Q\to R\lor S$ after fully parenthesising it by the conventions.
2. Without a full truth table, classify $(P\to Q)\lor(Q\to P)$ .
3. Give a satisfiable formula $F$ and a substitution that makes it valid.
4. Use equivalence laws to rewrite $\lnot(P\to\lnot Q)$ using only $\land$ .
5. Decide whether $P\to(Q\to R)$ and $(P\land Q)\to R$ are equivalent, and name the equivalence laws that rewrite one into the other.
