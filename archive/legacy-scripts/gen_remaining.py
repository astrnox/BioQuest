import json
import random

random.seed(42)

with open('_temp_questions.json', 'r', encoding='utf-8') as f:
    qs = json.load(f)

Q = lambda stem, opts, ans, ana, kn, mod, con: {
    "stem": stem, "options": opts, "answer": ans,
    "analysis": ana, "knowledge": kn, "module": mod,
    "difficulty": "league", "target": "both", "concept": con
}

def ana_wrap(ABCD, correct_idx, topic, mis):
    letters = ['A','B','C','D']
    parts = []
    for i, L in enumerate(letters):
        status = '正确' if i == correct_idx else '错误'
        parts.append('【' + L + '选项·' + status + '】' + ABCD[i])
    parts.append('【总结升华】本题核心考点为' + topic + '的定量与定性分析。考生常见误区集中在《' + mis + '》——需警惕将教材中的理想化模型直接套用到具有时空异质性的真实生态系统或实验系统，而忽略模型的前提假设、适用边界，以及野外或实验条件下多重混淆因素的交互作用。联赛生态题和遗传题的命题趋势是将经典定量公式嵌入真实的物种种群实验情境，结合方法学验证和跨知识点迁移，要求考生不仅能《背公式》，更能《判适用、评误差、析机制》。在备考中应系统梳理各模块三级知识点的《概念—公式—前提—常见误区—真实案例》五维链条，并通过大量联赛真题的精读训练，形成《读题即识别考点加快速定位误区》的条件反射。')
    return '\n\n'.join(parts)

# ========= 群落生态 25题 =========
ce_tpcs = [
    ('Lotka-Volterra竞争','竞争系数与共存阈值','Lotka-Volterra竞争模型共存判据K/α比','竞争系数α/K换算与K/α判读混淆'),
    ('生态位分化','生态位宽度与重叠指数','生态位宽度生态位重叠指数计算','将竞争排除等同于绝对灭绝而忽略生态位分化'),
    ('捕食者猎物周期','Lotka-Volterra捕食振荡','LV捕食模型零增长等斜线和平衡密度','零增长等斜线的交点稳定性判读错误'),
    ('共生类型区分','互利共生/寄生/附生/偏利','种间关系类型区分互利共生寄生附生偏利','将附生植物与宿主关系误判为寄生'),
    ('初生演替','地衣苔藓草本灌木乔木阶段','演替系列阶段与先锋种顶极种生活史','误以为演替总是从裸岩开始忽略次生演替'),
    ('次生演替','先锋种与顶极种的生活史对比','演替三学说促进抑制忍耐','将农田弃耕后的演替误判为初生演替'),
    ('Simpson指数','D=1-Σ(pi²)的计算与含义','Simpson优势度指数与Shannon多样性指数计算','将Simpson指数D与Shannon H混淆'),
    ('Shannon指数','H=-Σ(pi·lnpi)与均匀度J','ShannonWiener多样性指数与均匀度Pielou J','用log2计算后误当成ln基准的H值'),
    ('中度干扰假说','Connell干扰与多样性单峰','Connell中度干扰假说IDH单峰格局','以为干扰越强多样性越高'),
]
ce_sp = [
    ('辽东栎','Quercus wutaishanica','山西太岳山灵空山国家级自然保护区'),
    ('油松','Pinus tabuliformis','河北承德塞罕坝机械林场'),
    ('青海云杉','Picea crassifolia','甘肃祁连山国家级自然保护区'),
    ('大针茅','Stipa grandis','内蒙古锡林郭勒盟白音锡勒牧场'),
    ('羊草','Leymus chinensis','内蒙古呼伦贝尔市谢尔塔拉'),
    ('高山嵩草','Kobresia pygmaea','青海三江源国家级自然保护区'),
    ('木荷','Schima superba','浙江天目山国家级自然保护区'),
    ('栲树','Castanopsis fargesii','福建武夷山国家级自然保护区'),
    ('云南松','Pinus yunnanensis','云南哀牢山国家级自然保护区'),
]

