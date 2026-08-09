/**
 * ============================================================
 * BioQuest - Service Worker（离线缓存）
 * 基于 PWA 标准，完全免费，无需任何后端服务
 * ============================================================
 */

// 版本号策略：CSS/JS 缓存与页面解耦（剥离 ?v= 参数匹配），
// 因此每次修改任何 JS/CSS 后必须 bump 此版本号，触发预缓存刷新与旧缓存清理。
var CACHE_VERSION = 'bioquest-20260809a';
var CACHE_NAME = 'bioquest-cache-' + CACHE_VERSION;

// 预缓存核心资源（骨架页面）
// v4.0：与 index.html 实际加载资源严格对齐，新增 v4.0 四大深化模块文件
var CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  // CSS（index.html 首屏同步加载 + 路由级常用）
  './css/globals.css',
  './css/layout.css',
  './css/header.css',
  './css/home.css',
  './css/quiz.css',
  './css/analytics.css',
  './css/cards.css',
  './css/countdown.css',
  './css/practice.css',
  './css/habits.css',
  './css/learning-hub.css',
  './css/study.css',
  './css/user.css',
  './css/resources.css',
  './css/ebook.css',
  './css/footer.css',
  './css/announcements.css',
  './css/phet-sims.css',         // v4.1: PhET 模拟实验页样式
  // JS（index.html 首屏同步加载）
  './js/app.js',
  './js/utils.js',
  './js/badge-motifs.js',          // 手绘成就徽章库（单一数据源）
  './js/vendor/ts-fsrs.umd.min.js', // ts-fsrs (MIT): 官方 FSRS-5 引擎
  './js/vendor/purify.min.js',      // DOMPurify (MPL-2.0/Apache-2.0): SVG/HTML XSS sanitizer
  // v5.0 Tier1 vendor 库
  './js/vendor/katex.min.js',        // KaTeX (MIT): 数学公式
  './js/vendor/katex.min.css',       // KaTeX 样式
  './js/vendor/mhchem.min.js',       // mhchem (Apache-2.0): KaTeX 化学方程式插件
  './js/vendor/dexie.min.js',        // Dexie.js (Apache-2.0): IndexedDB ORM
  './js/vendor/chart.umd.min.js',    // Chart.js (MIT): 学习分析图表
  './js/vendor/cytoscape.min.js',    // Cytoscape.js (MIT): 知识图谱
  './js/vendor/mermaid.min.js',      // Mermaid (MIT): 文本→图表
  './js/vendor/gsap.min.js',         // GSAP (MIT): 动画引擎
  './js/vendor/three.min.js',        // Three.js (MIT): 3D WebGL
  './js/vendor/3Dmol-min.js',        // 3Dmol.js (BSD-3): 分子查看器
  './js/vendor/jszip.min.js',        // JSZip (MIT): ZIP 压缩
  './js/vendor/mammoth.browser.min.js', // mammoth.js (BSD-2): Word→HTML
  './js/vendor/d3.min.js',           // d3 (BSD-3): cal-heatmap 4.x 依赖
  './js/vendor/cal-heatmap.min.js',  // cal-heatmap (MIT): 学习热力图
  './js/vendor/cal-heatmap.css',     // cal-heatmap 样式
  './js/vendor/pdf.min.js',          // PDF.js (Apache-2.0): PDF 渲染
  './js/vendor/pdf.worker.min.js',   // PDF.js worker
  // Tier 2 vendor（懒加载，但预缓存以便离线）
  './js/vendor/irt.umd.js',           // @geekie/irt (MIT): 3PL 项目反应理论
  './js/vendor/RDKit_minimal.js',     // @rdkit/rdkit (BSD-3): SMILES→2D 分子 js
  './js/vendor/RDKit_minimal.wasm',   // RDKit wasm 二进制
  './js/vendor/react.production.min.js',     // React (MIT): Excalidraw 依赖
  './js/vendor/react-jsx-runtime-polyfill.js',// jsx-runtime polyfill（自实现）
  './js/vendor/react-dom.production.min.js',  // ReactDOM (MIT): Excalidraw 依赖
  './js/vendor/excalidraw.production.min.js',// Excalidraw (MIT): 手绘白板
  './js/vendor/quikchat.umd.min.js',  // quikchat (BSD-2): 实时聊天 UI
  './js/vendor/marked.umd.js',        // marked (MIT): markdown 解析
  './js/vendor/igv.min.js',           // igv.js (MIT): 基因组浏览器（路由懒加载，预缓存以便离线）
  // v5.0 Tier1 集成模块
  './js/integrations/vendor-init.js',
  './js/integrations/study-heatmap.js',
  './js/integrations/analytics-charts.js',
  './js/integrations/diagram-renderer.js',
  './js/integrations/molecule-viewer.js',
  './js/integrations/document-tools.js',
  './js/integrations/data-store.js',
  './js/fsrs-optimizer.js',
  // Tier 2 集成模块
  './js/integrations/irt-enhanced.js',
  './js/integrations/bkt-engine.js',
  './js/integrations/rdkit-viewer.js',
  './js/integrations/sketch-pad.js',
  './js/integrations/community-enhanced.js',
  './js/integrations/ai-chat-enhanced.js',
  './js/integrations/genome-browser.js',
  './js/fsrs-algorithm.js',     // P0-1：FSRS 兼容包装层
  './js/ai-client.js',          // AI 客户端（多 LLM 路由）
  './js/event-bus.js',          // v4.0：事件总线 + ACTION 标签解析
  './js/irt-engine.js',         // IRT 项目反应理论
  './js/tts.js',                // TTS 语音
  './js/whiteboard.js',         // 白板
  './js/multi-agent.js',        // v4.0：多智能体讨论 + 苏格拉底引导
  './js/classmate.js',          // v4.0 模块 2：苏格拉底 AI 同学
  './js/learning-dna.js',       // v4.0 模块 3：学习 DNA + 情绪 DNA
  './js/mood-tracker.js',       // v4.0 模块 4：身心健康融合
  './js/a11y-utils.js',         // v4.0 可访问性工具（焦点陷阱 + aria-live）
  './js/community.js',
  './js/learning-hub.js',
  './js/classroom.js',          // v4.0 模块 1：AI 生物学课堂
  './js/classroom-player.js',   // v4.0 模块 1：课堂播放器
  // JS（路由级按需加载，但属于核心功能）
  './js/cards.js',
  './js/quiz.js',
  './js/practice.js',
  './js/exam.js',
  './js/ai-diagnostic-engine.js',
  './js/analytic.js',
  './js/knowledge-graph.js',
  './js/smart-diagnosis.js',
  './js/storage.js',
  './js/dashboard.js',          // v4.0：双画像集成
  './js/supabase-client.js',    // P0-3：Supabase 直连
  './js/supabase.js',
  './js/loader.js',
  './js/question-utils.js',
  './js/tutor.js',
  './js/teacher.js',
  './js/review.js',
  './js/review-deep.js',
  './js/wrongbook.js',
  './js/study.js',
  './js/habits.js',
  './js/daily-question.js',
  './js/bounty.js',
  './js/bio-lab.js',
  './js/bio-animation.js',     // v4.0：生物过程动画
  './js/phet-sims.js',         // v4.1：PhET 互动模拟实验
  './js/photo-quiz.js',
  './js/biology-history.js',
  './js/ebook.js',
  './js/resources.js',
  './js/trends.js',
  './js/discussion.js',
  './js/user.js',
  './js/hero-sketch.js',
  './js/countdown.js',
  // 数据文件
  './data/cards.json',
  './data/quiz.json',
  './data/quiz_m1.json',
  './data/quiz_m2.json',
  './data/quiz_m3.json',
  './data/quiz_m4.json',
  './data/resources.json',
  './data/knowledge-graph.json',
  './data/logic_questions.json',
  './data/community.json',
  './data/_version.json',
  // PRD §5 补全模块（v20260803a）
  './js/micro-details.js',
  './js/sync-tabs.js',
  './js/error-recovery.js',
  './js/cell-loader.js',
  './js/shortcut-panel.js',
  './js/soundscape.js',
  './js/onboarding.js',
  './js/social-impact.js'
];

