/**
 * ============================================================
 * BioQuest — 全局离线状态指示器（Issue #123）
 * 监听 online/offline 事件，断网时显示顶部横幅提示离线状态，
 * 并顺带展示 OfflineQueue 待同步操作数量；联网后自动隐藏。
 * 依赖：js/utils.js（EventHub，可选）、js/offline-queue.js（可选）。
 * ============================================================
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var BANNER_ID = 'bq-offline-banner';

  function ensureBanner() {
    var el = document.getElementById(BANNER_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = BANNER_ID;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<span class="bq-ob-icon" aria-hidden="true">📡</span>' +
      '<span class="bq-ob-text">当前处于离线状态，部分功能可能不可用</span>' +
      '<span class="bq-ob-pending" style="display:none"></span>' +
      '<button type="button" class="bq-ob-btn" data-ob-action="reload">重新连接</button>';
    document.body.appendChild(el);
    return el;
  }

  var banner = null;
  function show() {
    if (!banner) banner = ensureBanner();
    document.body.classList.add('bq-offline-active');
    banner.classList.add('is-visible');
    refreshPending();
  }
  function hide() {
    if (!banner) banner = ensureBanner();
    document.body.classList.remove('bq-offline-active');
    banner.classList.remove('is-visible');
  }
  function refreshPending() {
    if (!banner || !banner.classList.contains('is-visible')) return;
    var pendingEl = banner.querySelector('.bq-ob-pending');
    if (!pendingEl || typeof window.OfflineQueue !== 'object' ||
        typeof window.OfflineQueue.size !== 'function') return;
    window.OfflineQueue.size().then(function (n) {
      if (n > 0) {
        pendingEl.style.display = '';
        pendingEl.textContent = '（' + n + ' 条操作待同步）';
      } else {
        pendingEl.style.display = 'none';
        pendingEl.textContent = '';
      }
    }).catch(function () {});
  }

  // 按钮：重新连接（刷新页面）；手动触发队列重放尝试
  document.addEventListener('click', function (e) {
    var target = e.target && e.target.closest ? e.target.closest('[data-ob-action]') : null;
    if (!target) return;
    e.preventDefault();
    if (target.getAttribute('data-ob-action') === 'reload') {
      try { window.location.reload(); } catch (err) {}
    }
  });

  function bind() {
    if (typeof window.EventHub === 'object' && typeof window.EventHub.on === 'function') {
      window.EventHub.on(window, 'offline', function () { show(); }, { scope: 'offline-banner' });
      window.EventHub.on(window, 'online', function () {
        if (typeof window.OfflineQueue === 'object' && typeof window.OfflineQueue.flush === 'function') {
          window.OfflineQueue.flush();
        }
        hide();
      }, { scope: 'offline-banner' });
    } else {
      window.addEventListener('offline', function () { show(); });
      window.addEventListener('online', function () {
        if (typeof window.OfflineQueue === 'object' && typeof window.OfflineQueue.flush === 'function') {
          window.OfflineQueue.flush();
        }
        hide();
      });
    }
  }

  // 启动时若已离线（如离线启动）立即展示
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { show(); });
    } else {
      show();
    }
  }
  bind();

  // 对外接口
  window.OfflineStatus = { show: show, hide: hide, refreshPending: refreshPending };
})();