# COMP90007 Weeks 3–4 - Data Link Layer: Framing and Error Control

来源：`lecture/Week3-data-link-1.pdf`（Data Link Layer (1)）、`lecture/Week4-Lecture1.pdf`（Data Link Layer (2)）；`lecture/Week12-Review-handout.pdf` p.12–15。Apple Notes：CS/25S1/IT — "WEEK 3-4 Data Link Layer"、"WEEK 4 - Data Link2 - Error Control"；CS/25S1/IT/Review — "Data Link Layer"、"EXAM PREPARATION"。

这篇讲的是：**物理层只给一串可能出错的比特，相邻两台机器怎样把它切成有意义的帧，并发现甚至纠正其中的错误？**

学习路线：[职责与服务](#topic-1) → [成帧](#topic-2) → [Hamming 距离：检错与纠错的界限](#topic-3) → [检错码](#topic-4) → [纠错码与取舍](#topic-5)。

重点：三种成帧方法、Hamming 距离的两条界限、CRC 与 Hamming 码的手算。难点：CRC 的模 2 除法。易错：检错需要距离 $d+1$ ，纠错需要 $2d+1$ ；Internet 校验和要把溢出位加回低位，再取反。

<a id="topic-1"></a>
## 1. 数据链路层的职责与服务

### 在模型中的位置

![W3DL slide 02 - Overview of the data link layer](assets/03-data-link-framing-and-error-control/slide-w3dl-02.png)

右边混合模型里高亮的一层就是数据链路层，它对应 OSI 的第 2 层；TCP/IP 没有单独的这一层，而是把它和物理层合在 host-to-network 一层里。数据链路层负责 **相邻两台机器之间可靠、高效地传送"帧"（frame）**，处理传输差错和流量控制。它的三项功能（p.4）是：向网络层提供明确的服务接口、处理传输差错、调节数据流。
<!-- Sources: w3dl p.2, p.4; rev1 p.12 -->

![W3DL slide 03 - Typical implementation](assets/03-data-link-framing-and-error-control/slide-w3dl-03.png)

看圆圈圈住的两个 Link 方块：链路层一部分在操作系统的驱动程序（driver）里，一部分在网卡（Network Interface Card，NIC）硬件上；网卡下面才是 PHY 和线缆。

![W3DL slide 05 - Packets and frames](assets/03-data-link-framing-and-error-control/slide-w3dl-05.png)

看中间一行：网络层交下来的分组（packet）被放进帧的载荷（payload field），前面加帧头（header），后面加帧尾（trailer）。上方的虚线是两台机器链路层之间的"虚拟数据通路"（virtual data path），真正的数据沿下方经过物理层传送（actual data path）；接收方做相反的拆包过程。
<!-- Sources: w3dl p.3, p.5; Apple Notes WEEK 3-4 Data Link Layer -->

### 三种服务

服务按两个问题分类（p.6）：发送前是否先建立连接？接收方是否回送确认（acknowledgement）？p.7 由此列出三种服务，接下来三页各讲一种。

![W3DL slide 08 - Unacknowledged connectionless service](assets/03-data-link-framing-and-error-control/slide-w3dl-08.png)

**无确认无连接**：发送方直接发独立的帧，不建立连接，接收方也不回确认；丢帧不在本层恢复，交给上层。用于以太网局域网和实时音视频。

![W3DL slide 09 - Acknowledged connectionless service](assets/03-data-link-framing-and-error-control/slide-w3dl-09.png)

**有确认无连接**：仍然不建立连接，但每帧单独确认，丢失或出错就重传。用于无线 802.11 Wi-Fi。

![W3DL slide 10 - Acknowledged connection-oriented service](assets/03-data-link-framing-and-error-control/slide-w3dl-10.png)

**有确认面向连接**：先建立连接（协商速率等细节），帧要编号、计数、确认，并保证按序，最后释放连接。用于卫星信道这类不可靠链路。三者对照：

| 服务 | 连接 | 确认 | 典型应用 |
| --- | --- | --- | --- |
| 无确认无连接（unacknowledged connectionless） | 不建立、不释放 | 无；丢帧不恢复或交给上层 | 以太网局域网；实时音视频 |
| 有确认无连接（acknowledged connectionless） | 不建立、不释放 | 每帧单独确认，丢失或出错就重传 | 无线 802.11 Wi-Fi |
| 有确认面向连接（acknowledged connection-oriented） | 先建立再释放（协商速率等） | 帧编号、计数、确认，强制按序 | 不可靠链路，如卫星信道 |
<!-- Sources: w3dl p.6-10; Apple Notes WEEK 3-4 Data Link Layer -->

**理解用例（自拟）**：以太网线路很少出错，逐帧确认反而浪费，所以不确认、交给上层（如 TCP）处理；Wi-Fi 的无线环境错误多，在链路层就地重传更划算。

<a id="topic-2"></a>
## 2. 成帧

### 为什么要成帧

![W3DL slide 11 - Framing and checksums](assets/03-data-link-framing-and-error-control/slide-w3dl-11.png)

**成帧（framing）** 把原始比特流切成离散的单位，目的是在不可靠的物理层之上提供一定可靠性。看图：发送方对数据 $D$ 计算校验值 $T_S=f(D)$ ，接在 $D$ 后面一起发出；接收方对收到的 $D'$ 重新计算 $T_R=f(D')$ ，与收到的 $T_S'$ 比较，不相等就知道出错。要做到这一点，接收方必须先知道一帧从哪里开始、到哪里结束。
<!-- Sources: w3dl p.11 -->

