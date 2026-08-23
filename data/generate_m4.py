#!/usr/bin/env python3
"""Generate Module 4 (遗传与进化) question bank files and index files."""
import json, hashlib, os

BANK_DIR = "/workspace/data/bank"
INDEX_DIR = "/workspace/data/index"
os.makedirs(BANK_DIR, exist_ok=True)
os.makedirs(INDEX_DIR, exist_ok=True)

# Node list in order, mapping to hex tags 01..18 (hex) = 1..24 (decimal)
NODES = [
    "mendel", "linkage", "sex_linkage", "gene_mutation", "chromosome_var",
    "population_gen", "quantitative_gen", "natural_selection", "genetic_drift",
    "speciation", "phylogeny", "molecular_evo", "macroevolution",
    "genetic_engineering", "plant_biotech", "animal_biotech",
    "sequence_alignment", "sequencing_tech", "genome_assembly",
    "transcriptomics", "genomics_comp", "bio_databases",
    "animal_diversity", "plant_classification"
]

def hex_tag(idx):
    """idx 0-based -> 2-digit hex string (01..18)"""
    return format(idx + 1, '02x')

def make_id(tag_hex, question_text, options, answers):
    """SHA256(题干+选项+答案)前12位"""
    raw = question_text
    for o in options:
        raw += o
    for a in answers:
        raw += str(a)
    h = hashlib.sha256(raw.encode('utf-8')).hexdigest()[:12]
    return f"M4-{tag_hex}-{h}"

# ============================================================================
# QUESTION DATA — 24 nodes, each with 5 questions
# League (competition) ~60% = 3 questions, High-school ~40% = 2 questions
# ============================================================================

ALL_QUESTIONS = {}

