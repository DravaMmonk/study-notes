# INFO90002 Week 1 - Introduction to Databases

来源：`lecture/INFO90002_Week1-1_AdminIntro.pdf`、`lecture/INFO90002_Week1-2_DatabasesIntro.pdf`；`tutorial/Week1_TuteDemo_MySQLinstallation_LMS.pdf`；Apple Notes：CS/25S1/DB — "WEEK 1"。

这篇讲的是：**为什么要用数据库管理系统来存数据，关系数据库长什么样，一个数据库从设计到上线要经过哪些阶段？**

学习路线：[数据与数据的形态](#topic-1) → [为什么需要 DBMS](#topic-2) → [客户端-服务器与 MySQL](#topic-3) → [关系模型与 Pizza Online 案例](#topic-4) → [SQL 的四类语言与开发生命周期](#topic-5)。

重点：DBMS 相对平面文件的优势、关系表的基本规则。难点：数据库（database）与 DBMS 的区别、两种数据独立性。易错：概念设计、逻辑设计、物理设计三个阶段的分工。

截图编号是 PDF 页码。W1-1 主要是课程安排，只选了其中一页讲课内容；Tutorial 1 是 MySQL 安装演示，正文只摘要点，不放截图。

<a id="topic-1"></a>
## 1. 数据、信息与数据的形态

### 数据库就在日常生活里

![W1-1 slide 05 - A day in Susan's life with databases](assets/01-introduction/slide-w11-05.png)

从左往右看五个场景：超市购物、药房取药、网上购物、晚上订机票和酒店、睡前看社交媒体。每张小图下面的问题都在问“这些数据存在哪里、谁来更新”，最底下的圆柱就是背后的数据库，里面写着它存的东西，例如 Products / Sales / Customers、Flights / Hotels、Users / Friends / Posts。

要带走的一点是：一个普通人一天就会和好几个数据库打交道，每个数据库记录的都是“产品、销售、顾客”这类有固定格式的事实。

### 数据和信息

![W1-2 slide 04 - Software and data](assets/01-introduction/slide-w12-04.png)

右边的书名 *Algorithms + Data Structures = Programs* 代表以前的课程关心“怎么计算”；左边最后两行点出这门课的转向：关注 **数据本身**。

计算机系统由处理数据的软件组成；这门课把注意力从“怎么计算”转到“数据本身”。数据（data）经过处理后才成为信息（information），例如一张订单表是数据，“本月哪家店卖得最多”是信息。
<!-- Sources: W1-2 p.4 -->

### 结构化、半结构化与非结构化

![W1-2 slide 07 - Unstructured data](assets/01-introduction/slide-w12-07.png)

![W1-2 slide 08 - Semi-structured data](assets/01-introduction/slide-w12-08.png)

![W1-2 slide 09 - Structured data](assets/01-introduction/slide-w12-09.png)

三张图按“组织程度”从低到高排列：

- **第 7 页，非结构化数据（unstructured data）**：没有预先定义的组织方式，格式和内容事先都不知道。社交媒体帖子、电子邮件就是例子，一条内容里可能夹着文字、音频、视频、链接、图片。页面最后一句是问题本身：这样的数据怎样存，才能再找出来、汇总、分析？
- **第 8 页，半结构化数据（semi-structured data）**：有一定组织、便于分析，但达不到关系数据库的要求，例如 XML 文档和 NoSQL 数据库。
- **第 9 页，结构化数据（structured data）**：每条记录都按同一格式、同一数据类型存储。看下半页大学存学生的例子：学号是数字，姓名是字母，出生日期是日期——每个学生不同，存储格式却完全一样。
<!-- Sources: W1-2 p.5-9; Apple Notes WEEK 1 -->

**易错：** PDF 第 6 页把电子表格标成“semi-structured?”，带问号。电子表格有行有列，但同一列里可以随手混写数字、文字和备注，不强制类型，所以它不等于关系表。

关系数据库管理系统（Relational DBMS, RDBMS）处理的是结构化数据，例如 Access、Oracle、SQL Server、MySQL；半结构化数据会在 [12 NoSQL 与 JSON](12-nosql-json.md) 再出现。

<a id="topic-2"></a>
## 2. 为什么需要 DBMS

### 平面文件的问题

![W1-2 slide 10 - File processing with COBOL](assets/01-introduction/slide-w12-10.png)

左上是一段 COBOL 程序的 `DATA DIVISION`：程序自己写出 `StudentFile` 每条记录有哪些字段、每个字段多长（例如 `PIC 9(7)` 表示 7 位数字）。这就是平面文件（flat file）时代的做法：数据结构写死在程序里。

下半页列出的问题都由此而来：

- 每个程序都要详细编写自己的数据访问例程，并包含完整的数据结构细节；
- 多个用户不能同时访问；
- 同一份数据有多个副本，没有集中管理；
- 缺乏安全控制。
<!-- Sources: W1-2 p.10; Apple Notes WEEK 1 -->

理解的关键是第一条：只要文件里加一个字段，所有读这个文件的程序都得改。DBMS 要解决的首先就是这件事。

### DBMS 带来的能力

![W1-2 slide 11 - Why use a DBMS part 1](assets/01-introduction/slide-w12-11.png)

![W1-2 slide 12 - Why use a DBMS part 2](assets/01-introduction/slide-w12-12.png)

**重点：数据库（database）是数据本身，DBMS（DataBase Management System）是管理数据的那套软件，两者不是一回事。**

第 11 页讲前三项：数据独立性、高效访问、完整性与安全；第 12 页补上统一管理、并发访问与崩溃恢复，并把数据独立性拆成两种。把它们和上一页平面文件的问题对照着记：

| 平面文件的问题 | DBMS 的对应能力 |
| --- | --- |
| 每个程序都写死数据结构 | 数据独立性（data independence）：应用不接触数据的表示与存储细节，DBMS 提供一层抽象 |
| 程序自己写访问例程，效率参差 | 高效访问：存取比平面文件更高效 |
| 缺乏安全控制 | 数据完整性与安全：DBMS 自己执行完整性约束和访问控制，不只依赖操作系统 |
| 多个副本，没有集中管理 | 统一的数据管理：由专门的数据管理人员负责，降低数据风险 |
| 多个用户不能同时访问 | 并发访问与崩溃恢复：调度多个用户同时访问，并在系统故障时保护数据 |
<!-- Sources: W1-2 p.11-12; Apple Notes WEEK 1 -->

**难点：两种数据独立性。** 看第 12 页中间的 Data Independence：

- 逻辑数据独立性（logical data independence）：修改逻辑模式（例如增删一个属性、实体或关系）时，不必重写应用程序；
- 物理数据独立性（physical data independence）：改变存储方式（例如从本地硬盘换到云存储、换压缩方法）时，应用不受影响。
<!-- Sources: W1-2 p.12 -->

理解用例（自拟）：学校把成绩库从机房硬盘搬到云上，选课网站一行代码没改——这是物理数据独立性；给学生表加一列“紧急联系人”，只用旧列的查成绩程序也不用改——这是逻辑数据独立性。

<a id="topic-3"></a>
## 3. 客户端-服务器与 MySQL

### 数据库服务器

![W1-2 slide 15 - RDBMS and database servers](assets/01-introduction/slide-w12-15.png)

数据库服务器（database server）是一台连在网络上的计算机，数据库存在它上面；网络上的用户通过它读写数据。看第 15 页中间那句：数据只有 **一份**（备份除外）。正因为只有一份、又有很多人同时改，才需要 DBMS 调度并发，例如很多人同时查同一件商品的价格、同时选同一门课、同时订同一班航班的票。并发控制的细节在 [08 事务与并发控制](08-transactions-concurrency.md)。

### 客户端-服务器结构

![W1-2 slide 16 - Client server in industry](assets/01-introduction/slide-w12-16.png)

看图的上下两层：上面是服务器（server），DBMS 和应用/网页服务器在那里；下面是客户端（client），可以是数据库客户端、DBMS 管理工具或浏览器。三种客户端都通过网络访问服务器上的同一份数据。
<!-- Sources: W1-2 p.15-16; Apple Notes WEEK 1 -->

注意浏览器那一列：普通用户并不直接连 DBMS，而是先连应用/网页服务器，再由它去访问数据库。这条路径在 [14 Web 应用](14-web-applications.md) 展开。

### 本课使用的 MySQL 环境

![W1-2 slide 17 - MySQL server and Workbench in teaching](assets/01-introduction/slide-w12-17.png)

本课使用 MySQL：MySQL Server 是 RDBMS，MySQL Workbench 是连接服务器的图形客户端。可以连学校的服务器（校外需 VPN），也可以在自己电脑上同时装服务器和 Workbench（本机 `127.0.0.1`）。
<!-- Sources: W1-2 p.17; W1-1 p.19; Tut W1 p.3 -->

对照图读：左边灰框是学校服务器，实验室电脑或自己笔记本上的 Workbench 经过 VPN 连过去；右边整个框是“你的电脑”，服务器和客户端装在同一台机器上，所以地址是本机。W1-1 第 19 页还提醒：Assignment 2 的 SQL 必须能在学校服务器上运行，所以即使在本机练习，也要在学校服务器上试一遍。

Tutorial 1 的安装要点：

- 下载 MySQL Community Server 和 MySQL Workbench，不需要注册账号；
- 在 Workbench 的 Preferences → SQL Editor 里取消安全模式（safe mode）勾选；
- 连不上学校服务器时，先检查用户名是否为小写的 unimelb 用户名、是否连着校园网或 VPN，再重新输入一遍连接信息。

<details markdown="1"><summary>延伸内容（可选）：Workbench 的安全模式拦的是什么</summary>

Workbench 的 safe updates 模式会拒绝没有用键列限定 `WHERE` 的 `UPDATE` 和 `DELETE`，防止一条语句误改整张表。课程练习里常需要这样的语句，所以 Tutorial 让大家关掉它；关掉以后，写 `UPDATE`、`DELETE` 前更要先确认 `WHERE` 条件（见 [06](06-sql-joins-and-changes.md)）。

</details>

<a id="topic-4"></a>
## 4. 关系模型与 Pizza Online 案例

### 关系表的规则

![W1-2 slide 20 - Relational table: attributes, rows and cells](assets/01-introduction/slide-w12-20.png)

关系数据模型由 Ted Codd 在 1970 年提出，数据用二维表表示。沿着图上的蓝字标注读：

- 每列是一个属性（attribute），列名唯一；
- 每行是一个元组（tuple），行没有名字、没有编号，**行的顺序无关紧要**；
- 每个单元格只能放 **一个值**；
- 每一行由唯一的主键（primary key）识别，不允许重复，例如学号。
<!-- Sources: W1-2 p.19-23; Apple Notes WEEK 1 -->

第 21 页给了这些词的数学说法：一张表就是一个 **关系（relation）**，所以叫关系模型。

### RDBMS 能做什么

![W1-2 slide 23 - Setting up an RDBMS: keys and constraints](assets/01-introduction/slide-w12-23.png)

关系数据库是一组相互关联的表，例如学生表、科目表、选课表。RDBMS 让用户对表中的数据做 CRUD：创建（Create）、读取（Read/Retrieve）、更新（Update）、删除（Delete）。还可以根据业务规则加约束，例如“学生类型只能是 PG 或 UG”。
<!-- Sources: W1-2 p.21-23 -->

第 23 页下半的三条约束分别检查格式（学号长度）、取值范围（PG 或 UG）、跨表事实（选的科目本学期确实开设）。约束写进数据库后，由 DBMS 统一把关，而不是每个程序各查一遍——这就是上一节“完整性”的具体样子。

### 为什么要拆表

![W1-2 slide 28 - Pizza Online completed order](assets/01-introduction/slide-w12-28.png)

先看业务：一张订单属于一位顾客（C2045），有日期时间和送货说明，包含多种商品，每种商品有数量，最后有总价。

![W1-2 slide 29 - Pizza Online data in one big table](assets/01-introduction/slide-w12-29.png)

再看把这张订单直接塞进一张大表的结果：订单 3224 买了三种比萨，订单日期、时间、送货说明、总价就被重复写了三行；而且下面那张表里没有任何一列指向顾客，看不出订单属于谁。页面底部的两条 Problems 说的就是这两件事。

![W1-2 slide 30 - Pizza Online split into related tables](assets/01-introduction/slide-w12-30.png)

拆开以后有四张表：顾客、订单、订单明细、比萨。看三条箭头：顾客表的 Customer ID 指向订单表的 Customer ID；订单表的 Order No 指向订单明细；比萨表的 Code 指向订单明细的 Line Item。每个事实只写一次，表之间靠编号连起来。

从一张大表到四张表，解决的正是“重复”和“连不上”两个问题。这种“为什么要拆”的直觉会在 [04 规范化](04-normalisation.md) 里系统化。
<!-- Sources: W1-2 p.24-30 -->

订单明细表（Order No, Line Item, Quantity）一行只描述“某订单里的某种商品买了几份”，数量既不属于订单也不属于比萨，所以单独成表。这个结构就是 [02](02-conceptual-er-modelling.md#topic-5) 里消解多对多的关联实体。

**补充：** 第 28 页订单日期写 2020 年 9 月 1 日，第 29–30 页表格里写 1/09/2021，是课件前后不一致，不影响理解。Tutorial 1 的练习也是这个案例：看着订单确认页，想一想需要哪些表、每张表放哪些列。

<a id="topic-5"></a>
## 5. SQL 的四类语言与数据库开发生命周期

### 表结构操作和表内容操作

![W1-2 slide 33 - Lifecycle steps and SQL sub-languages](assets/01-introduction/slide-w12-33.png)

左边四步对应一个数据库的一生：先设计（画 ER 图），再用 DDL 建出来，再用 DML 存取数据，最后用 DCL 管理权限；右边蓝字是每类语言的关键字。

- DDL（Data Definition Language，数据定义语言）改的是 **表结构**：`CREATE`、`DROP`、`ALTER`、`RENAME`；
- DML（Data Manipulation Language，数据操纵语言）改的是 **表内容**：`SELECT`、`INSERT`、`UPDATE`、`DELETE`；
- DCL（Data Control Language，数据控制语言）管 **权限**：`GRANT`、`REVOKE`。
<!-- Sources: W1-2 p.31-33; W5-1 p.5; Apple Notes WEEK 1 -->

**易错：** `DROP` 删掉的是整张表（连结构一起没了），`DELETE` 只删表里的行，表还在。第 31 页写的是“DROP (i.e. delete) a table”，这里的 delete 是日常说法，不是 SQL 的 `DELETE`。

具体语法从 [05 SQL 查询基础](05-sql-select-basics.md) 开始。

### 数据库开发生命周期

![W1-2 slide 35 - Database development lifecycle: planning](assets/01-introduction/slide-w12-35.png)

图中箭头从左上的规划一路走到右下的实施、数据转换和测试，再回到运行维护。课程重点在中间的 **Database Design** 框。课件第 35–45 页每页把其中一个框标红，右侧解释这一步；这里只放第一页，其余非设计阶段汇总成表：

| 阶段 | 做什么 | 本课是否展开 |
| --- | --- | --- |
| 数据库规划（planning） | 确定项目怎么做、企业如何运作 | 不展开 |
| 系统定义（systems definition） | 确定范围、用户、主要用户视图和应用领域 | 基本不展开 |
| 需求收集与分析 | 收集并分析新系统的需求 | 案例题中给出 |
| 应用设计 | 设计使用数据库的界面和程序 | [14 Web 应用](14-web-applications.md)简要涉及 |
| 实施（implementation） | 把设计建成可用的数据库 | SQL 部分 |
| 数据转换与加载 | 把旧系统的数据迁进来，并不简单 | 概念见 [11 数据仓库](11-data-warehousing.md) |
| 测试（testing） | 运行数据库，找设计和配置中的错误，也看性能、健壮性、可恢复性、安全 | 基本不展开 |
| 运行维护（operational maintenance） | 投入使用后监控、调优、应对需求变化 | 部分见 [09](09-dbms-architecture-administration.md) |
<!-- Sources: W1-2 p.33-46; Apple Notes WEEK 1 -->

### 设计的三个层次

![W1-2 slide 38 - Conceptual design](assets/01-introduction/slide-w12-38.png)

**概念设计（conceptual design）**：高层次的第一版模型，只关心有哪些实体、它们怎样相连。右侧要点说它通常省略大部分属性，甚至不一定落在关系数据库上，所以可以出现多对多联系、重复组和复合属性。下一讲 [02 概念建模](02-conceptual-er-modelling.md) 整讲都在做这一步。

![W1-2 slide 39 - Logical design](assets/01-introduction/slide-w12-39.png)

**逻辑设计（logical design）**：在概念设计基础上，确定要用关系数据库，于是要写出列和键；但仍然不依赖具体厂商（MySQL 还是 Oracle）和其他物理因素。

![W1-2 slide 40 - Physical design](assets/01-introduction/slide-w12-40.png)

**物理设计（physical design）**：针对某个具体 DBMS 落地，右侧列出要决定的内容：基表、数据类型、索引、完整性约束、文件组织、安全措施。

**易错：** 概念设计里可以出现多对多联系，但到逻辑设计必须消解；“加数据类型”属于物理设计而不是逻辑设计。这三步的具体转换见 [02 概念建模](02-conceptual-er-modelling.md) 和 [03 逻辑与物理设计](03-logical-physical-design.md)。

<details markdown="1"><summary>补充：课程安排（2025 S1）</summary>

课程分为建模、SQL、规范化和高级数据库概念四大块。评估包括小组数据建模作业、个人 SQL 作业、第 6 周与第 12 周两次测验和期末考试；具体比例和门槛以 Canvas 为准。课程建议多练习数据建模和 SQL。
<!-- Sources: W1-1 p.6, p.9-10 -->

</details>

## 本讲自测

1. 一家小店用三个 Excel 文件分别记录客户、订单和库存，两名员工常常同时修改订单文件。用本讲的 DBMS 优势，说出至少三个会改善的地方。
2. 公司把数据库从本地硬盘迁移到云存储，应用程序不用改，这体现了哪一种数据独立性？给客户表增加一列也不用改程序，又是哪一种？
3. 有人想把同一客户的两个电话号码写进同一个单元格。按关系表的规则，这样做有什么问题，应该怎样改？
4. “给 `Price` 列选 `DECIMAL(5,2)`”属于生命周期的哪个阶段？“确定订单和比萨是多对多联系”又属于哪个阶段？
