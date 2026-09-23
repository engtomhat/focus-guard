import { readFileSync } from 'fs';
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

describe('Manifest hardening', () => {
  test.each([
    ['chrome', chromeManifest],
    ['firefox', firefoxManifest]
  ])('%s manifest only requests storage and webNavigation', (_, manifest) => {
    expect([...manifest.permissions].sort()).toEqual(['storage', 'webNavigation']);
    expect(manifest).not.toHaveProperty('host_permissions');
    expect(manifest).not.toHaveProperty('content_scripts');
    expect(manifest).not.toHaveProperty('web_accessible_resources');
  });

  test('firefox manifest keeps the published add-on id and declares no data collection', () => {
    expect(firefoxManifest.browser_specific_settings.gecko.id).toBe('focusguard@example.com');
    expect(firefoxManifest.browser_specific_settings.gecko.data_collection_permissions).toEqual({ required: ['none'] });
  });
});

describe('Self-contained pages', () => {
  test.each(['blocked.html', 'manager.html', 'popup.html'])('%s loads no remote resources', (page) => {
    const html = readFileSync(new URL(`../src/${page}`, import.meta.url), 'utf8');
    // Links the user clicks (<a href>) are fine; anything the page loads by itself is not
    expect(html).not.toMatch(/\bsrc=["']https?:/);
    expect(html).not.toMatch(/<link[^>]+href=["']https?:/);
  });
});
