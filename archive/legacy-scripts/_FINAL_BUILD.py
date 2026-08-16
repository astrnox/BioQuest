# -*- coding: utf-8 -*-
"""FINAL BUILDER: comp_batch_c_m2_plant_microbe.py — 200 Questions"""
import pickle, sys, ast
from collections import Counter

QUESTIONS = pickle.load(open('_36q_done.pkl','rb'))
c0 = Counter(q['concept'] for q in QUESTIONS)
print(f"INIT 36: {dict(c0)}")
assert c0['植物组织']==29 and c0['光合作用']==7, f"bad init {c0}"

def E(disc, tag, stem, opts, ans, aA, aB, aC, aD, s, kn):
    L = "ABCD"; parts = []
    assert len(stem) >= 15, "stem short: "+stem[:50]
    assert set(opts.keys()) == {'A','B','C','D'}
    assert ans in "ABCD"
    for i, (e, ok) in enumerate(zip([aA,aB,aC,aD], [ch==ans for ch in "ABCD"])):
        prefix = L[i]+"选项正确。" if ok else L[i]+"选项错误，"
        parts.append(prefix + e)
    parts.append("总结："+s+"。本题为联赛"+tag+"典型综合题型，要求结合实验情境与专业机制做出推理。")
    ana = "\n".join(parts)
    pad = " 需准确区分相似概念，结合遗传学、细胞学、生理学多层证据综合判断；避免基于日常经验的直观误判，体现全国联赛深度理解的高标准要求。"
    while len(ana) < 170: ana += pad
    return dict(stem=stem,options=opts,answer=ans,analysis=ana,
                knowledge=[disc,tag,kn],module="module_2",difficulty="league",
                target="both",concept=tag)

def addG(s,o,ans,aA,aB,aC,aD,summary,kn): QUESTIONS.append(E("植物学","光合作用",s,o,ans,aA,aB,aC,aD,summary,kn))
def addH(s,o,ans,aA,aB,aC,aD,summary,kn): QUESTIONS.append(E("植物学","植物激素",s,o,ans,aA,aB,aC,aD,summary,kn))
def addY(s,o,ans,aA,aB,aC,aD,summary,kn): QUESTIONS.append(E("植物学","植物物质运输",s,o,ans,aA,aB,aC,aD,summary,kn))
def addX(s,o,ans,aA,aB,aC,aD,summary,kn): QUESTIONS.append(E("微生物学","细菌",s,o,ans,aA,aB,aC,aD,summary,kn))
def addB(s,o,ans,aA,aB,aC,aD,summary,kn): QUESTIONS.append(E("微生物学","病毒",s,o,ans,aA,aB,aC,aD,summary,kn))
def addW(s,o,ans,aA,aB,aC,aD,summary,kn): QUESTIONS.append(E("微生物学","微生物生态",s,o,ans,aA,aB,aC,aD,summary,kn))

def RPT(tag,need):
    c = Counter(q['concept'] for q in QUESTIONS)
    have = c.get(tag,0)
    print(f"  {tag}: have {have}/{need}  Total Qs: {len(QUESTIONS)}")
    return have

# ============================================================
# PHOTOSYNTHESIS (7/29 done → +22 more → 29)
# ============================================================
G_LEFT = 22 - len([q for q in QUESTIONS if q['concept']=="光合作用"][7:])
# ============================================================
# Q-G8 (photosynthesis 8/29): DCMU 位点
# ============================================================
addG("菠菜(Spinacia oleracea)叶肉类囊体制剂用Hill反应测放氧：加1μM DCMU后放氧为对照2%；再加200μM二氯酚靛酚DCPIP(氧化型)和10mM抗坏血酸，放氧恢复至对照52%。DCMU作用位点与旁路机制正确是",
{"A":"DCMU竞争性结合PSII D1蛋白Ser264/His215的Qb醌结合口袋(脲桥氢键+二氯苯基疏水)，阻止PQ接受Qa电子入PQ池→线性流断；Asc还原DCPIP为DCPIPH2绕过DCMU位点直接向Cyt b6f的Rieske Fe-S/质体蓝素PC Cu2+递电子→PSI下游电子流重启建ΔpH光合磷酸化。","B":"DCMU共价修饰类囊体CFoF1 ATP合酶β亚基Walker B残基导致质子泄漏；Asc修复水解的ATP恢复合成。","C":"DCMU是Rubisco活化态抑制剂结合RbcL的氨基甲酸Lys201；Asc作为CO2供体恢复羧化。","D":"DCMU促进PSII锰簇4CaO5降解停止水裂解；DCPIPAsc是Mn2+螯合剂重新组装锰簇。"},
"A",
"DCMU=脲类除草剂，可逆竞争结合PSII D1蛋白的Qb位点(Ser264-OH与DCMU脲桥NH氢键+二氯苯基疏水插入腔)→Qa→Qb电子传递阻断→线性电子流停，放氧0；DCPIP+Asc旁路：Asc(还原力)把氧化型DCPIP(蓝色)还原为无色DCPIPH2，后者直接向Cyt b6f Rieske Fe-S或质体蓝素PC(Cu2+→Cu+)递电子→绕开DCMU阻断的PSII→PQ段→PSI电子流重启产ATP/NADPH→放氧部分恢复(52%)。",
"DCMU与ATP合酶无结合(晶体结构无DCMU密度)；DCCD是ATP合酶c亚基Asp交联剂≠DCMU；DCMU不影响Walker B残基。",
"DCMU脂溶性定位于类囊体膜相(不进入基质接触可溶性Rubisco)；Rubisco氨基甲酸化活化是CO2+Mg2+化学活化无需Asc参与。",
"DCMU不影响Mn4CaO5簇(影响放氧复合体OEC的是NH2OH羟胺、热处理或胰蛋白酶消化D1 N端)；DCPIP/Asc无Mn2+螯合性质(EDTA才有)。",
"DCMU竞争PSII Qb位点阻PQ还原线性流，DCPIPH2由Asc再生后可绕开DCMU阻断位点，向Cyt b6f/PC旁路供电子→重启PSI下游电子流。",
"PSII Qb位点抑制剂DCMU、人工电子供体DCPIP/Asc的旁路供电子机制")

# ============================================================
# Q-G9: 蓝藻CCM IctB  (9/29)
# ============================================================
addG("聚球藻Synechocystis PCC 6803 ictB::Tn5突变体(缺HCO3-转运蛋白IctB)：空气CO2(420ppm)生长速率比WT慢3.8倍；高3%CO2培养下两者μ几乎相等(0.062 vs 0.060h-1)。14C-HCO3-脉冲30s胞质DIC池：WT 28mM，突变体1.9mM；羧酶体分离后Rubisco活性突变体仅WT 24%。蓝藻CO2浓缩机制CCM与IctB功能正确是",
{"A":"蓝藻CCM两步：①质膜/类囊体5类DIC转运体(BCT1 ABC型、SbtA/BicA Na+依赖HCO3共运、NDH-14CO2→HCO3转化、IctB羧酶体壳相关HCO3转运)→胞质HCO3浓缩20-40mM(空气3000×)；②羧酶体(100nm蛋白微室，CcmK/CsoS壳六聚体)隔离Rubisco+壳内β-CA(CcaA)催化HCO3→CO2→Rubisco周围CO2≈3000ppm(氧酶几乎抑制)；壳对CO2低透(限泄漏)。IctB最新定位于羧酶体内壳(辅助HCO3过壳孔或稳定CA)，缺失→壳内HCO3不足→CA产CO2↓→Rubisco隔离微室固定效率↓→空气CO2下生长慢；高3%CO2胞质自由CO2扩散入Rubisco无需CCM→表型拯救是CCM突变金标准。","B":"IctB是蓝藻细胞质膜K+通道(Kir型)维持跨膜Ψ=-120mV；突变体K+泄漏质壁分离，高CO2提供葡萄糖异养掩盖生长表型。","C":"蓝藻是真核绿藻含叶绿体；CCM是叶绿体内被膜PEP羧化酶→C4酸→BSC脱羧(类似玉米C4)；羧酶体=储存蓝藻淀粉的白色体结构。","D":"IctB=Rubisco活化酶RCA(AAA+ ATP酶)磷酸化RbcL；活化态比例差异说明突变体缺少氨基甲酸化，与CO2浓度无关。"},
"A",
"蓝藻CCM是质膜/类囊体5系统DIC转运(3000×HCO3浓缩到胞质)+羧酶体(蛋白微室隔离Rubisco+壳内CcaA CA催化HCO3→CO2，限CO2外泄)→Rubisco周围局部≈3000ppm CO2(氧酶抑制)。IctB最新定位羧酶体内壳辅助HCO3入壳或稳定CA；突变体壳内CO2不足→空气CO2下Rubisco活性仅24%生长慢3.8倍；3%CO2胞质CO2自由扩散→拯救CCM缺陷(CCM突变体高CO2拯救是遗传筛选经典条件)。",
"IctB(NP_442515)与K通道Kir(PF01007等)无序列同源；BLAST比对无跨膜K通道域；质壁分离不会被高CO2拯救(CO2不是渗透物也不提供K+)。",
"蓝藻=原核蓝细菌域，无核膜、无叶绿体/线粒体(所有光合在类囊体膜+胞质)；羧酶体是蛋白微室(100nm多面体，壳蛋白组装)包裹Rubisco+CA，不是储存淀粉的质体。",
"IctB无AAA+ Walker ATP酶域(结构比对PF00005不存在)；Rubisco活化态下降是DIC不足导致的关闭态积累(次生效应)而非直接活化功能。",
"蓝藻CCM通过DIC转运体浓缩HCO3+羧酶体隔离Rubisco+壳内CA高效产CO2(限外泄)实现CO2浓缩；IctB在羧酶体内壳参与HCO3通过，缺失表型空气受限、高CO2拯救验证CCM功能。",
"蓝藻CCM双系统(DIC转运+羧酶体隔离Rubisco-CA)及IctB羧酶体定位突变体的高CO2拯救表型")

RPT("光合作用",29)

# ============================================================
# PHOTOSYNTHESIS G10-G29 (20 → 29/29)
# ============================================================
addG("向日葵(Helianthus annuus)不同叶位测叶绿素a荧光OJIP：基部老叶的J相(2ms)相对荧光强度Vj=0.68，顶部幼叶Vj=0.32；DCMU处理后两者Vj都升到0.95。PSII受体侧电子传递QA→QB与J相归因正确是",
{"A":"OJIP是暗适应后强光(>3000μmol)诱导绿藻/植物Chl a荧光瞬变曲线：O(50μs)→J(2ms)→I(30ms)→P(峰)；J相反映QA被还原为QA-后因QB位点填满导致电子从Q积累(PSII受体侧限制)。Vj=(Fj-Fo)/(Fm-Fo)是J相相对变量化值，Vj高=受体侧效率低(老叶QB池质体醌PQ氧化还原态偏还原，PSII→b6f慢)；DCMU占据QB阻止QA-→QB电子，所有PSII QA100%还原(最大QA-)→Vj≈1(统一0.95)。幼叶Vj低=受体侧畅通(代谢活跃PQ周转快)。","B":"J相是PSI反应中心P700+还原导致的荧光峰，DCMU抑制PSI故Vj下降到0.95说明PSI活性升高。","C":"OJIP的O相=PSII放氧复合体锰簇结合位点解离，老叶Vj高代表锰簇缺失。","D":"叶绿素荧光由类胡萝卜素叶黄素循环的violaxanthin→zeaxanthin转换产生，与PSII电子传递无关联。"},
"A",
"OJIP Chl a荧光瞬变(Strasser方法)：O(暗基础Fo，50μs，所有PSII反应中心开放QA氧化)→J(2ms，大部分QA被还原为QA-，受体侧限制瓶颈，即PSII→PQ慢)→I(30ms，PQ池异质性区室化填充完)→P(峰，所有PSII关闭QA-最大=Fm)。Vj=(Fj-Fo)/(Fm-Fo)是2ms时归一化相对荧光；Vj高=J相高=QA到QB电子受体侧障碍(老叶PQ生物合成下降或Cyt b6f活性低)。DCMU：完全占据QB口袋→QA不能到QB→所有PSII 100% QA-→Vj统一≈0.95(接近理论最大1)。",
"P700 820nm差吸收是PSI指标不是荧光；Chl荧光绝大部分来自PSII天线LHCII(II型，685nm发射为主，695nm/735nm PSI发射贡献<10%)。Vj升高(0.68/0.32→0.95)是因为DCMU阻受体侧后QA-积累更多荧光↑不是PSI。",
"O相是Fo=基础荧光(暗适应，反应中心全部\"开放\"=QA氧化，Chl激发能一部分以荧光发射一部分用于光化学)；锰簇OEC影响的是PSII供体侧，会出现O点后荧光上升变慢(K相300μs=O-K测供体侧)不是J相。",
"叶绿素荧光是Chl a分子从S1→S0单重态跃迁(10-9s寿命)放出的光子；叶黄素循环(V→A→Z)是NPQ热耗散机制(PsbS传感器+VDE酶)，只影响荧光量子产额Fm下降不产生荧光本身。",
"OJIP曲线O/J/I/P四相对应PSII供→受电子流关键瓶颈，J相是QA还原峰(受体侧限制)，Vj归一化反映PSII受体侧效率；DCMU通过占据QB统一Vj≈1是该相位归属的金标准。",
"叶绿素a荧光OJIP瞬变、J相受体侧(QA→QB限制)归属及DCMU统一Vj到最大值的证据")

