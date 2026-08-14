# Checkpoint Checklist

- [x] 本地积分引擎实现：`addPoints/deductPoints/penalizePoints/getPoints/getPointsDetail/getPointsLevel` 可用，数据存于 `bioquest_points_state`
- [x] 原 CR（信用点）体系已删除：`rewardCredit/penalizeCredit/getCredit/getCreditDetail/resetCredit/getUserCR/getCreditLevelInfo` 不再被调用
- [x] 等级与称号由总积分阈值推导，个人资料卡展示积分 + 等级称号 + 进度
- [x] 云端同步：登录拉取并合并 `profiles.points`，本地变更回写云端（`syncPointsToCloud`）
- [x] 行为门控改用积分阈值（发帖/评论/举报）
- [x] 悬赏改为消耗/发放积分（`points_reward`），采纳回答发放积分
- [x] 积分商城可兑换商品并扣除积分；积分排行榜按 `profiles.points` 降序且高亮当前用户
- [x] 数据库迁移脚本新增 `profiles.points`、`bounties.points_reward` 并更新等级触发器
- [x] 管理后台可查看/编辑/调整用户积分
- [x] 全代码库无原 `cr`/`credit` 残留引用（CR 文案改为「积分」；IUCN 濒危等级 `CR` 除外）
- [x] 浏览器冒烟通过：`/points-shop` 与 `/points-leaderboard` 渲染无 JS 错误，`getPoints/getPointsLevel` 正常（完整登录→答题→悬赏→商城→排行榜需连接真实 Supabase 后端）