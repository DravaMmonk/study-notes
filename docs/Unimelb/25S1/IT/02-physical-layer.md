# COMP90007 Weeks 2–3 - Physical Layer

来源：`lecture/Week2-Lecture3.pdf`（Physical Layer (1)）、`lecture/Week3-physical-layer-2.pdf`（Physical Layer (2)）；例题答案 `lecture/example_solutions.pdf`（时延）、`lecture/W3-L2-example_solutions.pdf`（Nyquist/Shannon）；`lecture/Week12-Review-handout.pdf` p.7–11。Apple Notes：CS/25S1/IT — "WEEK 2-3 Physical Layer"；CS/25S1/IT/Review — "Physical Layer"。

这篇讲的是：**比特怎样变成能在线缆或空气中传播的信号？一条信道最多能传多快？**

学习路线：[链路模型与时延](#topic-1) → [有线介质](#topic-2) → [无线与卫星](#topic-3) → [用信号表示比特](#topic-4) → [信道容量与复用](#topic-5)。

重点：时延计算、Nyquist 与 Shannon 两个上限。难点：码元速率与数据速率的关系、分贝换算。易错：实际上限取两个定理中**较小**的那个；传输时延与传播时延不要混淆。

<a id="topic-1"></a>
## 1. 链路模型与时延

### 物理层管什么

![W2L3 slide 02 - What is the physical layer](assets/02-physical-layer/slide-w2l3-02.png)

幻灯片先让你回忆参考模型：物理层是 OSI 和混合模型的最底层。它关心网络的三类接口：**电气（electrical）**，如电压和信号强度；**时序（timing）**，如数据速率；**机械（mechanical）**，如材料和线缆长度。本讲的四部分正好按"时序 → 机械（介质）→ 电气（信号）→ 信道容量"排列。
<!-- Sources: w2l3 p.2; rev1 p.7; Apple Notes EXAM PREPARATION -->

### 把物理信道抽象成一条链路

![W2L3 slide 04 - Simplified link model](assets/02-physical-layer/slide-w2l3-04.png)

图中左右两台机器各有一整套协议栈（HTTP、TCP、IP、PHY），只有最底下的 PHY 之间画了一条长度为 $L$ 米的线，比特串 `10111..` 就沿这条线走。**简化链路模型（simplified link model）** 把物理介质看成这样一条链路，网络就是一串互连的链路。描述一条链路只需要两个量：

- **带宽（bandwidth）**：传输速率，单位 bit/s；
- **时延（delay）**：第一个比特从 A 到达 B 所需的时间。
<!-- Sources: w2l3 p.4-5 -->

**讲义例子**：讲义问一根单模光纤（约 1 Tbit/s）能同时承载多少路语音（每路约 1 kbit/s）。答案是 $10^{12}/10^{3}=10^{9}$ 路，也就是十亿路。做这类题先统一单位前缀：kilo $10^3$ 、mega $10^6$ 、giga $10^9$ 、tera $10^{12}$ 。
<!-- Sources: w2l3 p.6 -->

### 传输时延与传播时延

![W2L3 slide 07 - Message latency](assets/02-physical-layer/slide-w2l3-07.png)

幻灯片把发送一条消息的总时延（latency）拆成两部分，最后一行把它们相加：

$$
\text{T-delay}=\frac{\text{消息长度（bit）}}{\text{传输速率（bit/s）}},\qquad
\text{P-delay}=\frac{\text{信道长度}}{\text{信号速度}},
$$

$$
\text{Latency}=\text{T-delay}+\text{P-delay}.
$$

- **传输时延（transmission delay）**：把所有比特"推上"链路要多久，取决于带宽；
- **传播时延（propagation delay）**：一个比特在介质里跑完全程要多久，取决于距离和信号速度。光速 $C=300\,000$ km/s；在铜线中信号速度约为 $\frac{2}{3}C=200\,000$ km/s。
<!-- Sources: w2l3 p.7; rev1 p.11; Apple Notes Review Physical Layer -->

**易错**：传输时延与距离无关，传播时延与消息长度无关。学生复习笔记写成 T = 数据量 / 速率，P = 长度 / 信号速度，正是这两个不相干的因素。

#### 例题：调制解调器与光纤宽带

讲义 p.8–9 两道例题，帧长都是 5600 bit：

| 情形 | T-delay | P-delay | Latency |
| --- | --- | --- | --- |
| 56 kbps 调制解调器，5 km，信号速度 $\frac{2}{3}C$ | $5600/56\,000=100$ ms | $5/200\,000$ s $=0.025$ ms | $100.025$ ms |
| 100 Mbps 光纤，1000 km，信号速度 $C$ | $5600/10^8=0.056$ ms | $1000/300\,000$ s $\approx3.33$ ms | $\approx3.39$ ms |
<!-- Sources: example_solutions.pdf p.1-2; w2l3 p.8-9 -->

对比两行：慢速短链路几乎全是传输时延；高速长链路几乎全是传播时延。带宽越来越大时，长距离通信的瓶颈就变成光速。讲义答案写作 3.386 ms，是四舍五入的小差别。

### 带宽增长快于 CPU

CPU 速度大约每十年提升 20 倍，且已接近硅片工艺的物理极限；带宽大约每十年提升 125 倍，从 1981 年的 56 kbps 调制解调器到今天可达数十 Tbps。
<!-- Sources: w2l3 p.10 -->

<a id="topic-2"></a>
## 2. 有线介质

### 信号衰减

![W2L3 slide 13 - Signal attenuation](assets/02-physical-layer/slide-w2l3-13.png)

看图下方：左边进入介质的红色波形很高，穿过介质后右边的蓝色波形明显变矮，上方的包络线表示幅度沿距离 $d$ 逐渐下降。这就是 **衰减（attenuation）**：信号穿过介质时幅度（强度）的下降。衰减决定一种介质能传多远、传多少数据，因此不同介质适合不同场景。
<!-- Sources: w2l3 p.13 -->

### 铜线：双绞线与同轴电缆

![W2L3 slide 14 - Twisted pair](assets/02-physical-layer/slide-w2l3-14.png)

右边的照片里能看到四对两两绞在一起的铜线。**双绞线（twisted pair）**：两根绝缘铜线绞成螺旋形。绞合能抵消外部电磁干扰（EMI）和线对之间的串扰；距离可达约 5 km，中继器（repeater）可延长。下一页（p.15）列出类别：Cat 3 约 16 MHz，Cat 5 绞得更密、干扰更少，约 100 MHz，Cat 8 可达 2 GHz；幻灯片提示不必记单位，只要知道数值越大越好。

![W2L3 slide 16 - Coaxial cable](assets/02-physical-layer/slide-w2l3-16.png)

右边的剖面图从里到外是：铜芯（copper wire）、绝缘层（insulation）、金属网（copper mesh）、外护套（outside insulation）。**同轴电缆（coaxial cable）** 因为多了这层金属网，屏蔽比双绞线好，速度更高、距离更远，带宽接近 1 GHz，仍广泛用于有线电视和宽带。
<!-- Sources: w2l3 p.14-17; Apple Notes WEEK 2-3 Physical Layer -->

### 光纤

**光纤（fibre optics）** 在玻璃纤维中传光，带宽巨大（THz 级）且损耗极小，常用于 ISP 之间的骨干链路和光纤到户。

![W2L3 slide 18 - Light through fibre](assets/02-physical-layer/slide-w2l3-18.png)

图中从左到右是光纤系统的三部分：光源（LED 或半导体激光器，有光表示 1、无光表示 0）、光纤本身、光电探测器（光照到时产生电脉冲）。中间的锯齿线表示光在纤芯与包层的边界发生 **全反射（total internal reflection）**，所以被"困"在光纤里向前走。
<!-- Sources: w2l3 p.18 -->

![W2L3 slide 19 - Single-mode and multi-mode fibre](assets/02-physical-layer/slide-w2l3-19.png)

右边的剖面图标出纤芯（core，玻璃）、包层（cladding，玻璃）和外护套（jacket，塑料）。纤芯的粗细决定了两种光纤：

- **单模光纤（single-mode）**：纤芯很细（约 10 μm），光几乎不反弹，配合激光传输约 100 km 的长距离；
- **多模光纤（multi-mode）**：纤芯约 50 μm，光会反弹，配合 LED，便宜但距离短。
- 下一页（p.20）比较连接方式的损耗：连接器 10–20%，机械接续约 10%，熔接小于 1%。
<!-- Sources: w2l3 p.19-20 -->

![W2L3 slide 21 - Fibre optic ring](assets/02-physical-layer/slide-w2l3-21.png)

光纤既可以组成环，也可以组成总线。左图是一个光纤环：每台计算机通过一个接口挂在环上。右边放大了接口内部：光进来先由光接收器（photodiode）变成电信号，经电信号再生器（regenerator）整形，再由光发送器（LED）变回光送往下一段；同时，接口通过铜线与计算机交换数据。所以光纤环实际上是一串点到点链路。

![W2L3 slide 22 - Wires versus fibre](assets/02-physical-layer/slide-w2l3-22.png)

最后用一张表对比铜线（双绞线和同轴）与光纤：

| 性质 | 铜线（双绞线、同轴） | 光纤 |
| --- | --- | --- |
| 距离 | 短（数百米） | 长（数十千米） |
| 带宽 | 中等 | 很高 |
| 安全 | 容易被窃听 | 难以窃听 |
| 成本 | 便宜 | 较贵 |
| 使用便利 | 容易 | 较难 |
<!-- Sources: w2l3 p.22 -->

<a id="topic-3"></a>
## 3. 无线与卫星

### 电磁波

无线网络的共同基础是 **电磁波（electromagnetic wave）** 传播。信号在一个区域内广播，可能互相碰撞，所以需要频谱管理。

![W3PHY slide 03 - Basics of electromagnetic waves](assets/02-physical-layer/slide-w3phy-03.png)

右下的正弦波上标出了"1 Wavelength"：相邻两个波峰之间的距离。

- **频率（frequency）** $f$ ：每秒振荡次数，单位 Hz；
- **波长（wavelength）** $\lambda$ ：相邻两个波峰（或波谷）之间的距离；
- 所有电磁波在真空中的速度都等于光速 $c\approx3\times10^8$ m/s。

$$
\lambda\times f=c.
$$
<!-- Sources: w3phy p.2-3; Apple Notes WEEK 2-3 Physical Layer -->

**理解用例（自拟）**：2.4 GHz 的 Wi-Fi 波长约为 $3\times10^8/2.4\times10^9\approx0.125$ m，即约 12.5 cm。频率越高，波长越短。

![W3PHY slide 04 - Electromagnetic spectrum](assets/02-physical-layer/slide-w3phy-04.png)

上面一条是整个频谱，从左到右频率升高：无线电、微波、红外、可见光、紫外……；虚线把 $10^4$ 到 $10^{16}$ Hz 放大成下面一条，标出各介质和应用占用的频段：双绞线和同轴在低频，卫星和地面微波在 $10^9$–$10^{10}$ Hz 附近，光纤在 $10^{14}$ Hz 附近。不同频段性质不同：无线电（radio）适合广域广播；微波（microwave）用于局域网和 3G/4G；红外线和可见光要求视线（line-of-sight）。
<!-- Sources: w3phy p.4 -->

### 通信卫星

![W3PHY slide 06 - Types of satellites](assets/02-physical-layer/slide-w3phy-06.png)

图中纵轴是轨道高度，右边两列是时延（latency）和覆盖全球所需卫星数；两段灰色是上下两条 Van Allen 辐射带，卫星要避开它们。高度越高，单颗覆盖越大、需要的卫星越少，但时延越大：

| 类型 | 高度 | 时延 | 全球覆盖所需卫星 |
| --- | --- | --- | --- |
| GEO（地球同步） | 约 35 800 km，相对地面静止 | 约 270 ms | 3 |
| MEO（中轨） | 两条 Van Allen 辐射带之间 | 35–85 ms | 10 |
| LEO（低轨） | 最低，如 Starlink 第一轨道壳约 550 km | 1–7 ms | 50（Starlink 用上千颗） |
<!-- Sources: w3phy p.5-8 -->

![W3PHY slide 07 - Geostationary satellites](assets/02-physical-layer/slide-w3phy-07.png)

GEO 卫星借助中心站（hub）让小型地面终端 VSAT 互相通信：图中编号 1–4 的箭头表示一个 VSAT 先发到卫星（1），卫星转给 hub（2），hub 再经卫星（3）转到目标 VSAT（4）。所用的 L、S、C、Ku、Ka 频段可能拥挤，或容易受降雨影响。

![W3PHY slide 08 - Low-Earth orbit satellites](assets/02-physical-layer/slide-w3phy-08.png)

地球表面的网格就是 Starlink 第一轨道壳：72 条轨道、每条 22 颗，共 1584 颗卫星，高度 550 km。低轨卫星单颗覆盖小，所以要用大量卫星组成星座（constellation）才能覆盖全球。

**理解用例（自拟）**：LEO 只有几毫秒时延，适合视频通话这类交互应用；一颗 GEO 卫星相对地面静止、覆盖面大，适合电视广播，约 270 ms 的时延对单向广播影响不大。

### 卫星、光纤、无线、有线的比较

![W3PHY slide 10 - Wireless versus wired](assets/02-physical-layer/slide-w3phy-10.png)

幻灯片用"+"标优点、"−"标缺点。上一页（p.9）用同样格式比较卫星与光纤，合起来是：

| 比较 | 优点 | 缺点 |
| --- | --- | --- |
| 卫星 | 发射后可随时随地快速建立通信；能向大区域广播 | 带宽有限，需管理干扰 |
| 光纤 | 长距离超大带宽 | 偏远地区难以铺设 |
| 无线 | 天然支持移动和广播；部署容易便宜 | 互相干扰需管理；信号强度和速率波动大 |
| 有线 | 容易维持固定速率；支持点到点 | 长距离部署昂贵；不便支持移动和广播 |
<!-- Sources: w3phy p.9-10; rev1 p.8 -->

<a id="topic-4"></a>
## 4. 用信号表示比特

### 改变正弦波的三个参数

信息通过改变某个物理量（电压、电流）来传送。对正弦波

$$
f(t)=c\sin(at+b),
$$

$c$ 是幅度（amplitude）， $a/(2\pi)$ 是频率， $b$ 是相位（phase）。改变其中任一个，都能表示不同的符号。
<!-- Sources: w3phy p.12 -->

![W3PHY slide 13 - Amplitude, frequency and phase](assets/02-physical-layer/slide-w3phy-13.png)

三张小图分别只改了一个参数：上图两条曲线高低不同（幅度），中图疏密不同（频率），下图左右错开（相位）。接收方据此区分符号。
<!-- Sources: w3phy p.13; rev1 p.9 -->

### 基带与频带传输

**调制（modulation）** 把比特变成信号；调制解调器（modem）就是调制器加解调器。

![W3PHY slide 14 - Baseband and passband (ADSL)](assets/02-physical-layer/slide-w3phy-14.png)

- **基带传输（baseband transmission）**：信号占用从 0 到某个最高频率的范围，例如电话系统的 0–4 kHz；
- **频带传输（passband transmission）**：信号被搬移到更高的频率范围。

下方的 ADSL 频谱图是频带传输的例子：最左边红色窄条是 0–4 kHz 的语音频段（voice band），留一段空隙后，蓝色 25.875–138 kHz 是上行（upstream），绿色 138–1104 kHz 是下行（downstream），ADSL2+ 再把下行扩展到 2208 kHz。同一根电话线因此能同时打电话和上网。
<!-- Sources: w3phy p.14; Apple Notes WEEK 2-3 Physical Layer -->

![W3PHY slide 15 - Modulation types](assets/02-physical-layer/slide-w3phy-15.png)

最上面是 NRZ（不归零）比特信号，下面三行对同一串比特分别用：**幅移键控（ASK）**——1 有波、0 无波；**频移键控（FSK）**——1 和 0 用不同频率；**相移键控（PSK）**——比特变化时相位翻转。
<!-- Sources: w3phy p.15 -->

### 码元速率与数据速率

![W3PHY slide 17 - Symbol rate](assets/02-physical-layer/slide-w3phy-17.png)

左图只有 0 V 和 3 V 两种电平，一个码元表示 1 bit；右图有四种电平，一个码元表示 2 bit（每格上方标着 "10"、"11"、"01" 等两位比特）。

- **码元速率（symbol rate，baud rate）**：每秒信号变化的次数；
- **数据速率（data rate）**：每秒传送的比特数。

若信号有 $V$ 种可区分的电平（模式），每个码元携带 $\log_2V$ bit：

$$
\text{Data Rate}=\log_2V\times\text{Symbol Rate}.
$$
<!-- Sources: w3phy p.16-17; Apple Notes WEEK 2-3 Physical Layer -->

**理解用例（自拟）**：每秒变化 1000 次、有 16 种电平的信号，数据速率是 $\log_2 16\times1000=4000$ bit/s。

<a id="topic-5"></a>
## 5. 信道容量与复用

### Nyquist：无噪声信道

![W3PHY slide 20 - Nyquist theorem](assets/02-physical-layer/slide-w3phy-20.png)

框里的公式适用于带宽为 $B$ 、有 $V$ 种信号电平的 **无噪声（noiseless）** 信道：

$$
\text{Max. data rate}=2B\log_2V\ \text{bit/s}.
$$

提高带宽或增加电平数都能提高速率。 $2B$ 是每秒能区分的最大码元数， $\log_2V$ 是每个码元的比特数。
<!-- Sources: w3phy p.20; rev1 p.10 -->

### Shannon：有噪声信道

![W3PHY slide 22 - Shannon theorem](assets/02-physical-layer/slide-w3phy-22.png)

公式下面的两个箭头说明两个因素各管什么： $B$ 决定"信号能变多快"（how fast signal can change）， $S/N$ （信噪比，signal-to-noise ratio）决定"能看出多少个电平"（how many levels can be seen）：

$$
\text{Max. data rate}=B\log_2\!\left(1+\frac{S}{N}\right)\ \text{bit/s}.
$$

![W3PHY slide 23 - Large and small SNR](assets/02-physical-layer/slide-w3phy-23.png)

上一行信号远强于噪声，叠加后仍能看清方波；下一行信号与噪声差不多，叠加后很难分辨电平。这说明为什么提高电平数不能无限提高速率：电平越多，相邻电平越接近，噪声越容易让接收方判错。

信噪比常用分贝（dB）给出，要先换算：

$$
\text{SNR}_{\text{dB}}=10\log_{10}\frac{S}{N}.
$$
<!-- Sources: w3phy p.22-23; sol-w3 p.2 -->

**易错**：代入 Shannon 公式的是比值 $S/N$ ，不是分贝数。20 dB 对应 $S/N=100$ ，30 dB 对应 1000。

### 例题：两个上限取较小者

讲义 p.24–26 依次给出三道例题，答案在 `W3-L2-example_solutions.pdf`：

| 题目 | 计算 | 结果 |
| --- | --- | --- |
| 二进制信号，3 kHz 信道（Nyquist） | $2\times3000\times\log_2 2$ | 6 kbps |
| SNR = 20 dB，4 kHz（Shannon） | $S/N=100$ ， $4000\times\log_2 101$ | $\approx26.63$ kbps |
| 二进制信号，3 kHz，SNR = 20 dB | Shannon： $3000\times\log_2 101\approx19.97$ kbps；Nyquist：6 kbps | 6 kbps |
<!-- Sources: sol-w3 p.1-3; w3phy p.24-26 -->

第三题同时满足两个限制：Shannon 说噪声允许约 20 kbps，但二进制信号每个码元只有 1 bit，Nyquist 只允许 6 kbps。**可达上限总是两者中较小的那个**，这也是学生笔记特别强调的一点。
<!-- Sources: Apple Notes WEEK 2-3 Physical Layer -->

### 信道的方向

- **全双工（full-duplex）**：两个方向同时传，例如每个方向用不同的双绞线；
- **半双工（half-duplex）**：两个方向都能传，但不能同时，例如无线信道上轮流发送；
- **单工（simplex）**：只能单向，不常见。
<!-- Sources: w3phy p.27 -->

### 复用：多个用户共享一条介质

讲义列出四种 **复用（multiplexing）**：时分复用（TDM）、频分复用（FDM）、统计复用（statistical multiplexing）和码分多址（CDMA）。本讲只展开前两种：

![W3PHY slide 29 - Time division multiplexing](assets/02-physical-layer/slide-w3phy-29.png)

**TDM**：左边三个用户的数据被排进一条线路，右边的序列是 1、2、3、1、2、3……：用户按固定时间表轮流使用整个信道，每段之间留保护时间（guard time）。每个用户在自己的时隙内享有信道全速。

![W3PHY slide 30 - Frequency division multiplexing](assets/02-physical-layer/slide-w3phy-30.png)

**FDM**：横轴是频率，三个用户各占一个小"驼峰"，同时堆叠发送。每个用户固定占一段频率，持续发送，但每人只用信道的一部分带宽，速度较低。
<!-- Sources: w3phy p.28-30; Apple Notes WEEK 5 MAC2 -->

TDM 与 FDM 是"静态"分配，在用户数变化或流量突发时效率很低；[05 MAC 子层](05-mac-sublayer.md#topic-1) 会从这里出发，讲动态分配。

## 本讲自测

1. 一条 2000 km 的光纤链路（信号速度取 $C$ ），带宽 1 Gbps，发送 10 000 bit 的帧。哪种时延占主导？
2. 一条 4 kHz 信道使用 8 种电平，SNR 为 30 dB。最大数据速率是多少？
3. 同一条信道，如果把电平数从 8 增加到 1024，实际可达速率会变成多少？哪个定理在起限制作用？
4. 偏远农场要接入互联网，从卫星、光纤、无线、有线的优缺点出发，你会怎样选择？