讲义列出三种方法，大多数协议会把字符计数和另一种方法组合使用：

### 字符计数

![W3DL slide 13 - Character count](assets/03-data-link-framing-and-error-control/slide-w3dl-13.png)

帧头里有一个字段写明本帧有多少个字符（字节），红框标出的就是这些计数（计数本身也算在内）。上一行没出错：5、5、8、8 依次切出四帧。下一行第二帧的计数 5 被干扰成 7，接收方按 7 去切，于是把原本属于第三帧的 `1` 当成了下一个计数（Now a byte count），后面所有帧的边界都错位了，而且无法重新同步。这就是字符计数单独使用时的致命弱点。
<!-- Sources: w3dl p.13 -->

### 标志字节加字节填充

![W3DL slide 14 - Byte stuffing](assets/03-data-link-framing-and-error-control/slide-w3dl-14.png)

上半部分 (a) 是帧格式：每帧以特殊的 **标志字节（flag byte，FLAG）** 开始和结束。如果数据里恰好出现与 FLAG 相同的字节，就在它前面插入转义字节 ESC；数据里出现 ESC 本身，也在前面再插一个 ESC。看下半部分 (b) 的四个例子：左边是原始字符，右边是填充后，接收方遇到 ESC 就把紧跟的字节当作普通数据。这叫 **字节填充（byte stuffing）**。
<!-- Sources: w3dl p.14; Apple Notes WEEK 3-4 Data Link Layer -->

### 首尾标志加比特填充

![W3DL slide 15 - Bit stuffing](assets/03-data-link-framing-and-error-control/slide-w3dl-15.png)

帧可以含任意个比特，每帧以比特模式 `01111110` 开始和结束。为了不让数据中出现这个模式，发送方 **每遇到连续五个 1 就插入一个 0**；接收方看到五个 1 后跟一个 0，就删除这个 0。对照 (a) 原始数据、(b) 发送数据中箭头标出的三个填充位、(c) 接收方去填充后的结果，(a) 与 (c) 完全相同。
<!-- Sources: w3dl p.15 -->

**易错**：讲义 p.16 问 `0111110111` 是否需要插 0。需要。规则只看"是否已有连续五个 1"，不管第六位是什么；第 2–6 位已是五个 1，所以发送 `01111100111`。接收方的规则对称：五个 1 后面的 0 一律删掉，因此即使原本就是 0 也必须先补一个，否则接收方会误删数据中的 0。
<!-- Sources: w3dl p.16 -->

<a id="topic-3"></a>
## 3. Hamming 距离：检错与纠错的界限

### 差错的类型

**差错控制（error control）** 在消息中加入校验位，让接收方不会把被物理层损坏的消息误当作原消息。有两条路：检测出错后重传，或直接纠正。

