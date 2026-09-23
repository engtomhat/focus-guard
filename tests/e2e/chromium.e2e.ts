// End-to-end: the built extension in Chromium
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { launchChromium, type ChromiumExtension } from './support/chromium';
import { PROFILES, isBlockedPage } from './support/fixtures';
import { chromeBuild } from './support/paths';
import { sleep, startSite, type TestSite } from './support/site';

let site: TestSite;
let ext: ChromiumExtension;
let page: Page;

beforeAll(async () => {
  site = await startSite();
  ext = await launchChromium(chromeBuild(), site);
  page = await ext.context.newPage();
});

afterAll(async () => {
  await ext?.close();
  await site?.close();
});

beforeEach(async () => {
  await ext.seed(PROFILES, 'default');
});

describe('Chromium', () => {
  it('redirects a top-level visit to a blocked site, showing the profile', async () => {
    const url = site.url('blocked.test', '/page');
    expect(isBlockedPage(await ext.visit(page, url), url, 'Default')).toBe(true);
  });

  it('does not take over the tab when a blocked site is embedded in an iframe', async () => {
    const url = site.url('host.test', '/embed.html');
    expect(await ext.visit(page, url)).toBe(url);
    expect(site.requests).toContain(`blocked.test:${site.port}/`);
  });

  it('leaves other sites alone', async () => {
    const url = site.url('fine.test');
    expect(await ext.visit(page, url)).toBe(url);
  });

  it('applies a profile switch to the next navigation', async () => {
    await ext.seed(PROFILES, 'work');
    expect(await ext.visit(page, site.url('blocked.test'))).toBe(site.url('blocked.test'));
    const other = site.url('other.test');
    expect(isBlockedPage(await ext.visit(page, other), other, 'Work')).toBe(true);
  });

  it('blocks a tab that is already open when its site is added', async () => {
    const tab = await ext.context.newPage();
    const url = site.url('late.test');
    await tab.goto(url);
    await ext.seed({ ...PROFILES, default: { name: 'Default', domains: ['blocked.test', 'late.test'] } }, 'default');
    await expect.poll(() => tab.url(), { timeout: 5000 }).toContain('/blocked.html?');
    await tab.close();
  });

  it('popup stores typed domains in normalized form and explains invalid input', async () => {
    const popup = await ext.context.newPage();
    await popup.goto(`${ext.origin}/popup.html`);
    await popup.fill('#domainInput', '  HTTPS://WWW.Typed.TEST/some/path ');
    await popup.click('#addDomain');
    await expect.poll(async () => ((await ext.storage()).sync['profile:default'] as { domains: string[] }).domains)
      .toContain('www.typed.test');

    await popup.fill('#domainInput', 'not a domain');
    await popup.click('#addDomain');
    await expect.poll(() => popup.$eval('#domainInput', el => (el as HTMLInputElement).validationMessage))
      .toMatch(/not a valid domain/);
    await popup.close();
  });

  it('keeps extension pages private: websites cannot load them', async () => {
    await page.goto(site.url('fine.test'));
    const result = await page.evaluate(async origin => {
      try { await fetch(`${origin}/blocked.html`); return 'reachable'; } catch { return 'blocked'; }
    }, ext.origin);
    expect(result).toBe('blocked');
  });

  // Before the CSP test below, which deliberately tries to reach example.com
  it('never contacted anything outside the browser during normal use', async () => {
    await sleep(200);
    expect(ext.externalRequests).toEqual([]);
  });

  it('enforces the Content Security Policy on extension pages', async () => {
    const options = await ext.context.newPage();
    await options.goto(`${ext.origin}/options.html`);
    const result = await options.evaluate(async () => {
      let fetchResult = 'allowed';
      try { await fetch('https://example.com/'); } catch { fetchResult = 'blocked'; }
      const image = await new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve('allowed');
        img.onerror = () => resolve('blocked');
        img.src = 'https://example.com/x.png';
      });
      return { fetchResult, image };
    });
    expect(result).toEqual({ fetchResult: 'blocked', image: 'blocked' });
    await options.close();
  });

  it('opens the options page from the popup', async () => {
    const popup = await ext.context.newPage();
    await popup.goto(`${ext.origin}/popup.html`);
    const [options] = await Promise.all([ext.context.waitForEvent('page'), popup.click('#openManager')]);
    await options.waitForLoadState();
    expect(options.url()).toBe(`${ext.origin}/options.html`);
    await options.close();
    await popup.close();
  });

});
