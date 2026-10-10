

/** 当前排行榜 tab */
var _currentLbTab = 'bio';

/** 排行榜自动刷新定时器（弹窗打开期间每 8s 静默刷新，保证实时性） */
var _lbAutoRefreshTimer = null;

window.showLeaderboard = showLeaderboard;

window.switchLbTab = switchLbTab;


/**
 * 加载排行榜数据
 */
async function loadLbData(tabName) {
  var listEl = document.getElementById('lb-list') || document.querySelector('.lb-body');
  if (!listEl) return;

  listEl.innerHTML = '<div class="bq-empty-note">加载中...</div>';

  // 排行榜是公开数据，游客也可查看（仅未登录时不显示"我的排名"）
  try {
    var items = [];
    if (typeof window.getLeaderboard === 'function') {
      // 打开/切换时始终拿到最新数据（清掉可能导致"死数据"的缓存）
      if (typeof window.invalidateLeaderboardCache === 'function') {
        window.invalidateLeaderboardCache();
      }
      items = await window.getLeaderboard(tabName, 20);
    }

    if (items && items.length > 0) {
      var loggedIn = (typeof window.isLoggedIn === 'function' && window.isLoggedIn());
      var myRank = loggedIn ? items._myRank : null;
      var html = renderLbItems(items, tabName);
      if (myRank) html += renderMyRank(myRank);
      else if (!loggedIn) {
        html += '<div style="text-align:center;color:#6b7f74;padding:16px 12px;margin-top:12px;border-radius:12px;background:rgba(58,140,92,0.04);font-size:0.82rem;">登录后查看你的排名</div>';
      }
      listEl.innerHTML = html;
    } else if (items && items._error) {
      // 查询失败：给出可感知的错误提示而非"暂无排行数据"
      listEl.innerHTML = '<div style="text-align:center;color:var(--color-error,#c0553a);padding:40px 20px;">' +
        '<div style="font-size:0.95rem;margin-bottom:8px;">排行榜加载失败</div>' +
        '<div style="font-size:0.78rem;color:#8a8a8a;">' + escapeHtml(items._error) + '</div>' +
        '<button data-on=\'["_cspReload"]\' style="margin-top:14px;padding:7px 20px;background:var(--color-sage);color:#fff;border:none;border-radius:16px;font-size:0.82rem;cursor:pointer;">重新加载</button>' +
        '</div>';
    } else {
      // Issue #125：统一「温暖空状态」组件（加载失败时回退原有提示）
      if (window.BioQuest && typeof window.BioQuest.renderEmptyState === 'function') {
        window.BioQuest.renderEmptyState(listEl, {
          title: '暂无排行数据',
          hint: '完成练习后即可上榜'
        });
      } else {
        listEl.innerHTML = '<div class="bq-empty-note">暂无排行数据<br><span style="font-size:0.78rem;color:#8a8a8a;">完成练习后即可上榜</span></div>';
      }
    }
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = '<div class="bq-empty-note">排行榜数据暂不可用<br><span style="font-size:0.78rem;color:#8a8a8a;">' + (err && err.message ? err.message : '请稍后重试') + '</span></div>';
    }
  }
}


/**
 * 渲染排行榜列表项（无 emoji）
 */
function renderLbItems(items, tabName) {
  var scoreLabel = '';
  if (tabName === 'bio') {
    scoreLabel = 'Bio分';
  } else if (tabName === 'practice') {
    scoreLabel = '练习题数';
  } else if (tabName === 'checkin') {
    scoreLabel = '签到天数';
  } else {
    scoreLabel = '分数';
  }

  var html = '<div class="lb-table-header">' +
    '<span class="lb-col-rank">#</span>' +
    '<span class="lb-col-name">用户</span>' +
    '<span class="lb-col-score">' + scoreLabel + '</span>';
  if (tabName === 'bio' || tabName === 'checkin') {
    html += '<span class="lb-col-grade">等级</span>';
  }
  html += '</div>';

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var rankClass = '';
    if (i === 0) rankClass = 'leaderboard-rank-1';
    else if (i === 1) rankClass = 'leaderboard-rank-2';
    else if (i === 2) rankClass = 'leaderboard-rank-3';

    var displayScore = '';
    if (tabName === 'practice') {
      displayScore = String(item.total_answered || item.practice_count || 0);
    } else if (tabName === 'checkin') {
      displayScore = String(item.current_streak || 0);
    } else {
      displayScore = String(item.bio_score || 0);
    }

    html += '<div class="leaderboard-item">' +
      '<span class="leaderboard-rank ' + rankClass + '">' + (item.rank || i + 1) + '</span>' +
      '<span class="leaderboard-name">' + escapeHtml(item.display_name || item.username || '匿名用户') + '</span>' +
      '<span class="leaderboard-score">' + displayScore + '</span>';
    if (tabName === 'bio' || tabName === 'checkin') {
      html += '<span class="leaderboard-grade">' + (item.grade || '-') + '</span>';
    }
    html += '</div>';
  }

  return html;
}


