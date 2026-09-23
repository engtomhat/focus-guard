import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { mockAdapter, mockProfiles } from './setup.js';

const PROFILES = {
  default: { name: 'Default', domains: ['example.com'] },
  work: { name: 'Work', domains: ['social.test'] }
};

let handler;

beforeAll(async () => {
  await import('../../src/background.js');
  handler = mockAdapter.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
});

beforeEach(() => {
  mockAdapter.webNavigation.tabs.update.mockClear().mockResolvedValue({});
  mockAdapter.runtime.getURL.mockReset().mockImplementation(path => `ext://${path}`);
  mockProfiles.getProfiles.mockReset().mockResolvedValue(PROFILES);
  mockProfiles.getActiveProfileId.mockReset().mockResolvedValue('default');
});

const navigate = (url, extra = {}) => handler({ url, tabId: 7, frameId: 0, ...extra });

describe('background.js', () => {
  it('registers the navigation listener for http(s) only', () => {
    const filter = mockAdapter.webNavigation.onBeforeNavigate.addListener.mock.calls[0][1];
    expect(filter).toEqual({ url: [{ schemes: ['http', 'https'] }] });
  });

  it('only migrates legacy data on startup and never creates a default profile', () => {
    expect(mockProfiles.migrateLegacyIfPresent).toHaveBeenCalled();
    expect(mockProfiles.getAll).not.toHaveBeenCalled();
  });

  it('redirects a blocked top-level navigation to the blocked page', async () => {
    const url = 'https://www.example.com/page';
    await navigate(url);

    expect(mockAdapter.runtime.getURL).toHaveBeenCalledWith(
      `blocked.html?url=${encodeURIComponent(url)}&profile=Default`
    );
    expect(mockAdapter.webNavigation.tabs.update).toHaveBeenCalledWith(7, {
      url: `ext://blocked.html?url=${encodeURIComponent(url)}&profile=Default`
    });
  });

  it('does not redirect domains that are not blocked', async () => {
    await navigate('https://notexample.com/');
    expect(mockAdapter.webNavigation.tabs.update).not.toHaveBeenCalled();
  });

  it('ignores blocked domains loaded in subframes (iframes)', async () => {
    await navigate('https://example.com/embed', { frameId: 3 });
    expect(mockAdapter.webNavigation.tabs.update).not.toHaveBeenCalled();
  });

  it('reads the active profile from storage on every navigation', async () => {
    mockProfiles.getActiveProfileId.mockResolvedValue('work');

    await navigate('https://example.com/');
    expect(mockAdapter.webNavigation.tabs.update).not.toHaveBeenCalled();

    await navigate('https://social.test/');
    expect(mockAdapter.webNavigation.tabs.update).toHaveBeenCalledTimes(1);
    expect(mockAdapter.runtime.getURL.mock.calls[0][0]).toContain('profile=Work');
  });

  it('falls back to the default profile when the active profile is missing', async () => {
    mockProfiles.getActiveProfileId.mockResolvedValue('deleted_profile');
    await navigate('https://example.com/');
    expect(mockAdapter.webNavigation.tabs.update).toHaveBeenCalledTimes(1);
  });

  it('does nothing before any profiles exist', async () => {
    mockProfiles.getProfiles.mockResolvedValue(undefined);
    await navigate('https://example.com/');
    expect(mockAdapter.webNavigation.tabs.update).not.toHaveBeenCalled();
  });

  it('handles a failed tab update without throwing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockAdapter.webNavigation.tabs.update.mockRejectedValue(new Error('No tab with id: 7'));

    await expect(navigate('https://example.com/')).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
