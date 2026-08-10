# BioQuest PRD v3.1 — 从刷题 App 升级为 AI 生物课堂

> 版本 3.1 | 2026-06-28 | 参考 OpenMAIC 优化版
> 定位不变：纯前端 SPA + Supabase + 用户自配 LLM
> 核心升级：从"智能刷题平台"进化为"多智能体 AI 生物课堂"

---

## 0. 文档目的与参考来源

### 0.1 v3.0 → v3.1 的进化

v3.0 提出 12 个创新方向，但定位仍是"刷题 + 可视化 + 游戏化"。参考 [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC)（清华多智能体交互课堂）后，发现根本性差距：

| 维度 | OpenMAIC | BioQuest v3.0 | 差距 |
|------|----------|---------------|------|
| 核心范式 | **AI 课堂**（老师讲+同学讨论） | 刷题 + AI 答疑 | 缺"课堂"叙事 |
| AI 角色 | 主动操作 UI、画白板、TTS 朗读 | 文字对话 | AI 是被动的 |
| 交互类型 | 5 类（3D/模拟/游戏/思维导图/编程） | 3 类（动画/实验/对战） | 缺编程+思维导图 |
| 内容生成 | 一键生成完整课程 | 用户手动选题 | 缺"生成式课堂" |
| 学习模式 | PBL 项目式 + 标准课堂 | 题库练习 | 缺开放项目 |
| 多模态 | TTS + 白板 + 视觉 | 纯文本 + Canvas | 缺语音和实时画图 |

### 0.2 v3.1 的核心转向

**从"刷题平台"升级为"AI 生物课堂"**——每个生物主题都是一节可生成的、多智能体参与的、5 类交互融合的、AI 老师主动引导的沉浸式课堂。刷题变成课堂的"测验环节"，而非孤立功能。

### 0.3 纯前端约束下的可行性声明

OpenMAIC 是 Next.js 全栈（需服务端 LLM 代理）。BioQuest v3.1 **坚守纯前端**：
- "一键课程生成"用前端 SSE 直连 LLM（已有 AiClient）
- "AI 老师操作 UI"用前端事件总线 + postMessage
- "白板"用 Canvas + yjs for IndexedDB（无服务端 CRDT）
- "TTS"用浏览器内置 SpeechSynthesis + 可选云端 TTS
- "在线编程"用 Pyodide WASM（纯前端 Python）
- "PBL 项目"用 Supabase 存储项目状态

---

## 1. 新核心理念：AI 生物课堂

### 1.1 一句话定位升级

> **v3.0**：智能生物学习平台
> **v3.1**：每个生物概念都有一节为你生成的 AI 课堂——AI 老师讲解、AI 同学讨论、5 类交互探索、项目式实践

### 1.2 课堂四要素（借鉴 OpenMAIC + 生物特色）

| 要素 | 实现 | 生物特色 |
|------|------|----------|
| **AI 老师** | 主讲智能体，可操作 UI（高亮 Canvas 动画步骤、在知识图谱点亮节点、在白板画图） | 切换"达尔文/孟德尔/沃森"角色视角 |
| **AI 同学** | 2-3 个智能体扮演不同水平同学，提问、质疑、补充 | "困惑型同学"问基础问题，"学霸型同学"延伸思考 |
| **5 类交互 UI** | 3D / 模拟 / 游戏 / 思维导图 / 编程，AI 老师可主动操作任一类型 | 生物主题映射（见 §2.2） |
| **项目实践** | 每节课结尾有开放式 PBL 任务 | "设计 PCR 引物"、"模拟种群 100 代演化" |

### 1.3 与 v3.0 的关系

v3.0 的 12 个创新模块**不废弃**，而是被重新组织为"课堂的组成部分"：

| v3.0 模块 | v3.1 归属 |
|-----------|-----------|
| 2.1 自适应学习引擎 | 课堂的"测验环节"智能抽题 |
| 2.2 苏格拉底式 AI 导师 | AI 老师的对话策略之一 |
| 2.3 AI 变式题生成 | 课堂测验环节的题目来源 |
| 2.4 协作实验台 | 课堂的"模拟交互"环节（多人版） |
| 2.5 Arena 对战 | 课堂的"游戏交互"环节（PvP） |
| 2.6 3D 细胞探索器 | 课堂的"3D 交互"环节 |
| 2.7 学习 DNA | 课堂的"学情追踪"层 |
| 2.8 Bio RPG | 课堂的"动机系统"层 |
| 2.9 AI 同伴评审 | 课堂的"项目实践"评审环节 |
| 2.10 生物伦理研讨室 | 一种特殊课堂类型 |
| 2.11 生成式艺术画廊 | 课堂的"美学奖励"层 |
| 2.12 离线 AI | 课堂的"离线降级"层 |

