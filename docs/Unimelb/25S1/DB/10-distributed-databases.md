# INFO90002 Weeks 8–9 - Distributed Databases

来源：`lecture/INFO90002_Week8-2_DistributedDBs.pdf`；Apple Notes：CS/25S1/DB — "FE - Distributed DBs"。

这篇讲的是：**一个逻辑上的数据库被放到多个地点的多台计算机上，会带来哪些好处和麻烦？数据该复制还是分区，更新该同步还是异步？**

学习路线：[分布式数据库是什么](#topic-1) → [优点与缺点](#topic-2) → [目标与权衡](#topic-3) → [复制与分区](#topic-4) → [CAP 定理与五种配置](#topic-5)。

重点：复制、水平分区、垂直分区各自的优缺点；同步与异步更新。难点：网络分区时一致性与可用性只能二选一。易错：分布式数据库对用户看起来是 **一个** 数据库，去中心化数据库则是多个。

<a id="topic-1"></a>
## 1. 分布式数据库是什么

![Slide 03 - Distributed vs decentralized definitions](assets/10-distributed-databases/slide-03.png)

先看右上的图：User Mary 在 Site 1，User Tom 在 Site 2，两人通过通信网络访问紫色框里的“单一逻辑数据库”，它其实由放在两地的片段 A1、A2 组成。右下两张小图对比两种结构：左边四个地点的数据库通过计算机网络连成一个整体；右边四个地点互不相连。

| | 分布式数据库（distributed） | 去中心化数据库（decentralized） |
| --- | --- | --- |
| 定义 | 一个逻辑数据库，物理上分布在多个地点、由通信链路连接的多台计算机上 | 一组相互独立、没有联网成一个逻辑数据库的数据库 |
| 用户看到 | 一个数据库 | 多个数据库 |
<!-- Sources: W8-2 p.3 -->

本课关注的是分布式数据库。例如 AWS 在全球多个数据中心提供多种数据库，每个数据中心内又有多个“可用区”提供冗余和可用性。
<!-- Sources: W8-2 p.3-4 -->

![Slide 06 - Distributed memory structures](assets/10-distributed-databases/slide-06.png)

伦敦、纽约、悉尼三台服务器各画了一套 [09](09-dbms-architecture-administration.md#topic-2) 中的内存结构，下面红框里的 **集群管理器（cluster manager）** 把它们连起来。每台物理服务器常常既访问自己的存储，也访问所有服务器共享的存储；集群管理器协调各服务器之间的通信，包括查询处理、多处并发控制、存储和崩溃恢复（页脚说明：不同厂商叫法不同）。
<!-- Sources: W8-2 p.5-6 -->

<a id="topic-2"></a>
## 2. 优点与缺点

![Slide 07 - Distributed DBMS advantages](assets/10-distributed-databases/slide-07.png)

两幅小图值得看：上面四个蓝块是 ESPN 体育比分，各自放在需求最大的城市（AFL 在墨尔本、英超 EPL 在伦敦、NFL 在纽约、Hurling 在都柏林）；下面左边 1 台服务器扛 33,000 名并发用户，右边 4 台服务器分摊成 9,000 + 12,000 + 7,000 + 5,000。

![Slide 08 - Distributed DBMS advantages continued](assets/10-distributed-databases/slide-08.png)

续页的三幅图分别是：一排服务器可以继续往右加（模块化扩展）；中间一台打红叉，其余还在（单点故障风险降低）；箭头把数据和日志复制到别的服务器（支持恢复）。

| 优点 | 说明 |
| --- | --- |
| 适合地理上分散的组织和用户 | 利用互联网；数据放在需求最大的地点附近，例如墨尔本的 AFL 比分、伦敦的英超比分 |
| 本地数据访问更快、处理更快 | 工作负载分摊到各服务器，例如 33,000 名并发用户分到 4 台服务器 |
| 模块化扩展 | 负载增加时加服务器 |
| 可靠性和可用性更高 | 降低单点故障（SPOF）的风险 |
| 支持恢复 | 数据和恢复日志可以复制到多个地点 |
<!-- Sources: W8-2 p.7-8; Apple Notes FE - Distributed DBs -->

缺点都是“多了地点”带来的代价：

| 缺点 | 说明 |
| --- | --- |
| 管理和控制复杂 | 数据库或应用要把各地数据拼起来：哪一版是最新的、在哪里、谁在等着更新它 |
| 数据完整性 | 两地同时更新同一记录时谁“赢”？需要事务管理器或主从设计 |
| 安全 | 站点越多，被攻破的可能越大；网络和存储设施都要防网络与物理攻击 |
| 缺乏标准 | 各厂商协议不同，互操作和迁移困难 |
| 培训和维护成本上升 | 磁盘、内外网络、集群软件、网络速度都更贵 |
<!-- Sources: W8-2 p.9-10; Apple Notes FE - Distributed DBs -->

<a id="topic-3"></a>
## 3. 目标与权衡

### 两个目标

- **位置透明（location transparency）**：用户或程序不需要知道数据存在哪里；请求自动转发到相关站点；所有数据看起来像存在一个地点的一个逻辑数据库，一条查询可以连接多个站点的表；
- **本地自治（local autonomy）**：与网络断开时，本地节点仍能为本地用户工作——控制本地数据、管理安全、记录事务、从本地故障中恢复、提供对本地数据的完全访问。
<!-- Sources: W8-2 p.11-13; Apple Notes FE - Distributed DBs -->

![Slide 12 - Location transparency query](assets/10-distributed-databases/slide-12.png)

页底的查询把 `results` 和 `codes` 连接起来，筛选 NFL、Hurling、EPL 三种比赛；三支箭头说明这些行其实分别在伦敦、纽约、都柏林。写查询的人完全不需要写出这些地点——这就是位置透明。

### 同步与异步更新

| | 同步（synchronous） | 异步（asynchronous） |
| --- | --- | --- |
| 做法 | 等所有相关节点都更新完，才向请求者确认；任何副本更新失败则整个更新中止 | 写到主节点后就确认，其他节点稍后（按批次、按预定间隔）同步 |
| 优点 | 数据一直最新，任何地方查询答案相同；保证完整性，不必追踪最新副本在哪 | 响应时间可接受 |
| 缺点 | 响应慢、网络占用高；提交的记录必须在所有服务器上完全一致 | 允许暂时不一致；规划和设计更复杂 |
| 侧重 | 一致性优先 | 可用性优先 |
<!-- Sources: W8-2 p.14, p.24-25; Apple Notes FE - Distributed DBs -->

**理解：** 一致性要求越强，可用性越低。金融交易系统通常选同步，社交媒体的评论可以接受异步。
<!-- Sources: W8-2 p.14, p.25 -->

<a id="topic-4"></a>
## 4. 复制与分区

![Slide 16 - Distribution options](assets/10-distributed-databases/slide-16.png)

右边两个地球分别表示“分区”（每个地点只放一部分数据）和“复制”（每个地点都放一份完整副本）。三种基本方式可以组合（混合）：例如用户表按水平分区，查找表（lookup table）则复制到各地。
<!-- Sources: W8-2 p.16 -->

### 水平分区

![Slide 18 - Example horizontal partitioning](assets/10-distributed-databases/slide-18.png)

上方是完整的球队表，按 `Region` 列切开：Europe 的两行（Arsenal、Racing92）放伦敦，APAC 的两行（Carlton FC、Swifts）放墨尔本，Americas 的两行（Jets、Yankees）放纽约。每个圆柱里的行都是 **完整的行**，只是行数少了；需要全球列表时，把三处用 `UNION` 拼回来。

### 垂直分区

![Slide 19 - Vertical partitioning](assets/10-distributed-databases/slide-19.png)

这次切的是列：上方球员表外面画了三个彩色框。橙框（ID、名、姓、简介）放曼彻斯特，蓝框（ID、名、姓、球队、联赛）放都柏林，深蓝框（ID、照片、简介）放伦敦。注意三处都保留了 `ID` 列，而且同一列（如姓名、简介）可以出现在多处。

![Slide 20 - Vertical partitioning needs the primary key](assets/10-distributed-databases/slide-20.png)

左下的注释是本页重点。

**易错：** 垂直分区时，把照片和简介移到另一台服务器，那边也必须有球员 ID（作为 PFK），否则无法把两部分对回同一个球员。
<!-- Sources: W8-2 p.20 -->

| | 水平分区（horizontal） | 垂直分区（vertical） |
| --- | --- | --- |
| 拆什么 | 表的不同 **行** 放在不同站点 | 表的不同 **列** 放在不同站点 |
| 例子 | 球队表按地区分：欧洲球队在伦敦，亚太球队在墨尔本，美洲球队在纽约 | 球员表：照片和简介放在一处，球队和联赛信息放在另一处 |
| 合并数据 | 用 `UNION` | 用连接（JOIN），更麻烦；每一部分都必须带主键 |
| 适合 | 选取整行的查询 | 只看某些列的聚合查询 |
<!-- Sources: W8-2 p.17-20; Apple Notes FE - Distributed DBs -->

两种分区的优缺点相同：
<!-- Sources: W8-2 p.17, p.20 -->

| 优点 | 缺点 |
| --- | --- |
| 数据放在使用它的地方附近（效率） | 跨分区访问数据时速度不一致 |
| 本地访问优化（性能更好） | 没有复制：备份脆弱，存在单点故障 |
| 本地只存相关数据（安全） | |
| 跨分区可以合并查询（易于查询） | |
<!-- Sources: W8-2 p.17; Apple Notes FE - Distributed DBs -->

### 复制

![Slide 21 - Replication advantages](assets/10-distributed-databases/slide-21.png)

![Slide 22 - Replication needs more storage](assets/10-distributed-databases/slide-22.png)

第一页列出优点，右边地球上每个地点都有一整套 A–F。第二页用图量化最直观的缺点：左边集中式数据库只存 1 份数据；中间分布在墨尔本、伦敦、纽约、都柏林 4 台服务器上，就是 4 份；最右的竖条表示总数据量随之变成 4 倍。

| 优点 | 缺点 |
| --- | --- |
| 有冗余副本，可靠性高 | 需要更多存储：每台服务器都存一份 |
| 在访问最多的地点就地访问，速度快 | 更新还没到达时可能读到不正确（过时）的数据 |
| 副本按计划刷新，可避免复杂的分布式完整性检查 | 更新需要时间，必须容忍过时数据；更新会加重繁忙节点负担 |
| 节点解耦：部分节点宕机，事务仍可继续 | 更新给网络带来很大负担，高速网络很贵 |
| 如果更新可以延后，高峰时段网络流量更少 | |
<!-- Sources: W8-2 p.21-23; Apple Notes FE - Distributed DBs -->

复制是目前全球系统实现高可用的流行做法，大多数 SQL 和 NoSQL 数据库都支持；大公司还使用内容分发网络（CDN），把内容复制到大量计算机上。
<!-- Sources: W8-2 p.21 -->

<a id="topic-5"></a>
## 5. CAP 定理与五种配置

### CAP 定理

![Slide 26 - CAP theorem](assets/10-distributed-databases/slide-26.png)

三个圆分别是一致性（Consistency：所有客户端看到同样的数据，即使刚刚更新或删除）、可用性（Availability：即使有节点故障，每个客户端都能找到一个副本）、分区容忍（Partition tolerance：部分网络故障时系统仍按预期工作）。两两相交处标着 CA、CP、AP，三圆正中的红叉表示三者不能同时得到。CAP 定理说：分布式系统最多得到两个；**发生网络分区时，系统必须在一致性和可用性之间选择。**
<!-- Sources: W8-2 p.26; Apple Notes FE - Distributed DBs -->

![Slide 27 - Distributed DBMS architecture](assets/10-distributed-databases/slide-27.png)

教材的体系结构图：每个站点（site 1 … site n）都有自己的本地 DBMS 和数据库，上面一层是分布式 DBMS 和分布式数据仓库（存放目录信息），站点之间通过通信控制器（communications controller）相连。用户终端只和本站点打交道，跨站点的请求由分布式 DBMS 转发。

![Slide 28 - Network partition](assets/10-distributed-databases/slide-28.png)

设想一个同步更新的复制数据库，两个数据中心之间的复制链路断了（中间的折线）。只有两种选择：停掉系统以避免不一致（选一致性），或者继续对用户开放并接受不一致（选可用性）。
<!-- Sources: W8-2 p.28 -->

### 分布式目录

分布式目录管理（distributed catalog management）管理关于分布在多个节点上的数据对象的元数据：位置、结构、访问权限等。目录本身也是数据库，需要存储方案，常见三种：集中式目录、完全复制的目录、部分复制的目录。
<!-- Sources: W8-2 p.29 -->

### 五种配置

| 配置 | 描述 |
| --- | --- |
| 集中式数据库，分布式访问 | 数据库在一个地点，各地访问 |
| 复制 + 定期（异步）快照更新 | 多个地点，各副本定期更新 |
| 复制 + 近实时同步更新 | 多个地点，各副本近实时更新 |
| 分区、集成、一个逻辑数据库 | 数据分区到多个站点，在一个逻辑数据库和一个 DBMS 之内 |
| 分区、独立、不集成的分段 | 数据分区到多个站点，各段独立，多个 DBMS、多台计算机 |
<!-- Sources: W8-2 p.30; Apple Notes FE - Distributed DBs -->

**补充：** 学生复习测验中涉及的几条比较：集中式最容易管理，但扩展性差；同步复制的可靠性最好；分区且集成的配置数据一致性很差；独立分区的通信开销最低。这些评价来自课件引用的教材（Hoffer 等）的配置对比。
<!-- Sources: Apple Notes Double Check; W8-2 p.2 -->

### 分布式 DBMS 要做的事

- 用分布式目录（元数据）定位数据；
- 决定从哪里取数据、在哪里处理查询的各部分；
- 在使用不同本地 DBMS 的节点之间翻译（借助中间件）；
- 用多阶段提交协议保证数据一致；
- 全局主键控制；
- 可扩展性；
- 安全、并发、查询优化、故障恢复。
<!-- Sources: W8-2 p.31 -->

## 本讲自测

1. 一家跨国零售商在悉尼、伦敦、纽约各有门店，每地只查本地库存，但总部要汇总全球销售。库存表适合哪种分区？汇总时用 `UNION` 还是 `JOIN`？
2. 产品目录很少修改、各地频繁读取。适合复制还是分区？更新用同步还是异步？
3. 网上银行余额要求任何时刻全球一致。发生网络分区时它应该选 CP 还是 AP？代价是什么？
4. 把员工表垂直拆成“基本信息”和“薪资”两部分放在两地。查询“每个部门的平均工资和员工姓名”时需要做什么，拆分时要注意什么？
