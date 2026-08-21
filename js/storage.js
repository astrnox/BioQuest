/**
 * ============================================================
 * BioQuest — 数据持久化模块（双层存储）
 * 主存储：Supabase PostgreSQL（云端同步）
 * 缓存层：localStorage（离线回退 + 快速读写）
 * ============================================================
 */

'use strict';

var STORAGE_PREFIX = 'bioquest_';

var KEYS = {
  SETTINGS: STORAGE_PREFIX + 'settings',
  RECORDS: STORAGE_PREFIX + 'records',
  FAVORITES: STORAGE_PREFIX + 'favorites',
  WRONG_QUESTIONS: STORAGE_PREFIX + 'wrong_questions',
  STATS: STORAGE_PREFIX + 'stats',
  DEVICE_ID: STORAGE_PREFIX + 'device_id',
  PROFILE: STORAGE_PREFIX + 'profile'
};

/* ============================================================
 * 底层工具
 * ============================================================ */

function safeGetJSON(key, defaultValue) {
  var raw;
  try {
    raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    // P1-14(旧)：加载时进行哈希校验，检测篡改 / 截断损坏，避免把脏数据注入运行时
    if (_isIntegrityProtected(key)) {
      var ok = _verifyIntegrity(key, raw);
      if (ok === 'tampered') {
        console.warn('[BioQuest Storage] ' + key + ' 完整性校验失败，判定为被篡改或损坏，已忽略该数据。');
        return defaultValue;
      }
    }
    var parsed = JSON.parse(raw);
    return (parsed === null || parsed === undefined) ? defaultValue : parsed;
  } catch (e) {
    console.warn('[BioQuest Storage] 读取 ' + key + ' 失败:', e.message);
    return defaultValue;
  }
}

function safeSetJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // P1-14(旧)：写入成功后记录旁路哈希，供后续加载时校验；失败不影响本次写入
    if (_isIntegrityProtected(key)) _recordIntegrity(key);
    return true;
  } catch (e) {
    var isQuota = !!(e && (e.name === 'QuotaExceededError' || e.code === 22 ||
      String(e).toLowerCase().indexOf('quota') !== -1));
    // P1-15：配额超限时先清理可重建的缓存类键再重试一次，避免关键数据静默丢失
    if (isQuota && _evictCacheOnce() > 0) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        if (_isIntegrityProtected(key)) _recordIntegrity(key);
        return true;
      } catch (e2) {
        console.warn('[BioQuest Storage] 写入 ' + key + ' 失败（清理缓存后配额仍不足）:', e2.message);
        return false;
      }
    }
    if (isQuota) {
      var usage = getStorageUsage();
      if (usage.percent > 80 && !_quotaWarnFired) {
        _quotaWarnFired = true;
        console.warn('[BioQuest Storage] localStorage 已用约 ' + usage.percent.toFixed(0) + '%，接近配额，可能发生数据写入失败。建议导出备份并清理缓存数据。');
      }
      return false;
    }
    console.warn('[BioQuest Storage] 写入 ' + key + ' 失败:', e.message);
    return false;
  }
}

var _quotaWarnFired = false;

/**
 * 估算 localStorage 已用字节数与占比（约 5MB 上限），供配额监控（P1-15）。
 * @returns {{bytes:number, limit:number, percent:number}}
 */
function getStorageUsage() {
  var bytes = 0;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      var v = localStorage.getItem(k);
      bytes += (k ? k.length : 0) + (v ? (v.length * 1) : 0); // 每个字符约 1 字节估算
    }
  } catch (e) {}
  var limit = 5 * 1024 * 1024; // 约 5MB
  return { bytes: bytes, limit: limit, percent: Math.min(100, bytes / limit * 100) };
}

/* ============================================================
 * P1-14(旧)：数据版本控制 + 完整性（篡改/损坏）校验
 * 方案：存储值保持原始格式不变（不打包成 envelope，避免破坏跨模块直接读取），
 *      仅维护一份「旁路校验元数据」bioquest_meta：{ v, checksums, updatedAt }，
 *      写入成功时记录该键的值哈希，加载时复算比对，不匹配即判定为被篡改/截断。
 * 说明：纯前端无法做到防篡改（用户可随意改 localStorage），此处目标是把
 *      「肉眼难以察觉的脏数据/截断」显式化为「忽略 + 报错」，避免脏数据污染运行时。
 * ============================================================ */

var STORAGE_SCHEMA_VERSION = 1;          // 存储结构 schema 版本号，便于未来做格式迁移
var INTEGRITY_META_KEY = STORAGE_PREFIX + 'meta';
var _integrityCache = null;              // 内存缓存的元数据副本，避免每次读写都 parse

function _isIntegrityProtected(key) {
  // 只对「由 storage.js 全程写入」的键做自动校验，避免因其他模块直接 setItem
  // （quiz.js / supabase.js / supabase-client.js 会直接写 records/favorites/...）
  // 造成的旁路哈希不同步 → 误判为篡改。目前受保护域 = 设置 + 进度快照。
  return key === KEYS.SETTINGS ||
    (typeof key === 'string' && key.indexOf(PROGRESS_PREFIX) === 0);
}

/**
 * FNV-1a 32 位字符串哈希 -> 8 位十六进制字符串（用于本地数据轻量校验）。
 */
function _hashString(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return ('000000000' + h.toString(16)).slice(-8);
}

