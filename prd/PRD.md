# BioQuest 产品需求文档（PRD v2.0）

> 版本 2.0 | 2026-06-28 | 替代 v1.0
> 产品定位：**纯前端 SPA + Supabase**，无后端运行时。AI 由前端直连用户自配 LLM。

---

## 0. 文档背景与变更说明

v1.0 PRD 描述了 4 大新模块（错题/动画/实验室/学习管理），项目已实现 demo 但存在**严重宣传与现实断裂**（见《现状审计》章节）。本 v2.0 的目标：

1. **兑现承诺**：修复 FSRS 未加载、API Key 硬编码、数据层三套标准等 P0 问题
2. **补全缩水**：实验室 4→6、考试 1→多套、AI 对话持久化、卡片联动
3. **诚实化命名**：去除"AI 诊断"等误导性表述
4. **清理架构债**：拆分超大文件、删除死代码、CSS 外移
5. **坚守定位**：纯前端 + Supabase 唯一后端，AI Key 用户自配

---

## 1. 产品定位

### 1.1 一句话定位
面向**中学生物竞赛（联赛）+ 高中生物（必修+选择性必修）**备考的纯前端智能学习平台。

### 1.2 核心约束（不可妥协）
| 约束 | 说明 |
|------|------|
| 纯前端 | 仅 HTML/CSS/JS，无 Node/Python 运行时；`server.py` 仅开发期可选代理 |
| 唯一后端 | Supabase（PostgreSQL + Auth + Storage + RLS） |
| AI 直连 | 前端 fetch 6 家 LLM（DeepSeek/智谱/通义/Kimi/NVIDIA/硅基流动），SSE 流式 |
| Key 自配 | 用户在「我的→设置」填个人 API Key，存 localStorage，每日 100 次限额 |
| 静态部署 | GitHub Pages / Vercel / Netlify / Cloudflare Pages，零环境变量 |

### 1.3 与 v1.0 的定位差异
无差异。定位不变，本版只修正实现与承诺的偏差。

---

## 2. 现状审计（v1.0 demo 的核心问题）

### 2.1 P0 致命问题（阻断上线）

| # | 问题 | 证据 | 影响 |
|---|------|------|------|
| P0-1 | FSRS 算法未加载 | `index.html` 未引入 `fsrs-algorithm.js`，`window.FSRS` 永远 undefined，cards.js/wrongbook.js 回退 SM-2 | README 宣传 FSRS-4.5 是虚假宣传 |
| P0-2 | API Key 硬编码 | `ai-client.js:33` `DEFAULT_ZHIPU_KEY = 'f514e5711...'` 明文提交仓库 | Key 被盗刷、违反安全承诺 |
| P0-3 | 数据层三套标准 | dashboard.js/teacher.js 用 localStorage；community.js 用 Supabase；app.js 有 `_generateLocalLeaderboard` 死代码 | 多设备不同步、教师看不到真实数据、违反"排行榜 Supabase only"硬约束 |
| P0-4 | 题库数据污染 | `quiz_auto_generated.json` 846 题选项跨题污染；`crawled_competition.json` 750 题含 `【解析待补充】` | 学生被错误选项误导 |

### 2.2 P1 严重缩水（PRD 承诺未达成）

| # | PRD 承诺 | 实际 | 差距 |
|---|----------|------|------|
| P1-1 | 虚拟实验室 6 个 | 4 个 | 缺酶活性探究、质壁分离与复原 |
| P1-2 | 全真模拟考试 | 1 套固定 72 题 | 无多套卷、无随机组卷 |
| P1-3 | AI 智能诊断 | 规则引擎 + BKT，文件顶部自白"无需任何 API 调用" | 命名误导 |
| P1-4 | AI 导师上下文记忆 | `_tutorState.messages` 内存数组，刷新即丢 | 宣传的"记忆"仅会话内有效 |
| P1-5 | 社区活跃 | `community.json` 仅 1 帖 0 评论 1 点赞 | 冷启动死寂 |
| P1-6 | 题图卡四维联动 | 卡片是孤立 Q&A，与题库/图谱/错题零联动 | 联动是文案不是实现 |

### 2.3 P2 工程债

| # | 问题 |
|---|------|
| P2-1 | app.js 108K、admin.js 182K、supabase-client.js 105K，单文件超大 |
| P2-2 | 几乎所有模块前 30-50% 行数是内联 CSS 注入，与 css/ 目录重复 |
| P2-3 | supabase.js 与 supabase-client.js 职责重叠，supabase.js 的 `apiCall` 后端代理路径是死代码 |
| P2-4 | 测试文件手抄源码副本（quiz-scoring.test.js 注释"从 quiz.js 提取"），源码改测试不会失败 |
| P2-5 | 知识图谱 40 节点 48 边硬编码在 JS 数组，无数据文件支撑 |
| P2-6 | 模态弹窗无焦点陷阱、AI 流式输出无 aria-live、无 role="main"/tabindex 管理 |
| P2-7 | sw.js 缓存了运行时从不加载的 fsrs-algorithm.js |
| P2-8 | 无 bundle splitting、无压缩、无 tree-shake；KaTeX CSS 首屏 preload 但首屏不需要 |

