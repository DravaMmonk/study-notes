# COMP90007 Weeks 1–2 - Introduction and Reference Models

来源：`lecture/Week1-Lecture2.pdf`（Introduction to Networking）、`lecture/Week2-Lecture2.pdf`（Introduction to Networking (2)）、`lecture/Week12-Review-handout.pdf` p.2–6；`lecture/Week1-Lecture1.pdf` 只是课程安排，未使用。Apple Notes：CS/25S1/IT — "WEEK 1 - Network Technology"、"WEEK 2 Reference Models"；CS/25S1/IT/Review — "EXAM PREPARATION"。

这篇讲的是：**一群各自独立的计算机，怎样有条理地互相通信？** 先给网络分类，再把复杂的通信任务拆成一层一层，每层只做一件事。

学习路线：[网络是什么、怎样分类](#topic-1) → [分层与封装](#topic-2) → [服务、原语与协议](#topic-3) → [OSI 与 TCP/IP](#topic-4) → [比较、混合模型与起源](#topic-5)。

重点：分层思想、服务与协议的区别、各层名称与数据单位。难点：封装（每层加头部）的信息流。易错：Internet 不等于 WWW；OSI 是参考框架，TCP/IP 才是实际运行的协议族。

<a id="topic-1"></a>
## 1. 网络是什么、怎样分类

### 几个基本术语

- **计算机网络（computer network）**：用同一种技术互连起来的一组自治计算机。
- **网络设备（network device）**：PC、手机、路由器（router）、交换机（switch）等。
- **服务器（server）** 提供服务、接受请求；**客户端（client）** 连接服务器并请求服务。
- **分组（packet）**：两台网络设备之间传送的一条消息。
- **IP 地址（IP address）**：标识一台网络设备的唯一编号。
<!-- Sources: w1l2 p.2-3, p.8-9 -->

![W1L2 slide 04 - Architecture of the Internet](assets/01-introduction-and-reference-models/slide-w1l2-04.png)

这张图是互联网的全貌。左下角的家庭用户通过 DSL、有线电视（cable）、光纤到户（FTTX）接入，右边还有手机（mobile device）；它们先连到 **ISP（Internet Service Provider）**，各 ISP 的骨干网（backbone network）之间再互相连接（peering），数据中心（data center）和内容分发网络（content delivery network）挂在骨干网上。先记住"许多网络连成一张网"这个印象，后面每一层都在解决其中一段路的问题。
<!-- Sources: w1l2 p.4 -->

![W1L2 slide 06 - Internet vs World Wide Web](assets/01-introduction-and-reference-models/slide-w1l2-06.png)

**易错：Internet 与 WWW 不是一回事。** 幻灯片的问题是"Internet 或 WWW 是不是一个计算机网络"。答案是：Internet 不是单一网络，而是"网络的网络"（右边那张彩色图就是许多网络互连的可视化）；WWW（万维网）是运行在 Internet 之上的分布式系统，只是众多应用之一。
<!-- Sources: w1l2 p.6 -->

![W1L2 slide 09 - Client-server model](assets/01-introduction-and-reference-models/slide-w1l2-09.png)

左边的客户端进程（client process）经网络发出请求（request），右边的服务器进程（server process）处理后送回应答（reply）。这就是 **客户端-服务器模型（client-server model）**：一次请求，一次应答。上一页（p.8）画的是两个客户端共用一台服务器，说明一台服务器可以同时服务多个客户端。

### 按传输技术分类

![W1L2 slide 10 - Broadcast links](assets/01-introduction-and-reference-models/slide-w1l2-10.png)

![W1L2 slide 11 - Point-to-point links and multicasting](assets/01-introduction-and-reference-models/slide-w1l2-11.png)

两页按"一条消息有多少台机器能收到"区分网络：p.10 是所有机器共享一条信道的广播链路；p.11 是只连一对机器的点到点链路，以及只发给一部分机器的组播。下表把三者对照：

| 类型 | 含义 | 例子 |
| --- | --- | --- |
| 广播链路（broadcast link） | 所有机器共享一条信道，一台发出、全部收到；目标机器处理，其余忽略 | 无线局域网、经典以太网 |
| 点到点链路（point-to-point link） | 只连接一对机器，别的机器看不到；一发一收叫单播（unicasting） | 两台路由器之间的专线 |
| 组播（multicasting） | 发给网络中的一个子集 | 视频会议组 |
<!-- Sources: w1l2 p.10-11; Apple Notes WEEK 1 -->

### 按规模分类

![W1L2 slide 12 - Classification by scale](assets/01-introduction-and-reference-models/slide-w1l2-12.png)

表格左列是处理器之间的距离，中列是"这些处理器位于同一个什么范围"，右列是对应的网络名称。从上往下读，距离每扩大约十倍，网络类型就升一级：

| 处理器间距离 | 处理器位于同一个 | 网络类型 |
| --- | --- | --- |
| 1 m | 一平方米 | 个人区域网（PAN），如蓝牙 |
| 10 m – 1 km | 房间、建筑、校园 | 局域网（LAN） |
| 10 km | 城市 | 城域网（MAN） |
| 100 km – 1000 km | 国家、大洲 | 广域网（WAN） |
| 10 000 km | 地球 | the Internet |
<!-- Sources: w1l2 p.12 -->

<details markdown="1"><summary>补充：学生笔记中的各类网络例子（可选）</summary>

这些例子来自学生笔记中教科书第 1 章的配图，本地讲义 PDF 没有对应页：

- **LAN**：无线局域网通过接入点（access point，AP）连到有线网；有线局域网常用以太网交换机（Ethernet switch），每台电脑接一个端口。VLAN 把端口打上标签，逻辑上划分成不同网段。
- **MAN**：早期以有线电视网为代表，由前端（head end）集中把信号分到各家；后来 WiMAX、LTE、5G 也承担城域覆盖。
- **WAN**：由主机（host）和通信子网（communication subnet）组成，子网包括传输线路和交换设备（通常是路由器）。**路由算法（routing algorithm）** 决定整个网络走哪条路径，**转发算法（forwarding algorithm）** 决定一台路由器把分组交给下一跳中的哪一个；这两个概念在 [08 路由算法](08-routing-algorithms.md) 展开。
- **VPN** 用 Internet 上的虚拟链路连接分支机构；VPN 的安全实现见 [14 通信安全](14-signatures-authentication-security.md)。学生还记录了 SD-WAN（软件定义广域网）：用软件集中管理多条广域链路，提供统一的服务等级协议（SLA），属于课外延伸。

</details>
<!-- Sources: Apple Notes WEEK 1 (textbook figures 1-8 to 1-10) -->

### 按拓扑分类

![W1L2 slide 13 - Mesh and bus topologies](assets/01-introduction-and-reference-models/slide-w1l2-13.png)

![W1L2 slide 14 - Star and ring topologies](assets/01-introduction-and-reference-models/slide-w1l2-14.png)

两页共四张图 (a)–(d)，看线条怎样把设备连起来：(a) 全网状里每两台设备之间都有一条线；(b) 总线里所有设备挂在一条横线上；(c) 星形里所有线都汇到中间的 hub；(d) 环形里每台设备只连左右两个邻居，围成一圈。

| 拓扑（topology） | 连接方式 | 特点 |
| --- | --- | --- |
| 全网状（fully mesh） | 每台设备和其他每台设备都有专用点到点链路 | 可靠，但链路数量多 |
| 总线（bus） | 所有设备挂在同一条共享介质上 | 同一时刻只能一台发送，需要协商机制解决冲突；以太网是最常见的总线网络 |
| 星形（star） | 所有设备连到中心设备（如 hub） | 中心设备是关键点 |
| 环形（ring） | 每台设备从前一台接收、转发给下一台 | 需要访问控制，如令牌环（token ring） |
<!-- Sources: w1l2 p.13-14 -->

总线上"谁先发"的协商问题，正是 [05 MAC 子层](05-mac-sublayer.md) 要回答的问题。

<a id="topic-2"></a>
## 2. 分层与封装

### 为什么要分层

通信要处理的事情很多：电信号、出错、找路、可靠交付、应用格式……如果全部写在一个程序里，几乎无法维护。**分层（layering）** 把它们拆开：每层只解决一类问题，向上一层提供服务，使用下一层的服务。学生笔记把好处概括为 **模块化（modularity）、互操作（interoperability）、抽象（abstraction）**。
<!-- Sources: w1l2 p.15-17; Apple Notes WEEK 1 -->

![W1L2 slide 16 - Philosopher-translator-secretary architecture](assets/01-introduction-and-reference-models/slide-w1l2-16.png)

图左边是地点 A，右边是地点 B，各分三层。两位哲学家（第 3 层）只关心观点（"I like rabbits"）；翻译（第 2 层）把它译成双方约定的中间语言（图里是荷兰语 "Ik vind konijnen leuk"）；秘书（第 1 层）只关心怎样把纸传真过去。对面的翻译再把荷兰语译成法语交给另一位哲学家。任何一层换掉实现（例如翻译改用另一种中间语言），只要上下接口不变，其他层不受影响。
<!-- Sources: w1l2 p.16 -->

![W1L2 slide 17 - Protocol hierarchies](assets/01-introduction-and-reference-models/slide-w1l2-17.png)

看图中两种线：竖直实线是 **接口（interface）**，同一台主机里上下层通过它交接（左边标着 Layer 4/5 interface 等）；水平虚线是 **协议（protocol）**，两台主机的同一层（对等实体，peer）按约定"虚拟地"对话。真正的数据只在最底层的物理介质（physical medium）上走。
<!-- Sources: w1l2 p.17 -->

### 封装：每层加自己的头部

![W1L2 slide 18 - Information flow in layer 5](assets/01-introduction-and-reference-models/slide-w1l2-18.png)

沿着左边从上往下看：第 5 层产生消息 M；第 4 层加头部 $H_4$ ；第 3 层可能把它切成两段，各加 $H_3$ ；第 2 层再加头部 $H_2$ 和尾部 $T_2$ 。到了右边的目标机器，每层剥掉自己那层的头部，再交给上一层。这个过程叫 **封装（encapsulation）**，它解释了为什么每一层看到的"数据"都包含了上面所有层的内容。
<!-- Sources: w1l2 p.18; rev1 p.3; Apple Notes EXAM PREPARATION -->

**理解用例（自拟）**：浏览器发出一个 HTTP 请求。应用层的 HTTP 消息最先产生，然后 TCP 头部是第一个被"加上"的头部，之后依次加 IP 头部、802.11 帧头和帧尾；接收方按相反顺序剥掉。

<a id="topic-3"></a>
## 3. 服务、原语与协议

### 面向连接与无连接

| 服务类型 | 过程 | 类比 |
| --- | --- | --- |
| 面向连接（connection-oriented） | 建立连接 → 发送数据 → 释放连接；建立时可以协商参数 | 打电话 |
| 无连接（connectionless） | 直接发送，每条消息独立处理，不需要协商 | 寄信 |
<!-- Sources: w1l2 p.19 -->

![W1L2 slide 20 - Six types of services](assets/01-introduction-and-reference-models/slide-w1l2-20.png)

选择哪种服务会影响可靠性和服务质量。表格左边的大括号把六种服务分成两组：上三行面向连接，下三行无连接；右列是例子：

| 类别 | 服务 | 例子 |
| --- | --- | --- |
| 面向连接 | 可靠消息流（reliable message stream） | 一页一页的序列 |
| 面向连接 | 可靠字节流（reliable byte stream） | 电影下载 |
| 面向连接 | 不可靠连接（unreliable connection） | 网络电话（VoIP） |
| 无连接 | 不可靠数据报（unreliable datagram） | 电子垃圾邮件 |
| 无连接 | 有确认的数据报（acknowledged datagram） | 短信 |
| 无连接 | 请求-应答（request-reply） | 数据库查询 |
<!-- Sources: w1l2 p.20 -->

**理解用例（自拟）**：实时语音可以接受偶尔丢一点声音，等重传反而更糟，所以可用不可靠连接；下载文件一个字节都不能错、而且要按顺序，所以必须用可靠字节流。

### 服务原语

![W1L2 slide 21 - Service primitives](assets/01-introduction-and-reference-models/slide-w1l2-21.png)

**服务原语（service primitive）** 是一层向用户提供的正式操作集合。服务越复杂，原语越多。幻灯片下方的表是一个简单面向连接服务的六个原语：

| 原语 | 含义 |
| --- | --- |
| LISTEN | 阻塞等待传入连接 |
| CONNECT | 与等待中的对端建立连接 |
| ACCEPT | 接受对端发来的连接 |
| RECEIVE | 阻塞等待传入消息 |
| SEND | 向对端发送消息 |
| DISCONNECT | 终止连接 |
<!-- Sources: w1l2 p.21 -->

典型顺序是：服务器 LISTEN，客户端 CONNECT，服务器 ACCEPT，双方 SEND/RECEIVE，最后 DISCONNECT。同一套原语会在 [09 传输层](09-transport-layer-udp-tcp.md) 以 socket 的形式再次出现。

### 服务与协议的区别

![W1L2 slide 22 - Services and protocols](assets/01-introduction-and-reference-models/slide-w1l2-22.png)

图中竖直箭头连接第 $k+1$ 层和第 $k$ 层，标的是"第 $k$ 层提供的服务"；水平虚线连接两台机器的第 $k$ 层，标的是"协议"。

- **服务（service）** 是竖直方向的：第 $k$ 层向第 $k+1$ 层提供的一组原语，只规定"能做什么"，不规定"怎么做"。
- **协议（protocol）** 是水平方向的：同一层对等实体之间交换的分组的格式和含义规则。

例如传输层通过接口向应用提供 SEND，这是服务；SEND 背后两端 TCP 实体怎样给数据编号、怎样确认，这是协议。

![W1L2 slide 24 - Object-oriented analogy](assets/01-introduction-and-reference-models/slide-w1l2-24.png)

看右侧的虚线框 Interface：它只框住 `accelerate`、`decelerate` 的方法头（headings of methods），用户（user）只看得到这一部分，这对应服务；左侧箭头指向的方法体（花括号里的实现）对应协议。只要方法签名不变，就可以替换实现。
<!-- Sources: w1l2 p.22-24; Apple Notes WEEK 1 -->

<a id="topic-4"></a>
## 4. 参考模型：OSI 与 TCP/IP

### 为什么需要参考模型

网络系统非常复杂。**参考模型（reference model）** 简化设计过程，为许多独立厂商开发服务和协议提供共同基线；有一个抽象模型，再用具体实现去验证，是工程上的最佳实践。
<!-- Sources: w2l2 p.3-4 -->

### OSI 七层模型

**OSI（Open Systems Interconnection）** 由 ISO 提出，按以下原则划分层次：需要新的抽象时才分一层；每层功能明确；层边界要使跨接口的信息流最少；层数足够区分不同功能，但又不能多到过于复杂；每层功能要考虑国际标准化协议。
<!-- Sources: w2l2 p.5-6; Apple Notes WEEK 2 Reference Models -->

![W2L2 slide 07 - OSI reference model](assets/01-introduction-and-reference-models/slide-w2l2-07.png)

右边一列（Name of unit exchanged）是每层交换的数据单位。中间圆角框里的两台路由器（router）只实现下三层，所以图中下三层的协议是"主机-路由器"之间逐跳进行的（底部标注 host-router protocol）；传输层及以上才是端到端（host-to-host）。这条分界叫通信子网边界（communication subnet boundary）。

| 层 | 名称 | 数据单位 |
| --- | --- | --- |
| 7 | 应用层（application） | APDU |
| 6 | 表示层（presentation） | PPDU |
| 5 | 会话层（session） | SPDU |
| 4 | 传输层（transport） | 段（segment） |
| 3 | 网络层（network） | 分组（packet） |
| 2 | 数据链路层（data link） | 帧（frame） |
| 1 | 物理层（physical） | 比特（bit） |
<!-- Sources: w2l2 p.7; Apple Notes WEEK 2 Reference Models -->

### TCP/IP 四层模型

TCP/IP 由 Vint Cerf 和 Bob Kahn（1974）提出，只有四层。

![W2L2 slide 09 - OSI layers versus TCP/IP layers](assets/01-introduction-and-reference-models/slide-w2l2-09.png)

左右两列逐行对齐：OSI 的表示层和会话层在 TCP/IP 中是灰色空格（Not present in the model）；OSI 的网络层对应 TCP/IP 的网际层（internet）；OSI 最下面的数据链路层和物理层合成 TCP/IP 的一层 host-to-network（下一页叫 Link）。

![W2L2 slide 10 - TCP/IP protocols](assets/01-introduction-and-reference-models/slide-w2l2-10.png)

这一页在每层里填上具体协议：

| 层 | 代表协议 | 学生笔记中的用途 |
| --- | --- | --- |
| 应用层 | HTTP、SMTP、RTP、DNS | 网页、邮件、实时音视频、域名解析 |
| 传输层 | TCP、UDP | TCP 可靠、面向连接；UDP 快但不可靠 |
| 网际层（internet） | IP、ICMP | 分组转发；ICMP 用于 ping 等控制消息 |
| 链路层（link） | ADSL、SONET、802.11、Ethernet | 电话线宽带、光纤骨干、Wi-Fi、有线以太网 |
<!-- Sources: w2l2 p.8-10; Apple Notes WEEK 2 Reference Models -->

<a id="topic-5"></a>
## 5. 比较、混合模型与起源

### 两个模型的比较与批评

- **相同点**：都分层，都支持端到端通信，都旨在标准化网络通信。
- **不同点**：层数不同；OSI 明确区分服务、接口、协议三个概念，而 TCP/IP 拥有真正成功的协议。
<!-- Sources: w2l2 p.11; Apple Notes WEEK 2 Reference Models -->

**OSI 为什么没有流行**：技术差、实现差、时机差。

![W2L2 slide 13 - Bad timing](assets/01-introduction-and-reference-models/slide-w2l2-13.png)

横轴是时间，纵轴是活跃程度。第一个峰是研究热潮（research），第二个峰是巨额投资（billion dollar investment），中间的谷底标着 Standards，说明制定标准的好时机是两峰之间的低谷。OSI 标准出来时 TCP/IP 已经在大学广泛部署，错过了这个低谷。
<!-- Sources: w2l2 p.12-13 -->

**TCP/IP 的问题**：不是一个通用模型；没有区分服务、接口和协议；没有把物理层和数据链路层分开；一些次要协议根深蒂固，难以替换。
<!-- Sources: w2l2 p.14 -->

### 本课使用的混合模型

![W2L2 slide 15 - Hybrid model](assets/01-introduction-and-reference-models/slide-w2l2-15.png)

左边是五层名称，右边是一个典型场景：浏览器（browser）和服务器（server）各自从上到下运行 HTTP、TCP、IP、802.11，两台机器通过最下面的连线相连。它取 OSI 的分层清晰（物理层与数据链路层分开）和 TCP/IP 的实际协议：

| 层 | 名称 | 典型协议（浏览器访问服务器） |
| --- | --- | --- |
| 5 | 应用层 | HTTP |
| 4 | 传输层 | TCP |
| 3 | 网络层 | IP |
| 2 | 数据链路层 | 802.11 |
| 1 | 物理层 | 802.11 的无线信号 |
<!-- Sources: w2l2 p.15; rev1 p.6 -->

本课后面的笔记就按这五层自底向上排列：[02 物理层](02-physical-layer.md) → [03](03-data-link-framing-and-error-control.md)/[04 数据链路层](04-data-link-flow-control.md) → [05 MAC 子层](05-mac-sublayer.md) → [06](06-network-layer-internetworking.md)/[07](07-ip-addressing.md)/[08 网络层](08-routing-algorithms.md) → [09](09-transport-layer-udp-tcp.md)/[10 传输层](10-congestion-control.md) → [11](11-dns-and-www.md)/[12 应用层](12-email-and-multimedia.md)，最后是贯穿各层的 [13](13-cryptography.md)/[14 网络安全](14-signatures-authentication-security.md)。

### Internet 的起源

![W2L2 slide 16 - Telephone system and distributed switching](assets/01-introduction-and-reference-models/slide-w2l2-16.png)

![W2L2 slide 17 - Growth of the ARPANET](assets/01-introduction-and-reference-models/slide-w2l2-17.png)

p.16 左图 (a) 是传统电话网：话机连到交换局（switching office），交换局再连到长途局（toll office），呈层级树状，一个交换局坏了就会切断它下面的一大片；右图 (b) 是 Baran 提出的分布式交换网络，每个节点有多条路可走，坏掉一个节点也能绕行。p.17 的五张小图 (a)–(e) 是 ARPANET 从 1969 年 12 月的 4 个节点，到 1972 年 9 月连接美国各地许多研究机构的增长过程。这种"不依赖单一中心"的思想延续到今天的 Internet。
<!-- Sources: w2l2 p.16-17 -->

## 本讲自测

1. 一台笔记本通过 Wi-Fi 打开网页。按混合模型写出从上到下各层使用的协议，并说明接收方先剥掉哪一层的头部。
2. 为什么说"服务"是竖直关系、"协议"是水平关系？用 SEND 原语举例说明。
3. 视频会议和网上银行转账记录查询分别更适合六种服务中的哪一种？为什么？
4. 路由器在 OSI 模型中实现了哪几层？这和"端到端"的传输层有什么关系？
