// End-to-end: popup, options page and blocked page behaviour in Firefox
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { By, Key } from 'selenium-webdriver';
import { launchFirefox, type FirefoxExtension } from './support/firefox';
import { PROFILES } from './support/fixtures';
import { firefoxZip } from './support/paths';
import { sleep, startSite, type TestSite } from './support/site';
import { BACKUP_FILE, chooseGeneratedImage, chooseTextFile, profilesByName, storedImageInfo } from './support/ui';

let site: TestSite;
let ext: FirefoxExtension;

beforeAll(async () => {
  site = await startSite();
  ext = await launchFirefox(site);
  await ext.install(firefoxZip());
});

afterAll(async () => {
  await ext?.close();
  await site?.close();
});

beforeEach(async () => {
  await ext.seed(PROFILES, 'default');
});

const text = (id: string) => ext.driver.findElement(By.id(id)).getText();
const script = <T>(code: string) => ext.driver.executeScript<T>(code);

async function acceptNextDialog(accept = true): Promise<string> {
  for (let i = 0; i < 30; i++) {
    try {
      const dialog = ext.driver.switchTo().alert();
      const message = await dialog.getText();
      await (accept ? dialog.accept() : dialog.dismiss());
      return message;
    } catch {
      await sleep(100);
    }
  }
  throw new Error('No dialog appeared');
}

async function openOptions() {
  await ext.openExtensionPage('/options.html');
  await expect.poll(() => script<number>(`return document.querySelectorAll('#profileSelector option').length`)).toBeGreaterThan(0);
}

