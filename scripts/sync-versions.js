const fs = require('fs');
const pkg = require('../package.json');

['chrome', 'firefox'].forEach(browser => {
  const manifestPath = `manifests/${browser}.json`;
  const manifest = require(`../${manifestPath}`);
  manifest.version = pkg.version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
});
