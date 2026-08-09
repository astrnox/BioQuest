/**
 * BioQuest — 数据存储集成模块（Dexie / IndexedDB）
 * 提供 IndexedDB 的轻量 ORM 封装，作为 Supabase 离线回退方案
 * 依赖：js/vendor/dexie.min.js -> window.Dexie
 *
 * 表结构：
 *   - cards: 卡片数据（id, deckId, front, back, ...）
 *   - reviews: 复习记录（id, cardId, rating, ts, stability, difficulty, state）
 *   - wrongbook: 错题记录（id, questionId, ts, reason, ...）
 *   - sessions: 学习会话（id, startTs, endTs, mode, count）
 *   - settings: 用户设置（key, value）
 */
(function () {
  'use strict';

  var DB_NAME = 'bioquest-store';
  var DB_VERSION = 1;
  var _db = null;

  function ensureDexie() {
    if (typeof window.Dexie === 'undefined') {
      console.warn('[DataStore] Dexie 未加载');
      return false;
    }
    return true;
  }

  function getDB() {
    if (_db) return _db;
    if (!ensureDexie()) return null;
    try {
      _db = new window.Dexie(DB_NAME);
      _db.version(DB_VERSION).stores({
        cards: '++id, deckId, createdAt',
        reviews: '++id, cardId, ts, [cardId+ts]',
        wrongbook: '++id, questionId, ts',
        sessions: '++id, startTs, mode',
        settings: 'key'
      });
      // 打开数据库
      _db.open().catch(function (e) {
        console.warn('[DataStore] IndexedDB 打开失败:', e);
      });
      return _db;
    } catch (e) {
      console.error('[DataStore] 初始化失败:', e);
      return null;
    }
  }

  /**
   * 通用添加记录
   */
  function addRecord(table, record) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    if (!db[table]) return Promise.reject(new Error('表不存在: ' + table));
    return db[table].add(record);
  }

  /**
   * 批量添加
   */
  function bulkAdd(table, records) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    if (!db[table]) return Promise.reject(new Error('表不存在: ' + table));
    return db[table].bulkAdd(records || []);
  }

  /**
   * 按 id 获取
   */
  function getRecord(table, id) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    if (!db[table]) return Promise.reject(new Error('表不存在: ' + table));
    return db[table].get(id);
  }

  /**
   * 获取全部
   */
  function getAll(table) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    if (!db[table]) return Promise.reject(new Error('表不存在: ' + table));
    return db[table].toArray();
  }

  /**
   * 查询：通过过滤函数
   * @param {string} table
   * @param {function(object):boolean} predicate
   * @returns {Promise<Array>}
   */
  function query(table, predicate) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    if (!db[table]) return Promise.reject(new Error('表不存在: ' + table));
    if (typeof predicate !== 'function') return db[table].toArray();
    return db[table].filter(predicate).toArray();
  }

  /**
   * 按 id 更新
   */
  function updateRecord(table, id, changes) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    if (!db[table]) return Promise.reject(new Error('表不存在: ' + table));
    return db[table].update(id, changes);
  }

  /**
   * 替换整条记录（put）
   */
  function putRecord(table, record) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    if (!db[table]) return Promise.reject(new Error('表不存在: ' + table));
    return db[table].put(record);
  }

  /**
   * 按 id 删除
   */
  function deleteRecord(table, id) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    if (!db[table]) return Promise.reject(new Error('表不存在: ' + table));
    return db[table].delete(id);
  }

  /**
   * 清空表
   */
  function clearTable(table) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    if (!db[table]) return Promise.reject(new Error('表不存在: ' + table));
    return db[table].clear();
  }

  /**
   * 计数
   */
  function count(table) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    if (!db[table]) return Promise.reject(new Error('表不存在: ' + table));
    return db[table].count();
  }

  /**
   * 按索引范围查询
   * @param {string} table
   * @param {string} indexName
   * @param {Array|number|string} range Dexie.where().between() 范围
   */
  function queryByIndex(table, indexName, range) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    if (!db[table]) return Promise.reject(new Error('表不存在: ' + table));
    var coll = db[table].where(indexName);
    if (Array.isArray(range)) {
      return coll.between(range[0], range[1], true, true).toArray();
    }
    return coll.equals(range).toArray();
  }

  // ===== 便捷方法 =====

  /**
   * 添加复习记录
   */
  function addReview(cardId, rating, ts, fsrsState) {
    return addRecord('reviews', Object.assign({
      cardId: cardId,
      rating: rating,
      ts: ts || Date.now()
    }, fsrsState || {}));
  }

  /**
   * 获取某张卡片的所有复习记录（按时间升序）
   */
  function getReviewsByCard(cardId) {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    return db.reviews.where('cardId').equals(cardId).sortBy('ts');
  }

  /**
   * 设置项
   */
  function setSetting(key, value) {
    return putRecord('settings', { key: key, value: value });
  }

  /**
   * 读取项
   */
  function getSetting(key, defaultVal) {
    return getRecord('settings', key).then(function (r) {
      return r ? r.value : defaultVal;
    }).catch(function () { return defaultVal; });
  }

  /**
   * 导出整个数据库为 JSON
   */
  function exportAll() {
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    var tables = ['cards', 'reviews', 'wrongbook', 'sessions', 'settings'];
    var out = {};
    var chain = Promise.resolve();
    tables.forEach(function (t) {
      chain = chain.then(function () {
        return db[t].toArray().then(function (arr) { out[t] = arr; });
      });
    });
    return chain.then(function () {
      out._exportedAt = new Date().toISOString();
      out._dbVersion = DB_VERSION;
      return out;
    });
  }

  /**
   * 从 JSON 导入（覆盖式）
   */
  function importAll(data) {
    if (!data || typeof data !== 'object') return Promise.reject(new Error('数据格式无效'));
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    var tables = ['cards', 'reviews', 'wrongbook', 'sessions', 'settings'];
    return db.transaction('rw', tables, function () {
      tables.forEach(function (t) {
        if (Array.isArray(data[t])) {
          db[t].clear();
          db[t].bulkAdd(data[t]);
        }
      });
    });
  }

  /**
   * 数据存储模块对外接口，基于 Dexie/IndexedDB 提供卡片、复习、错题、会话与设置的增删改查及导入导出能力，作为 Supabase 离线回退方案。
   * @type {Object}
   */
  window.DataStore = {
    DB_NAME: DB_NAME,
    DB_VERSION: DB_VERSION,
    getDB: getDB,
    addRecord: addRecord,
    bulkAdd: bulkAdd,
    getRecord: getRecord,
    getAll: getAll,
    query: query,
    updateRecord: updateRecord,
    putRecord: putRecord,
    deleteRecord: deleteRecord,
    clearTable: clearTable,
    count: count,
    queryByIndex: queryByIndex,
    addReview: addReview,
    getReviewsByCard: getReviewsByCard,
    setSetting: setSetting,
    getSetting: getSetting,
    exportAll: exportAll,
    importAll: importAll,
    isAvailable: ensureDexie
  };
})();
