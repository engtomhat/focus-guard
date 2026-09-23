// The extension's own source never reaches the network (the build is checked in tests/build)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findNetworkAccess, stripComments } from '../support/network-invariant';

const SRC = resolve(import.meta.dirname, '../../src');
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});

describe('self-contained source', () => {
  it('has no network APIs or remote/local server addresses in src/', () => {
    const findings = files(SRC)
      .filter(file => /\.(ts|html|css)$/.test(file))
      
      .flatMap(file => findNetworkAccess(stripComments(readFileSync(file, 'utf8'))).map(found => `${file.slice(SRC.length + 1)}: ${found}`));
    expect(findings).toEqual([]);
  });

  it('has no storage APIs outside the storage and migration modules', () => {
    const offenders = files(SRC)
      .filter(file => file.endsWith('.ts') && !/lib[/\\](storage|migration)\.ts$/.test(file))
      .filter(file => /\bbrowser\.storage\.(sync|local)\b/.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('findNetworkAccess (the detector itself)', () => {
  it.each([
    ['fetch("/x")', 'fetch()'],
    ['new XMLHttpRequest()', 'XMLHttpRequest'],
    ['new WebSocket(u)', 'WebSocket'],
    ['navigator.sendBeacon(u)', 'sendBeacon'],
    ['src="https://cdn.example.com/a.png"', 'https://cdn.example.com/a.png'],
    ['url(http://evil.test/x.css)', 'http://evil.test/x.css'],
    ['"ws://localhost:3000"', 'ws://localhost:3000'],
    ['connect to 127.0.0.1', '127.0.0.1'],
  ])('flags %s', (code, expected) => {
    expect(findNetworkAccess(code)).toContain(expected);
  });

  it('ignores URL parsing of user input and comments', () => {
    expect(findNetworkAccess('new URL(`http://${input}`)')).toEqual([]);
    expect(findNetworkAccess(stripComments('// e.g. https://example.com/page\nconst a = 1'))).toEqual([]);
    expect(findNetworkAccess(stripComments('const u = "https://cdn.example.com/x" // note'))).toContain('https://cdn.example.com/x');
  });

  it('allows the Buy Me a Coffee link and the SVG namespace', () => {
    expect(findNetworkAccess('<a href="https://www.buymeacoffee.com/tomhat"><svg xmlns="http://www.w3.org/2000/svg">')).toEqual([]);
  });
});
