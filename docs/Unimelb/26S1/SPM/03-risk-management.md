# 03 Risk Management 文档写作经验

## 核心判断

- `Risk Management Plan` 的重点不是单纯罗列风险，而是说明项目团队将如何在整个项目周期里识别、分析、响应、监控风险。
<!-- Sources: Week 3 Risk management.pdf p.13; PMP Formal Sample Template 1.pdf p.16 -->
- lecture 明确把风险管理过程拆成 `Plan -> Identify -> Analyse and Assess -> Respond -> Monitor and Control`，所以一份好文档也应该按这个流程组织，而不是只给一张表。
<!-- Sources: Week 3 Risk management.pdf p.11 -->
- 在课程模板里，`Risk Management Plan` 通常只用一到两段概述方法，而详细风险条目放进 `Risk Register` 或 `Risk Log` 作为附录或独立表格。
<!-- Sources: PMP Formal Sample Template 1.pdf p.16; PMP Formal Sample Template 2.pdf p.6 -->

## 经验 1: 先写“方法”，再写“风险列表”

- 原文指出，风险管理计划的输出是一个 `documents the procedures for managing risks throughout a project` 的 RMP，所以正文首先要回答的是“这个项目怎么管风险”。
<!-- Sources: Week 3 Risk management.pdf p.13 -->
- 比较稳妥的开头写法是先交代：
  - 风险管理目标
  - 适用范围
  - 识别和评估方法
  - 更新频率
  - 谁负责维护和审批
- 如果正文一上来就是 `Risk 1 / Risk 2 / Risk 3`，那其实更像 `risk register`，而不是 `risk management plan`。
<!-- Sources: PMP Formal Sample Template 1.pdf p.16 -->

## 经验 2: 只有“不确定且会影响目标”的事项才算风险

- lecture 对风险的定义是：`an uncertain event or condition`，一旦发生会对项目目标产生正面或负面影响。
<!-- Sources: Week 3 Risk management.pdf p.5 -->
- lecture 同时区分了 `risk` 和 `uncertainty`：不确定不等于风险，只有当它会带来项目影响时，才需要纳入风险管理。
<!-- Sources: Week 3 Risk management.pdf p.6 -->
- 写文档时可以先用三个问题过滤：
  - 它发生的概率是否大于 0？
  - 它会不会影响项目目标？
  - 团队是否对它或其结果有一定控制空间？
<!-- Sources: Week 3 Risk management.pdf p.15 -->
- 这样可以避免把“已发生的问题”“纯背景事实”或“模糊担忧”写进风险文档。

## 经验 3: 用固定分类写，避免漏项

- lecture 建议至少从三类去看风险：
  - `Project risks`: 影响计划本身，例如 budget、schedule、scope、personnel
  - `Product risks`: 影响交付物质量或性能，例如 design、implementation、verification、maintenance
  - `Business risks`: 影响项目经济或组织成功，例如 funding、management support、market demand
<!-- Sources: Week 3 Risk management.pdf pp.16-17 -->
- lecture 还区分了 `generic risks` 和 `product-specific risks`。前者几乎所有软件项目都会遇到，后者只有理解产品和技术的人才能识别。
<!-- Sources: Week 3 Risk management.pdf p.15 -->
- 文档写作上，最好把风险识别章节按分类展开，而不是把所有风险混成一个清单。这样读者能直接看出漏没漏业务面、产品面和执行面。

## 经验 4: 风险识别要交代“怎么找出来的”

- lecture 给出的识别方法包括：
  - `Pondering`
  - `Interviewing / questionnaires`
  - `Brainstorming`
  - `Checklists`
  - `Delphi Technique`
  - `SWOT Analysis`
<!-- Sources: Week 3 Risk management.pdf pp.20-24 -->
- 这意味着文档里最好写清楚风险来源，例如：
  - 来自 stakeholder interview
  - 来自团队 workshop / brainstorming
  - 来自历史项目 checklist
  - 来自架构或 vendor 评审
- 这样做的价值是两点：
  - 让风险条目更可追溯
  - 让读者相信这些风险不是拍脑袋写出来的
- 特别是 lecture 明确说，软件项目里的风险经理通常不可能独自掌握所有方法和工具，所以 stakeholder 和 domain experts 的输入是必要的。
<!-- Sources: Week 3 Risk management.pdf p.21 -->

## 经验 5: 评估部分至少要有 Probability、Impact、Exposure、Rank

- lecture 的定性分析流程很清楚：
  1. 估计风险发生概率 `P`
  2. 估计风险影响 `I`
  3. 计算 `Risk exposure = P * I`
  4. 识别 root cause
<!-- Sources: Week 3 Risk management.pdf pp.33-34 -->
- 这说明文档里至少要先定义评分标尺，再展示如何排序，否则“高风险/中风险/低风险”就没有依据。
- lecture 还给了 `risk matrix`，强调要同时看 `likelihood` 和 `impact` 来定义风险级别。
<!-- Sources: Week 3 Risk management.pdf pp.38-39 -->
- 实际写法上，建议正文先定义：
  - probability 的评分规则
  - impact 的评分规则
  - exposure 或 level 的换算规则
  - 什么阈值需要升级处理
- 然后把具体风险的评分结果放进附录表格。

## 经验 6: Response 不是一句空话，必须能执行

- lecture 强调，风险分析的目的不是给所有风险都设计动作，因为回应风险本身也要消耗资源，所以必须筛选重点风险。
<!-- Sources: Week 3 Risk management.pdf p.43 -->
- 对负面风险，课程给了四种常用策略：
  - `Accept / Ignore`
  - `Avoid`
  - `Mitigate`
  - `Transfer`
