// Runs the extension in Playwright's Chromium
import { chromium, type BrowserContext, type Page, type Worker } from 'playwright';
import { HOSTS, sleep, type TestSite } from './site';
import type { Profiles } from '../../../src/lib/core/types';

export interface ChromiumExtension {
  context: BrowserContext;
  extensionId: string;
  origin: string;
  /** Requests to anything other than the extension or the local test site */
  externalRequests: string[];
  worker: () => Promise<Worker>;
  seed: (profiles: Profiles, activeProfile: string) => Promise<void>;
  storage: () => Promise<{ sync: Record<string, unknown>; local: Record<string, unknown> }>;
  /** Navigate from a neutral page the way a user would, then let any redirect settle */
  visit: (page: Page, url: string) => Promise<string>;
  close: () => Promise<void>;
}

export async function launchChromium(extensionDir: string, site: TestSite, options: { userDataDir?: string } = {}): Promise<ChromiumExtension> {
  const context = await chromium.launchPersistentContext(options.userDataDir ?? '', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      `--host-resolver-rules=${HOSTS.map(host => `MAP ${host} 127.0.0.1`).join(',')}`,
    ],
  });
  const first = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(first.url()).host;
  const origin = `chrome-extension://${extensionId}`;

  const externalRequests: string[] = [];
  context.on('request', request => {
    const url = request.url();
    if (!/^(chrome-extension|data|about|blob):/.test(url) && !url.includes(`:${site.port}/`)) {
      externalRequests.push(url);
    }
  });

  const worker = async () => context.serviceWorkers().find(w => w.url().startsWith(origin)) ?? context.waitForEvent('serviceworker');

  return {
    context,
    extensionId,
    origin,
    externalRequests,
    worker,
    seed: async (profiles, activeProfile) => {
      await (await worker()).evaluate(async ([profiles, activeProfile]) => {
        const all = await chrome.storage.sync.get(null);
        const next = Object.fromEntries(Object.entries(profiles).map(([id, profile]) => [`profile:${id}`, profile]));
        // Write the new profiles before removing old ones, so there is never a moment with none
        await chrome.storage.sync.set(next);
        await chrome.storage.sync.remove(Object.keys(all).filter(key => key.startsWith('profile:') && !(key in next)));
        await chrome.storage.local.set({ activeProfile, schemaVersion: 3 });
      }, [profiles, activeProfile] as const);
    },
    storage: async () => (await worker()).evaluate(async () => ({
      sync: await chrome.storage.sync.get(null),
      local: await chrome.storage.local.get(null),
    })),
    visit: async (page, url) => {
      await page.goto(site.url('start.test'));
      await page.evaluate(target => { location.href = target; }, url).catch(() => {});
      await sleep(1500);
      return page.url();
    },
    close: () => context.close(),
  };
}
