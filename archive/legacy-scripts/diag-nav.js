/**
 * 诊断 mobile-nav 在 dark 模式下背景为何仍是白色
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-features=site-per-process'] });
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 800 },
    colorScheme: 'light',  // 关键：不用 dark colorScheme，仅靠 data-theme
    bypassCSP: true
  });
  // 拦截 sw.js 不让注册
  await ctx.route('**/sw.js', route => route.abort());
  // 也拦截 manifest 避免影响
  await ctx.addInitScript(() => {
    // 阻止 SW 注册
    if ('serviceWorker' in navigator) {
      const orig = navigator.serviceWorker.register.bind(navigator.serviceWorker);
      navigator.serviceWorker.register = function() {
        return Promise.reject(new Error('blocked'));
      };
    }
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
    }, { once: true });
  });

  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1000);

  // 打开汉堡
  await page.locator('#hamburgerBtn').first().click().catch(() => {});
  await page.waitForTimeout(800);

  // 用 getMatchedCSSRules（已废弃但 chromium 仍支持）获取所有匹配规则
  const allMatched = await page.evaluate(() => {
    const nav = document.querySelector('.mobile-nav');
    if (!nav) return { err: 'no nav' };
    const rules = [];
    // getMatchedCSSRules 已废弃，但 Playwright chromium 仍支持
    if (typeof window.getMatchedCSSRules === 'function') {
      const list = window.getMatchedCSSRules(nav, '');
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        const cssText = r.style.cssText;
        if (cssText.includes('background')) {
          rules.push({
            selector: r.selectorText,
            cssText: cssText,
            href: r.parentStyleSheet ? (r.parentStyleSheet.href || 'inline').split('/').pop() : null
          });
        }
      }
      return { method: 'getMatchedCSSRules', rules };
    }
    return { method: 'unavailable' };
  });
  console.log('allMatched bg rules:', JSON.stringify(allMatched, null, 2));

  // 决定性测试：注入一个新 <style>，用最高优先级设置 nav 背景
  const decisive = await page.evaluate(() => {
    const nav = document.querySelector('.mobile-nav');
    if (!nav) return { err: 'no nav' };

    // 测试 1：注入 !important 规则
    const style = document.createElement('style');
    style.textContent = '.mobile-nav { background-color: rgb(30, 37, 33) !important; }';
    document.head.appendChild(style);
    const afterImportant = getComputedStyle(nav).backgroundColor;
    style.remove();
    const afterRemove = getComputedStyle(nav).backgroundColor;

    // 测试 2：检查 nav 是否真的匹配 .mobile-nav 选择器（用 matches）
    const matchesSelf = nav.matches('.mobile-nav');
    const matchesActive = nav.matches('.mobile-nav.active');

    // 测试 3：检查 nav 在 DOM 里的位置
    const path = [];
    let el = nav;
    while (el && el !== document.documentElement) {
      path.push(el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + (typeof el.className === 'string' ? el.className.replace(/\s+/g, '.') : '') : ''));
      el = el.parentElement;
    }
    path.push('HTML');

    return {
      afterImportant,
      afterRemove,
      matchesSelf,
      matchesActive,
      domPath: path
    };
  });
  console.log('decisive test:', JSON.stringify(decisive, null, 2));

  const diag = await page.evaluate(() => {
    const html = document.documentElement;
    const htmlTheme = html.getAttribute('data-theme');
    const rootVar = getComputedStyle(html).getPropertyValue('--color-surface').trim();
    const rootBgVar = getComputedStyle(html).getPropertyValue('--color-bg').trim();

    const nav = document.querySelector('.mobile-nav');
    if (!nav) return { err: 'no mobile-nav' };
    const cs = getComputedStyle(nav);
    const bg = cs.backgroundColor;
    const bgImage = cs.backgroundImage;
    // dump 所有 background 相关 computed 属性
    const bgProps = {};
    ['background', 'background-color', 'background-image', 'background-attachment', 'background-clip', 'background-origin', 'background-position', 'background-repeat', 'background-size'].forEach(p => {
      bgProps[p] = cs.getPropertyValue(p);
    });

    // 检查 nav 自身的 --color-surface 解析值，以及父元素链
    const navSelfVar = cs.getPropertyValue('--color-surface').trim();
    const navParent = nav.parentElement;
    const parentVar = navParent ? getComputedStyle(navParent).getPropertyValue('--color-surface').trim() : null;
    const parentTag = navParent ? navParent.tagName + '.' + navParent.className : null;

    // 检查 body 的 --color-surface
    const bodyVar = getComputedStyle(document.body).getPropertyValue('--color-surface').trim();

    // 用 getMatchedCSSRules 等价方式：遍历 document.styleSheets 找匹配 .mobile-nav 的规则
    const matchingRules = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { matchingRules.push({ sheet: sheet.href, error: 'inaccessible' }); continue; }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (rule.selectorText && rule.selectorText.includes('.mobile-nav') && !rule.selectorText.includes('-')) {
          matchingRules.push({
            sheet: (sheet.href || 'inline').split('/').pop(),
            selector: rule.selectorText,
            bg: rule.style.backgroundColor || rule.style.background || '(unset)'
          });
        }
      }
    }

    // 检查 nav 上是否有 inline style
    const inlineStyle = nav.getAttribute('style');
    const cssText = nav.style.cssText;
    // 检查 nav 的 outerHTML 前 500 字符
    const outerHtmlStart = nav.outerHTML.substring(0, 400);

    // 检查 nav 的 class
    const navClass = nav.className;

    // 检查 mobile-nav 是否在 .active 状态
    const isActive = nav.classList.contains('active');

    // 检查所有 styleSheets 中匹配 .mobile-nav 的规则（包括 media query 内的）
    const navMatchingRules = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      function walk(ruleList, sheetHref) {
        for (const rule of Array.from(ruleList)) {
          if (rule.cssRules && rule.type === CSSRule.MEDIA_RULE) {
            walk(rule.cssRules, sheetHref);
            continue;
          }
          if (rule.selectorText) {
            // 匹配任何包含 mobile-nav 的选择器
            if (rule.selectorText.includes('mobile-nav')) {
              const sels = rule.selectorText.split(',').map(s => s.trim());
              // 只记录有 background/background-color 的规则
              const bgDecl = rule.style.backgroundColor || rule.style.background;
              if (bgDecl) {
                navMatchingRules.push({
                  sheet: (sheetHref || 'inline').split('/').pop(),
                  selector: rule.selectorText,
                  bg: bgDecl
                });
              }
            }
          }
        }
      }
      walk(rules, sheet.href);
    }

    // 检查所有 inline styleSheets 的内容
    const inlineSheets = [];
    for (const sheet of Array.from(document.styleSheets)) {
      if (sheet.href) continue; // 只看 inline
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (rule.selectorText && rule.selectorText.includes('mobile-nav')) {
          const bgDecl = rule.style.backgroundColor || rule.style.background;
          if (bgDecl) {
            inlineSheets.push({
              selector: rule.selectorText,
              bg: bgDecl,
              ownerNode: sheet.ownerNode ? sheet.ownerNode.tagName : null
            });
          }
        }
      }
    }

    return {
      htmlTheme,
      rootVar_color_surface: rootVar,
      rootVar_color_bg: rootBgVar,
      navBg: bg,
      navBgImage: bgImage,
      bgProps,
      navSelfVar_color_surface: navSelfVar,
      parentTag,
      parentVar_color_surface: parentVar,
      bodyVar_color_surface: bodyVar,
      navClass,
      isActive,
      inlineStyle,
      cssText,
      outerHtmlStart,
      inlineSheets,
      matchingRules: navMatchingRules,
      sheetCount: document.styleSheets.length,
      sheetHrefs: Array.from(document.styleSheets).map(s => (s.href || 'inline').split('/').pop())
    };
  });

  console.log(JSON.stringify(diag, null, 2));

  // 第二阶段诊断：手动设置 nav 背景看是否生效
  const test = await page.evaluate(() => {
    const nav = document.querySelector('.mobile-nav');
    if (!nav) return { err: 'no nav' };
    // 先读取初始
    const before = getComputedStyle(nav).backgroundColor;
    // 设置 inline style
    nav.style.backgroundColor = 'rgb(30, 37, 33)';
    const after = getComputedStyle(nav).backgroundColor;
    // 清除
    nav.style.backgroundColor = '';
    const cleared = getComputedStyle(nav).backgroundColor;
    // 直接设置 var
    nav.style.backgroundColor = 'var(--color-surface)';
    const withVar = getComputedStyle(nav).backgroundColor;
    nav.style.backgroundColor = '';
    return { before, after, cleared, withVar };
  });
  console.log('inline-test:', JSON.stringify(test, null, 2));

  await browser.close();
})();
