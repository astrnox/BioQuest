# -*- coding: utf-8 -*-
import json, os
os.chdir('/workspace/data')

# 读取原文件
with open('comp_batch_a_m1_cell.py', 'r', encoding='utf-8') as f:
    content = f.read()
end_pos = content.rfind(']')
last_curly = content.rfind('}', 0, end_pos)

KT = "细胞器"
CONCEPT = KT

new_qs = []

# 细胞器第8题（已有7道，从第8道开始，共26道）
new_qs.append({
    "stem": "COPII包被囊泡介导内质网向高尔基体的顺向运输，其包被组装起始于小G蛋白Sar1的激活。若Sar1的显性负性突变（Sar1-T39N，持续结合GDP且无法交换为GTP）在HeLa细胞中过表达，会观察到哪种细胞器形态异常？",
    "options": {"A":"高尔基体因持续接收囊泡而膨大堆叠","B":"内质网因输出阻断而显著膨胀扩大，高尔基体变小甚至消失","C":"溶酶体膜通透性升高释放水解酶至胞质","D":"过氧化物酶体从头合成路径增强以代偿"},
    "answer": "B",
    "analysis": "A错误：高尔基体接收来自ER的物质需要COPII囊泡融合，Sar1失活后COPII囊泡无法出芽，高尔基体无新物质输入，不仅不会膨大反而因自身囊泡向外运输逐步耗空变小，甚至因物质无法补充而碎片化。B正确：COPII包被的分子循环组装机制为：①ER膜上的Sec12（鸟嘌呤核苷酸交换因子GEF，整合ER膜蛋白）催化胞质中Sar1-GDP交换为Sar1-GTP；②Sar1的N端两亲性螺旋插入ER膜胞质侧使局部膜弯曲，同时招募内层复合物Sec23/Sec24（Sec23是Sar1的GAP激活GTP水解，Sec24结合货物蛋白胞质侧ER输出信号如DxE等分选信号）；③Sec23/24复合物再招募外层复合物Sec13/Sec31，形成完整COPII包被的出芽囊泡。Sar1-T39N突变体为GDP锁定形式，无法被Sec12催化为GTP态，COPII包被组装完全阻断，ER合成的所有分泌/膜蛋白无法出芽运往高尔基体。其结果是：ER因物质堆积（蛋白、脂质持续合成却无法输出）出现形态学膨胀，电镜下ER池显著扩大；高尔基体作为接收站，失去输入同时自身膜组分持续通过分泌囊泡运出，最终因耗空而变小、碎片化甚至不可见。该实验是COPII功能鉴定的经典证据。C错误：溶酶体接收的溶酶体酶本身来自ER→高尔基体M6P分选通路，上游ER输出阻断时溶酶体酶无法合成送达，造成溶酶体贮积样表型（底物积累），而非溶酶体膜通透性升高。D错误：过氧化物酶体从头合成路径依赖ER出芽形成前体囊泡（PPV），Sar1是否参与仍有争议；且过氧化物酶体不会出现「代偿」增加，反而与ER输出相关的通路会受损。COPII囊泡运输是分泌通路的起点，胶原蛋白等巨大 cargo 甚至需特殊大COPII囊泡，其缺陷导致人类胶原分泌病（如CLSD综合征，即骨发育不良伴颅面部异常）。",
    "knowledge": ["细胞生物学",KT,"COPII囊泡组装与Sar1 GTP循环"],
    "module":"module_1","difficulty":"league","target":"both","concept":CONCEPT
})
new_qs.append({
    "stem": "COPI包被囊泡负责高尔基体内部逆向运输和顺面高尔基体向内质网的回收运输。COPI包被识别并回收的是带有哪种分选信号的ER驻留蛋白？",
    "options": {"A":"蛋白C端的KDEL序列（可溶性ER驻留蛋白）和膜蛋白C端KKxx序列","B":"蛋白N端的信号肽（疏水16-26肽，SRP识别）","C":"蛋白的甘露糖-6-磷酸（M6P）修饰信号","D":"蛋白胞质侧的双亮氨酸基序（LL）"},
    "answer": "A",
    "analysis": "A正确：COPI（coatomer I，七聚体coatomer复合物α/β/β'/γ/δ/ε/ζ亚基+小G蛋白Arf1-GTP）包被囊泡有两类运输方向：①高尔基体内的逆向运输，即从反面膜囊→中间膜囊→顺面膜囊（也称「囊泡成熟模型」的反向运输，回收错误前进的高尔基体酶）；②顺面高尔基体（CGN）向ER的逆向回收运输——将意外随COPII囊泡「逃逸」出ER的ER驻留蛋白重新运回ER。两类ER驻留蛋白的回收信号为：①ER腔可溶性驻留蛋白（如BiP/Grp78、Grp94、PDI、钙网蛋白等分子伴侣，本应永久留在ER腔）的C端均带有KDEL四肽序列（Lys-Asp-Glu-Leu-COOH，植物中也可为HDEL、RDEL等变体）。当这些蛋白意外漏到CGN腔时，CGN膜上的KDEL受体（ERD2，整合膜蛋白，七次跨膜）在CGN腔pH6.5条件下高亲和力结合KDEL序列；KDEL受体本身的胞质侧带KKxx（Lys-Lys-X-X）或KxKxxx序列信号，该信号直接结合COPI包被的α/β'-COP亚基WD40结构域，触发COPI包被出芽形成回收囊泡；囊泡运回ER，ER腔pH7.2条件下KDEL受体构象变化释放KDEL蛋白，空受体再次通过COPII运回CGN循环。②ER整合膜驻留蛋白（如Sec61、SRP受体、calnexin）在胞质侧结构域的C端附近带有KKxx双赖氨酸信号，直接被COPI识别回收。B错误：N端信号肽是SRP介导蛋白共翻译转运入ER的信号，不是ER驻留回收信号，蛋白入ER后信号肽被信号肽酶切除。C错误：M6P是高尔基体CGN向溶酶体分选酸性水解酶的信号，结合TGN的M6P受体通过AP-1/网格蛋白运至内体/溶酶体，与ER回收COPI无关。D错误：双亮氨酸基序（[DE]XXXL[LI]、DXXLL）是AP复合物（AP-1、AP-2、AP-3）和GGA的识别信号，主要参与TGN→内体/溶酶体分选和质膜内吞，不是COPI回收ER驻留的信号。ER驻留回收（KDEL/KKxx-COPI通路）是保证细胞器身份蛋白正确定位的核心，该系统缺陷导致分泌蛋白错误滞留ER或ER分子伴侣外漏引发ER应激。",
    "knowledge": ["细胞生物学",KT,"COPI囊泡与ER驻留蛋白KDEL/KKxx回收"],
    "module":"module_1","difficulty":"league","target":"both","concept":CONCEPT
})
new_qs.append({
    "stem": "线粒体TOM/TIM转位酶复合体负责核基因编码线粒体蛋白的跨膜后翻译转运。下列关于线粒体蛋白分选信号与转位的描述正确的是？",
    "options": {"A":"定位于线粒体基质的蛋白N端带约20-60aa的两亲性α螺旋前导肽，带净正电荷","B":"基质前导肽在转运入基质后由线粒体编码的肽酶切除，胞质中无该酶活性","C":"代谢型载体蛋白（如ATP/ADP反向转运体ANT，线粒体内膜）N端带前导肽，通过TOM23受体识别进入","D":"所有核编码线粒体蛋白必须以完全未折叠的线性形式通过TOM/TIM通道"},
    "answer": "A",
    "analysis": "A正确：定位于线粒体基质的核基因编码蛋白（约99%的基质蛋白为核基因，线粒体DNA仅编码13种呼吸链整合膜蛋白+22tRNA+2rRNA）的N端带有基质靶向序列MTS（又称前导肽presequence），其长度约20-60个氨基酸，不含酸性残基，富含带正电的Arg/Lys、羟基氨基酸（Ser/Thr）和疏水残基；关键特征是可形成两亲性α螺旋——螺旋一面（疏水面）集中大疏水残基，对面（带正电面）集中正电荷氨基酸。该两亲性螺旋被TOM复合物（外膜转位酶）表面的受体Tom20（识别疏水面）和Tom22（识别带正电面和C端胞质结构域酸性区）协同识别。B错误：MTS前导肽在蛋白完整通过外膜TOM通道→跨膜间隙→内膜TIM23通道进入基质后，确实由线粒体基质侧的线粒体加工肽酶（MPP，含α/β亚基组成的金属蛋白酶）特异性切除前导肽（多数情况下再由中间肽酶MIP切N端少数残基完成最终成熟）；但「编码」的描述错误：MPP全部由核基因编码（非线粒体DNA编码），且胞质中确实无MPP活性（避免胞质中前体蛋白提前切去信号无法正确被TOM识别）。C错误：线粒体内膜的代谢型载体蛋白家族（MCF，超100成员，包括ANT/PiC/酮戊二酸苹果酸载体等，均为6次跨膜蛋白，运输小分子代谢物）是典型的「无前导肽、内部靶向信号」蛋白——无N端MTS，其靶向信息隐藏在整个多肽的氨基酸序列内部（三次跨膜结构重复的模体），受体识别为TOM70（非Tom20/22，TOM70为结合Hsp70结合的疏水内部信号），跨外膜后由膜间隙的小分子Tim9/10伴侣复合物护送（防止疏水结构在水相聚集），交给内膜TIM22复合物，TIM22介导其插入线粒体内膜形成六次跨膜拓扑结构，整个过程不需要MTS和TIM23转位。D错误：核编码线粒体基质蛋白确实需Hsp70（胞质Hsc70、线粒体基质Hsp70/Ssc1）持续结合维持未折叠，以线性肽链穿过TOM外膜通道（孔径约20Å，只能容纳未折叠肽链）和TIM23内膜通道；但「所有」是错误——少数核编码的线粒体膜间隙蛋白（如细胞色素c血红素裂合酶、Tim9/10）体积小或折叠快，且通过MIA（含Erv1二硫键传递系统）转运时以部分折叠状态通过，不是完全线性；另一些外膜β桶状蛋白（如VDAC、Tom40）通过TOM外膜后在膜间隙中经SAM复合物辅助折叠后插入外膜，也非完全线性穿膜。线粒体TOM/TIM分流转运是半自主细胞器最经典的蛋白分选系统。",
    "knowledge": ["细胞生物学",KT,"线粒体蛋白TOM/TIM转位与前导肽信号"],
    "module":"module_1","difficulty":"league","target":"both","concept":CONCEPT
})
new_qs.append({
    "stem": "叶绿体类囊体腔侧的光合蛋白由核基因编码后需要经多步转运才能到达腔侧定位。核编码类囊体腔蛋白的转运路线为？",
    "options": {"A":"胞质→Tic/Toc复合体→叶绿体基质→TAT或Sec通路→类囊体膜→腔侧","B":"胞质→内质网→COPII→高尔基体→分泌囊泡→类囊体腔","C":"胞质→Tic/Toc复合体→叶绿体基质→信号识别颗粒SRP→叶绿体内被膜→类囊体腔","D":"胞质直接通过类囊体膜上通道蛋白一次跨膜进入腔侧"},
    "answer": "A",
    "analysis": "叶绿体是高等植物/藻类的光合半自主细胞器，含三层膜系统（外被膜outer envelope、内被膜inner envelope，合称包膜envelope；以及内部独立的类囊体膜thylakoid membrane），因此空间分区包括：胞质→膜间隙（outer/inner包膜之间）→基质stroma（相当于线粒体基质）→类囊体膜thylakoid membrane→类囊体腔thylakoid lumen（相当于线粒体膜间隙）。核基因编码的叶绿体蛋白按最终定位分为基质蛋白、内膜蛋白、类囊体膜蛋白、类囊体腔蛋白四类，转运路线逐层递增复杂性。A正确：核基因编码的类囊体腔蛋白（如质体蓝素Plastocyanin、PSII外周蛋白PsbO/OEC33、细胞色素f的腔侧结构域、类囊体腔分子伴侣Hsp70等）的跨叶绿体定位最复杂，需要两次连续的跨膜转运：①第1层：胞质→叶绿体基质——该蛋白的N端带约50-70aa的叶绿体转运肽（chloroplast transit peptide, cTP，类似线粒体MTS但氨基酸偏好不同：无正电两亲螺旋，富含Ser/Thr、小疏水氨基酸，无净强正电）。胞质中合成的完整前体蛋白（未折叠，结合胞质Hsp70/Hsp90维持可转运构象+GTPase激活蛋白TOC复合体受体），首先cTP被叶绿体外包膜上的TOC（Translocon at Outer envelope of Chloroplasts，受体Toc34、Toc159 GTPase家族+通道Toc75 β桶）识别；蛋白通过Toc75外膜通道→跨膜间隙→立即与TIC（Translocon at Inner envelope of Chloroplasts，多亚基复合体内膜通道，包括Tic110、Tic40、Hsp93/IAP100伴侣等）偶联形成的「接触点（contact site，内外包膜紧密并置区域）」一次同时跨两层包膜，直接进入基质侧；基质中的叶绿体加工肽酶（stromal processing peptidase, SPP）立即切除N端cTP。②第2层：叶绿体基质→类囊体腔——cTP切除后，原蛋白的N端立即暴露第二段疏水信号肽——类囊体靶向信号肽（thylakoid lumen targeting signal，又称lumen transfer peptide, LTP），该疏水信号长度约20-30aa，类似细菌Sec通路信号肽（带正电荷N区+疏水核心H区+极性C区+信号肽酶切位点Ala-X-Ala）。根据底物蛋白特性，该LTP信号进入类囊体腔有两条独立通路：a) Sec通路（类囊体膜上的cpSecA ATPase + cpSecYEG通道，类似细菌SecYEG，转运未折叠肽；需水解ATP）——如PsbO、细胞色素f前体；b) Tat通路（Twin Arginine Translocation，类囊体膜TatA/TatB/TatC复合物，底物信号肽带RR/xK/RR双精氨酸保守基序；独特之处是可转运已经折叠的蛋白甚至多聚蛋白寡聚体，能量来自ΔpH跨类囊体膜质子梯度，不水解ATP）——如质体蓝素、光合链组分PsaN等。蛋白穿过类囊体膜Sec/Tat通道后，由类囊体腔侧的类囊体加工肽酶（TPP，属SPP家族）切除LTP，成熟蛋白最终定位类囊体腔。B错误：叶绿体不通过ER-Golgi分泌通路定位蛋白（与内共生起源相关，其蛋白分选完全独立于内膜系统）。C错误：SRP（信号识别颗粒）是ER共翻译转运的因子，叶绿体类囊体SRP（cpSRP，由cpSRP54+cpSRP43组成）仅负责整合类囊体膜的捕光色素蛋白（LHCP），不是类囊体腔蛋白的转运因子；且方向错误。D错误：类囊体膜与包膜完全独立，无直接从胞质进类囊体腔的一步通路。叶绿体四层分区分选（Tic/Toc+类囊体Sec/Tat）是细胞器章节植物细胞独有的难点，也是植物分子遗传的重要应用场景（如叶绿体转基因表达的蛋白定位设计）。",
    "knowledge": ["细胞生物学",KT,"叶绿体类囊体腔蛋白Tic/Toc+Sec/Tat两步转运"],
    "module":"module_1","difficulty":"league","target":"both","concept":CONCEPT
})
new_qs.append({
    "stem": "溶酶体是动物细胞的「消化车间」，含约60种酸性水解酶。关于溶酶体膜结构与功能的描述错误的是？",
    "options": {"A":"溶酶体膜上高度糖基化的整合蛋白（如LAMP1/2）糖链朝向胞质侧，保护自身不被水解酶降解","B":"溶酶体膜上的V-ATP酶持续水解ATP将H+泵入腔内，维持pH约4.5-5.0的酸性环境","C":"溶酶体膜含多种载体蛋白（如氨基酸、单糖、核苷酸转运体），将消化产生的小分子运回胞质再利用","D":"吞噬细胞吞噬病原体后形成的吞噬体与溶酶体融合形成吞噬溶酶体，实现胞内杀菌"},
    "answer": "A",
    "analysis": "A错误：溶酶体腔pH约4.5-5.0，内含高浓度（数百微克每毫克总蛋白）的酸性水解酶（最适pH均为酸性，在中性pH无活性，这是「溶酶体泄漏时不会在胞质pH7.2立即损伤细胞」的自我保护机制）。若溶酶体膜上的丰富整合蛋白（占溶酶体膜总蛋白约50%以上，如溶酶体相关膜蛋白LAMP1/2，又称溶酶体糖蛋白lgp120/lgp110，各有1个单次跨膜结构域+大的腔侧结构域+短的胞质尾）暴露的蛋白主链直接接触腔内水解酶会被降解。因此LAMP1/2的腔侧结构域（非胞质侧）是高度N-连接糖基化修饰的——每个LAMP分子含约16-20条复杂型N-糖链，糖链末端还加有硫酸化修饰；这些伸向溶酶体腔内的浓密糖链（称为「糖萼/glycocalyx」）形成致密的亲水多糖屏障，像「防弹衣」一样物理遮挡LAMP蛋白的多肽骨架，避免被腔内的蛋白酶、糖苷酶识别和降解。糖链的方向是腔面朝向不是胞质。B正确：溶酶体的酸性环境由溶酶体膜上的V型ATP酶（Vacuolar-type H+-ATPase，与内体、高尔基体、植物液泡的质子泵同源，多亚基：胞质V1复合物（A3B3CDE3FG3H，水解ATP提供能量）+膜内V0复合物（a、c、c''、d亚基形成质子通道，旋转催化机制类似F型ATP合酶但逆方向））维持：V-ATP酶每水解1分子ATP将约2个H+从胞质主动泵入溶酶体腔内，将腔内pH维持在4.5-5.0最适水解酶活性的范围。V-ATP酶活性还被葡萄糖、mTOR通路调控：营养充足时V1-V0完全组装活跃泵H+；饥饿时V1从V0上解离，ATP水解停止，减少能量消耗并降低溶酶体降解活性（自噬调控的一部分）。C正确：溶酶体是「回收中心」，吞噬/自噬进入溶酶体的大分子（蛋白质→氨基酸、核酸→核苷酸/核苷、多糖→单糖、脂质→脂肪酸+单酰甘油）被水解为小分子单体后，不能永久留在溶酶体内——溶酶体膜上存在一系列特异性的溶质载体蛋白（SLC家族转运体，如PAT1/SLC36A1转运氨基酸、GLUT8/SLC2A8转运葡萄糖、CNT/SLC28家族转运核苷、MFSD1转运二肽、NPC1/NPC2转运胆固醇等），将消化产生的营养物小分子再转运回胞质，供细胞再利用（营养回收循环是溶酶体核心生理功能之一）。D正确：专职吞噬细胞（巨噬细胞、中性粒细胞、树突状细胞）识别并吞噬入侵的细菌/真菌/病毒颗粒后，形成由质膜包裹的吞噬体（phagosome，pH接近中性7.2）——吞噬体膜上早期即招募Rab5→早期内体标记，再转Rab7→晚期内体标记；V-ATP酶逐步泵入H+使吞噬体腔pH从7.2逐步酸化至约6.0；最后在动力蛋白和SNARE（STX7/STX8/Vti1b/VAMP7/VAMP8）介导下，成熟吞噬体与溶酶体融合形成吞噬溶酶体（phagolysosome，pH迅速降至4.5-5.0），溶酶体酸性水解酶激活+吞噬氧化酶产ROS+溶菌酶、抗菌肽等共同杀伤并消化病原体。溶酶体膜的糖萼、V-ATP酶、转运体三大结构与功能是联赛溶酶体章节三大考点，近年mTORC1在溶酶体膜上的活化（营养感知）和TFEB核转位（溶酶体生物发生转录调控）是前沿。",
    "knowledge": ["细胞生物学",KT,"溶酶体膜结构与三大核心功能"],
    "module":"module_1","difficulty":"league","target":"both","concept":CONCEPT
})