describe('Firefox UI', () => {
  it('blocked page: copying never replaces the URL, and the feedback clears', async () => {
    const url = 'https://blocked.test/some/page?x=1';
    await ext.openExtensionPage(`/blocked.html?url=${encodeURIComponent(url)}&profile=Default`);
    const copy = await ext.driver.findElement(By.id('copyUrlBtn'));
    await copy.click();
    await copy.click();
    expect(await script(`return document.getElementById('originalUrl').textContent`)).toBe(url);
    expect(await script(`return document.getElementById('copyStatus').textContent`)).not.toBe('');
    await expect.poll(() => script(`return document.getElementById('copyStatus').textContent`), { timeout: 3000 }).toBe('');
    expect(await script(`return document.getElementById('originalUrl').textContent`)).toBe(url);
  });

  it('options: tabs work with the keyboard and show the right panel', async () => {
    await openOptions();
    await script(`document.getElementById('tab-domains').focus()`);
    await ext.driver.switchTo().activeElement().sendKeys(Key.ARROW_RIGHT);
    expect(await script(`return document.activeElement.id`)).toBe('tab-appearance');
    expect(await script(`return document.getElementById('tab-appearance').getAttribute('aria-selected')`)).toBe('true');
    expect(await script(`return document.getElementById('appearance-tab').hidden`)).toBe(false);
    expect(await script(`return document.getElementById('domains-tab').hidden`)).toBe(true);
    await ext.driver.switchTo().activeElement().sendKeys(Key.END);
    expect(await script(`return document.activeElement.id`)).toBe('tab-settings');
  });

  it('options: a large transparent image is kept as PNG within the size limits', async () => {
    await openOptions();
    await ext.runInPage(chooseGeneratedImage, { inputId: 'imageUpload', width: 3000, height: 2000, transparent: true });
    await expect.poll(() => script(`return document.getElementById('imageStatus').textContent`), { timeout: 15000 }).toBe('Image saved');
    const image = await ext.runInPage(storedImageInfo);
    expect(image?.type).toBe('image/png');
    expect(Math.max(image!.width, image!.height)).toBeLessThanOrEqual(1920);
    expect(image!.bytes).toBeLessThanOrEqual(2 * 1024 * 1024);
  });

  it('options: a large photo is scaled to 1920px, stored as JPEG and previewed', async () => {
    await openOptions();
    await ext.runInPage(chooseGeneratedImage, { inputId: 'imageUpload', width: 4000, height: 3000, transparent: false });
    await expect.poll(() => script(`return document.getElementById('imageStatus').textContent`), { timeout: 15000 }).toBe('Image saved');
    expect(await ext.runInPage(storedImageInfo)).toMatchObject({ type: 'image/jpeg', width: 1920, height: 1440 });
    expect(await script(`return document.getElementById('imagePreview').src`)).toMatch(/^data:image\/jpeg/);
  });

  it('options: a non-image file is refused with a message', async () => {
    await openOptions();
    await ext.runInPage(chooseTextFile, { inputId: 'imageUpload', name: 'notes.txt', type: 'text/plain', content: 'hello' });
    await expect.poll(() => script(`return document.getElementById('imageStatus').textContent`)).toMatch(/Choose an image/);
    expect(await script(`return document.getElementById('imageStatus').classList.contains('error')`)).toBe(true);
  });

  it('options: importing a backup merges profiles and skips invalid entries', async () => {
    await openOptions();
    await ext.runInPage(chooseTextFile, { inputId: 'importFile', name: 'backup.json', type: 'application/json', content: BACKUP_FILE });
    expect(await acceptNextDialog()).toMatch(/Import 2 profiles with 3 domains\?/);
    await expect.poll(() => script(`return document.getElementById('backupStatus').textContent`))
      .toBe('Imported 1 new profile and 3 new domains (skipped 1 invalid entry)');
    expect(await ext.runInPage(profilesByName)).toEqual({ Default: ['blocked.test', 'a.test', 'b.test'], Work: ['other.test'], Evening: ['tv.test'] });
  });

  it('options: export produces a backup with every profile', async () => {
    await openOptions();
    // WebDriver can't see Firefox downloads: capture the file the page generates instead
    const exported = await ext.driver.executeAsyncScript<string>(`const done = arguments[0];
      const createObjectURL = URL.createObjectURL;
      URL.createObjectURL = blob => { blob.text().then(done); return createObjectURL.call(URL, blob); };
      HTMLAnchorElement.prototype.click = function () {};
      document.getElementById('exportBackup').click();`);
    const backup = JSON.parse(exported);
    expect(backup.format).toBe('focus-guard-backup');
    expect(Object.values(backup.profiles).map(p => (p as { name: string }).name).sort()).toEqual(['Default', 'Work']);
  });

  it('options: Reset All asks first; cancelling keeps everything', async () => {
    await openOptions();
    await script(`setTimeout(() => document.getElementById('resetSettings').click(), 0)`);
    expect(await acceptNextDialog(false)).toMatch(/Reset all settings/);
    await sleep(300);
    expect(Object.keys(await ext.runInPage(profilesByName)).sort()).toEqual(['Default', 'Work']);

    await script(`setTimeout(() => document.getElementById('resetSettings').click(), 0)`);
    await acceptNextDialog();
    await expect.poll(() => ext.runInPage(profilesByName)).toEqual({ Default: [] });
  });

  it('options: a duplicate profile name is explained under the field', async () => {
    await openOptions();
    await script(`document.getElementById('tab-settings').click()`);
    await ext.driver.findElement(By.id('profileNameInput')).sendKeys('work');
    await ext.driver.findElement(By.id('addProfile')).click();
    await expect.poll(() => script(`return document.getElementById('profileNameInput-error').hidden`)).toBe(false);
    expect(await script(`return document.getElementById('profileNameInput-error').textContent`)).toBe('A profile named "work" already exists');
  });

  it('follows the system dark mode setting', async () => {
    const background = async () => {
      await ext.openExtensionPage('/options.html');
      return script(`return getComputedStyle(document.body).backgroundColor`);
    };
    // Firefox's content color-scheme override: 0 = dark, 1 = light
    await ext.setPreference('layout.css.prefers-color-scheme.content-override', 0);
    expect(await background()).toBe('rgb(18, 18, 18)');
    await ext.setPreference('layout.css.prefers-color-scheme.content-override', 1);
    expect(await background()).toBe('rgb(249, 249, 249)');
  });

  it('popup: shows the profile selector only when there is more than one profile', async () => {
    await ext.seed({ default: { name: 'Default', domains: [] } }, 'default');
    await ext.openExtensionPage('/popup.html');
    await expect.poll(() => script(`return document.getElementById('profileSelectorContainer').hidden`)).toBe(true);
    expect(await text('domainList')).toContain('No blocked domains yet');
    await ext.seed(PROFILES, 'default');
    await ext.openExtensionPage('/popup.html');
    await expect.poll(() => script(`return document.getElementById('profileSelectorContainer').hidden`)).toBe(false);
  });
});
