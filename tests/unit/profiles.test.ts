import { describe, expect, it } from 'vitest';
import { mergeProfiles, newProfileId, resolveActiveProfileId, validateProfileName } from '@/lib/core/profiles';

const profiles = {
  default: { name: 'Default', domains: [] },
  profile_a: { name: 'Work', domains: ['a.com'] },
};

describe('validateProfileName', () => {
  it('accepts a new name', () => {
    expect(validateProfileName('Evening', profiles)).toBeNull();
  });

  it('rejects empty, too long and duplicate names (case-insensitive)', () => {
    expect(validateProfileName('   ', profiles)).toMatch(/Enter/);
    expect(validateProfileName('x'.repeat(41), profiles)).toMatch(/at most/);
    expect(validateProfileName(' work ', profiles)).toMatch(/already exists/);
    expect(validateProfileName('DEFAULT', profiles)).toMatch(/already exists/);
  });

  it('accepts names that collide with object built-ins', () => {
    expect(validateProfileName('constructor', profiles)).toBeNull();
    expect(validateProfileName('__proto__', profiles)).toBeNull();
  });
});

describe('resolveActiveProfileId', () => {
  it('uses the active profile if it exists', () => {
    expect(resolveActiveProfileId('profile_a', profiles)).toBe('profile_a');
  });

  it('falls back to Default, then to any profile', () => {
    expect(resolveActiveProfileId('deleted', profiles)).toBe('default');
    expect(resolveActiveProfileId(undefined, profiles)).toBe('default');
    expect(resolveActiveProfileId('deleted', { profile_a: profiles.profile_a })).toBe('profile_a');
    expect(resolveActiveProfileId('default', {})).toBeUndefined();
  });

  it('does not treat inherited object keys as profiles', () => {
    expect(resolveActiveProfileId('toString', { profile_a: profiles.profile_a })).toBe('profile_a');
  });
});

describe('newProfileId', () => {
  it('is unique', () => {
    const ids = new Set(Array.from({ length: 100 }, newProfileId));
    expect(ids.size).toBe(100);
  });
});

describe('mergeProfiles', () => {
  it('keeps every domain from both versions, without duplicates', () => {
    const merged = mergeProfiles({ name: 'A', domains: ['a.com', 'b.com'] }, { name: 'B', domains: ['b.com', 'c.com'] });
    expect(merged).toEqual({ name: 'A', domains: ['a.com', 'b.com', 'c.com'] });
  });
});
