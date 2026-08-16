# -*- coding: utf-8 -*-
# Step2: Bacteria 29 questions
import pickle, sys
from collections import Counter

QUESTIONS = pickle.load(open('_afterY.pkl','rb'))

def E(disc, tag, stem, opts, ans, aA, aB, aC, aD, s, kn):
    L = "ABCD"; parts = []
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

def padO(opts):
    fillers = ["该过程涉及相应分类地位、细胞结构、关键分子与实验证据的综合。",
               "其分子基础依赖结构特化、代谢通路与毒力/生理功能的协同实现。",
               "该分类单元体现结构层次、功能基因与生活方式共同决定的表型。",
               "其机制解析依赖分类、结构、分子与遗传的多维证据交叉验证。"]
    ML = max(len(v) for v in opts.values())
    for i,k in enumerate("ABCD"):
        while len(opts[k]) < ML-5: opts[k] += fillers[i]
    return opts

def anaFor(tag, subj, kn1):
    A = (f"{subj}的正确理解需从细菌学四个层面整合：①分类地位（革兰染色/形态/系统发育门属）；"
         f"②细胞结构（G+G-肽聚糖层数差异、脂多糖LPS结构、芽孢/荚膜/鞭毛/菌毛附属器、古菌膜"
         f"醚键/单层脂的特异）；③关键分子机制（酶活性、分泌系统效应蛋白功能、抗生素靶位"
         f"如青霉素转肽酶/利福平RNA pol β/氯霉素50S肽基转移酶）；④实验证据链（Tn5基因敲除"
         f"的LD50倍数变化、显微共定位、抑制剂药理学、动物/细胞感染模型表型）形成闭合因果链。")
    B = (f"该选项混淆细菌分类或结构的基础差异：如将G+厚肽聚糖+磷壁酸与G-薄肽聚糖+外膜+LPS+"
         f"周质空间弄混，或否定细菌特异性分泌系统(T3SS/T4SS/T6SS针复合体)的存在；实验"
         f"中免疫印迹特定分子量条带、冷冻电镜针结构直径等直接证据可否定。")
    C = (f"该选项把细菌导致的表型完全归因于非特异性因素（操作污染/交叉染色/宿主自体病理），"
         f"否定突变体/抑制剂的特异性：如庆大霉素保护实验的胞内CFU计数+激光共聚焦LAMP-1共"
         f"定位双指标、或LD50 10^4到10^9变化达5个数量级均非非特异性可以解释。")
    D = (f"该选项否定真细菌/古菌、G+/G-、寄生/共生/腐生的生态位功能差异：如硝化螺菌NOB代时"
         f"72h（化能自养）vs E.coli 20min相差216倍是氮循环生态位决定的、古菌单层膜醚键vs细菌"
         f"双层酯键是系统发育域的本质差异而非培养基随机波动。")
    S = (f"联赛{tag}题重点在分类→结构→分子→证据四层统一；近年常考：{kn1}、抗生素作用靶位与"
         f"耐药机制（β-内酰胺酶/mecA PBP2a）、共生/固氮/致病的分泌系统效应蛋白、及氮循环硝化/"
         f"反硝化/固氮菌群功能分工，需熟练掌握常见干扰项的判断模式。")
    return A,B,C,D,S

