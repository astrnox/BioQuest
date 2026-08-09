# BioQuest - 免费部署与运营方案（个人开发者零成本）

## 核心技术栈（全部免费）

| 组件 | 技术 | 成本 | 说明 |
|------|------|------|------|
| **前端** | 原生 HTML/CSS/JS | ¥0 | 无需构建工具，直接打开即用 |
| **部署** | GitHub Pages / Netlify / Cloudflare Pages | ¥0 | 免费静态托管 + CDN |
| **后端** | 无需后端（可选 Supabase Free Tier） | ¥0 | 纯前端架构 |
| **数据库** | localStorage + IndexedDB（浏览器内置） | ¥0 | 每个用户数据本地存储 |
| **算法** | FSRS-4.5（开源算法） | ¥0 | 纯数学公式，无需 API |
| **AI 诊断** | 贝叶斯知识追踪（BKT）+ 规则引擎 | ¥0 | 纯 JS 实现 |
| **社区** | GitHub Discussions 嵌入 | ¥0 | GitHub 自带功能 |
| **图标** | 纯 SVG（内置 CSS 绘制） | ¥0 | 无需外部图标库 |

## 一行命令部署

### 方案 A: GitHub Pages（推荐）

```bash
# 1. 在 GitHub 创建仓库
# 2. 推送到 GitHub
git init
git add .
git commit -m "feat: initial BioQuest release"
git branch -M main
git remote add origin https://github.com/你的用户名/BioQuest.git
git push -u origin main

# 3. 在 GitHub 仓库 Settings → Pages → Source 选 main 分支
# 4. 几分钟后访问: https://你的用户名.github.io/BioQuest/
```

### 方案 B: Netlify（自动 HTTPS + PR 预览）

```bash
# 方法1：拖拽目录到 https://app.netlify.com/drop
# 方法2：命令行
npm install -g netlify-cli
netlify deploy --prod --dir=.
```

### 方案 C: Cloudflare Pages（全球 CDN）

1. 登录 Cloudflare Dashboard → Pages → Create project
2. 连接 GitHub 仓库
3. Framework preset: None
4. Build command:（留空）
5. Build output directory: `/`
6. Deploy!

## 题库扩充方案（零成本）

### 1. 自动生成（已实现）

```bash
python3 scripts/generate_questions_from_cards.py
# → 从 200 张卡片自动生成 800+ 题目
```

### 2. 用户导入（需添加页面）

用户可上传自己的题库 JSON，格式：
```json
{
  "题目": "细胞膜的主要成分是什么？",
  "选项": ["A. 磷脂和蛋白质", "B. 糖类和脂肪", "C. 核酸和蛋白质", "D. 水和无机盐"],
  "答案": "A",
  "模块": "模块一",
  "解释": "流动镶嵌模型..."
}
```

### 3. 开放题库仓库（GitHub 协作）

建立 `bioquest-question-bank` 仓库，任何人可以 PR 贡献题目。

## 用户增长方案（零成本）

### 1. SEO 优化

- title/description 已针对"生物竞赛"、"联赛"、"生物奥赛"关键词
- 添加 Open Graph tags 便于社交分享
- 网站速度：纯静态 < 200KB，首屏加载 < 1s

### 2. 内容营销

- 每 2 周发布一篇"生物竞赛知识点解析"文章
- 发布到知乎、小红书、微信公众号
- 文中引导："想练更多题目？访问 bioquest.xxx"

### 3. 社区运营

- GitHub Discussions 作为用户社区
- 设置 Label：【提问】【分享】【错题讨论】【建议】
- 每周精选优质讨论置顶

### 4. 学生 KOL 合作

- 寻找生物竞赛获奖学生
- 邀请写 guest post / 录制讲解视频
- 在平台上标注他们的推荐内容

## 商业化路径（可选，需要 1000+ DAU 后）

### 阶段 1：完全免费（当前）
- 所有功能免费开源
- 建立用户基础和口碑

### 阶段 2：付费增值（¥19-49/月）
- AI 错题解析报告（接入开源大模型，如 DeepSeek-V3）
- 个性化备考计划
- 历年真题高清扫描版
- 生物竞赛前辈 1v1 咨询对接

### 阶段 3：B 端合作
- 高中/培训机构批量账号
- 定制题库和课程
- 线下集训营合作

## 技术优化路线图（按优先级）

- [x] PWA 支持（可安装到手机桌面，离线使用）
- [x] FSRS-4.5 算法升级（从 SM-2）
- [x] 贝叶斯知识追踪诊断
- [x] 知识点依赖图谱
- [x] 题库自动生成脚本
- [ ] 题库批量导入 UI
- [ ] 知识点依赖图谱 → 可视化学习路径图
- [ ] 番茄钟与卡片联动
- [ ] 社区（GitHub Discussions 嵌入）
- [ ] 数据导入导出（备份迁移）

## 关键文件说明

```
/workspace
├── index.html                    # 主页面
├── manifest.json                 # PWA 清单
├── sw.js                         # Service Worker（离线缓存）
├── css/                          # 样式
│   ├── globals.css              # 全局样式 + CSS 变量
│   ├── home.css                 # 首页
│   ├── quiz.css                 # 答题界面
│   ├── cards.css                # 知识卡片
│   ├── analytics.css            # 数据统计
│   └── ...
├── js/                           # 逻辑
│   ├── app.js                   # SPA 路由
│   ├── cards.js                 # 卡片复习逻辑（SM-2）
│   ├── fsrs-algorithm.js        # FSRS-4.5 算法（升级用）
│   ├── quiz.js                  # 练习/测验
│   ├── exam.js                  # 模拟考试
│   ├── ai-diagnostic-engine.js  # AI 诊断（BKT + 规则引擎）
│   ├── knowledge-graph.js       # 知识图谱可视化
│   ├── smart-diagnosis.js       # 诊断 UI
│   ├── analytic.js              # 学习统计
│   ├── pomodoro.js              # 番茄钟
│   ├── storage.js               # 数据持久化
│   ├── community.js             # 社区（GitHub Discussions）
│   └── ...
├── data/                         # 数据（JSON）
│   ├── cards.json               # 知识卡片 200+
│   ├── quiz.json                # 题库
│   ├── quiz_m1-4.json           # 模块题库
│   ├── resources.json           # 学习资源
│   └── quiz_auto_generated.json # 自动生成题库（846题）
├── scripts/
│   └── generate_questions_from_cards.py  # 自动出题脚本
└── README.md                     # 项目说明
```

## 本地开发

```bash
# 任何 HTTP 服务器都可以
python3 -m http.server 8080
# 或
npx serve .

# 然后访问 http://localhost:8080
```

## 数据与隐私

- 所有用户数据存储在 **本地浏览器 localStorage** 中
- 不上传任何个人信息
- 支持 JSON 导出备份
- PWA 安装后可完全离线使用

## 许可证

MIT License - 完全开源，免费使用
