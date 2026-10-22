# COMP30026 Lectures 9–10 - Unification, Predicate Resolution and Automated Reasoning

Sources: `lecture/09.pdf` (Lecture 9, 44 pages), `lecture/10.pdf` (Lecture 10, 31 pages), and pages 5–8 of `lecture/08.pdf`; Apple Notes: CS/25S2/MoC — "LEC09 Unification", "LEC10 Automated Reasoning", "★2 Resolution for Predicate Logic".

This lecture asks: **clauses in predicate logic contain variables, so $P(x)$ and $\lnot P(a)$ do not look like the same literal; how do we make them match before resolving, and how far can this mechanical reasoning go?**

Learning path: [Substitution and unification](#topic-1) → [The unification algorithm](#topic-2) → [Resolution in predicate logic](#topic-3) → [Power and limits of the resolution method](#topic-4) → [Horn clauses and automated reasoning](#topic-5).

Key points: computing a most general unifier (mgu), resolution with unification, factoring. Hard parts: the occurs check, fairness of the search. Common mistakes: substituting for a constant as if it were a variable; forgetting to rename the variables of two clauses apart before resolving.

Screenshot numbers are PDF page indices; both decks are incremental Beamer builds, and this note uses only the final build of each slide.

<a id="topic-1"></a>
## 1. Substitution and unification

### Constants versus variables

Letters from the start of the alphabet $a,b,c,\dots$ are **constants**; letters from the end $u,v,x,y,\dots$ are **variables**. The distinction is crucial in this lecture: only variables may be replaced; constants are fixed names of objects.

<!-- Sources: L09 p.2 -->

Variables in clauses are implicitly universally quantified: $P(x,a)$ means $\forall x\,P(x,a)$ , and $x$ is a "dummy variable" that can stand for any object.

<!-- Sources: Apple Notes LEC09 -->

### Substitutions

![L09 slide 5 - Substitution definition and example](assets/05-unification-automated-reasoning/slide-l09-05.png)

A **substitution** is a function from variables to terms, written $\theta=\{x_1\mapsto t_1,\dots,x_n\mapsto t_n\}$ . $E[\theta]$ replaces each $x_i$ in $E$ by $t_i$ **simultaneously**.

Look at the example at the bottom of the slide: $E=P(f(x),g(y,y,b))$ and $\theta=\{x\mapsto h(u),y\mapsto a,z\mapsto c\}$ . The one occurrence of $x$ becomes $h(u)$ , both occurrences of $y$ become $a$ , and the constant $b$ stays; the result is $P(f(h(u)),g(a,a,b))$ . $E$ has no $z$ , so $z\mapsto c$ has no effect. (The closing `}` in the slide's result is a typo for a closing parenthesis.)

"Simultaneously" means the inserted $h(u)$ is not processed by $\theta$ a second time. Even if $\theta$ contained $u\mapsto\dots$ , there would be no further replacement.

<!-- Sources: L09 p.5; Apple Notes LEC09 -->

### Unifiers

![L09 slide 9 - Unifier definition](assets/05-unification-automated-reasoning/slide-l09-09.png)

A **unifier** of two expressions $s,t$ is a substitution with $s[\theta]=t[\theta]$ ; if one exists, $s$ and $t$ are **unifiable**.

In the example box, $L(x)$ and $L(c)$ unify with $\{x\mapsto c\}$ : both sides become $L(c)$ . The question at the bottom, "are $L(a)$ and $L(c)$ unifiable?", has the answer **no**: neither side has a variable, and $a$ and $c$ are two different constants that no substitution can change.

<!-- Sources: L09 p.9 -->

### Most general unifiers

![L09 slide 11 - Most general unifier](assets/05-unification-automated-reasoning/slide-l09-11.png)

The question at the top, "are $L(x)$ and $L(y)$ unifiable?", has the answer yes: $\{x\mapsto y\}$ , $\{y\mapsto x\}$ and $\{x\mapsto a,y\mapsto a\}$ are all unifiers. The first two commit to nothing extra; the last one pins both sides to $a$ .

A **most general unifier (mgu)** $\theta$ satisfies two conditions:

1. it is a unifier of $s$ and $t$ ;
2. every other unifier $\sigma$ can be written as $\tau\circ\theta$ , that is, first apply $\theta$ , then some substitution $\tau$ .

**Common mistake**: the composition $\tau\circ\theta$ is read **right to left**: first $\theta$ , then $\tau$ . The claim at the end of the slide is that if $s,t$ are unifiable, they have an mgu.

<!-- Sources: L09 p.11; Apple Notes LEC09 -->

#### Five example pairs

![L09 slide 13 - Unifier examples](assets/05-unification-automated-reasoning/slide-l09-13.png)

The slide gives the verdicts; the table adds the reason for each pair:

| Pair | Result | Reason |
| --- | --- | --- |
| $P(x,a)$ and $P(b,c)$ | not unifiable | second argument: constants $a\ne c$ cannot be replaced |
| $P(f(x),y)$ and $P(a,w)$ | not unifiable | the function term $f(x)$ cannot become the constant $a$ |
| $P(x,c)$ and $P(a,y)$ | $\{x\mapsto a,y\mapsto c\}$ | each variable faces exactly one constant |
| $P(f(x),c)$ and $P(f(a),y)$ | $\{x\mapsto a,y\mapsto c\}$ | match the outer $f$ first, then its arguments |
| $P(x)$ and $P(f(x))$ | not unifiable | would need $x\mapsto f(f(f(\dots)))$ , but terms must be finite |

<!-- Sources: L09 p.12-13; Apple Notes LEC09 -->

The last pair is where the "occurs check" of the next section comes from: a variable cannot equal a term that **properly contains it**.

#### Why "most general"

![L09 slide 15 - Choosing among unifiers](assets/05-unification-automated-reasoning/slide-l09-15.png)

$P(f(x),g(y,a))$ and $P(f(a),g(z,a))$ have many unifiers. Read the slide's four candidates one by one:

- $A=\{x\mapsto a,y\mapsto z\}$ and $D=\{x\mapsto a,z\mapsto y\}$ are mgus: they do only what is forced ( $x$ must be $a$ ; $y$ and $z$ must be equal) and make no unnecessary commitments;
- $B=\{x\mapsto a,y\mapsto a,z\mapsto a\}$ needlessly commits $y,z$ to $a$ . The slide notes $B=\{y\mapsto a\}\circ D$ : apply $D$ to get $P(f(a),g(y,a))$ , then replace $y$ by $a$ ;
- $C=\{x\mapsto a,y\mapsto g(b,f(u)),z\mapsto g(b,f(u))\}$ is also a unifier, and likewise over-specific: $C=\{y\mapsto g(b,f(u))\}\circ D$ .

**Key point**: resolution should use an mgu. With an over-specific unifier such as $B$ , the conclusion talks only about $a$ and loses the generality of holding for other objects too.

<!-- Sources: L09 p.15 -->

<a id="topic-2"></a>
## 2. The unification algorithm

### The algorithm's frame

![L09 slide 16 - Syntactic unification algorithm](assets/05-unification-automated-reasoning/slide-l09-16.png)

The unification algorithm turns "find a substitution" into "solve equations": given $s,t$ , start from the one-equation set $\{s=t\}$ ; as long as some equation has one of the six forms on the next slide, perform the corresponding action; when nothing applies, return the result. The output is an mgu, or 'failure'.

### The six rules

![L09 slide 22 - Six rules for term equations](assets/05-unification-automated-reasoning/slide-l09-22.png)

On the slide $x$ is a variable and $F,G$ are function or predicate symbols. A constant can be viewed as a **function symbol with zero arguments**, so two different constants $a=b$ also fall under rule 2. The table gives an intuition for each rule:

| No. | Equation form | Action | Intuition |
| --- | --- | --- | --- |
| 1 | $F(s_1,\dots,s_n)=F(t_1,\dots,t_n)$ | split into $s_1=t_1,\dots,s_n=t_n$ | same outer symbol, so match argument by argument |
| 2 | $F(\dots)=G(\dots)$ , with $F\ne G$ or a different number of arguments | fail | substitution cannot change the outer symbol |
| 3 | $x=x$ | delete | already equal, no information |
| 4 | $t=x$ , $t$ not a variable | rewrite as $x=t$ | put the variable on the left, ready to read as a substitution |
| 5 | $x=t$ , $t\ne x$ but $x$ occurs in $t$ | fail (occurs check) | infinite terms are not allowed, see the last pair in the previous section |
| 6 | $x=t$ , $t$ does not contain $x$ | keep it, and replace $x$ by $t$ in the **other** equations | $x$ is solved, so propagate the answer |

<!-- Sources: L09 p.16-22; Apple Notes LEC09 -->

### Three examples

![L09 slide 27 - Unification example 1](assets/05-unification-automated-reasoning/slide-l09-27.png)

The numbers above each arrow are the rules used in that step. Example 1 starts from $f(h(y),g(y,a),z)=f(x,g(v,v),b)$ :

1. $(1,4)$ : both outer symbols are $f$ , so split into three equations; the first, $h(y)=x$ , is flipped to $x=h(y)$ , and the third, $z=b$ , already has the variable on the left;
2. $(1,4)$ : split $g(y,a)=g(v,v)$ into $y=v$ and $a=v$ , and flip the latter to $v=a$ ;
3. $(6,6)$ : substitute $v=a$ into $y=v$ to get $y=a$ , then substitute $y=a$ into $x=h(y)$ to get $x=h(a)$ .

In the last set every left side is a different variable and no right side contains a left-side variable, so we read off the mgu $\{x\mapsto h(a),y\mapsto a,v\mapsto a,z\mapsto b\}$ . Check by substituting back: both sides become $f(h(a),g(a,a),b)$ .

<!-- Sources: L09 p.24-27 -->

![L09 slide 28 - Unification example 2 fails by clash](assets/05-unification-automated-reasoning/slide-l09-28.png)

Example 2: $f(x,a,x)=f(h(z,b),y,h(z,y))$ . Top row: after splitting, $x$ appears twice, equal to $h(z,b)$ and to $h(z,y)$ ; rule 6 substitutes the first into the second, giving $h(z,b)=h(z,y)$ , which splits into $z=z$ and $y=b$ . Bottom row: after deleting $z=z$ , substituting $y=a$ into $y=b$ gives $a=b$ , two different constants, and rule 2 fails. Intuitively, $y$ is required to equal both $a$ and $b$ .

<!-- Sources: L09 p.28 -->

![L09 slide 29 - Unification example 3 fails by occurs check](assets/05-unification-automated-reasoning/slide-l09-29.png)

Example 3: $f(x,g(v,v),x)=f(h(y),g(y,z),z)$ . Splitting gives $x=h(y)$ , $g(v,v)=g(y,z)$ , $x=z$ ; substituting $x=h(y)$ into $x=z$ and flipping gives $z=h(y)$ . In the bottom row, splitting $g$ gives $v=y$ and $v=z$ ; two applications of rule 6 then link $y$ , $v$ and $z$ together until $y=h(y)$ appears: $y$ occurs on the right, and rule 5 fails. This is "failure by occurs check".

**Common mistake**: in the middle of the bottom row there are two equations with $z$ on the left, $z=y$ and $z=h(y)$ . This is not an error: at each step the algorithm may pick any applicable equation. Different choices give different traces, but the same verdict and the same mgu (up to renaming of variables).

<!-- Sources: L09 p.29; Apple Notes LEC09 -->

**Worked example (from the student notes)**: $f(x,f(y,z))=f(f(a,b),x)$ . Splitting gives $x=f(a,b)$ and $f(y,z)=x$ ; substituting for $x$ gives $f(y,z)=f(a,b)$ , which splits into $y=a,z=b$ . The mgu is $\{x\mapsto f(a,b),y\mapsto a,z\mapsto b\}$ .

<!-- Sources: Apple Notes LEC09 -->

### The normal form is the answer

![L09 slide 30 - Normal form gives the mgu](assets/05-unification-automated-reasoning/slide-l09-30.png)

This slide states the algorithm's three guarantees:

- it always halts;
- when it returns 'failure', no unifier exists;
- otherwise the equation set is in **normal form**: every left side is a different variable, and no left-side variable appears on any right side. Reading $\{x_1=t_1,\dots,x_n=t_n\}$ as $\{x_1\mapsto t_1,\dots,x_n\mapsto t_n\}$ then gives an mgu of the input terms.

The two conditions of the normal form make a single simultaneous replacement enough: distinct left sides make the substitution a function, and right sides free of left-side variables leave nothing that still needs replacing.

<!-- Sources: L09 p.30; Apple Notes LEC09 -->

<a id="topic-3"></a>
## 3. Resolution in predicate logic

### The resolution rule

![L09 slide 31 - Resolution rule for predicate logic](assets/05-unification-automated-reasoning/slide-l09-31.png)

Above the line are the two premise clauses; below it is the conclusion. Let $P_1$ and $P_2$ be unifiable atomic formulas with **no variables in common**, $\theta$ their (most general) unifier, and $C_1,C_2$ clauses:

$$
\frac{C_1\cup\{P_1\}\qquad C_2\cup\{\lnot P_2\}}{(C_1\cup C_2)[\theta]}
$$

Compared with propositional resolution there is one extra step: first use $\theta$ to make $P_1$ and $P_2$ the same atom, then cancel the complementary pair, and apply $\theta$ to all remaining literals.

<!-- Sources: L09 p.31; L10 p.5; Apple Notes ★2 -->

Intuitive example: "every lorikeet is gorgeous" $\lnot L(x)\lor G(x)$ and "Coco is not gorgeous" $\lnot G(c)$ unify via $\{x\mapsto c\}$ and resolve to "Coco is not a lorikeet" $\lnot L(c)$ .

<!-- Sources: L08 p.5 -->

**Common mistake: rename first!** When Lecture 10 recalls this rule, it adds the reminder "Rename variables!". Each clause's variables are universally quantified independently; sharing a name is a coincidence. Rename the two clauses apart before resolving, or a unification that should succeed may fail: unifying $P(x)$ with $\lnot P(f(x))$ directly triggers the occurs check; after renaming the latter to $\lnot P(f(y))$ , they unify via $\{x\mapsto f(y)\}$ .

<!-- Sources: L10 p.5, p.14 -->

### A small example

Clauses (all variables universally quantified):

1. $\{\lnot P(f(a)),R(b)\}$
2. $\{P(f(z)),Q(z,u)\}$
3. $\{\lnot R(b)\}$
4. $\{\lnot Q(w,f(v))\}$

1 and 2 with $\{z\mapsto a\}$ give 5 $\{Q(a,u),R(b)\}$ ; 5 and 3 give 6 $\{Q(a,u)\}$ ; 6 and 4 with $\{w\mapsto a,u\mapsto f(v)\}$ give $\bot$ .

<!-- Sources: L08 p.8 -->

### The tadpole example: automated reasoning end to end

![L09 slide 32 - Tadpole argument in predicate logic](assets/05-unification-automated-reasoning/slide-l09-32.png)

This slide writes five English sentences as formulas: every shark eats a tadpole; all large white fish are sharks; Camilla is a large white fish living in deep water; any tadpole eaten by a deep-water fish is miserable; therefore some tadpole is miserable. We want to show that the last sentence (after $\therefore$ ) follows from the first four.

<!-- Sources: L09 p.32-33 -->

![L09 slide 33 - Tadpole clauses](assets/05-unification-automated-reasoning/slide-l09-33.png)

Converting each sentence to clausal form (method in [note 4](04-predicate-logic.en.md)) gives seven clauses. Three points are worth comparing with the previous slide:

- In the first sentence $\exists y$ lies inside $\forall x$ , so it is Skolemised to $f(x)$ — "the tadpole that shark $x$ eats"; the conjunction splits into two clauses $\{\lnot S(x),T(f(x))\}$ and $\{\lnot S(x),E(x,f(x))\}$ .
- In the fourth sentence $\exists y$ sits in the **antecedent** of an implication. $(\dots\land\exists y\,\dots)\to M(z)$ is equivalent to $\forall y\,((\dots)\to M(z))$ , so $y$ becomes a universal variable and needs no Skolem function.
- The last clause is the **negation of the conclusion**: $\lnot\exists z(T(z)\land M(z))$ becomes $\{\lnot T(z),\lnot M(z)\}$ . Resolution must derive the contradiction $\bot$ .

<!-- Sources: L09 p.32-33 -->

![L09 slide 42 - Tadpole refutation](assets/05-unification-automated-reasoning/slide-l09-42.png)

The figure abbreviates $W(u)$ as $Wu$ and $camilla$ as $c$ . The top level holds the seven clauses (variables already renamed apart), and each pair of lines means "these two clauses resolve to the clause below". Reading along the lines:

1. $Wc$ and $\lnot Wu,Su$ with $\{u\mapsto c\}$ give $Sc$ ;
2. on the right: the "miserable" clause and $\lnot Tw,\lnot Mw$ with $\{w\mapsto z\}$ cancel $M$ , giving $\lnot Tz,\lnot Dy,\lnot E(y,z)$ (after unification the two $\lnot T$ literals coincide, and since a clause is a set only one remains); with $Dc$ and $\{y\mapsto c\}$ this gives $\lnot Tz,\lnot E(c,z)$ ;
3. on the left: $Sc$ and $\lnot Sx,E(x,fx)$ with $\{x\mapsto c\}$ give $E(c,fc)$ ;
4. in the middle: $\lnot Tz,\lnot E(c,z)$ and $\lnot Sv,T(fv)$ with $\{z\mapsto fv\}$ give $\lnot Sv,\lnot E(c,fv)$ ; with $E(c,fc)$ and $\{v\mapsto c\}$ this gives $\lnot Sc$ ;
5. $\lnot Sc$ and $Sc$ give $\bot$ , so "some tadpole is miserable" holds.

The slides also note that this is just one of many possible resolution proofs.

<!-- Sources: L09 p.34-42 -->

### In-class exercise

![L09 slide 44 - Greeks and philosophers exercise](assets/05-unification-automated-reasoning/slide-l09-44.png)

"All philosophers are wise; some Greeks are philosophers; so some Greeks are wise." The clauses are $\{\lnot P(x),W(x)\}$ , $\{P(a)\}$ , $\{G(a)\}$ ( $\exists x$ is Skolemised to the constant $a$ , and the conjunction splits into two clauses), and the negated conclusion $\{\lnot G(x),\lnot W(x)\}$ . In the figure the two clauses on the left give $\{W(a)\}$ via $\{x\mapsto a\}$ , the two on the right give $\{\lnot W(a)\}$ , and these two give $\bot$ .

<!-- Sources: L09 p.44 -->

<a id="topic-4"></a>
## 4. Power and limits of the resolution method

### Factoring

![L10 slide 8 - Factoring example](assets/05-unification-automated-reasoning/slide-l10-08.png)

If two literals of a clause $C$ are unifiable with mgu $\theta$ , adding $C[\theta]$ to the clause set is called **factoring**. The example box has two steps, one per vertical line:

1. unify $D(f(y),y)$ with $D(x,y)$ ; the mgu is $\{x\mapsto f(y)\}$ ; the two $D$ literals become identical and merge, while $\lnot P(x)$ becomes $\lnot P(f(y))$ ;
2. unify $\lnot P(f(y))$ with $\lnot P(z)$ ; the mgu is $\{z\mapsto f(y)\}$ ; the two $\lnot P$ literals merge.

$$
\{D(f(y),y),\lnot P(x),D(x,y),\lnot P(z)\}\;\xrightarrow{x\mapsto f(y)}\;\{D(f(y),y),\lnot P(f(y)),\lnot P(z)\}\;\xrightarrow{z\mapsto f(y)}\;\{D(f(y),y),\lnot P(f(y))\}.
$$

<!-- Sources: L10 p.8; Apple Notes LEC10 -->

### Why factoring is necessary

![L10 slide 10 - Factoring is sometimes crucial](assets/05-unification-automated-reasoning/slide-l10-10.png)

$\{P(x),P(y)\}$ and $\{\lnot P(u),\lnot P(v)\}$ are jointly unsatisfiable (the first says "everything satisfies $P$ ", the second "nothing satisfies $P$ "). But each resolution step cancels only one complementary pair: resolving with $\{x\mapsto u\}$ , for example, gives $\{P(y),\lnot P(v)\}$ , still two literals; further resolution always leaves two literals, so the empty clause never appears. In the figure the two vertical lines first factor the clauses into $\{P(x)\}$ and $\{\lnot P(u)\}$ , which then resolve to $\bot$ in one step.

<!-- Sources: L10 p.10 -->

### The resolution method

![L10 slide 11 - The resolution method](assets/05-unification-automated-reasoning/slide-l10-11.png)

```text
Start with a set of clauses Σ
While ⊥ ∉ Σ:
    add to Σ a factor of some C ∈ Σ
          or a resolvent of some C1, C2 ∈ Σ
```

The slide asks whether this process always terminates, separately for unsatisfiable and satisfiable inputs. The next two slides answer.

<!-- Sources: L10 p.11; Apple Notes LEC10 -->

### Fairness

![L10 slide 14 - The need for fairness](assets/05-unification-automated-reasoning/slide-l10-14.png)

For unsatisfiable inputs, termination is guaranteed only with a **fair** search strategy. The clause set in the figure is $\{Q\}$ , $\{\lnot Q\}$ , $\{\lnot P(x),P(f(x))\}$ . The lines show: resolving the third clause with a renamed copy of itself ( $\{\lnot P(y),P(f(y))\}$ ) gives $\{\lnot P(x),P(f(f(x)))\}$ ; resolving again with the original gives $\{\lnot P(x),P(f(f(f(x))))\}$ , and so on forever. The asterisk note stresses that without renaming, unifying the clause with itself fails the occurs check.

A fair strategy guarantees that every resolvable pair is eventually tried, so it will eventually pick $\{Q\}$ and $\{\lnot Q\}$ and immediately derive $\bot$ .

<!-- Sources: L10 p.14; Apple Notes LEC10 -->

### The power of resolution

![L10 slide 15 - The power of resolution](assets/05-unification-automated-reasoning/slide-l10-15.png)

**Theorem**: $\Sigma$ is unsatisfiable iff the resolution method can add $\bot$ after a **finite** number of steps. That is, resolution is **sound** (when it derives $\bot$ , $\Sigma$ really is unsatisfiable) and **refutation-complete** (whenever $\Sigma$ is unsatisfiable, $\bot$ can be derived).

But it is **not a decision procedure**: it may run forever on satisfiable input; for instance, drop $\{\lnot Q\}$ from the figure above and the search can keep producing new clauses. The slide goes further: no such decision procedure exists for predicate logic — validity and unsatisfiability are only **semi-decidable**: a "yes" answer can be confirmed in finite time, but for a "no" answer you may wait forever.

<!-- Sources: L10 p.15; Apple Notes LEC10 -->

**Note**: the student notes label this section "Halting Problem". The two are related — "does this process halt?" is exactly a halting-problem-style question, and [note 12](12-decidability-universality.en.md) proves that the general halting problem is undecidable.

<a id="topic-5"></a>
## 5. Horn clauses and automated reasoning

### Horn clauses and Prolog

![L10 slide 16 - Horn clauses and Prolog](assets/05-unification-automated-reasoning/slide-l10-16.png)

A **Horn clause** is a clause with **at most one positive literal**. All seven clauses in the tadpole example are Horn. Moving the negative literals to the left of an implication gives a "some conditions imply one conclusion" reading:

- $\{\lnot T(z),\lnot D(y),\lnot E(y,z),M(z)\}$ reads as $(T(z)\land D(y)\land E(y,z))\to M(z)$ (a rule);
- $\{W(camilla)\}$ , with only a positive literal, reads as $\top\to W(camilla)$ (a fact);
- $\{\lnot T(z),\lnot M(z)\}$ , with no positive literal, reads as $T(z)\land M(z)\to\bot$ (the negated goal).

The bottom of the slide shows the same rule in the logic programming language Prolog: `:-` reads "if", a comma reads "and", and capitalised `Z`, `Y` are variables.

```prolog
miserable(Z) :- tadpole(Z),
                deepwaterfish(Y),
                eats(Y,Z).
```

<!-- Sources: L10 p.16; Apple Notes LEC10 -->

The next page of Lecture 10 adds: for propositional Horn clauses, satisfiability can be decided in **linear time**; for logic programs, restricting to Horn clauses simplifies the search problem but does not remove it.

<!-- Sources: L10 p.17 -->

### Satisfiability of Horn formulas

![L10 slide 23 - Horn satisfiability marking algorithm](assets/05-unification-automated-reasoning/slide-l10-23.png)

The algorithm only "marks":

1. list all atoms occurring in the formula $\phi$ , together with $\bot$ and $\top$ ;
2. if $\top$ is in the list, mark $\top$ ;
3. while there is a Horn clause $P_1\land\dots\land P_n\Rightarrow Q$ whose premises are all marked and whose $Q$ is unmarked, mark $Q$ ;
4. if $\bot$ is marked, return "unsatisfiable"; otherwise return "satisfiable".

When satisfiable, the bottom right of the slide gives a satisfying assignment: marked atoms are true (T), unmarked ones false (F). Intuitively, the algorithm marks only atoms that are "forced to be true", so if even this derives $\bot$ , the formula truly cannot be satisfied; conversely, setting every other atom to false violates no clause.

<!-- Sources: L10 p.22-23; Apple Notes LEC10 -->

**Worked example (own)**: $\phi=(\top\to P)\land(P\to Q)\land(Q\land R\to\bot)$ . Mark $\top$ , then $P$ , then $Q$ ; the third clause needs $R$ marked, but no rule derives $R$ , so $\bot$ is never marked. Conclusion: satisfiable, with $P=Q=\mathrm{T}$ and $R=\mathrm{F}$ .

### Equality

![L10 slide 26 - Axiomatising equality](assets/05-unification-automated-reasoning/slide-l10-26.png)

To handle equality in automated reasoning, introduce a new predicate $eq(X,Y)$ with axioms (the slide still writes $=$ for readability):

- reflexivity $x=x$ ; symmetry $x=y\Leftrightarrow y=x$ ; transitivity $x=y\land y=z\Rightarrow x=z$ ;
- congruence for every function symbol $f$ and predicate symbol $P$ : $x=y\Rightarrow f(x)=f(y)$ and $x=y\land P(x)\Rightarrow P(y)$ .

The slide asks: is this efficient? No: the congruence axioms need a separate copy for every symbol, and the symmetry and transitivity axioms resolve with almost any equality clause, so the search space blows up.

<!-- Sources: L10 p.26 -->

### The field of automated reasoning

Automated reasoning has been a research field since the 1950s: using computers to reason in a logic, traditionally part of artificial intelligence (but not machine learning). This subject looks only at automated theorem proving within it. The main question: given axioms $\{A_1,\dots,A_n\}$ and a conjecture $C$ , does $A_1,\dots,A_n\models C$ hold?

<!-- Sources: L10 p.27-28 -->

![L10 slide 29 - Robbins conjecture](assets/05-unification-automated-reasoning/slide-l10-29.png)

Why is this interesting? The slide's first example is the Robbins conjecture: an open problem in mathematics for many years, proved by a computer program in 1996 (McCune). The box at the bottom gives a simple equational statement of it; read $n$ as "not" and $+$ as "or". The second example (the verification-tool screenshot on page 30) is verification of programs and security protocols: a verification task is often translated into many small reasoning problems for an automated reasoner.

<!-- Sources: L10 p.29-30 -->

![L10 slide 31 - Why classical predicate logic](assets/05-unification-automated-reasoning/slide-l10-31.png)

The final slide explains why most work uses classical predicate logic: it is a compromise between expressivity and automatability.

- **Expressive**: any computable problem can be encoded, many of them naturally; some more complex logics translate well into first-order logic (FOL).
- **Automatable**: sound and complete calculi exist (resolution in this note, for example), and search is reasonably efficient.

<!-- Sources: L10 p.31 -->

## Self-check

1. Find the mgu of $P(x,f(y),y)$ and $P(g(z),f(a),z)$ , giving the rule numbers used at each step.
2. Are $Q(x,x)$ and $Q(f(y),y)$ unifiable? If not, at which step and by which rule does unification fail?
3. Why is the resolution method incomplete with resolution alone and no factoring? Use this lecture's example.
4. Run the marking algorithm on the Horn formula $(\top\to P)\land(P\to Q)\land(P\land Q\to\bot)$ and state the conclusion.
