const chromeManifest = require('../manifests/chrome.json');
const firefoxManifest = require('../manifests/firefox.json');

describe('Manifest Validation', () => {
  test('chrome manifest has required fields', () => {
    expect(chromeManifest).toHaveProperty('manifest_version');
    expect(chromeManifest).toHaveProperty('name');
    expect(chromeManifest).toHaveProperty('version');
  });

  test('firefox manifest has required fields', () => {
    expect(firefoxManifest).toHaveProperty('manifest_version');
    expect(firefoxManifest).toHaveProperty('name');
    expect(firefoxManifest).toHaveProperty('version');
  });

  test('versions match package.json', () => {
    const packageJson = require('../package.json');
    expect(chromeManifest.version).toBe(packageJson.version);
    expect(firefoxManifest.version).toBe(packageJson.version);
  });
});
