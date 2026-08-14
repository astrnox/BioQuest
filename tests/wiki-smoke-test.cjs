/* BioQuest Wiki 模块 — jsdom 烟雾测试
 * 运行：node tests/wiki-smoke-test.cjs （需 jsdom，已列为 devDependency）
 * 覆盖：种子加载、搜索、分类筛选、详情渲染、编辑器实时预览、CRUD、维基导入、导出。
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const WS = '/workspace';
const html = fs.readFileSync(path.join(WS, 'wiki.html'), 'utf8');
const utilsJs = fs.readFileSync(path.join(WS, 'js/utils.js'), 'utf8');
const wikiJs = fs.readFileSync(path.join(WS, 'js/wiki.js'), 'utf8');
const seedJson = fs.readFileSync(path.join(WS, 'data/wiki-seed.json'), 'utf8');

let fetchHandler = null;

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://127.0.0.1:8765/wiki.html' });
const { window } = dom;
const { document } = window;

window.DOMPurify = { sanitize: (x) => x };
window.fetch = (url, opts) => {
  const u = String(url);
  if (fetchHandler) { const r = fetchHandler(u, opts); if (r) return Promise.resolve(r); }
  if (u.indexOf('wiki-seed.json') !== -1) {
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(seedJson)) });
  }
  return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found'), json: () => Promise.resolve({}) });
};
window.console = console;

window.eval(utilsJs);
window.eval(wikiJs);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; console.log('  \u2717 ' + name + (extra ? '  -> ' + extra : '')); }
}
const $ = (s) => document.querySelector(s);
const $all = (s) => Array.from(document.querySelectorAll(s));
const clickEl = (el) => { if (el) el.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true })); };
function setInput(el, val) { el.value = val; el.dispatchEvent(new window.Event('input', { bubbles: true, cancelable: true })); }

(async () => {
  console.log('\n== BioQuest Wiki 烟雾测试 ==\n');
  await sleep(150);

  const cards = $all('#wikiGrid .wiki-card');
  ok('种子加载：渲染 15 张卡片', cards.length === 15, '实际 ' + cards.length);
  ok('计数文本显示 15', $('#wikiCount') && $('#wikiCount').textContent === '15', $('#wikiCount') && $('#wikiCount').textContent);

  setInput($('#wikiSearch'), '线粒体');
  await sleep(60);
  let sCards = $all('#wikiGrid .wiki-card');
  ok('搜索"线粒体"：只剩匹配卡片', sCards.length >= 1 && sCards.length < 15, '实际 ' + sCards.length);
  ok('搜索结果包含线粒体', sCards.some(c => { const t = c.querySelector('.wiki-card-title'); return t && t.textContent === '线粒体'; }), 'results=' + sCards.map(c => c.querySelector('.wiki-card-title').textContent).join(','));
  setInput($('#wikiSearch'), '');
  await sleep(60);

  const catChip = $all('#wikiCategoryFilters [data-cat]').find(c => c.dataset.cat === '细胞生物学');
  clickEl(catChip);
  await sleep(30);
  let cCards = $all('#wikiGrid .wiki-card');
  ok('分类筛选"细胞生物学"：仅细胞学卡片', cCards.length >= 1 && cCards.every(c => c.querySelector('.wiki-card-cat').textContent === '细胞生物学'), '实际 ' + cCards.length);
  clickEl($('#wikiCategoryFilters [data-cat=""]'));
  await sleep(30);

  const card = $all('#wikiGrid .wiki-card').find(c => { const t = c.querySelector('.wiki-card-title'); return t && t.textContent === '线粒体'; });
  clickEl(card);
  await sleep(30);
  const detailBody = $('#wikiDetailBody');
  ok('详情模态打开', $('#wikiDetailModal').classList.contains('show'));
  ok('详情标题为线粒体', detailBody.querySelector('.wiki-detail-title').textContent === '线粒体');
  ok('详情 Markdown 渲染（含 <h2>）', detailBody.querySelector('.wiki-detail-content h2') !== null, 'h2 count=' + detailBody.querySelectorAll('.wiki-detail-content h2').length);
  ok('详情含分类徽章', detailBody.querySelector('.wiki-card-cat').textContent === '细胞生物学');
  clickEl($('#wikiDetailModal .wiki-modal-close'));
  await sleep(20);
  ok('详情模态关闭', !$('#wikiDetailModal').classList.contains('show'));

  clickEl($('#wikiNewBtn'));
  await sleep(30);
  ok('编辑器模态打开', $('#wikiEditorModal').classList.contains('show'));
  const f = $('#wikiEditorForm').elements;
  setInput(f['title'], '测试词条');
  f['category'].value = '遗传学';
  setInput(f['tags'], '测试、临时');
  setInput(f['summary'], '这是一个测试摘要');
  setInput(f['content'], '## 标题\n\n这是**粗体**和*斜体*。\n\n- 列表项1\n- 列表项2');
  await sleep(320);
  const prev = $('#wikiEditorPreview');
  ok('编辑器实时预览渲染 H2', prev.querySelector('h2') !== null, 'h2=' + prev.querySelectorAll('h2').length);
  ok('编辑器实时预览渲染粗体', prev.querySelector('strong') !== null);
  ok('编辑器实时预览渲染列表', prev.querySelector('ul') !== null);
  $('#wikiEditorForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(30);
  ok('新建后卡片数=16', $all('#wikiGrid .wiki-card').length === 16, '实际 ' + $all('#wikiGrid .wiki-card').length);
  ok('新建后计数=16', $('#wikiCount').textContent === '16', $('#wikiCount').textContent);
  ok('新词条出现在列表', $all('#wikiGrid .wiki-card').some(c => { const t = c.querySelector('.wiki-card-title'); return t && t.textContent === '测试词条'; }));

  const newCard = $all('#wikiGrid .wiki-card').find(c => { const t = c.querySelector('.wiki-card-title'); return t && t.textContent === '测试词条'; });
  clickEl(newCard);
  await sleep(20);
  clickEl($('#wikiDetailEdit'));
  await sleep(20);
  const f2 = $('#wikiEditorForm').elements;
  setInput(f2['title'], '测试词条-已编辑');
  $('#wikiEditorForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(30);
  ok('编辑后标题更新', $all('#wikiGrid .wiki-card').some(c => { const t = c.querySelector('.wiki-card-title'); return t && t.textContent === '测试词条-已编辑'; }));

  const editCard = $all('#wikiGrid .wiki-card').find(c => { const t = c.querySelector('.wiki-card-title'); return t && t.textContent === '测试词条-已编辑'; });
  clickEl(editCard);
  await sleep(20);
  window.confirm = () => true;
  clickEl($('#wikiDetailDelete'));
  await sleep(30);
  ok('删除后卡片数=15', $all('#wikiGrid .wiki-card').length === 15, '实际 ' + $all('#wikiGrid .wiki-card').length);
  ok('已删除词条不再出现', !$all('#wikiGrid .wiki-card').some(c => { const t = c.querySelector('.wiki-card-title'); return t && t.textContent === '测试词条-已编辑'; }));

  clickEl($('#wikiImportOpenBtn'));
  await sleep(20);
  ok('导入模态打开', $('#wikiImportModal').classList.contains('show'));
  const impF = $('#wikiImportForm').elements;
  impF['source'].value = 'zh';
  setInput(impF['title'], '减数分裂');

  fetchHandler = (u) => {
    if (u.indexOf('rest_v1/page/summary') !== -1) {
      return { ok: true, status: 200, json: () => Promise.resolve({ title: '减数分裂', extract: '减数分裂是生物体生殖细胞形成过程中的分裂方式。', content_urls: { desktop: { page: 'https://zh.wikipedia.org/wiki/减数分裂' } } }) };
    }
    if (u.indexOf('w/api.php') !== -1) {
      return { ok: true, status: 200, json: () => Promise.resolve({ query: { pages: { '1': { title: '减数分裂', extract: "== 概述 ==\n减数分裂（'''meiosis'''）是一种特殊的[[细胞分裂]]方式。\n\n== 过程 ==\n减数分裂分为两次连续分裂。\n* 减数第一次分裂\n* 减数第二次分裂", fullurl: 'https://zh.wikipedia.org/wiki/减数分裂' } } } }) };
    }
    return null;
  };
  $('#wikiImportForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(120);
  ok('导入后打开编辑器预览', $('#wikiEditorModal').classList.contains('show'), 'show=' + $('#wikiEditorModal').classList.contains('show'));
  const ef = $('#wikiEditorForm').elements;
  ok('导入预填标题=减数分裂', ef['title'].value === '减数分裂', ef['title'].value);
  ok('导入正文已转 Markdown（含 ## 概述）', ef['content'].value.indexOf('## 概述') !== -1, ef['content'].value.slice(0, 80));
  ok('wikitext 粗体已转 **meiosis**', ef['content'].value.indexOf('**meiosis**') !== -1, 'no **meiosis**');
  ok('wikitext 链接 [[细胞分裂]] 已转纯文本', ef['content'].value.indexOf('[[细胞分裂]]') === -1 && ef['content'].value.indexOf('细胞分裂') !== -1);
  ok('导入正文含列表项', ef['content'].value.indexOf('减数第一次分裂') !== -1);

  fetchHandler = null;
  let exportOk = true;
  try { clickEl($('#wikiExportBtn')); await sleep(20); } catch (e) { exportOk = false; }
  ok('导出备份不抛错', exportOk);
  ok('BioQuestWiki 全局接口存在', typeof window.BioQuestWiki === 'object' && typeof window.BioQuestWiki.getEntries === 'function');

  console.log('\n== 结果：' + pass + ' 通过，' + fail + ' 失败 ==\n');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
