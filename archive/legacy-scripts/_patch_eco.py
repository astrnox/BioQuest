# -*- coding: utf-8 -*-
with open('_BUILD_ECO_v3.py','r',encoding='utf-8') as f:
    code = f.read()

new_q = '''
ET.append(("芬兰DIABIMMUNE出生队列T1D 1型糖尿病高危HLA儿童n=22例7岁前进展T1D vs匹配对照n=22未发病 纵向每3个月粪便16S宏基因组+血清自身抗体：T1D发病前12个月α多样性Shannon HC=7.2 vs T1D=5.6显著↓；LEfSe LDA>4发病前富集Bacteroides dorei多雷拟杆菌T1D 18.2% vs HC 2.1%↑8.7倍、Parabacteroides distasonis狄氏副拟杆菌9.8% vs HC<1%；HC健康富集产丁酸Faecalibacterium prausnitzii 12.6% vs T1D 1.8%↓7倍、Bifidobacterium longum长双歧6.1% vs T1D 0.9%↓6.8倍；血清GAD65谷氨酸脱羧酶65kD自身抗体T1D 68%阳性HC 0%；B.dorei灌胃NOD小鼠4周胰岛炎评分3.8 vs PBS 1.9 糖尿病发病率PBS=28% B.dorei=71%。T1D微生态失调：产丁酸双歧杆菌/普拉梭菌↓+B.dorei狄氏/Parabacteroides富集→肠屏障↑LPS内毒素→先天免疫TLR4激活→胰岛β细胞炎症→自身反应性T破坏→自身抗体阳性→T1D发病菌群失调先于症状12个月早期预测","芬兰DIABIMMUNE出生队列T1D巢式病例对照HLA-DR3/DR4高危基因型前瞻性随访7岁T1D发病前12个月：α多样性↓肠道菌群结构失调显著；B.dorei多雷拟杆菌↑8.7倍P.distasonis↑33倍E.coli↑9倍革兰氏阴性促炎菌富集；产丁酸F.prausnitzii普拉梭菌↓7倍B.longum长双歧↓6.8倍Akkermansia嗜黏蛋白↓14倍肠道屏障保护有益菌丢失；血清GAD65/IA-2自身抗体阳转；NOD小鼠灌胃B.dorei分离株验证因果：胰岛炎评分1.9→3.8淋巴细胞浸润>75% 24周糖尿病累计发病率28%→71%显著升高。机制：菌群失调→肠紧密连接通透性↑肠漏→革兰氏阴性菌高免疫原性LPS透过屏障→胰腺引流DC TLR4-MyD88-NFκB激活→IL-1β/IL-6/IL-12/IL-23促炎因子↑→Th1/Th17极化Treg Foxp3+抑制↓免疫耐受打破→自身反应性CD8+CTL+CD4+Th1浸润胰岛识别β细胞GAD65/胰岛素原/IA-2/ZnT8自身抗原肽→穿孔素颗粒酶FasL凋亡特异性杀伤β细胞丢失>80%→胰岛素绝对缺乏T1D。意义：菌群失调先于临床12-24个月+B.dorei/F.prausnitzii比值作为T1D风险评分早期非侵入预测标志物；产丁酸益生菌+Akk+B.dorei噬菌体鸡尾酒干预预防。","芬兰DIABIMMUNE T1D队列B.dorei多雷拟杆菌↑8.7倍产丁酸F.prausnitzii↓7倍 Akkermansia↓14倍 肠屏障LPS→TLR4→Th1/Th17→胰岛β细胞破坏NOD小鼠功能因果"))
'''

target = 'print(f"ET微生物生态已添加题数: {len(ET)}")'
assert target in code, "Target line not found!"

code = code.replace(target, new_q + '\n' + target)

with open('_BUILD_ECO_v3.py','w',encoding='utf-8') as f:
    f.write(code)
print("Patch applied successfully!")
