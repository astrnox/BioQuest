# BioQuest 安全与工程整改 PRD（最终版）

| 项目 | BioQuest — 高中生生物学习平台 |
|------|------------------------------|
| 版本 | v1.0（整改专项） |
| 日期 | 2026-08-17 |
| 仓库 | https://github.com/astrnox/BioQuest |
| 现状数据 | 83 Stars / 18 Forks / 66 Commits / 5 Open Issues / 仓库体积 971MB |
| 文档性质 | 基于全仓库代码审计的问题整改方案，非新功能 PRD |

---

## 1. 背景与现状

BioQuest 是一个纯静态前端的高中生生物学习 PWA，覆盖高考到生物联赛全链路，技术亮点包括 FSRS 记忆算法、IRT 3PL 能力评估、OCR 拍照搜题、6 家 LLM 直连 AI 导师、虚拟实验与分子可视化。

2026-08-17 全仓库审计结论：

- **产品/内容/社区运营：A**（选题精准、功能差异化清晰、双语文档、Issue 模板齐全）
- **前端工程：C**（巨石文件、人肉缓存版本号、971MB git 历史）
- **安全：F**（真实 API Key 明文入库、纯客户端管理员认证、管理后台存储型 XSS）

本 PRD 的目标：在不破坏项目核心定位的前提下，系统性消除安全风险、偿还关键工程债。

## 2. 核心约束（不可违反）

| 约束 | 含义 |
|------|------|
| **纯前端** | 不引入任何自建后端 / Serverless 代理；浏览器原生能力、Supabase 托管服务（Auth/RLS/REST）除外——它们不增加运维实体 |
| **零依赖** | 不新增运行时第三方依赖；一次性本地工具（git 清洗、字体分包）允许，其产物必须是纯静态文件；开发期 devDependencies 不随站点分发，允许保留现状（jest） |
| **零成本** | 全部服务停留在免费额度内（GitHub Pages / Supabase Free / 用户自带 LLM Key） |

## 3. 整改目标（验收标准）

1. 仓库及历史中不存在任何可用密钥；
2. 无任何密钥的数据库写操作在 RLS 层被拒绝；
3. 管理后台所有用户可控字段渲染经过转义/净化，XSS 用例测试通过；
4. 仓库 clone 体积 < 150MB；
5. 首屏字体流量 < 200KB；
6. SW 缓存版本号不再依赖人肉维护；
7. `admin.js` 拆分完成，普通用户首屏不再加载管理代码。

---

## 4. 问题清单与整改方案

### 🔴 P0-1：硬编码真实 LLM API Key

**现状**：`js/ai-client.js` 中明文硬编码智谱 AI 真实密钥（`BUILTIN_API_KEY`），处于公开仓库及 git 历史中，可被任意盗用。此外 `AiClient.loadConfig()` 全局返回值携带 apiKey，叠加 localStorage 明文存储，共 5 条独立泄露路径。

**整改方案（纯前端正解：BYOK）**：
1. 立即吊销并轮换该智谱 Key（Day 0 动作）；
2. 用 `git filter-repo` 清洗历史后 force-push；
3. 删除内置 Key 兜底逻辑，全面转向"用户自带 Key"（现有三级配置已支持，仅砍掉第三级）；
4. 无 Key 降级体验：AI 相关入口显示配置引导，刷题/错题本/卡片/实验等核心功能不受影响；onboarding 增加"30 秒配置免费 Key"向导（智谱 glm-4-flash、DeepSeek 均有免费额度）；
5. `loadConfig()` 返回值剥离 apiKey，Key 仅存于 IIFE 闭包内供 fetch 使用；
6. 客户端用量限制降级为"软提醒"，README 措辞同步修正。

**验收**：仓库全历史 grep 不到 Key 模式；无 Key 新用户可正常使用非 AI 功能并看到配置引导；控制台执行 `AiClient.loadConfig()` 返回对象不含 apiKey。

### 🔴 P0-2：管理员认证为纯客户端 SHA-256 比对

