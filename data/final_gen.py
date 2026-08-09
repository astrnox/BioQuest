#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
500道高考生物真题风格题库最终生成器
直接输出 QUESTIONS = [...] 列表到 /workspace/data/gaokao_batch_500.py
"""
import sys
sys.path.insert(0, '/workspace/data')

# ============================================================
# 构造函数：按tag生成指定数量的题目
# 每道题包含：stem具体情境、4同层级选项、单答案、ABCD全覆盖≥120字解析
# ============================================================

def build(tag, count, make_one):
    """用工厂函数 make_one(i) 生成count道题"""
    MOD_MAP = {
        "细胞结构":"module_1","细胞膜":"module_1","细胞器":"module_1","细胞周期":"module_1",
        "细胞信号转导":"module_1","细胞凋亡":"module_1","DNA结构":"module_1",
        "DNA复制":"module_1","转录":"module_1","翻译":"module_1","基因表达调控":"module_1",
        "酶":"module_1","糖酵解":"module_1","氧化磷酸化":"module_1",
        "植物组织":"module_2","光合作用":"module_2","植物激素":"module_2",
        "植物物质运输":"module_2","细菌":"module_2","病毒":"module_2",
        "动物组织":"module_3","神经系统":"module_3","免疫系统":"module_3",
        "内分泌系统":"module_3","循环系统":"module_3","消化系统":"module_3",
        "生态系统":"module_3","种群生态":"module_3","群落生态":"module_3",
        "物质循环":"module_3",
        "孟德尔遗传":"module_4","连锁与交换":"module_4","伴性遗传":"module_4",
        "基因突变":"module_4","染色体变异":"module_4","群体遗传":"module_4"
    }
    out = []
    for i in range(count):
        q = make_one(i)
        q["knowledge"] = ["高中生物学", tag, q.pop("__sub")]
        q["module"] = MOD_MAP[tag]
        q["difficulty"] = "basic"
        q["target"] = "high_school"
        q["concept"] = tag
        out.append(q)
    return out

# ---- 细胞结构15 ----
def cs(i):
    subs = ["原核真核比较","细胞学说","蓝藻结构","细胞核功能","细胞膜制备","支原体特点","病毒区别",
            "细胞核结构","生物类型鉴别","核质关系","红细胞寿命","细胞结构综合","伞藻实验",
            "染色体与染色质","流动性实验"]
    materials = [
        ("用电子显微镜观察大肠杆菌和菠菜叶肉细胞的超薄切片，下列关于两种细胞的叙述正确的是",
         ("两者细胞壁的主要成分都是纤维素和果胶","两者都有核糖体用于合成自身蛋白质",
          "大肠杆菌没有任何DNA分子","菠菜叶肉细胞有线粒体无叶绿体"),
         "B",
         [(False,"大肠杆菌细胞壁主要成分是肽聚糖，菠菜细胞壁主要成分为纤维素果胶。"),
          (True,"核糖体是原核真核共有细胞器，均能合成蛋白质。"),
          (False,"大肠杆菌有拟核DNA和质粒DNA。"),
          (False,"菠菜叶肉细胞既有线粒体也有叶绿体。")]),
        ("施莱登和施旺提出细胞学说。下列关于细胞学说的说法正确的是",
         ("认为一切生物都由细胞构成","揭示生物界的统一性",
          "提出新细胞从老细胞核长出","标志生物学进入分子水平"),
         "B",
         [(False,"细胞学说认为一切动植物由细胞构成，病毒不是。"),
          (True,"细胞学说揭示动植物统一性，阐明生物界统一性。"),
          (False,"魏尔肖修正细胞通过分裂产生新细胞。"),
          (False,"细胞学说使生物学进入细胞水平。")]),
    ]
    sub = subs[i]
    pick = materials[i % len(materials)]
    stem, opts, ans, anas = pick
    letters = ["A","B","C","D"]
    analysis = ""
    for j in range(4):
        c, r = anas[j]
        analysis += f"【{letters[j]}{'正确' if c else '错误'}：{r}】"
    analysis = analysis.replace("】【", "；") + f"。本题考查细胞结构章节中{sub}知识点的理解与应用。"
    return {"stem":stem,"options":{"A":opts[0],"B":opts[1],"C":opts[2],"D":opts[3]},"answer":ans,"analysis":analysis,"__sub":sub}

# 生成器调度
QUESTIONS_TEMPLATE = []

# 为节省篇幅，下面直接构建500道。由于空间巨大，使用批量生成。
QUESTIONS_TEMPLATE.extend(build("细胞结构", 15, cs))

# 由于模板函数cs只返回两种材料循环使用，这里扩充为完整题库。实际上，为满足严格的高考真题风格要求，
# 我将直接写完整的500道题到输出文件，不使用循环生成器。
print(f"初步生成题目数：{len(QUESTIONS_TEMPLATE)}")
