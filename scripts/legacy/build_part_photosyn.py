# -*- coding: utf-8 -*-
# 光合作用 29题
def sanitize(s):
    s = s.replace("\u207a", "+").replace("\u207b", "-")
    s = s.replace("\uff08", "(").replace("\uff09", ")")
    s = s.replace("\uff0c", ",").replace("\uff1a", ":")
    s = s.replace("\u3001", ",").replace("\u2014", "-")
    return s

def P(tag, stem, opts, ans, analysis, kn):
    stem = sanitize(stem); opts = {k: sanitize(v) for k,v in opts.items()}
    analysis = sanitize(analysis); kn = sanitize(kn)
    return {"stem":stem,"options":opts,"answer":ans,"analysis":analysis,
            "knowledge":["植物学",tag,kn],"module":"module_2","difficulty":"league",
            "target":"both","concept":tag}

def build_A(stem, opts, ae, be, ce, de, summ, kn):
    analysis = (f"A选项正确。{ae}\nB选项错误，{be}\n"
                f"C选项错误，{ce}\nD选项错误，{de}\n"
                f"总结：{summ}。本题考查联赛光合作用核心分子机制与经典实验证据，是综合性极强的分析题型，要求准确掌握光合电子传递、碳同化各途径的细胞区室化与能量计量关系。")
    return P("光合作用", stem, {"A":opts[0],"B":opts[1],"C":opts[2],"D":opts[3]}, "A", analysis, kn)

def build_B(stem, opts, ae, be, ce, de, summ, kn):
    analysis = (f"A选项错误，{ae}\nB选项正确。{be}\n"
                f"C选项错误，{ce}\nD选项错误，{de}\n"
                f"总结：{summ}。本题考查联赛光合作用核心分子机制与经典实验证据，是综合性极强的分析题型，要求准确掌握光合电子传递、碳同化各途径的细胞区室化与能量计量关系。")
    return P("光合作用", stem, {"A":opts[0],"B":opts[1],"C":opts[2],"D":opts[3]}, "B", analysis, kn)

def build_C(stem, opts, ae, be, ce, de, summ, kn):
    analysis = (f"A选项错误，{ae}\nB选项错误，{be}\n"
                f"C选项正确。{ce}\nD选项错误，{de}\n"
                f"总结：{summ}。本题考查联赛光合作用核心分子机制与经典实验证据，是综合性极强的分析题型，要求准确掌握光合电子传递、碳同化各途径的细胞区室化与能量计量关系。")
    return P("光合作用", stem, {"A":opts[0],"B":opts[1],"C":opts[2],"D":opts[3]}, "C", analysis, kn)

def build_D(stem, opts, ae, be, ce, de, summ, kn):
    analysis = (f"A选项错误，{ae}\nB选项错误，{be}\n"
                f"C选项错误，{ce}\nD选项正确。{de}\n"
                f"总结：{summ}。本题考查联赛光合作用核心分子机制与经典实验证据，是综合性极强的分析题型，要求准确掌握光合电子传递、碳同化各途径的细胞区室化与能量计量关系。")
    return P("光合作用", stem, {"A":opts[0],"B":opts[1],"C":opts[2],"D":opts[3]}, "D", analysis, kn)

def phq(idx, stem, opts, ans_id, kn, ae, be, ce, de, summ):
    if ans_id == 0: return build_A(stem, opts, ae, be, ce, de, summ, kn)
    if ans_id == 1: return build_B(stem, opts, ae, be, ce, de, summ, kn)
    if ans_id == 2: return build_C(stem, opts, ae, be, ce, de, summ, kn)
    return build_D(stem, opts, ae, be, ce, de, summ, kn)

GUANGHE = []

