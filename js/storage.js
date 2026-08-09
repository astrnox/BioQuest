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
  try {
    var raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
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
    return true;
  } catch (e) {
    console.warn('[BioQuest Storage] 写入 ' + key + ' 失败:', e.message);
    return false;
  }
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
  var favorites = safeGetJSON(KEYS.FAVORITES, []);
  return favorites.includes(qId);
}

function _syncFavoriteToSupabase(qId, isFav) {
  if (typeof window.isLoggedIn !== 'function' || !window.isLoggedIn()) return;
  var numId = parseInt(qId);
  if (isNaN(numId)) {
    numId = hashQuestionId(String(qId));
  }
  if (isFav) {
    if (typeof window.saveFavorite === 'function') {
      window.saveFavorite(numId, 1, '', '');
    } else {
      saveFavorite(numId, 1, '', '');
    }
  } else {
    if (typeof window.deleteFavorite === 'function') {
      window.deleteFavorite(numId);
    } else {
      deleteFavorite(numId);
    }
  }
}

/* ============================================================
 * 错题管理
 * ============================================================ */

function addWrongQuestion(qId, module, questionText, fullQuestion) {
  if (!qId) return false;
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
    var numId = parseInt(qId);
    if (isNaN(numId)) {
      numId = hashQuestionId(String(qId));
    }
    if (typeof window.deleteWrongQuestion === 'function') {
      window.deleteWrongQuestion(numId);
    } else {
      deleteWrongQuestion(numId);
    }
  }

  return true;
}

function _syncWrongToSupabase(qId, module, questionText, wrongCount) {
  if (typeof window.isLoggedIn !== 'function' || !window.isLoggedIn()) return;
  var numId = parseInt(qId);
  if (isNaN(numId)) {
    numId = hashQuestionId(String(qId));
  }

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
    question_id: numId,
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
      badges: safeGetJSON('bioquest_badges', [])
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