/**
 * 关闭排行榜弹窗
 */
function closeLeaderboard() {
  var modal = document.getElementById('leaderboard-modal');
  if (modal) modal.classList.remove('visible');
  // 关闭时停止定时刷新，避免无谓的循环拉取
  if (_lbAutoRefreshTimer) { clearInterval(_lbAutoRefreshTimer); _lbAutoRefreshTimer = null; }
}


/**
 * 渲染"我的位置"信息条
 */
function renderMyRank(rank) {
  return '<div style="text-align:center;padding:12px 20px;margin-top:16px;background:rgba(58,140,92,0.1);border-radius:8px;border:1px solid rgba(58,140,92,0.15);font-size:0.9rem;color:var(--color-sage,#3a8c5c);">' +
    '我的位置: <strong style="font-size:1.1rem;">#' + rank + '</strong>' +
  '</div>';
}


function renderLeaderboardPage(target) {
  target.innerHTML = '<div class="lb-page-container">' +
    '<div class="lb-page-header">' +
      '<h2 class="lb-page-title">排行榜</h2>' +
      '<div class="lb-tabs" id="lb-page-tabs">' +
        '<button class="lb-tab active" id="lb-page-tab-bio" data-on=\'["switchLbPageTab","bio"]\'>Bio 分</button>' +
        '<button class="lb-tab" id="lb-page-tab-practice" data-on=\'["switchLbPageTab","practice"]\'>练习量</button>' +
        '<button class="lb-tab" id="lb-page-tab-checkin" data-on=\'["switchLbPageTab","checkin"]\'>签到</button>' +
      '</div>' +
    '</div>' +
    '<div class="lb-page-body" id="lb-page-list">' +
      '<div class="bq-empty-note">加载中...</div>' +
    '</div>' +
  '</div>';

  _currentLbTab = 'bio';
  loadLbPageData('bio');
}


var _currentLbPageTab = 'bio';


async function switchLbPageTab(tabName) {
  if (!tabName) return;
  _currentLbPageTab = tabName;

  var tabs = ['bio', 'practice', 'checkin'];
  for (var i = 0; i < tabs.length; i++) {
    var btn = document.getElementById('lb-page-tab-' + tabs[i]);
    if (btn) btn.classList.toggle('active', tabs[i] === tabName);
  }

  await loadLbPageData(tabName);
}


