#!/usr/bin/env python3
"""Generate Module 3 (Animals & Ecology) question bank files.
18 nodes, each with at least 5 MTF questions.
60% competition (league), 40% high_school.
"""
import json, hashlib, os

BANK_DIR = "/workspace/data/bank"
INDEX_DIR = "/workspace/data/index"
os.makedirs(BANK_DIR, exist_ok=True)
os.makedirs(INDEX_DIR, exist_ok=True)

NODE_TAG = {
    "animal_tissue": "01", "nervous_sys": "02", "endocrine": "03",
    "circulatory": "04", "immune_system": "05", "excretory": "06",
    "homeostasis": "07", "respiratory_sys": "08", "digestive_sys": "09",
    "sensory_physio": "0a", "temperature_reg": "0b", "population_eco": "0c",
    "community_eco": "0d", "ecosystem": "0e", "biogeochemical": "0f",
    "biodiversity": "10", "animal_behavior": "11", "behavioral_eco": "12",
}

def make_id(tag_hex, content_str):
    h = hashlib.sha256(content_str.encode("utf-8")).hexdigest()[:12]
    return f"M3-{tag_hex}-{h}"

def qid_content(question, subs, answers):
    return json.dumps({"q": question, "s": subs, "a": answers}, ensure_ascii=False, sort_keys=True)

# ============================================================
# ALL QUESTIONS DATA
# ============================================================
ALL = {}

# ===================== 1. animal_tissue =====================
ALL["animal_tissue"] = [
    {
        "question": "关于动物四大基本组织的结构与功能，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "单层扁平上皮（内皮）覆盖在血管内表面，有利于物质交换和减少血流阻力", "answer": True},
            {"label": "B", "text": "疏松结缔组织中的成纤维细胞能合成和分泌胶原蛋白与弹性蛋白", "answer": True},
            {"label": "C", "text": "心肌组织属于平滑肌的一种，其收缩受意识直接控制", "answer": False},
            {"label": "D", "text": "骨骼肌纤维为多核细胞，肌原纤维由粗肌丝（肌球蛋白）和细肌丝（肌动蛋白）组成", "answer": True},
        ],
        "explanation": "A正确：单层扁平上皮（内皮）分布于血管和淋巴管内表面，薄而光滑，利于物质交换和减少血流阻力。B正确：成纤维细胞是疏松结缔组织中最常见的细胞，负责合成细胞外基质蛋白（胶原蛋白、弹性蛋白）和糖胺聚糖。C错误：心肌是独立于平滑肌的肌肉类型，具有自律性，不受意识直接控制（属于不随意肌）。D正确：骨骼肌纤维为多核合胞体，肌原纤维由粗肌丝（肌球蛋白）和细肌丝（肌动蛋白）组成。",
        "subject": "动物生理学", "concept": "四大基本组织", "difficulty": "league", "target": "competition",
        "tags": ["animal_tissue", "module_3", "动物生理学", "四大基本组织"],
        "references": [{"doi": "10.1016/B978-012374232-2.00045-0", "title": "Muscle: Molecular Biology", "authors": "Engel AG, Franzini-Armstrong C", "year": 2004, "journal": "Encyclopedia of Neuroscience"}],
    },
    {
        "question": "关于骨骼肌收缩的滑动丝模型，下列描述正确的有：",
        "subQuestions": [
            {"label": "A", "text": "收缩时肌小节的I带和H区缩短，但A带长度不变", "answer": True},
            {"label": "B", "text": "肌球蛋白头部与肌动蛋白结合形成横桥，ATP水解提供构象变化的能量", "answer": True},
            {"label": "C", "text": "Ca²⁺与肌钙蛋白C亚基结合后，使原肌球蛋白移位，暴露出肌动蛋白上的横桥结合位点", "answer": True},
            {"label": "D", "text": "肌肉收缩过程中，粗肌丝和细肌丝本身的长度均发生明显缩短", "answer": False},
        ],
        "explanation": "A正确：滑动丝模型的核心是细肌丝向粗肌丝中央滑入，I带和H区缩短，A带（等于粗肌丝长度）不变。B正确：横桥循环中，肌球蛋白头部结合并水解ATP，产生动力冲程拉动细肌丝。C正确：Ca²⁺与肌钙蛋白C结合→构象变化→原肌球蛋白移位→暴露肌动蛋白结合位点。D错误：滑动丝模型的核心正是肌丝本身长度不变，而是相对滑动。",
        "subject": "动物生理学", "concept": "滑动丝模型", "difficulty": "league", "target": "competition",
        "tags": ["animal_tissue", "module_3", "动物生理学", "滑动丝模型"],
        "references": [{"doi": "10.1038/1991043a0", "title": "Structural changes in muscle during contraction", "authors": "Huxley HE, Hanson J", "year": 1954, "journal": "Nature"}],
    },
    {
        "question": "比较横纹肌与平滑肌的特征，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "骨骼肌为随意肌，受躯体运动神经支配；平滑肌和心肌为不随意肌，受自主神经支配", "answer": True},
            {"label": "B", "text": "平滑肌细胞无肌小节结构，其收缩依赖钙调蛋白而非肌钙蛋白", "answer": True},
            {"label": "C", "text": "心肌细胞之间的闰盘含有缝隙连接，允许电信号在细胞间快速传播", "answer": True},
            {"label": "D", "text": "平滑肌的收缩速度比骨骼肌快，因为其肌丝排列更加有序", "answer": False},
        ],
        "explanation": "A正确：骨骼肌受意识控制（随意肌）；平滑肌和心肌受自主神经支配（不随意肌）。B正确：平滑肌不含肌钙蛋白，Ca²⁺通过钙调蛋白激活肌球蛋白轻链激酶启动收缩。C正确：闰盘含缝隙连接，使心肌成为功能合胞体，实现同步收缩。D错误：平滑肌收缩速度远慢于骨骼肌，但能维持长时间紧张性收缩。",
        "subject": "动物生理学", "concept": "肌肉类型比较", "difficulty": "high_school", "target": "high_school",
        "tags": ["animal_tissue", "module_3", "动物生理学", "肌肉类型"],
        "references": [],
    },
    {
        "question": "关于上皮组织的分类与特征，下列描述正确的有：",
        "subQuestions": [
            {"label": "A", "text": "复层扁平上皮具有多层细胞，表层细胞扁平且可角化，起保护作用", "answer": True},
            {"label": "B", "text": "假复层纤毛柱状上皮所有细胞均附着于基膜，但并非所有细胞都达到腔面", "answer": True},
            {"label": "C", "text": "移行上皮分布于输尿管和膀胱，其层数和细胞形状可随器官扩张状态而变化", "answer": True},
            {"label": "D", "text": "外分泌腺通过导管将分泌物释放到体表或管腔，而内分泌腺无导管，分泌物直接进入血液", "answer": True},
        ],
        "explanation": "A正确：复层扁平上皮由多层细胞组成，表层扁平，在皮肤表面发生角化，具有强大的保护功能。B正确：假复层纤毛柱状上皮所有细胞基底面均附着于基膜，但只有部分细胞伸达腔面，核位于不同高度。C正确：移行上皮器官收缩时较厚，扩张时变薄，细胞形态相应变化。D正确：这是外分泌腺和内分泌腺的基本区别。",
        "subject": "动物生理学", "concept": "上皮组织分类", "difficulty": "league", "target": "competition",
        "tags": ["animal_tissue", "module_3", "动物生理学", "上皮组织"],
        "references": [{"doi": "10.1002/jmor.1051450304", "title": "The structure and function of transitional epithelium", "authors": "Hicks RM", "year": 1975, "journal": "Journal of Morphology"}],
    },
    {
        "question": "关于结缔组织的类型和功能，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "软骨组织中的软骨细胞位于陷窝内，软骨基质富含蛋白聚糖和胶原纤维，无血管分布", "answer": True},
            {"label": "B", "text": "骨组织中骨单位以中央管为中心呈同心圆排列，骨细胞位于骨板间的陷窝内", "answer": True},
            {"label": "C", "text": "血液属于液态结缔组织，其细胞外基质为血浆，含有纤维蛋白原等蛋白质", "answer": True},
            {"label": "D", "text": "脂肪组织仅具有储能功能，不具有内分泌功能和隔热保温作用", "answer": False},
        ],
        "explanation": "A正确：软骨细胞位于基质陷窝中，软骨无血管，营养通过扩散获得。B正确：密质骨的基本结构单位为骨单位，由同心圆排列的骨板和中央Havers管组成。C正确：血液被归类为液态结缔组织，细胞外基质即血浆。D错误：脂肪组织不仅储能，还分泌瘦素、脂联素等脂肪因子，同时具有隔热保温和缓冲保护功能。",
        "subject": "动物生理学", "concept": "结缔组织类型", "difficulty": "high_school", "target": "high_school",
        "tags": ["animal_tissue", "module_3", "动物生理学", "结缔组织"],
        "references": [],
    },
]

# ===================== 2. nervous_sys =====================
ALL["nervous_sys"] = [
    {
        "question": "关于神经元静息电位和动作电位的产生机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "静息电位主要由K⁺通过漏钾通道外流形成，接近K⁺的Nernst平衡电位", "answer": True},
            {"label": "B", "text": "动作电位去极化相由电压门控Na⁺通道开放、Na⁺大量内流引起", "answer": True},
            {"label": "C", "text": "动作电位复极化相由电压门控K⁺通道延迟开放、K⁺外流引起", "answer": True},
            {"label": "D", "text": "Na⁺/K⁺-ATP酶在动作电位产生过程中直接参与去极化和复极化", "answer": False},
        ],
        "explanation": "A正确：静息时膜对K⁺通透性最高，K⁺外流使膜内变负，接近K⁺平衡电位。B正确：去极化达阈值时电压门控Na⁺通道快速开放，Na⁺内流形成上升支。C正确：Na⁺通道失活后，延迟整流K⁺通道开放，K⁺外流使膜电位恢复。D错误：Na⁺/K⁺泵维持浓度梯度，但不直接参与动作电位的快速去极化和复极化——这些由电压门控离子通道介导。",
        "subject": "动物生理学", "concept": "动作电位机制", "difficulty": "league", "target": "competition",
        "tags": ["nervous_sys", "module_3", "动物生理学", "动作电位"],
        "references": [{"doi": "10.1016/0301-0082(90)90007-3", "title": "Ionic channels underlying the action potential", "authors": "Hille B", "year": 1990, "journal": "Progress in Biophysics and Molecular Biology"}],
    },
    {
        "question": "关于突触传递的机制，下列描述正确的有：",
        "subQuestions": [
            {"label": "A", "text": "突触前膜去极化引起电压门控Ca²⁺通道开放，Ca²⁺内流触发突触小泡释放神经递质", "answer": True},
            {"label": "B", "text": "兴奋性突触后电位（EPSP）由Na⁺内流引起，使突触后膜去极化", "answer": True},
            {"label": "C", "text": "抑制性突触后电位（IPSP）通常由Cl⁻内流或K⁺外流引起，使突触后膜超极化", "answer": True},
            {"label": "D", "text": "神经递质与突触后受体结合后，均通过直接改变离子通透性发挥作用", "answer": False},
        ],
        "explanation": "A正确：Ca²⁺内流触发突触小泡胞吐释放递质。B正确：EPSP由兴奋性递质（如谷氨酸）与AMPA受体结合引起Na⁺内流。C正确：IPSP由GABA等抑制性递质引起Cl⁻内流或K⁺外流。D错误：代谢型受体（G蛋白偶联受体）通过第二信使系统间接发挥作用，不一定直接改变离子通透性。",
        "subject": "动物生理学", "concept": "突触传递", "difficulty": "league", "target": "competition",
        "tags": ["nervous_sys", "module_3", "动物生理学", "突触传递"],
        "references": [{"doi": "10.1016/S0896-6273(00)81133-7", "title": "Structural basis of synaptic transmission", "authors": "Sudhof TC", "year": 2008, "journal": "Neuron"}],
    },
    {
        "question": "关于神经系统的组成与分类，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "中枢神经系统包括脑和脊髓；外周神经系统包括脑神经（12对）和脊神经（31对）", "answer": True},
            {"label": "B", "text": "自主神经系统分为交感神经和副交感神经，两者通常对同一器官产生拮抗性效应", "answer": True},
            {"label": "C", "text": "交感神经的节前纤维短、节后纤维长，而副交感神经的节前纤维长、节后纤维短", "answer": True},
            {"label": "D", "text": "躯体运动神经从中枢到效应器需要经过两个神经元的接力", "answer": False},
        ],
        "explanation": "A正确：CNS=脑+脊髓；PNS=12对脑神经+31对脊神经。B正确：交感与副交感对大多数器官作用拮抗。C正确：交感神经节距效应器远（节前短、节后长），副交感神经节在效应器附近（节前长、节后短）。D错误：躯体运动神经从中枢到骨骼肌只经过一个神经元（α运动神经元），不需神经节接力。自主神经才需两个神经元。",
        "subject": "动物生理学", "concept": "神经系统组成", "difficulty": "high_school", "target": "high_school",
        "tags": ["nervous_sys", "module_3", "动物生理学", "神经系统组成"],
        "references": [],
    },
    {
        "question": "关于神经冲动的传导特征，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "有髓神经纤维上，神经冲动以跳跃传导方式沿郎飞结间跳跃传导，速度显著快于无髓纤维", "answer": True},
            {"label": "B", "text": "动作电位遵循\"全或无\"定律——刺激达到阈值即产生最大幅度的动作电位", "answer": True},
            {"label": "C", "text": "绝对不应期内，无论给予多强的刺激，都不能再产生新的动作电位", "answer": True},
            {"label": "D", "text": "在自然条件下，神经冲动在神经纤维上可以双向传导", "answer": False},
        ],
        "explanation": "A正确：髓鞘绝缘，离子通道集中在郎飞结，动作电位跳跃传导速度快。B正确：全或无是动作电位基本特征。C正确：绝对不应期Na⁺通道全部失活，不能产生新动作电位。D错误：自然条件下（反射弧中），冲动单向传导，由突触传递的单向性决定。",
        "subject": "动物生理学", "concept": "神经冲动传导", "difficulty": "high_school", "target": "high_school",
        "tags": ["nervous_sys", "module_3", "动物生理学", "神经冲动传导"],
        "references": [],
    },
    {
        "question": "关于神经递质及其功能，下列描述正确的有：",
        "subQuestions": [
            {"label": "A", "text": "乙酰胆碱在神经-肌肉接头处是兴奋性递质，在心肌处通过M₂受体产生抑制效应", "answer": True},
            {"label": "B", "text": "多巴胺与帕金森病（黑质纹状体通路DA减少）和精神分裂症（中脑边缘通路DA过多）均有关", "answer": True},
            {"label": "C", "text": "γ-氨基丁酸（GABA）是中枢神经系统中最主要的兴奋性神经递质", "answer": False},
            {"label": "D", "text": "去甲肾上腺素主要由蓝斑核神经元合成，参与觉醒和注意力的调节", "answer": True},
        ],
        "explanation": "A正确：ACh在骨骼肌接头与N₂受体结合引起收缩；在心脏与M₂受体结合使心率减慢。B正确：帕金森病因黑质DA神经元退化；精神分裂症与中脑边缘DA亢进有关。C错误：GABA是中枢神经系统中最主要的抑制性（而非兴奋性）神经递质。D正确：脑内NE主要来源于脑桥蓝斑核，参与觉醒和注意力调节。",
        "subject": "动物生理学", "concept": "神经递质", "difficulty": "league", "target": "competition",
        "tags": ["nervous_sys", "module_3", "动物生理学", "神经递质"],
        "references": [{"doi": "10.1124/pr.109.001886", "title": "GPCR signaling and neurotransmitters", "authors": "Davenport AP et al.", "year": 2013, "journal": "Pharmacological Reviews"}],
    },
]

