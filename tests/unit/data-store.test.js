/**
 * BioQuest DataStore（Dexie）——schema 版本化迁移单元测试
 * P2 Issue #19：数据迁移与回归测试
 *
 * 覆盖：
 *   1. 版本化 schema 定义自洽（DB_VERSION = 最后一个 SCHEMA 版本，索引为目标形态）
 *   2. planUpgrades：版本迁移路径（v1→v2、跨越、无变更）
 *   3. migrateSnapshot：旧版本快照导入时的等价转换（wrongbook.questionId → bioID，
 *      保留 questionIdLegacy、升级 _dbVersion）
 *   4. [tag+diff] 组合索引存在于 v2 schema（对应 Issue #19 的「新索引 [tag+diff]」）
 *
 * 说明：jest place环境为 node、无 indexdDB；本测试只加载 data-store.js 的纯迁移逻辑
 * （planUpgrades / migrateSnapshot / SCHEMAS），不打开真实 Dexie 数据库。
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'js', 'integrations', 'data-store.js');

// 在隔离沙箱中加载 data-store.js（无需 Dexie / indexedDB）
function loadDataStore(opts) {
  opts = opts || {};
  const bioMap = opts.bioMap || {};
  const win = {};
  win.bioIdMap = bioMap;
  if (opts.resolveBioId) win.resolveQuestionBioId = opts.resolveBioId;
  const factory = new Function('window', 'console', fs.readFileSync(SRC, 'utf8'));
  factory(win, console);
  if (!win.DataStore) throw new Error('DataStore 未暴露到 window');
  return win.DataStore;
}

const DS = loadDataStore();

describe('P2 #19 DataStore 版本化迁移', () => {
  test('DB_VERSION 与最后一个 SCHEMA 版本一致', () => {
    expect(DS.DB_VERSION).toBe(DS.SCHEMAS[DS.SCHEMAS.length - 1].version);
  });

  test('v2 schema 声明了 cards 的 [tag+diff] 组合索引（Issue #19 新索引）', () => {
    const v2 = DS.SCHEMAS.find((s) => s.version === 2);
    expect(v2).toBeDefined();
    expect(v2.stores.cards).toContain('[tag+diff]');
    expect(v2.stores.cards).toContain('tag');
    expect(v2.stores.cards).toContain('diff');
    // wrongbook 增加 [questionId+ts] 组合索引
    expect(v2.stores.wrongbook).toContain('[questionId+ts]');
  });

  test('planUpgrades 计算 v1→v2 迁移路径', () => {
    expect(DS.planUpgrades(1, 2)).toEqual([2]);
    expect(DS.planUpgrades(0, 2)).toEqual([1, 2]);
  });

  test('planUpgrades 在无版本差时返回空数组', () => {
    expect(DS.planUpgrades(2, 2)).toEqual([]);
    expect(DS.planUpgrades(2, 1)).toEqual([]);
  });

  test('migrateSnapshot：v1 快照的 wrongbook.questionId 归一为 bioID 并升级版本', () => {
    const bioMap = { '12345': 'BQ-cell_structure-abcdef123456' };
    const store = loadDataStore({ bioMap });
    const snapV1 = {
      _dbVersion: 1,
      wrongbook: [
        { id: 1, questionId: '12345', ts: 1700000000000 },
        { id: 2, questionId: 'BQ-cell_cycle-123456789abc', ts: 1700000001000 }, // 已是 bioID，保持不变
        { id: 3, questionId: null, ts: 1700000002000 }
      ]
    };
    const migrated = store.migrateSnapshot(snapV1, { to: 2, map: bioMap });

    expect(migrated._dbVersion).toBe(2);
    expect(migrated.wrongbook[0].questionId).toBe('BQ-cell_structure-abcdef123456');
    expect(migrated.wrongbook[0].questionIdLegacy).toBe('12345'); // 保留旧值
    expect(migrated.wrongbook[1].questionId).toBe('BQ-cell_cycle-123456789abc');
    expect(migrated.wrongbook[1].questionIdLegacy).toBeUndefined(); // bioID 不重复迁移
    expect(migrated.wrongbook[2].questionId).toBeNull();            // 空前值跳过
    // 不修改入参
    expect(snapV1._dbVersion).toBe(1);
    expect(snapV1.wrongbook[0].questionId).toBe('12345');
  });

  test('migrateSnapshot：已是当前版本则仅打平版本号、不做字段迁移', () => {
    const snapV2 = {
      _dbVersion: 2,
      wrongbook: [{ id: 9, questionId: 'BQ-eco-9abcdef01234', ts: 1 }]
    };
    const out = DS.migrateSnapshot(snapV2, { to: 2, map: {} });
    expect(out._dbVersion).toBe(2);
    expect(out.wrongbook[0].questionId).toBe('BQ-eco-9abcdef01234');
    expect(out.wrongbook[0].questionIdLegacy).toBeUndefined(); // 无版本差无迁移
  });

  test('migrateSnapshot 可注入 map 覆盖（显式 opts.map 优先）', () => {
    const store = loadDataStore({ bioMap: { 'zzz': 'BQ-window-000000000001' } });
    const snap = { _dbVersion: 1, wrongbook: [{ id: 1, questionId: '777' }] };
    const out = store.migrateSnapshot(snap, { to: 2, map: { '777': 'BQ-injected-000000000002' } });
    expect(out.wrongbook[0].questionId).toBe('BQ-injected-000000000002');
  });

  test('migrateSnapshot：map 未命中时回退到 window.resolveQuestionBioId', () => {
    const store = loadDataStore({
      bioMap: { 'zzz': 'BQ-window-000000000001' }, // 不含 '777'
      resolveBioId(/* id */) { return 'BQ-from-fn-000000000002'; }
    });
    const snap = { _dbVersion: 1, wrongbook: [{ id: 1, questionId: '777' }] };
    const out = store.migrateSnapshot(snap, { to: 2 });
    expect(out.wrongbook[0].questionId).toBe('BQ-from-fn-000000000002');
  });
});