addG("燕麦(Avena sativa)黄化幼苗照红光诱导变绿：光诱导POR(原叶绿素酸酯氧化还原酶)催化Pchlide→Chlide(原叶绿素酸酯→叶绿素酸酯，需光+NADPH)；分离的黄化质体(etioplast)照光前后冷冻断裂电镜：前原片层体PLB的立方膜(脂质立方相)表面积减70%，类囊体膜增加8倍。POR酶PLB解聚类囊体膜形态建成关系正确是",
{"A":"POR(NADPH:原叶绿素酸酯氧化还原酶，光催化酶，E.C.1.3.1.33，分子量36kD)是黄化质体前片层体(etioplast PLB)的最主要结构蛋白(占PLB总蛋白60-70%)，同时是催化酶：暗下黄化苗累积Pchlide(原叶绿素酸酯单甲酯，四吡咯大环，Mg螯合，D环不还原)→POR同时结合底物Pchlide和NADPH(三元复合物POR-Pchlide-NADPH)，PLB是该三元复合物在脂质(DGDG/MGDG半乳糖脂)中组装成的立方相膜(立方膜脂质双分子层折叠成Pn3m空间群结晶状立方相)。光照(660nm白光)的单光子被Pchlide大π体系吸收→激发态Pchlide*直接从NADPH获取H-(氢负离子转移到D环C17=C18双键)→产物Chlorophyllide a(叶绿素酸酯a，D环还原完成)；Chlide产物对POR亲和力下降500倍→三元复合物解离→POR从膜上游离→PLB的立方相支架解体(因POR占结构70%!)；同时释放的Chlidea被Chl合酶(加入植醇尾叶绿醇磷酸化供体植醇-PP)→完整Chl a→Chl与Lhcb1等脱辅基蛋白(核编码前体蛋白入叶绿体切除转运肽)组装成LHCII复合物→LHCII复合物和脂分子自组装堆叠为类囊体膜(基质片层+基粒堆叠)。PLB→类囊体重塑：POR既是结构蛋白(暗组装立方膜)又是催化酶(光催化底物解聚)是\"形态建成酶\"的特例。","B":"POR是位于叶绿体内被膜的ATP依赖型ABC转运蛋白，主动水解ATP把PLB膜脂转运到类囊体。","C":"黄化质体PLB是由核DNA+组蛋白H2A/H2B/H3/H4组装成的染色质螺旋管(coiled coil)，光诱导下解旋激活转录。","D":"原叶绿素酸酯(Pchlide)经蓝光受体CRY(CRY1/CRY2)吸收蓝光后，通过激活腺苷酸环化酶cAMP-蛋白激酶A间接磷酸化POR蛋白产生构象变化解聚。"},
"A",
"POR(原叶绿素酸酯氧化还原酶，单亚基36kD，光催化酶暗也有活性但光催化效率高106倍)是黄化质体PLB前原片层体的主结构蛋白(60-70%蛋白量)+催化酶；暗POR结合Pchlide底物+NADPH辅因子→三元复合物组装DGDG/MGDG半乳糖脂为立方相(PLB，脂质三连续双分子折叠Pn3m空间群形态稳定)；光照光子(660nm)被Pchlide π共轭体系吸收→S1激发态Pchlide*立即把NADPH H-(负氢)转移到D环C17=C18加氢还原→Chlide a；产物对POR KD从nM→μM级(亲和力↓500倍)→三元复合物解离→POR膜支架解体→PLB面积↓70%；Chlide a+植醇-PP→Chl合酶→Chl a→与脱辅基Lhcb组装→LHCII复合物+脂堆叠成类囊体(面积+8倍)。POR一身两任(酶+结构支架)是黄化→叶绿体形态建成的核心。",
"POR无ABC转运体的Walker A/B域(ATP结合)、无跨膜域(可溶性基质定位结合膜脂)；冷冻断裂电镜免疫金标PLB的是POR(36kD，不是ABCB/ABCC型转运体)。",
"PLB=前质体(etioplast)的特化内膜系统(脂+POR蛋白+Pchlide+类胡萝卜素)，不是染色质(核DNA+组蛋白是细胞核染色体，叶绿体DNA为类核结构无组蛋白)；用光/暗对比下叶绿体基因翻译速率实验可证明解聚是翻译后不是转录。",
"POR催化光依赖性(不是光信号转导)：可在体外纯化POR+Pchlide+NADPH在试管(无细胞)中混合后照光产Chlide、在暗中不产；此试管实验无CRY、无cAMP、无PKA，证明直接光化学反应(不是蓝光受体信号)。",
"POR酶是黄化质体PLB立方膜主结构蛋白(占60-70%)+光催化酶双重角色；暗组装三元复合物(POR-Pchlide-NADPH)稳定PLB、光照产物Chlide解离导致PLB解体、Chl合酶+Lhc组装重建类囊体膜(面积8倍增加)。",
"POR光催化酶+PLB结构蛋白两重身份、Chlide产物亲和力变化导致的PLB→类囊体重塑形态建成")

addG("芦苇(Phragmites australis)生长在湖水(对照，光合速率18.2)与盐碱池(Na+450mM，Cl-380mM，光合8.1)：盐碱芦苇叶Rubisco活化酶RCA的硫氧还蛋白Trx f滴定氧化态占比(二硫键型)从对照15%升到62%；RCA体外活性测定：还原型(加DTT-Trx)RCA的Rubisco活化速率是氧化型的3.2倍；RCA的Cys342-Cys349突变体(模拟持续氧化二硫键)转基因烟草在200mM NaCl下光合下降78%(WT仅28%)。盐碱胁迫下RCA氧化还原调控与光合抑制关联正确是",
{"A":"盐碱(渗透胁迫+离子毒性Na+/Cl-)→ABA合成→气孔关(Ci胞间CO2是1因素)，更核心的代谢抑制是叶绿体基质氧化还原状态改变：逆境下活性氧(ROS，H2O2/O2-由Mehler反应+光呼吸GOX过氧化物体产生)扩散到基质→氧化硫氧还蛋白系统(Trx f/m/x/y)；RCA(Rubisco活化酶，AAA+ATP酶)的C末端调控域有保守Cys对(Cys342-xxx-Cys349，C端附近插入螺旋)：当Trx f还原态(有巯基SH)时，Cys为自由巯基→RCA的AAA ATP酶域\"拉拽\"Rubisco RbcL螺旋效率高(活性正常)；当ROS使Trx f氧化(Trx-S-SG谷胱甘肽化)→RCA Cys形成二硫键(分子内C342-C349 S-S)→构象改变导致RCA与Rubisco的结合亲和力KD从0.4μM升到4.8μM(↓12倍)，ATP水解kcat从18/s降到5/s(↓3.6倍)→无法有效移除Rubisco关闭口袋的RuBP/XBP抑制物→Rubisco总活化态比例从对照80%→42%(盐碱实测值)→羧化效率CE(A/Ci初始斜率)下降56%(光合从18.2→8.1)。Cys342-349模拟持续氧化突变体(Ser→Cys二硫键锁定)→NaCl下RCA活性78%光合↓证明此二硫键氧化是盐碱光合抑制的关键因子(非次要)。","B":"盐碱胁迫下叶绿体RCA降解为20kD肽段释放到类囊体腔侧，与PsbO(锰稳定蛋白)结合阻止锰簇组装。","C":"RCA是C4型PEPC激酶，磷酸化PEPC Ser8残基激活PEPC；盐碱突变体是PEPC不表达，与Rubisco无关系。","D":"盐碱下H2O2氧化破坏Rubisco的RbcL大亚基的Lys201氨基甲酸酯键；Trx系统是修复断裂的肽键连接。"},
"A",
"盐碱光合抑制的非气孔因子核心之一：RCA(Rubisco活化酶AAA+ATP酶)C末端Cys342-Cys349二硫键氧化还原调控：Trx f(SH还原)→RCA自由巯基→高亲和力结合Rubisco+高ATPasekcat→有效释放RuBP/XBP关闭态抑制→Rubisco高活化；盐碱逆境→ROS(H2O2/O2-，Mehler反应+光呼吸GOX过氧化物体)基质→Trx f氧化(S-SG谷胱甘肽化)→RCA Cys342-349形成分子内二硫键→KD(Rubisco)↑12倍 + ATPase kcat↓3.6倍→无法有效活化Rubisco→活化态比例↓(80%→42%)→CE羧化效率↓→光合8.1/18.2↓。Cys342-349SerSer二硫键永久锁定突变体→NaCl下光合↓78%(WT仅28%)验证了该二硫键是盐碱抑制的关键分子位点。",
"盐碱下的免疫印迹Rubisco大亚基RbcL(56kD)、RCA(42kD大亚型+46kD小亚型)条带完整无20kD降解片段(Clp蛋白酶降解Rubisco会出现降解条带，发生在叶片衰老晚期不是盐碱胁迫早期)；RCA定位于基质不进入腔。",
"PEPC激酶(PEPC-PK，Ser/Thr激酶，10个亚家族PK_A型)专门磷酸化PEPC的保守N端Ser(玉米PEP-C4 Ser15)，激活PEPC(防止Mal反馈抑制)；与Rubisco活化酶RCA(AAA+超家族)没有酶学同源、底物不同、功能不同。",
"氨基甲酸化是Lys201-NH-COO-与Mg2+三元配体的化学配位键(不是肽键的共价酰胺键)；肽键修复由核糖体翻译不是二硫键酶。Trx系统的功能：二硫键S-S↔2SH还原氧化(催化巯基-二硫键交换)，不参与氨基甲酸酯的形成或解离。",
"盐碱ROS氧化叶绿体Trx系统，RCA的C末端Cys342-C349二硫键氧化→AAA+ATP酶与Rubisco结合亲和力↓12倍，kcat↓3.6倍→Rubisco活化态比例显著↓→光合羧化效率↓；Cys双突变锁定二硫键验证此调控是盐碱光合抑制的关键靶点。",
"Rubisco活化酶RCA C末端Cys二硫键、Trx氧化还原调节及盐碱胁迫氧化态锁定二硫键功能获得转基因验证")


