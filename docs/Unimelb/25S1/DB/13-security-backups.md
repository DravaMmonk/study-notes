# INFO90002 Week 10 - Database Security and Backups

来源：`lecture/INFO90002_Week10-2_DbSecurity.pdf`；Apple Notes：CS/25S1/DB — "FE - DB Security"。

这篇讲的是：**怎样控制谁能对数据做什么？怎样保护传输和存储中的数据？数据丢了怎么找回来？最常见的 SQL 注入攻击是怎么回事，又怎么防？**

学习路线：[访问控制](#topic-1) → [技术防护：防火墙与加固](#topic-2) → [数据防护：加密与备份](#topic-3) → [降低数据丢失风险与 SQL 注入](#topic-4)。

重点：DAC、MAC、RBAC 的区别；物理/逻辑、在线/离线、完全/增量备份。难点：备份策略的组合；复制、集群、RAID 各能防什么。易错：复制和 RAID 不能代替备份；拼接用户输入构造 SQL 会被注入。

<a id="topic-1"></a>
## 1. 访问控制

### 政策、模型与机制

![Slide 03 - Access control policy, model and mechanism](assets/13-security-backups/slide-03.png)

页上三个不加粗的小标题从上到下是三层，每一层括号里写着谁负责：

| 层次 | 内容 | 负责方 |
| --- | --- | --- |
| 访问控制政策（policy） | 高层规则：授予、撤销或拒绝对数据库的访问 | 人与流程，由数据管理员 / CDO / CSO 负责（见 [09](09-dbms-architecture-administration.md#topic-1)） |
| 访问控制模型（model） | 把政策形式化：识别执行任务的人或进程的角色，检查该角色的权限，批准或拒绝 | 流程 |
| 访问控制机制（mechanism） | 执行政策的手段 | 数据与技术 |
<!-- Sources: W10-2 p.3 -->

#### 人事数据的三层

![Slide 04 - Access control system example](assets/13-security-backups/slide-04.png)

这一页把三层落到一个具体例子上，右下的小表列出四位员工的角色（人事经理、薪资经理、人事专员、薪资文员）：

- 政策：只有人事经理和薪资经理能看员工的全部信息；人事专员和薪资文员不能看出生日期；
- 模型：两类经理直接看完整的员工表，其他角色只能通过一个不含出生日期的视图访问；
- 机制：基于角色的访问控制（RBAC）——建视图并只把视图授权给专员角色：
<!-- Sources: W10-2 p.4 -->

```sql
CREATE VIEW V_EMPLOYEE AS
SELECT employeeid, firstname, lastname, departmentid, bossid, salary
FROM employee;                       -- 不含 DateOfBirth

GRANT SELECT ON V_EMPLOYEE TO HRstaff;
```
<!-- Sources: W10-2 p.4 -->

视图用于隐藏数据的原理见 [07](07-sql-subqueries-views.md#topic-4)。

### 三种访问控制类型

![Slide 06 - Discretionary access control](assets/13-security-backups/slide-06.png)

**自主访问控制（DAC, Discretionary）**：数据所有者（或获授权的用户）为特定用户或组定义权限。右栏说明授权是一个三元组——主体（用户）、客体（表）、动作（DML、DDL、查询）；具体形式有授权表、访问控制列表、能力表。

![Slide 07 - DAC in operating systems and MySQL](assets/13-security-backups/slide-07.png)

左下的 Windows 权限框（完全控制、修改、读取……逐项勾选）和小图“所有者 → 指定用户/组 → 对象”都是 DAC：文件所有者自己决定谁能做什么。右边蓝字是 MySQL 里给用户 `lindent` 授的一串权限，说明 DBA 也用 DAC 控制谁能创建数据库，阻止未授权用户注册自定义例程。

![Slide 08 - Mandatory and role-based access control](assets/13-security-backups/slide-08.png)

**强制访问控制（MAC, Mandatory）**：右上的竖轴从“绝密”到“未分级”排列 **数据机密级别**，系统按它和 **用户许可级别** 决定访问，“按需知密”。向上的箭头被红叉划掉，表示数据所有者不能自行把对象从绝密降到机密，也不能决定谁有绝密许可。右下角是 **基于角色的访问控制（RBAC, Role-Based）**：权限关联到角色，再把角色分配给用户，例如 Unix / Linux / Mac 用户组、学习管理系统 LMS。

| 类型 | 谁决定权限 | 特点与例子 |
| --- | --- | --- |
| 自主访问控制（DAC, Discretionary） | 数据所有者（或获授权的用户）为特定用户或组定义权限 | 授权是一个三元组：主体（用户）、客体（表）、动作（DML、DDL、查询）；形式有授权表、访问控制列表、能力表；UNIX、Windows、Linux 文件权限，Google Drive / OneDrive 共享 |
| 强制访问控制（MAC, Mandatory） | 由系统按 **数据机密级别** 和 **用户许可级别** 决定，“按需知密” | 军事系统：数据所有者不能决定谁有绝密许可，也不能把对象从绝密改成机密 |
| 基于角色的访问控制（RBAC, Role-Based） | 权限与角色关联，再把角色分配给用户 | Unix / Linux / Mac 用户组、学习管理系统 LMS |
<!-- Sources: W10-2 p.5-8; Apple Notes FE - DB Security -->

DBA 可以用 DAC 控制谁能创建数据库，阻止未授权用户注册自定义例程。课件也提到单点登录（SSO，一个 ID 登录多个相关但独立的系统）和 Active Directory 作为相关机制。
<!-- Sources: W10-2 p.7-8 -->

### MySQL 的访问控制

两种做法：为每个用户单独授权（例如 `GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, … ON … TO 某用户`），或者把权限关联到角色，再把角色分配给用户（RBAC）。权限可以授在四个层次：全局（所有数据库）、数据库、表、列。
<!-- Sources: W10-2 p.7, p.9 -->

<a id="topic-2"></a>
## 2. 技术防护：防火墙与加固

![Slide 10 - Firewalls and the DMZ](assets/13-security-backups/slide-10.png)

右图从左到右是互联网、两道绿色防火墙夹出的隔离区（DMZ）、内网 LAN 和数据库。折线表示数据包必须经过不同端口（Port x、Port y）层层转发，才能到达内网的数据库端口。

**防火墙（firewall）** 是组织内网（LAN）与广域网 / 互联网之间的保护层：软件或专用软硬件设备，有选择地拦截或放行数据包；所有网络流量都被隔离检查和认证；常有多层多种防火墙，中间可设隔离区（DMZ）。MySQL 默认使用 3306 端口，数据库服务器应放在防火墙之后。
<!-- Sources: W10-2 p.10; Apple Notes FE - DB Security -->

![Slide 26 - Database hardening checklist](assets/13-security-backups/slide-26.png)

课件在后面给出 **数据库加固清单（database hardening）**，它和防火墙同属技术防护，所以放在这里一起读：

- 物理加固：让人更难进入机房；
- 数据库服务器的防火墙；
- 数据库软件、应用 / Web 服务器和应用代码：定期打补丁，持续检查漏洞；
- 超级用户账号、权限和密码；用户角色、权限、密码和报告；
- 审计；
- 备份与恢复；
- 客户端工作站 / 浏览器：最小权限原则。
<!-- Sources: W10-2 p.26 -->

<a id="topic-3"></a>
## 3. 数据防护：加密与备份

### 加密

![Slide 11 - Encryption with prime numbers](assets/13-security-backups/slide-11.png)

![Slide 12 - Public and private keys](assets/13-security-backups/slide-12.png)

第一页右图：私钥是两个很大的秘密素数，公钥是它们的乘积——由乘积反推出两个素数非常困难。第二页的流程图从左往右读：发送方用 **接收方的公钥** 加密文档（锁上），只有接收方用自己的 **私钥** 才能解开。

加密把明文变成 `*k4#h2nsk7` 这样的乱码，依赖很大的素数运算；之后还可以“加盐”（salting），在加密串上再加一两个字节。**加密不是隐藏数据，而是遮蔽数据。** 公钥 / 私钥方式：公钥公开；A 用 B 的公钥加密敏感信息发出，只有 B 能用对应的私钥解密。
<!-- Sources: W10-2 p.11-12 -->

| | 静态加密（encryption at rest） | 传输加密（encryption in transit） |
| --- | --- | --- |
| 保护什么 | 存储着的、静态的数据（如磁盘上） | 从一个位置移动到另一个位置的数据（互联网、私有网络、服务之间） |
<!-- Sources: W10-2 p.13; Apple Notes FE - DB Security -->

| 静态加密类型 | 做法 |
| --- | --- |
| 应用级加密 | 修改或生成数据的应用自己加密，不依赖数据库和文件系统 |
| 数据库加密 | 整个数据库或其中某些表被加密 |
| 文件系统加密 | 只加密选定的文件系统或文件夹；谁都能启动设备，但访问受保护的文件系统要口令 |
| 全盘加密 | 整个硬盘数据都变成乱码；启动设备的唯一方法是输入密码 |
<!-- Sources: W10-2 p.13; Apple Notes FE - DB Security -->

### 为什么备份

备份是数据的一份拷贝。数据损坏、被删除或被勒索时，可以从备份恢复。需要一套备份与恢复策略：规划怎样备份、怎样恢复。备份能防：人为错误（误删表）、硬件或软件故障（应用 bug，硬盘、CPU、内存故障）、恶意活动（服务器、数据库、应用被攻破）、自然或人为灾难；还帮助满足政府法规（历史归档、元数据收集、隐私规则）。
<!-- Sources: W10-2 p.15-17 -->

![Slide 18 - Categories of failure](assets/13-security-backups/slide-18.png)

右侧三个小例子分别对应三类故障：把 `salary` 写成 `celery` 是语句失败；“无法连接到服务器”是网络失败；`DROP table employee;` 之后才想 `Rollback` 是用户错误。页上的问号在问“这会怎样”：延伸内容——`DROP` 是 DDL，在 MySQL 里会隐式提交，所以后面的 `Rollback` 救不回来，只能靠备份。

| 故障类别 | 例子 |
| --- | --- |
| 语句失败 | 语法错误，例如把 `salary` 写成 `celery` |
| 用户进程失败 | 执行工作的进程出错或死掉，例如 Workbench 崩溃 |
| 网络失败 | 用户与数据库之间断网 |
| 用户错误 | 用户“不小心”删了行、表或库，例如 `DROP TABLE employee;` |
| 内存失败 | 内存故障或损坏 |
| 介质失败 | 磁盘故障、损坏、被删 |
<!-- Sources: W10-2 p.18 -->

### 备份的类型

![Slide 19 - Physical vs logical backups](assets/13-security-backups/slide-19.png)

左右两栏逐行对照，下表是它的中文整理：

| | 物理备份（physical） | 逻辑备份（logical） |
| --- | --- | --- |
| 怎么做 | 用操作系统复制原始的文件和目录 | 通过 SQL 查询导出（`mysqldump`、`SELECT … INTO OUTFILE`） |
| 速度与大小 | 快，适合需要快速恢复的大数据库 | 慢，输出比物理备份大 |
| 内容 | 数据库目录和文件的精确拷贝，**应包含日志** | 不含日志和配置文件 |
| 可移植性 | 只能移到配置相近的机器 | 与机器无关 |
| 备份时数据库 | 最好离线（冷备份）；MySQL Enterprise 会自动处理文件锁 | 服务器保持可用 |
| 恢复 | 关闭 DBMS，把备份拷回磁盘覆盖 | 用 `mysqlimport` 或客户端里的 `LOAD DATA INFILE`，不必停库 |
<!-- Sources: W10-2 p.19; Apple Notes FE - DB Security -->

![Slide 20 - Online vs offline backups](assets/13-security-backups/slide-20.png)

注意两栏最后一行的蓝字：在线备份可以是物理或逻辑的，离线备份只能是物理的。

| | 在线 / 热备份（online, hot） | 离线 / 冷备份（offline, cold） |
| --- | --- | --- |
| 数据库状态 | 运行中，客户端察觉不到 | 已停止 |
| 要求 | 需要适当加锁以保证数据完整 | 避免复制正在更新的数据，操作更简单 |
| 停机 | 无停机 | 有停机，所以不适合不能停机的应用 |
| 适用 | 物理和逻辑备份 | 只能物理备份 |
<!-- Sources: W10-2 p.20; Apple Notes FE - DB Security -->

![Slide 21 - Full vs incremental backups](assets/13-security-backups/slide-21.png)

右栏的四步恢复流程是本页重点：增量备份大多只是日志文件，恢复时要让 DBMS 重做（redo）它们——这正是 [08](08-transactions-concurrency.md#topic-6) 事务日志的用途。

| | 完全备份（full） | 增量备份（incremental） |
| --- | --- | --- |
| 备份什么 | 整个数据库，包含恢复运行所需的一切 | 只备份自上次备份以来的变化；对大多数数据库来说就是日志文件 |
| 方式 | 物理（在线或离线）或逻辑（在线） | |
| 恢复 | 直接还原 | 1. 停库；2. 把备份的日志拷回磁盘；3. 启动数据库；4. 让 DBMS **重做（redo）** 这些日志 |
<!-- Sources: W10-2 p.21; Apple Notes FE - DB Security -->

### 备份策略与异地备份

![Slide 22 - Backup strategy](assets/13-security-backups/slide-22.png)

右上的柱状图：周日（Su）是高高的完全备份，周一到周五（Mo–Fr）各是一个小三角，表示只备份当天的变化（Delta），下一个周日再做完全备份。

- 通常组合完全和增量备份，例如每周一次完全备份、工作日每天增量备份；
- 在数据库负载低的时候备份；
- 有复制的数据库，就用镜像库做备份，避免影响主库性能；
- **在需要备份之前先测试备份能不能用！**
<!-- Sources: W10-2 p.22; Apple Notes FE - DB Security -->

![Slide 23 - Offsite backup](assets/13-security-backups/slide-23.png)

**异地备份（offsite）**：如果备份和网络连着，黑客仍可能接触到它。异地是指备份不放在组织自己的建筑里，以支持灾难恢复和业务连续性。例如监管机构要求备份地点在 100 公里以外；把备份磁带运到地下金库；通过复制维护远程镜像库；备份到云。右下小图表示服务器到异地备份之间的传输也要加密。
<!-- Sources: W10-2 p.23 -->

<a id="topic-4"></a>
## 4. 降低数据丢失风险与 SQL 注入

### 复制、集群与 RAID 各能防什么

![Slide 25 - Other ways to reduce risk of data loss](assets/13-security-backups/slide-25.png)

三张小表的结构相同：问题 × 保护效果，红字表示保护不住。把三张合在一起：

| 措施 | 误删表或行 | 服务器故障 | 安全被攻破 |
| --- | --- | --- | --- |
| 服务器复制（replication） | 数据丢失（误删也会被复制过去） | 受保护 | 保护有限 |
| 服务器集群（cluster） | 数据丢失 | 受保护 | 保护有限 |
| RAID（独立磁盘冗余阵列） | 数据丢失 | 数据可能丢失 | 全部数据被泄露 |
<!-- Sources: W10-2 p.25; Apple Notes FE - DB Security -->

**易错：** 三张表第一行都是红色的 “data loss!”——这三种措施都挡不住“误删”。误删会被原样复制到从库，RAID 也照样保存删除后的状态。能从误删中恢复的只有备份（加上日志）。

### SQL 注入

![Slide 27 - OWASP top ten](assets/13-security-backups/slide-27.png)

OWASP（开放 Web 应用安全项目）列出了最常见的十大 Web 应用漏洞。左列是 2017 版，注入（Injection）排第一；右列 2021 版里它降到第三，但仍在前十。

![Slide 29 - SQL built from user input](assets/13-security-backups/slide-29.png)

**SQL 注入** 利用 Web 应用把用户输入直接拼进数据库查询的做法：在输入框中填入恶意代码，使其成为 SQL 命令的一部分并在数据库上执行。攻击者的目标：摸清数据库结构（表名、列名）、查看重要表中的数据（如客户账户）、往表里添数据（如新账号和密码）。
<!-- Sources: W10-2 p.27-28; Apple Notes FE - DB Security -->

左边是登录框和查询模板，`@name`、`@pw` 是待填的位置；右边是程序员原本的意图：把用户名和密码填进模板。

```sql
SELECT * FROM User
WHERE username = '@name' AND password = '@pw';
-- 正常输入 Anne / pass123 时：
SELECT * FROM User
WHERE username = 'Anne' AND password = 'pass123';
```
<!-- Sources: W10-2 p.29 -->

![Slide 30 - Malicious input](assets/13-security-backups/slide-30.png)

攻击者在用户名框里填 `' or 1=1; --`，密码随便填：

```sql
SELECT * FROM User
WHERE username = '' or 1=1; -- ' and password = 'any text';
```
<!-- Sources: W10-2 p.30 -->

右边四条正是这段输入做的四件事：第一个 `'` 闭合了字符串；`or 1=1` 加上一个永远为真的条件；`;` 结束语句；`--` 开始注释，让后面的密码检查失效。用户名为空当然不成立，但 `1=1` 永远为真，于是查询返回所有用户，登录被绕过。
<!-- Sources: W10-2 p.30 -->

![Slide 31 - SQL injection prevention](assets/13-security-backups/slide-31.png)

| 防御 | 做法 |
| --- | --- |
| 主要：预编译语句（prepared statements，参数化查询） | 把输入作为参数传入，SQL 结构固定，不再“动态”拼接 |
| 主要：存储过程（stored procedures） | 把输入作为参数传给存储过程，而不是在代码里拼 SQL 字符串 |
| 主要：转义所有用户输入 | 把 `'`、`;`、`--` 等 SQL 特殊字符变成普通字符；过滤 `OR`、`UNION` 等 |
| 附加：最小权限原则 | 不给应用账号 DBA 权限 |
| 附加：白名单输入验证 | 检查输入是否来自可接受值的列表 |
<!-- Sources: W10-2 p.28, p.31; Apple Notes FE - DB Security -->

**理解：** 参数化之后，整段输入只被当作“用户名”这个值本身，`'`、`;`、`--` 都不再有 SQL 含义，因此不会改变查询结构——数据库只是找不到叫这个名字的用户，登录失败。

**补充：** 在第 14 讲的多层架构里，安全可以在多个层次实施：应用密码、数据库级权限、加密的客户端/服务器通信（见 [14](14-web-applications.md#topic-2)）。
<!-- Sources: W11-1 p.19 -->

## 本讲自测

1. 大学规定“只有课程协调人能看全班成绩，助教只能看自己辅导组的成绩”。用政策—模型—机制三层描述实现方法。
2. 一个 7×24 运行的电商数据库，能做冷备份吗？推荐什么组合？
3. 某公司做了主从复制和 RAID，就取消了备份。一名实习生误执行了 `DROP TABLE orders;`，会怎样？
4. 下面三种做法哪些能防 SQL 注入，哪些只是附加防线或根本无效：把输入作为参数传给存储过程；给应用账号 DBA 权限以便排错；只允许从下拉列表中选择的值？
