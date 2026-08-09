/**
 * ============================================================
 * OpenMAIC Canvas Store — 画布 UI 状态（移植自 lib/store/canvas.ts）
 * ------------------------------------------------------------
 * 替代 zustand 版。负责：
 *   - 元素选择/编辑状态
 *   - Spotlight / Laser / Highlight / Zoom 等特效
 *   - 白板开关与清除动画
 *   - 视频播放 elementId
 *
 * 用法：
 *   var C = window.OpenMAICCanvasStore;
 *   C.getState().setSpotlight('el_1', { dimness: 0.5 });
 *   C.getState().setWhiteboardOpen(true);
 * ============================================================
 */
(function (global) {
  'use strict';

  var Store = global.OpenMAICStore;

  var initial = {
    // 元素选择
    activeElementIdList: [],
    handleElementId: '',
    editingElementId: '',
    hiddenElementIdList: [],

    // 视口
    canvasScale: 1,
    canvasPercentage: 90,
    viewportSize: 1000,
    viewportRatio: 0.5625, // 16:9
    canvasDragged: false,

    // 辅助显示
    showRuler: false,
    gridLineSize: 0,

    // 工具栏
    toolbarState: 'ai', // 'design' | 'ai' | 'elAnimation'
    showSelectPanel: false,
    showSearchPanel: false,

    // 教学特效
    spotlightElementId: '',
    spotlightOptions: null,
    spotlightMode: 'pixel', // 'pixel' | 'percentage'
    spotlightPercentageGeometry: null,
    highlightedElementIds: [],
    highlightOptions: null,
    laserElementId: '',
    laserOptions: null,
    zoomTarget: null,

    // 视频
    playingVideoElementId: '',

    // 白板
    whiteboardOpen: false,
    whiteboardClearing: false,

    // 其他
    thumbnailsFocus: false,
    editorAreaFocus: false,
    disableHotkeys: false,
    selectedTableCells: [],
  };

  var actions = {
    setActiveElementIdList: function (s, ids) {
      s.activeElementIdList = ids || [];
      if (ids.length === 1) s.handleElementId = ids[0];
      else if (ids.length === 0) s.handleElementId = '';
      if (ids.length > 0) s.toolbarState = 'design';
    },
    setHandleElementId: function (s, id) { s.handleElementId = id || ''; },
    setEditingElementId: function (s, id) { s.editingElementId = id || ''; },
    setHiddenElementIdList: function (s, ids) { s.hiddenElementIdList = ids || []; },
    clearSelection: function (s) {
      s.activeElementIdList = [];
      s.handleElementId = '';
      s.editingElementId = '';
    },
    setCanvasScale: function (s, scale) { s.canvasScale = scale; },
    setCanvasPercentage: function (s, p) { s.canvasPercentage = p; },
    setViewportSize: function (s, size) { s.viewportSize = size; },
    setViewportRatio: function (s, ratio) { s.viewportRatio = ratio; },
    setCanvasDragged: function (s, dragged) { s.canvasDragged = !!dragged; },
    setRulerState: function (s, show) { s.showRuler = !!show; },
    setGridLineSize: function (s, size) { s.gridLineSize = size; },
    setToolbarState: function (s, state) { s.toolbarState = state; },
    setSelectPanelState: function (s, show) { s.showSelectPanel = !!show; },
    setSearchPanelState: function (s, show) { s.showSearchPanel = !!show; },
    setThumbnailsFocus: function (s, focus) { s.thumbnailsFocus = !!focus; },
    setEditorAreaFocus: function (s, focus) { s.editorAreaFocus = !!focus; },
    setDisableHotkeysState: function (s, d) { s.disableHotkeys = !!d; },
    setSelectedTableCells: function (s, cells) { s.selectedTableCells = cells || []; },

    // 教学特效
    setSpotlight: function (s, elementId, options) {
      s.spotlightElementId = elementId || '';
      s.spotlightMode = 'pixel';
      s.spotlightOptions = Object.assign({ radius: 200, dimness: 0.7, transition: 300 }, options || {});
      s.spotlightPercentageGeometry = null;
    },
    setSpotlightPercentage: function (s, elementId, geometry, options) {
      s.spotlightElementId = elementId || '';
      s.spotlightMode = 'percentage';
      s.spotlightPercentageGeometry = geometry;
      s.spotlightOptions = Object.assign({ dimness: 0.7, transition: 300 }, options || {});
    },
    clearSpotlight: function (s) {
      s.spotlightElementId = '';
      s.spotlightOptions = null;
      s.spotlightMode = 'pixel';
      s.spotlightPercentageGeometry = null;
    },
    setHighlight: function (s, elementIds, options) {
      s.highlightedElementIds = elementIds || [];
      s.highlightOptions = Object.assign({ color: '#ff6b6b', opacity: 0.3, borderWidth: 3, animated: true }, options || {});
    },
    clearHighlight: function (s) {
      s.highlightedElementIds = [];
      s.highlightOptions = null;
    },
    setLaser: function (s, elementId, options) {
      s.laserElementId = elementId || '';
      s.laserOptions = Object.assign({ color: '#ff0000', duration: 3000 }, options || {});
    },
    clearLaser: function (s) {
      s.laserElementId = '';
      s.laserOptions = null;
    },
    setZoom: function (s, elementId, scale) {
      s.zoomTarget = elementId ? { elementId: elementId, scale: scale } : null;
    },
    clearZoom: function (s) { s.zoomTarget = null; },
    clearAllEffects: function (s) {
      s.spotlightElementId = '';
      s.spotlightOptions = null;
      s.spotlightMode = 'pixel';
      s.spotlightPercentageGeometry = null;
      s.highlightedElementIds = [];
      s.highlightOptions = null;
      s.laserElementId = '';
      s.laserOptions = null;
      s.zoomTarget = null;
      // 注意：playingVideoElementId 故意不清
    },

    // 视频
    playVideo: function (s, elementId) { s.playingVideoElementId = elementId || ''; },
    pauseVideo: function (s) { s.playingVideoElementId = ''; },

    // 白板
    setWhiteboardOpen: function (s, open) { s.whiteboardOpen = !!open; },
    setWhiteboardClearing: function (s, clearing) { s.whiteboardClearing = !!clearing; },

    // 重置（保留视口）
    resetCanvasState: function (s) {
      var savedSize = s.viewportSize;
      var savedRatio = s.viewportRatio;
      var keys = Object.keys(initial);
      for (var i = 0; i < keys.length; i++) s[keys[i]] = initial[keys[i]];
      s.viewportSize = savedSize;
      s.viewportRatio = savedRatio;
    },
  };

  var store = Store.create(initial, actions);
  Store.createSelectors(store);

  global.OpenMAICCanvasStore = store;
})(typeof window !== 'undefined' ? window : globalThis);