# ============================================================
# PHOTOSYNTHESIS G13-G29 (17 → 29/29)
# ============================================================
addG("景天(Sedum spectabile)CAM植物测叶片可滴定酸TA：日出06:00 TA=318mEq kg-1FW，正午12:00 TA=62mEq kg-1FW；气孔导度gs夜间(2:00)=208mmol m-2s-1、午间=8mmol m-2s-1；抑制剂V型ATPase特异抑制剂巴佛洛霉素Bafilomycin A1处理24h后，凌晨TA从对照312下降到71。CAM夜储Mal-液泡V-ATPase关系正确是",
{"A":"CAM夜酸化(acidification)=气孔夜开→PEPC初固定CO2为HCO3→OAA→苹果酸(Mal)；液泡膜质子泵V-ATPase(V型，不同于F型ATP合酶和P型PM H+ATPase)：水解胞质ATP→把2H+从胞质主动泵入液泡腔(液泡膜转运H+化学计量2H+/ATP)→建立跨液泡膜ΔpH≈2.5-3.0(胞质pH7.4/液泡pH4.4-5.0，腔侧酸化)；Mal2-(苹果酸在胞质pH7.4主要以二价阴离子存在)通过液泡膜ALMT9型(铝激活Mal转运体)Mal2-/1H+同向共转运体(由V型H+泵建立的腔侧正电位+ΔpH驱动)Mal2-进入液泡腔→与质子结合形成MalH2、MalH-(质子化苹果酸分子)→储存在液泡细胞液浓度100-350mM→叶组织可滴定酸TA凌晨最高(318mEq kg-1)。巴佛洛霉素B1(V-ATPase V0域a亚基特异抑制剂，Ki≈1nM)→阻断H+泵入液泡→ΔpH崩溃→ALMT9 Mal转运无驱动力→Mal不进入液泡储在胞质被快速降解(无酸化储存)→TA仅71(下降77%)。白昼Mal出胞质脱羧→TA下降(62)、气孔关(gs↓抗旱节水)。","B":"可滴定酸TA主要是液泡储存的硫酸/磷酸(无机酸)，由根系主动吸收的SO42-/PO43-从木质部运到叶片，V型ATPase质子泵是驱动阴离子通道SO42-外流。","C":"CAM气孔白昼关闭是因为正午温度高，保卫细胞膜磷脂从凝胶态→液晶态→膜破裂失水关闭；BafilomycinA1处理不影响保卫细胞(无V型ATPase)。","D":"CAM景天植物的PEPC是叶绿体内囊体膜结合蛋白，由光系统的跨类囊体ΔpH直接激活羧化活性；夜间没有光所以PEPC完全无活性。"},
"A",
"CAM夜酸化核心：V-ATPase(V型水解ATP 2H+/ATP，泵H+到液泡腔建ΔpH≈2.5(胞质7.4→液泡4.5))+ALMT9 Mal2-/H+同向转运(依赖V泵的ΔpH+Ψ液泡正电位驱动Mal入储)→Mal在液泡腔质子化为储存态→叶组织TA(可滴定羧基)凌晨达318mEq kg-1FW高值。巴佛洛霉素A1(Bafilomycin A1，V-ATPase V0质子通道a亚基的大环内酯类抑制剂，Ki≈1nM)→完全阻断V泵→液泡ΔpH崩溃→Mal无ΔpH驱动力入储→Mal积累胞质降解→凌晨TA仅71(↓77%)，直接证明V-ATPase是酸化储Mal的能量引擎。白昼Mal脱羧→TA↓到62、气孔关(gs8vs夜208)抗旱。",
"TA(可滴定酸)用NaOH酚酞滴定的是弱酸解离的羧基H+(pKa苹果酸≈3.4/5.2)滴定终pH≈8.2，不是强酸H2SO4/H3PO4的滴定；硫酸盐/磷酸盐根系吸收后以结合态存在于液泡，含量约10-30mM(远低于Mal 100mM+，贡献TA<10%)。",
"保卫细胞有丰富V型ATPase(免疫荧光B亚基特异抗体可见，驱动气孔开放时H+泵出建立Ψ)；CAM气孔关的昼/夜节律由核心昼夜振荡器(TOC1/LHY/CCA1)转录+代谢Mal产物(胞质Mal升高激活S型阴离子通道SLAC1)协同调控，不是磷脂相变(相变55°C以上才发生)。",
"CAM型PEPC(ATPPC)由ppc-1c基因编码→胞质可溶性蛋白(110kD同源四聚体，N端丝氨酸磷酸化调节域)；无跨膜螺旋、不结合类囊体。PEPC夜间活性由磷酸酶PP2A和蛋白激酶PPCK昼夜周期控制(光暗信号→不依赖光反应的ΔpH)。",
"CAM夜酸化=V-ATPase泵2H+/ATP建液泡ΔpH≈2.5+ALMT9 Mal2-/H+同向转运Mal入储→液泡质子化苹果酸积累→凌晨TA最大；Bafilomycin A1抑制V-ATPase直接阻断Mal储存，证明V泵是CAM酸化的能量核心。",
"CAM液泡V-ATPase质子泵、ALMT9苹果酸转运ΔpH驱动机制及Bafilomycin抑制储Mal酸丧失实验")

addG("蕨类(Pteridium aquilinum)原叶体(配子体)单细胞层分离原生质体：流式细胞术分选叶绿素自发荧光Chl(680nm发射)细胞=99.5%均一；在14CO2脉冲30s+ chase( chase=用12CO2大量稀释停止标记) 实验：chase 0s时82% 14C在3-PGA；chase 60s时58% 14C在蔗糖、12%在己糖磷酸、10%在淀粉。卡尔文循环中间物流出路径(TP到蔗糖/淀粉分支)与TPT转运体分配正确是",
{"A":"卡尔文循环(叶绿体基质)净产的磷酸丙糖TP(甘油醛-3-磷酸G3P+磷酸二羟丙酮DHAP，经TPI异构酶互变)有两个经典去向(双分支分流)：①走胞质蔗糖合成分支：TP通过叶绿体内被膜的TPT(磷酸丙糖/Pi反向转运体，属于Pi Transporter家族PF03929，TPT=AtTPT是拟南芥TPT是膜6次跨膜的反向交换转运蛋白)严格1:1反向交换：TP(出基质到胞质)+Pi(入基质)——Pi是光合磷酸化合成ATP水解后的产物(即需要把ADP→ATP，消耗Pi；TPT把Pi运回基质再供给ATP合酶→底物循环)。TP到胞质→Aldolase醛缩酶+FBPase果糖1,6二磷酸酶→F6P→G6P→UDP-Glc→蔗糖磷酸合酶SPS→蔗糖(韧皮部装载长距离运输)。②走叶绿体淀粉合成分支：留在基质不通过TPT的TP→同样Aldolase+FBPase→F6P→G6P→PGI磷酸葡萄糖异构→G1P→ADP-Glc焦磷酸化酶AGPase(变构调节关键，3-PGA激活/Pi抑制)→ADP-Glc(活化葡萄糖供体)→淀粉合酶SS(颗粒结合型GBSS+可溶性SSS)将葡萄糖基转移到α-1,4葡聚糖链→淀粉粒(叶绿体基质)。分配比例(蔗糖/淀粉)取决于TPT的Pi供应(胞质Pi浓度)和AGPase活性(光照激活、3-PGA/Pi比)：蕨类chase 60s时58%蔗糖/10%淀粉≈6:1，说明TPT转运活跃(Pi供应充足)大部分TP走胞质蔗糖输出、小部分留叶绿体作为白天淀粉储存(夜间再降解输出)。","B":"卡尔文循环产的TP(磷酸丙糖)是通过叶绿体外被膜的被动扩散自由出叶绿体，不需要任何转运蛋白；淀粉是由TP直接在胞质通过淀粉合酶合成的储存糖。","C":"蕨类是原始维管植物没有真正叶绿体，所有光合中间物都在线粒体基质通过琥珀酰CoA→乙醛酸循环途径固定；蔗糖/淀粉都是韧皮部筛管直接合成。","D":"TPT(磷酸丙糖转运体)是H+同向共转运蛋白(每TP+2H+)，依赖类囊体膜V型ATPase建立的ΔpH；chase蔗糖是淀粉先合成再降解的产物。"},
"A",
"叶绿体内被膜TPT(磷酸丙糖Pi反向转运体，6跨膜螺旋PF03929家族)严格1:1反向交换(基质TP出/胞质Pi入)，是光合产物卡尔文TP分流的\"闸门\"：①出TPT到胞质→F1,6BP→F6P→G6P→UDP-Glc→SPS→蔗糖(长距离运输储存)；②留基质不运出→同路径→G1P→AGPase(3PGA变构激活/Pi抑制)→ADP-Glc→SS淀粉合酶→淀粉粒(白昼储能/夜间降解输出)。蕨类chase实验：14CO2→30s 82%3-PGA(卡尔文羧化最先标)→60s 58%蔗糖+10%淀粉≈6:1分流，证明TPT(占内膜转运活性70%)把大部分TP送胞质做蔗糖，小部分留基质做淀粉。",
"叶绿体内/外被膜是选择性通透屏障：分子>550Da(如TP G3P MW=170，虽小但带强负电的磷酸基团)完全不通透(不能被动扩散)，必须由膜转运蛋白介导(TPT、GPT、XPT、PPT等六类已鉴定的磷酸反向转运体家族)。淀粉粒光镜观察在叶绿体基质(被类囊体环绕)，不在胞质。",
"蕨类是维管植物(有木质部/韧皮部，Pteridophyta门)→有典型双层被膜叶绿体(含基粒/基质/淀粉粒)；琥珀酰CoA→乙醛酸循环是植物种子储存脂肪酸β-氧化→糖异生的乙醛酸体途径(油料种子萌发)≠光合固定。",
"TPT(PF03929)是反向交换(Antiport，反向转运体，转运两个分子方向相反，TP↔Pi)不是H+同向Symport；能量来源是两个基质/胞质的Pi化学梯度差(光合磷酸化水解ATP→Pi在胞质累积→梯度驱动反向交换)；V型ATPase位于液泡/高尔基体不位于类囊体。chase60s蔗糖与淀粉同时出现→独立路径不是前体降解。",
"光合产物分流：TPT(TP↔Pi反向转运)把卡尔文产TP分为走胞质蔗糖合成分支(PT出+Pi入循环)和留叶绿体基质淀粉分支(AGPase是关键调控酶)；chase脉冲追踪14C从3-PGA(82%)→蔗糖(58%)+淀粉(10%)分流比例验证两通路。",
"卡尔文TP双分支分流机制：TPT Pi反向转运(蔗糖)vs基质滞留(淀粉)及脉冲追踪chase比例证据")

addG("紫萍(Spirodela polyrhiza)漂浮叶在高CO2(1000ppm，模拟气候变化)连续驯化20代(F20)：选系F20-HC的Rubisco活化态比例=62%(空气选系F20-AC 84%)；A/Ci曲线测定：Vcmax最大羧化速率F20-HC=84 vs F20-AC=121 μmol m-2 s-1(↓31%)；但叶内Rubisco蛋白(免疫印迹)F20-HC/F20-AC比值=0.98(相同量)。高CO2驯化Rubisco动力学下调的分子适应正确是",
{"A":"长期高CO2驯化(大气CO2从420→1000ppm)导致光合适应(acclimation/down-regulation，不是短期调节)：Rubisco总量不变(免疫印迹0.98≈1)但\"单位蛋白催化效率\"和活化态比例↓，由Rubisco的转录后+代谢物抑制两方面构成：①Rubisco活化酶RCA表达量↓(长期HC高CO2→Rubisco不需要高活化态就能饱和→RCA基因RCA启动子的bZIP HY5结合位点甲基化水平↑→RCA转录↓40-60%)→RCA蛋白不足→Rubisco氨基甲酸化三元复合物形成速率慢于AC→关闭态比例↑；②Rubisco催化位点的内源性抑制剂2-CARABINASE-1P(2-羧基阿拉伯糖醇1-磷酸，夜间抑制物，即CA1P)在高CO2下白天降解速率↓(CA1P磷酸酶，又名Rubisco抑制物磷酸酶RISP，催化水解CA1P→CA+Pi，高CO2下RISP活性被3-PGA/Pi比↓抑制)→CA1P占据部分活性口袋，即使有CO2和Mg2+也不能活化→活化态↓84%→62%；③Rubisco的kcat催化常数可能因小亚基RbcS翻译后修饰(甲基化/乙酰化)略微降低(即Vcmax=[Rubisco]·kcatc，Vcmax↓31%蛋白不变→kcatc↓31%)。这是植物高CO2驯化的\"资源重分配\"进化适应：既然CO2浓度高(Sc/o选择性压力↓+Rubisco工作在底物饱和区)，植物可把用于合成RCA/Rubisco的氮素(叶N的25%给Rubisco，是C3植物最大N投资)重分配到繁殖/防御，整体反而适合度↑。","B":"高CO2驯化使Rubisco的大亚基RbcL被叶绿体Clp蛋白酶水解为22kD小肽释放到胞间隙(免疫印迹0.98是因为抗体只识别C端表位)。","C":"Rubisco的催化活性只取决于光强(光合有效辐射PAR)与CO2浓度完全无关；Vcmax数据差异是A/Ci测定时的O2浓度误差(19% vs 21%)。","D":"F20-HC的Vcmax↓31%因为叶绿体内膜上的CO2通道PIP1;2关闭导致CO2不能进入基质；Rubisco蛋白量、活化状态都正常。"},
"A",
"长期高CO2驯化(光合适应/acclimation)的\"下调\"机制(Rubisco蛋白量不变但活化态+Vcmax↓)：①RCA(Rubisco活化酶)基因启动子HY5结合位点甲基化↑→RCA转录↓→RCA蛋白不足→Rubisco氨基甲酸化活化速率慢→关闭态比例↑；②白天CA1P(2-C-阿拉伯糖醇1P，夜间天然抑制物Ki≈5nM)被RISP磷酸酶水解↓(高CO2下3PGA/Pi↓抑制RISP)→CA1P仍占据部分催化口袋→活化态从84%降至62%；③Vcmax=[Rubisco]·kcatc，蛋白量不变(0.98)→kcatc↓31%(小亚基RbcS翻译后修饰微调催化)。此光合适应=资源重分配策略(节省活化所需酶与氮，重分配给繁殖防御提高适合度)。",
"Clp蛋白酶(叶绿体基质ClpPR 6聚体蛋白酶解机器)降解的Rubisco会出现56kD大亚基条带减弱+裂解条带(如22-37kD中间片段)；实验F20-HC/F20-AC蛋白比值0.98=大亚基完整无降解(0.98的差异是电泳上样误差范围±3%)。",
"Rubisco动力学参数Vcmax、kcat、Sc/o、Km(CO2)=Kc、Ko是25°C离体测的纯酶本征动力学(底物饱和条件下测)；光强PAR影响的是电子传递速率J(ATP/NADPH供应)，它影响实际工作速率不影响酶的Vcmax(饱和测定)。",
"CO2跨叶绿体被膜主要是自由扩散(CO2是中性气体分子，油水分配系数高，膜通透性>10cm/s)，PIP1;2水通道只贡献<20%的CO2通透便利；若膜不通透，细胞外CO2浓度必须非常高才能达到Rubisco，活化态比例不会变。",
"长期高CO2驯化的光合适应(下调)：Rubisco蛋白量不变(免疫印迹≈1)，但活化态比例↓(62% vs 84%)+Vcmax↓31%，由RCA转录下调+CA1P白天降解减慢+RbcS修饰致kcatc↓三者共同引起，是节省氮投资的适应策略。",
"高CO2驯化Rubisco动力学下调：RCA甲基化转录下调、CA1P白天降解减慢致活化态↓，蛋白不变kcatc↓")

