# BioQuest PRD v3.0 — 创新愿景

> 版本 3.0 | 2026-06-28 | 创意增强版
> 定位不变：纯前端 SPA + Supabase + 用户自配 LLM
> 目标：从"功能完整的 demo"升级为"有记忆点的产品"

---

## 0. 文档目的

v2.0 PRD 修复了 demo 的宣传断裂与工程债。v3.0 聚焦**创新差异化**——用现有技术栈（Canvas / OCR / FSRS / BKT / 多 LLM / PWA）做出竞品没有的体验，让 BioQuest 不只是"另一个刷题 App"。

---

## 1. 核心理念：让生物"活"起来

| 现状 | 创新方向 |
|------|----------|
| 静态题目 + 文字解析 | 生物过程**可视化、可操作、可对话** |
| 通用刷题排行榜 | **个人化学习画像** + 预测性分析 |
| 单人孤立学习 | **协作式实验台** + 实时对战 |
| 固定题库 | AI **即时生成**针对性变式题 |
| 通用 AI 答疑 | **苏格拉底式引导** + 角色扮演导师 |

---

## 2. 十二大创新模块

### 2.1 自适应学习引擎（Adaptive Learning Engine）

**问题**：当前练习是题库随机抽题，不根据掌握度调整难度。
**创新**：引入 IRT（项目反应理论）+ DKT（深度知识追踪）混合模型。

| 特性 | 实现 |
|------|------|
| 题目难度自适应 | 每题标注难度参数 a/b/c（区分度/难度/猜测率），根据用户 θ 值抽样 |
| 实时 θ 估计 | 每答一题用贝叶斯更新用户能力值，UI 显示"当前能力 0.62（全国前 35%）" |
| 薄弱点精准打击 | BKT 识别薄弱知识点后，连续推送 3-5 道该点题目（梯度难度） |
| 预测性分析 | 基于历史数据预测联赛得分区间（如 78±6 分），置信度随练习量提升 |

**数据需求**：题库补充 `difficulty`(0-1)、`discrimination`(0-2)、`guessing`(0-0.5) 三参数。

**前端实现**：纯 JS 实现 IRT 似然估计（无需后端），BKT 已有基础。

---

### 2.2 苏格拉底式 AI 导师（Socratic Tutor）

**问题**：当前 AI 导师是"问什么答什么"，学生被动接受。
**创新**：AI 不直接给答案，用苏格拉底式提问引导学生自己推导。

**对话策略**：
```
学生：为什么减数分裂要有交叉互换？
[普通模式] AI：交叉互换增加遗传多样性...（直接给答案）
[苏格拉底模式] AI：好问题。先想想——如果减数分裂没有交叉互换，
                  同源染色体的子代组合会有什么限制？
学生：只能整条染色体的组合？
AI：对。那整条染色体上有多少个基因？如果只有整条传递，
    重组率会是什么情况？
学生：重组率只有 50%（整条染色体作为一个单位）...
AI：那物种适应环境的能力会怎样？
学生：变弱，因为可组合的基因型变少。
AI：完全正确。所以交叉互换的本质是...？
```

**实现**：
- system prompt 增加"不要直接给答案，用提问引导"指令
- 增加"提示等级"按钮（Level 1 提问 / Level 2 提示 / Level 3 部分答案 / Level 4 完整答案）
- 学生可随时切换"苏格拉底模式"和"直接答疑模式"

---

### 2.3 AI 即时变式题生成（Instant Variant Generation）

**问题**：错题推送的"相似题"是题库静态匹配，数量有限。
**创新**：AI 基于错题即时生成变式题（改数字 / 改情境 / 改题型）。

**生成策略**：
| 变式类型 | 示例 |
|----------|------|
| 数字变式 | 原：AaBb 自交，后代 A_B_ 比例？→ 变：AaBbCc 三对基因自交，A_B_C_ 比例？ |
| 情境变式 | 原：踠豆花色 → 变：果蝇眼色（伴性遗传） |
| 题型变式 | 原：计算题 → 变：实验设计题 |
| 逆向变式 | 原：求后代比例 → 变：已知后代比例，求亲本基因型 |

