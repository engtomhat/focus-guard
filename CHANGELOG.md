# Changelog

All notable changes to this project will be documented in this file.
## [2.2.1] - 2026-09-23
### Fixed
- A blocked domain loaded inside an iframe (e.g. an embedded video or a like button) no longer replaces the whole tab; only top-level navigations are blocked
- The active profile is now read on every navigation, so the right profile is enforced after the browser suspends the background worker
- Saving a domain now reports storage errors (such as the sync storage quota) instead of failing silently
- Installing on a new device no longer risks overwriting synced profiles with an empty default profile before browser sync has delivered them
- Reset All Settings now also restores the default blocked image
- `npm version` works again (the manifest version sync script failed with ENOENT)

### Changed
- Reset All Settings and Delete Profile now ask for confirmation
- Only `http` and `https` navigations are checked
- The Buy Me a Coffee image is bundled with the extension instead of loaded from a remote server, so the extension makes no network requests
- Removed the Facebook tracking-path exception, which is no longer needed now that iframes are ignored

### Security
- Extension pages and scripts are no longer exposed to websites (`web_accessible_resources` removed)
- Firefox: removed the unused `<all_urls>` host permission
- Firefox: declares that no user data is collected (`data_collection_permissions`)

### Removed
- Unused content script left over from 1.x

## [2.2.0] - 2025-06-01
### Added
- Tabbed manager page: Domains, Appearance and Settings (#39)

### Changed
- Replaced `innerHTML` updates with DOM APIs, as flagged by Firefox add-on review (#41)
- Improved feedback messages across the UI

## [2.1.0] - 2025-05-30
### Added
- Copy URL button on the blocked page (#38)

## [2.0.0] - 2025-05-15
### Major Changes
- Full Manifest V3 support for both Chrome and Firefox
- Removed content scripts in favor of background-only blocking
- Restructured assets directory
- Simplified build process

### Requirements
- Chrome 96+ or Firefox 109+ (with MV3 support)
- Node.js 18+ (for development)

## [1.6.0] - 2025-05-07
### Added
- Profile system for managing multiple blocklists
- New profile management UI in manager page
- Profile badge on blocked pages
- Automatic migration from old storage format

### Changed
- Updated data structure to support profiles
- Improved blocked page design

## [1.5.3] - 2025-05-07
### Changed
- Added privacy disclaimer to README
- Improved tracking request handling

## [1.5.1] - 2025-05-06
### Changed
- Added a (Buy me a coffee) button to manager and blocked pages

## [1.5.0] - 2025-05-04
### Added
- New image reset functionality in manager
- Better default image handling
- Improved blocked page messaging

### Changed
- Updated UI for image upload section with primary/secondary actions
- More consistent styling between Chrome and Firefox versions

## [1.4.2] - 2025-05-02
### Changed
- Improved UI styling and layout consistency across all pages
- Enhanced text alignment and container widths for better readability

## [1.4.1] - 2025-05-02
### Security
- Replaced all unsafe `innerHTML` assignments with secure DOM manipulation methods
- Implemented consistent cross-browser element creation patterns
- Added null checks for storage operations

### Changed
- Version bump to reflect security improvements

## [1.4.0] - 2025-05-02
### Added
- Firefox extension support
- Cross-browser API compatibility layer

## [1.3.1] - 2025-05-01
### Added
- Enter key support for adding domains in popup/manager

## [1.3.0] - 2025-05-01
### Changed
- Rebranded to "Focus Guard"
- Updated all UI messaging to focus on productivity protection
- Improved blocked page design
- Standardized manager interface

## [1.2.2] - 2025-04-29
### Added
- New centered logo in README
- Visual preview of blocked domains in manager

## [1.2.1] - 2025-04-29
### Changed
- Updated remove buttons to use minus sign (-) instead of x
- Improved remove button styling for better visibility
- Added new extension icons in all required sizes (16x16, 48x48, 128x128)

## [1.2.0] - 2025-04-29
### Changed
- Moved image upload functionality exclusively to manager page
- Simplified popup interface

## [1.1.1] - 2025-04-29
### Fixed
- Image storage using local storage instead of sync to avoid quota limits
- Added image compression before storage

## [1.1.0] - 2025-04-29
### Added
- Full management page (`manager.html`)
- Image preview functionality
- Direct link from popup to manager

## [1.0.0] - 2025-04-29
### Added
- Initial release with core functionality:
  - Domain blocking
  - Custom image replacement
  - Popup management UI

## Format
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
and follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.
