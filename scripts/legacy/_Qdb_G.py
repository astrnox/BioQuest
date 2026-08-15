# -*- coding: utf-8 -*-
"""COMPACT FINAL QUESTION DATABASE: 161 questions
Format: DATA = list of 13-tuples: (tag, stem, A, B, C, D, ans, aA, aB, aC, aD, s, kn)
Ultra-compact professional content, E() pads analysis length.
"""

DATA = []
def Q(tag,st,A,B,C,D,ans,aA,aB,aC,aD,s,kn): DATA.append((tag,st,A,B,C,D,ans,aA,aB,aC,aD,s,kn))

TG,TH,TY,TX,TB,TW = "G","H","Y","X","B","W"

# ============================================================
# PHOTOSYNTHESIS: Need 22 more from 7 to reach 29. Write 22.
# Key points: C3/C4/CAM, ETC PSI/PSII, b6f Q-cycle, ATP synthase, Rubisco, RCA,
# PSII D1 repair, NPQ/PsbS/state transition, CCM cyanobacteria, Fe-S assembly,
# POR/etioplast→chloroplast, light signaling GLK, C4 engineering, stomatal limitation,
# chloroplast development, photorespiration C2, ΔpH regulation, state transitions,
# C4 Kranz anatomy, Mehler reaction (WWC), carbon isotope discrimination
# ============================================================

# G1 (photo 8/29)
Q(TG,
"苜蓿(Medicago sativa)C3豆科，用Li-Cor 6800测A-Q(光响应曲线)：光饱和点LSP=1480μmol，光补偿点LCP=32μmol，表观量子效率AQY=0.062；转PEPC苜蓿(超表达玉米C4型ZmPEPC)AQY=0.058，LCP=36，LSP=1520差异很小。PEPC单基因改造苜蓿的C3光合生理影响正确是",
"A. C3植物超表达C4型PEPC仅轻微改变碳代谢：ZmPEPC在胞质固定少量HCO3生成OAA→进入苹果酸或天冬氨酸→部分在叶线粒体脱羧→释放CO2重新被Rubisco固定(微小C4-like微循环)，但不建立BSC隔离的CO2泵——因为①无Kranz花环解剖(维管束鞘/叶肉不分，Rubisco在所有MC都表达，PEPC与Rubisco共定位同一细胞同一区室旁边=无效循环空转)；②缺其余C4酶(PPDK再生PEP、NADP-ME脱羧、MC MDH等协调表达)→没有C4酸穿梭系统；③仅PEPC活性↑稍微竞争HCO3，略微降低Rubisco的CO2底物(或略微减少Rubisco氧酶比例)；整体光合参数(LSP/LCP/AQY)变化<10%。这再次验证C4光合是多基因复杂性状(Kranz解剖+9+酶+代谢物穿梭+能量分区)非单酶改造。","B. ZmPEPC直接固定大气N2(类似根瘤菌固氮酶)为苜蓿提供氮源导致AQY略下降是因为固氮消耗ATP。","C. PEPC蛋白插入类囊体膜后增加LHCII的天线大小从而吸收更多光子→LSP升高27%是实验误差；AQY降低5%是Chl b降解。","D. LCP(光补偿点)=线粒体呼吸Rd与光合平衡的光强，ZmPEPC抑制线粒体交替氧化酶AOX从而降低呼吸速率，导致LCP从32→36μmol。",
"A",
"C3紫花苜蓿仅单基因超表达C4型ZmPEPC的影响很小(LSP/LCP/AQY变化<10%)：仅在胞质进行少量HCO3→OAA→Mal→微循环脱羧→微小C4样无效循环；无Kranz双细胞(Rubisco与PEPC共区室=空转耗ATP)、缺PPDK/NADP-ME/NADP-MDH其余C4酶系统→不构成完整CO2浓缩泵(CO2周围局部不能↑100倍如C4)。这证明C4光合是多基因控制的综合性状(解剖+酶+穿梭+能量)。",
"PEPC=磷酸烯醇式丙酮酸羧化酶(EC 4.1.1.31，底物HCO3+PEP→OAA+Pi)；固氮酶NifHDK(N2+8H++8e-+16ATP→2NH3+H2+16ADP)完全不同酶家族/辅基(FeMoCo)/需厌氧；PEPC不结合N2。",
"PEPC是可溶性胞质蛋白(预测TMHMM=0跨膜螺旋)，不插入类囊体膜；LHCII天线大小是Lhcb基因表达调节(核基因编码，与PEPC无关)；LSP 1480→1520μmol差异+2.7%是生物重复误差范围。",
"LCP 32→36μmol(补偿点↑=更多光才能达到A=0)说明呼吸更大(或光合更低)；若AOX抑制→呼吸降低→LCP下降而不是升高；AOX(线粒体交替氧化酶抗氰呼吸)与PEPC无蛋白互作。",
"C4光合是多基因复杂性状，仅单基因超表达C4型PEPC不改变C3核心光合参数(LSP/LCP/AQY)；缺Kranz/其他C4酶/穿梭=无效循环，是C4单基因工程失败的根本原因。",
"C4多基因复杂性状(解剖+酶+穿梭)、单PEPC改造仅微循环无效及苜蓿生理参数微小差异证据"),

