# -*- coding: utf-8 -*-
"""Final merge script - Phase 1: Append 光合作用补4题 + 植物激素补22题 + 植物物质运输28题 = 54题 total append
Current: 60 questions (植物组织29/29 ✅, 光合作用25/29, 植物激素6/28, 其他0)
After phase 1: 114 questions (光合29✅, 激素28✅, 运输28✅)
"""
import ast, sys
from collections import Counter

TARGET = "/workspace/data/comp_batch_c_m2_plant_microbe.py"

ns = {}
exec(compile(open(TARGET, "r", encoding="utf-8").read(), "tmp", "exec"), ns)
Q = list(ns["QUESTIONS"])
print(f"Loaded {len(Q)} existing questions.")

# Helpers
def P(tag, stem, opts, ans, ana, kn):
    return {"stem":stem, "options":opts, "answer":ans, "analysis":ana,
            "knowledge":["植物学", tag, kn], "module":"module_2", "difficulty":"league",
            "target":"both", "concept":tag}
def M(tag, stem, opts, ans, ana, kn):
    return {"stem":stem, "options":opts, "answer":ans, "analysis":ana,
            "knowledge":["微生物学", tag, kn], "module":"module_2", "difficulty":"league",
            "target":"both", "concept":tag}

new_qs = []

# ===========================================
# 光合作用补 4 (to reach 29): 25+4 = 29 ✅
# ===========================================
tag = "光合作用"
s = "（*补P-26~29*）"

