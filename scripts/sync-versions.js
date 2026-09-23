import fs from 'fs';
import { fileURLToPath } from 'url';

function syncVersions() {
  // Get new version from npm environment
  const newVersion = process.env.npm_package_version;

  ['chrome', 'firefox'].forEach(browser => {
    // Resolve relative to this script, not the current working directory
    const manifestPath = fileURLToPath(new URL(`../manifests/${browser}.json`, import.meta.url));
    const manifest = JSON.parse(fs.readFileSync(manifestPath));
    manifest.version = newVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  });
}

// Only run if executed directly (not when imported)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncVersions();
}

export default syncVersions;