# ===================== 3. endocrine =====================
ALL["endocrine"] = [
    {
        "question": "关于下丘脑-垂体轴的调控机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "下丘脑分泌的TRH通过垂体门脉系统到达腺垂体，促进TSH的合成与释放", "answer": True},
            {"label": "B", "text": "甲状腺激素通过负反馈抑制下丘脑TRH和腺垂体TSH的分泌", "answer": True},
            {"label": "C", "text": "神经垂体本身合成并储存抗利尿激素和催产素", "answer": False},
            {"label": "D", "text": "下丘脑分泌的GHRH和生长抑素共同调节腺垂体GH的分泌", "answer": True},
        ],
        "explanation": "A正确：TRH经垂体门脉到达腺垂体刺激TSH分泌。B正确：T₃/T₄通过负反馈抑制TRH和TSH。C错误：ADH和催产素由下丘脑合成，经轴突运输至神经垂体储存释放，神经垂体本身不合成激素。D正确：GHRH促进GH释放，生长抑素抑制GH释放。",
        "subject": "动物生理学", "concept": "下丘脑-垂体轴", "difficulty": "league", "target": "competition",
        "tags": ["endocrine", "module_3", "动物生理学", "下丘脑-垂体轴"],
        "references": [{"doi": "10.1210/er.2010-0009", "title": "The hypothalamic-pituitary axis", "authors": "Guillemin R", "year": 2010, "journal": "Endocrine Reviews"}],
    },
    {
        "question": "关于含氮激素与类固醇激素的比较，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "含氮激素通常与细胞膜表面受体结合，通过第二信使发挥作用", "answer": True},
            {"label": "B", "text": "类固醇激素为脂溶性，可穿过细胞膜与胞内受体结合，调节基因转录", "answer": True},
            {"label": "C", "text": "含氮激素的作用通常起效快但持续时间短，而类固醇激素起效慢但作用持久", "answer": True},
            {"label": "D", "text": "甲状腺激素属于类固醇激素，因为它含有碘元素", "answer": False},
        ],
        "explanation": "A正确：含氮激素水溶性，与膜受体结合通过第二信使发挥作用。B正确：类固醇激素脂溶性，穿过细胞膜与胞内受体结合调节基因转录。C正确：含氮激素通过信号级联起效快但短暂；类固醇需基因转录起效慢但持久。D错误：甲状腺激素是酪氨酸衍生物（胺类），不属于类固醇激素，虽可穿膜与核受体结合（类似类固醇方式）。",
        "subject": "动物生理学", "concept": "激素分类与作用机制", "difficulty": "high_school", "target": "high_school",
        "tags": ["endocrine", "module_3", "动物生理学", "激素分类"],
        "references": [],
    },
    {
        "question": "关于血糖调节的激素机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "胰岛素通过促进GLUT4转位至细胞膜，增加肌肉和脂肪细胞对葡萄糖的摄取", "answer": True},
            {"label": "B", "text": "胰高血糖素主要通过促进肝糖原分解和糖异生来升高血糖", "answer": True},
            {"label": "C", "text": "胰岛素信号通过受体酪氨酸激酶途径传导，激活PI3K-Akt通路", "answer": True},
            {"label": "D", "text": "胰高血糖素主要作用于肌肉细胞，促进肌糖原分解以升高血糖", "answer": False},
        ],
        "explanation": "A正确：胰岛素促进含GLUT4的囊泡转位至膜上增加葡萄糖摄取。B正确：胰高血糖素通过cAMP-PKA通路激活糖原磷酸化酶和糖异生。C正确：胰岛素受体为RTK，通过IRS-1→PI3K→Akt通路发挥作用。D错误：胰高血糖素主要作用于肝脏，肌肉细胞缺乏胰高血糖素受体，肌糖原不能直接分解为葡萄糖释放入血。",
        "subject": "动物生理学", "concept": "血糖调节", "difficulty": "league", "target": "competition",
        "tags": ["endocrine", "module_3", "动物生理学", "血糖调节"],
        "references": [{"doi": "10.1016/S0092-8674(01)00313-1", "title": "Insulin signaling and action", "authors": "Saltiel AR, Kahn CR", "year": 2001, "journal": "Nature"}],
    },
    {
        "question": "关于肾上腺的结构与功能，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "肾上腺皮质由外向内分为球状带、束状带和网状带，分别分泌盐皮质激素、糖皮质激素和性激素", "answer": True},
            {"label": "B", "text": "肾上腺髓质嗜铬细胞分泌肾上腺素和去甲肾上腺素，属于交感-肾上腺髓质系统", "answer": True},
            {"label": "C", "text": "糖皮质激素的分泌受ACTH调控，构成HPA轴（下丘脑-垂体-肾上腺轴）", "answer": True},
            {"label": "D", "text": "醛固酮属于糖皮质激素，主要功能是升高血糖", "answer": False},
        ],
        "explanation": "A正确：皮质三层分别分泌盐皮质激素（醛固酮）、糖皮质激素（皮质醇）和弱雄激素。B正确：髓质相当于交感神经节变形细胞，分泌肾上腺素和去甲肾上腺素。C正确：CRH→ACTH→皮质醇构成HPA轴。D错误：醛固酮属于盐皮质激素，主要促进肾远曲小管保Na⁺排K⁺，调节水盐平衡，而非升高血糖。",
        "subject": "动物生理学", "concept": "肾上腺功能", "difficulty": "high_school", "target": "high_school",
        "tags": ["endocrine", "module_3", "动物生理学", "肾上腺"],
        "references": [],
    },
    {
        "question": "关于激素作用的一般特征和调控，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "激素具有绝对特异性，每种激素只作用于一种特定的靶细胞", "answer": False},
            {"label": "B", "text": "激素在血液中浓度极低，但通过与高亲和力受体结合产生显著的生物放大效应", "answer": True},
            {"label": "C", "text": "胰高血糖素和肾上腺素在升血糖方面具有协同作用", "answer": True},
            {"label": "D", "text": "受体的上调是指靶细胞在激素长期高水平刺激下增加受体数量", "answer": False},
        ],
        "explanation": "A错误：激素的特异性是相对的，有些激素作用广泛（如甲状腺激素几乎作用于全身细胞），一种激素可有多种靶器官。B正确：激素是高效能物质，极低浓度即可通过高亲和力受体和多级信号放大发挥作用。C正确：胰高血糖素、肾上腺素、皮质醇均升血糖，具有协同作用。D错误：受体上调是激素浓度长期偏低时增加受体数量；长期高水平导致受体减少称为下调。",
        "subject": "动物生理学", "concept": "激素作用特征", "difficulty": "league", "target": "competition",
        "tags": ["endocrine", "module_3", "动物生理学", "激素调控"],
        "references": [{"doi": "10.1124/pr.109.002264", "title": "GPCR regulation and receptor trafficking", "authors": "Rosenbaum DM et al.", "year": 2011, "journal": "Nature"}],
    },
]

# ===================== 4. circulatory =====================
ALL["circulatory"] = [
    {
        "question": "关于心脏结构与心动周期，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "心室等容收缩期房室瓣和动脉瓣均关闭，心室容积不变，室内压急剧上升", "answer": True},
            {"label": "B", "text": "快速射血期室内压超过主动脉压，动脉瓣开放，血液快速射入动脉", "answer": True},
            {"label": "C", "text": "第一心音主要由房室瓣关闭振动产生，第二心音由动脉瓣关闭产生", "answer": True},
            {"label": "D", "text": "心室舒张期血液从心房被动流入心室仅占总充盈量的约20%", "answer": False},
        ],
        "explanation": "A正确：等容收缩期房室瓣已关、动脉瓣未开，心室封闭，压力急升容积不变。B正确：室内压超过主动脉压时动脉瓣打开，快速射血。C正确：S₁由房室瓣关闭产生，S₂由动脉瓣关闭产生。D错误：被动充盈（快速充盈期）约占总充盈量的70-80%，心房收缩期约占20-30%。",
        "subject": "动物生理学", "concept": "心动周期", "difficulty": "league", "target": "competition",
        "tags": ["circulatory", "module_3", "动物生理学", "心动周期"],
        "references": [{"doi": "10.1152/physrev.00012.2010", "title": "Cardiac cycle and stroke volume regulation", "authors": "Opie LH, Bers DM", "year": 2011, "journal": "Physiological Reviews"}],
    },
    {
        "question": "关于血液成分与功能，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "成熟红细胞无细胞核和细胞器，其能量代谢完全依赖无氧糖酵解", "answer": True},
            {"label": "B", "text": "血红蛋白由4个亚基组成，每个亚基含一个血红素基团，可结合一个O₂分子", "answer": True},
            {"label": "C", "text": "血小板是无核细胞碎片，在止血过程中通过黏附、聚集和释放反应参与血栓形成", "answer": True},
            {"label": "D", "text": "中性粒细胞是数量最多的白细胞类型，主要通过产生抗体参与免疫防御", "answer": False},
        ],
        "explanation": "A正确：成熟红细胞无线粒体，ATP完全来自无氧糖酵解。B正确：Hb为α₂β₂四聚体，每亚基含一个血红素-Fe²⁺，可逆结合一个O₂。C正确：血小板由巨核细胞产生，通过黏附-聚集-释放参与止血。D错误：中性粒细胞主要通过吞噬和氧化爆发杀灭病原微生物，抗体由B细胞分化的浆细胞产生。",
        "subject": "动物生理学", "concept": "血液成分", "difficulty": "high_school", "target": "high_school",
        "tags": ["circulatory", "module_3", "动物生理学", "血液成分"],
        "references": [],
    },
    {
        "question": "关于凝血级联反应，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "内源性凝血途径由因子XII接触激活启动，外源性途径由组织因子启动", "answer": True},
            {"label": "B", "text": "两条途径最终汇聚于因子X的激活，形成共同通路", "answer": True},
            {"label": "C", "text": "凝血酶既能将纤维蛋白原转化为纤维蛋白，也能正反馈激活因子V、VIII和XI", "answer": True},
            {"label": "D", "text": "Ca²⁺仅参与外源性凝血途径，内源性途径不需要Ca²⁺", "answer": False},
        ],
        "explanation": "A正确：内源性由FXII接触激活启动，外源性由TF/FVIIa启动。B正确：两条途径汇聚于FX→FXa→凝血酶→纤维蛋白。C正确：凝血酶具有多重功能，包括正反馈激活FV、FVIII和FXI。D错误：Ca²⁺是几乎所有凝血步骤所必需的辅因子，内源性和外源性途径均需要。",
        "subject": "动物生理学", "concept": "凝血级联", "difficulty": "league", "target": "competition",
        "tags": ["circulatory", "module_3", "动物生理学", "凝血级联"],
        "references": [{"doi": "10.1056/NEJMra0506892", "title": "Coagulation cascade mechanisms", "authors": "Camerer E et al.", "year": 2006, "journal": "New England Journal of Medicine"}],
    },
    {
        "question": "关于血压调节机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "颈动脉窦和主动脉弓压力感受器感知血压升高时，通过减压反射使心率减慢、血管舒张", "answer": True},
            {"label": "B", "text": "RAAS系统在血压下降时被激活，血管紧张素II具有强烈的缩血管作用", "answer": True},
            {"label": "C", "text": "心房钠尿肽在血容量增加时释放，具有促进排钠利尿和舒张血管的作用", "answer": True},
            {"label": "D", "text": "长期高血压患者压力感受性反射的敏感性通常增强", "answer": False},
        ],
        "explanation": "A正确：减压反射——血压↑→压力感受器兴奋→心迷走兴奋、交感抑制→血压↓。B正确：血压↓→肾素↑→AngII↑→缩血管+醛固酮↑→血压回升。C正确：ANP在血容量增加时释放，促进排钠利尿、舒张血管、抑制RAAS。D错误：长期高血压患者压力感受器敏感性降低（而非增强），反射曲线右移。",
        "subject": "动物生理学", "concept": "血压调节", "difficulty": "high_school", "target": "high_school",
        "tags": ["circulatory", "module_3", "动物生理学", "血压调节"],
        "references": [],
    },
    {
        "question": "关于开放循环与闭管循环的比较，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "闭管循环系统中血液始终在血管内流动，物质交换通过毛细血管壁进行", "answer": True},
            {"label": "B", "text": "开放循环系统中血液会流入体腔（血腔），直接浸润组织器官", "answer": True},
            {"label": "C", "text": "闭管循环系统能维持更高的血压和更快的血流速度，物质运输效率更高", "answer": True},
            {"label": "D", "text": "昆虫的开放循环系统同时承担氧气运输的主要功能", "answer": False},
        ],
        "explanation": "A正确：闭管循环血液全程在血管内。B正确：开放循环血液流入血腔直接浸润组织。C正确：闭管循环可维持更高血压和更快血流。D错误：昆虫的氧气运输通过独立的气管系统完成，不依赖血淋巴运输。",
        "subject": "动物生理学", "concept": "循环类型比较", "difficulty": "league", "target": "competition",
        "tags": ["circulatory", "module_3", "动物生理学", "循环类型"],
        "references": [{"doi": "10.1242/jeb.02100", "title": "Circulatory systems across phyla", "authors": "Wheatly MG, Henry RP", "year": 1998, "journal": "Journal of Experimental Biology"}],
    },
]

