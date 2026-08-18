/**
 * ============================================================
 * BioQuest - Service Worker（离线缓存）
 * 基于 PWA 标准，完全免费，无需任何后端服务
 * ============================================================
 */

// 版本号策略：CSS/JS 缓存与页面解耦（剥离 ?v= 参数匹配）。
// P1-4 修复：CACHE_VERSION 由 scripts/bump-sw.js 基于 git 跟踪的 js/css/data
// 内容哈希自动生成——修改任何 JS/CSS/data 后运行 `npm run bump:sw` 即可，
// 不再依赖人肉维护版本号。版本号变化会触发 activate 阶段清理旧缓存并重新预热。
var CACHE_VERSION = 'bioquest-41e2d3b7ada7'; // ← bump-sw.js 会自动改写此行
var CACHE_NAME = 'bioquest-cache-' + CACHE_VERSION;

/* ========================================================================
 * Issue #16：题库 runtime cache（与外壳缓存分离）
 *  - data/*（manifest / bank / index / bioid-map）与 jsDelivr CDN 响应
 *    存入独立 DATA_CACHE，网络优先 + 离线回退；
 *  - 「检查更新」发现 manifest.rev 变化时可整体清空 DATA_CACHE 并重取，
 *    不影响应用外壳（避免"旧壳新数据"错位：外壳版本由 CACHE_VERSION 控制）。
 * ====================================================================== */
var DATA_CACHE_NAME = 'bioquest-data';

/* ========================================================================
 * 首屏缓存策略（修复"新用户首次加载很久/卡住/需要刷新"）
 * ------------------------------------------------------------------------
 * 旧方案：install 阶段 cache.addAll(150+ 文件)，含 7.7MB 字体 + quiz JSON
 *        → SW install 超时/中断 → 无 controller → 有时要刷新
 * 新方案：
 *   INSTALL 阶段只缓存"最小可运行骨架"（~15 个文件），几秒钟内必成功
 *   ACTIVATE 后 claim 完成 → message type='warmup' 分批异步预热其它资源
 *   大数据/字体/重型 vendor 一律走 Cache First 但不预缓存（首次是
 *   Network First，后续访问自动进缓存，不阻塞首屏）
 * ====================================================================== */

// 安装阶段只预缓存"最小骨架"——保证 install 快速成功，无需刷新即可用
var SKELETON_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  // 首屏同步渲染 CSS（不可异步，否则 FOUC）
  './css/globals.css',
  './css/layout.css',
  './css/header.css',
  './css/home.css',
  './css/learning-hub.css',
  // 初始化关键 JS（其余 defer 都靠网络命中后自然进缓存）
  './js/app.js',
  './js/utils.js',
  './js/loader.js',
  './js/question-utils.js',
  // 必要的 meta/小数据
  './data/_version.json',
  './data/cards.json'
];

// 激活后空闲预热：首屏常用功能文件 + 常用 CSS（quiz/practice 这种高频路由）
var WARMUP_PHASE_1 = [
  './css/footer.css',
  './css/quiz.css',
  './css/practice.css',
  './css/countdown.css',
  './css/analytics.css',
  './css/cards.css',
  './css/habits.css',
  './css/study.css',
  './css/user.css',
  './css/resources.css',
  './css/ebook.css',
  './css/announcements.css',
  './css/debug-fix.css',
  './css/phet-sims.css',
  './css/daily-billion.css',
  // 首页交互小文件（很快）
  './js/onboarding.js',
  './js/badge-motifs.js',
  './js/error-recovery.js',
  './js/shortcut-panel.js',
  './js/sync-tabs.js',
  './js/cell-loader.js',
  './js/hero-sketch.js',
  './js/countdown.js',
  './js/soundscape.js',
  './js/social-impact.js',
  './js/learning-hub.js',
  './js/micro-details.js'
];

// 预热阶段 2：重型功能（quiz/exam/practice 等运行时库 + 数据）
// 注意：quiz_*.json 很大 (~900KB total)，放在最后一批；即便失败也不影响使用
var WARMUP_PHASE_2 = [
  // 路由核心
  './js/quiz.js',
  './js/practice.js',
  './js/exam.js',
  './js/dashboard.js',
  './js/cards.js',
  './js/study.js',
  './js/review.js',
  './js/review-deep.js',
  './js/wrongbook.js',
  './js/daily-question.js',
  './js/habits.js',
  './js/knowledge-graph.js',
  './js/ai-diagnostic-engine.js',
  './js/smart-diagnosis.js',
  './js/storage.js',
  './js/supabase-client.js',
  './js/supabase.js',
  './js/resources.js',
  './js/ebook.js',
  './js/trends.js',
  './js/discussion.js',
  './js/user.js',
  './js/community.js',
  './js/bounty.js',
  './js/bio-lab.js',
  './js/bio-animation.js',
  './js/phet-sims.js',
  './js/photo-quiz.js',
  './js/biology-history.js',
  './js/tutor.js',
  './js/teacher.js',
  './js/classroom.js',
  './js/classroom-player.js',
  './js/fsrs-algorithm.js',
  './js/fsrs-optimizer.js',
  './js/irt-engine.js',
  './js/event-bus.js',
  './js/a11y-utils.js',
  './js/classmate.js',
  './js/mood-tracker.js',
  './js/learning-dna.js',
  './js/whiteboard.js',
  './js/multi-agent.js',
  './js/ai-client.js',
  './js/tts.js',
  // 数据（按需也能加载，预热只是让首次 quiz 更快）
  './data/quiz.json',
  './data/quiz_m1.json',
  './data/quiz_m2.json',
  './data/quiz_m3.json',
  './data/quiz_m4.json',
  './data/resources.json',
  './data/knowledge-graph.json',
  './data/logic_questions.json',
  './data/community.json'
];