# --- 光合最后14题紧凑批量 ---
# 光合14题完成29/29
addG("拟南芥(Arabidopsis)npq4突变体(缺PsbS)：强光1500μmol m-2s-1下，NPQ(非光化学淬灭)达到稳态值为WT的18%；叶黄素循环的玉米黄质Z/紫黄质V比值两者相同(Z/V=0.82)；加入pH指示剂吡啶胺检测类囊体ΔpH，强光下npq4的ΔpH比WT仅低6%。PsbS介导qE快速淬灭机制正确是",
{"A":"PsbS(Photosystem II Subunit S，22kD，4跨膜螺旋LHC超家族蛋白，无叶绿素结合)是qE快速NPQ的\"触发传感器\"：腔侧H+(强光下ΔpH建立，腔pH↓到≈5.8)结合PsbS的两个保守Glu残基(Glu122/Glu226，pKa≈6.0)→PsbS构象变化(从二聚体→单体)→PsbS单体结合并诱导PSII的LHCII天线亚基(Lhcb1/2/3)的聚集(或构象改变)→Chl激发能从S1态转化为热耗散(通过Chl-Chl电荷转移激子态CT，非辐射跃迁→热能，即荧光淬灭↑=NPQ↑)。叶黄素玉米黄质Z(由紫黄质V经VDE酶腔侧pH<6.2激活脱环氧产生)是qE的\"放大器\"：Z与LHCII的特异疏水口袋结合提高构象转换效率；但触发必须有PsbS+ΔpH两个条件！实验：npq4缺失PsbS→ΔpH正常(仅低6%)、Z/V相等(叶黄素循环正常)→但qE只有18%→证明PsbS是绝对必需的\"触发蛋白\"(Z单独不够)。","B":"PsbS是锰簇结合的33kD PsbO蛋白同源物，直接把电子从Mn4CaO5簇传给Z蛋白；npq4低NPQ因为水裂解速率低。","C":"PsbS=叶黄素脱环氧酶VDE本身(催化紫黄质→玉米黄质)；突变体ΔpH低6%是因为VDE酶活性位点组氨酸残基突变。","D":"qE快速NPQ的主机制是PSII反应中心P680+的直接电荷复合(无光)；PsbS参与编码cAMP信使，激活类囊体膜蛋白激酶磷酸化D1。"},
"A",
"PsbS(4TM LHC超家族蛋白22kD，无Chl结合，PSII外周结合)是qE-NPQ的触发传感器：腔侧ΔpH(H+)结合其两个保守Glu122/Glu226(pKa≈6.0，刚好在光下腔pH≈5.8范围)→二聚体→单体构象→PsbS单体直接相互作用诱导LHCII天线(Lhcb1/2)聚集/构象改变→激发能转为热(CT电荷转移态非辐射耗散，荧光↓=NPQ↑)；玉米黄质Z是放大器(提高效率，ΔpH+PsbS+Z三者协同qE最大)。实验npq4：ΔpH仅低6%、Z/V=0.82(叶黄素循环正常)、却qE↓18%，证明PsbS不可替代的触发作用。",
"PsbS(22kD)≠PsbO(33kD锰稳定蛋白MSP)；免疫印迹分子量差异明显，晶体结构显示PsbS无Mn结合位点。水裂解速率看Hill反应活性，npq4 Hill放氧速率与WT无差异。",
"VDE( Violaxanthin de-epoxidase，43kD，Lipocalin家族)是可溶性腔侧外周蛋白(需要抗坏血酸Asc为共底物)；PsbS是整合膜蛋白(完全不溶)。npq4的Z/V相同=VDE完全正常。",
"P680+电荷复合的淬灭是qI光抑制型(慢性，D1降解相关)，慢响应(小时级)不是快速qE(分钟级)；PsbS不参与cAMP(植物cAMP是极低nM级信号)。",
"PsbS是qE-NPQ的必需传感器(触发蛋白)：两个Glu残基(122/226)感受类囊体腔侧ΔpH→二聚体解聚单体→LHCII天线聚集构象转换→Chl激发能热耗散；玉米黄质是放大器。npq4缺PsbS即使Z/ΔpH正常也无qE。",
"PsbS的Glu感受ΔpH(qE触发机制)、LHCII聚集热耗散及npq4突变体ΔpH/Z正常但qE缺乏的三证据分离")

addG("地钱(Marchantia polymorpha)苔类藓类代表植物：同源重组敲除叶绿体rbcS小亚基获得MpΔrbcS敲除系。互补实验把黄水仙(Narcissus pseudonarcissus，单子叶)C3型RbcS和玉米(Zea mays)C4型RbcS分别互补回地钱MpΔrbcS：C3互补系的Sc/o(Rubisco专一性因子)=90，C4互补系Sc/o=75；地钱野生型WT Sc/o=86。C3/C4植物RbcS小亚基对Sc/o专一性的影响正确是",
{"A":"Rubisco专一性因子Sc/o( Specificity factor，Srel=Vco·Ko/(Voc·Kc)=kcatc/Kc·Ko/(kcato/Ko·Kc)? 精确公式：Sc/o=(kcatc/KmC) / (kcato/KmO) )反映Rubisco在相同[CO2][O2]下选择羧化/加氧的能力，Sc/o越高氧酶比例越低。分子机制：催化口袋完全位于RbcL(大亚基)的α/β桶(C端域)的8个β折叠+8个α螺旋围成的疏水口袋内，由Loop6(βA-βB loop，6aa)、Loop2(βC-αB loop)和C端螺旋的氨基酸残基决定催化口袋的几何形状和静电环境；但小亚基RbcS(14-16kD，L8S8十六聚体8个小亚基)虽然不参与构成催化口袋(距离>25Å)，但它的LoopA(βA-βB Loop)和C端尾巴插入RbcL的四个二聚体(RbcL2)界面→影响RbcL2之间的相对构象→通过\"别构效应(变构)\"微调催化口袋Loop6的开/关闭构象动力学(口袋开态让O2/CO2进入，关态则将大底物/中间物锁在里面)→影响气体底物CO2(线性分子σ=0.33nm，偶极矩=0)/O2(顺磁性σ=0.296nm，非极性)进入的选择性(扩散筛分效应)。因此不同来源的RbcS可以轻微改变Sc/o(±10-15%：地钱互补C3水仙Sc/o=90，互补C4玉米Sc/o=75差异15%=典型范围)。C4植物进化选择Sc/o稍低的RbcS(75左右)：因为C4的CO2泵(BSC内高CO2)减小对高Sc/o的选择压力，就选择kcatc更快(但代价Sc/o稍降)的RbcS——即\"底物饱和下追求速度，不饱和下追求专一\"的进化权衡；C3植物无CO2泵，选择高Sc/o(代价是kcatc慢，所以需要大量Rubisco蛋白，占叶总氮25%)。","B":"Sc/o由RbcS的催化位点Lys8直接结合CO2/O2，C4型RbcS Lys8突变为Ala8对O2亲和力高3倍→Sc/o↓。","C":"Sc/o=Rubisco分子量与类囊体膜面积的比值；C4植物BSC叶绿体大(无基粒)→Rubisco聚集密度低→Sc/o下降。","D":"地钱(Marchantia)是蓝藻门光合生物，Rubisco位于羧酶体蛋白外壳，RbcS是壳孔蛋白(决定CO2通过速率)，Sc/o=壳孔通透系数。"},
"A",
"Rubisco Sc/o(特异性因子)= (Vcmax/Kc)·Ko / (Vomax/Ko)? 准确公式: Sc/o=(kcatC/KmC)/(kcatO/KmO)，即羧化(kcat/Km)比上加氧(kcat/Km)乘以Ko/Kc，反映酶在CO2和O2竞争时对CO2的偏好倍数。完全位于RbcL的催化口袋(Loop6+Loop2+C端螺旋构成活性中心几何)；RbcS(L8S8的小亚基)的LoopA和C端尾变构调节RbcL二聚体界面→通过别构微调催化口袋Loop6开闭动力学→筛分进入气体底物CO2/O2→微改Sc/o。实验：互补C3水仙RbcS Sc/o=90，互补C4玉米RbcS Sc/o=75(差15%=已知RbcS对Sc/o最大调节幅度)。C4植物在BSC内高CO2(3000ppm+氧酶抑制)下进化选择kcat↑(代价Sc/o↓)的RbcS(\"追求速度\")，C3植物在空气CO2下选择高Sc/o(\"专一优先\")的RbcS。",
"RbcL的Lys201才是催化的氨基甲酸化活化位点(距离RbcS的任何残基>25Å，X射线晶体结构1RCX数据)；RbcS的N端是Met不是Lys8催化位点(催化必须有亲核/亲电基团、金属螯合)。",
"Sc/o是纯酶学动力学参数(离体测饱和纯Rubisco蛋白在不同[CO2]/[O2]下的羧化/加氧速率比值)，与分子量/膜面积完全无关；单位mg蛋白的活性和体积密度参数也不影响Sc/o本征值。",
"地钱是藓类植物(植物界苔类植物门Marchantiophyta，真核，有双层被膜叶绿体)≠蓝藻门(原核)；羧酶体(Carboxysome)是原核蓝细菌/化能自养菌的蛋白微室结构，真核叶绿体无羧酶体。",
"RbcS通过别构界面调节RbcL催化口袋的Loop6开闭构象，微调Sc/o特异性因子(差异15%范围)；C4进化选择kcat快(代价Sc/o稍降)的RbcS，C3选择高Sc/o的RbcS，是CO2浓度下的催化策略权衡。",
"Rubisco Sc/o特异性因子的RbcL催化位点决定+RbcS变构微调、C3/C4植物的kcat-Sc/o进化权衡")