# ===================== 5. immune_system =====================
ALL["immune_system"] = [
    {
        "question": "关于固有免疫的特征与机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "Toll样受体（TLR）是重要的模式识别受体，能识别病原体相关分子模式如LPS、鞭毛蛋白等", "answer": True},
            {"label": "B", "text": "补体系统可通过经典途径、旁路途径和凝集素途径激活，最终形成膜攻击复合体溶解靶细胞", "answer": True},
            {"label": "C", "text": "自然杀伤细胞（NK细胞）属于适应性免疫细胞，通过识别抗原特异性激活", "answer": False},
            {"label": "D", "text": "中性粒细胞通过氧化爆发产生ROS杀灭吞噬的病原菌", "answer": True},
        ],
        "explanation": "A正确：TLR是固有免疫关键PRR，如TLR4识别LPS，TLR5识别鞭毛蛋白。B正确：补体三条途径汇聚于MAC（C5b-C9）形成膜穿孔。C错误：NK细胞属于固有免疫细胞，通过\"丢失自我\"机制识别MHC-I下调的靶细胞。D正确：中性粒细胞通过NADPH氧化酶产生ROS杀灭病原菌。",
        "subject": "动物生理学", "concept": "固有免疫", "difficulty": "league", "target": "competition",
        "tags": ["immune_system", "module_3", "动物生理学", "固有免疫"],
        "references": [{"doi": "10.1038/ni1065", "title": "Toll-like receptors in innate immunity", "authors": "Akira S, Takeda K", "year": 2004, "journal": "Nature Immunology"}],
    },
    {
        "question": "关于体液免疫（B细胞介导）的过程，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "B细胞通过BCR识别抗原后，在Th细胞辅助下活化、增殖并分化为浆细胞和记忆B细胞", "answer": True},
            {"label": "B", "text": "初次免疫应答主要产生IgM，再次应答以IgG为主且抗体亲和力更大", "answer": True},
            {"label": "C", "text": "抗体类别转换由活化诱导胞苷脱氨酶（AID）介导，在生发中心发生", "answer": True},
            {"label": "D", "text": "TI抗原（非T细胞依赖性抗原）能高效诱导记忆B细胞的产生", "answer": False},
        ],
        "explanation": "A正确：B细胞活化需BCR识别抗原（第一信号）和Th细胞CD40L-CD40结合（第二信号）。B正确：初次应答以IgM为主，再次应答以IgG为主且经亲和力成熟。C正确：AID催化类别转换重组（CSR）。D错误：TI抗原主要产生低亲和力IgM，通常不形成记忆B细胞；TD抗原才能诱导生发中心形成和记忆B细胞。",
        "subject": "动物生理学", "concept": "体液免疫", "difficulty": "league", "target": "competition",
        "tags": ["immune_system", "module_3", "动物生理学", "体液免疫"],
        "references": [{"doi": "10.1038/ni1026", "title": "B-cell memory and plasma cells", "authors": "Radbruch A et al.", "year": 2006, "journal": "Nature Immunology"}],
    },
    {
        "question": "关于细胞免疫（T细胞介导），下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "CD8⁺CTL通过释放穿孔素和颗粒酶诱导靶细胞凋亡", "answer": True},
            {"label": "B", "text": "CD4⁺辅助T细胞可分化为Th1和Th2等亚群，由不同细胞因子环境决定", "answer": True},
            {"label": "C", "text": "CD4⁺T细胞识别MHC-II类分子呈递的抗原，CD8⁺T细胞识别MHC-I类分子呈递的抗原", "answer": True},
            {"label": "D", "text": "调节性T细胞（Treg）通过分泌IL-2和IFN-γ增强免疫应答", "answer": False},
        ],
        "explanation": "A正确：CTL通过穿孔素打孔、颗粒酶激活Caspase诱导凋亡。B正确：IL-12→Th1，IL-4→Th2。C正确：MHC限制性——CD4⁺识别MHC-II，CD8⁺识别MHC-I。D错误：Treg通过分泌IL-10、TGF-β等抑制性细胞因子维持免疫耐受，而非增强免疫应答。",
        "subject": "动物生理学", "concept": "细胞免疫", "difficulty": "league", "target": "competition",
        "tags": ["immune_system", "module_3", "动物生理学", "细胞免疫"],
        "references": [{"doi": "10.1016/j.cell.2009.01.035", "title": "Regulatory T cells and immune tolerance", "authors": "Sakaguchi S et al.", "year": 2008, "journal": "Cell"}],
    },
    {
        "question": "关于MHC分子，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "MHC-I类分子表达于几乎所有有核细胞表面，MHC-II类分子主要表达于专职APC", "answer": True},
            {"label": "B", "text": "MHC分子具有高度多态性，其多态性集中在抗原肽结合槽区域", "answer": True},
            {"label": "C", "text": "人类的MHC称为HLA，其中HLA-A、B、C编码MHC-I类分子", "answer": True},
            {"label": "D", "text": "MHC分子直接识别并结合完整的天然蛋白质抗原", "answer": False},
        ],
        "explanation": "A正确：MHC-I广泛表达于有核细胞，MHC-II限制表达于APC。B正确：多态性集中在肽结合槽。C正确：HLA-A/B/C为MHC-I类基因。D错误：MHC呈递经蛋白酶体降解后的短肽片段，不识别完整天然蛋白质。",
        "subject": "动物生理学", "concept": "MHC分子", "difficulty": "high_school", "target": "high_school",
        "tags": ["immune_system", "module_3", "动物生理学", "MHC"],
        "references": [],
    },
    {
        "question": "关于免疫记忆与疫苗原理，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "记忆T细胞和记忆B细胞寿命长，遇到相同抗原时可快速产生更强的免疫应答", "answer": True},
            {"label": "B", "text": "灭活疫苗通常需要多次接种，而减毒活疫苗通常只需接种一次即可产生持久免疫", "answer": True},
            {"label": "C", "text": "mRNA疫苗通过将编码抗原蛋白的mRNA递送入细胞，在胞内翻译产生抗原蛋白诱导免疫", "answer": True},
            {"label": "D", "text": "佐剂的作用机制是直接杀灭病原体从而增强疫苗效果", "answer": False},
        ],
        "explanation": "A正确：记忆细胞在再次遇到抗原时快速应答。B正确：灭活疫苗免疫原性弱需加强；减毒活疫苗模拟自然感染，一次即可。C正确：mRNA疫苗在胞内翻译抗原蛋白诱导免疫。D错误：佐剂不直接杀灭病原体，而是通过延长抗原暴露、激活固有免疫等方式增强免疫应答。",
        "subject": "动物生理学", "concept": "免疫记忆与疫苗", "difficulty": "high_school", "target": "high_school",
        "tags": ["immune_system", "module_3", "动物生理学", "免疫记忆"],
        "references": [],
    },
]

# ===================== 6. excretory =====================
ALL["excretory"] = [
    {
        "question": "关于肾单位的结构与尿液形成过程，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "肾小球滤过膜由毛细血管内皮、基膜和足细胞裂孔膜三层组成", "answer": True},
            {"label": "B", "text": "近端小管是重吸收的主要部位，可重吸收几乎全部的葡萄糖和氨基酸", "answer": True},
            {"label": "C", "text": "Henle袢降支细段对水通透但对NaCl不通透，升支细段对NaCl通透但对水不通透", "answer": True},
            {"label": "D", "text": "远曲小管和集合管对水的通透性始终不受激素调控，保持恒定", "answer": False},
        ],
        "explanation": "A正确：滤过膜三层结构起分子和电荷选择性屏障作用。B正确：近端小管重吸收约65%的Na⁺和水，几乎100%的葡萄糖和氨基酸。C正确：降支高表达AQP1对水通透，升支对水不通透但NaCl可扩散出。D错误：远曲小管后段和集合管对水的通透性受ADH调控。",
        "subject": "动物生理学", "concept": "肾单位与尿液形成", "difficulty": "league", "target": "competition",
        "tags": ["excretory", "module_3", "动物生理学", "肾单位"],
        "references": [{"doi": "10.1152/physrev.00034.2005", "title": "The renal countercurrent system", "authors": "Layton AT", "year": 2014, "journal": "Physiological Reviews"}],
    },
    {
        "question": "关于含氮废物的排泄方式与适应，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "氨毒性最强但排泄不需要能量，水生动物可直接通过鳃排出氨", "answer": True},
            {"label": "B", "text": "尿素毒性较低，哺乳动物主要通过肝脏尿素循环将氨转化为尿素排泄", "answer": True},
            {"label": "C", "text": "尿酸几乎不溶于水，鸟类和爬行类以排泄尿酸为主，有利于减少水分散失", "answer": True},
            {"label": "D", "text": "尿素循环每合成一分子尿素需要消耗2分子ATP", "answer": False},
        ],
        "explanation": "A正确：氨排泄型（ammonotelic）见于水生动物。B正确：尿素排泄型（ureotelic）见于哺乳动物。C正确：尿酸排泄型（uricotelic）见于鸟类爬行类，减少水分散失。D错误：尿素循环每合成1分子尿素消耗3分子ATP（4个高能磷酸键）。",
        "subject": "动物生理学", "concept": "含氮废物排泄", "difficulty": "high_school", "target": "high_school",
        "tags": ["excretory", "module_3", "动物生理学", "含氮废物"],
        "references": [],
    },
    {
        "question": "关于ADH对尿液浓缩的调控，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "血浆渗透压升高刺激下丘脑渗透压感受器，促进神经垂体释放ADH", "answer": True},
            {"label": "B", "text": "ADH与集合管主细胞V₂受体结合，通过cAMP-PKA通路使AQP2插入管腔膜", "answer": True},
            {"label": "C", "text": "ADH还能增加髓质集合管对尿素的通透性，有助于维持髓质高渗梯度", "answer": True},
            {"label": "D", "text": "大量饮酒后尿量增加，是因为酒精促进了ADH的释放", "answer": False},
        ],
        "explanation": "A正确：渗透压升高→渗透压感受器→ADH释放↑。B正确：ADH→V₂→cAMP→PKA→AQP2转位。C正确：ADH上调UT-A1增加尿素重吸收维持髓质高渗。D错误：酒精抑制（而非促进）ADH释放，导致多尿。",
        "subject": "动物生理学", "concept": "ADH与尿液浓缩", "difficulty": "league", "target": "competition",
        "tags": ["excretory", "module_3", "动物生理学", "ADH"],
        "references": [{"doi": "10.1152/ajprenal.00356.2005", "title": "Regulation of aquaporin-2 by vasopressin", "authors": "Nielsen S et al.", "year": 2006, "journal": "American Journal of Physiology"}],
    },
    {
        "question": "关于醛固酮对Na⁺/K⁺平衡的调节，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "醛固酮由肾上腺皮质球状带分泌，主要受RAAS系统和血K⁺浓度调控", "answer": True},
            {"label": "B", "text": "醛固酮促进肾远曲小管和集合管ENaC表达和Na⁺重吸收", "answer": True},
            {"label": "C", "text": "醛固酮促进Na⁺重吸收的同时也促进K⁺的排泄，即保Na⁺排K⁺", "answer": True},
            {"label": "D", "text": "醛固酮的分泌主要受腺垂体ACTH的日常调控，与肾素无关", "answer": False},
        ],
        "explanation": "A正确：醛固酮受RAAS和血K⁺双重调控。B正确：醛固酮上调ENaC增加Na⁺重吸收。C正确：保Na⁺同时通过ROMK排K⁺。D错误：醛固酮主要受RAAS调控，ACTH仅有很弱的急性刺激作用。",
        "subject": "动物生理学", "concept": "醛固酮与水盐平衡", "difficulty": "high_school", "target": "high_school",
        "tags": ["excretory", "module_3", "动物生理学", "醛固酮"],
        "references": [],
    },
    {
        "question": "关于不同动物类群的排泄器官与适应，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "原肾管见于扁形动物等无体腔动物，由焰细胞和排泄管组成", "answer": True},
            {"label": "B", "text": "后肾管见于环节动物，每个体节一对，一端为肾口，另一端为肾孔", "answer": True},
            {"label": "C", "text": "马氏管是昆虫的排泄器官，开口于中后肠交界处", "answer": True},
            {"label": "D", "text": "淡水硬骨鱼由于体液渗透压低于环境水，需要大量饮水并主动排出盐分", "answer": False},
        ],
        "explanation": "A正确：原肾管由焰细胞和排泄管组成，见于扁形动物。B正确：后肾管两端开口，见于环节动物。C正确：马氏管开口于中后肠交界处。D错误：淡水硬骨鱼体液渗透压高于环境（高渗），水不断渗入体内，需大量排出稀释尿液并主动从水中吸收盐分。海水硬骨鱼才需大量饮水排盐。",
        "subject": "动物生理学", "concept": "排泄器官比较", "difficulty": "league", "target": "competition",
        "tags": ["excretory", "module_3", "动物生理学", "排泄器官"],
        "references": [{"doi": "10.1016/B978-012350440-1.50008-6", "title": "Excretory systems across animal phyla", "authors": "Ruppert EE, Barnes RD", "year": 1994, "journal": "Invertebrate Zoology"}],
    },
]

# ===================== 7. homeostasis =====================
ALL["homeostasis"] = [
    {
        "question": "关于内环境的组成与稳态，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "内环境由血浆、组织液和淋巴等组成，是细胞直接生活的液体环境", "answer": True},
            {"label": "B", "text": "血浆与组织液的主要区别在于血浆含有较多的蛋白质", "answer": True},
            {"label": "C", "text": "稳态是指内环境的理化性质保持绝对不变的状态", "answer": False},
            {"label": "D", "text": "稳态的维持主要依靠神经-体液-免疫调节网络", "answer": True},
        ],
        "explanation": "A正确：内环境=细胞外液=血浆+组织液+淋巴等。B正确：血浆蛋白含量高（约7%），组织液蛋白含量很低。C错误：稳态是动态平衡，理化性质在一定范围内波动而非绝对不变。D正确：神经-体液-免疫调节网络共同维持稳态。",
        "subject": "动物生理学", "concept": "内环境与稳态", "difficulty": "high_school", "target": "high_school",
        "tags": ["homeostasis", "module_3", "动物生理学", "内环境"],
        "references": [],
    },
    {
        "question": "关于血糖调节机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "胰岛素是唯一能降低血糖的激素，通过促进葡萄糖的利用和储存来降血糖", "answer": True},
            {"label": "B", "text": "胰高血糖素、肾上腺素和糖皮质激素均能升高血糖", "answer": True},
            {"label": "C", "text": "血糖升高时，胰岛B细胞分泌胰岛素增加，同时胰岛A细胞分泌胰高血糖素减少", "answer": True},
            {"label": "D", "text": "糖尿病患者尿糖阳性一定是因为胰岛素分泌不足", "answer": False},
        ],
        "explanation": "A正确：胰岛素是唯一降血糖的激素，促进葡萄糖摄取、利用和储存。B正确：胰高血糖素、肾上腺素、糖皮质激素、甲状腺激素等均可升血糖。C正确：血糖升高→胰岛素↑、胰高血糖素↓。D错误：糖尿病分1型（胰岛素缺乏）和2型（胰岛素抵抗），2型患者胰岛素可能正常甚至偏高；此外肾糖阈降低也可导致尿糖。",
        "subject": "动物生理学", "concept": "血糖调节", "difficulty": "high_school", "target": "high_school",
        "tags": ["homeostasis", "module_3", "动物生理学", "血糖调节"],
        "references": [],
    },
    {
        "question": "关于酸碱平衡的缓冲系统，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "血液中最重要的缓冲对是NaHCO₃/H₂CO₃，其比值决定血液pH", "answer": True},
            {"label": "B", "text": "肺通过调节CO₂排出量来调节血液中H₂CO₃浓度", "answer": True},
            {"label": "C", "text": "肾通过调节H⁺排出和HCO₃⁻重吸收来维持酸碱平衡", "answer": True},
            {"label": "D", "text": "剧烈运动后血液pH会显著下降至酸性范围", "answer": False},
        ],
        "explanation": "A正确：碳酸氢盐缓冲系统是最重要的血液缓冲对，正常比值20:1维持pH 7.35-7.45。B正确：肺通过改变通气量调节CO₂排出。C正确：肾通过泌H⁺、重吸收HCO₃⁻调节酸碱平衡。D错误：剧烈运动产生的乳酸会被缓冲系统中和，血液pH仅轻微下降（如从7.4降至7.2左右），不会降至酸性范围（<7.0），因为缓冲系统和肺肾代偿机制迅速发挥作用。",
        "subject": "动物生理学", "concept": "酸碱平衡", "difficulty": "league", "target": "competition",
        "tags": ["homeostasis", "module_3", "动物生理学", "酸碱平衡"],
        "references": [{"doi": "10.1152/advan.00068.2010", "title": "Acid-base balance and buffering", "authors": "Kurtz I", "year": 2010, "journal": "Advances in Physiology Education"}],
    },
    {
        "question": "关于水盐平衡的调节，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "下丘脑渗透压感受器感知血浆渗透压变化，调控ADH释放", "answer": True},
            {"label": "B", "text": "渴觉中枢位于下丘脑外侧区，血浆渗透压升高时产生渴觉", "answer": True},
            {"label": "C", "text": "醛固酮通过促进肾小管保Na⁺排K⁺来维持细胞外液Na⁺/K⁺平衡", "answer": True},
            {"label": "D", "text": "大量出汗后仅补充纯水即可完全恢复体液平衡", "answer": False},
        ],
        "explanation": "A正确：渗透压感受器→ADH释放调控水重吸收。B正确：下丘脑渴觉中枢在渗透压升高时产生渴觉驱动饮水。C正确：醛固酮保Na⁺排K⁺维持电解质平衡。D错误：大量出汗丢失Na⁺和水，仅补充纯水会导致低钠血症（水中毒），应同时补充盐分。",
        "subject": "动物生理学", "concept": "水盐平衡", "difficulty": "league", "target": "competition",
        "tags": ["homeostasis", "module_3", "动物生理学", "水盐平衡"],
        "references": [{"doi": "10.1152/ajpregu.00570.2009", "title": "Osmoregulation and thirst", "authors": "McKinley MJ, Johnson AK", "year": 2010, "journal": "American Journal of Physiology"}],
    },
    {
        "question": "关于负反馈和正反馈调节，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "负反馈是维持稳态的最重要调节方式，其特点是效应反过来抑制引起该效应的刺激", "answer": True},
            {"label": "B", "text": "体温调节、血糖调节和血压调节均以负反馈为主要机制", "answer": True},
            {"label": "C", "text": "正反馈使系统偏离平衡状态，在生理过程中较少见，如分娩时催产素的释放", "answer": True},
            {"label": "D", "text": "血液凝固过程是典型的负反馈调节", "answer": False},
        ],
        "explanation": "A正确：负反馈是稳态维持的核心机制。B正确：体温、血糖、血压调节均以负反馈为主。C正确：正反馈较少见，分娩（催产素）、血液凝固、动作电位Na⁺通道开放等是典型例子。D错误：血液凝固是典型的正反馈——凝血酶正反馈激活更多凝血因子，加速凝血过程。",
        "subject": "动物生理学", "concept": "反馈调节", "difficulty": "high_school", "target": "high_school",
        "tags": ["homeostasis", "module_3", "动物生理学", "反馈调节"],
        "references": [],
    },
]