![W3DL slide 18 - Burst error](assets/03-data-link-framing-and-error-control/slide-w3dl-18.png)

比较上下两行：上面是发送的（Sent），下面是收到的（Received），蓝色格子是被破坏的位。

- **单比特差错（single-bit error）**：只有一位翻转；
- **突发差错（burst error）**：两位或更多位改变。图中第一个和最后一个出错位之间的 8 位就是突发长度（length of burst error），中间也有没出错的位。突发差错更容易发现（变化大），但更难纠正。
<!-- Sources: w3dl p.17-18; Apple Notes WEEK 4 Data Link2 -->

![W3DL slide 19 - Encoder and decoder](assets/03-data-link-framing-and-error-control/slide-w3dl-19.png)

左边发送方的编码器（encoder）用生成器（generator）为消息算出冗余位，"消息加冗余"经不可靠传输到达右边；接收方的解码器（decoder）用检查器（checker）判断，决定纠正还是丢弃，再把消息交上去。好的机制应当：速度快、计算开销低；附加的比特尽量少；能检测多种差错。纠错必须在交给网络层之前完成。
<!-- Sources: w3dl p.19 -->

### 一个简单例子：重复三次

![W3DL slide 20 - Repetition code example](assets/03-data-link-framing-and-error-control/slide-w3dl-20.png)

幻灯片把 0 编成 `000`、1 编成 `111`，再问开销、能检测几位、能纠正几位、几位差错会让算法失败。逐个回答：每 1 位数据多发 2 位，开销是 200%。收到三位后：

- 只要三位不一致就知道出错，所以 1 位或 2 位错误都能 **检测**；
- 按"少数服从多数"可以 **纠正** 1 位错误；
- 2 位错误会被纠成错的值（例如 `000` 变 `110`，被纠成 1），3 位错误则变成另一个合法码字，完全检测不到。
<!-- Sources: w3dl p.20 -->

### Hamming 距离与两条界限

![W3DL slide 21 - Hamming distance](assets/03-data-link-framing-and-error-control/slide-w3dl-21.png)

一种编码把 $n$ 位数据变成 $n+k$ 位的 **码字（codeword）**。**Hamming 距离（Hamming distance）** 是把一个合法码字变成另一个合法码字所需的最少翻转位数。幻灯片底部给出两条界限：

$$
\text{检测 }d\text{ 位差错需要距离}\ \ge d+1,\qquad
\text{纠正 }d\text{ 位差错需要距离}\ \ge 2d+1.
$$
<!-- Sources: w3dl p.21; rev1 p.14 -->

![W3DL slide 22 - Detection bound](assets/03-data-link-framing-and-error-control/slide-w3dl-22.png)

![W3DL slide 23 - Correction bound](assets/03-data-link-framing-and-error-control/slide-w3dl-23.png)

两页分别解释两条界限：

- **为什么 $d+1$ 能检测 $d$ 位**（p.22）：检测靠"收到的不是合法码字"。只要翻转不超过 $d$ 位，就到不了另一个合法码字；超过 $d$ 位就可能恰好变成另一个合法码字。
- **为什么 $2d+1$ 能纠正 $d$ 位**（p.23）：纠正靠"映射到最近的合法码字"。翻转不超过 $d$ 位时，原码字仍然最近；超过 $d$ 位，接收到的词可能离另一个合法码字更近。
<!-- Sources: w3dl p.22-23 -->

**讲义例子**：p.21 的四个 10 位码字 `0000000000`、`0000011111`、`1111100000`、`1111111111`，两两之间最少差 5 位，距离为 5。因此能检测 4 位、纠正 2 位差错。p.23 底部：发送 `0000000000` 错 2 位成 `1100000000`，最近的仍是原码字，纠对；错 3 位成 `1110000000`，最近的是 `1111100000`，纠错。学生笔记同样记下了"距离 5：检测 4、纠正 2"。
<!-- Sources: w3dl p.21-23; Apple Notes WEEK 4 Data Link2 -->

**理解用例（自拟）**：收到 `1110000011`。它与四个码字的距离分别是 5、6、4、5，不是合法码字，所以接收方 **能检测** 到出错。但如果原来发的是 `0000011111`，这里有 6 位出错，超出了保证范围，检测成功只是碰巧；要纠错时它会被映射到最近的 `1111100000`，结果是错的。

