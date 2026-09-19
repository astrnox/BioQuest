/**
 * 旧内核浏览器降级（同步执行，纯 ES5 语法 —— 老内核浏览器必须能解析本文件）。
 *
 * 触发条件（由 js/core/legacy-probe.js 探测）：
 *  - legacy-probe.js 整体解析失败（老内核不支持 ?. / ?? / 展开 / async 等语法）
 *    → window.__bqProbeParsed 保持 undefined；
 *  - 或语法能解析但关键 API 不齐（无 fetch / AbortController / Map 等）
 *    → window.__bqModern === false。
 *
 * 降级行为：
 *  1. 摘除首屏遮罩 —— boot-mask.js 找不到 #bq-boot-mask 会直接返回，
 *     不会再显示"进度条/加载失败重试卡"，避免遮罩永久盖住静态内容；
 *  2. 给 <html> 加 .bq-legacy 标记，配合注入的内联样式隐藏依赖 JS 渲染的区域；
 *  3. 在页面顶部插入一条静态提示（纯内联样式，不依赖 CSS 变量/现代布局），
 *     告知用户升级浏览器，并提供"继续浏览"按钮。
 *
 * 注意：本文件不得使用 eval / new Function（CSP 已移除 unsafe-eval），
 *      也不得使用任何现代语法/API。
 */
(function () {
  // 现代浏览器：探针正常解析且 API 齐备 → 交给完整应用，不做任何事。
  if (window.__bqProbeParsed && window.__bqModern) return;

  try {
    var docEl = document.documentElement;
    if (docEl && docEl.className.indexOf('bq-legacy') === -1) {
      docEl.className = (docEl.className + ' bq-legacy').replace(/^\s+/, '');
    }

    // ① 摘除首屏遮罩（boot-mask.js 找不到遮罩会直接 return）
    var mask = document.getElementById('bq-boot-mask');
    if (mask && mask.parentNode) mask.parentNode.removeChild(mask);

    // ② 隐藏依赖 JS 渲染/尚未就绪的区域（仅 .bq-legacy 生效）
    //    style-src 保留 'unsafe-inline'，此处注入内联样式合法且不触犯 CSP。
    var style = document.createElement('style');
    style.type = 'text/css';
    style.textContent =
      '.bq-legacy .countdown-banner,' +
      '.bq-legacy .announcement-banner,' +
      '.bq-legacy .daily-question-section,' +
      '.bq-legacy .ach-home-section{display:none !important;}';
    if (document.head) document.head.appendChild(style);

    // ③ 顶部静态提示条（纯内联样式）
    if (document.body) {
      var notice = document.createElement('div');
      notice.id = 'bq-legacy-notice';
      notice.setAttribute('role', 'status');
      notice.style.cssText =
        'box-sizing:border-box;position:relative;z-index:9999;margin:0;padding:12px 16px;' +
        'background:#fdf3e3;border-bottom:1px solid #e8cfa0;color:#5a4320;' +
        'font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;' +
        'font-size:14px;line-height:1.6;text-align:center;';

      var text = document.createElement('span');
      text.textContent =
        '当前浏览器内核较旧，无法完整运行 BioQuest。' +
        '建议升级系统浏览器，或改用 Chrome / Edge / Safari 等现代浏览器访问，以获得完整功能。';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '我知道了，继续浏览';
      btn.style.cssText =
        'margin-left:10px;border:1px solid #c4956a;background:#fff;color:#5a4320;' +
        'border-radius:14px;padding:4px 14px;font-size:13px;cursor:pointer;vertical-align:middle;';

      notice.appendChild(text);
      notice.appendChild(btn);
      document.body.insertBefore(notice, document.body.firstChild);

      btn.addEventListener('click', function () {
        if (notice.parentNode) notice.parentNode.removeChild(notice);
      });
    }
  } catch (e) {
    // 降级自身失败也不能再抛异常，避免影响页面其余部分
  }
})();