function _loadMeta() {
  if (_integrityCache) return _integrityCache;
  var m;
  try {
    var raw = localStorage.getItem(INTEGRITY_META_KEY);
    m = raw ? JSON.parse(raw) : null;
  } catch (e) { m = null; }
  if (!m || typeof m !== 'object' || typeof m.checksums !== 'object') {
    m = { v: STORAGE_SCHEMA_VERSION, checksums: {}, updatedAt: Date.now() };
  }
  _integrityCache = m;
  return m;
}

function _saveMeta() {
  var m = _loadMeta();
  try {
    localStorage.setItem(INTEGRITY_META_KEY, JSON.stringify({ v: m.v, checksums: m.checksums, updatedAt: m.updatedAt }));
  } catch (e) {
    // 元数据写入失败仅影响后续校验能力，不影响业务写入本身
  }
}

/**
 * 写入成功后记录指定键的旁路哈希。校验元数据本身不属于受保护键，不会递归。
 */
function _recordIntegrity(key) {
  var raw;
  try { raw = localStorage.getItem(key); } catch (e) { return; }
  if (raw === null) return;
  var m = _loadMeta();
  m.checksums[key] = _hashString(raw);
  m.updatedAt = Date.now();
  _saveMeta();
}

/**
 * 校验指定键的旁路哈希。
 * @returns {'ok'|'untracked'|'tampered'} untracked 表示尚无旁路哈希（旧数据），按通过处理
 */
function _verifyIntegrity(key, raw) {
  var m = _loadMeta();
  if (typeof m.checksums[key] !== 'string') return 'untracked';
  if (_hashString(raw) !== m.checksums[key]) {
    return 'tampered';
  }
  return 'ok';
}

/**
 * 对外校验接口：扫描受保护域（设置 + 全部进度快照），返回整体状态（供工具/审计/设置页展示）。
 * @returns {{version:number, protectedKeys:string[], tampered:string[], untracked:string[], ok:string[]}}
 */
function verifyStorageIntegrity() {
  var m = _loadMeta();
  var all = [KEYS.SETTINGS];
  try {
    for (var z = 0; z < localStorage.length; z++) {
      var kz = localStorage.key(z);
      if (kz && kz.indexOf(PROGRESS_PREFIX) === 0) all.push(kz);
    }
  } catch (e) {}
  var result = { version: m.v, protectedKeys: all, tampered: [], untracked: [], ok: [] };
  for (var i = 0; i < all.length; i++) {
    var key = all[i];
    var raw;
    try { raw = localStorage.getItem(key); } catch (e) { raw = null; }
    if (raw === null) {
      result.untracked.push(key); // 键尚不存在，暂无数据可校验
      continue;
    }
    var r = _verifyIntegrity(key, raw);
    if (r === 'tampered') result.tampered.push(key);
    else if (r === 'untracked') result.untracked.push(key);
    else result.ok.push(key);
  }
  return result;
}
window.verifyStorageIntegrity = verifyStorageIntegrity;
// 便于旧数据迁移时主动补记旁路哈希（例如首次升级后触发一次全量记录）
function backfillStorageIntegrity() {
  var filled = 0;
  var all = [KEYS.SETTINGS];
  try {
    for (var z = 0; z < localStorage.length; z++) {
      var kz = localStorage.key(z);
      if (kz && kz.indexOf(PROGRESS_PREFIX) === 0) all.push(kz);
    }
  } catch (e) {}
  for (var i = 0; i < all.length; i++) {
    var raw;
    try { raw = localStorage.getItem(all[i]); } catch (e) { raw = null; }
    if (raw === null) continue;
    _recordIntegrity(all[i]);
    filled++;
  }
  return filled;
}
window.backfillStorageIntegrity = backfillStorageIntegrity;

/**
 * 清除可重建的缓存类键（题面缓存/横幅/预览等），用于配额超限时的保守回收。
 * @returns {number} 实际删除的键数量
 */
function _evictCacheOnce() {
  var removed = 0;
  try {
    for (var i = localStorage.length - 1; i >= 0; i--) {
      var k = localStorage.key(i);
      if (k && (k.indexOf('cache') !== -1 || k.indexOf('banner') !== -1 || k.indexOf('preview') !== -1)) {
        try { localStorage.removeItem(k); removed++; } catch (e) {}
      }
    }
  } catch (e) {}
  return removed;
}

/**
 * 清除全部业务数据（P1-17 GDPR/个保法：删除所有本地数据）。
 *   - Web Storage：清 bioquest_* 前缀的 localStorage 与 sessionStorage 键，
 *     保留 Supabase 账号会话 token（sb-*）以维持登录；
 *   - IndexedDB：删除 bioquest-store（Dexie 用户数据：cards/reviews/wrongbook/sessions/settings）
 *     与 BioQuestCache（可重建的模块缓存 DB）。
 * 由于 IndexedDB 删除为异步，本函数返回 Promise<boolean[]>；调用方可 .then 感知结果。
 */
