// End-to-end: popup, options page and blocked page behaviour in Chromium
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { launchChromium, type ChromiumExtension } from './support/chromium';
import { PROFILES } from './support/fixtures';
import { chromeBuild } from './support/paths';
import { sleep, startSite, type TestSite } from './support/site';
import { BACKUP_FILE, chooseGeneratedImage, chooseTextFile, profilesByName, storedImageInfo } from './support/ui';

let site: TestSite;
let ext: ChromiumExtension;

beforeAll(async () => {
  site = await startSite();
  ext = await launchChromium(chromeBuild(), site);
});

afterAll(async () => {
  await ext?.close();
  await site?.close();
});

beforeEach(async () => {
  await ext.seed(PROFILES, 'default');
});

async function openOptions(): Promise<Page> {
  const page = await ext.context.newPage();
  await page.goto(`${ext.origin}/options.html`);
  await page.waitForSelector('#profileSelector option', { state: 'attached' });
  return page;
}

describe('Chromium UI', () => {
  it('blocked page: copying never replaces the URL, and the feedback clears', async () => {
    const page = await ext.context.newPage();
    const url = 'https://blocked.test/some/page?x=1';
    await page.goto(`${ext.origin}/blocked.html?url=${encodeURIComponent(url)}&profile=Default`);
    await page.click('#copyUrlBtn');
    await page.click('#copyUrlBtn');
    expect(await page.textContent('#originalUrl')).toBe(url);
    expect(await page.textContent('#copyStatus')).not.toBe('');
    await expect.poll(() => page.textContent('#copyStatus'), { timeout: 3000 }).toBe('');
    expect(await page.textContent('#originalUrl')).toBe(url);
    await page.close();
  });

  it('options: tabs work with the keyboard and show the right panel', async () => {
    const page = await openOptions();
    await page.focus('#tab-domains');
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('tab-appearance');
    expect(await page.getAttribute('#tab-appearance', 'aria-selected')).toBe('true');
    expect(await page.isVisible('#appearance-tab')).toBe(true);
    expect(await page.isVisible('#domains-tab')).toBe(false);
    await page.keyboard.press('End');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('tab-settings');
    await page.close();
  });

  it('options: a large transparent image is kept as PNG within the size limits', async () => {
    const page = await openOptions();
    await page.evaluate(chooseGeneratedImage, { inputId: 'imageUpload', width: 3000, height: 2000, transparent: true });
    await expect.poll(() => page.textContent('#imageStatus'), { timeout: 15000 }).toBe('Image saved');
    const image = await page.evaluate(storedImageInfo);
    expect(image?.type).toBe('image/png');
    expect(Math.max(image!.width, image!.height)).toBeLessThanOrEqual(1920);
    expect(image!.bytes).toBeLessThanOrEqual(2 * 1024 * 1024);
    await page.close();
  });

  it('options: a large photo is scaled to 1920px, stored as JPEG and previewed', async () => {
    const page = await openOptions();
    await page.evaluate(chooseGeneratedImage, { inputId: 'imageUpload', width: 4000, height: 3000, transparent: false });
    await expect.poll(() => page.textContent('#imageStatus'), { timeout: 15000 }).toBe('Image saved');
    expect(await page.evaluate(storedImageInfo)).toMatchObject({ type: 'image/jpeg', width: 1920, height: 1440 });
    expect(await page.getAttribute('#imagePreview', 'src')).toMatch(/^data:image\/jpeg/);
    await page.close();
  });

  it('options: a non-image file is refused with a message', async () => {
    const page = await openOptions();
    await page.evaluate(chooseTextFile, { inputId: 'imageUpload', name: 'notes.txt', type: 'text/plain', content: 'hello' });
    await expect.poll(() => page.textContent('#imageStatus')).toMatch(/Choose an image/);
    expect(await page.getAttribute('#imageStatus', 'class')).toContain('error');
    await page.close();
  });

  it('options: importing a backup merges profiles and skips invalid entries', async () => {
    const page = await openOptions();
    page.once('dialog', dialog => dialog.accept());
    await page.evaluate(chooseTextFile, { inputId: 'importFile', name: 'backup.json', type: 'application/json', content: BACKUP_FILE });
    await expect.poll(() => page.textContent('#backupStatus'))
      .toBe('Imported 1 new profile and 3 new domains (skipped 1 invalid entry)');
    expect(await page.evaluate(profilesByName)).toEqual({ Default: ['blocked.test', 'a.test', 'b.test'], Work: ['other.test'], Evening: ['tv.test'] });
    expect(await page.$$eval('#profileSelector option', options => options.map(o => o.textContent))).toContain('Evening');
    await page.close();
  });

  it('options: export downloads a backup with every profile', async () => {
    const page = await openOptions();
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#tab-settings').then(() => page.click('#exportBackup'))]);
    expect(download.suggestedFilename()).toMatch(/^focus-guard-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const backup = JSON.parse(readFileSync(await download.path(), 'utf8'));
    expect(backup.format).toBe('focus-guard-backup');
    expect(Object.values(backup.profiles).map(p => (p as { name: string }).name).sort()).toEqual(['Default', 'Work']);
    await page.close();
  });

  it('options: Reset All asks first; cancelling keeps everything', async () => {
    const page = await openOptions();
    await page.click('#tab-settings');
    let message = '';
    page.once('dialog', dialog => { message = dialog.message(); dialog.dismiss(); });
    await page.click('#resetSettings');
    await sleep(300);
    expect(message).toMatch(/Reset all settings/);
    expect(Object.keys(await page.evaluate(profilesByName)).sort()).toEqual(['Default', 'Work']);

    page.once('dialog', dialog => dialog.accept());
    await page.click('#resetSettings');
    await expect.poll(() => page.evaluate(profilesByName)).toEqual({ Default: [] });
    await page.close();
  });

  it('follows the system dark mode setting', async () => {
    const page = await openOptions();
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(18, 18, 18)');
    await page.emulateMedia({ colorScheme: 'light' });
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(249, 249, 249)');
    await page.close();
  });

  it('popup: shows the profile selector only when there is more than one profile', async () => {
    const popup = await ext.context.newPage();
    await popup.goto(`${ext.origin}/popup.html`);
    await expect.poll(() => popup.isVisible('#profileSelectorContainer')).toBe(true);
    await ext.seed({ default: { name: 'Default', domains: [] } }, 'default');
    await expect.poll(() => popup.isVisible('#profileSelectorContainer')).toBe(false);
    expect(await popup.textContent('#domainList')).toContain('No blocked domains yet');
    await popup.close();
  });
});