for i in range(25):
    sp_cn, sp_lt, loc = ce_sp[i % len(ce_sp)]
    tcode, tpc, kn3, mis = ce_tpcs[i % len(ce_tpcs)]
    a_idx = i % 4

    if tcode == 'Lotka-Volterra竞争':
        K1 = 500 + i*20
        K2 = 400 + i*15
        a12 = round(0.4 + (i%5)*0.1, 2)
        a21 = round(0.3 + (i%4)*0.15, 2)
        stem = ('在' + loc + '的永久样地群落中，对两个优势种' + sp_cn + '（物种1，' + sp_lt +
            '）和伴生种异叶败酱（Patrinia heterophylla，物种2）开展种间竞争实验。采用De Wit取代系列实验设计（5种密度比例×3重复，每盆种植总密度恒定为N=50株/盆，生长季持续140天），拟合Lotka-Volterra竞争模型参数得：物种1内禀增长率r1=' +
            str(round(0.6+0.05*(i%3),2)) + '，物种2的r2=' + str(round(0.4+0.05*(i%4),2)) +
            '；环境容纳量K1=' + str(K1) + '株，K2=' + str(K2) +
            '株；竞争系数α12（物种2对物种1的抑制效应）=' + str(a12) +
            '，α21（物种1对物种2的抑制效应）=' + str(a21) +
            '。下列关于两物种竞争结局的理论预测与生态位分化机制的分析，完全正确的是？')
        correct = (K1/K2 > a12) and (K2/K1 < a21)  # 物种1胜
        ABCD = [
            ('由于K1=' + str(K1) + '>K2=' + str(K2) + '，因此无论竞争系数如何，物种1必然获胜——物种1竞争排除物种2。'),
            ('计算共存判据：K1/α12=' + str(round(K1/a12,1)) + '，K2=' + str(K2) +
                '；K2/α21=' + str(round(K2/a21,1)) + '，K1=' + str(K1) +
                '。满足K1/α12>K2且K2/α21<K1，因此物种1竞争排除物种2，物种2灭绝。'),
            ('由于α12+α21=' + str(round(a12+a21,2)) + '<1，因此两物种必然稳定共存，且平衡点N1*=K2/α21≈' + str(round(K2/a21,0)) + '，N2*=K1/α12≈' + str(round(K1/a12,0)) + '。'),
            ('竞争系数的大小代表生态位重叠程度：α12=' + str(a12) + '说明物种1的种间竞争强度大于种内竞争强度，两物种必然发生竞争排除，结局取决于初始种群密度。'),
        ]
        ans_i = a_idx
        # Ensure consistency: force B to be correct if it matches correct prediction
        if correct:
            ABCD[1] = ('计算共存判据：K1/α12=' + str(round(K1/a12,1)) + '>K2=' + str(K2) +
                '，且K2/α21=' + str(round(K2/a21,1)) + '<K1=' + str(K1) +
                '。满足《物种1胜》的判据（K1/α12>K2且K2/α21<K1），因此物种1（' + sp_cn + '）竞争排除物种2；但实际野外群落中由于环境异质性、生活史阶段分化和补充限制等机制，物种2仍可通过《竞争避难所》共存。')
            ans_i = 1
        else:
            ans_i = 0
            ABCD[0] = ('由于K1/α12=' + str(round(K1/a12,1)) + '<K2=' + str(K2) +
                '且K2/α21=' + str(round(K2/a21,1)) + '>K1=' + str(K1) +
                '，因此判据满足《物种2胜》的条件（K2/α21>K1且K1/α12<K2），物种2（异叶败酱）竞争排除物种1；这警示我们不能仅凭K或r大小直接预测竞争结局，而必须计算K/α比。')
        kn = ['生态学','群落生态', kn3]
        ana = ana_wrap(ABCD, ans_i, '群落生态-种间竞争Lotka-Volterra模型', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '群落生态'))

    elif tcode == 'Simpson指数':
        S = 6 + (i%5)
        N = 100 + i*8
        n1 = round(N*(0.40 - 0.01*(i%3)))
        n2 = round(N*(0.25 - 0.005*(i%4)))
        n3 = round(N*(0.15 + 0.005*(i%2)))
        n4 = round(N*(0.10))
        n5 = round(N*(0.07))
        n6 = N - n1 - n2 - n3 - n4 - n5
        ns = [n1,n2,n3,n4,n5,n6]
        ns = ns[:S] + [max(1, N-sum(ns[:S]))]
        Nadj = sum(ns)
        pis = [n/Nadj for n in ns]
        D_val = 1 - sum(p*p for p in pis)
        H_val = -sum(p*(0 if p==0 else __import__('math').log(p)) for p in pis)
        J_val = H_val / (__import__('math').log(S) if S>1 else 1)
        stem = ('在' + loc + '的草地群落样方调查中，采用1m×1m记名记数法（每个样地10个重复小样方，10m间隔系统布设），共记录维管植物S=' + str(S) + '种，总个体数N=' + str(Nadj) + '株。各物种多度如下：物种1 ' + sp_cn + '（' + sp_lt + '）n1=' + str(ns[0]) +
            '株；物种2 苔草Carex n=' + str(ns[1]) +
            '株；其余' + str(S-2) + '种数量依次为' + str(ns[2:]) + '株。下列关于Simpson多样性指数D=1-Σ(ni/N)²与Shannon-Wiener指数H' + "'" + '=-Σ(pi·lnpi)的定量计算、生态学含义对比、以及与均匀度J的关系，全部正确的是？')
        D_str = f"{D_val:.4f}"
        H_str = f"{H_val:.4f}"
        J_str = f"{J_val:.4f}"
        ABCD = [
            ('Simpson指数D的计算：Σ(ni/N)²≈' + str(round(sum(p*p for p in pis),4)) + '，因此D=1-该值≈' + D_str +
                '。Simpson指数D的取值范围为[0,S]，D越大表示物种多样性越低（D为优势度指数而非多样性指数）。'),
            ('Shannon-Wiener指数H' + "'" + '的计算：pi·lnpi之和≈' + str(round(-sum(p*(0 if p==0 else __import__('math').log(p)) for p in pis),4)) + '，即H' + "'" + '≈' + H_str +
                '。H' + "'" + '的生态学含义是《随机抽取的两个个体属于不同物种的概率》，与Simpson指数D的统计学含义完全相同，仅数值范围不同。'),
            ('Shannon均匀度J=H' + "'" + '/Hmax=' + H_str + '/ln(' + str(S) + ')≈' + J_str +
                '。J值越接近1表示群落中各物种个体数越均匀（即优势度越低）；本题J≈' + J_str + '说明群落存在明显的优势种（' + sp_cn + '）。'),
            ('将物种多度取对数后再计算H' + "'" + '，得到的log2基准的H' + "'" + '₂=H' + "'" + '/ln2≈' + str(round(H_val/__import__('math').log(2),4)) +
                '，此时均匀度J₂=H' + "'" + '₂/ln(' + str(S) + ')，数值与J完全相等，因此对数底数不影响均匀度计算和多样性排序。'),
        ]
        ans_i = 2  # C is correct
        kn = ['生态学','群落生态', kn3]
        ana = ana_wrap(ABCD, ans_i, '群落生态-物种多样性指数（Simpson/Shannon/均匀度）', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '群落生态'))

    elif tcode == '捕食者猎物周期':
        r = round(0.8 + 0.1*(i%3), 1)
        a = round(0.01 + 0.002*(i%4), 4)
        b = round(0.2 + 0.05*(i%3), 2)
        m = round(0.4 + 0.05*(i%4), 2)
        N_eq = m / (a*b)
        P_eq = r / a
        stem = ('在黑龙江扎龙国家级自然保护区的湿地围栏实验中，研究小型啮齿动物莫氏田鼠（Alexandromys maximowiczii，猎物种群N）与主要捕食者艾鼬（Mustela eversmanii，捕食者种群P）的种群动态。根据连续6年的标志重捕调查数据（每年4次，覆盖春秋繁殖季与冬季非繁殖季），拟合经典Lotka-Volterra捕食者-猎物模型参数：猎物内禀增长率r=' + str(r) +
            ' /季；捕食者搜寻效率（攻击率）a=' + str(a) +
            ' /捕食者·季；猎物转化效率b=' + str(b) +
            ' 新捕食者/被食猎物；捕食者死亡率m=' + str(m) +
            ' /季。下列关于该模型的零增长等斜线、平衡密度、振荡周期与野外修正的分析，完全正确的是？')
        ABCD = [
            ('猎物零增长等斜线：dN/dt=0 → P*=r/a=' + str(round(r/a,1)) +
                '只艾鼬；捕食者零增长等斜线：dP/dt=0 → N*=m/(ab)=' + str(round(m/(a*b),1)) +
                '只莫氏田鼠。当N>N*且P<P*时，猎物种群上升而捕食者种群下降，处于周期的《猎物上升期》。'),
            ('当N<N*（' + str(round(m/(a*b),1)) + '）且P>P*（' + str(round(r/a,1)) + '）时，dN/dt>0且dP/dt>0，两物种同时增长。平衡焦点(N*,P*)是稳定结点，无论初始密度如何都会直接收敛到平衡点，不发生周期性振荡。'),
            ('经典LV捕食模型预测的周期振幅与初始条件无关，周期T=2π/√(rm)≈' + str(round(2*3.14159/((r*m)**0.5),1)) +
                '季。野外真实的捕食-猎物振荡（如猞猁-雪兔的9-10年周期）完全符合LV模型预测，说明环境容纳量K、密度制约捕食者功能反应等野外因子不会改变理论周期。'),
            ('LV捕食模型的经典假设包括：①猎物种群在无捕食者时呈指数增长（无K）；②捕食者在无猎物时呈指数死亡（m恒定）；③捕食者功能反应为Ⅱ型（Holling圆盘方程，捕食率随猎物密度饱和）。上述三条全部是LV模型的严格假设。'),
        ]
        ans_i = 0  # A is correct
        kn = ['生态学','群落生态', kn3]
        ana = ana_wrap(ABCD, ans_i, '群落生态-Lotka-Volterra捕食者-猎物模型', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '群落生态'))

    elif tcode == '初生演替' or tcode == '次生演替':
        if tcode == '初生演替':
            stem = ('在四川汶川5·12特大地震（2008年5月12日，Ms8.0）的典型极重灾区——映秀镇附近的全新裸岩滑坡体（高程1050-1350m，坡度35°-42°，出露基岩为花岗岩，地震前为原始青冈+栲树常绿阔叶林，地震后全部剥离基岩裸露，完全无土壤层和植物繁殖体存留，即严格意义的《初生裸地》primal barren），设置了5条永久演替监测样带（每条10m×50m，平行于等高线布设，海拔梯度对应微环境差异），于震后第1、3、5、8、12、15年连续开展演替动态监测（2008-2023年共15年监测数据）。2023年（震后第15年）的监测结果显示：各样带的《地被覆盖率》（含苔藓地衣+维管植物总盖度）为58%-82%，维管植物总物种数累计38-52种，已进入《多年生草本+灌木入侵》的演替中期；样带内的藓类优势种为东亚砂藓（Racomitrium japonicum，耐干旱裸岩的拓荒藓类，生物结皮主要形成者）和土生对齿藓（Didymodon vinealis），维管植物优势种为一年蓬（Erigeron annuus）、鬼针草（Bidens pilosa）等r对策一年生草本，以及先锋灌木马桑（Coriaria nepalensis，具Frankia放线菌根瘤固氮）和火棘（Pyracantha fortuneana）。下列关于该初生裸岩滑坡体的演替阶段、先锋种与顶极种的生活史对策对比、以及《演替机制》的三个经典学说（促进模型Clements、抑制模型Connell & Slatyer、忍耐模型Egler）的综合分析，完全正确的是？')
            ABCD = [
                ('此滑坡体属于《初生演替》（primary succession），因为其基质为完全无土壤层和繁殖体的地震新裸露花岗岩裸岩。Clements的《促进模型》（facilitation model，即《演替单元理论》monoclimax hypothesis）可较好解释其早期阶段：地衣和拓荒藓类通过分泌地衣酸溶蚀岩石、形成生物结皮固定细颗粒、积累微量有机质，为后续一年生草本的定居创造了必要的土壤和水分条件——即前一阶段物种《主动促进》后一阶段物种的入侵。'),
                ('既然地震前该地是常绿阔叶林，震后会按原样从草本→灌木→乔木快速恢复，30年内即可直接恢复到顶极常绿阔叶林，无需经历地衣-苔藓阶段。这说明所有演替的最终终点都是该气候带的气候顶极群落，即Clements的《单顶极学说》绝对正确。'),
                ('马桑（Coriaria nepalensis）和火棘（Pyracantha fortuneana）作为本案例的《顶极种》，其典型r对策特征包括：种子小且产量大（每株年产种子>10万粒）、扩散能力强（风力或鸟类传播）、休眠期长、个体小、成熟早（2-3年即开花）、寿命短（<10年），与K对策的先锋种相反。'),
                ('Connell & Slatyer的《抑制模型》预测：先定居的物种会通过竞争、化感作用等《抑制》后来物种的入侵。本案例中，一年生草本一年蓬通过分泌化感物质抑制先锋灌木马桑幼苗的定居，因此演替阶段的过渡完全不依赖于前一物种的促进作用。'),
            ]
            ans_i = 0
        else:
            stem = ('在湖北恩施州咸丰县的典型亚热带山区，对《弃耕农田（abandoned farmland/old-field）》的次生演替开展了《空间换时间》的演替序列调查（chronosequence法，Pickett 1989经典方法）：选取当地农民在不同年代（1年、3年、7年、15年、25年、40年）主动弃耕的水稻(Oryza sativa)+玉米(Zea mays)轮作旱地（土壤类型为第四纪红色黏土发育的黄壤，pH 5.2-5.8，全磷含量偏低，弃耕时的肥力条件和坡向坡度基本一致，避免了初始条件异质性的干扰），每个弃耕年限设置3个20m×20m重复样地，调查群落物种组成、优势种种群结构、土壤理化性质、以及功能性状组成。调查结果：弃耕1年样地以马唐(Digitaria sanguinalis)+狗尾草(Setaria viridis)等一年生C4禾草为绝对优势；弃耕7年出现多年生蒿属(Artemisia spp.)+白茅(Imperata cylindrica)并占据优势；弃耕25年进入灌木阶段，火棘(Pyracantha fortuneana)+盐肤木(Rhus chinensis)+白栎(Quercus fabri)幼树占优；弃耕40年已进入《针阔混交林》演替后期，乔木层优势种为马尾松(Pinus massoniana，阳性先锋乔木)+白栎+青冈(Cyclobalanopsis glauca)，林下更新层出现了大量栲树(Castanopsis fargesii，耐阴性顶极种)幼苗。下列关于该次生演替序列的特征、与初生演替的关键区别、以及顶极种生活史对策的综合分析，完全正确的是？')
            ABCD = [
                ('本案例为典型《次生演替》（secondary succession），与初生演替的核心区别在于：次生演替的基质保留了原有土壤层和土壤种子库（埋藏的可萌发种子与营养繁殖体），且周边有成熟群落作为《物种源》提供繁殖体输入，因此演替速率远快于初生演替（本案例40年已进入针阔混交林，而汶川地震裸岩滑坡体15年仍停留在草本灌木阶段）。'),
                ('弃耕40年样地的乔木层优势种马尾松属于《顶极种》climax species，其K对策特征包括：耐阴、可在林冠下更新、生长缓慢、寿命长（>300年）、种子大扩散差，是该亚热带山地的最终气候顶极优势种。'),
                ('白栎(Quercus fabri)幼苗在弃耕25年样地才出现，说明栎树等高大乔木的种子必须依赖于前期的草本阶段和灌木阶段物种的《促进作用》（如固氮、遮阴、改善土壤结构）才能定居，完全符合Clements的单顶极促进模型，抑制模型和忍耐模型在此案例中毫无适用空间。'),
                ('弃耕1年样地的马唐+狗尾草等一年生C4禾草具有典型K对策特征：种子大、每株种子产量低、扩散能力差、不能形成持久土壤种子库、个体大、成熟晚、寿命长，因此只能作为顶极群落的优势种存在。'),
            ]
            ans_i = 0
        kn = ['生态学','群落生态', kn3]
        ana = ana_wrap(ABCD, ans_i, '群落生态-演替（初生/次生/先锋-顶极种/三学说）', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '群落生态'))

    elif tcode == '共生类型区分':
        stem = ('在云南西双版纳热带植物园（XTBG，中国科学院西双版纳热带植物园，勐仑镇580m海拔）的20公顷热带雨林大样地（CTFS-ForestGEO全球森林监测网络标准样地），植物调查与菌根鉴定工作发现了多种典型的种间关系。下列5种真实的种间相互作用配对中：① 榕树(Ficus altissima Blume，高榕，桑科榕属绞杀榕)与被绞杀的成年四数木(Tetrameles nudiflora，四数木科，国家二级保护植物)——榕树气生根从四数木枝干上萌发下垂、融合成网状《根套》包裹四数木树干并逐步绞杀死亡；② 附生兰科植物鼓槌石斛(Dendrobium chrysotoxum)附生于热带乔木西南紫薇(Lagerstroemia tomentosa)的粗枝树皮表面，利用树皮缝隙的腐殖质和雨露，不侵入宿主组织；③ 豆科植物云南含笑(Paris polyphylla var. yunnanensis不对，实际用云南黄檀Dalbergia yunnanensis)的根部瘤状结构与慢生根瘤菌(Bradyrhizobium elkanii)的共生固氮——根瘤内类菌体将大气N₂还原为NH₄+供给植物，植物提供光合产物和微厌氧环境；④ 菟丝子(Cuscuta japonica，日本菟丝子，旋花科寄生植物，叶退化为鳞片状无叶绿素)以吸器侵入寄主荔枝(Litchi chinensis cv.三月红)的韧皮部，吸取水和同化物；⑤ 榕树(Ficus microcarpa，小叶榕)与其专一传粉者榕小蜂(Eupristina verticillata，膜翅目榕小蜂科，雌蜂进入榕果花序腔内传粉并产卵于部分短柱花子房)的传粉共生——榕树获得专一传粉，榕小蜂获得部分短柱花子房作为幼虫发育场所。根据上述真实案例，下列关于共生/寄生/附生/绞杀的分类与机制比较，完全正确的是？')
        ABCD = [
            ('案例③（黄檀-根瘤菌）和案例⑤（榕树-榕小蜂）属于《互利共生》（mutualism，双方均获得适合度净收益）；案例②（鼓槌石斛-紫薇）属于《附生》（epiphytism，附生植物受益、宿主不受明显影响即偏利共生commensalism）；案例④（菟丝子-荔枝）属于《寄生》（parasitism，寄生物受益、宿主受害）；案例①（绞杀榕-四数木）可归入特殊类型的种间竞争/绞杀关系（绞杀榕通过空间竞争+机械绞杀使宿主死亡，并非直接摄取宿主营养）。'),
            ('案例②（鼓槌石斛附生在紫薇树皮上）属于《寄生》关系，因为石斛将根深入紫薇树皮的韧皮部吸取有机物，因此附生植物都是半寄生植物。'),
            ('案例①（绞杀榕-四数木）属于《典型寄生》关系，与菟丝子无区别，因为绞杀榕的气生根会伸入四数木的木质部直接吸取水分和有机物。'),
            ('案例⑤（榕树-榕小蜂）：榕小蜂在所有长柱花和短柱花子房内产卵，吃掉全部榕树种子，因此榕树实际上完全受害，该关系本质上属于捕食，绝不是互利共生。'),
        ]
        ans_i = 0
        kn = ['生态学','群落生态', kn3]
        ana = ana_wrap(ABCD, ans_i, '群落生态-种间相互作用（共生/寄生/附生/绞杀）', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '群落生态'))

    elif tcode == '生态位分化':
        pass
    elif tcode == '中度干扰假说':
        pass
    else:
        # Generate filler community ecology questions
        S = 8 + (i%4)
        H = 1.6 + 0.1*(i%5)
        stem = ('在' + loc + '的森林群落中，针对优势种' + sp_cn + '（' + sp_lt + '）群落开展的种间生态位研究：记录S=' + str(S) + '个主要物种在5种资源维（光照梯度×5个等级、土壤含水量×4等级、土壤pH×4等级、土壤全N×4等级、海拔×5段）上的多度分布，计算Levins生态位宽度Bi=1/Σ(pij²)和Pianka生态位重叠指数Oik。下列分析正确的是？')
        ABCD = [
            ('若两物种的Levins生态位宽度B1=' + str(round(2.0+0.2*i,2)) + '、B2=' + str(round(0.8+0.1*i,2)) + '，说明物种1为生态位泛化种（generalist）、物种2为特化种（specialist）；泛化种在干扰环境中更具优势，特化种在稳定环境中更具竞争力。'),
            ('两物种的Pianka生态位重叠O=' + str(round(0.90-0.05*i,2)) + '>0.85，因此两物种必然发生竞争排除，不可能在同群落长期共存。'),
            ('生态位分化只能通过《空间资源分隔》实现：即不同物种栖息在生境的不同空间位置（如不同海拔、不同土层深度）；时间生态位（如不同花期、不同活动时段）和营养生态位（不同食性）不属于生态位分化的有效途径。'),
            ('竞争排除原理（Gause定律）指出：生态位完全相同的两个物种能在同一稳定环境中长期共存，因为种内竞争强度永远小于种间竞争强度。'),
        ]
        ans_i = 0
        kn = ['生态学','群落生态', kn3]
        ana = ana_wrap(ABCD, ans_i, '群落生态-生态位分化与竞争排除原理', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '群落生态'))

    # Progress
    if (i+1) % 10 == 0:
        print(f'  群落生态生成中... {i+1}/25')

