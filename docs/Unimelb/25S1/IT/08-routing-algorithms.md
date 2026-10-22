# COMP90007 Weeks 6–7 - Routing Algorithms

来源：`lecture/Week6-routing.pdf`（Network Layer (4)；Week 7 沿用 W6-L3）、`lecture/Week12-Review-handout.pdf` p.28–31（与讲义页重复，未另取截图）；Apple Notes：CS/25S1/IT — "WEEK 7 - Network3 - Routing algorithms"；CS/25S1/IT/Review — "Network Layer"。

这篇讲的是：**一台路由器收到分组后，怎样决定从哪条线路转发出去？这些决定所依据的路由表又是怎样算出来的？**

学习路线：[路由的基本概念](#topic-1) → [最短路径：Dijkstra](#topic-2) → [洪泛与距离向量](#topic-3) → [链路状态与分层路由](#topic-4) → [广播路由](#topic-5)。

重点：Dijkstra 手算表、距离向量更新、链路状态五步。难点：距离向量"用邻居的表算自己的表"。易错：距离向量是"全局信息局部共享"，链路状态是"局部信息全局共享"，两者常被说反。

<a id="topic-1"></a>
## 1. 路由的基本概念

### 路由在做什么

![Slide 03 - Routing as path discovery](assets/08-routing-algorithms/slide-03.png)

**路由（routing）** 是发现网络路径的过程：把网络看作由节点和链路组成的图；按跳数、时延等指标优化；拓扑变化（如路由器故障）时更新路由。图下方是各路由器的路由表，每行是"目的地 → 走哪条线路"。对比 A 的两张表：起初去 E、F 走 C，后来改走 B，这就是"路由会随网络变化而更新"。这张图的数据报细节在 [06 服务模型与网络互连](06-network-layer-internetworking.md) 讲过，这里只看路由表本身。

### 路由算法的分类

![Slide 04 - Routing algorithm definition and classes](assets/08-routing-algorithms/slide-04.png)

![Slide 05 - List of routing algorithms](assets/08-routing-algorithms/slide-05.png)

第一张给出定义：**路由算法（routing algorithm）** 决定一个到达的分组应从哪条输出线路转发，并把算法分成非自适应与自适应两类；第二张把本讲每个算法归到这两类下，再加上处理规模和一对多发送的两种做法。学生笔记从两个角度说同一件事：对分组而言是"去目的地的最合适路径"，对路由器而言是"转发该分组的最合适输出线路"。
<!-- Sources: w6rt p.3-4; Apple Notes WEEK 7 Network3 -->

| 类别 | 特点 | 算法 |
| --- | --- | --- |
| 非自适应（non-adaptive） | 静态路由，决策过程不随网络状况变化 | 最短路径路由、洪泛 |
| 自适应（adaptive） | 动态决策，随拓扑、流量等变化而调整 | 距离向量路由、链路状态路由 |
| 其他 | 处理规模与一对多发送 | 分层路由、广播路由 |
<!-- Sources: w6rt p.4-5; rev1 p.28 -->

### 最优化原理

![Slide 06 - Optimality principle](assets/08-routing-algorithms/slide-06.png)

**最优化原理（optimality principle）**：如果路由器 B 在从 A 到 C 的最优路径上，那么从 B 到 C 的最优路径也落在这条路线上。看图中的虚线 $r_3$ ：若 B 到 C 有比 $r_2$ 更好的路 $r_3$ ，那么 $r_1+r_3$ 就比原路 $r_1+r_2$ 更好，与"原路最优"矛盾。学生笔记的概括是：一条路线最优，则它的每一段子路径也最优。
<!-- Sources: w6rt p.6; Apple Notes WEEK 7 Network3 -->

### 汇集树

![Slide 07 - Sink tree](assets/08-routing-algorithms/slide-07.png)

由最优化原理可知，从所有源到同一目的地的最优路线合在一起，构成一棵以目的地为根的树，叫 **汇集树（sink tree）**。右图是左边网络中以 B 为根的汇集树：每个节点只保留一条通向 B 的最优边，所以没有环。路由算法的目标就是为每台路由器找到并使用这样的汇集树。
<!-- Sources: w6rt p.7; rev1 p.29 -->

<a id="topic-2"></a>
## 2. 最短路径：Dijkstra

### 最短路径路由

![Slide 08 - Shortest path routing](assets/08-routing-algorithms/slide-08.png)

**最短路径路由（shortest path routing）** 是非自适应算法：每条链路有一个非负权重（距离、时延等），最短路径就是总权重最小的路径；每条链路权重都取 1 时，求出的就是跳数最少的路径。做法是在图上算出汇集树。
<!-- Sources: w6rt p.8 -->

图中是后面例题用的网络，边上的数字是权重：A–B 2、A–G 6、B–C 7、B–E 2、E–G 1、E–F 2、F–C 3、F–H 2、G–H 4、C–D 3、H–D 2。

### 算法步骤

![Slide 09 - Dijkstra's algorithm steps](assets/08-routing-algorithms/slide-09.png)

讲义的四步对应下面的伪代码：集合 P 记录已加入汇集树的节点；每个节点有一个"到汇点的距离" $d$ ，初始为无穷；从汇点（距离 0）开始，反复把 P 外距离最小的节点加入 P，再更新它的邻居。

```text
P = {}                                  # 已加入汇集树的节点
for each node v: d[v] = ∞               # v 到汇点的距离
d[sink] = 0
while P does not contain all nodes:
    v = the node not in P with the smallest d[v]
    add v to P
    for each neighbour u of v (u not in P):
        d[u] = min(d[u], d[v] + w(v, u))
```
<!-- Sources: w6rt p.9 -->

### 手算表

![Slide 10 - Dijkstra first steps](assets/08-routing-algorithms/slide-10.png)

先看前三步：(a) 是原图；(b) A 加入 P 后，邻居 B、G 得到 (2, A)、(6, A)，括号写的是（距离, 前驱）；(c) B 距离最小被加入，它的邻居 C、E 得到 (9, B)、(4, B)。右边表格的每一行就是这样一步。

![Slide 11 - Dijkstra full trace](assets/08-routing-algorithms/slide-11.png)

完整的表如下。以 A 为汇点，每行表示加入一个节点后各节点到 A 的距离（"--" 表示已在 P 中，加粗的是本轮被选中的最小值）：

| n | B | C | D | E | F | G | H | 加入 | P |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ | A | {A} |
| 2 | **2** | ∞ | ∞ | ∞ | ∞ | 6 | ∞ | B | {A, B} |
| 3 | -- | 9 | ∞ | **4** | ∞ | 6 | ∞ | E | {A, B, E} |
| 4 | -- | 9 | ∞ | -- | 6 | **5** | ∞ | G | {A, B, E, G} |
| 5 | -- | 9 | ∞ | -- | **6** | -- | 9 | F | {A, B, E, G, F} |
| 6 | -- | 9 | ∞ | -- | -- | -- | **8** | H | {A, B, E, G, F, H} |
| 7 | -- | **9** | 10 | -- | -- | -- | -- | C | {A, B, E, G, F, H, C} |
| 8 | -- | -- | **10** | -- | -- | -- | -- | D | 全部 |
<!-- Sources: w6rt p.10-11; Apple Notes WEEK 7 Network3; Apple Notes Review Network Layer -->

对照图左侧的逐步图：红色边是已确定的汇集树边。注意第 4 行：加入 E 后，G 经 E 只要 $4+1=5$ ，比直接 A–G 的 6 更短，所以被更新为 (5, E)；H 第 5 行先经 G 得 9，第 6 行经 F 更新为 $6+2=8$ ，图中标为 (8, F)。
<!-- Sources: w6rt p.11 -->

**理解用例（自拟）**：读路径时沿前驱倒着走。D 的标签是 (10, H)，H 是 (8, F)，F 是 (6, E)，E 是 (4, B)，B 是 (2, A)，所以 D 到 A 的最短路径是 D–H–F–E–B–A，总长 $2+2+2+2+2=10$ 。

**易错**：每轮只把 **当前最小** 的那个节点加入 P；加入后只更新 **它的邻居**。已在 P 中的节点距离不再改变。

<a id="topic-3"></a>
## 3. 洪泛与距离向量

### 洪泛

![Slide 12 - Flooding](assets/08-routing-algorithms/slide-12.png)

**洪泛（flooding）** 是非自适应算法：每个到来的分组都从 **除来时线路以外** 的所有线路发出。它会产生大量重复分组，效率低，但极其健壮：只要存在一条路，分组就一定能到。**选择性洪泛（selective flooding）** 是改进版：只沿大致正确方向的链路发送。
<!-- Sources: w6rt p.12; Apple Notes WEEK 7 Network3 -->

### 距离向量路由

![Slide 13 - Distance vector routing](assets/08-routing-algorithms/slide-13.png)

**距离向量路由（distance vector routing）** 是动态算法：每台路由器维护一张表，记录到每个目的地的已知最佳距离和应走的线路；表通过与 **相邻** 路由器交换信息来更新。讲义的概括是 **全局信息、局部共享**。每台路由器：

1. 知道自己到各邻居的距离；
2. 把自己"到各目的地的最短已知距离"组成的向量发给所有邻居；
3. 根据收到的向量更新自己的向量；
4. 周期性重复，以反映网络变化。
<!-- Sources: w6rt p.13; rev1 p.30; Apple Notes WEEK 7 Network3 -->

![Slide 14 - Distance vector example](assets/08-routing-algorithms/slide-14.png)

路由器 J 有四个邻居，测得的时延为 $JA=8$ 、 $JI=10$ 、 $JH=12$ 、 $JK=6$ （图左下）。中间四列是 J 从 A、I、H、K 收到的向量，最右两列是 J 算出的新向量和对应线路。规则是：

$$
d_J(X)=\min_{N\in\{A,I,H,K\}}\bigl(JN+d_N(X)\bigr).
$$

以两个目的地为例：

| 目的地 | 经 A | 经 I | 经 H | 经 K | 新距离 / 线路 |
| --- | --- | --- | --- | --- | --- |
| G | $8+18=26$ | $10+31=41$ | $12+6=18$ | $6+31=37$ | 18 / H |
| C | $8+25=33$ | $10+18=28$ | $12+19=31$ | $6+36=42$ | 28 / I |
<!-- Sources: w6rt p.14 -->

**易错**：J 不使用自己旧表里的值；新向量完全由"到邻居的距离 + 邻居的向量"算出。

<a id="topic-4"></a>
## 4. 链路状态与分层路由

### 链路状态路由

![Slide 15 - Link state routing](assets/08-routing-algorithms/slide-15.png)

**链路状态路由（link state routing）** 也是动态算法，是距离向量的替代方案：距离向量在拓扑变化后收敛太慢。它在 Internet 上广泛使用，例如 OSPF（Open Shortest Path First），但比距离向量计算量大。讲义的概括是 **局部信息、全局共享（用洪泛）**。每台路由器：

1. 发现邻居，获知它们的网络地址；
2. 测量到每个邻居的距离（或时延、代价）；
3. 构造 **链路状态分组（link state packet，LSP）**；
4. 把这个分组发给 **所有其他路由器**；
5. 计算到其他每台路由器的最短路径，例如用 Dijkstra 算法。
<!-- Sources: w6rt p.15; rev1 p.30; Apple Notes WEEK 7 Network3 -->

![Slide 16 - Building link state packets](assets/08-routing-algorithms/slide-16.png)

每个节点的 LSP 列出：发送者、**序号（Seq.）**、**年龄（Age）**，以及每个邻居和到它的距离。看 A 的 LSP：邻居 B 距离 4、E 距离 5，与左边网络图一致。学生笔记写成：路由器 ID、序号、TTL、"邻居-代价"表（以及校验和）。

序号和年龄都是为洪泛准备的：同一路由器的多个版本 LSP 可能同时在网络里流动，接收方只保留序号最大的那份；年龄随时间递减，过期或残留的 LSP 最终会被丢弃。何时构造新的 LSP：按固定周期，或在发生重要事件（如链路断开）时。
<!-- Sources: w6rt p.16; Apple Notes WEEK 7 Network3; Apple Notes Review Network Layer -->

| | 距离向量 | 链路状态 |
| --- | --- | --- |
| 交换什么 | 自己到所有目的地的距离向量 | 自己到邻居的链路代价 |
| 发给谁 | 只发给邻居 | 洪泛给所有路由器 |
| 怎样算路由 | 由邻居的向量推出 | 每台路由器掌握全图，自己跑 Dijkstra |
| 特点 | 计算简单，拓扑变化后收敛慢 | 收敛快，计算量较大 |

### 分层路由

![Slide 17 - Hierarchical routing idea](assets/08-routing-algorithms/slide-17.png)

网络增大后，路由表变大，CPU 和内存需求随之上升。**分层路由（hierarchical routing）** 把路由器划分成 **区域（region）**：每台路由器了解本区域内的全部细节，却不知道其他区域内部的情况；连接两个区域的路由器充当交换点。
<!-- Sources: w6rt p.17; Apple Notes WEEK 7 Network3 -->

![Slide 18 - Full vs hierarchical table for 1A](assets/08-routing-algorithms/slide-18.png)

对比路由器 1A 的两张表：完整表要为全部 17 台路由器各占一行；分层表只为本区域的 1A、1B、1C 各占一行，其他区域每个区域一行，共 7 行。代价是路径可能稍长：分层表把去区域 5 的分组都交给 1C（按 5A 估计 4 跳），而完整表显示 5C 其实经 1B 只要 5 跳、经 1C 则更远。
<!-- Sources: w6rt p.18 -->

<a id="topic-5"></a>
## 5. 广播路由

### 几种广播方法

![Slide 19 - Broadcast routing methods](assets/08-routing-algorithms/slide-19.png)

**广播路由（broadcast routing）** 让一台主机把消息发给所有其他主机。讲义列出四种做法：

| 方法 | 做法 | 优缺点 |
| --- | --- | --- |
| 单独发送 | 给每个目的地单独发一个分组 | 低效；源需要知道所有目的地址 |
| 多目的地路由（multi-destination routing） | 分组带一组目的地址，路由器按输出线路复制，每份只带走那条线路负责的地址 | 更省带宽；源仍需知道所有目的地址 |
| 洪泛 | 见 [洪泛](#topic-3) | 简单但重复分组多 |
| 逆向路径转发（reverse path forwarding） | 见下文 | 高效，且不需要知道目的地列表 |
<!-- Sources: w6rt p.19; rev1 p.31; Apple Notes WEEK 7 Network3 -->

![Slide 20 - Broadcast routing example](assets/08-routing-algorithms/slide-20.png)

红线是从源出发到各目的地 D1、D2、D3 的最佳路径。多目的地路由时，源只发一份给 A，A 复制给 B 和 C，B 和 C 再各自送到自己负责的目的地；黑线不在最佳路径上，不用。

### 逆向路径转发

![Slide 21 - Reverse path forwarding](assets/08-routing-algorithms/slide-21.png)

路由器收到广播分组时，检查它是否从 **"平时自己发往广播源所用的那条线路"** 到达：

- **是**：这条线路很可能就是最佳路由，这个分组也很可能是第一份拷贝，于是复制并从所有其他线路转发；
- **否**：多半是重复分组，丢弃。
<!-- Sources: w6rt p.21 -->

**理解用例（自拟）**：路由器 R 到源 S 的最佳下一跳是线路 1。同一个广播分组先从线路 1 到达，R 复制并转发到线路 2、3；随后一份从线路 3 绕回来的拷贝不是从线路 1 来的，被丢弃。这样无需维护"已见分组"列表，就挡住了洪泛的大部分重复。

## 本讲自测

1. 在讲义的图中以 D 为汇点重新运行 Dijkstra，第一个加入 P 的节点（D 之后）是谁？A 最终的标签是什么？
2. 路由器 X 有邻居 Y（距离 3）和 Z（距离 5）。Y 报告到 W 的距离为 7，Z 报告为 4。X 到 W 的新距离和线路是什么？
3. 如果 LSP 没有序号，一台路由器先后发出的两份 LSP 在洪泛中顺序颠倒到达，会发生什么？
4. 在讲义的分层路由例子中，1A 去 5C 时分层表比完整表多走几跳？换来的好处是什么？