function clearAllLocalData() {
  _integrityCache = null; // 清库后丢弃内存中的校验元数据缓存，避免残留陈旧哈希
  return new Promise(function (resolve) {
    // 1) Web Storage
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf('bioquest_') === 0) localStorage.removeItem(k);
      }
    } catch (e) {}
    try {
      for (var j = sessionStorage.length - 1; j >= 0; j--) {
        var sk = sessionStorage.key(j);
        if (sk && sk.indexOf('bioquest_') === 0) sessionStorage.removeItem(sk);
      }
    } catch (e) {}

    // 2) IndexedDB：优先走 DataStore.clearAll()（会先关闭 Dexie 连接再删库），
    //    覆盖 bioquest-store 用户数据库；BioQuestCache 为可重建模块缓存，一并删除。
    var idbCalls = [];
    if (typeof window.DataStore === 'object' && typeof window.DataStore.clearAll === 'function') {
      idbCalls.push(window.DataStore.clearAll());
    } else {
      idbCalls.push(_deleteIndexedDb('bioquest-store'));
    }
    idbCalls.push(_deleteIndexedDb('BioQuestCache'));

    Promise.all(idbCalls).then(function (results) {
      if (results.join('').indexOf('false') !== -1) {
        console.warn('[BioQuest Storage] 部分 IndexedDB 数据库删除未完成（可能因其他标签页仍打开）。建议关闭其他标签页后重试。');
      }
      resolve(results);
    }, function () {
      resolve([]);
    });
  });
}

/**
 * 直接调用 indexedDB.deleteDatabase（尽力而为，异步）。
 * @returns {Promise<boolean>}
 */
function _deleteIndexedDb(name) {
  return new Promise(function (resolve) {
    if (typeof indexedDB !== 'object' || !indexedDB) { resolve(false); return; }
    var req;
    try { req = indexedDB.deleteDatabase(name); } catch (e) { resolve(false); return; }
    req.onsuccess = function () { resolve(true); };
    req.onerror = function () { resolve(false); };
    req.onblocked = function () { resolve(false); };
  });
}

/**
 * 字符串 hash 函数，将任意字符串转换为稳定的 32 位正整数
 * 用于生成题目数字 ID，避免 parseInt 返回 NaN
 */