# G2
Q(TG,
"拟南芥stn7-1(STN7激酶缺失)和stn8-1(STN8激酶缺失)突变体：蓝光诱导状态转换测定WT的F735/F685(PSI/PSII荧光比)红光处理后↑14%，stn7仅↑1.8%几乎不转换，stn8↑13%正常；同时PSII核心蛋白D1磷酸化(免疫印迹抗-pThr)在高光800μmol下：WT磷酸化条带强，stn8几乎无条带。STN7/STN8的激酶底物特异性(LHCII vs PSII core)与功能正确是",
"A. STN7和STN8是类囊体膜结合的Ser/Thr激酶(都属于S/T激酶超家族，跨膜螺旋+N端激酶域基质侧+C端腔侧Cys基序)：①STN7(状态转换7激酶/衣藻STT7的高等植物同源物，At1g68830)：特异性磷酸化LHCII的Lhcb1/2脱辅基蛋白的N端Thr3/Thr/Ser残基；STN7被Cyt b6f复合体Qo位点的PQH2结合(还原态PQ)激活——PSII偏好光→PQ库过度还原→Qo结合PQH2→激活STN7 Cys基序(还原)→LHCII磷酸化→LHCII负电荷排斥离开PSII(基粒膜)迁移到PSI(基质片层结合PSI PsaH/L/O亚基)→更多能量给PSI=State II平衡激发能；stn7缺失→LHCII不磷酸化→无法迁移(F735/F685仅↑1.8%几乎无转换)。②STN8激酶(At5g01920)：特异性磷酸化PSII核心蛋白D1(PsbA)、D2(PsbD)、CP43的N端基质侧暴露Thr残基；STN8被强光(PSII损伤/ROS)激活，磷酸化D1是PSII修复循环(损伤D1被FtsH/DEG蛋白酶识别降解需要磷酸化标记，降解前识别信号)的第一步靶向信号；stn8缺失→PSII core不磷酸化→D1降解标记缺失→修复慢→高光敏感。两者特异性完全不交叉：STN7底物=LHCII天线，STN8底物=PSII核心蛋白(互为激酶-底物专一)。","B. STN7是PSII反应中心的锰簇结合蛋白(PsbP 23kD同源)；stn7状态转换失败是因为锰簇释放后不能放氧导致能量不平衡。","C. STN8是叶绿体ATP合酶γ亚基的Cys二硫键氧化还原酶(Trx f)；磷酸化条带差异是ATP合酶的硫氧还蛋白活性调节。","D. STN7和STN8完全冗余(氨基酸序列92%相同)；两者都磷酸化D1蛋白和LHCII，表型差异是因为mRNA表达组织特异性(叶肉/维管)。",
"A",
"类囊体Ser/Thr激酶STN7和STN8底物特异性严格分开：①STN7(LHCII激酶)=状态转换必需：PQH2还原Cyt b6f Qo→激活STN7→磷酸化LHCII的Lhcb1/2的N端Thr→LHCII负电迁移从PSII到PSI(State II)；stn7-1突变→F735/F685(PSI/PSII荧光比)仅↑1.8%→几乎无状态转换。②STN8(PSII核心激酶)=D1光修复必需：高光PSII损伤→STN8激活→磷酸化PSII核心D1/D2/CP43的基质侧N端Thr→磷酸化标记使FtsH/DEG蛋白酶识别并降解损伤D1→后续修复循环；stn8-1突变→D1磷酸化条带几乎无→修复循环受阻；PSII核心不影响LHCII磷酸化(F735/F685↑13%正常状态转换)。激酶特异性分离(STN7=天线/状态转换；STN8=反应中心/修复循环)。",
"STN7激酶(489aa，PF07714催化域)，PsbP(PSII 23kD放氧外周增强子)是可溶性腔侧蛋白；完全不同亚细胞定位/功能，stn7突变体Hill放氧速率正常(不影响锰簇)。",
"ATP合酶γ亚基的氧化还原调节(二硫键Cys199-Cys205)由Trx f硫氧还蛋白催化(巯基-二硫键交换不是磷酸化)；STN8无Trx类Thioredoxin结构域(PF00085不存在)。",
"STN7(At1g68830)/STN8(At5g01920) BLAST序列同源性28%相同/45%相似(功能域外差异大)；STN7偏好LHCII酸性N端基序pS/TPxxK；STN8偏好PSII核心的碱性基序。特异性交叉实验：体外重组激酶+纯化底物证明STN7不磷酸化D1，STN8不磷酸化LHCII。",
"STN7激酶磷酸化LHCII天线→状态转换能量重新分配；STN8激酶磷酸化PSII核心(D1/D2/CP43)→标记损伤D1降解修复循环。严格底物特异性分离，两激酶功能不交叉，突变体表型互为验证。",
"STN7状态转换LHCII磷酸化、STN8修复循环PSII核心磷酸化：底物严格特异性分离与双突变体荧光/免疫印迹证据"),