---

## 2. 五大新增核心模块（v3.1 独有）

### 2.1 一键 AI 课堂生成（Instant AI Classroom）

**借鉴 OpenMAIC**：输入主题 → 生成完整课堂。
**生物特色**：基于知识图谱节点生成，与现有题库/卡片/动画自动联动。

**输入方式**：
| 方式 | 示例 |
|------|------|
| 知识图谱节点点击 | 点击"光合作用" → "生成课堂" |
| 自由文本 | "我想学卡尔文循环的限速步骤" |
| 上传教材 PDF | 上传人教版必修一 P70-85 → MinerU 解析 → 生成课堂 |
| 错题触发 | 错题本某知识点错 3 次 → "为这个知识点生成一节复习课" |

**生成内容**（5-8 分钟一节课）：
```
课堂：光合作用——光反应与暗反应的耦合
├── 1. 导入（AI 老师口述 + 白板画叶绿体结构）        1 min
├── 2. 讲解（Canvas 动画播放 + AI 老师同步解说）      3 min
│   └── AI 老师在动画第 3 步高亮"类囊体膜"
├── 3. 模拟交互（虚拟实验室色素提取实验）            2 min
├── 4. AI 同学讨论（学霸问"为什么 C4 植物有花环结构"）1 min
├── 5. 测验（3 道 FSRS 抽取的相关题）                1 min
└── 6. 项目任务（设计实验验证光饱和点）              课后
```

**技术实现**：
- 前端 orchestrator 智能体调用 LLM 生成课堂大纲（JSON schema 约束）
- 大纲含 6 个 scene，每个 scene 指定 `type`（lecture/sim/game/quiz/pbl/discussion）
- 按大纲顺序执行，每 scene 触发对应模块加载
- AI 老师脚本（讲稿）由 LLM 生成，TTS 朗读，与 Canvas 动画时间轴同步

**Per-stage LLM routing**（借鉴 OpenMAIC）：
| 阶段 | 推荐模型 | 理由 |
|------|----------|------|
| 课堂大纲规划 | 强模型（GPT-5/GLM-5） | 需要教学设计能力 |
| AI 老师讲稿 | 中等模型（GLM-4-Flash） | 流式 TTS 要求低延迟 |
| 变式题生成 | 强模型 | 需要严谨的生物学 |
| 简单答疑 | 快模型（Qwen-Turbo） | 高频低成本 |
| OCR 视觉 | 视觉模型（GLM-4V） | 已有 |

---

### 2.2 五类深度交互 UI（Five Interactive UI Types）

**直接对标 OpenMAIC**，但全部生物主题化。

| 类型 | BioQuest 实现 | 现有基础 | 新增工作 |
|------|---------------|----------|----------|
| 🌐 **3D 可视化** | 3D 细胞器探索（Three.js） | v3.0 §2.6 规划 | 自建低多边形细胞器模型 |
| ⚙️ **模拟仿真** | 虚拟实验室 + Canvas 动画 | 已有 6 实验 + 7 动画 | AI 老师可远程操作 |
| 🎮 **知识游戏** | Arena 对战 + 单人闯关 | v3.0 §2.5 PvP | 新增单人闯关模式 |
| 🧭 **思维导图** | 知识图谱 + AI 生成子图 | 已有 knowledge-graph.js | 升级为可编辑 + AI 老师点亮 |
| 💻 **在线编程** | 生物信息学 Python 沙盒 | **完全空白** | **新增 Pyodide 沙盒** |

#### 2.2.1 在线编程沙盒（生物信息学）—— 全新维度

**为什么加**：联赛越来越考数据分析（种群遗传统计、序列分析、酶动力学拟合），现有平台完全缺失。

**功能**：
| 模板 | 代码任务 | 生物考点 |
|------|----------|----------|
| 种群增长 | 写 logistic 增长函数，绘制 N-t 曲线 | 生态学 r/K 选择 |
| Hardy-Weinberg | 计算 p/q 频率，验证平衡 | 群体遗传 |
| 酶动力学 | 拟合 Michaelis-Menten 曲线，求 Km/Vmax | 生化 |
| 序列分析 | DNA 转录翻译，找突变位点 | 分子生物 |
| 系统树构建 | UPGMA 聚类（简化版） | 进化论 |
| 遗传杂交 | 模拟 AaBb × AaBb 1000 次，统计表型比 | 孟德尔 |

**技术**：
- Pyodide WASM（约 10MB，按需加载，缓存到 IndexedDB）
- 内置 numpy + matplotlib（Pyodide 自带）
- 代码编辑器：CodeMirror 6（轻量，60KB）
- AI 助教：代码报错时自动调用 LLM 解释

