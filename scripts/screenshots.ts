// Screenshots of every extension page, for pull requests that change what users see.
//
// usage: npm run screenshots -- <unpacked build dir> <output dir> [--dark]
//   e.g. npm run build && npm run screenshots -- .output/chrome-mv3 screenshots/after
//
// The same sample profiles are loaded every time (in both the current and the 2.x
// storage layout), so screenshots of two builds can be compared side by side.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PROFILES = {
  default: { name: 'Default', domains: ['facebook.com', 'twitter.com', 'youtube.com', 'instagram.com'] },
  profile_work: { name: 'Work', domains: ['reddit.com', 'news.ycombinator.com'] },
};

async function main([extensionDir, outDir, ...flags]: string[]) {
  if (!extensionDir || !outDir) {
    console.error('usage: npm run screenshots -- <unpacked build dir> <output dir> [--dark]');
    process.exit(2);
  }
  const dark = flags.includes('--dark');
  mkdirSync(outDir, { recursive: true });

  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    deviceScaleFactor: 2,
    colorScheme: dark ? 'dark' : 'light',
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
  await sleep(800);

  await worker.evaluate(async (profiles) => {
    const api = (globalThis as unknown as { chrome: typeof import('wxt/browser').browser }).chrome;
    await api.storage.sync.set({
      profiles,
      activeProfile: 'default',
      ...Object.fromEntries(Object.entries(profiles).map(([id, profile]) => [`profile:${id}`, profile])),
    });
    await api.storage.local.set({ activeProfile: 'default', schemaVersion: 3 });
  }, PROFILES);

  const shot = async (page: Page, name: string, selector?: string) => {
    const path = join(outDir, `${name}${dark ? '-dark' : ''}.png`);
    await (selector ? page.locator(selector).first().screenshot({ path }) : page.screenshot({ path, fullPage: true }));
    console.log(`saved ${path}`);
  };

  const popup = await context.newPage();
  await popup.setViewportSize({ width: 360, height: 640 });
  await popup.goto(`${origin}/popup.html`);
  await sleep(600);
  await shot(popup, 'popup', 'body > main, body > .container');

  const options = await context.newPage();
  await options.setViewportSize({ width: 900, height: 900 });
  await options.goto(`${origin}/options.html`);
  await sleep(600);
  const tabNames = ['domains', 'appearance', 'settings'];
  const tabs = options.locator('.tab-btn');
  for (let i = 0; i < await tabs.count(); i++) {
    await tabs.nth(i).click();
    await sleep(300);
    await shot(options, `options-${tabNames[i] ?? i}`);
  }

  const blocked = await context.newPage();
  await blocked.setViewportSize({ width: 900, height: 900 });
  await blocked.goto(`${origin}/blocked.html?url=${encodeURIComponent('https://www.reddit.com/r/all')}&profile=Work`);
  await sleep(800);
  await shot(blocked, 'blocked');
  await blocked.click('#copyUrlBtn');
  await sleep(200);
  await shot(blocked, 'blocked-copied', '.blocked-url-display');

  await context.close();
}

main(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
