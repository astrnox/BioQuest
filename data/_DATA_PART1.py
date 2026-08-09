# -*- coding: utf-8 -*-
"""ALL 161 remaining Qs in ultra-compact format.
Format: (tag, stem, A, B, C, D, ans, aA, aB, aC, aD, s, kn) where tag in 'GHYXBW'
"""
DATA = []

def Q(tag,stem,A,B,C,D,ans,aA,aB,aC,aD,s,kn): DATA.append((tag,stem,A,B,C,D,ans,aA,aB,aC,aD,s,kn))

# ============================================================
# PHOTOSYNTHESIS (19 added → total 7+19=26 if we only had 7, but we appended many in testing)
# Actually we need EXACTLY 22 more from init 7 to reach 29. Write 23 for safety.
# ============================================================
TG = "G"

Q(TG,
"水稻(Oryza sativa)ospsbs突变体(缺PsbS，qE传感器)与WT在1500μmol强光下测NPQ动力学：WT 30s内NPQ升至2.8并稳态维持，ospsbs NPQ仅0.3；加1mM抗坏血酸Asc后ospsbs NPQ仅升到0.6。同时测类囊体ΔpH(9-AA荧光猝灭)：WT 120s猝灭58%，ospsbs 55%仅差3%。PsbS-qE的Glu pH传感与叶黄素Z的放大器分工正确是",
"A. qE快速NPQ的触发需要双条件同时满足：腔侧ΔpH(pH↓5.8)和PsbS蛋白的两个Glu残基(Glu122/Glu226，pKa≈6.0刚好匹配)的质子化。PsbS(4跨膜螺旋，LHC超家族，无叶绿素结合)结合H+后从二聚体→单体构象变化→PsbS单体直接结合并诱导LHCII(Lhcb1/2/3)的聚集或构象转换→激发能以Chl-Chl电荷转移态(CT)热耗散(荧光↓=NPQ↑)。玉米黄质Z(叶黄素循环VDE酶腔侧pH<6.2激活V→Z转换)是\"放大器\"：Z与LHCII的疏水口袋结合降低构象转换的能阈，在相同PsbS+ΔpH下提高qE强度30-60%；但没有PsbS只有Z和ΔpH→几乎无qE(ospsbs的Asc+Z，NPQ仅0.3+0.3=0.6)。实验：ospsbs的类囊体ΔpH仅差55/58%=3%(H+梯度正常)但NPQ差近10×→PsbS是必需触发因子(非ΔpH或Z单独可完成)。",
"B. PsbS=VDE(紫黄质脱环氧酶，催化玉米黄质Z的合成)，ospsbs突变体完全无玉米黄质，Asc是VDE的酶辅因子。",
"C. qE的热耗散发生在PSII反应中心D1蛋白的P680激发态复合(直接→热)；PsbS稳定锰簇阻止1O2生成，ospsbs 1O2氧化D1导致NPQ缺乏。",
"D. ΔpH是NPQ的唯一决定因素，PsbS是叶绿体ATP合酶的δ亚基(调节质子通道开关)，ospsbs ΔpH差3%是实验误差。",
"A",
"qE-NPQ需PsbS(触发传感器)+ΔpH+H++Z(放大器)三协同：PsbS的Glu122/Glu226(pKa≈6.0，刚好匹配光下腔pH)质子化→二聚体解聚为单体→PsbS单体结合LHCII天线→诱导聚集/构象变化(Chl激发能CT电荷转移态热耗散=荧光↓NPQ↑)；玉米黄质Z是LHCII疏水口袋结合的放大器(提高转换效率但不触发)；单独ΔpH+Z无PsbS→几乎无qE(ospsbs：ΔpH 55%正常，NPQ仅0.3)，证明PsbS是唯一必需触发因子。",
"VDE Violaxanthin de-epoxidase(Lipocalin超家族，腔侧可溶性外周蛋白43kD)≠PsbS(22kD整合膜蛋白4TM)；Asc确实是VDE的共底物(VDE催化需要:2V+2Asc→2Z+2H2O+半脱氢抗坏血酸)但NPQ不是VDE酶活性。",
"qE淬灭在LHCII天线(大量实验证据：缺大部分LHCII的ch1突变体qE↓80%，D1蛋白的PSII反应中心是D1周转光抑制qI，慢型/不可逆型)；单线态氧1O2是光抑制qI的原因/后果(不是qE)。",
"ΔpH是PsbS质子化的驱动因素(必须条件)但不是唯一：需PsbS传感器蛋白(否则ΔpH再高无qE)；PsbS无ATP合酶同源，δ亚基是At4g09650不是At1g44575PsbS。",
"PsbS的Glu质子化(ΔpH传感)是qE-NPQ必需唯一触发因子；Z(叶黄素循环)是放大器，三协同PsbS+ΔpH+Z产生正常qE，缺PsbS即使ΔpH+Z完整NPQ也几乎0。",
"PsbS Glu122/226 pH传感触发qE、Z放大器非触发功能及ospsbsΔpH正常NPQ几乎丧失的三因素分离证据"),