# Q1
GUANGHE.append(phq(1,
    "分离菠菜(Spinacia oleracea)叶肉细胞完整叶绿体，用蔗糖密度梯度离心纯化类囊体膜和基质组分，分别加入反应体系测定Hill反应活性：在类囊体膜悬浮液中加入人工电子受体铁氰化钾(K3Fe(CN)6)和二氯苯酚(DCPIP)，照光后在580nm波长下检测到DCPIP的还原(蓝色→无色)和O2释放；基质组分中无Hill反应活性。再向该体系加入电子传递抑制剂DCMU(3-(3,4-二氯苯基)-1,1-二甲基脲)，发现即使在强光下DCPIP还原和O2释放均被完全抑制；但若向DCMU抑制的体系中加入人工电子供体DPC(二苯氨基脲)+亚甲基蓝，则DCPIP还原重新恢复但不再有O2释放。关于上述实验的机制解释，正确的是",
    ["Hill反应证明光合作用的O2来自水的光解而非CO2，光反应完全发生在类囊体膜上；DCMU结合PSII的QB(次级醌电子受体)位点阻断从QA到QB的电子传递，从而阻断水的光解(O2释放)和后续电子流；DPC在PSII氧化侧(放氧复合体OEC内侧)直接向PSII反应中心P680提供电子(绕过OEC)，因此不依赖水的分解即可向电子传递链后续提供电子使DCPIP被还原，故无O2释放",
     "Hill反应的O2来自CO2的分解，光反应在叶绿体基质中进行；DCMU抑制PSI的P700氧化",
     "DCPIP还原是DCMU作为还原剂直接还原的结果，与光合电子传递无关",
     "DPC是通过直接还原NADP+为NADPH驱动后续电子流的，O2不释放是因为DPC与O2结合将其消耗"],
    0,
    "Hill反应机制与DCMU(QB位点)、DPC(PSII电子供体旁路)的作用位点",
    "Robin Hill于1937年发现Hill反应：分离的叶绿体在光下、有合适的人工电子受体(非NADP+)存在时，即使不供应CO2也能释放O2并还原电子受体，直接证明O2来自水的分解(而非CO2)，将光合作用分为光反应(类囊体膜，水分解+电子传递+ATP/NADPH生成)和碳反应(基质，CO2固定)。DCMU(敌草隆)是苯脲类除草剂，它高亲和力结合到PSII反应中心D1蛋白上的QB(质体醌次级电子受体)结合口袋，竞争性阻止质体醌PQ与D1结合；PSII电子传递链为：水→OEC(Mn4CaO5簇)→TyrZ(D1-Y161)→P680→Pheo(去镁叶绿素)→QA(固定醌)→QB(可交换醌)→PQ池；DCMU阻断QA到QB的传递后，P680+无法有效被电子还原，反过来OEC的电子无法传递给P680+，水的分解停止，故O2释放和DCPIP还原(接受PQ→Cyt b6f→PC→PSI的电子)均停止。DPC(二苯氨基脲)是人工电子供体，在PSII的氧化侧(腔内一侧)绕过OEC(放氧复合体)，直接将电子提供给P680+或TyrZ+，使PSII反应中心恢复活性；但由于绕过了分解水的OEC，水无法被氧化分解，因此不释放O2；电子仍可通过QA→QB→PQ→后续链传递到DCPIP使其还原。",
    "14C同位素实验(卡尔文)和18O示踪(Ruben和Kamen 1941用H218O/18O2实验)已证明O2来自H2O，CO2的O进入C3化合物和产物水；基质是碳反应场所不含类囊体电子传递链组分，无Hill活性。",
    "DCMU在1μM浓度下即可完全抑制光合电子传递，自身不被氧化还原，不是还原剂；DCPIP的还原严格依赖光下电子传递链的电子流动。",
    "DPC的作用位点在PSII放氧复合体的内侧(氧化侧)向P680+供电子，不是在PSI侧直接还原NADP+；DPC是电子供体不是O2清除剂，DPC不含与O2反应的基团。",
    "Hill反应的证据意义、DCMU结合PSII QB位点阻断电子传递、DPC绕过OEC供电子是光合电子传递链作用位点经典实验的联赛核心考点。"))

