# OpenMAIC 移植到 BioQuest

本目录封装了清华大学 OpenMAIC 项目的核心 lib/ 代码到 BioQuest 纯前端架构。

## 原始项目

- 仓库：https://github.com/THU-MAIC/OpenMAIC
- 许可证：MIT License（OpenMAIC 全部代码均为 MIT）
- 原始项目：Next.js + React + TypeScript 架构

## 移植策略

OpenMAIC 的 lib/ 包含 26 个子目录。本目录将所有**可纯前端化**的模块用 0 依赖的纯 JavaScript 重写，去除 TypeScript 类型与 React 状态管理依赖，封装为 window 全局对象。

| 原 lib/ 子目录 | 移植目标 | 状态 |
|---|---|---|
| `lib/utils/emitter.ts` (mitt) | `openmaic-emitter.js` | 完成 |
| `lib/utils/cn.ts` (clsx+twMerge) | `openmaic-cn.js` | 完成 |
| `lib/utils/geometry.ts` | `openmaic-geometry.js` | 完成 |
| `lib/utils/element.ts` + `element-fingerprint.ts` | `openmaic-element.js` | 完成 |
| `lib/types/action.ts` | `openmaic-actions-types.js` | 完成 |
| `lib/types/chat.ts` 等 12 个 | `openmaic-types.js` (JSDoc + 守卫) | 完成 |
| `lib/constants/agent-defaults.ts` | `openmaic-constants.js` | 完成 |
| `lib/generation/json-repair.ts` | `openmaic-json-repair.js` | 完成 |
| `lib/generation/action-parser.ts` | `openmaic-action-parser.js` | 完成 |
| `lib/store/*.ts` (9 个 zustand store) | `openmaic-store.js` + 4 个 store 文件 | 完成 |
| `lib/playback/engine.ts` | `openmaic-playback.js` | 完成 |
| `lib/playback/derived-state.ts` | `openmaic-derived-state.js` | 完成 |
| `lib/action/engine.ts` | `openmaic-action-engine.js` | 完成 |
| `lib/buffer/stream-buffer.ts` | `openmaic-stream-buffer.js` | 完成 |
| `lib/chat/agent-loop.ts` | `openmaic-agent-loop.js` | 完成 |
| `lib/audio/browser-tts-preview.ts` | `openmaic-browser-tts.js` | 完成 |

### 跳过（与后端/编辑器耦合）

- `lib/api/`, `lib/server/`, `lib/ai/llm.ts`, `lib/ai/providers.ts` — 后端 LLM 代理
- `lib/storage/`, `lib/pdf/`, `lib/media/adapters/` — 服务端存储
- `lib/pbl/mcp/`, `lib/prosemirror/` — 富文本编辑器
- `lib/chat/action-translations.ts` — 强耦合 React
- `lib/audio/constants.ts` (TTS/ASR provider registry) — BioQuest 用浏览器原生 TTS
- `lib/constants/generation.ts` — PDF/视觉常量
- `lib/settings.ts` — BioQuest 已有更精简的 settings

## 设计原则

1. **零依赖**：不引入 React、Zustand、Mitt、KaTeX、Nanoid、jsonrepair、tinycolor、clsx 等所有原项目依赖
2. **纯静态可部署**：所有 .js 通过 `<script src=>` 直接挂载，无需打包
3. **统一入口**：所有模块挂载到 `window.OpenMAICXxx`，与 BioQuest 现有模块（`window.Whiteboard` 等）解耦
4. **可降级**：缺失的全局 API 调用会被 try/catch 或可选链吞掉，不导致崩溃
5. **MIT 兼容**：本目录代码 MIT 协议，与原项目协议一致

## 文件清单（v3.4 全量 lib/ 移植）

### utils/ 工具（5 个文件）
- **`openmaic-emitter.js`** (~80 行) — 替换 `mitt`，提供 `Emitter` 类 + 全局单例 `OpenMAICEmitterGlobal`
- **`openmaic-cn.js`** (~52 行) — 替换 `clsx + tailwind-merge`，提供 `cn()` / `clsx()`
- **`openmaic-geometry.js`** (~145 行) — 元素几何/视口/最近角/distance/旋转 rect 等
- **`openmaic-element.js`** (~190 行) — 元素 range/路径/ID map/fingerprint 等
- **`openmaic-json-repair.js`** (~170 行) — 替换 `jsonrepair`，4 级回退：直接解析 → LaTeX 转义修复 → 轻量 JSON 修复 → 控制字符清理

