import type { Profiles } from '../../../src/lib/core/types';

export const PROFILES: Profiles = {
  default: { name: 'Default', domains: ['blocked.test'] },
  work: { name: 'Work', domains: ['other.test'] },
};

/** Profiles as a 2.x build stored them (one "profiles" key + synced "activeProfile") */
export const V2_DATA = {
  profiles: {
    default: { name: 'Default', domains: ['facebook.test'], createdAt: '2025-05-07T10:00:00.000Z' },
    profile_1746640000000: { name: 'Work', domains: ['reddit.test'], createdAt: '2025-05-08T10:00:00.000Z' },
  },
  activeProfile: 'profile_1746640000000',
};

/** 1x1 PNG, used as a "custom image" that must survive upgrades */
export const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const isBlockedPage = (url: string, blockedUrl: string, profile: string) =>
  url.includes('/blocked.html?') && url.includes(encodeURIComponent(blockedUrl)) && url.includes(`profile=${profile}`);
