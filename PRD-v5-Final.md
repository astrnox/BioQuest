# BioQuest 产品需求文档 v5.0 — 复赛最终版

> 版本 5.0 | 2026-08-04 | 复赛提交版
> 产品定位：纯前端 SPA + Supabase — 每个生物学习者都有一位会思考的 AI 学习伙伴
> 作者：BioQuest 团队 | 赛道：学习工作 + 青少年身心健康（附加赛题）

---

## 目录

1. [产品定位与一句话价值主张](#1-产品定位与一句话价值主张)
2. [竞品分析与差异化](#2-竞品分析与差异化)
3. [用户画像与核心场景](#3-用户画像与核心场景)
4. [四大核心模块设计](#4-四大核心模块设计)
5. [技术架构](#5-技术架构)
6. [数据模型与 Supabase Schema](#6-数据模型与-supabase-schema)
7. [视觉与交互设计规范](#7-视觉与交互设计规范)
8. [实施路线图（20 天窗口）](#8-实施路线图20-天窗口)
9. [风险评估与缓解](#9-风险评估与缓解)
10. [复赛评审对齐](#10-复赛评审对齐)

---

## 1. 产品定位与一句话价值主张

### 1.1 一句话定位

> **BioQuest 是一个面向全体高中生的生物学习平台——从课内同步到竞赛冲刺全覆盖。它教你（AI 课堂）、问你（苏格拉底同学）、懂你（情绪节律）、记得你（学习 DNA），零成本、零服务器、用户自配 AI Key。**

### 1.2 核心约束（不可妥协）

| 约束 | 说明 |
|------|------|
| 纯前端 | 仅 HTML/CSS/JS，无 Node/Python 运行时 |
| 唯一后端 | Supabase（PostgreSQL + Auth + Storage + RLS） |
| AI 直连 | 前端 fetch 6 家 LLM（DeepSeek/智谱/通义/Kimi/NVIDIA/硅基流动），SSE 流式 |
| Key 自配 | 用户在设置填个人 API Key，存 localStorage |
| 静态部署 | GitHub Pages / Vercel，零环境变量 |
| 零成本 | 用户无需付费，Supabase 免费版 500MB + 50000 MAU 足够 |

### 1.3 从初赛到复赛的演进逻辑

```
初赛 Demo（高中生物学习平台）
    │  痛点：课内+竞赛刷题是孤立的，知识不成体系，AI 只答疑不引导
    │  借鉴：OpenMAIC 多智能体课堂范式、DeepTutor 学情追踪
    ↓
v3.1（AI 生物课堂）
    │  批评：12+ 模块范围过大，20 天做不扎实
    │  风险：Pyodide 10MB、3D 模型、WebRTC 均超出窗口
    │  机会：青少年身心健康附加赛题可有机融合
    ↓
v5.0（会思考的生物学习伙伴）
    │  聚焦：4 个深化模块 + 身心健康有机融合
    │  约束：纯前端、零成本、20 天窗口、可体验优先
    │  创新：学习 DNA 双画像、苏格拉底 AI 同学、事件总线 UI 操作
```

### 1.4 v5.0 核心价值主张

> **v3.1**：每个生物概念都有一节为你生成的 AI 课堂
> **v5.0**：每个生物学习者都有一位会思考的 AI 学习伙伴
> ——它教你（AI 课堂）、问你（苏格拉底同学）、懂你（情绪节律）、记得你（学习 DNA）

---

## 2. 竞品分析与差异化

### 2.1 GitHub 顶级开源项目对标

| 项目 | Stars | 核心能力 | BioQuest 借鉴 | BioQuest 差异化 |
|------|-------|---------|-------------|---------------|
| **OpenMAIC** (THU-MAIC) | 5K+ | 多智能体课堂、一键生成课件、白板+TTS、PPT导出 | 多智能体课堂范式、事件总线架构、5 角色→3 角色 | **生物专精**（FSRS/IRT/BKT 三引擎 + 40 节点知识图谱）；**纯前端**（OpenMAIC 是 Next.js 全栈）；**身心健康融合**（OpenMAIC 无此维度） |
| **DeepTutor** (HKUDS) | 16K+ | Agent-native、TutorBots、5 模式共享上下文、Heartbeat 提醒、持久记忆 | 学情追踪（学习 DNA）、TutorBot 人格化、Heartbeat 复习提醒 | 高中生物全阶段覆盖（非通用学习）；**苏格拉底同学**（平等视角 vs DeepTutor 的教师视角）；**情绪节律**（DeepTutor 无身心健康） |
| **AMPLIFY** | 新项目 | Socratic 引擎、进化伙伴系统、RPG 游戏化 | 苏格拉底引导、进化等级系统 | 高中生物领域（非数学）；**知识图谱驱动**（非纯 RPG）；**学习 DNA 可视化** |
| **BioTutor** | Fork | 个性化 AI 导师、10 级深度、5 种沟通风格 | 个性化配置、苏格拉底模式 | 完整平台（非纯 prompt）；**多智能体课堂**（非 1v1）；**FSRS 间隔重复** |
| **Educational Tutor AI** | 新项目 | Student Mastery Graph、多智能体、Socratic/Scaffolded/Direct 三种教学法 | 掌握度图谱（→学习 DNA）、多教学法切换 | 生物专精知识图谱；**纯前端**（非 Python 后端）；**Canvas 动画** |
| **Bloom** | 212 | 苏格拉底 AI 家教、Bloom 2-Sigma 研究、中文优先 | 苏格拉底式引导、自适应教学 | 高中生物全阶段（非通用）；**多智能体课堂**；**FSRS 算法** |
| **BioBloom** | 新项目 | 角色系统、花朵遗传学、AI 聊天助手 | 角色驱动学习、游戏化 | 高中生（非儿童科普）；**IRT/BKT 自适应**；**模考系统** |
| **DNA Explorer 3D** | 新项目 | Three.js DNA 双螺旋 3D 可视化、滚动叙事 | Canvas 动画替代 3D（降低体积） | 2D Canvas 更轻量（600KB vs 0KB 额外依赖）；**知识图谱联动** |
| **genBrowser** | 新项目 | 3D 染色体可视化、CSAA 算法、多组学数据 | 数据可视化思路 | 教育场景（非科研）；**AI 讲解 + 高亮联动** |
| **EduMorph-AI** | 新项目 | Socratic AI、3D 学习环境、Web Speech API、Three.js | 苏格拉底模式、TTS 语音 | 纯前端（非 Flask 后端）；**生物专精** |
| **AI Math Tutor** | 452 commits | Socratic 引导、自适应练习、学习分析仪表盘 | 苏格拉底方法、自适应难度 | 生物学科（非数学）；**FSRS 错题管理**；**情绪节律** |

### 2.2 关键差异化总结

BioQuest v5.0 在以下维度形成独特壁垒：

1. **学科专精 × 全阶段覆盖**：不是通用学习平台，而是深耕高中生物——从课内同步（必修+选择性必修）到竞赛冲刺（72 题 MTF 模考），FSRS 错题管理、IRT 自适应、知识图谱 60+ 节点全覆盖
2. **纯前端 × 零成本**：OpenMAIC/DeepTutor 均需后端部署，BioQuest 是唯一纯前端方案——用户自配 Key，零服务器成本
3. **AI 同学 × 苏格拉底**：不是"AI 教师"而是"AI 同学"——平等视角、4 级提示、共情模式，区别于所有竞品的教师-学生关系
4. **学习 DNA × 情绪 DNA**：双画像并列——学习 DNA 追踪掌握度，情绪 DNA 追踪节律，AI 识别关联模式
5. **身心健康融合**：情绪节律追踪、学习压力指数、AI 共情、危机干预——不是孤立模块，而是渗透到学习全流程的"节律感知"能力

### 2.3 直接竞品定位图

```
                    AI 深度
                      ↑
          OpenMAIC    |    BioQuest v5.0
          (通用课堂)  |    (高中生物全阶段 + 身心健康)
                      |
    ──────────────────┼──────────────────→ 学科专精度
                      |
          Anki        |    学而思/猿辅导
          (通用记忆)  |    (付费直播)
```

---

## 3. 用户画像与核心场景

### 3.1 核心用户画像（覆盖全阶段高中生）

#### 画像 A：李同学（高一，课内同步学习者，主力用户 55%）

- **背景**：16 岁，沿海城市重点中学高一，住校，每周回家一天
- **设备**：学校机房 PC（Chrome）+ 家里旧安卓机
- **生物水平**：课内 80 分左右，刚学完必修一《分子与细胞》，对遗传学感兴趣但减数分裂细节听不懂
- **核心需求**：跟着课标进度走，把课本上的抽象概念"看懂、学会、练会"
- **痛点**：课本静态图看不懂过程（如减数分裂、光合作用光反应）；学校实验室器材老旧，实验做不出效果；不知道自己哪里薄弱，盲目刷题效率低；晚自习 9 点后注意力涣散
- **使用 BioQuest 的场景**：
  - 周日下午回家打开 `bio.dada.im`，先做 15 分钟每日一题（课标同步题）
  - 用 Canvas 动画看一遍减数分裂全过程，AI 老师高亮"交叉互换"步骤
  - 做一组遗传学专项练习，错题自动进入 FSRS 错题本
  - AI 同学苏格拉底式问她"如果交叉互换不发生，子代基因型组合会怎样？"
  - 仪表盘显示她本周正确率周三下午最低，建议周三下午做轻松卡片复习
- **身心健康诉求**：住校压力大，希望 AI 学伴在连续答错时给予鼓励而非压力

#### 画像 B：张同学（高二，竞赛冲刺者 30%）

- **背景**：17 岁，准备 2026 年 8 月全国生物学联赛
- **生物水平**：课内 95+，联赛目标省一
- **核心需求**：高频刷真题、错题复盘、模考模拟、薄弱点精准定位
- **痛点**：联赛新赛制（72 题 MTF）真题难找，市面无免费对齐工具；错题复盘耗时长，AI 解析质量参差；备考压力大，情绪波动明显，但不愿找心理老师
- **使用 BioQuest 的场景**：
  - 每天做一套 72 题模考，限时 150 分钟
  - 错题本 OCR 录入纸质错题，AI 分析错因
  - 学习 DNA 显示他遗传学维度突出但生态学薄弱
  - 情绪节律曲线显示他模考成绩在周二/周四较低，AI 建议调整作息
- **身心健康诉求**：备考焦虑，需要 AI 学伴识别情绪信号并适时减负

#### 画像 C：王老师（中学生物教师 5%）

- **背景**：35 岁，二线城市普通中学高二生物教师，带 2 个班共 80 人
- **核心需求**：个性化指导学生、补充实验演示、高效学情监控
- **痛点**：学生水平参差难以个性化指导；实验课器材不足，无法演示所有考点实验；学情监控靠手动统计，效率低
- **使用 BioQuest 的场景**：教师模式批量生成 8 位用户码加学生；查看班级 DNA 矩阵，一屏看清 80 人强弱分布；用 AI 课堂生成"光合作用"完整课，投屏到教室大屏教学
- **身心健康诉求**：关注学生备考压力，希望工具能减轻而非加重学生负担

#### 画像 D：赵同学（高二，学考过关者 10%）

- **背景**：17 岁，普通中学高二文科倾向，生物是学考科目
- **生物水平**：课内 60-70 分，目标学考及格
- **核心需求**：快速理解核心概念、通过学考
- **使用 BioQuest 的场景**：知识图谱浏览核心概念、AI 课堂快速过一遍重点章节、知识点卡片巩固记忆
- **身心健康诉求**：对生物无兴趣但有考试压力，需要轻松无压力的学习方式

### 3.2 核心场景

| 场景 | 用户流 | 对应模块 | 目标用户 |
|------|--------|---------|---------|
| 课内同步学习 | 选择章节 → 知识卡片预习 → AI 课堂讲解 → 章节练习 → 错题收录 | 模块 1 | 画像 A/D |
| 竞赛冲刺训练 | 首页 → 模考 → 72 题 MTF → 查看解析 → 错题收录 → FSRS 复习 → 薄弱点补强 | 已有功能 | 画像 B |
| 抽象概念可视化 | 搜索"减数分裂"→ Canvas 动画演示 → AI 老师逐步讲解 → 测验巩固 | 模块 1 | 画像 A |
| 苏格拉底深度思考 | 错题遇到困惑 → 打开 AI 同学 → 选择提示等级 → 自己推导答案 | 模块 2 | 画像 A/B |
| 学习画像查看 | 仪表盘 → 学习 DNA + 情绪 DNA → AI 诊断建议 → 分享卡片 | 模块 3 | 全画像 |
| 学考速通 | 知识图谱浏览核心概念 → AI 课堂快速过重点 → 卡片巩固 → 模拟学考 | 模块 1 | 画像 D |
| 情绪健康管理 | 学习前/后弹窗 → 选择表情 → 压力指数更新 → 共情 AI 互动 | 模块 4 | 全画像 |
| 教师学情监控 | 教师模式 → 查看班级 DNA 矩阵 → 课堂投屏 → 群体诊断 | 已有功能 | 画像 C |

---

## 4. 四大核心模块设计

### 4.1 模块 1：AI 生物课堂（AI Biology Classroom）

#### 4.1.1 概述

借鉴 OpenMAIC 的多智能体课堂范式，但聚焦高中生物全阶段（课内同步 + 竞赛拓展），通过事件总线架构让 AI 老师操作 UI（高亮动画、点亮图谱、白板画图）。

**输入方式**（3 种）：
- 知识图谱节点点击 → "生成课堂"（课内同步按章节，竞赛按考点）
- 自由文本输入 → "我想学卡尔文循环的限速步骤"
- 错题触发 → 某知识点错 3 次 → "为这个知识点生成复习课"

#### 4.1.2 课堂结构（4 scene，5-8 分钟）

```yaml
课堂: 光合作用——光反应与暗反应的耦合
scenes:
  - scene_1_import:  # 导入，1 分钟
      type: lecture
      teacher_script: "今天我们来看光合作用。先回忆一下叶绿体的结构..."
      actions:
        - highlight_kg_node: photosynthesis
        - whiteboard_draw: chloroplast_structure
  - scene_2_explain:  # 讲解，3 分钟
      type: animation
      animation_id: photosynthesis
      teacher_script: "注意类囊体膜上的光系统 II。水分子在这里被光解..."
      actions:
        - highlight_animation_step: photosynthesis:3
        - highlight_animation_step: photosynthesis:5
  - scene_3_discuss:  # 讨论，1.5 分钟
      type: discussion
      roles: [teacher, top_student, confused_student]
      topic: "为什么 C4 植物有花环结构？"
  - scene_4_quiz:  # 测验，1.5 分钟
      type: quiz
      question_count: 3
      source: fsrs_weak_nodes
```

#### 4.1.3 多智能体角色（3 角色，借鉴 OpenMAIC 精简）

| 角色 | 人设 | 职责 |
|------|------|------|
| 主讲老师 👩‍🏫 | 严谨的生物学教授，讲解清晰，善于用比喻 | 讲解概念、回答提问、总结讨论 |
| 学霸同学 🎓 | 提前预习的尖子生，会问延伸问题 | 提出深度问题，推动讨论 |
| 困惑同学 😕 | 基础薄弱的学生，会问基础问题 | 代表学生可能没听懂的地方，让老师重新讲 |

#### 4.1.4 LLM 编排（Per-stage Routing，借鉴 DeepTutor 多模型策略）

```javascript
const STAGE_MODEL_MAP = {
  classroom_outline:    { provider: 'zhipu',   model: 'glm-4-flash',     temp: 0.7 },
  teacher_script:       { provider: 'zhipu',   model: 'glm-4-flash',     temp: 0.6 },
  discussion_script:    { provider: 'deepseek', model: 'deepseek-chat',  temp: 0.8 },
  quiz_generation:      { provider: 'deepseek', model: 'deepseek-chat',  temp: 0.3 },
  socratic_response:    { provider: 'zhipu',   model: 'glm-4-flash',     temp: 0.7 },
  empathy_response:     { provider: 'zhipu',   model: 'glm-4-flash',     temp: 0.8 },
  quick_qa:             { provider: 'qwen',    model: 'qwen-turbo',      temp: 0.5 },
  ocr_vision:           { provider: 'zhipu',   model: 'glm-4v',          temp: 0.1 }
};
```

#### 4.1.5 事件总线架构（核心技术创新）

```
AI 老师 LLM 输出（含 [ACTION:...] 标签）
    ↓
解析器（_parseTeacherOutput）
    ↓
EventBus.emit(actionType, params)
    ↓
┌─────────────────────────────────────────────────────┐
│ 各模块订阅：                                         │
│  bio-animation.on('highlight_step')                │
│  knowledge-graph.on('highlight_node')              │
│  whiteboard.on('draw')                             │
│  quiz.on('push_question')                          │
│  tts.on('speak')                                   │
│  classroom-player.on('next_scene')                 │
└─────────────────────────────────────────────────────┘
```

**动作协议**（精简版）：

```typescript
type TeacherAction =
  | { type: 'highlight_animation_step'; module: string; step: number }
  | { type: 'highlight_kg_node'; nodeId: string }
  | { type: 'highlight_kg_subgraph'; nodeIds: string[] }
  | { type: 'whiteboard_draw'; commands: WhiteboardCommand[] }
  | { type: 'whiteboard_clear' }
  | { type: 'quiz_push'; questionIds: string[] }
  | { type: 'tts_speak'; text: string; role: string }
  | { type: 'next_scene' }
  | { type: 'prev_scene' };
```

**失败降级策略**：
- LLM 不输出 `[ACTION:...]` → 纯文字讲解，不操作 UI
- 动作指令格式错误 → 跳过该动作，继续执行
- 目标模块未加载 → 提示"正在加载模块..."，超时降级为文字
- TTS 不可用 → 仅显示文字

#### 4.1.6 课堂播放器 UI

```
┌──────────────────────────────────────────────────────────┐
│ ☰  课堂：光合作用——光反应与暗反应     [⏸ 暂停] [✕]     │
│ 进度：━━━━━━━━━━━░░░░░░░░░  Scene 2/4 讲解中            │
├──────────────────────────────────────────────────────────┤
│   ┌────────────────────────────────────────────┐         │
│   │      [Canvas 动画 / 知识图谱 / 白板]       │         │
│   │   ↑ AI 老师高亮区域（脉冲动画）            │         │
│   └────────────────────────────────────────────┘         │
│   ┌────────────────────────────────────────────┐         │
│   │ 🎤 主讲老师：注意类囊体膜上的光系统 II...  │         │
│   │ 🎓 学霸同学：老师，为什么是光系统 II 在前？│         │
│   │ 😕 困惑同学：什么是光系统？                │         │
│   └────────────────────────────────────────────┘         │
│   [← 上一步]  [💬 提问]  [📝 笔记]  [下一步 →]          │
│   💡 检测到答题速度变慢，已为你放慢讲解节奏              │
└──────────────────────────────────────────────────────────┘
```

#### 4.1.7 沉浸模式

- 全屏 + 自动隐藏导航
- 键盘快捷键：Space 暂停 / ←→ 切换 scene / Q 提问 / N 笔记 / Esc 退出
- AI 老师头像右下角（SVG，TTS 时唇形同步）
- 减弱动效模式（`prefers-reduced-motion`）自动降级

---

### 4.2 模块 2：苏格拉底 AI 同学（Socratic AI Classmate）

#### 4.2.1 设计理念

借鉴 AMPLIFY 的 Socratic Engine 和 Bloom 的苏格拉底式 AI 家教，但将"教师视角"改为"同学视角"——平等、不直接给答案、偶尔会犯错让学生纠正。

| 维度 | AI 导师（初赛）| AI 同学（v5.0）|
|------|-------------|-------------|
| 视角 | 老师（权威）| 同学（平等）|
| 答题方式 | 直接给答案 | 提问引导 |
| 语气 | "答案是..." | "我觉得可能是...你觉得呢？" |
| 关系 | 师生 | 学习伙伴 |
| 适合场景 | 概念学习 | 深度思考、错题讨论 |

#### 4.2.2 4 级提示按钮（核心创新）

```yaml
学生问题: "为什么减数分裂要有交叉互换？"

L1_提问:
  response: "好问题。先想想——如果减数分裂没有交叉互换，同源染色体的子代组合会有什么限制？"
  purpose: 引导学生自己推导

L2_提示:
  response: "提示：如果没有交叉互换，重组率会受限。想想整条染色体上有多少个基因？"
  purpose: 给方向性提示

L3_部分答案:
  response: "部分答案：交叉互换增加遗传多样性。具体机制是同源染色体非姐妹染色单体的片段交换..."
  purpose: 给关键信息但不完整

L4_完整答案:
  response: "完整答案：交叉互换发生在减数第一次分裂前期（四分体时期）..."
  purpose: 兜底，学生实在推不出时给答案
```

#### 4.2.3 共情模式（身心健康融合）

触发条件：
- 学生连续答错 5 题
- 情绪打卡显示"低落"或"疲惫"
- 学习时长超过 2 小时未休息

共情模式对话示例：
```
学生: [连续答错第 5 题]
AI 同学: "看起来今天状态不太好，要不先休息 5 分钟？
         遗传学明天再战。我在这儿等你，不急。
         
         💡 顺便说一句，你已经学了 2 小时了，
         番茄钟建议你起来活动一下，喝点水。"
         
[按钮: 继续 | 休息 5 分钟 | 调整难度]
```

#### 4.2.4 System Prompt 设计

```javascript
const SOCRATIC_SYSTEM_PROMPT = `你是一名高一学生，正在和同学一起学生物。
你的特点：
1. 你不直接给答案，用提问引导同学自己思考
2. 你的语气平等、友好，偶尔会犯小错（让同学纠正你）
3. 你会分享自己的学习心得（"我之前也搞不懂这个，后来发现..."）
4. 你检测到同学连续答错或情绪低落时，主动切换为共情模式

回答规则：
- 默认用 L1 提问方式（不给答案，问引导性问题）
- 同学明确要求"给答案"时，才用 L4 完整答案
- 每段回答不超过 100 字，避免长篇大论
- 禁止 [[ANIM:xxx]] 标签和 SVG 代码块

共情模式触发：
- 同学说"我好累"/"我做不到"/"不想学了" → 共情 + 建议休息
- 同学连续 3 次答错 → "看起来这个知识点有点难，要不换个角度？"

如果检测到自伤/自杀倾向（如"不想活了"/"想死"），立即回复：
"我听到你了，你现在一定很难受。请立即拨打 12320 心理援助热线，
会有专业的人陪你聊聊。你的生命比任何生物题都重要。"
同时触发前端危机干预弹窗。`;
```

#### 4.2.5 多模式切换

| 模式 | 人格 | 擅长领域 |
|------|------|---------|
| 通用同学 | 普通高一学生，友善好奇 | 所有生物学领域 |
| 孟德尔同学 | 遗传学爱好者，喜欢用豌豆举例 | 遗传学、概率计算 |
| 达尔文同学 | 博物学家，喜欢用进化视角思考 | 进化论、生态学 |
| 沃森同学 | 分子生物学迷，喜欢讨论 DNA/RNA | 分子生物学、生物化学 |

---

### 4.3 模块 3：学习 DNA + 情绪节律双画像

#### 4.3.1 学习 DNA

- 32 位 ATGC 碱基序列
- 每位对应一个知识点维度（A=细胞 / T=遗传 / G=生态 / C=生化）
- 碱基亮度 = 该维度掌握度（0-100%）
- 数据来源：BKT 知识追踪 + FSRS 复习状态 + 模考成绩

```javascript
function generateLearningDNA(userStats) {
  const modules = ['cellular', 'genetics', 'ecology', 'biochem'];
  const bases = ['A', 'T', 'G', 'C'];
  let sequence = '';
  
  for (let i = 0; i < 32; i++) {
    const moduleIdx = i % 4;
    const module = modules[moduleIdx];
    const mastery = userStats.moduleStats[module]?.mastery || 0;
    const base = bases[moduleIdx];
    sequence += base;
  }
  
  return {
    sequence,
    completeness: calculateCompleteness(userStats),
    moduleBreakdown: getModuleBreakdown(userStats)
  };
}
```

#### 4.3.2 情绪 DNA（BioQuest 独有）

- 32 位情绪节律序列，每位对应一周中某时段的情绪状态
- 4 种"情绪碱基"：A（专注）/ T（疲惫）/ G（兴奋）/ C（低落）
- 数据来源：每日双次情绪打卡 + 学习行为信号（答题速度、正确率波动）

```javascript
function generateMoodDNA(moodLogs) {
  const slots = 32;
  const moodBases = { focused: 'A', tired: 'T', excited: 'G', down: 'C' };
  let sequence = '';
  
  for (let i = 0; i < slots; i++) {
    const slot = moodLogs[i];
    sequence += slot ? (moodBases[slot.dominantMood] || 'A') : '?';
  }
  
  return { sequence, moodPattern: analyzePattern(sequence) };
}
```

#### 4.3.3 双画像并列 UI

```
┌──────────────────────────────────────────────────────────┐
│  我的学习画像                              [分享卡片]     │
├──────────────────────────────────────────────────────────┤
│  🧬 学习 DNA                          💚 情绪 DNA        │
│  ATGCATGCATGCATGC                     ATGCATGCATGCATGC   │
│  ATGCATGCATGCATGC                     ATGCATGCATGCATGC   │
│  ▓▓░▓░▓▓░▓▓░▓░▓▓░▓▓░                ▓░░▓▓░▓░░▓▓░▓▓░   │
│  （亮度=掌握度）                       （亮度=情绪积极度）│
│                                                          │
│  完整度: 68%                          节律识别: 周三低落  │
│  最弱: 生态学                         建议: 周三下午做   │
│  最强: 遗传学                         轻松卡片复习       │
│                                                          │
│  💡 AI 诊断: 你的遗传学突出但生态学薄弱。情绪节律显示     │
│  周三下午正确率骤降12%，建议把生态学安排在周一/二上午，   │
│  周三下午做卡片复习或休息。                               │
└──────────────────────────────────────────────────────────┘
```

#### 4.3.4 分享卡片

- 自动生成 PNG 分享图（html2canvas）
- 含学习 DNA + 情绪 DNA + 用户名 + 等级 + QR 码
- 可分享到社区/朋友圈

---

### 4.4 模块 4：身心健康融合层

#### 4.4.1 设计原则

**核心原则**：身心健康不是孤立模块，而是渗透到学习全流程的"节律感知"能力。

#### 4.4.2 情绪节律追踪

**入口**：仪表盘顶部常驻"今日情绪"卡片 + 每次学习前/后弹窗提醒

```
┌──────────────────────────────────────┐
│  今天学习前感觉怎么样？              │
│                                      │
│  😄  😊  😐  😕  😢                  │
│  专注  平静  一般  疲惫  低落        │
│                                      │
│  想说点什么？（可选）                │
│  ┌────────────────────────────────┐  │
│  │ 今天有点累，昨晚熬夜了         │  │
│  └────────────────────────────────┘  │
│                                      │
│  [提交]   [稍后再说]                 │
└──────────────────────────────────────┘
```

#### 4.4.3 学习压力指数

```javascript
function calculateStressIndex(userStats, moodLogs) {
  const factors = {
    studyIntensity: normalize(userStats.dailyAvgMinutes, 0, 360),
    accuracyVolatility: normalize(userStats.accuracyStdDev, 0, 0.3),
    pomodoroCompletionRate: 1 - (userStats.pomodoroCompleted / userStats.pomodoroPlanned),
    lowMoodFrequency: countLowMoods(moodLogs, 7) / 14,
    sleepIrregularity: userStats.sleepIrregularity || 0.5
  };
  
  const weights = {
    studyIntensity: 0.2, accuracyVolatility: 0.25,
    pomodoroCompletionRate: 0.15, lowMoodFrequency: 0.3, sleepIrregularity: 0.1
  };
  
  const stressIndex = Object.entries(factors)
    .reduce((sum, [key, value]) => sum + value * weights[key], 0);
  
  return {
    score: Math.round(stressIndex * 100),
    level: stressIndex < 0.3 ? 'low' : stressIndex < 0.6 ? 'moderate' : 'high',
    mainFactor: getMainFactor(factors, weights),
    recommendation: getRecommendation(stressIndex, factors)
  };
}
```

#### 4.4.4 番茄节律优化

```javascript
function recommendStudySlots(moodLogs, studyStats) {
  const slots = [
    { day: 'weekday', period: 'morning', accuracy: 0.85, mood: 4.2 },
    { day: 'weekday', period: 'afternoon', accuracy: 0.72, mood: 3.5 },
    { day: 'weekday', period: 'evening', accuracy: 0.78, mood: 3.8 },
    { day: 'weekend', period: 'morning', accuracy: 0.88, mood: 4.5 },
  ];
  
  slots.sort((a, b) => 
    (b.accuracy * 0.6 + b.mood / 5 * 0.4) - (a.accuracy * 0.6 + a.mood / 5 * 0.4)
  );
  
  return {
    bestSlot: slots[0],
    avoidSlot: slots[slots.length - 1],
    recommendation: `你的最佳学习时段是${slots[0].day}${slots[0].period}，
                     建议把模考安排在这个时段。`
  };
}
```

#### 4.4.5 危机干预通道

```javascript
const CRISIS_KEYWORDS = [
  '不想活了', '想死', '自杀', '了此一生', '结束一切',
  '活不下去', '没有意义', '想消失', '解脱'
];

function triggerCrisisIntervention() {
  showCrisisModal({
    title: '我听到你了',
    content: `你现在一定很难受。请立即拨打心理援助热线，
              会有专业的人陪你聊聊。你的生命比任何生物题都重要。`,
    hotlines: [
      { name: '全国心理援助热线', number: '12320' },
      { name: '北京心理危机研究与干预中心', number: '010-82951332' },
      { name: '生命热线', number: '400-161-9995' }
    ],
    actions: [
      { label: '立即拨打 12320', action: () => location.href = 'tel:12320' },
      { label: '我已安全', action: closeModal }
    ]
  });
}
```

#### 4.4.6 身心健康融合点总览

| 融合点 | 实现方式 | 附加赛题契合度 |
|--------|---------|-------------|
| 情绪节律追踪 | 每日学习前/后双次情绪打卡，存储到 Supabase `mood_logs` | ⭐⭐⭐⭐⭐ |
| 学习压力指数 | 仪表盘卡片，5 因子加权计算，可视化趋势 | ⭐⭐⭐⭐⭐ |
| AI 学伴共情模式 | 苏格拉底 AI 同学检测连续答错/情绪低落，切换共情对话 | ⭐⭐⭐⭐⭐ |
| 番茄节律优化 | AI 基于个人情绪节律推荐最佳学习时段 | ⭐⭐⭐⭐ |
| 危机干预通道 | 检测自伤/自杀关键词 → 12320 热线 + 转介 | ⭐⭐⭐⭐⭐ |
| 学习 DNA + 情绪 DNA | 双画像并列，可视化学习-情绪关联模式 | ⭐⭐⭐⭐ |
| AI 课堂节奏调节 | 课堂中检测学生答题速度变化，动态调整讲解节奏 | ⭐⭐⭐ |

#### 4.4.7 伦理与合规边界

1. **非医疗器械声明**：BioQuest 不是医疗器械，不诊断、不处方、不替代专业心理咨询
2. **数据隐私**：情绪数据存储在用户 Supabase 个人 schema（RLS 保护），不上传到任何第三方
3. **危机干预责任**：检测到自伤关键词必须立即弹出 12320 热线，但不尝试 AI 自杀干预
4. **未成年人保护**：考虑到核心用户含 16-18 岁高中生，情绪数据不得用于商业推荐
5. **AI 共情的度**：AI 学伴不假装是真人，不建立"虚拟亲密关系"，明确告知"我是 AI 学伴，不是心理咨询师"

---

## 5. 技术架构

### 5.1 整体架构（纯前端约束不变）

```
浏览器
  ├── 静态资源（HTML/CSS/JS/fonts/data/）
  │   └── Service Worker（PWA 离线缓存）
  ├── Supabase JS SDK
  │   ├── Auth（邮箱/OAuth）
  │   ├── Postgres（14+ 张表，RLS 保护）
  │   ├── Storage（图片/分享卡片）
  │   └── Realtime（社区通知，可选）
  ├── AI 直连（fetch SSE → 6 家 LLM）
  │   ├── Per-stage Routing（按场景路由模型）
  │   ├── 自动重试（瞬时失败，借鉴 OpenMAIC PR #788）
  │   └── 视觉 OCR（GLM-4V / Qwen-VL）
  ├── OCR 双引擎
  │   ├── 视觉模型优先（已配置 Key 时）
  │   └── Tesseract.js WASM 兜底
  ├── 事件总线（EventBus，纯 JS）
  │   ├── AI 老师动作指令解析
  │   └── 各模块订阅（动画/图谱/白板/测验/TTS）
  ├── TTS（浏览器 SpeechSynthesis API）
  ├── Canvas（生物动画 + 白板）
  ├── p5.js（首页粒子动画，defer）
  └── KaTeX（公式渲染）

无 Node/Python 运行时
```

### 5.2 自动重试机制（借鉴 OpenMAIC PR #788）

```javascript
async function withRetry(fn, { maxRetries = 3, backoff = 'exponential' } = {}) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isTransient = err.status === 429 || err.status >= 500 || err.name === 'NetworkError';
      if (!isTransient || i === maxRetries - 1) throw err;
      const delay = backoff === 'exponential'
        ? 1000 * Math.pow(2, i) : 1000 * (i + 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

### 5.3 性能约束

| 指标 | 要求 | 验证方式 |
|------|------|---------|
| 首屏 LCP | < 2.5s（普通笔记本 + 4G）| Lighthouse 移动端审计 |
| 课堂大纲生成 | < 8s | 前端计时 |
| Canvas 动画 | ≥ 60fps | Chrome DevTools Performance |
| AI 首 token | < 2s | SSE 监听 |
| 事件总线动作延迟 | < 100ms | 性能 API |
| TTS 启动 | < 500ms | SpeechSynthesis API |
| 单页 JS 体积 | < 200KB gzip | 路由级代码分割 |

### 5.4 可访问性（WCAG 2.1 AA）

| 项 | 要求 |
|----|------|
| 对比度 | 正常文字 ≥ 4.5:1，大文字/UI ≥ 3:1 |
| 键盘导航 | 所有可交互元素 Tab 可聚焦 |
| 模态焦点陷阱 | 课堂播放器、危机干预弹窗必须焦点锁定 |
| aria-live | AI 流式输出 `aria-live="polite"` |
| 减弱动效 | `@media (prefers-reduced-motion: reduce)` 全局生效 |
| skip-link | 全站保留「跳到主要内容」 |

---

## 6. 数据模型与 Supabase Schema

### 6.1 v5.0 新增表

```sql
-- 1. AI 课堂
create table if not exists ai_classrooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  title text not null,
  topic text,
  source_type text,                 -- kg_node / free_text / error_trigger
  source_ref text,
  outline jsonb not null,           -- 4 scene 大纲
  status text default 'generated',  -- generated/in_progress/completed
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 2. 课堂进度
create table if not exists classroom_progress (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid references ai_classrooms on delete cascade,
  user_id uuid references auth.users,
  current_scene int default 0,
  scene_states jsonb,
  quiz_results jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. 情绪日志（身心健康核心表）
create table if not exists mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  mood_level int not null,          -- 1-5
  mood_label text,                  -- focused/calm/neutral/tired/down
  note text,
  session_type text,                -- pre_study/post_study
  learning_session_id uuid,
  created_at timestamptz default now()
);

-- 4. 学习压力记录
create table if not exists stress_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  stress_score int not null,        -- 0-100
  stress_level text,                -- low/moderate/high
  main_factor text,
  factors jsonb,
  recommendation text,
  recorded_at timestamptz default now()
);

-- 5. 学习 DNA 快照
create table if not exists learning_dna_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  learning_sequence char(32),       -- ATGC 32 位
  mood_sequence char(32),           -- 情绪 32 位
  learning_completeness float,
  mood_pattern text,
  snapshot_at timestamptz default now()
);

-- 6. 苏格拉底对话（扩展 ai_conversations）
alter table ai_conversations add column if not exists mode text default 'general';
-- mode: general / socratic / empathy / classmate_mendel / classmate_darwin / classmate_watson

-- 7. 危机事件日志（仅用于产品改进，不外泄）
create table if not exists crisis_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  trigger_keyword text,
  trigger_source text,              -- tutor / discussion / classroom
  intervention_shown boolean default true,
  user_action text,                 -- called_hotline / closed / continued
  created_at timestamptz default now()
);
```

### 6.2 RLS 策略（统一模式）

```sql
-- 所有用户表统一策略：用户只能访问自己的数据
alter table mood_logs enable row level security;
create policy "users own mood logs" on mood_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table stress_records enable row level security;
create policy "users own stress records" on stress_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table learning_dna_snapshots enable row level security;
create policy "users own dna snapshots" on learning_dna_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table crisis_events enable row level security;
create policy "users own crisis events" on crisis_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table ai_classrooms enable row level security;
create policy "users own classrooms" on ai_classrooms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table classroom_progress enable row level security;
create policy "users own progress" on classroom_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 6.3 数据治理

| 任务 | 优先级 | 验收 |
|------|--------|------|
| 清洗 `quiz_auto_generated.json` 选项污染 | P0 | 846 题全量校验 |
| 补全 `crawled_competition.json` 缺失解析 | P1 | 750 题全量有解析 |
| 知识图谱扩展到 60+ 节点 | P1 | 覆盖联赛全部考点 |
| 题库元数据统一（source/year/difficulty/knowledge）| P0 | 全表元数据完整率 100% |
| 引入题库版本号 `data/_version.json` | P0 | 每次更新记录版本 |

---

## 7. 视觉与交互设计规范

### 7.1 设计 Token

```css
:root {
  --color-primary: #4a7c59;
  --color-warm: #c4956a;
  --color-deep: #1a3a2a;
  --color-cream: #faf7f2;
  --color-mood-focused: #5b8a72;
  --color-mood-calm: #a8c4a2;
  --color-mood-neutral: #d4c5a9;
  --color-mood-tired: #c4956a;
  --color-mood-down: #8b6f5c;
  --color-crisis: #c44d3d;
  --space-xs/sm/md/lg/xl/2xl/3xl: 4/8/16/24/32/48/64px;
  --radius-sm/md/lg/full: 6/12/20/9999px;
}
```

### 7.2 字体规范

- 主字体：LXGW WenKai（霞鹜文楷，本地加载）
- 等宽字体：JetBrains Mono（代码/数据）
- 字号：12/14/16/18/20/24/32/40/48/56/64/72/80px

### 7.3 微交互规范

| 场景 | 微交互 |
|------|--------|
| 答对题 | 细胞分裂动画（一分为二）+ 柔和音效 |
| 答错题 | DNA 链短暂抖动 + 温和提示 |
| 连续答对 5 题 | 进化光环（角色周围发光）|
| 掌握知识点 | 基因片段落入"基因库"动画 |
| 完成课堂 | 学习 DNA 重新生成动画 |
| 情绪低落 | UI 色调自动变暖，按钮变大更易点 |
| 危机触发 | 全屏静止 1 秒，再显示干预弹窗 |

### 7.4 响应式断点

| 断点 | 值 | 适配 |
|------|-----|------|
| `--breakpoint-sm` | 640px | 大屏手机 |
| `--breakpoint-md` | 768px | 平板竖屏 |
| `--breakpoint-lg` | 1024px | 平板横屏/小笔记本 |
| `--breakpoint-xl` | 1200px | 桌面端 |

移动端底部 Tab Bar 5 项：首页/练习/课堂/仪表盘/我的。

---

## 8. 实施路线图（20 天窗口）

### 8.1 整体时间线

```
Day 1-3:   核心功能跑通（事件总线 + 课堂引擎 + 课堂播放器）
Day 4-7:   多智能体讨论 + TTS + 沉浸模式
Day 8-10:  苏格拉底 AI 同学（4 级提示 + 共情模式 + 多模式）
Day 11-12: 学习 DNA + 情绪 DNA（双画像 + 分享卡片 + AI 诊断）
Day 13-15: 身心健康融合（情绪打卡 + 压力指数 + 番茄节律 + 危机干预）
Day 16-17: 测试与修复（端到端 + 性能 + 可访问性 + 移动端）
Day 18-19: 文档与视频（社区帖 + 演示视频 + 截图 + Session ID）
Day 20:    缓冲与提交
```

### 8.2 任务依赖图

```
事件总线 ──→ 课堂引擎 ──→ 课堂播放器 ──→ 多智能体讨论
    │           │              │
    │           ↓              ↓
    │      Per-stage routing  TTS
    │
    ↓
苏格拉底同学 ──→ 共情模式 ──→ 危机干预
    │
    ↓
学习 DNA ──→ 情绪 DNA ──→ 双画像 UI
                          │
                          ↓
                    情绪打卡 ──→ 压力指数 ──→ 节律优化
```

### 8.3 风险缓冲

| 风险 | 缓冲措施 |
|------|---------|
| LLM API 不稳定 | 多 provider 切换 + 自动重试 |
| 模块未完成 | 按优先级砍 P2，保 P0（情绪打卡 + 压力指数 + 共情 + 危机干预四件套） |
| Supabase 限额 | 免费版 500MB 存储 + 50000 MAU，足够 |
| 部署失败 | 沿用 `bio.dada.im`，已验证可用 |

---

## 9. 风险评估与缓解

### 9.1 战略层风险

#### 风险 1：v5.0 范围仍然过大，20 天做不完

**缓解**：
- 核心功能 Day 7 前跑通，剩余 13 天深化
- 兜底：若时间不够，砍模块 4 的"番茄节律优化"和"情绪 DNA"，保留"情绪打卡 + 压力指数 + 共情 + 危机干预"四件套
- 事件总线为核心依赖，Day 2 必须完成

#### 风险 2：AI 老师操作 UI 被评审认为是 OpenMAIC 的复制

**缓解**：
- 文档与产品中突出三点差异：
  1. **生物专精**：OpenMAIC 是通用课堂，BioQuest 是高中生物全阶段覆盖（FSRS/IRT/BKT 三引擎 + 60+ 节点知识图谱，从课内同步到竞赛冲刺）
  2. **纯前端**：OpenMAIC 是 Next.js 全栈，BioQuest 是纯前端（用户自配 Key，零服务器）
  3. **身心健康融合**：OpenMAIC 无身心健康维度，BioQuest 独有情绪节律 + 共情 AI

#### 风险 3：情绪节律可能被批为"伪科学"

**缓解**：
- 算法基于公开研究（学习负荷理论 Sweller 1988、心率变异性的情绪关联等）
- 明确标注"启发式估算，非临床诊断"
- 不给出医疗建议，只给学习节奏建议
- 文档中列出参考文献

#### 风险 4：AI 老师操作 UI 在 LLM 输出不稳定时如何降级

**缓解**：
- 严格 system prompt 约束 + JSON schema 校验
- 失败降级为纯文字讲解（不崩）
- 提供"动作预览"
- Session ID 中保留失败案例，证明降级路径有效

#### 风险 5：身心健康附加赛题评审觉得"挂羊头"

**缓解**：
- 文档中专设论证身心健康与生物学习的内在关联
- 产品中让身心健康功能"看得见、用得上、有数据"
- 在复赛帖与问卷中明确标注"参加青少年身心健康附加赛题"

### 9.2 技术层风险

| 风险 | 严重度 | 缓解 |
|------|--------|------|
| LLM 不输出 `[ACTION:...]` | P0 | 纯文字降级，保单课可听 |
| 事件总线动作延迟 > 100ms | P1 | 动作队列 + 异步执行 |
| TTS 语音角色不区分 | P2 | 仅做 L1 浏览器 TTS，不做声音克隆 |
| Canvas 动画性能 < 60fps | P1 | 降低分辨率、减少粒子数 |
| 多智能体对话 token 消耗大 | P1 | 限制每轮 100 字，控制讨论轮数 |

---

## 10. 复赛评审对齐

### 10.1 评审维度自评

| 评审维度 | BioQuest v5.0 得分点 |
|---------|-------------------|
| **创新性** | 苏格拉底 AI 同学（平等视角 + 4 级提示）；学习 DNA + 情绪 DNA 双画像；事件总线 AI 操作 UI；身心健康有机融合（不是独立模块） |
| **技术实现** | 纯前端 SPA + 6 家 LLM Per-stage Routing + 自动重试；事件总线架构；FSRS/IRT/BKT 三引擎；Canvas 动画 + 白板；PWA 离线 |
| **用户体验** | 沉浸式课堂播放器；4 级提示按钮；情绪打卡 5 级表情；双画像可视化；分享卡片；键盘快捷键；WCAG 2.1 AA 可访问性 |
| **社会价值** | 零成本（用户自配 Key）；开源（GitHub 可审查）；身心健康关怀（危机干预 + 12320）；教育公平（纯前端，低端设备可用）；全阶段覆盖（课内同步→学考→竞赛，一位高中生从高一用到高三） |
| **完成度** | 初赛已验证 19 个模块；复赛 4 个深化模块 + 身心健康融合；20 天窗口可交付 |

### 10.2 与初赛的延续性

复赛要求"延续初赛方向"。BioQuest v5.0 的延续性：

1. **定位延续**：始终是"高中生物学习平台"，覆盖课内同步到竞赛冲刺全阶段，未偏离赛道
2. **技术栈延续**：纯前端 + Supabase，未引入后端
3. **功能延续**：保留初赛全部 19 个模块（练习/模考/错题/卡片/实验室/动画/图谱/社区等），在此基础上新增 4 个深化模块
4. **用户群延续**：同一批高中生用户，新增身心健康维度响应用户真实需求

### 10.3 提交材料清单

| 材料 | 要求 | 状态 |
|------|------|------|
| 复赛社区帖 | 包含项目介绍、在线体验链接、演示视频、截图 | 待写 |
| 在线体验链接 | `bio.dada.im`（或新部署地址） | 已有 |
| 演示视频 | 1-5 分钟，展示核心功能 | 待录制 |
| 开发截图 | ≥ 3 张，关键步骤 | 待截图 |
| Session ID | ≥ 3 个，记录开发过程 | 待整理 |
| 飞书问卷 | 体验入口 + 组队信息 | 待填写 |

---

## 附录 A：参考文献

1. Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science*, 12(2), 257-285.
2. Bloom, B. S. (1984). The 2 Sigma Problem: The Search for Methods of Group Instruction as Effective as One-to-One Tutoring. *Educational Researcher*, 13(6), 4-16.
3. Van der Linden, W. J., & Hambleton, R. K. (1997). *Handbook of Modern Item Response Theory*. Springer.
4. Corbett, A. T., & Anderson, J. R. (1995). Knowledge tracing: Modeling the acquisition of procedural knowledge. *User Modeling and User-Adapted Interaction*, 4(4), 253-278.
5. Wozniak, P. A., & Gorzelanczyk, E. J. (1994). Optimization of repetition spacing in the practice of learning. *Acta Neurobiologiae Experimentalis*, 54(1), 59-62.
6. OpenMAIC (2026). THU-MAIC/OpenMAIC: Open Multi-Agent Interactive Classroom. GitHub. https://github.com/THU-MAIC/OpenMAIC
7. DeepTutor (2026). HKUDS/DeepTutor: Agent-Native Personalized Learning Assistant. GitHub. https://github.com/HKUDS/DeepTutor
8. AMPLIFY (2026). mridula-lab/AMPLIFY: The Socratic Wizarding Quest. GitHub. https://github.com/mridula-lab/AMPLIFY

---

## 附录 B：v3.1 → v5.0 模块取舍表

| v3.1 模块 | v5.0 决策 | 理由 |
|-----------|----------|------|
| §2.1 一键 AI 课堂生成 | ✅ 保留并深化 | 核心范式，已有 classroom.js 雏形 |
| §2.2.1 3D 细胞探索器 | ❌ 砍掉 | Three.js 600KB + 模型获取是瓶颈 |
| §2.2.2 思维导图升级 | ⚠️ 降级 | 保留知识图谱 AI 点亮，不做可编辑 |
| §2.2.3 AI 老师事件总线 | ✅ 保留并深化 | 技术核心，已有 event-bus.js |
| §2.3 多智能体课堂讨论 | ✅ 保留但简化 | 5 角色→3 角色 |
| §2.4 PBL 项目式学习 | ❌ 砍掉 | 10 个项目设计成本高 |
| §2.5.1 AI 白板 | ✅ 保留并深化 | 已有 whiteboard.js |
| §2.5.2 TTS 三层方案 | ⚠️ 降级 | 仅做 L1 浏览器 TTS |
| §4.1 PDF → 课堂 | ❌ 砍掉 | PDF.js + 视觉 LLM 解析复杂 |
| §4.2 错题 → 复习课 | ✅ 保留 | 复用课堂引擎 |
| v3.0 §2.1 自适应学习引擎 | ✅ 保留 | 已有 irt-engine.js |
| v3.0 §2.2 苏格拉底导师 | ✅ 升级 | 改造为"苏格拉底 AI 同学" |
| v3.0 §2.3 AI 变式题 | ✅ 保留 | 复用 ai-client.js |
| v3.0 §2.4 协作实验台 | ❌ 砍掉 | WebRTC 调试复杂 |
| v3.0 §2.5 Arena 对战 | ❌ 砍掉 | 实时匹配冷启动难 |
| v3.0 §2.7 学习 DNA | ✅ 保留并深化 | 新增情绪 DNA 并列 |
| v3.0 §2.8 Bio RPG | ⚠️ 降级 | 保留等级系统，不做形态进化 |
| **新增**：情绪节律追踪 | ✅ 核心 | 身心健康附加赛题 |
| **新增**：学习压力指数 | ✅ 核心 | 身心健康附加赛题 |
| **新增**：AI 学伴共情模式 | ✅ 核心 | 身心健康附加赛题 |
| **新增**：危机干预通道 | ✅ 核心 | 身心健康附加赛题 |

---

> **文档版本**：v5.0 Final
> **最后更新**：2026-08-04
> **下一里程碑**：复赛提交