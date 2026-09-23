import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import background from '@/entrypoints/background';
import { recheckOpenTabs } from '@/lib/blocker';
import type { Profile } from '@/lib/core/types';

type NavigationDetails = Parameters<typeof fakeBrowser.webNavigation.onBeforeNavigate.trigger>[0];

const navigate = (url: string, extra: Partial<NavigationDetails> = {}) =>
  fakeBrowser.webNavigation.onBeforeNavigate.trigger({
    url, tabId: 7, frameId: 0, parentFrameId: -1, processId: 0, timeStamp: Date.now(),
    documentLifecycle: 'active', frameType: 'outermost_frame', ...extra,
  } as NavigationDetails);

const blockedUrl = (url: string, profile: string) =>
  fakeBrowser.runtime.getURL(`/blocked.html?url=${encodeURIComponent(url)}&profile=${profile}`);

const DEFAULT: Profile = { name: 'Default', domains: ['example.com'] };
const WORK: Profile = { name: 'Work', domains: ['social.test'] };

type Frame = { frameId: number; parentFrameId: number; url: string; errorOccurred: boolean; processId: number };
// getAllFrames is overloaded (callback and promise forms); mock the promise form
const getAllFrames = () => fakeBrowser.webNavigation.getAllFrames as unknown as ReturnType<typeof vi.fn<(details: { tabId: number }) => Promise<Frame[] | null>>>;

let tabsUpdate: ReturnType<typeof vi.spyOn>;

// fakeBrowser.reset() clears state but not event listeners
function resetBrowser() {
  fakeBrowser.reset();
  for (const event of [
    fakeBrowser.webNavigation.onBeforeNavigate,
    fakeBrowser.runtime.onInstalled,
    fakeBrowser.runtime.onStartup,
    fakeBrowser.storage.onChanged,
  ]) {
    event.removeAllListeners();
  }
}

beforeEach(async () => {
  resetBrowser();
  tabsUpdate = vi.spyOn(fakeBrowser.tabs, 'update').mockResolvedValue({} as never);
  vi.spyOn(fakeBrowser.webNavigation, 'getAllFrames').mockResolvedValue([] as never);
  await fakeBrowser.storage.sync.set({ 'profile:default': DEFAULT, 'profile:work': WORK });
  await fakeBrowser.storage.local.set({ activeProfile: 'default', schemaVersion: 3 });
  background.main();
});

describe('navigation blocking', () => {
  it('only listens to http(s) navigations', () => {
    resetBrowser();
    const addListener = vi.spyOn(fakeBrowser.webNavigation.onBeforeNavigate, 'addListener');
    background.main();
    expect(addListener).toHaveBeenCalledWith(expect.any(Function), { url: [{ schemes: ['http', 'https'] }] });
  });

  it('redirects a blocked top-level navigation to the blocked page', async () => {
    const url = 'https://www.Example.com./page';
    await navigate(url);
    expect(tabsUpdate).toHaveBeenCalledTimes(1);
    expect(tabsUpdate).toHaveBeenCalledWith(7, { url: blockedUrl(url, 'Default') });
  });

  it('ignores iframes and unblocked domains', async () => {
    await navigate('https://example.com/embed', { frameId: 3, parentFrameId: 0 });
    await navigate('https://notexample.com/');
    expect(tabsUpdate).not.toHaveBeenCalled();
  });

  it('uses this device\'s active profile, read on every navigation', async () => {
    await fakeBrowser.storage.local.set({ activeProfile: 'work' });
    await navigate('https://example.com/');
    await navigate('https://social.test/');
    expect(tabsUpdate).toHaveBeenCalledTimes(1);
    expect(tabsUpdate).toHaveBeenCalledWith(7, { url: blockedUrl('https://social.test/', 'Work') });
  });

  it('falls back to Default when the active profile was deleted', async () => {
    await fakeBrowser.storage.local.set({ activeProfile: 'deleted' });
    await navigate('https://example.com/');
    expect(tabsUpdate).toHaveBeenCalledTimes(1);
  });

  it('survives a failed tab update', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    tabsUpdate.mockRejectedValue(new Error('No tab with id: 7'));
    await expect(navigate('https://example.com/')).resolves.toBeDefined();
    expect(consoleError).toHaveBeenCalled();
  });
});

describe('recheckOpenTabs', () => {
  async function openTabs(urls: string[]) {
    const frames: Record<number, string> = {};
    for (const url of urls) {
      const tab = await fakeBrowser.tabs.create({ url });
      frames[tab.id!] = url;
    }
    getAllFrames().mockImplementation(async ({ tabId }) => [
      { frameId: 0, parentFrameId: -1, url: frames[tabId]!, errorOccurred: false, processId: 1 },
      { frameId: 4, parentFrameId: 0, url: 'https://example.com/embed', errorOccurred: false, processId: 1 },
    ]);
    return frames;
  }

  it('redirects open tabs that are now blocked, and leaves the others', async () => {
    const frames = await openTabs(['https://example.com/a', 'https://fine.test/', 'https://sub.example.com/b']);
    await recheckOpenTabs();
    const blockedTabs = tabsUpdate.mock.calls.map(([tabId]: unknown[]) => frames[tabId as number]);
    expect(blockedTabs.sort()).toEqual(['https://example.com/a', 'https://sub.example.com/b']);
  });

  it('runs when the blocklist changes', async () => {
    const frames = await openTabs(['https://fine.test/']);
    await fakeBrowser.storage.sync.set({ 'profile:default': { ...DEFAULT, domains: ['fine.test'] } });
    await vi.waitFor(() => expect(tabsUpdate).toHaveBeenCalledTimes(1));
    expect(frames[tabsUpdate.mock.calls[0]![0] as number]).toBe('https://fine.test/');
  });

  it('runs when the active profile changes', async () => {
    await openTabs(['https://social.test/']);
    await fakeBrowser.storage.local.set({ activeProfile: 'work' });
    await vi.waitFor(() => expect(tabsUpdate).toHaveBeenCalledTimes(1));
  });

  it('skips tabs it cannot inspect', async () => {
    await openTabs(['https://example.com/']);
    getAllFrames().mockRejectedValue(new Error('No tab'));
    await expect(recheckOpenTabs()).resolves.toBeUndefined();
    expect(tabsUpdate).not.toHaveBeenCalled();
  });
});

describe('startup and install', () => {
  it('never creates profiles on its own (synced data may not have arrived)', async () => {
    resetBrowser();
    background.main();
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'install' } as never);
    expect(await fakeBrowser.storage.sync.get(null)).toEqual({});
  });

  it('migrates 2.x data on update', async () => {
    resetBrowser();
    await fakeBrowser.storage.sync.set({ profiles: { default: DEFAULT }, activeProfile: 'default' });
    background.main();
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'update', previousVersion: '2.2.1' } as never);
    await vi.waitFor(async () => {
      expect(await fakeBrowser.storage.sync.get('profile:default')).toEqual({ 'profile:default': DEFAULT });
      expect(await fakeBrowser.storage.local.get('schemaVersion')).toEqual({ schemaVersion: 3 });
    });
  });
});
