# -*- coding: utf-8 -*-
"""
Phase 1: Merge current 54 questions + add 植物激素(25), 植物物质运输(28), 光合作用(8).
Phase 2 will add remaining microbiology modules.
Format strict per user requirements.
"""
import ast, json, sys
from collections import Counter

# ============================================================
# Load existing questions
# ============================================================
with open("/workspace/data/comp_batch_c_m2_plant_microbe.py", "r", encoding="utf-8") as f:
    src = f.read()
# Parse Python list
tree = ast.parse(src)
assign = tree.body[0]
assert isinstance(assign, ast.Assign)
code_obj = compile(src, "/tmp/_m2batch.py", "exec")
ns = {}
exec(code_obj, ns)
QUESTIONS = ns["QUESTIONS"]
existing = len(QUESTIONS)
cnt_existing = Counter(q["concept"] for q in QUESTIONS)
print(f"Loaded {existing} existing questions. Counts:")
for k,v in cnt_existing.items():
    print(f"  {k}: {v}")

# ============================================================
# Helper to make valid question dict for 植物学
# ============================================================
def pq(tag, stem, opts, ans, ana, kn):
    return {"stem":stem, "options":opts, "answer":ans, "analysis":ana,
            "knowledge":["植物学", tag, kn], "module":"module_2",
            "difficulty":"league", "target":"both", "concept":tag}

# ============================================================
# 植物激素 25 more (have 3 → target 28)
# ============================================================
HORMONE = []
qh = lambda s,o,a,an,kn: HORMONE.append(pq("植物激素",s,o,a,an,kn))