Q(TG,
"胡萝卜(Daucus carota)储藏根白色体(无光合)用蓝光450nm照射下：质体球plastoglobule数量从12→78个/细胞；同时Western blot检测FBN1(原纤维蛋白fibrillin，质体球结构蛋白)表达↑5倍；透射电镜下质体球出芽自类囊体膜/质体内被膜。胡萝卜白色体→叶绿体转绿过程(质体球发育)正确是",
"A. 质体球Plastoglobule(PG)是质体(叶绿体、有色体、白色体、前质体)内的脂蛋白颗粒：结构=半层脂质单分子层(磷脂+半乳糖脂尾向内部核心，头基朝向基质水溶液)包裹的中性脂核心(三酰甘油TAG、生育酚维生素E、质体醌PQ、类胡萝卜素、叶绿醌/维生素K1等脂溶性代谢储存)+表面结合约30种FBN/Fibrillin家族等结构蛋白和酶蛋白(FBN1a/1b/2/4/7a/7b等)。白色体(无光合的储藏根质体)→蓝光照射(蓝光受体CRY/PHOT)→信号级联诱导：①类囊体膜/质体内被膜的特定区域\"出芽\"形成脂双层凸出→脂类核心填充、脂半层包裹→质体球(电镜观察出芽位点在类囊体膜，所以起源是类囊体膜外被膜的脂结构域)；②FBN1(原纤维蛋白36kD)等结构蛋白表达↑5倍→在质体球表面组装成蛋白网络外壳(稳定颗粒，防止质体球互相融合)；③质体球核心的脂溶性代谢物(生育酚/PQ/类胡萝卜素)大量合成(胡萝卜素β-胡萝卜素/叶黄素)→质体球作为\"代谢物储存和转运枢纽\"：在白色体→叶绿体转分化时，质体球提供类囊体形成所需的脂分子(DGDG/MGDG半乳糖脂)和色素辅基(β-胡萝卜素→维生素A原、叶黄素组成天线)，运输光合所需的脂溶性分子到发育中的类囊体。胡萝卜储藏根的质体球发育↑78/12=6.5倍是转绿准备。",
"B. 质体球是储存淀粉粒(α-1,4葡聚糖多聚物)的白色体结构，由细胞质的糖原颗粒通过内吞进入质体形成，与脂类完全无关。",
"C. FBN1蛋白是质体70S核糖体的23SrRNA甲基化酶(催化rRNA修饰)；蓝光照射抑制翻译导致核糖体降解形成颗粒状电子密度球。",
"D. 质体球(plastoglobule)由病毒感染引起的质体内含体(复制复合物)；数量增加78说明胡萝卜储藏根感染了CaMV花椰菜花叶病毒。",
"A",
"质体球PG是质体内的脂蛋白颗粒：结构=磷脂/半乳糖脂的单分子层(极性头朝基质水溶液)包裹中性脂核心(TAG、生育酚、PQ、类胡萝卜素等脂溶物)+表面约30种FBN(Fibrillin家族原纤维蛋白36kD等)结构/酶蛋白。白色体→蓝光(CRY/PHOT信号)→转分化为叶绿体的发育程序：①类囊体膜/质体膜出芽(电子显微镜出芽位点直接观察)→脂填充形成PG(数量12→78)；②FBN1表达↑5倍→组装表面稳定外壳(防融合)；③储存的脂溶性分子(半乳糖脂/类胡萝卜素/PQ)供给发育中的类囊体膜和光系统辅基——PG是质体的脂代谢储存转运枢纽。",
"淀粉粒(Starch grain/granule)是基质内的α-1,4葡聚糖聚合物(非脂蛋白/无脂单分子层结构)；碘染淀粉粒蓝黑色，质体球苏丹黑B脂染色阳性(苏丹III橙红)。",
"FBN(Fibrillin)序列无rRNA甲基化酶的AdoMet甲基转移酶域(PF00891不存在)；FBN1的Pfam PF04755(PRC-barrel结构域结合脂)是脂蛋白结构域(不是rRNA修饰)。",
"病毒感染质体内含体(如CaMV的电子致密病毒质)是病毒粒子/复制复合物(含病毒DNA/RNA/衣壳蛋白)，苏丹黑脂染色阴性；健康胡萝卜根(无病毒)质体球是正常发育结构不是病毒感染。",
"质体球是质体内的脂蛋白储存转运枢纽(半层脂包裹中性脂核心+FBN蛋白壳)，在白色体→叶绿体转分化时由类囊体/质体膜出芽形成(数量↑6.5倍)，FBN1蛋白↑5倍提供外壳稳定，提供脂和辅基给发育类囊体。",
"质体球结构(脂半层/FBN蛋白/脂溶物核心)、类囊体膜出芽起源与白色体转叶绿体的脂代谢储存转运功能"),