### types/ 类型（1 个文件 + JSDoc 注释）
- **`openmaic-types.js`** (~148 行) — 汇总 chat/action/directorState/lectureNote 等 JSDoc 类型 + 守卫函数（isFireAndForget/isSlideOnly/isSync/filterByAllowed）

### constants/ 常量
- **`openmaic-constants.js`** (~71 行) — 12 色循环调色板 + 10 个默认头像路径 + `pickColor`/`pickAvatar` 工具

### generation/ 生成（2 个文件）
- **`openmaic-actions-types.js`** (~177 行) — 18 种 action 类型 + 工厂 `make(type, params)` + 守卫（isFireAndForget/isSlideOnly/isSync/...） + filterSlideOnly/filterByAllowed
- **`openmaic-action-parser.js`** (~110 行) — 解析 LLM 输出中的 action 块（支持新格式 name/params 与旧格式 tool_name/parameters）

### store/ 状态（5 个文件）
- **`openmaic-store.js`** (~83 行) — 轻量 zustand 替代（getState/setState/subscribe/createSelectors）
- **`openmaic-stage-store.js`** (~181 行) — 替换 `lib/store/stage.ts`：stage / scenes / currentSceneId / chats / mode / outlines + localStorage 持久化
- **`openmaic-canvas-store.js`** (~170 行) — 替换 `lib/store/canvas.ts`：选择 / 视口 / 标尺网格 / 工具栏 / 聚光 / 激光 / 缩放 / 视频
- **`openmaic-whiteboard-history-store.js`** (~51 行) — 替换 `lib/store/whiteboard-history.ts`：基于 elementFingerprint 的 undo/redo

### playback/ 播放
- **`openmaic-playback.js`** (~488 行) — 替换 `lib/playback/engine.ts`：状态机 idle/playing/paused/live + TTS 句级切片（避免 Chrome ~15s 截断）+ 阅读时间估算（CJK 150ms/字，EN 240ms/词）+ snapshot 保存恢复
- **`openmaic-derived-state.js`** (~118 行) — 替换 `lib/playback/derived-state.ts`：纯函数 `computeView(raw)` 返回 8 相位 / 4 按钮态

### action/ 执行
- **`openmaic-action-engine.js`** (~309 行) — 替换 `lib/action/engine.ts`：18 种 action 执行器，桥接 BioQuest `window.Whiteboard.executeCommands`（latex/chart/line/code 优雅降级）

### buffer/ 流式缓冲
- **`openmaic-stream-buffer.js`** (~523 行) — 替换 `lib/buffer/stream-buffer.ts`：8 种 item 类型 + tick 节流（30ms/tick，1 char/tick）+ dwell/TTS hold + waitUntilDrained Promise + flush 全部揭示 + dispose/shutdown

### chat/ 多 agent
- **`openmaic-agent-loop.js`** (~175 行) — 替换 `lib/chat/agent-loop.ts`：director 调度多 agent loop + SSE 流解析 + 退出条件（end/cue_user/max_turns/empty_turns/no_done/aborted）

### audio/ 浏览器 TTS
- **`openmaic-browser-tts.js`** (~199 行) — 替换 `lib/audio/browser-tts-preview.ts`：ensureVoicesLoaded（2s 超时）+ resolveBrowserVoice（按 voiceURI/name/lang 匹配）+ playBrowserTTSPreview（带 cancel） + isBrowserTTSAbortError

### v3.2-v3.3 历史（已存在）
- **`openmaic-dsl.js`** — DSL 类型 + Stage/Scene/Action 工厂
- **`openmaic-renderer.js`** — Canvas / DOM 元素渲染器
- **`openmaic-actions.js`** — Action 执行器（与 action-engine 不同：这是 6 步课堂的轻量版）
- **`main-extracted/openmaic-visualizers.js`** — 6 步可视化动画
- **`main-extracted/openmaic-generation-progress.js`** — 生成进度页
- **`main-extracted/openmaic-classroom-runner.js`** — 课堂 Runner 黏合层

## 使用示例

### 1. 创建流式 buffer（LLM 增量输出合并）

