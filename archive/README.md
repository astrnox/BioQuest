# archive/ — 历史遗留归档

本目录存放已不再被主项目引用的历史脚本与数据，仅供备份与追溯，**不参与前端运行、不参与 CI**。

| 子目录 | 内容 | 来源 |
|---|---|---|
| `legacy-scripts/` | 215 个一次性 Python 题库生成/上传脚本（约 4.3 万行） | 原 `scripts/legacy/` |
| `data-legacy/` | 7 个历史测试题库 JSON（非生产数据源） | 原 `data/legacy/` 中未被生成器引用的部分 |

## 说明

- 主项目生产题库数据源仅剩 `data/legacy/crawled_competition.json` 与 `data/legacy/questions.json`（由 `scripts/generate-bio-shards.js` 引用）。
- 归档内容均未被 `git ls-files` 之外的任何代码引用，移动不改变运行行为。