async function loadLbPageData(tabName) {
  var listEl = document.getElementById('lb-page-list');
  if (!listEl) return;

  listEl.innerHTML = '<div class="bq-empty-note">加载中...</div>';

  // 排行榜是公开数据，游客也可查看（仅未登录时不显示"我的排名"）
  try {
    var items = [];
    if (typeof window.getLeaderboard === 'function') {
      // 进入/切换页面时清缓存，保证展示的是最新数据（实时更新，非死数据）
      if (typeof window.invalidateLeaderboardCache === 'function') {
        window.invalidateLeaderboardCache();
      }
      items = await window.getLeaderboard(tabName, 20);
    }

    if (items && items.length > 0) {
      var myRank = (typeof window.isLoggedIn === 'function' && window.isLoggedIn()) ? items._myRank : null;
      var html = renderLbItems(items, tabName);
      if (myRank) html += renderMyRank(myRank);
      else if (typeof window.isLoggedIn !== 'function' || !window.isLoggedIn()) {
        // 游客提示登录后可见自己的排名
        html += '<div style="text-align:center;color:#6b7f74;padding:20px 12px;margin-top:12px;border-radius:12px;background:rgba(58,140,92,0.04);"><span style="font-size:0.84rem;">登录后查看你的排名</span> <button data-on=\'["_cspShowAuth"]\' style="margin-left:8px;padding:4px 14px;border:none;border-radius:12px;background:var(--color-sage,#5a7d5c);color:#fff;font-size:0.78rem;cursor:pointer;">登录</button></div>';
      }
      listEl.innerHTML = html;
    } else if (items && items._error) {
      // 查询失败：可感知的错误提示，而非误导性的"暂无排行数据"
      listEl.innerHTML = '<div style="text-align:center;color:var(--color-error,#c0553a);padding:40px 20px;">' +
        '<div style="font-size:0.95rem;margin-bottom:8px;">排行榜加载失败</div>' +
        '<div style="font-size:0.78rem;color:#8a8a8a;">' + escapeHtml(items._error) + '</div>' +
        '<button data-on=\'["_cspReload"]\' style="margin-top:14px;padding:7px 20px;background:var(--color-sage);color:#fff;border:none;border-radius:16px;font-size:0.82rem;cursor:pointer;">重新加载</button>' +
        '</div>';
    } else {
      // Issue #125：统一「温暖空状态」组件（加载失败时回退原有提示）
      if (window.BioQuest && typeof window.BioQuest.renderEmptyState === 'function') {
        window.BioQuest.renderEmptyState(listEl, {
          title: '暂无排行数据',
          hint: '完成练习后即可上榜'
        });
      } else {
        listEl.innerHTML = '<div class="bq-empty-note">暂无排行数据<br><span style="font-size:0.78rem;color:#8a8a8a;">完成练习后即可上榜</span></div>';
      }
    }
  } catch (err) {
    listEl.innerHTML = '<div class="bq-empty-note">排行榜数据暂不可用<br><span style="font-size:0.78rem;color:#8a8a8a;">' + (err && err.message ? err.message : '请稍后重试') + '</span></div>';
  }
}


/**
 * 显示排行榜弹窗（三 tab 版本：Bio 分 / 练习量 / 正确率）
 */
async function showLeaderboard() {
  // 关闭移动端菜单
  if (typeof closeMobileMenu === 'function') closeMobileMenu();

  var existing = document.getElementById('leaderboard-modal');
  if (existing) {
    existing.classList.add('visible');
    return;
  }

  var overlay = document.createElement('div');
  overlay.id = 'leaderboard-modal';
  overlay.className = 'leaderboard-overlay';
  overlay.innerHTML = `
    <div class="leaderboard-box">
      <button class="lb-close" data-on='["closeLeaderboard"]'>&times;</button>
      <div class="lb-header">
        <div class="lb-title">排行榜</div>
        <div class="lb-tabs">
          <button class="lb-tab active" id="lb-tab-bio" data-on='["switchLbTab","bio"]'>Bio 分</button>
          <button class="lb-tab" id="lb-tab-practice" data-on='["switchLbTab","practice"]'>练习量</button>
          <button class="lb-tab" id="lb-tab-checkin" data-on='["switchLbTab","checkin"]'>签到</button>
        </div>
      </div>
      <div class="lb-body" id="lb-list">
        <div class="lb-loading">加载中...</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeLeaderboard();
  });

  setTimeout(function() { overlay.classList.add('visible'); }, 10);

  _currentLbTab = 'bio';
  await loadLbData('bio');

  // 实时性：弹窗打开期间每 8s 自动刷新当前 tab，分数变动后排行榜即时可见
  if (_lbAutoRefreshTimer) clearInterval(_lbAutoRefreshTimer);
  _lbAutoRefreshTimer = setInterval(function () {
    var modal = document.getElementById('leaderboard-modal');
    if (!modal || modal.style.display === 'none' || !modal.classList.contains('visible')) return;
    loadLbData(_currentLbTab);
  }, 8000);
}


/**
 * 切换排行榜 tab
 * 同 tab 点击也强制刷新（此前直接 return，用户无法手动刷新，榜单表现"死"）
 */
async function switchLbTab(tabName) {
  if (!tabName) return;
  _currentLbTab = tabName;

  var tabs = ['bio', 'practice', 'checkin'];
  for (var i = 0; i < tabs.length; i++) {
    var btn = document.getElementById('lb-tab-' + tabs[i]);
    if (btn) btn.classList.toggle('active', tabs[i] === tabName);
  }

  await loadLbData(tabName);
}

window.closeLeaderboard = closeLeaderboard;


window.renderLeaderboardPage = renderLeaderboardPage;

window.switchLbPageTab = switchLbPageTab;
