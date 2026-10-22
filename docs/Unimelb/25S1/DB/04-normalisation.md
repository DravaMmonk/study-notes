# INFO90002 Week 4 - Normalisation

来源：`lecture/INFO90002_Week4-2_Normalisation.pdf`；`tutorial/Week4_Tute_Normalisation.pdf`、`tutorial/Week4_Tute_Normalisation_Solutions.pdf`、`tutorial/Week12_Tute_ExamRevision_SOLUTIONS.pdf`；Apple Notes：CS/25S1/DB — "FE - Normalisation"。

这篇讲的是：**一张“什么都往里塞”的大表会出什么问题？怎样按函数依赖一步步把它拆成没有冗余异常的表？**

学习路线：[冗余带来的异常](#topic-1) → [函数依赖与 Armstrong 公理](#topic-2) → [未规范化关系与 1NF](#topic-3) → [2NF 与 3NF](#topic-4) → [把三步用到新表上](#topic-5)。

重点：部分依赖与传递依赖的识别；每一步拆表时保留外键。难点：先写出带重复组的未规范化关系；判断主键是否真的唯一。易错：单属性主键的关系自动满足 2NF；派生属性不放进关系；“传递依赖”和“传递律”不是一回事。

截图编号是 PDF 页码：`w42` 是 Week 4-2 课件，`t04s` 是 Week 4 Tutorial 答案。本篇记号：**粗体** = 主键（课件用下划线），*斜体* = 外键，***粗斜体*** = PFK（主键的一部分且是外键）。

<a id="topic-1"></a>
## 1. 为什么要规范化：冗余带来的异常

### 一张什么都装的大表

![W4-2 slide 04 - One big table of students, subjects and lecturers](assets/04-normalisation/slide-w42-04.png)

这张表每一行是“一个学生在一个学期选了一门课”。顺着前五行看：Joy Egbert 的姓名、校区地址、学位和电话在 A121 的五行里重复了五次；再看 ACC101 那几行，讲师 Davern 的办公室 T240C 和电话 8344-1846 每出现一次选课就抄一遍。重复本身就是信号：同一个事实被写了很多次，就有可能写得不一样。

![W4-2 slide 05 - Normalised student data](assets/04-normalisation/slide-w42-05.png)

这是拆开以后的样子。左上学生表、左下科目表各自一行只描述一个学生或一门科目；中间的 Subject Coordinator 用 `(Subject ID, Sem.)` 记录某学期由谁负责；右下讲师表记录办公室和电话；右上选课表（Enrolled Table）只剩 `Student ID#, Subject ID, Sem., Grade`，全是编号加成绩。注意讲师表里的 Wilkin：他这学期没有负责任何科目，在大表里根本存不下，拆开后就能单独记录。
<!-- Sources: W4-2 p.4-5 -->

### 插入、删除、更新三种异常

![W4-2 slide 06 - Insertion, deletion and update anomalies](assets/04-normalisation/slide-w42-06.png)

这一页换成一张更小的表 `(StudentID, StLastN, SubjectCode, SubjectTitle, FinalMark)`，底下三段分别对应三种 **异常（anomaly）**：

- **插入异常（insertion anomaly）**：新开一门科目，在还没有学生选它之前，没法插入一行（学生字段是键的一部分，不能空着）；
- **删除异常（deletion anomaly）**：Cook 退掉 ISYS90003，删掉这一行后，“ISYS90003 叫 Ethics in IS”这个事实也一起没了；
- **更新异常（update anomaly）**：ISYS90001 改名，要改它出现的每一行；漏改一行，数据就前后矛盾。

三种异常的根源是同一个：科目名称这个“关于科目的事实”，被放在了描述“选课”的行里。Tutorial 的例子同理：一张排课表里放了教室的座位数，教室扩容要改多行（更新），删掉唯一用某教室的课会丢掉教室信息（删除），新建好的教室还没排课就录不进去（插入）。
<!-- Sources: W4-2 p.6; Tut W4 Sol p.1 -->

**规范化（normalisation）** 就是把一张大表拆成几张小表，去掉不需要的冗余。课件第 7 页接着问“怎样拆”，答案就是下一节的函数依赖：它告诉我们哪些属性是“关于同一件事”的，应该放在一起。
<!-- Sources: W4-2 p.7 -->

<a id="topic-2"></a>
## 2. 函数依赖与 Armstrong 公理

### 函数依赖与决定因素

![W4-2 slide 11 - Functional dependency definition](assets/04-normalisation/slide-w42-11.png)

若属性 X 的每一个值都唯一决定属性 Y 的一个值，就说 Y **函数依赖（functional dependency, FD）** 于 X，记作 $X \to Y$ （也写 $Y = f(X)$ ）：知道了 X，就知道 Y。页面下方两个橙色箭头就是例子：`StudentID → Student-name`、`StudentID → Student-email`。
<!-- Sources: W4-2 p.11-12; Apple Notes FE - Normalisation -->

![Tut W4 Sol slide 02 - Formal FD definition, determinants, keys and partial dependency](assets/04-normalisation/slide-t04s-02.png)

Tutorial 答案第 2 页给了更严格的说法（看页面上半）：如果两行在 $A_1,\dots,A_n$ 上取值相同，它们在 $B_1,\dots,B_m$ 上也必然相同，就有 $A_1,\dots,A_n \to B_1,\dots,B_m$ 。函数依赖必须对关系的 **每一个** 可能实例成立，而不只是碰巧对眼前的数据成立。
<!-- Sources: Tut W4 Sol p.2 -->

同一页往下读三个概念：

- **决定因素（determinant）**：箭头左边的属性。`Person(ssn, name, birthdate, address, age)` 里 `ssn` 和 `birthdate` 都是决定因素，因为 `birthdate → age`；
- **键（key）**：能决定其余全部属性、而且 **最小** 的属性集合。`ssn` 是键；`{ssn, name}` 也能决定全部属性，但去掉 `name` 仍然成立，所以它只是 **超键（super key）**；
- **部分函数依赖**：见下一小节。

**补充：** 看样例数据可以 **推翻** 一条依赖（找到两行左边相同、右边不同），却不能 **证明** 一条依赖。依赖来自业务规则：“每个学号对应一个姓名”是规定，不是从几行数据里数出来的。

### 键属性、部分依赖与传递依赖

![W4-2 slide 12 - Determinants, partial and transitive dependency](assets/04-normalisation/slide-w42-12.png)

先看右上角的 $A(X, Y, Z, D)$ ：X 和 Y 带下划线，合起来是主键。每个属性要么是 **键属性（key attribute）**（主键的一部分），要么是 **非键属性（non-key attribute）**。页面用这个四元关系标出两类要消除的依赖：

| 依赖类型 | 含义 | 例子 |
| --- | --- | --- |
| 完全依赖 | 非键属性依赖于 **整个** 主键 | `(StudentID, SubjectCode) → Grade` |
| 部分依赖（partial） | 非键属性只依赖于复合主键的 **一部分**， $Y \to Z$ | `(StudentID, SubjectCode)` 中 `StudentID → StudentName` |
| 传递依赖（transitive） | 一个非键属性决定另一个非键属性， $Z \to D$ | `LecturerID → LecturerName` |
<!-- Sources: W4-2 p.12; Tut W4 Sol p.2-3; Apple Notes FE - Normalisation -->

传递依赖的例子在页面最底：关系 `SubjCode | SubjectName | LecturerID | LecturerName` 以 `SubjCode` 为主键，`LecturerName` 并不是直接由科目决定的，而是“科目 → 讲师编号 → 讲师姓名”绕了一步，所以叫“传递”。

回到 Tutorial 第 2 页底部的 Figure 1：左边绿色大圆是复合主键，里面小方框圈出的是它的一个 **子集**，箭头从这个子集指向非键属性。文字例子： $R(A, B, C, D)$ 主键是 $(A, D)$ ，而 $A \to B$ 、 $D \to C$ ，各自只用了一半的键。

![Tut W4 Sol slide 03 - Transitive dependency figure and Armstrong's axioms](assets/04-normalisation/slide-t04s-03.png)

这一页上半的 Figure 2 画的是传递依赖：两边都是非键属性的圆。正文还补了一句课件没有的话：非键属性如果由 “主键的一部分 + 非键属性” 共同决定，也算传递依赖——关键在于左边 **不是完整的键**。页面下半是 Armstrong 公理的形式定义，接下来对照课件讲。

**易错：** 学生笔记里把传递依赖写成“ $X \to Y$ 且 $Y \to Z$ 推出 $X \to Z$ ”，这其实是下一小节的 **传递律**（一条推理规则）。传递依赖说的是一种 **需要在 3NF 去掉的依赖**：非键决定非键。两者有联系（正因为有传递律，主键才“间接”决定了 `LecturerName`），但不要混为一谈。

### Armstrong 公理

![W4-2 slide 13 - Armstrong's axioms with examples](assets/04-normalisation/slide-w42-13.png)

用 Armstrong 公理可以从已知依赖推出新的依赖：

$$
\text{自反律：} B \subseteq A \Rightarrow A \to B
$$

$$
\text{增广律：} A \to B \Rightarrow AC \to BC
$$

$$
\text{传递律：} A \to B,\ B \to C \Rightarrow A \to C
$$
<!-- Sources: W4-2 p.13; Tut W4 Sol p.3; Apple Notes FE - Normalisation -->

读页面上红字例子时注意每条在做什么：**自反律（reflexivity）** 得到的是“平凡依赖”，右边本来就在左边里（`Student_ID, name → name`）；**增广律（augmentation）** 是给箭头两边同时加上同一个属性（两边都加 `surname`）；**传递律（transitivity）** 是把两条依赖首尾接起来（`ID → birthdate → age`）。
<!-- Sources: W4-2 p.13 -->

#### 理解用例：在库存表上演示三条公理（Tut W12）

已知 `ItemID → Cost/Unit` 和 `Quantity, Cost/Unit → InventoryValue`：

1. 自反律： $\{Dept\} \subseteq \{Dept, Qty\}$ ，所以 `Dept, Qty → Dept`；
2. 增广律：两边同时加上 `Qty`，得 `ItemID, Qty → Cost/Unit, Qty`；
3. 传递律：再接上第二条依赖，得 `ItemID, Qty → InventoryValue`。
<!-- Sources: Tut W12 Sol p.3 -->

<details markdown="1"><summary>延伸内容（可选）：三条附加规则</summary>

学生笔记中整理了由三条公理推出的附加规则，课件没有列出：

| 规则 | 内容 |
| --- | --- |
| 合并律（union） | 若 $X \to Y$ 且 $X \to Z$ ，则 $X \to YZ$ |
| 分解律（decomposition） | 若 $X \to YZ$ ，则 $X \to Y$ 且 $X \to Z$ |
| 伪传递律（pseudotransitivity） | 若 $X \to Y$ 且 $WY \to Z$ ，则 $WX \to Z$ |
<!-- Sources: Apple Notes FE - Normalisation -->

</details>

### 用依赖找候选键

教程练习：关系 $R(A, B, C, D)$ ，依赖为 $AB \to C$ 、 $AC \to B$ 、 $BC \to A$ 、 $B \to D$ 。以 $AB$ 为例： $AB \to C$ ，又因 $B \to D$ ，所以 $AB$ 决定了全部属性；同理 $AC$ （ $AC \to B$ ，再经 $B \to D$ ）和 $BC$ 也是 **候选键（candidate key）**。 $ABC$ 也能决定全部属性，但它不是最小的，只是超键。由于 $B$ 只是候选键的一部分却能决定 $D$ ， $B \to D$ 是部分依赖，要拆成 $R_1(A, B, C)$ 和 $R_2(B, D)$ ；拆完两张表都没有部分依赖或传递依赖，已经是 3NF。
<!-- Sources: Tut W4 Sol p.4-5 -->

<a id="topic-3"></a>
## 3. 未规范化关系与 1NF

### 三步各去掉什么

![W4-2 slide 14 - Steps in normalisation](assets/04-normalisation/slide-w42-14.png)

**范式（normal form）** 是关系按依赖规则整理后达到的状态。看左边三个方框和向下的箭头：三步是 **累进** 的，2NF 以 1NF 为前提，3NF 以 2NF 为前提。右边三句话分别是：

- **1NF**：去掉多值属性和 **重复组（repeating group）**，每个单元格只放一个值（学生笔记称为原子值）；
- **2NF**：去掉部分依赖，所有非键属性由 **整个** 主键决定；
- **3NF**：去掉传递依赖，所有非键属性 **只** 由主键决定，不由其他非键属性决定。
<!-- Sources: W4-2 p.14; Apple Notes FE - Normalisation -->

### 从发票到未规范化关系

![W4-2 slide 15 - Invoice document](assets/04-normalisation/slide-w42-15.png)

课件用一张真实发票走完全程。上半是客户（Bill To / Ship To）和发票级信息（日期、销售员 Charles Wooten），下半表格每行一个产品：ID、描述、单价、数量、金额。一张发票对应多行产品——这就是重复组的来源。

![W4-2 slide 16 - Invoice as a spreadsheet with repeating groups](assets/04-normalisation/slide-w42-16.png)

放进电子表格后，INV0012 那一行的发票号、日期、客户只填一次，下面四行只有产品列有值；红框圈出的就是重复组。右上角红字强调：**这不是关系模型**——关系表不允许“一格对多行”。还要注意 `Amount`（单价 × 数量）和 `Sub Total`（各行金额之和）都是算出来的。

![W4-2 slide 17 - Writing the unnormalised relation](assets/04-normalisation/slide-w42-17.png)

规范化之前先把它写成 **一个** 大关系（未规范化形式，UNF）。页面四条规则：

- 列出必须记录的全部属性；
- 不放能推导出来的东西（例如年龄、`Amount`、`SubTotal`、`TotalDue`）；
- 用圆括号把重复组括起来；
- 标出主键（下划线）。
<!-- Sources: W4-2 p.16-17 -->

页面底部的结果里，括号内 `(ProductNo, ProductDesc, UnitPrice, Qty)` 是重复组，`ProductNo` 带下划线，表示它在组内区分各行。派生值不写进去，原因在 [第 5 节](#topic-5) 的库存例子里看得更清楚：派生列会多出一条依赖，还要时时保持一致。

### 1NF：拆出重复组

![W4-2 slide 19 - Getting to 1NF in the invoice example](assets/04-normalisation/slide-w42-19.png)

做法是把括号里的部分整体搬出去：原关系 `Invoice` 留下发票级属性；搬出去的部分成为新关系 `InvoiceLineItem`，并把 `InvoiceNo` 带过去作外键（红色箭头 FK 指的就是它），这样每一行明细还能找回自己属于哪张发票。

页面最后问新关系的主键是什么。答案是 `(InvoiceNo, ProductNo)`：一张发票有多种产品，单靠 `InvoiceNo` 不唯一；同一种产品出现在很多发票里，单靠 `ProductNo` 也不唯一。于是 `InvoiceNo` 既是外键又是主键的一部分，就是 PFK。
<!-- Sources: W4-2 p.19; Apple Notes FE - Normalisation -->

![W4-2 slide 20 - Summary of steps to 1NF](assets/04-normalisation/slide-w42-20.png)

这一页把 1NF 写成四步：

1. 把括号里的重复组移出，形成两个关系；
2. 给新关系起一个 **有意义的名字**（名字起错，后面 2NF、3NF 也会跟着出错）；
3. 用外键把两张表连起来——想清楚哪一张拿外键；
4. 给两张表定主键，然后再检查一次是否真的唯一。
<!-- Sources: W4-2 p.18-20 -->

**易错：** 外键放在搬出去的那张（“多”的一方）。一张发票对应多行明细，所以是每行明细记住发票号，而不是发票记住一串产品号——后者又变回了多值属性。

<a id="topic-4"></a>
## 4. 2NF 与 3NF

### 2NF：只有复合主键才需要检查

![W4-2 slide 21 - Second normal form applies to composite keys](assets/04-normalisation/slide-w42-21.png)

**只有复合主键的关系才需要检查 2NF**；单属性主键的关系自动满足 2NF——部分依赖要求“依赖于主键的一部分”，而单个属性没有“一部分”。页面紫字因此说 `Invoice` 已经是 2NF，只需要看 `InvoiceLineItem`。

![W4-2 slide 22 - From 1NF to 2NF](assets/04-normalisation/slide-w42-22.png)

`InvoiceLineItem` 的主键是 `(InvoiceNo, ProductNo)`，而 `ProductDesc` 和 `UnitPrice` 只依赖 `ProductNo`——产品描述和单价与哪张发票无关，这是部分依赖。蓝字给出做法：把依赖的属性连同它所依赖的那部分键一起移到新关系。看向下箭头：拆出 `Product(ProductNo, ProductDesc, UnitPrice)`，`InvoiceLineItem` 只剩 `Qty`——数量确实同时取决于“哪张发票”和“哪种产品”。`ProductNo` 留在明细里，既是主键的一部分，也是指向 `Product` 的外键。
<!-- Sources: W4-2 p.21-22 -->

到这里，2NF 的设计是 `Invoice` 不变，加上 `Product` 和缩短后的 `InvoiceLineItem`（课件第 23 页列出这三张表）。学生笔记的说法很直白：`ProductDesc` 和 `UnitPrice` “与 `InvoiceNo` 无关”，所以搬走。
<!-- Sources: W4-2 p.23; Apple Notes FE - Normalisation -->

### 3NF：非键属性不能决定非键属性

![W4-2 slide 24 - Third normal form rules](assets/04-normalisation/slide-w42-24.png)

3NF 的三步：找出非键决定非键的传递依赖；把决定因素和依赖它的字段移到新关系；**原关系保留决定因素作为外键**。页面底部先排除了两张表：`Product` 和 `InvoiceLineItem` 里没有非键决定非键，已经是 3NF。

![W4-2 slide 25 - From 2NF to 3NF](assets/04-normalisation/slide-w42-25.png)

剩下的 `Invoice` 里，`CustomerNo → CustomerName, CustomerAddress`（蓝色）、`ClerkNo → ClerkName`（红色）都是非键决定非键。抽出 `Clerk` 和 `Customer` 两张表后，页面问 `Invoice` 还剩什么：`InvoiceNo` 作主键，`CustomerNo`、`ClerkNo` 斜体作外键，再加 `Date`。
<!-- Sources: W4-2 p.24-25 -->

### 最终结果与 ER 图

![W4-2 slide 26 - Final 3NF relations and ER diagram](assets/04-normalisation/slide-w42-26.png)

左边是五个 3NF 关系，右边是对应的 ER 图：钥匙图标是主键，红色菱形是外键。`Customer` 和 `Clerk` 各自一对多连到 `Invoice`（一位客户、一位职员可以有零张或多张发票）；`Invoice` 一对多连到 `InvoiceLineItem`（一张发票至少一行明细）；`Product` 一对多连到 `InvoiceLineItem`。`InvoiceLineItem` 正是 [02](02-conceptual-er-modelling.md#topic-5) 里消解发票与产品多对多的关联实体。

把三步合在一张表里看，每一步拆出什么、依据哪条依赖：

| 步骤 | 拆出 / 改动 | 依据 |
| --- | --- | --- |
| 1NF | InvoiceLineItem(***InvoiceNo***, **ProductNo**, ProductDesc, UnitPrice, Qty) | 产品行是重复组 |
| 2NF | Product(**ProductNo**, ProductDesc, UnitPrice)；InvoiceLineItem(***InvoiceNo***, ***ProductNo***, Qty) | `ProductNo → ProductDesc, UnitPrice` 是部分依赖 |
| 3NF | Customer(**CustomerNo**, CustomerName, CustomerAddress)；Clerk(**ClerkNo**, ClerkName)；Invoice(**InvoiceNo**, *CustomerNo*, *ClerkNo*, Date) | `CustomerNo → CustomerName, CustomerAddress`、`ClerkNo → ClerkName` 是传递依赖 |
<!-- Sources: W4-2 p.25-26; Apple Notes FE - Normalisation -->

**易错：** 拆走 `CustomerName` 时如果忘了在 `Invoice` 里留下 `CustomerNo`，就再也不知道发票属于谁。每次拆表都要问：原表靠哪一列找回新表？

### 3NF 之后

一般到 3NF 就够了。BCNF（Boyce-Codd 范式）、4NF、5NF、6NF 也有定义，但不在本课考核范围。课件第 30 页列出的考核内容是：规范化过程（1NF → 2NF → 3NF）、函数依赖、Armstrong 公理。
<!-- Sources: W4-2 p.27, 30 -->

<a id="topic-5"></a>
## 5. 把三步用到新表上

### 学生选课记录（课件 Case study 1）

![W4-2 slide 28 - Case study 1 student subject records](assets/04-normalisation/slide-w42-28.png)

课件最后给了一张学生成绩表让我们自己练。看左边三列：Student ID、姓名、生日只在每个学生的第一行填写，下面空着——和发票电子表格一样，右边七列是重复组。再看 INFO90002 在两个学生的行里都配着 Teacher 4、Tanya Linden，说明这份数据里一门科目由同一位教师负责。

学生笔记做了这道题（假设每门科目只由一位教师负责）：

```text
Student(StudentID, StudentName, StudentDOB,
        (SubjectID, SubjectName, SubjectFaculty, TeacherID, TeacherName, WhenTaken, Result))
```

| 范式 | 关系 |
| --- | --- |
| 1NF | Student(**StudentID**, StudentName, StudentDOB)；SubjectRecord(***StudentID***, **SubjectID**, SubjectName, SubjectFaculty, TeacherID, TeacherName, WhenTaken, Result) |
| 2NF | `SubjectName, SubjectFaculty, TeacherID, TeacherName` 只依赖 `SubjectID`，移入 Subject(**SubjectID**, SubjectName, SubjectFaculty, TeacherID, TeacherName)；SubjectRecord(***StudentID***, ***SubjectID***, WhenTaken, Result) |
| 3NF | `TeacherID → TeacherName` 是传递依赖：Teacher(**TeacherID**, TeacherName)；Subject 留下 *TeacherID* |
<!-- Sources: Apple Notes FE - Normalisation -->

**难点：** 先确认主键在业务上真的唯一，再做范式步骤。如果允许重修，同一学生同一科目会出现两次，`SubjectRecord` 的主键要加上 `WhenTaken`；如果每学期换教师，`TeacherID` 就依赖 `(SubjectID, WhenTaken)` 而不是 `SubjectID`，要另建一张“开课”表——正像第 5 页的 Subject Coordinator 用 `(Subject ID, Sem.)` 作主键。

### 房产检查记录（Tut W4）

`StaffPropertyInspection(propertyNo, pAddress, iDate, iTime, comments, staffNo, sName)`，依赖：`propertyNo, iDate → iTime, comments, staffNo, sName`；`propertyNo → pAddress`；`staffNo → sName`。

| 步骤 | 分析 | 结果 |
| --- | --- | --- |
| 1NF | 一处房产有多次检查，`iDate, iTime, comments, staffNo, sName` 是重复组 | Property(**propertyNo**, pAddress)；PropertyInspection(***propertyNo***, **iDate**, iTime, comments, staffNo, sName) |
| 2NF | `Property` 单属性主键；`PropertyInspection` 中没有属性只依赖 `propertyNo` 或只依赖 `iDate` | 不变 |
| 3NF | `staffNo → sName` 是传递依赖 | 增加 Staff(**staffNo**, sName)，PropertyInspection 留下 *staffNo* |
<!-- Sources: Tut W4 Sol p.5-6 -->

为什么 2NF 这一步什么都不用做？因为部分依赖 `propertyNo → pAddress` 在 1NF 时已经随着 `pAddress` 留在 `Property` 里被解决了。重复组选得好，1NF 一步就顺带去掉了部分依赖。

### 派生值直接删掉（Tut W12）

库存表中有 `Quantity, Cost/Unit → InventoryValue`。因为 `InventoryValue = Quantity × Cost/Unit` 是算出来的，处理方法不是拆表，而是 **删掉这个派生列**，需要时再计算。这和第 17 页“不写可推导的属性”是同一条规则：保留派生列就多了一条依赖，数量或单价一改它就可能过时。
<!-- Sources: Tut W12 Sol p.2; W4-2 p.17 -->

这道题的答案还展示了另一点：重复组可以从物品一侧看（一件物品出现在多个部门），也可以从部门一侧看（一个部门有多件物品）。两种写法的 1NF 不同，但继续做完 2NF、3NF 后都得到“物品、部门、库存”三张表——依赖没变，最后的 3NF 就一样。

## 本讲自测

1. 健身房用一张表 `ClassBooking(MemberID, MemberName, ClassID, ClassTime, CoachID, CoachName)` 记录预约，主键是 `(MemberID, ClassID)`。各举一个插入、删除、更新异常，并指出它来自哪一条函数依赖。
2. 关系 `Order(OrderNo, OrderDate, CustNo, CustName)` 的主键是 `OrderNo`。它满足 2NF 吗？满足 3NF 吗？
3. 把 `Borrower(BorrowerID, BorrowerName, (BookID, Title, PublisherID, PublisherName, LoanDate))` 规范化到 3NF，用本篇记号标出主键、外键和 PFK。如果同一读者可以多次借同一本书，主键要怎样改？
4. 关系 $R(A, B, C, D, E)$ 有依赖 $A \to B$ 、 $B \to C$ 、 $AD \to E$ 。找出候选键，指出哪条依赖违反 2NF、哪条违反 3NF，并分解到 3NF。
5. 如果在发票例子的 `InvoiceLineItem` 里保留 `Amount` 列，它函数依赖于哪些属性？为什么课件选择一开始就不写它，而不是在 3NF 再拆出去？
