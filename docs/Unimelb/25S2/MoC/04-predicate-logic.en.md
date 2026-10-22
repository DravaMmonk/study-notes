# COMP30026 Lectures 5–8 - Predicate Logic: Syntax, Semantics and Clausal Form

Sources: `lecture/05.pdf` pages 56–69, `lecture/06.pdf`, `lecture/07.pdf`, `lecture/08.pdf`; Apple Notes: CS/25S2/MoC — "LEC05-06 Predicate Logic", "LEC07 Languages", "★2 Resolution for Predicate Logic", "Equivalence Cheatsheet".

This lecture asks: **propositional logic cannot express "every programmer loves some debugging tool"; once we add objects, properties and quantifiers, how do we write formulas, decide whether they are true, and bring them into a shape resolution can use?**

Learning path: [Why predicate logic](#topic-1) → [Syntax and translation: terms, formulas and bound variables](#topic-2) → [Semantics: universe, interpretation and assignments](#topic-3) → [Quantifier order and rules of passage](#topic-4) → [Satisfaction, consequence and validity](#topic-5) → [Converting to clausal form](#topic-6).

Key points: translating English into formulas, the definition of truth in a model under an assignment, and Skolemisation. Hard parts: quantifier order, free versus bound variables. Common mistakes: "all S are P" uses $\to$ while "some S is P" uses $\land$ ; after Skolemisation a formula is only equisatisfiable, no longer equivalent.

The semantics part that starts on page 21 of Lecture 6 is repeated at the start of Lecture 7; the semantics screenshots below come from Lecture 7.

<a id="topic-1"></a>
## 1. Why predicate logic

### Propositional logic is not expressive enough

![L05 slide 56 - Propositional logic is not very expressive](assets/04-predicate-logic/slide-l05-56.png)

None of the sentences in the top half can be expressed adequately in propositional logic. Propositional logic can only give a whole sentence one variable; it cannot see inside the sentence "who, to whom, all or some". The bottom half names three problems: infinite collections (e.g. all inputs of a program, which cannot be listed), transitive verbs (e.g. "loves", involving two objects), and relative pronouns (e.g. "whose", linking two objects).

<!-- Sources: L05 p.55-56 -->

### A first look at translations

![L05 slide 60 - Some translations](assets/04-predicate-logic/slide-l05-60.png)

Four sentences, four basic shapes. $P(x,c)$ reads " $x$ pushes the cart $c$ ", $H(d)$ reads "the donkey $d$ is happy".

**Common mistake: $\forall$ goes with $\to$ , $\exists$ goes with $\land$ .** Writing "no emus fly" as $\forall x(Emu(x)\land\lnot Flies(x))$ says "everything is an emu and does not fly". Conversely, $\exists x(Black(x)\to Swan(x))$ is true as soon as there is one non-black thing — far too weak.

The last two sentences differ in the quantifier: "all push the cart" is $\forall x$ ; "the cart is pushed" only needs someone to push it, so it is $\exists x$ . In both, the quantifier covers only the bracketed antecedent; the donkey's happiness $H(d)$ lies outside its scope.

<!-- Sources: L05 p.57-60 -->

The last page of Lecture 5 has some longer translations:

| English | Formula |
| --- | --- |
| Tina found a dog and gave it to Anne | $\exists x(Dog(x)\land Found(tina,x)\land Gave(tina,x,anne))$ |
| Lea inhabits the house that Jackie built | $\exists x(House(x)\land Inhabits(lea,x)\land BuilderOf(jackie,x))$ |
| Mothers' mothers are grandmothers | $\forall x\forall y\forall z((Mother(x,y)\land Mother(y,z))\to Grandmother(x,z))$ |

The pronoun "it" and the relative "that" are both handled by **one shared variable** $x$ linking several atomic formulas — exactly what propositional logic cannot do.

<!-- Sources: L05 p.66-69 -->

### Five new kinds of symbols

![L05 slide 65 - Building blocks](assets/04-predicate-logic/slide-l05-65.png)

Predicate logic adds five kinds of symbols on top of propositional logic:

1. **Constants**: name a specific object, e.g. $c$ "the cart", $d$ "the donkey", $tina$ ; usually from the start of the alphabet, $a,b,c,\dots$ .
2. **Predicates**: describe properties or relations, e.g. $P(x,y)$ " $x$ is pushing $y$ ", $H(x)$ " $x$ is happy"; equality $=$ is a special predicate.
3. **Quantifiers**: $\forall$ "for all", $\exists$ "there exists".
4. **Variables**: $x,y,z$ , usually from the end of the alphabet.
5. **Functions**: map objects to an object, e.g. $f,g,+$ .

<!-- Sources: L05 p.61-65; L06 p.3-7; Apple Notes LEC05-06 -->

### Quantifiers as generalised disjunction and conjunction

![L06 slide 9 - Existential quantification](assets/04-predicate-logic/slide-l06-09.png)

$\exists$ is a generalised $\lor$ : "Tina found some money and gave it to the Red Cross" is $\exists x(Money(x)\land Found(tina,x)\land Gave(tina,x,redcross))$ , meaning a long disjunction written out for money item 1, money item 2, … — one true disjunct suffices. (The expansion on the page drops the $Money(\dots)$ conjunct, since the items listed are money anyway.)

Likewise $\forall$ is a generalised $\land$ : "the square of every integer is nonnegative" is $\forall x(x\in\mathbb{Z}\to x\cdot x\ge 0)$ , i.e. $0\times0\ge0\land1\times1\ge0\land\dots$ , where every conjunct must hold. Over an infinite universe such long conjunctions/disjunctions can never be written out, which is why we need quantifiers.

<!-- Sources: L06 p.8-11 -->

### In-class quiz: every program outputs a valid number

![L06 slide 13 - Quiz translation](assets/04-predicate-logic/slide-l06-13.png)

Translate "Every program outputs a valid number" with the three predicates in the table. The page gives two equivalent answers:

$$
\forall x(P(x)\to\exists y(V(y)\land O(x,y))) \;\equiv\; \forall x\exists y(P(x)\to(V(y)\land O(x,y))).
$$

<!-- Sources: L06 p.12-13; Apple Notes LEC05-06 -->

The second form moves $\exists y$ outwards; why that is allowed is explained by the [rules of passage](#topic-4) ( $P(x)$ contains no $y$ ).

The student notes record a wrong version, $\forall x\exists y((P(x)\land V(y))\to O(x,y))$ : it only requires "some $y$ such that if $y$ is valid then $x$ outputs it" — choosing an **invalid** $y$ makes the implication vacuously true, so it says nothing.

<!-- Sources: Apple Notes LEC05-06 -->

<a id="topic-2"></a>
## 2. Syntax and translation: terms, formulas and bound variables

### Terms and atomic formulas

- A **term** denotes an object: $redcross$ , $1$ , $x$ , $f(x+y)$ . Terms are **not** formulas and have no truth value;
- An **atomic formula** makes a statement about objects: $Flies(x)$ , $P(x,c)$ , $Gave(tina,x,redcross)$ , $2+2=5$ ; these have truth values ( $2+2=5$ is a well-formed formula, merely false under the usual interpretation).

<!-- Sources: L06 p.14-15; Apple Notes LEC05-06 -->

![L06 slide 16 - Notational convention](assets/04-predicate-logic/slide-l06-16.png)

**Convention**: only predicates start with an upper-case letter. $parent(rhonda)$ is a **term**, probably "the parent of Rhonda"; $Parent(rhonda)$ is a **formula**, the proposition "Rhonda is a parent". The case of the first letter tells you at a glance whether a symbol yields an object or a truth value.

<!-- Sources: L06 p.16; Apple Notes LEC05-06 -->

### Grammar and conventions

![L06 slide 21 - Syntax](assets/04-predicate-logic/slide-l06-21.png)

The two grammars on the page define terms $t$ and formulas $\varphi$ :

$$
t ::= x \mid c \mid f(t,\dots,t)
$$

$$
\phi ::= P \mid P(t,\dots,t) \mid \bot \mid \top \mid (\lnot\phi) \mid (\phi\land\phi) \mid (\phi\lor\phi) \mid (\phi\to\phi) \mid (\forall x\,\phi) \mid (\exists x\,\phi)
$$

<!-- Sources: L06 p.17-21 -->

Note that predicate arguments are $t$ while a quantifier is followed by $\phi$ : terms can only go inside predicates or functions, never be joined directly by connectives. The conventions below: binding precedence $\lnot,\forall,\exists$ above $\land,\lor$ , above $\to$ ; outer parentheses omitted; $\to,\land,\lor$ are right-associative (e.g. $A\to B\to C\equiv A\to(B\to C)$ ).

<!-- Sources: L06 p.21; Apple Notes LEC05-06 -->

### Parse trees

![L06 slide 23 - Predicate parse tree](assets/04-predicate-logic/slide-l06-23.png)

This parse tree belongs to the green formula above. Unlike propositional logic, the quantifiers $\exists x$ , $\exists y$ are nodes too, each with a single child (its scope); the children of predicates $A,B$ are terms ( $x,y,m$ , etc.), not formulas. The two $\exists y$ each govern their own subtree, so the two $y$ s are unrelated.

<!-- Sources: L06 p.22-23 -->

### Types of predicates and functions

| | Input | Output |
| --- | --- | --- |
| connectives $\land,\to,\dots$ | propositions | a proposition |
| predicates $P(\dots),=,\dots$ | objects | a proposition |
| functions $f,+,\dots$ | objects | an object |

<!-- Sources: L06 p.24 -->

Use this table to check well-formedness: $P(Q(x))$ is ill-formed, because predicate $P$ expects objects while $Q(x)$ is a proposition; $P(f(x))$ is fine.

### Scope, bound and free

![L06 slide 27 - Quantifier scope](assets/04-predicate-logic/slide-l06-27.png)

The subformula attached to a quantifier is its **scope**; the page marks the scope $(P(x)\lor Q(c))$ of $\forall x$ with an underbrace. A quantifier $\forall x$ or $\exists x$ **binds** $x$ within its scope; an occurrence bound by no quantifier is **free**.

<!-- Sources: L06 p.25-27; Apple Notes LEC05-06 -->

The answers to the poll that follows in class:

| Formula | Bound / free |
| --- | --- |
| $\forall x(P(x)\to Q(y))$ | $x$ bound, $y$ free |
| $\forall z(P(x,y,z)\land\forall y(P(f(x),z,y)))$ | $z$ bound; $x$ free; the first $y$ free, the second bound by the inner $\forall y$ |
| $\forall x\exists y(x<y\land\exists z(y<z))$ | $x,y,z$ all bound |

<!-- Sources: L06 p.28; Apple Notes LEC05-06 -->

**Common mistake**: "free" or "bound" describes a particular **occurrence** of a variable, not the variable name as a whole. In the second row the same $y$ has both a free and a bound occurrence.

### Renaming

Bound variables can be renamed unless there is a clash: $\exists x\forall y(x<y)$ means the same as $\exists x\forall z(x<z)$ ; but turning $\exists x\forall y(x\le y)$ into $\exists x\forall x(x\le x)$ changes the meaning completely (the new name gets "captured" by the inner quantifier). Renaming free variables changes meaning: $P(x)$ differs from $P(y)$ .

<!-- Sources: L06 p.29-31; Apple Notes LEC05-06 -->

### From English to formulas

The rough guide on the slides:

1. identify nouns, verbs, pronouns, adjectives, relative clauses;
2. singular objects → constants; verbs and "is + adjective" → predicates; clauses like "the parent of" → functions; indefinite pronouns like "someone" → variables;
3. replicate the logical structure of the sentence.

<!-- Sources: L06 p.32; Apple Notes LEC05-06 -->

![L06 slide 34 - Example translations](assets/04-predicate-logic/slide-l06-34.png)

Formulas on the left, English on the right. Three contrasts worth comparing line by line:

- "Everyone loves Eva" includes Eva herself; to exclude her, add the antecedent $\lnot(x=eva)$ as in the third line;
- "Someone other than Alex" also uses $\lnot(x=alex)$ , but since it is $\exists$ , it is joined with $\land$ ;
- the last three lines use the same letters with quantifiers in different order or position and mean completely different things — see [quantifier order](#topic-4).

<!-- Sources: L06 p.33-34 -->

**Watch the word order**: "there is something which is not P" is $\exists y\lnot P(y)$ , "nothing is P" is $\lnot\exists y\,P(y)$ ; "all S are not P" is $\forall x(S(x)\to\lnot P(x))$ , "not all S are P" is $\lnot\forall x(S(x)\to P(x))$ .

<!-- Sources: L06 p.35 -->

![L06 slide 38 - Implicit quantifiers](assets/04-predicate-logic/slide-l06-38.png)

**Implicit quantifiers**: in English, plural nouns without a determiner often mean "all". All three examples on the page become universal quantifiers: "Humans are mortal" means all humans; in "A horse is stronger than a dog" both "a"s mean "any", hence two $\forall$ ; in "If a child owns a dog, the child spoils it" the "a" inside a conditional is universal too, not $\exists$ .

<!-- Sources: L06 p.38 -->

<a id="topic-3"></a>
## 3. Semantics: universe, interpretation and assignments

### Truth depends on interpretation

![L06 slide 44 - Meaning of a formula](assets/04-predicate-logic/slide-l06-44.png)

The same formula $\forall x\forall z(x<z\to\exists y(x<y\land y<z))$ ("between any two numbers there is another") changes truth value with the interpretation:

1. over $\mathbb{Z}$ with $<$ as "less than": false (no integer lies between 1 and 2);
2. over $\mathbb{Z}$ with $<$ as "less than or equal": true (take $y=x$ );
3. over $\mathbb{R}$ with $<$ as "less than": true (take the midpoint);
4. with universe $\{0\}$ : the antecedent $x<z$ is always false, so the formula is trivially true.

Lecture 7 opens with a different example: $\forall x(Tree(x)\to\exists y(Leaf(y)\land InTree(y,x)))$ is true if trees are non-empty and false if empty trees are allowed.

<!-- Sources: L06 p.44; L07 p.5 -->

### Universe, interpretation and model

![L07 slide 11 - Models](assets/04-predicate-logic/slide-l07-11.png)

A model has two parts:

- **Universe $U$**: the set of things we talk about; quantifiers range over it; it must be **non-empty**;
- **Interpretation function $I$**: maps every non-logical symbol to its meaning — constant ↦ object in $U$ ; predicate ↦ relation on $U$ ; function ↦ function from $U$ to $U$ ;
- **Model** $\mathcal{M}=(U,I)$ : the universe **together with** an interpretation function.

<!-- Sources: L07 p.9-11; Apple Notes LEC07 -->

The page's example: $\mathbb{Z}$ with usual addition is a model of $\forall x\exists y(x+y=1)$ (take $y=1-x$ ); $\mathbb{N}$ with usual addition is not ( $x=2$ has no natural $y$ ). Same symbol $+$ , different universe, different verdict.

<!-- Sources: L07 p.11 -->

### Variable assignments

![L07 slide 13 - Free variables and assignments](assets/04-predicate-logic/slide-l07-13.png)

The truth of $P(x)$ depends on what $x$ denotes. A **variable assignment** is a function $v:\text{vars}\to U$ . Example box: $U=\{red,blue\}$ , $I(P)=\{red\}$ ; if $v(x)=red$ then $P(x)$ is true, if $v(x)=blue$ it is false. The model fixes what the symbols mean; the assignment then fixes the values of the free variables.

<!-- Sources: L07 p.12-13 -->

### Extending assignments to terms

![L07 slide 16 - Terms and variable assignments](assets/04-predicate-logic/slide-l07-16.png)

Given an interpretation, an assignment extends naturally to all terms: constants are looked up in $I$ ; for a function term, evaluate the arguments first and then apply the function $I$ gives:

$$
v(a)=I(a), \qquad v(g(t_1,\dots,t_n)) = I(g)\big(v(t_1),\dots,v(t_n)\big).
$$

<!-- Sources: L07 p.14-15 -->

The example box, evaluated inside out: term $t=f(y,g(x,a))$ , with $a=1$ , $f$ multiplication, $g$ addition, and $v(x)=2,v(y)=1$ ; first $g(x,a)=2+1=3$ , then $f(y,3)=1\times3=3$ , so $v(t)=3$ .

<!-- Sources: L07 p.16 -->

### The recursive definition of truth

The truth of a **closed** formula (no free variables) depends only on the model; assignments are introduced so that truth can be defined **compositionally** — when recursing inside a quantifier, subformulas contain temporarily free variables. The notation $v_{x\mapsto d}$ means "the map $v$ updated to send $x$ to $d$ , otherwise unchanged".

<!-- Sources: L07 p.17; Apple Notes LEC07 -->

![L07 slide 18 - Defining truth](assets/04-predicate-logic/slide-l07-18.png)

In model $\mathcal{M}$ under assignment $v$ , the page's three rules (plus equality and connectives) as a table:

| Formula | True when |
| --- | --- |
| $P(t_1,\dots,t_n)$ | $(v(t_1),\dots,v(t_n))\in I(P)$ |
| $t=s$ | $v(t)=v(s)$ |
| $\lnot\phi$ , $\phi\land\psi$ , etc. | as in propositional logic |
| $\exists x\,F$ | there is at least one $d\in U$ such that $F$ is true under $v_{x\mapsto d}$ |
| $\forall x\,F$ | $\lnot\exists x\lnot F$ is true, i.e. for every $d\in U$ , $F$ is true under $v_{x\mapsto d}$ |

<!-- Sources: L07 p.18; Apple Notes LEC07 -->

**Insight**: checking $\exists x\,F$ means substituting each object $d$ of the universe for $x$ in turn and asking whether one makes $F$ true — the precise version of the "generalised disjunction" of Section 1.

<a id="topic-4"></a>
## 4. Quantifier order and rules of passage

### Order and the two-person game

$\forall x\exists y\,L(x,y)$ says "everyone has someone they love"; $\exists y\forall x\,L(x,y)$ says "someone is loved by everyone". Quantifiers of different kinds cannot be swapped freely; quantifiers of the same kind can: $\forall x\forall y\equiv\forall y\forall x$ , $\exists x\exists y\equiv\exists y\exists x$ .

<!-- Sources: L06 p.37; L07 p.19; Apple Notes LEC05-06 -->

![L07 slide 23 - Two-person game](assets/04-predicate-logic/slide-l07-23.png)

Think of a quantified formula as a game: I claim a formula and you try to disprove it; you choose values for $\forall$ variables, I choose values for $\exists$ variables. The page's four bullets in order:

- I claim $\forall x\exists y\,P(x,y)$ : you pick $x$ first, and I **know** your $x$ before finding $y$ ;
- I claim $\exists y\forall x\,P(x,y)$ : I must hand over $y$ first, and you look for a counterexample $x$ knowing my $y$ — harder for me;
- consecutive quantifiers of the same kind are chosen by the same player, so their order does not matter.

<!-- Sources: L07 p.20-23 -->

The red text stresses "who moves first, who gets to look": the later player can adapt to earlier choices, which is why $\exists y\forall x$ is stronger than $\forall x\exists y$ (the former implies the latter but not conversely; see [the examples in Section 5](#topic-5)).

### Rules of passage

![L07 slide 25 - Rules of passage](assets/04-predicate-logic/slide-l07-25.png)

The page first warns that subformulas cannot always be moved through quantifiers: $\exists x(P(x)\land Q(x))$ cannot be split into $\exists x\,P(x)\land\exists x\,Q(x)$ and recovered (the two $x$ s may be different objects). The following hold for all $F,G$ :

| Rule | Equivalence |
| --- | --- |
| quantifier negation | $\lnot\forall x\,F\equiv\exists x\lnot F$ , $\lnot\exists x\,F\equiv\forall x\lnot F$ |
| $\exists$ distributes over $\lor$ | $\exists x(F\lor G)\equiv(\exists x\,F)\lor(\exists x\,G)$ |
| $\forall$ distributes over $\land$ | $\forall x(F\land G)\equiv(\forall x\,F)\land(\forall x\,G)$ |
| derived | $\exists x(F\to G)\equiv(\forall x\,F)\to(\exists x\,G)$ |

<!-- Sources: L07 p.24-25; Apple Notes Equivalence Cheatsheet -->

Memory aid: the "generalised $\lor$ " distributes over $\lor$ and the "generalised $\land$ " over $\land$ ; the other way round ( $\exists$ over $\land$ , $\forall$ over $\lor$ ) fails.

![L07 slide 26 - More rules of passage](assets/04-predicate-logic/slide-l07-26.png)

If $G$ has **no free occurrences of** $x$ ( $F$ may have), we also get:

| Equivalence | |
| --- | --- |
| $\exists x\,G\equiv G$ | $\forall x\,G\equiv G$ |
| $\exists x(F\land G)\equiv(\exists x\,F)\land G$ | $\forall x(F\lor G)\equiv(\forall x\,F)\lor G$ |
| $\forall x(F\to G)\equiv(\exists x\,F)\to G$ | $\forall x(G\to F)\equiv G\to(\forall x\,F)$ |

<!-- Sources: L07 p.26; Apple Notes Equivalence Cheatsheet -->

**Hard part**: in $\forall x(F\to G)\equiv(\exists x\,F)\to G$ the quantifier changes from $\forall$ to $\exists$ , because $x$ occurs in the **antecedent**, which hides it under a negation ( $F\to G\equiv\lnot F\lor G$ ).

**Worked example (from the student's equivalence cheatsheet)**: simplify $\forall x(\lnot P(x)\lor\lnot H(x))\to\exists x(P(x)\land\lnot H(x))$ :

| Step | Result | Reason |
| --- | --- | --- |
| 1 | $\lnot\forall x(\lnot P(x)\lor\lnot H(x))\lor\exists x(P(x)\land\lnot H(x))$ | eliminate implication |
| 2 | $\exists x(P(x)\land H(x))\lor\exists x(P(x)\land\lnot H(x))$ | push negation in |
| 3 | $\exists x((P(x)\land H(x))\lor(P(x)\land\lnot H(x)))$ | $\exists$ distributes over $\lor$ |
| 4 | $\exists x(P(x)\land(H(x)\lor\lnot H(x)))$ | factor out $P(x)$ |
| 5 | $\exists x\,P(x)$ | drop the tautological conjunct |

<!-- Sources: Apple Notes Equivalence Cheatsheet -->

<a id="topic-5"></a>
## 5. Satisfaction, consequence and validity

### Satisfaction and consequence

$\mathcal{M},v\models F$ means " $F$ is true in $\mathcal{M}$ under assignment $v$ ". $F$ is true in $\mathcal{M}$ ( $\mathcal{M}\models F$ ) iff this holds for **all** assignments. $F\models G$ means every model of $F$ is a model of $G$ ; $F\equiv G$ means each entails the other.

<!-- Sources: L07 p.27-30 -->

### Satisfiable, valid and contingent

![L07 slide 31 - Satisfiability and validity](assets/04-predicate-logic/slide-l07-31.png)

For a closed formula $F$ , the five classes on the page match propositional logic one for one, with "assignment" replaced by "model":

| Class | Definition |
| --- | --- |
| satisfiable | $\mathcal{M}\models F$ for some $\mathcal{M}$ |
| valid | $\mathcal{M}\models F$ for every $\mathcal{M}$ |
| unsatisfiable | $\mathcal{M}\not\models F$ for every $\mathcal{M}$ |
| non-valid | $\mathcal{M}\not\models F$ for some $\mathcal{M}$ |
| contingent | satisfiable but not valid |

<!-- Sources: L07 p.31; Apple Notes LEC07 -->

As in propositional logic: $F$ valid ⟺ $\lnot F$ unsatisfiable; $F$ non-valid ⟺ $\lnot F$ satisfiable. Examples: $\forall x\,P(x)\lor\exists y\lnot P(y)$ is valid (either everything is $P$ or something is not); $\forall x\,P(x)\land\lnot P(a)$ is unsatisfiable; $\forall x\,P(x)$ is contingent.

<!-- Sources: L06 p.47; L07 p.8, p.31 -->

**Common mistake**: propositional logic only needs finitely many truth-table rows; in predicate logic "all models" includes universes of every size (even infinite), which cannot be enumerated. Proving validity therefore needs an argument (or, later, resolution), whereas proving non-validity needs just **one** countermodel.

### An example of non-validity

![L07 slide 33 - Example of non-validity](assets/04-predicate-logic/slide-l07-33.png)

$(\forall y\exists x\,P(x,y))\to(\exists x\forall y\,P(x,y))$ is not valid; the page gives two countermodels:

- $U=\mathbb{Z}$ , $P$ "less than": every $y$ has a smaller $x$ , but no $x$ is smaller than every $y$ ;
- $U=\{0,1\}$ , $P$ "equals": every $y$ equals itself, but no $x$ equals both 0 and 1.

It is still satisfiable, e.g. $U=\{0,1\}$ with $P$ "less than or equal" (take $x=0$ ; the consequent is true).

<!-- Sources: L07 p.32-33 -->

### An example of validity

![L07 slide 35 - Example of validity](assets/04-predicate-logic/slide-l07-35.png)

$(\exists y\forall x\,P(x,y))\to(\forall x\exists y\,P(x,y))$ is valid — the two-person game's observation that $\exists y\forall x$ is stronger. Its negation is $(\exists y\forall x\,P(x,y))\land(\exists x\forall y\lnot P(x,y))$ : the right conjunct needs some $a$ with $(a,b)\notin I(P)$ for all $b$ , while the left conjunct supplies a $b$ with $P(x,b)$ for every $x$ (including $a$ ) — a contradiction. The negation is unsatisfiable, so the formula is valid.

Similarly $(\forall x\,P(x))\to P(t)$ is valid for any term $t$ : the negation $(\forall x\,P(x))\land\lnot P(t)$ is unsatisfiable because $t$ always denotes some element of the universe.

<!-- Sources: L07 p.34-37 -->

<a id="topic-6"></a>
## 6. Converting to clausal form

### Why give up equivalence

CNF in predicate logic is a conjunction of disjunctions of literals, with all variables (implicitly) universally quantified. Because of $\exists$ , not every formula has an equivalent CNF. The workaround is to **give up equivalence and keep only satisfiability**: the converted formula is **equisatisfiable** with the original — one is satisfiable iff the other is. That suffices for resolution, which only asks whether $\bot$ can be derived.

<!-- Sources: L08 p.2-3; Apple Notes ★2 -->

### Preview: what predicate resolution looks like

The slides start with an intuitive example: "every lorikeet is gorgeous" and "Coco is not gorgeous" entail "Coco is not a lorikeet", i.e. $\lnot L(x)\lor G(x)$ and $\lnot G(c)$ give $\lnot L(c)$ . Resolution now works on atomic formulas containing variables, constants and functions, not just propositional variables: only after letting $x$ be $c$ do the two sides contain complementary literals.

<!-- Sources: L08 p.4-6 -->

![L08 slide 8 - Resolution by example](assets/04-predicate-logic/slide-l08-08.png)

Look first at the braces in the last column: every step comes with a substitution. Line 5 uses $\{z\mapsto a\}$ to make $P(f(a))$ and $P(f(z))$ identical before cancelling; line 6 cancels $R(b)$ against $\lnot R(b)$ ; line 7 uses $\{w\mapsto a,u\mapsto f(v)\}$ to make $Q(a,u)$ and $Q(w,f(v))$ identical, giving $\bot$ . How to find such substitutions systematically (unification) is the topic of [the next note](05-unification-automated-reasoning.en.md); this lecture first solves "how to get clauses".

<!-- Sources: L08 p.7-8 -->

### Skolemisation: eliminating existential quantifiers

![L08 slide 9 - Eliminating existential quantifiers](assets/04-predicate-logic/slide-l08-09.png)

**Skolem constants**: $F=\exists x\forall y\,P(x,y)$ and $G=\forall y\,P(a,y)$ ( $a$ a new constant) are equisatisfiable. The two sentences of the proof box are the two directions: every model of $G$ is a model of $F$ (use $I(a)$ as the witness for $x$ ); conversely, every model of $F$ extends to a model of $G$ by letting $I(a)$ be the witness object for $x$ .

<!-- Sources: L08 p.9 -->

![L08 slide 13 - Skolem constants and functions](assets/04-predicate-logic/slide-l08-13.png)

**Skolem functions**: in $F=\forall y\exists x\,P(x,y)$ the witness $x$ may differ for different $y$ ; a **fresh function symbol** $f$ stands for "get the $x$ out of the $y$ ", giving the equisatisfiable $\forall y\,P(f(y),y)$ .

<!-- Sources: L08 p.10-13; Apple Notes ★2 -->

Rule: replace an existential variable by a new function whose arguments are **all enclosing universal variables**. The nested example from the student notes:

$$
\forall z\exists y\forall x\exists w\,P(x,y,z,w)\;\leadsto\;\forall z\forall x\,P(x,f(z),z,g(z,x)).
$$

$y$ is only inside $\forall z$ , so it becomes $f(z)$ ; $w$ is inside $\forall z$ and $\forall x$ , so it becomes $g(z,x)$ .

<!-- Sources: Apple Notes ★2 -->

**Common mistake**: after Skolemisation the formula is only equisatisfiable with the original, **no longer equivalent**. The last line of the page notes that only Skolemising top-level existentials is examinable.

<!-- Sources: L08 p.13; Apple Notes ★2 -->

### The six steps

![L08 slide 14 - Formula to clausal form](assets/04-predicate-logic/slide-l08-14.png)

The steps resemble the propositional ones; steps 3–5 are new:

1. eliminate $\leftrightarrow$ and $\to$ ;
2. push negation in (bring to NNF);
3. rename shadowed variables — a variable is shadowed if it lies within the scope of a quantifier binding the same variable (e.g. the second $x$ in $\forall x\exists x$ ); rename so different quantifiers use different names;
4. Skolemise to eliminate existential quantifiers;
5. drop universal quantifiers (they are still implicitly there);
6. convert to CNF with the distributive laws.

<!-- Sources: L08 p.14; Apple Notes ★2 -->

**Why step 2 must precede step 4**: an $\exists$ hidden under a negation (such as $\lnot\exists y$ ) is really universal; only after pushing negations in can we see which quantifiers are genuinely existential.

### The running example

The first three steps for $\forall x(P(x)\leftrightarrow\exists y(R(x,y)\land\forall z\,R(z,y)))$ :

| Step | Result |
| --- | --- |
| 1. remove $\leftrightarrow,\to$ | $\forall x\big((\lnot P(x)\lor\exists y(R(x,y)\land\forall z\,R(z,y)))\land(\lnot\exists y(R(x,y)\land\forall z\,R(z,y))\lor P(x))\big)$ |
| 2. push negation | $\forall x\big((\lnot P(x)\lor\exists y(R(x,y)\land\forall z\,R(z,y)))\land(\forall y(\lnot R(x,y)\lor\exists z\lnot R(z,y))\lor P(x))\big)$ |
| 3. rename | rename $y,z$ in the second conjunct to $u,v$ : $\dots\land(\forall u(\lnot R(x,u)\lor\exists v\lnot R(v,u))\lor P(x))$ |

<!-- Sources: L08 p.15-17 -->

Step 2 is exactly the situation just described: in the second conjunct $\lnot\exists y$ becomes $\forall y$ and $\forall z$ becomes $\exists z$ . The slide title for step 3 is "Rename Apart": nothing in this example is actually shadowed, but both conjuncts use $y,z$ , so the slides still rename them apart to give every quantifier its own variable — the safer practice.

![L08 slide 19 - Step 4 Skolemize](assets/04-predicate-logic/slide-l08-19.png)

Step 4 first highlights the two existential variables in red, then chooses Skolem-function arguments from the enclosing $\forall$ s: $y$ is only inside $\forall x$ → $f(x)$ ; $v$ is inside $\forall x,\forall u$ → $g(u,x)$ . Step 5 simply deletes $\forall x,\forall z,\forall u$ , giving $(\lnot P(x)\lor(R(x,f(x))\land R(z,f(x))))\land(\lnot R(x,u)\lor\lnot R(g(u,x),u)\lor P(x))$ ; these variables remain implicitly universally quantified.

<!-- Sources: L08 p.18-20 -->

![L08 slide 21 - Step 6 Convert to CNF](assets/04-predicate-logic/slide-l08-21.png)

In step 6 only the first conjunct needs distributing: $\lnot P(x)\lor(R(x,f(x))\land R(z,f(x)))$ splits into two clauses. In clausal form there are three clauses:

$$
\{\lnot P(x),R(x,f(x))\},\quad \{\lnot P(x),R(z,f(x))\},\quad \{\lnot R(x,u),\lnot R(g(u,x),u),P(x)\}.
$$

<!-- Sources: L08 p.21 -->

With clauses in hand we can reason by resolution with unification; see [the next note](05-unification-automated-reasoning.en.md).

## Self-check

1. Translate "every student attended at least one lecture" (using $S(x)$ , $Lec(y)$ , $A(x,y)$ ).
2. Give a model in which $\forall x\exists y\,P(x,y)$ is true but $\exists y\forall x\,P(x,y)$ is false.
3. In $\exists x(P(x)\land\forall x\,Q(x,y))$ , which variable occurrences are free? Which step must be done first before converting to clausal form?
4. In the model with $U=\{1,2,3\}$ , $I(f)$ = "add 1, take mod 3, then add 1", and $I(P)=\{(1,2),(2,3)\}$ , decide whether $\forall x\,P(x,f(x))$ is true.
5. Skolemise $\exists x\forall y\exists z\,R(x,y,z)$ and state how the result relates to the original.
