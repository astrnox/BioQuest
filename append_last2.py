# -*- coding: utf-8 -*-
import json
import os, sys
os.chdir('/workspace/data')
sys.path.insert(0, '/workspace/data')
import comp_batch_a_m1_cell as orig
qs = list(orig.QUESTIONS)
from collections import Counter
cnt = Counter(q["concept"] for q in qs)
print("当前各tag数量：")
for k,v in cnt.items():
    print(f'{k}: {v}')
print(f'总计: {len(qs)}')

# 补题函数
def qsig(stem,opts,ans,anal,det):
    return {"stem":stem,"options":opts,"answer":ans,"analysis":anal,"knowledge":["细胞生物学","细胞信号转导",det],"module":"module_1","difficulty":"league","target":"both","concept":"细胞信号转导"}
def qapo(stem,opts,ans,anal,det):
    return {"stem":stem,"options":opts,"answer":ans,"analysis":anal,"knowledge":["细胞生物学","细胞凋亡",det],"module":"module_1","difficulty":"league","target":"both","concept":"细胞凋亡"}

add_qs = []

# 信号转导补1道（第34道）
add_qs.append(qsig(
    "利用FRET（Förster共振能量转移）生物传感器活细胞成像实验中，研究者将EGFR胞内结构域的C端与CFP融合、Grb2的SH2域与YFP融合，加入EGF配体后检测到显著FRET信号上升。若预先加入某小分子抑制剂后FRET信号完全消失且下游ERK磷酸化被完全阻断。该小分子抑制剂最可能靶向EGFR信号通路的哪个环节？",
    {"A":"EGFR胞内酪氨酸激酶域的ATP竞争性抑制剂（如Gefitinib吉非替尼）","B":"Ras蛋白的法尼基转移酶抑制剂（FTI，阻断Ras膜锚定）","C":"MEK1/2的变构抑制剂（如Trametinib曲美替尼，MAPKK抑制剂）","D":"腺苷酸环化酶（AC）的特异性激活剂毛喉素Forskolin"},
    "A",
    "A正确：FRET实验原理是CFP（供体，475nm发射）与YFP（受体，525nm激发）距离在≤10nm时，供体激发态能量通过偶极-偶极共振无辐射转移至受体→FRET信号（供体发射↓+受体发射↑）。本实验中：EGF结合EGFR胞外→构象变化→不对称二聚化→EGFR胞内激酶域激活→交叉磷酸化C端多个酪氨酸位点（Tyr1068/Tyr1086等Grb2 SH2结合位点）→Grb2（衔接物SH2-SH3-SH2）通过N端SH2域结合磷酸化EGFR C端→CFP与YFP物理距离<10nm（分子间直接相互作用）→FRET信号上升。若加入EGFR酪氨酸激酶抑制剂（如Gefitinib/ZD1839/Iressa吉非替尼，4-苯胺基喹唑啉类ATP竞争性抑制剂，结合EGFR激酶域ATP结合口袋的「门卫残基」Thr790→阻止Mg-ATP结合→激酶活性抑制）→EGFR激酶域无法磷酸化C端酪氨酸→Grb2 SH2无结合位点→CFP-YFP无相互作用→FRET信号完全消失；同时无Grb2-Sos招募→Ras-MAPK级联无法激活→下游ERK1/2磷酸化被完全阻断，完全匹配题干表型。B错误：Ras法尼基转移酶FTI阻断Ras C端CAAX盒的法尼基化修饰→Ras无法锚定至质膜内侧→Ras无法被Sos催化为GTP态→下游Raf-MEK-ERK磷酸化确实被阻断，但Ras在EGFR-Grb2-Sos下游（Grb2通过SH3结合Sos→Sos作为Ras GEF）→FRET信号是EGFR-Grb2直接相互作用（在Ras上游），FTI不影响Grb2结合磷酸化EGFR→FRET信号不会消失，与题干「FRET完全消失」不符。C错误：MEK1/2变构抑制剂Trametinib是ATP非竞争性结合MEK激酶域变构位点→MEK磷酸化激活ERK被抑制→下游ERK磷酸化被阻断（匹配题干「下游ERK磷酸化阻断」）；但MEK在MAPK级联最下游（Raf→MEK→ERK），完全不影响上游EGFR磷酸化+Grb2结合→FRET信号不受影响→与题干「FRET完全消失」矛盾。D错误：毛喉素Forskolin是腺苷酸环化酶AC的直接变构激活剂→cAMP↑+PKA激活→Gs-cAMP-PKA通路与RTK-Ras-MAPK通路无直接上下游关系→FRET信号（EGFR-Grb2）和ERK磷酸化均不会被抑制，完全不符合。FRET/BRET活细胞成像技术是近年研究蛋白质-蛋白质相互作用、信号转导时空动态的核心手段，联赛要求掌握基本原理+常见信号转导通路的上下游顺序，通过「信号阻断在什么分子上游/下游」逻辑排除错误选项，是生物竞赛实验设计和机制分析的高频考题。",
    "FRET成像+EGFR抑制剂作用机制（通路上下游判定）"
))

