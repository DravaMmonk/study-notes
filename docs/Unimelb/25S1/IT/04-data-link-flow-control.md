# COMP90007 Week 4 - Data Link Layer: Flow Control and Link Protocols

来源：`lecture/Week4-Lectures23-data-link.pdf`（Data Link Layer (3)）、复习讲义 `lecture/Week12-Review-handout.pdf` p.16–18；Apple Notes：CS/25S1/IT — "WEEK 4 - Data Link3 - Flow Control"、"WEEK 3-4 Data Link Layer"（PPP、AAL5 部分）；CS/25S1/IT/Review — "Data Link Layer"。

这篇讲的是：**快的发送方遇到慢的接收方、再遇到会丢帧的信道时，发送方什么时候才能发下一帧？**

学习路线：[流量控制要解决什么](#topic-1) → [停等协议与链路利用率](#topic-2) → [滑动窗口：Go-Back-N 与选择重传](#topic-3) → [真实的数据链路协议](#topic-4)。

重点：停等协议的利用率公式、两种滑动窗口协议的区别。难点：为什么停等在长距离高速链路上效率极低。易错：利用率公式里是 $2T_p$ （往返），不是 $T_p$ ；Go-Back-N 的接收窗口是 1，出错后接收方不发 NAK。

<a id="topic-1"></a>
## 1. 流量控制要解决什么

**流量控制（flow control）** 是控制发送方何时可以发下一帧的策略，有两类：**基于反馈（feedback-based）**，接收方告诉发送方能不能继续；**基于速率（rate-based）**，协议内置发送速率上限。本课重点是基于反馈的方法。
<!-- Sources: w4dl p.2; rev1 p.16 -->

讲义用三张图从最简单的情况逐步加难度，每一步只增加一个现实问题。

### 极简协议：假设接收方无限快

![Slide 03 - A very simple protocol](assets/04-data-link-flow-control/slide-03.png)

左边竖线是发送方，时间向下流；右边是接收方。发送方连续发出 6 帧，每条斜线代表一帧经过一段传播时延（delay）到达。接收方旁边的小方块是缓冲区：帧到得比它处理得快时，方块越堆越多。这个协议假设接收方处理无限快、信道不出错，所以不需要任何反馈；但图中堆起来的方块正说明，现实中慢的接收方会被淹没。

### 有确认传输：快发送方对慢接收方

![Slide 04 - Acknowledged transmission](assets/04-data-link-flow-control/slide-04.png)

现在接收方的缓冲区有限。图中绿色虚线是 **确认（acknowledgement，ACK）**：发送方发一帧后停下，等接收方处理完并发回 ACK 才发下一帧。于是接收方用"什么时候回 ACK"来控制发送节奏，这就是基于反馈的流量控制。

### 有噪声信道：帧会丢失或损坏

![Slide 05 - Noisy channel protocol](assets/04-data-link-flow-control/slide-05.png)

信道一旦会丢帧，只靠 ACK 就不够了，需要两样新东西：

- **超时（timeout）**：发送方等太久没收到 ACK，就认为帧（或 ACK）丢了；
- **区分新帧与重传帧**：如果丢的是 ACK，发送方会把同一帧再发一次，接收方必须认出这是重复帧，不能交付两次。做法是给帧编 **序号（sequence number）**。
<!-- Sources: w4dl p.3-5; Apple Notes WEEK 4 Data Link3 -->

| 情形 | 问题 | 需要的机制 |
| --- | --- | --- |
| 极简协议 | 假设接收方无限快、信道不出错 | 无，但现实中接收方缓冲区会被淹没 |
| 有确认传输 | 快发送方对慢接收方，接收缓冲区有限 | 确认（ACK）：收到确认才发下一帧 |
| 有噪声信道 | 帧可能整个或部分丢失 | 超时判断帧是否到达；序号区分新帧和重传帧 |

<a id="topic-2"></a>
## 2. 停等协议与链路利用率

### ARQ：确认、超时、序号

![Slide 06 - Stop-and-wait protocol](assets/04-data-link-flow-control/slide-06.png)

**停等协议（stop-and-wait）** 属于 **ARQ（Automatic Repeat reQuest，自动重传请求）**：把上一节的确认、超时、序号合在一起，发一帧就停下，等确认到了再发下一帧。沿着图从上往下看：

1. 帧 0 到达，接收方接受并回 ACK，但 ACK 丢了（红色叉）；
2. 发送方超时，重发帧 0；接收方发现序号仍是 0，知道是重复帧，丢弃但再回一次 ACK；
3. 帧 1 在途中损坏，接收方忽略；发送方再次超时后重发，接收方接受。

序号只需 1 位（0/1 交替），就足以区分"新帧"和"重传帧"。

**易错**：学生笔记把"快发送方对慢接收方"写在停等协议下面；讲义里这个问题属于前一步"有确认传输"，停等协议额外解决的是噪声信道上的丢帧。
<!-- Sources: w4dl p.6; rev1 p.17; Apple Notes WEEK 4 Data Link3 -->

### 链路利用率

![Slide 07 - Link utilisation](assets/04-data-link-flow-control/slide-07.png)

看图下半部分的时间轴：发送方花 $T_f$ 把帧发完（深绿色条）；最后一个比特经过 $T_p$ 到达接收方；确认传输时间 $T_a$ 通常忽略为 0；确认再经过 $T_p$ 回来，发送方这时才能发 next。一轮总时间 $T_t=T_f+2T_p$ ，其中只有 $T_f$ 在真正传数据。

$$
U=\frac{T_f}{T_f+2T_p},\qquad T_f=\frac{L}{B}
\quad\Longrightarrow\quad
U=\frac{L}{L+2T_pB}.
$$

$L$ 是帧长（bit）， $B$ 是带宽（bit/s）， $T_p$ 是单程传播时延。
<!-- Sources: w4dl p.7; Apple Notes WEEK 4 Data Link3 -->

![Slide 08 - Utilisation example](assets/04-data-link-flow-control/slide-08.png)

**讲义例子**： $B=1$ Mbps， $T_p=50$ ms，帧长 10 kb。 $T_f=10^4/10^6=10$ ms， $U=10/(10+2\times50)\approx9.09\%$ 。图中深绿色条（ $T_f$ ）只占整条时间轴 $T_t$ 的一小段：九成多的时间链路都在空等确认，学生笔记也特别标注"效率很低"。
<!-- Sources: w4dl p.8; Apple Notes WEEK 4 Data Link3 -->

**易错**：分母是 $T_f+2T_p$ ：帧要过去，确认还要回来。只写一个 $T_p$ 会把利用率算高。

从 $U=L/(L+2T_pB)$ 可以看出：带宽 $B$ 越大、距离（ $T_p$ ）越长，停等越浪费。例如卫星链路的 $T_p$ 达数百毫秒，帧又短时，利用率会远低于 1%。这正是滑动窗口要解决的问题。

<a id="topic-3"></a>
## 3. 滑动窗口：Go-Back-N 与选择重传

### 窗口的含义

![Slide 09 - Sending and receiving windows](assets/04-data-link-flow-control/slide-09.png)

- **发送窗口（sending window）**：发送方维护的一组序号，对应当前允许发出、尚未确认的帧；
- **接收窗口（receiving window）**：接收方维护的一组序号，对应当前允许接受的帧。

讲义最后问停等协议的窗口有多大：发送窗口和接收窗口都是 1，所以停等协议是滑动窗口的特例。
<!-- Sources: w4dl p.9 -->

![Slide 10 - Stop-and-wait vs sliding window](assets/04-data-link-flow-control/slide-10.png)

两张图的时间长度相同。左边每发一帧就要等一个往返，链路一半时间空闲（50%）；右边在等待第一个确认的同时继续发后面的帧，把"管道"塞满，利用率可达 100%。
<!-- Sources: w4dl p.10 -->

<details markdown="1">
<summary>延伸内容（可选）：滑动窗口的利用率</summary>

讲义只给出示意图。常见的推广是：发送窗口为 $W$ 时，一轮 $T_f+2T_p$ 内最多能发 $W$ 帧，所以

$$
U=\min\!\left(1,\ \frac{W\,T_f}{T_f+2T_p}\right).
$$

要让利用率达到 1，需要 $W\ge (T_f+2T_p)/T_f$ 。以讲义例子计算， $W\ge110/10=11$ 。

</details>

### Go-Back-N

![Slide 11 - Go-Back-N](assets/04-data-link-flow-control/slide-11.png)

发送方可以连续发出最多 $N$ 帧而不必逐帧等确认：**接收窗口为 1，发送窗口为** $N$ 。沿着图看：

1. 帧 0、1 正常到达，接收方回 Ack0、Ack1；
2. 帧 2 出错（E）。接收窗口只有 1，接收方此后只接受帧 2，于是把已经在路上的 3–8 全部丢弃（D），而且**不发任何确认**；
3. 发送方为帧 2 设的定时器走完 Timeout interval 后，**从帧 2 开始全部重发**（2、3、4…），接收方这时才重新回 Ack2、Ack3……

讲义还提醒：在低带宽或长距离链路上，一帧要很久才能发完、到达，设置超时时间时要把这段时间算进去，否则会误判丢帧。

**易错**：Go-Back-N 的接收方出错后是"沉默"，不发 NAK；学生笔记把这一步写成"接收方发 NACK"，与讲义图不符。NAK 属于下面的选择重传。
<!-- Sources: w4dl p.11; Apple Notes WEEK 4 Data Link3 -->

理解用例（自拟）：发送窗口为 7，发送方已发出 0–6，帧 3 丢失。接收方丢弃 4、5、6；帧 3 超时后，发送方要重发 3、4、5、6 共 4 帧，其中 4–6 其实已经到过接收方一次。这就是 Go-Back-N 浪费带宽的地方。

### 选择重传

![Slide 12 - Selective repeat](assets/04-data-link-flow-control/slide-12.png)

**选择重传（selective repeat）** 中，接收方接受接收窗口内的任何帧。看图中帧 2 出错之后：

1. 接收方照收 3、4、5，把它们放在数据链路层的缓冲区里（Frames buffered by data link layer）；
2. 接收方发出 **NAK（negative acknowledgement，否定确认）** 2，发送方不必等超时就只重发帧 2；
3. 帧 2 补到后，接收方把缓存的 3–5 一起按序交付，并回 **Ack 5**。这是 **累积确认（cumulative ack）**：确认号表示"按序收到的最高帧号"，一个 Ack 5 同时确认了 2–5。

学生笔记补充：选择重传为每一帧单独计时，超时只重发那一帧；窗口大小受缓冲区大小限制，缓冲区越大窗口可以开得越大。
<!-- Sources: w4dl p.12; Apple Notes WEEK 4 Data Link3 -->

### 两者比较

![Slide 13 - Go-Back-N vs selective repeat](assets/04-data-link-flow-control/slide-13.png)

讲义把差别落在接收方出错后的做法上，下表把两张图并排整理：

| | Go-Back-N | 选择重传 |
| --- | --- | --- |
| 接收窗口 | 1 | 大于 1 |
| 出错后接收方 | 丢弃之后所有帧，直到收到下一个按序帧才确认 | 缓存出错点之后的好帧 |
| 重传 | 从出错帧起全部重传 | 只重传丢失或出错的帧 |
| 代价 | 浪费带宽 | 需要接收缓冲区，逻辑更复杂 |
<!-- Sources: w4dl p.13; rev1 p.18 -->

本质是 **带宽利用与链路层缓冲空间之间的权衡**：Go-Back-N 的接收方只接受下一个按序帧，其他一律丢弃，所以不需要缓冲区；选择重传要先收下出错点之后的好帧，等缺失帧补到再按序交付，所以需要缓冲区。

<a id="topic-4"></a>
## 4. 真实的数据链路协议

讲义最后举了三个实际例子：PPP、SONET 上的分组、ADSL 上的 PPP。

### PPP

![Slide 15 - PPP frame](assets/04-data-link-flow-control/slide-15.png)

**PPP（Point-to-Point Protocol）** 是在链路上传送分组的标准协议：

- 成帧：用标志字节 `01111110` 加字节填充（见 [03 成帧](03-data-link-framing-and-error-control.md#topic-2)）；
- 默认服务：无编号模式（unnumbered mode），即无确认无连接服务，控制字段固定为 `00000011`；
- 差错检测：校验和字段（2 或 4 字节）。

看图下方的帧格式，每格上方是字节数。从左到右是：Flag（1 字节）、Address（1 字节，全 1）、Control（1 字节）、Protocol（1 或 2 字节，指明载荷是哪种协议，如 IP）、Payload（可变长，装 IP 分组）、Checksum（2 或 4 字节）、Flag。
<!-- Sources: w4dl p.14-15; Apple Notes WEEK 3-4 Data Link Layer -->

### SONET 上的分组

![Slide 16 - Packet over SONET](assets/04-data-link-flow-control/slide-16.png)

在同步光网络 **SONET（Synchronous Optical NETwork）** 上承载 IP 分组时，用 PPP 成帧。左图是两台路由器之间的协议栈：IP / PPP / SONET，中间是光纤；右图说明 PPP 帧与 SONET 载荷不必一一对应，一个 PPP 帧可以跨两个 SONET 载荷。
<!-- Sources: w4dl p.16 -->

### ADSL

![Slide 17 - ADSL protocol stacks](assets/04-data-link-flow-control/slide-17.png)

**ADSL** 是通过电话线提供的宽带上网，从用户家的调制解调器连到 ISP 机房的 **DSLAM**。看图中两侧的协议栈：家里的 PC 通过以太网连到 DSL modem；IP 分组先装进 PPP，再经 AAL5、ATM，最后由 ADSL 物理层通过本地环路（local loop）送到 ISP 的 DSLAM，再进入 Internet。

**易错**：学生笔记把 ADSL 写成"拨号上网"。ADSL 确实走电话线，但它是始终在线的宽带，用的是语音频段以上的频率；拨号上网则占用语音频段、上网时不能打电话。
<!-- Sources: w4dl p.17; Apple Notes WEEK 2 Reference Models -->

![Slide 18 - AAL5 frame](assets/04-data-link-flow-control/slide-18.png)

ATM 使用短的、固定大小的 **信元（cell）**：53 字节 = 5 字节头部 + 48 字节载荷，每个信元带虚电路标识。PPP 帧先转换成 AAL5 帧（PPPoA）：看图中的 Structure of AAL5 frame，前面是 PPP 协议字段和 PPP 载荷（AAL5 payload），后面加填充（Pad，0–47 字节，使总长是 48 的倍数）和 AAL5 尾部（Unused、Length、CRC）。然后整个 AAL5 帧被切成若干 48 字节片段，每片加 5 字节头部成为一个 ATM 信元。
<!-- Sources: w4dl p.18; Apple Notes WEEK 3-4 Data Link Layer -->

## 本讲自测

1. 一条卫星链路 $T_p=270$ ms，带宽 1 Mbps，帧长 1000 bit。停等协议的利用率是多少？窗口至少多大才能让利用率接近 1？
2. 为什么 Go-Back-N 的接收方不需要缓冲区，而选择重传需要？
3. 在选择重传中，帧 4 出错、5–7 正常到达。接收方会发出哪些 NAK 和累积确认？
4. PPP 的默认服务属于数据链路层三种服务中的哪一种？它的控制字段为什么可以固定？