#### 2.2.2 思维导图升级（AI 可操作）

**现状**：knowledge-graph.js 是被动力导向图。
**升级**：
- AI 老师可"点亮"当前讲解的节点（高亮 + 脉冲动画）
- AI 老师可"展开"子图（点击节点 → 自动生成子节点）
- 学生可编辑：拖拽、增删节点、添加自己的关联
- 保存到 Supabase `user_mindmaps` 表

#### 2.2.3 AI 老师主动操作 UI（核心创新）

**借鉴 OpenMAIC 最酷特性**：AI 老师不只是文字对话，能主动操作任意 UI 元素。

**操作类型**：
| 操作 | 实现 | 示例 |
|------|------|------|
| 高亮 Canvas 动画步骤 | 事件总线 → bio-animation.highlightStep(n) | "注意第 3 步的交叉互换" |
| 点亮知识图谱节点 | 事件总线 → knowledge-graph.highlightNode(id) | "这是光合作用相关的 3 个节点" |
| 演示虚拟实验操作 | 事件总线 → bio-lab.runStep(id) | "看我把温度调到 60℃ 会怎样" |
| 在白板画图 | Canvas + AI 生成绘制指令 | 画 DNA 双螺旋示意 |
| 设置编程沙盒初始代码 | 事件总线 → code-sandbox.setCode(snippet) | "从这个模板开始写" |
| 推送测验题 | 事件总线 → quiz.pushQuestion(id) | "来道题检验一下" |

**技术**：前端 `EventBus`（纯 JS，无依赖），AI 老师的 LLM 输出含 `[ACTION:type:param]` 标签，前端解析后派发。

```js
// AI 老师输出示例
"我们来看光合作用的光反应。注意类囊体膜上的光系统 II。
[ACTION:highlight_animation_step:microscope:3]
这里水分子被光解，产生氧气。
[ACTION:highlight_kg_node:photosynthesis]
[ACTION:whiteboard_draw:dna_helix]"
```

---

### 2.3 多智能体课堂讨论（Multi-Agent Classroom Discussion）

**借鉴 OpenMAIC**：AI 老师 + AI 同学实时讨论。
**对比 v3.0 §2.2**：v3.0 的"苏格拉底导师"是 1v1，v3.1 升级为多智能体课堂讨论。

**角色设定**：
| 角色 | 人设 | 行为模式 |
|------|------|----------|
| 主讲老师 | 严谨的生物学教授 | 讲解 + 高亮 UI + 推送题 |
| 助教 AI | 苏格拉底式引导者 | 提问引导思考 |
| 学霸同学 | 提前预习的尖子生 | 延伸提问、补充冷知识 |
| 困惑同学 | 基础薄弱的学生 | 问"基础问题"让老师重新讲 |
| 应用同学 | 喜欢联系实际的 student | "这个在生活里有什么用？" |

**讨论流程**（每节课 3-5 轮讨论）：
1. 主讲讲完一个知识点
2. 困惑同学提问（触发老师重新讲解或助教引导）
3. 学霸同学延伸（触发深度拓展）
4. 应用同学联系实际（触发案例展示）
5. 老师总结

**实现**：复用现有 discussion.js 多智能体框架，新增"角色人设库"和"课堂剧本"概念。

---

### 2.4 PBL 项目式学习（Project-Based Learning）

**借鉴 OpenMAIC**：每节课有项目任务。
**生物特色**：开放式生物项目，AI 同伴评审（融合 v3.0 §2.9）。

**项目库**（10 个核心项目）：
| 项目 | 时长 | 涉及知识点 | 产出 |
|------|------|------------|------|
| 设计 PCR 引物扩增目标基因 | 2h | 分子生物、PCR | 引物序列 + 特异性分析 |
| 模拟种群 100 代演化 | 1.5h | 群体遗传、自然选择 | 演化曲线 + 基因频率变化图 |
| 构建校园生态系统模型 | 2h | 生态学、物质循环 | 能量流动图 + 物种关系网 |
| 分析家族遗传病系谱 | 1h | 孟德尔、伴性遗传 | 系谱图 + 风险评估 |
| 设计酶活性探究实验 | 1.5h | 生化、实验设计 | 实验方案 + 预期结果 |
| 解码一段 DNA 序列 | 1h | 中心法则 | 蛋白质序列 + 功能预测 |
| 评估转基因作物风险 | 2h | 生物伦理、生态 | 利弊分析报告 |
| 建立细胞模型 | 2h | 细胞学 | 3D 模型 + 功能说明 |
| 模拟免疫应答过程 | 1.5h | 免疫学 | 时序图 + 细胞互动 |
| 设计物种保育方案 | 2h | 生态、遗传多样性 | 保育计划书 |

