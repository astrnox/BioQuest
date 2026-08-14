# Tasks

- [x] Task 1: 本地积分引擎（js/user.js）：删除原 CR 衰减体系，新增不衰减的积分引擎
  - [x] SubTask 1.1: 删除 `_CREDIT_*`、`getCredit*`、`rewardCredit`、`penalizeCredit`、`resetCredit`、`refreshCreditBadge` 及每日 CR 签到逻辑
  - [x] SubTask 1.2: 新增 `_points_state`（localStorage `bioquest_points_state` = `{ total, history[] }`）读写
  - [x] SubTask 1.3: 新增 `addPoints / deductPoints / penalizePoints / getPoints / getPointsDetail / resetPoints` 并挂到 window
  - [x] SubTask 1.4: 定义 `POINTS_DEFAULTS`（REWARD/PENALTY/SPEND 常量）与等级阈值 `POINTS_LEVELS`
  - [x] SubTask 1.5: 每日签到积分（`DAILY_LOGIN` +2）与 `refreshPointsBadge`
  - [x] SubTask 1.6: 更新 `renderProfilePanel` 与资料卡徽标为「积分 + 等级称号」

- [x] Task 2: 云端积分层（js/supabase-client.js）：`profiles.points`、`getUserPoints`、`getPointsLevel`、同步与门控
  - [x] SubTask 2.1: 将 `CR_DEFAULT` 改为 `POINTS_DEFAULT`，注册/登录初始化 `points`
  - [x] SubTask 2.2: 新增 `getUserPoints`、`getPointsLevel`（替代 `getUserCR/getCreditLevelInfo`），申诉函数一致更名为 `getUserPointsAppeals`
  - [x] SubTask 2.3: 新增 `syncPointsToCloud`（本地回写）/ 登录拉取合并
  - [x] SubTask 2.4: `canPerformAction` / `canAct` 门控改用积分阈值（post/comment/report_question）
  - [x] SubTask 2.5: 悬赏相关函数改用 `points_reward`：`createBounty` 校验并扣除、`acceptBountyAnswer` 记账发放

- [x] Task 3: 数据库迁移（sql）：`profiles.points`、`bounties.points_reward`、等级触发器
  - [x] SubTask 3.1: 新增 `sql/migration_v7_points.sql`：`profiles.cr`→`points`、`bounties.cr_reward/extra_reward`→`points_reward/extra_points`
  - [x] SubTask 3.2: 更新基于 `points` 的等级触发器（替代原 `cr>=100/50` 的 user_group 自动升降级规则）

- [x] Task 4: 调用点更新
  - [x] SubTask 4.1: `js/practice.js`：`rewardCredit` → `addPoints('ANSWER_CORRECT'|'ANSWER_WRONG')`
  - [x] SubTask 4.2: `js/question-utils.js`：`getUserCR().cr` → `getUserPoints()` 门控
  - [x] SubTask 4.3: `js/admin.js`：查看/编辑/调整字段 `cr` → `points`，`handleAdjustUserCR` → `handleAdjustUserPoints`
  - [x] SubTask 4.4: `js/bounty.js`：展示与标签 `CR` → `积分`，字段 `cr_reward/extra_reward` → `points_reward/extra_points`

- [x] Task 5: 积分商城与排行榜（兑换/消耗）
  - [x] SubTask 5.1: 新增积分商城页（`/points-shop`）：积分余额、等级、兑换商品（AI 额度/头像框/称号），兑换扣积分并同步
  - [x] SubTask 5.2: 新增积分排行榜（`/points-leaderboard`）：按 `profiles.points` 降序，含当前用户高亮；在 `app.js` Routes 注册
  - [x] SubTask 5.3: 用户页「我的」新增「积分中心」入口；AI 兑换额度叠加到 `_canUseAi/_incrementAiUsage`

- [x] Task 6: 验证
  - [x] SubTask 6.1: 静态检查所有 `cr`/`credit` 残留引用并清理（全部通过 `node --check`）
  - [x] SubTask 6.2: 浏览器冒烟：`/points-shop` 与 `/points-leaderboard` 渲染无 JS 错误，`getPoints/getPointsLevel` 正常（完整登录→答题→悬赏流程需接真实 Supabase 后端）

# Task Dependencies
- [Task 2] 依赖 [Task 1]（云端复用本地等级/常量的取值约定）
- [Task 3] 依赖 [Task 2]（字段名以云端 API 为准）
- [Task 4] 依赖 [Task 1] 与 [Task 2]（新 API 已就绪）
- [Task 5] 依赖 [Task 1]、[Task 2]、[Task 3]
- [Task 6] 依赖前序全部任务