// ==================== 安装阶段：预缓存核心资源 ====================
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(CORE_ASSETS).catch(function (err) {
          console.warn('[SW] 部分资源缓存失败:', err);
        });
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

// ==================== 激活阶段：清理旧缓存 ====================
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (key) {
            return key.startsWith('bioquest-') && key !== CACHE_NAME;
          }).map(function (key) {
            return caches.delete(key);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

// ==================== 请求拦截：Cache First + Network Fallback ====================
self.addEventListener('fetch', function (event) {
  var request = event.request;

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  // 忽略非 http(s) 请求
  var url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 策略 1: 页面导航 - 网络优先，回退到离线页面
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request) || caches.match('./index.html');
        })
    );
    return;
  }

  // 策略 2: JSON 数据 - 网络优先，缓存回退
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request);
        })
    );
    return;
  }

  // 策略 3: CSS/JS - 缓存优先，网络更新
  // 注意：index.html 中 CSS/JS 带 ?v= 缓存破坏参数，而 CORE_ASSETS 预缓存的是无参数版本。
  // 匹配与更新缓存时均使用无查询参数的 URL，确保预缓存命中并避免同一文件多个缓存条目。
  if (url.pathname.match(/\.(css|js)$/i)) {
    var assetUrl = new URL(request.url);
    assetUrl.search = '';
    var assetRequest = new Request(assetUrl.toString(), { mode: request.mode, credentials: request.credentials });
    event.respondWith(
      caches.match(assetRequest).then(function (cached) {
        var networkFetch = fetch(request).then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(assetRequest, clone);
          });
          return response;
        }).catch(function () {
          return cached;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // 策略 4: 图片 - 缓存优先，永不更新
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        return cached || fetch(request).then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, clone);
          });
          return response;
        }).catch(function () {
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
    );
    return;
  }

  // 策略 5: 其他资源 - 缓存优先
  event.respondWith(
    caches.match(request).then(function (cached) {
      return cached || fetch(request).then(function (response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, clone);
        });
        return response;
      }).catch(function () {
        return cached;
      });
    })
  );
});

// ==================== 消息处理：手动触发更新 ====================
self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
