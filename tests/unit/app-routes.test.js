/**
 * TATABOX — P1-2 / P3-5：路由配置表（js/core/app-routes.js）单元测试
 *
 * 覆盖：
 *   1. 独立文件存在且定义全局 Routes（拆分自 app.js，P1-2）；
 *   2. P3-5 去重：/points-leaderboard 通过 redirect 指向规范 URL /credit-leaderboard，
 *      规范 URL 仍各自渲染 renderCreditLeaderboardPage（仅保留一个渲染入口）；
 *   3. 所有 redirect 目标必须存在于 Routes 中（避免死链/白屏）；
 *   4. app.js 不再重复声明 `const Routes`（避免与独立文件重复声明的 SyntaxError）。
 */

const fs = require('fs');
const path = require('path');

const ROUTES_SRC = path.join(__dirname, '..', '..', 'js', 'core', 'app-routes.js');
const APP_SRC = path.join(__dirname, '..', '..', 'js', 'core', 'app.js');

const routesSource = fs.readFileSync(ROUTES_SRC, 'utf8');
const appSource = fs.readFileSync(APP_SRC, 'utf8');

// 在沙箱中加载 app-routes.js，取出 Routes（顶层 const 会遮蔽全局，故用 eval 捕获返回值）
let Routes;
{
  const capture = new Function('const RoutesMarker = {}; ' + routesSource.replace(/^const Routes/, 'var Routes') + '; return Routes;');
  Routes = capture();
}

describe('P1-2 拆分：Routes 独立文件', () => {
  test('app-routes.js 定义独立的路由表（不含 undefined 属性）', () => {
    expect(Routes).toBeDefined();
    expect(typeof Routes).toBe('object');
    expect(Routes['/']).toBeDefined();
    // /admin 改为「登录即可进入 + 页内管理员密钥验证」：
    // role 门禁会挡住持密钥的非 admin 账号（见 migration_v11_admin_auth.sql）
    expect(Routes['/admin'].auth).toBe(true);
    expect(Routes['/admin'].role).toBeUndefined();
  });

  test('app.js 不再重复声明 const Routes（避免跨脚本重复声明）', () => {
    expect(appSource).not.toMatch(/const Routes\s*=\s*\{/);
  });

  test('邮件重置落地页 /reset-password 已注册（否则 #/reset-password 会被回退到首页）', () => {
    expect(Routes['/reset-password']).toBeDefined();
    expect(Routes['/reset-password'].render).toBe('renderResetPasswordPage');
    // 恢复会话是异步的，不能按"未登录"拦截，否则用户点邮件链接会落到"请先登录"
    expect(Routes['/reset-password'].auth).toBeUndefined();
  });
});

describe('P3-5 重复路由去重', () => {
  test('/points-leaderboard 通过 redirect 指向 /credit-leaderboard', () => {
    expect(Routes['/points-leaderboard']).toBeDefined();
    expect(Routes['/points-leaderboard'].redirect).toBe('/credit-leaderboard');
    expect(Routes['/points-leaderboard'].render).toBeUndefined();
  });

  test('规范 URL /credit-leaderboard 保留渲染入口', () => {
    expect(Routes['/credit-leaderboard'].render).toBe('renderCreditLeaderboardPage');
  });

  test('renderCreditLeaderboardPage 只被一个规范路由使用', () => {
    const users = Object.keys(Routes).filter(function (r) {
      return Routes[r].render === 'renderCreditLeaderboardPage';
    });
    expect(users).toEqual(['/credit-leaderboard']);
  });
});

describe('路由表自洽性', () => {
  test('所有 redirect 目标都存在于 Routes 中', () => {
    Object.keys(Routes).forEach(function (route) {
      const r = Routes[route];
      if (r && r.redirect) {
        expect(Routes[r.redirect]).toBeDefined();
      }
    });
  });
});