---

## 3. 目标用户与场景

### 3.1 用户画像

| 画像 | 特征 | 核心需求 |
|------|------|----------|
| **竞赛冲刺者** | 高二/高三，备考全国生物学联赛，日学 3-5h | 高频刷真题、错题复盘、模考模拟、薄弱点定位 |
| **日常学习者** | 高一/高二，按课标进度学必修+选择性必修 | 知识卡片巩固、生物动画理解过程、章节练习 |
| **好奇探索者** | 对生物感兴趣的初学者或跨学科学生 | 知识图谱浏览、虚拟实验室体验、趣味内容 |
| **教师用户** | 中学生物教师，管理班级 | 学情监控、布置任务、资源推荐、答疑 |

### 3.2 核心场景

1. **竞赛备考流**：首页 → 模考 → 查看解析 → 错题收录 → FSRS 复习 → 针对性练习
2. **日常学习流**：首页 → 知识卡片 → 生物动画理解概念 → 专项练习 → 学习分析
3. **错题修复流**：练习/模考答错 → 错题本 → OCR/AI 分析 → 知识图谱关联 → 推送练习
4. **实验理解流**：学习章节 → 虚拟实验室 → 选择实验 → 步骤操作 → 生成报告
5. **学习管理流**：仪表盘 → 今日推荐 → 番茄钟专注 → 完成待办 → 学习统计

---

## 4. 信息架构

### 4.1 导航结构（一级 ≤ 7 项）

| 一级 | 类型 | 子菜单/路由 |
|------|------|-------------|
| 首页 | 直达 | `/` |
| 练习 | 直达 | `/practice` |
| 模考 | 直达 | `/exam` |
| 复习 | 下拉 | 错题本 `/wrongbook`、学情诊断 `/diagnosis`、知识图谱 `/knowledge-graph`、知识卡片 `/cards` |
| 实验室 | 下拉 | 虚拟实验室 `/bio-lab`、生物动画 `/bio-animation`、拍照录题 `/photo-quiz` |
| 社区 | 直达 | `/community`（整合讨论、悬赏） |
| 我的 | 图标+下拉 | 仪表盘 `/dashboard`、学习管理 `/study`、排行榜 `/leaderboard`、教师 `/teacher`、设置 |

### 4.2 路由表

| 路由 | 模块 JS | 类型 |
|------|---------|------|
| `/` | 内联 | 核心 |
| `/practice` | `practice.js` | 核心 |
| `/exam` | `exam.js` | 核心 |
| `/photo-quiz` | `photo-quiz.js` | 核心 |
| `/knowledge-graph` | `knowledge-graph.js` | 核心 |
| `/bio-animation` | `bio-animation.js` | 核心 |
| `/wrongbook` | `wrongbook.js` | 核心 |
| `/diagnosis` | `smart-diagnosis.js` | 核心 |
| `/dashboard` | `dashboard.js` | 核心 |
| `/bio-lab` | `bio-lab.js` | 核心 |
| `/study` | `study.js` | 核心 |
| `/cards` | `cards.js` | 辅助 |
| `/tutor` | `tutor.js` | AI |
| `/discussion` | `discussion.js` | AI |
| `/community` | `community.js` | 社区 |
| `/trends` | `trends.js` | 分析 |
| `/teacher` | `teacher.js` | 教师 |
| `/user` | `user.js` | 个人 |
| `/admin` | `admin.js` | 管理 |
| `/leaderboard` | `leaderboard.js` | 社区 |

**重定向**：`/review→/wrongbook`、`/review-deep→/wrongbook`、`/pomodoro→/study`、`/habits→/study`。

---

## 5. 功能模块需求

### 5.1 知识卡片模块（修正 P0-1、P1-6）

**目标**：兑现 FSRS-4.5 承诺，打通题-图-卡联动。

**P0 修复**：
- 在 `index.html` 同步加载 `js/fsrs-algorithm.js`（首屏关键资源）
- 删除 `cards.js:136` 与 `wrongbook.js`、`supabase-client.js` 中所有 `if (typeof window.FSRS === 'undefined')` 的 SM-2 回退分支
- FSRS 参数（difficulty/stability/retrievability/last_review）持久化到 Supabase `cards_progress` 表

**功能需求**：
| ID | 需求 | 优先级 |
|----|------|--------|
| C-1 | 卡片正面/翻转/自评（1-4 分）→ FSRS 调度下次复习 | P0 |
| C-2 | 每日新卡上限可配（默认 20），复习卡上限可配（默认 100） | P0 |
| C-3 | 卡片绑定 `knowledge_node_id`，与知识图谱节点双向链接 | P1 |
| C-4 | 卡片关联 3-5 道题库题，卡片掌握后推送关联题巩固 | P1 |
| C-5 | 错题自动生成卡片（题干正面/答案+解析背面） | P1 |
| C-6 | 卡片分类按人教版章节（必修1/2/选择性必修1/2/3） | P1 |
| C-7 | 键盘快捷键 1/2/3/4 自评，Space 翻转 | P2 |
| C-8 | 卡片导出 Anki apkg 格式 | P2 |

