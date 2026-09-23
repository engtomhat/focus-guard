import { defineConfig } from 'wxt';

const ICONS = {
  chrome: { 16: 'images/icon16.png', 48: 'images/icon48.png', 128: 'images/icon128.png' },
  firefox: { 32: 'images/icon32.png', 64: 'images/icon64.png' },
};

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  // Explicit imports only (no auto-imports), so every file shows where its APIs come from
  imports: false,
  // WXT builds Firefox as MV2 by default; the published extension is MV3 on both browsers
  manifestVersion: 3,
  manifest: ({ browser }) => {
    const icons = browser === 'firefox' ? ICONS.firefox : ICONS.chrome;
    return {
      name: 'Focus Guard',
      description: 'Protects your focus by intercepting distracting websites',
      permissions: ['storage', 'webNavigation'],
      icons,
      action: {
        default_icon: icons,
        ...(browser === 'firefox' && { default_title: 'Focus Guard' }),
      },
      ...(browser === 'firefox' && {
        browser_specific_settings: {
          gecko: {
            // Tied to the AMO listing: never change
            id: 'focusguard@example.com',
            strict_min_version: '112.0',
            data_collection_permissions: { required: ['none'] },
          },
        },
        content_security_policy: {
          extension_pages: "script-src 'self'; object-src 'self';",
        },
      }),
    };
  },
  zip: {
    // Allowlist what goes into the Firefox sources zip (AMO rebuilds from it)
    includeSources: [
      'src/**',
      'public/**',
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'wxt.config.ts',
      '.nvmrc',
      'README.md',
      'LICENSE',
    ],
  },
});
