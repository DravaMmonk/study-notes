# COMP90007 Weeks 4–5 - MAC Sublayer

来源：`lecture/Week4-Lectures23-MAC.pdf`（MAC Sub-Layer (1)）、`lecture/Week5-Lecture1.pdf`（MAC Sub-Layer (2)）、`lecture/Week5-Lecture2.pdf`（MAC Sub-Layer (3)）；复习材料 `lecture/Week12-Review-handout.pdf` p.19–20；Apple Notes：CS/25S1/IT — "WEEK 4-5 MAC Sub-layer"、"WEEK 5 - MAC2 - Multiplexing Methods"；CS/25S1/IT/Review — "MAC Sublayer"、"EXAM PREPARATION"。

这篇讲的是：**很多台机器共享同一条广播信道时，谁、什么时候可以发送？**

学习路线：[MAC 的任务与信道分配](#topic-1) → [竞争协议：ALOHA 与 CSMA](#topic-2) → [无冲突与有限竞争协议](#topic-3) → [无线局域网：MACA](#topic-4) → [案例：以太网](#topic-5)。

重点：三种 CSMA 的区别、二进制倒计数、隐藏/暴露终端、以太网最小帧长。难点：为什么最小帧长与 $2\tau$ 有关。易错：以太网最小帧是 64 **字节**；暴露终端是"本可以同时发却不敢发"，不是冲突。

<a id="topic-1"></a>
## 1. MAC 的任务与信道分配

### MAC 子层解决什么问题

![W4MAC slide 02 - Point-to-point vs broadcast networks](assets/05-mac-sublayer/slide-w4mac-02.png)

这一页对比两种网络。**点到点（point-to-point）** 链路只有一对固定的收发方，不存在"谁先说"的争用；**广播（broadcast）** 网络里所有站共用一条信道，一个站发出的信号别人都会收到，于是要决定发送权。负责这件事的就是 **介质访问控制（Medium Access Control，MAC）子层**。

![W4MAC slide 03 - MAC sublayer in the OSI stack](assets/05-mac-sublayer/slide-w4mac-03.png)

图是 OSI 七层模型：左右两台主机，中间是通信子网里的两台路由器。红色虚线框横跨所有设备的第 2 层（Data link）底部、紧贴物理层：MAC 子层是 **数据链路层的下半部分**，在每一段链路上、每台设备里都要工作，而不只在两端主机上。
<!-- Sources: w4mac p.2-3; Apple Notes WEEK 4-5 MAC Sub-layer -->

### 静态分配

**静态信道分配（static channel allocation）** 把信道切成固定的几段，每个用户专用一段。讲义举了两种切法，原理见 [02 复用](02-physical-layer.md#topic-4)。

![W4MAC slide 06 - Time division multiplexing](assets/05-mac-sublayer/slide-w4mac-06.png)

**时分复用（Time Division Multiplexing，TDM）**：左边三个用户 1、2、3 按固定顺序轮流占用同一条线路，时间轴上出现 1 2 3 1 2 3 的循环；相邻时隙之间的空隙是 **保护时间（guard time）**，防止前后两段互相重叠。例子是 2G 移动网。

![W4MAC slide 07 - Frequency division multiplexing](assets/05-mac-sublayer/slide-w4mac-07.png)

**频分复用（Frequency Division Multiplexing，FDM）**：图 (a) 是三路原本都在低频段的信号，(b) 把它们各自搬到不同的频段，(c) 再并排放进一条总信道（Overall FDM channel）。每个用户始终占着自己的一段频率。例子有电视与广播、ADSL、4G。

![W4MAC slide 08 - Why static allocation is inefficient](assets/05-mac-sublayer/slide-w4mac-08.png)

静态分配适合用户数量固定的情况，但这一页列出它效率很低的三种情形：发送方多于分段数；发送方数量会变化；流量是突发的（bursty），而 TDM/FDM 却始终给每人固定份额，某人空闲时他的份额别人也用不了。
<!-- Sources: w4mac p.4-8; Apple Notes WEEK 4-5 MAC Sub-layer -->

### 动态分配的假设

![W4MAC slide 09 - Dynamic allocation assumptions 1–3](assets/05-mac-sublayer/slide-w4mac-09.png)

![W4MAC slide 10 - Dynamic allocation assumptions 4–5](assets/05-mac-sublayer/slide-w4mac-10.png)

**动态信道分配（dynamic channel allocation）** 让信道的划分和分配随需求变化。两页合起来列出建模时的五个假设：

1. 所有通信只用一条信道；
2. 各站独立产生帧；
3. 两帧同时发送会 **冲突（collision）**，两帧都损坏；
4. 时间：**连续（continuous）**，任何时刻都可开始发送；或 **分槽（slotted）**，只能在预定时刻开始；
5. **载波侦听（carrier sense）**：发送前先检测信道是否有人在用；或不侦听，直接发送。
<!-- Sources: w4mac p.9-10 -->

后面的协议正是假设 4、5 的不同组合：ALOHA 不侦听、连续时间；分槽 ALOHA 不侦听、分槽；CSMA 先侦听。

<a id="topic-2"></a>
## 2. 竞争协议：ALOHA 与 CSMA

**竞争（contention）** 协议允许冲突发生，冲突后再想办法恢复。

### ALOHA 与分槽 ALOHA

![W5L1 slide 03 - Pure ALOHA](assets/05-mac-sublayer/slide-w5l1-03.png)

**纯 ALOHA（pure ALOHA）**：有数据就发；发生冲突或没收到确认，就等一段随机时间再重发。不需要中央控制。图中四个站各占一条时间轴，灰色区域是冲突时段：只要两帧在时间上有任何重叠，就都作废。低负载时效率高，高负载时冲突激增、效率很差。
<!-- Sources: w5l1 p.3; Apple Notes WEEK 5 MAC2 -->

![W5L1 slide 04 - Slotted ALOHA](assets/05-mac-sublayer/slide-w5l1-04.png)

**分槽 ALOHA（slotted ALOHA）**：只能在时隙开始时发送。对比两图：纯 ALOHA 中一帧只要和别的帧"部分重叠"就冲突；这一页底部标出 Slot 1–6，帧只能对齐时隙边界，于是要么完全重叠（Slot 2 的 Frame 2.1 与 3.1、Slot 3 的 Frame 1.2 与 4.1）、要么完全不重叠。易受冲突的时间窗口缩短一半，效率提高。
<!-- Sources: w5l1 p.4 -->

### 载波侦听多路访问 CSMA

![W5L1 slide 06 - Three CSMA variants](assets/05-mac-sublayer/slide-w5l1-06.png)

![W5L1 slide 07 - CSMA flowcharts](assets/05-mac-sublayer/slide-w5l1-07.png)

**CSMA（Carrier Sense Multiple Access，载波侦听多路访问）**：有数据要发时先听信道，判断是否有别人正在发送，再决定行动。两页分别用文字和流程图讲三种变体，区别在"信道忙时多执着"：

| 协议 | 信道忙时 | 信道空闲时 | 冲突后 |
| --- | --- | --- | --- |
| 1-持续（1-persistent） | 一直监听，等到空闲 | 立即发送（概率 1） | 随机等待后重来 |
| 非持续（non-persistent） | 不持续监听，随机等待后再听 | 立即发送 | 随机等待后重来 |
| p-持续（p-persistent） | 等到下一个时隙 | 以概率 $p$ 发送，以 $1-p$ 推迟到下一时隙再听 | 随机等待后重来 |
<!-- Sources: w5l1 p.5-7; rev1 p.20; Apple Notes WEEK 5 MAC2 -->

对照流程图中红色的 busy/wait 回路：1-持续在忙时回到 listen 原地打转，一空闲就发；非持续在忙时先去随机等待（wait）再回来听；p-持续即使空闲也要"pick randomly"，以 $1-p$ 的概率退让。三张图下半部分相同：发送后看是否冲突，冲突就 wait 后重来。

**为什么 CSMA 仍会冲突**：信号传播需要时间。两站几乎同时听到信道空闲，便同时发送。1-持续最容易出现这种情况：多个站都在等同一个空闲时刻，一空闲就一起发。学生笔记据此总结" $p$ 越小，冲突越少"。

![W5L1 slide 08 - CSMA efficiency comparison](assets/05-mac-sublayer/slide-w5l1-08.png)

横轴是每个帧时间内的尝试次数 $G$ （负载），纵轴是吞吐量 $S$ （信道利用率）。最低的两条是纯 ALOHA 与分槽 ALOHA；CSMA 各条都在其上方，越不持续（0.01-持续、非持续）在高负载时越好，而 1-持续在 $G$ 变大后很快下滑。结论就是页底那句：**CSMA 优于 ALOHA；高负载下越不持续越好**。
<!-- Sources: w5l1 p.8 -->

### 带冲突检测的 CSMA

![W5L1 slide 09 - CSMA/CD contention periods](assets/05-mac-sublayer/slide-w5l1-09.png)

**CSMA/CD（Collision Detection）**：边发边听，一旦发现冲突就 **立即中止** 发送，等随机时间后再试；因此发送期间必须持续监听信道。图中时间轴被分成三类时段：传输期（Frame）、竞争期（几个小方块，即竞争时隙）和空闲期。 $t_0$ 是上一帧结束的时刻，之后几个站在竞争时隙里争；及时中止让被冲突浪费的时间从"整帧"缩短到"一个竞争时隙"。学生笔记补充：检测到冲突后发送一个 **阻塞信号（jam signal）** 通知其他站。
<!-- Sources: w5l1 p.9; Apple Notes WEEK 5 MAC2 -->

<a id="topic-3"></a>
## 3. 无冲突与有限竞争协议

### 位图协议

![W5L1 slide 11 - Bit map protocol](assets/05-mac-sublayer/slide-w5l1-11.png)

**位图协议（bit map protocol）** 是一种预约式协议：先有 $N$ 个竞争时隙，每站占 1 位；第 $j$ 站想发就在第 $j$ 个时隙里写 1。竞争期结束后，所有站都知道谁要发，再按编号顺序依次发送。图中第一轮 8 个时隙里 1、3、7 号预约，于是依次发 1、3、7 号的帧；第二轮 1、5 号预约，第三轮只有 2 号。"收集发送权"与"发送"被分开，所以不会冲突。代价是每轮固定 $N$ 位的预约开销。
<!-- Sources: w5l1 p.11; Apple Notes WEEK 5 MAC2 -->

### 二进制倒计数

![W5L1 slide 13 - Binary countdown](assets/05-mac-sublayer/slide-w5l1-13.png)

**二进制倒计数（binary countdown）**：每站有一个二进制地址，地址越大优先级越高。想发的站在 $\log_2N$ 个竞争时隙里从最高位开始逐位广播自己的地址；信道对同一时隙的各位做 **按位或（bitwise OR）**。一站发了 0 却看到 1，就说明有更高地址的站在争，立即放弃。

按图右侧的 Bit time 0–3 逐位核对：四站 0010、0100、1001、1010 竞争，"–"表示已经放弃。

| 位 | 0010 | 0100 | 1001 | 1010 | 信道 OR | 结果 |
| --- | --- | --- | --- | --- | --- | --- |
| 第 0 位 | 0 | 0 | 1 | 1 | 1 | 0010、0100 发 0 见 1，放弃 |
| 第 1 位 | – | – | 0 | 0 | 0 | 无人放弃 |
| 第 2 位 | – | – | 0 | 1 | 1 | 1001 发 0 见 1，放弃 |
| 第 3 位 | – | – | – | 0 | 0 | 1010 看到完整地址，获胜 |
<!-- Sources: w5l1 p.12-13; Apple Notes WEEK 5 MAC2 -->

学生笔记把两者的竞争开销概括为：位图每轮 $O(N)$ 位，二进制倒计数 $O(\log_2 N)$ 位。

### 竞争与无冲突的取舍

![W5L1 slide 14 - Contention vs collision-free](assets/05-mac-sublayer/slide-w5l1-14.png)

- **低负载**（冲突少）：无冲突方法的固定开销不划算，竞争方法更好；
- **高负载**：竞争方法冲突太多，无冲突方法更好。

两者在不同点上变得低效，于是有了折中方案。
<!-- Sources: w5l1 p.14 -->

### 有限竞争：自适应树遍历

![W5L1 slide 15 - Limited contention and success probability](assets/05-mac-sublayer/slide-w5l1-15.png)

**有限竞争（limited contention）** 把站分组，让每组里通常只有很少几站想发送，从而同时减少空闲和冲突的浪费。曲线说明了为什么要分组：横轴是准备好发送的站数，纵轴是一个竞争时隙里恰好有一站成功的概率。只有 1 个站时成功率为 1；站数一多就迅速降到 0.4 左右，然后几乎不再变化。所以要设法让同时竞争的站少。**补充**：这条曲线趋近的值约为 $1/e\approx0.37$ ，与后面以太网效率公式里的 $e$ 同源。

![W5L1 slide 16 - Adaptive tree walk](assets/05-mac-sublayer/slide-w5l1-16.png)

**自适应树遍历（adaptive tree walk）**：站是一棵二叉树的叶子（A–H），内部节点 1–7 代表"这一组"。时隙 1 所有站（节点 1 之下）都可发；若冲突，就对冲突的节点做 **深度优先搜索**，先让左子树的站试，再让右子树。按图右侧两个例子走：

- 例 1（D、G 想发）：时隙 1 在节点 1，冲突；时隙 2 在节点 2，只有 D，成功；时隙 3 在节点 3，只有 G，成功。
- 例 2（B、D、G 想发）：时隙 1 冲突；时隙 2 在节点 2（B、D）仍冲突；时隙 3 在节点 4，B 成功；时隙 4 在节点 5，D 成功；时隙 5 在节点 3，G 成功。

负载越高，搜索越应从树的较低层开始，跳过注定冲突的高层节点。
<!-- Sources: w5l1 p.15-16; Apple Notes WEEK 5 MAC2 -->

<a id="topic-4"></a>
## 4. 无线局域网：MACA

![W5L2 slide 03 - Wireless coverage regions](assets/05-mac-sublayer/slide-w5l2-03.png)

无线站各有覆盖范围。图中左边两个圆分别是 A 和 C 的覆盖范围，D 落在重叠处：A、C 同时发送时，D 处的信号互相干扰；B 离得远，不受影响。所以关键是 **检测接收方周围的传输**，而不只是发送方自己听信道。这引出隐藏终端与暴露终端两个问题，以及 802.11 和 MACAW 等无线协议。
<!-- Sources: w5l2 p.3 -->

### 隐藏终端与暴露终端

![W5L2 slide 04 - Hidden terminals](assets/05-mac-sublayer/slide-w5l2-04.png)

**隐藏终端（hidden terminal）**：A 和 C 都想发给 B。图下方的箭头是一个站的无线电范围（radio range）：A 与 C 相距太远，彼此听不到，载波侦听都以为信道空闲，结果在 B 处冲突。这会降低效率，要设法避免。
<!-- Sources: w5l2 p.4 -->

![W5L2 slide 05 - Exposed terminals](assets/05-mac-sublayer/slide-w5l2-05.png)

**暴露终端（exposed terminal）**：B 发给 A，C 想发给 D。C 能听到 B，载波侦听会让 C 等待；其实 A 听不到 C、D 听不到 B，两次传输可以同时安全进行。这种并发是我们希望允许的。
<!-- Sources: w5l2 p.5 -->

**易错**：隐藏终端是"听不到对方却冲突了"；暴露终端是"听得到对方却其实不会冲突"。普通 CSMA 对前者失效，对后者过于保守。

### MACA

![W5L2 slide 07 - MACA RTS and CTS](assets/05-mac-sublayer/slide-w5l2-07.png)

**MACA（Multiple Access with Collision Avoidance）**：发送方先请接收方发一个短控制帧，接收方附近的站听到这个控制帧就知道要回避，然后发送方再发数据。图中两个大圆分别是 A 和 B 的发送范围，灰色部分是听到控制帧的区域。A 要发给 B：

1. 左图：A 发 **RTS（Request-to-Send）**。在 A 范围内的 C、E 听到后推迟，等待 CTS；
2. 右图：B 回 **CTS（Clear-to-Send）**。在 B 范围内的 D、E 听到后推迟，直到数据交换结束。

C 只听到 RTS 没听到 CTS，说明它不在 B 附近，可以照常发送（解决暴露终端）；D 听到了 CTS，就不会干扰 B（解决隐藏终端）。这就是页首那句"A 可以在有暴露终端、但没有隐藏终端的情况下发送"。学生笔记还记下 IEEE 802.11（Wi-Fi）使用 CSMA/CA 加 RTS/CTS 与 ACK；讲义提到的 MACAW 是 MACA 的改进版。
<!-- Sources: w5l2 p.6-7; Apple Notes WEEK 5 MAC2 -->

<a id="topic-5"></a>
## 5. 案例：以太网

### 经典以太网与帧格式

![W5L2 slide 09 - Classic Ethernet](assets/05-mac-sublayer/slide-w5l2-09.png)

图中多台计算机经接口电缆（interface cable）和收发器（transceiver）挂在同一根以太电缆（Ether）上，这就是一条共享的广播信道。经典以太网每段电缆有最大长度（如 100 m），多段之间用 **中继器（repeater）** 连接：它接收、放大并双向转发信号。
<!-- Sources: w5l2 p.9; Apple Notes WEEK 4-5 MAC Sub-layer -->

![W5L2 slide 10 - Ethernet frame format](assets/05-mac-sublayer/slide-w5l2-10.png)

页首两点：MAC 协议是 **1-持续 CSMA/CD**；冲突后的随机等待由 **二进制指数退避（Binary Exponential Backoff，BEB）** 计算：第 $i$ 次冲突后，从 $0$ 到 $2^i-1$ 中随机选一个时隙数等待。冲突越多，等待范围翻倍扩大。中间是 IEEE 802.3 帧，从左到右：

| 字段 | 长度 | 作用 |
| --- | --- | --- |
| Preamble（前导码） | 7 B | `10101010` 重复，让收发双方同步时钟 |
| Start of Frame（帧起始） | 1 B | 标志字节 |
| 目的地址、源地址 | 6 B + 6 B | 标识接收方与发送方 |
| Type / Length | 2 B | 指明把帧交给哪个上层进程 |
| Data | 0–1500 B | 载荷 |
| Pad（填充） | 0–46 B | 让帧达到最小 64 字节 |
| CRC | 4 B | 32 位校验 |
<!-- Sources: w5l2 p.10; Apple Notes WEEK 4-5 MAC Sub-layer -->

### MAC 地址

![W5L2 slide 11 - MAC addressing](assets/05-mac-sublayer/slide-w5l2-11.png)

**MAC 地址** 是物理网络接口的唯一标识，48 位，用十六进制书写，如 `00:02:2D:66:7C:2C`。下方的换算表给出每个十六进制数字对应的 4 位二进制，例如 `2D` = `0010 1101`；12 个十六进制数字 × 4 位 = 48 位。学生笔记补充：前 24 位是 IEEE 分配给厂商的 **OUI**，后 24 位由厂商自行分配。
<!-- Sources: w5l2 p.11; Apple Notes WEEK 4-5 MAC Sub-layer -->

### 最小帧长

![W5L2 slide 12 - Minimum frame size](assets/05-mac-sublayer/slide-w5l2-12.png)

设 $\tau$ 是信号在整段以太网上传播一次的时间。按 (a)–(d) 看：A 在时刻 0 开始发；B 在 A 的信号快到达前的 $\tau-\epsilon$ 也开始发；冲突发生在 B 附近；B 的噪声再花约 $\tau$ 才传回 A。所以 **冲突最长要 $2\tau$ 才能被发送方检测到**。如果 A 在 $2\tau$ 之前就发完了帧，它就无法得知自己的帧被撞坏。因此帧必须足够长，发送时间至少为 $2\tau$ ，这就是最小帧长（经典以太网为 64 字节）的来历。
<!-- Sources: w5l2 p.12; Apple Notes WEEK 4-5 MAC Sub-layer -->

把条件写成式子：帧长为 $F$ 、带宽为 $B$ 时，发送时间是 $F/B$ ，要求 $F/B\ge2\tau$ ，即 $F_{\min}=2\tau B$ 。所以带宽提高而网段长度不变时，最小帧长要按比例增大；否则就得缩短网段，让 $\tau$ 变小。

**易错**：学生笔记写的是"最小 64 bits"，应为 64 **字节**（512 位），这也是 Pad 字段存在的原因。

### 以太网效率

![W5L2 slide 13 - Ethernet channel efficiency](assets/05-mac-sublayer/slide-w5l2-13.png)

$$
\text{Channel Efficiency}=\frac{1}{1+\dfrac{2BLe}{cF}}.
$$

$F$ 是帧长， $B$ 是带宽， $L$ 是电缆长度， $c$ 是信号传播速度， $e\approx2.718$ 。最优情况下每帧平均需要 $e$ 个竞争时隙，每个时隙长 $2\tau=2L/c$ 。
<!-- Sources: w5l2 p.13 -->

- $cF$ 大（帧长），效率高；
- 对固定帧长，提高带宽或距离（ $BL$ 变大）会 **降低** 效率。

学生笔记用另一种写法表达同一件事： $E=T_f/(T_f+T_{cont})$ ，其中 $T_f=F/B$ ， $T_{cont}=e\cdot2T_p$ 。两式化简后相同。
<!-- Sources: Apple Notes WEEK 4-5 MAC Sub-layer -->

**理解用例（自拟）**：10 Mbps、2500 m、 $c=2\times10^8$ m/s。最小帧 $F=512$ bit 时， $2BLe/(cF)\approx1.33$ ，效率约 43%；1500 字节的满帧 $F=12\,000$ bit 时，该项约 0.057，效率约 95%。帧越长，竞争开销被摊得越薄。

### 交换式以太网

![W5L2 slide 14 - Hub vs switch](assets/05-mac-sublayer/slide-w5l2-14.png)

左图的 **集线器（hub）** 内部把所有线路接到同一点，所有设备处在一个 CSMA/CD 冲突域，仍然只能一个人说话；右图的 **交换机（switch）** 内部是交叉矩阵，每个端口（Port）是独立的冲突域，多端口可同时转发，吞吐量大得多；端口用全双工线路时，根本不需要 CSMA/CD。
<!-- Sources: w5l2 p.14; Apple Notes WEEK 4-5 MAC Sub-layer -->

## 本讲自测

1. 为什么 1-持续 CSMA 在高负载时冲突比非持续 CSMA 多？
2. 站点地址为 0110、0101、0011 的三站用二进制倒计数竞争，谁获胜？在第几位决出？
3. 一个站在 3 次冲突后，按 BEB 会从什么范围内选择等待时隙？
4. 把以太网速度从 10 Mbps 提到 100 Mbps、电缆长度不变时，最小帧长应变成原来的多少倍？为什么？