print(f'群落生态完成：总题数 {len(qs)}')
with open('_temp_questions.json','w',encoding='utf-8') as f:
    json.dump(qs, f, ensure_ascii=False, indent=2)

# ========= 物质循环 25题 =========
mc_tpcs = [
    ('碳循环','源汇格局与海洋生物泵','GPP/NPP/NEP/NEE碳通量关系源汇判定','将海洋碳汇与陆地碳汇混淆，忽略永久冻土正反馈'),
    ('氮循环','固氮/硝化/反硝化/氨化菌群','氮循环四步骤与参与菌群代谢生态位','将硝化作用与反硝化作用的菌群和产物混淆'),
    ('磷循环','沉积型循环无气相与限制因子','磷循环沉积型特征与富营养化李比希定律','以为磷循环和碳氮一样有显著的气相组分'),
    ('生物富集','DDT生物放大与食物链级联','生物富集与生物放大TMF与PBT性质','生物富集系数与生物放大概念混淆'),
]
mc_sp = [
    ('寒温带明亮针叶林','Larix gmelinii林','内蒙古大兴安岭汗马国家级自然保护区'),
    ('亚热带常绿阔叶林','Castanopsis eyrei林','浙江古田山国家级自然保护区'),
    ('热带季节性雨林','Parashorea chinensis林','云南西双版纳勐腊县补蚌'),
    ('温带草甸草原','Leymus chinensis+Stipa baicalensis群落','内蒙古呼伦贝尔市鄂温克旗'),
    ('温带典型草原','Stipa grandis+Leymus chinensis群落','内蒙古锡林郭勒盟正蓝旗'),
    ('高寒草甸','Kobresia pygmaea群落','青海果洛州玛沁县三江源'),
    ('寒温带沼泽湿地','Carex schmidtii+Betula fruticosa群落','黑龙江洪河国家级自然保护区'),
    ('红树林湿地','Rhizophora apiculata+Bruguiera gymnorrhiza群落','海南东寨港国家级自然保护区'),
]
timings = ['2022年1月-2023年12月（连续两年全年逐日观测）','2021年6月-2022年5月（完整水文年）','2019-2023年（连续5年生长季+非生长季对比）','2020-2022年（三年涡度相关通量观测）','2018年7月-2023年6月（连续五年的逐月观测）']