function hashQuestionId(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
window.hashQuestionId = hashQuestionId;

/**
 * Issue #10：解析题目稳定 bioID
 *   - 已是 bioID（BQ-…）原样返回；
 *   - 旧 hash/数字 ID 通过 window.bioIdMap（bioid-map.json）映射为 bioID；
 *   - 无法解析则原样返回（回退逻辑由调用方保证）。
 */
function resolveQuestionBioId(id) {
  if (id === undefined || id === null || id === '') return id;
  var s = String(id);
  if (/^BQ-[A-Za-z0-9]+-[0-9a-f]{12}$/.test(s)) return s;
  if (window.bioIdMap && Object.prototype.hasOwnProperty.call(window.bioIdMap, s)) {
    return window.bioIdMap[s];
  }
  return s;
}
window.resolveQuestionBioId = window.resolveQuestionBioId || resolveQuestionBioId;

/**
 * Issue #10：将旧 hash/数字 ID 引用的本地数据迁移到稳定 bioID。
 * 覆盖 favorites（ID 数组）、wrong_questions（{qId}）、records（questions[].questionId/.id）。
 * 幂等：已迁移项（BQ-…）保持不变，重复调用安全。
 * 由 loader.js 在 bioid-map.json 加载就绪后触发。
 * @returns {number} 发生迁移的数据类别数（0 = 无需迁移）
 */
function migrateLocalDataToBioId() {
  var map = window.bioIdMap;
  if (!map || typeof map !== 'object') return 0;
  var resolve = window.resolveQuestionBioId || resolveQuestionBioId;
  var migrated = 0;

  // favorites：旧 hash/数字 ID -> bioID
  var favs = safeGetJSON(KEYS.FAVORITES, []);
  if (Array.isArray(favs)) {
    var newFavs = favs.map(function (id) { return resolve(id); });
    if (JSON.stringify(newFavs) !== JSON.stringify(favs)) {
      safeSetJSON(KEYS.FAVORITES, newFavs);
      migrated++;
    }
  }

  // wrong_questions：{ qId: 旧ID } -> bioID
  var wrongs = safeGetJSON(KEYS.WRONG_QUESTIONS, []);
  if (Array.isArray(wrongs)) {
    var wrongChanged = false;
    for (var i = 0; i < wrongs.length; i++) {
      if (wrongs[i] && wrongs[i].qId) {
        var wBio = resolve(wrongs[i].qId);
        if (wBio !== String(wrongs[i].qId)) {
          wrongs[i].qId = wBio;
          wrongChanged = true;
        }
      }
    }
    if (wrongChanged) {
      safeSetJSON(KEYS.WRONG_QUESTIONS, wrongs);
      migrated++;
    }
  }

  // records：questions[].questionId/.id -> bioID
  var records = safeGetJSON(KEYS.RECORDS, []);
  if (Array.isArray(records)) {
    var recChanged = false;
    for (var r = 0; r < records.length; r++) {
      var qs = records[r] && records[r].questions;
      if (!Array.isArray(qs)) continue;
      for (var q = 0; q < qs.length; q++) {
        var item = qs[q];
        if (!item) continue;
        var oldRef = item.questionId || item.id;
        if (oldRef) {
          var rBio = resolve(oldRef);
          if (rBio !== String(oldRef)) {
            if (item.questionId !== undefined) item.questionId = rBio;
            else item.id = rBio;
            recChanged = true;
          }
        }
      }
    }
    if (recChanged) {
      safeSetJSON(KEYS.RECORDS, records);
      migrated++;
    }
  }

  if (migrated > 0) {
    console.info('[BioQuest Storage] 已迁移 ' + migrated + ' 类本地数据到稳定 bioID');
  }
  return migrated;
}
window.migrateLocalDataToBioId = migrateLocalDataToBioId;

/**
 * 获取设备 ID（唯一标识）
 */
function getDeviceId() {
  var id = localStorage.getItem(KEYS.DEVICE_ID);
  if (!id) {
    id = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    localStorage.setItem(KEYS.DEVICE_ID, id);
  }
  return id;
}

/* ============================================================
 * 用户设置
 * ============================================================ */

function saveSetting(key, value) {
  var settings = safeGetJSON(KEYS.SETTINGS, {});
  settings[key] = value;
  return safeSetJSON(KEYS.SETTINGS, settings);
}

function loadSetting(key, defaultValue) {
  var settings = safeGetJSON(KEYS.SETTINGS, {});
  return settings.hasOwnProperty(key) ? settings[key] : defaultValue;
}

function getAllSettings() {
  return safeGetJSON(KEYS.SETTINGS, {});
}

/* ============================================================
 * 练习记录
 * ============================================================ */

function saveRecord(record) {
  if (!record) return false;

  var records = safeGetJSON(KEYS.RECORDS, []);

  var fullRecord = {
    id: record.id || 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
    timestamp: record.timestamp || Date.now(),
    date: record.date || new Date().toISOString().split('T')[0],
    totalQuestions: record.totalQuestions || 0,
    correctCount: record.correctCount || 0,
    score: record.score || 0,
    totalScore: record.totalScore || 0,
    duration: record.duration || 0,
    module: record.module || 'general',
    questions: record.questions || []
  };

  records.push(fullRecord);

  var maxRecords = 200;
  if (records.length > maxRecords) {
    records.splice(0, records.length - maxRecords);
  }

  var saved = safeSetJSON(KEYS.RECORDS, records);

  // P0-3: Dual-write 到 Supabase（fire-and-forget，不阻塞 UI）
  _syncPracticeRecordToSupabase(fullRecord);

  return saved;
}

/**
 * P0-3: 异步同步单条练习记录到 Supabase
 * 仅登录用户触发；失败静默（localStorage 已是数据源）
 */
function _syncPracticeRecordToSupabase(fullRecord) {
  if (typeof window.isLoggedIn !== 'function' || !window.isLoggedIn()) return;
  if (typeof window.syncPracticeRecordToSupabase !== 'function') return;
  try {
    // 把 storage.js 格式转换为 supabase-client.js 期望的格式
    var moduleNum = 1;
    var modStr = String(fullRecord.module || '');
    if (/^module[_-]?(\d+)/i.test(modStr)) {
      moduleNum = parseInt(RegExp.$1, 10) || 1;
    } else if (fullRecord.moduleNum) {
      moduleNum = parseInt(fullRecord.moduleNum, 10) || 1;
    }
    var answers = Array.isArray(fullRecord.questions) ? fullRecord.questions.map(function (q, idx) {
      return {
        question_id: q.questionId || q.id || idx,
        question: q.question || '',
        subject: q.subject || '',
        concept: q.concept || '',
        userAnswers: q.userAnswers || {},
        correct: (q.score || 0) > 0,
        score: q.score || 0
      };
    }) : [];
    var record = {
      answers: answers,
      module_num: moduleNum,
      subject: fullRecord.module || '',
      score: fullRecord.correctCount || 0,
      duration: fullRecord.duration || 0,
      is_correct: fullRecord.totalQuestions > 0 && fullRecord.correctCount === fullRecord.totalQuestions,
      question_id: (answers[0] && answers[0].question_id) || 0
    };
    window.syncPracticeRecordToSupabase(record).catch(function (e) {
      console.warn('[storage] syncPracticeRecordToSupabase 失败:', e && e.message);
    });
  } catch (e) {
    console.warn('[storage] _syncPracticeRecordToSupabase 异常:', e && e.message);
  }
}

function getRecords(options) {
  options = options || {};
  var module = options.module || null;
  var limit = options.limit || null;
  var offset = options.offset || 0;
  var records = safeGetJSON(KEYS.RECORDS, []);

  // 确保 records 是数组
  if (!Array.isArray(records)) {
    records = [];
  }

  records.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });

  if (module) {
    records = records.filter(function (r) { return r.module === module; });
  }

  if (offset > 0) {
    records = records.slice(offset);
  }

  if (limit !== null && limit > 0) {
    records = records.slice(0, limit);
  }

  return records;
}

function clearRecords() {
  return safeSetJSON(KEYS.RECORDS, []);
}

/* ============================================================
 * 收藏题目管理
 * ============================================================ */

function toggleFavorite(qId) {
  if (!qId) return false;
  qId = (window.resolveQuestionBioId || resolveQuestionBioId)(qId);

  var favorites = safeGetJSON(KEYS.FAVORITES, []);
  var index = favorites.indexOf(qId);

  if (index === -1) {
    favorites.push(qId);
    safeSetJSON(KEYS.FAVORITES, favorites);
    _syncFavoriteToSupabase(qId, true);
    return true;
  } else {
    favorites.splice(index, 1);
    safeSetJSON(KEYS.FAVORITES, favorites);
    _syncFavoriteToSupabase(qId, false);
    return false;
  }
}

