// End-to-end: the built extension in Firefox
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { By } from 'selenium-webdriver';
import { launchFirefox, type FirefoxExtension } from './support/firefox';
import { PROFILES, isBlockedPage } from './support/fixtures';
import { firefoxZip } from './support/paths';
import { sleep, startSite, type TestSite } from './support/site';

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

describe('Firefox', () => {
  it('redirects a top-level visit to a blocked site, showing the profile', async () => {
    const url = site.url('blocked.test', '/page');
    expect(isBlockedPage(await ext.visit(url), url, 'Default')).toBe(true);
  });

  it('does not take over the tab when a blocked site is embedded in an iframe', async () => {
    const url = site.url('host.test', '/embed.html');
    expect(await ext.visit(url)).toBe(url);
    expect(site.requests).toContain(`blocked.test:${site.port}/`);
  });

  it('leaves other sites alone', async () => {
    const url = site.url('fine.test');
    expect(await ext.visit(url)).toBe(url);
  });

  it('applies a profile switch to the next navigation', async () => {
    await ext.seed(PROFILES, 'work');
    expect(await ext.visit(site.url('blocked.test'))).toBe(site.url('blocked.test'));
    const other = site.url('other.test');
    expect(isBlockedPage(await ext.visit(other), other, 'Work')).toBe(true);
  });

  it('blocks a tab that is already open when its site is added', async () => {
    await ext.driver.get(site.url('late.test'));
    const lateTab = await ext.driver.getWindowHandle();
    await ext.driver.switchTo().newWindow('tab');
    await ext.seed({ ...PROFILES, default: { name: 'Default', domains: ['blocked.test', 'late.test'] } }, 'default');
    await ext.driver.switchTo().window(lateTab);
    await expect.poll(() => ext.driver.getCurrentUrl(), { timeout: 5000 }).toContain('/blocked.html?');
  });

  it('popup stores typed domains in normalized form and explains invalid input', async () => {
    await ext.openExtensionPage('/popup.html');
    await ext.driver.findElement(By.id('domainInput')).sendKeys('  HTTPS://WWW.Typed.TEST/some/path ');
    await ext.driver.findElement(By.id('addDomain')).click();
    await sleep(500);
    await ext.driver.findElement(By.id('domainInput')).sendKeys('not a domain');
    await ext.driver.findElement(By.id('addDomain')).click();
    await sleep(300);
    // Shown as text under the field (the browser's bubble isn't shown on every platform)
    const error = await ext.driver.executeScript<{ hidden: boolean; text: string; invalid: string | null }>(`
      const error = document.getElementById('domainInput-error');
      return { hidden: error.hidden, text: error.textContent, invalid: document.getElementById('domainInput').getAttribute('aria-invalid') };`);
    expect(error).toMatchObject({ hidden: false, invalid: 'true' });
    expect(error.text).toMatch(/not a valid domain/);
    const { sync } = await ext.storage();
    expect((sync['profile:default'] as { domains: string[] }).domains).toContain('www.typed.test');
  });

  it('keeps extension pages private: websites cannot load them', async () => {
    await ext.driver.get(site.url('fine.test'));
    const result = await ext.driver.executeAsyncScript<string>(`const [url, done] = arguments;
      fetch(url).then(() => done('reachable'), () => done('blocked'));`, `moz-extension://11111111-2222-4333-8444-555555555555/blocked.html`);
    expect(result).toBe('blocked');
  });

  it('enforces the Content Security Policy on extension pages', async () => {
    await ext.openExtensionPage('/options.html');
    const result = await ext.onExtensionPage<Record<string, string>>(`
      let fetchResult = 'allowed';
      try { await fetch('https://example.com/'); } catch { fetchResult = 'blocked'; }
      const image = await new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve('allowed');
        img.onerror = () => resolve('blocked');
        img.src = 'https://example.com/x.png';
      });
      return { fetchResult, image };`);
    expect(result).toEqual({ fetchResult: 'blocked', image: 'blocked' });
  });
});