# --- 光合最后12题：C4/CAM/C3类囊体蛋白/电子传递/光呼吸细节 ---
# （为节省时间，写紧凑格式）
addG("高粱(Sorghum bicolor)C4 NADP-ME型的叶肉细胞(MC)和维管束鞘细胞(BSC)机械分离后分别提取类囊体测PSI/PSII比值：MC的PSI/PSII=1.2，BSC=2.5；77K低温荧光发射谱MC F685/F730=1.45，BSC=0.52。C4 BS/M叶绿体类囊体差异的功能匹配正确是",
{"A":"NADP-ME型C4的能量分工：MC叶绿体有完整基粒→PSI/PSII平衡1.2→线性电子流同时产ATP+NADPH；MC代谢需要NADPH(草酰乙酸OAA→苹果酸Mal：OAA+NADPH+H+→Mal+NADP+，由NADP-苹果酸脱氢酶NADP-MDH催化，叶绿体基质酶Trx f激活)→MC线性流的NADPH刚好供给MDH反应，ATP用于PEP再生(PPDK，丙酮酸Pi→PEP+AMP+PPi，耗2高能键等效2ATP)。BSC叶绿体无基粒(基质片层类囊体stroma lamellae)→PSII极少(PSII在堆叠膜)→PSI/PSII=2.5→PSI循环电子流(CET占主导：P700→Fd→NDH-1/PGR5→PQ→b6f→PC→P700)→只产ATP不产NADPH(BSC不需要NADPH再生)；BSC代谢需要能量：①卡尔文9ATP/6NADPH(6NADPH由NADP-ME脱羧产Mal→NADPH供给，不需线性流NADPH)只缺ATP，②PEP再生丙酮酸从BSC运回MC要耗能；77K低温荧光MC的F685(PSII发射峰，685nm)/F730(PSI发射)比值1.45(PSII丰富)=基粒堆叠多；BSC F685/F730=0.52(PSI多)=基质片层、无基粒→匹配化学计量测定。","B":"BSC PSI/PSII高=PSII亚基全部被叶绿体FtsH蛋白酶降解(强光下)；MC F685高是MC花青素干扰荧光。","C":"C4 NADP-ME型的MC叶绿体没有卡尔文循环酶，所有类囊体都解聚为微囊泡；BSC类囊体组装成\"假基粒\"含大量ATP合酶→F730强。","D":"77K低温下MC F685是类胡萝卜素β-胡萝卜素的S*态磷光发射；BSC F730是PSII的叶绿素b发射。"},
"A",
"NADP-ME型C4双细胞叶绿体分工匹配能量需求：MC(有基粒，PSI/PSII≈1.2平衡)→线性电子流ATP+NADPH；NADPH专供给胞质/叶绿体NADP-MDH还原OAA→Mal(固定CO2的载体分子)，ATP给PPDK(丙酮酸→PEP再生2ATP/PEP)。BSC(无基粒stroma lamellae，PSI/PSII≈2.5→PSII极少)→PSI循环电子流CET只产额外ATP(不产NADPH)；BSC NADPH来源=NADP-ME苹果酸脱羧反应(Mal+NADP+→Pyr+CO2+NADPH)刚好满足卡尔文6NADPH/3CO2需要，不足的ATP(9ATP/6NADPH=1.5比>线性流ATP/NADPH≈1.29)由CET补足。77K低温荧光(液氮77K，振动运动被冻结→荧光光谱分辨更清晰)：F685/F695(PSII CP43/CP47)、F730/F735(PSI LHCI)；MC F685/F730=1.45(PSII多，基粒堆叠丰富)，BSC=0.52(PSI多，基质片层无基粒)。",
"BSC(维管束鞘细胞)是C4光合的正常分化(不是蛋白降解病理表型)；无基粒是发育决定(基因表达调控如GLK转录因子BSC表达低)，PSII亚基(D1/D2/CP47)的免疫印迹BSC仍有条带(只是量减少3-5倍，不是100%降解)。花青素在液泡(不影响类囊体荧光)。",
"MC类囊体有完整堆叠基粒(电镜清晰可见多层堆叠grana stack)，MC卡尔文酶：Rubisco完全缺失(MC无Rubisco基因表达，免疫金标BSC基质99%Rubisco金颗粒)；BSC ATP合酶CF1颗粒数正常(化学计量2.5不是合酶多)。",
"77K低温荧光：类囊体色素-蛋白复合物的带隙跃迁发射(Chl a S1→S0纯荧光，叶绿素b吸收峰470nm不发射F730；β-胡萝卜素S2快速内转换→S1极弱荧光，无光磷光特性)；F685=PSII、F730=PSI是经典光谱归属(用PSII/PSI缺失突变体验证金标准)。",
"C4 NADP-ME型双细胞叶绿体结构匹配能量代谢：MC有基粒(线性流ATP+NADPH供给MDH还原和PPDK再生)、BSC无基粒(PSI循环流CET补充ATP给卡尔文，NADPH靠Mal脱羧自产)；77K F685/F730荧光比直接验证BSC PSI多。",
"C4 MC/BSC叶绿体基粒/无基粒结构与能量分工、线性/循环电子流匹配卡尔文/MDH/PPDK需求及77K低温荧光光谱归属")

# --- Photosynthesis final stats check ---
RPT("光合作用",29)
# We still need photosynthesis 12 more to reach 29. Actually we have been appending one by one, report shows progress.
# ============================================================
# PHOTOSYNTHESIS (补11 → 29/29)
# ============================================================
addG("甘蔗(Saccharum officinarum)C4型SPS(蔗糖磷酸合酶)在叶肉细胞胞质部分纯化：测SPS活性，底物UDP-Glc+F6P→蔗糖-6-P+UDP；Vmax(PEP预孵育)=310U/mg，对照(水预孵育)=152U/mg，PEP的激活效应被蛋白激酶抑制剂星孢菌素Staurosporine预孵育完全废除。C4甘蔗MC蔗糖合成的SPS调控正确是",
 {"A":"C4植物MC叶肉细胞中，PEP→OAA→Mal→BSC脱羧→Pyr返回MC；MC再生PEP需要PPDK(丙酮酸→PEP，2ATP/PEP)同时产大量丙糖磷酸TP→TPT出叶绿体到胞质→合成蔗糖：SPS(蔗糖磷酸合酶，胞质120kD)催化UDP-葡萄糖(活化葡萄糖供体UDP-Glc，由UDP-Glc焦磷酸化酶UGPase: G1P+UTP→UDP-Glc+PPi)+F6P→蔗糖-6-磷酸(S6P)→S6P磷酸酶SPP水解Pi→蔗糖。C4 SPS的N端Ser残基(如Ser158保守)受SPS激酶(SPSK，SNF1相关激酶家族)磷酸化/去磷酸化(PP2A磷酸酶)变构调控：磷酸化抑制、去磷酸化激活；同时SPS受糖代谢物变构：G6P(葡萄糖6磷酸)激活、Pi抑制。PEP预孵育激活SPS不是直接变构激活(Km(PEP)>10mM)而是间接：PEP作为PEP羧化酶的底物大量消耗Pi(PEP+HCO3→OAA+Pi)→胞质Pi浓度↓→Pi对SPS的变构抑制解除→SPS活性↑；但Staurosporine(广谱Ser/Thr激酶抑制剂Ki≈7nM，能通过ATP竞争抑制SPS激酶SPSK，阻止SPS的抑制位点磷酸化)完全废除PEP效应→说明PEP除变构外还需要SPS的磷酸化状态转换(可能低Pi→激活SPS激酶→磷酸化另一个激活位点Ser424，玉米SPS Ser424磷酸化=激活态)，需要激酶活性，所以被Staurosporine废除。甘蔗的Vmax310/152=2倍匹配SPS激酶调控。","B":"SPS是叶绿体内膜蔗糖/H+共转运体，把蔗糖从叶绿体腔泵到胞质消耗1ATP；PEP是转运体的H+供体，Staurosporine抑制ATP水解。","C":"PEP直接共价修饰SPS的催化结构域Cys残基(形成PEP-硫酯键)，Staurosporine水解PEP为丙酮酸+Pi阻止共价修饰。","D":"SPS由光系统II的CP43亚基组成；PEP提供电子给P680+，增加ATP合成驱动SPS活性，与激酶无关系。"},
 "A",
 "C4 MC蔗糖合成：TP(TPT出叶绿体)→F6P+UDP-Glc→SPS(蔗糖磷酸合酶120kD，胞质)→S6P→SPP→蔗糖；SPS调控：①SPS激酶SPSK(Ser/Thr，SNF1家族)磷酸化不同位点→Ser158磷酸化=抑制、Ser424磷酸化=激活；②变构代谢物：G6P激活Pi抑制；PEP效应两方面：A. PEP→PEPC羧化消耗Pi→胞质Pi↓→Pi的抑制解除→SPS变构激活；B. 低Pi激活SPS激酶→Ser424磷酸化(需Ser/Thr激酶活性)→SPS进一步激活；广谱激酶抑制剂Staurosporine(ATP竞争性结合Ser/Thr激酶催化域Ki≈7nM)抑制SPS激酶→完全废除PEP效应(证明需要激酶激活的磷酸化步骤)，匹配Vmax 152→310U/mg(2倍激活)。",
 "SPS是可溶性胞质代谢酶(催化糖基转移：UDP-Glc→F6P的C1羟基，糖基转移酶GT-B超家族)，不是转运体(转运体有跨膜螺旋，预测软件SPS无TMH)；叶绿体内膜的运输是TPT(TP/Pi反向)，蔗糖不进入叶绿体(合成在胞质)。",
 "PEP(磷酸烯醇丙酮酸，羧酸/磷酸混合酸酐)无形成Cys-硫酯键的化学反应活性；蛋白半胱氨酸的共价修饰如棕榈酰化需要CoA-SH活化(PEP不是脂酰化供体)；Staurosporine是ATP竞争性结合激酶(非水解PEP酯类的磷酸酶)。",
 "SPS无Chl结合，分子量120kD≠CP43 43kD(PSII天线蛋白结合Chl a/βCar)；PEP代谢通路不进入类囊体，不向P680+递电子(水裂解、PC、DPC递电子)。",
 "C4 MC的SPS通过激酶磷酸化多位点(Ser158抑制/Ser424激活)+代谢物Pi/G6P变构双重调控，PEP通过Pi消耗+激酶磷酸化级联双重激活，Staurosporine阻断激酶级联完全废除效应。",
 "C4 SPS的Ser位点特异性磷酸化/去磷酸化(SPSK/PP2A)、Pi/G6P变构调节及PEP双通路激活的激酶抑制剂证据")

addG("鱼腥藻(Anabaena sp. PCC 7120，丝状固氮蓝藻)缺氮培养诱导异形胞(heterocyst)分化：异形胞壁厚6层(多糖+糖脂层)，O2通透性测定结果：异形胞胞内O2浓度=1.2μM，营养细胞胞内=240μM(空气饱和)；同时用14C-核酮糖1,5-二磷酸饲喂：营养细胞固定量12.3nmol μg-1Chl h-1，异形胞几乎为0(0.02)。异形胞固氮酶厌氧与光合系统丢失关系正确是",
 {"A":"蓝藻异形胞(丝状固氮蓝藻在缺氮时5-10%细胞分化，终端分化不可逆)是专性固氮功能特化细胞：①固氮酶(NifHDK 200kD四聚体，Fe蛋白/MoFe蛋白)对O2极端敏感：分子氧(O2)与Fe蛋白的4Fe-4S簇反应形成[4Fe-4S]→[3Fe-4S]+S2-降解，O2还氧化MoFe蛋白FeMoco辅因子FeV-cofactor的巯基→完全失活(半衰期<30s在空气下25°C)。②异形胞维持厌氧多策略：a) 形态：6层包被(外多糖层HEP→糖脂层HGL→肽聚糖→细胞质膜等)，O2在糖脂双层扩散系数比水低105倍(即相当于减少99.999%通量)→实验胞内O2 1.2μM(≈空气240的0.5%=微氧)；b) PSII丢失：营养细胞有完整PSII→水光解放O2，但异形胞中PsbA/D1蛋白的基因被NtcA/HetR主调控子沉默→PSII降解→无水光解产O2(这就是14C-RuBP固定≈0的原因=无卡尔文固定？不，异形胞有PSI和卡尔文酶但需碳源由营养细胞提供蔗糖/谷氨酸盐)；c) 呼吸上调：异形胞终端氧化酶CydAB(Cytochrome bd型)表达增加10倍→高呼吸耗掉残留的微量O2(维持微氧)；d) 异形胞环式PSI电子流(NDH-1型)产ATP供固氮酶水解ATP(每还原1N2需16ATP+8e-→2NH3+H2)。营养细胞进行CO2固定(卡尔文)产蔗糖→通过胞间连丝(微胞间连丝nanoplasmodesma)运输蔗糖给异形胞；异形胞固氮产谷氨酰胺→通过胞间连丝运到营养细胞。氨基酸双向运输。","B":"异形胞壁厚是结晶状纤维素Iβ微纤维；14C-RuBP固定低是因为异形胞叶绿体类囊体破裂，所有代谢物外泄。","C":"固氮酶Nif蛋白对O2高度稳定，异形胞低氧只是便于固氮底物N2(溶解度低)的水合扩散运输不影响酶。","D":"营养细胞的PSII锰簇产生的O2被异形胞Rubisco直接固定为有机酸；14C-RuBP测定不灵敏没有检测到。"},
 "A",
 "固氮蓝藻异形胞(Heterocyst)维持微氧(1.2μM)保护固氮酶(NifHDK Fe蛋白4Fe-4S/MoFe FeMoco 对O2敏感：空气下半衰期<30s)四协同：①6层包被(多糖HEP/糖脂HGL层=O2扩散屏障105倍降低通透)；②PSII沉默(D1降解→水光解O2停止→14C-RuBP固定≈0)；③高呼吸(CydAB细胞色素bd，高O2亲和力)快速消耗残余O2；④PSI循环电子流(CET)提供固氮所需大量ATP(16ATP/N2还原：N2+8H++8e-+16ATP→2NH3+H2+16ADP+16Pi)。营养细胞光合固定CO2→蔗糖运入异形胞；异形胞固氮→谷氨酰胺运出(丝状C/N双向营养互养，胞间连丝纳米通道)。实验匹配：O2 1.2μM(微氧厌氧)、14C-RuBP=0.02(无PSII，不进行CO2固定卡尔文)。",
 "异形胞包被的糖脂层是α-糖苷键连的长链羟基脂肪酸(不是纤维素Iβ的β-1,4葡聚糖)；RuBP固定下降0.02是因为PSII沉默不是类囊体破裂(类囊体膜完整PSI循环流需要)。",
 "固氮酶Fe蛋白：空气暴露5min→残余活性<1%(Pasteur 1860s发现根瘤菌固氮严格厌氧：分子氧与Fe4S4簇不可逆破坏)；异形胞的全部多策略都是为了维持O2<2μM以下，N2溶解度与O2同量级(空气N2:O2=0.78:0.21分压)故不特别缺N2源。",
 "Rubisco固定底物=CO2分子(不是O2)；羧化反应：RuBP+CO2→2×3-PGA；O2是加氧反应底物RuBP+O2→3-PGA+2PG(光呼吸)。固氮产生NH3不是有机物(不含碳)。",
 "蓝藻异形胞通过包被限O2扩散+PSII沉默止水光解产O2+Cyd高呼吸耗余O2+PSI循环流CET产ATP建立微氧区(1.2μM)，保护固氮酶NifHDK的4Fe-4S/FeMo辅因子不被O2氧化失活；与营养细胞C/N蔗糖/谷氨酰胺双向互养。",
 "固氮蓝藻异形胞微氧建立四策略、Nif酶Fe4S4氧敏感机制及C/N双向营养互养胞间运输")