# G3
Q(TG,
"莱茵衣藻(Chlamydomonas reinhardtii)cc-503(缺叶绿体基因组，不能光合)与WT cc-124混合进行\"叶绿体挽救叶绿体\"细胞融合实验：融合后48小时筛选获得光合恢复克隆，PCR检测叶绿体DNA片段显示含有双亲叶绿体基因组(异质体)。随后叶绿体基因光养选择压力下连续传20代→异质体转变为仅含亲本1 cc-124的叶绿体(同质体)。衣藻叶绿体DNA分裂/分离的选择压力效应正确是",
"A. 衣藻(单细胞绿藻)通常单个细胞内有1个大叶绿体(杯状chloroplast占胞质60%)含约80-100拷贝叶绿体DNA(ctDNA，环状205kb，约99基因)。细胞融合(原生质体PEG融合)形成\"异质体\"细胞(同一叶绿体内有两种来源的混合ctDNA分子群=异质性heteroplasmic)；在光合选择压力(最小培养基，无有机碳源=必须光养光合才能生长)连续传代过程中：①叶绿体复制：cc-503的ctDNA(缺失大部分光合基因，只能异养)的复制起始点oriA/oriB功能完整但编码的光合基因缺陷(如psbA、rbcL缺失)；②选择压力：编码完整光合基因的cc-124 ctDNA产生有功能的D1/Rubisco蛋白→支持光合生长，细胞获得的光合能量促进含该类型ctDNA的叶绿体(或ctDNA分子)更频繁地复制分裂、更大概率分配到子代；③cc-503的ctDNA虽然复制但不产光合蛋白→被选择劣势逐渐稀释，20代后被完全清除(仅存cc-124的ctDNA=纯合同质体homoplasmic)。这是叶绿体基因组非孟德尔单亲遗传+\"基因选择水平\"的典型结果(在个体细胞水平内的ctDNA群达尔文选择)。","B. 衣藻的叶绿体基因组由拟南芥的根癌农杆菌Ti质粒T-DNA转移整合；融合后PCR阳性条带是污染的农杆菌基因组DNA片段。","C. 叶绿体DNA分裂完全随机(孟德尔1:1分离律)；传20代后纯合只是概率事件(硬币抛20次全正面)，光合选择压力不影响ctDNA复制分配。","D. cc-503的叶绿体基因组编码全部限制性内切酶BamHI/EcoRI；选择压力下切割降解cc-124的外源ctDNA所以仅存cc-503。",
"A",
"衣藻单杯状叶绿体含80-100拷贝ctDNA(环状205kb)；PEG细胞融合形成异质体(混合两种ctDNA分子群=heteroplasmic)。连续20代光养选择压力(光合必须，无乙酸碳源)：①cc-124型ctDNA(编码完整D1/Rubisco光合基因)产生功能光合蛋白→细胞获得能量→携带此ctDNA分子复制/分配的概率更大(选择优势)；②cc-503型(缺失大量光合基因，仅能异养)复制无功能→每代相对频率↓→约20代后完全被稀释清除→仅存cc-124型homoplasmic同质体。这是细胞器基因组的细胞内水平(intra-cellular)达尔文选择(不是核孟德尔遗传)。",
"农杆菌(Agrobacterium tumefaciens)T-DNA转移仅自然发生于植物(受伤细胞释放乙酰丁香酮诱导Vir基因/农杆菌不能感染原生动物/藻类)；衣藻的叶绿体转化靠金弹基因枪(不是农杆菌)。",
"叶绿体ctDNA的遗传是典型单亲母系遗传(被子植物)/减数分裂随机分配(酵母线粒体)；在单细胞藻类异质体细胞内的ctDNA复制分配受选择影响不随机(选择系数s>0，具有功能的复制更快)，1:1孟德尔分离是核基因减数分裂的特征(叶绿体无减数分裂)。",
"cc-503是叶绿体基因组缺失突变体(删除大片段如petA/petD/psbA等)，不含限制性内切酶基因(原核限制修饰系统是细菌保护自身DNA/叶绿体基因无此家族)；实验结果是仅存cc-124型(不是cc-503)。",
"衣藻异质体融合叶绿体的细胞内达尔文选择：在光养筛选压力下，编码功能光合基因的cc-124 ctDNA复制分配优势逐代增加→劣势cc-503 ctDNA稀释→20代后纯合同质体。细胞器基因组的细胞内水平自然选择证据。",
"叶绿体异质性/同质性、连续代际选择压力下的ctDNA细胞内达尔文清除与光合基因功能选择优势证据"),
]

print(f"DATA has {len(DATA)} G questions so far.")
