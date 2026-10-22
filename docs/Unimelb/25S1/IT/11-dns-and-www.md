# COMP90007 Week 10 - Application Layer: DNS and the WWW

来源：`lecture/Week10-Application Layer-Lecture1.pdf`（Application Layer (1)，DNS）、`lecture/Week10-Application Layer-Lectures2and3.pdf` p.1–25（Application Layer (2)，WWW）；复习讲义 `lecture/Week12-Review-Lecture3.pdf` p.17–24。Apple Notes：CS/25S1/IT — "WEEK10 - Application Layer1 - DNS WWW"；CS/25S1/IT/Review — "Application Layer"。

这篇讲的是：**在浏览器里输入一个网址后，名字怎样变成 IP 地址？网页的各个对象又怎样从服务器搬到浏览器？**

学习路线：[DNS 做什么](#topic-1) → [名字空间与资源记录](#topic-2) → [名字服务器与解析过程](#topic-3) → [WWW 与 HTTP 连接](#topic-4) → [HTTP 消息、Cookie 与缓存](#topic-5)。

重点：DNS 解析流程、递归与迭代查询、非持久与持久 HTTP 的时间计算。难点：区分各类名字服务器的角色。易错：DNS 通常跑在 UDP 53 端口；端口 80 是浏览器随后与 Web 服务器建立 TCP 连接所用的。

本课应用层的四个主题是 DNS、WWW、电子邮件和流媒体；后两者见 [12 电子邮件与流媒体](12-email-and-multimedia.md)。
<!-- Sources: w10a p.2 -->

<a id="topic-1"></a>
## 1. DNS 做什么

分组按 IP 地址（如 `121.7.106.83`）寻址，人却习惯记名字（如 `www.google.com`）。**DNS（Domain Name System，域名系统）** 是一个应用层协议，把人可读的域名映射为计算机使用的 IP 地址；HTTP、FTP、SMTP 等其他应用层协议都要用它。它是一个由许多名字服务器按层次组织的 **分布式数据库（distributed database）**。
<!-- Sources: w10a p.3; Apple Notes WEEK10 Application Layer1 -->

### 名字解析的过程

![W10A slide 04 - Use of DNS for name resolution](assets/11-dns-and-www/slide-w10a-04.png)

DNS 的主要服务是 **名字解析（name resolution）**：为给定主机名找出 IP 地址。按幻灯片的五步读：浏览器要访问 `www.someschool.edu/index.html`，先由本机的 DNS 客户端（第 1 步）拿到从 URL 中取出的主机名（第 2 步），向 DNS 服务器发查询（第 3 步），最终收到含 IP 地址的回复（第 4 步）；到第 5 步浏览器才向该 IP 地址的 **80 端口** 发起 TCP 连接。前四步是 DNS，第五步已经是 HTTP 的准备工作了。
<!-- Sources: w10a p.4 -->

**易错**：学生笔记写成"DNS 使用 TCP 端口 80"。第 5 步的 TCP 80 是浏览器连接 Web 服务器用的；DNS 查询本身通常走 **UDP 53 端口**，查询丢了就重传（见 [解析过程](#topic-3)）。
<!-- Sources: w10a p.4, p.18; Apple Notes WEEK10 Application Layer1 -->

### 名字解析以外的服务

![W10A slide 05 - Other DNS services](assets/11-dns-and-www/slide-w10a-05.png)

幻灯片列了三项，下表把每项的例子对齐：

| 服务 | 做什么 | 例子 |
| --- | --- | --- |
| 主机别名（host aliasing） | 把别名映射到规范名（canonical name） | `www.unimelb.edu.au` 是 `squizedge-cloud.cms.unimelb.edu.au` 的别名 |
| 邮件服务器登记（mail server registry） | 找出某个域愿意收邮件的服务器 | 发信给 `…@unimelb.edu.au` 时，找到 `unimelb.edu.au` 的邮件服务器 |
| 负载分配与冗余（load distribution and redundancy） | 一个规范名对应多个 IP；DNS 轮换地址顺序以分散负载；一台宕机时客户端可以连其他几台 | 大型网站的多台服务器 |
<!-- Sources: w10a p.5; Apple Notes WEEK10 Application Layer1 -->

<a id="topic-2"></a>
## 2. 名字空间与资源记录

### 层次化的名字空间

![W10A slide 06 - DNS namespace tree](assets/11-dns-and-www/slide-w10a-06.png)

DNS 名字空间是一棵树。树根下是 **顶级域（top-level domain，TLD）**：图上方左段标 Generic 的是通用域（com、edu、gov、org、net……），右段标 Countries 的是国家域（au、jp、uk、nl……）。从叶子往根读就是完整域名，例如左下的 `robot.cs.washington.edu`：edu 下的 washington，其下的 cs，其下的主机 robot。讲义下一页的表补充说，Internet 历史上分出了 250 多个 TLD。
<!-- Sources: w10a p.6-7; Apple Notes WEEK10 Application Layer1 -->

### 域名的写法

![W10A slide 08 - Domain name characteristics](assets/11-dns-and-www/slide-w10a-08.png)

- 不区分大小写：`WWW.UniMelb.edu.au` 和 `www.unimelb.edu.au` 是同一个名字；
- 每个部分最多 63 个字符，整条路径最多 255 个字符；
- 自 1999 年起可以国际化（使用非英文字符）；
- **绝对域名（absolute domain name）** 以"."结尾，指明它在树中的确切位置；**相对域名（relative domain name）** 只部分指定位置，只能在某个绝对域名的上下文中使用。
<!-- Sources: w10a p.8; Apple Notes WEEK10 Application Layer1 -->

**理解用例（自拟）**：在 `cs.washington.edu` 内部写 `robot` 是相对域名，补上所在域后才是 `robot.cs.washington.edu.`；最后那个点代表树根。后面 dig 输出里的 `www.unimelb.edu.au.` 带着这个点，就是绝对域名。

### 资源记录

![W10A slide 09 - Resource records as five-tuples](assets/11-dns-and-www/slide-w10a-09.png)

DNS 数据库存放 **资源记录（resource record，RR）**。每条 RR 是一个五元组（domain name, TTL, class, type, value）：域名说明这条记录属于谁；**TTL（time to live）** 说明记录有多稳定，也就是别人可以缓存多久；Class 在 Internet 上总是 IN；Type 决定 Value 该怎样理解。
<!-- Sources: w10a p.9 -->

![W10A slide 10 - Resource record types](assets/11-dns-and-www/slide-w10a-10.png)

表中黄色底的六行是最常用的：SOA 给出本区域（zone）的参数；A 是 IPv4 地址（32 位），AAAA 是 IPv6 地址（128 位）；MX（mail exchange）给出优先级和愿意收邮件的域；NS 给出本域某台名字服务器的名字；CNAME 把别名指向规范名。下面几行：PTR 用于由 IP 反查名字，SPF 以文本写出邮件发送策略，SRV 指出提供某项服务的主机，TXT 是描述性文本。
<!-- Sources: w10a p.10; Apple Notes Review Application Layer -->

![W10A slide 11 - Example resource records for cs.vu.nl](assets/11-dns-and-www/slide-w10a-11.png)

这是 `cs.vu.nl` 数据库的一部分。按红色标注分三组看：顶部的 SOA、MX、NS 记录描述整个域（谁是名字服务器 `star`、邮件发往哪里）；中间的 A 记录给出各台计算机的 IP 地址，`www` 和 `ftp` 是指向 `star`、`zephyr` 的 CNAME；下面 `flits`、`rowboat` 的 MX 记录指出它们的邮件网关。每行从左到右正好是五元组：名字、TTL（86400 秒即一天）、IN、类型、值。学生复习笔记的概括是：A 把域名翻译成 IP，CNAME 是别名（可用于负载均衡），NS 是名字服务器记录。
<!-- Sources: w10a p.11; Apple Notes Review Application Layer -->

<a id="topic-3"></a>
## 3. 名字服务器与解析过程

### 区域与权威服务器

![W10A slide 12 - Non-overlapping zones](assets/11-dns-and-www/slide-w10a-12.png)

DNS 名字空间被划分为互不重叠的 **区域（zone）**，图中粉色圈出的 `cs.washington.edu`（含 robot）就是一个区域。下一页讲义接着说明：名字服务器从一组根服务器向下按层次排列；每个区域有一台或多台名字服务器保存该区域的数据库，它们对该区域是 **权威的（authoritative）**：答案总是正确的。
<!-- Sources: w10a p.12-13; rev2 p.18 -->

**为什么不集中化**：讲义第 14 页列出四个理由：单一中央数据库无法承受流量，是单点故障，离多数用户很远，也难以维护。所以 DNS 把数据分给各区域，各管各的。
<!-- Sources: w10a p.14 -->

### 四类名字服务器

![W10A slide 16 - Root and TLD name servers](assets/11-dns-and-www/slide-w10a-16.png)

讲义第 15 页先列出四类：根、TLD、其他权威、本地。这一页讲前两类：

- **根名字服务器（root name server）**：解析的起点，讲义说全球有 13 个。它不知道最终答案，只给出 TLD 服务器的 **引用（referral）**：TLD 服务器的名字（NS 记录，权威），外加它的 IP 地址（A 记录，称为 **glue record**）。
- **TLD 名字服务器**：负责 com、org、net、edu 等以及国家域 uk、fr、au、jp 等；给出下级区域权威服务器的引用。

**难点：为什么需要 glue record。** NS 记录只告诉你"edu 的服务器叫 `a.edu-servers.net`"；要联系它还得知道 IP，而查这个名字本身又要用 DNS，就绕回来了。根服务器在回复里顺带附上这台服务器的 A 记录，打破了这个循环。

<details markdown="1"><summary>延伸内容（可选）：13 个根服务器指什么</summary>

"13 个"指 13 个根服务器名字（`a.root-servers.net` 到 `m.root-servers.net`），不是 13 台机器。每个名字背后通过任播（anycast）部署在全球很多地点，用户总是连到较近的一个实例。

</details>
<!-- Sources: w10a p.15-16 -->

![W10A slide 17 - Authoritative and local name servers](assets/11-dns-and-www/slide-w10a-17.png)

- **其他权威名字服务器**：机构自己的 DNS 服务器，保存并提供本区域子域的权威记录；给出更下级区域的引用。
- **本地名字服务器（local name server）**：严格说不属于层次结构。每个 ISP、公司、大学都有一个"默认名字服务器"；有缓存就直接返回，否则作为代理，代为向上查询。
<!-- Sources: w10a p.17 -->

### 解析过程

![W10A slide 18 - Resolution process](assets/11-dns-and-www/slide-w10a-18.png)

文字版流程：客户端请本地服务器解析；本地服务器问根；根给出下一级区域的服务器；一级级往下，直到遇到能解析该主机名的权威服务器。两条补充很重要：本地服务器学到映射后会 **缓存（cache）** 起来，TTL 内下次直接回答；DNS 通常运行在 **UDP 53 端口**，查询丢失就重传。

![W10A slide 19 - Resolving robot.cs.washington.edu](assets/11-dns-and-www/slide-w10a-19.png)

`flits.cs.vu.nl` 上的程序要查 `robot.cs.washington.edu`，按图中编号：

| 步骤 | 发生了什么 |
| --- | --- |
| 1 | 向本地名字服务器（`cs.vu.nl`）发查询 |
| 2–3 | 本地服务器问根服务器，根服务器回 edu 的 NS 记录及其 A 记录（glue），即图中红字 |
| 4–5 | 问 edu 服务器，得到 `washington.edu` 服务器的引用 |
| 6–7 | 问 UW 名字服务器，得到 `cs.washington.edu` 服务器的引用 |
| 8–9 | 问 UWCS 名字服务器，得到 robot 的 A 记录 |
| 10 | 本地服务器把 IP 返回给发起方 |
| 11 | 发起方与 `robot.cs.washington.edu` 建立连接（图中绿线） |

图中第 10 步下方的红字把名字拼成了 "aashington"，是讲义的笔误，应为 `robot.cs.washington.edu`。
<!-- Sources: w10a p.18-19; rev2 p.19 -->

### 递归查询与迭代查询

![W10A slide 20 - Recursive and iterative queries](assets/11-dns-and-www/slide-w10a-20.png)

- **递归查询（recursive query）**：被问的服务器代客户端拿到最终映射，而不是返回部分答案。图中蓝色部分：发起方只问一次本地服务器，然后等最终结果。
- **迭代查询（iterative query）**：被问的服务器回答"我不知道，但你可以去问这台服务器"。图中粉色部分：本地服务器依次问根、edu、UW、UWCS。

**重点**：同一次解析里两种查询同时出现。主机对本地服务器是递归的（只问一次，等最终 IP）；本地服务器对根、TLD、权威服务器是迭代的（每次只拿到一个引用）。
<!-- Sources: w10a p.20; Apple Notes Review Application Layer -->

### 用 dig 看一次查询

![W10A slide 21 - dig www.unimelb.edu.au](assets/11-dns-and-www/slide-w10a-21.png)

`dig www.unimelb.edu.au` 的回复分几节，从上往下读：

| 节 | 内容 |
| --- | --- |
| QUESTION | 问的是 `www.unimelb.edu.au` 的 A 记录 |
| ANSWER | `www.unimelb.edu.au. 15589 IN A 128.250.148.40`（绿框）：名字、TTL、类、类型、值正好是五元组 |
| AUTHORITY | `unimelb.edu.au` 的两条 NS 记录：`ns1`、`ns2` |
| ADDITIONAL | `ns1`、`ns2` 的 A 记录，省去再查一次（与 glue record 同理） |

底部的 `SERVER: 128.250.66.5#53` 说明回答来自本地名字服务器的 53 端口。
<!-- Sources: w10a p.21 -->

**重点：没有 DNS 会怎样。** 复习课讨论过：如果全世界的 DNS 服务器同时崩溃，就无法在域名和 IP 地址之间映射，只能直接用 IP 地址访问网站。由于大多数人并不知道服务器的 IP 地址，Internet 对普通用户几乎就无法使用了。
<!-- Sources: rev2 p.20-21 -->

<a id="topic-4"></a>
## 4. WWW 与 HTTP 连接

### WWW 的组成

讲义第 3 页把 WWW 拆成四部分：

| 组成 | 作用 | 例子 |
| --- | --- | --- |
| 客户端与服务器应用 | 浏览器请求和显示，服务器响应 | Firefox；Apache HTTP Server |
| 标记语言（markup language） | 规定网页的结构和格式 | HTML |
| 脚本语言（scripting language） | 动态生成网页 | JavaScript |
| HTTP | 规定客户端和服务器程序怎样交换信息 | HTTP/1.1 |
<!-- Sources: w10b p.3; Apple Notes WEEK10 Application Layer1 -->

![W10B slide 04 - Web pages, objects and URLs](assets/11-dns-and-www/slide-w10b-04.png)

网页由 **对象（object）** 组成，一个对象就是一个文件（HTML、JPEG 图片、视频……）。大多数网页是一个基础 HTML 文件加若干被引用的对象，每个对象由一个 **URL（uniform resource locator）** 寻址。看幻灯片下方的拆分：`http://` 之后到第一个 `/` 是主机名（host name，交给 DNS 解析），其余是路径名（path name，交给服务器找文件）。
<!-- Sources: w10b p.4 -->

![W10B slide 05 - HTTP client/server model](assets/11-dns-and-www/slide-w10b-05.png)

**HTTP（Hypertext Transfer Protocol）** 是采用客户端/服务器模型的应用层协议：图中运行 Firefox 的 PC 和运行 Safari 的 Mac 都是客户端，各自发 HTTP request，运行 Apache 的服务器回 HTTP response。浏览器不同不要紧，只要都讲 HTTP。
<!-- Sources: w10b p.5; rev2 p.22 -->

### 非持久 HTTP

讲义先给两个定义：**非持久 HTTP（non-persistent HTTP）**：一条 TCP 连接最多发送一个对象；**持久 HTTP（persistent HTTP）**：一条 TCP 连接可以发送多个对象。接着用例子走一遍非持久的过程：页面有一个基础 HTML 和 10 个 JPEG，共 11 个对象，都在同一台服务器上。

![W10B slide 08 - Non-persistent HTTP steps 1-3](assets/11-dns-and-www/slide-w10b-08.png)

![W10B slide 09 - Non-persistent HTTP steps 4-7](assets/11-dns-and-www/slide-w10b-09.png)

两页连起来是七步。绿色字是服务器的动作，红色字是客户端的动作：

1. 客户端向服务器 80 端口发起 TCP 连接；
2. 客户端经 socket 发请求消息，要 `someDepartment/home.index`；
3. 服务器取出对象，封装在响应消息中发回；
4. 服务器发起关闭 TCP 连接；
5. 客户端收到 HTML，连接释放；
6. 客户端解析 HTML，发现 10 个 JPEG；
7. 对每个 JPEG 重复第 1–5 步。

关键在第 7 步：每个图片都要从"建连接"重新来一遍。
<!-- Sources: w10b p.6-9 -->

![W10B slide 10 - Response time of non-persistent HTTP](assets/11-dns-and-www/slide-w10b-10.png)

**往返时间（Round Trip Time，RTT）** 是一个小分组从客户端到服务器再回来的时间。看右图的时间轴：第一个来回是"initiate TCP connection"，第二个来回是"request file"并收到响应的第一批字节，灰色粗斜线是"time to transmit entire file"。所以每个对象需要：

$$
\text{响应时间}=2\,\text{RTT}+\text{文件传输时间}.
$$
<!-- Sources: w10b p.10; Apple Notes WEEK10 Application Layer1 -->

讲义第 11 页总结非持久 HTTP 的问题：每个对象都要新连接；每条 TCP 连接都有开销；每个对象都有 2 个 RTT 的交付时延。
<!-- Sources: w10b p.11 -->

### 持久 HTTP 与流水线

讲义第 12 页：**持久 HTTP** 下，服务器发完响应后不关闭连接，同一对客户端/服务器之间的后续消息都走这条连接；连接闲置一段时间后才由服务器关闭。**流水线（pipelining）**：客户端一遇到被引用的对象就发请求，不等前一个响应回来，减少等待时间，提高请求吞吐量。
<!-- Sources: w10b p.12 -->

![W10B slide 13 - Sequential vs pipelined requests](assets/11-dns-and-www/slide-w10b-13.png)

三列对比：(a) 非持久，每个对象都要灰色的"Connection setup"；(b) 持久但顺序请求，只建一次连接，但每个请求仍要等上一个响应；(c) 持久加流水线，多个请求连续发出，响应连续返回。

| 特性 | 非持久 HTTP | 持久 HTTP |
| --- | --- | --- |
| TCP 连接复用 | 否，每个对象一条新连接 | 是，多个对象共用一条连接 |
| 默认版本 | HTTP/1.0 | HTTP/1.1 及以后 |
| 效率 | 低 | 高 |
| 网络时延 | 较高（多次握手） | 较低 |
| 连接管理 | 简单 | 较复杂（需处理超时等） |
<!-- Sources: w10b p.13; Apple Notes WEEK10 Application Layer1 -->

**重点：持久连接的利与弊。** 好处是复用同一条 TCP 连接，提高请求吞吐量、减少开销；难点是 **何时关闭连接**：开得太久浪费服务器资源，关得太早又失去复用的好处。
<!-- Sources: rev2 p.23-24; Apple Notes Review Application Layer -->

**理解用例（自拟）**：页面含基础 HTML 和 10 张图片，RTT = 50 ms，忽略传输时间。

| 方式 | RTT 数 | 时间 |
| --- | --- | --- |
| 非持久，顺序 | $11\times2=22$ | 1100 ms |
| 持久，顺序请求 | 1（建连接） $+\,11$ （每个对象一问一答） $=12$ | 600 ms |
| 持久，流水线 | 1（建连接） $+\,1$ （HTML） $+\,1$ （10 张图一起请求） $=3$ | 150 ms |

注意流水线也不能把 HTML 和图片的请求合并：必须先收到 HTML、解析后才知道有哪些图片。

<a id="topic-5"></a>
## 5. HTTP 消息、Cookie 与缓存

### 请求方法

![W10B slide 14 - HTTP request methods](assets/11-dns-and-www/slide-w10b-14.png)

表中最常用的是 GET（读取网页）和 POST（向某个资源追加内容，例如提交表单）。HEAD 只要网页的首部不要正文，适合检查页面是否改过；PUT 存储网页、DELETE 删除网页；TRACE 回显收到的请求，用于调试；CONNECT 讲义写"保留供将来使用"；OPTIONS 查询服务器支持哪些选项。
<!-- Sources: w10b p.14 -->

### 请求与响应消息

![W10B slide 15 - HTTP request message format](assets/11-dns-and-www/slide-w10b-15.png)

请求消息自上而下分四块：**请求行（request line）**，即方法、URL、版本三个字段，中间用空格（sp）隔开，以 cr lf 结束；若干 **首部行（header line）**，每行"字段名: 值"；一个只含 cr lf 的 **空行（blank line）**；可选的 **实体主体（entity body）**，GET 通常没有，POST 用它带数据。

![W10B slide 16 - HTTP request message example](assets/11-dns-and-www/slide-w10b-16.png)

把上图的格式对到真实请求：第一行是请求行，后面是首部行，最后的单独 `\r\n` 表示首部结束。讲义的例子（节选）：

```http
GET /index.html HTTP/1.1
Host: www-net.cs.umass.edu
User-Agent: Firefox/3.6.10
Accept: text/html,application/xhtml+xml
Connection: keep-alive
```

`Connection: keep-alive` 就是幻灯片红字标的"Persistent HTTP"：请浏览器和服务器保持这条连接。`Host` 首部告诉服务器要的是哪个网站，因为同一个 IP 上可能托管多个网站。
<!-- Sources: w10b p.15-16, p.18 -->

![W10B slide 17 - HTTP response status codes](assets/11-dns-and-www/slide-w10b-17.png)

状态码的第一位数字决定类别：1xx 信息、2xx 成功、3xx 重定向、4xx 客户端错误、5xx 服务器错误。表中例子值得记住：200 请求成功、204 无内容；301 页面已移动；**304 缓存页面仍有效**；403 禁止访问、404 页面未找到；500 服务器内部错误、503 稍后再试。

**易错**：304 不是错误。它属于 3xx，意思是"你手里那份缓存副本还能用"，服务器不必再发一遍正文；它和下文的 [Web 缓存](#topic-5) 配合使用，节省带宽和时间。
<!-- Sources: w10b p.17; Apple Notes WEEK10 Application Layer1 -->

![W10B slide 18 - HTTP response message example](assets/11-dns-and-www/slide-w10b-18.png)

响应消息与请求同构：第一行换成 **状态行（status line）**：协议、状态码、短语，这里是 `HTTP/1.1 200 OK`；接着是 Date、Server、Last-Modified、Content-Length、Content-Type 等首部行；`Keep-Alive: timeout=10, max=100` 说明服务器保持连接的条件；空行之后的 `data data data …` 就是请求的 HTML 文件。

### Cookie

![W10B slide 19 - Cookies and their four components](assets/11-dns-and-www/slide-w10b-19.png)

HTTP 服务器是 **无状态的（stateless）**：每个请求独立处理，不记得你之前做过什么。但网站常需要识别用户：维持会话状态（如购物车），或按用户身份提供内容（如根据以往行为推荐）。HTTP 用 **cookie** 实现，共四个组成部分：

1. HTTP 响应消息中的 cookie 首部行（`Set-cookie`）；
2. HTTP 请求消息中的 cookie 首部行（`Cookie`）；
3. 用户机器上由浏览器管理的 cookie 文件；
4. 网站后端的数据库。
<!-- Sources: w10b p.19; Apple Notes WEEK10 Application Layer1 -->

![W10B slide 22 - Cookie interaction over time](assets/11-dns-and-www/slide-w10b-22.png)

沿时间线看讲义的 Susan 例子（第 20–21 页是同一过程的文字版）：Susan 第一次访问电商网站，网站创建唯一 ID 1678 和后端数据库表项，在响应中加 `Set-cookie: 1678`；浏览器在 cookie 文件中记下"这个网站 1678"（图左侧 cookie 文件里，旧的 ebay 记录旁多了一条 amazon 记录）；此后每次请求都带 `Cookie: 1678`，服务器据此查数据库，执行"cookie 相关的动作"，一周后再来也能认出她。四个组成部分在图中都能找到：两种首部行在箭头上，cookie 文件在左，数据库在右。
<!-- Sources: w10b p.20-22 -->

### Web 缓存

![W10B slide 23 - Web caching with a proxy server](assets/11-dns-and-www/slide-w10b-23.png)

**Web 缓存（Web caching）** 的目标是不经过源服务器就满足客户端请求。浏览器设置为经缓存访问后，所有 HTTP 请求先发给 **代理服务器（proxy server）**：对象在缓存中就直接返回；否则缓存向源服务器（origin server）请求，再返回给客户端。看图中间的 proxy：对左边的客户端它是服务器，对右边的源服务器它又是客户端，所以缓存同时扮演两种角色，通常由 ISP（大学、公司、家庭宽带）部署。

- 为什么：缩短客户端的响应时间；减少机构接入 Internet 链路上的流量；
- 局限：难以维护经常变化的数据。缓存可以向源服务器确认副本是否过期，若未变，源服务器回上文的 304，而不必重发正文。
<!-- Sources: w10b p.23-24 -->

## 本讲自测

1. 一所大学的本地名字服务器缓存为空，学生查 `www.example.org`。依次列出被询问的服务器，并指出哪一次查询是递归的、哪些是迭代的。
2. 如果根服务器回复 edu 的 NS 记录时不附带 A 记录，本地服务器会遇到什么问题？
3. 页面有 1 个 HTML 和 4 个小图片，RTT 为 20 ms，忽略传输时间。分别用非持久 HTTP 和持久流水线 HTTP 需要多久？
4. 浏览器经代理缓存请求一个已缓存的页面，代理向源服务器确认后收到 304。代理接下来应怎样做？这比收到 200 好在哪里？