### 5.2 错题本与拍照录题（修正 P0-1）

**P0 修复**：FSRS 复习调度走真实 FSRS-4.5，状态持久化到 Supabase `wrong_questions.fsrs_state`。

**功能需求**：
| ID | 需求 | 优先级 |
|----|------|--------|
| W-1 | 拍照/上传图片 → OCR 双引擎（视觉模型优先 + Tesseract 兜底） | P0 |
| W-2 | 手动录入支持 LaTeX（KaTeX）/图片附件 | P0 |
| W-3 | 练习/模考错题一键收录 | P0 |
| W-4 | AI 分析：知识点识别、章节定位、错因分类、关联知识图谱子图 | P0 |
| W-5 | FSRS 复习队列（今日到期/超期/已掌握） | P0 |
| W-6 | 推送 3-5 道相似题/变式题（基于知识点匹配） | P1 |
| W-7 | 错题统计：按知识点、错因、时间维度 | P1 |
| W-8 | 错题报告导出 Markdown | P2 |

**OCR 管线**：保留双引擎架构（视觉模型优先 + Tesseract 兜底），但视觉模型调用必须先 `hasVisionSupport()` 校验 provider 在 VISION_MODELS 白名单内，避免无效请求延迟。

### 5.3 虚拟实验室（补全 P1-1）

**目标**：从 4 个实验补全到 PRD 承诺的 6 个。

| ID | 实验 | 状态 | 优先级 |
|----|------|------|--------|
| L-1 | 显微镜观察（植物/动物/有丝分裂装片） | 已实现 | — |
| L-2 | 叶绿体色素提取与分离（纸层析） | 已实现 | — |
| L-3 | DNA 粗提取与鉴定 | 已实现 | — |
| L-4 | 微生物培养与计数 | 已实现 | — |
| L-5 | **酶活性影响因素探究**（温度/pH/底物浓度） | 新增 | P1 |
| L-6 | **质壁分离与复原** | 新增 | P1 |

**功能需求**：
| ID | 需求 | 优先级 |
|----|------|--------|
| L-10 | 实验选择卡片网格（图标+名称+时长预估） | P0 |
| L-11 | 左右分栏：左 30% 步骤引导 + 右 70% 实验台 Canvas | P0 |
| L-12 | 拖拽器材、参数验证（okMin/okMax）、操作反馈 | P0 |
| L-13 | 连续错 2 次 AI 给出具体引导（调用 AiClient） | P1 |
| L-14 | 实验报告自动生成（步骤记录+现象+结论） | P1 |
| L-15 | 实验结束推送 2-3 道相关高考/联赛题 | P1 |
| L-16 | 移动端上下堆叠布局 | P1 |

### 5.4 Canvas 生物过程可视化（已达标，仅维护）

7 个真实动画：mitosis / meiosis / dna / transcription / photosynthesis / respiration / membrane。

| ID | 需求 | 优先级 |
|----|------|--------|
| A-1 | 步进播放/暂停/重置/速度 0.25-2x | P0 |
| A-2 | 拖拽/缩放/触屏手势 | P0 |
| A-3 | 热点标注点击弹出知识点卡片 | P0 |
| A-4 | 对比模式（如 mitosis vs meiosis 并排） | P2 |
| A-5 | 60fps 性能约束、DPR 1-3x、不可见时暂停 rAF | P1 |

### 5.5 模考模块（修正 P1-2）

**目标**：从 1 套卷扩展为多套卷 + 随机组卷。

| ID | 需求 | 优先级 |
|----|------|--------|
| E-1 | 题源切换为 `data/exam_sample.json`（72 题 MTF 真题）+ Supabase `exam_papers` 表 | P0 |
| E-2 | 至少 3 套完整试卷（2023/2024/2025 联赛真题 + 模拟卷） | P1 |
| E-3 | 随机组卷：按模块配比（细胞/遗传/生态/分子各 18 题）从题池抽样 | P1 |
| E-4 | 限时 150 分钟、WARNING_TIME 600 秒变红、断点续考 | P0 |
| E-5 | 评分：单选/多选/判断/MTF/逻辑推理真实计分（复用 `question-utils.js`） | P0 |
| E-6 | 考后报告：总分/模块得分/知识点掌握/错题收录 | P1 |
| E-7 | 排行榜（同试卷用户排名，仅 Supabase 数据） | P2 |

### 5.6 学情诊断（修正 P1-3 命名误导）

**目标**：诚实命名，明确区分规则引擎与 AI 增强。

