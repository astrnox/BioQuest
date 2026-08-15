#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import ast, sys

def Q(stem, opts, ans, ana, kn, mod, con):
    return {"stem":stem,"options":opts,"answer":ans,"analysis":ana,"knowledge":kn,"module":mod,"difficulty":"league","target":"both","concept":con}

with open('/workspace/data/comp_batch_e_m3_eco_m4_gen.py','r') as f:
    content=f.read()
tree=ast.parse(content)
existing=[]
for node in ast.walk(tree):
    if isinstance(node, ast.Assign):
        for t in node.targets:
            if isinstance(t, ast.Name) and t.id=='QUESTIONS':
                for e in node.value.elts:
                    existing.append(ast.literal_eval(e))
from collections import Counter
C=Counter(q['concept'] for q in existing)
print('现有',len(existing),'题分布:',dict(C))
sys.stdout.flush()

all_qs=list(existing)

# 分析模板：逐选项+总结升华段
STD_ANA = "A选项："
def analysis(parts, concept, summary, correct_letter):
    ana = ""
    letters=['A','B','C','D']
    for i,p in enumerate(parts):
        ana += f"{letters[i]}选项：{p}。"
    ana += f"综上所述，{concept}相关考点需结合定量计算与生态/遗传逻辑综合判断，避免常见误解（如{summary}），正确答案为{correct_letter}。"
    return ana

# ====== 生态系统 补1题 (24→25) ======
need=25-C.get('生态系统',0)
if need>0:
    for i in range(need):
        stem = "云南西双版纳热带季节雨林生态站（20年定位观测）测定了望天树（Parashorea chinensis）群落的能流参数：全年林冠截获太阳总辐射4680 MJ/m²，群落GPP=158 MJ C/(ha·a)，乔木层自养呼吸Ra=88 MJ C/(ha·a)，土壤异养呼吸Rh=42 MJ C/(ha·a)，凋落物归还C=18 MJ C/(ha·a)，细根周转输入C=14 MJ C/(ha·a)。林下种植阳春砂仁（Amomum villosum）后，土壤Rh从42升至58 MJ C/(ha·a)，凋落物分解速率k从0.62/年升至0.95/年，但乔木层细根生物量下降22%。下列判断正确的是？"
        opts={
            "A": "原始林NEP=GPP-Ra-Rh=158-88-42=28 MJ C/(ha·a)（碳汇）；种植砂仁后NEP=12 MJ C/(ha·a)，碳汇能力下降约57%，原因是砂仁种植促进土壤有机质分解（正激发效应）",
            "B": "原始林NPP=70 MJ C，凋落物+细根周转=32 MJ，剩余38 MJ C全部储存在乔木生物量增量中（约4.6 t C/ha的年增长）",
            "C": "凋落物分解k加快（半减期从1.12→0.73年）对森林肥力长期有利，因为养分周转加快植物获得更多矿质养分",
            "D": "印度野牛取食草本同化C=1.8 MJ/(ha·a)，同化效率60%，摄食量=3 MJ C；按10%定律，草本层NPP至少需18 MJ C才能维持野牛种群"
        }
        ans='A'
        parts=[
            "原始林NEP计算正确（28 MJ C，碳汇），种植砂仁后Rh升高→NEP下降（碳汇减弱），正激发效应导致原有SOC矿化加速，A的数值计算和机制分析均正确",
            "NPP=70 MJ去向包括：植食动物取食、BVOC释放、根系分泌物、淋溶DOC等，剩余38 MJ不能全部算作乔木增量（仅约20-25 MJ是真实生物量增量），B严重高估",
            "凋落物分解过快会导致养分释放与植物需求不同步（雨季养分淋溶丢失），且长期SOC库下降（土壤团粒结构稳定性降低），对肥力维持不一定有利，C的\"总是有利\"过于绝对",
            "\"至少\"需按最大传递效率20%计算：1.8÷0.2=9 MJ C，而非10%的18 MJ，D算法口径错误，混淆了\"至少/最多\"的效率选择"
        ]
        ana=analysis(parts,'生态系统碳汇与NEP/NPP/Ra/Rh区分','NEP与NPP概念混淆、\"至少\"用10%而非最大效率20%、分解越快越有利的片面观点',ans)
        all_qs.append(Q(stem,opts,ans,ana,["生态学","生态系统","望天树林碳循环与NEP计算"],"module_3","生态系统"))
    print('生态系统补',need)

# 检查当前种群生态
C=Counter(q['concept'] for q in all_qs)
print('当前分布:',dict(C))
