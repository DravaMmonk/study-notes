# COMP90007 Week 6 - IP and Addressing

来源：`lecture/Week6-IP.pdf`（Network Layer (3)）；复习材料 `lecture/Week12-Review-handout.pdf` p.25–27；Apple Notes：CS/25S1/IT — "WEEK 6 - Network2 - IP & ICP"；CS/25S1/IT/Review — "Network Layer"。

这篇讲的是：**IP 分组里写了什么？一个 32 位地址怎样告诉路由器"该往哪个方向送"？**

学习路线：[IPv4 数据报头部](#topic-1) → [地址、前缀与子网掩码](#topic-2) → [子网划分与 CIDR](#topic-3) → [有类编址、私有地址与 NAT](#topic-4) → [IPv6 与控制协议](#topic-5)。

重点：前缀记法、子网掩码与按位与、最长前缀匹配。难点：在比特层面划分子网与聚合路由。易错：/24 中的 24 是网络部分的 **位数**；路由器选的是 **最长**（最具体）的匹配，而不是第一条匹配。

<a id="topic-1"></a>
## 1. IPv4 数据报头部

### 头部的布局

![Slide 03 - IPv4 header layout](assets/07-ip-addressing/slide-03.png)

IPv4 数据报由头部和载荷组成。头部是 20 字节的固定部分加可变长度的选项部分（Options，0 个或多个 32 位字）。图中每行 32 位，固定部分共 5 行。上方的标注把几组字段和用途连起来：Header Length 指 IHL；Protocol 指明载荷交给 TCP 还是 UDP；红框中的第二行（Identification、DF、MF、Fragment offset）负责分片；下方两个红框是源地址和目的地址。

### 长度与分片字段

![Slide 04 - IPv4 header fields part 1](assets/07-ip-addressing/slide-04.png)

| 字段 | 作用 |
| --- | --- |
| Version | IP 版本（4） |
| IHL | 头部长度，以 32 位为单位，最小 5、最大 15（即 20–60 字节） |
| Differentiated services | 区分不同服务类别 |
| Total length | 头部加载荷的总长度，最大 65 535 字节 |
| Identification | 让主机判断新到的分片属于哪个数据报；同一数据报的所有分片 ID 相同 |
| DF | Don't Fragment，用于路径 MTU 发现 |
| MF | More Fragments，标明这是否为最后一片 |
| Fragment offset | 当前分片在原数据报中的位置 |
<!-- Sources: w6ip p.3-4; Apple Notes WEEK 6 Network2 -->

Identification、MF 和 Fragment offset 正是 [06 讲 IP 式分片](06-network-layer-internetworking.md#topic-4) 中"分组编号、结束标志、字节偏移"的真实版本。IHL 的单位是 32 位（4 字节），所以 IHL = 5 就是 20 字节、只有固定部分。

### 寿命、协议与地址字段

![Slide 05 - IPv4 header fields part 2](assets/07-ip-addressing/slide-05.png)

| 字段 | 作用 |
| --- | --- |
| TTL | Time to Live，以跳数或秒限制分组寿命，防止分组在网络中无限打转 |
| Protocol | 载荷属于哪个传输层协议，如 TCP、UDP |
| Header checksum | 只校验头部 |
| Source / Destination address | 发送方和接收方的 IP 地址 |
| Options | 例如安全、严格或宽松源路由、记录路由、时间戳 |
<!-- Sources: w6ip p.5 -->

<a id="topic-2"></a>
## 2. 地址、前缀与子网掩码

### 点分十进制

![Slide 06 - Dotted decimal notation](assets/07-ip-addressing/slide-06.png)

IPv4 地址长 32 位，写成四个 0–255 的十进制数，用点分隔，例如 `128.18.3.11`。每段 8 位，权重从 $2^7=128$ 到 $2^0=1$ 。图中箭头指向第二段 18：按权重拆成 $16+2$ ，所以写成 `00010010`。IP 地址由 **ICANN（Internet Corporation for Assigned Names and Numbers）** 统一管理分配；IPv4 地址已经面临耗尽。
<!-- Sources: w6ip p.6 -->

### 网络部分与主机部分

![Slide 07 - Network portion and prefix](assets/07-ip-addressing/slide-07.png)

IP 地址是层次结构：**网络部分 + 主机部分**。地址按 **块（block）** 分配，一个块内所有主机共享相同的网络部分。例如 256 个地址 `128.18.3.0`–`128.18.3.255` 构成一个块。

**前缀（prefix）** 标识一个地址块，写作"最低地址 / 网络部分的位数"：上面的块写成 `128.18.3.0/24`，因为前三段共 $8\times3=24$ 位是网络部分。讲义的另一个例子 `18.2.0.0/16` 则是前两段为网络部分。
<!-- Sources: w6ip p.7; rev1 p.25; Apple Notes WEEK 6 Network2 -->

**易错**：/24 的块有 $2^{32-24}=256$ 个地址；前缀长度每增加 1，块的大小减半。

### 子网掩码

![Slide 08 - Subnet mask](assets/07-ip-addressing/slide-08.png)

**子网掩码（subnet mask）** 在网络部分全为 1、主机部分全为 0。图中 32 位被分成长度为 $L$ 的前缀（Network）和 $32-L$ 位的主机部分（Host），下面一行就是对应的掩码：前 $L$ 位是 1，后面全是 0。把 IP 地址和掩码做 **按位与（bitwise AND）**，主机部分被清零，剩下的就是网络部分。
<!-- Sources: w6ip p.8 -->

**理解用例（自拟）**：`128.18.3.11` 与 `/24` 的掩码 `255.255.255.0` 按位与：前三段与 255 相与不变，最后一段与 0 相与为 0，结果 `128.18.3.0`，正是这台主机所在的网络。

**理解用例（自拟）**：前缀长度不是 8 的倍数时，要在被切开的那一段里逐位看。主机 `172.20.135.14/20`：前 20 位是网络部分，即前两段全部加第三段的前 4 位。135 = `10000111`，保留 `1000`、其余清零得 `10000000` = 128，所以网络地址是 `172.20.128.0`；主机部分有 $32-20=12$ 位，这个网络共 $2^{12}=4096$ 个地址。

### 路由表

![Slide 09 - Routing table triplet](assets/07-ip-addressing/slide-09.png)

路由表通常由三元组构成：目的网络、子网掩码、出口线路（物理的如以太网口，或虚拟的如 VPN）。例如表中一行 `128.18.3.0 | 255.255.255.0 | Eth 0` 表示：凡是与该掩码相与后得到 `128.18.3.0` 的目的地址，都从 Eth 0 发出。学生笔记还列出下一跳（next hop）作为表项内容。
<!-- Sources: w6ip p.9; Apple Notes WEEK 6 Network2 -->

<a id="topic-3"></a>
## 3. 子网划分与 CIDR

### 子网划分

![Slide 10 - Subnets at the University of Melbourne](assets/07-ip-addressing/slide-10.png)

**子网划分（subnetting）** 让一个网络在内部分成几部分使用，对外仍像一个网络。ISP 只给墨尔本大学一个前缀 `128.208.0.0/16`；大学路由器在内部把它分给 EE（`128.208.0.0/18`）、CS（`128.208.128.0/17`）、Art（`128.208.64.0/19`）三个系，外界看到的始终是同一个前缀。
<!-- Sources: w6ip p.10; rev1 p.26 -->

![Slide 11 - Subnet bits](assets/07-ip-addressing/slide-11.png)

看第三段的前几位（红色竖线左边是新增的网络位， `x` 是可以自由变化的主机位）：

| 子网 | 第三段开头 | 前缀 | 地址数 |
| --- | --- | --- | --- |
| 整个块 | `xxxxxxxx` | `128.208.0.0/16` | $2^{16}$ |
| EE | `00` | `128.208.0.0/18` | $2^{14}$ |
| Art | `010` | `128.208.64.0/19` | $2^{13}$ |
| CS | `1` | `128.208.128.0/17` | $2^{15}$ |
| 剩余 | `011` | `128.208.96.0/19` | $2^{13}$ |
<!-- Sources: w6ip p.11; rev1 p.27; Apple Notes WEEK 6 Network2 -->

各子网的前缀长度可以不同（可变长子网），只要它们的比特开头互不重叠。四块加起来 $2^{14}+2^{13}+2^{15}+2^{13}=2^{16}$ ，刚好分完。

### CIDR：路由聚合

![Slide 12 - CIDR aggregation](assets/07-ip-addressing/slide-12.png)

骨干路由器要连接全世界约 30 万个网络，路由表会爆炸。**CIDR（Classless Inter-Domain Routing，无类域间路由）** 用 **聚合（aggregation）** 把多个前缀合并成一个更大的前缀，缩小路由表。图中伦敦路由器下面挂着剑桥 `192.24.0.0/21`、牛津 `192.24.16.0/20`、爱丁堡 `192.24.8.0/22` 三个前缀（"3 prefixes"），而纽约只需要一条 `192.24.0.0/19` 指向伦敦（"1 aggregate prefix"）。
<!-- Sources: w6ip p.12 -->

### 最长前缀匹配

![Slide 13 - Longest matching prefix](assets/07-ip-addressing/slide-13.png)

问题是 `192.24.12.0/22` 这块分给了旧金山，正好落在伦敦的 `/19` 里面。纽约路由器的表因此有两行：`192.24.12.0/22 → Eth 0（旧金山）`、`192.24.0.0/19 → Eth 1（伦敦）`；两行的掩码 `255.255.252.0`、`255.255.224.0` 分别就是 /22 和 /19。规则是：**分组转发给匹配的最长前缀（即最小的地址块）**。先看是否匹配 /22，不匹配再看 /19。这样"除了旧金山那一小块，其余都去伦敦"只需两行就能表达。代价是转发过程更复杂，但换来灵活性。
<!-- Sources: w6ip p.13; Apple Notes WEEK 6 Network2 -->

**易错**：图左下角旧金山出口的标注印成了 `192.2412.0/22`，少了一个点，应为 `192.24.12.0/22`。

**理解用例（自拟）**：

| 目的地址 | 匹配 /22（192.24.12.0–192.24.15.255）？ | 匹配 /19（192.24.0.0–192.24.31.255）？ | 出口 |
| --- | --- | --- | --- |
| `192.24.13.5` | 是 | 是 | 选更长的 /22：旧金山 |
| `192.24.9.1` | 否 | 是 | 伦敦 |
| `192.24.40.1` | 否 | 否 | 都不匹配，走默认路由（如有） |

![Slide 14 - CIDR bit breakdown](assets/07-ip-addressing/slide-14.png)

这一页在比特层面检查 /19 怎样被分完。只看第三段：伦敦的 /19 是 `000xxxxx`（ $2^{13}=8192$ 个地址）；剑桥 `00000xxx` 是 /21（ $2^{11}$ ），爱丁堡 `000010xx` 是 /22（ $2^{10}$ ），旧金山 `000011xx` 是 /22（ $2^{10}$ ），牛津 `0001xxxx` 是 /20（ $2^{12}$ ）。右侧的等式 $2^{11}+2^{10}+2^{10}+2^{12}=2^{13}$ 说明四块正好拼成整个 /19，其中旧金山那块由最长前缀匹配"挖"出来。
<!-- Sources: w6ip p.14 -->

<a id="topic-4"></a>
## 4. 有类编址、私有地址与 NAT

### 有类编址

![Slide 15 - Classful addressing](assets/07-ip-addressing/slide-15.png)

早期地址按固定大小的类分配，类别编码在地址开头几位。看图左边的开头位和右边的地址范围：

| 类 | 开头位 | 地址范围 | 用途 |
| --- | --- | --- | --- |
| A | `0` | 1.0.0.0 – 127.255.255.255 | 8 位网络、24 位主机 |
| B | `10` | 128.0.0.0 – 191.255.255.255 | 16 位网络、16 位主机 |
| C | `110` | 192.0.0.0 – 223.255.255.255 | 24 位网络、8 位主机 |
| D | `1110` | 224.0.0.0 – 239.255.255.255 | 组播 |
| E | `1111` | 240.0.0.0 – 255.255.255.255 | 保留 |
<!-- Sources: w6ip p.15 -->

问题是缺乏灵活性：学生笔记的说法是 A 类太大、C 类太小（只有 254 台可用主机），中等规模的组织只能拿 B 类而浪费大量地址。CIDR 正是为解决这个问题而生。
<!-- Sources: Apple Notes WEEK 6 Network2 -->

### 私有地址

![Slide 16 - Private IP ranges](assets/07-ip-addressing/slide-16.png)

以下范围保留给私有网络，**不能出现在 Internet 上**：

| 范围 | 地址数 |
| --- | --- |
| `10.0.0.0/8` | $2^{24}=16\,777\,216$ |
| `172.16.0.0/12` | $2^{20}=1\,048\,576$ |
| `192.168.0.0/16` | $2^{16}=65\,536$ |
<!-- Sources: w6ip p.16 -->

每个范围的地址数就是 $2^{32-\text{前缀长度}}$ ，和上一节的块大小算法一样。讲义写作 hosts，严格说是地址数。

### 网络地址转换 NAT

![Slide 17 - NAT](assets/07-ip-addressing/slide-17.png)

**NAT（Network Address Translation）** 盒子把一个外部 IP 地址映射到许多内部地址。图中虚线圈是客户的场地：几台设备经客户路由器组成内网。内部主机 `10.0.0.1`、端口 5544 发出的分组，经过 NAT 盒子（兼防火墙）后源地址被改成公网地址 `198.60.42.12`、端口改成 3344，再交给 ISP 路由器送往 Internet；NAT 记下这对映射。回程分组到达端口 3344 时，NAT 查表改回 `10.0.0.1:5544` 送进内网。它用 TCP/UDP 端口区分不同连接，是节省全球地址空间的常用工具。

**问题**：NAT 违反了分层原则。网络层设备却要读写传输层的端口号。
<!-- Sources: w6ip p.17; Apple Notes WEEK 6 Network2 -->

<a id="topic-5"></a>
## 5. IPv6 与控制协议

### IPv6

![Slide 18 - IPv6 addresses](assets/07-ip-addressing/slide-18.png)

IPv6 地址长 128 位，用十六进制书写，每 16 位（4 个十六进制数字）一组，组间用冒号分隔。图中把一长串二进制切成 8 组，得到 `FDEC:0074:0000:0000:0000:B0FF:0000:FFFF`。

- 地址空间大得多，学生笔记据此写"不再需要 NAT"；
- 更好地支持安全：加密与认证；
- 过渡方式：双栈（dual stack）、隧道（见 [06 隧道](06-network-layer-internetworking.md#topic-3)）、头部转换。
<!-- Sources: w6ip p.18; Apple Notes WEEK 6 Network2 -->

![Slide 19 - IPv6 header](assets/07-ip-addressing/slide-19.png)

IPv6 必需的头部固定 40 字节：Version、Differentiated services、Flow label、Payload length、Next header、Hop limit，以及各 16 字节的源地址和目的地址。和 IPv4 对照，可以看到 Hop limit 相当于 TTL，Next header 相当于 Protocol，而头部校验和与分片字段都不在固定头部里。
<!-- Sources: w6ip p.19 -->

### Internet 控制协议

![Slide 20 - Internet control protocols](assets/07-ip-addressing/slide-20.png)

IP 要靠几个控制协议协助工作：

| 协议 | 作用 | 过程 |
| --- | --- | --- |
| ICMP（Internet Control Message Protocol） | IP 的伴侣，回报错误信息；ping、traceroute 都依赖它 | 例如 Echo Request / Echo Reply |
| ARP（Address Resolution Protocol） | 找出本地某个 IP 地址对应的 MAC 地址 | 主机广播询问，拥有该地址的主机回复 |
| DHCP（Dynamic Host Configuration Protocol） | 给主机自动分配本地 IP 地址，让它能开始工作 | 主机向服务器请求，服务器授予一个租约（lease）；学生笔记写作 Discover → Offer → Request → Ack |
<!-- Sources: w6ip p.20; Apple Notes WEEK 6 Network2 -->

**易错**：讲义把 DHCP 展开为 "Dynamic Host Control Protocol"，标准名称是 Dynamic Host **Configuration** Protocol，这也和它"自动配置主机"的作用一致。

![Slide 21 - ICMP message types](assets/07-ip-addressing/slide-21.png)

ICMP 用于测试和监控主机与路由器之间的状况。常见消息类型（讲义用箭头标出前两项和 Echo）：

| 消息类型 | 含义 |
| --- | --- |
| Destination unreachable | 分组无法送达 |
| Time exceeded | TTL 减到 0 |
| Parameter problem | 头部字段无效 |
| Source quench | 抑制分组（让源放慢） |
| Redirect | 告诉路由器更好的路线 |
| Echo and Echo reply | 检查一台机器是否在线 |
| Timestamp request/reply | 与 Echo 相同，但带时间戳 |
| Router advertisement/solicitation | 寻找附近的路由器 |
<!-- Sources: w6ip p.21 -->

**理解用例（自拟）**：traceroute 依次发出 TTL = 1、2、3……的分组。第 $k$ 个路由器把 TTL 减到 0 时回送 Time exceeded，于是源主机逐跳得知路径上每台路由器的地址。

## 本讲自测

1. 主机 `10.38.201.7/19` 所在网络的网络地址是什么？这个网络有多少个地址？
2. 把 `200.1.0.0/22` 平均分成 4 个子网，写出各子网的前缀。
3. 路由表有 `10.0.0.0/8 → A`、`10.1.0.0/16 → B`、`10.1.2.0/24 → C`。目的地址 `10.1.2.9` 和 `10.1.9.9` 分别走哪里？
4. 为什么说 NAT 违反分层原则？如果改用 IPv6，学生笔记为什么认为 NAT 不再必要？