**重命名**：路由 `/diagnosis` 标题改为「学情诊断」（原"AI 智能诊断"），UI 显著标注"基于 BKT 贝叶斯知识追踪 + 规则引擎"。

| ID | 需求 | 优先级 |
|----|------|--------|
| D-1 | BKT 知识追踪：pL0=0.3, pT=0.15, pG=0.25, pS=0.10，每题更新 | P0 |
| D-2 | 模块排名、题型分析、薄弱点识别、提分路径、学习路径 | P0 |
| D-3 | 知识点依赖图谱（从 `data/knowledge-graph.json` 读取，不再硬编码） | P1 |
| D-4 | 可选 AI 增强模式（用户配置 Key 后可启用）：AI 解读诊断结果 + 个性化建议 | P2 |
| D-5 | 诊断报告导出 Markdown | P2 |

### 5.7 AI 导师与多智能体讨论（修正 P1-4）

**目标**：对话持久化、流式可访问性。

| ID | 需求 | 优先级 |
|----|------|--------|
| T-1 | SSE 流式渲染：增量 textContent + 完成后 Markdown 重渲染 | P0 |
| T-2 | 4 模式：通用/孟德尔/达尔文/沃森（不同 system prompt） | P0 |
| T-3 | 图片上传 + 视觉模型识别（拍错题/拍课本） | P0 |
| T-4 | **对话持久化**：Supabase `ai_conversations` + `ai_messages` 表，按 user_id + session_id | P1 |
| T-5 | 多会话管理：左侧会话列表，可重命名/删除/导出 | P1 |
| T-6 | 流式输出 `aria-live="polite"` 供屏幕阅读器 | P1 |
| T-7 | 过滤 `[[ANIM:xxx]]` 标签 + 禁止 SVG 代码块（system prompt 约束） | P0 |
| T-8 | 导出当前会话为 Markdown | P2 |

**多智能体讨论**（`/discussion`）：
| ID | 需求 | 优先级 |
|----|------|--------|
| D-1 | 群聊模式：3-6 智能体并发回答 | P0 |
| D-2 | 流水线模式：采集→撰写→校对→整合 4 阶段 | P0 |
| D-3 | 6 预设智能体（遗传/生态/进化/生理/生化/细胞） | P0 |
| D-4 | 自定义智能体（localStorage `bioquest_custom_agents`） | P1 |
| D-5 | FinalResult 整合面板 | P1 |

### 5.8 学习管理中心

6 Tab：课程表 / 待办 / 番茄钟 / 笔记 / 倒计时 / 工具。

| ID | 需求 | 优先级 |
|----|------|--------|
| S-1 | 待办优先级（高/中/低）、截止日期、子任务 | P0 |
| S-2 | 番茄钟 25/5、45/10、自定义，SVG 进度环 | P0 |
| S-3 | 番茄完成自动标记关联待办进度 | P0 |
| S-4 | 课程表周视图，课前提醒（Notification API） | P1 |
| S-5 | 笔记富文本（轻量，不引入 Tiptap，用 contenteditable） | P1 |
| S-6 | 倒计时（联赛/自定义事件） | P0 |
| S-7 | 工具：科学计算器（含种群密度/基因频率预设） | P1 |
| S-8 | 底部"今日学习节奏"常驻卡片：待办数/番茄数/复习题数/倒计时 | P0 |
| S-9 | 数据持久化到 Supabase `study_tasks`/`focus_sessions`/`notes` | P1 |

### 5.9 仪表盘与学习分析

| ID | 需求 | 优先级 |
|----|------|--------|
| G-1 | 统计卡片：连续打卡/今日答题/专注时长/正确率 | P0 |
| G-2 | 今日推荐：复习到期错题、薄弱点练习、番茄钟（最多 3 张） | P0 |
| G-3 | 本周趋势折线图（答题量 + 正确率双轴） | P0 |
| G-4 | 知识掌握雷达图（8 模块） | P0 |
| G-5 | **数据源统一为 Supabase**（修复 dashboard.js 读 localStorage 的问题） | P0 |
| G-6 | 雷达图顶点点击跳转对应模块练习 | P1 |
| G-7 | 学习热力图（GitHub 风格 365 天） | P2 |

### 5.10 社区模块（修正 P1-5 冷启动）

| ID | 需求 | 优先级 |
|----|------|--------|
| CO-1 | 发帖/评论/点赞/Markdown 渲染 | P0 |
| CO-2 | 图片懒加载（点击加载） | P0 |
| CO-3 | XSS 防护：过滤 javascript:/vbscript:/data: 协议、`<script>` 转义 | P0 |
| CO-4 | 标签筛选、按最新/最热排序 | P0 |
| CO-5 | **冷启动种子**：内置 20+ 精选帖（学习经验/真题讨论/科普）写入 `data/community.json` + Supabase 迁移脚本 | P1 |
| CO-6 | 关注用户/通知（Supabase Realtime） | P2 |
| CO-7 | 申诉入口改为模态对话框（修复 community.js:75 原生 prompt 违规） | P0 |

