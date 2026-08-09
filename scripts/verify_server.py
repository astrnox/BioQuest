"""验证 server.py 修改后的语法和配置"""
import server

print("OK - server.py 导入成功")
print(f"\n模型配置:")
print(f"  PRIMARY_MODEL = {server.PRIMARY_MODEL}")
print(f"  SELF_CHECK_MODEL = {server.SELF_CHECK_MODEL}")
print(f"  FALLBACK_MODEL = {server.FALLBACK_MODEL}")
print(f"  POOL_MIN = {server.POOL_MIN}")

total_labels = sum(len(v) for v in server.GRAPH_LABELS.values())
print(f"\nGRAPH_LABELS: {total_labels} labels in {len(server.GRAPH_LABELS)} modules")
for mod, labels in server.GRAPH_LABELS.items():
    print(f"  {mod} ({len(labels)}): {', '.join(labels)}")

# 验证与 knowledge-graph.js 的 label 完全对齐
kg_labels = [
    "细胞结构", "细胞膜", "细胞器", "细胞周期", "细胞信号转导", "细胞凋亡",
    "孟德尔遗传", "连锁与交换", "伴性遗传", "基因突变", "染色体变异", "群体遗传",
    "DNA结构", "DNA复制", "转录", "翻译", "基因表达调控", "PCR技术",
    "生态系统", "种群生态", "群落生态", "物质循环", "生物多样性",
    "动物组织", "神经系统", "免疫系统", "内分泌系统", "循环系统",
    "植物组织", "光合作用", "植物激素", "植物物质运输",
    "酶", "糖酵解", "柠檬酸循环", "氧化磷酸化", "氨基酸代谢",
    "细菌", "病毒", "微生物生态"
]

all_graph_labels = []
for labels in server.GRAPH_LABELS.values():
    all_graph_labels.extend(labels)

missing = [l for l in kg_labels if l not in all_graph_labels]
extra = [l for l in all_graph_labels if l not in kg_labels]
print(f"\n与 knowledge-graph.js 对齐检查:")
print(f"  图谱 label 数: {len(kg_labels)}")
print(f"  GRAPH_LABELS 数: {len(all_graph_labels)}")
if missing:
    print(f"  缺失: {missing}")
if extra:
    print(f"  多余: {extra}")
if not missing and not extra:
    print(f"  完全一致!")
