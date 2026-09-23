import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Profile } from '@/lib/core/types';
import {
  SYNC_ITEM_QUOTA_BYTES,
  UserError,
  addDomain,
  addProfile,
  ensureProfiles,
  exportBackup,
  importProfiles,
  parseBackup,
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

describe('backup', () => {
  const file = (profiles: unknown, extra: Record<string, unknown> = {}) =>
    ({ format: 'focus-guard-backup', version: 1, exportedAt: '2026-09-23T00:00:00.000Z', profiles, ...extra });

  it('round-trips: export, then import into an empty browser', async () => {
    await ensureProfiles();
    await addDomain('default', 'a.com');
    const work = await addProfile('Work');
    await addDomain(work, 'b.com');
    const backup = await exportBackup();

    fakeBrowser.reset();
    await ensureProfiles();
    const { profiles } = parseBackup(JSON.parse(JSON.stringify(backup)));
    expect(await importProfiles(profiles)).toEqual({ profilesAdded: 1, domainsAdded: 2 });

    const restored = Object.values(await getProfiles()).map(p => [p.name, p.domains]);
    expect(restored).toEqual(expect.arrayContaining([['Default', ['a.com']], ['Work', ['b.com']]]));
  });

  it('normalizes domains and skips invalid ones', () => {
    const { profiles, skippedDomains } = parseBackup(file({ x: { name: 'X', domains: ['HTTPS://A.com/x', 'not a domain', 42, 'a.com'] } }));
    expect(profiles.x!.domains).toEqual(['a.com']);
    expect(skippedDomains).toBe(2);
  });

  it('rejects files that are not backups, damaged or from a newer version', () => {
    expect(() => parseBackup({ hello: 1 })).toThrow('not a Focus Guard backup');
    expect(() => parseBackup(null)).toThrow('not a Focus Guard backup');
    expect(() => parseBackup(file({ x: { domains: [] } }))).toThrow('damaged');
    expect(() => parseBackup(file({}, { version: 2 }))).toThrow('newer version');
  });

  it('merges into existing profiles by id or name and never removes anything', async () => {
    await ensureProfiles();
    await addDomain('default', 'keep.com');
    const work = await addProfile('Work');
    await addDomain(work, 'reddit.com');

    const { profiles } = parseBackup(file({
      default: { name: 'Default', domains: ['keep.com', 'new.com'] },
      profile_other_device: { name: 'work', domains: ['old.reddit.com', 'news.test'] },
      profile_3: { name: 'Evening', domains: ['tv.test'] },
    }));
    expect(await importProfiles(profiles)).toEqual({ profilesAdded: 1, domainsAdded: 3 });

    const after = await getProfiles();
    expect(after.default!.domains).toEqual(['keep.com', 'new.com']);
    // "old.reddit.com" is already covered by reddit.com, so only news.test is added
    expect(after[work]!.domains).toEqual(['reddit.com', 'news.test']);
    expect(Object.values(after).find(p => p.name === 'Evening')!.domains).toEqual(['tv.test']);
  });

  it('imports nothing if a profile would exceed the sync item limit', async () => {
    await ensureProfiles();
    const big = nearlyFullProfile('default', 'Default');
    await fakeBrowser.storage.sync.set({ 'profile:default': big });
    const { profiles } = parseBackup(file({ default: { name: 'Default', domains: ['one-more-quite-long-domain.example'] }, p2: { name: 'Other', domains: ['x.com'] } }));
    await expect(importProfiles(profiles)).rejects.toThrow('Nothing was imported');
    expect(Object.keys(await getProfiles())).toEqual(['default']);
  });
});
