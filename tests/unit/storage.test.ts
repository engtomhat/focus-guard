import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Profile } from '@/lib/core/types';
import {
  SYNC_ITEM_QUOTA_BYTES,
  UserError,
  addDomain,
  addProfile,
  ensureProfiles,
  getActiveProfile,
  getProfiles,
  onProfilesChanged,
  removeDomain,
  removeProfile,
  resetAll,
  setActiveProfileId,
  syncItemBytes,
} from '@/lib/storage';

const sync = () => fakeBrowser.storage.sync.get(null);
const local = () => fakeBrowser.storage.local.get(null);

/** A profile whose "profile:<id>" item is just under the 8KB sync limit */
function nearlyFullProfile(id: string, name: string): Profile {
  const profile: Profile = { name, domains: [] };
  for (let i = 0; syncItemBytes(`profile:${id}`, profile) < SYNC_ITEM_QUOTA_BYTES - 40; i++) {
    profile.domains.push(`site-number-${i}.example`);
  }
  return profile;
}

beforeEach(() => {
  fakeBrowser.reset();
});

describe('ensureProfiles', () => {
  it('creates the Default profile only when there are no profiles', async () => {
    expect(Object.keys(await ensureProfiles())).toEqual(['default']);
    await addDomain('default', 'a.com');
    expect((await ensureProfiles()).default?.domains).toEqual(['a.com']);
  });
});

describe('addDomain', () => {
  beforeEach(async () => { await ensureProfiles(); });

  it('stores the normalized domain in the profile key and the legacy map', async () => {
    expect(await addDomain('default', 'https://WWW.Reddit.com/r/all')).toBe('www.reddit.com');
    const data = await sync();
    expect((data['profile:default'] as Profile).domains).toEqual(['www.reddit.com']);
    expect((data.profiles as Record<string, Profile>).default?.domains).toEqual(['www.reddit.com']);
  });

  it('rejects invalid, duplicate and already-covered domains with a user-facing error', async () => {
    await addDomain('default', 'reddit.com');
    await expect(addDomain('default', 'not a domain')).rejects.toThrow(UserError);
    await expect(addDomain('default', 'Reddit.com')).rejects.toThrow('reddit.com is already blocked');
    await expect(addDomain('default', 'old.reddit.com')).rejects.toThrow('Already blocked by reddit.com');
    expect((await getProfiles()).default?.domains).toEqual(['reddit.com']);
  });

  it('refuses to grow a profile past the sync item limit, leaving it unchanged', async () => {
    const full = nearlyFullProfile('default', 'Default');
    await fakeBrowser.storage.sync.set({ 'profile:default': full });
    await expect(addDomain('default', 'one-more-long-domain-name.example')).rejects.toThrow(/profile is full/);
    expect((await getProfiles()).default?.domains).toHaveLength(full.domains.length);
  });

  it('stops updating the legacy map once it no longer fits in one sync item', async () => {
    await fakeBrowser.storage.sync.set({ 'profile:work': nearlyFullProfile('work', 'Work') });
    await addDomain('default', 'a.com');
    // Both profiles together exceed 8KB: the per-profile key is written...
    expect((await getProfiles()).default?.domains).toEqual(['a.com']);
    // ...and the legacy map keeps its last version rather than being deleted,
    // which would make a 2.x device think it has no profiles and reset itself
    expect((await sync()).profiles).toEqual({ default: expect.objectContaining({ domains: [] }) });
  });

  it('surfaces storage failures as errors', async () => {
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
    await expect(addDomain('default', 'a.com')).rejects.toThrow('QUOTA_BYTES');
  });
});

describe('removeDomain', () => {
  it('removes the domain', async () => {
    await ensureProfiles();
    await addDomain('default', 'a.com');
    await addDomain('default', 'b.com');
    await removeDomain('default', 'a.com');
    expect((await getProfiles()).default?.domains).toEqual(['b.com']);
  });
});

describe('profiles', () => {
  beforeEach(async () => { await ensureProfiles(); });

  it('adds profiles with unique ids and validated names', async () => {
    const id = await addProfile('  Work ');
    expect(id).toMatch(/^profile_[0-9a-f-]{36}$/);
    expect((await getProfiles())[id]?.name).toBe('Work');
    await expect(addProfile('work')).rejects.toThrow('already exists');
  });

  it('never deletes the Default profile', async () => {
    await expect(removeProfile('default')).rejects.toThrow(UserError);
  });

  it('switches this device back to Default when its active profile is deleted', async () => {
    const id = await addProfile('Work');
    await setActiveProfileId(id);
    await removeProfile(id);
    expect(Object.keys(await getProfiles())).toEqual(['default']);
    expect((await local()).activeProfile).toBe('default');
    expect(Object.keys((await sync()).profiles as object)).toEqual(['default']);
  });

  it('keeps the active profile on this device only (storage.local)', async () => {
    const id = await addProfile('Work');
    await setActiveProfileId(id);
    expect((await local()).activeProfile).toBe(id);
    expect(await sync()).not.toHaveProperty('activeProfile');
  });
});

describe('getActiveProfile', () => {
  it('falls back to Default when the active profile no longer exists', async () => {
    await ensureProfiles();
    await setActiveProfileId('deleted');
    expect((await getActiveProfile())?.id).toBe('default');
  });

  it('is null when there are no profiles', async () => {
    expect(await getActiveProfile()).toBeNull();
  });
});

describe('resetAll', () => {
  it('leaves only an empty Default profile, active, and removes the custom image', async () => {
    await ensureProfiles();
    await addDomain('default', 'a.com');
    const id = await addProfile('Work');
    await setActiveProfileId(id);
    await fakeBrowser.storage.local.set({ blockedImage: 'data:image/png;base64,xyz' });

    await resetAll();

    expect(await getProfiles()).toEqual({ default: expect.objectContaining({ name: 'Default', domains: [] }) });
    expect(await local()).toEqual({ activeProfile: 'default' });
  });
});

describe('onProfilesChanged', () => {
  it('fires for profile and active-profile changes only', async () => {
    const callback = vi.fn();
    const stop = onProfilesChanged(callback);

    await fakeBrowser.storage.sync.set({ 'profile:work': { name: 'Work', domains: [] } });
    await fakeBrowser.storage.local.set({ activeProfile: 'work' });
    expect(callback).toHaveBeenCalledTimes(2);

    await fakeBrowser.storage.local.set({ blockedImage: 'x' });
    await fakeBrowser.storage.sync.set({ profiles: {} });
    await fakeBrowser.storage.sync.set({ activeProfile: 'legacy' });
    expect(callback).toHaveBeenCalledTimes(2);

    stop();
    await fakeBrowser.storage.sync.set({ 'profile:x': { name: 'X', domains: [] } });
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
