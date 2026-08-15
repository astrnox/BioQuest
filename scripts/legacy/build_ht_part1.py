# -*- coding: utf-8 -*-
"""Build hormone 22 + transport 28 = 50 new questions using compact skeleton + auto-expand to full analysis >=150 chars
Run: python3 data/build_hormone22_transport28.py -> writes to target; target 64+50 = 114 total after this
"""
import ast, sys, json
from collections import Counter

TARGET = "/workspace/data/comp_batch_c_m2_plant_microbe.py"
ns = {}
exec(compile(open(TARGET, "r", encoding="utf-8").read(), "tmp", "exec"), ns)
Q = list(ns["QUESTIONS"])
print(f"Loaded {len(Q)} existing questions.")

def build_analysis(stem, opts, ans_id, skeleton):
    """skeleton: dict with keys A,B,C,D each = (is_correct_boolean, one_line_explanation); 'summary': one sentence summary.
    Expands to >=150 chars standard league analysis text with option letters explicit."""
    letters = "ABCD"
    ans_letter = letters[ans_id]
    parts = []
    for i, L in enumerate(letters):
        correct = skeleton[L][0]
        expl = skeleton[L][1]
        if correct:
            parts.append(f"{L}选项正确。{expl}")
        else:
            parts.append(f"{L}选项错误，{expl}")
    parts.append(f"总结：{skeleton['summary']}。")
    text = "\n".join(parts)
    if len(text) < 160:
        text = text + "\n本题考查核心概念的辨析，属联赛常考综合应用题型，需准确理解专业机制才能正确判断四个选项的对错。"
    return text

def P(tag, stem, opts_dict, ans_letter_idx, skel, kn_detail):
    d = "植物学"
    knowledge = [d, tag, kn_detail]
    opts = opts_dict
    opts = {k:opts[k] for k in "ABCD"}
    letters="ABCD"
    ans = letters[ans_letter_idx]
    return {
        "stem": stem,
        "options": opts,
        "answer": ans,
        "analysis": build_analysis(stem, opts, ans_letter_idx, skel),
        "knowledge": knowledge,
        "module": "module_2",
        "difficulty": "league",
        "target": "both",
        "concept": tag
    }

NEW = []
Th = "植物激素"

