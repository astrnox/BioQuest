/**
 * 题目图片渲染支持（v1.1.1）：isChartImageSrc 判定
 *
 * 问题背景：题目图片以本地相对路径（如 assets/questions/<id>/fig1.png）存放，
 * 但此前 renderChart 只认 data URI / http(s) 绝对地址，导致题干本地图片不渲染。
 * 修复：新增 window.BioQuest.isChartImageSrc，识别 data URI / http(s) / 本地图片
 * 路径（png/jpg/jpeg/webp/gif/svg，允许 ?query / #hash），renderChart 复用该判定。
 *
 * 验证矩阵：
 *   1. 本地相对路径各类格式 → true（png/jpg/jpeg/webp/gif/svg，含带查询串/锚点）
 *   2. data URI / http(s) 绝对地址 → true（保持原有行为）
 *   3. Markdown 表格 / 纯文本（不满足图片签名）→ false（不误伤表格与文本描述）
 *   4. 非字符串 / 空 → false
 */
'use strict';

const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
require(path.join(ROOT, 'js/utils.js'));
const isChartImageSrc = window.BioQuest.isChartImageSrc;

describe('题目图片渲染：isChartImageSrc 格式判定', () => {
  test('本地相对路径图片（组合格式）为 true', () => {
    expect(isChartImageSrc('assets/questions/M4-01-abc/fig1.png')).toBe(true);
    expect(isChartImageSrc('assets/questions/M4-01-abc/fig1.svg')).toBe(true);
    expect(isChartImageSrc('assets/questions/M4-01-abc/fig1.jpg')).toBe(true);
    expect(isChartImageSrc('assets/questions/M4-01-abc/fig1.jpeg')).toBe(true);
    expect(isChartImageSrc('assets/questions/M4-01-abc/fig1.webp')).toBe(true);
    expect(isChartImageSrc('assets/questions/M4-01-abc/fig1.gif')).toBe(true);
  });

  test('相对/绝对路径、带查询参数或锚点的图片路径为 true', () => {
    expect(isChartImageSrc('./fig1.png')).toBe(true);
    expect(isChartImageSrc('../img/chart.svg')).toBe(true);
    expect(isChartImageSrc('assets/questions/x/fig1.png?v=2')).toBe(true);
    expect(isChartImageSrc('assets/questions/x/fig1.svg#panel-a')).toBe(true);
  });

  test('data URI 与 http(s) 绝对地址保持支持', () => {
    expect(isChartImageSrc('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==')).toBe(true);
    expect(isChartImageSrc('https://cdn.ncbi.nlm.nih.gov/pmc/blobs/x/fig1.png')).toBe(true);
    expect(isChartImageSrc('http://example.com/a.webp')).toBe(true);
  });

  test('Markdown 表格 / 纯文本 / 空 / 非字符串为 false', () => {
    expect(isChartImageSrc('| 组别 | 对照组 | 实验组 |\n|---|---|---|')).toBe(false);
    expect(isChartImageSrc('纯文本描述：野生型 vs 敲除组 mRNA 相对量 1.0 vs 0.4')).toBe(false);
    expect(isChartImageSrc('  ')).toBe(false);
    expect(isChartImageSrc(null)).toBe(false);
    expect(isChartImageSrc(undefined)).toBe(false);
    expect(isChartImageSrc(123)).toBe(false);
  });
});