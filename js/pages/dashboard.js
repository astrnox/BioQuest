/**
 * ============================================================
 * BioQuest — 仪表盘模块（不背单词风格）
 * 整合诊断、Bio Score、学习计划、趋势分析
 * 设计：大圆环进度 + 横向统计卡 + 今日计划 + 诊断摘要
 * ============================================================
 */

'use strict';

var _dashboardStylesInjected = false;

function injectDashboardStyles() {
  if (_dashboardStylesInjected) return;
  _dashboardStylesInjected = true;

  var style = document.createElement('style');
  style.id = 'bioquest-dashboard-styles';
  style.textContent = [
    /* 页面容器 */
    '.dashboard-page {',
    '  max-width: 900px;',
    '  margin: 0 auto;',
    '  padding: 24px 20px 80px;',
    '}',

    /* 头部问候 */
    '.dash-header {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  margin-bottom: 28px;',
    '}',
    '.dash-greeting {',
    '  font-family: var(--font-serif, "Noto Serif SC", serif);',
    '  font-size: 1.5rem;',
    '  font-weight: 700;',
    '  color: var(--color-deep, #1a3a2a);',
    '  margin: 0 0 4px;',
    '}',
    '.dash-date {',
    '  font-size: 0.82rem;',
    '  color: var(--text-muted, #8a8a8a);',
    '}',
    '.dash-avatar {',
    '  width: 44px;',
    '  height: 44px;',
    '  border-radius: 50%;',
    '  background: linear-gradient(135deg, var(--color-sage, #5a7d5c), var(--color-amber, #c4956a));',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  color: #fff;',
    '  font-size: 1.1rem;',
    '  font-weight: 700;',
    '  flex-shrink: 0;',
    '  cursor: pointer;',
    '}',

    /* 今日目标圆环 */
    '.dash-goal-section {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 24px;',
    '  background: var(--surface-primary, #fff);',
    '  border-radius: var(--radius-lg, 20px);',
    '  padding: 28px 24px;',
    '  box-shadow: var(--shadow-sm, 0 1px 3px rgba(26,58,42,0.06));',
    '  margin-bottom: 20px;',
    '}',
    '.dash-goal-ring {',
    '  position: relative;',
    '  width: 120px;',
    '  height: 120px;',
    '  flex-shrink: 0;',
    '}',
    '.dash-goal-ring svg {',
    '  transform: rotate(-90deg);',
    '}',
    '.dash-goal-center {',
    '  position: absolute;',
    '  inset: 0;',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: center;',
    '  justify-content: center;',
    '}',
    '.dash-goal-num {',
    '  font-size: 1.8rem;',
    '  font-weight: 700;',
    '  font-family: var(--font-mono, monospace);',
    '  color: var(--color-deep, #1a3a2a);',
    '  line-height: 1;',
    '}',
    '.dash-goal-label {',
    '  font-size: 0.7rem;',
    '  color: var(--text-muted, #8a8a8a);',
    '  margin-top: 4px;',
    '}',
    '.dash-goal-info {',
    '  flex: 1;',
    '  min-width: 0;',
    '}',
    '.dash-goal-title {',
    '  font-size: 1.05rem;',
    '  font-weight: 600;',
    '  color: var(--text-primary, #1a1a1a);',
    '  margin-bottom: 6px;',
    '}',
    '.dash-goal-desc {',
    '  font-size: 0.82rem;',
    '  color: var(--text-secondary, #4a4a4a);',
    '  line-height: 1.5;',
    '  margin-bottom: 12px;',
    '}',
    '.dash-goal-btn {',
    '  display: inline-block;',
    '  padding: 8px 20px;',
    '  background: var(--color-sage, #5a7d5c);',
    '  color: #fff;',
    '  border: none;',
    '  border-radius: 20px;',
    '  font-size: 0.85rem;',
    '  font-weight: 500;',
    '  cursor: pointer;',
    '  transition: opacity 0.2s, transform 0.15s;',
    '}',
    '.dash-goal-btn:active {',
    '  transform: scale(0.96);',
    '}',
    '.dash-goal-btn--outline {',
    '  background: transparent;',
    '  color: var(--color-sage, #5a7d5c);',
    '  border: 1.5px solid var(--color-sage, #5a7d5c);',
    '}',

    /* 横向统计卡 */
    '.dash-stats-row {',
    '  display: grid;',
    '  grid-template-columns: repeat(4, 1fr);',
    '  gap: 12px;',
    '  margin-bottom: 20px;',
    '}',
    '.dash-stat-card {',
    '  background: var(--surface-primary, #fff);',
    '  border-radius: var(--radius-md, 12px);',
    '  padding: 16px 12px;',
    '  text-align: center;',
    '  box-shadow: var(--shadow-sm, 0 1px 3px rgba(26,58,42,0.06));',
    '  cursor: pointer;',
    '  transition: transform 0.15s, box-shadow 0.15s;',
    '}',
    '.dash-stat-card:active {',
    '  transform: scale(0.97);',
    '}',
    '.dash-stat-num {',
    '  font-size: 1.5rem;',
    '  font-weight: 700;',
    '  font-family: var(--font-mono, monospace);',
    '  color: var(--color-deep, #1a3a2a);',
    '  line-height: 1.2;',
    '}',
    '.dash-stat-label {',
    '  font-size: 0.72rem;',
    '  color: var(--text-muted, #8a8a8a);',
    '  margin-top: 4px;',
    '}',
    '.dash-stat-card--accent .dash-stat-num {',
    '  color: var(--color-sage, #5a7d5c);',
    '}',
    '.dash-stat-card--amber .dash-stat-num {',
    '  color: var(--color-amber, #c4956a);',
    '}',

    /* 区块卡片 */
    '.dash-section {',
    '  background: var(--surface-primary, #fff);',
    '  border-radius: var(--radius-lg, 20px);',
    '  padding: 24px 20px;',
    '  box-shadow: var(--shadow-sm, 0 1px 3px rgba(26,58,42,0.06));',
    '  margin-bottom: 16px;',
    '}',
    '.dash-section-header {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  margin-bottom: 16px;',
    '}',
    '.dash-section-title {',
    '  font-family: var(--font-serif, "Noto Serif SC", serif);',
    '  font-size: 1.1rem;',
    '  font-weight: 700;',
    '  color: var(--color-deep, #1a3a2a);',
    '}',
    '.dash-section-link {',
    '  font-size: 0.8rem;',
    '  color: var(--color-sage, #5a7d5c);',
    '  text-decoration: none;',
    '  cursor: pointer;',
    '}',

    /* Bio Score 卡片 */
    '.dash-bioscore {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 20px;',
    '}',
    '.dash-bioscore-grade {',
    '  width: 64px;',
    '  height: 64px;',
    '  border-radius: 50%;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  font-size: 1.6rem;',
    '  font-weight: 700;',
    '  font-family: var(--font-serif, serif);',
    '  color: #fff;',
    '  flex-shrink: 0;',
    '}',
    '.dash-bioscore-info {',
    '  flex: 1;',
    '}',
    '.dash-bioscore-score {',
    '  font-size: 2rem;',
    '  font-weight: 700;',
    '  font-family: var(--font-mono, monospace);',
    '  color: var(--color-deep, #1a3a2a);',
    '  line-height: 1;',
    '}',
    '.dash-bioscore-label {',
    '  font-size: 0.78rem;',
    '  color: var(--text-muted, #8a8a8a);',
    '  margin-top: 4px;',
    '}',
    '.dash-bioscore-bars {',
    '  display: flex;',
    '  gap: 4px;',
    '  margin-top: 8px;',
    '}',
    '.dash-bioscore-bar {',
    '  flex: 1;',
    '  height: 4px;',
    '  border-radius: 2px;',
    '  background: var(--border-light, #ece8e1);',
    '  overflow: hidden;',
    '}',
    '.dash-bioscore-bar-fill {',
    '  height: 100%;',
    '  border-radius: 2px;',
    '  transition: width 0.6s ease;',
    '}',

    /* 诊断摘要 - 薄弱模块 */
    '.dash-weak-list {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 10px;',
    '}',
    '.dash-weak-item {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 12px;',
    '  padding: 12px 14px;',
    '  background: var(--surface-secondary, #faf7f2);',
    '  border-radius: var(--radius-md, 12px);',
    '  cursor: pointer;',
    '  transition: background 0.15s;',
    '}',
    '.dash-weak-item:active {',
    '  background: var(--border-light, #ece8e1);',
    '}',
    '.dash-weak-icon {',
    '  width: 36px;',
    '  height: 36px;',
    '  border-radius: 10px;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  font-size: 1.1rem;',
    '  flex-shrink: 0;',
    '}',
    '.dash-weak-info {',
    '  flex: 1;',
    '  min-width: 0;',
    '}',
    '.dash-weak-name {',
    '  font-size: 0.88rem;',
    '  font-weight: 600;',
    '  color: var(--text-primary, #1a1a1a);',
    '}',
    '.dash-weak-desc {',
    '  font-size: 0.72rem;',
    '  color: var(--text-muted, #8a8a8a);',
    '  margin-top: 2px;',
    '}',
    '.dash-weak-acc {',
    '  font-size: 1rem;',
    '  font-weight: 700;',
    '  font-family: var(--font-mono, monospace);',
    '  flex-shrink: 0;',
    '}',

    /* 今日计划列表 */
    '.dash-plan-list {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 10px;',
    '}',
    '.dash-plan-item {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 12px;',
    '  padding: 14px 16px;',
    '  background: var(--surface-secondary, #faf7f2);',
    '  border-radius: var(--radius-md, 12px);',
    '  border-left: 3px solid var(--color-sage, #5a7d5c);',
    '  cursor: pointer;',
    '  transition: transform 0.15s;',
    '}',
    '.dash-plan-item:active {',
    '  transform: scale(0.98);',
    '}',
    '.dash-plan-icon {',
    '  font-size: 1.3rem;',
    '  flex-shrink: 0;',
    '}',
    '.dash-plan-info {',
    '  flex: 1;',
    '  min-width: 0;',
    '}',
    '.dash-plan-title {',
    '  font-size: 0.9rem;',
    '  font-weight: 600;',
    '  color: var(--text-primary, #1a1a1a);',
    '}',
    '.dash-plan-desc {',
    '  font-size: 0.75rem;',
    '  color: var(--text-muted, #8a8a8a);',
    '  margin-top: 2px;',
    '}',
    '.dash-plan-arrow {',
    '  color: var(--text-muted, #8a8a8a);',
    '  font-size: 0.9rem;',
    '}',

    /* 趋势 mini chart */
    '.dash-trend-chart {',
    '  display: flex;',
    '  align-items: flex-end;',
    '  gap: 6px;',
    '  height: 80px;',
    '  padding-top: 8px;',
    '}',
    '.dash-trend-bar {',
    '  flex: 1;',
    '  min-width: 0;',
    '  border-radius: 4px 4px 0 0;',
    '  transition: height 0.4s ease, opacity 0.2s;',
    '  position: relative;',
    '  cursor: pointer;',
    '}',
    '.dash-trend-bar:hover {',
    '  opacity: 0.8;',
    '}',
    '.dash-trend-bar-label {',
    '  position: absolute;',
    '  bottom: -20px;',
    '  left: 50%;',
    '  transform: translateX(-50%);',
    '  font-size: 0.6rem;',
    '  color: var(--text-muted, #8a8a8a);',
    '  white-space: nowrap;',
    '}',
    '.dash-trend-summary {',
    '  display: flex;',
    '  justify-content: space-between;',
    '  align-items: center;',
    '  margin-top: 28px;',
    '  padding-top: 12px;',
    '  border-top: 1px solid var(--border-light, #ece8e1);',
    '}',
    '.dash-trend-trend {',
    '  font-size: 0.85rem;',
    '  font-weight: 600;',
    '}',

    /* 空状态 */
    '.dash-empty {',
    '  text-align: center;',
    '  padding: 40px 20px;',
    '  color: var(--text-muted, #8a8a8a);',
    '}',
    '.dash-empty-icon {',
    '  font-size: 2.5rem;',
    '  margin-bottom: 12px;',
    '  opacity: 0.3;',
    '}',
    '.dash-empty-text {',
    '  font-size: 0.9rem;',
    '  margin-bottom: 16px;',
    '}',

    /* 考点预测 */
    '.dash-forecast {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 10px;',
    '}',
    '.dash-forecast-item {',
    '  display: flex;',
    '  align-items: flex-start;',
    '  gap: 12px;',
    '  padding: 12px 14px;',
    '  background: var(--surface-secondary, #faf7f2);',
    '  border-radius: var(--radius-md, 12px);',
    '  cursor: pointer;',
    '  transition: transform 0.15s;',
    '}',
    '.dash-forecast-item:active {',
    '  transform: scale(0.98);',
    '}',
    '.dash-forecast-rank {',
    '  width: 28px;',
    '  height: 28px;',
    '  border-radius: 50%;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  font-size: 0.8rem;',
    '  font-weight: 700;',
    '  flex-shrink: 0;',
    '  background: var(--color-sage, #5a7d5c);',
    '  color: #fff;',
    '}',
    '.dash-forecast-rank--top {',
    '  background: linear-gradient(135deg, #c4956a, #c47a4a);',
    '}',
    '.dash-forecast-info {',
    '  flex: 1;',
    '  min-width: 0;',
    '}',
    '.dash-forecast-name {',
    '  font-size: 0.88rem;',
    '  font-weight: 600;',
    '  color: var(--text-primary, #1a1a1a);',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '}',
    '.dash-forecast-conf {',
    '  font-size: 0.68rem;',
    '  padding: 1px 6px;',
    '  border-radius: 8px;',
    '  background: var(--color-sage, #5a7d5c);',
    '  color: #fff;',
    '}',
    '.dash-forecast-tip {',
    '  font-size: 0.75rem;',
    '  color: var(--text-muted, #8a8a8a);',
    '  margin-top: 4px;',
    '  line-height: 1.5;',
    '}',
    '.dash-forecast-loading {',
    '  text-align: center;',
    '  padding: 20px;',
    '  color: var(--text-muted, #8a8a8a);',
    '  font-size: 0.82rem;',
    '}',

    /* 响应式 */
    '@media (max-width: 640px) {',
    '  .dash-stats-row {',
    '    grid-template-columns: repeat(2, 1fr);',
    '  }',
    '  .dash-goal-section {',
    '    flex-direction: column;',
    '    text-align: center;',
    '    gap: 16px;',
    '  }',
    '  .dash-goal-info {',
    '    text-align: center;',
    '  }',
    '  .dash-bioscore {',
    '    flex-direction: column;',
    '    text-align: center;',
    '  }',
    '}',
    '@media (max-width: 480px) {',
    '  .dash-stats-row {',
    '    grid-template-columns: repeat(2, 1fr);',
    '    gap: 8px;',
    '  }',
    '  .dash-stat-card {',
    '    padding: 12px 8px;',
    '  }',
    '  .dash-stat-num {',
    '    font-size: 1.25rem;',
    '  }',
    '}',
    '',
    '/* v4.0 学习 DNA 双画像 */',
    '.dash-dna-section {',
    '  background: var(--surface-primary, #ffffff);',
    '  border-radius: var(--radius-lg, 20px);',
    '  padding: 20px;',
    '  box-shadow: var(--shadow-sm, 0 2px 8px rgba(26,58,42,0.04));',
    '  border: 1px solid var(--border-light, #ece8e1);',
    '}',
    '.dash-dna-canvases {',
    '  display: grid;',
    '  grid-template-columns: 1fr 1fr;',
    '  gap: 16px;',
    '  margin: 12px 0;',
    '}',
    '.dash-dna-canvas-wrap {',
    '  position: relative;',
    '  background: linear-gradient(135deg, #faf7f2 0%, #f5f0e6 100%);',
    '  border-radius: 12px;',
    '  padding: 8px;',
    '  border: 1px solid var(--border-light, #ece8e1);',
    '}',
    '.dash-dna-canvas-wrap canvas {',
    '  width: 100%;',
    '  height: 220px;',
    '  display: block;',
    '}',
    '.dash-dna-canvas-label {',
    '  font-size: 0.78rem;',
    '  font-weight: 600;',
    '  color: var(--text-secondary, #4a4a4a);',
    '  text-align: center;',
    '  padding: 4px 0 2px;',
    '}',
    '.dash-dna-analysis {',
    '  display: grid;',
    '  grid-template-columns: 1fr 1fr;',
    '  gap: 12px;',
    '  font-size: 0.82rem;',
    '  padding: 10px 0;',
    '  border-top: 1px solid var(--border-light, #ece8e1);',
    '}',
    '.dash-dna-analysis-block { padding: 4px 0; }',
    '.dash-dna-analysis-block strong { color: var(--color-deep, #1a3a2a); }',
    '.dash-dna-diagnosis {',
    '  margin-top: 12px;',
    '  padding: 12px 14px;',
    '  background: rgba(196, 149, 106, 0.07);',
    '  border-left: 3px solid var(--color-amber, #c4956a);',
    '  border-radius: 8px;',
    '  font-size: 0.85rem;',
    '  line-height: 1.6;',
    '  color: var(--text-secondary, #4a4a4a);',
    '}',
    '.dash-dna-diagnosis-title {',
    '  font-weight: 600;',
    '  color: var(--color-amber, #c4956a);',
    '  margin-bottom: 4px;',
    '}',
    '.dash-dna-actions {',
    '  display: flex;',
    '  gap: 8px;',
    '  margin-top: 12px;',
    '}',
    '.dash-dna-btn {',
    '  padding: 8px 16px;',
    '  border: 1px solid var(--border-default, #e0dcd5);',
    '  background: var(--surface-primary, #fff);',
    '  color: var(--text-secondary, #4a4a4a);',
    '  border-radius: 10px;',
    '  font-size: 0.82rem;',
    '  font-weight: 500;',
    '  cursor: pointer;',
    '  font-family: inherit;',
    '  transition: all 0.15s ease;',
    '}',
    '.dash-dna-btn:hover {',
    '  border-color: var(--color-amber, #c4956a);',
    '  color: var(--color-amber, #c4956a);',
    '}',
    '.dash-dna-btn--primary {',
    '  background: var(--color-deep, #1a3a2a);',
    '  color: #fff;',
    '  border-color: var(--color-deep, #1a3a2a);',
    '}',
    '.dash-dna-btn--primary:hover {',
    '  background: var(--color-sage, #5a7d5c);',
    '  border-color: var(--color-sage, #5a7d5c);',
    '  color: #fff;',
    '}',
    '.dash-mood-widget {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 14px;',
    '  padding: 12px 16px;',
    '  background: linear-gradient(135deg, #faf7f2 0%, #f0ebe0 100%);',
    '  border-radius: 16px;',
    '  border: 1px solid var(--border-light, #ece8e1);',
    '  margin-bottom: 14px;',
    '}',
    '.dash-mood-widget-icon { font-size: 1.6rem; }',
    '.dash-mood-widget-info { flex: 1; }',
    '.dash-mood-widget-label { font-size: 0.95rem; font-weight: 600; color: var(--color-deep, #1a3a2a); }',
    '.dash-mood-widget-count { font-size: 0.78rem; color: var(--text-muted, #8a8a8a); }',
    '.dash-mood-widget-btn {',
    '  padding: 8px 16px;',
    '  background: var(--color-sage, #5a7d5c);',
    '  color: #fff;',
    '  border: none;',
    '  border-radius: 10px;',
    '  font-size: 0.85rem;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  font-family: inherit;',
    '}',
    '.dash-mood-widget-btn:hover { background: #4a6d4c; }',
    '.dash-stress-card {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 10px;',
    '  padding: 8px 12px;',
    '  background: rgba(196, 149, 106, 0.07);',
    '  border-radius: 10px;',
    '  font-size: 0.82rem;',
    '  margin-top: 8px;',
    '}',
    '@media (max-width: 640px) {',
    '  .dash-dna-canvases { grid-template-columns: 1fr; }',
    '  .dash-dna-analysis { grid-template-columns: 1fr; }',
    '}'
  ].join('\n');
  document.head.appendChild(style);
}

