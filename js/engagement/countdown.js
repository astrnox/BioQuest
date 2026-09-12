/**
 * ============================================
 * 倒计时功能
 * ============================================
 */
(function() {
  const TARGET_DATE = new Date('2026-08-16T09:00:00+08:00');

  function pad(num) {
    return String(num).padStart(2, '0');
  }

  function update() {
    const now = new Date();
    const diff = Math.max(0, TARGET_DATE - now);

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
  setInterval(update, 1000);
})();