GUANGHE.append(phq(2,
    "在玉米(Zea mays)C4光合叶片中，利用免疫金标定位在透射电镜下观察Rubisco(核酮糖-1,5-二磷酸羧化酶/加氧酶)和PEPC(磷酸烯醇式丙酮酸羧化酶)的细胞内分布：发现在维管束鞘细胞(BSC)的叶绿体基质中Rubisco金颗粒密度极高、而叶肉细胞(MC)的细胞质和叶绿体中几乎检测不到Rubisco信号；相反，PEPC的金颗粒在MC的细胞质(胞质溶胶)中密集分布、BSC中几乎无PEPC信号。进一步分离两类细胞的完整叶绿体测定酶活和CO2补偿点：BSC叶绿体Rubisco活化酶(RCA)活性高、在无外加NaHCO3时CO2补偿点为3-5μmol/mol；MC叶绿体Rubisco活性几乎为零。关于C4光合Rubisco区室化的叙述，正确的是",
    ["Rubisco之所以只定位于BSC叶绿体基质，是为了利用C4途径在BSC中浓缩CO2(胞内CO2浓度可达200-1000μM)，在Rubisco周围创造高CO2/O2比值的微环境，显著抑制Rubisco的加氧酶活性(光呼吸)；PEPC定位于MC细胞质中进行初固定，其对HCO3-的Km约2μM(亲和力远高于Rubisco对CO2的Km约20μM)，在低大气CO2(约400ppm/15μM液相)条件下即可高效捕获HCO3-合成C4二羧酸",
     "Rubisco和PEPC都定位于叶绿体基质中，玉米的免疫金标实验结果不可靠；C4途径只是光呼吸的旁路",
     "BSC叶绿体不含Rubisco活化酶(RCA)，因此Rubisco始终保持失活状态，由PEPC代替其功能进行CO2固定",
     "C4植物的CO2浓缩机制是通过BSC叶绿体主动运输CO2气体分子实现的，不需要PEPC的初固定步骤"],
    0,
    "C4光合Rubisco/PEPC的细胞区室化及CO2浓缩机制(MC初固定→BSC卡尔文循环)",
    "C4光合途径(Hatch-Slack途径，1966年Hatch和Slack在甘蔗/玉米中发现)的核心是空间分隔的CO2浓缩机制(CCM)：①初固定在叶肉细胞(MC)的胞质溶胶中进行，由磷酸烯醇式丙酮酸羧化酶(PEPC)催化：HCO3- (溶于水的CO2水合形式，由碳酸酐酶CA催化CO2+H2O→HCO3-快速生成) + PEP(磷酸烯醇式丙酮酸，3C) → 草酰乙酸OAA(4C) + Pi；PEPC对HCO3-的Km极低(约2μM)，在大气CO2浓度约400ppm(液相溶解约10-15μM)时已达饱和，可高效捕获HCO3-；PEPC不与O2发生加氧反应(无竞争抑制问题)。②OAA在MC叶绿体或胞质中转化为苹果酸(Malate，苹果酸脱氢酶MDH催化OAA+NADPH→Malate+NADP+)或天冬氨酸(Asp，天冬氨酸氨基转移酶催化)，经MC与BSC之间丰富的胞间连丝(共质体通道)运输到维管束鞘细胞(BSC)。③在BSC中，Malate在BSC叶绿体的NADP-苹果酸酶(NADP-ME)催化下脱羧：Malate + NADP+ → 丙酮酸(Pyr) + CO2 + NADPH；释放的CO2在BSC叶绿体基质中被浓缩(因为BSC细胞壁厚、对气体扩散阻力大，CO2不易漏出)，浓度可达200-1000μM(约大气的10-50倍)，CO2/O2比值极高。④Rubisco(同时具有羧化酶和加氧酶双重活性，CO2和O2竞争同一活性位点)仅定位于BSC叶绿体基质中，在高CO2浓度下其羧化反应占绝对优势，加氧酶活性(RuBP+O2→磷酸乙醇酸→光呼吸)被抑制到几乎可以忽略的水平(光呼吸仅C3植物的2-5%)；丙酮酸则运回MC在叶绿体中由丙酮酸磷酸双激酶PPDK催化：Pyr+ATP+Pi → PEP+AMP+PPi，重新生成PEP完成循环。Rubisco活化酶(RCA，Rubisco Activase)是AAA+家族ATP水解酶，在BSC叶绿体中通过ATP水解移除Rubisco活性位点上的抑制剂(如RuBP的错误结合产物、2-羧基阿拉伯糖醇-1-磷酸CA1P)，将钝化的Rubisco转化为活性形式；C3植物Rubisco的活化程度受光照-温度-RCA含量强烈限制(午后光合下调RCA失活)，也是高温光合下调的原因之一。",
    "免疫金标是细胞生物学定位蛋白质分布的金标准技术，灵敏度可达单分子水平；已有大量文献(包括玉米、高粱、甘蔗的经典研究)明确证明Rubisco仅存在于BSC叶绿体中、PEPC仅在MC胞质。C4不是光呼吸旁路，而是完全改变了CO2初固定的酶和细胞位置。",
    "实验数据明确显示BSC叶绿体RCA活性高；RCA正是维持Rubisco活性所必需的——玉米BSC中Rubisco必须处于高活性状态才能高效进行卡尔文循环。PEPC与Rubisco功能完全不同：PEPC只进行不可逆的β-羧化，产物OAA进入TCA或C4循环，不能进行卡尔文循环(卡尔文循环第一步是RuBP+CO2→2分子3PGA，必须Rubisco)。",
    "CO2是疏水性小分子气体，在脂质双层中可自由扩散(没有已知的CO2主动转运体)，C4植物的CO2浓缩机制不是\"主动运输CO2分子\"，而是通过PEPC在MC中固定HCO3-为C4二羧酸(主动消耗PEP高能磷酸键)，将C4化合物运输到BSC后再\"定点脱羧\"释放CO2，相当于以C4有机酸为载体将CO2从MC\"搬运\"到BSC并释放，实现浓缩。",
    "C4途径的细胞区室化(MC/BSC)、PEPC初固定+Rubisco终固定、C4二羧酸转运脱羧实现CO2浓缩是联赛光合C3/C4比较的核心考点。"))

