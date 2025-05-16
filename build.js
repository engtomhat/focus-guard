const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function buildExtension(target) {
  try {
    console.log(`Building ${target} extension...`);
    
    // 1. Prepare dist directory
    const distDir = path.join(__dirname, 'dist', target);
    await fs.rm(distDir, { recursive: true, force: true });
    await fs.mkdir(distDir, { recursive: true });

    // 2. Copy shared src files
    await copyDir(path.join(__dirname, 'src'), distDir);

    // 2.5 Copy CSS
    await fs.mkdir(path.join(distDir, 'styles'), { recursive: true });
    await fs.copyFile(
      path.join(__dirname, 'src', 'styles', 'main.css'),
      path.join(distDir, 'styles', 'main.css')
    );

    // Remove duplicate lib files from root
    await fs.rm(path.join(distDir, 'browser'), { recursive: true, force: true });
    await fs.rm(path.join(distDir, 'core'), { recursive: true, force: true });

    // 3. Copy browser-specific manifest
    await fs.copyFile(
      path.join(__dirname, 'manifests', `${target}.json`),
      path.join(distDir, 'manifest.json')
    );

    // 4. Copy images
    await fs.mkdir(path.join(distDir, 'images'), { recursive: true });
    await fs.copyFile(
      path.join(__dirname, 'assets', 'images', 'default-blocked.png'),
      path.join(distDir, 'images', 'default-blocked.png')
    );

    // 5. Copy browser-specific icons
    const browserIcons = {
      chrome: ['icon16.png', 'icon48.png', 'icon128.png'],
      firefox: ['icon32.png', 'icon64.png']
    };

    for (const icon of browserIcons[target]) {
      await fs.copyFile(
        path.join(__dirname, 'assets', 'images', 'icons', icon),
        path.join(distDir, 'images', icon)
      );
    }

    console.log(`✅ ${target} build complete in ${distDir}`);
  } catch (error) {
    console.error(`❌ ${target} build failed:`, error);
    process.exit(1);
  }
}

// Build based on command line argument
const target = process.argv[2];
if (!['chrome', 'firefox'].includes(target)) {
  console.error('Usage: node build.js <chrome|firefox>');
  process.exit(1);
}

buildExtension(target);
