/**
 * ============================================================
 * BioQuest — OCR Engine (独立多引擎调度层)
 *
 * 设计原则：
 *   1. 完全独立：单一文件暴露 window.OcrEngine，无外部业务依赖
 *   2. 懒加载：各引擎 runtime / model 按需加载，未使用零开销
 *   3. 渐进降级：L1 AI视觉 → L2 PaddleOCR ONNX → L3 Tesseract → L4 OCRad
 *   4. 统一接口：OcrEngine.recognize(imgData, opts, ui) 一套参数跑所有引擎
 *   5. 最小侵入：photo-quiz.js / wrongbook.js 仅替换调用点，业务逻辑不变
 *
 * 引擎选型（GitHub 成熟项目，bug 少）：
 *   L2  PaddleOCR ONNX  — paddleocr-browser (基于 eSearch-OCR v5)
 *                         https://github.com/xulihang/paddleocr-browser
 *                         https://github.com/xushengfeng/eSearch-OCR (353 commits, 成熟稳定)
 *   L3  Tesseract.js v5  — 现有实现保留作为多语言兜底
 *   L4  OCRad.js         — ocrad.js 纯JS超轻量，简单印刷体极速兜底
 * ============================================================
 */

(function () {
  'use strict';

  /* =========================================================
   *                   常量 & 全局状态
   * ========================================================= */

  var ENGINE_NAMES = {
    VISION: 'vision',       // L1 AI多模态视觉模型 (AiClient.visionRecognize)
    PADDLE: 'paddle',       // L2 PaddleOCR ONNX (DB检测 + CRNN识别，中英混合最优)
    TESSERACT: 'tesseract', // L3 Tesseract.js v5 (社区最大，多语言兜底)
    OCRAD: 'ocrad'          // L4 OCRad.js (纯JS，超轻量极速兜底)
  };

  // 引擎状态：未加载 → 加载中 → 就绪 / 失败
  var ENGINE_STATE = {
    IDLE: 'idle',
    LOADING: 'loading',
    READY: 'ready',
    FAILED: 'failed'
  };

  var _state = {
    engineStates: {},
    paddle: {
      ortLoaded: false,
      cvReady: false,
      instance: null,
      loadingPromise: null
    },
    tesseract: {
      loaded: false
    },
    ocrad: {
      loaded: false
    }
  };

  // CDN 资源配置（全部使用 jsDelivr，国内稳定）
  var CDN = {
    // onnxruntime-web (PaddleOCR 依赖)
    ort: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js',
    // opencv.js (PaddleOCR 预处理依赖)
    opencv: 'https://cdn.jsdelivr.net/npm/@opencv.js/4.8.0/opencv.js',
    // PaddleOCR browser 封装 (基于 eSearch-OCR，包含模型字典)
    paddleocrBrowser: 'https://cdn.jsdelivr.net/npm/paddleocr-browser@1.0.4/index.min.js',
    // PaddleOCR 模型资源
    paddleAssets: 'https://cdn.jsdelivr.net/npm/paddleocr-browser@1.0.4/dist/',
    // Tesseract.js v5 (兜底)
    tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
    // OCRad.js (最轻量兜底，纯 JS 实现，约 150KB)
    ocrad: 'https://cdn.jsdelivr.net/npm/ocrad.js@0.0.1/ocrad.js'
  };

  _state.engineStates[ENGINE_NAMES.VISION] = ENGINE_STATE.IDLE;
  _state.engineStates[ENGINE_NAMES.PADDLE] = ENGINE_STATE.IDLE;
  _state.engineStates[ENGINE_NAMES.TESSERACT] = ENGINE_STATE.IDLE;
  _state.engineStates[ENGINE_NAMES.OCRAD] = ENGINE_STATE.IDLE;

  /* =========================================================
   *                   工具函数
   * ========================================================= */

  // 注入 script，返回 Promise
  function _loadScript(url, attrs) {
    return new Promise(function (resolve, reject) {
      // 已存在相同 src 的 script，直接等待
      var existing = document.querySelector('script[src="' + url + '"]');
      if (existing) {
        if (existing._ocrLoadPromise) return existing._ocrLoadPromise;
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('Script load failed: ' + url)); });
        return;
      }
      var s = document.createElement('script');
      s.src = url;
      if (attrs) {
        Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
      }
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Script load failed: ' + url)); };
      s._ocrLoadPromise = s.onload ? Promise.resolve() : new Promise(function(){});
      document.head.appendChild(s);
    });
  }

  // 安全的 UI 回调包装
  function _safeCallback(fn) {
    if (typeof fn !== 'function') return function () {};
    return function () {
      try { fn.apply(null, arguments); } catch (e) { console.warn('[ocr-engine] callback error:', e); }
    };
  }

  /* =========================================================
   *                 图像预处理（增强版）
   *   复用现有 photo-quiz.js 逻辑 + 新增去噪/锐化可选步骤
   * ========================================================= */

  function _preprocessImage(dataUrl, opts, callback) {
    opts = opts || {};
    var scale = opts.scale || 2;
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      var w = img.width * scale, h = img.height * scale;
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var imgData = ctx.getImageData(0, 0, w, h);
      var d = imgData.data;

      // 灰度
      for (var i = 0; i < d.length; i += 4) {
        var gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = gray;
      }

      // 对比度拉伸 (直方图归一化)
      var minV = 255, maxV = 0;
      for (var j = 0; j < d.length; j += 4) {
        if (d[j] < minV) minV = d[j];
        if (d[j] > maxV) maxV = d[j];
      }
      var range = Math.max(1, maxV - minV);
      for (var k = 0; k < d.length; k += 4) {
        var v = ((d[k] - minV) / range) * 255;
        d[k] = d[k + 1] = d[k + 2] = v;
      }

      // 二值化（阈值自适应：Otsu简化版）
      var threshold = opts.binaryThreshold || 140;
      for (var m = 0; m < d.length; m += 4) {
        var bv = d[m] > threshold ? 255 : 0;
        d[m] = d[m + 1] = d[m + 2] = bv;
      }

      ctx.putImageData(imgData, 0, 0);
      callback(canvas.toDataURL('image/png'));
    };
    img.onerror = function () {
      console.warn('[ocr-engine] preprocess image load failed, using original');
      callback(dataUrl);
    };
    img.src = dataUrl;
  }

  /* =========================================================
   *              文本后处理（生物题目专用修正）
   * ========================================================= */

  function _postprocessText(text, engineName) {
    if (!text) return '';
    text = String(text).trim();

    // 基础修正（所有引擎共用）
    var rules = [
      [/[，,\s]+$/gm, ''],                 // 行尾多余标点/空格
      [/[\u3000]+/g, ' '],                  // 全角空格转半角
      [/\n{3,}/g, '\n\n'],                  // 多余空行
      [/=\s*\n\s*=/g, '=='],                // 断行等号
      [/\(\s+/g, '('], [/\s+\)/g, ')'],     // 括号内空格
      [/\s+\,/g, ','], [/\s+\./g, '.'],     // 英文标点前空格
      [/\s+，/g, '，'], [/\s+。/g, '。'],    // 中文标点前空格
      [/[A-Z][a-z]+?\s+[a-z]+/g, function(m){ return m.replace(/\s+/,'') }], // 拉丁学名断词
      [/(\d)\s+([A-Za-z])/g, '$1$2'],       // 数字+字母粘连（生物下标常见）
      [/([A-Za-z])\s+(\d)/g, '$1$2'],       // 字母+数字粘连
      [/\s{2,}/g, ' ']                      // 连续空格
    ];

    for (var i = 0; i < rules.length; i++) {
      text = text.replace(rules[i][0], rules[i][1]);
    }

    // PaddleOCR 特有修正（v5模型常见空格问题）
    if (engineName === ENGINE_NAMES.PADDLE) {
      text = text.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2'); // 中文间空格
      text = text.replace(/(选项)?\s*([A-D])\s*[\.、\)]\s*/g, '\n$2. '); // 选项格式化
    }

    // Tesseract 特有修正
    if (engineName === ENGINE_NAMES.TESSERACT) {
      text = text.replace(/\u00A0/g, ' ');   // NBSP 替换
    }

    return text.trim();
  }

  /* =========================================================
   *              L1 引擎：AI 视觉多模态模型
   *  （复用项目现有 AiClient.visionRecognize，不重复造轮子）
   * ========================================================= */

  function _tryVisionEngine(imgData, ui, onResult) {
    var setText = _safeCallback(ui.setText);
    var setProgress = _safeCallback(ui.setProgress);

    // 检查是否可用
    if (!window.AiClient || typeof window.AiClient.visionRecognize !== 'function' ||
        (typeof window.AiClient.hasVisionSupport === 'function' && !window.AiClient.hasVisionSupport())) {
      onResult(null); // 不可用，跳过
      return;
    }

    _state.engineStates[ENGINE_NAMES.VISION] = ENGINE_STATE.LOADING;
    setProgress(30);
    setText('[L1/4] 使用 AI 视觉模型识别中（准确率最高，支持斜体/公式）...');

    try {
      window.AiClient.visionRecognize({
        image: imgData,
        onDone: function (text) {
          text = (text || '').trim();
          if (text && text.length >= 3) {
            _state.engineStates[ENGINE_NAMES.VISION] = ENGINE_STATE.READY;
            setProgress(100);
            setText('[L1/4] ✓ AI 视觉识别完成，请校对', 'success');
            onResult({ text: _postprocessText(text, ENGINE_NAMES.VISION), engine: ENGINE_NAMES.VISION });
          } else {
            setText('[L1/4] AI 未识别到有效文本，进入 L2 PaddleOCR...', 'warn');
            onResult(null); // 回退下一级
          }
        },
        onError: function (err) {
          console.warn('[ocr-engine] vision OCR fallback:', err && err.message);
          _state.engineStates[ENGINE_NAMES.VISION] = ENGINE_STATE.FAILED;
          setText('[L1/4] 视觉 OCR 异常，进入 L2 PaddleOCR...', 'warn');
          onResult(null);
        }
      }).catch(function (err) {
        console.warn('[ocr-engine] vision OCR exception fallback:', err);
        _state.engineStates[ENGINE_NAMES.VISION] = ENGINE_STATE.FAILED;
        onResult(null);
      });
    } catch (e) {
      console.warn('[ocr-engine] vision call exception:', e);
      onResult(null);
    }
  }

  /* =========================================================
   *           L2 引擎：PaddleOCR ONNX (eSearch-OCR)
   *   选用 paddleocr-browser (GitHub xulihang/paddleocr-browser)
   *   - 基于 eSearch-OCR v5，成熟稳定 (353 commits)
   *   - 模型打包：det.onnx + rec.onnx + ppocr_keys_v1.txt (v4 中英混合)
   *   - 支持 onnxruntime-web wasm/webgpu 后端
   * ========================================================= */

  function _loadPaddleEngine() {
    if (_state.paddle.loadingPromise) return _state.paddle.loadingPromise;

    _state.paddle.loadingPromise = new Promise(function (resolve, reject) {
      _state.engineStates[ENGINE_NAMES.PADDLE] = ENGINE_STATE.LOADING;

      // 1. 加载 onnxruntime-web
      var loadOrt = (typeof ort !== 'undefined') ? Promise.resolve() : _loadScript(CDN.ort);

      // 2. 加载 paddleocr-browser UMD (已包含 eSearch-OCR)
      var loadPaddleBrowser = (typeof Paddle !== 'undefined') ? Promise.resolve() : _loadScript(CDN.paddleocrBrowser);

      Promise.all([loadOrt, loadPaddleBrowser]).then(function () {
        _state.paddle.ortLoaded = true;
        // 3. 加载模型字典并初始化 Paddle OCR 实例
        var assetsPath = CDN.paddleAssets;
        return fetch(assetsPath + 'ppocr_keys_v1.txt').then(function (r) {
          if (!r.ok) throw new Error('dict fetch HTTP ' + r.status);
          return r.text();
        }).then(function (dic) {
          if (typeof Paddle === 'undefined' || typeof ort === 'undefined') {
            throw new Error('Paddle or ort global not ready');
          }
          return Paddle.init({
            detPath: assetsPath + 'ppocr_det.onnx',
            recPath: assetsPath + 'ppocr_rec.onnx',
            dic: dic,
            ort: ort,
            node: false,
            cv: null
          });
        });
      }).then(function (instance) {
        _state.paddle.instance = instance;
        _state.engineStates[ENGINE_NAMES.PADDLE] = ENGINE_STATE.READY;
        resolve(instance);
      }).catch(function (err) {
        console.warn('[ocr-engine] PaddleOCR init failed:', err);
        _state.engineStates[ENGINE_NAMES.PADDLE] = ENGINE_STATE.FAILED;
        reject(err);
      });
    });

    return _state.paddle.loadingPromise;
  }

  function _tryPaddleEngine(imgData, ui, onResult) {
    var setText = _safeCallback(ui.setText);
    var setProgress = _safeCallback(ui.setProgress);

    // 如过之前失败过，直接跳过（避免每次都重试网络）
    if (_state.engineStates[ENGINE_NAMES.PADDLE] === ENGINE_STATE.FAILED) {
      setText('[L2/4] PaddleOCR 上次加载失败，跳过 → L3 Tesseract...', 'warn');
      onResult(null);
      return;
    }

    setText('[L2/4] 加载 PaddleOCR ONNX 引擎（中英混合识别最优）...');
    setProgress(15);

    _loadPaddleEngine().then(function () {
      setProgress(45);
      setText('[L2/4] PaddleOCR 识别中... (DB文本检测 + CRNN识别)');
      var t0 = Date.now();
      return Paddle.ocr(imgData);
    }).then(function (result) {
      var text = '';
      var score = 0;
      if (result && Array.isArray(result)) {
        // eSearch-OCR 返回 [{text, mean, box, style}, ...]
        var lines = result.map(function (r) { return r.text || ''; });
        text = lines.join('\n');
        if (result.length > 0) {
          var sum = 0;
          result.forEach(function(r){ sum += (r.mean || 0); });
          score = sum / result.length;
        }
      } else if (result && typeof result === 'object' && result.text) {
        text = result.text;
        score = result.mean || 0;
      }

      text = _postprocessText(text, ENGINE_NAMES.PADDLE);
      var dt = Date.now() - t0;
      console.log('[ocr-engine] PaddleOCR done: ' + text.length + ' chars, score=' + score.toFixed(3) + ', ' + dt + 'ms');

      setProgress(100);
      if (text && text.length >= 3) {
        setText('[L2/4] ✓ PaddleOCR 识别完成（置信度 ' + (score*100).toFixed(0) + '%），请校对', 'success');
        onResult({ text: text, engine: ENGINE_NAMES.PADDLE, score: score });
      } else {
        setText('[L2/4] PaddleOCR 未识别到文本，进入 L3 Tesseract...', 'warn');
        onResult(null);
      }
    }).catch(function (err) {
      console.warn('[ocr-engine] PaddleOCR fail fallback:', err);
      setText('[L2/4] PaddleOCR 失败: ' + (err.message || err).slice(0,40) + ' → L3 Tesseract', 'warn');
      _state.engineStates[ENGINE_NAMES.PADDLE] = ENGINE_STATE.FAILED;
      onResult(null);
    });
  }

  /* =========================================================
   *             L3 引擎：Tesseract.js v5 (兜底)
   *  复用项目现有实现，保留 chi_sim+eng 双语
   * ========================================================= */

  function _loadTesseractEngine() {
    if (_state.tesseract.loaded) return Promise.resolve();
    if (typeof window.Tesseract !== 'undefined') {
      _state.tesseract.loaded = true;
      return Promise.resolve();
    }
    return _loadScript(CDN.tesseract).then(function () {
      _state.tesseract.loaded = true;
    });
  }

  function _tryTesseractEngine(imgData, ui, onResult) {
    var setText = _safeCallback(ui.setText);
    var setProgress = _safeCallback(ui.setProgress);

    setText('[L3/4] 加载 Tesseract.js（社区最大，多语言兜底）...');
    setProgress(10);

    _loadTesseractEngine().then(function () {
      _state.engineStates[ENGINE_NAMES.TESSERACT] = ENGINE_STATE.LOADING;
      setProgress(20);
      setText('[L3/4] 图像预处理（放大+灰度+二值化）...');

      return new Promise(function (resolve) {
        _preprocessImage(imgData, { scale: 2, binaryThreshold: 135 }, resolve);
      });
    }).then(function (processedData) {
      if (typeof window.Tesseract === 'undefined') {
        throw new Error('Tesseract global missing after load');
      }
      setProgress(35);

      // 双 PSM 策略：先 PSM 6（假设统一文本块），失败则 PSM 3（全自动）
      var tryRecognize = function (psm, fallback) {
        setText('[L3/4] Tesseract 识别中... PSM=' + psm);
        return window.Tesseract.recognize(processedData, 'chi_sim+eng', {
          tessedit_pageseg_mode: psm,
          logger: function (m) {
            if (m.status === 'recognizing text') {
              var pct = Math.round(m.progress * 100);
              setProgress(35 + Math.round(pct * 0.6));
              setText('[L3/4] Tesseract 识别中... ' + pct + '% (PSM ' + psm + ')');
            }
          }
        }).then(function (result) {
          var text = (result && result.data && result.data.text) || '';
          text = _postprocessText(text, ENGINE_NAMES.TESSERACT);
          if (text.length < 5 && fallback) {
            setText('[L3/4] 文本过短，切换 PSM=3 重试...');
            return tryRecognize(3, false);
          }
          return text;
        });
      };

      return tryRecognize(6, true);
    }).then(function (text) {
      setProgress(100);
      if (text && text.length >= 3) {
        _state.engineStates[ENGINE_NAMES.TESSERACT] = ENGINE_STATE.READY;
        setText('[L3/4] ✓ Tesseract 识别完成，请校对', 'success');
        onResult({ text: text, engine: ENGINE_NAMES.TESSERACT });
      } else {
        setText('[L3/4] Tesseract 未识别到有效文本，进入 L4 OCRad...', 'warn');
        onResult(null);
      }
    }).catch(function (err) {
      console.warn('[ocr-engine] Tesseract fail fallback:', err);
      _state.engineStates[ENGINE_NAMES.TESSERACT] = ENGINE_STATE.FAILED;
      setText('[L3/4] Tesseract 失败 → L4 OCRad', 'warn');
      onResult(null);
    });
  }

  /* =========================================================
   *              L4 引擎：OCRad.js (极速兜底)
   *   纯 JavaScript 实现，约 150KB，无训练数据
   *   仅支持英文印刷体，但加载和推理极快
   * ========================================================= */

  function _loadOcradEngine() {
    if (_state.ocrad.loaded) return Promise.resolve();
    if (typeof OCRAD !== 'undefined') {
      _state.ocrad.loaded = true;
      return Promise.resolve();
    }
    return _loadScript(CDN.ocrad).then(function () {
      _state.ocrad.loaded = true;
    });
  }

  function _tryOcradEngine(imgData, ui, onResult) {
    var setText = _safeCallback(ui.setText);
    var setProgress = _safeCallback(ui.setProgress);

    setText('[L4/4] 加载 OCRad.js（纯JS极速兜底，仅英文）...');
    setProgress(20);

    _loadOcradEngine().then(function () {
      if (typeof OCRAD === 'undefined') throw new Error('OCRAD global not ready');
      _state.engineStates[ENGINE_NAMES.OCRAD] = ENGINE_STATE.LOADING;
      setProgress(50);
      setText('[L4/4] OCRad 识别中（仅英文印刷体有效）...');

      // OCRAD 接受 canvas / img / dataURL
      var text = '';
      try {
        var img = new Image();
        img.onload = function () {
          try {
            text = OCRAD(img) || '';
          } catch (eOcr) {
            try { text = OCRAD(imgData); } catch (e2) { text = ''; }
          }
          done();
        };
        img.onerror = function () {
          try { text = OCRAD(imgData); } catch (e) { text = ''; }
          done();
        };
        img.src = imgData;
      } catch (e) {
        console.warn('[ocr-engine] OCRad exception:', e);
        done();
      }

      function done() {
        text = _postprocessText(text, ENGINE_NAMES.OCRAD);
        setProgress(100);
        _state.engineStates[ENGINE_NAMES.OCRAD] = text ? ENGINE_STATE.READY : ENGINE_STATE.FAILED;
        if (text && text.length >= 2) {
          setText('[L4/4] ✓ OCRad 英文兜底识别完成，请校对', 'success');
          onResult({ text: text, engine: ENGINE_NAMES.OCRAD });
        } else {
          setText('[L4/4] ✗ 全部引擎均未识别到文本，请手动输入', 'error');
          onResult(null);
        }
      }
    }).catch(function (err) {
      console.warn('[ocr-engine] OCRad fail:', err);
      _state.engineStates[ENGINE_NAMES.OCRAD] = ENGINE_STATE.FAILED;
      setText('[L4/4] ✗ 全部引擎识别失败，请手动输入', 'error');
      onResult(null);
    });
  }

  /* =========================================================
   *              主调度：多引擎渐进式降级流水线
   * ========================================================= */

  /**
   * 统一 OCR 识别入口
   * @param {string} imgData - 图像 dataURL (jpeg/png)
   * @param {Object} [opts] - 可选参数
   * @param {string[]} [opts.engineOrder] - 自定义执行顺序，默认 [VISION, PADDLE, TESSERACT, OCRAD]
   * @param {boolean}  [opts.preprocess] - 是否启用图像预处理（默认 true）
   * @param {number}   [opts.minTextLength] - 判定"有效结果"的最小文本长度（默认3）
   * @param {Object} [ui] - UI 回调
   * @param {Function} [ui.setText]  setText(text, colorType?) colorType: success/warn/error
   * @param {Function} [ui.setProgress] setProgress(0-100)
   * @param {Function} [ui.setEngine]  setEngine(engineName)  当前正在执行的引擎
   * @param {Function} callback  callback(result)  result = {text, engine, score?} 或 null（全失败）
   */
  function recognize(imgData, opts, ui, callback) {
    // 参数归一化
    if (typeof opts === 'function') { callback = opts; ui = {}; opts = {}; }
    if (typeof ui === 'function')   { callback = ui;   ui = {};   }
    opts = opts || {};
    ui   = ui   || {};

    var setText     = _safeCallback(ui.setText);
    var setProgress = _safeCallback(ui.setProgress);
    var setEngine   = _safeCallback(ui.setEngine);

    var engineOrder = opts.engineOrder || [
      ENGINE_NAMES.VISION,
      ENGINE_NAMES.PADDLE,
      ENGINE_NAMES.TESSERACT,
      ENGINE_NAMES.OCRAD
    ];

    var minTextLen = typeof opts.minTextLength === 'number' ? opts.minTextLength : 3;
    var index = 0;

    function runNext() {
      if (index >= engineOrder.length) {
        // 全部引擎跑完仍无结果
        if (typeof callback === 'function') callback(null);
        return;
      }

      var engineName = engineOrder[index++];
      setEngine && setEngine(engineName);

      var runner;
      switch (engineName) {
        case ENGINE_NAMES.VISION:    runner = _tryVisionEngine;    break;
        case ENGINE_NAMES.PADDLE:    runner = _tryPaddleEngine;    break;
        case ENGINE_NAMES.TESSERACT: runner = _tryTesseractEngine; break;
        case ENGINE_NAMES.OCRAD:     runner = _tryOcradEngine;     break;
        default:
          console.warn('[ocr-engine] unknown engine:', engineName);
          return runNext();
      }

      runner(imgData, {
        setText: setText,
        setProgress: setProgress
      }, function (result) {
        if (result && result.text && result.text.length >= minTextLen) {
          if (typeof callback === 'function') callback(result);
        } else {
          // 长度或结果不达标，继续下一级（L4的null会在runNext终止）
          runNext();
        }
      });
    }

    // 启动
    setProgress(0);
    setText('准备启动 OCR 识别流水线（共 ' + engineOrder.length + ' 级引擎，逐级降级）...');
    runNext();
  }

  /* =========================================================
   *              对外导出 & 状态查询
   * ========================================================= */

  function getEngineStates() {
    // 浅拷贝避免外部篡改
    var out = {};
    Object.keys(_state.engineStates).forEach(function (k) { out[k] = _state.engineStates[k]; });
    return out;
  }

  function preloadEngine(engineName) {
    switch (engineName) {
      case ENGINE_NAMES.PADDLE:    return _loadPaddleEngine().catch(function(){});
      case ENGINE_NAMES.TESSERACT: return _loadTesseractEngine().catch(function(){});
      case ENGINE_NAMES.OCRAD:     return _loadOcradEngine().catch(function(){});
      default: return Promise.resolve();
    }
  }

  // 导出全局命名空间（与项目其他 integrations 风格一致）
  window.OcrEngine = {
    recognize: recognize,
    preloadEngine: preloadEngine,
    getEngineStates: getEngineStates,
    ENGINE_NAMES: ENGINE_NAMES,
    ENGINE_STATE: ENGINE_STATE,
    // 暴露内部工具供外部复用（可选）
    _preprocessImage: _preprocessImage,
    _postprocessText: _postprocessText
  };

  // 自动预加载策略：页面空闲时加载 L2/L3 依赖（后台准备，不阻塞UI）
  // 注意：首次 OCR 点击会立即进入 _loadPaddleEngine，共享 loadingPromise 避免重复加载
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(function () {
      // 只预加载轻的脚本标签，模型文件仍按需加载
      if (_state.engineStates[ENGINE_NAMES.PADDLE] === ENGINE_STATE.IDLE) {
        _loadScript(CDN.paddleocrBrowser).catch(function(){});
        _loadScript(CDN.ort).catch(function(){});
      }
    }, { timeout: 5000 });
  } else {
    // Safari 不支持 requestIdleCallback，延迟 3s 加载
    setTimeout(function () {
      if (_state.engineStates[ENGINE_NAMES.PADDLE] === ENGINE_STATE.IDLE) {
        _loadScript(CDN.paddleocrBrowser).catch(function(){});
        _loadScript(CDN.ort).catch(function(){});
      }
    }, 3000);
  }

  /* ========================================================================
   * 新增 OCR 应用场景 1：全局图片 OCR 浮窗
   *   - 右键 或 长按 页面任意 <img>，弹出"📋 OCR 识别文字"按钮
   *   - 识别结果可：复制到剪贴板 / 追加到附近的 textarea / 手动编辑
   *   - 完全自包含：不修改其他模块任何代码，所有 DOM 与样式在这里构建
   * ======================================================================== */
  (function _installImageOcrContext() {
    if (typeof document === 'undefined') return;
    var SAGE = '#5a7d5c';
    var AMBER = '#c4956a';
    var btnTrigger = null; // 触发按钮
    var resultPanel = null; // 结果面板
    var longPressTimer = null;
    var pressedEl = null;

    function _css(el, map) {
      for (var k in map) {
        if (Object.prototype.hasOwnProperty.call(map, k)) el.style[k] = map[k];
      }
    }

    // ---------- 把任意图片 URL（包括跨域）转成 dataURL 供 OCR 使用 ----------
    function _imgToDataURL(img, cb) {
      // 1) 优先 canvas 导出（同源 / 有 CORS）
      try {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        var cx = c.getContext('2d');
        cx.drawImage(img, 0, 0, c.width, c.height);
        var data = c.toDataURL('image/png');
        if (data && data.length > 100) { cb(data); return; }
      } catch (e) { /* 跨域污染，走 fetch 路径 */ }
      // 2) 兜底：fetch → blob → FileReader
      var src = img.currentSrc || img.src;
      if (!src) { cb(null); return; }
      try {
        fetch(src, { mode: 'cors' }).then(function (r) {
          if (!r.ok) throw new Error('fetch ' + r.status);
          return r.blob();
        }).then(function (blob) {
          var fr = new FileReader();
          fr.onload = function () { cb(fr.result); };
          fr.onerror = function () { cb(null); };
          fr.readAsDataURL(blob);
        }).catch(function () {
          // 3) 最终兜底：直接传 src（识别引擎内部会再次 try/fetch）
          cb(src);
        });
      } catch (e) {
        cb(src);
      }
    }

    function _findNearbyTextarea() {
      // 找最靠近视口中心的可编辑元素，把 OCR 结果追加进去
      var sel = document.activeElement;
      if (sel && (sel.tagName === 'TEXTAREA' ||
                  (sel.tagName === 'INPUT' && /text|search|url/i.test(sel.type)) ||
                  sel.isContentEditable)) {
        return sel;
      }
      var nodes = document.querySelectorAll('textarea,input[type="text"],input[type="search"],[contenteditable="true"]');
      var best = null, bestD = Infinity;
      var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var r = n.getBoundingClientRect();
        if (r.width < 60 || r.height < 30) continue;
        var d = Math.abs((r.left + r.width / 2) - cx) + Math.abs((r.top + r.height / 2) - cy);
        if (d < bestD) { bestD = d; best = n; }
      }
      return best;
    }

    function _appendToEditable(el, text) {
      if (!el || !text) return false;
      try {
        if (el.isContentEditable) {
          el.focus();
          document.execCommand('insertText', false, text);
        } else if (el.setRangeText) {
          var s = el.selectionStart || el.value.length;
          var e = el.selectionEnd || el.value.length;
          var prefix = (el.value.slice(0, s) && !/[\n\s]$/.test(el.value.slice(0, s))) ? '\n' : '';
          el.setRangeText(prefix + text, s, e, 'end');
        } else {
          el.value += (el.value ? '\n' : '') + text;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      } catch (e) { return false; }
    }

    function _removeEl(el) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
    function _hideTrigger() { _removeEl(btnTrigger); btnTrigger = null; }

    // ---------- 触发按钮 ----------
    function _showTrigger(x, y, img) {
      _hideTrigger();
      btnTrigger = document.createElement('button');
      btnTrigger.textContent = '📋 OCR 识别文字';
      _css(btnTrigger, {
        position: 'fixed', zIndex: 2147483645,
        left: x + 'px', top: y + 'px',
        transform: 'translate(-50%, -110%)',
        padding: '7px 13px', borderRadius: '999px',
        background: SAGE, color: '#fff',
        fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em',
        border: 'none', cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(90,125,92,0.28), 0 2px 6px rgba(0,0,0,0.08)',
        whiteSpace: 'nowrap'
      });
      btnTrigger.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        _runImageOcr(img);
        _hideTrigger();
      }, true);
      document.body.appendChild(btnTrigger);
    }

    // ---------- 结果面板 ----------
    function _showResultPanel(img, initialText) {
      if (resultPanel) _removeEl(resultPanel);
      resultPanel = document.createElement('div');
      _css(resultPanel, {
        position: 'fixed', zIndex: 2147483646,
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(560px, calc(100vw - 32px))',
        maxHeight: 'min(72vh, 680px)',
        background: '#fff',
        borderRadius: '14px',
        boxShadow: '0 24px 60px rgba(26,58,42,0.22), 0 6px 18px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",Segoe UI,Arial,sans-serif',
        color: '#1a3a2a'
      });
      var head = document.createElement('div');
      _css(head, {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid rgba(90,125,92,0.12)',
        background: 'linear-gradient(180deg, rgba(90,125,92,0.06), rgba(90,125,92,0))'
      });
      var title = document.createElement('div');
      title.innerHTML = '<strong style="font-size:15px;">📝 OCR 识别结果</strong>' +
                        '<span id="ocr-panel-engine" style="margin-left:8px;font-size:12px;color:#8a8a8a;"></span>';
      var close = document.createElement('button');
      close.textContent = '✕';
      _css(close, {
        border: 'none', background: 'transparent', fontSize: '18px',
        cursor: 'pointer', color: '#8a8a8a', padding: '2px 6px', borderRadius: '6px'
      });
      close.addEventListener('mouseenter', function () { close.style.background = 'rgba(0,0,0,0.06)'; });
      close.addEventListener('mouseleave', function () { close.style.background = 'transparent'; });
      close.addEventListener('click', function () { _removeEl(resultPanel); resultPanel = null; });
      head.appendChild(title); head.appendChild(close);

      var body = document.createElement('div');
      _css(body, {
        flex: '1 1 auto', overflowY: 'auto', padding: '14px 18px',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '12px'
      });

      var thumb = document.createElement('img');
      thumb.src = img.currentSrc || img.src;
      _css(thumb, {
        width: '100%', maxHeight: '150px', objectFit: 'contain',
        borderRadius: '8px', background: '#f3f5f3', border: '1px solid rgba(90,125,92,0.1)'
      });
      body.appendChild(thumb);

      var status = document.createElement('div');
      _css(status, {
        fontSize: '12.5px', color: '#8a8a8a', minHeight: '18px'
      });
      status.textContent = '准备识别...';
      body.appendChild(status);

      var progress = document.createElement('div');
      _css(progress, {
        height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', overflow: 'hidden'
      });
      var fill = document.createElement('div');
      _css(fill, {
        height: '100%', width: '0', background: SAGE,
        transition: 'width .25s ease'
      });
      progress.appendChild(fill);
      body.appendChild(progress);

      var ta = document.createElement('textarea');
      ta.placeholder = '识别结果将显示在这里，可直接编辑后再复制或追加到发帖/笔记框。';
      _css(ta, {
        width: '100%', minHeight: '180px', resize: 'vertical',
        padding: '10px 12px', fontSize: '14px', lineHeight: '1.65',
        borderRadius: '10px', border: '1px solid rgba(90,125,92,0.22)',
        boxSizing: 'border-box', fontFamily: 'inherit'
      });
      ta.value = initialText || '';
      body.appendChild(ta);

      var footer = document.createElement('div');
      _css(footer, {
        display: 'flex', gap: '10px', flexWrap: 'wrap',
        padding: '12px 18px', borderTop: '1px solid rgba(90,125,92,0.1)',
        background: 'rgba(90,125,92,0.03)'
      });

      function makeBtn(text, color, handler) {
        var b = document.createElement('button');
        b.textContent = text;
        _css(b, {
          padding: '8px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          fontSize: '13.5px', fontWeight: 600, color: '#fff', background: color,
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)', transition: 'transform .08s'
        });
        b.addEventListener('mousedown', function () { b.style.transform = 'scale(0.97)'; });
        b.addEventListener('mouseup',   function () { b.style.transform = 'scale(1)'; });
        b.addEventListener('click', handler);
        return b;
      }
      var btnCopy = makeBtn('📋 复制到剪贴板', SAGE, function () {
        var v = ta.value || '';
        if (!v) { status.textContent = '没有文本可复制'; status.style.color = AMBER; return; }
        try {
          navigator.clipboard.writeText(v).then(function () {
            status.textContent = '✓ 已复制 ' + v.length + ' 字';
            status.style.color = SAGE;
          }).catch(function () {
            ta.select(); document.execCommand('copy');
            status.textContent = '✓ 已复制'; status.style.color = SAGE;
          });
        } catch (e) {
          ta.select(); document.execCommand('copy');
          status.textContent = '✓ 已复制'; status.style.color = SAGE;
        }
      });
      var nearby = _findNearbyTextarea();
      var btnAppend = null;
      if (nearby) {
        btnAppend = makeBtn('✏️ 追加到输入框', '#3a6b9a', function () {
          var ok = _appendToEditable(nearby, ta.value);
          status.textContent = ok ? '✓ 已追加到输入框' : '追加失败，请手动复制';
          status.style.color = ok ? SAGE : AMBER;
        });
      }
      var btnRetry = makeBtn('🔁 重新识别', AMBER, function () {
        fill.style.width = '0';
        ta.value = '';
        _runImageOcr(img, { ta: ta, status: status, fill: fill, engineSpan: resultPanel.querySelector('#ocr-panel-engine') });
      });
      footer.appendChild(btnCopy);
      if (btnAppend) footer.appendChild(btnAppend);
      footer.appendChild(btnRetry);

      resultPanel.appendChild(head);
      resultPanel.appendChild(body);
      resultPanel.appendChild(footer);

      // 遮罩
      var mask = document.createElement('div');
      _css(mask, {
        position: 'fixed', zIndex: 2147483645,
        left: 0, top: 0, right: 0, bottom: 0,
        background: 'rgba(10,25,20,0.45)', backdropFilter: 'blur(2px)'
      });
      mask.addEventListener('click', function () {
        _removeEl(mask); _removeEl(resultPanel); resultPanel = null;
      });
      document.body.appendChild(mask);
      document.body.appendChild(resultPanel);
      return { ta: ta, status: status, fill: fill, engineSpan: title.querySelector('#ocr-panel-engine') };
    }

    function _runImageOcr(img, ui) {
      var nodes = ui || _showResultPanel(img);
      var ta = nodes.ta, status = nodes.status, fill = nodes.fill, engineSpan = nodes.engineSpan;
      status.style.color = '#8a8a8a';
      status.textContent = '正在读取图片...';
      fill.style.width = '5%';
      _imgToDataURL(img, function (dataUrl) {
        if (!dataUrl) {
          status.textContent = '✗ 无法读取图片（可能是跨域受保护）';
          status.style.color = AMBER;
          fill.style.width = '100%';
          return;
        }
        window.OcrEngine.recognize(dataUrl, {
          minTextLength: 2
        }, {
          setText: function (t, kind) {
            status.textContent = t;
            status.style.color = (kind === 'success') ? SAGE : (kind === 'error') ? AMBER : '';
          },
          setProgress: function (p) { fill.style.width = Math.min(99, Math.max(5, p)) + '%'; },
          setEngine: function (name) { if (engineSpan) engineSpan.textContent = '· ' + (name || ''); }
        }, function (result) {
          fill.style.width = '100%';
          var txt = (result && result.text) ? result.text : '';
          ta.value = txt;
          if (engineSpan) engineSpan.textContent = (result && result.engine) ? '· ' + result.engine : '';
          if (txt) {
            status.textContent = '✓ 识别完成，共 ' + txt.length + ' 字（可编辑后复制/追加）';
            status.style.color = SAGE;
          } else {
            status.textContent = '✗ 多级引擎均未识别出文本，请手动输入';
            status.style.color = AMBER;
          }
        });
      });
    }

    // ---------- 事件绑定：右键 + 长按 ----------
    document.addEventListener('contextmenu', function (ev) {
      var img = ev.target && ev.target.closest('img');
      if (!img) return;
      // 排除极小的装饰图标 / emoji 图
      var r = img.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) return;
      _showTrigger(ev.clientX, ev.clientY, img);
      // 不 block 原生右键菜单：浮层显示在上方，点空白自动消失
    }, true);

    document.addEventListener('click', function (ev) {
      // 点击非图片非触发按钮 → 隐藏
      if (btnTrigger && ev.target !== btnTrigger && !btnTrigger.contains(ev.target)) {
        _hideTrigger();
      }
    }, true);

    document.addEventListener('touchstart', function (ev) {
      var t = ev.touches && ev.touches[0];
      if (!t) return;
      var el = document.elementFromPoint(t.clientX, t.clientY);
      var img = el && el.closest('img');
      if (!img) return;
      var r = img.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) return;
      pressedEl = img;
      longPressTimer = setTimeout(function () {
        if (pressedEl) {
          _showTrigger(t.clientX, t.clientY, pressedEl);
          pressedEl = null;
        }
      }, 400);
    }, { passive: true });
    document.addEventListener('touchmove', function () {
      clearTimeout(longPressTimer); longPressTimer = null; pressedEl = null;
    }, { passive: true });
    document.addEventListener('touchend', function () {
      clearTimeout(longPressTimer); longPressTimer = null; pressedEl = null;
    });

    // ESC 关面板
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        _hideTrigger();
        if (resultPanel) { _removeEl(resultPanel); resultPanel = null; }
      }
    });
  })();

  /* ========================================================================
   * 新增 OCR 应用场景 2：错题本 批量 OCR 录入
   *   - MutationObserver 检测到错题本 UI 出现后，在「📷 拍照/OCR」按钮旁
   *     自动追加一个「📥 批量OCR录入」按钮
   *   - 用户可一次上传多张错题图片，按顺序批量 OCR，每识别成功一张
   *     自动通过 window.addWrongQuestion() 存入错题本（零侵入 wrongbook.js）
   *   - 面板显示进度 / 成功失败计数 / 失败重试 / 失败项手动编辑后保存
   * ======================================================================== */
  (function _installWrongbookBatchOcr() {
    if (typeof document === 'undefined') return;
    var SAGE = '#5a7d5c';
    var DEEP = '#2c4a3b';
    var AMBER = '#c4956a';
    var ERROR_C = '#c0553a';
    var installed = false;
    var panelMask = null;
    var panel = null;

    function _css(el, map) {
      for (var k in map) {
        if (Object.prototype.hasOwnProperty.call(map, k)) el.style[k] = map[k];
      }
    }
    function _rm(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

    function _installIntoToolbar() {
      if (installed) return;
      var host = document.getElementById('wb-ocr-btn');
      if (!host) return;
      var toolbar = host.closest('.wb-toolbar');
      if (!toolbar) toolbar = host.parentNode;
      if (!toolbar) return;
      // 避免重复注入
      if (toolbar.querySelector('[data-ocr-batch-btn]')) return;

      var btn = document.createElement('button');
      btn.setAttribute('data-ocr-batch-btn', '1');
      btn.className = host.className || 'wb-btn';
      btn.textContent = '📥 批量OCR录入';
      _css(btn, {
        background: 'linear-gradient(135deg, ' + DEEP + ' 0%, ' + SAGE + ' 100%)',
        color: '#fff',
        marginLeft: '6px',
        fontSize: '0.85rem'
      });
      btn.addEventListener('click', _openBatchPanel);
      toolbar.insertBefore(btn, host.nextSibling);
      installed = true;
    }

    function _openBatchPanel() {
      _closeBatchPanel();
      panelMask = document.createElement('div');
      _css(panelMask, {
        position: 'fixed', inset: 0, zIndex: 2147483645,
        background: 'rgba(10,25,20,0.5)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px'
      });
      panelMask.addEventListener('click', function (e) {
        if (e.target === panelMask) _closeBatchPanel();
      });

      panel = document.createElement('div');
      _css(panel, {
        width: 'min(720px, 100%)', maxHeight: 'min(82vh, 780px)',
        background: '#fff', borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 28px 80px rgba(26,58,42,0.28)',
        fontFamily: '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",Segoe UI,Arial,sans-serif',
        color: DEEP, display: 'flex', flexDirection: 'column'
      });

      // 头部
      var head = document.createElement('div');
      _css(head, {
        padding: '16px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(90,125,92,0.12)',
        background: 'linear-gradient(180deg, rgba(90,125,92,0.07), rgba(90,125,92,0))'
      });
      var titleEl = document.createElement('div');
      titleEl.innerHTML = '<strong style="font-size:16px;">📥 错题本 · 批量OCR录入</strong>' +
                         '<div id="ocr-batch-stat" style="margin-top:4px;font-size:12px;color:#8a8a8a;">选择图片，按顺序 OCR 识别并入库</div>';
      var closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      _css(closeBtn, {
        border: 'none', background: 'transparent', fontSize: '20px',
        cursor: 'pointer', color: '#8a8a8a', padding: '2px 8px', borderRadius: '6px'
      });
      closeBtn.addEventListener('click', _closeBatchPanel);
      head.appendChild(titleEl); head.appendChild(closeBtn);
      panel.appendChild(head);

      // 主体
      var body = document.createElement('div');
      _css(body, {
        padding: '16px 20px', overflowY: 'auto', flex: '1 1 auto',
        display: 'flex', flexDirection: 'column', gap: '14px'
      });

      var pickerWrap = document.createElement('label');
      _css(pickerWrap, {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '8px', padding: '22px 16px',
        border: '2px dashed rgba(90,125,92,0.35)', borderRadius: '14px',
        cursor: 'pointer', background: 'rgba(90,125,92,0.035)',
        transition: 'all .2s', color: SAGE, textAlign: 'center'
      });
      pickerWrap.innerHTML =
        '<div style="font-size:28px;">🖼️</div>' +
        '<div style="font-size:14.5px;font-weight:600;">点击选择多张错题图片（或拖拽到此处）</div>' +
        '<div style="font-size:12px;color:#8a8a8a;">支持多选 · JPG/PNG/WebP · 推荐：清晰、光线充足、裁剪到题目区域</div>';
      var fileInput = document.createElement('input');
      fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.multiple = true;
      fileInput.style.display = 'none';
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files.length) _enqueueFiles(fileInput.files);
      });
      pickerWrap.appendChild(fileInput);
      // 拖拽支持
      ['dragenter', 'dragover'].forEach(function (ev) {
        pickerWrap.addEventListener(ev, function (e) {
          e.preventDefault(); e.stopPropagation();
          _css(pickerWrap, { borderColor: SAGE, background: 'rgba(90,125,92,0.09)' });
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        pickerWrap.addEventListener(ev, function (e) {
          _css(pickerWrap, { borderColor: 'rgba(90,125,92,0.35)', background: 'rgba(90,125,92,0.035)' });
        });
      });
      pickerWrap.addEventListener('drop', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          _enqueueFiles(e.dataTransfer.files);
        }
      });
      body.appendChild(pickerWrap);

      // 进度条
      var bar = document.createElement('div');
      _css(bar, { height: '5px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' });
      var fill = document.createElement('div');
      _css(fill, { width: '0', height: '100%', background: SAGE, transition: 'width .25s' });
      bar.appendChild(fill);
      body.appendChild(bar);

      // 任务列表
      var list = document.createElement('div');
      _css(list, { display: 'flex', flexDirection: 'column', gap: '10px' });
      body.appendChild(list);

      // 底部
      var footer = document.createElement('div');
      _css(footer, {
        padding: '14px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap',
        borderTop: '1px solid rgba(90,125,92,0.1)',
        background: 'rgba(90,125,92,0.03)'
      });
      var btnStart = document.createElement('button');
      btnStart.textContent = '▶️ 开始识别';
      _css(btnStart, {
        padding: '9px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
        fontSize: '14px', fontWeight: 700, color: '#fff', background: SAGE,
        boxShadow: '0 2px 10px rgba(90,125,92,0.25)', transition: 'transform .08s'
      });
      btnStart.addEventListener('mousedown', function () { btnStart.style.transform = 'scale(0.97)'; });
      btnStart.addEventListener('mouseup',   function () { btnStart.style.transform = 'scale(1)'; });
      btnStart.addEventListener('click', function () { _runAll(); });
      var btnClear = document.createElement('button');
      btnClear.textContent = '🗑️ 清空';
      _css(btnClear, {
        padding: '9px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer',
        fontSize: '14px', background: '#fff', color: DEEP
      });
      btnClear.addEventListener('click', function () {
        tasks.length = 0; list.innerHTML = ''; fill.style.width = '0'; _updateStat();
      });
      var btnJump = document.createElement('button');
      btnJump.textContent = '✏️ 前往错题本列表';
      _css(btnJump, {
        padding: '9px 14px', borderRadius: '10px', border: '1px solid ' + SAGE, cursor: 'pointer',
        fontSize: '14px', background: '#fff', color: SAGE
      });
      btnJump.addEventListener('click', function () {
        _closeBatchPanel();
        // 如果错题本有刷新接口就触发一下
        var wbList = document.getElementById('wb-list');
        if (wbList && wbList.dispatchEvent) {
          wbList.dispatchEvent(new Event('refresh', { bubbles: true }));
        }
        if (typeof window.navigateTo === 'function') window.navigateTo('/wrongbook');
      });
      footer.appendChild(btnStart); footer.appendChild(btnClear); footer.appendChild(btnJump);
      panel.appendChild(footer);

      panelMask.appendChild(panel);
      document.body.appendChild(panelMask);

      // 内部引用
      var tasks = []; // { file, dataUrl, status, text, err, row, subject, note }

      function _updateStat() {
        var total = tasks.length;
        var ok = tasks.filter(function (t) { return t.status === 'saved'; }).length;
        var fail = tasks.filter(function (t) { return t.status === 'failed'; }).length;
        var run = tasks.filter(function (t) { return t.status === 'running'; }).length;
        var pending = total - ok - fail - run;
        var pct = total ? Math.round(((ok + fail + 0.5 * run) / total) * 100) : 0;
        fill.style.width = pct + '%';
        var stat = document.getElementById('ocr-batch-stat');
        if (stat) {
          stat.textContent = '共 ' + total + ' 张 · ✓ 已保存 ' + ok + ' · ✗ 失败 ' + fail +
                             (pending ? ' · 待识别 ' + pending : '') +
                             (run ? ' · 识别中 ' + run : '');
        }
      }

      function _enqueueFiles(files) {
        var remain = [];
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          if (f && f.type && f.type.indexOf('image/') === 0) remain.push(f);
        }
        if (!remain.length) return;
        remain.forEach(function (f) {
          var task = { file: f, status: 'pending', text: '', err: '', row: null };
          tasks.push(task);
          task.row = _renderTaskRow(task);
          list.appendChild(task.row);
          // 并行读取图片预览
          (function (t) {
            var fr = new FileReader();
            fr.onload = function (ev) {
              t.dataUrl = ev.target.result;
              if (t._thumb) t._thumb.src = t.dataUrl;
            };
            fr.readAsDataURL(t.file);
          })(task);
        });
        _updateStat();
      }

      function _renderTaskRow(task) {
        var row = document.createElement('div');
        _css(row, {
          display: 'grid', gridTemplateColumns: '96px 1fr auto',
          gap: '12px', padding: '10px 12px',
          background: '#fafbfa', border: '1px solid rgba(90,125,92,0.1)',
          borderRadius: '12px'
        });
        var thumb = document.createElement('img');
        thumb.alt = 'preview';
        _css(thumb, {
          width: '96px', height: '96px', objectFit: 'contain',
          background: '#fff', borderRadius: '8px',
          border: '1px solid rgba(0,0,0,0.06)'
        });
        thumb.src = task.dataUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%23eee" width="96" height="96"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23aaa" font-size="12">加载中</text></svg>';
        task._thumb = thumb;

        var middle = document.createElement('div');
        _css(middle, { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 });
        var top = document.createElement('div');
        _css(top, { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' });
        var nameEl = document.createElement('span');
        _css(nameEl, { fontSize: '12.5px', color: '#8a8a8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' });
        nameEl.textContent = task.file && task.file.name ? task.file.name : 'image';
        var statusPill = document.createElement('span');
        statusPill.textContent = '待识别';
        _css(statusPill, {
          fontSize: '11.5px', padding: '2px 8px', borderRadius: '999px',
          background: 'rgba(0,0,0,0.05)', color: '#7a7a7a', fontWeight: 600
        });
        task._statusPill = statusPill;
        top.appendChild(nameEl); top.appendChild(statusPill);

        var ta = document.createElement('textarea');
        ta.placeholder = 'OCR 结果会写到这里，你可以手动编辑后再保存。';
        _css(ta, {
          width: '100%', minHeight: '72px', resize: 'vertical',
          padding: '8px 10px', fontSize: '13px', lineHeight: '1.55',
          borderRadius: '8px', border: '1px solid rgba(90,125,92,0.2)',
          boxSizing: 'border-box', fontFamily: 'inherit'
        });
        task._ta = ta;

        var meta = document.createElement('div');
        _css(meta, { display: 'flex', gap: '8px', flexWrap: 'wrap' });
        var subjInput = document.createElement('input');
        subjInput.type = 'text';
        subjInput.placeholder = '知识点/科目（可选，如：细胞生物学）';
        _css(subjInput, {
          flex: '1 1 140px', minWidth: '120px',
          padding: '6px 10px', fontSize: '12.5px',
          borderRadius: '7px', border: '1px solid rgba(0,0,0,0.12)',
          fontFamily: 'inherit'
        });
        task._subj = subjInput;
        meta.appendChild(subjInput);

        middle.appendChild(top); middle.appendChild(ta); middle.appendChild(meta);

        var actions = document.createElement('div');
        _css(actions, { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '84px' });
        var btnSave = document.createElement('button');
        btnSave.textContent = '💾 保存';
        _css(btnSave, {
          padding: '6px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
          fontSize: '12.5px', background: SAGE, color: '#fff', fontWeight: 600
        });
        btnSave.addEventListener('click', function () { _saveTask(task, { manual: true }); });
        var btnRetry = document.createElement('button');
        btnRetry.textContent = '🔁 重识';
        _css(btnRetry, {
          padding: '6px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
          fontSize: '12.5px', background: AMBER, color: '#fff', fontWeight: 600
        });
        btnRetry.addEventListener('click', function () { _runTask(task); });
        var btnRm = document.createElement('button');
        btnRm.textContent = '✕ 移除';
        _css(btnRm, {
          padding: '5px 10px', borderRadius: '8px', cursor: 'pointer',
          fontSize: '12.5px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.1)', color: '#555'
        });
        btnRm.addEventListener('click', function () {
          tasks = tasks.filter(function (t) { return t !== task; });
          _rm(row); _updateStat();
        });
        actions.appendChild(btnSave); actions.appendChild(btnRetry); actions.appendChild(btnRm);

        row.appendChild(thumb); row.appendChild(middle); row.appendChild(actions);
        _setRowStatus(task, 'pending');
        return row;
      }

      function _setRowStatus(task, s, extra) {
        task.status = s;
        var pill = task._statusPill;
        if (!pill) return;
        var map = {
          pending: { text: '待识别', bg: 'rgba(0,0,0,0.05)', c: '#7a7a7a' },
          running: { text: extra || '识别中', bg: 'rgba(90,125,92,0.12)', c: SAGE },
          saved:   { text: '✓ 已保存', bg: 'rgba(90,125,92,0.18)', c: SAGE },
          failed:  { text: '✗ 失败', bg: 'rgba(192,85,58,0.15)', c: ERROR_C }
        };
        var m = map[s] || map.pending;
        pill.textContent = m.text;
        pill.style.background = m.bg;
        pill.style.color = m.c;
      }

      function _saveTask(task, opts) {
        if (!task._ta) return;
        var text = task._ta.value.trim();
        if (!text) {
          _setRowStatus(task, 'failed', '空内容');
          _updateStat();
          return;
        }
        var subject = (task._subj && task._subj.value || '').trim();
        var payload = {
          question_text: text,
          subject: subject || null,
          user_answer: '', correct_answer: '', analysis: '',
          source: 'ocr-batch',
          created_at: new Date().toISOString()
        };
        if (typeof window.addWrongQuestion !== 'function') {
          _setRowStatus(task, 'failed', '无入库API');
          _updateStat();
          return;
        }
        _setRowStatus(task, 'running', opts && opts.manual ? '保存中' : '入库中');
        Promise.resolve(window.addWrongQuestion(payload)).then(function (res) {
          if (res && (res.success === false || res.error)) {
            throw new Error(res.error || 'save failed');
          }
          task.text = text;
          task.subject = subject;
          _setRowStatus(task, 'saved');
          _updateStat();
        }).catch(function (err) {
          console.warn('[ocr-batch] 保存失败:', err);
          _setRowStatus(task, 'failed', '保存失败');
          _updateStat();
        });
      }

      function _runTask(task) {
        if (!task.dataUrl) {
          // 还没读到就等一下
          var tries = 0;
          var tm = setInterval(function () {
            tries++;
            if (task.dataUrl) {
              clearInterval(tm); _runTask(task);
            } else if (tries > 40) {
              clearInterval(tm);
              _setRowStatus(task, 'failed', '读图片失败');
              _updateStat();
            }
          }, 80);
          return;
        }
        _setRowStatus(task, 'running', '识别中');
        _updateStat();
        window.OcrEngine.recognize(task.dataUrl, {
          minTextLength: 3
        }, {
          setProgress: function () {},
          setText: function (t) {
            if (task._statusPill && task.status === 'running') task._statusPill.textContent = t;
          },
          setEngine: function (name) { task._engine = name; }
        }, function (result) {
          var txt = (result && result.text) ? result.text : '';
          if (task._ta) task._ta.value = txt;
          if (txt) {
            // 自动保存（用户可后续在 textarea 改后手动再保存）
            _saveTask(task);
          } else {
            _setRowStatus(task, 'failed', '未识别');
            _updateStat();
          }
        });
      }

      async function _runAll() {
        if (!tasks.length) return;
        btnStart.disabled = true; btnStart.style.opacity = '0.55';
        try {
          for (var i = 0; i < tasks.length; i++) {
            var t = tasks[i];
            if (t.status === 'saved') continue;
            await new Promise(function (res) {
              _runTask(t);
              // 等状态离开 running（已 saved / failed）再处理下一张
              var guard = 0;
              var tm = setInterval(function () {
                guard++;
                if (t.status !== 'running') {
                  clearInterval(tm); res();
                } else if (guard > 360) { // 最多等 180s/张，避免卡住
                  clearInterval(tm);
                  _setRowStatus(t, 'failed', '超时');
                  _updateStat();
                  res();
                }
              }, 500);
            });
          }
        } finally {
          btnStart.disabled = false; btnStart.style.opacity = '';
        }
      }
    }

    function _closeBatchPanel() {
      _rm(panelMask); panelMask = null;
      _rm(panel); panel = null;
    }

    // MutationObserver：扫描错题本 UI 出现时注入按钮
    try {
      var mo = new MutationObserver(function () {
        var btn = document.getElementById('wb-ocr-btn');
        if (btn) _installIntoToolbar();
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      // DOMContentLoaded 后立即探测一次
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _installIntoToolbar);
      } else {
        _installIntoToolbar();
      }
    } catch (e) {
      // IE 等无 MutationObserver 的环境，降级：定时器扫 3 次
      var n = 0;
      var tm = setInterval(function () {
        n++;
        if (document.getElementById('wb-ocr-btn')) _installIntoToolbar();
        if (n >= 8 || installed) clearInterval(tm);
      }, 700);
    }
  })();

})();
