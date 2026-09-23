import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { profiles } from '@/lib/core/profiles';
import type { Profiles } from '@/lib/core/types';

const syncData = () => fakeBrowser.storage.sync.get(null);

beforeEach(() => {
  fakeBrowser.reset();
});

describe('profiles.migrateLegacyIfPresent', () => {
  it('does not write anything when there is no data (fresh or not-yet-synced device)', async () => {
    await profiles.migrateLegacyIfPresent();
    expect(await syncData()).toEqual({});
  });

  it('leaves existing profiles untouched', async () => {
    const existing = { profiles: { work: { name: 'Work', domains: ['a.com'] } }, activeProfile: 'work' };
    await fakeBrowser.storage.sync.set(existing);
    await profiles.migrateLegacyIfPresent();
    expect(await syncData()).toEqual(existing);
  });

  it('migrates legacy blockedDomains into the default profile', async () => {
    await fakeBrowser.storage.sync.set({ blockedDomains: ['a.com', 'b.com'] });
    await profiles.migrateLegacyIfPresent();
    const data = await syncData();
    expect((data.profiles as Profiles).default?.domains).toEqual(['a.com', 'b.com']);
    expect(data.activeProfile).toBe('default');
    expect(data).not.toHaveProperty('blockedDomains');
  });
});

describe('profiles.getAll', () => {
  it('creates the default profile when none exist', async () => {
    const result = await profiles.getAll();
    expect(Object.keys(result.profiles)).toEqual(['default']);
    expect(result.activeProfile).toBe('default');
  });

  it('repairs an active profile that points at a missing profile', async () => {
    await fakeBrowser.storage.sync.set({ profiles: { work: { name: 'Work', domains: [] } }, activeProfile: 'gone' });
    const result = await profiles.getAll();
    expect(result.activeProfile).toBe('work');
  });
});
