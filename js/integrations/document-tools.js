/**
 * BioQuest — 文档处理集成模块（mammoth + PDF.js）
 * 功能：
 *   - 从 .docx 提取纯文本/HTML
 *   - 从 .pdf 提取文本（按页）
 *   - 在 canvas 渲染 PDF 指定页
 * 依赖：js/vendor/mammoth.browser.min.js -> window.mammoth
 *       js/vendor/pdf.min.js -> window.pdfjsLib（worker 在 vendor-init.js 配置）
 */
(function () {
  'use strict';

  function ensureMammoth() {
    if (typeof window.mammoth === 'undefined') {
      console.warn('[DocumentTools] mammoth 未加载');
      return false;
    }
    return true;
  }

  function ensurePDFJS() {
    if (typeof window.pdfjsLib === 'undefined') {
      console.warn('[DocumentTools] pdfjsLib 未加载');
      return false;
    }
    // 确保 worker 已配置
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js?v=20260723d';
      } catch (e) {}
    }
    return true;
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('文件读取失败')); };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 从 .docx 提取纯文本
   * @param {File} file
   * @returns {Promise<{ text:string, html:string, messages:Array }>}
   */
  function extractWord(file) {
    if (!ensureMammoth()) {
      return Promise.reject(new Error('Word 解析库未加载'));
    }
    if (!file) return Promise.reject(new Error('未提供文件'));
    return readFileAsArrayBuffer(file).then(function (buf) {
      return window.mammoth.convertToHtml({ arrayBuffer: buf });
    }).then(function (result) {
      // 去标签得到纯文本
      var text = stripHtml(result.value || '');
      return { text: text, html: result.value || '', messages: result.messages || [] };
    });
  }

  /**
   * 从 .pdf 提取文本（按页）
   * @param {File} file
   * @param {object} opts { maxPages }
   * @returns {Promise<{ pages:string[], numPages:number }>}
   */
  function extractPdf(file, opts) {
    if (!ensurePDFJS()) {
      return Promise.reject(new Error('PDF 解析库未加载'));
    }
    if (!file) return Promise.reject(new Error('未提供文件'));
    opts = opts || {};
    var maxPages = opts.maxPages || 100;

    return readFileAsArrayBuffer(file).then(function (buf) {
      var loadingTask = window.pdfjsLib.getDocument({ data: buf });
      return loadingTask.promise;
    }).then(function (pdf) {
      var numPages = Math.min(pdf.numPages, maxPages);
      var pages = [];
      var chain = Promise.resolve();
      for (var i = 1; i <= numPages; i++) {
        (function (pageNum) {
          chain = chain.then(function () {
            return pdf.getPage(pageNum);
          }).then(function (page) {
            return page.getTextContent();
          }).then(function (textContent) {
            var text = (textContent.items || []).map(function (it) { return it.str || ''; }).join(' ');
            pages.push(text);
          }).catch(function (err) {
            console.warn('[DocumentTools] PDF 第 ' + pageNum + ' 页解析失败:', err);
            pages.push('');
          });
        })(i);
      }
      return chain.then(function () {
        return { pages: pages, numPages: pdf.numPages };
      });
    });
  }

  /**
   * 渲染 PDF 指定页到 canvas
   * @param {string} canvasId
   * @param {ArrayBuffer} arrayBuffer
   * @param {number} pageNum 从 1 开始
   * @param {object} opts { scale }
   * @returns {Promise<{ width:number, height:number }>}
   */
  function renderPdfPage(canvasId, arrayBuffer, pageNum, opts) {
    if (!ensurePDFJS()) return Promise.reject(new Error('PDF 解析库未加载'));
    var canvas = document.getElementById(canvasId);
    if (!canvas) return Promise.reject(new Error('canvas 不存在: ' + canvasId));
    opts = opts || {};
    var scale = opts.scale || 1.5;

    return window.pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(function (pdf) {
      return pdf.getPage(pageNum);
    }).then(function (page) {
      var viewport = page.getViewport({ scale: scale });
      var context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      return page.render({ canvasContext: context, viewport: viewport }).promise.then(function () {
        return { width: viewport.width, height: viewport.height };
      });
    });
  }

  /**
   * 加载完整 PDF 文档对象（用于翻页）
   * @param {File|ArrayBuffer} input
   * @returns {Promise<{ pdf, numPages, renderPage }>}
   */
  function loadPdf(input) {
    if (!ensurePDFJS()) return Promise.reject(new Error('PDF 解析库未加载'));
    var promise;
    if (input instanceof ArrayBuffer) promise = Promise.resolve(input);
    else promise = readFileAsArrayBuffer(input);
    return promise.then(function (buf) {
      return window.pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (pdf) {
      return {
        pdf: pdf,
        numPages: pdf.numPages,
        renderPage: function (canvasId, pageNum, opts) {
          return renderPdfPage(canvasId, buf, pageNum, opts);
        }
      };
    });
  }

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * 通用提取：根据扩展名自动分发
   * @param {File} file
   * @returns {Promise<{ text:string, type:string, pages?:string[], numPages?:number }>}
   */
  function extract(file) {
    if (!file) return Promise.reject(new Error('未提供文件'));
    var name = (file.name || '').toLowerCase();
    if (name.endsWith('.docx')) {
      return extractWord(file).then(function (r) {
        return { text: r.text, type: 'docx' };
      });
    } else if (name.endsWith('.pdf')) {
      return extractPdf(file).then(function (r) {
        return { text: r.pages.join('\n\n'), type: 'pdf', pages: r.pages, numPages: r.numPages };
      });
    } else if (name.endsWith('.txt') || name.endsWith('.md')) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
          resolve({ text: String(reader.result || ''), type: name.endsWith('.md') ? 'md' : 'txt' });
        };
        reader.onerror = function () { reject(new Error('文本文件读取失败')); };
        reader.readAsText(file);
      });
    } else {
      return Promise.reject(new Error('不支持的文件类型: ' + name));
    }
  }

  /**
   * 文档处理模块对外接口，提供 .docx/.pdf 文本提取与 PDF 页面渲染能力，并暴露依赖可用性检测。
   * @type {Object}
   */
  window.DocumentTools = {
    extractWord: extractWord,
    extractPdf: extractPdf,
    renderPdfPage: renderPdfPage,
    loadPdf: loadPdf,
    extract: extract,
    isMammothAvailable: ensureMammoth,
    isPDFAvailable: ensurePDFJS
  };
})();