**现状**：`admin.js` 中管理员密钥经浏览器 SHA-256 后与写死的哈希比对；频率限制在客户端可绕过；Supabase URL + anon key 硬编码；真实安全完全依赖未审计的 RLS 配置。

**整改方案（不引入后端，使用 Supabase Auth + RLS）**：
1. Supabase Dashboard 逐表审计并强制开启 RLS（`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`），基线策略 deny-all；
2. 管理员账号改用 Supabase Auth 邮箱登录，`app_metadata.role = "admin"`；
3. 敏感表写策略改为 `(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`；
4. 删除前端 SHA-256 比对、`_adminSecretKey`、sessionStorage 锁定逻辑，替换为 `supabase.auth.signInWithPassword()`；
5. `sql/` 目录规范：每个 `CREATE TABLE` 必须伴随 RLS 启用与显式策略，纳入提交检查。

**验收**：匿名 anon key 直接调 REST API 对敏感表写操作返回 403/401；普通登录用户伪造前端状态无法提权；`sql/` 脚本全部含 RLS 语句。

### 🔴 P0-3：管理后台存储型 XSS

**现状**：`admin.js` 重度 innerHTML 模板渲染，`escapeHtml` 大面积未使用（用户名、帖子内容、标签、搜索回显均未转义）；内联 `onclick` 仅转义单引号可被反斜杠逃逸。普通用户发帖即可在管理员浏览器执行任意 JS，配合问题 1 可窃取全部已配置 AI Key。

**整改方案**：
1. 在 `utils.js` 实现 `html` tagged template（约 30 行纯 JS），所有插值默认转义，原始 HTML 需显式 `raw()` 声明；
2. 用户生成内容（帖子/评论/笔记）渲染前过已 vendor 的 DOMPurify（`purify.min.js`，零新增依赖）；
3. 内联 `onclick` 全部改为 `addEventListener` + `data-*` 传参；
4. HTML `<meta>` 加入 CSP（GitHub Pages 兼容 meta 版）：`default-src 'self'` 起步，`connect-src` 列出 6 家 LLM 域名与 Supabase 域名；
5. 补充 XSS 回归用例（见 P2-4 测试体系）。

**验收**：构造含 `<img onerror>` / 引号逃逸 payload 的用户名与帖子，管理员打开后台后 payload 不执行；DevTools Console 无 CSP 误报阻塞正常功能。

### 🟠 P1-1：`admin.js` 280KB 巨石文件（关联 Issue #17）

**现状**：3000+ 行单文件混合全局状态、700 行注入 CSS、if 链路由、20 个 CRUD 函数与全部 tab 渲染；无模块边界，数十函数挂全局作用域。`js/` 目录平铺 70 个顶层脚本，靠 script 顺序与 window 耦合。

**整改方案（不引入构建工具）**：
1. 按 tab 物理拆分为 `js/admin/admin-*.js`，每个文件 IIFE 包装并挂载到统一命名空间 `window.BioQuest.admin.*`；
2. 管理脚本不写入 HTML，登录成功后动态 `createElement('script')` 加载——普通用户首屏减少 280KB 下载，同时闭环 Issue #17；
3. 300 行 if 链路由改表驱动；CRUD 样板抽高阶函数；注入 CSS 迁回 `.css` 文件；
4. 全站逐步收敛全局变量至 `window.BioQuest` 单一命名空间。

**验收**：未登录状态下 Network 面板无 admin 相关请求；各管理 tab 功能回归通过；全局作用域残留变量数可枚举（< 10）。

### 🟠 P1-2：仓库体积 971MB

**现状**：git 历史埋有大文件 blob（高度疑似 8/9 force-push 快照中的 30 个 PhET 模拟器），当前工作区仅 ~100MB。后果：clone 劝退、CI 缓慢、逼近 GitHub 1GB 软上限。

**整改方案**：
1. `git rev-list --objects --all` + `git cat-file --batch-check` 定位历史大 blob（或 git-sizer）；
2. `git filter-repo --strip-blobs-bigger-than 5M`（或按路径剔除 PhET 目录）清洗历史并 force-push；
3. PhET 改为 iframe 嵌入 `phet.colorado.edu` 官方站点（CC BY 4.0 官方支持嵌入），部署体积同步缩减；
4. 新规：> 5MB 二进制禁止入库，`.gitignore` 预先配置；README 通知历史清洗、旧 fork 需重新克隆。