**流程**：
1. 学生选项目 → AI 老师布置任务 + 提供脚手架
2. 学生分步完成（编程沙盒 / 白板 / 文档）
3. AI 同伴评审（v3.0 §2.9）
4. 学生修订
5. AI 二次评审 + 评级
6. 项目归档到 Supabase `pbl_projects` 表

---

### 2.5 白板 + TTS 多模态讲解（Whiteboard + TTS）

**借鉴 OpenMAIC**：AI 老师边画边讲。
**纯前端实现**：浏览器 SpeechSynthesis API + Canvas 白板。

#### 2.5.1 AI 白板（Canvas Whiteboard）

**功能**：
- AI 老师生成绘制指令（LLM 输出 SVG path / Canvas 命令）
- 前端逐步绘制（模拟"手写"动画）
- 学生可擦除 / 标注 / 保存截图
- 内置生物图形库：DNA 双螺旋、细胞膜磷脂双分子层、系谱图符号、生化通路

**示例指令**：
```json
{
  "type": "whiteboard",
  "commands": [
    { "op": "draw_dna_helix", "x": 100, "y": 50, "length": 300 },
    { "op": "label", "text": "5'-磷酸二酯键-3'", "x": 120, "y": 360 },
    { "op": "highlight", "target": "base_pair", "color": "#c4956a" }
  ]
}
```

#### 2.5.2 TTS 语音讲解

**三层 TTS 方案**（纯前端优先）：
| 层级 | 实现 | 质量 | 成本 |
|------|------|------|------|
| L1 基础 | 浏览器 SpeechSynthesis API | 一般（机械感） | 免费、离线 |
| L2 云端 | 用户自配 TTS（智谱/MiniMax/阿里） | 好 | 用户 Key |
| L3 声音克隆 | 可选 VoxCPM2 / 浏览器录音微调 | 优秀 | 需自部署 |

**角色音色**（L1 浏览器内置）：
- 主讲老师：male zh-CN
- 助教：female zh-CN
- 学霸同学：年轻男声
- 困惑同学：年轻女声

**沉浸模式**：
- 全屏课堂视图
- AI 老师头像（SVG 动画，唇形同步 TTS 节奏）
- 键盘快捷键（空格暂停 / ←→ 切换 scene / Q 提问）

---

## 3. 优化后的 12 大模块（v3.0 重组）

### 3.1 自适应学习引擎 → 课堂测验环节
**变更**：从"独立练习"变为"课堂的测验 scene"。AI 老师讲完后自动推送 3 题，根据答题调整下一 scene 难度。

### 3.2 苏格拉底式 AI 导师 → 助教 AI 角色
**变更**：从独立模式变为"助教 AI"角色，在课堂讨论 scene 中苏格拉底式引导。

### 3.3 AI 变式题生成 → 课堂测验题源
**变更**：课堂测验优先用 FSRS 错题变式，而非随机抽题。

### 3.4 协作实验台 → 课堂模拟交互（多人版）
**变更**：作为"模拟交互"scene 的多人模式。

### 3.5 Arena 对战 → 课堂游戏交互
**变更**：新增单人闯关模式（课堂内用），PvP 保留为课后社交。

### 3.6 3D 细胞探索器 → 课堂 3D 交互
**变更**：AI 老师可远程操作 3D 视角（飞入线粒体）。

### 3.7 学习 DNA → 课堂学情追踪
**变更**：每节课结束更新 DNA，课堂内显示"本节掌握度变化"。

### 3.8 Bio RPG → 课堂动机系统
**变更**：完成一节课 = 获得"基因片段" + ATP。

### 3.9 AI 同伴评审 → PBL 项目评审
**变更**：归入 PBL 项目流程（§2.4）。

### 3.10 生物伦理研讨室 → 特殊课堂类型
**变更**：作为"讨论型课堂"的一种模板。

### 3.11 生成式艺术画廊 → 课堂美学奖励
**变更**：完成课堂生成专属艺术作品。

### 3.12 离线 AI → 课堂离线降级
**变更**：离线时课堂降级为"文字版 + 本地 WebLLM 老师"。

---

## 4. 新增"内容生成"能力（借鉴 OpenMAIC 一键生成）

### 4.1 教材 PDF → 课堂

**借鉴 OpenMAIC MinerU**：上传 PDF → 解析 → 生成课堂。
**纯前端实现**：
- PDF.js 提取文本 + 图片
- 视觉 LLM 识别图表（复用 OCR 视觉模型）
- LLM 提取知识点 + 生成课堂大纲
- 关联到知识图谱节点

**场景**：老师上传人教版教材某章节 → 生成 5 节课 → 推送给学生。

### 4.2 错题 → 复习课