<a id="topic-4"></a>
## 4. 检错码：奇偶校验、校验和与 CRC

### 奇偶校验位

![W4L1 slide 03 - Parity bit](assets/03-data-link-framing-and-error-control/slide-w4l1-03.png)

数一数数据中 1 的个数，在末尾加 1 位让总数为偶数（偶校验，even parity）或奇数（奇校验，odd parity）。幻灯片的数据 `10001110` 有四个 1：偶校验发 `100011100`，奇校验发 `100011101`。

奇偶校验的 Hamming 距离是 2，所以能检测 $2-1=1$ 位差错，能纠正 $(2-1)/2=\frac12$ 位，也就是一位都纠正不了。
<!-- Sources: w4l1 p.3; Apple Notes WEEK 4 Data Link2 -->

### Internet 校验和

![W4L1 slide 05 - Checksum example](assets/03-data-link-framing-and-error-control/slide-w4l1-05.png)

**校验和（checksum）** 是一组校验位。Internet 校验和（p.4）以 16 位字为单位：对所有字做模 $2^{16}$ 加法，**溢出的高位加回低位**（回卷，end-around carry），最后取反码（one's complement）作为校验和。接收方把所有字连同校验和一起相加，结果全 1 才说明没发现错误。

幻灯片用 5 位字演示，按圆圈里的编号 1→2→3→4 读：第 2 步 `10111 + 11001` 溢出成 6 位，把最高位的 1 加回最低位得到 `10001`；第 4 步对 `11100` 取反得到校验和 `00011`，接在数据后面发出：

```text
00110 + 10001          = 10111
10111 + 11001          = 1 10000  -> 回卷: 10000 + 1 = 10001
10001 + 01011          = 11100
校验和 = 11100 的反码  = 00011
发送: 00110 10001 11001 01011 00011
```
<!-- Sources: w4l1 p.4-5; Apple Notes WEEK 4 Data Link2 -->

**易错**：溢出位不能直接丢掉，要加回最低位；最后一步还要取反。学生笔记写的 `10111+11001=110000 -> 110001` 漏掉了"丢掉最高位"这一步，正确结果是 `10001`。

### 循环冗余校验 CRC

![W4L1 slide 06 - CRC steps](assets/03-data-link-framing-and-error-control/slide-w4l1-06.png)

**CRC（cyclic redundancy check）** 把比特串看成系数为 0/1 的多项式，用约定的 **生成多项式（generator polynomial）** $G(x)$ 做模 2 除法（加减都是异或 XOR）。幻灯片的步骤是，设 $G(x)$ 的次数为 $r$ ：

1. 在数据 $M(x)$ 后面补 $r$ 个 0，得到 $x^rM(x)$ ；
2. 用 $G(x)$ 对应的比特串去模 2 除 $x^rM(x)$ ；
3. 把余数（不超过 $r$ 位）从 $x^rM(x)$ 中模 2 减去，等价于把补的 0 换成余数；
4. 得到的 $T(x)$ 就是发送的帧。接收方用同一个 $G(x)$ 去除，余数为 0 才认为没出错。
<!-- Sources: w4l1 p.6; Apple Notes WEEK 4 Data Link2 -->

![W4L1 slide 07 - CRC example](assets/03-data-link-framing-and-error-control/slide-w4l1-07.png)

讲义例子：数据 `1101001`， $G(x)=x^4+x+1$ 即 `10011`，次数 4，所以补 4 个 0（蓝色的 `0000`）。看图中逐行的异或：每次只在当前最高位为 1 时减去 `10011`，红色竖线表示把下一位"拉下来"，最后框出的余数是 `0101`，发送 `11010010101`。
<!-- Sources: w4l1 p.7; rev1 p.15 -->

**理解用例（自拟）**：数据 `101101`， $G(x)=x^3+x+1$ 即 `1011`，补 3 个 0：

```text
101101000
1011            <- 第 0 位是 1，异或
000001000
     1011       <- 第 5 位是 1，异或
000000011       余数 = 011
发送: 101101011
```

