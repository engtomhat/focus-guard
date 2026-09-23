# Releasing Focus Guard

Releases are automated with [release-please](https://github.com/googleapis/release-please). You never edit version numbers by hand: WXT reads the version from `package.json` and writes it into both manifests at build time.

## How it works

1. **Write Conventional Commit messages** on your branches (they end up in the CHANGELOG):
   - `fix: ...` → patch release (2.2.1 → 2.2.2)
   - `feat: ...` → minor release (2.2.x → 2.3.0)
   - `feat!: ...` or a `BREAKING CHANGE:` footer → major release (→ 3.0.0)
   - `chore:`, `refactor:`, `test:`, `docs:`, `ci:`, `build:` → no release on their own
2. **Merge PRs into `main`.** The Release workflow keeps one open PR titled `chore(main): release X.Y.Z`. It bumps `package.json`/`package-lock.json` and adds the CHANGELOG entry, and it updates itself as more PRs are merged.
3. **Merge the release PR when you want to ship.** The workflow then:
   - tags `vX.Y.Z` and creates the GitHub Release with the changelog notes
   - builds and attaches `focus-guard-X.Y.Z-chrome.zip`, `focus-guard-X.Y.Z-firefox.zip` and `focus-guard-X.Y.Z-sources.zip`
4. **Upload to the stores (manual):**
   - Chrome Web Store: upload the `-chrome.zip` in the [developer dashboard](https://chrome.google.com/webstore/devconsole).
   - Firefox Add-ons: upload the `-firefox.zip` in the [developer hub](https://addons.mozilla.org/developers/). When asked for source code, upload the `-sources.zip`.

To force a specific version (e.g. the first 3.0.0), put `Release-As: 3.0.0` in a commit message footer.

## Notes for Mozilla reviewers (AMO source code)

The Firefox package is built with a bundler, so AMO asks for the source. The `-sources.zip` rebuilds byte-for-byte to the submitted package:

```bash
# Node.js version from .nvmrc (currently 24), npm 10+
npm ci
npx wxt build -b firefox
# Output: .output/firefox-mv3/
```

## One-time repository setup

- Settings → Actions → General → Workflow permissions: enable **"Allow GitHub Actions to create and approve pull requests"**. release-please needs this to open the release PR.
- Release PRs are opened with the default `GITHUB_TOKEN`, so GitHub does not run CI on them automatically. The release PR only changes versions and the CHANGELOG. To get checks anyway, close and reopen it, or push an empty commit to its branch.