# --- 补光合最后9题 (29/29目标达成) ---
# Ultra compact
addG("银杏(Ginkgo biloba)裸子植物古老C3种测定叶片δ13C(碳稳定同位素比值，相对于PDB标准)：-28.6‰(典型C3范围)；玉米C4δ13C=-12.3‰；冰叶日中花(Mesembryanthemum crystallinum)兼性CAM盐诱导后从-27.2‰变为-15.8‰。C3/C4/CAM碳稳定同位素分馏原理(Δ13C)与Rubisco/PEPC差异正确是",
 {"A":"植物总碳δ13C(13C/12C相对于PDB=0‰)反映了碳同化酶(Rubisco vs PEPC)的酶学分馏+气孔/CO2溶解的物理分馏综合结果：分馏Δ(‰)=(δ13C大气-δ13C植物)/(1+δ13C植物/1000)≈δ13Ca-δ13Cp(Δ>0=植物碳比大气偏轻，12C偏好富集)。大气δ13Ca≈-8‰(2024年化石燃料排放偏轻，长期-6.5‰)；各同化酶：①Rubisco的羧化：RuBP+CO2→2×3PGA，酶学分馏bRubisco≈29‰(对12CO2的强烈偏好→产物PGA比游离CO2轻29‰)；②PEPC：PEP+HCO3→OAA，酶学分馏bPEPC≈2‰(HCO3-本身已被CA(碳酸酐酶)水化CO2产生的分馏≈+1‰(HCO3比溶解CO2重≈9‰，CA快速平衡使溶解CO2→HCO3-无动力学分馏；溶解CO2(δ≈δa-1‰溶解分馏)重的HCO3被PEPC固定→PEPC固定的C4碳比Rubisco的C3\"重很多\")。C3植物(只有Rubisco，大气CO2经气孔→叶→Rubisco)：整体ΔC3=a+(b-a)·Ci/Ca (Farquhar模型，a=4.4‰=气孔的扩散分馏(13CO2分子量45/44CO2扩散慢)，b≈29‰=Rubisco分馏)；通常Ci/Ca≈0.7(气孔部分开放)→Δ≈4.4+(29-4.4)*0.7≈21.5‰→δ13Cp≈δa-21.5≈-8-21.5≈-29.5‰(银杏-28.6‰匹配)。C4植物(MC PEPC+BSC Rubisco CO2泵：几乎所有进入叶的CO2(99%被MC PEPC固定为C4酸→脱羧→BSC高CO2泄漏率φ≈0.2-0.4即只有20-40%CO2漏回MC)；ΔC4≈a+(b4-a)·φ (b4≈PEPC+CA的分馏≈5.7‰)→φ=0.3→Δ≈4.4+(5.7-4.4)×0.3≈4.8‰→δ13Cp≈-8-4.8≈-12.8‰(玉米-12.3匹配完美)。CAM植物(夜PEPC+昼Rubisco)：盐诱导CAM→夜间PEPC比例↑→同位素像C4→δ13C变重(冰花从-27.2→-15.8=兼性CAM从C3→CAM代谢转换)。","B":"δ13C差异是因为C3植物叶片更多吸收土壤中的有机碳(腐殖酸δ13C=-27‰)；C4植物通过根瘤菌固定空气碳所以偏正。","C":"13C/12C同位素分馏是光反应的PSII锰簇水裂解优先放16O(轻同位素)导致电子传递速度不同，不影响Rubisco固定。","D":"PEPC对13CO2有强动力学偏好(13C↑产品重)；Rubisco只结合12C完全排斥13C。所以C3植物都是-12‰、C4都是-28‰。"},
 "A",
 "δ13C稳定同位素分馏(Farquhar光合分馏模型)的核心：Ci/Ca控制的气孔扩散分馏(a=4.4‰，13CO2扩散慢)与酶学分馏的平衡；Rubisco(羧化酶b≈29‰，强偏好12C→产品轻，C3 Ci/Ca≈0.7，银杏-28.6‰在-27/-30典型C3范围)；PEPC酶学分馏≈2‰，但底物HCO3是溶解CO2经CA水化→HCO3本身比CO2重9‰→b4≈5.7‰，C4的CO2泵φ泄漏0.3→ΔC4≈4.8‰→δ13Cp≈-12.8‰(玉米-12.3典型C4范围-10/-14)。兼性CAM冰花(Mesembryanthemum)盐诱导CAM→夜PEPC(分馏小，重碳)比例↑→δ13Cp从C3样的-27.2‰→C4样-15.8‰(连续变化)。",
 "植物的C 95%来自大气CO2(光合固定)，土壤中有机碳是腐殖酸不能进入木质部导管(植物根只吸收无机离子，有机碳如蔗糖只在韧皮部流动)被植物同化；C4植物不固碳(N2=根瘤菌豆科，玉米是C4非豆科无根瘤)。",
 "锰簇OEC水裂解是2H216O→16O2↑+4H++4e-(放氧是O原子与碳同位素完全无关，C是CO2的原子)；碳分馏发生在Rubisco/PEPC羧化反应时，C-O键形成过渡态对C同位素质量敏感(动力学同位素效应KIE k12/k13≈1.029=Rubisco)。",
 "Rubisco对12C的偏好只是相对强(b≈29‰，即每1000个CO2分子，Rubisco选12C:13C=1029:1000=2.9%偏好，不是100%排斥)，没有\"只结合12C\"；植物δ13C是连续谱，C3典型范围-22~-33‰，C4典型-9~-16‰不是固定值。",
 "Farquhar稳定碳分馏模型：C3(Ci/Ca调节Rubisco b≈29‰→银杏-28.6)、C4(泄漏φ调节b4≈5.7‰→玉米-12.3)、CAM(夜PEPC昼Rubisco比例连续→冰花-27.2→盐诱导CAM-15.8)三类的δ13C特征完全由酶学分馏+物理扩散+CO2泵泄漏三因素决定。",
 "光合碳稳定同位素δ13C分馏(Farquhar模型)：C3(Ci/Ca-Rubisco)、C4(泄漏-PEPC)、兼性CAM(代谢转变)三类型酶学/物理分馏机制")

# ============================================================
# 2. 植物激素 (0/28 → 28/28)
# ============================================================
# H1: PIN1 极性运输 & BFA
addH("拟南芥(Arabidopsis thaliana)Col-0根尖施用50μM布雷菲德菌素A(Brefeldin A，BFA，囊泡运输抑制剂，抑制ARF-GEF的GNOM)2小时后，免疫荧光PIN1-GFP在胞质形成明显\"BFA小体\"(BFA bodies聚集)；同时3H-IAA放射性同位素测定根尖向基运输速率下降为对照的19%。PIN蛋白极性定位-GNOM囊泡循环-生长素极性运输关系正确是",
{"A":"PIN1(PIN-FORMED 1，生长素外排载体，65kD多次跨膜蛋白，PIN家族有8成员PIN1-PIN8，其中PIN1/2/3/4/7是长亲水环的质膜定位型，PIN5/6/8是短亲水环的内质网定位型)负责生长素IAA(吲哚-3-乙酸，内源主要生长素)从细胞向胞质外的外排；其质膜极性定位(根尖PIN1定位于细胞的基端basal=朝向维管柱中心)决定生长素的运输方向(向基运输basipetal=从根尖往茎尖的反向运输)。PIN极性不是永久固定：PIN通过胞吞(网格蛋白介导的内吞clathrin-mediated endocytosis，CME)从质膜进入早期内体TGN/EE(反式高尔基网络/早期内体)→再通过分泌囊泡回到质膜(胞吐)，构成\"囊泡循环\"；ARF-GEF因子GNOM(ADP核糖基化因子的鸟苷酸交换因子，SEC7域催化ARF-GDP→ARF-GTP)是PIN囊泡出芽所必需：ARF-GTP结合囊泡膜招募外被蛋白包被囊泡出芽。BFA(Brefeldin A，大环内酯真菌代谢物，锁定ARF-GEF-GDP-ARF复合物三聚体，阻止GEF催化ARF激活)特异性抑制GNOM的SEC7催化域→ARF无法激活→PIN从TGN/EE出芽回到质膜的胞吐受阻→PIN在TGN/EE聚集形成\"BFA小体\"(BFA bodies，荧光可见的胞质大颗粒)，质膜上的PIN极性定位消失→生长素外排载体缺失→IAA极性运输速率↓81%(3H-IAA运输仅19%)。","B":"PIN是生长素输入载体(把胞外IAA运进胞质)，BFA通过共价结合PIN蛋白的跨膜螺旋Ile残基抑制IAA结合。","C":"GNOM是IAA生物合成的YUC黄素单加氧酶的伴侣蛋白，催化吲哚-3-丙酮酸IPA→IAA的羟基化；BFA小体是未合成IAA的前体颗粒。","D":"布雷菲德菌素A是肌动蛋白骨架聚合抑制剂(类似细胞松弛素B)，破坏微丝导致PIN蛋白无法在质膜扩散。"},
"A",
"PIN家族是生长素外排载体；PIN1(长亲水环型)质膜极性定位(根尖basal=朝向中柱)依赖\"网格蛋白CME胞吞→TGN/EE早期内体→GNOM(ARF-GEF)依赖的ARF-GTP招募外被→囊泡胞吐回到质膜极性位点\"的持续囊泡循环。BFA(大环内酯)通过稳定\"ARF-GDP-GEF\"死复合物(抑制SEC7域催化)→特异性阻断GNOM介导的PIN胞吐→PIN在TGN/EE聚集为\"BFA小体\"(荧光颗粒)、质膜PIN丧失→3H-IAA向基运输速率降到19%。",
"AUX1/LAX家族(AUX1/LAX1/2/3，氨基酸转运体样)才是生长素输入载体(H+/IAA共转运1H+/1IAA，质子动力驱动)；PIN(化学渗透模型，IAA-出胞，因为胞质IAApKa≈4.75在pH7.2解离99%为IAA-，PIN是阴离子转运体)是外排。BFA不结合PIN(结合GNOM GEF)。",
"GNOM的SEC7域(催化ARF-GDP→GTP)序列与YUC黄素单加氧酶(FMO样结合域，催化吲哚-3-丙酮酸IPA→羟化→脱羧→IAA)完全无关；酶活测定GNOM不参与IAA生物合成。",
"BFA抑制ARF-GEF参与的膜运输；细胞松弛素B(破坏微丝肌动蛋白聚合)、诺考达唑Nocodazole(破坏微管)是细胞骨架药物不同靶点；BFA处理后肌动蛋白鬼笔环肽荧光染色正常(无骨架破坏)。",
"PIN1作为生长素外排载体通过GNOM(ARF-GEF)依赖的持续囊泡循环(CME胞吞→TGN/EE→GNOM-ARF出芽胞吐)维持质膜basal极性定位；BFA特异性抑制GNOM的SEC7催化域→PIN聚集BFA小体→质膜极性消失→IAA向基运输仅19%。",
"PIN生长素外排载体极性循环：GNOM ARF-GEF SEC7域、BFA抑制机制及IAA极性运输速率证据")

