# Releasing Focus Guard

Releases are automated with [release-please](https://github.com/googleapis/release-please). You never edit version numbers by hand: WXT reads the version from `package.json` and writes it into both manifests at build time.

## How it works

1. **Merge pull requests into `main`.** PRs are squash-merged, so each PR becomes one commit named after its title. Titles follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `fix: ...` → patch release (3.0.0 → 3.0.1)
   - `feat: ...` → minor release (3.0.x → 3.1.0)
   - `feat!: ...` (note the `!`) → major release (3.x.y → 4.0.0)
   - `docs:`, `test:`, `refactor:`, `ci:`, `chore:` → no release on their own; they're included in the next one

   Only the **title** matters: squash merges here use a blank commit message, so footers written in the PR description (like `BREAKING CHANGE:`) never reach `main`. Mark breaking changes with `!` in the title.
2. **release-please opens a release PR** as soon as `main` has a `fix:` or `feat:` since the last release. It runs after every merge to `main`, and the PR is titled `chore(main): release X.Y.Z`. It bumps `package.json`/`package-lock.json`, adds the CHANGELOG entry, and updates itself as more PRs are merged. There is nothing to trigger by hand: **merging the release PR is how you decide to release.**
3. **Test the release build (beta)** before merging it. See below.
4. **Merge the release PR.** The Release workflow then:
   - tags `vX.Y.Z` and creates the GitHub Release, using the release PR's description as the notes
   - builds and attaches `focus-guard-X.Y.Z-chrome.zip`, `-firefox.zip` and `-sources.zip`
5. **Upload to the stores** (manual):
   - **Chrome Web Store:** upload the `-chrome.zip` in the [developer dashboard](https://chrome.google.com/webstore/devconsole).
   - **Firefox Add-ons:** upload the `-firefox.zip` in the [developer hub](https://addons.mozilla.org/developers/). When asked for source code, upload the `-sources.zip`; the build instructions are below.

## Choosing a different version

release-please picks the version from the PR titles. To release a specific version instead (for example `3.1.0` when only fixes were merged), use either of these:

- **While merging a PR:** click **Squash and merge**, and in the commit dialog's **extended description** box type:
  ```
  Release-As: 3.1.0
  ```
  (It has to go there: the PR description is not part of the squash commit.)
- **With a config change:** add `"release-as": "3.1.0"` to the `"."` package in `release-please-config.json` in a PR, and remove it again in a follow-up PR after that release. Otherwise every later release would try to be 3.1.0 again.

release-please then updates (or opens) the release PR with that version.

## Re-running the Release workflow

The Release workflow runs on every push to `main`. To run it again without a new commit (for example after a failed run, or if the release PR didn't update), use **Actions → Release → Run workflow**, with branch `main`, or:

```bash
gh workflow run Release --ref main
```

It only works on `main`; release-please would otherwise open release PRs against another branch. If only the build/attach step failed, re-running that run's failed jobs (**Re-run jobs**) also works.

## Testing the release build (beta)

PRs opened by GitHub Actions (like the release PR) don't run CI by themselves. Run it by hand:

- **Actions → CI → Run workflow**, choose the branch `release-please--branches--main--components--focus-guard`, or:
  ```bash
  gh workflow run CI --ref release-please--branches--main--components--focus-guard
  ```

The run's checks then show up on the release PR. Its **Summary → Artifacts → `extension-zips`** holds the builds, with the release version. Install them on your own browsers (see [CONTRIBUTING.md](CONTRIBUTING.md#trying-out-a-pull-request)) and use them for a few days with your real data before uploading to the stores. Firefox's temporary add-on replaces the store version and upgrades your real data, which is exactly what users will experience.

## Editing the release notes

release-please writes the CHANGELOG entry and the release PR description from commit titles. To improve them, edit the CHANGELOG file on the release PR's branch and the PR description, **then merge the release PR before anything else lands on `main`**. Any new commit on `main` makes release-please regenerate the PR and discard the edits.

## Rolling back a release

If a release causes trouble, re-publish the previous release's code with a **higher** version number (the stores never accept a lower one).

For example, to roll back 3.0.0 to 2.2.1:

```bash
git checkout v2.2.1
npm ci
npm version 3.0.1 --no-git-tag-version   # the 2.x version hook updates the manifests
npm run package                          # dist/focus-guard-chrome.zip, dist/focus-guard-firefox.zip
```

Then upload both zips. Users keep their data: 3.0 keeps writing the old `profiles` key that 2.2.1 reads, as long as all profiles together fit in 8 KB. Beyond that, 2.2.1 shows the last version that fitted. Domains added in 3.0 to a profile past that size would not appear after a rollback.

## Store listing answers

For the privacy forms the stores ask for (details in [PRIVACY.md](PRIVACY.md)):

- **Single purpose:** block distracting websites chosen by the user, replacing them with a reminder page.
- **Permission justifications:**
  - `storage`: saves the user's blocklists, profiles and custom image.
  - `webNavigation`: detects when a tab starts loading a page, to check it against the blocklist.
- **Remote code:** none. Everything is bundled, and the CSP forbids loading anything else.
- **Data collection:** none. Firefox: `data_collection_permissions: { required: ["none"] }` is declared in the manifest.

## Notes for Mozilla reviewers (AMO source code)

The Firefox package is built with a bundler, so AMO asks for the source. The `-sources.zip` rebuilds byte-for-byte to the submitted package:

```bash
# Node.js version from .nvmrc (currently 24), npm 10+
npm ci
npx wxt build -b firefox
# Output: .output/firefox-mv3/
```

## One-time repository setup

- Settings → Actions → General → Workflow permissions: enable **"Allow GitHub Actions to create and approve pull requests"**. release-please needs it to open the release PR.
- Settings → General → Pull Requests: allow **squash merging** only (or make it the default). With merge commits, release-please sees each change twice and lists it twice in the changelog.
- Recommended: protect `main` and require the `check` and `end-to-end (Chromium + Firefox)` checks.
