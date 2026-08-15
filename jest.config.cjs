module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  verbose: true,
  collectCoverageFrom: ['js/irt-engine.js', 'js/fsrs-algorithm.js', 'js/fsrs-optimizer.js'],
  coverageDirectory: 'coverage'
};