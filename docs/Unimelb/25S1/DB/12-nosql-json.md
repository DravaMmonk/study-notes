# INFO90002 Week 10 - NoSQL Databases and JSON

来源：`lecture/INFO90002_Week10-1_JSON_NoSQL.pdf`；`tutorial/Week11_Tute_NoSQLBooster.pdf`、`tutorial/Week11_Tute_NoSQLBooster_SOLUTIONS.pdf`；Apple Notes：CS/25S1/DB — "FE - JSON NoSQL"。

这篇讲的是：**关系数据库在什么情况下不够用？非关系（NoSQL）数据库有哪几类，各自怎样存数据？JSON 文档和关系表有什么不同？**

学习路线：[为什么需要 NoSQL](#topic-1) → [四类 NoSQL 数据库](#topic-2) → [ACID 与 BASE](#topic-3) → [JSON 与文档数据库](#topic-4)。

重点：写时模式与读时模式；ACID 与 BASE；四类 NoSQL 各适合什么数据。难点：文档数据库何时内嵌子文档、何时拆成独立文档。易错：NoSQL 不等于“不用 SQL”，而是“非关系”。

<a id="topic-1"></a>
## 1. 为什么需要 NoSQL

### 关系数据库的长处与短板

关系数据库中每张表有模式，每列有预定义的大小和类型，每行必须符合表设计；表之间用外键关联，消除重复——一条信息理想上只存一次，改一次就够；可以用 SQL 检索。但它 **不擅长“大数据”**，也 **不擅长分布式（尤其是分区）数据库**。
<!-- Sources: W10-1 p.2 -->

### 大数据的三个 V

![Slide 03 - Big data: volume, variety, velocity](assets/12-nosql-json/slide-03.png)

页上三个蓝色大写词就是三个 V：

| V | 含义 |
| --- | --- |
| 量（Volume） | 数据量远大于传统关系数据库 |
| 多样（Variety） | 数据类型和格式多种多样 |
| 速度（Velocity） | 数据到来极快，例如移动传感器、点击流 |
<!-- Sources: W10-1 p.3; Apple Notes FE - JSON NoSQL -->

最后两行要一起读：NoSQL 的兴起来自关系数据库的这些短处，但关系 DBMS 不会消失。
<!-- Sources: W10-1 p.3 -->

### 写时模式与读时模式

| | 写时模式（schema on write） | 读时模式（schema on read） |
| --- | --- | --- |
| 何时定结构 | 先有数据模型，数据写入时必须符合（关系数据库，见 [03](03-logical-physical-design.md#topic-2)） | 先把数据捕获存下来，之后按使用方式决定模型（XML、JSON） |
| 代表 | SQL / 关系数据库 | NoSQL |
<!-- Sources: W10-1 p.4; W3-1 p.22; Apple Notes FE - JSON NoSQL -->

### 分布式数据的问题

分布式、特别是分区的数据库，和外键、事务等关系特性不太合拍：外键引用的数据可能存在远程地点，网络延迟会造成资源瓶颈（分区方式见 [10](10-distributed-databases.md#topic-4)）。
<!-- Sources: W10-1 p.5 -->

<a id="topic-2"></a>
## 2. 四类 NoSQL 数据库

NoSQL 数据库就是非关系数据库。课件按顺序介绍四类：键值、列族、图、文档。
<!-- Sources: W10-1 p.6, p.34 -->

### 键值存储

![Slide 07 - Key-value store](assets/12-nosql-json/slide-07.png)

右上的表只有两列：`Key`（K1…K5）和 `Value`。注意值的形状各不相同——有的是逗号分隔的串，有的混着日期和数字。**键 = 主键；值 = 任何东西**（数字、数组、图片、JSON）；没有查询语言，由应用解释值的含义。典型用途是登录会话数据和购物车；主要优点是可扩展、易于分布到多台机器。例子：Redis、Riak、Memcached、Berkeley DB。

### 列族（宽列）

![Slide 08 - Column family](assets/12-nosql-json/slide-08.png)

右边 `AuthorProfile` 列族里三行：Mahesh 有性别、专长、排名三列，David 有性别和书，Allen 有城市、书、排名。**每行的列各不相同**，每个列是“名称/值”对并带时间戳，属于自己那一行，而不是像关系表那样横跨所有行。列族数据按列存储在磁盘上，按列分析更快，不适合 OLTP。例子：Cassandra、BigTable、HBase、DynamoDB。
<!-- Sources: W10-1 p.8-9 -->

### 聚合导向数据库

![Slide 10 - Aggregate-oriented databases](assets/12-nosql-json/slide-10.png)

键值、文档、列族三类在 Fowler 的术语中叫 **聚合导向（aggregate-oriented）** 数据库：整块相关数据存在一起（右上图里一张订单连同明细、付款、地址放在同一块），较少需要事务，易于在集群和分布式环境中存储；缺点是难以跨聚合的子字段做分析——右下那种“按产品统计收入”的表，需要把每个订单块拆开才能算出来。
<!-- Sources: W10-1 p.10; Apple Notes FE - JSON NoSQL -->

### 图数据库

![Slide 12 - Graph database](assets/12-nosql-json/slide-12.png)

图（graph）由节点和边组成：节点表示实体，边表示联系，二者都可有属性和类型；相连节点在库中直接“指向”彼此。右下的表是本页的论据：查找“朋友的朋友”，深度 2 时关系数据库和 Neo4j 都很快；深度 4 时关系数据库要一千五百多秒，Neo4j 约 1.4 秒；深度 5 时关系数据库没有算完。典型用途：社交网络中谁和谁交流、道路网络、联网设备、地理空间数据。例子：Neo4j、OrientDB、FlockDB。

![Slide 13 - Neo4j example graph](assets/12-nosql-json/slide-13.png)

这张 Neo4j 示例图里，圆圈是带标签的节点（Movie、Actor、Director、User、Genre），箭头是联系（ACTED_IN、IN_GENRE、DIRECTED、RATED），方框是属性。注意 `RATED` 这条边自己也有属性：评分和时间戳。

![Slide 14 - Neo4j Cypher query](assets/12-nosql-json/slide-14.png)

Neo4j 用 Cypher 语言查询图模式。页上左列是每一步的作用，中列是语句，右列是解释：找出“用户—评分→电影”的路径，只留片名含 Matrix 的，按电影统计评分次数，返回电影和次数，按次数降序取前 5：
<!-- Sources: W10-1 p.13-14 -->

```text
MATCH (m:Movie)<-[:RATED]-(u:User)
WHERE m.title CONTAINS "Matrix"
WITH m.title AS movie, COUNT(*) AS reviews
RETURN movie, reviews
ORDER BY reviews DESC
LIMIT 5;
```
<!-- Sources: W10-1 p.14 -->

### 文档数据库

![Slide 15 - Document database](assets/12-nosql-json/slide-15.png)

文档数据库类似键值存储，但“值”（文档，即用 JSON 表示的对象）能被 DBMS 查看、查询和更新。右边青色框顶部写着 `<Key=CustomerID>`，下面整段 JSON 就是值：顾客姓名、公司、爱好数组、账单地址对象。**这里的“文档”不是 Word 或 PDF 文件。** 适合内容、用户资料等半结构化数据。例子：MongoDB、CouchDB、RavenDB。
<!-- Sources: W10-1 p.6-15; Apple Notes FE - JSON NoSQL -->

#### 理解用例：选哪类 NoSQL（改写自 Tut W11）

| 图书馆的需求 | 合适的类型 | 理由 |
| --- | --- | --- |
| 编目字段除了作者、书名、出版社外，编目员可以任意加字段 | 列族 | 每行可以有不同的列 |
| 每条编目记录是一份完整的行业标准格式（MARC）文本 | 文档 | 一条记录是一份结构化文档 |
| 保存封面：JPEG、PNG、PDF 或 URL | 键值 | 值可以是任何类型，图片不是文档那样的结构化数据 |
| 追踪论文之间的相互引用 | 图 | 论文为节点、引用为边，擅长关系查询 |
<!-- Sources: Tut W11 Sol p.5-6 -->

<a id="topic-3"></a>
## 3. ACID 与 BASE

![Slide 17 - ACID vs BASE](assets/12-nosql-json/slide-17.png)

| 关系数据库：ACID | NoSQL：BASE |
| --- | --- |
| 原子性、一致性、隔离性、持久性（见 [08](08-transactions-concurrency.md#topic-1)） | 基本可用（Basically Available）、软状态（Soft state）、最终一致（Eventual consistency） |
| 一致性优先于可用性 | 可用性优先于一致性 |
<!-- Sources: W10-1 p.17; Apple Notes FE - JSON NoSQL -->

页上三段粗体依次定义 BASE 的三个字母：

- **基本可用**：系统保证数据可用，任何请求都有响应，但数据可能处于不一致或变化中的状态；
- **软状态**：即使没有新的输入，系统状态也可能随时间变化，因为“最终一致”还在进行；
- **最终一致**：系统停止接收输入后最终会变得一致；数据迟早会传播到所有该去的地方，但系统不会在处理下一个事务前检查每个事务的一致性。
<!-- Sources: W10-1 p.17 -->

**对比：** 关系数据库通常只有一份数据，并强制强一致——更新后每个用户立刻看到新值，没人应该看到过时的银行余额。文档数据库常常有多个副本以应对大量查询，修改会传播到各副本（例如客户地址改了，存有该地址的多个文档和多个副本逐步更新），数据最终都会更新。问题是：大家是否必须立刻看到最新的一条评论？这和 [10](10-distributed-databases.md#topic-5) 的 CAP 取舍是同一个问题。
<!-- Sources: W10-1 p.18 -->

<a id="topic-4"></a>
## 4. JSON 与文档数据库

### JSON 语法

JSON（JavaScript Object Notation，读作 Jason）表示一个对象及其属性：对象由一组“属性—值”对组成，值可以是数组或其他对象，所以形成 **树形结构**。它最初用于计算机之间传输数据，现在是文档数据库的存储格式。它 **不是规范化的，连 1NF 都不满足**：一个属性里可以放数组或嵌套对象，也就是一格多值。
<!-- Sources: W10-1 p.21; Apple Notes FE - JSON NoSQL -->

![Slide 22 - What is JSON](assets/12-nosql-json/slide-22.png)

左边的例子 `my_it_skills` 是一个对象，里面的 `programming` 和 `database` 各是一个数组，数组元素又是带 `name`、`yearstarted` 的对象。右边红字是语法规则：

- 花括号 `{ }` 是容器（对象）；
- 方括号 `[ ]` 装数组，元素用逗号分隔；
- 名称和值用冒号分隔；值（有时也包括名称）放在双引号中；
- “名称—值”“键—值”“属性—值”是同一个意思（右上蓝字）；
- 人类可读，有层次（值里可以再嵌值）。
<!-- Sources: W10-1 p.22 -->

#### 理解用例（自拟）：一位顾客的文档

```json
{
  "_id": "C2045",
  "name": { "first": "Fred", "last": "Smith" },
  "phones": ["0400 111 222", "03 9000 1234"],
  "orders": [
    { "orderNo": 3224, "items": [ { "code": "P1", "qty": 2 }, { "code": "P3", "qty": 1 } ] }
  ]
}
```

这一份文档里有嵌套对象（`name`）、数组（`phones`）和对象数组（`orders`，每张订单又有 `items` 数组）。在关系数据库中，同样的信息要拆成顾客、电话、订单、订单明细四张表（对照 [04](04-normalisation.md#topic-3)）。

### 文档与关系表的对照

课件用同一张橙色对照表逐页加行（Leonard Lobel 的图），每页多一组对比：

| 关系数据库 | 文档数据库 |
| --- | --- |
| 数据存在行中：3 个顾客 3 行 | 数据存在文档中：3 个顾客 3 份文档（也可以灵活安排） |
| 每行由多个列组成 | 每份文档由多个属性组成 |
| 每行必须符合模式（强类型） | **无模式**：每份文档可以用任意属性，但每份都必须有 ID 属性 |
| 按需建索引 | 文档加入时 **每个属性都自动建索引**，任何数据都能很快检索 |
| 高度规范化，用外键关联，查询时要连接，有性能开销 | 通常去规范化：相关数据存在同一份文档里，查询简单、少连接、快 |
| 消除冗余 | 文档包含冗余数据，例如同一产品的描述在许多文档中重复 |
<!-- Sources: W10-1 p.24-29; Apple Notes FE - JSON NoSQL -->

![Slide 26 - Documents are schema free](assets/12-nosql-json/slide-26.png)

左下的关系表三行列完全一样；右边三份文档里，Document 1 用 `name`，Document 2 用 `fullName`，Document 3 的 `fullName` 又是一个带 `first`、`last` 的对象。三份都能存进同一个集合，唯一共同的要求是有 `id`。

![Slide 28 - Normalised vs denormalised](assets/12-nosql-json/slide-28.png)

左下是关系方式：`User` 表和 `Holdings` 表用 `UserID` 关联；右下是文档方式：用户 John Smith 的持仓（holdings）直接作为数组放进他的文档里。查询这位用户及其持仓时，文档方式一次读取，关系方式要连接两张表。
<!-- Sources: W10-1 p.28 -->

![Slide 29 - Redundant data in documents](assets/12-nosql-json/slide-29.png)

去规范化的代价在底部三份订单文档里：产品 “BC” 的描述 “Black chair” 在 John Smith 和 Adam Stark 的订单里各写了一遍。关系数据库会把描述只存在产品表里。

### 父子关系：内嵌还是拆开

![Slide 30 - Parent and child in one document](assets/12-nosql-json/slide-30.png)

左边的帖子文档把评论（1:M 的“子”）直接内嵌，评论数有上限时这样合理；右边那份带着第 1,598,873 条评论的文档打了红叉——**子数量可能无限时，不宜全部塞进一份文档**。
<!-- Sources: W10-1 p.30 -->

![Slide 31 - Comments as separate documents](assets/12-nosql-json/slide-31.png)

![Slide 32 - One hundred comments per document](assets/12-nosql-json/slide-32.png)

第一页把每条评论拆成独立文档，各自带 `postid` 指回帖子，相当于文档之间的 1:M；第二页是折中：帖子文档自带前 100 条评论，后面的评论每 100 条一份文档（#301–#400 一份）。

| 方案 | 做法 | 适合 |
| --- | --- | --- |
| 内嵌 | 父文档里放子数组 | 子的数量有上限 |
| 规范化的文档 | 每条评论是一份独立文档，引用帖子 ID，形成文档间的 1:M | 子很多或无上限 |
| 混合 | 每份文档存一批（例如 100 条）评论 | 兼顾读取效率和文档大小 |
<!-- Sources: W10-1 p.30-32; Apple Notes FE - JSON NoSQL -->

### 操作文档数据库

文档数据库中的数据也用 JSON 来操作。例如 MongoDB 中 `db.<collection>.find()` 相当于 `SELECT … FROM <table>`，把 `<collection>` 换成集合名。有 Compass、Studio 3T、NoSQLBooster 等“浏览器”工具，其中一些能把 SQL 翻译成 JSON 查询。
<!-- Sources: W10-1 p.34 -->

教程中用 NoSQLBooster 浏览 MongoDB 示例数据，可以注意到：

- 选中一个集合时，工具默认给出 `SELECT * FROM <集合名>` 形式的查询，点开“Query Code”能看到对应的 `db.companies.aggregate…` 写法；
- 树形视图里，文档在最上层，属性按层级展开，所以叫“树”；`acquisitions` 这类属性是数组；
- 比较运算符写成 `$gt`（大于）这样的形式；把 `find` 换成 `count` 可以直接计数；
- 双引号用于对象（字段）名，单引号用于字符串；
- 给一份餐厅文档增加“招牌菜”信息，就是插入一个嵌套对象，里面再带一个饮食标签数组。
<!-- Sources: Tut W11 Sol p.1-5 -->

**补充：NoSQL 的四个优势（教程总结）**：灵活建模（不依赖固定模式，适合结构松散的数据）；可扩展（加便宜的服务器横向扩展）；性能（就近路由用户到数据中心）；高可用（数据分布在多个实例上，节点故障时自动切换）。
<!-- Sources: Tut W11 Sol p.8-9 -->

## 本讲自测

1. 为什么说 JSON 文档“连 1NF 都不满足”？举出上面顾客文档中违反 1NF 的属性。
2. 一个物联网平台每秒收到数万条格式各异的传感器读数，以后才决定怎么分析。写时模式还是读时模式更合适？
3. 博客系统中每篇文章的评论可能有几十万条。评论应内嵌在文章文档里，还是拆成独立文档？
4. 一个社交应用发帖后，有的好友几秒后才看到。这体现了 BASE 中的哪一条？为什么银行转账不能这样？
