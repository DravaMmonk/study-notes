# INFO90002 Weeks 3–4 - Logical Design, Physical Design and Data Types

来源：`lecture/INFO90002_Week3-1_Keys_Logical&Physical.pdf`、`lecture/INFO90002_Week4-1_Physical&DataTypes.pdf`、`lecture/Week4-1_Exercise_SubjectEnrol.pdf`、`lecture/lecture_queries.sql`；`tutorial/Week3_Tute_Logical and Physical Modelling.pdf`、`tutorial/Week3_Tute_Logical and Physical Modelling SOLUTIONS.pdf`、`tutorial/Week9Tute_SQL_DDL_Solutions.pdf`；Apple Notes：CS/25S1/DB — "FE - Logical & Physical Design & SQL DDL"、"WEEK 4 - Data Types"。

这篇讲的是：**概念 ERD 画好以后，怎样一步步变成带键的关系、带数据类型的物理设计，最后写成能执行的 `CREATE TABLE`？**

学习路线：[关系模型与设计链条](#topic-1) → [键与完整性约束](#topic-2) → [二元联系与弱实体的映射](#topic-3) → [一元与三元联系](#topic-4) → [MySQL 数据类型](#topic-5)。

重点：超键、候选键、主键的层次；1:M、M:N、1:1 与弱实体的映射规则；外键与参照完整性。难点：1:1 的外键放哪一侧；一元多对多需要两个不同名字的外键；三元联系的主键。易错：在逻辑设计里就写数据类型；给整数类型写 `(M)`；混淆 `TIMESTAMP` 与 `DATETIME` 的时区行为。

图片说明：文件名里的 `w31`、`w41`、`w41ex`、`t03s` 分别指 W3-1 讲义、W4-1 讲义、W4-1 课堂练习和 Week 3 教程答案，数字是 PDF 页码。

<a id="topic-1"></a>
## 1. 关系模型与设计链条

### 关系、属性和元组：同一件事的三套叫法

![W3-1 slide 04 - Terminology and the Customer and Order tables](assets/03-logical-physical-design/slide-w31-04.png)

先看上半部分的对照表：关系模型里的 relation（关系）、attribute（属性）、tuple（元组）或 row，在 MS Access 里叫 table、field、record，在 MySQL 和 Oracle 里叫 table、column、row。三列说的是同一件事，只是不同系统的叫法。

再看下半部分：`Order` 表的 Customer ID 列，每个值都用蓝色箭头指向 `Customer` 表的一行。这种“用一个值引用另一张表的一行”就是本讲第 2 节的外键。
<!-- Sources: W3-1 p.4 -->

![W3-1 slide 05 - Relational database definitions](assets/03-logical-physical-design/slide-w31-05.png)

关系数据库（relational database）是一组关系。一个关系由两部分组成：

- **模式（schema）**：关系名，加上每列的名字和类型。幻灯片中间的 `Pizza(pID: string, pizzaName: string, price: decimal)` 是一种不画图的文字记法；
- **实例（instance）**：某一时刻的一张具体的表。行数叫 **基数（cardinality）**，列数叫 **度（degree / arity）**。下一页的 Pizza 实例有 8 行 3 列，所以基数为 8、度为 3。

页底两条说明关系是行的 **集合（set）**：所有行互不相同，行之间没有先后顺序。所以“表里的第一行”在关系模型里没有意义，需要顺序时要在查询里写 `ORDER BY`。
<!-- Sources: W3-1 p.5-6; Apple Notes FE - Logical & Physical Design & SQL DDL -->

**易错：** 这里的“基数”指表的行数，和 ER 联系里的“基数”（最小/最大参与数）是两种用法，看上下文区分。

### 从概念到实例的五步

![W3-1 slide 10 - The entire cycle for Customer](assets/03-logical-physical-design/slide-w31-10.png)

按幻灯片上的编号读，同一个 `Customer` 走完五步：

1. **概念设计**：ERD 里的实体 `Customer`；
2. **逻辑设计**：实体集变成关系 `Customer(customerID, Surname, FirstName, Email)`，主键加下划线，这一步 **定下键**；
3. **物理设计**：给每个属性加 **数据类型**，例如 `customerID CHAR(11)`、`Surname VARCHAR(35)`；
4. **实施**：写成右上的 `CREATE TABLE` 语句，蓝字 `PRIMARY KEY (customerID)` 把下划线变成约束；
5. **实例**：插入数据后的表，右下三位顾客。
<!-- Sources: W3-1 p.10 -->

Apple Notes 的一句话总结：**逻辑设计决定键，物理设计决定数据类型。** 前面两页（slide 7–8）用 `Building(bCode, bName)` 演示同一过程，并说明逻辑设计和物理设计都可以画成 MySQL Workbench 的表框图，物理图只是在列名旁边多了类型。
<!-- Sources: W3-1 p.7-10; Apple Notes FE - Logical & Physical Design & SQL DDL -->

### 物理设计还要决定什么

![W4-1 slide 02 - Inputs and decisions of physical design](assets/03-logical-physical-design/slide-w41-02.png)

左框是物理设计的 **输入**：规范化后的关系（见 [04](04-normalisation.md)）、属性定义、响应时间要求、数据安全、备份恢复、完整性要求以及所用 DBMS。黄色箭头指向右框的 **决定**：红字的属性数据类型和物理记录描述（不一定与逻辑设计一一对应），以及文件组织、索引与数据库架构、查询优化。

页底解释了 **物理记录（physical record）**：一组存放在相邻存储位置、作为一个整体读取的字段。它的设计影响读取速度和所需磁盘空间。本讲主要练习“选数据类型”（见 [第 5 节](#topic-5)），索引在 [09](09-dbms-architecture-administration.md#topic-4) 展开。
<!-- Sources: W4-1 p.2 -->

<a id="topic-2"></a>
## 2. 键与完整性约束

### 键把不同表的行连起来

![W3-1 slide 12 - Primary key and foreign key](assets/03-logical-physical-design/slide-w31-12.png)

左边红圈是 `Customer` 的 Customer ID 列：每个值只出现一次，能唯一找到一位顾客，这是 **主键（primary key, PK）**。右边红圈是 `Order` 的 Customer ID 列：值可以重复（C2045 下了三张订单），每个值都指向左边某一行，这是 **外键（foreign key, FK）**。

幻灯片的文字还说明：键是 **完整性约束（integrity constraint, IC）** 的一种。“只有顾客才能下订单”这条业务规则，靠“订单里的顾客号必须在顾客表里存在”来保证。

### 从超键到主键

![W3-1 slide 13 - Superkey](assets/03-logical-physical-design/slide-w31-13.png)

**超键（superkey）**：一组字段，任意两行在这组字段上的取值不会完全相同。全部属性合起来总是一个超键；顾客表里 CustomerID 再加上任何其他列，也都是超键。

**键（key）/ 候选键（candidate key）**：最小的超键，去掉任何一个属性就不再唯一。顾客表里 `{CustomerID}` 是候选键，`{CustomerID, Surname}` 只是超键。

![W3-1 slide 14 - Primary keys exercise on Student](assets/03-logical-physical-design/slide-w31-14.png)

右上的学生表有 `sid`、`name`、`login`、`age`、`gpa`，其中两人都叫 Smith。按幻灯片的四个问题想：

1. `sid` 每行不同，可以做主键；
2. `name` 有重复，不是键；
3. `{sid, gpa}` 是超键，但不是主键：去掉 `gpa` 后 `sid` 仍唯一，所以它不是最小的；
4. `{sid, login}` 也不是最小的：`sid` 和 `login` 各自都唯一，都是候选键，选其中一个做主键即可。
<!-- Sources: W3-1 p.14 -->

![W3-1 slide 15 - Superkeys to candidate keys to primary key](assets/03-logical-physical-design/slide-w31-15.png)

左边的箭头表示层次：超键里挑出最小的得到候选键，再从候选键里选一个主键。设计者选主键时，要选列数最少、并且在实体整个生命周期内都不会改变的那一个。最后一条 N.B. 提醒：有的关系没有合适的候选键，这时设计者要加一个 **代理键（surrogate key）**。
<!-- Sources: W3-1 p.13-16; Apple Notes FE - Logical & Physical Design & SQL DDL -->

#### 代理键与自然键

![W3-1 slide 16 - Surrogate keys](assets/03-logical-physical-design/slide-w31-16.png)

上半部分是代理键的特征：没有业务含义、通常是数字、常由 DBMS 顺序生成（MySQL 的 `AUTO_INCREMENT`）。下半部分转向建模：和客户交流时要用对方业务里的术语和 **自然键（natural key）**，不要硬造对方不用的字段。

![W3-1 slide 18 - Modelling with natural keys](assets/03-logical-physical-design/slide-w31-18.png)

两种键属于不同阶段。建模阶段用自然键，有时 ER 模型本身就是最终产物，根本不建数据库；真正建数据库时，实现者可以加代理键。加代理键不会丢数据：自然键的列仍然保留，只是不再当主键。

两页之间的 slide 17 举例：一所只开 20 门课的小学院，平时就用课程名称识别课程，建模时不必强加“课程代码”。同页还问：用员工的工作邮箱或手机号当标识符可靠吗？它们会变、会被重新分配，不满足“生命周期内不变”，所以不是好主键。
<!-- Sources: W3-1 p.16-18 -->

### 外键与参照完整性

![W3-1 slide 20 - Foreign keys in SQL](assets/03-logical-physical-design/slide-w31-20.png)

外键是一张关系中用来“引用”另一张关系某一行的字段组；它必须对应另一关系的主键，也就是被引用的主键值必须存在。当所有外键约束都被执行时，就实现了 **参照完整性（referential integrity）**。
<!-- Sources: W3-1 p.19; Apple Notes FE - Logical & Physical Design & SQL DDL -->

幻灯片上方的 SQL 用红圈标出关键一行 `FOREIGN KEY (customerID) REFERENCES Customer (customerID)`。它写在 **引用别人** 的 `Order` 表里，而不是被引用的 `Customer` 表里。同一段里的 `customerID CHAR(8) NOT NULL` 表示每张订单都必须有顾客（[第 3 节](#topic-3) 再讲）。

![W3-1 slide 21 - Enforcing referential integrity](assets/03-logical-physical-design/slide-w31-21.png)

参照完整性要回答两个问题。插入一条引用了不存在顾客号的订单：直接拒绝。删除一个仍被订单引用的顾客：幻灯片列出四种选择，在 SQL 里分别这样写：

| 选择 | SQL 写法 | 效果 |
| --- | --- | --- |
| 连带删除 | `ON DELETE CASCADE` | 父行删除时，引用它的子行也自动删除 |
| 不允许删除 | `ON DELETE NO ACTION` / `RESTRICT` | 只要还有子行引用，就不允许删除父行；这是默认行为 |
| 改成默认值 | `ON DELETE SET DEFAULT` | 把子行的外键改成一个默认顾客号 |
| 改成空值 | `ON DELETE SET NULL` | 把子行的外键改成 `NULL`（表示“未知”或“不适用”） |
<!-- Sources: W3-1 p.21, p.34; W4-1 p.7; Apple Notes FE - Logical & Physical Design & SQL DDL -->

页底说明：更新主键时有同样的问题，用 `ON UPDATE ...` 指定。在 MySQL 中写 `RESTRICT` 或 `NO ACTION` 与省略 `ON DELETE` 效果相同（W4-1 slide 7 也这样说）。实际演练（父键改号后子行跟着变、删除被引用的员工报错）见 [06](06-sql-joins-and-changes.md#topic-4)。
<!-- Sources: W3-1 p.21; W4-1 p.7 -->

**补充：** 延伸内容：MySQL 的 InnoDB 引擎能识别 `SET DEFAULT` 语法，但会拒绝含有它的表定义；在 MySQL 中实际可用的是另外三种。

### 完整性约束与“写时模式”

![W3-1 slide 22 - Integrity constraints](assets/03-logical-physical-design/slide-w31-22.png)

完整性约束是数据库 **任何** 实例都必须满足的条件，例如 **域约束（domain constraint）**：某列只能取某一类值。IC 在定义模式时指定，在修改关系时检查；满足所有 IC 的实例才是 **合法实例（legal instance）**，DBMS 不应允许非法实例出现。因为表结构在数据插入之前就已确定，这种方式叫 **写时模式（schema on write）**，与 NoSQL 的“读时模式”对照见 [12](12-nosql-json.md#topic-1)。
<!-- Sources: W3-1 p.22; Apple Notes FE - Logical & Physical Design & SQL DDL -->

<a id="topic-3"></a>
## 3. 二元联系与弱实体的映射

Tut W3 答案把“概念设计 → 逻辑设计”归结为三件事：多值属性拆成单独的列或实体；复合属性（composite attribute，例如地址由街道、城市、邮编组成）拆成各个组成部分；联系通过加外键和关联实体来解决，并把联系自己的属性放到正确的位置。本节按这个顺序展开，最后用答案里的电影院案例把整个过程走一遍。
<!-- Sources: Tut W3 Sol p.7 -->

### 多值属性要摊平

![W3-1 slide 24 - Flattening a multi-valued attribute](assets/03-logical-physical-design/slide-w31-24.png)

左边 Chen 图里，`phoneNum` 画成双椭圆，是 **多值属性（multi-valued attribute）**：一位顾客可以有家庭、工作、手机多个号码。关系的每个单元格只能放一个值，所以红色箭头指向的逻辑关系把它拆成 `home_num`、`work_num`、`mobile` 三列：`Customer(CustID, Surname, FirstName, home_num, work_num, mobile)`。
<!-- Sources: W3-1 p.24 -->

**补充：** 拆成固定几列适合号码种类固定且很少的情况。如果号码个数不固定，就要拆出一张电话表，这正是 [04](04-normalisation.md#topic-3) 里 1NF 去掉重复组的思路。

### 从 ERD 到逻辑关系：关联实体带来 PFK

![W3-1 slide 25 - ER to logical relations with PFKs](assets/03-logical-physical-design/slide-w31-25.png)

这张图把 [02](02-conceptual-er-modelling.md#topic-5) 里的比萨订单 ERD 写成三个逻辑关系。红圈标出的 `OrderItem(OrderID, PizzaCode, Quantity)` 中，前两列从两个父实体借来，成为 **PFK**（既是主键的一部分，又是外键）；`Order` 中的 `CustomerID` 是普通外键。
<!-- Sources: W3-1 p.25 -->

课件的记号约定（右下红字）：主键加下划线，外键用斜体，PFK 既下划线又斜体。左下角的箭头提醒：PFK 的名字不必和父实体主键同名，例如 `OrderItem` 里的 `PizzaCode` 引用 `Pizza.Code`。
<!-- Sources: W3-1 p.25 -->

### 从逻辑到实现：同一套键写成 SQL

![W3-1 slide 27 - Physical relations and CREATE TABLE](assets/03-logical-physical-design/slide-w31-27.png)

上半部分是 **物理关系**：逻辑关系加上类型，例如 `Code CHAR(6)`、`Price DECIMAL(5,2)`、`OrderDateTime DATETIME`（slide 26 只是这一半的单独版本）。下半部分写成 `CREATE TABLE`：下划线变成 `PRIMARY KEY (...)`，斜体变成 `FOREIGN KEY (...) REFERENCES ...`。`OrderItem` 的两列 PFK 在 SQL 里出现两次：一次在复合主键 `PRIMARY KEY (OrderID, PizzaCode)` 里，一次在各自的 `FOREIGN KEY` 里。

**易错：** 幻灯片中 `Order` 的外键写成 `REFERENCES Customer(CustID)`，而顾客表的主键在 slide 10 叫 `customerID`。真正执行时，括号里的列名必须是父表中实际存在的主键列。

![W3-1 slide 28 - Sample instances linked by keys](assets/03-logical-physical-design/slide-w31-28.png)

插入数据后，键就成了连接线：绿色箭头说明订单 3224 在 `OrderItem` 中有两行，黄色箭头说明这两行分别买了 P1 和 P3。读 `OrderItem` 的一行要同时看两个 PFK，例如第一行是“订单 3224 买了 2 份 Mario’s Supreme Pizza”。

**易错：** 实例中的顾客号是 `C2045` 这样的字母加数字，而上一页的物理设计把 `CustomerID` 定为 `INTEGER`，两者不能同时成立。选类型时要先看真实数据长什么样（见 [第 5 节](#topic-5)）。

### 用 SQL 表达连接性和参与

![W3-1 slide 33 - Connectivity constraint rule](assets/03-logical-physical-design/slide-w31-33.png)

**连接性规则**：“一”侧的主键成为“多”侧的外键。图中 `Customer` 是一、`Order` 是多，所以 `CustID` 放进 `Order`，SQL 里写 `FOREIGN KEY (CustID) REFERENCES Customer`。外键在多侧，每张订单只能填一个顾客号，这就保证了红字说的“每张订单属于一位顾客”。

![W3-1 slide 34 - NOT NULL for mandatory participation](assets/03-logical-physical-design/slide-w31-34.png)

**必选参与** 用 `NOT NULL` 表达：订单必须属于顾客，就写 `CustID CHAR(11) NOT NULL`（第一个红圈）。第二个红圈是 `ON DELETE NO ACTION`，页底说明它是默认值，可以不写：仍被订单引用的顾客不能被删除，要删就得先把这些订单的外键改掉。
<!-- Sources: W3-1 p.33-34; Apple Notes FE - Logical & Physical Design & SQL DDL -->

课程脚本里的一个完整例子同时用到代理键、必选参与和两种引用动作：

```sql
CREATE TABLE Account (
  AccountID          INT AUTO_INCREMENT,
  AccountName        VARCHAR(12),
  OutstandingBalance DECIMAL(10,2) NOT NULL,
  CustomerID         INT NOT NULL,          -- 每个账户必须属于一位顾客
  PRIMARY KEY (AccountID),
  FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);
```
<!-- Sources: W5-1 p.12; lecture/lecture_queries.sql -->

### 弱实体：外键成为主键的一部分

![W3-1 slide 36 - Translating weak entity sets](assets/03-logical-physical-design/slide-w31-36.png)

弱实体和它的标识联系翻译成 **一张表**。`OrderItem` 要靠 `Order` 才能识别，所以订单号进入主键；订单被删除时，它的明细也应一起删除，于是外键加了 `ON DELETE CASCADE`（红圈）。第一条要点还提醒：把联系变成实体时，联系名 “Contains” 不适合当表名，要换成 `OrderItem` 这样的名词。
<!-- Sources: W3-1 p.35-36 -->

**易错：** 这页的逻辑设计写 `pizzaID`，实现写 `pizzaCode CHAR(3)`，而 slide 27 用的是 `PizzaCode CHAR(6)`。同一列在三处名字和长度不一致；自己做题时要让逻辑、物理和 SQL 三处保持一致。

在 MySQL 中能直接执行的写法：

```sql
CREATE TABLE OrderItem (
  pizzaCode CHAR(3) NOT NULL,
  qty       INTEGER,
  orderNo   INTEGER NOT NULL,
  PRIMARY KEY (pizzaCode, orderNo),
  FOREIGN KEY (orderNo)   REFERENCES `Order`(orderNo) ON DELETE CASCADE,
  FOREIGN KEY (pizzaCode) REFERENCES Pizza(Code)     ON DELETE CASCADE
);
```

**补充：** `ORDER` 是 SQL 保留字（`ORDER BY`）。课件直接用 `Order` 当表名；在 MySQL 中实际执行时要写成反引号 `` `Order` ``，或改名为 `Orders`。

**补充：** 指向 `Pizza` 的外键也用了 `CASCADE`，意味着删除一种比萨会连带删除历史订单里的对应明细。是否合适取决于业务：如果需要保留销售记录，这一条通常改用 `RESTRICT`。

### 一对一：外键放在可选一侧

![W4-1 slide 04 - One-to-one logical and physical design](assets/03-logical-physical-design/slide-w41-04.png)

护士和护理中心：每个护理中心必须由一名护士负责，而护士不一定负责中心。若把外键放进 `Nurse`，大部分护士行的这一列都是空值；放进 `CareCentre` 则每行都有值。所以 `CareCentre(CentreID, Location, NurseID, DateAssigned)`，指派日期也跟着外键放在同一处。物理图里 `CareCentre` 的 `NurseID` 前面是红色菱形，表示它是外键。**判断问题：外键放在哪边空值最少？**

**易错：** 课件说的“必选一侧 / 可选一侧”指线两端的 **符号**：`Nurse` 那一端画必选（每个中心都必须有护士），`CareCentre` 那一端画可选（护士可以不负责中心）。所以外键落在 `CareCentre` 这张表里，也就是“每一行都一定有搭档”的那张表。
<!-- Sources: W4-1 p.3-4 -->

### 二元联系的三条规则

![W4-1 slide 05 - Summary of binary relationships](assets/03-logical-physical-design/slide-w41-05.png)

这一页把规则汇总成三条：1:M 把“一”侧主键放进“多”侧做外键；M:N 新建 **关联实体（associative entity）**，以两边主键组成复合主键；1:1 把必选一侧的主键放进可选一侧做外键，两边都可选或都必选时任选一侧。
<!-- Sources: W4-1 p.5; Apple Notes WEEK 4 - Data Types -->

### 标识联系与弱实体

![W4-1 slide 06 - Identifying relationship](assets/03-logical-physical-design/slide-w41-06.png)

映射标识联系和普通一对多一样：外键放在鸦脚一端。唯一区别是 **外键同时成为主键的一部分**：`Loan(LoanID, Amount)`、`Payment(PaymentNumber, LoanID, Date, Amount)`，`LoanID` 是 PFK。右下红字说明，MySQL Workbench 8.0 里 PFK 本应显示成红色钥匙，图中的显示差异只是外观问题。
<!-- Sources: W4-1 p.6 -->

### 完整例子：电影院案例（Tut W3 及答案）

教程案例用自己的话概括：连锁影院有多家影院，每家的放映厅从 1 开始编号，要记录面积、座位数和是否提供 Gold Class；连锁拥有几百台胶片或数字放映机，每个放映厅只能放一台，技术人员要知道每台放映机现在在哪个厅；系统要记录每部电影最后一次在哪家影院的哪个厅放映；不是自有产权的影院还要记年租金。
<!-- Sources: Tut W3 p.1-2 -->

#### 概念阶段：实体、联系和参与

答案先找出四个实体：`Cinema`、`Theatre`、`Projector`、`Movie`。“连锁公司”本身不是实体：它只有一个实例，也没有要存的数据。三条联系和参与约束是：

- 放映厅 **位于（located in）** 影院：每个厅必须恰好属于一家影院，每家影院至少有一个厅；
- 放映机 **投映到（projects onto）** 放映厅：两端都是“可选的一”。放映机可能是备用的或在维修，放映厅也可能在维护或换机期间暂时没有放映机；
- 放映厅 **放映（shows）** 电影：随着时间推移，一个厅放过多部电影，一部电影也在多个厅放过，两端都是“可选的多”。

答案还提醒两点：需求不会把每个约束都写明，缺的部分要靠常识补上；联系名要用具体的动词，不要用 “has” 这种含糊的词。
<!-- Sources: Tut W3 Sol p.4-5 -->

#### 逻辑阶段：三种联系各用一条规则

这个模型里没有多值属性和复合属性，所以逻辑设计只剩“解决联系”这一件事：

1. **1:1 的投映联系**：外键放在哪一侧都可以，答案的判断问题是“哪一侧更不容易出现 `NULL`？”大多数放映厅随时装着放映机，而备用、维修中的放映机不在任何厅里，所以外键放进 `Theatre`，新增列 `ProjectorSerialNumber`。这和上面护士例子是同一个判断问题。因为放映厅也可能暂时没有放映机，这一列仍要允许为空。
2. **1:M 的位于联系**：外键放在“多”侧的 `Theatre`。这又是标识联系（厅号只在一家影院内唯一），所以 `CinemaID` 同时进入主键，成为 PFK：`Theatre(CinemaID, TheatreNumber, Size, SeatingCapacity, HasGoldClass, ProjectorSerialNumber)`。
3. **M:N 的放映联系**：新建关联实体 `MovieScreening`。`Theatre` 的主键现在是两列，两列都要带进来，再加上 `MovieID`：`MovieScreening(CinemaID, TheatreNumber, MovieID, DateOfLastScreening)`。联系自己的属性“最后一次放映日期”跟着外键走；外键在关联实体里，它也就放在这里，作为非键列。

`Movie` 现有的属性（片名、年份、分级）都不能可靠地区分电影，所以要加一个 `MovieID`。其余三张表从概念阶段原样保留：`Cinema(CinemaID, Name, Address, YearlyRent)`、`Movie(MovieID, Title, YearOfRelease, Rating)`、`Projector(SerialNumber, Format, ModelNumber, Resolution, HoursOfUse)`。答案还提到命名惯例：到逻辑阶段把名字改成驼峰式（CamelCase），例如 “seating capacity” 写成 `SeatingCapacity`。
<!-- Sources: Tut W3 Sol p.5-6, p.8-9 -->

**难点：** `MovieScreening` 引用的是弱实体 `Theatre`，所以 `(CinemaID, TheatreNumber)` 是一个 **两列合起来的外键**，必须整体引用 `Theatre` 的复合主键。只带 `TheatreNumber` 的话，“3 号厅”指的是哪家影院的 3 号厅就说不清了。

**易错：** 答案第 8 页把 1:M 的规则写成“外键加在 one 一侧”，这是笔误：同一份答案第 6 页写的是加在 Many 侧，第 8 页紧接着的例子也把 `CinemaID` 放进了“多”侧的 `Theatre`。按上面的三条规则记：“一”侧的主键进入“多”侧。
<!-- Sources: Tut W3 Sol p.6, p.8 -->

答案最后说明：文字形式的逻辑关系里看不出可选还是必选，但参与约束仍然是逻辑设计的一部分，到物理设计时要重新用上，变成 `NOT NULL` 或允许为空（对照前面 slide 34）。
<!-- Sources: Tut W3 Sol p.9 -->

#### 物理阶段：加上类型和空值

![Tut W3 Sol slide 09 - Completed logical relations and physical model of the cinema case](assets/03-logical-physical-design/slide-t03s-09.png)

页面上半部分是完成的逻辑关系：主键加下划线，外键在列名上方标 FK，两者都有的就是 PFK。下半部分是作业题的物理模型，每列后面加了类型。看图时注意四处：

- **钥匙图标**：`Theatre` 里 `TheatreNumber` 是黄钥匙（主键），`CinemaID` 是红钥匙（PFK）；`MovieScreening` 的三列都是红钥匙，三列合起来是主键，每列又各是外键。
- **菱形图标**：实心表示 `NOT NULL`，空心表示允许为空。`Theatre.ProjectorSerialNumber` 是红色空心菱形，即可为空的外键，对应“放映厅可以暂时没有放映机”；`Cinema.YearlyRent` 是空心的，因为自有影院没有租金；`Projector` 的 `Resolution` 和 `HoursOfUse` 也是空心的。
- **线型**：`Located in`、`Screens`、`Showing` 是实线，表示标识联系（外键进入了子表的主键）；`Projects into` 是虚线，表示非标识联系，两端都是圆圈加竖线（可选的一）。
- **类型**：可以对照 [第 5 节](#topic-5)。`HasGoldClass TINYINT` 是 MySQL 表示布尔值的惯例；`Format` 和 `Rating` 只能取几个固定值，用 `ENUM(...)`；`YearOfRelease` 用 `YEAR`；`Size DECIMAL(3,1)` 表示最多 99.9 米、保留一位小数。
<!-- Sources: Tut W3 Sol p.9 -->

**易错：** 逻辑关系里这一列叫 `DateOfLastScreening`，物理图里写成 `DateOfScreening`；自己做题时同一列前后要用同一个名字。另外题目要记录的是“最后一次放映的时间”，图中用 `DATE` 只能存日期；如果要区分同一天的不同场次，可以改用 `DATETIME`（这是自己的判断，答案没有讨论）。

<a id="topic-4"></a>
## 4. 一元与三元联系

### 联系的度

![W3-1 slide 29 - Relationship degree](assets/03-logical-physical-design/slide-w31-29.png)

联系的 **度（degree）** 是参与实体的个数：一元（unary，又叫递归联系 recursive）、二元（binary，最常见）、三元（ternary）、n 元。右上的 `Employee` 图就是一元：“manages” 这条线从 `Employee` 出发又回到 `Employee`，`ManagerID` 引用同一张表。Apple Notes 的记法：一元关联实体里有两个指向同一表的 PFK，二元两个，三元三个，n 元 n 个。
<!-- Sources: W3-1 p.29; Apple Notes FE - Logical & Physical Design & SQL DDL -->

### 三元联系

![W3-1 slide 31 - Ternary relationship to logical relation](assets/03-logical-physical-design/slide-w31-31.png)

左边的 Chen 图中，`Contract` 同时连接 `Part`、`Supplier`、`Department`，并带有自己的属性 `Quantity` 和 `Date`。slide 30 给出的业务句子是“各部门向一个或多个供应商采购一个或多个零件”。右下文字是转换规则：n 元联系变成逻辑关系时，要包含每个参与实体的主键（作外键）以及所有描述性属性；这几个外键合起来 **很可能** 构成一个超键。
<!-- Sources: W3-1 p.30-32 -->

**易错：** 图中 `Contract` 有 `Quantity` 和 `Date` 两个属性（slide 30 的红字却写 “one relationship attribute”），而左下的逻辑关系只写了 `Quantity`。按右边“所有描述性属性”的规则，`Date` 也应进入关系。

![W3-1 slide 32 - Ternary implementation and the PK question](assets/03-logical-physical-design/slide-w31-32.png)

实现时三个外键各自 `REFERENCES` 自己的父表，主键先写成 `(SupplierID, PartID, DepCode)`，右边的箭头问：这个主键对吗？

**难点：** 如果同一部门会在不同日期向同一供应商订同一零件，这三列就会重复，需要把 `Date` 也纳入主键。这又回到“用样例数据检验标识符”的方法（见 [02](02-conceptual-er-modelling.md#topic-6)）：三个外键只是“很可能”的超键，主键要按业务确认。
<!-- Sources: W3-1 p.30, p.32 -->

### 一元联系：同一张表引用自己

一元联系的映射规则和二元联系相同，只是两端是同一个实体。W4-1 用三组幻灯片分别演示 1:1、1:M、M:N，slide 9 用文字把三种情况汇总在一起。
<!-- Sources: W4-1 p.7-11; Apple Notes WEEK 4 - Data Types -->

![W4-1 slide 07 - Unary one-to-one Person and spouse](assets/03-logical-physical-design/slide-w41-07.png)

**1:1**：`Person(ID, Name, DateOfBirth, SpouseID)`，`SpouseID` 引用 `Person(ID)`。看右下实例：Ann 的 `SpouseID` 是 3（Chon），Chon 的是 1（Ann）；Fred 和 Nancy 没有配偶，所以是 `NULL`，因此 `SpouseID` 不能加 `NOT NULL`。左下说明：写 `RESTRICT`（或 `NO ACTION`）与省略 `ON DELETE` 一样。

![W4-1 slide 08 - Unary one-to-many Employee and manager](assets/03-logical-physical-design/slide-w41-08.png)

**1:M**：`Employee(ID, Name, DateOfBirth, ManagerID)`，`ManagerID` 引用 `Employee(ID)`。实例里 Ann 是最高领导，没有经理，所以 `ManagerID` 为 `NULL`；其余三人的经理都是 1 号 Ann。`ON UPDATE CASCADE` 表示 Ann 的编号改了，三名下属的 `ManagerID` 会自动跟着改；`ON DELETE RESTRICT` 表示还有下属时不能删除 Ann。
<!-- Sources: W4-1 p.8 -->

这种自引用结构到 SQL 里就是“自连接”（self join），查询写法见 [06](06-sql-joins-and-changes.md#topic-2)。

![W4-1 slide 10 - Unary many-to-many](assets/03-logical-physical-design/slide-w41-10.png)

**M:N**：物品由零件组成，零件本身也是物品。按规则新建关联实体 `Component(ID, ComponentID, Quantity)`，两个外键都引用 `Item(ID)`，**名字必须不同**，合起来是主键。看右下的物理图：`Item` 和 `Component` 之间有两条线，一条是 “contains”，一条是 “contained by”，分别对应 `ID` 和 `ComponentID` 两个 PFK，都指回 `Item`。`Quantity` 是这个组合自己的属性：一件物品里有几个这种零件。
<!-- Sources: W4-1 p.10-11 -->

![W4-1 slide 11 - Unary many-to-many implementation](assets/03-logical-physical-design/slide-w41-11.png)

实现中 `Component` 有两条 `FOREIGN KEY`，引用的是同一个 `Item(ID)`。两条都用 `ON DELETE RESTRICT`：只要一件物品还包含零件，或者还被当作别的物品的零件，就不能直接删除。

<a id="topic-5"></a>
## 5. MySQL 数据类型

### 选类型的原则

![W4-1 slide 13 - Choosing data types](assets/03-logical-physical-design/slide-w41-13.png)

列是数据库里最小的数据单位，数据类型帮助 DBMS 高效地存储和使用数据。左边五条原则：保证数据完整性（质量）、能表示所有可能值、支持所需运算、尽量节省存储、提升性能（例如选定长还是变长）。右边是主要类别：文本、数值（整数、定点小数、浮点数）、日期时间。
<!-- Sources: W4-1 p.13 -->

### 字符类型

![W4-1 slide 14 - Character types](assets/03-logical-physical-design/slide-w41-14.png)

读这一页时抓住“定长还是变长”：

- `CHAR(M)` 是 **定长**：存盘时右侧用空格补足到 M，适合长度固定的值（固定位数的代码、州名缩写）；`CHAR` 等于 `CHAR(1)`；
- `VARCHAR(M)` 是 **变长**：只存实际字符，不补空格，适合姓名、邮箱这类长短不一的值；
- `BLOB` / `TEXT` 存较大的二进制或文本对象，不与行数据存放在一起；`LONGBLOB` / `LONGTEXT` 最长 $2^{32}-1$ ；
- `ENUM('v1','v2',...)` 只能取列出的值之一。
<!-- Sources: W4-1 p.14; Apple Notes WEEK 4 - Data Types -->

**易错：** 幻灯片在 BLOB/TEXT 处写 “65535 (2^16)”，准确地说 $65535=2^{16}-1$ ；Apple Notes 记的 $2^{16}-1$ 是对的。

### 数值类型

![W4-1 slide 15 - Integer types](assets/03-logical-physical-design/slide-w41-15.png)

五种整数类型从 `TINYINT` 到 `BIGINT` 依次变大。每种都有有符号（signed）和无符号（unsigned）两个范围：无符号把负数那一半挪给正数，例如 `TINYINT` 是 −128 到 127，或 0 到 255。选择时同时满足“能表示所有可能值”和“尽量省空间”：年龄用 `TINYINT` 就够，订单号这类会持续增长的编号要留足余量。
<!-- Sources: W4-1 p.15 -->

- `BIT(M)` 存 M 位二进制值（M 为 1–64），例如 `b'111'` 表示 7；
- 最后一行红字：整数类型 **不要写 `(M)`**。延伸内容：`INT(11)` 里的 11 只是旧版本的显示宽度，并不限制取值范围，MySQL 8.0.17 起已弃用。

![W4-1 slide 16 - Real number types and Boolean](assets/03-logical-physical-design/slide-w41-16.png)

- `FLOAT`（单精度）和 `DOUBLE` / `REAL`（双精度）是 **浮点数**，按二进制近似存储，常用于科学数据；
- `DECIMAL(M,D)` 是 **定点数**，按十进制精确存储，**适合存钱**：M 是总位数，D 是其中的小数位数。例如 `DECIMAL(5,2)` 最大为 999.99，slide 27 里比萨的 `Price DECIMAL(5,2)` 就是这样；
- 页底：MySQL 没有真正的布尔类型，用 `TINYINT` 表示，1 为真、0 为假。
<!-- Sources: W4-1 p.15-16; Apple Notes WEEK 4 - Data Types -->

理解用例（自拟）：0.1 在二进制里无法精确表示，用 `FLOAT` 或 `DOUBLE` 累加多笔 0.10 元，结果可能出现末位误差；`DECIMAL(10,2)` 按十进制存储，加出来就是准确的分。这就是“钱用定点数”的原因。

### 日期时间类型

![W4-1 slide 17 - Date and time types](assets/03-logical-physical-design/slide-w41-17.png)

- `DATE` 只有日期；`TIME` 既可以表示一天中的时刻，也可以表示经过的时长，所以范围能超过 24 小时（−838:59:59 到 838:59:59）；
- `DATETIME` 与 `TIMESTAMP` 都包含日期和时间，区别在存储方式：`DATETIME` 按写入的本地时间原样存储；`TIMESTAMP` 存为 UTC，取出时按当前连接的时区转换，范围只到 2038-01-19 03:14:07；
- `YEAR` 只存年份，1901 到 2155。
<!-- Sources: W4-1 p.17; Apple Notes WEEK 4 - Data Types -->

**易错：** 页底三行说明，存入 `TIMESTAMP` 后修改连接时区再读取，得到的值会不同；`DATETIME` 不会随时区变化。

#### 理解用例：Tut W9 的顾客表怎样选类型

Week 9 教程建 `customer` 表时这样选（用自己的话概括）：`CustomerID` 用 `SMALLINT AUTO_INCREMENT` 做代理键；`FirstName VARCHAR(25)` 允许为空，`LastName`、`Phone`、`BirthDate` 都加 `NOT NULL`；电话用 `VARCHAR(16)` 而不是整数，生日用 `DATE`。电话号码不参与算术，可能以 0 开头，还可能带 `+` 或空格，所以存成字符串更稳妥。
<!-- Sources: Tut W9 Sol p.2 -->

### 课堂练习：选课模型

![W4-1 Ex slide 01 - Subject enrolment exercise](assets/03-logical-physical-design/slide-w41ex-01.png)

练习描述：学生选科目，结果是分数和等级；不及格可以重修；科目有静态信息（代码、名称）和每学期变化的信息（学期、年份、协调人）；每学期每门科目有若干作业 A1、A2……；学生每次提交作业得到一个分数。建模时可以注意四点：

- “重修”意味着同一学生和同一科目会出现多次，选课的标识符需要包含学期和年份；
- 静态信息和学期信息拆成两个实体，学期开课（offering）是科目的弱实体；
- 作业编号 A1 只在某次开课内唯一，所以作业又是开课的弱实体；
- 作业得分属于“某个选课记录 × 某项作业”，是两者之间的多对多联系，分数是这个联系自己的属性。
<!-- Sources: lecture/Week4-1_Exercise_SubjectEnrol.pdf -->

## 本讲自测

1. 每个国家有且只有一个首都城市，每个城市最多是一个国家的首都，且大部分城市不是首都。外键放在哪张表？为什么？
2. 一个人可以是多门课的助教，一门课可以有多个助教，还要记录每人每门课的工时。写出逻辑关系并标出 PFK。
3. `Student(sid, email, name)` 中 `sid` 和 `email` 都唯一。列出两个候选键，以及一个不是候选键的超键。
4. 科目可以以其他科目为先修课程（prerequisite）。写出逻辑关系和 `CREATE TABLE`，并说明两个外键为什么不能同名。
5. 为“价格（最多 9999.99 元）”“学生是否毕业”“出生日期”“州名缩写（固定 3 个字母）”各选一个 MySQL 类型。
