/**
 * ============================================================
 * BioQuest — 问答悬赏模块
 * 用信用发布悬赏，优质回答获得奖励
 * ============================================================
 */

(function () {
  'use strict';

  var _currentBountyId = null;

  var escapeHtml = window.escapeHtml;

  function _showToast(msg) {
    var existing = document.getElementById('bounty-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'bounty-toast';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--color-deep,#1a3a2a);color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;z-index:10000;animation:fadeInUp 0.3s ease;max-width:90%;text-align:center;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 2500);
  }

  function _isLoggedIn() {
    return typeof window.isLoggedIn === 'function' && window.isLoggedIn();
  }

  function _getUser() {
    return (typeof window.getCurrentUser === 'function') ? window.getCurrentUser() : null;
  }

  function _formatTimeAgo(iso) {
    if (!iso) return '';
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    return Math.floor(diff / 86400) + ' 天前';
  }

  async function _loadBounties() {
    var fn = (typeof window.getBounties === 'function') ? window.getBounties : null;
    if (!fn) return [];
    return await fn('open', 50);
  }

  async function _loadBountyDetail(id) {
    var fn = (typeof window.getBountyDetail === 'function') ? window.getBountyDetail : null;
    if (!fn) return null;
    return await fn(id);
  }

  function _renderList(container, bounties) {
    var html = '<div style="max-width:800px;margin:0 auto;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
        '<h2 style="margin:0;color:var(--color-deep);">悬赏广场</h2>' +
        '<button id="bounty-create-btn" style="padding:8px 18px;background:var(--color-sage);color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;">发布悬赏</button>' +
      '</div>';

    if (!bounties || bounties.length === 0) {
      html += '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);">暂无进行中的悬赏，来做第一个提问者吧。</div>';
    } else {
      html += '<div style="display:flex;flex-direction:column;gap:12px;">';
      bounties.forEach(function(b) {
        var profile = b.profiles || {};
        var author = profile.display_name || profile.username || '匿名用户';
        html += '<div class="bounty-item" data-id="' + escapeHtml(b.id) + '" style="background:#fff;border:1px solid var(--border-light);border-radius:14px;padding:18px;cursor:pointer;transition:box-shadow 0.2s;">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">' +
            '<div style="flex:1;">' +
              '<div style="font-size:1.05rem;font-weight:600;color:var(--text-primary);margin-bottom:6px;">' + escapeHtml(b.title) + '</div>' +
              '<div style="font-size:0.85rem;color:var(--text-muted);line-height:1.5;">' + escapeHtml((b.content || '').slice(0, 120)) + ((b.content || '').length > 120 ? '...' : '') + '</div>' +
            '</div>' +
            '<div style="text-align:center;min-width:70px;">' +
              '<div style="font-size:1.1rem;font-weight:700;color:var(--color-sage);">' + (b.points_reward + (b.extra_points || 0)) + '</div>' +
              '<div style="font-size:0.7rem;color:var(--text-muted);">信用</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:0.78rem;color:var(--text-muted);">' +
            '<span>' + escapeHtml(author) + ' · ' + _formatTimeAgo(b.created_at) + '</span>' +
            '<span>' + (b.answer_count || 0) + ' 回答</span>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;

    var createBtn = document.getElementById('bounty-create-btn');
    if (createBtn) {
      createBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        _renderCreateForm(container);
      });
    }

    var items = container.querySelectorAll('.bounty-item');
    items.forEach(function(item) {
      item.addEventListener('click', function() {
        _currentBountyId = item.getAttribute('data-id');
        _renderDetailPage(container, _currentBountyId);
      });
    });
  }

  function _renderCreateForm(container) {
    if (!_isLoggedIn()) {
      _showToast('请先登录');
      return;
    }
    container.innerHTML = '<div style="max-width:600px;margin:0 auto;">' +
      '<h2 style="color:var(--color-deep);">发布悬赏</h2>' +
      '<div style="margin-bottom:14px;">' +
        '<label style="display:block;font-size:0.85rem;color:var(--text-muted);margin-bottom:6px;">标题</label>' +
        '<input id="bounty-title" type="text" style="width:100%;padding:10px;border:1px solid var(--border-light);border-radius:10px;box-sizing:border-box;" placeholder="简明描述你的问题">' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
        '<label style="display:block;font-size:0.85rem;color:var(--text-muted);margin-bottom:6px;">问题详情</label>' +
        '<textarea id="bounty-content" rows="5" style="width:100%;padding:10px;border:1px solid var(--border-light);border-radius:10px;box-sizing:border-box;resize:vertical;" placeholder="详细描述你的问题、已尝试的思路、期望的答案..."></textarea>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">' +
        '<div>' +
          '<label style="display:block;font-size:0.85rem;color:var(--text-muted);margin-bottom:6px;">悬赏信用（最少 5）</label>' +
          '<input id="bounty-reward" type="number" min="5" value="10" style="width:100%;padding:10px;border:1px solid var(--border-light);border-radius:10px;box-sizing:border-box;">' +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:0.85rem;color:var(--text-muted);margin-bottom:6px;">有效期（天，0=不限制）</label>' +
          '<input id="bounty-expires" type="number" min="0" value="7" style="width:100%;padding:10px;border:1px solid var(--border-light);border-radius:10px;box-sizing:border-box;">' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;">' +
        '<button id="bounty-submit" style="flex:1;padding:12px;background:var(--color-sage);color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;">发布</button>' +
        '<button id="bounty-cancel" style="padding:12px 20px;background:var(--surface-secondary);color:var(--text-primary);border:1px solid var(--border-light);border-radius:10px;cursor:pointer;">取消</button>' +
      '</div>' +
    '</div>';

    document.getElementById('bounty-cancel').addEventListener('click', function() {
      initBounties();
    });
    document.getElementById('bounty-submit').addEventListener('click', async function() {
      var title = document.getElementById('bounty-title').value.trim();
      var content = document.getElementById('bounty-content').value.trim();
      var reward = parseInt(document.getElementById('bounty-reward').value, 10);
      var expires = parseInt(document.getElementById('bounty-expires').value, 10);
      if (!title || !content) {
        _showToast('请填写标题和详情');
        return;
      }
      var fn = (typeof window.createBounty === 'function') ? window.createBounty : null;
      if (!fn) {
        _showToast('悬赏功能未加载');
        return;
      }
      var result = await fn(title, content, reward, [], expires);
      if (result && result.ok) {
        _showToast('悬赏发布成功');
        initBounties();
      } else {
        _showToast('发布失败：' + (result && result.error ? result.error : '请重试'));
      }
    });
  }

  async function _renderDetailPage(container, bountyId) {
    container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);">加载中...</div>';
    var bounty = await _loadBountyDetail(bountyId);
    if (!bounty) {
      container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);">悬赏不存在或已删除</div>';
      return;
    }

    var profile = bounty.profiles || {};
    var author = profile.display_name || profile.username || '匿名用户';
    var user = _getUser();
    var isOwner = user && user.id === bounty.user_id;

    var html = '<div style="max-width:800px;margin:0 auto;">' +
      '<button id="bounty-back" style="margin-bottom:16px;padding:6px 14px;background:var(--surface-secondary);border:1px solid var(--border-light);border-radius:8px;cursor:pointer;">← 返回广场</button>' +
      '<div style="background:#fff;border:1px solid var(--border-light);border-radius:16px;padding:24px;margin-bottom:20px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:12px;">' +
          '<h2 style="margin:0;color:var(--color-deep);">' + escapeHtml(bounty.title) + '</h2>' +
          '<div style="text-align:center;min-width:80px;">' +
            '<div style="font-size:1.3rem;font-weight:700;color:var(--color-sage);">' + (bounty.points_reward + (bounty.extra_points || 0)) + '</div>' +
            '<div style="font-size:0.75rem;color:var(--text-muted);">信用悬赏</div>' +
          '</div>' +
        '</div>' +
        '<div style="line-height:1.7;color:var(--text-primary);white-space:pre-wrap;margin-bottom:16px;">' + escapeHtml(bounty.content) + '</div>' +
        '<div style="font-size:0.8rem;color:var(--text-muted);">' + escapeHtml(author) + ' · ' + _formatTimeAgo(bounty.created_at) + ' · ' + (bounty.answer_count || 0) + ' 回答</div>' +
      '</div>';

    // 回答列表
    var answers = bounty.answers || [];
    html += '<h3 style="color:var(--color-deep);margin-bottom:14px;">回答</h3>';
    if (answers.length === 0) {
      html += '<div style="color:var(--text-muted);padding:20px;background:var(--surface-secondary);border-radius:12px;">暂无回答，来写第一个回答吧。</div>';
    } else {
      html += '<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">';
      answers.forEach(function(a) {
        var ap = a.profiles || {};
        var aName = ap.display_name || ap.username || '匿名';
        html += '<div style="background:#fff;border:1px solid var(--border-light);border-radius:14px;padding:18px;' + (a.is_accepted ? 'border-color:var(--color-sage);box-shadow:0 0 0 1px var(--color-sage);' : '') + '">' +
          '<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:10px;">' + escapeHtml(aName) + ' · ' + _formatTimeAgo(a.created_at) + (a.is_accepted ? ' <span style="color:var(--color-sage);font-weight:600;">✓ 已采纳</span>' : '') + '</div>' +
          '<div style="line-height:1.6;color:var(--text-primary);white-space:pre-wrap;">' + escapeHtml(a.content) + '</div>';
        if (isOwner && bounty.status === 'open' && !a.is_accepted) {
          html += '<button class="bounty-accept-btn" data-answer-id="' + escapeHtml(a.id) + '" style="margin-top:12px;padding:6px 14px;background:var(--color-sage);color:#fff;border:none;border-radius:8px;font-size:0.85rem;cursor:pointer;">采纳回答</button>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // 回答输入框
    if (_isLoggedIn() && !isOwner && bounty.status === 'open') {
      html += '<div style="background:#fff;border:1px solid var(--border-light);border-radius:14px;padding:18px;">' +
        '<h4 style="margin:0 0 12px;color:var(--color-deep);">写回答</h4>' +
        '<textarea id="bounty-answer-content" rows="4" style="width:100%;padding:10px;border:1px solid var(--border-light);border-radius:10px;box-sizing:border-box;resize:vertical;margin-bottom:12px;" placeholder="分享你的思路和答案..."></textarea>' +
        '<button id="bounty-answer-submit" style="padding:10px 20px;background:var(--color-sage);color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer;">提交回答</button>' +
      '</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    document.getElementById('bounty-back').addEventListener('click', function() {
      initBounties();
    });

    var acceptBtns = container.querySelectorAll('.bounty-accept-btn');
    acceptBtns.forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var answerId = btn.getAttribute('data-answer-id');
        var fn = (typeof window.acceptBountyAnswer === 'function') ? window.acceptBountyAnswer : null;
        if (!fn) return;
        var result = await fn(bountyId, answerId);
        if (result && result.ok) {
          _showToast('已采纳，奖励已发放');
          _renderDetailPage(container, bountyId);
        } else {
          _showToast('采纳失败：' + (result && result.error ? result.error : '请重试'));
        }
      });
    });

    var answerSubmit = document.getElementById('bounty-answer-submit');
    if (answerSubmit) {
      answerSubmit.addEventListener('click', async function() {
        var content = document.getElementById('bounty-answer-content').value.trim();
        if (!content) {
          _showToast('请输入回答内容');
          return;
        }
        var fn = (typeof window.createBountyAnswer === 'function') ? window.createBountyAnswer : null;
        if (!fn) return;
        var result = await fn(bountyId, content);
        if (result && result.ok) {
          _showToast('回答提交成功');
          _renderDetailPage(container, bountyId);
        } else {
          _showToast('提交失败：' + (result && result.error ? result.error : '请重试'));
        }
      });
    }
  }

  async function initBounties() {
    var target = document.getElementById('page-content');
    if (!target) return;

    target.innerHTML = '<div class="page-header" style="padding:24px 20px;text-align:center;">' +
      '<h1 style="margin:0;font-family:var(--font-serif,serif);color:var(--color-deep);">问答悬赏</h1>' +
      '<p style="margin:8px 0 0;color:var(--text-muted);font-size:0.9rem;">用信用提问，用知识赚取信用</p>' +
      '</div>' +
      '<div id="bounty-container" style="padding:20px;">' +
        '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);">加载中...</div>' +
      '</div>';

    var container = document.getElementById('bounty-container');
    var bounties = await _loadBounties();
    _renderList(container, bounties);
  }

  window.initBounties = initBounties;
})();
