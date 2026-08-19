/**
 * BioQuest — 数据存储集成模块（Dexie / IndexedDB）
 * 提供 IndexedDB 的轻量 ORM 封装，作为 Supabase 离线回退方案
 * 依赖：js/vendor/dexie.min.js -> window.Dexie
 *
 * ============================================================
 * P2 Issue #19：schema 版本化迁移
 * ------------------------------------------------------------
 * 表结构使用「版本数组 SCHEMAS」声明，每个版本包含：
 *   - version : Dexie 目标版本号
 *   - stores  : 该版本下各表及其索引（Dexie 自动按版本 diff 出新增表/索引）
 *   - tables  : 需要「行级字段迁移」的表（可选）
 *   - transform: (row) => row 纯函数，仅做字段级映射（如旧题干 ID → bioID）
 *
 * 设计要点：
 *   1) 索引新增由 Dexie 自动完成（读全部行重建索引，幂等、无数据丢失）；
 *   2) 行级 transform 仅做字段归一，绝不动 ++id 主键；
 *   3) 升级过程在 Dexie 事务内执行，任一步失败整体回滚（不会留下半迁移态）；
 *   4) 导出文件带 _dbVersion；导入时按版本差调用 migrateSnapshot() 做等价转换，
 *      保证「旧快照 → 新 schema」的字段形态一致（导入前/后比对迁移路径）。
 *
 * 纯迁移逻辑（planUpgrades / migrateSnapshot / SCHEMAS）不依赖运行中的 DB，
 * 可被 Jest 直接加载测试（见 tests/unit/data-store.test.js）。
 * ============================================================
 */