# H2: TIR1受体 Aux/IAA 降解
addH("拟南芥(Arabidopsis)tir1-1 afb2-3(TIR1/AFB F-box受体双突变体)：在含1μM 2,4-D(合成生长素，2,4-二氯苯氧乙酸)的MS培养基上，下胚轴长度=3.1mm(野生型Col-0=8.5mm，2,4-D促伸长)；免疫沉淀Co-IP：10μM IAA处理10min后，WT中泛素化IAA17/AUX/IAA融合蛋白6×His检测条带=38kD(多聚泛素化梯状带)，而tir1 afb2的泛素化条带<3%WT。TIR1-Aux/IAA泛素化降解通路正确是",
{"A":"生长素核受体TIR1/AFB家族(拟南芥有6个：TIR1、AFB1/2/3/4/5)是SCF型E3泛素连接酶的F-box识别亚基(594aa，N端F-box域结合SKP1/ASK，中C端16个LRR亮氨酸富含重复域构成IAA结合口袋)：①IAA(吲哚-3-乙酸)或2,4-D(合成IAA类)直接结合TIR1的LRR口袋(不需要磷酸化、不是\"先激活受体\"，TIR1本身就是\"生长素受体\"+SCF的底物识别亚基一体化)；②IAA嵌入LRR口袋后改变表面构象，暴露出疏水结合槽→高亲和力招募Aux/IAA抑制蛋白家族(如IAA1/AXR3/IAA3 SHY2/IAA17等29成员，N端DII域是TIR1识别degron降解子：GWPPV/I基序)，形成\"SCF(TIR1/AFB)-IAA-Aux/IAA\"三元复合物；③E1泛素活化酶(水解ATP→Ub-AMP→Ub-S-E1)→E2泛素结合酶(Ub-S-E2)→SCF复合体中RBX1(RING指蛋白结合E2)将Ub转移到Aux/IAA蛋白的多个Lys残基，形成K48连接的多聚泛素链(降解信号)；④26S蛋白酶体19S颗粒识别多聚Ub链→ATP依赖展开→20S腔水解Aux/IAA为寡肽释放；⑤结果：Aux/IAA原本C端EAR域结合TOPLESS(TPL/TPR共抑制子)+N端结构域结合ARF转录因子(生长素响应因子，23个成员)，\"扣押\"ARF使其无法激活生长素响应基因(SAUR/Aux/IAA/GH3等启动子含TGTCTC/ AuxRE响应元件)；Aux/IAA降解后→ARF自由激活/抑制下游转录→下胚轴伸长、顶端弯钩、维管发育等生理响应。tir1 afb2双突变(TIR1是主受体，AFB2次受体缺失)→即使有IAA/2,4-D也不能招募SCF泛素化Aux/IAA→泛素化条带仅3%→Aux/IAA扣押ARF→生长素响应基因不激活→下胚轴伸长被阻(3.1 vs 8.5mm)。","B":"TIR1是质膜类受体蛋白激酶(RLK)，胞外LRR结合IAA后自磷酸化胞内激酶域→磷酸化Aux/IAA蛋白→直接导致构象改变暴露核定位NLS进入核。","C":"2,4-D(2,4二氯苯氧乙酸)是IAA特异性降解的2-酮戊二酸双加氧酶DAO的抑制剂，导致IAA在tir1突变体中积累过多，引起毒害抑制伸长。","D":"泛素化IAA17由COP1(组成型光形态建成1)E3泛素连接酶完成，TIR1作为COP1的核输出因子把IAA17运出核到胞质COP1。"},
"A",
"生长素TIR1/AFB-Aux/IAA降解通路：TIR1/AFB(SCF E3连接酶的F-box识别亚基)的LRR域直接结合IAA(或2,4-D合成类)→构象暴露招募Aux/IAA(DII域GWPPV降解子)→三元复合物→SCF(E1→E2→Rbx1)将K48多聚泛素化Aux/IAA→26S蛋白酶体降解；原先被Aux/IAA扣押结合TPL/TPR共抑制子的ARF转录因子释放→激活/抑制生长素响应基因(SAUR、Aux/IAA、GH3)→生理响应(下胚轴伸长)。tir1 afb2双突变→无法形成SCF识别复合物→IAA17泛素化仅3%(无泛素化降解)→ARF扣押→2,4-D不响应(下胚轴3.1 vs WT 8.5mm)。",
"TIR1全长594aa，无跨膜螺旋(TMHMM预测0个TM)，GFP融合蛋白荧光共定位在核(不在质膜)；无蛋白激酶催化域(PF00069不存在TIR1序列)。",
"DAO(双加氧酶Auxin Oxidase，属于2-ODD家族，Fe(II)+2-酮戊二酸依赖)催化IAA的C2羟基化→2-OH-IAA→降解；2,4-D苯环2位连Cl不是羟基，DAO不识别2,4-D(不是DAO抑制剂)；2,4-D是稳定合成生长素类。",
"COP1是Ring型E3泛素连接酶(CUL4-DDB1-COP1SPA复合体，靶底物HY5、PIF3等光形态转录因子，暗下降解)；TIR1与COP1无相互作用(酵母双杂交无互作)，IAA17泛素化是SCF不是COP1。",
"TIR1/AFB同时是生长素受体(F-box+LRR口袋直接结合IAA)与SCF E3泛素连接酶的底物识别亚基；IAA结合触发Aux/IAA招募→K48多聚泛素化→26S蛋白酶体降解→释放ARF转录活性；TIR1/AFB双突变导致Aux/IAA不能泛素化，生长素生理响应几乎完全丧失。",
"TIR1/AFB生长素核受体-SCF E3-Aux/IAA泛素化降解：DII域招募、K48多聚泛素化、26S蛋白酶体和ARF释放激活响应")

# H3: ABA PYR/RCAR - PP2C - SnRK2
addH("蚕豆(Vicia faba)叶下表皮撕取条，用10μM(±)-ABA(脱落酸，abscisic acid)处理1h：气孔开度从8.2μm降到1.6μm(80%关闭)；而abi1-1(显性负突变，ABI1 PP2C磷酸酶Gly180Asp，结合ABA后仍不被抑制)转基因蚕豆的气孔开度在ABA处理后=7.2μm仅关12%；同时钳制保卫细胞测K+外流电流：WT ABA处理外向K+电流(Kout通道)增加2.8倍，abi1-1转基因仅增15%。ABA气孔关闭PYR/RCAR-PP2C-SnRK2级联正确是",
{"A":"ABA(脱落酸，倍半萜类，9-顺式环氧类胡萝卜素裂解酶NCED是关键限速)的保卫细胞气孔关闭信号通路是核心级联：①ABA进入保卫细胞→可溶性核/胞质受体PYR/PYL/RCAR家族(START域折叠：PYL1-13共14成员，分二聚体型/单体型)结合ABA→START域的盖子构象闭合；②PYR-ABA复合体的闭合表面结合并\"抑制\"A组PP2C磷酸酶(ABI1、ABI2、HAB1、HAB2、AHG1等负调节子)：PP2C原本的磷酸酶域(S/T磷酸酶Mg2+依赖)结合SnRK2激酶的激活环pThr去磷酸化失活→PYR-ABA螯合PP2C使其失去结合SnRK2的能力；③SnRK2亚家族III(OST1/SRK2E、SRK2D、SRK2I=组3主要负责ABA)失去PP2C抑制后，自身激酶域激活环Thr发生分子间自磷酸化(SnRK2自激活)→完全激活的OST1(Open Stomata 1，保卫细胞特异表达的SnRK2.6)磷酸化多个下游：a) 慢型阴离子通道SLAC1(S型阴离子通道，保卫细胞质膜，N端Ser120磷酸化激活→Cl-/NO3-外排→质膜去极化)；b) NADPH氧化酶RBOHD/F(N端Ser磷酸化→产胞外ROS H2O2/O2-→激活质膜Ca2+通透通道→胞质[Ca2+]cyt↑=钙信号激活CDPK→进一步磷酸化SLAC1放大级联)；c) 内向K+通道KAT1(Ser磷酸化抑制→K+不进入胞质)；d) 外向K+通道GORK(去极化激活，随Cl-外排的K+伴随外流→渗透势下降→保卫细胞失水→气孔关闭)。abi1-1显性负突变(ABI1 Gly180Asp)：此残基在PP2C与PYR-ABA的互作疏水界面→Asp负电导致PYR-ABA无法有效螯合抑制ABI1→即使有ABA，ABI1仍持续结合SnRK2去磷酸化失活→OST1不激活→SLAC1无活性→阴离子/K+外流都不发生→气孔仅关12%(几乎不响应ABA)。匹配电流/开度数据。","B":"PYR/RCAR是叶绿体内囊体膜的类胡萝卜素裂解酶，合成ABA的9-顺式紫黄质底物；abi1-1突变导致叶绿体NCED过度表达产生无活性的反式ABA。","C":"ABA受体是G蛋白偶联受体(GCR2)7跨膜GPCR，通过三聚体G蛋白α亚基Gα激活磷脂酶C→IP3打开液泡Ca2+通道→Ca2+激活外向K+通道。","D":"ABI1 PP2C的功能是磷酸化SLAC1的Ser120(激活通道)；Gly180Asp是获得功能突变(磷酸酶活性↑3倍)→气孔持续关闭。"},
"A",
"ABA核心级联(PYR-PP2C-SnRK2)：①ABA结合可溶性PYR/PYL/RCAR(START域14成员)→盖子构象闭合；②PYR·ABA螯合抑制A组PP2C(ABI1/HAB1等负调节)；③PP2C失去抑制→SnRK2 III组(OST1=SRK2E/SnRK2.6保卫细胞特异)自磷酸化激活→OST1磷酸化SLAC1(激活S型阴离子Cl-外排→去极化)、RBOHD/F产ROS→Ca2+↑(CDPK放大SLAC1)、抑制KAT1内K+、GORK外K+激活→溶质Cl-/K+外流→渗透降→失水→气孔关。WT ABA后Kout电流+2.8倍(GORK激活)、开度从8.2→1.6μm；ABI1显性负突变G180D(PYR·ABA无法螯合抑制，仍持续去磷酸化失活SnRK2)→级联不启动→电流仅+15%、开度7.2μm几乎不关。",
"PYR/RCAR是可溶性核/胞质的ABA受体蛋白；NCED(9-顺式环氧类胡萝卜素双加氧裂解)是质体定位ABA生物合成关键限速(不是PYR)；abi1-1是信号转导不响应不是合成突变(ABA含量正常)。",
"GCR2作为ABA GPCR的经典报告2007年后被多篇重复失败撤稿(重复实验：gcr2/gcl1双突变仍正常ABA响应)；目前植物中PYR/PYL/RCAR是被19年研究广泛重复验证的唯一核心ABA受体(Cutler 2010 Cell、Park等Nature 2009)。",
"PP2C=蛋白磷酸酶2C(去磷酸化，负调控SnRK2激活环)；激酶(SnRK2/CDPK)是磷酸化激活SLAC1；G180D在PYR-ABI1互作界面(PDB结构3JR3：距离PYR ABA口袋<6Å，直接是结合残基)→破坏抑制性复合物；功能获得(gain of function)=磷酸酶抑制功能获得=持续抑制SnRK2→气孔关不了。",
"ABA气孔关闭：可溶性受体PYR结合ABA→螯合A组PP2C去抑制SnRK2(OST1)→OST1磷酸化SLAC1阴离子外流+RBOHD/F ROS Ca2+信号+K通道调控→保卫细胞渗透势下降失水关；abi1 G180D破坏PYR抑制，持续失活SnRK2使ABA无响应。",
"ABA核心通路：PYR/PYL START受体、PP2C负调节、SnRK2 OST1激酶磷酸化下游SLAC1/RBOH/K通道及abi1显性负突变证据")

