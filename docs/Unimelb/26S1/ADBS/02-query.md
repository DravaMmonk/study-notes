# 2 Query Optimisation

## Query Pipeline

- User
	- Different types of queries from different types of users
- Query Evaluation Engine
	- Query → Relational algebra expression → Execution plan (with optimisaition)
- Storage Manager
	- Page abstraction (allocation, loading, replacement)
	- Index access
	- Buffer pool
	- Concurrency
	- Transaction logging
- Disk / Storage
	- Data files - *real data*
	- Indices - *fast access*
	- Data dictionary - *metadata (table structure, index structure, constraints, ...)*

---
## Relational Algebra Expressions

### Selection & Projection

```SQL
SELECT name
FROM dogs
WHERE breed = 'Labrador'
```

is same as:

$$
\pi_{\text{name}} ( \sigma_{\text{breed=\textit{`Labrador'}}} (\texttt{dogs} ) )
$$

where,  
- $\sigma$ - selection (select rows)
- $\pi$ - projection (select columns)

### Join Operations

```SQL
SELECT name
FROM dogs
JOIN owners
ON dogs.owner_id = owners.owner_id
```

is same as:

1. **Selection Over Product**

$$
\pi_{\text{name}}(\sigma_{\texttt{dogs}.owner\_id = \texttt{owners}.owner\_id} (\texttt{dogs} \Join \texttt{owners}))
$$

2. **θ-join**

$$
\pi_{\text{name}}(\texttt{dogs} \Join_{\texttt{dogs}.owner\_id = \texttt{owners}.owner\_id} \texttt{owners})
$$

3. **Natural Join**

$$
\pi_{\text{name}}(\texttt{dogs} \Join \texttt{owners})
$$

where,  
- $\Join$ - join operation

---
## Page

A fixed-size block of storage that a database uses to R/W data between disk and memory.

Cost of pages:

$$
\text{Pages Cost} = \frac{\text{Record Size}}{\text{Page Size}}
$$

Cost of a query:

$$
\text{Query Cost} \approx \text{Number of Page R/W}
$$

---
## Cost-based exhaustive search

Steps:  
1. Generate logically equivalent expressions of the query
	- $\sigma_\theta(R \Join S)$, $\sigma(R \Join_\theta S)$, ...
2. Annotate resultant expressions to get alternative query plans
	- Heap scan (*the whole table*), Index scan, ...
3. Choose the cheapest plan based on **estimated cost** based on:
	- Table statistics (e.g. number of distinct values, table size, histograms, ...)
	- Intermediate result size
	- Algorithm cost formula

Estimated cost of a query plan:

$$
\text{Query Cost} \approx \text{Estimated Cost to Join} + \text{Estimated Cost for Scanning}
$$

---
### Reduction Factor

The fraction of rows that remain after applying a **selection condition** to a table.  
- Well used to estimate result costs:

$$
\text{Result Size} = \text{Table Size} \times \text{Reduction Factor}
$$

1. RF of Join (e.g. condition: $R.A = S.B$)

$$
RF = \frac{1}{\max(V(A),V(B))}
$$

where,  
- $V$ - number of **distinct** values

$$
\text{Result Size} = |R| \times |S| \times RF
$$


2. RF of Comparison

"$A = c$":

$$
RF = \frac{1}{V(A)}
$$

"$A > c$":

$$
RF = \frac{\max(A) - c}{\max(A) - \min(A)}
$$

"$a < A < b$":

$$
RF = \frac{b-a}{\max(A) - \min(A)}
$$

3. Multiple Conditions

$$
RF = RF(A) \times RF(B)
$$

---
### Better estimation of RF

- Sampling
	- testing the condition on a random subset of the data.
- Histograms
	- using stored statistics about data value distributions

---
### Scan Strategies

1. Heap (Full-table) Scan

Page 1 → Page 2 → Page 3 → ... → Page N. 
- ✅No index exists
- ✅Query for a **large portion of the table** (low selectivity)
- ✅Sequential scan is **cheaper** than many random index lookups

2. Index Scan

Index → Row ID → Page ID. 
- ✅Conditions like **equality search or small range queries**
- ✅Useful for **point lookups (e.g., primary key search)**

---
### Join Algorithms

1. Nested Loop Join

For $R.A = S.B$:

```psudo
for each tuple r in R:
    for each tuple s in S:
        if r.A == s.B:
            output (r,s)
```

$$
\text{Cost} \approx B_R + N_R \times B_S
$$

where,  
- $B$ - number of pages
- $N$ - number of rows

2. Page-oriented Nested Loop Join

```psudo
for each page pr in R:
    load pr
    for each page ps in S:
        load ps
        for each tuple r in pr:
            for each tuple s in ps:
                if r.A == s.B:
                    output (r,s)
```

$$
\text{Cost} \approx B_R + B_R \times B_S
$$
---
## Heuristic-based Optimisation

Importance of a good optimiser:  
- Heart of query efficiency
- Algorithms: Most Fit > Best

Limitation of cost-based optimiser:  
- Estimated Cost of Result Size $\ne$ Query Cost
- Generation cost may expensive as well

Heuristic Rules:
- Perform selections early
- Perform projections early
- Perform most restrictive selection and join operations before similar operations

Cheap Queries → Simple Heuristics  
Expensive Queries → Exhaustive Enumeration

---
## Adaptive plans

Wait for a plan to execute first, then choose the next best alternative.

Adaptive plans are most useful when **the optimiser's cost estimates are unreliable**.    
- Statistics outdated
- Skewed data
- Complex joins
- Large analytical queries

---
## Further Optimisation
### Readjust statistics

Statistics table will learn from monitoring, analysing, feedbacks and mistakes.

### Memory Optimisation

Create commonly used tables and store them in the main memory by setting  `ENGINE = MEMORY` .

```SQL
CREATE TABLE (
...
)ENGINE=MEMORY
```

---
