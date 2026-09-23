// Runs the extension in Firefox through geckodriver (Playwright's Firefox can't load extensions)
import { resolve } from 'node:path';
import { Builder } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox';
import { HOSTS, sleep, type TestSite } from './site';
import type { Profiles } from '../../../src/lib/core/types';

// Fixed internal UUID so the tests know the moz-extension:// origin
export const FIREFOX_EXTENSION_UUID = '11111111-2222-4333-8444-555555555555';
export const FIREFOX_ORIGIN = `moz-extension://${FIREFOX_EXTENSION_UUID}`;
const ADDON_ID = 'focusguard@example.com';

// The geckodriver npm package downloads and runs the matching geckodriver binary
const geckodriverPath = resolve(import.meta.dirname, '../../../node_modules/.bin/geckodriver');

export interface FirefoxExtension {
  driver: firefox.Driver;
  install: (xpi: string) => Promise<void>;
  /** Open an extension page in the current tab */
  openExtensionPage: (path: string) => Promise<void>;
  /** Run an async function body on an extension page; `args` is available inside */
  onExtensionPage: <T>(body: string, ...args: unknown[]) => Promise<T>;
  /** Run one of the self-contained functions from support/ui.ts on the current page */
  runInPage: <A, R>(fn: (arg: A) => R | Promise<R>, arg?: A) => Promise<R>;
  /** Set a Firefox preference (e.g. to emulate dark mode) */
  setPreference: (name: string, value: number) => Promise<void>;
  seed: (profiles: Profiles, activeProfile: string) => Promise<void>;
  storage: () => Promise<{ sync: Record<string, unknown>; local: Record<string, unknown> }>;
  visit: (url: string) => Promise<string>;
  close: () => Promise<void>;
}

export async function launchFirefox(site: TestSite): Promise<FirefoxExtension> {
  const options = new firefox.Options()
    .addArguments('-headless')
    .setPreference('network.dns.localDomains', HOSTS.join(','))
    .setPreference('extensions.webextensions.uuids', JSON.stringify({ [ADDON_ID]: FIREFOX_EXTENSION_UUID }))
    .setPreference('dom.security.https_first', false)
    .setPreference('dom.security.https_first_schemeless', false);
  const binary = process.env.FIREFOX_BIN ?? (process.platform === 'darwin' ? '/Applications/Firefox.app/Contents/MacOS/firefox' : undefined);
  if (binary) {
    options.setBinary(binary);
  }
  // --allow-system-access: Firefox 156+ refuses WebDriver navigation to moz-extension://
  // pages, so they are opened from the privileged browser context instead
  const service = new firefox.ServiceBuilder(process.env.GECKODRIVER_PATH ?? geckodriverPath).addArguments('--allow-system-access');
  const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).setFirefoxService(service).build() as firefox.Driver;

  const openExtensionPage = async (path: string) => {
    await driver.setContext(firefox.Context.CHROME);
    try {
      await driver.executeScript(
        `gBrowser.selectedBrowser.fixupAndLoadURIString(arguments[0], {
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });`,
        `${FIREFOX_ORIGIN}${path}`,
      );
    } finally {
      await driver.setContext(firefox.Context.CONTENT);
    }
    await sleep(600);
  };

  const onExtensionPage = <T>(body: string, ...args: unknown[]) => driver.executeAsyncScript<T>(
    `const done = arguments[arguments.length - 1];
     const args = Array.from(arguments).slice(0, -1);
     (async () => { ${body} })().then(done, error => done({ error: String(error) }));`,
    ...args,
  );

  // blocked.html is the one extension page that doesn't write any data itself
  const onDataPage = async <T>(body: string, ...args: unknown[]) => {
    await openExtensionPage('/blocked.html');
    return onExtensionPage<T>(body, ...args);
  };

  return {
    driver,
    install: async (xpi) => { await driver.installAddon(xpi, true); await sleep(500); },
    openExtensionPage,
    onExtensionPage,
    runInPage: (fn, arg) => driver.executeAsyncScript(
      `const [arg, done] = arguments;
       Promise.resolve((${fn.toString()})(arg)).then(done, error => done({ error: String(error) }));`,
      arg,
    ),
    setPreference: async (name, value) => {
      await driver.setContext(firefox.Context.CHROME);
      try {
        await driver.executeScript('Services.prefs.setIntPref(arguments[0], arguments[1])', name, value);
      } finally {
        await driver.setContext(firefox.Context.CONTENT);
      }
    },
    seed: async (profiles, activeProfile) => {
      await onDataPage(`
        const [profiles, activeProfile] = args;
        const all = await browser.storage.sync.get(null);
        const next = Object.fromEntries(Object.entries(profiles).map(([id, p]) => ['profile:' + id, p]));
        await browser.storage.sync.set(next);
        await browser.storage.sync.remove(Object.keys(all).filter(k => k.startsWith('profile:') && !(k in next)));
        await browser.storage.local.set({ activeProfile, schemaVersion: 3 });`, profiles, activeProfile);
    },
    storage: () => onDataPage(`return { sync: await browser.storage.sync.get(null), local: await browser.storage.local.get(null) };`),
    visit: async (url) => {
      await driver.get(site.url('start.test'));
      await driver.executeScript('location.href = arguments[0]', url);
      await sleep(1500);
      return driver.getCurrentUrl();
    },
    close: () => driver.quit(),
  };
}
