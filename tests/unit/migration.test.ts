import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Profile, Profiles } from '@/lib/core/types';
import { SCHEMA_VERSION, migrate } from '@/lib/migration';
import { SYNC_ITEM_QUOTA_BYTES, ensureProfiles, getActiveProfile, getProfiles, syncItemBytes } from '@/lib/storage';

const sync = () => fakeBrowser.storage.sync.get(null);
const local = () => fakeBrowser.storage.local.get(null);

// Shapes exactly as 2.x and 1.x stored them
const V2_DATA = {
  profiles: {
    default: { name: 'Default', domains: ['facebook.com', 'twitter.com'], createdAt: '2025-05-07T10:00:00.000Z' },
    profile_1746640000000: { name: 'Work', domains: ['reddit.com', 'news.ycombinator.com'], createdAt: '2025-05-08T10:00:00.000Z' },
  } satisfies Profiles,
  activeProfile: 'profile_1746640000000',
};
const V1_DATA = { blockedDomains: ['facebook.com', 'youtube.com'] };

beforeEach(() => {
  fakeBrowser.reset();
});

describe('migrate from 2.x', () => {
  it('splits profiles into per-profile keys and makes the active profile device-local', async () => {
    await fakeBrowser.storage.sync.set(V2_DATA);

    expect(await migrate()).toBe('migrated');

    expect(await getProfiles()).toEqual(V2_DATA.profiles);
    expect((await local()).activeProfile).toBe('profile_1746640000000');
    expect((await local()).schemaVersion).toBe(SCHEMA_VERSION);
    expect((await getActiveProfile())?.profile.name).toBe('Work');
    // Left in place for devices still on 2.x
    expect((await sync()).profiles).toEqual(V2_DATA.profiles);
    expect((await sync()).activeProfile).toBe('profile_1746640000000');
  });

  it('is a no-op once done', async () => {
    await fakeBrowser.storage.sync.set(V2_DATA);
    await migrate();
    const setSpy = vi.spyOn(fakeBrowser.storage.sync, 'set');
    expect(await migrate()).toBe('up-to-date');
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('keeps an active profile that points at a deleted profile, and enforces Default instead', async () => {
    await fakeBrowser.storage.sync.set({ ...V2_DATA, activeProfile: 'profile_deleted' });
    await migrate();
    expect((await getActiveProfile())?.id).toBe('default');
  });

  it('migrates a profile close to the 8KB limit intact', async () => {
    const big: Profile = { name: 'Big', domains: [] };
    for (let i = 0; syncItemBytes('profiles', { big }) < SYNC_ITEM_QUOTA_BYTES - 60; i++) {
      big.domains.push(`distracting-site-${i}.example`);
    }
    await fakeBrowser.storage.sync.set({ profiles: { big }, activeProfile: 'big' });

    await migrate();

    expect((await getProfiles()).big?.domains).toEqual(big.domains);
  });

  it('does not mark itself done if a write fails, and completes on the next run', async () => {
    await fakeBrowser.storage.sync.set(V2_DATA);
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValueOnce(new Error('MAX_WRITE_OPERATIONS_PER_MINUTE'));

    await expect(migrate()).rejects.toThrow('MAX_WRITE_OPERATIONS_PER_MINUTE');
    expect((await local()).schemaVersion).toBeUndefined();

    expect(await migrate()).toBe('migrated');
    expect(await getProfiles()).toEqual(V2_DATA.profiles);
  });

  it('does not overwrite an active profile this device already chose', async () => {
    await fakeBrowser.storage.sync.set(V2_DATA);
    await fakeBrowser.storage.local.set({ activeProfile: 'default' });
    await migrate();
    expect((await local()).activeProfile).toBe('default');
  });

  it('writes nothing when another device already migrated the same data', async () => {
    await fakeBrowser.storage.sync.set({
      ...V2_DATA,
      'profile:default': V2_DATA.profiles.default,
      'profile:profile_1746640000000': V2_DATA.profiles.profile_1746640000000,
    });
    const setSpy = vi.spyOn(fakeBrowser.storage.sync, 'set');
    await migrate();
    expect(setSpy).not.toHaveBeenCalled();
  });
});

describe('migrate from 1.x', () => {
  it('turns the domain list into the Default profile and removes the old key', async () => {
    await fakeBrowser.storage.sync.set(V1_DATA);

    await migrate();

    expect((await getProfiles()).default?.domains).toEqual(['facebook.com', 'youtube.com']);
    expect(await sync()).not.toHaveProperty('blockedDomains');
  });
});

describe('new device, before browser sync has delivered data', () => {
  it('writes nothing and tries again later', async () => {
    expect(await migrate()).toBe('no-data');
    expect(await sync()).toEqual({});
    expect(await local()).toEqual({});
  });

  it('merges synced 2.x data that arrives after the popup created an empty Default', async () => {
    await migrate(); // background at install: no data yet
    await ensureProfiles(); // user opens the popup: empty Default created
    await fakeBrowser.storage.sync.set(V2_DATA); // sync delivers the 2.x data

    expect(await migrate()).toBe('migrated'); // next background wake

    const profiles = await getProfiles();
    expect(profiles.default?.domains).toEqual(['facebook.com', 'twitter.com']);
    expect(profiles.profile_1746640000000?.name).toBe('Work');
  });
});
