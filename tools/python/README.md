# tools/python/ — Python 工具脚本

BioQuest 是纯前端项目（HTML/CSS/JS，Supabase 后端服务）。本目录集中存放仍可能使用的 Python 运维/数据工具，与前端运行无关。

| 脚本 | 用途 |
|---|---|
| `server.py` | 本地题目生成服务 v7.0（NVIDIA NIM / 智谱 AI），启动 HTTP 服务并自动补货 |
| `upload_to_supabase.py` | 上传本地 `pool.json` 到 Supabase |
| `sync_pool_to_quiz_json.py` | 将 `pool.json` 转为前端 `data/quiz_m*.json` 格式 |
| `sync_community_to_supabase.py` | 同步社区数据到 Supabase |
| `import-cards-to-supabase.py` | 导入知识卡片到 Supabase |
| `generate_questions_from_cards.py` | 从卡片自动生成题目 |
| `bio_crawler.py` | 生物知识爬虫（html/pdf） |
| `wiki_crawler.py` | 百科词条爬虫（生成 `data/wiki-seed.json`） |
| `review-questions.py` | 题库重审校验（复用 server.py 校验函数） |
| `verify_server.py` | 验证 server.py 语法与配置 |
| `check-rls-policies.py` | 查询 Supabase RLS 策略 |
| `playwright_regression.py` | Playwright 浏览器回归测试（本地运行） |

## 路径说明

所有脚本均基于 `__file__` 定位项目根（上溯两级），不依赖当前工作目录，可从任意位置运行：

```bash
python3 tools/python/server.py
python3 tools/python/verify_server.py
```

历史一次性生成脚本已归档至 [`archive/legacy-scripts/`](../../archive/README.md)。