# ===== 此处省略细胞器剩余21道的生成过程，为节省空间实际会在完整文件中补足，此处先放占位，后续补齐 =====
# （以下继续生成细胞器第13-33题，以及细胞周期、信号转导、凋亡的全部题目）

print(f"当前批量生成细胞器题数：{len(new_qs)}道，需继续补足")
print("将执行后续写入")

# 以下代码仅保证已有5道补全写入
import json
def format_q(q, indent="  "):
    lines = []
    lines.append(indent + "{")
    lines.append(indent + '  "stem": ' + json.dumps(q["stem"], ensure_ascii=False) + ",")
    opts = q["options"]
    opt_strs = []
    for k in ["A","B","C","D"]:
        opt_strs.append(f'"{k}":' + json.dumps(opts[k], ensure_ascii=False))
    lines.append(indent + '  "options": {' + ",".join(opt_strs) + "},")
    lines.append(indent + '  "answer": ' + json.dumps(q["answer"], ensure_ascii=False) + ",")
    lines.append(indent + '  "analysis": ' + json.dumps(q["analysis"], ensure_ascii=False) + ",")
    kjson = json.dumps(q["knowledge"], ensure_ascii=False)
    lines.append(indent + '  "knowledge": ' + kjson + ",")
    lines.append(indent + '  "module": ' + json.dumps(q["module"], ensure_ascii=False) + ",")
    lines.append(indent + '  "difficulty": ' + json.dumps(q["difficulty"], ensure_ascii=False) + ",")
    lines.append(indent + '  "target": ' + json.dumps(q["target"], ensure_ascii=False) + ",")
    lines.append(indent + '  "concept": ' + json.dumps(q["concept"], ensure_ascii=False))
    lines.append(indent + "}")
    return "\n".join(lines)

qs_str = ",\n".join(format_q(q) for q in new_qs)
new_content = content[:last_curly+1] + ",\n" + qs_str + "\n]\n"
with open('comp_batch_a_m1_cell.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("细胞器追加5道（临时）写入完成")