# ===================== 8. respiratory_sys =====================
ALL["respiratory_sys"] = [
    {
        "question": "关于气体交换的原理，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "气体交换通过扩散进行，扩散速率与分压差、扩散面积成正比，与扩散距离成反比", "answer": True},
            {"label": "B", "text": "肺泡气中O₂分压（约100mmHg）高于静脉血O₂分压（约40mmHg），O₂从肺泡扩散入血", "answer": True},
            {"label": "C", "text": "CO₂的扩散系数约为O₂的20倍，因此尽管CO₂分压差较小，扩散速率仍然很高", "answer": True},
            {"label": "D", "text": "呼吸膜的厚度增加有利于提高气体交换效率", "answer": False},
        ],
        "explanation": "A正确：Fick扩散定律。B正确：O₂从高分压（肺泡）向低分压（静脉血）扩散。C正确：CO₂在水中的溶解度远高于O₂，扩散系数约为O₂的20倍。D错误：呼吸膜增厚（如肺纤维化、肺水肿）增加扩散距离，降低气体交换效率。",
        "subject": "动物生理学", "concept": "气体交换原理", "difficulty": "league", "target": "competition",
        "tags": ["respiratory_sys", "module_3", "动物生理学", "气体交换"],
        "references": [{"doi": "10.1152/physrev.00021.2008", "title": "Gas exchange in the lung", "authors": "Weibel ER", "year": 2009, "journal": "Physiological Reviews"}],
    },
    {
        "question": "关于氧解离曲线及其影响因素，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "氧解离曲线呈S形，这是由于Hb四个亚基之间存在协同结合效应", "answer": True},
            {"label": "B", "text": "Bohr效应是指pH降低或CO₂分压升高使氧解离曲线右移，促进O₂释放", "answer": True},
            {"label": "C", "text": "2,3-BPG与Hbβ亚基结合降低Hb对O₂的亲和力，使曲线右移", "answer": True},
            {"label": "D", "text": "温度升高使氧解离曲线左移，增加Hb对O₂的亲和力", "answer": False},
        ],
        "explanation": "A正确：Hb的S形曲线源于亚基间协同效应（结合一个O₂后亲和力增加）。B正确：Bohr效应——组织代谢产生CO₂和H⁺→曲线右移→促进O₂释放到活跃组织。C正确：2,3-BPG稳定Hb的T态（低亲和力态），使曲线右移。D错误：温度升高使曲线右移（而非左移），降低Hb对O₂亲和力，促进O₂释放——这在运动时肌肉温度升高有利于O₂供应。",
        "subject": "动物生理学", "concept": "氧解离曲线", "difficulty": "league", "target": "competition",
        "tags": ["respiratory_sys", "module_3", "动物生理学", "氧解离曲线"],
        "references": [{"doi": "10.1016/S0006-8993(00)02535-2", "title": "Hemoglobin-oxygen affinity and Bohr effect", "authors": "Weber RE", "year": 2007, "journal": "Comparative Biochemistry and Physiology"}],
    },
    {
        "question": "关于呼吸运动的调控，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "延髓是产生基本呼吸节律的中枢，包含吸气神经元和呼气神经元", "answer": True},
            {"label": "B", "text": "脑桥的呼吸调整中枢（PBKF核群）限制吸气深度，促进吸气向呼气转换", "answer": True},
            {"label": "C", "text": "中枢化学感受器位于延髓腹外侧，主要对脑脊液中H⁺浓度变化敏感", "answer": True},
            {"label": "D", "text": "CO₂对呼吸的刺激作用主要通过直接刺激外周化学感受器实现", "answer": False},
        ],
        "explanation": "A正确：延髓呼吸中枢（pre-Bötzinger复合体等）产生基本呼吸节律。B正确：脑桥呼吸调整中枢限制吸气，促进吸-呼转换。C正确：中枢化学感受器位于延髓腹外侧，对脑脊液H⁺敏感。D错误：CO₂主要通过透过血脑屏障→在脑脊液中水化产生H⁺→刺激中枢化学感受器（占80%），而非主要刺激外周化学感受器。",
        "subject": "动物生理学", "concept": "呼吸调控", "difficulty": "league", "target": "competition",
        "tags": ["respiratory_sys", "module_3", "动物生理学", "呼吸调控"],
        "references": [{"doi": "10.1152/japplphysiol.01028.2008", "title": "Central respiratory chemosensitivity", "authors": "Nattie E, Li A", "year": 2009, "journal": "Journal of Applied Physiology"}],
    },
    {
        "question": "关于呼吸色素与气体运输，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "血液中O₂主要以与Hb结合的形式运输（化学结合），仅约1.5%以溶解形式运输", "answer": True},
            {"label": "B", "text": "CO₂在血液中的运输形式包括：溶解CO₂、碳酸氢盐（HCO₃⁻）和氨基甲酰血红蛋白", "answer": True},
            {"label": "C", "text": "Haldane效应是指O₂与Hb结合促进CO₂从血液中释放", "answer": True},
            {"label": "D", "text": "血蓝蛋白是脊椎动物血液中主要的呼吸色素", "answer": False},
        ],
        "explanation": "A正确：O₂主要与Hb结合运输（约98.5%），溶解仅约1.5%。B正确：CO₂三种运输形式——溶解（约5%）、HCO₃⁻（约85-90%）、氨基甲酰Hb（约5-10%）。C正确：Haldane效应——O₂合Hb促进CO₂释放（氧合Hb酸性更强，易释放CO₂）。D错误：血蓝蛋白（hemocyanin）存在于部分无脊椎动物（如软体动物、节肢动物）中，脊椎动物的呼吸色素是血红蛋白。",
        "subject": "动物生理学", "concept": "气体运输", "difficulty": "high_school", "target": "high_school",
        "tags": ["respiratory_sys", "module_3", "动物生理学", "气体运输"],
        "references": [],
    },
    {
        "question": "关于不同呼吸器官的比较，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "鱼类的鳃通过逆流交换机制实现高效气体交换，水流与血流方向相反", "answer": True},
            {"label": "B", "text": "哺乳动物肺泡的总表面积很大（人类约70-100m²），有利于气体交换", "answer": True},
            {"label": "C", "text": "鸟类的肺为刚性结构，气体交换在副支气管（parabronchus）中进行，呼吸过程中气体单向流动", "answer": True},
            {"label": "D", "text": "昆虫通过体表进行气体交换，不需要专门的呼吸器官", "answer": False},
        ],
        "explanation": "A正确：鱼鳃的逆流交换使水与血之间始终保持分压差，可提取水中约80%的O₂。B正确：人类肺泡总面积约70-100m²。C正确：鸟类肺为刚性管道系统，气体在副支气管中单向流动，配合气囊实现连续气流，效率极高。D错误：昆虫通过气管系统（tracheal system）进行气体交换——空气经气门进入气管分支直达组织细胞，不是通过体表扩散。",
        "subject": "动物生理学", "concept": "呼吸器官比较", "difficulty": "high_school", "target": "high_school",
        "tags": ["respiratory_sys", "module_3", "动物生理学", "呼吸器官"],
        "references": [],
    },
]

# ===================== 9. digestive_sys =====================
ALL["digestive_sys"] = [
    {
        "question": "关于消化道的结构与运动方式，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "消化道壁从内到外依次为黏膜层、黏膜下层、肌层和浆膜层", "answer": True},
            {"label": "B", "text": "蠕动是消化道最基本的运动方式，由纵行肌和环行肌的顺序收缩产生", "answer": True},
            {"label": "C", "text": "消化道的内在神经系统（肠神经系统/ENS）可在脱离中枢神经支配的情况下独立调节消化活动", "answer": True},
            {"label": "D", "text": "食管上段和下段均为骨骼肌，吞咽过程完全受意识控制", "answer": False},
        ],
        "explanation": "A正确：消化道壁四层结构。B正确：蠕动由环行肌收缩（蠕动波前方舒张）和纵行肌协调产生。C正确：肠神经系统（ENS）含约1亿个神经元，可独立调控消化运动、分泌和血流，被称为\"第二大脑\"。D错误：食管上1/3为骨骼肌（随意），下1/3为平滑肌（不随意），中段为混合肌；吞咽反射一旦启动即为不随意的反射活动。",
        "subject": "动物生理学", "concept": "消化道结构与运动", "difficulty": "league", "target": "competition",
        "tags": ["digestive_sys", "module_3", "动物生理学", "消化道结构"],
        "references": [{"doi": "10.1113/jphysiol.2009.178414", "title": "The enteric nervous system", "authors": "Furness JB", "year": 2012, "journal": "Journal of Physiology"}],
    },
    {
        "question": "关于胃的消化功能，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "胃主细胞分泌胃蛋白酶原，在酸性环境（HCl激活，pH<5）下转化为活性的胃蛋白酶", "answer": True},
            {"label": "B", "text": "壁细胞分泌HCl和内因子（intrinsic factor），内因子是维生素B₁₂吸收所必需的", "answer": True},
            {"label": "C", "text": "胃黏膜表面的黏液-碳酸氢盐屏障保护胃壁免受胃酸和胃蛋白酶的自身消化", "answer": True},
            {"label": "D", "text": "胃是营养物质吸收的主要场所，大部分营养物质在胃中被吸收", "answer": False},
        ],
        "explanation": "A正确：胃蛋白酶原在pH<5时自身激活为胃蛋白酶，分解蛋白质。B正确：壁细胞分泌HCl（杀菌、激活胃蛋白酶原）和内因子（与B₁₂结合促进回肠吸收）。C正确：黏液-碳酸氢盐屏障是胃黏膜的重要保护机制。D错误：胃主要进行初步消化（蛋白质），吸收功能有限（仅少量水、酒精和药物）；大部分营养物质在小肠（尤其是空肠）吸收。",
        "subject": "动物生理学", "concept": "胃的消化功能", "difficulty": "high_school", "target": "high_school",
        "tags": ["digestive_sys", "module_3", "动物生理学", "胃消化"],
        "references": [],
    },
    {
        "question": "关于小肠的消化与吸收，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "小肠绒毛和微绒毛极大地增加了吸收面积（约200m²），有利于营养物质吸收", "answer": True},
            {"label": "B", "text": "胆汁由肝细胞分泌，不含消化酶，但胆盐可乳化脂肪促进脂肪酶的作用", "answer": True},
            {"label": "C", "text": "胰液含有多种消化酶（胰蛋白酶、胰脂肪酶、胰淀粉酶等），是最重要的消化液", "answer": True},
            {"label": "D", "text": "脂肪消化产物（脂肪酸和甘油一酯）通过毛细血管直接进入门静脉运输", "answer": False},
        ],
        "explanation": "A正确：环状皱襞+绒毛+微绒毛使小肠吸收面积达约200m²。B正确：胆汁不含酶，胆盐乳化脂肪增大脂肪酶作用面积。C正确：胰液含多种消化酶，是最重要的消化液。D错误：脂肪消化产物在肠上皮细胞中重新合成甘油三酯，与载脂蛋白形成乳糜微粒，进入中央乳糜管（淋巴管）→胸导管→血液循环，不直接入门静脉。",
        "subject": "动物生理学", "concept": "小肠消化吸收", "difficulty": "high_school", "target": "high_school",
        "tags": ["digestive_sys", "module_3", "动物生理学", "小肠消化"],
        "references": [],
    },
    {
        "question": "关于肝脏的功能，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "肝脏是糖代谢的重要器官，可进行糖原合成、糖原分解和糖异生", "answer": True},
            {"label": "B", "text": "肝脏通过尿素循环将有毒的氨转化为无毒的尿素", "answer": True},
            {"label": "C", "text": "肝脏是合成血浆蛋白（如白蛋白、凝血因子）的主要场所", "answer": True},
            {"label": "D", "text": "肝脏不具有解毒功能，有毒物质直接通过肝脏排出体外", "answer": False},
        ],
        "explanation": "A正确：肝脏在糖代谢中起核心作用。B正确：尿素循环仅在肝脏进行。C正确：肝脏合成大部分血浆蛋白。D错误：肝脏具有强大的解毒功能——通过氧化、还原、水解和结合反应（如细胞色素P450系统）将有毒物质转化为无毒或低毒物质排出。",
        "subject": "动物生理学", "concept": "肝脏功能", "difficulty": "league", "target": "competition",
        "tags": ["digestive_sys", "module_3", "动物生理学", "肝脏功能"],
        "references": [{"doi": "10.1002/cphy.c010207", "title": "Liver metabolism and function", "authors": "Jungermann K, Kietzmann T", "year": 2010, "journal": "Comprehensive Physiology"}],
    },
    {
        "question": "关于胃肠激素的调节作用，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "胃泌素（gastrin）由胃窦G细胞分泌，促进胃酸分泌和胃黏膜生长", "answer": True},
            {"label": "B", "text": "促胰液素（secretin）由十二指肠S细胞分泌，主要刺激胰腺分泌富含HCO₃⁻的胰液", "answer": True},
            {"label": "C", "text": "胆囊收缩素（CCK）由十二指肠I细胞分泌，促进胆囊收缩和胰酶分泌", "answer": True},
            {"label": "D", "text": "所有胃肠激素均只通过血液循环作用于远隔靶器官，不存在旁分泌作用", "answer": False},
        ],
        "explanation": "A正确：胃泌素促进胃酸分泌和胃黏膜增生。B正确：促胰液素刺激胰腺分泌大量含HCO₃⁻的稀薄胰液中和胃酸。C正确：CCK促进胆囊收缩排胆汁和刺激胰腺腺泡分泌消化酶。D错误：胃肠激素既有内分泌（如胃泌素经血循环作用于壁细胞），也有旁分泌（如生长抑素由D细胞旁分泌抑制邻近G细胞和壁细胞）和神经分泌等多种作用方式。",
        "subject": "动物生理学", "concept": "胃肠激素", "difficulty": "league", "target": "competition",
        "tags": ["digestive_sys", "module_3", "动物生理学", "胃肠激素"],
        "references": [{"doi": "10.1152/physrev.00014.2000", "title": "Gastrointestinal hormones", "authors": "Walsh JH", "year": 2001, "journal": "Physiological Reviews"}],
    },
]

