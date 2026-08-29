# CONTRIBUTING

欢迎为 **BioQuest** 贡献代码。本文档约定仓库的分支命名、提交信息、PR 与版本发布规范，请在动手前通读一遍。

---

## 仓库概况

- **项目**：BioQuest —— 面向生物竞赛（联赛）备考的全栈学习平台，包含知识卡片、模拟试题、学习分析、社区讨论等模块。
- **形态**：纯静态站点，托管于 GitHub Pages（主分支直接发布）。
- **主分支**：`main`。所有合并最终收敛到 `main`，`main` 仅通过 PR + Squash 合并接收变更。
- **Node 环境**：Node.js ≥ 20（CI 使用 20）。
- **仓库地址**：<https://github.com/astrnox/BioQuest>

---

## 1. 分支命名约定

每个 issue（或独立需求）一条分支，一条分支原则上只解决一个 issue。

| 场景 | 分支名 |
| --- | --- |
| Bug 修复 | `fix/<issue编号或简述>` （例：`fix/113`） |
| 新功能 | `feat/<简述>` （例：`feat/learning-hub`） |
| 杂项/工程/文档/依赖 | `chore/<简述>` （例：`chore/ci-cleanup`） |

要点：

- 如需个性化描述，可写 `<issue编号>-<简述>`，例如 `fix/113-commit-conventions`。
- 分支名一律小写、以 `-` 连接，避免使用空格与特殊字符。
- **一个 issue 一个分支**；完成后合入并删除本地/远端该分支。

---

## 2. 提交信息规范（Conventional Commits）

提交信息采用 [Conventional Commits](https://www.conventionalcommits.org/) 格式，**必须引用本 issue 编号**，便于追溯与自动生成 changelog。

常规格式：

```
<type>(<scope>): <描述，1~120 字符>
```

允许的 `type`：

- `feat`：新功能
- `fix`：Bug 修复
- `docs`：仅文档（如本文档）
- `chore`：杂项、依赖、构建无关改动
- `refactor`：不改变行为的代码重构
- `perf`：性能优化
- `test`：补充/修改测试

`scope` 可选（括号内小写字母/数字/逗号/下划线/连字符），用于标注影响模块。**描述**使用祈使句、简洁达意，并**在描述尾缀引用 issue 编号**（`(#136)` 形式），便于追溯与自动生成 changelog。

示例：

```
fix: 修复答题进度在刷新后丢失 (#136)
feat: 新增学习热力图模块 (#128)
docs: 补充贡献与提交规范 (#113)
chore: 升级 playwright 依赖到 v1.4x (#120)
refactor: 抽取公共的代数引擎函数 (#115)
perf: 预热首页路由以降低首屏耗时 (#129)
test: 为 IRT 引擎补充边界用例 (#131)
```

> 描述控制在 1 ~ 120 字符内；更长的说明放正文（空一行后的 message body），正文同样建议注明 `Closes #xxx`。

### 提交校验脚本

仓库提供了零依赖校验脚本，可用于提交前自查或 CI 门禁：

```bash
# 校验最近一次提交是否符合规范
node scripts/check-commit-msg.js

# 独立校验任意消息（无需真的提交）
node scripts/check-commit-msg.js --subject "fix: 修复答题进度丢失 (#136)"
```

符合规范 exit 0；不符合则打印示例并 exit 1。该脚本只读、不改写任何内容。

---

## 3. PR 流程

1. 从最新的 `main` 拉出上述规范命名的分支并开发。
2. 本地自查（见下方「提交校验脚本」与 `npm run lint:js`），推送远端分支。
3. 创建 PR：
   - **base**：`main`；**compare**：你的修复分支。
   - 标题遵循 Conventional Commits 风格。
   - 描述中**引用所要解决的问题**（如 `Closes #113`），简述改动与验证方式。
4. **CI 必须全绿方可合并**，包括：
   - lint（`node --check` JS 语法检查）
   - 单元测试（`npm run test:unit`，含覆盖率门禁）
   - RLS 策略静态审计（`node scripts/audit-rls.js`）
   - vendor 完整性校验（供应链门禁）
   - Playwright E2E（`npm run test:e2e`）
5. 合并统一使用 **Squash and merge**，保持 `main` 历史线性、每个合并对应一个 git 提交。

---

## 4. 发布与版本

本项目由 GitHub Pages 直接发布 `main`，无独立发布步骤；`package.json` 中的 `version` 与 git tag 用于标记里程碑。

- **标签**：semver 格式 `v1.x.y`（例：`v1.2.0`）。发布里程碑时打 tag 并推送：
  ```bash
  git tag v1.2.0
  git push origin v1.2.0
  ```
- **bump:sw**：修改 `js/`、`css/`、`data/` 下文件后，运行 `npm run bump:sw` 自动按内容计算哈希并写入 `sw.js` 的 `CACHE_VERSION`，避免新旧资源混用。内容未变时幂等、不弄脏工作区。

### 常用 npm scripts

```bash
npm test          # 锚点 + 单元 + 烟雾三连（= test:anchor && test:unit && test:smoke）
npm run test:unit # Jest 单元测试（含覆盖率门禁）
npm run test:e2e  # Playwright E2E
npm run build:min # 用 esbuild 压缩 js/css 进 dist/（产物不入库）
npm run build:css # 合并首屏同步 CSS 为 bundle-core.css
npm run bump:sw   # 刷新 Service Worker 缓存版本号
npm run lint:js   # node --check 全部 JS 语法检查
```

---

## 5. 代码风格与注意事项

- 拦截仅发生在 `scripts/`、`tests/` 的零依赖脚本使用 Node 内置模块；业务代码若引入新依赖请先在 issue/PR 中说明理由。
- 不把构建产物（`dist/`、压缩后的 vendor 副本等）提交入库。
- 涉及第三方 vendor 文件升级时，需同步更新 integrity 清单并说明，否则 CI 的 vendor 完整性门禁会 FAIL。
- 提交前请 `git diff` 复核，避免夹带无关改动。