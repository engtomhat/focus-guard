// Builds the extension for production and checks the generated manifests and files.
// Production mode matters: WXT dev builds add permissions and a relaxed CSP.
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from 'wxt';
import packageJson from '../../package.json';
import { EXTENSION_PAGES_CSP } from '../../wxt.config';
import { findNetworkAccess } from '../support/network-invariant';

const outRoot = mkdtempSync(join(tmpdir(), 'focus-guard-build-'));

type Manifest = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const builds: Record<'chrome' | 'firefox', { dir: string; manifest: Manifest }> = {} as never;

beforeAll(async () => {
  for (const browser of ['chrome', 'firefox'] as const) {
    const outDir = join(outRoot, browser);
    await build({ browser, mode: 'production', outDir, logLevel: 0 } as Parameters<typeof build>[0]);
    const dir = join(outDir, `${browser}-mv3`);
    builds[browser] = { dir, manifest: JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) };
  }
}, 120_000);

afterAll(() => rmSync(outRoot, { recursive: true, force: true }));

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

describe.each(['chrome', 'firefox'] as const)('%s production build', (browser) => {
  const get = () => builds[browser];

  it('is MV3 with the package.json version', () => {
    expect(get().manifest.manifest_version).toBe(3);
    expect(get().manifest.version).toBe(packageJson.version);
  });

  it('requests only storage and webNavigation', () => {
    const { manifest } = get();
    expect([...manifest.permissions].sort()).toEqual(['storage', 'webNavigation']);
    expect(manifest).not.toHaveProperty('host_permissions');
    expect(manifest).not.toHaveProperty('optional_permissions');
    expect(manifest).not.toHaveProperty('content_scripts');
    expect(manifest).not.toHaveProperty('web_accessible_resources');
  });

  it('ships the pages and images the code refers to', () => {
    const { dir, manifest } = get();
    expect(manifest.action.default_popup).toBe('popup.html');
    expect(manifest.options_ui).toEqual({ page: 'options.html', open_in_tab: true });
    for (const file of ['blocked.html', 'popup.html', 'options.html', 'images/default-blocked.png', 'images/bmc-logo.png']) {
      expect(() => statSync(join(dir, file)), file).not.toThrow();
    }
    for (const icon of Object.values<string>(manifest.icons)) {
      expect(() => statSync(join(dir, icon)), icon).not.toThrow();
    }
  });

  it('contains no network access at all', () => {
    const findings = files(get().dir)
      .filter(f => /\.(html|js|css|json)$/.test(f))
      .flatMap(file => findNetworkAccess(readFileSync(file, 'utf8')).map(found => `${file}: ${found}`));
    expect(findings).toEqual([]);
  });

  it('locks extension pages down with a strict Content Security Policy', () => {
    expect(get().manifest.content_security_policy).toEqual({ extension_pages: EXTENSION_PAGES_CSP });
    expect(EXTENSION_PAGES_CSP).toContain("connect-src 'none'");
    expect(EXTENSION_PAGES_CSP).toContain("frame-ancestors 'none'");
  });
});

describe('firefox-specific manifest', () => {
  it('keeps the published add-on id and settings', () => {
    const gecko = builds.firefox.manifest.browser_specific_settings.gecko;
    expect(gecko.id).toBe('focusguard@example.com');
    expect(gecko.strict_min_version).toBe('112.0');
    expect(gecko.data_collection_permissions).toEqual({ required: ['none'] });
  });

  it('uses an event page background (Firefox has no service workers for extensions)', () => {
    expect(builds.firefox.manifest.background).toEqual({ scripts: ['background.js'] });
    expect(builds.chrome.manifest.background).toEqual({ service_worker: 'background.js' });
  });
});