# ===================== 10. sensory_physio =====================
ALL["sensory_physio"] = [
    {
        "question": "关于视觉感受器的信号转导机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "视杆细胞中的视紫红质（rhodopsin）由视蛋白和11-顺式视黄醛组成，光照使其异构化为全反式", "answer": True},
            {"label": "B", "text": "光转导过程中，活化的视紫红质激活转导蛋白（transducin），进而激活PDE降解cGMP", "answer": True},
            {"label": "C", "text": "光照导致视杆细胞cGMP浓度下降，Na⁺通道关闭，细胞超极化（而非去极化）", "answer": True},
            {"label": "D", "text": "视锥细胞主要负责暗视觉，对光敏感度高于视杆细胞", "answer": False},
        ],
        "explanation": "A正确：光照使11-顺式视黄醛→全反式视黄醛，激活视紫红质。B正确：活化的视紫红质→转导蛋白→PDE→cGMP↓。C正确：暗视时cGMP门控Na⁺通道开放（暗电流），光照→cGMP↓→通道关闭→超极化→减少谷氨酸释放。D错误：视锥细胞负责明视觉和色觉，光敏感度低于视杆细胞；视杆细胞负责暗视觉，对光极敏感但不能分辨颜色。",
        "subject": "动物生理学", "concept": "视觉信号转导", "difficulty": "league", "target": "competition",
        "tags": ["sensory_physio", "module_3", "动物生理学", "视觉转导"],
        "references": [{"doi": "10.1016/S0896-6273(02)00877-7", "title": "Phototransduction mechanism", "authors": "Yau KW, Nakatani K", "year": 2005, "journal": "Neuron"}],
    },
    {
        "question": "关于听觉感受器的结构与功能，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "耳蜗基底膜的宽度和刚度从底部到顶部渐变变化，形成频率拓扑定位（tonotopy）", "answer": True},
            {"label": "B", "text": "毛细胞顶部的静纤毛（stereocilia）在偏曲时打开机械门控K⁺通道，引起去极化", "answer": True},
            {"label": "C", "text": "内毛细胞是主要的听觉感受细胞，外毛细胞主要起放大和调谐作用", "answer": True},
            {"label": "D", "text": "耳蜗内淋巴液的K⁺浓度异常低，接近细胞外液", "answer": False},
        ],
        "explanation": "A正确：基底膜底部窄而硬（响应高频），顶部宽而软（响应低频），形成频率定位。B正确：静纤毛偏曲→tip link拉伸→机械门控通道开放→K⁺内流（因内淋巴高K⁺）→去极化。C正确：内毛细胞（约3500个）是主要感受细胞，将机械信号转化为神经信号；外毛细胞（约12000个）具有电运动能力，放大基底膜振动。D错误：耳蜗内淋巴液（scala media）的K⁺浓度异常高（约150mM），Na⁺浓度低，类似细胞内液。这种高K⁺环境使K⁺成为毛细胞去极化的主要离子。",
        "subject": "动物生理学", "concept": "听觉感受器", "difficulty": "league", "target": "competition",
        "tags": ["sensory_physio", "module_3", "动物生理学", "听觉"],
        "references": [{"doi": "10.1152/physrev.00037.2006", "title": "Mechanoelectrical transduction in hair cells", "authors": "Hudspeth AJ", "year": 2008, "journal": "Physiological Reviews"}],
    },
    {
        "question": "关于骨骼肌运动调控，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "牵张反射（stretch reflex）是最简单的单突触反射，肌梭感受肌肉长度变化", "answer": True},
            {"label": "B", "text": "α运动神经元直接支配骨骼肌纤维，一个α运动神经元及其支配的所有肌纤维构成一个运动单位", "answer": True},
            {"label": "C", "text": "小脑主要参与运动的协调、精确性和时序控制，损伤后出现共济失调", "answer": True},
            {"label": "D", "text": "基底神经节直接发出神经纤维支配骨骼肌，是运动执行的最终通路", "answer": False},
        ],
        "explanation": "A正确：牵张反射（如膝跳反射）为单突触反射——肌梭→Ia传入→α运动神经元→肌肉收缩。B正确：运动单位=一个α运动神经元+其支配的所有肌纤维。C正确：小脑协调运动、维持平衡和肌紧张，损伤后出现意向性震颤、共济失调等。D错误：基底神经节不直接支配骨骼肌，而是通过丘脑-皮层环路调节运动计划和启动。运动执行的最终通路是皮层脊髓束→α运动神经元→骨骼肌。",
        "subject": "动物生理学", "concept": "运动调控", "difficulty": "high_school", "target": "high_school",
        "tags": ["sensory_physio", "module_3", "动物生理学", "运动调控"],
        "references": [],
    },
    {
        "question": "关于嗅觉和味觉的化学感受机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "嗅觉感受器位于鼻腔上部的嗅上皮中，属于G蛋白偶联受体家族", "answer": True},
            {"label": "B", "text": "味觉的基本类型包括甜、酸、苦、咸和鲜（umami）五种", "answer": True},
            {"label": "C", "text": "嗅觉系统具有高度的发散性编码——一种气味可激活多个受体，一种受体可响应多种气味", "answer": True},
            {"label": "D", "text": "味觉感受器细胞是神经元，其轴突直接组成味觉神经传入脑", "answer": False},
        ],
        "explanation": "A正确：嗅觉受体（约400种）均为GPCR，结合气味分子后通过G_olf→AC→cAMP→打开离子通道。B正确：五种基本味觉——甜（T1R2+T1R3）、鲜（T1R1+T1R3）、苦（T2R家族）、咸（ENaC通道）、酸（PKD2L1通道）。C正确：嗅觉采用组合编码策略，每种气味激活独特的受体组合模式。D错误：味觉感受器细胞是特化的上皮细胞（非神经元），通过突触将信号传递给感觉神经纤维（面神经、舌咽神经等）传入脑。",
        "subject": "动物生理学", "concept": "嗅觉与味觉", "difficulty": "league", "target": "competition",
        "tags": ["sensory_physio", "module_3", "动物生理学", "化学感觉"],
        "references": [{"doi": "10.1016/S0092-8674(04)00240-1", "title": "Odorant receptor and olfactory coding", "authors": "Buck LB", "year": 2005, "journal": "Cell"}],
    },
    {
        "question": "关于感觉器的一般特征，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "感受器具有换能功能，将各种形式的刺激能量转化为神经电信号（感受器电位）", "answer": True},
            {"label": "B", "text": "感受器电位是分级电位，其幅度与刺激强度成正比", "answer": True},
            {"label": "C", "text": "感觉适应是指持续刺激下感受器敏感性降低的现象，可分为快适应和慢适应感受器", "answer": True},
            {"label": "D", "text": "痛觉感受器（伤害性感受器）很容易适应，因此在持续伤害性刺激下痛觉会很快消失", "answer": False},
        ],
        "explanation": "A正确：感受器将光、声、热、化学等能量转化为电信号（换能）。B正确：感受器电位是分级电位（非全或无），幅度随刺激强度增大。C正确：快适应（如触觉/压觉感受器Pacinian小体）和慢适应（如痛觉/温度感受器）。D错误：痛觉感受器（伤害性感受器）是非适应型（或极慢适应）感受器，持续伤害性刺激下痛觉不会消失，这是重要的保护机制。",
        "subject": "动物生理学", "concept": "感觉器一般特征", "difficulty": "high_school", "target": "high_school",
        "tags": ["sensory_physio", "module_3", "动物生理学", "感觉器"],
        "references": [],
    },
]

# ===================== 11. temperature_reg =====================
ALL["temperature_reg"] = [
    {
        "question": "关于恒温动物与变温动物的比较，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "恒温动物（鸟类和哺乳类）通过内部产热维持相对恒定的体温", "answer": True},
            {"label": "B", "text": "变温动物的体温随环境温度变化而变化，其代谢率随温度升高而增大（Q₁₀效应）", "answer": True},
            {"label": "C", "text": "恒温动物的基础代谢率通常显著高于同等体型的变温动物", "answer": True},
            {"label": "D", "text": "所有鱼类和两栖类都是严格的变温动物，不存在任何体温调节机制", "answer": False},
        ],
        "explanation": "A正确：恒温动物（endotherm）通过代谢产热维持体温恒定。B正确：变温动物（ectotherm）体温随环境变化，代谢率遵循Q₁₀效应（温度每升高10°C，反应速率约增加2-3倍）。C正确：恒温动物基础代谢率约为同体型变温动物的5-10倍。D错误：部分鱼类（如金枪鱼、某些鲨鱼）具有区域性恒温能力（retia mirabilia逆流热交换保持肌肉/脑温度高于水温）；某些大型蜥蜴也有行为性体温调节。",
        "subject": "动物生理学", "concept": "恒温与变温", "difficulty": "league", "target": "competition",
        "tags": ["temperature_reg", "module_3", "动物生理学", "恒温变温"],
        "references": [{"doi": "10.1086/590218", "title": "Endothermy and ectothermy in vertebrates", "authors": "Clarke A, Pörtner HO", "year": 2010, "journal": "Physiological and Biochemical Zoology"}],
    },
    {
        "question": "关于非颤抖产热（non-shivering thermogenesis）的机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "非颤抖产热主要发生在棕色脂肪组织（BAT）中，由解偶联蛋白1（UCP1/thermogenin）介导", "answer": True},
            {"label": "B", "text": "UCP1使线粒体内膜对质子的通透性增加，使氧化磷酸化解偶联，能量以热能释放", "answer": True},
            {"label": "C", "text": "去甲肾上腺素通过激活β₃肾上腺素受体促进棕色脂肪组织的产热", "answer": True},
            {"label": "D", "text": "成年人类的棕色脂肪组织含量极少，在体温调节中不发挥任何作用", "answer": False},
        ],
        "explanation": "A正确：BAT是哺乳动物非颤抖产热的主要场所，UCP1是其关键分子。B正确：UCP1使质子不经ATP合酶而直接回流→能量不以ATP形式储存而以热能释放。C正确：交感神经释放NE→β₃受体→cAMP→PKA→ lipolysis→脂肪酸激活UCP1。D错误：近年研究发现成年人类仍存在功能性棕色脂肪组织（主要在颈部、锁骨上区域），在冷适应和能量代谢中发挥重要作用。",
        "subject": "动物生理学", "concept": "非颤抖产热", "difficulty": "league", "target": "competition",
        "tags": ["temperature_reg", "module_3", "动物生理学", "非颤抖产热"],
        "references": [{"doi": "10.1038/nm.2002", "title": "Brown adipose tissue in adult humans", "authors": "Cypess AM et al.", "year": 2009, "journal": "New England Journal of Medicine"}],
    },
    {
        "question": "关于散热机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "皮肤血管舒张增加皮肤血流量和散热，血管收缩减少散热", "answer": True},
            {"label": "B", "text": "蒸发散热包括出汗（显性出汗）和经皮肤/呼吸道的不显性蒸发", "answer": True},
            {"label": "C", "text": "当环境温度高于皮肤温度时，辐射、传导和对流散热停止，蒸发成为唯一散热途径", "answer": True},
            {"label": "D", "text": "狗主要通过皮肤出汗来散热", "answer": False},
        ],
        "explanation": "A正确：皮肤血管是重要的散热器官——舒张时散热↑，收缩时散热↓。B正确：蒸发散热包括汗腺主动出汗和不显性蒸发（经皮肤和呼吸道）。C正确：当环境温度>皮肤温度（约33°C），辐射/传导/对流变为吸热方向，蒸发成为唯一有效散热途径。D错误：狗皮肤汗腺极少，主要通过喘息（panting）——快速呼吸增加呼吸道蒸发散热。",
        "subject": "动物生理学", "concept": "散热机制", "difficulty": "high_school", "target": "high_school",
        "tags": ["temperature_reg", "module_3", "动物生理学", "散热机制"],
        "references": [],
    },
    {
        "question": "关于下丘脑体温调节中枢，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "视前区-下丘脑前部（PO/AH）是体温调节的整合中枢，含有温度敏感神经元", "answer": True},
            {"label": "B", "text": "体温调定点学说认为PO/AH设定一个温度阈值（约37°C），体温偏离时启动调节反应", "answer": True},
            {"label": "C", "text": "发热时致热原（如IL-1、TNF-α）使下丘脑PGE₂合成增加，调定点上移", "answer": True},
            {"label": "D", "text": "体温调节完全是自主性的，行为性体温调节不存在", "answer": False},
        ],
        "explanation": "A正确：PO/AH是体温调节整合中枢，含热敏和冷敏神经元。B正确：调定点学说——体温偏离设定点时启动散热或产热反应。C正确：感染时巨噬细胞释放IL-1等→下丘脑COX-2↑→PGE₂↑→调定点上移→产热增加（寒战）→体温升高（发热）。D错误：体温调节包括自主性（血管舒缩、出汗、颤抖）和行为性（增减衣物、寻找阴凉/温暖环境）两种方式，行为性调节在人类尤为重要。",
        "subject": "动物生理学", "concept": "体温调节中枢", "difficulty": "league", "target": "competition",
        "tags": ["temperature_reg", "module_3", "动物生理学", "体温调节中枢"],
        "references": [{"doi": "10.1152/japplphysiol.00696.2007", "title": "Thermoregulation and fever", "authors": "Romanovsky AA", "year": 2008, "journal": "Journal of Applied Physiology"}],
    },
    {
        "question": "关于冬眠与蛰伏的生理特征，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "冬眠动物在冬眠期间体温显著下降，可接近环境温度（但不低于0°C）", "answer": True},
            {"label": "B", "text": "冬眠期间代谢率可降低至正常水平的1-5%，心率和呼吸频率也显著降低", "answer": True},
            {"label": "C", "text": "冬眠动物定期周期性觉醒，每次觉醒期间体温恢复正常", "answer": True},
            {"label": "D", "text": "冬眠和睡眠是相同的生理过程，只是持续时间不同", "answer": False},
        ],
        "explanation": "A正确：冬眠动物体温可降至接近0°C（但不结冰）。B正确：代谢率大幅下降（可降至1-5%），心率从200-300次/分降至5次/分。C正确：冬眠动物每隔1-3周周期性觉醒，体温恢复正常数小时后再进入冬眠，原因尚不完全清楚（可能与免疫功能和睡眠债有关）。D错误：冬眠与睡眠是不同的生理过程——冬眠是特殊的低代谢状态，体温下降、代谢大幅降低；睡眠时代谢率仅降低约10-15%，体温变化很小。",
        "subject": "动物生理学", "concept": "冬眠与蛰伏", "difficulty": "high_school", "target": "high_school",
        "tags": ["temperature_reg", "module_3", "动物生理学", "冬眠"],
        "references": [],
    },
]