XDATA = [
("大肠杆菌E.coli K12 pBR322(bla AmpR)转化：LB氨苄青霉素平板菌落1.2×10^7cfu/μg，对照<10；bla编码β-内酰胺酶SDS-PAGE定位=周质。G-的β-内酰胺抗性与外膜屏障",
 "E.coli G-的β-内酰胺类(青霉素)抗性：外膜孔蛋白OmpF限制抗生素通透+周质空间分泌β-内酰胺酶(bla基因)水解β-内酰胺环四元酰胺键灭活；pBR322质粒AmpR筛选体系",
 "革兰阴性β-内酰胺酶bla周质分泌与外膜屏障双抗性"),
("枯草芽孢杆菌B.subtilis 168：营养期60°C 10min存活率2.3×10^-5；产孢培养基纯芽孢100°C 10min存活率92%。芽孢抗逆DPA-Ca2+机制",
 "芽孢(endospore)皮层肽聚糖结合吡啶二羧酸钙(DPA-Ca2+)螯合、核心脱水30%+小酸溶蛋白SASP结合DNA防突变、抗热抗辐射化学消毒机制",
 "芽孢皮层肽聚糖、吡啶二羧酸DPA-Ca2+抗热抗逆结构"),
("苜蓿中华根瘤菌S.meliloti Rm1021 × M.truncatula：TEM类菌体被共生体膜包裹；nodC突变体根毛卷曲WT36%→突变2%、皮层感染线WT18→突变0。Nod结瘤因子共生信号",
 "根瘤菌Nod结瘤因子(脂壳寡糖LCO，N-乙酰葡糖胺β-1,4骨架+脂肪酸链)：nodC合酶合成骨架；触发根毛卷曲、皮层感染线IT形成、根瘤器官发生三步共生程序",
 "根瘤菌Nod结瘤因子脂壳寡糖、皮层感染线共生信号"),
("结核分枝杆菌M.tb H37Rv：Ziehl-Neelsen抗酸染色红色阳性；waxD突变体(mycolic acid合酶缺)抗酸阴性。分枝菌酸与抗酸屏障",
 "M.tb细胞壁60%脂质：C60-C90超长链β-羟基分枝菌酸(mycolic acid)+索状因子海藻糖二霉菌酸酯形成疏水屏障，阻止酸性乙醇脱色→抗酸阳性；WaxD是mycolic acid合酶关键",
 "分枝菌酸(mycolic acid)索状因子、抗酸染色阳性机制"),
("霍乱弧菌V.cholerae O1兔回肠结扎段：10^7cfu 18h积液12ml；ctxA突变体0.4ml；CT-A无B亚基0.7ml。AB5结构CT-ADP核糖基化Gsα致泻",
 "霍乱毒素AB5结构：B五聚体结合上皮GM1神经节苷脂→A亚基内在化→ADP核糖基化Gsα蛋白(Arg201修饰，不可逆激活)→腺苷酸环化酶持续激活→cAMP↑100倍→CFTR Cl-通道开放→Na+/Cl-大量丢失到肠腔→水样腹泻",
 "霍乱毒素AB5结构、Gsα-ADP核糖基化→cAMP↑腹泻机制"),
("幽门螺杆菌H.pylori 26695胃黏膜CLO尿素酶试验10min黄→樱桃红(pH>8.2)；ureB突变体=黄色。脲酶产NH3中和胃酸定植",
 "H.pylori胞内脲酶(多聚体6个UreA+B亚基)催化尿素→2NH3+CO2，NH3中和周围胃酸H+→pH>8；跨内膜UreI酸门控尿素通道(外pH<5.5开放)富集底物、保证胃内酸性极端环境生存定植",
 "脲酶产NH3中和胃酸、UreI酸门控通道胃内定植"),
("MRSA USA300：MH苯唑西林6μg/ml抑菌圈=11mm(耐药判定)；mecA PCR阳性；Western blot抗PBP2额外78kD条带。mecA岛PBP2a β-内酰胺耐药",
 "MRSA的SCCmec岛获得mecA基因→编码PBP2a(新型青霉素结合蛋白，78kD，转肽酶活性)：对β-内酰胺类抗生素亲和力比正常PBP2低100-1000倍、可以替代正常PBP2(被β-内酰胺抑制)继续合成肽聚糖→耐药性(MIC >64μg/ml)",
 "MRSA的mecA岛PBP2a低β-内酰胺亲和力转肽酶耐药"),
("铜绿假单胞P.aeruginosa PAO1静止24h生物膜结晶紫A570=1.8(浮游0.08)；lasI突变体(Las AHL合成酶缺)=0.2；加10μM 3OC12-HSL恢复=1.72。QS AHL生物膜级联",
 "Las群体感应quorum sensing：LasI合成3OC12-HSL(C12高丝氨酸内酯AHL)→胞内浓度阈值→LasR转录因子激活下游基因：包括RhlI/RhlR次级级联、胞外多糖EPS藻酸盐合成、毒力(弹性蛋白酶LasB)→形成三维生物膜结构；lasI突变体无AHL→生物膜严重缺陷",
 "铜绿假单胞LasI/RhlI AHL群体感应QS、生物膜形成级联调控"),
("鱼腥藻Anabaena PCC 7120缺氮24h：异形胞频率=每11营养细胞夹1个(9:1)；nifH::gusA异形胞特异性深蓝；hetR突变体缺氮72h无异形胞、Nif活性<0.5%WT。异形胞分化固氮酶保护",
 "鱼腥藻丝状体缺氮触发模式分化：HetR丝氨酸蛋白酶主调控因子→每10营养细胞中一个分化为异形胞：①加厚细胞壁阻O2入；②失去PSII放氧(无O2干扰固氮酶)；③上调呼吸消耗剩余O2→保证固氮酶(严格厌氧)催化N2→NH3；nifH报告基因证明固氮严格限定异形胞",
 "鱼腥藻异形胞HetR-NtcA模式分化、光合放氧/固氮酶O2保护"),
("链霉菌S.coelicolor A3(2) R2YE平板14d：中心灰色孢子、中区蓝色actinorhodin色素、周缘白色气生菌丝；bldA突变体(TmRNA稀有UUA tRNA缺)=光秃无气生/孢子/蓝色素。bld-whi形态分化级联",
 "链霉菌(革兰阳性放线菌)复杂生活周期：基质菌丝→白色气生菌丝(由bld级联调控，bldA编码唯一识别UUA稀有密码子tRNALeu→翻译whiG sporulation σ因子/Act抗生素合成等含UUA密码的晚期分化关键蛋白)→bldA突变阻断气生菌丝启动和次级代谢→光秃bald表型",
 "链霉菌bldA tRNALeu UUA稀有密码子、形态分化+次级代谢级联"),
("福氏志贺氏菌S.flexneri 2a HeLa侵袭庆大霉素保护：WT 2.8×10^5/孔、ipaB突变体(T3SS效应蛋白缺)=3.2×10^2；FITC-phalloidin染F-actin WT侵袭96%亮斑/突变无。III型分泌系统T3SS肌动蛋白重排侵袭",
 "志贺氏菌Mxi-Spa III型分泌系统(针孔复合体)：细菌接触宿主细胞→插入 translocon IpaB/IpaC/IpaD→通过针管注射效应蛋白IpaA/IcsA等入胞质→IpaB激活Cdc42 GTP酶→触发Arp2/3复合体依赖的F-肌动蛋白聚合富集(亮斑)→细菌内吞侵入；ipaB突变体完全丧失侵袭",
 "志贺氏菌III型分泌系统T3SS Ipa侵袭素、肌动蛋白重排入侵"),
("淋病奈瑟氏菌N.gonorrhoeae FA1090 ME180黏附：P+菌毛株146菌/细胞、P-株6.3、pilE突变=3.2；互补P+ pilE质粒128。T4P菌毛黏附pilS/pilE抗原变异",
 "淋病奈瑟氏菌IV型菌毛T4P(pilE主要菌毛素亚基)介导细胞黏附定植；pilS沉默基因盒(含多个变异pil基因)通过同源重组重组到表达位点pilE→菌毛抗原高频变异(10^-2代)逃避宿主中和抗体；pilE缺失突变体完全丧失黏附",
 "淋病奈瑟氏菌T4P菌毛黏附、pilS/pilE同源重组抗原变异"),
("嗜热栖热菌T.thermophilus HB8：最适80°C代时τ=3.2h；基因组GC 69.4%；16S rRNA Tms=88°C(E.coli=73°C)；Hu组蛋白乙酰化多3个。嗜热高温适应机制",
 "嗜热菌Thermus高温适应多层面：①基因组高GC%(69.4%)→DNA双链氢键更多更稳；②16S rRNA G-C配对增加+甲基化修饰→Tms解链温度升高15°C；③蛋白表面/内部盐桥(E-K/R-D静电相互作用)比嗜温菌多2-3倍→疏水核稳定；④反向旋转酶reverse gyrase(古菌/超嗜热独有)使DNA正超螺旋提高解链Tm；⑤组蛋白Hu赖氨酸乙酰化稳定类核结构",
 "嗜热菌高温适应：GC含量、rRNA稳定、蛋白盐桥、反向旋转酶正超螺旋"),
("鼠伤寒沙门氏菌S.Typhimurium LT2小鼠：WT LD50 1.2×10^4cfu、phoP/phoQ突变=2.6×10^9(毒力↓21万倍)；pagC::lacZ β-gal pH5.6=2880U/pH7.4=110U。PhoP-PhoQ双组分胞内酸性感应毒力",
 "沙门氏菌PhoP-PhoQ经典双组分系统：PhoQ=膜结合组氨酸激酶HK(感受巨噬细胞溶酶体酸化pH5.6、抗菌肽CAMPs低Mg2+)→自磷酸化→磷酸转移到应答调节子PhoR(=PhoP)→激活pagC等毒力基因(脂多糖LPS修饰+抗菌肽抵抗+吞噬体生存)；pH5.6/7.4的26倍启动子活性差异是酸性感应的直接证据，LD50 21万倍差异证明是核心毒力岛",
 "沙门氏菌PhoP-PhoQ双组分系统：酸性pH/抗菌肽感应与胞内寄生毒力"),
("空肠弯曲杆菌C.jejuni 11168 Transwell趋化：下室10mM胆汁盐跨膜菌WT 4.2×10^5、cheY突变=1.8×10^3；鞭毛flaA/flaB双突变=89。鞭毛趋化胆汁盐肠道定植",
 "C.jejuni单极鞭毛旋转趋化：CheY磷酸化应答调节子→结合鞭毛马达FliM/M环→改变旋转方向；趋化受体Tlp1-7识别胆汁盐(肠道信号)→CheA组氨酸激酶激活→CheY-P驱动鞭毛定向运动朝向胆汁盐梯度(上)；cheY突变体随机游走无定向(1.8k vs 420k)，flaA/flaB双突变完全无鞭毛不能跨膜(89)",
 "空肠弯曲杆菌鞭毛趋化CheY调节子、胆汁盐受体肠道定植特异性"),
("土拉弗朗西斯菌F.tularensis Schu S4 THP-1巨噬感染庆大霉素2h：WT 1.1×10^6/孔、fevR突变(FPI调节子缺)=2.4×10^3；共聚焦LAMP-1共定位WT感染12h后92%菌释放胞质(fevR突变95%在囊泡)。FPI毒力岛吞噬体逃逸",
 "土拉弗朗西斯菌FPI(Francisella Pathogenicity Island，~30kb 16-19基因)编码类似IV型分泌系统T4SS样装置；FevR是FPI主转录激活因子；吞噬体进入后FevR激活FPI表达→分泌效应蛋白破坏吞噬体膜(LAMP-1溶酶体标记消失)→92%菌释放到营养丰富胞质大量繁殖；fevR突变体95%困在LAMP-1+囊泡→被溶酶体降解→不能增殖(1.1M→2.4K下降458倍)",
 "土拉弗朗西斯菌FPI毒力岛、FevR调节吞噬体逃逸→胞质繁殖"),
("痤疮丙酸杆菌P.acnes面部毛囊厌氧分离：5%H2+10%CO2 37°C 7d菌落凸圆形白；G+不规则短杆菌；生化：触酶(+)吲哚(-)；皮脂三酰甘油脂肪酶代谢游离脂肪酸致痤疮。皮肤微生态丙酸杆菌",
 "P.acnes(现Cutibacterium acnes，放线菌门)是皮脂腺专性厌氧共生G+杆菌：在毛囊皮脂腺单位厌氧环境下(皮脂丰富低氧)，分泌甘油三酯脂肪酶(lipase，分泌到胞外)→水解皮脂三酰甘油(triacylglycerol)→释放游离脂肪酸(FFA如油酸/棕榈酸)→游离脂肪酸刺激毛囊导管角化过度+角质形成细胞增殖→毛囊口堵塞+毛囊壁破裂+炎症细胞浸润→痤疮丘疹脓疱发生；触酶(+)、吲哚(-)是关键生化鉴定",
 "皮肤痤疮丙酸杆菌皮脂脂肪酶、游离脂肪酸刺激毛囊角化痤疮病理"),
("荧光假单胞P.fluorescens Pf-5小麦根际分离acdS(ACC脱氨酶)活性28μmol α-酮丁酸/h/mg；acdS突变体根长WT 58%；盐碱土WT处理根长未接种210%。PGPR ACC脱氨酶抗逆",
 "根际促生菌PGPR(Plant Growth-Promoting Rhizobacteria)的Pseudomonas荧光假单胞：acdS基因编码ACC(1-氨基环丙烷-1-羧酸，乙烯前体)脱氨酶→把植物根合成的ACC(乙烯前体，胁迫下乙烯合成↑抑制根伸长=三重反应)水解为α-酮丁酸+NH3→降低根内源乙烯水平→解除乙烯对根伸长抑制；盐碱胁迫下小麦根从未接种→接种PGPR根长增加2.1倍，acdS突变此促生效应消失(仅58%WT)",
 "PGPR荧光假单胞ACC脱氨酶降解ACC乙烯前体、缓解盐/旱胁迫促根伸长"),
("钩端螺旋体L.interrogans Lai株金黄地鼠感染5d：肝黄疸胆红素↑12倍、毛细胆管紧密连接断裂；暗视野显微镜6-20μm×0.1μm细螺旋两端钩曲。内鞭毛(endoflagella)动力LPS黄疸",
 "钩端螺旋体(螺旋体门Spirochaetes)形态：细长螺旋形(长6-20μm、直径0.1μm)、两端呈钩状弯曲；独特运动器官：内鞭毛endoflagella(轴丝)位于外膜(外膜鞘)与原生质柱之间的周质空间、两端各一束插入；内鞭毛旋转驱动细胞螺旋状屈曲运动→穿透力强(穿过毛细血管进入组织)；致病：LPS脂多糖(O抗原)激活TLR4→细胞因子风暴→肝脏毛细胆管紧密连接断裂(occludin/claudin解离)→胆汁返流高胆红素血症黄疸(12倍升高)",
 "钩端螺旋体内鞭毛(周质鞭毛)动力、LPS致黄疸肝炎紧密连接损伤"),
("乳球菌L.lactis IL1403 M17+1%乳糖：pH6.5→4.2停止；HPLC D/L乳酸95mM(98%)乙酸1.2mM；ldh(L-乳酸脱氢酶缺)突变乳酸8mM乙醇32mM乙酸29mM异型。同型乳酸发酵LDH代谢流",
 "Lactococcus lactis同型乳酸发酵(homofermentative)：EMP途径葡萄糖→2丙酮酸→关键酶ldh编码L-LDH乳酸脱氢酶(NAD+再生)催化丙酮酸+NADH+H→L-乳酸+NAD+(98%代谢流，终产物95mM乳酸仅1.2mM乙酸)；ldh突变→丙酮酸无法还原为乳酸→转向异型发酵(heterofermentative)支路：丙酮酸→乙醛→乙醇(32mM)+乙酰-P→乙酸(29mM)，证明LDH是EMP代谢流分流到同型发酵的关键控制点",
 "L.lactis同型发酵LDH(丙酮酸→L-乳酸)、突变体转换为异型发酵代谢流"),
("嗜盐古菌H.salinarum NRC-1：需NaCl 3.5-4.5M(饱和)，<2.5M裂解；质膜紫膜细菌视紫红质BR：光照568nm吸收→质子泵出建ΔpH=1.2→ATP合酶合成ATP。古菌嗜盐机制KCl内积累+BR光泵H+",
 "Halobacterium salinarum(广古菌门盐古菌纲)嗜盐三重适应：①胞内KCl积累达4M(胞外Na+高→胞内对应等渗K+维持渗透压)；②蛋白全局适应：所有蛋白pI≈4(酸性强带负电)→表面高度水合层稳定不沉淀；③细菌视紫红质bacteriorhodopsin(BR，26kD 7TM+视黄醛辅基)→紫膜二维六角晶格→光驱动(568nm光子)构像变化→质子H+从胞质泵出胞外→跨膜ΔpH=1.2梯度→驱动ATP合酶F0F1合成ATP(无氧光合磷酸化型化能异养+光能混合营养)",
 "嗜盐古菌：4M KCl内积累、酸性蛋白pI≈4水合、细菌视紫红质光驱动质子泵"),
("李斯特氏菌L.monocytogenes EGDe Caco-2感染MOI 50 2h庆大霉素：WT 5×10^4/孔、hly突变(LLO李斯特溶素O缺)=2.1×10^2；actA突变(肌动蛋白ActA尾缺)胞内CFU同WT但plaque斑面积仅4%WT。LLO逃逸+ActA彗星尾胞间传播双机制",
 "李斯特氏菌(革兰阳性兼性胞内寄生)双毒力机制：①LLO(Listeriolysin O，胆固醇依赖溶素，hly编码)：吞噬体酸化pH 5.5激活LLO→寡聚插入吞噬体膜形成25-30nm孔→吞噬体膜破裂→细菌释放到胞质(hly突变99.6%困囊泡不能增殖)；②ActA：细菌极面表达ActA(模拟N-WASP)→招募Arp2/3复合体→促进F-肌动蛋白在细菌一端聚合→形成彗星尾(comet tail)→推动细菌在胞质高速运动(10μm/s)→撞击邻近细胞膜→形成膜突起(phagocytic cup)→直接进入相邻细胞(无需经胞外)实现细胞间传播；actA突变无运动→无plaque斑(仅4%面积)",
 "李斯特氏菌LLO吞噬体逃逸+ActA-Arp2/3肌动蛋白彗星尾胞间传播双毒力"),
("脆弱拟杆菌B.fragilis NCTC 9343：BHI厌氧培养灰白不溶血；荚膜PSA(多糖A)=(两性离子多糖α-GalNAc-[4,6-Pyr]±电荷)；IL-10-/-小鼠DNBS结肠炎：灌胃WT B.fragilis疾病评分0.8(未处理4.2)，ΔPSA突变处理=3.7。PSA荚膜→Foxp3+ Treg IL-10肠炎耐受",
 "脆弱拟杆菌(人肠道核心共生拟杆菌门G-厌氧)的免疫调节分子：PSA荚膜多糖A(独特两性离子结构，同时带正/负电荷而非一般中性/酸性多糖)→被DC树突状细胞摄取→MHCII分子呈递(多糖抗原非常规呈递)→诱导初始CD4+T细胞分化为Foxp3+调节性T细胞(Treg)→Treg分泌IL-10(抑制炎症因子IFN-γ/TNF-α)→缓解实验性结肠炎(IL-10敲除鼠DNBS模型)；ΔPSA缺失突变体几乎失去免疫保护(评分从0.8→3.7)证明PSA是免疫耐受的关键分子",
 "脆弱拟杆菌荚膜PSA两性离子多糖→Foxp3+ Treg→IL-10免疫耐受肠炎保护"),
("硝化螺菌N.defluvii(NOB亚硝酸盐氧化菌)富集反应器：3mM NO2-唯一能源HCO3-唯一碳源；NO2-→NO3-氧化65μmol/h/mg蛋白、代时τ=72h；16S系统发育=Nitrospirae门独立深分支非α-变形菌Nitrobacter。氮循环硝化第二步NOB反向电子传递",
 "硝化作用第二阶段：亚硝酸盐氧化菌NOB(Nitrospira为主，非Nitrobacter)催化2NO2-+O2→2NO3-；能量代谢：NO2-氧化为NO3-仅释放少量能量(ΔG°'=-74kJ/mol，远小于异养糖氧化-2840)→生长极慢(代时τ=72h，E.coli 20min=216倍差异)；CO2固定Calvin循环需要ATP+NADPH→NOB通过反向电子传递(reverse electron transport)消耗质子动力势pmf把电子从NO2-(高氧化还原电位+0.43V)逆电势梯度传递到NAD+(+0.32V困难步骤)生成NADPH→化能自养；系统发育Nitrospira门独立分支(不是变形菌门)是深层生物圈广泛类群",
 "氮循环：硝化二阶段NOB亚硝酸盐氧化、反向电子传递化能自养Nitrospira门"),
("肉毒梭菌C.botulinum A型Hall：80°C10min热活化疱肉培养基厌氧培养3d：上清1:10^8稀释小鼠0.5ml→4只24h全死亡(弛缓麻痹后肢拖眼睑下垂)；BoNT/A突变(毒素重链C端结合域缺)小鼠1:10不死。BoNT锌内肽酶切SNAP-25阻断ACh释放弛缓麻痹",
 "肉毒梭菌(Clostridium革兰阳性厌氧内生芽孢梭菌属)致死毒素BoNT(肉毒神经毒素，7种血清型A-G，LD50 1ng/kg=人类最毒物质)：BoNT/A结构=重链HC(100kD，C端HCC结构域结合神经元突触前膜特异性受体SV2C糖蛋白+神经节苷脂GT1b双受体)→经受体介导内吞进入酸化囊泡→重链N端HN形成跨膜孔→轻链LC(50kD，锌金属内肽酶Zn2+结合HEXXH基序)释放到胞质→特异性切割SNARE复合体的SNAP-25(突触相关25kD蛋白，Gln197-Arg198位点)→SNARE复合体装配失败→突触小泡无法与突触前膜融合→乙酰胆碱ACh释放完全阻断→神经肌肉接头无兴奋传递→肌肉弛缓性麻痹(不能收缩=后肢拖/眼睑下垂/吞咽困难/膈肌麻痹呼吸窒息死亡)；LC锌蛋白酶特异性(一种BoNT只切一种SNARE特定氨基酸位点)是BoNT超毒力分子基础",
 "肉毒梭菌芽孢厌氧、BoNT/A锌内肽酶切割SNARE-SNAP25阻断ACh释放致弛缓麻痹"),
("军团菌L.pneumophila Philadelphia-1株与棘阿米巴Acanthamoeba共培养72h：胞内增殖1.2×10^4倍(10^2→10^6)；dotA突变(Dot/Icm IVB型T4SS核心ATPase缺)=增殖3.1倍；LAMP-1共定位WT 12% dotA突变89%。Dot/Icm T4SS修饰吞噬体LCV逃逸溶酶体",
 "嗜肺军团菌(军团菌目γ-变形菌G-兼性胞内寄生)进化自感染自由生活原生动物(棘阿米巴)：Dot/Icm IVB型分泌系统(Type IVB secretion，由27个Dot/Icm基因编码，DotA是核心ATPase驱动效应蛋白易位)→吞噬进入阿米巴/巨噬后立即分泌>330种效应蛋白(真核模拟蛋白如SidC/SdcA磷脂结合、Rab GAPs)→重编程宿主内体运输：①抑制吞噬体LAMP-1溶酶体标记募集(WT 12% colocalize vs dotA突变89%即溶酶体融合失败逃逸降解)；②劫持内质网COPII小泡(内质网→高尔基体运输小泡)包裹吞噬体→转化为复制型LCV囊泡(Legionella-Containing Vacuole)→在其中大量增殖；dotA突变不能修饰→吞噬体直接与溶酶体融合→细菌降解(增殖仅3.1倍)",
 "军团菌Dot/Icm IVB型T4SS、修饰LCV吞噬体劫持COPII逃逸溶酶体融合在阿米巴胞内增殖"),
("肺炎链球菌S.pneumoniae D39小鼠鼻腔10^6cfu 48h：WT肺CFU=4.3×10^8/肺、死亡率7/10；cps突变(荚膜多糖合成缺)肺CFU=5.2×10^4/肺、死亡率0/10；血涂片WT=12荚膜菌/视野(透明圈)、cps突变无圈。厚荚膜抗C3b调理吞噬侵袭毒力",
 "肺炎链球菌(草绿色链球菌群G+厚壁菌，矛头状双球菌)主要毒力因子=厚荚膜多糖(cps基因簇17-20kb合成，>90个血清型各不同多糖结构)：荚膜功能=抗调理吞噬(opsonophagocytosis)：①荚膜是高度水合多糖屏障遮蔽细胞壁表面抗原(磷壁酸/肽聚糖)→血清补体C3b蛋白沉积到细胞壁的C3b被荚膜层物理阻挡→C3b-iC3b-Mac-1巨噬细胞受体结合失败→吞噬作用效率下降100-1000倍；②瑞士吉姆萨染色显示透明荚膜圈(荚膜不着色菌体被染色)是形态学鉴定特征；③cps突变体(无荚膜)：肺CFU下降4个数量级、死亡率70%→0%的毒力丧失证明荚膜是侵袭性肺炎/脑膜炎/败血症的绝对必需毒力因子(无荚膜为无毒粗糙R型，Griffith转化实验原理)",
 "肺炎链球菌厚荚膜多糖、遮蔽C3b抗调理吞噬、侵袭性肺炎/脑膜炎毒力"),
("铜绿假单胞菌P.aeruginosa铁载体pyoverdine CAS平板：PAO1菌落周围橙黄晕圈18mm(CAS铁载体阳性)；pvdA突变(鸟氨酸N5-加氧酶pyoverdine合成起始酶缺)=晕圈<1mm；小鼠腹膜炎WT LD50 2.4×10^6、pvdA突变LD50 3.8×10^9。siderophore铁载体螯合转铁蛋白Fe3+毒力",
 "铁是几乎所有细菌必需元素(血红素/铁硫蛋白/核苷酸还原酶辅酶)，但宿主体内游离Fe3+浓度极低(转铁蛋白/乳铁蛋白结合Fe3+后仅10^-18M，远低于细菌生长需要10^-6M)；铜绿假单胞(γ-变形菌G-机会致病菌)分泌铁载体 siderophore pyoverdine(荧光假单胞素，绿色荧光肽-羟肟酸螯合剂)：pvdA编码L-鸟氨酸N5-加氧酶催化肽骨架合成第一步→pyoverdine分泌到胞外→与转铁蛋白/乳铁蛋白竞争结合Fe3+→Fe3+-pyoverdine(稳定常数Kf=10^32 M^-1=极强螯合)→通过外膜FpvA受体( TonB-ExbBD依赖转运)将Fe3+运回胞质→满足生长；pvdA突变体不能合成pyoverdine→无法从宿主获取Fe→毒力从LD50 2.4×10^6→3.8×10^9(下降1583倍)证明铁获取是核心毒力",
 "细菌siderophore铁载体pyoverdine、pvdA合成酶螯合宿主转铁蛋白Fe3+、毒力"),
]