**触发**：某知识点错 3 次 → 自动生成"复习课"。
**内容**：
- 错题涉及的图谱子图
- 对应 Canvas 动画重播
- AI 老师针对性讲解
- 3 道变式题（v3.0 §2.3）
- 1 个小项目巩固

### 4.3 自由主题 → 探索课

**输入**：用户输入"我想学 CRISPR"（即使题库没有）。
**生成**：AI 生成一节临时课堂，内容来自 LLM 知识 + 关联知识图谱。标记为 `user_generated: true`，可分享给其他用户。

---

## 5. AI 老师事件总线（核心技术架构）

v3.1 的技术核心是**事件总线**——让 AI 老师能操作任意 UI。

### 5.1 架构

```
AI 老师 LLM 输出（含 [ACTION:...] 标签）
    ↓
解析器（_parseTeacherOutput）
    ↓
EventBus.emit(actionType, params)
    ↓
┌─────────────────────────────────────┐
│ 各模块订阅事件：                     │
│  bio-animation.on('highlight_step') │
│  knowledge-graph.on('highlight_node')│
│  bio-lab.on('run_step')             │
│  whiteboard.on('draw')              │
│  code-sandbox.on('set_code')        │
│  quiz.on('push_question')           │
│  tts.on('speak')                    │
└─────────────────────────────────────┘
```

### 5.2 动作协议

```typescript
type TeacherAction =
  | { type: 'highlight_animation_step'; module: string; step: number }
  | { type: 'highlight_kg_node'; nodeId: string }
  | { type: 'highlight_kg_subgraph'; nodeIds: string[] }
  | { type: 'lab_run_step'; experimentId: string; stepIndex: number }
  | { type: 'lab_set_param'; experimentId: string; param: string; value: number }
  | { type: 'whiteboard_draw'; commands: WhiteboardCommand[] }
  | { type: 'whiteboard_clear' }
  | { type: 'sandbox_set_code'; template: string }
  | { type: 'sandbox_run' }
  | { type: 'quiz_push'; questionIds: string[] }
  | { type: 'tts_speak'; text: string; role: string }
  | { type: 'tts_pause' }
  | { type: 'navigate'; route: string }
  | { type: 'open_3d'; modelId: string; cameraTarget: string[] };
```

### 5.3 LLM Prompt 约束

system prompt 严格约束输出格式：
```
你是一名生物老师，正在讲课。你的输出可以包含：
1. 口述文本（直接讲给学生听，会经 TTS 朗读）
2. 动作指令 [ACTION:type:param]

可用动作类型：
- highlight_animation_step:module:step — 高亮某动画某步
- highlight_kg_node:nodeId — 点亮知识图谱节点
- lab_run_step:experimentId:stepIndex — 演示实验某步
- whiteboard_draw:json — 白板绘图（JSON 命令）
- sandbox_set_code:template — 编程沙盒初始代码
- quiz_push:questionIds — 推送测验题

约束：
- 每段讲解后最多 1 个动作
- 动作必须与当前讲解内容相关
- 禁止 [[ANIM:xxx]] 标签和 SVG 代码块
```

---

## 6. 数据模型扩展（v3.0 基础 + v3.1 新增）

### 6.1 v3.1 新增表

```sql
-- AI 课堂
create table if not exists ai_classrooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  title text not null,
  topic text,                       -- 主题（如"光合作用"）
  source_type text,                 -- kg_node / pdf / error_trigger / free_text
  source_ref text,                  -- 来源引用（节点 id / PDF 文件名 / 错题 id）
  outline jsonb not null,           -- 课堂大纲（6 scenes）
  script jsonb,                     -- AI 老师讲稿（每 scene 的文本+动作）
  status text default 'generated',  -- generated/in_progress/completed
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 课堂进度
create table if not exists classroom_progress (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references ai_classrooms on delete cascade,
  user_id uuid references auth.users,
  current_scene int default 0,
  scene_states jsonb,               -- 每 scene 的状态（答题/实验/代码）
  quiz_results jsonb,
  project_id uuid,                  -- PBL 项目 id
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PBL 项目
create table if not exists pbl_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  project_template_id text,         -- 项目模板 id
  classroom_id uuid,                -- 关联课堂（可选）
  status text default 'in_progress',-- in_progress/submitted/graded
  artifacts jsonb,                  -- 学生产出（代码/文档/图）
  ai_reviews jsonb,                 -- [{round:1, review:'...', grade:'B'}, ...]
  final_grade text,
  created_at timestamptz default now(),
  submitted_at timestamptz
);

-- 思维导图（学生编辑版）
create table if not exists user_mindmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  topic text,
  nodes jsonb not null,             -- 学生编辑后的节点
  edges jsonb not null,
  is_from_classroom boolean default false,
  classroom_id uuid,
  created_at timestamptz default now()
);

-- 编程沙盒作业
create table if not exists code_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  template_id text,                 -- 种群增长/HW/酶动力学...
  code text not null,
  output jsonb,                     -- 运行结果（图/数据）
  ai_feedback text,                 -- AI 助教反馈
  is_correct boolean,
  created_at timestamptz default now()
);

-- 白板快照
create table if not exists whiteboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  classroom_id uuid,
  scene_index int,
  image_data text,                  -- base64 PNG
  commands jsonb,                   -- 绘图命令（可重放）
  created_at timestamptz default now()
);
```