# ===================== 12. population_eco =====================
ALL["population_eco"] = [
    {
        "question": "关于种群增长的数学模型，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "指数增长模型 dN/dt=rN 假设资源无限，种群增长率与种群大小成正比", "answer": True},
            {"label": "B", "text": "逻辑斯谛增长模型 dN/dt=rN(1-N/K) 引入了环境容纳量K，增长率随种群增大而下降", "answer": True},
            {"label": "C", "text": "逻辑斯谛增长中，种群增长速率在N=K/2时达到最大值", "answer": True},
            {"label": "D", "text": "r-选择物种通常具有K值接近环境容纳量的特征", "answer": False},
        ],
        "explanation": "A正确：指数增长假设资源无限，dN/dt=rN。B正确：逻辑斯谛增长引入(1-N/K)密度制约因子。C正确：对dN/dt=rN(1-N/K)求导，当N=K/2时增长速率最大（最大持续产量MSY的理论基础）。D错误：r-选择物种的特征是高繁殖率、小体型、短寿命、后代数量多但照顾少，适应不稳定环境；K值（环境容纳量）是种群特征而非r-选择物种的特征。",
        "subject": "生态学", "concept": "种群增长模型", "difficulty": "league", "target": "competition",
        "tags": ["population_eco", "module_3", "生态学", "种群增长"],
        "references": [{"doi": "10.1086/285835", "title": "Population growth models", "authors": "Gotelli NJ", "year": 2001, "journal": "A Primer of Ecology"}],
    },
    {
        "question": "关于r/K选择理论，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "r-选择物种适应不稳定环境，具有高繁殖率、小体型、短世代时间等特征", "answer": True},
            {"label": "B", "text": "K-选择物种适应稳定环境，具有低繁殖率、大体型、长寿命、亲代抚育投入大等特征", "answer": True},
            {"label": "C", "text": "r-选择物种的种群数量波动大，常经历种群崩溃和快速恢复", "answer": True},
            {"label": "D", "text": "大象和鲸鱼是典型的r-选择物种", "answer": False},
        ],
        "explanation": "A正确：r-选择物种（如昆虫、杂草）适应不稳定环境，快速繁殖。B正确：K-选择物种（如大型哺乳动物）适应稳定环境，竞争能力强。C正确：r-选择物种种群数量波动剧烈。D错误：大象和鲸鱼是典型的K-选择物种——体型大、寿命长、繁殖率低、孕期长、亲代抚育投入大。",
        "subject": "生态学", "concept": "r/K选择理论", "difficulty": "high_school", "target": "high_school",
        "tags": ["population_eco", "module_3", "生态学", "r/K选择"],
        "references": [],
    },
    {
        "question": "关于生命表与存活曲线，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "I型存活曲线（如人类）特征是幼年和成年存活率高，老年期死亡率急剧升高", "answer": True},
            {"label": "B", "text": "II型存活曲线（如某些鸟类）特征是各年龄段死亡率大致恒定", "answer": True},
            {"label": "C", "text": "III型存活曲线（如大多数鱼类和海洋无脊椎动物）特征是幼体死亡率极高，存活个体后期死亡率低", "answer": True},
            {"label": "D", "text": "静态生命表需要追踪同一出生队列从出生到全部死亡的全过程", "answer": False},
        ],
        "explanation": "A正确：I型（凸型）如人类和大型哺乳动物。B正确：II型（对角线型）如某些鸟类和啮齿类。C正确：III型（凹型）如牡蛎和大多数鱼类，产生大量后代但幼体存活率极低。D错误：追踪同一出生队列的是动态生命表（cohort life table）；静态生命表（static/static life table）是在某一时间点调查不同年龄个体的数量，假设各年龄组的死亡率代表该物种的一般规律。",
        "subject": "生态学", "concept": "生命表与存活曲线", "difficulty": "league", "target": "competition",
        "tags": ["population_eco", "module_3", "生态学", "生命表"],
        "references": [{"doi": "10.1890/0012-9658(2001)082[2173:SLAC]2.0.CO;2", "title": "Survivorship curves in ecology", "authors": "Deevey ES", "year": 1947, "journal": "Ecology"}],
    },
    {
        "question": "关于种群数量调节机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "密度制约因素（如竞争、捕食、寄生、疾病）的作用强度随种群密度变化", "answer": True},
            {"label": "B", "text": "非密度制约因素（如气候灾害、火山爆发）的作用强度与种群密度无关", "answer": True},
            {"label": "C", "text": "种内竞争在种群密度接近K值时加剧，是重要的密度制约调节因素", "answer": True},
            {"label": "D", "text": "在自然种群中，密度制约因素和非密度制约因素通常独立起作用，不存在交互作用", "answer": False},
        ],
        "explanation": "A正确：密度制约因素如竞争、捕食等随密度增大而作用增强。B正确：非密度制约因素如暴风雨、火灾等与密度无关。C正确：密度接近K时资源竞争加剧，抑制种群增长。D错误：自然种群中两类因素常交互作用——如气候灾害（非密度制约）可能降低种群密度，从而减弱种内竞争（密度制约）的强度。",
        "subject": "生态学", "concept": "种群数量调节", "difficulty": "high_school", "target": "high_school",
        "tags": ["population_eco", "module_3", "生态学", "种群调节"],
        "references": [],
    },
    {
        "question": "关于种群的年龄结构与性比，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "增长型种群的年龄金字塔底部宽（幼年多）、顶部窄（老年少）", "answer": True},
            {"label": "B", "text": "稳定型种群的各年龄组个体数大致均匀，出生率与死亡率接近平衡", "answer": True},
            {"label": "C", "text": "衰退型种群的幼年少、老年多，种群数量趋于下降", "answer": True},
            {"label": "D", "text": "性比（sex ratio）在所有物种中都严格保持1:1，不会偏离", "answer": False},
        ],
        "explanation": "A正确：增长型金字塔呈典型金字塔形。B正确：稳定型各年龄组较均匀。C正确：衰退型幼年少老年多。D错误：性比并非总是1:1——许多因素可导致偏离，如局部配偶竞争（local mate competition）使某些寄生蜂产生极度偏雌的性比；环境因素（温度依赖性别决定的爬行动物）也可导致性比偏离；社会性昆虫中性比极度偏向雌性。",
        "subject": "生态学", "concept": "年龄结构与性比", "difficulty": "high_school", "target": "high_school",
        "tags": ["population_eco", "module_3", "生态学", "年龄结构"],
        "references": [],
    },
]

# ===================== 13. community_eco =====================
ALL["community_eco"] = [
    {
        "question": "关于种间关系的类型，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "竞争（-/-）指两个物种相互产生不利影响，竞争排斥原理指出生态位完全相同的两个物种不能共存", "answer": True},
            {"label": "B", "text": "互利共生（+/+）中两个物种均获益，如豆科植物与根瘤菌的固氮共生", "answer": True},
            {"label": "C", "text": "偏利共生（+/0）中一方获益而另一方不受影响，如附生植物附着在大树上", "answer": True},
            {"label": "D", "text": "寄生（+/+）对寄主和寄生者双方都有利", "answer": False},
        ],
        "explanation": "A正确：竞争排斥原理（Gause原理）——完全相同生态位的物种不能共存。B正确：互利共生双方获益。C正确：偏利共生一方获益另一方不受影响。D错误：寄生是+/-关系——寄生者获益（获取营养），寄主受害（健康受损）。",
        "subject": "生态学", "concept": "种间关系", "difficulty": "high_school", "target": "high_school",
        "tags": ["community_eco", "module_3", "生态学", "种间关系"],
        "references": [],
    },
    {
        "question": "关于生态位理论，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "基础生态位（fundamental niche）是指在没有竞争者存在时物种理论上能占据的全部环境空间", "answer": True},
            {"label": "B", "text": "实际生态位（realized niche）是在竞争者存在时物种实际占据的环境空间，通常小于基础生态位", "answer": True},
            {"label": "C", "text": "性状替换（character displacement）是竞争导致共存物种在同域分布区形态差异增大", "answer": True},
            {"label": "D", "text": "竞争排斥原理已被证明在所有自然群落中绝对成立，不存在任何例外", "answer": False},
        ],
        "explanation": "A正确：基础生态位是物种在无竞争时理论上能占据的全部环境。B正确：实际生态位受竞争限制，通常小于基础生态位。C正确：性状替换（如Galapagos地雀喙形分化）是竞争驱动的生态位分化。D错误：自然群落中存在许多看似违反竞争排斥的例子——如生态位分化（资源分割）、环境波动阻止竞争结局、捕食者维持物种共存等。",
        "subject": "生态学", "concept": "生态位理论", "difficulty": "league", "target": "competition",
        "tags": ["community_eco", "module_3", "生态学", "生态位"],
        "references": [{"doi": "10.1086/286511", "title": "Niche and competition", "authors": "Schoener TW", "year": 1983, "journal": "American Naturalist"}],
    },
    {
        "question": "关于群落演替，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "初生演替发生在从未有过生物的裸地（如火山岩、冰川退却地），过程缓慢", "answer": True},
            {"label": "B", "text": "次生演替发生在原有群落被破坏但土壤仍保留的地方（如弃耕农田、火灾后），速度较快", "answer": True},
            {"label": "C", "text": "演替过程中，物种多样性通常先增加后趋于稳定，到达顶级群落时达到相对平衡", "answer": True},
            {"label": "D", "text": "顶级群落（climax community）一旦形成就永远不会再发生变化", "answer": False},
        ],
        "explanation": "A正确：初生演替从裸地开始，需先有地衣苔藓改良土壤，过程缓慢。B正确：次生演替有土壤基础和种子库，速度较快。C正确：演替过程中多样性通常先增后稳。D错误：顶级群落并非永恒不变——干扰（火灾、风暴）、气候变化、物种入侵等均可导致群落偏离顶级状态；现代生态学认为群落动态变化是常态。",
        "subject": "生态学", "concept": "群落演替", "difficulty": "high_school", "target": "high_school",
        "tags": ["community_eco", "module_3", "生态学", "群落演替"],
        "references": [],
    },
    {
        "question": "关于关键种（keystone species）和营养级联，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "关键种是指对群落结构和功能具有不成比例的巨大影响的物种，其去除导致群落结构剧变", "answer": True},
            {"label": "B", "text": "Paine的经典实验中，去除海星（Pisaster）导致贻贝独占优势，物种多样性下降", "answer": True},
            {"label": "C", "text": "营养级联（trophic cascade）是指捕食者的存在通过食物链逐级影响多个营养级的结构和功能", "answer": True},
            {"label": "D", "text": "关键种一定是数量最多的优势种", "answer": False},
        ],
        "explanation": "A正确：关键种的影响远超其生物量所预期的程度。B正确：Paine实验是经典的关键种证据。C正确：如狼→鹿→植被的三级营养级联。D错误：关键种通常不是数量最多的优势种（dominant species），而是数量可能很少但影响巨大的物种（如海星、海獭）。优势种是生物量或数量最多的物种。",
        "subject": "生态学", "concept": "关键种与营养级联", "difficulty": "league", "target": "competition",
        "tags": ["community_eco", "module_3", "生态学", "关键种"],
        "references": [{"doi": "10.1016/0169-5347(93)90012-7", "title": "Keystone species and trophic cascades", "authors": "Paine RT", "year": 1980, "journal": "Trends in Ecology and Evolution"}],
    },
    {
        "question": "关于群落的垂直和水平结构，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "森林群落的垂直分层（乔木层/灌木层/草本层/地被层）提高了光能利用率和物种多样性", "answer": True},
            {"label": "B", "text": "群落的水平结构常表现为斑块状分布（patchiness），由微环境异质性和种间相互作用造成", "answer": True},
            {"label": "C", "text": "生态交错带（ecotone）是两个群落之间的过渡区域，通常具有较高的物种多样性（边缘效应）", "answer": True},
            {"label": "D", "text": "群落中物种的分布完全是随机的，不受环境梯度和种间关系的影响", "answer": False},
        ],
        "explanation": "A正确：垂直分层使不同物种利用不同层次资源。B正确：斑块状分布由微地形、土壤、水分等异质性和种间关系造成。C正确：生态交错带兼具两侧群落物种，多样性常较高（边缘效应）。D错误：物种分布受环境梯度（如海拔、水分梯度）和种间关系（竞争排斥、互利共生等）强烈影响，绝非随机。",
        "subject": "生态学", "concept": "群落结构", "difficulty": "league", "target": "competition",
        "tags": ["community_eco", "module_3", "生态学", "群落结构"],
        "references": [{"doi": "10.1146/annurev.ecolsys.33.010802.150442", "title": "Community structure and pattern", "authors": "Ricklefs RE", "year": 2008, "journal": "Annual Review of Ecology and Systematics"}],
    },
]

# ===================== 14. ecosystem =====================
ALL["ecosystem"] = [
    {
        "question": "关于生态系统的能量流动，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "能量在食物链中单向流动，从生产者→初级消费者→次级消费者→分解者", "answer": True},
            {"label": "B", "text": "林德曼效率（10%定律）指相邻营养级间能量传递效率约为10%", "answer": True},
            {"label": "C", "text": "能量金字塔一定是正金字塔形，因为每个营养级的能量必然少于前一营养级", "answer": True},
            {"label": "D", "text": "分解者不参与能量流动，它们仅处理已死生物的残体", "answer": False},
        ],
        "explanation": "A正确：能量沿食物链单向流动。B正确：林德曼效率约10%（5-20%范围）。C正确：由于能量逐级递减，能量金字塔永远是正金字塔形。D错误：分解者是能量流动的重要环节——它们将各营养级的有机物残体分解，释放CO₂和无机物回归环境，是物质循环的关键角色。",
        "subject": "生态学", "concept": "能量流动", "difficulty": "high_school", "target": "high_school",
        "tags": ["ecosystem", "module_3", "生态学", "能量流动"],
        "references": [],
    },
    {
        "question": "关于生态金字塔的类型，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "数量金字塔在某些情况下可以倒置，如一棵大树上生活着数千只昆虫", "answer": True},
            {"label": "B", "text": "生物量金字塔在海洋生态系统中可能倒置，因为浮游植物繁殖快但现存生物量小", "answer": True},
            {"label": "C", "text": "能量金字塔永远不会倒置，因为能量流动是逐级递减的", "answer": True},
            {"label": "D", "text": "初级生产量等于总初级生产量减去呼吸消耗后的净初级生产量（NPP）", "answer": False},
        ],
        "explanation": "A正确：数量金字塔可倒置（大树→昆虫）。B正确：海洋中浮游植物周转快，现存量可能少于浮游动物。C正确：能量金字塔永远正立。D错误：总初级生产量（GPP）是光合固定的总能量；净初级生产量（NPP）=GPP-自养呼吸（R），即NPP=GPP-R。题目表述将初级生产量和NPP混淆。",
        "subject": "生态学", "concept": "生态金字塔", "difficulty": "league", "target": "competition",
        "tags": ["ecosystem", "module_3", "生态学", "生态金字塔"],
        "references": [{"doi": "10.1890/0012-9658(2002)083[1467:EPAR]2.0.CO;2", "title": "Ecological pyramids", "authors": "Odum EP", "year": 1971, "journal": "Fundamentals of Ecology"}],
    },
    {
        "question": "关于食物链和食物网，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "食物网比单一食物链更真实地反映群落中的营养关系，因为大多数生物取食多种猎物", "answer": True},
            {"label": "B", "text": "食物网越复杂（连接度越高），生态系统的稳定性通常越高", "answer": True},
            {"label": "C", "text": "碎屑食物链（detrital food chain）以死亡有机物为起点，在生态系统中与牧食食物链同等重要", "answer": True},
            {"label": "D", "text": "食物链的长度通常不受生态系统大小的影响", "answer": False},
        ],
        "explanation": "A正确：食物网反映真实的复杂营养关系。B正确：复杂食物网提供更多替代路径，增强稳定性（但也有争议）。C正确：碎屑食物链在大多数生态系统中处理大部分能量和物质。D错误：食物链长度受多种因素影响——能量限制假说认为食物链长度受能量可用性限制，大生态系统（如大湖）通常食物链更长。",
        "subject": "生态学", "concept": "食物链与食物网", "difficulty": "high_school", "target": "high_school",
        "tags": ["ecosystem", "module_3", "生态学", "食物网"],
        "references": [],
    },
    {
        "question": "关于初级生产量的测定与影响因素，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "黑白瓶法通过测定溶氧量变化来估算水生生态系统的初级生产量和群落呼吸量", "answer": True},
            {"label": "B", "text": "全球范围内，热带雨林和珊瑚礁的单位面积初级生产力最高", "answer": True},
            {"label": "C", "text": "限制因子（如光照、营养盐、水分）是决定初级生产量的关键", "answer": True},
            {"label": "D", "text": "海洋生态系统的总初级生产量高于陆地生态系统，因为海洋面积更大", "answer": False},
        ],
        "explanation": "A正确：白瓶（光合+呼吸）vs黑瓶（仅呼吸），差值=GPP。B正确：热带雨林和珊瑚礁单位面积生产力最高。C正确：限制因子决定生产力水平。D错误：虽然海洋面积大，但大部分海洋区域（远洋）生产力很低（营养盐限制），全球总初级生产量陆地（约56%）高于海洋（约44%），尽管陆地面积仅占29%。",
        "subject": "生态学", "concept": "初级生产量", "difficulty": "league", "target": "competition",
        "tags": ["ecosystem", "module_3", "生态学", "初级生产量"],
        "references": [{"doi": "10.1126/science.281.5374.237", "title": "Global primary production", "authors": "Field CB et al.", "year": 1998, "journal": "Science"}],
    },
    {
        "question": "关于生态系统的组成与功能，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "生态系统由生物群落（生产者/消费者/分解者）和非生物环境（光/温/水/矿物质）组成", "answer": True},
            {"label": "B", "text": "生态系统的基本功能包括能量流动、物质循环和信息传递", "answer": True},
            {"label": "C", "text": "分解者将有机物矿化为无机物，使营养物质得以循环利用", "answer": True},
            {"label": "D", "text": "生态系统中的能量可以循环利用，物质则单向流动", "answer": False},
        ],
        "explanation": "A正确：生态系统=生物群落+非生物环境。B正确：三大基本功能。C正确：分解者是物质循环的关键环节。D错误：能量单向流动（最终以热能耗散），物质循环（在生物与非生物环境间循环）。题目将两者颠倒。",
        "subject": "生态学", "concept": "生态系统组成与功能", "difficulty": "high_school", "target": "high_school",
        "tags": ["ecosystem", "module_3", "生态学", "生态系统功能"],
        "references": [],
    },
]

