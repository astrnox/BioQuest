/**
 * ============================================================
 * OpenMAIC Stage Store — Stage/Scene 状态（移植自 lib/store/stage.ts）
 * ------------------------------------------------------------
 * 替代 zustand 版。负责：
 *   - 当前 Stage + Scene[] + currentSceneId
 *   - Chats[] 会话
 *   - 大纲（生成中 + 已持久化）
 *   - 持久化到 localStorage（替代 IndexedDB）
 *
 * 用法：
 *   var stage = window.OpenMAICStageStore;
 *   stage.getState().setStage({ id: 's1', ... });
 *   var cur = stage.getState().getCurrentScene();
 * ============================================================
 */
(function (global) {
  'use strict';

  var Store = global.OpenMAICStore;

  var PENDING_SCENE_ID = '__pending__';
  var STORAGE_KEY = 'openmaic_stage_v1';
  var SAVE_DEBOUNCE_MS = 500;

  function _debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(null, args); }, ms);
    };
  }

  var initial = {
    stage: null,
    scenes: [],
    currentSceneId: null,
    chats: [],
    mode: 'playback', // 'playback' | 'autonomous' | 'edit'
    outlines: [],
    generatingOutlines: [],
    generationStatus: 'idle', // 'idle' | 'generating' | 'paused' | 'completed' | 'error'
    currentGeneratingOrder: -1,
    failedOutlines: [],
  };

  var actions = {
    setStage: function (s, stage) {
      s.stage = stage;
      s.scenes = [];
      s.currentSceneId = null;
      s.chats = [];
    },
    setScenes: function (s, scenes) {
      s.scenes = scenes || [];
      if (!s.currentSceneId && s.scenes.length) s.currentSceneId = s.scenes[0].id;
    },
    addScene: function (s, scene) {
      if (!s.stage || scene.stageId !== s.stage.id) {
        if (console && console.warn) console.warn('[StageStore] stageId mismatch', scene.id);
        return null;
      }
      s.scenes = s.scenes.concat([scene]);
      // 移除对应 order 的 generatingOutlines
      s.generatingOutlines = s.generatingOutlines.filter(function (o) { return o.order !== scene.order; });
      // 如果当前在 pending 页面，自动跳到新场景
      if (s.currentSceneId === PENDING_SCENE_ID) s.currentSceneId = scene.id;
      return scene;
    },
    updateScene: function (s, sceneId, updates) {
      s.scenes = s.scenes.map(function (sc) { return sc.id === sceneId ? Object.assign({}, sc, updates) : sc; });
    },
    deleteScene: function (s, sceneId) {
      var idx = -1;
      for (var i = 0; i < s.scenes.length; i++) if (s.scenes[i].id === sceneId) { idx = i; break; }
      s.scenes = s.scenes.filter(function (sc) { return sc.id !== sceneId; });
      if (s.currentSceneId === sceneId) {
        var ni = idx < s.scenes.length ? idx : s.scenes.length - 1;
        s.currentSceneId = s.scenes[ni] ? s.scenes[ni].id : null;
      }
    },
    setCurrentSceneId: function (s, sceneId) { s.currentSceneId = sceneId; },
    setChats: function (s, chats) { s.chats = chats || []; },
    setMode: function (s, mode) { s.mode = mode; },
    setOutlines: function (s, outlines) { s.outlines = outlines || []; },
    setGeneratingOutlines: function (s, outlines) { s.generatingOutlines = outlines || []; },
    setGenerationStatus: function (s, status) { s.generationStatus = status; },
    setCurrentGeneratingOrder: function (s, order) { s.currentGeneratingOrder = order; },
    addFailedOutline: function (s, outline) {
      for (var i = 0; i < s.failedOutlines.length; i++) {
        if (s.failedOutlines[i].id === outline.id) return;
      }
      s.failedOutlines = s.failedOutlines.concat([outline]);
    },
    clearFailedOutlines: function (s) { s.failedOutlines = []; },
    clearStore: function (s) {
      s.stage = null;
      s.scenes = [];
      s.currentSceneId = null;
      s.chats = [];
      s.outlines = [];
      s.generatingOutlines = [];
      s.failedOutlines = [];
      s.generationStatus = 'idle';
      s.currentGeneratingOrder = -1;
    },
  };

  // getters 单独挂载（zustand 版是同 state 函数）
  var getters = {
    getCurrentScene: function (s) {
      if (!s.currentSceneId) return null;
      for (var i = 0; i < s.scenes.length; i++) if (s.scenes[i].id === s.currentSceneId) return s.scenes[i];
      return null;
    },
    getSceneById: function (s, id) {
      for (var i = 0; i < s.scenes.length; i++) if (s.scenes[i].id === id) return s.scenes[i];
      return null;
    },
    getSceneIndex: function (s, id) {
      for (var i = 0; i < s.scenes.length; i++) if (s.scenes[i].id === id) return i;
      return -1;
    },
  };

  var store = Store.create(initial, actions);

  // 挂载 getters
  Object.keys(getters).forEach(function (k) {
    store.getState()[k] = function () {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(store.getState());
      return getters[k].apply(null, args);
    };
  });

  // 持久化（替换 zustand 的 debouncedSave + IndexedDB）
  var debouncedSave = _debounce(function () {
    try {
      var s = store.getState();
      if (!s.stage || !s.stage.id) return;
      var snapshot = {
        stage: s.stage,
        scenes: s.scenes,
        currentSceneId: s.currentSceneId,
        chats: s.chats,
        outlines: s.outlines,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY + ':' + s.stage.id, JSON.stringify(snapshot));
    } catch (e) { /* localStorage 可能满 */ }
  }, SAVE_DEBOUNCE_MS);

  store.subscribe(debouncedSave);

  // 公开 load 方法
  store.loadFromStorage = function (stageId) {
    try {
      var s = store.getState();
      // 已在内存中则跳过
      if (s.stage && s.stage.id === stageId && s.scenes.length) return Promise.resolve();
      var raw = localStorage.getItem(STORAGE_KEY + ':' + stageId);
      if (!raw) return Promise.resolve();
      var data = JSON.parse(raw);
      s.stage = data.stage;
      s.scenes = data.scenes || [];
      s.currentSceneId = data.currentSceneId;
      s.chats = data.chats || [];
      s.outlines = data.outlines || [];
      // 计算 generatingOutlines = 总大纲 - 已生成 scene
      s.generatingOutlines = (data.outlines || []).filter(function (o) {
        return !s.scenes.some(function (sc) { return sc.order === o.order; });
      });
      return Promise.resolve();
    } catch (e) { return Promise.reject(e); }
  };

  store.saveToStorage = function () { debouncedSave(); };

  store.PENDING_SCENE_ID = PENDING_SCENE_ID;

  // selectors 增强
  Store.createSelectors(store);

  global.OpenMAICStageStore = store;
})(typeof window !== 'undefined' ? window : globalThis);