// 这些"很重"的文件不做 install 预缓存，避免首次注册 SW 时 install 超时
// 它们靠首次访问时的网络自然进入 Cache First 缓存
var NEVER_PRECACHE = [
  './fonts/lxgw-wenkai.woff2',        // 7.7MB 字体
  './fonts/lxgw-wenkai.ttf',          // ttf 备用
  './js/vendor/three.min.js',         // ~1MB Three.js
  './js/vendor/3Dmol-min.js',         // ~1MB 3Dmol
  './js/vendor/cytoscape.min.js',     // ~700KB
  './js/vendor/mermaid.min.js',       // ~2MB
  './js/vendor/pdf.min.js',
  './js/vendor/pdf.worker.min.js',
  './js/vendor/RDKit_minimal.js',
  './js/vendor/RDKit_minimal.wasm',
  './js/vendor/excalidraw.production.min.js',
  './js/vendor/react.production.min.js',
  './js/vendor/react-dom.production.min.js',
  './js/vendor/igv.min.js',
  './js/vendor/mammoth.browser.min.js'
];

/**
 * 分批预热缓存，每批之间让出主线程：
 *  避免 SW 安装后一次性并发 150+ 请求 → 主页面资源下载被反压，
 *  也避免部分 HTTP/1.1 服务器把并发数打满而报错 499/503。
 */
function warmupCache() {
  caches.open(CACHE_NAME).then(function (cache) {
    // 逐个批次串行，批内允许有限并发
    var batches = [WARMUP_PHASE_1, WARMUP_PHASE_2];
    var batchIdx = 0;
    function nextBatch() {
      if (batchIdx >= batches.length) return;
      var batch = batches[batchIdx++];
      // 每批最多 6 路并发，其余排队
      var i = 0;
      function runNext() {
        if (i >= batch.length) {
          // 下一批延迟到空闲后（500ms 让出主线程）
          setTimeout(nextBatch, 500);
          return;
        }
        var url = batch[i++];
        cache.add(url).catch(function () {
          // 预热失败直接忽略：不影响页面使用，下次访问会走网络
        }).then(function () {
          // 给主页面的 fetch 让出通道
          setTimeout(runNext, 16);
        });
      }
      var concurrency = Math.min(6, batch.length);
      for (var k = 0; k < concurrency; k++) runNext();
    }
    nextBatch();
  });
}

// ==================== 安装阶段：只预缓存最小骨架（秒级完成） ====================
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // 逐文件缓存，保证即便某一项 404/失败 也不影响整体 install 成功
      return Promise.all(SKELETON_ASSETS.map(function (url) {
        return cache.add(url).catch(function (e) {
          console.warn('[SW] 骨架资源跳过(非致命):', url, e && e.message);
        });
      }));
    }).then(function () {
      // 立刻跳过 waiting，保证刷新/新标签页立刻用新 SW（不再"要刷新才正常"）
      try { return self.skipWaiting(); } catch (e) { return Promise.resolve(); }
    })
  );
});

// ==================== 激活阶段：claim + 分批预热 ====================
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) {
          // Issue #16：DATA_CACHE 是题库 runtime cache，独立于外壳版本，
          // 外壳更新不应清空它（题库新旧由 manifest rev 校验管理，检查更新时可单独清）
          return k.indexOf('bioquest-cache-') === 0 && k !== CACHE_NAME;
        }).map(function (k) {
          return caches.delete(k).catch(function () {});
        })
      );
    }).then(function () {
      // 立即接管所有 clients，避免"首次加载后需要刷新才有 SW"
      if (self.clients && self.clients.claim) {
        try { return self.clients.claim(); } catch (e) { return Promise.resolve(); }
      }
      return Promise.resolve();
    }).then(function () {
      // claim 之后立刻启动异步预热（不阻塞 activate 事件完成）
      setTimeout(warmupCache, 1000);
    })
  );
});

// ==================== 请求拦截：Cache First + Network Fallback ====================

