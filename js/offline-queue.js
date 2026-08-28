/**
 * ============================================================
 * BioQuest — 离线写操作队列（Issue #130）
 * 离线（navigator.onLine === false）时，将写操作（收藏/错题/练习记录等
 * 云端同步）推入 IndexedDB 队列；网络恢复（online 事件）后按顺序重放，
 * 逐条成功才出队，避免离线操作丢失或与云端不一致。
 *
 * 用法：
 *   OfflineQueue.register(type, fn)     // 注册某类操作的执行器（返回 Promise）
 *   OfflineQueue.enqueue(type, payload) // 入队（离线时调用）
 *   OfflineQueue.flush()                // 手动触发重放（自动监听 online）
 *   OfflineQueue.size()                 // 当前积压数量（供 UI 展示）
 * ============================================================
 */
(function () {
  'use strict';

  var DB_NAME = 'BioQuestOfflineQueue';
  var STORE = 'ops';
  var _handlers = {};   // type -> fn(payload) => Promise
  var _flushing = false;

  function _open() {
    return new Promise(function (resolve, reject) {
      var idb;
      try { idb = (typeof indexedDB !== 'undefined') ? indexedDB : null; } catch (e) { idb = null; }
      if (!idb) { reject(new Error('IndexedDB 不可用')); return; }
      var req = idb.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('ts', 'ts');
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('打开队列失败')); };
    });
  }

  function _withStore(mode, fn) {
    return _open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var req = fn(tx.objectStore(STORE));
        tx.oncomplete = function () { resolve(req && req.result); };
        tx.onerror = function () { reject(tx.error || new Error('队列事务失败')); };
        tx.onabort = function () { reject(tx.error || new Error('队列事务中止')); };
      });
    });
  }

  /**
   * 注册某类操作的重放执行器。
   * @param {string} type - 操作类型
   * @param {Function} fn - (payload) => Promise；reject 表示重放失败（保留重试）
   */
  function register(type, fn) {
    if (typeof fn === 'function') _handlers[type] = fn;
  }

  /**
   * 入队一个写操作（幂等：IndexedDB 事务写失败时静默返回 false，不影响主流程）。
   * @param {string} type - 操作类型
   * @param {*} payload - 操作参数（可 JSON 序列化）
   * @returns {Promise<boolean>}
   */
  function enqueue(type, payload) {
    if (!type || !_handlers[type]) return Promise.resolve(false);
    return _withStore('readwrite', function (store) {
      return store.add({ type: type, payload: payload, ts: Date.now() });
    }).then(function () { return true; }).catch(function (e) {
      console.warn('[OfflineQueue] 入队失败:', e && e.message);
      return false;
    });
  }

  function _all() {
    return _withStore('readonly', function (store) {
      return new Promise(function (resolve, reject) {
        var reqGetAll = store.getAll();
        reqGetAll.onsuccess = function () { resolve(reqGetAll.result || []); };
        reqGetAll.onerror = function () { reject(reqGetAll.error); };
      });
    });
  }

  function _remove(id) {
    return _withStore('readwrite', function (store) {
      return store.delete(id);
    });
  }

  /**
   * 重放全部积压操作（成功出队，失败即停止，等待下次网络恢复再试）。
   * @returns {Promise<{replayed:number, remaining:number, stopped:boolean}>}
   */
  function flush() {
    if (_flushing) return Promise.resolve({ replayed: 0, remaining: 0, stopped: false });
    _flushing = true;
    var replayed = 0;
    var remaining = 0;
    var stopped = false;

    function replayNext(ops, i) {
      if (i >= ops.length) return Promise.resolve();
      var op = ops[i];
      var fn = _handlers[op.type];
      if (!fn) return replayNext(ops, i + 1);
      return fn(op.payload).then(function () {
        replayed++;
        return _remove(op.id).then(function () { return replayNext(ops, i + 1); });
      }, function (err) {
        console.warn('[OfflineQueue] 重放失败，暂停队列等待网络恢复:', op.type, (err && err.message) || err);
        stopped = true;
        remaining = ops.length - i;
        return Promise.resolve();
      });
    }

    return _all().then(function (ops) {
      return replayNext(ops, 0);
    }).then(function () {
      if (stopped) return Promise.resolve();
      return _all().then(function (left) { remaining = left.length; });
    }).catch(function () {
      remaining = 0;
    }).then(function () {
      _flushing = false;
      return { replayed: replayed, remaining: remaining, stopped: stopped };
    });
  }

  /**
   * 当前积压数量。
   * @returns {Promise<number>}
   */
  function size() {
    return _all().then(function (list) { return list.length; }).catch(function () { return 0; });
  }

  window.OfflineQueue = { register: register, enqueue: enqueue, flush: flush, size: size };

  // 网络恢复后自动重放；在线启动时若有积压也顺带清理一次。
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('online', function () { flush(); });
    if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
      // 延迟执行，避免与页面初始化争抢资源
      setTimeout(function () { flush(); }, 5000);
    }
  }
})();