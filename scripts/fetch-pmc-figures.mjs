#!/usr/bin/env node
// 从 Europe PMC 全文本 XML 提取 figure 列表（label/caption/文件名），并下载原图
// 用法:
//   node scripts/fetch-pmc-figures.mjs list <PMCID>            # 列出所有 figure
//   node scripts/fetch-pmc-figures.mjs get <PMCID> <figId> <outPath>  # 下载单个 figure（figId 如 F1 / fig1）
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PROXY = process.env.https_proxy || process.env.HTTPS_PROXY || '';

function getProxy(urlStr) {
  if (!PROXY) return null;
  const p = new URL(PROXY);
  return { hostname: p.hostname, port: p.port };
}

function fetchUrl(urlStr, maxRedirects = 8) {
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
        headers: { 'User-Agent': 'Mozilla/5.0 (BioQuest figure fetch; cc-by reuse)', 'Accept': '*/*' },
        timeout: 60000
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
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.end();
    };
    doFetch(urlStr, maxRedirects);
  });
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x201[34];/g, '—').replace(/&#x00(?:e9|f3|e8|fc|e4|f6|c9|d6)/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function getXml(pmcId) {
  const numId = pmcId.replace(/^PMC/i, '');
  // NCBI efetch（稳定），失败时回退 Europe PMC
  const nurl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${numId}`;
  try {
    const r = await fetchUrl(nurl);
    if (r.status === 200 && r.body.length > 2000) return r.body.toString('utf8');
  } catch (_) { /* fallthrough */ }
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcId}/fullTextXML`;
  const r = await fetchUrl(url);
  if (r.status !== 200) throw new Error(`fullTextXML HTTP ${r.status}`);
  return r.body.toString('utf8');
}

function parseFigures(xml) {
  const figures = [];
  const figRe = /<fig\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/fig>/g;
  // 同时兼容无 id 的 fig
  const altRe = /<fig\b([^>]*)>([\s\S]*?)<\/fig>/g;
  const seen = new Set();
  let m;
  while ((m = figRe.exec(xml)) !== null) {
    const id = m[1].toLowerCase().replace(/^fig(ure)?[-_.]?/, 'F');
    const body = m[2];
    parseFig(id, body, figures, seen);
  }
  while ((m = altRe.exec(xml)) !== null) {
    if (seen.has(m.index)) continue;
    const id = (m[1] || '').match(/id="([^"]+)"/);
    const fid = id ? id[1].toLowerCase().replace(/^fig(ure)?[-_.]?/, 'F') : 'F' + (figures.length + 1);
    if ([...figures].some(f => f.file === (m[2].match(/graphic[^>]*href="([^"]+)"/) || [])[1])) continue;
    parseFig(fid, m[2], figures, seen);
  }
  return figures.sort((a, b) => a.num - b.num);
}

function parseFig(fid, body, figures, seen) {
  const labelM = body.match(/<label[^>]*>([\s\S]*?)<\/label>/);
  const captionM = body.match(/<caption[^>]*>([\s\S]*?)<\/caption>/) || body.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  const capCandidates = body.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
  const graphicM = body.match(/graphic[^>]*xlink:href="([^"]+)"/) || body.match(/graphic[^>]*href="([^"]+)"/);
  let num = parseInt((fid.match(/(\d+)/) || [])[1], 10) || figures.length + 1;
  const caption = captionM ? stripTags(captionM[1]) : capCandidates.map(stripTags).filter(Boolean).join(' ') || '';
  const file = graphicM ? graphicM[1] : '';
  if (file && !figures.some(f => f.file === file)) {
    figures.push({ id: fid, num, label: labelM ? stripTags(labelM[1]) : fid, caption, file });
  }
}

// Europe PMC 的 graphic 文件通常在 NCBI 的 /articles/<PMCID>/bin/ 目录
function resolveFileUrl(pmcId, file) {
  const base = file.split('/').pop();
  return `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcId}/bin/${encodeURIComponent(base)}`;
}

(async () => {
  const [cmd, pmcId, arg3, outPath] = process.argv.slice(2);
  if (!cmd || !pmcId) {
    console.error('用法: node scripts/fetch-pmc-figures.mjs list <PMCID> | get <PMCID> <figId|figNum> <outPath>');
    process.exit(2);
  }
  const xml = await getXml(pmcId);
  const figs = parseFigures(xml);
  console.log(`[${pmcId}] ${figs.length} figures found`);

  if (cmd === 'list') {
    for (const f of figs) {
      console.log(`  ${f.id}\t${f.label || ''}\t${f.file}`);
      console.log(`        caption: ${f.caption.slice(0, 180)}`);
    }
    // 顺带输出许可证
    const lic = xml.match(/<license[^>]*>\s*<license-p[^>]*>([\s\S]*?)<\/license-p>/);
    if (lic) console.log('  LICENSE:', stripTags(lic[1]).slice(0, 160));
    process.exit(0);
  }

  if (cmd === 'get') {
    const target = figs.find(f => f.id.toLowerCase() === String(arg3).toLowerCase()) ||
      figs.find(f => f.num === parseInt(arg3, 10));
    if (!target) { console.error('未找到 figure: ' + arg3); process.exit(1); }
    const url = resolveFileUrl(pmcId, target.file);
    console.log(`下载 ${target.id} <- ${url}`);
    const img = await fetchUrl(url);
    console.log(`HTTP ${img.status}, ${img.body.length} 字节, content-type=${img.headers['content-type'] || ''}`);
    if (img.status === 200 && img.body.length > 3000) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      const lower = (img.headers['content-type'] || '').toLowerCase();
      const ext = lower.includes('png') ? '.png' : lower.includes('tif') ? '.tif' : lower.includes('gif') ? '.gif' : '.jpg';
      const final = outPath.toLowerCase().endsWith('.jpg') || outPath.toLowerCase().endsWith('.png') || outPath.toLowerCase().endsWith('.tif') || outPath.toLowerCase().endsWith('.gif') ? outPath : outPath + ext;
      fs.writeFileSync(final, img.body);
      console.log('已保存: ' + final);
    } else {
      console.error('下载失败');
      process.exit(1);
    }
  }
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });