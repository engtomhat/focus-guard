import fs from 'fs';

function syncVersions() {
  // Get new version from npm environment
  const newVersion = process.env.npm_package_version;

  ['chrome', 'firefox'].forEach(browser => {
    const manifestPath = `manifests/${browser}.json`;
    const manifest = JSON.parse(fs.readFileSync(`../${manifestPath}`));
    manifest.version = newVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  });
}

// Only run if executed directly (not when imported)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  syncVersions();
}

export default syncVersions;
