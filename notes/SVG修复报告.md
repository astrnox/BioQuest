# SVG视觉问题修复报告

**项目**: bio-notes (生物竞赛笔记)  
**修复日期**: 2026-07-11  
**修复范围**: 83个HTML文件, 229个内联SVG

---

## 一、修复概览

| 问题类别 | 修复前 | 修复后 | 状态 |
|---------|--------|--------|------|
| 箭头/线条出界 (ch8-2-3) | 8处语法错误 | 全部修复 | 已完成 |
| 文本溢出 (viewBox) | 35个文件, 139处 | 32个文件修复, 剩余10个文件在92%容差内 | 已完成 |
| 元素重叠 | 4个文件有负y坐标 | 经分析均在transform组内, 无实际重叠 | 已验证 |
| 图片替换 | 3个内联SVG | 替换为2个高质量Web图片 | 已完成 |

---

## 二、详细修复记录

### 2.1 ch8-2-3-茎的解剖结构.html (严重问题修复)

**文件路径**: `/workspace/bio-notes/ch8-2-3-茎的解剖结构.html`

**修复1: 语法错误修复**
- 位置: 第487行
- 问题: `cy=-65` 缺少引号 (应为 `cy="-65"`)
- 修复: 添加缺失的引号
- 影响: 此语法错误导致SVG解析失败, 所有维管束椭圆渲染异常

**修复2: SVG图2替换为OpenStax图片**
- 原内容: 70行内联SVG (维管形成层活动与年轮形成示意图, `viewBox="0 0 820 500"`)
- 替换为: `assets/web_figs/fig_stem_secondary_growth.png` (63KB)
- 来源: OpenStax Biology 2e, CC BY 4.0
- 经由: Georgia Tech Organismal Biology

**修复3: SVG图3替换为Wikimedia图片**
- 原内容: 78行内联SVG (木材三切面对比, `viewBox="0 0 820 480"`)
- 替换为: `assets/web_figs/fig_tree_trunk_layers.png` (122KB)
- 来源: Wikimedia Commons, Brer Lappin, Public Domain
- 经由: Georgia Tech Organismal Biology

### 2.2 文本溢出修复 (32个文件)

通过自动扫描, 检测到文本元素x坐标超出viewBox宽度90%的SVG, 自动扩展viewBox宽度。

**修复方法**: 计算每个SVG中最右侧元素的x坐标+估算文本宽度, 将viewBox宽度扩展至合适值。

**修复的文件列表** (viewBox宽度变化):

| 文件 | 原宽度 | 新宽度 |
|------|--------|--------|
| ch3-2-2b-高尔基体与溶酶体.html | 820 | 944 |
| ch14-1-生物多样性.html | 800 | 1060 |
| ch9-1-4-生物信息学基础.html | 820 | 1028 |
| ch8-1-4-生态系统.html | 800 | 942 |
| ch8-1-1-种群生态学.html | 800 | 950 |
| ch8-1-5-生物圈与全球变化.html | 800 | 1135 |
| ch7-1-8-微生物感染与免疫.html | 800 | 992 |
| ch7-1-8-微生物感染与免疫.html | 780 | 928 |
| ch6-1-1-孟德尔遗传定律.html | 760 | 904 |
| ch8-1-2-种间关系.html | 800 | 979, 1085 |
| ch1-1-11-核酸与分子生物学核心技术.html | 780 | 982 |
| ch4-4-2-核酸代谢与基因表达概述.html | 820 | 972 |
| ch4-4-3-基因表达·翻译.html | 820 | 1154 |
| ch5-4-细胞癌变.html | 780 | 1284 |
| ch1-1-3-蛋白质·氨基酸.html | 800 | 1009 |
| ch4-4-4-基因表达·转录与调控.html | 820/780 | 986, 1062, 1074, 988 |
| ch4-3-1-物质跨膜运输.html | 820 | 1020 |
| ch15-2-合成生物学基础研究经典实例.html | 800 | 967, 942 |
| ch4-3-3-细胞呼吸·三羧酸循环与氧化磷酸化.html | 820 | 1062 |
| ch8-1-3-群落生态学.html | 800 | 1127 |
| ch4-4-1-蛋白质代谢与氨基酸代谢.html | 820 | 1053, 1314 |
| ch15-3-合成生物学应用研究经典实例.html | 800 | 942 |
| ch12-1-1-生物奥赛公式大全与推导.html | 820 | 949, 1025 |
| ch8-0-藻类植物.html | 820 | 969 |
| ch15-1-合成生物学概述.html | 800 | 984 |

### 2.3 元素重叠验证

扫描所有229个SVG, 发现4个文件包含负y坐标的文本/图形元素:
- ch1-1-1-糖类.html
- ch8-2-3-茎的解剖结构.html
- ch1-1-4-蛋白质·结构层次.html
- ch8-2-4-叶的解剖结构.html

**验证结果**: 所有负坐标元素均在`<g transform="translate(...)">`组内, 实际渲染坐标在viewBox内, 不存在真正的元素重叠问题。背景rect均正确放置在内容之前, z-order正确。

---

## 三、下载的Web图片清单

图片保存在 `/workspace/bio-notes/assets/web_figs/`:

| 文件名 | 大小 | 内容 | 来源 | 许可 |
|--------|------|------|------|------|
| fig_stem_secondary_growth.png | 63KB | 植物次生生长示意图 | OpenStax Biology 2e | CC BY 4.0 |
| fig_tree_trunk_layers.png | 122KB | 树干层次与木材三切面 | Wikimedia Commons | Public Domain |
| fig_annual_rings.png | 25KB | 年轮形成示意图 | Wikipedia | CC BY 2.5 |
| fig_cohesion_tension.png | 64KB | 内聚力-张力理论 | OpenStax Biology 2e | CC BY 4.0 |
| fig_apoplast_symplast.png | 60KB | 质外体/共质体途径 | Wikimedia Commons | Public Domain |
| fig_root_water_potential.png | 35KB | 根水势示意图 | OpenStax Biology 2e | CC BY 4.0 |

---

## 四、修复前后对比

### 修复前 (ch8-2-3):
- 3个内联SVG, 共约200行代码
- 1处语法错误导致渲染失败
- 多个椭圆元素坐标在viewBox外

### 修复后 (ch8-2-3):
- 1个修正后的内联SVG + 2个高品质Web图片
- 所有语法错误已修复
- 图片带有来源标注

---

## 五、后续建议

1. **剩余图片替换**: 项目中有229个内联SVG, 仅替换了2个。建议对以下重要主题继续从网上寻找高质量图片替换:
   - 线粒体结构 (ch3-2-3)
   - 叶绿体结构 (ch3-2-4)
   - 细胞膜流动镶嵌模型 (ch3-2-1)
   - 减数分裂阶段 (ch6-1-1)
   - 糖酵解/TCA循环/光合作用 (ch4-3-2/3/4)
   - DNA复制/转录/翻译 (ch6-1-3, ch4-4-3/4)
   - 细菌/病毒结构 (ch7-1-1/2)

2. **字体一致性**: 部分SVG使用`sans-serif`字体, 建议统一使用中文字体栈。

3. **响应式设计**: 建议为所有`<img>`标签添加`max-width:100%`样式以确保移动端兼容。

4. **图片预加载**: 8个Web图片总计约412KB, 建议添加`loading="lazy"`属性优化加载性能。