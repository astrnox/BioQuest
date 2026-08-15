# -*- coding: utf-8 -*-
"""Question Database: 153 remaining questions as compact tuples.
Format per tuple: (stem, opts, ans, aA, aB, aC, aD, s, kn)
Grouped by tag for processing.
"""

# ============================================================
# TAG: 光合作用 (need 11 more → 29)
# ============================================================
Q_G = []

Q_G.append(
("茶树(Camellia sinensis)叶片分离的叶绿体完整类囊体用分光光度法测定细胞色素f氧化还原动力学(554nm减吸收)：在弱光(60μmol)诱导稳态后，加入二溴百里香醌DBMIB(浓度1μM)，Cyt f的氧化速率常数从k=0.35s-1降到0.008s-1(↓98%)。同时测定PQH2→PC电子传递活性：DBMIB加入后活性降到对照的0.8%。Cyt b6f复合体Qo位点抑制剂DBMIB与Q循环机制正确是",
{"A":"Cyt b6f复合体(光合电子传递的质体醌醇-质体蓝素氧化还原酶，二聚体结构240kD，每个单体含8个辅基：Cyt f(c型血红素1)、Cyt b6(两个b型血红素bL低电位/bH高电位，相当于呼吸Cyt bc1的bL和bH跨膜双血红素)、Rieske Fe-S蛋白PetC(2Fe-2S簇，His+Cys配体)、叶绿素a(卟啉)、β-胡罗卜素、血红素cN(新型，可能参与循环流)、PQ结合位点Qo(氧化侧，腔侧，结合PQH2)和Qi(还原侧，基质侧结合PQ)。Q循环(氧化的辅酶Q循环：类似呼吸复合物III的Q循环，Mitchell提出)：①第一次Qo半反应：PQH2结合Qo→给Rieske Fe-S1e-→Cyt f→PC(Cu2+→Cu+)→同时给血红素bL1e-→bH→PQ(结合在Qi位点，1e-→半醌PQ·-半醌)；PQH2氧化为PQ(出Qo)，放2H+到腔侧；②第二次Qo半反应：第二个PQH2结合Qo→再次给Fe-S→Cyt f→PC第二个e-；同时给bL→bH→把Qi的半醌PQ·-再得e-+2H+(基质侧)→PQH2(还原型从Qi位点离开进入PQ池)；第二个PQH2氧化为PQ(出)，放2H+到腔。净化学计量(2个PQH2氧化)：2PQH2 + Q(PQi) + 2PC(Cu2+) + 2H+基质 → Q(PQH2池) + 2PQ + 2PC(Cu+) + 4H+腔侧 → Q循环每传递2e-到PC泵4H+到腔(每4e-即每O2放氧是2Q循环轮，泵8H+，加上PSII放氧的4H+=12H+/O2)。DBMIB(2,5-二溴-3-甲基-6-异丙基-p-苯醌，橙黄色结晶，PQH2类似物)是Qo位点竞争性抑制剂：占据Qo口袋(与PQH2相同的His配体位点)，阻止PQH2结合Qo，因此PQH2→Rieske Fe-S→Cyt f→PC的第一步电子传递被阻→Cyt f氧化速率降98%(k从0.35→0.008s-1)，PQ→PC活性降99%。","B":"Cyt f是NADPH脱氢酶的黄素蛋白辅基，DBMIB竞争FAD结合位点导致NADPH不能进入PSI受体侧。","C":"Q循环发生在线粒体内膜复合物I(NADH-CoQ氧化还原酶)的Fe-S簇，与光合类囊体完全无关。","D":"DBMIB是PSII的Qa位点竞争性醌类抑制剂，阻止Qa→Qb电子；PC铜氧化还原不受影响。"},
"A",
"Cyt b6f复合体Q循环(类似呼吸Cyt bc1复合物III机制)的能量偶联：2轮Qo半反应=2PQH2在Qo氧化→每次分别给Rieske Fe-S→Cyt f→PC递e-同时给bL→bH→Qi位点PQ半醌→第二轮把Qi半醌还原为PQH2(重入PQ池)；净计量：每2e-传向PC泵4H+到腔侧(PSII放氧4H++Q循环8H+=12H+/O2→ATP≈2.55/O2)。DBMIB(二溴百里香醌，PQH2结构类似物)竞争性结合Cyt b6f Qo口袋(与PQH2相同氨基酸残基配体)→PQH2不能氧化→Fe-S→Cyt f→PC电子传递全阻→Cyt f氧化速率↓98%k。",
"Cyt f(c型细胞色素，血红素C通过硫醚键连Cys的c型)是分子量32kD的类囊体腔侧蛋白(电子从Cyt f血红素→PC的Cu中心)；NADPH脱氢酶=NDH(含黄素FMN+Fe-S)≠Cyt f；NADPH/黄素不是Q循环底物。",
"Q循环概念是Mitchell 1975年提出的质子motive Q循环机制：适用于呼吸复合物III bc1、光合b6f、细菌bc1三类同源酶；类囊体b6f的bL/bH血红素跨膜双血红素拓扑与呼吸bc1完全同源(融合基因不同)；光合Q循环是类囊体，不是线粒体Complex I(Complex I是NADH脱氢酶45个亚基，完全不同)。",
"PSII的Qa/Qb位点抑制剂：DCMU(脲类)、Atrazine阿特拉津(三嗪类除草剂)作用于Qb；DBMIB是b6f Qo位点(PetB/PetD亚基共同构成的腔侧口袋)；完全不同靶点(PSII≠Cyt b6f)；PC铜的氧化还原由来自Cyt f血红素决定，DBMIB上游阻断后PC不会被还原(无法氧化Cyt f)。",
"b6f的Q循环：Qo位点两PQH2氧化，向Rieske/Cyt f/PC递2e-，同时向Qi位点PQ递2e-重生成1PQH2；净4H+泵到腔侧每2e-(ΔpH建立)；DBMIB作为Qo竞争抑制剂，阻止PQH2氧化阻断Q循环启动与电子传向PC。",
"Cyt b6f Q循环质子泵4H+/2e-机制、bL/bH双血红素拓扑、DBMIB Qo竞争抑制及Cyt f氧化动力学证据"))

