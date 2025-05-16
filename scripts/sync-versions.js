const fs = require('fs');

// Get new version from npm environment
const newVersion = process.env.npm_package_version;

['chrome', 'firefox'].forEach(browser => {
  const manifestPath = `manifests/${browser}.json`;
  const manifest = require(`../${manifestPath}`);
  manifest.version = newVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
});