(function () {
  'use strict';

  var DB_NAME = 'bioquest-store';
  var DB_VERSION = 2;
  var _db = null;

  /**
   * bioID 解析：优先用 window.bioIdMap / window.resolveQuestionBioId（storage.js），
   * 测试或离线场景可传 resolver 覆盖。已是 bioID（BQ-…）原样返回。
   */
  function _resolveBioId(ref, map) {
    var s = String(ref == null ? '' : ref);
    if (!s) return s;
    if (/^BQ-[A-Za-z0-9_-]+-[0-9a-f]{12}$/.test(s)) return s;
    if (map && Object.prototype.hasOwnProperty.call(map, s)) return map[s];
    if (typeof window !== 'undefined' && typeof window.resolveQuestionBioId === 'function') {
      var r = window.resolveQuestionBioId(s);
      if (r && r !== s) return r;
    }
    if (typeof window !== 'undefined' && window.bioIdMap && Object.prototype.hasOwnProperty.call(window.bioIdMap, s)) {
      return window.bioIdMap[s];
    }
    return s;
  }

  /**
   * 版本化 schema 定义。SCHEMAS 数组末尾即当前目标版本（必须与 DB_VERSION 一致）。
   *   版本 1：基线。
   *   版本 2：cards 增加 tag/diff/[tag+diff] 索引（题目卡按 考点+难度 组合索引，
   *          为「新索引 [tag+diff]」迁移；wrongbook 增加 [questionId+ts] 组合索引），
   *          并对 wrongbook.questionId 做旧 ID → bioID 行级迁移。
   * 规则：新增索引 = 安全增量（Dexie 全表重建索引）；改动索引/表 = 破坏性，需写 transform 与测试。
   */
  var SCHEMAS = [
    { version: 1, stores: { cards: '++id, deckId, createdAt', reviews: '++id, cardId, ts, [cardId+ts]', wrongbook: '++id, questionId, ts', sessions: '++id, startTs, mode', settings: 'key' } },
    {
      version: 2,
      stores: {
        cards: '++id, deckId, createdAt, tag, diff, [tag+diff]',
        reviews: '++id, cardId, ts, [cardId+ts]',
        wrongbook: '++id, questionId, ts, [questionId+ts]',
        sessions: '++id, startTs, mode',
        settings: 'key'
      },
      tables: ['wrongbook'],
      transform: function (row, map) {
        if (!row || typeof row !== 'object' || row.questionId == null) return row;
        var q = _resolveBioId(row.questionId, map);
        if (q !== String(row.questionId)) {
          row.questionIdLegacy = row.questionId; // 保留旧值便于回溯/审计
          row.questionId = q;
        }
        return row;
      }
    }
  ];

  function ensureDexie() {
    if (typeof window.Dexie === 'undefined') {
      console.warn('[DataStore] Dexie 未加载');
      return false;
    }
    return true;
  }

  /**
   * 规划从 fromVersion 升级到 toVersion 需要依次应用的版本列表（升序）。
   * 纯函数，供 Dexie 升级与测试复用。
   * @param {number} fromVersion - 当前（旧）版本
   * @param {number} toVersion - 目标版本
   * @returns {number[]}
   */
  function planUpgrades(fromVersion, toVersion) {
    return SCHEMAS
      .filter(function (s) { return s.version > fromVersion && s.version <= toVersion; })
      .map(function (s) { return s.version; })
      .sort(function (a, b) { return a - b; });
  }

  /**
   * 对一份「导出的快照对象」做按版本的等价迁移（不依赖 Dexie / IndexedDB）。
   * 与 Dexie upgrade() 中的 transform 保持一致——导入旧版本快照时，
   * 先按版本差回放 transform，使旧数据形态与新 schema 一致。
   * 纯函数、不修改入参（返回新对象）。
   * @param {Object} snap - { _dbVersion, cards, reviews, wrongbook, ... }
   * @param {Object} [opts] - { to, map }
   * @returns {Object} 迁移后的快照（含升级后的 _dbVersion）
   */
  function migrateSnapshot(snap, opts) {
    opts = opts || {};
    var to = opts.to || DB_VERSION;
    var map = opts.map || (typeof window !== 'undefined' ? window.bioIdMap : null);
    if (!snap || typeof snap !== 'object') return snap;
    var out = {};
    for (var k in snap) { if (Object.prototype.hasOwnProperty.call(snap, k)) out[k] = snap[k]; }

    var from = typeof out._dbVersion === 'number' ? out._dbVersion : 1;
    var versions = planUpgrades(from, to);
    versions.forEach(function (v) {
      var def = null;
      for (var i = 0; i < SCHEMAS.length; i++) { if (SCHEMAS[i].version === v) { def = SCHEMAS[i]; break; } }
      if (!def || typeof def.transform !== 'function') return;
      (def.tables || []).forEach(function (table) {
        if (!Array.isArray(out[table])) return;
        // 逐行浅拷贝后再套 transform，保证迁移为纯函数、不改动入参原对象
        out[table] = out[table].map(function (row) {
          if (!row || typeof row !== 'object') return row;
          var copy = {};
          for (var k in row) { if (Object.prototype.hasOwnProperty.call(row, k)) copy[k] = row[k]; }
          return def.transform(copy, map);
        });
      });
    });
    out._dbVersion = to;
    return out;
  }

  function getDB() {
    if (_db) return _db;
    if (!ensureDexie()) return null;
    try {
      _db = new window.Dexie(DB_NAME);
      // 依次注册每个版本；Dexie 打开时自动执行缺失版本的升级（事务内，失败回滚）
      SCHEMAS.forEach(function (def) {
        var ver = _db.version(def.version).stores(def.stores);
        if (typeof def.transform === 'function' && def.tables && def.tables.length) {
          ver.upgrade(function (tx) {
            // 行级迁移：逐表逐行套 transform；本例仅 wrongbook.questionId 归一
            def.tables.forEach(function (table) {
              return tx.table(table).toCollection().modify(function (row, ref) {
                var next = def.transform(row);
                if (next !== row) ref.value = next;
              });
            });
          });
        }
      });
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
   * 清空整库（P1-17 GDPR/个保法删除权：连同 IndexedDB 用户数据一并删除，而非仅清 Web Storage）。
   * 会先关闭当前 Dexie 连接，再调用 indexedDB.deleteDatabase 删除整个 bioquest-store 数据库。
   * 若其他标签页仍持有连接（onblocked），尽力而为：resolve(false) 但不抛出。
   * @returns {Promise<boolean>} 是否删除成功
   */
  function clearAll() {
    try {
      if (_db) { try { _db.close(); } catch (e) {} _db = null; }
    } catch (e) {}
    return new Promise(function (resolve) {
      if (typeof indexedDB !== 'object' || !indexedDB) { resolve(false); return; }
      var req;
      try { req = indexedDB.deleteDatabase(DB_NAME); } catch (e) { resolve(false); return; }
      req.onsuccess = function () { resolve(true); };
      req.onerror = function () { resolve(false); };
      req.onblocked = function () { resolve(false); }; // 其他标签页仍打开，尽力而为
    });
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
   * 导出整个数据库为 JSON（带 _dbVersion，供导入按版本迁移）
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
   * 从 JSON 导入（覆盖式）。
   * 导入时先按快照 _dbVersion 与当前 DB_VERSION 的版本差执行 migrateSnapshot()，
   * 使旧版本导出数据与当前 schema 形态一致后再写入（行为与 Dexie upgrade 一致）。
   */
  function importAll(data, opts) {
    if (!data || typeof data !== 'object') return Promise.reject(new Error('数据格式无效'));
    var snap = migrateSnapshot(data, opts || {});
    var db = getDB();
    if (!db) return Promise.reject(new Error('DB 未就绪'));
    var tables = ['cards', 'reviews', 'wrongbook', 'sessions', 'settings'];
    return db.transaction('rw', tables, function () {
      tables.forEach(function (t) {
        if (Array.isArray(snap[t])) {
          db[t].clear();
          db[t].bulkAdd(snap[t]);
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
    SCHEMAS: SCHEMAS,
    PLAN_VERSION: DB_VERSION,
    getDB: getDB,
    planUpgrades: planUpgrades,
    migrateSnapshot: migrateSnapshot,
    addRecord: addRecord,
    bulkAdd: bulkAdd,
    getRecord: getRecord,
    getAll: getAll,
    query: query,
    updateRecord: updateRecord,
    putRecord: putRecord,
    deleteRecord: deleteRecord,
    clearTable: clearTable,
    clearAll: clearAll,
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