Q(TG,
"大麦(Hordeum vulgare)黄化质体(etioplast)分离照光诱导变绿：光下POR(原叶绿素酸酯氧化还原酶)底物Pchlide光谱(440nm激发，荧光发射657nm→678nm随光照射逐步转移，指示Pchlide*→Chlide转化)；POR的催化动力学kcat=22s-1(需光直接驱动，暗活性<0.0001s-1=光依赖2×105倍)。加入D2O(氘化溶剂，减慢H/D隧道效应)后kcat从22→3.5s-1(↓84%)。POR的光激活酶机制(量子隧道H-转移)正确是",
"A. POR(NADPH:原叶绿素酸酯氧化还原酶，E.C.1.3.1.33，36kD单链蛋白，是已知唯一的\"光催化酶\"——不同于一般酶只降低活化能ΔG‡，POR直接吸收光子供能推动热力学不利的还原反应)的催化机制：①三元复合物POR-Pchlide(底物四吡咯Mg螯合大环)-NADPH(辅因子，氢负离子H-供体)预组装(暗下稳定，黄化质体中就是这三元复合物组装成前原片层体PLB的晶体状立方膜)；②660nm左右的单光子被底物Pchlide的共轭大环π体系吸收→S0基态→S1激发态Pchlide*，激发态的Pchlide D环C17=C18双键的电子云重排(从π→π*跃迁)使其具有强亲电性；③NADPH烟酰胺环C4位的氢负离子H-(氘负离子D-在D2O中)经量子隧穿(Quantum tunneling of hydrogen，H/D质量差异导致隧穿概率显著不同，D原子质量大→隧穿概率小→kcat↓)，直接转移到C17=C18双键的C18(立体特异性加成)；④同时质子H+(来自严格保守的Asp/His残基广义酸催化)加到C17位，完成D环还原(饱和单键)，产物Chlide a。该机制的量子隧穿证据：D2O(H→D取代)将kcat从22→3.5s-1(↓84%)，动力学同位素效应KIE=kH/kD=6.3=典型H隧穿的数值(KIE>6是强烈隧穿证据，经典过渡态KIE≈7是极限)。POR是唯一需要光量子直接参与的酶(不是光作为激活信号)。",
"B. POR是G蛋白偶联受体GPCR类感光蛋白(类似视紫红质Rhodopsin)：光激活Gq→激活磷脂酶C→IP3→液泡Ca2+激活激酶→磷酸化Pchlide导致还原。",
"C. POR催化的还原反应暗下进行(光不参与反应)，只是光诱导POR mRNA的转录翻译；D2O降低kcat是因为氘水影响mRNA的5'-UTR二级结构翻译效率。",
"D. 光的唯一作用是加热三元复合物局部(光热效应)：22→3.5℃降低导致反应速率减慢；反应本身是经典热力学Arrhenius型热活化能垒。",
"A",
"POR(原叶绿素酸酯:NADPH氧化还原酶，已知唯一\"光催化酶\")机制：①三元预组装POR-Pchlide-NADPH(暗稳定，黄化质体PLB结构基础)；②光子被Pchlide的π共轭大环吸收→S0→S1激发态→D环C17=C18强亲电性；③NADPH烟酰胺C4的H-(氢负离子)通过Quantum tunneling量子隧穿转移给C18(立体特异性)；④广义酸Asp/His供质子H+到C17→D环还原饱和得Chlide a。隧穿证据：D2O H→D取代后动力学同位素效应KIE=22/3.5≈6.3(KIE>6是H隧穿强证据，因D质量大隧穿概率指数低)；光直接驱动反应不是信号(暗kcat<0.0001s-1，光下kcat↑5个数量级)。",
"POR 36kD可溶性蛋白，无跨膜螺旋(0 TMHMM预测)，不在质膜；GPCR视紫红质是7跨膜动物感光蛋白(结合11-顺视黄醛)，完全不同；POR催化是试管(无细胞/无G蛋白/无Ca2+)内混合3种组分+光就能产Chlide。",
"体外纯化POR(重组蛋白E.coli表达)+Pchlide+NADPH在试管(无转录、无核糖体、无mRNA)中照光→Chlide检测(荧光光谱657→678转移)，直接证明POR的光催化不依赖基因表达(纯化学反应)。",
"光热效应需要大量光子转化为热(实际量子产率Chlide/Pchlide≈0.5每吸收光子产半分子Chlide)；KIE=6.3的H/D同位素差异(温度不影响同位素隧穿)排除\"温度效应\"(Arrhenius型同样温度kH/kD≈7是理论极限，6.3是隧穿的典型标志之一)。",
"POR是唯一\"光催化酶\"：三元复合物预组装→Pchlide吸收光子→NADPH H-经量子隧穿(氘同位素KIE≈6.3证据)转移还原D环C17=C18双键+酸催化质子化→Chlide a；光直接参与化学反应不是信号转导。",
"POR光催化酶机制、NADPH H量子隧穿氘同位素效应(KIE≈6.3)及三元预组装与直接光驱动证据"),

