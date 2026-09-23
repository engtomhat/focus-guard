# Privacy Policy

**Focus Guard does not collect, send or sell any data.** It has no servers, no analytics and no third-party services. Everything it knows stays in your browser.

_Last updated: September 2026 (version 3.0.0)_

## What Focus Guard stores, and where

| Data | Where it is stored |
|---|---|
| Your blocked domains and profile names | Your browser's extension **sync** storage. If you use browser sync (signed in to Chrome or Firefox with sync turned on), **your browser** copies this data to your other devices through your own Google or Mozilla account, under their privacy policies. With sync off, it stays on this device. The developer of Focus Guard never has access to it. |
| Which profile is active | This device only |
| Your custom blocked-page image | This device only |
| Backup files | Only if you click **Export to File**, saved wherever you choose |

## What Focus Guard does not collect

- **No browsing history.** To block a site, Focus Guard compares the address of the page you are opening with your blocklist. This happens inside your browser; the address is not recorded, stored or sent anywhere.
- **No usage statistics, no tracking, no advertising identifiers, no personal information.**

When a site is blocked, the blocked page shows its address so you can copy it. That address is only part of the blocked page's own link and is not saved.

## Permissions

| Permission | Why Focus Guard needs it |
|---|---|
| `storage` | To save your blocklists, profiles and image |
| `webNavigation` | To notice when a tab starts loading a page, so it can be checked against your blocklist. Chrome describes this permission as "Read your browsing history"; Focus Guard does not keep or send any of it. |

Focus Guard does not request access to websites: it cannot read or modify the content of any page you visit. When a site is blocked, it only replaces that tab with its own blocked page.

## No network access

Focus Guard makes no network requests. This is enforced, not just promised: the extension's pages have a Content Security Policy that forbids network connections, and automated tests fail if any network code or remote address appears in the extension. The only outside link is the "Buy Me a Coffee" button, which opens only if you click it.

## Removing your data

- **Reset All Settings** (Manager → Settings) deletes your profiles, blocked domains and custom image.
- Uninstalling Focus Guard removes the data stored on that device. To remove synced data from all your devices, use **Reset All Settings** before uninstalling.

## Changes and contact

Changes to this policy are published in this file and in the [changelog](CHANGELOG.md). Questions or concerns: [open an issue](https://github.com/engtomhat/focus-guard/issues).
