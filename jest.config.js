module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['jest-webextension-mock'],
  testMatch: ['**/tests/**/*.test.js']
};