new_qs.append(P(tag,
    "将小麦（Triticum aestivum，C3）和玉米（Zea mays，C4）的叶片分别置于密封叶室，通入¹⁴CO₂进行5秒脉冲标记后立即取样，双向纸层析分离放射性代谢产物：小麦早期标记产物中83%放射性集中在3-磷酸甘油酸（PGA，C3化合物），玉米中78%放射性集中在苹果酸+天冬氨酸（C4二羧酸）；若标记时间延长到60秒再取样，则玉米中放射性从C4酸转移到PGA和葡萄糖-6-磷酸，维管束鞘细胞中Rubisco周围¹⁴C积累量是叶肉细胞的21倍。关于C3 vs C4光合初固定酶学定位和碳流时序的正确叙述是",
    {"A":"C3植物仅有Rubisco在叶肉细胞叶绿体基质催化RuBP+CO₂→PGA的唯一初固定步骤，故早期标记物全是PGA；C4植物分室分工：叶肉细胞（MC）胞质的PEPC以HCO₃⁻为底物（PEP+HCO₃⁻→OAA→Mal/Asp C4二羧酸，5秒标记即78%），C4酸通过胞间连丝进入维管束鞘细胞（BSC）后由脱羧酶（NADP-ME等）释放高浓度CO₂给BSC叶绿体Rubisco进行C3卡尔文循环固定，碳流时序MC C4酸→BSC C3 PGA→蔗糖/淀粉，故延长标记后放射性从C4酸转移到PGA，BSC Rubisco区域的C积累显著高于MC","B":"C4植物Rubisco在叶肉细胞细胞质中催化PEP的羧化反应，玉米早期标记78% C4酸是Rubisco作用结果","C":"小麦5秒标记83%PGA说明C3植物也通过PEPC催化C4途径进行初固定，只是比例低于C4","D":"碳流时序从C4酸转到PGA的原因是苹果酸直接被Rubisco当作羧基底物结合到其活性位点，替代CO₂发生羧化生成PGA"},
    "A",
    "A选项正确。C3与C4植物的CO₂初固定分室差异是理解C4进化优势的核心：①C3植物（小麦、水稻、大豆等约95%被子植物）：所有叶肉细胞的叶绿体均含Rubisco和完整Calvin循环酶系，CO₂从大气通过气孔扩散进入叶肉细胞后，直接在叶绿体基质被Rubisco（1,5-二磷酸核酮糖羧化酶/加氧酶）催化RuBP+CO₂→2分子PGA（3-磷酸甘油酸，C3三碳化合物，该途径得名）；脉冲标记5秒时Rubisco初固定的第一步产物PGA已积累83%放射性，完全符合单一C3模式。②C4植物（玉米、甘蔗、高粱，仅占被子植物~3%但贡献~25%全球陆地初级生产力）：基于Kranz花环结构的两室分工，**完全不在叶肉细胞进行Calvin循环**：a. MC（叶肉细胞）胞质：CA（碳酸酐酶）+PEPC（磷酸烯醇式丙酮酸羧化酶，Km(HCO₃⁻)极低~10μM，对O₂完全不敏感）催化初固定：PEP(C3)+HCO₃⁻→OAA(C4)→通过胞质NADP-MDH还原为苹果酸Mal或AST转氨为天冬氨酸Asp（均为C4二羧酸），5秒脉冲时78%放射性集中在C4酸（正是PEPC初固定的第一步产物）。b. BSC（维管束鞘细胞）：C4酸通过MC与BSC之间丰富的胞间连丝顺浓度梯度扩散到BSC，BSC中特异性脱羧酶（玉米NADP-ME亚型）催化Mal→丙酮酸Pyr(C3)+CO₂，释放的CO₂在BSC叶绿体Rubisco周围局部浓缩1000~3000倍（大气CO₂分压的30~50%）→Rubisco以C3方式高效羧化RuBP+CO₂→PGA→进入Calvin循环生成G3P→蔗糖/淀粉；脱羧产生的C3丙酮酸返回MC由PPDK再生PEP受体。③碳流时序与定位：5秒短脉冲时MC的PEPC反应极快（Vmax≈25~30μmol·m⁻²·s⁻¹，比Rubisco高5~10倍），标记全部停留在MC C4酸阶段；60秒长脉冲时C4酸已通过胞间连丝扩散进入BSC并被脱羧→CO₂被Rubisco固定进入Calvin循环→放射性从Mal/Asp(C4)流入PGA(C3)、G6P、蔗糖等终产物；BSC Rubisco区域积累量21倍MC，证明Rubisco严格分区在BSC。B选项错误，PEPC（不是Rubisco）是MC胞质的C4初固定酶，底物是HCO₃⁻+PEP(C3)；C4植物Rubisco仅在BSC叶绿体基质表达（MC中几乎检测不到Rubisco蛋白），其功能是催化标准RuBP+CO₂→2PGA的C3羧化（羧基底物是CO₂气体分子，不是PEP三碳化合物）。C选项错误，C3植物叶片中虽存在少量\"胞质型\"PEPC同工型（C3 PEPC，主要在保卫细胞、根中参与有机酸合成、pH调节、氮同化回补），但叶片同化细胞中PEPC表达量<总蛋白的0.01%，其对光合固定碳的贡献<0.5%，绝不会在5秒脉冲时产生83% PGA；PGA是Rubisco羧化的直接产物（不是PEPC产物：PEPC产物是四碳OAA/Mal，不是三碳PGA），小麦83% PGA完全来自Rubisco的直接催化，与PEP无关。D选项错误，Rubisco活性位点（大亚基rbcL的Lys201、Lys334构成的活化位点，氨基甲酰化Mg²⁺激活后结合RuBP的C2-C3烯二醇中间体）严格特异性识别CO₂（线性气体分子）作为亲电底物，发生烯二醇进攻CO₂的亲核加成→C6 β-酮酸中间体→水解为2分子PGA；苹果酸Mal(C4H6O5)是四碳二元羧酸（HOOC-CH(OH)-CH₂-COOH），分子体积大、空间构型完全不能匹配Rubisco的CO₂结合口袋（仅适合线性三原子CO₂分子），不可能作为Rubisco的羧基底物；碳流从C4酸到PGA的转移必须经过**NADP-ME在BSC中脱羧释放游离CO₂**这一步骤，由Rubisco对CO₂羧化完成。总结：本题通过¹⁴C-CO₂脉冲追踪+双向纸层析代谢产物分布（C3/C4植物对比+不同时间点+细胞分区），系统考查C3单一Rubisco C3模式与C4 MC PEPC-C4酸→BSC脱羧-Rubisco C3固定的两室分工时序碳流，是联赛光合作用C3/C4比较章节的经典核心题型。",
    "C3/C4植物¹⁴C脉冲追踪：C3单一Rubisco PGA初固定 vs C4 MC PEPC(C4酸)→BSC脱羧→Rubisco(PGA)两室分工时序碳流"
))

