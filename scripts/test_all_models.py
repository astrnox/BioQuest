"""测试各模型可用性和响应时间"""
import sys
sys.path.insert(0, ".")
import server
import time

models = [
    ("deepseek-ai/deepseek-v4-pro", "DeepSeek V4 Pro 671B"),
    ("qwen/qwen3.5-397b-a17b", "Qwen 3.5 397B"),
    ("z-ai/glm-5.1", "GLM 5.1"),
    ("meta/llama-3.1-70b-instruct", "Llama 3.1 70B (旧模型)"),
]

for model_id, name in models:
    print(f"\n=== {name} ({model_id}) ===")
    t0 = time.time()
    try:
        resp = server.api_call(
            model_id,
            [{"role": "user", "content": "请回复OK"}],
            temperature=0.1, max_tokens=10, json_mode=False
        )
        if resp:
            content = resp["choices"][0]["message"]["content"].strip()
            elapsed = time.time() - t0
            print(f"  响应: {content}")
            print(f"  耗时: {elapsed:.1f}s")
        else:
            print(f"  失败 (返回None)")
    except Exception as e:
        print(f"  异常: {e}")