function getFavorites() {
  var favs = safeGetJSON(KEYS.FAVORITES, []);
  return Array.isArray(favs) ? favs : [];
}

function isFavorite(qId) {
  if (!qId) return false;
  // Issue #10：与 toggleFavorite 一致，先解析为稳定 bioID 再比对，避免旧 ID 失配
  qId = (window.resolveQuestionBioId || resolveQuestionBioId)(qId);
  var favorites = safeGetJSON(KEYS.FAVORITES, []);
  return favorites.includes(qId);
}

function _syncFavoriteToSupabase(qId, isFav) {
  if (typeof window.isLoggedIn !== 'function' || !window.isLoggedIn()) return;
  var bioId = (window.resolveQuestionBioId || resolveQuestionBioId)(qId);
  if (isFav) {
    if (typeof window.saveFavorite === 'function') {
      window.saveFavorite(bioId, 1, '', '');
    } else {
      saveFavorite(bioId, 1, '', '');
    }
  } else {
    if (typeof window.deleteFavorite === 'function') {
      window.deleteFavorite(bioId);
    } else {
      deleteFavorite(bioId);
    }
  }
}

/* ============================================================
 * 错题管理
 * ============================================================ */

function addWrongQuestion(qId, module, questionText, fullQuestion) {
  if (!qId) return false;
  qId = (window.resolveQuestionBioId || resolveQuestionBioId)(qId);
  module = module || 'general';
  questionText = questionText || '';

  var wrongQuestions = safeGetJSON(KEYS.WRONG_QUESTIONS, []);
  var existing = null;
  for (var i = 0; i < wrongQuestions.length; i++) {
    if (wrongQuestions[i].qId === qId) {
      existing = wrongQuestions[i];
      break;
    }
  }

  if (existing) {
    existing.wrongCount = (existing.wrongCount || 1) + 1;
    existing.timestamp = Date.now();
  } else {
    wrongQuestions.push({
      qId: qId,
      module: module,
      questionText: questionText,
      timestamp: Date.now(),
      wrongCount: 1,
      fullQuestion: typeof fullQuestion === 'object' ? fullQuestion : null
    });
  }

  safeSetJSON(KEYS.WRONG_QUESTIONS, wrongQuestions);
  _syncWrongToSupabase(qId, module, questionText, existing ? existing.wrongCount : 1);
  return true;
}

function getWrongQuestions(options) {
  options = options || {};
  var module = options.module || null;
  var wrongQuestions = safeGetJSON(KEYS.WRONG_QUESTIONS, []);

  // 确保 wrongQuestions 是数组
  if (!Array.isArray(wrongQuestions)) {
    wrongQuestions = [];
  }

  wrongQuestions.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });

  if (module) {
    wrongQuestions = wrongQuestions.filter(function (item) { return item.module === module; });
  }

  return wrongQuestions;
}

function removeWrongQuestion(qId) {
  if (!qId) return false;
  qId = (window.resolveQuestionBioId || resolveQuestionBioId)(qId);

  var wrongQuestions = safeGetJSON(KEYS.WRONG_QUESTIONS, []);
  var index = -1;
  for (var i = 0; i < wrongQuestions.length; i++) {
    if (wrongQuestions[i].qId === qId) {
      index = i;
      break;
    }
  }
  if (index === -1) return false;

  wrongQuestions.splice(index, 1);
  safeSetJSON(KEYS.WRONG_QUESTIONS, wrongQuestions);

  if (window.isLoggedIn && window.isLoggedIn()) {
    if (typeof window.deleteWrongQuestion === 'function') {
      window.deleteWrongQuestion(qId);
    } else {
      deleteWrongQuestion(qId);
    }
  }

  return true;
}

function _syncWrongToSupabase(qId, module, questionText, wrongCount) {
  if (typeof window.isLoggedIn !== 'function' || !window.isLoggedIn()) return;
  qId = (window.resolveQuestionBioId || resolveQuestionBioId)(qId);

  // 尝试获取完整题目对象（含选项、答案等）
  var wrongQuestions = safeGetJSON(KEYS.WRONG_QUESTIONS, []);
  var fullQuestion = null;
  for (var i = 0; i < wrongQuestions.length; i++) {
    if (wrongQuestions[i].qId === qId && wrongQuestions[i].fullQuestion) {
      fullQuestion = wrongQuestions[i].fullQuestion;
      break;
    }
  }

  var payload = {
    question_id: qId,
    module_num: parseInt(module) || 1,
    question_text: questionText || '',
    subject: '',
    wrong_count: wrongCount || 1
  };

  // 如果有完整题目，序列化存入 extra 字段
  if (fullQuestion) {
    try {
      payload.extra_data = JSON.stringify({
        options: fullQuestion.options || null,
        answer: fullQuestion.answer || null,
        explanation: fullQuestion.explanation || '',
        sub_questions: fullQuestion.subQuestions || null
      });
    } catch(e) {}
  }

  if (typeof window.saveWrongQuestion === 'function') {
    window.saveWrongQuestion(payload);
  } else {
    saveWrongQuestion(payload);
  }
}

/* ============================================================
 * 学习统计
 * ============================================================ */

