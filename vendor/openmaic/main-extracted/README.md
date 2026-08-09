# OpenMAIC main-extracted（BioQuest 移植版）

> **移植声明**：本目录代码**完全重写**为纯 JavaScript，与原版 OpenMAIC（Next.js + React + shadcn + 21 个依赖）仅有**架构/范式借鉴**，无任何代码复用。
> 原项目地址：https://github.com/项目地址（如开源后附）
> 许可证：MIT

## 为什么需要"移植"而不是"搬运"

`openmaic-main/` 是 Next.js 14 + React 18 + TypeScript + shadcn/ui + motion + lucide 的 656 文件 / 74MB 仓库。BioQuest 硬约束是**纯前端静态 HTML + Supabase**，零 npm 依赖。两者架构完全不兼容。

移植策略：**保留范式（数据模型 + 交互逻辑），重写实现（DOM/CSS/JS）**。

## 目录结构

```
vendor/openmaic/
├── README.md                              ← 本目录总览
├── openmaic-dsl.js                        ← v3.2: Slide/Action/Stage DSL
├── openmaic-renderer.js                   ← v3.2: 11 种元素 Canvas 渲染器
├── openmaic-actions.js                    ← v3.2: 21 种 Action 执行器
└── main-extracted/                        ← v3.3: 完整移植（本次）
    ├── openmaic-visualizers.js            ← 6 步可视化动画
    ├── openmaic-generation-progress.js    ← 生成进度页面
    ├── openmaic-classroom-runner.js       ← 课堂编排 Runner
    └── README.md                          ← 本文件
```

## v3.3 新增：6 步生成范式

| # | step id | 移植自 openmaic | BioQuest 实现 |
|---|---------|------------------|----------------|
| 1 | `pdf-analysis`     | PdfScanVisualizer      | 激光扫描 + 文字骨架 |
| 2 | `web-search`       | WebSearchVisualizer    | 搜索结果高亮 + 源数 badge |
| 3 | `outline`          | StreamingOutlineVisualizer | 流式大纲卡片（实际接入 BioQuest 大纲生成） |
| 4 | `agent-generation` | AgentGenerationVisualizer | 3 张浮动卡（接入 MultiAgent 5 角色） |
| 5 | `slide-content`    | ContentVisualizer      | SLIDE/QUIZ/PBL/WEB 4 类型轮播 |
| 6 | `actions`          | ActionsVisualizer      | 5 步动作时间线（接入 OpenMAIC DSL Actions） |

## 移植差异表

| 维度 | 原 OpenMAIC | BioQuest 移植 |
|------|-------------|----------------|
| 框架 | Next.js 14 + React 18 | 零依赖纯 JS |
| 动画 | motion/react | requestAnimationFrame + CSS |
| 图标 | lucide-react | 内联 SVG unicode |
| 状态 | zustand | 模块内闭包 + WeakMap |
| 持久化 | IndexedDB | 内存（靠 BioQuest Supabase） |
| 渲染 | JSX | DOM API + innerHTML |
| 路由 | Next.js Router | 触发 BioQuest `#/classroom` |
| 教学场景 | 通用课件 | **生物课专精**（光合/呼吸/遗传...） |

## 暴露的 API

```js
// 1. 单步可视化动画
window.OpenMAICVisualizers.createStepVisualizer('pdf-analysis', { sources: [...] });

// 2. 完整生成进度页
window.OpenMAICGenProgress.open({
  topic: '光合作用',
  hooks: { onStepStart, onStepEnd },
  onComplete: (result) => { /* 进入课堂 */ }
});

// 3. 课堂 Runner（最常用）
window.OpenMAICClassroomRunner.startFromEntry({
  topic: '光合作用',
  onClassroomReady: () => { /* 自动打开 BioQuest 课堂 */ }
});
```

## 零成本原则

- **平台零成本**：纯静态文件，部署到 GitHub Pages / Netlify / Vercel 静态托管 0 元
- **用户零成本**：浏览器原生 SpeechSynthesis 免费 TTS，无需订阅第三方
- **开发零成本**：0 npm 依赖，0 构建步骤，直接 Edit + 刷新即可调试

## 复用 BioQuest 已有能力

| 原 OpenMAIC 模块 | BioQuest 替代 | 文件 |
|------------------|----------------|------|
| useSceneGenerator (Zustand) | Classroom orchestrator | `js/classroom.js` |
| Stage component | ClassroomPlayer | `js/classroom-player.js` |
| Whiteboard canvas | BioQuest Whiteboard | `js/whiteboard.js` |
| Agent orchestration | MultiAgent 5 角色 | `js/multi-agent.js` |
| TTS (ElevenLabs) | 浏览器 SpeechSynthesis | `js/tts.js` |
| EventBus (Zustand) | EventBus | `js/event-bus.js` |
| SceneOutline (IndexedDB) | 内存 + Supabase | （运行时） |

## 任务清单

- [x] 6 步可视化动画（visualizers.js）
- [x] 生成进度页面（generation-progress.js）
- [x] 课堂 Runner（classroom-runner.js）
- [x] 课堂入口集成新模式
- [x] index.html 加载新脚本
- [ ] Action 5 步时间线接入真实 LLM Actions（待 v3.4）
- [ ] 多模态内容生成（图片/视频/音频）—— 待 v3.4
- [ ] 课堂历史 IndexedDB 持久化 —— 暂不需要，Supabase 已够用
