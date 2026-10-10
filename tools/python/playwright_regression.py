"""
TATABOX 回归测试：验证关键路由可加载、控制台无致命错误、
dashboard 核心区块、虚拟实验室参数控件等核心功能。
"""
from playwright.sync_api import sync_playwright, expect
import sys

BASE_URL = "http://localhost:8000"
ROUTES = [
    "/",
    "/dashboard",
    "/practice",
    "/exam",
    "/bio-lab",
    "/community",
    "/study",
    "/wrongbook",
    "/knowledge-graph",
    "/tutor",
    "/classroom",
    "/teacher",
    "/user",
]

errors = []
warnings = []


def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        page.on("pageerror", lambda err: errors.append(str(err)))
        page.on("console", lambda msg: handle_console(msg))
        page.on("requestfailed", lambda req: request_failed(req))

        failed_routes = []
        for route in ROUTES:
            try:
                page.goto(f"{BASE_URL}/#{route}", wait_until="networkidle", timeout=15000)
                page.wait_for_timeout(800)
                # 检查 body 是否存在且非空
                body = page.locator("body")
                if body.count() == 0 or body.inner_text().strip() == "":
                    failed_routes.append(route)
            except Exception as e:
                failed_routes.append(f"{route}: {e}")

        # dashboard 核心区块：校验保留下来的数据区仍在渲染，
        # 并确保已下线模块不再出现（Issue #185）。
        # 背景：PR #174 移除了「AI 考点预测」与「学习 DNA 双画像」，
        #       原先断言 .dash-forecast-item 的写法已失效，导致回归必挂。
        # 注意：/dashboard 路由配置了 auth:true，匿名（未登录）会话下不会渲染仪表盘，
        #       故仅在仪表盘真正渲染时才断言区块，避免匿名跑测产生假失败。
        try:
            page.goto(f"{BASE_URL}/#/dashboard", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1200)
            if page.locator(".dash-goal-section").count() > 0:
                # 保留区块：Bio Score 统计卡 / 今日计划列表
                if page.locator(".dash-stat-label", has_text="Bio Score").count() == 0:
                    errors.append("dashboard Bio Score 统计卡未渲染")
                if page.locator(".dash-plan-item").count() == 0:
                    errors.append("dashboard 今日计划列表为空")
            else:
                warnings.append("dashboard 未渲染（匿名会话受 auth:true 限制），跳过区块断言")
            # 已下线模块在任何情况下都不应再出现在 DOM 中
            removed_modules = {
                ".dash-forecast-item": "AI 考点预测",
                "#dash-forecast-container": "AI 考点预测容器",
                ".dash-dna-section": "学习 DNA 双画像",
            }
            for selector, name in removed_modules.items():
                if page.locator(selector).count() > 0:
                    errors.append(f"dashboard 已下线模块仍存在: {name}({selector})")
        except Exception as e:
            errors.append(f"dashboard 核心区块测试失败: {e}")

        # 虚拟实验室：enzyme 实验参数控件
        try:
            page.goto(f"{BASE_URL}/#/bio-lab", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(800)
            page.locator("#bl-exp-select").select_option("enzyme")
            page.wait_for_timeout(600)
            # 第一步应为制备酶液（普通工具按钮）
            page.locator(".bl-tool[data-tool='prepare']").click()
            page.wait_for_timeout(400)
            # 第二步应为温度梯度（参数控件）
            if page.locator("#bl-param-input").count() == 0:
                errors.append("bio-lab enzyme 第二步未渲染参数控件")
            else:
                # 拖动到正确范围 40℃
                page.locator("#bl-param-input").fill("40")
                page.locator("#bl-param-submit").click()
                page.wait_for_timeout(400)
                # 成功后应进入第三步 pH
                if page.locator("#bl-param-input").count() == 0:
                    errors.append("bio-lab enzyme 参数提交后未进入下一步")
        except Exception as e:
            errors.append(f"bio-lab enzyme 参数测试失败: {e}")

        browser.close()

        print("=" * 50)
        print(f"测试路由数: {len(ROUTES)}")
        print(f"失败路由: {len(failed_routes)}")
        if failed_routes:
            for r in failed_routes:
                print(f"  - {r}")
        print(f"控制台错误: {len(errors)}")
        for e in errors:
            print(f"  - {e}")
        print(f"控制台警告: {len(warnings)}")
        for w in warnings:
            print(f"  - {w}")
        print("=" * 50)

        if failed_routes or errors:
            sys.exit(1)
        print("回归测试通过")


def handle_console(msg):
    text = msg.text
    # 过滤已知非致命警告与静态部署下的预期错误
    ignored = [
        "Supabase SDK",
        "[TATABOX]",
        "[SW]",
        " fallbacks ",
    ]
    # 静态 http.server 不支持 POST 类接口（如 trends 页的 /forecast），相关 501 可忽略
    is_static_501 = "Failed to load resource" in text and "501" in text
    if msg.type == "error":
        if any(i in text for i in ignored) or is_static_501:
            warnings.append(text)
        else:
            errors.append(text)
    elif msg.type == "warning":
        warnings.append(text)


def request_failed(req):
    url = req.url
    # 仅关注本地 API 调用失败
    if BASE_URL in url:
        err = req.failure
        err_text = err.get("errorText", "unknown") if err else "unknown"
        warnings.append(f"request failed: {url} -> {err_text}")


if __name__ == "__main__":
    run_tests()
