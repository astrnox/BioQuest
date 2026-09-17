#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为期刊原图生成'带批注解析图'（-annotated.jpg）。
批注坐标系为相对坐标(0~1)，参考原图内容人工标定。输出与题目解析中的 @@ANNOTATED_IMAGE 路径一致。"""
import os, glob
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, "fonts", "lxgw-wenkai.ttf")
OUT_SUFFIX = "-annotated"

PALETTE = {
    "red":   (231, 76, 60),
    "green": (39, 174, 96),
    "blue":  (41, 128, 185),
    "orange":(243, 156, 18),
    "purple":(142, 68, 173),
    "brown": (139, 90, 43),
}

def wrap(text, font, max_w):
    lines, cur = [], ""
    for ch in text:
        if ch == "\n":
            lines.append(cur); cur = ""; continue
        if font.getlength(cur + ch) > max_w:
            lines.append(cur); cur = ch
        else:
            cur += ch
    if cur: lines.append(cur)
    return lines

def draw_annotation(img, x0, y0, x1, y1, text, color, font, leader=None):
    W, H = img.size
    d = ImageDraw.Draw(img, "RGBA")
    box = [int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)]
    col = PALETTE.get(color, PALETTE["blue"])
    # 半透明填充 + 边框
    d.rectangle(box, fill=col + (38,), outline=col + (230,), width=max(2, int(W / 400)))
    # 顶角小徽标
    r = max(6, int(W / 160))
    d.ellipse([box[0] - r // 2, box[1] - r // 2, box[0] + r, box[1] + r], fill=col + (255,))
    # 引线：从框顶边中点向外
    lx, ly = (box[0] + box[2]) // 2, box[1]
    tx, ty = box[0], box[1] - int(H * 0.018)
    if leader:
        tx, ty = int(leader[0] * W), int(leader[1] * H)
    d.line([lx, ly, tx, ty], fill=col + (255,), width=max(2, int(W / 300)))
    # 标签：白底圆角矩形 + 深色文字（置于框上方，若空间不足则置于框内顶部）
    fs = max(13, int(W / 58))
    f = ImageFont.truetype(FONT, fs)
    pad = max(6, int(W / 220))
    maxw = min(int(W * 0.62), box[2] - box[0] + 2 * pad + int(W * 0.22))
    lines = wrap(text, f, maxw)
    th = sum(f.getbbox(l)[3] - f.getbbox(l)[1] for l in lines) + pad * 2 * len(lines)
    tw = max((f.getlength(l) for l in lines), default=0) + pad * 2
    label_y0 = box[1] - th - int(H * 0.012)
    if label_y0 < int(H * 0.01):
        label_y0 = box[1] + 4  # 空间不足，改放框内顶部
        in_box = True
    else:
        in_box = False
    lx0 = max(0, tx - tw // 2)
    lx0 = min(lx0, W - tw - 2)
    draw_label(img, lx0, label_y0, tw, th, lines, f, col, pad)
    if in_box:
        pass  # 文字已在框内：改用白色文字，覆盖填充色
        d.rectangle(box, fill=(0, 0, 0, 10))
    return lx0, label_y0, tw, th

def draw_label(img, x, y, w, h, lines, font, col, pad):
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([x, y, x + w, y + h], radius=int(h * 0.25), fill=(255, 255, 255, 235))
    d.rounded_rectangle([x, y, x + w, y + h], radius=int(h * 0.25), outline=col + (255,), width=max(1, int(w / 300)))
    ty = y + pad
    for line in lines:
        bb = font.getbbox(line)
        d.text((x + w / 2 - (bb[2] - bb[0]) / 2, ty), line, font=font, fill=(20, 20, 20, 255))
        ty += (bb[3] - bb[1]) + pad * 2

def bottom_banner(img, text):
    W, H = img.size
    fs = max(12, int(W / 60))
    f = ImageFont.truetype(FONT, fs)
    d = ImageDraw.Draw(img, "RGBA")
    bh = int(H * 0.055) + 6
    d.rectangle([0, H - bh, W, H], fill=(250, 250, 250, 235))
    d.line([0, H - bh, W, H - bh], fill=(180, 180, 180, 255), width=1)
    d.text((W / 2, H - bh / 2), text, font=f, fill=(90, 90, 90, 255), anchor="mm")

JOBS = [
    # (src, text-banner, [(x0,y0,x1,y1,text,color)] )
    ("assets/questions/M1-02-30bbc833/fig1.jpg", "图注：Wei G, Biochem Soc Trans 2024, Fig.1（CC BY）",
     [(0.06, 0.16, 0.42, 0.30, "Writing/Erasing 循环：METTL3/METTL14 写入、FTO 擦除", "green"),
      (0.24, 0.44, 0.76, 0.52, "YTHDF1/2/3：YTH 结构域读取 m6A（促翻译/促降解）", "blue"),
      (0.20, 0.80, 0.78, 0.90, "IGF2BP1/2/3：KH 结构域结合 m6A，稳定 mRNA", "purple")]),
    ("assets/questions/photosynthesis/fig1-src.jpg", "图注：Wey LT et al., Plant Physiology 2026, Fig.1（CC BY）",
     [(0.02, 0.30, 0.16, 0.62, "PSII：水裂解放 O₂ 供电子", "green"),
      (0.26, 0.30, 0.40, 0.62, "PQ 库→Cyt b₆f：泵 H⁺ 建 ΔpH", "blue"),
      (0.48, 0.28, 0.60, 0.60, "NDH-1：环式流入口（只产 ΔpH）", "orange"),
      (0.66, 0.25, 0.84, 0.60, "PSI→Fd→FNR→NADPH（线性流）", "red"),
      (0.88, 0.30, 0.98, 0.62, "ATP 合酶：H⁺ 回流产 ATP", "purple")]),
    ("assets/questions/mendel/fig1-src.jpg", "图注：Lv W et al., Genome Biology 2026, Fig.1（CC BY）",
     [(0.03, 0.02, 0.30, 0.10, "(A) 5 个超级人群", "green"),
      (0.33, 0.02, 0.60, 0.10, "(B) 26 个精细人群", "green"),
      (0.63, 0.02, 0.98, 0.12, "(C-D) 染色体间 LD（chr14↔chr22，r²>0.8）", "red"),
      (0.06, 0.20, 0.56, 0.32, "(E) 等位基因频率与随机组合预期", "blue"),
      (0.06, 0.38, 0.56, 0.56, "(F) 预期 vs 观察基因型计数", "orange"),
      (0.16, 0.62, 0.86, 0.76, "(G) 观察≠预期：P<2.2×10⁻¹⁶，等位基因非随机组合", "red"),
      (0.12, 0.86, 0.90, 0.97, "解释：群体分层/混合等可产生染色体间 LD（非物理连锁）", "purple")]),
    ("assets/questions/M4-01-516222a8/fig1.jpg", "图注：Salem N et al., Nature 2025, Fig.4（CC BY）",
     [(0.03, 0.10, 0.30, 0.42, "(a) 欧亚古代个体尼安德特血统最高（~2.3%）", "red"),
      (0.03, 0.44, 0.30, 0.72, "(a) 撒哈拉以南古代个体≈0%（Mota、Shum Laka）", "blue"),
      (0.42, 0.05, 0.72, 0.20, "(b) 采样地理位置", "green"),
      (0.66, 0.30, 0.98, 0.50, "(c) 混合图：38%/62% 血统比", "orange"),
      (0.66, 0.52, 0.98, 0.78, "(c) Taforalt←欧亚/近东谱系；Takarkori←7% 北非基因流", "purple")]),
    ("assets/questions/M3-01-a898fe16/fig1.jpg", "图注：Mitra A et al., Front Immunol 2023, Fig.1（CC BY）",
     [(0.015, 0.06, 0.30, 0.44, "(A) 天然 TCR：需 MHC I 呈递抗原", "blue"),
      (0.015, 0.52, 0.30, 0.86, "(A) CD28 独立共刺激（B7-2/CD86）", "green"),
      (0.34, 0.10, 0.72, 0.40, "(B) CAR：scFv 直接结合肿瘤抗原（MHC 非限制）", "red"),
      (0.40, 0.48, 0.72, 0.70, "(B) 共刺激域 CD28/4-1BB + CD3ζ 集成", "orange"),
      (0.74, 0.12, 0.99, 0.60, "(C) scFv 源自抗体 VH/VL 可变区", "purple")]),
    ("assets/questions/krebs_cycle/fig1-src.jpg", "图注：Sarkar S et al., J Biomed Sci 2025, Fig.1（CC BY）",
     [(0.02, 0.04, 0.40, 0.10, "肿瘤细胞：TCA 循环+糖酵解并存", "green"),
      (0.18, 0.28, 0.42, 0.42, "IDH*/SDH*/FH* 突变→D-2HG/琥珀酸/富马酸蓄积（红）", "red"),
      (0.05, 0.52, 0.34, 0.64, "糖酵解：葡萄糖→乳酸（Warburg）", "blue"),
      (0.56, 0.42, 0.98, 0.60, "免疫细胞：衣康酸（Itaconate）生成", "green"),
      (0.02, 0.80, 0.34, 0.96, "插入图：肿瘤微环境（TME）", "purple")]),
    ("assets/questions/M2-01-f05ce501/fig1.jpg", "图注：Zhu Y et al., Genes 2026, Fig.4（CC BY）",
     [(0.005, 0.02, 0.31, 0.30, "1. DNB 点阵芯片（spot≈220nm）", "green"),
      (0.335, 0.02, 0.64, 0.30, "2. CID 空间编码测序", "blue"),
      (0.67, 0.02, 0.995, 0.30, "3. polyT-UMI-CID 捕获探针", "orange"),
      (0.005, 0.36, 0.31, 0.62, "4. 文库构建与测序", "purple"),
      (0.335, 0.36, 0.64, 0.62, "5. 组织原位捕获 mRNA→cDNA", "red"),
      (0.67, 0.36, 0.995, 0.62, "6. 空间分辨率表达图谱", "green"),
      (0.05, 0.78, 0.95, 0.92, "全程保留空间坐标：无需解离组织，区别于 scRNA-seq", "blue")]),
    ("assets/questions/gene_regulation/fig1-src.jpg", "图注：Karkare K et al., Mol Biol Evol 2021, Fig.1（CC BY）",
     [(0.005, 0.06, 0.50, 0.24, "(A) 热图：4 种进化环境×6 重复群体 lacI⁻ 频率（白=高频率）", "red"),
      (0.005, 0.86, 0.50, 0.97, "波动环境（G_L/L_G）中 lacI⁻ 高频出现", "orange"),
      (0.56, 0.12, 0.995, 0.30, "(B) lacI⁻ 适合度效应：Lac +0.08、G/L +0.04、Glu −0.04", "blue"),
      (0.56, 0.82, 0.995, 0.97, "环境依赖：乳糖为正选择、葡萄糖为负选择", "purple")]),
    ("assets/questions/krebs_cycle/onco-epi.jpg", "图注：Sarkar S et al., J Biomed Sci 2025, Fig.2（CC BY）",
     [(0.36, 0.42, 0.70, 0.56, "枢纽：2-HG/富马酸/琥珀酸蓄积", "red"),
      (0.02, 0.02, 0.40, 0.14, "表观遗传：抑制 TET/JMJD→超甲基化", "green"),
      (0.02, 0.30, 0.40, 0.46, "伪缺氧：抑制 PHD→HIF-1α 稳定", "blue"),
      (0.55, 0.02, 0.98, 0.14, "异常代谢：mIDH1/2→2-HG", "orange"),
      (0.55, 0.74, 0.98, 0.88, "基因组不稳定：DNA 修复下降", "purple")]),
    ("assets/questions/krebs_cycle/onco-immune.jpg", "图注：Sarkar S et al., J Biomed Sci 2025, Fig.3（CC BY）",
     [(0.36, 0.44, 0.66, 0.56, "中心：TCA 循环（免疫代谢枢纽）", "red"),
      (0.02, 0.30, 0.40, 0.44, "衣康酸→SDH✕+CD8⁺ 耗竭（PD-1/TIM3↑）", "purple"),
      (0.60, 0.04, 0.98, 0.18, "α-KG→CD8⁺ 增殖/IFN-γ；2-HG→Th17↑、NK↓", "green"),
      (0.56, 0.80, 0.98, 0.95, "琥珀酸→SUCNR1→TAM 促瘤、T 耗竭、IFN-γ↓", "blue"),
      (0.02, 0.80, 0.40, 0.95, "富马酸→ZAP70 琥珀酰化→T 活化↓", "orange")]),
    ("assets/questions/molecular_evo/adna-pca.jpg", "图注：Salem N et al., Nature 2025, Fig.2（CC BY）",
     [(0.25, 0.04, 0.95, 0.14, "上部：北非（摩洛哥）与近东人群（PC1 高）", "blue"),
      (0.10, 0.78, 0.95, 0.90, "下部：西非/中非觅食者（PC1 低）", "green"),
      (0.02, 0.40, 0.40, 0.52, "PC1（纵轴，8.54%）反映撒哈拉南北分化", "red"),
      (0.02, 0.10, 0.16, 0.70, "PC2（横轴，0.53%）反映东非-北非梯度", "orange"),
      (0.70, 0.02, 0.98, 0.22, "右上插图：采样点地理", "purple")]),
    ("assets/questions/gene_regulation/lac-fitness.jpg", "图注：Karkare K et al., Mol Biol Evol 2021, Fig.5（CC BY）",
     [(0.005, 0.06, 0.22, 0.80, "A 祖先株", "blue"),
      (0.26, 0.06, 0.48, 0.80, "B EV^lacI⁻（乳糖中滞后↑变异）", "red"),
      (0.51, 0.06, 0.73, 0.80, "C EV^lacI⁺（双曲线重合）", "green"),
      (0.76, 0.06, 0.995, 0.86, "D 三者对比：绿=lacI⁻ 乳糖中滞后", "orange"),
      (0.05, 0.90, 0.95, 0.98, "横轴 Time(h)、纵轴 OD：滞后反映基因×环境×背景互作", "purple")]),
    ("assets/questions/cell_cycle/cdk-cyclin.jpg", "图注：Pellarin I et al., Signal Transd Target Ther 2025, Fig.3（CC BY）",
     [(0.02, 0.02, 0.60, 0.10, "生长因子信号：EGFR/TKR→RAS-ERK 与 PI3K-AKT-mTOR", "green"),
      (0.46, 0.34, 0.86, 0.50, "CycD-CDK4/6→CycE-CDK2 磷酸化 Rb→释放 E2F（限制点）", "red"),
      (0.06, 0.42, 0.34, 0.58, "p16/p21/p27/p57：CKI 直接抑制 CDK", "orange"),
      (0.30, 0.78, 0.72, 0.92, "G2/M：CycB-CDK1——Wee1/Myt1 抑制、CDC25 激活", "blue"),
      (0.62, 0.52, 0.97, 0.68, "S 期：CycA-CDK2 维持复制进程", "purple")]),
    ("assets/questions/gene_regulation/dsb-repair.jpg", "图注：Li Q et al., Signal Transd Target Ther 2023, Fig.3（CC BY）",
     [(0.005, 0.10, 0.30, 0.50, "NHEJ：Ku70/80→DNA-PKcs→XRCC4-LigIV（G1 主导，产生 indel）", "blue"),
      (0.34, 0.14, 0.66, 0.60, "HR：末端切除（EXO1）→RAD51→姊妹染色单体模板（S/G2，精确）", "green"),
      (0.70, 0.14, 0.995, 0.60, "TMEJ（Polθ）与 SSA（RAD52）备选通路", "orange"),
      (0.05, 0.86, 0.95, 0.97, "中央抑制剂框：DNA-PKcs/ATR/ATM/RAD51/Polθ 抑制剂", "purple")]),
    ("assets/questions/cell_cycle/dna-checkpoint.jpg", "图注：Li Q et al., Signal Transd Target Ther 2023, Fig.4（CC BY）",
     [(0.005, 0.04, 0.40, 0.16, "左：DSB→ATM（传感器）", "blue"),
      (0.55, 0.04, 0.995, 0.16, "右：ssDNA/复制应激→ATR（传感器）", "green"),
      (0.02, 0.20, 0.40, 0.32, "ATM→CHK2→p53/p21：G1 阻滞", "red"),
      (0.55, 0.20, 0.995, 0.32, "ATR→CHK1→CDC25A↓：S 期阻滞", "orange"),
      (0.05, 0.60, 0.60, 0.74, "G2/M：CHK1→CDC25C 失活 + WEE1/PKMYT1", "purple"),
      (0.02, 0.90, 0.98, 0.98, "效应面：CDK4/6、CDK2、CDK1 分层受控（底部为各抑制剂箱）", "brown")]),
    ("assets/questions/oxidative_phos/oxphos-uncoupler.jpg", "图注：Wang J et al., Front Physiol 2026, Fig.1（CC BY）",
     [(0.005, 0.02, 0.30, 0.14, "A 对照：红亮绿弱=高膜电位", "green"),
      (0.005, 0.38, 0.30, 0.52, "A CCCP 行（解偶联）：红↓绿↑", "red"),
      (0.005, 0.72, 0.30, 0.86, "A BA 行（ANT 组）：红↓绿↑", "blue"),
      (0.34, 0.02, 0.99, 0.26, "B/C 定量：红/绿比显著下降（****P<0.0001）", "orange"),
      (0.34, 0.55, 0.99, 0.80, "ΔΨm 受损；解偶联≠抑制电子传递链", "purple")]),
    ("assets/questions/rna_biology/m6a-stability.jpg", "图注：Wei G, Biochem Soc Trans 2024, Fig.2（CC BY）",
     [(0.03, 0.06, 0.40, 0.16, "(A) 核内：YTHDC1→exosome（降解）", "red"),
      (0.03, 0.28, 0.40, 0.40, "(A) 胞质：YTHDF→脱腺苷化/内切/脱帽", "blue"),
      (0.03, 0.58, 0.40, 0.70, "(B) 核内：YTHDC1 多聚桥接（保护）", "green"),
      (0.03, 0.82, 0.40, 0.92, "(B) 胞质：IGF2BP 结合 m6A（稳定）", "purple"),
      (0.50, 0.70, 0.97, 0.86, "同一 m6A 兼可'降解'或'稳定'——命运取决于读出器", "orange")]),
    ("assets/questions/molecular_evo/ld-clusters.jpg", "图注：Lv W et al., Genome Biology 2026, Fig.3（CC BY）",
     [(0.05, 0.02, 0.95, 0.10, "层次聚类树：分支高度=LD 谱距离（0-2500）", "green"),
      (0.02, 0.40, 0.30, 0.52, "EUR/EAS/SAS：大洲内人群优先聚类", "blue"),
      (0.34, 0.62, 0.70, 0.74, "AFR/AMR：结构分层（非洲自成支系）", "orange"),
      (0.76, 0.30, 0.99, 0.44, "PEL：长分支孤立（瓶颈/奠基者效应）", "red"),
      (0.05, 0.90, 0.95, 0.98, "LD 谱聚类揭示群体人口历史（瓶颈/混血）", "purple")]),
]

def main():
    for src, banner, anns in JOBS:
        p = os.path.join(ROOT, src)
        if not os.path.exists(p):
            print("SKIP (missing):", src); continue
        img = Image.open(p).convert("RGB")
        W, H = img.size
        base = max(14, int(W / 46))
        f = ImageFont.truetype(FONT, base)
        for x0, y0, x1, y1, text, color in anns:
            draw_annotation(img, x0, y0, x1, y1, text, color, f)
        bottom_banner(img, banner)
        out = os.path.splitext(p)[0] + OUT_SUFFIX + ".jpg"
        img.save(out, "JPEG", quality=88)
        print("OK", out.replace(ROOT + "/", ""), img.size)
    print("DONE")

if __name__ == "__main__":
    main()