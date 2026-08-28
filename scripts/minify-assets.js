#!/usr/bin/env node
'use strict';
/**
 * minify-assets.js —— 使用 esbuild 逐个压缩前端资源并输出到 dist/。
 *
 * 说明：
 *  - 本项目是多脚本页面，JS 全局依赖有加载顺序要求，因此禁止把多个脚本打包成单文件。
 *  - 此处使用 esbuild 的 transform API（bundle:false），对每个文件独立压缩，保持相对目录结构写入 dist/。
 *  - 压缩范围：
 *      * js/*.js                 （顶层 js 目录，不含本级子目录）
 *      * js/integrations/*.js    （集成模块）
 *      * css/*.css
 *    js/vendor/*（已压缩的三方库）不会被触碰。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BANNER = '/* bioquest-min (esbuild) */';

function loadEsbuild() {
  try {
    // eslint-disable-next-line global-require
    return require('esbuild');
  } catch (err) {
    console.error('[minify-assets] 加载 esbuild 失败：');
    console.error(err.message || err);
    console.error('');
    console.error('  请先安装依赖，例如：  npm i -D esbuild');
    process.exit(1);
  }
}

function listFilePaths(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => path.extname(name) === ext)
    .map((name) => path.join(dir, name));
}

function collectSources() {
  const sources = [];
  // 顶层 js 目录中的 .js（listFilePaths 只读一层，天然排除 js/vendor、js/integrations）
  sources.push(...listFilePaths(path.join(ROOT, 'js'), '.js'));
  // 集成模块
  sources.push(...listFilePaths(path.join(ROOT, 'js', 'integrations'), '.js'));
  // 样式
  sources.push(...listFilePaths(path.join(ROOT, 'css'), '.css'));
  return sources;
}

function loaderFor(file) {
  return path.extname(file).toLowerCase() === '.css'
    ? { name: 'css', text: 'css' }
    : { name: 'js', text: 'js' };
}

function toPercent(original, size) {
  if (original <= 0) return 0;
  return Math.round(((original - size) / original) * 10000) / 100;
}

async function main() {
  const esbuild = loadEsbuild();

  const sources = collectSources();
  if (sources.length === 0) {
    console.error('[minify-assets] 未找到任何可压缩的 JS/CSS 资源。');
    process.exit(1);
  }

  const outDir = path.join(ROOT, 'dist');
  const manifest = {};
  let totalOriginal = 0;
  let totalMinified = 0;

  for (const abs of sources) {
    const rel = path.relative(ROOT, abs); // 例如 js/app.js, js/integrations/ocr-engine.js, css/globals.css
    const outAbs = path.join(outDir, rel);
    const originalBytes = fs.statSync(abs).size;
    const source = fs.readFileSync(abs, 'utf8');
    totalOriginal += originalBytes;

    let result;
    try {
      const loader = loaderFor(abs).text;
      result = await esbuild.transform(source, {
        loader,
        minify: true,
        // transform API 不做打包（等价 bundle:false），符合本项目的多脚本全局依赖顺序要求。
        banner: BANNER, // transform API 的 banner 必须为字符串
        charset: 'utf8',
        target: ['es2017'],
      });
    } catch (err) {
      console.error(`[minify-assets] 压缩失败: ${rel}`);
      if (err && err.errors) {
        for (const e of err.errors) {
          console.error(`  ${e.location ? e.location.file + ':' + e.location.line + ':' + e.location.column : ''} ${e.text}`);
        }
      } else {
        console.error(err && err.stack ? err.stack : String(err));
      }
      process.exit(1);
    }

    const minifiedBytes = Buffer.byteLength(result.code, 'utf8');
    totalMinified += minifiedBytes;

    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, result.code, 'utf8');

    manifest[rel] = {
      newPath: `dist/${rel.replace(/\\/g, '/')}`,
      originalBytes,
      minifiedBytes,
      compressionRate: toPercent(originalBytes, minifiedBytes), // 节省的百分比
    };

    console.log(
      `  ${rel.padEnd(48)} ${String(originalBytes).padStart(9)} -> ${String(minifiedBytes).padStart(9)}  (${String(
        toPercent(originalBytes, minifiedBytes)
      ).padStart(6)}%)`
    );
  }

  const manifestPath = path.join(outDir, 'minifest.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const overall = toPercent(totalOriginal, totalMinified);
  console.log('');
  console.log(`[minify-assets] 完成：共 ${sources.length} 个文件`);
  console.log(`  原始总数：${totalOriginal} bytes`);
  console.log(`  压缩总数：${totalMinified} bytes`);
  console.log(`  总压缩率（节省）：${overall}%`);
  console.log(`  清单已写入：${manifestPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[minify-assets] 未预期的错误：');
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});