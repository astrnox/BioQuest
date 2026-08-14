/**
 * ============================================================
 * BioQuest — Supabase 客户端（前端直连版）
 * 用于静态托管（如彩虹云 FTP）无需 Python 后端
 * ============================================================
 */

// Supabase 配置
var SUPABASE_URL = 'https://pgkjpuowpxngmxjjlfil.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBna2pwdW93cHhuZ214ampsZmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODM2MzIsImV4cCI6MjA5NjI1OTYzMn0.lgfxN9htgo1i4tX_KwEehW47uqOwj3Jfwy-ljsjQnx4';

// 初始化 Supabase 客户端
var _supabase = null;
var _currentUser = null;

/**
 * 获取本地时区日期字符串 YYYY-MM-DD
 * 统一替代 toISOString().split('T')[0]（UTC），避免跨日边界问题
 */
function _localDateStr(date) {
  date = date || new Date();
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

// ===== 用户积分（Points）系统配置 =====
// 积分：不衰减、可累积、可扣除、可消耗（兑换）。等级/称号由累计总积分阈值推导。

var POINTS_DEFAULT = 0;

// 1. 积极行为获得积分规则
var POINTS_EARN_RULES = {
  daily_checkin: { base: 2, reason: '每日打卡' },
  online_time: { base: 1, reason: '在线时长奖励' },
  practice_milestone: { base: 1, reason: '刷题奖励（每10题）' },
  suggestion_feedback: { base: 10, reason: '提交建议反馈' },
  valid_report: { base: 5, reason: '有效举报/反馈' }
};

// 2. 高影响操作消费积分规则（需同时满足门槛）
// 已消耗积分 = 总积分 - cost
var POINTS_ACTION_COSTS = {
  comment: { threshold: 10, cost: 1, reason: '发表评论' },
  post: { threshold: 30, cost: 2, reason: '发布帖子' },
  report_question: { threshold: 50, cost: 5, reason: '举报题目' },
  special_permission: { threshold: 80, cost: 20, reason: '申请特殊权限' }
};

// 3. 违规惩罚规则
var POINTS_PENALTIES = {
  question_feedback_invalid: { amount: -5, reason: '无效题目反馈/举报' },
  uncivil_post: { amount: -10, reason: '发布不文明内容' },
  uncivil_comment: { amount: -10, reason: '评论不文明内容' },
  spam: { amount: -15, reason: '刷屏/垃圾内容' }
};

// 4. 等级/称号阈值（与本地 POINTS_LEVELS 保持一致）
var POINTS_LEVELS = [
  { min: 0,     label: '新芽', title: '生物新芽', color: '#8a8a8a', icon: '🌱' },
  { min: 100,   label: '幼苗', title: '探索幼苗', color: '#5a7d5c', icon: '🌿' },
  { min: 300,   label: '青苗', title: '求知青苗', color: '#4a9c6a', icon: '🌳' },
  { min: 800,   label: '茁壮', title: '茁壮学者', color: '#3a8c5c', icon: '🔬' },
  { min: 2000,  label: '园丁', title: '知识园丁', color: '#2d6a47', icon: '🧑‍🌾' },
  { min: 5000,  label: '学者', title: '生物学者', color: '#c4956a', icon: '🎓' },
  { min: 10000, label: '大师', title: '生物大师', color: '#8a5ac4', icon: '🏆' },
  { min: 20000, label: '宗师', title: '生物宗师', color: '#c0553a', icon: '👑' },
  { min: 50000, label: '传奇', title: '传奇权威', color: '#ff6b35', icon: '🌟' }
];

var _UNCIVIL_WORDS = ['傻逼','脑残','nmsl','你妈','草泥马','滚','去死','废物','垃圾','贱','sb','cnm','tmd','mdzz','智障','混蛋','狗屎','屎','烂','白痴','蠢货','婊子','娘炮','死全家','杀了你','操','肏','日你妈','麻痹','特么','马勒戈壁','法克','fuck','shit','bitch'];

// ===== 超时 / 间隔 / 阈值常量 =====
var AUTH_UPDATE_DEBOUNCE_MS = 200;             // 认证状态变更防抖时间
var USER_KEY_READ_DELAY_MS = 600;              // 等待触发器生成 user_key 的延迟
var SESSION_RESTORE_CACHE_TTL_MS = 5000;       // restoreSession 结果缓存时长
var GET_SESSION_TIMEOUT_MS = 5000;             // getSession 超时
var PROFILE_FETCH_TIMEOUT_MS = 5000;           // profile 查询超时
var EMAIL_VERIFICATION_TIMEOUT_MS = 3000;     // 邮箱验证状态查询超时
var ADMIN_TOKEN_TTL = 5 * 60 * 1000;           // 前端管理员 token 有效期（5 分钟）
var BEHAVIOR_COUNT_TIMEOUT_MS = 5000;          // 行为计数查询超时
var ONLINE_TIME_DAILY_CAP = 12;                // 在线时长每日奖励上限次数
var ONLINE_TIME_INACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 在线判定空闲阈值（5 分钟）
var ONLINE_TIME_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 在线时长心跳间隔（5 分钟）
var ACHIEVE_NOTIF_DISPLAY_MS = 4000;           // 成就通知展示时长
var ACHIEVE_NOTIF_FADE_MS = 500;               // 成就通知淡出动画时长

/**
 * 获取 Supabase 客户端实例
 */
function getSupabase() {
  if (!_supabase && typeof window.supabase !== 'undefined') {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    // 监听认证状态变化（邮箱确认回调等）
    _setupAuthListener();
  }
  return _supabase;
}

/**
 * 使用 fetch() 直接调用 Supabase REST API，避免 Supabase JS 客户端内部取消请求导致 net::ERR_ABORTED
 */
async function sbFetchRest(method, table, queryParams, body) {
  var sb = getSupabase();
  var token = null;
  if (sb) {
    try {
      var { data } = await sb.auth.getSession();
      token = (data && data.session && data.session.access_token) || null;
    } catch (e) {}
  }
  var url = SUPABASE_URL + '/rest/v1/' + table + (queryParams ? '?' + queryParams : '');
  var headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + (token || SUPABASE_ANON_KEY),
    'Content-Type': 'application/json'
  };
  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }
  var fetchOpts = { method: method, headers: headers };
  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    fetchOpts.body = JSON.stringify(body);
  }
  try {
    var resp = await fetch(url, fetchOpts);
    var json = null;
    try {
      json = await resp.json();
    } catch (e) {}
    if (!resp.ok) {
      console.error('[sbFetchRest] 请求失败:', method, table, resp.status, json);
      return { ok: false, data: json, status: resp.status };
    }
    return { ok: true, data: json, status: resp.status };
  } catch (fetchErr) {
    console.error('[sbFetchRest] 网络错误:', fetchErr.message);
    return { ok: false, data: null, status: 0 };
  }
}

/**
 * 设置认证状态监听器
 * 当用户通过邮件链接确认邮箱后，Supabase 会触发 SIGNED_IN 事件
 * 添加防抖机制，避免与 restoreSession 重复更新 DOM
 */
var _authUpdateDebounce = null;

function _setupAuthListener() {
  if (!_supabase || _supabase._authListenerSetup) return;
  _supabase._authListenerSetup = true;

  try {
    _supabase.auth.onAuthStateChange(function(event, session) {
      // 修复：监听 INITIAL_SESSION 事件，确保刷新时能恢复用户状态
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session && session.user) {
        var authUser = session.user;
        var isRealEmail = authUser.email && !authUser.email.endsWith('@bioquest.local');
        var isVerified = isRealEmail && authUser.email_confirmed_at;

        // 修复：INITIAL_SESSION 总是恢复，SIGNED_IN 仅在未验证时跳过
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || isVerified) {
          if (_authUpdateDebounce) clearTimeout(_authUpdateDebounce);
          _authUpdateDebounce = setTimeout(function() {
            // 如果当前用户已是同一用户，跳过
            if (_currentUser && _currentUser.id === authUser.id && (event === 'INITIAL_SESSION' || _currentUser.email_verified)) {
              // 但如果是 INITIAL_SESSION，仍要确保 email_verified 状态正确
              if (event === 'INITIAL_SESSION' && isVerified && !_currentUser.email_verified) {
                _currentUser.email_verified = true;
                if (typeof window.updateAuthUI === 'function') window.updateAuthUI();
              }
              return;
            }

            _supabase.from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle()
              .then(function(result) {
                var profile = result && result.data;
                _currentUser = {
                  id: authUser.id,
                  username: (profile && profile.username) || authUser.email.split('@')[0],
                  display_name: (profile && profile.display_name) || authUser.email.split('@')[0],
                  email: authUser.email,
                  bio_score: (profile && profile.bio_score) || 0,
                  points: (profile && profile.points) || POINTS_DEFAULT,
                  user_group: (profile && profile.user_group) || 'member',
                  email_verified: !!isVerified
                };
                // 触发 UI 更新
                if (typeof window.updateAuthUI === 'function') window.updateAuthUI();
                // 触发 admin 自动认证
                if (typeof window._onAuthUserLoaded === 'function') {
                  window._onAuthUserLoaded(_currentUser);
                }
                // 保存 user_key
                if (typeof window.saveUserKeyIfNeeded === 'function') {
                  window.saveUserKeyIfNeeded();
                }
              })
              .catch(function(e) {
                console.warn('[BioQuest] onAuthStateChange 获取 profile 失败:', e);
              });
          }, AUTH_UPDATE_DEBOUNCE_MS); // 缩短到 200ms
        }
      } else if (event === 'SIGNED_OUT') {
        // 登出事件
        _currentUser = null;
        // 清除管理员认证状态
        if (typeof window._onAuthUserLoaded === 'function') {
          window._onAuthUserLoaded(null);
        }
        try {
          sessionStorage.removeItem('bioquest_admin_auth');
          sessionStorage.removeItem('bioquest_admin_attempts');
          sessionStorage.removeItem('bioquest_admin_lock');
        } catch(e) {}
        if (typeof window.updateAuthUI === 'function') window.updateAuthUI();
      }
    });
  } catch (e) {
    // 静默失败
  }
}

/**
 * 获取当前用户
 */
function getCurrentUser() {
  return _currentUser;
}

/**
 * 检查是否已登录
 */
function isLoggedIn() {
  return _currentUser !== null;
}

/**
 * 重发验证邮件
 */
async function resendConfirmationEmail(email) {
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var { error } = await sb.auth.resend({
      type: 'signup',
      email: email
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 忘记密码 — 发送重置密码邮件（保留原邮件方式作为备选）
 */
async function resetPassword(email) {
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  if (!email || !email.includes('@')) {
    return { ok: false, error: '请输入有效的邮箱地址' };
  }
  try {
    var { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/index.html#/reset-password'
    });
    if (error) {
      var msg = error.message;
      if (msg.includes('rate limit')) msg = '请求过于频繁，请稍后再试';
      else if (msg.includes('not found')) msg = '该邮箱未注册';
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 找回密码（无需邮件）
 * 通过 username + 8 字符 user_key 验证身份后重置密码
 * 需要 Supabase 已部署 migration_v4_password_reset.sql 中的 RPC
 */
async function resetPasswordByKey(username, userKey, newPassword) {
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  if (!username || !userKey || !newPassword) {
    return { ok: false, error: '请填写完整信息' };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: '新密码至少 6 位' };
  }
  try {
    var result = await sb.rpc('reset_password_by_key', {
      p_username: username,
      p_user_key: userKey,
      p_new_password: newPassword
    });
    if (result.error) {
      return { ok: false, error: result.error.message || '重置失败' };
    }
    var data = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!data || !data.ok) {
      return { ok: false, error: (data && data.error_msg) || '用户名或 8 字符密钥不正确' };
    }
    return { ok: true, userId: data.user_id };
  } catch (e) {
    return { ok: false, error: e.message || '重置异常' };
  }
}

/**
 * 找回 user_key（用户名 + 邮箱后缀验证）
 * 用于忘记密钥但记得用户名和邮箱的场景
 */
async function recoverUserKey(username, emailHint) {
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  if (!username || !emailHint) {
    return { ok: false, error: '请填写用户名和邮箱后缀（如 @gmail.com）' };
  }
  try {
    var result = await sb.rpc('recover_user_key', {
      p_username: username,
      p_email_hint: emailHint
    });
    if (result.error) {
      return { ok: false, error: result.error.message || '查询失败' };
    }
    var data = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!data || !data.ok) {
      return { ok: false, error: (data && data.error_msg) || '用户名或邮箱不匹配' };
    }
    return { ok: true, userKey: data.user_key };
  } catch (e) {
    return { ok: false, error: e.message || '查询异常' };
  }
}

/**
 * 获取当前用户的 user_key（注册后首次展示用）
 * 一次性展示给用户后应让其截图保存
 */
async function getUserKeyForCurrentUser() {
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  var user = getCurrentUser();
  if (!user || !user.id) return { ok: false, error: '未登录' };
  try {
    var result = await sb.from('profiles')
      .select('user_key')
      .eq('id', user.id)
      .maybeSingle();
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true, userKey: (result.data && result.data.user_key) || null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 注册用户
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {string} displayName - 显示名称
 * @param {string} [email] - 可选真实邮箱，验证后升级为认证会员
 */
async function registerUser(username, password, displayName, email) {

  // 防止重复提交：同邮箱 30 秒内只允许一次注册请求
  var lockKey = 'bioquest_signup_lock:' + (email || '').toLowerCase();
  var lockUntil = 0;
  try { lockUntil = parseInt(localStorage.getItem(lockKey)) || 0; } catch (e) {}
  if (Date.now() < lockUntil) {
    var remain = Math.ceil((lockUntil - Date.now()) / 1000);
    return { ok: false, error: '注册请求过于频繁，请 ' + remain + ' 秒后再试' };
  }

  var sb = getSupabase();

  if (!sb) {
    var detail = '';
    if (typeof window.supabase === 'undefined') {
      detail = '（Supabase SDK 尚未加载完成，请稍后重试）';
    }
    return { ok: false, error: '系统未就绪，请刷新页面后重试' + detail };
  }

  // email 可选：如果用户没填，自动生成一个基于用户名的假邮箱
  // 这样可以避免 Supabase 邮件发送失败导致的 500 错误
  if (!email || !email.trim()) {
    var cleanUsername = (username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    if (!cleanUsername) cleanUsername = 'user';
    email = cleanUsername + '@bioquest.local';

  } else if (!email.includes('@')) {
    return { ok: false, error: '请输入有效的邮箱地址（或留空使用占位）' };
  }

  // 预防性检查：username 是否已被占用
  // clearLock 提前声明（避免 var hoisting 导致 TypeError）
  var clearLock = function () { try { localStorage.removeItem(lockKey); } catch (e) {} };
  try {
    var dupCheck = await sb.from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();
    if (dupCheck.data && dupCheck.data.id) {
      clearLock();
      return { ok: false, error: '该用户名已被使用，请换一个' };
    }
  } catch (e) {
    console.warn('[BioQuest] username 重复检查失败（非致命）:', e && e.message);
  }

  // 预防性检查：email 是否已被注册（仅当用户填了真实邮箱）
  if (email && !email.endsWith('@bioquest.local')) {
    try {
      var emailCheck = await sb.from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();
      if (emailCheck.data && emailCheck.data.id) {
        clearLock();
        return { ok: false, error: '该邮箱已被注册，请直接登录或换一个' };
      }
    } catch (e) {
      console.warn('[BioQuest] email 重复检查失败（非致命）:', e && e.message);
    }
  }

  // 上锁：30 秒
  try { localStorage.setItem(lockKey, String(Date.now() + 30000)); } catch (e) {}

  try {
    var deviceId = localStorage.getItem('bioquest_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('bioquest_device_id', deviceId);
    }

    // 策略 1：使用完整的 options.data
    var signUpResult = null;
    var strategy1Error = null;

    try {
      signUpResult = await sb.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username,
            display_name: displayName || username,
            device_id: deviceId
          },
          emailRedirectTo: window.location.origin + '/index.html'
        }
      });

    } catch (tryErr) {
      strategy1Error = tryErr;
      console.warn('[BioQuest] signUp (含data) 抛出异常，尝试简化请求:', tryErr && tryErr.message, tryErr);
      signUpResult = { data: null, error: tryErr };
    }

    // 策略 2：如果失败，尝试不带 options.data
    if (signUpResult && signUpResult.error) {
      console.warn('[BioQuest] signUp 策略 1 失败，错误消息:', signUpResult.error.message);
      try {
        signUpResult = await sb.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: window.location.origin + '/index.html'
          }
        });

      } catch (tryErr2) {
        console.error('[BioQuest] signUp 策略 2 也抛出异常:', tryErr2 && tryErr2.message, tryErr2);
        if (!signUpResult || !signUpResult.error) signUpResult = { data: null, error: tryErr2 };
      }
    }

    var data = signUpResult && signUpResult.data;
    var error = signUpResult && signUpResult.error;

    if (error) {
      var msg = error.message || '';
      if (typeof msg !== 'string') msg = String(msg);
      var errName = error.name || '';
      var errStatus = error.status || 0;
      // 处理空对象/空字符串错误（Supabase 内部异常时返回 {}）
      if (!msg || msg === '{}' || msg === '[]' || msg === '[object Object]') {
        msg = '服务器繁忙，请稍后重试';
        if (errName === 'AuthRetryableFetchError' || errStatus === 500) {
          msg = 'Supabase 服务暂时异常（500），可能是：邮件发送失败 / 触发器冲突 / 服务维护中。请稍后重试，或在 Supabase Dashboard 关闭「Confirm email」开关';
        }
        console.error('[BioQuest] 注册失败 - 错误对象为空:', JSON.stringify(error), '完整 error:', error);
      } else {
        console.error('[BioQuest] 注册失败 - Supabase 错误消息:', msg, '完整 error:', error);
      }
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('unique')) {
        msg = '该邮箱已被注册，请直接登录或换一个';
      } else if (msg.includes('User already registered')) {
        msg = '该邮箱已被注册，请直接登录';
      } else if (msg.includes('Email signups are disabled') || msg.includes('signups are disabled')) {
        msg = '⚠️ Supabase 关闭了邮箱注册功能。请去 Dashboard → Authentication → Providers → Email → 打开 "Enable Email provider" 开关';
      } else if (msg.includes('Signups not allowed') || msg.includes('signups_disabled')) {
        msg = '⚠️ Supabase 禁止新用户注册。请去 Dashboard → Authentication → Providers → Email → 打开注册开关';
      } else if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
        msg = '请先完成邮箱验证（auto_confirm 触发器未生效，请去 Supabase 检查 trigger）';
      } else if (msg.includes('Password') || msg.includes('password')) {
        msg = '密码不符合要求（至少 6 位）';
      } else if (msg.includes('rate limit') || msg.includes('rate_limit')) {
        msg = '请求过于频繁，请 1 分钟后再试';
      } else if (msg.includes('email') || msg.includes('Email')) {
        if (msg.includes('invalid') || msg.includes('Invalid')) { msg = '邮箱格式不正确，请检查（可留空使用占位）'; }
        else if (msg.includes('already')) { msg = '该邮箱已被注册'; }
        else { msg = '邮箱验证失败，请检查邮箱格式（可留空使用占位）'; }
      } else if (msg.includes('confirm') || msg.includes('Confirm')) {
        msg = '请先完成邮箱验证';
      } else if (msg.includes('network') || msg.includes('Network') || msg.includes('fetch') || errName === 'AuthRetryableFetchError') {
        msg = '网络异常：无法连接 Supabase 服务，请检查网络后重试';
      } else if (msg.includes('PKCE')) {
        msg = '系统配置错误（PKCE 流程异常），请刷新页面后重试';
      } else if (msg.includes('username')) {
        msg = '用户名不符合要求（仅允许字母、数字、下划线，3-20 位）';
      } else if (msg.includes('username taken') || msg.includes('Username taken')) {
        msg = '该用户名已被使用，请换一个';
      } else if (errStatus >= 500) {
        msg = 'Supabase 服务端错误（' + errStatus + '），请稍后重试';
      } else if (errStatus === 422) {
        msg = '请求参数不合法，请检查用户名/密码格式';
      } else {
        msg = '注册失败：' + (msg.length > 80 ? msg.substring(0, 80) + '...' : msg);
      }
      return { ok: false, error: msg };
    }

    if (data.user && !data.session) {
      // 邮箱验证注册：此时 user 已在 auth.users 中，但 profiles 可能还没
      // 尝试写入 profiles 以便后续登录时能查到 username/email
      try {
        var upsertData = { id: data.user.id, username: username, display_name: displayName || username, user_group: 'member', points: POINTS_DEFAULT };
        try { upsertData.email = email; } catch (e) {}
        try { upsertData.device_id = deviceId; } catch (e) {}
        await sb.from('profiles').upsert(upsertData, { onConflict: 'id' });

      } catch (e1) {
        try {
          await sb.from('profiles').upsert({
            id: data.user.id, username: username, display_name: displayName || username, user_group: 'member', points: POINTS_DEFAULT
          }, { onConflict: 'id' });
        } catch (e2) {
          console.warn('[BioQuest] profiles upsert 失败（邮箱验证前，非致命）:', e2 && e2.message);
        }
      }
      clearLock();
      // 等待触发器生成 user_key 后读取
      var uk1 = null;
      try {
        await new Promise(function(r){ setTimeout(r, USER_KEY_READ_DELAY_MS); });
        var ukRes = await sb.from('profiles').select('user_key').eq('id', data.user.id).maybeSingle();
        uk1 = ukRes && ukRes.data && ukRes.data.user_key;
      } catch (e3) { /* ignore */ }
      return {
        ok: true,
        user: {
          id: data.user.id,
          username: username,
          display_name: displayName || username,
          email: email,
          points: POINTS_DEFAULT,
          user_group: 'member',
          email_verified: false,
          user_key: uk1
        },
        needEmailConfirm: true,
        userKey: uk1,
        message: '注册成功！请查收邮箱验证邮件，验证后即可登录。'
      };
    }

    if (data.user) {
      var initialGroup = 'member';

      _currentUser = {
        id: data.user.id,
        username: username,
        display_name: displayName || username,
        email: email,
        points: POINTS_DEFAULT,
        user_group: initialGroup,
        email_verified: true
      };

      try {
        var upsertData = { id: data.user.id, username: username, display_name: displayName || username, user_group: initialGroup, points: POINTS_DEFAULT };
        try { upsertData.email = email; } catch (e) {}
        try { upsertData.device_id = deviceId; } catch (e) {}
        await sb.from('profiles').upsert(upsertData, { onConflict: 'id' });
      } catch (e1) {
        try {
          await sb.from('profiles').upsert({
            id: data.user.id, username: username, display_name: displayName || username, user_group: initialGroup, points: POINTS_DEFAULT
          }, { onConflict: 'id' });
        } catch (e2) {
          console.warn('[BioQuest] profiles upsert 失败（已尝试回退）:', e2 && e2.message);
        }
      }

      // 等待触发器生成 user_key 后读取
      var uk2 = null;
      try {
        await new Promise(function(r){ setTimeout(r, USER_KEY_READ_DELAY_MS); });
        var ukRes2 = await sb.from('profiles').select('user_key').eq('id', data.user.id).maybeSingle();
        uk2 = ukRes2 && ukRes2.data && ukRes2.data.user_key;
      } catch (e3) { /* ignore */ }
      _currentUser.user_key = uk2;

      clearLock();
      return { ok: true, user: _currentUser, userKey: uk2 };
    }

    console.error('[BioQuest] signUp 返回但 data.user 为空:', signUpResult);
    return { ok: false, error: '注册失败：服务端返回的用户信息为空，请稍后重试' };
  } catch (e) {
    console.error('[BioQuest] registerUser 顶层异常:', e && e.message, e);
    return { ok: false, error: '注册失败：' + (e.message || String(e)) };
  }
}