**质量控制**：
- 生成后 AI 自检（用另一个 LLM 调用校验答案合理性）
- 用户标记"题目有误"反馈进入优化队列
- 生成的题目标记 `ai_generated: true` + `parent_question_id`

**前端实现**：复用现有 `AiClient.streamChat`，新增 `generateVariant(originalQuestion, type)` 函数。

---

### 2.4 协作式虚拟实验台（Collaborative Lab Bench）

**问题**：虚拟实验室是单人体验，缺少协作感。
**创新**：WebRTC + Supabase Realtime 实现多人同屏实验。

**场景**：
- 教师开"直播实验课"，学生实时观看教师操作
- 学生分组实验，每人负责不同步骤（A 加试剂 / B 计时 / C 记录）
- 实验报告协同编辑（类似 Google Docs）

**技术方案**：
- WebRTC Data Channel 同步操作指令（低延迟）
- Supabase Realtime 同步实验状态（持久化）
- Canvas 操作广播：A 的拖拽动作实时在 B 的屏幕重现

**MVP 范围**：先支持 2 人协作（师生 1v1），后续扩展到 4 人小组。

---

### 2.5 BioQuest Arena 实时对战（PvP Quiz Battle）

**问题**：刷题枯燥，缺少社交激励。
**创新**：实时 1v1 / 2v2 答题对战。

**玩法**：
- 匹配同水平对手（按 θ 值 ±0.1 匹配）
- 5 题一组，每题 30 秒，答对得 100 分 + 速度加成
- 实时显示对手答题进度（"对手已答 3 题，你 2 题"）
- 胜负影响排行榜 + 信用分

**技术方案**：
- Supabase Realtime 订阅对战房间状态
- 题目预生成（避免 AI 延迟），从对战题库抽样
- 断线重连保护（30 秒内重连不判负）

**创新点**：生物主题技能卡——连胜 3 场解锁"达尔文之眼"（看一道题的解析）、"孟德尔幸运"（下一题 50% 概率提示）。

---

### 2.6 3D 细胞探索器（3D Cell Explorer）

**问题**：Canvas 动画是 2D 平面，空间感不足。
**创新**：用 Three.js 渲染可旋转的 3D 细胞模型。

**功能**：
- 鼠标拖拽旋转细胞，滚轮缩放进入细胞器
- 点击线粒体 → 飞入线粒体内部 → 看 3D 嵴结构 + ATP 合酶旋转动画
- 点击叶绿体 → 飞入 → 看 3D 类囊体 + 光系统 II 电子传递
- AR 模式（WebXR）：手机摄像头扫描桌面，细胞"放"在桌上

**技术方案**：
- Three.js + GLTF 模型（开源生物模型库）
- 模型按需加载（路由进入 3D 模块才加载 Three.js，约 600KB gzip）
- WebXR 作为 P2 增强（需支持设备）

**模型来源**：BioRender / Sketchfab CC 协议模型，或自建低多边形模型。

---

### 2.7 学习画像 DNA（Learning Profile DNA）

**问题**：仪表盘是普通统计图，没有个人标识感。
**创新**：把学习数据可视化为独特的"DNA 条形码"。

**设计**：
- 每个用户生成一条独有的"学习 DNA"——32 位碱基序列（A/T/G/C）
- 每位碱基由一个维度决定：A=擅长细胞、T=擅长遗传、G=擅长生态、C=擅长生化
- 碱基亮度 = 该维度掌握度
- 整条 DNA 形成个人化视觉标识，可分享、可印在 T 恤上

**衍生**：
- "DNA 相似度"匹配学习伙伴（互补型 / 同好型）
- DNA 排行榜（按"完整度"排序，鼓励全面发展）
- 教师查看班级"DNA 矩阵"（一屏看清全班强弱分布）

---

### 2.8 生物主题 RPG 进阶系统（Bio RPG）

**问题**：现有徽章系统太单薄（10 个徽章 + streak）。
**创新**：把学习行为包装为生物主题 RPG。