function updateStats(module, correct) {
  if (!module) return false;

  var stats = safeGetJSON(KEYS.STATS, {});

  if (!stats[module]) {
    stats[module] = {
      totalAnswered: 0,
      totalCorrect: 0,
      accuracy: 0
    };
  }

  stats[module].totalAnswered += 1;
  if (correct) {
    stats[module].totalCorrect += 1;
  }

  stats[module].accuracy = stats[module].totalAnswered > 0
    ? Math.round((stats[module].totalCorrect / stats[module].totalAnswered) * 100)
    : 0;

  return safeSetJSON(KEYS.STATS, stats);
}

function getStats(module) {
  var stats = safeGetJSON(KEYS.STATS, {});

  if (module) {
    return stats[module] || {
      totalAnswered: 0,
      totalCorrect: 0,
      accuracy: 0
    };
  }

  var overall = {
    totalAnswered: 0,
    totalCorrect: 0,
    modules: {}
  };
  for (var key in stats) {
    if (stats.hasOwnProperty(key)) {
      overall.modules[key] = stats[key];
    }
  }

  for (var mod in stats) {
    if (stats.hasOwnProperty(mod)) {
      overall.totalAnswered += stats[mod].totalAnswered || 0;
      overall.totalCorrect += stats[mod].totalCorrect || 0;
    }
  }

  overall.accuracy = overall.totalAnswered > 0
    ? Math.round((overall.totalCorrect / overall.totalAnswered) * 100)
    : 0;

  return overall;
}

/* ============================================================
 * 数据导出 / 导入（支持 AES-GCM 加密）
 * ============================================================ */

/**
 * AES-GCM 加密备份数据
 * @param {string} jsonString - 要加密的 JSON 字符串
 * @returns {Promise<Object>} 加密后的备份对象
 */
async function encryptBackup(jsonString) {
  var enc = new TextEncoder();
  var keyMaterial = await crypto.subtle.digest('SHA-256', enc.encode('bioquest_backup_key'));
  var key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['encrypt']);
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(jsonString));

  // 手动转 Base64，避免 String.fromCharCode.apply 对大数组栈溢出
  var ivBase64 = uint8ToBase64(iv);
  var dataBase64 = uint8ToBase64(new Uint8Array(encrypted));

  return {
    encrypted: true,
    iv: ivBase64,
    data: dataBase64,
    version: '2.0.0'
  };
}

/**
 * AES-GCM 解密备份数据
 * @param {Object} backupObj - 加密的备份对象 { encrypted, iv, data, version }
 * @returns {Promise<string>} 解密后的 JSON 字符串
 */
async function decryptBackup(backupObj) {
  var enc = new TextEncoder();
  var dec = new TextDecoder();
  var keyMaterial = await crypto.subtle.digest('SHA-256', enc.encode('bioquest_backup_key'));
  var key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['decrypt']);
  var iv = base64ToUint8(backupObj.iv);
  var data = base64ToUint8(backupObj.data);
  var decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
  return dec.decode(decrypted);
}

/**
 * Uint8Array 转 Base64（循环方式，避免 apply 栈溢出）
 */
function uint8ToBase64(uint8Arr) {
  var binary = '';
  for (var i = 0; i < uint8Arr.length; i++) {
    binary += String.fromCharCode(uint8Arr[i]);
  }
  return btoa(binary);
}

/**
 * Base64 转 Uint8Array
 */
function base64ToUint8(base64) {
  var binary = atob(base64);
  var uint8 = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    uint8[i] = binary.charCodeAt(i);
  }
  return uint8;
}

/**
 * 导出数据
 * @param {Object} options - 导出选项 { encrypted: boolean }，默认 encrypted=true
 * @returns {Promise<Object|null>} 导出的数据对象
 */
async function exportData(options) {
  options = options || {};
  var useEncryption = options.encrypted !== false;

  try {
    var records = safeGetJSON(KEYS.RECORDS, []);
    var stats = getStats();

    var data = {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      deviceId: getDeviceId(),
      appVersion: '2.0.0',
      exportType: 'bioquest_full_backup',
      practiceCount: records.length,
      totalAnswered: stats.totalAnswered || 0,
      totalCorrect: stats.totalCorrect || 0,
      accuracy: stats.accuracy || 0,
      settings: safeGetJSON(KEYS.SETTINGS, {}),
      records: records,
      favorites: safeGetJSON(KEYS.FAVORITES, []),
      wrongQuestions: safeGetJSON(KEYS.WRONG_QUESTIONS, []),
      stats: safeGetJSON(KEYS.STATS, {}),
      habits: safeGetJSON('bioquest_habits', []),
      habitLogs: safeGetJSON('bioquest_habit_logs', []),
      badges: safeGetJSON('bioquest_badges', []),
      progress: getAllLocalProgress()
    };

    // 如果 calcBioScore 函数存在，计算并包含 Bio Score
    if (typeof calcBioScore === 'function') {
      try {
        var bioScoreResult = calcBioScore(stats);
        data.bioScore = bioScoreResult;
      } catch (e) {
        console.warn('[BioQuest Storage] 计算 Bio Score 失败:', e.message);
      }
    }

    var json = JSON.stringify(data, null, 2);
    var blob, fileExt, mimeType;

    if (useEncryption) {
      var encryptedObj = await encryptBackup(json);
      var encryptedJson = JSON.stringify(encryptedObj, null, 2);
      blob = new Blob([encryptedJson], { type: 'application/octet-stream' });
      fileExt = '.bqb';
    } else {
      blob = new Blob([json], { type: 'application/json' });
      fileExt = '.json';
    }

    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'bioquest-backup-' + new Date().toISOString().split('T')[0] + fileExt;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return data;
  } catch (e) {
    console.error('[BioQuest Storage] 数据导出失败:', e.message);
    return null;
  }
}

