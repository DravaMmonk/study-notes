# COMP90007 Weeks 5–6 - Network Layer: Service Models and Internetworking

来源：`lecture/Week5-Lecture3.pdf`（Network Layer (1)）、`lecture/Week6-Lecture1.pdf`（Network Layer (2)）；复习材料 `lecture/Week12-Review-handout.pdf` p.21–24；Apple Notes：CS/25S1/IT — "WEEK 5-6 Network Layer"；CS/25S1/IT/Review — "Network Layer"。

这篇讲的是：**数据链路层只管相邻两点，分组怎样跨过许多台路由器、甚至跨过不同类型的网络，到达远方的主机？**

学习路线：[网络层在 Internet 中的位置](#topic-1) → [数据报与虚电路](#topic-2) → [不同网络怎样互连](#topic-3) → [分片与路径 MTU 发现](#topic-4)。

重点：数据报与虚电路的比较、隧道、透明与非透明分片。难点：IP 分片中的偏移量。易错：IP 采用非透明分片，只在目的主机重组；隧道两端网络类型相同、中间不同。

<a id="topic-1"></a>
## 1. 网络层在 Internet 中的位置

### 网络层管什么

![W5L3 slide 02 - Network layer responsibilities](assets/06-network-layer-internetworking/slide-w5l3-02.png)

右侧是五层模型，网络层（Network）高亮。左侧三行文字从上到下对应网络层、数据链路层、物理层的职责：网络层负责 **连接不同的网络（internetworking）和路由（routing）**；数据链路层负责成帧、差错与流量控制、介质访问；物理层负责介质与信号。前几讲解决的都是"一条链路上"的问题，从这里开始要解决"跨很多条链路"的问题。
<!-- Sources: w5l3 p.2 -->

### IP 是 Internet 的细腰

![W5L3 slide 04 - TCP/IP hourglass](assets/06-network-layer-internetworking/slide-w5l3-04.png)

这张"沙漏"图是 TCP/IP 的核心：上面有很多应用（SMTP、HTTP、RTP、DNS）和两种传输协议（TCP、UDP），下面有很多链路技术（以太网、4G、SONET、ADSL、802.11），而中间的细腰只有一个 **IP**。所有上层都跑在 IP 上，IP 能跑在所有链路上，这就是 Internet 能把各种网络连起来的原因。
<!-- Sources: w5l3 p.4 -->

![W5L3 slide 05 - Internet and IP](assets/06-network-layer-internetworking/slide-w5l3-05.png)

![W5L3 slide 06 - Internet as interconnected networks](assets/06-network-layer-internetworking/slide-w5l3-06.png)

第一页给出三句定义，第二页把它画出来：美国骨干网、欧洲骨干网之间用租用的跨大西洋线路相连，下面挂着区域网、移动网、国家网、公司网和家庭网；连接它们的是一台台 IP 路由器，接入方式可以是 Cable、WiMAX 或以太网。

- Internet 是一组用 **IP（Internet Protocol）** 通信的互连网络；
- IP 提供 **尽力而为（best-effort）** 的服务，把数据报（datagram）从源主机路由到目的主机，不保证送达、不保证顺序；
- 源和目的主机可能在不同的网络上，例如图中家庭网里的电脑访问公司网里的服务器，要穿过区域网、两个骨干网和国家网。
<!-- Sources: w5l3 p.5; rev1 p.22 -->

### 存储转发分组交换

![W5L3 slide 07 - Store-and-forward packet switching](assets/06-network-layer-internetworking/slide-w5l3-07.png)

主机 H1 产生分组注入 ISP 的网络（灰色椭圆）；路由器 A、B、C……把分组 **完整接收、存储下来，再根据地址转发** 给下一台路由器，直到经 F 到达 H2 所在的局域网（LAN）。这种方式叫 **存储转发分组交换（store-and-forward packet switching）**。
<!-- Sources: w5l3 p.7 -->

### 网络层应向传输层提供什么

![W5L3 slide 08 - Network layer services](assets/06-network-layer-internetworking/slide-w5l3-08.png)

- 服务应当与路由器技术无关；
- 传输层不需要知道路由器的数量、类型和拓扑；
- 网络地址应采用统一的编号方案。

三条合起来的意思是：传输层只管"把数据交给某个地址"，中间网络怎么搭、换了什么设备，都不应影响上层。
<!-- Sources: w5l3 p.8 -->

<a id="topic-2"></a>
## 2. 数据报与虚电路

### 两种服务、两种思路

![W5L3 slide 09 - Connectionless vs connection-oriented](assets/06-network-layer-internetworking/slide-w5l3-09.png)

网络层可以提供两种服务，背后是两种思路之争：

- **无连接（connectionless）**：分组单独注入子网，各自独立路由到目的地；流量和差错控制交给其他层。这是 Internet 社区的思路：子网可能不可靠，只负责搬运分组；服务质量（QoS）不易实现。
- **面向连接（connection-oriented）**：发往同一目的地的分组沿同一条路线走。这是电信社区的思路：保证可靠性，看重 QoS。
<!-- Sources: w5l3 p.9; Apple Notes WEEK 5-6 Network Layer -->

### 数据报子网：邮局模型

![W5L3 slide 10 - Datagram subnet](assets/06-network-layer-internetworking/slide-w5l3-10.png)

每个分组都带完整的目的地址，按地址各自路由，所以 **同一消息的分组可能走不同路径**。图下方每张表左列是目的地（Dest.），右列是出口线路（Line）。看 A 的表：起初去 F 走 C；后来 A 改了主意，去 E、F 改走 B（例如 ACE 路线拥塞）。分组 1–3 走 A→C→E，分组 4 则走了 A→B。路径不同、时延也不同，所以分组可能 **乱序到达**，由上层重新排序。维护路由表的是 **路由算法（routing algorithm）**，见 [08 路由算法](08-routing-algorithms.md)。
<!-- Sources: w5l3 p.10 -->

### 虚电路子网：电话网模型

![W5L3 slide 11 - Virtual-circuit subnet](assets/06-network-layer-internetworking/slide-w5l3-11.png)

先建立一条 **虚电路（virtual circuit，VC）**，之后所有分组沿同一路径走，只带一个短的 **连接标识（connection identifier）**，而不必每次重新选路。看每张表的一行"in | out"：A 收到来自 H1、标识 1 的分组，就从 C 方向发出、标识仍为 1；C 把来自 A 的 1 号转给 E；E 再转给 F。分组 1–4 全部走 A→C→E→F，按发出的顺序到达。典型例子是 **MPLS（Multiprotocol Label Switching）**。
<!-- Sources: w5l3 p.11 -->

**补充**：标识只在一段链路上有意义，路由器可以在转发时改写它。图中画了另一台主机 H3，但讲义的表只列出 H1 这条连接；教材原图里，H3 的连接到达 A 时也用标识 1，A 就把它改成 2 再发往 C，避免下游把两条连接混在一起。这一点属于 `延伸内容`。

### 比较

![W5L3 slide 12 - Datagram vs virtual-circuit table](assets/06-network-layer-internetworking/slide-w5l3-12.png)

这张表按行对比两种子网。先看前三行：数据报不需要建立电路，每个分组带完整的源、目的地址，各自独立选路；虚电路必须先建立电路，之后分组只带短的 VC 号，路线在建立时就定下来。再看后三行：路由器故障时，数据报网络只丢失当时正在那台路由器里的分组，而虚电路网络中经过它的所有 VC 都被终止；QoS 与拥塞控制对数据报很难，对虚电路则只要能提前为每条 VC 预留足够资源就容易。

![W5L3 slide 13 - Compromises: time, memory, bandwidth](assets/06-network-layer-internetworking/slide-w5l3-13.png)

![W5L3 slide 14 - Compromises: longevity, vulnerability](assets/06-network-layer-internetworking/slide-w5l3-14.png)

两页把取舍按五个方面展开：

| 方面 | 数据报 | 虚电路 |
| --- | --- | --- |
| 时间 | 每个分组都要查复杂的路由表，解析地址更费时 | 建立连接要时间和资源，之后转发很快 |
| 路由器内存 | 要为每个可能的目的地保存表项，表很大 | 每条虚电路一个表项 |
| 带宽 | 每个分组都带完整目的地址 | 只在建立时需要完整地址和选路，之后省去开销 |
| 持久性 | – | 可为长期重复使用建立永久虚电路 |
| 脆弱性 | 路由器故障时可改走其他路线 | 硬件或软件崩溃时，经过它的虚电路全部中断，重建前无法通信 |
<!-- Sources: w5l3 p.12-14; Apple Notes WEEK 5-6 Network Layer -->

**理解用例（自拟）**：一次长时间的视频会议适合虚电路：一次建好，以后每个分组都快速转发且容易保证带宽；而偶发的网页请求用数据报更灵活，不用为一次小交流建立和拆除连接。

<a id="topic-3"></a>
## 3. 不同网络怎样互连

### 网络之间有哪些不同

![W5L3 slide 15 - How networks differ](assets/06-network-layer-internetworking/slide-w5l3-15.png)

![W6L1 slide 03 - Internetworking challenges](assets/06-network-layer-internetworking/slide-w6l1-03.png)

**网络互连（internetworking）** 把多个不同的网络连成一个更大的网络。第二页说明难点：网络类型与协议不同；设计目标和配置动机不同；软硬件技术互不兼容。第一页列出具体差异：

| 方面 | 可能的差异 |
| --- | --- |
| 服务 | 无连接或面向连接 |
| 分组大小 | 最大长度不同 |
| 编址 | 长度不同；扁平或层次化 |
| 服务质量 | 有或没有 |
| 可靠性 | 丢包程度不同 |
| 安全 | 隐私规则、加密不同 |
<!-- Sources: w5l3 p.15; w6l1 p.3 -->

其中"分组大小不同"直接引出第 4 节的分片问题。

### 用同一个 IP 连接

![W6L1 slide 04 - Connecting networks with IP](assets/06-network-layer-internetworking/slide-w6l1-04.png)

Internet 的解法是在所有网络之上使用 **同一个网络层协议 IP**。上半部分是网络拓扑：源主机在 802.11 网络，中间经过 MPLS 网络（其中走的是虚电路），最后进入目的主机所在的以太网。下半部分是每台设备里的协议栈：每一段的链路层帧头都不同（802.11、MPLS、Eth），但里面的 IP 分组一路不变（"Common protocol (IP) carried all the way"），路由器在每一跳拆掉旧帧头、换上新帧头。
<!-- Sources: w6l1 p.4; rev1 p.23 -->

### 隧道

![W6L1 slide 05 - Tunneling definition](assets/06-network-layer-internetworking/slide-w6l1-05.png)

**隧道（tunneling）** 用于源和目的在 **同一类型** 的网络上、但中间隔着一个 **不同类型** 网络的情况：把源分组整个封装在中间网络的分组里穿过去，到对端再拆出来。

![W6L1 slide 06 - Tunneling IPv6 through IPv4](assets/06-network-layer-internetworking/slide-w6l1-06.png)

巴黎和伦敦都是 IPv6 网络，中间只有 IPv4。左边路由器把 IPv6 分组装进一个 IPv4 分组（图中间的"IPv4 | IPv6 packet"），IPv4 网络只看外层头部转发；右边路由器拆掉外层，把原 IPv6 分组送进伦敦的网络。对中间网络来说，IPv6 分组只是普通载荷：中间路由器看到的目的地址是外层 IPv4 头部里的地址，也就是隧道另一端那台路由器的 IPv4 地址，而不是伦敦主机的 IPv6 地址。
<!-- Sources: w6l1 p.5-6; Apple Notes WEEK 5-6 Network Layer -->

<a id="topic-4"></a>
## 4. 分片与路径 MTU 发现

### 为什么要分片

![W6L1 slide 07 - MTU and fragmentation](assets/06-network-layer-internetworking/slide-w6l1-07.png)

每个网络都规定了 **MTU（Maximum Transmission Unit，最大传输单元）**，即能传的最大分组长度，取决于硬件和操作系统、协议标准以及传输效率。以太网常见的 MTU 是 1500 字节。大分组要穿过 MTU 较小的网络时，就要把它 **分片（fragmentation）**。
<!-- Sources: w6l1 p.7; Apple Notes WEEK 5-6 Network Layer -->

### 透明与非透明分片

![W6L1 slide 08 - Transparent fragmentation](assets/06-network-layer-internetworking/slide-w6l1-08.png)

**透明分片（transparent）**：分片在每个小 MTU 网络的入口进行，出口处立即重组（G1 分、G2 合；G3 分、G4 合）。下游网络看不出分过片，但同一分组的所有分片都必须经同一个出口路由器才能被重组，不能各自选路，所以路由受限，路由器工作量也大。

![W6L1 slide 09 - Non-transparent fragmentation](assets/06-network-layer-internetworking/slide-w6l1-09.png)

**非透明分片（non-transparent）**：分片后一路不重组，**只在目的主机重组**（图右端 reassemble at destination），IP 就是这样做的。路由器省事，但每个分片都要带分组编号、字节偏移量和"最后一片"标志。
<!-- Sources: w6l1 p.8-9; rev1 p.24 -->

**易错**：学生笔记把透明分片概括为"在每个经过的网络都分片和重组"、非透明为"只在源和目的处"。准确地说，非透明分片可以发生在途中任何路由器（甚至多次分片），只是 **重组只在目的地**。

### IP 式分片示例

![W6L1 slide 10 - IP-style fragmentation](assets/06-network-layer-internetworking/slide-w6l1-10.png)

每个分片的头部有三个字段：分组编号、字节偏移、结束标志。原分组编号 27，有 10 个数据字节 A–J：

| 阶段 | 分片（编号, 偏移, 结束标志: 数据） |
| --- | --- |
| 原分组 | (27, 0, 1: A–J) |
| 分成每片最多 8 字节 | (27, 0, 0: A–H)，(27, 8, 1: I–J) |
| 再分成每片最多 5 字节 | (27, 0, 0: A–E)，(27, 5, 0: F–H)，(27, 8, 1: I–J) |
<!-- Sources: w6l1 p.10 -->

偏移量记录这片数据在原分组中从第几个字节开始，所以无论分了几次、以什么顺序到达，目的主机都能按偏移拼回原样；结束标志为 1 的那片告诉它总长度。注意第 (c) 行：再分片时，原来 (27, 0, 0: A–H) 被切成 A–E 和 F–H，后者偏移 5、结束标志仍为 0；只有原本就是最后一片的 I–J 保留标志 1。

<details markdown="1"><summary>延伸内容（可选）：真实 IPv4 分片的计算</summary>

真实 IPv4 头部用 Identification、MF（More Fragments）和 Fragment offset 实现上表的三个字段（见 [07 IPv4 头部](07-ip-addressing.md#topic-1)），偏移以 8 字节为单位，所以除最后一片外，每片数据长度必须是 8 的倍数。

例：4000 字节的数据报（20 字节头部 + 3980 字节数据）经过 MTU = 1500 的链路。每片最多 $1500-20=1480$ 字节数据（恰为 8 的倍数）：

| 分片 | 数据字节 | 偏移字段 | MF |
| --- | --- | --- | --- |
| 1 | 1480 | 0 | 1 |
| 2 | 1480 | 185 | 1 |
| 3 | 1020 | 370 | 0 |

</details>

### 路径 MTU 发现

![W6L1 slide 11 - Path MTU discovery](assets/06-network-layer-internetworking/slide-w6l1-11.png)

**路径 MTU 发现（Path MTU Discovery，PMTUD）** 是分片的替代方案：源主机发出设置了 **DF（Don't Fragment）** 的分组。按图从左到右：源先发 1400 字节的分组；第一台路由器发现下一跳 MTU 更小，就丢弃它并回送一个错误分组，告诉源"试试 1200"；源改用 1200 重发，到第二台路由器又收到"试试 900"；最后以 900 字节到达目的地，源也就知道整条路径能承受的长度。

- 优点：源主机知道该发多长，网络内部不再分片；
- 若路由或路径 MTU 改变，会触发新的错误分组，源随之调整。
<!-- Sources: w6l1 p.11; Apple Notes WEEK 5-6 Network Layer -->

## 本讲自测

1. 在数据报子网中，同一个文件的分组为什么可能乱序到达？虚电路子网会出现这种情况吗？
2. 一家公司的两个 IPv6 办公室之间只有 IPv4 网络，应该用什么技术？中间路由器根据哪个头部转发？
3. 透明分片为什么会让路由受限？
4. 一个 1000 字节数据的分组，在讲义的简化格式下先按每片 400 字节、再按每片 300 字节分片，写出最终各片的偏移和结束标志。