new_qs.append(P(tag,
    "将豌豆（Pisum sativum）成熟种子的子叶叶绿体分离后，测定Calvin循环三种关键酶的底物特异性：①核酮糖-1,5-二磷酸羧化酶/加氧酶Rubisco、②果糖-1,6-二磷酸酶FBPase、③景天庚酮糖-1,7-二磷酸酶SBPase。结果显示：Rubisco的Km(RuBP)=18μM、Km(CO₂)=14μM；FBPase Km(FBP)=6μM（对果糖-1,6-二磷酸特异性高，Km(SBP)>300μM即对景天庚酮糖-1,7-二磷酸亲和力极低）；SBPase Km(SBP)=3μM（对SBP特异性高，Km(FBP)>200μM对F-1,6-P₂亲和力极低）。分别加入相同浓度的氧化型谷胱甘肽GSSG（模拟氧化态），三种酶活性变化：Rubisco仅降10%；FBPase降至42%对照；SBPase仅剩8%活性。若同时加入DTT（巯基还原剂），GSSG抑制效应完全逆转。关于Calvin循环关键酶的差异调控（光激活与硫氧还蛋白Trx调节、底物特异性）的正确叙述是",
    {"A":"Calvin循环三个不可逆限速步骤的酶具有不同的底物特异性和氧化还原调节敏感性：Rubisco（羧化步骤，由活化酶RCA调节，直接与CO₂浓度相关）本身不含可被GSSG氧化的关键Cys残基，对氧化态不敏感（活性仅降10%）；FBPase（果糖-1,6-二磷酸→F-6-P，再生阶段第一个不可逆去磷酸化）和SBPase（景天庚酮糖-1,7-二磷酸→S-7-P，再生阶段第二个不可逆去磷酸化，Calvin循环唯一不可逆分支点控制C3流向蔗糖/淀粉vs RuBP再生）均在活性中心附近含有保守的氧化还原敏感二硫键（-S-S-），当黑暗或光氧化使基质GSSG/GSH比值升高时，二硫键保持氧化态（-S-S-，闭合）导致酶活性被强烈抑制（尤其SBPase对氧化最敏感，降92%）；光照下叶绿体铁氧还蛋白Fd→硫氧还蛋白Trx f（叶绿体特异的f型Trx，对FBPase/SBPase靶向性最强）→Trx f巯基还原FBPase/SBPase的二硫键为-SH→酶激活，DTT作为人工巯基还原剂可模拟Trx功能逆转GSSG氧化抑制；二者底物严格区分（FBP仅FBPase，SBP仅SBPase）说明FBPase和SBPase是Calvin循环中独立编码的同工酶（不是同一蛋白的双功能），分别控制己糖合成分支与戊糖磷酸RuBP再生分支的分配比例。","B":"FBPase和SBPase是由同一基因编码的双功能酶，通过可变剪接产生不同亚型分别催化两个去磷酸化步骤","C":"GSSG抑制三种酶活性的机制是竞争性结合酶的RuBP/FBP/SBP底物结合位点作为结构类似物阻断催化，与二硫键无关","D":"Rubisco对氧化态不敏感（仅降10%）是因为Rubisco活性中心完全由疏水氨基酸构成，不含任何Cys残基（巯基）"},
    "A",
    "A选项正确。Calvin循环（光合碳还原循环，PCR cycle，在叶绿体基质进行，分3阶段：羧化→还原→再生）的代谢流调控依赖三个不可逆限速步骤对应的关键酶，这三种酶在**底物特异性**（底物识别专一性）和**氧化还原光激活敏感性**（对Trx/f硫氧还蛋白巯基/二硫键转换响应）上具有显著差异，正好匹配Calvin循环羧化、再生分配、糖输出三个关键节点的独立调控需求：①三种酶定位与功能：a. Rubisco（大亚基rbcL叶绿体编码/小亚基RBCS核编码，~550kD十六聚体，基质可溶性蛋白占50%）——催化阶段①羧化：RuBP(C5)+CO₂→2PGA(C3)；b. 叶绿体FBPase（果糖-1,6-二磷酸酶，Fructose-1,6-Bisphosphatase，叶绿体特异性同工型FBP1，胞质同工型cFBPase参与蔗糖合成完全不同基因编码）——催化阶段③再生分支第一步（不可逆去磷酸化）：果糖-1,6-二磷酸F-1,6-P₂(C6)+H₂O→果糖-6-磷酸F-6-P(C6)+Pi；该产物F-6-P可沿两条支路代谢：(i) 继续转化为G-6-P→G-1-P→ADP-葡萄糖→淀粉（叶绿体储存），或通过GPT磷酸丙糖转运体输出到胞质合成蔗糖（终产物输出）；(ii) 转入戊糖磷酸途径再生RuBP；c. SBPase（景天庚酮糖-1,7-二磷酸酶，Sedoheptulose-1,7-Bisphosphatase，植物Calvin循环特有酶，原核蓝细菌也有保守同源物）——催化阶段③再生分支第二步（不可逆去磷酸化，Calvin循环核心分支点）：景天庚酮糖-1,7-二磷酸S-1,7-P₂(C7)+H₂O→景天庚酮糖-7-磷酸S-7-P(C7)+Pi；S-7-P是转酮酶/转醛酶反应合成戊糖磷酸（R-5-P→Ru-5-P→RuBP）的关键前体，SBPase活性直接决定RuBP再生效率与Calvin循环稳态速率。②底物特异性实验证明独立编码：FBPase Km(FBP)=6μM，Km(SBP)>300μM（对SBP亲和力比FBP低50倍以上→本质不识别SBP作为底物）；SBPase Km(SBP)=3μM，Km(FBP)>200μM（同理对FBP亲和力极低）。严格的底物区分意味着两种酶的底物结合口袋（活性中心裂隙大小、电荷互补、氢键供体/受体排布）进化出完全不同的空间构型：FBP只能匹配FBPase的口袋（6碳骨架+1,6-双磷酸基团），SBP只能匹配SBPase的口袋（7碳骨架+1,7-双磷酸基团）。因此FBPase和SBPase是由**核基因组中两个独立基因FBA1/FBA3 vs SBPASE（拟南芥At3g55800）编码的独立蛋白**（氨基酸序列同源性<20%，蛋白家族不同），绝非同一基因的可变剪接双功能酶——可变剪接通常仅改变蛋白末端结构域（如N端信号肽或C端调节域），不会完全重塑活性中心的底物结合特异性到50倍亲和力差异级别。③氧化还原光激活敏感性：叶绿体基质中光/暗转换通过\"铁氧还蛋白Fd→硫氧还蛋白Trx system\"（Fd-Trx reductase FTR→Trx f/m/x/y亚型）调节靶酶的保守Cys-X-X-Cys二硫键氧化还原状态：黑暗时基质氧化态（GSSG/GSH比值升高，巯基被氧化）→酶的二硫键保持闭合-S-S-，构象变化阻塞活性中心→酶失活（防止黑暗下Calvin循环与糖异生无效循环耗能）；光照时线性电子传递产生还原型Fd→FTR催化NADPH还原Trx f→Trx f（叶绿体f型硫氧还蛋白，CPPC基序）特异性结合FBPase/SBPase的N端氧化还原调节域，将其保守二硫键Cys155-Cys174还原为游离巯基-SH→构象开放、底物可进入活性中心→酶激活。题干中GSSG（氧化型谷胱甘肽，人工模拟基质高氧化环境）处理：Rubisco活性仅降10%→对氧化极不敏感（Rubisco本身的活性不依赖Trx二硫键调控，其活性调节由Rubisco活化酶RCA的ATPase移除抑制性糖磷酸+CO₂/Mg²⁺氨基甲酰化控制，活性中心附近没有关键氧化还原敏感Cys残基）；FBPase剩42%活性→中度氧化敏感（二硫键部分被氧化，仍有部分残余活性）；SBPase仅剩8%活性→高度氧化敏感（最保守的二硫键几乎全部被氧化闭合，活性几乎完全丧失）。SBPase对氧化还原最敏感的进化意义是：SBPase控制的S-1,7-P₂→S-7-P步骤是Calvin循环决定\"中间产物留在循环内再生RuBP vs 输出为终产物蔗糖/淀粉\"比例的关键分支点，在黑暗/氧化胁迫下先关闭再生分支→优先保存叶绿体能量与中间代谢物（避免RuBP继续产生而Rubisco在黑暗中无效光呼吸），而Rubisco仅受CO₂浓度和活化酶控制，保留基础羧化能力。DTT（二硫苏糖醇，人工巯基还原剂，巯基氧化还原电位E⁰=-0.33V）可直接通过二硫键交换反应将FBPase/SBPase的-S-S-还原为-SH，完全模拟体内Trx f的功能，因此GSSG效应被逆转。B选项错误，前已分析：FBPase与SBPase底物特异性Km差异>50倍（完全独立的结合口袋），二者是不同基因独立编码的不同蛋白（拟南芥FBPase 1 At3g54050，SBPase At3g55800，核定位不同、蛋白大小FBPase ~44kD/SBPase ~43kD但氨基酸序列<20%同源），不是同一基因可变剪接；可变剪接无法同时创造出对完全不同底物具有高特异性的两个独立活性中心。C选项错误，GSSG（氧化型谷胱甘肽，γ-谷氨酰-半胱氨酰-甘氨酸二硫键二聚体，γ-Glu-Cys-Gly）是氧化还原状态调节分子，通过巯基-二硫键交换反应（Cys-SS-Cys + 2GSH → 2Cys-SH + GSSG 的逆反应：蛋白Cys-SH被GSSG氧化为Cys-SSG谷胱甘肽化或Cys-SS-Cys蛋白分子内二硫键）修饰靶蛋白的半胱氨酸残基；GSSG分子本身是大的三肽衍生物（γ-肽键连接，分子量613），与RuBP（C5磷酸酯，分子量312）、FBP（C6双磷酸，分子量340）、SBP（C7双磷酸，分子量370）结构完全无关，不可能作为结构类似物竞争性结合酶的底物结合位点（Km结合需要精确的空间互补、氢键配对、电荷匹配）。D选项错误，Rubisco蛋白（476aa大亚基/180aa小亚基）**确实含有多个半胱氨酸Cys残基**（烟草Rubisco大亚基有8个Cys残基，小亚基4个Cys），分布在大亚基的α/β桶结构域、亚基相互作用界面等；Rubisco对氧化不敏感（仅降10%）是因为这些Cys残基均不位于Rubisco的活化位点（氨基甲酰化Lys201、Mg²⁺结合位点Asp203/Glu204、RuBP结合口袋Lys175/Lys334等）附近，它们的二硫键氧化/还原不影响Rubisco的催化构象或氨基甲酰化状态；而Rubisco活性由RCA活化酶（移除抑制性糖磷酸）+CO₂/Mg²⁺氨基甲酰化共同调控，与巯基状态无关（选项说\"不含任何Cys残基\"错误，蛋白结构中Cys参与二硫键维持亚基稳定性只是未参与活性调节）。总结：本题通过三种Calvin循环关键酶（Rubisco/FBPase/SBPase）的Km底物特异性测定+GSSG氧化胁迫/DTT回补实验，系统考查三种酶的独立基因编码特征（底物严格区分）、硫氧还蛋白Trx介导的氧化还原光激活敏感性差异（SBPase>FBPase>>Rubisco）及其对Calvin循环代谢流分支控制的进化意义，是联赛光合作用碳代谢-酶学调控章节的顶级综合题型。",
    "Calvin循环三种限速酶：Rubisco（CO₂敏感，氧化不敏感）/FBPase（Trx中等敏感，F6P输出分支）/SBPase（Trx最敏感，RuBP再生分支）的Km特异性与巯基光激活差异"
))

# Continue adding remaining 2 photosynthesis, 22 hormone, 28 transport questions...
# Due to massive content size, let's write a compact (but still meeting requirements) 
# version for remaining questions.

print(f"Defined {len(new_qs)} new questions so far in append batch.")
print("Need 2 more photosynthesis, 22 hormone, 28 transport questions.")

# We will write compact but valid questions for the remaining.
# The full 54 question literal list is being built directly in the file.
# This script outputs the literal strings, we then use another script to append.
with open("/workspace/data/append_batch1_literal.json", "w", encoding="utf-8") as f:
    import json
    json.dump(new_qs, f, ensure_ascii=False)
print(f"Wrote append_batch1_literal.json with {len(new_qs)} questions (sample photosynthesis batch 1)")
print("Note: Still need 2 more photosynthesis + 22 hormone + 28 transport = 52 to complete phase 1.")