### 5.11 教师模式（修正 P0-3）

| ID | 需求 | 优先级 |
|----|------|--------|
| T-1 | **班级数据全部走 Supabase**（删除 teacher.js localStorage 模拟） | P0 |
| T-2 | 增删学生需 8 位 user_key 验证（模态对话框，非原生 prompt） | P0 |
| T-3 | 学生卡片网格 + 详情抽屉 | P0 |
| T-4 | 学情监控：班级平均分/薄弱点/作业完成率 | P1 |
| T-5 | 布置任务（关联练习/模考/卡片），推送到学生待办 | P1 |
| T-6 | 资源推荐与答疑入口 | P2 |

### 5.12 排行榜（修复 P0-3 死代码）

| ID | 需求 | 优先级 |
|----|------|--------|
| LB-1 | **删除 app.js `_generateLocalLeaderboard` 死代码** | P0 |
| LB-2 | 数据源硬性 Supabase only，无 localStorage 回退 | P0 |
| LB-3 | 周榜/月榜/总榜，按 CR 信用或答题量排序 | P1 |
| LB-4 | 同试卷考试排名（关联 E-7） | P2 |

### 5.13 知识图谱（修正 P2-5）

| ID | 需求 | 优先级 |
|----|------|--------|
| K-1 | 节点/边数据外移到 `data/knowledge-graph.json` | P0 |
| K-2 | 力导向布局（自研，REPULSION=8000, SPRING_LENGTH=120） | P0 |
| K-3 | 拖拽/悬停/点击，掌握度按 0.8/0.5/0.5 阈值填色 | P0 |
| K-4 | 点击节点跳转 `/practice?concept=X` | P0 |
| K-5 | 与卡片、错题、练习四向联动（题-图-卡-错） | P1 |
| K-6 | 子图导出 PNG/SVG | P2 |

---

## 6. 数据模型与 Supabase Schema

### 6.1 表结构（增量更新，遵循 `sql/schema_safe.sql` + `sql/incremental_update.sql`）

```sql
-- 用户扩展（已有，补充）
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists user_key char(8);  -- 教师验证用

-- 错题（已有，补充 FSRS 状态）
create table if not exists wrong_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  question_text text not null,
  user_answer text,
  correct_answer text,
  subject text,
  concept text,
  textbook_chapter text,
  error_reason text,
  knowledge_graph_nodes text[],
  review_due timestamptz,
  fsrs_state jsonb,  -- {difficulty, stability, retrievability, last_review, reps, lapses}
  image_url text,
  created_at timestamptz default now()
);

-- 卡片进度（新增，修复 P0-1）
create table if not exists cards_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  card_id text not null,  -- 对应 data/cards.json 的 id
  knowledge_node_id text,  -- 关联知识图谱节点
  fsrs_state jsonb not null,
  due timestamptz not null,
  reps int default 0,
  lapses int default 0,
  last_review timestamptz,
  unique(user_id, card_id)
);

-- AI 对话（新增，修复 P1-4）
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null default '新对话',
  mode text not null default 'general',  -- general/mendel/darwin/watson
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references ai_conversations on delete cascade not null,
  role text not null,  -- user/assistant/system
  content text not null,
  image_url text,
  created_at timestamptz default now()
);

-- 学习管理（已有）
create table if not exists study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  priority text default 'medium',
  due_date timestamptz,
  status text default 'pending',
  related_module text,
  pomodoro_count int default 0,
  created_at timestamptz default now()
);

create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  duration int not null,
  task_id uuid references study_tasks,
  started_at timestamptz default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text,
  content text,
  related_concepts text[],
  created_at timestamptz default now()
);

-- 考试试卷（新增，修复 P1-2）
create table if not exists exam_papers (
  id uuid primary key default gen_random_uuid(),
  year int,
  name text not null,
  question_ids text[] not null,  -- 对应 data/*.json 的题 id
  total_score int default 144,
  duration_minutes int default 150,
  is_public boolean default true,
  created_at timestamptz default now()
);

-- 学习统计（新增，修复 P0-3 仪表盘数据源）
create table if not exists user_stats (
  user_id uuid references auth.users primary key,
  total_questions int default 0,
  correct_count int default 0,
  streak_days int default 0,
  last_active date,
  focus_total_minutes int default 0,
  module_stats jsonb default '{}'::jsonb,  -- {cellular: {total, correct}, ...}
  daily_stats jsonb default '{}'::jsonb,  -- {"2026-06-28": {questions, correct, focus_min}}
  updated_at timestamptz default now()
);
```

### 6.2 RLS 策略（所有用户表统一模式）

```sql
-- 所有 user_id 关联表统一策略
alter table wrong_questions enable row level security;
create policy "users own data" on wrong_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 教师访问学生数据：通过 user_key 验证后查询 class_members 表
-- 公开表（exam_papers / 知识图谱节点）可读不可写
```

### 6.3 数据治理（修复 P0-4）

