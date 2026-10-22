# COMP90007 Weeks 6–7 - Routing Algorithms

Sources: `lecture/Week6-routing.pdf` (Network Layer (4); Week 7 reuses W6-L3), `lecture/Week12-Review-handout.pdf` p.28–31 (duplicates of lecture pages, no separate screenshots); Apple Notes: CS/25S1/IT — "WEEK 7 - Network3 - Routing algorithms"; CS/25S1/IT/Review — "Network Layer".

This lecture asks: **when a router receives a packet, how does it decide which line to forward it on, and how is the routing table behind that decision computed?**

Learning path: [Basic ideas of routing](#topic-1) → [Shortest path: Dijkstra](#topic-2) → [Flooding and distance vector](#topic-3) → [Link state and hierarchical routing](#topic-4) → [Broadcast routing](#topic-5).

Key points: the Dijkstra hand trace, distance-vector updates, the five steps of link state. Hard parts: in distance vector, a router computes its own table from its neighbours' tables. Common mistakes: distance vector is "global information shared locally" and link state is "local information shared globally"; the two are often swapped.

<a id="topic-1"></a>
## 1. Basic ideas of routing

### What routing does

![Slide 03 - Routing as path discovery](assets/08-routing-algorithms/slide-03.png)

**Routing** is the process of discovering network paths: treat the network as a graph of nodes and links; optimise metrics such as hops or delay; update routes when the topology changes (e.g. a router fails). Below the figure are the routers' routing tables, each row reading "destination → which line". Compare A's two tables: at first traffic for E and F goes via C, later via B; that is "routes are updated as the network changes". The datagram details of this figure are covered in [06 Service models and internetworking](06-network-layer-internetworking.en.md); here we look only at the routing tables.

### Classes of routing algorithm

![Slide 04 - Routing algorithm definition and classes](assets/08-routing-algorithms/slide-04.png)

![Slide 05 - List of routing algorithms](assets/08-routing-algorithms/slide-05.png)

The first slide gives the definition: the **routing algorithm** decides which output line an incoming packet should be forwarded on, and splits algorithms into non-adaptive and adaptive; the second files each algorithm of this lecture under the two classes and adds two schemes for scale and one-to-all sending. The student's notes say the same thing from two viewpoints: for a packet, "the most appropriate path to the destination"; for a router, "the most appropriate output line for forwarding this packet".
<!-- Sources: w6rt p.3-4; Apple Notes WEEK 7 Network3 -->

| Category | Property | Algorithms |
| --- | --- | --- |
| Non-adaptive | Static routing; the decision process does not react to network conditions | Shortest path routing, flooding |
| Adaptive | Dynamic decisions that follow changes in topology, traffic, etc. | Distance vector routing, link state routing |
| Others | Deal with scale and one-to-all sending | Hierarchical routing, broadcast routing |
<!-- Sources: w6rt p.4-5; rev1 p.28 -->

### The optimality principle

![Slide 06 - Optimality principle](assets/08-routing-algorithms/slide-06.png)

**Optimality principle**: if router B is on the optimal path from router A to router C, then the optimal path from B to C also falls along the same route. Look at the dashed line $r_3$ : if B had a better route $r_3$ to C than $r_2$ , then $r_1+r_3$ would beat the original route $r_1+r_2$ , contradicting its optimality. The student's notes put it as: if a route is optimal, every sub-path of it is optimal.
<!-- Sources: w6rt p.6; Apple Notes WEEK 7 Network3 -->

### The sink tree

![Slide 07 - Sink tree](assets/08-routing-algorithms/slide-07.png)

By the optimality principle, the optimal routes from all sources to one destination together form a tree rooted at that destination: the **sink tree**. The right-hand picture is the sink tree for B in the network on the left: each node keeps only its one optimal edge towards B, so there are no loops. The goal of a routing algorithm is to discover and use such sink trees for every router.
<!-- Sources: w6rt p.7; rev1 p.29 -->

<a id="topic-2"></a>
## 2. Shortest path: Dijkstra

### Shortest path routing

![Slide 08 - Shortest path routing](assets/08-routing-algorithms/slide-08.png)

**Shortest path routing** is non-adaptive: each link has a non-negative weight (distance, delay, …), and the shortest path is the one with the lowest total weight; with weight 1 on every link it finds the path with the fewest hops. The method is to compute a sink tree on the graph.
<!-- Sources: w6rt p.8 -->

The figure is the network for the example; the numbers are weights: A–B 2, A–G 6, B–C 7, B–E 2, E–G 1, E–F 2, F–C 3, F–H 2, G–H 4, C–D 3, H–D 2.

### Algorithm steps

![Slide 09 - Dijkstra's algorithm steps](assets/08-routing-algorithms/slide-09.png)

The slide's four steps correspond to the pseudocode below: set P records the nodes already in the sink tree; each node has a distance $d$ to the sink, initially infinite; starting from the sink (distance 0), repeatedly add the node outside P with the smallest distance, then update its neighbours.

```text
P = {}                                  # nodes already in the sink tree
for each node v: d[v] = ∞               # distance from v to the sink
d[sink] = 0
while P does not contain all nodes:
    v = the node not in P with the smallest d[v]
    add v to P
    for each neighbour u of v (u not in P):
        d[u] = min(d[u], d[v] + w(v, u))
```
<!-- Sources: w6rt p.9 -->

### The hand trace

![Slide 10 - Dijkstra first steps](assets/08-routing-algorithms/slide-10.png)

First the opening three steps: (a) is the graph; (b) once A joins P, its neighbours B and G get (2, A) and (6, A), the brackets reading (distance, predecessor); (c) B has the smallest distance and joins, and its neighbours C and E get (9, B) and (4, B). Each row of the table on the right is one such step.

![Slide 11 - Dijkstra full trace](assets/08-routing-algorithms/slide-11.png)

The full table follows. With A as the sink, each row shows every node's distance to A after one more node is added ("--" means already in P; bold marks the minimum chosen in that round):

| n | B | C | D | E | F | G | H | Added | P |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ | A | {A} |
| 2 | **2** | ∞ | ∞ | ∞ | ∞ | 6 | ∞ | B | {A, B} |
| 3 | -- | 9 | ∞ | **4** | ∞ | 6 | ∞ | E | {A, B, E} |
| 4 | -- | 9 | ∞ | -- | 6 | **5** | ∞ | G | {A, B, E, G} |
| 5 | -- | 9 | ∞ | -- | **6** | -- | 9 | F | {A, B, E, G, F} |
| 6 | -- | 9 | ∞ | -- | -- | -- | **8** | H | {A, B, E, G, F, H} |
| 7 | -- | **9** | 10 | -- | -- | -- | -- | C | {A, B, E, G, F, H, C} |
| 8 | -- | -- | **10** | -- | -- | -- | -- | D | All |
<!-- Sources: w6rt p.10-11; Apple Notes WEEK 7 Network3; Apple Notes Review Network Layer -->

Compare the step-by-step graphs on the left: red edges are confirmed sink-tree edges. Note row 4: once E is added, G costs only $4+1=5$ via E, shorter than the direct A–G of 6, so it is updated to (5, E); H first gets 9 via G in row 5 and is improved to $6+2=8$ via F in row 6, shown as (8, F).
<!-- Sources: w6rt p.11 -->

**Illustrative example (our own)**: to read a path, follow the predecessors backwards. D is labelled (10, H), H is (8, F), F is (6, E), E is (4, B), B is (2, A), so the shortest path from D to A is D–H–F–E–B–A, total $2+2+2+2+2=10$ .

**Common mistake**: each round adds only the node with the **current smallest** distance to P, and afterwards updates only **its neighbours**. Distances of nodes already in P never change.

<a id="topic-3"></a>
## 3. Flooding and distance vector

### Flooding

![Slide 12 - Flooding](assets/08-routing-algorithms/slide-12.png)

**Flooding** is non-adaptive: every incoming packet is sent out on every outgoing line **except the one it arrived on**. It generates many duplicate packets and is inefficient, but extremely robust: if any path exists, the packet gets through. **Selective flooding** improves on it by sending only on links roughly in the right direction.
<!-- Sources: w6rt p.12; Apple Notes WEEK 7 Network3 -->

### Distance vector routing

![Slide 13 - Distance vector routing](assets/08-routing-algorithms/slide-13.png)

**Distance vector routing** is dynamic: each router keeps a table of the best-known distance to each destination and the line to use; tables are updated by exchanging information with **neighbouring** routers. The slide's summary is **global information shared locally**. Each router:

1. knows the distances to its neighbours;
2. advertises the vector of its lowest known distances to all destinations to all neighbours;
3. updates its own vector from the vectors it receives;
4. repeats periodically to reflect network changes.
<!-- Sources: w6rt p.13; rev1 p.30; Apple Notes WEEK 7 Network3 -->

![Slide 14 - Distance vector example](assets/08-routing-algorithms/slide-14.png)

Router J has four neighbours with measured delays $JA=8$ , $JI=10$ , $JH=12$ , $JK=6$ (bottom left). The four middle columns are the vectors J received from A, I, H and K; the two rightmost columns are J's new vector and the line for each entry. The rule is:

$$
d_J(X)=\min_{N\in\{A,I,H,K\}}\bigl(JN+d_N(X)\bigr).
$$

Two destinations as examples:

| Destination | Via A | Via I | Via H | Via K | New distance / line |
| --- | --- | --- | --- | --- | --- |
| G | $8+18=26$ | $10+31=41$ | $12+6=18$ | $6+31=37$ | 18 / H |
| C | $8+25=33$ | $10+18=28$ | $12+19=31$ | $6+36=42$ | 28 / I |
<!-- Sources: w6rt p.14 -->

**Common mistake**: J does not use the values in its own old table; the new vector is computed entirely from "distance to neighbour + neighbour's vector".

<a id="topic-4"></a>
## 4. Link state and hierarchical routing

### Link state routing

![Slide 15 - Link state routing](assets/08-routing-algorithms/slide-15.png)

**Link state routing** is also dynamic, an alternative to distance vector, which takes too long to converge after the topology changes. It is widely used on the Internet, e.g. OSPF (Open Shortest Path First), but requires more computation than distance vector. The slide's summary is **local information shared globally, using flooding**. Each router:

1. discovers its neighbours and learns their network addresses;
2. measures the distance (or delay, cost) to each neighbour;
3. builds a **link state packet (LSP)**;
4. sends this packet to **all other routers**;
5. computes the shortest path to every other router, e.g. using Dijkstra's algorithm.
<!-- Sources: w6rt p.15; rev1 p.30; Apple Notes WEEK 7 Network3 -->

![Slide 16 - Building link state packets](assets/08-routing-algorithms/slide-16.png)

Each node's LSP lists the sender, a **sequence number (Seq.)**, an **age**, and each neighbour with the distance to it. Look at A's LSP: neighbour B at distance 4 and E at 5, matching the network on the left. The student's notes write it as router ID, sequence, TTL, a "neighbour–cost" table (and a checksum).

Both the sequence number and the age exist because of flooding: several versions of one router's LSP may circulate at once, and receivers keep only the one with the highest sequence number; the age counts down over time, so stale or leftover LSPs are eventually discarded. When to build a new LSP: periodically at regular intervals, or when a significant event occurs (e.g. a link goes down).
<!-- Sources: w6rt p.16; Apple Notes WEEK 7 Network3; Apple Notes Review Network Layer -->

| | Distance vector | Link state |
| --- | --- | --- |
| What is exchanged | The router's distance vector to all destinations | The router's link costs to its neighbours |
| Sent to whom | Neighbours only | Flooded to all routers |
| How routes are computed | Derived from neighbours' vectors | Every router knows the whole graph and runs Dijkstra itself |
| Properties | Simple computation, slow convergence after topology changes | Fast convergence, more computation |

### Hierarchical routing

![Slide 17 - Hierarchical routing idea](assets/08-routing-algorithms/slide-17.png)

As networks grow, routing tables grow, leading to higher CPU and memory demands. **Hierarchical routing** divides routers into **regions**: each router knows everything about routers in its own region but nothing about the inside of other regions; routers connected to two regions act as exchange points.
<!-- Sources: w6rt p.17; Apple Notes WEEK 7 Network3 -->

![Slide 18 - Full vs hierarchical table for 1A](assets/08-routing-algorithms/slide-18.png)

Compare router 1A's two tables: the full table needs one row for each of all 17 routers; the hierarchical table has one row each for 1A, 1B, 1C in its own region and one row per other region, 7 rows in all. The cost is that paths may be slightly longer: the hierarchical table hands everything for region 5 to 1C (4 hops, as estimated to 5A), whereas the full table shows that 5C is only 5 hops via 1B and further via 1C.
<!-- Sources: w6rt p.18 -->

<a id="topic-5"></a>
## 5. Broadcast routing

### Broadcast methods

![Slide 19 - Broadcast routing methods](assets/08-routing-algorithms/slide-19.png)

**Broadcast routing** lets a host send a message to all other hosts. The slide lists four methods:

| Method | How | Pros and cons |
| --- | --- | --- |
| Separate packets | Send a distinct packet to each destination | Inefficient; the source needs all destination addresses |
| Multi-destination routing | The packet carries a list of destinations; a router copies it per outgoing line, each copy taking only the addresses that line serves | Uses bandwidth more efficiently; the source still needs all destination addresses |
| Flooding | See [Flooding](#topic-3) | Simple, but many duplicates |
| Reverse path forwarding | See below | Efficient, and needs no destination list |
<!-- Sources: w6rt p.19; rev1 p.31; Apple Notes WEEK 7 Network3 -->

![Slide 20 - Broadcast routing example](assets/08-routing-algorithms/slide-20.png)

The red lines are the best paths from the source to destinations D1, D2, D3. With multi-destination routing the source sends one copy to A, A copies it to B and C, and B and C each deliver to the destinations they serve; the black lines are not on any best path and are not used.

### Reverse path forwarding

![Slide 21 - Reverse path forwarding](assets/08-routing-algorithms/slide-21.png)

When a router receives a broadcast packet, it checks whether the packet arrived on **the line it normally uses to send packets towards the broadcast source**:

- **Yes**: that line is very likely the best route and this packet very likely the first copy, so the router copies it and forwards it on all other lines;
- **No**: it is probably a duplicate, so it is discarded.
<!-- Sources: w6rt p.21 -->

**Illustrative example (our own)**: router R's best next hop towards source S is line 1. A broadcast packet first arrives on line 1, and R copies it to lines 2 and 3; a later copy that loops back on line 3 did not come from line 1 and is discarded. This blocks most of flooding's duplicates without keeping a list of packets already seen.

## Self-check

1. Rerun Dijkstra on the slide's graph with D as the sink. Which node joins P first after D, and what is A's final label?
2. Router X has neighbours Y (distance 3) and Z (distance 5). Y reports a distance of 7 to W and Z reports 4. What is X's new distance to W, and on which line?
3. If LSPs had no sequence number and two LSPs sent one after the other by the same router arrived in reverse order during flooding, what would happen?
4. In the slide's hierarchical routing example, how many extra hops does the hierarchical table cost 1A on the way to 5C? What does it gain in exchange?
