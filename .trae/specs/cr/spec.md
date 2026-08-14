# 积分制度（Points）重做 Spec

## Why
现有「信用点 CR」体系是一个**随时间衰减**的信用分（基础 100 + 增量衰减回 0），语义模糊、难以累积获得感，且对外暴露为 `profiles.cr`、`bounty.cr_reward` 等多处散落字段。平台需要一套**清晰、可累积、可消耗、可排行**的「积分」体系，替代原 CR，作为学习活跃度与激励的统一货币。

## What Changes
- **删除原 CR（信用点）体系**，用全新的「积分（Points）」体系重做。
  - **BREAKING**：移除 `profiles.cr` → 迁移为 `profiles.points`；移除 `bounties.cr_reward / extra_reward` → 迁移为 `points_reward / extra_points`。
  - **BREAKING**：移除 `window.rewardCredit / penalizeCredit / getCredit / getCreditDetail / resetCredit` 等 API → 替换为 `addPoints / deductPoints / penalizePoints / getPoints / getPointsDetail / resetPoints`。
  - **BREAKING**：移除 `getUserCR / getUserCRAppeals / getCreditLevelInfo / adjustUserCR` → 替换为 `getUserPoints / getPointsLevel / adjustUserPoints`。
- 新积分语义：**不衰减、可累积、可扣除、可消耗（兑换）**。
- 新增**等级 / 称号**：由累计总积分阈值推导。
- 新增**积分排行榜**：按总积分的全站排行。
- 新增**兑换 / 消耗**场景：问答悬赏消耗积分、积分商城兑换（AI 额度、头像框、称号）。
- 存储：**本地 localStorage + 云端 Supabase 双向同步**。

## Impact
- Affected specs：用户体系（user）、社区（community）、问答悬赏（bounty）、排行榜（leaderboard/trends）、答题奖励（practice）、举报门控（question-utils）、管理后台（admin）。
- Affected code：
  - `js/user.js`（积分引擎 + 展示）
  - `js/supabase-client.js`（云端积分、门控、悬赏）
  - `js/bounty.js`（悬赏消耗积分）
  - `js/practice.js`（答题奖励）
  - `js/question-utils.js`（举报门控）
  - `js/admin.js`（后台调整积分）
  - `js/app.js`（积分商城路由/排行榜）
  - `sql/incremental_update.sql`（profiles.points、bounties.points_reward、触发器）

## ADDED Requirements

### Requirement: 积分引擎（本地）
系统 SHALL 在本地维护不衰减的累计积分，记录明细流水。

#### Scenario: 答题获积分
- **WHEN** 用户答对一题
- **THEN** 本地积分 `+5`（`ANSWER_CORRECT`），并写入流水历史

#### Scenario: 每日签到获积分
- **WHEN** 用户当日首次打开平台
- **THEN** 本地积分 `+2`（`DAILY_LOGIN`），同一天只奖励一次

#### Scenario: 积分明细
- **WHEN** 用户查看积分详情
- **THEN** 返回 `{ total, level, history:[{ts, amount, reason, note}] }`，历史按时间倒序、限量保留

#### Scenario: 扣除与消耗
- **WHEN** 用户兑换/发布悬赏消耗积分
- **THEN** 积分按原因扣减，结果不低于 0，并写入负向流水

### Requirement: 等级与称号
系统 SHALL 由累计总积分推导等级与称号。

#### Scenario: 等级推导
- **WHEN** 用户总积分达到某阈值
- **THEN** 系统返回对应等级 `{ label, title, color, icon, nextAt, progress }`

#### Scenario: 等级展示
- **WHEN** 用户查看个人资料/积分
- **THEN** 展示当前等级称号与到下一级的进度

### Requirement: 积分排行榜
系统 SHALL 提供按总积分排序的全站排行榜。

#### Scenario: 查看排行
- **WHEN** 用户打开积分排行榜
- **THEN** 按 `profiles.points` 降序展示用户、等级称号与积分，含当前用户高亮

### Requirement: 兑换 / 消耗
系统 SHALL 支持用积分兑换商品与发布悬赏。

#### Scenario: 发布悬赏
- **WHEN** 用户发布悬赏
- **THEN** 校验并扣除其积分 `points_reward`，成功后创建悬赏记录

#### Scenario: 采纳回答
- **WHEN** 提问者采纳某回答
- **THEN** 该回答作者获得 `points_reward` 积分（云端记账）

#### Scenario: 积分商城
- **WHEN** 用户在积分商城兑换某项（如 AI 额度、头像框、称号）
- **THEN** 扣除对应积分并发放权益，本地与云端同步

### Requirement: 云端同步
系统 SHALL 将本地积分与云端 `profiles.points` 双向同步。

#### Scenario: 登录拉取
- **WHEN** 用户登录后读取积分
- **THEN** 以云端 `profiles.points` 为准，若本地更高则合并回写

#### Scenario: 本地变更回写
- **WHEN** 本地积分发生变更且已登录
- **THEN** 将最新总值回写 `profiles.points`

### Requirement: 行为门控
系统 SHALL 用积分阈值控制高风险行为（发帖、评论、举报）。

#### Scenario: 举报门控
- **WHEN** 用户举报题目且积分不足
- **THEN** 提示积分不足，禁止举报

## MODIFIED Requirements

### Requirement: 答题奖励调用点
原 `rewardCredit('ANSWER_CORRECT'|'ANSWER_WRONG')` 改为 `addPoints(...)`，分值更新为 `5 / 1`。

### Requirement: 管理后台
原「调整用户 CR」改为「调整用户积分」，读写 `profiles.points`。

### Requirement: 数据库结构
`profiles` 表：`cr` → `points`；`bounties` 表：`cr_reward`/`extra_reward` → `points_reward`/`extra_points`；`profiles` 等级触发器改为基于 `points` 阈值。

## REMOVED Requirements

### Requirement: 原信用点 CR 体系
**Reason**：衰减语义混乱、无法累积与消耗，已被积分体系取代。
**Migration**：本地 `bioquest_credit_state` 迁移/忽略；云端 `profiles.cr` 迁移为 `profiles.points`；`bounty` 的 `cr_reward` 迁移为 `points_reward`；所有 `rewardCredit/penalizeCredit/getCredit/getCreditDetail/resetCredit/getUserCR/getCreditLevelInfo/adjustUserCR` 调用迁移到新 API。