/* P1-4 逃生通道：缓存损坏时全清 + 硬刷新。
 * 若 Cache Storage 数据损坏导致 caches.match 抛错（表现为资源加载异常、
 * 反复 404/JSON 解析失败等灵异问题），清空全部缓存并强制刷新页面，
 * 避免"坏缓存"被反复命中。 */
function handleCacheCorruption() {
  console.warn('[SW] 检测到缓存损坏，清空全部缓存并硬刷新');
  return caches.keys().then(function (keys) {
    return Promise.all(
      keys.map(function (k) { return caches.delete(k).catch(function () {}); })
    );
  }).then(function () {
    try { self.skipWaiting(); } catch (e) {}
    if (self.clients && self.clients.matchAll) {
      return self.clients.matchAll({ type: 'window' }).then(function (clients) {
        clients.forEach(function (c) {
          if (c && c.navigate) { try { c.navigate(c.url); } catch (e) {} }
        });
      });
    }
    return Promise.resolve();
  });
}

// 缓存匹配的"安全包装"：match 抛错视为缓存损坏，走全清逃生通道
function safeCacheMatch(request) {
  return caches.match(request).catch(function () {
    return handleCacheCorruption();
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  // 忽略非 http(s) 请求
  var url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 策略 1: 页面导航 - 网络优先，回退到离线页面（Issue #16：断网刷新仍可用）
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
          return safeCacheMatch(request).then(function (cached) {
            if (cached) return cached;
            return caches.match('./index.html').then(function (shell) {
              return shell || new Response('<h1>离线</h1><p>暂无缓存，请联网后重试</p>', {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              });
            });
          });
        })
    );
    return;
  }

  // 策略 2（Issue #16）：题库/数据 JSON - 网络优先 + 独立 DATA_CACHE 回退
  // data/* 走 runtime cache（每次校验 manifest 的新鲜度由页面层 SHA 校验保证），
  // jsDelivr CDN URL 因含 commit 锚点天然不可变 → 缓存优先即可。
  if (url.pathname.endsWith('.json') || url.hostname === 'cdn.jsdelivr.net') {
    var isCdn = url.hostname === 'cdn.jsdelivr.net';
    // 缓存键归一化（与策略 3 CSS/JS 一致）：同源 JSON 剥离 ?v= 缓存破坏参数。
    // loader「检查更新」以 data/manifest.json?v=<时间戳> 拉新鲜 manifest，
    // 若按原始 URL 落缓存，每次检查都会在 DATA_CACHE 积累一条只差时间戳的条目。
    // 归一化后所有 ?v= 变体共享同一条目，离线回退也能命中预缓存的无参数版本。
    var dataUrl = new URL(request.url);
    dataUrl.search = '';
    var cacheKey = isCdn ? request : new Request(dataUrl.toString(), { mode: request.mode, credentials: request.credentials });
    event.respondWith(
      safeCacheMatch(cacheKey).then(function (cached) {
        // CDN 版本化 URL：缓存优先（长缓存）；同源 data JSON：网络优先
        if (isCdn && cached) return cached;
        return fetch(request).then(function (response) {
          if (response && response.ok) {
            var clone = response.clone();
            caches.open(isCdn ? DATA_CACHE_NAME : (url.pathname.indexOf('/data/') !== -1 ? DATA_CACHE_NAME : CACHE_NAME)).then(function (cache) {
              cache.put(cacheKey, clone);
            });
          }
          return response;
        }).catch(function () {
          return cached || new Response('{"error":"offline"}', {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
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
      safeCacheMatch(assetRequest).then(function (cached) {
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
      safeCacheMatch(request).then(function (cached) {
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
    safeCacheMatch(request).then(function (cached) {
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

// ==================== 消息处理：手动触发更新 / 版本查询 / 题库缓存清理（Issue #16） ====================
function purgeDataCaches() {
  return caches.keys().then(function (keys) {
    return Promise.all(
      keys.filter(function (k) { return k === DATA_CACHE_NAME || k.indexOf('bioquest-data-') === 0; })
        .map(function (k) { return caches.delete(k).catch(function () {}); })
    );
  });
}

self.addEventListener('message', function (event) {
  var data = event.data;
  // 兼容旧协议：纯字符串 SKIP_WAITING
  if (data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (!data || typeof data !== 'object') return;

  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      // 「检查更新」：返回外壳版本 + 题库缓存大小，供 UI 比对展示
      if (event.source) {
        event.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
      }
      break;
    case 'PURGE_DATA_CACHE':
      // 「检查更新」发现题库新版本：清空题库 runtime cache，页面重取后自然落新缓存
      event.waitUntil(purgeDataCaches().then(function () {
        if (event.source) {
          event.source.postMessage({ type: 'DATA_CACHE_PURGED' });
        }
      }));
      break;
    default:
      break;
  }
});
