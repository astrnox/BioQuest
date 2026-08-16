/**
 * BioQuest 生物联赛考点 Schema —— 单一数据源（Single Source of Truth）
 *
 * 本文件同时驱动：
 *   1. 知识图谱节点（data/knowledge-graph.json 由 generate 脚本据此生成）
 *   2. 题库分片 tag（manifest/index/bank 三层分片的 <tag> 即考点 id）
 *   3. 题目归类（keywords 关键词匹配 concept/题干）
 *
 * 设计约束（苛刻审查项）：
 *   - 覆盖 CBO/全国中学生生物学联赛 12 大考纲板块，每板块 6~7 个代表性考点；
 *   - 节点总数 70~80（本 schema 为 80），每个考点有明确描述且可落地映射题目；
 *   - 每考点 keywords 需能命中题库真实 concept（见 scripts/verify-bio-shards.js 的
 *     “考点覆盖校验”：每考点至少命中 1 题、每道已分类题归属唯一考点）；
 *   - edges 表达知识关联（学科内包含/递进 + 跨学科交叉）。
 *
 * 修改提示：改本文件后必须重新运行
 *   node scripts/generate-bio-shards.js   （重生成分片 + 知识图谱）
 *   node scripts/verify-bio-shards.js     （全量校验）
 */

'use strict';

/**
 * 学科分类（knowledge-graph.js CATEGORY_COLORS 需同步扩展配色）。
 * 顺序即图谱中学科展示顺序。
 */
const CATEGORIES = [
  '细胞生物学',
  '分子生物学',
  '生物化学',
  '植物学',
  '植物生理学',
  '微生物学',
  '动物学',
  '动物生理学',
  '遗传学',
  '演化生物学',
  '生态学',
  '生物信息学',
  '生物技术'
];

/**
 * 考点定义。
 * @typedef {Object} Topic
 * @property {string} id            考点 id（= 分片 tag 前缀）
 * @property {string} label         中文显示名
 * @property {string} category      学科分类（见 CATEGORIES）
 * @property {string} description   描述
 * @property {string} relatedModule 关联练习模块（module1~4）
 * @property {string[]} keywords    归类关键词（匹配 concept / 题干）
 */
