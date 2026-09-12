/**
 * ============================================================
 * BioQuest — Hero 粒子动画 "Cytoplasmic Drift"（纯 CSS 实现）
 * ============================================================
 * 算法哲学：生命的流动
 *  - 粒子沿随机轨迹漂移（模拟细胞质流动）
 *  - 粒子有生命周期，老化后于边缘重生（细胞生命周期）
 *  - Trae 设计色：鼠尾草绿 / 琥珀橙 / 橄榄 / 米色
 *  - 加性混合：粒子重叠处自然发光
 *
 * 注：原 p5.js Perlin 噪声流场版本已移除（p5.js CDN 依赖过重），
 *     改为纯 CSS 动画兜底方案，零外部依赖，首屏更轻。
 * ============================================================
 */

'use strict';

var __heroSketch = null;

function initHeroSketch() {
  if (__heroSketch) return;
  var container = document.getElementById('heroCanvas');
  if (!container || container.offsetWidth === 0) return;

  container.innerHTML = '';
  container.style.position = 'relative';
  container.style.overflow = 'hidden';

  var count = 35;
  for (var i = 0; i < count; i++) {
    var dot = document.createElement('div');
    var size = Math.random() * 5 + 2;
    var palette = [
      'rgba(90,125,92,0.6)',     // sage
      'rgba(196,149,106,0.6)',   // amber
      'rgba(139,168,136,0.55)',  // olive
      'rgba(212,165,116,0.55)'   // amber-light
    ];
    var color = palette[Math.floor(Math.random() * palette.length)];
    var isLarge = Math.random() > 0.85;
    if (isLarge) size *= 1.8;
    dot.style.cssText = [
      'position:absolute',
      'width:' + size + 'px',
      'height:' + size + 'px',
      'border-radius:50%',
      'left:' + (Math.random() * 100) + '%',
      'top:' + (Math.random() * 100) + '%',
      'background:' + color,
      'animation:heroFloat ' + (Math.random() * 7 + 7) + 's ease-in-out infinite',
      'animation-delay:' + (Math.random() * -12) + 's',
      'pointer-events:none',
      'box-shadow:0 0 ' + (size * (isLarge ? 4 : 2)) + 'px ' + color
    ].join(';');
    container.appendChild(dot);
  }

  if (!document.getElementById('hero-fallback-style')) {
    var style = document.createElement('style');
    style.id = 'hero-fallback-style';
    style.textContent =
      '@keyframes heroFloat {' +
      '  0%,100% { transform: translate(0,0) scale(1); opacity:0.45; }' +
      '  33% { transform: translate(14px,-10px) scale(1.18); opacity:0.85; }' +
      '  66% { transform: translate(-10px,12px) scale(0.88); opacity:0.6; }' +
      '}';
    document.head.appendChild(style);
  }

  __heroSketch = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeroSketch);
} else {
  setTimeout(initHeroSketch, 100);
}
