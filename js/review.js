/**
 * ============================================================
 * BioQuest — 错题复习推送模块
 * 基于 FSRS 算法，每日推送到期错题
 * ============================================================
 */

(function () {
  'use strict';

  var _currentCards = [];
  var _currentIndex = 0;

  var escapeHtml = window.escapeHtml;

  function _showToast(msg) {
    var existing = document.getElementById('review-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'review-toast';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--color-deep,#1a3a2a);color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;z-index:10000;animation:fadeInUp 0.3s ease;max-width:90%;text-align:center;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 2500);
  }

  function _renderEmpty(container, msg) {
    container.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
      '<div style="font-size:3rem;margin-bottom:16px;">🎉</div>' +
      '<div style="font-size:1.2rem;color:var(--color-deep,#1a3a2a);font-weight:600;margin-bottom:8px;">' + escapeHtml(msg || '今日无错题复习') + '</div>' +
      '<div style="color:var(--text-muted);">保持每日练习，错题会自动进入复习队列。</div>' +
      '</div>';
  }

  async function _loadDueCards() {
    var fn = (typeof window.getDueReviewQuestions === 'function') ? window.getDueReviewQuestions : null;
    if (!fn) return [];
    return await fn(20);
  }

  function _renderCard(container, card) {
    var html = '<div class="review-card" style="max-width:720px;margin:0 auto;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<span style="font-size:0.8rem;color:var(--text-muted);">复习 ' + (_currentIndex + 1) + ' / ' + _currentCards.length + '</span>' +
        '<span style="font-size:0.75rem;color:var(--text-muted);background:var(--surface-secondary);padding:3px 10px;border-radius:9999px;">' + (card.subject || '生物') + '</span>' +
      '</div>' +
      '<div style="background:#fff;border:1px solid var(--border-light);border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">' +
        '<div style="font-size:1.1rem;line-height:1.7;color:var(--text-primary);margin-bottom:16px;">' + escapeHtml(card.question_text || '题目内容未保存') + '</div>' +
        (card.concept ? '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;">知识点：' + escapeHtml(card.concept) + '</div>' : '') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;">' +
        '<button class="review-btn review-btn--again" data-rating="1">完全忘记</button>' +
        '<button class="review-btn review-btn--hard" data-rating="2">困难</button>' +
        '<button class="review-btn review-btn--good" data-rating="3">记得</button>' +
        '<button class="review-btn review-btn--easy" data-rating="4">轻松</button>' +
      '</div>' +
    '</div>';
    container.innerHTML = html;

    var buttons = container.querySelectorAll('.review-btn');
    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var rating = parseInt(btn.getAttribute('data-rating'), 10);
        _handleRating(card, rating);
      });
    });
  }

  async function _handleRating(card, rating) {
    var reviewFn = (typeof window.reviewQuestion === 'function') ? window.reviewQuestion : null;
    if (!reviewFn) {
      _showToast('复习功能未加载');
      return;
    }
    var result = await reviewFn(card.question_id, rating);
    if (result && result.ok) {
      _currentIndex++;
      if (_currentIndex < _currentCards.length) {
        _renderCard(document.getElementById('review-container'), _currentCards[_currentIndex]);
      } else {
        _renderDone(document.getElementById('review-container'));
      }
    } else {
      _showToast('提交失败：' + (result && result.error ? result.error : '请重试'));
    }
  }

  function _renderDone(container) {
    container.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
      '<div style="font-size:3rem;margin-bottom:16px;">✅</div>' +
      '<div style="font-size:1.2rem;color:var(--color-deep,#1a3a2a);font-weight:600;margin-bottom:8px;">今日复习完成</div>' +
      '<div style="color:var(--text-muted);">坚持复习，遗忘曲线会记得你的努力。</div>' +
      '</div>';
  }

  function _addStyles() {
    if (document.getElementById('review-module-styles')) return;
    var style = document.createElement('style');
    style.id = 'review-module-styles';
    style.textContent = '.review-btn{padding:14px 12px;border:none;border-radius:12px;font-size:0.95rem;font-weight:600;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;}' +
      '.review-btn:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.1);}' +
      '.review-btn--again{background:#fff0f0;color:#c0553a;border:1px solid #f0d0d0;}' +
      '.review-btn--hard{background:#fff8e8;color:#c49b30;border:1px solid #f0e0b0;}' +
      '.review-btn--good{background:#f0f8f0;color:#3a8c5c;border:1px solid #d0e8d0;}' +
      '.review-btn--easy{background:#e8f4ff;color:#3a7ac0;border:1px solid #d0e8f8;}';
    document.head.appendChild(style);
  }

  async function initReview() {
    _addStyles();
    var target = document.getElementById('page-content');
    if (!target) return;

    target.innerHTML = '<div class="page-header" style="padding:24px 20px;text-align:center;">' +
      '<h1 style="margin:0;font-family:var(--font-serif,serif);color:var(--color-deep);">今日复习</h1>' +
      '<p style="margin:8px 0 0;color:var(--text-muted);font-size:0.9rem;">基于 FSRS 间隔重复算法推送的错题</p>' +
      '</div>' +
      '<div id="review-container" style="padding:20px;">' +
        '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);">加载中...</div>' +
      '</div>';

    _currentCards = await _loadDueCards();
    _currentIndex = 0;
    var container = document.getElementById('review-container');
    if (!_currentCards || _currentCards.length === 0) {
      _renderEmpty(container, '今日无到期错题');
      return;
    }
    _renderCard(container, _currentCards[0]);
  }

  window.initReview = initReview;
})();
