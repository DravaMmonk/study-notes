# INFO90002 Week 11 - Web Applications and Databases

来源：`lecture/INFO90002_Week11-1_WebApps.pdf`；Apple Notes：CS/25S1/DB — "FE - Web Apps"。

这篇讲的是：**终端用户怎样通过应用程序访问数据库？业务逻辑放在哪里？Web 应用从浏览器请求到数据库查询是怎样一步步完成的？**

学习路线：[SQL 的局限与业务逻辑](#topic-1) → [应用体系结构：一层到三层](#topic-2) → [Web 应用怎样工作](#topic-3) → [从页面到数据库与 Web 服务](#topic-4)。

重点：表示逻辑、业务逻辑、存储逻辑的分布；两层与三层架构的优缺点；静态与动态网页。难点：逻辑层数与物理层数的区别。易错：Web 架构是三层（或四层）架构的一种特殊形式，而不是另一种东西。

<a id="topic-1"></a>
## 1. SQL 的局限与业务逻辑

SQL 是声明式的、直观的、多用途的，但：

- 不能用 SQL 表达所有可能的查询；
- 需要执行超出域完整性和参照完整性的业务规则；
- 需要循环、判断等过程化结构；
- 你会给终端用户一个查询浏览器吗？不会——需要既友好又能约束用户的界面。
<!-- Sources: W11-1 p.3; Apple Notes FE - Web Apps -->

![Slide 04 - Business logic](assets/14-web-applications/slide-04.png)

左栏两个蓝色标题是两段业务逻辑。以第一段为例：**业务逻辑（business logic）** 例子：顾客下单——接收输入；在 `Order` 表插一行；对每种商品检查库存，够就在 `OrderItem` 插一行，并更新库存和顾客欠款；没出错就成功结束。右栏列出这里需要的东西：顺序（多个步骤依次执行）、迭代（循环）、控制流（条件判断）和用户界面，正是过程式编程语言擅长的；SQL 专门负责底层的数据访问。第二段“从储蓄账户转钱到信用卡”就是 [08](08-transactions-concurrency.md#topic-1) 的转账事务，这里看到的是包在它外面的程序逻辑。
<!-- Sources: W11-1 p.4 -->

<a id="topic-2"></a>
## 2. 应用体系结构：一层到三层

### 三种逻辑

![Slide 07 - Presentation, business and storage logic](assets/14-web-applications/slide-07.png)

右下三个方框“用户界面 ↔ 应用软件 ↔ 数据存储”就是三种逻辑的位置，左边逐一说明它们负责什么：

| 逻辑 | 负责 |
| --- | --- |
| 表示逻辑（presentation logic，即用户界面 UI） | 输入（键盘、触屏、语音、传感器、条码）和输出（大屏、打印机、手机、ATM） |
| 业务逻辑（business logic） | 处理输入和命令，执行业务规则 |
| 存储逻辑（storage logic） | 数据持久存储，执行数据完整性 |
<!-- Sources: W11-1 p.7; Apple Notes FE - Web Apps -->

![Slide 08 - Multi-tiered architectures](assets/14-web-applications/slide-08.png)

图中三行分别是两层（客户端直接连带数据库的服务器）、三层（客户端—Web 服务器—数据库服务器）、四层（客户端—Web 服务器—应用服务器—数据库服务器）。层数越多，三种逻辑被拆得越开。
<!-- Sources: W11-1 p.8 -->

### 演变：大型机 → 客户端/服务器 → Web

| 架构 | 怎样分工 | 评价 |
| --- | --- | --- |
| 一层：大型机 / 哑终端 | 一台大计算机处理所有逻辑，终端不处理；用嵌入式 SQL、报表生成器 | 不能随用户数扩展 |
| 两层：客户端/服务器 | 服务器是关系 DBMS，负责数据存储和访问；SQL 发到服务器，返回原始数据；表示和业务逻辑在客户端应用中（如 1990–2000 年代的 Visual Basic） | 见下表 |
| 三层 | 客户端程序 ↔ 应用服务器 ↔ 数据库服务器 | 见下表 |
| Web 架构 | 一种特殊的三层或四层架构 | 见下表 |
<!-- Sources: W11-1 p.9-11, p.15; Apple Notes FE - Web Apps -->

![Slide 12 - Two-tier example](assets/14-web-applications/slide-12.png)

两层例子（Hoffer 教材图）：三台客户端通过局域网（LAN）把“数据请求”发给数据库服务器，服务器只送回“选中的数据”。每台客户端都要装完整的应用程序。

![Slide 13 - Distribution of processing logic](assets/14-web-applications/slide-13.png)

两层结构中处理逻辑可以放在客户端、服务器或两者：左边“胖客户端”把处理逻辑和表示逻辑都放在客户端；中间“瘦客户端”只把表示逻辑放在客户端，处理逻辑在服务器；右边“分布式”让处理逻辑跨客户端和服务器两边。
<!-- Sources: W11-1 p.13 -->

![Slide 15 - Three-tier architecture](assets/14-web-applications/slide-15.png)

![Slide 16 - Three-tier example](assets/14-web-applications/slide-16.png)

第一页左栏把三种逻辑分配给三层：客户端只管界面（更瘦，可能几乎不存数据，甚至没有硬盘），应用服务器管业务逻辑，数据库服务器管持久化和访问。第二页把两层例子改画成三层：客户端层、业务层（应用服务器）、数据库层，三者都挂在同一个 LAN 上。

**难点：逻辑层与物理层。** 第一页右栏的蓝字：三层架构有 3 个逻辑层，但物理层可能只有 2 个或 3 个——应用服务器和数据库服务器可以运行在同一台计算机上。
<!-- Sources: W11-1 p.15 -->

**理解用例（课件练习）：** 用 MySQL Workbench 连接 MySQL Server，是两个逻辑层（Workbench 负责界面，MySQL Server 负责存储）。连学校工程服务器时，两者在两台计算机上，是两个物理层；MySQL 装在自己电脑上时，两者在同一台计算机上，只有一个物理层。
<!-- Sources: W11-1 p.20 -->

| | 两层（client-server） | 三层 | 三层（基于 Web） |
| --- | --- | --- | --- |
| 优点 | 客户端和服务器分担负载；数据集中处理，完整性好；存储过程可以把部分业务规则放在数据库服务器上 | 可扩展；技术灵活（容易改业务逻辑）；任一组件都容易替换；长期成本低；更安全（用户机器只做表示） | 人人都有浏览器；不必安装和维护客户端软件；HTML 和 HTTP 简单、被广泛支持；可以全球访问数据库 |
| 缺点 | 表示、业务逻辑和数据模型在客户端缠在一起；数据库模式一改，所有客户端都坏；更新要部署到每个客户端；每个客户端一个数据库连接，难扩展；难以扩展到组织之外（客户、供应商）；互操作问题 | 短期成本高；需要工具和培训；设计复杂；标准不统一 | 中间层更复杂；标准简单意味着难做复杂应用；全球访问意味着安全隐患 |
<!-- Sources: W11-1 p.14-18; Apple Notes FE - Web Apps -->

### 多层应用中的安全

网络环境带来复杂的安全问题，可以在不同层次实施安全：应用密码（控制谁能使用应用软件）、数据库级安全（决定对表的访问权限，见 [13](13-security-backups.md#topic-1)）、加密的客户端/服务器通信。
<!-- Sources: W11-1 p.19 -->

<a id="topic-3"></a>
## 3. Web 应用怎样工作

### 为什么做 Web 应用

浏览器无处不在；外部客户不必安装客户端软件；通信协议简单；与平台和操作系统无关（可互操作）；开发时间和成本降低；促成了电子政务、电子商务、B2B、B2C。
<!-- Sources: W11-1 p.25 -->

![Slide 25 - Web app request flow](assets/14-web-applications/slide-25.png)

页底的小图按编号走一圈：1. 客户端提交表单输入给 Web 服务器；2. Web 服务器向数据库服务器发 DML；3. 数据库返回记录集；4. Web 服务器把结果做成 HTML 发回客户端。右边的练习请你把应用服务器单独画成一台机器——那就成了四层。

![Slide 24 - Architecture of a web app](assets/14-web-applications/slide-24.png)

一个 Web 应用的结构：公网上的客户端通过互联网（TCP/IP）经过防火墙到达 Web 服务器，Web 服务器再访问数据库服务器；组织内网（intranet，右边绿框）里的内部客户端，以及合作方的外联网（extranet）客户端，也通过浏览器访问。
<!-- Sources: W11-1 p.24 -->

### Web 基础设施的术语

| 术语 | 含义 |
| --- | --- |
| 浏览器（browser） | 取回并显示 HTML 文档的软件 |
| Web 服务器（web server） | 响应浏览器请求、发送 HTML 等文档的软件 |
| 网页（HTML 文档） | 静态网页的内容在开发时确定；动态网页的内容用数据库中的数据动态生成 |
| 万维网（WWW） | 全世界 Web 服务器上相互链接的超文本文档的总和 |
| 互联网（Internet） | 承载 WWW（以及电子邮件、聊天等）的全球网络基础设施 |
<!-- Sources: W11-1 p.26 -->

### 网页语言

| 语言 | 作用 | 层次 |
| --- | --- | --- |
| HTML（超文本标记语言） | 定义网页的内容和结构 | 结构化内容 |
| CSS（层叠样式表） | 控制 HTML 文档的外观 | 表示 |
| JavaScript | 让 HTML 文档具有交互性 | 行为与交互 |
| XML（可扩展标记语言） | 在 Web 服务之间传输数据 | 数据交换 |
<!-- Sources: W11-1 p.27-28; Apple Notes FE - Web Apps -->

![Slide 28 - Build web pages bottom up](assets/14-web-applications/slide-28.png)

建网页要“自下而上”（底部蓝字）：先用 HTML 描述内容，再用 CSS 呈现，最后用脚本控制行为；两条剪刀虚线表示三者分开写。右边的大箭头说明越往上，用户体验越丰富。
<!-- Sources: W11-1 p.28 -->

### HTML 文档的结构

![Slide 30 - HTML document tree](assets/14-web-applications/slide-30.png)

左边是代码，右边是同一份文档的树形视图：根元素是 `<html>`，通常只有两个子元素 `<head>` 和 `<body>`；`<head>` 里有 `<meta>`、`<title>` 等；`<body>` 里可以有 `<div>`、`<table>` 等，再往下是 `<h1>`、`<p>`、`<tr>`、`<th>`、`<td>`。
<!-- Sources: W11-1 p.29-30 -->

![Slide 31 - A browser displays a basic web page](assets/14-web-applications/slide-31.png)

箭头把右边源代码里的 `<title>`、`<h1>`、两个 `<p>` 分别连到左边浏览器里的标签页标题、大标题和两段文字——同一份 HTML，浏览器把它“渲染”成看到的样子。

| 元素 | 用途 |
| --- | --- |
| `<h1>` … `<h6>` | 标题，`<h1>` 最大，`<h6>` 最小 |
| `<p>` | 段落，浏览器在每段前插入空行 |
| `<ol>` / `<ul>` 与 `<li>` | 有序列表（1. 2. 3.）/ 无序列表（圆点） |
| `<table>`、`<caption>`、`<tr>`、`<th>`、`<td>` | 表格、标题、行、表头单元格（默认加粗居中）、数据单元格；边框等样式应交给 CSS |
| `<form>` | 让用户输入数据并提交到服务器，服务器据此显示信息、写入数据库或发邮件 |
<!-- Sources: W11-1 p.31-34 -->

![Slide 33 - HTML table](assets/14-web-applications/slide-33.png)

蓝色箭头把 `<caption>`、表头行 `<th>` 和数据行 `<td>` 对到右边的显示效果；右边注释提醒 `<th>` 默认加粗居中，左上注释说 `border` 属性已经过时，样式应交给 CSS。下面是同一结构的精简版：

```html
<html lang="en">
  <head><title>Monthly savings</title></head>
  <body>
    <h1>Savings</h1>
    <table>
      <tr><th>Month</th><th>Savings</th></tr>
      <tr><td>January</td><td>$100</td></tr>
    </table>
  </body>
</html>
```
<!-- Sources: W11-1 p.30, p.33 -->

### 一次请求—响应

Web 服务器由一台联网、运行操作系统的计算机，接收和响应 HTTP 请求（能同时处理多个请求）的 Web 服务器软件，以及一组要提供的文档组成；对内容要有仔细的访问控制。
<!-- Sources: W11-1 p.35 -->

![Slide 37 - Server maps the URL to a file](assets/14-web-applications/slide-37.png)

![Slide 38 - Server sends headers and the file](assets/14-web-applications/slide-38.png)

课件用四页动画演示一次静态请求，这里保留中间两页。第一页：客户端发出 `GET http://www.server.com/home.html`，服务器把 URL 映射到硬盘上的 `C:\htmldocs\home.html`；第二页：服务器把这份文件原样发回，前面加上服务器生成的头信息。完整四步是：

1. 客户端用 HTTP 向 Web 服务器请求文档，请求的形式是一个 URL；
2. Web 服务器把 URL 映射到本地资源（如硬盘上的 `C:\htmldocs\home.html`）找到文件；
3. 服务器把文件原样发回，并附上服务器生成的头信息（给浏览器的控制信息）；
4. 浏览器解释并显示（渲染）这份 HTML 文档。
<!-- Sources: W11-1 p.36-39 -->

### 静态网页与动态网页

![Slide 40 - Static vs dynamic web pages](assets/14-web-applications/slide-40.png)

| | 静态网页 | 动态网页 |
| --- | --- | --- |
| URL 指向 | 服务器文件系统中的一个文件 | 一个要运行的程序 |
| 服务器做什么 | 取出文件发给浏览器 | Web 应用运行程序，程序通常从数据库取数据 |
| 内容 | 文件里就是 HTML | 用循环把查询结果填进表格、列表等元素：例如 `SELECT * FROM Product;` 返回一组产品，对每个产品输出一行 HTML 表格 |
<!-- Sources: W11-1 p.40; Apple Notes FE - Web Apps -->

**理解用例（自拟）：** 显示“当前所有商品价格”的页面应该是动态的——价格存在数据库里并会变动，页面要在每次请求时查询，再用循环生成表格；做成静态文件，每次改价都得手工改 HTML。

<a id="topic-4"></a>
## 4. 从页面到数据库与 Web 服务

### 老式 Web 应用的问题

![Slide 42 - SQL within PHP](assets/14-web-applications/slide-42.png)

课件中的 PHP 例子把三件事写在同一个文件里：左栏连接数据库（`mysqli_connect`、选库）并执行 `SELECT regNo, colour, price FROM car WHERE …`；右栏用 `while` 循环逐行取结果，`echo` 出 `<tr><td>…</td></tr>`。问题：
<!-- Sources: W11-1 p.42 -->

- 把原始 SQL 直接放进 PHP/HTML，表示、业务和数据库逻辑混在一起，需求一变就难维护；最佳实践是分离各部分，例如 MVC（模型—视图—控制器）；
- 大量重复造轮子：每个开发者自己写登录安全、页面模板、数据库访问；
- 客户端种类越来越多（手机、平板），要为不同平台手工编程。

因此出现了 **Web 应用框架**，如 Ruby on Rails、.NET、Symfony、AngularJS、Django。
<!-- Sources: W11-1 p.41 -->

**补充：** 这种把用户输入直接拼进 SQL 字符串的写法，也正是 [13](13-security-backups.md#topic-4) 里 SQL 注入的来源。

### Web 服务

万维网让 **人** 访问远程数据库；**Web 服务** 让 **计算机** 访问远程数据库，即应用到应用（A2A）的通信。Web 服务是与远程组件交互的基于 Web 的接口，不管组件在哪里、是什么、运行在什么环境；本质上是在网络某个端口监听请求的软件。它为企业内外的应用提供简单可靠的连接方式，与平台无关、可被发现、能自我描述。
<!-- Sources: W11-1 p.43 -->

<details markdown="1">
<summary>延伸内容（可选）：SOAP 与 REST</summary>

![Slide 44 - SOAP and REST](assets/14-web-applications/slide-44.png)

课件右上角标为 OPTIONAL。两种主要做法都定义了怎样构建 API，让 Web 应用之间传递数据：

- **SOAP**（简单对象访问协议）：运行在 HTTP 上的文本消息协议，客户端和服务器之间用 XML 交换消息；
- **REST**（表述性状态转移）：一种客户端—服务器架构风格而非协议；名词是用 URI 标识的资源，结构化数据通常以 XML 或 JSON 返回；动词与 DML 对应：`GET` ↔ `SELECT`，`POST` ↔ `INSERT`，`PUT` ↔ `UPDATE`，`DELETE` ↔ `DELETE`。
<!-- Sources: W11-1 p.44 -->

</details>

![Slide 45 - XML and JSON data formats](assets/14-web-applications/slide-45.png)

Web 服务交换数据常用的两种格式是 JSON 和 XML。页上用同一组三名员工对照两种写法：JSON 用一个 `employees` 数组装三个对象；XML 用嵌套的开闭标签，`<employees>` 里三个 `<employee>`。JSON 的语法见 [12](12-nosql-json.md#topic-4)。
<!-- Sources: W11-1 p.45 -->

## 本讲自测

1. 列出两个只用 SQL 难以完成、需要业务逻辑的需求。
2. 公司内部的库存系统用 Visual Basic 写成，每台电脑都装客户端，直接连数据库。现在要让供应商也能查询库存。指出两层架构的哪些缺点会显现，并说明改为基于 Web 的三层架构的好处和新风险。
3. 一个网站的 Web 服务器、应用服务器和数据库服务器都部署在同一台云主机上。它有几个逻辑层、几个物理层？
4. 一个订单查询页面要求“输入订单号，显示订单明细”。按请求—响应的步骤描述从浏览器到数据库再回到浏览器的过程，并指出哪一步体现了“动态网页”。