Q_G.append(
("番茄(Solanum lycopersicum)野生型WT与sufE突变体(叶绿体SufE半胱氨酸脱硫酶激活蛋白缺失)：叶片Fe-S簇含量测定→WT=9.8nmol mg-1Chl、突变体=2.1nmol mg-1Chl(↓79%)；同时测定PSI受体侧Fe-S簇(FX/FA/FB)的EPR低温电子顺磁共振：WT g值2.05(典型[4Fe-4S]簇信号)，突变体EPR信号幅度仅WT 12%。PSI光化学效率ΦI突变体=0.32，WT=0.78。叶绿体Suf系统Fe-S簇组装与PSI功能关系正确是",
{"A":"铁硫簇Fe-S(分[2Fe-2S]、[4Fe-4S]、[3Fe-4S]型，通过半胱氨酸Cys thiolate S配体与蛋白结合)是光合电子传递链的核心氧化还原辅基：PSII的Rieske [2Fe-2S]、PSI的FX/FA/FB三个[4Fe-4S]簇、Fd铁氧还蛋白[2Fe-2S]、NDH的Fe-S亚基等都需要Fe-S簇。叶绿体Fe-S组装Suf系统(Sulfur mobilization系统，细菌SUF同源，区别于线粒体ISC系统和胞质CIA系统)由SUFBCD(半胱氨酸脱硫酶+支架复合物)、SUFE(激活半胱氨酸脱硫酶SufS的活性，SufS单独Cys-脱硫酶活性低，SufE结合后kcat↑50-100倍催化L-Cys→L-Ala+S0(过硫化物S*供体))、NFU1/2/3、HCF101(接收Fe-S并传递到靶蛋白的载蛋白)等蛋白组成：①SufS(叶绿体基质定位，NifS类半胱氨酸脱硫酶PLP依赖)催化L-Cys脱硫产生结合SufS Cys残基过硫化物的S*零价硫原子；②SufE(SUFE蛋白叶绿体定位18kD，N端结构域结合SufS增强催化)激活SufS后把S*转移到SUFBCD支架复合物(铁来源是Frataxin/AtFH蛋白结合Fe2+递送到支架)；③支架上组装预Fe-S簇([2Fe-2S]或[4Fe-4S])；④载蛋白NFU/HCF101接收预簇并靶向转运到类囊体PSI、Fd、b6f等受体蛋白。sufE突变→SufE蛋白缺失→SufS脱硫酶活性低(S*硫供体不足)→全叶绿体Fe-S簇含量↓79%(2.1 vs 9.8)；PSI FX/FA/FB三个[4Fe-4S]簇组装失败(仅12%EPR信号幅度)→PSI受体侧传递电子(Normally P700→A0→A1→FX→FA→FB→Fd→NADP+)断裂→电子无法传到Fd/NADP+→PSI光化学效率ΦI(ΔI/I，吸光度705nm)0.32 vs WT0.78(PSI大部分反应中心无功能)。","B":"SufE是叶绿体DNA聚合酶POL1B的β滑动钳亚基，突变体类囊体DNA不能复制导致PSI亚基基因丢失。","C":"Fe-S簇仅存在于线粒体呼吸复合物(I/II/III)；叶绿体PSI的FX/FA/FB是Mn-Ca簇(同PSII)，与铁无关。","D":"SufE是Rubisco的小亚基分子伴侣(Rubisco结合蛋白Cpn60)；EPR信号减弱是因为PSI天线Chl含量下降。"},
"A",
"叶绿体Fe-S簇由SUF系统(S mobilization，区别线粒体ISC和胞质CIA)组装：SufS(PLP依赖的Cys脱硫酶，单独活性低)→SufE激活SufS kcat↑50倍将Cys→Ala+S*过硫化硫供体→SUFBCD支架(结合Fe2+和S*形成预簇)→NFU/HCF101载蛋白靶向转运到PSI/Fd/b6f的Cys配体。sufE突变→S*硫供体不足→全叶Fe-S簇↓79%；PSI受体侧FX/FA/FB三个[4Fe-4S]簇组装失败(低温EPR g=2.05信号仅12%)→电子无法从A1→Fd断流→PSI光化学效率ΦI=0.32 vs 0.78(大部分PSI中心无功能)。",
"叶绿体DNA复制的DNA聚合酶是POL1A(核编码，POL1B不是滑动钳)；滑动钳是PCNA样蛋白(PROLIFERATING CELL NUCLEAR ANTIGEN同源)；sufE无DNA聚合酶/钳结构域(比对SCOP家族不存在核酸结合折叠)。",
"线粒体ISC组装[2Fe-2S]用于呼吸复合物I(8Fe-S)/II(3)/III(Rieske)；叶绿体有自己SUF系统，PSI的FX/FA/FB是[4Fe-4S](经典铁硫簇，Mössbauer谱鉴定、EPR g值特征g=1.89/1.92/2.05)；PSII的Mn4CaO5是锰钙氧簇(完全不同金属组成)。",
"SUFE是脱硫酶激活蛋白(18kD单结构域)；Cpn60(伴侣蛋白GroEL同源)是Rubisco折叠的分子伴侣(两者无序列同源)；EPR信号是金属中心电子自旋共振(顺磁)，天线Chl是抗磁的闭壳层不产生EPR。",
"Suf系统是叶绿体Fe-S组装路径：SufE激活SufS半胱氨酸脱硫酶(产S*硫供体)→SUFBCD支架组装预[Fe-S]簇→载蛋白NFU/HCF101转运到靶蛋白(PSI FX/FA/FB、Fd、Rieske)；sufE缺失S*供给不足→PSI的三个[4Fe-4S]组装失败(仅12%EPR信号)→ΦI显著下降。",
"叶绿体SUF系统Fe-S组装(SufE激活SufS产S*)、PSI FX/FA/FB[4Fe-4S]簇氧化还原功能及sufE突变EPR和ΦI下降多证据"))

print(f"Q_G appended: {len(Q_G)} (need 11 more to reach 29)")