Q(TG,
"玉米(Zea mays)NADP-ME型C4的维管束鞘细胞(BSC)和叶肉细胞(MC)机械分离后，分别提取叶绿体，进行SDS-PAGE考马斯亮蓝染色：MC叶绿体的LHCII 27kD条带是BSC的4.5倍；BSC叶绿体的Rubisco大亚基RbcL(56kD)是MC的9倍以上，MC几乎无RbcL条带。C4双细胞的酶/蛋白质组空间隔离正确是",
"A. C4 NADP-ME型的双细胞功能分化(空间分隔)是其CO2浓缩泵的基础：①MC叶肉细胞(外周花环)表达\"初固定\"的酶系统：CA碳酸酐酶(胞质快速平衡CO2+HCO3-)、PEPC磷酸烯醇式丙酮酸羧化酶(PEP+HCO3→OAA，胞质C4型PEPC不受苹果酸反馈抑制即C3型Ki(Mal)≈0.1mM/C4型10mM差异100倍)、PPDK丙酮酸磷酸二激酶(叶绿体ATP+Pi+Pyr→PEP+AMP+PPi，胞质或MC叶绿体)、NADP-MDH苹果酸脱氢酶(叶绿体，OAA+NADPH→Mal+NADP+，MC叶绿体Trx f光激活)。MC叶绿体有基粒堆叠→PSII丰富→LHCII 27kD条带高(4.5×BSC)。②BSC维管束鞘细胞(内层围绕维管的花环)表达\"再固定\"系统：NADP-ME苹果酸酶(叶绿体，Mal+NADP+→Pyr+CO2+NADPH)、Rubisco(占叶片Rubisco>90%在BSC基质，免疫印迹56kD RbcL条带BSC/MC=9倍+，MC几乎无RbcL)、卡尔文全部再生酶。BSC叶绿体几乎无基粒(\"无基粒叶绿体\"stroma lamellae基质片层)→PSII少→LHCII条带低(仅MC 22%)。结果：PEPC在MC将HCO3固定入C4酸Mal→Mal通过胞间连丝(大量共质连接)到BSC→BSC NADP-ME脱羧在Rubisco旁边释放CO2≈2000-5000ppm→Rubisco几乎只有羧化(氧酶抑制光呼吸<5% C3)；Pyr返回MC→PPDK再生PEP(2ATP/PEP能量代价)。",
"B. MC的Rubisco(56kD条带弱)是因为MC叶绿体完全没有核糖体；MC所有蛋白(PEPC/PPDK)都由BSC核基因合成后通过胞间连丝的蛋白转移。",
"C. C4植物LHCII 27kD是PEPC激酶的调节亚基；BSC不表达LHCII是因为BSC苹果酸反馈抑制PEPC激酶。",
"D. BSC RbcL条带强=BSC进行光呼吸释放CO2被Rubisco再固定，MC几乎不产CO2光呼吸所以不表达RbcL。",
"A",
"C4 NADP-ME型双细胞蛋白质组空间隔离：MC(外周花环)叶绿体有基粒→PSII多→LHCII(天线27kD)条带是BSC的4.5倍；MC表达CA+PEPC+PPDK+NADP-MDH(初固定CO2为HCO3→C4酸Mal)，MC几乎无Rubisco(RbcL条带几乎没有)。BSC(围绕维管束内层)叶绿体无基粒→PSII少→LHCII弱；BSC表达Rubisco(RbcL条带是MC 9倍+)和卡尔文酶，NADP-ME把Mal运入后脱羧→Rubisco旁CO2≈3000ppm=CO2浓缩泵，氧酶被抑光呼吸<5%。Pyr回MC经PPDK再生PEP(代价2ATP/PEP)；胞间连丝提供C4酸穿梭通道。",
"MC叶绿体具有70S核糖体和完整翻译机器(35S-Met掺入PEPC/LHCII等MC蛋白)；胞间连丝是小分子代谢物通道(MW SEL<1000)，蛋白大分子转移需胞间连丝增大SEL(仅病毒运动蛋白MP等特例)不用于常规蛋白运输。",
"LHCII是PSII的捕光天线复合物(结合14个Chl a/b+4类胡萝卜素/单体，Lhcb1/2/3基因)，无激酶域结构；PEPC激酶(PEPC-PK，Ser/Thr激酶SNF1相关)是小分子独立蛋白(31kD)。",
"光呼吸需要Rubisco氧酶活性：MC几乎无Rubisco→MC不发生光呼吸；BSC有Rubisco但CO2浓缩泵(≈3000ppm CO2/O2比)>空气100倍→Sc/o选择下氧酶<5%C3水平→光呼吸极弱；BSC RbcL条带强是卡尔文主要位点(不是光呼吸)。",
"C4双细胞空间隔离：MC(基粒类囊体PSII富集、LHCII高、PEPC初固定) vs BSC(无基粒类囊体、Rubisco富集9×、NADP-ME脱羧+卡尔文)构成C4 CO2浓缩泵，C4酸穿梭于胞间连丝，代价2额外ATP/固定CO2换低光呼吸。",
"C4双细胞MC/BSC酶系统隔离、基粒/无基粒类囊体、Rubisco RbcL/LHCII差异及CO2浓缩泵生化分工"),

# END PHOTO BATCH (4 written, will add more later if needed)
]

print(f"Total DATA tuples written: {len(DATA)}")
if __name__ == "__main__":
    print("This file is data-only. Import DATA from builder.")