/**
 * 检查邮箱验证状态，自动升级用户组
 * 如果用户邮箱已验证且不是假邮箱，且当前是 member，则升级为 verified
 */
async function checkEmailVerification(user, authUser) {
  if (!user || !authUser) return user;

  var email = authUser.email || '';
  var confirmedAt = authUser.email_confirmed_at;
  var isRealEmail = email.includes('@') && !email.endsWith('@bioquest.local');
  var isVerified = isRealEmail && confirmedAt;

  // 更新 email_verified 标志
  user.email_verified = !!isVerified;
  user.email = email;

  if (isVerified && (user.user_group === 'member' || user.user_group === 'guest')) {
    // 自动升级为 verified
    user.user_group = 'verified';
    try {
      var sb = getSupabase();
      if (sb) {
        await sb.from('profiles').update({ user_group: 'verified' }).eq('id', user.id).in('user_group', ['member', 'guest']);
      }
    } catch (e) {
      // 静默失败，下次登录再试
    }
  }

  return user;
}

/**
 * 登录
 */
async function loginUser(usernameOrEmail, password) {
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };

  try {
    // 判断输入是邮箱还是用户名
    var email = usernameOrEmail;
    if (!usernameOrEmail.includes('@')) {
      // 用户名登录：先从 profiles 表查找对应的邮箱
      try {
        var profileLookup = await sb.from('profiles')
          .select('email')
          .eq('username', usernameOrEmail)
          .maybeSingle();
        if (profileLookup.data && profileLookup.data.email) {
          email = profileLookup.data.email;
        } else {
          return { ok: false, error: '用户名不存在' };
        }
      } catch (e) {
        return { ok: false, error: '登录失败，请稍后重试' };
      }
    }
    var { data, error } = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      // 友好化错误信息
      var msg = error.message;
      if (msg.includes('Invalid login credentials')) {
        msg = '用户名/邮箱或密码错误';
      } else if (msg.includes('Email not confirmed')) {
        msg = '邮箱尚未验证，请查收验证邮件后重试';
      } else if (msg.includes('rate limit')) {
        msg = '登录尝试过于频繁，请稍后再试';
      } else if (msg.includes('network')) {
        msg = '网络连接失败，请检查网络';
      }
      return { ok: false, error: msg };
    }

    // 获取 profile（忽略错误，可能不存在）
    var profile = null;
    try {
      var profileResult = await sb.from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
      profile = profileResult?.data;
    } catch (e) {
      // profile 可能不存在
    }

    _currentUser = {
      id: data.user.id,
      username: profile?.username || usernameOrEmail.split('@')[0],
      display_name: profile?.display_name || usernameOrEmail.split('@')[0],
      email: email,
      bio_score: profile?.bio_score || 0,
      points: profile?.points || POINTS_DEFAULT,
      user_group: profile?.user_group || 'member',
      email_verified: false
    };

    // 检查邮箱验证状态，自动升级用户组
    _currentUser = await checkEmailVerification(_currentUser, data.user);

    // 启动在线时长跟踪
    startOnlineTimeTracking();

    // 触发登录成就
    if (typeof checkAchievement === 'function') {
      checkAchievement('login', 1);
    }
    // 邮箱已验证则触发邮箱成就
    if (_currentUser.email_verified && typeof checkAchievement === 'function') {
      checkAchievement('email', 1);
    }

    return { ok: true, user: _currentUser };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 游客登录 — 无需邮箱，使用本地存储
 * 生成唯一设备ID和随机用户名，所有数据存储在 localStorage
 * @param {string} [password] - 可选密码，用于本地账号保护
 * @param {string} [username] - 可选用户名，用于恢复已有账号
 */
function guestLogin(password, username) {
  // 生成或获取设备ID
  var deviceId = localStorage.getItem('bioquest_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('bioquest_device_id', deviceId);
  }

  // 如果提供了用户名，尝试恢复已有账号
  var guestUsername = username;
  var guestDisplayName = username ? (username.replace('guest_', '游客')) : '';
  if (!guestUsername) {
    var randomSuffix = Math.random().toString(36).slice(2, 8);
    guestUsername = 'guest_' + randomSuffix;
    guestDisplayName = '游客' + randomSuffix;
  }

  var guestId = 'guest_' + deviceId;

  _currentUser = {
    id: guestId,
    username: guestUsername,
    display_name: guestDisplayName || guestUsername,
    email: guestUsername + '@bioquest.local',
    bio_score: 0,
    points: POINTS_DEFAULT,
    user_group: 'guest',
    email_verified: false,
    isGuest: true
  };

  // 存储密码哈希（绝不存明文）
  // 游客模式不依赖服务端，密码仅作"本地快速登录"用
  // 警告：localStorage 不安全，游客模式不要存真实数据
  if (password) {
    try {
      // SHA-256 + 设备ID 盐值（防止彩虹表 + 跨设备撞库）
      var salt = 'bioquest_guest_v1_' + (function () {
        try { return localStorage.getItem('bioquest_device_id') || 'unknown'; }
        catch (e) { return 'unknown'; }
      })();
      var hash = (function (str) {
        // 简单 FNV-1a 32-bit 哈希 + 自定义混淆（非加密安全，仅防明文泄漏）
        var h = 0x811c9dc5;
        for (var i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h = (h * 0x01000193) >>> 0;
        }
        return h.toString(16).padStart(8, '0');
      })(salt + ':' + password);
      localStorage.setItem('bioquest_guest_pwdhash', hash);
    } catch (e) {}
  }

  // 持久化游客会话到 localStorage
  try {
    localStorage.setItem('bioquest_guest_session', JSON.stringify({
      id: guestId,
      username: guestUsername,
      display_name: _currentUser.display_name,
      points: _currentUser.points,
      createdAt: Date.now()
    }));
  } catch (e) { /* 静默 */ }

  // 触发登录成就
  if (typeof checkAchievement === 'function') {
    checkAchievement('login', 1);
  }

  return { ok: true, user: _currentUser };
}

/**
 * 游客密码登录 — 使用用户名和密码验证本地账号
 */
function guestLoginWithPassword(username, password) {
  var savedPwd = localStorage.getItem('bioquest_guest_password');
  var sessionData = null;
  try {
    sessionData = JSON.parse(localStorage.getItem('bioquest_guest_session') || 'null');
  } catch (e) {}

  if (!savedPwd) {
    return { ok: false, error: '尚未设置本地账号密码，请先用游客模式登录后设置密码' };
  }

  if (password !== savedPwd) {
    return { ok: false, error: '密码错误' };
  }

  // 验证用户名
  if (username && sessionData && sessionData.username !== username) {
    return { ok: false, error: '用户名不存在' };
  }

  return guestLogin(password, sessionData ? sessionData.username : null);
}

/**
 * 恢复游客会话
 */
function restoreGuestSession() {
  try {
    var sessionData = localStorage.getItem('bioquest_guest_session');
    if (!sessionData) return false;
    var session = JSON.parse(sessionData);
    if (!session || !session.id) return false;

    _currentUser = {
      id: session.id,
      username: session.username || 'guest',
      display_name: session.display_name || '游客',
      email: (session.username || 'guest') + '@bioquest.local',
      bio_score: 0,
      points: session.points || POINTS_DEFAULT,
      user_group: 'guest',
      email_verified: false,
      isGuest: true
    };
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 退出登录
 */
async function logoutUser() {
  var sb = getSupabase();
  if (sb) {
    try {
      await sb.auth.signOut();
    } catch (e) {
      // signOut 可能因网络问题失败，本地状态仍需清除
      console.warn('登出网络请求失败，已清除本地状态');
    }
  }
  // 清除游客会话
  try { localStorage.removeItem('bioquest_guest_session'); } catch (e) {}
  _currentUser = null;
}

/**
 * 永久退出登录 — 清除认证态，保留用户数据（API Key / 头像 / 设置）
 */
function forceLogout() {
  // 先同步本地数据到云端
  if (typeof window.syncToCloud === 'function') {
    try {
      window.syncToCloud().catch(function() {});
    } catch(e) {}
  }

  var sb = getSupabase();
  if (sb) { sb.auth.signOut().catch(function() {}); }
  _currentUser = null;

  // 仅清除认证相关 key，保留用户数据（API Key / 头像 / 设置 / 错题 / 记录等）
  var authKeys = [
    'sb-',           // Supabase auth tokens（前缀匹配）
    'bioquest_guest_session',
    'bioquest_guest_password',
    'bioquest_guest_pwdhash',
    'bioquest_admin_auth'
  ];
  var keysToRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (!key) continue;
    // 仅匹配认证相关 key
    for (var k = 0; k < authKeys.length; k++) {
      if (key.indexOf(authKeys[k]) === 0 || key === authKeys[k]) {
        keysToRemove.push(key);
        break;
      }
    }
  }
  for (var j = 0; j < keysToRemove.length; j++) {
    localStorage.removeItem(keysToRemove[j]);
  }
  // 清除 sessionStorage 中的管理员认证和频率限制状态
  try {
    sessionStorage.removeItem('bioquest_admin_auth');
    sessionStorage.removeItem('bioquest_admin_attempts');
    sessionStorage.removeItem('bioquest_admin_lock');
  } catch(e) {}

  if (typeof showToast === 'function') showToast('已退出登录');
  if (typeof navigateTo === 'function') navigateTo('/');
}

/**
 * 注销账号 — 删除账户及数据
 */
async function deleteAccount() {
  var sb = getSupabase();
  if (!sb) { showToast('无法连接到服务器'); return; }
  var userId = _currentUser && _currentUser.id;
  if (!userId) { showToast('未获取到用户信息'); return; }
  try {
    await sb.from('profiles').delete().eq('id', userId);
    await sb.from('wrong_questions').delete().eq('profile_id', userId);
    await sb.from('favorites').delete().eq('profile_id', userId);
    await sb.from('practice_records').delete().eq('profile_id', userId);
  } catch(e) { console.warn('清理用户数据失败:', e); }
  showToast('账户数据已清除');
  forceLogout();
}

window.forceLogout = forceLogout;
window.deleteAccount = deleteAccount;

/**
 * 上传头像到 Supabase Storage 的 avatars bucket
 * @param {File} file - 图片文件
 * @returns {Promise<{url: string|null, error: string|null}>}
 */
async function uploadAvatar(file) {
  var sb = getSupabase();
  if (!sb || !_currentUser) return { url: null, error: '未登录' };
  try {
    var userId = _currentUser.id;
    var ext = 'jpg';
    if (file.type === 'image/png') ext = 'png';
    else if (file.type === 'image/webp') ext = 'webp';
    var path = userId + '.' + ext;

    var { error: upErr } = await sb.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) return { url: null, error: upErr.message };

    var pub = sb.storage.from('avatars').getPublicUrl(path);
    var url = (pub && pub.data && pub.data.publicUrl) ? pub.data.publicUrl : null;

    if (url) {
      try {
        await sb.from('profiles').update({ avatar_url: url }).eq('id', userId);
      } catch (e) { /* 静默 */ }
      _currentUser.avatar_url = url;
    }
    return { url: url, error: null };
  } catch (e) {
    return { url: null, error: e.message };
  }
}
window.uploadAvatar = uploadAvatar;

/**
 * 上传题目图片到 Supabase Storage 的 question-images bucket
 * 支持 File 对象、Blob、data URL、或远程 URL（自动下载）
 * @param {File|Blob|string} imageInput - 图片源：File/Blob/data URL/http URL
 * @param {string} [questionId] - 题目ID，用于生成文件名（可选）
 * @returns {Promise<{url: string|null, error: string|null, path: string|null}>}
 */