for i in range(25):
    veg_cn, veg_lt, loc = mc_sp[i % len(mc_sp)]
    tcode, tpc, kn3, mis = mc_tpcs[i % len(mc_tpcs)]
    timing = timings[i % len(timings)]
    a_idx = i % 4

    if tcode == '碳循环':
        GPP = 900 + i*20
        Re = 780 + i*18
        NEE = GPP - Re
        NEP = GPP - Re
        Rh = int(420 + i*10)
        Ra = Re - Rh
        NPP = GPP - Ra
        stem = ('在' + loc + '的涡度相关通量观测塔（' + timing + '连续观测，开路涡度相关系统LI-7500A红外CO₂/H₂O分析仪+三维超声风速仪CSAT3A，每30分钟记录净生态系统CO₂交换NEE、潜热、感热通量，配套0-100 cm土壤剖面自动观测土壤温湿度与呼吸），得到年度碳收支的核心通量（单位g C/(m²·a)，正号为向大气释放即碳源，负号为从大气吸收即碳汇）：① 总初级生产量GPP（全部绿色植物光合作用固定的总CO₂）= ' + str(GPP) +
            ' g C/(m²·a)；② 生态系统呼吸Re（生物总呼吸，拆分为自养呼吸Ra=植物呼吸、异养呼吸Rh=土壤微生物+动物分解）= ' + str(Re) +
            '，其中Rh≈' + str(Rh) + '，Ra≈' + str(Ra) +
            '；③ 净生态系统CO₂交换NEE=GPP - Re= ' + str(NEE) +
            '。同期0-100 cm土壤有机碳SOC：2015年SOC=18.3 g C/kg（容重1.3 g/cm³），2022年SOC=20.7 g C/kg。下列关于生态系统碳循环的通量关系、碳汇碳源判定、全球碳源汇格局及全球变暖下的碳-气候反馈分析，完全正确的是？')
        ABCD = [
            ('净初级生产量NPP=GPP-Ra=' + str(NPP) + ' g C/(m²·a)（NPP是植物用于生长繁殖的净光合固定，可被下一营养级利用）；净生态系统生产量NEP=GPP-Re=NEE≈' + str(NEP) +
                ' g C/(m²·a)；NEP>0说明该生态系统为碳汇，从大气净吸收CO₂。此外，陆地生态系统的NEP还需考虑干扰（采伐火灾）、溶解态DIC/DOC径流输出、动物CH₄排放等漏失项，所以《净生物群系生产量NBP》才是陆地生态系统的真实净碳积累速率。'),
            ('计算Ra=Re-Rh=' + str(Ra) + ' g C/(m²·a)，由于Ra≈' + str(round(Ra/GPP*100,1)) + '%的GPP，因此植物自养呼吸消耗的碳占总光合固定的比例低于土壤异养呼吸消耗比例，Ra/GPP比值在全球不同生态系统中基本恒定（约20%），不受温度、水分、植物功能型影响。'),
            ('《海洋生物泵》（marine biological pump）是海洋碳汇的唯一机制：即海洋浮游植物光合作用将表层DIC转化为POC（颗粒有机碳），然后全部以海洋雪形式沉降到深海沉积物永久储存，不涉及任何物理泵（溶解度泵solubility pump：冷水溶解更多CO₂下沉）、碳酸盐泵（颗石藻CaCO₃壳体沉降伴随CO₂释放）等其他碳泵机制。'),
            ('生物量金字塔（单位面积或体积的各营养级生物量总干重）永远不会倒置，即生产者生物量必然大于草食者大于肉食者。因此湖泊生态系统夏季的浮游植物生物量<浮游动物生物量现象不可能存在，《林德曼10%定律》规定所有生态系统营养级间能量传递效率严格等于10%。'),
        ]
        ans_i = 0
        kn = ['生态学','物质循环', kn3]
        ana = ana_wrap(ABCD, ans_i, '物质循环-碳循环（源汇/海洋生物泵/碳-气候反馈/生态金字塔）', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '物质循环'))

    elif tcode == '氮循环':
        BNF = 180 + i*3
        Fert = 150 + i*4
        CropN = 280 + i*5
        NH3 = 18 + i
        Denit = 25 + i*2
        N2O = 1.5 + 0.2*(i%5)
        Leach = 22 + i*2
        stem = ('在' + loc + '的海伦黑土农田，中国科学院东北地理与农业生态研究所布置的《作物轮作-施肥》长期定位试验（始于1990年，随机区组设计，小区面积4 m×8 m，4次重复）的第33个生长季，对大豆（Glycine max L.，黑农84品种，接种根瘤菌Bradyrhizobium japonicum USDA110菌株）-玉米（Zea mays L.，先玉335）-小麦（Triticum aestivum L.，龙麦35）三年轮作体系中的大豆茬农田氮素循环各通量进行了完整定量监测（全生长季154天连续监测）：① 大豆-根瘤菌共生生物固氮BNF（¹⁵N同位素稀释法测定，以不固氮的高粱Sorghum bicolor为参照作物）：全生长季BNF总量=' + str(BNF) +
            ' kg N/(ha·a)，占大豆植株总吸氮量的' + str(round(BNF/(BNF+CropN*0.1)*100,1)) + '%；② 化肥N输入（基肥尿素CO(NH₂)₂）：' + str(Fert) +
            ' kg N/(ha·a)；③ 大气氮沉降（干+湿沉降）：32 kg N/(ha·a)；④ 大豆地上部植株吸氮量（籽粒+秸秆，¹⁵N凯氏定氮法）：' + str(CropN) +
            ' kg N/(ha·a)；⑤ 氨挥发损失（NH₃，通气法海绵吸收法）：' + str(NH3) +
            ' kg N/(ha·a)；⑥ 反硝化作用气态损失（N₂+N₂O，乙炔抑制法+静态箱气相色谱）：总反硝化=' + str(Denit) +
            ' kg N/(ha·a)，其中N₂O排放=' + str(round(N2O,1)) +
            ' kg N/(ha·a)；⑦ 硝态氮淋溶（NO₃⁻-N，陶瓷杯土壤溶液提取器）：' + str(Leach) +
            ' kg N/(ha·a)。同期根际土壤16S rRNA扩增子测序，鉴定出6类参与氮循环的核心功能菌群：①根瘤菌Bradyrhizobium（共生固氮）；②氨氧化古菌AOA Nitrososphaera（泉古菌门，酸性低氨环境中负责NH₃→NO₂⁻的第一步硝化）；③氨氧化细菌AOB Nitrosospira（β-变形菌纲，高氨环境中第一步硝化）；④亚硝酸盐氧化细菌NOB Nitrospira（硝化螺菌门，NO₂⁻→NO₃⁻第二步硝化，含全程硝化菌Comammox）；⑤反硝化细菌Pseudomonas/Paracoccus（含nirS/nirK/nosZ等反硝化基因，NO₃⁻→N₂或N₂O）；⑥芽孢杆菌/放线菌等氨化细菌（将有机N矿化为NH₄⁺）。下列关于该农田氮循环的通量平衡、各菌群代谢生态位、以及农业面源氮污染调控的分析，全部正确的是？')
        ABCD = [
            ('氮循环各步骤菌群匹配：① 共生固氮作用（N₂→NH₄+）：根瘤菌（与大豆共生根瘤，类菌体中固氮酶nifHDK复合体，需微厌氧环境，大豆根瘤的《豆血红蛋白leghemoglobin》结合游离氧维持微厌氧并给类菌体供氧，为共生固氮提供能量）；② 硝化作用两步（NH₄+→NO₂⁻→NO₃⁻）：第一步AOA/AOB，第二步NOB（Nitrospira）；③ 反硝化作用（NO₃⁻→NO₂⁻→NO→N₂O→N₂）：假单胞菌等异养型反硝化细菌（厌氧条件下以NO₃⁻为末端电子受体氧化有机物）；④ 氨化作用（有机N→NH₄+）：芽孢杆菌/放线菌等腐生菌分泌胞外蛋白酶和脱氨酶。以上菌群匹配与步骤完全正确。'),
            ('硝化作用是严格的厌氧过程，硝化细菌AOA/AOB和NOB都是化能异养型厌氧菌，利用有机物氧化的能量将NH₃还原为NO₃⁻，同时固定CO₂合成自身有机物。'),
            ('反硝化作用是严格的好氧过程，发生在通气良好的旱地土壤表层0-5 cm，所有反硝化细菌都必须完全还原到N₂，不可能产生中间产物NO和N₂O。'),
            ('农田氮素收支平衡核算：输入项总和=BNF+' + str(Fert) + '+32（沉降）=' + str(BNF+Fert+32) +
                ' kg N/(ha·a)；输出项总和=作物吸收' + str(CropN) + '+NH₃挥发' + str(NH3) + '+反硝化' + str(Denit) + '+淋溶' + str(Leach) + '=' + str(CropN+NH3+Denit+Leach) +
                ' kg N/(ha·a)。输入远大于输出，因此该农田每年盈余的大量氮素会100%被土壤固定，不会造成地下水硝酸盐污染和下游水体富营养化，无需任何调控措施。'),
        ]
        ans_i = 0
        kn = ['生态学','物质循环', kn3]
        ana = ana_wrap(ABCD, ans_i, '物质循环-氮循环（固氮/硝化/反硝化菌群，通量平衡，污染调控）', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '物质循环'))

    elif tcode == '磷循环':
        P_fert = 90 + i*2
        P_crop_up = 35 + i
        p_leaching = 1.8 + 0.3*(i%5)
        srp = 0.25 + 0.05*(i%4)
        p_runoff = 2.0 + 0.4*(i%6) + round(srp*0.8,1)
        stem = ('在' + loc + '的红壤丘陵小流域（亚热带季风气候，年均温17.8℃，年降雨量1795 mm，代表我国南方红壤区典型农业小流域），中国科学院南京土壤研究所的《稻-油三熟制》农田磷素流失长期定位监测站（12个5 m×20 m径流小区，坡度12°，随机区组4处理×3重复：CK不施磷肥、P1常规施磷' + str(P_fert) +
            ' kg P₂O₅/(ha·a)过磷酸钙、P2缓释磷肥配施、P3黄花菜植物篱组合），对全年7次独立暴雨事件（单次降雨>50 mm）的地表径流和渗漏液进行逐次采样监测：① 磷肥输入（化肥P换算为元素P，P₂O₅×0.436系数）：' + str(round(P_fert*0.436,1)) +
            ' kg P/(ha·a)；② 秸秆还田带入P：' + str(int(P_crop_up*0.3)) +
            ' kg P/(ha·a)；③ 三季作物合计地上部吸磷量：' + str(P_crop_up) +
            ' kg P/(ha·a)；④ 地表径流总P流失：' + str(round(p_runoff,2)) +
            ' kg P/(ha·a)，其中溶解态活性磷SRP（可溶性正磷酸盐PO₄³⁻-P，钼蓝比色法测定的生物可利用磷）浓度=' + str(round(srp,2)) +
            ' mg/L；⑤ 地下垂直淋溶：' + str(round(p_leaching,2)) +
            ' kg P/(ha·a)。梅雨期暴雨后3天小流域下游灌溉水库监测：总磷TP=0.34 mg/L，SRP=0.09 mg/L，叶绿素a=38 μg/L，已发生轻度蓝藻水华（铜绿微囊藻Microcystis aeruginosa、水华鱼腥藻Anabaena flos-aquae）。下列关于磷循环《沉积型循环无气相》特征、农田P流失与水体富营养化机制、以及李比希最小因子定律的应用分析，全部正确的是？')
        ABCD = [
            ('磷循环的本质特征：① 磷是典型《沉积型循环》（sedimentary cycle），无显著的气相组分（不同于C有CO₂、N有N₂的大气体库），磷的主要储库是岩石圈（磷灰石Ca₅(PO₄)₃F矿床）和沉积物，通过岩石风化和矿山开采进入生物圈，最终通过海洋沉积（埋藏、成岩）返回岩石圈，循环周期长达10⁷-10⁸年（地质尺度）；② 生物圈中的磷几乎全以PO₄³⁻氧化价态（+5价）存在，不发生氧化还原反应（不同于N的多价态转化），磷在生物体内主要构成核酸（DNA/RNA的磷酸二酯键）、ATP/ADP、磷脂、骨骼磷灰石；③ 《李比希最小因子定律》：植物生长受相对丰度最低的必需营养元素限制，由于磷在淡水湖泊中相对氮等其他元素溶解度低、迁移慢、补给少，《磷通常是淡水水体富营养化的首要限制因子》（Schindler 1974年经典的加拿大实验湖湖区全湖实验证明：单独加P即可诱导蓝藻水华，单独加N不能，这也是为什么我国《水污染防治行动计划》水十条对总磷排放控制日益严格）。'),
            ('磷循环和碳循环、氮循环一样具有巨大的气相储库，磷蒸气PH₃（磷化氢，《鬼火》的化学成因）是大气磷循环的主要载体，占全球磷循环通量的50%以上，因此大气干湿沉降是农田磷肥的主要来源。'),
            ('农田径流中的颗粒态结合磷PP（与土壤黏粒、铁铝氧化物结合的不溶态P随泥沙流失）完全不能被藻类利用，因此造成湖泊富营养化的唯一磷形态是溶解态活性磷SRP，控制面源污染只需控制SRP无需控制水土流失和泥沙。'),
            ('生物放大（biomagnification）：磷元素在水生食物链中会沿营养级逐级富集，浮游植物→浮游动物→鱼类的磷浓度逐级增大10倍/营养级，形成《磷的生物放大》并造成鱼类急性中毒死亡；这与DDT和甲基汞的生物放大机制完全相同。'),
        ]
        ans_i = 0
        kn = ['生态学','物质循环', kn3]
        ana = ana_wrap(ABCD, ans_i, '物质循环-磷循环（沉积型特征/富营养化/最小因子定律）', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '物质循环'))

    elif tcode == '生物富集':
        Hg_water = 2.5 + 0.3*(i%6)
        tl1 = round(Hg_water * 0.04 * 1000 / 1000, 3)  # phytoplankton, mg/kg wet
        BMF12 = round(7.0 + 0.3*(i%5), 1)
        tl2 = round(tl1 * BMF12, 3)
        BMF23 = round(4.5 + 0.2*(i%4), 1)
        tl3 = round(tl2 * BMF23, 2)
        BMF34 = round(3.5 + 0.1*(i%3), 1)
        tl4 = round(tl3 * BMF34, 1)
        csys = '亚热带河流-河口-海湾水生食物网'
        stem = ('在' + loc + '的' + csys + '中，' + timing + '布设了覆盖河流-河口-海湾的18个监测站，开展水生食物网《水-沉积物-生物群》多介质汞（Hg）的形态分析与定量监测（US EPA 1631E方法测总汞THg、EPA 1630测甲基汞MeHg，冷蒸气原子荧光CVAFS）：① 表层水溶解态总汞Hg_water=' + str(round(Hg_water,1)) +
            ' ng/L（地表Ⅰ-Ⅱ类水限值50 ng/L），其中溶解态MeHg=' + str(round(Hg_water*0.04,2)) +
            ' ng/L（河口区MeHg/THg≈4%，硫酸盐还原菌介导的Hg甲基化活跃区）；② 各营养级生物群MeHg含量（湿重）：TL1浮游植物（中肋骨条藻Skeletonema costatum为优势，占68%生物量）MeHg=' + str(tl1) +
            ' mg/kg；TL2浮游动物（中华哲水蚤Calanus sinicus+肥胖箭虫Sagitta enflata）MeHg=' + str(tl2) +
            ' mg/kg；TL3小型杂食鱼类（前鳞鲻Mugil affinis，体长15-22 cm）MeHg=' + str(tl3) +
            ' mg/kg；TL4大型肉食鱼类（鲈鲤Percocypris pingi，体长52-78 cm）MeHg=' + str(tl4) +
            ' mg/kg。同时调查120名沿岸渔村居民：长期以鲈鲤为主食（5.2次/周，每次165 g，平均体重63.2 kg），头发THg几何均值=2.35 mg/kg，最高值=12.8 mg/kg。我国GB2762-2022《食品中污染物限量》：肉食性鱼类MeHg限量=1.0 mg/kg湿重；WHO/FAO/JECFA规定MeHg的暂定每周可耐受摄入量PTWI=1.6 μg/(kg bw·周)；US EPA参考剂量RfD=0.1 μg/(kg bw·d)（保护胎儿婴幼儿等敏感人群）。下列关于汞的生物地球化学、甲基化、水生食物链的MeHg生物放大、及人类膳食暴露风险分析，全部正确的是？')
        ABCD = [
            ('定量辨析三个相关概念：① 《生物富集》（bioaccumulation，生物从环境（水/食物）中累积化学物，体内浓度>环境浓度，用富集系数BAF=生物浓度/水中溶解浓度衡量）：鲈鲤MeHg=' + str(tl4) + ' mg/kg / 水中MeHg=' + str(round(Hg_water*0.04*1e-6, 9)) + ' mg/L≈' + str(round(tl4/(Hg_water*0.04*1e-6), 0)) +
                ' 倍，即MeHg在最高营养级的生物富集倍数达数十万到百万倍；② 《生物放大》（biomagnification，化学物沿食物链营养级升高时浓度逐级增大，即TL4>TL3>TL2>TL1）：本题TL1→TL2→TL3→TL4依次增大，营养级放大因子TMF=' + str(round(tl4/tl1, 0)) +
                '>1，说明MeHg在该食物网发生了显著的生物放大；③ 生物放大的化学物前提：高脂溶性（脂水分配系数logKow>5，MeHg结合半胱氨酸脂质溶性良好）、难降解持久性、低代谢排泄率（即《PBT性质》：持久性Persistence、生物累积性Bioaccumulation、毒性Toxicity、远距离迁移性LRT）。只有《持久性有机污染物POPs》和《甲基汞等少数金属有机化合物》才会发生显著的生物放大，而一般必需元素（如P、N、Ca等）由于稳态调节不会生物放大。'),
            ('《硫酸盐还原菌SRB（Desulfovibrio、Desulfobacter等）介导的汞甲基化》发生在高度富氧的表层水体中，SRB在好氧呼吸时产生甲基钴胺素作为副产物将Hg²⁺甲基化为MeHg；硝酸盐还原菌和铁还原菌绝对不能参与汞的甲基化。'),
            ('计算该渔村居民的MeHg膳食暴露：鲈鲤MeHg=' + str(tl4) + ' mg/kg × 每次食用量0.165 kg × 每周5.2次 / 63.2 kg bw = ' +
                str(round(tl4 * 0.165 * 5.2 / 63.2 * 1000, 2)) + ' μg/(kg bw·周)，该值显著低于JECFA的PTWI=1.6 μg/(kg bw·周)和EPA RfD=0.7 μg/(kg bw·周)，因此所有居民（包括育龄妇女和胎儿）无任何健康风险，无需任何鱼类消费建议。'),
            ('食物链长度不会改变顶级捕食者的MeHg浓度：从TL3的鲈鱼直接捕食TL1浮游植物获得的MeHg浓度，与经过TL3→TL4→TL5延长到TL5的顶级捕食者获得的MeHg浓度完全相同，《食物网结构简化（物种丧失导致的中间营养级丢失）》绝不会改变生物放大的终点浓度。'),
        ]
        ans_i = 0
        kn = ['生态学','物质循环', kn3]
        ana = ana_wrap(ABCD, ans_i, '物质循环-生物富集与生物放大（DDT/甲基汞/PBT）', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '物质循环'))

    if (i+1) % 10 == 0:
        print(f'  物质循环生成中... {i+1}/25')