| 任务 | 责任人 | 验收 |
|------|--------|------|
| 清洗 `quiz_auto_generated.json`：选项污染题重新生成或删除 | 数据 | 846 题全量校验，每题选项与题干语义匹配 |
| 补全 `crawled_competition.json` 的 `【解析待补充】` | 数据 | 750 题全量有解析 |
| 题库统一元数据：`source`/`year`/`difficulty`(1-5)/`knowledge`/`chapter` | 数据 | 全表元数据完整率 100% |
| 引入题库版本号 `data/_version.json` | 数据 | 每次更新记录版本与时间戳 |
| 社区种子帖写入 `data/community.json` + 迁移脚本 | 内容 | 20+ 精选帖，含学习经验/真题讨论/科普 |

---

## 7. 技术架构

### 7.1 纯前端约束下的架构

```
浏览器
  ├── 静态资源（HTML/CSS/JS/fonts/data/）
  ├── Supabase JS SDK（Auth + Postgres + Storage + Realtime）
  ├── AI 直连（fetch SSE → 6 家 LLM）
  ├── OCR（Tesseract.js WASM + 视觉模型）
  ├── p5.js（首页粒子动画，defer）
  └── Service Worker（PWA 离线缓存）

无 Node/Python 运行时（server.py 仅开发期可选 AI 代理）
```

### 7.2 模块依赖与加载策略

| 资源 | 加载时机 | 方式 |
|------|----------|------|
| `globals.css`/`layout.css`/`header.css`/`home.css` | 首屏同步 | `<link>` |
| `fsrs-algorithm.js`/`utils.js`/`question-utils.js` | 首屏同步 | `<script>` |
| Supabase SDK | `requestIdleCallback` 延迟 3s | 动态 |
| 各路由模块 JS | 路由匹配时 | `__loadScriptAsync` |
| p5.js | 首页 defer | `<script defer>` |
| Tesseract.js | OCR 触发时 | 动态 |
| KaTeX CSS | 答题/笔记触发时 | 动态（移除首屏 preload） |
| ECharts（如有） | 仪表盘触发时 | 动态 |

### 7.3 架构债清理（P2）

| 任务 | 优先级 |
|------|--------|
| 拆分 `app.js`：`router.js` / `auth-modal.js` / `leaderboard-modal.js` / `feedback-modal.js` | P1 |
| 合并 `supabase.js` 到 `supabase-client.js`，删除 `apiCall` 后端代理死代码 | P1 |
| 删除 `review.js` / `review-deep.js`（已重定向到 wrongbook） | P1 |
| CSS 全部外移到 `css/*.css`，禁止 JS 内联 CSS 注入 | P1 |
| 测试改为 `import` 真实模块（移除手抄副本） | P1 |
| 修复 `sw.js` CORE_ASSETS 与实际加载资源一致 | P1 |
| 引入 esbuild 打包 + 压缩（可选，保持纯静态） | P2 |

---

## 8. AI 能力规范

### 8.1 LLM 提供商

| 提供商 | 默认模型 | 免费额度 | 视觉支持 |
|--------|----------|----------|----------|
| 智谱 GLM | `glm-4-flash` | 2000 万 tokens | 是（glm-4v） |
| DeepSeek | `deepseek-chat` | 500 万 tokens | 否 |
| 阿里通义 | `qwen-turbo` | 100 万 tokens | 是（qwen-vl） |
| 月之暗面 Kimi | `moonshot-v1-8k` | 15 元体验金 | 否 |
| NVIDIA NIM | `meta/llama-3.3-70b-instruct` | 1000 次 | 是（llama-vision） |
| 硅基流动 | `Qwen/Qwen2.5-7B-Instruct` | 14 元额度 | 是 |

### 8.2 安全规范（修复 P0-2）

| 规则 | 实现 |
|------|------|
| **禁止硬编码 API Key** | 删除 `ai-client.js:33` 的 `DEFAULT_ZHIPU_KEY` |
| 开发期默认 Key | 走 `.env`（gitignore）+ 可选 `server.py` 代理；前端不内置任何 Key |
| 用户 Key 存储 | 仅 localStorage `bioquest_ai_keys`，不上传 |
| 每日限额 | 100 次/用户/天，0:00 重置，计数存 localStorage |
| 视觉模型调用 | 必须 `hasVisionSupport()` 校验 provider 在 VISION_MODELS 白名单 |

### 8.3 流式渲染规范

- 流式阶段：`textContent` 增量追加（O(1) 每帧）
- 完成后：`marked` 一次性 Markdown 渲染 + SVG 代码块实时渲染
- 过滤 `[[ANIM:xxx]]` 标签（`_extractAnim` 正则）
- system prompt 全部显式禁止 `[[ANIM:xxx]]` 和 SVG 代码块
- 流式容器 `aria-live="polite"` 供屏幕阅读器

---

## 9. 设计系统

### 9.1 设计 Token（Trae 设计系统，已在 `css/globals.css` 落地）