**验收**：`git clone` 全量下载 < 150MB；虚拟实验页通过官方 iframe 正常工作。

### 🟠 P1-3：33MB 中文字体

**现状**：`fonts/lxgw-wenkai.ttf` 25.6MB + `.woff2` 8MB 直接入库，首屏链路潜在 8MB 字体下载，与目标用户（校园网/手机流量）冲突。

**整改方案**：
1. 用 cn-font-split（一次性本地工具，产物纯静态）将 woff2 按 Unicode 区段分包，浏览器按需加载，首屏字体流量降至 < 200KB；
2. 删除 25.6MB ttf（woff2 浏览器支持已全覆盖）；
3. CSS 增加 `font-display: swap` 防 FOIT；
4. 备选（不引入任何工具）：fonttools subset 保留常用 3500 汉字 + 拉丁区段，一次性压至 ~1MB。

**验收**：首次访问字体相关传输 < 200KB；页面无长时间 invisible 文本；仓库不再包含 ttf。

### 🟠 P1-4：Service Worker 人肉版本号

**现状**：`CACHE_VERSION = 'bioquest-20260812b'` 需每次改 JS/CSS 后手动 bump，遗忘即导致新旧资源混用的灵异 bug；五条手写缓存策略分支无测试覆盖。

**整改方案（零依赖）**：
1. 新增 `scripts/bump-sw.js`（约 20 行 Node 脚本）：对 `git ls-files js css data` 内容取 hash 自动写入 sw.js；
2. 挂入提交流程（package.json script 串联或 git hook），README 注明"改完 js/css 跑 `node scripts/bump-sw.js`"；
3. 增加缓存损坏逃生通道：检测异常时 `caches.delete()` 全清 + 硬刷新。

**验收**：连续两次修改 JS 文件后，CACHE_VERSION 自动变化且旧缓存被清理；无人工编辑版本号的提交。

### 🟡 P2-1：package.json 混乱

**现状**：`name: "workspace"` 占位符；`main` 指向不存在的 `import-data.js`；浏览器自动化工具 `agent-browser` 误列为运行时 dependencies；24 个 vendor 库脱离版本管理。

**整改**：修正元数据、删除 `main`、`agent-browser` 移入 devDependencies；vendor 库在 `THIRD_PARTY_LICENSES.txt` 旁维护版本清单（版本号 + 下载日期），半年人工巡检 CVE。

### 🟡 P2-2：许可证选择不当

**现状**：CC BY-NC-SA 4.0 用于代码（CC 官方明确不建议），与 24 个 MIT/Apache/BSD 依赖的兼容性声明无法律依据。

**整改**：双轨授权——代码换 MIT（宽松）或 AGPL-3.0（防闭源商用）；题库/教材/图片等内容保留 CC BY-NC-SA 4.0；README 增加授权结构说明，LICENSE 拆分为两个文件。

### 🟡 P2-3：范围蔓延

**现状**：9 天 66 commits 铺出 FSRS/IRT/BKT/OCR/基因组浏览器/多智能体/积分/Wiki 等全功能面，维护成本失控，5 个 open issue 均为还债单。

**整改**：
1. 功能四象限盘点（用户价值 × 维护成本），低价值高成本项（igv.js 基因组浏览器、RDKit、多智能体）标记"实验性"或砍除；
2. README 功能表增加"状态"列（稳定/Beta/实验）；
3. 纪律：新功能开工前必须先关闭一个存量 issue；
4. 资源聚焦三大差异化功能：虚拟实验、错题本、AI 导师。

### 🟡 P2-4：测试与质量基建薄弱

**现状**：仅 jest 单测 + 两个手写冒烟脚本；`lint:js` 实为 `node --check` 语法检查；无 E2E、无安全回归。

