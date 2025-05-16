const fs = require('fs');
const path = require('path');
const syncVersions = require('../../scripts/sync-versions');

// Mock fs
jest.mock('fs', () => ({
  writeFileSync: jest.fn()
}));

// Mock manifests
const mockManifests = {
  chrome: {
    version: '1.0.0',
    name: 'Focus Guard',
    manifest_version: 3
  },
  firefox: {
    version: '1.0.0',
    name: 'Focus Guard',
    manifest_version: 3
  }
};

jest.mock('../../manifests/chrome.json', () => mockManifests.chrome, {virtual: true});
jest.mock('../../manifests/firefox.json', () => mockManifests.firefox, {virtual: true});

describe('syncVersions', () => {
  beforeEach(() => {
    process.env.npm_package_version = '2.0.1';
    jest.resetModules();
    fs.writeFileSync.mockClear();
  });

  test('updates both manifests', () => {
    syncVersions();
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
  });

  test('updates chrome manifest version', () => {
    syncVersions();
    const chromePath = path.join('manifests', 'chrome.json');
    const chromeCall = fs.writeFileSync.mock.calls.find(call => call[0] === chromePath);
    
    expect(chromeCall[1]).toMatch(/"version": "2.0.1"/);
    expect(chromeCall[1]).toMatch(/"name": "Focus Guard"/);
    expect(chromeCall[1]).toMatch(/"manifest_version": 3/);
  });

  test('updates firefox manifest version', () => {
    syncVersions();
    const firefoxPath = path.join('manifests', 'firefox.json');
    const firefoxCall = fs.writeFileSync.mock.calls.find(call => call[0] === firefoxPath);
    
    expect(firefoxCall[1]).toMatch(/"version": "2.0.1"/);
    expect(firefoxCall[1]).toMatch(/"name": "Focus Guard"/);
    expect(firefoxCall[1]).toMatch(/"manifest_version": 3/);
  });
});