| 类别 | Token | 值 |
|------|-------|-----|
| 主色 | `--color-primary` | `#4a7c59`（sage 绿） |
| 暖色 | `--color-warm` | `#c4956a`（terracotta 橙） |
| 深色 | `--color-deep` | `#1a3a2a` |
| 背景 | `--color-cream` | `#faf7f2` |
| 间距 | `--space-xs/sm/md/lg/xl/2xl/3xl` | 4/8/16/24/32/48/64px |
| 圆角 | `--radius-sm/md/lg/full` | 6/12/20/9999px |
| 阴影 | `--shadow-sm/md/lg/button` | 见 globals.css |
| 过渡 | `--transition-fast/base/slow/spring` | 0.15/0.25/0.4s + spring |
| 字体 | `--font-serif`/`--font-sans`/`--font-mono` | LXGW WenKai + JetBrains Mono |

旧 CSS 变量保留为别名指向新 Token，避免破坏存量样式。

### 9.2 响应式断点

| 断点 | 值 | 适配 |
|------|----|---- |
| `--breakpoint-sm` | 640px | 大屏手机 |
| `--breakpoint-md` | 768px | 平板竖屏 |
| `--breakpoint-lg` | 1024px | 平板横屏/小笔记本 |
| `--breakpoint-xl` | 1200px | 桌面端（内容最大宽度） |

移动端底部 Tab Bar 5 项：首页/练习/考试/仪表盘/我的。

---

## 10. 非功能需求

### 10.1 性能

| 指标 | 要求 |
|------|------|
| 首屏 LCP | < 2.5s（普通笔记本 + 4G） |
| Canvas 动画 | ≥ 60fps |
| Supabase 查询 | < 800ms 返回 |
| AI 首 token | < 2s（取决于 LLM 提供商） |
| OCR 视觉模型 | < 8s |
| OCR Tesseract 兜底 | < 15s |
| 单页 JS 体积 | < 200KB（gzip，路由级代码分割后） |
| 触控响应 | < 16ms 输入延迟 |

### 10.2 可访问性（WCAG 2.1 AA）

| 项 | 要求 |
|----|------|
| 对比度 | 正常文字 ≥ 4.5:1，大文字/UI ≥ 3:1 |
| 键盘导航 | 所有可交互元素 Tab 可聚焦，Enter/Space 激活，Esc 关闭模态 |
| 焦点环 | `box-shadow: 0 0 0 2px rgba(196,149,106,0.6)` |
| 语义化 | `<nav>`/`<main>`/`<section>`/`<header>`/`<footer>` + `role` |
| 模态焦点陷阱 | 新增：模态打开时焦点锁定，关闭后归还 |
| aria-live | AI 流式输出 `aria-live="polite"` |
| aria-keyshortcuts | 卡片 1/2/3/4 快捷键标注 |
| 减弱动效 | `@media (prefers-reduced-motion: reduce)` 全局生效 |
| skip-link | 全站保留「跳到主要内容」 |

### 10.3 安全

| 项 | 要求 |
|----|------|
| Supabase anon key | 公开但受 RLS 保护，service_role 绝不前端使用 |
| 用户 API Key | 仅 localStorage，不上传，每日 100 次限额 |
| 开发期 Key | `.env` + 可选 `server.py` 代理，**绝不内置前端** |
| 社区内容 | 过滤 `<script>`/`javascript:`/`vbscript:`/`data:` 协议，转义 HTML |
| 教师操作 | 增删学生需 8 位 user_key 验证（模态对话框） |
| 图片上传 | Supabase Storage，RLS 限定本人可读写 |

### 10.4 PWA

| 项 | 要求 |
|----|------|
| 离线缓存 | 5 种策略（导航网络优先/JSON 网络优先/CSS-JS 缓存优先/图片缓存优先/其他缓存优先） |
| CORE_ASSETS | 与实际加载资源**严格一致**（修复 sw.js 错乱） |
| manifest | 3 尺寸图标 + 3 shortcuts（卡片/练习/诊断） + standalone |
| SKIP_WAITING | 消息驱动更新 |

### 10.5 移动端

| 项 | 要求 |
|----|------|
| 触控目标 | ≥ 44x44px（全量审计） |
| 底部 Tab Bar | 5 项核心入口，选中态 `--color-warm` |
| 考试界面 | 小屏适配（顶栏不挤压） |
| 虚拟实验室 | 上下堆叠布局（上实验台 + 下步骤引导） |

---

## 11. 路线图

### 阶段一：P0 修复（1 周）

- [ ] FSRS 算法加载与回退分支删除
- [ ] API Key 硬编码移除，开发期走 .env + server.py
- [ ] 仪表盘/教师模式数据源迁到 Supabase，删除 `_generateLocalLeaderboard` 死代码
- [ ] 题库清洗（选项污染重生成、解析补全）
- [ ] sw.js CORE_ASSETS 与实际资源对齐

### 阶段二：P1 补全（2 周）

