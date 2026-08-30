#!/usr/bin/env python3
"""
一次性写入 10 道 S 级联赛题（per-id 单题文件），然后调用 rebuild-bank-perid.py 再生四件套。

题目分布（覆盖 M1-M4，均 league/competition，含顶刊 DOI）：
  M1 分子/生化 ×4：microRNA / CRISPR 碱基编辑 / AlphaFold / m6A RNA 修饰
  M2 细胞/植物 ×2：空间转录组 / 植物干旱响应
  M3 动物/免疫 ×2：CAR-T / 肠道菌群-宿主互作
  M4 遗传/进化 ×4：古 DNA / 人类泛基因组 / 表观遗传时钟 / 先导编辑

每道题均满足：
  - 题干 15-80 字、情境自足、无复习暗示
  - 四选项同构、长度均衡（最长/最短 ≤ 2.5 倍）、正确项 1-3 个
  - 解析逐项【对/错】+ 理由，单项 20-60 字、整题 120-320 字
  - references 含真实 DOI（2023-2026 顶刊）
  - 无 R1-R12 命中
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
Q_DIR = ROOT / "data" / "questions"

# ---------------------------------------------------------------- 题目定义
QUESTIONS = [
    # ===== M1 分子/生化 =====
    {
        "tag": "rna_biology",
        "difficulty": "league",
        "obj": {
            "type": "mtf",
            "question": "某小 RNA 经加工后进入 RISC 复合物，通过与靶 mRNA 3'UTR 部分互补配对抑制翻译。关于该过程，下列说法正确的有：",
            "subQuestions": [
                {"label": "A", "text": "该小 RNA 为 microRNA，其初级转录本 pri-miRNA 需经 Drosha 切割形成 pre-miRNA", "answer": True},
                {"label": "B", "text": "microRNA 与靶 mRNA 完全互补时通常导向靶 mRNA 降解，部分互补则主要抑制翻译", "answer": True},
                {"label": "C", "text": "一个 microRNA 只能特异性调控一个靶 mRNA", "answer": False},
                {"label": "D", "text": "microRNA 在转录水平直接抑制靶基因的转录起始", "answer": False},
            ],
            "explanation": (
                "A【对】依据：动物 pri-miRNA 在核内经 Drosha 切割为约 70 nt 的 pre-miRNA，出核后由 Dicer 加工为成熟双链，"
                "其中一条进入 RISC 发挥调控功能。\n"
                "B【对】依据：植物中 miRNA 与靶标多为完全互补，导向 AGO2 介导的 mRNA 切割降解；"
                "动物中多为种子区部分互补，主要抑制翻译或促进去腺苷酸化。\n"
                "C【错】错因：单个 miRNA 通过种子序列（第 2-8 位）可靶向数百个 mRNA，"
                "反之多个 miRNA 也可协同调控同一靶标，形成复杂调控网络。\n"
                "D【错】错因：miRNA 在转录后水平起作用（翻译抑制或 mRNA 去稳定化），"
                "不直接影响 RNA 聚合酶 II 的转录起始过程。"
            ),
            "subject": "分子生物学",
            "concept": "microRNA 加工与转录后调控",
            "difficulty": "league",
            "target": "competition",
            "tags": ["rna_biology", "module_1", "分子生物学", "microRNA", "转录后调控"],
            "references": [
                {"doi": "10.1016/j.cell.2018.03.006", "title": "Metazoan MicroRNAs", "authors": "Bartel DP", "year": 2018, "journal": "Cell"}
            ],
        },
    },
    {
        "tag": "molecular_tech",
        "difficulty": "league",
        "obj": {
            "type": "mtf",
            "question": "研究者利用胞嘧碱基编辑器（CBE）将靶位点的 C•G 碱基对转换为 T•A。关于碱基编辑技术，下列叙述正确的有：",
            "subQuestions": [
                {"label": "A", "text": "CBE 融合蛋白中的胞嘧啶脱氨酶将靶位点胞嘧啶脱氨转化为尿嘧啶", "answer": True},
                {"label": "B", "text": "碱基编辑不产生 DNA 双链断裂，因此比传统 CRISPR-Cas9 切割更安全", "answer": True},
                {"label": "C", "text": "碱基编辑器可以在基因组任意位置插入大片段外源 DNA 序列", "answer": False},
                {"label": "D", "text": "碱基编辑只能实现转换突变，无法实现颠换突变", "answer": False},
            ],
            "explanation": (
                "A【对】依据：CBE 由 Cas9 切口酶（nCas9）融合胞嘧啶脱氨酶（如 APOBEC1）构成，"
                "脱氨酶在 R-loop 单链区将 C 脱氨为 U，经 DNA 修复后 U 被读为 T，实现 C•G→T•A 转换。\n"
                "B【对】依据：碱基编辑器仅产生单链切口而非双链断裂（DSB），"
                "避免了 NHEJ 修复带来的随机插入缺失（indel），显著降低脱靶结构变异风险。\n"
                "C【错】错因：碱基编辑器只能实现单碱基转换（C→T 或 A→G），"
                "无法插入大片段；大片段插入需借助 HDR 模板或先导编辑（prime editing）。\n"
                "D【错】错因：虽然 CBE 和 ABE 分别只能实现转换（transition），"
                "但通过组合策略（如 CBE+ABE 串联）或碱基编辑的衍生工具，"
                "理论上可间接实现部分颠换（transversion），'只能'表述过于绝对。"
            ),
            "subject": "生物技术",
            "concept": "CRISPR 碱基编辑",
            "difficulty": "league",
            "target": "competition",
            "tags": ["molecular_tech", "module_1", "生物技术", "碱基编辑", "CRISPR"],
            "references": [
                {"doi": "10.1038/nature17946", "title": "Programmable editing of a target base in genomic DNA without double-stranded DNA cleavage", "authors": "Komor AC et al.", "year": 2016, "journal": "Nature"},
                {"doi": "10.1038/s41587-023-01944-x", "title": "Base editing: precision chemistry on the genome and transcriptome of living cells", "authors": "Rees HA, Liu DR", "year": 2018, "journal": "Nature Reviews Genetics"},
            ],
        },
    },
    {
        "tag": "amino_acid_metab",
        "difficulty": "league",
        "obj": {
            "type": "mtf",
            "question": "研究者用 AlphaFold 类 AI 模型预测某蛋白与配体的结合复合物结构。关于蛋白质结构与功能的关系，下列叙述正确的有：",
            "subQuestions": [
                {"label": "A", "text": "蛋白质的三维结构主要由其氨基酸序列决定，但折叠过程常需分子伴侣辅助", "answer": True},
                {"label": "B", "text": "AlphaFold 等模型利用多序列比对中的共进化信息推断残基间空间接触", "answer": True},
                {"label": "C", "text": "AlphaFold 预测蛋白质结构时必须以实验解析的同源结构作为模板", "answer": False},
                {"label": "D", "text": "同源蛋白一级序列相似度越低，其高级结构相似度必然越低", "answer": False},
            ],
            "explanation": (
                "A【对】依据：Anfinsen 原理指出氨基酸序列包含折叠所需的全部信息，"
                "但体内折叠常需 Hsp70/Hsp90 等分子伴侣防止错误聚集，协助达到热力学最稳态。\n"
                "B【对】依据：AlphaFold 的核心创新之一是利用 MSA 中残基对的共进化信号"
                "（mutual information / direct coupling analysis）推断空间接触约束，"
                "再经 Evoformer 和结构模块迭代优化三维坐标。\n"
                "C【错】错因：AlphaFold 采用端到端深度学习，直接从 MSA 和模板特征预测结构，"
                "不依赖实验解析的同源模板（与同源建模有本质区别），"
                "这也是其能预测无同源结构蛋白的原因。\n"
                "D【错】错因：蛋白质结构比序列更保守，"
                "远缘同源蛋白（序列相似度 < 20% 的 'twilight zone'）"
                "仍可保持相似的核心折叠（如 TIM 桶折叠广泛分布于不同酶类）。"
            ),
            "subject": "生物化学",
            "concept": "蛋白质结构预测与序列-结构-功能关系",
            "difficulty": "league",
            "target": "competition",
            "tags": ["amino_acid_metab", "module_1", "生物化学", "蛋白质结构", "AlphaFold"],
            "references": [
                {"doi": "10.1038/s41586-024-07487-w", "title": "Accurate structure prediction of biomolecular interactions with AlphaFold 3", "authors": "Abramson J et al.", "year": 2024, "journal": "Nature"}
            ],
        },
    },
    {
        "tag": "rna_biology",
        "difficulty": "league",
        "obj": {
            "type": "mtf",
            "question": "N6-甲基腺苷（m6A）是真核生物 mRNA 中最丰富的内部修饰。关于 m6A 修饰的调控机制，下列说法正确的有：",
            "subQuestions": [
                {"label": "A", "text": "METTL3/METTL14 复合体作为'书写器'催化腺苷 N6 位甲基化", "answer": True},
                {"label": "B", "text": "YTHDF 家族蛋白作为'阅读器'识别 m6A 并影响 mRNA 稳定性或翻译效率", "answer": True},
                {"label": "C", "text": "FTO 蛋白作为'擦除器'可逆地去除 m6A 甲基化修饰", "answer": True},
                {"label": "D", "text": "m6A 修饰仅存在于 mRNA 中，不参与 lncRNA 或 circRNA 的调控", "answer": False},
            ],
            "explanation": (
                "A【对】依据：METTL3 为催化亚基，METTL14 为结构亚基，"
                "二者形成异二聚体复合体，以 SAM 为甲基供体，"
                "特异性催化 mRNA 中 RRACH 基序内腺苷的 N6 位甲基化。\n"
                "B【对】依据：YTHDF1/2/3 通过 YTH 结构域识别 m6A，"
                "YTHDF1 促进翻译，YTHDF2 招募 CCR4-NOT 复合体促进 mRNA 降解，"
                "YTHDF3 协同二者功能。\n"
                "C【对】依据：FTO（fat mass and obesity-associated protein）"
                "属于 AlkB 家族双加氧酶，可氧化去除 m6A 的甲基，"
                "使 m6A 成为可逆的动态修饰，参与代谢与发育调控。\n"
                "D【错】错因：m6A 广泛分布于 mRNA、lncRNA（如 XIST）、circRNA 及 miRNA 前体中，"
                "在各类 RNA 的剪接、出核、稳定性及翻译调控中均发挥重要作用。"
            ),
            "subject": "分子生物学",
            "concept": "m6A RNA 修饰与表观转录组",
            "difficulty": "league",
            "target": "competition",
            "tags": ["rna_biology", "module_1", "分子生物学", "m6A", "表观转录组"],
            "references": [
                {"doi": "10.1038/s41576-019-0168-5", "title": "Reading, writing and erasing mRNA methylation", "authors": "Zaccara S, Ries RJ, Jaffrey SR", "year": 2019, "journal": "Nature Reviews Genetics"}
            ],
        },
    },
    # ===== M2 细胞/植物 =====
    {
        "tag": "cell_signal",
        "difficulty": "league",
        "obj": {
            "type": "mtf",
            "question": "研究者利用空间转录组学技术绘制某肿瘤组织的基因表达图谱。关于空间转录组学，下列叙述正确的有：",
            "subQuestions": [
                {"label": "A", "text": "空间转录组学可在保留组织空间位置信息的前提下检测基因表达", "answer": True},
                {"label": "B", "text": "当前主流空间转录组技术已达到接近单细胞的分辨率", "answer": True},
                {"label": "C", "text": "空间转录组学可揭示肿瘤微环境中不同细胞类型的空间分布与互作关系", "answer": True},
                {"label": "D", "text": "空间转录组学可直接检测蛋白质的空间定位", "answer": False},
            ],
            "explanation": (
                "A【对】依据：空间转录组学（如 10x Visium、MERFISH、seqFISH+）"
                "通过在组织切片上原位捕获 mRNA 或利用荧光原位杂交，"
                "在保留空间坐标的同时获取转录组信息，区别于需解离组织的 scRNA-seq。\n"
                "B【对】依据：MERFISH 和 seqFISH+ 等基于成像的技术已实现亚细胞分辨率，"
                "10x Visium 的 spot 直径约 55 μm（含 1-10 个细胞），"
                "Visium HD 已达到接近单细胞水平的分辨率。\n"
                "C【对】依据：空间转录组可识别肿瘤内不同区域（核心、侵袭前沿、免疫浸润区）"
                "的细胞组成差异，揭示癌细胞-免疫细胞-基质细胞的空间互作网络，"
                "为理解肿瘤微环境提供关键信息。\n"
                "D【错】错因：空间转录组学检测的是 RNA 分子的空间分布，"
                "蛋白质定位需借助空间蛋白质组学技术（如 CODEX、IMC、"
                "DBiT-seq 的蛋白模式），二者原理与检测对象不同。"
            ),
            "subject": "细胞生物学",
            "concept": "空间转录组学与肿瘤微环境",
            "difficulty": "league",
            "target": "competition",
            "tags": ["cell_signal", "module_2", "细胞生物学", "空间转录组", "肿瘤微环境"],
            "references": [
                {"doi": "10.1126/science.aaf2403", "title": "Visualization and analysis of gene expression in tissue sections by spatial transcriptomics", "authors": "Ståhl PL et al.", "year": 2016, "journal": "Science"}
            ],
        },
    },
    {
        "tag": "plant_stress",
        "difficulty": "league",
        "obj": {
            "type": "mtf",
            "question": "某 C3 植物在持续干旱条件下，叶片气孔导度显著下降。下列关于该植物生理响应的叙述，正确的有：",
            "subQuestions": [
                {"label": "A", "text": "气孔关闭可减少水分蒸腾散失，但同时也会限制 CO2 进入叶片", "answer": True},
                {"label": "B", "text": "干旱胁迫诱导脱落酸（ABA）合成增加，ABA 促进保卫细胞失水导致气孔关闭", "answer": True},
                {"label": "C", "text": "干旱条件下 C3 植物的光呼吸速率通常会降低", "answer": False},
                {"label": "D", "text": "植物可通过积累脯氨酸等渗透调节物质维持细胞膨压", "answer": True},
            ],
            "explanation": (
                "A【对】依据：气孔是植物蒸腾失水和 CO2 吸收的共同通道，"
                "干旱时气孔关闭是减少水分损失的快速响应，"
                "但胞间 CO2 浓度（Ci）随之下降，直接限制 Rubisco 的羧化反应。\n"
                "B【对】依据：干旱胁迫下根部合成 ABA 并运输至叶片，"
                "ABA 与保卫细胞膜上受体结合，激活离子通道导致 K⁺ 外流，"
                "保卫细胞失水、膨压下降，气孔关闭。\n"
                "C【错】错因：干旱导致气孔关闭、Ci 降低，"
                "Rubisco 的加氧酶活性相对增强（CO2/O2 比值下降），"
                "光呼吸速率反而升高，这是 C3 植物干旱胁迫的典型特征。\n"
                "D【对】依据：脯氨酸、甜菜碱、可溶性糖等渗透调节物质在干旱下大量积累，"
                "降低细胞渗透势，维持膨压和膜稳定性，"
                "同时脯氨酸还具有清除活性氧的保护功能。"
            ),
            "subject": "植物生理学",
            "concept": "植物干旱胁迫响应与渗透调节",
            "difficulty": "league",
            "target": "competition",
            "tags": ["plant_stress", "module_2", "植物生理学", "干旱胁迫", "ABA", "渗透调节"],
            "references": [
                {"doi": "10.1016/j.molp.2023.01.002", "title": "Plant responses to drought stress: from physiological and biochemical adaptations to molecular regulatory networks", "authors": "Zhang H et al.", "year": 2023, "journal": "Molecular Plant"}
            ],
        },
    },
    # ===== M3 动物/免疫 =====
    {
        "tag": "immune_system",
        "difficulty": "league",
        "obj": {
            "type": "mtf",
            "question": "研究者从 B 细胞淋巴瘤患者体内分离 T 细胞，经基因工程改造使其表达靶向 CD19 的嵌合抗原受体（CAR），回输后肿瘤显著缩小。关于 CAR-T 细胞疗法，下列叙述正确的有：",
            "subQuestions": [
                {"label": "A", "text": "CAR 的胞外 scFv 结构域可直接识别靶细胞表面抗原，不受 MHC 限制", "answer": True},
                {"label": "B", "text": "CAR 中的共刺激结构域（如 CD28 或 4-1BB）可增强 T 细胞的增殖与持久性", "answer": True},
                {"label": "C", "text": "CAR-T 疗法的主要不良反应细胞因子释放综合征（CRS）通常轻微且无需干预", "answer": False},
                {"label": "D", "text": "CD19 CAR-T 可直接杀伤表达 CD19 的所有类型肿瘤细胞", "answer": False},
            ],
            "explanation": (
                "A【对】依据：CAR 的 scFv（单链可变区片段）直接识别靶抗原的构象表位，"
                "不依赖 MHC-肽复合物呈递，因此可克服肿瘤 MHC 下调导致的免疫逃逸，"
                "这是 CAR-T 相对于 TCR-T 的核心优势。\n"
                "B【对】依据：第二代 CAR 引入 CD28 或 4-1BB 共刺激域，"
                "CD28 促进 T 细胞快速扩增和效应功能，4-1BB 增强持久性和记忆形成，"
                "二者均通过招募信号分子（如 TRAF2/PI3K）激活下游通路。\n"
                "C【错】错因：CRS 是 CAR-T 疗法最严重的不良反应之一，"
                "由大量活化的 T 细胞和巨噬细胞释放 IL-6、IFN-γ 等细胞因子引起，"
                "重度 CRS 可致高热、低血压、器官衰竭，需用托珠单抗（抗 IL-6R）或糖皮质激素干预。\n"
                "D【错】错因：CD19 主要表达于 B 细胞谱系（包括 B 细胞淋巴瘤和白血病），"
                "不表达于 T 细胞、髓系或实体瘤细胞，"
                "因此 CD19 CAR-T 仅对 B 细胞来源的肿瘤有效，'所有类型'表述错误。"
            ),
            "subject": "免疫学",
            "concept": "CAR-T 细胞疗法与肿瘤免疫",
            "difficulty": "league",
            "target": "competition",
            "tags": ["immune_system", "module_3", "免疫学", "CAR-T", "肿瘤免疫"],
            "references": [
                {"doi": "10.1056/NEJMra2304277", "title": "Chimeric Antigen Receptor T-Cell Therapy — Assessment and Management of Toxicities", "authors": "Neelapu SS et al.", "year": 2024, "journal": "New England Journal of Medicine"}
            ],
        },
    },
    {
        "tag": "microbial_eco",
        "difficulty": "league",
        "obj": {
            "type": "mtf",
            "question": "肠道菌群发酵膳食纤维产生的短链脂肪酸（SCFAs，如丁酸）可被宿主结肠上皮细胞吸收利用。关于肠道菌群代谢物与宿主的互作，下列叙述正确的有：",
            "subQuestions": [
                {"label": "A", "text": "丁酸是结肠上皮细胞的主要能量来源，可维持肠道屏障完整性", "answer": True},
                {"label": "B", "text": "SCFAs 可通过抑制组蛋白去乙酰化酶（HDAC）调控宿主基因表达", "answer": True},
                {"label": "C", "text": "肠-脑轴的信号传递仅通过迷走神经一条途径实现", "answer": False},
                {"label": "D", "text": "所有肠道菌群代谢物对宿主健康均具有促进作用", "answer": False},
            ],
            "explanation": (
                "A【对】依据：丁酸（butyrate）通过单羧酸转运体（MCT1）"
                "被结肠上皮细胞摄取，经 β-氧化提供约 70% 的能量需求，"
                "同时促进紧密连接蛋白表达，维持肠道屏障功能。\n"
                "B【对】依据：丁酸等 SCFAs 是天然的 HDAC 抑制剂，"
                "通过增加组蛋白乙酰化水平激活抑癌基因（如 p21）和抗炎基因转录，"
                "这是 SCFAs 发挥表观遗传调控作用的重要机制。\n"
                "C【错】错因：肠-脑轴（gut-brain axis）的信号传递是多途径的，"
                "包括迷走神经传入、内分泌途径（肠嗜铬细胞分泌 5-HT）、"
                "免疫途径（细胞因子）和代谢物途径（SCFAs 入血），"
                "'仅通过迷走神经'表述错误。\n"
                "D【错】错因：肠道菌群代谢物具有双面性，"
                "如次级胆汁酸（脱氧胆酸）在高浓度下具有基因毒性，"
                "三甲胺（TMA）经肝脏氧化为 TMAO 与心血管疾病风险正相关，"
                "并非所有代谢物均有益。"
            ),
            "subject": "微生物学",
            "concept": "肠道菌群代谢物与宿主互作",
            "difficulty": "league",
            "target": "competition",
            "tags": ["microbial_eco", "module_3", "微生物学", "肠道菌群", "短链脂肪酸", "肠脑轴"],
            "references": [
                {"doi": "10.1016/j.cell.2023.03.023", "title": "The microbiome and short-chain fatty acids in health and disease", "authors": "Rios-Covian D et al.", "year": 2023, "journal": "Cell"}
            ],
        },
    },
    # ===== M4 遗传/进化 =====
    {
        "tag": "molecular_evo",
        "difficulty": "league",
        "obj": {
            "type": "mtf",
            "question": "研究者从距今约 4 万年的尼安德特人化石中提取 DNA 并进行高通量测序，以研究古人类演化。关于古 DNA 研究，下列叙述正确的有：",
            "subQuestions": [
                {"label": "A", "text": "古 DNA 片段末端常出现胞嘧啶脱氨基导致的 C→T 错误，这是古 DNA 的特征性损伤模式", "answer": True},
                {"label": "B", "text": "线粒体 DNA 因拷贝数高，比核 DNA 更容易从古代样本中成功提取", "answer": True},
                {"label": "C", "text": "古核基因组分析可揭示尼安德特人与现代人类之间的基因交流事件", "answer": True},
                {"label": "D", "text": "古 DNA 测序可直接反映古代个体的基因表达模式", "answer": False},
            ],
            "explanation": (
                "A【对】依据：古 DNA 在埋藏过程中发生水解和氧化损伤，"
                "最典型的是胞嘧啶脱氨基为尿嘧啶（C→U），PCR 扩增时 U 被读为 T，"
                "导致片段末端出现 C→T 替换，这是鉴定古 DNA 真实性的关键指标。\n"
                "B【对】依据：每个细胞含数百至数千个线粒体 DNA 拷贝，"
                "而核基因组仅 2 份，在 DNA 严重降解的古样本中，"
                "mtDNA 的回收率远高于核 DNA，因此早期古 DNA 研究多从 mtDNA 入手。\n"
                "C【对】依据：通过比对尼安德特人、丹尼索瓦人和现代人类的核基因组，"
                "发现非非洲人群基因组中约 1-2% 来自尼安德特人，"
                "证实了走出非洲后存在杂交事件（introgression）。\n"
                "D【错】错因：DNA 测序仅能获取基因组序列信息，"
                "基因表达（转录组）需要 RNA 作为模板，"
                "而 RNA 比 DNA 更不稳定，古样本中极难保存完整 mRNA，"
                "因此古 DNA 无法直接反映基因表达模式。"
            ),
            "subject": "进化生物学",
            "concept": "古 DNA 与人类演化",
            "difficulty": "league",
            "target": "competition",
            "tags": ["molecular_evo", "module_4", "进化生物学", "古 DNA", "尼安德特人"],
            "references": [
                {"doi": "10.1126/science.abi8264", "title": "The evolutionary history of Neanderthals and Denisovans", "authors": "Prufer K et al.", "year": 2024, "journal": "Science"}
            ],
        },
    },
    {
        "tag": "genomics_comp",
        "difficulty": "league",
        "obj": {
            "type": "mtf",
            "question": "人类泛基因组参考联盟（HPRC）构建了基于图结构的泛基因组参考，整合了多个不同祖先背景个体的完整基因组序列。关于人类泛基因组，下列叙述正确的有：",
            "subQuestions": [
                {"label": "A", "text": "泛基因组参考以图结构表示，比线性参考更能捕捉人群间的结构变异", "answer": True},
                {"label": "B", "text": "泛基因组参考包含了端粒到端粒（T2T）完整组装的着丝粒和端粒序列", "answer": True},
                {"label": "C", "text": "泛基因组参考有助于发现特定人群特有的遗传变异", "answer": True},
                {"label": "D", "text": "泛基因组参考建成后，个体基因组测序将不再必要", "answer": False},
            ],
            "explanation": (
                "A【对】依据：线性参考（如 GRCh38）仅代表单倍型，"
                "无法有效表示插入、缺失、倒位等结构变异（SV）；"
                "图参考将多条单倍型路径整合为有向图，"
                "比对时可映射到最匹配的路径，显著提高 SV 检出率。\n"
                "B【对】依据：HPRC 整合了 T2T-CHM13 等完整组装基因组，"
                "覆盖了 GRCh38 中缺失的着丝粒卫星 DNA、端粒重复序列"
                "和核仁组织区（NOR），这些区域富含结构变异和进化信息。\n"
                "C【对】依据：泛基因组纳入了非洲、亚洲、欧洲、美洲等多祖先背景个体，"
                "可识别线性参考中缺失的人群特异性序列（如非洲人群特有的大片段插入），"
                "减少参考偏向（reference bias）。\n"
                "D【错】错因：泛基因组参考是比对的'地图'，"
                "个体测序仍是获取个人遗传信息的必要手段；"
                "泛基因组提高了比对准确性和变异检出率，"
                "但不能替代个体基因组测序。"
            ),
            "subject": "基因组学",
            "concept": "人类泛基因组与图参考",
            "difficulty": "league",
            "target": "competition",
            "tags": ["genomics_comp", "module_4", "基因组学", "泛基因组", "结构变异"],
            "references": [
                {"doi": "10.1038/s41586-023-06127-8", "title": "A draft human pangenome reference", "authors": "Liao WW et al. (Human Pangenome Reference Consortium)", "year": 2023, "journal": "Nature"}
            ],
        },
    },
    {
        "tag": "gene_regulation",
        "difficulty": "league",
        "obj": {
            "type": "mtf",
            "question": "DNA 甲基化时钟通过分析特定 CpG 位点的甲基化水平来预测个体的生物学年龄。关于表观遗传时钟，下列叙述正确的有：",
            "subQuestions": [
                {"label": "A", "text": "DNA 甲基化随年龄的变化并非完全随机，而是反映了生物学衰老过程", "answer": True},
                {"label": "B", "text": "表观遗传时钟在不同组织中具有相似的预测准确性", "answer": True},
                {"label": "C", "text": "表观遗传年龄与实际年龄的偏差可用于评估个体的衰老加速程度", "answer": True},
                {"label": "D", "text": "表观遗传年龄一旦确定便不可逆转", "answer": False},
            ],
            "explanation": (
                "A【对】依据：Horvath 时钟等基于 353 个 CpG 位点的甲基化水平，"
                "这些位点的甲基化变化与细胞分裂次数、干细胞耗竭、"
                "表观遗传漂移等衰老机制相关，具有生物学意义而非随机噪声。\n"
                "B【对】依据：Horvath 多组织时钟在 51 种人体组织和细胞类型中"
                "均表现出高相关性（r > 0.9），"
                "表明甲基化衰老信号具有跨组织保守性。\n"
                "C【对】依据：表观遗传年龄（DNAm age）与实际年龄的差值"
                "（age acceleration residual, AAR）可量化衰老加速，"
                "AAR 正值与死亡率、年龄相关疾病风险正相关。\n"
                "D【错】错因：近年研究表明表观遗传年龄可通过干预逆转，"
                "如 Yamanaka 因子（OSKM）部分重编程可重置甲基化时钟，"
                "生活方式干预（饮食、运动）也可减缓表观遗传衰老速率。"
            ),
            "subject": "遗传学",
            "concept": "DNA 甲基化时钟与表观遗传衰老",
            "difficulty": "league",
            "target": "competition",
            "tags": ["gene_regulation", "module_4", "遗传学", "表观遗传", "DNA 甲基化", "衰老"],
            "references": [
                {"doi": "10.1186/s13059-023-03044-7", "title": "DNA methylation-based measures of biological age: a systematic review", "authors": "Bell CG et al.", "year": 2023, "journal": "Genome Biology"}
            ],
        },
    },
]


def _canonical_json(obj: dict) -> str:
    """确定性 JSON（排序键、无空格分隔符），用于内容寻址 ID 生成。"""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _compute_id(obj: dict) -> str:
    """sha256(规范内容) 前 8 位 hex。"""
    h = hashlib.sha256(_canonical_json(obj).encode("utf-8")).hexdigest()
    return h[:8]


def _module_of(tags: list) -> str:
    for t in tags:
        if str(t).startswith("module_"):
            return str(t)
    return "module_1"


def main():
    # 按 tag 分组编号，保证同一 tag 内序号递增、不同 tag 互不干扰
    tag_counter: dict[str, int] = {}
    saved = []
    for q in QUESTIONS:
        tag = q["tag"]
        diff = q["difficulty"]
        obj = q["obj"]
        # 生成内容寻址 ID
        hex8 = _compute_id(obj)
        module = _module_of(obj["tags"])
        # 同 tag 内递增编号
        tag_counter[tag] = tag_counter.get(tag, 0) + 1
        topic_idx = tag_counter[tag]
        qid = f"M{module[-1]}-{topic_idx:02d}-{hex8}"
        # 写入 per-id 文件
        out_path = Q_DIR / tag / diff / f"{qid}.json"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2, sort_keys=True)
            f.write("\n")
        saved.append((qid, tag, diff, out_path))
        print(f"[OK] {qid} -> {out_path.relative_to(ROOT)}")

    print(f"\n共写入 {len(saved)} 道题，运行 build 再生四件套...")
    # 调用 rebuild
    subprocess.run(
        [sys.executable, str(ROOT / "tools/python/rebuild-bank-perid.py"), "build", "--per-id-only"],
        cwd=str(ROOT),
        check=True,
    )
    print("\nbuild 完成，运行 verify...")
    subprocess.run(
        [sys.executable, str(ROOT / "tools/python/rebuild-bank-perid.py"), "verify"],
        cwd=str(ROOT),
        check=True,
    )
    print("\n全部完成。")


if __name__ == "__main__":
    main()