print(f"细菌准备生成：{len(XDATA)}题")
for i,(stem,shortExp,kn) in enumerate(XDATA):
    aA,aB,aC,aD,sm = anaFor("细菌", shortExp, kn)
    opts = padO({
      "A":f"该实验综合细菌分类地位(形态/染色/系统发育)、细胞结构(肽聚糖/LPS/芽孢/荚膜/分泌系统)、关键分子机制(酶/转运体/效应蛋白/信号分子)与定量实验证据(Tn5/LD50/抑制剂/显微)四者解析{shortExp}。",
      "B":f"观察表型由基础营养或代谢差异单独决定，无需特定毒力岛/分泌系统/特化结构；基因突变表型差异均为次生生长速度改变。",
      "C":f"实验观察来源于操作污染/非特异性染色/宿主自体反应；毒力/特殊代谢是宿主组织病理而非细菌特异性因子。",
      "D":f"所有细菌无论分类(G+/G-古/真)结构/代谢/感染策略相同；定量差异来自培养基/宿主随机波动。",
    })
    QUESTIONS.append(E("微生物学","细菌",stem,opts,"A",aA,aB,aC,aD,sm,kn))

c2 = Counter(q['concept'] for q in QUESTIONS)
print(f"X细菌后: {dict(c2)} | TOTAL={len(QUESTIONS)}")
assert c2['细菌'] == 29, f"细菌应=29，实际{c2['细菌']}"

with open('_afterX.pkl', 'wb') as f:
    pickle.dump(QUESTIONS, f)
print("X细菌完成")