接收方用 `1011` 去除 `101101011`，余数为 `000`，校验通过。

![W4L1 slide 08 - Error detection codes](assets/03-data-link-framing-and-error-control/slide-w4l1-08.png)

这一页比较三种检错码的 Hamming 距离：奇偶校验（1 位）为 2；Internet 校验和（16 位）为 2；标准 32 位 CRC 为 4。按上一节的界限，CRC 能保证检测 3 位差错，而前两者只保证 1 位；CRC 还尤其擅长发现突发差错。
<!-- Sources: w4l1 p.8 -->

<a id="topic-5"></a>
## 5. 纠错码与取舍

### 纠错：Hamming 码

![W4L1 slide 09 - Hamming code](assets/03-data-link-framing-and-error-control/slide-w4l1-09.png)

$n$ 位数据至少需要 $k$ 个校验位，满足

$$
2^k-k-1\ \ge\ n.
$$

幻灯片的例子是 4 位数据： $k=3$ 时 $2^3-3-1=4\ge4$ ，所以需要 3 个校验位，码字共 7 位。
<!-- Sources: w4l1 p.9 -->

**理解用例（自拟）**：8 位数据时， $k=3$ 只能保护 4 位，不够； $k=4$ 时 $2^4-4-1=11\ge8$ ，所以需要 4 个校验位，码字共 12 位。

放置规则：校验位放在 **2 的幂次位置**（1、2、4、……），其余位置放数据。位置 $p$ 的校验位负责所有"位置编号的二进制展开中含 $p$ "的位：

| 校验位 | 覆盖的位置 |
| --- | --- |
| P1 | 1, 3, 5, 7 |
| P2 | 2, 3, 6, 7 |
| P4 | 4, 5, 6, 7 |
<!-- Sources: w4l1 p.9-10 -->

![W4L1 slide 10 - Hamming code example](assets/03-data-link-framing-and-error-control/slide-w4l1-10.png)

讲义例子（偶校验）：顶部表格里圆圈、虚线框、黄框分别标出 P1、P2、P4 负责的位置。数据 `0101` 放进位置 3、5、6、7，算得 P1 = 0、P2 = 1、P4 = 0，发送 `0100101`。图下方两个接收例子：左边 Example 1 三组校验全部失败（每行末尾的 ×），出错位置是 $1+2+4=7$ ；右边 Example 2 只有 P2 那组失败，说明是校验位 P2 自己错了。**把失败组的校验位编号相加，就是出错位的位置。**
<!-- Sources: w4l1 p.10; Apple Notes WEEK 4 Data Link2 -->

**理解用例（自拟）**：数据 `1011` 放入 P3=1、P5=0、P6=1、P7=1。P1： $1+0+1$ 为偶，P1 = 0；P2： $1+1+1$ 为奇，P2 = 1；P4： $0+1+1$ 为偶，P4 = 0。发送 `0110011`。若第 5 位翻转，收到 `0110111`：P1 组 $0+1+1+1=3$ 失败，P2 组 $1+1+1+1=4$ 通过，P4 组 $0+1+1+1=3$ 失败，出错位置 $1+4=5$ ，把它翻回即可。

### 检错还是纠错

![W4L1 slide 11 - Error control discussion](assets/03-data-link-framing-and-error-control/slide-w4l1-11.png)

- **纠错** 在噪声大的介质（如无线）中更有效，因为重传本身也很可能再出错；
- **检错加重传** 在错误率低的介质（如优质铜线、光纤）中更有效，因为附加位少；
- 两者都基于"差错位数不超过某个值"的假设，而且校验位本身也可能出错。
<!-- Sources: w4l1 p.11 -->

## 本讲自测

1. 用比特填充发送 `0111111111110`，写出实际发送的比特串。
2. 一种编码的 Hamming 距离为 7。它最多能检测几位、纠正几位差错？
3. 用 $G(x)=x^3+1$ （`1001`）对数据 `110101` 计算 CRC，写出发送的帧；如果传输中最后一位翻转，接收方怎样发现？
4. 用偶校验 Hamming 码发送数据 `1100`，若第 6 位在传输中翻转，接收方会得到哪几组校验失败？