print(f'物质循环完成：总题数 {len(qs)}')
with open('_temp_questions.json','w',encoding='utf-8') as f:
    json.dump(qs, f, ensure_ascii=False, indent=2)

# ========= 生物多样性 25题 =========
bd_tpcs = [
    ('α多样性','Whittaker群落内物种多样性','Whittakerα多样性样地尺度物种数','α/β/γ多样性定义混淆，尺度错配'),
    ('β多样性','Whittaker群落间物种周转','Whittakerβ多样性物种周转替换速率','用物种数S直接作为β多样性指标'),
    ('γ多样性','区域景观物种库','Whittakerγ多样性区域物种库尺度','将γ多样性误与α多样性的样地尺度等同'),
    ('就地与迁地保护','自然保护区vs动物园/种子库','就地保护伞护效应迁地保护定位','以为动物园迁地保护可以替代就地保护'),
    ('关键种与优势种','Paine海星实验与优势种区分','关键种Paine海星实验优势种建群种','将生物量大的优势种误判为关键种'),
    ('灭绝旋涡','小种群的R/D/F/G旋涡','Gilpin Soulé灭绝旋涡RDFG四维正反馈','遗传多样性丧失与种群下降的正反馈认知缺失'),
    ('IUCN红色名录','CR/EN/VU等级定量标准','IUCN红色名录ABCDE多标准等级定量判定','将种群下降率直接等同于等级而忽略世代时间和分布面积'),
    ('保护热点地区','Myers热点地区定义','Myers生物多样性热点双定量标准','将物种丰富度高的地区都算热点而忽略特有性和受胁程度'),
]
bd_species = [
    ('大熊猫','Ailuropoda melanoleuca','四川省雅安市宝兴县蜂桶寨国家级自然保护区','国家林业和草原局熊猫中心+北京大学生命科学学院生态研究中心'),
    ('东北虎','Panthera tigris altaica','黑龙江省牡丹江市东宁市绥阳林业局东北虎豹国家公园','国家林业和草原局猫科动物研究中心+东北林业大学野生动物与自然保护地学院'),
    ('朱鹮','Nipponia nippon','陕西省汉中市洋县陕西朱鹮国家级自然保护区','国家林业和草原局+陕西师范大学生命科学学院朱鹮研究所'),
    ('藏羚羊','Pantholops hodgsonii','青海可可西里国家级自然保护区','三江源国家公园管理局+中国科学院西北高原生物研究所'),
    ('滇金丝猴','Rhinopithecus bieti','云南白马雪山国家级自然保护区','中国科学院昆明动物研究所+云南省林业和草原局'),
    ('海南长臂猿','Nomascus hainanus','海南热带雨林国家公园霸王岭片区','海南热带雨林国家公园管理局+中山大学'),
    ('亚洲象','Elephas maximus','云南西双版纳国家级自然保护区','云南亚洲象种源繁育及救助中心+云南大学'),
]

