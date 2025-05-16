const packageJson = require('../package.json');
const chromeManifest = require('../manifests/chrome.json');
const firefoxManifest = require('../manifests/firefox.json');

describe('Package Version Validation', () => {
  test('versions match across files', () => {
    expect(chromeManifest.version).toBe(packageJson.version);
    expect(firefoxManifest.version).toBe(packageJson.version);
  });
});