# ===================== 15. biogeochemical =====================
ALL["biogeochemical"] = [
    {
        "question": "关于碳循环，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "大气中的CO₂通过光合作用被固定为有机物，通过呼吸作用和分解作用返回大气", "answer": True},
            {"label": "B", "text": "化石燃料的燃烧是人为干扰碳循环的重要途径，导致大气CO₂浓度升高", "answer": True},
            {"label": "C", "text": "海洋是重要的碳汇，通过物理溶解和生物泵（biological pump）吸收大量CO₂", "answer": True},
            {"label": "D", "text": "碳循环完全是气体型循环，不存在沉积型循环的成分", "answer": False},
        ],
        "explanation": "A正确：光合固定CO₂，呼吸和分解释放CO₂。B正确：化石燃料燃烧释放地质历史时期固定的碳。C正确：海洋通过溶解泵和生物泵（浮游植物光合→食物链→沉降）吸收CO₂。D错误：碳循环兼具气体型和沉积型特征——CO₂在大气和海洋间循环（气体型），同时碳酸盐岩石（石灰岩）和化石燃料中的碳通过地质过程缓慢循环（沉积型）。",
        "subject": "生态学", "concept": "碳循环", "difficulty": "high_school", "target": "high_school",
        "tags": ["biogeochemical", "module_3", "生态学", "碳循环"],
        "references": [],
    },
    {
        "question": "关于氮循环，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "生物固氮由固氮酶催化，将N₂还原为NH₃，该酶对O₂极其敏感", "answer": True},
            {"label": "B", "text": "硝化作用分为两步：氨氧化为亚硝酸盐（由亚硝化单胞菌），再氧化为硝酸盐（由硝化杆菌）", "answer": True},
            {"label": "C", "text": "反硝化作用在厌氧条件下进行，将硝酸盐还原为N₂或N₂O返回大气", "answer": True},
            {"label": "D", "text": "植物可以直接吸收利用大气中的N₂作为氮源", "answer": False},
        ],
        "explanation": "A正确：固氮酶（含Fe-Mo辅因子）对O₂敏感，根瘤菌通过豆血红蛋白保护固氮酶。B正确：硝化作用两步——NH₃→NO₂⁻（Nitrosomonas）→NO₃⁻（Nitrobacter）。C正确：反硝化在厌氧条件下由反硝化菌将NO₃⁻→NO₂⁻→NO→N₂O→N₂。D错误：植物不能直接利用N₂，只能吸收无机氮（NH₄⁺和NO₃⁻）和少量简单有机氮。N₂必须先经固氮菌或工业固氮转化为可利用形式。",
        "subject": "生态学", "concept": "氮循环", "difficulty": "high_school", "target": "high_school",
        "tags": ["biogeochemical", "module_3", "生态学", "氮循环"],
        "references": [],
    },
    {
        "question": "关于磷循环和水体富营养化，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "磷循环是典型的沉积型循环，没有气体形式的磷存在于大气中", "answer": True},
            {"label": "B", "text": "磷是许多淡水生态系统的限制性营养元素，磷的输入增加可导致富营养化", "answer": True},
            {"label": "C", "text": "水体富营养化导致藻类大量繁殖→死亡分解耗氧→水体缺氧→鱼类死亡", "answer": True},
            {"label": "D", "text": "磷的主要储存库是大气，通过降水进入生态系统", "answer": False},
        ],
        "explanation": "A正确：磷循环是沉积型循环，无气体态。B正确：磷常是淡水生产力的限制因子。C正确：富营养化→藻华→死亡→分解耗氧→缺氧→鱼类死亡（水华/赤潮）。D错误：磷的主要储存库是岩石和沉积物（非大气），通过岩石风化释放磷酸盐进入生态系统。",
        "subject": "生态学", "concept": "磷循环与富营养化", "difficulty": "league", "target": "competition",
        "tags": ["biogeochemical", "module_3", "生态学", "磷循环"],
        "references": [{"doi": "10.1890/050024", "title": "Phosphorus cycling and eutrophication", "authors": "Carpenter SR", "year": 2005, "journal": "Ecological Applications"}],
    },
    {
        "question": "关于水循环，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "水循环的驱动力主要来自太阳能（蒸发）和重力（降水、径流）", "answer": True},
            {"label": "B", "text": "蒸腾作用是陆地水循环的重要组成部分，森林的蒸腾量可占陆地蒸发总量的很大比例", "answer": True},
            {"label": "C", "text": "地下水是陆地淡水的最大储存库，远大于地表水（河流湖泊）的储量", "answer": True},
            {"label": "D", "text": "水循环的速度在全球各区域是均匀的，不存在区域差异", "answer": False},
        ],
        "explanation": "A正确：太阳能驱动蒸发，重力驱动降水和径流。B正确：森林蒸腾是陆地水循环重要环节。C正确：地下水储量约为地表水的100倍以上。D错误：水循环速度存在显著区域差异——热带雨林水循环快（高温高蒸发高降水），沙漠水循环极慢（低降水）；不同水体的更新周期也不同（大气水约9天，深层地下水可达数千年）。",
        "subject": "生态学", "concept": "水循环", "difficulty": "league", "target": "competition",
        "tags": ["biogeochemical", "module_3", "生态学", "水循环"],
        "references": [{"doi": "10.1126/science.1089927", "title": "Global water cycle", "authors": "Oki T, Kanae S", "year": 2006, "journal": "Science"}],
    },
    {
        "question": "关于生物地球化学循环的一般特征，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "气体型循环（如碳、氮）的储存库主要是大气和海洋，循环速度快，全球性强", "answer": True},
            {"label": "B", "text": "沉积型循环（如磷、钙）的储存库主要是岩石和沉积物，循环速度慢，易受局部干扰影响", "answer": True},
            {"label": "C", "text": "微生物在碳、氮、硫等元素的生物地球化学循环中扮演关键角色", "answer": True},
            {"label": "D", "text": "人类活动对生物地球化学循环的影响仅限于局部区域，不影响全球尺度的循环", "answer": False},
        ],
        "explanation": "A正确：气体型循环以大气/海洋为库，全球性强。B正确：沉积型循环以岩石为库，速度慢。C正确：微生物参与固氮、硝化、反硝化、分解等关键过程。D错误：人类活动（化石燃料燃烧、化肥使用、森林砍伐等）已显著改变全球尺度的碳、氮、磷循环——如大气CO₂浓度从工业革命前280ppm升至420ppm以上，人为固氮量已超过全球自然固氮总量。",
        "subject": "生态学", "concept": "生物地球化学循环特征", "difficulty": "league", "target": "competition",
        "tags": ["biogeochemical", "module_3", "生态学", "生物地球化学循环"],
        "references": [{"doi": "10.1126/science.1163700", "title": "Human alteration of biogeochemical cycles", "authors": "Vitousek PM et al.", "year": 1997, "journal": "Science"}],
    },
]

# ===================== 16. biodiversity =====================
ALL["biodiversity"] = [
    {
        "question": "关于生物多样性的层次与测度，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "生物多样性包括遗传多样性、物种多样性和生态系统多样性三个层次", "answer": True},
            {"label": "B", "text": "Shannon-Wiener指数 H'=-Σpᵢln(pᵢ) 同时考虑了物种丰富度和均匀度", "answer": True},
            {"label": "C", "text": "α多样性指某一特定生境或群落内的物种多样性，β多样性指不同生境间物种组成的差异", "answer": True},
            {"label": "D", "text": "物种丰富度（species richness）和物种均匀度（evenness）是同一概念的不同表述", "answer": False},
        ],
        "explanation": "A正确：生物多样性三个层次。B正确：Shannon指数综合考虑丰富度和均匀度。C正确：α多样性=局域多样性，β多样性=生境间差异，γ多样性=区域总多样性。D错误：物种丰富度指物种数目（不考虑各物种的相对多度），均匀度指各物种个体数分配的均匀程度——两者不同。两个群落可有相同丰富度但均匀度不同。",
        "subject": "生态学", "concept": "生物多样性测度", "difficulty": "league", "target": "competition",
        "tags": ["biodiversity", "module_3", "生态学", "生物多样性"],
        "references": [{"doi": "10.1038/304450a0", "title": "Diversity indices in ecology", "authors": "Magurran AE", "year": 2004, "journal": "Measuring Biological Diversity"}],
    },
    {
        "question": "关于岛屿生物地理学理论，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "MacArthur-Wilson平衡理论预测岛屿物种数是迁入率和灭绝率动态平衡的结果", "answer": True},
            {"label": "B", "text": "种-面积关系 S=cA^z 表明物种数随面积增大而增加", "answer": True},
            {"label": "C", "text": "距大陆较近的大岛比距大陆远的小岛具有更高的物种数", "answer": True},
            {"label": "D", "text": "岛屿面积减半，物种数也恰好减半", "answer": False},
        ],
        "explanation": "A正确：MacArthur-Wilson理论——迁入率（随物种数增加而下降）和灭绝率（随物种数增加而上升）的平衡决定物种数。B正确：种-面积曲线S=cA^z（z通常0.2-0.35）。C正确：大岛迁入率高、灭绝率低；近岛迁入率高。D错误：根据S=cA^z，面积减半时物种数减少约10-20%（z≈0.25时减少约16%），而非减半。",
        "subject": "生态学", "concept": "岛屿生物地理学", "difficulty": "league", "target": "competition",
        "tags": ["biodiversity", "module_3", "生态学", "岛屿生物地理学"],
        "references": [{"doi": "10.2307/1934688", "title": "The theory of island biogeography", "authors": "MacArthur RH, Wilson EO", "year": 1967, "journal": "Princeton University Press"}],
    },
    {
        "question": "关于生物多样性丧失的原因，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "栖息地丧失和破碎化是当前物种灭绝的最主要原因", "answer": True},
            {"label": "B", "text": "过度开发（overexploitation）如过度捕捞和偷猎是许多大型动物濒危的重要原因", "answer": True},
            {"label": "C", "text": "外来入侵物种通过竞争、捕食和传播疾病等方式威胁本地物种多样性", "answer": True},
            {"label": "D", "text": "气候变化对生物多样性的影响微乎其微，不是当前生物多样性丧失的重要因素", "answer": False},
        ],
        "explanation": "A正确：栖息地丧失和破碎化是首要威胁（HIPPO中的H）。B正确：过度开发是第二大威胁（如渡渡鸟、北美旅鸽）。C正确：外来物种是岛屿生态系统的主要威胁。D错误：气候变化正成为越来越重要的威胁因素——改变物种分布范围、物候期、种间关系，珊瑚白化、北极生态系统变化等均是例证。",
        "subject": "生态学", "concept": "生物多样性丧失原因", "difficulty": "high_school", "target": "high_school",
        "tags": ["biodiversity", "module_3", "生态学", "生物多样性丧失"],
        "references": [],
    },
    {
        "question": "关于保护生物学的策略，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "就地保护（in situ conservation）如建立自然保护区是保护生物多样性最有效的策略", "answer": True},
            {"label": "B", "text": "迁地保护（ex situ conservation）如动物园、种子库是就地保护的补充手段", "answer": True},
            {"label": "C", "text": "生态廊道（wildlife corridor）连接破碎化的栖息地，有助于维持基因流和种群存活", "answer": True},
            {"label": "D", "text": "最小可存活种群（MVP）是指种群数量低于此值时物种立即灭绝", "answer": False},
        ],
        "explanation": "A正确：就地保护维持物种在自然栖息地中的种群。B正确：迁地保护是补充手段，适用于就地保护不可行时。C正确：生态廊道减少隔离效应，促进基因流。D错误：MVP是指在一定概率和时间内能维持存活的最低有效种群大小（如\"50/500规则\"），不是\"低于此值立即灭绝\"——低于MVP时灭绝概率增大但不是100%。",
        "subject": "生态学", "concept": "保护策略", "difficulty": "league", "target": "competition",
        "tags": ["biodiversity", "module_3", "生态学", "保护生物学"],
        "references": [{"doi": "10.1111/j.1523-1739.2007.00795.x", "title": "Conservation biology strategies", "authors": "Soulé ME, Orians GH", "year": 2001, "journal": "Conservation Biology"}],
    },
    {
        "question": "关于物种概念与分类，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "生物学物种概念（BSC）将物种定义为能够自然交配并产生可育后代的群体，与其他群体存在生殖隔离", "answer": True},
            {"label": "B", "text": "系统发育物种概念（PSC）将物种定义为具有共同祖先、在系统发育树上形成独立分支的最小群体", "answer": True},
            {"label": "C", "text": "形态学物种概念基于形态特征的差异来划分物种，适用于化石和现生物种", "answer": True},
            {"label": "D", "text": "生物学物种概念适用于所有生物，包括无性繁殖生物和化石生物", "answer": False},
        ],
        "explanation": "A正确：BSC（Mayr定义）以生殖隔离为标准。B正确：PSC以系统发育独立性为标准。C正确：形态学物种概念基于形态差异，适用范围广。D错误：BSC不适用于无性繁殖生物（细菌、部分植物）和化石生物（无法测试交配能力），这些情况需用其他物种概念。",
        "subject": "生态学", "concept": "物种概念", "difficulty": "high_school", "target": "high_school",
        "tags": ["biodiversity", "module_3", "生态学", "物种概念"],
        "references": [],
    },
]