**设定**：
- 用户扮演"细胞进化者"，从"原核细胞"起步
- 答题 = 积累"能量分子（ATP）"
- 掌握知识点 = 获得"基因片段"
- 集齐某模块所有基因 = 进化出对应细胞器（如掌握光合作用 → 进化出叶绿体）
- 进化路径：原核 → 真核 → 单细胞 → 多细胞 → 组织生物

**等级与解锁**：
| 等级 | 形态 | 解锁内容 |
|------|------|----------|
| Lv1 | 原核细胞 | 基础练习 |
| Lv5 | 真核细胞 | 虚拟实验室 |
| Lv10 | 单细胞生物 | AI 导师 |
| Lv20 | 多细胞生物 | 对战 Arena |
| Lv30 | 组织生物 | 3D 探索器 |

**社交**：进化树展示（类似 GitHub 贡献图），朋友间比拼进化等级。

---

### 2.9 实验报告 AI 同伴评审（AI Peer Review）

**问题**：虚拟实验做完即结束，缺少反思环节。
**创新**：AI 扮演"同学"角色，对实验报告进行同伴评审。

**流程**：
1. 学生完成虚拟实验 → 自动生成实验报告草稿（步骤 + 现象 + 结论）
2. 学生补充"实验反思"（30 字以上）
3. AI 同伴评审：指出报告优点 + 疑问 + 改进建议
4. 学生根据评审修改报告
5. AI 二次评审 + 评分（A/B/C 三级）

**AI Prompt 设计**：
```
你是一名高中生，刚完成同样的实验。请以同学视角评审这份实验报告：
- 不要直接给标准答案
- 指出 1 个做得好的地方
- 提出 1-2 个疑问（促进反思）
- 给出 1 条改进建议
语气友好、平等，不要教师腔。
```

**价值**：训练科学写作能力 + 批判性思维，而非只是"做对实验"。

---

### 2.10 生物伦理苏格拉底研讨室（Bioethics Seminar）

**问题**：生物学习只考知识，不思考伦理。
**创新**：AI 主持的生物伦理讨论室，培养科学素养。

**议题库**：
- CRISPR 基因编辑婴儿伦理
- 转基因作物生态风险
- 灭绝物种复活（猛犸象）
- 脑机接口与人类增强
- 合成生物学与生命定义

**流程**：
1. AI 主持人介绍议题背景（3 分钟阅读）
2. 学生选择立场（支持 / 反对 / 中立）
3. AI 反方辩手提出质疑（针对学生立场）
4. 学生回应 → AI 追问 → 深化讨论
5. 结束时 AI 总结各方观点，不给出"标准答案"

**评估维度**：论证逻辑性 / 证据运用 / 视角多元性 / 反思深度（AI 评分 + 反馈）。

---

### 2.11 生成式生物艺术画廊（Generative Bio Art Gallery）

**问题**：学习过程缺少美学记忆点。
**创新**：把学习数据转化为生成式艺术作品。

**作品类型**：
- **细胞分裂曼陀罗**：每次答对有丝分裂题，生成一片花瓣，10 题组成一朵曼陀罗
- **DNA 流动场**：基于学习进度生成粒子流场艺术（已有"细胞质漂流"基础）
- **进化树**：个人学习路径可视化为分形树
- **知识星座**：知识图谱掌握度映射为星座图

**社交**：画廊模式，浏览他人作品，点赞收藏。优秀作品进入"每周精选"。

**技术**：p5.js（已用）+ noise 算法 + 学习数据种子。零额外依赖。

---

### 2.12 离线 AI 导师（Offline AI Tutor）

**问题**：用户无 API Key / 无网络时 AI 功能不可用。
**创新**：用 WebLLM 在浏览器本地运行小模型，离线可用。

**技术方案**：
- WebLLM（基于 WebGPU）加载 Phi-3.5-mini（2.4GB）或 Qwen2.5-1.5B（1GB）
- 首次访问提示"启用离线 AI（需下载 1GB 模型）"
- 模型缓存到 IndexedDB，后续秒开
- 离线时自动降级到本地模型，联网时优先用云端

**适用场景**：
- 无 API Key 用户的基础问答
- 隐私敏感问题（不上传到云端）
- 网络不稳定环境