---

## 7. 技术架构扩展

### 7.1 v3.1 新增依赖

| 依赖 | 大小 | 用途 | 加载时机 |
|------|------|------|----------|
| Pyodide | 10MB | Python 沙盒 | `/code-sandbox` 路由，缓存 IndexedDB |
| CodeMirror 6 | 60KB | 代码编辑器 | 同上 |
| Three.js | 600KB | 3D 交互 | `/cell-3d` 或课堂 3D scene |
| yjs | 50KB | 白板离线协同 | 课堂含白板 scene |
| PDF.js | 400KB | PDF 解析 | 上传 PDF 时 |

### 7.2 纯前端 LLM 编排（Per-stage Routing）

```js
// ai-client.js 新增路由配置
const STAGE_MODEL_MAP = {
  classroom_outline:  { provider: 'zhipu',  model: 'glm-4-flash', temperature: 0.7 },
  teacher_script:     { provider: 'zhipu',  model: 'glm-4-flash', temperature: 0.6 },
  variant_question:   { provider: 'deepseek', model: 'deepseek-chat', temperature: 0.3 },
  quick_qa:           { provider: 'qwen',   model: 'qwen-turbo', temperature: 0.5 },
  code_review:        { provider: 'deepseek', model: 'deepseek-chat', temperature: 0.2 },
  whiteboard_cmd:     { provider: 'zhipu',  model: 'glm-4-flash', temperature: 0.2 }
};

async function callByStage(stage, messages) {
  const cfg = STAGE_MODEL_MAP[stage] || STAGE_MODEL_MAP.quick_qa;
  // 自动重试瞬时失败（借鉴 OpenMAIC #788）
  return await withRetry(() => streamChat({ ...cfg, messages }), { maxRetries: 3, backoff: 'exponential' });
}
```

### 7.3 自动重试机制（借鉴 OpenMAIC PR #788）

