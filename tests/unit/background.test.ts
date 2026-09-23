import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import background from '@/entrypoints/background';
import type { Profiles } from '@/lib/core/types';

const PROFILES: Profiles = {
  default: { name: 'Default', domains: ['example.com'] },
  work: { name: 'Work', domains: ['social.test'] },
};

type NavigationDetails = Parameters<typeof fakeBrowser.webNavigation.onBeforeNavigate.trigger>[0];

const navigate = (url: string, extra: Partial<NavigationDetails> = {}) =>
  fakeBrowser.webNavigation.onBeforeNavigate.trigger({
    url, tabId: 7, frameId: 0, parentFrameId: -1, processId: 0, timeStamp: Date.now(), documentLifecycle: 'active', frameType: 'outermost_frame', ...extra,
  } as NavigationDetails);

const blockedUrl = (url: string, profile: string) =>
  fakeBrowser.runtime.getURL(`/blocked.html?url=${encodeURIComponent(url)}&profile=${profile}`);

let tabsUpdate: ReturnType<typeof vi.spyOn>;

// fakeBrowser.reset() clears state but not event listeners
const resetBrowser = () => {
  fakeBrowser.reset();
  fakeBrowser.webNavigation.onBeforeNavigate.removeAllListeners();
};

beforeEach(async () => {
  resetBrowser();
  tabsUpdate = vi.spyOn(fakeBrowser.tabs, 'update').mockResolvedValue({} as never);
  await fakeBrowser.storage.sync.set({ profiles: PROFILES, activeProfile: 'default' });
  background.main();
});

describe('background', () => {
  it('only listens to http(s) navigations', () => {
    resetBrowser();
    const addListener = vi.spyOn(fakeBrowser.webNavigation.onBeforeNavigate, 'addListener');
    background.main();
    expect(addListener).toHaveBeenCalledWith(expect.any(Function), { url: [{ schemes: ['http', 'https'] }] });
  });

  it('redirects a blocked top-level navigation to the blocked page', async () => {
    const url = 'https://www.example.com/page';
    await navigate(url);
    expect(tabsUpdate).toHaveBeenCalledTimes(1);
    expect(tabsUpdate).toHaveBeenCalledWith(7, { url: blockedUrl(url, 'Default') });
  });

  it('does not redirect domains that are not blocked', async () => {
    await navigate('https://notexample.com/');
    expect(tabsUpdate).not.toHaveBeenCalled();
  });

  it('ignores blocked domains loaded in subframes (iframes)', async () => {
    await navigate('https://example.com/embed', { frameId: 3, parentFrameId: 0 });
    expect(tabsUpdate).not.toHaveBeenCalled();
  });

  it('reads the active profile from storage on every navigation', async () => {
    await fakeBrowser.storage.sync.set({ activeProfile: 'work' });

    await navigate('https://example.com/');
    expect(tabsUpdate).not.toHaveBeenCalled();

    await navigate('https://social.test/');
    expect(tabsUpdate).toHaveBeenCalledTimes(1);
    expect(tabsUpdate).toHaveBeenCalledWith(7, { url: blockedUrl('https://social.test/', 'Work') });
  });

  it('falls back to the default profile when the active profile is missing', async () => {
    await fakeBrowser.storage.sync.set({ activeProfile: 'deleted_profile' });
    await navigate('https://example.com/');
    expect(tabsUpdate).toHaveBeenCalledTimes(1);
  });

  it('does nothing before any profiles exist', async () => {
    await fakeBrowser.storage.sync.clear();
    await navigate('https://example.com/');
    expect(tabsUpdate).not.toHaveBeenCalled();
  });

  it('handles a failed tab update without throwing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    tabsUpdate.mockRejectedValue(new Error('No tab with id: 7'));

    await expect(navigate('https://example.com/')).resolves.toBeDefined();
    expect(consoleError).toHaveBeenCalled();
  });

  it('never creates a default profile on startup (would overwrite synced data)', async () => {
    resetBrowser();
    background.main();
    await vi.waitFor(async () => expect(await fakeBrowser.storage.sync.get(null)).toEqual({}));
  });

  it('migrates legacy blockedDomains on startup', async () => {
    resetBrowser();
    await fakeBrowser.storage.sync.set({ blockedDomains: ['legacy.com'] });
    background.main();
    await vi.waitFor(async () => {
      const { profiles } = await fakeBrowser.storage.sync.get('profiles');
      expect((profiles as Profiles | undefined)?.default?.domains).toEqual(['legacy.com']);
    });
  });
});
