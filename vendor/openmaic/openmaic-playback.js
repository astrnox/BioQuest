/**
 * ============================================================
 * OpenMAIC Playback Engine — 课堂播放状态机（移植自 lib/playback/engine.ts）
 * ------------------------------------------------------------
 * 状态机：idle / playing / paused / live
 *   - start()  从头播放
 *   - pause()/resume()  暂停/继续
 *   - confirmDiscussion()/skipDiscussion()  互动讨论
 *   - handleUserInterrupt()  学生提问
 *
 * 与原版差异：
 *   - 不依赖 zustand canvas store；用 OpenMAICCanvasStore + BioQuest EventBus
 *   - Browser TTS 用 window.speechSynthesis（BioQuest tts.js 也可）
 *   - 持久化用 localStorage（PlayBackSnapshot）
 *   - 可选 callback：onModeChange / onSceneChange / onSpeechStart/End / onProactiveShow...
 *
 * 用法：
 *   var pe = new OpenMAICPlayback(scenes, actionEngine, audioPlayer, callbacks);
 *   pe.start();
 *   pe.pause();
 *   pe.resume();
 * ============================================================
 */
(function (global) {
  'use strict';

  var Actions = global.OpenMAICActions;
  var Emitter = global.OpenMAICEmitter;

  var CJK_LANG_THRESHOLD = 0.3;

  /**
   * 播放引擎。统一调度 Scene.actions[] 的执行。
   * @param {Array} scenes - 场景列表（带 actions[]）
   * @param {Object} actionEngine - 动作执行器（OpenMAICActionEngine）
   * @param {Object} [audioPlayer] - 音频播放器（BioQuest TTS）
   * @param {Object} [callbacks] - 回调集合
   */
  function PlaybackEngine(scenes, actionEngine, audioPlayer, callbacks) {
    this.scenes = scenes || [];
    this.actionEngine = actionEngine;
    this.audioPlayer = audioPlayer || null;
    this.callbacks = callbacks || {};

    this.sceneIndex = 0;
    this.actionIndex = 0;
    this.mode = 'idle'; // 'idle' | 'playing' | 'paused' | 'live'
    this.consumedDiscussions = {};
    this.savedSceneIndex = null;
    this.savedActionIndex = null;
    this.currentTopicState = null;
    this.currentTrigger = null;

    // 内部 timer
    this.triggerDelayTimer = null;
    this.speechTimer = null;
    this.speechTimerStart = 0;
    this.speechTimerRemaining = 0;

    // Browser TTS 状态
    this.browserTTSActive = false;
    this.browserTTSChunks = [];
    this.browserTTSChunkIndex = 0;
    this.browserTTSPausedChunks = [];
    this.cachedVoices = null;
  }

  // ==================== 公共 API ====================

  PlaybackEngine.prototype.getMode = function () { return this.mode; };

  PlaybackEngine.prototype.getSnapshot = function () {
    return {
      sceneIndex: this.sceneIndex,
      actionIndex: this.actionIndex,
      consumedDiscussions: Object.keys(this.consumedDiscussions),
      sceneId: this.scenes[this.sceneIndex] ? this.scenes[this.sceneIndex].id : undefined,
    };
  };

  PlaybackEngine.prototype.restoreFromSnapshot = function (snap) {
    if (!snap) return;
    this.sceneIndex = snap.sceneIndex || 0;
    this.actionIndex = snap.actionIndex || 0;
    this.consumedDiscussions = {};
    (snap.consumedDiscussions || []).forEach(function (id) { this[id] = true; }, this.consumedDiscussions);
  };

  PlaybackEngine.prototype.start = function () {
    if (this.mode !== 'idle') return;
    this.sceneIndex = 0;
    this.actionIndex = 0;
    this._setMode('playing');
    this._processNext();
  };

  PlaybackEngine.prototype.continuePlayback = function () {
    if (this.mode !== 'idle') return;
    this._setMode('playing');
    this._processNext();
  };

  PlaybackEngine.prototype.pause = function () {
    if (this.mode === 'playing') {
      if (this.triggerDelayTimer) { clearTimeout(this.triggerDelayTimer); this.triggerDelayTimer = null; }
      if (this.speechTimer) {
        this.speechTimerRemaining = Math.max(0, this.speechTimerRemaining - (Date.now() - this.speechTimerStart));
        clearTimeout(this.speechTimer);
        this.speechTimer = null;
      }
      this._setMode('paused');
      if (!this.currentTrigger) {
        if (this.browserTTSActive) {
          this.browserTTSPausedChunks = this.browserTTSChunks.slice(this.browserTTSChunkIndex);
          if (window.speechSynthesis) window.speechSynthesis.cancel();
        } else if (this.audioPlayer && this.audioPlayer.isPlaying && this.audioPlayer.isPlaying()) {
          this.audioPlayer.pause();
        }
      }
    } else if (this.mode === 'live') {
      this._setMode('paused');
      this.currentTopicState = 'pending';
    }
  };

  PlaybackEngine.prototype.resume = function () {
    if (this.mode !== 'paused') return;
    if (this.currentTopicState === 'pending') {
      this.currentTopicState = 'active';
      this._setMode('live');
    } else if (this.currentTrigger) {
      this._setMode('playing');
    } else {
      this._setMode('playing');
      if (this.browserTTSPausedChunks.length) {
        this.browserTTSActive = true;
        this.browserTTSChunks = this.browserTTSPausedChunks;
        this.browserTTSChunkIndex = 0;
        this.browserTTSPausedChunks = [];
        this._playBrowserTTSChunk();
      } else if (this.audioPlayer && this.audioPlayer.hasActiveAudio && this.audioPlayer.hasActiveAudio()) {
        this.audioPlayer.resume();
      } else if (this.speechTimerRemaining > 0) {
        this.speechTimerStart = Date.now();
        var self = this;
        this.speechTimer = setTimeout(function () {
          self.speechTimer = null;
          self.speechTimerRemaining = 0;
          if (self.callbacks.onSpeechEnd) self.callbacks.onSpeechEnd();
          if (self.mode === 'playing') self._processNext();
        }, this.speechTimerRemaining);
      } else {
        this._processNext();
      }
    }
  };

  PlaybackEngine.prototype.stop = function () {
    this._setMode('idle');
    if (this.audioPlayer && this.audioPlayer.stop) this.audioPlayer.stop();
    this._cancelBrowserTTS();
    if (this.actionEngine && this.actionEngine.clearEffects) this.actionEngine.clearEffects();
    if (this.triggerDelayTimer) { clearTimeout(this.triggerDelayTimer); this.triggerDelayTimer = null; }
    if (this.speechTimer) { clearTimeout(this.speechTimer); this.speechTimer = null; }
    this.speechTimerRemaining = 0;
    this.sceneIndex = 0;
    this.actionIndex = 0;
    this.savedSceneIndex = null;
    this.savedActionIndex = null;
    this.currentTopicState = null;
    this.currentTrigger = null;
  };

  PlaybackEngine.prototype.confirmDiscussion = function () {
    if (!this.currentTrigger) return;
    this.consumedDiscussions[this.currentTrigger.id] = true;
    this.savedSceneIndex = this.sceneIndex;
    this.savedActionIndex = this.actionIndex;
    this.currentTopicState = 'active';
    this._setMode('live');
    if (this.callbacks.onProactiveHide) this.callbacks.onProactiveHide();
    if (this.callbacks.onDiscussionConfirmed) {
      this.callbacks.onDiscussionConfirmed(this.currentTrigger.question, this.currentTrigger.prompt, this.currentTrigger.agentId);
    }
    this.currentTrigger = null;
  };

  PlaybackEngine.prototype.skipDiscussion = function () {
    if (this.currentTrigger) {
      this.consumedDiscussions[this.currentTrigger.id] = true;
      this.currentTrigger = null;
    }
    if (this.callbacks.onProactiveHide) this.callbacks.onProactiveHide();
    if (this.mode === 'playing') this._processNext();
  };

  PlaybackEngine.prototype.handleEndDiscussion = function () {
    if (this.actionEngine && this.actionEngine.clearEffects) this.actionEngine.clearEffects();
    this.currentTopicState = 'closed';
    // 关闭白板
    if (global.OpenMAICCanvasStore) {
      global.OpenMAICCanvasStore.getState().setWhiteboardOpen(false);
    }
    if (this.callbacks.onDiscussionEnd) this.callbacks.onDiscussionEnd();
    this._restoreSavedLectureState();
    this._setMode('idle');
  };

  PlaybackEngine.prototype.handleUserInterrupt = function (text) {
    if (this.mode === 'playing' || this.mode === 'paused') {
      if (this.savedSceneIndex === null) {
        this.savedSceneIndex = this.sceneIndex;
        this.savedActionIndex = Math.max(0, this.actionIndex - 1);
      }
      if (this.triggerDelayTimer) { clearTimeout(this.triggerDelayTimer); this.triggerDelayTimer = null; }
    }
    this.currentTopicState = 'active';
    this._setMode('live');
    if (this.audioPlayer && this.audioPlayer.stop) this.audioPlayer.stop();
    this._cancelBrowserTTS();
    if (this.callbacks.onUserInterrupt) this.callbacks.onUserInterrupt(text);
  };

  PlaybackEngine.prototype.isExhausted = function () {
    var si = this.sceneIndex, ai = this.actionIndex;
    while (si < this.scenes.length) {
      var actions = this.scenes[si].actions || [];
      while (ai < actions.length) {
        var a = actions[ai];
        if (a.type === 'discussion' && this.consumedDiscussions[a.id]) { ai++; continue; }
        return false;
      }
      si++;
      ai = 0;
    }
    return true;
  };

  // ==================== 私有 ====================

  PlaybackEngine.prototype._setMode = function (mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    if (this.callbacks.onModeChange) this.callbacks.onModeChange(mode);
  };

  PlaybackEngine.prototype._restoreSavedLectureState = function () {
    if (this.savedSceneIndex !== null && this.savedActionIndex !== null) {
      this.sceneIndex = this.savedSceneIndex;
      this.actionIndex = this.savedActionIndex;
    }
    this.savedSceneIndex = null;
    this.savedActionIndex = null;
  };

  PlaybackEngine.prototype._getCurrentAction = function () {
    while (this.sceneIndex < this.scenes.length) {
      var scene = this.scenes[this.sceneIndex];
      var actions = scene.actions || [];
      if (this.actionIndex < actions.length) {
        return { action: actions[this.actionIndex], sceneId: scene.id };
      }
      this.sceneIndex++;
      this.actionIndex = 0;
    }
    return null;
  };

  PlaybackEngine.prototype._processNext = function () {
    if (this.mode !== 'playing') return;
    if (this._emitter) this._emitter.emit('progress', this.getSnapshot());

    // 场景边界
    if (this.actionIndex === 0 && this.sceneIndex < this.scenes.length) {
      var scene = this.scenes[this.sceneIndex];
      if (this.actionEngine && this.actionEngine.clearEffects) this.actionEngine.clearEffects();
      if (this.callbacks.onSceneChange) this.callbacks.onSceneChange(scene.id);
      if (this.callbacks.onSpeakerChange) this.callbacks.onSpeakerChange('teacher');
    }

    var current = this._getCurrentAction();
    if (!current) {
      if (this.actionEngine && this.actionEngine.clearEffects) this.actionEngine.clearEffects();
      this._setMode('idle');
      if (this.callbacks.onComplete) this.callbacks.onComplete();
      return;
    }

    var action = current.action;
    this.actionIndex++;

    if (Actions.isFireAndForget(action)) {
      // spotlight / laser
      if (this.actionEngine) this.actionEngine.execute(action);
      if (this.callbacks.onEffectFire) this.callbacks.onEffectFire({
        kind: action.type,
        targetId: action.elementId,
        dimOpacity: action.dimOpacity,
        color: action.color,
      });
      // 不阻塞，立即下一个（用 queueMicrotask 防栈溢出）
      var self = this;
      queueMicrotask(function () { self._processNext(); });
      return;
    }

    if (action.type === 'speech') {
      this._handleSpeech(action);
      return;
    }

    if (action.type === 'discussion') {
      this._handleDiscussion(action);
      return;
    }

    if (Actions.isWhiteboard(action) || action.type === 'play_video') {
      this._handleSyncAction(action);
      return;
    }

    // 未知 action，跳过
    this._processNext();
  };

  PlaybackEngine.prototype._handleSpeech = function (action) {
    if (this.callbacks.onSpeechStart) this.callbacks.onSpeechStart(action.text);
    var self = this;

    // 估算阅读时间（CJK ~150ms/字，英文 ~240ms/词）
    var scheduleReadingTimer = function () {
      var text = action.text || '';
      var cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length;
      var isCJK = text.length > 0 && cjkCount > text.length * 0.3;
      var speed = (self.callbacks.getPlaybackSpeed && self.callbacks.getPlaybackSpeed()) || 1;
      var rawMs = isCJK ? Math.max(2000, text.length * 150) : Math.max(2000, text.split(/\s+/).filter(Boolean).length * 240);
      var readingMs = rawMs / speed;
      self.speechTimerStart = Date.now();
      self.speechTimerRemaining = readingMs;
      self.speechTimer = setTimeout(function () {
        self.speechTimer = null;
        self.speechTimerRemaining = 0;
        if (self.callbacks.onSpeechEnd) self.callbacks.onSpeechEnd();
        if (self.mode === 'playing') self._processNext();
      }, readingMs);
    };

    // 优先用预生成 audio；否则尝试 browser TTS；否则按字数估算
    if (this.audioPlayer && this.audioPlayer.play) {
      this.audioPlayer.onEnded(function () {
        if (self.callbacks.onSpeechEnd) self.callbacks.onSpeechEnd();
        if (self.mode === 'playing') self._processNext();
      });
      this.audioPlayer.play(action.audioId || '', action.audioUrl)
        .then(function (started) {
          if (!started) {
            if (self._canBrowserTTS()) self._playBrowserTTS(action);
            else scheduleReadingTimer();
          }
        })
        .catch(function () { scheduleReadingTimer(); });
    } else if (this._canBrowserTTS()) {
      this._playBrowserTTS(action);
    } else {
      scheduleReadingTimer();
    }
  };

  PlaybackEngine.prototype._canBrowserTTS = function () {
    return typeof window !== 'undefined' && !!window.speechSynthesis;
  };

  PlaybackEngine.prototype._handleDiscussion = function (action) {
    if (this.consumedDiscussions[action.id]) { this._processNext(); return; }
    if (action.agentId && this.callbacks.isAgentSelected && !this.callbacks.isAgentSelected(action.agentId)) {
      this.consumedDiscussions[action.id] = true;
      this._processNext();
      return;
    }
    var trigger = {
      id: action.id,
      question: action.topic,
      prompt: action.prompt,
      agentId: action.agentId,
    };
    var self = this;
    this.triggerDelayTimer = setTimeout(function () {
      self.triggerDelayTimer = null;
      if (self.mode !== 'playing') return;
      self.currentTrigger = trigger;
      if (self.callbacks.onProactiveShow) self.callbacks.onProactiveShow(trigger);
    }, 3000);
  };

  PlaybackEngine.prototype._handleSyncAction = function (action) {
    var self = this;
    var p = this.actionEngine ? this.actionEngine.execute(action) : Promise.resolve();
    if (p && typeof p.then === 'function') {
      p.then(function () { if (self.mode === 'playing') self._processNext(); });
    } else {
      if (self.mode === 'playing') self._processNext();
    }
  };

  // ==================== Browser TTS ====================

  PlaybackEngine.prototype._splitIntoChunks = function (text) {
    var parts = text.split(/(?<=[.!?。！？\n])\s*/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i].trim();
      if (t) out.push(t);
    }
    return out.length ? out : [text];
  };

  PlaybackEngine.prototype._playBrowserTTS = function (speechAction) {
    this.browserTTSChunks = this._splitIntoChunks(speechAction.text || '');
    this.browserTTSChunkIndex = 0;
    this.browserTTSPausedChunks = [];
    this.browserTTSActive = true;
    this._playBrowserTTSChunk();
  };

  PlaybackEngine.prototype._playBrowserTTSChunk = function () {
    var self = this;
    if (this.browserTTSChunkIndex >= this.browserTTSChunks.length) {
      this.browserTTSActive = false;
      this.browserTTSChunks = [];
      if (this.callbacks.onSpeechEnd) this.callbacks.onSpeechEnd();
      if (this.mode === 'playing') this._processNext();
      return;
    }
    var chunk = this.browserTTSChunks[this.browserTTSChunkIndex];
    var utterance = new SpeechSynthesisUtterance(chunk);
    var speed = (this.callbacks.getPlaybackSpeed && this.callbacks.getPlaybackSpeed()) || 1;
    utterance.rate = speed;
    utterance.volume = 1;
    this._ensureVoicesLoaded().then(function (voices) {
      // 自动检测语言
      var cjkCount = (chunk.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
      var isCJK = chunk.length > 0 && cjkCount / chunk.length > CJK_LANG_THRESHOLD;
      utterance.lang = isCJK ? 'zh-CN' : 'en-US';
      utterance.onend = function () {
        self.browserTTSChunkIndex++;
        if (self.mode === 'playing') self._playBrowserTTSChunk();
      };
      utterance.onerror = function (e) {
        if (e.error !== 'canceled') {
          self.browserTTSChunkIndex++;
          if (self.mode === 'playing') self._playBrowserTTSChunk();
        }
      };
      // Chrome bug workaround: cancel 清理残留
      if (window.speechSynthesis.cancel) window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  };

  PlaybackEngine.prototype._ensureVoicesLoaded = function () {
    if (this.cachedVoices && this.cachedVoices.length) {
      return Promise.resolve(this.cachedVoices);
    }
    var voices = window.speechSynthesis.getVoices();
    if (voices.length) { this.cachedVoices = voices; return Promise.resolve(voices); }
    var self = this;
    return new Promise(function (resolve) {
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        window.speechSynthesis.removeEventListener('voiceschanged', finish);
        self.cachedVoices = window.speechSynthesis.getVoices();
        resolve(self.cachedVoices);
      };
      window.speechSynthesis.addEventListener('voiceschanged', finish);
      setTimeout(finish, 2000);
    });
  };

  PlaybackEngine.prototype._cancelBrowserTTS = function () {
    if (this.browserTTSActive) {
      this.browserTTSActive = false;
      this.browserTTSChunks = [];
      this.browserTTSChunkIndex = 0;
      this.browserTTSPausedChunks = [];
      if (window.speechSynthesis && window.speechSynthesis.cancel) window.speechSynthesis.cancel();
    }
  };

  // 全局 emitter 便于 progress 订阅
  PlaybackEngine.prototype._emitter = null;
  PlaybackEngine.prototype.subscribe = function (event, cb) {
    if (!this._emitter) this._emitter = new Emitter();
    this._emitter.on(event, cb);
  };

  global.OpenMAICPlayback = PlaybackEngine;
})(typeof window !== 'undefined' ? window : globalThis);