const TOPICS = [
  /* ============ 细胞生物学（7） ============ */
  { id: 'cell_structure', label: '细胞结构', category: '细胞生物学', relatedModule: 'module1',
    description: '原核/真核细胞结构比较、细胞膜与细胞壁、细胞骨架、内膜系统',
    keywords: ['细胞结构', '原核细胞', '真核细胞', '细胞壁', '细胞骨架', '内膜系统', '细胞学说'] },
  { id: 'cell_membrane', label: '细胞膜与物质运输', category: '细胞生物学', relatedModule: 'module1',
    description: '流动镶嵌模型、膜蛋白、物质跨膜运输（被动/主动/胞吞胞吐）、质壁分离',
    keywords: ['细胞膜', '跨膜运输', '物质运输', '膜转运', '质壁分离', '渗透', '膜蛋白', '流动镶嵌'] },
  { id: 'organelle', label: '细胞器', category: '细胞生物学', relatedModule: 'module1',
    description: '线粒体、叶绿体、内质网、高尔基体、溶酶体等细胞器结构与功能',
    keywords: ['细胞器', '线粒体', '叶绿体', '内质网', '高尔基体', '溶酶体', '核糖体', '中心体', '液泡', '细胞器功能'] },
  { id: 'cell_cycle', label: '细胞周期与分裂', category: '细胞生物学', relatedModule: 'module1',
    description: '细胞周期、有丝分裂、减数分裂、CDK调控、接触抑制',
    keywords: ['细胞周期', '有丝分裂', '减数分裂', 'CDK', '细胞分裂', '细胞增殖', '接触抑制'] },
  { id: 'cell_signal', label: '细胞信号转导', category: '细胞生物学', relatedModule: 'module1',
    description: '受体、第二信使、信号级联、G蛋白偶联受体、MAPK、钙信号',
    keywords: ['信号转导', '信号通路', '信号传导', '受体', '第二信使', 'GPCR', '钙信号', '级联'] },
  { id: 'cell_death', label: '细胞凋亡与死亡', category: '细胞生物学', relatedModule: 'module1',
    description: '细胞凋亡、程序性坏死、自噬、Caspase、p53 调控',
    keywords: ['凋亡', '程序性坏死', '自噬', 'Caspase', 'p53', '细胞死亡', '坏死'] },
  { id: 'cell_metabolism', label: '细胞代谢与能量', category: '细胞生物学', relatedModule: 'module1',
    description: '细胞代谢网络、线粒体呼吸、ATP、代谢区室化、有氧呼吸',
    keywords: ['细胞代谢', '线粒体呼吸', '有氧呼吸', 'ATP', '代谢区室化', '能量代谢'] },

  /* ============ 分子生物学（7） ============ */
  { id: 'dna_structure', label: 'DNA 结构', category: '分子生物学', relatedModule: 'module1',
    description: '双螺旋结构、碱基配对、Chargaff 法则、超螺旋与拓扑异构酶',
    keywords: ['DNA 结构', 'DNA结构', 'DNA 超螺旋', '拓扑异构', '碱基配对', 'Chargaff', '双螺旋'] },
  { id: 'replication', label: 'DNA 复制', category: '分子生物学', relatedModule: 'module1',
    description: '半保留复制、复制叉、引物酶、DNA聚合酶、冈崎片段、端粒',
    keywords: ['复制', 'DNA聚合', '冈崎', '半保留', '端粒', '复制叉'] },
  { id: 'transcription', label: '转录与加工', category: '分子生物学', relatedModule: 'module1',
    description: 'RNA聚合酶、启动子、转录因子、mRNA加工、RNA聚合、转录终止',
    keywords: ['转录', 'RNA聚合', '启动子', 'mRNA加工', '剪接', 'RNA加工', '转录起始', '转录终止'] },
  { id: 'translation', label: '翻译', category: '分子生物学', relatedModule: 'module1',
    description: '核糖体、tRNA、密码子、翻译起始延伸终止、共翻译转运',
    keywords: ['翻译', '核糖体', 'tRNA', '密码子', '共翻译转运', '蛋白合成', '蛋白质合成'] },
  { id: 'gene_regulation', label: '基因表达调控', category: '分子生物学', relatedModule: 'module1',
    description: '操纵子模型、转录因子、表观遗传、miRNA、增强子、染色质修饰',
    keywords: ['表达调控', '操纵子', '转录因子', '表观遗传', 'miRNA', '增强子', '染色质修饰', '甲基化'] },
  { id: 'molecular_tech', label: '分子生物学技术', category: '分子生物学', relatedModule: 'module1',
    description: 'PCR、分子克隆、基因编辑(CRISPR)、重组、电泳、分子生物学实验',
    keywords: ['PCR', '分子克隆', '基因编辑', 'CRISPR', '重组', '电泳', '实验技术', '克隆'] },
  { id: 'rna_biology', label: 'RNA 生物学', category: '分子生物学', relatedModule: 'module1',
    description: 'RNA干扰、RNA编辑、miRNA、sRNA、RNA聚合相关调控',
    keywords: ['RNA干扰', 'RNA编辑', 'miRNA', 'RNAi', 'RNA聚合', 'sRNA'] },

  /* ============ 生物化学（7） ============ */
  { id: 'enzyme', label: '酶学', category: '生物化学', relatedModule: 'module1',
    description: '酶催化机制、米氏动力学、别构调控、竞争性抑制、酶活性',
    keywords: ['酶', '米氏', '动力学', '别构', '竞争性抑制', '酶活性', '酶催化', '辅酶', '维生素'] },
  { id: 'glycolysis', label: '糖酵解与糖代谢', category: '生物化学', relatedModule: 'module1',
    description: '糖酵解、糖原代谢、糖异生、戊糖磷酸途径、糖代谢调控',
    keywords: ['糖酵解', '糖代谢', '糖原', '糖异生', '戊糖磷酸'] },
  { id: 'krebs_cycle', label: '三羧酸循环', category: '生物化学', relatedModule: 'module1',
    description: '柠檬酸/三羧酸循环、回补反应、代谢中间物',
    keywords: ['三羧酸循环', '柠檬酸循环', 'TCA', '回补'] },
  { id: 'oxidative_phos', label: '氧化磷酸化', category: '生物化学', relatedModule: 'module1',
    description: '电子传递链、化学渗透、ATP合酶、解偶联、P/O 比',
    keywords: ['氧化磷酸化', '电子传递链', 'ATP合酶', '化学渗透', '解偶联', '磷酸化'] },
  { id: 'lipid_metab', label: '脂类代谢', category: '生物化学', relatedModule: 'module1',
    description: '脂肪酸氧化、脂肪合成、脂类代谢、酮体',
    keywords: ['脂类', '脂肪酸', '脂肪', '脂质', '酮体', '脂肪合成'] },
  { id: 'amino_acid_metab', label: '氨基酸与蛋白质代谢', category: '生物化学', relatedModule: 'module1',
    description: '氨基酸代谢、尿素循环、转氨基、必需氨基酸、蛋白质折叠',
    keywords: ['氨基酸', '尿素循环', '转氨基', '蛋白质折叠', '蛋白质结构', '血红素'] },
  { id: 'nucleotide_metab', label: '核酸与核苷酸代谢', category: '生物化学', relatedModule: 'module1',
    description: '核酸结构、核苷酸代谢、核酸化学组成',
    keywords: ['核苷酸', '核酸结构', '核酸化学', '核酸合成'] },

  /* ============ 植物学（6） ============ */
  { id: 'plant_tissue', label: '植物组织与器官', category: '植物学', relatedModule: 'module2',
    description: '分生/保护/薄壁/输导组织、根茎叶结构、维管系统',
    keywords: ['组织', '根', '茎', '叶的结构', '维管', '器官', '分生组织'] },
  { id: 'plant_water_mineral', label: '植物水分与矿质', category: '植物学', relatedModule: 'module2',
    description: '水分代谢、蒸腾、矿质元素吸收与运输、矿质营养',
    keywords: ['水分', '蒸腾', '矿质', '吸收', '水分代谢', '矿质营养'] },
  { id: 'plant_repro', label: '植物生殖与发育', category: '植物学', relatedModule: 'module2',
    description: '花、种子与果实、胚与胚乳发育、世代交替、传粉',
    keywords: ['花', '种子', '果实', '胚', '胚乳', '世代交替', '传粉', '发育'] },
  { id: 'plant_classification', label: '植物分类与演化', category: '植物学', relatedModule: 'module2',
    description: '植物分类、系统演化、禾本科特征、植物演化',
    keywords: ['分类', '植物演化', '禾本科', '演化', '植物系统'] },
  { id: 'plant_hormone', label: '植物激素', category: '植物学', relatedModule: 'module2',
    description: '生长素、赤霉素、细胞分裂素、乙烯、脱落酸、信号转导',
    keywords: ['激素', '生长素', '赤霉素', '细胞分裂素', '乙烯', '脱落酸', '顶端优势'] },
  { id: 'plant_movement', label: '植物运动与感知', category: '植物学', relatedModule: 'module2',
    description: '向性运动、感性运动、光周期、气孔调控、植物运动与感知',
    keywords: ['向性', '运动', '光周期', '气孔', '感知', '光敏色素'] },

  /* ============ 植物生理学（6） ============ */
  { id: 'photosynthesis', label: '光合作用', category: '植物生理学', relatedModule: 'module2',
    description: '光反应与暗反应、光系统、Calvin循环、光合电子传递与磷酸化',
    keywords: ['光合', '光反应', '暗反应', 'Calvin', '光系统', '希尔', '电子传递'] },
  { id: 'photorespiration_c4', label: '光呼吸与 C4 途径', category: '植物生理学', relatedModule: 'module2',
    description: '光呼吸、C3/C4/CAM 植物、RuBisCO 调控、C4 碳同化',
    keywords: ['光呼吸', 'C4', 'CAM', 'RuBisCO', 'C3', '碳同化'] },
  { id: 'assimilate_transport', label: '光合产物运输', category: '植物生理学', relatedModule: 'module2',
    description: '同化物运输、韧皮部装载、源库关系',
    keywords: ['运输', '韧皮部', '同化物', '源库', '产物运输'] },
  { id: 'plant_nutrition', label: '植物营养与固氮', category: '植物生理学', relatedModule: 'module2',
    description: '氮代谢、固氮作用、矿质营养生理、共生固氮',
    keywords: ['氮代谢', '固氮', '营养', '氮'] },
  { id: 'plant_respiration', label: '植物呼吸作用', category: '植物生理学', relatedModule: 'module2',
    description: '植物呼吸、无氧呼吸、呼吸代谢',
    keywords: ['呼吸作用', '无氧呼吸', '呼吸'] },
  { id: 'plant_stress', label: '植物逆境生理', category: '植物生理学', relatedModule: 'module2',
    description: '盐胁迫、干旱、低温等逆境响应、活性氧、抗氧化',
    keywords: ['胁迫', '逆境', '盐', '干旱', '活性氧', '抗氧化', 'ABA'] },

  /* ============ 微生物学（6） ============ */
  { id: 'bacteria', label: '细菌', category: '微生物学', relatedModule: 'module2',
    description: '细菌形态结构、革兰氏染色、代谢多样性、细菌运动与转化',
    keywords: ['细菌', '革兰', '菌', '转化', '运动', '芽孢'] },
  { id: 'virus', label: '病毒与噬菌体', category: '微生物学', relatedModule: 'module2',
    description: '病毒结构、复制周期、溶原/溶菌、噬菌体',
    keywords: ['病毒', '噬菌体', '溶原', '溶菌', '毒'] },
  { id: 'microbial_genetics', label: '微生物遗传', category: '微生物学', relatedModule: 'module2',
    description: '细菌遗传系统、转座、质粒、微生物基因调控',
    keywords: ['微生物遗传', '遗传系统', '质粒', '转座', '微生物遗传'] },
  { id: 'microbial_metabolism', label: '微生物代谢与培养', category: '微生物学', relatedModule: 'module2',
    description: '微生物营养代谢、生长曲线、培养、发酵、极端微生物',
    keywords: ['微生物', '生长曲线', '培养', '发酵', '营养代谢', '极端'] },
  { id: 'microbial_eco', label: '微生物生态', category: '微生物学', relatedModule: 'module2',
    description: '微生物组、共生、化学自养、固氮微生物、微生物生态',
    keywords: ['微生物组', '共生', '自养', '微生态', '微生物生态'] },
  { id: 'antibiotics_resistance', label: '抗生素与耐药', category: '微生物学', relatedModule: 'module2',
    description: '抗生素作用机制、耐药性、耐药传播、抗菌药物',
    keywords: ['抗生素', '耐药', '抗菌', '药物'] },

  /* ============ 动物学（6） ============ */
  { id: 'animal_tissue', label: '动物组织与肌肉', category: '动物学', relatedModule: 'module3',
    description: '上皮/结缔/肌肉/神经组织、骨骼肌收缩与运动机制、器官系统组成',
    keywords: ['组织', '上皮', '结缔', '肌肉', '骨骼肌', '平滑肌', '心肌', '肌纤维', '肌动蛋白', '肌球蛋白', '肌丝', '收缩', '神经肌肉', '肌腱'] },
  { id: 'immune_system', label: '免疫系统', category: '动物学', relatedModule: 'module3',
    description: '固有免疫与适应性免疫、抗体、T/B细胞、补体、比较免疫学',
    keywords: ['免疫', '抗体', 'T细胞', 'B细胞', '补体', '先天免疫'] },
  { id: 'endocrine', label: '内分泌系统', category: '动物学', relatedModule: 'module3',
    description: '激素种类与作用、下丘脑-垂体轴、内分泌调控',
    keywords: ['内分泌', '激素', '垂体', '下丘脑'] },
  { id: 'circulatory', label: '循环系统', category: '动物学', relatedModule: 'module3',
    description: '心脏、血管、血液循环、凝血、血压调节',
    keywords: ['循环', '心脏', '血液', '凝血', '心血管', '血管'] },
  { id: 'excretory', label: '排泄与渗透调节', category: '动物学', relatedModule: 'module3',
    description: '肾脏/肾单位、泌尿系统、排泄与渗透调节、水生/陆生排泄',
    keywords: ['肾', '泌尿', '排泄', '渗透调节', '肾单位', '消化排泄'] },
  { id: 'animal_diversity', label: '动物分类与演化', category: '动物学', relatedModule: 'module3',
    description: '无脊椎/脊椎动物演化、分类特征、体腔演化、节肢动物',
    keywords: ['动物', '分类', '演化', '无脊椎', '脊椎', '节肢', '体腔', '脊索'] },

  /* ============ 动物生理学（7） ============ */
  { id: 'nervous_sys', label: '神经系统', category: '动物生理学', relatedModule: 'module3',
    description: '神经元、突触传递、反射、感觉生理、神经调节',
    keywords: ['神经', '突触', '反射', '感觉', '神经元', '听觉', '视觉'] },
  { id: 'homeostasis', label: '内环境与稳态', category: '动物生理学', relatedModule: 'module3',
    description: '内环境、体液调节、血糖/水盐/酸碱平衡、稳态调节',
    keywords: ['稳态', '内环境', '血糖', '水盐', '酸碱', '体液调节', '调节'] },
  { id: 'temperature_reg', label: '体温调节', category: '动物生理学', relatedModule: 'module3',
    description: '恒温/变温动物体温调节、产热散热、冬眠',
    keywords: ['体温', '产热', '散热', '变温', '恒温', '冬眠'] },
  { id: 'osmoregulation', label: '水盐平衡调节', category: '动物生理学', relatedModule: 'module3',
    description: '肾脏调节、渗透压调节、抗利尿激素、水平衡',
    keywords: ['水盐', '渗透压', '抗利尿', '水平衡', '盐平衡'] },
  { id: 'respiratory_sys', label: '呼吸与循环生理', category: '动物生理学', relatedModule: 'module3',
    description: '呼吸调控、气体运输(CO₂/O₂)、呼吸系统生理',
    keywords: ['呼吸调控', 'CO₂', '气体运输', '氧合', '呼吸'] },
  { id: 'digestive_sys', label: '消化与营养', category: '动物生理学', relatedModule: 'module3',
    description: '消化系统结构、消化液与消化酶、营养物质的吸收、胃肠激素',
    keywords: ['消化', '胃', '食道', '唾液', '消化道', '消化液', '消化酶', '胃蛋白酶', '胰液', '胆汁', '胃肠', '肠道', '小肠'] },
  { id: 'sensory_physio', label: '感觉与运动生理', category: '动物生理学', relatedModule: 'module3',
    description: '感觉生理、肌肉、内分泌与应激、激素分级调节',
    keywords: ['感觉', '应激', '激素分级', '内分泌', '行为'] },

  /* ============ 遗传学（7） ============ */
  { id: 'mendel', label: '孟德尔遗传', category: '遗传学', relatedModule: 'module4',
    description: '分离定律、自由组合、显隐性、基因互作、上位效应',
    keywords: ['孟德尔', '分离定律', '自由组合', '显性', '隐性', '基因互作', '上位'] },
  { id: 'linkage', label: '连锁与交换', category: '遗传学', relatedModule: 'module4',
    description: '连锁遗传、重组率、三点测交、基因定位、连锁分析',
    keywords: ['连锁', '交换', '重组率', '三点测交', '基因定位'] },
  { id: 'sex_linkage', label: '伴性遗传与性别决定', category: '遗传学', relatedModule: 'module4',
    description: 'X/Y连锁、剂量补偿、巴氏小体、性别决定、伴性遗传概率',
    keywords: ['伴性', '性连锁', '性别决定', '剂量补偿', 'X失活'] },
  { id: 'gene_mutation', label: '基因突变', category: '遗传学', relatedModule: 'module4',
    description: '碱基替换/移码、突变率与修复、基因突变机制',
    keywords: ['基因突变', '突变', '移码', '修复'] },
  { id: 'chromosome_var', label: '染色体变异', category: '遗传学', relatedModule: 'module4',
    description: '缺失/重复/倒位/易位、数目变异、多倍体、染色体变异',
    keywords: ['染色体', '倒位', '易位', '缺失', '重复', '多倍体'] },
  { id: 'population_gen', label: '群体遗传学', category: '遗传学', relatedModule: 'module4',
    description: 'Hardy-Weinberg平衡、遗传漂变、基因流、近交、选择',
    keywords: ['群体遗传', '哈迪', '温伯格', 'Hardy', '遗传漂变', '基因流', '近交', '平衡'] },
  { id: 'quantitative_gen', label: '数量遗传与分子标记', category: '遗传学', relatedModule: 'module4',
    description: '数量性状、遗传力、分子标记、基因芯片、遗传力',
    keywords: ['数量遗传', '遗传力', '分子标记', '基因芯片', 'QTL'] },

  /* ============ 演化生物学（6） ============ */
  { id: 'natural_selection', label: '自然选择与适应', category: '演化生物学', relatedModule: 'module4',
    description: '自然选择、适应、性选择、适应景观、选择压力检测',
    keywords: ['自然选择', '适应', '性选择', '选择压力', '适应度'] },
  { id: 'genetic_drift', label: '遗传漂变与中性进化', category: '演化生物学', relatedModule: 'module4',
    description: '遗传漂变、瓶颈效应、奠基者效应、中性学说、近中性理论',
    keywords: ['遗传漂变', '瓶颈', '奠基者', '中性', '近中性'] },
  { id: 'speciation', label: '物种形成', category: '演化生物学', relatedModule: 'module4',
    description: '物种形成机制、生殖隔离、多倍体成种、染色体倒位与物种形成',
    keywords: ['物种形成', '生殖隔离', '成种'] },
  { id: 'molecular_evo', label: '分子演化', category: '演化生物学', relatedModule: 'module4',
    description: '分子钟、同源基因、比较基因组、正选择检测、分子演化',
    keywords: ['分子演化', '分子钟', '同源基因', '比较基因组', '正选择'] },
  { id: 'phylogeny', label: '系统发育', category: '演化生物学', relatedModule: 'module4',
    description: '系统发育树、系统发育方法、聚类、长枝吸引',
    keywords: ['系统发育', '发育树', '支序', '长枝'] },
  { id: 'macroevolution', label: '大演化与生命起源', category: '演化生物学', relatedModule: 'module4',
    description: '间断平衡、集群灭绝、关键创新、生命起源、大演化',
    keywords: ['大演化', '间断平衡', '灭绝', '生命起源', '集群'] },

  /* ============ 生态学（7） ============ */
  { id: 'population_eco', label: '种群生态', category: '生态学', relatedModule: 'module3',
    description: '种群增长模型、逻辑斯谛、r/K选择、种群数量调节',
    keywords: ['种群', '增长模型', '逻辑斯谛', 'r-K', '密度调节'] },
  { id: 'community_eco', label: '群落生态', category: '生态学', relatedModule: 'module3',
    description: '种间关系、生态位、群落演替、群落结构、竞争排斥',
    keywords: ['群落', '种间关系', '生态位', '演替', '竞争排斥', '捕食'] },
  { id: 'ecosystem', label: '生态系统', category: '生态学', relatedModule: 'module3',
    description: '生态系统结构、能量流动、营养级、食物网',
    keywords: ['生态系统', '能量流动', '营养级', '食物网', '初级生产力', '食物链'] },
  { id: 'biogeochemical', label: '物质循环', category: '生态学', relatedModule: 'module3',
    description: '碳/氮/磷循环、水体富营养化、物质循环',
    keywords: ['物质循环', '碳循环', '氮循环', '富营养', '循环'] },
  { id: 'biodiversity', label: '生物多样性', category: '生态学', relatedModule: 'module3',
    description: '物种多样性测度、岛屿生物地理学、物种-面积关系、保护',
    keywords: ['多样性', '岛屿', '物种-面积', '保护', '测度'] },
  { id: 'animal_behavior', label: '动物行为学', category: '生态学', relatedModule: 'module3',
    description: '本能与学习行为、定向与通讯、领域与社会行为、行为适应与进化',
    keywords: ['行为', '本能', '学习行为', '印记', '求偶', '通讯', '社会行为', '趋性', '条件反射', '迁徙', '领域', '攻击行为'] },
  { id: 'behavioral_eco', label: '行为生态与生态应用', category: '生态学', relatedModule: 'module3',
    description: '动物行为生态、生态恢复、全球变化、景观生态、污染生态',
    keywords: ['生态恢复', '全球变化', '景观', '污染', '生态应用'] },

  /* ============ 生物信息学（6） ============ */
  { id: 'sequence_alignment', label: '序列比对', category: '生物信息学', relatedModule: 'module1',
    description: 'BLAST、序列比对、比对算法、同源检索',
    keywords: ['序列比对', 'BLAST', '比对', '同源'] },
  { id: 'sequencing_tech', label: '测序技术', category: '生物信息学', relatedModule: 'module1',
    description: '高通量测序、单细胞测序、宏基因组测序、测序技术',
    keywords: ['测序', '单细胞', '宏基因组', 'RNA-seq', 'ATAC-seq', 'ChIP-seq', 'Hi-C'] },
  { id: 'genome_assembly', label: '基因组组装与注释', category: '生物信息学', relatedModule: 'module1',
    description: '基因组组装、基因组注释、结构变异、功能基因组学',
    keywords: ['基因组组装', '组装', '注释', '基因组学'] },
  { id: 'transcriptomics', label: '转录组与表达分析', category: '生物信息学', relatedModule: 'module1',
    description: 'RNA-seq分析、基因表达聚类、共表达网络、差异表达',
    keywords: ['RNA-seq', '表达聚类', '共表达', '转录组', '差异表达'] },
  { id: 'genomics_comp', label: '比较与功能基因组', category: '生物信息学', relatedModule: 'module1',
    description: '比较基因组、GWAS、结构域、系统发生网络、功能基因组',
    keywords: ['比较基因组', 'GWAS', '结构域', '系统发生', '功能基因组'] },
  { id: 'bio_databases', label: '生物数据库与工具', category: '生物信息学', relatedModule: 'module1',
    description: '生物数据库、分子模拟、深度学习与生物学、生物信息工具',
    keywords: ['数据库', '分子模拟', '深度学习', '工具', '生物信息'] },

  /* ============ 生物技术（2） ============ */
  { id: 'genetic_engineering', label: '基因工程', category: '生物技术', relatedModule: 'module4',
    description: '基因工程操作、载体构建、转基因、目的基因表达',
    keywords: ['基因工程', '转基因', '载体', '农杆菌', '基因治疗'] },
  { id: 'plant_biotech', label: '植物生物技术', category: '生物技术', relatedModule: 'module4',
    description: '植物组织培养、全能性、植物转基因、育种技术',
    keywords: ['植物', '组织培养', '全能性', '育种', '农杆菌'] }
];

