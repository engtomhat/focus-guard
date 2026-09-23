// Code passed to page.evaluate()/worker.evaluate() runs inside Chromium, where the
// extension API is the global `chrome` (same shape as WXT's `browser`)
declare const chrome: typeof import('wxt/browser').browser;