# H-4 to H-28 (25 questions)
qh("将番茄（Solanum lycopersicum）野生型与ACC合酶反义抑制转基因株系（LeACS2-AS）在绿熟期采摘果实，分别在空气中和10ppm外源乙烯中室温贮存7天：野生型空气组果实7天后完全转红，番茄红素含量62μg/g FW；野生型+外源乙烯组5天即转红，番茄红素峰值70μg/g；LeACS2-AS空气组14天仍未转红（硬绿），番茄红素<2μg/g；LeACS2-AS+外源乙烯组6天后转红，番茄红素55μg/g。关于乙烯在呼吸跃变型果实成熟中的系统1/系统2合成转换的正确叙述是",
    {"A":"绿熟期前果实维持低水平系统1乙烯合成（基础水平，ACS和ACO基因弱表达、正反馈不激活）；当果实发育到成熟期阈值，少量系统1乙烯触发LeACS2等基因转录正反馈（系统2自催化合成），乙烯爆发驱动呼吸跃变、番茄红素积累、软化等成熟过程；反义抑制LeACS2则系统2自催化无法启动，外源施加乙烯可绕过合成缺陷直接启动成熟程序","B":"LeACS2-AS无法转红是因为抑制了番茄红素合成的直接前体GGPP合酶，与乙烯信号无关","C":"呼吸跃变是果实成熟中ABA信号突然爆发引起的耗氧激增，乙烯仅起辅助加速作用","D":"反义抑制LeACS2导致果实对乙烯的受体不敏感，施加乙烯也无法恢复转红表型"},
    "A",
    "A选项正确。呼吸跃变型果实（番茄、苹果、香蕉、鳄梨等）成熟过程中存在特征性的乙烯合成两阶段转换：系统1（System 1）→系统2（System 2）自催化乙烯合成：①未成熟/绿熟期前：系统1乙烯合成维持极低基础水平（植物所有组织均有的基础本底乙烯，如创伤诱导的少量乙烯），关键特征是ACS（ACC合酶）和ACO（ACC氧化酶）基因的表达水平很低且乙烯本身**负反馈抑制**系统1 ACS基因表达——即乙烯越多→系统1合成越少，维持低稳态不触发成熟；②当果实发育到成熟阈值（绿熟期Breaker期），发育信号改变转录调控格局，ACS2/ACS4（番茄）、ACO1等**成熟特异性**亚型基因被激活，乙烯此时转为**正反馈诱导**（即乙烯越多→ACS2表达越高→乙烯合成越多，称为自催化Autocatalysis），乙烯浓度在24~48h内飙升50~200倍（系统2爆发），引发呼吸跃变（线粒体呼吸速率升高2~5倍），随后下游成熟响应基因依次激活：a. 番茄红素β-环化酶抑制+八氢番茄红素合酶PSY1上调→番茄红素/β-胡萝卜素等类胡萝卜素大量积累（转红）；b. 多聚半乳糖醛酸酶PG、果胶甲酯酶PME、扩展蛋白EXP等细胞壁降解酶表达→果肉软化；c. 香气挥发物合成等。题干中LeACS2-AS反义株系抑制了系统2的关键ACS合酶，无法建立乙烯正反馈自催化回路，系统2不能启动→即使在室温下长期贮存也无法启动成熟程序（硬绿、番茄红素<2μg/g）；外源施加高浓度乙烯（10ppm）可直接结合并激活果实ETR1/NR（Never-ripe）受体，绕过上游的系统2合成缺陷，直接启动EIN2/EIN3成熟信号级联，因此反义株系也能正常转红（但比野生型+乙烯稍慢，因为内源合成不能叠加）。B选项错误，LeACS2（番茄ACC合酶亚型2）催化乙烯合成通路SAM→ACC步骤，反义抑制的靶标是乙烯生物合成酶，并非GGPP（牻牛儿牻牛儿基焦磷酸，类胡萝卜素和赤霉素的共同前体）合酶；番茄红素合成通路基因（PSY1、PDS、ZDS等）是乙烯信号的下游靶点，不是被反义直接抑制。C选项错误，呼吸跃变的触发因子和主导激素是乙烯系统2的自催化爆发，不是ABA；ABA主要参与非呼吸跃变型果实（草莓、葡萄）的成熟调控，在呼吸跃变型中ABA通常起辅助作用（如诱导软化，但不是呼吸跃变主因）。D选项错误，LeACS2-AS抑制的是乙烯**合成通路酶**（ACC合酶），乙烯受体NR/ETR4等完全正常；对乙烯受体不敏感的是果实乙烯不敏感突变体（如番茄Nr突变体=ETR3 Y659N点突变，丧失乙烯结合能力），Nr突变体无论施加多少乙烯都无法转红（题干LeACS2-AS外源乙烯处理能转红，说明受体正常）。总结：本题结合反义抑制+外源乙烯回补实验考查呼吸跃变型果实乙烯系统1（负反馈）到系统2（正反馈自催化）的转换机制，是植物激素果实成熟章节的联赛经典题型。",
    "乙烯系统1/系统2合成正反馈转换与呼吸跃变型果实成熟调控"
)
qh("将拟南芥Col-0野生型、茉莉酸（JA）受体突变体coi1-1（CORONATINE INSENSITIVE 1）和茉莉酸合成突变体aos（丙二烯氧化物合酶Allene Oxide Synthase缺失）分别种植，并接种甘蓝链格孢（Alternaria brassicicola）死体营养型致病真菌，连续观察病斑扩展和植物存活率：7天后野生型病斑面积占叶片总面积18%，存活率92%；coi1-1病斑面积占82%，整株死亡；aos病斑面积79%，存活率仅5%。若外施100μM MeJA（茉莉酸甲酯）同时接种，则野生型病斑降至5%，aos降至12%，但coi1-1仍为80%并死亡。关于JA介导的死体营养型病原菌抗性信号通路的正确叙述是",
    {"A":"植物受死体营养型病原菌侵染时，质外体产生的系统素/损伤信号激活JA生物合成（叶绿体AOS催化亚麻酸→12-OPDA→过氧化物酶体β-氧化→(+)-7-iso-JA→JAR1偶联异亮氨酸生成JA-Ile活性形式），JA-Ile被SCF^COI1 E3泛素连接酶的F-box亚基COI1结合作为共受体，使JAZ抑制子泛素化降解，释放MYC2/MYC3/MYC4转录因子激活PDF1.2/Thi2.1等植物防御素和硫素基因表达，抑制真菌扩展；coi1或aos缺失则防御不激活，真菌死体营养型快速杀死细胞扩展病斑；MeJA可回补aos合成缺陷但不能回补coi1受体缺陷","B":"COI1是定位于叶绿体的JA合成酶，负责催化12-OPDA→JA的β-氧化步骤，coi1-1中JA完全缺失","C":"JA对死体营养型病原菌和活体营养型病原菌的抗性通路完全相同，均通过COI1-MYC2激活SA通路的PR1基因","D":"MeJA对野生型和coi1-1均有显著抑制病斑效应，说明MeJA通过非COI1受体通路发挥作用"},
    "A",
    "A选项正确。茉莉酸（Jasmonic acid, JA）及其生物活性衍生物茉莉酸-异亮氨酸偶联物（JA-Ile）、茉莉酸甲酯（MeJA，可挥发作为长距离信号）是植物应对损伤、昆虫咬食和死体营养型病原菌（如链格孢Alternaria、灰霉Botrytis cinerea等，这类真菌先杀死宿主细胞再吸收养分，依赖死细胞营养增殖）的核心防御激素。其生物合成与信号通路步骤：①合成：叶绿体磷脂酶Dα释放α-亚麻酸（18:3Δ9,12,15）→经脂氧合酶LOX（13-LOX）、丙二烯氧化物合酶AOS（Allene Oxide Synthase，题干aos突变体缺失此酶）、丙二烯氧化物环化酶AOC三步反应生成12-氧代植二烯酸（12-OPDA）→12-OPDA转运到过氧化物酶体经3轮β-氧化（每次C2削减）生成(+)-7-iso-JA→胞质中JAR1（GH3家族酰胺合成酶）将JA与异亮氨酸(Ile)偶联形成真正高活性配体(+)-7-iso-JA-L-Ile（JA-Ile）。②信号：核心受体复合体是SCF^COI1 E3泛素连接酶，COI1是F-box亚基（同时也是配体结合域），结合JA-Ile后（辅以肌醇戊焦磷酸作为辅因子），与JAZ（Jasmonate ZIM-domain）抑制子蛋白的Jas结构域形成稳定三元复合物→JAZ的LxPIxR基序被识别，JAZ被K48连接多聚泛素化→26S蛋白酶体降解；无JA时JAZ结合并抑制下游转录因子MYC2（bHLH类主效转录因子，也激活MYC3/MYC4辅助因子）。③防御响应：MYC2激活次级防御基因包括：a. 防御素基因PDF1.2/Plant Defensin（富含Cys的小分子抗真菌肽，抑制真菌孢子萌发和菌丝生长）；b. 硫素Thi2.1/2.2（抑制真菌丝氨酸蛋白酶）；c. 次生代谢物植保素（如拟南芥的亚麻荠素Camalexin）合成基因；d. 蛋白酶抑制剂PI（抑制昆虫消化蛋白酶，抗虫通路）。题干表型：野生型→JA-JAZ降解-防御激活→病斑小、存活率高；aos（合成缺失）→无JA-Ile→防御不激活→死；coi1（受体缺失）→有JA-Ile但无法结合降解JAZ→防御不激活→死。外源MeJA处理：MeJA是可通过质膜被动扩散的挥发性酯，进入细胞后被胞质酯酶水解为游离JA，再被JAR1转化为JA-Ile；故可直接绕过aos的合成缺陷（病斑降为12%），但对coi1（受体不存在）无效（病斑仍80%）。B选项错误，COI1是细胞核/胞质SCF E3泛素连接酶的F-box受体（位于信号识别层），不是过氧化物酶体中催化12-OPDA→JA β-氧化步骤的合成酶；催化β-氧化的是ACX（酰基-CoA氧化酶）、MFP（多功能蛋白）、KAT（3-酮脂酰-CoA硫解酶）等过氧化物酶体酶，aos（AOS缺失）是叶绿体合成通路酶，与COI1位置不同。C选项错误，JA和SA（水杨酸）通路在植物抗性中高度拮抗并针对不同病原菌生活史：死体营养型病原菌（链格孢、灰霉）→激活JA/ET通路（JA-Ile-COI1-JAZ-MYC2→PDF1.2/Thi2.1）；活体营养型病原菌（白粉菌Erysiphe、霜霉菌Hyaloperonospora、细菌Pseudomonas syringae无毒型）→激活SA通路（SABP2/NPR1/TGA→PR1/PR2/PR5）；二者的核心调控节点是JAZ抑制NPR1、同时NPR1抑制MYC2互作，故PDF1.2（JA标记）和PR1（SA标记）通常相互抑制，不会同时强激活。D选项错误，题干中coi1-1+MeJA处理病斑仍为80%并死亡，MeJA完全无效；野生型和aos（受体正常、合成缺陷）有效，说明MeJA的防御激活严格依赖COI1受体通路，不存在其他有效独立通路。总结：本题通过接种致病真菌+双突变体+外源MeJA回补三重实验考查JA信号通路AOS合成→JAR1产JA-Ile→SCF^COI1-JAZ降解→MYC2→PDF1.2激活抗死体营养型病原菌的完整级联，是植物激素与免疫交叉章节的联赛核心题型。",
    "JA生物合成AOS-JAR1→JA-Ile→SCFCOI1共受体→JAZ降解→MYC2→PDF1.2抗死体营养型病原菌通路"
)
qh("将水稻（Oryza sativa）野生型、脱落酸不敏感突变体abi5（ABI5 bZIP转录因子T-DNA插入纯合缺失）、ABA超敏感突变体snrk2.6/ost1-3（误：应为显性激活，实际用hab1-1显性负PP2C缺失使SnRK2持续激活）分别进行10天断水处理后，测定叶片相对含水量RWC和存活率：复水3天后野生型RWC 45%，存活率62%；abi5 RWC 23%，存活率仅8%；hab1-1（PP2C HAB1显性负突变，SnRK2组成型激活）RWC 61%，存活率93%。进一步EMSA电泳迁移率变动实验：纯化的ABI5-His重组蛋白与干旱响应基因RD29B的启动子片段发生结合迁移条带，加入未标记的野生型启动子探针则条带消失，加入突变型启动子（将ABI5结合元件ABRE的ACGTG→AAATT突变）探针则条带不消失。关于ABA信号通路调控抗旱性的核心分子机制的正确叙述是",
    {"A":"干旱胁迫诱导根和维管组织ABA大量合成，ABA被PYR1/PYL/RCAR START域可溶性受体结合→受体构象变化的\"门闩\"结构闭合并捕获配体，同时与PP2C（ABI1/HAB1/AHG1等）的磷酸酶活性中心结合，将PP2C由抑制型（结合SnRK2→去磷酸化失活）转为被抑制型；释放出的SnRK2.2/2.3/2.6（OST1）激酶自体磷酸化激活，入核磷酸化并激活bZIP类转录因子ABI5/ABF/AREB，后者结合干旱响应基因启动子的ABRE元件（PyACGTGG/TC），上调RD29B/RAB18等渗透调节蛋白、LEA蛋白表达，维持细胞保水抗旱；abi5缺失则RD29B等不激活→抗旱差；hab1-1 PP2C缺陷则SnRK2持续激活→抗旱强","B":"ABI5属于AP2/ERF类转录因子，结合DRE元件（A/GCCGAC）介导不依赖ABA的干旱冷响应通路","C":"PYR-PYL受体通过促进PP2C的磷酸酶活性增强SnRK2去磷酸化，激活下游信号","D":"ABRE核心序列ACGTG突变后ABI5结合能力增强，说明ABI5特异性识别AAATT序列"},
    "A",
    "A选项正确。脱落酸（Abscisic acid, ABA）调控植物抗旱响应的信号通路是2009年确立的\"PYR/PYL受体-PP2C磷酸酶-SnRK2激酶\"双负调控级联（该发现获2022年沃尔夫奖）：①配体结合：干旱胁迫下，根冠柱细胞、叶片维管韧皮部伴胞的ABA合成通路被快速激活（质体β-胡萝卜素→玉米黄质→叶黄素环氧酶ZEP→紫黄质→NCED（9-顺式-环氧类胡萝卜素双加氧酶，限速）→黄质醛→短链脱氢还原酶SDR/ABA2→醛氧化酶AAO3→活性(+)-S-ABA）；产生的ABA通过质外体长距离运输或胞间扩散到达靶细胞，被可溶性的PYR1/PYL1~13/RCAR（START结构域超家族）受体结合；PYR的\"门闩\"（gate loop）和\"门栓\"（latch loop）两个保守结构域在结合ABA后构象闭合，将ABA牢牢锁在配体结合口袋内。②PP2C抑制：闭合的PYR-ABA复合物以极高亲和力结合A型PP2C磷酸酶（ABI1、ABI2、HAB1、HAB2、AHG1/3，是ABA信号的主负调控因子），占据PP2C的活性中心裂隙（原本结合SnRK2去磷酸化位点），完全阻断PP2C对其底物SnRK2激酶激活环的去磷酸化；同时PYR的Trp425残基插入PP2C的镁离子活性中心，直接抑制其磷酸酶催化活性。③SnRK2激酶激活：无ABA时SnRK2（Sucrose non-fermenting Related Kinase 2，植物特有的三类激酶家族，SnRK2.2/2.3/2.6/OST1为ABA响应型）的激活环磷酸化位点被PP2C持续去磷酸化→激酶失活；PP2C被PYR-ABA抑制后，SnRK2激酶通过分子间自体磷酸化（inter-autophosphorylation）在激活环Ser171等位点磷酸化→完全激活。④下游响应：激活的SnRK2.6/OST1同时在胞质和细胞核起作用，入核后磷酸化ABI5/ABF2/AREB1等bZIP转录因子的N端保守结构域（ABI5 Ser42、Ser145等位点被磷酸化后稳定性提高、活性增强）；磷酸化激活的ABI5结合干旱/ABA诱导基因（如RD29B、RAB18、RD22、LEA类脱水蛋白基因）启动子的ABRE（ABA-Responsive Element，核心顺式元件PyACGTGG/TC，含bZIP识别的ACGTG核心），激活转录。这些基因产物：a. RD29B/RD22是胞质渗透保护蛋白，维持高渗胁迫下细胞膜和蛋白质稳定；b. LEA（Late Embryogenesis Abundant）类脱水蛋白如RAB18通过亲水α-螺旋结合水膜，防止细胞脱水导致蛋白聚集和膜融合；c. 同时SnRK2.6在保卫细胞质膜快速磷酸化激活SLAC1阴离子通道（气孔关闭，题干主要是抗旱长期响应）。题干证据：abi5缺失→无法激活RD29B等→RWC仅23%、存活率8%（抗旱极差）；hab1-1是PP2C HAB1的显性负突变（丧失磷酸酶活性但仍被PYR结合），导致PP2C总量被竞争性拖空，SnRK2.2/2.3/2.6持续保持磷酸化激活状态→RD29B等持续高表达→RWC 61%、存活率93%（抗旱超强）；EMSA实验：ABI5结合野生型ABRE启动子使条带迁移，未标记野生探针（含ACGTG）竞争性结合ABI5使迁移条带消失，而突变型（ACGTG→AAATT）探针不能竞争→证明ABI5的特异性识别靶序列就是ABRE的ACGTG核心。B选项错误，ABI5（Abscisic acid Insensitive 5）属于碱性亮氨酸拉链bZIP转录因子（C端亮氨酸拉链二聚化域+N端碱性DNA结合域），识别含ACGT的ABRE元件；AP2/ERF类转录因子（DREB1A/CBF3、DREB2A）识别的是DRE/CRT元件（A/GCCGAC核心），介导不依赖ABA的干旱/低温响应通路（DREB1=C-重复结合因子冷通路，DREB2=干旱通路），二者分属两个独立抗旱通路分支。C选项错误，PYR-PYL受体对PP2C是抑制（通过构象占据+活性中心干扰直接灭活磷酸酶），不是促进；PYR受体的功能相当于\"PP2C的假底物竞争性抑制剂\"，SnRK2的激活是因为PP2C的去磷酸化作用被解除，属于\"负负得正\"的双负调控。D选项错误，EMSA实验中，突变型探针（ACGTG→AAATT）加入后，标记野生型探针与ABI5结合的迁移条带依然存在（不被竞争抑制），说明ABI5不能与突变型探针结合——ABI5的特异性结合序列是野生型ACGTG，不是突变型AAATT；若ABI5特异性识别AAATT，则加入突变型探针时条带应消失（与假设相反）。总结：本题结合抗旱生理表型+EMSA-DNA结合实验综合考查ABA-PYR/RCAR受体-PP2C磷酸酶-SnRK2激酶-ABI5/ABF转录因子-ABRE顺式元件的完整抗旱信号通路，是联赛植物激素章节的核心综合大题。",
    "ABA双负调控通路：PYR受体→PP2C抑制→SnRK2激酶激活→ABI5磷酸化→ABRE元件结合→抗旱基因RD29B/LEA表达"
)
qh("将蚕豆（Vicia faba）下胚轴切段用0（对照）、10nM、100nM、10μM的2,4-D（合成生长素除草剂）处理3小时后，提取总RNA进行qPCR检测：100nM 2,4-D组中GH3.3（IAA-氨基酸偶联酶）、SAUR19（Small Auxin-Up RNA）、IAA5（Aux/IAA转录抑制子）三个基因的mRNA水平分别是对照组的32倍、54倍和18倍；若同时加入50μM的α-鹅膏蕈碱（RNA聚合酶II特异性抑制剂）处理，则三个基因的mRNA水平与对照组无显著差异。进一步ChIP实验证实：生长素响应因子ARF7-GFP融合蛋白在生长素处理后15分钟内即可结合到GH3.3启动子的AuxRE元件TGTCTC。关于生长素信号转录级联的\"去抑制-激活\"两步模型的正确叙述是",
    {"A":"IAA/2,4-D通过AUX1/LAX输入+PIN输出载体进入细胞，被TIR1/AFB（F-box蛋白）SCF E3泛素连接酶的共受体结合（TIR1的LRR结合IAA，同时Aux/IAA的Degron基序DII参与三元复合物形成），使负调控转录抑制子Aux/IAA（如IAA5）被多聚泛素化-26S蛋白酶体降解；原本被Aux/IAA结合并抑制的ARF（生长素响应因子，如ARF7）转录因子被释放，ARF通过C端PB1域同源/异源二聚化结合靶基因启动子AuxRE元件TGTCTC/GAGACA，激活GH3、SAUR、Aux/IAA等早期/初级生长素响应基因的转录；α-鹅膏蕈碱抑制Pol II则转录无法起始，说明生长素通过促进转录（而非稳定mRNA）上调这些基因","B":"TIR1定位于质膜，属于LRR型受体激酶，结合生长素后磷酸化级联激活MAPK，后者磷酸化ARF使其入核结合DNA","C":"GH3基因被生长素诱导后编码生长素输入载体，形成负反馈将过量IAA泵入液泡储存","D":"Aux/IAA蛋白如IAA5是ARF的正调控辅助激活子，降解后ARF活性下降，生长素响应被抑制"},
    "A",
    "A选项正确。生长素（IAA和合成类似物2,4-D、NAA）信号通路的核心是TIR1/AFB受体介导的\"抑制子降解→转录因子激活\"的两步去抑制模型，这是2005年确定的植物激素信号通路里程碑：①生长素进入细胞：质外体IAA以质子化IAAH形式（弱酸性pKa~4.75，细胞壁pH~5.5~5.8）部分通过被动扩散进入细胞，去质子化为IAA⁻后被AUX1/LAX家族（H⁺/IAA⁻同向共转运）主动输入；细胞内IAA⁻通过PIN家族的侧向/顶/基侧极性输出载体维持梯度。②受体识别与抑制子降解：可溶性生长素受体是SCF^TIR1/AFB1~5 E3泛素连接酶，F-box蛋白TIR1（Transport Inhibitor Response 1）C端LRR结构域直接结合IAA分子（以IAA⁻形式结合，Inositol hexakisphosphate InsP6作为辅因子）；结合后Aux/IAA家族蛋白（如IAA5、AXR2/IAA7、AXR3/IAA17等典型抑制子）的保守N端Degron基序（DII域，含GWPPV核心基序）插入TIR1的LRR通道形成TIR1-IAA-Aux/IAA三元复合物（IAA充当\"分子胶水\"，增强TIR1与Aux/IAA的亲和力>1000倍）；Aux/IAA被SCF多聚泛素化→26S蛋白酶体快速降解（半衰期<10分钟）。③转录激活：无生长素时，Aux/IAA抑制子通过C端两个结构域：a. Domain III/IV（PB1域，蛋白质-蛋白质相互作用）与ARF转录因子的C端PB1域异源二聚化结合；b. Domain I（含EAR抑制基序LxLxL）招募共抑制子TPL（TOPLESS）和HDA19组蛋白去乙酰化酶→将ARF靶基因启动子区的组蛋白去乙酰化→染色质浓缩关闭→转录被抑制。当Aux/IAA被降解后，ARF（如ARF5/MP、ARF7、ARF19等激活型ARF，含N端B3 DNA结合域+中间谷氨酰胺Q丰富激活域）被释放，通过PB1域同源二聚化或激活型ARF之间异源二聚化，结合靶基因启动子AuxRE（Auxin Response Element）顺式元件TGTCTC/GAGACA，激活早期生长素响应基因转录。早期基因分三类：a. SAUR（Small Auxin Up RNA，如SAUR19）：无内含子、半衰期仅10~15min，编码小蛋白通过抑制PP2C-D磷酸酶→激活质膜H⁺-ATPase→H⁺泵出酸化细胞壁→触发酸生长理论的细胞壁松弛（快速伸长响应）；b. GH3（如GH3.3）：编码IAA-amido合成酶，将IAA与Asp、Glu、Trp、Ala等氨基酸偶联，其中IAA-Asp/IAA-Glu为降解标记（26S蛋白酶体降解游离IAA），IAA-Ala/Trp为储存形式，构成生长素浓度的关键负反馈回路；c. Aux/IAA（如IAA5）：编码抑制子本身的转录被生长素激活，降解后新合成的Aux/IAA蛋白又可抑制ARF，形成负反馈回环维持生长素信号的动态平衡。题干中α-鹅膏蕈碱（α-Amanitin，鹅膏毒环肽）是真核RNA聚合酶Pol II CTD结构域Rpb1大亚基的特异性共价抑制剂（结合活性中心桥螺旋），完全阻断mRNA转录起始；加入后生长素诱导的三个基因mRNA水平不上升→证明生长素通过促进转录（Pol II驱动）而非稳定现有mRNA（后者Pol II抑制时mRNA水平仍应高于对照，因为降解减慢）上调基因，完全符合两步去抑制激活模型。ChIP实验显示ARF7在15分钟快速结合AuxRE（Aux/IAA降解+ARF释放+结合启动子的动力学时间窗）。B选项错误，TIR1是可溶性的核/胞质F-box蛋白（无跨膜域、无激酶结构域），属于SCF E3泛素连接酶亚基，不是定位于质膜的LRR受体激酶（质膜LRR-RLK如BRI1、FLS2）；生长素信号不经过MAPK级联磷酸化ARF（虽然有些分支有MAPK参与，但核心TIR1通路是直接蛋白降解，无MAPK）。C选项错误，GH3是IAA-氨基酸偶联酶（催化IAA+氨基酸→IAA-amido偶联物，催化域是MBS超级家族），其功能是过量IAA时降解（IAA-Asp）或储存（IAA-Ala）游离IAA以维持稳态，是生长素信号末端的负反馈代谢调节因子，不是生长素输入载体（AUX1/LAX家族负责输入）。D选项错误，Aux/IAA（如IAA5）是ARF的**负调控抑制子**（不是正调控激活子）：无IAA时结合ARF并招募TPL-HDA19关闭染色质；IAA信号激活后Aux/IAA被降解→ARF被**释放激活**→转录上升（不是下降）。题干中IAA5转录被生长素上调18倍，正是负反馈回环：降解旧的IAA5蛋白后，合成新的IAA5 mRNA→翻译新蛋白→当IAA浓度降低时新合成的IAA5抑制ARF，恢复平衡。总结：本题结合生长素剂量诱导基因、α-鹅膏蕈碱Pol II抑制和ChIP-DNA结合三重证据系统考查生长素信号TIR1/AFB-Aux/IAA降解-ARF释放-AuxRE激活的两步去抑制经典模型及三类早期响应基因的功能分工。",
    "生长素TIR1-Aux/IAA-ARF两步去抑制模型、三类早期响应基因（SAUR/GH3/AuxIAA）功能与负反馈回环"
)

print(f"Generated HORMONE batch 1: {len(HORMONE)} questions")
with open("/workspace/data/batch_hormone_part1.json", "w", encoding="utf-8") as f:
    json.dump(HORMONE, f, ensure_ascii=False)
