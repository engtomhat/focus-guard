# Contributing to Focus Guard

Thanks for helping! Bug reports, ideas and pull requests are all welcome. For anything bigger than a small fix, please [open an issue](https://github.com/engtomhat/focus-guard/issues) first so we can agree on the approach.

## The one rule: nothing leaves the browser

Focus Guard is **self-contained**: no servers, no analytics, no third-party services, no remote code or images. Browser-provided sync (`storage.sync`) is fine; anything else that talks to the network is not. Automated tests enforce this (see [PRIVACY.md](PRIVACY.md)), so a pull request that adds network access will fail CI.

New permissions also need a good reason: in Chrome, an update that adds a permission warning **disables the extension for every existing user** until they approve it. CI fails if a build asks for more than the last release; if a new permission is really needed, say why in the pull request.

## Setup

Node.js 22 or newer (CI uses the version in `.nvmrc`).

```bash
npm install
npm run dev            # Chrome with hot reload (or: npm run dev:firefox)
```

The code is TypeScript, built with [WXT](https://wxt.dev):

| Where | What |
|---|---|
| `src/entrypoints/` | The extension's pieces: `background.ts`, `popup/`, `options/` (the manager), `blocked/` |
| `src/lib/core/` | Pure logic with no browser APIs (domain matching, blocking decision, profile rules): easy to unit-test |
| `src/lib/storage.ts` | The only place that reads or writes stored data |
| `src/lib/migration.ts` | Upgrades data saved by older versions |
| `src/lib/blocker.ts` | Redirects tabs to the blocked page |
| `src/lib/ui/` | Shared UI pieces for the popup and manager |

## Checks

```bash
npm run lint           # ESLint
npm run compile        # TypeScript
npm test               # Unit tests + production build checks
npm run test:e2e       # The built extension in real Chromium and Firefox
```

The end-to-end tests need Playwright's Chromium (`npx playwright install chromium`) and Firefox installed. CI runs all of these on every pull request.

## Pull requests

- **Title:** use [Conventional Commits](https://www.conventionalcommits.org/), because the title becomes the changelog entry:
  - `fix: ...` for bug fixes
  - `feat: ...` for new features
  - `docs:`, `test:`, `refactor:`, `ci:`, `chore:` for everything else (not listed in the changelog)
- **Tests:** add or update tests for what you change.
- **Screenshots:** if your change affects anything users see, add before/after screenshots:
  ```bash
  npm run build && npm run screenshots -- .output/chrome-mv3 screenshots/after
  npm run screenshots -- .output/chrome-mv3 screenshots/after --dark   # dark mode
  ```
  (Run the same on `main` for "before".)
- Pull requests are **squash-merged**, so the branch's individual commits don't matter; the title does.

## Trying out a pull request

Every pull request's CI run saves its builds. On the pull request, open **Checks → CI → Summary → Artifacts → `extension-zips`** (kept for 7 days), then:

- **Chrome:** unzip `…-chrome.zip`, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose the folder. Turn off the store version while testing.
- **Firefox:** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…** and choose `…-firefox.zip`. It stays until Firefox restarts. It uses the same add-on id as the store version, so it works with (and upgrades) your real data.

## Releases

Maintainers: see [RELEASING.md](RELEASING.md).
