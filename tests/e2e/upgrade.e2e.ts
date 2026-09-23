// End-to-end: upgrading an existing 2.x install (old storage layout) keeps the user's data.
// Needs the 2.x release zips in E2E_UPGRADE_FROM_DIR (CI downloads v2.2.1).
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { launchChromium } from './support/chromium';
import { launchFirefox } from './support/firefox';
import { TINY_PNG, V2_DATA, isBlockedPage } from './support/fixtures';
import { chromeBuild, firefoxZip, upgradeFromRelease } from './support/paths';
import { sleep, startSite, type TestSite } from './support/site';

const previous = upgradeFromRelease();
// Store updates always raise the version; with the same version Chrome keeps the old worker script
const UPGRADE_VERSION = '99.0.0';

let site: TestSite;
let temp: string;

beforeEach(async () => {
  site = await startSite();
  temp = mkdtempSync(join(tmpdir(), 'focus-guard-upgrade-'));
});

afterEach(async () => {
  await site?.close();
  rmSync(temp, { recursive: true, force: true });
});

function setVersion(dir: string, version: string) {
  const path = join(dir, 'manifest.json');
  writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, 'utf8')), version }));
}

type Stored = { sync: Record<string, any>; local: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any

function expectMigrated({ sync, local }: Stored) {
  expect(sync['profile:default']).toEqual(V2_DATA.profiles.default);
  expect(sync['profile:profile_1746640000000']).toEqual(V2_DATA.profiles.profile_1746640000000);
  expect(local.activeProfile).toBe('profile_1746640000000');
  expect(local.schemaVersion).toBe(3);
  expect(local.blockedImage).toBe(TINY_PNG);
  // Kept for devices still on 2.x
  expect(sync.profiles).toEqual(V2_DATA.profiles);
}

describe.skipIf(!previous)('upgrade from 2.x', () => {
  it('Chromium: keeps profiles, active profile, image and blocking', async () => {
    const extensionDir = join(temp, 'extension');
    execFileSync('unzip', ['-q', previous!.chromeZip, '-d', extensionDir]);
    const ext = await launchChromium(extensionDir, site, { userDataDir: join(temp, 'profile') });
    try {
      await sleep(800);
      await (await ext.worker()).evaluate(async ([data, image]) => {
        await chrome.storage.sync.set(data);
        await chrome.storage.local.set({ blockedImage: image });
      }, [V2_DATA, TINY_PNG] as const);
      let page = await ext.context.newPage();
      const reddit = site.url('reddit.test');
      expect(isBlockedPage(await ext.visit(page, reddit), reddit, 'Work')).toBe(true);

      // Replace the files and reload like chrome://extensions does (a full reinstall, reason "update")
      rmSync(extensionDir, { recursive: true, force: true });
      cpSync(chromeBuild(), extensionDir, { recursive: true });
      setVersion(extensionDir, UPGRADE_VERSION);
      const settings = await ext.context.newPage();
      await settings.goto('chrome://extensions');
      await settings.evaluate(async id => {
        const dev = (chrome as unknown as { developerPrivate: any }).developerPrivate; // eslint-disable-line @typescript-eslint/no-explicit-any
        // Without developer mode, Chrome disables a reloaded unpacked extension
        await dev.updateProfileConfiguration({ inDeveloperMode: true });
        await dev.reload(id, { failQuietly: false });
      }, ext.extensionId);
      await settings.close();
      await sleep(3000);

      // Read storage from an extension page (Playwright loses the reloaded service worker)
      const probe = await ext.context.newPage();
      await probe.goto(`${ext.origin}/blocked.html`);
      const stored = await probe.evaluate(async () => ({
        version: chrome.runtime.getManifest().version,
        sync: await chrome.storage.sync.get(null),
        local: await chrome.storage.local.get(null),
      }));
      expect(stored.version).toBe(UPGRADE_VERSION);
      expectMigrated(stored);

      // The reload closed the extension's pages, including the blocked tab
      page = await ext.context.newPage();
      expect(isBlockedPage(await ext.visit(page, reddit), reddit, 'Work')).toBe(true);
      expect(await ext.visit(page, site.url('facebook.test'))).toBe(site.url('facebook.test'));
    } finally {
      await ext.close();
    }
  });

  it('Firefox: keeps profiles, active profile, image and blocking', async () => {
    const ext = await launchFirefox(site);
    try {
      await ext.install(previous!.firefoxZip);
      await ext.openExtensionPage('/blocked.html');
      await ext.onExtensionPage(`
        await browser.storage.sync.set(args[0]);
        await browser.storage.local.set({ blockedImage: args[1] });`, V2_DATA, TINY_PNG);
      const reddit = site.url('reddit.test');
      expect(isBlockedPage(await ext.visit(reddit), reddit, 'Work')).toBe(true);

      // Same add-on id, higher version: Firefox treats it as an update
      const unpacked = join(temp, 'firefox');
      execFileSync('unzip', ['-q', firefoxZip(), '-d', unpacked]);
      setVersion(unpacked, UPGRADE_VERSION);
      const upgradeZip = join(temp, 'upgrade.zip');
      execFileSync('zip', ['-qr', upgradeZip, '.'], { cwd: unpacked });
      // Upgrading closes the extension's own pages: leave the tab on a web page
      await ext.driver.get(site.url('start.test'));
      await ext.install(upgradeZip);
      await sleep(2500);

      const stored = await ext.storage();
      expectMigrated(stored);
      expect(isBlockedPage(await ext.visit(reddit), reddit, 'Work')).toBe(true);
      expect(await ext.visit(site.url('facebook.test'))).toBe(site.url('facebook.test'));
    } finally {
      await ext.close();
    }
  });
});
