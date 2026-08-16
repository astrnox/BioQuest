# -*- coding: utf-8 -*-
import sys, os
os.chdir('/workspace/data')

# 读取原文件
with open('comp_batch_a_m1_cell.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到最后一个 ] 前的最后一个 }
end_pos = content.rfind(']')
last_curly = content.rfind('}', 0, end_pos)

# 细胞膜补全5题
new_qs = []
new_qs.append({
    "stem": "哺乳动物细胞膜上存在Na+/Ca2+交换体（NCX），为电生中性3Na+/1Ca2+反向协同转运。当心肌细胞动作电位后复极期胞质[Na+]i因钠泵暂时受抑而轻度升高时，NCX的主要转运方向和效应是？",
    "options": {"A":"Na+内流+Ca2+外排，促胞质钙清除加速舒张","B":"Na+外流+Ca2+内流，促胞质钙升高延长收缩","C":"同时转运Na+/Ca2+内流，膜去极化诱发额外动作电位","D":"同时转运Na+/Ca2+外流，膜超极化延长不应期"},
    "answer": "B",
    "analysis": "A错误：未理解Na+梯度改变对反向协同转运方向的影响；正常静息时[Na+]o≈140mM远大于[Na+]i≈10mM，Na+顺浓度梯度内流是NCX的主要能量驱动，正常方向是3Na+入（释放电化学梯度能）偶联1Ca2+逆梯度出胞，这是心肌舒张期清除胞质钙的次要机制。B正确：NCX为电生反向协同转运，转运3Na+和1Ca2+但净携带1正电荷跨膜；其转运方向由Na+电化学势能和Ca2+电化学势能的相对大小决定。当胞质[Na+]i轻度升高（如钠泵暂时受抑、或动作电位后INa残余电流使[Na+]i局部从10→15mM）→Na+跨膜浓度差减小→Na+内流的电化学驱动力显著下降→当驱动力不足以对抗Ca2+外排所需逆梯度能量时，NCX反转其转运方向：反向模式即3Na+从胞内排至胞外+1Ca2+从胞外进入胞质——此为NCX反转模式，造成胞质[Ca2+]i升高，心肌收缩延长、正性肌力。这也是洋地黄类强心苷抑制钠泵→[Na+]i升高→NCX反转→胞质钙升高→心肌收缩力增强的药理分子机制。C错误：NCX反转是3Na+出+1Ca2+入（净2正电荷出=生电外向电流）→实际膜超极化而非去极化，不会诱发额外动作电位。D错误：方向描述不一致；「Na+/Ca2+都外流」则无偶联梯度能量来源，不可能。NCX的双向转运模式（正向清除钙、反向致钙超载）是心肌缺血再灌注损伤、强心苷药理、心律失常的核心机制。强心苷临床应用已有200余年，近年NCX反向模式特异性抑制剂成为心衰治疗的新分子靶点候选。",
    "knowledge": ["细胞生物学","细胞膜","Na+/Ca2+交换体NCX双向转运与心肌"],
    "module": "module_1","difficulty": "league","target": "both","concept": "细胞膜"
})
new_qs.append({
    "stem": "T细胞受体（TCR）识别MHC-抗原肽复合物后，免疫突触中心区域的TCR微簇通过内吞与回收循环维持信号持续。该TCR内吞的主要类型与分选信号是？",
    "options": {"A":"网格蛋白介导，TCR-CD3复合物ζ链胞质尾免疫受体酪氨酸激活基序ITAM磷酸化后招募AP-2","B":"巨胞饮，TCR交联触发膜褶皱非特异性吞入免疫突触","C":"窖蛋白介导，脂筏富集的TCR通过小窝内吞至窖体","D":"吞噬作用，通过整合素LFA-1黏附MHC后发动吞噬杯"},
    "answer": "A",
    "analysis": "A正确：T细胞免疫突触（T细胞与APC细胞之间的环形黏附-信号超分子结构，由中央cSMAC-TCR/外周pSMAC-LFA1的同心圆结构组成）的TCR信号维持依赖内吞-再循环的动态周转。TCR-CD3复合物配体结合后，cSMAC内激活的Src家族激酶Lck磷酸化CD3 ζ链胞质侧的多个ITAM基序（Immunoreceptor Tyrosine-based Activation Motif，保守序列YxxL/Ix6-8YxxL/I，每ζ链含3个ITAM）→双磷酸化ITAM的pYxxL序列招募胞质中的酪氨酸激酶ZAP-70（含串联SH2）；同时ITAM/激酶复合物周围招募内吞衔接蛋白：AP-2复合物的α-ear/μ2结构域可结合磷酸化ITAM周围的双亮氨酸/酪氨酸分选信号（或间接通过E3泛素连接酶c-Cbl泛素化TCR后招募Epsin、EPS15等泛素结合内吞衔接），网格蛋白包被被AP-2招募组装→网格蛋白介导内吞将激活TCR吞入早期内体；早期内体中部分TCR被分选至ESCRT→多泡体→溶酶体降解（信号终止），另一部分通过Rab4/Rab11依赖途径循环至突触外质膜→重新扩散进入cSMAC维持后续信号。B错误：巨胞饮是生长因子刺激或APC呈递时的大褶皱胞吞，负责吞入胞外液相抗原和营养物质，不是TCR定向内吞的主要通路。C错误：静息TCR确有部分位于脂筏，但TCR激活后主要通过CME内吞，近年证据显示小窝内吞参与的是共受体CD28和CTLA-4，而非TCR主体。D错误：吞噬作用仅发生于专职吞噬细胞（巨噬、DC、中性粒），T细胞不具备吞噬功能。免疫突触的信号周转内吞是近年免疫细胞生物学前沿，2023年多篇Nature工作揭示TCR相分离与内吞的偶联机制，联赛常以「T细胞激活-免疫突触-信号周转」串联考。",
    "knowledge": ["细胞生物学","细胞膜","TCR内吞与免疫突触信号周转"],
    "module": "module_1","difficulty": "league","target": "both","concept": "细胞膜"
})
new_qs.append({
    "stem": "当神经纤维某点产生动作电位后，该兴奋沿轴突双向传导但不会原路返回。其「不折返」特性的直接原因是？",
    "options": {"A":"电压门控K+通道快速开放形成超级化阻滞","B":"电压门控Na+通道进入快速失活态，处于绝对不应期","C":"Na+/K+-ATP酶快速清除进入胞内的Na+使膜电位回升过快","D":"相邻节段髓鞘绝缘使Na+无法回流至已兴奋节段"},
    "answer": "B",
    "analysis": "A错误：电压门控Kv延迟整流K+通道开放仅导致动作电位3期复极化和随后短暂超极化后电位，此期间膜电位低于静息水平，会提高再次兴奋阈值（相对不应期），但不是「完全不能折返」的直接原因——给予足够强刺激仍可在超极化段再次触发动作电位，不是绝对阻断。B正确：动作电位传导不折返的核心机制是「绝对不应期ARP」——0期去极化期间电压门控Nav通道从静息C态→开放O态→立即进入快速失活I态（由DIVS3-S4胞质侧IFM「失活球/铰链盖」插入孔道胞质内口实现）。失活态I的Nav通道即使膜电位仍保持去极化（如兴奋点周围的电场被动扩布的膜电位变化刺激已兴奋节段），也无法再开放（从I态→C态复活需膜先复极化至-70至-80mV并持续数十至数百毫秒）。因此当AP沿轴突双向扩布时，AP峰两侧紧邻的已兴奋膜正处于ARP（Nav全失活，不能触发新AP），只有前方未兴奋膜处于静息态（Nav可激活），因此AP只能沿轴突单向（向未兴奋侧）前进，绝对不会原路折返，这是神经纤维高频放电不重叠、不混乱的基础。C错误：钠泵清除胞内Na+是缓慢过程（每水解1ATP仅排3Na+，动作电位进入约10^7Na+，需数秒至数分钟才能完全恢复静息离子分布），绝非毫秒级动作电位传导的「不折返」原因。D错误：有髓神经纤维的郎飞氏结跳跃传导仅加快传导速度，相邻节段髓鞘绝缘与「不折返」无关——无髓纤维同样不折返，关键是ARP。不应期的Nav失活结构基础是电生理与离子通道结构的交叉考点，也是临床抗心律失常药（如I类Na+阻滞剂延长不应期）的机制基础。",
    "knowledge": ["细胞生物学","细胞膜","动作电位绝对不应期与Nav失活"],
    "module": "module_1","difficulty": "league","target": "both","concept": "细胞膜"
})
new_qs.append({
    "stem": "当细菌感染时，宿主吞噬细胞（如中性粒）可通过NADPH氧化酶（NOX2复合物）在吞噬体内爆发产生大量超氧阴离子O2-杀死病原体。该过程中NADPH氧化酶的电子传递和H+跨膜伴随是？",
    "options": {"A":"电子从胞质NADPH→FAD→血红素→吞噬体腔内O2→生成O2-，同时H+通道Hv1开放H+内流维持电荷平衡","B":"电子从吞噬体NADH→FMN→Fe-S→胞质O2→生成H2O2，同时V-ATP酶泵入H+","C":"电子从胞质NADPH→CoQ→Cyt c→腔内O2→生成H2O，同时Na+/H+交换体排出H+","D":"电子从吞噬体NADH→FAD→内质网→O2→生成OH·，同时H+被动扩散外流"},
    "answer": "A",
    "analysis": "A正确：NADPH氧化酶2（NOX2，又称吞噬细胞氧化酶PHOX，gp91phox+p22phox细胞色素b558整合膜异二聚体+胞质侧调节亚基p47phox/p67phox/p40phox+小G蛋白Rac1/2）是呼吸爆发（感染时吞噬细胞耗氧剧增10-20倍、产ROS杀菌）的核心酶：gp91phox为6次跨膜整合吞噬体膜蛋白，N端跨膜段结合2个血红素b（双血红素），C端胞质结构域结合FAD辅基和NADPH结合位点。电子传递链：胞质侧供体NADPH（磷酸戊糖通路PPP和苹果酸酶产生，是呼吸爆发耗NADPH的原因）→C端胞质结构域的FAD（得2e-→FADH2，NADPH→NADP++H+）→电子从C端FAD沿跨膜α螺旋内部路径→依次穿过两个血红素→传递到吞噬体腔侧的血红素→腔内O2分子从血红素接受1个电子生成超氧阴离子O2-（O2+e-→O2-）。每传递2e-同时从胞质摄取2H+由NADPH→NADP+释放到胞质侧，造成吞噬体腔内获得2个负电荷（2O2-），胞质侧获得2个正电荷（2H+）形成跨吞噬体膜电位差（胞质正、腔负，若不补偿会反向抑制电子传递）。因此NOX2活化同步激活吞噬体膜上的电压门控质子通道Hv1（Hvcn1，质子选择性极高）：Hv1在去极化电位（胞质正）驱动下开放，允许胞质H+顺电位差流入吞噬体腔中和O2-的负电荷、维持跨膜电荷平衡（同时H+外流→胞质pH不酸化、O2-+H+可进一步歧化为H2O2再经MPO→HOCl杀菌）。整条通路完全匹配A选项。B错误：方向（供体、电子终点）错乱，NOX不直接产H2O2（是继发SOD产物），也不用V-ATP酶。C错误：CoQ/Cyt c是呼吸链，与NOX无关。D错误：不需要内质网介导。呼吸爆发NADPH氧化酶电子传递+Hv1补偿是先天免疫+跨膜转运+ROS生物化学的交叉重点。慢性肉芽肿病（CGD）即因NOX2亚基（gp91phox X染色体连锁隐性最常见）突变导致吞噬细胞无法产ROS，细菌感染后化脓性肉芽肿反复发生。",
    "knowledge": ["细胞生物学","细胞膜","NADPH氧化酶呼吸爆发电子传递"],
    "module": "module_1","difficulty": "league","target": "both","concept": "细胞膜"
})
new_qs.append({
    "stem": "G蛋白偶联受体（GPCR）与G蛋白的偶联激活中，Gα亚基的「分子开关」功能由其自身GTP酶活性决定。霍乱毒素催化Gsα的ADP-核糖基化（修饰Arg201）和百日咳毒素催化Giα的ADP-核糖基化（修饰Cys352），两者最终对胞内cAMP水平的影响分别是？",
    "options": {"A":"均升高cAMP，因两毒素均永久激活Gα-GTP态","B":"均降低cAMP，因两毒素均阻止GDP-GTP交换","C":"霍乱毒素升高cAMP（Gsα持续激活AC），百日咳毒素升高cAMP（Giα失去AC抑制能力）","D":"霍乱毒素降低cAMP（Gsα失去核苷酸交换），百日咳毒素降低cAMP（Giα永久抑制AC）"},
    "answer": "C",
    "analysis": "GPCR→异源三聚体G蛋白→激活Gα→效应器的基本循环：①配体结合GPCR后GPCR胞内环构象变化→作为GEF结合Gα→催化Gα结合的GDP解离→胞质GTP浓度远高于GDP（约10:1）→Gα快速结合GTP→Gα-GTP与Gβγ解离→分别结合下游效应器。②分子开关关闭：Gα自身含缓慢的GTP酶活性（kcat约3-5/min，可被GAP/RGS蛋白加速10^3至10^5倍）水解GTP→GDP+Pi，Gα-GDP重新结合Gβγ回到静息三聚态。霍乱毒素（CT，AB5，A1亚基是ADP核糖转移酶）靶点：Gsα（激活型Gαs，下游激活腺苷酸环化酶AC→合成cAMP）；A1催化CT将NAD+上ADP-核糖基团共价连接到Gsα的Arg201残基（位于GTP酶活性中心Switch I区域，直接参与γ-磷酸配位和GAP结合）→该修饰不影响Gsα结合GDP/GTP交换（仍能被GPCR激活结合GTP），但完全破坏Gsα自身GTP酶活性（即使RGS/GAP也无法加速水解）→Gsα永久锁定在GTP结合活性态→持续、不受调控地激活AC→胞质cAMP水平飙升（大于100倍）→小肠上皮CFTR磷酸化持续开放→Cl-外流+Na++水流失→剧烈水样腹泻。百日咳毒素（PT，百日咳鲍特菌分泌，AB5，S1亚基是ADP核糖转移酶）靶点：Gi/o家族Gαi（抑制型Gαi，下游直接结合并抑制AC→减少cAMP合成；同时释放Gβγ激活Kir3.x GIRK钾通道→膜超极化）；S1亚基催化ADP-核糖共价连接到Giα的C端Cys352残基（靠近GPCR结合界面，即CT尾）→该修饰导致Giα无法被上游GPCR作为GEF激活→Giα永远保持GDP结合三聚静息态→失去从GPCR接受激活信号的能力→Giα-GTP无法形成→Giα原本对AC的抑制效应被解除（失抑制disinhibition）→AC基础活性不再受Gi压制→胞内cAMP水平间接升高（尽管Gs仍正常工作，但去除了刹车，相当于踩油门+松刹车→净cAMP↑）。百日咳临床表现：呼吸道上皮cAMP升高→Cl-/水分泌增加、黏液分泌+纤毛摆动抑制→阵发性痉挛性咳嗽（「百日咳」）。A错误：PT不永久激活Gα，Giα是失去被激活能力→间接失抑制cAMP升高，但不是「永久激活Gα-GTP态」。B错误：两毒素方向错。C正确：精准匹配两种毒素→修饰位点→G蛋白状态→最终cAMP净效应。D错误：方向与分子事件全反。两类ADP核糖基化细菌毒素（霍乱/百日咳/肉毒/白喉）的G蛋白/小G蛋白/EF-2靶点差异是信号转导经典案例，联赛必考。",
    "knowledge": ["细胞生物学","细胞膜","霍乱毒素与百日咳毒素Gα修饰及cAMP效应"],
    "module": "module_1","difficulty": "league","target": "both","concept": "细胞膜"
})

print(f"生成细胞膜补全题 {len(new_qs)} 道")

# 将字典转为JSON风格的Python dict字面量
def format_q(q, indent="  "):
    lines = []
    lines.append(indent + "{")
    lines.append(indent + '  "stem": ' + json.dumps(q["stem"], ensure_ascii=False) + ",")
    # options保持key排序：A,B,C,D
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

import json
qs_str = ",\n".join(format_q(q) for q in new_qs)

# 在最后一个}后加逗号和新题目，然后加]
new_content = content[:last_curly+1] + ",\n" + qs_str + "\n]\n"
with open('comp_batch_a_m1_cell.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("写入完成")