**限制**：本地模型能力弱于云端（Phi-3.5 约等于 GPT-3.5），复杂推理仍需云端。明确告知用户"离线模式为简化版"。

---

## 3. 优先级与路线图

### P0（差异化核心，3 周）
| 模块 | 理由 |
|------|------|
| 2.1 自适应学习引擎 | 没有自适应就不算智能学习平台 |
| 2.2 苏格拉底式 AI 导师 | 低成本高差异化，纯 prompt 工程 |
| 2.3 AI 变式题生成 | 解决题库有限的核心痛点 |
| 2.7 学习画像 DNA | 强分享属性，自带传播 |

### P1（体验增强，4 周）
| 模块 | 理由 |
|------|------|
| 2.5 Arena 实时对战 | 社交激励 + 留存 |
| 2.8 Bio RPG 进阶 | 长期动机 |
| 2.9 AI 同伴评审 | 科学写作训练 |
| 2.11 生成式生物艺术 | 美学记忆点 |

### P2（技术探索，4 周）
| 模块 | 理由 |
|------|------|
| 2.6 3D 细胞探索器 | 视觉震撼但依赖大模型 |
| 2.4 协作实验台 | 技术复杂，WebRTC 调试成本高 |
| 2.10 生物伦理研讨室 | 内容设计成本高 |
| 2.12 离线 AI | WebGPU 兼容性待验证 |

---

## 4. 数据模型扩展

### 4.1 新增表

```sql
-- 自适应学习：题目参数（IRT 三参数）
create table if not exists question_params (
  question_id text primary key,
  difficulty float,        -- 0-1，难度
  discrimination float,    -- 0-2，区分度
  guessing float,          -- 0-0.5，猜测率
  knowledge_node_id text,  -- 关联知识图谱节点
  updated_at timestamptz default now()
);

-- 自适应学习：用户能力值
create table if not exists user_ability (
  user_id uuid references auth.users primary key,
  theta float default 0,           -- IRT 能力值
  theta_by_module jsonb,           -- {module1: 0.5, module2: 0.3, ...}
  total_answered int default 0,
  updated_at timestamptz default now()
);

-- AI 变式题
create table if not exists ai_generated_questions (
  id uuid primary key default gen_random_uuid(),
  parent_question_id text,
  user_id uuid references auth.users,
  question_data jsonb not null,
  variant_type text,  -- numeric/context/reverse/type
  is_verified boolean default false,
  user_feedback text,  -- good/bad/neutral
  created_at timestamptz default now()
);

-- 对战记录
create table if not exists arena_battles (
  id uuid primary key default gen_random_uuid(),
  player1 uuid references auth.users,
  player2 uuid references auth.users,
  question_ids text[],
  scores jsonb,  -- {player1: 350, player2: 280}
  winner uuid,
  battle_log jsonb,
  created_at timestamptz default now()
);

-- RPG 进阶
create table if not exists user_rpg (
  user_id uuid references auth.users primary key,
  level int default 1,
  form text default 'prokaryote',  -- prokaryote/eukaryote/...
  atp int default 0,                -- 经验值
  genes jsonb default '[]',         -- 已获得基因片段
  evolution_log jsonb default '[]', -- 进化历史
  updated_at timestamptz default now()
);

-- 学习 DNA
create table if not exists user_dna (
  user_id uuid references auth.users primary key,
  sequence char(32),                -- ATGC 32 位
  completeness float default 0,     -- 0-1
  updated_at timestamptz default now()
);

-- 实验报告
create table if not exists lab_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  experiment_id text,
  report_content text,
  reflection text,
  ai_review jsonb,                  -- {round1: {...}, round2: {...}}
  grade text,                       -- A/B/C
  created_at timestamptz default now()
);

-- 生成式艺术作品
create table if not exists bio_artworks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  art_type text,  -- mandala/flowfield/tree/constellation
  seed jsonb,     -- 生成种子（学习数据）
  image_data text,  -- base64 PNG
  like_count int default 0,
  is_featured boolean default false,
  created_at timestamptz default now()
);
```

---

## 5. 技术架构扩展

