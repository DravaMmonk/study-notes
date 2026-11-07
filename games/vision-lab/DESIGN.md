# 视觉实验室（Vision Lab）设计文档

从一格格的数开始，按课程的顺序把计算机视觉的概念一个个搭出来。主线讲概念，元件给到和概念同一层（讲滤波就给滤波器）；把预设拆回原语的原理系列、用到真实场景的应用关都是可选支线。建在 `vision` 领域上（`games/kit/domains/vision/`）。

- 全课程的分章与关卡编排：[`chapter-map.md`](../../docs/Unimelb/26S2/CV/vision-game-specs/chapter-map.md)。
- 已落地章节的规格：[第 1 章](../../docs/Unimelb/26S2/CV/vision-game-specs/chapter-1-spec.md)。
- 领域能力和还缺的能力：`games/kit/domains/vision/DESIGN.md` 的「Capabilities for the redesigned course」。
- 所有类图灵完备游戏共同的规则：[`games/DESIGN.md`](../DESIGN.md)。

## 内容

- `game.json`：一章一个 era；主线在 `foundation`，原理系列是 `topics`（id 的首字母就是系列字母，`kernel` → K），应用是 `challenges`。三个托盘：主线 `main`，K1–K4 `kernel`（没有滤波器，免得直接用预设绕过），K5 `flip`。
- `parts.json`：预设元件（四则运算、常数、滤波器、向量长度、方向、比较；K 用的平移、拆成三个数、拆成三行、转 180°）。搭出的元件（主线的求梯度、边缘检测器，K 的三点平均 → 三点加权）由关卡的 `builds` 给出。
- `levels/`：主线 `1-1`…`1-8`，K 系列 `k-*`，挑战 `c-*`；每关的测试期望由独立的实现算出，不由参考解生成；`npm run check` 查参考解通过、天真解失败、搭出的元件单独通过搭它的那一关。
- `glossary.json`：百科，分像素、滤波、边缘三组。

## 1. 研究：《图灵完备》的关卡设计在做什么

资料来源：官方战役关卡数据的镜像仓库（[michalusio/tc_campaign](https://github.com/michalusio/tc_campaign)，每关含 `meta.txt` 说明、`test.si` 测试脚本），社区 wiki，以及 Ohio Northern University 的 ASEE 2024 论文（McKanna & Hassan）。从关卡数据里能直接读出以下设计手法：

| 手法 | 在《图灵完备》里的样子 | 证据 |
| --- | --- | --- |
| 一个原件起步，其余全靠自己搭 | 第 2 关只给 NAND，之后 NOT、AND、XOR……全部由玩家用 NAND 搭出来 | `nand_gate` 解锁 `com_nand_bit`，过场语："With this component you can build everything else" |
| 先摸清原件，再用它 | NAND 关不让你搭电路，而是让你自己填出它的真值表 | `nand_gate` 的说明："figure out how the NAND component works" |
| 规格 + 自动测试 | 每关一个 `get_input` 生成测试、一个 `check_output` 判定；小问题穷举（真值表），大问题用伪随机（加法器跑 65536 组） | `xor_gate`、`byte_adder` 的 `test.si` |
| 失败就给出失败的那一组 | `tick_past_fail` 让模拟停在出错的那一拍，玩家看见具体哪组输入不对 | 几乎每关都有 |
| 过关即解锁元件（抽象阶梯） | 搭好 NOT 之后获得一个现成的 NOT 元件；后面的关卡只用它，不再关心内部 | `unlocks_components = [com_not_bit]` |
| 界面功能逐步解锁 | 关卡地图、个人页、线的颜色、注释等界面功能也是过关后才出现，开局界面极简 | `unlocks_special = ["level_map"]` 等 |
| 约束关逼出洞见 | “最多 3 个元件判断奇数个输入”逼你发现 XOR 可以串联；成就“只用 4 个 NAND 搭 XOR” | `odd_number_of_signals`：`get_component_count() > 5` 则失败 |
| 故意让你犯错 | “循环依赖”一关要求你造出非法电路，亲眼看它为什么不行，下一关再给出合法的例外（延迟线） | `dependency` 的台词：“先骗学生做错事，再取笑他们” |
| 评分但不强制 | 过关后才显示元件数、延迟，并给出分布；优化留给想挑战的人 | `score` 关、成就 |
| 应用关做回报 | 迷宫机器人、汉诺塔、排序、和 AI 打牌：用自己造的计算机解决一件真事 | `maze`、`tower`、`sort`、`ai_showdown`，`kind = architecture` |
| 熟练度小游戏 | 限时把十进制转二进制、十六进制 | `binary_racer`、`hex_racer` |
| 极少的文字 | 每关说明通常只有一两句目标，加一个可选“提示”链接 | 各关 `dialogue` |
| 技能树而非直线 | 关卡按逻辑门、算术、存储、架构分区，靠前置关系连成树 | ASEE 论文图 1 “Main Skill Tree” |

论文还指出它的价值在于“边实验边形成直觉，然后课堂再给出方法论解释”，以及用规模化问题（从 4 位推广到 32 位）逼出更好的抽象。