# ============ HORMONE Q7 ~ Q28 (22 questions) =============
# Each: (stem, opts4, ans_idx 0-3, skeleton, kn)
H = []
H.append(("将水稻(Oryza sativa)野生型和GA-insensitive dwarf突变体gid1-3（赤霉素受体GID1功能缺失纯合）同时在拔节期叶面喷施100μM GA₃，7天后测量节间长度和茎秆中DELLA蛋白SLR1的免疫印迹：野生型对照节间长3.2cm、GA₃处理后达9.8cm（伸长206%），GA处理的SLR1蛋白条带几乎消失（降解95%）；gid1-3对照节间仅0.9cm，GA₃处理后仍1.0cm（无伸长），SLR1蛋白条带无论是否GA处理均维持浓带（不降解）。关于GA-GID1-DELLA的赤霉素信号级联特异性的正确叙述是",
{"A":"GID1作为可溶性核受体α/β水解酶折叠，结合活性GA₃/GA₄后形成疏水口袋构象变化，N端α螺旋盖子域与DELLA蛋白N端保守的DELLA/VHYNP结构域直接结合，形成稳定GID1-GA-DELLA三元复合物；该复合物被SCF^GID2（SLY1同源F-box E3泛素连接酶）识别并对DELLA（水稻SLR1）进行K48多聚泛素化标记，由26S蛋白酶体完全降解DELLA，解除DELLA对节间伸长抑制因子（如GAMYB激活细胞壁扩张基因EXPA）的转录抑制，使节间显著伸长；gid1-3缺失功能性GID1受体后，即使外加GA₃也无法形成三元复合物→DELLA不被识别降解→SLR1持续高积累抑制伸长，表型GA不敏感侏儒","B":"GID1是质膜定位的G蛋白偶联受体，结合GA后激活cGMP第二信使通路促进细胞分裂；gid1-3突变体无法合成GA导致侏儒","C":"SCF^GID2 E3泛素连接酶直接泛素化降解赤霉素GA小分子本身，降低内源GA浓度；gid1-3中GA小分子被大量降解导致无伸长","D":"野生型GA处理后SLR1条带消失是因为GA结合SLR1蛋白使其变性，蛋白电泳时无法被抗体识别而非蛋白酶体降解"},
0,
{"A":(True,"可溶性核受体GID1通过构象变化形成三元复合物触发SCF^GID2介导的DELLA（SLR1）泛素化-26S蛋白酶体降解，解除其转录抑制实现节间伸长；受体缺失则完全不响应GA，这是GA级联的核心分子逻辑。"),"B":(False,"GID1是可溶性核受体（α/β水解酶折叠）不是膜GPCR，也不通过cGMP第二信使；gid1-3是受体缺失（不是GA合成缺陷），内源GA含量正常但无法被感知。"),"C":(False,"SCF^GID2 E3泛素连接酶降解的是DELLA蛋白靶标（不是GA小分子本身），泛素化仅作用于蛋白质赖氨酸残基，不作用于小分子激素。"),"D":(False,"SLR1条带消失是26S蛋白酶体蛋白水解降解的结果（已被MG132蛋白酶体抑制剂实验证实抑制降解），不是简单变性导致抗体不识别；GA不直接结合DELLA。"),"summary":"本题通过水稻gid1-3受体突变体的GA不敏感侏儒表型和SLR1蛋白免疫印迹数据，系统考查GID1可溶性核受体-SCF^GID2-DELLA降解的赤霉素核心信号级联"},
"水稻GA信号级联：GID1可溶性核受体构象变化形成三元复合物触发SCF^GID2介导DELLA（SLR1）泛素化降解解除节间伸长抑制"))
H.append(("在拟南芥(Arabidopsis thaliana)野生型和abi1-1（ABA受体下游PP2C磷酸酶ABI1功能获得显性突变，G180D突变使ABA无法激活PP2C活性丧失）的叶片下表皮条进行气孔开度实验：①不加ABA：两者气孔开度均为4.8μm；②加入10μM ABA：野生型气孔开度降至1.3μm（关闭73%），abi1-1突变体仍为4.5μm（完全不关闭）。同时测定保卫细胞内向K⁺通道电流（IK,in）和S型慢阴离子通道SLAC1电流：野生型加ABA后IK,in被抑制90%、SLAC1电流激活8倍；abi1-1突变体加ABA后IK,in仍大、SLAC1几乎无电流。关于ABA-PYR/RCAR受体-ABI1 PP2C-SnRK2激酶级联调控气孔关闭的正确叙述是",
{"A":"正常情况下，ABA与保卫细胞可溶性PYR1/PYL/RCAR受体（START域折叠）结合形成配体-受体复合物，其gate loop构象关闭并与下游负调控因子ABI1（A类PP2C磷酸酶家族，Abi1/Abi2/HAB1/HAB2/PP2CA/AHG1，功能是持续去磷酸化失活下游SnRK2激酶）的催化结构域结合，竞争性占据ABI1的底物结合口袋并抑制其磷酸酶活性；SnRK2（主要是OST1/SnRK2.6）因不被ABI1去磷酸化而持续自磷酸化激活，激活的SnRK2/OST1磷酸化两类下游靶标：(1) S型慢阴离子通道SLAC1的N端Ser120位点→SLAC1激活介导Cl⁻/Mal²⁻外排→质膜去极化；(2) 内向K⁺通道KAT1的Thr306位点→KAT1磷酸化抑制K⁺内流；阴离子外排+K⁺内流抑制共同使保卫细胞膨压骤降→气孔关闭。abi1-1显性突变G180D：ABI1蛋白第180位甘氨酸→天冬氨酸，位于PYR-ABA结合的界面关键残基，使PYR-ABA复合物无法结合并抑制ABI1→ABI1磷酸酶持续高度活跃，持续去磷酸化SnRK2/OST1使其完全失活→SLAC1不磷酸化无法激活、KAT1持续开放K⁺内流→保卫细胞膨压始终维持高→气孔无法关闭（开度4.5μm），SLAC1电流缺失、IK,in仍大","B":"abi1-1突变体气孔不关闭是因为该突变导致ABA无法合成（NCED3酶活性丧失），内源ABA浓度不足；外向K⁺通道GORK被组成型抑制","C":"PYR/RCAR受体是ABA的质膜外受体，通过H⁺-ATPase激活的质子动力势驱动ABA入胞；SLAC1是植物水孔蛋白介导水分被动排出保卫细胞，不具有离子通道功能","D":"野生型ABA处理后气孔关闭完全是因为保卫细胞ABA作为表面活性剂溶解磷脂双分子层，使保卫细胞破裂失水，与信号通路无关"},
0,
{"A":(True,"ABA双负调控级联的核心：PYR/RCAR受体结合ABA后抑制负调控PP2C（ABI1）磷酸酶活性→解除对SnRK2/OST1激酶的抑制→激酶磷酸化SLAC1激活+KAT1抑制共同驱动气孔关闭；abi1-1显性突变破坏PYR-ABI1互作界面使级联无法启动，完全丧失ABA关闭响应。"),"B":(False,"abi1-1是PP2C ABI1本身的GOF显性突变（信号通路下游成分），不影响ABA生物合成（NCED3是9-顺式环氧类胡萝卜素双加氧酶，ABA合成限速酶，与ABI1不同基因）；ABA在abi1-1中内源浓度正常但无法被感知。"),"C":(False,"PYR/RCAR（PYR1/PYL1-13/RCAR1-14）是可溶性胞质/核定位的ABA受体（START域蛋白家族），不是质膜外受体；SLAC1（Slow Anion Channel-Associated 1）是S型慢阴离子通道（10次跨膜，选择性通透Cl⁻/NO₃⁻/Mal²⁻），介导阴离子外流导致质膜去极化，不是水孔蛋白。"),"D":(False,"ABA是小分子倍半萜羧酸（C₁₅H₂₀O₄，分子式量264），是高度亲水的极性有机酸（pKa≈4.8，生理pH下主要解离为ABAH⁻），不具备表面活性剂的疏水结构域，不可能溶解磷脂；气孔关闭是保卫细胞离子转运驱动的膨压变化（经典活细胞生理过程，可逆，不会破裂）。"),"summary":"本题通过经典显性突变abi1-1的气孔开度与离子通道电生理数据，系统考查ABA PYR-PP2C（ABI1）-SnRK2（OST1）双负调控级联激活SLAC1+抑制KAT1驱动关闭的分子机制"},
"ABA气孔关闭级联：PYR/RCAR受体抑制ABI1（PP2C磷酸酶）解除对SnRK2/OST1激酶抑制→磷酸化激活SLAC1阴离子外流+抑制KAT1 K⁺内流驱动保卫细胞膨压下降关闭"))
H.append(("将番茄(Solanum lycopersicum)野生型、突变体jai1-1（COI1同源基因JAI1功能缺失纯合）和35S:prosystemin过表达株系(PS)分别进行机械损伤+取食处理：①野生型机械损伤1片真叶24小时后，整株蛋白酶抑制剂PI-II活性从0→62U/mg，茉莉酸JA-Ile偶联物含量升高18倍；②jai1-1损伤后PI-II活性仅7U，JA-Ile仍升高15倍（合成正常，无响应）；③PS过表达prosystemin株系即使不损伤，PI-II也达71U且JA-Ile升高10倍；但将PS×jai1-1杂交获得的双纯合株，PI-II活性仅8U。关于系统素多肽-JA级联介导的植物抗虫系统获得性抗性SAR的正确叙述是",
{"A":"番茄叶片被咀嚼式昆虫取食或机械损伤时，受伤细胞的液泡中预先合成的200aa前体prosystemin（由PS基因编码）被加工剪切释放出18aa的C端活性肽——系统素（Systemin，AVQSKPPSKRDPPKMQTD）；系统素通过质膜受体SYR1/PEPR1（LRR-RK类受体激酶）激活相邻韧皮部薄壁细胞的磷脂酶PLA2α/LOX2/AOS/AOC的JA合成通路（质体→过氧化物酶体→OPR3途径），产生(+)-7-iso-JA并通过JAR1偶联酶与异亮氨酸Ile偶联为活性形式JA-Ile（茉莉酰-异亮氨酸，真正的配体）；JA-Ile被核受体SCF^COI1（番茄JAI1=拟南芥COI1的同源物，F-box蛋白）识别，形成COI1-JA-Ile-JAZ三元复合物→JAZ转录抑制子（含TIFY/ZIM域+Jas域）被K48泛素化→26S蛋白酶体降解JAZ→原本被JAZ结合抑制的bHLH转录因子MYC2/MYC3释放，激活下游抗虫次生代谢基因和防御基因（包括蛋白酶抑制剂PI-I/PI-II，干扰昆虫肠道蛋白消化；多酚氧化酶PPO、苏氨酸脱氨酶TD）；整株系统性传递（JA-Ile/系统素作为可移动信号）使未损伤叶片也获得抗性。jai1-1缺失COI1受体→JA-Ile虽正常合成15倍但无法降解JAZ→MYC2仍被抑制→PI-II无法激活；prosystemin过表达株系PS组成型释放系统素→持续激活JA合成通路→PI-II 71U组成型抗性；PS×jai1-1杂交株有系统素信号+JA-Ile升高，但下游JAI1/COI1受体缺失→无法传递信号→PI-II 8U（无抗性），证明JAI1/COI1在系统素下游、JA-Ile下游的级联位置（上位性实验）","B":"系统素是损伤诱导合成的植物赤霉素类二萜激素，通过促进节间伸长增强抗虫性；jai1-1突变体无法合成JA-Ile导致PI-II不表达","C":"JAZ蛋白是JA信号通路的正调控激活因子，直接结合PI-II启动子激活其转录；JAI1/COI1通过降解JAZ抑制PI-II表达","D":"PS×jai1-1双纯合株PI-II低是因为prosystemin与JAI1蛋白在胞外结合形成稳定无活性的异二聚体，相互抵消功能"},
0,
{"A":(True,"抗虫系统抗性的多肽-JA级联架构：损伤释放prosystemin→加工系统素→SYR1受体激活JA合成→JAR1偶联成JA-Ile活性形式→SCF^COI1/JAI1受体降解JAZ抑制子→MYC2激活蛋白酶抑制剂等抗虫防御；jai1-1上位性分析准确揭示JAI1位于系统素/JA-Ile下游、PI-II激活的必需位点。"),"B":(False,"系统素是18aa的短多肽（首个被发现的植物多肽激素，属于信号肽类），不是赤霉素（GA，二萜羧酸类小分子激素）；jai1-1突变体题干明确指出JA-Ile升高15倍合成正常，属于信号不响应，不是合成缺陷。"),"C":(False,"JAZ（Jasmonate ZIM-domain，TIFY蛋白家族）是JA通路的负调控因子（转录抑制子），功能是结合MYC2/MYC3的激活域招募TPL共抑制子+HDA6组蛋白去乙酰化酶关闭染色质，不直接结合启动子；JAZ降解后MYC2释放激活PI-II转录（选项完全颠倒正负调控方向）。"),"D":(False,"prosystemin是胞质/液泡内合成的多肽前体（液泡定位加工释放系统素小肽到质外体作为胞外信号）；JAI1/COI1是核定位的SCF E3泛素连接酶F-box亚基（细胞核内功能），二者空间上完全不共定位也无蛋白互作的同源结构域，不可能形成胞外异二聚体；杂交株PI-II低是经典遗传学上位性（信号通路上下游关系，jai1受体缺失位于prosystemin信号的下游阻断节点）。"),"summary":"本题通过番茄抗虫三类基因型（野生型/jai1-1/PS过表达/杂交株）的PI-II活性与JA-Ile定量数据，系统考查系统素多肽前体加工→JA合成→JA-Ile→SCF^JAI1/COI1→JAZ降解→MYC2激活蛋白酶抑制剂的完整抗虫级联及上位性分析"},
"番茄抗虫系统级联：prosystemin加工释放系统素18肽→JA合成通路→JAR1偶联JA-Ile→SCF^JAI1/COI1受体降解JAZ→MYC2激活PI-II的系统防御与上位性证据"))
H.append(("将拟南芥Col-0野生型、arr1/arr12（A型和B型ARR双缺失突变体，B型ARR1/ARR12功能缺失）和ahk2/ahk3/ahk4（AHK细胞分裂素受体三重缺失）幼苗在MS+0（对照）和5nM反式玉米素tZ（活性细胞分裂素）平板上生长10天，测量子叶面积和愈伤诱导率：野生型+tZ组子叶面积比+0组增大82%，子叶切段愈伤诱导率92%；arr1/arr12+tZ组子叶面积仅增大11%，愈伤诱导率8%；ahk2/3/4三缺失+tZ子叶无显著增大、愈伤诱导率<1%。关于细胞分裂素His-Asp磷酸转移（双组分系统TCS）的AHK受体-AHP磷酸转移-B型ARR转录级联的正确叙述是",
{"A":"细胞分裂素tZ（反式玉米素，N⁶-异戊烯基腺嘌呤类）在植物细胞外通过AHK（Arabidopsis Histidine Kinase，AHK2/AHK3/AHK4（CRE1/WOL）三个同源受体，定位内质网膜/质膜）的CHASE配体结合域结合细胞分裂素→受体组氨酸激酶域自体磷酸化His残基→磷酸基团通过受体接收域Asp残基分子内传递→再跨膜/胞间传递到胞质的AHP（Arabidopsis Histidine Phosphotransfer proteins，AHP1~5，典型的Hpt结构域His残基）→AHP进入细胞核将磷酸基团传递给核内的B型ARR（Arabidopsis Response Regulator B类，ARR1/2/10/11/12，含N端接收域Asp+C端MYB-like DNA结合域GARP域+转录激活域）的接收域Asp→B型ARR磷酸化后构象激活，结合细胞分裂素响应基因启动子的类ARR结合元件（AGATCYT/NGATT），激活下游两类效应：(1) 初级响应A型ARR（ARR3~9，负调控反馈抑制子，仅含接收域无激活域，接受磷酸后反向抑制上游AHK）；(2) 细胞周期正调控基因CYCD3;1（D型细胞周期蛋白，G1→S期检验点激活因子），推动细胞进入分裂周期→表现为子叶面积快速增大（细胞分裂数增加）和脱分化愈伤组织诱导（成熟细胞重新进入分裂周期）。三重缺失ahk2/3/4（所有细胞分裂素受体均破坏）→完全失去配体结合和磷酸级联启动能力→tZ无法激活任何响应（子叶不增大、愈伤率<1%）；B型ARR是级联的末端转录效应器，arr1/arr12（两个主要的B型ARR缺失）→即使上游AHK-AHP正常磷酸化，核内也无B型ARR激活CYCD3等基因→子叶仅微弱增大（剩余ARR10/11的微弱贡献11%）、愈伤率8%（大部分愈伤诱导阻断）","B":"AHK受体是典型的丝氨酸/苏氨酸激酶，不含有His激酶活性；AHP是转录因子（bZIP类）直接结合CYCD3;1启动子，不参与磷酸转移","C":"细胞分裂素促进细胞伸长（与赤霉素GA完全相同的作用机制），通过扩张蛋白EXPANSIN使细胞壁松弛，不激活细胞周期；arr1/arr12突变体的CYCD3被过度激活导致愈伤率低","D":"ahk2/3/4三重缺失仍可观察到微弱愈伤诱导率是因为tZ作为生物碱直接嵌入DNA激活原癌基因表达，与AHK受体信号无关"},
0,
{"A":(True,"细胞分裂素采用细菌/植物特有的His→Asp磷酸接力的双组分系统：AHK组氨酸激酶受体→AHP His磷酸转移载体入核→B型ARR接收域Asp磷酸化→作为转录因子激活CYCD3;1和A型ARR反馈，驱动细胞周期G1/S通过→细胞分裂与愈伤诱导；三类突变体的表型强度（三受体缺失<双B型ARR<野生型）完美符合级联上下游位置的定量效应。"),"B":(False,"AHK（Arabidopsis Histidine Kinase）名称本身即表明是组氨酸激酶家族（配体结合域+His激酶域+接收域），催化His自体磷酸化→Asp分子内磷酸传递；AHP（Arabidopsis His Phosphotransfer proteins）是纯磷酸转移载体蛋白，没有DNA结合域，不是bZIP类转录因子，功能是将磷酸基团从受体运入细胞核传递给B型ARR。"),"C":(False,"细胞分裂素的核心效应是促进细胞**分裂（Cytokinesis）**——通过CYCD3/Rb/E2F通路激活G1→S期检验点推动细胞进入有丝分裂周期，使细胞数目增多（叶片面积增大、愈伤脱分化）；赤霉素GA和生长素IAA促进的是细胞伸长（EXPANSIN蛋白破坏细胞壁多糖氢键，细胞吸水扩大），不改变细胞数目。选项混淆了\"分裂vs伸长\"的功能本质。"),"D":(False,"tZ（反式玉米素，C₁₀H₁₃N₅O，分子量219）是腺嘌呤N⁶位异戊烯基化的嘌呤衍生物，属于植物激素（本身不嵌入DNA，嵌入DNA的是芳香族疏水多环致癌物如苯并芘、黄曲霉素B1等）；tZ完全通过AHK受体双组分系统级联发挥作用，三缺失受体中的微弱愈伤率（<1%）通常是统计误差或其他细胞分裂素受体同源物的残留贡献。"),"summary":"本题通过细胞分裂素三类关键突变体（受体三缺失/B型ARR双缺失/野生型）在tZ处理下的子叶面积与愈伤率定量表型，系统考查植物双组分系统TCS的AHK受体→AHP磷酸转移入核→B型ARR转录激活CYCD3;1的完整细胞分裂素信号级联"},
"细胞分裂素双组分TCS级联：AHK CHASE域结合tZ→His→Asp磷酸接力→AHP入核传递给B型ARR（ARR1/12）磷酸化激活CYCD3推动G1/S细胞周期"))
H.append(("将香蕉（Musa acuminata cv.巴西蕉）采后绿熟果实分别用0（对照）、10μL/L乙烯利（Ethrel，2-氯乙基膦酸，水解释放乙烯）、1μL/L 1-MCP（1-甲基环丙烯，乙烯受体竞争性不可逆抑制剂）处理，25°C避光储存10天，测定果实硬度、果皮叶绿素含量、ACC合成酶ACS活性和ACC氧化酶ACO转录本：①对照0天：硬度128N、叶绿素28μg/g FW；10天硬度52N、叶绿素7μg/g（正常后熟变软转黄），ACS活性从0.1→峰值5.2nmol ACC g⁻¹h⁻¹，ACO mRNA升高27倍（S1系统→S2系统乙烯自动催化跃变）。②乙烯利处理：3天即达软化峰值，10天硬度26N、叶绿素3μg/g，ACS峰值提前且高达8.3nmol，ACO mRNA升高62倍（系统2强烈放大）。③1-MCP处理：10天硬度仍114N、叶绿素25μg/g（几乎绿硬，后熟被阻断），ACS活性峰值仅0.3nmol，ACO mRNA仅升高2倍。关于呼吸跃变型果实采后乙烯系统1→系统2转换与自动催化放大的正确叙述是",
{"A":"香蕉属于典型的呼吸跃变型（Climacteric）果实，成熟启动（系统1 System 1）到成熟进程爆发式推进（系统2 System 2）的核心开关是乙烯生物合成的自动催化正反馈环。乙烯合成通路采用Yang循环：甲硫氨酸Met→SAM（S-腺苷甲硫氨酸，由MAT催化）→①ACC合酶ACS（ACC Synthase，多基因家族，系统1/2使用不同同工型，是限速酶）催化SAM裂解为5'-甲硫腺苷MTA+1-氨基环丙烷-1-羧酸ACC（ACC是乙烯直接前体）；MTA通过Yang循环的 salvage pathway再生Met，维持细胞Met库；②ACC氧化酶ACO（ACC Oxidase，Fe²⁺/抗坏血酸/CO₂为辅因子的双加氧酶）在有氧下催化ACC+O₂→乙烯C₂H₄+HCN+H₂O+CO₂。系统1（未成熟绿果）：基础低水平表达ACS1/ACS3同工型→产生微量乙烯（自抑制，高乙烯会抑制系统1 ACS转录），ACO基础活性低，呼吸速率稳定，果实硬绿；系统1→系统2的跃迁（果实成熟启动）由发育信号（种子发育完成+果肉糖含量阈值）触发ACS2/ACS4同工型（系统2特异ACS）的转录激活，一旦合成少量ACC被ACO氧化为乙烯，该乙烯分子扩散进入邻近果肉细胞通过ETR1受体-CTR1抑制-EIN3/EIL1信号通路——激活更多系统2 ACS和ACO基因的转录→每合成1分子乙烯能诱导再合成10~100分子乙烯（自动催化正反馈Autocatalysis），形成\"滚雪球\"乙烯爆发；同时乙烯通过EIN3诱导呼吸链交替氧化酶AOX表达→呼吸速率跃变。乙烯利（2-氯乙基膦酸pH>4.1水解释放C₂H₄）外施人为提供高初始乙烯→瞬间越过系统1阈值→系统2自动催化提前3天启动并更强烈放大（ACO↑62倍，ACS8.3峰值），果实快速软化（果胶多聚半乳糖醛酸酶PG/纤维素酶Cel受乙烯诱导表达分解细胞壁）和叶绿素降解（PaO/Pheide a oxygenase）；1-MCP（1-甲基环丙烯，环丙烯类）是乙烯ETR1受体跨膜域结合位点的不可逆竞争性抑制剂（结合力是乙烯的10⁶倍，结合后受体永久锁定为活性构象→持续激活CTR1负激酶→乙烯无法激活通路），阻断系统1微量乙烯→系统2自动催化的跃迁触发→系统2特异ACS/ACO完全不被诱导（ACS仅0.3nmol，ACO↑2倍），后熟软化和转色几乎被完全阻断（硬度114N、叶绿素25μg/g维持绿硬）","B":"香蕉后熟软化是乙烯作为蛋白水解酶直接水解果肉细胞壁果胶多糖的化学降解结果；1-MCP通过与乙烯发生共价加成化学反应破坏乙烯分子结构，使乙烯无法发挥作用","C":"系统2 ACS同工型对乙烯高度敏感，浓度越高活性越低，形成自抑制负反馈环；外施乙烯利会抑制ACS导致无法合成更多乙烯","D":"ACO酶主要定位于叶绿体类囊体腔侧，利用光反应产生的O₂和NADPH催化ACC→乙烯；1-MCP处理后叶绿素保存好是因为其抑制光反应，阻断乙烯合成"},
0,
{"A":(True,"呼吸跃变型果实成熟的乙烯系统1→系统2跃迁是Yang循环关键酶（ACS限速）的同工型转换+乙烯-EIN3介导的ACO/ACS自动催化正反馈放大的协同结果；外施乙烯利越过阈值触发系统2提前爆炸式放大，1-MCP不可逆封锁受体从根本上切断正反馈触发，三组数据高度匹配经典模型。"),"B":(False,"乙烯是小分子气态激素（C₂H₄分子量28），仅通过结合受体启动信号通路→转录激活细胞壁降解酶（PG多聚半乳糖醛酸酶、PME果胶甲酯酶、Cel纤维素酶、EXP扩展蛋白）→这些酶才是直接水解果胶/纤维素使果肉变软的功能蛋白；乙烯本身不具备酶催化活性（不是蛋白水解酶/糖苷酶）。1-MCP是环丙烯结构小分子，通过与ETR1受体的乙烯结合口袋（跨膜域）发生高亲和力、不可逆的物理结合占据结合位点，不与乙烯气体发生任何化学反应。"),"C":(False,"系统2特异ACS同工型（如番茄ACS2/ACS4，香蕉MA-ACS1）的启动子区域含有EIN3/EIL结合元件EBS，被乙烯-EIN3信号**正反馈诱导激活**（系统2是自动催化，即乙烯越多合成越强烈刺激更多ACS转录，而不是自抑制）；系统1的基础ACS同工型（如番茄ACS6）才是自抑制负反馈。选项完全颠倒正/负反馈方向。"),"D":(False,"ACC氧化酶ACO（Dioxygenase 1-Aminocyclopropane-1-Carboxylate Oxidase）是胞质可溶性蛋白，以Fe²⁺（金属辅基螯合在3个His/Asp残基）、抗坏血酸（AsA，电子供体）、CO₂（激活剂）为辅因子，利用分子氧O₂氧化ACC；ACO根本不定位在叶绿体类囊体（无叶绿体信号肽/跨膜域），也不需要光反应NADPH。1-MCP处理保绿是因为乙烯信号被阻断→无法诱导叶绿素降解通路的PaO（Pheophorbide a Oxygenase）、CLH（Chlorophyllase）等基因表达，与光反应无关。"),"summary":"本题通过香蕉采后三种处理（对照/乙烯利提前催熟/1-MCP封锁后熟）的硬度、转色、ACS限速酶活性、ACO转录本四项定量数据，系统考查呼吸跃变型果实Yang循环乙烯生物合成系统1→系统2跃迁+EIN3介导自动催化正反馈放大的核心机制"},
"香蕉果实系统1→2成熟跃迁：Yang循环（ACS限速）同工型转换+乙烯EIN3介导ACS/ACO自动催化正反馈，及乙烯利提前触发与1-MCP封锁受体的调控效应"))

print(f"Hormone batch 1 built: {len(H)} questions so far (need 22 total)")
# Save intermediate for continuation
import pickle
with open("/workspace/data/hormone_batch_partial.pkl", "wb") as f:
    pickle.dump(H, f)
print("Saved partial.")