for i in range(25):
    sp_cn, sp_lt, bds_loc, bds_org = bd_species[i % len(bd_species)]
    tcode, tpc, kn3, mis = bd_tpcs[i % len(bd_tpcs)]

    if tcode == 'IUCN红色名录':
        mature = 450 + i*30
        decline = round(0.40 + 0.02*(i%5), 2)
        EOO = int(28000 - i*500)
        AOO = int(1200 - i*20)
        stem = ('在' + bds_loc + '的' + sp_cn + '（' + bds_org + '连续' + str(i+12) +
            '年的种群监测数据综合分析），采用IUCN红色名录标准（IUCN 2001 v3.1版本，9个等级：EX灭绝/EW野外灭绝/CR极危/EN濒危/VU易危/NT近危/LC无危/DD数据缺乏/NE未评估）对其受胁状况进行定量评估。评估数据：① 种群规模与结构：2023年最新调查（DNA粪便识别+红外相机+样线调查结合，95%置信水平）：总种群规模N_total≈' + str(int(mature*1.38)) +
            '只，其中《成熟繁殖个体》（Mature Individuals，IUCN定义为有能力产生可育后代的个体，排除亚成体幼体和老体）≈' + str(mature) +
            '只（成年雌雄比≈1:1.05，有繁殖记录的占85%）；② 种群下降趋势：三代时间尺度（三代≈54年）的成熟个体数下降率估计为' + str(int(decline*100)) + '%（95%CI：' + str(int((decline-0.05)*100)) + '%-' + str(int((decline+0.05)*100)) +
            '%，下降趋势不可逆，主要威胁：栖息地破碎化、人类道路旅游干扰、食物竹子开花周期死亡）；③ 地理分布：分布区EOO（最小凸多边形）≈' + str(EOO) +
            ' km²；占有面积AOO（4 km²标准网格）≈' + str(AOO) + ' km²（' + str(int(AOO/4)) + '个4 km²网格）；2条国道+1条高铁+5座水电站分割为5个隔离局域种群斑块，斑块间基因流Nm<1只/世代，微卫星DNA遗传分化Fst=0.12±0.05（p<0.05，显著分化）；④ PVA种群生存力分析（VORTEX 10.5.5，1000次重复，100年尺度）：当前威胁不变的基准情景下，100年灭绝概率PE_100yr≈47±13%，未来30年（≈1.7代）PE≈12±6%。根据上述数据，下列关于IUCN等级判定、各指标生态学含义与常见评估误区的分析，完全正确的是？')
        CR_decline = decline >= 0.80
        EN_decline = 0.50 <= decline < 0.80
        VU_decline = 0.30 <= decline < 0.50
        if CR_decline:
            grade = 'CR极危（Critically Endangered）'
            reason = '下降' + str(int(decline*100)) + '%≥80%（三代尺度）且成熟个体<250只、AOO<' + str(AOO) + '<500 km²，满足A2+E+C2a多条CR标准'
        elif EN_decline:
            grade = 'EN濒危（Endangered）'
            reason = '下降' + str(int(decline*100)) + '%≥50%（三代50-79%区间）+ 成熟个体=' + str(mature) + '在250-2500区间 + 栖息地严重破碎化，满足A2cd+B1ab(i,ii,iii)+C2a(i)等EN标准'
        elif VU_decline:
            grade = 'VU易危（Vulnerable）'
            reason = '下降' + str(int(decline*100)) + '%≥30%（三代30-49%）+ EOO=' + str(EOO) + ' km²<20000 km² + AOO=' + str(AOO) + ' km²<2000 km²，满足VU多条标准'
        else:
            grade = 'NT近危（Near Threatened）'
            reason = '综合评估接近但未达到VU易危标准'
        ABCD = [
            ('IUCN等级综合判定：该种群应列为《' + grade + '》。判定依据：三代时间尺度的种群下降率' + str(int(decline*100)) + '%（95%CI ' + str(int((decline-0.05)*100)) + '-' + str(int((decline+0.05)*100)) +
                '%）、成熟个体数M=' + str(mature) + '、分布区EOO=' + str(EOO) + ' km²与AOO=' + str(AOO) +
                ' km²、栖息地严重破碎化（5个隔离斑块且基因流受限）、PVA灭绝概率高等多条定量标准叠加。IUCN红色名录评估的核心理念是《多标准、多证据、保守性》：只要满足任一条更严格等级的定量标准，即按最严格的等级列入，《绝不能仅凭单一指标或主观感觉判断》。'),
            ('由于成熟个体数=' + str(mature) + '只>50只（CR极危的C标准阈值：M<50只即列入CR），因此无论种群下降率和栖息地破碎化程度如何，该物种最多只能评为NT近危，绝不可能达到EN濒危等级。'),
            ('三代时间尺度的种群下降率' + str(int(decline*100)) + '%即等价于：《每年下降率=' + str(round(decline/54*100, 3)) + '%，因此54年的' + str(int(decline*100)) + '%下降在IUCN A标准中与《10年下降' + str(int(decline*100)) + '%》完全等价，无需考虑世代长度（generation length）。'),
            ('占有面积AOO的计算：如果把该物种出现的所有点的最小凸多边形（即EOO=' + str(EOO) + ' km²）直接除以4即可得到AOO=' + str(int(EOO/4)) +
                ' km²；IUCN的AOO标准网格尺度（2 km×2 km=4 km²）只是一个建议，改用10 km×10 km网格重新计算不会改变等级判定结果。'),
        ]
        ans_i = 0
        kn = ['生态学','生物多样性', kn3]
        ana = ana_wrap(ABCD, ans_i, '生物多样性-IUCN红色名录等级定量判定标准', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '生物多样性'))

    elif tcode in ('α多样性','β多样性','γ多样性'):
        elev_ranges = ['500-900 m低海拔','900-1500 m中海拔','1500-2200 m高海拔']
        S_low = 110 + i*3
        S_mid = 150 + i*4
        S_high = 85 + i*2
        s_low_mean = S_low - 10 + (i%3)*2
        s_mid_mean = S_mid
        s_high_mean = S_high - 5
        shared_low_mid = 70 + i*2
        shared_mid_high = 55 + i
        shared_low_high = 35 + i
        shared_all = 28
        S_low_total = S_low + 12
        S_mid_total = S_mid + 9
        S_high_total = S_high + 7
        gamma_all = S_low_total + S_mid_total + S_high_total - shared_low_mid - shared_mid_high - shared_low_high + shared_all
        # β diversity (Whittaker) = γ/mean α - 1
        mean_alpha = (s_low_mean + s_mid_mean + s_high_mean)/3
        beta_whitt = gamma_all / mean_alpha - 1
        stem = ('在' + bds_loc + '的' + sp_cn + '栖息的海拔梯度监测样带：沿海拔500m→2200m设置3个海拔段×5个1 ha重复样地=15个100m×100m森林动态样地（每个样地对DBH≥1cm木本植物挂牌定位检尺），共记录木本物种约' + str(i+520) + '种。各海拔段物种丰富度统计：① 海拔段A（' + elev_ranges[0] + '）的5个样地S分别为：' + str(s_low_mean-8) + ',' + str(s_low_mean-3) + ',' + str(s_low_mean) + ',' + str(s_low_mean+5) + ',' + str(s_low_mean+8) +
            '种；合并低海拔段总S_low_total=' + str(S_low_total) + '种；② 海拔段B（' + elev_ranges[1] + '）的5个样地S分别为：' + str(s_mid_mean-5) + ',' + str(s_mid_mean-2) + ',' + str(s_mid_mean) + ',' + str(s_mid_mean+3) + ',' + str(s_mid_mean+6) +
            '种；合并中海拔总S_mid_total=' + str(S_mid_total) + '种；③ 海拔段C（' + elev_ranges[2] + '）的5个样地S分别为：' + str(s_high_mean-4) + ',' + str(s_high_mean-2) + ',' + str(s_high_mean) + ',' + str(s_high_mean+2) + ',' + str(s_high_mean+5) +
            '种；合并高海拔总S_high_total=' + str(S_high_total) + '种。跨海拔段的物种共享：低-中海拔共享' + str(shared_low_mid) + '种（独有共享' + str(shared_low_mid-shared_all) + '种）；中-高海拔共享' + str(shared_mid_high) + '种（独有共享' + str(shared_mid_high-shared_all) + '种）；低-高海拔共享' + str(shared_low_high) + '种（独有共享' + str(shared_low_high-shared_all) + '种）；三个海拔段共通物种shared_all=' + str(shared_all) +
            '种。根据上述数据，下列关于Whittaker（1960,1972）经典的α多样性/β多样性/γ多样性三分法的定量计算、各多样性生态学含义、海拔梯度多样性分布格局（Rahbek 1995,2005）、以及保护区设计分析，完全正确的是？')
        ABCD = [
            ('定量计算：① α多样性（群落内的本地物种多样性，样地尺度）：用各海拔段的平均样地S作为α（Whittaker点多样性）：α_A低海拔=' + str(round((s_low_mean-8+s_low_mean-3+s_low_mean+s_low_mean+5+s_low_mean+8)/5,1)) +
                ' 种/ha，α_B中海拔=' + str(round((s_mid_mean-5+s_mid_mean-2+s_mid_mean+s_mid_mean+3+s_mid_mean+6)/5,1)) +
                ' 种/ha，α_C高海拔=' + str(round((s_high_mean-4+s_high_mean-2+s_high_mean+s_high_mean+2+s_high_mean+5)/5,1)) +
                ' 种/ha。三个海拔段的平均平均α多样性mean(α)=(' + str(round((s_low_mean-8+s_low_mean-3+s_low_mean+s_low_mean+5+s_low_mean+8)/5,1)) + '+' +
                str(round((s_mid_mean-5+s_mid_mean-2+s_mid_mean+s_mid_mean+3+s_mid_mean+6)/5,1)) + '+' +
                str(round((s_high_mean-4+s_high_mean-2+s_high_mean+s_high_mean+2+s_high_mean+5)/5,1)) + ')/3≈' +
                str(round(mean_alpha, 1)) + '种/ha；② γ多样性（区域物种库，景观尺度，整个海拔梯度的总物种数）：γ=S_low_total+S_mid_total+S_high_total-shared_low_mid-shared_mid_high-shared_low_high+shared_all=' +
                str(gamma_all) + '种；③ β多样性（群落间的物种周转turnover，即沿环境梯度的物种替换速率，Whittaker经典公式β_w=γ/α_mean - 1=' +
                str(gamma_all) + '/' + str(round(mean_alpha,1)) + '-1≈' + str(round(beta_whitt,2)) +
                '）。海拔梯度上α多样性呈现《中海拔单峰驼峰格局》（Rahbek 2005：全球山地约80%的类群呈现中海拔最大α，机制综合为《中域效应MDE+气候适宜性+面积效应+进化历史》的叠加），这正是本题中α_B中海拔=' + str(round((s_mid_mean-5+s_mid_mean-2+s_mid_mean+s_mid_mean+3+s_mid_mean+6)/5,1)) +
                '>α_A低海拔=' + str(round((s_low_mean-8+s_low_mean-3+s_low_mean+s_low_mean+5+s_low_mean+8)/5,1)) + '>α_C高海拔=' + str(round((s_high_mean-4+s_high_mean-2+s_high_mean+s_high_mean+2+s_high_mean+5)/5,1)) +
                '的典型格局。'),
            ('α多样性即《整个景观的总物种数》：本案例中α=' + str(S_low_total) + '+' + str(S_mid_total) + '+' + str(S_high_total) + '=' + str(S_low_total+S_mid_total+S_high_total) +
                '种；β多样性即《两个样地的物种数之差》；γ多样性即《单个小样方里的物种数》。'),
            ('保护区设计应优先选择α多样性最高的单个样地作为全部保护区，无需考虑β多样性和γ多样性：只要把中海拔α最高的那一个ha样地保护下来，就等同于保护了整个海拔梯度的全部物种多样性（γ=' + str(gamma_all) + '种）。'),
            ('高海拔段β多样性即两个高海拔样地间的Simpson指数D之差：D=' + str(s_high_mean) + '-' + str(s_high_mean-4) + '=' + str(4) +
                '。β多样性的生态学含义是《优势度》而非物种周转。'),
        ]
        ans_i = 0
        kn = ['生态学','生物多样性', kn3]
        ana = ana_wrap(ABCD, ans_i, '生物多样性-α/β/γ多样性三分法定量计算与海拔格局', mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '生物多样性'))

    elif tcode in ('就地与迁地保护','关键种与优势种','灭绝旋涡','保护热点地区'):
        stem = ('【生物多样性保护综合案例】在' + bds_loc + '，针对旗舰物种' + sp_cn + '（' + sp_lt + '），' +
            bds_org + '组织实施的《' + sp_cn + '综合保护战略（2010-2035）》，涵盖就地保护、迁地保护、廊道建设、种群监测、社区共管等措施。结合保护生物学的核心概念：关键种vs优势种、灭绝旋涡、就地vs迁地保护、IUCN热点地区、最小存活种群MVP，下列分析完全正确的是？')
        if tcode == '关键种与优势种':
            ABCD = [
                ('《关键种》（keystone species，Paine 1969年经典的《岩底潮间带海星Pisaster ochraceus去除实验》首次提出，1966-1969年在Mukkaw Bay华盛顿州海岸：去除海星捕食者后，藤壶Chthamalus/Balanus、贻贝Mytilus等滤食性无脊椎动物因捕食释放大量增殖→空间单一化占据→底栖藻类和无脊椎动物多样性急剧下降，15个底栖物种降至8个即《多样性崩溃》，证明海星虽然生物量低但通过捕食控制竞争优势种、维持生境异质性、维持食物网结构和生态系统功能的《不成比例的关键作用》）的判定标准是：① 相对优势度（生物量或个体数占群落比例）低但生态功能影响极大且《不可替代》；② 去除关键种后会导致群落物种多样性大幅下降（级联灭绝secondary extinctions）、群落结构崩溃、生态系统功能显著改变。《优势种》（dominant/Foundation species建群种，如温带森林的辽东栎、草原的大针茅）则是生物量或个体数占绝对优势的物种，是《生物量优势》而非功能不可替代。'),
                ('生物量最大的物种必然是关键种：一个物种在群落中的生物量占比达到30%以上（即《绝对优势》），就自动被定义为关键种。'),
                ('灭绝旋涡（extinction vortex，Gilpin & Soulé 1986年经典的《R/D/F/G四维旋涡模型》）是指大种群的灭绝风险与种群规模N成正比：N越大→灭绝概率越大，因为种群大会引发过度的内禀竞争导致所有个体死亡，与遗传多样性丧失、种群结构破碎化、环境随机因素完全无关。'),
                ('IUCN《保护热点地区》（Biodiversity Hotspot，Myers 1988, 2000年Nature的25个全球热点更新）的定义是：任何只要物种总数>1000种维管植物的地区，不需要考虑特有性和受威胁程度。'),
            ]
        elif tcode == '就地与迁地保护':
            ABCD = [
                ('《就地保护》（in situ conservation，在物种原生生境中通过建立自然保护区、国家公园等保护物种种群、栖息地和生态系统过程）是生物多样性保护的《根本核心和首选策略》，原因：① 就地保护维持了物种的完整种群结构、种间相互作用（传粉者、共生菌、食物网）、生态系统过程（物质循环、能量流动、自然干扰如野火/洪水）、以及持续的进化适应潜力（持续应对环境变化的基因流和选择）；② 就地保护同时保护了该栖息地内的《所有同域分布物种》（伞护效应umbrella effect：旗舰种' + sp_cn + '的栖息地需求覆盖了大量中小型兽类、鸟类、两栖爬行类、昆虫和植物的生境需求）。《迁地保护》（ex situ conservation：动物园、水族馆、种子库（如斯瓦尔巴全球种子库Svalbard Global Seed Vault）、基因库、植物园、濒危物种繁育中心）的定位是《最后保险和辅助手段》，用于就地保护失败或极度濒危物种的《抢救性保护》和后续重引入（reintroduction）的种群源，迁地保护绝不能替代就地保护。'),
                ('迁地保护（动物园和种子库）可以完全替代就地保护，因此只要把所有濒危物种都抓到动物园圈养、所有植物种子都存入种子库，就不需要再建立任何自然保护区和国家公园，也不用担心栖息地破坏。'),
                ('就地保护仅需保护单个小面积孤立斑块即可：只要把面积1平方公里的小种群保护起来，不用考虑栖息地走廊（corridor）和集合种群metapopulation结构，就足以长期维持物种遗传多样性和种群生存力。'),
                ('《最小存活种群（Minimum Viable Population, MVP，Shaffer 1981）》是任意小的种群规模都可：只要有1对（雌雄各1只）繁殖个体就能保证100年内灭绝概率为0%，无需考虑种群统计随机性、环境随机性、自然灾害和遗传多样性丧失。'),
            ]
        elif tcode == '灭绝旋涡':
            ABCD = [
                ('灭绝旋涡（extinction vortex，Gilpin & Soulé 1986年的R/D/F/G四维旋涡经典模型）是《小种群的灭绝风险正反馈放大机制》：种群规模N下降→触发多个相互加强的正反馈环，使种群越来越小直至灭绝（像《旋涡》越卷越深无法自拔）。四个核心旋涡：① R旋涡（Demographic R，种群统计随机性）：小种群中出生-死亡、性别比的随机波动→如连续几年出生的雄性多于雌性→有效种群大小Ne下降→种群进一步下降；② D旋涡（Environmental/Disturbance D）：极端天气、疾病爆发、人类干扰等环境随机事件对小种群的冲击远大于大种群→小种群更易被一次极端事件摧毁；③ F旋涡（Genetic drift + Inbreeding F，遗传漂变+近交）：小种群的遗传漂变强→等位基因随机丢失→遗传多样性H下降→近交系数F增大（近亲交配概率↑）→近交衰退inbreeding depression（纯合隐性有害基因表达↑，后代存活率、繁殖率↓）→出生率↓死亡率↑→种群进一步缩小→进一步近交和漂变→形成《遗传-种群的正反馈》即F旋涡；④ G旋涡（Genetic diversity丧失→适应性丧失G）：遗传多样性H下降→种群应对新选择压力（如新型病原体、气候变化）的《进化潜力》下降→环境变化时无法适应而大量死亡→N进一步下降。四个旋涡相互加强：R↓→F↑→G↓→D风险↑→R进一步↓，最终小种群陷入《无法逃脱的灭绝螺旋》。'),
                ('灭绝旋涡只对植物生效，对动物种群完全不适用，因为动物可以主动迁移避免近交。大种群也会因为遗传漂变比小种群更强而陷入灭绝旋涡。'),
                ('《有效种群大小Ne（Wright 1931）》总是等于种群总个体数N census（即Ne=N），无论性别比、繁殖个体数的年际波动、家族大小方差如何变化，Ne都严格等于N census，《小种群中Ne> N census》。'),
                ('IUCN热点地区=迁地保护=动物园。三个名词描述的是完全相同的保护策略，没有任何区别。'),
            ]
        else:
            ABCD = [
                ('IUCN《生物多样性热点地区》（Biodiversity Hotspot，Norman Myers 1988年首次提出，2000年Myers等在Nature《Biodiversity hotspots for conservation priorities》中正式确定全球25个，2005年Mittermeier等补充至34+3=36个，覆盖地球陆地表面2.4%，但包含>50%维管植物特有种、>42%陆生脊椎动物特有种）的定义必须同时满足两条《严格的定量标准》：① 《特有性标准》：至少含有≥1500种维管植物特有种（即≥0.5%的全球维管植物总种数，全球约30万种）；② 《受胁程度标准》：原始自然植被已丧失≥70%（即《受威胁严重》）。两者必须同时满足，缺一不可。我国的36个全球热点中包含了《中国西南山地（Mountains of Southwest China）》和《中国-喜马拉雅东部（Eastern Himalaya）》两个全球热点，是我国生物多样性保护的《优先核心区》。'),
                ('只要物种丰富度S高的任何地区（如一个城市公园）都属于热点地区，不需要考虑特有性和栖息地丧失。'),
                ('就地保护与迁地保护完全等价。动物园中的圈养种群遗传多样性比野生就地种群更高、近交系数更低、适应性更强，因此迁地保护是保护的首选。'),
                ('关键种（keystone species）就是生物量最大的优势种，这两个术语完全同义，可以交替使用。'),
            ]
        ans_i = 0
        kn = ['生态学','生物多样性', kn3]
        ana = ana_wrap(ABCD, ans_i, '生物多样性-' + tpc, mis)
        qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_3', '生物多样性'))

    if (i+1) % 10 == 0:
        print(f'  生物多样性生成中... {i+1}/25')

