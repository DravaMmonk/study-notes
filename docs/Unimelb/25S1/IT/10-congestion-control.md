# COMP90007 Week 9 - Quality of Service and Congestion Control

来源：`lecture/Week9-Transport Layer-Lectures2and3.pdf`（Transport Layer (3)，页脚编号 57–72）、`lecture/Week12-Review-Lecture3.pdf` p.12–16（p.12–14 与讲义页重复，p.15–16 为复习题，只取概念）；Apple Notes：CS/25S1/IT — "WEEK9 - Transport4 - Congestion Control"；CS/25S1/IT/Review — "Transport Layer"。

这篇讲的是：**当太多发送方同时把数据塞进网络时，网络为什么会"越忙越没用"？TCP 怎样感知并调整自己的发送速率？**

学习路线：[服务质量与拥塞](#topic-1) → [流量控制与拥塞控制](#topic-2) → [TCP 的慢启动与加性增](#topic-3) → [TCP Tahoe 与 Reno](#topic-4)。

重点：两个窗口取最小、慢启动阈值的更新规则、Tahoe 与 Reno 的区别。难点：逐个 RTT 手算拥塞窗口。易错：慢启动其实是指数增长；丢包后新阈值是"丢包时拥塞窗口的一半"，不是旧阈值的一半。

<a id="topic-1"></a>
## 1. 服务质量与拥塞

### 服务质量的四个指标

![Slide 03 - Quality of service measures](assets/10-congestion-control/slide-03.png)

许多网络应用都以期望的网络性能为重要标准。**服务质量（Quality of Service，QoS）** 要关注讲义列出的四件事：

| 指标 | 含义 |
| --- | --- |
| 带宽（bandwidth） | 每秒能传送的数据量 |
| 丢失（loss） | 被丢弃或未送达的分组 |
| 时延（delay） | 数据到达目的地所需的时间 |
| 抖动（jitter） | 分组之间时延的变化 |
<!-- Sources: w9tl p.3; Apple Notes WEEK9 Transport4 -->

### 网络拥塞

![Slide 04 - Network congestion](assets/10-congestion-control/slide-04.png)

**拥塞（congestion）** 发生在对网络资源的需求超过可用容量、性能随之下降的时候。讲义把后果对应到上面的指标：

- 路由器队列被填满，时延和抖动升高；
- 路由器开始丢包，丢包率上升；
- **有效吞吐量（goodput）** 下降，因为开销和重传增多。goodput 是单位时间内交付的 **有用** 分组数。
<!-- Sources: w9tl p.4 -->

### 拥塞的后果：goodput 曲线

![Slide 05 - Goodput vs offered load](assets/10-congestion-control/slide-05.png)

横轴是注入网络的负载，纵轴是 goodput。理想曲线在达到网络容量后保持水平；"期望的响应"在接近容量时平滑地靠上去；而实际情况可能在越过拥塞起点后一路下滑，直到 **拥塞崩溃（congestion collapse）**：网络忙着传送重传和注定被丢弃的分组，真正有用的几乎没有。
<!-- Sources: w9tl p.5; rev2 p.12 -->

<a id="topic-2"></a>
## 2. 流量控制与拥塞控制

### 拥塞控制的一般做法

![Slide 06 - Congestion control approach](assets/10-congestion-control/slide-06.png)

传输层的 **拥塞控制（congestion control）** 旨在防止太多流量进入网络。一般做法分两步：利用网络给出的 **反馈**（如丢包）检测拥塞；通过调整发送方注入数据的 **速率** 来应对，防止过载。
<!-- Sources: w9tl p.6; Apple Notes WEEK9 Transport4 -->

### 两种控制保护的对象不同

![Slide 07 - Flow control vs congestion control definitions](assets/10-congestion-control/slide-07.png)

两者都限制发送速率，但讲义强调范围不同：流量控制只看发送方到接收方这一对，保证接收方不被淹没；拥塞控制要看网络能否承载这些流量，是"全局"的，考虑发送方与接收方之间整条路径的状态，包括路由器和交换机。

| | 流量控制 | 拥塞控制 |
| --- | --- | --- |
| 保护谁 | 接收方的缓冲区 | 网络的容量 |
| 范围 | 发送方到接收方之间 | 全局：整条路径 |
| 忽略它的后果 | 接收缓冲区溢出 | 发送过猛，网络无法承受 |
<!-- Sources: w9tl p.7; Apple Notes Review Transport Layer -->

![Slide 08 - Tap and bucket analogy](assets/10-congestion-control/slide-08.png)

左图：水管很粗，但接收的小桶装不下，这是 **流量控制** 要解决的问题。右图：桶很大，但中间的水管内部堵了（internal congestion），这是 **拥塞控制** 要解决的问题。两种情况都要拧小水龙头，原因却不同。
<!-- Sources: w9tl p.8 -->

### TCP 的发送速率

![Slide 09 - Sending rate in TCP](assets/10-congestion-control/slide-09.png)

TCP 调整速率时同时考虑网络容量和接收方容量，发送方维护 **两个窗口**：

- **流量控制窗口**：接收方缓冲区的大小（TCP 头部的 Window 字段，见 [09 窗口管理](09-transport-layer-udp-tcp.md#topic-5)）；
- **拥塞窗口（congestion window，cwnd）**：发送方任何时刻在网络中可以有多少字节（未被确认的数据）。

$$
\text{最大发送量}=\min(\text{流量控制窗口},\ \text{拥塞窗口}).
$$
<!-- Sources: w9tl p.9 -->

**理解用例（自拟）**：接收方通告 16 KB、拥塞窗口为 10 KB 时，最多只能有 10 KB 未确认数据在途，此时限制来自网络；若拥塞窗口长到 20 KB，限制就换成接收方的 16 KB。

<a id="topic-3"></a>
## 3. TCP 的慢启动与加性增

### 拥塞信号

![Slide 10 - Congestion control of TCP](assets/10-congestion-control/slide-10.png)

TCP 从网络层收到拥塞信号来调整速率。信号就是 **丢包**：通过 **超时** 或 **重复确认（duplicate acknowledgement）** 发现，并假定丢包是拥塞造成的。拥塞窗口按 **加性增、乘性减（Additive Increase Multiplicative Decrease，AIMD）** 的控制律调整。讲义最后两行预告了本讲的两个版本：Tahoe 是"慢启动 + 加性增"，Reno 是"Tahoe + 快速恢复"。
<!-- Sources: w9tl p.10 -->

<details markdown="1"><summary>延伸内容（可选）：丢包不一定是拥塞</summary>

在有线网络中比特错误极少，丢包几乎都是路由器队列溢出造成的，所以"丢包 = 拥塞"是合理的假设。无线链路本身误码较多，丢包未必意味着拥塞，TCP 却会误以为拥塞而不必要地降速。

</details>

### 慢启动

![Slide 11 - Slow start rules](assets/10-congestion-control/slide-11.png)

拥塞窗口表示某一时刻可以有多少 **在途（未确认）** 的段。

1. 连接建立时，发送方把拥塞窗口设为 1（或很小的数），发出一个段；
2. 这个段在定时器到期前被确认，就把窗口加一个段，发两个段；
3. 每确认一个新段，窗口再加一个段。
<!-- Sources: w9tl p.11; Apple Notes WEEK9 Transport4 -->

![Slide 12 - Slow start trace](assets/10-congestion-control/slide-12.png)

左边是每收到一个确认后的 cwnd：1 → 2 → 3、4 → 5、6、7、8。右边是每个 RTT 发的段数：1、2、4、4。**每一批确认使窗口翻倍**，一直增长，直到超时或达到接收方的流量控制窗口。最后一轮窗口已到 8，但每个 RTT 仍只送出 4 个段：标注 "pipe is full" 表示这条路径一个 RTT 只装得下 4 个段，再大的窗口也不会让吞吐继续翻倍。
<!-- Sources: w9tl p.12 -->

**易错**：名字叫"慢"启动，增长却是 **指数** 的。"慢"是相对于一开始就按接收窗口全速发送而言的。

### 慢启动阈值

![Slide 13 - Slow start threshold](assets/10-congestion-control/slide-13.png)

为了不让指数增长冲过头，发送方设一个 **慢启动阈值（slow start threshold）**：

- 初始时设为接收方窗口的大小；
- **检测到丢包**：阈值设为 **当前拥塞窗口的一半**，整个过程重新开始（拥塞窗口重新初始化）；
- **越过阈值**：从慢启动切换到 **加性增（additive increase）**，每个 RTT 窗口只加一个段。
<!-- Sources: w9tl p.13; Apple Notes WEEK9 Transport4 -->

### 加性增

![Slide 14 - Additive increase trace](assets/10-congestion-control/slide-14.png)

和慢启动的图对比：这里每个 RTT 的段数是 1、2、3、4，cwnd 每轮只加 1，而不是翻倍。讲义为了对照从 cwnd = 1 画起；实际 TCP 只在越过阈值后才进入这种线性增长。最后一轮同样受管道容量限制，只送出 4 个段。
<!-- Sources: w9tl p.14 -->

<a id="topic-4"></a>
## 4. TCP Tahoe 与 Reno

### TCP Tahoe

![Slide 15 - TCP Tahoe](assets/10-congestion-control/slide-15.png)

**TCP Tahoe**：慢启动后接加性增；丢包后阈值变为丢包时窗口的一半，窗口回到 1。看图：初始阈值 32 KB，窗口按 1、2、4、8、16、32 翻倍到阈值，然后每轮加 1 直到 40；此时丢包，新阈值为 $40/2=20$ KB，窗口跌回 1，再次慢启动到 20，之后又是加性增。

**易错**：讲义标题写 "threshold is half of previous after packet loss"，这里的 previous 指丢包前的 **拥塞窗口**（图中是 40），不是之前的阈值 32；按阈值算会得到 16，与图中的 20 KB 不符。
<!-- Sources: w9tl p.15; rev2 p.13 -->

### TCP Reno

![Slide 16 - TCP Reno](assets/10-congestion-control/slide-16.png)

**TCP Reno** = Tahoe + **快速恢复（fast recovery）**：除了连接刚建立或发生超时，Reno 不再回到慢启动。用重复确认发现丢包时，窗口直接降到新阈值（丢包时窗口的一半），然后继续加性增。看图：第一次丢包后窗口从 40 降到 20，接着线性上升；第二次丢包后再减半。曲线因此呈锯齿形，这正是"加性增、乘性减"的样子。
<!-- Sources: w9tl p.16; rev2 p.14; Apple Notes WEEK9 Transport4 -->

| | Tahoe | Reno |
| --- | --- | --- |
| 丢包后阈值 | 丢包时窗口的一半 | 丢包时窗口的一半 |
| 丢包后窗口 | 回到 1，重新慢启动 | 重复确认发现：降到新阈值，继续加性增；超时：回到 1 |
| 何时慢启动 | 开始时和每次丢包后 | 只在开始时和超时后 |
<!-- Sources: w9tl p.15-16; Apple Notes WEEK9 Transport4 -->

### 手算拥塞窗口

**理解用例（自拟）**：以段为单位，TCP Tahoe 当前阈值为 20，在拥塞窗口为 32 时发生超时。

1. 新阈值 $=32/2=16$ ；
2. 窗口重置为 1，之后每个 RTT：

| 重置后第几个 RTT | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| 拥塞窗口 | 2 | 4 | 8 | 16 | 17 | 18 |
| 阶段 | 慢启动 | 慢启动 | 慢启动 | 达到阈值 | 加性增 | 加性增 |

若改用 Reno，且丢包是由重复确认发现的，窗口会直接从 16 开始加性增：17、18、19……
<!-- Sources: w9tl p.13-16; rev2 p.15-16 -->

**易错**：新阈值取的是 **丢包时的拥塞窗口** 的一半（这里是 32 的一半），不是旧阈值 20 的一半。学生的复习笔记特别练习了这一类逐 RTT 推算。还要注意切换点：窗口 **到达** 阈值的那一轮之后才改为每轮加 1，例如阈值为 8 时依次是 2、4、8、9、10。
<!-- Sources: Apple Notes Review Transport Layer -->

## 本讲自测

1. 一条路径上接收方缓冲区很大、中间某个路由器却持续丢包。该由流量控制还是拥塞控制来应对？为什么？
2. 接收方通告窗口 8 KB，拥塞窗口为 12 KB。发送方此刻最多能有多少未确认数据？
3. TCP Tahoe 在拥塞窗口为 64 时超时。新阈值是多少？窗口重置为 1 后，接下来 6 个 RTT 的窗口分别是多少？
4. 同样一次丢包，若由三个重复确认发现，Reno 的窗口会怎样变化？与 Tahoe 相比少走了哪一段？
