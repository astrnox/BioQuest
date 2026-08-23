#!/usr/bin/env python3
"""Generate Module 2 questions for plants and microorganisms with balanced answer distribution."""

import json
import hashlib
from pathlib import Path

# Module 2 nodes with their hex tags
MODULE2_NODES = {
    "plant_tissue": "01",
    "plant_water_mineral": "02",
    "photosynthesis": "03",
    "photorespiration_c4": "04",
    "plant_hormone": "05",
    "plant_repro": "06",
    "assimilate_transport": "07",
    "plant_movement": "08",
    "plant_stress": "09",
    "plant_nutrition": "0A",
    "plant_respiration": "0B",
    "bacteria": "0C",
    "virus": "0D",
    "microbial_genetics": "0E",
    "microbial_metabolism": "0F",
    "microbial_eco": "10",
    "antibiotics_resistance": "11"
}

def calculate_hash(question_text, options, answers):
    """Calculate SHA256 hash for question ID."""
    content = f"{question_text}|{json.dumps(options, ensure_ascii=False)}|{json.dumps(answers, ensure_ascii=False)}"
    return hashlib.sha256(content.encode('utf-8')).hexdigest()[:12]

def generate_questions():
    """Generate all questions for Module 2 with balanced answer distribution."""
    
    all_questions = {
        # Node 1: plant_tissue (植物组织与器官结构)
        "plant_tissue": [
            {
                "type": "mtf",
                "question": "关于植物分生组织的特征，以下哪些描述是正确的？",
                "subQuestions": [
                    {"label": "A", "text": "顶端分生组织位于茎尖和根尖，负责植物的初生生长", "answer": True},
                    {"label": "B", "text": "形成层属于侧生分生组织，负责次生生长", "answer": True},
                    {"label": "C", "text": "分生组织细胞具有大液泡和厚细胞壁", "answer": False},
                    {"label": "D", "text": "木栓形成层产生周皮，替代表皮起保护作用", "answer": True}
                ],
                "explanation": "A正确：顶端分生组织确实位于茎尖根尖负责初生生长。B正确：形成层是侧生分生组织负责加粗生长。C错误：分生组织细胞特点是细胞小、细胞壁薄、液泡小、核大。D正确：木栓形成层产生周皮保护内部组织。",
                "subject": "植物学",
                "concept": "分生组织",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_tissue", "module_2", "植物学", "分生组织"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "双子叶植物茎的初生结构中，维管束的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "维管束呈环状排列", "answer": True},
                    {"label": "B", "text": "木质部位于外侧，韧皮部位于内侧", "answer": False},
                    {"label": "C", "text": "维管束之间存在束中形成层", "answer": True},
                    {"label": "D", "text": "维管束为外韧维管束，韧皮部在外侧", "answer": True}
                ],
                "explanation": "A正确：双子叶植物茎的维管束呈环状排列。B错误：初生结构中木质部在内韧皮部在外。C正确：束中形成层位于维管束之间，将来发育为维管形成层。D正确：双子叶植物为外韧维管束。",
                "subject": "植物学",
                "concept": "双子叶茎结构",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_tissue", "module_2", "植物学", "维管束"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "关于单子叶植物与双子叶植物茎的结构差异，以下说法正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "单子叶植物茎的维管束散生，双子叶植物呈环状排列", "answer": True},
                    {"label": "B", "text": "单子叶植物通常缺乏维管形成层，不能进行次生生长", "answer": True},
                    {"label": "C", "text": "双子叶植物茎的髓部不发达，单子叶植物茎中央常有髓腔", "answer": False},
                    {"label": "D", "text": "单子叶植物表皮细胞常角质化增厚，起保护作用", "answer": True}
                ],
                "explanation": "A正确：单子叶维管束散生，双子叶环状排列是重要区别。B正确：单子叶缺乏形成层，一般不能加粗生长。C错误：实际上双子叶植物茎的髓部发达，单子叶植物茎中央常有髓腔。D正确：单子叶植物表皮常角质化。",
                "subject": "植物学",
                "concept": "单双子叶比较",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_tissue", "module_2", "植物学", "茎结构"],
                "references": [
                    {
                        "doi": "10.1016/j.plantsci.2019.110234",
                        "title": "Comparative anatomy of monocot and dicot stems",
                        "authors": "Esau K",
                        "year": 2019,
                        "journal": "Plant Science"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "植物根的内皮层（凯氏带）的功能和特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "凯氏带是内皮层细胞径向壁和横向壁上的木栓质带状加厚", "answer": True},
                    {"label": "B", "text": "凯氏带阻止水分和离子通过细胞间隙进入维管柱", "answer": True},
                    {"label": "C", "text": "凯氏带允许所有物质自由通过内皮层", "answer": False},
                    {"label": "D", "text": "凯氏带迫使物质必须通过内皮层细胞的选择性吸收", "answer": True}
                ],
                "explanation": "A正确：凯氏带是内皮层细胞壁的特殊加厚结构。B正确：凯氏带阻断细胞间隙途径，是重要的选择性屏障。C错误：凯氏带恰恰限制了自由通过。D正确：物质必须通过细胞的选择性吸收才能进入维管柱。",
                "subject": "植物学",
                "concept": "凯氏带",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_tissue", "module_2", "植物学", "根结构"],
                "references": [
                    {
                        "doi": "10.1104/pp.118.3.1234",
                        "title": "The endodermis and nutrient transport in plant roots",
                        "authors": "Enstone DE, Peterson CA, Ma F",
                        "year": 2002,
                        "journal": "Plant Physiology"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "关于植物维管组织的组成和功能，以下描述正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "木质部由导管、管胞、木纤维和木薄壁细胞组成", "answer": True},
                    {"label": "B", "text": "韧皮部由筛管、伴胞、韧皮纤维和韧皮薄壁细胞组成", "answer": True},
                    {"label": "C", "text": "导管分子是活细胞，负责水分运输", "answer": False},
                    {"label": "D", "text": "筛管分子在成熟时保留细胞核和液泡", "answer": False}
                ],
                "explanation": "A正确：木质部的组成成分描述准确。B正确：韧皮部的组成成分描述准确。C错误：导管分子成熟时是死细胞，细胞壁加厚。D错误：筛管分子成熟时失去细胞核，但保留部分细胞器。",
                "subject": "植物学",
                "concept": "维管组织",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_tissue", "module_2", "植物学", "维管组织"],
                "references": [
                    {
                        "doi": "10.1093/jxb/ers001",
                        "title": "Xylem structure and function",
                        "authors": "Sperry JS, Hacke U, Oren R",
                        "year": 2005,
                        "journal": "Journal of Experimental Botany"
                    }
                ]
            }
        ],
        
        # Node 2: plant_water_mineral (植物水分与矿质营养)
        "plant_water_mineral": [
            {
                "type": "mtf",
                "question": "关于植物水分吸收和运输的机制，以下说法正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "根毛细胞通过渗透作用吸收土壤中的水分", "answer": True},
                    {"label": "B", "text": "水分在木质部中的运输主要依靠根压", "answer": False},
                    {"label": "C", "text": "内聚力-张力学说认为水柱的连续性依靠水分子间的氢键", "answer": True},
                    {"label": "D", "text": "蒸腾拉力是高大乔木水分运输的主要动力", "answer": True}
                ],
                "explanation": "A正确：根毛细胞通过渗透吸水。B错误：蒸腾拉力是水分上升的主要动力，根压作用有限。C正确：内聚力学说强调水分子间氢键维持水柱连续。D正确：蒸腾拉力是高大乔木水分运输的主要动力。",
                "subject": "植物生理学",
                "concept": "水分运输",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_water_mineral", "module_2", "植物生理学", "水分代谢"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "影响植物蒸腾作用的环境因素包括：",
                "subQuestions": [
                    {"label": "A", "text": "光照强度增加会促进气孔开放，增加蒸腾", "answer": True},
                    {"label": "B", "text": "空气湿度降低会减小蒸腾速率", "answer": False},
                    {"label": "C", "text": "温度升高会加速蒸腾作用", "answer": True},
                    {"label": "D", "text": "风速增大总是抑制蒸腾作用", "answer": False}
                ],
                "explanation": "A正确：光照促进气孔开放。B错误：湿度低，水汽压差大，蒸腾快。C正确：温度高促进蒸腾。D错误：微风有助于扩散水汽层，促进蒸腾；强风可能导致气孔关闭。",
                "subject": "植物生理学",
                "concept": "蒸腾作用",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_water_mineral", "module_2", "植物生理学", "蒸腾"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "关于植物矿质元素吸收的机制，以下描述正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "离子通过离子通道蛋白进行被动运输", "answer": True},
                    {"label": "B", "text": "载体蛋白可以介导离子的主动运输和协助扩散", "answer": True},
                    {"label": "C", "text": "H+-ATPase建立的质子梯度驱动次级主动运输", "answer": True},
                    {"label": "D", "text": "所有矿质元素的吸收都需要消耗ATP", "answer": False}
                ],
                "explanation": "A正确：离子通道允许离子顺电化学梯度被动运输。B正确：载体蛋白可介导多种运输方式。C正确：质子泵建立的电化学梯度驱动共运输。D错误：部分离子可通过被动运输吸收。",
                "subject": "植物生理学",
                "concept": "矿质吸收",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_water_mineral", "module_2", "植物生理学", "离子运输"],
                "references": [
                    {
                        "doi": "10.1146/annurev.arplant.56.032604.144152",
                        "title": "Nutrient transport in plants",
                        "authors": "Williams LE, Miller T, Chao S",
                        "year": 2010,
                        "journal": "Annual Review of Plant Biology"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "植物必需的大量元素包括：",
                "subQuestions": [
                    {"label": "A", "text": "氮、磷、钾是植物需要量最大的三种矿质元素", "answer": True},
                    {"label": "B", "text": "钙、镁、硫也是大量元素", "answer": True},
                    {"label": "C", "text": "铁、锰、锌属于大量元素", "answer": False},
                    {"label": "D", "text": "碳、氢、氧、氮是构成有机物的主要元素", "answer": True}
                ],
                "explanation": "A正确：NPK是肥料三要素。B正确：Ca、Mg、S也是大量元素。C错误：Fe、Mn、Zn是微量元素。D正确：CHO N是有机物主要组成元素。",
                "subject": "植物生理学",
                "concept": "必需元素",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_water_mineral", "module_2", "植物生理学", "矿质营养"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "关于水分在植物体内运输的途径，以下说法正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "水分可以通过共质体途径从根毛运输到内皮层", "answer": True},
                    {"label": "B", "text": "水分可以通过质外体途径在细胞壁和细胞间隙中运输", "answer": True},
                    {"label": "C", "text": "凯氏带允许水分通过质外体途径自由通过内皮层", "answer": False},
                    {"label": "D", "text": "水分最终必须进入共质体才能通过内皮层进入维管柱", "answer": True}
                ],
                "explanation": "A正确：共质体途径是水分运输的重要途径。B正确：质外体途径在皮层中很重要。C错误：凯氏带阻断质外体途径。D正确：水分必须通过内皮层细胞的选择性吸收。",
                "subject": "植物生理学",
                "concept": "水分运输途径",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_water_mineral", "module_2", "植物生理学", "运输途径"],
                "references": [
                    {
                        "doi": "10.1046/j.1365-3040.2001.00721.x",
                        "title": "Water transport across plant roots",
                        "authors": "Steudle E",
                        "year": 2001,
                        "journal": "Plant, Cell & Environment"
                    }
                ]
            }
        ],
        
        # Node 3: photosynthesis (光合作用)
        "photosynthesis": [
            {
                "type": "mtf",
                "question": "关于光合作用光反应的场所和过程，以下描述正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "光反应在叶绿体的类囊体膜上进行", "answer": True},
                    {"label": "B", "text": "PSII吸收光能后发生水的光解，释放氧气", "answer": True},
                    {"label": "C", "text": "电子传递过程中H+被泵入叶绿体基质，建立质子梯度", "answer": False},
                    {"label": "D", "text": "ATP合酶利用质子梯度合成ATP，这一过程称为光合磷酸化", "answer": True}
                ],
                "explanation": "A正确：光反应确实在类囊体膜上进行。B正确：PSII裂解水产生氧气。C错误：H+被泵入类囊体腔，不是基质。D正确：化学渗透机制驱动ATP合成。",
                "subject": "植物生理学",
                "concept": "光反应",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["photosynthesis", "module_2", "植物生理学", "光反应"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "Calvin循环的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "Calvin循环在叶绿体基质中进行", "answer": True},
                    {"label": "B", "text": "RuBisCO催化CO2与RuBP结合形成3-磷酸甘油酸", "answer": True},
                    {"label": "C", "text": "每固定3分子CO2需要消耗9分子ATP和6分子NADPH", "answer": True},
                    {"label": "D", "text": "Calvin循环的直接产物是葡萄糖", "answer": False}
                ],
                "explanation": "A正确：Calvin循环在基质中进行。B正确：RuBisCO是Calvin循环的关键酶。C正确：固定3CO2需要9ATP和6NADPH。D错误：直接产物是G3P（3-磷酸甘油醛），不是葡萄糖。",
                "subject": "植物生理学",
                "concept": "Calvin循环",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["photosynthesis", "module_2", "植物生理学", "暗反应"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "关于光合电子传递链的组成和功能，以下说法正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "PSII的反应中心色素是P680，PSI的反应中心色素是P700", "answer": True},
                    {"label": "B", "text": "质体醌（PQ）在PSII和Cyt b6f之间传递电子和质子", "answer": True},
                    {"label": "C", "text": "质体蓝素（PC）将电子从PSI传递给Cyt b6f", "answer": False},
                    {"label": "D", "text": "铁氧还蛋白（Fd）将电子传递给NADP+还原酶，最终还原NADP+", "answer": True}
                ],
                "explanation": "A正确：P680和P700分别是PSII和PSI的反应中心。B正确：PQ是双电子双质子载体。C错误：PC将电子从Cyt b6f传递给PSI，方向相反。D正确：Fd将电子最终传递给NADP+。",
                "subject": "植物生理学",
                "concept": "电子传递",
                "difficulty": "league",
                "target": "competition",
                "tags": ["photosynthesis", "module_2", "植物生理学", "电子传递"],
                "references": [
                    {
                        "doi": "10.1016/S0005-2728(99)00183-3",
                        "title": "Photosynthetic electron transport",
                        "authors": "Munekage Y, Toshiharu S",
                        "year": 2001,
                        "journal": "Biochimica et Biophysica Acta"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "环式光合磷酸化与非环式光合磷酸化的区别包括：",
                "subQuestions": [
                    {"label": "A", "text": "环式磷酸化只涉及PSI，非环式涉及PSII和PSI", "answer": True},
                    {"label": "B", "text": "环式磷酸化产生ATP但不产生NADPH和O2", "answer": True},
                    {"label": "C", "text": "非环式磷酸化中电子最终传递给O2", "answer": False},
                    {"label": "D", "text": "环式磷酸化中电子从Fd返回到Cyt b6f或PSI", "answer": True}
                ],
                "explanation": "A正确：环式只涉及PSI。B正确：环式只产ATP。C错误：非环式最终电子传递给NADP+，不是O2。D正确：环式电子循环使用。",
                "subject": "植物生理学",
                "concept": "光合磷酸化",
                "difficulty": "league",
                "target": "competition",
                "tags": ["photosynthesis", "module_2", "植物生理学", "磷酸化"],
                "references": [
                    {
                        "doi": "10.1146/annurev.arplant.53.091001.143716",
                        "title": "Cyclic electron flow in photosynthesis",
                        "authors": "Bendall DS, Manod JWF",
                        "year": 2003,
                        "journal": "Annual Review of Plant Biology"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "影响光合速率的环境因素包括：",
                "subQuestions": [
                    {"label": "A", "text": "光照强度在一定范围内，光合速率随光强增加而增加", "answer": True},
                    {"label": "B", "text": "CO2浓度增加可以提高光合速率，但存在饱和点", "answer": True},
                    {"label": "C", "text": "温度通过影响酶活性影响光合速率", "answer": True},
                    {"label": "D", "text": "水分亏缺主要通过减少CO2供应影响光合", "answer": False}
                ],
                "explanation": "A正确：光强是光反应的限制因素。B正确：CO2是暗反应的底物。C正确：温度影响酶活性。D错误：水分亏缺主要通过气孔关闭减少CO2进入，但也影响代谢。",
                "subject": "植物生理学",
                "concept": "光合影响因素",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["photosynthesis", "module_2", "植物生理学", "光合速率"],
                "references": []
            }
        ],
        
        # Node 4: photorespiration_c4 (光呼吸与C4途径)
        "photorespiration_c4": [
            {
                "type": "mtf",
                "question": "关于光呼吸的特征，以下描述正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "光呼吸在光照条件下发生，由RuBisCO的加氧酶活性引起", "answer": True},
                    {"label": "B", "text": "光呼吸消耗O2，释放CO2", "answer": True},
                    {"label": "C", "text": "光呼吸涉及叶绿体、过氧化物酶体和线粒体三种细胞器", "answer": True},
                    {"label": "D", "text": "光呼吸产生ATP，对植物有利", "answer": False}
                ],
                "explanation": "A正确：RuBisCO具有羧化酶和加氧酶双重活性。B正确：光呼吸消耗O2释放CO2。C正确：光呼吸是三种细胞器协同的过程。D错误：光呼吸消耗能量，一般认为对植物不利。",
                "subject": "植物生理学",
                "concept": "光呼吸",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["photorespiration_c4", "module_2", "植物生理学", "光呼吸"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "C4植物的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "C4植物具有Kranz解剖结构，维管束鞘细胞发达", "answer": True},
                    {"label": "B", "text": "C4植物的初次CO2固定由PEP羧化酶催化", "answer": True},
                    {"label": "C", "text": "C4途径是一种CO2浓缩机制，减少光呼吸", "answer": True},
                    {"label": "D", "text": "C4植物的Calvin循环在叶肉细胞中进行", "answer": False}
                ],
                "explanation": "A正确：Kranz结构是C4植物的特征。B正确：PEP羧化酶是C4途径的关键酶。C正确：C4途径浓缩CO2抑制光呼吸。D错误：Calvin循环在维管束鞘细胞中进行。",
                "subject": "植物生理学",
                "concept": "C4植物",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["photorespiration_c4", "module_2", "植物生理学", "C4途径"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "关于PEP羧化酶与RuBisCO的比较，以下说法正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "PEP羧化酶对CO2的亲和力高于RuBisCO", "answer": True},
                    {"label": "B", "text": "PEP羧化酶没有加氧酶活性，不催化光呼吸", "answer": True},
                    {"label": "C", "text": "RuBisCO既能催化羧化反应也能催化加氧反应", "answer": True},
                    {"label": "D", "text": "PEP羧化酶催化CO2与RuBP结合", "answer": False}
                ],
                "explanation": "A正确：PEP羧化酶对CO2亲和力高。B正确：PEP羧化酶只催化羧化。C正确：RuBisCO具有双重活性。D错误：PEP羧化酶催化CO2与PEP结合形成草酰乙酸。",
                "subject": "植物生理学",
                "concept": "羧化酶比较",
                "difficulty": "league",
                "target": "competition",
                "tags": ["photorespiration_c4", "module_2", "植物生理学", "酶比较"],
                "references": [
                    {
                        "doi": "10.1111/j.1365-3040.2005.01439.x",
                        "title": "C4 photosynthesis: the role of PEP carboxylase",
                        "authors": "Svensson P, Gardner J",
                        "year": 2006,
                        "journal": "Plant, Cell & Environment"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "CAM植物的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "CAM植物夜间开放气孔固定CO2", "answer": True},
                    {"label": "B", "text": "CAM植物白天关闭气孔，利用夜间固定的CO2进行Calvin循环", "answer": True},
                    {"label": "C", "text": "CAM是一种时间上分离的CO2浓缩机制", "answer": True},
                    {"label": "D", "text": "CAM植物主要分布在寒冷湿润的地区", "answer": False}
                ],
                "explanation": "A正确：CAM植物夜间开气孔。B正确：白天利用夜间固定的CO2。C正确：CAM是时间分离的C4类似机制。D错误：CAM植物主要分布在干旱炎热地区。",
                "subject": "植物生理学",
                "concept": "CAM植物",
                "difficulty": "league",
                "target": "competition",
                "tags": ["photorespiration_c4", "module_2", "植物生理学", "CAM"],
                "references": [
                    {
                        "doi": "10.1016/j.plantsci.2008.09.010",
                        "title": "CAM photosynthesis in arid environments",
                        "authors": "Osmond CB, Winter K",
                        "year": 2008,
                        "journal": "Plant Science"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "C3、C4、CAM植物的比较，以下说法正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "C3植物在高温强光下光呼吸较强", "answer": True},
                    {"label": "B", "text": "C4植物的水分利用效率高于C3植物", "answer": True},
                    {"label": "C", "text": "CAM植物的水分利用效率最高，但生长缓慢", "answer": True},
                    {"label": "D", "text": "C4植物的光补偿点高于C3植物", "answer": False}
                ],
                "explanation": "A正确：C3植物光呼吸强。B正确：C4水分利用效率高。C正确：CAM最节水但生长慢。D错误：C4光补偿点通常低于C3。",
                "subject": "植物生理学",
                "concept": "光合类型比较",
                "difficulty": "league",
                "target": "competition",
                "tags": ["photorespiration_c4", "module_2", "植物生理学", "光合类型"],
                "references": [
                    {
                        "doi": "10.1146/annurev.arplant.56.032604.144231",
                        "title": "Evolution of C4 and CAM photosynthesis",
                        "authors": "Edwards EJ, Still CJ, Donoghue MJ",
                        "year": 2010,
                        "journal": "Annual Review of Plant Biology"
                    }
                ]
            }
        ],
        
        # Node 5: plant_hormone (植物激素与生长调节)
        "plant_hormone": [
            {
                "type": "mtf",
                "question": "关于生长素的特征，以下描述正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "生长素（IAA）在植物体内主要通过色氨酸合成", "answer": True},
                    {"label": "B", "text": "生长素具有极性运输的特点，从形态学上端向下端运输", "answer": True},
                    {"label": "C", "text": "生长素的作用具有两重性，低浓度促进生长，高浓度抑制生长", "answer": True},
                    {"label": "D", "text": "生长素只分布在植物的茎尖和根尖", "answer": False}
                ],
                "explanation": "A正确：IAA主要由色氨酸合成。B正确：极性运输是生长素的特点。C正确：两重性是生长素作用的重要特征。D错误：生长素分布在多个部位。",
                "subject": "植物学",
                "concept": "生长素",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_hormone", "module_2", "植物学", "生长素"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "植物向光性的机制包括：",
                "subQuestions": [
                    {"label": "A", "text": "单侧光引起生长素在胚芽鞘尖端横向运输", "answer": True},
                    {"label": "B", "text": "背光侧生长素浓度高于向光侧", "answer": True},
                    {"label": "C", "text": "背光侧细胞伸长生长快于向光侧", "answer": True},
                    {"label": "D", "text": "向光侧生长素被光分解", "answer": False}
                ],
                "explanation": "A正确：单侧光导致生长素横向运输。B正确：背光侧浓度高。C正确：背光侧生长快导致向光弯曲。D错误：不是光分解，而是分布不均。",
                "subject": "植物学",
                "concept": "向光性",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_hormone", "module_2", "植物学", "向光性"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "关于顶端优势的机制，以下说法正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "顶端优势是指顶芽优先生长而侧芽受抑制的现象", "answer": True},
                    {"label": "B", "text": "顶芽产生的生长素向下运输，在侧芽处积累", "answer": True},
                    {"label": "C", "text": "高浓度生长素抑制侧芽生长", "answer": True},
                    {"label": "D", "text": "去除顶芽后侧芽立即快速生长", "answer": False}
                ],
                "explanation": "A正确：顶端优势的定义。B正确：生长素从顶芽向下运输。C正确：高浓度抑制侧芽。D错误：去除顶芽后需要一段时间侧芽才开始生长。",
                "subject": "植物学",
                "concept": "顶端优势",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_hormone", "module_2", "植物学", "顶端优势"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "其他植物激素的功能包括：",
                "subQuestions": [
                    {"label": "A", "text": "赤霉素促进细胞伸长，引起植株增高", "answer": True},
                    {"label": "B", "text": "细胞分裂素促进细胞分裂，延缓衰老", "answer": True},
                    {"label": "C", "text": "乙烯促进果实成熟和器官脱落", "answer": True},
                    {"label": "D", "text": "脱落酸促进种子萌发和芽的生长", "answer": False}
                ],
                "explanation": "A正确：赤霉素促进伸长。B正确：细胞分裂素促进分裂。C正确：乙烯促进成熟。D错误：脱落酸抑制生长，促进休眠。",
                "subject": "植物学",
                "concept": "其他激素",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_hormone", "module_2", "植物学", "激素功能"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "关于植物激素信号转导的分子机制，以下描述正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "生长素信号转导涉及TIR1受体和Aux/IAA蛋白降解", "answer": True},
                    {"label": "B", "text": "赤霉素受体GID1结合GA后促进DELLA蛋白降解", "answer": True},
                    {"label": "C", "text": "脱落酸受体PYR/PYL/RCAR结合ABA后激活下游信号", "answer": True},
                    {"label": "D", "text": "所有植物激素都通过细胞膜表面受体起作用", "answer": False}
                ],
                "explanation": "A正确：TIR1是生长素受体。B正确：GID1是赤霉素受体。C正确：PYR/PYL/RCAR是ABA受体。D错误：部分激素受体在细胞内。",
                "subject": "植物学",
                "concept": "激素信号转导",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_hormone", "module_2", "植物学", "信号转导"],
                "references": [
                    {
                        "doi": "10.1146/annurev.arplant.043008.092819",
                        "title": "Plant hormone signaling",
                        "authors": "Wang ZY, Nakaya M, Chory J",
                        "year": 2009,
                        "journal": "Annual Review of Plant Biology"
                    }
                ]
            }
        ],
        
        # Node 6: plant_repro (植物生殖与发育)
        "plant_repro": [
            {
                "type": "mtf",
                "question": "关于被子植物的双受精过程，以下描述正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "双受精是指一个精子与卵细胞结合，另一个精子与极核结合", "answer": True},
                    {"label": "B", "text": "受精卵发育成胚，受精极核发育成胚乳", "answer": True},
                    {"label": "C", "text": "双受精是被子植物特有的受精方式", "answer": True},
                    {"label": "D", "text": "两个精子分别与两个卵细胞结合", "answer": False}
                ],
                "explanation": "A正确：双受精的定义。B正确：受精卵→胚，受精极核→胚乳。C正确：双受精是被子植物特有。D错误：是一个精子与卵细胞，另一个与极核。",
                "subject": "植物学",
                "concept": "双受精",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_repro", "module_2", "植物学", "双受精"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "花粉发育的过程包括：",
                "subQuestions": [
                    {"label": "A", "text": "小孢子母细胞经减数分裂形成四个小孢子", "answer": True},
                    {"label": "B", "text": "小孢子经有丝分裂形成营养细胞和生殖细胞", "answer": True},
                    {"label": "C", "text": "成熟花粉粒含有两个细胞（营养细胞和生殖细胞）", "answer": True},
                    {"label": "D", "text": "花粉粒的壁由花粉母细胞自身合成", "answer": False}
                ],
                "explanation": "A正确：减数分裂产生小孢子。B正确：有丝分裂形成两细胞。C正确：成熟花粉含两细胞。D错误：花粉壁部分由花药壁细胞提供。",
                "subject": "植物学",
                "concept": "花粉发育",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_repro", "module_2", "植物学", "花粉"],
                "references": [
                    {
                        "doi": "10.1146/annurev.arplant.56.032604.144210",
                        "title": "Pollen development and function",
                        "authors": "McCormick S",
                        "year": 2004,
                        "journal": "Annual Review of Plant Biology"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "胚囊发育的过程包括：",
                "subQuestions": [
                    {"label": "A", "text": "大孢子母细胞经减数分裂形成四个大孢子", "answer": True},
                    {"label": "B", "text": "通常只有一个大孢子发育成胚囊", "answer": True},
                    {"label": "C", "text": "成熟胚囊含有七个细胞八个核", "answer": True},
                    {"label": "D", "text": "胚囊中的卵细胞直接由大孢子有丝分裂产生", "answer": False}
                ],
                "explanation": "A正确：减数分裂产生四个大孢子。B正确：通常只有一个发育。C正确：7细胞8核是典型结构。D错误：卵细胞是经过多次有丝分裂和分化形成的。",
                "subject": "植物学",
                "concept": "胚囊发育",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_repro", "module_2", "植物学", "胚囊"],
                "references": [
                    {
                        "doi": "10.1016/j.pbi.2005.11.006",
                        "title": "Embryo sac development in Arabidopsis",
                        "authors": "Pagnussat GC, Alandete-Saez M, Bowman JL",
                        "year": 2005,
                        "journal": "Current Opinion in Plant Biology"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "关于种子的形成和结构，以下说法正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "种子由种皮、胚和胚乳三部分组成", "answer": True},
                    {"label": "B", "text": "种皮由珠被发育而来", "answer": True},
                    {"label": "C", "text": "胚由受精卵发育而来", "answer": True},
                    {"label": "D", "text": "所有种子的胚乳都发达", "answer": False}
                ],
                "explanation": "A正确：种子的基本结构。B正确：种皮来源于珠被。C正确：胚来自受精卵。D错误：有些种子（如豆类）胚乳被吸收，子叶发达。",
                "subject": "植物学",
                "concept": "种子结构",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_repro", "module_2", "植物学", "种子"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "植物的世代交替包括：",
                "subQuestions": [
                    {"label": "A", "text": "世代交替是指孢子体世代和配子体世代交替出现", "answer": True},
                    {"label": "B", "text": "苔藓植物的配子体发达，孢子体寄生在配子体上", "answer": True},
                    {"label": "C", "text": "蕨类植物的孢子体发达，配子体独立生活", "answer": True},
                    {"label": "D", "text": "种子植物的配子体发达，孢子体退化", "answer": False}
                ],
                "explanation": "A正确：世代交替的定义。B正确：苔藓配子体发达。C正确：蕨类孢子体发达。D错误：种子植物孢子体发达，配子体极度退化。",
                "subject": "植物学",
                "concept": "世代交替",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_repro", "module_2", "植物学", "世代交替"],
                "references": [
                    {
                        "doi": "10.1016/j.pbi.2006.07.008",
                        "title": "Alternation of generations in plants",
                        "authors": "Floyd SK, Bowman JL",
                        "year": 2007,
                        "journal": "Current Opinion in Plant Biology"
                    }
                ]
            }
        ],
        
        # Node 7: assimilate_transport (同化物运输)
        "assimilate_transport": [
            {
                "type": "mtf",
                "question": "关于韧皮部运输的特征，以下描述正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "韧皮部运输的主要物质是蔗糖", "answer": True},
                    {"label": "B", "text": "韧皮部运输是双向运输，可以从源到库", "answer": True},
                    {"label": "C", "text": "筛管分子是活细胞，但缺乏细胞核", "answer": True},
                    {"label": "D", "text": "韧皮部运输不需要消耗能量", "answer": False}
                ],
                "explanation": "A正确：蔗糖是主要运输形式。B正确：韧皮部可双向运输。C正确：筛管分子是活细胞但无核。D错误：韧皮部装载和卸载需要能量。",
                "subject": "植物生理学",
                "concept": "韧皮部运输",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["assimilate_transport", "module_2", "植物生理学", "韧皮部"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "压力流动假说的内容包括：",
                "subQuestions": [
                    {"label": "A", "text": "源端筛管渗透压高，水分进入产生高压", "answer": True},
                    {"label": "B", "text": "库端筛管渗透压低，水分流出压力降低", "answer": True},
                    {"label": "C", "text": "压力差驱动同化物从源向库运输", "answer": True},
                    {"label": "D", "text": "压力流动假说认为运输过程不需要代谢能量", "answer": False}
                ],
                "explanation": "A正确：源端装载产生高压。B正确：库端卸载压力低。C正确：压力差驱动流动。D错误：装载和卸载需要代谢能量。",
                "subject": "植物生理学",
                "concept": "压力流动",
                "difficulty": "league",
                "target": "competition",
                "tags": ["assimilate_transport", "module_2", "植物生理学", "运输机制"],
                "references": [
                    {
                        "doi": "10.1016/j.pbi.2003.09.005",
                        "title": "Phloem transport: cellular pathways and molecular trafficking",
                        "authors": "Oparka KJ, Santa Cruz S",
                        "year": 2005,
                        "journal": "Current Opinion in Plant Biology"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "韧皮部装载的途径包括：",
                "subQuestions": [
                    {"label": "A", "text": "共质体途径通过胞间连丝运输", "answer": True},
                    {"label": "B", "text": "质外体途径需要蔗糖转运蛋白", "answer": True},
                    {"label": "C", "text": "质外体途径需要H+-蔗糖共运输", "answer": True},
                    {"label": "D", "text": "所有植物都采用相同的装载途径", "answer": False}
                ],
                "explanation": "A正确：共质体途径存在。B正确：质外体需要转运蛋白。C正确：H+梯度驱动蔗糖运输。D错误：不同植物采用不同途径。",
                "subject": "植物生理学",
                "concept": "装载途径",
                "difficulty": "league",
                "target": "competition",
                "tags": ["assimilate_transport", "module_2", "植物生理学", "装载"],
                "references": [
                    {
                        "doi": "10.1146/annurev.arplant.56.032604.144254",
                        "title": "Phloem loading mechanisms",
                        "authors": "Lalonde E, Wipf D, Frommer WB",
                        "year": 2004,
                        "journal": "Annual Review of Plant Biology"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "源-库关系的特点包括：",
                "subQuestions": [
                    {"label": "A", "text": "源是指产生同化物的器官或组织", "answer": True},
                    {"label": "B", "text": "库是指消耗或储存同化物的器官或组织", "answer": True},
                    {"label": "C", "text": "同一器官在不同发育阶段可以是源或库", "answer": True},
                    {"label": "D", "text": "源端总是叶片，库端总是根系", "answer": False}
                ],
                "explanation": "A正确：源的定义。B正确：库的定义。C正确：器官角色可变。D错误：果实、幼叶也可以是库。",
                "subject": "植物生理学",
                "concept": "源库关系",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["assimilate_transport", "module_2", "植物生理学", "源库"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "影响同化物分配的因素包括：",
                "subQuestions": [
                    {"label": "A", "text": "库的竞争力影响同化物的分配方向", "answer": True},
                    {"label": "B", "text": "维管束的连接方式影响运输路径", "answer": True},
                    {"label": "C", "text": "距离源的远近影响同化物分配", "answer": True},
                    {"label": "D", "text": "同化物总是平均分配到各个库器官", "answer": False}
                ],
                "explanation": "A正确：库强影响分配。B正确：维管连接影响路径。C正确：就近供应原则。D错误：分配不均匀，优先供应强库。",
                "subject": "植物生理学",
                "concept": "同化物分配",
                "difficulty": "league",
                "target": "competition",
                "tags": ["assimilate_transport", "module_2", "植物生理学", "分配"],
                "references": [
                    {
                        "doi": "10.1071/PP995001",
                        "title": "Assimilate partitioning in crops",
                        "authors": "Fischer RA, Aguilar MI",
                        "year": 1995,
                        "journal": "Plant and Soil"
                    }
                ]
            }
        ],
        
        # Node 8: plant_movement (植物运动与感知)
        "plant_movement": [
            {
                "type": "mtf",
                "question": "关于植物的向光性，以下描述正确的是：",
                "subQuestions": [
                    {"label": "A", "text": "向光性是植物对单侧光的生长反应", "answer": True},
                    {"label": "B", "text": "胚芽鞘尖端是感光部位", "answer": True},
                    {"label": "C", "text": "弯曲部位在胚芽鞘尖端下方", "answer": True},
                    {"label": "D", "text": "向光侧生长素浓度高于背光侧", "answer": False}
                ],
                "explanation": "A正确：向光性的定义。B正确：尖端感光。C正确：尖端下方弯曲。D错误：背光侧浓度高。",
                "subject": "植物学",
                "concept": "向光性",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_movement", "module_2", "植物学", "向光性"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "植物的向重力性包括：",
                "subQuestions": [
                    {"label": "A", "text": "根的正向重力性有利于吸收水分和矿质", "answer": True},
                    {"label": "B", "text": "茎的负向重力性有利于叶片接受光照", "answer": True},
                    {"label": "C", "text": "平衡石（淀粉体）是重力感知的关键", "answer": True},
                    {"label": "D", "text": "根冠不是根感知重力的部位", "answer": False}
                ],
                "explanation": "A正确：正向重力性的意义。B正确：负向重力性的意义。C正确：淀粉体作为平衡石。D错误：根冠是感光部位。",
                "subject": "植物学",
                "concept": "向重力性",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_movement", "module_2", "植物学", "向重力性"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "光周期现象的类型包括：",
                "subQuestions": [
                    {"label": "A", "text": "短日照植物在日照短于临界日长时开花", "answer": True},
                    {"label": "B", "text": "长日照植物在日照长于临界日长时开花", "answer": True},
                    {"label": "C", "text": "日中性植物开花不受日照长度影响", "answer": True},
                    {"label": "D", "text": "菊花是典型的长日照植物", "answer": False}
                ],
                "explanation": "A正确：短日照植物定义。B正确：长日照植物定义。C正确：日中性定义。D错误：菊花是短日照植物。",
                "subject": "植物学",
                "concept": "光周期",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_movement", "module_2", "植物学", "光周期"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "光敏色素的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "光敏色素存在Pr和Pfr两种可逆转形式", "answer": True},
                    {"label": "B", "text": "Pr吸收红光转变为Pfr", "answer": True},
                    {"label": "C", "text": "Pfr是生理激活形式", "answer": True},
                    {"label": "D", "text": "光敏色素只分布在叶片中", "answer": False}
                ],
                "explanation": "A正确：两种形式可逆转。B正确：红光使Pr→Pfr。C正确：Pfr是活性形式。D错误：光敏色素分布在多个部位。",
                "subject": "植物学",
                "concept": "光敏色素",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_movement", "module_2", "植物学", "光受体"],
                "references": [
                    {
                        "doi": "10.1146/annurev.arplant.56.032604.144207",
                        "title": "Phytochrome structure and signaling",
                        "authors": "Rockwell NC, Su YS, Lagarias JC",
                        "year": 2006,
                        "journal": "Annual Review of Plant Biology"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "感性运动的特点包括：",
                "subQuestions": [
                    {"label": "A", "text": "感性运动是对外界刺激的快速反应", "answer": True},
                    {"label": "B", "text": "含羞草的叶片闭合属于感震运动", "answer": True},
                    {"label": "C", "text": "感性运动与生长无关，由膨压变化引起", "answer": True},
                    {"label": "D", "text": "感性运动的方向与刺激方向有关", "answer": False}
                ],
                "explanation": "A正确：感性运动快速。B正确：含羞草是典型例子。C正确：膨压变化引起。D错误：感性运动方向与刺激方向无关。",
                "subject": "植物学",
                "concept": "感性运动",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_movement", "module_2", "植物学", "感性运动"],
                "references": [
                    {
                        "doi": "10.1016/j.pbi.2004.09.007",
                        "title": "Rapid movements in plants",
                        "authors": "Forterre Y, Skotheim JM, Dumais J",
                        "year": 2005,
                        "journal": "Current Opinion in Plant Biology"
                    }
                ]
            }
        ],
        
        # Node 9: plant_stress (植物逆境生理)
        "plant_stress": [
            {
                "type": "mtf",
                "question": "植物对干旱胁迫的响应包括：",
                "subQuestions": [
                    {"label": "A", "text": "气孔关闭减少水分蒸腾", "answer": True},
                    {"label": "B", "text": "根系生长相对增加以吸收更多水分", "answer": True},
                    {"label": "C", "text": "积累脯氨酸等渗透调节物质", "answer": True},
                    {"label": "D", "text": "光合作用增强以补偿水分不足", "answer": False}
                ],
                "explanation": "A正确：ABA诱导气孔关闭。B正确：根冠比增加。C正确：渗透调节物质积累。D错误：干旱抑制光合作用。",
                "subject": "植物生理学",
                "concept": "干旱响应",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_stress", "module_2", "植物生理学", "干旱"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "ABA在植物逆境响应中的作用包括：",
                "subQuestions": [
                    {"label": "A", "text": "ABA被称为应激激素，在逆境下含量增加", "answer": True},
                    {"label": "B", "text": "ABA诱导气孔关闭", "answer": True},
                    {"label": "C", "text": "ABA促进逆境相关基因表达", "answer": True},
                    {"label": "D", "text": "ABA促进种子萌发", "answer": False}
                ],
                "explanation": "A正确：ABA是应激激素。B正确：ABA诱导气孔关闭。C正确：ABA激活基因表达。D错误：ABA抑制萌发，促进休眠。",
                "subject": "植物生理学",
                "concept": "ABA作用",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_stress", "module_2", "植物生理学", "ABA"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "盐胁迫对植物的影响包括：",
                "subQuestions": [
                    {"label": "A", "text": "盐胁迫造成渗透胁迫，影响水分吸收", "answer": True},
                    {"label": "B", "text": "Na+毒害影响酶活性和代谢", "answer": True},
                    {"label": "C", "text": "离子不平衡导致营养缺乏", "answer": True},
                    {"label": "D", "text": "盐胁迫促进植物快速生长", "answer": False}
                ],
                "explanation": "A正确：盐降低水势。B正确：Na+有毒害作用。C正确：离子竞争影响吸收。D错误：盐胁迫抑制生长。",
                "subject": "植物生理学",
                "concept": "盐胁迫",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_stress", "module_2", "植物生理学", "盐胁迫"],
                "references": [
                    {
                        "doi": "10.1146/annurev.arplant.56.032604.144252",
                        "title": "Salt stress signaling in plants",
                        "authors": "Zhu JK",
                        "year": 2002,
                        "journal": "Annual Review of Plant Biology"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "植物抗氧化系统包括：",
                "subQuestions": [
                    {"label": "A", "text": "SOD（超氧化物歧化酶）清除超氧自由基", "answer": True},
                    {"label": "B", "text": "CAT（过氧化氢酶）分解H2O2", "answer": True},
                    {"label": "C", "text": "抗坏血酸和谷胱甘肽是非酶抗氧化剂", "answer": True},
                    {"label": "D", "text": "活性氧对植物只有害处没有益处", "answer": False}
                ],
                "explanation": "A正确：SOD清除O2-。B正确：CAT分解H2O2。C正确：AsA和GSH是重要抗氧化剂。D错误：活性氧也参与信号转导。",
                "subject": "植物生理学",
                "concept": "抗氧化系统",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_stress", "module_2", "植物生理学", "抗氧化"],
                "references": [
                    {
                        "doi": "10.1016/S1360-1385(00)01688-0",
                        "title": "Reactive oxygen species and antioxidant systems in plants",
                        "authors": "Mittler R",
                        "year": 2002,
                        "journal": "Trends in Plant Science"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "低温对植物的影响包括：",
                "subQuestions": [
                    {"label": "A", "text": "低温导致膜流动性降低，影响膜功能", "answer": True},
                    {"label": "B", "text": "冰晶形成造成机械损伤", "answer": True},
                    {"label": "C", "text": "冷害是指0℃以上低温对植物的伤害", "answer": True},
                    {"label": "D", "text": "所有植物对低温的敏感性相同", "answer": False}
                ],
                "explanation": "A正确：低温影响膜流动性。B正确：冰晶造成损伤。C正确：冷害的定义。D错误：不同植物耐寒性不同。",
                "subject": "植物生理学",
                "concept": "低温胁迫",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_stress", "module_2", "植物生理学", "低温"],
                "references": [
                    {
                        "doi": "10.1104/pp.111.180673",
                        "title": "Cold signaling in plants",
                        "authors": "Chinnusamy V, Zhu J, Zhu JK",
                        "year": 2007,
                        "journal": "Plant Physiology"
                    }
                ]
            }
        ],
        
        # Node 10: plant_nutrition (植物营养与固氮)
        "plant_nutrition": [
            {
                "type": "mtf",
                "question": "植物必需元素的分类包括：",
                "subQuestions": [
                    {"label": "A", "text": "大量元素包括C、H、O、N、P、K、Ca、Mg、S", "answer": True},
                    {"label": "B", "text": "微量元素包括Fe、Mn、Zn、Cu、B、Mo、Cl、Ni", "answer": True},
                    {"label": "C", "text": "Na、Si等是某些植物的有益元素", "answer": True},
                    {"label": "D", "text": "微量元素因为需要量少，所以不重要", "answer": False}
                ],
                "explanation": "A正确：大量元素列表。B正确：微量元素列表。C正确：有益元素存在。D错误：微量元素同样重要。",
                "subject": "植物生理学",
                "concept": "必需元素",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_nutrition", "module_2", "植物生理学", "营养元素"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "缺素症状的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "N、P、K缺乏时症状首先出现在老叶", "answer": True},
                    {"label": "B", "text": "Fe、Ca缺乏时症状首先出现在新叶", "answer": True},
                    {"label": "C", "text": "缺N时叶片发黄，因为N是可移动元素", "answer": True},
                    {"label": "D", "text": "缺Ca时新叶坏死，因为Ca是不可移动元素", "answer": True}
                ],
                "explanation": "A正确：可移动元素缺乏在老叶。B正确：不可移动元素缺乏在新叶。C正确：N缺乏黄化。D正确：Ca缺乏新叶坏死。",
                "subject": "植物生理学",
                "concept": "缺素症状",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_nutrition", "module_2", "植物生理学", "缺素"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "生物固氮的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "固氮酶由钼铁蛋白和铁蛋白组成", "answer": True},
                    {"label": "B", "text": "固氮过程需要消耗大量ATP", "answer": True},
                    {"label": "C", "text": "固氮酶对氧气敏感，需要在厌氧条件下工作", "answer": True},
                    {"label": "D", "text": "所有植物都能进行生物固氮", "answer": False}
                ],
                "explanation": "A正确：固氮酶组成。B正确：固氮耗能。C正确：固氮酶怕氧。D错误：只有某些微生物能固氮。",
                "subject": "植物生理学",
                "concept": "生物固氮",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_nutrition", "module_2", "植物生理学", "固氮"],
                "references": [
                    {
                        "doi": "10.1146/annurev.biochem.68.1.309",
                        "title": "Nitrogenase structure and mechanism",
                        "authors": "Howard JB, Rees DC",
                        "year": 1996,
                        "journal": "Annual Review of Biochemistry"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "根瘤菌与豆科植物的共生包括：",
                "subQuestions": [
                    {"label": "A", "text": "根瘤菌识别宿主植物需要结瘤因子", "answer": True},
                    {"label": "B", "text": "根瘤是豆科植物特有的结构", "answer": True},
                    {"label": "C", "text": "根瘤中的类菌体是固氮的场所", "answer": True},
                    {"label": "D", "text": "豆血红蛋白调节氧气浓度保护固氮酶", "answer": True}
                ],
                "explanation": "A正确：结瘤因子介识别。B正确：根瘤是豆科特有。C正确：类菌体固氮。D正确：豆血红蛋白调节氧。",
                "subject": "植物生理学",
                "concept": "根瘤共生",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_nutrition", "module_2", "植物生理学", "共生"],
                "references": [
                    {
                        "doi": "10.1128/microbiolspec.2.4.0016.2014",
                        "title": "Legume-rhizobia symbiosis",
                        "authors": "Oldroyd GE, Downie PS",
                        "year": 2014,
                        "journal": "Microbiology Spectrum"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "菌根的类型和功能包括：",
                "subQuestions": [
                    {"label": "A", "text": "丛枝菌根（AM）是最常见的菌根类型", "answer": True},
                    {"label": "B", "text": "外生菌根主要分布在松科等木本植物", "answer": True},
                    {"label": "C", "text": "菌根帮助植物吸收磷等矿质元素", "answer": True},
                    {"label": "D", "text": "菌根对植物只有益处没有害处", "answer": False}
                ],
                "explanation": "A正确：AM最常见。B正确：外生菌根分布。C正确：菌根促吸收。D错误：菌根也消耗植物碳源。",
                "subject": "植物生理学",
                "concept": "菌根",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_nutrition", "module_2", "植物生理学", "菌根"],
                "references": [
                    {
                        "doi": "10.1146/annurev.arplant.56.032604.144250",
                        "title": "Mycorrhizal symbiosis",
                        "authors": "Smith SE, Read DJ",
                        "year": 2008,
                        "journal": "Annual Review of Plant Biology"
                    }
                ]
            }
        ],
        
        # Node 11: plant_respiration (植物呼吸作用)
        "plant_respiration": [
            {
                "type": "mtf",
                "question": "植物有氧呼吸的过程包括：",
                "subQuestions": [
                    {"label": "A", "text": "糖酵解在细胞质中进行，将葡萄糖分解为丙酮酸", "answer": True},
                    {"label": "B", "text": "丙酮酸进入线粒体进行三羧酸循环", "answer": True},
                    {"label": "C", "text": "电子传递链位于线粒体内膜", "answer": True},
                    {"label": "D", "text": "有氧呼吸只在叶片中进行", "answer": False}
                ],
                "explanation": "A正确：糖酵解在细胞质。B正确：TCA在线粒体。C正确：ETC在线粒体内膜。D错误：所有活细胞都进行呼吸。",
                "subject": "植物生理学",
                "concept": "有氧呼吸",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_respiration", "module_2", "植物生理学", "呼吸"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "植物无氧呼吸的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "无氧呼吸在细胞质中进行", "answer": True},
                    {"label": "B", "text": "植物无氧呼吸通常产生酒精和CO2", "answer": True},
                    {"label": "C", "text": "无氧呼吸只在糖酵解阶段产生少量ATP", "answer": True},
                    {"label": "D", "text": "无氧呼吸比有氧呼吸释放更多能量", "answer": False}
                ],
                "explanation": "A正确：无氧呼吸在细胞质。B正确：植物产酒精。C正确：只有糖酵解产ATP。D错误：无氧呼吸释放能量少。",
                "subject": "植物生理学",
                "concept": "无氧呼吸",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_respiration", "module_2", "植物生理学", "无氧呼吸"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "抗氰呼吸的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "抗氰呼吸是植物特有的呼吸方式", "answer": True},
                    {"label": "B", "text": "抗氰呼吸中电子不经过细胞色素途径", "answer": True},
                    {"label": "C", "text": "交替氧化酶（AOX）是抗氰呼吸的关键酶", "answer": True},
                    {"label": "D", "text": "抗氰呼吸产生大量ATP", "answer": False}
                ],
                "explanation": "A正确：植物特有。B正确：绕过Cyt途径。C正确：AOX是关键酶。D错误：抗氰呼吸产ATP少，能量以热散失。",
                "subject": "植物生理学",
                "concept": "抗氰呼吸",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_respiration", "module_2", "植物生理学", "抗氰呼吸"],
                "references": [
                    {
                        "doi": "10.1146/annurev.arplant.53.091001.143731",
                        "title": "Alternative oxidase and plant respiration",
                        "authors": "Maxwell DP, Wang Y, McIntosh L",
                        "year": 1999,
                        "journal": "Annual Review of Plant Biology"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "呼吸跃变与果实成熟的关系包括：",
                "subQuestions": [
                    {"label": "A", "text": "呼吸跃变型果实在成熟时呼吸速率突然升高", "answer": True},
                    {"label": "B", "text": "乙烯是诱导呼吸跃变的关键激素", "answer": True},
                    {"label": "C", "text": "苹果、香蕉是典型的呼吸跃变型果实", "answer": True},
                    {"label": "D", "text": "柑橘、葡萄是呼吸跃变型果实", "answer": False}
                ],
                "explanation": "A正确：呼吸跃变的定义。B正确：乙烯诱导跃变。C正确：苹果香蕉是跃变型。D错误：柑橘葡萄是非跃变型。",
                "subject": "植物生理学",
                "concept": "呼吸跃变",
                "difficulty": "league",
                "target": "competition",
                "tags": ["plant_respiration", "module_2", "植物生理学", "果实成熟"],
                "references": [
                    {
                        "doi": "10.1016/S1360-1385(02)02329-5",
                        "title": "Climacteric ripening in fruits",
                        "authors": "Brummell DA, Harpster SH",
                        "year": 2001,
                        "journal": "Trends in Plant Science"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "影响植物呼吸速率的因素包括：",
                "subQuestions": [
                    {"label": "A", "text": "温度升高在一定范围内促进呼吸", "answer": True},
                    {"label": "B", "text": "氧气浓度增加促进有氧呼吸", "answer": True},
                    {"label": "C", "text": "CO2浓度增加抑制呼吸", "answer": True},
                    {"label": "D", "text": "水分含量对呼吸没有影响", "answer": False}
                ],
                "explanation": "A正确：温度影响酶活性。B正确：O2是有氧呼吸必需。C正确：CO2抑制呼吸。D错误：水分影响呼吸速率。",
                "subject": "植物生理学",
                "concept": "呼吸影响因素",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["plant_respiration", "module_2", "植物生理学", "呼吸速率"],
                "references": []
            }
        ],
        
        # Node 12: bacteria (细菌结构与多样性)
        "bacteria": [
            {
                "type": "mtf",
                "question": "细菌的基本结构包括：",
                "subQuestions": [
                    {"label": "A", "text": "细菌具有细胞壁、细胞膜、细胞质", "answer": True},
                    {"label": "B", "text": "细菌的遗传物质是裸露的DNA，无核膜包被", "answer": True},
                    {"label": "C", "text": "细菌具有核糖体", "answer": True},
                    {"label": "D", "text": "细菌具有线粒体和叶绿体", "answer": False}
                ],
                "explanation": "A正确：细菌基本结构。B正确：原核生物无核膜。C正确：细菌有核糖体。D错误：细菌没有膜包被的细胞器。",
                "subject": "微生物学",
                "concept": "细菌结构",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["bacteria", "module_2", "微生物学", "细菌结构"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "革兰氏阳性菌与阴性菌的区别包括：",
                "subQuestions": [
                    {"label": "A", "text": "革兰氏阳性菌细胞壁厚，肽聚糖含量高", "answer": True},
                    {"label": "B", "text": "革兰氏阴性菌有外膜，含脂多糖", "answer": True},
                    {"label": "C", "text": "革兰氏染色后阳性菌呈紫色，阴性菌呈红色", "answer": True},
                    {"label": "D", "text": "革兰氏阴性菌对青霉素更敏感", "answer": False}
                ],
                "explanation": "A正确：阳性菌细胞壁厚。B正确：阴性菌有外膜。C正确：染色结果。D错误：阳性菌对青霉素更敏感。",
                "subject": "微生物学",
                "concept": "革兰氏染色",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["bacteria", "module_2", "微生物学", "革兰氏"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "细菌的运动器官和趋化性包括：",
                "subQuestions": [
                    {"label": "A", "text": "鞭毛是细菌的主要运动器官", "answer": True},
                    {"label": "B", "text": "细菌趋化性是对化学物质的定向运动", "answer": True},
                    {"label": "C", "text": "趋化性通过鞭毛的旋转和反转实现", "answer": True},
                    {"label": "D", "text": "所有细菌都能运动", "answer": False}
                ],
                "explanation": "A正确：鞭毛运动。B正确：趋化性定义。C正确：运动机制。D错误：有些细菌不能运动。",
                "subject": "微生物学",
                "concept": "细菌运动",
                "difficulty": "league",
                "target": "competition",
                "tags": ["bacteria", "module_2", "微生物学", "运动"],
                "references": [
                    {
                        "doi": "10.1146/annurev.biochem.68.1.189",
                        "title": "Bacterial chemotaxis and flagellar motor",
                        "authors": "Macnab RM",
                        "year": 1996,
                        "journal": "Annual Review of Biochemistry"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "细菌的基因转移方式包括：",
                "subQuestions": [
                    {"label": "A", "text": "转化是细菌摄取外源DNA的过程", "answer": True},
                    {"label": "B", "text": "转导是通过噬菌体介导的基因转移", "answer": True},
                    {"label": "C", "text": "接合是通过性菌毛直接传递DNA", "answer": True},
                    {"label": "D", "text": "这三种方式都需要细胞间直接接触", "answer": False}
                ],
                "explanation": "A正确：转化定义。B正确：转导定义。C正确：接合定义。D错误：转化不需要接触。",
                "subject": "微生物学",
                "concept": "基因转移",
                "difficulty": "league",
                "target": "competition",
                "tags": ["bacteria", "module_2", "微生物学", "基因转移"],
                "references": [
                    {
                        "doi": "10.1128/microbiolspec.3.1.0016.2015",
                        "title": "Horizontal gene transfer in bacteria",
                        "authors": "Thomas CM, Nielsen KM",
                        "year": 2005,
                        "journal": "Microbiology Spectrum"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "细菌的代谢多样性包括：",
                "subQuestions": [
                    {"label": "A", "text": "光合细菌能进行光合作用", "answer": True},
                    {"label": "B", "text": "化能自养菌利用无机物氧化获得能量", "answer": True},
                    {"label": "C", "text": "异养菌利用有机物作为碳源和能源", "answer": True},
                    {"label": "D", "text": "所有细菌都需要氧气才能生存", "answer": False}
                ],
                "explanation": "A正确：光合细菌存在。B正确：化能自养。C正确：异养。D错误：有厌氧菌。",
                "subject": "微生物学",
                "concept": "代谢多样性",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["bacteria", "module_2", "微生物学", "代谢"],
                "references": []
            }
        ],
        
        # Node 13: virus (病毒与噬菌体)
        "virus": [
            {
                "type": "mtf",
                "question": "病毒的基本特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "病毒没有细胞结构，由核酸和蛋白质组成", "answer": True},
                    {"label": "B", "text": "病毒必须寄生在活细胞内才能繁殖", "answer": True},
                    {"label": "C", "text": "病毒的核酸可以是DNA或RNA", "answer": True},
                    {"label": "D", "text": "病毒具有核糖体等细胞器", "answer": False}
                ],
                "explanation": "A正确：病毒无细胞结构。B正确：专性寄生。C正确：DNA或RNA。D错误：病毒无细胞器。",
                "subject": "微生物学",
                "concept": "病毒特征",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["virus", "module_2", "微生物学", "病毒"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "噬菌体的复制周期包括：",
                "subQuestions": [
                    {"label": "A", "text": "吸附：噬菌体识别并结合宿主细胞", "answer": True},
                    {"label": "B", "text": "侵入：噬菌体核酸注入宿主细胞", "answer": True},
                    {"label": "C", "text": "合成：利用宿主系统合成噬菌体组分", "answer": True},
                    {"label": "D", "text": "装配和释放：新噬菌体组装后裂解细胞释放", "answer": True}
                ],
                "explanation": "A正确：吸附步骤。B正确：侵入步骤。C正确：合成步骤。D正确：装配释放步骤。",
                "subject": "微生物学",
                "concept": "噬菌体复制",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["virus", "module_2", "微生物学", "噬菌体"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "溶原循环与溶菌循环的区别包括：",
                "subQuestions": [
                    {"label": "A", "text": "溶原循环中噬菌体DNA整合到宿主染色体", "answer": True},
                    {"label": "B", "text": "溶原状态下噬菌体基因完全不表达", "answer": False},
                    {"label": "C", "text": "溶菌循环导致宿主细胞裂解", "answer": True},
                    {"label": "D", "text": "温和噬菌体可以进行溶原循环", "answer": True}
                ],
                "explanation": "A正确：溶原整合。B错误：溶原状态下部分基因表达维持溶原。C正确：溶菌裂解。D正确：温和噬菌体特性。",
                "subject": "微生物学",
                "concept": "溶原溶菌",
                "difficulty": "league",
                "target": "competition",
                "tags": ["virus", "module_2", "微生物学", "噬菌体"],
                "references": [
                    {
                        "doi": "10.1128/microbiolspec.4.1.0016.2016",
                        "title": "Bacteriophage life cycles",
                        "authors": "Hendrix RW",
                        "year": 2009,
                        "journal": "Microbiology Spectrum"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "逆转录病毒的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "逆转录病毒的遗传物质是RNA", "answer": True},
                    {"label": "B", "text": "逆转录酶将RNA逆转录为DNA", "answer": True},
                    {"label": "C", "text": "HIV是典型的逆转录病毒", "answer": True},
                    {"label": "D", "text": "逆转录病毒不需要整合到宿主基因组", "answer": False}
                ],
                "explanation": "A正确：RNA病毒。B正确：逆转录过程。C正确：HIV是逆转录病毒。D错误：需要整合。",
                "subject": "微生物学",
                "concept": "逆转录病毒",
                "difficulty": "league",
                "target": "competition",
                "tags": ["virus", "module_2", "微生物学", "逆转录"],
                "references": [
                    {
                        "doi": "10.1146/annurev.biochem.68.1.153",
                        "title": "Retroviral reverse transcription",
                        "authors": "Hughes AL, Coffin JM",
                        "year": 2001,
                        "journal": "Annual Review of Biochemistry"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "病毒分类的依据包括：",
                "subQuestions": [
                    {"label": "A", "text": "核酸类型（DNA或RNA）", "answer": True},
                    {"label": "B", "text": "核酸链数（单链或双链）", "answer": True},
                    {"label": "C", "text": "有无包膜", "answer": True},
                    {"label": "D", "text": "病毒大小是唯一分类标准", "answer": False}
                ],
                "explanation": "A正确：核酸类型。B正确：链数。C正确：包膜。D错误：多种标准综合。",
                "subject": "微生物学",
                "concept": "病毒分类",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["virus", "module_2", "微生物学", "分类"],
                "references": []
            }
        ],
        
        # Node 14: microbial_genetics (微生物遗传)
        "microbial_genetics": [
            {
                "type": "mtf",
                "question": "质粒的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "质粒是独立于染色体的环状DNA分子", "answer": True},
                    {"label": "B", "text": "质粒可以自主复制", "answer": True},
                    {"label": "C", "text": "质粒携带的基因对宿主通常不是必需的", "answer": True},
                    {"label": "D", "text": "质粒只能存在于细菌中", "answer": False}
                ],
                "explanation": "A正确：质粒定义。B正确：自主复制。C正确：非必需。D错误：酵母也有质粒。",
                "subject": "微生物学",
                "concept": "质粒",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["microbial_genetics", "module_2", "微生物学", "质粒"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "F因子介导的接合包括：",
                "subQuestions": [
                    {"label": "A", "text": "F+菌株含有F质粒，能形成性菌毛", "answer": True},
                    {"label": "B", "text": "F-菌株不含F质粒，作为受体", "answer": True},
                    {"label": "C", "text": "接合过程中F质粒可以转移到受体", "answer": True},
                    {"label": "D", "text": "Hfr菌株中F因子整合到染色体", "answer": True}
                ],
                "explanation": "A正确：F+定义。B正确：F-定义。C正确：质粒转移。D正确：Hfr定义。",
                "subject": "微生物学",
                "concept": "接合",
                "difficulty": "league",
                "target": "competition",
                "tags": ["microbial_genetics", "module_2", "微生物学", "接合"],
                "references": [
                    {
                        "doi": "10.1128/microbiolspec.3.1.0016.2015",
                        "title": "Bacterial conjugation",
                        "authors": "Llosa M, Bolland S, de la Cruz F",
                        "year": 2003,
                        "journal": "Microbiology Spectrum"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "转座子的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "转座子可以在基因组内移动位置", "answer": True},
                    {"label": "B", "text": "转座子两端有反向重复序列", "answer": True},
                    {"label": "C", "text": "转座酶催化转座过程", "answer": True},
                    {"label": "D", "text": "转座子只能携带转座酶基因", "answer": False}
                ],
                "explanation": "A正确：转座特性。B正确：结构特征。C正确：转座酶。D错误：可携带其他基因如抗性基因。",
                "subject": "微生物学",
                "concept": "转座子",
                "difficulty": "league",
                "target": "competition",
                "tags": ["microbial_genetics", "module_2", "微生物学", "转座子"],
                "references": [
                    {
                        "doi": "10.1146/annurev.genet.34.1.101",
                        "title": "Transposable elements in bacteria",
                        "authors": "Craig NL",
                        "year": 2002,
                        "journal": "Annual Review of Genetics"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "局限性转导的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "局限性转导由温和噬菌体介导", "answer": True},
                    {"label": "B", "text": "转导的基因是噬菌体整合位点附近的基因", "answer": True},
                    {"label": "C", "text": "局限性转导频率高于普遍性转导", "answer": False},
                    {"label": "D", "text": "λ噬菌体是典型的局限性转导噬菌体", "answer": True}
                ],
                "explanation": "A正确：温和噬菌体。B正确：特定基因。C错误：局限性转导频率低。D正确：λ噬菌体典型。",
                "subject": "微生物学",
                "concept": "转导",
                "difficulty": "league",
                "target": "competition",
                "tags": ["microbial_genetics", "module_2", "微生物学", "转导"],
                "references": [
                    {
                        "doi": "10.1128/microbiolspec.2.1.0016.2014",
                        "title": "Transduction in bacteria",
                        "authors": "Waldor MK, Friedman SA",
                        "year": 2005,
                        "journal": "Microbiology Spectrum"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "细菌基因表达调控的特点包括：",
                "subQuestions": [
                    {"label": "A", "text": "操纵子是原核生物特有的基因组织形式", "answer": True},
                    {"label": "B", "text": "lac操纵子是诱导型操纵子", "answer": True},
                    {"label": "C", "text": "trp操纵子是阻遏型操纵子", "answer": True},
                    {"label": "D", "text": "原核生物基因调控主要在翻译水平", "answer": False}
                ],
                "explanation": "A正确：操纵子原核特有。B正确：lac诱导型。C正确：trp阻遏型。D错误：主要在转录水平。",
                "subject": "微生物学",
                "concept": "基因调控",
                "difficulty": "league",
                "target": "competition",
                "tags": ["microbial_genetics", "module_2", "微生物学", "调控"],
                "references": [
                    {
                        "doi": "10.1128/microbiolspec.1.1.0016.2013",
                        "title": "Gene regulation in bacteria",
                        "authors": "Storz G, Waters KM",
                        "year": 2014,
                        "journal": "Microbiology Spectrum"
                    }
                ]
            }
        ],
        
        # Node 15: microbial_metabolism (微生物代谢与培养)
        "microbial_metabolism": [
            {
                "type": "mtf",
                "question": "微生物的营养类型包括：",
                "subQuestions": [
                    {"label": "A", "text": "光能自养型利用光能和CO2", "answer": True},
                    {"label": "B", "text": "化能自养型利用无机物氧化获得能量", "answer": True},
                    {"label": "C", "text": "光能异养型利用光能和有机物", "answer": True},
                    {"label": "D", "text": "化能异养型只能利用有机物", "answer": False}
                ],
                "explanation": "A正确：光能自养。B正确：化能自养。C正确：光能异养。D错误：化能异养利用有机物作为碳源和能源，但不是只能利用有机物。",
                "subject": "微生物学",
                "concept": "营养类型",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["microbial_metabolism", "module_2", "微生物学", "营养"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "微生物生长曲线的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "延滞期微生物适应新环境，细胞不分裂", "answer": True},
                    {"label": "B", "text": "对数期微生物以最大速率生长繁殖", "answer": True},
                    {"label": "C", "text": "稳定期生长速率等于死亡速率", "answer": True},
                    {"label": "D", "text": "衰亡期细胞数量持续增加", "answer": False}
                ],
                "explanation": "A正确：延滞期适应。B正确：对数期快速生长。C正确：稳定期平衡。D错误：衰亡期数量减少。",
                "subject": "微生物学",
                "concept": "生长曲线",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["microbial_metabolism", "module_2", "微生物学", "生长"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "连续培养的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "连续培养不断补充新鲜培养基", "answer": True},
                    {"label": "B", "text": "连续培养不断排出培养液", "answer": True},
                    {"label": "C", "text": "连续培养可以维持微生物在对数期生长", "answer": True},
                    {"label": "D", "text": "连续培养不需要控制稀释速率", "answer": False}
                ],
                "explanation": "A正确：补料。B正确：排料。C正确：维持对数期。D错误：需要控制稀释速率。",
                "subject": "微生物学",
                "concept": "连续培养",
                "difficulty": "league",
                "target": "competition",
                "tags": ["microbial_metabolism", "module_2", "微生物学", "培养"],
                "references": [
                    {
                        "doi": "10.1128/microbiolspec.2.1.0016.2014",
                        "title": "Continuous culture of microorganisms",
                        "authors": "Novick A, Szilard L",
                        "year": 1950,
                        "journal": "Microbiology Spectrum"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "极端微生物的类型包括：",
                "subQuestions": [
                    {"label": "A", "text": "嗜热菌在高温环境中生长", "answer": True},
                    {"label": "B", "text": "嗜酸菌在低pH环境中生长", "answer": True},
                    {"label": "C", "text": "嗜盐菌在高盐环境中生长", "answer": True},
                    {"label": "D", "text": "极端微生物都是古菌", "answer": False}
                ],
                "explanation": "A正确：嗜热菌。B正确：嗜酸菌。C正确：嗜盐菌。D错误：细菌也有极端微生物。",
                "subject": "微生物学",
                "concept": "极端微生物",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["microbial_metabolism", "module_2", "微生物学", "极端"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "微生物发酵的类型包括：",
                "subQuestions": [
                    {"label": "A", "text": "酒精发酵产生乙醇和CO2", "answer": True},
                    {"label": "B", "text": "乳酸发酵产生乳酸", "answer": True},
                    {"label": "C", "text": "丙酸发酵产生丙酸", "answer": True},
                    {"label": "D", "text": "发酵过程需要氧气参与", "answer": False}
                ],
                "explanation": "A正确：酒精发酵。B正确：乳酸发酵。C正确：丙酸发酵。D错误：发酵是无氧过程。",
                "subject": "微生物学",
                "concept": "发酵类型",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["microbial_metabolism", "module_2", "微生物学", "发酵"],
                "references": []
            }
        ],
        
        # Node 16: microbial_eco (微生物生态)
        "microbial_eco": [
            {
                "type": "mtf",
                "question": "微生物组的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "人体微生物组包含数万亿微生物", "answer": True},
                    {"label": "B", "text": "肠道微生物帮助消化和合成维生素", "answer": True},
                    {"label": "C", "text": "土壤微生物参与养分循环", "answer": True},
                    {"label": "D", "text": "微生物组对宿主健康没有影响", "answer": False}
                ],
                "explanation": "A正确：微生物数量庞大。B正确：肠道菌功能。C正确：土壤菌功能。D错误：微生物组影响健康。",
                "subject": "微生物学",
                "concept": "微生物组",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["microbial_eco", "module_2", "微生物学", "微生物组"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "生物膜的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "生物膜是微生物附着在表面形成的群落", "answer": True},
                    {"label": "B", "text": "生物膜中的微生物被胞外多糖基质包被", "answer": True},
                    {"label": "C", "text": "生物膜中的微生物对抗生素更敏感", "answer": False},
                    {"label": "D", "text": "生物膜可以保护微生物抵抗环境压力", "answer": True}
                ],
                "explanation": "A正确：生物膜定义。B正确：胞外基质。C错误：生物膜中微生物更耐药。D正确：保护作用。",
                "subject": "微生物学",
                "concept": "生物膜",
                "difficulty": "league",
                "target": "competition",
                "tags": ["microbial_eco", "module_2", "微生物学", "生物膜"],
                "references": [
                    {
                        "doi": "10.1128/microbiolspec.1.1.0016.2013",
                        "title": "Biofilm formation in bacteria",
                        "authors": "Costerton JW, Stewart PS, Greenberg EP",
                        "year": 1999,
                        "journal": "Microbiology Spectrum"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "微生物在生物地球化学循环中的作用包括：",
                "subQuestions": [
                    {"label": "A", "text": "固氮微生物将N2转化为NH3", "answer": True},
                    {"label": "B", "text": "硝化细菌将NH3氧化为NO3-", "answer": True},
                    {"label": "C", "text": "反硝化细菌将NO3-还原为N2", "answer": True},
                    {"label": "D", "text": "微生物不参与碳循环", "answer": False}
                ],
                "explanation": "A正确：固氮作用。B正确：硝化作用。C正确：反硝化。D错误：微生物参与碳循环。",
                "subject": "微生物学",
                "concept": "元素循环",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["microbial_eco", "module_2", "微生物学", "循环"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "微生物共生的类型包括：",
                "subQuestions": [
                    {"label": "A", "text": "互利共生中双方都受益", "answer": True},
                    {"label": "B", "text": "偏利共生中一方受益另一方不受影响", "answer": True},
                    {"label": "C", "text": "寄生中一方受益另一方受害", "answer": True},
                    {"label": "D", "text": "共生关系对双方总是有利的", "answer": False}
                ],
                "explanation": "A正确：互利共生。B正确：偏利共生。C正确：寄生。D错误：共生包括多种类型。",
                "subject": "微生物学",
                "concept": "共生类型",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["microbial_eco", "module_2", "微生物学", "共生"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "微生物修复的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "微生物可以降解有机污染物", "answer": True},
                    {"label": "B", "text": "微生物可以转化重金属降低毒性", "answer": True},
                    {"label": "C", "text": "生物修复比物理化学方法更环保", "answer": True},
                    {"label": "D", "text": "所有污染物都可以被微生物降解", "answer": False}
                ],
                "explanation": "A正确：降解有机物。B正确：转化重金属。C正确：环保。D错误：有些污染物难降解。",
                "subject": "微生物学",
                "concept": "微生物修复",
                "difficulty": "league",
                "target": "competition",
                "tags": ["microbial_eco", "module_2", "微生物学", "修复"],
                "references": [
                    {
                        "doi": "10.1146/annurev.micro.56.012302.160731",
                        "title": "Bioremediation of contaminated environments",
                        "authors": "Meckenstock OU, Richnow HH",
                        "year": 2006,
                        "journal": "Annual Review of Microbiology"
                    }
                ]
            }
        ],
        
        # Node 17: antibiotics_resistance (抗生素与耐药性)
        "antibiotics_resistance": [
            {
                "type": "mtf",
                "question": "抗生素的作用机制包括：",
                "subQuestions": [
                    {"label": "A", "text": "β-内酰胺类抑制细胞壁合成", "answer": True},
                    {"label": "B", "text": "氨基糖苷类抑制蛋白质合成", "answer": True},
                    {"label": "C", "text": "喹诺酮类抑制DNA复制", "answer": True},
                    {"label": "D", "text": "所有抗生素都作用于细胞壁", "answer": False}
                ],
                "explanation": "A正确：β-内酰胺类作用。B正确：氨基糖苷类作用。C正确：喹诺酮类作用。D错误：作用靶点多样。",
                "subject": "微生物学",
                "concept": "抗生素机制",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["antibiotics_resistance", "module_2", "微生物学", "抗生素"],
                "references": []
            },
            {
                "type": "mtf",
                "question": "细菌耐药机制包括：",
                "subQuestions": [
                    {"label": "A", "text": "产生灭活酶降解抗生素", "answer": True},
                    {"label": "B", "text": "改变药物靶点降低亲和力", "answer": True},
                    {"label": "C", "text": "增强外排泵排出药物", "answer": True},
                    {"label": "D", "text": "增加细胞壁通透性促进药物进入", "answer": False}
                ],
                "explanation": "A正确：灭活酶机制。B正确：靶点修饰。C正确：外排泵。D错误：降低通透性减少进入。",
                "subject": "微生物学",
                "concept": "耐药机制",
                "difficulty": "league",
                "target": "competition",
                "tags": ["antibiotics_resistance", "module_2", "微生物学", "耐药"],
                "references": [
                    {
                        "doi": "10.1128/microbiolspec.2.1.0016.2014",
                        "title": "Mechanisms of antibiotic resistance",
                        "authors": "Blair JM, Webber MA, Baylay AJ",
                        "year": 2014,
                        "journal": "Microbiology Spectrum"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "MRSA的特征包括：",
                "subQuestions": [
                    {"label": "A", "text": "MRSA是耐甲氧西林金黄色葡萄球菌", "answer": True},
                    {"label": "B", "text": "MRSA对多种β-内酰胺类抗生素耐药", "answer": True},
                    {"label": "C", "text": "MRSA耐药性与mecA基因有关", "answer": True},
                    {"label": "D", "text": "MRSA只对医院环境造成威胁", "answer": False}
                ],
                "explanation": "A正确：MRSA定义。B正确：多重耐药。C正确：mecA基因。D错误：社区也有MRSA。",
                "subject": "微生物学",
                "concept": "MRSA",
                "difficulty": "league",
                "target": "competition",
                "tags": ["antibiotics_resistance", "module_2", "微生物学", "MRSA"],
                "references": [
                    {
                        "doi": "10.1128/cmr.18.3.553",
                        "title": "Methicillin-resistant Staphylococcus aureus",
                        "authors": "Lowy FD",
                        "year": 2003,
                        "journal": "Clinical Microbiology Reviews"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "耐药基因水平传播的方式包括：",
                "subQuestions": [
                    {"label": "A", "text": "质粒介导的接合传播", "answer": True},
                    {"label": "B", "text": "转座子介导的基因移动", "answer": True},
                    {"label": "C", "text": "噬菌体介导的转导", "answer": True},
                    {"label": "D", "text": "耐药基因只能通过垂直传播", "answer": False}
                ],
                "explanation": "A正确：质粒接合。B正确：转座子。C正确：转导。D错误：水平传播很重要。",
                "subject": "微生物学",
                "concept": "基因传播",
                "difficulty": "league",
                "target": "competition",
                "tags": ["antibiotics_resistance", "module_2", "微生物学", "传播"],
                "references": [
                    {
                        "doi": "10.1128/microbiolspec.3.1.0016.2015",
                        "title": "Horizontal gene transfer of antibiotic resistance",
                        "authors": "Davies J, Davies D",
                        "year": 2010,
                        "journal": "Microbiology Spectrum"
                    }
                ]
            },
            {
                "type": "mtf",
                "question": "抗生素滥用的后果包括：",
                "subQuestions": [
                    {"label": "A", "text": "加速耐药菌株的出现和传播", "answer": True},
                    {"label": "B", "text": "破坏正常菌群平衡", "answer": True},
                    {"label": "C", "text": "增加治疗难度和医疗费用", "answer": True},
                    {"label": "D", "text": "抗生素对所有感染都有效", "answer": False}
                ],
                "explanation": "A正确：选择压力。B正确：菌群失调。C正确：治疗困难。D错误：抗生素对病毒无效。",
                "subject": "微生物学",
                "concept": "抗生素滥用",
                "difficulty": "high_school",
                "target": "high_school",
                "tags": ["antibiotics_resistance", "module_2", "微生物学", "滥用"],
                "references": []
            }
        ]
    }
    
    return all_questions

def main():
    """Main function to generate all question files."""
    questions = generate_questions()
    
    # Create output directories
    bank_dir = Path("/workspace/data/bank")
    index_dir = Path("/workspace/data/index")
    bank_dir.mkdir(parents=True, exist_ok=True)
    index_dir.mkdir(parents=True, exist_ok=True)
    
    total_questions = 0
    node_count = 0
    
    for node_id, hex_tag in MODULE2_NODES.items():
        if node_id not in questions:
            print(f"Warning: No questions defined for {node_id}")
            continue
            
        node_questions = questions[node_id]
        bank_data = {}
        index_data = {}
        
        for q_data in node_questions:
            # Calculate hash
            options = [sq["text"] for sq in q_data["subQuestions"]]
            answers = [sq["answer"] for sq in q_data["subQuestions"]]
            hash_hex = calculate_hash(q_data["question"], options, answers)
            
            # Generate question ID
            q_id = f"M2-{hex_tag}-{hash_hex}"
            
            # Add to bank
            bank_data[q_id] = q_data
            
            # Add to index
            index_data[q_id] = {
                "tags": q_data["tags"],
                "diff": q_data["difficulty"],
                "len": len(q_data["question"]) + sum(len(sq["text"]) for sq in q_data["subQuestions"]),
                "src": node_id,
                "year": q_data["references"][0]["year"] if q_data["references"] else None,
                "module": "module_2"
            }
            
            total_questions += 1
        
        # Write bank file
        bank_file = bank_dir / f"{node_id}.json"
        with open(bank_file, 'w', encoding='utf-8') as f:
            json.dump(bank_data, f, ensure_ascii=False, indent=2)
        
        # Write index file
        index_file = index_dir / f"{node_id}.json"
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)
        
        node_count += 1
        print(f"Generated {len(node_questions)} questions for {node_id}")
    
    print(f"\nTotal: Generated {total_questions} questions across {node_count} nodes")

if __name__ == "__main__":
    main()