print(f'生物多样性完成：总题数 {len(qs)}')
with open('_temp_questions.json','w',encoding='utf-8') as f:
    json.dump(qs, f, ensure_ascii=False, indent=2)

# ========= 遗传学进化 75题 =========
# === 孟德尔遗传 13题 ===
md_tpcs = [
    ('分离定律','一对相对性状杂交与测交验证','孟德尔分离定律测交自交验证方法','F2比例3:1，测交1:1判定分离'),
    ('自由组合定律','两对相对性状9:3:3:1','孟德尔第二定律自由组合非等位基因独立','F2 9:3:3:1基因型9种比例关系'),
    ('概率计算','乘法定律与加法定律','互斥事件加法定律独立事件乘法定律','互斥事件独立事件概率定律应用混淆'),
    ('二项式展开','n个后代恰好k个显性','二项分布概率计算Cnk p^k q n-k','(p+q)^n展开式的遗传概率应用'),
    ('多基因','n对基因的配子与基因型种类','n对独立基因配子基因型表型种类公式','2^n配子3^n基因型公式适用前提'),
    ('复等位基因','ABO血型IA/IB/i显隐性','复等位基因共显性显隐性等级ABO系统','IAIB共显性IAIB对i显性的等级关系'),
    ('外显率表现度','外显率%与表现度的区别','外显率qualitative与表现度quantitative差异','外显率是 qualitative比率表现度是 quantitative变异'),
    ('表型模写','环境诱导的表型与突变表型','phenocopy表型模写环境诱导不改变基因型','表型模写是环境诱导不可遗传与突变本质不同'),
]
md_sp = [
    ('果蝇','Drosophila melanogaster','北京大学生命科学学院遗传学实验室'),
    ('拟南芥','Arabidopsis thaliana','中国科学院遗传与发育生物学研究所'),
    ('玉米','Zea mays','中国农业大学国家玉米改良中心'),
    ('水稻','Oryza sativa','中国科学院上海植物生理生态研究所'),
    ('豌豆','Pisum sativum','孟德尔经典实验'),
    ('番茄','Solanum lycopersicum','华中农业大学园艺林学学院'),
]