async function uploadQuestionImage(imageInput, questionId) {
  var sb = getSupabase();
  if (!sb) return { url: null, path: null, error: 'Supabase 未初始化' };

  try {
    var blob, fileExt = 'png', contentType = 'image/png';

    if (imageInput instanceof File) {
      blob = imageInput;
      if (imageInput.type === 'image/jpeg' || imageInput.type === 'image/jpg') { fileExt = 'jpg'; contentType = 'image/jpeg'; }
      else if (imageInput.type === 'image/webp') { fileExt = 'webp'; contentType = 'image/webp'; }
      else if (imageInput.type === 'image/gif') { fileExt = 'gif'; contentType = 'image/gif'; }
    } else if (imageInput instanceof Blob) {
      blob = imageInput;
      contentType = blob.type || 'image/png';
      if (contentType === 'image/jpeg') fileExt = 'jpg';
      else if (contentType === 'image/webp') fileExt = 'webp';
    } else if (typeof imageInput === 'string') {
      if (imageInput.startsWith('data:')) {
        var dataUrlMatch = imageInput.match(/^data:([^;]+);base64,(.+)$/);
        if (!dataUrlMatch) return { url: null, path: null, error: '无效的 data URL' };
        contentType = dataUrlMatch[1] || 'image/png';
        var b64Data = dataUrlMatch[2];
        var byteChars = atob(b64Data);
        var byteNums = new Array(byteChars.length);
        for (var i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
        var byteArr = new Uint8Array(byteNums);
        blob = new Blob([byteArr], { type: contentType });
        if (contentType === 'image/jpeg') fileExt = 'jpg';
        else if (contentType === 'image/webp') fileExt = 'webp';
        else if (contentType === 'image/gif') fileExt = 'gif';
      } else if (/^https?:\/\//.test(imageInput)) {
        var resp = await fetch(imageInput);
        if (!resp.ok) return { url: null, path: null, error: '下载远程图片失败: HTTP ' + resp.status };
        blob = await resp.blob();
        contentType = blob.type || 'image/png';
        if (contentType === 'image/jpeg') fileExt = 'jpg';
        else if (contentType === 'image/webp') fileExt = 'webp';
        else if (contentType === 'image/gif') fileExt = 'gif';
      } else {
        return { url: null, path: null, error: '不支持的图片输入格式' };
      }
    } else {
      return { url: null, path: null, error: '无效的图片输入' };
    }

    var qid = questionId || ('q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    var path = qid + '_' + Date.now().toString(36) + '.' + fileExt;

    var { error: upErr } = await sb.storage
      .from('question-images')
      .upload(path, blob, { upsert: true, contentType: contentType });
    if (upErr) return { url: null, path: null, error: upErr.message };

    var pub = sb.storage.from('question-images').getPublicUrl(path);
    var url = (pub && pub.data && pub.data.publicUrl) ? pub.data.publicUrl : null;

    return { url: url, path: path, error: null };
  } catch (e) {
    return { url: null, path: null, error: e.message };
  }
}
window.uploadQuestionImage = uploadQuestionImage;

/**
 * 恢复会话（页面刷新时）
 * 添加超时保护，防止网络慢时阻塞页面
 */
var _restoreSessionPromise = null;
var _restoreSessionCalled = false;

async function restoreSession() {
  // 防止重复调用 — 如果已经在进行中，复用同一个 Promise
  if (_restoreSessionPromise) return _restoreSessionPromise;
  if (_restoreSessionCalled) return _currentUser !== null;
  _restoreSessionCalled = true;

  _restoreSessionPromise = _doRestoreSession();
  try {
    return await _restoreSessionPromise;
  } finally {
    // 保留结果一段时间，避免短时间内重复调用
    setTimeout(function() {
      _restoreSessionPromise = null;
    }, SESSION_RESTORE_CACHE_TTL_MS);
  }
}

async function _doRestoreSession() {
  var sb = getSupabase();
  if (!sb) return false;

  try {
    // 5秒超时保护 — 防止网络慢时阻塞页面
    var sessionResult = await Promise.race([
      sb.auth.getSession(),
      new Promise(function(resolve) {
        setTimeout(function() { resolve({ timedOut: true }); }, GET_SESSION_TIMEOUT_MS);
      })
    ]);

    if (sessionResult.timedOut) {
      console.warn('[BioQuest] restoreSession: getSession 超时');
      return false;
    }

    var data = sessionResult.data;
    if (data && data.session && data.session.user) {
      var profile = null;
      try {
        var profileResult = await Promise.race([
          sb.from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .maybeSingle(),
          new Promise(function(resolve) {
            setTimeout(function() { resolve({ data: null, timedOut: true }); }, PROFILE_FETCH_TIMEOUT_MS);
          })
        ]);
        if (!profileResult.timedOut) {
          profile = profileResult?.data;
        }
      } catch (e) {
        // profile 可能不存在
      }

      _currentUser = {
        id: data.session.user.id,
        username: profile?.username || 'user',
        display_name: profile?.display_name || 'User',
        bio_score: profile?.bio_score || 0,
        points: profile?.points || POINTS_DEFAULT,
        user_group: profile?.user_group || 'member',
        email_verified: false
      };

      // 检查邮箱验证状态，自动升级用户组（带超时）
      try {
        _currentUser = await Promise.race([
          checkEmailVerification(_currentUser, data.session.user),
          new Promise(function(resolve) {
            setTimeout(function() { resolve(_currentUser); }, EMAIL_VERIFICATION_TIMEOUT_MS);
          })
        ]);
      } catch (e) {
        // 静默失败
      }

      // 启动在线时长跟踪
      startOnlineTimeTracking();

      // 修复：restoreSession 成功后，通知 admin 模块同步认证状态
      if (_currentUser && _currentUser.user_group === 'admin') {
        var token = JSON.stringify({ t: Date.now(), exp: ADMIN_TOKEN_TTL });
        sessionStorage.setItem('bioquest_admin_auth', token);
        if (typeof window._onAuthUserLoaded === 'function') {
          window._onAuthUserLoaded(_currentUser);
        }
      }

      return true;
    }
  } catch (e) {
    // 静默失败
  }
  return false;
}

/**
 * 通用数据库操作
 */
async function sbSelect(table, options) {
  var sb = getSupabase();
  if (!sb) return { data: null, error: 'Supabase 未初始化' };

  var query = sb.from(table).select(options?.select || '*');

  if (options?.eq) {
    for (var key in options.eq) {
      query = query.eq(key, options.eq[key]);
    }
  }
  if (options?.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending !== false });
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return await query;
}

async function sbInsert(table, data) {
  var sb = getSupabase();
  if (!sb) return { data: null, error: 'Supabase 未初始化' };
  return await sb.from(table).insert(data);
}

async function sbUpdate(table, data, match) {
  var sb = getSupabase();
  if (!sb) return { data: null, error: 'Supabase 未初始化' };

  var query = sb.from(table).update(data);
  for (var key in match) {
    query = query.eq(key, match[key]);
  }
  return await query;
}

async function sbDelete(table, match) {
  var sb = getSupabase();
  if (!sb) return { data: null, error: 'Supabase 未初始化' };

  var query = sb.from(table).delete();
  for (var key in match) {
    query = query.eq(key, match[key]);
  }
  return await query;
}

/**
 * 更新用户分数
 */
async function updateBioScore(bioScore, stats) {
  var sb = getSupabase();
  if (!sb || !_currentUser) return;
  try {
    // 直接更新字段，不使用 rpc
    var updates = {
      bio_score: bioScore,
      practice_count: stats.practice_count || 0,
      total_answered: stats.total_answered || 0,
      total_correct: stats.total_correct || 0,
      accuracy: stats.accuracy || 0,
      updated_at: new Date().toISOString()
    };
    await sb.from('profiles').upsert({ id: _currentUser.id, ...updates, device_id: localStorage.getItem('bioquest_device_id') || 'unknown' }, { onConflict: 'id' });

    // 刷题奖励：每答满10题获得积分
    try {
      var answered = stats.total_answered || 0;
      var milestone = Math.floor(answered / 10);
      var lastMilestone = 0;
      try { lastMilestone = parseInt(localStorage.getItem('bioquest_points_practice_milestone') || '0', 10); } catch (e) {}
      if (milestone > lastMilestone) {
        var rewardSteps = milestone - lastMilestone;
        for (var i = 0; i < rewardSteps; i++) {
          var delta = await calculateEarnedPoints('practice_milestone');
          if (delta > 0) {
            await adjustUserPoints(delta, POINTS_EARN_RULES.practice_milestone.reason, { source: 'practice' });
          }
        }
        localStorage.setItem('bioquest_points_practice_milestone', String(milestone));
      }
    } catch (e) { /* 静默 */ }
  } catch (e) {
    // 静默失败
  }
}

/**
 * 获取排行榜（带30秒缓存）
 */
var _leaderboardCache = { practice: null, score: null, practice_ts: 0, score_ts: 0 };
var LEADERBOARD_CACHE_TTL = 30000;
var LEADERBOARD_FETCH_TIMEOUT = 5000;  // 排行榜查询超短超时 5s，避免 Supabase SDK 把请求拖死或 abort 污染控制台
var _leaderboardInflight = {};         // 防抖：同 tab 在途请求复用，避免并发 abort

async function getLeaderboard(tab, limit) {
  var cacheKey = tab === 'practice' ? 'practice' : 'score';
  var now = Date.now();
  if (_leaderboardCache[cacheKey] && (now - _leaderboardCache[cacheKey + '_ts']) < LEADERBOARD_CACHE_TTL) {
    return _leaderboardCache[cacheKey];
  }
  // 防抖：复用同 tab 在途请求，避免 SDK 并发 cancel → ERR_ABORTED
  if (_leaderboardInflight[cacheKey]) return _leaderboardInflight[cacheKey];

  var sb = getSupabase();
  if (!sb) {
    console.warn('[leaderboard] Supabase 客户端未初始化');
    return [];
  }

  // AbortController + 5s 短超时：超时/abort/网络波动 全部静默返回 []，不把红色 error 打到用户控制台
  var timer = null;
  var ctrl = null;
  if (typeof AbortController !== 'undefined') {
    ctrl = new AbortController();
    timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, LEADERBOARD_FETCH_TIMEOUT);
  }

  var onFinished = function () {
    if (timer) { clearTimeout(timer); timer = null; }
    delete _leaderboardInflight[cacheKey];
  };

  var inflightPromise = (async function () {
    try {
      var orderCol = tab === 'practice' ? 'total_answered' : (tab === 'checkin' ? 'current_streak' : 'bio_score');
      // 直接走 REST API（更稳定，不会互相 abort），带 AbortSignal 短超时
      var restParams = 'select=id,username,display_name,bio_score,practice_count,total_answered,total_correct,accuracy,current_streak' +
        '&order=' + orderCol + '.desc.nullslast' +
        '&' + orderCol + '=gt.0' +
        '&limit=' + (limit || 20);
      var fetchOpts = {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Accept': 'application/json'
        }
      };
      if (ctrl && typeof ctrl.signal !== 'undefined') fetchOpts.signal = ctrl.signal;
      var restRes = await fetch(SUPABASE_URL + '/rest/v1/profiles?' + restParams, fetchOpts);
      var data = restRes.ok ? (await restRes.json()) : null;
      if (!data || data.length === 0) return [];

      var result = data.map(function(p, i) {
        var score = p.bio_score || 0;
        var grade = 'F';
        if (score >= 90) grade = 'S';
        else if (score >= 80) grade = 'A';
        else if (score >= 70) grade = 'B';
        else if (score >= 60) grade = 'C';
        else if (score >= 40) grade = 'D';
        return {
          rank: i + 1,
          id: p.id,
          username: p.username || 'user',
          display_name: p.display_name || 'User',
          bio_score: score,
          practice_count: p.practice_count || 0,
          total_answered: p.total_answered || 0,
          total_correct: p.total_correct || 0,
          accuracy: p.accuracy || 0,
          current_streak: p.current_streak || 0,
          grade: grade
        };
      });

      // 当前用户的排名（尽量查，查不到不影响）
      var myRank = null;
      if (_currentUser && _currentUser.id) {
        try {
          var myQ = 'select=' + orderCol + '&id=eq.' + encodeURIComponent(_currentUser.id);
          var myRes = await fetch(SUPABASE_URL + '/rest/v1/profiles?' + myQ, {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
              'Accept': 'application/json'
            },
            signal: (ctrl && ctrl.signal) || undefined
          });
          if (myRes.ok) {
            var myData = await myRes.json();
            if (myData && myData[0]) {
              var myValue = (tab === 'checkin') ? (myData[0].current_streak || 0) :
                ((tab === 'practice') ? (myData[0].total_answered || 0) : (myData[0].bio_score || 0));
              // 先用返回榜里找
              for (var ri = 0; ri < result.length; ri++) {
                if (result[ri].id === _currentUser.id) { myRank = result[ri].rank; break; }
              }
              if (myRank === null) {
                try {
                  var cntQ = 'select=id&' + orderCol + '=gt.' + myValue;
                  var cntRes = await fetch(SUPABASE_URL + '/rest/v1/profiles?' + cntQ, {
                    method: 'GET',
                    headers: {
                      'apikey': SUPABASE_ANON_KEY,
                      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                      'Accept': 'application/json'
                    },
                    signal: (ctrl && ctrl.signal) || undefined
                  });
                  if (cntRes.ok) {
                    var rows = await cntRes.json();
                    myRank = (rows ? rows.length : 0) + 1;
                  }
                } catch (_) { /* 排名查询失败静默跳过 */ }
              }
            }
          }
        } catch (_) { /* 查当前用户失败静默 */ }
      }

      result._myRank = myRank;
      _leaderboardCache[cacheKey] = result;
      _leaderboardCache[cacheKey + '_ts'] = Date.now();
      return result;
    } catch (err) {
      // AbortError / 网络波动 / 超时 全静默，不污染控制台 error
      return [];
    }
  })();

  inflightPromise.then(onFinished, onFinished);
  _leaderboardInflight[cacheKey] = inflightPromise;
  return inflightPromise;
}

// ===== 用户积分（Points）=====

/**
 * 获取积分等级信息（由累计总积分阈值推导）
 */
function getPointsLevel(points) {
  var score = typeof points === 'number' ? points : POINTS_DEFAULT;
  var current = POINTS_LEVELS[0];
  var next = null;
  for (var i = 0; i < POINTS_LEVELS.length; i++) {
    var lv = POINTS_LEVELS[i];
    if (score >= lv.min) { current = lv; next = POINTS_LEVELS[i + 1] || null; }
  }
  var curMin = current.min;
  var nxtMin = next ? next.min : curMin;
  var span = Math.max(1, nxtMin - curMin);
  var progress = next ? Math.min(1, Math.max(0, (score - curMin) / span)) : 1;
  return {
    label: current.label,
    title: current.title,
    color: current.color,
    icon: current.icon,
    min: curMin,
    nextAt: next ? nxtMin : null,
    progress: Math.round(progress * 1000) / 1000
  };
}

/**
 * 检测文本是否包含不文明用语
 * 注意：会先剥离 base64 图片数据、URL、代码块，避免误判
 */