/**
 * 知识关联边（表达考点间关系）。
 * 类型说明：学科内递进/包含 + 跨学科交叉（如分子↔遗传、细胞代谢↔生化）。
 */
const EDGES = [
  /* ---- 细胞生物学：结构→功能递进 ---- */
  ['cell_structure', 'cell_membrane'],
  ['cell_structure', 'organelle'],
  ['cell_membrane', 'cell_signal'],
  ['organelle', 'cell_metabolism'],
  ['organelle', 'cell_cycle'],
  ['cell_cycle', 'cell_death'],
  ['cell_signal', 'cell_death'],
  ['cell_signal', 'nervous_sys'],
  ['cell_signal', 'endocrine'],
  /* ---- 分子生物学：中心法则主线 ---- */
  ['dna_structure', 'replication'],
  ['dna_structure', 'transcription'],
  ['replication', 'transcription'],
  ['transcription', 'translation'],
  ['transcription', 'rna_biology'],
  ['gene_regulation', 'transcription'],
  ['gene_regulation', 'rna_biology'],
  ['molecular_tech', 'replication'],
  ['molecular_tech', 'sequence_alignment'],
  ['dna_structure', 'nucleotide_metab'],
  /* ---- 生物化学：代谢主线 ---- */
  ['enzyme', 'glycolysis'],
  ['glycolysis', 'krebs_cycle'],
  ['krebs_cycle', 'oxidative_phos'],
  ['glycolysis', 'lipid_metab'],
  ['glycolysis', 'amino_acid_metab'],
  ['oxidative_phos', 'cell_metabolism'],
  ['enzyme', 'amino_acid_metab'],
  ['nucleotide_metab', 'replication'],
  /* ---- 植物学：结构→生理 ---- */
  ['plant_tissue', 'plant_water_mineral'],
  ['plant_tissue', 'plant_repro'],
  ['plant_repro', 'plant_classification'],
  ['plant_hormone', 'plant_movement'],
  ['plant_hormone', 'plant_stress'],
  ['plant_repro', 'cell_cycle'],
  /* ---- 植物生理学 ---- */
  ['plant_water_mineral', 'photosynthesis'],
  ['plant_tissue', 'photosynthesis'],
  ['photosynthesis', 'assimilate_transport'],
  ['photosynthesis', 'photorespiration_c4'],
  ['plant_nutrition', 'photosynthesis'],
  ['plant_nutrition', 'microbial_eco'],
  ['plant_stress', 'photosynthesis'],
  ['photosynthesis', 'oxidative_phos'],
  ['plant_respiration', 'glycolysis'],
  /* ---- 微生物学 ---- */
  ['bacteria', 'microbial_genetics'],
  ['bacteria', 'microbial_metabolism'],
  ['bacteria', 'microbial_eco'],
  ['virus', 'microbial_genetics'],
  ['virus', 'immune_system'],
  ['microbial_eco', 'plant_nutrition'],
  ['bacteria', 'antibiotics_resistance'],
  ['bacteria', 'cell_structure'],
  /* ---- 动物学：组织→系统 ---- */
  ['animal_tissue', 'immune_system'],
  ['animal_tissue', 'endocrine'],
  ['animal_tissue', 'circulatory'],
  ['animal_tissue', 'excretory'],
  ['animal_tissue', 'nervous_sys'],
  ['animal_tissue', 'animal_diversity'],
  ['circulatory', 'respiratory_sys'],
  ['excretory', 'osmoregulation'],
  ['animal_tissue', 'digestive_sys'],
  ['digestive_sys', 'excretory'],
  ['digestive_sys', 'homeostasis'],
  ['enzyme', 'digestive_sys'],
  ['digestive_sys', 'circulatory'],
  /* ---- 动物生理学 ---- */
  ['nervous_sys', 'sensory_physio'],
  ['nervous_sys', 'homeostasis'],
  ['endocrine', 'homeostasis'],
  ['endocrine', 'temperature_reg'],
  ['homeostasis', 'osmoregulation'],
  ['homeostasis', 'temperature_reg'],
  ['immune_system', 'sensory_physio'],
  /* ---- 遗传学 ---- */
  ['mendel', 'linkage'],
  ['mendel', 'sex_linkage'],
  ['linkage', 'gene_mutation'],
  ['linkage', 'chromosome_var'],
  ['gene_mutation', 'chromosome_var'],
  ['gene_mutation', 'population_gen'],
  ['population_gen', 'genetic_drift'],
  ['quantitative_gen', 'population_gen'],
  ['chromosome_var', 'speciation'],
  ['gene_mutation', 'molecular_tech'],
  ['mendel', 'translation'],
  /* ---- 演化生物学 ---- */
  ['natural_selection', 'genetic_drift'],
  ['natural_selection', 'speciation'],
  ['genetic_drift', 'molecular_evo'],
  ['molecular_evo', 'phylogeny'],
  ['phylogeny', 'genomics_comp'],
  ['speciation', 'macroevolution'],
  ['natural_selection', 'population_gen'],
  ['natural_selection', 'behavioral_eco'],
  /* ---- 生态学 ---- */
  ['population_eco', 'community_eco'],
  ['community_eco', 'ecosystem'],
  ['ecosystem', 'biogeochemical'],
  ['ecosystem', 'biodiversity'],
  ['population_eco', 'biodiversity'],
  ['animal_behavior', 'behavioral_eco'],
  ['animal_behavior', 'nervous_sys'],
  ['animal_behavior', 'natural_selection'],
  ['animal_behavior', 'population_eco'],
  ['community_eco', 'behavioral_eco'],
  ['behavioral_eco', 'animal_diversity'],
  ['biodiversity', 'plant_classification'],
  /* ---- 生物信息学 ---- */
  ['sequence_alignment', 'sequencing_tech'],
  ['sequencing_tech', 'genome_assembly'],
  ['sequencing_tech', 'transcriptomics'],
  ['genome_assembly', 'genomics_comp'],
  ['genomics_comp', 'phylogeny'],
  ['transcriptomics', 'bio_databases'],
  ['sequence_alignment', 'bio_databases'],
  ['sequencing_tech', 'molecular_tech'],
  /* ---- 生物技术 ---- */
  ['genetic_engineering', 'plant_biotech'],
  ['genetic_engineering', 'molecular_tech'],
  ['plant_biotech', 'plant_repro'],
  ['microbial_metabolism', 'genetic_engineering'],
  /* ---- 跨学科综合 ---- */
  ['cell_metabolism', 'oxidative_phos']
];

