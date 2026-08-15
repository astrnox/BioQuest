import sys
sys.path.insert(0, '/workspace/data')
from comp_batch_d_m3_animal import QUESTIONS as Q

NEW = [
  {
    "stem": "细胞毒性T淋巴细胞（CTL，CD8+效应T细胞）通过多种机制杀伤被病毒感染的靶细胞和肿瘤细胞，下列关于CTL活化与杀伤机制的叙述正确的是",
    "options": {
      "A": "CTL活化只需要TCR识别靶细胞表面MHC I-抗原肽复合物提供第一信号，不需要共刺激第二信号即可完全活化并获得杀伤功能",
      "B": "CTL的主要杀伤机制之一是穿孔素-颗粒酶通路：CTL与靶细胞免疫突触形成后，CTL胞质内嗜天青颗粒向突触方向极化释放，穿孔素（perforin，补体C9同源蛋白）在靶细胞膜上聚合形成跨膜孔道，颗粒酶B（丝氨酸蛋白酶）经孔道进入靶细胞胞质，直接剪切激活caspase-3及切割Bid→tBid→线粒体凋亡通路→诱导靶细胞凋亡",
      "C": "Fas/FasL通路是CTL杀伤的唯一备用机制，CTL表面Fas结合靶细胞表面的FasL后，Fas死亡结构域结合FADD→激活caspase-1→诱导靶细胞胀亡坏死",
      "D": "CTL杀伤具有高度MHC非限制性，一个CTL可以杀伤任何表达相应抗原的靶细胞，不需要识别靶细胞自身的MHC分子"
    },
    "answer": "B",
    "analysis": "A选项错误：CTL（CD8+初始T）活化需要严格的三个信号：①第一信号（抗原识别信号）：CTL前体TCR识别APC（交叉递呈的DC为主）表面MHC I类分子结合的抗原肽+pMHC I复合物，CD8共受体同时结合MHC Iα3结构域辅助稳定TCR-pMHC相互作用；②第二信号（共刺激信号）：DC表面B7.1/B7.2（CD80/CD86）结合CTL表面CD28→PI3K-AKT等增殖存活通路；③第三信号（细胞因子分化信号）：主要是DC分泌的IL-12和CTL自分泌IL-2→STAT4/STAT5→上调穿孔素、颗粒酶、IFN-γ等效应分子，向效应CTL终末分化；缺乏第二信号CTL会无能（anergy）不会活化。B选项正确：穿孔素-颗粒酶是CTL最主要的杀伤机制（占90%以上的杀伤效应）：①CTL通过TCR识别并紧密结合靶细胞表面pMHC I后，细胞膜接触区形成\"免疫突触\"（immunological synapse）——细胞骨架微管组织中心MTOC向突触方向重排，胞质内嗜天青颗粒（含穿孔素、颗粒酶、颗粒溶素的溶酶体样颗粒）沿微管向突触方向极化移动；②颗粒膜与CTL突触侧细胞膜融合通过胞吐释放颗粒内容物到突触间隙；③穿孔素（perforin，55~67kD，与补体C9氨基酸同源，属于MACPF家族）在Ca2+存在下构象改变暴露疏水区域，插入靶细胞膜脂质双分子层，多个穿孔素单体（约20个）多聚化形成内径约16nm的大跨膜孔道（类似MAC结构），破坏靶细胞膜通透性；④颗粒酶（granzyme，一类丝氨酸蛋白酶，CTL中最重要的是颗粒酶B，还有颗粒酶A/K/M等）随细胞外液经穿孔素孔道进入靶细胞胞质，颗粒酶B可以直接高效剪切激活下游效应caspase-3（剪切caspase-3前体产生活化的p20/p17），还可以间接剪切Bcl-2家族促凋亡蛋白Bid产生截短型tBid→tBid移位到线粒体外膜→Bax/Bak寡聚化→线粒体外膜通透化MOMP→细胞色素c释放→Apaf-1+ATP+细胞色素c组装凋亡小体apoptosome→激活起始caspase-9→再激活caspase-3/7放大级联→最终靶细胞以高度有序的凋亡方式死亡（胞膜出泡、核碎裂、凋亡小体形成、被邻近巨噬细胞吞噬不引起炎症）；此外颗粒内容物还含颗粒溶素（granulysin，能直接破坏微生物膜，杀伤胞内细菌如李斯特菌）。C选项错误：Fas/FasL是CTL杀伤的辅助备用通路（不是唯一，穿孔素-颗粒酶才是主要），方向和级联都错：①CTL杀伤的Fas通路方向是：CTL活化后细胞膜上瞬时高表达FasL（Fas配体CD178，属于TNF超家族II型跨膜蛋白），FasL结合靶细胞表面普遍表达的Fas（CD95死亡受体，属于TNF受体超家族I型跨膜蛋白，胞内段含DD死亡结构域），选项中将Fas/FasL表达方向说反（CTL表达FasL不是Fas）；②Fas结合FasL后发生三聚化→Fas胞内DD结合衔接蛋白FADD（Fas-associated death domain，胞质衔接蛋白，N端DED死亡效应结构域+C端DD）的DD→FADD通过DED结合起始caspase-8前体的DED→形成DISC死亡诱导信号复合物（Fas三聚体+FADD多聚体+caspase-8前体多聚体）→DISC中caspase-8前体因局部浓度升高发生同剪切自激活→产生活化的caspase-8异二聚体：caspase-8在I型细胞（胸腺细胞、活化淋巴细胞）直接剪切激活效应caspase-3/7→凋亡，在II型细胞（肝细胞、成纤维细胞）剪切Bid→tBid→线粒体通路放大凋亡；选项说成激活caspase-1（caspase-1是炎症小体底物，介导pyroptosis焦亡不是凋亡）和诱导胀亡坏死（necrosis，非程序性细胞死亡伴随炎症）完全错误，Fas通路诱导的是典型程序性凋亡。D选项错误：CTL杀伤是典型MHC I限制性杀伤，与CD4+Th的MHC II限制性是T细胞两大核心特征：①CTL的TCR必须同时识别靶细胞表面的\"抗原肽（识别特异性）+靶细胞自身同基因型的MHC I类分子（MHC限制性）\"，即双重识别；②MHC I限制性的起源是胸腺阳性选择：T细胞前体在胸腺皮质中只有那些TCR能结合自身（宿主）MHC I/II分子的DP细胞才存活下来（阳性选择），因此成熟后T只能识别递呈在同一个体自身MHC分子上的抗原肽；③经典实验证据-H-2基因限制现象（Zinkernagel和Doherty 1974年发现，1996年诺奖）：取淋巴细胞性脉络丛脑膜炎病毒LCMV免疫的H-2^b单倍型小鼠的脾CTL（含病毒特异性CTL），在体外只能杀伤H-2^b基因型且被LCMV感染的巨噬细胞或成纤维细胞，不能杀伤H-2^k（MHC I基因型不同）的LCMV感染靶细胞，即使H-2^k靶细胞同样表达LCMV病毒肽抗原也完全不被杀伤——因为其MHC I与TCR阳性选择的自身MHC I不同，TCR无法识别\"异基因型MHC I+病毒肽\"；选项说MHC非限制性完全错误，那是NK细胞的特点（丢失自我识别，不依赖MHC抗原递呈），CTL杀伤必须是TCR双重识别：抗原肽特异性+自身MHC I限制性。\n综上，CTL核心：活化三信号（TCR第一+B7/CD28第二+IL-12/IL-2第三）；主要杀伤=免疫突触→穿孔素孔道+颗粒酶B入胞→直接激活caspase-3+Bid→线粒体→凋亡（90%）；辅助杀伤=FasL（CTL）→Fas（靶）→FADD→caspase-8→凋亡；严格MHC I限制性（诺奖），无MHC错配杀伤。",
    "knowledge": ["动物生理学","免疫系统","CD8+CTL杀伤机制：活化三信号（TCR/CD28/IL-12-2）、核心穿孔素-颗粒酶B凋亡通路（免疫突触极化→穿孔素孔道+颗粒酶直接激活caspase-3及Bid→线粒体）、辅助FasL/Fas→FADD→caspase-8凋亡、Zinkernagel-Doherty MHC I类限制性双重识别原则"],
    "module": "module_3","difficulty": "league","target": "both","concept": "免疫系统"
  }
]

print(f"Adding {len(NEW)} new questions to existing {len(Q)}...")
Q.extend(NEW)

with open('/workspace/data/comp_batch_d_m3_animal.py', 'w') as f:
    f.write("QUESTIONS = [\n")
    for i, q in enumerate(Q):
        # Write question dict with repr-like but with proper unicode strings
        f.write("  {\n")
        for key in ["stem", "options", "answer", "analysis", "knowledge", "module", "difficulty", "target", "concept"]:
            val = q[key]
            if key == "options":
                f.write(f'    "{key}": {{"A": {repr(val["A"])}, "B": {repr(val["B"])}, "C": {repr(val["C"])}, "D": {repr(val["D"])}}},\n')
            elif key == "knowledge":
                f.write(f'    "{key}": [{repr(val[0])}, {repr(val[1])}, {repr(val[2])}],\n')
            else:
                f.write(f'    "{key}": {repr(val)},\n')
        if i < len(Q) - 1:
            f.write("  },\n")
        else:
            f.write("  }\n")
    f.write("]\n")

print(f"Written {len(Q)} questions total.")
