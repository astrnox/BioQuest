#!/usr/bin/env node
// 从 PMC 文章页提取 figure 原图（CDN blob URL）并下载
// 用法: node scripts/fetch-pmc-figure.mjs <PMCID> <figureNum> <outPath>
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROXY = process.env.https_proxy || process.env.HTTPS_PROXY || '';

function getProxy(urlStr) {
  if (!PROXY) return null;
  const u = new URL(urlStr);
  const p = new URL(PROXY);
  return { hostname: p.hostname, port: p.port };
}

function fetchUrl(urlStr, maxRedirects = 6) {
  return new Promise((resolve, reject) => {
    const doFetch = (target, redirects) => {
      const u = new URL(target);
      const proxy = getProxy(target);
      const mod = proxy ? http : https;
      const options = {
        hostname: proxy ? proxy.hostname : u.hostname,
        port: proxy ? proxy.port : (u.port || (u.protocol === 'https:' ? 443 : 80)),
        path: proxy ? target : (u.pathname + u.search),
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (BioQuest figure fetch)', 'Accept': 'text/html,*/*' },
        timeout: 30000
      };
      const req = mod.request(options, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && redirects > 0 && res.headers.location) {
          res.resume();
          const next = new URL(res.headers.location, target).toString();
          return doFetch(next, redirects - 1);
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(new Error('timeout')); });
      req.end();
    };
    doFetch(urlStr, maxRedirects);
  });
}

async function listFigures(pmcId) {
  const html = await fetchUrl(`https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcId}/`);
  if (html.status !== 200) throw new Error(`PMC page HTTP ${html.status}`);
  const text = html.body.toString('utf8');
  // 提取 fig 编号 → blob URL
  const re = /id="?F(\d+)"?[\s\S]{0,4000}?cdn\.ncbi\.nlm\.nih\.gov\/pmc\/blobs\/[^"'? ]+?\/[^"'? ]+?\/[^"'? ]+?\.(?:jpg|png|tif|gif)/g;
  const figures = [];
  // 更宽松：找出所有 blob 图片 URL，按 F 编号分组（tileshop 列表通常按顺序）
  const blobRe = /https:\/\/cdn\.ncbi\.nlm\.nih\.gov\/pmc\/blobs\/[^"'? ]+?\.(?:jpg|png|tif|gif)/g;
  let m;
  const urls = [];
  while ((m = blobRe.exec(text)) !== null) urls.push(m[0].replace(/\\u0026/g, '&'));
  const dedup = [...new Set(urls)];
  // 尝试匹配 figure 编号：优先 tileshop 内 "g000N" 或 Fn 锚点附近
  for (let i = 0; i < dedup.length; i++) {
    const u = dedup[i];
    const g = u.match(/g00(\d+)/);
    const n = g ? parseInt(g[1], 10) : i + 1;
    figures.push({ num: n, url: u });
  }
  return figures;
}

(async () => {
  const [pmcId, figNum, outPath] = process.argv.slice(2);
  if (!pmcId || !figNum || !outPath) {
    console.error('用法: node scripts/fetch-pmc-figure.mjs <PMCID> <figureNum> <outPath>');
    process.exit(2);
  }
  const figs = await listFigures(pmcId);
  console.log(`[${pmcId}] 找到 ${figs.length} 个 figure URL`);
  figs.forEach(f => console.log(`  F${f.num}: ${f.url}`));
  const target = figs.find(f => f.num === parseInt(figNum, 10)) || figs[parseInt(figNum, 10) - 1];
  if (!target) { console.error('未找到 figure 匹配'); process.exit(1); }
  const img = await fetchUrl(target.url);
  console.log(`下载 F${target.num} → HTTP ${img.status}, ${img.body.length} 字节`);
  if (img.status === 200 && img.body.length > 5000) {
    if (target.url.endsWith('.tif')) {
      // tif 无法直接用，提示转换
      console.error('TIF 格式！需先用 ImageMagick 转 jpg/png');
      fs.writeFileSync(outPath + '.tif', img.body);
    } else {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, img.body);
      console.log('已保存: ' + outPath);
    }
  } else {
    console.error('下载失败');
    process.exit(1);
  }
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });