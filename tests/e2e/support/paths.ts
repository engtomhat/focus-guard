import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const OUTPUT = resolve(import.meta.dirname, '../../../.output');

/** Unpacked Chrome build (run `npm run build` first) */
export function chromeBuild(): string {
  const dir = join(OUTPUT, 'chrome-mv3');
  if (!existsSync(join(dir, 'manifest.json'))) {
    throw new Error(`No Chrome build in ${dir}. Run "npm run build" first.`);
  }
  return dir;
}

/** Firefox zip (run `npm run zip` first) */
export function firefoxZip(): string {
  const zip = existsSync(OUTPUT) ? readdirSync(OUTPUT).find(name => name.endsWith('-firefox.zip')) : undefined;
  if (!zip) {
    throw new Error(`No Firefox zip in ${OUTPUT}. Run "npm run zip" first.`);
  }
  return join(OUTPUT, zip);
}

/**
 * Zips of the 2.x release to upgrade from (E2E_UPGRADE_FROM_DIR; CI downloads
 * v2.2.1 with `gh release download`). Undefined if not provided.
 */
export function upgradeFromRelease(): { chromeZip: string; firefoxZip: string } | undefined {
  const dir = process.env.E2E_UPGRADE_FROM_DIR;
  if (!dir || !existsSync(dir)) {
    return undefined;
  }
  const files = readdirSync(dir);
  const chrome = files.find(name => name.endsWith('chrome.zip'));
  const firefox = files.find(name => name.endsWith('firefox.zip'));
  return chrome && firefox ? { chromeZip: join(dir, chrome), firefoxZip: join(dir, firefox) } : undefined;
}
