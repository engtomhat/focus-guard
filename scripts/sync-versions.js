const fs = require('fs');

function syncVersions() {
  // Get new version from npm environment
  const newVersion = process.env.npm_package_version;

  ['chrome', 'firefox'].forEach(browser => {
    const manifestPath = `manifests/${browser}.json`;
    const manifest = require(`../${manifestPath}`);
    manifest.version = newVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  });
}

// Only run if executed directly (not when required)
if (require.main === module) {
  syncVersions();
}

module.exports = syncVersions;