# 凋亡补1道（第33道）
add_qs.append(qapo(
    "临床病理学家对30例手术切除的非小细胞肺癌（NSCLC）石蜡包埋标本进行TUNEL染色+抗caspase-3免疫组化双染，发现其中12例肿瘤组织中TUNEL阳性率<1%（极低），同时激活型caspase-3（p17/p12亚基）染色几乎阴性，而Survivin（BIRC5）染色呈强阳性；该组患者术后1年无进展生存期PFS显著低于TUNEL较高组。上述分子病理表型与该组肿瘤细胞的哪种凋亡逃逸机制最直接相关？",
    {"A":"肿瘤细胞启动子高甲基化沉默TRAIL死亡受体DR4/5，外源死亡受体通路阻断","B":"肿瘤细胞Bcl-2基因t(14;18)染色体易位导致Bcl-2蛋白组成型高表达","C":"凋亡抑制蛋白IAP家族成员Survivin高表达，直接抑制执行caspase-3/7活性并干扰纺锤体检查点","D":"肿瘤细胞p53基因功能获得性突变（GOF）导致PUMA/Bim过度转录激活"},
    "C",
    "A错误：TRAIL死亡受体DR4/5启动子甲基化导致表达沉默是常见的外源死亡受体通路凋亡逃逸机制，最终结果也是凋亡减少（TUNEL低），但该表型下游仍然是「死亡受体DISC无法形成→caspase-8激活缺失→caspase-3无法切割激活」，题干中并未提及DR4/5表达变化，且关键特异性证据是「Survivin强阳性」——甲基化沉默DR通路与Survivin高表达之间无直接分子关联（Survivin不直接作用于DR通路），因此A虽然可能但不是题干表型「最直接相关」的机制。B错误：Bcl-2 t(14;18)易位（滤泡淋巴瘤特征性遗传学改变，免疫球蛋白重链IgH增强子驱动Bcl-2高表达）是内源性线粒体通路凋亡抑制经典机制：Bcl-2高表达→结合Bax/Bak→MOMP被抑制→细胞色素c不释放→apoptosome不组装→caspase-9/caspase-3不激活→TUNEL低；但Bcl-2高表达与Survivin高表达之间无直接因果关系，且NSCLC（非小细胞肺癌，约85%肺癌）中t(14;18)极为罕见（该易位>90%见于滤泡性淋巴瘤，20-30%弥漫大B淋巴瘤，实体瘤几乎不见），因此B的病理类型不符，不是NSCLC的主要凋亡逃逸机制。C正确：题干三个关键表型与Survivin（BIRC5， baculoviral IAP repeat-containing 5，IAP家族最小成员，16.5kDa蛋白，正常成人除胸腺、胎盘、造血干细胞/祖细胞高表达外，绝大多数分化成熟组织表达量极低——约70-90%人类恶性肿瘤（NSCLC、乳腺癌、胰腺癌、结直肠癌、卵巢癌、黑色素瘤、淋巴瘤、白血病）均高表达Survivin，与不良预后、化疗耐药、术后复发高度相关，是肿瘤诊断和预后的临床生物标志物及抗肿瘤热门靶点）直接匹配：①Survivin含有一个BIR域（Baculovirus IAP Repeat，锌螯合的三螺旋Cys/His结构域），其BIR域通过保守的疏水口袋直接结合caspase-3和caspase-7的催化活性位点裂缝→竞争性抑制执行caspase-3/7蛋白酶活性（Ki ~nM级，与XIAP类似强度，尽管Survivin无XIAP BIR2域前的Linker inhibitory helix，但结合方式和抑制强度相近）→caspase-3无法切割PARP-1、ICAD/DFF45、lamin等底物→DNA不片段化→TUNEL阳性率极低+激活型caspase-3（p17/p12切割片段）免疫组化阴性；②除凋亡抑制外，Survivin还有第二功能：作为染色体过客复合物（CPC，chromosomal passenger complex：Aurora B激酶+INCENP+Borealin+Survivin四聚体，四聚定位于染色体着丝粒→中期→中央纺锤体→中间体）的必需亚基，Survivin通过BIR域结合Aurora B并稳定CPC复合物→干扰纺锤体装配检查点（SAC）→多倍体/染色体不稳定→促肿瘤异质性和进展；③题干第三证据：「Survivin免疫组化强阳性」是直接的分子证据，直接指向本选项。D错误：p53功能获得性突变（gain-of-function GOF，不同于p53功能丢失LOF）是癌症中p53突变的第二常见表型——突变型p53（如R175H、R273H、G245D热点突变）不仅丢失野生型p53转录PUMA/Noxa/p21等抑癌功能，还获得致癌新功能（转录促癌基因、抑制凋亡、促进转移、耐药、干性维持）；但PUMA/Bim是p53靶促凋亡BH3-only基因→若其「过度转录激活」会导致大量凋亡→TUNEL阳性率高、caspase-3激活强，与题干「TUNEL极低+caspase-3阴性」表型完全相反，逻辑矛盾。病理表型-分子机制的关联分析题是联赛细胞凋亡章节的典型应用题，需结合肿瘤生物学知识+特异性分子标志物+疾病发病率共同判定。",
    "Survivin高表达的凋亡逃逸机制与NSCLC病理表型关联"
))