### 5.1 新增依赖（按需加载）

| 依赖 | 大小 | 用途 | 加载时机 |
|------|------|------|----------|
| Three.js | 600KB gzip | 3D 细胞探索 | `/cell-3d` 路由 |
| WebLLM | 200KB + 模型 1-2GB | 离线 AI | 用户主动启用 |
| WebRTC | 浏览器内置 | 协作实验台 / 对战 | 进入相关模块 |
| SimplePeer | 50KB | WebRTC 封装 | 协作模块 |

### 5.2 纯前端约束下的实时通信

```
Supabase Realtime（Postgres Changes / Broadcast / Presence）
  ├── 对战房间状态同步
  ├── 协作实验台操作广播
  └── 社区实时通知

WebRTC Data Channel（点对点，低延迟）
  ├── 协作实验台高频操作（鼠标位置 / 拖拽）
  └── 对战中实时答题进度
```

---

## 6. 设计创新

### 6.1 学习 DNA 视觉规范

```
碱基配色：
  A (腺嘌呤) → #4a7c59 (sage 绿)
  T (胸腺嘧啶) → #c4956a (terracotta 橙)
  G (鸟嘌呤) → #1a3a2a (deep 绿)
  C (胞嘧啶) → #e8d5b7 (cream)

DNA 条形码：32 个色块横向排列，亮度 = 掌握度
分享卡片：DNA 条形码 + 用户名 + 等级 + 进化形态
```

### 6.2 RPG 进化形态视觉

| 形态 | 视觉风格 |
|------|----------|
| 原核细胞 | 简单圆形 + 鞭毛 |
| 真核细胞 | 圆形 + 内部小圆（细胞器雏形） |
| 单细胞生物 | 草履虫形态 |
| 多细胞生物 | 细胞群组合 |
| 组织生物 | 分层结构 |

用 SVG 内联绘制，零图片依赖，可动画过渡。

### 6.3 生成式艺术风格指南

- 配色限定在 Trae 设计系统的 4 色调色板
- 线条风格：有机曲线（生物感），避免几何硬边
- 动效：缓慢生长（模拟生物过程），非机械闪烁
- 留白充足，每件作品都是"可装裱的"

---

## 7. 用户体验创新

### 7.1 微交互

| 场景 | 微交互 |
|------|--------|
| 答对题 | 细胞分裂动画（一分为二）+ 柔和音效 |
| 答错题 | DNA 链短暂抖动 + 温和提示 |
| 连续答对 5 题 | 进化光环（角色周围发光） |
| 掌握知识点 | 基因片段落入"基因库"动画 |
| 完成模考 | 学习 DNA 重新生成动画 |

### 7.2 声音设计（P2）

| 场景 | 音效 |
|------|------|
| 番茄钟专注 | 低频心跳声（可关） |
| 细胞动画播放 | 显微镜调焦声 |
| 对战胜利 | 短促和弦上行 |
| 对战失败 | 柔和降调（非刺耳） |
| 进化升级 | 合成器长音 + 粒子声 |

全部用 Web Audio API 合成，零音频文件。

---

## 8. 评估指标

### 8.1 创新效果指标

| 指标 | 目标 | 测量 |
|------|------|------|
| 7 日留存 | > 40% | Supabase 用户活跃统计 |
| 平均会话时长 | > 15 分钟 | 前端埋点 |
| AI 导师苏格拉底模式使用率 | > 30% | 模式切换埋点 |
| 变式题完成率 | > 60% | 题目完成埋点 |
| 学习 DNA 分享率 | > 10% | 分享按钮点击 |
| Arena 对战胜率均衡性 | 45-55% | 胜率分布 |
| 实验报告提交率 | > 70% | 报告提交埋点 |

### 8.2 学习效果指标

| 指标 | 目标 |
|------|------|
| IRT θ 值提升 | 4 周内 +0.2 |
| 弱知识点掌握率 | 4 周内 60% → 80% |
| 模考分数预测准确度 | ±5 分内（95% 置信） |
| FSRS 复习坚持率 | 30 天 > 50% |

---

## 9. 风险与缓解

