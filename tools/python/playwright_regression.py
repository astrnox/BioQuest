"""
BioQuest 回归测试：验证关键路由可加载、控制台无致命错误、
dashboard 预测兜底、虚拟实验室参数控件等核心功能。
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

        # dashboard 预测兜底：访问 dashboard 后检查预测列表不为空
        try:
            page.goto(f"{BASE_URL}/#/dashboard", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1200)
            forecast_items = page.locator(".dash-forecast-item").all()
            if len(forecast_items) == 0:
                errors.append("dashboard 考点预测列表为空（兜底未生效）")
        except Exception as e:
            errors.append(f"dashboard 预测测试失败: {e}")

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
        "[BioQuest]",
        "[SW]",
        " fallbacks ",
    ]
    # 静态 http.server 不支持 POST /forecast，dashboard 已本地兜底，控制台 501 可忽略
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
