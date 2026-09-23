import { describe, expect, it } from 'vitest';
import { shouldBlock } from '@/lib/core/blocking';

const profile = { name: 'Work', domains: ['reddit.com'] };

describe('shouldBlock', () => {
  it('blocks top-level http(s) navigations to blocked domains and subdomains', () => {
    expect(shouldBlock({ url: 'https://reddit.com/r/all', frameId: 0 }, profile)).toBe(true);
    expect(shouldBlock({ url: 'http://old.reddit.com/', frameId: 0 }, profile)).toBe(true);
    expect(shouldBlock({ url: 'https://OLD.Reddit.com./', frameId: 0 }, profile)).toBe(true);
  });

  it('ignores iframes and prerendered pages (non-zero frameId)', () => {
    expect(shouldBlock({ url: 'https://reddit.com/', frameId: 5 }, profile)).toBe(false);
  });

  it('ignores other domains and non-web URLs', () => {
    expect(shouldBlock({ url: 'https://example.com/?q=reddit.com', frameId: 0 }, profile)).toBe(false);
    expect(shouldBlock({ url: 'chrome://extensions', frameId: 0 }, profile)).toBe(false);
    expect(shouldBlock({ url: 'file:///reddit.com/index.html', frameId: 0 }, profile)).toBe(false);
    expect(shouldBlock({ url: 'not a url', frameId: 0 }, profile)).toBe(false);
  });

  it('blocks nothing without a profile', () => {
    expect(shouldBlock({ url: 'https://reddit.com/', frameId: 0 }, null)).toBe(false);
  });
});