GUANGHE.append(phq(3,
    "将光合电子传递链各组分的氧化还原电位(E0')按标准值测定：P680+/P680*对为+1.1V/-0.7V(激发态)、P700+/P700*为+0.4V/-1.2V，去镁叶绿素Pheo约-0.6V，QA(质体醌)约-0.05V，PQH2/PQ约+0.1V，Cyt f约+0.35V，质体蓝素PC约+0.36V，铁氧还蛋白Fd约-0.45V，NADP+/NADPH约-0.32V，H2O/O2对为+0.82V，最终每传递2个电子从H2O到NADP+共生成约1.0个ATP和1.0个NADPH(线性电子传递)。关于光合电子传递链的能量学，正确的是",
    ["光合电子传递的能量方向是从低电位(强还原剂，E负)到高电位(强氧化剂，E正)自发进行，放能步骤(如QB→PQ→Cyt b6f、PC→P700*)驱动质子跨膜泵入类囊体腔建立质子动力势；两个光反应中心(PSII和PSI)分别吸收光能将弱氧化剂(P680+1.1V仍强于水+0.82V，可氧化水)和弱还原剂(P700-1.2V强于NADP+-0.32V，可还原NADP+)提升为强还原剂，完成热力学上不可能的逆电位梯度电子传递",
     "电子传递方向是从高电位流向低电位，全部步骤自发进行不需要光能输入，光照只是加热类囊体膜加快反应速率",
     "PSII的主要作用是直接将NADP+还原为NADPH，PSI的主要作用是氧化水分解产生O2",
     "ATP/NADPH=1的产率说明每固定1分子CO2(需要3ATP+2NADPH)只需要2个光量子即可完成"],
    0,
    "光合电子传递链氧化还原电位顺序与光反应中心的能量输入机制",
    "光合电子传递链(Z-scheme)的热力学逻辑与呼吸链相反：呼吸链电子从强还原剂(NADH, E=-0.32V)自发流向强氧化剂(O2, E=+0.82V)，释放的能量泵出质子；光合电子传递则要把弱还原剂(水, E=+0.82V，很难给出电子)的电子传递给弱氧化剂(NADP+, E=-0.32V，很难接受电子)，整个过程是逆氧化还原电位梯度的、热力学上ΔG>0的非自发反应，必须由两个光反应中心吸收光能驱动电子\"上坡\"。Z-scheme的电位顺序(电子流动路径，从左到右)：H2O(E=+0.82V) →(PSII光解，P680被光激发为P680* E=-0.7V)→ P680+ (E=+1.1V，唯一能氧化水的生物氧化剂) → Pheo(-0.6V) → QA(-0.05V) → QB → PQ/PQH2(+0.1V) → Cyt b6f复合物 → Cyt f(+0.35V) → PC(+0.36V) →(PSI光激发，P700→P700* E=-1.2V)→ P700+ (+0.4V) → Fd(-0.45V) → FNR → NADP+(-0.32V)→ NADPH。其中：①PSII光激发：基态P680(E约+0.5V)吸收680nm红光后跃迁到激发单重态P680*，此时P680*的E0'约为-0.7V(变为极强的还原剂)，立即将电子传给Pheo；失去电子的P680+(E=+1.1V，生物体系中最强的氧化剂)通过TyrZ夺取Mn簇上的电子，最终氧化水分解为O2、H+和电子。②两次\"放能下坡\"：电子从Pheo(-0.6V)→QA→PQ→Cyt b6f→PC(+0.36V)，这段电位差约0.9V，是自发放能过程，其中Cyt b6f复合物利用Q循环每2个电子共泵出4个H+从基质到腔侧(加上水光解在腔内释放4个H+，每2e-总腔侧增加约6H+)，建立跨膜质子梯度(ΔpH≈3，腔内pH≈5，基质pH≈8)。③PSI光激发：电子到达PC后，PSI反应中心P700吸收700nm远红光被激发为P700*(E≈-1.2V，生物体系中最强的可溶性还原剂)，将电子传给Fd(-0.45V)再经Fd-NADP+还原酶(FNR)传递给NADP+生成NADPH(因为P700*的-1.2V远强于NADP+的-0.32V，还原是自发的)。④线性电子传递每2e-最终从H2O→NADPH，共积累质子动力势产生约1ATP(实际值1.0-1.5)和1NADPH；而卡尔文循环固定1分子CO2需要3ATP+2NADPH，ATP/NADPH的比例缺口由PSI的循环电子传递(仅PSI工作，电子Fd→PQ→Cyt b6f→PC→P700，只产ATP不产NADPH)补充。",
    "光合电子传递整体是逆电位梯度(水+0.82V → NADPH -0.32V，电子从高电位流向低电位是\"上坡\")，需要两个光反应中心吸收光能各推一次才能完成；全部自发无需光能的是呼吸链(电子从低电位NADH→高电位O2)。光照的能量被叶绿素分子的电子跃迁捕获(一个680nm光子能量≈1.82eV)，不是简单加热。",
    "PSII功能：氧化水放O2 + 将电子传给PQ；PSI功能：将电子从PC传递到Fd还原NADP+。二者功能完全不同，此选项颠倒。",
    "卡尔文循环固定1分子CO2的能量计量是3ATP + 2NADPH；线性电子传递每传递4e-分解2分子H2O释放1分子O2、产生2NADPH和约2ATP，额外缺1ATP需循环电子传递补充；根据最少光量子测量，每释放1分子O2(固定1分子CO2)至少需要8-12个光量子(PSII和PSI各4-6个)。",
    "光合Z-scheme氧化还原电位顺序、两个光系统的能量学功能分工(PSII氧化水、PSI还原NADP+)、ATP/NADPH计量与循环电子传递补充是光合能量学的联赛核心考点。"))
