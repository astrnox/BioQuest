/**
 * ============================================================
 * BioQuest v3.1 — TTS 语音讲解（T3-1/T3-2/T3-3）
 * L1 方案：浏览器内置 SpeechSynthesis API（零成本、离线可用）
 * 多角色音色：主讲老师 / 助教 / 学霸同学 / 困惑同学
 *
 * 接入 EventBus：AI 老师输出文本 → TTS_SPEAK 事件 → 自动朗读
 * ============================================================
 */

(function () {
  'use strict';

  if (window.BioQuestTTS) return;

  var EventBus = window.BioQuestEventBus;
  var synth = window.speechSynthesis;
  var voices = [];
  var enabled = false;
  var currentUtterance = null;
  var queue = [];
  var rate = 1.0;
  var pitch = 1.0;

  // 角色音色映射（中文语音有限时按 pitch 区分）
  var ROLE_VOICE = {
    '主讲老师':  { voicePref: ['male', 'zh-CN'], pitch: 0.9, rate: 1.0 },
    '助教':      { voicePref: ['female', 'zh-CN'], pitch: 1.1, rate: 1.0 },
    '学霸同学':  { voicePref: ['male', 'zh-CN'], pitch: 1.2, rate: 1.1 },
    '困惑同学':  { voicePref: ['female', 'zh-CN'], pitch: 1.3, rate: 0.95 },
    '应用同学':  { voicePref: ['female', 'zh-CN'], pitch: 1.0, rate: 1.0 }
  };

  function _loadVoices() {
    if (!synth) return;
    voices = synth.getVoices().filter(function (v) { return v.lang.indexOf('zh') === 0; });
  }

  if (synth) {
    _loadVoices();
    synth.onvoiceschanged = _loadVoices;
  }

  function _pickVoice(pref) {
    if (!voices.length) return null;
    // 先按性别偏好（voice.name 含 "Male"/"Female" 或 "男"/"女"）
    if (pref && pref.indexOf('female') >= 0) {
      var female = voices.find(function (v) { return /female|女|Tingting|Mei|Yaoyao/i.test(v.name); });
      if (female) return female;
    }
    if (pref && pref.indexOf('male') >= 0) {
      var male = voices.find(function (v) { return /male|男|Yunyang|Kangkang/i.test(v.name); });
      if (male) return male;
    }
    return voices[0];
  }

  function _speak(text, role) {
    if (!synth || !enabled || !text) return;
    role = role || '主讲老师';
    var cfg = ROLE_VOICE[role] || ROLE_VOICE['主讲老师'];

    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    var v = _pickVoice(cfg.voicePref);
    if (v) u.voice = v;
    u.rate = cfg.rate * rate;
    u.pitch = cfg.pitch * pitch;
    u.onend = function () {
      currentUtterance = null;
      if (queue.length) {
        var next = queue.shift();
        _speak(next.text, next.role);
      }
    };
    u.onerror = function () { currentUtterance = null; };
    currentUtterance = u;
    synth.speak(u);
  }

  // ====== 对外 API ======

  function enable() {
    enabled = true;
    if (synth && synth.paused) synth.resume();
  }

  function disable() {
    enabled = false;
    pause();
    queue = [];
  }

  function isEnabled() { return enabled; }

  function speak(text, role) {
    if (!enabled) return;
    if (currentUtterance) {
      queue.push({ text: text, role: role });
    } else {
      _speak(text, role);
    }
  }

  function pause() {
    if (synth && synth.speaking) synth.pause();
  }

  function resume() {
    if (synth && synth.paused) synth.resume();
  }

  function stop() {
    queue = [];
    currentUtterance = null;
    if (synth) synth.cancel();
  }

  function setRate(r) { rate = Math.max(0.5, Math.min(2, r)); }
  function setPitch(p) { pitch = Math.max(0.5, Math.min(2, p)); }

  function isSupported() { return !!synth; }

  function getAvailableRoles() {
    return Object.keys(ROLE_VOICE);
  }

  // ====== 接入 EventBus（T3-2） ======
  // AI 老师文本自动朗读（支持第二个参数 role 指定角色音色）
  EventBus.on(EventBus.ACTION.TTS_SPEAK, function (text, role) {
    speak(text, role || '主讲老师');
  });
  EventBus.on(EventBus.ACTION.TTS_PAUSE, function () {
    pause();
  });

  // ====== 暴露 API ======
  window.BioQuestTTS = {
    enable: enable,
    disable: disable,
    isEnabled: isEnabled,
    isSupported: isSupported,
    speak: speak,
    pause: pause,
    resume: resume,
    stop: stop,
    setRate: setRate,
    setPitch: setPitch,
    getAvailableRoles: getAvailableRoles
  };

})();
