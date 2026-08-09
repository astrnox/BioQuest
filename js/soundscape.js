/**
 * ============================================================
 * BioQuest — PRD §5-36：背景音效 (Web Audio API)
 * 可选白噪音/翻页声/雨声，无需音频文件
 * ============================================================
 */
(function () {
  'use strict';

  var audioCtx = null;
  var sourceNodes = [];
  var _enabled = false;
  var _currentSound = 'white-noise';
  var _volume = 0.15;

  function getContext() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    return audioCtx;
  }

  function createWhiteNoise(ctx) {
    var bufferSize = ctx.sampleRate * 2;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    var source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    var gain = ctx.createGain();
    gain.gain.value = _volume;

    // 低通滤波让白噪音更柔和
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    return { source: source, gain: gain, filter: filter };
  }

  function createRainSound(ctx) {
    var bufferSize = ctx.sampleRate * 4;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      // 模拟雨声：随机脉冲
      data[i] = (Math.random() > 0.97) ? (Math.random() * 0.6 - 0.3) : 0;
    }
    var source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    var gain = ctx.createGain();
    gain.gain.value = _volume * 0.8;

    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    return { source: source, gain: gain, filter: filter };
  }

  function createPageFlip(ctx) {
    // 一次性翻页声
    var bufferSize = ctx.sampleRate * 0.15;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      var t = i / ctx.sampleRate;
      data[i] = Math.sin(t * 3000) * Math.exp(-t * 30) * (Math.random() > 0.5 ? 1 : -1) * 0.3;
    }
    var source = ctx.createBufferSource();
    source.buffer = buffer;

    var gain = ctx.createGain();
    gain.gain.value = _volume;

    source.connect(gain);
    gain.connect(ctx.destination);

    return { source: source, gain: gain };
  }

  function startSound(type) {
    stopAll();
    var ctx = getContext();
    if (!ctx) return;

    try {
      var node;
      switch (type) {
        case 'rain':
          node = createRainSound(ctx);
          break;
        case 'page-flip':
          node = createPageFlip(ctx);
          break;
        case 'white-noise':
        default:
          node = createWhiteNoise(ctx);
          break;
      }
      node.source.start();
      sourceNodes.push(node);
      _currentSound = type;
    } catch (e) {
      console.warn('[BioQuest] 音效启动失败:', e.message);
    }
  }

  function stopAll() {
    sourceNodes.forEach(function (node) {
      try { node.source.stop(); } catch (e) {}
    });
    sourceNodes = [];
  }

  function setVolume(v) {
    _volume = Math.max(0, Math.min(1, v));
    sourceNodes.forEach(function (node) {
      if (node.gain) node.gain.value = _volume;
    });
  }

  function playPageFlip() {
    if (!_enabled) return;
    var ctx = getContext();
    if (!ctx) return;
    try {
      var node = createPageFlip(ctx);
      node.source.start();
      sourceNodes.push(node);
      // 自动清理
      setTimeout(function () {
        try { node.source.stop(); } catch (e) {}
        var idx = sourceNodes.indexOf(node);
        if (idx >= 0) sourceNodes.splice(idx, 1);
      }, 200);
    } catch (e) {}
  }

  function enable(type) {
    _enabled = true;
    _currentSound = type || 'white-noise';
    startSound(_currentSound);
  }

  function disable() {
    _enabled = false;
    stopAll();
  }

  function isEnabled() { return _enabled; }
  function getCurrentSound() { return _currentSound; }

  // 暴露全局
  window.Soundscape = {
    enable: enable,
    disable: disable,
    playPageFlip: playPageFlip,
    setVolume: setVolume,
    isEnabled: isEnabled,
    getCurrentSound: getCurrentSound
  };

  console.log('[BioQuest] 背景音效模块已加载');
})();