```javascript
const buf = OpenMAICStreamBuffer.createStreamBuffer({
  onAgentStart: (item) => console.log('Agent:', item.agentName),
  onTextReveal: (mid, pid, txt, complete) => renderToChat(mid, txt),
  onActionReady: (mid, item) => OpenMAICActionEngine.execute(item),
  onDone: (item) => console.log('Stream done'),
  onError: (msg) => console.error(msg),
  onLiveSpeech: () => {},
  onSpeechProgress: () => {},
  onThinking: () => {},
  onCueUser: () => {},
}, { tickMs: 30, charsPerTick: 1, postTextDelayMs: 200 });

buf.start();
buf.pushAgentStart({ messageId: 'm1', agentId: 'a1', agentName: '老师' });
buf.pushText('m1', '同学们好');
sse.onDelta(delta => buf.pushText('m1', delta));
sse.onEnd(() => { buf.sealText('m1'); buf.pushDone({ totalActions: 0, totalAgents: 1 }); });
```

### 2. 多 agent loop

```javascript
const outcome = await OpenMAICAgentLoop.runAgentLoop(
  { config: { agentIds: ['teacher', 'assistant'] }, apiKey: 'xxx' },
  {
    getStoreState: () => stageStore.getState(),
    getMessages: () => messageStore.getAll(),
    fetchChat: (body, signal) => fetch('/api/chat', { method: 'POST', body: JSON.stringify(body), signal }),
    onEvent: (ev) => buf.pushEvent(ev),
    onIterationEnd: async () => {
      await buf.waitUntilDrained();
      return { totalAgents: 1, agentHadContent: true, cueUserReceived: false };
    },
  },
  abortController.signal,
  5
);
```

### 3. Action 执行

```javascript
const action = OpenMAICActions.make('wb_draw_text', { x: 100, y: 80, content: '光合作用' });
await OpenMAICActionEngine.execute(action);
```

### 4. 解析 LLM 输出的 action 块

```javascript
const parsed = OpenMAICActionParser.parseFromOutput(llmResponse, 'slide', ['speech', 'wb_draw_text']);
// → { actions: [...], speechText: '...', remaining: '...' }
```

### 5. 浏览器 TTS 试听

```javascript
const { promise, cancel } = OpenMAICBrowserTTS.playBrowserTTSPreview({
  text: '光合作用是植物利用光能...',
  voice: 'Microsoft Xiaoxiao',
  rate: 1.0,
});
await promise; // 或 cancel() 提前终止
```

## 与原 OpenMAIC 的差异

| 维度 | OpenMAIC 原项目 | BioQuest 移植版 |
|---|---|---|
| 打包 | pnpm + tsc + rollup | 单文件 `<script>` 挂载 |
| UI 框架 | React 19 + shadcn | 原生 DOM + Canvas |
| 状态 | zustand + immer | 模块单例 + getState/setState |
| 事件 | mitt | OpenMAICEmitterGlobal |
| 类名 | clsx + tailwind-merge | cn() |
| JSON 修复 | jsonrepair + partial-json | 4 级回退（纯 JS） |
| 唯一 ID | nanoid | 36-时间戳+随机数 |
| 颜色 | tinycolor2 | 简单 rgba 转换 |
| 存储 | IndexedDB | localStorage |
| TTS | 服务端 audioUrl | 浏览器 SpeechSynthesis |
| LaTeX | KaTeX | 占位文本（BioQuest 暂不支持） |
| 协议 | MIT | MIT（保持一致） |

## 已通过的功能测试

- [x] 19 个模块 `node --check` 语法校验通过
- [x] `node scripts/smoke-test-openmaic.js` 全部模块加载并验证
- [x] StreamBuffer 推入 agent_start → text → sealText → done 的完整流程
- [x] Constants 的 pickColor/pickAvatar 循环取色
- [x] Browser TTS 模块所有函数可访问

## 待扩展

- Spotlight / Laser 元素 ID 解析（需 player 把元素渲染为带 ID 的 DOM 节点）
- 视频元素真正播放（目前是占位）
- LaTeX 用 KaTeX 替换纯文字（已留接口 `global.katex`）
- Image 元素：跨域图片的 CORS 处理
- Stage 持久化恢复（已有 localStorage 序列化，反序列化待补）
