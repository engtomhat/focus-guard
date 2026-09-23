// Fails if a build asks for more than the last release did.
//
// Why: when an update adds a permission that shows a new warning, Chrome disables
// the extension for every existing user until they approve it (Firefox asks
// before updating). Growing permissions must be a deliberate decision.
//
// usage: node --experimental-strip-types scripts/check-permissions.ts <new manifest.json> <previous manifest.json>

import { readFileSync } from 'node:fs';

interface Manifest {
  permissions?: string[];
  optional_permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
  content_scripts?: { matches?: string[] }[];
  web_accessible_resources?: ({ matches?: string[] } | string)[];
  externally_connectable?: { matches?: string[]; ids?: string[] };
}

/** Everything in a manifest that grants access, as comparable strings */
export function grants(manifest: Manifest): Set<string> {
  const result = new Set<string>();
  const add = (kind: string, values: (string | undefined)[] | undefined) =>
    values?.forEach(value => value && result.add(`${kind}: ${value}`));
  add('permission', manifest.permissions);
  add('optional permission', manifest.optional_permissions);
  add('host permission', manifest.host_permissions);
  add('optional host permission', manifest.optional_host_permissions);
  manifest.content_scripts?.forEach(script => add('content script on', script.matches));
  manifest.web_accessible_resources?.forEach(entry =>
    typeof entry === 'string' ? add('web accessible resource', [entry]) : add('web accessible to', entry.matches));
  add('externally connectable from', manifest.externally_connectable?.matches);
  add('externally connectable by extension', manifest.externally_connectable?.ids);
  return result;
}

/** Grants the new manifest has that the previous one didn't */
export function addedGrants(previous: Manifest, next: Manifest): string[] {
  const before = grants(previous);
  return [...grants(next)].filter(grant => !before.has(grant)).sort();
}

function main([nextPath, previousPath]: string[]) {
  if (!nextPath || !previousPath) {
    console.error('usage: check-permissions.ts <new manifest.json> <previous manifest.json>');
    process.exit(2);
  }
  const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Manifest;
  const added = addedGrants(read(previousPath), read(nextPath));
  if (added.length > 0) {
    console.error(`${nextPath} asks for more than the last release:\n  ${added.join('\n  ')}`);
    console.error('If this is intended, it needs an explicit decision: existing users will have to approve it.');
    process.exit(1);
  }
  console.log(`${nextPath}: no new permissions compared with the last release`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}