<!-- Sources: Week 3 Risk management.pdf pp.44-45 -->
- 对正面风险，课程给了：
  - `Exploit`
  - `Enhance`
  - `Share`
  - `Accept`
<!-- Sources: Week 3 Risk management.pdf p.48 -->
- 文档写作上，一个合格的 response 至少要回答：
  - 谁负责
  - 何时启动
  - 做什么动作
  - 需要什么资源
  - 做完后剩余风险是什么
- 如果 response 只写成“closely monitor”或“team will handle”，通常说明这个风险还没有真正被管理。

## 经验 7: Risk Register 是执行层核心，字段要足够完整

- lecture 直接把 `risk response plan` 也叫作 `Risk Register`，并给出建议字段：
  - `Risk ID`
  - `Trigger`
  - `Owner`
  - `Response`
  - `Resources Required`
<!-- Sources: Week 3 Risk management.pdf p.49 -->
- 另一份模板则要求 `Risk Log` 至少包含：
  - `ID`
  - `Risk`
  - `Impact`
  - `Response`
  - `Risk Level`
  - `Risk Owner`
<!-- Sources: PMP Formal Sample Template 2.pdf p.6 -->
- 所以比较实用的做法是把两边合并，形成一张更完整的表：

| ID | Category | Risk | Trigger | Probability | Impact | Exposure / Level | Response | Owner | Resources | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

- 这张表是落地执行的核心；正文解释规则，附录保存条目。

## 经验 8: 监控机制一定要写进项目节奏里

- lecture 说得很直接：风险 response plan 写完以后，还要持续监控 trigger，新风险也会不断出现，所以风险监控必须成为项目整体监控的一部分。
<!-- Sources: Week 3 Risk management.pdf p.50 -->
- lecture 推荐的监控手段包括：
  - `Risk Audits`
  - `Risk Reviews`
  - `Risk status meetings`
<!-- Sources: Week 3 Risk management.pdf p.51 -->
- 模板也给出一个很实用的写法：高概率、高影响风险应当被加入项目 schedule，并由对应 risk manager 在双周会议中报告状态。
<!-- Sources: PMP Formal Sample Template 1.pdf p.16 -->
- 因此，文档里最好明确：
  - 多久 review 一次风险
  - 谁更新 register
  - 什么情况下新增风险
  - 什么情况下关闭风险
  - 风险状态如何进入项目例会或 status report

## 经验 9: 风险文档要和项目生命周期连起来

- 项目管理课程一开始就把 `risk` 视为项目管理的核心约束之一，而业务案例中也会先出现 `major risks` 这样的高层风险信息。
<!-- Sources: Week 1 Introduction to Projects [Part_1]-1.pdf p.8; Week 1 Projects Continued [Part_2].pdf p.16 -->
- 这说明风险文档不是孤立文档，而是对早期 business case / charter 中重大风险的展开和细化。
- 写作上最自然的逻辑是：
  - business case / charter 先提出 major risks
  - risk management plan 说明治理方法
  - risk register 跟踪具体风险条目
  - lessons learned 在项目结束时回收改进建议
<!-- Sources: Week 3 Risk management.pdf p.13; PMP Formal Sample Template 1.pdf p.16 -->

## 一个实用的写作骨架

1. Purpose and Scope
2. Risk Management Methodology
3. Roles and Responsibilities
4. Risk Categories and Identification Methods
5. Probability / Impact / Exposure Scales
6. Risk Response Strategies
7. Monitoring and Reporting Cadence
8. Appendix: Risk Register

- 这个结构基本覆盖了 lecture 里的流程和模板里的落地形式。
<!-- Sources: Week 3 Risk management.pdf pp.11, 14, 49-51; PMP Formal Sample Template 1.pdf p.16 -->

## 容易踩的坑

- 只列风险，不写识别、评估、响应、监控方法。
- 只写负面威胁，不写正面机会。
<!-- Sources: Week 3 Risk management.pdf p.5; p.48 -->
- 没有 `owner`、`trigger`、`resource`，导致风险无法执行。
<!-- Sources: Week 3 Risk management.pdf p.49 -->
- 只有 `high / medium / low`，没有概率、影响和排序依据。
<!-- Sources: Week 3 Risk management.pdf pp.33-39 -->
- 所有风险都写成“mitigate”，没有说明为什么选这个策略。
<!-- Sources: Week 3 Risk management.pdf pp.43-45 -->
- 文档写完就不更新，没有把风险 review 放进例会和状态汇报。
<!-- Sources: Week 3 Risk management.pdf pp.50-51; PMP Formal Sample Template 1.pdf p.16 -->

## 参考 lecture / template

- [SWEN90016 - Week 3 - Risk management](<lecture/SWEN90016 - Week 3 - Risk management.pdf>)
- [SWEN90016 - Week 1 - Introduction to Projects Part 1](<lecture/SWEN90016 - Week 1 - Introduction to Projects [Part_1]-1.pdf>)
- [SWEN90016 - Week 1 - Projects Continued Part 2](<lecture/SWEN90016 - Week 1 - Projects Continued [Part_2].pdf>)
- [UNIMELB SWEN90016 PMP Formal Sample Template 1](<lecture/UNIMELB SWEN90016 PMP Formal Sample Template 1.pdf>)
- [UNIMELB SWEN90016 PMP Formal Sample Template 2](<lecture/UNIMELB SWEN90016 PMP Formal Sample Template 2.pdf>)
