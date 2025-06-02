import packageJson from '../package.json';
import chromeManifest from '../manifests/chrome.json';
import firefoxManifest from '../manifests/firefox.json';
import { describe, test, expect } from 'vitest';

describe('Package Version Validation', () => {
  test('versions match across files', () => {
    expect(chromeManifest.version).toBe(packageJson.version);
    expect(firefoxManifest.version).toBe(packageJson.version);
  });
});

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
});