/**
 * 获取用户问候语
 */
function _getGreeting() {
  var h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

/**
 * 从 localStorage 读取用户统计数据
 */
function _getUserStats() {
  try {
    var raw = localStorage.getItem('bioquest_stats');
    if (!raw) return { totalAnswered: 0, totalCorrect: 0, modules: {} };
    var stats = JSON.parse(raw);
    return {
      totalAnswered: stats.totalAnswered || 0,
      totalCorrect: stats.totalCorrect || 0,
      modules: stats.modules || {},
      streak: stats.streak || 0,
      practiceCount: stats.practiceCount || 0
    };
  } catch (e) {
    return { totalAnswered: 0, totalCorrect: 0, modules: {} };
  }
}

/**
 * 读取练习历史（兼容 bioquest_history 和 bioquest_practice_history 两个 key）
 */
function _loadPracticeHistory() {
  var sources = ['bioquest_history', 'bioquest_practice_history', 'bioquest_records'];
  for (var s = 0; s < sources.length; s++) {
    try {
      var raw = localStorage.getItem(sources[s]);
      if (!raw) continue;
      var arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch (e) {}
  }
  return [];
}

/**
 * 归一化一条历史记录，返回 { date:'YYYY-MM-DD', correct, total } 或 null
 */
function _normalizeHistoryEntry(item) {
  if (!item) return null;
  // 解析日期
  var dateStr = item.date || (item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : null);
  if (!dateStr) return null;
  if (dateStr.length > 10) dateStr = dateStr.slice(0, 10);
  // 解析正确数/总数
  var correct = 0, total = 0;
  if (typeof item.correct === 'number' && typeof item.total === 'number') {
    correct = item.correct; total = item.total;
  } else if (typeof item.totalQuestions === 'number' || typeof item.correctCount === 'number') {
    total = item.totalQuestions || 0;
    correct = item.correctCount || 0;
  } else if (Array.isArray(item.answers) && item.answers.length > 0) {
    total = item.answers.length;
    for (var a = 0; a < item.answers.length; a++) {
      if (item.answers[a] && item.answers[a].correct) correct++;
    }
  } else if (typeof item.isCorrect === 'boolean') {
    total = 1;
    correct = item.isCorrect ? 1 : 0;
  } else {
    total = 1; // 至少算作一条练习记录
  }
  return { date: dateStr, correct: correct, total: total };
}

/**
 * 获取今日练习数
 */
function _getTodayCount() {
  try {
    var history = _loadPracticeHistory();
    var todayStr = new Date().toISOString().split('T')[0];
    var count = 0;
    for (var i = 0; i < history.length; i++) {
      var norm = _normalizeHistoryEntry(history[i]);
      if (norm && norm.date === todayStr) {
        count += norm.total || 1;
      }
    }
    return count;
  } catch (e) {
    return 0;
  }
}

/**
 * 获取最近 N 天的练习趋势
 */
function _getTrendData(days) {
  try {
    var history = _loadPracticeHistory();
    // 按日期聚合
    var dayMap = {};
    for (var i = 0; i < history.length; i++) {
      var norm = _normalizeHistoryEntry(history[i]);
      if (!norm) continue;
      if (!dayMap[norm.date]) dayMap[norm.date] = { count: 0, correct: 0 };
      dayMap[norm.date].count += norm.total;
      dayMap[norm.date].correct += norm.correct;
    }
    var now = new Date();
    var result = [];
    for (var d = days - 1; d >= 0; d--) {
      var dt = new Date(now);
      dt.setDate(dt.getDate() - d);
      var dStr = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      var info = dayMap[dStr] || { count: 0, correct: 0 };
      result.push({
        date: dt,
        count: info.count,
        accuracy: info.count > 0 ? Math.round(info.correct / info.count * 100) : 0
      });
    }
    return result;
  } catch (e) {
    return [];
  }
}

/**
 * 获取连续打卡天数（从 bioquest_habit_logs 统计，只要有任意习惯完成即算）
 */
function _getStreak() {
  try {
    var raw = localStorage.getItem('bioquest_habit_logs');
    if (!raw) return 0;
    var logs = JSON.parse(raw);
    if (!Array.isArray(logs)) return 0;
    // 收集所有完成打卡的日期集合
    var completedDates = {};
    for (var i = 0; i < logs.length; i++) {
      if (logs[i].completed && logs[i].date) {
        completedDates[logs[i].date] = true;
      }
    }
    var streak = 0;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    for (var d = 0; d < 365; d++) {
      var dt = new Date(today);
      dt.setDate(dt.getDate() - d);
      var key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      if (completedDates[key]) {
        streak++;
      } else if (d > 0) {
        break;
      }
    }
    return streak;
  } catch (e) {
    return 0;
  }
}

/**
 * 构建 Bio Score 等级颜色
 */
function _getGradeColor(grade) {
  var colors = {
    'S+': '#9d2933', 'S': '#c49a4a', 'A+': '#5a7d5c', 'A': '#5a7bc4',
    'B+': '#6a8ac4', 'B': '#7a9ac4', 'C+': '#8aaac4', 'C': '#9abac4',
    'D+': '#aaa', 'D': '#bbb'
  };
  return colors[grade] || '#5a7d5c';
}

/**
 * 渲染今日目标圆环 SVG
 */
function _renderGoalRing(progress, color) {
  var r = 52;
  var c = 2 * Math.PI * r;
  var offset = c * (1 - progress / 100);
  return '<svg width="120" height="120" viewBox="0 0 120 120">' +
    '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="var(--border-light, #ece8e1)" stroke-width="8"/>' +
    '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="8" ' +
    'stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + offset + '" ' +
    'style="transition:stroke-dashoffset 0.8s ease;"/>' +
    '</svg>';
}

/**
 * 渲染 Bio Score 维度条
 */
function _renderBioScoreBars(components) {
  if (!components) return '';
  var dims = [
    { key: 'B', label: '基础', color: '#5a7d5c' },
    { key: 'I', label: '洞察', color: '#c49a4a' },
    { key: 'O', label: '活跃', color: '#5a7bc4' },
    { key: 'G', label: '成长', color: '#c47a4a' },
    { key: 'C', label: '一致', color: '#8a6ac4' },
    { key: 'D', label: '难度', color: '#4a9c6a' }
  ];
  return dims.map(function(d) {
    var val = Math.round(components[d.key] || 0);
    return '<div class="dash-bioscore-bar" title="' + d.label + ': ' + val + '">' +
      '<div class="dash-bioscore-bar-fill" style="width:' + val + '%;background:' + d.color + ';"></div>' +
      '</div>';
  }).join('');
}

/**
 * 加载考点预测（异步）
 */
function _loadForecast(container) {
  if (!container) return;
  container.innerHTML = '<div class="dash-forecast-loading">🔮 AI 正在分析考点趋势...</div>';

  // 收集用户薄弱模块
  var stats = _getUserStats();
  var weakModules = [];
  Object.keys(stats.modules || {}).forEach(function(key) {
    var m = stats.modules[key];
    var total = m.totalAnswered || 0;
    var correct = m.totalCorrect || 0;
    if (total > 0 && correct / total < 0.6) weakModules.push(key);
  });

  // 本地兜底预测：根据薄弱模块生成，保证静态部署/无后端时仍可展示
  function _buildLocalForecasts() {
    var conceptBank = {
      'module_1': [
        { concept: '蛋白质结构与酶活性', tip: '重点复习一级结构到四级结构的维系键，以及温度、pH 对酶促反应的影响。' },
        { concept: '细胞呼吸与光合作用', tip: '对比有氧呼吸三阶段与光反应、暗反应的物质变化和能量转化。' },
        { concept: '细胞膜物质运输', tip: '区分自由扩散、协助扩散、主动运输和胞吞胞吐的实例与特点。' }
      ],
      'module_2': [
        { concept: '植物激素调节', tip: '掌握生长素两重性及各激素协同/拮抗作用的经典实验。' },
        { concept: '微生物培养与计数', tip: '平板划线法、稀释涂布平板法和菌落计数原则（30-300）。' },
        { concept: '群落与生态系统', tip: '能量流动单向递减、物质循环全球性和信息传递类型。' }
      ],
      'module_3': [
        { concept: '神经调节与体液调节', tip: '反射弧完整性、突触信号传递及负反馈调节实例。' },
        { concept: '免疫调节', tip: '特异性免疫过程、疫苗原理和自身免疫病辨析。' },
        { concept: '生态系统的稳定性', tip: '抵抗力稳定性与恢复力稳定性的关系及影响因素。' }
      ],
      'module_4': [
        { concept: '孟德尔遗传定律', tip: '分离定律和自由组合定律的实质、验证方法及异常分离比。' },
        { concept: '伴性遗传与人类遗传病', tip: '系谱图判断、遗传方式推断及概率计算。' },
        { concept: '现代生物进化理论', tip: '种群基因频率、自然选择作用及物种形成环节。' }
      ]
    };
    var forecasts = [];
    var seen = {};
    weakModules.forEach(function(mod) {
      (conceptBank[mod] || []).forEach(function(item) {
        if (!seen[item.concept]) {
          seen[item.concept] = true;
          forecasts.push({ concept: item.concept, confidence: 0.72, practice_tip: item.tip });
        }
      });
    });
    if (forecasts.length === 0) {
      forecasts = [
        { concept: '细胞代谢综合', confidence: 0.7, practice_tip: '细胞呼吸与光合作用联系紧密，建议通过流程图梳理物质和能量变化。' },
        { concept: '遗传规律应用', confidence: 0.65, practice_tip: '多练系谱图与异常分离比，掌握配子法和分支法。' },
        { concept: '稳态与调节', confidence: 0.6, practice_tip: '神经-体液-免疫调节网络中，反馈调节和信号分子是关键。' }
      ];
    }
    return forecasts.slice(0, 5);
  }

  function _renderForecasts(forecasts) {
    if (!forecasts || forecasts.length === 0) {
      container.innerHTML = '<div class="dash-forecast-loading">暂无预测数据</div>';
      return;
    }
    var html = '<div class="dash-forecast">';
    forecasts.forEach(function(f, i) {
      var conf = Math.round((f.confidence || 0.5) * 100);
      var confColor = conf >= 75 ? '#5a7d5c' : conf >= 50 ? '#c49a4a' : '#aaa';
      html += '<div class="dash-forecast-item" data-on=\'["navigateTo","/practice"]\'>' +
        '<div class="dash-forecast-rank' + (i === 0 ? ' dash-forecast-rank--top' : '') + '">' + (i + 1) + '</div>' +
        '<div class="dash-forecast-info">' +
        '<div class="dash-forecast-name">' + escapeHtml(f.concept || '未知考点') +
        '<span class="dash-forecast-conf" style="background:' + confColor + ';">' + conf + '%</span></div>' +
        '<div class="dash-forecast-tip">' + escapeHtml(f.practice_tip || f.reason || '') + '</div>' +
        '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // 静态部署（无后端 / 用户未配置 AI Key）时直接走本地兜底预测，
  // 避免对 /forecast 发起 POST 触发浏览器 "Failed to load resource: 501" console.error。
  // 注：fetch 的 .catch() 只能吞掉 Promise reject，无法抑制浏览器自动产生的网络错误日志。
  var _hasForecastBackend = (function () {
    try {
      var raw = localStorage.getItem('bioquest_ai_key_config');
      if (raw) {
        var cfg = JSON.parse(raw);
        if (cfg && cfg.apiKey) return true;   // 用户配置了 AI Key → 后端可能可用
      }
    } catch (e) {}
    return false;
  })();

  if (!_hasForecastBackend) {
    _renderForecasts(_buildLocalForecasts());
    return;
  }

  fetch('/forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stats: { weak_modules: weakModules } })
  }).then(function(r) {
    // 非 2xx 响应也尝试解析，解析失败则走兜底
    if (!r.ok) throw new Error('forecast_http_' + r.status);
    return r.json();
  })
    .then(function(data) {
      if (!data.ok || !data.forecasts || data.forecasts.length === 0) {
        _renderForecasts(_buildLocalForecasts());
        return;
      }
      _renderForecasts(data.forecasts.slice(0, 5));
    }).catch(function(err) {
      // 静态部署无后端时：使用本地基于薄弱模块的兜底预测，避免空白与控制台报错
      _renderForecasts(_buildLocalForecasts());
    });
}

/**
 * 主渲染函数
 */
function renderDashboardPage(target) {
  injectDashboardStyles();

  var stats = _getUserStats();
  var todayCount = _getTodayCount();
  var streak = _getStreak();
  var trend = _getTrendData(7);
  var dailyGoal = 20; // 每日目标 20 题
  var goalProgress = Math.min(100, Math.round(todayCount / dailyGoal * 100));

  // 用户名
  var userName = '同学';
  try {
    var user = window.getCurrentUser ? window.getCurrentUser() : null;
    if (user && user.display_name) userName = user.display_name;
  } catch (e) {}

  // Bio Score
  var bioScore = null;
  try {
    if (typeof calcBioScore === 'function') {
      bioScore = calcBioScore(stats);
    }
  } catch (e) {}

  // 模块掌握度排名
  var moduleLabels = {
    'module_1': { name: '生化与细胞', icon: '🧬', color: '#5a7bc4' },
    'module_2': { name: '植物与微生物', icon: '🌱', color: '#5aaa5a' },
    'module_3': { name: '动物与生态', icon: '🐾', color: '#c45a7a' },
    'module_4': { name: '遗传与进化', icon: '🧪', color: '#c47a4a' }
  };
  var weakModules = [];
  Object.keys(moduleLabels).forEach(function(key) {
    var m = stats.modules[key] || {};
    var total = m.totalAnswered || 0;
    var correct = m.totalCorrect || 0;
    var acc = total > 0 ? Math.round(correct / total * 100) : -1;
    if (acc >= 0 && acc < 70) {
      weakModules.push({ key: key, name: moduleLabels[key].name, icon: moduleLabels[key].icon, color: moduleLabels[key].color, acc: acc, total: total });
    }
  });
  weakModules.sort(function(a, b) { return a.acc - b.acc; });
  var topWeak = weakModules.slice(0, 3);

  // 趋势数据
  var hasTrend = trend.some(function(t) { return t.count > 0; });
  var trendMax = Math.max.apply(null, trend.map(function(t) { return t.count; }).concat([1]));
  var recentAcc = 0, recentCount = 0;
  trend.forEach(function(t) { recentAcc += t.accuracy * t.count; recentCount += t.count; });
  var avgAcc = recentCount > 0 ? Math.round(recentAcc / recentCount) : 0;
  var trendDirection = 'stable';
  if (trend.length >= 4) {
    var firstHalf = trend.slice(0, 3).reduce(function(s, t) { return s + t.accuracy; }, 0) / 3;
    var secondHalf = trend.slice(3).reduce(function(s, t) { return s + t.accuracy; }, 0) / (trend.length - 3);
    if (secondHalf > firstHalf + 5) trendDirection = 'up';
    else if (secondHalf < firstHalf - 5) trendDirection = 'down';
  }

  // 构建 HTML
  var html = '<div class="dashboard-page">';

  // 头部（头像：优先 getAvatarUrl()，无头像用首字母兜底）
  var _avatarUrl = (typeof getAvatarUrl === 'function') ? getAvatarUrl() : null;
  var _avatarInner = _avatarUrl
    ? '<img src="' + _avatarUrl + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">'
    : escapeHtml(userName.charAt(0));
  html += '<div class="dash-header">' +
    '<div><h2 class="dash-greeting">' + _getGreeting() + '，' + escapeHtml(userName) + '</h2>' +
    '<p class="dash-date">' + new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) + '</p></div>' +
    '<div class="dash-avatar" data-on=\'["navigateTo","/user"]\' style="' + (_avatarUrl ? 'background:none;' : '') + 'overflow:hidden;">' + _avatarInner + '</div>' +
    '</div>';

  // v4.0 今日情绪卡片（常驻）
  html += '<div id="dash-mood-widget"></div>';

  // 今日目标圆环
  var goalColor = goalProgress >= 100 ? '#5a7d5c' : goalProgress >= 50 ? '#c49a4a' : '#c4a4a4';
  html += '<div class="dash-goal-section">' +
    '<div class="dash-goal-ring">' +
    _renderGoalRing(goalProgress, goalColor) +
    '<div class="dash-goal-center">' +
    '<span class="dash-goal-num">' + todayCount + '/' + dailyGoal + '</span>' +
    '<span class="dash-goal-label">今日目标</span>' +
    '</div></div>' +
    '<div class="dash-goal-info">' +
    '<div class="dash-goal-title">' + (goalProgress >= 100 ? '今日目标已完成' : '继续努力，完成今日目标') + '</div>' +
    '<div class="dash-goal-desc">每日练习 ' + dailyGoal + ' 题，巩固知识点，稳步提升</div>' +
    (goalProgress >= 100 ?
      '<button class="dash-goal-btn dash-goal-btn--outline" data-on=\'["navigateTo","/practice"]\'>再来一组</button>' :
      '<button class="dash-goal-btn" data-on=\'["navigateTo","/practice"]\'>开始练习</button>') +
    '</div></div>';

  // 横向统计卡
  var accuracy = stats.totalAnswered > 0 ? Math.round(stats.totalCorrect / stats.totalAnswered * 100) : 0;
  html += '<div class="dash-stats-row">' +
    '<div class="dash-stat-card dash-stat-card--accent" data-on=\'["navigateTo","/habits"]\'>' +
    '<div class="dash-stat-num">' + streak + '</div><div class="dash-stat-label">连续打卡</div></div>' +
    '<div class="dash-stat-card" data-on=\'["navigateTo","/analytics"]\'>' +
    '<div class="dash-stat-num">' + stats.totalAnswered + '</div><div class="dash-stat-label">总答题数</div></div>' +
    '<div class="dash-stat-card dash-stat-card--amber" data-on=\'["navigateTo","/analytics"]\'>' +
    '<div class="dash-stat-num">' + accuracy + '%</div><div class="dash-stat-label">正确率</div></div>' +
    '<div class="dash-stat-card" data-on=\'["navigateTo","/analytics"]\'>' +
    '<div class="dash-stat-num">' + (bioScore ? bioScore.score : '--') + '</div><div class="dash-stat-label">Bio Score</div></div>' +
    '</div>';

  // Bio Score 详情
  if (bioScore) {
    html += '<div class="dash-section">' +
      '<div class="dash-section-header">' +
      '<span class="dash-section-title">Bio Score 生物素养</span>' +
      '<span class="dash-section-link" data-on=\'["navigateTo","/analytics"]\'>详情 ›</span>' +
      '</div>' +
      '<div class="dash-bioscore">' +
      '<div class="dash-bioscore-grade" style="background:' + _getGradeColor(bioScore.grade) + ';">' + escapeHtml(bioScore.grade) + '</div>' +
      '<div class="dash-bioscore-info">' +
      '<div class="dash-bioscore-score">' + bioScore.score + '</div>' +
      '<div class="dash-bioscore-label">' + escapeHtml(bioScore.letter || '') + ' · 六维综合评分</div>' +
      '<div class="dash-bioscore-bars">' + _renderBioScoreBars(bioScore.components) + '</div>' +
      '</div></div></div>';
  }

  // 诊断摘要 - 薄弱模块
  if (topWeak.length > 0) {
    html += '<div class="dash-section">' +
      '<div class="dash-section-header">' +
      '<span class="dash-section-title">薄弱模块诊断</span>' +
      '<span class="dash-section-link" data-on=\'["navigateTo","/diagnosis"]\'>完整诊断 ›</span>' +
      '</div>' +
      '<div class="dash-weak-list">';
    topWeak.forEach(function(m) {
      var accColor = m.acc < 40 ? '#c45a5a' : m.acc < 60 ? '#c49a4a' : '#5a7d5c';
      html += '<div class="dash-weak-item" data-on=\'["navigateTo","/practice"]\'>' +
        '<div class="dash-weak-icon" style="background:' + m.color + '22;color:' + m.color + ';">' + m.icon + '</div>' +
        '<div class="dash-weak-info"><div class="dash-weak-name">' + escapeHtml(m.name) + '</div>' +
        '<div class="dash-weak-desc">' + m.total + '题已练 · 建议加强</div></div>' +
        '<div class="dash-weak-acc" style="color:' + accColor + ';">' + m.acc + '%</div>' +
        '</div>';
    });
    html += '</div></div>';
  }

  // v4.0 学习 DNA + 情绪 DNA 双画像
  html += '<div class="dash-section">' +
    '<div class="dash-section-header">' +
    '<span class="dash-section-title">🧬 学习 DNA 双画像</span>' +
    '<span class="dash-section-link" id="dash-dna-share-btn">分享卡片 ›</span>' +
    '</div>' +
    '<div class="dash-dna-section">' +
    '<div class="dash-dna-canvases">' +
    '<div class="dash-dna-canvas-wrap">' +
    '<canvas id="dash-dna-learning" width="280" height="220" aria-label="学习 DNA 双螺旋"></canvas>' +
    '<div class="dash-dna-canvas-label">🧬 学习 DNA（左链） + 💚 情绪 DNA（右链）</div>' +
    '</div>' +
    '</div>' +
    '<div class="dash-dna-analysis" id="dash-dna-analysis">' +
    '<div class="dash-dna-analysis-block">完整度: <strong id="dash-dna-completeness">--</strong></div>' +
    '<div class="dash-dna-analysis-block">互补度: <strong id="dash-dna-complementarity">--</strong></div>' +
    '<div class="dash-dna-analysis-block">最强模块: <strong id="dash-dna-strongest">--</strong></div>' +
    '<div class="dash-dna-analysis-block">最弱模块: <strong id="dash-dna-weakest">--</strong></div>' +
    '<div class="dash-dna-analysis-block">情绪积极度: <strong id="dash-dna-positivity">--</strong></div>' +
    '<div class="dash-dna-analysis-block">压力指数: <strong id="dash-dna-stress">--</strong></div>' +
    '</div>' +
    '<div class="dash-dna-diagnosis" id="dash-dna-diagnosis" style="display:none;">' +
    '<div class="dash-dna-diagnosis-title">💡 AI 诊断</div>' +
    '<div id="dash-dna-diagnosis-text"></div>' +
    '</div>' +
    '<div class="dash-dna-actions">' +
    '<button type="button" class="dash-dna-btn dash-dna-btn--primary" id="dash-dna-mood-btn">📝 情绪打卡</button>' +
    '<button type="button" class="dash-dna-btn" id="dash-dna-share-btn-2">📤 生成分享卡片</button>' +
    '</div>' +
    '</div>' +
    '</div>';

  // 今日计划
  html += '<div class="dash-section">' +
    '<div class="dash-section-header">' +
    '<span class="dash-section-title">今日计划</span>' +
    '</div>' +
    '<div class="dash-plan-list">' +
    '<div class="dash-plan-item" data-on=\'["navigateTo","/practice"]\'>' +
    '<span class="dash-plan-icon">📝</span>' +
    '<div class="dash-plan-info"><div class="dash-plan-title">每日练习</div>' +
    '<div class="dash-plan-desc">完成 ' + Math.max(0, dailyGoal - todayCount) + ' 题达到今日目标</div></div>' +
    '<span class="dash-plan-arrow">›</span></div>' +
    '<div class="dash-plan-item" data-on=\'["navigateTo","/review"]\'>' +
    '<span class="dash-plan-icon">🔁</span>' +
    '<div class="dash-plan-info"><div class="dash-plan-title">复习错题</div>' +
    '<div class="dash-plan-desc">基于遗忘曲线的智能复习</div></div>' +
    '<span class="dash-plan-arrow">›</span></div>';
  if (topWeak.length > 0) {
    html += '<div class="dash-plan-item" data-on=\'["navigateTo","/practice"]\' style="border-left-color:#c45a5a;">' +
      '<span class="dash-plan-icon">🎯</span>' +
      '<div class="dash-plan-info"><div class="dash-plan-title">专项突破</div>' +
      '<div class="dash-plan-desc">针对「' + escapeHtml(topWeak[0].name) + '」进行强化训练</div></div>' +
      '<span class="dash-plan-arrow">›</span></div>';
  }
  html += '</div></div>';

  // 7天趋势
  if (hasTrend) {
    html += '<div class="dash-section">' +
      '<div class="dash-section-header">' +
      '<span class="dash-section-title">近 7 天趋势</span>' +
      '<span class="dash-section-link" data-on=\'["navigateTo","/analytics"]\'>详情 ›</span>' +
      '</div>' +
      '<div class="dash-trend-chart">';
    trend.forEach(function(t) {
      var h = t.count > 0 ? Math.max(8, Math.round(t.count / trendMax * 72)) : 2;
      var color = t.accuracy >= 70 ? '#5a7d5c' : t.accuracy >= 50 ? '#c49a4a' : '#c4a4a4';
      if (t.count === 0) color = 'var(--border-light, #ece8e1)';
      var label = t.date.toLocaleDateString('zh-CN', { weekday: 'short' }).slice(1);
      html += '<div class="dash-trend-bar" style="height:' + h + 'px;background:' + color + ';" ' +
        'title="' + label + ': ' + t.count + '题, 正确率' + t.accuracy + '%">' +
        '<span class="dash-trend-bar-label">' + label + '</span></div>';
    });
    html += '</div>' +
      '<div class="dash-trend-summary">' +
      '<span style="font-size:0.82rem;color:var(--text-muted);">平均正确率 <strong style="color:var(--color-deep);">' + avgAcc + '%</strong></span>' +
      '<span class="dash-trend-trend" style="color:' + (trendDirection === 'up' ? '#5a7d5c' : trendDirection === 'down' ? '#c45a5a' : 'var(--text-muted)') + ';">' +
      (trendDirection === 'up' ? '↗ 上升中' : trendDirection === 'down' ? '↘ 需加油' : '→ 稳定') + '</span>' +
      '</div></div>';
  } else {
    html += '<div class="dash-section">' +
      '<div class="dash-empty">' +
      '<div class="dash-empty-icon">📊</div>' +
      '<div class="dash-empty-text">开始练习后，这里会展示你的学习趋势</div>' +
      '<button class="dash-goal-btn" data-on=\'["navigateTo","/practice"]\'>立即开始</button>' +
      '</div></div>';
  }

  // AI 考点预测
  html += '<div class="dash-section">' +
    '<div class="dash-section-header">' +
    '<span class="dash-section-title">🔮 AI 考点预测</span>' +
    '<span class="dash-section-link" data-on=\'["navigateTo","/practice"]\'>去练习 ›</span>' +
    '</div>' +
    '<div id="dash-forecast-container"></div>' +
    '</div>';

  html += '</div>'; // .dashboard-page
  target.innerHTML = html;

  // 异步加载考点预测
  _loadForecast(document.getElementById('dash-forecast-container'));

  // v4.0 渲染情绪卡片 + 学习 DNA 双画像
  _renderMoodWidget();
  _renderDNAPortrait(stats, bioScore);
}

/**
 * v4.0 渲染情绪卡片
 */
function _renderMoodWidget() {
  var container = document.getElementById('dash-mood-widget');
  if (!container) return;
  if (!window.BioQuestMoodTracker || typeof window.BioQuestMoodTracker.renderMoodWidget !== 'function') {
    container.innerHTML = '';
    return;
  }
  try {
    window.BioQuestMoodTracker.renderMoodWidget(container);
  } catch (e) {
    container.innerHTML = '';
  }
}

/**
 * v4.0 渲染学习 DNA + 情绪 DNA 双画像
 */
function _renderDNAPortrait(stats, bioScore) {
  if (!window.LearningDNA) return;
  var canvas = document.getElementById('dash-dna-learning');
  if (!canvas) return;

  try {
    // 1. 学习 DNA
    var learning = window.LearningDNA.buildFromUserStats(stats);
    var learningAnalysis = window.LearningDNA.analyzeLearningDNA(learning.dna);

    // 2. 情绪 DNA
    var moodLogs = [];
    if (window.BioQuestMoodTracker && typeof window.BioQuestMoodTracker.getRecentLogs === 'function') {
      moodLogs = window.BioQuestMoodTracker.getRecentLogs(8);
    }
    var mood = window.LearningDNA.buildFromMoodLogs(moodLogs);
    var moodAnalysis = window.LearningDNA.analyzeMoodDNA(mood.dna);

    // 3. 互补度
    var complementarity = window.LearningDNA.computeComplementarity(learning.dna, mood.dna);

    // 4. 压力指数
    var stressIndex = 0;
    if (window.BioQuestMoodTracker && typeof window.BioQuestMoodTracker.computeStressIndex === 'function') {
      var recentAcc = stats.totalAnswered > 0 ? (stats.totalCorrect / stats.totalAnswered) : 0.7;
      stressIndex = window.BioQuestMoodTracker.computeStressIndex(moodLogs, recentAcc, 120);
    }
    var stressLevel = window.BioQuestMoodTracker && window.BioQuestMoodTracker.getStressLevel
      ? window.BioQuestMoodTracker.getStressLevel(stressIndex)
      : { label: '--', color: '#888' };

    // 5. 渲染双螺旋
    window.LearningDNA.renderDoubleHelix(canvas, learning.dna, mood.dna, {
      label1: '🧬 学习',
      label2: '💚 情绪'
    });

    // 6. 填充分析数据
    _setText('dash-dna-completeness', learningAnalysis.completeness + '%');
    _setText('dash-dna-complementarity', Math.round(complementarity * 100) + '%');
    _setText('dash-dna-strongest', learningAnalysis.strongest ? learningAnalysis.strongest.label : '--');
    _setText('dash-dna-weakest', learningAnalysis.weakest ? learningAnalysis.weakest.label : '--');
    _setText('dash-dna-positivity', moodAnalysis.positivity + '%');
    var stressEl = document.getElementById('dash-dna-stress');
    if (stressEl) {
      stressEl.textContent = stressIndex + '（' + stressLevel.label + '）';
      stressEl.style.color = stressLevel.color;
    }

    // 7. AI 诊断
    var diagnosis = window.LearningDNA.generateDiagnosis(learningAnalysis, moodAnalysis, complementarity);
    if (diagnosis) {
      var diagEl = document.getElementById('dash-dna-diagnosis');
      var diagText = document.getElementById('dash-dna-diagnosis-text');
      if (diagEl) diagEl.style.display = 'block';
      if (diagText) diagText.textContent = diagnosis;
    }

    // 8. 分享卡片按钮
    function triggerShare() {
      try {
        var userName = '同学';
        try {
          var user = window.getCurrentUser ? window.getCurrentUser() : null;
          if (user && user.display_name) userName = user.display_name;
        } catch (e) {}
        var grade = bioScore ? bioScore.grade : '';
        window.LearningDNA.downloadShareCard({
          userName: userName,
          grade: grade,
          learningDNA: learning.dna,
          moodDNA: mood.dna,
          learningAnalysis: learningAnalysis,
          moodAnalysis: moodAnalysis,
          complementarity: complementarity,
          diagnosis: diagnosis
        });
      } catch (e) {
        console.warn('[Dashboard] share card failed:', e && e.message);
      }
    }
    var shareBtn1 = document.getElementById('dash-dna-share-btn');
    var shareBtn2 = document.getElementById('dash-dna-share-btn-2');
    if (shareBtn1) shareBtn1.addEventListener('click', triggerShare);
    if (shareBtn2) shareBtn2.addEventListener('click', triggerShare);

    // 9. 情绪打卡按钮
    var moodBtn = document.getElementById('dash-dna-mood-btn');
    if (moodBtn) {
      moodBtn.addEventListener('click', function () {
        if (window.BioQuestMoodTracker && typeof window.BioQuestMoodTracker.showCheckinModal === 'function') {
          var hour = new Date().getHours();
          var period = hour < 12 ? 'morning' : (hour < 18 ? 'noon' : 'evening');
          window.BioQuestMoodTracker.showCheckinModal({
            period: period,
            onSubmitted: function () {
              _renderMoodWidget();
              _renderDNAPortrait(stats, bioScore);
            }
          });
        }
      });
    }
  } catch (e) {
    console.warn('[Dashboard] DNA portrait render failed:', e && e.message);
  }
}

function _setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

/**
 * 模块入口
 */
function initDashboard(target) {
  if (!target) target = document.getElementById('page-content');
  if (!target) return;
  // P0-3: 先用 localStorage 即时渲染（首屏体验），再异步从 Supabase 刷新
  renderDashboardPage(target);
  _refreshDashboardFromSupabase(target);
}

/**
 * P0-3: 异步从 Supabase 拉取最新统计并刷新仪表盘
 * - 仅当用户已登录（非游客）时触发
 * - 拉取失败静默回退（首屏已用 localStorage 渲染）
 * - 拉取成功后更新 localStorage 缓存并重新渲染
 */
async function _refreshDashboardFromSupabase(target) {
  if (!target) return;
  // P0-3: 仅当 Supabase SDK 可用且用户已登录时才走云端，否则回退 localStorage
  if (typeof window.supabase === 'undefined') return;
  var loggedIn = false;
  try { loggedIn = typeof window.isLoggedIn === 'function' && window.isLoggedIn(); } catch (e) {}
  if (!loggedIn) return;
  if (typeof window.getUserStatsFromSupabase !== 'function') return;

  try {
    // 并行拉取三项数据
    var tasks = [
      window.getUserStatsFromSupabase(),
      (typeof window.getPracticeHistoryFromSupabase === 'function')
        ? window.getPracticeHistoryFromSupabase(200) : Promise.resolve(null),
      (typeof window.getHabitLogsFromSupabase === 'function')
        ? window.getHabitLogsFromSupabase() : Promise.resolve(null)
    ];
    var results = await Promise.all(tasks);
    var stats = results[0];
    var history = results[1];
    var habitLogs = results[2];

    // 如果 Supabase 没有任何数据（新用户/未迁移），保留 localStorage 不覆盖
    if (stats === null && history === null && habitLogs === null) return;

    // 把 Supabase 历史写入 localStorage 缓存（供 _loadPracticeHistory 读取）
    if (history && history.length > 0) {
      try { localStorage.setItem('bioquest_history', JSON.stringify(history)); } catch (e) {}
    }
    // 把 Supabase 打卡日志写入 localStorage 缓存（供 _getStreak 读取）
    if (habitLogs && habitLogs.length > 0) {
      try { localStorage.setItem('bioquest_habit_logs', JSON.stringify(habitLogs)); } catch (e) {}
    }

    // 重新渲染（getUserStatsFromSupabase 已写入 localStorage 'bioquest_stats'）
    // 仅当目标元素仍是当前仪表盘时才刷新，避免路由切换后误刷
    var hash = window.location.hash || '';
    var currentPage = hash.replace(/^#/, '').split('?')[0] || '/';
    if (currentPage === '/dashboard' || currentPage === '/') {
      renderDashboardPage(target);
    }
  } catch (e) {
    console.warn('[dashboard] Supabase 刷新失败，使用本地数据:', e && e.message);
  }
}

// 暴露到全局
window.initDashboard = initDashboard;
window.renderDashboardPage = renderDashboardPage;
