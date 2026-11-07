# 视觉实验室（Vision Lab）设计文档

给一台仓库机器人装上眼睛：从一格格的数开始，自己搭出去噪、找边、读单据的机器，再一路走到会学习、会测距、会画图的视觉系统。建在 `vision` 领域上（`games/kit/domains/vision/`）。

- 全课程的分章与关卡编排：[`chapter-map.md`](../../docs/Unimelb/26S2/CV/vision-game-specs/chapter-map.md)。
- 已落地章节的规格：[第 1 章](../../docs/Unimelb/26S2/CV/vision-game-specs/chapter-1-spec.md)。
- 领域能力和还缺的能力：`games/kit/domains/vision/DESIGN.md` 的「Capabilities for the redesigned course」。
- 所有类图灵完备游戏共同的规则：[`games/DESIGN.md`](../DESIGN.md)。

原型（`image` 领域上的 12 章、148 关）已整体换掉，留在 git 历史里；它的想法按章节地图每关的「来源」一栏借用。

## 内容

- `game.json`：一章一个 era，托盘 `main`；第 1–6 关只开放「图外：延续边缘」，第 7 关起开放全部四种。
- `parts.json`：原始元件（平移、四则运算、常数、拆成三个数、拆成三行、向量长度、方向、比较）。搭出的元件（三点平均 → 三点加权、滤波器）由关卡的 `builds` 给出。
- `levels/`：每关的测试期望由独立的实现算出，不由参考解生成；`npm run check` 查参考解通过、天真解失败、搭出的元件单独通过搭它的那一关。
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
