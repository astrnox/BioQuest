/**
 * ============================================
 * 倒计时功能
 * ============================================
 */
(function() {
  const TARGET_DATE = new Date('2026-08-16T09:00:00+08:00');
  let timer = null;

  function pad(num) {
    return String(num).padStart(2, '0');
  }

  // 目标日期已过：归零会一直是「00天00时00分00秒」且每秒空转，
  // 这里切换为「下一届备考期」文案、隐藏数字区并停掉定时器。
  function showExpired() {
    const banner = document.querySelector('.countdown-banner');
    if (banner) {
      const label = banner.querySelector('.countdown-label');
      const date = banner.querySelector('.countdown-date');
      const digits = banner.querySelector('.countdown-digits');
      if (label) label.textContent = '下一届全国中学生生物学联赛';
      if (date) date.textContent = '备考期 · 具体日期待官方公布';
      if (digits) digits.style.display = 'none';
    }
  }

  function update() {
    const diff = TARGET_DATE - new Date();
    if (diff <= 0) {
      showExpired();
      if (timer) { clearInterval(timer); timer = null; }
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');
    const secsEl = document.getElementById('cd-secs');

    if (daysEl) daysEl.textContent = pad(days);
    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minsEl) minsEl.textContent = pad(mins);
    if (secsEl) secsEl.textContent = pad(secs);
  }

  update();
  if (timer === null && TARGET_DATE - Date.now() > 0) {
    timer = setInterval(update, 1000);
  }
})();