- [ ] 虚拟实验室补 2 个（酶活性、质壁分离）
- [ ] 模考多套卷 + 随机组卷
- [ ] AI 对话持久化（ai_conversations/ai_messages）
- [ ] 学情诊断改名 + UI 标注规则引擎
- [ ] 社区冷启动种子 20+ 帖
- [ ] 卡片 ↔ 知识图谱 ↔ 错题 ↔ 练习四向联动
- [ ] 知识图谱数据外移到 `data/knowledge-graph.json`
- [ ] 架构清理：拆 app.js、合并 supabase.js、CSS 外移、测试 import 真实模块

### 阶段三：P2 增强（1 周）

- [ ] 模态焦点陷阱 + aria-live 流式输出
- [ ] esbuild 打包压缩
- [ ] 卡片导出 Anki apkg
- [ ] 学习热力图
- [ ] 社区关注/通知（Realtime）

---

## 12. 验收标准

### 12.1 P0 验收（一票否决）

| 验收项 | 方法 |
|--------|------|
| FSRS 真实运行 | 浏览器控制台执行 `window.FSRS.schedule` 返回对象，非 undefined |
| 无硬编码 Key | `grep -r "f514e5711" .` 无结果；`grep -rE "API_KEY\s*=\s*['\"][a-f0-9]" js/` 无结果 |
| 数据源统一 | 仪表盘/教师模式/排行榜断网后无法显示数据（证明走 Supabase） |
| 题库无污染 | 846 题选项与题干语义匹配（人工抽检 50 题 + 自动校验脚本） |
| 无死代码 | `grep -r "_generateLocalLeaderboard" js/` 无结果 |

### 12.2 P1 验收

| 验收项 | 方法 |
|--------|------|
| 6 个实验 | `/bio-lab` 实验卡片网格显示 6 个，每个可完整完成 |
| 多套卷 | `/exam` 可选至少 3 套试卷，随机组卷模式可生成不同题序 |
| 对话持久化 | 刷新 `/tutor` 页面后会话列表保留，可继续历史对话 |
| 诊断诚实 | `/diagnosis` 页面显著位置标注"规则引擎 + BKT" |
| 社区种子 | `/community` 首屏可见 20+ 帖 |
| 四向联动 | 卡片点击"相关题"跳转练习；错题点击"图谱"跳转知识图谱对应节点 |
| 知识图谱数据驱动 | 删除 JS 内 GRAPH_NODES/GRAPH_EDGES 数组，从 `data/knowledge-graph.json` 加载 |

### 12.3 非功能验收

| 验收项 | 方法 |
|--------|------|
| LCP < 2.5s | Lighthouse 移动端审计 |
| 60fps 动画 | Chrome DevTools Performance 录制 |
| WCAG AA | axe-core 插件扫描无 critical 违规 |
| PWA 离线 | 断网后刷新首页可加载，路由可切换（已缓存模块） |
| 触控目标 | 所有按钮/链接 computed style 宽高 ≥ 44px |

---

## 13. 待确认事项

1. 题库清洗是否引入第三方题源（如学科网授权）？还是仅清洗现有 846+750 题？
2. 模考多套卷是否需要购买真题授权？还是仅用模拟卷？
3. 社区冷启动种子帖是否邀请真实用户撰写？还是 AI 生成 + 人工校对？
4. AI 对话持久化是否需要加密存储（用户可能上传错题图片含个人信息）？
5. 卡片导出 Anki apkg 是否引入第三方库（如 anki-apkg-js）？还是自研生成？
6. esbuild 打包是否保留 source map 便于调试？还是生产关闭？
7. 教师模式的"班级"是否需要学校维度隔离？还是单层班级即可？

---

## 附录 A：与 v1.0 PRD 的差异说明

| v1.0 章节 | v2.0 处理 |
|-----------|-----------|
| 1. 产品概述 | 保留定位，明确纯前端约束 |
| 2. 目标用户 | 保留 |
| 3.1 智能错题管理 | 保留，补充 FSRS 持久化到 Supabase |
| 3.2 Canvas 可视化 | 保留，标注"已达标" |
| 3.3 虚拟实验室 | 保留，明确补 2 个实验 |
| 3.4 学习管理 | 保留，补充数据持久化到 Supabase |
| 4. 技术栈 | 重写，明确纯前端 + 6 家 LLM + 双引擎 OCR |
| 5. 设计原则 | 移到第 9 节设计系统 |
| 6. 路线图 | 重写，按 P0/P1/P2 优先级 |
| 7. 非功能 | 重写，补充可访问性、PWA、移动端 |
| 8. 成功指标 | 移到第 12 节验收标准 |
| 9. 待确认 | 保留并扩充 |

## 附录 B：关键算法保留

v1.0 PRD 的 5 个 `<details>` 算法说明（FSRS / OCR 双引擎 / AI 流式渲染 / Cytoplasmic Drift / 番茄钟-待办关联）继续有效，详见 README.md。本 PRD 不重复。