| 风险 | 缓解 |
|------|------|
| WebLLM 模型过大（1-2GB） | 明确提示 + 用户主动启用 + 渐进式下载 |
| WebRTC 兼容性（旧浏览器） | 检测 + 降级到 Supabase Realtime |
| AI 变式题质量不稳定 | 双 LLM 校验 + 用户反馈循环 + 隔离生产题库 |
| 对战匹配等待长 | 扩大 θ 匹配范围（±0.1 → ±0.3）+ 机器人兜底 |
| 3D 模型加载慢 | LOD 多级模型 + 首屏低多边形 |
| RPG 系统劝退新手 | 进度可关 + 默认低存在感 |

---

## 10. 与 v2.0 的关系

v3.0 的所有创新**建立在 v2.0 P0/P1 修复基础上**：
- 自适应学习引擎依赖题库清洗（v2.0 P0-4）
- AI 变式题依赖 FSRS 错题数据（v2.0 P0-1）
- 对战排行榜依赖 Supabase 数据统一（v2.0 P0-3）
- 苏格拉底导师依赖对话持久化（v2.0 P1-6）

**实施顺序**：先完成 v2.0 全部 P0/P1，再启动 v3.0。

---

## 11. 待确认事项

1. **IRT 题目参数标定**：是否邀请生物教师标注？还是用历史答题数据 EM 算法估计？
2. **3D 模型版权**：自建 vs 商业授权 vs CC 协议？预算？
3. **WebLLM 首次下载体验**：是否提供"先试用云端 AI，稍后再下载离线模型"引导？
4. **Arena 对战题库**：是否独立于练习题库？还是共享？
5. **RPG 系统深度**：是轻量皮肤（仅视觉）还是机制深度（影响功能解锁）？
6. **生成式艺术存储**：base64 入库 vs Supabase Storage vs 客户端 IndexedDB？
7. **生物伦理议题**：是否需要专家审核避免误导？

---

## 附录 A：竞品差异化矩阵

| 能力 | 普通刷题 App | 学而思/猿辅导 | BioQuest v3.0 |
|------|-------------|---------------|----------------|
| 自适应难度 | ✗ | ✓（但贵） | ✓（免费） |
| AI 答疑 | ✓（通用） | ✓（学科） | ✓（苏格拉底式） |
| 变式题生成 | ✗ | 有限 | ✓（即时生成） |
| 虚拟实验 | ✗ | 有限 | ✓（6 个 + 协作） |
| 知识图谱 | ✗ | ✗ | ✓（可视化） |
| 对战 | ✓（通用） | ✗ | ✓（生物主题） |
| RPG 进阶 | ✗ | ✗ | ✓（生物进化主题） |
| 学习画像 | 统计图 | 统计图 | ✓（DNA 可视化） |
| 离线 AI | ✗ | ✗ | ✓（WebLLM） |
| 生物伦理 | ✗ | ✗ | ✓（研讨室） |
| 生成式艺术 | ✗ | ✗ | ✓（学习数据驱动） |

---

## 附录 B：技术可行性快速验证清单

| 模块 | 可行性 | 验证方式 |
|------|--------|----------|
| IRT 自适应 | ★★★★★ | 纯 JS 实现，已有 BKT 基础 |
| 苏格拉底导师 | ★★★★★ | 纯 prompt 工程 |
| 变式题生成 | ★★★★☆ | 复用 AiClient，需质量控制 |
| 协作实验台 | ★★★☆☆ | WebRTC + Realtime，调试复杂 |
| Arena 对战 | ★★★★☆ | Realtime 已有，匹配算法简单 |
| 3D 探索器 | ★★★☆☆ | Three.js 成熟，模型获取是瓶颈 |
| 学习 DNA | ★★★★★ | 纯算法 + SVG |
| Bio RPG | ★★★★☆ | 状态机 + SVG |
| AI 同伴评审 | ★★★★★ | 纯 prompt 工程 |
| 生物伦理 | ★★★★☆ | 议题库 + prompt |
| 生成式艺术 | ★★★★★ | p5.js 已用 |
| 离线 AI | ★★☆☆☆ | WebGPU 兼容性待验证 |