**整改（零运行时依赖）**：
1. 测试优先级：FSRS 算法 > bioID 题库解析 > 转义/渲染函数（安全回归）；
2. 新增 `tests/run.html` 浏览器断言页（50 行迷你 assert），覆盖 5 条核心路径：首页加载 → 答题 → 错题入本 → 卡片复习 → 离线刷新；
3. 零依赖 lint 升级：严格模式解析 + 手写规则（禁 `eval`、检测未转义插值模式），约 50 行脚本；
4. （可选，仅开发期）ESLint + no-unsanitized、Playwright E2E，属 devDependencies 不进分发产物。

### 🟡 P2-5：仓库卫生杂项

| 项 | 动作 |
|----|------|
| `.env.example` 误导（纯前端无环境变量机制） | 删除或改名 `config.example.js` 并注明用法 |
| README 死链 Demo 域名（"没钱买服务器"） | 撤下死链，GitHub Pages 链接提至最显眼位 |
| Issue 用 `[P1]/[P2]` 标题前缀管理优先级 | 迁移至 GitHub Projects 看板 |
| `.trae/` AI 工具工作区入库 | 加入 `.gitignore` |
| 提交信息风格漂移 | 采用 Conventional Commits |

---

## 5. 实施路线图

| 阶段 | 时间 | 内容 | 对应问题 |
|------|------|------|---------|
| **Day 0** | 今天 | 吊销智谱 Key；Supabase 逐表开 RLS 审计 | P0-1、P0-2 |
| **Week 1** | 第 1 周 | BYOK 改造 + Key 历史清洗；admin 认证迁移 Supabase Auth；`html` 转义标签 + DOMPurify 铺设 + meta CSP | P0-1、P0-2、P0-3 |
| **Week 2** | 第 2 周 | git 历史瘦身（PhET 转官方 iframe）；字体分包 + 删 ttf；`bump-sw.js` | P1-2、P1-3、P1-4 |
| **Week 3** | 第 3 周 | admin.js 按 tab 拆分 + 登录后动态加载；package.json 修正；许可证双轨 | P1-1、P2-1、P2-2 |
| **Week 4+** | 持续 | 功能盘点砍枝；测试体系补齐；issue 纪律与仓库卫生 | P2-3、P2-4、P2-5 |

## 6. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| force-push 清洗历史导致 18 个 fork 失联 | 中 | README + Release 公告；旧 fork 指引重新克隆 |
| BYOK 提高新用户使用门槛 | 中 | onboarding 向导 + 免费 Key 配置图文教程；非 AI 功能全量可用兜底 |
| RLS 策略误配导致正常功能不可用 | 高 | 先在 staging 项目演练；策略上线前写正/反两用例验证 |
| CSP 误伤内联脚本/字体 | 中 | 先 `Content-Security-Policy-Report-Only` 模式观察一周再强制 |
| admin 动态加载引入时序 bug | 低 | 加载完成事件驱动渲染，补充回归用例 |

## 7. 成功度量

- 安全：密钥扫描工具（如 trufflehog）全历史扫描零命中；XSS 用例全部通过；匿名写敏感表全部 403；
- 性能：Lighthouse 首屏性能分提升（目标 ≥ 90）；clone 体积 < 150MB；首屏字体 < 200KB；
- 工程：open issue 数收敛至 ≤ 2 且均为增强类；连续 4 周无"忘了 bump 版本号"类事故；
- 产品：新用户首次答题完成率不下降（验证 BYOK 引导未伤害核心漏斗）。

---

## 附：本次审计确认的项目亮点（保持项）

1. SW 缓存策略设计（骨架预缓存 + 分批 warmup + `?v=` 剥离）有真实工程思考，注释完整记录失败教训；
2. 注释中体现威胁建模意识（如明确拒绝"Supabase JWT 冒充管理凭证"方案）；
3. 算法选型专业（FSRS 替代 SM-2、IRT 3PL 替代正确率统计）；
4. 24 个第三方库许可证清单完整，合规意识突出；
5. 双语文档、4 类 Issue 模板、贡献者致谢——社区运营成熟度远超同类个人项目。

> **总评：选题与内容 A+，前端工程 C，安全 F。堵上三个 P0 后，纯前端架构反而是最干净、最可持续的形态。**
