import { defineConfig } from 'wxt';

/**
 * Content Security Policy for the extension's own pages (popup, options, blocked page).
 * Everything is bundled, so pages may only load their own files; the custom blocked
 * image is a data: URL. No network connections, frames, forms or plugins at all.
 */
export const EXTENSION_PAGES_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

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
  manifest: ({ browser, command }) => {
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
      // Only for builds: the dev server (`npm run dev`) loads scripts from localhost
      ...(command === 'build' && {
        content_security_policy: { extension_pages: EXTENSION_PAGES_CSP },
      }),
      ...(browser === 'firefox' && {
        browser_specific_settings: {
          gecko: {
            // Tied to the AMO listing: never change
            id: 'focusguard@example.com',
            // 140 is the first version that supports data_collection_permissions
            // (required by AMO); also the current Extended Support Release
            strict_min_version: '140.0',
            data_collection_permissions: { required: ['none'] },
          },
          gecko_android: {
            // First Firefox for Android version that supports data_collection_permissions
            strict_min_version: '142.0',
          },
        },
      }),
    };
  },
  vite: () => ({
    build: {
      // Vite's modulepreload polyfill fetch()es the pages' own chunks. Supported
      // browsers preload natively, and the CSP forbids connections anyway.
      modulePreload: { polyfill: false },
    },
  }),
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