/**
 * 导入数据（支持加密和明文格式）
 * @param {string} jsonString - 导入的 JSON 字符串
 * @returns {Promise<boolean>} 是否导入成功
 */
async function importData(jsonString) {
  try {
    var raw = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;

    if (!raw || typeof raw !== 'object') {
      throw new Error('无效的数据格式');
    }

    var data;

    // 检测是否为加密数据
    if (raw.encrypted === true && raw.iv && raw.data) {
      try {
        var decryptedStr = await decryptBackup(raw);
        data = JSON.parse(decryptedStr);
      } catch (e) {
        throw new Error('解密失败，文件可能已损坏或密钥不匹配');
      }
    } else {
      data = raw;
    }

    // 版本兼容性检查
    var dataVersion = data.version || '1.0.0';
    var currentVersion = '2.0.0';

    if (!data || typeof data !== 'object') {
      throw new Error('无效的数据格式');
    }

    if (data.settings) safeSetJSON(KEYS.SETTINGS, data.settings);

    if (data.records) {
      var existingRecords = safeGetJSON(KEYS.RECORDS, []);
      var existingIds = {};
      for (var i = 0; i < existingRecords.length; i++) {
        existingIds[existingRecords[i].id] = true;
      }
      var newRecords = [];
      for (var j = 0; j < data.records.length; j++) {
        if (!existingIds[data.records[j].id]) {
          newRecords.push(data.records[j]);
        }
      }
      safeSetJSON(KEYS.RECORDS, existingRecords.concat(newRecords));
    }

    if (data.favorites) {
      var existingFavs = safeGetJSON(KEYS.FAVORITES, []);
      var merged = [];
      var seen = {};
      for (var k = 0; k < existingFavs.length; k++) {
        seen[existingFavs[k]] = true;
        merged.push(existingFavs[k]);
      }
      for (var m = 0; m < data.favorites.length; m++) {
        if (!seen[data.favorites[m]]) {
          merged.push(data.favorites[m]);
          seen[data.favorites[m]] = true;
        }
      }
      safeSetJSON(KEYS.FAVORITES, merged);
    }

    if (data.wrongQuestions) {
      var existingWrong = safeGetJSON(KEYS.WRONG_QUESTIONS, []);
      var existingWrongIds = {};
      for (var n = 0; n < existingWrong.length; n++) {
        existingWrongIds[existingWrong[n].qId] = true;
      }
      var newWrong = [];
      for (var p = 0; p < data.wrongQuestions.length; p++) {
        if (!existingWrongIds[data.wrongQuestions[p].qId]) {
          newWrong.push(data.wrongQuestions[p]);
        }
      }
      safeSetJSON(KEYS.WRONG_QUESTIONS, existingWrong.concat(newWrong));
    }

    if (data.stats) {
      var existingStats = safeGetJSON(KEYS.STATS, {});
      var mergedStats = {};
      for (var key in existingStats) {
        if (existingStats.hasOwnProperty(key)) mergedStats[key] = existingStats[key];
      }
      for (var mod in data.stats) {
        if (data.stats.hasOwnProperty(mod)) {
          if (mergedStats[mod]) {
            mergedStats[mod].totalAnswered += data.stats[mod].totalAnswered || 0;
            mergedStats[mod].totalCorrect += data.stats[mod].totalCorrect || 0;
            mergedStats[mod].accuracy = mergedStats[mod].totalAnswered > 0
              ? Math.round((mergedStats[mod].totalCorrect / mergedStats[mod].totalAnswered) * 100)
              : 0;
          } else {
            mergedStats[mod] = { totalAnswered: data.stats[mod].totalAnswered || 0, totalCorrect: data.stats[mod].totalCorrect || 0, accuracy: data.stats[mod].accuracy || 0 };
          }
        }
      }
      safeSetJSON(KEYS.STATS, mergedStats);
    }

    // Issue #13：恢复进度快照（LWW：仅当导入项较新时覆盖）
    if (data && data.progress && typeof data.progress === 'object') {
      for (var pk in data.progress) {
        if (!data.progress.hasOwnProperty(pk)) continue;
        var pmeta = data.progress[pk];
        if (!pmeta || pmeta.data === undefined) continue;
        var existingProgress = loadProgress(pk);
        if (!existingProgress || (pmeta.updatedAt || 0) >= (existingProgress.updatedAt || 0)) {
          _saveProgressLocalOnly(pk, pmeta.data, pmeta.updatedAt || 0);
        }
      }
    }

    return true;
  } catch (e) {
    console.error('[BioQuest Storage] 数据导入失败:', e.message);
    return false;
  }
}

function getStorageUsage() {
  try {
    var used = 0;
    for (var key in KEYS) {
      if (KEYS.hasOwnProperty(key)) {
        var value = localStorage.getItem(KEYS[key]);
        if (value) {
          used += KEYS[key].length + value.length;
        }
      }
    }
    var available = 5 * 1024 * 1024;
    return { used: used, available: available };
  } catch (e) {
    return { used: 0, available: 0 };
  }
}

