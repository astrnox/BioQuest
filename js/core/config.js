/**
 * ============================================================
 * BioQuest — 运行时配置（Issue #106：配置外置）
 * 将原先硬编码在 JS 源码中的配置项集中到独立配置文件，
 * 便于配置管理与安全隔离。加载顺序：本文件须在依赖方之前引入。
 * ============================================================
 */
(function () {
  'use strict';

  // 默认配置（纯前端静态站，无法读取服务端环境变量；
  // 部署时可通过修改本文件集中调整，无需改动业务源码）
  var DEFAULT_CONFIG = {
    // Metaso 知识库 subject_id（AI 知识库检索）
    METASO_SUBJECT_ID: '2045811707737636864'
  };

  var cfg = {};
  try {
    if (typeof window !== 'undefined' && window.BQ_CONFIG && typeof window.BQ_CONFIG === 'object') {
      // 若部署环境已注入 BQ_CONFIG（如构建产物），以注入值为准
      cfg = window.BQ_CONFIG;
    }
  } catch (e) { /* 忽略 */ }

  window.BQ_CONFIG = Object.assign({}, DEFAULT_CONFIG, cfg);
})();