/**
 * ============================================================
 * BioQuest — 积分商城 & 积分排行榜
 * 依赖：user.js（getPoints/getPointsDetail/getPointsLevel/deductPoints）
 *       supabase-client.js（getPointsLeaderboard/getUserPoints/syncPointsToCloud）
 * ============================================================
 */
(function (root) {
  'use strict';

  var escapeHtml = (typeof root.escapeHtml === 'function')
    ? root.escapeHtml
    : function (s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      };

  function toast(msg) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--color-deep,#1a3a2a);color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;z-index:10000;box-shadow:var(--shadow-lg);max-width:90%;text-align:center;animation:slideUp .3s ease';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2500);
  }

  var SHOP_ITEMS = [
    { key: 'AI_QUOTA_10',  name: '刷新 AI 额度 +10', desc: '立即为本日 AI 助手增加 10 次调用额度', cost: 20,  icon: '🤖' },
    { key: 'AVATAR_FRAME', name: '头像框',           desc: '为你的头像解锁金色手绘头像框',           cost: 100, icon: '🖼️' },
    { key: 'TITLE',        name: '专属称号',         desc: '在个人资料卡展示自定义专属称号',         cost: 200, icon: '🏅' }
  ];

  function _getBalance() {
    return (typeof root.getPoints === 'function') ? root.getPoints() : 0;
  }

  function _getLevel() {
    var pts = _getBalance();
    return (typeof root.getPointsLevel === 'function') ? root.getPointsLevel(pts) : { title: '生物新芽', color: '#8a8a8a', icon: '🌱' };
  }

  // 兑换后发放权益
  function _grantItem(key) {
    try {
      if (key === 'AI_QUOTA_10') {
        var bonus = parseInt(localStorage.getItem('bioquest_ai_quota_bonus') || '0', 10);
        localStorage.setItem('bioquest_ai_quota_bonus', String(bonus + 10));
      } else if (key === 'AVATAR_FRAME') {
        localStorage.setItem('bioquest_avatar_frame', '1');
      } else if (key === 'TITLE') {
        localStorage.setItem('bioquest_custom_title', '1');
      }
    } catch (e) { /* 静默 */ }
  }

  function _itemOwned(key) {
    try {
      if (key === 'AVATAR_FRAME') return localStorage.getItem('bioquest_avatar_frame') === '1';
      if (key === 'TITLE') return localStorage.getItem('bioquest_custom_title') === '1';
    } catch (e) {}
    return false;
  }

  function _redeem(item) {
    var balance = _getBalance();
    if (balance < item.cost) {
      toast('积分不足，还需 ' + (item.cost - balance) + ' 积分');
      return;
    }
    if (typeof root.deductPoints !== 'function') { toast('积分功能未加载'); return; }
    root.deductPoints(item.key, item.cost);
    _grantItem(item.key);
    toast('兑换成功：' + item.name);
    // 重绘当前页面（若在商城页）
    var shopEl = document.getElementById('points-shop-root');
    if (shopEl) initPointsShop(shopEl);
  }

  function _renderHistory(history) {
    if (!history || history.length === 0) {
      return '<div style="text-align:center;padding:24px;color:var(--text-muted);">暂无积分明细</div>';
    }
    var REASONS = {
      ANSWER_CORRECT: '答对题目', ANSWER_WRONG: '答题鼓励', DAILY_LOGIN: '每日签到',
      POST: '发布帖子', COMMENT: '发表评论', SPAM: '违规扣分', BAD_SPEECH: '不当言论扣分',
      AI_QUOTA_10: '兑换 AI 额度', AVATAR_FRAME: '兑换头像框', TITLE: '兑换专属称号',
      BOUNTY: '发布悬赏', BOUNTY_ACCEPTED: '回答被采纳'
    };
    var fmtTime = function (ts) {
      try {
        var d = new Date(ts);
        var m = ('0' + (d.getMonth() + 1)).slice(-2);
        var day = ('0' + d.getDate()).slice(-2);
        return d.getFullYear() + '-' + m + '-' + day;
      } catch (e) { return ''; }
    };
    var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    history.forEach(function (h) {
      var label = REASONS[h.reason] || h.reason || '积分变动';
      var amt = typeof h.amount === 'number' ? h.amount : 0;
      var color = amt >= 0 ? 'var(--color-success,#3a8c5c)' : 'var(--color-error,#c0553a)';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface-secondary,#faf7f2);border:1px solid var(--border-light,#ece8e1);border-radius:12px;gap:10px;flex-wrap:wrap;">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
          '<span style="font-size:0.78rem;color:var(--text-muted);font-family:var(--font-mono,monospace);min-width:80px;">' + fmtTime(h.ts) + '</span>' +
          '<span style="font-size:0.85rem;color:var(--text-primary);">' + escapeHtml(label) + '</span>' +
        '</div>' +
        '<span style="font-size:0.9rem;font-weight:700;color:' + color + ';">' + (amt > 0 ? '+' : '') + amt + '</span>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function initPointsShop(target) {
    if (!target) return;
    target.id = 'points-shop-root';
    var balance = _getBalance();
    var level = _getLevel();
    var detail = (typeof root.getPointsDetail === 'function') ? root.getPointsDetail() : { history: [] };

    var itemsHtml = SHOP_ITEMS.map(function (item) {
      var owned = _itemOwned(item.key);
      var disabled = owned ? 'disabled' : '';
      var btn = owned
        ? '<span style="padding:8px 18px;background:rgba(90,125,92,0.12);color:var(--color-sage,#5a7d5c);border-radius:16px;font-size:0.85rem;font-weight:600;">已拥有</span>'
        : '<button data-redeem="' + item.key + '" style="padding:8px 18px;background:linear-gradient(135deg,var(--color-sage,#5a7d5c),var(--color-deep,#1a3a2a));color:#fff;border:none;border-radius:16px;font-size:0.85rem;font-weight:600;cursor:pointer;">' + item.cost + ' 积分</button>';
      return '<div style="background:var(--surface-primary,#fff);border:1px solid var(--border-light,#ece8e1);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--shadow-sm);">' +
        '<div style="font-size:1.8rem;">' + item.icon + '</div>' +
        '<div style="font-size:1rem;font-weight:600;color:var(--color-deep,#1a3a2a);">' + escapeHtml(item.name) + '</div>' +
        '<div style="font-size:0.82rem;color:var(--text-muted);line-height:1.5;flex:1;">' + escapeHtml(item.desc) + '</div>' +
        '<div style="text-align:right;">' + btn + '</div>' +
      '</div>';
    }).join('');

    target.innerHTML = '<div style="max-width:860px;margin:0 auto;padding:24px 20px 80px;">' +
      '<h1 style="margin:0 0 4px;font-family:var(--font-serif,serif);color:var(--color-deep);">积分商城</h1>' +
      '<p style="margin:0 0 20px;color:var(--text-muted);font-size:0.9rem;">用学到的知识赚积分，再用积分兑换专属权益 ✨</p>' +

      '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">' +
        '<div style="flex:1;min-width:220px;background:linear-gradient(135deg,var(--color-sage,#5a7d5c),var(--color-deep,#1a3a2a));color:#fff;border-radius:20px;padding:24px;box-shadow:var(--shadow-md);">' +
          '<div style="font-size:0.85rem;opacity:0.85;">当前积分</div>' +
          '<div style="font-size:2.4rem;font-weight:700;margin:4px 0;">' + balance + '</div>' +
          '<div style="font-size:0.85rem;opacity:0.9;">' + level.icon + ' ' + level.title + '</div>' +
        '</div>' +
        '<div style="flex:1;min-width:220px;background:var(--surface-primary,#fff);border:1px solid var(--border-light,#ece8e1);border-radius:20px;padding:24px;box-shadow:var(--shadow-sm);">' +
          '<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px;">等级进度</div>' +
          (level.nextAt
            ? '<div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:8px;">距离 <strong>' + level.nextAt + '</strong> 积分升级</div>' +
              '<div style="height:8px;background:var(--border-light,#ece8e1);border-radius:9999px;overflow:hidden;">' +
                '<div style="width:' + Math.round(level.progress * 100) + '%;height:100%;background:' + level.color + ';border-radius:9999px;"></div>' +
              '</div>'
            : '<div style="font-size:0.9rem;color:var(--color-success,#3a8c5c);">已达最高等级 🏆</div>') +
        '</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:24px;">' + itemsHtml + '</div>' +

      '<div style="background:var(--surface-primary,#fff);border:1px solid var(--border-light,#ece8e1);border-radius:16px;padding:20px;box-shadow:var(--shadow-sm);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
          '<div style="font-size:1rem;font-weight:600;color:var(--color-deep,#1a3a2a);">积分明细</div>' +
          '<a href="#/points-leaderboard" style="font-size:0.85rem;color:var(--color-sage,#5a7d5c);text-decoration:none;">积分排行榜 →</a>' +
        '</div>' +
        _renderHistory(detail.history) +
      '</div>' +
    '</div>';

    target.querySelectorAll('[data-redeem]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-redeem');
        var item = SHOP_ITEMS.filter(function (i) { return i.key === key; })[0];
        if (item) _redeem(item);
      });
    });
  }

  function initPointsLeaderboard(target) {
    if (!target) return;
    target.innerHTML = '<div style="max-width:760px;margin:0 auto;padding:24px 20px 80px;text-align:center;color:var(--text-muted);">加载积分排行...</div>';

    var fn = (typeof root.getPointsLeaderboard === 'function') ? root.getPointsLeaderboard : null;
    if (!fn) {
      target.innerHTML = '<div style="max-width:760px;margin:0 auto;padding:24px 20px 80px;text-align:center;color:var(--text-muted);">积分排行榜服务未加载</div>';
      return;
    }

    fn(100).then(function (list) {
      var me = (typeof root.getCurrentUser === 'function') ? root.getCurrentUser() : null;
      var myId = me ? me.id : null;
      var myPoints = (typeof root.getPoints === 'function') ? root.getPoints() : 0;

      var rows = (list || []).map(function (item, i) {
        var rankClass = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : String(i + 1)));
        var isMe = myId && item.id === myId;
        var lv = item.level || { title: '生物新芽', color: '#8a8a8a', icon: '🌱' };
        return '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:' + (isMe ? 'rgba(196,149,106,0.12)' : 'var(--surface-primary,#fff)') + ';border:1px solid ' + (isMe ? 'var(--color-amber,#c4956a)' : 'var(--border-light,#ece8e1)') + ';border-radius:12px;margin-bottom:8px;">' +
          '<span style="width:40px;font-size:1.2rem;font-weight:700;color:var(--color-deep,#1a3a2a);text-align:center;">' + rankClass + '</span>' +
          '<span style="flex:1;font-size:0.95rem;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (isMe ? '⭐ ' : '') + escapeHtml(item.display_name || item.username || '匿名用户') + '</span>' +
          '<span style="font-size:0.8rem;color:' + lv.color + ';white-space:nowrap;">' + lv.icon + ' ' + lv.title + '</span>' +
          '<span style="font-size:1rem;font-weight:700;color:var(--color-amber,#c4956a);min-width:70px;text-align:right;">' + item.points + '</span>' +
        '</div>';
      }).join('');

      // 若当前用户不在榜内，追加一行
      var userInList = (list || []).some(function (item) { return myId && item.id === myId; });
      if (myId && !userInList) {
        var myLv = (typeof root.getPointsLevel === 'function') ? root.getPointsLevel(myPoints) : { title: '生物新芽', color: '#8a8a8a', icon: '🌱' };
        rows += '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(196,149,106,0.12);border:1px solid var(--color-amber,#c4956a);border-radius:12px;margin-top:12px;">' +
          '<span style="width:40px;font-size:1.2rem;font-weight:700;color:var(--color-deep,#1a3a2a);text-align:center;">···</span>' +
          '<span style="flex:1;font-size:0.95rem;font-weight:600;color:var(--text-primary);">⭐ ' + escapeHtml((me && (me.display_name || me.username)) || '我') + '</span>' +
          '<span style="font-size:0.8rem;color:' + myLv.color + ';white-space:nowrap;">' + myLv.icon + ' ' + myLv.title + '</span>' +
          '<span style="font-size:1rem;font-weight:700;color:var(--color-amber,#c4956a);min-width:70px;text-align:right;">' + myPoints + '</span>' +
        '</div>';
      }

      target.innerHTML = '<div style="max-width:760px;margin:0 auto;padding:24px 20px 80px;">' +
        '<h1 style="margin:0 0 4px;font-family:var(--font-serif,serif);color:var(--color-deep);">积分排行榜</h1>' +
        '<p style="margin:0 0 20px;color:var(--text-muted);font-size:0.9rem;">按累计积分排名，坚持学习，冲击榜首 🏆</p>' +
        '<div style="display:flex;gap:10px;margin-bottom:16px;">' +
          '<a href="#/points-shop" style="padding:8px 18px;background:var(--surface-primary,#fff);border:1px solid var(--border-light,#ece8e1);border-radius:16px;font-size:0.85rem;color:var(--color-sage,#5a7d5c);text-decoration:none;">积分商城 →</a>' +
        '</div>' +
        rows +
      '</div>';
    }).catch(function () {
      target.innerHTML = '<div style="max-width:760px;margin:0 auto;padding:24px 20px 80px;text-align:center;color:var(--text-muted);">排行榜加载失败，请稍后重试</div>';
    });
  }

  root.initPointsShop = initPointsShop;
  root.initPointsLeaderboard = initPointsLeaderboard;
})(typeof window !== 'undefined' ? window : null);