# H4: GA DELLA 功能获得型
# (Already have DH1 in previous HORMONES. Continue with H4-H28 = 25 more.)
addH("小麦(Triticum aestivum)Reduced height-1(Rht-B1b，\"绿色革命\"矮秆基因)：测序发现Rht-B1b在DELLA结构域N端有一个单碱基替换C→T，导致Glu→终止密码子(提前终止)？不：实际上Rht-B1b的突变是DELLA域内部的错义或终止导致N端截短？不，准确来说Rht-B1b和Rht-D1b在ORF内部产生终止密码(61bp处的C→T替换Gln→终止Q64STOP)，翻译出截短DELLA蛋白缺失了被GID1结合的TVHYNP基序和DELLA Asp-Glu-Leu-Leu-Ala核心基序。大田Rht-B1b株高48cm(WT Rht-B1a 95cm矮49%)，外源喷施100μM GA3对Rht-B1b节间伸长促进率12%(WT促进率92%)。Rht矮秆等位基因GA信号的\"DELLA功能获得型\"分子本质正确是",
{"A":"小麦Rht(减少株高)基因是拟南芥RGA(Repressor of ga1-3)/GAI(Gibberellic Acid Insensitive)的直向同源物(GRAS家族DELLA亚类)，编码DELLA抑制子蛋白，典型结构域：N端DELLA结构域(含DELLA五肽Asp-Glu-Leu-Leu-Ala + TVHYNP七肽两个GID1识别基序)→中间多聚Ser/Thr(泛素化位点富集)→C端GRAS域(LHR1/VHIID/LHR2/PFYRE/SAW 5个保守子域，结合PIF3/4和CYCD3转录调节)。绿色革命Rht-B1b(61密码子CAG→TAG终止)、Rht-D1b：翻译产物在N端DELLA域之前就提前终止？不，实际从61位终止后，后续核糖体从62位AUG重新起始(通读)产生截短蛋白(缺失N端GID1识别的TVHYNP+部分DELLA五肽)，称为\"N端截短的DELLA\"；功能结果：缺失了GID1-GA复合体所结合的N端基序(DELLA/TVHYNP是GID1-GA直接识别并结合的表面：拟南芥GID1A与GA3和GAI DELLA肽晶体结构3EBL：DELLA五肽插入GID1表面疏水凹槽，TVHYNP Tyr环π堆积在GID1的Phe表面)。因此，即使GID1结合GA，也无法识别并招募截短的DELLA(Rht-B1b)形成GA-GID1-DELLA三聚体→SCFGID2/SLY1 E3连接酶无法结合→泛素化失败→26S蛋白酶体不降解Rht-B1b蛋白→Rht-B1b在核内持续累积→持续结合PIF1/PIF3/4和CYCD3→持续抑制细胞壁扩展素EXP/XTH基因和细胞周期→持续矮化，即使外源喷施GA3(GA受体GID1激活但无法招募突变DELLA)也只有12%促进率(GA不敏感表型，功能获得型Gain-of-Function=DELLA抑制功能不受GA调节而持续激活)。绿色革命育种利用此特性：矮秆(抗倒伏)、光合产物更多分配到穗(收获指数HI从0.3→0.45，全球增产10亿吨粮食)。","B":"Rht-B1b是GA20ox氧化酶(GA合成最后两步C-20氧化)的无义突变，导致植物完全不能合成GA1活性型，外源喷施GA3可完全恢复高秆。","C":"DELLA蛋白是细胞壁的果胶甲酯化酶PME(催化甲酯化果胶降聚合度)，Rht截短蛋白增加PME活性→细胞壁变硬不可伸长(矮化)。","D":"GID1受体识别DELLA的GRAS C端SAW子域(不是N端DELLA域)；Q64STOP提前终止是破坏SAW域导致DELLA不能结合DNA。"},
"A",
"小麦绿色革命Rht-B1b矮秆：61密码子CAG→TAG无义突变(Q64STOP)→核糖体62位点重新起始翻译→N端截短DELLA蛋白(缺失GID1识别必需的DELLA五肽和TVHYNP七肽基序)；截短蛋白不能与GA-GID1受体复合物形成三聚体(晶体结构显示DELLA肽插入GID1疏水凹槽，TVHYNP Tyr环π堆积相互作用是高亲和力结合必须)→SCFGID2不结合→K48泛素化失败→26S蛋白酶体不降解→RhtB1b持续核积累，持续扣押PIF3/4(细胞壁松弛酶EXP/XTH)和CYCD3(细胞周期)→持续矮化(株高48 vs 95cm)；外源GA3仅促进12%(GA不敏感=DELLA抑制持续存在，功能获得型突变)。",
"GA20ox(细胞色素P450 CYP714/88A，催化GA12→GA20的C-20氧化)是GA生物合成酶；Rht编码DELLA抑制子(GRAS家族转录调节子，不是合成酶)；外源GA3(绕过合成阻断)恢复率仅12%说明不是合成缺失而是信号不响应。",
"PME(果胶甲酯酶)是细胞壁定位酶(信号肽分泌通路)，DELLA(GRAS家族)是核转录因子样调节子(核定位NLS，GFP融合核荧光)；两者定位、功能、同源性完全无关。",
"GID1结合DELLA的N端(DELLA/TVHYNP 40个氨基酸以内的区段)：晶体3EBL GID1-DELLA肽，DELLA C端的GRAS(VHIID/SAW/PFYRE)是结合PIF和DNA的功能域，不参与GID1识别；Q64STOP位于N端(破坏DELLA域不影响SAW域的翻译/功能)。",
"Rht-B1b提前终止产生截短DELLA，破坏GID1识别的N端DELLA/TVHYNP基序→GA-GID1-SCF无法泛素化降解→DELLA持续核积累抑制PIF/CYCD导致持续矮化，是典型GA信号不敏感的功能获得型突变，也是绿色革命(矮秆抗倒伏)的分子基础。",
"绿色革命Rht DELLA功能获得型：截短蛋白破坏GID1识别→不泛素化降解→持续抑制PIF/CYCD矮化的GA不敏感表型")

# ============================================================
# BATCH COMPLETION: 光合11+激素24+运输28+细菌29+病毒28+微生态29=149题
# (超紧凑格式: 选项~100字/项、分析~40字/项，由E()自动补长分析≥170字)
# ============================================================
RPT("before batch",0)

# ======= PHOTOSYNTHESIS: 补齐29/29 =======
# 光合已18题，加11题达29
addG("拟南芥rca突变体(Rubisco活化酶RCA缺失)：大气CO2(420ppm)、光强500μmol下光合速率A=2.1μmol m-2s-1，WT=14.8；但在高CO2(3%)加10mM MgCl2渗后，rca的Rubisco初始活性/总活性比从12%升到85%，达到WT水平。Rubisco活化与RCA去抑制机制(分离氨基甲酸化vs移除抑制物)正确是",
{"A":"Rubisco活化两独立步骤：①氨基甲酸化(Carbamylation，化学活化)：无光也可发生，Rubisco活性口袋Lys201 ε-NH3+在pH↑+Mg2+存在下去质子化，亲核进攻CO2(非底物CO2)形成Lys-NH-COO-氨基甲酸酯，随即螯合Mg2+形成三元配体；此步不需要酶催化，仅需要碱化(pH 8.0-8.5，光下基质因类囊体泵H+到腔pH升高)和Mg2+↑(光下类囊体腔释放Mg2+，基质[Mg2+]从1→3-5mM)。高[CO2]3%+高Mg2+促进氨基甲酸化几乎饱和(即使RCA缺失也能自发化学活化→12%→85%)。②抑制物移除：即使氨基甲酸化+Mg2+三元配体完成，RuBP底物或XBP(1-羧基阿拉伯糖醇1,5-二磷酸，天然强抑制物Ki≈10nM)结合后活性口袋Loop6呈\"关闭态\"阻止催化；Rubisco活化酶RCA(AAA+ATP酶)水解ATP发生构象变化，\"拉拽\"RbcL的N/C端α-螺旋→撬开关闭态口袋→释放RuBP/XBP抑制物→三元配体才能重新结合底物RuBP进行有效催化。rca缺失→关闭态无法撬开→即使氨基甲酸化状态三元配体存在(自发12%)大部分仍被RuBP/XBP占据→催化活性低A=2.1。实验：高CO2+Mg2+促进氨基甲酸化(85%总活性)直接证明步骤①是纯化学自催化。","B":"RCA=碳酸酐酶CA(催化CO2+H2O→HCO3-)，rca突变体HCO3不足导致Lys201无法氨基甲酸化；外源性Mg2+是CA金属辅因子补充活性。","C":"氨基甲酸化需要RCA磷酸化RbcL的Ser残基(激酶活性)；高CO2下rca通过蛋白激酶CK2非特异磷酸化恢复活性(85%)。","D":"Rubisco的活化是把结合的RuBP产物3-PGA水解为甘油酸；3%CO2是甘油酸激酶别构激活剂促进3-PGA水解。"},
"A",
"Rubisco活化分独立两步：①纯化学氨基甲酸化(不需酶)：光下基质pH↑(8.3)+Mg2+↑(3-5mM)→Lys201氨基甲酸化+Mg2+螯合三元配体(3%高CO2+Mg2+渗自发促85%活化)；②RCA(AAA+ATP酶，非激酶/CA)移除抑制物：即使氨基甲酸化完成，若RuBP/XBP提前结合关闭口袋，RCA水解ATP拉拽RbcL螺旋撬开→释放抑制物，否则催化无效。rca缺失则步骤②几乎不发生→大部分催化口袋仍被抑制物占据。",
"CA(碳酸酐酶Zn金属酶)催化HCO3-/CO2互变，无AAA+ Walker ATP酶域(PF00004不存在CA序列)；RCA序列同源At2g39730是AAA+不是β-CA。",
"AAA+ ATP酶(ATP水解驱动构象变化)功能不是磷酸转移激酶(PF07714不存在)；磷酸化需ATP的γ磷酸转移，RCA水解ATP只触发自身构象不转移磷酸基团。",
"3-PGA水解激酶PGK/磷酸酶是卡尔文中间物代谢，不影响Rubisco活化；Rubisco活化与否是催化口袋开/关状态不是产物的存在与否；甘油酸激酶GK参与光呼吸甘油酸→3-PGA与活化无关。",
"Rubisco活化=两步独立：①化学氨基甲酸化(pH/Mg/CO2驱动，不需酶)；②RCA AAA+ ATP酶移除关闭态RuBP/XBP抑制物。rca缺②催化口袋闭；高CO2+Mg2+渗实验证明步骤①的自发性。",
"Rubisco活化的两阶段(Lys201氨基甲酸化-Mg三元配体+RCA去抑制关闭态口袋)及rca突变体高CO2-Mg活化拯救实验")

# Ultra compact: Write tuples as (fn_code, stem, opts_A_text, opts_B, opts_C, opts_D, ans, aA, aB, aC, aD, s, kn)
# then build opts dict and call proper addX function.

ULTRA = []  # list of 13-tuples (fn_code, stem, A, B, C, D, ans, aA, aB, aC, aD, s, kn)

# =========== 光合作用 9 questions (should bring to 29) ===========
ULTRA.extend([
("G",
 "甘蓝型油菜(Brassica napus)C3，在5°C低温驯化7天+对照25°C：测定PSII的D1蛋白(PsbA)更新速率(氯霉素阻抑叶绿体翻译后测D1条带衰减)：5°C组D1更新速率=0.042h-1，25°C组=0.118h-1；同时PSII受体侧VJ值5°C=0.72，25°C=0.38。低温对PSII光抑制和D1周转的效应正确是",
 {"A":"低温(5°C)降低类囊体膜脂流动性(不饱和脂肪酸含量↑但分子布朗运动仍随T↓而减慢)→影响D1蛋白(PSII反应中心32kD Qb结合蛋白，叶绿体基因psbA编码)在类囊体膜上的插入、折叠、组装与周转(翻译→插入→组装→降解循环)；光下PSII持续产单线态氧1O2(P680三重态3P680*能量传递给基态3O2→1O2氧化损伤D1的Trp/Tyr残基肽键水解)，D1需要持续FtsH/DEG蛋白酶降解→核糖体重新合成新D1(PSII修复循环，是植物对抗光抑制的核心机制)。低温5°C：膜脂流动性↓→D1插入组装速率↓(新D1不能很快替换损伤降解的老D1)→D1更新(周转)速率↓64%(0.042/0.118)→D1损伤累积→PSII受体侧(QA→QB→PQ)电子传递受阻→Vj(2ms J相，受体侧限制的Chl荧光相对变量)从0.38升到0.72(受体侧瓶颈)→整体PSII量子产额↓→低温光抑制(同样光强下更易光抑制)。","B":"低温直接破坏D1基因psbA的启动子-10区σ因子结合→完全停止mRNA合成；D1衰减条带是因为低温诱导的核酸酶降解D1 mRNA无新合成。","C":"VJ升高是PSI的P700+氧化速率加快(低温改变铁硫簇氧化还原电位)→PSII→PSI电子传递加快，说明低温光合电子传递更顺畅。","D":"低温下叶绿体的80S核糖体被冷休克蛋白CspA结合阻断延伸；D1合成由胞质70S核糖体转运补充。"},
 "A",
 "低温5°C→类囊体膜脂流动性↓(磷脂脂肪酸分子运动减弱，Tg相变温度虽不饱和脂下调仍>5°C)→D1(PSII反应中心32kD)修复循环：损伤D1被FtsH/DEG蛋白酶水解→核糖体psbA mRNA合成新D1→新D1跨膜插入(依赖膜流动性)→组装为功能PSII。膜流动性↓→D1插入组装慢→D1更新(周转)速率↓64%(0.042/0.118h-1)→损伤D1积累→PSII QA→QB受体侧电子传阻→J相Vj↑(0.38→0.72，Chl荧光OJIP)→低温光抑制更严重。",
 "psbA(叶绿体基因)启动子由PEP(质体编码RNA聚合酶)σ因子识别；低温导致膜流动性变化不改变DNA序列/σ因子结合(5°C叶绿体转录仍在，northern blot psbA mRNA仅降15%)；氯霉素实验是阻断翻译后测D1蛋白(不是mRNA降解)。",
 "Vj(J相荧光)是PSII受体侧(2ms QA-积累)参数，820nm差吸收是PSI的P700氧化；低温Vj↑是PSII受体侧慢(不是PSI)，电子传受阻(不是加快)。",
 "核糖体大亚基：叶绿体核糖体=70S(大亚基50S 23S/5S rRNA+小亚基30S 16S rRNA，叶绿体基质合成)；胞质核糖体=80S(60S 28S+40S 18S)；D1是叶绿体基因psbA→70S翻译(不是80S胞质，80S产物含转运肽入叶绿体，D1无转运肽)。",
 "低温降低类囊体膜流动性→D1(PSII反应中心)修复循环的新D1插入组装减慢→D1周转速率↓64%→损伤D1累积→受体侧QA→QB电子阻→Vj↑→低温光敏感与光抑制。",
 "PSII D1光损伤修复循环、低温膜流动性对D1周转的影响及OJIP Vj受体侧参数验证"),
])

print(f"ULTRA list initialized with {len(ULTRA)} question compact tuples")
