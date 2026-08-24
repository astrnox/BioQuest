module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  verbose: true,
  // #140/#141 覆盖率门禁：只统计「require 加载」的模块（Istanbul 可插桩）。
  // irt-engine / fsrs-* 系列在测试中经 (0, eval)(SRC) 动态求值加载，
  // Istanbul 无法插桩（恒报 0%），纳入统计反而使门禁失真，故不在此列。
  collectCoverageFrom: ['js/ai-client.js', 'js/utils.js'],
  coverageDirectory: 'coverage',
  // #140/#141 覆盖率门禁：任一指标低于阈值即整体失败（CI 已启用 --coverage）。
  // 阈值定在当前实测值下方留有余量：防止覆盖率回退，而非追求虚高。
  coverageThreshold: {
    global: { statements: 10, branches: 5, functions: 8, lines: 10 },
    './js/ai-client.js': { statements: 15, branches: 7, functions: 20, lines: 18 },
    './js/utils.js': { statements: 6, branches: 5, functions: 3, lines: 7 }
  }
};
