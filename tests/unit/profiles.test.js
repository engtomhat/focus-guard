import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use the real profiles module with an in-memory storage fake
vi.unmock('../../src/lib/core/profiles.js');

const store = {};
vi.mock('../../src/lib/browser/adapter.js', () => ({
  storage: {
    get: vi.fn(async keys => Object.fromEntries(keys.filter(k => k in store).map(k => [k, store[k]]))),
    set: vi.fn(async items => { Object.assign(store, items); }),
    remove: vi.fn(async keys => { keys.forEach(k => delete store[k]); })
  }
}));

const { profiles } = await import('../../src/lib/core/profiles.js');

beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

describe('profiles.migrateLegacyIfPresent', () => {
  it('does not write anything when there is no data (fresh or not-yet-synced device)', async () => {
    await profiles.migrateLegacyIfPresent();
    expect(store).toEqual({});
  });

  it('leaves existing profiles untouched', async () => {
    store.profiles = { work: { name: 'Work', domains: ['a.com'] } };
    store.activeProfile = 'work';
    await profiles.migrateLegacyIfPresent();
    expect(store).toEqual({ profiles: { work: { name: 'Work', domains: ['a.com'] } }, activeProfile: 'work' });
  });

  it('migrates legacy blockedDomains into the default profile', async () => {
    store.blockedDomains = ['a.com', 'b.com'];
    await profiles.migrateLegacyIfPresent();
    expect(store.profiles.default.domains).toEqual(['a.com', 'b.com']);
    expect(store.activeProfile).toBe('default');
    expect(store).not.toHaveProperty('blockedDomains');
  });
});