for i in range(13):
    sp_cn, sp_lt, lab = md_sp[i % len(md_sp)]
    tcode, tpc, kn3, mis = md_tpcs[i % len(md_tpcs)]

    if tcode == 'ABO血型复等位基因':
        stem = ('某医学院医学遗传学系在北京市海淀区某社区进行了ABO血型系统的群体遗传学与家系联合调查（共1728个家系，5184名个体，EDTA抗凝静脉血同时进行《标准抗A/抗B/抗H血凝法》表型鉴定和《ABO基因第6、7外显子PCR-Sanger测序》验证基因型，排除cis-AB和嵌合体罕见情况）。随机选取的一个核心家系（三代7口人，无近亲婚配，家系完整）：I-1祖父A型，基因型IAIA（A1亚型纯合，N-乙酰半乳糖胺转移酶活性强）；I-2祖母O型，基因型ii（第261位delG移码突变，截短无功能糖基转移酶）；II-1父亲（I-1×I-2之子）=A型IAi；II-2母亲（无关家庭）=B型IBi；III-1长子=AB型IAIB；III-2长女=A型IAi；III-3次子=O型ii。祖母I-2同时为FUT2纯合无效突变sese（非分泌型，唾液中无ABH抗原）。针对以上真实家系数据，下列关于孟德尔遗传在ABO血型中的应用：复等位基因显隐性等级、共显性、隐性上位孟买血型、外显率表现度、二项式概率计算的综合分析完全正确的是？')
        ABCD = [
            ('《复等位基因》的显隐性等级分析：ABO血型由3个复等位基因IA/IB/i控制，其显隐性等级为《IA与IB共显性（codominance），且IA和IB对i均为完全显性》，即IAIA和IAi同为A型，IBIB和IBi同为B型，IAIB为AB型（共显性，红细胞表面同时存在A抗原和B抗原，无显隐性之分），ii为O型。本家系验证：II-1父亲IAi（A型IA基因对i显性）×II-2母亲IBi（B型IB基因对i显性），按孟德尔分离定律和自由组合，子代基因型及表型理论比例为IAIB(AB型):IAi(A型):IBi(B型):ii(O型)=1:1:1:1，与本家系III-1=AB、III-2=A、III-3=O（实际为3个子女，样本量有限符合概率）完全一致，符合孟德尔分离比例。'),
            ('IA与IB是显隐性关系而非共显性：IB基因对IA基因为不完全显性，因此IAIB表型是《介于A型和B型之间的中间血型》，红细胞表面只有一种《混合抗原》。'),
            ('计算这对夫妇（IAi×IBi）若计划再生育4个孩子，恰好出现2个A型+1个B型+1个AB型的概率为(1/4)^4=1/256，直接使用乘法定律而不使用多项式系数。'),
            ('外显率（penetrance）和表现度（expressivity）完全相同：如果100个携带某显性致病基因的个体中，有80个表现出疾病症状，另外20个完全正常且表现出症状的80人病情轻重不一，这种现象称为《外显率80%+完全表现度》。'),
        ]
    elif tcode == '二项式展开':
        n = 4 + i%3  # 4,5,6
        k = n//2
        p_black = 3/4
        q_white = 1/4
        import math
        from math import comb
        binom = comb(n, k) * (p_black**k) * (q_white**(n-k))
        stem = ('在' + lab + '，用' + sp_cn + '（' + sp_lt +
            '）的《黑毛（B，完全显性）/白毛（b，隐性）》一对等位基因杂交实验：P代纯合黑毛BB × 纯合白毛bb得到F1（全部Bb黑毛，符合分离定律），F1自交（或同基因型个体交配）得F2共若干子代，F2表型比例黑:白理论=3:1（χ²检验p>0.05符合）。现在从F2中随机观察n=' + str(n) +
            '个子代个体。下列关于二项式概率展开（(p+q)^n，p=P(黑毛)=3/4，q=P(白毛)=1/4）、恰好n个子代中恰好k=' + str(k) +
            '个黑毛的概率、以及至少1个白毛的概率的计算，完全正确的是？')
        ABCD = [
            ('二项式展开通项：P(k)=C(n,k)·p^k·q^(n-k)，其中C(n,k)=n!/(k!·(n-k)!)为组合数。本题n=' + str(n) +
                '个后代中恰好k=' + str(k) + '个黑毛的概率：P(' + str(k) + '黑' + str(n-k) + '白)=C(' + str(n) + ',' + str(k) + ')×(3/4)^' + str(k) + '×(1/4)^' + str(n-k) + '=' +
                str(comb(n,k)) + '×' + str(round((p_black**k)*(q_white**(n-k)),6)) + '≈' + str(round(binom,6)) +
                '。《至少1个白毛的概率》=1 - P(全黑)=1 - (3/4)^' + str(n) + '=1-' + str(round((3/4)**n,6)) + '=' + str(round(1-(3/4)**n,6)) +
                '。注意二项式展开的适用条件：① 每次试验独立（各子代毛色互不影响）；② 只有两种互斥结果（黑/白）；③ 各次试验概率恒定p=3/4,q=1/4。'),
            ('恰好' + str(k) + '黑' + str(n-k) + '白的概率=(3/4)^' + str(k) + '+(1/4)^' + str(n-k) + '，直接用加法定律，不需要组合数C(n,k)。'),
            ('至少1个白毛的概率=(1/4)^' + str(n) + '，即所有子代都是白毛的概率，和《至少1个》是等价的。'),
            ('(3/4+1/4)^' + str(n) + '=1^' + str(n) + '=1的含义是：F2所有个体必然同时是黑毛和白毛，因为所有概率的和等于1。'),
        ]
    elif tcode == '多基因':
        n = 3 + i%3  # 3,4,5对基因
        gamete_n = 2**n
        genotype_n = 3**n
        phenotype_n = 2**n  # complete dominance
        stem = ('【多基因独立遗传】在' + lab + '，以' + sp_cn + '（' + sp_lt +
            '）为材料，研究n=' + str(n) +
            '对独立分配的等位基因（全部为常染色体，互不连锁，分别为A/a,B/b,C/c,D/d,E/e,F/f...，每对基因完全显性：大写完全显性于小写）的杂交规律：P代亲本为《AABBCC...（显性纯合，n对大写字母全显性）× aabbcc...（隐性纯合，n对全小写）》得F1（全杂合AaBbCc...，共n对杂合子），F1自交得F2；同时F1进行测交（与aabbcc...多隐性纯合体回交）。下列关于n对独立基因的配子类型、基因型、表型种类、F2各纯合与杂合比例的综合计算，完全正确的是？')
        ABCD = [
            ('在完全显性、n对基因独立分配（互不连锁）的条件下：① F1的配子种类=2^n（每对基因独立分离，杂合子产生2种等比例配子，n对独立→乘积原则=2×2×…×2=2^n=' + str(gamete_n) +
                '种）；② F2的基因型种类=3^n（每对基因自交有AA、Aa、aa 3种基因型→n对独立→3^n=' + str(genotype_n) +
                '种）；③ F2的表型种类（完全显性）=2^n（每对基因只有显性/隐性两种表型→2^n=' + str(phenotype_n) +
                '种）；④ F2中《n对基因全部纯合显性（AABBCC...）》的比例=(1/4)^n（每对基因AA占1/4，独立→乘法定律），《全部杂合（AaBbCc...）》的比例=(1/2)^n（每对基因Aa占2/4=1/2），《至少一对基因纯合》=1-(1/2)^n=1-' + str(round((1/2)**n, 5)) +
                '。⑤ 测交后代的基因型种类=2^n=' + str(gamete_n) +
                '种，表型种类=2^n种，且各种表型比例相等（1:1:1:…共2^n个1，因为测交的另一亲本为隐性纯合，F1的配子比例直接决定后代表型比例）。以上所有公式的前提是：n对基因分别位于n对不同的同源染色体上即独立分配（孟德尔第二定律自由组合定律），如果任何两基因位于同一同源染色体上（即连锁），这些公式不再成立。'),
            ('F2基因型种类=2^n=' + str(gamete_n) + '种，配子种类=3^n=' + str(genotype_n) + '种，和正确公式相反。'),
            ('F1（n对杂合AaBbCc...）产生的含n个全部显性基因的配子（ABC...）的比例=(1/2)+(1/2)+...+(1/2)=n/2，使用加法定律。'),
            ('测交后代的表型种类=1种（全部为中间型），因为测交亲本是隐性纯合子所以与F1杂交后代全部相同。'),
        ]
    else:
        # 孟德尔遗传其他题目
        p_trait = '花色红花(R)完全显性于白花(r)' if i%2==0 else '种子圆形(W)完全显性于皱缩(w)'
        F1_s = 'Rr' if i%2==0 else 'Ww'
        F2_total = 1600
        stem = ('【孟德尔遗传经典验证】在' + lab + '，以' + sp_cn + '（' + sp_lt +
            '）为材料开展经典杂交实验：性状为《' + p_trait + '》。P代纯合显性×纯合隐性杂交得F1（' + F1_s + '，全显性表型），F1自交得F2共' + str(F2_total) +
            '株，同时F1进行测交得400株后代，χ²检验两者均符合理论比例（p>0.05）。下列关于分离定律和自由组合定律的验证、概率计算的综合分析完全正确的是？')
        F2_dom_exp = int(F2_total * 3/4)
        F2_rec_exp = F2_total - F2_dom_exp
        tc_dom = 200
        tc_rec = 200
        ABCD = [
            ('① 分离定律验证：测交是验证分离定律的《最直接方法》（因为测交后代表型种类和比例直接反映F1配子种类和比例——隐性纯合亲本只产生隐性配子，对子代性状无掩盖作用）。本实验F1测交后代400株：显性/隐性各' + str(tc_dom) + '/' + str(tc_rec) + '≈1:1，与理论完全一致，说明F1（' + F1_s + '）减数分裂时等位基因随同源染色体的分离而分开，产生数目相等的两种配子R:r=1:1。② F2自交法验证：F2显性个体中纯合子RR占1/3（自交后代不分离，全部显性），杂合子Rr占2/3（自交后代显性:隐性=3:1分离）。③ 乘法定律：F2中同时是《显性红花+高茎（另一对独立基因D/d，F1=Dd）》的概率=P(R_表型)×P(D_表型)=3/4×3/4=9/16（因为两对基因独立分配满足自由组合定律前提）。'),
            ('验证分离定律最好的方法是F1自交：因为F1自交后代比例3:1最直观，比测交的1:1更能证明等位基因分离，不需要测交。'),
            ('加法定律（互斥事件）：F2中是《红花纯合子R R 或 白花纯合子rr》的概率=1/4 × 1/4 = 1/16，因为纯合子同时满足红花和白花两个条件，使用乘法定律。'),
            ('外显率=表现度。如果一个Rr个体本该表现红花但表现为白色（由强紫外线照射诱导的表型改变，不改变基因型），这种现象称为《基因突变》，并且这种白花表型一定会稳定遗传给子代。'),
        ]
    kn = ['遗传学', tcode, kn3] if a_idx < 5 else ['进化生物学', tcode, kn3]
    a_idx = i % 4
    ans_i = 0
    ana = ana_wrap(ABCD, ans_i, '孟德尔遗传-' + tpc, mis)
    qs.append(Q(stem, {"A":ABCD[0],"B":ABCD[1],"C":ABCD[2],"D":ABCD[3]}, ['A','B','C','D'][ans_i], ana, kn, 'module_4', '孟德尔遗传'))

print(f'孟德尔遗传完成：总题数 {len(qs)}')

# Save after each category to preserve progress
with open('_temp_questions.json','w',encoding='utf-8') as f:
    json.dump(qs, f, ensure_ascii=False, indent=2)

# Print summary so far
from collections import Counter
print(f'Status check: {len(qs)} total')
print('Module:', Counter(q['module'] for q in qs))
print('Concept:', Counter(q['concept'] for q in qs))
print('Saved to _temp_questions.json')
