import { describe, expect, it } from 'vitest';
import { findCoveringDomain, isHostBlocked, isValidHostname, normalizeDomain } from '@/lib/core/domains';

describe('normalizeDomain', () => {
  it.each([
    ['facebook.com', 'facebook.com'],
    ['Facebook.COM', 'facebook.com'],
    ['  facebook.com  ', 'facebook.com'],
    ['https://www.facebook.com/feed?x=1', 'www.facebook.com'],
    ['http://reddit.com', 'reddit.com'],
    ['*.reddit.com', 'reddit.com'],
    ['facebook.com.', 'facebook.com'],
    ['facebook.com/feed', 'facebook.com'],
    ['localhost:3000', 'localhost'],
    ['user@example.com', 'example.com'],
    ['bücher.de', 'xn--bcher-kva.de'],
    ['192.168.0.1', '192.168.0.1'],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeDomain(input)).toEqual({ ok: true, domain: expected });
  });

  it.each(['', '   ', 'ex ample.com', 'a..com', '.com', 'http://', '*.'])('rejects %j', (input) => {
    expect(normalizeDomain(input).ok).toBe(false);
  });
});

describe('isValidHostname', () => {
  it.each(['example.com', 'www.example.co.uk', 'localhost', 'my_host.example', 'xn--bcher-kva.de', '192.168.0.1', '[::1]'])(
    'accepts %s', (host) => expect(isValidHostname(host)).toBe(true));

  // Chrome's URL parser returns hostnames like these instead of throwing
  it.each(['not%20a%20domain', 'a b.com', 'a..com', '.com', 'example.com.', '', 'exa$mple.com'])(
    'rejects %j', (host) => expect(isValidHostname(host)).toBe(false));
});

describe('isHostBlocked', () => {
  const blocked = ['facebook.com', 'xn--bcher-kva.de'];

  it.each([
    ['facebook.com', true],
    ['www.facebook.com', true],
    ['m.web.facebook.com', true],
    ['FACEBOOK.com', true],
    ['facebook.com.', true],
    ['xn--bcher-kva.de', true],
    ['notfacebook.com', false],
    ['facebook.com.evil.org', false],
    ['example.com', false],
  ])('%s -> %s', (host, expected) => {
    expect(isHostBlocked(host, blocked)).toBe(expected);
  });
});

describe('findCoveringDomain', () => {
  it('finds the same domain or a parent domain', () => {
    expect(findCoveringDomain('facebook.com', ['facebook.com'])).toBe('facebook.com');
    expect(findCoveringDomain('www.facebook.com', ['facebook.com'])).toBe('facebook.com');
    expect(findCoveringDomain('facebook.com', ['www.facebook.com'])).toBeUndefined();
    expect(findCoveringDomain('notfacebook.com', ['facebook.com'])).toBeUndefined();
  });
});