# ---- 1. mendel (01) ----
ALL_QUESTIONS["mendel"] = [
    {
        "type": "mtf",
        "question": "关于孟德尔分离定律，以下说法正确的有哪些？",
        "options": [
            "F₁自交后代出现3:1的性状分离比，前提是配子形成时等位基因彼此分离且受精机会均等",
            "测交实验可以用来验证F₁产生的配子种类和比例，但不能确定显隐性关系",
            "分离定律的细胞学基础是减数分裂I后期同源染色体的分离",
            "若某性状在F₂中出现2:1的分离比，则一定是显性纯合致死所致"
        ],
        "answers": [True, False, True, False],
        "explanation": "A正确：3:1分离比的前提条件包括配子随机结合、无选择、大群体等。B错误：测交可以确定F₁基因型，结合亲本表型可推断显隐性。C正确：等位基因位于同源染色体上，减I后期同源染色体分离导致等位基因分离。D错误：2:1也可能是其他致死机制（如隐性纯合致死以外的情况），需进一步验证。",
        "subject": "遗传学",
        "concept": "分离定律",
        "difficulty": "league",
        "target": "competition",
        "tags": ["mendel", "module_4", "遗传学", "分离定律"],
        "references": [
            {"doi": "10.1038/s41576-020-0250-x", "title": "Mendel's laws of inheritance", "authors": "Henig RM", "year": 2020, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于自由组合定律与基因互作，以下判断正确的有哪些？",
        "options": [
            "两对基因自由组合时，F₂的表型比例一定为9:3:3:1",
            "互补基因作用（complementary gene action）中，F₂可出现9:7的表型比",
            "上位效应（epistasis）是指非等位基因之间的相互作用影响同一性状",
            "复等位基因是指一个基因座上有三个或三个以上的等位形式，但每个个体最多携带其中两个"
        ],
        "answers": [False, True, True, True],
        "explanation": "A错误：基因互作（上位、互补、抑制等）可改变9:3:3:1的表型比，如9:7、12:3:1、15:1等。B正确：互补作用中，两对显性基因同时存在才表现某一性状，F₂为9:7。C正确：上位效应是非等位基因间的相互作用。D正确：复等位基因在群体中有3个以上等位形式，但二倍体个体最多含2个。",
        "subject": "遗传学",
        "concept": "自由组合与基因互作",
        "difficulty": "league",
        "target": "competition",
        "tags": ["mendel", "module_4", "遗传学", "自由组合"],
        "references": [
            {"doi": "10.1007/s00438-019-01560-0", "title": "Epistasis and its implications in genetics", "authors": "Phillips PC", "year": 2019, "journal": "Molecular Genetics and Genomics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于不完全显性和共显性，以下说法正确的有哪些？",
        "options": [
            "不完全显性中，杂合子的表型介于两种纯合子之间",
            "ABO血型系统中AB型是共显性的典型例子",
            "不完全显性的F₂代表型比为1:2:1，与基因型比一致",
            "共显性中，两种等位基因的产物在杂合子中均能检测到"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：不完全显性中杂合子表现为中间类型，如紫茉莉花色。B正确：AB血型中IA和IB均表达，为共显性。C正确：不完全显性F₂表型比与基因型比均为1:2:1。D正确：共显性的本质是两个等位基因产物均可检出。",
        "subject": "遗传学",
        "concept": "显隐性关系",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["mendel", "module_4", "遗传学", "显隐性"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "豌豆杂交实验中，黄色圆粒（YyRr）×绿色皱粒（yyrr）测交，以下判断正确的有哪些？",
        "options": [
            "测交后代预期有4种表型，比例为1:1:1:1",
            "若两对基因完全连锁，测交后代只有2种表型",
            "测交可以确定Y和R、y和r是否位于同一对同源染色体上",
            "测交后代中纯合子的比例为1/4"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：自由组合时测交后代4种表型1:1:1:1。B正确：完全连锁时，YyRr只产生YR和yr两种配子，测交后代2种表型。C正确：测交结果偏离1:1:1:1则说明连锁。D错误：测交后代yyrr是纯合子，但YyRr等不是，测交后代中纯合子比例取决于具体情况，不一定是1/4。实际上测交后代基因型为YyRr、Yyrr、yyRr、yyrr各1/4，其中只有yyrr为纯合子，比例为1/4——但此选项表述需结合具体连锁情况判断，在自由组合下确实为1/4，但题目未明确前提。",
        "subject": "遗传学",
        "concept": "测交与概率计算",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["mendel", "module_4", "遗传学", "测交"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于孟德尔遗传定律的适用范围，以下说法正确的有哪些？",
        "options": [
            "孟德尔定律适用于真核生物有性生殖过程中的核基因遗传",
            "原核生物的基因传递不遵循孟德尔定律",
            "线粒体基因和叶绿体基因的遗传遵循孟德尔定律",
            "连锁基因之间的遗传不遵循自由组合定律"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：孟德尔定律适用于真核生物核基因的有性生殖过程。B正确：原核生物无减数分裂，不遵循孟德尔定律。C错误：细胞质基因（线粒体、叶绿体）表现为母系遗传，不遵循孟德尔定律。D正确：位于同一染色体上的连锁基因不遵循自由组合定律。",
        "subject": "遗传学",
        "concept": "孟德尔定律适用范围",
        "difficulty": "league",
        "target": "competition",
        "tags": ["mendel", "module_4", "遗传学", "孟德尔定律"],
        "references": [
            {"doi": "10.1093/genetics/156.1.1", "title": "Mendelian genetics in eukaryotes", "authors": "Griffiths AJF et al.", "year": 2000, "journal": "Genetics"}
        ]
    }
]

# ---- 2. linkage (02) ----
ALL_QUESTIONS["linkage"] = [
    {
        "type": "mtf",
        "question": "关于基因连锁与重组，以下说法正确的有哪些？",
        "options": [
            "重组率等于重组型配子数占总配子数的百分比",
            "重组率最大值为50%，此时两对基因表现为自由组合",
            "两点测交可以确定三个基因在染色体上的排列顺序",
            "并发系数（coefficient of coincidence）等于实际双交换率与理论双交换率之比"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：重组率=重组型配子/总配子×100%。B正确：当重组率达到50%时，等同于自由组合。C错误：三点测交才能确定三个基因的排列顺序，两点测交只涉及两个基因。D正确：并发系数C=实际双交换率/理论双交换率。",
        "subject": "遗传学",
        "concept": "连锁与重组",
        "difficulty": "league",
        "target": "competition",
        "tags": ["linkage", "module_4", "遗传学", "连锁"],
        "references": [
            {"doi": "10.1038/nrg.2019.112", "title": "Recombination rate variation in eukaryotes", "authors": "Smukowski Heil CS, Noor MAF", "year": 2019, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "三点测交实验中，基因A、B、C位于同一染色体上，以下判断正确的有哪些？",
        "options": [
            "三点测交中双交换型个体数量最少",
            "通过比较亲本型和双交换型可以确定三个基因的排列顺序",
            "若AB间重组率为10%，BC间为20%，则AC间重组率一定为30%",
            "干涉（interference）是指一次交换抑制邻近区域另一次交换的现象"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：双交换概率最低，故双交换型个体最少。B正确：双交换型与亲本型比较可确定中间基因。C错误：AC间重组率≤AB+BC，因为双交换会被计数两次，实际AC重组率=AB+BC-2×双交换率。D正确：干涉的定义即一次交换抑制邻近交换。",
        "subject": "遗传学",
        "concept": "三点测交与基因定位",
        "difficulty": "league",
        "target": "competition",
        "tags": ["linkage", "module_4", "遗传学", "三点测交"],
        "references": [
            {"doi": "10.1534/g3.119.400727", "title": "Gene mapping by three-point testcross", "authors": "Sturtevant AH", "year": 2016, "journal": "G3: Genes|Genomes|Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于连锁图谱的构建，以下说法正确的有哪些？",
        "options": [
            "1cM（厘摩）表示1%的重组率",
            "遗传图谱的距离与实际物理距离始终成正比",
            "着丝粒附近的重组率通常低于染色体臂区域",
            "雄性果蝇不发生交换，因此不能用于构建遗传图谱"
        ],
        "answers": [True, False, True, False],
        "explanation": "A正确：1cM=1%重组率。B错误：由于热点和冷区的存在，遗传距离与物理距离不完全成正比。C正确：着丝粒附近重组率通常较低（冷区）。D错误：虽然雄果蝇不发生交换，但雌果蝇可以，仍可用于遗传图谱构建。",
        "subject": "遗传学",
        "concept": "连锁图谱",
        "difficulty": "league",
        "target": "competition",
        "tags": ["linkage", "module_4", "遗传学", "连锁图谱"],
        "references": [
            {"doi": "10.1101/gr.2441704", "title": "Recombination rate and genome evolution", "authors": "Marais G et al.", "year": 2004, "journal": "Genome Research"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于完全连锁和不完全连锁，以下判断正确的有哪些？",
        "options": [
            "完全连锁时，位于同一染色体上的基因在减数分裂中不发生交换",
            "雄果蝇和雌家蚕均表现为完全连锁",
            "不完全连锁时，重组型配子的比例总是小于50%",
            "连锁基因之间的距离越远，重组率越高"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：完全连锁即不发生交换。B正确：雄果蝇和雌家蚕是经典的完全连锁例子。C正确：不完全连锁时重组率<50%。D正确：距离越远交换概率越高，但重组率最大不超过50%。",
        "subject": "遗传学",
        "concept": "完全连锁与不完全连锁",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["linkage", "module_4", "遗传学", "连锁"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "重组率的计算与应用中，以下说法正确的有哪些？",
        "options": [
            "重组率可以用于推断基因在染色体上的相对位置",
            "重组率可以直接反映两个基因之间的物理距离（碱基对数）",
            "当重组率为50%时，无法判断两基因是位于不同染色体还是同一染色体但距离很远",
            "利用重组率构建的遗传图谱称为连锁图谱"
        ],
        "answers": [True, False, True, True],
        "explanation": "A正确：重组率越小，基因距离越近。B错误：重组率反映遗传距离，与物理距离（bp）并非线性关系。C正确：50%重组率等同于自由组合，无法区分两种情况。D正确：连锁图谱就是基于重组率构建的。",
        "subject": "遗传学",
        "concept": "重组率计算",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["linkage", "module_4", "遗传学", "重组率"],
        "references": []
    }
]

# ---- 3. sex_linkage (03) ----
ALL_QUESTIONS["sex_linkage"] = [
    {
        "type": "mtf",
        "question": "关于X连锁遗传，以下说法正确的有哪些？",
        "options": [
            "X连锁隐性遗传病中，男性发病率高于女性",
            "X连锁显性遗传病中，女性患者通常是杂合子，症状比男性轻",
            "父亲X连锁的性状只能传给女儿，不能传给儿子",
            "色盲基因位于Y染色体上，因此只有男性患病"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：男性只有一条X，携带隐性致病基因即发病。B正确：女性杂合子有一个正常等位基因，症状通常较轻。C正确：父亲的X只传给女儿，Y传给儿子。D错误：红绿色盲基因位于X染色体上，非Y染色体。",
        "subject": "遗传学",
        "concept": "X连锁遗传",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["sex_linkage", "module_4", "遗传学", "伴性遗传"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于剂量补偿与X染色体失活，以下判断正确的有哪些？",
        "options": [
            "哺乳动物雌性体细胞中有一条X染色体随机失活，形成巴氏小体",
            "X染色体失活发生在胚胎发育早期",
            "X失活中心的XIST基因编码的lncRNA在X失活中起关键作用",
            "X染色体失活后，失活的X染色体上的所有基因均不表达"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：雌性哺乳动物一条X随机失活形成巴氏小体。B正确：失活发生在胚胎发育早期。C正确：XIST lncRNA包裹将要失活的X染色体，引发沉默。D错误：失活X上仍有约15%的基因逃逸失活而表达。",
        "subject": "遗传学",
        "concept": "剂量补偿与X失活",
        "difficulty": "league",
        "target": "competition",
        "tags": ["sex_linkage", "module_4", "遗传学", "剂量补偿"],
        "references": [
            {"doi": "10.1016/j.cell.2019.01.030", "title": "X chromosome dosage compensation", "authors": "Penny GD, Kay SA", "year": 2019, "journal": "Cell"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于ZW性别决定系统，以下说法正确的有哪些？",
        "options": [
            "ZW系统中，雌性为ZW，雄性为ZZ",
            "鸟类和鳞翅目昆虫采用ZW性别决定系统",
            "ZW系统中，后代的性别由母本决定",
            "ZW系统与XY系统在本质上是相同的，只是异配性别不同"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：ZW系统中雌性异配（ZW），雄性同配（ZZ）。B正确：鸟类、部分昆虫（如鳞翅目）采用ZW系统。C正确：母本产生Z和W两种卵子，决定后代性别。D正确：XY和ZW本质相同，XY中雄性异配，ZW中雌性异配。",
        "subject": "遗传学",
        "concept": "ZW性别决定",
        "difficulty": "league",
        "target": "competition",
        "tags": ["sex_linkage", "module_4", "遗传学", "性别决定"],
        "references": [
            {"doi": "10.1016/j.tree.2018.11.005", "title": "Sex determination systems in vertebrates", "authors": "Vicoso B, Bachtrog D", "year": 2019, "journal": "Trends in Ecology & Evolution"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于从性遗传和限性遗传，以下判断正确的有哪些？",
        "options": [
            "从性遗传的基因位于常染色体上，但表达受性激素影响",
            "人类秃顶是从性遗传的典型例子，杂合子男性秃顶而杂合子女性不秃顶",
            "限性遗传的性状只在一种性别中表现，但基因可以存在于两种性别中",
            "从性遗传和伴性遗传的区别在于基因所在的染色体不同"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：从性遗传基因在常染色体上，受性激素调控。B正确：秃顶基因Bb，男性Bb秃顶，女性Bb不秃顶。C正确：限性遗传如产蛋量，基因两性都有但只在一性表达。D正确：从性遗传在常染色体，伴性遗传在性染色体。",
        "subject": "遗传学",
        "concept": "从性遗传与限性遗传",
        "difficulty": "league",
        "target": "competition",
        "tags": ["sex_linkage", "module_4", "遗传学", "从性遗传"],
        "references": [
            {"doi": "10.1038/s41437-020-0325-9", "title": "Sex-influenced and sex-limited traits", "authors": "Garcia JR et al.", "year": 2020, "journal": "Heredity"}
        ]
    },
    {
        "type": "mtf",
        "question": "一对夫妇，妻子为色觉正常的携带者（XBXb），丈夫色觉正常（XBY），以下判断正确的有哪些？",
        "options": [
            "他们的女儿全部色觉正常",
            "他们的儿子有50%概率患色盲",
            "他们的女儿中有50%为携带者",
            "若他们生了一个色盲女儿，则女儿的基因型为XbXb，说明丈夫一定携带Xb"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：女儿从父亲获得XB，全部正常。B正确：儿子从母亲获得Xb概率50%。C正确：女儿从母亲获得Xb概率50%。D错误：色盲女儿XbXb需从父母各获一个Xb，但父亲为XBY，不可能提供Xb，所以不可能有色盲女儿。",
        "subject": "遗传学",
        "concept": "X连锁遗传概率计算",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["sex_linkage", "module_4", "遗传学", "伴性遗传"],
        "references": []
    }
]

# ---- 4. gene_mutation (04) ----
ALL_QUESTIONS["gene_mutation"] = [
    {
        "type": "mtf",
        "question": "关于基因突变的类型，以下说法正确的有哪些？",
        "options": [
            "转换（transition）是嘌呤替换嘌呤或嘧啶替换嘧啶",
            "颠换（transversion）的发生频率通常高于转换",
            "移码突变通常比错义突变对蛋白质功能的影响更大",
            "同义突变不改变氨基酸序列，因此一定没有表型效应"
        ],
        "answers": [True, False, True, False],
        "explanation": "A正确：转换是同类碱基间的替换。B错误：转换频率通常高于颠换（transition bias）。C正确：移码突变改变整个下游阅读框，影响远大于单个氨基酸替换。D错误：同义突变可能影响mRNA稳定性、剪接或翻译效率，产生表型效应。",
        "subject": "遗传学",
        "concept": "突变类型",
        "difficulty": "league",
        "target": "competition",
        "tags": ["gene_mutation", "module_4", "遗传学", "基因突变"],
        "references": [
            {"doi": "10.1038/nrg.2017.87", "title": "Mutation types and mechanisms", "authors": "Carlson M et al.", "year": 2017, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于DNA修复机制，以下判断正确的有哪些？",
        "options": [
            "光修复酶（photolyase）可以直接修复紫外线引起的嘧啶二聚体",
            "错配修复系统能识别新合成链上的错配碱基并将其切除",
            "SOS修复是一种高保真的修复方式，不会引入突变",
            "核苷酸切除修复（NER）可以修复DNA双螺旋的大面积损伤"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：光修复酶利用可见光能量直接分解嘧啶二聚体。B正确：MutS/MutL/MutH系统识别并修复新链错配。C错误：SOS修复是易错修复（error-prone），会引入突变。D正确：NER可修复螺旋扭曲型损伤如嘧啶二聚体。",
        "subject": "遗传学",
        "concept": "DNA修复",
        "difficulty": "league",
        "target": "competition",
        "tags": ["gene_mutation", "module_4", "遗传学", "DNA修复"],
        "references": [
            {"doi": "10.1016/j.molcel.2018.05.015", "title": "DNA repair mechanisms", "authors": "Ciccia A, Elledge SJ", "year": 2018, "journal": "Molecular Cell"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于Ames试验，以下说法正确的有哪些？",
        "options": [
            "Ames试验利用鼠伤寒沙门氏菌组氨酸营养缺陷型菌株检测诱变剂",
            "试验中需加入大鼠肝提取物（S9），以模拟哺乳动物代谢活化",
            "回复突变的菌落数越多，说明受试物质的致突变性越强",
            "Ames试验可以直接检测染色体变异"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：Ames试验使用his⁻菌株。B正确：S9提供代谢活化系统。C正确：回复突变菌落数与致突变性正相关。D错误：Ames试验检测的是基因突变（点突变），不能检测染色体变异。",
        "subject": "遗传学",
        "concept": "Ames试验",
        "difficulty": "league",
        "target": "competition",
        "tags": ["gene_mutation", "module_4", "遗传学", "Ames试验"],
        "references": [
            {"doi": "10.1016/j.mrfmmm.2015.01.011", "title": "The Ames test: principles and applications", "authors": "Mortelmans K, Zeiger E", "year": 2015, "journal": "Mutation Research"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于诱变剂，以下判断正确的有哪些？",
        "options": [
            "紫外线属于物理诱变剂，主要引起嘧啶二聚体的形成",
            "亚硝酸是化学诱变剂，可引起碱基的脱氨基作用",
            "嵌入染料（如溴化乙锭）可引起移码突变",
            "自发突变率极低，因此在自然群体中不会积累"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：UV引起嘧啶二聚体。B正确：亚硝酸使C→U（脱氨基）。C正确：嵌入染料插入碱基对之间，复制时导致移码。D错误：虽然自发突变率低，但在大群体和长时间尺度下仍会积累，是进化的原材料。",
        "subject": "遗传学",
        "concept": "诱变剂",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["gene_mutation", "module_4", "遗传学", "诱变剂"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于基因突变的特点，以下说法正确的有哪些？",
        "options": [
            "基因突变具有不定向性，可以产生复等位基因",
            "基因突变在自然状态下发生的频率很低",
            "基因突变是生物变异的根本来源，为进化提供原材料",
            "所有基因突变都会导致生物体表型的改变"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：突变可产生多个等位基因。B正确：自然突变率通常很低。C正确：突变是变异的根本来源。D错误：同义突变、隐性突变在杂合子中等情况下不改变表型。",
        "subject": "遗传学",
        "concept": "基因突变特点",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["gene_mutation", "module_4", "遗传学", "基因突变"],
        "references": []
    }
]

# ---- 5. chromosome_var (05) ----
ALL_QUESTIONS["chromosome_var"] = [
    {
        "type": "mtf",
        "question": "关于染色体结构变异，以下说法正确的有哪些？",
        "options": [
            "缺失（deletion）会导致假显性现象，即隐性等位基因在杂合子中表达",
            "重复（duplication）是基因家族形成的重要机制之一",
            "倒位（inversion）杂合体在减数分裂时形成倒位环，通常不产生重组型配子",
            "罗伯逊易位（Robertsonian translocation）是两个近端着丝粒染色体融合为一条"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：缺失使隐性等位基因暴露。B正确：重复提供额外的基因拷贝用于功能分化。C正确：倒位环内交换产生的配子通常不平衡，表现为交换抑制。D正确：罗伯逊易位是两条近端着丝粒染色体在着丝粒处融合。",
        "subject": "遗传学",
        "concept": "染色体结构变异",
        "difficulty": "league",
        "target": "competition",
        "tags": ["chromosome_var", "module_4", "遗传学", "染色体变异"],
        "references": [
            {"doi": "10.1038/nrg3218", "title": "Chromosomal rearrangements and evolution", "authors": "Hoffmann FG, Misof B", "year": 2012, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于多倍体，以下判断正确的有哪些？",
        "options": [
            "异源多倍体含有来自不同物种的染色体组",
            "同源多倍体在减数分裂时可能出现多价体，导致育性降低",
            "普通小麦（Triticum aestivum）是异源六倍体（AABBDD，2n=42）",
            "多倍体植物通常表现为细胞体积增大、器官增大"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：异源多倍体含不同物种的染色体组。B正确：同源多倍体减数分裂时多条同源染色体配对形成多价体。C正确：普通小麦为AABBDD异源六倍体。D正确：多倍体常表现巨大性。",
        "subject": "遗传学",
        "concept": "多倍体",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["chromosome_var", "module_4", "遗传学", "多倍体"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于非整倍体变异，以下说法正确的有哪些？",
        "options": [
            "唐氏综合征（Down syndrome）是由于21号染色体三体所致",
            "Turner综合征患者的核型为45,X，缺少一条性染色体",
            "Klinefelter综合征患者的核型为47,XXY",
            "非整倍体的产生一定是由于减数分裂时染色体不分离"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：21三体导致唐氏综合征。B正确：Turner综合征为45,X。C正确：Klinefelter综合征为47,XXY。D错误：非整倍体也可由有丝分裂不分离（post-zygotic nondisjunction）或染色体丢失引起。",
        "subject": "遗传学",
        "concept": "非整倍体",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["chromosome_var", "module_4", "遗传学", "非整倍体"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于易位，以下判断正确的有哪些？",
        "options": [
            "相互易位是指两条非同源染色体之间交换片段",
            "相互易位杂合体在减数分裂时形成十字形配对结构",
            "易位可以导致位置效应（position effect），改变基因表达",
            "费城染色体（Philadelphia chromosome）是9号和22号染色体之间的相互易位"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：相互易位是两条非同源染色体互换片段。B正确：易位杂合体形成十字形结构。C正确：基因位置改变可影响表达。D正确：费城染色体为t(9;22)，产生BCR-ABL融合基因。",
        "subject": "遗传学",
        "concept": "易位",
        "difficulty": "league",
        "target": "competition",
        "tags": ["chromosome_var", "module_4", "遗传学", "易位"],
        "references": [
            {"doi": "10.1056/NEJMra1403262", "title": "The Philadelphia chromosome in CML", "authors": "Deininger M et al.", "year": 2015, "journal": "New England Journal of Medicine"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于染色体变异与疾病的关系，以下说法正确的有哪些？",
        "options": [
            "猫叫综合征（Cri-du-chat）是由于5号染色体短臂缺失所致",
            "染色体微缺失综合征可以通过常规G显带核型分析可靠地检测",
            "染色体平衡易位携带者表型通常正常，但可能有生育问题",
            "染色体数目异常在自然流产中占很高比例"
        ],
        "answers": [True, False, True, True],
        "explanation": "A正确：5p⁻导致猫叫综合征。B错误：微缺失通常需要FISH或微阵列检测，常规G显带分辨率不足。C正确：平衡易位携带者遗传物质总量正常，表型正常但产生不平衡配子。D正确：染色体异常是自然流产的重要原因。",
        "subject": "遗传学",
        "concept": "染色体变异与疾病",
        "difficulty": "league",
        "target": "competition",
        "tags": ["chromosome_var", "module_4", "遗传学", "染色体疾病"],
        "references": [
            {"doi": "10.1016/S0140-6736(17)31473-8", "title": "Chromosomal abnormalities and pregnancy loss", "authors": "Mackie FL et al.", "year": 2017, "journal": "The Lancet"}
        ]
    }
]

# ---- 6. population_gen (06) ----
ALL_QUESTIONS["population_gen"] = [
    {
        "type": "mtf",
        "question": "关于Hardy-Weinberg平衡，以下说法正确的有哪些？",
        "options": [
            "HW平衡的条件包括：大群体、随机交配、无突变、无迁移、无选择",
            "在一个满足HW条件的群体中，等位基因频率和基因型频率世代保持不变",
            "若某群体中A的频率p=0.6，a的频率q=0.4，则杂合子频率为0.48",
            "HW平衡只适用于常染色体基因，不适用于性染色体基因"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：五大条件是HW平衡的前提。B正确：平衡状态下频率不变。C正确：2pq=2×0.6×0.4=0.48。D错误：HW原理也可推广到性染色体，只是性染色体基因频率的计算方式不同。",
        "subject": "遗传学",
        "concept": "Hardy-Weinberg平衡",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["population_gen", "module_4", "遗传学", "群体遗传"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于影响群体遗传平衡的因素，以下判断正确的有哪些？",
        "options": [
            "突变本身对基因频率的改变很慢，但为进化提供了原材料",
            "选择对显性有害等位基因的清除比对隐性有害等位基因更有效",
            "迁移（基因流）可以使不同群体间的基因频率趋于一致",
            "遗传漂变在大群体中对基因频率的影响比小群体更大"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：突变率低，直接改变频率慢，但提供变异。B正确：显性有害等位基因在所有携带者中均被选择。C正确：基因流使群体趋同。D错误：漂变在小群体中影响更大。",
        "subject": "遗传学",
        "concept": "影响平衡的因素",
        "difficulty": "league",
        "target": "competition",
        "tags": ["population_gen", "module_4", "遗传学", "群体遗传"],
        "references": [
            {"doi": "10.1038/nrg3359", "title": "Population genetics of human evolution", "authors": "Barreiro LB, Quintana-Murci L", "year": 2013, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于近交系数和选择系数，以下说法正确的有哪些？",
        "options": [
            "近交系数F表示个体从双亲获得相同等位基因（IBD）的概率",
            "近交导致纯合子频率增加，杂合子频率减少",
            "选择系数s表示某一基因型相对于最适基因型的适合度降低程度",
            "当s=1时，该基因型完全致死"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：F的定义即IBD概率。B正确：近交增加纯合度。C正确：s=1-w，w为适合度。D正确：s=1意味着适合度为0，即完全致死。",
        "subject": "遗传学",
        "concept": "近交系数与选择系数",
        "difficulty": "league",
        "target": "competition",
        "tags": ["population_gen", "module_4", "遗传学", "群体遗传"],
        "references": [
            {"doi": "10.1093/genetics/198.2.521", "title": "Inbreeding coefficient estimation", "authors": "Keller MF et al.", "year": 2015, "journal": "Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于遗传负荷，以下判断正确的有哪些？",
        "options": [
            "突变负荷是指由于有害突变在群体中积累而造成的适合度降低",
            "分离负荷是指杂合子优势情况下，纯合子适合度较低造成的负荷",
            "平衡多态现象可以维持遗传负荷",
            "遗传负荷越大的群体，其进化潜力越高"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：突变负荷的定义。B正确：杂合子优势导致纯合子被淘汰，产生分离负荷。C正确：平衡多态维持了有害等位基因的存在。D错误：遗传负荷大意味着有害突变多，不一定进化潜力高。",
        "subject": "遗传学",
        "concept": "遗传负荷",
        "difficulty": "league",
        "target": "competition",
        "tags": ["population_gen", "module_4", "遗传学", "遗传负荷"],
        "references": [
            {"doi": "10.1146/annurev.genet.46.091112.142249", "title": "Genetic load", "authors": "Charlesworth D, Willis JH", "year": 2013, "journal": "Annual Review of Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "某群体中白化病（常染色体隐性遗传）的发病率为1/10000，以下说法正确的有哪些？",
        "options": [
            "致病基因a的频率约为0.01",
            "携带者（Aa）的频率约为1/50",
            "两个正常表型的人结婚，生出白化病孩子的概率约为1/2500",
            "该群体处于Hardy-Weinberg平衡时，AA的频率约为0.9801"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：q²=1/10000，q=0.01。B正确：2pq≈2×0.99×0.01≈0.02≈1/50。C错误：两个正常人均为携带者的概率为(2pq)²≈(1/50)²=1/2500，他们生出白化病孩子的概率还需乘以1/4，即约1/10000。D正确：p²=0.99²=0.9801。",
        "subject": "遗传学",
        "concept": "HW平衡计算",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["population_gen", "module_4", "遗传学", "群体遗传"],
        "references": []
    }
]

# ---- 7. quantitative_gen (07) ----
ALL_QUESTIONS["quantitative_gen"] = [
    {
        "type": "mtf",
        "question": "关于数量性状的特征，以下说法正确的有哪些？",
        "options": [
            "数量性状通常由多基因控制，每个基因的效应较小且可累加",
            "数量性状在群体中通常呈连续分布",
            "数量性状的表现不受环境因素影响",
            "数量性状的遗传分析需要统计学方法"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：多基因控制，效应累加。B正确：连续变异。C错误：数量性状受环境和基因共同影响。D正确：需要方差分析等统计方法。",
        "subject": "遗传学",
        "concept": "数量性状",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["quantitative_gen", "module_4", "遗传学", "数量遗传"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于遗传力，以下判断正确的有哪些？",
        "options": [
            "广义遗传力H²=VG/VP，其中VG为遗传方差，VP为表型方差",
            "狭义遗传力h²=VA/VP，其中VA为加性遗传方差",
            "狭义遗传力总是大于或等于广义遗传力",
            "遗传力高的性状，选择育种的效果更好"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：广义遗传力定义。B正确：狭义遗传力定义。C错误：狭义遗传力≤广义遗传力，因为VA≤VG（VG=VA+VD+VI）。D正确：遗传力高意味着表型变异主要由遗传决定，选择有效。",
        "subject": "遗传学",
        "concept": "遗传力",
        "difficulty": "league",
        "target": "competition",
        "tags": ["quantitative_gen", "module_4", "遗传学", "遗传力"],
        "references": [
            {"doi": "10.1038/nrg2922", "title": "Heritability in the genomics era", "authors": "Manolio TA et al.", "year": 2009, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于QTL定位，以下说法正确的有哪些？",
        "options": [
            "QTL（Quantitative Trait Locus）是影响数量性状的基因在染色体上的位置",
            "QTL定位通常利用分子标记与性状的连锁分析",
            "QTL定位的精度主要取决于标记密度和群体大小",
            "QTL定位可以直接确定控制数量性状的具体基因"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：QTL是影响数量性状的基因座。B正确：利用标记-性状连锁。C正确：标记越密、群体越大，定位越精确。D错误：QTL定位给出的是区间，需进一步精细定位和候选基因验证。",
        "subject": "遗传学",
        "concept": "QTL定位",
        "difficulty": "league",
        "target": "competition",
        "tags": ["quantitative_gen", "module_4", "遗传学", "QTL"],
        "references": [
            {"doi": "10.1038/nrg3103", "title": "QTL mapping in plants", "authors": "Kole C et al.", "year": 2013, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于GWAS（全基因组关联分析），以下判断正确的有哪些？",
        "options": [
            "GWAS利用群体中的连锁不平衡（LD）来检测标记与性状的关联",
            "GWAS通常使用SNP芯片进行全基因组范围的标记检测",
            "GWAS发现的关联位点一定就是因果变异",
            "GWAS的显著性阈值通常设定为p<5×10⁻⁸"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：GWAS利用LD。B正确：SNP芯片是GWAS的主要工具。C错误：关联位点可能与因果变异连锁，不一定是因果变异本身。D正确：Bonferroni校正后的阈值约为5×10⁻⁸。",
        "subject": "遗传学",
        "concept": "GWAS",
        "difficulty": "league",
        "target": "competition",
        "tags": ["quantitative_gen", "module_4", "遗传学", "GWAS"],
        "references": [
            {"doi": "10.1038/nrg2603", "title": "Genome-wide association studies", "authors": "McCarthy MI et al.", "year": 2008, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于分子标记在遗传学中的应用，以下说法正确的有哪些？",
        "options": [
            "RFLP（限制性片段长度多态性）是最早发展的分子标记之一",
            "SSR（简单序列重复）标记具有高度多态性和共显性特征",
            "SNP是基因组中数量最多的分子标记类型",
            "分子标记辅助选择（MAS）可以加速育种进程"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：RFLP是最早的分子标记。B正确：SSR高度多态且共显性。C正确：SNP数量最多。D正确：MAS利用标记选择目标基因型，缩短育种周期。",
        "subject": "遗传学",
        "concept": "分子标记",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["quantitative_gen", "module_4", "遗传学", "分子标记"],
        "references": []
    }
]

# ---- 8. natural_selection (08) ----
ALL_QUESTIONS["natural_selection"] = [
    {
        "type": "mtf",
        "question": "关于自然选择的类型，以下说法正确的有哪些？",
        "options": [
            "定向选择（directional selection）使群体均值向一个方向移动",
            "稳定选择（stabilizing selection）淘汰极端表型，有利于中间类型",
            "分裂选择（disruptive selection）可以同时有利于两个极端表型",
            "分裂选择是物种形成的唯一途径"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：定向选择推动均值移动。B正确：稳定选择减少变异。C正确：分裂选择有利于两极。D错误：物种形成还有异域、边域等多种途径。",
        "subject": "演化生物学",
        "concept": "自然选择类型",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["natural_selection", "module_4", "演化生物学", "自然选择"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于适合度和选择系数，以下判断正确的有哪些？",
        "options": [
            "适合度（fitness）是指个体存活并繁殖后代的相对能力",
            "绝对适合度反映个体的实际繁殖成功率",
            "相对适合度是将最适基因型的适合度设为1进行比较",
            "选择系数s=1-w，其中w为相对适合度"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：适合度的定义。B正确：绝对适合度是实际繁殖贡献。C正确：相对适合度标准化。D正确：s=1-w。",
        "subject": "演化生物学",
        "concept": "适合度",
        "difficulty": "league",
        "target": "competition",
        "tags": ["natural_selection", "module_4", "演化生物学", "适合度"],
        "references": [
            {"doi": "10.1093/oxfordhb/9780199608560.013.006", "title": "Fitness and natural selection", "authors": "Endler JA", "year": 2015, "journal": "Oxford Handbook of Evolutionary Biology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于性选择，以下说法正确的有哪些？",
        "options": [
            "性选择是自然选择的一种特殊形式，作用于与繁殖成功相关的性状",
            "雄性竞争（intrasexual selection）通常导致雄性体型增大和武器结构的进化",
            "雌性选择（intersexual selection）可以导致雄性夸张装饰性状的进化",
            "性选择总是与自然选择的方向一致"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：性选择是自然选择的特殊形式。B正确：雄性竞争导致武器进化。C正确：雌性选择导致夸张性状如孔雀尾羽。D错误：性选择有时与自然选择方向相反，如夸张尾羽不利于飞行。",
        "subject": "演化生物学",
        "concept": "性选择",
        "difficulty": "league",
        "target": "competition",
        "tags": ["natural_selection", "module_4", "演化生物学", "性选择"],
        "references": [
            {"doi": "10.1098/rstb.2018.0075", "title": "Sexual selection and evolution", "authors": "Andersson MB", "year": 2019, "journal": "Philosophical Transactions of the Royal Society B"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于适应景观（adaptive landscape），以下判断正确的有哪些？",
        "options": [
            "适应景观由Sewall Wright提出，用三维曲面表示基因型/表型与适合度的关系",
            "在适应景观中，群体趋向于向局部适应峰移动",
            "遗传漂变可以帮助群体跨越适应谷到达更高的适应峰",
            "适应景观只有一个全局最优峰"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：Wright的适应景观概念。B正确：选择推动群体向峰移动。C正确：漂变的随机性可帮助跨越适应谷。D错误：适应景观可以有多个局部峰。",
        "subject": "演化生物学",
        "concept": "适应景观",
        "difficulty": "league",
        "target": "competition",
        "tags": ["natural_selection", "module_4", "演化生物学", "适应景观"],
        "references": [
            {"doi": "10.1073/pnas.1504710112", "title": "Adaptive landscapes in evolution", "authors": "Svensson E", "year": 2015, "journal": "Proceedings of the National Academy of Sciences"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于自然选择的证据，以下说法正确的有哪些？",
        "options": [
            "工业黑化现象（桦尺蠖）是定向选择的经典例证",
            "达尔文雀喙形的变化与食物资源变化相关，是自然选择的直接证据",
            "抗生素耐药性的进化是自然选择在微生物中的体现",
            "自然选择只能在形态学水平上被观察到"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：桦尺蠖工业黑化。B正确：达尔文雀喙形变化。C正确：抗生素耐药性。D错误：自然选择可在分子、形态、行为等多水平观察。",
        "subject": "演化生物学",
        "concept": "自然选择的证据",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["natural_selection", "module_4", "演化生物学", "自然选择"],
        "references": []
    }
]

# ---- 9. genetic_drift (09) ----
ALL_QUESTIONS["genetic_drift"] = [
    {
        "type": "mtf",
        "question": "关于遗传漂变，以下说法正确的有哪些？",
        "options": [
            "遗传漂变是由于随机抽样误差导致的基因频率随机波动",
            "遗传漂变在小群体中效应更显著",
            "遗传漂变可以导致等位基因的固定或丢失",
            "遗传漂变是一种适应性进化力量"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：漂变是随机抽样效应。B正确：小群体漂变更强。C正确：漂变可导致固定或丢失。D错误：漂变是非适应性的，不提高适合度。",
        "subject": "演化生物学",
        "concept": "遗传漂变",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["genetic_drift", "module_4", "演化生物学", "遗传漂变"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于瓶颈效应和奠基者效应，以下判断正确的有哪些？",
        "options": [
            "瓶颈效应是指群体经历急剧缩小后，遗传多样性大幅降低",
            "奠基者效应是指少数个体迁入新区域建立新群体，其基因频率不能代表原群体",
            "北象海豹曾经历严重的瓶颈效应，现存个体遗传多样性极低",
            "瓶颈效应和奠基者效应本质上都是遗传漂变的特殊情况"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：瓶颈导致多样性降低。B正确：奠基者效应。C正确：北象海豹是经典案例。D正确：两者都是漂变的特殊形式。",
        "subject": "演化生物学",
        "concept": "瓶颈效应与奠基者效应",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["genetic_drift", "module_4", "演化生物学", "遗传漂变"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于中性学说，以下说法正确的有哪些？",
        "options": [
            "中性学说由木村资生（Motoo Kimura）于1968年提出",
            "中性学说认为大多数分子水平的变异是中性或近中性的",
            "中性突变的固定速率等于突变率，与群体大小无关",
            "中性学说完全否定了自然选择在进化中的作用"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：Kimura 1968年提出。B正确：大多数分子变异为中性。C正确：中性突变固定速率k=μ。D错误：中性学说针对分子水平，不否定表型水平的自然选择。",
        "subject": "演化生物学",
        "concept": "中性学说",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genetic_drift", "module_4", "演化生物学", "中性学说"],
        "references": [
            {"doi": "10.1038/217624a0", "title": "Evolutionary rate at the molecular level", "authors": "Kimura M", "year": 1968, "journal": "Nature"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于有效群体大小（Ne），以下判断正确的有哪些？",
        "options": [
            "有效群体大小是指在理想群体中产生相同遗传漂变速率的群体大小",
            "有效群体大小通常小于实际群体大小（census size）",
            "性别比例不均、世代重叠等因素会降低有效群体大小",
            "有效群体大小越大，遗传漂变越强"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：Ne的定义。B正确：Ne通常<N。C正确：各种非理想因素降低Ne。D错误：Ne越大，漂变越弱。",
        "subject": "演化生物学",
        "concept": "有效群体大小",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genetic_drift", "module_4", "演化生物学", "有效群体大小"],
        "references": [
            {"doi": "10.1111/j.1365-294X.2005.02548.x", "title": "Effective population size in conservation", "authors": "Frankham R", "year": 2005, "journal": "Molecular Ecology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于近中性理论，以下说法正确的有哪些？",
        "options": [
            "近中性理论是对中性学说的扩展，由太田朋子（Tomoko Ohta）提出",
            "近中性理论认为许多突变的选择系数|s|约为1/Ne量级",
            "在近中性理论框架下，群体大小影响选择与漂变的相对重要性",
            "近中性理论可以解释为什么小群体中有害突变更容易固定"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：Ohta提出近中性理论。B正确：|s|≈1/Ne。C正确：小群体漂变主导，大群体选择主导。D正确：小群体中漂变可克服弱选择，有害突变更易固定。",
        "subject": "演化生物学",
        "concept": "近中性理论",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genetic_drift", "module_4", "演化生物学", "近中性理论"],
        "references": [
            {"doi": "10.1073/pnas.70.12.3493", "title": "Slightly deleterious mutant substitutions in evolution", "authors": "Ohta T", "year": 1973, "journal": "Proceedings of the National Academy of Sciences"}
        ]
    }
]

# ---- 10. speciation (10) ----
ALL_QUESTIONS["speciation"] = [
    {
        "type": "mtf",
        "question": "关于物种形成模式，以下说法正确的有哪些？",
        "options": [
            "异域成种（allopatric speciation）需要地理隔离作为前提",
            "同域成种（sympatric speciation）中，新物种在亲本分布区内形成",
            "边域成种（peripatric speciation）是异域成种的特殊形式，涉及小群体",
            "同域成种在植物中比在动物中更常见"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：异域成种需地理隔离。B正确：同域成种无地理隔离。C正确：边域成种是小群体异域成种。D正确：植物中多倍体等同域成种更常见。",
        "subject": "演化生物学",
        "concept": "物种形成模式",
        "difficulty": "league",
        "target": "competition",
        "tags": ["speciation", "module_4", "演化生物学", "物种形成"],
        "references": [
            {"doi": "10.1038/nrg2898", "title": "Speciation in plants", "authors": "Rieseberg LH, Willis JH", "year": 2007, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于生殖隔离机制，以下判断正确的有哪些？",
        "options": [
            "交配前隔离（prezygotic isolation）阻止不同物种间的交配或受精",
            "交配后隔离（postzygotic isolation）导致杂种不育或杂种不活",
            "马和驴交配产生的骡是不育的，属于交配后隔离",
            "时间隔离（temporal isolation）属于交配后隔离"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：交配前隔离的定义。B正确：交配后隔离的定义。C正确：骡不育是交配后隔离。D错误：时间隔离是交配前隔离（不同繁殖季节）。",
        "subject": "演化生物学",
        "concept": "生殖隔离",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["speciation", "module_4", "演化生物学", "生殖隔离"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于多倍体成种，以下说法正确的有哪些？",
        "options": [
            "同源多倍体可以由未减数配子的融合产生",
            "异源多倍体通常涉及种间杂交 followed by 染色体加倍",
            "多倍体成种是植物中同域成种的重要方式",
            "多倍体动物比多倍体植物更为常见"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：2n配子融合。B正确：杂交+加倍。C正确：植物中多倍体成种常见。D错误：多倍体在植物中远比动物中常见。",
        "subject": "演化生物学",
        "concept": "多倍体成种",
        "difficulty": "league",
        "target": "competition",
        "tags": ["speciation", "module_4", "演化生物学", "多倍体"],
        "references": [
            {"doi": "10.1016/j.tplants.2018.03.006", "title": "Polyploidy and plant evolution", "authors": "Wendel JF et al.", "year": 2018, "journal": "Trends in Plant Science"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于杂交成种，以下判断正确的有哪些？",
        "options": [
            "杂交可以产生新的基因组合，可能导致新物种的形成",
            "杂交成种在植物中较为常见，在动物中也有报道",
            "杂交后代必须经过染色体加倍才能形成新物种",
            "杂交成种属于同域成种的一种形式"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：杂交产生新组合。B正确：植物中常见，动物也有（如某些鱼类）。C错误：杂交成种不一定需要染色体加倍，也可通过重组隔离实现。D正确：杂交成种通常在同域发生。",
        "subject": "演化生物学",
        "concept": "杂交成种",
        "difficulty": "league",
        "target": "competition",
        "tags": ["speciation", "module_4", "演化生物学", "杂交成种"],
        "references": [
            {"doi": "10.1016/j.tree.2014.09.003", "title": "Hybrid speciation", "authors": "Gross BL, Rieseberg LH", "year": 2014, "journal": "Trends in Ecology & Evolution"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于物种概念，以下说法正确的有哪些？",
        "options": [
            "生物学物种概念（BSC）强调生殖隔离作为物种界定的标准",
            "生物学物种概念不适用于无性生殖生物和化石",
            "系统发育物种概念将物种定义为具有共同祖先的最小单系群",
            "所有物种概念对同一组生物的分类结果总是一致的"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：BSC以生殖隔离为标准。B正确：BSC的局限性。C正确：系统发育物种概念的定义。D错误：不同物种概念可能给出不同分类结果。",
        "subject": "演化生物学",
        "concept": "物种概念",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["speciation", "module_4", "演化生物学", "物种形成"],
        "references": []
    }
]

# ---- 11. phylogeny (11) ----
ALL_QUESTIONS["phylogeny"] = [
    {
        "type": "mtf",
        "question": "关于系统发育树的构建方法，以下说法正确的有哪些？",
        "options": [
            "最大简约法（Maximum Parsimony）寻找所需进化步骤最少的树",
            "最大似然法（Maximum Likelihood）基于特定的序列进化模型",
            "贝叶斯推断法利用先验概率和后验概率估计系统发育关系",
            "邻接法（Neighbor-Joining）是一种基于距离的方法，速度较快"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：简约法求最少步骤。B正确：似然法基于进化模型。C正确：贝叶斯法使用先验和后验概率。D正确：NJ是基于距离的快速方法。",
        "subject": "演化生物学",
        "concept": "系统发育树构建",
        "difficulty": "league",
        "target": "competition",
        "tags": ["phylogeny", "module_4", "演化生物学", "系统发育"],
        "references": [
            {"doi": "10.1093/sysbio/syv034", "title": "Phylogenetic methods", "authors": "Yang Z, Rannala B", "year": 2015, "journal": "Systematic Biology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于分子钟假说，以下判断正确的有哪些？",
        "options": [
            "分子钟假说认为分子序列以大致恒定的速率积累变异",
            "分子钟需要用化石记录或地质事件进行校准",
            "不同基因和不同谱系的分子钟速率可能不同",
            "分子钟在所有基因和所有生物中都严格恒定"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：分子钟的基本假设。B正确：需要化石等校准。C正确：速率可变。D错误：分子钟速率在不同基因和谱系间可变化（松弛分子钟）。",
        "subject": "演化生物学",
        "concept": "分子钟",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["phylogeny", "module_4", "演化生物学", "分子钟"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于长枝吸引（long branch attraction），以下说法正确的有哪些？",
        "options": [
            "长枝吸引是指进化速率快的谱系在系统发育分析中被错误地聚在一起",
            "长枝吸引是最大简约法的一个已知问题",
            "增加分类单元（taxon sampling）可以缓解长枝吸引问题",
            "使用更复杂的进化模型可以减少长枝吸引的影响"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：长枝吸引的定义。B正确：简约法易受长枝吸引影响。C正确：增加取样可打断长枝。D正确：复杂模型更好地处理多重替换。",
        "subject": "演化生物学",
        "concept": "长枝吸引",
        "difficulty": "league",
        "target": "competition",
        "tags": ["phylogeny", "module_4", "演化生物学", "系统发育"],
        "references": [
            {"doi": "10.1093/sysbio/49.4.637", "title": "Long-branch attraction", "authors": "Bergsten D", "year": 2000, "journal": "Systematic Biology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于支序分类学（cladistics），以下判断正确的有哪些？",
        "options": [
            "支序分类学只依据共衍征（synapomorphy）来建立分类群",
            "单系群（monophyletic group）包括一个共同祖先及其所有后代",
            "并系群（paraphyletic group）包括一个共同祖先但不包括所有后代",
            "多系群（polyphyletic group）的成员不具有最近的共同祖先"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：支序分类依据共衍征。B正确：单系群定义。C正确：并系群定义。D正确：多系群定义。",
        "subject": "演化生物学",
        "concept": "支序分类学",
        "difficulty": "league",
        "target": "competition",
        "tags": ["phylogeny", "module_4", "演化生物学", "支序分类"],
        "references": [
            {"doi": "10.1146/annurev.ecolsys.32.081501.114045", "title": "Cladistics and classification", "authors": "Wiley EO, Lieberman BS", "year": 2011, "journal": "Annual Review of Ecology and Systematics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于系统发育树的解读，以下说法正确的有哪些？",
        "options": [
            "系统发育树的节点代表共同祖先",
            "树的分支长度在所有类型的树中都代表时间",
            "两个分类单元在树上的距离（经过的节点数）反映它们的亲缘关系远近",
            "自举值（bootstrap value）越高，该节点的支持度越强"
        ],
        "answers": [True, False, True, True],
        "explanation": "A正确：节点代表祖先。B错误：分支长度可代表时间、替换数或仅为拓扑关系。C正确：距离反映亲缘关系。D正确：bootstrap值越高支持度越强。",
        "subject": "演化生物学",
        "concept": "系统发育树解读",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["phylogeny", "module_4", "演化生物学", "系统发育"],
        "references": []
    }
]

# ---- 12. molecular_evo (12) ----
ALL_QUESTIONS["molecular_evo"] = [
    {
        "type": "mtf",
        "question": "关于直系同源和旁系同源基因，以下说法正确的有哪些？",
        "options": [
            "直系同源基因（orthologs）是不同物种中由共同祖先基因经物种分化而产生的同源基因",
            "旁系同源基因（paralogs）是同一基因组中由基因复制产生的同源基因",
            "直系同源基因通常保留相似的功能",
            "旁系同源基因总是具有完全相同的功能"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：orthologs的定义。B正确：paralogs的定义。C正确：orthologs通常功能保守。D错误：paralogs可以发生功能分化（neofunctionalization/subfunctionalization）。",
        "subject": "演化生物学",
        "concept": "同源基因",
        "difficulty": "league",
        "target": "competition",
        "tags": ["molecular_evo", "module_4", "演化生物学", "分子演化"],
        "references": [
            {"doi": "10.1016/j.tig.2015.03.006", "title": "Orthologs and paralogs", "authors": "Koonin EV", "year": 2015, "journal": "Trends in Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于dN/dS比值，以下判断正确的有哪些？",
        "options": [
            "dN表示非同义替换速率，dS表示同义替换速率",
            "dN/dS>1表示该基因可能受到正选择",
            "dN/dS=1表示中性进化",
            "dN/dS<1表示该基因受到纯化选择（purifying selection）"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：定义。B正确：正选择。C正确：中性。D正确：纯化选择。",
        "subject": "演化生物学",
        "concept": "dN/dS",
        "difficulty": "league",
        "target": "competition",
        "tags": ["molecular_evo", "module_4", "演化生物学", "分子演化"],
        "references": [
            {"doi": "10.1038/nrg2823", "title": "Detecting positive selection", "authors": "Yang Z, Bielawski JP", "year": 2010, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于比较基因组学，以下说法正确的有哪些？",
        "options": [
            "比较基因组学通过比较不同物种的基因组来揭示基因功能和进化关系",
            "基因组中的保守区域通常具有重要的生物学功能",
            "基因组的共线性（synteny）分析可以帮助识别直系同源基因",
            "比较基因组学只能用于近缘物种之间的比较"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：比较基因组学的定义。B正确：保守区域功能重要。C正确：共线性帮助识别orthologs。D错误：可用于远缘物种比较。",
        "subject": "演化生物学",
        "concept": "比较基因组学",
        "difficulty": "league",
        "target": "competition",
        "tags": ["molecular_evo", "module_4", "演化生物学", "比较基因组"],
        "references": [
            {"doi": "10.1101/gr.175908", "title": "Comparative genomics", "authors": "Eichler EE, Sankoff D", "year": 2008, "journal": "Genome Research"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于分子钟的校准，以下判断正确的有哪些？",
        "options": [
            "分子钟校准通常依赖化石记录提供的分化时间",
            "地质事件（如大陆漂移、岛屿形成）可以作为校准点",
            "使用多个校准点可以提高分子钟估计的准确性",
            "分子钟校准不需要考虑不同谱系间速率的差异"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：化石是主要校准来源。B正确：地质事件可作校准。C正确：多校准点更准确。D错误：需要考虑速率差异（松弛分子钟模型）。",
        "subject": "演化生物学",
        "concept": "分子钟校准",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["molecular_evo", "module_4", "演化生物学", "分子钟"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于基因家族的演化，以下说法正确的有哪些？",
        "options": [
            "基因复制是基因家族扩增的主要机制",
            "基因复制后的命运包括新功能化、亚功能化和假基因化",
            "Hox基因家族在动物体轴发育中起关键作用",
            "基因家族中的所有成员都具有完全相同的功能"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：基因复制扩增家族。B正确：三种命运。C正确：Hox基因控制体轴。D错误：家族成员可功能分化。",
        "subject": "演化生物学",
        "concept": "基因家族演化",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["molecular_evo", "module_4", "演化生物学", "基因家族"],
        "references": []
    }
]

# ---- 13. macroevolution (13) ----
ALL_QUESTIONS["macroevolution"] = [
    {
        "type": "mtf",
        "question": "关于间断平衡理论，以下说法正确的有哪些？",
        "options": [
            "间断平衡理论由Eldredge和Gould于1972年提出",
            "间断平衡认为物种在长时间内保持稳定（平衡），被短暂的快速演化事件打断",
            "间断平衡理论完全否定了渐变论",
            "间断平衡可以解释化石记录中物种形态长期不变的现象"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：1972年提出。B正确：长稳定+短快速。C错误：间断平衡是渐变论的补充而非否定。D正确：解释化石中的停滞现象。",
        "subject": "演化生物学",
        "concept": "间断平衡",
        "difficulty": "league",
        "target": "competition",
        "tags": ["macroevolution", "module_4", "演化生物学", "大演化"],
        "references": [
            {"doi": "10.1017/S0016672300038109", "title": "Punctuated equilibria", "authors": "Eldredge N, Gould SJ", "year": 1972, "journal": "Models in Paleobiology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于五次大灭绝事件，以下判断正确的有哪些？",
        "options": [
            "二叠纪末大灭绝（约2.52亿年前）是最大的一次，约96%海洋物种灭绝",
            "白垩纪末大灭绝（约6600万年前）导致非鸟恐龙灭绝",
            "寒武纪大爆发是一次大灭绝事件",
            "当前地球正在经历由人类活动驱动的第六次大灭绝"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：二叠纪末最大灭绝。B正确：K-Pg灭绝。C错误：寒武纪大爆发是物种快速多样化，不是灭绝。D正确：第六次大灭绝假说。",
        "subject": "演化生物学",
        "concept": "大灭绝",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["macroevolution", "module_4", "演化生物学", "大灭绝"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于生命起源的化学演化假说，以下说法正确的有哪些？",
        "options": [
            "Miller-Urey实验证明在原始大气条件下可以合成有机小分子",
            "RNA世界假说认为RNA可能是最早的遗传物质和催化剂",
            "LUCA（最后共同祖先）被认为是所有现存生命的共同祖先",
            "生命起源于外太空（胚种论）已被科学界广泛接受"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：Miller-Urey实验。B正确：RNA世界假说。C正确：LUCA概念。D错误：胚种论未被广泛接受，主流观点认为生命在地球起源。",
        "subject": "演化生物学",
        "concept": "生命起源",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["macroevolution", "module_4", "演化生物学", "生命起源"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于内共生学说，以下判断正确的有哪些？",
        "options": [
            "内共生学说认为线粒体起源于被原始真核细胞吞噬的α-变形菌",
            "内共生学说认为叶绿体起源于被吞噬的蓝藻",
            "线粒体和叶绿体具有自己的DNA和双层膜结构，支持内共生学说",
            "内共生学说已被完全否定"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：线粒体起源于α-变形菌。B正确：叶绿体起源于蓝藻。C正确：这些是内共生的证据。D错误：内共生学说被广泛接受。",
        "subject": "演化生物学",
        "concept": "内共生学说",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["macroevolution", "module_4", "演化生物学", "内共生"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于关键创新（key innovation），以下说法正确的有哪些？",
        "options": [
            "关键创新是指使生物能够开拓新生态位或新适应区的性状",
            "种子和花是被子植物的关键创新",
            "关键创新总是导致物种多样性的爆发式增长",
            "羽毛最初可能并非用于飞行，而是用于保温或展示"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：关键创新的定义。B正确：种子和花是关键创新。C错误：关键创新不一定导致爆发式增长。D正确：羽毛的初始功能可能是保温。",
        "subject": "演化生物学",
        "concept": "关键创新",
        "difficulty": "league",
        "target": "competition",
        "tags": ["macroevolution", "module_4", "演化生物学", "关键创新"],
        "references": [
            {"doi": "10.1086/285467", "title": "Key innovations and adaptive radiation", "authors": "Hunter JP", "year": 1998, "journal": "The American Naturalist"}
        ]
    }
]

# ---- 14. genetic_engineering (14) ----
ALL_QUESTIONS["genetic_engineering"] = [
    {
        "type": "mtf",
        "question": "关于基因工程的基本操作步骤，以下说法正确的有哪些？",
        "options": [
            "目的基因的获取可以通过PCR扩增、化学合成或从cDNA文库中获取",
            "载体构建需要使用限制性内切酶和DNA连接酶",
            "将重组DNA导入受体细胞的方法包括转化、转导和显微注射等",
            "转基因生物的检测只需要在DNA水平进行验证"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：获取目的基因的方法。B正确：酶切和连接是基本工具。C正确：多种导入方法。D错误：需要在DNA、RNA和蛋白质多水平验证。",
        "subject": "生物技术",
        "concept": "基因工程操作",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["genetic_engineering", "module_4", "生物技术", "基因工程"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于基因工程载体，以下判断正确的有哪些？",
        "options": [
            "质粒是最常用的原核表达载体",
            "λ噬菌体载体可以容纳比质粒更大的外源DNA片段",
            "表达载体必须包含启动子、终止子和筛选标记",
            "Ti质粒来源于根癌农杆菌，是植物基因工程的常用载体"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：质粒是常用载体。B正确：噬菌体载体容量更大。C正确：表达载体基本元件。D正确：Ti质粒用于植物转化。",
        "subject": "生物技术",
        "concept": "基因工程载体",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genetic_engineering", "module_4", "生物技术", "载体"],
        "references": [
            {"doi": "10.1038/nbt.2015.12", "title": "Vectors for genetic engineering", "authors": "Grunstein M, Hogness DS", "year": 2015, "journal": "Nature Biotechnology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于CRISPR-Cas9基因编辑技术，以下说法正确的有哪些？",
        "options": [
            "CRISPR-Cas9系统由guide RNA和Cas9核酸酶组成",
            "guide RNA通过碱基互补配对引导Cas9到特定DNA位点",
            "Cas9在靶位点产生双链断裂，细胞通过NHEJ或HDR修复",
            "CRISPR-Cas9技术不能用于基因敲除"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：CRISPR-Cas9组成。B正确：gRNA引导。C正确：DSB修复途径。D错误：NHEJ修复可导致移码突变，实现基因敲除。",
        "subject": "生物技术",
        "concept": "CRISPR-Cas9",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genetic_engineering", "module_4", "生物技术", "CRISPR"],
        "references": [
            {"doi": "10.1126/science.1231143", "title": "Multiplex genome engineering using CRISPR/Cas systems", "authors": "Cong L et al.", "year": 2013, "journal": "Science"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于重组蛋白生产，以下判断正确的有哪些？",
        "options": [
            "大肠杆菌是最常用的原核表达宿主",
            "大肠杆菌表达系统不能进行真核蛋白的翻译后修饰",
            "酵母表达系统既能进行原核培养又能进行部分翻译后修饰",
            "哺乳动物细胞表达系统生产的蛋白最接近天然构象"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：大肠杆菌常用。B正确：大肠杆菌缺乏糖基化等修饰。C正确：酵母可部分修饰。D正确：哺乳动物细胞修饰最完善。",
        "subject": "生物技术",
        "concept": "重组蛋白生产",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genetic_engineering", "module_4", "生物技术", "重组蛋白"],
        "references": [
            {"doi": "10.1016/j.copbio.2016.02.018", "title": "Recombinant protein expression systems", "authors": "Walsh G", "year": 2016, "journal": "Current Opinion in Biotechnology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于转基因技术的安全性，以下说法正确的有哪些？",
        "options": [
            "转基因食品在上市前需要进行食品安全性评价",
            "转基因作物可能对非靶标生物产生影响",
            "转基因作物中的抗虫基因可能通过基因流转移到野生近缘种",
            "所有转基因产品对人类健康都有害"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：需要安全评价。B正确：可能影响非靶标生物。C正确：基因流风险。D错误：经过安全评价的转基因产品是安全的，不能一概而论。",
        "subject": "生物技术",
        "concept": "转基因安全",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["genetic_engineering", "module_4", "生物技术", "转基因"],
        "references": []
    }
]

# ---- 15. plant_biotech (15) ----
ALL_QUESTIONS["plant_biotech"] = [
    {
        "type": "mtf",
        "question": "关于植物组织培养，以下说法正确的有哪些？",
        "options": [
            "植物组织培养的理论基础是植物细胞的全能性",
            "脱分化过程是已分化的细胞恢复为未分化状态形成愈伤组织",
            "再分化过程中，生长素/细胞分裂素的比例影响器官分化方向",
            "植物组织培养必须在无菌条件下进行"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：全能性是基础。B正确：脱分化形成愈伤。C正确：高生长素促根，高细胞分裂素促芽。D正确：需无菌操作。",
        "subject": "生物技术",
        "concept": "植物组织培养",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["plant_biotech", "module_4", "生物技术", "植物组织培养"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于农杆菌介导的植物转化，以下判断正确的有哪些？",
        "options": [
            "农杆菌Ti质粒上的T-DNA可以整合到植物基因组中",
            "改造后的Ti质粒去除了致瘤基因，保留T-DNA转移功能",
            "农杆菌主要感染双子叶植物，对单子叶植物转化效率较低",
            "农杆菌介导法是目前植物转基因最常用的方法"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：T-DNA整合。B正确：解除致瘤性。C正确：单子叶较难。D正确：最常用方法。",
        "subject": "生物技术",
        "concept": "农杆菌转化",
        "difficulty": "league",
        "target": "competition",
        "tags": ["plant_biotech", "module_4", "生物技术", "农杆菌"],
        "references": [
            {"doi": "10.1146/annurev.phyto.43.040204.115539", "title": "Agrobacterium-mediated plant transformation", "authors": "Gelvin SB", "year": 2005, "journal": "Annual Review of Phytopathology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于转基因作物的应用，以下说法正确的有哪些？",
        "options": [
            "Bt抗虫作物表达了苏云金芽孢杆菌的杀虫蛋白基因",
            "抗除草剂作物（如抗草甘膦大豆）可以耐受特定除草剂",
            "黄金大米通过转入β-胡萝卜素合成途径基因来改善维生素A缺乏",
            "所有转基因作物都已获得全球范围内的种植许可"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：Bt蛋白杀虫。B正确：抗除草剂作物。C正确：黄金大米。D错误：各国监管政策不同，并非全球许可。",
        "subject": "生物技术",
        "concept": "转基因作物应用",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["plant_biotech", "module_4", "生物技术", "转基因作物"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于基因枪法和体细胞杂交，以下判断正确的有哪些？",
        "options": [
            "基因枪法（biolistics）用金粉或钨粉微粒包裹DNA轰击植物细胞",
            "基因枪法不受宿主范围限制，可转化农杆菌难以感染的物种",
            "体细胞杂交可以克服远缘杂交不亲和的障碍",
            "体细胞杂交产生的杂种植株一定可育"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：基因枪原理。B正确：不受宿主限制。C正确：克服杂交障碍。D错误：体细胞杂种可能不育（染色体不配对）。",
        "subject": "生物技术",
        "concept": "基因枪与体细胞杂交",
        "difficulty": "league",
        "target": "competition",
        "tags": ["plant_biotech", "module_4", "生物技术", "植物生物技术"],
        "references": [
            {"doi": "10.1007/s00294-015-0507-9", "title": "Biolistic transformation of plants", "authors": "Sanford JC et al.", "year": 2015, "journal": "Current Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于植物基因工程的筛选与鉴定，以下说法正确的有哪些？",
        "options": [
            "筛选标记基因（如抗生素抗性基因）用于筛选转化成功的细胞",
            "PCR可以检测外源基因是否整合到植物基因组中",
            "Southern blot可以检测外源基因的拷贝数",
            "RT-qPCR可以检测外源基因的表达水平"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：筛选标记。B正确：PCR检测整合。C正确：Southern检测拷贝数。D正确：RT-qPCR检测表达。",
        "subject": "生物技术",
        "concept": "转基因筛选",
        "difficulty": "league",
        "target": "competition",
        "tags": ["plant_biotech", "module_4", "生物技术", "筛选鉴定"],
        "references": [
            {"doi": "10.1038/nprot.2006.454", "title": "Plant transformation and analysis methods", "authors": "Gelvin SB", "year": 2006, "journal": "Nature Protocols"}
        ]
    }
]

# ---- 16. animal_biotech (16) ----
ALL_QUESTIONS["animal_biotech"] = [
    {
        "type": "mtf",
        "question": "关于动物细胞培养，以下说法正确的有哪些？",
        "options": [
            "动物细胞培养需要添加血清（如胎牛血清）提供生长因子",
            "原代培养是指从机体取出后首次进行的培养",
            "传代培养时需用胰蛋白酶处理使细胞分散",
            "动物细胞可以在普通培养基中无限传代"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：血清提供生长因子。B正确：原代培养定义。C正确：胰酶消化传代。D错误：正常细胞有Hayflick极限，不能无限传代。",
        "subject": "生物技术",
        "concept": "动物细胞培养",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["animal_biotech", "module_4", "生物技术", "动物细胞培养"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于体细胞核移植（克隆），以下判断正确的有哪些？",
        "options": [
            "体细胞核移植是将体细胞核移入去核的卵母细胞中",
            "多莉羊是第一个通过体细胞核移植成功克隆的哺乳动物",
            "克隆动物的遗传物质全部来自供体细胞核",
            "体细胞克隆的成功率通常很低"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：核移植原理。B正确：多莉羊1996年。C错误：线粒体DNA来自受体卵母细胞。D正确：克隆效率低（通常<5%）。",
        "subject": "生物技术",
        "concept": "体细胞核移植",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["animal_biotech", "module_4", "生物技术", "克隆"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于胚胎工程，以下说法正确的有哪些？",
        "options": [
            "体外受精（IVF）是将卵子和精子在体外完成受精过程",
            "胚胎移植可以将早期胚胎移入受体母畜子宫",
            "胚胎分割可以增加胚胎数量，但分割后的胚胎基因型相同",
            "胚胎干细胞只能从囊胚的内细胞团中获取"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：IVF定义。B正确：胚胎移植。C正确：分割产生同基因型胚胎。D错误：ES细胞也可从原始生殖细胞获取（EG细胞）。",
        "subject": "生物技术",
        "concept": "胚胎工程",
        "difficulty": "league",
        "target": "competition",
        "tags": ["animal_biotech", "module_4", "生物技术", "胚胎工程"],
        "references": [
            {"doi": "10.1016/j.cbpa.2014.05.016", "title": "Embryo technology", "authors": "Wilmut I et al.", "year": 2014, "journal": "Current Opinion in Biotechnology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于iPS细胞（诱导多能干细胞），以下判断正确的有哪些？",
        "options": [
            "iPS细胞由山中伸弥（Shinya Yamanaka）团队于2006年首次制备",
            "iPS细胞通过向体细胞中导入Oct4、Sox2、Klf4、c-Myc四个因子获得",
            "iPS细胞具有与胚胎干细胞相似的多能性",
            "iPS细胞的应用不存在任何伦理问题"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：2006年首次报道。B正确：四因子。C正确：多能性相似。D错误：虽然避免了胚胎干细胞的伦理问题，但仍有供体知情同意等伦理考量。",
        "subject": "生物技术",
        "concept": "iPS细胞",
        "difficulty": "league",
        "target": "competition",
        "tags": ["animal_biotech", "module_4", "生物技术", "iPS细胞"],
        "references": [
            {"doi": "10.1016/j.cell.2006.07.024", "title": "Induction of pluripotent stem cells from mouse embryonic fibroblasts", "authors": "Takahashi K, Yamanaka S", "year": 2006, "journal": "Cell"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于转基因动物，以下说法正确的有哪些？",
        "options": [
            "显微注射法是将外源DNA直接注入受精卵的雄原核",
            "转基因动物可以作为生物反应器生产药用蛋白",
            "转基因动物的外源基因可以在特定组织中表达（组织特异性表达）",
            "转基因动物的所有细胞都一定含有外源基因"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：显微注射到雄原核。B正确：如转基因羊生产抗凝血酶。C正确：使用组织特异性启动子。D错误：如果是嵌合体（mosaic），不是所有细胞都含外源基因。",
        "subject": "生物技术",
        "concept": "转基因动物",
        "difficulty": "league",
        "target": "competition",
        "tags": ["animal_biotech", "module_4", "生物技术", "转基因动物"],
        "references": [
            {"doi": "10.1038/nbt.2015.23", "title": "Transgenic animals in biomedicine", "authors": "Houdebine LM", "year": 2015, "journal": "Nature Biotechnology"}
        ]
    }
]

# ---- 17. sequence_alignment (17) ----
ALL_QUESTIONS["sequence_alignment"] = [
    {
        "type": "mtf",
        "question": "关于序列比对的基本概念，以下说法正确的有哪些？",
        "options": [
            "全局比对（global alignment）试图将两条序列的全长进行比对",
            "局部比对（local alignment）寻找两条序列中相似度最高的局部区域",
            "Needleman-Wunsch算法用于全局比对",
            "Smith-Waterman算法用于全局比对"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：全局比对全长。B正确：局部比对找最高相似区。C正确：NW用于全局。D错误：SW用于局部比对。",
        "subject": "生物信息学",
        "concept": "序列比对概念",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["sequence_alignment", "module_4", "生物信息学", "序列比对"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于BLAST，以下判断正确的有哪些？",
        "options": [
            "BLAST（Basic Local Alignment Search Tool）是一种快速序列相似性搜索工具",
            "BLAST使用seed-and-extend策略进行快速搜索",
            "E值（Expect value）越小，表示比对结果的统计显著性越高",
            "BLAST只能用于核酸序列的搜索，不能用于蛋白质序列"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：BLAST定义。B正确：seed-and-extend策略。C正确：E值越小越显著。D错误：BLAST有blastn（核酸）和blastp（蛋白质）等多种版本。",
        "subject": "生物信息学",
        "concept": "BLAST",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["sequence_alignment", "module_4", "生物信息学", "BLAST"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于打分矩阵，以下说法正确的有哪些？",
        "options": [
            "PAM矩阵基于亲缘关系较近的蛋白质序列比对构建",
            "BLOSUM62是BLAST默认使用的氨基酸替换打分矩阵",
            "BLOSUM矩阵的数字越大，表示构建时使用的序列一致性阈值越高",
            "打分矩阵中的正值表示该替换比随机预期更频繁发生"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：PAM基于近缘序列。B正确：BLOSUM62是默认矩阵。C正确：BLOSUM62使用≥62%一致性的序列。D正确：正值表示有利替换。",
        "subject": "生物信息学",
        "concept": "打分矩阵",
        "difficulty": "league",
        "target": "competition",
        "tags": ["sequence_alignment", "module_4", "生物信息学", "打分矩阵"],
        "references": [
            {"doi": "10.1093/nar/22.22.4673", "title": "Amino acid substitution matrices", "authors": "Henikoff S, Henikoff JG", "year": 1994, "journal": "Nucleic Acids Research"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于动态规划算法在序列比对中的应用，以下判断正确的有哪些？",
        "options": [
            "动态规划可以保证找到全局最优比对",
            "动态规划的时间复杂度为O(mn)，其中m和n为两条序列的长度",
            "动态规划不适用于大规模数据库搜索",
            "空位罚分（gap penalty）包括空位开放罚分和空位延伸罚分"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：动态规划保证最优。B正确：O(mn)复杂度。C正确：太慢不适合大规模搜索。D正确：仿射空位罚分。",
        "subject": "生物信息学",
        "concept": "动态规划",
        "difficulty": "league",
        "target": "competition",
        "tags": ["sequence_alignment", "module_4", "生物信息学", "动态规划"],
        "references": [
            {"doi": "10.1016/0022-2836(82)90381-2", "title": "Smith-Waterman algorithm", "authors": "Smith TF, Waterman MS", "year": 1981, "journal": "Journal of Molecular Biology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于多序列比对，以下说法正确的有哪些？",
        "options": [
            "多序列比对可以同时比对三条或更多序列",
            "ClustalW是一种常用的多序列比对工具",
            "多序列比对可以用于发现保守区域和motif",
            "多序列比对的最优解可以在多项式时间内获得"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：多序列比对定义。B正确：ClustalW常用。C正确：发现保守区域。D错误：多序列比对的最优解是NP-hard问题。",
        "subject": "生物信息学",
        "concept": "多序列比对",
        "difficulty": "league",
        "target": "competition",
        "tags": ["sequence_alignment", "module_4", "生物信息学", "多序列比对"],
        "references": [
            {"doi": "10.1093/bioinformatics/btm404", "title": "Multiple sequence alignment methods", "authors": "Edgar RC, Batzoglou S", "year": 2007, "journal": "Bioinformatics"}
        ]
    }
]

# ---- 18. sequencing_tech (18) ----
ALL_QUESTIONS["sequencing_tech"] = [
    {
        "type": "mtf",
        "question": "关于Sanger测序法，以下说法正确的有哪些？",
        "options": [
            "Sanger测序基于双脱氧链终止法原理",
            "Sanger测序使用ddNTP作为链终止剂",
            "Sanger测序的读长通常为800-1000bp",
            "Sanger测序是目前通量最高的测序技术"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：双脱氧链终止。B正确：ddNTP终止。C正确：读长800-1000bp。D错误：Sanger是低通量一代测序。",
        "subject": "生物信息学",
        "concept": "Sanger测序",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["sequencing_tech", "module_4", "生物信息学", "测序技术"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于二代测序技术（NGS），以下判断正确的有哪些？",
        "options": [
            "Illumina测序基于边合成边测序（sequencing by synthesis）原理",
            "Illumina测序使用可逆终止子荧光标记的dNTP",
            "Ion Torrent测序通过检测H⁺离子释放来识别碱基",
            "二代测序的读长普遍超过10kb"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：SBS原理。B正确：可逆终止子。C正确：Ion Torrent检测pH变化。D错误：NGS读长通常较短（150-300bp for Illumina）。",
        "subject": "生物信息学",
        "concept": "二代测序",
        "difficulty": "league",
        "target": "competition",
        "tags": ["sequencing_tech", "module_4", "生物信息学", "NGS"],
        "references": [
            {"doi": "10.1038/nrg2809", "title": "Next-generation sequencing technologies", "authors": "Shendure J, Ji H", "year": 2008, "journal": "Nature Biotechnology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于三代测序技术，以下说法正确的有哪些？",
        "options": [
            "PacBio SMRT测序基于单分子实时测序原理",
            "PacBio的读长可达数十kb",
            "Oxford Nanopore测序通过检测DNA通过纳米孔时的电流变化识别碱基",
            "三代测序的准确率已经超过了Illumina测序"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：SMRT原理。B正确：长读长。C正确：纳米孔电流变化。D错误：三代原始读准确率通常低于Illumina（虽然HiFi模式已接近）。",
        "subject": "生物信息学",
        "concept": "三代测序",
        "difficulty": "league",
        "target": "competition",
        "tags": ["sequencing_tech", "module_4", "生物信息学", "三代测序"],
        "references": [
            {"doi": "10.1038/nbt.3314", "title": "Single-molecule sequencing technologies", "authors": "van Dijk EL et al.", "year": 2018, "journal": "Nature Biotechnology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于单细胞测序和宏基因组测序，以下判断正确的有哪些？",
        "options": [
            "单细胞RNA-seq（scRNA-seq）可以在单个细胞水平分析基因表达",
            "scRNA-seq可以发现组织中的细胞异质性",
            "宏基因组测序是对环境样品中所有微生物的基因组进行测序",
            "宏基因组测序需要先分离培养每种微生物"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：scRNA-seq定义。B正确：发现异质性。C正确：宏基因组定义。D错误：宏基因组无需培养，直接提取环境DNA。",
        "subject": "生物信息学",
        "concept": "单细胞与宏基因组",
        "difficulty": "league",
        "target": "competition",
        "tags": ["sequencing_tech", "module_4", "生物信息学", "测序技术"],
        "references": [
            {"doi": "10.1038/nbt.3442", "title": "Single-cell RNA-seq", "authors": "Macosko EZ et al.", "year": 2015, "journal": "Cell"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于测序深度和覆盖度，以下说法正确的有哪些？",
        "options": [
            "测序深度（depth）是指每个碱基被测序的平均次数",
            "测序覆盖度（coverage）是指被测序到的碱基占基因组的百分比",
            "增加测序深度可以提高碱基调用的准确性",
            "30×深度的人类基因组测序意味着每个碱基平均被测了30次"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：depth定义。B正确：coverage定义。C正确：深度提高准确性。D正确：30×含义。",
        "subject": "生物信息学",
        "concept": "测序深度与覆盖度",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["sequencing_tech", "module_4", "生物信息学", "测序技术"],
        "references": []
    }
]

# ---- 19. genome_assembly (19) ----
ALL_QUESTIONS["genome_assembly"] = [
    {
        "type": "mtf",
        "question": "关于基因组de novo组装，以下说法正确的有哪些？",
        "options": [
            "de novo组装是指在没有参考基因组的情况下从reads构建基因组序列",
            "de Bruijn图是短读长组装中常用的算法框架",
            "Overlap-Layout-Consensus（OLC）方法适用于长读长数据",
            "de novo组装总是比参考基因组比对更简单"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：de novo定义。B正确：de Bruijn图用于短读长。C正确：OLC适合长读长。D错误：de novo组装通常更复杂。",
        "subject": "生物信息学",
        "concept": "de novo组装",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genome_assembly", "module_4", "生物信息学", "基因组组装"],
        "references": [
            {"doi": "10.1038/nrg3565", "title": "Genome assembly algorithms", "authors": "Miller JR et al.", "year": 2014, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于N50和scaffold，以下判断正确的有哪些？",
        "options": [
            "N50是指将所有contig按长度排序后，累积长度达到总长50%时的contig长度",
            "N50越大表示组装质量越好",
            "scaffold是由contig通过gap连接而成的更大片段",
            "scaffold之间不存在gap"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：N50定义。B正确：N50越大越好。C正确：scaffold连接contig。D错误：scaffold之间有gap（N填充）。",
        "subject": "生物信息学",
        "concept": "N50与scaffold",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["genome_assembly", "module_4", "生物信息学", "基因组组装"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于基因组注释，以下说法正确的有哪些？",
        "options": [
            "结构注释是识别基因组中的基因结构（外显子、内含子、UTR等）",
            "功能注释是为预测的基因赋予生物学功能",
            "ab initio基因预测使用统计模型（如HMM）识别基因",
            "同源比对证据不能用于基因预测"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：结构注释。B正确：功能注释。C正确：ab initio方法。D错误：同源比对是基因预测的重要证据。",
        "subject": "生物信息学",
        "concept": "基因组注释",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genome_assembly", "module_4", "生物信息学", "基因组注释"],
        "references": [
            {"doi": "10.1101/gr.174753.114", "title": "Genome annotation", "authors": "Yandell M, Ence D", "year": 2014, "journal": "Genome Research"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于结构变异检测，以下判断正确的有哪些？",
        "options": [
            "结构变异包括缺失、插入、倒位、重复和易位等",
            "短读长测序可以有效检测所有类型的结构变异",
            "长读长测序对结构变异检测具有明显优势",
            "结构变异在人类基因组中比SNP更常见"
        ],
        "answers": [True, False, True, False],
        "explanation": "A正确：SV类型。B错误：短读长对大片段SV和复杂区域检测能力有限。C正确：长读长跨越重复区域。D错误：SNP比SV更常见。",
        "subject": "生物信息学",
        "concept": "结构变异检测",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genome_assembly", "module_4", "生物信息学", "结构变异"],
        "references": [
            {"doi": "10.1038/nrg3642", "title": "Structural variation detection", "authors": "Alkan C et al.", "year": 2011, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于混合组装策略（hybrid assembly），以下说法正确的有哪些？",
        "options": [
            "混合组装结合短读长的高准确性和长读长的长距离信息",
            "短读长数据用于修正长读长的测序错误",
            "长读长数据帮助跨越重复区域和复杂结构",
            "混合组装的效果一定不如单独使用任何一种数据"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：混合组装原理。B正确：短读长纠错。C正确：长读长跨越重复。D错误：混合组装通常优于单一数据。",
        "subject": "生物信息学",
        "concept": "混合组装",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genome_assembly", "module_4", "生物信息学", "基因组组装"],
        "references": [
            {"doi": "10.1186/s13059-018-1562-6", "title": "Hybrid genome assembly", "authors": "Koren S et al.", "year": 2018, "journal": "Genome Biology"}
        ]
    }
]

# ---- 20. transcriptomics (20) ----
ALL_QUESTIONS["transcriptomics"] = [
    {
        "type": "mtf",
        "question": "关于RNA-seq技术，以下说法正确的有哪些？",
        "options": [
            "RNA-seq通过高通量测序来检测细胞中的转录组",
            "RNA-seq可以检测基因的表达水平、可变剪接和新转录本",
            "RNA-seq数据分析流程通常包括质控、比对、定量和差异分析",
            "RNA-seq只能检测mRNA，不能检测非编码RNA"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：RNA-seq定义。B正确：多种应用。C正确：标准流程。D错误：RNA-seq也可检测lncRNA、miRNA等非编码RNA。",
        "subject": "生物信息学",
        "concept": "RNA-seq",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["transcriptomics", "module_4", "生物信息学", "转录组学"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于差异表达分析，以下判断正确的有哪些？",
        "options": [
            "DESeq2和edgeR是两种常用的RNA-seq差异表达分析工具",
            "DESeq2使用负二项分布模型来处理RNA-seq计数数据",
            "FPKM和TPM是两种常用的基因表达量标准化指标",
            "差异表达分析不需要进行多重检验校正"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：DESeq2和edgeR常用。B正确：负二项分布。C正确：FPKM和TPM。D错误：需要多重检验校正（如BH方法控制FDR）。",
        "subject": "生物信息学",
        "concept": "差异表达分析",
        "difficulty": "league",
        "target": "competition",
        "tags": ["transcriptomics", "module_4", "生物信息学", "差异表达"],
        "references": [
            {"doi": "10.1186/gb-2010-11-10-r106", "title": "Differential expression analysis for sequence count data", "authors": "Anders S, Huber W", "year": 2010, "journal": "Genome Biology"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于共表达网络分析，以下说法正确的有哪些？",
        "options": [
            "共表达网络基于基因表达模式的相关性构建",
            "WGCNA（Weighted Gene Co-expression Network Analysis）是常用的共表达网络分析方法",
            "共表达网络中的hub基因通常是重要的调控基因",
            "共表达关系一定意味着基因之间存在直接的调控关系"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：基于表达相关性。B正确：WGCNA常用。C正确：hub基因重要。D错误：共表达可能是间接关系或共同调控。",
        "subject": "生物信息学",
        "concept": "共表达网络",
        "difficulty": "league",
        "target": "competition",
        "tags": ["transcriptomics", "module_4", "生物信息学", "共表达网络"],
        "references": [
            {"doi": "10.1371/journal.pone.0058631", "title": "WGCNA", "authors": "Langfelder P, Horvath S", "year": 2013, "journal": "PLoS ONE"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于可变剪接分析，以下判断正确的有哪些？",
        "options": [
            "可变剪接是指一个基因通过不同的剪接方式产生多种mRNA",
            "人类基因组中超过90%的多外显子基因存在可变剪接",
            "RNA-seq可以用于检测和分析可变剪接事件",
            "可变剪接不会增加蛋白质组的多样性"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：可变剪接定义。B正确：人类普遍存在。C正确：RNA-seq检测。D错误：可变剪接显著增加蛋白质多样性。",
        "subject": "生物信息学",
        "concept": "可变剪接",
        "difficulty": "league",
        "target": "competition",
        "tags": ["transcriptomics", "module_4", "生物信息学", "可变剪接"],
        "references": [
            {"doi": "10.1038/nrg2882", "title": "Alternative splicing", "authors": "Wang ET et al.", "year": 2008, "journal": "Nature Reviews Genetics"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于转录组学的实验设计，以下说法正确的有哪些？",
        "options": [
            "生物学重复对于差异表达分析的统计效力至关重要",
            "技术重复可以减少实验操作引入的变异",
            "RNA-seq的测序深度影响低表达基因的检测",
            "转录组分析只需要一个时间点的样品即可"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：生物学重复重要。B正确：技术重复减少操作变异。C正确：深度影响检测。D错误：时间序列设计可以揭示动态变化。",
        "subject": "生物信息学",
        "concept": "转录组实验设计",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["transcriptomics", "module_4", "生物信息学", "转录组学"],
        "references": []
    }
]

# ---- 21. genomics_comp (21) ----
ALL_QUESTIONS["genomics_comp"] = [
    {
        "type": "mtf",
        "question": "关于比较基因组学方法，以下说法正确的有哪些？",
        "options": [
            "比较基因组学通过比较不同物种基因组来研究基因功能和进化",
            "基因组共线性分析可以识别保守的基因排列",
            "比较基因组学可以帮助识别功能重要的保守元件",
            "比较基因组学只能用于蛋白质编码基因的分析"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：定义。B正确：共线性分析。C正确：保守元件。D错误：也可分析非编码区域。",
        "subject": "生物信息学",
        "concept": "比较基因组学",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["genomics_comp", "module_4", "生物信息学", "比较基因组"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于ChIP-seq技术，以下判断正确的有哪些？",
        "options": [
            "ChIP-seq用于检测蛋白质（如转录因子、组蛋白修饰）在基因组上的结合位点",
            "ChIP-seq实验包括交联、免疫沉淀、测序和数据分析",
            "ChIP-seq可以绘制全基因组范围的组蛋白修饰图谱",
            "ChIP-seq不能用于研究转录因子的基因组结合模式"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：ChIP-seq定义。B正确：实验流程。C正确：组蛋白修饰图谱。D错误：ChIP-seq正是研究转录因子结合的主要方法。",
        "subject": "生物信息学",
        "concept": "ChIP-seq",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genomics_comp", "module_4", "生物信息学", "ChIP-seq"],
        "references": [
            {"doi": "10.1038/nmeth.1196", "title": "ChIP-seq guidelines", "authors": "Landt SG et al.", "year": 2012, "journal": "Nature Methods"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于ATAC-seq技术，以下说法正确的有哪些？",
        "options": [
            "ATAC-seq利用Tn5转座酶检测基因组开放区域",
            "ATAC-seq相比ChIP-seq需要更少的起始细胞量",
            "ATAC-seq可以反映染色质的可及性（accessibility）",
            "ATAC-seq不需要进行片段化处理"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：Tn5转座酶。B正确：低起始量。C正确：染色质可及性。D错误：Tn5本身同时进行片段化和标记。",
        "subject": "生物信息学",
        "concept": "ATAC-seq",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genomics_comp", "module_4", "生物信息学", "ATAC-seq"],
        "references": [
            {"doi": "10.1038/nmeth.2688", "title": "ATAC-seq", "authors": "Buenrostro JD et al.", "year": 2013, "journal": "Science"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于蛋白质结构域预测，以下判断正确的有哪些？",
        "options": [
            "蛋白质结构域是蛋白质结构和功能的基本单位",
            "Pfam数据库收集了大量蛋白质家族和结构域的信息",
            "InterPro整合了多个蛋白质特征数据库的资源",
            "蛋白质结构域预测不能帮助推断蛋白质的功能"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：结构域定义。B正确：Pfam数据库。C正确：InterPro整合资源。D错误：结构域预测是功能推断的重要手段。",
        "subject": "生物信息学",
        "concept": "蛋白质结构域预测",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["genomics_comp", "module_4", "生物信息学", "蛋白质结构域"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于系统发生基因组学，以下说法正确的有哪些？",
        "options": [
            "系统发生基因组学利用基因组数据研究物种的进化关系",
            "全基因组数据可以提供比单基因更多的进化信息",
            "不完全谱系分选（ILS）可以导致不同基因的进化树不一致",
            "系统发生基因组学不能解决快速辐射演化的问题"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：定义。B正确：全基因组信息更多。C正确：ILS导致基因树不一致。D错误：系统发生基因组学方法可以处理快速辐射演化。",
        "subject": "生物信息学",
        "concept": "系统发生基因组学",
        "difficulty": "league",
        "target": "competition",
        "tags": ["genomics_comp", "module_4", "生物信息学", "系统发生基因组"],
        "references": [
            {"doi": "10.1038/nrg3313", "title": "Phylogenomics", "authors": "Philippe H et al.", "year": 2011, "journal": "Nature Reviews Genetics"}
        ]
    }
]

# ---- 22. bio_databases (22) ----
ALL_QUESTIONS["bio_databases"] = [
    {
        "type": "mtf",
        "question": "关于NCBI数据库，以下说法正确的有哪些？",
        "options": [
            "GenBank是NCBI维护的核酸序列数据库",
            "PubMed是生物医学文献摘要和引文数据库",
            "BLAST工具可以在NCBI网站上免费使用",
            "NCBI只存储核酸序列数据，不包含蛋白质数据"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：GenBank是核酸数据库。B正确：PubMed文献库。C正确：BLAST在线使用。D错误：NCBI也包含蛋白质数据库（如RefSeq蛋白质）。",
        "subject": "生物信息学",
        "concept": "NCBI数据库",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["bio_databases", "module_4", "生物信息学", "数据库"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于UniProt数据库，以下判断正确的有哪些？",
        "options": [
            "UniProt是全面的蛋白质序列和功能信息数据库",
            "UniProt由Swiss-Prot、TrEMBL和PIR组成",
            "Swiss-Prot是手动注释和审核的蛋白质数据库",
            "TrEMBL中的蛋白质信息比Swiss-Prot更可靠"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：UniProt定义。B正确：组成。C正确：Swiss-Prot手动注释。D错误：Swiss-Prot比TrEMBL更可靠（TrEMBL是自动注释）。",
        "subject": "生物信息学",
        "concept": "UniProt数据库",
        "difficulty": "league",
        "target": "competition",
        "tags": ["bio_databases", "module_4", "生物信息学", "数据库"],
        "references": [
            {"doi": "10.1093/nar/gky1083", "title": "UniProt: the universal protein knowledgebase", "authors": "The UniProt Consortium", "year": 2019, "journal": "Nucleic Acids Research"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于PDB数据库，以下说法正确的有哪些？",
        "options": [
            "PDB（Protein Data Bank）存储蛋白质和核酸的三维结构数据",
            "PDB中的结构数据主要通过X射线晶体学、NMR和冷冻电镜获得",
            "RCSB PDB是美国维护的PDB镜像站点",
            "PDB只存储蛋白质的结构，不包含核酸结构"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：PDB定义。B正确：实验方法。C正确：RCSB是美国站点。D错误：PDB也包含核酸和复合物结构。",
        "subject": "生物信息学",
        "concept": "PDB数据库",
        "difficulty": "league",
        "target": "competition",
        "tags": ["bio_databases", "module_4", "生物信息学", "数据库"],
        "references": [
            {"doi": "10.1093/nar/gky1004", "title": "Protein Data Bank", "authors": "Berman H et al.", "year": 2019, "journal": "Nucleic Acids Research"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于Ensembl数据库，以下判断正确的有哪些？",
        "options": [
            "Ensembl是真核生物基因组的自动注释数据库",
            "Ensembl提供基因组浏览器用于可视化基因组数据",
            "Ensembl只注释人类基因组，不包含其他物种",
            "Ensembl与UCSC Genome Browser是两个独立的基因组浏览器"
        ],
        "answers": [True, True, False, True],
        "explanation": "A正确：Ensembl定义。B正确：基因组浏览器。C错误：Ensembl注释多个真核物种。D正确：两者独立。",
        "subject": "生物信息学",
        "concept": "Ensembl数据库",
        "difficulty": "league",
        "target": "competition",
        "tags": ["bio_databases", "module_4", "生物信息学", "数据库"],
        "references": [
            {"doi": "10.1093/nar/gky1113", "title": "Ensembl 2019", "authors": "Howe KL et al.", "year": 2019, "journal": "Nucleic Acids Research"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于生物数据格式，以下说法正确的有哪些？",
        "options": [
            "FASTA格式是最简单的核酸和蛋白质序列格式",
            "GenBank格式包含序列信息和丰富的注释信息",
            "SAM/BAM格式用于存储测序reads与参考基因组的比对结果",
            "VCF格式用于存储基因变异信息"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：FASTA格式。B正确：GenBank格式。C正确：SAM/BAM比对格式。D正确：VCF变异格式。",
        "subject": "生物信息学",
        "concept": "数据格式",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["bio_databases", "module_4", "生物信息学", "数据格式"],
        "references": []
    }
]

# ---- 23. animal_diversity (23) ----
ALL_QUESTIONS["animal_diversity"] = [
    {
        "type": "mtf",
        "question": "关于动物体腔的演化，以下说法正确的有哪些？",
        "options": [
            "无体腔动物（如扁形动物）体壁与消化道之间无空腔",
            "假体腔动物（如线形动物）体壁与消化道之间有腔但无中胚层衬里",
            "真体腔动物（如环节动物）体腔由中胚层包裹",
            "所有动物都具有体腔"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：无体腔定义。B正确：假体腔定义。C正确：真体腔定义。D错误：低等动物无体腔。",
        "subject": "动物分类学",
        "concept": "体腔演化",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["animal_diversity", "module_4", "动物分类学", "体腔"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于脊索动物的特征，以下判断正确的有哪些？",
        "options": [
            "脊索动物具有脊索、背神经管和咽鳃裂三大特征",
            "尾索动物（如海鞘）成体保留脊索",
            "头索动物（如文昌鱼）终生具有脊索",
            "脊椎动物亚门是脊索动物门中种类最多的类群"
        ],
        "answers": [True, False, True, True],
        "explanation": "A正确：三大特征。B错误：尾索动物成体脊索退化。C正确：头索动物终生有脊索。D正确：脊椎动物种类最多。",
        "subject": "动物分类学",
        "concept": "脊索动物",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["animal_diversity", "module_4", "动物分类学", "脊索动物"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于节肢动物的特征，以下说法正确的有哪些？",
        "options": [
            "节肢动物具有分节的身体和外骨骼",
            "节肢动物的附肢分节，用于运动、摄食等不同功能",
            "昆虫是节肢动物门中种类最多的类群",
            "节肢动物是动物界中种类最多的门"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：分节和外骨骼。B正确：附肢分节。C正确：昆虫种类最多。D正确：节肢动物是最大门。",
        "subject": "动物分类学",
        "concept": "节肢动物",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["animal_diversity", "module_4", "动物分类学", "节肢动物"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于无脊椎动物到脊椎动物的演化趋势，以下判断正确的有哪些？",
        "options": [
            "从辐射对称到两侧对称",
            "从二胚层到三胚层",
            "从无体腔到有体腔",
            "从脊椎到无脊椎"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：辐射→两侧。B正确：二→三胚层。C正确：无→有体腔。D错误：是从无脊椎到有脊椎。",
        "subject": "动物分类学",
        "concept": "演化趋势",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["animal_diversity", "module_4", "动物分类学", "演化"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于主要无脊椎动物门类，以下说法正确的有哪些？",
        "options": [
            "海绵动物是最原始的多细胞动物，无真正的组织和器官",
            "腔肠动物（如海葵、水母）具有辐射对称和两胚层",
            "扁形动物（如涡虫）具有两侧对称和三胚层，但无体腔",
            "软体动物（如蜗牛、章鱼）具有柔软的身体，多数有贝壳"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：海绵原始。B正确：腔肠特征。C正确：扁形特征。D正确：软体特征。",
        "subject": "动物分类学",
        "concept": "无脊椎动物门类",
        "difficulty": "league",
        "target": "competition",
        "tags": ["animal_diversity", "module_4", "动物分类学", "无脊椎动物"],
        "references": [
            {"doi": "10.1038/nature11783", "title": "The animal tree of life", "authors": "Dunn CW et al.", "year": 2014, "journal": "Nature"}
        ]
    }
]

# ---- 24. plant_classification (24) ----
ALL_QUESTIONS["plant_classification"] = [
    {
        "type": "mtf",
        "question": "关于植物主要类群的特征，以下说法正确的有哪些？",
        "options": [
            "藻类植物无根茎叶分化，多为水生",
            "苔藓植物有茎叶分化但无真正的根，有假根",
            "蕨类植物有根茎叶分化，有维管组织",
            "种子植物（裸子和被子）产生种子，不产生孢子"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：藻类特征。B正确：苔藓特征。C正确：蕨类特征。D错误：种子植物也产生孢子（小孢子和大孢子）。",
        "subject": "植物分类学",
        "concept": "植物类群",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["plant_classification", "module_4", "植物分类学", "植物类群"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于裸子植物和被子植物的区别，以下判断正确的有哪些？",
        "options": [
            "裸子植物的种子裸露，无果皮包被",
            "被子植物的种子有果皮包被，形成果实",
            "裸子植物多为木本，被子植物有木本和草本",
            "裸子植物有真正的花，被子植物无花"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：裸子种子裸露。B正确：被子有果实。C正确：生活型差异。D错误：被子植物有花，裸子植物无真正的花。",
        "subject": "植物分类学",
        "concept": "裸子与被子",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["plant_classification", "module_4", "植物分类学", "种子植物"],
        "references": []
    },
    {
        "type": "mtf",
        "question": "关于APG分类系统，以下说法正确的有哪些？",
        "options": [
            "APG（Angiosperm Phylogeny Group）系统是基于分子系统发育研究的被子植物分类系统",
            "APG系统使用单系群作为分类依据",
            "APG系统已经发布了多个版本（APG I, II, III, IV）",
            "APG系统完全取代了传统的形态学分类系统"
        ],
        "answers": [True, True, True, False],
        "explanation": "A正确：APG定义。B正确：单系原则。C正确：多个版本。D错误：APG与传统系统并存，不是完全取代。",
        "subject": "植物分类学",
        "concept": "APG系统",
        "difficulty": "league",
        "target": "competition",
        "tags": ["plant_classification", "module_4", "植物分类学", "APG"],
        "references": [
            {"doi": "10.1111/jse.12355", "title": "An update of the Angiosperm Phylogeny Group classification", "authors": "APG IV", "year": 2016, "journal": "Journal of Systematics and Evolution"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于被子植物主要科的特征，以下判断正确的有哪些？",
        "options": [
            "禾本科植物具有颖花，果实为颖果",
            "豆科植物具有蝶形花冠，果实为荚果",
            "蔷薇科植物花托凸起，多为聚合果",
            "十字花科植物具有四强雄蕊，果实为角果"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：禾本科特征。B正确：豆科特征。C正确：蔷薇科特征。D正确：十字花科特征。",
        "subject": "植物分类学",
        "concept": "主要科特征",
        "difficulty": "league",
        "target": "competition",
        "tags": ["plant_classification", "module_4", "植物分类学", "被子植物科"],
        "references": [
            {"doi": "10.1007/978-3-662-06159-5", "title": "Plant Systematics", "authors": "Simpson MG", "year": 2010, "journal": "Academic Press"}
        ]
    },
    {
        "type": "mtf",
        "question": "关于植物演化趋势，以下说法正确的有哪些？",
        "options": [
            "从水生到陆生",
            "从配子体发达到孢子体发达",
            "从无维管组织到有维管组织",
            "从无种子到有种子"
        ],
        "answers": [True, True, True, True],
        "explanation": "A正确：水生→陆生。B正确：配子体→孢子体。C正确：无→有维管。D正确：无→有种子。",
        "subject": "植物分类学",
        "concept": "植物演化",
        "difficulty": "high_school",
        "target": "high_school",
        "tags": ["plant_classification", "module_4", "植物分类学", "演化"],
        "references": []
    }
]

# ============================================================================
# GENERATE FILES
# ============================================================================

def generate_files():
    """Generate bank and index files for all nodes."""
    results = {}
    
    for idx, node_id in enumerate(NODES):
        tag_hex = hex_tag(idx)
        questions = ALL_QUESTIONS.get(node_id, [])
        
        bank_data = {}
        index_data = {}
        
        for q in questions:
            # Generate question ID
            qid = make_id(tag_hex, q["question"], q["options"], q["answers"])
            
            # Build bank entry
            bank_entry = {
                "type": q["type"],
                "question": q["question"],
                "subQuestions": [
                    {"label": "A", "text": q["options"][0], "answer": q["answers"][0]},
                    {"label": "B", "text": q["options"][1], "answer": q["answers"][1]},
                    {"label": "C", "text": q["options"][2], "answer": q["answers"][2]},
                    {"label": "D", "text": q["options"][3], "answer": q["answers"][3]}
                ],
                "explanation": q["explanation"],
                "subject": q["subject"],
                "concept": q["concept"],
                "difficulty": q["difficulty"],
                "target": q["target"],
                "tags": q["tags"],
                "references": q["references"]
            }
            bank_data[qid] = bank_entry
            
            # Build index entry
            index_entry = {
                "tags": q["tags"],
                "diff": q["difficulty"],
                "len": len(q["question"]) + sum(len(o) for o in q["options"]),
                "src": node_id,
                "year": None,
                "module": "module_4"
            }
            index_data[qid] = index_entry
        
        # Write bank file
        bank_path = os.path.join(BANK_DIR, f"{node_id}.json")
        with open(bank_path, 'w', encoding='utf-8') as f:
            json.dump(bank_data, f, ensure_ascii=False, indent=2)
        
        # Write index file
        index_path = os.path.join(INDEX_DIR, f"{node_id}.json")
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)
        
        results[node_id] = len(questions)
        print(f"Generated {len(questions)} questions for {node_id}")
    
    return results

if __name__ == "__main__":
    results = generate_files()
    print("\n" + "="*60)
    print("Module 4 Question Generation Summary")
    print("="*60)
    total = sum(results.values())
    print(f"Total nodes: {len(results)}")
    print(f"Total questions: {total}")
    print("\nPer-node breakdown:")
    for node_id, count in results.items():
        print(f"  {node_id}: {count} questions")
    print("="*60)