/** 校验 schema 内部一致性（加载即执行，错误直接抛出） */
function validateSchema() {
  const ids = new Set();
  for (const t of TOPICS) {
    if (!t.id || !t.label || !t.category || !t.relatedModule) {
      throw new Error('考点缺少必填字段: ' + JSON.stringify(t));
    }
    if (ids.has(t.id)) throw new Error('考点 id 重复: ' + t.id);
    ids.add(t.id);
    if (!Array.isArray(t.keywords) || t.keywords.length === 0) {
      throw new Error('考点缺少 keywords: ' + t.id);
    }
    if (!CATEGORIES.includes(t.category)) {
      throw new Error('考点 category 不在 CATEGORIES 中: ' + t.id + ' -> ' + t.category);
    }
  }
  for (const e of EDGES) {
    if (!ids.has(e[0]) || !ids.has(e[1])) {
      throw new Error('边引用了不存在的考点: ' + e[0] + ' -> ' + e[1]);
    }
    if (e[0] === e[1]) throw new Error('自环边: ' + e[0]);
  }
  const edgeSet = new Set();
  for (const e of EDGES) {
    const key = e[0] + '|' + e[1];
    if (edgeSet.has(key)) throw new Error('重复边: ' + key);
    edgeSet.add(key);
  }
  return { count: TOPICS.length, categories: CATEGORIES.length, edges: EDGES.length };
}

module.exports = { CATEGORIES, TOPICS, EDGES, validateSchema };

if (require.main === module) {
  const v = validateSchema();
  console.log('Schema 校验通过：节点', v.count, '学科', v.categories, '边', v.edges);
}