```js
async function withRetry(fn, { maxRetries = 3, backoff = 'exponential' } = {}) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isTransient = err.status === 429 || err.status >= 500 || err.name === 'NetworkError';
      if (!isTransient || i === maxRetries - 1) throw err;
      const delay = backoff === 'exponential' ? 1000 * Math.pow(2, i) : 1000 * (i + 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

---

## 8. 用户体验升级

### 8.1 课堂播放器 UI

```
┌──────────────────────────────────────────────────────────┐
│ ☰  课堂：光合作用——光反应与暗反应的耦合     [⏸ 暂停] [✕] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   [当前 scene: 3/6 模拟交互]                             │
│                                                          │
│   ┌────────────────────────────────────────────┐         │
│   │                                            │         │
│   │      [虚拟实验室 / Canvas 动画 /           │         │
│   │       3D 视图 / 编程沙盒 / 白板]           │         │
│   │                                            │         │
│   │   ↑ AI 老师高亮区域（脉冲动画）            │         │
│   └────────────────────────────────────────────┘         │
│                                                          │
│   ┌────────────────────────────────────────────┐         │
│   │ 🎤 主讲老师：注意类囊体膜上的光系统 II...  │  ← TTS   │
│   │ 🤔 困惑同学：老师，为什么是光系统 II 在前？ │         │
│   │ 🎓 主讲老师：好问题，因为发现顺序...        │         │
│   └────────────────────────────────────────────┘         │
│                                                          │
│   进度：━━━━━━━━━━━━━━░░░░░░  Scene 3/6                 │
│   [← 上一步]  [💬 提问]  [📝 笔记]  [下一步 →]          │
└──────────────────────────────────────────────────────────┘
```

### 8.2 沉浸模式

- 全屏 + 自动隐藏导航
- AI 老师头像右下角（SVG，TTS 时唇形同步）
- 键盘快捷键：Space 暂停 / ←→ 切换 scene / Q 提问 / N 笔记 / Esc 退出

### 8.3 课堂结束页（借鉴 OpenMAIC）

```
┌────────────────────────────────────────────┐
│  🎉 课堂完成！光合作用——光反应与暗反应     │
├────────────────────────────────────────────┤
│  📊 你的表现：                             │
│    测验：3/3 正确（100%）                  │
│    学习 DNA 更新：T 碱基亮度 +12%          │
│    获得：基因片段「光系统 II」+ 50 ATP     │
│                                            │
│  📝 课后任务：                             │
│    [PBL 项目] 设计实验验证光饱和点         │
│                                            │
│  🔗 分享这节课：                           │
│    [生成分享卡片 with 学习 DNA]            │
│                                            │
│  📚 推荐下一节课：                         │
│    → 卡尔文循环的限速步骤                  │
│    → C4 植物与 CAM 植物的适应性            │
└────────────────────────────────────────────┘
```

---

## 9. 优先级与路线图（v3.1 修订）

### P0（核心课堂体验，4 周）

| 模块 | 理由 |
|------|------|
| §2.1 一键 AI 课堂生成 | v3.1 的核心范式 |
| §2.2.3 AI 老师事件总线 | 技术基石 |
| §2.2 五类交互 UI（3D/模拟/游戏/思维导图/编程） | 对标 OpenMAIC |
| §2.3 多智能体课堂讨论 | 课堂灵魂 |
| §2.5.1 AI 白板 | 多模态讲解 |
| §5 事件总线架构 | 技术底座 |

### P1（深度增强，4 周）

| 模块 | 理由 |
|------|------|
| §2.4 PBL 项目式学习 | 开放式实践 |
| §2.5.2 TTS 三层方案 | 语音讲解 |
| §4.1 PDF → 课堂 | 教师场景 |
| §4.2 错题 → 复习课 | 闭环 |
| §7.2 Per-stage LLM routing | 成本优化 |
| §7.3 自动重试 | 稳定性 |

### P2（生态扩展，4 周）

| 模块 | 理由 |
|------|------|
| §4.3 自由主题探索课 | 长尾需求 |
| §8.2 沉浸模式 + 键盘快捷键 | 体验打磨 |
| 课堂分享与 remix | 社交传播 |
| 教师批量生成课程 | B 端场景 |
| VoxCPM2 声音克隆（可选） | 高级 TTS |

---

## 10. 与 OpenMAIC 的差异化定位

| 维度 | OpenMAIC | BioQuest v3.1 |
|------|----------|---------------|
| 学科 | 通用（任何主题） | **生物专精**（联赛+课标） |
| 定位 | 通用 AI 课堂平台 | 生物备考 + 探索 |
| 题库 | LLM 临时生成 | **结构化题库** 5000+ 题 + FSRS |
| 知识图谱 | 无 | **40 节点图谱** + BKT 追踪 |
| 算法 | 无学情算法 | **IRT + BKT + FSRS** 三引擎 |
| 部署 | Next.js 全栈（需服务端） | **纯前端** + Supabase |
| LLM | 服务端代理 | **前端直连** + 用户自配 Key |
| PWA | 无 | **有**（离线缓存） |
| 生物特色 | 无 | 7 Canvas 动画 + 6 虚拟实验 + 生物 RPG |

**核心差异化**：OpenMAIC 是"通用课堂生成器"，BioQuest 是"生物专精 + 学情算法 + 纯前端"的 AI 课堂。我们不做通用，做深生物。

---

## 11. 风险与缓解

| 风险 | 缓解 |
|------|------|
| Pyodide 10MB 过大 | 首次提示 + 缓存 IndexedDB + 仅 `/code-sandbox` 加载 |
| AI 老师动作指令解析失败 | 严格 JSON schema 校验 + 失败降级为纯文字讲解 |
| 课堂生成质量不稳定 | Per-stage routing（大纲用强模型）+ 用户反馈循环 |
| TTS 浏览器音色机械 | 默认关闭 TTS，用户主动开启；提示 L2 云端 TTS |
| 多智能体讨论成本高 | 限制每课堂 3-5 轮讨论 + 用快模型 |
| 纯前端 LLM 编排复杂度 | 事件总线解耦 + 每个 scene 独立可失败 |
| PDF 解析纯前端能力有限 | PDF.js 文本提取 + 视觉 LLM 图表识别，复杂表格提示用 MinerU |

---

## 12. 评估指标（v3.1 修订）

### 12.1 课堂体验指标

| 指标 | 目标 |
|------|------|
| 课堂完课率 | > 60% |
| 课堂平均时长 | 8-15 分钟 |
| AI 老师动作指令密度 | 2-4 次/scene |
| 多智能体讨论参与率 | > 40% 用户主动提问 |
| PBL 项目提交率 | > 50% |
| 课堂分享率 | > 15% |

### 12.2 学习效果指标

| 指标 | 目标 |
|------|------|
| 课堂后测验正确率 | > 80% |
| 课堂关联知识点掌握度提升 | +15%/课堂 |
| 4 周 IRT θ 值提升 | +0.2 |
| FSRS 复习坚持率（30 天） | > 50% |
| 联赛预测准确度 | ±5 分（95% 置信） |

---

## 13. 待确认事项

1. **Pyodide 许可**：Mozilla Public License，可商用，确认无冲突？
2. **3D 模型来源**：自建低多边形 vs Sketchfab CC vs BioDraw 授权？
3. **TTS 默认开关**：默认开还是关？浏览器音色质量参差。
4. **课堂生成成本**：一节课约消耗多少 token？用户 100 次/天限额够几节课？
5. **PBL 项目评审 AI**：用强模型还是中等模型？评审质量 vs 成本权衡。
6. **事件总线动作协议**：是否开放给用户自定义（高级用户写插件）？
7. **课堂 remix**：用户生成的课堂是否可被他人 remix？版权如何处理？
8. **教师 B 端**：是否做"批量生成课程 + 班级推送"的 B 端功能？

---

## 附录 A：v3.0 → v3.1 变更总览

| 变更类型 | 内容 |
|----------|------|
| **范式升级** | 刷题 App → AI 生物课堂 |
| **新增核心** | 一键课堂生成 + 5 类交互 UI + AI 老师事件总线 + 多智能体讨论 + PBL + 白板 TTS |
| **重组 v3.0** | 12 个创新模块归为课堂的组成部分 |
| **借鉴 OpenMAIC** | 课堂范式、5 类交互、AI 操作 UI、一键生成、白板 TTS、Per-stage routing、自动重试 |
| **坚守定位** | 纯前端 + Supabase + 用户自配 LLM |
| **差异化** | 生物专精 + 结构化题库 + IRT/BKT/FSRS 三引擎 + PWA |

---

## 附录 B：竞品差异化矩阵（含 OpenMAIC）

| 能力 | 普通刷题 | 学而思 | OpenMAIC | BioQuest v3.1 |
|------|----------|--------|----------|---------------|
| AI 课堂生成 | ✗ | ✗ | ✓（通用） | ✓（生物专精） |
| 多智能体讨论 | ✗ | ✗ | ✓ | ✓ |
| AI 操作 UI | ✗ | ✗ | ✓ | ✓ |
| 5 类交互 UI | ✗ | ✗ | ✓ | ✓ |
| 白板 + TTS | ✗ | ✗ | ✓ | ✓ |
| PBL 项目 | ✗ | ✗ | ✓ | ✓ |
| 在线编程 | ✗ | ✗ | ✓（通用） | ✓（生物信息学） |
| 结构化题库 | ✓ | ✓ | ✗ | ✓（5000+） |
| FSRS 间隔重复 | ✗ | ✗ | ✗ | ✓ |
| IRT 自适应 | ✗ | ✓ | ✗ | ✓ |
| BKT 知识追踪 | ✗ | ✗ | ✗ | ✓ |
| 知识图谱 | ✗ | ✗ | ✗ | ✓ |
| 纯前端部署 | ✗ | ✗ | ✗ | ✓ |
| PWA 离线 | ✗ | ✗ | ✗ | ✓ |
| 生物 Canvas 动画 | ✗ | ✗ | ✗ | ✓（7 个） |
| 虚拟生物实验 | ✗ | ✗ | ✗ | ✓（6 个） |

**结论**：BioQuest v3.1 在"AI 课堂"维度对标 OpenMAIC，在"学情算法"和"生物专精"维度超越 OpenMAIC，在"纯前端部署"维度独有优势。

---

## 附录 C：技术可行性（含 OpenMAIC 启发的新模块）

| 模块 | 可行性 | 验证方式 |
|------|--------|----------|
| 一键课堂生成 | ★★★★☆ | 复用 AiClient + 新增 orchestrator |
| AI 老师事件总线 | ★★★★★ | 纯 JS EventBus，无依赖 |
| 多智能体讨论 | ★★★★★ | 复用 discussion.js 框架 |
| 3D 交互 | ★★★☆☆ | Three.js 成熟，模型获取是瓶颈 |
| 在线编程（Pyodide） | ★★★★☆ | Pyodide 成熟，10MB 加载可接受 |
| AI 白板 | ★★★★☆ | Canvas + LLM 绘图指令 |
| TTS 三层 | ★★★★★ | L1 浏览器内置，L2 用户 Key |
| PBL 项目 | ★★★★★ | 状态机 + Supabase |
| PDF → 课堂 | ★★★☆☆ | PDF.js + 视觉 LLM |
| Per-stage routing | ★★★★★ | 配置表 + AiClient |
| 自动重试 | ★★★★★ | 纯 JS |
