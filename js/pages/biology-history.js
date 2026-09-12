/**
 * ============================================================
 * BioQuest — 生物学史竖向时间轴
 * 基于陈阅增《普通生物学》覆盖细胞、遗传、分子、进化、
 * 微生物、植物、动物、生理、免疫、生态、发育与当代前沿
 * ============================================================
 */
(function (global) {
  'use strict';

  /**
   * 里程碑数据：按主题分类，按时间排序
   * 共 12 个主题、101 个关键事件
   */
  var CATEGORIES = [
    {
      id: 'cell',
      title: '细胞学说与显微世界',
      subtitle: '从一片软木切片开始，人类第一次看见生命的“房间”',
      items: [
        { year: 1665, title: '胡克发现细胞', detail: '罗伯特·胡克用自制显微镜观察软木塞切片，看到一个个小室，称之为“cell”。这是人类第一次用“细胞”描述生命结构。' },
        { year: 1674, title: '列文虎克观察活细胞', detail: '安东尼·范·列文虎克用单透镜显微镜观察到细菌、精子、红细胞等活细胞，打开微生物世界的大门。' },
        { year: 1838, title: '施莱登提出植物细胞学说', detail: '德国植物学家施莱登认为所有植物都由细胞构成。次年施旺把结论推广到动物界，细胞学说正式建立。' },
        { year: 1858, title: '魏尔肖补充细胞学说', detail: '魏尔肖提出“所有细胞来自细胞”，完善了细胞学说，否定自然发生说。' },
        { year: 1879, title: '弗莱明发现染色体', detail: '弗莱明在细胞分裂时观察到可被碱性染料着色的丝状结构，命名为染色体。' },
        { year: 1898, title: '高尔基发现高尔基体', detail: '卡米洛·高尔基用银染法在神经元中发现高尔基体，揭示细胞内复杂的膜系统。' },
        { year: 1952, title: '电子显微镜揭示细胞超微结构', detail: '透射电子显微镜普及，线粒体、内质网、核糖体等细胞器被清晰成像，细胞生物学进入超微时代。' },
        { year: 1981, title: '扫描隧道显微镜观察原子', detail: '宾宁与罗雷尔发明扫描隧道显微镜，使人类首次能在原子尺度观察生物大分子表面。' }
      ]
    },
    {
      id: 'genetics',
      title: '遗传规律与染色体',
      subtitle: '豌豆、果蝇和细菌，一步步把“遗传”拆成可验证的规律',
      items: [
        { year: 1865, title: '孟德尔发表遗传定律', detail: '孟德尔通过豌豆杂交实验总结出分离定律和自由组合定律。论文沉寂三十五年后才被重新发现。' },
        { year: 1900, title: '孟德尔定律重新发现', detail: '德弗里斯、科伦斯和切尔马克分别独立重现实验结果，孟德尔定律终于被学界正视。' },
        { year: 1902, title: '萨顿—博韦里染色体学说', detail: '萨顿和博韦里独立发现染色体行为与孟德尔遗传因子平行，提出基因位于染色体上。' },
        { year: 1909, title: '约翰逊命名“基因”', detail: '丹麦遗传学家约翰逊提出 gene、genotype、phenotype 等概念，让遗传学研究有了统一语言。' },
        { year: 1910, title: '摩尔根证明基因在染色体上', detail: '摩尔根用果蝇白眼突变实验，证明特定基因位于特定染色体上，并发现基因的连锁与互换。' },
        { year: 1911, title: '第一张基因连锁图', detail: '摩尔根实验室绘制出果蝇基因在染色体上的相对位置图，奠定细胞遗传学基础。' },
        { year: 1927, title: '缪勒发现X射线诱导突变', detail: '赫尔曼·缪勒证明X射线能显著提高果蝇突变率，开创人工诱变与辐射遗传学。' },
        { year: 1944, title: '艾弗里证明DNA是遗传物质', detail: '艾弗里团队提纯S型细菌的DNA，证明正是DNA引起R型细菌转化，直接挑战“蛋白质是遗传物质”的观点。' },
        { year: 1952, title: '赫尔希—蔡斯实验', detail: '用放射性同位素标记噬菌体的DNA和蛋白质，证明进入细菌内部的是DNA，进一步确认DNA是遗传物质。' }
      ]
    },
    {
      id: 'molecular',
      title: '分子生物学时代',
      subtitle: '双螺旋解开之后，生命密码被一句句读出来',
      items: [
        { year: 1953, title: 'DNA双螺旋结构模型', detail: '沃森和克里克根据富兰克林的X射线衍射照片，提出DNA双螺旋结构模型，解释了遗传信息的复制方式。' },
        { year: 1956, title: 'DNA聚合酶发现', detail: '科恩伯格等发现DNA聚合酶I，揭示了DNA复制的酶学基础。' },
        { year: 1958, title: '梅塞尔森—斯塔尔实验', detail: '用氮同位素标记证明DNA复制为半保留复制，支持双螺旋模型的预测。' },
        { year: 1961, title: '遗传密码的阅读方式', detail: '克里克等用T4噬菌体实验证明遗传密码以三个碱基为一组读取，即三联体密码子。' },
        { year: 1966, title: '遗传密码表破译完成', detail: '尼伦伯格、科拉纳等科学家破译了64个密码子对应的氨基酸，生命的“字母表”被完整列出。' },
        { year: 1970, title: '逆转录酶发现', detail: '特明和巴尔的摩分别发现逆转录酶，揭示RNA病毒可通过逆转录生成DNA，补充中心法则。' },
        { year: 1973, title: '基因工程诞生', detail: '科恩和博耶首次实现DNA重组并在大肠杆菌中表达，标志着基因工程技术正式起步。' },
        { year: 1977, title: '桑格DNA测序法', detail: '弗雷德里克·桑格建立双脱氧链终止测序法，开启大规模DNA测序时代。' },
        { year: 1982, title: '切赫发现核酶', detail: '切赫证明某些RNA分子具有催化功能，打破“酶都是蛋白质”的传统观念，为RNA世界假说提供支持。' },
        { year: 1985, title: 'PCR技术发明', detail: '穆利斯发明聚合酶链式反应，让微量DNA在体外快速扩增，成为分子生物学和刑侦鉴定的核心技术。' }
      ]
    },
    {
      id: 'evolution',
      title: '进化与系统发生',
      subtitle: '从共同祖先到生命之树，演化思想重塑人类对自身的理解',
      items: [
        { year: 1735, title: '林奈建立生物命名体系', detail: '林奈发表《自然系统》，创立双名法和阶层分类系统，为生物多样性研究奠定基础。' },
        { year: 1809, title: '拉马克提出用进废退', detail: '拉马克在《动物学哲学》中提出获得性遗传和用进废退学说，首次系统尝试解释生物演化。' },
        { year: 1859, title: '达尔文发表《物种起源》', detail: '达尔文提出自然选择学说，用共同祖先和渐变演化解释生物多样性，深刻影响现代生物学。' },
        { year: 1866, title: '海克尔提出生物发生律', detail: '海克尔提出“个体发育重演系统发育”，虽后被修正，但推动了比较胚胎学和进化研究。' },
        { year: 1908, title: '哈迪—温伯格定律', detail: '哈迪和温伯格独立证明理想群体中基因频率保持平衡，奠定群体遗传学数学基础。' },
        { year: 1930, title: '现代综合进化论', detail: '费希尔、霍尔丹、赖特等将孟德尔遗传学与达尔文自然选择结合，形成现代综合进化论。' },
        { year: 1953, title: '米勒—尤里实验', detail: '米勒和尤里在模拟早期地球大气条件下合成氨基酸，为生命起源化学进化提供实验证据。' },
        { year: 1977, title: '伍斯提出三域系统', detail: '卡尔·伍斯根据16S rRNA序列将生命划分为细菌、古菌和真核生物三域，改写生命之树。' }
      ]
    },
    {
      id: 'microbiology',
      title: '微生物学',
      subtitle: '看不见的世界却主宰着物质循环、疾病与健康',
      items: [
        { year: 1676, title: '列文虎克发现细菌', detail: '列文虎克在牙垢等样本中首次观察到细菌，被称为微生物学之父。' },
        { year: 1857, title: '巴斯德证明乳酸发酵由微生物引起', detail: '巴斯德通过曲颈瓶和发酵实验证明微生物参与发酵，否定自然发生说。' },
        { year: 1861, title: '巴斯德反驳自然发生说', detail: '鹅颈瓶实验证明空气中微生物导致腐败，奠定微生物学和无菌技术基础。' },
        { year: 1864, title: '巴氏消毒法问世', detail: '巴斯德发明低温加热杀菌法，广泛应用于葡萄酒、牛奶保存。' },
        { year: 1876, title: '科赫提出病原菌法则', detail: '罗伯特·科赫建立确定病原微生物的科赫法则，并分离出炭疽杆菌。' },
        { year: 1928, title: '弗莱明发现青霉素', detail: '亚历山大·弗莱明发现青霉菌抑制细菌生长，开启抗生素时代。' },
        { year: 1943, title: '链霉素发现', detail: '瓦克斯曼实验室发现链霉素，第一种有效治疗结核病的抗生素。' },
        { year: 1995, title: '流感嗜血杆菌全基因组测序', detail: '首个自由生活的细菌全基因组被破译，微生物学研究进入基因组时代。' }
      ]
    },
    {
      id: 'plant',
      title: '植物学与光合作用',
      subtitle: '绿色植物把光能锁进化学键，撑起整个生物圈的基石',
      items: [
        { year: 1779, title: '英格豪斯发现植物需要光', detail: '英格豪斯证明只有绿色叶片在光下才能净化空气，指出光对植物的重要性。' },
        { year: 1864, title: '萨克斯证明光合作用产生淀粉', detail: '萨克斯用半叶法实验证明光合作用产物为淀粉，且需要光。' },
        { year: 1880, title: '达尔文父子研究植物向光性', detail: '达尔文用金丝雀虉草做实验，发现胚芽鞘尖端是感受光刺激的部位。' },
        { year: 1928, title: '温特发现生长素', detail: '温特从燕麦胚芽鞘尖端分离出可促进生长的物质，命名为生长素。' },
        { year: 1937, title: '希尔反应', detail: '罗伯特·希尔证明离体叶绿体在光下可分解水并释放氧气，揭示光合作用的光反应。' },
        { year: 1941, title: '鲁本和卡门同位素标记', detail: '用¹⁸O标记水证明光合作用释放的氧气全部来自水，而非二氧化碳。' },
        { year: 1954, title: '卡尔文循环阐明', detail: '卡尔文用¹⁴C标记追踪CO₂固定路径，阐明光合作用暗反应的C₃循环。' },
        { year: 2004, title: '光系统II晶体结构解析', detail: '科学家解析光系统II三维结构，揭示水光解产氧的分子机制。' }
      ]
    },
    {
      id: 'animal',
      title: '动物学与生理学',
      subtitle: '从血液循环到能量代谢，认识动物体的运转机制',
      items: [
        { year: 1628, title: '哈维阐明血液循环', detail: '威廉·哈维通过解剖和推理证明血液在体内循环流动，由心脏泵出。' },
        { year: 1661, title: '马尔皮基发现毛细血管', detail: '马尔皮基用显微镜观察到青蛙肺中的毛细血管，连接动脉与静脉。' },
        { year: 1771, title: '普里斯特利发现氧气与植物', detail: '普里斯特利发现植物能“恢复”被蜡烛燃烧消耗的空气，为光合作用研究奠基。' },
        { year: 1856, title: '贝尔纳提出内环境概念', detail: '克劳德·贝尔纳提出内环境恒定是生命的必要条件，开创生理学稳态思想。' },
        { year: 1889, title: '巴甫洛夫发现条件反射', detail: '巴甫洛夫通过狗的消化实验发现条件反射，揭示神经系统对消化的调控。' },
        { year: 1902, title: '斯他林和贝利斯发现激素', detail: '斯他林和贝利斯发现促胰液素，提出“激素”概念，开创内分泌学。' },
        { year: 1921, title: '班廷发现胰岛素', detail: '班廷和贝斯特从狗胰腺中提取胰岛素，挽救糖尿病患者的生命。' },
        { year: 1937, title: '克雷布斯阐明三羧酸循环', detail: '克雷布斯提出三羧酸循环，揭示有氧呼吸中乙酰辅酶A的氧化途径。' },
        { year: 1953, title: '沃森—克里克提出DNA双螺旋', detail: '这一发现同样深刻影响动物遗传与发育研究，开启分子生理学时代。' }
      ]
    },
    {
      id: 'immune',
      title: '免疫学与医学',
      subtitle: '从种痘到单抗，人类学会调动自身防御对抗疾病',
      items: [
        { year: 1796, title: '詹纳发明牛痘接种', detail: '爱德华·詹纳用牛痘预防天花，开创疫苗接种先河，最终使天花被根除。' },
        { year: 1882, title: '科赫发现结核杆菌', detail: '科赫分离出结核分枝杆菌，并研制出结核菌素，推动传染病病原学。' },
        { year: 1885, title: '巴斯德狂犬病疫苗', detail: '巴斯德开发减毒狂犬病疫苗，并成功用于被咬伤者，奠定现代疫苗学。' },
        { year: 1901, title: '兰德斯泰纳发现ABO血型', detail: '兰德斯泰纳发现人类红细胞ABO血型系统，使安全输血成为可能。' },
        { year: 1954, title: '首例成功肾移植', detail: '默里完成同卵双胞胎间肾移植，开启现代器官移植医学。' },
        { year: 1975, title: '杂交瘤技术制备单克隆抗体', detail: '科勒和米尔斯坦建立杂交瘤技术，实现单抗的规模化生产。' },
        { year: 1983, title: 'HIV发现', detail: '法国和美国科学家分别分离出人类免疫缺陷病毒，揭示艾滋病病因。' },
        { year: 2020, title: 'mRNA新冠疫苗获批', detail: '辉瑞-BioNTech和Moderna的mRNA疫苗在新冠疫情中快速上市，展示mRNA技术的巨大潜力。' }
      ]
    },
    {
      id: 'neuro',
      title: '神经科学与内分泌',
      subtitle: '电信号与化学信号交织，构成生命最复杂的信息网络',
      items: [
        { year: 1780, title: '伽伐尼研究神经电', detail: '伽伐尼用青蛙腿实验证明生物电存在，开启神经电生理研究。' },
        { year: 1873, title: '高尔基发明神经染色法', detail: '高尔基染色法使单个神经元形态清晰可见，推动神经系统研究。' },
        { year: 1906, title: '神经元学说确立', detail: '卡哈尔和高尔基共享诺贝尔奖，神经元学说取代网状学说。' },
        { year: 1921, title: '勒维证明神经递质', detail: '奥托·勒维通过蛙心灌流实验证明神经通过化学物质传递信号。' },
        { year: 1952, title: '霍奇金—赫胥黎动作电位模型', detail: '用乌贼巨大轴突建立离子通道数学模型，解释动作电位产生机制。' },
        { year: 1963, title: '斯佩里裂脑研究', detail: '斯佩里通过裂脑人研究揭示大脑两半球功能分工。' },
        { year: 1987, title: '阿尔茨海默病淀粉样蛋白假说', detail: '科学家发现β-淀粉样蛋白与阿尔茨海默病密切相关，推动神经退行性疾病研究。' },
        { year: 2012, title: '光遗传学应用成熟', detail: '科学家用光控离子蛋白精准操控神经元活动，推动脑功能解析。' }
      ]
    },
    {
      id: 'ecology',
      title: '生态学与环境科学',
      subtitle: '个体、种群、群落与生态系统，生命在大尺度上编织网络',
      items: [
        { year: 1866, title: '海克尔提出“生态学”', detail: '海克尔首次使用“oekologie”一词，定义为研究生物与环境关系的科学。' },
        { year: 1869, title: '华莱士生物地理学', detail: '华莱士划分东洋区和澳洲区，推动生物地理学和岛屿生物地理学发展。' },
        { year: 1927, title: '埃尔顿提出食物链与生态位', detail: '埃尔顿建立食物链、生态金字塔和生态位概念，奠定群落生态学基础。' },
        { year: 1935, title: '坦斯利提出生态系统', detail: '坦斯利正式提出“生态系统”概念，强调生物群落与环境的统一整体。' },
        { year: 1942, title: '林德曼十分之一定律', detail: '林德曼通过塞达波格湖研究提出能量在营养级间传递效率约10%。' },
        { year: 1962, title: '《寂静的春天》出版', detail: '蕾切尔·卡森揭示DDT等农药危害，推动现代环境运动。' },
        { year: 1972, title: '《增长的极限》发布', detail: '罗马俱乐部报告用系统动力学模型警示人口、资源与环境危机。' },
        { year: 1992, title: '里约地球峰会', detail: '联合国环境与发展大会通过《生物多样性公约》和《21世纪议程》。' }
      ]
    },
    {
      id: 'development',
      title: '发育生物学与干细胞',
      subtitle: '从受精卵到完整个体，发育的每一步都藏着调控的奥秘',
      items: [
        { year: 1888, title: '鲁提出胚胎诱导', detail: '威廉·鲁发现胚胎细胞可被诱导改变发育命运，提出胚胎诱导概念。' },
        { year: 1892, title: '杜里舒海胆实验', detail: '杜里舒证明海胆早期卵裂球具有调整发育能力，反对严格的镶嵌式发育。' },
        { year: 1901, title: '斯佩曼发现组织者', detail: '斯佩曼发现两栖动物胚孔背唇具有“组织者”作用，能诱导神经管形成。' },
        { year: 1924, title: '施佩曼—曼戈尔德组织者移植', detail: '将蝾螈胚孔背唇移植到另一胚胎，诱导出第二个体轴，证实组织者效应。' },
        { year: 1952, title: '沃丁顿提出表观遗传学', detail: '沃丁顿用“表观遗传景观”描述发育中的基因调控网络。' },
        { year: 1961, title: '雅各布—莫诺操纵子模型', detail: '雅各布和莫诺提出乳糖操纵子模型，解释基因表达调控机制。' },
        { year: 1996, title: '体细胞核移植克隆多利羊', detail: '威尔穆特团队证明成年哺乳动物体细胞核可恢复全能性。' },
        { year: 2006, title: '诱导多能干细胞(iPSC)', detail: '山中伸弥用四个转录因子将体细胞重编程为iPSC，开创再生医学新方向。' }
      ]
    },
    {
      id: 'frontier',
      title: '当代前沿',
      subtitle: '基因组、合成生物学与人工智能正在重新定义生命科学',
      items: [
        { year: 1990, title: '人类基因组计划启动', detail: '美、英、日、法、德、中六国共同参与，目标是测定人类24条染色体上约30亿个碱基序列。' },
        { year: 1996, title: '多利羊克隆成功', detail: '威尔穆特团队用体细胞核移植技术诞生多利羊，首次证明成年哺乳动物体细胞仍可恢复全能性。' },
        { year: 2003, title: '人类基因组计划完成', detail: '人类基因组精细图绘制完成，为疾病基因定位、个性化医疗和进化研究提供基础数据。' },
        { year: 2012, title: 'CRISPR-Cas9基因编辑', detail: '杜德纳和夏彭蒂耶将细菌的免疫机制改造为可编程基因编辑工具，让精准、低成本的基因编辑成为现实。' },
        { year: 2015, title: '基因驱动技术提出', detail: '科学家利用CRISPR构建基因驱动系统，可快速在种群中传播特定基因，用于病媒控制。' },
        { year: 2016, title: '合成酵母基因组计划', detail: '国际团队成功合成酵母部分染色体，向人工合成真核生物基因组迈进。' },
        { year: 2021, title: 'AlphaFold2预测蛋白质结构', detail: 'DeepMind的AI系统在CASP14上达到实验级精度，随后公开数亿种蛋白质结构，深刻影响结构生物学。' },
        { year: 2022, title: '首个完整人类基因组序列', detail: '端粒到端粒(T2T)联盟发布首个无缺口的人类基因组参考序列，补齐最后的着丝粒和重复区域。' }
      ]
    }
  ];

  var escapeHtml = window.escapeHtml;

  function renderTimeline(container) {
    if (!container) return;

    var target = container.querySelector('.biology-history-vertical') || container;
    target.innerHTML = CATEGORIES.map(function (category) {
      return (
        '<section class="bio-history-category" id="bio-history-' + category.id + '" data-category="' + category.id + '">' +
          '<div class="bio-history-category-header">' +
            '<h3 class="bio-history-category-title">' + escapeHtml(category.title) + '</h3>' +
            '<p class="bio-history-category-subtitle">' + escapeHtml(category.subtitle) + '</p>' +
          '</div>' +
          '<div class="bio-history-timeline">' +
            category.items.map(function (item, index) {
              return (
                '<article class="bio-history-event" data-index="' + index + '" tabindex="0" role="listitem">' +
                  '<div class="bio-history-year-badge" aria-hidden="true">' + item.year + '</div>' +
                  '<div class="bio-history-line" aria-hidden="true"></div>' +
                  '<div class="bio-history-card">' +
                    '<div class="bio-history-card-year">' + item.year + '</div>' +
                    '<h4 class="bio-history-card-title">' + escapeHtml(item.title) + '</h4>' +
                    '<p class="bio-history-card-detail">' + escapeHtml(item.detail) + '</p>' +
                  '</div>' +
                '</article>'
              );
            }).join('') +
          '</div>' +
        '</section>'
      );
    }).join('');
  }

  function renderToc(container) {
    var tocInner = document.getElementById('bioHistoryTocInner');
    if (!tocInner) return;

    tocInner.innerHTML = '<span class="bio-history-toc-label">快速跳转：</span>' +
      CATEGORIES.map(function (category) {
        return '<a href="#bio-history-' + category.id + '" data-toc="' + category.id + '">' + escapeHtml(category.title) + '</a>';
      }).join('');

    var links = Array.prototype.slice.call(tocInner.querySelectorAll('a[data-toc]'));
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var targetId = link.getAttribute('href').slice(1);
        var target = document.getElementById(targetId);
        if (target) {
          var headerOffset = 120;
          var top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
          window.scrollTo({ top: top, behavior: 'smooth' });
          links.forEach(function (l) { l.classList.remove('active'); });
          link.classList.add('active');
        }
      });
    });
  }

  function observeActiveCategory(container) {
    var categories = Array.prototype.slice.call(container.querySelectorAll('.bio-history-category'));
    var links = Array.prototype.slice.call(document.querySelectorAll('#bioHistoryTocInner a[data-toc]'));
    if (!categories.length || !links.length) return;

    function updateActive() {
      var scrollPos = window.pageYOffset + 160;
      var activeId = categories[0].id.replace('bio-history-', '');
      categories.forEach(function (cat) {
        if (cat.offsetTop <= scrollPos) {
          activeId = cat.id.replace('bio-history-', '');
        }
      });
      links.forEach(function (link) {
        if (link.getAttribute('data-toc') === activeId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          updateActive();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    updateActive();
  }

  function attachInteractions(container) {
    var events = Array.prototype.slice.call(container.querySelectorAll('.bio-history-event'));
    events.forEach(function (eventEl) {
      eventEl.addEventListener('click', function () {
        eventEl.classList.toggle('bio-history-event--expanded');
      });
    });
  }

  function observeEntrance(container) {
    var categories = Array.prototype.slice.call(container.querySelectorAll('.bio-history-category'));
    var events = Array.prototype.slice.call(container.querySelectorAll('.bio-history-event'));

    if (typeof IntersectionObserver === 'undefined') {
      categories.forEach(function (el) { el.classList.add('is-visible'); });
      events.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    categories.forEach(function (el) { observer.observe(el); });
    events.forEach(function (el) { observer.observe(el); });
  }

  function initBiologyTimeline(container) {
    if (!container) return;
    renderTimeline(container);
    renderToc(container);
    attachInteractions(container);
    observeEntrance(container);
    observeActiveCategory(container);
  }

  global.initBiologyTimeline = initBiologyTimeline;
})(window);