function isUncivilContent(text) {
  if (!text) return { uncivil: false };
  var cleaned = String(text)
    // 剥离 base64 data URI（图片等）
    .replace(/data:[a-z]+\/[a-z]+;base64,[A-Za-z0-9+/=]+/gi, '[图片]')
    // 剥离 markdown 图片语法
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '[图片]')
    // 剥离 HTML img 标签
    .replace(/<img[^>]*>/gi, '[图片]')
    // 剥离 URL
    .replace(/https?:\/\/[^\s)]+/g, '[链接]')
    // 剥离代码块
    .replace(/```[\s\S]*?```/g, '[代码]')
    .replace(/`[^`]+`/g, '[代码]');
  var lowered = cleaned.toLowerCase();
  for (var i = 0; i < _UNCIVIL_WORDS.length; i++) {
    if (lowered.indexOf(_UNCIVIL_WORDS[i]) !== -1) {
      return { uncivil: true, word: _UNCIVIL_WORDS[i] };
    }
  }
  return { uncivil: false };
}

/**
 * 查询某用户最近 windowDays 天内某类行为的次数
 * 静默失败：所有异常（表不存在/RLS拒绝/网络中断/超时）返回 0，不冒泡到控制台
 */
async function getBehaviorCount(userId, source, windowDays) {
  var sb = getSupabase();
  if (!sb || !userId) return 0;
  try {
    var since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    // 5 秒超时控制：避免页面切换时未完成的请求在控制台抛 ERR_ABORTED
    var ac = new AbortController();
    var timer = setTimeout(function () { ac.abort(); }, BEHAVIOR_COUNT_TIMEOUT_MS);
    var result = await sb.from('cr_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source', source)
      .gte('created_at', since)
      .abortSignal(ac.signal);
    clearTimeout(timer);
    if (result && result.error) return 0;
    return (result && result.count) || 0;
  } catch (e) {
    // 静默：cr_logs 表可能不存在（未运行 schema），不影响主功能
    return 0;
  }
}

/**
 * 计算积极行为获得的积分（固定基础值，不衰减）
 */
async function calculateEarnedPoints(ruleKey, userId) {
  var rule = POINTS_EARN_RULES[ruleKey];
  if (!rule) return 0;
  var uid = userId || (_currentUser ? _currentUser.id : null);
  if (!uid) return 0;
  return rule.base;
}

/**
 * 检查用户是否有足够积分执行某高影响操作
 */
function canPerformAction(points, actionKey) {
  var action = POINTS_ACTION_COSTS[actionKey];
  if (!action) return { ok: false, error: '未知操作' };
  if (typeof points !== 'number' || points < action.threshold) {
    return { ok: false, error: '积分不足（需要 ' + action.threshold + '，当前 ' + (points || 0) + '）' };
  }
  return { ok: true, cost: action.cost };
}

/**
 * 创建积分申诉记录
 * @param {Object} params - { content, detected_word, amount, reason, source, user_note }
 */
async function createCRAppeal(params) {
  var sb = getSupabase();
  if (!sb || !_currentUser) return null;
  try {
    var { data, error } = await sb.from('cr_appeals')
      .insert({
        user_id: _currentUser.id,
        content: params.content || '',
        detected_word: params.detected_word || '',
        amount: params.amount || 0,
        reason: params.reason || '',
        source: params.source || 'community',
        user_note: params.user_note || ''
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    // 表不存在时静默降级（cr_appeals 表未创建），仅 console.warn
    if (e.message && e.message.indexOf('schema cache') >= 0) {
      console.warn('[积分] cr_appeals 表未创建，申诉功能降级');
    } else {
      console.error('[积分] 创建申诉失败:', e.message);
    }
    return null;
  }
}

/**
 * 更新当前用户 pending 申诉的说明
 */
async function updateCRAppeal(appealId, userNote) {
  var sb = getSupabase();
  if (!sb || !_currentUser || !appealId) return { ok: false, error: '参数错误' };
  try {
    var { error } = await sb.from('cr_appeals')
      .update({ user_note: userNote || '' })
      .eq('id', appealId)
      .eq('user_id', _currentUser.id)
      .eq('status', 'pending');
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 获取当前用户的申诉记录
 */
async function getUserPointsAppeals() {
  var sb = getSupabase();
  if (!sb || !_currentUser) return [];
  try {
    var { data, error } = await sb.from('cr_appeals')
      .select('*')
      .eq('user_id', _currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

/**
 * 获取待处理的申诉记录（管理员用）
 */
async function getPendingCRAppeals() {
  var sb = getSupabase();
  if (!sb || !_currentUser) return [];
  try {
    var { data, error } = await sb.from('cr_appeals')
      .select('*, profiles:user_id(username, display_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

/**
 * 处理积分申诉（管理员用）
 * @param {string} appealId
 * @param {string} action - 'approve' 或 'reject'
 * @param {string} adminNote
 */
async function resolveCRAppeal(appealId, action, adminNote) {
  var sb = getSupabase();
  if (!sb || !_currentUser) return { ok: false, error: '未登录' };
  try {
    var { data: appeal, error: fetchError } = await sb.from('cr_appeals')
      .select('*')
      .eq('id', appealId)
      .single();
    if (fetchError) throw fetchError;
    if (!appeal) return { ok: false, error: '申诉不存在' };
    if (appeal.status !== 'pending') return { ok: false, error: '该申诉已处理' };

    // 如果批准，恢复被扣除的积分
    if (action === 'approve') {
      await adjustUserPoints(Math.abs(appeal.amount), '申诉通过：恢复积分', { userId: appeal.user_id, source: 'appeal' });
    }

    var { error } = await sb.from('cr_appeals')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_note: adminNote || '',
        resolved_at: new Date().toISOString()
      })
      .eq('id', appealId);
    if (error) throw error;

    return { ok: true, status: action === 'approve' ? 'approved' : 'rejected' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 获取用户当前积分（不衰减）
 */
async function getUserPoints(userId) {
  var sb = getSupabase();
  var uid = userId || (_currentUser ? _currentUser.id : null);
  if (!sb || !uid) {
    return { points: (_currentUser && typeof _currentUser.points === 'number') ? _currentUser.points : POINTS_DEFAULT, level: getPointsLevel(_currentUser && _currentUser.points) };
  }
  try {
    var { data, error } = await sb.from('profiles')
      .select('points, points_updated_at, user_group')
      .eq('id', uid)
      .maybeSingle();
    if (error) throw error;
    var points = (data && typeof data.points === 'number') ? data.points : POINTS_DEFAULT;
    return { points: points, level: getPointsLevel(points), user_group: data ? data.user_group : 'member' };
  } catch (e) {
    return { points: (_currentUser && typeof _currentUser.points === 'number') ? _currentUser.points : POINTS_DEFAULT, level: getPointsLevel(_currentUser && _currentUser.points) };
  }
}

/**
 * 调整用户积分（普通用户仅能通过任务/违规被动调整；管理员可主动修改他人）
 * @param {number} amount - 变化量（正为增加，负为扣除）
 * @param {string} reason - 原因
 * @param {Object} [options] - { userId, source }
 */
async function adjustUserPoints(amount, reason, options) {
  options = options || {};
  var sb = getSupabase();
  var userId = options.userId || (_currentUser ? _currentUser.id : null);
  if (!sb || !userId) return { ok: false, error: '未登录或未初始化' };

  try {
    var { data: profile, error: fetchError } = await sb.from('profiles')
      .select('points, points_updated_at, user_group')
      .eq('id', userId)
      .maybeSingle();
    if (fetchError) throw fetchError;

    var rawPoints = (profile && typeof profile.points === 'number') ? profile.points : POINTS_DEFAULT;
    // 不衰减，直接应用本次调整（profiles.points 字段为 integer，四舍五入到整数，下限 0）
    var newPoints = Math.max(0, Math.round(rawPoints + amount));

    var { error: updateError } = await sb.from('profiles')
      .update({ points: newPoints, points_updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (updateError) throw updateError;

    // 记录审计日志（表可能不存在，忽略错误）
    try {
      await sb.from('cr_logs').insert({
        user_id: userId,
        amount: Math.round(amount),
        reason: reason || '手动调整',
        source: options.source || 'manual'
      });
    } catch (logErr) { /* 静默忽略 */ }

    // 重新读取，获取触发器可能更新的 user_group
    var { data: updated } = await sb.from('profiles')
      .select('points, user_group')
      .eq('id', userId)
      .maybeSingle();
    var finalPoints = (updated && typeof updated.points === 'number') ? updated.points : newPoints;
    var finalGroup = (updated && updated.user_group) ? updated.user_group : (profile && profile.user_group) || 'member';

    if (_currentUser && _currentUser.id === userId) {
      _currentUser.points = finalPoints;
      _currentUser.user_group = finalGroup;
    }

    return { ok: true, points: finalPoints, user_group: finalGroup };
  } catch (e) {
    console.error('[Points] 调整失败:', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * 将本地积分同步到云端（登录状态下回写，取本地与云端较高者）
 * @param {number} points - 本地最新总积分
 */
async function syncPointsToCloud(points) {
  var sb = getSupabase();
  if (!sb || !_currentUser || _currentUser.isGuest) return { ok: false, error: '未登录' };
  var val = (typeof points === 'number' && isFinite(points)) ? Math.max(0, Math.round(points)) : 0;
  try {
    var { data } = await sb.from('profiles')
      .select('points')
      .eq('id', _currentUser.id)
      .maybeSingle();
    var cloudPoints = (data && typeof data.points === 'number') ? data.points : 0;
    var target = Math.max(cloudPoints, val);
    if (target !== cloudPoints) {
      var { error } = await sb.from('profiles')
        .update({ points: target, points_updated_at: new Date().toISOString() })
        .eq('id', _currentUser.id);
      if (error) throw error;
    }
    _currentUser.points = target;
    return { ok: true, points: target };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 获取积分排行榜（按 profiles.points 降序）
 * @param {number} [limit] - 返回条数，默认 50
 */
async function getPointsLeaderboard(limit) {
  var sb = getSupabase();
  var n = limit || 50;
  if (!sb) return [];
  try {
    var { data, error } = await sb.from('profiles')
      .select('id, username, display_name, points, user_group')
      .order('points', { ascending: false })
      .limit(n);
    if (error) throw error;
    return (data || []).map(function(p) {
      return {
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        points: (typeof p.points === 'number') ? Math.max(0, p.points) : 0,
        user_group: p.user_group || 'member',
        level: getPointsLevel(p.points)
      };
    });
  } catch (e) {
    return [];
  }
}

/**
 * 在线时长奖励跟踪
 * 每5分钟活跃奖励1 积分，每天最多12分
 */
var _onlineTracker = {
  lastActive: Date.now(),
  heartbeatTimer: null,
  rewardedToday: 0
};

function startOnlineTimeTracking() {
  if (_onlineTracker.heartbeatTimer || !_currentUser || _currentUser.isGuest) return;
  _onlineTracker.lastActive = Date.now();

  var keys = { date: 'bioquest_points_online_date', count: 'bioquest_points_online_count' };
  try {
    var today = _localDateStr();
    var savedDate = localStorage.getItem(keys.date);
    _onlineTracker.rewardedToday = savedDate === today ? parseInt(localStorage.getItem(keys.count) || '0', 10) : 0;
  } catch (e) { _onlineTracker.rewardedToday = 0; }

  function onActivity() { _onlineTracker.lastActive = Date.now(); }
  document.addEventListener('mousemove', onActivity, { passive: true });
  document.addEventListener('keydown', onActivity, { passive: true });
  document.addEventListener('touchstart', onActivity, { passive: true });

  _onlineTracker.heartbeatTimer = setInterval(async function() {
    if (!_currentUser || _currentUser.isGuest || _onlineTracker.rewardedToday >= ONLINE_TIME_DAILY_CAP) return;
    var inactive = Date.now() - _onlineTracker.lastActive;
    if (inactive > ONLINE_TIME_INACTIVE_THRESHOLD_MS) return;
    var delta = await calculateEarnedPoints('online_time');
    if (delta <= 0) return;
    adjustUserPoints(delta, POINTS_EARN_RULES.online_time.reason, { source: 'online_time' }).then(function(result) {
      if (result.ok) {
        _onlineTracker.rewardedToday++;
        try {
          var today = _localDateStr();
          localStorage.setItem(keys.date, today);
          localStorage.setItem(keys.count, String(_onlineTracker.rewardedToday));
        } catch (e) {}
      }
    });
  }, ONLINE_TIME_HEARTBEAT_INTERVAL_MS);
}

// ===== 社区功能 =====
async function getCommunityPosts(page, tag) {
  var sb = getSupabase();
  if (!sb) return { posts: [], total: 0 };
  try {
    // 主查询：带 count 元数据，避免单独发一次 head 查询（消除 ERR_ABORTED 来源）
    var query = sb.from('community_posts')
      .select('id, author_id, content, tags, like_count, comment_count, is_pinned, is_deleted, created_at, updated_at', { count: 'exact' })
      .eq('is_deleted', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * 7, page * 7 - 1);

    if (tag && tag !== '') {
      query = query.contains('tags', [tag]);
    }

    var mainRes = await query;
    if (mainRes.error) return { posts: [], total: 0 };
    var data = mainRes.data || [];
    var total = mainRes.count || data.length;

    // 过滤掉 null author_id（孤儿帖），避免后续 .in('id', null) 查询失败
    var authorIds = data.map(function(p) { return p.author_id; }).filter(function(id) { return id != null; });
    var postIds = data.map(function(p) { return p.id; });

    // 并行执行：作者信息 + 当前用户点赞 + 所有点赞计数
    var tasks = [];
    if (authorIds.length > 0) {
      tasks.push(sb.from('profiles')
        .select('id, username, display_name')
        .in('id', authorIds));
    }
    if (_currentUser && postIds.length > 0) {
      tasks.push(sb.from('community_post_likes')
        .select('post_id')
        .eq('user_id', _currentUser.id)
        .in('post_id', postIds));
    }
    if (postIds.length > 0) {
      tasks.push(sb.from('community_post_likes')
        .select('post_id')
        .in('post_id', postIds));
    }

    var results = tasks.length > 0 ? await Promise.all(tasks) : [];
    var profiles = results[0] && results[0].data ? results[0].data : [];
    var myLikes = (_currentUser && results[1] && results[1].data) ? results[1].data : [];
    var allLikes = (results.length > 0) ? (results[results.length - 1] && results[results.length - 1].data ? results[results.length - 1].data : []) : [];

    var authorMap = {};
    profiles.forEach(function(profile) { authorMap[profile.id] = profile; });

    var likedMap = {};
    myLikes.forEach(function(like) { likedMap[like.post_id] = true; });

    var likesCountMap = {};
    allLikes.forEach(function(like) {
      likesCountMap[like.post_id] = (likesCountMap[like.post_id] || 0) + 1;
    });

    var posts = data.map(function(p) {
      var author = authorMap[p.author_id] || { username: '匿名', display_name: '匿名用户' };
      return {
        id: p.id,
        author: {
          username: author.username || '匿名',
          display_name: author.display_name || '匿名用户'
        },
        content: p.content,
        tags: p.tags || [],
        likes: likesCountMap[p.id] || p.like_count || 0,
        comment_count: p.comment_count || 0,
        liked_by_me: likedMap[p.id] || false,
        created_at: p.created_at
      };
    });

    return { posts: posts, total: total };
  } catch (e) {
    return { posts: [], total: 0 };
  }
}

async function createCommunityPost(content, tags) {
  var sb = getSupabase();
  if (!sb || !_currentUser) return { ok: false, error: '未登录' };
  try {
    // 1. 不文明内容检测（零成本拦截）
    var check = isUncivilContent(content);
    if (check.uncivil) {
      await adjustUserPoints(POINTS_PENALTIES.uncivil_post.amount, POINTS_PENALTIES.uncivil_post.reason, { source: 'community' });
      // 自动生成申诉记录，方便用户误触时申请复核
      var appeal = await createCRAppeal({
        content: content,
        detected_word: check.word,
        amount: POINTS_PENALTIES.uncivil_post.amount,
        reason: POINTS_PENALTIES.uncivil_post.reason,
        source: 'community_post'
      });
      return {
        ok: false,
        error: '检测到不文明用语（' + check.word + '），已扣除 ' + Math.abs(POINTS_PENALTIES.uncivil_post.amount) + ' 积分',
        appeal_id: appeal && appeal.id ? appeal.id : null
      };
    }

    // 2. 检查发帖权限并消费积分
    var crInfo = await getUserPoints();
    var actionCheck = canPerformAction(crInfo.points, 'post');
    if (!actionCheck.ok) {
      return { ok: false, error: actionCheck.error };
    }
    await adjustUserPoints(-POINTS_ACTION_COSTS.post.cost, POINTS_ACTION_COSTS.post.reason, { source: 'post_cost' });

    var { error } = await sb.from('community_posts')
      .insert({
        author_id: _currentUser.id,
        content: content,
        tags: tags || []
      });
    return { ok: !error, error: error ? error.message : null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function togglePostLike(postId) {
  var sb = getSupabase();
  if (!sb || !_currentUser) return null;
  try {
    // 检查是否已点赞
    var { data: existing } = await sb.from('community_post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', _currentUser.id)
      .maybeSingle();

    if (existing) {
      // 取消点赞
      var { error: delError } = await sb.from('community_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', _currentUser.id);
      if (delError) return null;
    } else {
      // 点赞
      var { error: insError } = await sb.from('community_post_likes')
        .insert({ post_id: postId, user_id: _currentUser.id });
      if (insError) return null;
    }

    // 重新计算点赞数（从 community_post_likes 表直接 count，避免 RLS 阻止更新 like_count）
    var { count } = await sb.from('community_post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    // 尝试更新 like_count（可能因 RLS 失败，但不影响功能）
    try {
      await sb.from('community_posts')
        .update({ like_count: count || 0 })
        .eq('id', postId);
    } catch (e) {
      // RLS 可能阻止非作者更新，忽略此错误
    }

    return { liked: !existing, likes: count || 0 };
  } catch (e) {
    return null;
  }
}

async function getPostComments(postId) {
  var sb = getSupabase();
  if (!sb) return { comments: [] };
  try {
    var { data, error } = await sb.from('community_comments')
      .select('id, author_id, content, is_deleted, created_at')
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    
    if (error) return { comments: [] };

    // 获取作者信息
    var authorIds = data ? data.map(function(c) { return c.author_id; }) : [];
    var authorMap = {};
    if (authorIds.length > 0) {
      var { data: profiles } = await sb.from('profiles')
        .select('id, username, display_name')
        .in('id', authorIds);
      
      if (profiles) {
        profiles.forEach(function(profile) {
          authorMap[profile.id] = profile;
        });
      }
    }

    var comments = (data || []).map(function(c) {
      var author = authorMap[c.author_id] || { username: '匿名', display_name: '匿名用户' };
      return {
        id: c.id,
        author: {
          username: author.username || '匿名',
          display_name: author.display_name || '匿名用户'
        },
        content: c.content,
        created_at: c.created_at
      };
    });

    return { comments: comments };
  } catch (e) {
    return { comments: [] };
  }
}

async function addPostComment(postId, content) {
  var sb = getSupabase();
  if (!sb || !_currentUser) return { ok: false, error: '未登录' };
  try {
    // 1. 不文明内容检测（零成本拦截）
    var check = isUncivilContent(content);
    if (check.uncivil) {
      await adjustUserPoints(POINTS_PENALTIES.uncivil_comment.amount, POINTS_PENALTIES.uncivil_comment.reason, { source: 'community' });
      // 自动生成申诉记录
      var appeal = await createCRAppeal({
        content: content,
        detected_word: check.word,
        amount: POINTS_PENALTIES.uncivil_comment.amount,
        reason: POINTS_PENALTIES.uncivil_comment.reason,
        source: 'community_comment'
      });
      return {
        ok: false,
        error: '检测到不文明用语（' + check.word + '），已扣除 ' + Math.abs(POINTS_PENALTIES.uncivil_comment.amount) + ' 积分',
        appeal_id: appeal && appeal.id ? appeal.id : null
      };
    }

    // 2. 检查评论权限并消费积分
    var crInfo = await getUserPoints();
    var actionCheck = canPerformAction(crInfo.points, 'comment');
    if (!actionCheck.ok) {
      return { ok: false, error: actionCheck.error };
    }
    await adjustUserPoints(-POINTS_ACTION_COSTS.comment.cost, POINTS_ACTION_COSTS.comment.reason, { source: 'comment_cost' });

    var { error } = await sb.from('community_comments')
      .insert({
        post_id: postId,
        author_id: _currentUser.id,
        content: content
      });

    if (!error) {
      // 获取当前评论数
      var { data: postBefore } = await sb.from('community_posts')
        .select('comment_count')
        .eq('id', postId)
        .maybeSingle();
      var currentComments = postBefore ? postBefore.comment_count || 0 : 0;

      // 更新评论数
      await sb.from('community_posts')
        .update({ comment_count: currentComments + 1 })
        .eq('id', postId);
    }

    return { ok: !error, error: error ? error.message : null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ===== 成就徽章系统 =====
// 参考英雄联盟局内成就命名：幽默、嘲讽、夸张、反差

var ACHIEVEMENT_TIERS = {
  iron:    { label: '坚韧黑铁', color: '#5c5c5c', order: 0 },
  bronze:  { label: '荣耀青铜', color: '#cd7f32', order: 1 },
  silver:  { label: '不屈白银', color: '#c0c0c0', order: 2 },
  gold:    { label: '荣耀黄金', color: '#ffd700', order: 3 },
  platinum:{ label: '华贵铂金', color: '#40e0d0', order: 4 },
  diamond: { label: '璀璨钻石', color: '#b9f2ff', order: 5 },
  master:  { label: '超凡大师', color: '#9b59b6', order: 6 },
  challenger:{ label: '傲世宗师', color: '#ff4655', order: 7 }
};

var ACHIEVEMENTS = {
  // ===== 新手村（新手引导） =====
  first_login:     { name: '你好世界',       desc: '第一次打开BioQuest，勇气可嘉',  icon: 'I', category: 'journey',  tier: 'iron' },
  first_practice:  { name: '羊入虎口',       desc: '做了第一道题，不知道该恭喜还是该劝退', icon: 'S', category: 'journey',  tier: 'iron' },
  email_verified:  { name: '验明正身',       desc: '邮箱验证了，你终于不是黑户了',   icon: 'V', category: 'journey',  tier: 'bronze' },

  // ===== 熬夜修仙（打卡坚持） =====
  streak_3:        { name: '三分钟热度',     desc: '连续打卡3天，别告诉我第4天就溜了', icon: 'F', category: 'persistence', tier: 'iron' },
  streak_7:        { name: '一周存活',       desc: '连续打卡7天，你比90%的人持久',   icon: '7', category: 'persistence', tier: 'bronze' },
  streak_14:       { name: '习惯成自然',     desc: '连续打卡14天，不学浑身难受了吧',  icon: '14', category: 'persistence', tier: 'silver' },
  streak_30:       { name: '月度全勤',       desc: '连续打卡30天，班主任看了都流泪',  icon: '30', category: 'persistence', tier: 'gold' },
  streak_60:       { name: '双月修仙',       desc: '连续打卡60天，你已经不需要睡眠了', icon: '60', category: 'persistence', tier: 'platinum' },
  streak_100:      { name: '百日不倒',       desc: '连续打卡100天，你是人还是机器人？', icon: '100', category: 'persistence', tier: 'diamond' },
  streak_365:      { name: '一年365天',      desc: '连续打卡365天，你赢了，真的赢了',  icon: '365', category: 'persistence', tier: 'challenger' },

  // ===== 分数玄学（分数成就） =====
  score_60:        { name: '及格线上的挣扎',  desc: '60分，多一分浪费，少一分受罪',   icon: '60s', category: 'mastery',   tier: 'iron' },
  score_70:        { name: '薛定谔的70分',   desc: '70分，不好不坏，薛定谔都看不懂你', icon: '70s', category: 'mastery',   tier: 'bronze' },
  score_80:        { name: '别人家的孩子',    desc: '80分，你妈终于可以在亲戚面前吹了', icon: '80s', category: 'mastery',   tier: 'silver' },
  score_90:        { name: '卷王本王',       desc: '90分，你让其他同学怎么活？',     icon: '90s', category: 'mastery',   tier: 'gold' },
  score_100:       { name: '满分？就这？',    desc: '100分，你说的对，确实就这',      icon: '100s', category: 'mastery',   tier: 'diamond' },

  // ===== 刷题机器（答题数量） =====
  questions_50:    { name: '热身运动',       desc: '50题，你才刚伸了个懒腰',        icon: '50q', category: 'conquest',  tier: 'iron' },
  questions_100:   { name: '题海入门',       desc: '100题，你已经开始湿鞋了',       icon: '100q', category: 'conquest',  tier: 'bronze' },
  questions_300:   { name: '刷题永动机',     desc: '300题，你的手指已经形成了肌肉记忆', icon: '300q', category: 'conquest',  tier: 'silver' },
  questions_500:   { name: '半千大佬',       desc: '500题，你做梦都在选ABCD',       icon: '500q', category: 'conquest',  tier: 'gold' },
  questions_1000:  { name: '千题成精',       desc: '1000题，题目看到你就跑',        icon: '1K', category: 'conquest',  tier: 'platinum' },
  questions_2000:  { name: '题海霸主',       desc: '2000题，出题人看到你都要绕路',   icon: '2K', category: 'conquest',  tier: 'diamond' },
  questions_5000:  { name: '你摸不到',       desc: '5000题，你的题量别人一辈子摸不到', icon: '5K', category: 'conquest',  tier: 'challenger' },

  // ===== 神射手（正确率） =====
  accuracy_60:     { name: '蒙的都对',       desc: '60%正确率，你管这叫蒙的？',     icon: '60%', category: 'precision', tier: 'iron' },
  accuracy_70:     { name: '七成胜率',       desc: '70%正确率，电竞选手都羡慕你',    icon: '70%', category: 'precision', tier: 'bronze' },
  accuracy_80:     { name: '稳定输出',       desc: '80%正确率，你的正确率比A股稳定',  icon: '80%', category: 'precision', tier: 'silver' },
  accuracy_90:     { name: '完美连控',       desc: '90%正确率，题目被你控得死死的',   icon: '90%', category: 'precision', tier: 'gold' },
  accuracy_95:     { name: '题目克星',       desc: '95%正确率，题目见了你直接投降',   icon: '95%', category: 'precision', tier: 'diamond' },

  // ===== 社交牛逼症（社区成就） =====
  community_first: { name: '社恐出没',       desc: '第一次发帖，手抖了吗？',        icon: '1st', category: 'community',  tier: 'iron' },
  community_5:     { name: '话痨上线',       desc: '发了5个帖子，你开始收不住了',    icon: '5th', category: 'community',  tier: 'bronze' },
  community_10:    { name: '社交达人',       desc: '发了10个帖子，你比老师还能说',    icon: '10th', category: 'community',  tier: 'silver' },
  community_50:    { name: '社区顶流',       desc: '发了50个帖子，你就是BioQuest的KOL', icon: '50th', category: 'community',  tier: 'gold' },
  community_100:   { name: '话痨天花板',     desc: '发了100个帖子，你确定不是来水贴的？', icon: '100th', category: 'community',  tier: 'diamond' },

  // ===== 考场战神（考试成就） =====
  exam_first:      { name: '炮灰报到',       desc: '第一次模拟考，活下来就是胜利',    icon: '1ex', category: 'exam',      tier: 'iron' },
  exam_5:          { name: '老考生了',       desc: '5次模拟考，你已经面不改色了',    icon: '5ex', category: 'exam',      tier: 'bronze' },
  exam_10:         { name: '考场老油条',     desc: '10次模拟考，你比监考老师还淡定',   icon: '10ex', category: 'exam',      tier: 'silver' },
  exam_perfect:    { name: '你开挂了吧',     desc: '满分？！不是开挂就是外星人',      icon: 'PF', category: 'exam',      tier: 'diamond' }
};

var ACHIEVEMENT_CATEGORIES = {
  journey:     { name: '新手村',     icon: '' },
  persistence: { name: '熬夜修仙',   icon: '' },
  mastery:     { name: '分数玄学',   icon: '' },
  conquest:    { name: '刷题机器',   icon: '' },
  precision:   { name: '神射手',     icon: '' },
  community:   { name: '社交牛逼症', icon: '' },
  exam:        { name: '考场战神',   icon: '' }
};

/**
 * 检查并授予成就
 * @param {string} type - 成就类型: streak, score, questions, email, community, login, practice, exam, accuracy
 * @param {number} value - 对应的值
 */
async function checkAchievement(type, value) {
  var sb = getSupabase();
  if (!sb || !_currentUser) return [];

  var newAchievements = [];
  var checks = [];

  switch (type) {
    case 'streak':
      if (value >= 3) checks.push('streak_3');
      if (value >= 7) checks.push('streak_7');
      if (value >= 14) checks.push('streak_14');
      if (value >= 30) checks.push('streak_30');
      if (value >= 60) checks.push('streak_60');
      if (value >= 100) checks.push('streak_100');
      if (value >= 365) checks.push('streak_365');
      break;
    case 'score':
      if (value >= 60) checks.push('score_60');
      if (value >= 70) checks.push('score_70');
      if (value >= 80) checks.push('score_80');
      if (value >= 90) checks.push('score_90');
      if (value >= 100) checks.push('score_100');
      break;
    case 'questions':
      if (value >= 50) checks.push('questions_50');
      if (value >= 100) checks.push('questions_100');
      if (value >= 300) checks.push('questions_300');
      if (value >= 500) checks.push('questions_500');
      if (value >= 1000) checks.push('questions_1000');
      if (value >= 2000) checks.push('questions_2000');
      if (value >= 5000) checks.push('questions_5000');
      break;
    case 'accuracy':
      if (value >= 60) checks.push('accuracy_60');
      if (value >= 70) checks.push('accuracy_70');
      if (value >= 80) checks.push('accuracy_80');
      if (value >= 90) checks.push('accuracy_90');
      if (value >= 95) checks.push('accuracy_95');
      break;
    case 'email':
      checks.push('email_verified');
      break;
    case 'community':
      if (value >= 1) checks.push('community_first');
      if (value >= 5) checks.push('community_5');
      if (value >= 10) checks.push('community_10');
      if (value >= 50) checks.push('community_50');
      if (value >= 100) checks.push('community_100');
      break;
    case 'login':
      checks.push('first_login');
      break;
    case 'practice':
      checks.push('first_practice');
      break;
    case 'exam':
      if (value >= 1) checks.push('exam_first');
      if (value >= 5) checks.push('exam_5');
      if (value >= 10) checks.push('exam_10');
      break;
    case 'exam_perfect':
      checks.push('exam_perfect');
      break;
  }

  for (var i = 0; i < checks.length; i++) {
    var key = checks[i];
    try {
      // 检查是否已有此成就
      var { data: existing, error: queryError } = await sb.from('achievements')
        .select('id')
        .eq('user_id', _currentUser.id)
        .eq('achievement_key', key)
        .maybeSingle();

      // 如果 achievements 表不存在，静默跳过
      if (queryError) continue;

      if (!existing) {
        var ach = ACHIEVEMENTS[key];
        if (ach) {
          var tierInfo = ACHIEVEMENT_TIERS[ach.tier] || ACHIEVEMENT_TIERS.iron;
          var { error: insertError } = await sb.from('achievements').insert({
            user_id: _currentUser.id,
            achievement_key: key,
            achievement_name: ach.name,
            achievement_desc: ach.desc,
            achievement_icon: ach.icon,
            achievement_tier: ach.tier,
            achievement_category: ach.category || ''
          });

          // 插入成功才记录
          if (!insertError) {
            newAchievements.push({ key: key, tier: ach.tier, tierLabel: tierInfo.label, tierColor: tierInfo.color, ...ach });

            // 触发成就解锁通知
            _showAchievementNotification(ach, tierInfo);
          }
        }
      }
    } catch (e) {
      // achievements 表可能不存在，静默跳过
      continue;
    }
  }

  return newAchievements;
}

/**
 * 成就解锁通知（屏幕右上角弹出）
 */
function _showAchievementNotification(ach, tierInfo) {
  try {
    if (!document.getElementById('achieve-notif-style')) {
      var st = document.createElement('style');
      st.id = 'achieve-notif-style';
      st.textContent = [
        '.ach-notif{position:fixed;top:20px;right:20px;z-index:10000;display:flex;align-items:center;gap:14px;max-width:340px;padding:14px 18px 14px 14px;border-radius:16px;overflow:hidden;color:var(--color-text,#2c3e30);background:linear-gradient(180deg,var(--color-surface,#fff),var(--color-surface-sunken,#f7f4f0));border:1px solid rgba(196,149,106,.35);box-shadow:0 14px 44px rgba(20,30,20,.18),0 2px 8px rgba(0,0,0,.06),inset 0 1px 0 rgba(255,255,255,.7);font-family:var(--font-sans,system-ui,sans-serif);animation:achIn .55s cubic-bezier(.22,1,.36,1)}',
        '.ach-notif.out{animation:achOut .45s ease forwards}',
        '.ach-notif-icon{flex-shrink:0;width:54px;height:54px;display:flex;align-items:center;justify-content:center;border-radius:15px;background:radial-gradient(circle at 30% 22%,rgba(255,255,255,.9),rgba(241,232,214,.5));box-shadow:inset 0 0 0 1px rgba(196,149,106,.35),0 4px 14px rgba(0,0,0,.08)}',
        '.ach-notif-body{min-width:0}',
        '.ach-notif-tier{font-size:.6rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin-bottom:3px}',
        '.ach-notif-name{font-family:var(--font-serif,\'Noto Serif SC\',serif);font-size:1.05rem;font-weight:700;line-height:1.3;color:var(--color-deep,#1a2f1d)}',
        '.ach-notif-desc{font-size:.78rem;color:var(--color-text-muted,#8a8578);margin-top:3px;line-height:1.45}',
        '.ach-notif-shine{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(201,169,106,.55),transparent)}',
        '@keyframes achIn{from{transform:translateX(120%) scale(.96);opacity:0}to{transform:translateX(0) scale(1);opacity:1}}',
        '@keyframes achOut{to{transform:translateX(120%) scale(.96);opacity:0}}',
        '@media(prefers-reduced-motion:reduce){.ach-notif{animation:none}}'
      ].join('\n');
      document.head.appendChild(st);
    }

    var tierColor = (tierInfo && tierInfo.color) || '#c4956a';
    var tierLabel = (tierInfo && tierInfo.label) || '成就';
    var badge = '';
    if (typeof window.renderBadgeSvg === 'function') {
      try { badge = window.renderBadgeSvg(ach.key, { size: 46, earned: true }); } catch (e) { badge = ''; }
    }

    var notif = document.createElement('div');
    notif.className = 'ach-notif';
    notif.setAttribute('role', 'status');
    notif.innerHTML =
      '<div class="ach-notif-icon">' +
        (badge || '<span class="ach-notif-fallback">' + (ach.name ? ach.name.charAt(0) : '') + '</span>') +
      '</div>' +
      '<div class="ach-notif-body">' +
        '<div class="ach-notif-tier" style="color:' + tierColor + '">' + tierLabel + ' · 解锁成就</div>' +
        '<div class="ach-notif-name">' + ach.name + '</div>' +
        '<div class="ach-notif-desc">' + ach.desc + '</div>' +
      '</div>' +
      '<div class="ach-notif-shine"></div>';
    document.body.appendChild(notif);

    setTimeout(function () {
      notif.classList.add('out');
      setTimeout(function () {
        if (notif.parentNode) notif.parentNode.removeChild(notif);
      }, ACHIEVE_NOTIF_FADE_MS);
    }, ACHIEVE_NOTIF_DISPLAY_MS);
  } catch (e) {
    // 静默失败
  }
}

/**
 * 获取用户所有成就
 */
async function getUserAchievements() {
  var sb = getSupabase();
  if (!sb || !_currentUser) return [];
  try {
    var { data } = await sb.from('achievements')
      .select('*')
      .eq('user_id', _currentUser.id)
      .order('created_at', { ascending: true });
    return data || [];
  } catch (e) {
    return [];
  }
}

/**
 * 获取所有可用成就定义
 */
function getAllAchievements() {
  return ACHIEVEMENTS;
}

/**
 * 获取成就段位定义
 */
function getAchievementTiers() {
  return ACHIEVEMENT_TIERS;
}

/**
 * 获取成就分类定义
 */
function getAchievementCategories() {
  return ACHIEVEMENT_CATEGORIES;
}

// 暴露社区功能
window.getCommunityPosts = getCommunityPosts;
window.createCommunityPost = createCommunityPost;
window.togglePostLike = togglePostLike;
window.getPostComments = getPostComments;
window.addPostComment = addPostComment;
window.reportCommunityPost = reportCommunityPost;

/**
 * 举报帖子
 * 在 community_reports 表中插入一条记录
 * 表结构：id, post_id, reporter_id, reason, created_at
 * 需要先在 Supabase 执行 sql/migration_v5_reports.sql 创建表
 */
async function reportCommunityPost(postId, reason) {
  var sb = getSupabase();
  if (!sb || !_currentUser) return { ok: false, error: '请先登录' };
  try {
    var { error } = await sb.from('community_reports')
      .insert({
        post_id: postId,
        reporter_id: _currentUser.id,
        reason: reason || ''
      });
    if (error) {
      // 表不存在的错误（PGRST205 / 42P01）
      if (error.code === 'PGRST205' || (error.message && error.message.indexOf('relation') >= 0)) {
        return { ok: false, error: '举报功能未初始化，请管理员先执行 sql/migration_v5_reports.sql' };
      }
      // 重复举报（唯一约束冲突）
      if (error.code === '23505') {
        return { ok: false, error: '你已经举报过这篇帖子了' };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ===== 学习打卡系统 =====

/**
 * 记录今日打卡
 * 每天首次练习/考试/阅读时自动调用
 */
async function recordDailyCheckIn() {
  if (!_currentUser) return null;
  try {
    var today = _localDateStr(); // YYYY-MM-DD（本地时区）
    var userId = _currentUser.id;

    // 检查今天是否已打卡
    var existResult = await sbFetchRest('GET', 'daily_checkins',
      'user_id=eq.' + encodeURIComponent(userId) + '&checkin_date=eq.' + encodeURIComponent(today) + '&select=id');
    if (!existResult.ok) return null;
    var existing = Array.isArray(existResult.data) ? existResult.data : [];
    if (existing.length > 0) return { already: true, date: today };

    // 获取昨天日期
    var yesterday = _localDateStr(new Date(Date.now() - 86400000));
    // 查询昨天是否打卡
    var ydResult = await sbFetchRest('GET', 'daily_checkins',
      'user_id=eq.' + encodeURIComponent(userId) + '&checkin_date=eq.' + encodeURIComponent(yesterday) + '&select=streak_count');
    var yesterdayCheckin = (ydResult.ok && Array.isArray(ydResult.data) && ydResult.data.length > 0)
      ? ydResult.data[0] : null;

    var streakCount = yesterdayCheckin ? (yesterdayCheckin.streak_count + 1) : 1;

    // 插入今日打卡记录
    var insertResult = await sbFetchRest('POST', 'daily_checkins', null, {
      user_id: userId,
      checkin_date: today,
      streak_count: streakCount
    });

    if (!insertResult.ok) return null;

    // 更新 profiles 表的 streak 信息
    await sbFetchRest('PATCH', 'profiles', 'id=eq.' + encodeURIComponent(userId), {
      current_streak: streakCount,
      last_checkin: today
    });

    // 打卡加积分
    try {
      var delta = await calculateEarnedPoints('daily_checkin');
      if (delta > 0) {
        await adjustUserPoints(delta, POINTS_EARN_RULES.daily_checkin.reason, { source: 'checkin' });
      }
    } catch (e) { /* 静默 */ }

    // 检查是否获得成就
    if (typeof window.checkAchievement === 'function') {
      window.checkAchievement('streak', streakCount);
    }

    return { already: false, date: today, streak: streakCount };
  } catch (e) {
    return null;
  }
}

/**
 * 获取打卡数据
 */
async function getCheckInData() {
  if (!_currentUser) return { current_streak: 0, longest_streak: 0, total_checkins: 0, calendar: [] };
  try {
    var userId = _currentUser.id;

    // 获取 profile 中的 streak 数据
    var profileResult = await sbFetchRest('GET', 'profiles',
      'id=eq.' + encodeURIComponent(userId) + '&select=current_streak,longest_streak,last_checkin');
    var profile = (profileResult.ok && Array.isArray(profileResult.data) && profileResult.data.length > 0)
      ? profileResult.data[0] : null;

    // 获取最近30天打卡日历
    var thirtyDaysAgo = _localDateStr(new Date(Date.now() - 30 * 86400000));
    var calResult = await sbFetchRest('GET', 'daily_checkins',
      'user_id=eq.' + encodeURIComponent(userId) + '&checkin_date=gte.' + encodeURIComponent(thirtyDaysAgo) + '&order=checkin_date.desc&select=checkin_date,streak_count');
    var calendar = (calResult.ok && Array.isArray(calResult.data)) ? calResult.data : [];

    // 获取总打卡天数
    var countResult = await sbFetchRest('GET', 'daily_checkins',
      'user_id=eq.' + encodeURIComponent(userId) + '&select=id');
    var totalCheckins = (countResult.ok && Array.isArray(countResult.data)) ? countResult.data.length : 0;

    return {
      current_streak: (profile && profile.current_streak) || 0,
      longest_streak: (profile && profile.longest_streak) || 0,
      total_checkins: totalCheckins,
      last_checkin: (profile && profile.last_checkin) || null,
      calendar: calendar
    };
  } catch (e) {
    return { current_streak: 0, longest_streak: 0, total_checkins: 0, calendar: [] };
  }
}

// ===== 数据导出/导入系统 =====

/**
 * 导出所有用户数据为 JSON 对象
 * 包含：账号密码、错题、收藏、练习记录、设置、成就、签到等全部数据
 */
function exportUserData() {
  var data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    account: {},
    settings: {},
    wrongQuestions: [],
    favorites: [],
    practiceRecords: [],
    achievements: [],
    checkInData: {},
    extraData: {}
  };

  // 账号信息（含密码 - 仅本地/游客账号）
  if (_currentUser) {
    data.account = {
      id: _currentUser.id,
      username: _currentUser.username,
      display_name: _currentUser.display_name,
      email: _currentUser.email,
      bio_score: _currentUser.bio_score,
      user_group: _currentUser.user_group,
      isGuest: _currentUser.isGuest || false
    };
    // 游客/本地账号：只导出密码哈希，绝不导出明文
    if (_currentUser.isGuest) {
      try {
        var savedHash = localStorage.getItem('bioquest_guest_pwdhash');
        if (savedHash) {
          data.account.password_hash = savedHash;
          data.account.password_note = '游客模式：仅本地哈希，明文已废弃';
        }
      } catch (e) {}
    }
  }

  // 用户设置 — 全面导出
  try {
    data.settings = {
      theme: localStorage.getItem('bioquest-theme') || 'light',
      fontSize: localStorage.getItem('bioquest-fontSize') || 'medium',
      questionCount: parseInt(localStorage.getItem('bioquest-questionCount')) || 30,
      showTimer: localStorage.getItem('bioquest-showTimer') !== 'false',
      autoSubmit: localStorage.getItem('bioquest-autoSubmit') === 'true'
    };
    // 额外设置项
    var extraKeys = ['bioquest-answerMode', 'bioquest-showExplanation', 'bioquest-soundEnabled', 'bioquest-notificationEnabled'];
    for (var i = 0; i < extraKeys.length; i++) {
      var val = localStorage.getItem(extraKeys[i]);
      if (val !== null) {
        data.settings[extraKeys[i].replace('bioquest-', '')] = val;
      }
    }
  } catch (e) { /* 静默 */ }

  // 错题数据
  try {
    var wrongRaw = localStorage.getItem('bioquest_wrong_questions');
    if (wrongRaw) {
      data.wrongQuestions = JSON.parse(wrongRaw);
      if (!Array.isArray(data.wrongQuestions)) data.wrongQuestions = [];
    }
  } catch (e) { data.wrongQuestions = []; }

  // 收藏数据
  try {
    var favRaw = localStorage.getItem('bioquest_favorites');
    if (favRaw) {
      data.favorites = JSON.parse(favRaw);
      if (!Array.isArray(data.favorites)) data.favorites = [];
    }
  } catch (e) { data.favorites = []; }

  // 练习记录
  try {
    var recRaw = localStorage.getItem('bioquest_practice_records');
    if (recRaw) {
      data.practiceRecords = JSON.parse(recRaw);
      if (!Array.isArray(data.practiceRecords)) data.practiceRecords = [];
    }
  } catch (e) { data.practiceRecords = []; }

  // 旧格式记录合并
  try {
    var recRaw2 = localStorage.getItem('bioquest_records');
    if (recRaw2) {
      var records2 = JSON.parse(recRaw2);
      if (Array.isArray(records2) && records2.length > 0) {
        data.practiceRecords = data.practiceRecords.concat(records2);
      }
    }
  } catch (e) { /* 静默 */ }

  // 成就数据
  try {
    var achRaw = localStorage.getItem('bioquest_achievements');
    if (achRaw) {
      data.achievements = JSON.parse(achRaw);
      if (!Array.isArray(data.achievements)) data.achievements = [];
    }
  } catch (e) { data.achievements = []; }

  // 签到数据
  try {
    var checkRaw = localStorage.getItem('bioquest_checkin');
    if (checkRaw) {
      data.checkInData = JSON.parse(checkRaw);
    }
  } catch (e) { data.checkInData = {}; }

  // 额外数据：考试记录、学习进度、搜索历史、反馈等
  try {
    var extraPrefixes = [
      'bioquest_exam_records', 'bioquest_study_progress', 'bioquest_search_history',
      'bioquest_feedbacks', 'bioquest_guest_session', 'bioquest_device_id',
      'bioquest_card_progress', 'bioquest_daily_streak', 'bioquest_last_practice'
    ];
    for (var j = 0; j < extraPrefixes.length; j++) {
      var key = extraPrefixes[j];
      var val = localStorage.getItem(key);
      if (val !== null) {
        try {
          data.extraData[key.replace('bioquest_', '')] = JSON.parse(val);
        } catch (e2) {
          data.extraData[key.replace('bioquest_', '')] = val;
        }
      }
    }
  } catch (e) { /* 静默 */ }

  return data;
}

/**
 * 导出用户数据为 JSON 字符串并触发下载
 */
function downloadUserData() {
  var data = exportUserData();
  var jsonStr = JSON.stringify(data, null, 2);
  var blob = new Blob([jsonStr], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'bioquest_backup_' + _localDateStr() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast('数据已导出');
}

/**
 * 导入用户数据
 * @param {Object|string} jsonData - JSON 数据对象或字符串
 */
function importUserData(jsonData) {
  try {
    var data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    if (!data || typeof data !== 'object') {
      return { ok: false, error: '数据格式无效' };
    }

    var imported = { settings: false, wrongQuestions: false, favorites: false, practiceRecords: false, achievements: false, checkIn: false, password: false, extra: false };

    // 导入账号密码（游客/本地账号）
    if (data.account && data.account.password && data.account.isGuest) {
      try {
        localStorage.setItem('bioquest_guest_password', data.account.password);
        imported.password = true;
      } catch (e) {}
    }

    // 导入设置
    if (data.settings && typeof data.settings === 'object') {
      if (data.settings.theme) localStorage.setItem('bioquest-theme', data.settings.theme);
      if (data.settings.fontSize) localStorage.setItem('bioquest-fontSize', data.settings.fontSize);
      if (data.settings.questionCount != null) localStorage.setItem('bioquest-questionCount', String(data.settings.questionCount));
      if (data.settings.showTimer != null) localStorage.setItem('bioquest-showTimer', String(data.settings.showTimer));
      if (data.settings.autoSubmit != null) localStorage.setItem('bioquest-autoSubmit', String(data.settings.autoSubmit));
      // 额外设置项
      var extraSettingKeys = ['answerMode', 'showExplanation', 'soundEnabled', 'notificationEnabled'];
      for (var si = 0; si < extraSettingKeys.length; si++) {
        var sk = extraSettingKeys[si];
        if (data.settings[sk] !== undefined) {
          localStorage.setItem('bioquest-' + sk, String(data.settings[sk]));
        }
      }
      imported.settings = true;
      if (typeof restoreSettings === 'function') restoreSettings();
    }

    // 导入错题
    if (Array.isArray(data.wrongQuestions)) {
      localStorage.setItem('bioquest_wrong_questions', JSON.stringify(data.wrongQuestions));
      imported.wrongQuestions = true;
    }

    // 导入收藏
    if (Array.isArray(data.favorites)) {
      localStorage.setItem('bioquest_favorites', JSON.stringify(data.favorites));
      imported.favorites = true;
    }

    // 导入练习记录
    if (Array.isArray(data.practiceRecords)) {
      var existing = [];
      try {
        var existingRaw = localStorage.getItem('bioquest_practice_records');
        if (existingRaw) existing = JSON.parse(existingRaw);
      } catch (e) {}
      var merged = (existing || []).concat(data.practiceRecords);
      localStorage.setItem('bioquest_practice_records', JSON.stringify(merged));
      imported.practiceRecords = true;
    }

    // 导入成就
    if (Array.isArray(data.achievements)) {
      localStorage.setItem('bioquest_achievements', JSON.stringify(data.achievements));
      imported.achievements = true;
    }

    // 导入签到数据
    if (data.checkInData && typeof data.checkInData === 'object') {
      localStorage.setItem('bioquest_checkin', JSON.stringify(data.checkInData));
      imported.checkIn = true;
    }

    // 导入额外数据
    if (data.extraData && typeof data.extraData === 'object') {
      var extraKeys = Object.keys(data.extraData);
      for (var ei = 0; ei < extraKeys.length; ei++) {
        var ek = extraKeys[ei];
        try {
          localStorage.setItem('bioquest_' + ek, typeof data.extraData[ek] === 'string' ? data.extraData[ek] : JSON.stringify(data.extraData[ek]));
        } catch (e) {}
      }
      imported.extra = extraKeys.length > 0;
    }

    var count = Object.values(imported).filter(Boolean).length;
    return { ok: true, imported: imported, count: count };
  } catch (e) {
    return { ok: false, error: '导入失败：' + (e.message || '数据格式错误') };
  }
}

/**
 * 从文件选择器导入 JSON 数据
 */
function importUserDataFromFile() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var result = importUserData(ev.target.result);
      if (result.ok) {
        if (typeof showToast === 'function') {
          showToast('成功导入 ' + result.count + ' 类数据');
        }
      } else {
        if (typeof showToast === 'function') {
          showToast('导入失败：' + (result.error || '未知错误'));
        }
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ===== 复习推送系统（基于错题 + FSRS）=====

/**
 * 答错时记录错题卡片
 */
async function recordWrongAnswer(question) {
  if (!_currentUser || _currentUser.isGuest || !question) return { ok: false };
  var qid = question.id || question.question_id;
  if (!qid) return { ok: false, error: '题目 ID 缺失' };

  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };

  try {
    // ts-fsrs 引擎已加载，直接调用 window.FSRS.schedule（P0-1 已修复）
    var fsrsState = { stability: 0, difficulty: 5, lastReview: 0, repetitions: 0, lapses: 0 };
    fsrsState = window.FSRS.schedule(fsrsState, window.FSRS.RATING.AGAIN, Date.now());

    var { error } = await sb.from('review_cards')
      .upsert({
        user_id: _currentUser.id,
        question_id: String(qid),
        question_text: (question.question_text || question.question || '').substring(0, 300),
        subject: question.subject || '',
        concept: question.concept || '',
        difficulty: question.difficulty || 'medium',
        stability: fsrsState.stability || 0,
        fsrs_difficulty: fsrsState.difficulty || 5,
        last_review: fsrsState.lastReview ? new Date(fsrsState.lastReview).toISOString() : null,
        repetitions: fsrsState.repetitions || 0,
        lapses: fsrsState.lapses || 0,
        due_date: fsrsState.dueDate ? new Date(fsrsState.dueDate).toISOString() : new Date().toISOString()
      }, { onConflict: 'user_id,question_id' });

    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 获取今日到期的复习题目
 */
async function getDueReviewQuestions(limit) {
  if (!_currentUser || _currentUser.isGuest) return [];
  var sb = getSupabase();
  if (!sb) return [];
  try {
    var { data, error } = await sb.from('review_cards')
      .select('*')
      .eq('user_id', _currentUser.id)
      .lte('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(limit || 20);
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

/**
 * 完成一道复习题，更新 FSRS 状态
 * rating: 1=again, 2=hard, 3=good, 4=easy
 */
async function reviewQuestion(questionId, rating) {
  if (!_currentUser || _currentUser.isGuest || !questionId) return { ok: false, error: '参数错误' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };

  try {
    var { data: card, error: fetchError } = await sb.from('review_cards')
      .select('*')
      .eq('user_id', _currentUser.id)
      .eq('question_id', String(questionId))
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!card) return { ok: false, error: '未找到该错题记录' };

    var currentState = {
      stability: card.stability || 0,
      difficulty: card.fsrs_difficulty || 5,
      lastReview: card.last_review ? new Date(card.last_review).getTime() : 0,
      repetitions: card.repetitions || 0,
      lapses: card.lapses || 0
    };

    // ts-fsrs 引擎已加载，直接调用 window.FSRS.schedule（P0-1 已修复）
    var newState = window.FSRS.schedule(currentState, rating, Date.now());

    var { error } = await sb.from('review_cards')
      .update({
        stability: newState.stability,
        fsrs_difficulty: newState.difficulty,
        last_review: newState.lastReview ? new Date(newState.lastReview).toISOString() : new Date().toISOString(),
        repetitions: newState.repetitions,
        lapses: newState.lapses,
        due_date: newState.dueDate ? new Date(newState.dueDate).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', card.id);

    if (error) throw error;

    // 复习成功奖励少量积分
    var delta = await calculateEarnedPoints('practice_milestone');
    if (delta > 0) {
      await adjustUserPoints(delta, '完成错题复习', { source: 'review' });
    }

    return { ok: true, nextDue: newState.dueDate };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ===== 智能错题管理 =====

/**
 * 获取错题本列表
 */
async function getWrongQuestions(options) {
  options = options || {};
  if (!_currentUser || _currentUser.isGuest) return [];
  var sb = getSupabase();
  if (!sb) return [];
  try {
    var query = sb.from('review_cards')
      .select('*')
      .eq('user_id', _currentUser.id)
      .order('created_at', { ascending: false });
    if (options.concept) query = query.eq('concept', options.concept);
    if (options.errorReason) query = query.eq('error_reason', options.errorReason);
    if (options.limit) query = query.limit(options.limit);
    var { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

/**
 * 手动添加错题
 */
async function addWrongQuestion(question) {
  if (!_currentUser || _currentUser.isGuest || !question) return { ok: false, error: '未登录或数据为空' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var fsrsState = { stability: 0, difficulty: 5, lastReview: 0, repetitions: 0, lapses: 0 };
    fsrsState = window.FSRS.schedule(fsrsState, window.FSRS.RATING.AGAIN, Date.now());
    var { data, error } = await sb.from('review_cards')
      .insert({
        user_id: _currentUser.id,
        question_id: question.question_id || 'manual_' + Date.now(),
        question_text: (question.question_text || question.question || '').substring(0, 1000),
        subject: question.subject || '',
        concept: question.concept || '',
        difficulty: question.difficulty || 'medium',
        user_answer: question.user_answer || '',
        correct_answer: question.correct_answer || '',
        analysis: question.analysis || '',
        error_reason: question.error_reason || '',
        textbook_chapter: question.textbook_chapter || '',
        knowledge_graph_nodes: question.knowledge_graph_nodes || [],
        image_url: question.image_url || '',
        source: question.source || 'manual',
        stability: fsrsState.stability || 0,
        fsrs_difficulty: fsrsState.difficulty || 5,
        due_date: fsrsState.dueDate ? new Date(fsrsState.dueDate).toISOString() : new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { ok: true, wrongQuestion: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 更新错题（主要是错误原因、分析、图片等）
 */
async function updateWrongQuestion(id, updates) {
  if (!_currentUser || _currentUser.isGuest || !id) return { ok: false, error: '参数错误' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var allowed = {};
    ['question_text', 'subject', 'concept', 'difficulty', 'user_answer', 'correct_answer',
     'analysis', 'error_reason', 'textbook_chapter', 'knowledge_graph_nodes', 'image_url'].forEach(function(k) {
      if (updates.hasOwnProperty(k)) allowed[k] = updates[k];
    });
    var { error } = await sb.from('review_cards')
      .update(allowed)
      .eq('id', id)
      .eq('user_id', _currentUser.id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 删除错题
 */
async function deleteWrongQuestion(id) {
  if (!_currentUser || _currentUser.isGuest || !id) return { ok: false, error: '参数错误' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var { error } = await sb.from('review_cards')
      .delete()
      .eq('id', id)
      .eq('user_id', _currentUser.id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * AI 分析错题：识别知识点、章节、错误原因、关联知识图谱
 */
async function analyzeWrongQuestionWithAI(questionText, userAnswer, correctAnswer) {
  if (!questionText) return { ok: false, error: '题目内容为空' };
  try {
    // 通过后端代理调用 AI，避免在前端暴露 API Key
    var response = await fetch('/ai-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: questionText,
        user_answer: userAnswer || '',
        correct_answer: correctAnswer || ''
      })
    });
    if (!response.ok) {
      var errBody = await response.json().catch(function() { return {}; });
      throw new Error(errBody.error || ('AI 请求失败: ' + response.status));
    }
    var result = await response.json();
    return { ok: true, analysis: result.analysis };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 根据知识点从题库推送相关练习题
 */
async function getRelatedPracticeQuestions(concepts, limit) {
  if (!concepts || concepts.length === 0) return [];
  var sb = getSupabase();
  if (!sb) return [];
  try {
    var { data, error } = await sb.from('questions')
      .select('*')
      .or(concepts.map(function(c) { return 'concept.ilike.%' + c + '%'; }).join(','))
      .limit(limit || 5);
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

// ===== 用户统计数据（P0-3：Supabase 优先 + localStorage 回退）=====
// 修复 dashboard.js / teacher.js 直接读取 localStorage 的问题：
// 当用户已登录时，所有统计数据优先从 Supabase 读取；未登录或离线时回退到 localStorage。

/**
 * 从 Supabase 读取用户聚合统计（dashboard._getUserStats 的远端实现）
 * 数据源：practice_records（按 module_num 聚合）+ daily_checkins（连续打卡）
 * @returns {Promise<Object|null>} 与 localStorage 'bioquest_stats' 同构的对象，失败返回 null
 */
async function getUserStatsFromSupabase() {
  if (!_currentUser || _currentUser.isGuest) return null;
  var sb = getSupabase();
  if (!sb) return null;
  try {
    // 1. 拉取近 1000 条练习记录做聚合（足够覆盖学期量级）
    var { data: records, error: rErr } = await sb.from('practice_records')
      .select('module_num, is_correct, score, created_at')
      .eq('profile_id', _currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (rErr) throw rErr;
    records = records || [];

    var totalAnswered = records.length;
    var totalCorrect = 0;
    var modules = {};
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var modKey = 'module_' + (r.module_num || 1);
      if (!modules[modKey]) modules[modKey] = { totalAnswered: 0, totalCorrect: 0 };
      modules[modKey].totalAnswered++;
      if (r.is_correct) {
        totalCorrect++;
        modules[modKey].totalCorrect++;
      }
    }

    // 2. 读取连续打卡天数（daily_checkins 按 checkin_date 倒序）
    var streak = 0;
    try {
      var { data: checkins, error: cErr } = await sb.from('daily_checkins')
        .select('checkin_date, streak_count')
        .eq('user_id', _currentUser.id)
        .order('checkin_date', { ascending: false })
        .limit(400);
      if (!cErr && checkins && checkins.length > 0) {
        // 用 streak_count 字段（取最近一条），无字段则按连续日期计算
        if (typeof checkins[0].streak_count === 'number') {
          streak = checkins[0].streak_count;
        } else {
          // 退化：按日期集合计算
          var dateSet = {};
          checkins.forEach(function (c) { dateSet[c.checkin_date] = true; });
          var today = new Date();
          today.setHours(0, 0, 0, 0);
          for (var d = 0; d < 365; d++) {
            var dt = new Date(today);
            dt.setDate(dt.getDate() - d);
            var key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
            if (dateSet[key]) streak++;
            else if (d > 0) break;
          }
        }
      }
    } catch (e) { /* 静默 */ }

    // 3. bio_score 来自 profiles
    var bioScore = (typeof _currentUser.bio_score === 'number') ? _currentUser.bio_score : 0;

    var stats = {
      totalAnswered: totalAnswered,
      totalCorrect: totalCorrect,
      modules: modules,
      streak: streak,
      practiceCount: totalAnswered,
      bioScore: bioScore,
      source: 'supabase',
      syncedAt: Date.now()
    };

    // 写入 localStorage 缓存，便于离线/快速首屏
    try {
      localStorage.setItem('bioquest_stats', JSON.stringify(stats));
    } catch (e) {}

    return stats;
  } catch (e) {
    console.warn('[BioQuest] getUserStatsFromSupabase 失败，回退 localStorage:', e && e.message);
    return null;
  }
}

/**
 * 从 Supabase 读取练习历史（dashboard._loadPracticeHistory 的远端实现）
 * @param {number} [limit=200] - 最大返回条数
 * @returns {Promise<Array|null>} 历史记录数组（与 localStorage 格式兼容），失败返回 null
 */
async function getPracticeHistoryFromSupabase(limit) {
  if (!_currentUser || _currentUser.isGuest) return null;
  var sb = getSupabase();
  if (!sb) return null;
  limit = limit || 200;
  try {
    var { data, error } = await sb.from('practice_records')
      .select('*')
      .eq('profile_id', _currentUser.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    if (!data || data.length === 0) return [];

    // 转换为 dashboard 兼容格式
    return data.map(function (r) {
      var answers = Array.isArray(r.user_answers) ? r.user_answers : [];
      var correct = 0;
      answers.forEach(function (a) { if (a && a.correct) correct++; });
      return {
        date: r.created_at ? r.created_at.slice(0, 10) : null,
        timestamp: r.created_at ? new Date(r.created_at).getTime() : 0,
        correct: typeof r.score === 'number' ? r.score : correct,
        total: answers.length || 1,
        totalQuestions: answers.length || 1,
        correctCount: correct,
        answers: answers,
        module_num: r.module_num,
        subject: r.subject,
        source: 'supabase'
      };
    });
  } catch (e) {
    console.warn('[BioQuest] getPracticeHistoryFromSupabase 失败:', e && e.message);
    return null;
  }
}

/**
 * 从 Supabase 读取打卡日志（dashboard._getStreak 的远端实现）
 * @returns {Promise<Array|null>} 打卡记录数组，失败返回 null
 */
async function getHabitLogsFromSupabase() {
  if (!_currentUser || _currentUser.isGuest) return null;
  var sb = getSupabase();
  if (!sb) return null;
  try {
    var { data, error } = await sb.from('daily_checkins')
      .select('checkin_date, streak_count, created_at')
      .eq('user_id', _currentUser.id)
      .order('checkin_date', { ascending: false })
      .limit(400);
    if (error) throw error;
    if (!data) return [];
    // 转换为 bioquest_habit_logs 兼容格式
    return data.map(function (c) {
      return {
        date: c.checkin_date,
        completed: true,
        streak: c.streak_count || 1,
        timestamp: c.created_at ? new Date(c.created_at).getTime() : 0,
        source: 'supabase'
      };
    });
  } catch (e) {
    console.warn('[BioQuest] getHabitLogsFromSupabase 失败:', e && e.message);
    return null;
  }
}

/**
 * 同步单条练习记录到 Supabase（dual-write：刷题完成时调用）
 * @param {Object} record - 练习记录
 * @param {Array} record.answers - 答题数组
 * @param {number} record.module_num - 模块号 1-4
 * @param {string} [record.subject] - 学科
 * @param {number} [record.score] - 得分
 * @param {number} [record.duration] - 用时（秒）
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function syncPracticeRecordToSupabase(record) {
  if (!_currentUser || _currentUser.isGuest || !record) return { ok: false, error: '未登录或数据为空' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var answers = Array.isArray(record.answers) ? record.answers : [];
    var correctCount = 0;
    answers.forEach(function (a) { if (a && a.correct) correctCount++; });
    var insertData = {
      profile_id: _currentUser.id,
      question_id: record.question_id || (answers[0] && answers[0].question_id) || 0,
      module_num: record.module_num || 1,
      subject: record.subject || '',
      user_answers: answers,
      score: typeof record.score === 'number' ? record.score : correctCount,
      duration: record.duration || 0,
      is_correct: answers.length > 0 ? (correctCount === answers.length) : (record.is_correct || false)
    };
    var { error } = await sb.from('practice_records').insert(insertData);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn('[BioQuest] syncPracticeRecordToSupabase 失败:', e && e.message);
    return { ok: false, error: e && e.message };
  }
}

/**
 * 同步打卡记录到 Supabase（dual-write：习惯完成时调用）
 * 使用 upsert 处理 user_id + checkin_date 唯一约束
 * @param {string} dateStr - 日期 YYYY-MM-DD
 * @param {number} [streakCount] - 连续天数
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function syncHabitLogToSupabase(dateStr, streakCount) {
  if (!_currentUser || _currentUser.isGuest || !dateStr) return { ok: false, error: '未登录或日期为空' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var { error } = await sb.from('daily_checkins')
      .upsert({
        user_id: _currentUser.id,
        checkin_date: dateStr,
        streak_count: streakCount || 1
      }, { onConflict: 'user_id,checkin_date' });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn('[BioQuest] syncHabitLogToSupabase 失败:', e && e.message);
    return { ok: false, error: e && e.message };
  }
}

// ===== P0-3 班级成员关系（修复 teacher.js localStorage 模拟）=====
// 数据表：class_memberships (teacher_id, student_id, student_key, student_name, added_at)
// 配套迁移：sql/migration_v6_class_memberships.sql

/**
 * 从 Supabase 读取当前用户（作为教师）的班级成员列表
 * @returns {Promise<Array|null>} 班级成员数组，失败返回 null
 */
async function getClassMembershipsFromSupabase() {
  if (!_currentUser || _currentUser.isGuest) return null;
  var sb = getSupabase();
  if (!sb) return null;
  try {
    var { data, error } = await sb.from('class_memberships')
      .select('id, student_id, student_key, student_name, added_at')
      .eq('teacher_id', _currentUser.id)
      .order('added_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[BioQuest] getClassMembershipsFromSupabase 失败:', e && e.message);
    return null;
  }
}

/**
 * 添加学生到当前用户的班级（Supabase）
 * @param {Object} student - { student_id?, student_key, student_name }
 * @returns {Promise<{ok: boolean, error?: string, membership?: Object}>}
 */
async function addClassMembershipToSupabase(student) {
  if (!_currentUser || _currentUser.isGuest || !student) return { ok: false, error: '未登录或参数为空' };
  if (!student.student_id && !student.student_key) return { ok: false, error: '缺少 student_id 或 student_key' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var insertData = {
      teacher_id: _currentUser.id,
      student_id: student.student_id || null,
      student_key: student.student_key || null,
      student_name: student.student_name || ''
    };
    var { data, error } = await sb.from('class_memberships')
      .upsert(insertData, { onConflict: student.student_id ? 'teacher_id,student_id' : 'teacher_id,student_key' })
      .select()
      .single();
    if (error) throw error;
    return { ok: true, membership: data };
  } catch (e) {
    console.warn('[BioQuest] addClassMembershipToSupabase 失败:', e && e.message);
    return { ok: false, error: e && e.message };
  }
}

/**
 * 从当前用户的班级中移除学生（Supabase）
 * @param {string} membershipId - class_memberships.id
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function removeClassMembershipFromSupabase(membershipId) {
  if (!_currentUser || _currentUser.isGuest || !membershipId) return { ok: false, error: '参数错误' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var { error } = await sb.from('class_memberships')
      .delete()
      .eq('id', membershipId)
      .eq('teacher_id', _currentUser.id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.warn('[BioQuest] removeClassMembershipFromSupabase 失败:', e && e.message);
    return { ok: false, error: e && e.message };
  }
}

/**
 * 通过学生 user_key 拉取学生的详细学习数据（含练习记录、错题）
 * 用于教师查看学生详情
 * @param {string} userKey - 8 字符 user_key
 * @returns {Promise<Object|null>} 学生详情
 */
async function getStudentDetailByKey(userKey) {
  if (!userKey) return null;
  var sb = getSupabase();
  if (!sb) return null;
  try {
    // 1. 通过 user_key 查 profiles（任何用户都可查 user_key 对应的公开资料）
    var { data: profile, error: pErr } = await sb.from('profiles')
      .select('id, username, display_name, bio_score, practice_count, total_answered, total_correct, accuracy, current_streak, updated_at')
      .eq('user_key', userKey.toUpperCase())
      .maybeSingle();
    if (pErr || !profile) return null;

    // 2. 拉取该学生最近 50 条练习记录（RLS 限制：只有本人能查，这里通过 RPC 或公开视图绕过）
    // 由于 RLS，普通查询会返回空。这里返回基础资料，详细历史需要学生本人授权或通过教师密钥机制
    return {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      total_score: profile.bio_score || 0,
      total_answered: profile.total_answered || 0,
      total_correct: profile.total_correct || 0,
      accuracy: profile.accuracy || 0,
      current_streak: profile.current_streak || 0,
      last_active: profile.updated_at || new Date().toISOString(),
      history: [],   // RLS 限制：教师无法直接读学生练习记录
      wrongQuestions: []  // RLS 限制：教师无法直接读学生错题
    };
  } catch (e) {
    console.warn('[BioQuest] getStudentDetailByKey 失败:', e && e.message);
    return null;
  }
}

// ===== 学习管理工具 =====

/**
 * 学习任务 / 待办
 */
async function getStudyTasks(status) {
  if (!_currentUser || _currentUser.isGuest) return [];
  var sb = getSupabase();
  if (!sb) return [];
  try {
    var query = sb.from('study_tasks')
      .select('*')
      .eq('user_id', _currentUser.id)
      .order('sort_order', { ascending: true })
      .order('due_date', { ascending: true });
    if (status) query = query.eq('status', status);
    var { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

async function addStudyTask(task) {
  if (!_currentUser || _currentUser.isGuest || !task || !task.title) return { ok: false, error: '未登录或标题为空' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var { data, error } = await sb.from('study_tasks')
      .insert({
        user_id: _currentUser.id,
        title: task.title,
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        due_date: task.due_date || null,
        related_module: task.related_module || '',
        related_concepts: task.related_concepts || [],
        parent_task_id: task.parent_task_id || null,
        sort_order: task.sort_order || 0
      })
      .select()
      .single();
    if (error) throw error;
    return { ok: true, task: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function updateStudyTask(id, updates) {
  if (!_currentUser || _currentUser.isGuest || !id) return { ok: false, error: '参数错误' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var allowed = {};
    ['title', 'description', 'priority', 'status', 'due_date', 'related_module', 'related_concepts', 'parent_task_id', 'sort_order'].forEach(function(k) {
      if (updates.hasOwnProperty(k)) allowed[k] = updates[k];
    });
    var { data, error } = await sb.from('study_tasks')
      .update(allowed)
      .eq('id', id)
      .eq('user_id', _currentUser.id)
      .select()
      .single();
    if (error) throw error;
    return { ok: true, task: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function deleteStudyTask(id) {
  if (!_currentUser || _currentUser.isGuest || !id) return { ok: false, error: '参数错误' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var { error } = await sb.from('study_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', _currentUser.id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 专注记录（番茄钟）
 */
async function getFocusSessions(days) {
  if (!_currentUser || _currentUser.isGuest) return [];
  var sb = getSupabase();
  if (!sb) return [];
  try {
    var since = new Date(Date.now() - (days || 7) * 24 * 60 * 60 * 1000).toISOString();
    var { data, error } = await sb.from('focus_sessions')
      .select('*')
      .eq('user_id', _currentUser.id)
      .gte('start_time', since)
      .order('start_time', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

async function addFocusSession(session) {
  if (!_currentUser || _currentUser.isGuest) return { ok: false, error: '未登录' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var { data, error } = await sb.from('focus_sessions')
      .insert({
        user_id: _currentUser.id,
        task_id: session.task_id || null,
        duration: session.duration || 25,
        start_time: session.start_time || new Date().toISOString(),
        end_time: session.end_time || null,
        is_completed: session.is_completed || false,
        note: session.note || ''
      })
      .select()
      .single();
    if (error) throw error;
    return { ok: true, session: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 学习笔记
 */
async function getNotes() {
  if (!_currentUser || _currentUser.isGuest) return [];
  var sb = getSupabase();
  if (!sb) return [];
  try {
    var { data, error } = await sb.from('notes')
      .select('*')
      .eq('user_id', _currentUser.id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

async function addNote(note) {
  if (!_currentUser || _currentUser.isGuest || !note || !note.title) return { ok: false, error: '未登录或标题为空' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var { data, error } = await sb.from('notes')
      .insert({
        user_id: _currentUser.id,
        title: note.title,
        content: note.content || '',
        related_concepts: note.related_concepts || [],
        related_module: note.related_module || '',
        tags: note.tags || [],
        is_pinned: note.is_pinned || false
      })
      .select()
      .single();
    if (error) throw error;
    return { ok: true, note: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function updateNote(id, updates) {
  if (!_currentUser || _currentUser.isGuest || !id) return { ok: false, error: '参数错误' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var allowed = {};
    ['title', 'content', 'related_concepts', 'related_module', 'tags', 'is_pinned'].forEach(function(k) {
      if (updates.hasOwnProperty(k)) allowed[k] = updates[k];
    });
    var { data, error } = await sb.from('notes')
      .update(allowed)
      .eq('id', id)
      .eq('user_id', _currentUser.id)
      .select()
      .single();
    if (error) throw error;
    return { ok: true, note: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function deleteNote(id) {
  if (!_currentUser || _currentUser.isGuest || !id) return { ok: false, error: '参数错误' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var { error } = await sb.from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', _currentUser.id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 课程表
 */
async function getSchedule() {
  if (!_currentUser || _currentUser.isGuest) return { ok: false, error: '未登录' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var { data: schedule, error: sErr } = await sb.from('schedules')
      .select('*')
      .eq('user_id', _currentUser.id)
      .eq('is_default', true)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!schedule) {
      var { data: newSchedule, error: nsErr } = await sb.from('schedules')
        .insert({ user_id: _currentUser.id, name: '我的课程表', is_default: true })
        .select()
        .single();
      if (nsErr) throw nsErr;
      schedule = newSchedule;
    }
    var { data: items, error: iErr } = await sb.from('schedule_items')
      .select('*')
      .eq('schedule_id', schedule.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    if (iErr) throw iErr;
    return { ok: true, schedule: schedule, items: items || [] };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function saveScheduleItem(item) {
  if (!_currentUser || _currentUser.isGuest || !item) return { ok: false, error: '未登录或数据为空' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var scheduleRes = await getSchedule();
    if (!scheduleRes.ok) throw new Error(scheduleRes.error);
    var scheduleId = scheduleRes.schedule.id;
    var payload = {
      schedule_id: scheduleId,
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time,
      subject: item.subject,
      location: item.location || '',
      teacher: item.teacher || '',
      color: item.color || '#5a7d5c',
      sort_order: item.sort_order || 0
    };
    var result;
    if (item.id) {
      result = await sb.from('schedule_items')
        .update(payload)
        .eq('id', item.id)
        .select()
        .single();
    } else {
      result = await sb.from('schedule_items')
        .insert(payload)
        .select()
        .single();
    }
    if (result.error) throw result.error;
    return { ok: true, item: result.data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function deleteScheduleItem(id) {
  if (!_currentUser || _currentUser.isGuest || !id) return { ok: false, error: '参数错误' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var { error } = await sb.from('schedule_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ===== 问答悬赏系统 =====

/**
 * 发布悬赏
 */
async function createBounty(title, content, pointsReward, tags, expiresDays) {
  if (!_currentUser || _currentUser.isGuest) return { ok: false, error: '未登录' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };

  var reward = parseInt(pointsReward, 10);
  if (isNaN(reward) || reward < 5) return { ok: false, error: '悬赏积分不能少于 5' };

  try {
    // 检查积分并扣除
    var crInfo = await getUserPoints();
    if (crInfo.points < reward) {
      return { ok: false, error: '积分不足，无法发布悬赏' };
    }
    var costResult = await adjustUserPoints(-reward, '发布问答悬赏消耗积分：' + title, { source: 'bounty_create' });
    if (!costResult || !costResult.ok) {
      return { ok: false, error: '扣除积分失败' };
    }

    var expiresAt = null;
    if (expiresDays && expiresDays > 0) {
      expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();
    }

    var { data, error } = await sb.from('q_bounties')
      .insert({
        user_id: _currentUser.id,
        title: title,
        content: content,
        tags: tags || [],
        points_reward: reward,
        extra_points: 0,
        status: 'open',
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) throw error;
    return { ok: true, bounty: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 获取悬赏列表
 */
async function getBounties(status, limit) {
  var sb = getSupabase();
  if (!sb) return [];
  try {
    var query = sb.from('q_bounties')
      .select('*, profiles:user_id(username, display_name)')
      .order('created_at', { ascending: false })
      .limit(limit || 50);
    if (status) query = query.eq('status', status);
    var { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

/**
 * 获取悬赏详情（含回答）
 */
async function getBountyDetail(bountyId) {
  if (!bountyId) return null;
  var sb = getSupabase();
  if (!sb) return null;
  try {
    var { data: bounty, error: bError } = await sb.from('q_bounties')
      .select('*, profiles:user_id(username, display_name)')
      .eq('id', bountyId)
      .maybeSingle();
    if (bError) throw bError;
    if (!bounty) return null;

    var { data: answers, error: aError } = await sb.from('q_bounty_answers')
      .select('*, profiles:user_id(username, display_name)')
      .eq('bounty_id', bountyId)
      .order('created_at', { ascending: true });
    if (aError) throw aError;

    return { ...bounty, answers: answers || [] };
  } catch (e) {
    return null;
  }
}

/**
 * 回答悬赏
 */
async function createBountyAnswer(bountyId, content) {
  if (!_currentUser || _currentUser.isGuest) return { ok: false, error: '未登录' };
  if (!bountyId || !content || !content.trim()) return { ok: false, error: '参数错误' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };

  try {
    var { data: bounty, error: fError } = await sb.from('q_bounties')
      .select('id, user_id, status, answer_count')
      .eq('id', bountyId)
      .single();
    if (fError) throw fError;
    if (!bounty || bounty.status !== 'open') return { ok: false, error: '悬赏已结束或不存在' };
    if (bounty.user_id === _currentUser.id) return { ok: false, error: '不能回答自己的悬赏' };

    var { data, error } = await sb.from('q_bounty_answers')
      .insert({
        bounty_id: bountyId,
        user_id: _currentUser.id,
        content: content.trim()
      })
      .select()
      .single();
    if (error) throw error;

    // 更新回答数
    await sb.from('q_bounties')
      .update({ answer_count: (bounty.answer_count || 0) + 1 })
      .eq('id', bountyId);

    return { ok: true, answer: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 采纳悬赏回答
 */
async function acceptBountyAnswer(bountyId, answerId) {
  if (!_currentUser || _currentUser.isGuest) return { ok: false, error: '未登录' };
  if (!bountyId || !answerId) return { ok: false, error: '参数错误' };
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };

  try {
    var { data: bounty, error: bError } = await sb.from('q_bounties')
      .select('id, user_id, points_reward, extra_points, status')
      .eq('id', bountyId)
      .single();
    if (bError) throw bError;
    if (!bounty) return { ok: false, error: '悬赏不存在' };
    if (bounty.user_id !== _currentUser.id) return { ok: false, error: '只有悬赏发布者可以采纳' };
    if (bounty.status !== 'open') return { ok: false, error: '悬赏已结束' };

    var { data: answer, error: aError } = await sb.from('q_bounty_answers')
      .select('id, user_id, is_accepted')
      .eq('id', answerId)
      .eq('bounty_id', bountyId)
      .single();
    if (aError) throw aError;
    if (!answer) return { ok: false, error: '回答不存在' };
    if (answer.is_accepted) return { ok: false, error: '该回答已被采纳' };

    var totalReward = (bounty.points_reward || 0) + (bounty.extra_points || 0);

    // 转给回答者
    if (totalReward > 0) {
      var rewardResult = await adjustUserPoints(totalReward, '悬赏回答被采纳：' + bounty.title, { userId: answer.user_id, source: 'bounty_reward' });
      if (!rewardResult || !rewardResult.ok) {
        return { ok: false, error: '奖励发放失败' };
      }
    }

    // 更新悬赏状态
    var { error: uError } = await sb.from('q_bounties')
      .update({ status: 'answered', accepted_answer_id: answerId })
      .eq('id', bountyId);
    if (uError) throw uError;

    // 标记回答为已采纳
    await sb.from('q_bounty_answers')
      .update({ is_accepted: true })
      .eq('id', answerId);

    // 悬赏发布者和回答者都获得额外积分奖励
    var bonusDelta = await calculateEarnedPoints('valid_report');
    if (bonusDelta > 0) {
      await adjustUserPoints(bonusDelta, '成功发布悬赏', { userId: bounty.user_id, source: 'bounty_bonus' });
      await adjustUserPoints(bonusDelta, '优质悬赏回答', { userId: answer.user_id, source: 'bounty_bonus' });
    }

    return { ok: true, reward: totalReward };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// 暴露到全局
window.getSupabase = getSupabase;
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.guestLogin = guestLogin;
window.guestLoginWithPassword = guestLoginWithPassword;
window.restoreGuestSession = restoreGuestSession;
window.logoutUser = logoutUser;
window.restoreSession = restoreSession;
window.resendConfirmationEmail = resendConfirmationEmail;
window.resetPassword = resetPassword;
window.resetPasswordByKey = resetPasswordByKey;
window.recoverUserKey = recoverUserKey;
window.getUserKeyForCurrentUser = getUserKeyForCurrentUser;
window.sbSelect = sbSelect;
window.sbInsert = sbInsert;
window.sbUpdate = sbUpdate;
window.sbDelete = sbDelete;
window.updateBioScore = updateBioScore;
window.getLeaderboard = getLeaderboard;

/**
 * 通过用户密钥查询学生资料（供教师添加学生用）
 * 前提：profiles 表需有 user_key 字段（8 位字母数字）
 * 返回 { id, username, display_name, bio_score, total_answered, accuracy, current_streak, last_active } 或 null
 */
async function getStudentByKey(userKey) {
  if (!userKey) return null;
  var sb = getSupabase();
  if (!sb) return null;
  try {
    var key = userKey.toUpperCase();
    var { data, error } = await sb.from('profiles')
      .select('id, username, display_name, bio_score, practice_count, total_answered, total_correct, accuracy, current_streak, updated_at')
      .eq('user_key', key)
      .limit(1);
    if (error || !data || data.length === 0) return null;
    var p = data[0];
    return {
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      total_score: p.bio_score || 0,
      total_answered: p.total_answered || 0,
      accuracy: p.accuracy || 0,
      current_streak: p.current_streak || 0,
      last_active: p.updated_at || new Date().toISOString()
    };
  } catch (e) {
    console.warn('[BioQuest] getStudentByKey 查询失败:', e);
    return null;
  }
}
window.getStudentByKey = getStudentByKey;

/**
 * 保存当前用户的 user_key 到 profiles 表（若尚未保存）
 * 在用户登录后自动调用，确保教师能通过密钥查到该学生
 */
async function saveUserKeyIfNeeded() {
  if (typeof window._getUserKey !== 'function') return;
  var key = window._getUserKey();
  var sb = getSupabase();
  if (!sb) return;
  try {
    var { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    // 先查询是否已保存 user_key
    var { data } = await sb.from('profiles')
      .select('user_key')
      .eq('id', user.id)
      .limit(1);
    if (data && data.length > 0 && data[0].user_key === key) return; // 已保存
    // 更新 user_key
    await sb.from('profiles')
      .update({ user_key: key })
      .eq('id', user.id);
  } catch (e) {
    console.warn('[BioQuest] saveUserKeyIfNeeded 失败:', e);
  }
}
window.saveUserKeyIfNeeded = saveUserKeyIfNeeded;
window.checkAchievement = checkAchievement;
window.getUserAchievements = getUserAchievements;
window.getAllAchievements = getAllAchievements;
window.getAchievementTiers = getAchievementTiers;
window.getAchievementCategories = getAchievementCategories;
window.recordDailyCheckIn = recordDailyCheckIn;
window.getCheckInData = getCheckInData;
window.getUserPoints = getUserPoints;
window.adjustUserPoints = adjustUserPoints;
window.getPointsLevel = getPointsLevel;
window.isUncivilContent = isUncivilContent;
window.getBehaviorCount = getBehaviorCount;
window.calculateEarnedPoints = calculateEarnedPoints;
window.canPerformAction = canPerformAction;
window.syncPointsToCloud = syncPointsToCloud;
window.getPointsLeaderboard = getPointsLeaderboard;
window.createCRAppeal = createCRAppeal;
window.updateCRAppeal = updateCRAppeal;
window.getUserPointsAppeals = getUserPointsAppeals;
window.getPendingCRAppeals = getPendingCRAppeals;
window.resolveCRAppeal = resolveCRAppeal;
window.startOnlineTimeTracking = startOnlineTimeTracking;
window.exportUserData = exportUserData;
window.downloadUserData = downloadUserData;
window.importUserData = importUserData;
window.importUserDataFromFile = importUserDataFromFile;

// ===== 公告系统 =====

/**
 * 获取公告列表
 * @param {Object} [options] - { onlyActive: true, limit: 10 }
 */
async function getAnnouncements(options) {
  var opts = options || {};
  var sb = getSupabase();
  if (!sb) {
    // 降级到 localStorage
    try {
      var raw = localStorage.getItem('bioquest_announcements');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  try {
    var query = sb.from('announcements').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    if (opts.onlyActive !== false) {
      query = query.eq('is_active', true);
    }
    if (opts.limit) {
      query = query.limit(opts.limit);
    }
    var { data, error } = await query;
    if (error) {
      console.warn('[BioQuest] 获取公告失败:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('[BioQuest] 获取公告异常:', e && e.message);
    return [];
  }
}

/**
 * 创建公告（管理员）
 */
async function createAnnouncement(title, content, isPinned) {
  var sb = getSupabase();
  if (!sb) return { ok: false, error: '未连接数据库' };
  try {
    var { data, error } = await sb.from('announcements').insert({
      title: title,
      content: content,
      is_pinned: !!isPinned,
      is_active: true
    }).select().single();
    if (error) return { ok: false, error: parseAnnouncementError(error) };
    return { ok: true, data: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 更新公告（管理员）
 */
async function updateAnnouncement(id, updates) {
  var sb = getSupabase();
  if (!sb) return { ok: false, error: '未连接数据库' };
  try {
    updates.updated_at = new Date().toISOString();
    var { data, error } = await sb.from('announcements').update(updates).eq('id', id).select().single();
    if (error) return { ok: false, error: parseAnnouncementError(error) };
    return { ok: true, data: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 删除公告（管理员）
 */
async function deleteAnnouncement(id) {
  var sb = getSupabase();
  if (!sb) return { ok: false, error: '未连接数据库' };
  try {
    var numericId = Number(id);
    var { error } = await sb.from('announcements').delete().eq('id', numericId);
    if (error) return { ok: false, error: parseAnnouncementError(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function parseAnnouncementError(error) {
  var msg = error.message || '未知错误';
  if (msg.includes('permission') || msg.includes('policy')) return '权限不足，仅管理员可操作';
  if (msg.includes('duplicate')) return '公告已存在';
  return msg;
}

window.getAnnouncements = getAnnouncements;
window.createAnnouncement = createAnnouncement;
window.updateAnnouncement = updateAnnouncement;
window.deleteAnnouncement = deleteAnnouncement;

// 复习推送
window.recordWrongAnswer = recordWrongAnswer;
window.getDueReviewQuestions = getDueReviewQuestions;
window.reviewQuestion = reviewQuestion;

// 问答悬赏
window.createBounty = createBounty;
window.getBounties = getBounties;
window.getBountyDetail = getBountyDetail;
window.createBountyAnswer = createBountyAnswer;
window.acceptBountyAnswer = acceptBountyAnswer;

// 智能错题管理
window.getWrongQuestions = getWrongQuestions;
window.addWrongQuestion = addWrongQuestion;
window.updateWrongQuestion = updateWrongQuestion;
window.deleteWrongQuestion = deleteWrongQuestion;
window.analyzeWrongQuestionWithAI = analyzeWrongQuestionWithAI;
window.getRelatedPracticeQuestions = getRelatedPracticeQuestions;

// 瀛︿範绠＄悊宸ュ叿
window.getStudyTasks = getStudyTasks;
window.addStudyTask = addStudyTask;
window.updateStudyTask = updateStudyTask;
window.deleteStudyTask = deleteStudyTask;
window.getFocusSessions = getFocusSessions;
window.addFocusSession = addFocusSession;
window.getNotes = getNotes;
window.addNote = addNote;
window.updateNote = updateNote;
window.deleteNote = deleteNote;
window.getSchedule = getSchedule;
window.saveScheduleItem = saveScheduleItem;
window.deleteScheduleItem = deleteScheduleItem;

// P0-3 user stats (Supabase-first + localStorage fallback)
window.getUserStatsFromSupabase = getUserStatsFromSupabase;
window.getPracticeHistoryFromSupabase = getPracticeHistoryFromSupabase;
window.getHabitLogsFromSupabase = getHabitLogsFromSupabase;
window.syncPracticeRecordToSupabase = syncPracticeRecordToSupabase;
window.syncHabitLogToSupabase = syncHabitLogToSupabase;

// P0-3 class memberships (replaces teacher.js localStorage)
window.getClassMembershipsFromSupabase = getClassMembershipsFromSupabase;
window.addClassMembershipToSupabase = addClassMembershipToSupabase;
window.removeClassMembershipFromSupabase = removeClassMembershipFromSupabase;
window.getStudentDetailByKey = getStudentDetailByKey;

// ============================================================
// v4.0 AI 对话持久化（ai_conversations + ai_messages 表）
// ============================================================

/**
 * 保存（upsert）AI 对话
 * @param {Object} conv - { id, type, title, metadata }
 * @returns {Promise<{ok:boolean, id?:string, error?:string}>}
 */
async function saveAIConversation(conv) {
  if (!_currentUser || _currentUser.isGuest || !conv) {
    return { ok: false, error: '未登录或游客模式' };
  }
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var convId = conv.id || ('conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
    var upsertData = {
      id: convId,
      user_id: _currentUser.id,
      type: conv.type || 'tutor', // tutor | classmate | classroom
      title: conv.title || '未命名对话',
      metadata: conv.metadata || {},
      updated_at: new Date().toISOString()
    };
    var result = await sb.from('ai_conversations').upsert(upsertData, { onConflict: 'id' }).select('id').single();
    if (result.error) throw result.error;
    return { ok: true, id: convId };
  } catch (e) {
    console.warn('[BioQuest] saveAIConversation 失败:', e && e.message);
    return { ok: false, error: e && e.message };
  }
}

/**
 * 保存单条 AI 消息
 * @param {Object} msg - { conversation_id, role, content, metadata }
 */
async function saveAIMessage(msg) {
  if (!_currentUser || _currentUser.isGuest || !msg || !msg.conversation_id) {
    return { ok: false, error: '参数不完整' };
  }
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    var insertData = {
      conversation_id: msg.conversation_id,
      role: msg.role || 'user', // user | assistant | system
      content: msg.content || '',
      metadata: msg.metadata || {},
      created_at: new Date().toISOString()
    };
    var result = await sb.from('ai_messages').insert(insertData);
    if (result.error) throw result.error;
    return { ok: true };
  } catch (e) {
    console.warn('[BioQuest] saveAIMessage 失败:', e && e.message);
    return { ok: false, error: e && e.message };
  }
}

/**
 * 获取当前用户的 AI 对话列表
 * @param {string} [type] - 可选类型过滤
 * @param {number} [limit=20]
 */
async function getAIConversations(type, limit) {
  if (!_currentUser || _currentUser.isGuest) return [];
  var sb = getSupabase();
  if (!sb) return [];
  try {
    var query = sb.from('ai_conversations')
      .select('id, type, title, metadata, created_at, updated_at')
      .eq('user_id', _currentUser.id)
      .order('updated_at', { ascending: false })
      .limit(limit || 20);
    if (type) query = query.eq('type', type);
    var result = await query;
    if (result.error) throw result.error;
    return result.data || [];
  } catch (e) {
    console.warn('[BioQuest] getAIConversations 失败:', e && e.message);
    return [];
  }
}

/**
 * 获取某个对话的所有消息
 * @param {string} conversationId
 */
async function getAIMessages(conversationId) {
  if (!conversationId) return [];
  var sb = getSupabase();
  if (!sb) return [];
  try {
    var result = await sb.from('ai_messages')
      .select('id, role, content, metadata, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (result.error) throw result.error;
    return result.data || [];
  } catch (e) {
    console.warn('[BioQuest] getAIMessages 失败:', e && e.message);
    return [];
  }
}

/**
 * 删除对话（同时删除其所有消息）
 * @param {string} conversationId
 */
async function deleteAIConversation(conversationId) {
  if (!_currentUser || _currentUser.isGuest || !conversationId) {
    return { ok: false, error: '参数不完整' };
  }
  var sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未初始化' };
  try {
    // 先删消息，再删对话
    var r1 = await sb.from('ai_messages').delete().eq('conversation_id', conversationId);
    if (r1.error) throw r1.error;
    var r2 = await sb.from('ai_conversations').delete().eq('id', conversationId).eq('user_id', _currentUser.id);
    if (r2.error) throw r2.error;
    return { ok: true };
  } catch (e) {
    console.warn('[BioQuest] deleteAIConversation 失败:', e && e.message);
    return { ok: false, error: e && e.message };
  }
}

window.saveAIConversation = saveAIConversation;
window.saveAIMessage = saveAIMessage;
window.getAIConversations = getAIConversations;
window.getAIMessages = getAIMessages;
window.deleteAIConversation = deleteAIConversation;