/* ============================================================
 * Issue #13：用户进度快照（localStorage 键值 + LWW 云端同步）
 * 进度键前缀：bioquest_progress_<key>，值格式 { updatedAt, deviceId, data }
 * 配套表：user_progress（sql/migration_v8_user_progress.sql）
 * 同步：pushUserProgressToSupabase / pullUserProgressFromSupabase（supabase-client.js）
 * ============================================================ */
var PROGRESS_PREFIX = 'bioquest_progress_';
var _progressSyncTimers = {};
var _progressSyncInflight = null;

/**
 * 保存一条进度快照到本地，并触发防抖云端同步。
 * 供各模块（如 fsrs-algorithm）在数据变更时调用，非阻塞。
 * @param {string} key - 进度键（如 'fsrs_cards'、'stats'）
 * @param {*} data - 快照数据（JSON 可序列化）
 * @returns {{updatedAt:number, deviceId:string, data:*} | null}
 */
function saveProgress(key, data) {
  if (!key) return null;
  var meta = { updatedAt: Date.now(), deviceId: getDeviceId(), data: data };
  safeSetJSON(PROGRESS_PREFIX + key, meta);
  scheduleProgressSync(key);
  return meta;
}

/**
 * 读取进度快照。
 */
function loadProgress(key) {
  if (!key) return null;
  return safeGetJSON(PROGRESS_PREFIX + key, null);
}

/**
 * 收集本地全部进度快照：{ key: { updatedAt, deviceId, data } }
 * 用于备份导出 / 云端上传。
 */
function getAllLocalProgress() {
  var result = {};
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PROGRESS_PREFIX) === 0) {
        var meta = safeGetJSON(k, null);
        if (meta && meta.data !== undefined) result[k.slice(PROGRESS_PREFIX.length)] = meta;
      }
    }
  } catch (e) {}
  return result;
}

/**
 * 仅写本地（不触发再次同步），用于接收云端拉取结果，避免同步回环。
 */
function _saveProgressLocalOnly(key, data, updatedAt) {
  if (!key) return;
  safeSetJSON(PROGRESS_PREFIX + key, {
    updatedAt: typeof updatedAt === 'number' && updatedAt > 0 ? updatedAt : Date.now(),
    deviceId: getDeviceId() || 'local',
    data: data
  });
}

/**
 * 防抖安排一次云端同步（默认 3s），把高频写入（如连续复习）聚合成一次上传。
 * 避免每次评分都触发整份快照上传，同时保证会话结束后不久即完成持久化。
 */
function scheduleProgressSync(key) {
  if (typeof setTimeout !== 'function') return;
  if (_progressSyncTimers[key]) clearTimeout(_progressSyncTimers[key]);
  _progressSyncTimers[key] = setTimeout(function () {
    delete _progressSyncTimers[key];
    syncLocalProgressToCloud([key]).catch(function () {});
  }, 3000);
}

/**
 * 将本地进度同步到云端（LWW），并拉取远端较新快照覆盖本地。
 * @param {string[]|undefined} [keys] - 指定只同步这些键；缺省同步所有本地键
 * @returns {Promise<{ok:boolean, push?:Object, merge?:Array, error?:string}>}
 */
function syncLocalProgressToCloud(keys) {
  if (typeof window.isLoggedIn !== 'function' || !window.isLoggedIn()) {
    return Promise.resolve({ ok: false, error: '未登录' });
  }
  if (typeof window.pushUserProgressToSupabase !== 'function' ||
      typeof window.pullUserProgressFromSupabase !== 'function') {
    return Promise.resolve({ ok: false, error: '同步 API 未就绪' });
  }
  if (_progressSyncInflight) return _progressSyncInflight;

  var local = getAllLocalProgress();
  var wanted = (Array.isArray(keys) && keys.length) ? keys : Object.keys(local);

  _progressSyncInflight = (async function () {
    try {
      // 1) 推送本地较新快照到云端
      var pushResults = {};
      for (var i = 0; i < wanted.length; i++) {
        var key = wanted[i];
        var meta = local[key];
        if (!meta) continue;
        var r = await window.pushUserProgressToSupabase(key, meta.data, meta.updatedAt);
        pushResults[key] = r;
      }

      // 2) 拉取远端快照，LWW 合并到本地
      var merge = [];
      var remote = await window.pullUserProgressFromSupabase();
      if (remote && remote.length) {
        for (var j = 0; j < remote.length; j++) {
          var row = remote[j];
          var localMeta = local[row.key];
          if (!localMeta || row.updated_at > (localMeta.updatedAt || 0)) {
            // 本地缺失或云端较新 → 采用云端
            _saveProgressLocalOnly(row.key, row.data, row.updated_at);
            merge.push({ key: row.key, direction: 'pull' });
          } else {
            merge.push({ key: row.key, direction: 'local' });
          }
        }
      }
      return { ok: true, push: pushResults, merge: merge };
    } catch (e) {
      return { ok: false, error: e && e.message };
    } finally {
      _progressSyncInflight = null;
    }
  })();
  return _progressSyncInflight;
}

// 供 fsrs-algorithm / 登录流调用
window.saveProgress = saveProgress;
window.loadProgress = loadProgress;
window.syncLocalProgressToCloud = syncLocalProgressToCloud;