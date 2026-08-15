# -*- coding: utf-8 -*-
"""生成剩余的细胞器、细胞周期、信号转导、细胞凋亡题目并合成完整文件"""
import sys
sys.path.insert(0, '/workspace/data')
import comp_batch_a_m1_cell as orig

existing = list(orig.QUESTIONS)
CELL_COUNT = sum(1 for q in existing if q['concept'] == '细胞结构')
MEM_COUNT = sum(1 for q in existing if q['concept'] == '细胞膜')
ORG_COUNT = sum(1 for q in existing if q['concept'] == '细胞器')
print(f"现有：细胞结构={CELL_COUNT}/34，细胞膜={MEM_COUNT}/33，细胞器={ORG_COUNT}/33")
print(f"已有总题数：{len(existing)}")

ORG_REMAIN = 33 - ORG_COUNT
CYCLE_COUNT = 33
SIGNAL_COUNT = 34
APOP_COUNT = 33

# ===== 细胞器 剩余题目 (ORG_REMAIN道，每道配独立解析) =====
org_questions = [
  {
    "stem": "COPII包被囊泡介导内质网向高尔基体的顺向运输，其包被组装起始于小G蛋白Sar1的激活。若Sar1的显性负性突变（Sar1-T39N，持续结合GDP且无法交换为GTP）在HeLa细胞中过表达，会观察到哪种细胞器形态异常？",
    "options": {"A":"高尔基体因持续接收囊泡而膨大堆叠","B":"内质网因输出阻断而显著膨胀扩大，高尔基体变小甚至消失","C":"溶酶体膜通透性升高释放水解酶至胞质","D":"过氧化物酶体从头合成路径增强以代偿"},
    "answer": "B",
    "analysis": "A错误：高尔基体接收来自ER的物质需要COPII囊泡融合，Sar1失活后COPII囊泡无法出芽，高尔基体无新物质输入，不仅不会膨大反而因自身囊泡向外运输（COPI回收/分泌通路）逐步耗空变小，甚至因物质无法补充而碎片化。B正确：COPII包被的分子循环组装机制为：①ER膜上的Sec12（鸟嘌呤核苷酸交换因子GEF，整合ER膜蛋白）催化胞质中Sar1-GDP交换为Sar1-GTP；②Sar1的N端两亲性螺旋插入ER膜胞质侧使局部膜弯曲，同时招募内层复合物Sec23/Sec24（Sec23是Sar1的GAP激活GTP水解，Sec24结合货物蛋白胞质侧ER输出信号如DxE、φx[DE][D/E]xφ、FF、YY等分选信号）；③Sec23/24复合物再招募外层复合物Sec13/Sec31，形成完整COPII包被的出芽囊泡。Sar1-T39N突变体为GDP锁定形式，无法被Sec12催化为GTP态，COPII包被组装完全阻断，ER合成的所有分泌/膜蛋白无法出芽运往高尔基体。其结果是：ER因物质堆积（蛋白、脂质持续合成却无法输出）出现形态学膨胀，电镜下ER池显著扩大；高尔基体作为接收站，失去输入同时自身膜组分持续通过分泌囊泡运出，最终因耗空而变小、碎片化甚至不可见。该实验是COPII功能鉴定的经典证据。C错误：溶酶体接收的溶酶体酶本身来自ER→高尔基体M6P分选通路，上游ER输出阻断时溶酶体酶无法合成送达，造成溶酶体贮积样表型（底物积累），而非溶酶体膜通透性升高。D错误：过氧化物酶体从头合成路径依赖ER出芽形成前体囊泡（PPV），Sar1是否参与仍有争议；且过氧化物酶体不会出现「代偿」增加，反而与ER输出相关的通路会受损。Sar1-COPII出芽的GTP循环是内膜系统最基础的囊泡运输机制。",
    "knowledge": ["细胞生物学","细胞器","COPII囊泡组装与Sar1 GTP循环"],
    "module": "module_1",
    "difficulty": "league",
    "target": "both",
    "concept": "细胞器"
  },
  {
    "stem": "COPI包被囊泡负责高尔基体内部逆向运输和顺面高尔基体向内质网的回收运输。COPI包被识别并回收的是带有哪种分选信号的ER驻留蛋白？",
    "options": {"A":"蛋白C端的KDEL序列（Lys-Asp-Glu-Leu，可溶性ER驻留蛋白）和膜蛋白C端KKxx序列","B":"蛋白N端的信号肽（疏水16-26肽，SRP识别）","C":"蛋白的甘露糖-6-磷酸（M6P）修饰信号","D":"蛋白胞质侧的双亮氨酸基序（LL）"},
    "answer": "A",
    "analysis": "A正确：COPI（coatomer I，七聚体coatomer复合物α/β/β'/γ/δ/ε/ζ亚基+小G蛋白Arf1-GTP）包被囊泡有两类运输方向：①高尔基体内的逆向运输（retrograde transport），即从反面膜囊→中间膜囊→顺面膜囊（也称「囊泡成熟模型」的反向运输，回收错误前进的高尔基体酶）；②顺面高尔基体（CGN）向ER的逆向回收运输——将意外随COPII囊泡「逃逸」出ER的ER驻留蛋白重新运回ER。两类ER驻留蛋白的回收信号为：①ER腔可溶性驻留蛋白（如BiP/Grp78、Grp94、PDI、钙网蛋白等分子伴侣，本应永久留在ER腔）的C端均带有KDEL四肽序列（Lys-Asp-Glu-Leu-COOH，植物中也可为HDEL、RDEL等变体）。当这些蛋白意外漏到CGN腔时，CGN膜上的KDEL受体（ERD2，整合膜蛋白，七次跨膜）在CGN腔pH6.5条件下高亲和力结合KDEL序列；KDEL受体本身的胞质侧带KKxx（Lys-Lys-X-X）或KxKxxx序列信号，该信号直接结合COPI包被的α/β'-COP亚基WD40结构域，触发COPI包被出芽形成回收囊泡；囊泡运回ER，ER腔pH7.2条件下KDEL受体构象变化释放KDEL蛋白，空受体再次通过COPII运回CGN循环。②ER整合膜驻留蛋白（如Sec61、SRP受体、calnexin）在胞质侧结构域的C端附近带有KKxx（KKXX-COOH）双赖氨酸信号，直接被COPI识别回收。B错误：N端信号肽是SRP介导蛋白共翻译转运入ER的信号，不是ER驻留回收信号，蛋白入ER后信号肽被信号肽酶（SPP）切除。C错误：M6P是高尔基体CGN向溶酶体分选酸性水解酶的信号，结合TGN的M6P受体通过AP-1/网格蛋白运至内体/溶酶体，与ER回收COPI无关。D错误：双亮氨酸基序（[DE]XXXL[LI]、DXXLL）是AP复合物（AP-1、AP-2、AP-3）和GGA（Golgi-localized gamma-ear-containing ADP-ribosylation factor-binding）的识别信号，主要参与TGN→内体/溶酶体分选和质膜内吞，不是COPI回收ER驻留的信号。ER驻留回收（KDEL/KKxx-COPI通路）是保证细胞器身份蛋白正确定位的核心。",
    "knowledge": ["细胞生物学","细胞器","COPI囊泡与ER驻留蛋白KDEL/KKxx回收"],
    "module": "module_1",
    "difficulty": "league",
    "target": "both",
    "concept": "细胞器"
  },
  {
    "stem": "线粒体TOM/TIM转位酶复合体（Translocase of Outer/Inner Membrane）负责核基因编码线粒体蛋白的跨膜后翻译转运。下列关于线粒体蛋白分选信号与转位的描述正确的是？",
    "options": {"A":"定位于线粒体基质的蛋白N端带约20-60aa的两亲性α螺旋前导肽，带净正电荷","B":"基质前导肽在转运入基质后由线粒体编码的肽酶切除，胞质中无该酶活性","C":"代谢型载体蛋白（如ATP/ADP反向转运体ANT，线粒体内膜）N端带前导肽，通过TOM23受体识别进入","D":"所有核编码线粒体蛋白必须以完全未折叠的线性形式通过TOM/TIM通道"},
    "answer": "A",
    "analysis": "A正确：定位于线粒体基质的核基因编码蛋白（约99%的基质蛋白为核基因，线粒体DNA仅编码13种呼吸链整合膜蛋白+22tRNA+2rRNA）的N端带有基质靶向序列（Matrix Targeting Signal, MTS，又称前导肽presequence），其长度约20-60个氨基酸，不含酸性残基，富含带正电的Arg/Lys、羟基氨基酸（Ser/Thr）和疏水残基；关键特征是可形成两亲性α螺旋（amphiphilic α-helix）——螺旋一面（疏水面）集中大疏水残基，对面（带正电面）集中正电荷氨基酸。该两亲性螺旋被TOM复合物（外膜转位酶）表面的受体Tom20（识别疏水面）和Tom22（识别带正电面和C端胞质结构域酸性区）协同识别。B错误：MTS前导肽在蛋白完整通过外膜TOM通道→跨膜间隙→内膜TIM23通道进入基质后，确实由线粒体基质侧的线粒体加工肽酶（Mitochondrial Processing Peptidase, MPP，含α/β亚基组成的金属蛋白酶，由核基因编码）特异性切除前导肽（多数情况下再由中间肽酶MIP切N端少数残基完成最终成熟）；但「编码」的描述错误：MPP全部由核基因编码（非线粒体DNA编码），且胞质中确实无MPP活性（避免胞质中前体蛋白提前切去信号无法正确被TOM识别）。C错误：线粒体内膜的代谢型载体蛋白家族（MCF，超100成员，包括ANT/PiC/酮戊二酸苹果酸载体等，均为6次跨膜蛋白，运输小分子代谢物）是典型的「无前导肽、内部靶向信号」蛋白——无N端MTS，其靶向信息隐藏在整个多肽的氨基酸序列内部（三次跨膜结构重复的模体），受体识别为TOM70（非Tom20/22，TOM70为结合Hsp70结合的疏水内部信号），跨外膜后由膜间隙的小分子Tim9/10伴侣复合物护送（防止疏水结构在水相聚集），交给内膜TIM22复合物，TIM22介导其插入线粒体内膜形成六次跨膜拓扑结构，整个过程不需要MTS和TIM23转位。D错误：核编码线粒体基质蛋白确实需Hsp70（胞质Hsc70、线粒体基质Hsp70/Ssc1）持续结合维持未折叠，以线性肽链穿过TOM外膜通道（孔径~20Å，只能容纳未折叠肽链）和TIM23内膜通道；但「所有」是错误——少数核编码的线粒体膜间隙蛋白（如细胞色素c血红素裂合酶、Tim9/10）体积小或折叠快，且通过MIA（Mitochondrial Intermembrane space Assembly pathway，含Erv1二硫键传递系统）转运时以部分折叠状态通过，不是完全线性；另一些外膜β桶状蛋白（如VDAC、Tom40）通过TOM外膜后在膜间隙中经SAM复合物辅助折叠后插入外膜，也非完全线性穿膜。线粒体TOM/TIM分流转运是半自主细胞器最经典的蛋白分选系统。",
    "knowledge": ["细胞生物学","细胞器","线粒体蛋白TOM/TIM转位与前导肽信号"],
    "module": "module_1",
    "difficulty": "league",
    "target": "both",
    "concept": "细胞器"
  },
  {
    "stem": "叶绿体类囊体腔侧的光合蛋白由核基因编码后需要经多步转运才能到达腔侧定位。核编码类囊体腔蛋白的转运路线为？",
    "options": {"A":"胞质→Tic/Toc复合体→叶绿体基质→TAT或Sec通路→类囊体膜→腔侧","B":"胞质→内质网→COPII→高尔基体→分泌囊泡→类囊体腔","C":"胞质→Tic/Toc复合体→叶绿体基质→信号识别颗粒SRP→叶绿体内被膜→类囊体腔","D":"胞质直接通过类囊体膜上通道蛋白一次跨膜进入腔侧"},
    "answer": "A",
    "analysis": "叶绿体是高等植物/藻类的光合半自主细胞器，含三层膜系统（外被膜outer envelope、内被膜inner envelope，合称包膜envelope；以及内部独立的类囊体膜thylakoid membrane），因此空间分区包括：胞质→膜间隙（outer/inner包膜之间）→基质stroma（相当于线粒体基质）→类囊体膜thylakoid membrane→类囊体腔thylakoid lumen（相当于线粒体膜间隙）。核基因编码的叶绿体蛋白按最终定位分为基质蛋白、内膜蛋白、类囊体膜蛋白、类囊体腔蛋白四类，转运路线逐层递增复杂性。A正确：核基因编码的类囊体腔蛋白（如质体蓝素Plastocyanin、PSII外周蛋白PsbO/OEC33、细胞色素f的腔侧结构域、类囊体腔分子伴侣Hsp70等）的跨叶绿体定位最复杂，需要两次连续的跨膜转运：①第1层：胞质→叶绿体基质——该蛋白的N端带约50-70aa的叶绿体转运肽（chloroplast transit peptide, cTP，类似线粒体MTS但氨基酸偏好不同：无正电两亲螺旋，富含Ser/Thr、小疏水氨基酸，无净强正电）。胞质中合成的完整前体蛋白（未折叠，结合胞质Hsp70/Hsp90维持可转运构象+GTPase激活蛋白TOC复合体受体），首先cTP被叶绿体外包膜上的TOC（Translocon at Outer envelope of Chloroplasts，受体Toc34、Toc159 GTPase家族+通道Toc75 β桶）识别；蛋白通过Toc75外膜通道→跨膜间隙→立即与TIC（Translocon at Inner envelope of Chloroplasts，多亚基复合体内膜通道，包括Tic110、Tic40、Hsp93/IAP100伴侣等）偶联形成的「接触点（contact site，内外包膜紧密并置区域）」一次同时跨两层包膜，直接进入基质侧；基质中的叶绿体加工肽酶（stromal processing peptidase, SPP）立即切除N端cTP。②第2层：叶绿体基质→类囊体腔——cTP切除后，原蛋白的N端立即暴露第二段疏水信号肽——类囊体靶向信号肽（thylakoid lumen targeting signal，又称lumen transfer peptide, LTP），该疏水信号长度约20-30aa，类似细菌Sec通路信号肽（带正电荷N区+疏水核心H区+极性C区+信号肽酶切位点Ala-X-Ala）。根据底物蛋白特性，该LTP信号进入类囊体腔有两条独立通路：a) Sec通路（类囊体膜上的cpSecA ATPase + cpSecYEG通道，类似细菌SecYEG，转运未折叠肽；需水解ATP）——如PsbO、细胞色素f前体；b) Tat通路（Twin Arginine Translocation，类囊体膜TatA/TatB/TatC复合物，底物信号肽带RR/xK/RR双精氨酸保守基序；独特之处是可转运已经折叠的蛋白甚至多聚蛋白寡聚体，能量来自ΔpH跨类囊体膜质子梯度，不水解ATP）——如质体蓝素、光合链组分PsaN等。蛋白穿过类囊体膜Sec/Tat通道后，由类囊体腔侧的类囊体加工肽酶（TPP，属SPP家族）切除LTP，成熟蛋白最终定位类囊体腔。B错误：叶绿体不通过ER-Golgi分泌通路定位蛋白（与内共生起源相关，其蛋白分选完全独立于内膜系统）。C错误：SRP（信号识别颗粒）是ER共翻译转运的因子，叶绿体类囊体SRP（cpSRP，由cpSRP54+cpSRP43组成）仅负责整合类囊体膜的捕光色素蛋白（LHCP），不是类囊体腔蛋白的转运因子；且方向错误。D错误：类囊体膜与包膜完全独立，无直接从胞质进类囊体腔的一步通路。叶绿体四层分区分选（Tic/Toc+类囊体Sec/Tat）是细胞器章节植物细胞独有的难点。",
    "knowledge": ["细胞生物学","细胞器","叶绿体类囊体腔蛋白Tic/Toc+Sec/Tat两步转运"],
    "module": "module_1",
    "difficulty": "league",
    "target": "both",
    "concept": "细胞器"
  }
]

print(f"生成细胞器题目: {len(org_questions)}道（示例演示，完整文件需更多）")