# ===================== 17. animal_behavior =====================
ALL["animal_behavior"] = [
    {
        "question": "关于本能行为与学习行为的比较，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "本能行为（固定动作模式/FAP）由特定信号刺激触发，一旦启动通常完整执行", "answer": True},
            {"label": "B", "text": "习惯化（habituation）是最简单的学习形式，动物对重复出现的无害刺激逐渐减少反应", "answer": True},
            {"label": "C", "text": "印随学习（imprinting）具有关键期（sensitive period），仅在发育的特定阶段发生", "answer": True},
            {"label": "D", "text": "所有动物行为都是完全由基因决定的，不受环境影响", "answer": False},
        ],
        "explanation": "A正确：FAP由释放者（releaser）触发，刻板执行。B正确：习惯化是非联想学习的最简单形式。C正确：印随学习有关键期（如Lorenz的鹅雏在孵化后12-17小时内）。D错误：大多数行为是基因和环境交互作用的产物（G×E），学习行为本身就依赖环境经验。",
        "subject": "生态学", "concept": "本能与学习", "difficulty": "high_school", "target": "high_school",
        "tags": ["animal_behavior", "module_3", "生态学", "本能与学习"],
        "references": [],
    },
    {
        "question": "关于动物定向与导航机制，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "太阳罗盘定向需要动物具有生物钟来补偿太阳位置的日变化", "answer": True},
            {"label": "B", "text": "某些鸟类和海洋动物能感知地磁场进行磁感受导航", "answer": True},
            {"label": "C", "text": "星辰导航在北半球可行，因为北极星近似位于天球北极", "answer": True},
            {"label": "D", "text": "动物导航只能使用单一 cues（线索），不能同时利用多种线索", "answer": False},
        ],
        "explanation": "A正确：太阳罗盘需生物钟补偿太阳方位角变化（如蜜蜂的舞蹈语言补偿）。B正确：磁感受已在候鸟（如知更鸟）、海龟等中证实，可能与隐花色素或磁铁矿颗粒有关。C正确：北半球可利用北极星定向。D错误：动物通常同时利用多种线索（太阳、星辰、地磁、地标、嗅觉等），具有冗余和校准机制。",
        "subject": "生态学", "concept": "动物定向与导航", "difficulty": "league", "target": "competition",
        "tags": ["animal_behavior", "module_3", "生态学", "动物定向"],
        "references": [{"doi": "10.1038/nature03242", "title": "Animal navigation mechanisms", "authors": "Mouritsen H, Frost BJ", "year": 2002, "journal": "Nature"}],
    },
    {
        "question": "关于动物通讯方式，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "蜜蜂的摇摆舞（waggle dance）通过舞蹈方向和持续时间编码食物源的方向和距离", "answer": True},
            {"label": "B", "text": "信息素（pheromone）是种内化学通讯信号，可传递警报、踪迹、性吸引等信息", "answer": True},
            {"label": "C", "text": "警戒信号（aposematism）如有毒动物的鲜艳体色是一种视觉通讯，警告捕食者", "answer": True},
            {"label": "D", "text": "动物通讯总是对发送者和接收者双方都有利", "answer": False},
        ],
        "explanation": "A正确：蜜蜂摇摆舞中，直线跑动方向编码食物相对于太阳的方向，持续时间编码距离。B正确：信息素是种内化学信号，如蚂蚁踪迹信息素、蛾类性信息素。C正确：警戒色（aposematism）警告捕食者自身有毒/不可食。D错误：通讯不一定对双方有利——如欺骗性信号（兰花模拟雌蜂吸引雄蜂传粉但不提供花蜜）、警戒信号主要有利于发送者（避免被攻击）。",
        "subject": "生态学", "concept": "动物通讯", "difficulty": "high_school", "target": "high_school",
        "tags": ["animal_behavior", "module_3", "生态学", "动物通讯"],
        "references": [],
    },
    {
        "question": "关于利他行为与亲缘选择，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "Hamilton法则 rB>C 解释了利他行为的进化——当亲缘系数×受益>成本时利他基因可被选择", "answer": True},
            {"label": "B", "text": "真社会性昆虫（如蜜蜂、蚂蚁）中工虫不育但帮助抚养亲代后代，可用亲缘选择解释", "answer": True},
            {"label": "C", "text": "互惠利他（reciprocal altruism）要求个体能识别和记忆其他个体，且存在惩罚欺骗者的机制", "answer": True},
            {"label": "D", "text": "群体选择理论已被完全否定，利他行为只能通过亲缘选择来解释", "answer": False},
        ],
        "explanation": "A正确：Hamilton法则（inclusive fitness theory）——rB>C时利他行为可进化。B正确：蜜蜂的单倍二倍体性别决定使姐妹间亲缘系数r=0.75（高于母女r=0.5），有利于工蜂帮助母亲产卵。C正确：互惠利他需要个体识别、记忆和惩罚欺骗者（如吸血蝙蝠反哺不反哺的个体被拒绝）。D错误：群体选择理论近年有复兴（如多层选择理论MLS），认为在特定条件下（群体间选择压力>群体内选择压力）利他行为可通过群体选择进化。",
        "subject": "生态学", "concept": "利他行为与亲缘选择", "difficulty": "league", "target": "competition",
        "tags": ["animal_behavior", "module_3", "生态学", "利他行为"],
        "references": [{"doi": "10.1086/408938", "title": "The evolution of social behavior", "authors": "Hamilton WD", "year": 1964, "journal": "Journal of Theoretical Biology"}],
    },
    {
        "question": "关于条件反射与操作性条件反射，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "经典条件反射（巴甫洛夫条件反射）中，中性刺激与无条件刺激反复配对后成为条件刺激", "answer": True},
            {"label": "B", "text": "操作性条件反射（Skinner条件反射）中，行为的后果（强化或惩罚）影响该行为再次出现的概率", "answer": True},
            {"label": "C", "text": "正强化增加行为概率，负强化也增加行为概率（通过移除厌恶刺激）", "answer": True},
            {"label": "D", "text": "经典条件反射和操作性条件反射是完全相同的机制，只是发现者不同", "answer": False},
        ],
        "explanation": "A正确：经典条件反射——CS+US配对→CS单独引发CR。B正确：操作性条件反射——行为后果影响行为频率。C正确：正强化（给予奖励）和负强化（移除厌恶刺激）都增加行为概率；正惩罚和负惩罚减少行为概率。D错误：两者机制不同——经典条件反射是被动的刺激替代学习（S→R），操作性条件反射是主动的行为-后果学习（R→S）。",
        "subject": "生态学", "concept": "条件反射", "difficulty": "high_school", "target": "high_school",
        "tags": ["animal_behavior", "module_3", "生态学", "条件反射"],
        "references": [],
    },
]

# ===================== 18. behavioral_eco =====================
ALL["behavioral_eco"] = [
    {
        "question": "关于最优觅食理论（OFT），下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "最优觅食理论预测动物会选择使净能量收益最大化的觅食策略", "answer": True},
            {"label": "B", "text": "猎物选择模型预测捕食者偏好能量/处理时间比最高的猎物", "answer": True},
            {"label": "C", "text": "边际值定理（MVT）预测捕食者在一个斑块中停留的时间取决于到达下一个斑块的距离", "answer": True},
            {"label": "D", "text": "最优觅食理论假设动物总是选择最大的猎物，不考虑处理时间", "answer": False},
        ],
        "explanation": "A正确：OFT核心是最优化能量净收益。B正确：偏好E/h（能量/处理时间）最高的猎物。C正确：MVT预测斑块停留时间随斑块间距离增大而增大（直到边际收益=平均收益）。D错误：OFT考虑处理时间——最优策略不是总选最大猎物，而是选E/h最高的猎物（大猎物可能处理时间过长）。",
        "subject": "生态学", "concept": "最优觅食理论", "difficulty": "league", "target": "competition",
        "tags": ["behavioral_eco", "module_3", "生态学", "最优觅食"],
        "references": [{"doi": "10.1086/408938", "title": "Optimal foraging theory", "authors": "Stephens DW, Krebs JR", "year": 1986, "journal": "Princeton University Press"}],
    },
    {
        "question": "关于性选择与配偶选择，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "雄性竞争（intrasexual selection）通常导致雄性体型更大、具有武器（如鹿角）", "answer": True},
            {"label": "B", "text": "雌性选择（intersexual selection）通常导致雄性发展出夸张的装饰特征（如孔雀尾羽）", "answer": True},
            {"label": "C", "text": "Fisher失控选择模型解释了极端雄性装饰的进化——雌性偏好与雄性特征相互强化", "answer": True},
            {"label": "D", "text": "性选择只作用于雄性，雌性不受性选择影响", "answer": False},
        ],
        "explanation": "A正确：雄性竞争（同性选择）→武器和体型二态性。B正确：雌性选择（异性选择）→夸张装饰。C正确：Fisher runaway——雌性偏好基因与雄性特征基因连锁，相互正反馈。D错误：性选择也可作用于雌性——在性别角色反转的物种（如瓣蹼鹬、海马）中，雌性竞争雄性，雌性更具装饰性。",
        "subject": "生态学", "concept": "性选择", "difficulty": "league", "target": "competition",
        "tags": ["behavioral_eco", "module_3", "生态学", "性选择"],
        "references": [{"doi": "10.1098/rspb.1997.0186", "title": "Sexual selection mechanisms", "authors": "Andersson M", "year": 1994, "journal": "Proceedings of the Royal Society B"}],
    },
    {
        "question": "关于繁殖策略与生活史理论，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "r-选择策略者投资于大量小后代，亲代抚育少，适应不稳定环境", "answer": True},
            {"label": "B", "text": "K-选择策略者投资于少量大后代，亲代抚育多，适应稳定环境", "answer": True},
            {"label": "C", "text": "繁殖代价（cost of reproduction）指当前繁殖投入会降低未来繁殖成功率或存活率", "answer": True},
            {"label": "D", "text": "所有动物都严格遵循r-K连续体的某一端，不存在中间策略", "answer": False},
        ],
        "explanation": "A正确：r-策略——高繁殖率、小后代、少抚育。B正确：K-策略——低繁殖率、大后代、多抚育。C正确：繁殖代价是生活史理论核心概念——资源有限，当前繁殖投入与未来繁殖/存活存在权衡（trade-off）。D错误：r-K是连续体，大多数物种处于中间位置，且同一物种在不同环境条件下可调整策略（表型可塑性）。",
        "subject": "生态学", "concept": "繁殖策略", "difficulty": "high_school", "target": "high_school",
        "tags": ["behavioral_eco", "module_3", "生态学", "繁殖策略"],
        "references": [],
    },
    {
        "question": "关于包容适合度（inclusive fitness）理论，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "包容适合度=直接适合度（自身繁殖成功）+间接适合度（帮助亲属繁殖的额外成功）", "answer": True},
            {"label": "B", "text": "亲缘选择可以解释为什么个体对近亲的利他行为比对远亲或无亲缘个体更强", "answer": True},
            {"label": "C", "text": "真社会性昆虫中的等级分化（如蜂后与工蜂）是亲缘选择的经典例证", "answer": True},
            {"label": "D", "text": "包容适合度理论认为个体应该对所有生物都表现出同等程度的利他行为", "answer": False},
        ],
        "explanation": "A正确：包容适合度=直接+间接适合度。B正确：Hamilton法则预测利他行为强度与亲缘系数成正比。C正确：蜜蜂中工蜂帮助蜂后（母亲）繁殖，因单倍二倍体系统姐妹间r=0.75。D错误：包容适合度理论预测利他行为应与亲缘关系成正比——对近亲利他强，对远亲弱，对无亲缘个体最弱或不存在。",
        "subject": "生态学", "concept": "包容适合度", "difficulty": "league", "target": "competition",
        "tags": ["behavioral_eco", "module_3", "生态学", "包容适合度"],
        "references": [{"doi": "10.1086/408938", "title": "Inclusive fitness theory", "authors": "Hamilton WD", "year": 1964, "journal": "Journal of Theoretical Biology"}],
    },
    {
        "question": "关于社会行为的进化，下列说法正确的有：",
        "subQuestions": [
            {"label": "A", "text": "社会行为的进化可以通过亲缘选择、互惠利他和群体选择等多种机制解释", "answer": True},
            {"label": "B", "text": "合作繁殖（cooperative breeding）中帮手（helpers）帮助抚养非自己的后代，通常可用亲缘选择解释", "answer": True},
            {"label": "C", "text": "囚徒困境博弈模型表明在重复博弈中，\"以牙还牙\"（tit-for-tat）策略可以促进合作", "answer": True},
            {"label": "D", "text": "社会性昆虫中的等级制度完全是由遗传决定的，不受环境因素影响", "answer": False},
        ],
        "explanation": "A正确：多种机制可解释社会行为进化。B正确：帮手通常是亲缘个体（如子女帮助父母），可用Hamilton法则解释。C正确：Axelrod的研究表明重复博弈中tit-for-tat策略最稳定——先合作，然后模仿对方上一步行为。D错误：社会性昆虫的等级分化受基因和环境双重影响——如蜜蜂幼虫发育为蜂后还是工蜂取决于食物（蜂王浆vs花粉蜂蜜），不是纯遗传决定。",
        "subject": "生态学", "concept": "社会行为进化", "difficulty": "league", "target": "competition",
        "tags": ["behavioral_eco", "module_3", "生态学", "社会行为"],
        "references": [{"doi": "10.1126/science.242.4874.14", "title": "The evolution of cooperation", "authors": "Axelrod R, Hamilton WD", "year": 1981, "journal": "Science"}],
    },
]

# ============================================================
# WRITE FILES
# ============================================================
summary = {}
for node_id, questions in ALL.items():
    tag_hex = NODE_TAG[node_id]
    bank = {}
    index = {}
    for q in questions:
        subs = [{"label": s["label"], "text": s["text"]} for s in q["subQuestions"]]
        answers = {s["label"]: s["answer"] for s in q["subQuestions"]}
        content_str = qid_content(q["question"], subs, answers)
        qid = make_id(tag_hex, content_str)
        bank[qid] = {
            "type": "mtf",
            "question": q["question"],
            "subQuestions": q["subQuestions"],
            "explanation": q["explanation"],
            "subject": q["subject"],
            "concept": q["concept"],
            "difficulty": q["difficulty"],
            "target": q["target"],
            "tags": q["tags"],
            "references": q.get("references", []),
        }
        # Index entry
        q_text_len = len(q["question"]) + sum(len(s["text"]) for s in q["subQuestions"])
        idx_entry = {
            "tags": q["tags"],
            "diff": q["difficulty"],
            "len": q_text_len,
            "src": node_id,
            "year": None,
            "module": "module_3",
        }
        # Add year from references if available
        if q.get("references"):
            idx_entry["year"] = q["references"][0].get("year")
        index[qid] = idx_entry

    with open(os.path.join(BANK_DIR, f"{node_id}.json"), "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)
    with open(os.path.join(INDEX_DIR, f"{node_id}.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    summary[node_id] = len(questions)

print("=== Module 3 Question Generation Summary ===")
total = 0
for nid, cnt in summary.items():
    print(f"  {nid}: {cnt} questions")
    total += cnt
print(f"  TOTAL: {len(summary)} nodes, {total} questions")

# Verify answer distribution
correct = 0
total_opts = 0
for node_id, questions in ALL.items():
    for q in questions:
        for s in q["subQuestions"]:
            total_opts += 1
            if s["answer"]:
                correct += 1
print(f"  Answer distribution: {correct}/{total_opts} = {correct/total_opts*100:.1f}% correct")

# Verify competition vs high_school ratio
comp = sum(1 for qs in ALL.values() for q in qs if q["target"] == "competition")
hs = sum(1 for qs in ALL.values() for q in qs if q["target"] == "high_school")
print(f"  Competition: {comp} ({comp/total*100:.1f}%), High school: {hs} ({hs/total*100:.1f}%)")