qs.extend(add_qs)
print(f"\n追加后总数：{len(qs)}")
cnt = Counter(q["concept"] for q in qs)
print("各tag数量：")
for k in ["细胞结构","细胞膜","细胞器","细胞周期","细胞信号转导","细胞凋亡"]:
    print(f'  {k}: {cnt[k]}')

# 校验
print("\n===== 全量校验 =====")
bad = 0
for i, q in enumerate(qs):
    for k in ["stem","options","answer","analysis","knowledge","module","difficulty","target","concept"]:
        if k not in q:
            print(f"题{i}缺字段{k}"); bad+=1; continue
    if len(q["stem"])<15:
        print(f"题{i}stem<15字"); bad+=1
    if set(q["options"].keys())!=set("ABCD"):
        print(f"题{i}选项不全"); bad+=1
    if q["answer"] not in "ABCD":
        print(f"题{i}answer非法"); bad+=1
    for c in "ABCD":
        if f"{c}正确" not in q["analysis"] and f"{c}错误" not in q["analysis"]:
            print(f"题{i}分析缺{c}，知识:{q['knowledge'][2][:20]}"); bad+=1
    if len(q["analysis"])<150:
        print(f"题{i}分析<150字"); bad+=1
    if len(q["knowledge"])!=3 or q["knowledge"][1]!=q["concept"]:
        print(f"题{i}knowledge错"); bad+=1
    if q["module"]!="module_1" or q["difficulty"]!="league" or q["target"]!="both":
        print(f"题{i}公共字段错"); bad+=1

# 概念严格检查
allowed_concepts = {"细胞结构","细胞膜","细胞器","细胞周期","细胞信号转导","细胞凋亡"}
bad_concepts = [q["concept"] for q in qs if q["concept"] not in allowed_concepts]
if bad_concepts:
    print(f"非法concept：{set(bad_concepts)}")
    bad += len(bad_concepts)

print(f"\n校验结果：错误数 {bad}")
if bad>0:
    print("存在问题，未写入文件")
else:
    # 写入
    def dump_q(q, indent="  "):
        lines = [indent + "{"]
        lines.append(indent + '  "stem": ' + json.dumps(q["stem"], ensure_ascii=False) + ",")
        opts = q["options"]
        opt_strs = []
        for k in ["A","B","C","D"]:
            opt_strs.append(f'"{k}":' + json.dumps(opts[k], ensure_ascii=False))
        lines.append(indent + '  "options": {' + ",".join(opt_strs) + "},")
        lines.append(indent + '  "answer": ' + json.dumps(q["answer"], ensure_ascii=False) + ",")
        lines.append(indent + '  "analysis": ' + json.dumps(q["analysis"], ensure_ascii=False) + ",")
        lines.append(indent + '  "knowledge": ' + json.dumps(q["knowledge"], ensure_ascii=False) + ",")
        lines.append(indent + '  "module": ' + json.dumps(q["module"], ensure_ascii=False) + ",")
        lines.append(indent + '  "difficulty": ' + json.dumps(q["difficulty"], ensure_ascii=False) + ",")
        lines.append(indent + '  "target": ' + json.dumps(q["target"], ensure_ascii=False) + ",")
        lines.append(indent + '  "concept": ' + json.dumps(q["concept"], ensure_ascii=False))
        lines.append(indent + "}")
        return "\n".join(lines)
    
    qs_str = "# -*- coding: utf-8 -*-\nQUESTIONS = [\n" + ",\n".join(dump_q(q) for q in qs) + "\n]\n"
    with open('comp_batch_a_m1_cell.py', 'w', encoding='utf-8') as f:
        f.write(qs_str)
    print(f"\n校验通过！写入完成，文件大小约 {os.path.getsize('comp_batch_a_m1_cell.py')//1024} KB")
    # Python import二次确认
    import importlib
    # reload
    if 'comp_batch_a_m1_cell' in sys.modules:
        del sys.modules['comp_batch_a_m1_cell']
    m = importlib.import_module('comp_batch_a_m1_cell')
    print(f"Python import成功，QUESTIONS长度={len(m.QUESTIONS)}，语法完全正确。")
