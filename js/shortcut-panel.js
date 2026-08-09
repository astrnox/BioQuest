/**
 * ============================================================
 * BioQuest — PRD §5-40：快捷键面板
 * 按 "?" 显示所有快捷键说明
 * ============================================================
 */
(function () {
  'use strict';

  var _visible = false;
  var _panel = null;

  var SHORTCUTS = [
    {
      section: '答题',
      keys: [
        { key: '1-5 / A-E', desc: '选择对应选项' },
        { key: 'Space / Enter', desc: '下一题 / 提交答案' }
      ]
    },
    {
      section: '导航',
      keys: [
        { key: '?', desc: '显示/隐藏快捷键面板' },
        { key: 'Esc', desc: '关闭弹窗 / 面板' }
      ]
    },
    {
      section: '卡片复习',
      keys: [
        { key: 'Space', desc: '翻转卡片' },
        { key: '1-4', desc: '自评难度（1=容易 → 4=困难）' }
      ]
    },
    {
      section: '通用',
      keys: [
        { key: 'Ctrl+S', desc: '保存当前进度' },
        { key: 'F', desc: '全屏模式' }
      ]
    }
  ];

  function buildPanel() {
    _panel = document.createElement('div');
    _panel.id = 'bioquest-shortcut-panel';
    _panel.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'bottom:0',
      'z-index:99999',
      'background:rgba(0,0,0,0.5)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'opacity:0',
      'visibility:hidden',
      'transition:opacity 0.2s ease,visibility 0.2s ease',
      'font-family:system-ui,-apple-system,sans-serif'
    ].join(';');

    var card = document.createElement('div');
    card.style.cssText = [
      'background:#fff',
      'border-radius:16px',
      'padding:28px 32px',
      'max-width:480px',
      'width:90%',
      'max-height:80vh',
      'overflow-y:auto',
      'box-shadow:0 20px 60px rgba(0,0,0,0.2)'
    ].join(';');

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
      '<h2 style="font-size:1.2rem;font-weight:700;color:#1a1a1a;margin:0;">快捷键</h2>' +
      '<span style="font-size:0.8rem;color:#999;">按 <kbd style="background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:0.8rem;">?</kbd> 关闭</span>' +
      '</div>';

    SHORTCUTS.forEach(function (group) {
      html += '<div style="margin-bottom:16px;">';
      html += '<h3 style="font-size:0.85rem;font-weight:600;color:#666;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.5px;">' + group.section + '</h3>';
      html += '<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;align-items:center;">';
      group.keys.forEach(function (item) {
        html += '<kbd style="background:#f0f0f0;padding:3px 10px;border-radius:6px;font-size:0.85rem;font-family:monospace;border:1px solid #ddd;text-align:center;white-space:nowrap;">' + item.key + '</kbd>';
        html += '<span style="font-size:0.9rem;color:#444;">' + item.desc + '</span>';
      });
      html += '</div></div>';
    });

    html += '<div style="margin-top:16px;padding-top:12px;border-top:1px solid #eee;font-size:0.8rem;color:#999;text-align:center;">' +
      'BioQuest 支持键盘快捷键操作，提升刷题效率' +
      '</div>';

    card.innerHTML = html;
    _panel.appendChild(card);
    document.body.appendChild(_panel);

    // 点击背景关闭
    _panel.addEventListener('click', function (e) {
      if (e.target === _panel) hide();
    });
  }

  function show() {
    if (!_panel) buildPanel();
    _visible = true;
    _panel.style.visibility = 'visible';
    _panel.style.opacity = '1';
  }

  function hide() {
    if (!_panel) return;
    _visible = false;
    _panel.style.opacity = '0';
    _panel.style.visibility = 'hidden';
  }

  function toggle() {
    if (_visible) hide();
    else show();
  }

  // 键盘监听
  document.addEventListener('keydown', function (e) {
    if (e.key === '?') {
      e.preventDefault();
      toggle();
    } else if (e.key === 'Escape' && _visible) {
      e.preventDefault();
      hide();
    }
  });

  window.ShortcutPanel = { show: show, hide: hide, toggle: toggle };

  console.log('[BioQuest] 快捷键面板已加载');
})();